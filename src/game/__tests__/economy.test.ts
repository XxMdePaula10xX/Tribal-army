import type { TerritoryState } from '@/types';

import { newArmy } from '../army';
import {
  cardTradeReward,
  controlledRegions,
  controlledTerritories,
  recruitCost,
  turnIncome,
} from '../economy';

function terr(owner: number | 'neutral'): TerritoryState {
  return { owner, army: newArmy({ lanceiro: 1 }), wound: 0 };
}

describe('recruitCost', () => {
  it('soma o custo de cada tropa', () => {
    // lanceiro 50 *2 + cavalaria 150 = 250
    expect(recruitCost({ lanceiro: 2, cavalaria: 1 })).toBe(250);
  });

  it('lote vazio custa 0', () => {
    expect(recruitCost({})).toBe(0);
  });
});

describe('cardTradeReward', () => {
  it('quem tem menos territórios ganha mais', () => {
    expect(cardTradeReward(0)).toBe(800); // 200 + 600
    expect(cardTradeReward(40)).toBe(200);
    expect(cardTradeReward(20)).toBe(500); // 200 + 300
  });
});

describe('turnIncome / controlledTerritories', () => {
  // norte = valdoria, eldermark, ravencrest, northreach, frostwatch
  const partial: Record<string, TerritoryState> = {
    valdoria: terr(0),
    eldermark: terr(0),
    thornheim: terr(1), // central
  };

  it('conta apenas os territórios do dono', () => {
    expect(controlledTerritories(partial, 0)).toEqual(['valdoria', 'eldermark']);
    expect(controlledTerritories(partial, 1)).toEqual(['thornheim']);
  });

  it('renda base por território, sem bônus se a região não está completa', () => {
    expect(turnIncome(partial, 0)).toBe(300); // 2 * 150
    expect(turnIncome(partial, 1)).toBe(150); // 1 * 150
  });

  it('região controlada por inteiro dá bônus proporcional ao tamanho', () => {
    const full: Record<string, TerritoryState> = {
      valdoria: terr(0),
      eldermark: terr(0),
      ravencrest: terr(0),
      northreach: terr(0),
      frostwatch: terr(0),
    };
    // 5 * 150 + 5 * 30 (região norte completa) = 900
    expect(turnIncome(full, 0)).toBe(900);
    expect(controlledRegions(full, 0)).toContain('norte');
  });
});
