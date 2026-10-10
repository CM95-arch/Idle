// What drops. Biomes give XP and potions; dungeons give gear (tiered items and UTs), potions and runes.
import { CONFIG } from '../config.js';
import { CLASS, STATS } from '../data/classes.js';
import { ITEMS, WEAPON_TYPES, ARMOR_TYPES, ABILITY_LABEL } from '../data/items.js';
import { BIOMES, DUNGEONS, ENEMY_CURVE, ELITE, EVENT_BOSS } from '../data/world.js';

export const rollPotion = (rng, sig) => `pot_${sig && rng.next() < 0.5 ? sig : rng.pick(STATS)}`;

/** Enemy template for a biome kill */
export function biomeEnemy(biome, rng) {
  if (biome.events && rng.next() < EVENT_BOSS.chance) {
    const ev = rng.pick(biome.events), L = biome.L;
    return { name: ev.name, sprite: ev.sprite, pal: ev.pal, elite: true, event: true,
      hp: ENEMY_CURVE.hp(L) * EVENT_BOSS.hp, dmg: ENEMY_CURVE.dmg(L) * EVENT_BOSS.dmg, def: ENEMY_CURVE.def(L), rate: ENEMY_CURVE.rate, xp: ENEMY_CURVE.xp(L) * EVENT_BOSS.xp };
  }
  const elite = rng.next() < ELITE.chance;
  const base = elite ? biome.elite : rng.weighted(biome.enemies, (e) => e.weight);
  const L = biome.L;
  return {
    name: base.name, sprite: base.sprite, pal: base.pal, elite,
    hp: ENEMY_CURVE.hp(L) * base.hp * (elite ? ELITE.hp : 1) * rng.range(0.92, 1.08),
    dmg: ENEMY_CURVE.dmg(L) * base.dmg * (elite ? ELITE.dmg : 1),
    def: ENEMY_CURVE.def(L), rate: ENEMY_CURVE.rate * base.rate,
    xp: ENEMY_CURVE.xp(L) * (elite ? ELITE.xp : 1),
  };
}

// ---------- dungeon gear ----------
const ALL_KINDS = [...Object.keys(WEAPON_TYPES), ...Object.keys(ARMOR_TYPES), ...Object.keys(ABILITY_LABEL), 'ring'];
function rollTier([lo, hi], rng) {
  const tiers = []; for (let t = lo; t <= hi; t++) tiers.push(t);
  const w = CONFIG.tierWeights;
  return rng.weighted(tiers, (t) => w[t - lo] ?? w[w.length - 1]);
}
/** A tiered item from a dungeon's range; most drops fit the hero's class. */
export function rollGear(d, cls, rng) {
  const t = rollTier(d.tiers, rng);
  let kind;
  if (cls && rng.next() < CONFIG.classBias) { const C = CLASS[cls]; kind = rng.pick([C.weapon, C.ability, C.armor, 'ring']); }
  else kind = rng.pick(ALL_KINDS);
  return kind === 'ring' ? `ring_${rng.pick(STATS)}_t${t}` : `${kind}_t${t}`;
}
/** Bag color for an item, Realm style. */
export function bagOf(id) {
  const it = ITEMS[id];
  if (!it) return 'brown';
  if (it.tier === 'UT') return 'white';
  if (it.slot === 'potion') return 'brown';
  if (it.slot === 'rune') return 'gold';
  return it.tier >= 11 ? 'cyan' : it.tier >= 7 ? 'purple' : 'pink';
}

/** Where an item can be found, for the vault detail sheet. */
export function sourcesOf(it) {
  if (it.slot === 'potion') return { biomes: BIOMES.filter((b) => b.potionRate > 0).map((b) => b.name), dungeons: DUNGEONS.filter((d) => d.potions[1] > 0).map((d) => d.name) };
  if (it.slot === 'rune') return { biomes: [], dungeons: DUNGEONS.filter((d) => d.rune === it.id).map((d) => d.name) };
  if (it.tier === 'UT') return { biomes: [], dungeons: DUNGEONS.filter((d) => d.uts.includes(it.id)).map((d) => d.name) };
  return { biomes: [], dungeons: DUNGEONS.filter((d) => it.tier >= d.tiers[0] && it.tier <= d.tiers[1]).map((d) => d.name) };
}
/** The dungeon a UT comes from (for its reforge cost). */
export const utDungeon = (id) => DUNGEONS.find((d) => d.uts.includes(id));
