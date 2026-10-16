// The eight stats. Each class starts at its base and is raised, one potion at a time, to its max ("Perfected"
// when all eight are maxed). Life and Mana rise 5 per potion, the rest 1.
export const STATS = ['hp', 'mp', 'att', 'def', 'spd', 'dex', 'vit', 'wis'];
export const STAT_INFO = {
  hp: { name: 'Life', abbr: 'HP', color: '#ff5d73', ink: '#ffffff', step: 5, does: 'Max HP' },
  mp: { name: 'Mana', abbr: 'MP', color: '#4f9bff', ink: '#ffffff', step: 5, does: 'Ability power' },
  att: { name: 'Attack', abbr: 'ATT', color: '#ff8f3d', ink: '#2a1400', step: 1, does: 'Damage' },
  def: { name: 'Defense', abbr: 'DEF', color: '#a7b1c2', ink: '#141a24', step: 1, does: 'Armor' },
  spd: { name: 'Speed', abbr: 'SPD', color: '#58e08a', ink: '#04240f', step: 1, does: 'Dodging' },
  dex: { name: 'Dexterity', abbr: 'DEX', color: '#ffd34d', ink: '#2a2000', step: 1, does: 'Fire rate' },
  vit: { name: 'Vitality', abbr: 'VIT', color: '#c86bff', ink: '#ffffff', step: 1, does: 'Regeneration' },
  wis: { name: 'Wisdom', abbr: 'WIS', color: '#40d6e6', ink: '#032a2e', step: 1, does: 'Ability recharge' },
};
// base and max per class
const S = (hp, mp, att, def, spd, dex, vit, wis) => ({ hp, mp, att, def, spd, dex, vit, wis });
export const CLASS_STATS = {
  wizard: { base: S(690, 342, 50, 12, 43, 66, 29, 50), max: S(815, 457, 68, 27, 57, 86, 45, 68) },
  priest: { base: S(690, 342, 54, 12, 49, 50, 29, 66), max: S(815, 457, 74, 27, 63, 68, 45, 86) },
  archer: { base: S(750, 234, 66, 12, 49, 41, 29, 41), max: S(875, 339, 86, 27, 63, 57, 45, 57) },
  rogue: { base: S(750, 234, 42, 12, 54, 66, 29, 41), max: S(875, 339, 62, 27, 74, 86, 45, 57) },
  warrior: { base: S(810, 234, 66, 12, 43, 41, 66, 41), max: S(935, 339, 86, 27, 57, 57, 86, 57) },
  knight: { base: S(810, 234, 41, 24, 43, 41, 66, 41), max: S(935, 339, 57, 44, 57, 57, 86, 57) },
  paladin: { base: S(810, 234, 42, 12, 49, 44, 50, 66), max: S(935, 339, 62, 32, 63, 62, 68, 86) },
  huntress: { base: S(750, 288, 54, 12, 43, 50, 29, 50), max: S(875, 398, 74, 27, 57, 68, 45, 68) },
  necromancer: { base: S(690, 342, 66, 12, 43, 50, 29, 66), max: S(815, 457, 86, 27, 57, 68, 45, 86) },
  assassin: { base: S(750, 288, 54, 12, 54, 66, 29, 50), max: S(875, 398, 74, 27, 74, 86, 45, 68) },
  sorcerer: { base: S(690, 342, 66, 12, 55, 50, 66, 50), max: S(815, 457, 81, 27, 69, 68, 86, 68) },
};
/** Each Ascension raises every stat's cap by this many potions (+3 ATT, +15 Life…), so there's always more. */
export const CAP_PER_ASCENSION = 3;
/** How many potions a stat takes to reach its cap: the class's max, raised with every Ascension. */
export const potionsToMax = (cls, s, asc = 0) => Math.round((CLASS_STATS[cls].max[s] - CLASS_STATS[cls].base[s]) / STAT_INFO[s].step) + CAP_PER_ASCENSION * asc;
/** A stat's value after `n` potions. */
export const statValue = (cls, s, n = 0) => CLASS_STATS[cls].base[s] + n * STAT_INFO[s].step;
/** What each stat adds at the class's original max, scaled by how far toward it the potions go; potions past it,
 * from raised caps, keep adding at the same rate. The same for every class, so the classes stay balanced. */
export const STAT_FX = {
  hp: { hpPct: 1.0 },      // max HP ×2 at max Life
  mp: { pow: 0.4 },        // ability power +40%
  att: { atkPct: 0.8 },    // damage ×1.8
  def: { defPct: 1.2 },    // armor ×2.2
  spd: { dodge: 0.12 },    // 12% of hits dodged
  dex: { spdPct: 0.4 },    // fire rate ×1.4
  vit: { regen: 0.012 },   // 1.2% HP regenerated per second
  wis: { cdr: 0.3 },       // ability recharges 30% faster
};
