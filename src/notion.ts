import { Client } from '@notionhq/client';
import 'dotenv/config';

const notion = new Client({ auth: process.env.NOTION_API_KEY, notionVersion: '2025-09-03' });
const databaseId = process.env.NOTION_DATASOURCE_ID!;

// Configurable Notion Property Names
const PROP_COMPANY_NAME = process.env.NOTION_PROP_COMPANY_NAME || 'Company Name';
const PROP_ATS_TYPE = process.env.NOTION_PROP_ATS_TYPE || 'ATS Type';
const PROP_CAREERS_URL = process.env.NOTION_PROP_CAREERS_URL || 'Careers Page URL';
const PROP_UPLOADED = process.env.NOTION_PROP_UPLOADED || 'Uploaded';

export interface NotionCompany {
  pageId: string;
  name: string;
  ats_type: string | null;
  careers_page_url: string | null;
}

/**
 * Fetches companies from Notion where 'Uploaded' is false (unchecked).
 */
export async function fetchPendingCompanies(): Promise<NotionCompany[]> {
  if (!databaseId) {
    throw new Error('NOTION_DATASOURCE_ID is not defined in .env');
  }

  const response = await notion.dataSources.query({
    data_source_id: databaseId,
    filter: {
      property: PROP_UPLOADED,
      checkbox: {
        equals: false,
      },
    },
  });

  return response.results.map((page: any) => {
    // Extract properties safely based on configurable Notion property names
    const props = page.properties;

    // Name (Title)
    const name = props[PROP_COMPANY_NAME]?.title?.[0]?.plain_text || 'Unknown';

    // ATS Type (Select or Multi-Select or Text)
    const ats_type = props[PROP_ATS_TYPE]?.select?.name || props[PROP_ATS_TYPE]?.rich_text?.[0]?.plain_text || null;

    // Careers Page URL (URL)
    const careers_page_url = props[PROP_CAREERS_URL]?.url || props[PROP_CAREERS_URL]?.rich_text?.[0]?.plain_text || null;

    return {
      pageId: page.id,
      name,
      ats_type,
      careers_page_url,
    };
  });
}

/**
 * Marks a company as 'Uploaded' in Notion.
 */
export async function markAsUploaded(pageId: string): Promise<void> {
  await notion.pages.update({
    page_id: pageId,
    properties: {
      [PROP_UPLOADED]: {
        checkbox: true,
      },
    },
  });
}

