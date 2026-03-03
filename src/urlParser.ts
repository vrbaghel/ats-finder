import { URL } from 'url';
import { logger } from './logger.js';

export interface ParsedUrlResult {
  name: string | null; // Heuristic guess
  ats_type: 'greenhouse' | 'lever' | 'ashby' | 'workday' | 'custom';
  ats_token: string | null;
  wd_params: {
    tenant: string;
    portal: string;
    facets: Record<string, string[]>;
  } | null;
}

export function parseCompanyUrl(inputUrl: string): ParsedUrlResult {
  let url: URL;
  try {
    // Ensure protocol exists
    const toParse = inputUrl.startsWith('http') ? inputUrl : `https://${inputUrl}`;
    url = new URL(toParse);
  } catch {
    return {
      name: null,
      ats_type: 'custom',
      ats_token: null,
      wd_params: null
    };
  }

  const hostname = url.hostname.toLowerCase();
  const pathname = url.pathname;

  // --- Greenhouse ---
  // https://boards.greenhouse.io/spotify
  // https://boards.greenhouse.io/embed/job_board?for=spotify
  if (hostname.endsWith('greenhouse.io')) {
    let token: string | null;
    const forParam = url.searchParams.get('for');
    
    if (forParam) {
      token = forParam;
    } else {
      const parts = pathname.split('/').filter(Boolean);
      // Skip 'embed' or 'job_board' if they appear
      const filteredParts = parts.filter(p => !['embed', 'job_board'].includes(p.toLowerCase()));
      token = filteredParts[0] || null;
    }

    return {
      name: token, 
      ats_type: 'greenhouse',
      ats_token: token,
      wd_params: null
    };
  }

  // --- Lever ---
  // https://jobs.lever.co/spotify
  // https://jobs.eu.lever.co/prosus
  if (hostname.endsWith('lever.co')) {
    const parts = pathname.split('/').filter(Boolean);
    let token = parts[0] || null;

    // Handle company.lever.co where token is in subdomain
    if (!token && hostname !== 'lever.co') {
      const subdomains = hostname.split('.');
      if (subdomains.length >= 3 && !['jobs', 'www'].includes(subdomains[0])) {
        token = subdomains[0];
      }
    }

    return {
      name: token,
      ats_type: 'lever',
      ats_token: token,
      wd_params: null
    };
  }

  // --- Ashby ---
  // https://jobs.ashbyhq.com/spotify
  if (hostname.endsWith('ashbyhq.com')) {
    const parts = pathname.split('/').filter(Boolean);
    let token = parts[0] || null;

    if (!token && hostname !== 'ashbyhq.com') {
      const subdomains = hostname.split('.');
      if (subdomains.length >= 3 && !['jobs', 'www'].includes(subdomains[0])) {
        token = subdomains[0];
      }
    }

    return {
      name: token,
      ats_type: 'ashby',
      ats_token: token,
      wd_params: null
    };
  }

  // --- Workday ---
  // https://nvidia.wd5.myworkdayjobs.com/NVIDIA_External_Career_Site
  // https://sabre.wd1.myworkdayjobs.com/en-US/SabreJobs
  // https://broadcom.wd1.myworkdayjobs.com/External_Career
  if (hostname.includes('myworkdayjobs.com')) {
    const domainParts = hostname.split('.');
    const mwjIndex = domainParts.indexOf('myworkdayjobs');
    
    const companyName = domainParts[0];
    // The tenant is specifically the segment before 'myworkdayjobs' (e.g., wd1, wd5)
    const tenant = mwjIndex > 0 ? domainParts[mwjIndex - 1] : 'unknown';

    // Refine Portal: Split pathname, remove empty segments, and ignore locales and "jobs"
    const segments = pathname.split('/').filter(s => s.length > 0);
    const filteredSegments = segments.filter(s => {
      // Ignore locales: en, en-US, fr-FR, zh-Hans-CN, etc.
      const isLocale = /^[a-z]{2}(-[a-zA-Z]{2,4}){0,2}$/.test(s);
      // Ignore literal "jobs"
      const isJobs = s.toLowerCase() === 'jobs';
      return !isLocale && !isJobs;
    });
    const portal = filteredSegments[0] || 'external';
    logger.error(`\n\nUsing default workday portal 'external' for ${companyName}\n\n`);

    // Facets are searchParams converted to a JSON object of arrays
    const facets: Record<string, string[]> = {};
    url.searchParams.forEach((value, key) => {
      if (!facets[key]) {
        facets[key] = [];
      }
      facets[key].push(value);
    });

    return {
      name: companyName,
      ats_type: 'workday',
      ats_token: companyName, 
      wd_params: {
        tenant,
        portal,
        facets
      }
    };
  }

  // --- Custom ---
  // Try to extract a name from the domain (e.g. careers.spotify.com -> spotify)
  const commonSubdomains = ['www', 'careers', 'jobs', 'about', 'corp', 'my', 'secure', 'app', 'job-board', 'board', 'eu'];
  const domainParts = hostname.split('.');
  
  // Filter out common subdomains
  const meaningfulParts = domainParts.filter(p => !commonSubdomains.includes(p));
  
  // Heuristic: Take the first meaningful part.
  // e.g. spotify.com -> spotify
  // spotify.co.uk -> spotify
  const nameGuess = meaningfulParts[0] || 'unknown';
  
  return {
    name: nameGuess,
    ats_type: 'custom',
    ats_token: null,
    wd_params: null
  };
}
