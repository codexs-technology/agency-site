import { spawnSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
const results = {};
for (const [name, command] of [
  ['format', 'npx prettier --write src/worker/recruitment.ts src/web/CareersPage.tsx tests/recruitment.test.ts tests/careers-webhook.test.ts tests/apps-script.test.ts'],
  ['typecheck', 'npm run typecheck'], ['lint', 'npm run lint'],
  ['format-check', 'npm run format:check'], ['unit', 'npm test'],
  ['build', 'npm run build'],
  ['production-dry-run', 'npx wrangler deploy --env production --dry-run --outdir worker-build-production'],
  ['e2e', 'npm run test:e2e'], ['diff', 'git diff --check'],
]) {
  const result = spawnSync('cmd.exe', ['/d','/s','/c', command], {encoding: 'utf8', maxBuffer: 16*1024*1024, timeout: 1200000});
  writeFileSync(`gmail-${name}.log`, (result.stdout || '') + (result.stderr || ''));
  results[name] = {exitCode: result.status, error: result.error?.message};
  writeFileSync('gmail-validation-results.json', JSON.stringify(results,null,2));
}
writeFileSync('gmail-validation-done.log', 'Finished');