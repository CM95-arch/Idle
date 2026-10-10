// Game state and every action the UI can take. No DOM in here.
import { CONFIG } from '../config.js';
import { CLASS, CLASSES, STATS, STAT_LABEL } from '../data/classes.js';
import { ITEMS, tierLabel, tierValue } from '../data/items.js';
import { BIOME, DUNGEON } from '../data/world.js';
import { makeRng } from './rng.js';
import { newCombat, step } from './combat.js';
import { newCharacter, fighterOf, levelOf } from './character.js';
import { biomeEnemy, rollItem, rollPotion } from './loot.js';
import { createRun, advanceRun, rollRewards } from './dungeon.js';

const SAVE_KEY = 'idle-realm-save-v1';
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
    v: 1, createdAt: now, savedAt: now, essence: 0,
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
  if (!state || state.v !== 1) {
    state = newGame();
    // first character so the game opens in a working state
    const c = createCharacterIn(0, 'wizard');
    startFarming(0, 'forest');
    state.view = 0;
    void c;
  }
  for (let i = 0; i < state.slots; i++) state.farms[i] ||= freshFarm();
  state.settings ||= {}; state.settings.sound ??= true;
  return state;
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
  if (s.v !== 1 || !Array.isArray(s.chars)) throw new Error('That isn’t an Idle Realm save.');
  state = s; save();
}

// ---------- fighters (derived, cached) ----------
const fighterCache = new Map();
export function fighter(slot) {
  const c = state.chars[slot];
  if (!c) return null;
  const key = JSON.stringify([c.stats, c.equip, state.exalt[c.cls]]);
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

// ---------- inventory ----------
export const owned = (id) => state.vault[id] || 0;
export const discovered = (id) => (state.found[id] || 0) > 0;
export function equippedCount(id) {
  let n = 0; for (const c of state.chars) if (c) for (const v of Object.values(c.equip)) if (v === id) n++;
  return n;
}
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
function equipQuiet(slot, id) {
  const c = state.chars[slot]; const it = ITEMS[id];
  if (!c || !canUse(c.cls, id) || owned(id) < 1) return false;
  const old = c.equip[it.slot];
  state.vault[id]--;
  if (old) state.vault[old] = (state.vault[old] || 0) + 1;
  c.equip[it.slot] = id;
  refreshCombatCaps(slot);
  return true;
}
export function equip(slot, id) {
  const ok = equipQuiet(slot, id);
  if (ok) { save(); emitUi('gear', { slot }); }
  return ok;
}
/** True when id is a higher tier than what the character wears in that slot. */
export function isUpgrade(slot, id) {
  const c = state.chars[slot], it = ITEMS[id];
  if (!c || !it || !['weapon', 'ability', 'armor', 'ring'].includes(it.slot) || !canUse(c.cls, id)) return false;
  const cur = c.equip[it.slot];
  return !cur || tierValue(it) > tierValue(ITEMS[cur]);
}

export function unequip(slot, kind) {
  const c = state.chars[slot]; const old = c?.equip[kind];
  if (!old) return;
  state.vault[old] = (state.vault[old] || 0) + 1; c.equip[kind] = null;
  refreshCombatCaps(slot); save(); emitUi('gear', { slot });
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

// ---------- Essence ----------
export function essenceValue(id) {
  const it = ITEMS[id];
  if (it.slot === 'potion') return CONFIG.potionEssenceValue;
  if (it.slot === 'rune') return 0;
  return it.tier === 'UT' ? CONFIG.utEssenceValue : CONFIG.essenceValue(it.tier);
}
export const forgeCost = (id) => {
  const it = ITEMS[id];
  if (it.slot === 'potion' || it.slot === 'rune') return null;
  return it.tier === 'UT' ? CONFIG.utForgeCost : essenceValue(id) * CONFIG.forgeCostMult;
};
/** Copies that can be dismantled while keeping at least one copy owned. */
export function spareCopies(id) {
  const it = ITEMS[id];
  if (it.slot === 'rune') return 0;
  if (it.slot === 'potion') return owned(id);
  return Math.max(0, owned(id) - (equippedCount(id) > 0 ? 0 : 1));
}
export function dismantle(id, n = spareCopies(id)) {
  n = Math.min(n, spareCopies(id));
  if (n <= 0) return 0;
  state.vault[id] -= n;
  const gain = essenceValue(id) * n;
  state.essence += gain; save();
  return gain;
}
export function dismantleAllPreview() {
  let copies = 0, essence = 0;
  for (const id of Object.keys(state.vault)) {
    const it = ITEMS[id];
    if (!it || it.slot === 'potion' || it.slot === 'rune') continue;
    const n = spareCopies(id); copies += n; essence += n * essenceValue(id);
  }
  return { copies, essence };
}
export function dismantleAll() {
  let total = 0;
  for (const id of Object.keys(state.vault)) {
    const it = ITEMS[id];
    if (it && it.slot !== 'potion' && it.slot !== 'rune') total += dismantle(id);
  }
  return total;
}
export function forge(id) {
  const cost = forgeCost(id);
  if (cost == null || !discovered(id) || state.essence < cost) return false;
  state.essence -= cost; state.vault[id] = (state.vault[id] || 0) + 1; save();
  return true;
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
  // starter gear is free and counts as found
  for (const id of Object.values(c.equip)) if (id) { state.found[id] = (state.found[id] || 0) + 1; }
  state.chars[slot] = c;
  state.farms[slot] = freshFarm();
  fighterCache.delete(slot);
  save();
  return c;
}
/** Remove a character. Its gear goes back to the vault. Potions it drank are gone. */
export function retire(slot) {
  const c = state.chars[slot];
  if (!c) return;
  if (state.run?.slot === slot) abandonRun();
  for (const id of Object.values(c.equip)) if (id) state.vault[id] = (state.vault[id] || 0) + 1;
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
      const mult = e.elite ? CONFIG.eliteDropMult : 1;
      if (rng.next() < CONFIG.itemDropChance(biome.L) * mult) {
        const id = rollItem(biome.tiers, c.cls, rng);
        if (grant(id)) f.session.newFinds++;
        f.session.items++; f.session.drops.unshift(id); f.session.drops.length = Math.min(f.session.drops.length, 12);
        emit?.('drop', { id });
      }
      if (biome.potionRate && rng.next() < biome.potionRate * mult) {
        const id = rollPotion(rng);
        grant(id); f.session.potions++; f.session.drops.unshift(id); f.session.drops.length = Math.min(f.session.drops.length, 12);
        emit?.('drop', { id });
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
export function buyRune() {
  const missing = ['rune_sword', 'rune_shield', 'rune_helm'].filter((r) => owned(r) < 1);
  if (missing.length !== 1 || state.essence < CONFIG.runeEssenceCost) return false;
  state.essence -= CONFIG.runeEssenceCost; grant(missing[0]); save();
  return true;
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
  const result = { dungeonId: r.dungeonId, slot, won: r.phase === 'won', xp: 0, items: [], potions: [], newIds: [], slotEarned: false, durationMs: r.ticks * CONFIG.tickSeconds * 1000 };
  if (result.won) {
    const rw = rollRewards(r, c.cls);
    const before = levelOf(c.xp);
    c.xp += rw.xp; c.clears++; result.xp = rw.xp; noteLevel(c, before);
    quietDiscover = true;
    for (const id of [...rw.items, ...rw.potions]) if (grant(id)) result.newIds.push(id);
    quietDiscover = false;
    result.items = rw.items; result.potions = rw.potions;
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
