import { create } from 'zustand';

import type { Army, CombatFocus, CombatResult, GameState } from '@/types';
import {
  aiTakeTurn,
  createGame,
  endTurn as engineEndTurn,
  fortify as engineFortify,
  recruit as engineRecruit,
  resolveCombat,
  tradeCards as engineTradeCards,
  type PlayerConfig,
} from '@/game';
import {
  appendHistory,
  loadConfig,
  loadGame,
  saveConfig,
  saveGame,
  summarizeGame,
  type AppConfig,
  DEFAULT_CONFIG,
} from '@/storage/persistence';

// ============================================================
// STORE GLOBAL (zustand) — estado + ações de UI
// ============================================================

export type Screen =
  | 'menu'
  | 'setup'
  | 'playing'
  | 'gameover'
  | 'history'
  | 'settings'
  | 'howto';

interface Store {
  screen: Screen;
  game: GameState | null;
  selectedId: string | null;
  attackTargetId: string | null;
  lastCombat: CombatResult[] | null;
  config: AppConfig;

  // Navegação
  goToMenu: () => void;
  goToSetup: () => void;
  goToHistory: () => void;
  goToSettings: () => void;
  goToHowTo: () => void;
  newGame: (configs: PlayerConfig[]) => void;
  continueGame: () => Promise<boolean>;
  setConfig: (config: AppConfig) => void;

  // Interação no mapa
  select: (id: string | null) => void;
  setAttackTarget: (id: string | null) => void;
  dismissCombat: () => void;

  // Ações de turno
  recruit: (territoryId: string, batch: Partial<Army>) => void;
  attack: (focus: CombatFocus, fullAssault: boolean) => void;
  fortify: (fromId: string, toId: string, batch: Partial<Army>) => void;
  tradeCards: () => void;
  endTurn: () => void;
}

/** Processa turnos de IA em sequência até voltar a um humano ou acabar o jogo. */
function runAITurns(state: GameState): GameState {
  let s = state;
  let guard = 0;
  while (s.phase === 'playing' && !s.players[s.currentPlayerIdx].isHuman && guard < 100) {
    s = aiTakeTurn(s);
    s = engineEndTurn(s);
    guard++;
  }
  return s;
}

function syncScreen(state: GameState): Screen {
  return state.phase === 'gameover' ? 'gameover' : 'playing';
}

export const useGame = create<Store>((set, get) => ({
  screen: 'menu',
  game: null,
  selectedId: null,
  attackTargetId: null,
  lastCombat: null,
  config: DEFAULT_CONFIG,

  goToMenu: () => {
    const { game } = get();
    if (game && game.phase === 'playing') void saveGame(game);
    set({ screen: 'menu', game: null, selectedId: null, attackTargetId: null });
  },
  goToSetup: () => set({ screen: 'setup' }),
  goToHistory: () => set({ screen: 'history' }),
  goToSettings: () => set({ screen: 'settings' }),
  goToHowTo: () => set({ screen: 'howto' }),

  setConfig: (config) => {
    set({ config });
    void saveConfig(config);
  },

  newGame: (configs) => {
    const game = createGame(configs);
    set({ game, screen: 'playing', selectedId: null, attackTargetId: null, lastCombat: null });
    void saveGame(game);
  },

  continueGame: async () => {
    const saved = await loadGame();
    if (saved) {
      set({ game: saved, screen: syncScreen(saved) });
      return true;
    }
    return false;
  },

  select: (id) => set({ selectedId: id, attackTargetId: null }),
  setAttackTarget: (id) => set({ attackTargetId: id }),
  dismissCombat: () => set({ lastCombat: null }),

  recruit: (territoryId, batch) => {
    const { game } = get();
    if (!game) return;
    const { state, ok } = engineRecruit(game, game.currentPlayerIdx, territoryId, batch);
    if (ok) set({ game: state });
  },

  attack: (focus, fullAssault) => {
    const { game, selectedId, attackTargetId } = get();
    if (!game || !selectedId || !attackTargetId) return;
    const { state, results } = resolveCombat(game, {
      fromId: selectedId,
      toId: attackTargetId,
      focus,
      fullAssault,
    });
    set({ game: state, lastCombat: results });
  },

  fortify: (fromId, toId, batch) => {
    const { game } = get();
    if (!game) return;
    const { state, ok } = engineFortify(game, game.currentPlayerIdx, fromId, toId, batch);
    if (ok) set({ game: state });
  },

  tradeCards: () => {
    const { game } = get();
    if (!game) return;
    const { state, ok } = engineTradeCards(game, game.currentPlayerIdx);
    if (ok) set({ game: state });
  },

  endTurn: () => {
    const { game } = get();
    if (!game) return;
    let next = engineEndTurn(game);
    next = runAITurns(next);
    set({
      game: next,
      screen: syncScreen(next),
      selectedId: null,
      attackTargetId: null,
    });
    void saveGame(next);
    if (next.phase === 'gameover') void appendHistory(summarizeGame(next));
  },
}));

// Carrega as configurações persistidas ao iniciar.
void loadConfig().then((config) => useGame.setState({ config }));
