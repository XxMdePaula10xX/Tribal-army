// Preview fiel ao jogo: lê assets/data/mapGeometry.json e renderiza como o app
// (biomas + textura + rios em fita + rótulos de região + tinta de dono + brasão).
import { writeFileSync } from 'fs';

import sharp from 'sharp';

import mapData from '../assets/data/map.json';
import {
  BIOME_COLORS,
  BIOME_MARKS,
  BIOMES,
  MAP_GEOMETRY,
  MAP_H,
  MAP_W,
  REGION_LABELS,
  type Biome,
  type Pt,
} from '../src/data/mapGeometry';

const { polygons, centroids, regionBorders, rivers, order } = MAP_GEOMETRY;
const regionOf: Record<string, string> = Object.fromEntries(
  (mapData.territories as { id: string; region: string }[]).map((t) => [t.id, t.region])
);
const biomeOf = (id: string): Biome => BIOMES[regionOf[id]];

const line = (poly: Pt[]) => poly.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
const ring = (poly: Pt[]) => line(poly) + ' Z';

function strHash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function marks(b: Biome): string {
  return BIOME_MARKS[b]
    .map((m) => {
      const { x, y } = m;
      if (b === 'floresta') return `<circle cx="${x}" cy="${y}" r="2.4" fill="#2f6b34" fill-opacity="0.55"/>`;
      if (b === 'neve') return `<circle cx="${x}" cy="${y}" r="1.6" fill="#fff" fill-opacity="0.7"/>`;
      if (b === 'pantano') return `<circle cx="${x}" cy="${y}" r="2.6" fill="#3f4a2a" fill-opacity="0.5"/>`;
      if (b === 'montanha') return `<path d="M${x},${y} l4,-6 l4,6 z" fill="#6b5b46" fill-opacity="0.5"/>`;
      if (b === 'grama') return `<rect x="${x}" y="${y}" width="1.6" height="4" fill="#3f6b1f" fill-opacity="0.4"/>`;
      return `<path d="M${x},${y} q4,-3 8,0" stroke="#00000022" stroke-width="1.4" fill="none"/>`;
    })
    .join('');
}
const biomes = Array.from(new Set(order.map(biomeOf)));
const defs = `<defs>${biomes
  .map((b) => `<pattern id="pat-${b}" width="50" height="50" patternUnits="userSpaceOnUse">${marks(b)}</pattern>`)
  .join('')}</defs>`;

const PALETTE = ['#e74c3c', '#3498db', '#2ecc71', '#f1c40f', '#9b59b6', '#6b6b6b'];
const owner = (id: string) => PALETTE[strHash('own' + id) % PALETTE.length];

const fills = order.filter((id) => polygons[id]).map((id) => `<path d="${ring(polygons[id])}" fill="${BIOME_COLORS[biomeOf(id)]}" stroke="#5a4a32" stroke-width="1.2"/>`).join('\n');
const tex = order.filter((id) => polygons[id]).map((id) => `<path d="${ring(polygons[id])}" fill="url(#pat-${biomeOf(id)})"/>`).join('\n');
const riverPaths = rivers
  .map((r) => `<path d="${ring(r.ribbon)}" fill="#2b6fa8" fill-opacity="0.92"/><path d="${line(r.spine)}" fill="none" stroke="#7cc0e8" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>`)
  .join('\n');
const borders = regionBorders.map((pl) => `<path d="${line(pl)}" fill="none" stroke="#3a2e1c" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>`).join('\n');
const regionLabels = REGION_LABELS.map((r) => `<text x="${r.x.toFixed(1)}" y="${r.y.toFixed(1)}" font-size="46" font-family="sans-serif" font-weight="bold" fill="#000" fill-opacity="0.22" text-anchor="middle">${r.name.toUpperCase()}</text>`).join('\n');
const tints = order.filter((id) => polygons[id]).map((id) => `<path d="${ring(polygons[id])}" fill="${owner(id)}" fill-opacity="0.3"/>`).join('\n');
const badges = order
  .filter((id) => centroids[id])
  .map((id) => {
    const c = centroids[id];
    const troops = 1 + (strHash('t' + id) % 9);
    return `<circle cx="${c[0].toFixed(1)}" cy="${c[1].toFixed(1)}" r="15" fill="${owner(id)}" stroke="#0f0b07" stroke-width="1.5"/><text x="${c[0].toFixed(1)}" y="${(c[1] + 6).toFixed(1)}" font-size="18" font-family="sans-serif" font-weight="bold" fill="#fff" text-anchor="middle" stroke="#000" stroke-width="0.5" paint-order="stroke">${troops}</text>`;
  })
  .join('\n');

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${MAP_W}" height="${MAP_H}" viewBox="0 0 ${MAP_W} ${MAP_H}">
  ${defs}
  <rect width="${MAP_W}" height="${MAP_H}" fill="#1d6e8c"/>
  ${fills}
  ${tex}
  ${riverPaths}
  ${borders}
  ${regionLabels}
  ${tints}
  ${badges}
</svg>`;

writeFileSync('map-preview.svg', svg);
sharp(Buffer.from(svg)).png().toFile('map-preview.png').then(() => console.log('preview gerado')).catch((e) => console.error(e));
