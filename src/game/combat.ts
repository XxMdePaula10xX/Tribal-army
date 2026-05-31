import { DMG_SCALE } from '@/constants/game';
import { UNITS, UNIT_TYPES, type UnitType } from '@/constants/units';
import type { Army, CombatFocus, CombatResult } from '@/types';

import { armyAttack, armyDefense, armySize, cloneArmy } from './army';
import { comboBonus } from './combos';

// ============================================================
// COMBATE — variância, ordem de baixas, aplicação de dano
// Fonte: GDD seção 4
// ============================================================

/** Variância de dano: ±10% → [0.90, 1.10]. */
export function variance(): number {
  return 0.9 + Math.random() * 0.2;
}

/**
 * Ordem de prioridade de baixas conforme o foco do atacante.
 * Retorna uma cópia ordenada (não muta UNIT_TYPES).
 */
export function targetOrder(focus: CombatFocus): UnitType[] {
  const order = [...UNIT_TYPES];
  switch (focus) {
    case 'atkHigh':
      return order.sort((a, b) => UNITS[b].atk - UNITS[a].atk);
    case 'atkLow':
      return order.sort((a, b) => UNITS[a].atk - UNITS[b].atk);
    case 'defHigh':
      return order.sort((a, b) => UNITS[b].def - UNITS[a].def);
    case 'defLow':
      return order.sort((a, b) => UNITS[a].def - UNITS[b].def);
    default:
      return order.sort((a, b) => UNITS[a].hp - UNITS[b].hp);
  }
}

/**
 * Aplica `damage` ao exército (muta `army`) seguindo `priority`.
 * Acumula o ferimento restante em `woundIn` e devolve quantas
 * tropas morreram e o novo ferimento (zerado se o exército foi varrido).
 */
export function applyDamage(
  army: Army,
  damage: number,
  priority: UnitType[],
  woundIn = 0
): { killed: number; wound: number; killedByType: Partial<Record<UnitType, number>> } {
  let killed = 0;
  let remaining = damage + woundIn;
  const killedByType: Partial<Record<UnitType, number>> = {};

  for (const unitType of priority) {
    while (army[unitType] > 0 && remaining >= UNITS[unitType].hp) {
      remaining -= UNITS[unitType].hp;
      army[unitType]--;
      killed++;
      killedByType[unitType] = (killedByType[unitType] || 0) + 1;
    }
  }

  const wound = armySize(army) > 0 ? remaining : 0;
  return { killed, wound, killedByType };
}

export interface CombatRoundInput {
  fromId: string;
  toId: string;
  aArmy: Army;
  dArmy: Army;
  aWound: number;
  dWound: number;
  focus: CombatFocus;
}

export interface CombatRoundOutput {
  aArmy: Army;
  dArmy: Army;
  aWound: number;
  dWound: number;
  result: CombatResult;
}

/**
 * Resolve UMA troca de dano (round). Troca simultânea:
 * atacante e defensor sofrem baixas ao mesmo tempo.
 */
export function combatRound(input: CombatRoundInput): CombatRoundOutput {
  const aArmy = cloneArmy(input.aArmy);
  const dArmy = cloneArmy(input.dArmy);

  const aSizeBefore = armySize(aArmy);
  const dSizeBefore = armySize(dArmy);

  const aCombo = comboBonus(aArmy);
  const dCombo = comboBonus(dArmy);

  const aBaseAtk = armyAttack(aArmy);
  const dBaseDef = armyDefense(dArmy);

  const aRes = aBaseAtk * aCombo.atk * variance() * DMG_SCALE;
  const dRes = dBaseDef * dCombo.def * variance() * DMG_SCALE;

  // Dano do atacante mata as tropas defensoras (foco escolhido).
  const dHit = applyDamage(dArmy, aRes, targetOrder(input.focus), input.dWound);
  // Dano do defensor mata as tropas atacantes (ordem padrão).
  const aHit = applyDamage(aArmy, dRes, targetOrder('default'), input.aWound);

  const aSizeAfter = armySize(aArmy);
  const dSizeAfter = armySize(dArmy);

  const attackerAlive = aSizeAfter > 0;
  const defenderAlive = dSizeAfter > 0;

  const result: CombatResult = {
    fromId: input.fromId,
    toId: input.toId,
    aRes,
    dRes,
    aLoss: aHit.killed,
    dLoss: dHit.killed,
    aLossByType: aHit.killedByType,
    dLossByType: dHit.killedByType,
    aSizeBefore,
    dSizeBefore,
    aSizeAfter,
    dSizeAfter,
    aWound: aHit.wound,
    dWound: dHit.wound,
    conquered: !defenderAlive && attackerAlive,
    mutualWipe: !defenderAlive && !attackerAlive,
    ongoing: defenderAlive && attackerAlive,
    aBaseAtk,
    dBaseDef,
    aAtkMult: aCombo.atk,
    dDefMult: dCombo.def,
    aComboNames: aCombo.names,
    dComboNames: dCombo.names,
  };

  return { aArmy, dArmy, aWound: aHit.wound, dWound: dHit.wound, result };
}
