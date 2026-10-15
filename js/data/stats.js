// The eight ROTMG stats. Each class starts at its base and can be raised, one potion at a time, up to its real
// ROTMG maximum ("8/8" when all eight are maxed). Life and Mana rise 5 per potion, the rest 1.
// Colors are the potions' (Attack magenta, Defense black, Speed green, Dexterity orange, Vitality red,
// Wisdom blue, Life white-pink, Mana purple).
export const STATS = ['hp', 'mp', 'att', 'def', 'spd', 'dex', 'vit', 'wis'];
export const STAT_INFO = {
  hp: { name: 'Life', abbr: 'HP', color: '#f2e6ee', ink: '#1a0e14', step: 5, does: 'Max HP' },
  mp: { name: 'Mana', abbr: 'MP', color: '#7a5cff', ink: '#ffffff', step: 5, does: 'Ability power' },
  att: { name: 'Attack', abbr: 'ATT', color: '#d93bd4', ink: '#ffffff', step: 1, does: 'Damage' },
  def: { name: 'Defense', abbr: 'DEF', color: '#2b2b33', ink: '#ffffff', step: 1, does: 'Armor' },
  spd: { name: 'Speed', abbr: 'SPD', color: '#2fbf4a', ink: '#ffffff', step: 1, does: 'Dodging' },
  dex: { name: 'Dexterity', abbr: 'DEX', color: '#ff8a1a', ink: '#1a0e00', step: 1, does: 'Fire rate' },
  vit: { name: 'Vitality', abbr: 'VIT', color: '#e0282e', ink: '#ffffff', step: 1, does: 'Regeneration' },
  wis: { name: 'Wisdom', abbr: 'WIS', color: '#3a7dff', ink: '#ffffff', step: 1, does: 'Ability recharge' },
};
// base (level 1) and max per class, as in ROTMG
const S = (hp, mp, att, def, spd, dex, vit, wis) => ({ hp, mp, att, def, spd, dex, vit, wis });
export const CLASS_STATS = {
  wizard: { base: S(100, 100, 12, 0, 10, 15, 12, 12), max: S(670, 385, 75, 25, 50, 75, 40, 60) },
  priest: { base: S(100, 100, 12, 0, 12, 12, 10, 15), max: S(670, 385, 50, 25, 55, 55, 40, 75) },
  archer: { base: S(130, 100, 12, 0, 12, 12, 12, 10), max: S(700, 252, 75, 25, 50, 50, 40, 50) },
  rogue: { base: S(150, 100, 10, 0, 15, 15, 12, 10), max: S(720, 252, 50, 25, 75, 75, 40, 50) },
  warrior: { base: S(200, 100, 15, 0, 7, 10, 10, 10), max: S(770, 252, 75, 25, 50, 50, 75, 50) },
  knight: { base: S(200, 100, 15, 0, 7, 10, 10, 10), max: S(770, 252, 50, 40, 50, 50, 75, 50) },
  paladin: { base: S(200, 100, 12, 0, 12, 12, 12, 10), max: S(770, 252, 50, 30, 55, 45, 40, 75) },
  huntress: { base: S(130, 100, 12, 0, 12, 12, 12, 10), max: S(700, 252, 75, 25, 50, 50, 40, 50) },
  necromancer: { base: S(100, 100, 12, 0, 10, 15, 10, 15), max: S(670, 385, 75, 25, 50, 60, 30, 75) },
  assassin: { base: S(150, 100, 12, 0, 15, 15, 12, 10), max: S(720, 252, 60, 25, 75, 75, 40, 60) },
  sorcerer: { base: S(100, 100, 12, 0, 12, 12, 10, 10), max: S(670, 385, 70, 25, 60, 60, 75, 60) },
};
/** How many potions a stat takes to max. */
export const potionsToMax = (cls, s) => Math.round((CLASS_STATS[cls].max[s] - CLASS_STATS[cls].base[s]) / STAT_INFO[s].step);
/** A stat's value after `n` potions. */
export const statValue = (cls, s, n = 0) => Math.min(CLASS_STATS[cls].max[s], CLASS_STATS[cls].base[s] + n * STAT_INFO[s].step);
/** What each stat adds at its max, scaled by how far toward max it is (the same for every class, so the classes
 * stay balanced; the numbers shown are the real ROTMG ones). */
export const STAT_FX = {
  hp: { hpPct: 1.2 },      // max HP ×2.2 at max Life
  mp: { pow: 0.5 },        // ability power +50%
  att: { atkPct: 1.0 },    // damage ×2
  def: { defPct: 1.5 },    // armor ×2.5
  spd: { dodge: 0.12 },    // 12% of hits dodged
  dex: { spdPct: 0.5 },    // fire rate ×1.5
  vit: { regen: 0.012 },   // 1.2% HP regenerated per second
  wis: { cdr: 0.3 },       // ability recharges 30% faster
};
