import { UNIT_TYPES, type UnitType } from '@/constants/units';
import type { Army } from '@/types';

import { armySize } from './army';

// ============================================================
// COMBOS — 7 bônus de composição (atk/def multiplicativos)
// Fonte: GDD seção 5
// ============================================================

export interface ComboBonus {
  names: string[];
  atk: number;
  def: number;
}

const DEFENSIVE: UnitType[] = ['lanceiro', 'espadachim', 'escudeiro', 'guardareal'];

export function comboBonus(army: Army): ComboBonus {
  const result: ComboBonus = { names: [], atk: 1.0, def: 1.0 };

  const present = UNIT_TYPES.filter((k) => army[k] > 0);
  const total = armySize(army);
  if (total === 0) return result;

  // Muralha de Escudos — só tropas defensivas, pelo menos 4 tipos
  const onlyDefensive = present.every((k) => DEFENSIVE.includes(k));
  if (onlyDefensive && present.length >= 4) {
    result.names.push('Muralha de Escudos');
    result.def *= 1.12;
  }

  // Carga de Cavalaria — ≥50% de cavalaria/cavaleiro
  const cav = army.cavalaria + army.cavaleiro;
  if (cav / total >= 0.5) {
    result.names.push('Carga de Cavalaria');
    result.atk *= 1.15;
  }

  // Linha de Tiro — ≥50% de atiradores com ao menos 1 unidade de frente
  const ranged = army.arqueiro + army.besteiro;
  const front =
    army.lanceiro + army.espadachim + army.cavalaria + army.cavaleiro + army.guardareal;
  if (ranged / total >= 0.5 && front >= 1) {
    result.names.push('Linha de Tiro');
    result.atk *= 1.1;
  }

  // Trem de Cerco — ≥30% de cerco com ao menos 2 escoltas
  const siege = army.catapulta + army.morteiro;
  const escort = army.lanceiro + army.espadachim + army.guardareal;
  if (siege / total >= 0.3 && escort >= 2) {
    result.names.push('Trem de Cerco');
    result.atk *= 1.2;
  }

  // Esquadrão Furtivo — ≥40% de ninjas
  if (army.ninja / total >= 0.4) {
    result.names.push('Esquadrão Furtivo');
    result.atk *= 1.12;
  }

  // Guarda Lendária — ≥1 campeão e ≥2 guardas reais
  if (army.campeao >= 1 && army.guardareal >= 2) {
    result.names.push('Guarda Lendária');
    result.atk *= 1.05;
    result.def *= 1.1;
  }

  // Exército Combinado — ≥6 tipos diferentes
  if (present.length >= 6) {
    result.names.push('Exército Combinado');
    result.atk *= 1.08;
    result.def *= 1.08;
  }

  return result;
}
