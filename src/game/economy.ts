import {
  CARD_TRADE_BASE_REWARD,
  CARD_TRADE_MAX_BONUS,
  GOLD_PER_TERRITORY,
  TOTAL_TERRITORIES,
} from '@/constants/game';
import { UNITS, type UnitType } from '@/constants/units';
import { MAP, getRegion } from '@/data/map';
import type { Army, Owner, TerritoryState } from '@/types';

// ============================================================
// ECONOMIA — renda, recrutamento e cartas
// Fonte: GDD seção 6
// ============================================================

/** Territórios controlados por um jogador. */
export function controlledTerritories(
  territories: Record<string, TerritoryState>,
  owner: Owner
): string[] {
  return Object.entries(territories)
    .filter(([, t]) => t.owner === owner)
    .map(([id]) => id);
}

/**
 * Renda de uma rodada: 200 por território + bônus regional
 * por território de cada região controlada.
 */
export function turnIncome(
  territories: Record<string, TerritoryState>,
  owner: Owner
): number {
  const owned = controlledTerritories(territories, owner);
  let gold = owned.length * GOLD_PER_TERRITORY;

  // Bônus regional aplica-se por território possuído (GDD seção 6.1).
  for (const id of owned) {
    const region = getRegion(MAP[id]?.region ?? '');
    if (region) gold += region.goldBonus;
  }
  return gold;
}

/** Custo total de recrutar um lote de tropas. */
export function recruitCost(batch: Partial<Army>): number {
  return (Object.entries(batch) as [UnitType, number][]).reduce(
    (sum, [k, qty]) => sum + UNITS[k].cost * (qty || 0),
    0
  );
}

/** Recompensa por trocar 3 cartas — favorece quem tem menos territórios. */
export function cardTradeReward(controlledCount: number): number {
  return Math.round(
    CARD_TRADE_BASE_REWARD +
      (1 - controlledCount / TOTAL_TERRITORIES) * CARD_TRADE_MAX_BONUS
  );
}
