// PROTOTYPE: the Snake Pit as an active bullet-hell run. You steer, your weapon fires on its own.
// Pure simulation in a fixed 360×640 world; arena/view.js draws it. Steps at 60 Hz.
import { makeRng } from '../core/rng.js';

export const W = 360, H = 640;
const FOLLOW_SPEED = 2600; // px/s: effectively instant, without teleporting through bullets
const TAU = Math.PI * 2;

// ---------- weapons: real Realm patterns, plus one UT per class that changes the pattern ----------
export const WEAPONS = {
  staff:  { name: 'Comet Staff', shots: 2, speed: 430, range: 340, radius: 5, color: '#8fb8ff', wave: 11, desc: 'Two wavy shots that weave around each other.' },
  bow:    { name: 'Double Bow', shots: 3, speed: 420, range: 320, radius: 4, color: '#f0d9a0', spread: 0.2, arrow: true, desc: 'Three arrows in a spread.' },
  sword:  { name: 'Long Sword', shots: 1, speed: 340, range: 120, radius: 11, color: '#ffffff', blade: true, desc: 'Short range, wide blade. Get close.' },
};
export const UTS = {
  staff: { name: 'Boomerang Staff', color: '#ff9de6', boomerang: true, desc: 'Shots fly out, then come back through everything on the way home.' },
  bow:   { name: 'Thornheart Bow', color: '#9dff7a', split: 3, desc: 'Arrows burst into 3 thorns when they hit.' },
  sword: { name: 'Demonfire Blade', color: '#ff7a3c', fireEvery: 4, desc: 'Every 4th swing hurls a long-range fireball that explodes.' },
};
export const ABILITIES = {
  wizard:  { name: 'Spell Bomb', cost: 55, desc: 'A burst of 16 bolts erupts on the nearest enemy.' },
  archer:  { name: 'Piercing Shot', cost: 45, desc: 'One huge arrow that pierces everything and paralyzes for 2s.' },
  warrior: { name: 'Berserk', cost: 50, desc: '5 seconds of +60% attack speed and +25% move speed.' },
};

// ---------- enemies ----------
const ENEMIES = {
  snake:   { name: 'Pit Snake', sprite: 'snake', pal: { a: '#5c8f2a', b: '#c6d96a', c: '#ffde3d' }, hp: 650, r: 16, speed: 30, def: 0 },
  viper:   { name: 'Pit Viper', sprite: 'snake', pal: { a: '#3a6a8a', b: '#8ac0d9', c: '#ff5050' }, hp: 480, r: 15, speed: 75, def: 0 },
  charmer: { name: 'Snake Charmer', sprite: 'humanoid', pal: { a: '#7a3a8a', b: '#c07ad0', c: '#ffde3d' }, hp: 1200, r: 17, speed: 18, def: 4 },
  boss:    { name: 'Stheno, the Snake Queen', sprite: 'snake', pal: { a: '#2f6a1a', b: '#9ad04a', c: '#ffde3d' }, hp: 16000, r: 34, speed: 45, def: 6, boss: true },
};
const ROOMS = [
  [['snake', 90, 140], ['snake', 270, 120], ['snake', 180, 200], ['snake', 60, 260], ['charmer', 180, 90]],
  [['viper', 70, 120], ['viper', 290, 120], ['viper', 120, 220], ['viper', 240, 220], ['charmer', 90, 70], ['charmer', 270, 70], ['snake', 180, 160]],
  [['boss', 180, 120]],
];

export function createRun(F, cls, ut, seed = (Math.random() * 2 ** 32) >>> 0) {
  const R = {
    rng: makeRng(seed), t: 0, room: 0, phase: 'fight', cls, ut,
    hero: { x: W / 2, y: H - 90, hp: F.maxHp, mp: F.maxMp, fireT: 0, swings: 0, berserkUntil: 0, hurtT: 0 },
    shots: [], bullets: [], enemies: [], bags: [], fx: [], nums: [], loot: [], uid: 1, roomT: 0,
    stats: { dmg: 0, hits: 0, kills: 0 },
  };
  spawnRoom(R);
  return R;
}
function spawnRoom(R) {
  R.enemies = ROOMS[R.room].map(([k, x, y]) => {
    const E = ENEMIES[k];
    return { ...E, kind: k, id: R.uid++, x, y, hp: E.hp, maxHp: E.hp, t: R.rng.next() * 2, stunUntil: 0, flash: 0, vx: 0, vy: 0, summonT: 6 };
  });
  R.bullets = []; R.shots = [];
  R.hero.x = W / 2; R.hero.y = H - 90;
  R.phase = 'fight'; R.roomT = 0;
}

const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const nearest = (R, p) => { let best = null, bd = Infinity; for (const e of R.enemies) { const d = dist(e, p); if (d < bd) { bd = d; best = e; } } return best; };

function bullet(R, x, y, ang, speed, dmg, o = {}) {
  R.bullets.push({ x, y, vx: Math.cos(ang) * speed, vy: Math.sin(ang) * speed, r: o.r || 5, dmg, life: o.life || 4, color: o.color || '#ff4a6a', big: o.big, curve: o.curve || 0 });
}
function ring(R, e, n, speed, dmg, off = 0, o) { for (let i = 0; i < n; i++) bullet(R, e.x, e.y, off + (i / n) * TAU, speed, dmg, o); }
function aimed(R, e, n, spread, speed, dmg, o) {
  const a = Math.atan2(R.hero.y - e.y, R.hero.x - e.x);
  for (let i = 0; i < n; i++) bullet(R, e.x, e.y, a + (n > 1 ? (i / (n - 1) - 0.5) * spread : 0), speed, dmg, o);
}

// ---------- player firing ----------
function fire(R, F, wt) {
  const h = R.hero, Wp = WEAPONS[wt], ut = R.ut ? UTS[wt] : null;
  const tgt = nearest(R, h);
  if (!tgt) return;
  const ang = Math.atan2(tgt.y - h.y, tgt.x - h.x);
  const dmg = () => R.rng.range(F.dmgMin, F.dmgMax) * F.attMult;
  const color = ut?.color || Wp.color;
  h.swings++;
  const base = { x: h.x, y: h.y - 10, speed: Wp.speed, range: Wp.range, r: Wp.radius, color, hit: new Set(), dist: 0, kind: wt };
  if (wt === 'staff') {
    for (let i = 0; i < 2; i++) R.shots.push({ ...base, ang, dmg: dmg(), wave: Wp.wave * (i ? -1 : 1), boomerang: !!ut?.boomerang, range: ut?.boomerang ? 250 : Wp.range, pierce: !!ut?.boomerang });
  } else if (wt === 'bow') {
    for (let i = -1; i <= 1; i++) R.shots.push({ ...base, ang: ang + i * Wp.spread, dmg: dmg(), arrow: true, split: ut?.split || 0 });
  } else {
    R.shots.push({ ...base, ang, dmg: dmg(), blade: true });
    if (ut?.fireEvery && h.swings % ut.fireEvery === 0) R.shots.push({ ...base, ang, speed: 260, range: 330, r: 8, dmg: dmg() * 2.2, color: '#ff7a3c', fireball: true });
  }
}
function castAbility(R, F, A) {
  const h = R.hero, ab = ABILITIES[R.cls];
  if (h.mp < ab.cost || R.phase !== 'fight') return false;
  h.mp -= ab.cost;
  const power = F.abilityPower;
  if (R.cls === 'wizard') {
    const e = nearest(R, h) || { x: W / 2, y: 200 };
    for (let i = 0; i < 16; i++) R.shots.push({ x: e.x, y: e.y, ang: (i / 16) * TAU, speed: 260, range: 70, r: 6, dmg: power * 0.55 * F.attMult, color: '#ff8a3c', hit: new Set(), dist: 0, kind: 'spell' });
    R.fx.push({ k: 'burst', x: e.x, y: e.y, t: 0, life: 0.4, c: '#ff8a3c' });
  } else if (R.cls === 'archer') {
    const e = nearest(R, h); const ang = e ? Math.atan2(e.y - h.y, e.x - h.x) : -Math.PI / 2;
    R.shots.push({ x: h.x, y: h.y - 10, ang, speed: 520, range: 600, r: 10, dmg: power * 3 * F.attMult, color: '#ffe08a', hit: new Set(), dist: 0, kind: 'quiver', pierce: true, arrow: true, stun: 2 });
  } else {
    h.berserkUntil = R.t + 5;
    R.fx.push({ k: 'burst', x: h.x, y: h.y, t: 0, life: 0.5, c: '#ff5a4a' });
  }
  void A;
  return true;
}

function hurtEnemy(R, e, d, s) {
  const dealt = Math.max(d - e.def, d * 0.15);
  e.hp -= dealt; e.flash = 0.08; R.stats.dmg += dealt; R.stats.hits++;
  R.nums.push({ x: e.x + (R.rng.next() - 0.5) * 16, y: e.y - e.r - 4, text: `${Math.round(dealt)}`, t: 0, c: s?.kind === 'spell' || s?.fireball ? '#ffb070' : '#ffffff' });
  if (s?.stun) e.stunUntil = R.t + s.stun;
}

// ---------- enemy behavior ----------
function enemyAI(R, e, dt) {
  const h = R.hero;
  e.t += dt;
  if (e.stunUntil > R.t) return;
  const toHero = Math.atan2(h.y - e.y, h.x - e.x);
  if (e.kind === 'snake') {
    // wander; aimed shot
    e.vx = Math.cos(e.t * 0.7 + e.id) * e.speed; e.vy = Math.sin(e.t * 0.5 + e.id * 2) * e.speed * 0.6;
    if ((e.cd = (e.cd ?? 1.2) - dt) <= 0) { e.cd = 1.5; aimed(R, e, 1, 0, 170, 38); }
  } else if (e.kind === 'viper') {
    // chases to medium range, then circles; 3-shot spread
    const d = dist(e, h);
    const ang = d > 130 ? toHero : toHero + Math.PI / 2;
    e.vx = Math.cos(ang) * e.speed; e.vy = Math.sin(ang) * e.speed;
    if ((e.cd = (e.cd ?? 1.6) - dt) <= 0) { e.cd = 2.0; aimed(R, e, 3, 0.5, 200, 32); }
  } else if (e.kind === 'charmer') {
    e.vx = Math.cos(e.t * 0.4 + e.id) * e.speed; e.vy = 0;
    if ((e.cd = (e.cd ?? 2) - dt) <= 0) { e.cd = 2.6; ring(R, e, 10, 120, 42, e.t, { color: '#c86aff' }); }
  } else if (e.boss) bossAI(R, e, dt, toHero);
  e.x = Math.max(e.r, Math.min(W - e.r, e.x + e.vx * dt));
  e.y = Math.max(e.r + 40, Math.min(H * 0.55, e.y + e.vy * dt));
}
function bossAI(R, e, dt, toHero) {
  const frac = e.hp / e.maxHp;
  const p = frac > 0.66 ? 1 : frac > 0.33 ? 2 : 3;
  if (p !== e.p) { e.p = p; e.cd = 1.2; e.cd2 = 2; R.fx.push({ k: 'banner', text: p === 2 ? 'Stheno is enraged!' : p === 3 ? 'Stheno is desperate!' : '', t: 0, life: 1.6 }); e.flash = 0.4; }
  e.vx = Math.sin(e.t * 0.6) * e.speed * (p === 3 ? 1.6 : 1); e.vy = Math.sin(e.t * 0.9) * 12;
  if (p === 1) {
    if ((e.cd -= dt) <= 0) { e.cd = 1.3; aimed(R, e, 5, 0.7, 190, 45); }
    if ((e.summonT -= dt) <= 0) {
      e.summonT = 10;
      for (const sx of [e.x - 60, e.x + 60]) { const E = ENEMIES.snake; R.enemies.push({ ...E, kind: 'snake', id: R.uid++, x: sx, y: e.y + 30, hp: E.hp * 0.6, maxHp: E.hp * 0.6, t: 0, stunUntil: 0, flash: 0, vx: 0, vy: 0, summonT: 0 }); }
    }
  } else {
    // spiral arms, plus big telegraphed rings
    e.spin = (e.spin || 0) + dt * (p === 3 ? 2.6 : 1.8);
    if ((e.cd -= dt) <= 0) {
      e.cd = p === 3 ? 0.12 : 0.16;
      for (let k = 0; k < (p === 3 ? 3 : 2); k++) bullet(R, e.x, e.y, e.spin + (k / (p === 3 ? 3 : 2)) * TAU, 150, 40, { color: '#ffde3d', r: 4 });
    }
    if (!e.tele && (e.cd2 -= dt) <= 0) { e.tele = 0.8; R.fx.push({ k: 'tele', x: e.x, y: e.y, t: 0, life: 0.8 }); }
    if (e.tele != null && (e.tele -= dt) <= 0) {
      e.tele = null; e.cd2 = p === 3 ? 2.4 : 3.2;
      ring(R, e, 18, 140, 55, e.t, { color: '#ff3a5a', r: 7, big: true });
      if (p === 3) aimed(R, e, 3, 0.25, 260, 50);
    }
  }
  void toHero;
}

// ---------- step ----------
/** input: { target: {x, y} | null } where the hero should be (world px), cast: bool */
export function step(R, F, input, dt) {
  if (R.phase !== 'fight' && R.phase !== 'cleared') return;
  R.t += dt; R.roomT += dt;
  const h = R.hero, wt = F.weapon;
  // movement: the hero sits just above your thumb and snaps to it quickly
  const berserk = h.berserkUntil > R.t;
  if (input.target) {
    const tx = Math.max(10, Math.min(W - 10, input.target.x)), ty = Math.max(H * 0.2, Math.min(H - 20, input.target.y));
    const dx = tx - h.x, dy = ty - h.y, d = Math.hypot(dx, dy), max = FOLLOW_SPEED * dt;
    if (d <= max) { h.x = tx; h.y = ty; } else { h.x += (dx / d) * max; h.y += (dy / d) * max; }
  }
  // regen
  h.hp = Math.min(F.maxHp, h.hp + F.hpRegen * dt);
  h.mp = Math.min(F.maxMp, h.mp + F.mpRegen * dt);
  if (input.cast) { castAbility(R, F, input); input.cast = false; }

  if (R.phase === 'fight') {
    // auto-fire at the nearest enemy (Realm rate: DEX)
    h.fireT += dt * F.aps * (berserk && R.cls === 'warrior' ? 1.6 : 1);
    while (h.fireT >= 1 && R.enemies.length) { h.fireT -= 1; fire(R, F, wt); }
    if (!R.enemies.length) h.fireT = Math.min(h.fireT, 1);
  }

  // player shots
  for (const s of R.shots) {
    const step = s.speed * dt;
    s.dist += step;
    let ang = s.ang;
    if (s.boomerang && s.dist > s.range) { if (!s.back) { s.back = true; s.hit.clear(); } ang = Math.atan2(h.y - s.y, h.x - s.x); s.ang = ang; }
    s.x += Math.cos(ang) * step; s.y += Math.sin(ang) * step;
    if (s.wave) { const ph = s.dist / 38; s.ox = Math.sin(ph) * s.wave; }
    const px = s.x + (s.ox || 0) * -Math.sin(ang), py = s.y + (s.ox || 0) * Math.cos(ang);
    s.px = px; s.py = py;
    for (const e of R.enemies) {
      if (s.hit.has(e.id) || Math.hypot(e.x - px, e.y - py) > e.r + s.r) continue;
      s.hit.add(e.id);
      hurtEnemy(R, e, s.dmg, s);
      if (s.fireball) { s.dead = true; R.fx.push({ k: 'burst', x: px, y: py, t: 0, life: 0.35, c: '#ff7a3c' }); for (const o of R.enemies) if (o !== e && Math.hypot(o.x - px, o.y - py) < 60) hurtEnemy(R, o, s.dmg * 0.6, s); }
      if (s.split) { for (let k = -1; k <= 1; k++) R.shots.push({ x: px, y: py, ang: s.ang + Math.PI + k * 0.9 + Math.PI, speed: 320, range: 90, r: 3, dmg: s.dmg * 0.45, color: '#9dff7a', hit: new Set([e.id]), dist: 0, kind: 'thorn', arrow: true }); }
      if (!s.pierce) { s.dead = true; break; }
    }
    if ((s.boomerang && s.back && Math.hypot(h.x - s.x, h.y - s.y) < 14) || (!s.boomerang && s.dist > s.range) || s.dist > s.range * 3) s.dead = true;
  }
  R.shots = R.shots.filter((s) => !s.dead);

  // enemies
  for (const e of R.enemies) { enemyAI(R, e, dt); if (e.flash > 0) e.flash -= dt; }
  for (const e of R.enemies) if (e.hp <= 0 && !e.gone) {
    e.gone = true; R.stats.kills++;
    R.fx.push({ k: 'puff', x: e.x, y: e.y, t: 0, life: 0.5, c: e.pal.b });
    if (e.boss) dropBoss(R, e);
    else if (R.rng.next() < 0.18) R.bags.push({ x: e.x, y: e.y, kind: 'brown', item: R.rng.pick(['Potion of Speed', 'Potion of Dexterity', 'Potion of Life']), t: 0 });
  }
  R.enemies = R.enemies.filter((e) => !e.gone);

  // enemy bullets vs hero (small hitbox, Realm style)
  for (const b of R.bullets) {
    b.life -= dt;
    if (b.curve) { const a = Math.atan2(b.vy, b.vx) + b.curve * dt, sp = Math.hypot(b.vx, b.vy); b.vx = Math.cos(a) * sp; b.vy = Math.sin(a) * sp; }
    b.x += b.vx * dt; b.y += b.vy * dt;
    if (b.x < -20 || b.x > W + 20 || b.y < -20 || b.y > H + 20) b.life = 0;
    if (b.life > 0 && Math.hypot(b.x - h.x, b.y - h.y) < b.r + 5) {
      b.life = 0;
      const d = Math.max(b.dmg - F.def, b.dmg * 0.15);
      h.hp -= d; h.hurtT = 0.15;
      R.nums.push({ x: h.x + 14, y: h.y - 22, text: `-${Math.round(d)}`, t: 0, c: '#ff6b5e' });
      if (h.hp <= 0) { h.hp = 0; R.phase = 'dead'; R.fx.push({ k: 'puff', x: h.x, y: h.y, t: 0, life: 0.8, c: '#ff4030' }); }
    }
  }
  R.bullets = R.bullets.filter((b) => b.life > 0);
  if (h.hurtT > 0) h.hurtT -= dt;

  // bags: walk over them to pick up
  for (const b of R.bags) {
    b.t += dt;
    // loot goes straight to your inventory: the bag pops, then flies to you
    if (b.t > 0.5 && !b.taken) { b.taken = true; R.loot.push(b); R.fx.push({ k: 'pickup', x: b.x, y: b.y, text: b.item, kind: b.kind, t: 0, life: 1.6 }); R.fx.push({ k: 'fly', x: b.x, y: b.y, kind: b.kind, t: 0, life: 0.35 }); }
  }
  R.bags = R.bags.filter((b) => !b.taken);

  // room flow
  if (R.phase === 'fight' && !R.enemies.length) {
    R.bullets = [];
    if (R.room === ROOMS.length - 1) { R.phase = 'cleared'; R.clearT = 0; }
    else { R.phase = 'cleared'; R.clearT = 0; R.fx.push({ k: 'banner', text: 'Room cleared!', t: 0, life: 1.4 }); }
  }
  if (R.phase === 'cleared') {
    R.clearT += dt;
    if (R.room < ROOMS.length - 1 && R.clearT > 2.2 && !R.bags.length) { R.room++; spawnRoom(R); }
    else if (R.room < ROOMS.length - 1 && R.clearT > 6) { R.room++; spawnRoom(R); }
    else if (R.room === ROOMS.length - 1 && (R.clearT > 6 || (R.clearT > 1.5 && !R.bags.length))) R.phase = 'won';
  }
  for (const n of R.nums) n.t += dt;
  R.nums = R.nums.filter((n) => n.t < 0.7);
  for (const f of R.fx) f.t += dt;
  R.fx = R.fx.filter((f) => f.t < f.life);
}

function dropBoss(R, e) {
  const it = { staff: 'Serpentine Staff (T3)', bow: 'Double Bow (T3)', sword: 'Long Sword (T3)' }[R.weaponType || 'staff'];
  R.bags.push({ x: e.x - 24, y: e.y + 10, kind: 'pink', item: it, t: 0 });
  R.bags.push({ x: e.x + 24, y: e.y + 10, kind: 'brown', item: 'Potion of Speed', t: 0 });
  if (R.rng.next() < 0.35) R.bags.push({ x: e.x, y: e.y + 34, kind: 'white', item: R.rng.pick(['Fang of the Pit Queen', 'Coiled Scale Armor', 'Viper’s Eye Ring']), t: 0 });
  R.fx.push({ k: 'banner', text: 'Stheno defeated!', t: 0, life: 2 });
}

export const roomCount = ROOMS.length;
