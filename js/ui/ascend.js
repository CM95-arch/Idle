// Ascension: beat Vexis, then start again in a harder Realm with permanent multipliers.
import { BAL } from '../data/balance.js';
import { realmName, stageLabel, STAGE_COUNT } from '../data/zones.js';
import * as G from '../core/game.js';
import { h } from './dom.js';
import { monsterImage } from './art/monsters.js';
import { artImg } from './art/core.js';
import { ZONES, MAIN_ZONES, TIERS } from '../data/zones.js';
import { fmt, tap } from './common.js';
import { play } from './sound.js';
import { CAP_PER_ASCENSION } from '../data/stats.js';
import { ACHIEVEMENTS } from '../data/rewards.js';
import { rewardTrack, openAchievements } from './goals.js';

export function createAscendScreen(root, { onAscend }) {
  function oryx(size) {
    const [, spec, pal] = ZONES[MAIN_ZONES - 1].boss; // Vexis
    const out = artImg(monsterImage(spec, pal)); out.className = 'figure'; out.style.cssText = `height:${size}px;width:auto;margin:0 auto;display:block`;
    return out;
  }
  // press and hold to Ascend, so it never happens by accident
  function holdButton(label, fn) {
    const fill = h('i');
    const btn = h('button', { class: 'btn violet block holdbtn', style: { minHeight: '56px', fontSize: '17px' } }, fill, h('span', { style: { position: 'relative' } }, label));
    let t0 = 0, raf = 0;
    const tick = () => { const p = Math.min(1, (performance.now() - t0) / 1400); fill.style.width = `${p * 100}%`; if (p >= 1) { stop(); fn(); } else raf = requestAnimationFrame(tick); };
    const stop = () => { window.cancelAnimationFrame(raf); fill.style.width = '0'; };
    btn.addEventListener('pointerdown', (e) => { e.preventDefault(); t0 = performance.now(); play('tap'); raf = requestAnimationFrame(tick); });
    for (const ev of ['pointerup', 'pointerleave', 'pointercancel']) btn.addEventListener(ev, stop);
    return btn;
  }
  function render() {
    root.classList.remove('fit');
    const s = G.state, P = G.ascendPreview(), ready = G.canAscend();
    const m = s.mult, gain = P.gain;
    const now = [
      ['Glory', `×${m.fame < 1000 ? m.fame.toFixed(2) : fmt(m.fame)}`], ['Damage', `×${m.dmg.toFixed(2)}`],
      ['Offline', `${Math.round(G.offlineEff() * 100)}%`], ['Gear find', `+${Math.round(m.drops * 100)}%`],
    ];
    const next = [
      ['Glory', `×${(1 + gain).toFixed(2)}`, 'more Glory from everything'], ['Damage', `×${(1 + gain * BAL.ascendDmg).toFixed(2)}`, 'more damage for every class'],
      ['Offline', `+${Math.round(gain * 15)}%`, 'better earnings while away'], ['Gear find', `+${Math.round(gain * 30)}%`, 'gear drops more often'],
      ['Level cap', `${G.levelCap()} → ${G.levelCapFor(s.ascensions + 1)}`, 'the highest level a hero can reach'],
    ];
    root.replaceChildren(
      h('div', { class: 'h1' }, 'Ascend'),
      h('div', { class: 'asc-hero' },
        oryx(170),
        h('h2', {}, ready ? 'Vexis has fallen' : 'Defeat Vexis'),
        h('div', { class: 'muted', style: { fontWeight: 700, fontSize: '13px' } }, ready
          ? `${realmName(P.realm)} awaits: stronger foes, ${BAL.realmFame}× the Glory.`
          : `Best ${s.best >= 0 ? stageLabel(s.best) : '—'} · Vexis waits at ${stageLabel(STAGE_COUNT - 1)}`),
        h('div', { class: 'pbar', style: { marginTop: '12px', height: '8px' } }, h('i', { style: { width: `${((s.best + 1) / STAGE_COUNT) * 100}%`, background: 'linear-gradient(90deg,#9b6bff,#ffd34d)' } })),
        h('div', { class: 'gainlist' }, next.map(([k, v]) => h('div', { class: 'gain' }, h('small', {}, k), h('b', {}, v))))),
      h('div', { class: 'h2' }, 'Your permanent bonuses'),
      h('div', { class: 'panel stats' }, now.map(([k, v]) => h('div', { class: 'stat' }, h('span', {}, k), h('b', {}, v))),
        h('div', { class: 'stat' }, h('span', {}, 'Level cap'), h('b', {}, `${G.levelCap()}`)),
        h('div', { class: 'stat' }, h('span', {}, 'Ascensions'), h('b', {}, `${s.ascensions}`)), h('div', { class: 'stat' }, h('span', {}, 'Realm'), h('b', {}, realmName(s.realm)))),
      h('button', { class: 'btn alt block', style: { marginTop: '8px' }, onclick: openAchievements }, `🏆 Achievements · ${ACHIEVEMENTS.filter((A) => s.ach?.[A.id]).length}/${ACHIEVEMENTS.length}`),
      h('div', { class: 'h2' }, 'Realm rewards'),
      rewardTrack(),
      h('div', { class: 'keeps' },
        h('div', { class: 'panel' }, h('b', { class: 'gold' }, '✓ Kept'), ...['Classes and bonuses', 'Gear (upgrades reset)', `Dungeons · tier ${G.dungeonTier()}/${TIERS}`, `${Math.round(BAL.keepPotions * 100)}% of potions · caps +${CAP_PER_ASCENSION}`].map((t) => h('div', {}, t))),
        h('div', { class: 'panel' }, h('b', { class: 'dim' }, '↺ Reset'), ...['Stages and Glory', 'Levels, back to 1', 'Most potions'].map((t) => h('div', {}, t)))),
      h('div', { style: { marginTop: '14px' } }, ready ? holdButton(`Hold to Ascend to ${realmName(P.realm)}`, () => { play('ascend'); G.ascend(); onAscend?.(P); render(); }) : h('button', { class: 'btn violet block', disabled: true }, '🔒 Defeat Vexis first')));
    void tap;
  }
  return { render, frame() {} };
}
