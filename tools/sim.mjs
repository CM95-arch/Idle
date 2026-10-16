// Pacing report: `node tools/sim.mjs [hours] [activeMinutes] [awayMinutes]`
// A scripted player: plays actively for a while (spending Fame, equipping upgrades, picking a party), then leaves
// the game idle, and repeats. Prints when each class unlocks, when each zone boss first falls, and Ascensions.
import * as G from '../js/core/game.js';
import { BAL } from '../js/data/balance.js';
import { CLASSES } from '../js/data/classes.js';
import { SLOTS } from '../js/data/gear.js';
import { zoneOf, isBoss, stageLabel } from '../js/data/zones.js';
import { TICK } from '../js/core/battle.js';
import { STATS, potionsToMax } from '../js/data/stats.js';
import { itemScore, slotOf, upgradeCost, canUpgrade, fits } from '../js/core/items.js';

// extra args like levelCostGrowth=1.13 override numbers in js/data/balance.js for this run
const args = process.argv.slice(2).filter((a) => !a.includes('='));
for (const a of process.argv.slice(2).filter((x) => x.includes('='))) { const [k, v] = a.split('='); BAL[k] = Number(v); }
const POT = Number(process.env.POT || 1);
const HOURS = Number(args[0] || 24), ACTIVE = Number(args[1] || 20), AWAY = Number(args[2] || 120);
G.resetAll();
const S = () => G.state;
let now = Date.now(), simT = 0;
const fmt = (s) => `${Math.floor(s / 3600)}h${String(Math.floor((s % 3600) / 60)).padStart(2, '0')}m${String(Math.floor(s % 60)).padStart(2, '0')}s`;
const log = (m) => console.log(`${fmt(simT).padStart(7)}  ${m}`);
G.onChange((w) => { if (w?.unlock) log(`unlocked ${CLASSES[w.unlock].name}`); if (w?.eight) log(`${CLASSES[w.potion].name} is 8/8 at ${stageLabel(S().best)}`); });

function manage() {
  const st = S();
  // party: best three by level, keeping a tank or a support if we have one
  const owned = Object.keys(st.classes).sort((a, b) => st.classes[b].lv - st.classes[a].lv);
  const pick = [];
  const tank = owned.find((c) => CLASSES[c].role === 'tank'), sup = owned.find((c) => CLASSES[c].role === 'support');
  for (const c of [tank, sup, ...owned]) if (c && !pick.includes(c) && pick.length < 3) pick.push(c);
  st.party = pick;
  // equip upgrades
  for (const c of st.party) for (const it of [...st.inv]) if (fits(c, it)) { const cur = st.classes[c].gear[slotOf(it)]; if (!cur || itemScore(it) > itemScore(cur)) G.equip(c, it.id); }
  // salvage what nobody in the party can use better
  G.salvage(st.inv.filter((it) => !Object.keys(st.classes).some((c) => G.isUpgradeFor(c, it))).map((it) => it.id));
  // spend: cheapest of (lowest-level party member's level, an upgrade on equipped gear)
  for (let guard = 0; guard < 4000; guard++) {
    const lowest = st.party.reduce((a, b) => (st.classes[b].lv < st.classes[a].lv ? b : a));
    const lc = G.levelCost(lowest);
    let best = null;
    for (const c of st.party) for (const s of SLOTS) { const it = st.classes[c].gear[s]; if (it && canUpgrade(it) && (!best || upgradeCost(it) < upgradeCost(best))) best = it; }
    // the cheapest stat potion (per share of its max) in the party
    let pot = null;
    for (const c of st.party) for (const s of STATS) if (!G.statMaxed(c, s)) { const e = (G.potionCost(c, s) * potionsToMax(c, s)) / BAL.potRef; if (!pot || e < pot.e) pot = { c, s, e }; }
    if (pot && pot.e < lc * POT && st.fame >= G.potionCost(pot.c, pot.s)) G.drink(pot.c, pot.s);
    else if (best && upgradeCost(best) < lc * 0.6 && st.fame >= upgradeCost(best)) G.upgrade(best.id);
    else if (st.fame >= lc) G.levelUp(lowest);
    else break;
  }
  // also level owned classes toward unlocks when cheap
  for (const c of Object.keys(st.classes)) if (!st.party.includes(c) && G.levelCost(c) < st.fame * 0.05) G.levelUp(c);
}

let lastBest = -1, lastAsc = 0, lastU = 0;
G.startBattle();
while (simT < HOURS * 3600) {
  // active block
  const end = simT + ACTIVE * 60;
  let mt = 0;
  while (simT < end) {
    G.tickBattle(); simT += TICK; mt += TICK;
    if (G.battle.state !== 'fight') { G.nextBattle(); }
    if (mt > 20) {
      mt = 0; manage();
      if (G.canAscend()) { G.ascend(); log(`ASCENDED → Realm ${S().realm + 1} (dungeon tier ${G.dungeonTier()})`); }
    }
    if ((S().stats.uniques || 0) !== lastU) { lastU = S().stats.uniques; const it = [...S().inv].reverse().find((x) => x.u); log(`UNIQUE #${lastU}: ${it?.name}`); }
    if (S().best !== lastBest) {
      if (S().best >= 0 && isBoss(S().best) && (!process.env.QUIET || S().best >= 69)) log(`beat ${zoneOf(S().best).boss[0]} (${stageLabel(S().best)}, realm ${S().realm + 1})  power ${G.partyPower()}  lv ${S().party.map((c) => `${c}:${S().classes[c].lv} ${G.maxedCount(c)}/8`).join(' ')}`);
      lastBest = S().best;
    }
  }
  // away block
  S().lastSeen = now; now += AWAY * 60 * 1000; simT += AWAY * 60;
  const off = G.collectOffline(now);
  manage();
  G.nextBattle();
  void off; void lastAsc;
}
const st = S();
log(`END stage ${stageLabel(Math.max(0, st.best))} realm ${st.realm + 1}, fame ${Math.round(st.fame)}, power ${G.partyPower()} vs next ${G.stagePower(st.best + 1)}  party ${st.party.map((c) => `${c}:${st.classes[c].lv}`).join(' ')}`);
