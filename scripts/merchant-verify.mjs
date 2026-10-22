import { spawnSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
const steps = [
  ['format', 'npx prettier --write src/web/App.tsx src/web/components.tsx src/web/PremiumHome.tsx src/web/forms.tsx src/worker/api.ts src/web/merchant.css e2e/merchant.spec.ts'],
  ['typecheck', 'npm run typecheck'],
  ['lint', 'npm run lint'],
  ['unit', 'npm test'],
  ['build', 'npm run build'],
  ['format-check', 'npm run format:check'],
  ['e2e', 'npm run test:e2e'],
  ['diff-check', 'git diff --check'],
  ['status', 'git status --short'],
];
const results = [];
for (const [name, command] of steps) {
  const result = spawnSync('cmd.exe', ['/d', '/s', '/c', command], { cwd: new URL('..', import.meta.url), encoding: 'utf8', env: { ...process.env, PLAYWRIGHT_CHANNEL: 'chrome' }, maxBuffer: 20 * 1024 * 1024 });
  writeFileSync(new URL(`../merchant-verified-${name}.log`, import.meta.url), (result.stdout || '') + (result.stderr || '') + `\nEXIT_CODE=${result.status}\n`);
  results.push({ name, exitCode: result.status, error: result.error?.message });
  writeFileSync(new URL('../merchant-verification.json', import.meta.url), JSON.stringify(results, null, 2));
}