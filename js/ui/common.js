// Small shared UI pieces: portraits, item tiles, cost buttons, number formatting.
import { CLASSES } from '../data/classes.js';
import { BAL } from '../data/balance.js';
import { h } from './dom.js';
import { heroIcon, itemIcon } from './sprites.js';
import { fmt } from './battleView.js';
import * as G from '../core/game.js';
import { play } from './sound.js';

export { fmt };
export const portrait = (cls, size = 40, locked = false) => heroIcon(CLASSES[cls].look, CLASSES[cls].colors, size, locked);
export const rcolor = (r) => BAL.rarities[r].color;

export function coin(n) { return h('span', { class: 'cost' }, h('i', { class: 'mini-coin' }), fmt(n)); }

/** An item tile. opts: { onclick, upFor: show ▲ if it's an upgrade for anyone in the party } */
export function itemTile(it, opts = {}) {
  if (!it) return h('button', { class: 'itile empty', onclick: opts.onclick }, opts.label || '');
  const up = opts.upFor !== false && G.state.party.some((c) => G.isUpgradeFor(c, it));
  return h('button', { class: `itile r${it.rarity}`, style: { '--rc': rcolor(it.rarity) }, onclick: opts.onclick, 'aria-label': it.name },
    itemIcon(it, opts.size || 34),
    up ? h('span', { class: 'up' }, '▲') : null,
    it.up ? h('span', { class: 'plus' }, `+${it.up}`) : null,
    h('span', { class: 'lvl' }, `${it.ilvl + 1}`));
}

/** Tap feedback: sound + a tiny vibration where the device supports it. */
export function tap(kind = 'tap') { play(kind); try { navigator.vibrate?.(8); } catch { /* not supported */ } }
