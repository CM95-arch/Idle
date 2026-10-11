// Biomes (idle farming) and dungeons. Names are ROTMG placeholders for the test build.
// Enemy strength comes from one curve by "level" L, so biomes and dungeons scale together.

export const ENEMY_CURVE = {
  hp: (L) => 1700 * Math.pow(1.5, L - 1),
  dmg: (L) => 30 * Math.pow(1.095, L - 1),   // per hit, before the player's DEF
  def: (L) => Math.max(0, Math.round(1.6 * (L - 1))),
  rate: 0.75,                                // attacks per second
  xp: (L) => 2 * Math.pow(1.4, L - 1),        // 2 XP per kill in the Forest, ~21 in the Godlands
};

// sprite: enemy art template (see sprites.js). pal: a/b/c/d colors.
const E = (name, sprite, pal, m = {}) => ({ name, sprite, pal, hp: m.hp || 1, dmg: m.dmg || 1, rate: m.rate || 1, weight: m.w || 10 });

export const BIOMES = [
  { id: 'forest', name: 'Forest', L: 0.6, potionRate: 1 / 200, sky: ['#8cc4e0', '#3d7a48'], ground: '#5a9a40', decor: 'tree',
    enemies: [E('Thicket Rat', 'beast', { a: '#7a6a58', b: '#a89880', c: '#e04040' }), E('Green Slime', 'blob', { a: '#3f9a3a', b: '#8fe07a', c: '#1a3a1a' }, { hp: 1.2, dmg: 0.8 }), E('Bandit', 'humanoid', { a: '#6a4a2a', b: '#a07a50', c: '#c9c9c9' }, { dmg: 1.15 }), E('Wild Boar', 'beast', { a: '#5a3a24', b: '#8a6040', c: '#f0e0c0' }, { hp: 1.3 })],
    elite: E('Bandit Leader', 'humanoid', { a: '#8a2a2a', b: '#c05050', c: '#ffd34d' }) },
  { id: 'plains', name: 'Plains', L: 2, potionRate: 1 / 180, sky: ['#a8d4ea', '#7f9e48'], ground: '#9ab858', decor: 'grass',
    enemies: [E('Goblin Grunt', 'humanoid', { a: '#4a7a2a', b: '#8ab050', c: '#a07a50' }), E('Dire Wolf', 'beast', { a: '#5a5a66', b: '#9a9aa6', c: '#ffcc33' }, { dmg: 1.2, hp: 0.9 }), E('Hobgoblin', 'humanoid', { a: '#6a5a2a', b: '#a09050', c: '#c9c9c9' }, { hp: 1.25 }), E('Plains Scorpion', 'bug', { a: '#8a5a2a', b: '#c08a50', c: '#e04040' })],
    elite: E('Goblin Warlord', 'humanoid', { a: '#2a5a1a', b: '#5a9a3a', c: '#ffd34d' }) },
  { id: 'desert', name: 'Desert', L: 3, potionRate: 1 / 160, sky: ['#f0c890', '#c8945a'], ground: '#dcb46c', decor: 'rock',
    enemies: [E('Sand Wraith', 'ghost', { a: '#c0a070', b: '#f0e0b0', c: '#ff7040' }), E('Dune Scorpion', 'bug', { a: '#a07a3a', b: '#e0b870', c: '#3a2a1a' }, { dmg: 1.2 }), E('Desert Nomad', 'humanoid', { a: '#c0904a', b: '#f0d090', c: '#3a5ab0' }), E('Mummy', 'humanoid', { a: '#c8c0a0', b: '#f0ead0', c: '#40ff80' }, { hp: 1.35, dmg: 0.9 })],
    elite: E('Sand Devil', 'demon', { a: '#b07030', b: '#f0b060', c: '#ffef80' }) },
  { id: 'sprite', name: 'Sprite Forest', L: 4, potionRate: 1 / 140, sky: ['#9fd8d0', '#2f7a6a'], ground: '#3f8a5a', decor: 'tree',
    enemies: [E('Forest Wisp', 'wisp', { a: '#5de0ff', b: '#bff3d8', c: '#ffffff', d: '#1d6b5a' }), E('Sprite', 'wisp', { a: '#ff8ae0', b: '#ffd0f4', c: '#ffffff', d: '#7a2a6a' }, { hp: 0.85, dmg: 1.15 }), E('Treant Sapling', 'golem', { a: '#4a6a2a', b: '#7a9a4a', c: '#c0ff60' }, { hp: 1.3 }), E('Moss Golem', 'golem', { a: '#3a5a3a', b: '#6a8a5a', c: '#e0ff90' }, { hp: 1.4, dmg: 0.9 })],
    elite: E('Elder Treant', 'golem', { a: '#2a4a1a', b: '#5a8a3a', c: '#ffd34d' }) },
  { id: 'city', name: 'Abandoned City', L: 4.7, potionRate: 1 / 120, sky: ['#9aa4b0', '#5a6270'], ground: '#6e6e78', decor: 'ruin',
    enemies: [E('Ghoul', 'humanoid', { a: '#5a6a5a', b: '#9aaa9a', c: '#ff4040' }), E('Skeleton Archer', 'skeleton', { a: '#d8d0c0', b: '#ffffff', c: '#ff5040' }, { dmg: 1.2, hp: 0.85 }), E('Cursed Knight', 'humanoid', { a: '#3a3a4a', b: '#7a7a8a', c: '#a040ff' }, { hp: 1.35 }), E('Plague Rat', 'beast', { a: '#4a5a3a', b: '#7a9a5a', c: '#c0ff40' })],
    elite: E('Wraith Lord', 'ghost', { a: '#4a3a6a', b: '#8a7ab0', c: '#ffd34d' }) },
  { id: 'hell', name: 'Hell', L: 6, potionRate: 1 / 80, sky: ['#8a3020', '#4a140c'], ground: '#5e2414', decor: 'flame',
    enemies: [E('Imp', 'demon', { a: '#c03020', b: '#ff7050', c: '#ffef60' }, { hp: 0.85, dmg: 1.15 }), E('Hellhound', 'beast', { a: '#3a1a10', b: '#7a3a20', c: '#ff8020' }, { dmg: 1.2 }), E('Fire Demon', 'demon', { a: '#a02010', b: '#e06030', c: '#ffd040' }), E('Brimstone Golem', 'golem', { a: '#4a2a1a', b: '#8a4a2a', c: '#ff6020' }, { hp: 1.45, dmg: 0.9 })],
    elite: E('Pit Fiend', 'demon', { a: '#600a0a', b: '#b02020', c: '#ffd34d' }) },
  { id: 'abyss', name: 'Abyss', L: 7, potionRate: 1 / 45, sky: ['#3a2a5a', '#1c1034'], ground: '#2e2046', decor: 'crystal',
    enemies: [E('Void Eye', 'eye', { a: '#3a1a5a', b: '#8a5ac0', c: '#ff40a0' }, { hp: 0.9, dmg: 1.15 }), E('Abyssal Horror', 'demon', { a: '#2a1a3a', b: '#5a3a7a', c: '#40ffe0' }, { hp: 1.2 }), E('Shadow Stalker', 'ghost', { a: '#1a1a2a', b: '#4a4a6a', c: '#a080ff' }, { dmg: 1.25, hp: 0.9 }), E('Deep One', 'blob', { a: '#1a3a4a', b: '#3a7a8a', c: '#a0ffe0' }, { hp: 1.35 })],
    elite: E('Elder Horror', 'eye', { a: '#5a0a3a', b: '#a02a7a', c: '#ffd34d' }) },
  { id: 'godlands', name: 'Godlands', L: 8, potionRate: 1 / 20, sky: ['#e8d090', '#8a7040'], ground: '#a89060', decor: 'pillar',
    enemies: [E('Medusa', 'humanoid', { a: '#2a6a4a', b: '#5ab08a', c: '#ffd34d' }), E('Ent Ancient', 'golem', { a: '#3a2a1a', b: '#6a5a3a', c: '#90ff60' }, { hp: 1.4, dmg: 0.9 }), E('Beholder', 'eye', { a: '#6a2a2a', b: '#b05a5a', c: '#ffffff' }, { dmg: 1.2 }), E('Flying Brain', 'blob', { a: '#c070a0', b: '#f0b0d0', c: '#ff3060' }, { hp: 0.9, dmg: 1.15 }), E('Djinn', 'ghost', { a: '#2a4ab0', b: '#6a9aff', c: '#ffd34d' }),
      E('Slime God', 'blob', { a: '#2a8a3a', b: '#7ae07a', c: '#203a20' }, { hp: 1.3, dmg: 0.9 }), E('Sprite God', 'wisp', { a: '#ff8ae0', b: '#ffd0f4', c: '#ffffff', d: '#7a2a6a' }, { hp: 0.9, dmg: 1.15 }),
      E('Leviathan', 'snake', { a: '#1a5a8a', b: '#4aa0d0', c: '#ffd34d' }, { hp: 1.25 }), E('Lich', 'lich', { a: '#3a2a5a', b: '#e8e0cf', c: '#ffd34d' }, { hp: 0.9, dmg: 1.2 }),
      E('Rock Dragon', 'dragon', { a: '#6a5a4a', b: '#9a8a74', c: '#ff6020' }, { hp: 1.35, dmg: 1.05 }), E('White Demon', 'demon', { a: '#d8d8e0', b: '#ffffff', c: '#ff3030' }, { dmg: 1.15 }),
      E('Phoenix', 'dragon', { a: '#c04010', b: '#ffb040', c: '#ffef80' }, { hp: 0.95, dmg: 1.15 }), E('Shade Knight', 'humanoid', { a: '#202030', b: '#505070', c: '#a080ff' }, { hp: 1.1 })],
    elite: E('Ghost God', 'ghost', { a: '#d0d0e0', b: '#ffffff', c: '#ff4040' }),
    // Event bosses: rare, beefy, generous with potions.
    events: [
      { name: 'Cube God', sprite: 'cube', pal: { a: '#3a6ad8', b: '#9ac0ff', c: '#ffffff' } },
      { name: 'Grand Sphinx', sprite: 'golem', pal: { a: '#c8a050', b: '#f0d890', c: '#4060ff' } },
      { name: 'Lord of the Lost Lands', sprite: 'humanoid', pal: { a: '#4a4a5a', b: '#8a8aa0', c: '#ff4040' } },
      { name: 'Hermit God', sprite: 'eye', pal: { a: '#2a6a7a', b: '#6ab0c0', c: '#ffffff' } },
      { name: 'Skull Shrine', sprite: 'skull', pal: { b: '#e8e0cf', c: '#ff6020' } },
    ] },
];
export const BIOME = Object.fromEntries(BIOMES.map((b) => [b.id, b]));
export const EVENT_BOSS = { chance: 1 / 40, hp: 6, dmg: 1.2, xp: 15, potionMult: 10, guaranteedPotions: 1, utChance: 0.01 };
export const ELITE = { chance: 0.06, hp: 2.3, dmg: 1.4, xp: 4 };

// Dungeons in increasing difficulty. Each is an active bullet-hell run (core/arena.js) and the only source of gear.
// tiers: the gear tiers its bags drop. rec: the gear tier it is built for (enemy strength scales from it).
const D = (id, name, L, rooms, potions, sig, boss, bossSprite, pal, uts, extra = {}) =>
  ({ id, name, rooms, potions, sig, boss, bossSprite, pal, uts, ...extra });

export const DUNGEONS = [
  D('snake_pit', 'Snake Pit', 0.7, 3, [0, 1], 'spd', 'Stheno, the Snake Queen', 'snake', { a: '#5c8f2a', b: '#c6d96a', c: '#ffde3d', bg: '#3c4223' }, ['ut_pit_fang', 'ut_coiled_scale', 'ut_viper_eye']),
  D('sprite_world', 'Sprite World', 0.75, 3, [0, 1], 'dex', 'Limon the Sprite God', 'wisp', { a: '#5de0ff', b: '#bff3d8', c: '#ffffff', d: '#1d6b5a', bg: '#1f3a4a' }, ['ut_wild_whimsy', 'ut_flicker_cloak']),
  D('undead_lair', 'Undead Lair', 1.3, 3, [1, 1], 'wis', 'Septavius the Ghost God', 'ghost', { a: '#8a8ab0', b: '#d0d0f0', c: '#40ffe0', bg: '#2a2a3a' }, ['ut_gravewarden', 'ut_lantern_skull']),
  D('abyss_demons', 'Abyss of Demons', 2.3, 4, [1, 1], 'vit', 'Archdemon Malphas', 'demon', { a: '#a02010', b: '#e06030', c: '#ffd040', bg: '#4a1a14' }, ['ut_demonfire', 'ut_molten_helm']),
  D('manor', 'Manor of the Immortals', 2.75, 4, [1, 2], 'att', 'Lord Ruthven', 'humanoid', { a: '#3a0a1a', b: '#8a2a3a', c: '#ffd34d', bg: '#2a1630' }, ['ut_thirst', 'ut_bloodsilk']),
  D('davy', 'Davy Jones’ Locker', 2.95, 4, [1, 2], 'def', 'Davy Jones', 'ghost', { a: '#2a6a7a', b: '#6ab0c0', c: '#ffd34d', bg: '#123040' }, ['ut_drowned_saber', 'ut_ghostship']),
  D('labyrinth', 'Woodland Labyrinth', 4.2, 4, [1, 2], 'dex', 'Murderous Megamoth', 'bug', { a: '#4a6a2a', b: '#8ab050', c: '#ffef80', bg: '#1f3a1a' }, ['ut_thornheart', 'ut_mossback']),
  D('docks', 'Deadwater Docks', 5.8, 4, [1, 2], 'att', 'Jon Bilgewater the Pirate King', 'humanoid', { a: '#2a3a5a', b: '#5a7ab0', c: '#ffd34d', bg: '#14303a' }, ['ut_harpoon', 'ut_tidecaller']),
  D('wetlands', 'Sulfurous Wetlands', 6.5, 4, [1, 2], 'vit', 'Heart of the Wetlands', 'blob', { a: '#6a6a1a', b: '#b0b040', c: '#ff6020', bg: '#3a3a12' }, ['ut_bog_witch', 'ut_swamp_lord']),
  D('trench', 'Ocean Trench', 7.5, 4, [2, 2], 'wis', 'Thessal the Mermaid Goddess', 'humanoid', { a: '#1a5a8a', b: '#4aa0d0', c: '#ffd34d', bg: '#0f2a4a' }, ['ut_coral_seal', 'ut_abyssal_pearl']),
  D('tomb', 'Tomb of the Ancients', 9.0, 4, [2, 2], 'hp', 'The Tomb Triad', 'golem', { a: '#a08030', b: '#e0c060', c: '#40a0ff', bg: '#4a3a14' }, ['ut_sunscorch', 'ut_scarab_plate', 'ut_pharaoh']),
  D('fungal', 'Fungal Cavern', 9.4, 4, [2, 3], 'mp', 'The Mushroom Mother', 'blob', { a: '#8a3a6a', b: '#d070b0', c: '#ffef80', bg: '#2a3a2a' }, ['ut_sporecloud', 'ut_mycelium']),
  D('nest', 'The Nest', 9.85, 4, [2, 3], 'spd', 'Killer Bee Queen', 'bug', { a: '#b08a1a', b: '#f0d040', c: '#1a1a1a', bg: '#4a3010' }, ['ut_stinger', 'ut_honeyglass']),
  D('cultist', 'Cultist Hideout', 10.05, 4, [2, 3], 'att', 'Malus the Cult Leader', 'humanoid', { a: '#5a0a1a', b: '#a02a3a', c: '#ffd34d', bg: '#3a0f1a' }, ['ut_eclipsed', 'ut_shroud']),
  D('crystal', 'Crystal Cavern', 10.45, 4, [2, 3], 'def', 'The Crystal Worm Mother', 'snake', { a: '#6a4ac0', b: '#b090ff', c: '#ffffff', bg: '#2a1f4a' }, ['ut_prism_wand', 'ut_geode_helm']),
  D('lost_halls', 'Lost Halls', 10.75, 4, [3, 4], 'def', 'The Marble Colossus', 'golem', { a: '#c8c8d0', b: '#ffffff', c: '#ff4040', bg: '#2a1a3a' }, ['ut_marble_seal', 'ut_colossus'], { rune: 'rune_sword', slotReward: true }),
  D('void', 'The Void', 11.1, 4, [3, 4], 'mp', 'The Void Entity', 'eye', { a: '#1a0a3a', b: '#5a2a9a', c: '#ff40ff', bg: '#120a1f' }, ['ut_voidcaller', 'ut_nullfield'], { rune: 'rune_shield' }),
  D('shatters', 'The Shatters', 11.6, 4, [3, 4], 'att', 'The Forgotten King', 'humanoid', { a: '#2a3a4a', b: '#6a8aa0', c: '#a0ffff', bg: '#1a1f2a' }, ['ut_starlight', 'ut_kings_edge', 'ut_shattered_crown'], { rune: 'rune_helm' }),
  D('oryx', 'Oryx’s Castle', 12.6, 4, [4, 6], null, 'Oryx the Mad God', 'demon', { a: '#3a2a4a', b: '#8a6ab0', c: '#ffd34d', bg: '#2a1d0c' }, ['ut_mad_wrath', 'ut_oryx_crown', 'ut_mad_ring', 'ut_final_night'], { needsRunes: ['rune_sword', 'rune_shield', 'rune_helm'], final: true }),
];
// XP follows the dungeon's place on the ladder, independent of how its enemy level L was tuned.
const XP_LADDER = [1.2, 1.7, 2.4, 2.9, 3.4, 4, 4.9, 6.5, 7.5, 8.8, 9.5, 10, 10.5, 10.9, 11.4, 11.9, 12.3, 12.7, 13.2];
const TIERS = [[2, 4], [3, 5], [4, 6], [5, 7], [5, 7], [6, 8], [6, 8], [7, 9], [7, 9], [8, 10], [8, 10], [9, 11], [9, 11], [10, 12], [10, 12], [11, 13], [12, 14], [12, 14], [13, 15]];
// UTs that used to drop in biomes now live in dungeons too
const EXTRA_UTS = { snake_pit: ['ut_lucky_coin'], sprite_world: ['ut_warlord_cleaver'], undead_lair: ['ut_nomad_wraps'], abyss_demons: ['ut_pixie_spell'], manor: ['ut_cursed_bulwark'], labyrinth: ['ut_brimstone_bow'], docks: ['ut_abyss_eye'], trench: ['ut_riddle_ring'], tomb: ['ut_cubic_staff'], fungal: ['ut_hermit_shell'], nest: ['ut_shrine_dagger'], crystal: ['ut_lost_plate'] };
DUNGEONS.forEach((d, i) => {
  d.index = i; d.tiers = TIERS[i]; d.rec = Math.max(1, d.tiers[0] - 1);
  d.xp = Math.round(45 * Math.pow(1.5, XP_LADDER[i] - 1));
  d.uts = [...d.uts, ...(EXTRA_UTS[d.id] || [])];
});
export const DUNGEON = Object.fromEntries(DUNGEONS.map((d) => [d.id, d]));

// Room enemies per dungeon: [name, sprite template]
export const DUNGEON_MOBS = {
  snake_pit: [['Pit Snake', 'snake'], ['Pit Viper', 'snake'], ['Snake Charmer', 'humanoid']],
  sprite_world: [['Sprite Child', 'wisp'], ['Native Sprite', 'wisp'], ['Sprite Guardian', 'golem']],
  undead_lair: [['Lair Skeleton', 'skeleton'], ['Lair Ghost', 'ghost'], ['Lair Mummy', 'humanoid']],
  abyss_demons: [['Demon Warrior', 'demon'], ['Malphas Imp', 'demon'], ['Brute of the Abyss', 'golem']],
  manor: [['Vampire Bat', 'beast'], ['Bloodthirsty Servant', 'humanoid'], ['Haunted Armor', 'golem']],
  davy: [['Ghost Pirate', 'ghost'], ['Sea Skeleton', 'skeleton'], ['Kraken Spawn', 'blob']],
  labyrinth: [['Mini Larva', 'bug'], ['Woodland Weakling', 'humanoid'], ['Moth Swarm', 'bug']],
  docks: [['Bilgewater Pirate', 'humanoid'], ['Dock Rat', 'beast'], ['Cursed Sailor', 'skeleton']],
  wetlands: [['Swamp Toad', 'blob'], ['Bog Lurker', 'snake'], ['Sulfur Wisp', 'wisp']],
  trench: [['Deep Angler', 'eye'], ['Coral Golem', 'golem'], ['Sea Siren', 'humanoid']],
  tomb: [['Tomb Scarab', 'bug'], ['Tomb Defender', 'golem'], ['Lesser Mummy', 'humanoid']],
  fungal: [['Spore Puff', 'blob'], ['Mushroom Walker', 'golem'], ['Fungal Crawler', 'bug']],
  nest: [['Worker Bee', 'bug'], ['Soldier Bee', 'bug'], ['Hive Drone', 'bug']],
  cultist: [['Cultist Acolyte', 'humanoid'], ['Cultist Zealot', 'humanoid'], ['Bound Horror', 'eye']],
  crystal: [['Crystal Shard', 'golem'], ['Geode Crawler', 'bug'], ['Prism Wisp', 'wisp']],
  lost_halls: [['Marble Defender', 'golem'], ['Corrupted Spirit', 'ghost'], ['Halls Sentinel', 'humanoid']],
  void: [['Void Spawn', 'eye'], ['Null Wraith', 'ghost'], ['Shattered Horror', 'demon']],
  shatters: [['Shattered Knight', 'humanoid'], ['Bridge Sentinel', 'golem'], ['Forgotten Spirit', 'ghost']],
  oryx: [['Oryx’s Guard', 'humanoid'], ['Royal Golem', 'golem'], ['Mad God Servant', 'demon']],
};
