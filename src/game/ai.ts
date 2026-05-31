import {
  AI_AGGRESSION,
  AI_ATTACK_MARGIN,
  AI_ATTACK_PUSHES_LIMIT,
  MIN_ARMY_SIZE_TO_ATTACK,
} from '@/constants/game';
import type { Difficulty } from '@/constants/game';
import { UNITS, type UnitType } from '@/constants/units';
import { MAP } from '@/data/map';
import type { Army, CombatFocus, GameState } from '@/types';

import { armyAttack, armyDefense, armySize } from './army';
import { comboBonus } from './combos';
import { recruit, resolveCombat, fortify } from './engine';

// ============================================================
// IA — recrutamento, ataque e fortificação (3 dificuldades)
// Fonte: GDD seção 7
// ============================================================

/** Tropas preferidas por dificuldade (do mais barato ao mais elite). */
const PREFERRED: Record<Difficulty, UnitType[]> = {
  facil: ['lanceiro', 'espadachim', 'arqueiro'],
  medio: ['espadachim', 'arqueiro', 'cavalaria', 'besteiro'],
  dificil: ['cavaleiro', 'catapulta', 'morteiro', 'campeao', 'guardareal'],
};

const FOCUS: Record<Difficulty, CombatFocus> = {
  facil: 'default',
  medio: 'default',
  dificil: 'atkHigh',
};

function ownedIds(state: GameState, idx: number): string[] {
  return Object.keys(state.territories).filter((id) => state.territories[id].owner === idx);
}

/** Territórios próprios com ao menos um vizinho inimigo/neutro. */
function borderIds(state: GameState, idx: number): string[] {
  return ownedIds(state, idx).filter((id) =>
    MAP[id].adjacentTo.some((n) => state.territories[n].owner !== idx)
  );
}

/** Defesa efetiva (com combo) de um território. */
function effectiveDefense(state: GameState, id: string): number {
  const army = state.territories[id].army;
  return armyDefense(army) * comboBonus(army).def;
}

/** Ataque efetivo (com combo) de um território. */
function effectiveAttack(army: Army): number {
  return armyAttack(army) * comboBonus(army).atk;
}

/** A IA joga o turno inteiro: recruta, ataca e fortifica. */
export function aiTakeTurn(state: GameState): GameState {
  const idx = state.currentPlayerIdx;
  const player = state.players[idx];
  let s = state;

  // --- 1. Recrutamento ---
  const budget = Math.floor(player.gold * AI_AGGRESSION[player.difficulty]);
  const targets = borderIds(s, idx);
  if (targets.length > 0 && budget > 0) {
    // Reforça a fronteira mais ameaçada (vizinho inimigo mais forte).
    const reinforceId = targets
      .map((id) => ({
        id,
        threat: Math.max(
          ...MAP[id].adjacentTo
            .filter((n) => s.territories[n].owner !== idx)
            .map((n) => effectiveAttack(s.territories[n].army)),
          0
        ),
      }))
      .sort((a, b) => b.threat - a.threat)[0].id;

    const batch: Partial<Army> = {};
    let spent = 0;
    const prefs = PREFERRED[player.difficulty];
    // Compra em ciclo pelas tropas preferidas enquanto couber no orçamento.
    let progressed = true;
    while (progressed) {
      progressed = false;
      for (const k of prefs) {
        if (spent + UNITS[k].cost <= budget) {
          batch[k] = (batch[k] || 0) + 1;
          spent += UNITS[k].cost;
          progressed = true;
        }
      }
    }
    if (spent > 0) {
      s = recruit(s, idx, reinforceId, batch).state;
    }
  }

  // --- 2. Ataques ---
  const margin = AI_ATTACK_MARGIN[player.difficulty];
  const focus = FOCUS[player.difficulty];
  let pushes = 0;

  while (pushes < AI_ATTACK_PUSHES_LIMIT) {
    let best: { fromId: string; toId: string; ratio: number } | null = null;

    for (const fromId of borderIds(s, idx)) {
      const from = s.territories[fromId];
      if (armySize(from.army) < MIN_ARMY_SIZE_TO_ATTACK) continue;
      const myAtk = effectiveAttack(from.army);

      for (const toId of MAP[fromId].adjacentTo) {
        if (s.territories[toId].owner === idx) continue;
        const def = Math.max(effectiveDefense(s, toId), 1);
        const ratio = myAtk / def;
        if (ratio >= margin && (!best || ratio > best.ratio)) {
          best = { fromId, toId, ratio };
        }
      }
    }

    if (!best) break;
    const before = ownedIds(s, idx).length;
    s = resolveCombat(s, {
      fromId: best.fromId,
      toId: best.toId,
      focus,
      fullAssault: true,
    }).state;
    pushes++;
    // Se não houve conquista nem mudança, evita loop infinito.
    if (ownedIds(s, idx).length === before && s.territories[best.fromId].owner !== idx) break;
  }

  // --- 3. Fortificação (1 movimento: interior → fronteira) ---
  const interiors = ownedIds(s, idx).filter(
    (id) => !MAP[id].adjacentTo.some((n) => s.territories[n].owner !== idx)
  );
  const borders = borderIds(s, idx);
  const source = interiors.find((id) => armySize(s.territories[id].army) > 1);
  if (source && borders.length > 0) {
    const dest = borders.find((id) => MAP[source].adjacentTo.includes(id));
    if (dest) {
      const army = s.territories[source].army;
      const moveType = (Object.keys(army) as UnitType[]).find((k) => army[k] > 0);
      if (moveType) {
        s = fortify(s, idx, source, dest, { [moveType]: 1 }).state;
      }
    }
  }

  return s;
}
