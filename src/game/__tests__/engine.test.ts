import type { GameState, Player, TerritoryState } from '@/types';

import { newArmy } from '../army';
import { checkVictory, endTurn, recruit, resolveCombat } from '../engine';
import { createGame } from '../setup';

function player(idx: number, overrides: Partial<Player> = {}): Player {
  return {
    idx,
    name: `P${idx}`,
    color: '#fff',
    isHuman: true,
    difficulty: 'medio',
    gold: 500,
    cards: 0,
    conqueredThisTurn: false,
    fortifiedThisTurn: false,
    ...overrides,
  };
}

function terr(owner: number | 'neutral', army: TerritoryState['army']): TerritoryState {
  return { owner, army, wound: 0 };
}

// valdoria é adjacente a eldermark (ambos da região "norte").
function makeState(overrides: Partial<GameState> = {}): GameState {
  return {
    round: 1,
    phase: 'playing',
    currentPlayerIdx: 0,
    firstTurnDone: false,
    players: [player(0), player(1)],
    territories: {
      valdoria: terr(0, newArmy({ cavalaria: 20 })),
      eldermark: terr(1, newArmy({ lanceiro: 1 })),
    },
    log: [],
    winnerIdx: null,
    ...overrides,
  };
}

describe('recruit', () => {
  it('debita o ouro e adiciona tropas', () => {
    const { state, ok } = recruit(makeState(), 0, 'valdoria', { cavalaria: 1 });
    expect(ok).toBe(true);
    expect(state.players[0].gold).toBe(350); // 500 - 150
    expect(state.territories.valdoria.army.cavalaria).toBe(21);
  });

  it('recusa quando falta ouro', () => {
    const base = makeState();
    base.players[0].gold = 100;
    const { ok, state } = recruit(base, 0, 'valdoria', { cavalaria: 1 });
    expect(ok).toBe(false);
    expect(state.players[0].gold).toBe(100);
  });

  it('não recruta em território de outro dono', () => {
    const { ok } = recruit(makeState(), 0, 'eldermark', { lanceiro: 1 });
    expect(ok).toBe(false);
  });
});

describe('resolveCombat', () => {
  const realRandom = Math.random;
  beforeEach(() => {
    Math.random = () => 0.5;
  });
  afterEach(() => {
    Math.random = realRandom;
  });

  it('conquista move metade dos sobreviventes e dá uma carta', () => {
    const { state } = resolveCombat(makeState(), {
      fromId: 'valdoria',
      toId: 'eldermark',
      focus: 'default',
      fullAssault: true,
    });
    expect(state.territories.eldermark.owner).toBe(0);
    expect(state.territories.eldermark.army.cavalaria).toBe(10); // metade de 20
    expect(state.territories.valdoria.army.cavalaria).toBe(10);
    expect(state.players[0].cards).toBe(1);
  });

  it('ignora ataque entre territórios não adjacentes', () => {
    const base = makeState();
    base.territories = {
      valdoria: terr(0, newArmy({ cavalaria: 20 })),
      sunpeak: terr(1, newArmy({ lanceiro: 1 })), // não é vizinho de valdoria
    };
    const { state } = resolveCombat(base, {
      fromId: 'valdoria',
      toId: 'sunpeak',
      focus: 'default',
      fullAssault: true,
    });
    expect(state).toBe(base); // estado inalterado
  });
});

describe('endTurn', () => {
  it('não paga renda nem incrementa rodada no primeiro turno', () => {
    const next = endTurn(makeState());
    expect(next.currentPlayerIdx).toBe(1);
    expect(next.round).toBe(1);
    expect(next.firstTurnDone).toBe(false);
    expect(next.players[1].gold).toBe(500); // sem renda ainda
  });

  it('ao dar a volta, incrementa rodada e paga renda', () => {
    // P1 joga e encerra → volta ao P0, nova rodada.
    const afterP0 = endTurn(makeState());
    const afterP1 = endTurn(afterP0);
    expect(afterP1.currentPlayerIdx).toBe(0);
    expect(afterP1.round).toBe(2);
    expect(afterP1.firstTurnDone).toBe(true);
    // P0 possui só valdoria (norte incompleta): 1 * 150 = 150 de renda.
    expect(afterP1.players[0].gold).toBe(650);
  });
});

describe('checkVictory', () => {
  it('retorna o índice de quem controla todos os 40 territórios', () => {
    const game = createGame([
      { name: 'A', isHuman: true, difficulty: 'medio' },
      { name: 'B', isHuman: false, difficulty: 'medio' },
    ]);
    expect(checkVictory(game)).toBeNull();
    for (const id of Object.keys(game.territories)) {
      game.territories[id].owner = 0;
    }
    expect(checkVictory(game)).toBe(0);
  });
});
