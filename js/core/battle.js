// The auto-battle: a horde. Enemies stream in without end while the party holds its ground; kill enough of
// them and the stage is cleared, and the fight rolls straight on into the next one. Every tenth stage a boss
// joins the horde. Pure simulation stepped in fixed ticks, on a flat ground plane (x right, y down).
// The same code runs on screen, offline, and in the tools/. It also emits events (shots, hits, deaths, ...)
// that ui/battleView.js turns into visuals.
import { BAL } from '../data/balance.js';
import { CLASSES } from '../data/classes.js';
import { zoneOf, isBoss } from '../data/zones.js';
import { makeRng } from './rng.js';

export const TICK = 0.05;
export const WORLD = { w: 360, h: 430 };
const SHOT_SPEED = 560, ENEMY_SHOT_SPEED = 190, TIME_LIMIT = 150, SURGE = 8;
const HERO_R = 15;
// where the party stands: the tank (or first hero) in front, the others either side behind
const SPOTS = [{ x: 180, y: 290 }, { x: 122, y: 338 }, { x: 238, y: 338 }];
const RANGED = new Set(['beholder', 'ghost', 'lich', 'sphinx', 'oryx', 'kraken']);

/** Enemy strength at a stage in a Realm (one enemy of the horde). */
export function enemyStats(stage, realm) {
  // the first zones are gentler, easing up to full strength by stage 30, so a new party gets going fast
  const g = BAL.stageGrowth ** stage * BAL.realmGrowth ** realm * (0.55 + 0.45 * Math.min(1, stage / 30)), E = BAL.enemyBase;
  return { hp: E.hp * g, atk: E.atk * g, def: Math.min(0.4, E.armor * Math.floor(stage / 10)) };
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

function placeHeroes(stats) {
  const front = Math.max(0, stats.findIndex((s) => s.role === 'tank'));
  const order = [front, ...stats.map((_, i) => i).filter((i) => i !== front)];
  const spots = stats.length === 1 ? [{ x: 180, y: 318 }] : stats.length === 2 ? [SPOTS[0], { x: 180, y: 346 }] : SPOTS;
  const pos = []; order.forEach((i, k) => { pos[i] = spots[k]; });
  return pos;
}
function makeHero(s, i, pos, keep) {
  const h = { ...s, fx: s.fx || {}, i, x: pos.x, y: pos.y, maxHp: s.hp, hp: s.hp, atkT: 0.15 * i, cd: abilityCd(s) * (0.35 + 0.15 * i), buff: {}, dead: false, shield: 0, shots: 0, rampId: 0, ramp: 0 };
  if (keep) { h.hp = keep.dead ? 0 : Math.max(1, (keep.hp / keep.maxHp) * h.maxHp); h.dead = keep.dead; h.cd = Math.min(h.cd, keep.cd); h.shield = keep.shield; h.revived = keep.revived; }
  return h;
}

export function createBattle(stage, realm, heroStats, seed = (Math.random() * 2 ** 32) >>> 0) {
  const pos = placeHeroes(heroStats);
  const B = {
    stage, realm, rng: makeRng(seed), t: 0, state: 'fight', uid: 1, cleared: false,
    heroes: heroStats.map((s, i) => makeHero(s, i, pos[i])),
    enemies: [], pending: [], events: [], kills: 0, stageKills: 0, stageT: 0, spawnT: 0.4, surgeT: 0,
    bossSpawned: false, bossKilled: false, rez: null, rezUsed: false,
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
  e.hp -= d;
  B.events.push({ k: 'hit', id: e.id, dmg: d, crit: src.crit, ab: src.ab, hero: src.hero });
  if (e.hp > 0) return;
  e.hp = 0; B.kills++; B.stageKills++;
  if (e.boss) B.bossKilled = true;
  B.events.push({ k: 'die', id: e.id, boss: e.boss, elite: e.elite, x: e.x, y: e.y });
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
  if (h.fx.dodge && B.rng.next() < h.fx.dodge) { B.events.push({ k: 'dodge', hero: h.i }); return; }
  const absorbed = Math.min(h.shield, dmg); h.shield -= absorbed;
  h.hp -= dmg - absorbed;
  B.events.push({ k: 'ehit', hero: h.i, dmg: dmg - absorbed, big, shield: absorbed > 0 });
  if (from && h.fx.thorns && from.hp > 0) damageEnemy(B, from, raw * h.fx.thorns, { hero: h.i, thorns: true });
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

// ---------- abilities ----------
const ECHOES = new Set(['aoe', 'heal', 'pierce', 'execute', 'stun', 'dot', 'drain', 'poison', 'chain']);
function useAbility(B, h, scale = 1) {
  const A = CLASSES[h.cls].ability, p = A.pow * h.pow * scale, es = alive(B.enemies), hs = alive(B.heroes);
  if (!es.length) return;
  const dmg = h.atk * dmgMult(B, h) * (1 + (h.fx.abilityDmg || 0));
  const src = { hero: h.i, ab: true };
  const ev = { k: 'ability', hero: h.i, fx: A.fx, targets: [] };
  const strike = (list, f = 1, s = src) => { for (const e of list) { ev.targets.push(e.id); damageEnemy(B, e, hit(dmg * p * f, e.def), s); } };
  switch (A.fx) {
    case 'aoe': { const c = cluster(es); ev.x = c.x; ev.y = c.y; strike(within(es, c, BAL.aoeRadius)); break; }
    case 'heal': { const t = hs.reduce((a, b) => (b.hp / b.maxHp < a.hp / a.maxHp ? b : a)); ev.heroes = [t.i]; heal(B, t, t.maxHp * p); break; }
    case 'pierce': {
      // a line from the archer through the nearest enemy and on, hitting all it passes
      const t = nearest(es, h), dx = t.x - h.x, dy = t.y - h.y, L = Math.hypot(dx, dy) || 1, ux = dx / L, uy = dy / L;
      ev.x = h.x + ux * 420; ev.y = h.y + uy * 420;
      strike(es.filter((e) => { const along = (e.x - h.x) * ux + (e.y - h.y) * uy, off = Math.abs((e.x - h.x) * uy - (e.y - h.y) * ux); return along > 0 && off < 22 + e.r; }));
      break;
    }
    case 'execute': strike([...es].sort((a, b) => a.hp - b.hp).slice(0, 3), 1, { ...src, crit: true }); break;
    case 'berserk': h.buff.taunt = B.t + 4; h.buff.hasteUntil = B.t + 4; h.buff.haste = p; for (const e of es) if (!e.ranged && B.rng.next() < 0.6) e.target = h.i; break;
    case 'stun': { const list = within(es, h, 120); for (const e of list) e.stunUntil = B.t + 1.2 * (e.boss ? 0.5 : 1); ev.x = h.x; ev.y = h.y; strike(list); break; }
    case 'dot': { const c = cluster(es); ev.x = c.x; ev.y = c.y; for (const e of within(es, c, BAL.aoeRadius)) { ev.targets.push(e.id); e.dots.push({ left: 4, dps: (dmg * p) / 4, hero: h.i }); e.slowUntil = B.t + 4; } break; }
    case 'drain': {
      const c = cluster(es); let tot = 0; ev.x = c.x; ev.y = c.y;
      for (const e of within(es, c, BAL.aoeRadius)) { ev.targets.push(e.id); const d = hit(dmg * p, e.def); tot += d; damageEnemy(B, e, d, src); }
      for (const o of hs) heal(B, o, Math.min(o.maxHp * 0.2, (tot * 0.08) / hs.length)); ev.heroes = hs.map((o) => o.i);
      break;
    }
    case 'poison': { const e = es.reduce((a, b) => (b.hp > a.hp ? b : a)); ev.targets.push(e.id); e.dots.push({ left: 5, dps: (dmg * p) / 5, hero: h.i }); break; }
    case 'buff': for (const o of hs) heal(B, o, o.maxHp * 0.1); h.buff.partyUntil = B.t + 5; h.buff.party = p; ev.heroes = hs.map((o) => o.i); break;
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
const MODS = ['splash', 'chain', 'burn', 'chill', 'stun', 'leech'];
function fire(B, h, e, delay) {
  const fx = h.fx;
  h.shots++;
  const charged = fx.charge && h.shots % fx.charge === 0;
  const crit = charged || B.rng.next() < h.crit;
  if (fx.ramp) { if (h.rampId === e.id) h.ramp = Math.min(10, h.ramp + 1); else { h.rampId = e.id; h.ramp = 0; } }
  const base = h.hit * dmgMult(B, h) * (crit ? 2 + (fx.critDmg || 0) : 1) * (charged ? fx.chargeX / 2 : 1) * (1 + (fx.ramp || 0) * h.ramp);
  const vs = (t) => hit(base * (t.boss ? 1 + (fx.bossDmg || 0) : 1) * (t.hp < t.maxHp * 0.3 ? 1 + (fx.execute || 0) : 1), t.def);
  const mods = MODS.some((k) => fx[k]) ? fx : null;
  const mod = fx.splash ? 'blast' : fx.chain ? 'chain' : fx.burn ? 'burn' : fx.chill ? 'chill' : null;
  const heavy = h.hit > (h.atk / CLASSES[h.cls].base.spd) * 1.3; // a slow, heavy Unique weapon
  const shoot = (t, dmg, m) => {
    const flight = Math.max(0.06, Math.sqrt(d2(h, t)) / SHOT_SPEED) + delay;
    B.pending.push({ side: 'hero', to: t.id, dmg, crit, hero: h.i, mods: m, at: B.t + flight });
    B.events.push({ k: 'shot', hero: h.i, to: t.id, crit, flight, mod, big: heavy || charged });
  };
  shoot(e, vs(e), mods);
  if (fx.multishot) { const e2 = nearest(alive(B.enemies).filter((x) => x !== e), h); if (e2) shoot(e2, vs(e2) * fx.multishot, null); }
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
  // heroes: each shoots the nearest enemy
  for (const h of B.heroes) {
    if (h.dead) continue;
    if (h.fx.regen) h.hp = Math.min(h.maxHp, h.hp + h.maxHp * h.fx.regen * dt);
    if (h.fx.partyRegen) for (const o of alive(B.heroes)) o.hp = Math.min(o.maxHp, o.hp + o.maxHp * h.fx.partyRegen * dt);
    const es = alive(B.enemies).filter((e) => e.y > -e.r); // only what's on the field
    h.cd -= dt;
    const A = CLASSES[h.cls].ability;
    const needHeal = A.fx === 'heal' ? alive(B.heroes).some((o) => o.hp < o.maxHp * 0.8) : true;
    if (h.cd <= 0 && es.length && needHeal) { h.cd = abilityCd(h); useAbility(B, h); }
    h.atkT -= dt * h.spd * (h.buff.hasteUntil > B.t ? 1 + h.buff.haste : 1) * (h.buff.frenzyUntil > B.t ? 1 + h.fx.frenzy : 1);
    if (h.atkT <= 0) {
      const e = nearest(es, h);
      if (!e) { h.atkT = 0; continue; }
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
