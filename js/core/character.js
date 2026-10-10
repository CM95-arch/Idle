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
  // UT effects from everything equipped. Numbers add up; cooldown-style effects take the best one.
  const fx = {};
  for (const id of Object.values(char.equip)) {
    for (const [k, v] of Object.entries(ITEMS[id]?.fx || {})) {
      fx[k] = ['cheatDeath'].includes(k) ? Math.min(fx[k] ?? Infinity, v) : ['burstEvery', 'openerHits', 'rofMult', 'openerMult', 'burstMult', 'buffDur', 'critAfterDodge', 'ignoreDef', 'rampCap', 'luckyMult', 'freeCastEvery'].includes(k) ? Math.max(fx[k] || 0, v) : (fx[k] || 0) + v;
    }
  }
  return {
    fx,
    cls: char.cls,
    maxHp: t('hp'), maxMp: t('mp'), def: t('def'),
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
