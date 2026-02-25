import { parseWorkdayUrl } from './index.js';

/**
 * To test a new URL, simply add it to this list and run:
 * npx ts-node src/test-workday.ts
 */
const testUrls = [
  "https://workday.wd5.myworkdayjobs.com/Workday",
  "https://broadcom.wd1.myworkdayjobs.com/External_Career",
  "https://priceline.wd1.myworkdayjobs.com/en-US/Priceline/jobs",
  "https://amadeus.wd502.myworkdayjobs.com/jobs",
  "https://nvidia.wd5.myworkdayjobs.com/NVIDIAExternalCareerSite",
  "https://ebay.wd5.myworkdayjobs.com/apply/",
  "https://deloitteie.wd3.myworkdayjobs.com/experienced_professionals",
  "https://bostondynamics.wd1.myworkdayjobs.com/en-US/Boston_Dynamics/jobs?locations=51d914e628321001629ff6bfd3640000&jobFamily=53a69875bf3e016500549dba1005eb07",
  "https://ffive.wd5.myworkdayjobs.com/en-US/f5jobs/jobs?locationCountry=bc33aa3152ec42d4995f4791a106ed09&CF_-_Job_Posting_Category_Extended=ebc0867ff0da10015d4881e40be60000"
];

console.log("=== Workday URL Parser Test Suite ===\n");

testUrls.forEach((url, i) => {
  const result = parseWorkdayUrl(url);
  console.log(`Test #${i + 1}: ${url}`);
  if (result) {
    console.log(`  Tenant: ${result.tenant}`);
    console.log(`  Portal: "${result.portal}"`);
    console.log(`  Facets: ${result.facetsJson.replace(/\n/g, '')}`);
  } else {
    console.log("  Result: FAILED TO PARSE");
  }
  console.log("");
});
