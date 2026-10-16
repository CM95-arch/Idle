// Gear: four slots. Each class wears its own kinds (a Wizard's staff, a Rogue's dagger); rings fit anyone.
// The main stat comes from the slot; rarer pieces roll extra stats.
export const SLOTS = ['weapon', 'ability', 'armor', 'ring'];
export const SLOT_NAME = { weapon: 'Weapon', ability: 'Ability', armor: 'Armor', ring: 'Ring' };

export const KINDS = {
  staff: { slot: 'weapon', names: ['Staff', 'Rod', 'Spire'] },
  wand: { slot: 'weapon', names: ['Wand', 'Scepter', 'Baton'] },
  bow: { slot: 'weapon', names: ['Bow', 'Longbow', 'Recurve'] },
  dagger: { slot: 'weapon', names: ['Dagger', 'Dirk', 'Kris'] },
  sword: { slot: 'weapon', names: ['Sword', 'Blade', 'Claymore'] },
  robe: { slot: 'armor', names: ['Robe', 'Vestments', 'Mantle'] },
  leather: { slot: 'armor', names: ['Leather', 'Hide', 'Jerkin'] },
  heavy: { slot: 'armor', names: ['Plate', 'Mail', 'Cuirass'] },
  ring: { slot: 'ring', names: ['Ring', 'Band', 'Signet'] },
  spell: { slot: 'ability', names: ['Spell', 'Tome of Fire', 'Grimoire'] },
  tome: { slot: 'ability', names: ['Tome', 'Codex', 'Prayer Book'] },
  quiver: { slot: 'ability', names: ['Quiver', 'Arrow Case', 'Bandolier'] },
  cloak: { slot: 'ability', names: ['Cloak', 'Shroud', 'Veil'] },
  helm: { slot: 'ability', names: ['Helm', 'Warhelm', 'Crown'] },
  shield: { slot: 'ability', names: ['Shield', 'Bulwark', 'Aegis'] },
  trap: { slot: 'ability', names: ['Trap', 'Snare', 'Net'] },
  skull: { slot: 'ability', names: ['Skull', 'Relic', 'Bone Idol'] },
  poison: { slot: 'ability', names: ['Poison', 'Vial', 'Venom'] },
  seal: { slot: 'ability', names: ['Seal', 'Sigil', 'Writ'] },
  scepter: { slot: 'ability', names: ['Scepter', 'Orb', 'Rod of Storms'] },
};
export const PREFIX = [
  ['Worn', 'Plain', 'Simple'],
  ['Sturdy', 'Fine', 'Keen'],
  ['Gleaming', 'Runed', 'Azure'],
  ['Arcane', 'Shadow', 'Storm'],
  ['Ancient', 'Radiant', 'Dragon'],
  ['Usurper’s', 'Void-forged', 'Celestial'],
];

// main stat per slot, per item level 0; rings pick one stat
export const MAIN = { weapon: { atk: 6 }, armor: { hp: 30, def: 2 }, ability: { pow: 0.1 }, ring: null };
export const RING_STATS = { hp: 30, atk: 4, def: 2 };
// extra stats (percent): what rarer pieces can roll
export const EXTRA = {
  atkPct: { name: 'Attack', min: 4, max: 10 },
  hpPct: { name: 'HP', min: 5, max: 12 },
  defPct: { name: 'Defense', min: 5, max: 12 },
  spdPct: { name: 'Attack speed', min: 3, max: 8 },
  crit: { name: 'Crit chance', min: 2, max: 6 },
  famePct: { name: 'Glory', min: 3, max: 8 },
};
export const STAT_NAME = { hp: 'HP', atk: 'Attack', def: 'Defense', spd: 'Speed', pow: 'Ability power' };
