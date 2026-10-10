// ★ All balance numbers live here. Change a value, reload, and the game uses it.
// `node tools/balance.mjs` prints survival times and kill rates for reference builds.

export const CONFIG = {
  tickSeconds: 0.1,            // combat simulation step (same step online and offline)
  startSlots: 2,               // character slots every account starts with
  maxSlots: 12,
  slotPriceLabel: '$2.99',

  // ---- XP / levels (score only, levels give no power) ----
  // Level 1 is 0–10 XP, level 2 is 10–25, each level needs 5 more XP than the last.
  xpFirstLevel: 10,
  xpStep: 5,
  classUnlockLevel: 10,        // reach this level on the parent class to unlock the next class

  // ---- player stat formulas (ROTMG meanings, tuned for idle) ----
  attMult: (att) => 0.5 + att / 50,               // damage multiplier
  attacksPerSec: (dex) => 0.8 + 1.7 * (dex / 75), // before weapon rate of fire
  hpRegen: (vit) => 1 + 0.12 * vit,               // HP per second
  mpRegen: (wis) => 0.5 + 0.06 * wis,             // MP per second
  dodgeChance: (spd) => spd / (spd + 200),        // chance an enemy hit misses
  travelSeconds: (spd) => 1.6 - spd / 100,        // walk time to the next enemy
  minDamageAfterDef: 0.15,     // DEF can never block more than 85% of a hit
  restBelow: 0.65,             // between fights, rest if HP is under this fraction...
  restUntil: 0.95,             // ...until HP is back to this fraction
  restRegenMult: 4,            // regen is this many times faster while resting
  startStatFraction: 0.5,      // new characters start halfway between class base and class max

  // ---- potions ----
  potionGain: { hp: 10, mp: 10, att: 1, def: 1, spd: 1, dex: 1, vit: 1, wis: 1 },
  exaltCostStep: 25,           // first exaltation costs 25 potions past max, then 50 more, then 75...
  exaltMax: 5,
  exaltGain: { hp: 5, mp: 5, att: 1, def: 1, spd: 1, dex: 1, vit: 1, wis: 1 },

  // ---- loot while farming ----
  itemDropChance: 0.03,        // per kill
  eliteDropMult: 3,
  classBias: 0.5,              // share of drops picked from gear the farming class can use
  tierWeights: [50, 28, 14, 6, 2],   // lowest tier in the range first

  // ---- dungeons ----
  dungeonEnemiesPerRoom: [6, 9],
  dungeonRestBelow: 0.4,      // in dungeons you only stop to rest when HP drops under this
  dungeonLootRolls: [3, 5],
  dungeonUtChance: 0.08,       // per unique item, per clear
  telegraphEvery: [9, 13],     // seconds between boss telegraphs
  telegraphWindup: 1.8,        // seconds the player has to tap
  telegraphHitMult: 2.6,       // a missed telegraph hits this many times harder than a normal boss hit
  bossStunSeconds: 2.5,        // after a successful dodge
  bossStunDamageMult: 1.25,
  closedAppDodgeChance: 0.35,  // telegraphs dodged automatically while the app is closed
  closedAppAbilityDelay: 4,    // seconds the auto-cast waits while the app is closed

  // ---- Essence ----
  essenceValue: (tier) => Math.round(2 * Math.pow(1.45, tier)),
  utEssenceValue: 250,
  potionEssenceValue: 6,
  forgeCostMult: 30,           // forging costs this many times the dismantle value
  utForgeCost: 20000,
  runeEssenceCost: 6000,

  // ---- survival estimate ----
  survivalSimHours: 8,
  survivalRuns: 3,
  survivalHighHours: 8,        // no death within this many hours = HIGH
  survivalMedHours: 1,         // dies after this many hours = MEDIUM, sooner = LOW
};
