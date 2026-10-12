// Every tuning number in one place. Change these, then run `node tools/sim.mjs` to see the effect on pacing.
export const BAL = {
  // ---- heroes ----
  levelGrowth: { hp: 1.1, atk: 1.1, def: 1.1 },        // per class level, multiplicative (≈1.55 levels per stage)
  levelCostBase: 8, levelCostGrowth: 1.17,              // Fame to go from lv to lv+1 = base × growth^(lv-1)
  levelCost: (lv) => Math.round(BAL.levelCostBase * BAL.levelCostGrowth ** (lv - 1)),
  partySize: 3,
  waveHeal: 0.35,          // heroes recover this share of max HP between waves
  // ---- enemies ----
  stageGrowth: 1.16,       // enemy HP/ATK grows this much per stage
  enemyBase: { hp: 34, atk: 5.2, armor: 0.05 }, // armor: damage share blocked, +5% per zone
  waves: 3, perWave: 3,
  powerScale: 4,           // stage power requirement = this × √(enemy HP × ATK), calibrated with the fight sim
  bossHp: 9, bossAtk: 1.6, // boss multipliers over a normal enemy of its stage
  realmGrowth: 2,          // each Realm (after an Ascension) multiplies enemy HP/ATK
  realmIlvl: 3,            // and adds this many item levels to drops
  // ---- rewards ----
  fameGrowth: 1.165,
  fameKill: (s) => 0.5 * BAL.fameGrowth ** s,
  fameClear: (s) => 6 * BAL.fameGrowth ** s,
  bossFame: 5,             // a boss stage pays this many times a normal clear
  realmFame: 2,            // fame multiplier per Realm (harder Realms pay in step)
  dropChancePerWave: 0.22, // chance a cleared wave drops gear; bosses always drop 2
  // ---- gear ----
  rarities: [
    { id: 'common', name: 'Common', color: '#b9c0c9', mult: 1.0, stats: 1, maxUp: 5, weight: 60 },
    { id: 'uncommon', name: 'Uncommon', color: '#5fd16a', mult: 1.3, stats: 1, maxUp: 10, weight: 26 },
    { id: 'rare', name: 'Rare', color: '#4aa3ff', mult: 1.7, stats: 2, maxUp: 15, weight: 10 },
    { id: 'epic', name: 'Epic', color: '#b05cff', mult: 2.2, stats: 2, maxUp: 20, weight: 3.2 },
    { id: 'legendary', name: 'Legendary', color: '#ffb02e', mult: 2.9, stats: 3, maxUp: 25, weight: 0.7 },
    { id: 'mythic', name: 'Mythic', color: '#ff4f7a', mult: 3.8, stats: 3, maxUp: 30, weight: 0.1 },
  ],
  gearGrowth: 1.155,       // item main stats grow per item level (= stage it dropped on), close to enemy growth
  upgradeStep: 0.12,       // each upgrade adds 12% of the base main stat
  upgradeCost: (ilvl, up, rarity) => Math.round(4 * 1.15 ** ilvl * 1.22 ** up * (1 + rarity * 0.35)),
  salvage: (ilvl, rarity) => Math.round(2 * 1.15 ** ilvl * (1 + rarity) ** 1.6),
  inventory: 30,
  // ---- idle ----
  offlineCapHours: 8,
  offlineEfficiency: 0.8,  // share of your farming rate earned while away (before Ascension bonuses)
  // ---- Ascension ----
  // each Ascension multiplies Fame by (1 + gain) and damage by (1 + gain × ascendDmg): big at first, smaller
  // later. At the 0.4 floor the gains just about match a Realm's extra difficulty, so later runs hold steady.
  ascendFirst: 1.5, ascendDecay: 0.8, ascendDmg: 0.3,
  ascendGain: (n) => Math.max(0.4, BAL.ascendFirst * BAL.ascendDecay ** (n - 1)),
  keepLevels: 0.25,        // classes keep a quarter of their levels when you Ascend,
  // but never fewer than it takes to start the new Realm
  realmStartLevel: (realm) => 3 + Math.ceil((realm * Math.log(BAL.realmGrowth)) / Math.log(BAL.levelGrowth.atk)),
};
