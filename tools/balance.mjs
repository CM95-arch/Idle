// Balance report: `node tools/balance.mjs`
// Simulates reference builds in every biome and prints time-to-death and kills per hour.
import { CLASS, STATS } from '../js/data/classes.js';
import { BIOMES, ENEMY_CURVE } from '../js/data/world.js';
import { newCharacter, fighterOf, dpsOf } from '../js/core/character.js';
import { estimateSurvival } from '../js/core/survival.js';

const state = { exalt: {} };
export function build(cls, g, m) {
  const c = newCharacter('x', cls, 'x');
  const C = CLASS[cls];
  for (const k of STATS) c.stats[k] = Math.round(c.stats[k] + (C.max[k] - c.stats[k]) * m);
  const t = Math.max(1, Math.min(14, g));
  c.equip = { weapon: `${C.weapon}_t${t}`, ability: `${C.ability}_t${t}`, armor: `${C.armor}_t${t}`, ring: g >= 2 ? `ring_hp_t${Math.max(1, t - 1)}` : null };
  return fighterOf(c, state);
}
// recommended build per biome: [gear tier, maxed fraction]
export const REC = { forest: [1, 0], plains: [3, 0], desert: [4, 0], sprite: [6, 0], city: [7, 0.1], hell: [8, 0.3], abyss: [9, 0.6], godlands: [10, 0.9] };
export const fmt = (h) => (h === Infinity ? '  safe ' : h >= 1 ? `${h.toFixed(1).padStart(5)}h ` : `${Math.round(h * 60).toString().padStart(4)}m  `);
if (import.meta.url.endsWith(process.argv[1]) && !String(process.argv[2]).startsWith("dungeons")) main();
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

// ---- dungeons: `node tools/balance.mjs dungeons [class]` ----
import { DUNGEONS } from '../js/data/world.js';
import { createRun, advanceRun } from '../js/core/dungeon.js';
const RECG = [1, 3, 4, 6, 7, 8, 9, 10, 11.5, 12.5, 13.5];
const RECM = [0, 0, 0, 0, 0.1, 0.3, 0.6, 0.9, 1, 1, 1];
const lerp = (arr, L) => { const i = Math.min(Math.floor(L) - 1, arr.length - 2); const f = L - 1 - i; return arr[i] + (arr[i + 1] - arr[i]) * f; };
export function dungeonReport(cls = 'wizard', runs = 12) {
  console.log(`\n== dungeons · ${cls} ==   success rate over ${runs} closed-app runs (and minutes per clear)   rec-1 | rec | rec+1`);
  for (const d of DUNGEONS) {
    const g = Math.round(lerp(RECG, d.L)), m = Math.round(lerp(RECM, d.L) * 10) / 10;
    const cells = [g - 1, g, g + 1].map((gg) => {
      const F = build(cls, gg, m);
      let wins = 0, mins = 0;
      for (let r = 0; r < runs; r++) {
        const run = createRun(d.id, F, 1000 + r * 31);
        advanceRun(run, F, 20 * 60 * 10, null, 'auto');
        if (run.phase === 'won') { wins++; mins += (run.ticks / 10) / 60; }
      }
      return `${String(Math.round((wins / runs) * 100)).padStart(3)}% ${wins ? (mins / wins).toFixed(1).padStart(4) + 'm' : '   — '}`;
    });
    console.log(`${d.name.padEnd(24)} L${String(d.L).padEnd(4)} g${String(g).padStart(2)} m${m}  | ${cells.join(' | ')}`);
  }
}
if (process.argv[2] === 'dungeons') dungeonReport(process.argv[3] || 'wizard');
import { CONFIG } from '../js/config.js';
if (process.argv[2] === 'dungeons-live') { CONFIG.closedAppDodgeChance = 0.9; CONFIG.closedAppAbilityDelay = 0; console.log('(live estimate: 90% dodges, instant casts)'); dungeonReport(process.argv[3] || 'wizard'); }
