import { readFile, writeFile } from 'node:fs/promises';
const path = new URL('../src/worker/index.tsx', import.meta.url);
let text = await readFile(path, 'utf8');
if (!text.includes('/images/hero.svg')) throw new Error('Expected existing SVG social preview reference');
text = text.replace('/images/hero.svg', '/images/social-preview.png');
text = text.replace('<meta name="twitter:card"', '<meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta property="og:image:alt" content="CodesBoxs — We Build Intelligent Digital Experiences"><meta name="twitter:image" content="${escape(c.env.PUBLIC_SITE_URL)}/images/social-preview.png"><meta name="twitter:card"');
await writeFile(path, text);