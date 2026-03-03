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
  // We assume the table is created by Supabase or external migration.
  // Keeping this simple log to indicate DB connection is ready.
  console.log(`Using table '${TABLE_NAME}'.`);
};

export const insertCompanyATS = async (
  name: string,
  atsType: string | null,
  atsToken: string | null,
  wdParams: object | null = null,
  careersPageUrl: string | null = null
) => {
  const upsertQuery = `
    INSERT INTO ${TABLE_NAME} (name, ats_type, ats_token, wd_params, last_scanned_at, careers_page_url)
    VALUES ($1, $2, $3, $4::jsonb, NOW(), $5)
    ON CONFLICT (name) 
    DO UPDATE SET 
      ats_type = EXCLUDED.ats_type, 
      ats_token = EXCLUDED.ats_token,
      wd_params = COALESCE(EXCLUDED.wd_params, ${TABLE_NAME}.wd_params),
      last_scanned_at = NOW(),
      careers_page_url = COALESCE(EXCLUDED.careers_page_url, ${TABLE_NAME}.careers_page_url)
    RETURNING *;
  `;

  try {
    const res = await pool.query(upsertQuery, [name, atsType, atsToken, wdParams, careersPageUrl]);
    return res.rows[0];
  } catch (err: any) {
    console.error(`Error inserting/updating company '${name}':`, {
      message: err.message,
      detail: err.detail,
      hint: err.hint,
      code: err.code
    });
    throw err;
  }
};

export const closeDb = async () => {
  await pool.end();
};
