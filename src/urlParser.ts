import { URL } from 'url';

export interface ParsedUrlResult {
  name: string | null; // Heuristic guess
  ats_type: 'greenhouse' | 'lever' | 'ashby' | 'workday' | 'custom';
  ats_token: string | null;
  wd_params: {
    tenant: string;
    portal: string;
    facets: Record<string, string>;
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
  if (hostname.includes('boards.greenhouse.io')) {
    let token: string | null;
    const forParam = url.searchParams.get('for');
    
    if (forParam) {
      token = forParam;
    } else {
      const parts = pathname.split('/').filter(Boolean);
      token = parts[0] || null;
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
  if (hostname.includes('jobs.lever.co')) {
    const parts = pathname.split('/').filter(Boolean);
    const token = parts[0] || null;
    return {
      name: token,
      ats_type: 'lever',
      ats_token: token,
      wd_params: null
    };
  }

  // --- Ashby ---
  // https://jobs.ashbyhq.com/spotify
  if (hostname.includes('jobs.ashbyhq.com')) {
    const parts = pathname.split('/').filter(Boolean);
    const token = parts[0] || null;
    return {
      name: token,
      ats_type: 'ashby',
      ats_token: token,
      wd_params: null
    };
  }

  // --- Workday ---
  // https://nvidia.wd5.myworkdayjobs.com/NVIDIA_External_Career_Site
  if (hostname.includes('myworkdayjobs.com')) {
    // Tenant is the first part of the hostname
    // e.g. nvidia.wd5.myworkdayjobs.com -> nvidia
    const tenant = hostname.split('.')[0];
    
    // Portal is the first part of the path
    const parts = pathname.split('/').filter(Boolean);
    const portal = parts[0] || 'external'; // default fallback

    // Extract query params as facets
    const facets: Record<string, string> = {};
    url.searchParams.forEach((value, key) => {
      facets[key] = value;
    });

    return {
      name: tenant,
      ats_type: 'workday',
      ats_token: tenant, // Use tenant as the token
      wd_params: {
        tenant,
        portal,
        facets
      }
    };
  }

  // --- Custom ---
  // Try to extract a name from the domain (e.g. careers.spotify.com -> spotify)
  const commonSubdomains = ['www', 'careers', 'jobs', 'about', 'corp', 'my', 'secure', 'app', 'job-board', 'board'];
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
