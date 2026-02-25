# ATS Finder CLI

A command-line interface (CLI) tool that identifies the Applicant Tracking System (ATS) used by companies and stores the results in a PostgreSQL (Supabase) database.

Currently supports detection of **Greenhouse**, **Lever**, **Ashby**, and **Workday** by probing their public job board APIs or parsing provided URLs.

## Features

- **Dual Input Modes**:
    - **Name Mode**: Accept a list of company names directly as arguments to auto-detect ATS.
    - **Link Mode**: Accept a file containing a list of URLs to parse and extract ATS details.
- **Automated Detection**: Generates common slug variants (e.g., "Riot Games" -> `riotgames`, `riot-games`) to find the correct job board.
- **Advanced URL Parsing**: Extracts detailed configuration for Workday (Tenant, Portal, Facets) and other ATS platforms.
- **PostgreSQL Integration**: Optimized for Supabase with a schema designed for batch processing.
- **Idempotent Storage**: Updates existing records if the company is already in the database.

## Prerequisites

- **Node.js** (v18 or higher)
- **PostgreSQL** database instance (e.g., Supabase)

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
    
    Edit `.env` with your PostgreSQL credentials:
    ```env
    DB_USER=postgres
    DB_HOST=your-supabase-host.supabase.co
    DB_NAME=postgres
    DB_PASSWORD=yourpassword
    DB_PORT=5432
    DB_TABLE_NAME=companies
    ```

## Usage

### 1. Process by Company Name
Run the tool by passing one or more company names as arguments. This will attempt to find their ATS automatically.

```bash
# Process a single company
npm start -- "Airbnb"

# Process multiple companies
npm start -- "Airbnb" "Stripe" "Riot Games"
```

### 2. Process by URL List (File)
Pass a file containing a list of career page URLs (one per line). The tool will parse each URL to extract the ATS type, company name, and specific parameters (especially for Workday).

```bash
# Create a file with URLs
echo "https://jobs.lever.co/spotify" > companies.urls
echo "https://nvidia.wd5.myworkdayjobs.com/NVIDIA_External_Career_Site" >> companies.urls

# Run in link mode
npm start -- --type link companies.urls
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
