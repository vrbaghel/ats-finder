# ATS Platform Finder for Notion (TypeScript)

A powerful automation tool that identifies the Applicant Tracking System (ATS) used by companies listed in your Notion database. This script currently detects **Greenhouse**, **Lever**, and **Ashby** by probing their public job board APIs.

## Features

- **Automated Detection**: Iterates through your Notion database and identifies ATS platforms.
- **Slug Generation**: Automatically generates slug variants (e.g., "Riot Games" -> `riotgames`, `riot-games`) to find the correct job board.
- **Notion Integration**: Updates your Notion database with the detected ATS name and the direct job portal URL.
- **Flexible Property Support**: Automatically handles both `Select`, `URL`, and `Rich Text` property types in Notion.
- **Modern Notion API**: Built with the latest Notion SDK (version `2025-09-03`).

## Prerequisites

1.  **Notion Integration**: Create an internal integration at [notion.so/my-integrations](https://www.notion.so/my-integrations).
2.  **Database Access**: Ensure your integration has access to the target database.
3.  **Database Properties**: Your Notion database should have the following properties (names are configurable):
    - `Name` (Title): The name of the company.
    - `ATS` (Select or Text): Where the identified platform will be stored.
    - `Job Portal URL` (URL or Text): Where the link to the company's job board will be stored.

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
    Copy the example environment file and fill in your details:
    ```bash
    cp .env.example .env
    ```

    | Variable | Description | Default |
    | :--- | :--- | :--- |
    | `NOTION_TOKEN` | Your Notion internal integration token. | *Required* |
    | `DATABASE_ID` | The ID of the Notion database to process. | *Required* |
    | `COMPANY_PROPERTY_NAME` | The property name for the company name. | `Name` |
    | `ATS_PROPERTY_NAME` | The property name to store the ATS type. | `ATS` |
    | `PORTAL_URL_PROPERTY_NAME` | The property name to store the job portal URL. | `Job Portal URL` |

## Usage

Run the script directly using `ts-node`:
```bash
npm start
```

For production-like execution, build and run:
```bash
npm run build
node dist/index.js
```

### Linting
Maintain code quality with ESLint:
```bash
npm run lint
```

## How it works

1.  **Fetch Data**: The script queries your Notion database using the Notion SDK's Data Source API.
2.  **Generate Variants**: For each company, it generates common URL slug variants (e.g., `riotgames`, `riot-games`).
3.  **Probe APIs**: It sends lightweight HEAD/GET requests to known ATS API endpoints (Greenhouse, Lever, Ashby).
4.  **Validate**: A `200 OK` response confirms the company uses that specific platform.
5.  **Update Notion**: The script updates the Notion page with the detected platform name and the direct link to their careers page.

## Contributing

Contributions are welcome! Feel free to open issues or submit pull requests for additional ATS platform support (e.g., Workday, SuccessFactors, etc.).

## License

This project is licensed under the [MIT License](./LICENSE).
