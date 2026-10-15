// The eight ROTMG stats. Each class starts at its level-20 average and is raised, one potion at a time, to its
// real ROTMG maximum ("8/8" when all eight are maxed). Life and Mana rise 5 per potion, the rest 1.
// Values and potion colors are from the current game client (via the rotmg-tools data mirror).
export const STATS = ['hp', 'mp', 'att', 'def', 'spd', 'dex', 'vit', 'wis'];
export const STAT_INFO = {
  hp: { name: 'Life', abbr: 'HP', color: '#42dee4', ink: '#04282a', step: 5, does: 'Max HP' },
  mp: { name: 'Mana', abbr: 'MP', color: '#efd05d', ink: '#2a2000', step: 5, does: 'Ability power' },
  att: { name: 'Attack', abbr: 'ATT', color: '#dd5af0', ink: '#ffffff', step: 1, does: 'Damage' },
  def: { name: 'Defense', abbr: 'DEF', color: '#616161', ink: '#ffffff', step: 1, does: 'Armor' },
  spd: { name: 'Speed', abbr: 'SPD', color: '#41e480', ink: '#03240f', step: 1, does: 'Dodging' },
  dex: { name: 'Dexterity', abbr: 'DEX', color: '#eb8931', ink: '#1a0e00', step: 1, does: 'Fire rate' },
  vit: { name: 'Vitality', abbr: 'VIT', color: '#ff072c', ink: '#ffffff', step: 1, does: 'Regeneration' },
  wis: { name: 'Wisdom', abbr: 'WIS', color: '#4a93fe', ink: '#ffffff', step: 1, does: 'Ability recharge' },
};
// start (level-20 average) and max per class
const S = (hp, mp, att, def, spd, dex, vit, wis) => ({ hp, mp, att, def, spd, dex, vit, wis });
export const CLASS_STATS = {
  wizard: { base: S(575, 285, 42, 10, 36, 55, 24, 42), max: S(700, 400, 60, 25, 50, 75, 40, 60) },
  priest: { base: S(575, 285, 45, 10, 41, 42, 24, 55), max: S(700, 400, 65, 25, 55, 60, 40, 75) },
  archer: { base: S(625, 195, 55, 10, 41, 34, 24, 34), max: S(750, 300, 75, 25, 55, 50, 40, 50) },
  rogue: { base: S(625, 195, 35, 10, 45, 55, 24, 34), max: S(750, 300, 55, 25, 65, 75, 40, 50) },
  warrior: { base: S(675, 195, 55, 10, 36, 34, 55, 34), max: S(800, 300, 75, 25, 50, 50, 75, 50) },
  knight: { base: S(675, 195, 34, 20, 36, 34, 55, 34), max: S(800, 300, 50, 40, 50, 50, 75, 50) },
  paladin: { base: S(675, 195, 35, 10, 41, 37, 42, 55), max: S(800, 300, 55, 30, 55, 55, 60, 75) },
  huntress: { base: S(625, 240, 45, 10, 36, 42, 24, 42), max: S(750, 350, 65, 25, 50, 60, 40, 60) },
  necromancer: { base: S(575, 285, 55, 10, 36, 42, 24, 55), max: S(700, 400, 75, 25, 50, 60, 40, 75) },
  assassin: { base: S(625, 240, 45, 10, 45, 55, 24, 42), max: S(750, 350, 65, 25, 65, 75, 40, 60) },
  sorcerer: { base: S(575, 285, 55, 10, 46, 42, 55, 42), max: S(700, 400, 70, 25, 60, 60, 75, 60) },
};
/** How many potions a stat takes to max. */
export const potionsToMax = (cls, s) => Math.round((CLASS_STATS[cls].max[s] - CLASS_STATS[cls].base[s]) / STAT_INFO[s].step);
/** A stat's value after `n` potions. */
export const statValue = (cls, s, n = 0) => Math.min(CLASS_STATS[cls].max[s], CLASS_STATS[cls].base[s] + n * STAT_INFO[s].step);
/** What each stat adds at its max, scaled by how far toward max it is (the same for every class, so the classes
 * stay balanced; the numbers shown are the real ROTMG ones). */
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
