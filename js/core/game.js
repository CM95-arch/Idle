// The game state and every action on it. UI code reads `state` and calls these; it never edits state itself.
import { BAL } from '../data/balance.js';
import { CLASSES, CLASS_IDS } from '../data/classes.js';
import { SLOTS } from '../data/gear.js';
import { STAGE_COUNT, STAGES_PER_ZONE, ZONES, isBoss } from '../data/zones.js';
import { UNIQUES } from '../data/uniques.js';
import { makeRng } from './rng.js';
import { heroStats, powerOf } from './heroes.js';
import { makeUnique, setUniqueLevel, slotOf, fits, upgradeCost, canUpgrade, salvageValue, itemScore, RARITY } from './items.js';
import { createBattle, stepBattle, simulate, enemyStats, advanceStage, refreshHeroes } from './battle.js';

const KEY = 'realm-idle-save-v1';
export const LAST_STAGE = STAGE_COUNT - 1;

function fresh() {
  return {
    v: 1, fame: 0, gold: 0, realm: 0, ascensions: 0,
    stage: 0, best: -1, autoPush: true,
    classes: { wizard: { lv: 1, gear: {} } }, party: ['wizard'],
    inv: [], nextId: 1, seed: (Math.random() * 2 ** 32) >>> 0,
    mult: { fame: 1, dmg: 1, offline: 0, drops: 0 }, // fame/dmg multiply; offline/drops add
    extra: { offlineHours: 0, inventory: 0 }, // Gold upgrades (store not open yet)
    lastSeen: Date.now(), created: Date.now(),
    stats: { kills: 0, clears: 0, fameEarned: 0, bosses: 0, items: 0, played: 0 },
    settings: { sound: true },
    uniques: {}, // Unique id → how many you've found
    flags: {},
  };
}
export let state = fresh();
let rng = makeRng();
const listeners = new Set();
export const onChange = (fn) => listeners.add(fn);
// a broken listener must never undo or hide an action that already happened
const changed = (why) => { for (const fn of listeners) { try { fn(why); } catch (e) { setTimeout(() => { throw e; }); } } };

// Regular gear is gone: every item is a Unique now. Anything an older save still holds turns into Fame.
function retireOldGear() {
  const old = [...state.inv.filter((it) => !it.u), ...Object.values(state.classes).flatMap((C) => Object.values(C.gear).filter((it) => it && !it.u))];
  if (!old.length) return;
  const fame = old.reduce((a, it) => a + 4 * 1.15 ** (it.ilvl || 0) * (1 + Math.min(it.rarity, 5)) ** 1.6, 0);
  state.inv = state.inv.filter((it) => it.u);
  for (const C of Object.values(state.classes)) for (const [k, it] of Object.entries(C.gear)) if (it && !it.u) delete C.gear[k];
  gainFame(fame, false);
  state.flags.retired = { n: old.length, fame };
}

// ---------- save ----------
export function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) state = { ...fresh(), ...JSON.parse(raw) };
  } catch { state = fresh(); }
  rng = makeRng(state.seed);
  syncUniques();
  retireOldGear();
  return state;
}
export function save() {
  state.seed = rng.s; state.lastSeen = Date.now();
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* storage full or blocked */ }
}
export function resetAll() { state = fresh(); rng = makeRng(state.seed); syncUniques(); save(); changed('reset'); }

// ---------- derived ----------
export const owned = (cls) => !!state.classes[cls];
export const partyStats = () => state.party.filter(Boolean).map((c) => {
  const C = state.classes[c], gear = Object.values(C.gear).filter(Boolean);
  // looks: the battle view colors each hero's weapon and aura by their gear
  return { ...heroStats(c, C, state.mult), weaponRarity: C.gear.weapon?.rarity ?? -1, gearRarity: Math.max(-1, ...gear.map((it) => it.rarity)) };
});
export const partyPower = () => powerOf(partyStats());
export const offlineCapH = () => BAL.offlineCapHours + state.extra.offlineHours;
const fameMult = () => state.mult.fame * (1 + Math.max(0, ...partyStats().map((s) => s.fame), 0)) * BAL.realmFame ** state.realm;
// luck (a Unique effect) and the drop bonus from Ascending both make Uniques turn up more often
const luck = () => Math.max(0, ...partyStats().map((s) => s.fx.luck || 0)) + state.mult.drops;
export const ilvlFor = (stage) => stage + BAL.realmIlvl * state.realm;
// Uniques keep pace with you: as strong as gear from a few stages behind your best
const syncUniques = () => setUniqueLevel(ilvlFor(Math.max(0, state.best - BAL.uniqueLag)));

/** Power a stage asks for: what a party needs to clear it about evenly. */
export function stagePower(stage, realm = state.realm) {
  const e = enemyStats(stage, realm);
  return Math.round((Math.sqrt(e.hp * e.atk) * BAL.powerScale * (isBoss(stage) ? 1.4 : 1)) / (1 - e.def));
}
export const canAscend = () => state.best >= LAST_STAGE;
export const offlineEff = () => Math.min(1.5, BAL.offlineEfficiency * (1 + state.mult.offline));

// ---------- class unlocks ----------
export function unlockReady(cls) {
  const u = CLASSES[cls].unlock;
  if (!u) return true;
  return Object.entries(u.needs).every(([k, lv]) => (state.classes[k]?.lv || 0) >= lv);
}
function checkUnlocks() {
  const fresh = [];
  for (const id of CLASS_IDS) if (!owned(id) && unlockReady(id)) { state.classes[id] = { lv: 1, gear: {} }; fresh.push(id); }
  for (const id of fresh) {
    const free = state.party.length < BAL.partySize;
    if (free) state.party.push(id);
    changed({ unlock: id, joined: free });
  }
}

// ---------- leveling ----------
export const levelCost = (cls) => BAL.levelCost(state.classes[cls].lv);
export const levelCostForLevel = (lv) => BAL.levelCost(lv);
export function levelUp(cls, times = 1) {
  let n = 0;
  while (n < times && state.fame >= levelCost(cls)) { state.fame -= levelCost(cls); state.classes[cls].lv++; n++; }
  if (n) { checkUnlocks(); changed({ level: cls, n }); }
  return n;
}
/** How many levels the current Fame buys (for "Max" buttons). */
export function affordableLevels(cls) {
  let f = state.fame, lv = state.classes[cls].lv, n = 0;
  while (f >= BAL.levelCost(lv)) { f -= BAL.levelCost(lv); lv++; n++; if (n > 500) break; }
  return n;
}

// ---------- party ----------
export function setParty(slot, cls) {
  const p = [...state.party];
  const at = p.indexOf(cls);
  if (at >= 0) p[at] = p[slot];
  p[slot] = cls;
  state.party = p.filter(Boolean).slice(0, BAL.partySize);
  changed('party');
}
export function removeFromParty(cls) { if (state.party.length > 1) { state.party = state.party.filter((c) => c !== cls); changed('party'); } }

// ---------- gear ----------
export function equip(cls, itemId) {
  const at = state.inv.findIndex((x) => x.id === itemId);
  if (at < 0) return false;
  const it = state.inv[at];
  if (!fits(cls, it)) return false;
  const slot = slotOf(it), C = state.classes[cls];
  state.inv.splice(at, 1);
  if (C.gear[slot]) state.inv.push(C.gear[slot]);
  C.gear[slot] = it;
  changed('gear');
  return true;
}
export function unequip(cls, slot) {
  const C = state.classes[cls];
  if (!C.gear[slot]) return false;
  state.inv.push(C.gear[slot]); delete C.gear[slot]; changed('gear');
  return true;
}
export function findItem(itemId) {
  const inv = state.inv.find((x) => x.id === itemId);
  if (inv) return { it: inv, cls: null };
  for (const [cls, C] of Object.entries(state.classes)) for (const s of SLOTS) if (C.gear[s]?.id === itemId) return { it: C.gear[s], cls };
  return null;
}
export function upgrade(itemId) {
  const f = findItem(itemId);
  if (!f || !canUpgrade(f.it) || state.fame < upgradeCost(f.it)) return false;
  state.fame -= upgradeCost(f.it); f.it.up++;
  changed('gear');
  return true;
}
export function salvage(ids) {
  let got = 0;
  for (const id of ids) {
    const at = state.inv.findIndex((x) => x.id === id);
    if (at < 0) continue;
    got += salvageValue(state.inv[at]); state.inv.splice(at, 1);
  }
  if (got) { gainFame(got, false); changed('gear'); }
  return got;
}
/** Is this item better than what that class wears in its slot? */
export function isUpgradeFor(cls, it) {
  if (!state.classes[cls] || !fits(cls, it)) return false;
  const cur = state.classes[cls].gear[slotOf(it)];
  return !cur || itemScore(it) > itemScore(cur) * 1.001;
}
export const upgradeOwners = (it) => Object.keys(state.classes).filter((c) => isUpgradeFor(c, it));
/** Every class (owned or not) that can wear an item. */
export const wearers = (it) => Object.keys(CLASSES).filter((c) => fits(c, it));
/** Put the best piece from the bag into each of a class's slots. Returns how many pieces changed. */
export function equipBest(cls) {
  let n = 0;
  for (const slot of SLOTS) {
    const cur = state.classes[cls].gear[slot];
    const best = state.inv.filter((it) => fits(cls, it) && slotOf(it) === slot).sort((a, b) => itemScore(b) - itemScore(a))[0];
    if (best && (!cur || itemScore(best) > itemScore(cur) * 1.001)) { equip(cls, best.id); n++; }
  }
  return n;
}
export function bestUpgrades() {
  let n = 0;
  for (const it of state.inv) if (state.party.some((c) => isUpgradeFor(c, it))) n++;
  return n;
}

// ---------- rewards ----------
function gainFame(n, earned = true) { state.fame += n; if (earned) state.stats.fameEarned += n; }
const uniqueChance = (zone, boss) => (boss ? BAL.uniqueBoss * (zone === ZONES.length - 1 ? 2 : 1) : BAL.uniqueKill) * (1 + luck());
/** Maybe a Unique: the zone boss drops one now and then; its other enemies very rarely. */
function rollUnique(stage, boss, force = false) {
  const zone = Math.min(ZONES.length - 1, Math.floor(stage / STAGES_PER_ZONE));
  if (!force && rng.next() >= uniqueChance(zone, boss)) return null;
  // ones you haven't found yet, and ones a class you own can wear, come up more often
  const pool = UNIQUES.filter((u) => u.zone === zone);
  // Exalted ones are far rarer than the rest
  const w = pool.map((u) => (u.exalted ? BAL.exaltedWeight : 1) * (state.uniques[u.id] ? 1 : 3) * (Object.keys(state.classes).some((c) => fits(c, { kind: u.kind })) ? 2 : 1));
  let r = rng.next() * w.reduce((a, b) => a + b, 0), U = pool[0];
  for (let i = 0; i < pool.length; i++) { r -= w[i]; if (r < 0) { U = pool[i]; break; } }
  const first = !state.uniques[U.id];
  state.uniques[U.id] = (state.uniques[U.id] || 0) + 1;
  state.stats.uniques = (state.stats.uniques || 0) + 1;
  state.stats.items++;
  // one you already own: it melts into your copy as free upgrades (and Fame once that copy is maxed)
  const owned = [...state.inv, ...Object.values(state.classes).flatMap((C) => Object.values(C.gear))].filter((x) => x?.u === U.id).sort((a, b) => b.up - a.up)[0];
  if (owned) {
    const ups = Math.min(BAL.dupeUpgrades, RARITY[owned.rarity].maxUp - owned.up);
    owned.up += ups;
    const fame = ups < BAL.dupeUpgrades ? salvageValue(makeUnique(0, U.id)) : 0;
    if (fame) gainFame(fame, false);
    changed('gear');
    return { it: owned, salvaged: 0, unique: true, first: false, dupe: { ups, fame }, exalted: !!U.exalted };
  }
  const it = makeUnique(state.nextId++, U.id);
  state.inv.push(it);
  return { it, salvaged: 0, unique: true, first, exalted: !!U.exalted };
}
const killFame = (stage) => BAL.fameKill(stage) * fameMult();
const clearFame = (stage) => BAL.fameClear(stage) * fameMult() * (isBoss(stage) ? BAL.bossFame : 1);

// ---------- the live battle ----------
export let battle = null;
export function startBattle() {
  const st = partyStats(); statSig = sigOf(st);
  battle = createBattle(state.stage, state.realm, st, rng.int(0, 2 ** 31));
  changed('battle');
}
/** Apply a tick's battle events to the economy. Returns rewards for the UI to show. */
function settle(events) {
  const out = [];
  for (const ev of events) {
    if (ev.k === 'die') {
      const f = killFame(state.stage) * (ev.boss ? 20 : ev.elite ? 4 : 1); gainFame(f); state.stats.kills++;
      const at = { x: ev.x, y: ev.y };
      out.push({ k: 'fame', n: f, id: ev.id, at });
      // the only loot: Uniques, from bosses now and then, and very rarely from anything else (elites a bit more)
      const u = rollUnique(state.stage, ev.boss) || (ev.elite ? rollUnique(state.stage, false) : null);
      if (u) out.push({ k: 'drop', at, ...u });
    }
    if (ev.k === 'won') {
      const f = clearFame(state.stage); gainFame(f); state.stats.clears++;
      if (isBoss(state.stage)) state.stats.bosses++;
      const first = state.stage > state.best;
      if (first) { state.best = state.stage; syncUniques(); }
      if (state.flags.wallAt != null && state.stage >= state.flags.wallAt) state.flags.wallAt = null;
      out.push({ k: 'clear', n: f, stage: state.stage, first });
    }
  }
  return out;
}
/** Advance the live battle by one tick. Returns that tick's battle events and the rewards they paid. */
let statSig = '', statT = 0;
const sigOf = (st) => JSON.stringify(st.map((s) => [s.cls, Math.round(s.atk), Math.round(s.hp), Math.round(s.def), +s.spd.toFixed(2), s.crit, s.fx]));
export function tickBattle() {
  if (!battle) startBattle();
  // level-ups and new gear reach the fighting party within a second; a new line-up starts a fresh fight
  if ((statT += 1) >= 20) {
    statT = 0;
    const st = partyStats(), sig = sigOf(st);
    if (sig !== statSig) { statSig = sig; if (!refreshHeroes(battle, st)) startBattle(); }
  }
  stepBattle(battle);
  const events = battle.events;
  battle.events = [];
  const rewards = settle(events);
  if (battle.cleared) { pickNextStage(true); advanceStage(battle, state.stage); save(); changed('stage'); }
  return { events, rewards };
}
function pickNextStage(won) {
  if (won && state.autoPush && state.stage === state.best && state.stage < LAST_STAGE) state.stage++;
  else if (!won) { state.flags.wallPower = partyPower(); state.stage = Math.max(0, state.best); state.flags.wallAt = state.best + 1; }
  // after a wall, try again once the party has grown 8%
  if (state.autoPush && state.flags.wallAt != null && state.stage === state.best && partyPower() >= state.flags.wallPower * 1.08 && state.best < LAST_STAGE) { state.stage = state.best + 1; state.flags.wallAt = null; }
}
/** Called by the UI once a finished battle's last effects have played. */
/** Called by the UI after the party has fallen and the defeat has played out: regroup a stage back. */
export function nextBattle() {
  pickNextStage(false);
  startBattle();
  save();
}
export function goToStage(s) {
  if (s < 0 || s > Math.min(state.best + 1, LAST_STAGE)) return;
  state.stage = s; state.flags.wallAt = null; startBattle(); changed('stage');
}
export function setAutoPush(on) { state.autoPush = on; changed('auto'); }

// ---------- offline ----------
const rateCache = new Map();
/** Farming rate on a stage for the current party: seconds per clear and how often it wins. */
export function farmRate(stage) {
  const stats = partyStats();
  const key = `${stage}|${state.realm}|${JSON.stringify(stats.map((s) => [s.cls, Math.round(s.atk), Math.round(s.hp), Math.round(s.def), s.fx]))}`;
  if (rateCache.has(key)) return rateCache.get(key);
  let wins = 0, t = 0, kills = 0;
  for (let i = 0; i < 4; i++) { const r = simulate(stage, state.realm, stats, 1000 + i * 77); if (r.won) wins++; t += r.t + 1.5; kills += r.kills; }
  const res = { winRate: wins / 4, secPerFight: t / 4, kills: kills / 4 };
  rateCache.set(key, res);
  return res;
}
/** Work out what the party earned while away. Applies it and returns a summary (or null if < 1 minute). */
export function collectOffline(now = Date.now()) {
  const raw = (now - state.lastSeen) / 1000, away = Math.min(raw, offlineCapH() * 3600);
  state.lastSeen = now;
  if (away < 60 || !state.party.length) return null;
  const stage = Math.max(0, state.best);
  const r = farmRate(stage), eff = offlineEff();
  const fights = (away / r.secPerFight) * eff;
  const clears = fights * r.winRate;
  const fame = clears * (clearFame(stage) + r.kills * killFame(stage)) + (fights - clears) * r.kills * 0.5 * killFame(stage);
  gainFame(fame); state.stats.clears += Math.floor(clears); state.stats.kills += Math.floor(fights * r.kills);
  const salvaged = 0;
  // Uniques: one roll per boss kill (or per wave on other stages), at most three
  const uniques = [];
  const zone = Math.min(ZONES.length - 1, Math.floor(stage / STAGES_PER_ZONE));
  const expect = clears * ((isBoss(stage) ? uniqueChance(zone, true) : 0) + BAL.stageKills * uniqueChance(zone, false));
  const n = Math.min(3, Math.floor(expect) + (rng.next() < expect % 1 ? 1 : 0));
  for (let i = 0; i < n; i++) uniques.push(rollUnique(stage, isBoss(stage), true));
  save(); changed('offline');
  return { away, capped: raw > away, fame, clears: Math.floor(clears), drops: uniques.map((u) => u.it), uniques, salvaged, stage };
}

// ---------- Ascension ----------
export function ascendPreview() {
  const n = state.ascensions + 1, g = BAL.ascendGain(n);
  return { n, gain: g, realm: state.realm + 1, levels: Object.fromEntries(Object.entries(state.classes).map(([c, C]) => [c, Math.max(BAL.realmStartLevel(state.realm + 1), Math.floor(C.lv * BAL.keepLevels))])) };
}
export function ascend() {
  if (!canAscend()) return false;
  const P = ascendPreview();
  state.mult.dmg *= 1 + P.gain * BAL.ascendDmg; state.mult.fame *= 1 + P.gain;
  state.mult.offline += P.gain * 0.15; state.mult.drops += P.gain * 0.3;
  state.ascensions = P.n; state.realm = P.realm;
  // Uniques are kept (worn ones stay on) but lose their upgrades; everything else is gone
  for (const [c, C] of Object.entries(state.classes)) { C.lv = P.levels[c]; C.gear = Object.fromEntries(Object.entries(C.gear).filter(([, it]) => it?.u)); }
  state.inv = state.inv.filter((it) => it.u); state.fame = 0;
  for (const it of [...state.inv, ...Object.values(state.classes).flatMap((C) => Object.values(C.gear))]) if (it) it.up = 0; state.stage = 0; state.best = -1; state.flags.wallAt = null;
  syncUniques();
  rateCache.clear();
  startBattle(); save(); changed('ascend');
  return true;
}

export { CLASSES, SLOTS, isBoss, upgradeCost, canUpgrade, salvageValue };
