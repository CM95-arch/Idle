// Ascension: beat Oryx, then start again in a harder Realm with permanent multipliers.
import { BAL } from '../data/balance.js';
import { CLASSES } from '../data/classes.js';
import { realmName, stageLabel, STAGE_COUNT } from '../data/zones.js';
import * as G from '../core/game.js';
import { h } from './dom.js';
import { monsterImage } from './art/monsters.js';
import { ZONES } from '../data/zones.js';
import { fmt, tap } from './common.js';
import { play } from './sound.js';

export function createAscendScreen(root, { onAscend }) {
  function oryx(size) {
    const [, spec, pal] = ZONES[ZONES.length - 1].boss;
    const out = monsterImage(spec, pal).cloneNode(); out.className = 'figure'; out.style.cssText = `height:${size}px;width:auto;margin:0 auto;display:block`;
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
      ['Fame', `×${m.fame < 1000 ? m.fame.toFixed(2) : fmt(m.fame)}`], ['Damage', `×${m.dmg.toFixed(2)}`],
      ['Offline', `${Math.round(G.offlineEff() * 100)}%`], ['Drop quality', `+${Math.round(m.drops * 100)}%`],
    ];
    const next = [
      ['Fame', `×${(1 + gain).toFixed(2)}`, 'more Fame from everything'], ['Damage', `×${(1 + gain * BAL.ascendDmg).toFixed(2)}`, 'more damage for every class'],
      ['Offline', `+${Math.round(gain * 15)}%`, 'better earnings while away'], ['Drop quality', `+${Math.round(gain * 30)}%`, 'rarer gear drops'],
    ];
    root.replaceChildren(
      h('div', { class: 'h1' }, 'Ascend'),
      h('div', { class: 'asc-hero' },
        oryx(170),
        h('h2', {}, ready ? 'Oryx has fallen' : 'Defeat Oryx'),
        h('div', { class: 'muted', style: { fontWeight: 700, fontSize: '13px' } }, ready
          ? `Ascend to ${realmName(P.realm)}: a harder Realm that pays ${BAL.realmFame}× the Fame, with permanent bonuses that stack forever.`
          : `Reach and defeat Oryx the Mad God at the end of the Realm (stage ${stageLabel(STAGE_COUNT - 1)}) to Ascend. Best so far: ${s.best >= 0 ? stageLabel(s.best) : '—'}.`),
        h('div', { class: 'pbar', style: { marginTop: '12px', height: '8px' } }, h('i', { style: { width: `${((s.best + 1) / STAGE_COUNT) * 100}%`, background: 'linear-gradient(90deg,#9b6bff,#ffd34d)' } })),
        h('div', { class: 'gainlist' }, next.map(([k, v, d]) => h('div', { class: 'gain' }, h('small', {}, `Ascension ${P.n}: ${k}`), h('b', {}, v), h('small', {}, d))))),
      h('div', { class: 'h2' }, 'Your permanent bonuses'),
      h('div', { class: 'panel stats' }, now.map(([k, v]) => h('div', { class: 'stat' }, h('span', {}, k), h('b', {}, v))),
        h('div', { class: 'stat' }, h('span', {}, 'Ascensions'), h('b', {}, `${s.ascensions}`)), h('div', { class: 'stat' }, h('span', {}, 'Realm'), h('b', {}, realmName(s.realm)))),
      h('div', { class: 'h2' }, 'What Ascending resets'),
      h('div', { class: 'panel', style: { fontSize: '13px', fontWeight: 700, lineHeight: 1.5 } },
        h('div', {}, '↺ Stage progress, Fame and all gear'),
        h('div', {}, `↺ Class levels drop to a quarter (at least ${BAL.realmStartLevel(P.realm)}): `, h('span', { class: 'muted' }, Object.entries(P.levels).map(([c, lv]) => `${CLASSES[c].name} ${s.classes[c].lv}→${lv}`).join(', '))),
        h('div', { class: 'gold' }, '✓ Every class you’ve unlocked, and all bonuses above')),
      h('div', { style: { marginTop: '14px' } }, ready ? holdButton(`Hold to Ascend to ${realmName(P.realm)}`, () => { play('ascend'); G.ascend(); onAscend?.(P); render(); }) : h('button', { class: 'btn violet block', disabled: true }, '🔒 Defeat Oryx first')));
    void tap;
  }
  return { render, frame() {} };
}
