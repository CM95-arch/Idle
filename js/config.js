// ★ All balance numbers live here. Change a value, reload, and the game uses it.
// `node tools/balance.mjs` prints survival times and kill rates for reference builds.

export const BUILD = '2026-10-11 · 5';

export const CONFIG = {
  tickSeconds: 0.1,            // combat simulation step (same step online and offline)
  startSlots: 1,               // character slots every account starts with (+1 from Lost Halls, the rest are purchases)
  maxSlots: 12,
  slotPriceLabel: '$2.99',

  // ---- XP / levels: levels 1–20 give stats, like Realm. Each new life levels up again. ----
  // XP needed to go from level n to n+1: level 5 in a few minutes, level 20 in about two hours of farming.
  xpToNext: (n) => Math.round(6 * Math.pow(n, 1.9)),
  maxLevel: 20,
  classUnlockLevel: 20,        // reach this level on the parent class to unlock the next class
  // Stats from levels, as a share of the class's base→max range: level 1 starts here, level 20 reaches levelTopShare.
  levelBaseShare: 0.42,
  levelTopShare: 0.58,

  // ---- lives ----
  legacyShare: 0.5,            // on death, the class keeps half of that character's potion stats (it never goes down)
  retreatHp: 0.2,              // idle characters retreat from a biome below this share of HP and wait for you
  // ---- player stat formulas (ROTMG meanings, tuned for idle) ----
  attMult: (att) => 0.5 + att / 50,               // damage multiplier
  attacksPerSec: (dex) => 1.5 + 6.5 * (dex / 75), // ROTMG: 8 shots/s at 75 DEX (before weapon rate of fire)
  hpRegen: (vit) => 1 + 0.24 * vit,               // HP per second
  mpRegen: (wis) => 0.5 + 0.12 * wis,             // MP per second
  dodgeChance: (spd) => spd / (spd + 200),        // chance an enemy hit misses
  travelSeconds: (spd) => 1.3 - spd / 70,         // walk time to the next enemy: SPD means more kills per hour
  minDamageAfterDef: 0.15,     // DEF can never block more than 85% of a hit
  outOfCombatRegenMult: 5,     // HP/MP regen is this many times faster while walking between enemies
  walkHealPct: 0.04,           // plus this share of max HP per second while walking
  tapDamage: 0.3,              // tapping the battle fires an extra volley at this fraction of a normal attack
  maxQueuedTaps: 3,

  // ---- potions ----
  potionGain: { hp: 10, mp: 10, att: 1, def: 1, spd: 1, dex: 1, vit: 1, wis: 1 },
  exaltCostStep: 25,           // first exaltation costs 25 potions past max, then 50 more, then 75...
  exaltMax: 5,
  exaltGain: { hp: 5, mp: 5, att: 1, def: 1, spd: 1, dex: 1, vit: 1, wis: 1 },

  // ---- loot while farming: XP and potions only (rates per biome in world.js) ----
  eliteDropMult: 3,            // elites are this many times likelier to drop potions

  // ---- dungeons: active runs, the only source of gear ----
  dungeonUtChance: 0.1,        // a clear drops one of the dungeon's UTs 1 time in 10
  dungeonBags: [2, 4],         // gear bags from the boss on a clear (plus what rooms drop)
  roomBagChance: 0.06,         // chance a room enemy drops a gear bag
  roomPotionChance: 0.08,      // chance a room enemy drops a potion
  tierWeights: [45, 35, 20],   // lowest tier of a dungeon's range is the most common

  // ---- essence: salvage gear, clear dungeons, and fall; spend it to reforge UTs you've found before ----
  salvageEssence: (tier) => Math.round(2 * Math.pow(1.35, tier - 1)),
  utSalvageEssence: 40,
  clearEssence: (d) => 5 + d.index * 3,
  deathEssence: (level) => 5 + level * 2,
  reforgeCost: (d) => Math.round(150 * Math.pow(1.22, d.index)),  // Snake Pit UT ~150, Oryx ~5,500 (several runs' worth)

  // ---- vault ----
  potionConvertCost: 3,        // 3 potions of one kind → 1 potion of your choice
  runeChance: 0.4,             // chance a rune dungeon drops its rune; guaranteed after 2 misses in a row
  runePityMisses: 2,

  // ---- survival estimate ----
  survivalSimHours: 8,
  survivalRuns: 5,
  survivalHighHours: 8,        // no death within this many hours = HIGH
  survivalMedHours: 1,         // dies after this many hours = MEDIUM, sooner = LOW
  nudgeHours: 4,               // suggest the next biome once it's estimated to last this long
};
