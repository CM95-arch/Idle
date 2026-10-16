// Items: making them, reading their stats, upgrading and salvaging them.
import { BAL } from '../data/balance.js';
import { KINDS } from '../data/gear.js';
import { CLASSES } from '../data/classes.js';
import { UNIQUE } from '../data/uniques.js';

export const RARITY = BAL.rarities;
export const slotOf = (it) => KINDS[it.kind].slot;
export const UNIQUE_RARITY = RARITY.length - 1;
export const uniqueOf = (it) => (it?.u ? UNIQUE[it.u] : null);
// Uniques keep pace with you: their item level (for upgrade costs and salvage) follows your best stage.
let uniqueLevel = 0;
export const setUniqueLevel = (n) => { uniqueLevel = Math.max(0, n); };
// Gear Awakening (a Realm reward) lets gear go past +10, five upgrades at a time
let awaken = 0;
export const setAwaken = (n) => { awaken = Math.max(0, n); };
/** How far an item can be upgraded. */
export const maxUpOf = (it) => RARITY[it.rarity].maxUp + (it.u ? BAL.awakenStep * awaken : 0);
export const ilvlOf = () => uniqueLevel; // costs and salvage keep pace with your progress

/** Which kind a class wears in a slot. */
export function kindFor(cls, slot) {
  const C = CLASSES[cls];
  return slot === 'weapon' ? C.weapon : slot === 'armor' ? C.armor : slot === 'ability' ? C.abilityItem : 'ring';
}
export const fits = (cls, it) => kindFor(cls, slotOf(it)) === it.kind;

// Every item is a Unique. Its stats are percentages, so they grow with your heroes forever and a Unique is
// never outgrown: weapons add Attack, armor HP and Defense, ability items ability power and Attack, rings their
// stat. Mythic ones give half as much again. Each upgrade adds another share of the base.
const UT_BASE = { weapon: { atkPct: 25 }, armor: { hpPct: 30, defPct: 30 }, ability: { pow: 0.25, atkPct: 15 } };
// Stat bonuses (an item's `rot`), turned into this game's percentages: each point of ATT is +3% Attack,
// DEX +2% fire rate, DEF (and armor) +3%/+2% Defense, every 10 HP +2% HP, WIS and MP feed ability power.
const ROT = { att: ['atkPct', 3], dex: ['spdPct', 2], def: ['defPct', 3], armor: ['defPct', 2], hp: ['hpPct', 0.2], mp: ['pow', 0.001], wis: ['pow', 0.02], vit: ['hpPct', 1.5], spd: ['spdPct', 1] };
export function rotStats(rot) {
  const out = {};
  for (const [k, v] of Object.entries(rot || {})) { const [s, f] = ROT[k] || []; if (s) out[s] = (out[s] || 0) + v * f; }
  return out;
}
const RING_BASE = { hp: { hpPct: 30 }, atk: { atkPct: 25 }, def: { defPct: 40 } };

export function makeUnique(id, uid) {
  const U = UNIQUE[uid];
  const it = { id, kind: U.kind, ilvl: uniqueLevel, rarity: UNIQUE_RARITY, up: 0, u: uid, name: U.name, extras: U.extra ? [{ ...U.extra }] : [] };
  if (U.ring) it.ring = U.ring;
  return it;
}

/** What an item gives: percent bonuses (and ability power), its fixed extra stat included. */
export function itemStats(it) {
  const slot = slotOf(it), U = uniqueOf(it);
  const k = (U?.exalted ? 1.5 : U?.starter ? BAL.starterPower : 1) * (1 + BAL.upgradeStep * it.up);
  const out = {};
  // weapons and ability items keep a flat Unique bonus; armor and rings carry their own stat lines
  const base = U?.rot && (slot === 'armor' || slot === 'ring') ? rotStats(U.rot) : { ...(slot === 'ring' ? RING_BASE[it.ring] || RING_BASE.atk : UT_BASE[slot]) };
  if (U?.rot && slot !== 'armor' && slot !== 'ring') for (const [s, v] of Object.entries(rotStats(U.rot))) base[s] = (base[s] || 0) + v;
  for (const [s, v] of Object.entries(base)) out[s] = v * k;
  for (const e of it.extras || []) if (e?.k) out[e.k] = (out[e.k] || 0) + e.v; // (older saves hold empty ones)
  return out;
}
/** A single number for comparing items of the same slot (the special effect counts for a lot). */
export function itemScore(it) {
  const s = itemStats(it);
  return ((s.atkPct || 0) + (s.hpPct || 0) * 0.6 + (s.defPct || 0) * 0.5 + (s.pow || 0) * 100 + (s.spdPct || 0) + (s.crit || 0) + (s.famePct || 0) * 0.3 + 20) * (uniqueOf(it)?.exalted ? 1.3 : 1);
}
export const upgradeCost = (it) => BAL.upgradeCost(ilvlOf(it), it.up, it.rarity);
export const canUpgrade = (it) => it.up < maxUpOf(it);
export const salvageValue = (it) => BAL.salvage(ilvlOf(it)) + Math.round(upgradeSpent(it) * 0.5);
export function upgradeSpent(it) { let t = 0; for (let u = 0; u < it.up; u++) t += BAL.upgradeCost(ilvlOf(it), u, it.rarity); return t; }
