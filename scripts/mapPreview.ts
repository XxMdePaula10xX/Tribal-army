// Preview rico do mapa: bordas orgânicas (onduladas) + biomas por região + rios.
// Self-contained: NÃO altera assets/data/mapGeometry.json (só gera map-preview.png).
import { writeFileSync } from 'fs';

import { Delaunay } from 'd3-delaunay';
import sharp from 'sharp';

import mapData from '../assets/data/map.json';

type Pt = [number, number];
const W = 1000;
const H = 1700;

const REGION_CENTERS: Record<string, Pt> = {
  norte: [0.5, 0.09],
  central: [0.31, 0.26],
  ferro: [0.7, 0.25],
  florestas: [0.24, 0.45],
  costa: [0.74, 0.46],
  sombras: [0.5, 0.6],
  estepes: [0.3, 0.8],
  deserto: [0.71, 0.8],
};

// Bioma de cada região.
const BIOME: Record<string, string> = {
  norte: 'neve',
  central: 'grama',
  ferro: 'montanha',
  florestas: 'floresta',
  costa: 'praia',
  sombras: 'pantano',
  estepes: 'savana',
  deserto: 'deserto',
};

const BIOME_BASE: Record<string, string> = {
  neve: '#dfe9f2',
  grama: '#a4cf69',
  montanha: '#b1a288',
  floresta: '#57975087',
  praia: '#e7dcab',
  pantano: '#7f8a57',
  savana: '#cdb866',
  deserto: '#e7c97c',
};
const BIOME_SOLID: Record<string, string> = {
  neve: '#dfe9f2',
  grama: '#a4cf69',
  montanha: '#b1a288',
  floresta: '#5a9b53',
  praia: '#e7dcab',
  pantano: '#7f8a57',
  savana: '#cdb866',
  deserto: '#e7c97c',
};

function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function strHash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
function noise(seed: number) {
  let t = (seed + 0x6d2b79f5) | 0;
  t = Math.imul(t ^ (t >>> 15), 1 | t);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

const territories = mapData.territories as { id: string; name: string; region: string }[];
const order = territories.map((t) => t.id);
const regionOf: Record<string, string> = {};
const nameOf: Record<string, string> = {};
territories.forEach((t) => {
  regionOf[t.id] = t.region;
  nameOf[t.id] = t.name;
});

const rand = mulberry32(20260531);
const points: Pt[] = territories.map((t) => {
  const c = REGION_CENTERS[t.region] ?? [0.5, 0.5];
  const a = rand() * Math.PI * 2;
  const r = (0.05 + rand() * 0.07) * W;
  return [
    Math.max(20, Math.min(W - 20, c[0] * W + Math.cos(a) * r)),
    Math.max(20, Math.min(H - 20, c[1] * H + Math.sin(a) * r * 1.1)),
  ];
});

const delaunay = Delaunay.from(points, (p) => p[0], (p) => p[1]);
const voronoi = delaunay.voronoi([0, 0, W, H]);
const cells: (Pt[] | null)[] = order.map((_, i) => voronoi.cellPolygon(i) as Pt[] | null);

// --- Bordas orgânicas: perturba cada aresta única de forma determinística ---
const k1 = (p: Pt) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`;
const edgeKey = (a: Pt, b: Pt) => {
  const ka = k1(a);
  const kb = k1(b);
  return ka < kb ? `${ka}|${kb}` : `${kb}|${ka}`;
};
const onBounds = (p: Pt) => p[0] <= 0.6 || p[0] >= W - 0.6 || p[1] <= 0.6 || p[1] >= H - 0.6;
const edgeCache = new Map<string, Pt[]>();
function canonEdge(a: Pt, b: Pt): Pt[] {
  const ka = k1(a);
  const kb = k1(b);
  const [A, B] = ka < kb ? [a, b] : [b, a];
  const dx = B[0] - A[0];
  const dy = B[1] - A[1];
  const len = Math.hypot(dx, dy) || 1;
  const pts: Pt[] = [A];
  if (!(onBounds(A) && onBounds(B))) {
    const nx = -dy / len;
    const ny = dx / len;
    const segs = 6;
    const amp = Math.min(len * 0.13, 16);
    const key = edgeKey(a, b);
    for (let k = 1; k < segs; k++) {
      const t = k / segs;
      const off = (noise(strHash(key + ':' + k)) * 2 - 1) * amp;
      pts.push([A[0] + dx * t + nx * off, A[1] + dy * t + ny * off]);
    }
  }
  pts.push(B);
  return pts;
}
function edgePolyline(a: Pt, b: Pt): Pt[] {
  const key = edgeKey(a, b);
  let canon = edgeCache.get(key);
  if (!canon) {
    canon = canonEdge(a, b);
    edgeCache.set(key, canon);
  }
  return k1(a) < k1(b) ? canon : [...canon].reverse();
}

const wavy: Record<string, Pt[]> = {};
order.forEach((id, i) => {
  const cell = cells[i];
  if (!cell) return;
  const ring: Pt[] = [];
  for (let k = 0; k < cell.length - 1; k++) {
    const pl = edgePolyline(cell[k], cell[k + 1]);
    for (let m = 0; m < pl.length - 1; m++) ring.push(pl[m]);
  }
  ring.push(ring[0]);
  wavy[id] = ring;
});

// Bordas de região (arestas onduladas entre regiões diferentes).
function sharedEdge(a: Pt[], b: Pt[]): [Pt, Pt] | null {
  const bk = new Set(b.map(k1));
  const common: Pt[] = [];
  const seen = new Set<string>();
  for (const p of a) {
    const k = k1(p);
    if (bk.has(k) && !seen.has(k)) {
      seen.add(k);
      common.push(p);
    }
  }
  return common.length >= 2 ? [common[0], common[1]] : null;
}
const regionBorders: Pt[][] = [];
order.forEach((id, i) => {
  for (const j of voronoi.neighbors(i)) {
    const nid = order[j];
    if (j > i && regionOf[id] !== regionOf[nid] && cells[i] && cells[j]) {
      const e = sharedEdge(cells[i]!, cells[j]!);
      if (e) regionBorders.push(edgePolyline(e[0], e[1]));
    }
  }
});

// Centroides (do polígono original) para rótulos e rios.
function centroid(poly: Pt[]): Pt {
  let x = 0;
  let y = 0;
  let a = 0;
  for (let i = 0; i < poly.length - 1; i++) {
    const [x0, y0] = poly[i];
    const [x1, y1] = poly[i + 1];
    const c = x0 * y1 - x1 * y0;
    a += c;
    x += (x0 + x1) * c;
    y += (y0 + y1) * c;
  }
  a *= 0.5;
  return Math.abs(a) < 1e-6 ? poly[0] : [x / (6 * a), y / (6 * a)];
}
const centroids: Record<string, Pt> = {};
order.forEach((id, i) => {
  if (cells[i]) centroids[id] = centroid(cells[i]!);
});

// --- Rios: caminham por centroides em direção "para baixo" ---
const adj: Record<string, string[]> = {};
order.forEach((id, i) => {
  adj[id] = [...voronoi.neighbors(i)].map((j) => order[j]);
});
function river(startId: string): Pt[] {
  const path: Pt[] = [centroids[startId]];
  const visited = new Set([startId]);
  let cur = startId;
  for (let step = 0; step < 9; step++) {
    const cands = adj[cur].filter((n) => !visited.has(n) && centroids[n]);
    if (!cands.length) break;
    cands.sort((a, b) => centroids[b][1] - centroids[a][1]); // maior y primeiro
    const next = cands[0];
    if (centroids[next][1] < centroids[cur][1] - 30) break;
    visited.add(next);
    path.push(centroids[next]);
    cur = next;
  }
  return path;
}
function smoothPath(pts: Pt[]): string {
  if (pts.length < 2) return '';
  let d = `M${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i === 0 ? 0 : i - 1];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2 < pts.length ? i + 2 : i + 1];
    const c1: Pt = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2: Pt = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C${c1[0].toFixed(1)},${c1[1].toFixed(1)} ${c2[0].toFixed(1)},${c2[1].toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`;
  }
  return d;
}
const rivers = [river('valdoria'), river('stonehelm'), river('greenbarrow')].filter((r) => r.length >= 3);

// ----------------- SVG -----------------
const toPath = (poly: Pt[]) =>
  poly.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ') + ' Z';

// Padrões de textura por bioma.
function biomePattern(biome: string): string {
  const id = `pat-${biome}`;
  let marks = '';
  const rg = mulberry32(strHash(biome));
  for (let i = 0; i < 10; i++) {
    const x = (rg() * 50).toFixed(1);
    const y = (rg() * 50).toFixed(1);
    if (biome === 'floresta') marks += `<circle cx="${x}" cy="${y}" r="2.4" fill="#2f6b34" fill-opacity="0.55"/>`;
    else if (biome === 'deserto' || biome === 'praia' || biome === 'savana')
      marks += `<path d="M${x},${y} q4,-3 8,0" stroke="#00000022" stroke-width="1.4" fill="none"/>`;
    else if (biome === 'neve') marks += `<circle cx="${x}" cy="${y}" r="1.6" fill="#ffffff" fill-opacity="0.7"/>`;
    else if (biome === 'montanha') marks += `<path d="M${x},${y} l4,-6 l4,6 z" fill="#6b5b46" fill-opacity="0.5"/>`;
    else if (biome === 'pantano') marks += `<circle cx="${x}" cy="${y}" r="2.6" fill="#3f4a2a" fill-opacity="0.5"/>`;
    else marks += `<rect x="${x}" y="${y}" width="1.6" height="4" fill="#3f6b1f" fill-opacity="0.4"/>`; // grama
  }
  return `<pattern id="${id}" width="50" height="50" patternUnits="userSpaceOnUse">${marks}</pattern>`;
}

const defs = `<defs>
  ${Object.keys(BIOME_SOLID).map(biomePattern).join('')}
  <radialGradient id="shade" cx="50%" cy="40%" r="75%">
    <stop offset="0%" stop-color="#ffffff" stop-opacity="0.12"/>
    <stop offset="60%" stop-color="#ffffff" stop-opacity="0"/>
    <stop offset="100%" stop-color="#000000" stop-opacity="0.22"/>
  </radialGradient>
</defs>`;

const baseFills = order
  .filter((id) => wavy[id])
  .map((id) => `<path d="${toPath(wavy[id])}" fill="${BIOME_SOLID[BIOME[regionOf[id]]]}" stroke="#5a4a32" stroke-width="1.2"/>`)
  .join('\n');
const texFills = order
  .filter((id) => wavy[id])
  .map((id) => {
    const b = BIOME[regionOf[id]];
    return `<path d="${toPath(wavy[id])}" fill="url(#pat-${b})"/><path d="${toPath(wavy[id])}" fill="url(#shade)"/>`;
  })
  .join('\n');

const riverPaths = rivers
  .map((r) => {
    const d = smoothPath(r);
    return `<path d="${d}" fill="none" stroke="#2b6fa8" stroke-width="11" stroke-linecap="round" stroke-linejoin="round" opacity="0.85"/><path d="${d}" fill="none" stroke="#5aa6d8" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>`;
  })
  .join('\n');

const borders = regionBorders
  .map((pl) => `<path d="${pl.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ')}" fill="none" stroke="#3a2e1c" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>`)
  .join('\n');

const labels = order
  .filter((id) => centroids[id])
  .map((id) => {
    const c = centroids[id];
    return `<text x="${c[0].toFixed(1)}" y="${c[1].toFixed(1)}" font-size="17" font-family="sans-serif" font-weight="bold" fill="#22324a" text-anchor="middle" dominant-baseline="middle" stroke="#ffffff" stroke-width="0.5" paint-order="stroke">${nameOf[id]}</text>`;
  })
  .join('\n');

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  ${defs}
  <rect width="${W}" height="${H}" fill="#1d6e8c"/>
  ${baseFills}
  ${texFills}
  ${riverPaths}
  ${borders}
  ${labels}
</svg>`;

writeFileSync('map-preview.svg', svg);
sharp(Buffer.from(svg))
  .png()
  .toFile('map-preview.png')
  .then(() => console.log('preview gerado —', rivers.length, 'rios,', regionBorders.length, 'bordas de região'))
  .catch((e) => console.error(e));
