import { Client } from '@notionhq/client';
import 'dotenv/config';

const notion = new Client({ auth: process.env.NOTION_API_KEY });
const databaseId = process.env.NOTION_DATABASE_ID!;

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
    throw new Error('NOTION_DATABASE_ID is not defined in .env');
  }

  const response = await notion.databases.query({
    database_id: databaseId,
    filter: {
      property: 'Uploaded',
      checkbox: {
        equals: false,
      },
    },
  });

  return response.results.map((page: any) => {
    // Extract properties safely based on common Notion property types
    const props = page.properties;
    
    // Name (Title)
    const name = props.Name?.title?.[0]?.plain_text || 'Unknown';
    
    // ATS Type (Select or Multi-Select or Text) - assuming Select for now
    const ats_type = props['ATS Type']?.select?.name || props['ATS Type']?.rich_text?.[0]?.plain_text || null;
    
    // Careers Page URL (URL)
    const careers_page_url = props['Careers Page URL']?.url || props['Careers Page URL']?.rich_text?.[0]?.plain_text || null;

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
      Uploaded: {
        checkbox: true,
      },
    },
  });
}
