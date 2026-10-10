// Game state and every action the UI can take. No DOM in here.
import { CONFIG } from '../config.js';
import { CLASS, CLASSES, STATS, STAT_LABEL } from '../data/classes.js';
import { ITEMS, tierLabel } from '../data/items.js';
import { BIOME, DUNGEON, EVENT_BOSS } from '../data/world.js';
import { makeRng } from './rng.js';
import { newCombat, step } from './combat.js';
import { newCharacter, fighterOf, levelOf, GEAR_SLOTS, slotType } from './character.js';
import { biomeEnemy, rollPotion } from './loot.js';
import { createRun, advanceRun, rollRewards } from './dungeon.js';
import { GOALS } from '../data/goals.js';

const SAVE_KEY = 'idle-realm-save-v1'; // key kept; state.v tracks the format
const NAMES = ['Kael', 'Mira', 'Thorne', 'Ysolde', 'Bram', 'Lysa', 'Corvin', 'Elka', 'Dain', 'Sera', 'Varek', 'Nyx', 'Oren', 'Talia', 'Ash', 'Rook', 'Wren', 'Iska', 'Fen', 'Maren'];

// ---------- tiny event bus for the UI ----------
const listeners = {};
export const on = (ev, fn) => { (listeners[ev] ||= []).push(fn); return () => { listeners[ev] = listeners[ev].filter((f) => f !== fn); }; };
export const emitUi = (ev, data) => { for (const fn of listeners[ev] || []) fn(data); };

export let state = null;
let quietDiscover = false; // dungeon rewards show their own NEW tags

function freshFarm() {
  return { biome: 'forest', status: 'idle', simMs: 0, rngState: (Math.random() * 2 ** 32) >>> 0, cs: null, session: null, prev: null };
}
export function newGame() {
  const now = Date.now();
  const s = {
    v: 2, createdAt: now, savedAt: now,
    slots: CONFIG.startSlots, purchasedSlots: 0, earnedSlots: [],
    chars: Array(CONFIG.startSlots).fill(null), farms: Array.from({ length: CONFIG.startSlots }, freshFarm),
    vault: {}, found: {}, newIds: {}, exalt: {}, classBest: {}, clears: {}, run: null, lastRun: null,
    stats: { kills: 0, deaths: 0, clears: 0, potionsDrunk: 0, itemsFound: 0 },
    view: 0, nextCharId: 1, settings: { sound: true },
  };
  return s;
}

// ---------- save / load ----------
export function load() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    state = raw ? JSON.parse(raw) : null;
  } catch { state = null; }
  if (state?.v === 1) migrateV1(state);
  if (!state || state.v !== 2) {
    state = newGame();
    // first character so the game opens in a working state
    createCharacterIn(0, 'wizard');
    startFarming(0, 'forest');
    state.view = 0;
  }
  for (let i = 0; i < state.slots; i++) state.farms[i] ||= freshFarm();
  state.settings ||= {}; state.settings.sound ??= true;
  state.visited ||= {}; for (const f of state.farms) if (f?.status === 'farming') state.visited[f.biome] = true;
  return state;
}
/** v1 saves had tiered items in the vault. Keep what each character wore as its slot tiers; keep UTs, potions and runes. */
function migrateV1(s) {
  for (const c of s.chars) {
    if (!c || c.tiers) continue;
    const eq = c.equip || {};
    c.tiers = {}; c.ut = {}; c.pending = []; c.ringStat = 'hp';
    for (const k of GEAR_SLOTS) {
      const it = ITEMS[eq[k]];
      c.tiers[k] = Math.max(1, Math.min(20, it ? (it.tier === 'UT' ? it.eq : it.tier) : 1));
      c.ut[k] = it?.tier === 'UT' ? it.id : null;
      if (k === 'ring' && it?.ringStat) c.ringStat = it.ringStat;
    }
    delete c.equip;
  }
  for (const id of Object.keys(s.vault)) if (!ITEMS[id] || typeof ITEMS[id].tier === 'number') delete s.vault[id];
  for (const id of Object.keys(s.found)) if (!ITEMS[id] || typeof ITEMS[id].tier === 'number') delete s.found[id];
  for (const id of Object.keys(s.newIds)) if (!ITEMS[id] || typeof ITEMS[id].tier === 'number') delete s.newIds[id];
  s.v = 2;
}
export function save() {
  if (!state) return;
  state.savedAt = Date.now();
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(state)); } catch { /* storage full or blocked */ }
}
export function resetGame() { try { localStorage.removeItem(SAVE_KEY); } catch {} state = null; load(); save(); }
export function exportSave() { return btoa(unescape(encodeURIComponent(JSON.stringify(state)))); }
export function importSave(text) {
  const s = JSON.parse(decodeURIComponent(escape(atob(text.trim()))));
  if (s.v === 1) migrateV1(s);
  if (s.v !== 2 || !Array.isArray(s.chars)) throw new Error('That isn’t an Idle Realm save.');
  state = s; save();
}

// ---------- fighters (derived, cached) ----------
const fighterCache = new Map();
export function fighter(slot) {
  const c = state.chars[slot];
  if (!c) return null;
  const key = JSON.stringify([c.stats, c.tiers, c.ut, c.ringStat, state.exalt[c.cls]]);
  const hit = fighterCache.get(slot);
  if (hit && hit.key === key) return hit.F;
  const F = fighterOf(c, state);
  fighterCache.set(slot, { key, F });
  return F;
}
function refreshCombatCaps(slot) {
  const F = fighter(slot), f = state.farms[slot];
  if (f?.cs && F) { f.cs.hp = Math.min(f.cs.hp, F.maxHp); f.cs.mp = Math.min(f.cs.mp, F.maxMp); }
  if (state.run?.slot === slot && F) { state.run.cs.hp = Math.min(state.run.cs.hp, F.maxHp); }
}

// ---------- inventory & gear ----------
export const owned = (id) => state.vault[id] || 0;
export const discovered = (id) => (state.found[id] || 0) > 0;
/** UTs are account-wide unlocks: any character that can use one may wear it. */
export const unlocked = discovered;
/** Characters currently wearing a UT. */
export function wearers(id) { return state.chars.filter((c) => c && Object.values(c.ut || {}).includes(id)); }
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
function gearChanged(slot) { refreshCombatCaps(slot); save(); emitUi('gear', { slot }); }
/** Wear an unlocked UT in its slot (it takes the slot's tier), or pass null to go back to the tiered item. */
export function setUt(slot, kind, id) {
  const c = state.chars[slot];
  if (!c) return false;
  if (id && (!unlocked(id) || !canUse(c.cls, id) || ITEMS[id].slot !== kind)) return false;
  c.ut[kind] = id || null;
  if (id) { delete state.newIds[id]; state.stats.utEquips = (state.stats.utEquips || 0) + 1; }
  gearChanged(slot);
  return true;
}
/** Rings: pick which stat the tiered ring gives. Free to change any time. */
export function setRingStat(slot, stat) {
  const c = state.chars[slot];
  if (!c || !STATS.includes(stat)) return;
  c.ringStat = stat; c.ut.ring = null; gearChanged(slot);
}
/** Slots of a character that a pending upgrade to tier t would raise. */
export function upgradeSlots(slot, t) {
  const c = state.chars[slot];
  return c ? GEAR_SLOTS.filter((k) => c.tiers[k] < t) : [];
}
export const pendingUpgrade = (slot) => state.chars[slot]?.pending?.[0] ?? null;
/** Spend the oldest pending upgrade on one gear slot. */
export function chooseUpgrade(slot, kind) {
  const c = state.chars[slot], t = pendingUpgrade(slot);
  if (!t || !upgradeSlots(slot, t).includes(kind)) return false;
  c.tiers[kind] = t; c.pending.shift();
  state.stats.upgrades = (state.stats.upgrades || 0) + 1;
  gearChanged(slot);
  dropUselessUpgrades(slot);
  return true;
}
/** An upgrade no slot can use (every slot already at or above it) is worthless; drop it. */
function dropUselessUpgrades(slot) {
  const c = state.chars[slot];
  c.pending = c.pending.filter((t) => upgradeSlots(slot, t).length);
}
function giveUpgrade(slot, t) {
  const c = state.chars[slot];
  if (!c || !upgradeSlots(slot, t).length) return false;
  c.pending.push(t); c.pending.sort((a, b) => b - a);
  return true;
}
export const slotTypeOf = (slot, kind) => slotType(state.chars[slot].cls, kind);

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
    const max = CLASS[c.cls].max[stat];
    if (c.stats[stat] < max) {
      c.stats[stat] = Math.min(max, c.stats[stat] + CONFIG.potionGain[stat]);
    } else {
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
/** Claim a goal's reward. Upgrades go to the character you're viewing. Returns what was granted. */
export function claimGoal(id) {
  const g = goalList().find((x) => x.id === id);
  if (!g || !g.ready) return null;
  const slot = state.chars[state.view] ? state.view : state.chars.findIndex(Boolean);
  const out = { potions: [], upgrade: null };
  if (g.reward.upgrade && giveUpgrade(slot, g.reward.upgrade)) out.upgrade = g.reward.upgrade;
  else if (g.reward.upgrade) g.reward = { potions: 3 }; // that character is already past it
  for (let i = 0; i < (g.reward.potions || 0); i++) out.potions.push(`pot_${STATS[Math.floor(Math.random() * STATS.length)]}`);
  for (const it of out.potions) grant(it);
  (state.goals ||= {})[id] = true;
  save();
  if (out.upgrade) emitUi('gear', { slot });
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
/** Remove a character. Its tiers and the potions it drank are gone; UT unlocks stay with the account. */
export function retire(slot) {
  const c = state.chars[slot];
  if (!c) return;
  if (state.run?.slot === slot) abandonRun();
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
function currentVitals(slot, F, atMs) {
  const f = state.farms[slot];
  let v = f.vitals;
  if (f.status === 'farming' && f.cs) v = { hp: f.cs.hp, mp: f.cs.mp, atMs: f.simMs };
  else if (f.status === 'fallen') v = { hp: 0, mp: 0, atMs: f.session?.endMs ?? atMs };
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
  f.session = { startMs: atMs, kills: 0, xp: 0, items: 0, potions: 0, drops: [], newFinds: 0, upgrades: 0, endMs: null };
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
  const src = {
    next: (rng) => biomeEnemy(biome, rng),
    onKill: (e, rng) => {
      const before = levelOf(c.xp);
      c.xp += e.xp; c.kills++; state.stats.kills++;
      f.session.kills++; f.session.xp += e.xp;
      noteLevel(c, before);
      const give = (id) => {
        if (grant(id)) f.session.newFinds++;
        if (ITEMS[id].slot === 'potion') f.session.potions++; else f.session.items++;
        f.session.drops.unshift(id); f.session.drops.length = Math.min(f.session.drops.length, 12);
        emit?.('drop', { id });
      };
      const mult = e.elite && !e.event ? CONFIG.eliteDropMult : 1;
      if (e.event) {
        for (let i = 0; i < EVENT_BOSS.guaranteedPotions; i++) give(rollPotion(rng));
        if (rng.next() < biome.potionRate * EVENT_BOSS.potionMult) give(rollPotion(rng));
        if (e.ut && !discovered(e.ut) && rng.next() < EVENT_BOSS.utChance) give(e.ut);
      } else {
        if (rng.next() < biome.potionRate * mult) give(rollPotion(rng));
        if (biome.ut && !discovered(biome.ut) && rng.next() < CONFIG.biomeUtChance * mult) give(biome.ut);
      }
    },
  };
  return src;
}

/** Advance one farming slot up to `toMs`, at most maxTicks. Returns ticks done. */
export function advanceFarm(slot, toMs, maxTicks = Infinity, emit = null) {
  const f = state.farms[slot];
  if (f.status !== 'farming') return 0;
  let F = fighter(slot);
  const dtMs = CONFIG.tickSeconds * 1000;
  const due = Math.min(Math.floor((toMs - f.simMs) / dtMs), maxTicks);
  if (due <= 0) return 0;
  const rng = makeRng(0); rng.s = f.rngState;
  const src = farmSource(slot, emit);
  let i = 0;
  for (; i < due; i++) {
    if (src.dirty) { F = fighter(slot); src.dirty = false; }
    step(f.cs, F, src, rng, emit, 'auto');
    if (f.cs.dead) {
      i++;
      f.status = 'fallen'; f.session.endMs = f.simMs + i * dtMs;
      state.chars[slot].deaths++; state.stats.deaths++;
      emitUi('fallen', { slot });
      break;
    }
  }
  f.simMs += i * dtMs;
  f.rngState = rng.s;
  return i;
}

// ---------- dungeons ----------
export function runesOwned() { return ['rune_sword', 'rune_shield', 'rune_helm'].filter((r) => owned(r) > 0); }
export function canEnter(dungeonId) {
  const d = DUNGEON[dungeonId];
  if (!d.needsRunes) return true;
  return d.needsRunes.every((r) => owned(r) > 0);
}
export function enterDungeon(slot, dungeonId) {
  const F = fighter(slot);
  if (!F || state.run || !canEnter(dungeonId)) return false;
  const d = DUNGEON[dungeonId];
  if (d.needsRunes) for (const r of d.needsRunes) state.vault[r]--;
  const f = state.farms[slot];
  const prev = f.status === 'farming' ? f.biome : null;
  const v = currentVitals(slot, F, Date.now());
  if (f.status === 'farming') stopFarming(slot);
  f.status = 'dungeon';
  const run = createRun(dungeonId, F, (Math.random() * 2 ** 32) >>> 0);
  run.cs.hp = v.hp; run.cs.mp = v.mp;
  state.run = { ...run, slot, startMs: Date.now(), simMs: Date.now(), prev };
  save();
  return true;
}
function finishRun() {
  const r = state.run, slot = r.slot, c = state.chars[slot], d = DUNGEON[r.dungeonId];
  const result = { dungeonId: r.dungeonId, slot, won: r.phase === 'won', xp: 0, items: [], potions: [], newIds: [], upgrade: null, slotEarned: false, durationMs: r.ticks * CONFIG.tickSeconds * 1000 };
  if (result.won) {
    const rw = rollRewards(r, upgradeSlots(slot, d.tier).length > 0, discovered);
    const before = levelOf(c.xp);
    c.xp += rw.xp; c.clears++; result.xp = rw.xp; noteLevel(c, before);
    if (d.rune) {
      const misses = state.runeMiss?.[r.dungeonId] || 0;
      if (misses >= CONFIG.runePityMisses || Math.random() < CONFIG.runeChance) { rw.items.push(d.rune); (state.runeMiss ||= {})[r.dungeonId] = 0; }
      else (state.runeMiss ||= {})[r.dungeonId] = misses + 1;
    }
    quietDiscover = true;
    for (const id of [...rw.items, ...rw.potions]) if (grant(id)) result.newIds.push(id);
    quietDiscover = false;
    result.items = rw.items; result.potions = rw.potions;
    if (rw.upgrade && giveUpgrade(slot, rw.upgrade)) result.upgrade = rw.upgrade;
    state.clears[r.dungeonId] = (state.clears[r.dungeonId] || 0) + 1; state.stats.clears++;
    if (d.slotReward && state.clears[r.dungeonId] === 1 && addSlot(`clear:${r.dungeonId}`)) result.slotEarned = true;
  } else { c.deaths++; state.stats.deaths++; }
  state.lastRun = result;
  state.run = null;
  storeVitals(slot, r.cs, r.simMs);
  state.farms[slot].status = 'idle';
  if (r.prev) startFarming(slot, r.prev, r.simMs);
  save();
  emitUi('runEnd', result);
}
export function abandonRun() {
  if (!state.run) return;
  const slot = state.run.slot, prev = state.run.prev;
  storeVitals(slot, state.run.cs, state.run.simMs);
  state.run = null; state.farms[slot].status = 'idle';
  if (prev) startFarming(slot, prev);
  save();
}
export function advanceRunTo(toMs, maxTicks = Infinity, emit = null, mode = 'auto') {
  const r = state.run;
  if (!r) return 0;
  const F = fighter(r.slot);
  const dtMs = CONFIG.tickSeconds * 1000;
  const due = Math.min(Math.floor((toMs - r.simMs) / dtMs), maxTicks);
  if (due <= 0) return 0;
  const before = r.ticks;
  advanceRun(r, F, due, emit, mode);
  const done = r.ticks - before;
  r.simMs += done * dtMs;
  if (r.phase === 'won' || r.phase === 'lost') finishRun();
  return done;
}
/** Tapping the battle fires an extra volley (watching speeds things up a little). */
export function farmTap(slot) {
  const f = state.farms[slot];
  if (f?.status !== 'farming' || !f.cs?.enemy) return false;
  f.cs.tapShots = Math.min((f.cs.tapShots || 0) + 1, CONFIG.maxQueuedTaps);
  return true;
}
export function runInput(kind) {
  const r = state.run; if (!r) return;
  if (kind === 'tap' && r.cs.enemy) r.cs.tapShots = Math.min((r.cs.tapShots || 0) + 1, CONFIG.maxQueuedTaps);
  if (kind === 'cast') r.cs.castInput = true;
  if (kind === 'dodge') r.cs.dodgeInput = r.cs.t;
}

/** Ticks still owed across every slot and the run, for the catch-up screen. */
export function ticksBehind(now = Date.now()) {
  const dtMs = CONFIG.tickSeconds * 1000;
  let n = 0;
  state.farms.forEach((f) => { if (f.status === 'farming') n += Math.max(0, Math.floor((now - f.simMs) / dtMs)); });
  if (state.run) n += Math.max(0, Math.floor((now - state.run.simMs) / dtMs));
  return n;
}
export const describeItem = (id) => `${ITEMS[id].name} ${tierLabel(ITEMS[id])}`.trim();
export { STATS };
