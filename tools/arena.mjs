// Prototype report: `node tools/arena.mjs [minutes]` — kills/min and deaths per weapon and ability rule.
import { newArena, stepArena, WEAPONS, WAVES } from '../js/proto/arena.js';
import { newCharacter, fighterOf } from '../js/core/character.js';
import { weaponStats } from '../js/data/items.js';
import { makeRng } from '../js/core/rng.js';

export function simulate(F, base, loadout, minutes = 15, seed = 7, only = null) {
  const A = newArena(F), rng = makeRng(seed);
  A.only = only;
  const ticks = minutes * 600;
  for (let i = 0; i < ticks; i++) stepArena(A, F, loadout, base, rng, null);
  return { kpm: A.stats.kills / minutes, deaths: A.stats.deaths, waves: A.stats.waves, dps: A.stats.dmg / A.stats.time };
}
if (import.meta.url.endsWith(process.argv[1])) {
  const F = fighterOf(newCharacter(1, 'wizard', 'x'), { exalt: {} });
  const w = weaponStats('wand', 1), base = (w.dmgMin + w.dmgMax) / 2;
  const min = Number(process.argv[2] || 15);
  console.log('by wave: ' + WAVES.map((w) => w.name).join(' / '));
  for (const k of Object.keys(WEAPONS)) {
    const r = simulate(F, base, { weapon: k, ability: 'meteor', rule: 'pack' }, min);
    const per = WAVES.map((w) => simulate(F, base, { weapon: k, ability: 'meteor', rule: 'pack' }, 5, 7, w.name).kpm.toFixed(1).padStart(5)).join(' ');
    console.log(`${k.padEnd(10)} kills/min ${r.kpm.toFixed(1).padStart(5)}  dps ${Math.round(r.dps).toString().padStart(4)}  deaths ${r.deaths}  waves ${r.waves} | by wave: ${per}`);
  }
}
