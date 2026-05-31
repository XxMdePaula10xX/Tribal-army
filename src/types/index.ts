import type { Difficulty } from '@/constants';
import type { UnitType } from '@/constants/units';

// ============================================================
// TIPOS CENTRAIS DO JOGO
// Fonte: GDD seções 2, 4, 8
// ============================================================

/** Quantidade de cada tipo de tropa em um exército. */
export type Army = Record<UnitType, number>;

export type Owner = number | 'neutral';

export interface Territory {
  id: string;
  name: string;
  region: string;
  adjacentTo: string[];
}

export interface Region {
  id: string;
  name: string;
  goldBonus: number;
  territories: string[];
}

/** Estado mutável de um território durante a partida. */
export interface TerritoryState {
  owner: Owner;
  army: Army;
  /** Ferimento acumulado entre rodadas de uma mesma sequência de combate. */
  wound: number;
}

export interface Player {
  idx: number;
  name: string;
  color: string;
  isHuman: boolean;
  difficulty: Difficulty;
  gold: number;
  cards: number;
  conqueredThisTurn: boolean;
}

export type GamePhase = 'menu' | 'setup' | 'playing' | 'gameover';

export type LogType = 'info' | 'success' | 'danger' | 'warning';

export interface LogEntry {
  message: string;
  type: LogType;
  timestamp: number;
}

export interface GameState {
  round: number;
  phase: GamePhase;
  currentPlayerIdx: number;
  firstTurnDone: boolean;
  players: Player[];
  territories: Record<string, TerritoryState>;
  log: LogEntry[];
  winnerIdx: number | null;
}

export type CombatFocus = 'default' | 'atkHigh' | 'atkLow' | 'defHigh' | 'defLow';

/** Resultado de uma única troca de dano. */
export interface CombatResult {
  fromId: string;
  toId: string;
  aRes: number;
  dRes: number;
  aLoss: number;
  dLoss: number;
  aSizeBefore: number;
  dSizeBefore: number;
  aSizeAfter: number;
  dSizeAfter: number;
  aWound: number;
  dWound: number;
  conquered: boolean;
  mutualWipe: boolean;
  ongoing: boolean;
  aBaseAtk: number;
  dBaseDef: number;
  aAtkMult: number;
  dDefMult: number;
  aComboNames: string[];
  dComboNames: string[];
}
