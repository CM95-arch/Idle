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
  classUnlockLevel: 20,        // reach this level on the parent class to unlock the next class

  // ---- player stat formulas (ROTMG meanings, tuned for idle) ----
  attMult: (att) => 0.5 + att / 50,               // damage multiplier
  attacksPerSec: (dex) => 0.8 + 1.7 * (dex / 75), // before weapon rate of fire
  hpRegen: (vit) => 1 + 0.08 * vit,               // HP per second
  mpRegen: (wis) => 0.5 + 0.06 * wis,             // MP per second
  dodgeChance: (spd) => spd / (spd + 200),        // chance an enemy hit misses
  travelSeconds: (spd) => 0.9 - spd / 200,        // walk time to the next enemy
  minDamageAfterDef: 0.15,     // DEF can never block more than 85% of a hit
  outOfCombatRegenMult: 5,     // HP/MP regen is this many times faster while walking between enemies
  walkHealPct: 0.04,           // plus this share of max HP per second while walking
  tapDamage: 0.6,              // tapping the battle fires an extra volley at this fraction of a normal attack
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
  autoEquipDefault: true,      // equip strict upgrades as they drop (can be turned off in Settings)

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

  // ---- Essence ----
  essenceValue: (tier) => Math.round(2 * Math.pow(1.45, tier)),
  utEssenceValue: 250,
  potionEssenceValue: 6,
  forgeCostMult: 30,           // forging costs this many times the dismantle value
  utForgeCost: 20000,
  runeEssenceCost: 6000,

  // ---- survival estimate ----
  survivalSimHours: 8,
  survivalRuns: 5,
  survivalHighHours: 8,        // no death within this many hours = HIGH
  survivalMedHours: 1,         // dies after this many hours = MEDIUM, sooner = LOW
  nudgeHours: 4,               // suggest the next biome once it's estimated to last this long
};
