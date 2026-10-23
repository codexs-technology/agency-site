import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { Buffer } from 'node:buffer';
import { createHash } from 'node:crypto';
import sharp from 'sharp';
const sources = JSON.parse(await readFile('scripts/release-photo-sources.json','utf8'));
const output = 'public/images/photography';
const manifest = JSON.parse(await readFile(`${output}/manifest.json`,'utf8'));
await mkdir(output,{recursive:true});
for (const s of sources) {
 const url = `https://images.pexels.com/photos/${s.id}/pexels-photo-${s.id}.${s.id === 7013068 ? 'png' : 'jpeg'}?auto=compress&cs=tinysrgb&w=1800`;
 const r = await fetch(url,{signal:AbortSignal.timeout(45000)}); if (!r.ok) throw new Error(`${s.key}: ${r.status}`);
 const raw = Buffer.from(await r.arrayBuffer());
 for (const width of [320,640,960]) {
  const filename = `${s.key}-${width}.webp`;
  const height = Math.round(width*2/3);
  const bytes = await sharp(raw).rotate().resize(width,height,{fit:'cover'}).webp({quality:80,effort:5}).toBuffer();
  await writeFile(`${output}/${filename}`,bytes);
  const item = {filename,purpose:s.purpose,width,height,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex'),source:s.page,download:url,photographer:s.photographer,creditStatus:s.photographer.startsWith('Pexels')?'Source page reference only':'Source page checked',license:'https://www.pexels.com/license/',licenseCheckedAt:'2026-10-23'};
  const i=manifest.findIndex(x=>x.filename===filename); if(i<0)manifest.push(item);else manifest[i]=item;
 }
 console.log(`Prepared ${s.key}`);
}
for (const item of manifest) {
 const data=await readFile(`${output}/${item.filename}`); const metadata=await sharp(data).metadata();
 if(createHash('sha256').update(data).digest('hex')!==item.sha256)throw new Error(`Hash mismatch: ${item.filename}`);
 item.width=metadata.width; item.height=metadata.height;
 item.purpose ||= 'Homepage, portfolio or editorial contextual photography; see slug mappings';
}
await writeFile(`${output}/manifest.json`,JSON.stringify(manifest,null,2)+'\n');
const tiles=await Promise.all(sources.map(async(s,i)=>({input:await sharp(`${output}/${s.key}-320.webp`).png().toBuffer(),left:i%4*320,top:Math.floor(i/4)*240})));
await sharp({create:{width:1280,height:720,channels:3,background:'#222'}}).composite(tiles).png().toFile('artifacts/photography-release/new-photo-contact-sheet.png');
console.log(`Verified ${manifest.length} assets.`);