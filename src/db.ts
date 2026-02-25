import { Pool } from 'pg';
import 'dotenv/config';

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'ats_finder',
  password: process.env.DB_PASSWORD,
  port: parseInt(process.env.DB_PORT || '5432', 10),
});

const TABLE_NAME = process.env.DB_TABLE_NAME || 'companies';

export const initDb = async () => {
  const createTableQuery = `
    CREATE TABLE IF NOT EXISTS ${TABLE_NAME} (
      id SERIAL PRIMARY KEY,
      company_name VARCHAR(255) NOT NULL UNIQUE,
      ats_type VARCHAR(50),
      job_portal_link VARCHAR(500),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;
  try {
    await pool.query(createTableQuery);
    console.log(`Table '${TABLE_NAME}' ensured to exist with unique constraint on company_name.`);
  } catch (err) {
    console.error('Error initializing database table:', err);
    throw err;
  }
};

export const insertCompanyATS = async (companyName: string, atsType: string | null, jobPortalLink: string | null) => {
  const upsertQuery = `
    INSERT INTO ${TABLE_NAME} (company_name, ats_type, job_portal_link, updated_at)
    VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
    ON CONFLICT (company_name) 
    DO UPDATE SET 
      ats_type = EXCLUDED.ats_type, 
      job_portal_link = EXCLUDED.job_portal_link,
      updated_at = CURRENT_TIMESTAMP
    RETURNING *;
  `;

  try {
    const res = await pool.query(upsertQuery, [companyName, atsType, jobPortalLink]);
    return res.rows[0];
  } catch (err) {
    console.error(`Error inserting/updating company '${companyName}':`, err);
    throw err;
  }
};

export const closeDb = async () => {
  await pool.end();
};
