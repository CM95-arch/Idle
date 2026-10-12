// The classes. Stats: hp, atk (damage per hit), def (cuts damage taken), spd (attacks per second).
// Each class has one auto-ability; `fx` says what it does and `pow` how strong (scaled by Ability gear).
export const ROLES = { dps: 'Damage', tank: 'Tank', support: 'Support' };

export const CLASSES = {
  wizard: {
    name: 'Wizard', role: 'dps', look: 'hat', weapon: 'staff', armor: 'robe', abilityItem: 'spell',
    colors: { a: '#2b3f9e', b: '#6a86e8', c: '#d9a441' }, shot: '#ff8a3c',
    base: { hp: 80, atk: 15, def: 1, spd: 1.0 },
    ability: { name: 'Fire Burst', cd: 7, fx: 'aoe', pow: 2.2, desc: 'Blasts every enemy for {p}% damage.' },
    blurb: 'Glass cannon. Melts whole waves at once.',
  },
  priest: {
    name: 'Priest', role: 'support', look: 'hood', weapon: 'wand', armor: 'robe', abilityItem: 'tome',
    colors: { a: '#e8e4f0', b: '#ffffff', c: '#d9a441' }, shot: '#ffe08a',
    base: { hp: 95, atk: 9, def: 2, spd: 1.0 },
    ability: { name: 'Healing Tome', cd: 5, fx: 'heal', pow: 0.32, desc: 'Heals the most wounded ally for {p}% of their HP.' },
    unlock: { needs: { wizard: 5 } },
    blurb: 'Keeps the party alive through anything.',
  },
  archer: {
    name: 'Archer', role: 'dps', look: 'hood', weapon: 'bow', armor: 'leather', abilityItem: 'quiver',
    colors: { a: '#3f6b2e', b: '#7fb35a', c: '#b07a3a' }, shot: '#f0d9a0',
    base: { hp: 100, atk: 13, def: 3, spd: 1.1 },
    ability: { name: 'Piercing Arrow', cd: 6, fx: 'pierce', pow: 4, desc: 'An arrow through the front two enemies for {p}% damage.' },
    unlock: { needs: { priest: 5 } },
    blurb: 'Steady damage that punches through the line.',
  },
  rogue: {
    name: 'Rogue', role: 'dps', look: 'hood', weapon: 'dagger', armor: 'leather', abilityItem: 'cloak',
    colors: { a: '#3a3442', b: '#6b6078', c: '#b03a3a' }, shot: '#e6e6f5',
    base: { hp: 105, atk: 8, def: 3, spd: 1.8 },
    ability: { name: 'Backstab', cd: 6, fx: 'execute', pow: 6, desc: 'Vanishes and strikes the weakest enemy for {p}% damage.' },
    unlock: { needs: { archer: 5 } },
    blurb: 'Fast blades. Finishes off whatever is left.',
  },
  warrior: {
    name: 'Warrior', role: 'tank', look: 'helm', weapon: 'sword', armor: 'heavy', abilityItem: 'helm',
    colors: { a: '#7a2a24', b: '#b8483c', c: '#c9c9d1' }, shot: '#ffffff',
    base: { hp: 170, atk: 10, def: 6, spd: 1.0 },
    ability: { name: 'Berserk', cd: 9, fx: 'berserk', pow: 0.6, desc: 'Draws every attack and swings {p}% faster for 4s.' },
    unlock: { needs: { rogue: 5 } },
    blurb: 'The front line. Takes the hits so others don’t.',
  },
  // ---- higher tiers: two classes at level 20 ----
  knight: {
    name: 'Knight', role: 'tank', look: 'helm', weapon: 'sword', armor: 'heavy', abilityItem: 'shield',
    colors: { a: '#3c4a6a', b: '#8a9bc4', c: '#d9d9e6' }, shot: '#9ec2ff',
    base: { hp: 210, atk: 9, def: 9, spd: 1.0 },
    ability: { name: 'Shield Bash', cd: 8, fx: 'stun', pow: 1.5, desc: 'Hits every enemy for {p}% damage and stuns them for 2s.' },
    unlock: { needs: { warrior: 20, priest: 20 } },
    blurb: 'An unbreakable wall that stuns the whole wave.',
  },
  huntress: {
    name: 'Huntress', role: 'dps', look: 'hood', weapon: 'bow', armor: 'leather', abilityItem: 'trap',
    colors: { a: '#5a4a2a', b: '#a08850', c: '#3f8a4a' }, shot: '#d8b070',
    base: { hp: 105, atk: 13, def: 3, spd: 1.15 },
    ability: { name: 'Snare Trap', cd: 7, fx: 'dot', pow: 3.5, desc: 'Burns every enemy for {p}% damage over 4s and slows them.' },
    unlock: { needs: { archer: 20, wizard: 20 } },
    blurb: 'Traps that shred whole waves over time.',
  },
  necromancer: {
    name: 'Necromancer', role: 'support', look: 'hood', weapon: 'staff', armor: 'robe', abilityItem: 'skull',
    colors: { a: '#2a3a2a', b: '#5a7a5a', c: '#8fff9f' }, shot: '#8fff9f',
    base: { hp: 95, atk: 14, def: 2, spd: 1.0 },
    ability: { name: 'Soul Drain', cd: 6, fx: 'drain', pow: 1.8, desc: 'Drains every enemy for {p}% damage and heals the party for part of it.' },
    unlock: { needs: { priest: 20, wizard: 20 } },
    blurb: 'Steals life from every enemy to feed the party.',
  },
  assassin: {
    name: 'Assassin', role: 'dps', look: 'hood', weapon: 'dagger', armor: 'leather', abilityItem: 'poison',
    colors: { a: '#3a2a4a', b: '#7a4a9a', c: '#46b04a' }, shot: '#7cff4a',
    base: { hp: 110, atk: 9, def: 3, spd: 1.9 },
    ability: { name: 'Poison Vial', cd: 6, fx: 'poison', pow: 9, desc: 'Poisons the strongest enemy for {p}% damage over 5s.' },
    unlock: { needs: { rogue: 20, archer: 20 } },
    blurb: 'Poison that melts bosses.',
  },
  paladin: {
    name: 'Paladin', role: 'support', look: 'helm', weapon: 'sword', armor: 'heavy', abilityItem: 'seal',
    colors: { a: '#d8d0b8', b: '#f4eedc', c: '#3a5fb8' }, shot: '#ffe08a',
    base: { hp: 190, atk: 10, def: 7, spd: 1.0 },
    ability: { name: 'Holy Seal', cd: 9, fx: 'buff', pow: 0.4, desc: 'Heals the party a little and raises their damage by {p}% for 5s.' },
    unlock: { needs: { knight: 20, priest: 20 } },
    blurb: 'Blessed armor. Makes the whole party hit harder.',
  },
  sorcerer: {
    name: 'Sorcerer', role: 'dps', look: 'hat', weapon: 'wand', armor: 'robe', abilityItem: 'scepter',
    colors: { a: '#4a2a7a', b: '#9a6ad8', c: '#5de0ff' }, shot: '#5de0ff',
    base: { hp: 90, atk: 15, def: 1, spd: 1.05 },
    ability: { name: 'Chain Lightning', cd: 6, fx: 'chain', pow: 3, desc: 'Lightning jumps through every enemy for {p}% damage, weaker each jump.' },
    unlock: { needs: { necromancer: 20, huntress: 20 } },
    blurb: 'Lightning that arcs through everything.',
  },
};
export const CLASS_IDS = Object.keys(CLASSES);
