// Pré-computa a geometria do mapa (Voronoi) para assets/data/mapGeometry.json.
// Rode com: npx tsx scripts/genMapGeometry.ts
// O app e os testes apenas LEEM esse JSON (sem d3-delaunay em runtime).
import { writeFileSync } from 'fs';

import { Delaunay } from 'd3-delaunay';

import mapData from '../assets/data/map.json';

type Pt = [number, number];

const MAP_W = 1000;
const MAP_H = 1700;

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

function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function polygonCentroid(poly: Pt[]): Pt {
  let x = 0;
  let y = 0;
  let a = 0;
  for (let i = 0; i < poly.length - 1; i++) {
    const [x0, y0] = poly[i];
    const [x1, y1] = poly[i + 1];
    const cross = x0 * y1 - x1 * y0;
    a += cross;
    x += (x0 + x1) * cross;
    y += (y0 + y1) * cross;
  }
  a *= 0.5;
  if (Math.abs(a) < 1e-6) return poly[0];
  return [x / (6 * a), y / (6 * a)];
}

const round = (p: Pt): Pt => [Math.round(p[0] * 10) / 10, Math.round(p[1] * 10) / 10];
const key = (p: Pt) => `${Math.round(p[0])},${Math.round(p[1])}`;

function sharedEdge(a: Pt[], b: Pt[]): [Pt, Pt] | null {
  const bKeys = new Set(b.map(key));
  const common: Pt[] = [];
  const seen = new Set<string>();
  for (const p of a) {
    const k = key(p);
    if (bKeys.has(k) && !seen.has(k)) {
      seen.add(k);
      common.push(p);
    }
  }
  return common.length >= 2 ? [common[0], common[1]] : null;
}

const territories = mapData.territories as { id: string; region: string }[];
const order = territories.map((t) => t.id);
const regionOf: Record<string, string> = {};
territories.forEach((t) => (regionOf[t.id] = t.region));

const rand = mulberry32(20260531);
const points: Pt[] = territories.map((t) => {
  const center = REGION_CENTERS[t.region] ?? [0.5, 0.5];
  const angle = rand() * Math.PI * 2;
  const radius = (0.05 + rand() * 0.07) * MAP_W;
  const x = center[0] * MAP_W + Math.cos(angle) * radius;
  const y = center[1] * MAP_H + Math.sin(angle) * radius * 1.1;
  return [Math.max(20, Math.min(MAP_W - 20, x)), Math.max(20, Math.min(MAP_H - 20, y))];
});

const delaunay = Delaunay.from(
  points,
  (p) => p[0],
  (p) => p[1]
);
const voronoi = delaunay.voronoi([0, 0, MAP_W, MAP_H]);

const polygons: Record<string, Pt[]> = {};
const centroids: Record<string, Pt> = {};
const adjacency: Record<string, string[]> = {};

order.forEach((id, i) => {
  const cell = voronoi.cellPolygon(i) as Pt[] | null;
  if (!cell) return;
  polygons[id] = cell.map(round);
  centroids[id] = round(polygonCentroid(cell));
});

const regionBorders: [Pt, Pt][] = [];
order.forEach((id, i) => {
  const neighbors: string[] = [];
  for (const j of voronoi.neighbors(i)) {
    const nid = order[j];
    neighbors.push(nid);
    if (j > i && regionOf[id] !== regionOf[nid] && polygons[id] && polygons[nid]) {
      const edge = sharedEdge(polygons[id], polygons[nid]);
      if (edge) regionBorders.push([round(edge[0]), round(edge[1])]);
    }
  }
  adjacency[id] = neighbors;
});

const out = { width: MAP_W, height: MAP_H, order, polygons, centroids, adjacency, regionBorders };
writeFileSync('assets/data/mapGeometry.json', JSON.stringify(out));

const counts = order.map((id) => adjacency[id]?.length || 0);
console.log('mapGeometry.json gerado:', order.length, 'territórios,', regionBorders.length, 'arestas de região');
console.log('vizinhos min/médio/max:', Math.min(...counts), (counts.reduce((a, b) => a + b, 0) / counts.length).toFixed(1), Math.max(...counts));
