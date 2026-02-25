import { URL } from 'url';

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
  // https://sabre.wd1.myworkdayjobs.com/en-US/SabreJobs
  if (hostname.includes('myworkdayjobs.com')) {
    const domainParts = hostname.split('.');
    const mwjIndex = domainParts.indexOf('myworkdayjobs');
    
    const companyName = domainParts[0];
    // The tenant is usually the segment before 'myworkdayjobs'
    const tenant = mwjIndex > 0 ? domainParts[mwjIndex - 1] : 'unknown';

    // If we have a structure like sabre.wd1.myworkdayjobs.com, companyName is likely the first part
    // and tenant (wd1) is the second part (which we captured above as mwjIndex-1).
    // If nvidia.myworkdayjobs.com, companyName (nvidia) == tenant (nvidia).
    
    // Refine Portal: Split pathname, remove empty segments, and ignore locales and "jobs"
    const segments = pathname.split('/').filter(s => s.length > 0);
    const filteredSegments = segments.filter(s => {
      // Ignore locales: en, en-US, fr-FR, zh-Hans-CN
      const isLocale = /^[a-z]{2}(-[a-zA-Z]{2,4}){0,2}$/.test(s);
      // Ignore literal "jobs"
      const isJobs = s.toLowerCase() === 'jobs';
      return !isLocale && !isJobs;
    });
    const portal = filteredSegments[0] || 'external';

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
