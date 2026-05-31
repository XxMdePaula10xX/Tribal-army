// Harness de balanceamento: roda muitas partidas só de IAs e mede
// quão decisivas elas são (vitória real vs. empate por limite de rodadas).
import { DMG_SCALE } from '../src/constants/game';
import { createGame, endTurn, aiTakeTurn } from '../src/game';
import type { Difficulty } from '../src/constants/game';

const GAMES = 80;

function runOne(diffs: Difficulty[]): { round: number; winner: number | null; decisive: boolean } {
  let s = createGame(
    diffs.map((d, i) => ({ name: `IA ${i}`, isHuman: false, difficulty: d }))
  );
  let guard = 0;
  while (s.phase === 'playing' && guard < 5000) {
    s = aiTakeTurn(s);
    s = endTurn(s);
    guard++;
  }
  // "decisive" = alguém conquistou tudo (e não foi só liderança por timeout).
  const decisive =
    s.winnerIdx !== null &&
    Object.values(s.territories).every((t) => t.owner === s.winnerIdx);
  return { round: s.round, winner: s.winnerIdx, decisive };
}

const mixes: Difficulty[][] = [
  ['dificil', 'medio', 'facil'],
  ['medio', 'medio', 'medio'],
  ['dificil', 'dificil', 'medio', 'facil'],
  ['facil', 'facil'],
];

console.log(`DMG_SCALE = ${DMG_SCALE}\n`);

let totalDecisive = 0;
let totalRounds = 0;
let total = 0;

for (const mix of mixes) {
  let decisive = 0;
  let rounds = 0;
  const n = Math.round(GAMES / mixes.length);
  for (let i = 0; i < n; i++) {
    const r = runOne(mix);
    if (r.decisive) decisive++;
    rounds += r.round;
  }
  totalDecisive += decisive;
  totalRounds += rounds;
  total += n;
  console.log(
    `[${mix.join(',').padEnd(28)}] decisivas ${decisive}/${n}` +
      `  rodada média ${(rounds / n).toFixed(1)}`
  );
}

console.log(
  `\nTOTAL: decisivas ${totalDecisive}/${total} (${((totalDecisive / total) * 100).toFixed(0)}%)` +
    `  rodada média ${(totalRounds / total).toFixed(1)}`
);
