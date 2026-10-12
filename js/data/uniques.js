// Unique items: named pieces with a special effect, dropped by a zone's boss (rarely by its other enemies).
// Their stats always keep pace with your progress, and you keep them when you Ascend.
// fx: the effect battle.js applies; v: how strong; extra: a fixed bonus stat; ring: a ring's main stat.
export const UNIQUES = [
  { id: 'coralBow', name: 'Coral Bow', kind: 'bow', zone: 0, fx: 'multishot', v: 0.6, extra: { k: 'spdPct', v: 10 }, desc: 'Every arrow splits: each shot also strikes a second enemy for 60% damage.' },
  { id: 'pearl', name: 'Pearl of the Deep', kind: 'ring', ring: 'hp', zone: 0, fx: 'regen', v: 0.02, extra: { k: 'hpPct', v: 12 }, desc: 'Restores 2% of max HP every second.' },
  { id: 'dwarfAxe', name: 'Axe of the Dwarf King', kind: 'sword', zone: 1, fx: 'critDmg', v: 1.5, extra: { k: 'crit', v: 10 }, desc: 'Critical hits deal 3.5× damage instead of 2×.' },
  { id: 'dwarfCrown', name: 'Crown of the Dwarf King', kind: 'helm', zone: 1, fx: 'cdr', v: 0.4, extra: { k: 'hpPct', v: 10 }, desc: 'Ability recharges 40% faster.' },
  { id: 'lichStaff', name: 'Staff of the Lich', kind: 'staff', zone: 2, fx: 'echo', v: 0.5, extra: { k: 'crit', v: 6 }, desc: 'Abilities cast twice. The echo has 50% power.' },
  { id: 'phylactery', name: 'Phylactery Robe', kind: 'robe', zone: 2, fx: 'revive', v: 0.4, extra: { k: 'hpPct', v: 10 }, desc: 'Once per fight, cheats death and rises again with 40% HP.' },
  { id: 'barkPlate', name: 'Ancient Bark Plate', kind: 'heavy', zone: 3, fx: 'thorns', v: 0.3, extra: { k: 'defPct', v: 15 }, desc: 'Enemies that hit the wearer take 30% of their attack back as damage.' },
  { id: 'seedTome', name: 'Tome of the Elder Seed', kind: 'tome', zone: 3, fx: 'partyRegen', v: 0.006, extra: { k: 'hpPct', v: 10 }, desc: 'The whole party restores 0.6% of max HP every second.' },
  { id: 'sphinxFang', name: 'Fang of the Sphinx', kind: 'dagger', zone: 4, fx: 'execute', v: 1, extra: { k: 'crit', v: 8 }, desc: 'Attacks deal double damage to enemies below 30% HP.' },
  { id: 'riddleRing', name: 'Riddle Ring', kind: 'ring', ring: 'atk', zone: 4, fx: 'luck', v: 0.2, extra: { k: 'famePct', v: 20 }, desc: 'Luck: gear drops are much more likely to be rare, and Uniques drop more often.' },
  { id: 'duskCloak', name: 'Cloak of Dusk', kind: 'cloak', zone: 4, fx: 'dodge', v: 0.25, extra: { k: 'spdPct', v: 8 }, desc: 'Dodges 25% of enemy shots.' },
  { id: 'guardianShield', name: 'Bulwark of the Guardian', kind: 'shield', zone: 5, fx: 'guard', v: 0.15, extra: { k: 'defPct', v: 15 }, desc: 'Takes 15% less damage from every hit.' },
  { id: 'sunderWand', name: 'Wand of Sundering', kind: 'wand', zone: 5, fx: 'bossDmg', v: 0.6, extra: { k: 'crit', v: 6 }, desc: 'Deals 60% more damage to bosses.' },
  { id: 'madBlade', name: 'Blade of the Mad God', kind: 'sword', zone: 6, fx: 'aura', v: 0.15, extra: { k: 'crit', v: 8 }, desc: 'While the wielder stands, the whole party deals 15% more damage.' },
  { id: 'madHide', name: 'Hide of the Mad God', kind: 'leather', zone: 6, fx: 'haste', v: 0.3, extra: { k: 'hpPct', v: 12 }, desc: 'Attacks 30% faster.' },
  { id: 'conflictOrb', name: 'Orb of Conflict', kind: 'scepter', zone: 6, fx: 'firstStrike', v: 1, extra: { k: 'atkPct', v: 12 }, desc: 'Ability is ready the instant each wave begins.' },
];
export const UNIQUE = Object.fromEntries(UNIQUES.map((u) => [u.id, u]));
/** Effects that stack across items (summed); the rest just switch on. */
export const FX_SUM = new Set(['multishot', 'regen', 'critDmg', 'cdr', 'echo', 'thorns', 'partyRegen', 'execute', 'luck', 'dodge', 'guard', 'bossDmg', 'aura', 'haste']);
