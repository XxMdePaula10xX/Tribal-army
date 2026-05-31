// ============================================================
// CONSTANTES DE JOGO
// Fonte: GDD seções 4, 6, 7
// ============================================================

export const INITIAL_GOLD = 500;
export const GOLD_PER_TERRITORY = 200;
export const MIN_ARMY_SIZE_TO_ATTACK = 2;
export const MAX_ROUNDS = 100;
export const MAX_COMBAT_ROUNDS = 20;
export const AI_ATTACK_PUSHES_LIMIT = 8;

/** Fator de escala de dano — calibrado para partidas de ~25-35 rodadas. */
export const DMG_SCALE = 0.6;

export type Difficulty = 'facil' | 'medio' | 'dificil';

/** Quão agressiva a IA é ao gastar ouro recrutando. */
export const AI_AGGRESSION: Record<Difficulty, number> = {
  facil: 0.4,
  medio: 0.65,
  dificil: 0.9,
};

/** Vantagem (atk/def) que a IA exige antes de atacar. */
export const AI_ATTACK_MARGIN: Record<Difficulty, number> = {
  facil: 1.3,
  medio: 1.15,
  dificil: 1.0,
};

// Cartas de comeback
export const CARD_TRADE_COST = 3;
export const CARD_TRADE_BASE_REWARD = 200;
export const CARD_TRADE_MAX_BONUS = 600;

export const TOTAL_TERRITORIES = 40;

// Cores padrão dos jogadores (até 6)
export const PLAYER_COLORS = [
  '#e74c3c',
  '#3498db',
  '#2ecc71',
  '#f1c40f',
  '#9b59b6',
  '#e67e22',
];
