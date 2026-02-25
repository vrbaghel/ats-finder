import { Command } from 'commander';
import axios from 'axios';
import 'dotenv/config';
import { initDb, insertCompanyATS, closeDb } from './db.js';

// Configuration
const program = new Command();

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
      process.stdout.write(`  Checking ${platform.name} for "${slug}"... `);
      if (await checkUrl(apiUrl)) {
        console.log('FOUND!');
        return {
          name: platform.name,
          url: platform.getBoardUrl(slug),
        };
      }
      console.log('no.');
    }
  }
  return { name: 'Other', url: null };
}

program
  .name('ats-finder')
  .description('CLI tool to find ATS platforms for companies and store them in PostgreSQL')
  .version('1.0.0')
  .argument('<companies...>', 'List of company names to process')
  .action(async (companies: string[]) => {
    try {
      await initDb();
      console.log(`\nProcessing ${companies.length} companies...\n`);

      for (const company of companies) {
        console.log(`Processing: ${company}`);
        const result = await findATS(company);
        
        console.log(`  => Detected: ${result.name} (${result.url || 'N/A'})`);
        
        await insertCompanyATS(company, result.name, result.url);
        console.log(`  => Saved to database.\n`);
      }

      console.log('All companies processed.');
    } catch (error) {
      console.error('An error occurred during execution:', error);
      process.exit(1);
    } finally {
      await closeDb();
    }
  });

program.parse();
