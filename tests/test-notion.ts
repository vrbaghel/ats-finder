import { fetchPendingCompanies } from '../src/notion.js';
import { logger } from '../src/logger.js';
import 'dotenv/config';

async function runNotionTest() {
  logger.info('--- Starting Notion Fetch Test ---');
  try {
    const companies = await fetchPendingCompanies();
    logger.info(`Successfully fetched ${companies.length} pending companies.`);

    if (companies.length > 0) {
      const first = companies[0];
      logger.info(`   Sample entry: ${first.name} | ${first.ats_type} | ${first.careers_page_url} | WAF: ${first.waf}`);
    } else {
      logger.info('   Note: No pending companies found in Notion.');
    }
    
    logger.info('--- Notion Fetch Test Passed ---');
  } catch (error) {
    logger.error('FAIL: Notion Fetch Test');
    logger.error(error instanceof Error ? error.stack : error);
    process.exit(1);
  }
}

runNotionTest();
