import { initDb, insertCompanyATS, closeDb } from '../src/db.js';
import { logger } from '../src/logger.js';
import 'dotenv/config';

async function runDbTest() {
  logger.info('--- Starting Database Test ---');
  try {
    await initDb();
    
    // Test Case 1: Active company (Default)
    const testNameActive = `_TEST_ACTIVE_${Date.now()}`;
    const activeRes = await insertCompanyATS(
      testNameActive, 
      'greenhouse', 
      'test-token-active', 
      null, 
      'https://boards.greenhouse.io/test-token-active',
      true
    );
    if (activeRes.is_active !== true) throw new Error('is_active should be true');
    logger.info(`Successfully upserted active test company: ${testNameActive}`);

    // Test Case 2: Inactive company (WAF checked)
    const testNameInactive = `_TEST_WAF_${Date.now()}`;
    const inactiveRes = await insertCompanyATS(
      testNameInactive, 
      'lever', 
      'test-token-waf', 
      null, 
      'https://jobs.lever.co/test-token-waf',
      false // This represents company.waf being true
    );
    if (inactiveRes.is_active !== false) throw new Error('is_active should be false');
    logger.info(`Successfully upserted inactive (WAF) test company: ${testNameInactive}`);
    logger.info('--- Database Test Passed ---');
  } catch (error) {
    logger.error('FAIL: Database Test');
    logger.error(error instanceof Error ? error.stack : error);
    process.exit(1);
  } finally {
    await closeDb();
  }
}

runDbTest();
