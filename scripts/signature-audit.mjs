import { readFile, readdir, writeFile, mkdir } from 'node:fs/promises';
const paths = ['src/web/styles.css', 'src/web/luxury.css', 'src/web/signature.css', ...(await readdir('public/images')).filter(name => name.endsWith('.svg')).map(name => `public/images/${name}`)];
const findings = [];
for (const path of paths) {
  const text = await readFile(path, 'utf8');
  const colors = [...new Set(text.match(/#[\da-f]{6}\b/gi) || [])];
  for (const color of colors) {
    const [r, g, b] = [1, 3, 5].map(offset => parseInt(color.slice(offset, offset + 2), 16));
    if (b > r + 15 && b > g + 8) findings.push({ path, color });
  }
}
await mkdir('reports', { recursive: true });
await writeFile('reports/signature-color-audit.json', JSON.stringify({ checkedFiles: paths, blueLeaningColors: findings, note: 'Source hex-color audit only; rendered pixel, third-party widget and raster image audit not implied.' }, null, 2));
console.log(JSON.stringify({ files: paths.length, blueLeaningColors: findings }, null, 2));
if (findings.length) process.exitCode = 1;