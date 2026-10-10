// ★ All balance numbers live here. Change a value, reload, and the game uses it.
// `node tools/balance.mjs` prints survival times and kill rates for reference builds.

export const BUILD = '2026-10-10 · 13';

export const CONFIG = {
  tickSeconds: 0.1,            // combat simulation step (same step online and offline)
  startSlots: 1,               // character slots every account starts with (+1 from Lost Halls, the rest are purchases)
  maxSlots: 12,
  slotPriceLabel: '$2.99',

  // ---- XP / levels (score only, levels give no power) ----
  // XP needed to go from level n to n+1. Small at first so early levels come every minute or two.
  // Level 2 at 8 XP, level 5 at ~170, level 10 at ~900, level 20 at ~4,600.
  xpToNext: (n) => Math.round(6 * Math.pow(n, 1.9)),
  classUnlockLevel: 20,        // reach this level on the parent class to unlock the next class

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
  travelPerWave: 2,            // walking time between groups, in multiples of the SPD-based walk time
  reinforceSeconds: 1.2,       // how often reinforcements can step into an empty slot
  tapDamage: 0.3,              // tapping the battle fires an extra volley at this fraction of a normal attack
  maxQueuedTaps: 3,
  startStatFraction: 0.5,      // new characters start halfway between class base and class max

  // ---- potions ----
  potionGain: { hp: 10, mp: 10, att: 1, def: 1, spd: 1, dex: 1, vit: 1, wis: 1 },
  exaltCostStep: 25,           // first exaltation costs 25 potions past max, then 50 more, then 75...
  exaltMax: 5,
  exaltGain: { hp: 5, mp: 5, att: 1, def: 1, spd: 1, dex: 1, vit: 1, wis: 1 },

  // ---- loot while farming: XP, potions (rate per biome in world.js) and one rare UT per biome ----
  eliteDropMult: 3,            // elites are this many times likelier to drop potions and the biome's UT
  biomeUtChance: 1 / 24000,    // per kill: about two days of farming one biome on one character
  // ---- dungeons ----
  dungeonEnemiesPerRoom: [11, 15], // group members per room (they arrive a few at a time)
  dungeonGroupSize: 4,         // how many start each room; the rest step in as others fall
  dungeonWalkHealPct: 0.025,   // dungeons heal less between enemies than farming does
  roomTransitionSeconds: 3,  // walk between dungeon rooms (fast regen while walking)
  upgradeChance: 0.2,          // a clear has a 1 in 5 chance to upgrade one gear slot to the dungeon's tier
  dungeonUtChance: 0.1,        // a clear has a 1 in 10 chance to drop one of the dungeon's UTs you don't have yet
  telegraphEvery: [9, 13],     // seconds between boss telegraphs
  telegraphWindup: 1.8,        // seconds the player has to tap
  telegraphHitMult: 2.6,       // a missed telegraph hits this many times harder than a normal boss hit
  bossStunSeconds: 2.5,        // after a successful dodge
  bossStunDamageMult: 1.25,
  closedAppDodgeChance: 0.35,  // telegraphs dodged automatically while the app is closed
  closedAppAbilityDelay: 4,    // seconds the auto-cast waits while the app is closed

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
