import { mkdir, writeFile } from 'node:fs/promises';
await mkdir('public/images', { recursive: true });
// Original geometry projected and depth-sorted offline. No WebGL runtime.
const metal = `<defs><linearGradient id="metal" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#171512"/><stop offset=".18" stop-color="#c7c4bf"/><stop offset=".36" stop-color="#f5f2ec"/><stop offset=".52" stop-color="#504a40"/><stop offset=".72" stop-color="#c5a46d"/><stop offset=".86" stop-color="#27231d"/><stop offset="1" stop-color="#c7c4bf"/></linearGradient></defs>`;
const shell = (title, body, bg = '#171512') => `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="1000" viewBox="0 0 1200 1000"><title>${title}</title>${metal}<rect width="1200" height="1000" fill="${bg}"/>${body}</svg>`;
function sculpture(phase = 0) {
  const points = [];
  for (let i = 0; i < 420; i++) {
    const t = i / 420 * Math.PI * 2;
    const r = 235 + 54 * Math.cos(3 * t + phase);
    const x = r * Math.cos(2 * t), y = r * Math.sin(2 * t), z = 120 * Math.sin(3 * t + phase);
    const ry = y * .55 - z * .84, rz = y * .84 + z * .55;
    const s = 1050 / (1050 + rz);
    points.push({ x: 600 + x * s * 1.35, y: 480 + ry * s * 1.35, z: rz, size: 37 * s });
  }
  return `<ellipse cx="600" cy="805" rx="270" ry="18" fill="#000" opacity=".25"/>` + points.sort((a,b) => b.z - a.z).map((p) => `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="${p.size.toFixed(1)}" fill="url(#metal)" stroke="#c7c4bf" stroke-opacity=".08"/>`).join('');
}
const product = (mobile = false) => mobile
  ? `<g transform="rotate(-12 600 500)"><rect x="407" y="100" width="386" height="790" rx="62" fill="url(#metal)"/><rect x="420" y="114" width="360" height="762" rx="52" fill="#0b0a09"/><rect x="535" y="133" width="130" height="25" rx="12" fill="#171512"/><text x="457" y="230" fill="#c5a46d" font-family="sans-serif" font-size="15" letter-spacing="4">ATELIER / CONCEPT</text><text x="457" y="305" fill="#f5f2ec" font-family="serif" font-size="49">Less noise.</text><text x="457" y="360" fill="#f5f2ec" font-family="serif" font-size="49">More intention.</text><circle cx="600" cy="530" r="109" fill="none" stroke="url(#metal)" stroke-width="36"/><text x="457" y="750" fill="#a9a39a" font-family="sans-serif" font-size="18">A considered daily experience.</text><path d="M457 797H743" stroke="#504a40"/></g>`
  : `<g transform="translate(95 175) rotate(-5 505 325)"><rect width="1010" height="650" rx="18" fill="url(#metal)"/><rect x="8" y="8" width="994" height="634" rx="12" fill="#f3f0e9"/><rect x="8" y="8" width="190" height="634" rx="12" fill="#171512"/><text x="38" y="64" fill="#f5f2ec" font-family="sans-serif" font-size="23">FORMA.</text>${['Overview','Workspace','Insights','Settings'].map((s,i)=>`<text x="38" y="${140+i*56}" fill="#a9a39a" font-family="sans-serif" font-size="14">${s}</text>`).join('')}<text x="240" y="90" fill="#171512" font-family="serif" font-size="44">A clearer perspective.</text><text x="240" y="126" fill="#6b655c" font-family="sans-serif" font-size="14">PRODUCT EXPLORATION / ORIGINAL CONCEPT</text><rect x="240" y="174" width="710" height="275" fill="#e6e0d5"/><path d="M270 410C350 410 360 290 440 330S550 370 620 260S750 350 920 220" fill="none" stroke="#6b5940" stroke-width="4"/>${[0,1,2].map(i=>`<path d="M${240+i*240} 505H${450+i*240}" stroke="#c7c4bf"/><text x="${240+i*240}" y="542" fill="#171512" font-family="serif" font-size="27">${['Understand','Connect','Evolve'][i]}</text><text x="${240+i*240}" y="575" fill="#6b655c" font-family="sans-serif" font-size="13">DESIGN STUDY / NOT LIVE DATA</text>`).join('')}</g>`;
const architecture = `<g fill="none" stroke="#c7c4bf" stroke-width="1">${Array.from({length:22},(_,i)=>`<path d="M${160+i*16} ${290-i*5}L${590+i*11} ${115+i*7}L${1030-i*5} ${435+i*11}L${580-i*7} ${730+i*5}Z" opacity="${.25+i*.025}"/>`).join('')}</g><path d="M160 840H1040" stroke="#504a40"/><text x="160" y="887" fill="#c5a46d" font-family="sans-serif" font-size="14" letter-spacing="5">ARCHITECTURE / SYSTEMS / PRECISION</text>`;
for (const [name, title, body, bg] of [
  ['hero','Original polished titanium trefoil sculpture',sculpture(), '#0b0a09'],
  ['ai','Original metallic intelligence study',sculpture(1.1), '#171512'],
  ['engineering','Original architectural software systems study',architecture, '#171512'],
  ['cloud','Original infrastructure geometry',architecture, '#0b0a09'],
  ['dashboard','Original Forma software product concept, not client work',product(), '#d9d2c5'],
  ['mobile','Original Atelier mobile product concept, not client work',product(true), '#bdb4a4'],
  ['security','Original titanium security sculpture',sculpture(2), '#171512'],
  ['team','Original collaboration architecture, not team photography',architecture, '#171512'],
]) await writeFile(`public/images/${name}.svg`, shell(title,body,bg));
await writeFile('public/images/favicon.svg','<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="12" fill="#0b0a09"/><path d="M42 17H24L14 32l10 15h18M49 17 39 32l10 15" fill="none" stroke="#c5a46d" stroke-width="4"/></svg>');
console.log('Generated 9 original monochrome metallic and product studies.');