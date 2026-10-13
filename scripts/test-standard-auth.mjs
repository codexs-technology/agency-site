import { randomBytes } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
const origin = 'http://localhost:8788';
const secret = await readFile('.test-bootstrap-secret', 'utf8');
const email = `standard-${randomBytes(5).toString('hex')}@example.com`;
const password = `Local-only!${randomBytes(20).toString('hex')}Aa9`;
async function post(path, data, headers = {}) {
  return fetch(origin + path, { method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(data) });
}
try {
  let ready = false;
  for (let attempt = 0; attempt < 60; attempt++) {
    try { const response = await fetch(origin + '/robots.txt'); if (response.ok) { ready = true; break; } } catch { /* Wait for local Worker startup. */ }
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  if (!ready) throw new Error('Isolated Worker did not start');
  const bootstrap = await post('/api/admin/bootstrap', { email, password }, { 'X-Bootstrap-Secret': secret });
  if (bootstrap.status !== 201) throw new Error(`Bootstrap status ${bootstrap.status}`);
  const login = await post('/api/admin/login', { email, password });
  if (login.status !== 200) throw new Error(`Login status ${login.status}`);
  const invalid = await post('/api/admin/login', { email, password: 'wrong' });
  if (invalid.status !== 401) throw new Error(`Invalid login status ${invalid.status}`);
  await writeFile('standard-auth-result.log', 'PASS: standard PBKDF2 bootstrap, valid login and invalid login rejection in isolated actual Worker/D1 runtime.\n');
} catch (error) {
  await writeFile('standard-auth-result.log', `FAIL: ${error.message}\n`);
  process.exitCode = 1;
}