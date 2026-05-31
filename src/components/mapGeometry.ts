import { Delaunay } from 'd3-delaunay';

import { MAP_DATA, REGIONS } from '@/data/map';

// ============================================================
// GEOMETRIA DO MAPA — territórios como polígonos (Voronoi)
// Gera formatos/tamanhos variados, agrupados por região, e
// deriva a adjacência de quais células se tocam. Determinístico.
// ============================================================

/** Espaço virtual do mapa (retrato). Zoom/pan cuidam do ajuste à tela. */
export const MAP_W = 1000;
export const MAP_H = 1700;

export type Pt = [number, number];

// Centro de cada região no espaço normalizado (0..1). Define a "geografia".
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

export const REGION_COLORS: Record<string, string> = {
  norte: '#5aa9e6',
  central: '#d8a13a',
  ferro: '#9aa0a6',
  florestas: '#4f9d5d',
  costa: '#3fbfb2',
  sombras: '#9b6fc0',
  estepes: '#c98a4b',
  deserto: '#e6c35a',
};

/** PRNG determinístico (mulberry32). */
function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface MapGeometry {
  polygons: Record<string, Pt[]>;
  centroids: Record<string, Pt>;
  adjacency: Record<string, string[]>;
  /** Arestas compartilhadas entre territórios de regiões diferentes. */
  regionBorders: [Pt, Pt][];
  order: string[];
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

const key = (p: Pt) => `${Math.round(p[0])},${Math.round(p[1])}`;

/** Encontra a aresta (2 vértices) compartilhada por dois polígonos vizinhos. */
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

function build(): MapGeometry {
  const rand = mulberry32(20260531);

  // Seeds: cada território perto do centro da sua região, com jitter.
  const order = MAP_DATA.map((t) => t.id);
  const points: Pt[] = MAP_DATA.map((t) => {
    const center = REGION_CENTERS[t.region] ?? [0.5, 0.5];
    const angle = rand() * Math.PI * 2;
    const radius = (0.05 + rand() * 0.07) * MAP_W; // dispersão dentro da região
    const x = center[0] * MAP_W + Math.cos(angle) * radius;
    const y = center[1] * MAP_H + Math.sin(angle) * radius * 1.1;
    return [
      Math.max(20, Math.min(MAP_W - 20, x)),
      Math.max(20, Math.min(MAP_H - 20, y)),
    ];
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
    polygons[id] = cell;
    centroids[id] = polygonCentroid(cell);
  });

  const regionOf: Record<string, string> = {};
  MAP_DATA.forEach((t) => (regionOf[t.id] = t.region));

  const regionBorders: [Pt, Pt][] = [];

  order.forEach((id, i) => {
    const neighbors: string[] = [];
    for (const j of voronoi.neighbors(i)) {
      const nid = order[j];
      neighbors.push(nid);
      if (j > i && regionOf[id] !== regionOf[nid] && polygons[id] && polygons[nid]) {
        const edge = sharedEdge(polygons[id], polygons[nid]);
        if (edge) regionBorders.push(edge);
      }
    }
    adjacency[id] = neighbors;
  });

  return { polygons, centroids, adjacency, regionBorders, order };
}

export const MAP_GEOMETRY: MapGeometry = build();
