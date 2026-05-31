import geo from '../../assets/data/mapGeometry.json';

// ============================================================
// GEOMETRIA DO MAPA — dados pré-computados (Voronoi)
// Gerado por scripts/genMapGeometry.ts. O app só lê este JSON
// (sem d3-delaunay em runtime). É a fonte da adjacência do jogo.
// ============================================================

export type Pt = [number, number];

interface MapGeometry {
  width: number;
  height: number;
  order: string[];
  polygons: Record<string, Pt[]>;
  centroids: Record<string, Pt>;
  adjacency: Record<string, string[]>;
  regionBorders: [Pt, Pt][];
}

export const MAP_GEOMETRY = geo as unknown as MapGeometry;

export const MAP_W = MAP_GEOMETRY.width;
export const MAP_H = MAP_GEOMETRY.height;

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

export interface GrainDot {
  x: number;
  y: number;
  r: number;
  dark: boolean;
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

/** Pontos de uma "tile" 40x40 do padrão de grain (textura de campo). */
export const GRAIN_DOTS: GrainDot[] = (() => {
  const rand = mulberry32(987654);
  const dots: GrainDot[] = [];
  for (let i = 0; i < 22; i++) {
    dots.push({
      x: rand() * 40,
      y: rand() * 40,
      r: 0.6 + rand() * 1.1,
      dark: rand() > 0.5,
    });
  }
  return dots;
})();
