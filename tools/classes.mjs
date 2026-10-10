// Class balance summary: `node tools/classes.mjs`
// For every class at matched gear (rec) and one tier under (rec-1), averaged over biomes 2–8:
// kills/hour and survival hours (capped at 8) at matched gear, one tier under and two tiers under.
import { CLASSES } from '../js/data/classes.js';
import { BIOMES } from '../js/data/world.js';
import { build, REC } from './balance.mjs';
import { dpsOf } from '../js/core/character.js';
import { estimateSurvival } from '../js/core/survival.js';

const cap = (h) => Math.min(h, 8);
const only = process.argv[2]?.split(',');
const rows = [];
for (const C of CLASSES.filter((c) => !only || only.includes(c.id))) {
  let kph = 0, surv = 0, survLow = 0, survLow2 = 0, dps = 0, n = 0;
  for (const b of BIOMES.slice(1)) {
    const [g, m] = REC[b.id];
    const F = build(C.id, g, m), Fl = build(C.id, g - 1, m), Fl2 = build(C.id, g - 2, m);
    const r = estimateSurvival(F, b, { hours: 8, runs: 3 }), rl = estimateSurvival(Fl, b, { hours: 8, runs: 3 });
    survLow2 += cap(estimateSurvival(Fl2, b, { hours: 8, runs: 3 }).hours);
    kph += r.kph; surv += cap(r.hours); survLow += cap(rl.hours); dps += dpsOf(F); n++;
  }
  rows.push([C.id, Math.round(kph / n), (surv / n).toFixed(1), (survLow / n).toFixed(1), Math.round(dps / n), (survLow2 / n).toFixed(1)]);
}
const avgK = rows.reduce((a, r) => a + r[1], 0) / rows.length;
console.log('class        kph   (vs avg)  surv@rec  surv@rec-1  surv@rec-2  dps');
for (const [c, k, s, sl, d, sl2] of rows) console.log(`${c.padEnd(12)} ${String(k).padStart(4)}  ${(((k / avgK) - 1) * 100).toFixed(0).padStart(5)}%    ${s.padStart(4)}h     ${sl.padStart(4)}h      ${sl2.padStart(4)}h     ${d}`);
