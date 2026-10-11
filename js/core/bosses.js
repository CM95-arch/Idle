// Dungeon bosses, modeled on their Realm of the Mad God counterparts (RealmEye wiki), simplified for one thumb.
// Two rules: every bullet comes out of an enemy's body (the boss or one of its helpers), and nothing steers
// at you after it's fired. Helpers that shield a boss make it invulnerable ("immune") until they're dealt with.
import { DUNGEON_MOBS } from '../data/world.js';
import { W, TAU, BOSS_HP, bullet, ring, aimed, mob } from './arena.js';

const PI = Math.PI;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const angTo = (R, s) => Math.atan2(R.hero.y - s.y, R.hero.x - s.x);
const rnd = (R, a, b) => a + R.rng.next() * (b - a);
const TOP = 340; // enemies stay in the upper part of the arena

// n directions evenly spaced from a0; `per` shots in each, `gap` radians apart
function dirs(R, s, n, a0, speed, dmg, o, per = 1, gap = 0) {
  for (let k = 0; k < n; k++) for (let j = 0; j < per; j++) bullet(R, s.x, s.y, a0 + (k / n) * TAU + (j - (per - 1) / 2) * gap, speed, dmg, o);
}
function later(R, e, delay, fn) { (e.q ||= []).push({ at: R.t + delay, fn }); }
function tele(R, e, life = 0.8, c) { R.fx.push({ k: 'tele', id: e.id, t: 0, life, c }); }
function say(R, text) { R.fx.push({ k: 'banner', text, t: 0, life: 1.8 }); }
function setMode(e, m) { e.mode = m; e.modeT = 0; e.tm = {}; }
const once = (e, key) => (e.tm['!' + key] ? false : (e.tm['!' + key] = true));
const short = (e) => e.name.split(/[ ,]/)[0];
// HP phases: thresholds like [0.66, 0.33] give phases 1..3. Phase changes reset the attack timers.
function phase(R, e, th, lines = {}) {
  const f = e.hp / e.maxHp, p = 1 + th.filter((t) => f <= t).length;
  if (p !== e.p) {
    const first = e.p == null;
    e.p = p; e.tm = {};
    if (!first) { e.flash = 0.4; say(R, lines[p] || `${short(e)} is ${p === th.length + 1 ? 'desperate' : 'enraged'}!`); }
  }
  return p;
}
// steer to a point (no overshoot); true once there
function goTo(e, x, y, sp) {
  y = clamp(y, e.r + 40, TOP);
  const dx = x - e.x, dy = y - e.y, d = Math.hypot(dx, dy);
  if (d < 3) { e.vx = e.vy = 0; return true; }
  const v = Math.min(sp, d * 8); e.vx = (dx / d) * v; e.vy = (dy / d) * v;
  return false;
}
function orbitPath(e, cx, cy, rx, ry, w, dt) { e.oa = (e.oa ?? -PI / 2) + w * dt; goTo(e, cx + Math.cos(e.oa) * rx, cy + Math.sin(e.oa) * ry, 600); }
function hold(e, x, y) { e.x = x; e.y = y; e.vx = e.vy = 0; }

function body(R, o) {
  const hp = (o.hp ?? 1) * (o.boss ? BOSS_HP : 1000) * R.sc.hp;
  return {
    name: o.name, sprite: o.sprite, pal: o.pal || R.d.pal, kind: o.boss ? 'boss' : 'minion', boss: !!o.boss, id: R.uid++,
    x: o.x, y: o.y, hp, maxHp: hp, r: o.r || (o.boss ? 34 : 14), size: o.size || 1, speed: 40, def: 0, t: 0,
    stunUntil: 0, slowUntil: 0, flash: 0, vx: 0, vy: 0, poison: 0, spin: 0, dir: 1, tm: {}, modeT: 0,
    ai: o.ai, inv: !!o.inv, owner: o.owner?.id, noDrop: !o.boss, tag: o.tag, onZero: o.onZero, ...o.extra,
  };
}
const add = (R, o) => { const b = body(R, o); R.enemies.push(b); return b; };
const B = (R, o) => add(R, { boss: true, name: R.d.boss, sprite: R.d.bossSprite, x: 180, y: 130, ...o });
const helpers = (R, e, tag) => R.enemies.filter((m) => m.owner === e.id && !m.gone && m.hp > 0 && (!tag || m.tag === tag));
const vanish = (m) => { m.hp = 0; m.silent = true; };
// the dungeon's own monsters, called in by the boss
function summon(R, e, n, { i = 0, mult = 0.6, tag } = {}) {
  const mobs = DUNGEON_MOBS[R.d.id] || [['Minion', 'humanoid']];
  const [name, sprite] = mobs[Math.min(i, mobs.length - 1)];
  for (let k = 0; k < n; k++) {
    const m = mob(R, name, sprite, clamp(e.x + (k - (n - 1) / 2) * 60, 30, W - 30), clamp(e.y + 40, 70, TOP), mult);
    m.owner = e.id; m.noDrop = true; m.tag = tag; R.enemies.push(m);
  }
}
// a small helper that walks straight along a heading and nips at you when you're close
function walker(R, owner, name, sprite, x, y, heading, o = {}) {
  return add(R, { owner, name, sprite, x, y, size: o.size || 0.7, r: o.r || 9, hp: o.hp || 0.15, pal: o.pal, extra: { a: heading, life: o.life || 8 },
    ai(R, m, dt, every) {
      m.vx = Math.cos(m.a) * (o.speed || 80); m.vy = Math.sin(m.a) * (o.speed || 80);
      if (m.x < 20 || m.x > W - 20) m.a = PI - m.a;
      if (every('bite', 1.1)) bullet(R, m.x, m.y, angTo(R, m), 280, o.dmg || 36, { r: 4, life: 0.6, color: o.color || '#ffffff' });
      if (m.t > m.life) vanish(m);
    } });
}

/** Runs any enemy that has its own script (bosses and their helpers). */
export function runAI(R, e, dt) {
  if (e.q?.length) {
    const due = e.q.filter((x) => x.at <= R.t);
    if (due.length) { e.q = e.q.filter((x) => x.at > R.t); for (const x of due) x.fn(); }
  }
  e.modeT += dt;
  // timers start part-way so a new phase or mode opens with a short breather
  const every = (key, sec) => { const v = (e.tm[key] ?? sec * 0.6) - dt; if (v <= 0) { e.tm[key] = v + sec; return true; } e.tm[key] = v; return false; };
  e.ai(R, e, dt, every);
}

/** Fill the boss room. */
export function spawnBoss(R) {
  R.enemies = [];
  (BOSSES[R.d.id] || BOSSES.oryx)(R);
  return R.enemies;
}

const WHITE = '#f4f4f4';

const BOSSES = {
  // Stheno: guarded by a ring of pets that bite anything close. Cycles Blades (pairs in 4 directions, one aimed
  // at you) → Swarm (snakes pour out and slither in straight lines) → Spiral (6-arm blinding spiral), with short
  // invulnerable pauses between.
  snake_pit(R) {
    const e = B(R, { x: 180, y: 150, ai(R, e, dt, every) {
      const f = phase(R, e, [0.5], { 2: 'Stheno grows frantic!' }) === 2 ? 0.75 : 1;
      e.vx = e.vy = 0;
      const next = (m, len) => { if (e.modeT > len) { setMode(e, 'rest'); e.after = m; } };
      switch (e.mode) {
        case 'rest': e.inv = true; if (e.modeT > 1.2 * f) { e.inv = false; setMode(e, e.after); } break;
        case 'swarm':
          if (once(e, 'swarm')) for (let k = 0; k < 6; k++) walker(R, e, 'Stheno Swarm', 'snake', e.x, e.y + 20, angTo(R, e) + (k - 2.5) * 0.3, { life: 6 });
          if (every('b', f)) dirs(R, e, 4, angTo(R, e), 250, 55, { r: 6, color: '#f0f0d0' });
          next('spiral', 6); break;
        case 'spiral': if (every('s', 0.2)) { e.spin += 0.22; dirs(R, e, 6, e.spin, 170, 38, { r: 4, color: WHITE }); } next('blades', 6); break;
        default: e.mode = 'blades'; if (every('b', 0.8 * f)) dirs(R, e, 4, angTo(R, e), 250, 55, { r: 6, color: '#f0f0d0' }, 2, 0.07); next('swarm', 5);
      }
    } });
    for (let k = 0; k < 6; k++) add(R, { owner: e, name: 'Stheno Pet', sprite: 'snake', size: 0.6, r: 8, inv: true, x: e.x, y: e.y, extra: { oa: (k / 6) * TAU },
      ai(R, m, dt, every) { m.oa += dt * 1.8; hold(m, e.x + Math.cos(m.oa) * 62, e.y + Math.sin(m.oa) * 62); if (every('f', 0.6)) bullet(R, m.x, m.y, m.oa, 70, 40, { r: 5, life: 0.9, color: '#9bd84a' }); } });
  },

  // Limon: chases you blasting seven rings in a row. At 66% she becomes immune in the middle of two squares of
  // Limon Elements that fire lines between each other (stand in the corridor), then fires 3-way laser streams.
  sprite_world(R) {
    const C = { x: 180, y: 190 };
    const corners = (hlf) => [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([sx, sy]) => ({ x: C.x + sx * hlf, y: C.y + sy * hlf }));
    const inner = corners(45), outer = corners(110);
    B(R, { x: 180, y: 140, ai(R, e, dt, every) {
      const p = phase(R, e, [0.66, 0.33]);
      const lasers = (sp) => { e.spin += dt * sp; if (every('l', 0.11)) dirs(R, e, 3, e.spin, 230, 40, { r: 4, color: '#ff9a3c' }); };
      if (p === 1) {
        goTo(e, R.hero.x, 170, 70);
        if (every('blast', 3.2)) for (let k = 0; k < 7; k++) later(R, e, k * 0.22, () => ring(R, e, 10, 170, 42, k * 0.16, { r: 5, color: k % 2 ? '#5de0ff' : '#ff9a3c' }));
        return;
      }
      if (e.mode !== 'turret' && e.mode !== 'lasers') setMode(e, 'turret');
      if (e.mode === 'turret') {
        e.inv = true;
        if (goTo(e, C.x, C.y, 160) && !helpers(R, e, 'el').length && e.modeT < 9) {
          [...inner, ...outer].forEach((pt, k) => add(R, { owner: e, tag: 'el', name: 'Limon Element', sprite: 'wisp', size: 0.7, r: 10, inv: true, x: pt.x, y: pt.y, extra: { k },
            ai(R, m, dt, every) {
              hold(m, pt.x, pt.y);
              const sq = m.k < 4 ? inner : outer, nb = sq[(m.k % 4 + 1) % 4];
              if (every('line', 0.2)) { const d = Math.hypot(nb.x - m.x, nb.y - m.y); bullet(R, m.x, m.y, Math.atan2(nb.y - m.y, nb.x - m.x), 200, 44, { r: 5, color: '#ffffff', life: d / 200 }); }
              if (e.modeT > 5 && m.k < 4 && every('x', 0.25)) { const o = outer[m.k], d = Math.hypot(o.x - m.x, o.y - m.y); bullet(R, m.x, m.y, Math.atan2(o.y - m.y, o.x - m.x), 200, 44, { r: 5, color: '#c070ff', life: d / 200 }); }
            } }));
        }
        if (e.modeT > 10) { for (const m of helpers(R, e, 'el')) vanish(m); e.inv = false; setMode(e, 'lasers'); }
      } else {
        e.vx = e.vy = 0; lasers(p === 3 ? 0.9 : 0.6);
        if (p === 3 && every('ring', 2.5)) ring(R, e, 12, 150, 40, e.t, { color: '#5de0ff' });
        if (p === 3 && every('sprites', 8)) summon(R, e, 2);
        if (p === 2 && e.modeT > 8) setMode(e, 'turret');
      }
    } });
  },

  // Septavius: starts as an immune ghost spinning a 3-arm spiral while his ghosts attack; materializes when they're
  // gone. Then alternates a stationary spiral with chasing you firing rings, then a confusing star phase, and
  // finally rotating crosses of black arrows.
  undead_lair(R) {
    const e = B(R, { x: 180, y: 140, inv: true, extra: { mode: 'veil' }, ai(R, e, dt, every) {
      if (e.mode === 'veil') {
        e.vx = Math.sin(e.t * 0.5) * 30; e.vy = 0; e.spin += dt * 1.4;
        if (every('s', 0.25)) dirs(R, e, 3, e.spin, 140, 38, { r: 5, color: WHITE });
        if (!helpers(R, e).length) { e.inv = false; say(R, 'Septavius materializes!'); setMode(e, 'a'); }
        return;
      }
      const p = phase(R, e, [0.66, 0.33]);
      if (p === 1) {
        if (e.modeT > 6) setMode(e, e.mode === 'a' ? 'b' : 'a');
        if (e.mode === 'a') {
          e.vx = e.vy = 0; e.spin += dt * 1.8;
          if (every('s', 0.15)) dirs(R, e, 2, e.spin, 150, 36, { r: 4, color: WHITE });
          if (every('a', 1.6)) aimed(R, e, 3, 0.3, 210, 44, { color: '#c0c0ff' });
        } else {
          goTo(e, R.hero.x, R.hero.y - 160, 70);
          if (every('ring', 1.8)) ring(R, e, 10, 150, 42, e.t, { color: WHITE });
          if (every('a', 1.2)) aimed(R, e, 3, 0.3, 210, 44, { color: '#c0c0ff' });
          if (every('arrows', 2.5)) for (let k = 0; k < 4; k++) later(R, e, k * 0.09, () => aimed(R, e, 1, 0, 300, 40, { r: 4, color: '#202030' }));
        }
      } else if (p === 2) {
        goTo(e, R.hero.x, R.hero.y - 170, 25);
        if (every('stars', 1.3)) aimed(R, e, 3, 0.5, 170, 46, { r: 6, color: '#ffe060' });
        if (every('brown', 2)) ring(R, e, 16, 110, 34, e.t, { r: 3, color: '#a07040' });
        if (every('ghosts', 10)) summon(R, e, 2, { i: 1 });
      } else {
        e.vx = Math.sin(e.t * 0.6) * 30; e.vy = 0;
        if (every('cross', 0.35)) { e.spin += 0.12; dirs(R, e, 4, e.spin, 260, 46, { r: 5, color: '#202030' }); }
        if (every('ghosts', 9)) summon(R, e, 2, { i: 1 });
      }
    } });
    summon(R, e, 4, { i: 1, mult: 0.5 });
  },

  // Malphas: cycles four forms on a timer. Missiles (minions that fly to where you stood and burst) with white
  // shots → shrinks and darts around firing rings of shields → swells up, slow, adding heavy white balls → calls
  // Flamers and stops firing (the damage window). Below a third he adds a flaming spiral to everything.
  abyss_demons(R) {
    B(R, { x: 180, y: 140, ai(R, e, dt, every) {
      const p = phase(R, e, [0.66, 0.33]);
      const order = ['missiles', 'small', 'large', 'summon'], len = { missiles: 6, small: 6, large: 6, summon: 5 };
      if (!order.includes(e.mode)) setMode(e, 'missiles');
      if (e.modeT > len[e.mode]) setMode(e, order[(order.indexOf(e.mode) + 1) % 4]);
      e.size = e.mode === 'small' ? 0.6 : e.mode === 'large' ? 1.4 : 1; e.r = 34 * e.size;
      const shields = (sec) => { if (every('sh', sec)) ring(R, e, 10, 150, 40, e.t, { r: 6, color: '#d0d8e0' }); };
      switch (e.mode) {
        case 'missiles':
          e.vx = Math.sin(e.t * 0.6) * 40; e.vy = Math.sin(e.t * 0.9) * 12;
          if (every('m', p > 1 ? 1.2 : 1.6)) {
            const tx = R.hero.x, ty = R.hero.y;
            add(R, { owner: e, name: 'Malphas Missile', sprite: 'demon', size: 0.5, r: 8, hp: 0.12, x: e.x, y: e.y + 20, extra: { tx, ty },
              ai(R, m) {
                const a = Math.atan2(m.ty - m.y, m.tx - m.x); m.vx = Math.cos(a) * 140; m.vy = Math.sin(a) * 140;
                if (Math.hypot(m.tx - m.x, m.ty - m.y) < 12 || m.t > 3 || (m.y >= TOP - 2 && m.ty > TOP)) { ring(R, m, 8, 170, 40, 0, { r: 5, color: '#ff4030' }); vanish(m); }
              } });
          }
          if (every('w', 1.0)) aimed(R, e, 1, 0, 230, 48, { color: WHITE });
          break;
        case 'small':
          if (every('dart', 0.5)) { const a = rnd(R, 0, TAU); e.vx = Math.cos(a) * 160; e.vy = Math.sin(a) * 160; }
          if (e.x < 50 || e.x > W - 50) e.vx = -Math.sign(e.x - 180) * Math.abs(e.vx);
          shields(0.9); break;
        case 'large':
          e.vx = Math.sin(e.t * 0.4) * 20; e.vy = 0;
          shields(1.3);
          if (every('ball', 1.8)) aimed(R, e, 1, 0, 95, 70, { r: 13, color: WHITE });
          break;
        default:
          e.vx = e.vy = 0;
          if (once(e, 'flamers')) summon(R, e, 2, { i: 2 });
      }
      if (p === 3) { e.spin += dt * 2; if (every('fl', 0.2)) dirs(R, e, 2, e.spin, 140, 38, { r: 4, color: '#ff6a30' }); }
    } });
  },

  // Lord Ruthven: four Coffin Creatures on the walls (immune for now) shoot and release bats while he teleports
  // around the carpet firing dagger fans and blood rings that heal him. At half HP he hides, immune, and the
  // coffins become breakable; break all four to bring him back.
  manor(R) {
    const spots = [[180, 80], [22, 220], [338, 220], [180, 330]];
    const e = B(R, { x: 180, y: 170, ai(R, e, dt, every) {
      const coffins = helpers(R, e, 'coffin');
      if (e.mode !== 'hide' && e.mode !== 'back' && e.hp <= e.maxHp * 0.5) {
        setMode(e, 'hide'); e.inv = true; hold(e, 180, 180); say(R, 'Ruthven hides! Break the coffins!');
        for (const c of coffins) c.inv = false;
      }
      if (e.mode === 'hide') {
        e.vx = e.vy = 0;
        if (every('ring', 3)) ring(R, e, 12, 130, 40, e.t, { color: '#ff3a5a', heal: e.id });
        if (!coffins.length) { e.inv = false; setMode(e, 'back'); say(R, 'Ruthven returns, furious!'); }
        return;
      }
      const back = e.mode === 'back';
      e.vx = e.vy = 0;
      if (every('tp', back ? 1.8 : 2.4)) {
        R.fx.push({ k: 'puff', x: e.x, y: e.y, t: 0, life: 0.4, c: '#8a2a3a' });
        hold(e, 180 + (R.rng.next() < 0.5 ? -50 : 50), 170 + (R.rng.next() < 0.5 ? -40 : 40));
        later(R, e, 0.3, () => aimed(R, e, back ? 7 : 5, 0.7, 270, 50, { r: 4, color: '#e6e6f5' }));
      }
      if (every('ring', back ? 2.4 : 3)) ring(R, e, 12, 140, 40, e.t, { color: '#ff3a5a', heal: e.id });
    } });
    for (const [x, y] of spots) add(R, { owner: e, tag: 'coffin', name: 'Coffin Creature', sprite: 'golem', size: 0.7, r: 13, hp: 0.8, inv: true, x, y,
      pal: { a: '#3a2410', b: '#6a4420', c: '#ff3a5a' },
      ai(R, m, dt, every) {
        hold(m, x, y);
        if (every('s', 2.6)) aimed(R, m, 1, 0, 150, 40, { color: '#ff7a8a' });
        if (every('bat', 9) && R.enemies.filter((b) => b.tag === 'bat').length < 4) walker(R, e, 'Vampire Bat', 'beast', m.x, m.y, angTo(R, m), { speed: 90, life: 7, color: '#ff7a8a', dmg: 34 }).tag = 'bat';
      } });
  },

  // Davy Jones: immune while his six Ghost Lanterns are dark, slowly stalking you with bleeding slashes and ghost
  // pirate escorts. Light every lantern (shoot them) to open a short window; he crumples, then turns into a ghost
  // and charges you, and the lanterns go dark again with a burst. Below half HP he adds a boomerang.
  davy(R) {
    const UNLIT = { a: '#4a6a7a', b: '#7a9aaa', c: '#c0e0f0', d: '#2a3a4a' }, LIT = { a: '#ffd34d', b: '#fff3b0', c: '#ffffff', d: '#b08a1a' };
    const e = B(R, { x: 180, y: 120, inv: true, extra: { mode: 'guard' }, ai(R, e, dt, every) {
      const p = phase(R, e, [0.5]);
      const lanterns = helpers(R, e, 'lantern');
      if (p === 2 && every('boom', 2)) aimed(R, e, 1, 0, 170, 60, { r: 8, color: '#40e0c0', life: 3, boom: true });
      switch (e.mode) {
        case 'down': e.inv = false; e.vx = e.vy = 0; if (e.modeT > 1) { e.hp0 = e.hp; setMode(e, 'open'); } break;
        case 'open':
          e.vx = e.vy = 0;
          if (e.modeT > 10 || e.hp0 - e.hp > e.maxHp * 0.34) { e.inv = true; setMode(e, 'charge'); say(R, 'Davy takes ghostly form!'); }
          break;
        case 'charge':
          goTo(e, R.hero.x, R.hero.y - 120, 160);
          if (every('shot', 0.6)) aimed(R, e, 5, 0.35, 260, 52, { r: 5, color: '#ff6060' });
          if (e.modeT > 4) {
            for (const l of lanterns) { l.lit = false; l.inv = false; l.pass = false; l.pal = UNLIT; l.hp = l.maxHp; ring(R, l, 6, 140, 44, 0, { r: 7, life: 0.7, color: '#ffd34d' }); }
            setMode(e, 'guard');
          }
          break;
        default:
          e.inv = true;
          goTo(e, R.hero.x, R.hero.y - 200, 25);
          if (every('slash', 1.0)) aimed(R, e, 5, 0.17, 250, 55, { r: 5, color: '#ff6060' });
          if (every('crew', 6) && helpers(R, e, 'crew').length < 2) summon(R, e, 1, { tag: 'crew' });
          if (lanterns.length && lanterns.every((l) => l.lit)) { setMode(e, 'down'); say(R, 'The lanterns blaze. Davy is exposed!'); }
      }
    } });
    for (const y of [175, 300]) for (const x of [40, 180, 320]) add(R, { owner: e, tag: 'lantern', name: 'Ghost Lantern', sprite: 'wisp', size: 1.1, r: 13, hp: 0.25, x, y, pal: UNLIT,
      onZero(R, l) { l.lit = true; l.inv = true; l.pass = true; l.hp = l.maxHp; l.litT = R.t; l.pal = LIT; return true; },
      ai(R, l) { hold(l, x, y); if (l.lit && e.mode === 'guard' && R.t - l.litT > 30) { l.lit = false; l.inv = false; l.pass = false; l.pal = UNLIT; } } });
  },

  // Megamoth: a larva that fires fixed lanes down its diagonals; it turns immune and flashes red as it transforms
  // into the Mammoth Megamoth (charges, wider lanes) and finally the Murderous Megamoth (fast aimed pairs and
  // diagonal boomerangs). Each transformation releases a swarm of Mini Larvae that circle it and spray rings.
  labyrinth(R) {
    const forms = { 1: ['Larva', 'bug', 0.8], 2: ['Mammoth Megamoth', 'bug', 1.1], 3: ['Murderous Megamoth', 'bug', 1.3] };
    const larvae = (e, n) => { for (let k = 0; k < n; k++) add(R, { owner: e, tag: 'larva', name: 'Mini Larva', sprite: 'bug', size: 0.45, r: 7, hp: 0.12, x: e.x, y: e.y, extra: { oa: rnd(R, 0, TAU), rad: rnd(R, 50, 95) },
      ai(R, m, dt, every) { m.oa += dt * 1.3; hold(m, clamp(e.x + Math.cos(m.oa) * m.rad, 10, W - 10), clamp(e.y + Math.sin(m.oa) * m.rad, 50, TOP)); if (every('r', 3.5)) ring(R, m, 6, 260, 34, m.oa, { r: 4, life: 0.55, color: '#c6e070' }); } }); };
    B(R, { x: 180, y: 130, ai(R, e, dt, every) {
      const p = phase(R, e, [0.66, 0.33], { 2: 'The larva transforms!', 3: 'The Murderous Megamoth emerges!' });
      if (e.form == null) e.form = p;
      if (e.form !== p) { e.form = p; e.inv = true; setMode(e, 'morph'); tele(R, e, 2.5); }
      if (e.mode === 'morph') {
        e.vx = e.vy = 0;
        if (e.modeT > 2.5) { e.inv = false; [e.name, e.sprite, e.size] = forms[p]; e.r = 34 * e.size; if (p > 1) larvae(e, 6); setMode(e, 'go'); }
        return;
      }
      const diag = (per, gap, speed, dmg) => dirs(R, e, 4, PI / 4, speed, dmg, { r: 5, color: '#ffef80' }, per, gap);
      if (p > 1 && every('more', 5.5) && helpers(R, e, 'larva').length < 10) larvae(e, 2);
      if (p === 1) { goTo(e, R.hero.x, 140, 25); if (every('lanes', 1.75)) diag(2, 0.09, 200, 46); }
      else if (p === 2) {
        if (every('charge', 2)) e.goal = { x: R.hero.x, y: rnd(R, 110, 260) };
        if (!e.goal || goTo(e, e.goal.x, e.goal.y, 200)) e.goal = null;
        if (every('lanes', 1.5)) diag(3, 0.09, 260, 52);
      } else {
        if (every('charge', 2)) { const a = angTo(R, e); e.goal = { x: e.x + Math.cos(a) * 120, y: e.y + Math.sin(a) * 120 }; }
        if (!e.goal || goTo(e, e.goal.x, e.goal.y, 220)) e.goal = null;
        if (every('yellow', 0.7)) aimed(R, e, 2, 0.12, 300, 48, { r: 4, color: '#ffe040' });
        if (every('green', 2)) dirs(R, e, 4, PI / 4, 110, 48, { r: 7, color: '#60d060', life: 4.4, boom: true }, 2, 0.1);
      }
    } });
  },

  // Jon Bilgewater: alternates a coin phase (darting around flinging coins) with a cannon phase (follows you,
  // 7 huge cannonballs fanned over 180°). At 66% he goes immune and calls his parrots, who fly around then circle
  // and heal; kill them all to bring him down. Near the end he fires cannonballs in every direction.
  docks(R) {
    const BALL = { r: 12, color: '#3a3a3a' };
    B(R, { x: 180, y: 120, ai(R, e, dt, every) {
      const p = phase(R, e, [0.66, 0.25], { 2: 'Bilgewater calls his parrots!', 3: 'All cannons, fire!' });
      if (p === 2 && !e.parrotsDone) {
        if (!e.parrots) {
          e.parrots = true; e.inv = true; setMode(e, 'fans');
          for (let k = 0; k < 6; k++) add(R, { owner: e, tag: 'parrot', name: 'Parrot', sprite: 'wisp', size: 0.6, r: 9, hp: 0.4, x: e.x, y: e.y, pal: { a: '#e03030', b: '#30c040', c: '#ffd34d' }, extra: { oa: (k / 6) * TAU },
            ai(R, m, dt, every) {
              if (e.mode === 'circle') { m.oa += dt * 2; goTo(m, e.x + Math.cos(m.oa) * 55, e.y + Math.sin(m.oa) * 55, 300); if (every('heal', 1)) for (const o of helpers(R, e, 'parrot')) o.hp = Math.min(o.maxHp, o.hp + o.maxHp * 0.05); }
              else { if (every('wander', 1.5)) m.goal = { x: rnd(R, 30, W - 30), y: rnd(R, 70, TOP) }; if (m.goal) goTo(m, m.goal.x, m.goal.y, 110); }
              if (every('s', 1.6)) aimed(R, m, 1, 0, 200, 40, { r: 4, color: '#30c040' });
            } });
        }
        goTo(e, 180, 110, 120);
        if (e.modeT > 6) setMode(e, e.mode === 'fans' ? 'circle' : 'fans');
        if (e.mode === 'fans' && every('fan', 1.75)) aimed(R, e, 7, PI, 220, 62, BALL);
        if (!helpers(R, e, 'parrot').length) { e.parrotsDone = true; e.inv = false; say(R, 'Bilgewater is exposed!'); setMode(e, 'coin'); }
        return;
      }
      if (e.mode !== 'coin' && e.mode !== 'cannon') setMode(e, 'coin');
      if (e.mode === 'coin') {
        if (every('wander', 0.9)) e.goal = { x: rnd(R, 50, W - 50), y: rnd(R, 90, 250) };
        if (e.goal) goTo(e, e.goal.x, e.goal.y, 130);
        if (every('coin', 0.6)) aimed(R, e, 1, 0, 260, 48, { r: 5, color: '#ffd34d' });
        if (e.modeT > 4.5) setMode(e, 'cannon');
      } else {
        goTo(e, R.hero.x, 140, 60);
        if (every('fan', 1)) aimed(R, e, 7, PI, 220, 62, BALL);
        if (e.modeT > 5) setMode(e, 'coin');
      }
      if (p === 3 && every('all', 1.4)) ring(R, e, 16, 160, 58, e.t, BALL);
    } });
  },

  // Heart of the Wetlands: a rooted heart in the middle of the bog. Six phases, each opened by a short immune pulse,
  // each a different root pattern. (Its real attacks aren't documented on the wiki; this is our own take.)
  wetlands(R) {
    B(R, { x: 180, y: 150, ai(R, e, dt, every) {
      e.vx = e.vy = 0;
      const p = phase(R, e, [5 / 6, 4 / 6, 3 / 6, 2 / 6, 1 / 6], { 2: 'The roots stir…', 3: 'The heart beats faster', 4: 'The bog boils!', 5: 'The heart is cracking!', 6: 'The heart goes wild!' });
      if (e.seen !== p) { e.seen = p; e.inv = true; e.pulse = R.t + 1.6; tele(R, e, 1.6, '#b0b040'); }
      if (e.inv) { if (R.t > e.pulse) { e.inv = false; ring(R, e, 20, 120, 40, 0, { r: 6, color: '#b0b040' }); } return; }
      const pulse = (n, sp, o = 0) => ring(R, e, n, sp, 42, e.t + o, { r: 6, color: '#b0b040' });
      const roots = (arms, w, sp) => { e.spin += dt * w * (Math.floor(e.t / 3) % 2 ? -1 : 1); if (every('root', 0.16)) dirs(R, e, arms, e.spin, sp, 36, { r: 4, color: '#8a6a2a' }); };
      const shot = (n, gap) => aimed(R, e, n, gap, 290, 46, { r: 4, color: '#ff6020' });
      if (p === 1) { if (every('pulse', 1.6)) pulse(12, 110); if (every('shot', 1.4)) shot(1, 0); }
      if (p === 2) { roots(4, 1.4, 140); if (every('mud', 10)) summon(R, e, 2); }
      if (p === 3) { if (every('pulse', 1.8)) { pulse(14, 120); later(R, e, 0.3, () => pulse(14, 120, PI / 14)); } if (every('shot', 1.2)) shot(3, 0.3); }
      if (p === 4) { roots(6, 0.8, 110); if (every('pulse', 2.4)) pulse(16, 140); }
      if (p === 5) { if (every('shot', 1.1)) for (let k = 0; k < 5; k++) later(R, e, k * 0.08, () => shot(1, 0)); if (every('pulse', 2)) pulse(14, 130); }
      if (p === 6) { roots(4, 1.6, 150); if (every('pulse', 1.6)) { pulse(14, 130); later(R, e, 0.3, () => pulse(14, 130, PI / 14)); } if (every('shot', 1.3)) shot(3, 0.3); }
    } });
  },

  // Thessal: four Deep Sea Beasts guard the sides (they come back if killed). Every few seconds she picks one:
  // Thunder Swirl (three rings), Super Trident (pairs in 4 directions, then turned 45°), or the Yellow Wall: she
  // flashes yellow, then sweeps 30 big bullets across the half below her three times. Below half HP she attacks
  // far more often with heavier versions.
  trench(R) {
    const spots = [[28, 170], [332, 170], [28, 320], [332, 320]];
    const beast = (e, k) => add(R, { owner: e, tag: 'beast', name: 'Deep Sea Beast', sprite: 'eye', size: 0.8, r: 12, hp: 0.5, x: spots[k][0], y: spots[k][1], extra: { slot: k },
      ai(R, m, dt, every) { hold(m, spots[k][0], spots[k][1]); if (every('f', 1)) ring(R, m, 8, 120, 46, m.t, { r: 6, life: 0.7, color: '#4aa0d0' }); } });
    const e = B(R, { x: 180, y: 130, ai(R, e, dt, every) {
      const p = phase(R, e, [0.5], { 2: 'Thessal rages!' });
      goTo(e, clamp(R.hero.x, 80, W - 80), 130, 25);
      if (every('beasts', 20)) for (let k = 0; k < 4; k++) if (!helpers(R, e, 'beast').some((m) => m.slot === k)) beast(e, k);
      if (!every('pick', p === 2 ? 2.0 : 3)) return;
      const pick = R.rng.int(0, 2);
      if (pick === 0) for (let k = 0; k < 3; k++) later(R, e, k * 0.5, () => ring(R, e, p === 2 ? 16 : 8, 190, 50, k * 0.2, { r: 6, color: '#9fe0ff' }));
      else if (pick === 1) { const a = angTo(R, e); for (let k = 0; k < (p === 2 ? 4 : 2); k++) later(R, e, k * 0.25, () => dirs(R, e, 4, a + k * PI / 4, 210, 50, { r: 5, color: '#ffd34d' }, 2, 0.44)); }
      else {
        tele(R, e, 1, '#ffe040');
        for (let k = 0; k < 3; k++) later(R, e, 1 + k * 0.5, () => { for (let i = 0; i < 30; i++) bullet(R, e.x, e.y, PI / 2 + (i - 14.5) * (PI / 30), 200, 54, { r: 9, color: '#ffe040' }); });
      }
    } });
    for (let k = 0; k < 4; k++) beast(e, k);
  },

  // The Tomb Triad: Bes, Nut and Geb fight side by side and wake up one at a time as you hurt them. Bes throws
  // boomerangs and a stunning wave; Nut heals the other two and throws colored boomerangs; Geb fires long dark
  // magic and green boomerangs, then sends scarabs. Each one calls Sphinx Artifacts at half HP. Killing one makes
  // the others angrier, and the last one standing goes into a rage.
  tomb(R) {
    const alive = () => R.enemies.filter((b) => b.boss && !b.gone && b.hp > 0);
    const artifacts = (e) => { for (let k = 0; k < 2; k++) add(R, { owner: e, name: 'Sphinx Artifact', sprite: 'cube', size: 0.5, r: 8, hp: 0.4, x: e.x, y: e.y, pal: { a: '#3a8a3a', b: '#80e080', c: '#ffffff' }, extra: { oa: k * PI },
      ai(R, m, dt, every) { m.oa += dt * 2; hold(m, e.x + Math.cos(m.oa) * 55, e.y + Math.sin(m.oa) * 55); if (every('star', 2)) aimed(R, m, 1, 0, 160, 48, { r: 6, color: '#60ff60' }); if (m.t > 14) vanish(m); } }); };
    const god = (name, x, y, pal, attack) => B(R, { name, x, y, pal, r: 26, size: 0.8, hp: 0.4, ai(R, e, dt, every) {
      if (e.hp >= e.maxHp) { e.vx = e.vy = 0; return; } // sleeps until you hurt it
      const p = phase(R, e, [0.5]);
      if (p === 2 && once(e, 'art')) artifacts(e);
      const n = alive().length, rage = 1 + 0.35 * (3 - n);
      if (n === 1 && name === 'Geb') { goTo(e, R.hero.x < 180 ? 300 : 60, 100, 90); if (every('storm', 0.9)) ring(R, e, 12, 160, 46, e.t, { color: '#40c040' }); }
      else e.vx = Math.sin(e.t * 0.5 + x) * 15;
      attack(e, every, p, rage);
    } });
    god('Bes', 70, 130, { a: '#c08a20', b: '#ffd34d', c: '#ff8040' }, (e, every, p, rage) => {
      if (every('aim', 1.5 / rage)) aimed(R, e, 4, 0.4, 190, 46, { color: '#ffd34d' });
      if (every('boom', 2.6 / rage)) aimed(R, e, 3, 0.5, 170, 50, { r: 7, color: '#ff8040', life: 3.2, boom: true });
      if (every('wave', 14)) { tele(R, e, 0.8); later(R, e, 0.8, () => ring(R, e, 24, 150, 44, 0, { r: 6, color: '#ffe080' })); }
    });
    god('Nut', 180, 110, { a: '#2050a0', b: '#40a0ff', c: '#ffffff' }, (e, every, p, rage) => {
      if (every('heal', 5)) for (const o of alive()) if (o !== e) { o.hp = Math.min(o.maxHp, o.hp + o.maxHp * 0.04); R.fx.push({ k: 'puff', x: o.x, y: o.y, t: 0, life: 0.5, c: '#7dff9a' }); }
      if (every('boom', 2.2 / rage)) for (let k = 0; k < 8; k++) bullet(R, e.x, e.y, e.t + (k / 8) * TAU, 150, 44, { r: 6, color: ['#40a0ff', '#ff60c0', '#ffd34d', '#60ff60'][k % 4], life: 3, boom: true });
      if (every('aim', 1.4 / rage)) aimed(R, e, 2, 0.2, 200, 44, { color: '#40a0ff' });
    });
    god('Geb', 290, 130, { a: '#2a6a2a', b: '#60c060', c: '#202020' }, (e, every, p, rage) => {
      if (every('boom', 2.4 / rage)) aimed(R, e, 1, 0, 130, 55, { r: 8, color: '#60d060', life: 4, boom: true });
      if (every('dark', 1.8 / rage)) aimed(R, e, 1, 0, 320, 70, { r: 5, color: '#202020' });
      if (p === 2) {
        if (every('fire', 6)) for (let k = 0; k < 20; k++) later(R, e, k * 0.1, () => bullet(R, e.x, e.y, k * 0.33, 150, 42, { r: 5, color: '#ff6020' }));
        if (every('scarabs', 10)) for (let k = 0; k < 2; k++) walker(R, e, 'Scarab', 'bug', e.x, e.y + 20, angTo(R, e) + (k ? 0.4 : -0.4), { speed: 70, life: 8, color: '#80c040' });
      }
    });
  },

  // The Mushroom Mother (the Fungal Cavern's Crystal Worm Father fight, mushroom-themed): immune while her Death
  // Morels live, spraying full rings of shards. Kill the morels and she's open; they sprout again at half HP.
  fungal(R) {
    const morels = (e, n) => { for (let k = 0; k < n; k++) { const x = 60 + (k / (n - 1)) * 240, y = k % 2 ? 300 : 240;
      add(R, { owner: e, tag: 'morel', name: 'Death Morel', sprite: 'blob', size: 0.6, r: 11, hp: 0.7, x, y, pal: { a: '#5a2a4a', b: '#d070b0', c: '#ffef80' },
        ai(R, m, dt, every) { hold(m, x, y); if (every('spore', 2.2)) aimed(R, m, 3, 0.4, 150, 40, { r: 5, color: '#d070b0' }); } }); } };
    const e = B(R, { x: 180, y: 140, inv: true, ai(R, e, dt, every) {
      const p = phase(R, e, [0.5, 0.2], { 2: 'Death Morels sprout again!', 3: 'The Mother bursts with spores!' });
      e.vx = 0; e.vy = Math.sin(e.t) * 6;
      if (p === 2 && once(e, 'regrow')) morels(e, 4);
      const guarded = helpers(R, e, 'morel').length > 0;
      if (e.inv && !guarded) say(R, 'The Mushroom Mother is exposed!');
      e.inv = guarded;
      if (every('shards', guarded ? 1.6 : 2.4)) { e.spin += 0.2; ring(R, e, 18, 120, 42, e.spin, { r: 5, color: '#ffef80' }); }
      if (every('pot', 1.4)) aimed(R, e, 2, 0.2, 190, 40, { color: '#d070b0' });
      if (p === 3 && every('ring2', 1.6)) ring(R, e, 16, 160, 44, e.t, { r: 6, color: '#8a3a6a' });
    } });
    morels(e, 3);
  },

  // The Killer Bee Queen: circles the room with stinger clusters, quieting blue bomb rings and white bombs. Then she
  // cycles colors (immune between), each color with its own bees and shots. Then she settles in the middle with a
  // rainbow barrage and glaive waves, and at the end calls two Beehemoths and fires a spinning stinger machine-gun.
  nest(R) {
    const COLORS = { yellow: '#ffe040', red: '#ff4040', blue: '#40a0ff' };
    B(R, { x: 180, y: 130, ai(R, e, dt, every) {
      const p = phase(R, e, [0.75, 0.4, 0.15], { 2: 'The Queen changes her colors!', 3: 'The Queen takes the center!', 4: 'The Queen calls her Beehemoths!' });
      if (p === 1) {
        orbitPath(e, 180, 190, 120, 70, 0.7, dt);
        if (every('blue', 2.2)) ring(R, e, 10, 110, 40, e.t, { r: 8, color: '#4080ff' });
        if (every('white', 1.6)) aimed(R, e, 1, 0, 160, 46, { r: 8, color: WHITE });
        if (every('sting', 1.2)) { const a = angTo(R, e); for (const c of [-0.3, 0, 0.3]) for (const j of [-0.05, 0, 0.05]) bullet(R, e.x, e.y, a + c + j, 240, 36, { r: 3, color: '#f0d040' }); }
      } else if (p === 2) {
        goTo(e, 180, 160, 80);
        if (!e.mode || e.mode === 'go') { e.ci = ((e.ci ?? -1) + 1) % 3; setMode(e, 'gap'); }
        const color = ['yellow', 'red', 'blue'][e.ci];
        if (e.mode === 'gap') {
          e.inv = true;
          if (e.modeT > 1.5) {
            e.inv = false; setMode(e, 'color');
            for (const b of helpers(R, e, 'bee')) vanish(b);
            for (let k = 0; k < 2; k++) add(R, { owner: e, tag: 'bee', name: 'Killer Bee', sprite: 'bug', size: 0.5, r: 8, hp: 0.25, x: e.x + (k ? 60 : -60), y: e.y + 30, pal: { a: COLORS[color], b: '#1a1a1a', c: '#ffffff' },
              ai(R, m, dt, every) { if (every('w', 1.5)) m.goal = { x: rnd(R, 30, W - 30), y: rnd(R, 80, TOP) }; if (m.goal) goTo(m, m.goal.x, m.goal.y, 100); if (every('s', 1.5)) aimed(R, m, 2, 0.2, 220, 38, { r: 4, color: COLORS[color] }); } });
          }
        } else {
          if (color === 'yellow' && every('y', 1)) aimed(R, e, 5, 0.5, 260, 40, { r: 4, color: COLORS.yellow });
          if (color === 'red' && every('r', 1.3)) aimed(R, e, 1, 0, 120, 70, { r: 11, color: COLORS.red });
          if (color === 'blue' && every('b', 1.6)) ring(R, e, 14, 110, 42, e.t, { r: 6, color: COLORS.blue });
          if (e.modeT > 6) e.mode = 'go';
        }
      } else {
        if (once(e, 'center')) { e.inv = false; for (const b of helpers(R, e, 'bee')) vanish(b); }
        goTo(e, 180, 170, 100);
        if (every('rainbow', 1.5)) { e.k = (e.k || 0) + 1; ring(R, e, 16, 140, 42, e.k * 0.2, { r: 6, color: Object.values(COLORS)[e.k % 3] }); }
        if (every('glaive', 2.2)) aimed(R, e, 5, 0.8, 170, 46, { r: 6, wave: 30, color: '#ffe040' });
        if (p === 4) {
          if (once(e, 'hemoths')) for (const x of [60, 300]) add(R, { owner: e, name: 'Beehemoth', sprite: 'bug', size: 0.9, r: 15, hp: 1.2, x, y: 250, pal: { a: '#ff4040', b: '#1a1a1a', c: '#ffe040' },
            ai(R, m, dt, every) { hold(m, x, 250); if (every('burst', 2.5)) ring(R, m, 8, 180, 46, m.t, { r: 6, color: '#ff4040' }); } });
          e.spin += dt * 2.4;
          if (every('mg', 0.07)) bullet(R, e.x, e.y, e.spin, 260, 34, { r: 4, color: '#ff4040' });
        }
      }
    } });
  },

  // Malus: five cultists stand on a pentagram. One at a time, each teleports around firing its own shape
  // (Basaran's slow blue shots, Argus's X, Gaius's pentagon, Dirge's square, Leucoryx's ring) until you knock it
  // down to a quarter, then goes back to its point. When all five are down they sacrifice themselves and Malus
  // wakes: he teleports firing rings and calls Followers; below half he borrows the cultists' shapes, and at the
  // very end fires all of them from the middle.
  cultist(R) {
    const C = { x: 180, y: 200 };
    const corner = (k) => ({ x: C.x + Math.cos(-PI / 2 + (k / 5) * TAU) * 115, y: C.y + Math.sin(-PI / 2 + (k / 5) * TAU) * 115 });
    const SHAPES = [
      ['Basaran', '#4080ff', (s) => aimed(R, s, 3, 0.25, 110, 46, { r: 7, color: '#4080ff' })],
      ['Argus', '#b040ff', (s) => dirs(R, s, 4, PI / 4, 180, 44, { r: 5, color: '#b040ff' }, 3, 0.12)],
      ['Gaius', '#ffd34d', (s) => dirs(R, s, 5, angTo(R, s), 200, 44, { r: 5, color: '#ffd34d' }, 2, 0.1)],
      ['Dirge', '#a0a0a0', (s) => dirs(R, s, 4, 0, 170, 44, { r: 5, color: '#c0c0c0' }, 3, 0.15)],
      ['Leucoryx', '#ff4040', (s) => ring(R, s, 10, 170, 44, s.t, { r: 5, color: '#ff4040' })],
    ];
    const e = B(R, { x: 180, y: 120, inv: true, extra: { turn: 0, mode: 'cult' }, ai(R, e, dt, every) {
      if (e.mode === 'cult') {
        e.vx = e.vy = 0;
        const cult = helpers(R, e, 'cultist');
        if (cult.every((c) => c.done)) { for (const c of cult) vanish(c); e.inv = false; setMode(e, 'malus'); say(R, 'The cultists sacrifice themselves to Malus!'); return; }
        if (cult[e.turn % 5]?.done || every('turn', 8)) { do e.turn = (e.turn + 1) % 5; while (cult[e.turn]?.done); }
        return;
      }
      const p = phase(R, e, [0.5, 0.1], { 2: 'Malus borrows his cultists’ power!', 3: 'Malus unleashes everything!' });
      if (p === 1) {
        e.vx = e.vy = 0;
        if (every('tp', 2)) { hold(e, rnd(R, 60, W - 60), rnd(R, 90, 260)); later(R, e, 0.3, () => ring(R, e, 14, 170, 46, e.t, { r: 5, color: '#ff3040' })); }
        if (every('follow', 9) && helpers(R, e, 'follower').length < 2) add(R, { owner: e, tag: 'follower', name: 'Follower of Malus', sprite: 'humanoid', size: 0.8, r: 12, hp: 0.8, x: e.x, y: e.y + 30,
          ai(R, m, dt, every) { goTo(m, R.hero.x, R.hero.y - 140, 35); if (every('fire', 2)) aimed(R, m, 5, 1.0, 170, 44, { color: '#ff8040' }); } });
      } else if (p === 2) {
        e.vx = e.vy = 0;
        if (every('tp', 1.6)) { e.k = ((e.k ?? -1) + 1) % 5; const c = corner(e.k); hold(e, c.x, c.y); later(R, e, 0.3, () => SHAPES[e.k][2](e)); }
      } else {
        goTo(e, C.x, 150, 200);
        if (every('all', 0.8)) { e.k = ((e.k ?? -1) + 1) % 5; SHAPES[e.k][2](e); ring(R, e, 12, 190, 44, e.t, { r: 5, color: '#ff3040' }); }
      }
    } });
    SHAPES.forEach(([name, color, fire], k) => {
      const home = corner(k);
      add(R, { owner: e, tag: 'cultist', name, sprite: 'humanoid', size: 0.8, r: 12, hp: 0.8, inv: true, x: home.x, y: home.y, pal: { a: color, b: '#1a1a1a', c: '#ffd34d' },
        onZero(R, c) { c.hp = 1; c.done = true; c.inv = true; return true; },
        ai(R, c, dt, every) {
          const active = !c.done && e.turn === k && e.mode === 'cult';
          if (!active) { c.inv = true; goTo(c, home.x, home.y, 200); return; }
          c.inv = false; c.vx = c.vy = 0;
          if (every('tp', 1.4)) { hold(c, rnd(R, 40, W - 40), rnd(R, 80, 290)); later(R, c, 0.35, () => fire(c)); }
          if (c.hp <= c.maxHp * 0.25) { c.done = true; c.inv = true; }
        } });
    });
  },

  // The Crystal Worm Mother: a long crystal worm circling the cavern. Every body segment fires to both sides as it
  // passes; the head fires aimed spreads. The head is immune while any segment stands; break them all for a short
  // window before they grow back. She speeds up as she weakens.
  crystal(R) {
    const N = 8, path = (a) => ({ x: 180 + Math.cos(a) * 140, y: 215 + Math.sin(a) * 115 });
    const grow = (e) => { for (let k = 0; k < N; k++) add(R, { owner: e, tag: 'seg', name: 'Worm Segment', sprite: 'cube', size: 0.55, r: 10, hp: 0.2, x: e.x, y: e.y, extra: { k },
      ai(R, m, dt, every) {
        const a = e.oa - (m.k + 1) * 0.28, pt = path(a); hold(m, pt.x, pt.y);
        if (every('side', e.p === 1 ? 1.4 : 1.0)) { const out = Math.atan2(pt.y - 215, pt.x - 180); for (const s of [0, PI]) bullet(R, m.x, m.y, out + s, 170, 42, { r: 5, color: '#c0a0ff' }); }
      } }); };
    const e = B(R, { x: 180, y: 100, extra: { oa: -PI / 2 }, ai(R, e, dt, every) {
      const p = phase(R, e, [0.66, 0.33]);
      e.oa += dt * [0.55, 0.75, 0.95][p - 1];
      const pt = path(e.oa); hold(e, pt.x, pt.y);
      const segs = helpers(R, e, 'seg');
      if (!segs.length && !e.exposedAt) { e.exposedAt = R.t; e.inv = false; say(R, 'The Worm Mother is exposed!'); }
      if (e.exposedAt && R.t - e.exposedAt > 12) { e.exposedAt = 0; e.inv = true; grow(e); }
      if (every('aim', 1.2)) aimed(R, e, 3, 0.3, 210, 46, { r: 6, color: '#ffffff' });
      if (p === 3 && every('ring', 2.5)) ring(R, e, 12, 150, 42, e.t, { r: 6, color: '#b090ff' });
    } });
    e.inv = true; grow(e);
  },

  // The Marble Colossus: armored at first (takes little damage) as it circles the hall firing rings of wavy black
  // boomerangs, with two pillars spinning spirals. Then it charges you, each charge ending in white boomerangs and
  // a cross of huge slashes. Then it stands in the middle sending rocks that roll at you and burst. Last, the
  // signature 8-way beam spiral that keeps reversing.
  lost_halls(R) {
    const e = B(R, { x: 180, y: 120, extra: { armor: 0.35 }, ai(R, e, dt, every) {
      const p = phase(R, e, [0.75, 0.5, 0.25], { 2: 'The Colossus sheds its armor and charges!', 3: 'Rocks break loose!', 4: 'The Colossus calls the void!' });
      e.armor = p === 1 ? 0.35 : 1;
      if (p === 1) {
        orbitPath(e, 180, 200, 130, 110, 0.5, dt);
        if (every('ring', 2)) ring(R, e, 14, 140, 46, e.t, { r: 6, color: '#202020', wave: 25, life: 3.4, boom: true });
      } else if (p === 2) {
        if (!e.goal && every('charge', 2.2)) { e.goal = { x: R.hero.x, y: R.hero.y - 120 }; tele(R, e, 0.4); }
        if (e.goal && goTo(e, e.goal.x, e.goal.y, 260)) {
          e.goal = null; e.cross = !e.cross;
          ring(R, e, 12, 150, 44, 0, { r: 6, color: WHITE, life: 3, boom: true });
          dirs(R, e, 4, e.cross ? PI / 4 : 0, 160, 58, { r: 9, color: '#e8e8f0' }, 3, 0.12);
        }
        if (!e.goal) { e.vx *= 0.9; e.vy *= 0.9; }
      } else if (p === 3) {
        goTo(e, 180, 170, 90);
        if (every('aim', 1.5)) aimed(R, e, 3, 0.3, 210, 46, { color: '#ff4040' });
        if (every('rocks', 7) && helpers(R, e, 'rock').length < 6) for (let k = 0; k < 3; k++) add(R, { owner: e, tag: 'rock', name: 'Marble Rock', sprite: 'golem', size: 0.5, r: 10, hp: 0.3, x: e.x + (k - 1) * 40, y: e.y + 30,
          ai(R, m) { goTo(m, R.hero.x, R.hero.y, 45); if (Math.hypot(R.hero.x - m.x, R.hero.y - m.y) < 110 || m.t > 7) { ring(R, m, 10, 220, 62, 0, { r: 6, life: 0.45, color: '#e8e8f0' }); vanish(m); } } });
      } else {
        goTo(e, 180, 170, 90);
        if (every('flip', 4)) e.dir = -e.dir;
        e.spin += dt * 0.5 * e.dir;
        if (every('beam', 0.09)) dirs(R, e, 8, e.spin, 220, 44, { r: 4, color: '#c040ff' });
      }
    } });
    for (const x of [36, 324]) add(R, { owner: e, tag: 'pillar', name: 'Marble Pillar', sprite: 'golem', size: 0.7, r: 13, hp: 1.2, x, y: 270, pal: { a: '#c8c8d0', b: '#ffffff', c: '#ff4040' },
      ai(R, m, dt, every) { hold(m, x, 270); m.spin += dt * 1.6; if (every('s', 0.22)) bullet(R, m.x, m.y, m.spin, 130, 38, { r: 5, color: ['#ff6040', '#40a0ff', '#ffd34d', '#a0a0a0'][Math.floor(m.t / 4) % 4] }); } });
  },

  // The Void Entity: circles the platform with dark shotguns and slow heavy orbs. Then it spawns Void Fragments
  // that grow into Void Shades, then Greater Shades, if you leave them alone. Finally it holds the middle,
  // immune for a moment, and spins a five-arm spiral.
  void(R) {
    B(R, { x: 180, y: 120, ai(R, e, dt, every) {
      const p = phase(R, e, [0.66, 0.33], { 2: 'Void Fragments seep in!', 3: 'The Void Entity takes the center!' });
      const shotgun = () => aimed(R, e, 5, 0.8, 210, 50, { r: 5, color: '#9a40ff' });
      const orbs = () => aimed(R, e, 2, 0.4, 90, 65, { r: 12, color: '#3a1a6a' });
      if (p < 3) {
        orbitPath(e, 180, 190, 130, 90, 0.45, dt);
        if (every('sg', 1.4)) shotgun();
        if (every('orb', 3)) orbs();
        if (p === 2 && every('frag', 5) && helpers(R, e).length < 4) add(R, { owner: e, name: 'Void Fragment', sprite: 'eye', size: 0.5, r: 9, hp: 0.25, x: e.x, y: e.y + 20,
          ai(R, m, dt, every) {
            goTo(m, R.hero.x, R.hero.y - 130, m.stage ? 35 : 75);
            if (m.t > 6.2 && m.t < 7) m.flash = 0.1;
            if (!m.stage && m.t > 7) { m.stage = 1; m.name = 'Void Shade'; m.size = 0.9; m.r = 13; m.sprite = 'ghost'; }
            if (m.stage === 1 && m.t > 14) { m.stage = 2; m.name = 'Greater Void Shade'; m.size = 1.3; m.r = 17; }
            if (m.stage && every('curse', 1.6)) aimed(R, m, m.stage === 2 ? 5 : 3, 0.5, 190, m.stage === 2 ? 56 : 46, { r: 5, color: '#ff40ff' });
            if (m.stage && every('spin', 3)) ring(R, m, m.stage === 2 ? 12 : 8, 140, 42, m.t, { r: 5, color: '#5a2a9a' });
          } });
      } else {
        if (once(e, 'center')) { e.inv = true; later(R, e, 3, () => { e.inv = false; }); }
        goTo(e, 180, 180, 100);
        e.spin += dt * 1.2;
        if (every('sp', 0.14)) dirs(R, e, 5, e.spin, 150, 40, { r: 4, color: '#ff40ff' });
        if (every('orb', 2.5)) orbs();
        if (every('sg', 1.8)) shotgun();
      }
    } });
  },

  // The Forgotten King: immune behind two Royal Guardians. Kill them and he raises four crystals (red fires rings,
  // blue slow shots, yellow shotguns, green heals the others; kill green first). Then he's open for a while, firing
  // wide purple barrages and fire and ice rings. If you don't push him past the next mark in time, the guardians
  // return. At the end he gives up the tricks and walks you down.
  shatters(R) {
    const guards = (e) => { for (const x of [90, 270]) add(R, { owner: e, tag: 'guard', name: 'Royal Guardian', sprite: 'golem', size: 1, r: 17, hp: 1.6, x, y: 200,
      ai(R, m, dt, every) { goTo(m, clamp(R.hero.x + (x - 180) * 0.5, 40, W - 40), 220, 25); if (every('sg', 1.8)) aimed(R, m, 5, 0.6, 190, 52, { r: 6, color: '#a0ffff' }); } }); };
    const CRYSTAL = {
      red: (R, m, every) => { if (every('f', 2)) ring(R, m, 8, 150, 44, m.t, { color: '#ff6020' }); },
      blue: (R, m, every) => { if (every('f', 1.4)) aimed(R, m, 2, 0.2, 120, 44, { r: 6, color: '#60c0ff' }); },
      green: (R, m, every) => { if (every('heal', 5)) for (const o of R.enemies.filter((c) => c.tag === 'crystal' && !c.gone)) o.hp = Math.min(o.maxHp, o.hp + o.maxHp * 0.1); },
      yellow: (R, m, every) => { if (every('f', 2)) aimed(R, m, 5, 0.7, 240, 50, { r: 5, color: '#ffe040' }); },
    };
    const crystals = (e) => [[60, 170, 'red'], [300, 170, 'blue'], [120, 280, 'green'], [240, 280, 'yellow']].forEach(([x, y, c]) => add(R, { owner: e, tag: 'crystal', name: `${c[0].toUpperCase()}${c.slice(1)} Crystal`, sprite: 'cube', size: 0.7, r: 12, hp: 0.7, x, y,
      pal: { a: { red: '#a02020', blue: '#2050a0', green: '#208040', yellow: '#a08020' }[c], b: '#ffffff', c: '#ffffff' },
      ai(R, m, dt, every) { hold(m, x, y); CRYSTAL[c](R, m, every); } }));
    B(R, { x: 180, y: 90, inv: true, extra: { mode: 'guards' }, ai(R, e, dt, every) {
      const f = e.hp / e.maxHp;
      if (f <= 0.25) {
        if (once(e, 'final')) { e.inv = false; for (const m of helpers(R, e)) vanish(m); say(R, 'The Forgotten King walks among you!'); }
        goTo(e, R.hero.x, R.hero.y - 120, 40);
        if (every('sg', 0.8)) aimed(R, e, 7, 0.9, 250, 48, { r: 5, color: '#c060ff' });
        if (every('ring', 2)) ring(R, e, 16, 160, 44, e.t, { color: (e.k = !e.k) ? '#ff6020' : '#60c0ff' });
        return;
      }
      if (e.mode === 'guards') {
        e.inv = true; goTo(e, 180, 90, 60);
        if (once(e, 'spawn')) guards(e);
        if (!helpers(R, e, 'guard').length) { setMode(e, 'crystals'); say(R, 'The King raises his crystals!'); }
      } else if (e.mode === 'crystals') {
        if (once(e, 'spawn')) crystals(e);
        if (!helpers(R, e, 'crystal').length) { e.inv = false; e.mark = f > 0.66 ? 0.66 : f > 0.4 ? 0.4 : 0.25; setMode(e, 'open'); say(R, 'The Forgotten King is vulnerable!'); }
      } else {
        e.vx = Math.sin(e.t * 0.6) * 40; e.vy = 0;
        if (every('barrage', 1.5)) aimed(R, e, 13, 2.1, 180, 46, { r: 5, color: '#9040ff' });
        if (every('ring', 2.2)) ring(R, e, 16, 150, 44, e.t, { color: (e.k = !e.k) ? '#ff6020' : '#60c0ff' });
        if (f <= e.mark || e.modeT > 18) { if (f > e.mark) say(R, 'The Royal Guardians return!'); setMode(e, 'guards'); }
      }
    } });
  },

  // Oryx the Mad God: wanders the middle firing shotguns of colored stars and rings of fire bolts while his
  // henchmen pour in and scarabs crawl out. At 30% the henchmen die, he goes immune and fires one huge star ring,
  // then chases you with everything plus spinning blades.
  oryx(R) {
    const STARS = ['#4080ff', '#40ff60', '#b040ff', '#ff4040', '#a0a0a0'];
    B(R, { x: 180, y: 130, ai(R, e, dt, every) {
      const p = phase(R, e, [0.3], { 2: 'Oryx: "I will feast on your bones!"' });
      const stars = (n) => { const a = angTo(R, e); for (let i = 0; i < n; i++) bullet(R, e.x, e.y, a + (i / (n - 1) - 0.5) * 1.05, 190, 46, { r: 5, color: STARS[i % 5] }); };
      if (p === 1) {
        if (every('wander', 2.5)) e.goal = { x: rnd(R, 100, 260), y: rnd(R, 100, 200) };
        if (e.goal) goTo(e, e.goal.x, e.goal.y, 40);
        if (every('stars', 1)) stars(7);
        if (every('bolts', 2.5)) ring(R, e, 12, 250, 44, e.t, { r: 5, color: '#ff8020' });
        if (every('hench', 6) && helpers(R, e, 'hench').length < 4) summon(R, e, 1, { tag: 'hench' });
        if (every('scarab', 8)) for (let k = 0; k < 2; k++) walker(R, e, 'Monstrosity Scarab', 'bug', e.x, e.y + 20, angTo(R, e) + (k ? 0.5 : -0.5), { speed: 70, life: 8, color: '#ffd34d' });
        return;
      }
      if (once(e, 'turn')) {
        for (const m of helpers(R, e)) vanish(m);
        e.inv = true; tele(R, e, 2.5);
        later(R, e, 2.5, () => { e.inv = false; ring(R, e, 40, 130, 50, 0, { r: 6, color: '#a0a0a0' }); });
      }
      if (e.inv) { e.vx = e.vy = 0; return; }
      goTo(e, R.hero.x, R.hero.y - 150, 60);
      if (every('stars', 0.8)) stars(7);
      if (every('bolts', 2)) ring(R, e, 12, 250, 44, e.t, { r: 5, color: '#ff8020' });
      if (every('weak', 3)) ring(R, e, 24, 140, 46, e.t, { r: 5, color: '#a0a0a0' });
      e.spin += dt * 2;
      if (every('blades', 0.2)) dirs(R, e, 2, e.spin, 160, 40, { r: 5, color: '#e0e0f0' });
    } });
  },
};
