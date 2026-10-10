// What drops. Tier rolls favor the low end of a range; half of drops are gear the farming class can use.
import { CONFIG } from '../config.js';
import { CLASS, STATS } from '../data/classes.js';
import { ITEMS, WEAPON_TYPES, ARMOR_TYPES, ABILITY_LABEL } from '../data/items.js';
import { BIOMES, DUNGEONS, ENEMY_CURVE, ELITE, EVENT_BOSS, BOSS, ROOM } from '../data/world.js';

const ALL_KINDS = [...Object.keys(WEAPON_TYPES), ...Object.keys(ARMOR_TYPES), ...Object.keys(ABILITY_LABEL), 'ring'];

export function rollTier([lo, hi], rng) {
  const tiers = []; for (let t = lo; t <= hi; t++) tiers.push(t);
  const w = CONFIG.tierWeights;
  return rng.weighted(tiers, (t) => w[t - lo] ?? w[w.length - 1]);
}

export function rollItem(range, cls, rng) {
  const t = rollTier(range, rng);
  let kind;
  if (cls && rng.next() < CONFIG.classBias) {
    const C = CLASS[cls];
    kind = rng.pick([C.weapon, C.ability, C.armor, 'ring']);
  } else kind = rng.pick(ALL_KINDS);
  return kind === 'ring' ? `ring_${rng.pick(STATS)}_t${t}` : `${kind}_t${t}`;
}
export const rollPotion = (rng, sig) => `pot_${sig && rng.next() < 0.5 ? sig : rng.pick(STATS)}`;

/** Enemy template for a biome kill */
export function biomeEnemy(biome, rng) {
  if (biome.events && rng.next() < EVENT_BOSS.chance) {
    const ev = rng.pick(biome.events), L = biome.L;
    return { name: ev.name, sprite: ev.sprite, pal: ev.pal, elite: true, event: true, ut: ev.ut,
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

export function dungeonEnemy(d, mob, rng) {
  return {
    name: mob[0], sprite: mob[1], pal: d.pal, elite: false,
    hp: ENEMY_CURVE.hp(d.L) * ROOM.hp * rng.range(0.9, 1.1), dmg: ENEMY_CURVE.dmg(d.L) * ROOM.dmg,
    def: ENEMY_CURVE.def(d.L), rate: ENEMY_CURVE.rate, xp: 0,
  };
}
export function dungeonBoss(d) {
  return {
    name: d.boss, sprite: d.bossSprite, pal: d.pal, elite: true, boss: true,
    hp: ENEMY_CURVE.hp(d.L) * ROOM.hp * BOSS.hp, dmg: ENEMY_CURVE.dmg(d.L) * ROOM.dmg * BOSS.dmg,
    def: ENEMY_CURVE.def(d.L), rate: ENEMY_CURVE.rate * BOSS.rate, xp: 0,
  };
}

/** Where an item can be found, for the vault detail sheet. */
export function sourcesOf(it) {
  if (it.slot === 'potion') return { biomes: BIOMES.filter((b) => b.potionRate > 0).map((b) => b.name), dungeons: DUNGEONS.filter((d) => d.potions[1] > 0).map((d) => d.name) };
  if (it.slot === 'rune') return { biomes: [], dungeons: DUNGEONS.filter((d) => d.rune === it.id).map((d) => d.name) };
  if (it.tier === 'UT') {
    const ev = BIOMES.flatMap((b) => (b.events || []).filter((e) => e.ut === it.id).map((e) => `${e.name} (${b.name} event)`));
    return { biomes: ev, dungeons: DUNGEONS.filter((d) => d.uts.includes(it.id)).map((d) => d.name) };
  }
  const t = it.tier;
  return {
    biomes: BIOMES.filter((b) => t >= b.tiers[0] && t <= b.tiers[1]).map((b) => b.name),
    dungeons: DUNGEONS.filter((d) => t >= d.tiers[0] && t <= d.tiers[1]).map((d) => d.name),
  };
}
export const ALL_ITEM_IDS = Object.keys(ITEMS);
