// Biome danger estimates, computed in small time slices so the UI never stutters.
import { BIOME } from '../data/world.js';
import { survivalJob } from '../core/survival.js';
import * as G from '../core/game.js';

const cache = new Map();
const queue = [];
let busy = false;
const keyOf = (F, id) => `${id}|${F.maxHp}|${F.maxMp}|${F.def}|${F.dmgMin}|${F.dmgMax}|${F.aps.toFixed(3)}|${F.attMult.toFixed(3)}|${F.hpRegen.toFixed(2)}|${F.dodge.toFixed(3)}|${F.ability?.type}|${F.ability?.power}|${JSON.stringify(F.fx)}`;

function pump() {
  if (busy || !queue.length) return;
  busy = true;
  setTimeout(() => {
    const job = queue[0];
    if (cache.has(job.key)) { queue.shift(); busy = false; pump(); return; }
    job.task ||= job.run();
    let res = null;
    for (const t0 = performance.now(); !res && performance.now() - t0 < 12;) res = job.task.work(3000);
    if (res) { queue.shift(); cache.set(job.key, res); G.emitUi('estimates', {}); }
    busy = false; pump();
  }, 4);
}

/** { hours (until a retreat), kph, level } or null while computing */
export function biomeEstimate(slot, biomeId) {
  const F = G.fighter(slot);
  if (!F) return null;
  const key = keyOf(F, biomeId);
  if (cache.has(key)) return cache.get(key);
  if (!queue.some((j) => j.key === key)) { queue.push({ key, run: () => survivalJob(F, BIOME[biomeId]) }); pump(); }
  return null;
}
