-- Create an ENUM to enforce strict ATS types
CREATE TYPE ats_system AS ENUM ('greenhouse', 'lever', 'ashby', 'workday', 'custom');

CREATE TABLE companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) UNIQUE NOT NULL,
    ats_type ats_system NOT NULL,
    careers_page_url TEXT,
    
    -- The API Configs
    ats_token VARCHAR(255), -- Holds the slug for Greenhouse/Lever/Ashby
    wd_params JSONB,        -- Holds {"tenant": "...", "portal": "...", "facets": {...}}
    
    -- Operational State
    last_scanned_at TIMESTAMPTZ DEFAULT '1970-01-01 00:00:00Z',
    is_active BOOLEAN DEFAULT TRUE, -- Allows you to pause scraping a broken site without deleting it
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Optional: Create an index to make the Go worker's batch query blazing fast
CREATE INDEX idx_companies_last_scanned ON companies(last_scanned_at);
