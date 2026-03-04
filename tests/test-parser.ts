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

  // Workday (Extraction of company name as token and portal)
  { url: 'https://nvidia.wd5.myworkdayjobs.com/NVIDIA_External_Career_Site', type: 'workday', token: 'nvidia', portal: 'NVIDIA_External_Career_Site' },
  { url: 'https://sabre.wd1.myworkdayjobs.com/en-US/SabreJobs', type: 'workday', token: 'sabre', portal: 'SabreJobs' },
  { url: 'https://nike.wd1.myworkdayjobs.com/en-US/nke/', type: 'workday', token: 'nike', portal: 'nke' },
  { url: 'https://amadeus.wd502.myworkdayjobs.com/jobs', type: 'workday', token: 'amadeus', portal: null },
  { url: 'https://sentryinsurance.wd1.myworkdayjobs.com/SentryCareers', type: 'workday', token: 'sentryinsurance', portal: 'SentryCareers' },
  { url: 'https://ebay.wd5.myworkdayjobs.com/apply/', type: 'workday', token: 'ebay', portal: 'apply' },
  
  // Custom/Unknown
  { url: 'https://careers.spotify.com', type: 'custom', token: null },
];

async function runParserTest() {
  logger.info('--- Starting Parser Test ---');
  let passedCount = 0;

  for (const test of testUrls) {
    const result = parseCompanyUrl(test.url);
    const passed = result.ats_type === test.type && 
                   result.ats_token === test.token &&
                   (test.type !== 'workday' || result.wd_params?.portal === (test as any).portal);

    if (passed) {
      const portalInfo = result.wd_params ? ` (Portal: ${result.wd_params.portal})` : '';
      logger.info(`PASS: ${test.url} -> ${result.ats_type} (${result.ats_token})${portalInfo}`);
      passedCount++;
    } else {
      logger.error(`FAIL: ${test.url}`);
      logger.error(`   Expected: ${test.type} (${test.token})`);
      logger.error(`   Actual:   ${result.ats_type} (${result.ats_token})`);
      if (result.wd_params) {
        logger.error(`   Expected Portal: ${(test as any).portal}`);
        logger.error(`   Actual Portal:   ${result.wd_params.portal}`);
      }
    }
  }

  logger.info(`--- Parser Test Finished: ${passedCount}/${testUrls.length} Passed ---`);
  if (passedCount !== testUrls.length) process.exit(1);
}

runParserTest();
