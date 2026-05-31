import { UNITS, UNIT_TYPES } from '@/constants/units';

import { newArmy } from '../army';
import { applyDamage, combatRound, targetOrder, variance } from '../combat';

describe('targetOrder', () => {
  it('não muta UNIT_TYPES', () => {
    const before = [...UNIT_TYPES];
    targetOrder('atkHigh');
    targetOrder('defLow');
    expect(UNIT_TYPES).toEqual(before);
  });

  it("'default' prioriza menor HP primeiro", () => {
    const order = targetOrder('default');
    expect(UNITS[order[0]].hp).toBeLessThanOrEqual(UNITS[order[1]].hp);
  });

  it("'atkHigh' prioriza maior ataque primeiro", () => {
    const order = targetOrder('atkHigh');
    expect(UNITS[order[0]].atk).toBeGreaterThanOrEqual(UNITS[order[1]].atk);
  });
});

describe('applyDamage', () => {
  it('mata tropas conforme HP e zera ferimento se varrer o exército', () => {
    const army = newArmy({ lanceiro: 2 }); // hp 6 cada
    const { killed, wound } = applyDamage(army, 13, targetOrder('default'));
    expect(killed).toBe(2);
    expect(army.lanceiro).toBe(0);
    expect(wound).toBe(0); // exército vazio → ferimento descartado
  });

  it('acumula ferimento quando sobram tropas', () => {
    const army = newArmy({ lanceiro: 2 });
    const { killed, wound } = applyDamage(army, 7, targetOrder('default'));
    expect(killed).toBe(1);
    expect(army.lanceiro).toBe(1);
    expect(wound).toBeCloseTo(1); // 7 - 6 = 1
  });

  it('soma o ferimento de entrada ao dano', () => {
    const army = newArmy({ lanceiro: 1 });
    const { killed } = applyDamage(army, 5, targetOrder('default'), 2); // 5+2 >= 6
    expect(killed).toBe(1);
  });
});

describe('variance', () => {
  it('fica no intervalo [0.9, 1.1]', () => {
    for (let i = 0; i < 100; i++) {
      const v = variance();
      expect(v).toBeGreaterThanOrEqual(0.9);
      expect(v).toBeLessThanOrEqual(1.1);
    }
  });
});

describe('combatRound', () => {
  const realRandom = Math.random;
  beforeEach(() => {
    Math.random = () => 0.5; // variance = 1.0 (determinístico)
  });
  afterEach(() => {
    Math.random = realRandom;
  });

  it('atacante esmagador conquista o defensor em um round', () => {
    const { result } = combatRound({
      fromId: 'a',
      toId: 'b',
      aArmy: newArmy({ cavalaria: 10 }),
      dArmy: newArmy({ lanceiro: 1 }),
      aWound: 0,
      dWound: 0,
      focus: 'default',
    });
    expect(result.conquered).toBe(true);
    expect(result.dSizeAfter).toBe(0);
    expect(result.dLoss).toBe(1);
    expect(result.aSizeAfter).toBe(10); // nenhuma baixa do atacante
  });

  it('não muta os exércitos de entrada', () => {
    const aArmy = newArmy({ cavalaria: 10 });
    const dArmy = newArmy({ lanceiro: 1 });
    combatRound({ fromId: 'a', toId: 'b', aArmy, dArmy, aWound: 0, dWound: 0, focus: 'default' });
    expect(aArmy.cavalaria).toBe(10);
    expect(dArmy.lanceiro).toBe(1);
  });
});
