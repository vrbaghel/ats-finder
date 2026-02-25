# ATS Finder CLI

A command-line interface (CLI) tool that identifies the Applicant Tracking System (ATS) used by companies and stores the results in a PostgreSQL database.

Currently supports detection of **Greenhouse**, **Lever**, and **Ashby** by probing their public job board APIs.

## Features

- **CLI Interface**: Accept a list of company names directly as arguments.
- **Automated Detection**: Generates common slug variants (e.g., "Riot Games" -> `riotgames`, `riot-games`) to find the correct job board.
- **PostgreSQL Integration**: Automatically creates a table and stores the detected ATS platform and job portal URL.
- **Idempotent Storage**: Updates existing records if the company is already in the database.

## Prerequisites

- **Node.js** (v18 or higher)
- **PostgreSQL** database instance

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
    DB_HOST=localhost
    DB_NAME=ats_finder
    DB_PASSWORD=yourpassword
    DB_PORT=5432
    DB_TABLE_NAME=companies
    ```

4.  **Database Initialization**:
    The tool will automatically create the required table (`companies` by default) on the first run.

## Usage

Run the tool by passing one or more company names as arguments:

```bash
# Process a single company
npm start -- "Airbnb"

# Process multiple companies
npm start -- "Airbnb" "Stripe" "Riot Games"
```

The tool will:
1. Connect to the database.
2. Search for the ATS for each company.
3. Output the result to the console.
4. Save or update the record in the database.

## Database Schema

The tool creates a table (default: `companies`) with the following structure:

| Column | Type | Description |
| :--- | :--- | :--- |
| `id` | SERIAL PRIMARY KEY | Unique identifier. |
| `company_name` | VARCHAR(255) UNIQUE | Name of the company. |
| `ats_type` | VARCHAR(50) | Detected ATS (e.g., 'Greenhouse', 'Lever'). |
| `job_portal_link` | VARCHAR(500) | URL to the job board. |
| `created_at` | TIMESTAMP | Record creation time. |
| `updated_at` | TIMESTAMP | Last update time. |

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
