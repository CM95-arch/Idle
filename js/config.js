// ★ All balance numbers live here. Change a value, reload, and the game uses it.
// `node tools/balance.mjs` prints survival times and kill rates for reference builds.

export const BUILD = '2026-10-10 · 7';

export const CONFIG = {
  tickSeconds: 0.1,            // combat simulation step (same step online and offline)
  startSlots: 2,               // character slots every account starts with
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
  tapDamage: 0.3,              // tapping the battle fires an extra volley at this fraction of a normal attack
  maxQueuedTaps: 3,
  startStatFraction: 0.5,      // new characters start halfway between class base and class max

  // ---- potions ----
  potionGain: { hp: 10, mp: 10, att: 1, def: 1, spd: 1, dex: 1, vit: 1, wis: 1 },
  exaltCostStep: 25,           // first exaltation costs 25 potions past max, then 50 more, then 75...
  exaltMax: 5,
  exaltGain: { hp: 5, mp: 5, att: 1, def: 1, spd: 1, dex: 1, vit: 1, wis: 1 },

  // ---- loot while farming ----
  itemDropChance: (L) => 0.32 - 0.028 * (L - 1),  // per kill, by biome level: 32% in the Forest, about 12% in the Godlands
  eliteDropMult: 3,
  classBias: 0.7,              // share of drops picked from gear the farming class can use
  tierWeights: [35, 30, 22, 13],     // lowest tier in the range first

  // ---- dungeons ----
  dungeonEnemiesPerRoom: [5, 7], 
  dungeonWalkHealPct: 0.025,   // dungeons heal less between enemies than farming does
  roomTransitionSeconds: 3,  // walk between dungeon rooms (fast regen while walking)
  dungeonLootRolls: [3, 5],
  dungeonUtChance: 0.08,       // per unique item, per clear
  telegraphEvery: [9, 13],     // seconds between boss telegraphs
  telegraphWindup: 1.8,        // seconds the player has to tap
  telegraphHitMult: 2.6,       // a missed telegraph hits this many times harder than a normal boss hit
  bossStunSeconds: 2.5,        // after a successful dodge
  bossStunDamageMult: 1.25,
  closedAppDodgeChance: 0.35,  // telegraphs dodged automatically while the app is closed
  closedAppAbilityDelay: 4,    // seconds the auto-cast waits while the app is closed

  // ---- fusion ----
  fuseCost: 3,                 // 3 copies of an item fuse into 1 copy of the next tier
  fuseMaxTier: 11,             // fusion can't create anything above this (T12+ stays dungeon-only)
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
