// Dungeons as active bullet-hell runs. You steer; your weapon fires on its own at the nearest enemy.
// Pure simulation in a fixed 360×640 world (ui/arenaView.js draws it), stepped at 60 Hz.
// Every dungeon is built from its data: room enemies get a bullet pattern from their look, the boss gets
// three phases, and everything scales to the gear tier the dungeon is built for.
import { CONFIG } from '../config.js';
import { CLASS } from '../data/classes.js';
import { DUNGEON_MOBS } from '../data/world.js';
import { makeRng } from './rng.js';
import { abilityCost } from './combat.js';
import { fighterOf, referenceCharacter, dpsOf } from './character.js';
import { rollGear, rollPotion } from './loot.js';

export const W = 360, H = 640;
const TAU = Math.PI * 2;
const FOLLOW_SPEED = 2600; // px/s: the hero snaps to your thumb without teleporting through bullets

// ---------- weapons (Realm patterns) ----------
export const WEAPON_SHOT = {
  staff:  { speed: 430, range: 340, r: 5, color: '#8fb8ff', wave: 11 },
  wand:   { speed: 520, range: 380, r: 4, color: '#d29bff' },
  bow:    { speed: 420, range: 320, r: 4, color: '#f0d9a0', spread: 0.11, arrow: true },
  sword:  { speed: 340, range: 145, r: 12, color: '#ffffff', blade: true },
  dagger: { speed: 480, range: 200, r: 5, color: '#e6e6f5', arrow: true },
};
export const ABILITY_INFO = {
  spell: 'A burst of 16 bolts erupts on the nearest enemy.',
  tome: 'Heals a big chunk of HP.',
  quiver: 'One huge arrow that pierces everything and paralyzes for 2s.',
  cloak: 'Invisible for 3s: bullets pass through you.',
  helm: 'Berserk: +60% attack speed for 5s.',
  shield: 'Bash: a ring of bolts around you that stuns anything close for 2s.',
  seal: 'Heals and gives +30% damage for 5s.',
  trap: 'A snare on the nearest enemy that burns and slows everything near it.',
  scepter: 'Chain lightning that jumps between 4 enemies.',
  skull: 'Drains every enemy near the target and heals you.',
  poison: 'A poison cloud on the nearest enemy: heavy damage over 4s.',
};

// ---------- enemies: a bullet pattern for each look ----------
const BEHAVIOR = { snake: 'aimed', skeleton: 'aimed', beast: 'charger', bug: 'charger', humanoid: 'burst', ghost: 'ring', blob: 'ring', cube: 'ring', eye: 'spiral', lich: 'spiral', golem: 'heavy', demon: 'spread', dragon: 'spread', wisp: 'wave' };
const MOB_HP = { aimed: 1000, charger: 750, burst: 1100, ring: 1700, spiral: 1450, heavy: 2100, spread: 1200, wave: 950 };
const MOB_SPEED = { aimed: 30, charger: 75, burst: 35, ring: 18, spiral: 22, heavy: 15, spread: 40, wave: 45 };
const BOSS_HP = 24000;

// How strong a dungeon is for a class: relative to that class at level 15 in starter gear in the Snake Pit.
// Enemy HP follows the class's damage at the gear tier the dungeon is built for, so every class kills at a similar pace.
const scaleCache = new Map();
export function dungeonScale(d, cls = 'wizard') {
  const ck = `${d.id}|${cls}`;
  if (scaleCache.has(ck)) return scaleCache.get(ck);
  const ref = (g, m, lv) => fighterOf(referenceCharacter(cls, g, m, lv), { exalt: {} });
  const base = ref(1, 0, 15);
  const m = Math.max(0, Math.min(1, (d.rec - 6.6) / 3.7));
  const F = ref(d.rec, m, d.index === 0 ? 15 : 20);
  // bullet damage keeps hits-to-kill steady: what gets through the reference DEF grows with HP, then add the new DEF back
  const s = { hp: dpsOf(F) / dpsOf(base), hpRatio: F.maxHp / base.maxHp, baseDef: base.def, recDef: F.def, speed: 1 + d.index * 0.005 };
  scaleCache.set(ck, s);
  return s;
}

export function createRun(d, F, cls, seed = (Math.random() * 2 ** 32) >>> 0) {
  const R = {
    d, cls, rng: makeRng(seed), t: 0, room: 0, rooms: 3, phase: 'fight', sc: dungeonScale(d, cls),
    hero: { x: W / 2, y: H - 90, hp: F.maxHp, mp: F.maxMp, fireT: 0, attacks: 0, berserkUntil: 0, invisUntil: 0, dmgUntil: 0, hurtT: 0, cheatReadyAt: 0 },
    shots: [], bullets: [], enemies: [], bags: [], zones: [], fx: [], nums: [], loot: [], uid: 1, roomT: 0,
    stats: { dmg: 0, kills: 0, hits: 0 },
  };
  spawnRoom(R);
  return R;
}

function mob(R, name, sprite, x, y, mult = 1) {
  const kind = BEHAVIOR[sprite] || 'aimed', hp = MOB_HP[kind] * R.sc.hp * mult;
  return { name, sprite, pal: R.d.pal, kind, id: R.uid++, x, y, hp, maxHp: hp, r: 16, speed: MOB_SPEED[kind], def: 0, t: R.rng.next() * 2, stunUntil: 0, slowUntil: 0, flash: 0, vx: 0, vy: 0, poison: 0 };
}
function spawnRoom(R) {
  const mobs = DUNGEON_MOBS[R.d.id] || [['Minion', 'humanoid']];
  const m = (i) => mobs[Math.min(i, mobs.length - 1)];
  const spots = R.room === 0
    ? [[0, 90, 140], [0, 270, 120], [1, 180, 200], [0, 60, 260], [2, 180, 90]]
    : [[1, 70, 120], [1, 290, 120], [0, 120, 220], [0, 240, 220], [2, 90, 70], [2, 270, 70], [1, 180, 160]];
  if (R.room < R.rooms - 1) R.enemies = spots.map(([i, x, y]) => mob(R, m(i)[0], m(i)[1], x, y));
  else {
    const hp = BOSS_HP * R.sc.hp;
    R.enemies = [{ name: R.d.boss, sprite: R.d.bossSprite, pal: R.d.pal, kind: 'boss', boss: true, id: R.uid++, x: 180, y: 120, hp, maxHp: hp, r: 34, speed: 45, def: 0, t: 0, stunUntil: 0, slowUntil: 0, flash: 0, vx: 0, vy: 0, summonT: 6, poison: 0 }];
  }
  R.bullets = []; R.shots = []; R.zones = [];
  R.hero.x = W / 2; R.hero.y = H - 90;
  R.phase = 'fight'; R.roomT = 0;
}

const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const nearest = (R, p) => { let best = null, bd = Infinity; for (const e of R.enemies) { const d = dist(e, p); if (d < bd) { bd = d; best = e; } } return best; };

// enemy bullets: base damage tuned for the Snake Pit, scaled to the dungeon's gear level
function bullet(R, x, y, ang, speed, dmg, o = {}) {
  const sp = speed * R.sc.speed;
  R.bullets.push({ x, y, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, r: o.r || 5, dmg: Math.max(dmg * 0.3, dmg - R.sc.baseDef) * R.sc.hpRatio + R.sc.recDef, life: o.life || 5, color: o.color || '#ff4a6a', wave: o.wave || 0, t: 0 });
}
const ring = (R, e, n, speed, dmg, off = 0, o) => { for (let i = 0; i < n; i++) bullet(R, e.x, e.y, off + (i / n) * TAU, speed, dmg, o); };
function aimed(R, e, n, spread, speed, dmg, o) {
  const a = Math.atan2(R.hero.y - e.y, R.hero.x - e.x);
  for (let i = 0; i < n; i++) bullet(R, e.x, e.y, a + (n > 1 ? (i / (n - 1) - 0.5) * spread : 0), speed, dmg, o);
}

// ---------- the hero's attacks ----------
function shotDamage(R, F, e) {
  const fx = F.fx || {}, h = R.hero;
  let m = (1 + (fx.dmg || 0)) * (h.dmgUntil > R.t ? 1.3 : 1);
  if (e && (e.boss) && fx.eliteDmg) m *= 1 + fx.eliteDmg;
  if (e && fx.execute && e.hp < e.maxHp * 0.3) m *= 1 + fx.execute;
  if (fx.lowHpDmg && h.hp < F.maxHp * 0.4) m *= 1 + fx.lowHpDmg;
  let crit = R.rng.next() < 0.08 + (fx.critChance || 0);
  if (crit) m *= 1.6 + (fx.critMult || 0);
  return { m, crit };
}
function fire(R, F) {
  const h = R.hero, wt = F.weaponType, Wp = WEAPON_SHOT[wt], fx = F.fx || {};
  const tgt = nearest(R, h);
  if (!tgt) return;
  h.attacks++;
  const ang = Math.atan2(tgt.y - h.y, tgt.x - h.x);
  const burst = fx.burstEvery && h.attacks % fx.burstEvery === 0;
  const base = { x: h.x, y: h.y - 10, speed: Wp.speed, range: Wp.range, r: Wp.r, color: burst ? '#ff7a3c' : Wp.color, hit: new Set(), dist: 0, kind: wt, pierce: !!fx.ignoreDef, burst: burst ? fx.burstMult : 0 };
  const extra = fx.doubleChance && R.rng.next() < fx.doubleChance ? 1 : 0;
  const n = F.shots + extra;
  for (let i = 0; i < n; i++) {
    const s = { ...base, hit: new Set() };
    if (wt === 'staff') Object.assign(s, { ang: ang + (i >= 2 ? (R.rng.next() - 0.5) * 0.3 : 0), wave: Wp.wave * (i % 2 ? -1 : 1) });
    else if (wt === 'bow') Object.assign(s, { ang: ang + (i - (n - 1) / 2) * Wp.spread, arrow: true });
    else Object.assign(s, { ang: ang + (i ? (R.rng.next() - 0.5) * 0.25 : 0), arrow: !!Wp.arrow, blade: !!Wp.blade });
    R.shots.push(s);
  }
}
function castAbility(R, F) {
  const h = R.hero, ab = F.ability;
  if (!ab || R.phase !== 'fight') return false;
  const cost = abilityCost(ab);
  if (h.mp < cost) return false;
  h.mp -= cost;
  const P = ab.power * F.attMult, tgt = nearest(R, h), tp = tgt || { x: W / 2, y: 200 };
  const shot = (o) => R.shots.push({ hit: new Set(), dist: 0, ...o });
  R.fx.push({ k: 'cast', type: ab.type, t: 0, life: 0.6 });
  switch (ab.type) {
    case 'spell': for (let i = 0; i < 16; i++) shot({ x: tp.x, y: tp.y, ang: (i / 16) * TAU, speed: 260, range: 75, r: 6, dmg: P * 0.55, color: '#ff8a3c', kind: 'spell' });
      R.fx.push({ k: 'burst', x: tp.x, y: tp.y, t: 0, life: 0.4, c: '#ff8a3c' }); break;
    case 'quiver': { const a = Math.atan2(tp.y - h.y, tp.x - h.x); shot({ x: h.x, y: h.y - 10, ang: a, speed: 540, range: 640, r: 10, dmg: P * 3, color: '#ffe08a', kind: 'quiver', pierce: true, arrow: true, stun: 2 }); break; }
    case 'helm': h.berserkUntil = R.t + 5; R.fx.push({ k: 'burst', x: h.x, y: h.y, t: 0, life: 0.5, c: '#ff5a4a' }); break;
    case 'cloak': h.invisUntil = R.t + 3; break;
    case 'tome': { const heal = F.maxHp * 0.3; h.hp = Math.min(F.maxHp, h.hp + heal); R.nums.push({ x: h.x, y: h.y - 30, text: `+${Math.round(heal)}`, t: 0, c: '#58c06f' }); R.fx.push({ k: 'burst', x: h.x, y: h.y, t: 0, life: 0.5, c: '#7dff9a' }); break; }
    case 'seal': { const heal = F.maxHp * 0.18; h.hp = Math.min(F.maxHp, h.hp + heal); h.dmgUntil = R.t + 5; R.nums.push({ x: h.x, y: h.y - 30, text: `+${Math.round(heal)}`, t: 0, c: '#58c06f' }); R.fx.push({ k: 'burst', x: h.x, y: h.y, t: 0, life: 0.5, c: '#ffe08a' }); break; }
    case 'shield': for (let i = 0; i < 10; i++) shot({ x: h.x, y: h.y, ang: (i / 10) * TAU, speed: 300, range: 80, r: 7, dmg: P * 0.7, color: '#9ec2ff', kind: 'shield', stun: 2 });
      R.fx.push({ k: 'burst', x: h.x, y: h.y, t: 0, life: 0.4, c: '#9ec2ff' }); break;
    case 'trap': R.zones.push({ x: tp.x, y: tp.y, r: 60, until: R.t + 3, dps: P * 0.9, slow: true, color: '#d8b070' }); break;
    case 'poison': R.zones.push({ x: tp.x, y: tp.y, r: 50, until: R.t + 4, dps: P * 1.1, color: '#7cff4a' }); break;
    case 'scepter': {
      let from = h, hit = [];
      for (let k = 0; k < 4; k++) {
        const next = R.enemies.filter((e) => !hit.includes(e)).sort((a, b) => dist(a, from) - dist(b, from))[0];
        if (!next) break;
        hurtEnemy(R, F, next, P * 1.6 * Math.pow(0.75, k), { kind: 'ability' });
        R.fx.push({ k: 'zap', x0: from.x, y0: from.y, x1: next.x, y1: next.y, t: 0, life: 0.25 });
        hit.push(next); from = next;
      }
      break;
    }
    case 'skull': {
      let total = 0;
      for (const e of R.enemies) if (dist(e, tp) < 90) total += hurtEnemy(R, F, e, P * 1.3, { kind: 'ability' });
      h.hp = Math.min(F.maxHp, h.hp + total * 0.3);
      R.fx.push({ k: 'burst', x: tp.x, y: tp.y, t: 0, life: 0.5, c: '#8fff9f' }); break;
    }
    default: break;
  }
  return true;
}

function hurtEnemy(R, F, e, d, s) {
  const fx = F.fx || {};
  const dealt = Math.max(d - e.def, d * 0.15);
  e.hp -= dealt; e.flash = 0.08; R.stats.dmg += dealt; R.stats.hits++;
  R.nums.push({ x: e.x + (R.rng.next() - 0.5) * 16, y: e.y - e.r - 4, text: `${Math.round(dealt)}`, t: 0, c: s?.crit ? '#ffd34d' : s?.kind === 'ability' || s?.kind === 'spell' ? '#ffb070' : '#ffffff' });
  if (s?.stun) e.stunUntil = R.t + s.stun * (e.boss ? 0.5 : 1);
  if (fx.poisonOnHit) e.poison += dealt * fx.poisonOnHit;
  if (fx.lifesteal) R.hero.hp = Math.min(F.maxHp, R.hero.hp + dealt * fx.lifesteal);
  if (fx.mpOnHit) R.hero.mp = Math.min(F.maxMp, R.hero.mp + fx.mpOnHit);
  return dealt;
}

// ---------- enemy behavior ----------
function enemyAI(R, e, dt) {
  const h = R.hero;
  e.t += dt;
  if (e.stunUntil > R.t) return;
  const slow = e.slowUntil > R.t ? 0.5 : 1;
  const toHero = Math.atan2(h.y - e.y, h.x - e.x);
  const every = (key, sec) => { e[key] = (e[key] ?? sec * R.rng.next()) - dt * slow; if (e[key] <= 0) { e[key] = sec; return true; } return false; };
  switch (e.kind) {
    case 'aimed': e.vx = Math.cos(e.t * 0.7 + e.id) * e.speed; e.vy = Math.sin(e.t * 0.5 + e.id * 2) * e.speed * 0.6; if (every('cd', 1.5)) aimed(R, e, 1, 0, 170, 38); break;
    case 'charger': { const d = dist(e, h), a = d > 130 ? toHero : toHero + Math.PI / 2; e.vx = Math.cos(a) * e.speed; e.vy = Math.sin(a) * e.speed; if (every('cd', 2.0)) aimed(R, e, 3, 0.5, 200, 32); break; }
    case 'burst': e.vx = Math.cos(e.t * 0.6 + e.id) * e.speed; e.vy = 0; if (every('cd', 2.2)) { e.burst = 3; e.bt = 0; } if (e.burst > 0 && (e.bt -= dt) <= 0) { e.burst--; e.bt = 0.15; aimed(R, e, 1, 0, 220, 34); } break;
    case 'ring': e.vx = Math.cos(e.t * 0.4 + e.id) * e.speed; e.vy = 0; if (every('cd', 2.6)) ring(R, e, 10, 120, 42, e.t, { color: '#c86aff' }); break;
    case 'spiral': e.vx = Math.cos(e.t * 0.5 + e.id) * e.speed; e.vy = 0; e.spin = (e.spin || 0) + dt * 2.2; if (every('cd', 0.35)) { bullet(R, e.x, e.y, e.spin, 130, 30, { color: '#ff7ad8', r: 4 }); bullet(R, e.x, e.y, e.spin + Math.PI, 130, 30, { color: '#ff7ad8', r: 4 }); } break;
    case 'heavy': e.vx = Math.cos(e.t * 0.3 + e.id) * e.speed; e.vy = 0; if (every('cd', 3.0)) aimed(R, e, 5, 0.9, 110, 46, { r: 8, color: '#ffa040' }); break;
    case 'spread': e.vx = Math.cos(e.t * 0.8 + e.id) * e.speed; e.vy = Math.sin(e.t * 0.6) * 10; if (every('cd', 2.3)) aimed(R, e, 5, 0.8, 180, 32); break;
    case 'wave': e.vx = Math.cos(e.t * 1.1 + e.id) * e.speed; e.vy = Math.sin(e.t * 0.7 + e.id) * e.speed * 0.5; if (every('cd', 1.4)) aimed(R, e, 1, 0, 160, 36, { wave: 40, color: '#5de0ff' }); break;
    default: bossAI(R, e, dt);
  }
  e.x = Math.max(e.r, Math.min(W - e.r, e.x + e.vx * dt * slow));
  e.y = Math.max(e.r + 40, Math.min(H * 0.55, e.y + e.vy * dt * slow));
}
function bossAI(R, e, dt) {
  const frac = e.hp / e.maxHp, i = R.d.index;
  const p = frac > 0.66 ? 1 : frac > 0.33 ? 2 : 3;
  if (p !== e.p) { e.p = p; e.cd = 1.2; e.cd2 = 2; if (p > 1) R.fx.push({ k: 'banner', text: p === 2 ? `${R.d.boss.split(/[ ,]/)[0]} is enraged!` : `${R.d.boss.split(/[ ,]/)[0]} is desperate!`, t: 0, life: 1.6 }); e.flash = 0.4; }
  e.vx = Math.sin(e.t * 0.6) * e.speed * (p === 3 ? 1.6 : 1); e.vy = Math.sin(e.t * 0.9) * 12;
  const fan = 5 + Math.floor(i / 8), arms = 2 + Math.floor(i / 12), ringN = 16 + Math.floor(i / 4);
  if (p === 1) {
    if ((e.cd -= dt) <= 0) { e.cd = 1.3; aimed(R, e, fan, 0.75, 190, 45); }
    if ((e.summonT -= dt) <= 0) {
      e.summonT = 10;
      const mobs = DUNGEON_MOBS[R.d.id] || [['Minion', 'humanoid']];
      for (const sx of [e.x - 60, e.x + 60]) R.enemies.push(mob(R, mobs[0][0], mobs[0][1], sx, e.y + 30, 0.6));
    }
  } else {
    e.spin = (e.spin || 0) + dt * (p === 3 ? 2.6 : 1.8) * (i % 2 ? -1 : 1);
    if ((e.cd -= dt) <= 0) {
      e.cd = p === 3 ? 0.12 : 0.16;
      const n = p === 3 ? arms + 1 : arms;
      for (let k = 0; k < n; k++) bullet(R, e.x, e.y, e.spin + (k / n) * TAU, 150, 40, { color: '#ffde3d', r: 4 });
    }
    if (e.tele == null && (e.cd2 -= dt) <= 0) { e.tele = 0.8; R.fx.push({ k: 'tele', t: 0, life: 0.8 }); }
    if (e.tele != null && (e.tele -= dt) <= 0) {
      e.tele = null; e.cd2 = p === 3 ? 2.4 : 3.2;
      ring(R, e, ringN, 140, 55, e.t, { color: '#ff3a5a', r: 7 });
      if (p === 3) aimed(R, e, 3, 0.25, 260, 50);
    }
  }
}

// ---------- drops ----------
function drop(R, x, y, id) { R.bags.push({ x, y, id, t: 0 }); }
function dropsFor(R, e) {
  const d = R.d, rng = R.rng;
  if (e.boss) {
    for (let k = 0, n = rng.int(...CONFIG.dungeonBags); k < n; k++) drop(R, e.x + (k - 1.5) * 26, e.y + 10, rollGear(d, R.cls, rng));
    for (let k = 0, n = rng.int(...d.potions); k < n; k++) drop(R, e.x + (k - 0.5) * 30, e.y + 40, rollPotion(rng, d.sig));
    if (rng.next() < CONFIG.dungeonUtChance) drop(R, e.x, e.y + 60, rng.pick(d.uts));
    if (d.rune && R.runeDrop) drop(R, e.x + 40, e.y + 60, d.rune);
    R.fx.push({ k: 'banner', text: `${e.name.split(',')[0]} defeated!`, t: 0, life: 2 });
  } else {
    if (rng.next() < CONFIG.roomPotionChance) drop(R, e.x, e.y, rollPotion(rng, d.sig));
    if (rng.next() < CONFIG.roomBagChance) drop(R, e.x, e.y, rollGear(d, R.cls, rng));
  }
}

// ---------- step ----------
/** input: { target: {x, y} | null } where the hero should be (world px) */
export function step(R, F, input, dt) {
  if (R.phase !== 'fight' && R.phase !== 'cleared') return;
  R.t += dt; R.roomT += dt;
  const h = R.hero, fx = F.fx || {};
  // the hero snaps to just above your thumb
  if (input.target) {
    const tx = Math.max(10, Math.min(W - 10, input.target.x)), ty = Math.max(H * 0.2, Math.min(H - 20, input.target.y));
    const dx = tx - h.x, dy = ty - h.y, d = Math.hypot(dx, dy), max = FOLLOW_SPEED * dt;
    if (d <= max) { h.x = tx; h.y = ty; } else { h.x += (dx / d) * max; h.y += (dy / d) * max; }
  }
  h.hp = Math.min(F.maxHp, h.hp + (F.hpRegen + F.maxHp * (fx.regenPct || 0)) * dt);
  h.mp = Math.min(F.maxMp, h.mp + F.mpRegen * dt);
  // abilities fire on their own at the nearest enemy whenever there's enough MP
  if (F.ability && R.phase === 'fight' && R.enemies.length && h.mp >= abilityCost(F.ability)) castAbility(R, F);

  if (R.phase === 'fight') {
    h.fireT += dt * F.aps * (h.berserkUntil > R.t ? 1.6 : 1);
    while (h.fireT >= 1 && R.enemies.length) { h.fireT -= 1; fire(R, F); }
    if (!R.enemies.length) h.fireT = Math.min(h.fireT, 1);
  }

  // hero shots
  for (const s of R.shots) {
    const st = s.speed * dt;
    s.dist += st;
    s.x += Math.cos(s.ang) * st; s.y += Math.sin(s.ang) * st;
    const off = s.wave ? Math.sin(s.dist / 38) * s.wave : 0;
    s.px = s.x - off * Math.sin(s.ang); s.py = s.y + off * Math.cos(s.ang);
    for (const e of R.enemies) {
      if (s.hit.has(e.id) || Math.hypot(e.x - s.px, e.y - s.py) > e.r + s.r) continue;
      s.hit.add(e.id);
      if (s.dmg != null) hurtEnemy(R, F, e, s.dmg, s);
      else {
        const { m, crit } = shotDamage(R, F, e);
        hurtEnemy(R, F, e, R.rng.range(F.dmgMin, F.dmgMax) * F.attMult * m * (s.burst || 1), { ...s, crit });
      }
      if (s.burst) { s.dead = true; R.fx.push({ k: 'burst', x: s.px, y: s.py, t: 0, life: 0.35, c: '#ff7a3c' }); break; }
      if (!s.pierce) { s.dead = true; break; }
    }
    if (s.dist > s.range) s.dead = true;
  }
  R.shots = R.shots.filter((s) => !s.dead);

  // zones (trap, poison)
  R.zones = R.zones.filter((z) => z.until > R.t);
  for (const z of R.zones) for (const e of R.enemies) if (dist(e, z) < z.r + e.r) { const d = z.dps * dt; e.hp -= d; R.stats.dmg += d; if (z.slow) e.slowUntil = R.t + 0.3; }

  // enemies
  for (const e of R.enemies) {
    enemyAI(R, e, dt);
    if (e.flash > 0) e.flash -= dt;
    if (e.poison > 0) { const p = e.poison * dt / 3; e.poison -= p; e.hp -= p; }
  }
  for (const e of R.enemies) if (e.hp <= 0 && !e.gone) {
    e.gone = true; R.stats.kills++;
    R.fx.push({ k: 'puff', x: e.x, y: e.y, t: 0, life: 0.5, c: e.pal.b || '#fff' });
    if (fx.killHeal) h.hp = Math.min(F.maxHp, h.hp + F.maxHp * fx.killHeal);
    dropsFor(R, e);
  }
  R.enemies = R.enemies.filter((e) => !e.gone);

  // enemy bullets vs hero (small Realm hitbox; SPD gives a chance for a bullet to graze past)
  const invis = h.invisUntil > R.t;
  for (const b of R.bullets) {
    b.life -= dt; b.t += dt;
    let x = b.x + b.vx * dt, y = b.y + b.vy * dt;
    b.x = x; b.y = y;
    if (b.wave) { const sp = Math.hypot(b.vx, b.vy) || 1; const off = Math.cos(b.t * 6) * b.wave * dt * 6; b.x += (-b.vy / sp) * off; b.y += (b.vx / sp) * off; }
    if (b.x < -20 || b.x > W + 20 || b.y < -20 || b.y > H + 20) b.life = 0;
    if (b.life <= 0 || invis || Math.hypot(b.x - h.x, b.y - h.y) >= b.r + 5) continue;
    b.life = 0;
    if (R.rng.next() < F.dodge * 0.5) { R.nums.push({ x: h.x + 14, y: h.y - 22, text: 'graze', t: 0, c: '#9fd8ff' }); continue; }
    if (fx.block && R.rng.next() < fx.block) { R.nums.push({ x: h.x + 14, y: h.y - 22, text: 'block', t: 0, c: '#9fd8ff' }); continue; }
    let d = Math.max(b.dmg - F.def, b.dmg * CONFIG.minDamageAfterDef);
    d *= (1 + (fx.dmgTaken || 0)) * (1 - (fx.dr || 0));
    if (fx.lowHpDR && h.hp < F.maxHp * 0.4) d *= 1 - fx.lowHpDR;
    h.hp -= d; h.hurtT = 0.15;
    R.nums.push({ x: h.x + 14, y: h.y - 22, text: `-${Math.round(d)}`, t: 0, c: '#ff6b5e' });
    if (h.hp <= 0) {
      if (fx.cheatDeath && R.t >= h.cheatReadyAt) { h.hp = 1; h.cheatReadyAt = R.t + fx.cheatDeath; R.fx.push({ k: 'banner', text: 'UNDYING!', t: 0, life: 1.2 }); continue; }
      h.hp = 0; R.phase = 'dead'; R.fx.push({ k: 'puff', x: h.x, y: h.y, t: 0, life: 0.8, c: '#ff4030' });
      break;
    }
  }
  R.bullets = R.bullets.filter((b) => b.life > 0);
  if (h.hurtT > 0) h.hurtT -= dt;

  // loot goes straight to your bag: it pops out, then flies to you
  for (const b of R.bags) {
    b.t += dt;
    if (b.t > 0.5 && !b.taken) { b.taken = true; R.loot.push(b.id); R.fx.push({ k: 'pickup', x: b.x, y: b.y, id: b.id, t: 0, life: 1.6 }); R.fx.push({ k: 'fly', x: b.x, y: b.y, id: b.id, t: 0, life: 0.35 }); }
  }
  R.bags = R.bags.filter((b) => !b.taken);

  // rooms, then the boss
  if (R.phase === 'fight' && !R.enemies.length) {
    R.bullets = []; R.phase = 'cleared'; R.clearT = 0;
    if (R.room < R.rooms - 1) R.fx.push({ k: 'banner', text: 'Room cleared!', t: 0, life: 1.4 });
  }
  if (R.phase === 'cleared') {
    R.clearT += dt;
    if (R.clearT > 2 && !R.bags.length) { if (R.room < R.rooms - 1) { R.room++; spawnRoom(R); } else R.phase = 'won'; }
  }
  for (const n of R.nums) n.t += dt;
  R.nums = R.nums.filter((n) => n.t < 0.7);
  for (const f of R.fx) f.t += dt;
  R.fx = R.fx.filter((f) => f.t < f.life);
}

/** Extra numbers the hero needs in a run, on top of the idle fighter. */
export function arenaFighter(F, cls) {
  return { ...F, weaponType: CLASS[cls].weapon, colors: CLASS[cls].colors };
}
