import { INITIAL_GOLD, PLAYER_COLORS, type Difficulty } from '@/constants/game';
import { MAP_DATA } from '@/data/map';
import type { GameState, LogEntry, LogType, Player, TerritoryState } from '@/types';

import { newArmy } from './army';

// ============================================================
// SETUP — criação da partida e distribuição de territórios
// Fonte: GDD seção 10.2
// ============================================================

export interface PlayerConfig {
  name: string;
  isHuman: boolean;
  difficulty: Difficulty;
  color?: string;
}

function shuffle<T>(arr: T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export function makeLog(message: string, type: LogType = 'info'): LogEntry {
  return { message, type, timestamp: Date.now() };
}

/** Cria um novo estado de jogo a partir da configuração de jogadores. */
export function createGame(configs: PlayerConfig[]): GameState {
  const players: Player[] = configs.map((c, idx) => ({
    idx,
    name: c.name,
    color: c.color ?? PLAYER_COLORS[idx % PLAYER_COLORS.length],
    isHuman: c.isHuman,
    difficulty: c.difficulty,
    gold: INITIAL_GOLD,
    cards: 0,
    conqueredThisTurn: false,
    fortifiedThisTurn: false,
  }));

  // Distribui os 40 territórios igualmente (round-robin sobre baralho embaralhado).
  const shuffled = shuffle(MAP_DATA);
  const territories: Record<string, TerritoryState> = {};
  shuffled.forEach((t, i) => {
    territories[t.id] = {
      owner: i % players.length,
      army: newArmy({ lanceiro: 2 }),
      wound: 0,
    };
  });

  return {
    round: 1,
    phase: 'playing',
    currentPlayerIdx: 0,
    firstTurnDone: false,
    players,
    territories,
    log: [makeLog('A partida começou! Conquiste todos os 40 territórios.', 'info')],
    winnerIdx: null,
  };
}
