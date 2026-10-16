// The Realm, from the Beaches to Oryx (ten stages per zone, the tenth a boss), then the dungeons.
// Enemies are [name, art, palette]: art is an archetype from ui/art/monsters.js plus options; `pal` colors it.
const REALM = [
  { id: 'beach', name: 'Beaches', bg: ['#f2d79a', '#e0b86a', '#3fb6c8'], ground: '#e9cf8c', deco: ['rock', 'grass'],
    enemies: [['Pirate', ['humanoid', { hat: 'bandana', weapon: 'blade', skin: '#b88a6a' }], { a: '#2c4a78', b: '#a02a2a', c: '#ffd34d' }], ['Giant Crab', ['crab'], { a: '#b8402c', b: '#e07050', c: '#ffe08a' }], ['Sand Slime', ['slime'], { a: '#c8a04a', b: '#f0d890', c: '#2a1a0a' }]],
    boss: ['Kraken King', ['kraken'], { a: '#6a2a5a', b: '#c070a0', c: '#ffe08a' }] },
  { id: 'lowlands', name: 'Lowlands', bg: ['#8fce6a', '#5fa84a', '#3a7a3a'], ground: '#7fbf5a', deco: ['tree', 'grass'],
    enemies: [['Hobbit Mage', ['humanoid', { hat: 'hood', weapon: 'staff', skin: '#c9a080' }], { a: '#5a4a2a', b: '#a08050', c: '#5de0ff' }], ['Goblin', ['humanoid', { hat: 'horns', weapon: 'blade', skin: '#6a8a3a' }], { a: '#4a3a2a', b: '#7a5a3a', c: '#ff4040' }], ['Viper', ['serpent'], { a: '#4a6a24', b: '#c6c96a', c: '#ffde3d' }]],
    boss: ['Dwarf King', ['humanoid', { hat: 'crown', weapon: 'axe', skin: '#c08a6a', big: true, beard: true }], { a: '#6a3a24', b: '#c09040', c: '#ffd34d' }] },
  { id: 'midlands', name: 'Midlands', bg: ['#6aa05a', '#4a7a4a', '#2a4a3a'], ground: '#5a8a4a', deco: ['tree', 'rock'],
    enemies: [['Orc Warrior', ['humanoid', { hat: 'helm', weapon: 'axe', skin: '#5a7a3a' }], { a: '#3a3a2a', b: '#6a6a4a', c: '#ff5a3a' }], ['Dark Elf', ['humanoid', { hat: 'hood', weapon: 'spear', skin: '#8a7aa0' }], { a: '#2a2240', b: '#5a4a7a', c: '#ff40ff' }], ['Skeleton', ['skeleton'], { a: '#d8d2bc', b: '#f0ead8', c: '#ff4040' }]],
    boss: ['Lich', ['lich'], { a: '#2a1a40', b: '#d8d2c0', c: '#40ffe0' }] },
  { id: 'highlands', name: 'Highlands', bg: ['#8a9aa0', '#5a6a70', '#2a3a40'], ground: '#7a8a8a', deco: ['rock', 'ruin'],
    enemies: [['Ogre', ['humanoid', { hat: 'none', weapon: 'axe', skin: '#9a8a5a', big: true }], { a: '#5a4a30', b: '#8a7050', c: '#ff8040' }], ['Stone Golem', ['golem'], { a: '#7a7a7a', b: '#a0a0a0', c: '#ffb040' }], ['Wraith', ['ghost'], { a: '#8a8ab0', b: '#d0d0f0', c: '#40ffe0' }]],
    boss: ['Ent Ancient', ['golem', { tree: true, big: true }], { a: '#4a3a24', b: '#4a7a2a', c: '#a0ff60' }] },
  { id: 'godlands', name: 'Godlands', bg: ['#5a4a7a', '#3a2a5a', '#1a1030'], ground: '#4a3a6a', deco: ['crystal', 'ruin'],
    enemies: [['Medusa', ['serpent', { hood: true }], { a: '#2a6a5a', b: '#d0b060', c: '#ffde3d' }], ['Beholder', ['beholder'], { a: '#6a2a4a', b: '#d060a0', c: '#ff4040' }], ['Flying Brain', ['slime'], { a: '#b0608a', b: '#ffa0d0', c: '#ffffff' }]],
    boss: ['Grand Sphinx', ['sphinx'], { a: '#b08a3a', b: '#d8b070', c: '#d0a030' }] },
  { id: 'approach', name: 'Castle Approaches', bg: ['#5a4a4a', '#3a2a2a', '#1a1010'], ground: '#4a3a3a', deco: ['pillar', 'flame'],
    enemies: [['Oryx Guard', ['humanoid', { hat: 'helm', weapon: 'spear', skin: '#a08070' }], { a: '#2a2036', b: '#6a4a8a', c: '#ffd34d' }], ['Stone Gargoyle', ['demon'], { a: '#6a6a70', b: '#4a4a52', c: '#ff4040' }], ['Scarab', ['insect'], { a: '#3a4a2a', b: '#6a7a3a', c: '#ffde3d' }]],
    boss: ['The Keyper', ['golem', { big: true, crown: true }], { a: '#8a8a92', b: '#b0b0b8', c: '#40a0ff' }] },
  { id: 'castle', name: 'Oryx’s Castle', bg: ['#3a2a4a', '#2a1a3a', '#100818'], ground: '#2a1d3a', deco: ['pillar', 'flame'],
    enemies: [['Henchman of Oryx', ['humanoid', { hat: 'horns', weapon: 'blade', skin: '#8a6a7a' }], { a: '#4a0a1a', b: '#8a1a2a', c: '#ffd34d' }], ['Royal Golem', ['golem', { crown: true }], { a: '#4a3a6a', b: '#8a6ab0', c: '#ffd34d' }], ['Mad God Servant', ['demon'], { a: '#2a1a3a', b: '#4a2a5a', c: '#ff40ff' }]],
    boss: ['Oryx the Mad God', ['oryx'], { a: '#3a2a4a', b: '#4a1a2a', c: '#d8a830' }] },
];
// ---- dungeons: beating Oryx in Realm N unlocks tier N for good. Each is a short farmable zone of five stages
// ending in its real boss, who guards that boss's real Uniques. `lvl` is how hard its first stage is, in Realm
// stages (Oryx is 69), and `arena` picks its battlefield from ui/art/arena.js.
const H = (hat, weapon, skin, x = {}) => ['humanoid', { hat, weapon, skin, ...x }];
const D = (tier, id, name, tag, arena, enemies, boss) => ({ id, name, tag, tier, arena, dungeon: true, len: 5, lvl: 66 + Math.round(tier * 1.25), enemies, boss });
export const DUNGEONS = [
  D(1, 'spiderden', 'Spider Den', 'SD', 'cave', [['Black Widow', ['insect'], { a: '#1a1418', b: '#3a2a30', c: '#ff3030' }], ['Spider Hatchling', ['insect'], { a: '#5a4a3a', b: '#8a6a50', c: '#ffde3d' }], ['Egg Sac', ['slime'], { a: '#d8d0c0', b: '#f4eee0', c: '#2a1a0a' }]],
    ['Arachna the Spider Queen', ['insect'], { a: '#2a1030', b: '#6a2a7a', c: '#ff4040' }]),
  D(1, 'snakepit', 'Snake Pit', 'SP', 'cave', [['Snakepit Guard', H('helm', 'spear', '#7a9a5a'), { a: '#2a4a2a', b: '#6a8a3a', c: '#ffde3d' }], ['Pit Snake', ['serpent'], { a: '#4a6a24', b: '#c6c96a', c: '#ffde3d' }], ['Pit Viper', ['serpent'], { a: '#6a2a24', b: '#c08a5a', c: '#ff4040' }]],
    ['Stheno the Snake Queen', ['serpent', { hood: true }], { a: '#2a6a5a', b: '#d0b060', c: '#ff5a5a' }]),
  D(2, 'sprite', 'Sprite World', 'SW', 'sprite', [['Nature Sprite', ['ghost'], { a: '#5ad08a', b: '#c0ffd8', c: '#ffffff' }], ['Sprite Imp', ['demon'], { a: '#3a8a5a', b: '#7ae0a0', c: '#ffde3d' }], ['Limon’s Child', ['slime'], { a: '#7ae0c0', b: '#d0fff0', c: '#2a5a4a' }]],
    ['Limon the Sprite Goddess', ['ghost'], { a: '#5ae0ff', b: '#e0ffff', c: '#ffffff' }]),
  D(2, 'udl', 'Undead Lair', 'UDL', 'crypt', [['Lair Skeleton', ['skeleton'], { a: '#d8d2bc', b: '#f0ead8', c: '#7affd8' }], ['Lair Ghost', ['ghost'], { a: '#8aa0b0', b: '#d0e0f0', c: '#7affd8' }], ['Lair Mummy', H('hood', 'blade', '#c8c0a8'), { a: '#a89a7a', b: '#d8ccb0', c: '#7affd8' }]],
    ['Septavius the Ghost God', ['lich'], { a: '#1a2a2a', b: '#d8e0d0', c: '#5affc8' }]),
  D(3, 'docks', 'Deadwater Docks', 'DD', 'docks', [['Deadwater Sailor', H('bandana', 'blade', '#9ab0a8'), { a: '#2a3a4a', b: '#4a6a7a', c: '#7affd8' }], ['Bottled Spirit', ['ghost'], { a: '#5a8aa0', b: '#b0e0f0', c: '#7affd8' }], ['Docks Crab', ['crab'], { a: '#3a6a6a', b: '#6aa0a0', c: '#7affd8' }]],
    ['Jon Bilgewater the Pirate King', H('bandana', 'blade', '#9ab0a8', { big: true, beard: true }), { a: '#1a2a3a', b: '#3a6a7a', c: '#7affd8' }]),
  D(3, 'abyss', 'Abyss of Demons', 'AD', 'abyss', [['Imp', ['demon'], { a: '#8a1a1a', b: '#c03a2a', c: '#ffde3d' }], ['Demon Warrior', H('horns', 'axe', '#a03a2a'), { a: '#3a0a0a', b: '#7a1a1a', c: '#ffb040' }], ['Brute of the Abyss', ['golem'], { a: '#5a1a1a', b: '#8a2a2a', c: '#ff6a2a' }]],
    ['Archdemon Malphas', ['demon', { crown: true }], { a: '#6a0a1a', b: '#b02a2a', c: '#ffde3d' }]),
  D(3, 'woodland', 'Woodland Labyrinth', 'WL', 'lowlands', [['Epic Larva', ['slime'], { a: '#8ac04a', b: '#d8f0a0', c: '#2a3a0a' }], ['Megamoth', ['insect'], { a: '#8a6a3a', b: '#d8b070', c: '#ffde3d' }], ['Woodland Squirrel', H('none', 'blade', '#a07a50'), { a: '#6a4a2a', b: '#a07a4a', c: '#ffde3d' }]],
    ['Murderous Megamoth', ['insect'], { a: '#5a3a1a', b: '#c09050', c: '#ff8a3a' }]),
  D(4, 'madlab', 'Mad Lab', 'ML', 'lab', [['Escaped Experiment', ['slime'], { a: '#8a4ab0', b: '#d0a0f0', c: '#2a0a3a' }], ['Lab Golem', ['golem'], { a: '#5a6a7a', b: '#8aa0b0', c: '#7aff8a' }], ['Mini Bot', ['beholder'], { a: '#6a7a8a', b: '#a0b0c0', c: '#7aff8a' }]],
    ['Dr Terrible', H('helm', 'staff', '#d8d0c8', { big: true }), { a: '#e8e8f0', b: '#a0b0c0', c: '#7aff8a' }]),
  D(4, 'cemetery', 'Haunted Cemetery', 'HC', 'crypt', [['Zombie', H('none', 'axe', '#7a9a6a'), { a: '#3a3a2a', b: '#5a5a40', c: '#ff4040' }], ['Restless Ghost', ['ghost'], { a: '#8a8ab0', b: '#d0d0f0', c: '#ff6a6a' }], ['Grave Skeleton', ['skeleton'], { a: '#c8c0a8', b: '#e8e0c8', c: '#ff4040' }]],
    ['Ghost of Skuld', ['ghost'], { a: '#5a6a8a', b: '#c0d0f0', c: '#ff4040' }]),
  D(5, 'manor', 'Manor of the Immortals', 'MI', 'crypt', [['Vampire Bat', ['demon'], { a: '#2a1a2a', b: '#4a2a3a', c: '#ff2a3a' }], ['Vampire Servant', H('hood', 'blade', '#d8c8c0'), { a: '#4a0a1a', b: '#8a1a2a', c: '#ff2a3a' }], ['Haunted Armor', H('helm', 'spear', '#8a8a90'), { a: '#3a3a4a', b: '#6a6a7a', c: '#ff2a3a' }]],
    ['Lord Ruthven', H('crown', 'blade', '#e0d4d0', { big: true }), { a: '#2a0a14', b: '#8a1a2a', c: '#ff2a3a' }]),
  D(5, 'sewers', 'Toxic Sewers', 'TS', 'sewer', [['Sewer Rat', ['crab'], { a: '#6a5a4a', b: '#a08a70', c: '#ff4040' }], ['Toxic Slime', ['slime'], { a: '#6aa03a', b: '#c0f07a', c: '#1a2a0a' }], ['Sewer Bat', ['demon'], { a: '#3a3a2a', b: '#5a5a3a', c: '#c0ff4a' }]],
    ['Gulpord the Slime God', ['slime'], { a: '#5a8a2a', b: '#b0e06a', c: '#1a2a0a' }]),
  D(5, 'library', 'Cursed Library', 'CL', 'crypt', [['Cursed Tome', ['golem'], { a: '#6a3a1a', b: '#a06a3a', c: '#7affd8' }], ['Library Spirit', ['ghost'], { a: '#6a8aa0', b: '#c0e0f0', c: '#7affd8' }], ['Mad Scholar', H('hood', 'staff', '#c8a888'), { a: '#3a2a4a', b: '#6a5a8a', c: '#7affd8' }]],
    ['Avalon the Archivist', ['lich'], { a: '#2a1a3a', b: '#d8d0c0', c: '#7affd8' }]),
  D(6, 'icecave', 'Ice Cave', 'IC', 'ice', [['Ice Golem', ['golem'], { a: '#a0c8e0', b: '#e0f4ff', c: '#3a8aff' }], ['Snow Bat', ['demon'], { a: '#8aa0c0', b: '#d0e0f0', c: '#3a8aff' }], ['Frost Sprite', ['ghost'], { a: '#a0d8f0', b: '#ffffff', c: '#3a8aff' }]],
    ['Esben the Unwilling', ['lich'], { a: '#3a5a7a', b: '#e0f0ff', c: '#5ad0ff' }]),
  D(6, 'davy', 'Davy Jones’ Locker', 'DJ', 'trench', [['Ghost Sailor', ['ghost'], { a: '#3a6a6a', b: '#8ad0c0', c: '#d0ff7a' }], ['Drowned Pirate', H('bandana', 'blade', '#8ab0a0'), { a: '#1a3a3a', b: '#2a5a5a', c: '#d0ff7a' }], ['Phantom Crab', ['crab'], { a: '#2a5a5a', b: '#6aa0a0', c: '#d0ff7a' }]],
    ['Davy Jones', H('bandana', 'blade', '#7aa090', { big: true, beard: true }), { a: '#0a2a2a', b: '#2a5a4a', c: '#d0ff7a' }]),
  D(7, 'tomb', 'Tomb of the Ancients', 'TA', 'tomb', [['Scarab', ['insect'], { a: '#2a4a5a', b: '#4a8aa0', c: '#ffde3d' }], ['Tomb Mummy', H('hood', 'spear', '#d8ccb0'), { a: '#c8b890', b: '#e8dcc0', c: '#5de0ff' }], ['Tomb Guardian', ['golem'], { a: '#b08a3a', b: '#d8b070', c: '#5de0ff' }]],
    ['Bes, Nut and Geb', ['golem', { big: true, crown: true }], { a: '#c09a3a', b: '#e8c870', c: '#5de0ff' }]),
  D(8, 'trench', 'Ocean Trench', 'OT', 'trench', [['Fishman Warrior', H('helm', 'spear', '#5a9ab0'), { a: '#1a4a6a', b: '#2a7a9a', c: '#ffde3d' }], ['Pink Jellyfish', ['ghost'], { a: '#e07ab0', b: '#ffc0e0', c: '#ffffff' }], ['Deep Slime', ['slime'], { a: '#2a6aa0', b: '#7ac0e0', c: '#0a1a2a' }]],
    ['Thessal the Mermaid Goddess', ['serpent', { hood: true }], { a: '#2a8a9a', b: '#ff8aa0', c: '#ffe08a' }]),
  D(9, 'crystal', 'Crystal Cavern', 'CC', 'cave', [['Crystal Worm', ['serpent'], { a: '#8a5ad0', b: '#d0a0ff', c: '#ffffff' }], ['Crystal Golem', ['golem'], { a: '#7a5ac0', b: '#c0a0ff', c: '#ffffff' }], ['Shard Eye', ['beholder'], { a: '#9a6ad8', b: '#e0c0ff', c: '#ff6ad8' }]],
    ['Crystal Prisoner', ['golem', { big: true, crown: true }], { a: '#8a6ad8', b: '#e0d0ff', c: '#ff6ad8' }]),
  D(9, 'temple', 'Mountain Temple', 'MT', 'temple', [['Temple Monk', H('hood', 'staff', '#c8a080'), { a: '#2a5a3a', b: '#4a8a5a', c: '#ffde3d' }], ['Jade Statue', ['golem'], { a: '#3a8a6a', b: '#7ad0a0', c: '#ffde3d' }], ['Stone Dragon', ['serpent'], { a: '#5a7a6a', b: '#a0c0a8', c: '#ff8a3a' }]],
    ['Daichi the Fallen', H('helm', 'blade', '#c8a080', { big: true }), { a: '#1a3a2a', b: '#3a7a5a', c: '#ffde3d' }]),
  D(10, 'draconis', 'Lair of Draconis', 'LD', 'abyss', [['Dragon Whelp', ['serpent'], { a: '#8a2a1a', b: '#e07a3a', c: '#ffde3d' }], ['Draconis Guard', H('helm', 'spear', '#c08a6a'), { a: '#5a1a1a', b: '#a03a2a', c: '#ffde3d' }], ['Dragon Egg', ['slime'], { a: '#d0a040', b: '#ffe08a', c: '#3a1a0a' }]],
    ['Limoz the Viridian Dragon', ['serpent', { hood: true }], { a: '#2a7a3a', b: '#8ae07a', c: '#ffde3d' }]),
  D(10, 'parasite', 'Parasite Chambers', 'PC', 'sewer', [['Parasite', ['insect'], { a: '#8a1a3a', b: '#e05a7a', c: '#ffde3d' }], ['Flesh Blob', ['slime'], { a: '#c05a6a', b: '#ffa0b0', c: '#3a0a14' }], ['Host', H('hood', 'blade', '#d0b0b0'), { a: '#5a1a2a', b: '#a03a4a', c: '#ff6a8a' }]],
    ['Nightmare Colony', ['beholder'], { a: '#7a1a3a', b: '#e05a8a', c: '#ffde3d' }]),
  D(11, 'shaitan', 'Lair of Shaitan', 'LS', 'abyss', [['Fire Imp', ['demon'], { a: '#c04a1a', b: '#ff8a3a', c: '#ffde3d' }], ['Magma Golem', ['golem'], { a: '#3a1a1a', b: '#6a2a1a', c: '#ff6a1a' }], ['Flame Spirit', ['ghost'], { a: '#ff7a2a', b: '#ffd08a', c: '#ffffff' }]],
    ['Shaitan the Advisor', ['demon', { crown: true }], { a: '#7a1a0a', b: '#e05a1a', c: '#ffde3d' }]),
  D(11, 'puppet', 'Puppet Master’s Encore', 'PE', 'castle', [['Knight Puppet', H('helm', 'blade', '#d8c0a0'), { a: '#3a2a4a', b: '#7a5a9a', c: '#ffde3d' }], ['Archer Puppet', H('hood', 'spear', '#d8c0a0'), { a: '#2a4a2a', b: '#5a8a5a', c: '#ffde3d' }], ['Priest Puppet', H('hood', 'staff', '#d8c0a0'), { a: '#d8d0c0', b: '#f0e8d8', c: '#ffde3d' }]],
    ['The Puppet Master', H('crown', 'staff', '#e8d8c8', { big: true }), { a: '#4a0a2a', b: '#a02a5a', c: '#ffde3d' }]),
  D(11, 'kogbold', 'Kogbold Steamworks', 'KS', 'lab', [['Kogbold', H('helm', 'axe', '#6a8a3a'), { a: '#5a3a1a', b: '#a06a2a', c: '#ffb040' }], ['Steam Golem', ['golem'], { a: '#8a6a3a', b: '#c0a060', c: '#ffb040' }], ['Gear Bot', ['beholder'], { a: '#8a6a3a', b: '#d0b070', c: '#ffb040' }]],
    ['The Servers', ['golem', { big: true, crown: true }], { a: '#a07a3a', b: '#e0c080', c: '#ff6a2a' }]),
  D(12, 'thicket', 'Secluded Thicket', 'ST', 'sprite', [['Masked Warrior', H('horns', 'spear', '#a07a50'), { a: '#2a5a2a', b: '#6a9a3a', c: '#ff4040' }], ['Jungle Snake', ['serpent'], { a: '#3a7a2a', b: '#a0d06a', c: '#ff4040' }], ['Totem', ['golem'], { a: '#6a4a2a', b: '#a07a4a', c: '#5affc8' }]],
    ['Mixcoatl the Masked God', ['serpent', { hood: true }], { a: '#2a8a6a', b: '#f0d06a', c: '#ff4040' }]),
  D(12, 'garden', 'Belladonna’s Garden', 'BG', 'sprite', [['Thorn Vine', ['serpent'], { a: '#3a6a2a', b: '#8ac05a', c: '#ff6ad8' }], ['Blooming Golem', ['golem', { tree: true }], { a: '#5a3a2a', b: '#ff8ac8', c: '#ff6ad8' }], ['Garden Bee', ['insect'], { a: '#d0a020', b: '#ffe06a', c: '#1a1a0a' }]],
    ['Belladonna', ['golem', { tree: true, big: true }], { a: '#4a2a3a', b: '#ff6ab0', c: '#ffde3d' }]),
  D(13, 'sanctuary', 'Oryx’s Sanctuary', 'O3', 'castle', [['Henchman of Oryx', H('horns', 'blade', '#8a6a7a'), { a: '#4a0a1a', b: '#8a1a2a', c: '#ffd34d' }], ['Chancellor’s Guard', ['golem', { crown: true }], { a: '#4a3a6a', b: '#8a6ab0', c: '#ffd34d' }], ['Mad God Servant', ['demon'], { a: '#2a1a3a', b: '#4a2a5a', c: '#ff40ff' }]],
    ['Oryx the Mad God (Sanctuary)', ['oryx'], { a: '#3a2a4a', b: '#6a1a2a', c: '#ffe070' }]),
  D(14, 'halls', 'Lost Halls', 'LH', 'halls', [['Lost Sentry', ['golem'], { a: '#b8b2c4', b: '#e8e4f0', c: '#7ad0ff' }], ['Cultist', H('hood', 'staff', '#c8a0a0'), { a: '#5a0a1a', b: '#a02030', c: '#ff4040' }], ['Void Pest', ['insect'], { a: '#1a1030', b: '#4a2a7a', c: '#b07aff' }]],
    ['Marble Colossus', ['golem', { big: true, crown: true }], { a: '#d8d2e0', b: '#f4f0fa', c: '#d8a830' }]),
  D(15, 'shatters', 'The Shatters', 'SH', 'shatters', [['Shattered Knight', H('helm', 'blade', '#7a7a8a'), { a: '#2a2a3a', b: '#5a5a7a', c: '#8a4aff' }], ['Stone Mage', H('hood', 'staff', '#8a8a9a'), { a: '#3a3448', b: '#6a6080', c: '#5de0ff' }], ['Twilight Wraith', ['ghost'], { a: '#4a2a7a', b: '#a07ad8', c: '#ff6ad8' }]],
    ['The Forgotten King', ['lich'], { a: '#1a1030', b: '#d8c8a0', c: '#b07aff' }]),
];
export const TIERS = Math.max(...DUNGEONS.map((d) => d.tier));
export const STAGES_PER_ZONE = 10;
export const MAIN_ZONES = REALM.length;
export const STAGE_COUNT = MAIN_ZONES * STAGES_PER_ZONE; // the Realm's stages; dungeon stages come after
// every zone, Realm first, with where its stages start
export const ZONES = [...REALM.map((z) => ({ ...z, len: STAGES_PER_ZONE })), ...DUNGEONS];
let at = 0;
for (const Z of ZONES) { Z.start = at; at += Z.len; }
export const ZONE_BY_ID = Object.fromEntries(ZONES.map((Z) => [Z.id, Z]));
export const zoneIndex = (s) => { let i = ZONES.length - 1; while (i > 0 && ZONES[i].start > s) i--; return i; };
export const zoneOf = (s) => ZONES[zoneIndex(Math.max(0, s))];
export const isDungeon = (s) => !!zoneOf(s).dungeon;
export const localStage = (s) => s - zoneOf(s).start;
export const isBoss = (s) => localStage(s) === zoneOf(s).len - 1;
/** How hard a stage is, counted in Realm stages: a dungeon's stages start at its `lvl`. */
export const levelOf = (s) => (isDungeon(s) ? zoneOf(s).lvl + localStage(s) : s);
export const stageLabel = (s) => { const Z = zoneOf(s); return `${Z.tag || zoneIndex(s) + 1}-${localStage(s) + 1}`; };
const roman = (n) => { let out = ''; for (const [v, s] of [[50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']]) while (n >= v) { out += s; n -= v; } return out; };
export const ROMAN = Array.from({ length: 80 }, (_, i) => roman(i + 1));
export const realmName = (r) => `Realm ${ROMAN[r] || r + 1}`;
