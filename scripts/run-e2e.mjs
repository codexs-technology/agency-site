import { spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { mkdir, readFile, writeFile, rm } from 'node:fs/promises';
const directory = `.wrangler/e2e-${randomBytes(8).toString('hex')}`;
const shell = process.platform === 'win32' ? 'cmd.exe' : '/bin/sh';
function run(command, env = {}) {
  const result = spawnSync(shell, process.platform === 'win32' ? ['/d', '/s', '/c', command] : ['-c', command], { stdio: 'inherit', env: { ...process.env, ...env } });
  if (result.status !== 0) throw new Error(`Command failed: ${command}`);
}
let oldVars;
let oldSecret;
try {
  try { oldVars = await readFile('.dev.vars'); } catch { /* No previous local configuration. */ }
  try { oldSecret = await readFile('.test-bootstrap-secret'); } catch { /* No previous test secret. */ }
  await mkdir(directory, { recursive: true });
  run('node scripts/prepare-local-tests.mjs');
  run(`npx wrangler d1 migrations apply codesboxs --local --persist-to ${directory}`);
  run('npx playwright test', { E2E_PERSIST_DIR: directory });
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  if (oldVars) await writeFile('.dev.vars', oldVars); else await rm('.dev.vars', { force: true });
  if (oldSecret) await writeFile('.test-bootstrap-secret', oldSecret); else await rm('.test-bootstrap-secret', { force: true });
  // Leave the isolated ignored database for failure investigation; no existing data is modified.
  console.log(`Isolated test database: ${directory}`);
}