import 'dotenv/config';
import { initDb, insertCompanyATS, closeDb } from './db.js';
import { parseCompanyUrl } from './urlParser.js';
import { fetchPendingCompanies, markAsUploaded } from './notion.js';
import { logger } from './logger.js';
import axios from 'axios';

interface AtsPlatform {
  key: string;
  getApiUrl: (slug: string) => string;
}

const ATS_PLATFORMS: Record<string, AtsPlatform> = {
  greenhouse: {
    key: 'greenhouse',
    getApiUrl: (slug: string) => `https://boards-api.greenhouse.io/v1/boards/${slug}/jobs`,
  },
  lever: {
    key: 'lever',
    getApiUrl: (slug: string) => `https://api.lever.co/v0/postings/${slug}`,
  },
  ashby: {
    key: 'ashby',
    getApiUrl: (slug: string) => `https://api.ashbyhq.com/posting-api/job-board/${slug}`,
  }
};

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
 * Main synchronization loop.

 * 1. Initializes database.
 * 2. Fetches pending companies from Notion.
 * 3. Processes each company (parses URL).
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
      const careersUrl = company.careers_page_url;

      // If Notion already says 'custom', we don't need to do anything else.
      if (atsType !== 'custom' && careersUrl) {
        const parsed = parseCompanyUrl(careersUrl);
        if (parsed.ats_type !== 'custom') {
          atsType = parsed.ats_type;
          atsToken = parsed.ats_token;
          wdParams = parsed.wd_params;
          logger.info(`  => Parsed from URL: ${atsType} (Token: ${atsToken})`);
        }
      } else if (careersUrl) {
        logger.info(`  => Keeping as 'custom' as per Notion/intended value.`);
      }

      // Final validation to ensure ATS type matches database ENUM
      const validTypes = ['greenhouse', 'lever', 'ashby', 'workday', 'custom'];
      if (!validTypes.includes(atsType)) {
        logger.warn(`  => Invalid ATS type '${atsType}', defaulting to 'custom'`);
        atsType = 'custom';
      }

      // Pre-upload verification for specific platforms
      if (['greenhouse', 'lever', 'ashby'].includes(atsType) && atsToken) {
        const platform = ATS_PLATFORMS[atsType];
        const apiUrl = platform.getApiUrl(atsToken);
        logger.info(`  => Verifying API URL: ${apiUrl}`);
        
        const isValid = await checkUrl(apiUrl);
        if (!isValid) {
          logger.error(`  => API verification failed for ${company.name} (${atsType}). Skipping upload.`);
          continue;
        }
        logger.info(`  => API verification successful.`);
      }

      try {
        // Save to Supabase
        await insertCompanyATS(company.name, atsType, atsToken, wdParams, careersUrl, !company.waf);
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
