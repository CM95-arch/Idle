// Survival estimate: run the real engine forward, off-screen, a few times and see when the character falls.
import { CONFIG } from '../config.js';
import { makeRng } from './rng.js';
import { newCombat, step } from './combat.js';
import { biomeWave } from './loot.js';

/**
 * A resumable estimate: call job.work(ticks) until it returns a result.
 * Result: { hours (cautious time to death, Infinity if it survived), kph (kills per hour, in classic-enemy units), level }
 */
export function survivalJob(F, biome, opts = {}) {
  const hours = opts.hours ?? CONFIG.survivalSimHours;
  const runs = opts.runs ?? CONFIG.survivalRuns;
  const ticks = Math.round((hours * 3600) / CONFIG.tickSeconds);
  const deaths = [];
  let kills = 0, simulated = 0, r = 0, i = 0, cs = null, rng = null, src = null, k = 0;
  const begin = () => {
    rng = makeRng(1234 + r * 7919); cs = newCombat(F); i = 0; k = 0;
    src = { wave: (g) => biomeWave(biome, g), onKill: (e) => { k += e.worth ?? 1; } };
  };
  begin();
  return {
    work(budget) {
      while (budget > 0) {
        const n = Math.min(budget, ticks - i);
        for (let j = 0; j < n && !cs.dead; j++, i++) step(cs, F, src, rng, null, 'auto');
        budget -= n;
        if (cs.dead || i >= ticks) {
          deaths.push(cs.dead ? (i * CONFIG.tickSeconds) / 3600 : Infinity);
          kills += k; simulated += (i * CONFIG.tickSeconds) / 3600;
          // stop early once the cautious answer can't change: all but one run survived the whole time
          if (++r >= runs || deaths.filter((d) => d === Infinity).length >= runs - 1) {
            deaths.sort((a, b) => a - b);
            // a cautious pick: the second-worst run (survival times vary a lot between runs)
            const med = deaths[Math.min(1, deaths.length - 1)];
            const level = med >= CONFIG.survivalHighHours ? 'high' : med >= CONFIG.survivalMedHours ? 'med' : 'low';
            return { hours: med, kph: Math.round(kills / Math.max(simulated, 1e-6)), level };
          }
          begin();
        }
      }
      return null;
    },
  };
}

export function estimateSurvival(F, biome, opts = {}) {
  const job = survivalJob(F, biome, opts);
  let res = null;
  while (!res) res = job.work(1e6);
  return res;
}
