// Game state and every action the UI can take. No DOM in here.
//
// Characters are lives. They idle-farm biomes for XP and potions and retreat (never die) when hurt.
// Dungeons are active runs and the only source of gear; falling in one ends that life: the character
// starts over at level 1 and loses what it wore, and its class keeps a legacy of its potion stats.
import { CONFIG } from '../config.js';
import { CLASS, CLASSES, STATS, STAT_LABEL } from '../data/classes.js';
import { ITEMS, tierLabel } from '../data/items.js';
import { BIOME, DUNGEON, EVENT_BOSS } from '../data/world.js';
import { makeRng } from './rng.js';
import { newCombat, step } from './combat.js';
import { newCharacter, fighterOf, levelOf, statBreakdown, legacyOf, GEAR_SLOTS, starterItem, levelStat } from './character.js';
import { biomeEnemy, rollPotion, utDungeon } from './loot.js';
import { GOALS } from '../data/goals.js';

const SAVE_KEY = 'idle-realm-save-v1'; // key kept; state.v tracks the format
const VERSION = 3;
const NAMES = ['Kael', 'Mira', 'Thorne', 'Ysolde', 'Bram', 'Lysa', 'Corvin', 'Elka', 'Dain', 'Sera', 'Varek', 'Nyx', 'Oren', 'Talia', 'Ash', 'Rook', 'Wren', 'Iska', 'Fen', 'Maren'];

// ---------- tiny event bus for the UI ----------
const listeners = {};
export const on = (ev, fn) => { (listeners[ev] ||= []).push(fn); return () => { listeners[ev] = listeners[ev].filter((f) => f !== fn); }; };
export const emitUi = (ev, data) => { for (const fn of listeners[ev] || []) fn(data); };

export let state = null;
let quietDiscover = false; // dungeon results show their own NEW tags

function freshFarm() {
  return { biome: 'forest', status: 'idle', simMs: 0, rngState: (Math.random() * 2 ** 32) >>> 0, cs: null, session: null, prev: null };
}
export function newGame() {
  const now = Date.now();
  return {
    v: VERSION, createdAt: now, savedAt: now,
    slots: CONFIG.startSlots, purchasedSlots: 0, earnedSlots: [],
    chars: Array(CONFIG.startSlots).fill(null), farms: Array.from({ length: CONFIG.startSlots }, freshFarm),
    vault: {}, found: {}, newIds: {}, exalt: {}, legacy: {}, essence: 0, classBest: {}, clears: {}, run: null,
    graveyard: [], runeMiss: {},
    stats: { kills: 0, deaths: 0, clears: 0, potionsDrunk: 0, itemsFound: 0, retreats: 0, salvaged: 0, reforged: 0 },
    view: 0, nextCharId: 1, settings: { sound: true },
  };
}

// ---------- save / load ----------
export function load() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    state = raw ? JSON.parse(raw) : null;
  } catch { state = null; }
  if (state && state.v !== VERSION) state = migrate(state);
  if (!state) {
    state = newGame();
    createCharacterIn(0, 'wizard');
    startFarming(0, 'forest');
    state.view = 0;
  }
  for (let i = 0; i < state.slots; i++) state.farms[i] ||= freshFarm();
  // a farm left without a fight (older saves) restarts it
  state.farms.forEach((f, i) => { if (f?.status === 'farming' && !f.cs && state.chars[i]) startFarming(i, f.biome, f.simMs || Date.now()); });
  state.settings ||= {}; state.settings.sound ??= true;
  state.visited ||= {}; for (const f of state.farms) if (f?.status === 'farming') state.visited[f.biome] = true;
  if (state.run) { // a run can't survive a reload: count it as a retreat (nothing lost)
    const f = state.farms[state.run.slot]; if (f) f.status = 'idle';
    state.run = null;
  }
  return state;
}
/**
 * Saves from before lives: characters keep their potions (as potion stats) and what they wore becomes real gear.
 * UT unlocks, potions and runes stay. Any fight in progress restarts.
 */
function migrate(s) {
  if (s.v !== 1 && s.v !== 2) return null;
  for (const c of s.chars) {
    if (!c) continue;
    const C = CLASS[c.cls];
    const lv = Math.min(CONFIG.maxLevel, levelOf(c.xp));
    const pots = {};
    for (const k of STATS) pots[k] = Math.max(0, Math.round((c.stats?.[k] ?? C.base[k]) - C.base[k] - levelStat(c.cls, k, lv)));
    const equip = { weapon: null, ability: null, armor: null, ring: null };
    if (c.tiers) {
      for (const k of ['weapon', 'ability', 'armor']) { const t = c.tiers[k] || 1; if (t > 1 || c.ut?.[k]) equip[k] = c.ut?.[k] || `${C[k]}_t${Math.min(20, t)}`; }
      equip.ring = c.ut?.ring || `ring_${c.ringStat || 'hp'}_t${Math.min(20, c.tiers.ring || 1)}`;
    } else if (c.equip) for (const k of GEAR_SLOTS) equip[k] = c.equip[k] && ITEMS[c.equip[k]] ? c.equip[k] : null;
    Object.assign(c, { life: 1, pots, equip });
    delete c.stats; delete c.tiers; delete c.ut; delete c.ringStat; delete c.pending;
  }
  s.farms = (s.farms || []).map((f) => (f ? { ...f, cs: null, status: f.status === 'farming' ? 'farming' : 'idle', vitals: null } : f));
  for (const f of s.farms) if (f?.status === 'farming') f.simMs = Date.now();
  s.run = null; s.lastRun = null;
  s.legacy ||= {}; s.essence ||= 0; s.graveyard ||= []; s.runeMiss ||= {};
  s.stats = { retreats: 0, salvaged: 0, reforged: 0, ...s.stats };
  s.v = VERSION;
  return s;
}
export function save() {
  if (!state) return;
  state.savedAt = Date.now();
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(state)); } catch { /* storage full or blocked */ }
}
export function resetGame() { try { localStorage.removeItem(SAVE_KEY); } catch {} state = null; load(); save(); }
export function exportSave() { return btoa(unescape(encodeURIComponent(JSON.stringify(state)))); }
export function importSave(text) {
  let s = JSON.parse(decodeURIComponent(escape(atob(text.trim()))));
  if (s.v !== VERSION) s = migrate(s);
  if (!s || !Array.isArray(s.chars)) throw new Error('That isn’t an Idle Realm save.');
  state = s; save();
}

// ---------- fighters (derived, cached) ----------
const fighterCache = new Map();
export function fighter(slot) {
  const c = state.chars[slot];
  if (!c) return null;
  const key = JSON.stringify([c.cls, c.pots, levelOf(c.xp), c.equip, state.exalt[c.cls], state.legacy[c.cls]]);
  const hit = fighterCache.get(slot);
  if (hit && hit.key === key) return hit.F;
  const F = fighterOf(c, state);
  fighterCache.set(slot, { key, F });
  return F;
}
function refreshCombatCaps(slot) {
  const F = fighter(slot), f = state.farms[slot];
  if (f?.cs && F) { f.cs.hp = Math.min(f.cs.hp, F.maxHp); f.cs.mp = Math.min(f.cs.mp, F.maxMp); }
}

// ---------- vault & gear ----------
export const owned = (id) => state.vault[id] || 0;
export const discovered = (id) => (state.found[id] || 0) > 0;
function grant(id, n = 1) {
  state.vault[id] = (state.vault[id] || 0) + n;
  const first = !state.found[id];
  state.found[id] = (state.found[id] || 0) + n;
  if (first) { state.newIds[id] = true; if (!quietDiscover) emitUi('discover', { id }); }
  if (ITEMS[id].slot !== 'potion' && ITEMS[id].slot !== 'rune') state.stats.itemsFound += n;
  return first;
}
export function canUse(cls, id) {
  const it = ITEMS[id], C = CLASS[cls];
  if (!it) return false;
  if (it.slot === 'ring') return true;
  return (it.slot === 'weapon' && it.type === C.weapon) || (it.slot === 'ability' && it.type === C.ability) || (it.slot === 'armor' && it.type === C.armor);
}
export const isGear = (id) => ['weapon', 'ability', 'armor', 'ring'].includes(ITEMS[id]?.slot);
function gearChanged(slot) { refreshCombatCaps(slot); save(); emitUi('gear', { slot }); }
/** Wear an item from the vault. What was worn goes back to the vault (starter gear is free and just disappears). */
export function equip(slot, id) {
  const c = state.chars[slot], it = ITEMS[id];
  if (!c || !it || !canUse(c.cls, id) || owned(id) < 1 || state.run?.slot === slot) return false;
  const old = c.equip[it.slot];
  state.vault[id]--;
  if (old) state.vault[old] = (state.vault[old] || 0) + 1;
  c.equip[it.slot] = id;
  delete state.newIds[id];
  state.stats.equips = (state.stats.equips || 0) + 1;
  gearChanged(slot);
  return true;
}
/** Put a slot back to its starter item; the worn item returns to the vault. */
export function unequip(slot, kind) {
  const c = state.chars[slot], old = c?.equip[kind];
  if (!old || state.run?.slot === slot) return;
  state.vault[old] = (state.vault[old] || 0) + 1; c.equip[kind] = null;
  gearChanged(slot);
}
const itemValue = (it) => (!it ? 0 : it.tier === 'UT' ? it.eq + 0.5 : it.tier);
/** True when id beats what the character wears in that slot (by tier; a UT counts as its tier plus a bit). */
export function isUpgrade(slot, id) {
  const c = state.chars[slot], it = ITEMS[id];
  if (!c || !it || !isGear(id) || !canUse(c.cls, id)) return false;
  return itemValue(it) > itemValue(ITEMS[c.equip[it.slot] || starterItem(c.cls, it.slot)]);
}

// ---------- essence: salvage and reforge ----------
export function salvageValue(id) {
  const it = ITEMS[id];
  if (!it || !isGear(id)) return 0;
  return it.tier === 'UT' ? CONFIG.utSalvageEssence : CONFIG.salvageEssence(it.tier);
}
export function salvage(id, n = 1) {
  const k = Math.min(n, owned(id)), v = salvageValue(id);
  if (!k || !v) return 0;
  state.vault[id] -= k; state.essence += k * v; state.stats.salvaged += k;
  save(); emitUi('gear', { salvage: true });
  return k * v;
}
export function reforgeCost(id) { const d = utDungeon(id); return d ? CONFIG.reforgeCost(d) : Infinity; }
/** Make a fresh copy of a UT you've found before. */
export function reforge(id) {
  const cost = reforgeCost(id);
  if (!discovered(id) || ITEMS[id]?.tier !== 'UT' || state.essence < cost) return false;
  state.essence -= cost; state.vault[id] = (state.vault[id] || 0) + 1; state.stats.reforged++;
  save(); emitUi('gear', { reforge: true });
  return true;
}

// ---------- potions / exaltation ----------
export const exaltCost = (level) => CONFIG.exaltCostStep * (level + 1);
export function exaltInfo(cls, stat) {
  const e = state.exalt[cls]?.[stat] || { drunk: 0, level: 0 };
  return { ...e, need: exaltCost(e.level), maxed: e.level >= CONFIG.exaltMax };
}
export function drinkPotion(slot, stat, count = 1) {
  const c = state.chars[slot]; const id = `pot_${stat}`;
  let drank = 0;
  for (let i = 0; i < count && owned(id) > 0; i++) {
    const sb = statBreakdown(c, state)[stat];
    if (sb.base < sb.max) c.pots[stat] += Math.min(CONFIG.potionGain[stat], sb.max - sb.base);
    else {
      const ex = ((state.exalt[c.cls] ||= {})[stat] ||= { drunk: 0, level: 0 });
      if (ex.level >= CONFIG.exaltMax) break;
      ex.drunk++;
      if (ex.drunk >= exaltCost(ex.level)) {
        ex.drunk = 0; ex.level++;
        emitUi('toast', { title: `${CLASS[c.cls].name} exalted`, body: `+${CONFIG.exaltGain[stat]} ${STAT_LABEL[stat]} for every ${CLASS[c.cls].name}.`, kind: 'gold' });
      }
    }
    state.vault[id]--; drank++; state.stats.potionsDrunk++;
  }
  if (drank) { refreshCombatCaps(slot); save(); emitUi('gear', { slot, drink: true }); }
  return drank;
}
/** 3 potions of one stat become 1 potion of another. */
export function convertPotions(fromStat, toStat) {
  const from = `pot_${fromStat}`;
  if (fromStat === toStat || owned(from) < CONFIG.potionConvertCost) return false;
  state.vault[from] -= CONFIG.potionConvertCost;
  grant(`pot_${toStat}`); save(); emitUi('gear', { drink: true });
  return true;
}

// ---------- First Steps ----------
export function goalList() {
  const done = state.goals || {};
  return GOALS.map((g) => ({ ...g, claimed: !!done[g.id], ready: !done[g.id] && g.check(state) }));
}
export const goalsClaimable = () => goalList().filter((g) => g.ready).length;
export const goalsFinished = () => goalList().every((g) => g.claimed);
/** Claim a goal: potions (random kinds) and essence. Returns what was granted. */
export function claimGoal(id) {
  const g = goalList().find((x) => x.id === id);
  if (!g || !g.ready) return null;
  const out = { potions: [], essence: g.reward.essence || 0 };
  for (let i = 0; i < (g.reward.potions || 0); i++) out.potions.push(`pot_${STATS[Math.floor(Math.random() * STATS.length)]}`);
  for (const it of out.potions) grant(it);
  state.essence += out.essence;
  (state.goals ||= {})[id] = true;
  save();
  return out;
}

// ---------- characters & slots ----------
export function classUnlocked(cls) {
  const C = CLASS[cls];
  return !C.parent || (state.classBest[C.parent] || 0) >= CONFIG.classUnlockLevel;
}
export function createCharacterIn(slot, cls, name) {
  if (!classUnlocked(cls)) return null;
  retire(slot);
  const c = newCharacter(state.nextCharId++, cls, name || NAMES[Math.floor(Math.random() * NAMES.length)]);
  state.chars[slot] = c;
  state.farms[slot] = freshFarm();
  fighterCache.delete(slot);
  save();
  return c;
}
/** Remove a character. Its gear goes back to the vault. */
export function retire(slot) {
  const c = state.chars[slot];
  if (!c) return;
  for (const id of Object.values(c.equip || {})) if (id) state.vault[id] = (state.vault[id] || 0) + 1;
  state.chars[slot] = null; state.farms[slot] = freshFarm(); fighterCache.delete(slot);
}
export function renameCharacter(slot, name) {
  const c = state.chars[slot]; if (!c) return;
  c.name = String(name).trim().slice(0, 16) || c.name; save();
}
export function addSlot(reason) {
  if (state.slots >= CONFIG.maxSlots) return false;
  state.slots++; state.chars.push(null); state.farms.push(freshFarm());
  if (reason === 'purchase') state.purchasedSlots++; else state.earnedSlots.push(reason);
  save();
  return true;
}
/**
 * A character falls in a dungeon. Its class keeps a legacy: half of its potion progress, never less than before.
 * It loses what it wore (UTs stay unlocked for reforging), leaves some essence, and starts a new life at level 1.
 */
function characterFalls(slot, where) {
  const c = state.chars[slot], lv = levelOf(c.xp), C = CLASS[c.cls];
  const leg = (state.legacy[c.cls] ||= Object.fromEntries(STATS.map((k) => [k, 0])));
  const before = { ...leg };
  for (const k of STATS) {
    const progress = Math.min(C.max[k] - C.base[k], (leg[k] || 0) + (c.pots[k] || 0));
    leg[k] = Math.max(leg[k] || 0, Math.floor(progress * CONFIG.legacyShare));
  }
  const lost = Object.values(c.equip).filter(Boolean);
  const essence = CONFIG.deathEssence(lv);
  state.essence += essence;
  state.graveyard.unshift({ name: c.name, cls: c.cls, life: c.life, level: lv, kills: c.kills, clears: c.clears, where, at: Date.now(), lost });
  state.graveyard.length = Math.min(state.graveyard.length, 30);
  c.xp = 0; c.life = (c.life || 1) + 1; c.deaths++;
  c.pots = Object.fromEntries(STATS.map((k) => [k, 0]));
  c.equip = { weapon: null, ability: null, armor: null, ring: null };
  state.stats.deaths++;
  fighterCache.delete(slot);
  return { lost, essence, level: lv, legacyGained: Object.fromEntries(STATS.map((k) => [k, leg[k] - before[k]])) };
}

function noteLevel(c, before) {
  const lv = levelOf(c.xp);
  if (lv <= before) return;
  emitUi('levelup', { name: c.name, level: lv });
  if (lv > (state.classBest[c.cls] || 0)) {
    const wasLocked = CLASSES.filter((k) => !classUnlocked(k.id)).map((k) => k.id);
    state.classBest[c.cls] = lv;
    for (const id of wasLocked) if (classUnlocked(id)) emitUi('toast', { title: `${CLASS[id].name} unlocked`, body: `Your ${CLASS[c.cls].name} reached level ${CONFIG.classUnlockLevel}.`, kind: 'gold' });
  }
}

// ---------- farming ----------
/** Remember HP/MP when a character leaves combat, so switching biomes can't refill them. */
function storeVitals(slot, cs, atMs) {
  state.farms[slot].vitals = cs ? { hp: Math.max(0, cs.hp), mp: Math.max(0, cs.mp), atMs } : null;
}
/** HP/MP now: stored values plus out-of-combat recovery for the time since. */
export function currentVitals(slot, F, atMs = Date.now()) {
  const f = state.farms[slot];
  let v = f.vitals;
  if (f.status === 'farming' && f.cs) v = { hp: f.cs.hp, mp: f.cs.mp, atMs: f.simMs };
  if (!v) return { hp: F.maxHp, mp: F.maxMp };
  const sec = Math.max(0, (atMs - v.atMs) / 1000);
  return {
    hp: Math.min(F.maxHp, v.hp + sec * (F.hpRegen * CONFIG.outOfCombatRegenMult + F.maxHp * CONFIG.walkHealPct)),
    mp: Math.min(F.maxMp, v.mp + sec * F.mpRegen * CONFIG.outOfCombatRegenMult),
  };
}
export function startFarming(slot, biomeId, atMs = Date.now()) {
  const f = state.farms[slot], F = fighter(slot);
  if (!F || state.run?.slot === slot) return;
  const v = currentVitals(slot, F, atMs);
  f.biome = biomeId; f.status = 'farming'; f.simMs = atMs;
  (state.visited ||= {})[biomeId] = true;
  f.cs = newCombat(F); f.cs.hp = v.hp; f.cs.mp = v.mp;
  f.session = { startMs: atMs, kills: 0, xp: 0, potions: 0, drops: [], newFinds: 0, endMs: null };
  save();
}
export function stopFarming(slot) {
  const f = state.farms[slot];
  if (f.status !== 'farming') return;
  storeVitals(slot, f.cs, f.simMs);
  f.status = 'idle'; f.session.endMs = Date.now(); f.cs = null; save();
}

function farmSource(slot, emit) {
  const f = state.farms[slot], c = state.chars[slot], biome = BIOME[f.biome];
  return {
    next: (rng) => biomeEnemy(biome, rng),
    onKill: (e, rng) => {
      const before = levelOf(c.xp);
      c.xp += e.xp; c.kills++; state.stats.kills++;
      f.session.kills++; f.session.xp += e.xp;
      noteLevel(c, before);
      const give = (id) => {
        if (grant(id)) f.session.newFinds++;
        f.session.potions++;
        f.session.drops.unshift(id); f.session.drops.length = Math.min(f.session.drops.length, 12);
        emit?.('drop', { id });
      };
      if (e.event) {
        for (let i = 0; i < EVENT_BOSS.guaranteedPotions; i++) give(rollPotion(rng));
        if (rng.next() < biome.potionRate * EVENT_BOSS.potionMult) give(rollPotion(rng));
      } else if (rng.next() < biome.potionRate * (e.elite ? CONFIG.eliteDropMult : 1)) give(rollPotion(rng));
    },
  };
}

/** Advance one farming slot up to `toMs`, at most maxTicks. Below CONFIG.retreatHp the character retreats and waits. */
export function advanceFarm(slot, toMs, maxTicks = Infinity, emit = null) {
  const f = state.farms[slot];
  if (f.status !== 'farming') return 0;
  const dtMs = CONFIG.tickSeconds * 1000;
  const due = Math.min(Math.floor((toMs - f.simMs) / dtMs), maxTicks);
  if (due <= 0) return 0;
  const rng = makeRng(0); rng.s = f.rngState;
  const src = farmSource(slot, emit);
  let i = 0;
  for (; i < due; i++) {
    const F = fighter(slot);
    step(f.cs, F, src, rng, emit, 'auto');
    if (f.cs.dead || f.cs.hp < F.maxHp * CONFIG.retreatHp) {
      i++;
      f.cs.dead = false; f.cs.hp = Math.max(1, f.cs.hp);
      f.simMs += i * dtMs; f.rngState = rng.s;
      storeVitals(slot, f.cs, f.simMs);
      f.status = 'retreated'; f.session.endMs = f.simMs; f.cs = null;
      state.stats.retreats++;
      emitUi('retreated', { slot, biome: f.biome });
      return i;
    }
  }
  f.simMs += i * dtMs;
  f.rngState = rng.s;
  return i;
}
/** Tapping the battle fires an extra volley (watching speeds things up a little). */
export function farmTap(slot) {
  const f = state.farms[slot];
  if (f?.status !== 'farming' || !f.cs?.enemy) return false;
  f.cs.tapShots = Math.min((f.cs.tapShots || 0) + 1, CONFIG.maxQueuedTaps);
  return true;
}

// ---------- dungeons (active runs; see core/arena.js) ----------
export function runesOwned() { return ['rune_sword', 'rune_shield', 'rune_helm'].filter((r) => owned(r) > 0); }
export function canEnter(dungeonId) {
  const d = DUNGEON[dungeonId];
  return !d.needsRunes || d.needsRunes.every((r) => owned(r) > 0);
}
/** Start a run: farming pauses, runes are used up. Returns what the arena needs, or null. */
export function beginDungeon(slot, dungeonId) {
  const F = fighter(slot), d = DUNGEON[dungeonId];
  if (!F || state.run || !canEnter(dungeonId)) return null;
  if (d.needsRunes) for (const r of d.needsRunes) state.vault[r]--;
  const f = state.farms[slot];
  const prev = f.status === 'farming' || f.status === 'retreated' ? f.biome : null;
  const v = currentVitals(slot, F);
  if (f.status === 'farming') stopFarming(slot);
  f.status = 'dungeon';
  // runes: about 40% of clears, guaranteed after a couple of misses in a row
  const misses = state.runeMiss[dungeonId] || 0;
  const runeDrop = !!d.rune && (misses >= CONFIG.runePityMisses || Math.random() < CONFIG.runeChance);
  state.run = { slot, dungeonId, startMs: Date.now(), prev, runeDrop };
  save();
  return { F, d, cls: state.chars[slot].cls, hp: Math.max(F.maxHp * 0.5, v.hp), mp: v.mp, runeDrop };
}
/**
 * End a run. outcome: 'won' | 'died' | 'retreated'. loot: item ids collected during the run.
 * Won: loot goes to the vault, plus XP and essence. Retreated: safe, but the run's loot is left behind.
 * Died: the life ends (see characterFalls) and the run's loot is lost with it.
 */
export function endDungeon(outcome, loot = [], ms = 0) {
  const r = state.run; if (!r) return null;
  const slot = r.slot, c = state.chars[slot], d = DUNGEON[r.dungeonId];
  const res = { dungeonId: r.dungeonId, slot, outcome, durationMs: ms, xp: 0, items: [], newIds: [], essence: 0, slotEarned: false, death: null, name: c.name, cls: c.cls };
  if (outcome === 'won') {
    const before = levelOf(c.xp);
    c.xp += d.xp; c.clears++; res.xp = d.xp; noteLevel(c, before);
    quietDiscover = true;
    for (const id of loot) if (grant(id)) res.newIds.push(id);
    quietDiscover = false;
    res.items = loot;
    res.essence = CONFIG.clearEssence(d); state.essence += res.essence;
    state.clears[r.dungeonId] = (state.clears[r.dungeonId] || 0) + 1; state.stats.clears++;
    if (d.rune) state.runeMiss[r.dungeonId] = loot.includes(d.rune) ? 0 : (state.runeMiss[r.dungeonId] || 0) + 1;
    if (d.slotReward && state.clears[r.dungeonId] === 1 && addSlot(`clear:${r.dungeonId}`)) res.slotEarned = true;
  } else if (outcome === 'died') {
    res.death = characterFalls(slot, d.name);
    res.essence = res.death.essence;
  } else state.stats.retreats++;
  state.run = null;
  const f = state.farms[slot];
  f.status = 'idle'; f.vitals = null;
  if (outcome === 'died') startFarming(slot, 'forest');
  else if (r.prev) startFarming(slot, r.prev);
  save();
  emitUi('runEnd', res);
  return res;
}

/** Ticks still owed across every slot, for the catch-up screen. */
export function ticksBehind(now = Date.now()) {
  const dtMs = CONFIG.tickSeconds * 1000;
  let n = 0;
  state.farms.forEach((f) => { if (f.status === 'farming') n += Math.max(0, Math.floor((now - f.simMs) / dtMs)); });
  return n;
}
export const describeItem = (id) => `${ITEMS[id].name} ${tierLabel(ITEMS[id])}`.trim();
export { STATS, legacyOf };
