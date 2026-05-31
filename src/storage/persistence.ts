import AsyncStorage from '@react-native-async-storage/async-storage';

import type { Difficulty } from '@/constants/game';
import type { GameState } from '@/types';

// ============================================================
// PERSISTÊNCIA — save/load via AsyncStorage
// Fonte: GDD seção 9
// ============================================================

const SAVE_KEY = 'tribalArmy_save';
const HISTORY_KEY = 'tribalArmy_history';
const CONFIG_KEY = 'tribalArmy_config';

// --- Partida em andamento ---

export async function saveGame(state: GameState): Promise<void> {
  try {
    await AsyncStorage.setItem(SAVE_KEY, JSON.stringify(state));
  } catch (e) {
    console.warn('Falha ao salvar o jogo', e);
  }
}

export async function loadGame(): Promise<GameState | null> {
  try {
    const raw = await AsyncStorage.getItem(SAVE_KEY);
    return raw ? (JSON.parse(raw) as GameState) : null;
  } catch (e) {
    console.warn('Falha ao carregar o jogo', e);
    return null;
  }
}

export async function clearSave(): Promise<void> {
  try {
    await AsyncStorage.removeItem(SAVE_KEY);
  } catch (e) {
    console.warn('Falha ao limpar o save', e);
  }
}

// --- Histórico de partidas finalizadas ---

export interface HistoryEntry {
  date: number;
  round: number;
  winnerName: string | null;
  winnerColor: string | null;
  playerNames: string[];
}

const MAX_HISTORY = 20;

export function summarizeGame(state: GameState): HistoryEntry {
  const winner = state.winnerIdx !== null ? state.players[state.winnerIdx] : null;
  return {
    date: Date.now(),
    round: state.round,
    winnerName: winner?.name ?? null,
    winnerColor: winner?.color ?? null,
    playerNames: state.players.map((p) => p.name),
  };
}

export async function appendHistory(entry: HistoryEntry): Promise<void> {
  try {
    const history = await loadHistory();
    history.unshift(entry);
    await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, MAX_HISTORY)));
  } catch (e) {
    console.warn('Falha ao salvar histórico', e);
  }
}

export async function loadHistory(): Promise<HistoryEntry[]> {
  try {
    const raw = await AsyncStorage.getItem(HISTORY_KEY);
    return raw ? (JSON.parse(raw) as HistoryEntry[]) : [];
  } catch (e) {
    console.warn('Falha ao carregar histórico', e);
    return [];
  }
}

export async function clearHistory(): Promise<void> {
  try {
    await AsyncStorage.removeItem(HISTORY_KEY);
  } catch (e) {
    console.warn('Falha ao limpar histórico', e);
  }
}

// --- Configurações do jogador ---

export interface AppConfig {
  defaultDifficulty: Difficulty;
  defaultPlayerCount: number;
}

export const DEFAULT_CONFIG: AppConfig = {
  defaultDifficulty: 'medio',
  defaultPlayerCount: 3,
};

export async function loadConfig(): Promise<AppConfig> {
  try {
    const raw = await AsyncStorage.getItem(CONFIG_KEY);
    return raw ? { ...DEFAULT_CONFIG, ...JSON.parse(raw) } : DEFAULT_CONFIG;
  } catch (e) {
    console.warn('Falha ao carregar config', e);
    return DEFAULT_CONFIG;
  }
}

export async function saveConfig(config: AppConfig): Promise<void> {
  try {
    await AsyncStorage.setItem(CONFIG_KEY, JSON.stringify(config));
  } catch (e) {
    console.warn('Falha ao salvar config', e);
  }
}
