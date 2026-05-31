import type { Region, Territory } from '@/types';

import mapData from '../../assets/data/map.json';

// ============================================================
// MAPA — 40 territórios, 8 regiões (carregado do JSON)
// Fonte: GDD seção 2 / assets/data/map.json
// ============================================================

export const MAP_DATA: Territory[] = mapData.territories;
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
