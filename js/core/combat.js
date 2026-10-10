// The one combat engine. Farming, dungeons, offline catch-up and survival estimates all step it the same way.
// It works in fixed ticks (CONFIG.tickSeconds), so a fight plays out identically whether you watch it or not.
import { CONFIG } from '../config.js';

const ABILITY = {
  spell:   { dmg: 1.0 },
  scepter: { dmg: 0.8, costMult: 0.7 },
  skull:   { dmg: 0.7, lifesteal: 0.5 },
  poison:  { dot: 1.4, dotSec: 4 },
  quiver:  { dmg: 0.8, stun: 1.5 },
  shield:  { dmg: 0.5, stun: 3 },
  trap:    { dmg: 0.6, slow: 5 },
  tome:    { heal: 2.0, healer: true },
  seal:    { heal: 0.8, dmgBuff: 1.35, buffSec: 6, healer: true },
  helm:    { haste: 1.6, buffSec: 6 },
  cloak:   { invis: 4, healer: true },
};
export const abilityCost = (ab) => Math.round(ab.cost * (ABILITY[ab.type]?.costMult || 1));

export function newCombat(F) {
  return { t: 0, hp: F.maxHp, mp: F.maxMp, enemy: null, pT: 0, eT: 0, travel: 0.6, resting: false, dead: false,
    hasteUntil: 0, dmgUntil: 0, dmgMult: 1, invisUntil: 0, castInput: false, dodgeInput: -1, mpReadySince: -1 };
}

/** Make a live enemy from a template { name, sprite, pal, hp, dmg, def, rate, xp, elite, boss } */
export function spawnEnemy(tpl) {
  return { ...tpl, maxHp: tpl.hp, stunUntil: 0, slowUntil: 0, vulnUntil: 0, dotDps: 0, dotUntil: 0, tele: null, nextTele: 0 };
}

function shouldAutoCast(cs, F, e) {
  const ab = F.ability; if (!ab) return false;
  const A = ABILITY[ab.type];
  const hpFrac = cs.hp / F.maxHp, eFrac = e.hp / e.maxHp;
  if (ab.type === 'tome') return hpFrac < 0.55;
  if (ab.type === 'cloak') return hpFrac < 0.5 || (e.tele && cs.invisUntil < cs.t);
  if (ab.type === 'seal') return hpFrac < 0.7 || eFrac > 0.5;
  if (A.haste) return eFrac > 0.5;
  return eFrac > 0.35;
}

function castAbility(cs, F, e, rng, emit) {
  const ab = F.ability, A = ABILITY[ab.type];
  cs.mp -= abilityCost(ab);
  const P = ab.power;
  let dealt = 0;
  if (A.dmg) {
    const raw = P * A.dmg * F.attMult * (cs.dmgUntil > cs.t ? cs.dmgMult : 1);
    dealt = Math.max(raw - e.def, raw * CONFIG.minDamageAfterDef) * (e.vulnUntil > cs.t ? CONFIG.bossStunDamageMult : 1);
    e.hp -= dealt;
  }
  if (A.dot) { e.dotDps = (P * A.dot) / A.dotSec; e.dotUntil = cs.t + A.dotSec; }
  if (A.stun) e.stunUntil = Math.max(e.stunUntil, cs.t + A.stun * (e.boss ? 0.5 : 1));
  if (A.slow) e.slowUntil = cs.t + A.slow;
  if (A.heal) cs.hp = Math.min(F.maxHp, cs.hp + P * A.heal);
  if (A.lifesteal) cs.hp = Math.min(F.maxHp, cs.hp + dealt * A.lifesteal);
  if (A.dmgBuff) { cs.dmgMult = A.dmgBuff; cs.dmgUntil = cs.t + A.buffSec; }
  if (A.haste) cs.hasteUntil = cs.t + A.buffSec;
  if (A.invis) cs.invisUntil = cs.t + A.invis;
  emit?.('ability', { type: ab.type, dmg: Math.round(dealt), heal: A.heal ? Math.round(P * A.heal) : 0 });
}

function hitPlayer(cs, F, e, mult, rng, emit, big) {
  if (cs.invisUntil > cs.t) { emit?.('miss', { big }); return; }
  if (!big && rng.next() < F.dodge) { emit?.('dodge', {}); return; }
  const raw = e.dmg * mult * rng.range(0.85, 1.15);
  const d = Math.max(raw - F.def, raw * CONFIG.minDamageAfterDef);
  cs.hp -= d;
  emit?.('hurt', { dmg: Math.round(d), big });
  if (cs.hp <= 0) { cs.hp = 0; cs.dead = true; emit?.('death', {}); }
}

/**
 * Advance one tick.
 * src.next() -> enemy template or null; src.onKill(enemy)
 * mode: 'auto' (farming, closed app) or 'live' (player is watching a dungeon and taps)
 */
export function step(cs, F, src, rng, emit, mode = 'auto') {
  const dt = CONFIG.tickSeconds;
  if (cs.dead) return;
  cs.t += dt;
  const regen = cs.resting ? CONFIG.restRegenMult : 1;
  cs.hp = Math.min(F.maxHp, cs.hp + F.hpRegen * regen * dt);
  cs.mp = Math.min(F.maxMp, cs.mp + F.mpRegen * regen * dt);

  let e = cs.enemy;
  if (!e) {
    if (cs.resting) { if (cs.hp >= F.maxHp * CONFIG.restUntil) cs.resting = false; return; }
    cs.travel -= dt;
    if (cs.travel > 0) return;
    if (cs.hp < F.maxHp * (src.restBelow ?? CONFIG.restBelow)) { cs.resting = true; emit?.('rest', {}); return; }
    const tpl = src.next(rng);
    if (!tpl) return;
    e = cs.enemy = spawnEnemy(tpl);
    if (e.boss) e.nextTele = cs.t + rng.range(...CONFIG.telegraphEvery) * 0.6;
    cs.pT = 0; cs.eT = rng.next() * 0.5;
    emit?.('spawn', { enemy: e });
    return;
  }

  // ability
  const ab = F.ability;
  if (ab && cs.mp >= abilityCost(ab)) {
    if (cs.mpReadySince < 0) cs.mpReadySince = cs.t;
    let cast = false;
    if (mode === 'live') { cast = cs.castInput; }
    else if (shouldAutoCast(cs, F, e)) cast = !src.castDelay || cs.t - cs.mpReadySince >= src.castDelay;
    if (cast) { castAbility(cs, F, e, rng, emit); cs.mpReadySince = -1; }
  }
  cs.castInput = false;

  // player attacks
  const haste = cs.hasteUntil > cs.t ? ABILITY.helm.haste : 1;
  cs.pT += dt * F.aps * haste;
  while (cs.pT >= 1 && e.hp > 0) {
    cs.pT -= 1;
    let total = 0;
    const crit = rng.next() < 0.08;
    for (let i = 0; i < F.shots; i++) {
      const raw = rng.range(F.dmgMin, F.dmgMax) * F.attMult * (cs.dmgUntil > cs.t ? cs.dmgMult : 1) * (crit ? 1.6 : 1);
      total += Math.max(raw - e.def, raw * CONFIG.minDamageAfterDef);
    }
    if (e.vulnUntil > cs.t) total *= CONFIG.bossStunDamageMult;
    e.hp -= total;
    emit?.('hit', { dmg: Math.round(total), crit, shots: F.shots });
  }
  if (e.dotUntil > cs.t) e.hp -= e.dotDps * dt;

  if (e.hp <= 0) {
    e.hp = 0;
    cs.enemy = null; cs.travel = F.travel;
    src.onKill(e, rng);
    emit?.('kill', { enemy: e });
    return;
  }

  // boss telegraphs
  if (e.boss) {
    if (!e.tele && cs.t >= e.nextTele && e.stunUntil <= cs.t) {
      e.tele = { start: cs.t, until: cs.t + CONFIG.telegraphWindup, auto: mode !== 'live' && rng.next() < CONFIG.closedAppDodgeChance };
      emit?.('telegraph', { until: e.tele.until });
    }
    if (e.tele) {
      const dodged = mode === 'live' ? cs.dodgeInput >= e.tele.start : e.tele.auto && cs.t >= e.tele.start + CONFIG.telegraphWindup / 2;
      if (dodged) {
        e.tele = null; e.stunUntil = cs.t + CONFIG.bossStunSeconds; e.vulnUntil = e.stunUntil;
        e.nextTele = cs.t + rng.range(...CONFIG.telegraphEvery);
        emit?.('dodged', {});
      } else if (cs.t >= e.tele.until) {
        e.tele = null;
        e.nextTele = cs.t + rng.range(...CONFIG.telegraphEvery);
        hitPlayer(cs, F, e, CONFIG.telegraphHitMult, rng, emit, true);
        if (cs.dead) return;
      }
    }
  }

  // enemy attacks
  if (e.stunUntil > cs.t) return;
  const phase = e.boss ? 1 + 0.15 * (e.hp < e.maxHp * 0.66) + 0.15 * (e.hp < e.maxHp * 0.33) : 1;
  cs.eT += dt * e.rate * (e.slowUntil > cs.t ? 0.5 : 1) * phase;
  while (cs.eT >= 1 && !cs.dead) {
    cs.eT -= 1;
    hitPlayer(cs, F, e, 1, rng, emit, false);
  }
}
