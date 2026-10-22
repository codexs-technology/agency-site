import { writeFileSync } from 'node:fs';
const results = {};
for (const path of ['/api/services', '/contact', '/newsletter/confirm']) {
  try {
    const response = await fetch(`https://codesboxs.com${path}`, {signal: AbortSignal.timeout(15000)});
    const body = await response.text();
    results[path] = {status: response.status,
      ...(path === '/api/services' ? {body: body.slice(0, 300)} : {
        turnstileConfigured: /"turnstileSiteKey":"[^"]+"/.test(body),
        submissionsUnavailable: body.includes('Online submissions are temporarily unavailable'),
      })};
  } catch { results[path] = {error: 'network_unavailable'}; }
}
writeFileSync('gmail-live-readonly.json', JSON.stringify(results,null,2));