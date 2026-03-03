import { initDb, insertCompanyATS, closeDb } from '../src/db.js';
import { logger } from '../src/logger.js';
import 'dotenv/config';

async function runDbTest() {
  logger.info('--- Starting Database Test ---');
  try {
    await initDb();
    
    // Attempt a dummy insertion for testing (Upsert logic means it won't duplicate)
    const testName = `_TEST_COMPANY_${Date.now()}`;
    await insertCompanyATS(
      testName, 
      'greenhouse', 
      'test-token', 
      null, 
      'https://boards.greenhouse.io/test-token'
    );
    
    logger.info(`✅ Successfully upserted test company: ${testName}`);
    logger.info('--- Database Test Passed ---');
  } catch (error) {
    logger.error('❌ FAIL: Database Test');
    logger.error(error instanceof Error ? error.stack : error);
    process.exit(1);
  } finally {
    await closeDb();
  }
}

runDbTest();
