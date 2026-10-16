// Endgame pacing: `node tools/endgame.mjs [maxHoursPerRealm] [activeMinutes] [awayMinutes]`
// A best-case player who has done everything up to the Fractured Keep: 15 Ascensions behind them, every piece of gear
// at +10, the strongest party there is. It plays on from Realm XVI and prints how long each Realm takes, so the
// final Realm can sit just past what such a player can reach. Stops when one Realm takes longer than the limit.
import * as G from '../js/core/game.js';
import { BAL } from '../js/data/balance.js';
import { CLASS_IDS } from '../js/data/classes.js';
import { UNIQUES } from '../js/data/uniques.js';
import { STATS } from '../js/data/stats.js';
import { TICK } from '../js/core/battle.js';
import { makeUnique, upgradeCost, canUpgrade } from '../js/core/items.js';
import { SLOTS } from '../js/data/gear.js';
import { TIERS } from '../js/data/zones.js';

for (const a of process.argv.slice(2).filter((x) => x.includes('='))) { const [k, v] = a.split('='); BAL[k] = Number(v); }
const args = process.argv.slice(2).filter((a) => !a.includes('='));
const LIMIT = Number(args[0] || 2000), ACTIVE = Number(args[1] || 30), AWAY = Number(args[2] || 15), START = Number(process.env.START || 15);
const fmt = (s) => { const h = s / 3600; return h < 48 ? `${h.toFixed(1)}h` : `${(h / 24).toFixed(1)}d`; };

G.resetAll();
const S = G.state;
// 15 Ascensions' worth of bonuses
for (let n = 1; n <= START; n++) { const g = BAL.ascendGain(n); S.mult.dmg *= 1 + g * BAL.ascendDmg; S.mult.fame *= 1 + g; S.mult.offline += g * 0.15; S.mult.drops += g * 0.3; }
S.ascensions = START; S.realm = START; S.dtier = TIERS; S.flags = { ...S.flags, tour: true, intro: true, leveled: true, prog2: true };
for (const c of CLASS_IDS) S.classes[c] = { lv: 1, gear: {}, pots: {} };
for (const c of CLASS_IDS) for (const st of STATS) S.classes[c].pots[st] = Math.floor(G.potCap(c, st) * BAL.keepPotions);
// every piece of gear, maxed
for (const U of UNIQUES) { const it = makeUnique(S.nextId++, U.id); it.up = 10; S.inv.push(it); S.uniques[U.id] = 1; }
// the strongest party: every trio, each wearing its best, scored by party power at a common level
let best = null;
for (let a = 0; a < CLASS_IDS.length; a++) for (let b = a + 1; b < CLASS_IDS.length; b++) for (let c = b + 1; c < CLASS_IDS.length; c++) {
  const party = [CLASS_IDS[a], CLASS_IDS[b], CLASS_IDS[c]];
  for (const k of CLASS_IDS) { for (const s of SLOTS) { const it = S.classes[k].gear[s]; if (it) { S.inv.push(it); delete S.classes[k].gear[s]; } } S.classes[k].lv = 60; }
  S.party = party; for (const k of party) G.equipBest(k);
  const p = G.partyPower();
  if (!best || p > best.p) best = { p, party };
}
for (const k of CLASS_IDS) { for (const s of SLOTS) { const it = S.classes[k].gear[s]; if (it) { S.inv.push(it); delete S.classes[k].gear[s]; } } S.classes[k].lv = 1; }
S.party = best.party; S.form = [...best.party]; for (const k of best.party) G.equipBest(k);
console.log(`party: ${best.party.join(', ')}`);

function manage() {
  for (let guard = 0; guard < 6000; guard++) {
    const lowest = S.party.reduce((a, b) => (S.classes[b].lv < S.classes[a].lv ? b : a));
    const lc = G.levelCost(lowest);
    let pot = null;
    for (const c of S.party) for (const s of STATS) if (!G.statMaxed(c, s)) { const e = (G.potionCost(c, s) * G.potCap(c, s)) / BAL.potRef; if (!pot || e < pot.e) pot = { c, s, e }; }
    let up = null;
    for (const c of S.party) for (const s of SLOTS) { const it = S.classes[c].gear[s]; if (it && canUpgrade(it) && (!up || upgradeCost(it) < upgradeCost(up))) up = it; }
    if (up && S.fame >= upgradeCost(up) && upgradeCost(up) < lc) G.upgrade(up.id);
    else if (pot && pot.e < lc && S.fame >= G.potionCost(pot.c, pot.s)) G.drink(pot.c, pot.s);
    else if (S.fame >= lc) G.levelUp(lowest);
    else break;
  }
}

S.autoPush = true;
let t = 0, realmStart = 0, now = Date.now();
G.startBattle();
for (;;) {
  const end = t + ACTIVE * 60;
  let mt = 0;
  while (t < end) {
    G.tickBattle(); t += TICK; mt += TICK;
    if (G.battle.state !== 'fight') G.nextBattle();
    if (mt > 20) {
      mt = 0; manage();
      if (G.canAscend()) {
        console.log(`Realm ${S.realm + 1} cleared in ${fmt(t - realmStart)} (total ${fmt(t)})  lv ${S.party.map((c) => S.classes[c].lv).join('/')}`);
        G.ascend(); realmStart = t; manage(); G.startBattle();
      }
    }
  }
  S.lastSeen = now; now += AWAY * 60 * 1000; t += AWAY * 60;
  G.collectOffline(now); manage(); G.nextBattle();
  if (t - realmStart > LIMIT * 3600) { console.log(`Realm ${S.realm + 1}: not cleared after ${fmt(t - realmStart)} (best stage ${S.best + 1}/70)  lv ${S.party.map((c) => S.classes[c].lv).join('/')}`); break; }
}
