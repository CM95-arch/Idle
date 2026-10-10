// Finds the enemy level L for each dungeon so a character with every slot one tier under the dungeon
// (and the expected potions, see recM) clears it about `target` of the time with the app closed.
// `node tools/tune-dungeons.mjs [class] [target]` prints suggested L values for world.js.
import { DUNGEONS } from '../js/data/world.js';
import { createRun, advanceRun } from '../js/core/dungeon.js';
import { build, recM } from './balance.mjs';

const cls = process.argv[2] || 'wizard', target = Number(process.argv[3] || 0.8), runs = 24;
function rate(d, L, F) {
  const old = d.L; d.L = L;
  let wins = 0;
  for (let r = 0; r < runs; r++) {
    const run = createRun(d.id, F, 5000 + r * 37);
    advanceRun(run, F, 20 * 60 * 10, null, 'auto');
    if (run.phase === 'won') wins++;
  }
  d.L = old;
  return wins / runs;
}
let prev = 0;
for (const d of DUNGEONS) {
  const g = d.tier - 1, F = build(cls, g, recM(g));
  let lo = Math.max(0.5, prev), hi = 25;
  for (let i = 0; i < 14; i++) { const mid = (lo + hi) / 2; if (rate(d, mid, F) >= target) lo = mid; else hi = mid; }
  const L = Math.round(Math.max(prev + 0.1, lo) * 10) / 10;
  prev = L;
  console.log(`${d.id.padEnd(14)} T${d.tier}  L ${L}`);
}
