import { MAX_COMBAT_ROUNDS, MAX_ROUNDS, TOTAL_TERRITORIES } from '@/constants/game';
import { UNIT_TYPES, type UnitType } from '@/constants/units';
import { MAP } from '@/data/map';
import type { Army, CombatFocus, CombatResult, GameState, TerritoryState } from '@/types';

import { armySize, cloneArmy, newArmy } from './army';
import { combatRound } from './combat';
import {
  cardTradeReward,
  controlledTerritories,
  recruitCost,
  turnIncome,
} from './economy';
import { makeLog } from './setup';
import { CARD_TRADE_COST } from '@/constants/game';

// ============================================================
// ENGINE — mutações de alto nível sobre o GameState
// Cada função recebe e devolve um novo GameState (imutável).
// ============================================================

function cloneState(state: GameState): GameState {
  return {
    ...state,
    players: state.players.map((p) => ({ ...p })),
    territories: Object.fromEntries(
      Object.entries(state.territories).map(([id, t]) => [
        id,
        { ...t, army: cloneArmy(t.army) },
      ])
    ),
    log: [...state.log],
  };
}

function pushLog(state: GameState, message: string, type?: Parameters<typeof makeLog>[1]) {
  state.log = [...state.log, makeLog(message, type)];
}

/** Move metade (floor, mínimo 1 no total) das tropas sobreviventes. */
function splitHalf(army: Army): { moved: Army; kept: Army } {
  const moved = newArmy();
  const kept = cloneArmy(army);
  let movedTotal = 0;

  for (const k of UNIT_TYPES) {
    const half = Math.floor(army[k] / 2);
    moved[k] = half;
    kept[k] = army[k] - half;
    movedTotal += half;
  }

  // Garante ao menos 1 tropa avançando se houver sobreviventes.
  if (movedTotal === 0 && armySize(army) > 0) {
    const first = UNIT_TYPES.find((k) => kept[k] > 0);
    if (first) {
      moved[first] += 1;
      kept[first] -= 1;
    }
  }
  return { moved, kept };
}

export interface RecruitResult {
  state: GameState;
  ok: boolean;
  reason?: string;
}

/** Recruta um lote de tropas num território próprio. */
export function recruit(
  state: GameState,
  playerIdx: number,
  territoryId: string,
  batch: Partial<Army>
): RecruitResult {
  const terr = state.territories[territoryId];
  if (!terr || terr.owner !== playerIdx) {
    return { state, ok: false, reason: 'Território inválido.' };
  }
  const cost = recruitCost(batch);
  const player = state.players[playerIdx];
  if (cost > player.gold) {
    return { state, ok: false, reason: 'Ouro insuficiente.' };
  }

  const next = cloneState(state);
  next.players[playerIdx].gold -= cost;
  const army = next.territories[territoryId].army;
  for (const [k, qty] of Object.entries(batch) as [UnitType, number][]) {
    army[k] += qty || 0;
  }
  return { state: next, ok: true };
}

export interface CombatOutcome {
  state: GameState;
  results: CombatResult[];
}

interface ResolveOptions {
  fromId: string;
  toId: string;
  focus: CombatFocus;
  /** true = assalto total (repete até decidir); false = investida (1 round). */
  fullAssault: boolean;
}

/**
 * Resolve combate entre dois territórios adjacentes.
 * Aplica conquista / repulsa / aniquilação mútua ao estado.
 */
export function resolveCombat(state: GameState, opts: ResolveOptions): CombatOutcome {
  const { fromId, toId, focus, fullAssault } = opts;
  const next = cloneState(state);
  const from = next.territories[fromId];
  const to = next.territories[toId];
  const results: CombatResult[] = [];

  if (!from || !to || from.owner === 'neutral') {
    return { state, results };
  }
  if (from.owner === to.owner) return { state, results };
  if (!MAP[fromId]?.adjacentTo.includes(toId)) return { state, results };

  let aArmy = cloneArmy(from.army);
  let dArmy = cloneArmy(to.army);
  let aWound = from.wound;
  let dWound = to.wound;

  const maxRounds = fullAssault ? MAX_COMBAT_ROUNDS : 1;
  let last: CombatResult | null = null;

  for (let i = 0; i < maxRounds; i++) {
    if (armySize(aArmy) === 0 || armySize(dArmy) === 0) break;
    const round = combatRound({ fromId, toId, aArmy, dArmy, aWound, dWound, focus });
    aArmy = round.aArmy;
    dArmy = round.dArmy;
    aWound = round.aWound;
    dWound = round.dWound;
    results.push(round.result);
    last = round.result;
    if (!round.result.ongoing) break;
  }

  if (!last) return { state, results };

  const attacker = next.players[from.owner];

  if (last.mutualWipe) {
    from.army = newArmy();
    from.wound = 0;
    to.army = newArmy({ lanceiro: 1 });
    to.owner = 'neutral';
    to.wound = 0;
    pushLog(next, `Aniquilação mútua em ${MAP[toId].name}! Território neutralizado.`, 'warning');
  } else if (last.conquered) {
    const { moved, kept } = splitHalf(aArmy);
    from.army = kept;
    from.wound = 0;
    to.army = moved;
    to.owner = from.owner;
    to.wound = 0;
    attacker.cards += 1;
    attacker.conqueredThisTurn = true;
    pushLog(next, `${attacker.name} conquistou ${MAP[toId].name}!`, 'success');
  } else if (armySize(aArmy) === 0) {
    // Atacante repelido.
    from.army = newArmy();
    from.wound = 0;
    to.army = dArmy;
    to.wound = 0;
    pushLog(next, `Ataque a ${MAP[toId].name} foi repelido.`, 'danger');
  } else {
    // Batalha continua (investida): persiste estado e ferimentos.
    from.army = aArmy;
    from.wound = aWound;
    to.army = dArmy;
    to.wound = dWound;
  }

  return { state: next, results };
}

/** Move tropas entre dois territórios adjacentes do mesmo dono (fortificação). */
export function fortify(
  state: GameState,
  playerIdx: number,
  fromId: string,
  toId: string,
  batch: Partial<Army>
): RecruitResult {
  const from = state.territories[fromId];
  const to = state.territories[toId];
  if (!from || !to || from.owner !== playerIdx || to.owner !== playerIdx) {
    return { state, ok: false, reason: 'Territórios inválidos.' };
  }
  if (!MAP[fromId]?.adjacentTo.includes(toId)) {
    return { state, ok: false, reason: 'Territórios não são vizinhos.' };
  }
  for (const k of Object.keys(batch) as UnitType[]) {
    if ((batch[k] || 0) > from.army[k]) {
      return { state, ok: false, reason: 'Tropas insuficientes.' };
    }
  }

  const next = cloneState(state);
  for (const [k, qty] of Object.entries(batch) as [UnitType, number][]) {
    next.territories[fromId].army[k] -= qty || 0;
    next.territories[toId].army[k] += qty || 0;
  }
  return { state: next, ok: true };
}

/** Troca 3 cartas por ouro (favorece quem tem menos territórios). */
export function tradeCards(state: GameState, playerIdx: number): RecruitResult {
  const player = state.players[playerIdx];
  if (player.cards < CARD_TRADE_COST) {
    return { state, ok: false, reason: 'Cartas insuficientes.' };
  }
  const next = cloneState(state);
  const count = controlledTerritories(next.territories, playerIdx).length;
  const reward = cardTradeReward(count);
  next.players[playerIdx].cards -= CARD_TRADE_COST;
  next.players[playerIdx].gold += reward;
  pushLog(next, `${player.name} trocou cartas por ${reward} de ouro.`, 'info');
  return { state: next, ok: true };
}

/** Verifica vitória: alguém controla todos os 40 territórios. */
export function checkVictory(state: GameState): number | null {
  for (const player of state.players) {
    if (controlledTerritories(state.territories, player.idx).length === TOTAL_TERRITORIES) {
      return player.idx;
    }
  }
  return null;
}

/** Líder por número de territórios (null em caso de empate). */
function territoryLeader(state: GameState): number | null {
  const counts = state.players.map(
    (p) => controlledTerritories(state.territories, p.idx).length
  );
  const max = Math.max(...counts);
  const leaders = counts.filter((c) => c === max);
  return leaders.length === 1 ? counts.indexOf(max) : null;
}

function isPlayerAlive(state: GameState, playerIdx: number): boolean {
  return controlledTerritories(state.territories, playerIdx).length > 0;
}

/** Encerra o turno atual e avança para o próximo jogador vivo. */
export function endTurn(state: GameState): GameState {
  const next = cloneState(state);
  next.players[next.currentPlayerIdx].conqueredThisTurn = false;

  // Procura o próximo jogador vivo.
  const count = next.players.length;
  let idx = next.currentPlayerIdx;
  let advancedRound = false;
  for (let step = 1; step <= count; step++) {
    const candidate = (next.currentPlayerIdx + step) % count;
    if (candidate <= next.currentPlayerIdx) {
      // Demos a volta → nova rodada.
      advancedRound = true;
    }
    if (isPlayerAlive(next, candidate)) {
      idx = candidate;
      break;
    }
  }

  if (advancedRound) {
    next.round += 1;
    next.firstTurnDone = true;
  }
  next.currentPlayerIdx = idx;

  // Renda no início do turno (exceto o primeiríssimo turno da partida).
  if (next.firstTurnDone) {
    const income = turnIncome(next.territories, idx);
    next.players[idx].gold += income;
    pushLog(next, `${next.players[idx].name} recebeu ${income} de ouro.`, 'info');
  }

  const winner = checkVictory(next);
  if (winner !== null) {
    next.winnerIdx = winner;
    next.phase = 'gameover';
    pushLog(next, `${next.players[winner].name} venceu a partida!`, 'success');
  } else if (next.round > MAX_ROUNDS) {
    // Timeout: vence quem tiver mais territórios (empate se houver igualdade).
    const leader = territoryLeader(next);
    next.winnerIdx = leader;
    next.phase = 'gameover';
    pushLog(
      next,
      leader !== null
        ? `Limite de rodadas atingido — ${next.players[leader].name} lidera!`
        : 'Limite de rodadas atingido — empate!',
      'warning'
    );
  }

  return next;
}
