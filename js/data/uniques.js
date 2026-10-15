// Unique items: Realm of the Mad God's UTs, as close to the real ones as this game allows (stats from the
// RealmEye wiki). Each zone boss guards its own; Exalted ones are the rarest endgame drops.
//
//   shot: how a UT weapon fires, ROTMG-style. n projectiles, arc (degrees between them; 0 = side by side),
//         rate (fire rate, 1 = normal), per (each projectile's damage as a share of a tiered weapon's whole
//         volley: avg damage ÷ the tiered peer's), range and speed in tiles, pierce, wavy, ignoreDef, vary
//         (damage spread), look and color. Tiered peers: bow 190 (Bow of Covert Havens, 125-135 + 2×25-35),
//         staff 160, wand 152 (Wand of Recompense), dagger 135, sword 245.
//   abil: what a UT ability item changes about its class's ability (see useAbility in core/battle.js).
//   rot:  ROTMG stat bonuses (ATT, DEX, DEF, HP, MP, VIT, WIS, SPD; armor = the armor's own DEF), turned into
//         this game's percentages by core/items.js.
//   fx:   other effects battle.js applies.
//   exalted: far rarer, far stronger. A gold bag instead of a white one.
export const UNIQUES = [
  // ---- Beaches · Kraken King (the Ocean Trench, Snake Pit and pirates) ----
  { id: 'coralBow', name: 'Coral Bow', kind: 'bow', zone: 0, shot: { n: 2, arc: 9, rate: 1.25, per: 0.45, pierce: true, range: 6.4, speed: 18.5, look: 'arrow', color: '#ff7aa8' },
    pal: ['#b8405a', '#ff8a9a', '#ffe0d0'], desc: 'Two coral-pink arrows 9° apart at 125% rate of fire. Fast shots that pass through enemies.' },
  { id: 'coralTrap', name: 'Coral Venom Trap', kind: 'trap', zone: 0, abil: { mode: 'paralyze', pow: 1, dur: 3 }, rot: { spd: 4, dex: 4 },
    pal: ['#b8405a', '#ff8a9a', '#7affd8'], desc: 'The trap Paralyzes everything it catches for 3 seconds instead of slowing it. +4 SPD, +4 DEX.' },
  { id: 'coralSilk', name: 'Coral Silk Armor', kind: 'leather', zone: 0, rot: { armor: 14, dex: 8, wis: 8 },
    pal: ['#c0506a', '#ff9aa8', '#ffe0d0'], desc: 'Mermaid-woven armor threaded with coral. 14 DEF, +8 DEX, +8 WIS.' },
  { id: 'bulwark', name: 'Wand of the Bulwark', kind: 'wand', zone: 0, shot: { n: 1, rate: 0.33, per: 2.63, pierce: true, range: 6.6, speed: 6, look: 'orb', color: '#7cff9a', size: 1.8 },
    pal: ['#2a5a2a', '#7cff9a', '#e8ffd0'], desc: 'Lazily drifting orbs that lay a minefield close by: one huge, slow, piercing shot at 33% rate of fire.' },
  { id: 'cutlass', name: "Pirate King's Cutlass", kind: 'sword', zone: 0, shot: { n: 1, rate: 1.3, per: 0.84, range: 3.3, speed: 15, look: 'slash', color: '#ffd34d' }, rot: { spd: 3, def: -2 },
    pal: ['#8a6a2a', '#e8d8a0', '#ffd34d'], desc: 'A fast-swinging cutlass: 130% rate of fire, short reach. +3 SPD, −2 DEF.' },
  { id: 'spiritDagger', name: 'Spirit Dagger', kind: 'dagger', zone: 0, shot: { n: 1, per: 1.07, vary: 0.69, range: 5.2, speed: 13, look: 'blade', color: '#bfe8ff' },
    pal: ['#5a7a9a', '#bfe8ff', '#ffffff'], desc: 'A ghostly blade with a wild damage spread (45–245): it can hit like a top-tier dagger or like a steel one.' },

  // ---- Lowlands · Dwarf King (Sprite World, the Spider Den, the Woodland Labyrinth) ----
  { id: 'poisonFang', name: 'Poison Fang Dagger', kind: 'dagger', zone: 1, shot: { n: 1, per: 0.7, range: 5.6, speed: 14, look: 'blade', color: '#7cff4a' }, rot: { att: 4 },
    pal: ['#2a4a1a', '#7cff4a', '#e8ffd0'], desc: 'A dagger made from a giant spider’s fang. An early UT: modest damage, quick to find.' },
  { id: 'sep', name: 'Staff of Extreme Prejudice', kind: 'staff', zone: 1, shot: { n: 10, arc: 36, rate: 0.4, per: 0.8, range: 5.5, speed: 11, look: 'star', color: '#ffd34d' },
    pal: ['#7a5a1a', '#ffd34d', '#ffffff'], desc: 'Fires a full 360° ring of 10 short-range bolts at 40% rate of fire. Shreds anything standing right next to the wizard.' },
  { id: 'leafBow', name: 'Leaf Bow', kind: 'bow', zone: 1, shot: { n: 1, rate: 1.4, per: 0.75, wavy: true, range: 7.2, speed: 12, look: 'arrow', color: '#7ae05a' }, rot: { spd: 5 },
    pal: ['#2f6a2a', '#7ae05a', '#f0ffd0'], desc: 'A single wavy leaf at 140% rate of fire. Gives up piercing for range and steady damage. +5 SPD.' },
  { id: 'planewalker', name: 'Cloak of the Planewalker', kind: 'cloak', zone: 1, abil: { mode: 'planewalk', dur: 1.2 }, rot: { dex: 5, spd: 4 },
    pal: ['#3a2a6a', '#8a6ad8', '#c0f0ff'], desc: 'After the Backstab the Rogue teleports out and can’t be touched for a moment. +5 DEX, +4 SPD.' },
  { id: 'experimental', name: 'Experimental Ring', kind: 'ring', ring: 'hp', zone: 1, rot: { hp: 60, mp: 60, def: 4, vit: 4 },
    pal: ['#4a6a7a', '#a0e8ff', '#7affd8'], desc: 'An early prototype: +60 HP, +60 MP, +4 DEF, +4 VIT.' },
  { id: 'leafDragon', name: 'Leaf Dragon Hide Armor', kind: 'leather', zone: 1, rot: { armor: 13, hp: 50, spd: 6, wis: 3, vit: 3 },
    pal: ['#2f6a2a', '#7ae05a', '#ffd34d'], desc: 'Trades armor for life and speed: 13 DEF, +50 HP, +6 SPD, +3 WIS, +3 VIT.' },

  // ---- Midlands · Lich (the Undead Lair, the Mad Lab, the haunted places) ----
  { id: 'doomBow', name: 'Doom Bow', kind: 'bow', zone: 2, shot: { n: 1, rate: 0.33, per: 2.89, ignoreDef: true, range: 7, speed: 14, look: 'arrow', color: '#ff2a2a', size: 1.7 },
    pal: ['#1a0a0a', '#7a1a1a', '#ff3a3a'], desc: 'One enormous arrow at a time (500–600 damage, 33% rate of fire). Hits so hard that armor barely matters.' },
  { id: 'madScientist', name: 'Robe of the Mad Scientist', kind: 'robe', zone: 2, rot: { armor: 12, vit: 5, wis: 5 }, fx: { cdr: 0.2 },
    pal: ['#e8e8f0', '#ffffff', '#7affd8'], desc: 'Abilities cost 20% less (they come round 20% sooner). 12 DEF, +5 VIT, +5 WIS.' },
  { id: 'fulmination', name: 'Scepter of Fulmination', kind: 'scepter', zone: 2, abil: { mode: 'fulminate', targets: 5, pow: 0.55, falloff: 1, slow: 3 }, rot: { att: 2, wis: 2 },
    pal: ['#2a3a6a', '#6ab0ff', '#e0f0ff'], desc: 'Weaker lightning that reaches 5 enemies without fading and Slows them all for 3 seconds. +2 ATT, +2 WIS.' },
  { id: 'resWarrior', name: "Resurrected Warrior's Armor", kind: 'heavy', zone: 2, rot: { armor: 17, mp: 150, wis: 20 },
    pal: ['#4a4a52', '#a0a0aa', '#40ffe0'], desc: 'Heavy armor that trades HP for a deep well of power: 17 DEF, +150 MP, +20 WIS.' },
  { id: 'endlessTorment', name: 'Skull of Endless Torment', kind: 'skull', zone: 2, abil: { mode: 'torment', radius: 1.4, heal: 2 },
    pal: ['#3a1a1a', '#d8c8b0', '#ff3a3a'], desc: 'A wider blast whose stolen life heals the party twice as much, purging their ills.' },
  { id: 'purification', name: 'Tome of Purification', kind: 'tome', zone: 2, abil: { mode: 'purify', heal: 1.4 }, rot: { vit: 10, wis: 10 },
    pal: ['#e8e0c8', '#ffffff', '#ffe08a'], desc: 'A stronger, cleansing heal (+40%). +10 VIT, +10 WIS.' },

  // ---- Highlands · Ent Ancient (the Ice Cave, the Crystal Prisoner, the Toxic Sewers, the Abyss) ----
  { id: 'esben', name: 'Staff of Esben', kind: 'staff', zone: 3, shot: { n: 2, arc: 0, per: 0.47, wavy: true, pierce: true, range: 8.4, speed: 16, look: 'orb', color: '#9ad8ff' }, rot: { spd: 3 },
    pal: ['#2a4a7a', '#9ad8ff', '#ffffff'], desc: 'Two icy bolts in wide waves that pass through everything they touch. Made for hordes. +3 SPD.' },
  { id: 'crystalWand', name: 'Crystal Wand', kind: 'wand', zone: 3, shot: { n: 1, rate: 1.1, per: 0.77, ignoreDef: true, range: 9, speed: 15, look: 'bolt', color: '#d8b8ff' },
    pal: ['#5a4a8a', '#d8b8ff', '#ffffff'], desc: 'Crystal bolts that ignore armor completely, at 110% rate of fire.' },
  { id: 'crystalSword', name: 'Crystal Sword', kind: 'sword', zone: 3, shot: { n: 1, per: 0.86, range: 4.5, speed: 12, look: 'slash', color: '#c8a8ff' },
    pal: ['#5a4a8a', '#c8a8ff', '#ffffff'], desc: 'Reaches 4.5 tiles where other swords reach 3.5, so it starts cutting sooner.' },
  { id: 'murky', name: 'Murky Toxin', kind: 'poison', zone: 3, abil: { mode: 'twinBombs', inner: 0.3, outer: 0.12 }, rot: { att: 3, dex: 3 },
    pal: ['#2a3a1a', '#6a8a2a', '#7cff4a'], desc: 'Throws two bombs at once: a small, deadly one inside a wide one. +3 ATT, +3 DEX.' },
  { id: 'demonBlade', name: 'Demon Blade', kind: 'sword', zone: 3, shot: { n: 2, arc: 25, per: 0.66, range: 3.4, speed: 13, look: 'slash', color: '#ff3a3a' },
    pal: ['#3a0a0a', '#8a1a1a', '#ff3a3a'], desc: 'Two blades in a V, 25° apart. Up close both land, and it’s one of the deadliest swords there is.' },
  { id: 'decades', name: 'Ring of Decades', kind: 'ring', ring: 'hp', zone: 3, rot: { hp: 190 },
    pal: ['#8a3a6a', '#ff8ad8', '#ffe0f0'], desc: 'The most life any ring can give: +190 HP.' },

  // ---- Godlands · Grand Sphinx (the Tomb of the Ancients) ----
  { id: 'pyramid', name: 'Ring of the Pyramid', kind: 'ring', ring: 'atk', zone: 4, rot: { att: 4, def: 4, hp: 100 },
    pal: ['#8a6a2a', '#ffd34d', '#4aa3ff'], desc: 'A balanced ring from the Tomb: +4 ATT, +4 DEF, +100 HP.' },
  { id: 'sphinxRing', name: 'Ring of the Sphinx', kind: 'ring', ring: 'atk', zone: 4, rot: { wis: 4, dex: 4, mp: 100 },
    pal: ['#8a6a2a', '#ffd34d', '#7affd8'], desc: 'For casters: +4 WIS, +4 DEX, +100 MP.' },
  { id: 'holyProtection', name: 'Tome of Holy Protection', kind: 'tome', zone: 4, abil: { mode: 'holyProtection' }, rot: { def: 4, hp: 40 },
    pal: ['#d8c890', '#fff3c0', '#4aa3ff'], desc: 'Heals the whole party at once instead of one ally, and makes the Priest Armored. +4 DEF, +40 HP.' },
  { id: 'juggernaut', name: 'Helm of the Juggernaut', kind: 'helm', zone: 4, abil: { mode: 'juggernaut' }, rot: { def: 10, spd: 5 },
    pal: ['#5a5a66', '#c0c0c8', '#ff6a3a'], desc: 'Berserk spreads to the whole party, and the Warrior turns Armored (takes 40% less). +10 DEF, +5 SPD.' },
  { id: 'thunder', name: 'Quiver of Thunder', kind: 'quiver', zone: 4, abil: { mode: 'snipe', pow: 2.4, daze: 3 },
    pal: ['#3a3a6a', '#ffe36a', '#ffffff'], desc: 'Instead of a piercing volley: one thunderous arrow (about 1,000 damage) into the toughest enemy, Dazing it for 3 seconds.' },
  { id: 'crystalSerpent', name: 'Staff of the Crystal Serpent', kind: 'staff', zone: 4, shot: { n: 2, arc: 0, rate: 1.1, per: 0.41, wavy: true, range: 9, speed: 16, look: 'orb', color: '#b8a0ff' },
    pal: ['#4a3a8a', '#b8a0ff', '#ffffff'], desc: 'Light, fast bolts (110% rate of fire) with a wand’s 9-tile reach: damage from safety.' },

  // ---- Castle Approaches · Stone Guardian (the Lost Lands, the Keyper, the Shatters) ----
  { id: 'ogmur', name: 'Shield of Ogmur', kind: 'shield', zone: 5, abil: { mode: 'armorBreak', pow: 1.15, dur: 4 }, rot: { hp: 60, def: 14 },
    pal: ['#3a4a5a', '#8aa0b8', '#ff8a3a'], desc: 'The bash breaks armor instead of stunning: enemies hit lose all armor for 4 seconds. +60 HP, +14 DEF.' },
  { id: 'blasphemous', name: 'Seal of Blasphemous Prayer', kind: 'seal', zone: 5, abil: { mode: 'invuln', dur: 1.5 }, rot: { spd: 4 },
    pal: ['#3a1a3a', '#c0a0d0', '#ffd34d'], desc: 'The seal also makes the Paladin Invulnerable for 1.5 seconds. +4 SPD.' },
  { id: 'devastation', name: 'Scepter of Devastation', kind: 'scepter', zone: 5, abil: { mode: 'devastate', targets: 3, pow: 1.3, falloff: 0.9 }, rot: { att: 4, wis: 2, hp: -20, vit: -5 },
    pal: ['#4a1a1a', '#ff6a3a', '#ffe08a'], desc: 'Fewer, harder jumps: 3 targets at 130% with little falloff. +4 ATT, +2 WIS, −20 HP, −5 VIT.' },
  { id: 'corruptedSouls', name: 'Skull of Corrupted Souls', kind: 'skull', zone: 5, abil: { mode: 'curse', curse: 4, radius: 0.8 },
    pal: ['#2a1a3a', '#a08ab8', '#ff6ad8'], desc: 'A tighter blast that Curses everything it hits for 4 seconds (they take 25% more damage).' },
  { id: 'monarchy', name: 'Mantle of the Monarchy', kind: 'robe', zone: 5, rot: { armor: 10, hp: 40, mp: 40, def: 10, vit: 20 }, fx: { vitProc: 0.03 },
    pal: ['#3a2a5a', '#8a6ab0', '#ffd34d'], desc: 'When struck, VIT surges for 10 seconds (fast healing; every 25 seconds). 10 DEF, +40 HP, +40 MP, +10 DEF, +20 VIT.' },
  { id: 'bloodySurprises', name: 'Cloak of Bloody Surprises', kind: 'cloak', zone: 5, abil: { mode: 'bloody', dur: 3.5, dmg: 0.5 },
    pal: ['#4a0a1a', '#a01a2a', '#ff3a5a'], desc: 'After the Backstab the Rogue goes berserk: +50% damage for 3.5 seconds.' },
  { id: 'fallen', name: 'Wand of the Fallen', kind: 'wand', zone: 5, shot: { n: 1, rate: 0.85, per: 1.1, range: 6.6, speed: 12.5, look: 'bolt', color: '#b84aff' },
    pal: ['#3a1a5a', '#b84aff', '#ffe0ff'], desc: 'One of the hardest-hitting wands, at 85% rate of fire.' },
  { id: 'bracer', name: 'Bracer of the Guardian', kind: 'ring', ring: 'def', zone: 5, exalted: true, rot: { hp: 90, mp: 80, att: 4, def: 9 },
    pal: ['#3a4a6a', '#a0b8e8', '#ffd34d'], desc: 'The Shatters’ guardian band: +90 HP, +80 MP, +4 ATT, +9 DEF.' },

  // ---- Oryx's Castle · Oryx the Mad God (Oryx's Sanctuary, the Lost Halls, the Void) ----
  { id: 'newLife', name: 'Breastplate of New Life', kind: 'heavy', zone: 6, rot: { armor: 14, hp: 160 },
    pal: ['#e8e0d0', '#ffffff', '#7affd8'], desc: 'Marble armor from the Lost Halls that trades armor for a huge well of life: 14 DEF, +160 HP.' },
  { id: 'avarice', name: 'Avarice', kind: 'dagger', zone: 6, shot: { n: 1, per: 1.5, wavy: true, range: 5.5, speed: 14, look: 'blade', color: '#ffd34d' },
    pal: ['#7a5a0a', '#ffd34d', '#ffffff'], desc: 'Steady, heavy blades (190–215) that weave left and right.' },
  { id: 'voidBow', name: 'Bow of the Void', kind: 'bow', zone: 6, exalted: true, shot: { n: 1, rate: 1.05, per: 1.12, pierce: true, wavy: true, range: 6, speed: 16, look: 'arrow', color: '#9a5aff', size: 1.3 },
    pal: ['#1a0a2a', '#6a3ab0', '#d0a0ff'], desc: 'The Void Entity’s bow: one heavy arrow that weaves and pierces everything in its path.' },
  { id: 'colossus', name: 'Sword of the Colossus', kind: 'sword', zone: 6, exalted: true, shot: { n: 1, per: 1.17, wavy: true, range: 4.5, speed: 10, look: 'slash', color: '#f0e8d8', size: 1.3 },
    pal: ['#8a8a92', '#f0e8d8', '#7affd8'], desc: 'Marble Colossus’s blade: a long, curving swing that hits harder than any tiered sword.' },
  { id: 'divinity', name: 'Divinity', kind: 'sword', zone: 6, exalted: true, shot: { n: 1, rate: 0.6, per: 1.22, pierce: true, range: 4, speed: 12, look: 'slash', color: '#fff3b0', size: 1.3, beam: { per: 2.86, every: 1, radius: 2.25, reach: 6.25 } },
    pal: ['#8a7a2a', '#fff3b0', '#ffffff'], desc: 'Oryx 3’s holy blade. Piercing swings, and every second an Exalted Beam blasts the area at the end of its reach (600–800, ignores armor).' },
  { id: 'unholy', name: 'Staff of Unholy Sacrifice', kind: 'staff', zone: 6, exalted: true, shot: { n: 4, arc: 5, rate: 0.55, per: 0.89, pierce: true, range: 8, speed: 14, look: 'orb', color: '#e0203a', size: 1.2 },
    pal: ['#3a0a1a', '#a0102a', '#ff6a6a'], desc: 'Four heavy piercing bolts that fire backwards (55% rate of fire): the wizard turns away from the horde to unleash them. Out-damages almost every staff.' },
  { id: 'genesis', name: 'Genesis Spell', kind: 'spell', zone: 6, exalted: true, abil: { mode: 'portals', pow: 1.8, dur: 4 },
    pal: ['#2a1a5a', '#b6a0ff', '#ffffff'], desc: 'Opens four portals that zap everything in a wide area every 0.4 seconds for 4 seconds.' },
  { id: 'omnipotence', name: 'Omnipotence Ring', kind: 'ring', ring: 'atk', zone: 6, exalted: true, rot: { hp: 80, mp: 80, att: 4, def: 4, spd: 4, dex: 4, vit: 4, wis: 4 },
    pal: ['#5a3a8a', '#d0a0ff', '#ffffff'], desc: 'Everything at once: +80 HP, +80 MP, +4 ATT, +4 DEF, +4 SPD, +4 DEX, +4 VIT, +4 WIS.' },
  // ---- more real UTs (second RealmEye pass) ----
  { id: 'vileSpirit', name: 'Trap of the Vile Spirit', kind: 'trap', zone: 0, abil: { mode: 'vile', pow: 1.6, curse: 2 }, rot: { att: 5, spd: 5 },
    pal: ['#1a3a3a', '#5a9a8a', '#c0ffe0'], desc: 'Davy Jones’ trap: a huge blast (about 1,300) that Curses what it hits for 2 seconds. +5 ATT, +5 SPD.' },
  { id: 'archerang', name: 'Archerang', kind: 'quiver', zone: 1, abil: { mode: 'archerang', pow: 0.6, dur: 2 },
    pal: ['#6a4a2a', '#d8a860', '#ffe0a0'], desc: 'A boomerang arrow that flies out and back through the horde, Slowing and Paralyzing everything it passes for 2 seconds. Little damage, total control.' },
  { id: 'wanderingSouls', name: 'Wandering Souls Spell', kind: 'spell', zone: 2, abil: { mode: 'souls', pow: 1.3, soul: 0.2 }, rot: { def: 3, spd: 3 },
    pal: ['#2a2a4a', '#a0b0e8', '#e0f0ff'], desc: 'Six huge piercing ghost bolts into the nearest pack, ignoring armor. One cast in five also frees a Wandering Soul that haunts the area for 6 seconds. +3 DEF, +3 SPD.' },
  { id: 'plague', name: 'Plague Poison', kind: 'poison', zone: 2, abil: { mode: 'plague', pow: 0.2 }, rot: { att: 4, wis: 4 },
    pal: ['#3a4a1a', '#9ab040', '#e0ff6a'], desc: 'A vast, slow cloud (9-tile radius) that poisons nearly the whole horde over 10 seconds. No impact damage. +4 ATT, +4 WIS.' },
  { id: 'crystalShield', name: 'Crystal Shield', kind: 'shield', zone: 3, abil: { mode: 'crystal', dur: 5, retaliate: 1.5 },
    pal: ['#5a4a8a', '#d8b8ff', '#ffffff'], desc: 'No stun: the Knight turtles up instead, Armored for 5 seconds, firing back at everything that hits him and healing a little from each blow.' },
  { id: 'perennial', name: 'Perennial Cranium', kind: 'skull', zone: 3, abil: { mode: 'plant', pow: 0.45, dur: 5 }, rot: { hp: 60, spd: 4, vit: 4 },
    pal: ['#2a4a1a', '#7ab04a', '#ffb0d0'], desc: 'Plants a living skull-flower for 5 seconds that blasts nearby enemies and heals the party. +60 HP, +4 SPD, +4 VIT.' },
  { id: 'nile', name: 'Ring of the Nile', kind: 'ring', ring: 'atk', zone: 4, rot: { hp: 60, mp: 60, spd: 4, dex: 4 },
    pal: ['#2a5a7a', '#6ab8e0', '#ffd34d'], desc: 'The Tomb’s quick ring: +60 HP, +60 MP, +4 SPD, +4 DEX.' },
  { id: 'pain', name: 'Tome of Pain', kind: 'tome', zone: 4, abil: { mode: 'pain', dmg: 1.1, heal: 0.5 }, rot: { hp: -20, att: 4, spd: 4, def: 2, vit: -5 },
    pal: ['#4a1a1a', '#c04040', '#ffb0a0'], desc: 'The Priest’s offensive tome: blasts everything within 6 tiles and heals the party only weakly. +4 ATT, +4 SPD, +2 DEF, −20 HP, −5 VIT.' },
  { id: 'scholar', name: "Scholar's Seal", kind: 'seal', zone: 4, abil: { mode: 'scholar', cd: 5, wis: 0.3 }, rot: { spd: 4, dex: 4 },
    pal: ['#3a3a6a', '#a0a0e8', '#ffe08a'], desc: 'No heal, no damage buff: instead +15 WIS for the whole party: their abilities come round 5 seconds sooner and hit 30% harder for 6 seconds. +4 SPD, +4 DEX.' },
  { id: 'visage', name: "Vanguard's Visage", kind: 'helm', zone: 5, abil: { mode: 'visage', pow: 1.4 }, rot: { def: 9, att: 4, vit: 4 },
    pal: ['#3a4a6a', '#a0b8e8', '#ff6a3a'], desc: 'Berserk for the whole party (no Speedy), and the Warrior fires a piercing, armor-ignoring bolt through the horde. +9 DEF, +4 ATT, +4 VIT.' },
  { id: 'thousandShot', name: 'Thousand Shot', kind: 'bow', zone: 5, shot: { n: 1, rate: 2, per: 0.51, pierce: true, ignoreDef: true, range: 7.6, speed: 16.5, look: 'arrow', color: '#ffe36a' },
    pal: ['#6a5a1a', '#ffe36a', '#ffffff'], desc: 'The fastest-firing weapon in the game: 200% rate of fire, armor-piercing arrows that pass through enemies.' },
];
export const UNIQUE = Object.fromEntries(UNIQUES.map((u) => [u.id, u]));
/** One-time effects take the strongest; everything else adds up. */
export const FX_MAX = new Set(['revive', 'rezAlly', 'firstStrike', 'charge', 'chargeX', 'vitProc']);
