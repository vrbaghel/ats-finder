import 'dotenv/config';
import { initDb, insertCompanyATS, closeDb } from './db.js';
import { parseCompanyUrl } from './urlParser.js';
import { fetchPendingCompanies, markAsUploaded } from './notion.js';
import { logger } from './logger.js';
import axios from 'axios';

interface AtsPlatform {
  key: string;
  name: string;
  getApiUrl: (slug: string) => string;
  getBoardUrl: (slug: string) => string;
}

/**
 * List of supported ATS platforms and their corresponding API/Board URL templates.
 */
const ATS_PLATFORMS: AtsPlatform[] = [
  {
    key: 'greenhouse',
    name: 'Greenhouse',
    getApiUrl: (slug: string) => `https://boards-api.greenhouse.io/v1/boards/${slug}/jobs`,
    getBoardUrl: (slug: string) => `https://boards.greenhouse.io/${slug}`,
  },
  {
    key: 'lever',
    name: 'Lever',
    getApiUrl: (slug: string) => `https://api.lever.co/v0/postings/${slug}`,
    getBoardUrl: (slug: string) => `https://jobs.lever.co/${slug}`,
  },
  {
    key: 'ashby',
    name: 'Ashby',
    getApiUrl: (slug: string) => `https://api.ashbyhq.com/posting-api/job-board/${slug}`,
    getBoardUrl: (slug: string) => `https://jobs.ashbyhq.com/${slug}`,
  }
];

/**
 * Generates common slug variants for a company name to probe ATS endpoints.
 */
function getSlugVariants(name: string): string[] {
  const base = name.toLowerCase().trim();
  const variants = new Set<string>();
  // Remove all non-alphanumeric characters (e.g. "Riot Games" -> "riotgames")
  variants.add(base.replace(/[^a-z0-9]/g, ''));
  // Replace all non-alphanumeric characters with hyphens (e.g. "Riot Games" -> "riot-games")
  variants.add(base.replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''));
  return Array.from(variants).filter(v => v.length > 0);
}

/**
 * Probes a URL to check if it's accessible (status 200).
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
 * Attempts to detect the ATS used by a company by probing various known endpoints.
 */
async function findATS(companyName: string) {
  const variants = getSlugVariants(companyName);
  for (const platform of ATS_PLATFORMS) {
    for (const slug of variants) {
      const apiUrl = platform.getApiUrl(slug);
      if (await checkUrl(apiUrl)) {
        return { key: platform.key, token: slug, url: platform.getBoardUrl(slug) };
      }
    }
  }
  return null;
}

/**
 * Main synchronization loop.
 * 1. Initializes database.
 * 2. Fetches pending companies from Notion.
 * 3. Processes each company (parses URL or probes for ATS).
 * 4. Upserts result to Supabase and marks as 'Uploaded' in Notion.
 */
async function sync() {
  try {
    await initDb();
    logger.info('Fetching pending companies from Notion...');
    const companies = await fetchPendingCompanies();

    if (companies.length === 0) {
      logger.info('No pending companies found.');
      return;
    }

    logger.info(`Processing ${companies.length} companies...`);

    for (const company of companies) {
      if (!company.careers_page_url) {
        logger.info(`Skipping ${company.name}: No careers page URL provided.`);
        continue;
      }

      logger.info(`Starting process for: ${company.name}`);

      let atsType: any = company.ats_type?.toLowerCase() || 'custom';
      let atsToken = null;
      let wdParams = null;
      let careersUrl = company.careers_page_url;

      if (careersUrl) {
        // Option 1: URL is provided in Notion, parse it for deeper metadata
        const parsed = parseCompanyUrl(careersUrl);
        if (parsed.ats_type !== 'custom') {
          atsType = parsed.ats_type;
          atsToken = parsed.ats_token;
          wdParams = parsed.wd_params;
          logger.info(`  => Parsed from URL: ${atsType} (Token: ${atsToken})`);
        } else {
          // If parsing fails but URL exists, we could still probe if we want to be thorough,
          // but the prompt implies a more streamlined "parse from URL" approach.
          // Let's keep a minimal fallback probing if the URL is provided but parser failed.
          const found = await findATS(company.name);
          if (found) {
            atsType = found.key;
            atsToken = found.token;
            careersUrl = found.url;
            logger.info(`  => Probing fallback found: ${atsType} (Token: ${atsToken})`);
          }
        }
      }

      // Final validation to ensure ATS type matches database ENUM
      const validTypes = ['greenhouse', 'lever', 'ashby', 'workday', 'custom'];
      if (!validTypes.includes(atsType)) {
        logger.warn(`  => Invalid ATS type '${atsType}', defaulting to 'custom'`);
        atsType = 'custom';
      }

      try {
        // Save to Supabase
        await insertCompanyATS(company.name, atsType, atsToken, wdParams, careersUrl);
        // Mark as uploaded in Notion
        await markAsUploaded(company.pageId);
        logger.info(`  => Success: ${company.name} saved and synced.`);
      } catch (err) {
        logger.error(`  => Failed to sync ${company.name}: ${err instanceof Error ? err.message : err}`);
      }
    }

    logger.info('Sync completed successfully.');
  } catch (error) {
    logger.error(`Fatal synchronization error: ${error instanceof Error ? error.stack : error}`);
  } finally {
    await closeDb();
  }
}

// Kick off sync
sync();
