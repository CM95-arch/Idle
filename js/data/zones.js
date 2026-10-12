// The Realm, from the beaches to Oryx. Ten stages per zone; the tenth is a boss.
// Enemy looks use the sprite maps in ui/sprites.js; `pal` colors them, `bg` paints the zone.
export const ZONES = [
  { id: 'beach', name: 'Beaches', bg: ['#f2d79a', '#e0b86a', '#3fb6c8'], ground: '#e9cf8c', deco: ['rock', 'grass'],
    enemies: [['Pirate', 'humanoid', { a: '#3a6ab0', b: '#f0d0a0', c: '#ffd34d' }], ['Crab', 'beast', { a: '#d8503a', b: '#ff9070', c: '#ffffff' }], ['Sand Slime', 'blob', { a: '#d8b860', b: '#f8e0a0', c: '#ffffff' }]],
    boss: ['Kraken King', 'eye', { a: '#a03a5a', b: '#e07090', c: '#ffe08a' }] },
  { id: 'lowlands', name: 'Lowlands', bg: ['#8fce6a', '#5fa84a', '#3a7a3a'], ground: '#7fbf5a', deco: ['tree', 'grass'],
    enemies: [['Hobbit Mage', 'humanoid', { a: '#7a5a2a', b: '#c0a070', c: '#5de0ff' }], ['Goblin', 'beast', { a: '#4a8a3a', b: '#8ad070', c: '#ff4040' }], ['Snake', 'snake', { a: '#6a8a2a', b: '#c6d96a', c: '#ffde3d' }]],
    boss: ['Dwarf King', 'golem', { a: '#8a5a3a', b: '#d0a070', c: '#ffd34d' }] },
  { id: 'midlands', name: 'Midlands', bg: ['#6aa05a', '#4a7a4a', '#2a4a3a'], ground: '#5a8a4a', deco: ['tree', 'rock'],
    enemies: [['Orc Warrior', 'humanoid', { a: '#4a6a2a', b: '#8aa05a', c: '#c0c0c0' }], ['Dark Elf', 'humanoid', { a: '#3a2a4a', b: '#7a6a9a', c: '#ff40ff' }], ['Skeleton', 'skeleton', { a: '#d0d0c0', b: '#f0f0e0', c: '#ff4040' }]],
    boss: ['Lich', 'lich', { a: '#4a2a6a', b: '#d0d0f0', c: '#40ffe0' }] },
  { id: 'highlands', name: 'Highlands', bg: ['#8a9aa0', '#5a6a70', '#2a3a40'], ground: '#7a8a8a', deco: ['rock', 'ruin'],
    enemies: [['Ogre', 'golem', { a: '#7a6a4a', b: '#b0a070', c: '#ff8040' }], ['Werewolf', 'beast', { a: '#5a4a3a', b: '#9a8a7a', c: '#ffde3d' }], ['Ghost', 'ghost', { a: '#8a8ab0', b: '#d0d0f0', c: '#40ffe0' }]],
    boss: ['Ent Ancient', 'golem', { a: '#3a5a2a', b: '#6a8a4a', c: '#a0ff60' }] },
  { id: 'godlands', name: 'Godlands', bg: ['#5a4a7a', '#3a2a5a', '#1a1030'], ground: '#4a3a6a', deco: ['crystal', 'ruin'],
    enemies: [['Medusa', 'snake', { a: '#3a8a6a', b: '#7ad0a0', c: '#ffde3d' }], ['Beholder', 'eye', { a: '#7a2a5a', b: '#d060a0', c: '#ffffff' }], ['Flying Brain', 'blob', { a: '#d070b0', b: '#ffa0e0', c: '#ffffff' }]],
    boss: ['Grand Sphinx', 'demon', { a: '#c0a040', b: '#f0d070', c: '#40a0ff' }] },
  { id: 'approach', name: 'Castle Approaches', bg: ['#5a4a4a', '#3a2a2a', '#1a1010'], ground: '#4a3a3a', deco: ['pillar', 'flame'],
    enemies: [['Oryx Guard', 'humanoid', { a: '#3a2a4a', b: '#8a6ab0', c: '#ffd34d' }], ['Stone Gargoyle', 'demon', { a: '#6a6a6a', b: '#a0a0a0', c: '#ff4040' }], ['Insect Swarm', 'bug', { a: '#5a3a1a', b: '#a07040', c: '#ffde3d' }]],
    boss: ['Stone Guardians', 'golem', { a: '#8a8a90', b: '#d0d0d8', c: '#40a0ff' }] },
  { id: 'castle', name: 'Oryx’s Castle', bg: ['#3a2a4a', '#2a1a3a', '#100818'], ground: '#2a1d3a', deco: ['pillar', 'flame'],
    enemies: [['Henchman of Oryx', 'humanoid', { a: '#5a0a1a', b: '#a02a3a', c: '#ffd34d' }], ['Royal Golem', 'golem', { a: '#4a3a6a', b: '#8a6ab0', c: '#ffd34d' }], ['Mad God Servant', 'demon', { a: '#2a1a3a', b: '#6a4a8a', c: '#ff40ff' }]],
    boss: ['Oryx the Mad God', 'dragon', { a: '#3a2a4a', b: '#8a6ab0', c: '#ffd34d' }] },
];
export const STAGES_PER_ZONE = 10;
export const STAGE_COUNT = ZONES.length * STAGES_PER_ZONE;
export const zoneOf = (s) => ZONES[Math.min(ZONES.length - 1, Math.floor(s / STAGES_PER_ZONE))];
export const isBoss = (s) => s % STAGES_PER_ZONE === STAGES_PER_ZONE - 1;
export const stageLabel = (s) => `${Math.floor(s / STAGES_PER_ZONE) + 1}-${(s % STAGES_PER_ZONE) + 1}`;
export const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII', 'XIII', 'XIV', 'XV'];
export const realmName = (r) => `Realm ${ROMAN[r] || r + 1}`;
