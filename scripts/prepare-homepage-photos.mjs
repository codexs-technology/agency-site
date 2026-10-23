import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { Buffer } from 'node:buffer';
import { createHash } from 'node:crypto';
import sharp from 'sharp';
import { fileURLToPath } from 'node:url';
const sources = JSON.parse(await readFile(new URL('./homepage-photo-sources.json', import.meta.url), 'utf8'));
const output = new URL('../public/images/photography/', import.meta.url);
const review = new URL('../artifacts/homepage-images/', import.meta.url);
await mkdir(output, { recursive: true }); await mkdir(review, { recursive: true });
const manifest = [];
for (const source of sources) {
  if (process.argv.includes('--saas-only') && source.key !== 'saas-engineering-workspace') continue;
  const url = `https://images.pexels.com/photos/${source.id}/pexels-photo-${source.id}.jpeg?auto=compress&cs=tinysrgb&w=1800`;
  const response = await fetch(url, { signal: AbortSignal.timeout(45000) });
  if (!response.ok) throw new Error(`${source.key}: HTTP ${response.status}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  const metadata = await sharp(bytes).metadata();
  if (!metadata.width || metadata.width < 960) throw new Error(`${source.key}: insufficient image size`);
  for (const width of [320, 640, 960]) {
    const image = await sharp(bytes).rotate().resize(width, Math.round(width * 2 / 3), { fit: 'cover', position: 'centre' }).webp({ quality: 80, effort: 5 }).toBuffer();
    const filename = `${source.key}-${width}.webp`;
    await writeFile(new URL(filename, output), image);
    manifest.push({ filename, bytes: image.length, sha256: createHash('sha256').update(image).digest('hex'), source: source.page, download: url, photographer: source.photographer, license: 'https://www.pexels.com/license/' });
  }
  console.log(`Prepared ${source.key}`);
}
const existing = process.argv.includes('--saas-only') ? JSON.parse(await readFile(new URL('manifest.json', output), 'utf8')).filter(item => !item.filename.startsWith('saas-engineering-workspace-')) : [];
await writeFile(new URL('manifest.json', output), JSON.stringify([...existing, ...manifest], null, 2));
const tiles = await Promise.all(sources.map(async (source, index) => ({ input: await sharp(fileURLToPath(new URL(`${source.key}-320.webp`, output))).resize(320, 210).toBuffer(), left: (index % 4) * 320, top: Math.floor(index / 4) * 240 })));
await sharp({ create: { width: 1280, height: Math.ceil(sources.length / 4) * 240, channels: 3, background: '#222222' } }).composite(tiles).png().toFile(fileURLToPath(new URL('photo-contact-sheet.png', review)));
console.log(`Saved ${manifest.length} WebP variants; contact sheet order matches source JSON.`);