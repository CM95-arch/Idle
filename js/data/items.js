// Every item in the game. Tiered gear is generated from the tables below; UT (untiered) items are hand-made.
// Weapon and armor names follow ROTMG's tiered gear for the test build (T13–T20 names are placeholders).
// Ability and ring names are original, since ROTMG's stop at T7.

import { STAT_NAME } from './classes.js';

export const MAX_TIER = 20;
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
  staff: ['Firebrand Staff', 'Comet Staff', 'Serpentine Staff', 'Meteor Staff', 'Slayer Staff', 'Avenger Staff', 'Staff of Destruction', 'Staff of Horror', 'Staff of Necrotic Arcana', 'Staff of Diabolic Secrets', 'Staff of Astral Knowledge', 'Staff of the Cosmic Whole', 'Staff of the Vital Unity', 'Staff of the Fundamental Core', 'Staff of the Bright Beyond', 'Staff of Ashen Stars', 'Staff of the Hollow Sun', 'Staff of the Last Sigil', 'Staff of Unmaking', 'Staff of the Endless Realm'],
  wand: ['Force Wand', 'Power Wand', 'Missile Wand', 'Eldritch Wand', "Hell's Fire Wand", 'Wand of Dark Magic', 'Wand of Arcane Flame', 'Wand of Death', 'Wand of Deep Sorcery', 'Wand of Shadow', 'Wand of Ancient Warning', 'Wand of Recompense', 'Wand of Evocation', 'Wand of the Unbound Star', 'Wand of the Pale Comet', 'Wand of Silent Thunder', 'Wand of the Iron Crown', 'Wand of Starless Night', 'Wand of the Eighth Gate', 'Wand of the Endless Realm'],
  bow: ['Reinforced Bow', 'Crossbow', 'Double Bow', 'Heavy Crossbow', 'Golden Bow', 'Verdant Bow', 'Bow of Fey Magic', 'Bow of Innocent Blood', 'Bow of Covert Havens', 'Bow of Mystical Energy', 'Bow of Deep Enchantment', 'Bow of the Morning Star', 'Bow of the Sundered Sky', 'Bow of the Final Dawn', 'Bow of the Silver Gale', 'Bow of Burning Skies', 'Bow of the Hunter King', 'Bow of Shattered Light', 'Bow of the Last Arrow', 'Bow of the Endless Realm'],
  sword: ['Broad Sword', 'Saber', 'Long Sword', 'Falchion', 'Fire Sword', 'Glass Sword', 'Golden Sword', 'Ravenheart Sword', 'Dragonsoul Sword', 'Archon Sword', 'Skysplitter Sword', 'Sword of Acclaim', 'Sword of Splendor', 'Sword of the Last Light', 'Sword of the Dawnbreaker', 'Sword of Burning Oaths', 'Sword of the Sunken Crown', 'Sword of the Starforge', 'Sword of the Final Oath', 'Sword of the Endless Realm'],
  dagger: ['Dirk', 'Blue Steel Dagger', 'Dagger of Sinister Deeds', 'Silver Dagger', 'Golden Dagger', 'Obsidian Dagger', 'Mithril Dagger', 'Fire Dagger', 'Ragetalon Dagger', 'Emeraldshard Dagger', 'Agateclaw Dagger', 'Dagger of Foul Malevolence', 'Dagger of Sheer Dread', 'Dagger of the Hollow Moon', 'Dagger of the Quiet Star', 'Dagger of Black Embers', 'Dagger of the Veiled Path', 'Dagger of the Last Breath', 'Dagger of Unseen Ends', 'Dagger of the Endless Realm'],
  robe: ['Robe of the Apprentice', 'Robe of the Acolyte', 'Robe of the Student', 'Robe of the Conjurer', 'Robe of the Adept', 'Robe of the Invoker', 'Robe of the Illusionist', 'Robe of the Master', 'Robe of the Shadow Magus', 'Robe of the Moon Wizard', 'Robe of the Elder Warlock', 'Robe of the Grand Sorcerer', 'Robe of the Star Mother', 'Robe of the Ninth Sky', 'Robe of the Starweaver', 'Robe of the Ember Sage', 'Robe of the Veiled Archon', 'Robe of the Ancient Flame', 'Robe of the World Mind', 'Robe of the Endless Realm'],
  leather: ['Wolfskin Armor', 'Basilisk Hide Armor', 'Hippogriff Hide Armor', 'Griffon Hide Armor', 'Drake Hide Armor', 'Roc Leather Armor', 'Studded Hide Armor', 'Shadowcloth Armor', 'Wyvern Skin Armor', 'Hydra Skin Armor', 'Leviathan Armor', 'Kraken Hide Armor', 'Abyssal Drake Armor', 'Starwoven Leather', 'Phoenix Hide Armor', 'Behemoth Leather', 'Skyray Hide Armor', 'Voidhide Armor', 'Dragonlord Leather', 'Endless Realm Leather'],
  heavy: ['Iron Mail', 'Bronze Lamellar', 'Steel Breastplate', 'Mithril Chainmail', 'Mithril Armor', 'Golden Chainmail', 'Desolation Armor', 'Vengeance Armor', 'Abyssal Armor', 'Acropolis Armor', 'Dominion Armor', 'Annihilation Armor', 'Bulwark of the Titan', 'Aegis of the First King', 'Citadel Plate', 'Starforged Plate', 'Behemoth Armor', 'Warden of Ages Plate', 'Godslayer Armor', 'Armor of the Endless Realm'],
};
const ABILITY_WORDS = {
  spell: ['Spark', 'Ember', 'Cinder', 'Flare', 'Blaze', 'Inferno', 'Pyre', 'Scorch', 'Wildfire', 'Hellflame', 'Starfire', 'Sunburst', 'Nova', 'Supernova', 'Comet', 'Starstorm', 'Voidflame', 'Worldfire', 'Godflame', 'Endless'].map((w) => `${w} Spell`),
  tome: ['Novice', 'Healing', 'Mending', 'Renewal', 'Blessed', 'Sacred', 'Hallowed', 'Radiant', "Seraph's", "Saint's", 'Divine', 'Celestial', 'Exalted', 'Eternal', 'Astral', 'Sovereign', 'Timeless', 'Godly', 'Infinite', 'Endless'].map((w) => `${w} Tome`),
  quiver: ["Hunter's", "Ranger's", 'Thorn', 'Barbed', 'Ironhead', 'Steelhead', 'Piercing', 'Gale', 'Storm', 'Thunder', 'Skybreaker', 'Starshot', 'Comet', 'Eclipse', 'Meteor', 'Starfall', 'Godshot', 'Voidshot', 'Worldpiercer', 'Endless'].map((w) => `${w} Quiver`),
  cloak: ['Drab', 'Dusk', 'Shadow', 'Nightfall', 'Smoke', 'Shade', 'Phantom', 'Wraith', 'Umbral', 'Midnight', 'Voidsilk', 'Eclipse', 'Starless', 'Oblivion', 'Nightveil', 'Shadowsoul', 'Voidcloak', 'Ghostking', 'Worldshade', 'Endless'].map((w) => `${w} Cloak`),
  helm: ['Iron', 'Bronze', 'Steel', 'Battle', 'War', "Berserker's", "Warlord's", "Champion's", "Conqueror's", "Titan's", 'Dragonbone', 'Demonforged', 'Godforged', 'Ascendant', 'Starforged', 'Kingslayer', 'Voidforged', 'Worldbreaker', 'Godking', 'Endless'].map((w) => `${w} Helm`),
  shield: ['Wooden', 'Iron', 'Kite', 'Tower', 'Steel', 'Mithril', 'Bulwark', 'Colossus', 'Dragonscale', 'Aegis', 'Bastion', 'Citadel', 'Titanwall', 'Worldguard', 'Starwall', 'Skyguard', 'Godwall', 'Voidbreaker', 'Everguard', 'Endless'].map((w) => `${w} Shield`),
  seal: ['Faith', 'Valor', 'Honor', 'Devotion', 'Glory', 'Mercy', 'Justice', 'Triumph', 'the Saint', 'the Martyr', 'the Crusade', 'the Dawn', 'the Archangel', 'Eternity', 'the Seraph', 'the Throne', 'the Heavens', 'the Pantheon', 'Infinity', 'the Endless Realm'].map((w) => `Seal of ${w}`),
  trap: ['Snare', 'Spike', 'Barbed', 'Iron Jaw', 'Bear', 'Thornwire', 'Venomclaw', 'Hellspike', 'Dragontooth', 'Earthsplitter', 'Stormcoil', 'Abyssal', 'Starfall', 'Worldbreaker', 'Godsnare', 'Voidjaw', 'Starcoil', 'Doomspike', 'Worldsnare', 'Endless'].map((w) => `${w} Trap`),
  scepter: ['Copper', 'Silver', 'Spark', 'Storm', 'Lightning', 'Tempest', 'Thunderlord', 'Skyfire', 'Arc', 'Maelstrom', 'Cyclone', 'Heavenshock', 'Godstorm', 'Worldspark', 'Starstorm', 'Voidspark', 'Skyking', 'Thunderthrone', 'Infinite', 'Endless'].map((w) => `${w} Scepter`),
  skull: ['Rat', 'Wolf', 'Ghoul', 'Bone', 'Grave', 'Lich', 'Wraith', 'Banshee', 'Bonelord', 'Reaper', 'Deathlord', 'Doom', 'Abyssal', 'Oblivion', 'Soulreaver', 'Dreadlord', 'Voidskull', 'Godreaper', 'Worldend', 'Endless'].map((w) => `${w} Skull`),
  poison: ['Nettle', 'Spider', 'Viper', 'Scorpion', 'Hemlock', 'Nightshade', 'Basilisk', 'Wyvern', 'Hydra', 'Leviathan', 'Plaguebloom', 'Blackheart', 'Godbane', 'Worldrot', 'Voidrot', 'Starblight', 'Dreadbloom', 'Godrot', 'Worldbane', 'Endless'].map((w) => `${w} Poison`),
};
const RING_ADJ = ['Minor', 'Lesser', '', 'Greater', 'Superior', 'Paramount', 'Exalted', 'Unbound', 'Ascendant', 'Mythic', 'Celestial', 'Astral', 'Primordial', 'Eternal', 'Radiant', 'Sovereign', 'Titanic', 'Godly', 'Infinite', 'Endless'];
const RING_STATS = ['hp', 'mp', 'att', 'def', 'spd', 'dex', 'vit', 'wis'];
// Rings: a main stat plus a smaller second stat, so every kind has a use.
// ATT/DEX = damage, SPD = tempo (walk time and dodge), WIS/MP = abilities, HP/DEF/VIT = survival.
const half = (t) => Math.floor(t / 2);
const RING_BONUS = {
  att: (t) => ({ att: t }),
  dex: (t) => ({ dex: t }),
  spd: (t) => ({ spd: 2 * t, dex: half(t) }),
  wis: (t) => ({ wis: 2 * t, mp: 8 * t }),
  mp: (t) => ({ mp: 20 * t, wis: t }),
  hp: (t) => ({ hp: 15 * t, vit: half(t) }),
  def: (t) => ({ def: Math.ceil(0.8 * t), hp: 5 * t }),
  vit: (t) => ({ vit: Math.round(1.5 * t), hp: 4 * t }),
};

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
const band = (t) => (t <= 5 ? 0 : t <= 12 ? 1 : 2);
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
    add({ id: `ring_${st}_t${t}`, name: `Ring of ${adj ? adj + ' ' : ''}${STAT_NAME[st]}`, type: 'ring', ringStat: st, slot: 'ring', cat: 'Rings', tier: t, bonus: RING_BONUS[st](t), desc: FLAVOR.ring[band(t)] });
  }
}

// ---- UT items: one-of-a-kind dungeon drops. `eq` is the tier their base stats are built from. ----
// fx keys (see combat.js): dmg, dmgTaken, dr, critChance, critMult, critAfterDodge, critPoison, doubleChance, burstEvery/burstMult,
// lifesteal, poisonOnHit, slowOnHit, mpOnHit, ignoreDef, eliteDmg, execute, openerHits/openerMult, ramp/rampCap, lowHpDmg,
// rofMult, killHeal, killMp, killHaste, reflect, lowHpDR, regenPct, dodge, dodgeHeal, cheatDeath,
// abilityPower, abilityCostMult, echo, abilityHpCost, abilityDot, abilitySlow, abilityStun, abilityMp, abilityHeal, abilityShield, buffDur
const UT = [
  // id, name, type, eq tier, bonus, special effect text, fx, description
  ['ut_pit_fang', 'Fang of the Pit Queen', 'dagger', 5, { spd: 2 }, 'Venom: hits poison for 30% of their damage over 3s.', { poisonOnHit: 0.3 }, 'Still wet with venom. It never dries.'],
  ['ut_coiled_scale', 'Coiled Scale Armor', 'leather', 5, { dex: 2 }, 'Coil: +6% dodge. After a dodge, your next attack is a critical hit.', { dodge: 0.06, critAfterDodge: 1 }, 'Shed by something very large and very angry.'],
  ['ut_viper_eye', 'Viper\u2019s Eye Ring', 'ring', 5, { dex: 3 }, 'Viper sight: +8% crit chance, crits deal +30% more.', { critChance: 0.08, critMult: 0.3 }, 'The eye blinks when you aren\u2019t looking.'],
  ['ut_wild_whimsy', 'Staff of Wild Whimsy', 'staff', 6, { mp: 20 }, 'Whimsy: each shot has a 25% chance to fire twice.', { doubleChance: 0.25 }, 'It giggles when it fires.'],
  ['ut_flicker_cloak', 'Cloak of the Flicker', 'cloak', 6, { spd: 3 }, 'Flicker: +8% dodge, and every dodge heals 3% HP.', { dodge: 0.08, dodgeHeal: 0.03 }, 'Half here, half somewhere else.'],
  ['ut_gravewarden', 'Gravewarden Tome', 'tome', 6, { def: 2 }, 'Grave ward: healing also halves damage taken for 3s.', { abilityShield: 3 }, 'Its pages are cold enough to frost your fingers.'],
  ['ut_lantern_skull', 'Lantern Skull', 'skull', 6, { wis: 3 }, 'Soul lantern: kills restore 12% MP.', { killMp: 0.12 }, 'A ghost-light burns behind its eyes.'],
  ['ut_demonfire', 'Demonfire Blade', 'sword', 7, { att: 2 }, 'Hellfire: every 4th attack explodes for triple damage.', { burstEvery: 4, burstMult: 3 }, 'Forged in the pits and quenched in screams.'],
  ['ut_molten_helm', 'Molten Helm', 'helm', 7, { hp: 30 }, 'Molten skin: reflect 25% of damage taken back at the attacker.', { reflect: 0.25 }, 'Still glowing, centuries later.'],
  ['ut_thirst', 'Vampire\u2019s Thirst', 'dagger', 7, { vit: 3 }, 'Thirst: heal for 6% of all damage you deal.', { lifesteal: 0.06 }, 'It drinks a little of everything it cuts.'],
  ['ut_bloodsilk', 'Bloodsilk Robe', 'robe', 7, { att: 3 }, 'Blood magic: abilities are 30% stronger but cost 5% of your HP.', { abilityPower: 0.3, abilityHpCost: 0.05 }, 'Elegant, expensive, and slightly damp.'],
  ['ut_drowned_saber', 'Drowned Captain\u2019s Saber', 'sword', 8, { spd: 3 }, 'Undertow: hits have a 15% chance to slow the enemy\u2019s attacks for 2s.', { slowOnHit: 0.15 }, 'Salt-crusted and razor sharp.'],
  ['ut_ghostship', 'Ghostship Ring', 'ring', 8, { def: 3, hp: 40 }, 'Ghost ship: once every 3 minutes, survive a killing blow with 1 HP.', { cheatDeath: 180 }, 'You can hear distant bells.'],
  ['ut_thornheart', 'Thornheart Bow', 'bow', 8, { dex: 2 }, 'Thorns: hits poison for 20% over 3s, and you reflect 10% of damage taken.', { poisonOnHit: 0.2, reflect: 0.1 }, 'Its arrows sprout thorns mid-flight.'],
  ['ut_mossback', 'Mossback Shield', 'shield', 8, { def: 3 }, 'Mossback: take 35% less damage while under 40% HP.', { lowHpDR: 0.35 }, 'Something still lives in the moss.'],
  ['ut_harpoon', 'Harpoon Quiver', 'quiver', 9, { att: 2 }, 'Harpoon: +50% damage to enemies under 30% HP.', { execute: 0.5 }, 'Made for whales. Works on everything.'],
  ['ut_tidecaller', 'Tidecaller Wand', 'wand', 9, { wis: 3 }, 'Tide: every hit restores 1 MP.', { mpOnHit: 1 }, 'Smells of low tide and lightning.'],
  ['ut_bog_witch', 'Bog Witch Poison', 'poison', 9, { vit: 3 }, 'Swamp brew: your poison also slows the enemy\u2019s attacks.', { abilitySlow: 4 }, 'Bubbles even when sealed.'],
  ['ut_swamp_lord', 'Swamp Lord Trap', 'trap', 9, { hp: 40 }, 'Snapjaw: your trap also stuns for 1.5s.', { abilityStun: 1.5 }, 'Snaps shut with a wet crunch.'],
  ['ut_coral_seal', 'Coral Crown Seal', 'seal', 10, { wis: 3 }, 'Tides of mana: casting restores 20% MP.', { abilityMp: 0.2 }, 'A gift from the drowned throne.'],
  ['ut_abyssal_pearl', 'Abyssal Pearl Ring', 'ring', 10, { mp: 60, wis: 4 }, 'Deep focus: abilities cost 30% less MP.', { abilityCostMult: -0.3 }, 'Black as the trench it came from.'],
  ['ut_sunscorch', 'Sunscorch Staff', 'staff', 10, { dex: 2 }, 'Sunscorch: the first 6 attacks of every fight deal double damage.', { openerHits: 6, openerMult: 2 }, 'Hot enough to burn the hand that holds it.'],
  ['ut_scarab_plate', 'Scarab Plate', 'heavy', 10, { vit: 4 }, 'Scarab shell: regenerate 1.5% max HP per second in combat.', { regenPct: 0.015 }, 'A thousand golden beetles, perfectly still.'],
  ['ut_pharaoh', 'Pharaoh\u2019s Scepter', 'scepter', 10, { att: 2 }, 'Royal echo: 30% chance your ability casts twice.', { echo: 0.3 }, 'It remembers every king who held it.'],
  ['ut_sporecloud', 'Sporecloud Spell', 'spell', 10, { vit: 3 }, 'Spores: your spell also poisons for 100% of its damage over 4s.', { abilityDot: 1 }, 'Do not breathe in.'],
  ['ut_mycelium', 'Mycelium Robe', 'robe', 10, { vit: 4 }, 'Regrowth: kills heal 8% of your max HP.', { killHeal: 0.08 }, 'It grows back when torn.'],
  ['ut_stinger', 'Queen\u2019s Stinger Bow', 'bow', 10, { att: 2 }, 'Stinger: +12% crit chance, and crits poison for 50% over 3s.', { critChance: 0.12, critPoison: 0.5 }, 'Every arrow carries a sting.'],
  ['ut_honeyglass', 'Honeyglass Ring', 'ring', 10, { hp: 60, vit: 2 }, 'Honey rush: kills give +30% attack speed for 3s.', { killHaste: 3 }, 'Warm amber with a bee frozen inside.'],
  ['ut_eclipsed', 'Eclipsed Scepter', 'scepter', 10, { mp: 40 }, 'Eclipse: abilities deal 60% more damage but cost 25% more MP.', { abilityPower: 0.6, abilityCostMult: 0.25 }, 'Its light swallows other light.'],
  ['ut_shroud', 'Cultist\u2019s Shroud', 'robe', 10, { att: 3 }, 'Dark pact: deal 20% more damage, take 10% more damage.', { dmg: 0.2, dmgTaken: 0.1 }, 'Smells of incense and bad decisions.'],
  ['ut_prism_wand', 'Prism Wand', 'wand', 10, { dex: 3 }, 'Prism: each shot has a 35% chance to split into two.', { doubleChance: 0.35 }, 'Splits every bolt into a rainbow.'],
  ['ut_geode_helm', 'Geode Helm', 'helm', 10, { def: 4 }, 'Crystal hide: take 15% less damage from everything.', { dr: 0.15 }, 'Crystal-lined and very hard to dent.'],
  ['ut_marble_seal', 'Marble Seal of Ages', 'seal', 12, { def: 3 }, 'Ageless: your seal heals 50% more and its buff lasts twice as long.', { abilityPower: 0.5, buffDur: 2 }, 'Carved by the hands of a colossus.'],
  ['ut_colossus', 'Colossus Blade', 'sword', 12, { hp: 60 }, 'Giant-slayer: +45% damage to elites and bosses, but 15% slower swings.', { eliteDmg: 0.45, rofMult: 0.85 }, 'Absurdly large. Absurdly effective.'],
  ['ut_voidcaller', 'Voidcaller Staff', 'staff', 13, { mp: 40 }, 'Void bolts: shots ignore enemy defense and have a 20% chance to fire twice.', { ignoreDef: 1, doubleChance: 0.2 }, 'Something on the other side answers.'],
  ['ut_nullfield', 'Nullfield Cloak', 'cloak', 13, { def: 3 }, 'Null: turning invisible also heals 25% HP.', { abilityHeal: 0.25 }, 'Light does not land on it.'],
  ['ut_starlight', 'Starlight Drinker', 'staff', 13, { att: 3 }, 'Starlight: damage grows 6% per second in a fight, up to +60%.', { ramp: 0.06, rampCap: 0.6 }, 'A staff said to drink starlight.'],
  ['ut_kings_edge', 'Forgotten King\u2019s Edge', 'sword', 13, { att: 3 }, 'Regicide: +60% damage to enemies under 30% HP; kills give +30% attack speed for 2s.', { execute: 0.6, killHaste: 2 }, 'Its owner was erased from history. The blade was not.'],
  ['ut_shattered_crown', 'Shattered Crown Ring', 'ring', 13, { att: 4, dex: 4 }, 'Shards: +10% crit chance, crits deal +50% more.', { critChance: 0.1, critMult: 0.5 }, 'A fragment of a crown nobody remembers.'],
  ['ut_mad_wrath', 'Mad God\u2019s Wrath', 'wand', 14, { att: 4 }, 'Madness: +35% damage and 15% double shots, but take 15% more damage.', { dmg: 0.35, doubleChance: 0.15, dmgTaken: 0.15 }, 'Pure, furious madness, pointed outward.'],
  ['ut_oryx_crown', 'Crown of the Mad God', 'helm', 14, { hp: 80 }, 'Undying: survive a killing blow once every 2 minutes; reflect 20% of damage.', { cheatDeath: 120, reflect: 0.2 }, 'Heavy is the head.'],
  ['ut_mad_ring', 'Ring of the Mad God', 'ring', 14, { hp: 100, att: 4, dex: 4 }, 'Favor: +15% damage, take 15% less damage, kills heal 5% HP.', { dmg: 0.15, dr: 0.15, killHeal: 0.05 }, 'It tightens when you think of leaving.'],
  ['ut_cubic_staff', 'Cubic Staff', 'staff', 11, { dex: 3 }, 'Cubed: every hit has a 10% chance to deal 4× damage.', { luckyChance: 0.1, luckyMult: 4 }, 'Perfectly square, somehow.'],
  ['ut_riddle_ring', 'Sphinx\u2019s Riddle', 'ring', 11, { wis: 6, mp: 60 }, 'Enigma: every third ability cast is free.', { freeCastEvery: 3 }, 'It asks a question. The answer is always mana.'],
  ['ut_lost_plate', 'Lost Lord\u2019s Plate', 'heavy', 11, { def: 3 }, 'Bulwark: completely block 20% of hits.', { block: 0.2 }, 'Armor from a kingdom that sank.'],
  ['ut_hermit_shell', 'Hermit\u2019s Shell', 'robe', 11, { wis: 4 }, 'Tidepool: regenerate 3% MP per second.', { mpRegenPct: 0.03 }, 'Something lived in it for a thousand years.'],
  ['ut_shrine_dagger', 'Shrine Flame Dagger', 'dagger', 11, { spd: 3 }, 'Flame skulls: kills burst, dealing 30% of the enemy\u2019s max HP to the next enemy.', { killCarry: 0.3 }, 'It keeps a little of everything it burns.'],
  // biome rares: about two days of farming each
  ['ut_lucky_coin', 'Bandit\u2019s Lucky Coin', 'ring', 2, { hp: 20, att: 1 }, 'Lucky: 6% of hits deal triple damage.', { luckyChance: 0.06, luckyMult: 3 }, 'Heads you win. Tails you also win.'],
  ['ut_warlord_cleaver', 'Warlord\u2019s Cleaver', 'sword', 3, { hp: 20 }, 'Warcry: kills give +30% attack speed for 2s.', { killHaste: 2 }, 'Notched from a hundred skirmishes.'],
  ['ut_nomad_wraps', 'Nomad\u2019s Wraps', 'robe', 4, { spd: 3 }, 'Mirage: +6% dodge, and regenerate 0.5% max HP per second.', { dodge: 0.06, regenPct: 0.005 }, 'Cool in the day, warm at night.'],
  ['ut_pixie_spell', 'Pixie Dust Spell', 'spell', 5, { wis: 2 }, 'Sparkle: every fourth cast is free.', { freeCastEvery: 4 }, 'Smells of honeysuckle and mischief.'],
  ['ut_cursed_bulwark', 'Cursed Knight\u2019s Bulwark', 'shield', 6, { def: 2 }, 'Spite: reflect 15% of damage taken and take 5% less damage.', { reflect: 0.15, dr: 0.05 }, 'Its last owner never stopped standing guard.'],
  ['ut_brimstone_bow', 'Brimstone Bow', 'bow', 7, { att: 2 }, 'Brimstone: every 5th volley explodes for 2.5× damage.', { burstEvery: 5, burstMult: 2.5 }, 'The string is a braided flame.'],
  ['ut_abyss_eye', 'Eye of the Abyss', 'ring', 9, { def: 2, wis: 2 }, 'Gaze: +6% crit chance, and +30% damage to enemies under 30% HP.', { critChance: 0.06, execute: 0.3 }, 'It looks back.'],
  ['ut_final_night', 'Robe of the Final Night', 'robe', 14, { att: 5, wis: 5 }, 'Last light: deal 50% more damage while under 40% HP.', { lowHpDmg: 0.5 }, 'Stitched from the last hour before the end.'],
];
for (const [id, name, type, eq, bonus, special, fx, desc] of UT) {
  const mult = 1;
  const base = { id, name, type, tier: 'UT', eq, desc, special, fx, utBonus: bonus };
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
