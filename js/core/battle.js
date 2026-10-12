// The auto-battle. A party of up to three fights three waves; the last wave of a boss stage is the boss.
// Pure simulation stepped in fixed ticks. The same code runs on screen, offline, and in tools/sim.mjs.
// It also emits events (shots, hits, abilities, deaths) that ui/battleView.js turns into visuals.
import { BAL } from '../data/balance.js';
import { CLASSES } from '../data/classes.js';
import { zoneOf, isBoss } from '../data/zones.js';
import { makeRng } from './rng.js';

export const TICK = 0.05;
const HERO_FLIGHT = 0.2, ENEMY_FLIGHT = 0.45, TIME_LIMIT = 75;

/** Enemy strength at a stage in a Realm. */
export function enemyStats(stage, realm) {
  const g = BAL.stageGrowth ** stage * BAL.realmGrowth ** realm, E = BAL.enemyBase;
  return { hp: E.hp * g, atk: E.atk * g, def: Math.min(0.4, E.armor * Math.floor(stage / 10)) };
}
// Armor is a share of damage: enemies have a flat armor share per zone (def is 0..0.4); heroes' DEF is weighed
// against the attacker's ATK, so it stays useful at every stage without ever making anyone immune.
const hit = (atk, def) => atk * (1 - def);
// tanks also shrug off a flat share of every hit (Guard), since they draw most of the fire
const heroArmor = (h, eatk) => 1 - (1 - h.def / (h.def + 2.5 * eatk)) * (h.role === 'tank' ? 1 - BAL.tankGuard : 1) * (1 - Math.min(0.6, h.fx.guard || 0));

const abilityCd = (h) => CLASSES[h.cls].ability.cd * (1 - Math.min(0.6, h.fx?.cdr || 0));

export function createBattle(stage, realm, heroStats, seed = (Math.random() * 2 ** 32) >>> 0) {
  const B = {
    stage, realm, rng: makeRng(seed), t: 0, wave: 0, waves: BAL.waves, state: 'fight', pause: 0.6, uid: 1,
    heroes: heroStats.map((s, i) => ({ ...s, fx: s.fx || {}, i, maxHp: s.hp, hp: s.hp, atkT: 0.2 * i, cd: abilityCd(s) * (0.35 + 0.15 * i), buff: {}, dead: false, shield: 0, shots: 0, rampId: 0, ramp: 0 })),
    enemies: [], pending: [], events: [], kills: 0, bossKilled: false, rez: null, rezUsed: false,
  };
  return B;
}

function spawnWave(B) {
  const Z = zoneOf(B.stage), base = enemyStats(B.stage, B.realm), boss = isBoss(B.stage) && B.wave === B.waves - 1;
  const mk = (name, sprite, pal, m, x, y, isB = false) => ({
    id: B.uid++, name, sprite, pal, boss: isB, x, y,
    hp: base.hp * m.hp, maxHp: base.hp * m.hp, atk: base.atk * m.atk, def: base.def, spd: isB ? 0.55 : 0.75,
    atkT: 0.6 + B.rng.next() * 0.8, n: 0, stunUntil: 0, slowUntil: 0, dots: [],
  });
  if (boss) {
    const [n, sp, pal] = Z.boss;
    B.enemies = [mk(n, sp, pal, { hp: BAL.bossHp, atk: BAL.bossAtk }, 180, 105, true)];
    for (const x of [70, 290]) { const e = Z.enemies[B.rng.int(0, Z.enemies.length - 1)]; B.enemies.push(mk(e[0], e[1], e[2], { hp: 0.8, atk: 0.8 }, x, 150)); }
  } else {
    const xs = [70, 180, 290], n = BAL.perWave;
    B.enemies = Array.from({ length: n }, (_, k) => { const e = Z.enemies[B.rng.int(0, Z.enemies.length - 1)]; return mk(e[0], e[1], e[2], { hp: 1, atk: 1 }, xs[k], 110 + (k % 2) * 30); });
  }
  const hs = alive(B.heroes), sum = (k) => hs.reduce((a, o) => a + (o.fx[k] || 0), 0);
  const partyShield = sum('partyBarrier'), waveHeal = sum('waveHeal');
  for (const h of hs) {
    if (h.fx.firstStrike) h.cd = Math.min(h.cd, 0.25);
    const sh = h.maxHp * ((h.fx.barrier || 0) + partyShield);
    if (sh > h.shield) h.shield = sh;
    if (waveHeal) h.hp = Math.min(h.maxHp, h.hp + h.maxHp * waveHeal);
  }
  if (partyShield || hs.some((h) => h.fx.barrier)) B.events.push({ k: 'barrier', heroes: hs.filter((h) => h.shield > 0).map((h) => h.i) });
  B.events.push({ k: 'wave', n: B.wave, boss });
}

const alive = (arr) => arr.filter((x) => !x.dead && x.hp > 0);
function frontEnemy(B) { return alive(B.enemies)[0]; }
function enemyTarget(B) {
  const hs = alive(B.heroes);
  if (!hs.length) return null;
  // a tank draws most of the fire, but only while it's healthy: badly hurt, it falls back and the hits spread out
  const steady = hs.filter((h) => h.hp > h.maxHp * BAL.tankFallback);
  const taunt = steady.find((h) => h.buff.taunt > B.t) || steady.find((h) => h.role === 'tank');
  if (taunt && B.rng.next() < 0.8) return taunt;
  const pool = steady.length ? steady : hs;
  return pool[B.rng.int(0, pool.length - 1)];
}
function damageEnemy(B, e, d, src) {
  if (e.hp <= 0) return;
  e.hp -= d;
  B.events.push({ k: 'hit', id: e.id, dmg: d, crit: src.crit, ab: src.ab, hero: src.hero });
  if (e.hp <= 0) {
    e.hp = 0; B.kills++; if (e.boss) B.bossKilled = true; B.events.push({ k: 'die', id: e.id, boss: e.boss });
    // any kill: frenzied heroes speed up, and a corpse-burster makes the body explode (which can set off the next)
    let bomber = null;
    for (const h of alive(B.heroes)) {
      if (h.fx.frenzy) h.buff.frenzyUntil = B.t + 2.5;
      if (h.fx.corpse && (!bomber || h.fx.corpse > bomber.fx.corpse)) bomber = h;
    }
    const others = bomber ? alive(B.enemies) : [];
    if (others.length) { B.events.push({ k: 'blast', id: e.id, big: true }); for (const o of others) damageEnemy(B, o, hit(e.maxHp * bomber.fx.corpse, o.def), { hero: bomber.i }); }
  }
}
function heal(B, h, amt) {
  if (h.dead || h.hp <= 0) return;
  const before = h.hp; h.hp = Math.min(h.maxHp, h.hp + amt);
  if (h.hp > before + 0.5) B.events.push({ k: 'heal', hero: h.i, amt: h.hp - before });
}
const aura = (B) => B.heroes.reduce((a, o) => (o.fx.aura && !o.dead ? a * (1 + o.fx.aura) : a), 1);
const dmgMult = (B, h) => aura(B) * (1 + (h.fx.glass || 0)) * (h.fx.lastStand && h.hp < h.maxHp * 0.4 ? 1 + h.fx.lastStand : 1) * (h.buff.dmgUntil > B.t ? 1 + h.buff.dmg : 1) * (alive(B.heroes).some((o) => o.buff.partyUntil > B.t) ? 1 + Math.max(...B.heroes.map((o) => (o.buff.partyUntil > B.t ? o.buff.party : 0))) : 1);

const ECHOES = new Set(['aoe', 'heal', 'pierce', 'execute', 'stun', 'dot', 'drain', 'poison', 'chain']);
function useAbility(B, h, scale = 1) {
  const A = CLASSES[h.cls].ability, p = A.pow * h.pow * scale, es = alive(B.enemies), hs = alive(B.heroes);
  if (!es.length) return;
  const dmg = h.atk * dmgMult(B, h) * (1 + (h.fx.abilityDmg || 0));
  const src = { hero: h.i, ab: true };
  const ev = { k: 'ability', hero: h.i, fx: A.fx, targets: [] };
  switch (A.fx) {
    case 'aoe': for (const e of es) { ev.targets.push(e.id); damageEnemy(B, e, hit(dmg * p, e.def), src); } break;
    case 'heal': { const t = hs.reduce((a, b) => (b.hp / b.maxHp < a.hp / a.maxHp ? b : a)); ev.heroes = [t.i]; heal(B, t, t.maxHp * p); break; }
    case 'pierce': for (const e of es.slice(0, 2)) { ev.targets.push(e.id); damageEnemy(B, e, hit(dmg * p, e.def), src); } break;
    case 'execute': { const e = es.reduce((a, b) => (b.hp < a.hp ? b : a)); ev.targets.push(e.id); damageEnemy(B, e, hit(dmg * p, e.def), { ...src, crit: true }); break; }
    case 'berserk': h.buff.taunt = B.t + 4; h.buff.hasteUntil = B.t + 4; h.buff.haste = p; break;
    case 'stun': for (const e of es) { ev.targets.push(e.id); e.stunUntil = B.t + 1.2 * (e.boss ? 0.5 : 1); damageEnemy(B, e, hit(dmg * p, e.def), src); } break;
    case 'dot': for (const e of es) { ev.targets.push(e.id); e.dots.push({ left: 4, dps: (dmg * p) / 4, hero: h.i }); e.slowUntil = B.t + 4; } break;
    case 'drain': { let tot = 0; for (const e of es) { ev.targets.push(e.id); const d = hit(dmg * p, e.def); tot += d; damageEnemy(B, e, d, src); } for (const o of hs) heal(B, o, Math.min(o.maxHp * 0.25, (tot * 0.15) / hs.length)); ev.heroes = hs.map((o) => o.i); break; }
    case 'poison': { const e = es.reduce((a, b) => (b.hp > a.hp ? b : a)); ev.targets.push(e.id); e.dots.push({ left: 5, dps: (dmg * p) / 5, hero: h.i }); break; }
    case 'buff': for (const o of hs) heal(B, o, o.maxHp * 0.1); h.buff.partyUntil = B.t + 5; h.buff.party = p; ev.heroes = hs.map((o) => o.i); break;
    case 'chain': es.forEach((e, k) => { ev.targets.push(e.id); damageEnemy(B, e, hit(dmg * p * 0.75 ** k, e.def), src); }); break;
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
  const heavy = h.hit > h.atk / CLASSES[h.cls].base.spd * 1.3; // a slow, heavy Unique weapon
  B.pending.push({ side: 'hero', to: e.id, dmg: vs(e), crit, hero: h.i, mods, at: B.t + HERO_FLIGHT + delay });
  B.events.push({ k: 'shot', hero: h.i, to: e.id, crit, flight: HERO_FLIGHT + delay, mod, big: heavy || charged });
  const e2 = fx.multishot ? alive(B.enemies).find((x) => x !== e) : null;
  if (e2) {
    B.pending.push({ side: 'hero', to: e2.id, dmg: vs(e2) * fx.multishot, hero: h.i, at: B.t + HERO_FLIGHT + delay });
    B.events.push({ k: 'shot', hero: h.i, to: e2.id, flight: HERO_FLIGHT + delay });
  }
}
function landShot(B, e, p) {
  damageEnemy(B, e, p.dmg, p);
  const m = p.mods;
  if (!m) return;
  const h = B.heroes[p.hero], src = { hero: p.hero };
  if (m.leech && h && !h.dead) h.hp = Math.min(h.maxHp, h.hp + p.dmg * m.leech);
  if (m.burn && e.hp > 0) { e.dots.push({ left: 3, dps: (p.dmg * m.burn) / 3, hero: p.hero }); B.events.push({ k: 'ignite', id: e.id }); }
  if (m.chill && e.hp > 0) { e.slowUntil = Math.max(e.slowUntil, B.t + m.chill); B.events.push({ k: 'chill', id: e.id, dur: m.chill }); }
  if (m.stun && e.hp > 0 && B.rng.next() < m.stun) { e.stunUntil = Math.max(e.stunUntil, B.t + 0.8 * (e.boss ? 0.5 : 1)); B.events.push({ k: 'stunned', id: e.id }); }
  const others = alive(B.enemies).filter((x) => x !== e);
  if (m.splash) { B.events.push({ k: 'blast', id: e.id, big: m.splash >= 0.7 }); for (const o of others) damageEnemy(B, o, p.dmg * m.splash, src); }
  if (m.chain && others.length) { B.events.push({ k: 'arc', from: e.id, ids: others.map((o) => o.id) }); others.forEach((o, k) => damageEnemy(B, o, p.dmg * m.chain ** (k + 1), src)); }
}

/** Advance one tick. */
export function stepBattle(B) {
  if (B.state !== 'fight') return;
  const dt = TICK;
  B.t += dt;
  if (B.pause > 0) {
    B.pause -= dt;
    if (B.pause <= 0) spawnWave(B);
    return;
  }
  // landing hits
  if (B.pending.length) {
    const due = B.pending.filter((p) => p.at <= B.t);
    if (due.length) {
      B.pending = B.pending.filter((p) => p.at > B.t);
      for (const p of due) {
        if (p.side === 'hero') { const e = B.enemies.find((x) => x.id === p.to); if (e) landShot(B, e, p); }
        else {
          const h = B.heroes[p.to];
          if (h.dead) continue;
          if (h.fx.dodge && B.rng.next() < h.fx.dodge) { B.events.push({ k: 'dodge', hero: h.i }); continue; }
          const absorbed = Math.min(h.shield, p.dmg); h.shield -= absorbed;
          h.hp -= p.dmg - absorbed;
          B.events.push({ k: 'ehit', hero: h.i, dmg: p.dmg - absorbed, big: p.big, shield: absorbed > 0 });
          const from = h.fx.thorns && B.enemies.find((x) => x.id === p.from);
          if (from) damageEnemy(B, from, p.raw * h.fx.thorns, { hero: h.i, thorns: true });
          if (h.hp <= 0 && h.fx.revive && !h.revived) { h.revived = true; h.hp = h.maxHp * h.fx.revive; B.events.push({ k: 'revive', hero: h.i }); }
          if (h.hp <= 0) {
            h.hp = 0; h.dead = true; B.events.push({ k: 'fall', hero: h.i });
            const healer = !B.rezUsed && alive(B.heroes).filter((o) => o.fx.rezAlly).sort((a, b) => b.fx.rezAlly - a.fx.rezAlly)[0];
            if (healer) { B.rezUsed = true; B.rez = { hero: h.i, at: B.t + 2, v: healer.fx.rezAlly, by: healer.i }; }
          }
        }
      }
    }
  }
  if (B.rez && B.t >= B.rez.at) {
    const h = B.heroes[B.rez.hero];
    if (alive(B.heroes).length) { h.dead = false; h.hp = h.maxHp * B.rez.v; B.events.push({ k: 'revive', hero: h.i, by: B.rez.by }); }
    B.rez = null;
  }
  // heroes
  for (const h of B.heroes) {
    if (h.dead) continue;
    if (h.fx.regen) h.hp = Math.min(h.maxHp, h.hp + h.maxHp * h.fx.regen * dt);
    if (h.fx.partyRegen) for (const o of alive(B.heroes)) o.hp = Math.min(o.maxHp, o.hp + o.maxHp * h.fx.partyRegen * dt);
    h.cd -= dt;
    const A = CLASSES[h.cls].ability, es = alive(B.enemies);
    const needHeal = A.fx === 'heal' ? alive(B.heroes).some((o) => o.hp < o.maxHp * 0.8) : true;
    if (h.cd <= 0 && es.length && needHeal) { h.cd = abilityCd(h); useAbility(B, h); }
    h.atkT -= dt * h.spd * (h.buff.hasteUntil > B.t ? 1 + h.buff.haste : 1) * (h.buff.frenzyUntil > B.t ? 1 + h.fx.frenzy : 1);
    const e = frontEnemy(B);
    if (h.atkT <= 0 && e) {
      h.atkT += 1;
      fire(B, h, e, 0);
      if (h.fx.double && B.rng.next() < h.fx.double) fire(B, h, e, 0.09);
    }
  }
  // enemies
  for (const e of B.enemies) {
    if (e.hp <= 0) continue;
    for (const d of e.dots) { const x = Math.min(d.left, dt); d.left -= x; damageEnemy(B, e, d.dps * x, { hero: d.hero, dot: true }); }
    e.dots = e.dots.filter((d) => d.left > 0);
    if (e.hp <= 0 || e.stunUntil > B.t) continue;
    e.atkT -= dt * e.spd * (e.slowUntil > B.t ? 0.6 : 1);
    if (e.atkT > 0) continue;
    e.atkT += 1; e.n++;
    if (e.boss && e.n % 3 === 0) {
      // the boss's big pattern: a burst that reaches the whole party
      B.events.push({ k: 'pattern', id: e.id, kind: ['ring', 'spread', 'spiral'][(e.n / 3) % 3 | 0] });
      for (const h of alive(B.heroes)) B.pending.push({ side: 'enemy', to: h.i, from: e.id, raw: e.atk * 0.7, dmg: hit(e.atk * 0.7, heroArmor(h, e.atk)), big: true, at: B.t + ENEMY_FLIGHT + 0.15 });
    } else {
      const h = enemyTarget(B);
      if (!h) continue;
      B.pending.push({ side: 'enemy', to: h.i, from: e.id, raw: e.atk, dmg: hit(e.atk, heroArmor(h, e.atk)), at: B.t + ENEMY_FLIGHT });
      B.events.push({ k: 'eshot', id: e.id, hero: h.i, flight: ENEMY_FLIGHT, boss: e.boss });
    }
  }
  // outcome
  if (!alive(B.heroes).length) { B.state = 'lost'; B.events.push({ k: 'lost' }); return; }
  if (B.t > TIME_LIMIT) { B.state = 'lost'; B.events.push({ k: 'lost', timeout: true }); return; }
  if (B.enemies.length && !alive(B.enemies).length && !B.pending.some((p) => p.side === 'hero')) {
    B.events.push({ k: 'waveClear', n: B.wave, boss: B.enemies.some((e) => e.boss) });
    B.wave++;
    B.enemies = []; B.pending = [];
    if (B.wave >= B.waves) { B.state = 'won'; B.events.push({ k: 'won' }); return; }
    for (const h of alive(B.heroes)) heal(B, h, h.maxHp * BAL.waveHeal);
    B.pause = 0.9;
  }
}

/** Run a whole battle headless. Returns { won, t, kills }. */
export function simulate(stage, realm, heroStats, seed) {
  const B = createBattle(stage, realm, heroStats, seed);
  while (B.state === 'fight') { stepBattle(B); B.events.length = 0; }
  return { won: B.state === 'won', t: B.t, kills: B.kills };
}
