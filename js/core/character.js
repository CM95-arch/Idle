// Character stats: class base + potions drunk + exaltation + gear. Levels never add power.
import { CONFIG } from '../config.js';
import { CLASS, STATS } from '../data/classes.js';
import { ITEMS, WEAPON_TYPES, ARMOR_TYPES, weaponStats, abilityStats } from '../data/items.js';

export const GEAR_SLOTS = ['weapon', 'ability', 'armor', 'ring'];

export function newCharacter(id, cls, name) {
  const C = CLASS[cls];
  const stats = {};
  for (const k of STATS) stats[k] = Math.round(C.base[k] + (C.max[k] - C.base[k]) * CONFIG.startStatFraction);
  return {
    id, cls, name, xp: 0, stats, createdAt: Date.now(), kills: 0, deaths: 0, clears: 0,
    // Gear is a tier per slot, raised by dungeon upgrades. A slot can show an unlocked UT instead; it uses the slot's tier.
    tiers: { weapon: 1, ability: 1, armor: 1, ring: 1 }, ringStat: 'hp', ut: { weapon: null, ability: null, armor: null, ring: null }, pending: [],
  };
}

/** The item type a class uses in a slot ('ring' for rings). */
export const slotType = (cls, slot) => (slot === 'ring' ? 'ring' : CLASS[cls][slot]);

const utCache = new Map();
/** A UT item built at slot tier t: the tier's normal base stats plus the UT's own bonus and effect. */
export function utAtTier(id, t) {
  const key = `${id}@${t}`;
  if (utCache.has(key)) return utCache.get(key);
  const it = ITEMS[id];
  const out = { ...it, slotTier: t };
  if (WEAPON_TYPES[it.type]) out.weapon = weaponStats(it.type, t);
  else if (ARMOR_TYPES[it.type]) {
    const A = ARMOR_TYPES[it.type], b = { def: A.def(t), ...A.bonus(t) };
    for (const [k, v] of Object.entries(it.utBonus)) b[k] = (b[k] || 0) + v;
    out.bonus = b;
  } else if (it.type === 'ring') {
    // rings have no base stats, so a UT ring's own bonus grows with the slot tier
    out.bonus = Object.fromEntries(Object.entries(it.utBonus).map(([k, v]) => [k, Math.max(1, Math.round((v * t) / it.eq))]));
  } else out.ability = abilityStats(it.type, t);
  utCache.set(key, out);
  return out;
}

/** What a character has in a slot, resolved to an item object (tiered item, or a UT built at that tier). */
export function gearItem(char, slot, over = {}) {
  const t = over.tier ?? char.tiers[slot];
  const ut = 'ut' in over ? over.ut : char.ut?.[slot];
  if (ut && ITEMS[ut]) return utAtTier(ut, t);
  if (slot === 'ring') return ITEMS[`ring_${over.ringStat || char.ringStat}_t${t}`];
  return ITEMS[`${slotType(char.cls, slot)}_t${t}`];
}
export const gearOf = (char) => GEAR_SLOTS.map((k) => gearItem(char, k));

export function levelInfo(xp) {
  let level = 1, start = 0, need = CONFIG.xpToNext(1);
  while (xp >= start + need) { start += need; level++; need = CONFIG.xpToNext(level); }
  return { level, into: xp - start, need, start };
}
export const levelOf = (xp) => levelInfo(xp).level;

export function exaltBonus(state, cls, stat) {
  const lv = state.exalt?.[cls]?.[stat]?.level || 0;
  return lv * CONFIG.exaltGain[stat];
}

/** Final stats with gear: { total, base, gear, exalt, max } per stat */
export function statBreakdown(char, state) {
  const C = CLASS[char.cls];
  const gear = Object.fromEntries(STATS.map((k) => [k, 0]));
  for (const it of gearOf(char)) {
    if (it) for (const [k, v] of Object.entries(it.bonus)) gear[k] += v;
  }
  const out = {};
  for (const k of STATS) {
    const ex = exaltBonus(state, char.cls, k);
    out[k] = { base: char.stats[k], max: C.max[k], gear: gear[k], exalt: ex, total: char.stats[k] + gear[k] + ex };
  }
  return out;
}
export const maxedCount = (char) => STATS.filter((k) => char.stats[k] >= CLASS[char.cls].max[k]).length;

/** Everything the combat engine needs about a character. */
export function fighterOf(char, state) {
  const sb = statBreakdown(char, state);
  const t = (k) => Math.max(0, sb[k].total);
  const gear = gearOf(char);
  const w = gear[0]?.weapon || { dmgMin: 5, dmgMax: 8, shots: 1, rof: 1 };
  const ab = gear[1];
  // UT effects from everything equipped. Numbers add up; cooldown-style effects take the best one.
  const fx = {};
  for (const it of gear) {
    for (const [k, v] of Object.entries(it?.fx || {})) {
      fx[k] = ['cheatDeath'].includes(k) ? Math.min(fx[k] ?? Infinity, v) : ['burstEvery', 'openerHits', 'rofMult', 'openerMult', 'burstMult', 'buffDur', 'critAfterDodge', 'ignoreDef', 'rampCap', 'luckyMult', 'freeCastEvery'].includes(k) ? Math.max(fx[k] || 0, v) : (fx[k] || 0) + v;
    }
  }
  return {
    fx,
    cls: char.cls,
    maxHp: t('hp'), maxMp: t('mp'), def: t('def'),
    attMult: CONFIG.attMult(t('att')),
    aps: CONFIG.attacksPerSec(t('dex')) * w.rof * (fx.rofMult || 1),
    weaponType: CLASS[char.cls].weapon, dmgMin: w.dmgMin, dmgMax: w.dmgMax, shots: w.shots,
    hpRegen: CONFIG.hpRegen(t('vit')), mpRegen: CONFIG.mpRegen(t('wis')),
    dodge: CONFIG.dodgeChance(t('spd')) + (fx.dodge || 0), travel: Math.max(0.25, CONFIG.travelSeconds(t('spd'))),
    ability: ab ? { type: ab.type, power: Math.round(ab.ability.power * (1 + (fx.abilityPower || 0))), cost: Math.round(ab.ability.cost * (1 + (fx.abilityCostMult || 0))) } : null,
  };
}

/** Rough damage per second against a 0-DEF target, for the UI. */
export function dpsOf(F) {
  const fx = F.fx || {};
  const crit = 1 + (0.08 + (fx.critChance || 0)) * (0.6 + (fx.critMult || 0));
  const extra = (1 + (fx.doubleChance || 0)) * (1 + (fx.dmg || 0)) * (fx.burstEvery ? 1 + (fx.burstMult - 1) / fx.burstEvery : 1);
  return Math.round(((F.dmgMin + F.dmgMax) / 2) * F.shots * F.attMult * F.aps * crit * extra);
}
