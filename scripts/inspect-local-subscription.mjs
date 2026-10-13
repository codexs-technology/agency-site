// Read-only helper for investigating a disposable E2E database; never targets remote D1.
import { spawnSync } from 'node:child_process';
const directory = process.argv[2];
if (!/^\.wrangler[\\/]e2e-[a-f0-9]+$/.test(directory || '')) throw new Error('An isolated E2E persistence path is required');
const command = `npx wrangler d1 execute codesboxs --local --persist-to ${directory} --command "SELECT recipient,kind,status FROM email_outbox; SELECT email,status FROM newsletter_subscribers;"`;
const result = spawnSync(process.platform === 'win32' ? 'cmd.exe' : '/bin/sh', process.platform === 'win32' ? ['/d', '/s', '/c', command] : ['-c', command], { stdio: 'inherit' });
process.exitCode = result.status || 0;