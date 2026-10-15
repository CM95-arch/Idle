// Small shared UI pieces: portraits, item tiles, cost buttons, number formatting.
import { CLASSES } from '../data/classes.js';
import { BAL } from '../data/balance.js';
import { h } from './dom.js';
import { heroImage } from './art/heroes.js';
import { itemImage } from './art/items.js';
import { uniqueOf } from '../core/items.js';
import { artImg } from './art/core.js';
import { fmt } from './battleView.js';
import * as G from '../core/game.js';
import { play } from './sound.js';

export { fmt };
/** A class's full-figure portrait (front view), `size` px tall. */
export function portrait(cls, size = 64, locked = false) {
  const img = artImg(heroImage(cls, false));
  img.className = `figure${locked ? ' locked' : ''}`; img.alt = locked ? 'Locked class' : CLASSES[cls].name;
  img.style.height = `${size}px`; img.style.width = 'auto';
  return img;
}
/** A gear icon, `size` px square. */
export function itemIcon(it, size = 34) {
  const img = artImg(itemImage(it.kind, it.rarity, uniqueOf(it)?.pal));
  img.className = 'figure'; img.alt = ''; img.style.width = img.style.height = `${size}px`;
  return img;
}
export const rcolor = (r) => BAL.rarities[r].color;

export function coin(n) { return h('span', { class: 'cost' }, h('i', { class: 'mini-coin' }), fmt(n)); }

/** An item tile. opts: { onclick, upFor: show ▲ if it's an upgrade for anyone in the party } */
export function itemTile(it, opts = {}) {
  if (!it) return h('button', { class: 'itile empty', onclick: opts.onclick }, opts.label || '');
  const up = opts.upFor !== false && G.state.party.some((c) => G.isUpgradeFor(c, it));
  // who can wear it: a class in the party first, then any class you own
  const who = opts.who === false ? null : G.wearers(it).sort((a, b) => (G.state.party.includes(b) - G.state.party.includes(a)) || (!!G.state.classes[b] - !!G.state.classes[a]))[0];
  const usable = who && G.state.classes[who];
  return h('button', { class: `itile r${it.rarity}${uniqueOf(it)?.exalted ? ' ex' : ''}${usable || opts.who === false ? '' : ' unusable'}`, style: { '--rc': rcolor(it.rarity) }, onclick: opts.onclick, 'aria-label': `${it.name}${who ? `, for ${CLASSES[who].name}` : ''}` },
    itemIcon(it, opts.size || 40),
    who && it.kind !== 'ring' ? h('span', { class: 'who' }, portrait(who, 20, !usable)) : null,
    up ? h('span', { class: 'up' }, '▲') : null,
    it.up ? h('span', { class: 'plus' }, `+${it.up}`) : null);
}

/** Tap feedback: sound + a tiny vibration where the device supports it. */
export function tap(kind = 'tap') { play(kind); try { navigator.vibrate?.(8); } catch { /* not supported */ } }

// Hold a button to repeat its action, faster the longer you hold. (A button that turns disabled mid-hold, out of
// Fame, never hears the finger lift, so the release is watched on the whole page, and the hold also ends the
// moment the button is disabled or gone.) Not for buttons inside scrolling sheets: a scroll would press them.
export function holdable(btn, fn) {
  let t = null, delay = 0;
  const stop = () => {
    window.clearTimeout(t); t = null;
    for (const ev of ['pointerup', 'pointercancel', 'touchend', 'touchcancel']) window.removeEventListener(ev, stop, true);
  };
  const go = () => { t = setTimeout(() => { if (btn.disabled || !btn.isConnected) return stop(); fn(); delay = Math.max(60, delay * 0.8); go(); }, delay); };
  btn.addEventListener('pointerdown', (e) => {
    e.preventDefault(); stop(); fn(); delay = 380;
    for (const ev of ['pointerup', 'pointercancel', 'touchend', 'touchcancel']) window.addEventListener(ev, stop, true);
    go();
  });
  btn.addEventListener('pointerleave', stop);
}
