// A class's battle stats: its level, its gear, and the Ascension multipliers.
import { BAL } from '../data/balance.js';
import { CLASSES } from '../data/classes.js';
import { SLOTS } from '../data/gear.js';
import { itemStats, uniqueOf } from './items.js';
import { FX_MAX } from '../data/uniques.js';
import { STATS, STAT_FX, potionsToMax } from '../data/stats.js';

// How each kind of weapon shoots, ROTMG-style: projectiles per shot, the angle between them (degrees; 0 =
// side by side), range and speed in tiles, and the look. A Unique weapon replaces any of these with its own.
export const BASE_SHOT = {
  staff: { n: 2, arc: 0, wavy: true, range: 8.5, speed: 14, look: 'orb' },
  wand: { n: 1, arc: 0, range: 9, speed: 16, look: 'bolt' },
  bow: { n: 1, arc: 0, range: 7.5, speed: 18, look: 'arrow' },
  dagger: { n: 1, arc: 0, range: 5.5, speed: 15, look: 'blade' },
  sword: { n: 1, arc: 0, range: 4.5, speed: 12, look: 'slash' },
};

/** C = { lv, gear: { weapon, ability, armor, ring }, pots: { att: n, … } }, mult = Ascension multipliers */
export function heroStats(cls, C, mult = {}) {
  const K = CLASSES[cls], g = BAL.levelGrowth, L = C.lv - 1;
  const flat = { hp: 0, atk: 0, def: 0, pow: 0 }, pct = { atkPct: 0, hpPct: 0, defPct: 0, spdPct: 0, crit: 0, famePct: 0 };
  const fx = {};
  let rof = 1, abil = null;
  let shot = { ...BASE_SHOT[K.weapon] };
  for (const slot of SLOTS) {
    const it = C.gear?.[slot];
    if (!it) continue;
    const U = uniqueOf(it);
    if (U) {
      for (const [k, v] of Object.entries(U.fx || {})) fx[k] = FX_MAX.has(k) ? Math.max(fx[k] || 0, v) : (fx[k] || 0) + v;
      // a Unique weapon shoots its own way: its fire rate is on top of the class's, and each projectile's
      // damage is set relative to a tiered weapon's whole volley (per)
      if (U.shot) { shot = { ...shot, per: undefined, ...U.shot, per: U.shot.per && U.shot.per * BAL.utWeapon }; rof *= U.shot.rate || 1; }
      if (U.abil) abil = { ...U.abil };
    }
    for (const [k, v] of Object.entries(itemStats(it))) { if (k in flat) flat[k] += v; else pct[k] += v; }
  }
  // stat potions: each stat's bonus grows with how close it is to the class's max
  const sp = { atkPct: 0, hpPct: 0, defPct: 0, spdPct: 0, pow: 0 };
  for (const st of STATS) {
    const p = Math.min(1, (C.pots?.[st] || 0) / potionsToMax(cls, st));
    if (!p) continue;
    for (const [k, v] of Object.entries(STAT_FX[st])) { if (k in sp) sp[k] += v * p; else fx[k] = (fx[k] || 0) + v * p; }
  }
  const dmg = (mult.dmg || 1) * (1 + sp.atkPct);
  // ATK is damage per second at the class's base fire rate; each shot deals ATK / base rate, so a fast
  // shooter and a slow one with the same ATK do the same damage. Speed gear makes shots come faster.
  const atk = (K.base.atk * g.atk ** L + flat.atk) * (1 + pct.atkPct / 100) * dmg;
  return {
    cls, role: K.role,
    hp: Math.round((K.base.hp * g.hp ** L + flat.hp) * (1 + pct.hpPct / 100) * (1 + sp.hpPct)),
    atk, hit: atk / K.base.spd,
    def: (K.base.def * g.def ** L + flat.def) * (1 + pct.defPct / 100) * (1 + sp.defPct),
    spd: K.base.spd * rof * (1 + pct.spdPct / 100) * (1 + (fx.haste || 0)) * (1 + sp.spdPct),
    crit: Math.min(0.6, 0.05 + pct.crit / 100),
    pow: 1 + flat.pow + sp.pow,
    fame: pct.famePct / 100,
    fx, shot, abil,
  };
}

/** Party power: one number that tracks how strong a party is, comparable to a stage's requirement. */
export function powerOf(stats) {
  if (!stats.length) return 0;
  const dps = stats.reduce((a, s) => a + s.hit * s.spd * (1 + s.crit) * (1 + 0.15 * s.pow), 0);
  const tough = stats.reduce((a, s) => a + s.hp + s.def * 8, 0);
  return Math.round(Math.sqrt(dps * tough) * 1.4);
}
