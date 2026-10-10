// The one combat engine. Farming, dungeons, offline catch-up and survival estimates all step it the same way.
// It works in fixed ticks (CONFIG.tickSeconds), so a fight plays out identically whether you watch it or not.
//
// Fights are formations: enemies stand in a front row ('f') and a back row ('b') across three lanes.
// Each weapon type has a pattern that decides which enemies a shot hits, and each ability has a shape.
import { CONFIG } from '../config.js';

export const LANES = 3;
const LANE_ORDER = [1, 0, 2]; // center first

/** Weapon type → pattern. Patterns: which enemies each shot of an attack hits, and how hard (m). */
/** How often each weapon type attacks, as a share of the DEX attack rate. Fewer, bigger hits make each weapon readable;
 *  damage per attack is scaled up to match, so DPS is unchanged. */
export const CADENCE = { sword: 0.4, staff: 0.45, bow: 0.5, wand: 0.55, dagger: 0.75 };

export const PATTERN = {
  staff:  { name: 'Weaving bolts', desc: 'Two bolts that weave into a neighboring enemy in the same row.' },
  wand:   { name: 'Piercing bolt', desc: 'Pierces through its target into the enemy behind it.' },
  bow:    { name: 'Spread', desc: 'Three arrows, one down each lane.' },
  sword:  { name: 'Sweep', desc: 'Cuts across the whole front row.' },
  dagger: { name: 'Quick stab', desc: 'Darts to the weakest enemy anywhere, even the back row. Extra damage to wounded enemies.' },
};

const ABILITY = {
  spell:   { dmg: 2.4, splash: 0.5 },                   // burst on the target, splashes to its neighbors
  scepter: { dmg: 1.6, costMult: 0.7, chain: 3 },       // chain lightning
  skull:   { dmg: 1.3, row: 0.55, lifesteal: 0.3 },     // drains the target's whole row
  poison:  { dot: 4.0, dotSec: 4, lane: true },          // cloud on a lane
  quiver:  { dmg: 3.2, stun: 1.5, lane: true, back: 0.65 }, // piercing arrow down a lane
  shield:  { dmg: 3.2, stun: 3, row: 0.5, knock: true }, // bash the front row back
  trap:    { dmg: 1.8, slow: 5, lane: true, back: 1 },    // snare a lane
  tome:    { healPct: 0.22, dmgBuff: 1.25, buffSec: 5, healer: true },
  seal:    { healPct: 0.25, dmgBuff: 1.3, buffSec: 5, healer: true },
  helm:    { haste: 1.15, buffSec: 5 },
  cloak:   { invis: 4, healer: true },
};
export const abilityCost = (ab) => Math.round(ab.cost * (ABILITY[ab.type]?.costMult || 1));

export function newCombat(F) {
  return { t: 0, hp: F.maxHp, mp: F.maxMp, enemies: [], uid: 1, focus: null, pT: 0, travel: 0.5, dead: false, tapShots: 0,
    hasteUntil: 0, dmgUntil: 0, dmgMult: 1, invisUntil: 0, castInput: false, dodgeInput: -1, mpReadySince: -1,
    fightStart: 0, fightHits: 0, attacks: 0, critReady: false, killHasteUntil: 0, shieldUntil: 0, cheatReadyAt: 0,
    carry: 0, reinforceAt: 0, casts: 0, target: null };
}

// ---------- formation helpers ----------
export function alive(cs) {
  const list = cs.enemies;
  for (let i = 0; i < list.length; i++) if (list[i].hp <= 0) return list.filter((e) => e.hp > 0);
  return list;
}
const anyAlive = (cs) => cs.enemies.some((e) => e.hp > 0);
export const at = (cs, row, lane) => cs.enemies.find((e) => e.row === row && e.lane === lane && e.hp > 0);
const first = (cs, lane) => at(cs, 'f', lane) || at(cs, 'b', lane);
const rowOf = (cs, row) => alive(cs).filter((e) => e.row === row);
/** The enemy the fight is "about": a boss, the focused enemy, or the first in the front row. */
export function mainEnemy(cs) {
  const live = alive(cs);
  return live.find((e) => e.boss) || live.find((e) => e.uid === cs.focus) || live.find((e) => e.event) || live.find((e) => e.row === 'f') || live[0] || null;
}
const focused = (cs) => alive(cs).find((e) => e.uid === cs.focus);
const weakest = (list) => list.slice().sort((a, b) => a.hp - b.hp)[0];

/** Put an enemy template into the formation. Returns the enemy, or null when there is no room. */
export function spawnEnemy(cs, tpl, rng) {
  const prefer = tpl.row || (tpl.ranged ? 'b' : 'f');
  for (const row of [prefer, prefer === 'f' ? 'b' : 'f']) {
    const lanes = tpl.boss || tpl.event ? [1, 0, 2] : rng ? [...LANE_ORDER].sort(() => rng.next() - 0.5) : LANE_ORDER;
    const lane = lanes.find((l) => !at(cs, row, l));
    if (lane == null) continue;
    const e = { ...tpl, uid: cs.uid++, row, lane, maxHp: tpl.hp, stunUntil: 0, slowUntil: 0, vulnUntil: 0, dotDps: 0, dotUntil: 0, poison: 0, tele: null, nextTele: 0,
      eT: rng ? rng.next() * 0.6 : 0, stepAt: 0 };
    if (e.boss) e.nextTele = cs.t + (rng ? rng.range(...CONFIG.telegraphEvery) : 10) * 0.6;
    cs.enemies.push(e);
    return e;
  }
  return null;
}

function shouldAutoCast(cs, F) {
  const ab = F.ability; if (!ab) return false;
  const A = ABILITY[ab.type];
  const live = alive(cs);
  if (!live.length) return false;
  const hpFrac = cs.hp / F.maxHp;
  const packFrac = live.reduce((n, e) => n + e.hp, 0) / live.reduce((n, e) => n + e.maxHp, 0);
  const boss = live.some((e) => e.boss || e.elite);
  if (ab.type === 'tome' || ab.type === 'seal') return hpFrac < 0.7 || packFrac > 0.6;
  if (ab.type === 'cloak') return hpFrac < 0.5 || live.some((e) => e.tele) && cs.invisUntil < cs.t;
  if (A.haste) return packFrac > 0.5;
  // area abilities wait for a group, single-target ones fire on bosses and big packs
  if (A.row || A.lane || A.chain || A.splash) return live.length >= 2 || boss;
  return packFrac > 0.35;
}

// ---------- abilities ----------
function castAbility(cs, F, rng, emit) {
  const ab = F.ability, fx = F.fx || {};
  cs.casts++;
  if (!(fx.freeCastEvery && cs.casts % fx.freeCastEvery === 0)) cs.mp -= abilityCost(ab);
  if (fx.abilityHpCost) cs.hp = Math.max(1, cs.hp - F.maxHp * fx.abilityHpCost);
  const times = fx.echo && rng.next() < fx.echo ? 2 : 1;
  for (let i = 0; i < times; i++) abilityEffect(cs, F, rng, emit, i > 0);
  if (fx.abilityMp) cs.mp = Math.min(F.maxMp, cs.mp + F.maxMp * fx.abilityMp);
}
/** Targets of a damaging ability: [[enemy, share]] */
function abilityTargets(cs, A) {
  const main = focused(cs) || mainEnemy(cs);
  if (!main) return [];
  if (A.splash) return [[main, 1], ...alive(cs).filter((e) => e !== main && ((e.row === main.row && Math.abs(e.lane - main.lane) === 1) || (e.lane === main.lane))).map((e) => [e, A.splash])];
  if (A.chain) {
    const out = [[main, 1]];
    let last = main;
    for (let k = 1; k <= A.chain; k++) {
      const next = alive(cs).filter((e) => !out.some(([x]) => x === e)).sort((a, b) => Math.abs(a.lane - last.lane) + (a.row !== last.row) - (Math.abs(b.lane - last.lane) + (b.row !== last.row)))[0];
      if (!next) break;
      out.push([next, Math.pow(0.7, k)]); last = next;
    }
    return out;
  }
  if (A.row) {
    const row = A.knock ? (rowOf(cs, 'f').length ? 'f' : 'b') : main.row;
    const tgt = row === main.row ? main : rowOf(cs, row)[0];
    return rowOf(cs, row).map((e) => [e, e === tgt ? 1 : A.row]);
  }
  if (A.lane) {
    const lane = laneFor(cs);
    return [at(cs, 'f', lane), at(cs, 'b', lane)].filter(Boolean).map((e, i) => [e, i === 0 ? 1 : A.back ?? 1]);
  }
  return [[main, 1]];
}
/** The best lane for lane effects: the focused enemy's, else the fullest (front counts a little more). */
function laneFor(cs) {
  const f = focused(cs);
  if (f) return f.lane;
  let best = 1, score = -1;
  for (const l of LANE_ORDER) {
    const fr = at(cs, 'f', l), bk = at(cs, 'b', l);
    const s = (fr ? 10 + (fr.boss ? 5 : 0) : 0) + (bk ? 9 : 0);
    if (s > score) { score = s; best = l; }
  }
  return best;
}
function abilityEffect(cs, F, rng, emit, echo) {
  const ab = F.ability, A = ABILITY[ab.type], fx = F.fx || {};
  const P = ab.power, buff = fx.buffDur || 1;
  let dealt = 0;
  const hits = [];
  const targets = A.dmg || A.dot ? abilityTargets(cs, A) : [];
  for (const [e, share] of targets) {
    let d = 0;
    if (A.dmg) {
      const raw = P * A.dmg * share * F.attMult * (cs.dmgUntil > cs.t ? cs.dmgMult : 1);
      d = Math.max(raw - e.def, raw * CONFIG.minDamageAfterDef) * (e.vulnUntil > cs.t ? CONFIG.bossStunDamageMult : 1);
      e.hp -= d; dealt += d;
    }
    if (A.dot) { e.dotDps = Math.max(e.dotDps, (P * A.dot * share) / A.dotSec); e.dotUntil = cs.t + A.dotSec; }
    if (fx.abilityDot && d) { e.dotDps = Math.max(e.dotDps, (d * fx.abilityDot) / 4); e.dotUntil = cs.t + 4; }
    const stun = (A.stun || 0) + (fx.abilityStun || 0);
    if (stun) e.stunUntil = Math.max(e.stunUntil, cs.t + stun * (e.boss ? 0.5 : 1));
    if (A.slow || fx.abilitySlow) e.slowUntil = cs.t + (A.slow || 0) + (fx.abilitySlow || 0);
    if (A.knock && !e.boss && e.row === 'f' && !at(cs, 'b', e.lane)) { e.row = 'b'; e.stepAt = cs.t + 2.5; }
    hits.push({ uid: e.uid, dmg: Math.round(d) });
  }
  let healed = A.healPct ? F.maxHp * A.healPct * (1 + (P / 70 - 1) * 0.03) * (1 + (fx.abilityPower || 0) * 0.5) : 0; // max-HP based, tier adds a little
  if (fx.abilityHeal) healed += F.maxHp * fx.abilityHeal;
  if (healed) cs.hp = Math.min(F.maxHp, cs.hp + healed);
  if (healed && fx.abilityShield) cs.shieldUntil = cs.t + fx.abilityShield;
  if (A.lifesteal) cs.hp = Math.min(F.maxHp, cs.hp + dealt * A.lifesteal);
  if (A.dmgBuff) { cs.dmgMult = A.dmgBuff; cs.dmgUntil = cs.t + A.buffSec * buff; }
  if (A.haste) cs.hasteUntil = cs.t + A.buffSec * buff;
  if (A.invis) { cs.invisUntil = cs.t + A.invis * buff; cs.critReady = true; }
  emit?.('ability', { type: ab.type, dmg: Math.round(dealt), heal: Math.round(healed), echo, hits, lane: A.lane ? (targets[0]?.[0]?.lane ?? null) : null });
}

// ---------- the hero getting hit ----------
function hitPlayer(cs, F, e, mult, rng, emit, big) {
  const fx = F.fx || {};
  if (cs.invisUntil > cs.t) { emit?.('miss', { uid: e.uid, big, ranged: e.ranged }); return; }
  if (!big && fx.block && rng.next() < fx.block) { emit?.('miss', { uid: e.uid, block: true, ranged: e.ranged }); return; }
  if (!big && rng.next() < F.dodge) {
    if (fx.dodgeHeal) cs.hp = Math.min(F.maxHp, cs.hp + F.maxHp * fx.dodgeHeal);
    if (fx.critAfterDodge) cs.critReady = true;
    emit?.('dodge', { uid: e.uid, ranged: e.ranged }); return;
  }
  const raw = e.dmg * mult * rng.range(0.85, 1.15);
  let d = Math.max(raw - F.def, raw * CONFIG.minDamageAfterDef);
  d *= (1 + (fx.dmgTaken || 0)) * (1 - (fx.dr || 0));
  if (fx.lowHpDR && cs.hp < F.maxHp * 0.4) d *= 1 - fx.lowHpDR;
  if (cs.shieldUntil > cs.t) d *= 0.5;
  cs.hp -= d;
  if (fx.reflect) e.hp -= d * fx.reflect;
  emit?.('hurt', { uid: e.uid, dmg: Math.round(d), big, ranged: e.ranged });
  if (cs.hp <= 0) {
    if (fx.cheatDeath && cs.t >= (cs.cheatReadyAt || 0)) { cs.hp = 1; cs.cheatReadyAt = cs.t + fx.cheatDeath; emit?.('cheat', {}); return; }
    cs.hp = 0; cs.dead = true; emit?.('death', {});
  }
}

// ---------- the hero attacking ----------
/** Which enemies one shot hits: [[enemy, m]]. k = index of the shot within the attack. */
/**
 * The enemy a character is working on. It sticks until that enemy falls (or you tap another), so each class
 * reads as a plan rather than random hits. How a new one is chosen depends on the weapon.
 */
function lockTarget(cs, F) {
  const live = alive(cs);
  const foc = focused(cs);
  if (foc) return (cs.target = foc.uid, foc);
  const cur = live.find((e) => e.uid === cs.target);
  const front = rowOf(cs, 'f');
  // a sword fights whoever stands in front of it; anything else keeps its target until it falls
  if (cur && !(F.weaponType === 'sword' && cur.row === 'b' && front.length)) return cur;
  const boss = live.find((e) => e.boss);
  let pick;
  switch (F.weaponType) {
    case 'wand': { // a lane it can pierce: front with someone behind it
      const lane = LANE_ORDER.find((l) => at(cs, 'f', l) && at(cs, 'b', l));
      pick = boss || (lane != null ? at(cs, 'f', lane) : weakest(front.length ? front : live)); break;
    }
    case 'bow': pick = boss || first(cs, laneFor(cs)); break; // the middle of the group
    case 'sword': pick = (front.length ? front : live).find((e) => e.boss) || weakest(front.length ? front : live); break;
    case 'dagger': pick = boss || live.slice().sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0]; break; // the most wounded
    default: pick = boss || weakest(front.length ? front : live); // staff: the weakest in front
  }
  cs.target = pick?.uid ?? null;
  return pick;
}

/** Which enemies one shot hits: [[enemy, m]]. k = index of the shot within the attack. */
function shotTargets(cs, F, k) {
  const main = lockTarget(cs, F);
  if (!main) return [];
  switch (F.weaponType) {
    case 'staff': {
      // weaving bolt: the target plus a neighbor in the same row, alternating sides
      const side = k % 2 ? -1 : 1;
      const nb = at(cs, main.row, main.lane + side) || at(cs, main.row, main.lane - side);
      return nb ? [[main, 0.75], [nb, 0.48]] : [[main, 0.75]];
    }
    case 'wand': {
      // piercing bolt: through the target into whoever stands behind it
      const back = main.row === 'f' ? at(cs, 'b', main.lane) : null;
      return back ? [[main, 0.8], [back, 0.48]] : [[main, 0.8]];
    }
    case 'bow': {
      // spread: one arrow per lane around the target; an arrow with an empty lane bends back to the target
      const lane = main.lane + (k - 1);
      const e = lane >= 0 && lane < LANES ? first(cs, lane) : null;
      return e && e !== main ? [[e, 1.28]] : [[main, k === 1 ? 1.28 : 0.45]];
    }
    case 'sword': {
      // sweep: the target's whole row
      return rowOf(cs, main.row).map((e) => [e, e === main ? 0.75 : 0.33]);
    }
    case 'dagger':
    default:
      // quick stab, extra damage to wounded enemies
      return [[main, main.hp < main.maxHp * 0.5 ? 1.1 : 0.9]];
  }
}

function hitEnemy(cs, F, e, base, rng, crit) {
  const fx = F.fx || {};
  let mult = base;
  if ((e.elite || e.boss) && fx.eliteDmg) mult *= 1 + fx.eliteDmg;
  if (fx.execute && e.hp < e.maxHp * 0.3) mult *= 1 + fx.execute;
  const raw = rng.range(F.dmgMin, F.dmgMax) * F.attMult * mult;
  const def = fx.ignoreDef ? 0 : e.def;
  let d = Math.max(raw - def, raw * CONFIG.minDamageAfterDef);
  if (e.vulnUntil > cs.t) d *= CONFIG.bossStunDamageMult;
  e.hp -= d;
  if (fx.lifesteal) cs.hp = Math.min(F.maxHp, cs.hp + d * fx.lifesteal);
  const poison = (fx.poisonOnHit || 0) + (crit ? fx.critPoison || 0 : 0);
  if (poison) e.poison = (e.poison || 0) + d * poison; // stacking poison pool, drains over ~3s
  if (fx.slowOnHit && rng.next() < fx.slowOnHit) e.slowUntil = cs.t + 2;
  return d;
}

/** One player attack: every shot of the weapon, each following the pattern. Returns damage dealt. */
function attack(cs, F, rng, scale, emit, tap) {
  const fx = F.fx || {};
  cs.attacks++; cs.fightHits++;
  let mult = scale * (cs.dmgUntil > cs.t ? cs.dmgMult : 1) * (1 + (fx.dmg || 0));
  if (fx.openerHits && cs.fightHits <= fx.openerHits) mult *= fx.openerMult;
  if (fx.ramp) mult *= 1 + Math.min(fx.rampCap, fx.ramp * (cs.t - (cs.fightStart || cs.t)));
  if (fx.lowHpDmg && cs.hp < F.maxHp * 0.4) mult *= 1 + fx.lowHpDmg;
  if (fx.burstEvery && cs.attacks % fx.burstEvery === 0) mult *= fx.burstMult;
  if (fx.luckyChance && rng.next() < fx.luckyChance) mult *= fx.luckyMult;
  const crit = cs.critReady || rng.next() < 0.08 + (fx.critChance || 0);
  cs.critReady = false;
  if (crit) mult *= 1.6 + (fx.critMult || 0);
  let shots = F.shots;
  if (fx.doubleChance) for (let i = 0; i < F.shots; i++) if (rng.next() < fx.doubleChance) shots++;
  let total = 0;
  emit?.('attack', { tap });
  for (let k = 0; k < shots; k++) {
    const tg = shotTargets(cs, F, k % F.shots);
    if (!tg.length) break;
    emit?.('shot', { path: tg.map(([e]) => e.uid), k, weapon: F.weaponType, tap });
    tg.forEach(([e, m], i) => {
      const d = hitEnemy(cs, F, e, mult * m, rng, crit);
      total += d;
      emit?.('hit', { uid: e.uid, dmg: Math.round(d), crit, seq: i, k });
    });
  }
  if (fx.mpOnHit) cs.mp = Math.min(F.maxMp, cs.mp + fx.mpOnHit * scale); // bigger, rarer attacks give more each
  return total;
}

/** Handle every enemy that hit 0 HP: kill effects, rewards, and removal from the formation. */
function reap(cs, F, src, rng, emit) {
  const fx = F.fx || {};
  for (const e of cs.enemies) {
    if (e.hp > 0 || e.gone) continue;
    e.gone = true; e.hp = 0;
    if (cs.focus === e.uid) cs.focus = null;
    if (fx.killHeal) cs.hp = Math.min(F.maxHp, cs.hp + F.maxHp * fx.killHeal * (e.worth ?? 1));
    if (fx.killMp) cs.mp = Math.min(F.maxMp, cs.mp + F.maxMp * fx.killMp * (e.worth ?? 1));
    if (fx.killHaste) cs.killHasteUntil = cs.t + fx.killHaste;
    if (fx.killCarry) {
      const next = alive(cs)[0];
      if (next) next.hp = Math.max(1, next.hp - e.maxHp * fx.killCarry); else cs.carry = e.maxHp * fx.killCarry;
    }
    src.onKill(e, rng);
    emit?.('kill', { uid: e.uid, enemy: e });
  }
  cs.enemies = cs.enemies.filter((e) => e.hp > 0);
}

/**
 * Advance one tick.
 * src.wave(rng) -> [enemy templates] or null (a new group when the last one is gone)
 * src.reinforce?(rng) -> enemy template or null (joins an empty slot mid-fight)
 * src.onKill(enemy, rng)
 * mode: 'auto' (farming, closed app) or 'live' (player is watching a dungeon and taps)
 */
export function step(cs, F, src, rng, emit, mode = 'auto') {
  const dt = CONFIG.tickSeconds;
  if (cs.dead) return;
  cs.t += dt;
  if (cs.enemies.some((e) => e.hp <= 0)) reap(cs, F, src, rng, emit);
  let live = alive(cs);
  const inFight = live.length > 0;
  const regen = inFight ? 1 : CONFIG.outOfCombatRegenMult;
  const walkHeal = inFight ? 0 : F.maxHp * (src.walkHealPct ?? CONFIG.walkHealPct);
  cs.hp = Math.min(F.maxHp, cs.hp + (F.hpRegen * regen + walkHeal) * dt);
  cs.mp = Math.min(F.maxMp, cs.mp + F.mpRegen * regen * dt);
  if (inFight && F.fx?.regenPct) cs.hp = Math.min(F.maxHp, cs.hp + F.maxHp * F.fx.regenPct * dt);
  if (F.fx?.mpRegenPct) cs.mp = Math.min(F.maxMp, cs.mp + F.maxMp * F.fx.mpRegenPct * dt);

  if (!inFight) {
    if (cs.enemies.length) cs.enemies = [];
    cs.travel -= dt;
    if (cs.travel > 0) return;
    const wave = src.wave(rng);
    if (!wave || !wave.length) return;
    cs.focus = null; cs.pT = 0; cs.fightStart = cs.t; cs.fightHits = 0; cs.reinforceAt = cs.t + CONFIG.reinforceSeconds;
    const spawned = wave.map((tpl) => spawnEnemy(cs, tpl, rng)).filter(Boolean);
    if (cs.carry && spawned.length) { const e = spawned[0]; e.hp = Math.max(1, e.hp - cs.carry); cs.carry = 0; }
    emit?.('spawn', { enemies: spawned });
    return;
  }

  // reinforcements step into empty slots
  if (src.reinforce && cs.t >= cs.reinforceAt) {
    cs.reinforceAt = cs.t + CONFIG.reinforceSeconds;
    if (cs.enemies.length < LANES * 2) {
      const tpl = src.reinforce(rng);
      if (tpl) { const e = spawnEnemy(cs, { ...tpl, row: 'b' }, rng); if (e) emit?.('arrive', { uid: e.uid }); }
    }
  }

  // ability
  const ab = F.ability;
  if (ab && cs.mp >= abilityCost(ab)) {
    if (cs.mpReadySince < 0) cs.mpReadySince = cs.t;
    let cast = false;
    if (mode === 'live') cast = cs.castInput;
    else if (shouldAutoCast(cs, F)) cast = !src.castDelay || cs.t - cs.mpReadySince >= src.castDelay;
    if (cast) { castAbility(cs, F, rng, emit); cs.mpReadySince = -1; }
  }
  cs.castInput = false;

  // player attacks
  const haste = (cs.hasteUntil > cs.t ? ABILITY.helm.haste : 1) * (cs.killHasteUntil > cs.t ? 1.3 : 1);
  // frac = where inside this tick each attack lands, so the view can play them at a steady rhythm
  const cad = CADENCE[F.weaponType] || 1;
  const pRate = dt * F.aps * haste * cad, pStart = cs.pT;
  cs.pT += pRate;
  for (let k = 1; cs.pT >= 1 && anyAlive(cs); k++) {
    cs.pT -= 1;
    const frac = Math.min(0.99, Math.max(0, (k - pStart) / pRate));
    attack(cs, F, rng, 1 / cad, emit && ((kind, d) => emit(kind, { ...d, frac })), false);
  }
  if (cs.tapShots > 0 && anyAlive(cs)) { cs.tapShots--; attack(cs, F, rng, CONFIG.tapDamage / cad, emit, true); }
  for (const e of cs.enemies) {
    if (e.dotUntil > cs.t) e.hp -= e.dotDps * dt;
    if (e.poison > 0) { const p = e.poison * (dt / 3); e.poison -= p; e.hp -= p; }
  }

  reap(cs, F, src, rng, emit);
  live = cs.enemies;
  if (!live.length) { cs.travel = F.travel * CONFIG.travelPerWave; return; }

  // enemies act
  for (const e of live) {
    // melee in the back row steps up when its front slot opens
    if (e.row === 'b' && !e.ranged && !at(cs, 'f', e.lane)) {
      if (!e.stepAt) e.stepAt = cs.t + 0.6;
      if (cs.t >= e.stepAt) { e.row = 'f'; e.stepAt = 0; emit?.('advance', { uid: e.uid }); }
    }
    // boss telegraphs
    if (e.boss) {
      if (!e.tele && cs.t >= e.nextTele && e.stunUntil <= cs.t) {
        e.tele = { start: cs.t, until: cs.t + CONFIG.telegraphWindup, auto: mode !== 'live' && rng.next() < CONFIG.closedAppDodgeChance };
        emit?.('telegraph', { uid: e.uid, until: e.tele.until });
      }
      if (e.tele) {
        const dodged = mode === 'live' ? cs.dodgeInput >= e.tele.start : e.tele.auto && cs.t >= e.tele.start + CONFIG.telegraphWindup / 2;
        if (dodged) {
          e.tele = null; e.stunUntil = cs.t + CONFIG.bossStunSeconds; e.vulnUntil = e.stunUntil;
          e.nextTele = cs.t + rng.range(...CONFIG.telegraphEvery);
          emit?.('dodged', { uid: e.uid });
        } else if (cs.t >= e.tele.until) {
          e.tele = null;
          e.nextTele = cs.t + rng.range(...CONFIG.telegraphEvery);
          hitPlayer(cs, F, e, CONFIG.telegraphHitMult, rng, emit, true);
          if (cs.dead) return;
        }
      }
    }
    if (e.stunUntil > cs.t) continue;
    if (e.row === 'b' && !e.ranged) continue; // melee can't reach from the back row
    const phase = e.boss ? 1 + 0.15 * (e.hp < e.maxHp * 0.66) + 0.15 * (e.hp < e.maxHp * 0.33) : 1;
    const eRate = dt * e.rate * (e.slowUntil > cs.t ? 0.5 : 1) * phase, eStart = e.eT;
    e.eT += eRate;
    for (let k = 1; e.eT >= 1 && !cs.dead; k++) {
      const frac = Math.min(0.99, Math.max(0, (k - eStart) / eRate));
      e.eT -= 1;
      hitPlayer(cs, F, e, 1, rng, emit && ((kind, d) => emit(kind, { ...d, frac })), false);
    }
    if (cs.dead) return;
  }
}

/** Old saves stored one enemy at a time; start their fights fresh (HP and MP are kept). */
export function upgradeCombat(cs, F) {
  if (!cs || Array.isArray(cs.enemies)) return cs;
  const fresh = newCombat(F);
  fresh.hp = cs.hp; fresh.mp = cs.mp; fresh.t = cs.t || 0; fresh.dead = !!cs.dead;
  return fresh;
}
