// Every tuning number in one place. Change these, then run `node tools/sim.mjs` to see the effect on pacing.
export const BAL = {
  // ---- heroes ----
  levelGrowth: { hp: 1.13, atk: 1.13, def: 1.13 },        // per class level, multiplicative (≈1.55 levels per stage)
  levelCostBase: 8, levelCostGrowth: 1.18,              // Fame to go from lv to lv+1 = base × growth^(lv-1)
  levelCost: (lv) => Math.round(BAL.levelCostBase * BAL.levelCostGrowth ** (lv - 1)),
  partySize: 3,
  tankGuard: 0.2,         // tanks take this much less damage from every hit
  tankFallback: 0.35,     // below this share of HP a tank stops drawing fire
  stageHeal: 0.3,          // heroes recover this share of max HP each time a stage is cleared
  // ---- enemies ----
  stageGrowth: 1.18,       // enemy HP/ATK grows this much per stage
  enemyBase: { hp: 8, atk: 2, armor: 0.05 }, // armor: damage share blocked, +5% per zone
  // the horde: a stage is cleared after this many kills; enemies keep streaming in up to a crowd limit
  stageKills: 50, spawnRate: 3.5, hordeBase: 32, hordeMax: 55,
  eliteChance: 0.06, eliteHp: 5, eliteAtk: 2, bossAfter: 25, // a boss stage's boss shows up after 25 kills
  aoeRadius: 75, splashRadius: 60, // reach of area abilities and of splashing Unique weapons
  powerScale: 13,          // stage power requirement = this × √(enemy HP × ATK), calibrated with the fight sim
  bossHp: 60, bossAtk: 4, // boss multipliers over a normal enemy of its stage
  realmGrowth: 2,          // each Realm (after an Ascension) multiplies enemy HP/ATK
  realmIlvl: 3,            // and adds this many item levels to drops
  // ---- rewards ----
  fameGrowth: 1.165,
  fameKill: (s) => 0.09 * BAL.fameGrowth ** s,
  fameClear: (s) => 6 * BAL.fameGrowth ** s,
  bossFame: 5,             // a boss stage pays this many times a normal clear
  realmFame: 2,            // fame multiplier per Realm (harder Realms pay in step)
  // ---- gear ----
  rarities: [
    { id: 'common', name: 'Common', color: '#b9c0c9', mult: 1.0, stats: 1, maxUp: 5, weight: 60 },
    { id: 'uncommon', name: 'Uncommon', color: '#5fd16a', mult: 1.3, stats: 1, maxUp: 10, weight: 26 },
    { id: 'rare', name: 'Rare', color: '#4aa3ff', mult: 1.7, stats: 2, maxUp: 15, weight: 10 },
    { id: 'epic', name: 'Epic', color: '#b05cff', mult: 2.2, stats: 2, maxUp: 20, weight: 3.2 },
    { id: 'legendary', name: 'Legendary', color: '#ffb02e', mult: 2.9, stats: 3, maxUp: 25, weight: 0.7 },
    { id: 'mythic', name: 'Mythic', color: '#ff4f7a', mult: 3.8, stats: 3, maxUp: 30, weight: 0.1 },
    // never rolled: Uniques are named boss drops (js/data/uniques.js)
    { id: 'unique', name: 'Unique', color: '#f4f1ff', mult: 1, stats: 2, maxUp: 10, weight: 0 },
  ],
  upgradeStep: 0.12,       // each upgrade adds 12% of a Unique's base bonus
  // Unique upgrades cost about as much as a few class levels at your stage (item level follows your best stage)
  upgradeCost: (ilvl, up) => Math.round(30 * 1.27 ** ilvl * 1.3 ** up),
  salvage: (ilvl) => Math.round(25 * 1.27 ** ilvl),
  uniqueBoss: 0.2,         // chance a zone boss drops one of its Uniques (Oryx: double)
  uniqueKill: 0.00018,     // chance any other kill in the zone does (elites get a second roll)
  dupeUpgrades: 2,         // a Unique you already own melts into your copy as this many free upgrades
  exaltedWeight: 0.12,     // an Exalted Unique is this likely next to an ordinary one from the same boss
  uniqueLag: 6,            // Uniques' item level trails your best stage by this much
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
