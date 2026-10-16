// The auto-battle: a horde. Enemies stream in without end while the party holds its ground; kill enough of
// them and the stage is cleared, and the fight rolls straight on into the next one. Every tenth stage a boss
// joins the horde. Pure simulation stepped in fixed ticks, on a flat ground plane (x right, y down).
// The same code runs on screen, offline, and in the tools/. It also emits events (shots, hits, deaths, ...)
// that ui/battleView.js turns into visuals.
import { BAL } from '../data/balance.js';
import { CLASSES } from '../data/classes.js';
import { zoneOf, isBoss, isDungeon, levelOf } from '../data/zones.js';
import { makeRng } from './rng.js';

export const TICK = 0.05;
export const WORLD = { w: 360, h: 430 };
const ENEMY_SHOT_SPEED = 190, TIME_LIMIT = 150, SURGE = 8;
const HERO_R = 15;
// where the party stands: the tank (or first hero) in front, the others either side behind
const SPOTS = [{ x: 180, y: 290 }, { x: 122, y: 338 }, { x: 238, y: 338 }];
const RANGED = new Set(['beholder', 'ghost', 'lich', 'sphinx', 'oryx', 'kraken']);

/** Enemy strength at a stage in a Realm (one enemy of the horde). */
export function enemyStats(stage, realm) {
  // stages are counted in Realm difficulty (a dungeon's start at its level). A new Realm's extra strength phases
  // in over its first stages, so a party back at level 1 can find its feet; dungeons have it in full.
  const lvl = levelOf(stage), ramp = isDungeon(stage) ? 1 : Math.min(1, stage / BAL.realmRamp);
  // the first zones are gentler too, easing up to full strength by stage 30, so a new party gets going fast
  const g = BAL.stageGrowth ** lvl * BAL.realmGrowth ** (realm * ramp) * (0.55 + 0.45 * Math.min(1, lvl / 30)), E = BAL.enemyBase;
  return { hp: E.hp * g, atk: E.atk * g, def: Math.min(0.4, E.armor * Math.floor(lvl / 10)) };
}
// Armor is a share of damage: enemies have a flat armor share per zone (def is 0..0.4); heroes' DEF is weighed
// against the attacker's ATK, so it stays useful at every stage without ever making anyone immune.
const hit = (atk, def) => atk * (1 - def);
// tanks also shrug off a flat share of every hit (Guard), since they draw most of the fire
const heroArmor = (h, eatk) => 1 - (1 - h.def / (h.def + 2.5 * eatk)) * (h.role === 'tank' ? 1 - BAL.tankGuard : 1) * (1 - Math.min(0.6, h.fx.guard || 0));
const abilityCd = (h) => CLASSES[h.cls].ability.cd * (1 - Math.min(0.6, h.fx?.cdr || 0));
const d2 = (a, b) => (a.x - b.x) ** 2 + (a.y - b.y) ** 2;
const alive = (arr) => arr.filter((x) => !x.dead && x.hp > 0);
const within = (es, p, R) => es.filter((e) => d2(e, p) <= (R + e.r) ** 2);
const nearest = (es, p) => { let best = null, bd = Infinity; for (const e of es) { const d = d2(e, p); if (d < bd) { bd = d; best = e; } } return best; };

// formation spots, [left, front, right] (see FORM_SLOTS in game.js)
const FORM_POS = [{ x: 122, y: 338 }, { x: 180, y: 290 }, { x: 238, y: 338 }];
function placeHeroes(stats) {
  if (stats.every((s) => s.slot >= 0 && s.slot < 3)) return stats.map((s) => FORM_POS[s.slot]);
  const front = Math.max(0, stats.findIndex((s) => s.role === 'tank'));
  const order = [front, ...stats.map((_, i) => i).filter((i) => i !== front)];
  const spots = stats.length === 1 ? [{ x: 180, y: 318 }] : stats.length === 2 ? [SPOTS[0], { x: 180, y: 346 }] : SPOTS;
  const pos = []; order.forEach((i, k) => { pos[i] = spots[k]; });
  return pos;
}
function makeHero(s, i, pos, keep) {
  const h = { ...s, fx: s.fx || {}, procs: s.procs || [], procT: [], thornT: 0, i, x: pos.x, y: pos.y, hx: pos.x, hy: pos.y, maxHp: s.hp, hp: s.hp, atkT: 0.15 * i, cd: abilityCd(s) * (0.35 + 0.15 * i), buff: {}, dead: false, shield: 0, shots: 0, rampId: 0, ramp: 0 };
  if (keep) { h.x = keep.x; h.y = keep.y; h.hp = keep.dead ? 0 : Math.max(1, (keep.hp / keep.maxHp) * h.maxHp); h.dead = keep.dead; h.cd = Math.min(h.cd, keep.cd); h.shield = keep.shield; h.revived = keep.revived; h.procT = keep.procT; h.thornT = keep.thornT; }
  return h;
}

export function createBattle(stage, realm, heroStats, seed = (Math.random() * 2 ** 32) >>> 0) {
  const pos = placeHeroes(heroStats);
  const B = {
    stage, realm, rng: makeRng(seed), t: 0, state: 'fight', uid: 1, cleared: false,
    heroes: heroStats.map((s, i) => makeHero(s, i, pos[i])),
    enemies: [], pending: [], events: [], kills: 0, stageKills: 0, stageT: 0, spawnT: 0.4, surgeT: 0,
    bossSpawned: false, bossKilled: false, rez: null, rezUsed: false, zones: [],
  };
  startStage(B);
  return B;
}
/** Roll on into another stage without stopping the fight. */
export function advanceStage(B, stage) {
  B.stage = stage; B.cleared = false; B.stageKills = 0; B.stageT = 0; B.bossSpawned = false; B.bossKilled = false;
  for (const h of alive(B.heroes)) heal(B, h, h.maxHp * BAL.stageHeal);
  startStage(B);
}
/** Swap in fresh hero stats (a level-up, new gear) without losing anyone's HP share. */
export function refreshHeroes(B, heroStats) {
  if (heroStats.length !== B.heroes.length || heroStats.some((s, i) => s.cls !== B.heroes[i].cls)) return false;
  const pos = placeHeroes(heroStats);
  B.heroes = heroStats.map((s, i) => Object.assign(makeHero(s, i, pos[i], B.heroes[i]), { atkT: B.heroes[i].atkT, buff: B.heroes[i].buff, shots: B.heroes[i].shots }));
  return true;
}
function startStage(B) {
  B.quota = isBoss(B.stage) ? Infinity : BAL.stageKills;
  B.events.push({ k: 'stage', stage: B.stage, boss: isBoss(B.stage) });
  surge(B);
}
// every few seconds the horde surges: wave-start effects (barriers, heals, first strike) fire
function surge(B) {
  B.surgeT = SURGE;
  const hs = alive(B.heroes), sum = (k) => hs.reduce((a, o) => a + (o.fx[k] || 0), 0);
  const partyShield = sum('partyBarrier'), waveHeal = sum('waveHeal');
  for (const h of hs) {
    if (h.fx.firstStrike) h.cd = Math.min(h.cd, 0.25);
    const sh = h.maxHp * ((h.fx.barrier || 0) + partyShield);
    if (sh > h.shield) h.shield = sh;
    if (waveHeal) heal(B, h, h.maxHp * waveHeal);
  }
  if (partyShield || hs.some((h) => h.fx.barrier)) B.events.push({ k: 'barrier', heroes: hs.filter((h) => h.shield > 0).map((h) => h.i) });
}

// ---------- the horde ----------
function spawn(B, kind) {
  const Z = zoneOf(B.stage), base = enemyStats(B.stage, B.realm), boss = kind === 'boss', elite = kind === 'elite';
  const [name, sprite, pal] = boss ? Z.boss : Z.enemies[B.rng.int(0, Z.enemies.length - 1)];
  const m = boss ? { hp: BAL.bossHp, atk: BAL.bossAtk } : elite ? { hp: BAL.eliteHp, atk: BAL.eliteAtk } : { hp: 1, atk: 1 };
  // most come from ahead, some round the flanks
  const side = boss ? 0 : B.rng.next(), r = boss ? 30 : elite ? 15 : 11;
  const x = side < 0.7 ? 20 + B.rng.next() * 320 : side < 0.85 ? -r - 6 : WORLD.w + r + 6;
  const y = side < 0.7 ? -r - 8 : 20 + B.rng.next() * 200;
  const ranged = RANGED.has(sprite[0]) || ['staff', 'spear'].includes(sprite[1]?.weapon);
  const e = {
    id: B.uid++, name, sprite, pal, boss, elite, ranged, x: boss ? 180 : x, y, r,
    hp: base.hp * m.hp, maxHp: base.hp * m.hp, atk: base.atk * m.atk, def: base.def,
    spd: boss ? 0.55 : ranged ? 0.5 : 0.8, mv: boss ? 22 : (elite ? 26 : 34) * (0.85 + B.rng.next() * 0.3),
    atkT: 0.5 + B.rng.next() * 0.8, n: 0, stunUntil: 0, slowUntil: 0, dots: [], target: -1, retarget: 0,
  };
  B.enemies.push(e);
  if (boss) B.events.push({ k: 'boss', id: e.id });
  return e;
}
function pickTarget(B, e) {
  const hs = alive(B.heroes);
  if (!hs.length) return -1;
  // a tank draws most of the horde, but only while it's healthy: badly hurt, it falls back and the rest spread out
  const steady = hs.filter((h) => h.hp > h.maxHp * BAL.tankFallback);
  const taunt = steady.find((h) => h.buff.taunt > B.t) || steady.find((h) => h.role === 'tank');
  if (taunt && B.rng.next() < 0.75) return taunt.i;
  const pool = steady.length ? steady : hs;
  return B.rng.next() < 0.6 ? nearest(pool, e).i : pool[B.rng.int(0, pool.length - 1)].i;
}
function damageEnemy(B, e, d, src) {
  if (e.hp <= 0) return;
  // Cursed enemies take 25% more; Armor Broken ones lose their armor
  if (e.curseUntil > B.t) d *= 1.25;
  if (e.breakUntil > B.t && e.def > 0) d /= 1 - e.def;
  e.hp -= d;
  B.events.push({ k: 'hit', id: e.id, dmg: d, crit: src.crit, ab: src.ab, hero: src.hero });
  if (e.hp > 0) return;
  e.hp = 0; B.kills++; B.stageKills++;
  if (e.boss) B.bossKilled = true;
  B.events.push({ k: 'die', id: e.id, boss: e.boss, elite: e.elite, x: e.x, y: e.y });
  const killer = src.hero != null ? B.heroes[src.hero] : null;
  if (killer && !killer.dead && !src.spirit) onKillProcs(B, killer, e);
  // any kill: frenzied heroes speed up, and a corpse-burster makes the body explode (which can set off the next)
  let bomber = null;
  for (const h of alive(B.heroes)) {
    if (h.fx.frenzy) h.buff.frenzyUntil = B.t + 2.5;
    if (h.fx.corpse && (!bomber || h.fx.corpse > bomber.fx.corpse)) bomber = h;
  }
  const near = bomber ? within(alive(B.enemies), e, 70) : [];
  if (bomber) B.events.push({ k: 'blast', x: e.x, y: e.y, big: true });
  for (const o of near) damageEnemy(B, o, hit(e.maxHp * bomber.fx.corpse, o.def), { hero: bomber.i });
}
function heal(B, h, amt) {
  if (h.dead || h.hp <= 0) return;
  const before = h.hp; h.hp = Math.min(h.maxHp, h.hp + amt);
  if (h.hp > before + 0.5) B.events.push({ k: 'heal', hero: h.i, amt: h.hp - before });
}
function hurtHero(B, h, dmg, raw, from, big) {
  if (h.dead) return;
  if (h.buff.invulnUntil > B.t) { B.events.push({ k: 'dodge', hero: h.i, invuln: true }); return; }
  if (h.fx.dodge && B.rng.next() < h.fx.dodge) { B.events.push({ k: 'dodge', hero: h.i }); return; }
  if (h.buff.armorUntil > B.t) dmg *= 0.6; // Armored
  if (h.fx.vitProc && !(h.procCd > B.t)) { h.procCd = B.t + 25; h.buff.vitUntil = B.t + 10; B.events.push({ k: 'heal', hero: h.i, amt: 0 }); } // Mantle of the Monarchy
  const absorbed = Math.min(h.shield, dmg); h.shield -= absorbed;
  h.hp -= dmg - absorbed;
  B.events.push({ k: 'ehit', hero: h.i, dmg: dmg - absorbed, big, shield: absorbed > 0 });
  const thorn = h.procs.find((P) => P.kind === 'thornburst');
  if (thorn && !(h.thornT > B.t)) {
    h.thornT = B.t + thorn.cd;
    const list = within(alive(B.enemies), h, thorn.r);
    for (const o of list) damageEnemy(B, o, hit(procDmg(B, h, thorn), o.def), { hero: h.i, ab: true });
    B.events.push({ k: 'proc', kind: 'thornburst', hero: h.i, c: thorn.c, r: thorn.r, look: thorn.look });
  }
  if (from && h.fx.thorns && from.hp > 0) damageEnemy(B, from, raw * h.fx.thorns, { hero: h.i, thorns: true });
  if (from && h.buff.retaliateUntil > B.t && from.hp > 0) { damageEnemy(B, from, h.atk * h.buff.retaliate, { hero: h.i, thorns: true }); h.hp = Math.min(h.maxHp, h.hp + h.maxHp * 0.01); } // Crystal Shield
  if (h.hp <= 0 && h.fx.revive && !h.revived) { h.revived = true; h.hp = h.maxHp * h.fx.revive; B.events.push({ k: 'revive', hero: h.i }); }
  if (h.hp > 0) return;
  h.hp = 0; h.dead = true; B.events.push({ k: 'fall', hero: h.i });
  const healer = !B.rezUsed && alive(B.heroes).filter((o) => o.fx.rezAlly).sort((a, b) => b.fx.rezAlly - a.fx.rezAlly)[0];
  if (healer) { B.rezUsed = true; B.rez = { hero: h.i, at: B.t + 2, v: healer.fx.rezAlly, by: healer.i }; }
}
const aura = (B) => B.heroes.reduce((a, o) => (o.fx.aura && !o.dead ? a * (1 + o.fx.aura) : a), 1);
const dmgMult = (B, h) => aura(B) * (1 + (h.fx.glass || 0)) * (h.fx.lastStand && h.hp < h.maxHp * 0.4 ? 1 + h.fx.lastStand : 1) * (h.buff.dmgUntil > B.t ? 1 + h.buff.dmg : 1) * (alive(B.heroes).some((o) => o.buff.partyUntil > B.t) ? 1 + Math.max(...B.heroes.map((o) => (o.buff.partyUntil > B.t ? o.buff.party : 0))) : 1);

// the thickest knot of enemies: where an area attack does the most
function cluster(es) {
  let best = es[0], bn = -1;
  for (const e of es) { let n = 0; for (const o of es) if (d2(e, o) < 60 * 60) n++; if (n > bn) { bn = n; best = e; } }
  return best;
}

// ---------- Unique effects you can see ----------
// Each Unique may carry `proc` effects: timed ones fire every `every` seconds (nova, orbit, meteor, bubble, halo,
// frost, healwave); others answer an event (thornburst when hit, lightning on a crit, spirit and vamp on a kill).
// Damage is `pow` × the hero's ATK (one second of its fire).
const procDmg = (B, h, P) => h.atk * P.pow * dmgMult(B, h);
function runProc(B, h, P, k, es) {
  const ev = { k: 'proc', kind: P.kind, hero: h.i, c: P.c, r: P.r, look: P.look, slot: k };
  switch (P.kind) {
    case 'nova': {
      const list = within(es, h, P.r);
      for (const o of list) { damageEnemy(B, o, hit(procDmg(B, h, P), o.def), { hero: h.i, ab: true }); if (P.slow) o.slowUntil = Math.max(o.slowUntil, B.t + P.slow); if (P.stun) o.stunUntil = Math.max(o.stunUntil, B.t + P.stun * (o.boss ? 0.3 : 1)); }
      ev.x = h.x; ev.y = h.y; break;
    }
    case 'orbit': {
      const t = nearest(es.filter((o) => d2(o, h) < (P.r + o.r) ** 2), h);
      if (!t) return;
      damageEnemy(B, t, hit(procDmg(B, h, P), t.def), { hero: h.i, ab: true });
      ev.id = t.id; ev.n = P.n; break;
    }
    case 'meteor': {
      if (!es.length) return;
      const c = cluster(es);
      for (const o of within(es, c, P.r)) { damageEnemy(B, o, hit(procDmg(B, h, P), o.def), { hero: h.i, ab: true }); if (P.slow) o.slowUntil = Math.max(o.slowUntil, B.t + P.slow); }
      ev.x = c.x; ev.y = c.y; break;
    }
    case 'bubble': {
      const sh = h.maxHp * P.pow;
      if (h.shield >= sh) return;
      h.shield = sh; break;
    }
    case 'halo': case 'frost': {
      const list = within(es, h, P.r);
      if (!list.length) return;
      for (const o of list) { if (P.pow) damageEnemy(B, o, hit(procDmg(B, h, P), o.def), { hero: h.i, ab: true }); if (P.slow) o.slowUntil = Math.max(o.slowUntil, B.t + P.slow); }
      ev.ids = list.map((o) => o.id); break;
    }
    case 'healwave': {
      const hs = alive(B.heroes);
      if (!hs.some((o) => o.hp < o.maxHp * 0.95)) return;
      for (const o of hs) heal(B, o, o.maxHp * P.pow);
      ev.heroes = hs.map((o) => o.i); break;
    }
    default: return;
  }
  B.events.push(ev);
}
function onKillProcs(B, h, e) {
  for (const P of h.procs) {
    if (P.kind === 'spirit' && B.rng.next() < P.chance) {
      const t = nearest(alive(B.enemies).filter((o) => o !== e && d2(o, e) < 200 * 200), e);
      if (!t) continue;
      const flight = 0.25 + Math.sqrt(d2(t, e)) / 420;
      B.pending.push({ side: 'hero', to: t.id, dmg: hit(procDmg(B, h, P), t.def), hero: h.i, spirit: true, ab: true, at: B.t + flight });
      B.events.push({ k: 'proc', kind: 'spirit', hero: h.i, x: e.x, y: e.y, id: t.id, flight, c: P.c });
    }
    if (P.kind === 'vamp' && B.rng.next() < P.chance) {
      heal(B, h, h.maxHp * P.pow);
      B.events.push({ k: 'proc', kind: 'vamp', hero: h.i, x: e.x, y: e.y, c: P.c });
    }
  }
}

// Starter ability items: effects that go off with every cast (`on: 'cast'`), each with a rune circle under the
// hero. meteor, fan and lightning hit `n` foes picked from the nearest few; the rest work as their timed kinds.
function castProcs(B, h, es) {
  const list = h.procs.filter((P) => P.on === 'cast');
  if (!list.length || !es.length) return;
  B.events.push({ k: 'proc', kind: 'sigil', hero: h.i, c: list[0].c });
  const near = [...es].sort((a, b) => d2(a, h) - d2(b, h)).slice(0, 8);
  const pick = (n) => { const pool = [...near], out = []; while (out.length < n && pool.length) out.push(pool.splice(B.rng.int(0, pool.length - 1), 1)[0]); return out; };
  for (const P of list) {
    const k = h.procs.indexOf(P);
    if (P.kind === 'meteor' || P.kind === 'lightning') {
      pick(P.n || 1).forEach((t, j) => {
        for (const o of within(es, t, P.r)) { damageEnemy(B, o, hit(procDmg(B, h, P), o.def), { hero: h.i, ab: true }); if (P.slow) o.slowUntil = Math.max(o.slowUntil, B.t + P.slow); }
        B.events.push({ k: 'proc', kind: P.kind, hero: h.i, c: P.c, r: P.r, look: P.look, x: t.x, y: t.y, delay: j * 0.12 });
      });
    } else if (P.kind === 'fan') {
      for (const t of pick(P.n || 1)) {
        const flight = 0.2 + Math.sqrt(d2(t, h)) / 520;
        if (P.slow) t.slowUntil = Math.max(t.slowUntil, B.t + P.slow + flight);
        B.pending.push({ side: 'hero', to: t.id, dmg: hit(procDmg(B, h, P), t.def), hero: h.i, spirit: true, ab: true, at: B.t + flight });
        B.events.push({ k: 'proc', kind: 'spirit', hero: h.i, x: h.x, y: h.y - 10, id: t.id, flight, c: P.c });
      }
    } else runProc(B, h, P, k, es);
  }
}

// ---------- abilities ----------
const ECHOES = new Set(['aoe', 'heal', 'pierce', 'execute', 'stun', 'dot', 'drain', 'poison', 'chain']);
function useAbility(B, h, scale = 1) {
  const A = CLASSES[h.cls].ability, p = A.pow * h.pow * scale * (h.buff.powUntil > B.t ? 1 + h.buff.pow : 1), es = alive(B.enemies), hs = alive(B.heroes);
  if (!es.length) return;
  const dmg = h.atk * dmgMult(B, h) * (1 + (h.fx.abilityDmg || 0));
  const src = { hero: h.i, ab: true };
  const ev = { k: 'ability', hero: h.i, fx: A.fx, targets: [] };
  const strike = (list, f = 1, s = src) => { for (const e of list) { ev.targets.push(e.id); damageEnemy(B, e, hit(dmg * p * f, e.def), s); } };
  // a Unique ability item changes what the ability does (ROTMG's UT abilities)
  const M = h.abil || {};
  ev.mode = M.mode;
  if (h.fx.sourceHeal) heal(B, h, h.maxHp * h.fx.sourceHeal);
  switch (M.mode) {
    case 'snipe': { // Stormcaller Quiver: one enormous arrow into the toughest enemy, Dazing it
      const t = es.reduce((a, b) => (b.hp > a.hp ? b : a)); ev.x = t.x; ev.y = t.y;
      strike([t], M.pow); t.stunUntil = Math.max(t.stunUntil, B.t + M.daze * (t.boss ? 0.4 : 1)); B.events.push(ev); return;
    }
    case 'armorBreak': { // Bastion of the Keyper: Armor Broken instead of Stunned
      const list = within(es, h, 120); ev.x = h.x; ev.y = h.y;
      for (const e of list) e.breakUntil = B.t + M.dur; strike(list, M.pow); B.events.push(ev); return;
    }
    case 'paralyze': { // Siren's Snare: a burst that Paralyzes
      const c = cluster(es), list = within(es, c, BAL.aoeRadius); ev.x = c.x; ev.y = c.y;
      for (const e of list) e.stunUntil = Math.max(e.stunUntil, B.t + M.dur * (e.boss ? 0.3 : 1)); strike(list, M.pow); B.events.push(ev); return;
    }
    case 'portals': { // Spell of First Light: portals that keep zapping the area for seconds
      const c = cluster(es); ev.x = c.x; ev.y = c.y;
      B.zones.push({ x: c.x, y: c.y, r: BAL.aoeRadius * 1.15, until: B.t + M.dur, next: B.t, every: 0.4, dmg: (dmg * p * M.pow) / (M.dur / 0.4), hero: h.i });
      B.events.push(ev); return;
    }
    case 'twinBombs': { // Murky Toxin: two layered bombs on the thickest knot
      const c = cluster(es); ev.x = c.x; ev.y = c.y;
      for (const e of within(es, c, BAL.aoeRadius * 0.6)) { ev.targets.push(e.id); e.dots.push({ left: 4, dps: (dmg * p * M.inner) / 4, hero: h.i }); }
      for (const e of within(es, c, BAL.aoeRadius * 1.2)) { if (!ev.targets.includes(e.id)) ev.targets.push(e.id); e.dots.push({ left: 4, dps: (dmg * p * M.outer) / 4, hero: h.i }); }
      B.events.push(ev); return;
    }
    case 'vile': { // Trap of the Vile Spirit: a huge blast that Curses
      const c = cluster(es), list = within(es, c, BAL.aoeRadius); ev.x = c.x; ev.y = c.y;
      for (const e of list) e.curseUntil = B.t + M.curse; strike(list, M.pow); B.events.push({ ...ev, mode: 'paralyze' }); return;
    }
    case 'archerang': { // Archerang: out and back through a line, Slowing and Paralyzing all it passes
      const t = nearest(es, h), dx = t.x - h.x, dy = t.y - h.y, L = Math.hypot(dx, dy) || 1, ux = dx / L, uy = dy / L;
      ev.x = h.x + ux * 300; ev.y = h.y + uy * 300;
      const list = es.filter((e) => { const along = (e.x - h.x) * ux + (e.y - h.y) * uy, off = Math.abs((e.x - h.x) * uy - (e.y - h.y) * ux); return along > 0 && along < 300 && off < 20 + e.r; });
      for (const e of list) { e.slowUntil = Math.max(e.slowUntil, B.t + M.dur); e.stunUntil = Math.max(e.stunUntil, B.t + M.dur * (e.boss ? 0.3 : 1)); }
      strike(list, M.pow * 2); B.events.push({ ...ev, fx: 'pierce' }); return;
    }
    case 'souls': { // Wandering Souls Spell: heavy armor-ignoring ghost bolts into the nearest pack, sometimes freeing a soul
      const t = nearest(es, h); ev.x = t.x; ev.y = t.y;
      for (const e of within(es, t, 70)) { ev.targets.push(e.id); damageEnemy(B, e, dmg * p * M.pow, src); }
      if (B.rng.next() < M.soul) B.zones.push({ x: t.x, y: t.y, r: 60, until: B.t + 6, next: B.t, every: 0.5, dmg: dmg * p * 0.12, hero: h.i, soul: true });
      B.events.push({ ...ev, fx: 'aoe' }); return;
    }
    case 'plague': { // Plague Poison: a vast cloud that poisons nearly everything over 10 seconds
      const c = cluster(es); ev.x = c.x; ev.y = c.y;
      for (const e of within(es, c, 9 * TILE)) { ev.targets.push(e.id); e.dots.push({ left: 10, dps: (dmg * p * M.pow) / 10, hero: h.i }); }
      B.events.push({ ...ev, mode: 'twinBombs' }); return;
    }
    case 'crystal': { // Crystal Shield: turtle up, Armored, firing back at every attacker
      h.buff.armorUntil = B.t + M.dur; h.buff.retaliateUntil = B.t + M.dur; h.buff.retaliate = M.retaliate; ev.x = h.x; ev.y = h.y;
      B.events.push({ ...ev, fx: 'berserk' }); return;
    }
    case 'plant': { // Perennial Cranium: a skull-flower that blasts and heals for 5 seconds
      const c = cluster(es), x = (c.x + h.x) / 2, y = (c.y + h.y) / 2; ev.x = x; ev.y = y;
      B.zones.push({ x, y, r: 5 * TILE * 0.6, until: B.t + M.dur, next: B.t, every: 0.8, dmg: (dmg * p * M.pow) / (M.dur / 0.8), hero: h.i, heal: 0.03, plant: true });
      B.events.push({ ...ev, mode: 'portals' }); return;
    }
    case 'pain': { // Tome of Pain: blast everything within 6 tiles, heal weakly
      ev.x = h.x; ev.y = h.y; strike(within(es, h, 6 * TILE), M.dmg / A.pow);
      for (const o of hs) heal(B, o, o.maxHp * p * M.heal * 0.5); ev.heroes = hs.map((o) => o.i);
      B.events.push({ ...ev, fx: 'stun' }); return;
    }
    case 'scholar': { // Scholar's Seal: no heal, no damage buff; the party's abilities come round sooner
      for (const o of hs) { if (o !== h) o.cd = Math.max(0, o.cd - M.cd); o.buff.powUntil = B.t + 6; o.buff.pow = M.wis; } ev.heroes = hs.map((o) => o.i);
      B.events.push({ ...ev, fx: 'buff' }); return;
    }
    case 'visage': { // Vanguard's Visage: party Berserk, plus a piercing, armor-ignoring bolt
      h.buff.taunt = B.t + 3; for (const o of hs) { o.buff.hasteUntil = B.t + 3; o.buff.haste = Math.max(o.buff.haste || 0, p * 0.6); }
      const t = nearest(es, h), dx = t.x - h.x, dy = t.y - h.y, L = Math.hypot(dx, dy) || 1, ux = dx / L, uy = dy / L;
      ev.x = h.x + ux * 400; ev.y = h.y + uy * 400; ev.heroes = hs.map((o) => o.i);
      for (const e of es) { const along = (e.x - h.x) * ux + (e.y - h.y) * uy, off = Math.abs((e.x - h.x) * uy - (e.y - h.y) * ux); if (along > 0 && off < 16 + e.r) { ev.targets.push(e.id); damageEnemy(B, e, h.atk * dmgMult(B, h) * M.pow, src); } }
      B.events.push({ ...ev, fx: 'pierce' }); return;
    }
    case 'shadows': { // Quiver of Shadows: a fan of six armor-piercing arrows through the horde
      const t = nearest(es, h), a0 = Math.atan2(t.y - h.y, t.x - h.x), hitSet = new Set(); ev.x = t.x; ev.y = t.y;
      for (let k = 0; k < 6; k++) {
        const a = a0 + ((k - 2.5) * M.arc * Math.PI) / 180, ux = Math.cos(a), uy = Math.sin(a);
        for (const e of es) { const along = (e.x - h.x) * ux + (e.y - h.y) * uy, off = Math.abs((e.x - h.x) * uy - (e.y - h.y) * ux); if (along > 0 && along < 10 * TILE && off < 14 + e.r) hitSet.add(e); }
      }
      for (const e of hitSet) { ev.targets.push(e.id); damageEnemy(B, e, dmg * p * M.pow, src); }
      B.events.push({ ...ev, fx: 'pierce' }); return;
    }
    case 'polarity': { // Polarity Poison: a grenade that poisons and Slows everything in the splash
      const c = cluster(es); ev.x = c.x; ev.y = c.y;
      for (const e of within(es, c, BAL.aoeRadius * 1.1)) { ev.targets.push(e.id); e.dots.push({ left: 3, dps: (dmg * p * M.pow) / 3, hero: h.i }); e.slowUntil = Math.max(e.slowUntil, B.t + M.slow); }
      B.events.push({ ...ev, mode: 'twinBombs' }); return;
    }
    case 'sentinel': { // Sentinel's Bulwark: stuns everything nearby and breaks its armor
      const list = within(es, h, 140); ev.x = h.x; ev.y = h.y;
      for (const e of list) { e.stunUntil = Math.max(e.stunUntil, B.t + M.stun * (e.boss ? 0.4 : 1)); e.breakUntil = B.t + M.dur; }
      strike(list, M.pow); B.events.push({ ...ev, fx: 'stun' }); return;
    }
    case 'starfall': { // Spell of Shattered Stars: three falling stars on the three thickest knots, Cursing them
      ev.x = h.x; ev.y = h.y; let pool = es;
      for (let k = 0; k < 3 && pool.length; k++) {
        const c = cluster(pool), list = within(pool, c, BAL.aoeRadius * 0.8);
        for (const e of list) e.curseUntil = B.t + M.curse;
        strike(list, M.pow); B.events.push({ k: 'blast', x: c.x, y: c.y, big: true });
        pool = pool.filter((e) => !list.includes(e));
      }
      B.events.push({ ...ev, fx: 'aoe', x: cluster(es).x, y: cluster(es).y }); return;
    }
    case 'marbleTome': { // Tome of the Marble Halls: heals the whole party and Armors them
      for (const o of hs) { heal(B, o, o.maxHp * p * M.heal); o.buff.armorUntil = Math.max(o.buff.armorUntil || 0, B.t + M.dur); } ev.heroes = hs.map((o) => o.i);
      B.events.push({ ...ev, fx: 'heal' }); return;
    }
    case 'fulminate': case 'devastate': { // scepters: chain lightning, with their own reach and falloff
      let at = nearest(es, h); const seen = new Set();
      for (let k = 0; at && k < M.targets; k++) {
        seen.add(at); ev.targets.push(at.id); damageEnemy(B, at, hit(dmg * p * M.pow * M.falloff ** k, at.def), src);
        if (M.slow) at.slowUntil = Math.max(at.slowUntil, B.t + M.slow);
        at = nearest(es.filter((e) => !seen.has(e) && d2(e, at) < 130 * 130), at);
      }
      B.events.push({ ...ev, fx: 'chain' }); return;
    }
    default: break;
  }
  switch (A.fx) {
    case 'aoe': { const c = cluster(es); ev.x = c.x; ev.y = c.y; strike(within(es, c, BAL.aoeRadius)); break; }
    case 'heal': {
      if (M.mode === 'holyProtection') { for (const o of hs) heal(B, o, o.maxHp * p * 0.6); h.buff.armorUntil = B.t + 4; ev.heroes = hs.map((o) => o.i); break; }
      const t = hs.reduce((a, b) => (b.hp / b.maxHp < a.hp / a.maxHp ? b : a)); ev.heroes = [t.i]; heal(B, t, t.maxHp * p * (M.heal || 1)); break;
    }
    case 'pierce': {
      // a line from the archer through the nearest enemy and on, hitting all it passes
      const t = nearest(es, h), dx = t.x - h.x, dy = t.y - h.y, L = Math.hypot(dx, dy) || 1, ux = dx / L, uy = dy / L;
      ev.x = h.x + ux * 420; ev.y = h.y + uy * 420;
      strike(es.filter((e) => { const along = (e.x - h.x) * ux + (e.y - h.y) * uy, off = Math.abs((e.x - h.x) * uy - (e.y - h.y) * ux); return along > 0 && off < 22 + e.r; }));
      break;
    }
    case 'execute': strike([...es].sort((a, b) => a.hp - b.hp).slice(0, 3), 1, { ...src, crit: true }); if (M.mode === 'planewalk') h.buff.invulnUntil = B.t + M.dur; if (M.mode === 'bloody' || M.mode === 'twilight') { h.buff.dmgUntil = B.t + M.dur; h.buff.dmg = M.dmg; } if (M.mode === 'twilight') h.buff.invulnUntil = B.t + M.inv; break;
    case 'berserk': h.buff.taunt = B.t + 4; h.buff.hasteUntil = B.t + 4; h.buff.haste = p;
      if (M.mode === 'juggernaut') { h.buff.armorUntil = B.t + 4.5; for (const o of hs) { o.buff.hasteUntil = B.t + 4.5; o.buff.haste = Math.max(o.buff.haste || 0, p * 0.6); } ev.heroes = hs.map((o) => o.i); } for (const e of es) if (!e.ranged && B.rng.next() < 0.6) e.target = h.i; break;
    case 'stun': { const list = within(es, h, 120); for (const e of list) e.stunUntil = B.t + 1.2 * (e.boss ? 0.5 : 1); ev.x = h.x; ev.y = h.y; strike(list); break; }
    case 'dot': { const c = cluster(es); ev.x = c.x; ev.y = c.y; for (const e of within(es, c, BAL.aoeRadius)) { ev.targets.push(e.id); e.dots.push({ left: 4, dps: (dmg * p) / 4, hero: h.i }); e.slowUntil = B.t + 4; } break; }
    case 'drain': {
      const c = cluster(es); let tot = 0; ev.x = c.x; ev.y = c.y;
      for (const e of within(es, c, BAL.aoeRadius * (M.radius || 1))) { if (M.curse) e.curseUntil = B.t + M.curse; ev.targets.push(e.id); const d = hit(dmg * p, e.def); tot += d; damageEnemy(B, e, d, src); }
      for (const o of hs) heal(B, o, Math.min(o.maxHp * 0.2, (tot * 0.08 * (M.heal || 1)) / hs.length)); ev.heroes = hs.map((o) => o.i);
      break;
    }
    case 'poison': { const e = es.reduce((a, b) => (b.hp > a.hp ? b : a)); ev.targets.push(e.id); e.dots.push({ left: 5, dps: (dmg * p) / 5, hero: h.i }); break; }
    case 'buff': for (const o of hs) heal(B, o, o.maxHp * 0.1); h.buff.partyUntil = B.t + 5; h.buff.party = p; if (M.mode === 'invuln') h.buff.invulnUntil = B.t + M.dur; if (M.mode === 'marble') for (const o of hs) o.buff.armorUntil = Math.max(o.buff.armorUntil || 0, B.t + M.dur); ev.heroes = hs.map((o) => o.i); break;
    case 'chain': {
      // lightning leaps from enemy to nearby enemy, weaker with each jump
      let at = nearest(es, h); const seen = new Set();
      for (let k = 0; at && k < 7; k++) {
        seen.add(at); ev.targets.push(at.id); damageEnemy(B, at, hit(dmg * p * 0.8 ** k, at.def), src);
        at = nearest(es.filter((e) => !seen.has(e) && d2(e, at) < 120 * 120), at);
      }
      break;
    }
    default: break;
  }
  B.events.push(ev);
  if (scale === 1 && h.fx.echo && ECHOES.has(A.fx)) useAbility(B, h, h.fx.echo);
}

// ---------- a hero's shot, and what Unique weapons add to it ----------
const MODS = ['splash', 'chain', 'burn', 'chill', 'stun', 'leech', 'paralyze', 'curse', 'armorBreak', 'bleed'];
export const TILE = 32; // pixels per ROTMG tile
function fire(B, h, e, delay) {
  const fx = h.fx, S = h.shot;
  h.shots++;
  const charged = fx.charge && h.shots % fx.charge === 0;
  const crit = charged || B.rng.next() < h.crit;
  if (crit) for (const P of h.procs) if (P.kind === 'lightning' && B.rng.next() < P.chance) {
    for (const o of within(alive(B.enemies), e, P.r)) damageEnemy(B, o, hit(procDmg(B, h, P), o.def), { hero: h.i, ab: true });
    B.events.push({ k: 'proc', kind: 'lightning', hero: h.i, x: e.x, y: e.y, c: P.c, r: P.r });
  }
  if (fx.ramp) { if (h.rampId === e.id) h.ramp = Math.min(10, h.ramp + 1); else { h.rampId = e.id; h.ramp = 0; } }
  // the shot's damage is shared between its projectiles, so a full hit lands the hero's whole ATK
  const base = h.hit * (S.per ?? 1 / S.n) * dmgMult(B, h) * (crit ? 2 + (fx.critDmg || 0) : 1) * (charged ? fx.chargeX / 2 : 1) * (1 + (fx.ramp || 0) * h.ramp);
  const vs = (t) => hit(base * (t.boss ? 1 + (fx.bossDmg || 0) : 1) * (t.hp < t.maxHp * 0.3 ? 1 + (fx.execute || 0) : 1), S.ignoreDef ? 0 : t.def);
  const mods = MODS.some((k) => fx[k]) || S.onHit ? { ...fx, ...S.onHit } : null;
  const mod = fx.splash ? 'blast' : fx.chain ? 'chain' : fx.burn ? 'burn' : fx.chill ? 'chill' : null;
  const heavy = (S.per ?? 1 / S.n) > 1.4; // one huge projectile (Gravecaller Longbow, Mirewood Wand)
  const range = S.range * TILE, speed = S.speed * TILE, es = alive(B.enemies);
  const aim = Math.atan2(e.y - (h.y - 20), e.x - h.x);
  for (let k = 0; k < S.n; k++) {
    // fan the projectiles out by the arc gap; with no gap they fly side by side
    const off = k - (S.n - 1) / 2, ang = aim + (off * S.arc * Math.PI) / 180;
    const ux = Math.cos(ang), uy = Math.sin(ang), side = S.arc ? 0 : off * 7;
    const ox = h.x - uy * side, oy = h.y - 20 + ux * side;
    // what this projectile meets on its line: the first enemy, or every one if it pierces
    const struck = [];
    for (const t of es) {
      const along = (t.x - ox) * ux + (t.y - oy) * uy, across = Math.abs((t.x - ox) * uy - (t.y - oy) * ux);
      if (along > 0 && along < range + t.r && across < t.r + (S.wavy ? 7 : 4)) struck.push({ t, along });
    }
    struck.sort((a, b) => a.along - b.along);
    const hits = S.pierce ? struck : struck.slice(0, 1), far = hits.length && !S.pierce ? hits[0].along : range;
    for (const { t, along } of hits) B.pending.push({ side: 'hero', to: t.id, dmg: vs(t) * (S.vary ? 1 - S.vary + B.rng.next() * S.vary * 2 : 1), crit, hero: h.i, mods, at: B.t + along / speed + delay });
    B.events.push({ k: 'shot', hero: h.i, ang, x0: ox, y0: oy, len: far, flight: far / speed + delay, crit, mod, big: heavy || charged, look: S.look, color: S.color, wavy: S.wavy, size: S.size });
  }
}
function landShot(B, e, p) {
  const at = { x: e.x, y: e.y };
  damageEnemy(B, e, p.dmg, p);
  const m = p.mods;
  if (!m) return;
  const h = B.heroes[p.hero], src = { hero: p.hero };
  if (m.leech && h && !h.dead) h.hp = Math.min(h.maxHp, h.hp + p.dmg * m.leech);
  if (m.burn && e.hp > 0) { e.dots.push({ left: 3, dps: (p.dmg * m.burn) / 3, hero: p.hero }); B.events.push({ k: 'ignite', id: e.id }); }
  if (m.chill && e.hp > 0) { e.slowUntil = Math.max(e.slowUntil, B.t + m.chill); B.events.push({ k: 'chill', id: e.id, dur: m.chill }); }
  // ROTMG status effects from a weapon's shots (seconds)
  if (m.paralyze && e.hp > 0) { e.stunUntil = Math.max(e.stunUntil, B.t + m.paralyze * (e.boss ? 0.3 : 1)); B.events.push({ k: 'stunned', id: e.id }); }
  if (m.curse && e.hp > 0) { if (!(e.curseUntil > B.t)) B.events.push({ k: 'status', id: e.id, s: 'curse' }); e.curseUntil = B.t + m.curse; }
  if (m.armorBreak && e.hp > 0) { if (!(e.breakUntil > B.t)) B.events.push({ k: 'status', id: e.id, s: 'break' }); e.breakUntil = B.t + m.armorBreak; }
  if (m.bleed && e.hp > 0) e.dots.push({ left: 3, dps: (p.dmg * m.bleed) / 3, hero: p.hero });
  if (m.stun && e.hp > 0 && B.rng.next() < m.stun) { e.stunUntil = Math.max(e.stunUntil, B.t + 0.8 * (e.boss ? 0.5 : 1)); B.events.push({ k: 'stunned', id: e.id }); }
  const others = alive(B.enemies).filter((x) => x !== e);
  if (m.splash) { B.events.push({ k: 'blast', x: at.x, y: at.y, big: m.splash >= 0.7 }); for (const o of within(others, at, BAL.splashRadius)) damageEnemy(B, o, p.dmg * m.splash, src); }
  if (m.chain) {
    const ids = []; let from = at, k = 0;
    for (const seen = new Set(); k < 4; k++) {
      const o = nearest(others.filter((x) => !seen.has(x) && d2(x, from) < 110 * 110), from);
      if (!o) break;
      seen.add(o); ids.push(o.id); damageEnemy(B, o, p.dmg * m.chain ** (k + 1), src); from = o;
    }
    if (ids.length) B.events.push({ k: 'arc', from: e.id, x: at.x, y: at.y, ids });
  }
}

// ---------- one tick ----------
function moveEnemies(B, dt) {
  const es = alive(B.enemies), hs = alive(B.heroes);
  for (const e of es) {
    if (e.stunUntil > B.t) continue;
    if ((e.retarget -= dt) <= 0 || !B.heroes[e.target] || B.heroes[e.target].dead) { e.target = pickTarget(B, e); e.retarget = 2 + B.rng.next() * 2; }
    const t = B.heroes[e.target];
    if (!t) continue;
    const stop = e.boss ? 150 : e.ranged ? 135 : HERO_R + e.r + 1;
    const dx = t.x - e.x, dy = t.y - e.y, L = Math.hypot(dx, dy) || 1;
    if (L > stop) { const v = e.mv * (e.slowUntil > B.t ? 0.55 : 1) * dt; e.x += (dx / L) * Math.min(v, L - stop); e.y += (dy / L) * Math.min(v, L - stop); }
  }
  // the horde jostles: nobody stands inside anybody else
  for (let i = 0; i < es.length; i++) {
    const a = es[i];
    for (let j = i + 1; j < es.length; j++) {
      const b = es[j], dx = b.x - a.x, dy = b.y - a.y, min = a.r + b.r, dd = dx * dx + dy * dy;
      if (dd >= min * min || dd === 0) continue;
      const L = Math.sqrt(dd), push = (min - L) / 2, ux = dx / L, uy = dy / L;
      const wa = a.boss ? 0.1 : b.boss ? 1.9 : 1, wb = 2 - wa;
      a.x -= ux * push * wa; a.y -= uy * push * wa; b.x += ux * push * wb; b.y += uy * push * wb;
    }
    for (const h of hs) {
      const dx = a.x - h.x, dy = a.y - h.y, min = a.r + HERO_R, dd = dx * dx + dy * dy;
      if (dd < min * min && dd > 0) { const L = Math.sqrt(dd); a.x = h.x + (dx / L) * min; a.y = h.y + (dy / L) * min; }
    }
  }
}

/** Advance one tick. */
export function stepBattle(B) {
  if (B.state !== 'fight' || B.cleared) return;
  const dt = TICK;
  B.t += dt; B.stageT += dt;
  if ((B.surgeT -= dt) <= 0) surge(B);
  // the horde keeps coming
  const live = alive(B.enemies);
  B.enemies = B.enemies.filter((e) => e.hp > 0 || B.pending.some((p) => p.to === e.id));
  const zone = Math.floor(B.stage / 10), cap = Math.min(BAL.hordeMax, BAL.hordeBase + zone * 3);
  const boss = isBoss(B.stage);
  if (boss && !B.bossSpawned && B.stageKills >= BAL.bossAfter) { B.bossSpawned = true; spawn(B, 'boss'); }
  if ((B.spawnT -= dt) <= 0) {
    if (live.length < cap) spawn(B, B.rng.next() < BAL.eliteChance ? 'elite' : 'normal');
    B.spawnT = 1 / (BAL.spawnRate * (1 + zone * 0.08) * (B.bossSpawned ? 0.6 : 1));
  }
  // landing shots
  if (B.pending.length) {
    const due = B.pending.filter((p) => p.at <= B.t);
    if (due.length) {
      B.pending = B.pending.filter((p) => p.at > B.t);
      for (const p of due) {
        if (p.side === 'hero') { const e = B.enemies.find((x) => x.id === p.to); if (e && e.hp > 0) landShot(B, e, p); }
        else hurtHero(B, B.heroes[p.to], p.dmg, p.raw, B.enemies.find((x) => x.id === p.from), p.big);
      }
    }
  }
  if (B.rez && B.t >= B.rez.at) {
    const h = B.heroes[B.rez.hero];
    if (alive(B.heroes).length) { h.dead = false; h.hp = h.maxHp * B.rez.v; B.events.push({ k: 'revive', hero: h.i, by: B.rez.by }); }
    B.rez = null;
  }
  // lingering ability zones (Spell of First Light's portals)
  B.zones = B.zones.filter((z) => z.until > B.t);
  for (const z of B.zones) if (B.t >= z.next) {
    z.next += z.every;
    for (const e of within(alive(B.enemies), z, z.r)) damageEnemy(B, e, hit(z.dmg, e.def), { hero: z.hero, ab: true });
    if (z.heal) for (const o of alive(B.heroes)) heal(B, o, o.maxHp * z.heal);
    B.events.push({ k: 'zap', x: z.x, y: z.y, r: z.r, look: z.plant ? 'plant' : z.soul ? 'soul' : 'portal' });
  }
  // heroes: each shoots the nearest enemy
  for (const h of B.heroes) {
    if (h.dead) continue;
    if (h.fx.regen) h.hp = Math.min(h.maxHp, h.hp + h.maxHp * h.fx.regen * dt);
    if (h.buff.vitUntil > B.t) h.hp = Math.min(h.maxHp, h.hp + h.maxHp * h.fx.vitProc * dt);
    if (h.fx.partyRegen) for (const o of alive(B.heroes)) o.hp = Math.min(o.maxHp, o.hp + o.maxHp * h.fx.partyRegen * dt);
    const es = alive(B.enemies).filter((e) => e.y > -e.r); // only what's on the field
    // walking to a new spot in the formation
    if (h.x !== h.hx || h.y !== h.hy) { const dx = h.hx - h.x, dy = h.hy - h.y, L = Math.hypot(dx, dy), st = 140 * dt; if (L <= st) { h.x = h.hx; h.y = h.hy; } else { h.x += (dx / L) * st; h.y += (dy / L) * st; } }
    h.cd -= dt;
    for (let k = 0; k < h.procs.length; k++) {
      const P = h.procs[k];
      if (!P.every) continue;
      h.procT[k] = (h.procT[k] ?? P.every * (0.3 + 0.2 * k)) - dt;
      if (h.procT[k] > 0) continue;
      h.procT[k] += P.every;
      runProc(B, h, P, k, es);
    }
    const A = CLASSES[h.cls].ability;
    const needHeal = A.fx === 'heal' ? alive(B.heroes).some((o) => o.hp < o.maxHp * 0.8) : true;
    if (h.cd <= 0 && es.length && needHeal) { h.cd = abilityCd(h); useAbility(B, h); castProcs(B, h, alive(B.enemies)); }
    // Dawnbreaker's beam: every second, a blast at the end of the sword's reach that ignores armor
    if (h.shot.beam && (h.beamT = (h.beamT ?? 0.5) - dt) <= 0) {
      const Bm = h.shot.beam, t = nearest(es, h);
      if (t && d2(t, h) < (Bm.reach * TILE) ** 2) {
        h.beamT = Bm.every;
        const at = { x: t.x, y: t.y };
        for (const o of within(es, at, Bm.radius * TILE)) damageEnemy(B, o, h.hit * Bm.per * BAL.utWeapon * dmgMult(B, h), { hero: h.i, ab: true });
        B.events.push({ k: 'beam', hero: h.i, x: at.x, y: at.y, r: Bm.radius * TILE });
      } else h.beamT = 0.1;
    }
    h.atkT -= dt * h.spd * (h.buff.hasteUntil > B.t ? 1 + h.buff.haste : 1) * (h.buff.frenzyUntil > B.t ? 1 + h.fx.frenzy : 1);
    if (h.atkT <= 0) {
      const e = nearest(es, h);
      // hold fire until something is in range
      if (!e || d2(e, h) > (h.shot.range * TILE + e.r) ** 2) { h.atkT = 0; continue; }
      h.atkT += 1;
      fire(B, h, e, 0);
      if (h.fx.double && B.rng.next() < h.fx.double) fire(B, h, e, 0.09);
    }
  }
  moveEnemies(B, dt);
  // enemies: burn, then claw whoever they reached, or shoot from range
  for (const e of B.enemies) {
    if (e.hp <= 0) continue;
    for (const d of e.dots) { const x = Math.min(d.left, dt); d.left -= x; damageEnemy(B, e, d.dps * x, { hero: d.hero, dot: true }); }
    e.dots = e.dots.filter((d) => d.left > 0);
    if (e.hp <= 0 || e.stunUntil > B.t) continue;
    e.atkT -= dt * e.spd * (e.slowUntil > B.t ? 0.6 : 1);
    if (e.atkT > 0) continue;
    const t = B.heroes[e.target];
    if (!t || t.dead) { e.atkT = 0.1; continue; }
    const reach = e.boss ? 160 : e.ranged ? 145 : HERO_R + e.r + 6, dist = Math.sqrt(d2(e, t));
    if (dist > reach) { e.atkT = 0.05; continue; }
    e.atkT += 1; e.n++;
    if (e.boss && e.n % 3 === 0) {
      // the boss's big pattern: a burst of bullets from its body that reaches the whole party
      B.events.push({ k: 'pattern', id: e.id, kind: ['ring', 'spread', 'spiral'][(e.n / 3) % 3 | 0] });
      for (const h of alive(B.heroes)) B.pending.push({ side: 'enemy', to: h.i, from: e.id, raw: e.atk * 0.7, dmg: hit(e.atk * 0.7, heroArmor(h, e.atk)), big: true, at: B.t + Math.sqrt(d2(e, h)) / 300 + 0.1 });
    } else if (e.ranged || e.boss) {
      const flight = dist / ENEMY_SHOT_SPEED;
      B.pending.push({ side: 'enemy', to: t.i, from: e.id, raw: e.atk, dmg: hit(e.atk, heroArmor(t, e.atk)), at: B.t + flight });
      B.events.push({ k: 'eshot', id: e.id, hero: t.i, flight, x0: e.x, y0: e.y, x1: t.x, y1: t.y, boss: e.boss });
    } else {
      B.events.push({ k: 'claw', id: e.id, hero: t.i });
      hurtHero(B, t, hit(e.atk, heroArmor(t, e.atk)), e.atk, e, false);
    }
  }
  // outcome
  if (!alive(B.heroes).length) { B.state = 'lost'; B.events.push({ k: 'lost' }); return; }
  if (B.stageT > TIME_LIMIT) { B.state = 'lost'; B.events.push({ k: 'lost', timeout: true }); return; }
  if (B.stageKills >= B.quota || (boss && B.bossKilled)) { B.cleared = true; B.events.push({ k: 'won', stage: B.stage, boss }); }
}

/** Run one stage headless from a standing start. Returns { won, t, kills }. */
export function simulate(stage, realm, heroStats, seed) {
  const B = createBattle(stage, realm, heroStats, seed);
  while (B.state === 'fight' && !B.cleared) { stepBattle(B); B.events.length = 0; }
  return { won: B.cleared, t: B.t, kills: B.kills };
}
