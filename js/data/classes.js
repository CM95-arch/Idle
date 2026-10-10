// The 11 launch classes. Base and max stats follow ROTMG's class tables.
// Gear types match ROTMG's class restrictions. Every class can wear any ring.

export const STATS = ['hp', 'mp', 'att', 'def', 'spd', 'dex', 'vit', 'wis'];
export const STAT_LABEL = { hp: 'HP', mp: 'MP', att: 'ATT', def: 'DEF', spd: 'SPD', dex: 'DEX', vit: 'VIT', wis: 'WIS' };
export const STAT_NAME = { hp: 'Life', mp: 'Mana', att: 'Attack', def: 'Defense', spd: 'Speed', dex: 'Dexterity', vit: 'Vitality', wis: 'Wisdom' };

const s = (hp, mp, att, def, spd, dex, vit, wis) => ({ hp, mp, att, def, spd, dex, vit, wis });

export const CLASSES = [
  { id: 'wizard', name: 'Wizard', weapon: 'staff', ability: 'spell', armor: 'robe', blurb: 'Master of fire. Huge burst damage, fragile.',
    base: s(100, 100, 12, 0, 10, 15, 12, 12), max: s(670, 385, 75, 25, 50, 75, 40, 60), colors: { a: '#2b3f9e', b: '#6a86e8', c: '#d9a441' }, hat: true },
  { id: 'priest', name: 'Priest', weapon: 'wand', ability: 'tome', armor: 'robe', blurb: 'Heals through anything. Slow but steady.',
    base: s(100, 100, 12, 0, 12, 12, 10, 15), max: s(670, 385, 50, 25, 55, 55, 40, 75), colors: { a: '#e8e4f0', b: '#ffffff', c: '#d9a441' } },
  { id: 'archer', name: 'Archer', weapon: 'bow', ability: 'quiver', armor: 'leather', blurb: 'Reliable ranged damage that pins enemies down.',
    base: s(130, 100, 12, 0, 12, 12, 12, 10), max: s(700, 252, 75, 25, 50, 50, 40, 50), colors: { a: '#3f6b2e', b: '#7fb35a', c: '#b07a3a' } },
  { id: 'rogue', name: 'Rogue', weapon: 'dagger', ability: 'cloak', armor: 'leather', blurb: 'Fast blades. Vanishes when things go wrong.',
    base: s(150, 100, 10, 0, 15, 15, 8, 10), max: s(720, 252, 50, 25, 75, 75, 40, 50), colors: { a: '#3a3442', b: '#6b6078', c: '#b03a3a' } },
  { id: 'warrior', name: 'Warrior', weapon: 'sword', ability: 'helm', armor: 'heavy', blurb: 'Brute force. Goes berserk to swing faster.',
    base: s(200, 100, 15, 0, 7, 10, 10, 10), max: s(770, 252, 75, 25, 50, 50, 75, 50), colors: { a: '#7a2a24', b: '#b8483c', c: '#c9c9d1' } },
  { id: 'knight', name: 'Knight', weapon: 'sword', ability: 'shield', armor: 'heavy', blurb: 'The wall. Stuns enemies and shrugs off hits.',
    base: s(200, 100, 15, 0, 7, 10, 10, 10), max: s(770, 252, 50, 40, 50, 50, 75, 50), colors: { a: '#3c4a6a', b: '#8a9bc4', c: '#d9d9e6' }, parent: 'warrior' },
  { id: 'paladin', name: 'Paladin', weapon: 'sword', ability: 'seal', armor: 'heavy', blurb: 'Blessed blade. Heals and empowers itself.',
    base: s(200, 100, 12, 0, 12, 12, 10, 10), max: s(770, 252, 50, 30, 55, 45, 40, 75), colors: { a: '#d8d0b8', b: '#f4eedc', c: '#3a5fb8' }, parent: 'knight' },
  { id: 'huntress', name: 'Huntress', weapon: 'bow', ability: 'trap', armor: 'leather', blurb: 'Lays traps that slow and shred.',
    base: s(130, 100, 12, 0, 12, 12, 12, 10), max: s(700, 252, 75, 25, 50, 50, 40, 50), colors: { a: '#5a4a2a', b: '#a08850', c: '#3f8a4a' }, parent: 'archer' },
  { id: 'sorcerer', name: 'Sorcerer', weapon: 'wand', ability: 'scepter', armor: 'robe', blurb: 'Lightning that arcs through everything.',
    base: s(100, 100, 15, 0, 12, 12, 12, 15), max: s(670, 385, 70, 25, 60, 60, 75, 60), colors: { a: '#4a2a7a', b: '#9a6ad8', c: '#5de0ff' }, parent: 'wizard' },
  { id: 'necromancer', name: 'Necromancer', weapon: 'staff', ability: 'skull', armor: 'robe', blurb: 'Drains life from the living to fuel its own.',
    base: s(100, 100, 12, 0, 10, 15, 10, 15), max: s(670, 385, 75, 25, 50, 60, 30, 75), colors: { a: '#2a3a2a', b: '#5a7a5a', c: '#8fff9f' }, parent: 'priest' },
  { id: 'assassin', name: 'Assassin', weapon: 'dagger', ability: 'poison', armor: 'leather', blurb: 'Poison that melts even armored foes.',
    base: s(150, 100, 12, 0, 15, 15, 8, 10), max: s(720, 252, 60, 25, 75, 75, 40, 60), colors: { a: '#3a2a4a', b: '#7a4a9a', c: '#46b04a' }, parent: 'rogue' },
];
export const CLASS = Object.fromEntries(CLASSES.map((c) => [c.id, c]));

// Abilities. `power` comes from the item tier; see items.js.
export const ABILITY_TYPES = {
  spell:   { name: 'Spell',   effect: 'Fire burst: heavy damage to the target, splashing onto its neighbors.' },
  tome:    { name: 'Tome',    effect: 'Restores a large amount of HP and boosts your damage.' },
  quiver:  { name: 'Quiver',  effect: 'Piercing arrow down a whole lane: damages and paralyzes front and back.' },
  cloak:   { name: 'Cloak',   effect: 'Turns invisible: enemies cannot hit you, and your next stab is a critical hit.' },
  helm:    { name: 'Helm',    effect: 'Berserk: attack much faster for a few seconds.' },
  shield:  { name: 'Shield',  effect: 'Shield bash: hits the whole front row, stuns it and knocks enemies back a row.' },
  seal:    { name: 'Seal',    effect: 'Heals and boosts your damage for a few seconds.' },
  trap:    { name: 'Trap',    effect: 'Snares a lane: damages and slows everything in it.' },
  scepter: { name: 'Scepter', effect: 'Chain lightning: jumps between up to 4 enemies, cheap to cast.' },
  skull:   { name: 'Skull',   effect: 'Drains the target\'s whole row and heals you for part of it.' },
  poison:  { name: 'Poison',  effect: 'A poison cloud on a lane: damage over time to everything in it.' },
};
