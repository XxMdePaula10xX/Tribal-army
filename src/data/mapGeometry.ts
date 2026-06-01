import geo from '../../assets/data/mapGeometry.json';
import mapData from '../../assets/data/map.json';

// ============================================================
// GEOMETRIA DO MAPA — dados pré-computados (Voronoi + bordas
// onduladas + rios). Gerado por scripts/genMapGeometry.ts.
// O app só lê este JSON. É a fonte da adjacência do jogo.
// ============================================================

export type Pt = [number, number];

export interface River {
  ribbon: Pt[];
  spine: Pt[];
}

interface MapGeometry {
  width: number;
  height: number;
  order: string[];
  polygons: Record<string, Pt[]>;
  centroids: Record<string, Pt>;
  adjacency: Record<string, string[]>;
  regionBorders: Pt[][];
  rivers: River[];
}

export const MAP_GEOMETRY = geo as unknown as MapGeometry;
export const MAP_W = MAP_GEOMETRY.width;
export const MAP_H = MAP_GEOMETRY.height;

// ----- Biomas por região -----

export type Biome =
  | 'neve'
  | 'grama'
  | 'montanha'
  | 'floresta'
  | 'praia'
  | 'pantano'
  | 'savana'
  | 'deserto';

export const BIOMES: Record<string, Biome> = {
  norte: 'neve',
  central: 'grama',
  ferro: 'montanha',
  florestas: 'floresta',
  costa: 'praia',
  sombras: 'pantano',
  estepes: 'savana',
  deserto: 'deserto',
};

export const BIOME_COLORS: Record<Biome, string> = {
  neve: '#dfe9f2',
  grama: '#a4cf69',
  montanha: '#b1a288',
  floresta: '#5a9b53',
  praia: '#8fcfc0',
  pantano: '#7f8a57',
  savana: '#cabf68',
  deserto: '#e7c34f',
};

export interface Mark {
  x: number;
  y: number;
}

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

/** Marcas (posições) da tile 50x50 de textura de cada bioma. */
export const BIOME_MARKS: Record<Biome, Mark[]> = (() => {
  const out = {} as Record<Biome, Mark[]>;
  (Object.keys(BIOME_COLORS) as Biome[]).forEach((b) => {
    const rg = mulberry32(strHash(b));
    const marks: Mark[] = [];
    for (let i = 0; i < 10; i++) marks.push({ x: rg() * 50, y: rg() * 50 });
    out[b] = marks;
  });
  return out;
})();

export const TILE = 50;

// ----- Nomes e centroides de região (para rótulos no mapa) -----

const regions = (mapData as { regions: { id: string; name: string; territories: string[] }[] })
  .regions;

export const REGION_LABELS: { name: string; x: number; y: number }[] = regions.map((r) => {
  const members = r.territories.filter((id) => MAP_GEOMETRY.centroids[id]);
  const n = members.length || 1;
  const x = members.reduce((s, id) => s + MAP_GEOMETRY.centroids[id][0], 0) / n;
  const y = members.reduce((s, id) => s + MAP_GEOMETRY.centroids[id][1], 0) / n;
  return { name: r.name, x, y };
});
