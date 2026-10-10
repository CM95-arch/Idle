// Enemies and drops. Gear tiers only come from dungeon upgrades; loot here is potions, UTs and runes.
import { STATS } from '../data/classes.js';
import { ITEMS } from '../data/items.js';
import { BIOMES, DUNGEONS, ENEMY_CURVE, ELITE, EVENT_BOSS, BOSS, ROOM, PACK } from '../data/world.js';

export const rollPotion = (rng, sig) => `pot_${sig && rng.next() < 0.5 ? sig : rng.pick(STATS)}`;

// Enemies that fight from the back row. Stage 2 gives every biome hand-made groups; for now it goes by look.
const RANGED_SPRITES = new Set(['ghost', 'eye', 'wisp', 'lich']);
const isRanged = (base) => base.ranged ?? (RANGED_SPRITES.has(base.sprite) || /Archer|Shaman|Witch|Siren|Nomad/.test(base.name));

/** One group member at level L. mult: { hp, dmg, xp } on top of the pack share. */
function member(base, L, rng, mult = {}) {
  const worth = PACK.hp * (mult.hp ?? 1);
  return {
    name: base.name, sprite: base.sprite, pal: base.pal, elite: !!mult.elite, ranged: isRanged(base), worth,
    hp: ENEMY_CURVE.hp(L) * base.hp * worth * rng.range(0.92, 1.08),
    dmg: ENEMY_CURVE.dmg(L) * base.dmg * (mult.dmg ?? 1),
    def: ENEMY_CURVE.def(L), rate: ENEMY_CURVE.rate * (base.rate || 1) * PACK.rate,
    xp: ENEMY_CURVE.xp(L) * PACK.hp * (mult.xp ?? 1),
  };
}

/** A group of enemies for a biome fight. */
export function biomeWave(biome, rng) {
  const L = biome.L;
  const n = rng.int(...PACK.size);
  if (biome.events && rng.next() < EVENT_BOSS.chance * n * PACK.hp) { // same rate per classic enemy as before
    const ev = rng.pick(biome.events);
    const boss = { name: ev.name, sprite: ev.sprite, pal: ev.pal, elite: true, event: true, ut: ev.ut, worth: 1, row: 'f',
      hp: ENEMY_CURVE.hp(L) * EVENT_BOSS.hp, dmg: ENEMY_CURVE.dmg(L) * EVENT_BOSS.dmg, def: ENEMY_CURVE.def(L), rate: ENEMY_CURVE.rate, xp: ENEMY_CURVE.xp(L) * EVENT_BOSS.xp };
    return [boss];
  }
  const out = [];
  for (let i = 0; i < n; i++) {
    if (i === 0 && rng.next() < ELITE.chance * n) out.push(member(biome.elite, L, rng, { hp: ELITE.hp, dmg: ELITE.dmg, xp: ELITE.xp, elite: true }));
    else out.push(member(rng.weighted(biome.enemies, (e) => e.weight), L, rng));
  }
  return out;
}

export function dungeonEnemy(d, mob, rng) {
  return { ...member({ name: mob[0], sprite: mob[1], pal: d.pal, hp: 1, dmg: 1 }, d.L, rng, { hp: ROOM.hp, dmg: ROOM.dmg }), xp: 0 };
}
export function dungeonBoss(d) {
  return {
    name: d.boss, sprite: d.bossSprite, pal: d.pal, elite: true, boss: true, row: 'f', worth: 1,
    hp: ENEMY_CURVE.hp(d.L) * ROOM.hp * BOSS.hp, dmg: ENEMY_CURVE.dmg(d.L) * ROOM.dmg * BOSS.dmg,
    def: ENEMY_CURVE.def(d.L), rate: ENEMY_CURVE.rate * BOSS.rate, xp: 0,
  };
}

/** Where an item can be found, for the vault detail sheet. */
export function sourcesOf(it) {
  if (it.slot === 'potion') return { biomes: BIOMES.filter((b) => b.potionRate > 0).map((b) => b.name), dungeons: DUNGEONS.filter((d) => d.potions[1] > 0).map((d) => d.name) };
  if (it.slot === 'rune') return { biomes: [], dungeons: DUNGEONS.filter((d) => d.rune === it.id).map((d) => d.name) };
  const ev = BIOMES.flatMap((b) => [...(b.ut === it.id ? [b.name] : []), ...(b.events || []).filter((e) => e.ut === it.id).map((e) => `${e.name} (${b.name} event)`)]);
  return { biomes: ev, dungeons: DUNGEONS.filter((d) => d.uts.includes(it.id)).map((d) => d.name) };
}
export const ALL_ITEM_IDS = Object.keys(ITEMS);
