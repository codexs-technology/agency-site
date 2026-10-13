import { readFile } from 'node:fs/promises';
const configuration = JSON.parse(await readFile('wrangler.jsonc','utf8'));
const production = configuration.env?.production;
if (!production || production.vars?.ENVIRONMENT !== 'production' || !production.vars?.PUBLIC_SITE_URL?.startsWith('https://') || !production.d1_databases?.[0]?.database_id || production.d1_databases[0].database_id.startsWith('00000000')) {
  console.error('Production blocked: configure a separate verified production environment, HTTPS site URL and real D1 binding first.');
  process.exit(1);
}
console.log('Production target configuration present; credentials, migrations, legal approval and runtime checks still require verification.');