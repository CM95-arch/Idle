// Items: making them, reading their stats, upgrading and salvaging them.
import { BAL } from '../data/balance.js';
import { KINDS, MAIN, RING_STATS, EXTRA, PREFIX } from '../data/gear.js';
import { CLASSES } from '../data/classes.js';
import { UNIQUE } from '../data/uniques.js';

export const RARITY = BAL.rarities;
export const slotOf = (it) => KINDS[it.kind].slot;
export const UNIQUE_RARITY = RARITY.length - 1;
export const uniqueOf = (it) => (it?.u ? UNIQUE[it.u] : null);
// Uniques keep pace with you: their item level is always that of your best stage (set by the game).
let uniqueLevel = 0;
export const setUniqueLevel = (n) => { uniqueLevel = Math.max(0, n); };
export const ilvlOf = (it) => (it.u ? uniqueLevel : it.ilvl);

/** Which kind a class wears in a slot. */
export function kindFor(cls, slot) {
  const C = CLASSES[cls];
  return slot === 'weapon' ? C.weapon : slot === 'armor' ? C.armor : slot === 'ability' ? C.abilityItem : 'ring';
}
export const fits = (cls, it) => kindFor(cls, slotOf(it)) === it.kind;

/** Rarity roll; `quality` (0 = base) shifts the odds toward rarer pieces. */
export function rollRarity(rng, quality = 0) {
  const w = RARITY.map((r, i) => r.weight * (1 + quality) ** i);
  let roll = rng.next() * w.reduce((a, b) => a + b, 0);
  for (let i = 0; i < w.length; i++) { roll -= w[i]; if (roll < 0) return i; }
  return 0;
}

export function makeItem(rng, id, kind, ilvl, rarity) {
  const slot = KINDS[kind].slot, R = RARITY[rarity];
  const keys = Object.keys(EXTRA).filter((k) => !(slot === 'weapon' && k === 'atkPct'));
  const extras = [];
  for (let i = 1; i < R.stats; i++) {
    const k = keys.splice(Math.floor(rng.next() * keys.length), 1)[0], E = EXTRA[k];
    extras.push({ k, v: Math.round(E.min + (E.max - E.min) * rng.next() * (0.7 + rarity * 0.06)) });
  }
  const it = { id, kind, ilvl, rarity, up: 0, extras };
  if (slot === 'ring') it.ring = Object.keys(RING_STATS)[Math.floor(rng.next() * 3)];
  const P = PREFIX[rarity], N = KINDS[kind].names;
  it.name = `${P[Math.floor(rng.next() * P.length)]} ${N[Math.floor(rng.next() * N.length)]}`;
  return it;
}

export function makeUnique(id, uid) {
  const U = UNIQUE[uid];
  const it = { id, kind: U.kind, ilvl: uniqueLevel, rarity: UNIQUE_RARITY, up: 0, u: uid, name: U.name, extras: [{ ...U.extra }] };
  if (U.ring) it.ring = U.ring;
  return it;
}

/** Flat stats an item gives (hp, atk, def, pow) plus its percent extras. */
export function itemStats(it) {
  const slot = slotOf(it), R = RARITY[it.rarity];
  const scale = BAL.gearGrowth ** ilvlOf(it) * R.mult * (1 + BAL.upgradeStep * it.up);
  const out = {};
  const base = slot === 'ring' ? { [it.ring]: RING_STATS[it.ring] } : slot === 'ability' ? { atk: 3, ...MAIN.ability } : MAIN[slot];
  for (const [k, v] of Object.entries(base)) out[k] = k === 'pow' ? v * R.mult * (1 + BAL.upgradeStep * it.up) : v * scale;
  for (const e of it.extras) out[e.k] = (out[e.k] || 0) + e.v;
  return out;
}
/** A single number for comparing items of the same slot. */
export function itemScore(it) {
  const s = itemStats(it);
  return ((s.atk || 0) * 5 + (s.hp || 0) + (s.def || 0) * 12 + (s.pow || 0) * 300 + ((s.atkPct || 0) + (s.hpPct || 0) + (s.defPct || 0) + (s.spdPct || 0) * 1.5 + (s.crit || 0) * 1.5 + (s.famePct || 0)) * 3 * BAL.gearGrowth ** ilvlOf(it)) * (it.u ? 1.25 : 1);
}
export const upgradeCost = (it) => BAL.upgradeCost(ilvlOf(it), it.up, it.rarity);
export const canUpgrade = (it) => it.up < RARITY[it.rarity].maxUp;
export const salvageValue = (it) => BAL.salvage(ilvlOf(it), it.rarity) + Math.round(upgradeSpent(it) * 0.5);
export function upgradeSpent(it) { let t = 0; for (let u = 0; u < it.up; u++) t += BAL.upgradeCost(ilvlOf(it), u, it.rarity); return t; }
