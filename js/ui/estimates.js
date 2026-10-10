// Survival and clear-chance estimates, computed in small slices so the UI never stutters.
import { BIOME } from '../data/world.js';
import { survivalJob } from '../core/survival.js';
import { createRun, advanceRun } from '../core/dungeon.js';
import * as G from '../core/game.js';

const cache = new Map();
const queue = [];
let busy = false;
const keyOf = (F, kind, id) => `${kind}|${id}|${F.maxHp}|${F.maxMp}|${F.def}|${F.dmgMin}|${F.dmgMax}|${F.aps.toFixed(3)}|${F.attMult.toFixed(3)}|${F.hpRegen.toFixed(2)}|${F.dodge.toFixed(3)}|${F.ability?.type}|${F.ability?.power}|${F.weaponType}|${JSON.stringify(F.fx)}`;

function pump() {
  if (busy || !queue.length) return;
  busy = true;
  setTimeout(() => {
    const job = queue[0];
    if (cache.has(job.key)) { queue.shift(); busy = false; pump(); return; }
    // work in ~10ms slices so the game keeps drawing while estimates run
    job.task ||= job.run();
    let res = null;
    if (typeof job.task.work !== 'function') res = job.task;
    else for (const t0 = performance.now(); !res && performance.now() - t0 < 12;) res = job.task.work(1500);
    if (res) { queue.shift(); cache.set(job.key, res); G.emitUi('estimates', {}); }
    busy = false; pump();
  }, 4);
}
function get(F, kind, id, run) {
  const key = keyOf(F, kind, id);
  if (cache.has(key)) return cache.get(key);
  if (!queue.some((j) => j.key === key)) { queue.push({ key, run }); pump(); }
  return null;
}

/** { hours, kph, level } or null while computing */
export function biomeEstimate(slot, biomeId) {
  const F = G.fighter(slot);
  return F ? get(F, 'b', biomeId, () => survivalJob(F, BIOME[biomeId])) : null;
}

/** { rate (0–1), level } — clear chance with the app closed */
export function dungeonEstimate(slot, dungeonId) {
  const F = G.fighter(slot);
  if (!F) return null;
  return get(F, 'd', dungeonId, () => {
    const runs = 6; let wins = 0;
    for (let r = 0; r < runs; r++) {
      const run = createRun(dungeonId, F, 500 + r * 97);
      advanceRun(run, F, 15 * 60 * 10, null, 'auto');
      if (run.phase === 'won') wins++;
    }
    const rate = wins / runs;
    return { rate, level: rate >= 0.8 ? 'high' : rate >= 0.4 ? 'med' : 'low' };
  });
}
export const LEVEL_TEXT = { high: 'High', med: 'Medium', low: 'Low' };
