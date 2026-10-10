// The one combat engine. Farming, dungeons, offline catch-up and survival estimates all step it the same way.
// It works in fixed ticks (CONFIG.tickSeconds), so a fight plays out identically whether you watch it or not.
import { CONFIG } from '../config.js';

const ABILITY = {
  spell:   { dmg: 2.4 },
  scepter: { dmg: 1.6, costMult: 0.7 },
  skull:   { dmg: 1.3, lifesteal: 0.3 },
  poison:  { dot: 4.0, dotSec: 4 },
  quiver:  { dmg: 3.2, stun: 1.5 },
  shield:  { dmg: 3.2, stun: 3 },
  trap:    { dmg: 1.8, slow: 5 },
  tome:    { healPct: 0.22, dmgBuff: 1.25, buffSec: 5, healer: true },
  seal:    { healPct: 0.25, dmgBuff: 1.3, buffSec: 5, healer: true },
  helm:    { haste: 1.15, buffSec: 5 },
  cloak:   { invis: 4, healer: true },
};
export const abilityCost = (ab) => Math.round(ab.cost * (ABILITY[ab.type]?.costMult || 1));

export function newCombat(F) {
  return { t: 0, hp: F.maxHp, mp: F.maxMp, enemy: null, pT: 0, eT: 0, travel: 0.5, dead: false, tapShots: 0,
    hasteUntil: 0, dmgUntil: 0, dmgMult: 1, invisUntil: 0, castInput: false, dodgeInput: -1, mpReadySince: -1,
    fightStart: 0, fightHits: 0, attacks: 0, critReady: false, killHasteUntil: 0, shieldUntil: 0, cheatReadyAt: 0 };
}

/** Make a live enemy from a template { name, sprite, pal, hp, dmg, def, rate, xp, elite, boss } */
export function spawnEnemy(tpl) {
  return { ...tpl, maxHp: tpl.hp, stunUntil: 0, slowUntil: 0, vulnUntil: 0, dotDps: 0, dotUntil: 0, tele: null, nextTele: 0 };
}

function shouldAutoCast(cs, F, e) {
  const ab = F.ability; if (!ab) return false;
  const A = ABILITY[ab.type];
  const hpFrac = cs.hp / F.maxHp, eFrac = e.hp / e.maxHp;
  if (ab.type === 'tome') return hpFrac < 0.7 || eFrac > 0.6;
  if (ab.type === 'cloak') return hpFrac < 0.5 || (e.tele && cs.invisUntil < cs.t);
  if (ab.type === 'seal') return hpFrac < 0.7 || eFrac > 0.5;
  if (A.haste) return eFrac > 0.5;
  return eFrac > 0.35;
}

function castAbility(cs, F, e, rng, emit) {
  const ab = F.ability, fx = F.fx || {};
  cs.mp -= abilityCost(ab);
  if (fx.abilityHpCost) cs.hp = Math.max(1, cs.hp - F.maxHp * fx.abilityHpCost);
  const times = fx.echo && rng.next() < fx.echo ? 2 : 1;
  for (let i = 0; i < times; i++) abilityEffect(cs, F, e, emit, i > 0);
  if (fx.abilityMp) cs.mp = Math.min(F.maxMp, cs.mp + F.maxMp * fx.abilityMp);
}
function abilityEffect(cs, F, e, emit, echo) {
  const ab = F.ability, A = ABILITY[ab.type], fx = F.fx || {};
  const P = ab.power;
  const buff = fx.buffDur || 1;
  let dealt = 0;
  if (A.dmg) {
    const raw = P * A.dmg * F.attMult * (cs.dmgUntil > cs.t ? cs.dmgMult : 1);
    dealt = Math.max(raw - e.def, raw * CONFIG.minDamageAfterDef) * (e.vulnUntil > cs.t ? CONFIG.bossStunDamageMult : 1);
    e.hp -= dealt;
  }
  if (A.dot) { e.dotDps = (P * A.dot) / A.dotSec; e.dotUntil = cs.t + A.dotSec; }
  if (fx.abilityDot && dealt) { e.dotDps = Math.max(e.dotDps, (dealt * fx.abilityDot) / 4); e.dotUntil = cs.t + 4; }
  const stun = (A.stun || 0) + (fx.abilityStun || 0);
  if (stun) e.stunUntil = Math.max(e.stunUntil, cs.t + stun * (e.boss ? 0.5 : 1));
  if (A.slow || fx.abilitySlow) e.slowUntil = cs.t + (A.slow || 0) + (fx.abilitySlow || 0);
  let healed = A.healPct ? F.maxHp * A.healPct * (1 + (P / 70 - 1) * 0.03) * (1 + (fx.abilityPower || 0) * 0.5) : 0; // max-HP based, tier adds a little
  if (fx.abilityHeal) healed += F.maxHp * fx.abilityHeal;
  if (healed) cs.hp = Math.min(F.maxHp, cs.hp + healed);
  if (healed && fx.abilityShield) cs.shieldUntil = cs.t + fx.abilityShield;
  if (A.lifesteal) cs.hp = Math.min(F.maxHp, cs.hp + dealt * A.lifesteal);
  if (A.dmgBuff) { cs.dmgMult = A.dmgBuff; cs.dmgUntil = cs.t + A.buffSec * buff; }
  if (A.haste) cs.hasteUntil = cs.t + A.buffSec * buff;
  if (A.invis) cs.invisUntil = cs.t + A.invis * buff;
  emit?.('ability', { type: ab.type, dmg: Math.round(dealt), heal: Math.round(healed), echo });
}

function hitPlayer(cs, F, e, mult, rng, emit, big) {
  const fx = F.fx || {};
  if (cs.invisUntil > cs.t) { emit?.('miss', { big }); return; }
  if (!big && rng.next() < F.dodge) {
    if (fx.dodgeHeal) cs.hp = Math.min(F.maxHp, cs.hp + F.maxHp * fx.dodgeHeal);
    if (fx.critAfterDodge) cs.critReady = true;
    emit?.('dodge', {}); return;
  }
  const raw = e.dmg * mult * rng.range(0.85, 1.15);
  let d = Math.max(raw - F.def, raw * CONFIG.minDamageAfterDef);
  d *= (1 + (fx.dmgTaken || 0)) * (1 - (fx.dr || 0));
  if (fx.lowHpDR && cs.hp < F.maxHp * 0.4) d *= 1 - fx.lowHpDR;
  if (cs.shieldUntil > cs.t) d *= 0.5;
  cs.hp -= d;
  if (fx.reflect) e.hp -= d * fx.reflect;
  emit?.('hurt', { dmg: Math.round(d), big });
  if (cs.hp <= 0) {
    if (fx.cheatDeath && cs.t >= (cs.cheatReadyAt || 0)) { cs.hp = 1; cs.cheatReadyAt = cs.t + fx.cheatDeath; emit?.('cheat', {}); return; }
    cs.hp = 0; cs.dead = true; emit?.('death', {});
  }
}

/** One player attack (all shots). Returns damage dealt. */
function attack(cs, F, e, rng, scale, emit, tap) {
  const fx = F.fx || {};
  cs.attacks = (cs.attacks || 0) + 1; cs.fightHits = (cs.fightHits || 0) + 1;
  let mult = scale * (cs.dmgUntil > cs.t ? cs.dmgMult : 1) * (1 + (fx.dmg || 0));
  if ((e.elite || e.boss) && fx.eliteDmg) mult *= 1 + fx.eliteDmg;
  if (fx.execute && e.hp < e.maxHp * 0.3) mult *= 1 + fx.execute;
  if (fx.openerHits && cs.fightHits <= fx.openerHits) mult *= fx.openerMult;
  if (fx.ramp) mult *= 1 + Math.min(fx.rampCap, fx.ramp * (cs.t - (cs.fightStart || cs.t)));
  if (fx.lowHpDmg && cs.hp < F.maxHp * 0.4) mult *= 1 + fx.lowHpDmg;
  if (fx.burstEvery && cs.attacks % fx.burstEvery === 0) mult *= fx.burstMult;
  const crit = cs.critReady || rng.next() < 0.08 + (fx.critChance || 0);
  cs.critReady = false;
  if (crit) mult *= 1.6 + (fx.critMult || 0);
  const def = fx.ignoreDef ? 0 : e.def;
  let total = 0, shots = F.shots;
  if (fx.doubleChance) for (let i = 0; i < F.shots; i++) if (rng.next() < fx.doubleChance) shots++;
  for (let i = 0; i < shots; i++) {
    const raw = rng.range(F.dmgMin, F.dmgMax) * F.attMult * mult;
    total += Math.max(raw - def, raw * CONFIG.minDamageAfterDef);
  }
  if (e.vulnUntil > cs.t) total *= CONFIG.bossStunDamageMult;
  e.hp -= total;
  if (fx.lifesteal) cs.hp = Math.min(F.maxHp, cs.hp + total * fx.lifesteal);
  const poison = (fx.poisonOnHit || 0) + (crit ? fx.critPoison || 0 : 0);
  if (poison) e.poison = (e.poison || 0) + total * poison; // stacking poison pool, drains over ~3s
  if (fx.slowOnHit && rng.next() < fx.slowOnHit) e.slowUntil = cs.t + 2;
  if (fx.mpOnHit) cs.mp = Math.min(F.maxMp, cs.mp + fx.mpOnHit);
  emit?.('hit', { dmg: Math.round(total), crit, shots: Math.min(shots, 4), tap });
  return total;
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
  const regen = cs.enemy ? 1 : CONFIG.outOfCombatRegenMult;
  const walkHeal = cs.enemy ? 0 : F.maxHp * (src.walkHealPct ?? CONFIG.walkHealPct);
  cs.hp = Math.min(F.maxHp, cs.hp + (F.hpRegen * regen + walkHeal) * dt);
  cs.mp = Math.min(F.maxMp, cs.mp + F.mpRegen * regen * dt);
  if (cs.enemy && F.fx?.regenPct) cs.hp = Math.min(F.maxHp, cs.hp + F.maxHp * F.fx.regenPct * dt);

  let e = cs.enemy;
  if (!e) {
    cs.travel -= dt;
    if (cs.travel > 0) return;
    const tpl = src.next(rng);
    if (!tpl) return;
    e = cs.enemy = spawnEnemy(tpl);
    if (e.boss) e.nextTele = cs.t + rng.range(...CONFIG.telegraphEvery) * 0.6;
    cs.pT = 0; cs.eT = rng.next() * 0.5; cs.fightStart = cs.t; cs.fightHits = 0;
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
  const haste = (cs.hasteUntil > cs.t ? ABILITY.helm.haste : 1) * (cs.killHasteUntil > cs.t ? 1.3 : 1);
  // frac = where inside this tick each attack lands, so the view can play them at a steady rhythm
  const pRate = dt * F.aps * haste, pStart = cs.pT;
  cs.pT += pRate;
  for (let k = 1; cs.pT >= 1 && e.hp > 0; k++) {
    cs.pT -= 1;
    const frac = Math.min(0.99, Math.max(0, (k - pStart) / pRate));
    attack(cs, F, e, rng, 1, emit && ((kind, d) => emit(kind, { ...d, frac })), false);
  }
  if (cs.tapShots > 0 && e.hp > 0) { cs.tapShots--; attack(cs, F, e, rng, CONFIG.tapDamage, emit, true); }
  if (e.dotUntil > cs.t) e.hp -= e.dotDps * dt;
  if (e.poison > 0) { const p = e.poison * (dt / 3); e.poison -= p; e.hp -= p; }

  if (e.hp <= 0) {
    e.hp = 0;
    cs.enemy = null; cs.travel = F.travel;
    const fx = F.fx || {};
    if (fx.killHeal) cs.hp = Math.min(F.maxHp, cs.hp + F.maxHp * fx.killHeal);
    if (fx.killMp) cs.mp = Math.min(F.maxMp, cs.mp + F.maxMp * fx.killMp);
    if (fx.killHaste) cs.killHasteUntil = cs.t + fx.killHaste;
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
  const eRate = dt * e.rate * (e.slowUntil > cs.t ? 0.5 : 1) * phase, eStart = cs.eT;
  cs.eT += eRate;
  for (let k = 1; cs.eT >= 1 && !cs.dead; k++) {
    const frac = Math.min(0.99, Math.max(0, (k - eStart) / eRate));
    const emitE = emit && ((kind, d) => emit(kind, { ...d, frac }));
    cs.eT -= 1;
    hitPlayer(cs, F, e, 1, rng, emitE, false);
  }
}
