import { UNITS } from '@/constants/units';

import { armyAttack, armyDefense, armySize, isEmpty, newArmy } from '../army';

describe('army', () => {
  it('cria um exército vazio', () => {
    const a = newArmy();
    expect(armySize(a)).toBe(0);
    expect(isEmpty(a)).toBe(true);
  });

  it('aplica overrides na criação', () => {
    const a = newArmy({ lanceiro: 3, ninja: 2 });
    expect(a.lanceiro).toBe(3);
    expect(a.ninja).toBe(2);
    expect(armySize(a)).toBe(5);
  });

  it('soma ataque e defesa ponderados pelos stats', () => {
    const a = newArmy({ lanceiro: 2, arqueiro: 1 });
    // lanceiro atk 2, arqueiro atk 5 → 2*2 + 1*5 = 9
    expect(armyAttack(a)).toBe(2 * UNITS.lanceiro.atk + UNITS.arqueiro.atk);
    // lanceiro def 4, arqueiro def 2 → 2*4 + 1*2 = 10
    expect(armyDefense(a)).toBe(2 * UNITS.lanceiro.def + UNITS.arqueiro.def);
  });
});
