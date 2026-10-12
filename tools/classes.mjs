// Class balance report: `node tools/classes.mjs [level]`
// Every class at the same level with the same gear. For each class: how far every party it can be in gets
// (averaged over all partner pairs), plus its solo damage per second against a three-enemy wave.
import { CLASSES, CLASS_IDS } from '../js/data/classes.js';
import { SLOTS } from '../js/data/gear.js';
import { heroStats } from '../js/core/heroes.js';
import { kindFor } from '../js/core/items.js';
import { simulate, createBattle, stepBattle } from '../js/core/battle.js';

const LV = Number(process.argv[2] || 30), ILVL = Math.round(LV / 1.55);
const gear = (cls) => Object.fromEntries(SLOTS.map((s) => [s, { id: 0, kind: kindFor(cls, s), ilvl: ILVL, rarity: 2, up: 3, extras: [], ring: 'atk' }]));
const stats = (cls) => heroStats(cls, { lv: LV, gear: gear(cls) }, {});
function reach(party) {
  // the hardest fight this party wins 2 of 3 times, found by scaling enemy HP and ATK continuously
  // (a fractional Realm). Reported as stages: +1 means it beats enemies one stage stronger.
  const st = party.map(stats), S = ILVL - (ILVL % 10) + 8;
  // a normal stage and the boss stage after it
  const ok = (r) => [1, 2, 3].filter((seed) => simulate(S, r, st, seed * 7919).won && simulate(S + 1, r, st, seed * 7919).won).length >= 2;
  let lo = -4, hi = 4;
  for (let i = 0; i < 14; i++) { const m = (lo + hi) / 2; if (ok(m)) lo = m; else hi = m - 1e-9; }
  return S + (lo * Math.log(2)) / Math.log(1.16);
}
function soloDps(cls) {
  // damage dealt in 30s to a wave that can't die or hurt back
  const B = createBattle(ILVL, 0, [stats(cls)], 1);
  let dmg = 0;
  const big = { hp: 1e12 };
  for (let i = 0; i < 640; i++) {
    for (const e of B.enemies) { if (e.hp < 1e11) Object.assign(e, { hp: big.hp, maxHp: big.hp }); e.atk = 0; }
    stepBattle(B);
    for (const ev of B.events) if (ev.k === 'hit') dmg += ev.dmg;
    B.events.length = 0;
  }
  return dmg / 30;
}
const rows = [];
for (const c of CLASS_IDS) {
  const others = CLASS_IDS.filter((x) => x !== c);
  let sum = 0, n = 0;
  for (let i = 0; i < others.length; i++) for (let j = i + 1; j < others.length; j++) { sum += reach([c, others[i], others[j]]); n++; }
  const s = stats(c);
  rows.push([c, sum / n, soloDps(c), s.hp, s.def]);
}
const avg = rows.reduce((a, r) => a + r[1], 0) / rows.length;
console.log(`Level ${LV}, item level ${ILVL}. "party" = average best stage of every party with this class (mean ${avg.toFixed(1)})`);
for (const [c, r, d, hp, def] of rows.sort((a, b) => b[1] - a[1])) console.log(`${CLASSES[c].name.padEnd(12)} party ${r.toFixed(1).padStart(5)} (${(r - avg >= 0 ? '+' : '') + (r - avg).toFixed(1)})  solo dps ${d.toFixed(0).padStart(6)}  hp ${hp}  def ${def.toFixed(0)}`);
