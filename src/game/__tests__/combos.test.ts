import { newArmy } from '../army';
import { comboBonus } from '../combos';

describe('comboBonus', () => {
  it('exército vazio não ativa combo', () => {
    const r = comboBonus(newArmy());
    expect(r.names).toHaveLength(0);
    expect(r.atk).toBe(1);
    expect(r.def).toBe(1);
  });

  it('Muralha de Escudos: só defensivas e ≥4 tipos', () => {
    const r = comboBonus(
      newArmy({ lanceiro: 1, espadachim: 1, escudeiro: 1, guardareal: 1 })
    );
    expect(r.names).toContain('Muralha de Escudos');
    expect(r.def).toBeCloseTo(1.12);
  });

  it('Muralha não ativa se houver tropa não-defensiva', () => {
    const r = comboBonus(
      newArmy({ lanceiro: 1, espadachim: 1, escudeiro: 1, guardareal: 1, arqueiro: 1 })
    );
    expect(r.names).not.toContain('Muralha de Escudos');
  });

  it('Carga de Cavalaria: ≥50% de cavalaria', () => {
    const r = comboBonus(newArmy({ cavalaria: 3, lanceiro: 1 }));
    expect(r.names).toContain('Carga de Cavalaria');
    expect(r.atk).toBeCloseTo(1.15);
  });

  it('Esquadrão Furtivo: ≥40% de ninjas', () => {
    const r = comboBonus(newArmy({ ninja: 2, lanceiro: 3 }));
    expect(r.names).toContain('Esquadrão Furtivo');
  });

  it('Guarda Lendária: campeão + 2 guardas reais', () => {
    const r = comboBonus(newArmy({ campeao: 1, guardareal: 2 }));
    expect(r.names).toContain('Guarda Lendária');
    expect(r.atk).toBeCloseTo(1.05);
    expect(r.def).toBeCloseTo(1.1);
  });

  it('Exército Combinado: ≥6 tipos diferentes', () => {
    const r = comboBonus(
      newArmy({
        lanceiro: 1,
        espadachim: 1,
        arqueiro: 1,
        cavalaria: 1,
        ninja: 1,
        besteiro: 1,
      })
    );
    expect(r.names).toContain('Exército Combinado');
    expect(r.atk).toBeCloseTo(1.08);
    expect(r.def).toBeCloseTo(1.08);
  });
});
