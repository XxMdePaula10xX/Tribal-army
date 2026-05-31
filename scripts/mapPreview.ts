// Preview do mapa com textura (grain + sombreamento + bordas de região).
import { writeFileSync } from 'fs';

import sharp from 'sharp';

import { MAP } from '../src/data/map';
import {
  MAP_GEOMETRY,
  MAP_H,
  MAP_W,
  REGION_COLORS,
  type Pt,
} from '../src/data/mapGeometry';

function path(poly: Pt[]): string {
  return (
    poly.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ') +
    ' Z'
  );
}

const { polygons, centroids, regionBorders, order } = MAP_GEOMETRY;

// --- Grain (textura de campo): tile de pontos claros/escuros ---
let s = 1234567;
const rnd = () => ((s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
let dots = '';
for (let i = 0; i < 22; i++) {
  const x = (rnd() * 40).toFixed(1);
  const y = (rnd() * 40).toFixed(1);
  const r = (0.6 + rnd() * 1.1).toFixed(2);
  const dark = rnd() > 0.5;
  dots += `<circle cx="${x}" cy="${y}" r="${r}" fill="${dark ? '#000' : '#fff'}" fill-opacity="${dark ? 0.18 : 0.14}"/>`;
}

const defs = `
<defs>
  <pattern id="grain" width="40" height="40" patternUnits="userSpaceOnUse">${dots}</pattern>
  <radialGradient id="shade" cx="50%" cy="38%" r="75%">
    <stop offset="0%" stop-color="#ffffff" stop-opacity="0.16"/>
    <stop offset="55%" stop-color="#ffffff" stop-opacity="0"/>
    <stop offset="100%" stop-color="#000000" stop-opacity="0.26"/>
  </radialGradient>
</defs>`;

const fills = order
  .filter((id) => polygons[id])
  .map((id) => {
    const fill = REGION_COLORS[MAP[id].region] ?? '#888';
    return `<path d="${path(polygons[id])}" fill="${fill}" fill-opacity="0.85" stroke="#0f0b07" stroke-width="1.5"/>`;
  })
  .join('\n');

// Camadas de textura por célula (grain + sombreamento radial).
const textures = order
  .filter((id) => polygons[id])
  .map((id) => {
    const d = path(polygons[id]);
    return `<path d="${d}" fill="url(#grain)"/><path d="${d}" fill="url(#shade)"/>`;
  })
  .join('\n');

const borders = regionBorders
  .map(
    ([a, b]) =>
      `<line x1="${a[0].toFixed(1)}" y1="${a[1].toFixed(1)}" x2="${b[0].toFixed(1)}" y2="${b[1].toFixed(1)}" stroke="#0f0b07" stroke-width="6" stroke-linecap="round"/>`
  )
  .join('\n');

const labels = order
  .filter((id) => centroids[id])
  .map((id) => {
    const c = centroids[id];
    return `<text x="${c[0].toFixed(1)}" y="${c[1].toFixed(1)}" font-size="19" font-family="sans-serif" font-weight="bold" fill="#11223a" text-anchor="middle" dominant-baseline="middle">${MAP[id].name}</text>`;
  })
  .join('\n');

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${MAP_W}" height="${MAP_H}" viewBox="0 0 ${MAP_W} ${MAP_H}">
  ${defs}
  <rect width="${MAP_W}" height="${MAP_H}" fill="#0f1620"/>
  ${fills}
  ${textures}
  ${borders}
  ${labels}
</svg>`;

writeFileSync('map-preview.svg', svg);
sharp(Buffer.from(svg))
  .png()
  .toFile('map-preview.png')
  .then(() => console.log('map-preview.png gerado —', regionBorders.length, 'arestas de borda de região'))
  .catch((e) => console.error(e));
