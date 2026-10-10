// Balance report: `node tools/balance.mjs`
// Simulates reference builds in every biome and prints time-to-death and kills per hour.
import { BIOMES, ENEMY_CURVE } from '../js/data/world.js';
import { fighterOf, dpsOf, referenceCharacter } from '../js/core/character.js';
import { estimateSurvival } from '../js/core/survival.js';

const state = { exalt: {} };
/** A level-20 character of class cls, every slot at gear tier g, potions m of the way from level-20 stats to max. */
export function build(cls, g, m) {
  return fighterOf(referenceCharacter(cls, g, m), state);
}
// recommended build per biome: [gear tier, maxed fraction]
export const REC = { forest: [1, 0], plains: [3, 0], desert: [4, 0], sprite: [6, 0], city: [7, 0.1], hell: [8, 0.3], abyss: [9, 0.6], godlands: [10, 0.9] };
export const fmt = (h) => (h === Infinity ? '  safe ' : h >= 1 ? `${h.toFixed(1).padStart(5)}h ` : `${Math.round(h * 60).toString().padStart(4)}m  `);
if (import.meta.url.endsWith(process.argv[1])) main();
function main() {
const classes = process.argv[2] ? process.argv[2].split(',') : ['wizard', 'warrior', 'priest', 'rogue'];
const hours = Number(process.argv[3] || 8);
for (const cls of classes) {
  console.log(`\n== ${cls} ==   (gear tier g, maxed fraction m)   columns: fresh T1 | rec-2 | rec-1 | rec | rec+1`);
  for (const b of BIOMES) {
    const [g, m] = REC[b.id];
    const cells = [[1, 0], [g - 2, m], [g - 1, m], [g, m], [g + 1, m]].map(([gg, mm]) => {
      if (gg < 1) return '   —          ';
      const F = build(cls, gg, mm);
      const r = estimateSurvival(F, b, { hours, runs: 3 });
      return `${fmt(r.hours)}${String(r.kph).padStart(5)}/h`;
    });
    const F = build(cls, g, m);
    const fight = ENEMY_CURVE.hp(b.L) / Math.max(1, dpsOf(F) - ENEMY_CURVE.def(b.L) * F.shots * F.aps);
    console.log(`${b.name.padEnd(15)} g${String(g).padStart(2)} m${m}  dps${String(dpsOf(F)).padStart(5)} fight${fight.toFixed(1).padStart(5)}s | ${cells.join(' | ')}`);
  }
}
}

// A level-20 character's potion progress expected at gear tier g (more potions by the time you reach deeper gear).
export const recM = (g) => Math.round(Math.max(0, Math.min(1, (g - 6.6) / 3.7)) * 10) / 10;
