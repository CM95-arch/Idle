// Unique balance report: `node tools/uniques.mjs [level]`
// For each Unique: how many stages further a party gets when one member wears it, compared with wearing
// a Rare of the same slot and item level. Aim for every Unique to be a clear but not game-breaking upgrade.
import { CLASS_IDS } from '../js/data/classes.js';
import { SLOTS } from '../js/data/gear.js';
import { UNIQUES } from '../js/data/uniques.js';
import { heroStats } from '../js/core/heroes.js';
import { kindFor, fits, slotOf, makeUnique, setUniqueLevel } from '../js/core/items.js';
import { simulate } from '../js/core/battle.js';

const LV = Number(process.argv[2] || 30), ILVL = Math.round(LV / 1.55);
setUniqueLevel(ILVL);
const rare = (cls, s) => ({ id: 0, kind: kindFor(cls, s), ilvl: ILVL, rarity: 2, up: 3, extras: [], ring: 'atk' });
const gear = (cls, swap) => Object.fromEntries(SLOTS.map((s) => [s, swap && slotOf(swap) === s ? swap : rare(cls, s)]));
const stats = (cls, swap) => heroStats(cls, { lv: LV, gear: gear(cls, swap) }, {});
function reach(st) {
  const S = ILVL - (ILVL % 10) + 8;
  const ok = (r) => [1, 2, 3].filter((seed) => simulate(S, r, st, seed * 7919).won && simulate(S + 1, r, st, seed * 7919).won).length >= 2;
  let lo = -4, hi = 6; for (let i = 0; i < 13; i++) { const m = (lo + hi) / 2; if (ok(m)) lo = m; else hi = m; }
  return (lo * Math.log(2)) / Math.log(1.16);
}
for (const U of UNIQUES) {
  const wearers = CLASS_IDS.filter((c) => fits(c, { kind: U.kind }));
  let sum = 0, n = 0;
  for (const w of wearers.slice(0, 3)) {
    const others = CLASS_IDS.filter((c) => c !== w);
    for (let k = 0; k < 3; k++) {
      const party = [w, others[(k * 3) % others.length], others[(k * 3 + 5) % others.length]];
      const it = { ...makeUnique(0, U.id), up: 3 };
      const base = reach(party.map((c) => stats(c))), withU = reach(party.map((c, i) => stats(c, i === 0 ? it : null)));
      sum += withU - base; n++;
    }
  }
  console.log(`${U.name.padEnd(26)} ${(U.exalted ? '★ ' : '') + Object.keys(U.fx).join('+').padEnd(26)} ${(sum / n >= 0 ? '+' : '') + (sum / n).toFixed(2)} stages`);
}
