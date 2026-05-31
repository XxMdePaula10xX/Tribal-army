import { MAP_DATA, REGIONS } from '@/data/map';

// ============================================================
// LAYOUT DO MAPA — posições normalizadas (0..1) por território
// Gerado de forma determinística a partir das regiões.
// Cada região ocupa uma célula numa grade 4x2; os 5 territórios
// da região são distribuídos num pequeno círculo dentro da célula.
// ============================================================

const COLS = 4;
const ROWS = 2;

// Ordem das regiões na grade (apenas cosmético).
const REGION_GRID = [
  'norte',
  'central',
  'florestas',
  'costa',
  'ferro',
  'estepes',
  'sombras',
  'deserto',
];

export interface Point {
  x: number;
  y: number;
}

function buildPositions(): Record<string, Point> {
  const positions: Record<string, Point> = {};

  REGION_GRID.forEach((regionId, regionIndex) => {
    const col = regionIndex % COLS;
    const row = Math.floor(regionIndex / COLS);
    const cx = (col + 0.5) / COLS;
    const cy = (row + 0.5) / ROWS;

    const region = REGIONS.find((r) => r.id === regionId);
    const members = region ? region.territories : [];
    const radius = 0.09;

    members.forEach((id, i) => {
      if (i === 0) {
        positions[id] = { x: cx, y: cy };
      } else {
        const angle = ((i - 1) / (members.length - 1)) * Math.PI * 2;
        positions[id] = {
          x: cx + Math.cos(angle) * radius,
          y: cy + Math.sin(angle) * radius * 1.4,
        };
      }
    });
  });

  // Fallback para qualquer território sem posição (não deve ocorrer).
  MAP_DATA.forEach((t) => {
    if (!positions[t.id]) positions[t.id] = { x: 0.5, y: 0.5 };
  });

  return positions;
}

export const TERRITORY_POSITIONS: Record<string, Point> = buildPositions();

/** Pares únicos de adjacência (para desenhar as linhas uma única vez). */
export const ADJACENCY_PAIRS: [string, string][] = (() => {
  const seen = new Set<string>();
  const pairs: [string, string][] = [];
  for (const t of MAP_DATA) {
    for (const n of t.adjacentTo) {
      const key = [t.id, n].sort().join('|');
      if (!seen.has(key)) {
        seen.add(key);
        pairs.push([t.id, n]);
      }
    }
  }
  return pairs;
})();
