// PROTOTYPE: formation battles. Enemies stand in two rows (front, back) across three lanes, and each weapon
// has a pattern that decides which of them it hits. Same fixed-tick idea as the real engine, so it can run
// unwatched (offline) and give identical results.
import { CONFIG } from '../config.js';
import { ENEMY_CURVE } from '../data/world.js';

export const LANES = 3;
const DT = CONFIG.tickSeconds;
// Prototype attacks are slower and harder than the real game so each projectile is readable.
export const RATE_DIV = 2.5;

// Weapon patterns. `m` = damage per hit as a share of the base weapon hit (B).
export const WEAPONS = {
  bolt:      { name: 'Bolt Wand',   color: '#d29bff', desc: 'One heavy bolt at a single enemy. Best against tough targets.' },
  spread:    { name: 'Spread Bow',  color: '#f0d9a0', desc: '3 arrows, one down each lane. Shreds wide packs, weak against armor.' },
  wave:      { name: 'Wave Staff',  color: '#7fd8ff', desc: 'Two bolts that weave across two neighboring lanes of the front row.' },
  lance:     { name: 'Lance',       color: '#ffffff', desc: 'A beam through the front AND back of one lane. Ignores armor.' },
  arc:       { name: 'Arc Wand',    color: '#8ae8ff', desc: 'Hits one enemy, then jumps to 3 more (any row), weaker each jump.' },
  boomerang: { name: 'Boomerang',   color: '#ffd34d', desc: 'Flies through a lane front to back, then hits both again on the way home.' },
};
export const ABILITIES = {
  meteor: { name: 'Meteor',     cost: 60, color: '#ff8a3c', desc: 'Rocks fall on the whole front row.' },
  trap:   { name: 'Snare Trap', cost: 55, color: '#d8b070', desc: 'Set in the busiest lane: burns and slows whatever stands in it for 5s.' },
  shock:  { name: 'Shockwave',  cost: 65, color: '#9ec2ff', desc: 'Knocks the front row back a row and stuns everyone for 2s.' },
};
export const RULES = {
  ready: 'Whenever ready',
  pack: 'When 3+ enemies are up',
  brute: 'Save for brutes',
};

// Enemy roles for the Forest. hp/dmg are multiples of the L1 curve.
const ROLES = {
  rat:    { name: 'Thicket Rat',   sprite: 'beast',    pal: { a: '#7a6a58', b: '#a89880', c: '#e04040' }, hp: 0.3, dmg: 0.8, rate: 0.6, def: 0, melee: true, rusher: true },
  archer: { name: 'Bandit Archer', sprite: 'humanoid', pal: { a: '#6a4a2a', b: '#a07a50', c: '#c9c9c9' }, hp: 0.6, dmg: 1.0, rate: 0.45, def: 2, ranged: true },
  boar:   { name: 'Armored Boar',  sprite: 'beast',    pal: { a: '#5a3a24', b: '#8a6040', c: '#f0e0c0' }, hp: 2.3, dmg: 2.0, rate: 0.25, def: 30, melee: true, brute: true },
  witch:  { name: 'Hedge Witch',   sprite: 'humanoid', pal: { a: '#3f6a3a', b: '#8fc07a', c: '#e0a0ff' }, hp: 0.55, dmg: 0.6, rate: 0.3, def: 1, ranged: true, healer: true },
  slime:  { name: 'Green Slime',   sprite: 'blob',     pal: { a: '#3f9a3a', b: '#8fe07a', c: '#1a3a1a' }, hp: 0.8, dmg: 0.8, rate: 0.5, def: 4, melee: true },
};
// Wave shapes. f = front row, b = back row (by lane). extra = rushers that arrive in the back row mid-fight.
export const WAVES = [
  { short: 'Swarm', name: 'Rat swarm', w: 3, f: ['rat', 'rat', 'rat'], b: ['rat', 'rat', 'rat'], extra: 9 },
  { short: 'Boar', name: 'Boar and rats', w: 2, f: [null, 'boar', null], b: ['rat', null, 'rat'], extra: 1 },
  { short: 'Archers', name: 'Archer line', w: 2, f: ['slime', null, 'rat'], b: ['archer', 'witch', 'archer'], extra: 0 },
  { short: 'Mixed', name: 'Mixed camp', w: 3, f: ['rat', 'slime', 'rat'], b: [null, 'archer', 'witch'], extra: 1 },
  { short: '2 Boars', name: 'Twin boars', w: 1, f: ['boar', null, 'boar'], b: [null, 'witch', null], extra: 0 },
];
const L = 1;
const ENEMY_DMG = 1.0; // tuned so a T1 wizard's HP moves in every fight but rarely falls

export function newArena(F) {
  return { t: 0, hp: F.maxHp, mp: F.maxMp, enemies: [], uid: 1, pT: 0, travel: 1, wave: 0, waveName: '', extra: 0, extraT: 0,
    focus: null, cast: false, traps: [], dead: false, respawn: 0, castCount: 0,
    stats: { kills: 0, waves: 0, deaths: 0, dmg: 0, time: 0 } };
}

function spawn(A, role, row, lane) {
  const R = ROLES[role];
  const hp = ENEMY_CURVE.hp(L) * R.hp;
  const e = { uid: A.uid++, role, ...R, hp, maxHp: hp, dmg: ENEMY_CURVE.dmg(L) * R.dmg * ENEMY_DMG, row, lane, nextAt: A.t + 0.6 + (lane * 0.37) % 1, stunUntil: 0, slowUntil: 0, moveAt: 0 };
  A.enemies.push(e);
  return e;
}
function startWave(A, rng) {
  const W = A.only ? WAVES.find((w) => w.name === A.only) : rng.weighted(WAVES, (w) => w.w);
  A.wave++; A.waveName = W.name; A.inWave = true; A.extra = W.extra; A.extraT = A.t + 3;
  W.f.forEach((r, i) => r && spawn(A, r, 'f', i));
  W.b.forEach((r, i) => r && spawn(A, r, 'b', i));
}

const at = (A, row, lane) => A.enemies.find((e) => e.row === row && e.lane === lane && e.hp > 0);
const first = (A, lane) => at(A, 'f', lane) || at(A, 'b', lane);
const alive = (A) => A.enemies.filter((e) => e.hp > 0);
const laneCount = (A, lane) => (at(A, 'f', lane) ? 1 : 0) + (at(A, 'b', lane) ? 1 : 0);

/** Lane to aim lane-based patterns at: the focused enemy's lane, else the fullest lane. */
function pickLane(A) {
  const f = A.enemies.find((e) => e.uid === A.focus && e.hp > 0);
  if (f) return f.lane;
  let best = 0, score = -1;
  for (let l = 0; l < LANES; l++) { const s = laneCount(A, l) * 10 + ([at(A, 'f', l), at(A, 'b', l)].some((e) => e?.healer) ? 15 : 0) + (at(A, 'f', l) ? 1 : 0); if (s > score) { score = s; best = l; } }
  return best;
}
function pickSingle(A) {
  const f = A.enemies.find((e) => e.uid === A.focus && e.hp > 0);
  if (f) return f;
  const healer = alive(A).find((e) => e.healer);
  if (healer) return healer;
  const front = alive(A).filter((e) => e.row === 'f');
  const pool = front.length ? front : alive(A);
  return pool.sort((a, b) => a.hp - b.hp)[0];
}

function dealHit(A, F, e, base, m, rng, emit, opts = {}) {
  if (!e || e.hp <= 0) return 0;
  const crit = rng.next() < 0.08;
  const raw = base * m * F.attMult * (crit ? 1.6 : 1) * rng.range(0.9, 1.1);
  const def = opts.armorPierce ? 0 : e.def;
  const d = Math.max(raw - def, raw * CONFIG.minDamageAfterDef);
  e.hp -= d; A.stats.dmg += d;
  emit?.('hit', { uid: e.uid, dmg: Math.round(d), crit, delay: opts.delay || 0, color: opts.color });
  return d;
}

/** One attack with the equipped pattern. */
function fire(A, F, kind, base, rng, emit, frac) {
  const W = WEAPONS[kind];
  const shot = (path, delay = 0, style = kind) => emit?.('shot', { path: path.map((e) => e.uid), delay: delay + frac * DT, style, color: W.color });
  const hit = (e, m, delay, o = {}) => dealHit(A, F, e, base, m, rng, emit, { delay: delay + frac * DT + 0.18, color: W.color, ...o });
  if (kind === 'bolt') {
    const e = pickSingle(A); if (!e) return;
    shot([e]); hit(e, 1.15, 0);
  } else if (kind === 'spread') {
    for (let l = 0; l < LANES; l++) { const e = first(A, l); if (e) { shot([e]); hit(e, 0.6, 0); } else emit?.('shot', { lane: l, delay: frac * DT, style: kind, color: W.color }); }
  } else if (kind === 'wave') {
    const front = [0, 1, 2].map((l) => at(A, 'f', l));
    const pairs = [[0, 1], [1, 2]].map((p) => p.map((l) => front[l] || at(A, 'b', l)).filter(Boolean));
    const pair = pairs[0].length >= pairs[1].length ? pairs[0] : pairs[1];
    if (!pair.length) return;
    for (let i = 0; i < 2; i++) { shot(pair, i * 0.06); pair.forEach((e, j) => hit(e, 0.42, i * 0.06 + j * 0.08)); }
  } else if (kind === 'lance') {
    const l = pickLane(A), path = [at(A, 'f', l), at(A, 'b', l)].filter(Boolean);
    if (!path.length) return;
    shot(path); path.forEach((e, j) => hit(e, 0.95, j * 0.05, { armorPierce: true }));
  } else if (kind === 'arc') {
    const e0 = pickSingle(A); if (!e0) return;
    const chain = [e0, ...alive(A).filter((e) => e !== e0).sort((a, b) => Math.abs(a.lane - e0.lane) - Math.abs(b.lane - e0.lane) || (a.row === e0.row ? -1 : 1)).slice(0, 3)];
    shot(chain); chain.forEach((e, j) => hit(e, 0.7 * Math.pow(0.6, j), j * 0.09));
  } else if (kind === 'boomerang') {
    const l = pickLane(A), out = [at(A, 'f', l), at(A, 'b', l)].filter(Boolean);
    if (!out.length) return;
    shot([...out, ...out.slice().reverse()]);
    out.forEach((e, j) => hit(e, 0.42, j * 0.12));
    out.slice().reverse().forEach((e, j) => hit(e, 0.42, 0.3 + j * 0.12));
  }
}

function castAbility(A, F, kind, base, rng, emit) {
  const Ab = ABILITIES[kind];
  A.mp -= Ab.cost; A.castCount++;
  if (kind === 'meteor') {
    const front = alive(A).filter((e) => e.row === 'f');
    emit?.('ability', { kind, uids: front.map((e) => e.uid) });
    front.forEach((e, i) => dealHit(A, F, e, base, 2.6, rng, emit, { delay: 0.35 + i * 0.08, color: Ab.color }));
  } else if (kind === 'trap') {
    const l = pickLane(A);
    A.traps.push({ lane: l, until: A.t + 5, dps: base * F.attMult * 1.1 });
    emit?.('ability', { kind, lane: l });
  } else if (kind === 'shock') {
    emit?.('ability', { kind });
    for (const e of alive(A)) {
      if (e.row === 'f') { dealHit(A, F, e, base, 1.2, rng, emit, { delay: 0.15, color: Ab.color }); if (!at(A, 'b', e.lane)) { e.row = 'b'; e.moveAt = A.t + 2.5; } }
      e.stunUntil = A.t + 2;
    }
  }
}

function wantsCast(A, F, ab, rule) {
  if (!ab || A.mp < ABILITIES[ab].cost) return false;
  const live = alive(A);
  if (!live.length) return false;
  if (rule === 'ready') return true;
  if (rule === 'pack') return live.length >= 3;
  if (rule === 'brute') return live.some((e) => e.brute);
  return false;
}

function hurtHero(A, F, e, rng, emit) {
  if (rng.next() < F.dodge) { emit?.('enemyShot', { uid: e.uid, ranged: !!e.ranged, dodged: true }); return; }
  const raw = e.dmg * rng.range(0.85, 1.15);
  const d = Math.max(raw - F.def, raw * CONFIG.minDamageAfterDef);
  A.hp -= d;
  emit?.('enemyShot', { uid: e.uid, ranged: !!e.ranged, dmg: Math.round(d), big: !!e.brute });
}

/** Advance one tick. loadout = { weapon, ability, rule } */
export function stepArena(A, F, loadout, base, rng, emit) {
  A.t += DT; A.stats.time += DT;
  if (A.dead) {
    if (A.t >= A.respawn) { A.dead = false; A.hp = F.maxHp; A.mp = F.maxMp; A.enemies = []; A.traps = []; A.travel = 1; emit?.('respawn', {}); }
    return;
  }
  const live = alive(A);
  if (!live.length) {
    if (A.inWave) { A.inWave = false; A.enemies = []; A.stats.waves++; A.travel = 2; A.focus = null; A.extra = 0; }
    A.hp = Math.min(F.maxHp, A.hp + DT * (F.hpRegen * CONFIG.outOfCombatRegenMult + F.maxHp * CONFIG.walkHealPct));
    A.mp = Math.min(F.maxMp, A.mp + DT * F.mpRegen * CONFIG.outOfCombatRegenMult);
    A.travel -= DT;
    if (A.travel <= 0) { startWave(A, rng); emit?.('wave', { name: A.waveName }); }
    return;
  }
  A.hp = Math.min(F.maxHp, A.hp + DT * F.hpRegen);
  A.mp = Math.min(F.maxMp, A.mp + DT * F.mpRegen);

  // hero attacks
  A.pT += DT * (F.aps / RATE_DIV);
  while (A.pT >= 1) { A.pT -= 1; fire(A, F, loadout.weapon, base * RATE_DIV, rng, emit, Math.max(0, 1 - A.pT / (DT * (F.aps / RATE_DIV)))); }
  if (A.cast || wantsCast(A, F, loadout.ability, loadout.rule)) {
    if (loadout.ability && A.mp >= ABILITIES[loadout.ability].cost && alive(A).length) castAbility(A, F, loadout.ability, base * RATE_DIV, rng, emit);
    A.cast = false;
  }
  // traps burn whatever stands in their lane (front first)
  A.traps = A.traps.filter((tr) => tr.until > A.t);
  for (const tr of A.traps) {
    for (const e of [at(A, 'f', tr.lane), at(A, 'b', tr.lane)]) if (e) { const d = tr.dps * DT; e.hp -= d; A.stats.dmg += d; e.slowUntil = A.t + 0.3; }
    if (Math.round(A.t * 10) % 5 === 0) { const e = first(A, tr.lane); if (e) emit?.('hit', { uid: e.uid, dmg: Math.round(tr.dps * 0.5), delay: 0, color: ABILITIES.trap.color, small: true }); }
  }

  // enemies
  for (const e of alive(A)) {
    // melee in the back row steps forward when its front slot is free
    if (e.row === 'b' && e.melee && !at(A, 'f', e.lane) && A.t >= e.moveAt) {
      if (!e.stepAt) e.stepAt = A.t + (e.rusher ? 0.3 : 1.2);
      if (A.t >= e.stepAt) { e.row = 'f'; e.stepAt = 0; e.nextAt = A.t + 0.5; emit?.('advance', { uid: e.uid }); }
    }
    if (e.stunUntil > A.t) continue;
    if (e.row === 'b' && e.melee) continue; // melee can't reach from the back
    if (A.t >= e.nextAt) {
      e.nextAt = A.t + 1 / (e.rate * (e.slowUntil > A.t ? 0.5 : 1));
      if (e.healer) {
        const hurt = alive(A).filter((x) => x !== e && x.hp < x.maxHp * 0.9).sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0];
        if (hurt) { const amt = hurt.maxHp * 0.07; hurt.hp = Math.min(hurt.maxHp, hurt.hp + amt); emit?.('heal', { from: e.uid, uid: hurt.uid, amt: Math.round(amt) }); continue; }
      }
      hurtHero(A, F, e, rng, emit);
      if (A.hp <= 0) { A.hp = 0; A.dead = true; A.respawn = A.t + 4; A.stats.deaths++; emit?.('death', {}); return; }
    }
  }
  // deaths
  for (const e of A.enemies) if (e.hp <= 0 && !e.gone) { e.gone = true; A.stats.kills++; if (A.focus === e.uid) A.focus = null; emit?.('kill', { uid: e.uid }); }
  A.enemies = A.enemies.filter((e) => e.hp > 0);
  // reinforcements: rushers keep arriving in empty back slots during swarms
  if (A.extra > 0 && A.t >= A.extraT) {
    for (const l of [0, 1, 2].filter((x) => !at(A, 'b', x))) {
      if (A.extra <= 0) break;
      const e = spawn(A, 'rat', 'b', l); A.extra--; emit?.('arrive', { uid: e.uid });
    }
    A.extraT = A.t + 1;
  }
}
