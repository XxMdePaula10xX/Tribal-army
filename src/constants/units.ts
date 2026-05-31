// ============================================================
// TROPAS — 12 tipos (atk, def, hp, custo, ícone)
// Fonte: GDD seção 3
// ============================================================

export interface Unit {
  name: string;
  atk: number;
  def: number;
  hp: number;
  cost: number;
  icon: string;
}

export const UNITS = {
  lanceiro: { name: 'Lanceiro', atk: 2, def: 4, hp: 6, cost: 50, icon: '🛡' },
  espadachim: { name: 'Espadachim', atk: 4, def: 4, hp: 7, cost: 80, icon: '⚔️' },
  arqueiro: { name: 'Arqueiro', atk: 5, def: 2, hp: 4, cost: 70, icon: '🏹' },
  cavalaria: { name: 'Cavalaria', atk: 8, def: 3, hp: 8, cost: 150, icon: '🐎' },
  escudeiro: { name: 'Escudeiro', atk: 1, def: 6, hp: 9, cost: 70, icon: '🛡️' },
  ninja: { name: 'Ninja', atk: 7, def: 1, hp: 3, cost: 90, icon: '🥷' },
  besteiro: { name: 'Besteiro', atk: 6, def: 3, hp: 5, cost: 100, icon: '🎯' },
  guardareal: { name: 'Guarda Real', atk: 3, def: 9, hp: 12, cost: 160, icon: '💂' },
  cavaleiro: { name: 'Cavaleiro Pesado', atk: 9, def: 6, hp: 14, cost: 200, icon: '🐴' },
  catapulta: { name: 'Catapulta', atk: 12, def: 1, hp: 4, cost: 220, icon: '🪨' },
  morteiro: { name: 'Morteiro', atk: 14, def: 2, hp: 5, cost: 280, icon: '💥' },
  campeao: { name: 'Campeão', atk: 10, def: 10, hp: 18, cost: 350, icon: '👑' },
} as const satisfies Record<string, Unit>;

export type UnitType = keyof typeof UNITS;

export const UNIT_TYPES: UnitType[] = [
  'lanceiro',
  'espadachim',
  'arqueiro',
  'cavalaria',
  'escudeiro',
  'ninja',
  'besteiro',
  'guardareal',
  'cavaleiro',
  'catapulta',
  'morteiro',
  'campeao',
];
