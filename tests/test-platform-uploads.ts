import { initDb, insertCompanyATS, closeDb } from '../src/db.js';
import { logger } from '../src/logger.js';
import axios from 'axios';
import 'dotenv/config';

const TEST_PLATFORMS = [
  {
    name: '_TEST_Greenhouse_Spotify',
    type: 'greenhouse',
    token: 'spotify',
    url: 'https://boards.greenhouse.io/spotify',
    apiUrl: 'https://boards-api.greenhouse.io/v1/boards/spotify/jobs'
  },
  {
    name: '_TEST_Lever_Figma',
    type: 'lever',
    token: 'figma',
    url: 'https://jobs.lever.co/figma',
    apiUrl: 'https://api.lever.co/v0/postings/figma'
  },
  {
    name: '_TEST_Ashby_Vercel',
    type: 'ashby',
    token: 'vercel',
    url: 'https://jobs.ashbyhq.com/vercel',
    apiUrl: 'https://api.ashbyhq.com/posting-api/job-board/vercel'
  },
  {
    name: '_TEST_Workday_Nvidia',
    type: 'workday',
    token: 'nvidia',
    url: 'https://nvidia.wd5.myworkdayjobs.com/NVIDIA_External_Career_Site',
    wd_params: { tenant: 'wd5', portal: 'NVIDIA_External_Career_Site', facets: {} }
  },
  {
    name: '_TEST_Custom_Example',
    type: 'custom',
    token: null,
    url: 'https://example.com/careers'
  }
];

async function checkUrl(url: string): Promise<boolean> {
  try {
    const response = await axios.get(url, { timeout: 5000 });
    return response.status === 200;
  } catch {
    return false;
  }
}

async function runUploadTest() {
  logger.info('--- Starting Platform Upload Test ---');
  try {
    await initDb();

    for (const platform of TEST_PLATFORMS) {
      logger.info(`Processing ${platform.type}: ${platform.name}`);

      // 1. Verify API URL if it exists (mimicking index.ts logic)
      if (platform.apiUrl) {
        const isValid = await checkUrl(platform.apiUrl);
        if (!isValid) {
          logger.error(`   API Verification Failed for ${platform.apiUrl}`);
          continue;
        }
        logger.info(`   API Verification Passed`);
      }

      // 2. Upload to Database
      await insertCompanyATS(
        platform.name,
        platform.type,
        platform.token,
        (platform as any).wd_params || null,
        platform.url,
        true // isActive
      );
      logger.info(`   Successfully uploaded to database`);
    }

    logger.info('--- Platform Upload Test Completed ---');
  } catch (error) {
    logger.error('FAIL: Platform Upload Test');
    logger.error(error instanceof Error ? error.stack : error);
    process.exit(1);
  } finally {
    await closeDb();
  }
}

runUploadTest();
