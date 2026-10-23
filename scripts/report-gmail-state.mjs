import { readFileSync, existsSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { stripVTControlCharacters } from 'node:util';
const out = {};
for (const file of ['gmail-validation-results.json','gmail-live-readonly.json']) {
  if (existsSync(file)) out[file] = JSON.parse(readFileSync(file,'utf8'));
}
for (const file of ['gmail-unit.log','gmail-e2e.log']) {
  if (existsSync(file)) out[file] = stripVTControlCharacters(readFileSync(file,'utf8')).split('\n').filter(line => /Tests |Test Files| passed |failed|0007|Error:/.test(line));
}
out.branch = execFileSync('git',['branch','--show-current'],{encoding:'utf8'}).trim();
out.head = execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
out.status = execFileSync('git',['status','--short'],{encoding:'utf8'});
writeFileSync('gmail-state.json',JSON.stringify(out,null,2));
console.log(JSON.stringify(out,null,2));