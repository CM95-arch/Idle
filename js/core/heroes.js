// A class's battle stats: its level, its gear, and the Ascension multipliers.
import { BAL } from '../data/balance.js';
import { CLASSES } from '../data/classes.js';
import { SLOTS } from '../data/gear.js';
import { itemStats } from './items.js';

/** C = { lv, gear: { weapon, ability, armor, ring } }, mult = Ascension multipliers */
export function heroStats(cls, C, mult = {}) {
  const K = CLASSES[cls], g = BAL.levelGrowth, L = C.lv - 1;
  const flat = { hp: 0, atk: 0, def: 0, pow: 0 }, pct = { atkPct: 0, hpPct: 0, defPct: 0, spdPct: 0, crit: 0, famePct: 0 };
  for (const slot of SLOTS) {
    const it = C.gear?.[slot];
    if (!it) continue;
    for (const [k, v] of Object.entries(itemStats(it))) { if (k in flat) flat[k] += v; else pct[k] += v; }
  }
  const dmg = mult.dmg || 1;
  // ATK is damage per second at the class's base fire rate; each shot deals ATK / base rate, so a fast
  // shooter and a slow one with the same ATK do the same damage. Speed gear makes shots come faster.
  const atk = (K.base.atk * g.atk ** L + flat.atk) * (1 + pct.atkPct / 100) * dmg;
  return {
    cls, role: K.role,
    hp: Math.round((K.base.hp * g.hp ** L + flat.hp) * (1 + pct.hpPct / 100)),
    atk, hit: atk / K.base.spd,
    def: (K.base.def * g.def ** L + flat.def) * (1 + pct.defPct / 100),
    spd: K.base.spd * (1 + pct.spdPct / 100),
    crit: Math.min(0.6, 0.05 + pct.crit / 100),
    pow: 1 + flat.pow,
    fame: pct.famePct / 100,
  };
}

/** Party power: one number that tracks how strong a party is, comparable to a stage's requirement. */
export function powerOf(stats) {
  if (!stats.length) return 0;
  const dps = stats.reduce((a, s) => a + s.hit * s.spd * (1 + s.crit) * (1 + 0.15 * s.pow), 0);
  const tough = stats.reduce((a, s) => a + s.hp + s.def * 8, 0);
  return Math.round(Math.sqrt(dps * tough) * 1.4);
}
