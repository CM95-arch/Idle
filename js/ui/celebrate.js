// Full-screen moments: the welcome, offline rewards, a new class, an Ascension. Shown one at a time.
import { CLASSES, ROLES } from '../data/classes.js';
import { realmName } from '../data/zones.js';
import { h, $, fmtDur } from './dom.js';
import { portrait, fmt, itemTile } from './common.js';
import { chibiImage } from './art/chibi.js';
import { artImg } from './art/core.js';
import { play } from './sound.js';
import { abilityText } from './party.js';
import { UNIQUES, UNIQUE } from '../data/uniques.js';
import { ZONE_BY_ID } from '../data/zones.js';
import * as G from '../core/game.js';

const queue = [];
let showing = false;
function enqueue(build) { queue.push(build); if (!showing) next(); }
function next() {
  const build = queue.shift();
  if (!build) { showing = false; return; }
  showing = true;
  const ov = h('div', { class: 'overlay', style: { zIndex: 5000 } });
  const close = () => { ov.style.transition = 'opacity .2s'; ov.style.opacity = '0'; setTimeout(() => { ov.remove(); next(); }, 200); };
  ov.append(build(close));
  $('#overlay-root').append(ov);
}

function countUp(el, to, ms = 1100) {
  const t0 = performance.now();
  const step = (t) => {
    const p = Math.min(1, (t - t0) / ms), e = 1 - (1 - p) ** 3;
    el.textContent = fmt(to * e);
    if (p < 1) { if (Math.random() < 0.5) play('coinCount'); requestAnimationFrame(step); } else el.textContent = fmt(to);
  };
  requestAnimationFrame(step);
}

export function showWelcome(onStart) {
  enqueue((close) => {
    const cv = artImg(chibiImage('wizard')); cv.className = 'figure'; cv.style.height = '170px';
    return h('div', { class: 'celebrate violet' }, h('div', { class: 'rays' }),
      h('div', { class: 'kicker', style: { color: '#d6c2ff' } }, 'Realm Idle'),
      h('div', { class: 'por' }, cv),
      h('div', { class: 'big', style: { fontSize: '30px', color: '#fff' } }, 'Oryx has seized the Realm'),
      h('div', { class: 'muted', style: { fontWeight: 700 } }, 'A lone Wizard steps onto the Beaches. Fight, grow, find allies, and climb toward the Mad God. Your heroes keep fighting even while you’re away.'),
      h('button', { class: 'btn violet block', onclick: () => { play('unlock'); close(); onStart?.(); } }, 'Begin'));
  });
}

export function showOffline(r, onCollect) {
  enqueue((close) => {
    const num = h('div', { class: 'big tnum' }, '0');
    setTimeout(() => countUp(num, r.fame), 250);
    const shown = r.drops.slice().sort((a, b) => b.rarity - a.rarity).slice(0, 15);
    return h('div', { class: 'celebrate' }, h('div', { class: 'rays' }),
      h('div', { class: 'kicker' }, 'Welcome back'),
      h('div', { class: 'muted', style: { fontWeight: 800 } }, `Your party fought for ${fmtDur(r.away * 1000)}${r.capped ? ' (the most it can bank)' : ''}`),
      h('div', { class: 'row', style: { justifyContent: 'center', gap: '10px' } }, h('i', { class: 'mini-coin', style: { width: '30px', height: '30px' } }), num),
      h('div', { class: 'statline' }, h('span', {}, h('b', {}, fmt(r.clears)), ' stages cleared'), h('span', {}, h('b', {}, r.drops.length), ` Unique${r.drops.length === 1 ? '' : 's'} found`)),
      shown.length ? h('div', { class: 'lootrow' }, shown.map((it, i) => { const t = itemTile(it, { upFor: false, size: 28 }); t.style.animationDelay = `${0.4 + i * 0.06}s`; return t; }), r.drops.length > shown.length ? h('div', { class: 'itile empty', style: { width: '46px' } }, `+${r.drops.length - shown.length}`) : null) : null,
      h('button', { class: 'btn block', onclick: () => { play('clear'); close(); onCollect?.(); } }, 'Collect'));
  });
}

export function showUnlock(cls, joined, onSee) {
  enqueue((close) => {
    const C = CLASSES[cls];
    const big = portrait(cls, 150);
    play('unlock');
    return h('div', { class: 'celebrate' }, h('div', { class: 'rays' }),
      h('div', { class: 'kicker' }, 'New class unlocked'),
      h('div', { class: 'por' }, big),
      h('div', { class: 'big', style: { fontSize: '36px' } }, C.name),
      h('div', { class: 'muted', style: { fontWeight: 800 } }, `${ROLES[C.role]} · ${C.blurb}`),
      h('div', { class: 'panel', style: { textAlign: 'left' } }, h('b', {}, `✦ ${C.ability.name}`), h('div', { class: 'muted', style: { fontSize: '13px' } }, abilityText(cls))),
      h('div', { class: 'gold', style: { fontWeight: 900 } }, joined ? `${C.name} joined your party!` : 'Swap them in from the Party screen.'),
      h('div', { class: 'row' }, h('button', { class: 'btn alt grow', onclick: () => { close(); onSee?.(cls); } }, 'View'), h('button', { class: 'btn grow', onclick: close }, 'Onward!')));
  });
}

export function showAscended(P) {
  enqueue((close) => h('div', { class: 'celebrate violet' }, h('div', { class: 'rays' }),
    h('div', { class: 'kicker', style: { color: '#d6c2ff' } }, `Ascension ${P.n}`),
    h('div', { class: 'big', style: { color: '#efe4ff', textShadow: '0 0 24px rgba(155,107,255,.8), 0 3px 0 #3f1f8a' } }, realmName(P.realm)),
    h('div', { class: 'muted', style: { fontWeight: 700 } }, 'The Realm reforms, harder than before. You return stronger, for good.'),
    h('div', { class: 'gainlist' },
      h('div', { class: 'gain' }, h('small', {}, 'Fame'), h('b', {}, `×${(1 + P.gain).toFixed(2)}`)),
      h('div', { class: 'gain' }, h('small', {}, 'Damage'), h('b', {}, `×${(1 + P.gain * 0.3).toFixed(2)}`)),
      h('div', { class: 'gain' }, h('small', {}, 'Offline'), h('b', {}, `+${Math.round(P.gain * 15)}%`)),
      h('div', { class: 'gain' }, h('small', {}, 'Unique find'), h('b', {}, `+${Math.round(P.gain * 30)}%`))),
    h('button', { class: 'btn violet block', onclick: close }, 'Begin anew')));
}

/** The white bag: a Unique dropped. */
export function showUnique(it, onSee, dupe = null) {
  enqueue((close) => {
    const U = UNIQUE[it.u], n = Object.keys(G.state.uniques).length, ex = !!U.exalted;
    const icon = itemTile(it, { upFor: false, size: 96 }); icon.classList.add('hero-item');
    play(ex ? 'exalted' : 'unique');
    return h('div', { class: `celebrate unique${ex ? ' exalted' : ''}` }, h('div', { class: 'rays' }),
      h('div', { class: 'kicker', style: { color: ex ? '#ffe08a' : '#ffffff' } }, `${ex ? 'Exalted unique' : 'Unique'}${dupe ? ' · found again' : ' found!'}`),
      h('div', { class: 'por' }, icon),
      h('div', { class: 'big', style: { fontSize: '30px', color: ex ? '#fff3c0' : '#ffffff', textShadow: ex ? '0 0 28px rgba(255,210,90,.9), 0 3px 0 #5a3a0a' : '0 0 24px rgba(111,242,255,.8), 0 3px 0 #2a3050' } }, U.name),
      h('div', { class: 'muted', style: { fontWeight: 800, fontSize: '13px' } }, `Dropped by ${ZONE_BY_ID[U.src]?.boss[0] || 'a boss'}`),
      h('div', { class: 'panel', style: { textAlign: 'left' } }, h('b', { style: { color: '#6ff2ff' } }, '✦ Unique effect'), h('div', { style: { fontSize: '14px', fontWeight: 700, marginTop: '2px' } }, U.desc)),
      dupe ? h('div', { class: 'gold', style: { fontWeight: 900 } }, dupe.ups ? `Melted into your copy: +${dupe.ups} upgrade${dupe.ups === 1 ? '' : 's'} (now +${it.up})` : '', dupe.fame ? `${dupe.ups ? ' and ' : 'Your copy is maxed: '}+${fmt(dupe.fame)} Fame` : '') : null,
      h('div', { class: 'dim', style: { fontSize: '12px', fontWeight: 800 } }, `Collection ${n} / ${UNIQUES.length} · Bonuses are percentages, so Uniques grow with your heroes. Kept when you Ascend.`),
      h('div', { class: 'row' }, h('button', { class: 'btn alt grow', onclick: () => { close(); onSee?.(it); } }, 'View'), h('button', { class: 'btn grow', onclick: close }, 'Excellent')));
  });
}
