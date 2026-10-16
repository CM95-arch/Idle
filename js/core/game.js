// The game state and every action on it. UI code reads `state` and calls these; it never edits state itself.
import { BAL } from '../data/balance.js';
import { CLASSES, CLASS_IDS } from '../data/classes.js';
import { SLOTS } from '../data/gear.js';
import { STAGE_COUNT, TIERS, DUNGEONS, isBoss, zoneOf, localStage, levelOf } from '../data/zones.js';
import { UNIQUES, UNIQUE } from '../data/uniques.js';
import { makeRng } from './rng.js';
import { STATS, potionsToMax } from '../data/stats.js';
import { heroStats, powerOf } from './heroes.js';
import { REWARDS, ACHIEVEMENTS } from '../data/rewards.js';
import { makeUnique, setUniqueLevel, setAwaken, maxUpOf, slotOf, fits, upgradeCost, canUpgrade, salvageValue, itemScore } from './items.js';
import { createBattle, stepBattle, simulate, enemyStats, advanceStage, refreshHeroes } from './battle.js';

const KEY = 'realm-idle-save-v1';
export const LAST_STAGE = STAGE_COUNT - 1; // Oryx

// ---------- dungeons ----------
// Beating Oryx in Realm N unlocks dungeon tier N for good. Each dungeon remembers how far you've cleared it.
export const dungeonTier = () => state.dtier || 0;
export const dungeonOpen = (Z) => !!Z?.dungeon && Z.tier <= dungeonTier();
const dBest = (Z) => state.dbest?.[Z.id] ?? -1;
export const dungeonProgress = (Z) => dBest(Z) + 1;
/** Can the party go to this stage? Realm stages up to the next one; dungeon stages in order once it's open. */
export function canEnter(s) {
  const Z = zoneOf(s);
  if (!Z.dungeon) return s >= 0 && s <= Math.min(state.best + 1, LAST_STAGE);
  return dungeonOpen(Z) && localStage(s) <= dBest(Z) + 1;
}

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
    dtier: 0, dbest: {}, // dungeon tiers unlocked, and how far each dungeon is cleared (kept when you Ascend)
    peak: 0, // how many Realms' Oryx you've beaten: Realm rewards (see data/rewards.js)
    ach: {}, // achievements earned
    pet: { lv: 0 }, // the Companion (a Realm reward)
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
  // regular gear, and Uniques from the old invented catalog (now the real ROTMG ones)
  const gone = (it) => it && (!it.u || !UNIQUE[it.u]);
  for (const id of Object.keys(state.uniques)) if (!UNIQUE[id]) delete state.uniques[id];
  const old = [...state.inv.filter(gone), ...Object.values(state.classes).flatMap((C) => Object.values(C.gear).filter(gone))];
  if (!old.length) return;
  const fame = old.reduce((a, it) => a + (it.u ? BAL.salvage(Math.max(0, state.best)) * 2 : 4 * 1.15 ** (it.ilvl || 0) * (1 + Math.min(it.rarity, 5)) ** 1.6), 0);
  state.inv = state.inv.filter((it) => !gone(it));
  for (const C of Object.values(state.classes)) for (const [k, it] of Object.entries(C.gear)) if (gone(it)) delete C.gear[k];
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
  // Uniques carry their catalog name, which can change (they got their own names): refresh it
  for (const it of [...state.inv, ...Object.values(state.classes).flatMap((C) => Object.values(C.gear))]) if (it?.u && UNIQUE[it.u]) it.name = UNIQUE[it.u].name;
  // the progression rework: old endgame stages (the Lost Halls and the Shatters were stages 70-89) are now
  // dungeons; every Oryx you've beaten counts toward the dungeon tiers
  if (!state.flags.prog2) {
    state.flags.prog2 = true;
    if (state.best > LAST_STAGE) state.best = LAST_STAGE;
    if (state.stage > LAST_STAGE) state.stage = Math.max(0, state.best);
    state.dtier = Math.min(TIERS, (state.ascensions || 0) + (state.best >= LAST_STAGE ? 1 : 0));
    state.dbest = state.dbest || {};
    delete state.flags.endgame;
  }
  // long-term goals: the Realms you've beaten so far count toward the Realm rewards
  if (!state.flags.prog3) { state.flags.prog3 = true; state.peak = Math.max(state.peak || 0, (state.ascensions || 0) + (state.best >= LAST_STAGE ? 1 : 0)); }
  syncAwaken();
  setTimeout(checkAch, 1500); // ones already earned before achievements existed
  return state;
}
export function save() {
  state.seed = rng.s; state.lastSeen = Date.now();
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* storage full or blocked */ }
}
export function resetAll() { state = fresh(); rng = makeRng(state.seed); syncUniques(); syncAwaken(); save(); changed('reset'); }

// ---------- derived ----------
export const owned = (cls) => !!state.classes[cls];
export const partyStats = () => state.party.filter(Boolean).map((c) => {
  const C = state.classes[c], gear = Object.values(C.gear).filter(Boolean);
  // looks: the battle view colors each hero's weapon and aura by their gear
  return { ...heroStats(c, C, bonusMult()), slot: formSlot(c), weaponRarity: C.gear.weapon?.rarity ?? -1, gearRarity: Math.max(-1, ...gear.map((it) => it.rarity)) };
});
export const partyPower = () => powerOf(partyStats());

// ---------- long-term goals: the level cap, Realm rewards, achievements, the Companion ----------
/** The highest level a hero can reach: it rises with every Ascension, so past a point only a better build helps. */
export const levelCapFor = (asc) => Math.round(BAL.levelCapBase + BAL.levelCapPerAsc * asc);
export const levelCap = () => levelCapFor(state.ascensions || 0);
export const atCap = (cls) => state.classes[cls].lv >= levelCap();
export const hasReward = (id) => { const R = REWARDS.find((r) => r.id === id); return !!R && (state.peak || 0) >= R.realm; };
export const nextReward = () => REWARDS.find((r) => (state.peak || 0) < r.realm) || null;
const awakenLevel = () => Math.max(0, ...REWARDS.filter((r) => r.awaken && (state.peak || 0) >= r.realm).map((r) => r.awaken));
export function syncAwaken() { setAwaken(awakenLevel()); }
/** Every item you own, worn or not. */
export const allItems = () => [...state.inv, ...Object.values(state.classes).flatMap((C) => Object.values(C.gear || {}))].filter(Boolean);
/** What achievements (and Realm rewards) add: damage and HP multiply the party; Fame multiplies earnings. */
export function achBonus() {
  const b = { dmg: 0, hp: 0, fame: 0 };
  for (const A of ACHIEVEMENTS) if (state.ach?.[A.id]) { b.dmg += A.dmg || 0; b.hp += A.hp || 0; b.fame += A.fame || 0; }
  for (const R of REWARDS) if ((state.peak || 0) >= R.realm) b.dmg += R.dmg || 0;
  return b;
}
const bonusMult = () => { const b = achBonus(); return { ...state.mult, dmg: state.mult.dmg * (1 + b.dmg), hp: 1 + b.hp }; };
/** Award any achievements just earned. */
export function checkAch() {
  const got = [];
  for (const A of ACHIEVEMENTS) if (!state.ach[A.id]) { let ok = false; try { ok = A.test(state, { maxedCount, allItems }); } catch { ok = false; } if (ok) { state.ach[A.id] = Date.now(); got.push(A); } }
  if (got.length) changed({ ach: got });
  return got;
}
// the Companion: shoots the nearest enemy for a share of the party's damage; levels with Fame up to a cap that
// grows with every Realm beaten past the Shatters
export const petCap = () => (hasReward('companion') ? Math.min(BAL.petMaxLv, BAL.petCapPer * ((state.peak || 0) - 15)) : 0);
export const petCost = () => levelCostForLevel(BAL.petCostLv + Math.round((state.pet?.lv || 0) * BAL.petCostStep));
export function petUp(times = 1) {
  let n = 0;
  while (n < times && state.pet.lv < petCap() && state.fame >= petCost()) { state.fame -= petCost(); state.pet.lv++; n++; }
  if (n) { if (battle) battle.pet = petInfo(battle.pet); checkAch(); changed({ pet: n }); }
  return n;
}
const petInfo = (old) => (hasReward('companion') ? { ...(old || { t: 0.5 }), lv: state.pet.lv, burst: hasReward('aura'), triple: hasReward('crown') } : null);
/** What the battle needs besides the heroes: the Companion and the cosmetic rewards. */
export const battleExtra = () => ({ pet: petInfo(), cos: cosmetics() });
const cosmetics = () => ({ aura: hasReward('aura'), crown: hasReward('crown'), wings: hasReward('wings') });
export const offlineCapH = () => BAL.offlineCapHours + state.extra.offlineHours;
/** Realm I pays extra Fame (before any Ascension), so a new player reaches Oryx and the first dungeons quickly. */
const firstRealm = () => (state.ascensions ? 1 : BAL.firstRealmFame);
const fameMult = () => state.mult.fame * (1 + Math.max(0, ...partyStats().map((s) => s.fame), 0)) * BAL.realmFame ** state.realm * firstRealm() * (1 + achBonus().fame);
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
// levels cost more in later Realms in step with the Fame those Realms pay, so each Realm is a real climb
const realmCost = () => BAL.realmFame ** state.realm;
export const levelCost = (cls) => BAL.levelCost(state.classes[cls].lv) * realmCost();
export const levelCostForLevel = (lv) => BAL.levelCost(lv) * realmCost();
export function levelUp(cls, times = 1) {
  let n = 0;
  while (n < times && !atCap(cls) && state.fame >= levelCost(cls)) { state.fame -= levelCost(cls); state.classes[cls].lv++; n++; }
  if (n) { checkUnlocks(); checkAch(); changed({ level: cls, n }); }
  return n;
}
/** How many levels the current Fame buys (for "Max" buttons). */
export function affordableLevels(cls) {
  let f = state.fame, lv = state.classes[cls].lv, n = 0;
  const cap = levelCap();
  while (lv < cap && f >= levelCostForLevel(lv)) { f -= levelCostForLevel(lv); lv++; n++; if (n > 500) break; }
  return n;
}

// ---------- stat potions ----------
// Prices scale with the Realm and the Ascension Fame bonus, so every run reaches 8/8 near the Castle.
const potScale = () => BAL.realmFame ** state.realm * state.mult.fame * firstRealm();
const potsOf = (cls) => (state.classes[cls].pots ||= {});
export const potions = (cls, s) => state.classes[cls]?.pots?.[s] || 0;
/** A stat's cap, raised with every Ascension. */
export const potCap = (cls, s) => potionsToMax(cls, s, state.ascensions || 0);
export const statMaxed = (cls, s) => potions(cls, s) >= potCap(cls, s);
export const maxedCount = (cls) => STATS.filter((s) => statMaxed(cls, s)).length;
// priced by how far toward the current cap a potion is, so each Realm's new potions cost about Castle money
export const potionCost = (cls, s, k = potions(cls, s)) => Math.round(BAL.potionCost(k, potCap(cls, s), s) * potScale());
/** Drink up to `times` potions of one stat. Returns how many. */
export function drink(cls, s, times = 1) {
  let n = 0;
  while (n < times && !statMaxed(cls, s) && state.fame >= potionCost(cls, s)) { state.fame -= potionCost(cls, s); potsOf(cls)[s] = potions(cls, s) + 1; n++; }
  if (n) { checkAch(); changed({ potion: cls, stat: s, n, maxed: statMaxed(cls, s), eight: maxedCount(cls) === 8 && statMaxed(cls, s) }); }
  return n;
}
/** How many potions of a stat the current Fame buys, and what they cost. */
export function affordablePotions(cls, s, cap = Infinity) {
  let f = state.fame, k = potions(cls, s), n = 0, cost = 0;
  const K = potCap(cls, s);
  while (n < cap && k < K && f >= potionCost(cls, s, k)) { const c = potionCost(cls, s, k); f -= c; cost += c; k++; n++; }
  return { n, cost };
}

// ---------- formation ----------
// The party stands in three spots: [left, front, right]. The front spot stands ahead of the other two and meets
// the horde first, which is where a tank belongs.
export const FORM_SLOTS = ['Left', 'Front', 'Right'];
function syncForm() {
  const f = (Array.isArray(state.form) ? state.form : []).slice(0, 3).map((c) => (state.party.includes(c) ? c : null));
  while (f.length < 3) f.push(null);
  for (let i = 0; i < 3; i++) if (f[i] && f.indexOf(f[i]) !== i) f[i] = null;
  // newcomers: tanks to the front if it's free, everyone else to the sides first
  for (const c of state.party) if (!f.includes(c)) { const k = (CLASSES[c].role === 'tank' ? [1, 0, 2] : [0, 2, 1]).find((j) => !f[j]); if (k != null) f[k] = c; }
  state.form = f;
}
export const formSlot = (cls) => { if (!state.form?.includes(cls)) syncForm(); return state.form.indexOf(cls); };
/** Move a party member to a spot; whoever stood there takes its old spot. */
export function moveTo(cls, slot) {
  if (!state.party.includes(cls)) return;
  syncForm();
  const f = state.form, at = f.indexOf(cls), other = f[slot];
  f[slot] = cls; f[at] = other ?? null;
  changed('party');
}

// ---------- party ----------
export function setParty(slot, cls) {
  const p = [...state.party];
  const at = p.indexOf(cls);
  if (at >= 0) p[at] = p[slot];
  p[slot] = cls;
  const old = state.party.find((c) => !p.includes(c));
  state.party = p.filter(Boolean).slice(0, BAL.partySize);
  // a class swapped in takes the spot of the one it replaced
  if (old && state.form) { const k = state.form.indexOf(old); if (k >= 0 && !state.form.includes(cls)) state.form[k] = cls; }
  syncForm();
  changed('party');
}
export function removeFromParty(cls) { if (state.party.length > 1) { state.party = state.party.filter((c) => c !== cls); syncForm(); changed('party'); } }

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
  checkAch(); changed('gear');
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
// Uniques drop only where they do in the real game: a few from Realm bosses, the rest from dungeon bosses (and,
// very rarely, the rest of a dungeon's enemies)
// (the Beaches drop starter ability items instead: only ones a class you own can use, and often)
const owns = (u) => Object.keys(state.classes).some((c) => fits(c, { kind: u.kind }));
const poolOf = (Z) => UNIQUES.filter((u) => u.src === Z.id && (!u.starter || owns(u)));
const starterZone = (Z) => Z.id === 'beach';
const uniqueChance = (Z, boss) => (!poolOf(Z).length ? 0 : starterZone(Z) ? (boss ? BAL.starterBoss : BAL.starterKill) : boss ? (Z.dungeon ? BAL.uniqueDungeonBoss : BAL.uniqueRealmBoss) : Z.dungeon ? BAL.uniqueKill : 0) * (1 + luck());
/** Maybe a Unique from this stage's zone. */
function rollUnique(stage, boss, force = false) {
  const Z = zoneOf(stage), pool = poolOf(Z);
  if (boss && starterZone(Z) && !pool.some((u) => state.uniques[u.id])) force = true; // a new player's first gear
  if (!pool.length || (!force && rng.next() >= uniqueChance(Z, boss))) return null;
  // ones you haven't found yet, and ones a class you own can wear, come up more often
  // Exalted ones are far rarer than the rest
  // (starters favor the classes in the party, so the drop can go straight on)
  const w = pool.map((u) => (u.exalted ? BAL.exaltedWeight : 1) * (state.uniques[u.id] ? 1 : 3) * (owns(u) ? 2 : 1) * (u.starter && state.party.some((c) => fits(c, { kind: u.kind })) ? 4 : 1));
  let r = rng.next() * w.reduce((a, b) => a + b, 0), U = pool[0];
  for (let i = 0; i < pool.length; i++) { r -= w[i]; if (r < 0) { U = pool[i]; break; } }
  const first = !state.uniques[U.id];
  state.uniques[U.id] = (state.uniques[U.id] || 0) + 1;
  checkAch();
  state.stats.uniques = (state.stats.uniques || 0) + 1;
  state.stats.items++;
  // one you already own: it melts into your copy as free upgrades (and Fame once that copy is maxed)
  const owned = [...state.inv, ...Object.values(state.classes).flatMap((C) => Object.values(C.gear))].filter((x) => x?.u === U.id).sort((a, b) => b.up - a.up)[0];
  if (owned) {
    const ups = Math.max(0, Math.min(BAL.dupeUpgrades, maxUpOf(owned) - owned.up));
    owned.up += ups;
    const fame = ups < BAL.dupeUpgrades ? salvageValue(makeUnique(0, U.id)) : 0;
    if (fame) gainFame(fame, false);
    changed('gear');
    // a starter's repeat is a small thing: no fanfare, just the upgrade
    return { it: owned, salvaged: 0, unique: true, first: false, dupe: { ups, fame }, exalted: !!U.exalted, quiet: !!U.starter };
  }
  const it = makeUnique(state.nextId++, U.id);
  state.inv.push(it);
  return { it, salvaged: 0, unique: true, first, exalted: !!U.exalted };
}
const killFame = (stage) => BAL.fameKill(levelOf(stage)) * fameMult();
const clearFame = (stage) => BAL.fameClear(levelOf(stage)) * fameMult() * (isBoss(stage) ? BAL.bossFame : 1);

// ---------- the live battle ----------
export let battle = null;
export function startBattle() {
  const st = partyStats(); statSig = sigOf(st);
  battle = createBattle(state.stage, state.realm, st, rng.int(0, 2 ** 31), battleExtra());
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
      // the only loot: Uniques, from bosses now and then (and in dungeons, very rarely from anything else)
      const u = rollUnique(state.stage, ev.boss) || (ev.elite ? rollUnique(state.stage, false) : null);
      if (u) out.push({ k: 'drop', at, ...u });
    }
    if (ev.k === 'won') {
      const f = clearFame(state.stage); gainFame(f); state.stats.clears++;
      if (isBoss(state.stage)) state.stats.bosses++;
      const Z = zoneOf(state.stage);
      let first;
      if (Z.dungeon) { first = localStage(state.stage) > dBest(Z); if (first) state.dbest[Z.id] = localStage(state.stage); }
      else {
        first = state.stage > state.best;
        if (first) { state.best = state.stage; syncUniques(); }
        // the first Oryx in each Realm opens the next tier of dungeons
        if (first && state.stage === LAST_STAGE && state.realm + 1 > dungeonTier() && dungeonTier() < TIERS) {
          state.dtier = Math.min(TIERS, state.realm + 1);
          out.push({ k: 'dungeons', tier: state.dtier, names: DUNGEONS.filter((d) => d.tier === state.dtier).map((d) => d.name) });
        }
      }
      // beating Oryx in a Realm you haven't beaten before: its Realm reward, if it has one
      if (!Z.dungeon && state.stage === LAST_STAGE && state.realm + 1 > (state.peak || 0)) {
        state.peak = state.realm + 1;
        const got = REWARDS.filter((r) => r.realm === state.peak);
        if (got.length) { syncAwaken(); if (battle) { battle.pet = petInfo(battle.pet); battle.cos = cosmetics(); } out.push({ k: 'reward', list: got }); }
      }
      if (first || isBoss(state.stage)) checkAch();
      if (state.flags.wallAt != null && state.stage >= state.flags.wallAt) state.flags.wallAt = null;
      out.push({ k: 'clear', n: f, stage: state.stage, first });
    }
  }
  return out;
}
/** Advance the live battle by one tick. Returns that tick's battle events and the rewards they paid. */
let statSig = '', statT = 0;
const sigOf = (st) => JSON.stringify(st.map((s) => [s.cls, s.slot, (s.procs || []).map((P) => P.src).join(), Math.round(s.atk), Math.round(s.hp), Math.round(s.def), +s.spd.toFixed(2), s.crit, +s.pow.toFixed(2), s.fx]));
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
  const Z = zoneOf(state.stage);
  if (Z.dungeon) {
    // a dungeon is run start to boss and then again from the top; a defeat steps back a stage
    if (!won) state.stage = Math.max(Z.start, state.stage - 1);
    else if (state.autoPush) state.stage = isBoss(state.stage) ? Z.start : state.stage + 1;
    return;
  }
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
  if (!canEnter(s)) return;
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
  // the party keeps farming where it is if that's a dungeon, else the Realm's furthest stage
  const stage = zoneOf(state.stage).dungeon ? state.stage : Math.max(0, state.best);
  const r = farmRate(stage), eff = offlineEff();
  const fights = (away / r.secPerFight) * eff;
  const clears = fights * r.winRate;
  const fame = clears * (clearFame(stage) + r.kills * killFame(stage)) + (fights - clears) * r.kills * 0.5 * killFame(stage);
  gainFame(fame); state.stats.clears += Math.floor(clears); state.stats.kills += Math.floor(fights * r.kills);
  const salvaged = 0;
  // Uniques: the rolls the fights would have made (a dungeon run meets its boss once per lap), at most three
  const uniques = [], Z = zoneOf(stage);
  const bossShare = isBoss(stage) ? 1 : Z.dungeon && state.autoPush ? 1 / Z.len : 0;
  const expect = clears * (bossShare * uniqueChance(Z, true) + BAL.stageKills * uniqueChance(Z, false));
  const n = Math.min(3, Math.floor(expect) + (rng.next() < expect % 1 ? 1 : 0));
  for (let i = 0; i < n; i++) { const u = rollUnique(stage, bossShare > 0, true); if (u) uniques.push(u); }
  save(); changed('offline');
  return { away, capped: raw > away, fame, clears: Math.floor(clears), drops: uniques.map((u) => u.it), uniques, salvaged, stage };
}

// ---------- Ascension ----------
export function ascendPreview() {
  const n = state.ascensions + 1, g = BAL.ascendGain(n);
  // every class starts again at level 1 with a fifth of the potions it drank; every cap rises too
  const keep = (C) => Object.fromEntries(Object.entries(C.pots || {}).map(([k, v]) => [k, Math.floor(v * BAL.keepPotions)]));
  return { n, gain: g, realm: state.realm + 1, pots: Object.fromEntries(Object.entries(state.classes).map(([c, C]) => [c, keep(C)])) };
}
export function ascend() {
  if (!canAscend()) return false;
  const P = ascendPreview();
  state.mult.dmg *= 1 + P.gain * BAL.ascendDmg; state.mult.fame *= 1 + P.gain;
  state.mult.offline += P.gain * 0.15; state.mult.drops += P.gain * 0.3;
  state.ascensions = P.n; state.realm = P.realm;
  // Uniques are kept (worn ones stay on) but lose their upgrades; everything else is gone
  for (const [c, C] of Object.entries(state.classes)) { C.lv = 1; C.pots = P.pots[c]; C.gear = Object.fromEntries(Object.entries(C.gear).filter(([, it]) => it?.u)); }
  state.inv = state.inv.filter((it) => it.u); state.fame = 0;
  for (const it of [...state.inv, ...Object.values(state.classes).flatMap((C) => Object.values(C.gear))]) if (it) it.up = 0; state.stage = 0; state.best = -1; state.flags.wallAt = null;
  syncUniques();
  rateCache.clear();
  startBattle(); save(); changed('ascend');
  return true;
}

export { CLASSES, SLOTS, isBoss, upgradeCost, canUpgrade, salvageValue };
