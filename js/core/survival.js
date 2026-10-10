// Survival estimate: run the real engine forward, off-screen, a few times and see when the character falls.
import { CONFIG } from '../config.js';
import { makeRng } from './rng.js';
import { newCombat, step } from './combat.js';
import { biomeEnemy } from './loot.js';

/** Returns { hours (median time to death, Infinity if it survived), kph (kills per hour), level: 'high'|'med'|'low' } */
export function estimateSurvival(F, biome, opts = {}) {
  const hours = opts.hours ?? CONFIG.survivalSimHours;
  const runs = opts.runs ?? CONFIG.survivalRuns;
  const ticks = Math.round((hours * 3600) / CONFIG.tickSeconds);
  const deaths = [];
  let kills = 0, simulated = 0;
  for (let r = 0; r < runs; r++) {
    const rng = makeRng(1234 + r * 7919);
    const cs = newCombat(F);
    let k = 0;
    const src = { next: (g) => biomeEnemy(biome, g), onKill: () => { k++; } };
    let i = 0;
    for (; i < ticks && !cs.dead; i++) step(cs, F, src, rng, null, 'auto');
    deaths.push(cs.dead ? (i * CONFIG.tickSeconds) / 3600 : Infinity);
    kills += k; simulated += (i * CONFIG.tickSeconds) / 3600;
  }
  deaths.sort((a, b) => a - b);
  const med = deaths[Math.floor(deaths.length / 2)];
  const level = med >= CONFIG.survivalHighHours ? 'high' : med >= CONFIG.survivalMedHours ? 'med' : 'low';
  return { hours: med, kph: Math.round(kills / Math.max(simulated, 1e-6)), level };
}
