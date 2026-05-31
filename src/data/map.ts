import type { Region, Territory } from '@/types';

import mapData from '../../assets/data/map.json';
import { MAP_GEOMETRY } from './mapGeometry';

// ============================================================
// MAPA — 40 territórios, 8 regiões
// Nomes/regiões vêm do JSON; a ADJACÊNCIA é derivada da geometria
// do mapa (Voronoi), para que o que se toca seja o que é vizinho.
// ============================================================

export const MAP_DATA: Territory[] = mapData.territories.map((t) => ({
  ...t,
  adjacentTo: MAP_GEOMETRY.adjacency[t.id] ?? t.adjacentTo,
}));
export const REGIONS: Region[] = mapData.regions;

export const MAP: Record<string, Territory> = Object.fromEntries(
  MAP_DATA.map((t) => [t.id, t])
);

export const REGION_MAP: Record<string, Region> = Object.fromEntries(
  REGIONS.map((r) => [r.id, r])
);

export function getTerritory(id: string): Territory | undefined {
  return MAP[id];
}

export function getRegion(id: string): Region | undefined {
  return REGION_MAP[id];
}

/**
 * Bônus regional. Conforme o GDD, só há bônus de OURO —
 * nada de atk/def/redução de custo (sempre 0).
 */
export function regionBonus(regionId: string) {
  return {
    atk: 0,
    def: 0,
    costRed: 0,
    goldBonus: REGION_MAP[regionId]?.goldBonus ?? 0,
  };
}
