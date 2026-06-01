// Pré-computa a geometria do mapa para assets/data/mapGeometry.json.
// Bordas orgânicas, rios com largura variável (um deles corta a adjacência),
// e bordas de região como polilinhas. Rode: npx tsx scripts/genMapGeometry.ts
import { writeFileSync } from 'fs';

import { Delaunay } from 'd3-delaunay';

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
const r1 = (n: number) => Math.round(n * 10) / 10;
const rp = (p: Pt): Pt => [r1(p[0]), r1(p[1])];

const territories = mapData.territories as { id: string; region: string }[];
const order = territories.map((t) => t.id);
const regionOf: Record<string, string> = {};
territories.forEach((t) => (regionOf[t.id] = t.region));

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

// ---- Bordas onduladas ----
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

const polygons: Record<string, Pt[]> = {};
order.forEach((id, i) => {
  const cell = cells[i];
  if (!cell) return;
  const ring: Pt[] = [];
  for (let k = 0; k < cell.length - 1; k++) {
    const pl = edgePolyline(cell[k], cell[k + 1]);
    for (let m = 0; m < pl.length - 1; m++) ring.push(rp(pl[m]));
  }
  ring.push(ring[0]);
  polygons[id] = ring;
});

function centroidOf(poly: Pt[]): Pt {
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
  if (cells[i]) centroids[id] = rp(centroidOf(cells[i]!));
});

// Adjacência (Voronoi) — pode ser podada pelo rio-barreira.
const adjacency: Record<string, string[]> = {};
order.forEach((id, i) => {
  adjacency[id] = [...voronoi.neighbors(i)].map((j) => order[j]);
});

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

// ---- Rios ----
function riverSpine(startId: string): string[] {
  const path = [startId];
  const visited = new Set([startId]);
  let cur = startId;
  for (let step = 0; step < 9; step++) {
    const cands = adjacency[cur].filter((n) => !visited.has(n) && centroids[n]);
    if (!cands.length) break;
    cands.sort((a, b) => centroids[b][1] - centroids[a][1]);
    const next = cands[0];
    if (centroids[next][1] < centroids[cur][1] - 30) break;
    visited.add(next);
    path.push(next);
    cur = next;
  }
  return path;
}
function sampleCatmull(pts: Pt[], perSeg = 12): Pt[] {
  if (pts.length < 2) return pts;
  const out: Pt[] = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i === 0 ? 0 : i - 1];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2 < pts.length ? i + 2 : i + 1];
    for (let s = 0; s < perSeg; s++) {
      const t = s / perSeg;
      const t2 = t * t;
      const t3 = t2 * t;
      const x =
        0.5 *
        (2 * p1[0] +
          (-p0[0] + p2[0]) * t +
          (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 +
          (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3);
      const y =
        0.5 *
        (2 * p1[1] +
          (-p0[1] + p2[1]) * t +
          (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 +
          (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3);
      out.push([x, y]);
    }
  }
  out.push(pts[pts.length - 1]);
  return out;
}
/** Constrói uma "fita" de largura variável ao redor de uma linha central. */
function ribbon(center: Pt[], seed: number, wide: boolean): { ribbon: Pt[]; spine: Pt[] } {
  const n = center.length;
  const left: Pt[] = [];
  const right: Pt[] = [];
  for (let i = 0; i < n; i++) {
    const a = center[Math.max(0, i - 1)];
    const b = center[Math.min(n - 1, i + 1)];
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len;
    const ny = dx / len;
    const taper = Math.sin((i / (n - 1)) * Math.PI); // estreito nas pontas
    const base = wide ? 16 : 9;
    const varw =
      base * (0.45 + 0.9 * taper) +
      5 * Math.sin(i * 0.45 + seed) +
      4 * (noise(seed * 131 + i) - 0.5) * 2;
    const hw = Math.max(3, varw) * (wide ? 1.5 : 1);
    left.push([center[i][0] + nx * hw, center[i][1] + ny * hw]);
    right.push([center[i][0] - nx * hw, center[i][1] - ny * hw]);
  }
  const poly = [...left, ...right.reverse()];
  poly.push(poly[0]);
  return { ribbon: poly.map(rp), spine: center.map(rp) };
}

function segIntersect(p1: Pt, p2: Pt, p3: Pt, p4: Pt): boolean {
  const d = (a: Pt, b: Pt, c: Pt) => (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
  const d1 = d(p3, p4, p1);
  const d2 = d(p3, p4, p2);
  const d3 = d(p1, p2, p3);
  const d4 = d(p1, p2, p4);
  return ((d1 > 0) !== (d2 > 0)) && ((d3 > 0) !== (d4 > 0));
}

function connected(adj: Record<string, string[]>): boolean {
  const seen = new Set<string>([order[0]]);
  const queue = [order[0]];
  while (queue.length) {
    const cur = queue.shift()!;
    for (const n of adj[cur]) if (!seen.has(n)) {
      seen.add(n);
      queue.push(n);
    }
  }
  return seen.size === order.length;
}

const spines = [riverSpine('valdoria'), riverSpine('stonehelm'), riverSpine('greenbarrow')].filter(
  (p) => p.length >= 3
);

// Rio 0 = barreira: poda adjacências que ele cruza (se manter o mapa conexo).
const barrierSpineIds = spines[0];
const barrierCenter = sampleCatmull(barrierSpineIds.map((id) => centroids[id]));
let severed = 0;
for (let i = 0; i < order.length; i++) {
  const ci = cells[i];
  if (!ci) continue;
  for (const j of voronoi.neighbors(i)) {
    if (j <= i) continue;
    const cj = cells[j];
    if (!cj) continue;
    const e = sharedEdge(ci, cj);
    if (!e) continue;
    // o rio-barreira cruza essa fronteira?
    let crosses = false;
    for (let s = 0; s < barrierCenter.length - 1; s++) {
      if (segIntersect(barrierCenter[s], barrierCenter[s + 1], e[0], e[1])) {
        crosses = true;
        break;
      }
    }
    if (!crosses) continue;
    const A = order[i];
    const B = order[j];
    // tenta podar; reverte se desconectar.
    const backupA = adjacency[A];
    const backupB = adjacency[B];
    adjacency[A] = adjacency[A].filter((x) => x !== B);
    adjacency[B] = adjacency[B].filter((x) => x !== A);
    if (connected(adjacency)) severed++;
    else {
      adjacency[A] = backupA;
      adjacency[B] = backupB;
    }
  }
}

const rivers = spines.map((ids, idx) => {
  const center = sampleCatmull(ids.map((id) => centroids[id]));
  return ribbon(center, strHash('river' + idx), idx === 0);
});

const out = { width: W, height: H, order, polygons, centroids, adjacency, regionBorders: [] as Pt[][], rivers };

// Bordas de região (depois da poda, mas independem dela).
order.forEach((id, i) => {
  for (const j of voronoi.neighbors(i)) {
    const nid = order[j];
    if (j > i && regionOf[id] !== regionOf[nid] && cells[i] && cells[j]) {
      const e = sharedEdge(cells[i]!, cells[j]!);
      if (e) out.regionBorders.push(edgePolyline(e[0], e[1]).map(rp));
    }
  }
});

writeFileSync('assets/data/mapGeometry.json', JSON.stringify(out));

const counts = order.map((id) => adjacency[id]?.length || 0);
console.log('mapGeometry.json:', order.length, 'territórios,', rivers.length, 'rios,', severed, 'adjacências cortadas pelo rio');
console.log('conexo:', connected(adjacency), '| vizinhos min/médio/max:', Math.min(...counts), (counts.reduce((a, b) => a + b, 0) / counts.length).toFixed(1), Math.max(...counts));
