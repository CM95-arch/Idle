// Character stats: class base + potions drunk + exaltation + gear. Levels never add power.
import { CONFIG } from '../config.js';
import { CLASS, STATS } from '../data/classes.js';
import { ITEMS } from '../data/items.js';

export function newCharacter(id, cls, name) {
  const C = CLASS[cls];
  const stats = {};
  for (const k of STATS) stats[k] = Math.round(C.base[k] + (C.max[k] - C.base[k]) * CONFIG.startStatFraction);
  return {
    id, cls, name, xp: 0, stats, createdAt: Date.now(), kills: 0, deaths: 0, clears: 0,
    equip: { weapon: `${C.weapon}_t1`, ability: `${C.ability}_t1`, armor: `${C.armor}_t1`, ring: null },
  };
}

export function levelInfo(xp) {
  let level = 1, start = 0, need = CONFIG.xpFirstLevel;
  while (xp >= start + need) { start += need; need += CONFIG.xpStep; level++; }
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
  for (const id of Object.values(char.equip)) {
    const it = id && ITEMS[id];
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
  const w = ITEMS[char.equip.weapon]?.weapon || { dmgMin: 5, dmgMax: 8, shots: 1, rof: 1 };
  const ab = ITEMS[char.equip.ability];
  return {
    cls: char.cls,
    maxHp: t('hp'), maxMp: t('mp'), def: t('def'),
    attMult: CONFIG.attMult(t('att')),
    aps: CONFIG.attacksPerSec(t('dex')) * w.rof,
    dmgMin: w.dmgMin, dmgMax: w.dmgMax, shots: w.shots,
    hpRegen: CONFIG.hpRegen(t('vit')), mpRegen: CONFIG.mpRegen(t('wis')),
    dodge: CONFIG.dodgeChance(t('spd')), travel: Math.max(0.4, CONFIG.travelSeconds(t('spd'))),
    ability: ab ? { type: ab.type, power: ab.ability.power, cost: ab.ability.cost } : null,
  };
}

/** Rough damage per second against a 0-DEF target, for the UI. */
export function dpsOf(F) {
  return Math.round(((F.dmgMin + F.dmgMax) / 2) * F.shots * F.attMult * F.aps);
}
