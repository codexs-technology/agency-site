import { readFile, writeFile } from 'node:fs/promises';

// Read-only audit of repository-defined routes. No forms, login or mutations.
const source = await readFile(new URL('../src/shared/content.ts', import.meta.url), 'utf8');
const paths = new Set([
  ...Array.from(source.matchAll(/^ {2}"(\/[^"]*)": \[/gm), match => match[1]).filter(path => path !== '/404'),
  ...Array.from(source.matchAll(/^ {4}slug: "([a-z0-9-]+)",/gm), match => `/services/${match[1]}`),
  '/terms-and-conditions', '/api/services', '/api/payments/readiness', '/sitemap.xml', '/robots.txt',
]);
const results = [];
for (const path of paths) {
  try {
    const response = await fetch(`https://codesboxs.com${path}`, {
      method: 'GET', redirect: 'manual', signal: AbortSignal.timeout(15000),
    });
    const body = await response.text();
    results.push({ path, status: response.status, location: response.headers.get('location'),
      title: body.match(/<title>(.*?)<\/title>/)?.[1] || null,
      hasTurnstile: /"turnstileSiteKey":"[^"]+"/.test(body),
      hasDraftWarning: body.includes('OWNER / LEGAL REVIEW REQUIRED'),
    });
  } catch {
    results.push({ path, status: null, error: 'Network failure; not verified' });
  }
}
await writeFile(new URL('../audit-public-routes.json', import.meta.url), JSON.stringify({
  checkedAt: new Date().toISOString(), method: 'GET', results,
  limitations: 'Does not submit forms, verify documents, email delivery, database writes or merchant approval.',
}, null, 2));
console.log(`Recorded ${results.length} read-only route checks in audit-public-routes.json`);