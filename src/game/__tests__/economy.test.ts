import type { TerritoryState } from '@/types';

import { newArmy } from '../army';
import {
  cardTradeReward,
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
  // valdoria e eldermark são da região "norte" (bônus 300).
  const territories: Record<string, TerritoryState> = {
    valdoria: terr(0),
    eldermark: terr(0),
    thornheim: terr(1), // central
  };

  it('conta apenas os territórios do dono', () => {
    expect(controlledTerritories(territories, 0)).toEqual(['valdoria', 'eldermark']);
    expect(controlledTerritories(territories, 1)).toEqual(['thornheim']);
  });

  it('renda = 200/território + bônus regional por território', () => {
    // 2 * 200 + 2 * 300 (norte) = 1000
    expect(turnIncome(territories, 0)).toBe(1000);
    // 1 * 200 + 1 * 250 (central) = 450
    expect(turnIncome(territories, 1)).toBe(450);
  });
});
