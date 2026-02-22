import 'dotenv/config';
import { Client } from '@notionhq/client';
import axios from 'axios';

// Configuration - extracted from environment variables
const NOTION_TOKEN = process.env.NOTION_TOKEN;
const DATABASE_ID = process.env.DATABASE_ID;
const COMPANY_PROPERTY_NAME = process.env.COMPANY_PROPERTY_NAME || 'Name';
const ATS_PROPERTY_NAME = process.env.ATS_PROPERTY_NAME || 'ATS';
const PORTAL_URL_PROPERTY_NAME = process.env.PORTAL_URL_PROPERTY_NAME || 'Job Portal URL';

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
  },
];

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
    const database: any = await notion.databases.retrieve({
      database_id: DATABASE_ID!,
    });

    if (!database.data_sources || database.data_sources.length === 0) {
      throw new Error('No data sources found for this database. Ensure it is a modern Notion database.');
    }

    const dataSourceId = database.data_sources[0].id;
    console.log(`Processing Data Source: ${dataSourceId} (${database.data_sources[0].name || 'Unnamed'})`);

    let hasMore = true;
    let cursor: string | undefined = undefined;
    let totalProcessed = 0;

    while (hasMore) {
      console.log(`\nFetching next page of results... (Total processed so far: ${totalProcessed})`);
      const response: any = await notion.dataSources.query({
        data_source_id: dataSourceId,
        start_cursor: cursor,
      });

      const results = response.results;
      
      for (const page of results) {
        const properties = page.properties;
        const companyProp = properties[COMPANY_PROPERTY_NAME];

        if (!companyProp || companyProp.type !== 'title' || !companyProp.title?.[0]) {
          console.warn(`Skipping page ${page.id} because it has no company name.`);
          continue;
        }

        const companyName = companyProp.title[0].plain_text;
        console.log(`\n[${++totalProcessed}] Processing: ${companyName}`);

        const result = await findATS(companyName);
        console.log(`Result: ${result.name} (${result.url || 'N/A'})`);

        const updateProperties: any = {};

        // 1. Update ATS Platform name
        const currentAtsProp = properties[ATS_PROPERTY_NAME];
        if (currentAtsProp && currentAtsProp.type === 'select') {
          updateProperties[ATS_PROPERTY_NAME] = {
            select: { name: result.name },
          };
        } else {
          updateProperties[ATS_PROPERTY_NAME] = {
            rich_text: [{ text: { content: result.name } }],
          };
        }

        // 2. Update Job Portal URL
        if (result.url) {
          const urlProp = properties[PORTAL_URL_PROPERTY_NAME];
          if (urlProp && urlProp.type === 'url') {
            updateProperties[PORTAL_URL_PROPERTY_NAME] = {
              url: result.url,
            };
          } else {
            updateProperties[PORTAL_URL_PROPERTY_NAME] = {
              rich_text: [{ text: { content: result.url } }],
            };
          }
        }

        await notion.pages.update({
          page_id: page.id,
          properties: updateProperties,
        });
      }

      hasMore = response.has_more;
      cursor = response.next_cursor;
    }

    console.log(`\nSuccessfully finished processing ${totalProcessed} companies.`);
  } catch (error: any) {
    console.error('An error occurred:', error.message);
    if (error.body) {
      console.error('Notion Error Details:', JSON.stringify(error.body, null, 2));
    }
  }
}

run();
