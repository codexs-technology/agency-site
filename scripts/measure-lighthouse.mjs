import { spawn } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../', import.meta.url));
const server = spawn(process.execPath, ['node_modules/wrangler/bin/wrangler.js', 'dev', '--local', '--port', '8790'], { cwd: root, stdio: 'ignore' });
async function run(args, env) {
  await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, args, { cwd: root, stdio: 'inherit', env });
    child.on('error', reject);
    child.on('exit', (code) => code === 0 ? resolve() : reject(new Error(`Lighthouse exited ${code}`)));
  });
}
try {
  await mkdir(`${root}reports`, { recursive: true });
  let ready = false;
  for (let attempt = 0; attempt < 90; attempt++) {
    try { ready = (await fetch('http://localhost:8790/', { signal: AbortSignal.timeout(2000) })).ok; } catch { /* Wait for local Worker. */ }
    if (ready) break;
    await delay(1000);
  }
  if (!ready) throw new Error('Local measurement Worker did not start.');
  const summary = [];
  for (const route of ['/', '/services/web-development', '/contact']) {
    const name = route === '/' ? 'home' : route.split('/').at(-1);
    const output = `reports/lighthouse-${name}.json`;
    await run(['node_modules/lighthouse/cli/index.js', `http://localhost:8790${route}`, '--quiet', '--chrome-flags=--headless --no-sandbox', '--output=json', `--output-path=${output}`], process.env);
    const report = JSON.parse(await readFile(`${root}${output}`, 'utf8'));
    summary.push({ route, mode: 'mobile, localhost Worker (not production)', categories: Object.fromEntries(Object.entries(report.categories).map(([key, value]) => [key, Math.round(value.score * 100)])), lcp: report.audits['largest-contentful-paint'].numericValue, cls: report.audits['cumulative-layout-shift'].numericValue, errors: report.runtimeError || null });
  }
  await writeFile(`${root}reports/lighthouse-summary.json`, JSON.stringify(summary, null, 2));
} catch (error) { console.error(error.message); process.exitCode = 1; }
finally { server.kill(); }