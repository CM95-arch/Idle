// The Realm, from the beaches to Oryx, then the optional endgame dungeons. Ten stages per zone; the tenth is a boss.
// Enemies are [name, art, palette]: art is an archetype from ui/art/monsters.js plus options; `pal` colors it.
export const ZONES = [
  { id: 'beach', name: 'Beaches', bg: ['#f2d79a', '#e0b86a', '#3fb6c8'], ground: '#e9cf8c', deco: ['rock', 'grass'],
    enemies: [['Pirate', ['humanoid', { hat: 'bandana', weapon: 'blade', skin: '#b88a6a' }], { a: '#2c4a78', b: '#a02a2a', c: '#ffd34d' }], ['Giant Crab', ['crab'], { a: '#b8402c', b: '#e07050', c: '#ffe08a' }], ['Sand Slime', ['slime'], { a: '#c8a04a', b: '#f0d890', c: '#2a1a0a' }]],
    boss: ['Kraken King', ['kraken'], { a: '#6a2a5a', b: '#c070a0', c: '#ffe08a' }] },
  { id: 'lowlands', name: 'Lowlands', bg: ['#8fce6a', '#5fa84a', '#3a7a3a'], ground: '#7fbf5a', deco: ['tree', 'grass'],
    enemies: [['Hobbit Mage', ['humanoid', { hat: 'hood', weapon: 'staff', skin: '#c9a080' }], { a: '#5a4a2a', b: '#a08050', c: '#5de0ff' }], ['Goblin', ['humanoid', { hat: 'horns', weapon: 'blade', skin: '#6a8a3a' }], { a: '#4a3a2a', b: '#7a5a3a', c: '#ff4040' }], ['Viper', ['serpent'], { a: '#4a6a24', b: '#c6c96a', c: '#ffde3d' }]],
    boss: ['Dwarf King', ['humanoid', { hat: 'crown', weapon: 'axe', skin: '#c08a6a', big: true }], { a: '#6a3a24', b: '#c09040', c: '#ffd34d' }] },
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
    boss: ['Stone Guardian', ['golem', { big: true, crown: true }], { a: '#8a8a92', b: '#b0b0b8', c: '#40a0ff' }] },
  { id: 'castle', name: 'Oryx’s Castle', bg: ['#3a2a4a', '#2a1a3a', '#100818'], ground: '#2a1d3a', deco: ['pillar', 'flame'],
    enemies: [['Henchman of Oryx', ['humanoid', { hat: 'horns', weapon: 'blade', skin: '#8a6a7a' }], { a: '#4a0a1a', b: '#8a1a2a', c: '#ffd34d' }], ['Royal Golem', ['golem', { crown: true }], { a: '#4a3a6a', b: '#8a6ab0', c: '#ffd34d' }], ['Mad God Servant', ['demon'], { a: '#2a1a3a', b: '#4a2a5a', c: '#ff40ff' }]],
    boss: ['Oryx the Mad God', ['oryx'], { a: '#3a2a4a', b: '#4a1a2a', c: '#d8a830' }] },
  // ---- optional endgame dungeons, after Oryx and before Ascending: far harder, with their own Uniques ----
  { id: 'halls', name: 'Lost Halls', tag: 'LH', endgame: true, bg: ['#8a8496', '#4a4458', '#1a1830'], ground: '#6e6878', deco: ['pillar', 'flame'],
    enemies: [['Lost Sentry', ['golem'], { a: '#b8b2c4', b: '#e8e4f0', c: '#7ad0ff' }], ['Cultist', ['humanoid', { hat: 'hood', weapon: 'staff', skin: '#c8a0a0' }], { a: '#5a0a1a', b: '#a02030', c: '#ff4040' }], ['Void Pest', ['insect'], { a: '#1a1030', b: '#4a2a7a', c: '#b07aff' }]],
    boss: ['Marble Colossus', ['golem', { big: true, crown: true }], { a: '#d8d2e0', b: '#f4f0fa', c: '#d8a830' }] },
  { id: 'shatters', name: 'The Shatters', tag: 'SH', endgame: true, bg: ['#3a3448', '#22202a', '#0a0614'], ground: '#1c1a24', deco: ['ruin', 'crystal'],
    enemies: [['Shattered Knight', ['humanoid', { hat: 'helm', weapon: 'blade', skin: '#7a7a8a' }], { a: '#2a2a3a', b: '#5a5a7a', c: '#8a4aff' }], ['Stone Mage', ['humanoid', { hat: 'hood', weapon: 'staff', skin: '#8a8a9a' }], { a: '#3a3448', b: '#6a6080', c: '#5de0ff' }], ['Twilight Wraith', ['ghost'], { a: '#4a2a7a', b: '#a07ad8', c: '#ff6ad8' }]],
    boss: ['The Forgotten King', ['lich'], { a: '#1a1030', b: '#d8c8a0', c: '#b07aff' }] },
];
export const STAGES_PER_ZONE = 10;
/** The Realm proper ends with Oryx; the zones after it are the optional endgame. */
export const MAIN_ZONES = ZONES.findIndex((z) => z.endgame);
export const STAGE_COUNT = MAIN_ZONES * STAGES_PER_ZONE;
export const END_STAGE = ZONES.length * STAGES_PER_ZONE - 1;
export const isEndgame = (s) => s >= STAGE_COUNT;
export const zoneOf = (s) => ZONES[Math.min(ZONES.length - 1, Math.floor(s / STAGES_PER_ZONE))];
export const isBoss = (s) => s % STAGES_PER_ZONE === STAGES_PER_ZONE - 1;
export const stageLabel = (s) => `${zoneOf(s).tag || Math.floor(s / STAGES_PER_ZONE) + 1}-${(s % STAGES_PER_ZONE) + 1}`;
export const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII', 'XIII', 'XIV', 'XV'];
export const realmName = (r) => `Realm ${ROMAN[r] || r + 1}`;
