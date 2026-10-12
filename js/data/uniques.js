// Unique items: named pieces with special effects, dropped by a zone's boss (rarely by its other enemies).
// Their stats keep pace with your progress, and you keep them when you Ascend.
//   fx:    effects battle.js applies (several can stack on one item; the same effect on two items adds up)
//   rate:  weapons only: multiplies fire rate, and each shot hits harder to match (so 0.4 = slow, heavy shots)
//   extra: a fixed bonus stat; ring: a ring's main stat; pal: the item's own colors [main, light, gem]
//   exalted: far rarer, far stronger. A gold bag instead of a white one.
//
// Effects
//   on every shot:  splash (others take this share)  chain (jumps on, this share each jump)  multishot (one more
//                   target)  burn (this share again over 3s)  chill (seconds of slow)  stun (chance)  leech (heal
//                   this share)  double (chance to fire twice)  charge/chargeX (every Nth shot hits ×X)
//                   ramp (+this per hit on the same target, 10 stacks)  critDmg  execute  bossDmg
//   on any kill:    corpse (the body explodes for this share of its max HP)  frenzy (fire faster for 2.5s)
//   defense:        regen  partyRegen  barrier (shield each wave)  partyBarrier  guard  dodge  thorns  revive
//                   rezAlly (raise the first ally to fall)  waveHeal (party heals at each wave)
//   power:          aura (party damage)  glass (own damage)  lastStand (damage below 40% HP)  haste  cdr  echo
//                   abilityDmg  firstStrike  luck
export const UNIQUES = [
  // ---- Beaches · Kraken King ----
  { id: 'tideStaff', name: 'Staff of the Breaking Tide', kind: 'staff', zone: 0, rate: 0.4, fx: { splash: 1 }, extra: { k: 'crit', v: 5 }, pal: ['#1d4f8a', '#4fb6e8', '#bff4ff'],
    desc: 'Fires slow, heavy tide orbs (40% the fire rate, 2.5× the damage) that burst on impact, splashing every other enemy for the same damage.' },
  { id: 'coralBow', name: 'Coral Bow', kind: 'bow', zone: 0, fx: { multishot: 0.6 }, extra: { k: 'spdPct', v: 10 }, pal: ['#b8405a', '#ff8a8a', '#ffe0c0'],
    desc: 'Every arrow splits: each shot also strikes a second enemy for 60% damage.' },
  { id: 'pearl', name: 'Pearl of the Deep', kind: 'ring', ring: 'hp', zone: 0, fx: { regen: 0.02 }, extra: { k: 'hpPct', v: 12 }, pal: ['#6a7a9a', '#e8eef8', '#ffffff'],
    desc: 'Restores 2% of max HP every second.' },
  { id: 'driftShield', name: 'Driftwood Bulwark', kind: 'shield', zone: 0, fx: { barrier: 0.2 }, extra: { k: 'hpPct', v: 10 }, pal: ['#6a4a2a', '#a8804a', '#7ae0ff'],
    desc: 'Starts every wave behind a barrier worth 20% of max HP.' },
  { id: 'brineCloak', name: 'Brine-Soaked Cloak', kind: 'cloak', zone: 0, fx: { dodge: 0.18, regen: 0.012 }, extra: { k: 'spdPct', v: 6 }, pal: ['#1a3a4a', '#3a8a9a', '#a0fff0'],
    desc: 'Dodges 18% of enemy shots and restores 1.2% of max HP every second.' },
  { id: 'inkVial', name: 'Kraken Ink Vial', kind: 'poison', zone: 0, fx: { abilityDmg: 0.5 }, extra: { k: 'crit', v: 5 }, pal: ['#1a1a2a', '#4a3a6a', '#c070ff'],
    desc: 'Ability deals 50% more damage.' },

  // ---- Lowlands · Dwarf King ----
  { id: 'dwarfAxe', name: 'Axe of the Dwarf King', kind: 'sword', zone: 1, fx: { critDmg: 1.5 }, extra: { k: 'crit', v: 10 }, pal: ['#6a3a24', '#c09040', '#ffd34d'],
    desc: 'Critical hits deal 3.5× damage instead of 2×.' },
  { id: 'dwarfCrown', name: 'Crown of the Dwarf King', kind: 'helm', zone: 1, fx: { cdr: 0.4 }, extra: { k: 'hpPct', v: 10 }, pal: ['#8a6a1a', '#ffd34d', '#ff4a4a'],
    desc: 'Ability recharges 40% faster.' },
  { id: 'forgeWand', name: 'Forgefire Wand', kind: 'wand', zone: 1, fx: { burn: 0.6 }, extra: { k: 'atkPct', v: 6 }, pal: ['#5a2a14', '#ff6a2a', '#ffe08a'],
    desc: 'Shots set enemies ablaze: 60% extra damage over 3 seconds.' },
  { id: 'hearthRing', name: 'Hearthstone Ring', kind: 'ring', ring: 'def', zone: 1, fx: { waveHeal: 0.2, barrier: 0.1 }, extra: { k: 'defPct', v: 10 }, pal: ['#5a3a2a', '#d08a4a', '#ff9a4a'],
    desc: 'At the start of every wave, the whole party heals 20% of max HP, and the wearer gains a barrier worth 10%.' },
  { id: 'anvilPlate', name: 'Anvil Plate', kind: 'heavy', zone: 1, fx: { guard: 0.12, thorns: 0.25 }, extra: { k: 'defPct', v: 12 }, pal: ['#3a3a44', '#8a8a96', '#ff7a3a'],
    desc: 'Takes 12% less damage, and attackers take 25% of their attack back.' },
  { id: 'runeTome', name: 'Tome of the Last Rite', kind: 'tome', zone: 1, fx: { rezAlly: 0.5 }, extra: { k: 'hpPct', v: 8 }, pal: ['#2a2a5a', '#6a6ad8', '#ffe08a'],
    desc: 'Once per fight, raises the first fallen ally 2 seconds later with 50% HP.' },

  // ---- Midlands · Lich ----
  { id: 'lichStaff', name: 'Staff of the Lich', kind: 'staff', zone: 2, fx: { echo: 0.5 }, extra: { k: 'crit', v: 6 }, pal: ['#2a1a40', '#d8d2c0', '#40ffe0'],
    desc: 'Abilities cast twice. The echo has 50% power.' },
  { id: 'phylactery', name: 'Phylactery Robe', kind: 'robe', zone: 2, fx: { revive: 0.4 }, extra: { k: 'hpPct', v: 10 }, pal: ['#1a1a2a', '#5a5a7a', '#40ffe0'],
    desc: 'Once per fight, cheats death and rises again with 40% HP.' },
  { id: 'soulDagger', name: 'Soulreaver Dagger', kind: 'dagger', zone: 2, fx: { leech: 0.2 }, extra: { k: 'crit', v: 6 }, pal: ['#2a1a2a', '#8a4a8a', '#ff4a8a'],
    desc: 'Heals for 20% of the damage it deals.' },
  { id: 'rimeBow', name: 'Rimefang Longbow', kind: 'bow', zone: 2, fx: { chill: 2 }, extra: { k: 'atkPct', v: 8 }, pal: ['#2a4a6a', '#9ad8ff', '#ffffff'],
    desc: 'Arrows freeze their target: it attacks 40% slower for 2 seconds.' },
  { id: 'tormentSkull', name: 'Skull of Endless Torment', kind: 'skull', zone: 2, fx: { corpse: 0.4 }, extra: { k: 'atkPct', v: 6 }, pal: ['#3a1a1a', '#d8c8b0', '#ff3a3a'],
    desc: 'While the wearer stands, every enemy that dies explodes, dealing 40% of its max HP to every other enemy.' },
  { id: 'wraithQuiver', name: 'Wraithbound Quiver', kind: 'quiver', zone: 2, fx: { abilityDmg: 0.5, cdr: 0.2 }, extra: { k: 'spdPct', v: 6 }, pal: ['#2a2a3a', '#6a7a9a', '#a0ffe0'],
    desc: 'Ability deals 50% more damage and recharges 20% faster.' },
  { id: 'necronomicon', name: 'Codex of the Unliving', kind: 'skull', zone: 2, exalted: true, fx: { corpse: 0.6, leech: 0.1, abilityDmg: 0.4 }, extra: { k: 'atkPct', v: 12 }, pal: ['#1a0a1a', '#6a2a4a', '#40ff9a'],
    desc: 'Every enemy that dies explodes for 60% of its max HP to every other enemy. Heals for 10% of damage dealt. Ability +40% damage.' },

  // ---- Forest · Ent Ancient ----
  { id: 'barkPlate', name: 'Ancient Bark Plate', kind: 'heavy', zone: 3, fx: { thorns: 0.45 }, extra: { k: 'defPct', v: 15 }, pal: ['#4a3a24', '#7a6a3a', '#a0ff60'],
    desc: 'Enemies that hit the wearer take 45% of their attack back as damage.' },
  { id: 'seedTome', name: 'Tome of the Elder Seed', kind: 'tome', zone: 3, fx: { partyRegen: 0.006 }, extra: { k: 'hpPct', v: 10 }, pal: ['#2a4a1a', '#6aa84a', '#d0ff8a'],
    desc: 'The whole party restores 0.6% of max HP every second.' },
  { id: 'heartBlade', name: 'Heartwood Greatblade', kind: 'sword', zone: 3, rate: 0.6, fx: { splash: 0.4 }, extra: { k: 'hpPct', v: 10 }, pal: ['#4a2a14', '#8a5a2a', '#a0ff60'],
    desc: 'Huge, slow cleaves (60% the swing rate, 1.7× the damage) that also hit every other enemy for 40%.' },
  { id: 'brambleSnare', name: 'Bramble Snare', kind: 'trap', zone: 3, fx: { abilityDmg: 0.5 }, extra: { k: 'atkPct', v: 6 }, pal: ['#2a3a14', '#5a7a2a', '#ff6a4a'],
    desc: 'Ability deals 50% more damage.' },
  { id: 'sapLeather', name: 'Sap-Bound Leather', kind: 'leather', zone: 3, fx: { regen: 0.02, guard: 0.08 }, extra: { k: 'hpPct', v: 12 }, pal: ['#4a3a1a', '#8a6a2a', '#ffd34d'],
    desc: 'Restores 2% of max HP every second and takes 8% less damage.' },
  { id: 'groveRing', name: 'Ring of the Old Grove', kind: 'ring', ring: 'atk', zone: 3, fx: { haste: 0.12, regen: 0.006 }, extra: { k: 'atkPct', v: 6 }, pal: ['#2a4a2a', '#5a9a4a', '#ffe08a'],
    desc: 'Attacks 12% faster and slowly restores HP.' },
  { id: 'verdantHeart', name: 'Verdant Heart', kind: 'ring', ring: 'hp', zone: 3, exalted: true, fx: { partyRegen: 0.012, waveHeal: 0.15, haste: 0.15 }, extra: { k: 'hpPct', v: 18 }, pal: ['#1a5a2a', '#4aff8a', '#ffffff'],
    desc: 'The party restores 1.2% HP every second and heals 15% at every wave. Attacks 15% faster.' },

  // ---- Desert · Grand Sphinx ----
  { id: 'sphinxFang', name: 'Fang of the Sphinx', kind: 'dagger', zone: 4, fx: { execute: 1.5 }, extra: { k: 'crit', v: 8 }, pal: ['#8a6a2a', '#d8b070', '#ffffff'],
    desc: 'Attacks deal 2.5× damage to enemies below 30% HP.' },
  { id: 'riddleRing', name: 'Riddle Ring', kind: 'ring', ring: 'atk', zone: 4, fx: { luck: 0.2 }, extra: { k: 'famePct', v: 20 }, pal: ['#8a6a1a', '#ffd34d', '#4aa3ff'],
    desc: 'Luck: gear drops rarer, and Uniques drop more often. Also +20% Fame.' },
  { id: 'duskCloak', name: 'Cloak of Dusk', kind: 'cloak', zone: 4, fx: { dodge: 0.25 }, extra: { k: 'spdPct', v: 8 }, pal: ['#2a1a3a', '#6a3a8a', '#ffb070'],
    desc: 'Dodges 25% of enemy shots.' },
  { id: 'sandWand', name: 'Wand of the Sandstorm', kind: 'wand', zone: 4, fx: { chain: 0.55 }, extra: { k: 'atkPct', v: 6 }, pal: ['#8a6a3a', '#e8c890', '#5de0ff'],
    desc: 'Shots arc on through every other enemy: 55% damage on the first jump, 30% on the next.' },
  { id: 'scarabRobe', name: 'Scarab-Woven Robe', kind: 'robe', zone: 4, fx: { barrier: 0.3 }, extra: { k: 'hpPct', v: 10 }, pal: ['#1a3a4a', '#3a8a8a', '#ffd34d'],
    desc: 'Starts every wave behind a barrier worth 30% of max HP.' },
  { id: 'flareSpell', name: 'Spell of the Noon Sun', kind: 'spell', zone: 4, fx: { abilityDmg: 0.6 }, extra: { k: 'crit', v: 5 }, pal: ['#8a4a14', '#ffb02e', '#ffffff'],
    desc: 'Ability deals 60% more damage.' },
  { id: 'mirageDagger', name: 'Mirage Dirk', kind: 'dagger', zone: 4, fx: { double: 0.3 }, extra: { k: 'spdPct', v: 6 }, pal: ['#6a5a8a', '#c0b0ff', '#ffe0ff'],
    desc: '30% of throws are followed by a mirage copy for full damage.' },
  { id: 'pharaohScepter', name: 'Scepter of the First Pharaoh', kind: 'scepter', zone: 4, exalted: true, fx: { echo: 0.7, abilityDmg: 0.3, cdr: 0.15 }, extra: { k: 'atkPct', v: 12 }, pal: ['#6a4a0a', '#ffd34d', '#4af0ff'],
    desc: 'Abilities cast twice (the echo at 70%), deal 30% more damage, and recharge 15% faster.' },

  // ---- Mountains · Stone Guardian ----
  { id: 'guardianShield', name: 'Bulwark of the Guardian', kind: 'shield', zone: 5, fx: { guard: 0.15 }, extra: { k: 'defPct', v: 15 }, pal: ['#5a5a66', '#b0b0b8', '#40a0ff'],
    desc: 'Takes 15% less damage from every hit.' },
  { id: 'sunderWand', name: 'Wand of Sundering', kind: 'wand', zone: 5, fx: { bossDmg: 0.6 }, extra: { k: 'crit', v: 6 }, pal: ['#3a3a4a', '#9a9ab0', '#ff4a4a'],
    desc: 'Deals 60% more damage to bosses.' },
  { id: 'glacierStaff', name: 'Glacier Staff', kind: 'staff', zone: 5, rate: 0.7, fx: { chill: 1, splash: 0.25 }, extra: { k: 'defPct', v: 8 }, pal: ['#2a4a7a', '#9ad8ff', '#ffffff'],
    desc: 'Heavier ice bolts that splash every other enemy for 25% and freeze the target for a second.' },
  { id: 'runeHelm', name: 'Helm of the Last Stand', kind: 'helm', zone: 5, fx: { lastStand: 0.6, guard: 0.05 }, extra: { k: 'hpPct', v: 12 }, pal: ['#4a4a5a', '#9a9aaa', '#ff6a3a'],
    desc: 'Below 40% HP, deals 60% more damage. Takes 5% less damage.' },
  { id: 'mountainSeal', name: 'Seal of the Mountain', kind: 'seal', zone: 5, fx: { partyBarrier: 0.12 }, extra: { k: 'defPct', v: 10 }, pal: ['#5a5a6a', '#d8d8e0', '#40a0ff'],
    desc: 'The whole party starts every wave behind a barrier worth 12% of their max HP.' },
  { id: 'stormBow', name: 'Bow of Gathering Storms', kind: 'bow', zone: 5, fx: { charge: 4, chargeX: 3.5 }, extra: { k: 'atkPct', v: 6 }, pal: ['#2a2a5a', '#6a8ad8', '#e0f0ff'],
    desc: 'Every 4th arrow is a storm arrow that hits for 3.5×.' },
  { id: 'quakeRing', name: 'Ring of Cracked Earth', kind: 'ring', ring: 'atk', zone: 5, fx: { stun: 0.08 }, extra: { k: 'atkPct', v: 6 }, pal: ['#5a4a3a', '#a08a6a', '#ffb070'],
    desc: '8% of hits stun the target for 0.8 seconds.' },
  { id: 'avalanche', name: 'Avalanche Maul', kind: 'sword', zone: 5, exalted: true, rate: 0.4, fx: { splash: 0.7, stun: 0.2 }, extra: { k: 'hpPct', v: 15 }, pal: ['#3a4a6a', '#c0d8ff', '#ffffff'],
    desc: 'Earth-shaking blows (40% the swing rate, 2.5× the damage) that hit every other enemy for 70% and stun 20% of the time.' },

  // ---- Oryx's Castle · Oryx the Mad God ----
  { id: 'madBlade', name: 'Blade of the Mad God', kind: 'sword', zone: 6, fx: { aura: 0.15 }, extra: { k: 'crit', v: 8 }, pal: ['#3a2a4a', '#8a3a5a', '#d8a830'],
    desc: 'While the wielder stands, the whole party deals 15% more damage.' },
  { id: 'madHide', name: 'Hide of the Mad God', kind: 'leather', zone: 6, fx: { haste: 0.3 }, extra: { k: 'hpPct', v: 12 }, pal: ['#2a1a2a', '#6a2a3a', '#d8a830'],
    desc: 'Attacks 30% faster.' },
  { id: 'conflictOrb', name: 'Orb of Conflict', kind: 'scepter', zone: 6, fx: { firstStrike: 1 }, extra: { k: 'atkPct', v: 12 }, pal: ['#2a1a3a', '#8a2a8a', '#ff4a8a'],
    desc: 'Ability is ready the instant each wave begins.' },
  { id: 'doomBow', name: 'Doom Bow', kind: 'bow', zone: 6, rate: 0.3, fx: { critDmg: 1, multishot: 1 }, extra: { k: 'crit', v: 15 }, pal: ['#1a0a0a', '#5a1a1a', '#ff2a2a'],
    desc: 'One enormous arrow at a time (30% the fire rate, 3.3× the damage) that punches through into a second enemy. Crits deal 3×.' },
  { id: 'chronoDirk', name: 'Dirk of the Endless Hour', kind: 'dagger', zone: 6, fx: { ramp: 0.08 }, extra: { k: 'spdPct', v: 10 }, pal: ['#2a2a4a', '#8a8ad8', '#ffe08a'],
    desc: 'Each hit on the same target deals 8% more, stacking up to +80%.' },
  { id: 'unboundRing', name: 'Ring of Unbound Fury', kind: 'ring', ring: 'atk', zone: 6, fx: { frenzy: 0.8, critDmg: 0.5 }, extra: { k: 'crit', v: 8 }, pal: ['#4a0a1a', '#ff3a5a', '#ffd34d'],
    desc: 'Whenever an enemy dies, attacks 80% faster for 2.5 seconds. Crits deal 2.5×.' },
  { id: 'madVestments', name: 'Vestments of the Mad God', kind: 'robe', zone: 6, fx: { glass: 0.9 }, extra: { k: 'hpPct', v: -20 }, pal: ['#2a0a2a', '#7a1a5a', '#ff4af0'],
    desc: 'Glass cannon: deals 90% more damage, but has 20% less HP.' },
  { id: 'feastTome', name: 'Tome of the Endless Feast', kind: 'tome', zone: 6, fx: { rezAlly: 0.8, waveHeal: 0.1 }, extra: { k: 'hpPct', v: 12 }, pal: ['#4a1a2a', '#c04a6a', '#ffe08a'],
    desc: 'Once per fight, raises the first fallen ally with 80% HP. The party heals 10% at every wave.' },
  { id: 'cataclysm', name: 'Staff of the Cataclysm', kind: 'staff', zone: 6, exalted: true, rate: 0.35, fx: { splash: 1.2, burn: 0.6 }, extra: { k: 'crit', v: 10 }, pal: ['#3a0a0a', '#ff4a1a', '#ffe08a'],
    desc: 'Hurls a world-ending meteor (35% the fire rate, 2.9× the damage) that detonates on every enemy for even more than the direct hit, and leaves them all burning.' },
  { id: 'madCrown', name: 'Crown of the Mad God', kind: 'helm', zone: 6, exalted: true, fx: { aura: 0.12, cdr: 0.25, guard: 0.1 }, extra: { k: 'hpPct', v: 15 }, pal: ['#3a2a0a', '#d8a830', '#ff3a8a'],
    desc: 'The party deals 12% more damage. Ability recharges 25% faster. Takes 10% less damage.' },
];
export const UNIQUE = Object.fromEntries(UNIQUES.map((u) => [u.id, u]));
/** One-time effects take the strongest; everything else adds up. */
export const FX_MAX = new Set(['revive', 'rezAlly', 'firstStrike', 'charge', 'chargeX']);
