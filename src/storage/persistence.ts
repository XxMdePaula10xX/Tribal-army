import AsyncStorage from '@react-native-async-storage/async-storage';

import type { GameState } from '@/types';

// ============================================================
// PERSISTÊNCIA — save/load via AsyncStorage
// Fonte: GDD seção 9
// ============================================================

const SAVE_KEY = 'tribalArmy_save';
const HISTORY_KEY = 'tribalArmy_history';

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

export async function appendHistory(state: GameState): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(HISTORY_KEY);
    const history: GameState[] = raw ? JSON.parse(raw) : [];
    history.unshift(state);
    await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, 20)));
  } catch (e) {
    console.warn('Falha ao salvar histórico', e);
  }
}
