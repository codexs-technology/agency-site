import { writeFile } from 'node:fs/promises';
import { Buffer } from 'node:buffer';
const source = 'https://images.unsplash.com/photo-1497366754035-f200968a6e72?fm=webp&w=1200&h=800&fit=crop&q=80';
const response = await fetch(source);
if (!response.ok) throw new Error(`Stock image request failed: ${response.status}`);
const bytes = Buffer.from(await response.arrayBuffer());
if (bytes.toString('ascii', 0, 4) !== 'RIFF' || bytes.toString('ascii', 8, 12) !== 'WEBP') throw new Error('Expected a WebP file');
await writeFile(new URL('../public/images/workspace.webp', import.meta.url), bytes);
console.log(`Downloaded optimized workspace image: ${bytes.length} bytes. Illustrative stock; not company premises.`);