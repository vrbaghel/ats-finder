import { parseCompanyUrl } from '../src/urlParser.js';
import { logger } from '../src/logger.js';

const testUrls = [
  // Greenhouse
  { url: 'https://boards.greenhouse.io/spotify', type: 'greenhouse', token: 'spotify' },
  { url: 'https://boards.eu.greenhouse.io/spotify', type: 'greenhouse', token: 'spotify' },
  { url: 'https://boards.greenhouse.io/embed/job_board?for=spotify', type: 'greenhouse', token: 'spotify' },
  
  // Lever
  { url: 'https://jobs.lever.co/spotify', type: 'lever', token: 'spotify' },
  { url: 'https://jobs.eu.lever.co/prosus', type: 'lever', token: 'prosus' },
  { url: 'https://spotify.lever.co', type: 'lever', token: 'spotify' },
  { url: 'https://lever.co/spotify', type: 'lever', token: 'spotify' },

  // Ashby
  { url: 'https://jobs.ashbyhq.com/spotify', type: 'ashby', token: 'spotify' },
  { url: 'https://spotify.jobs.ashbyhq.com', type: 'ashby', token: 'spotify' },

  // Workday (Extraction of company name as token)
  { url: 'https://nvidia.wd5.myworkdayjobs.com/NVIDIA_External_Career_Site', type: 'workday', token: 'nvidia' },
  { url: 'https://sabre.wd1.myworkdayjobs.com/en-US/SabreJobs', type: 'workday', token: 'sabre' },
  
  // Custom/Unknown
  { url: 'https://careers.spotify.com', type: 'custom', token: null },
];

async function runParserTest() {
  logger.info('--- Starting Parser Test ---');
  let passedCount = 0;

  for (const test of testUrls) {
    const result = parseCompanyUrl(test.url);
    const passed = result.ats_type === test.type && result.ats_token === test.token;

    if (passed) {
      logger.info(`PASS: ${test.url} -> ${result.ats_type} (${result.ats_token})`);
      passedCount++;
    } else {
      logger.error(`FAIL: ${test.url}`);
      logger.error(`   Expected: ${test.type} (${test.token})`);
      logger.error(`   Actual:   ${result.ats_type} (${result.ats_token})`);
    }
  }

  logger.info(`--- Parser Test Finished: ${passedCount}/${testUrls.length} Passed ---`);
  if (passedCount !== testUrls.length) process.exit(1);
}

runParserTest();
