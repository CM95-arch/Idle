// Dungeon report: `node tools/arena-bot.mjs [class] [runs]`
// A simple bot plays every dungeon: it stays in weapon range, weaves side to side, casts when it can.
// It never aims to dodge, so a person playing should do better. Columns: gear one tier under | built-for tier | one over.
import { DUNGEONS } from '../js/data/world.js';
import { createRun, step, arenaFighter } from '../js/core/arena.js';
import { referenceCharacter, fighterOf } from '../js/core/character.js';
import { recM } from './balance.mjs';

const RANGE = { staff: 340, wand: 380, bow: 320, sword: 145, dagger: 200 };
export function botRun(d, cls, g, m, seed) {
  const F = arenaFighter(fighterOf(referenceCharacter(cls, g, m), { exalt: {} }), cls);
  const R = createRun(d, F, cls, seed);
  const input = { target: null, cast: false };
  let t = 0;
  while (t < 600 && !['dead', 'won'].includes(R.phase)) {
    const e = R.enemies.reduce((a, b) => (!a || b.y > a.y ? b : a), null);
    const ty = e ? Math.min(600, e.y + RANGE[F.weaponType] * 0.75) : 560;
    input.target = { x: 180 + Math.sin(t * 0.9 + seed) * 130, y: ty };
    if (R.hero.mp > F.maxMp * 0.6) input.cast = true;
    step(R, F, input, 1 / 60); t += 1 / 60;
  }
  return { won: R.phase === 'won', t };
}
const cls = process.argv[2] || 'wizard', runs = Number(process.argv[3] || 6);
console.log(`== ${cls} · bot clear rate over ${runs} runs (avg minutes) ==   gear T-1 | T (built for) | T+1`);
for (const d of DUNGEONS) {
  const cells = [d.rec - 1, d.rec, d.rec + 1].map((g) => {
    if (g < 1) return '     —      ';
    let wins = 0, time = 0;
    for (let r = 0; r < runs; r++) { const res = botRun(d, cls, g, recM(g), 100 + r * 17); if (res.won) { wins++; time += res.t; } }
    return `${String(Math.round((wins / runs) * 100)).padStart(3)}% ${wins ? (time / wins / 60).toFixed(1).padStart(4) + 'm' : '   — '}`;
  });
  console.log(`${d.name.padEnd(24)} T${String(d.rec).padEnd(3)} | ${cells.join(' | ')}`);
}
