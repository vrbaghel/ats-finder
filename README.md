# ATS Finder

A tool that synchronizes company data from a Notion database, identifies their Applicant Tracking System (ATS), and stores the results in a PostgreSQL (Supabase) database.

Currently supports detection of **Greenhouse**, **Lever**, **Ashby**, and **Workday** by parsing provided URLs or probing public job board APIs.

## Features

- **Notion Sync**: Automatically fetches companies from a Notion database that have not been "uploaded" yet.
- **Automated Detection**: 
    - **URL Parsing**: Extracts detailed configuration for Workday (Tenant, Portal, Facets) and other ATS platforms from career page URLs.
    - **Probing (Fallback)**: If parsing returns 'custom', it attempts to probe known API endpoints using company name variants.
- **PostgreSQL Integration**: Optimized for Supabase with a schema designed for batch processing.
- **Winston Logging**: Structured logging to both console and files (`logs/combined.log`, `logs/error.log`).
- **Idempotent Storage**: Updates existing records if the company name already exists in the database.
- **Configurable**: Notion property names are configurable via environment variables.

## Prerequisites

- **Node.js** (v18 or higher)
- **PostgreSQL** database instance (e.g., Supabase)
- **Notion Integration**: An internal integration with access to your database.

## Setup

1.  **Clone the repository**:
    ```bash
    git clone <repository-url>
    cd ats-finder
    ```

2.  **Install dependencies**:
    ```bash
    npm install
    ```

3.  **Configure environment variables**:
    Copy the example environment file:
    ```bash
    cp .env.example .env
    ```
    
    Edit `.env` with your credentials:
    ```env
    # Database
    DB_USER=postgres
    DB_HOST=your-supabase-host.supabase.co
    DB_NAME=postgres
    DB_PASSWORD=yourpassword
    DB_PORT=5432
    DB_TABLE_NAME=companies

    # Notion
    NOTION_API_KEY=your_integration_secret
    NOTION_DATABASE_ID=your_database_uuid
    
    # Notion Property Names (Optional overrides)
    NOTION_PROP_NAME=Name
    NOTION_PROP_ATS_TYPE=ATS Type
    NOTION_PROP_CAREERS_URL=Careers Page URL
    NOTION_PROP_UPLOADED=Uploaded
    ```

## Usage

### Run Synchronization
The main script fetches pending companies from Notion, processes them, and uploads to Supabase.

```bash
npm start
```

## Database Schema

The tool expects a table (default: `companies`) with the following structure (Supabase compatible):

| Column | Type | Description |
| :--- | :--- | :--- |
| `id` | UUID PRIMARY KEY | Unique identifier (default: `gen_random_uuid()`). |
| `name` | TEXT UNIQUE | Name of the company. |
| `ats_type` | ENUM | Detected ATS (`greenhouse`, `lever`, `ashby`, `workday`, `custom`). |
| `ats_token` | TEXT | The unique slug or identifier for the ATS. |
| `wd_params` | JSONB | Specific configuration for Workday (tenant, portal, facets). |
| `careers_page_url` | TEXT | The full URL to the careers page. |
| `last_scanned_at` | TIMESTAMPTZ | Timestamp of the last scan. |
| `is_active` | BOOLEAN | Whether the company is currently active. |

## Development

### Test Scripts
Run individual tests for different parts of the system:

```bash
# Test URL parsing logic with various ATS formats
npm run test:parser

# Test fetching pending companies from Notion
npm run test:notion

# Test database connection and upsert logic
npm run test:db
```

### Build
Compile TypeScript to JavaScript:
```bash
npm run build
```

### Linting
Check for code style issues:
```bash
npm run lint
```

## License

This project is licensed under the [MIT License](./LICENSE).
