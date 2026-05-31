// Gera um PNG de preview do mapa Voronoi (colorido por região) para revisão.
import { writeFileSync } from 'fs';

import sharp from 'sharp';

import { MAP } from '../src/data/map';
import {
  MAP_GEOMETRY,
  MAP_H,
  MAP_W,
  REGION_COLORS,
  type Pt,
} from '../src/components/mapGeometry';

function path(poly: Pt[]): string {
  return poly.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ') + ' Z';
}

const { polygons, centroids, adjacency, order } = MAP_GEOMETRY;

const cells = order
  .map((id) => {
    if (!polygons[id]) return '';
    const region = MAP[id].region;
    const fill = REGION_COLORS[region] ?? '#888';
    return `<path d="${path(polygons[id])}" fill="${fill}" fill-opacity="0.82" stroke="#1a1410" stroke-width="2"/>`;
  })
  .join('\n');

// Bordas grossas entre regiões diferentes.
const regionBorders = order
  .flatMap((id) =>
    (adjacency[id] || [])
      .filter((n) => id < n && MAP[id].region !== MAP[n].region)
      .map((n) => {
        const a = centroids[id];
        const b = centroids[n];
        return `<line x1="${a[0].toFixed(1)}" y1="${a[1].toFixed(1)}" x2="${b[0].toFixed(1)}" y2="${b[1].toFixed(1)}" stroke="#1a1410" stroke-width="0" />`;
      })
  )
  .join('\n');

const labels = order
  .map((id) => {
    const c = centroids[id];
    if (!c) return '';
    return `<text x="${c[0].toFixed(1)}" y="${c[1].toFixed(1)}" font-size="20" font-family="sans-serif" fill="#1a1410" text-anchor="middle" dominant-baseline="middle">${MAP[id].name}</text>`;
  })
  .join('\n');

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${MAP_W}" height="${MAP_H}" viewBox="0 0 ${MAP_W} ${MAP_H}">
  <rect width="${MAP_W}" height="${MAP_H}" fill="#0f1620"/>
  ${cells}
  ${regionBorders}
  ${labels}
</svg>`;

writeFileSync('map-preview.svg', svg);

sharp(Buffer.from(svg))
  .png()
  .toFile('map-preview.png')
  .then(() => console.log('map-preview.png gerado'))
  .catch((e) => console.error(e));

// Diagnóstico: distribuição de adjacências e tamanho.
const counts = order.map((id) => (adjacency[id] || []).length);
console.log('territórios:', order.length);
console.log('vizinhos min/médio/max:', Math.min(...counts), (counts.reduce((a, b) => a + b, 0) / counts.length).toFixed(1), Math.max(...counts));
