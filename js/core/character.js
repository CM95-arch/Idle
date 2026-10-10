// Characters are lives. Stats = class base + levels (1–20) + class legacy + potions drunk (capped at the class max)
// + gear + exaltation. When a character falls it starts a new life at level 1; its class keeps a legacy.
import { CONFIG } from '../config.js';
import { CLASS, STATS } from '../data/classes.js';
import { ITEMS } from '../data/items.js';

export const GEAR_SLOTS = ['weapon', 'ability', 'armor', 'ring'];
const zero = () => Object.fromEntries(STATS.map((k) => [k, 0]));

export function newCharacter(id, cls, name) {
  return {
    id, cls, name, xp: 0, life: 1, pots: zero(), createdAt: Date.now(), kills: 0, deaths: 0, clears: 0,
    equip: { weapon: null, ability: null, armor: null, ring: null }, // null = starter gear (free, never lost)
  };
}

/** The item type a class uses in a slot ('ring' for rings). */
export const slotType = (cls, slot) => (slot === 'ring' ? 'ring' : CLASS[cls][slot]);
/** Free T1 gear every character always has. Rings have no starter. */
export const starterItem = (cls, slot) => (slot === 'ring' ? null : `${CLASS[cls][slot]}_t1`);
/** What a character wears in a slot: its equipped item, or the free starter. */
export function gearItem(char, slot) {
  const id = char.equip?.[slot] || starterItem(char.cls, slot);
  return id ? ITEMS[id] : null;
}
export const gearOf = (char) => GEAR_SLOTS.map((k) => gearItem(char, k)).filter(Boolean);

export function levelInfo(xp) {
  let level = 1, start = 0, need = CONFIG.xpToNext(1);
  while (level < CONFIG.maxLevel && xp >= start + need) { start += need; level++; need = CONFIG.xpToNext(level); }
  const max = level >= CONFIG.maxLevel;
  return { level, into: max ? need : xp - start, need, start, max };
}
export const levelOf = (xp) => levelInfo(xp).level;

/** Stats a character gets from its level, per stat (before potions and legacy). */
export function levelStat(cls, k, level) {
  const C = CLASS[cls], range = C.max[k] - C.base[k];
  const share = CONFIG.levelBaseShare + (CONFIG.levelTopShare - CONFIG.levelBaseShare) * ((level - 1) / (CONFIG.maxLevel - 1));
  return Math.round(range * share);
}
export const legacyOf = (state, cls) => state.legacy?.[cls] || zero();
export function exaltBonus(state, cls, stat) {
  const lv = state.exalt?.[cls]?.[stat]?.level || 0;
  return lv * CONFIG.exaltGain[stat];
}

/** Per stat: { base (natural, capped at max), max, level, legacy, pots, gear, exalt, total } */
export function statBreakdown(char, state) {
  const C = CLASS[char.cls], lv = levelOf(char.xp), leg = legacyOf(state, char.cls);
  const gear = zero();
  for (const it of gearOf(char)) for (const [k, v] of Object.entries(it.bonus || {})) gear[k] += v;
  const out = {};
  for (const k of STATS) {
    const level = levelStat(char.cls, k, lv), legacy = leg[k] || 0, pots = char.pots?.[k] || 0;
    const natural = Math.min(C.max[k], C.base[k] + level + legacy + pots);
    const ex = exaltBonus(state, char.cls, k);
    out[k] = { base: natural, max: C.max[k], level, legacy, pots, gear: gear[k], exalt: ex, total: natural + gear[k] + ex };
  }
  return out;
}
export const maxedCount = (char, state) => { const sb = statBreakdown(char, state); return STATS.filter((k) => sb[k].base >= sb[k].max).length; };

/** Everything the combat engines need about a character. */
export function fighterOf(char, state) {
  const sb = statBreakdown(char, state);
  const t = (k) => Math.max(0, sb[k].total);
  const gear = GEAR_SLOTS.map((k) => gearItem(char, k));
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
    cls: char.cls, weaponType: CLASS[char.cls].weapon, weaponId: gear[0]?.id,
    maxHp: t('hp'), maxMp: t('mp'), def: t('def'), spd: t('spd'),
    attMult: CONFIG.attMult(t('att')),
    aps: CONFIG.attacksPerSec(t('dex')) * w.rof * (fx.rofMult || 1),
    dmgMin: w.dmgMin, dmgMax: w.dmgMax, shots: w.shots,
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

/**
 * A reference character for balance tools and dungeon scaling: class cls at level 20,
 * every slot at gear tier g (ring: HP), potions m of the way from level-20 stats to max.
 */
export function referenceCharacter(cls, g, m = 0, level = CONFIG.maxLevel) {
  const c = newCharacter('ref', cls, 'ref');
  c.xp = xpForLevel(level);
  const C = CLASS[cls], t = Math.max(1, Math.min(20, Math.round(g)));
  for (const k of STATS) {
    const natural = C.base[k] + levelStat(cls, k, level);
    c.pots[k] = Math.round((C.max[k] - natural) * m);
  }
  c.equip = { weapon: `${C.weapon}_t${t}`, ability: `${C.ability}_t${t}`, armor: `${C.armor}_t${t}`, ring: g >= 2 ? `ring_hp_t${Math.max(1, t - 1)}` : null };
  return c;
}
export function xpForLevel(level) {
  let xp = 0;
  for (let n = 1; n < level; n++) xp += CONFIG.xpToNext(n);
  return xp;
}
