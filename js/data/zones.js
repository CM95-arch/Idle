// The Realm, from the Sunken Shore to the Usurper's Spire (ten stages per zone, the tenth a boss), then the dungeons.
// Enemies are [name, art, palette]: art is an archetype from ui/art/monsters.js plus options; `pal` colors it.
const REALM = [
  { id: 'beach', name: 'Sunken Shore', bg: ['#f2d79a', '#e0b86a', '#3fb6c8'], ground: '#e9cf8c', deco: ['rock', 'grass'],
    enemies: [['Pirate', ['humanoid', { hat: 'bandana', weapon: 'blade', skin: '#b88a6a' }], { a: '#2c4a78', b: '#a02a2a', c: '#ffd34d' }], ['Giant Crab', ['crab'], { a: '#b8402c', b: '#e07050', c: '#ffe08a' }], ['Sand Slime', ['slime'], { a: '#c8a04a', b: '#f0d890', c: '#2a1a0a' }]],
    boss: ['Kraken King', ['kraken'], { a: '#6a2a5a', b: '#c070a0', c: '#ffe08a' }] },
  { id: 'lowlands', name: 'Greenvale', bg: ['#8fce6a', '#5fa84a', '#3a7a3a'], ground: '#7fbf5a', deco: ['tree', 'grass'],
    enemies: [['Halfling Hexer', ['humanoid', { hat: 'hood', weapon: 'staff', skin: '#c9a080' }], { a: '#5a4a2a', b: '#a08050', c: '#5de0ff' }], ['Goblin', ['humanoid', { hat: 'horns', weapon: 'blade', skin: '#6a8a3a' }], { a: '#4a3a2a', b: '#7a5a3a', c: '#ff4040' }], ['Viper', ['serpent'], { a: '#4a6a24', b: '#c6c96a', c: '#ffde3d' }]],
    boss: ['Dwarf Warlord', ['humanoid', { hat: 'crown', weapon: 'axe', skin: '#c08a6a', big: true, beard: true }], { a: '#6a3a24', b: '#c09040', c: '#ffd34d' }] },
  { id: 'midlands', name: 'Thornwood', bg: ['#6aa05a', '#4a7a4a', '#2a4a3a'], ground: '#5a8a4a', deco: ['tree', 'rock'],
    enemies: [['Orc Warrior', ['humanoid', { hat: 'helm', weapon: 'axe', skin: '#5a7a3a' }], { a: '#3a3a2a', b: '#6a6a4a', c: '#ff5a3a' }], ['Dark Elf', ['humanoid', { hat: 'hood', weapon: 'spear', skin: '#8a7aa0' }], { a: '#2a2240', b: '#5a4a7a', c: '#ff40ff' }], ['Skeleton', ['skeleton'], { a: '#d8d2bc', b: '#f0ead8', c: '#ff4040' }]],
    boss: ['Lich', ['lich'], { a: '#2a1a40', b: '#d8d2c0', c: '#40ffe0' }] },
  { id: 'highlands', name: 'Stormcrag Peaks', bg: ['#8a9aa0', '#5a6a70', '#2a3a40'], ground: '#7a8a8a', deco: ['rock', 'ruin'],
    enemies: [['Ogre', ['humanoid', { hat: 'none', weapon: 'axe', skin: '#9a8a5a', big: true }], { a: '#5a4a30', b: '#8a7050', c: '#ff8040' }], ['Stone Golem', ['golem'], { a: '#7a7a7a', b: '#a0a0a0', c: '#ffb040' }], ['Wraith', ['ghost'], { a: '#8a8ab0', b: '#d0d0f0', c: '#40ffe0' }]],
    boss: ['Elder Treant', ['golem', { tree: true, big: true }], { a: '#4a3a24', b: '#4a7a2a', c: '#a0ff60' }] },
  { id: 'godlands', name: 'Starfall Expanse', bg: ['#5a4a7a', '#3a2a5a', '#1a1030'], ground: '#4a3a6a', deco: ['crystal', 'ruin'],
    enemies: [['Medusa', ['serpent', { hood: true }], { a: '#2a6a5a', b: '#d0b060', c: '#ffde3d' }], ['Gazer', ['beholder'], { a: '#6a2a4a', b: '#d060a0', c: '#ff4040' }], ['Mind Leech', ['slime'], { a: '#b0608a', b: '#ffa0d0', c: '#ffffff' }]],
    boss: ['Sandsworn Sphinx', ['sphinx'], { a: '#b08a3a', b: '#d8b070', c: '#d0a030' }] },
  { id: 'approach', name: 'Spire Approach', bg: ['#5a4a4a', '#3a2a2a', '#1a1010'], ground: '#4a3a3a', deco: ['pillar', 'flame'],
    enemies: [['Spire Sentinel', ['humanoid', { hat: 'helm', weapon: 'spear', skin: '#a08070' }], { a: '#2a2036', b: '#6a4a8a', c: '#ffd34d' }], ['Stone Gargoyle', ['demon'], { a: '#6a6a70', b: '#4a4a52', c: '#ff4040' }], ['Scarab', ['insect'], { a: '#3a4a2a', b: '#6a7a3a', c: '#ffde3d' }]],
    boss: ['The Gatewarden', ['golem', { big: true, crown: true }], { a: '#8a8a92', b: '#b0b0b8', c: '#40a0ff' }] },
  { id: 'castle', name: 'The Usurper’s Spire', bg: ['#3a2a4a', '#2a1a3a', '#100818'], ground: '#2a1d3a', deco: ['pillar', 'flame'],
    enemies: [['Usurper’s Henchman', ['humanoid', { hat: 'horns', weapon: 'blade', skin: '#8a6a7a' }], { a: '#4a0a1a', b: '#8a1a2a', c: '#ffd34d' }], ['Royal Golem', ['golem', { crown: true }], { a: '#4a3a6a', b: '#8a6ab0', c: '#ffd34d' }], ['Spire Thrall', ['demon'], { a: '#2a1a3a', b: '#4a2a5a', c: '#ff40ff' }]],
    boss: ['Vexis the Usurper', ['oryx'], { a: '#3a2a4a', b: '#4a1a2a', c: '#d8a830' }] },
];
// ---- dungeons: beating Vexis in Realm N unlocks tier N for good. Each is a short farmable zone of five stages
// ending in its boss, who guards that dungeon's gear. `lvl` is how hard its first stage is, in Realm
// stages (Vexis is 69), and `arena` picks its battlefield from ui/art/arena.js.
const H = (hat, weapon, skin, x = {}) => ['humanoid', { hat, weapon, skin, ...x }];
const D = (tier, id, name, tag, arena, enemies, boss) => ({ id, name, tag, tier, arena, dungeon: true, len: 5, lvl: 66 + Math.round(tier * 1.25), enemies, boss });
export const DUNGEONS = [
  D(1, 'spiderden', 'Webwood Hollow', 'WH', 'cave', [['Black Widow', ['insect'], { a: '#1a1418', b: '#3a2a30', c: '#ff3030' }], ['Spider Hatchling', ['insect'], { a: '#5a4a3a', b: '#8a6a50', c: '#ffde3d' }], ['Egg Sac', ['slime'], { a: '#d8d0c0', b: '#f4eee0', c: '#2a1a0a' }]],
    ['Silkmother Veyra', ['insect'], { a: '#2a1030', b: '#6a2a7a', c: '#ff4040' }]),
  D(1, 'snakepit', 'Serpent’s Coil', 'SC', 'cave', [['Coil Guard', H('helm', 'spear', '#7a9a5a'), { a: '#2a4a2a', b: '#6a8a3a', c: '#ffde3d' }], ['Pit Snake', ['serpent'], { a: '#4a6a24', b: '#c6c96a', c: '#ffde3d' }], ['Pit Viper', ['serpent'], { a: '#6a2a24', b: '#c08a5a', c: '#ff4040' }]],
    ['Ssaresh the Coiled Queen', ['serpent', { hood: true }], { a: '#2a6a5a', b: '#d0b060', c: '#ff5a5a' }]),
  D(2, 'sprite', 'Glimmerglade', 'GG', 'sprite', [['Nature Sprite', ['ghost'], { a: '#5ad08a', b: '#c0ffd8', c: '#ffffff' }], ['Sprite Imp', ['demon'], { a: '#3a8a5a', b: '#7ae0a0', c: '#ffde3d' }], ['Glimmerling', ['slime'], { a: '#7ae0c0', b: '#d0fff0', c: '#2a5a4a' }]],
    ['Lumi the Glade Mother', ['ghost'], { a: '#5ae0ff', b: '#e0ffff', c: '#ffffff' }]),
  D(2, 'udl', 'The Bonecrypt', 'BC', 'crypt', [['Crypt Skeleton', ['skeleton'], { a: '#d8d2bc', b: '#f0ead8', c: '#7affd8' }], ['Crypt Ghost', ['ghost'], { a: '#8aa0b0', b: '#d0e0f0', c: '#7affd8' }], ['Crypt Mummy', H('hood', 'blade', '#c8c0a8'), { a: '#a89a7a', b: '#d8ccb0', c: '#7affd8' }]],
    ['Morvane the Grave Lord', ['lich'], { a: '#1a2a2a', b: '#d8e0d0', c: '#5affc8' }]),
  D(3, 'docks', 'Brinewreck Harbor', 'BH', 'docks', [['Brinewreck Sailor', H('bandana', 'blade', '#9ab0a8'), { a: '#2a3a4a', b: '#4a6a7a', c: '#7affd8' }], ['Bottled Spirit', ['ghost'], { a: '#5a8aa0', b: '#b0e0f0', c: '#7affd8' }], ['Harbor Crab', ['crab'], { a: '#3a6a6a', b: '#6aa0a0', c: '#7affd8' }]],
    ['Captain Saltmarrow', H('bandana', 'blade', '#9ab0a8', { big: true, beard: true }), { a: '#1a2a3a', b: '#3a6a7a', c: '#7affd8' }]),
  D(3, 'abyss', 'The Ashen Pit', 'AP', 'abyss', [['Imp', ['demon'], { a: '#8a1a1a', b: '#c03a2a', c: '#ffde3d' }], ['Demon Warrior', H('horns', 'axe', '#a03a2a'), { a: '#3a0a0a', b: '#7a1a1a', c: '#ffb040' }], ['Pit Brute', ['golem'], { a: '#5a1a1a', b: '#8a2a2a', c: '#ff6a2a' }]],
    ['Archfiend Korzul', ['demon', { crown: true }], { a: '#6a0a1a', b: '#b02a2a', c: '#ffde3d' }]),
  D(3, 'woodland', 'The Mossmaze', 'MM', 'lowlands', [['Giant Larva', ['slime'], { a: '#8ac04a', b: '#d8f0a0', c: '#2a3a0a' }], ['Dusk Moth', ['insect'], { a: '#8a6a3a', b: '#d8b070', c: '#ffde3d' }], ['Feral Squirrel', H('none', 'blade', '#a07a50'), { a: '#6a4a2a', b: '#a07a4a', c: '#ffde3d' }]],
    ['The Moth Matriarch', ['insect'], { a: '#5a3a1a', b: '#c09050', c: '#ff8a3a' }]),
  D(4, 'madlab', 'The Alchemy Works', 'AW', 'lab', [['Escaped Experiment', ['slime'], { a: '#8a4ab0', b: '#d0a0f0', c: '#2a0a3a' }], ['Brass Golem', ['golem'], { a: '#5a6a7a', b: '#8aa0b0', c: '#7aff8a' }], ['Clockwork Eye', ['beholder'], { a: '#6a7a8a', b: '#a0b0c0', c: '#7aff8a' }]],
    ['Doctor Grimsby', H('helm', 'staff', '#d8d0c8', { big: true }), { a: '#e8e8f0', b: '#a0b0c0', c: '#7aff8a' }]),
  D(4, 'cemetery', 'Gravemoor', 'GM', 'crypt', [['Zombie', H('none', 'axe', '#7a9a6a'), { a: '#3a3a2a', b: '#5a5a40', c: '#ff4040' }], ['Restless Ghost', ['ghost'], { a: '#8a8ab0', b: '#d0d0f0', c: '#ff6a6a' }], ['Grave Skeleton', ['skeleton'], { a: '#c8c0a8', b: '#e8e0c8', c: '#ff4040' }]],
    ['The Gravemoor Wraith', ['ghost'], { a: '#5a6a8a', b: '#c0d0f0', c: '#ff4040' }]),
  D(5, 'manor', 'Crimson Manor', 'CM', 'crypt', [['Vampire Bat', ['demon'], { a: '#2a1a2a', b: '#4a2a3a', c: '#ff2a3a' }], ['Vampire Servant', H('hood', 'blade', '#d8c8c0'), { a: '#4a0a1a', b: '#8a1a2a', c: '#ff2a3a' }], ['Haunted Armor', H('helm', 'spear', '#8a8a90'), { a: '#3a3a4a', b: '#6a6a7a', c: '#ff2a3a' }]],
    ['Count Vasilrei', H('crown', 'blade', '#e0d4d0', { big: true }), { a: '#2a0a14', b: '#8a1a2a', c: '#ff2a3a' }]),
  D(5, 'sewers', 'The Sludgeways', 'SL', 'sewer', [['Sewer Rat', ['crab'], { a: '#6a5a4a', b: '#a08a70', c: '#ff4040' }], ['Toxic Slime', ['slime'], { a: '#6aa03a', b: '#c0f07a', c: '#1a2a0a' }], ['Sewer Bat', ['demon'], { a: '#3a3a2a', b: '#5a5a3a', c: '#c0ff4a' }]],
    ['Glorb the Sludge King', ['slime'], { a: '#5a8a2a', b: '#b0e06a', c: '#1a2a0a' }]),
  D(5, 'library', 'The Forbidden Archive', 'FA', 'crypt', [['Cursed Tome', ['golem'], { a: '#6a3a1a', b: '#a06a3a', c: '#7affd8' }], ['Library Spirit', ['ghost'], { a: '#6a8aa0', b: '#c0e0f0', c: '#7affd8' }], ['Mad Scholar', H('hood', 'staff', '#c8a888'), { a: '#3a2a4a', b: '#6a5a8a', c: '#7affd8' }]],
    ['The Ink-Bound Archivist', ['lich'], { a: '#2a1a3a', b: '#d8d0c0', c: '#7affd8' }]),
  D(6, 'icecave', 'Frostfang Grotto', 'FG', 'ice', [['Ice Golem', ['golem'], { a: '#a0c8e0', b: '#e0f4ff', c: '#3a8aff' }], ['Snow Bat', ['demon'], { a: '#8aa0c0', b: '#d0e0f0', c: '#3a8aff' }], ['Frost Sprite', ['ghost'], { a: '#a0d8f0', b: '#ffffff', c: '#3a8aff' }]],
    ['Hrimvald the Frozen', ['lich'], { a: '#3a5a7a', b: '#e0f0ff', c: '#5ad0ff' }]),
  D(6, 'davy', 'The Drowned Hold', 'DH', 'trench', [['Ghost Sailor', ['ghost'], { a: '#3a6a6a', b: '#8ad0c0', c: '#d0ff7a' }], ['Drowned Pirate', H('bandana', 'blade', '#8ab0a0'), { a: '#1a3a3a', b: '#2a5a5a', c: '#d0ff7a' }], ['Phantom Crab', ['crab'], { a: '#2a5a5a', b: '#6aa0a0', c: '#d0ff7a' }]],
    ['The Drowned Captain', H('bandana', 'blade', '#7aa090', { big: true, beard: true }), { a: '#0a2a2a', b: '#2a5a4a', c: '#d0ff7a' }]),
  D(7, 'tomb', 'Sunscorch Tomb', 'ST', 'tomb', [['Scarab', ['insect'], { a: '#2a4a5a', b: '#4a8aa0', c: '#ffde3d' }], ['Tomb Mummy', H('hood', 'spear', '#d8ccb0'), { a: '#c8b890', b: '#e8dcc0', c: '#5de0ff' }], ['Tomb Guardian', ['golem'], { a: '#b08a3a', b: '#d8b070', c: '#5de0ff' }]],
    ['The Three Sun Kings', ['golem', { big: true, crown: true }], { a: '#c09a3a', b: '#e8c870', c: '#5de0ff' }]),
  D(8, 'trench', 'The Abyssal Reef', 'AR', 'trench', [['Reef Warrior', H('helm', 'spear', '#5a9ab0'), { a: '#1a4a6a', b: '#2a7a9a', c: '#ffde3d' }], ['Pink Jellyfish', ['ghost'], { a: '#e07ab0', b: '#ffc0e0', c: '#ffffff' }], ['Deep Slime', ['slime'], { a: '#2a6aa0', b: '#7ac0e0', c: '#0a1a2a' }]],
    ['Nerissa of the Deep', ['serpent', { hood: true }], { a: '#2a8a9a', b: '#ff8aa0', c: '#ffe08a' }]),
  D(9, 'crystal', 'Prismhollow', 'PH', 'cave', [['Crystal Worm', ['serpent'], { a: '#8a5ad0', b: '#d0a0ff', c: '#ffffff' }], ['Crystal Golem', ['golem'], { a: '#7a5ac0', b: '#c0a0ff', c: '#ffffff' }], ['Shard Eye', ['beholder'], { a: '#9a6ad8', b: '#e0c0ff', c: '#ff6ad8' }]],
    ['The Prism Tyrant', ['golem', { big: true, crown: true }], { a: '#8a6ad8', b: '#e0d0ff', c: '#ff6ad8' }]),
  D(9, 'temple', 'Jade Monastery', 'JM', 'temple', [['Temple Monk', H('hood', 'staff', '#c8a080'), { a: '#2a5a3a', b: '#4a8a5a', c: '#ffde3d' }], ['Jade Statue', ['golem'], { a: '#3a8a6a', b: '#7ad0a0', c: '#ffde3d' }], ['Stone Dragon', ['serpent'], { a: '#5a7a6a', b: '#a0c0a8', c: '#ff8a3a' }]],
    ['The Fallen Abbot', H('helm', 'blade', '#c8a080', { big: true }), { a: '#1a3a2a', b: '#3a7a5a', c: '#ffde3d' }]),
  D(10, 'draconis', 'Dragonspire Roost', 'DR', 'abyss', [['Dragon Whelp', ['serpent'], { a: '#8a2a1a', b: '#e07a3a', c: '#ffde3d' }], ['Roost Guard', H('helm', 'spear', '#c08a6a'), { a: '#5a1a1a', b: '#a03a2a', c: '#ffde3d' }], ['Dragon Egg', ['slime'], { a: '#d0a040', b: '#ffe08a', c: '#3a1a0a' }]],
    ['Viridax the Green Wyrm', ['serpent', { hood: true }], { a: '#2a7a3a', b: '#8ae07a', c: '#ffde3d' }]),
  D(10, 'parasite', 'The Fleshwarrens', 'FW', 'sewer', [['Parasite', ['insect'], { a: '#8a1a3a', b: '#e05a7a', c: '#ffde3d' }], ['Flesh Blob', ['slime'], { a: '#c05a6a', b: '#ffa0b0', c: '#3a0a14' }], ['Host', H('hood', 'blade', '#d0b0b0'), { a: '#5a1a2a', b: '#a03a4a', c: '#ff6a8a' }]],
    ['The Hive Heart', ['beholder'], { a: '#7a1a3a', b: '#e05a8a', c: '#ffde3d' }]),
  D(11, 'shaitan', 'Cinderforge', 'CF', 'abyss', [['Fire Imp', ['demon'], { a: '#c04a1a', b: '#ff8a3a', c: '#ffde3d' }], ['Magma Golem', ['golem'], { a: '#3a1a1a', b: '#6a2a1a', c: '#ff6a1a' }], ['Flame Spirit', ['ghost'], { a: '#ff7a2a', b: '#ffd08a', c: '#ffffff' }]],
    ['Ignaroth the Forgemaster', ['demon', { crown: true }], { a: '#7a1a0a', b: '#e05a1a', c: '#ffde3d' }]),
  D(11, 'puppet', 'The Marionette Stage', 'MS', 'castle', [['Knight Puppet', H('helm', 'blade', '#d8c0a0'), { a: '#3a2a4a', b: '#7a5a9a', c: '#ffde3d' }], ['Archer Puppet', H('hood', 'spear', '#d8c0a0'), { a: '#2a4a2a', b: '#5a8a5a', c: '#ffde3d' }], ['Priest Puppet', H('hood', 'staff', '#d8c0a0'), { a: '#d8d0c0', b: '#f0e8d8', c: '#ffde3d' }]],
    ['The Stringmaster', H('crown', 'staff', '#e8d8c8', { big: true }), { a: '#4a0a2a', b: '#a02a5a', c: '#ffde3d' }]),
  D(11, 'kogbold', 'Cogsmoke Foundry', 'FD', 'lab', [['Gearling', H('helm', 'axe', '#6a8a3a'), { a: '#5a3a1a', b: '#a06a2a', c: '#ffb040' }], ['Steam Golem', ['golem'], { a: '#8a6a3a', b: '#c0a060', c: '#ffb040' }], ['Gear Bot', ['beholder'], { a: '#8a6a3a', b: '#d0b070', c: '#ffb040' }]],
    ['The Iron Overseer', ['golem', { big: true, crown: true }], { a: '#a07a3a', b: '#e0c080', c: '#ff6a2a' }]),
  D(12, 'thicket', 'The Overgrown Ruins', 'OR', 'sprite', [['Masked Warrior', H('horns', 'spear', '#a07a50'), { a: '#2a5a2a', b: '#6a9a3a', c: '#ff4040' }], ['Jungle Snake', ['serpent'], { a: '#3a7a2a', b: '#a0d06a', c: '#ff4040' }], ['Totem', ['golem'], { a: '#6a4a2a', b: '#a07a4a', c: '#5affc8' }]],
    ['Tlaxu the Masked Serpent', ['serpent', { hood: true }], { a: '#2a8a6a', b: '#f0d06a', c: '#ff4040' }]),
  D(12, 'garden', 'Nightshade Garden', 'NG', 'sprite', [['Thorn Vine', ['serpent'], { a: '#3a6a2a', b: '#8ac05a', c: '#ff6ad8' }], ['Blooming Golem', ['golem', { tree: true }], { a: '#5a3a2a', b: '#ff8ac8', c: '#ff6ad8' }], ['Garden Bee', ['insect'], { a: '#d0a020', b: '#ffe06a', c: '#1a1a0a' }]],
    ['The Nightshade Queen', ['golem', { tree: true, big: true }], { a: '#4a2a3a', b: '#ff6ab0', c: '#ffde3d' }]),
  D(13, 'sanctuary', 'The Usurper’s Sanctum', 'US', 'castle', [['Usurper’s Henchman', H('horns', 'blade', '#8a6a7a'), { a: '#4a0a1a', b: '#8a1a2a', c: '#ffd34d' }], ['Sanctum Guard', ['golem', { crown: true }], { a: '#4a3a6a', b: '#8a6ab0', c: '#ffd34d' }], ['Spire Thrall', ['demon'], { a: '#2a1a3a', b: '#4a2a5a', c: '#ff40ff' }]],
    ['Vexis Ascendant', ['oryx'], { a: '#3a2a4a', b: '#6a1a2a', c: '#ffe070' }]),
  D(14, 'halls', 'Halls of the Forsaken', 'HF', 'halls', [['Forsaken Sentry', ['golem'], { a: '#b8b2c4', b: '#e8e4f0', c: '#7ad0ff' }], ['Cultist', H('hood', 'staff', '#c8a0a0'), { a: '#5a0a1a', b: '#a02030', c: '#ff4040' }], ['Void Mite', ['insect'], { a: '#1a1030', b: '#4a2a7a', c: '#b07aff' }]],
    ['The Alabaster Colossus', ['golem', { big: true, crown: true }], { a: '#d8d2e0', b: '#f4f0fa', c: '#d8a830' }]),
  D(15, 'shatters', 'The Fractured Keep', 'FK', 'shatters', [['Fractured Knight', H('helm', 'blade', '#7a7a8a'), { a: '#2a2a3a', b: '#5a5a7a', c: '#8a4aff' }], ['Stone Mage', H('hood', 'staff', '#8a8a9a'), { a: '#3a3448', b: '#6a6080', c: '#5de0ff' }], ['Twilight Wraith', ['ghost'], { a: '#4a2a7a', b: '#a07ad8', c: '#ff6ad8' }]],
    ['The Last Monarch', ['lich'], { a: '#1a1030', b: '#d8c8a0', c: '#b07aff' }]),
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
