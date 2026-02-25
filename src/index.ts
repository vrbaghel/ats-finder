import { Command } from 'commander';
import axios from 'axios';
import fs from 'fs';
import 'dotenv/config';
import { initDb, insertCompanyATS, closeDb } from './db.js';
import { parseCompanyUrl } from './urlParser.js';

// Configuration
const program = new Command();

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
  key: string | null;
  name: string | null;
  token: string | null;
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
          key: platform.key,
          name: platform.name,
          token: slug,
          url: platform.getBoardUrl(slug),
        };
      }
      console.log('no.');
    }
  }
  return { key: null, name: 'Other', token: null, url: null };
}

program
  .name('ats-finder')
  .description('CLI tool to find ATS platforms for companies and store them in PostgreSQL')
  .version('1.0.0')
  .argument('<inputs...>', 'List of company names OR file path (if type=link)')
  .option('-t, --type <type>', 'Input type: "name" or "link"', 'name')
  .action(async (inputs: string[], options: { type: string }) => {
    try {
      await initDb();

      if (options.type === 'link') {
        const filePath = inputs[0];
        if (!filePath) {
           console.error('Error: Please provide a file path for link mode.');
           process.exit(1);
        }

        console.log(`Reading URLs from ${filePath}...`);
        let fileContent = '';
        try {
          fileContent = fs.readFileSync(filePath, 'utf-8');
        } catch (err: any) {
          console.error(`Error reading file: ${err.message}`);
          process.exit(1);
        }

        const urls = fileContent.split('\n').map(line => line.trim()).filter(line => line.length > 0);
        console.log(`\nProcessing ${urls.length} URLs...\n`);

        for (const url of urls) {
           console.log(`Processing URL: ${url}`);
           const parsed = parseCompanyUrl(url);
           
           if (!parsed.name) {
             console.log(`  => Skipping: Could not extract name from URL.`);
             continue;
           }

           console.log(`  => Parsed: ${parsed.name} (${parsed.ats_type})`);
           
           await insertCompanyATS(
             parsed.name, 
             parsed.ats_type, 
             parsed.ats_token, 
             parsed.wd_params, 
             url
           );
           console.log('  => Saved to database.\n');
        }

      } else {
        // Default "name" mode
        const companies = inputs;
        console.log(`\nProcessing ${companies.length} companies...\n`);

        for (const company of companies) {
          console.log(`Processing: ${company}`);
          const result = await findATS(company);
          
          console.log(`  => Detected: ${result.name} (${result.url || 'N/A'})`);
          
          // Map null key to 'custom' for unknown/other ATS types if required by ENUM
          const atsType = result.key || 'custom'; 
          
          await insertCompanyATS(company, atsType, result.token, null, result.url);
          console.log(`  => Saved to database.\n`);
        }
      }

      console.log('All items processed.');
    } catch (error) {
      console.error('An error occurred during execution:', error);
      process.exit(1);
    } finally {
      await closeDb();
    }
  });

program.parse();
