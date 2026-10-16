// Where the wall is: `node tools/wall.mjs [fromRealm] [toRealm] [step]`
// For each Realm, the lowest level at which the strongest possible party (every item at +10, every potion its cap
// allows, all the Ascension bonuses up to then) beats Vexis, next to the level cap for that Realm. The first
// Realm whose need is above its cap is as far as anyone can go.
import * as G from '../js/core/game.js';
import { BAL } from '../js/data/balance.js';
import { CLASS_IDS } from '../js/data/classes.js';
import { UNIQUES } from '../js/data/uniques.js';
import { STATS } from '../js/data/stats.js';
import { makeUnique, maxUpOf } from '../js/core/items.js';
import { ACHIEVEMENTS } from '../js/data/rewards.js';
import { SLOTS } from '../js/data/gear.js';
import { simulate } from '../js/core/battle.js';
import { LAST_STAGE } from '../js/core/game.js';

for (const a of process.argv.slice(2).filter((x) => x.includes('='))) { const [k, v] = a.split('='); BAL[k] = Number(v); }
const args = process.argv.slice(2).filter((a) => !a.includes('='));
const FROM = Number(args[0] ?? 0), TO = Number(args[1] ?? 40), STEP = Number(args[2] ?? 5), TOP = Number(process.env.TOP || 4);
G.resetAll();
const S = G.state;
for (const c of CLASS_IDS) S.classes[c] = { lv: 1, gear: {}, pots: {} };
for (const U of UNIQUES) { const it = makeUnique(S.nextId++, U.id); it.up = 10; S.inv.push(it); S.uniques[U.id] = 1; }
const strip = () => { for (const k of CLASS_IDS) for (const s of SLOTS) { const it = S.classes[k].gear[s]; if (it) { S.inv.push(it); delete S.classes[k].gear[s]; } } };
function setRealm(r) {
  S.mult = { fame: 1, dmg: 1, offline: 0, drops: 0 };
  for (let n = 1; n <= r; n++) { const g = BAL.ascendGain(n); S.mult.dmg *= 1 + g * BAL.ascendDmg; S.mult.fame *= 1 + g; }
  S.ascensions = r; S.realm = r; S.peak = r;
  // every achievement, every Realm reward so far, the Companion at its cap, every item at its Awakened max
  S.ach = Object.fromEntries(ACHIEVEMENTS.map((A) => [A.id, 1])); G.syncAwaken(); S.pet = { lv: G.petCap() };
  for (const it of G.allItems()) it.up = maxUpOf(it);
  for (const c of CLASS_IDS) for (const st of STATS) S.classes[c].pots[st] = G.potCap(c, st);
}
function useParty(p, lv) { strip(); for (const k of CLASS_IDS) S.classes[k].lv = lv; S.party = [...p]; S.form = [...p]; for (const k of p) G.equipBest(k); }
// the strongest trios by party power, tried in the fight itself
setRealm(15);
const trios = [];
for (let a = 0; a < CLASS_IDS.length; a++) for (let b = a + 1; b < CLASS_IDS.length; b++) for (let c = b + 1; c < CLASS_IDS.length; c++) {
  const p = [CLASS_IDS[a], CLASS_IDS[b], CLASS_IDS[c]]; useParty(p, 140); trios.push({ p, pw: G.partyPower() });
}
const parties = trios.sort((x, y) => y.pw - x.pw).slice(0, TOP).map((x) => x.p);
const wins = (r, lv, p) => { useParty(p, lv); const st = G.partyStats(); return [1, 2, 3].filter((seed) => simulate(LAST_STAGE, r, st, seed * 7919, G.battleExtra()).won).length >= 2; };
console.log(`parties tried: ${parties.map((p) => p.join('/')).join('  ')}`);
for (let r = FROM; r <= TO; r += STEP) {
  setRealm(r);
  let need = Infinity, who = null;
  for (const p of parties) {
    let lo = 1, hi = Math.min(need, 600);
    if (!wins(r, hi, p)) continue;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (wins(r, m, p)) hi = m; else lo = m; }
    if (hi < need) { need = hi; who = p; }
  }
  const cap = G.levelCapFor(r);
  console.log(`Realm ${String(r + 1).padStart(2)}  needs lv ${String(need).padStart(3)}  cap ${cap}  ${need > cap ? 'WALL' : ''}  (${who?.join('/')})`);
}
