import { mkdir, writeFile } from 'node:fs/promises';
await mkdir('public/fonts',{recursive:true});
for(const [url,name] of [
  ['spacegrotesk/SpaceGrotesk%5Bwght%5D.ttf','space-grotesk.ttf'],
  ['spacegrotesk/OFL.txt','SpaceGrotesk-OFL.txt'],
  ['newsreader/Newsreader-Italic%5Bopsz,wght%5D.ttf','newsreader.ttf'],
  ['newsreader/OFL.txt','Newsreader-OFL.txt'],
]) {
  const response = await fetch(`https://raw.githubusercontent.com/google/fonts/main/ofl/${url}`);
  if(!response.ok) throw new Error(`Font download failed: ${response.status} ${name}`);
  await writeFile(`public/fonts/${name}`,new Uint8Array(await response.arrayBuffer()));
}
console.log('Self-hosted fonts and OFL licenses downloaded.');