-- Create an ENUM for the lifecycle of the job lead
CREATE TYPE sync_state AS ENUM ('pending', 'synced', 'failed', 'ignored');

CREATE TABLE jobs (
    -- Internal DB Identity
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    
    -- The Job Payload
    title VARCHAR(255) NOT NULL,
    apply_url TEXT NOT NULL,
    
    -- Deduplication & Fingerprinting
    job_hash VARCHAR(255) UNIQUE NOT NULL, -- Your MD5/SHA256 hash of URL+Title
    ats_job_id VARCHAR(255),               -- The native ID from Greenhouse/Workday (if available)
    
    -- Architecture State Management
    status sync_state DEFAULT 'pending',
    
    -- Timestamps
    published_at TIMESTAMPTZ,              -- When the ATS says it was posted (crucial for Workday)
    discovered_at TIMESTAMPTZ DEFAULT NOW() -- When your Go worker found it
);

-- Index for the Node.js service to quickly find unsynced jobs
CREATE INDEX idx_jobs_sync_status ON jobs(status) WHERE status = 'pending';

-- Index for fast company-specific lookups
CREATE INDEX idx_jobs_company_id ON jobs(company_id);
