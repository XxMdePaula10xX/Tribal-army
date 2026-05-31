import {
  CARD_TRADE_BASE_REWARD,
  CARD_TRADE_MAX_BONUS,
  GOLD_PER_TERRITORY,
  REGION_BONUS_PER_TERRITORY,
  TOTAL_TERRITORIES,
} from '@/constants/game';
import { UNITS, type UnitType } from '@/constants/units';
import { REGIONS } from '@/data/map';
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

/** Bônus de uma região quando controlada por inteiro: proporcional ao tamanho. */
export function regionBonusValue(memberCount: number): number {
  return memberCount * REGION_BONUS_PER_TERRITORY;
}

/** Regiões totalmente controladas por um dono. */
export function controlledRegions(
  territories: Record<string, TerritoryState>,
  owner: Owner
): string[] {
  return REGIONS.filter((r) =>
    r.territories.every((id) => territories[id]?.owner === owner)
  ).map((r) => r.id);
}

/**
 * Renda de uma rodada: base por território + bônus por cada região controlada
 * por inteiro (proporcional ao número de territórios da região).
 */
export function turnIncome(
  territories: Record<string, TerritoryState>,
  owner: Owner
): number {
  const owned = controlledTerritories(territories, owner);
  let gold = owned.length * GOLD_PER_TERRITORY;

  for (const r of REGIONS) {
    if (r.territories.every((id) => territories[id]?.owner === owner)) {
      gold += regionBonusValue(r.territories.length);
    }
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
