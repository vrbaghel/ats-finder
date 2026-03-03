import 'dotenv/config';
import { initDb, insertCompanyATS, closeDb } from './db.js';
import { parseCompanyUrl } from './urlParser.js';
import { fetchPendingCompanies, markAsUploaded } from './notion.js';
import axios from 'axios';

interface AtsPlatform {
  key: string;
  name: string;
  getApiUrl: (slug: string) => string;
  getBoardUrl: (slug: string) => string;
}

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

function getSlugVariants(name: string): string[] {
  const base = name.toLowerCase().trim();
  const variants = new Set<string>();
  variants.add(base.replace(/[^a-z0-9]/g, ''));
  variants.add(base.replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''));
  return Array.from(variants).filter(v => v.length > 0);
}

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

async function findATS(companyName: string) {
  const variants = getSlugVariants(companyName);
  for (const platform of ATS_PLATFORMS) {
    for (const slug of variants) {
      if (await checkUrl(platform.getApiUrl(slug))) {
        return { key: platform.key, token: slug, url: platform.getBoardUrl(slug) };
      }
    }
  }
  return null;
}

async function sync() {
  try {
    await initDb();
    console.log('Fetching pending companies from Notion...');
    const companies = await fetchPendingCompanies();

    if (companies.length === 0) {
      console.log('No pending companies found.');
      return;
    }

    console.log(`\nProcessing ${companies.length} companies...\n`);

    for (const company of companies) {
      console.log(`Processing: ${company.name}`);

      let atsType: any = company.ats_type?.toLowerCase() || 'custom';
      let atsToken = null;
      let wdParams = null;
      let careersUrl = company.careers_page_url;

      if (careersUrl) {
        const parsed = parseCompanyUrl(careersUrl);
        if (parsed.ats_type !== 'custom') {
          atsType = parsed.ats_type;
          atsToken = parsed.ats_token;
          wdParams = parsed.wd_params;
        }
      } else {
        // Fallback: try to guess if no URL provided
        console.log(`  => No URL provided, attempting to probe...`);
        const found = await findATS(company.name);
        if (found) {
          atsType = found.key;
          atsToken = found.token;
          careersUrl = found.url;
          console.log(`  => Guessed: ${atsType} (${atsToken})`);
        }
      }

      // Final validation
      const validTypes = ['greenhouse', 'lever', 'ashby', 'workday', 'custom'];
      if (!validTypes.includes(atsType)) atsType = 'custom';

      try {
        await insertCompanyATS(company.name, atsType, atsToken, wdParams, careersUrl);
        await markAsUploaded(company.pageId);
        console.log(`  => Success: Saved and marked in Notion.`);
      } catch (err) {
        console.error(`  => Failed:`, err instanceof Error ? err.message : err);
      }
    }

    console.log('\nSync completed.');
  } catch (error) {
    console.error('Fatal sync error:', error);
  } finally {
    await closeDb();
  }
}

sync();
