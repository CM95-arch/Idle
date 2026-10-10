// Every item in the game. Tiered gear is generated from the tables below; UT (untiered) items are hand-made.
// Weapon and armor names follow ROTMG's tiered gear for the test build (T13–T14 names are placeholders).
// Ability and ring names are original, since ROTMG's stop at T7.

import { STAT_NAME } from './classes.js';

export const MAX_TIER = 14;
const GROWTH = 1.28; // power multiplier per tier

export const WEAPON_TYPES = {
  staff:  { cat: 'Staves',  label: 'Staff',  shots: 2, base: 23, rof: 1.0 },
  wand:   { cat: 'Wands',   label: 'Wand',   shots: 1, base: 46, rof: 1.0 },
  bow:    { cat: 'Bows',    label: 'Bow',    shots: 3, base: 15, rof: 1.0 },
  sword:  { cat: 'Swords',  label: 'Sword',  shots: 1, base: 50, rof: 1.0 },
  dagger: { cat: 'Daggers', label: 'Dagger', shots: 1, base: 34, rof: 1.3 },
};
export const ARMOR_TYPES = {
  robe:    { label: 'Robe',          def: (t) => Math.round(1 + 1.5 * t), bonus: (t) => ({ mp: 4 * t, wis: Math.floor(t / 3) }) },
  leather: { label: 'Leather Armor', def: (t) => Math.round(1.5 + 1.6 * t), bonus: (t) => ({ dex: Math.floor(t / 3), spd: Math.floor(t / 4) }) },
  heavy:   { label: 'Heavy Armor',   def: (t) => Math.round(2 + 1.7 * t), bonus: (t) => ({ hp: 3 * t, vit: Math.floor(t / 5) }) },
};
export const ABILITY_LABEL = { spell: 'Spell', tome: 'Tome', quiver: 'Quiver', cloak: 'Cloak', helm: 'Helm', shield: 'Shield', seal: 'Seal', trap: 'Trap', scepter: 'Scepter', skull: 'Skull', poison: 'Poison' };

const NAMES = {
  staff: ['Firebrand Staff', 'Comet Staff', 'Serpentine Staff', 'Meteor Staff', 'Slayer Staff', 'Avenger Staff', 'Staff of Destruction', 'Staff of Horror', 'Staff of Necrotic Arcana', 'Staff of Diabolic Secrets', 'Staff of Astral Knowledge', 'Staff of the Cosmic Whole', 'Staff of the Vital Unity', 'Staff of the Fundamental Core'],
  wand: ['Force Wand', 'Power Wand', 'Missile Wand', 'Eldritch Wand', "Hell's Fire Wand", 'Wand of Dark Magic', 'Wand of Arcane Flame', 'Wand of Death', 'Wand of Deep Sorcery', 'Wand of Shadow', 'Wand of Ancient Warning', 'Wand of Recompense', 'Wand of Evocation', 'Wand of the Unbound Star'],
  bow: ['Reinforced Bow', 'Crossbow', 'Double Bow', 'Heavy Crossbow', 'Golden Bow', 'Verdant Bow', 'Bow of Fey Magic', 'Bow of Innocent Blood', 'Bow of Covert Havens', 'Bow of Mystical Energy', 'Bow of Deep Enchantment', 'Bow of the Morning Star', 'Bow of the Sundered Sky', 'Bow of the Final Dawn'],
  sword: ['Broad Sword', 'Saber', 'Long Sword', 'Falchion', 'Fire Sword', 'Glass Sword', 'Golden Sword', 'Ravenheart Sword', 'Dragonsoul Sword', 'Archon Sword', 'Skysplitter Sword', 'Sword of Acclaim', 'Sword of Splendor', 'Sword of the Last Light'],
  dagger: ['Dirk', 'Blue Steel Dagger', 'Dagger of Sinister Deeds', 'Silver Dagger', 'Golden Dagger', 'Obsidian Dagger', 'Mithril Dagger', 'Fire Dagger', 'Ragetalon Dagger', 'Emeraldshard Dagger', 'Agateclaw Dagger', 'Dagger of Foul Malevolence', 'Dagger of Sheer Dread', 'Dagger of the Hollow Moon'],
  robe: ['Robe of the Apprentice', 'Robe of the Acolyte', 'Robe of the Student', 'Robe of the Conjurer', 'Robe of the Adept', 'Robe of the Invoker', 'Robe of the Illusionist', 'Robe of the Master', 'Robe of the Shadow Magus', 'Robe of the Moon Wizard', 'Robe of the Elder Warlock', 'Robe of the Grand Sorcerer', 'Robe of the Star Mother', 'Robe of the Ninth Sky'],
  leather: ['Wolfskin Armor', 'Basilisk Hide Armor', 'Hippogriff Hide Armor', 'Griffon Hide Armor', 'Drake Hide Armor', 'Roc Leather Armor', 'Studded Hide Armor', 'Shadowcloth Armor', 'Wyvern Skin Armor', 'Hydra Skin Armor', 'Leviathan Armor', 'Kraken Hide Armor', 'Abyssal Drake Armor', 'Starwoven Leather'],
  heavy: ['Iron Mail', 'Bronze Lamellar', 'Steel Breastplate', 'Mithril Chainmail', 'Mithril Armor', 'Golden Chainmail', 'Desolation Armor', 'Vengeance Armor', 'Abyssal Armor', 'Acropolis Armor', 'Dominion Armor', 'Annihilation Armor', 'Bulwark of the Titan', 'Aegis of the First King'],
};
const ABILITY_WORDS = {
  spell: ['Spark', 'Ember', 'Cinder', 'Flare', 'Blaze', 'Inferno', 'Pyre', 'Scorch', 'Wildfire', 'Hellflame', 'Starfire', 'Sunburst', 'Nova', 'Supernova'].map((w) => `${w} Spell`),
  tome: ['Novice', 'Healing', 'Mending', 'Renewal', 'Blessed', 'Sacred', 'Hallowed', 'Radiant', "Seraph's", "Saint's", 'Divine', 'Celestial', 'Exalted', 'Eternal'].map((w) => `${w} Tome`),
  quiver: ["Hunter's", "Ranger's", 'Thorn', 'Barbed', 'Ironhead', 'Steelhead', 'Piercing', 'Gale', 'Storm', 'Thunder', 'Skybreaker', 'Starshot', 'Comet', 'Eclipse'].map((w) => `${w} Quiver`),
  cloak: ['Drab', 'Dusk', 'Shadow', 'Nightfall', 'Smoke', 'Shade', 'Phantom', 'Wraith', 'Umbral', 'Midnight', 'Voidsilk', 'Eclipse', 'Starless', 'Oblivion'].map((w) => `${w} Cloak`),
  helm: ['Iron', 'Bronze', 'Steel', 'Battle', 'War', "Berserker's", "Warlord's", "Champion's", "Conqueror's", "Titan's", 'Dragonbone', 'Demonforged', 'Godforged', 'Ascendant'].map((w) => `${w} Helm`),
  shield: ['Wooden', 'Iron', 'Kite', 'Tower', 'Steel', 'Mithril', 'Bulwark', 'Colossus', 'Dragonscale', 'Aegis', 'Bastion', 'Citadel', 'Titanwall', 'Worldguard'].map((w) => `${w} Shield`),
  seal: ['Faith', 'Valor', 'Honor', 'Devotion', 'Glory', 'Mercy', 'Justice', 'Triumph', 'the Saint', 'the Martyr', 'the Crusade', 'the Dawn', 'the Archangel', 'Eternity'].map((w) => `Seal of ${w}`),
  trap: ['Snare', 'Spike', 'Barbed', 'Iron Jaw', 'Bear', 'Thornwire', 'Venomclaw', 'Hellspike', 'Dragontooth', 'Earthsplitter', 'Stormcoil', 'Abyssal', 'Starfall', 'Worldbreaker'].map((w) => `${w} Trap`),
  scepter: ['Copper', 'Silver', 'Spark', 'Storm', 'Lightning', 'Tempest', 'Thunderlord', 'Skyfire', 'Arc', 'Maelstrom', 'Cyclone', 'Heavenshock', 'Godstorm', 'Worldspark'].map((w) => `${w} Scepter`),
  skull: ['Rat', 'Wolf', 'Ghoul', 'Bone', 'Grave', 'Lich', 'Wraith', 'Banshee', 'Bonelord', 'Reaper', 'Deathlord', 'Doom', 'Abyssal', 'Oblivion'].map((w) => `${w} Skull`),
  poison: ['Nettle', 'Spider', 'Viper', 'Scorpion', 'Hemlock', 'Nightshade', 'Basilisk', 'Wyvern', 'Hydra', 'Leviathan', 'Plaguebloom', 'Blackheart', 'Godbane', 'Worldrot'].map((w) => `${w} Poison`),
};
const RING_ADJ = ['Minor', 'Lesser', '', 'Greater', 'Superior', 'Paramount', 'Exalted', 'Unbound', 'Ascendant', 'Mythic', 'Celestial', 'Astral', 'Primordial', 'Eternal'];
const RING_STATS = ['hp', 'mp', 'att', 'def', 'spd', 'dex', 'vit', 'wis'];
const ringBonus = (stat, t) => (stat === 'hp' || stat === 'mp' ? 10 * t : stat === 'def' ? Math.ceil(t * 0.6) : t);

const FLAVOR = {
  staff: ['A plain staff that hums faintly.', 'Old runes along the shaft glow when it fires.', 'The air bends around it, afraid.'],
  wand: ['Light, quick, and a little unstable.', 'Its tip is always warm to the touch.', 'It whispers the names of the dead.'],
  bow: ['Sturdy wood and a taut string.', 'Arrows leave it with a hunter’s patience.', 'The string sings a note no one taught it.'],
  sword: ['A dependable blade.', 'Balanced for long fights.', 'It has never been sheathed for long.'],
  dagger: ['Small, sharp, easy to hide.', 'Made for quick, quiet work.', 'It finds the gap in any armor.'],
  robe: ['Simple cloth with a few stitched wards.', 'Woven with threads of focused mana.', 'Stars shift in its folds.'],
  leather: ['Tough hide, roughly cured.', 'Light enough to move fast, tough enough to matter.', 'Hide from a beast few have ever seen.'],
  heavy: ['Heavy, loud, and reassuring.', 'Plate that has turned many killing blows.', 'Forged for a war the world forgot.'],
  ability: ['A novice’s focus.', 'A veteran’s tool.', 'A relic of legendary power.'],
  ring: ['A modest band.', 'Set with a stone that glows faintly.', 'A ring fit for a god.'],
};
const band = (t) => (t <= 4 ? 0 : t <= 9 ? 1 : 2);
const round1 = (n) => Math.round(n * 10) / 10;

export function weaponStats(type, t, mult = 1) {
  const w = WEAPON_TYPES[type];
  const avg = w.base * Math.pow(GROWTH, t - 1) * mult;
  return { dmgMin: Math.round(avg * 0.8), dmgMax: Math.round(avg * 1.2), shots: w.shots, rof: w.rof };
}
export function abilityStats(type, t, mult = 1) {
  return { power: Math.round(70 * Math.pow(GROWTH, t - 1) * mult), cost: 55 + 5 * t };
}

export const ITEMS = {};
const add = (it) => { ITEMS[it.id] = it; };

for (let t = 1; t <= MAX_TIER; t++) {
  for (const type of Object.keys(WEAPON_TYPES)) {
    add({ id: `${type}_t${t}`, name: NAMES[type][t - 1], type, slot: 'weapon', cat: WEAPON_TYPES[type].cat, tier: t, weapon: weaponStats(type, t), bonus: {}, desc: FLAVOR[type][band(t)] });
  }
  for (const type of Object.keys(ARMOR_TYPES)) {
    const A = ARMOR_TYPES[type];
    add({ id: `${type}_t${t}`, name: NAMES[type][t - 1], type, slot: 'armor', cat: 'Armor', tier: t, bonus: { def: A.def(t), ...A.bonus(t) }, desc: FLAVOR[type][band(t)] });
  }
  for (const type of Object.keys(ABILITY_WORDS)) {
    add({ id: `${type}_t${t}`, name: ABILITY_WORDS[type][t - 1], type, slot: 'ability', cat: 'Abilities', tier: t, ability: abilityStats(type, t), bonus: {}, desc: FLAVOR.ability[band(t)] });
  }
  for (const st of RING_STATS) {
    const adj = RING_ADJ[t - 1];
    add({ id: `ring_${st}_t${t}`, name: `Ring of ${adj ? adj + ' ' : ''}${STAT_NAME[st]}`, type: 'ring', ringStat: st, slot: 'ring', cat: 'Rings', tier: t, bonus: { [st]: ringBonus(st, t) }, desc: FLAVOR.ring[band(t)] });
  }
}

// ---- UT items: one-of-a-kind dungeon drops. `eq` is the tier their base stats are built from. ----
const UT = [
  // id, name, type, eq tier, power mult, bonus, description
  ['ut_pit_fang', 'Fang of the Pit Queen', 'dagger', 5, 1.1, { spd: 3 }, 'Still wet with venom. It never dries.'],
  ['ut_coiled_scale', 'Coiled Scale Armor', 'leather', 5, 1, { dex: 3, hp: 20 }, 'Shed by something very large and very angry.'],
  ['ut_viper_eye', 'Viper’s Eye Ring', 'ring', 5, 1, { dex: 4, spd: 2 }, 'The eye blinks when you aren’t looking.'],
  ['ut_wild_whimsy', 'Staff of Wild Whimsy', 'staff', 6, 1.12, { mp: 30 }, 'It giggles when it fires.'],
  ['ut_flicker_cloak', 'Cloak of the Flicker', 'cloak', 6, 1.15, { spd: 4 }, 'Half here, half somewhere else.'],
  ['ut_gravewarden', 'Gravewarden Tome', 'tome', 6, 1.2, { def: 3 }, 'Its pages are cold enough to frost your fingers.'],
  ['ut_lantern_skull', 'Lantern Skull', 'skull', 6, 1.15, { wis: 4 }, 'A ghost-light burns behind its eyes.'],
  ['ut_demonfire', 'Demonfire Blade', 'sword', 7, 1.12, { att: 3 }, 'Forged in the pits and quenched in screams.'],
  ['ut_molten_helm', 'Molten Helm', 'helm', 7, 1.15, { hp: 40, def: 2 }, 'Still glowing, centuries later.'],
  ['ut_thirst', 'Vampire’s Thirst', 'dagger', 7, 1.1, { vit: 5 }, 'It drinks a little of everything it cuts.'],
  ['ut_bloodsilk', 'Bloodsilk Robe', 'robe', 7, 1, { att: 4, mp: 40 }, 'Elegant, expensive, and slightly damp.'],
  ['ut_drowned_saber', 'Drowned Captain’s Saber', 'sword', 8, 1.12, { spd: 4 }, 'Salt-crusted and razor sharp.'],
  ['ut_ghostship', 'Ghostship Ring', 'ring', 8, 1, { def: 4, vit: 4 }, 'You can hear distant bells.'],
  ['ut_thornheart', 'Thornheart Bow', 'bow', 8, 1.12, { dex: 3 }, 'Its arrows sprout thorns mid-flight.'],
  ['ut_mossback', 'Mossback Shield', 'shield', 8, 1.15, { def: 4 }, 'Something still lives in the moss.'],
  ['ut_harpoon', 'Harpoon Quiver', 'quiver', 9, 1.15, { att: 3 }, 'Made for whales. Works on everything.'],
  ['ut_tidecaller', 'Tidecaller Wand', 'wand', 9, 1.12, { wis: 4 }, 'Smells of low tide and lightning.'],
  ['ut_bog_witch', 'Bog Witch Poison', 'poison', 9, 1.2, { vit: 4 }, 'Bubbles even when sealed.'],
  ['ut_swamp_lord', 'Swamp Lord Trap', 'trap', 9, 1.15, { hp: 40 }, 'Snaps shut with a wet crunch.'],
  ['ut_coral_seal', 'Coral Crown Seal', 'seal', 10, 1.15, { wis: 4, hp: 30 }, 'A gift from the drowned throne.'],
  ['ut_abyssal_pearl', 'Abyssal Pearl Ring', 'ring', 10, 1, { mp: 60, wis: 5 }, 'Black as the trench it came from.'],
  ['ut_sunscorch', 'Sunscorch Staff', 'staff', 10, 1.12, { dex: 3 }, 'Hot enough to burn the hand that holds it.'],
  ['ut_scarab_plate', 'Scarab Plate', 'heavy', 10, 1, { vit: 6, hp: 60 }, 'A thousand golden beetles, perfectly still.'],
  ['ut_pharaoh', 'Pharaoh’s Scepter', 'scepter', 10, 1.15, { att: 3 }, 'It remembers every king who held it.'],
  ['ut_sporecloud', 'Sporecloud Spell', 'spell', 10, 1.15, { vit: 4 }, 'Do not breathe in.'],
  ['ut_mycelium', 'Mycelium Robe', 'robe', 10, 1, { vit: 5, wis: 3 }, 'It grows back when torn.'],
  ['ut_stinger', 'Queen’s Stinger Bow', 'bow', 10, 1.12, { att: 4 }, 'Every arrow carries a sting.'],
  ['ut_honeyglass', 'Honeyglass Ring', 'ring', 10, 1, { hp: 80, vit: 3 }, 'Warm amber with a bee frozen inside.'],
  ['ut_eclipsed', 'Eclipsed Scepter', 'scepter', 10, 1.2, { mp: 50 }, 'Its light swallows other light.'],
  ['ut_shroud', 'Cultist’s Shroud', 'robe', 10, 1, { att: 5, dex: 3 }, 'Smells of incense and bad decisions.'],
  ['ut_prism_wand', 'Prism Wand', 'wand', 10, 1.15, { dex: 4 }, 'Splits every bolt into a rainbow.'],
  ['ut_geode_helm', 'Geode Helm', 'helm', 10, 1.15, { def: 5 }, 'Crystal-lined and very hard to dent.'],
  ['ut_marble_seal', 'Marble Seal of Ages', 'seal', 12, 1.2, { def: 4, wis: 4 }, 'Carved by the hands of a colossus.'],
  ['ut_colossus', 'Colossus Blade', 'sword', 12, 1.12, { hp: 60 }, 'Absurdly large. Absurdly effective.'],
  ['ut_voidcaller', 'Voidcaller Staff', 'staff', 13, 1.12, { mp: 60, wis: 4 }, 'Something on the other side answers.'],
  ['ut_nullfield', 'Nullfield Cloak', 'cloak', 13, 1.2, { def: 5 }, 'Light does not land on it.'],
  ['ut_starlight', 'Starlight Drinker', 'staff', 13, 1.15, { att: 4, dex: 2 }, 'A staff said to drink starlight.'],
  ['ut_kings_edge', 'Forgotten King’s Edge', 'sword', 13, 1.15, { att: 4 }, 'Its owner was erased from history. The blade was not.'],
  ['ut_shattered_crown', 'Shattered Crown Ring', 'ring', 13, 1, { att: 6, dex: 6 }, 'A fragment of a crown nobody remembers.'],
  ['ut_mad_wrath', 'Mad God’s Wrath', 'wand', 14, 1.18, { att: 5 }, 'Pure, furious madness, pointed outward.'],
  ['ut_oryx_crown', 'Crown of the Mad God', 'helm', 14, 1.2, { hp: 80, att: 3 }, 'Heavy is the head.'],
  ['ut_mad_ring', 'Ring of the Mad God', 'ring', 14, 1, { hp: 100, mp: 100, att: 4, dex: 4 }, 'It tightens when you think of leaving.'],
  ['ut_final_night', 'Robe of the Final Night', 'robe', 14, 1, { att: 6, wis: 6, mp: 80 }, 'Stitched from the last hour before the end.'],
];
for (const [id, name, type, eq, mult, bonus, desc] of UT) {
  const base = { id, name, type, tier: 'UT', eq, desc };
  if (WEAPON_TYPES[type]) add({ ...base, slot: 'weapon', cat: WEAPON_TYPES[type].cat, weapon: weaponStats(type, eq, mult), bonus });
  else if (ARMOR_TYPES[type]) {
    const A = ARMOR_TYPES[type];
    const b = { def: A.def(eq), ...A.bonus(eq) };
    for (const [k, v] of Object.entries(bonus)) b[k] = (b[k] || 0) + v;
    add({ ...base, slot: 'armor', cat: 'Armor', bonus: b });
  } else if (type === 'ring') add({ ...base, slot: 'ring', cat: 'Rings', bonus });
  else add({ ...base, slot: 'ability', cat: 'Abilities', ability: abilityStats(type, eq, mult), bonus });
}

// ---- potions and runes ----
for (const st of RING_STATS) {
  add({ id: `pot_${st}`, name: `Potion of ${STAT_NAME[st]}`, type: 'potion', potStat: st, slot: 'potion', cat: 'Potions', tier: null, bonus: {}, desc: `Permanently raises ${STAT_NAME[st]} on the character who drinks it.` });
}
for (const [id, name, src] of [['rune_sword', 'Sword Rune', 'Lost Halls'], ['rune_shield', 'Shield Rune', 'The Void'], ['rune_helm', 'Helm Rune', 'The Shatters']]) {
  add({ id, name, type: 'rune', slot: 'rune', cat: 'Potions', tier: null, bonus: {}, desc: `One of three runes that open Oryx’s Castle. Drops from ${src}. Used up when you enter.` });
}

export const ITEM_LIST = Object.values(ITEMS);
export const CATEGORIES = ['Staves', 'Wands', 'Bows', 'Swords', 'Daggers', 'Armor', 'Abilities', 'Rings', 'Potions'];
export const tierLabel = (it) => (it.tier === 'UT' ? 'UT' : it.tier ? `T${it.tier}` : '');
export const tierValue = (it) => (it.tier === 'UT' ? it.eq + 0.5 : it.tier || 0);
export const typeLabel = (it) => WEAPON_TYPES[it.type]?.label || ARMOR_TYPES[it.type]?.label || ABILITY_LABEL[it.type] || (it.type === 'ring' ? 'Ring' : it.type === 'potion' ? 'Potion' : 'Rune');
export { round1 };
