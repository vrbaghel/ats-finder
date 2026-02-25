import { Client, DatabaseObjectResponse, PageObjectResponse, QueryDataSourceResponse } from '@notionhq/client';
import axios from 'axios';
import 'dotenv/config';

// Configuration - extracted from environment variables
const NOTION_TOKEN = process.env.NOTION_TOKEN;
const DATABASE_ID = process.env.DATABASE_ID;
const COMPANY_PROPERTY_NAME = process.env.COMPANY_PROPERTY_NAME || 'Name';
const ATS_PROPERTY_NAME = process.env.ATS_PROPERTY_NAME || 'ATS';
const JOB_URL_PROPERTY_NAME = process.env.JOB_URL_PROPERTY_NAME || 'Job Portal URL';
const WORKDAY_TENANT_PROPERTY_NAME = process.env.WORKDAY_TENANT_PROPERTY_NAME || 'Workday Tenant';
const WORKDAY_PORTAL_PROPERTY_NAME = process.env.WORKDAY_PORTAL_PROPERTY_NAME || 'Workday Portal';
const WORKDAY_FACETS_PROPERTY_NAME = process.env.WORKDAY_FACETS_PROPERTY_NAME || 'Workday Facets';

if (!NOTION_TOKEN || !DATABASE_ID) {
  console.error('Error: NOTION_TOKEN and DATABASE_ID must be set in .env');
  process.exit(1);
}

/**
 * Initialize Notion client with the latest version (2025-09-03).
 */
const notion = new Client({ 
  auth: NOTION_TOKEN,
  notionVersion: '2025-09-03' 
});

interface AtsPlatform {
  name: string;
  getApiUrl: (slug: string) => string;
  getBoardUrl: (slug: string) => string;
}

const ATS_PLATFORMS: AtsPlatform[] = [
  {
    name: 'Greenhouse',
    getApiUrl: (slug: string) => `https://boards-api.greenhouse.io/v1/boards/${slug}/jobs`,
    getBoardUrl: (slug: string) => `https://boards.greenhouse.io/${slug}`,
  },
  {
    name: 'Lever',
    getApiUrl: (slug: string) => `https://api.lever.co/v0/postings/${slug}`,
    getBoardUrl: (slug: string) => `https://jobs.lever.co/${slug}`,
  },
  {
    name: 'Ashby',
    getApiUrl: (slug: string) => `https://api.ashbyhq.com/posting-api/job-board/${slug}`,
    getBoardUrl: (slug: string) => `https://jobs.ashbyhq.com/${slug}`,
  }
];

/**
 * Parses a Workday URL and returns its components.
 */
export function parseWorkdayUrl(urlStr: string) {
  try {
    const url = new URL(urlStr);
    const hostnameParts = url.hostname.split('.');
    
    // The tenant is usually the segment before 'myworkdayjobs'
    const index = hostnameParts.indexOf('myworkdayjobs');
    // If not found, it might be a different format, but we handle the provided ones
    const tenant = index > 0 ? hostnameParts[index - 1] : 'unknown';
    
    // Refine Portal: Split pathname, remove empty segments, and ignore locales and "jobs"
    const segments = url.pathname.split('/').filter(s => s.length > 0);
    const filteredSegments = segments.filter(s => {
      // Ignore locales: en, en-US, fr-FR, zh-Hans-CN
      const isLocale = /^[a-z]{2}(-[a-zA-Z]{2,4}){0,2}$/.test(s);
      // Ignore literal "jobs"
      const isJobs = s.toLowerCase() === 'jobs';
      return !isLocale && !isJobs;
    });
    const portal = filteredSegments[0] || '';
    
    // Facets are searchParams converted to a JSON object of arrays
    const facets: Record<string, string[]> = {};
    url.searchParams.forEach((value, key) => {
      if (!facets[key]) {
        facets[key] = [];
      }
      facets[key].push(value);
    });
    
    return { 
      tenant, 
      portal, 
      facetsJson: JSON.stringify(facets, null, 2) 
    };
  } catch {
    console.error(`Failed to parse Workday URL: ${urlStr}`);
    return null;
  }
}

/**
 * Normalizes company name into common slug variants.
 */
function getSlugVariants(name: string): string[] {
  const base = name.toLowerCase().trim();
  const variants = new Set<string>();
  
  // Variant 1: No special characters (e.g., "riotgames")
  variants.add(base.replace(/[^a-z0-9]/g, ''));
  
  // Variant 2: Hyphenated (e.g., "riot-games")
  variants.add(base.replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''));

  return Array.from(variants).filter(v => v.length > 0);
}

/**
 * Checks if a given URL is valid (returns 200).
 */
async function checkUrl(url: string): Promise<boolean> {
  try {
    const response = await axios.get(url, { 
      timeout: 5000,
      headers: { 'User-Agent': 'ATS-Finder-Script/1.0' }
    });
    return response.status === 200;
  } catch {
    return false;
  }
}

/**
 * Result interface for ATS finding.
 */
interface AtsResult {
  name: string;
  url: string | null;
}

/**
 * Finds the correct ATS for a company.
 */
async function findATS(companyName: string): Promise<AtsResult> {
  const variants = getSlugVariants(companyName);
  
  for (const platform of ATS_PLATFORMS) {
    for (const slug of variants) {
      const apiUrl = platform.getApiUrl(slug);
      console.log(`Checking ${platform.name} for "${slug}"...`);
      if (await checkUrl(apiUrl)) {
        return {
          name: platform.name,
          url: platform.getBoardUrl(slug),
        };
      }
    }
  }
  return { name: 'Other', url: null };
}

/**
 * Main execution function.
 */
async function run(): Promise<void> {
  try {
    console.log(`Retrieving database metadata for: ${DATABASE_ID}`);
    const database: DatabaseObjectResponse = await notion.databases.retrieve({
      database_id: DATABASE_ID!,
    }) as DatabaseObjectResponse;

    if (!database.data_sources || database.data_sources.length === 0) {
      throw new Error('No data sources found for this database. Ensure it is a modern Notion database.');
    }

    const dataSourceId = database.data_sources[0].id;
    console.log(`Processing Data Source: ${dataSourceId} (${database.data_sources[0].name || 'Unnamed'})`);

    let hasMore = true;
    let cursor: string | null = null;
    let totalProcessed = 0;

    while (hasMore) {
      console.log(`\nFetching next page of results... (Total processed so far: ${totalProcessed})`);
      const response: QueryDataSourceResponse = await notion.dataSources.query({
        data_source_id: dataSourceId,
        start_cursor: cursor || undefined,
      });

      const results = response.results as PageObjectResponse[];
      
      for (const page of results) {
        const properties = page.properties;
        const companyProp = properties[COMPANY_PROPERTY_NAME];

        if (!companyProp || companyProp.type !== 'title' || !companyProp.title?.[0]) {
          console.warn(`Skipping page ${page.id} because it has no company name.`);
          continue;
        }

        const companyName = companyProp.title[0].plain_text;
        console.log(`\n[${++totalProcessed}] Processing: ${companyName}`);

        // Get current ATS and Portal URL
        const currentAtsProp = properties[ATS_PROPERTY_NAME] as any;
        const currentAtsValue = currentAtsProp?.select?.name || currentAtsProp?.rich_text?.[0]?.plain_text;
        const currentJobUrlProp = properties[JOB_URL_PROPERTY_NAME] as any;
        const currentJobUrl = currentJobUrlProp?.url || currentJobUrlProp?.rich_text?.[0]?.plain_text;

        let result: AtsResult;
        
        // If it's already marked as Workday, we skip findATS unless we need to update the URL
        if (!currentJobUrl && currentAtsValue !== 'Workday' && currentAtsValue !== 'Other') {
          result = await findATS(companyName);
          console.log(`Result: ${result.name} (${result.url || 'N/A'})`);
        } else {
          result = { name: currentAtsValue, url: currentJobUrl };
          console.log(`Skipping ATS fetch -> Using existing ATS: ${currentAtsValue} (${currentJobUrl})`);
        }

        const updateProperties: any = {};

        // 1. Update ATS Platform name (only if it's new or was 'Other')
        if (result.name !== 'Other' && result.name !== currentAtsValue) {
          if (currentAtsProp && currentAtsProp.type === 'select') {
            updateProperties[ATS_PROPERTY_NAME] = {
              select: { name: result.name },
            };
          } else {
            updateProperties[ATS_PROPERTY_NAME] = {
              rich_text: [{ text: { content: result.name } }],
            };
          }
        }

        // 3. Special Workday Parsing (only if it's a Workday URL)
        const finalUrl = result.url || currentJobUrl;
        if ((result.name === 'Workday' || currentAtsValue === 'Workday') && finalUrl) {
          const workdayData = parseWorkdayUrl(finalUrl);
          if (workdayData) {
            console.log(`  -> Workday Parsed: Tenant=${workdayData.tenant}, Portal=${workdayData.portal}`);
            updateProperties[WORKDAY_TENANT_PROPERTY_NAME] = {
              rich_text: [{ text: { content: workdayData.tenant } }],
            };
            updateProperties[WORKDAY_PORTAL_PROPERTY_NAME] = {
              rich_text: [{ text: { content: workdayData.portal } }],
            };
            updateProperties[WORKDAY_FACETS_PROPERTY_NAME] = {
              rich_text: [{ text: { content: workdayData.facetsJson } }],
            };
          }
        }

        // Only update if there are properties to change
        if (Object.keys(updateProperties).length > 0) {
          await notion.pages.update({
            page_id: page.id,
            properties: updateProperties,
          });
        }
      }

      hasMore = response.has_more;
      cursor = response.next_cursor || null;
    }

    console.log(`\nSuccessfully finished processing ${totalProcessed} companies.`);
  } catch (error) {
    console.error('An error occurred:', error instanceof Error ? error.message : 'Unknown error');
    if (error instanceof Error && 'body' in error && typeof error.body === 'object' && error.body !== null) {
      console.error('Notion Error Details:', JSON.stringify(error.body, null, 2));
    }
  }
}

// Only execute if run directly
if (process.argv[1].endsWith('index.ts') || process.argv[1].endsWith('index.js')) {
  run();
}
