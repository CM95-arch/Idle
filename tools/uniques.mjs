// Unique balance report: `node tools/uniques.mjs [level]`
// For each Unique: how many stages further a party gets when one member wears it, compared with wearing
// an empty slot. Every Unique should be a clear upgrade; Mythic ones a big one.
import { CLASS_IDS } from '../js/data/classes.js';
import { UNIQUES } from '../js/data/uniques.js';
import { heroStats } from '../js/core/heroes.js';
import { fits, slotOf, makeUnique, setUniqueLevel } from '../js/core/items.js';
import { simulate } from '../js/core/battle.js';

const LV = Number(process.argv[2] || 30), ILVL = Math.round(LV / 1.55);
setUniqueLevel(ILVL);
const gear = (cls, swap) => (swap ? { [slotOf(swap)]: swap } : {});
const stats = (cls, swap) => heroStats(cls, { lv: LV, gear: gear(cls, swap) }, {});
function reach(st) {
  const S = ILVL - (ILVL % 10) + 8;
  const ok = (r) => [1, 2, 3].filter((seed) => simulate(S, r, st, seed * 7919).won && simulate(S + 1, r, st, seed * 7919).won).length >= 2;
  let lo = -4, hi = 6; for (let i = 0; i < 13; i++) { const m = (lo + hi) / 2; if (ok(m)) lo = m; else hi = m; }
  return (lo * Math.log(2)) / Math.log(1.16);
}
// ONLY=id1,id2 limits the report to those Uniques
const ONLY = process.env.ONLY?.split(',');
for (const U of UNIQUES.filter((u) => !ONLY || ONLY.includes(u.id))) {
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
  console.log(`${U.name.padEnd(26)} ${(U.exalted ? '★ ' : '') + [U.shot && `${U.shot.n}×shot`, U.abil?.mode, U.proc?.kind, ...Object.keys(U.fx || {}), U.rot && 'stats'].filter(Boolean).join('+').padEnd(26)} ${(sum / n >= 0 ? '+' : '') + (sum / n).toFixed(2)} stages`);
}
