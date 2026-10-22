import { readFile, mkdir, writeFile } from 'node:fs/promises';
const root = new URL('../', import.meta.url);
const escape = value => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
const editorial = await readFile(new URL('src/shared/editorial.ts', root), 'utf8');
const portfolio = await readFile(new URL('src/shared/portfolio.ts', root), 'utf8');
const groups = [
  ['editorial', [...editorial.matchAll(/slug: "([a-z0-9-]+)", title: "([^"]+)"/g)].map(match => [match[1], match[2]])],
  ['concepts', [...portfolio.matchAll(/^ {2}\["([a-z0-9-]+)", "([^"]+)", "([^"]+)"/gm)].map(match => [match[1], match[3]])],
];
for (const [folder, entries] of groups) {
  await mkdir(new URL(`public/images/${folder}/`, root), { recursive: true });
  for (const [index, [slug, title]] of entries.entries()) {
    const label = folder === 'concepts' ? 'ORIGINAL CONCEPT · NOT CLIENT WORK' : 'CODESBOXS EDITORIAL · ORIGINAL ILLUSTRATION';
    const cards = Array.from({ length: 5 }, (_, i) => `<g transform="translate(${100 + i * 190},${300 + ((index + i) % 3) * 32})"><rect width="165" height="220" rx="16" fill="#171b1e" stroke="#947340"/><circle cx="28" cy="35" r="9" fill="#ffb84f"/><path d="M22 75h115M22 100h90M22 125h110" stroke="#6c7172" stroke-width="8"/><path d="M25 190l25-${25 + ((index + i) % 4) * 10} 25 12 25-38 30 18" fill="none" stroke="#ffb84f" stroke-width="5"/></g>`).join('');
    const words = title.split(' '); let first = ''; let second = '';
    for (const word of words) { if ((first + word).length < 35 && !second) first += `${word} `; else second += `${word} `; }
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800" viewBox="0 0 1200 800"><defs><radialGradient id="g"><stop stop-color="#593b22"/><stop offset="1" stop-color="#0b0e10"/></radialGradient></defs><rect width="1200" height="800" fill="url(#g)"/><path d="M0 650h1200M0 700h1200M0 750h1200" stroke="#ffffff" opacity=".06"/><text x="90" y="85" fill="#ffb84f" font-family="Arial,sans-serif" font-size="16" letter-spacing="3">${label}</text><text x="90" y="160" fill="#f8f7f4" font-family="Arial,sans-serif" font-weight="700" font-size="43">${escape(first.trim())}</text><text x="90" y="215" fill="#f8f7f4" font-family="Arial,sans-serif" font-weight="700" font-size="43">${escape(second.trim())}</text>${cards}<text x="90" y="720" fill="#bcb5a8" font-family="Arial,sans-serif" font-size="18">${String(index + 1).padStart(2, '0')} / Design · Engineering · Responsible delivery</text></svg>`;
    await writeFile(new URL(`public/images/${folder}/${slug}.svg`, root), svg);
  }
  console.log(`${folder}: ${entries.length} original local illustrations`);
}