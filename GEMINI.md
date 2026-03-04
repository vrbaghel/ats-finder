# GEMINI.md - Context for ATS Finder Project

This project, `ats-finder`, is a Notion-to-Supabase synchronization tool that scans for Applicant Tracking Systems (ATS) used by companies.

## Project Overview

-   **Goal**: Detect ATS platforms (Greenhouse, Lever, Ashby, Workday) from Notion-sourced career URLs and store configurations in Supabase.
-   **Main Technologies**:
    -   **Node.js** with **TypeScript** (ESM).
    -   **Notion SDK** for retrieving pending company records.
    -   **PostgreSQL** (`pg` library) for storage (Supabase schema).
    -   **Winston** for structured logging (console & file).
    -   **Axios** for API verification.

## Architecture

1.  **Notion Sync**: Fetches pages where `Uploaded` checkbox is false.
    -   Extracts `WAF` checkbox (mapped to `is_active = false` if checked).
2.  **ATS Detection**:
    -   Parses career URLs to extract types and parameters.
    -   If an ATS type is identified as `custom` in Notion, it stays as `custom`.
3.  **API Verification**:
    -   For Greenhouse, Lever, and Ashby, verifies the API endpoint returns status 200 before uploading.
4.  **Supabase Storage**: Upserts results to the `companies` table and marks the Notion record as uploaded.

## Building and Running

### Commands
-   **Install Dependencies**: `npm install`
-   **Run Sync**: `npm start` (Processes all pending companies from Notion)
-   **Build**: `npm run build`
-   **Linting**: `npm run lint`

### Tests
-   `npm run test:parser`: Verifies URL parsing logic for Greenhouse, Lever, Ashby, Workday (including portal extraction).
-   `npm run test:notion`: Verifies retrieval of pending records from Notion.
-   `npm run test:db`: Verifies Supabase connection and upsert logic.
-   `npm run test:platforms`: End-to-end verification of API probing and database upload for all ATS types.

### Configuration
Managed via environment variables in `.env`:
- `DB_*`: Database connection details.
- `NOTION_API_KEY`, `NOTION_DATASOURCE_ID`: Notion access.
- `NOTION_PROP_*`: Customizable property names for Notion (Name, ATS Type, WAF, etc.).

### Git Workflow
-   **Branch Management**: Do NOT delete branches after merging. Keep them for historical reference.

## Key Files
-   `src/index.ts`: Main entry point (Synchronization logic and verification).
-   `src/notion.ts`: Logic for fetching and updating Notion records.
-   `src/db.ts`: Database connection and helper functions.
-   `src/urlParser.ts`: Logic for parsing URLs and extracting ATS details (Greenhouse, Lever, Ashby, Workday).
-   `src/logger.ts`: Winston logger configuration.
-   `tests/`: Integration and unit test suite.
