// Smoke test da lógica pura (sem React Native). Roda uma partida só de IAs.
import { createGame, endTurn, aiTakeTurn, armySize } from '../src/game';
import { turnIncome } from '../src/game/economy';

const game = createGame([
  { name: 'IA A', isHuman: false, difficulty: 'dificil' },
  { name: 'IA B', isHuman: false, difficulty: 'medio' },
  { name: 'IA C', isHuman: false, difficulty: 'facil' },
]);

let s = game;
let turns = 0;
while (s.phase === 'playing' && turns < 600) {
  s = aiTakeTurn(s);
  s = endTurn(s);
  turns++;
}

const totalTroops = Object.values(s.territories).reduce(
  (sum, t) => sum + armySize(t.army),
  0
);
const owners = new Set(Object.values(s.territories).map((t) => t.owner));

console.log('Turnos jogados:', turns);
console.log('Rodada final:', s.round);
console.log('Fase final:', s.phase);
console.log('Vencedor idx:', s.winnerIdx);
console.log('Tropas no mapa:', totalTroops);
console.log('Donos distintos:', [...owners].join(', '));
console.log('Renda do P0 agora:', turnIncome(s.territories, 0));
console.log('SMOKE OK');
