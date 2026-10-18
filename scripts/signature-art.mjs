import { writeFile } from 'node:fs/promises';

// Original parametric ribbon sculpture: projected, depth-sorted surface geometry.
// No third-party assets, remote images, WebGL or runtime rendering dependency.
const faces = [];
const project = (u, v) => {
  const r = 235 + v * Math.cos(u * 1.5);
  const x = r * Math.cos(u);
  const y = r * Math.sin(u);
  const z = v * Math.sin(u * 1.5);
  const yy = y * .53 - z * .85;
  const zz = y * .85 + z * .53;
  const xx = x * .94 + zz * .34;
  const depth = -x * .34 + zz * .94;
  return [600 + xx * 1.28, 475 + yy * 1.28, depth];
};
for (let i = 0; i < 320; i++) {
  const u = i / 320 * Math.PI * 2;
  for (let j = 0; j < 20; j++) {
    const v = -95 + j * 9.5;
    const points = [project(u, v), project(u + Math.PI / 160, v), project(u + Math.PI / 160, v + 9.5), project(u, v + 9.5)];
    const light = Math.max(0, Math.min(1, .45 + .3 * Math.sin(u * 2.5 + j * .08) + .23 * Math.cos(u * 5 - j * .13)));
    const channel = Math.round(36 + light * 200);
    const color = `rgb(${channel + 5},${channel + 3},${channel})`;
    faces.push({ depth: points.reduce((sum, p) => sum + p[2], 0) / 4, path: `<path d="M${points.map(p => `${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join('L')}Z" fill="${color}" stroke="${color}" stroke-width=".55"/>` });
  }
}
faces.sort((a, b) => a.depth - b.depth);
await writeFile('public/images/hero.svg', `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="1000" viewBox="0 0 1200 1000"><title>CodesBoxs original titanium ribbon sculpture</title><defs><radialGradient id="ambient"><stop stop-color="#292722"/><stop offset="1" stop-color="#10100f"/></radialGradient><radialGradient id="shadow"><stop stop-color="#000" stop-opacity=".5"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient></defs><rect width="1200" height="1000" fill="url(#ambient)"/><ellipse cx="600" cy="795" rx="340" ry="55" fill="url(#shadow)"/>${faces.map(face => face.path).join('')}</svg>`);
console.log(`Original sculpture generated: ${faces.length} depth-sorted faces.`);