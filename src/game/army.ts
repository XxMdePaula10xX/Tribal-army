import { UNITS, UNIT_TYPES } from '@/constants/units';
import type { Army } from '@/types';

// ============================================================
// EXÉRCITO — criação e métricas básicas
// Fonte: GDD seções 3 e 12
// ============================================================

export function newArmy(overrides?: Partial<Army>): Army {
  const base = Object.fromEntries(UNIT_TYPES.map((k) => [k, 0])) as Army;
  return { ...base, ...overrides };
}

export function cloneArmy(army: Army): Army {
  return { ...army };
}

export function armySize(army: Army): number {
  return UNIT_TYPES.reduce((sum, k) => sum + (army[k] || 0), 0);
}

export function armyAttack(army: Army): number {
  return UNIT_TYPES.reduce((sum, k) => sum + (army[k] || 0) * UNITS[k].atk, 0);
}

export function armyDefense(army: Army): number {
  return UNIT_TYPES.reduce((sum, k) => sum + (army[k] || 0) * UNITS[k].def, 0);
}

export function isEmpty(army: Army): boolean {
  return armySize(army) === 0;
}
