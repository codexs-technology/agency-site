import { spawnSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
// Pass PLAYWRIGHT_CHANNEL=chrome locally if bundled browsers are unavailable.
for(const [name,command] of [
  ['format','npm exec prettier -- --write src tests e2e'],
  ['lint','npm run lint'],
  ['unit','npm test'],
  ['build','npm run build'],
  ['e2e','npm run test:e2e'],
]) {
  const shell = process.platform === 'win32' ? 'cmd.exe' : '/bin/sh';
  const args = process.platform === 'win32' ? ['/d','/c',command] : ['-c',command];
  const result = spawnSync(shell,args,{encoding:'utf8',env:process.env,maxBuffer:10*1024*1024});
  writeFileSync(`luxury-${name}.log`,`${result.stdout || ''}\n${result.stderr || ''}\nEXIT=${result.status}\n`);
  if(result.status !== 0) process.exit(1);
}
writeFileSync('luxury-validation-complete.log','ALL VALIDATION STEPS PASSED\n');