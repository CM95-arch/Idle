// Stat potions: the eight stats, raised one potion at a time toward each class's max (all eight: Perfected).
import { STATS, STAT_INFO, statValue } from '../data/stats.js';
import * as G from '../core/game.js';
import { h, toast } from './dom.js';
import { coin, tap } from './common.js';
import { CLASSES } from '../data/classes.js';

const MODES = [1, 10, 'Max'];
let mode = 0;

/** Eight small bars in the potion colors: how far each stat is toward its max. */
export function statPips(cls) {
  const el = h('div', { class: 'pips' });
  for (const s of STATS) {
    const p = G.potions(cls, s) / G.potCap(cls, s);
    el.append(h('i', { class: p >= 1 ? 'max' : '', style: { '--c': STAT_INFO[s].color, '--p': `${Math.round(p * 100)}%` } }));
  }
  return el;
}

/** The class sheet's stat panel. */
export function statPanel(cls, rerender, onChange) {
  const n8 = G.maxedCount(cls);
  const cell = (s) => {
    const I = STAT_INFO[s], k = G.potions(cls, s), K = G.potCap(cls, s), maxed = k >= K;
    const m = MODES[mode], want = m === 'Max' ? Infinity : m;
    const buy = G.affordablePotions(cls, s, want), n = Math.max(1, buy.n);
    const cost = buy.n ? buy.cost : G.potionCost(cls, s);
    return h('button', {
      class: `pot${maxed ? ' maxed' : ''}`, style: { '--c': I.color, '--p': `${(k / K) * 100}%` },
      disabled: maxed || G.state.fame < G.potionCost(cls, s), 'aria-label': `${I.name} potion`,
      onclick: () => {
        const got = G.drink(cls, s, n);
        if (!got) return;
        tap('upgrade');
        if (G.statMaxed(cls, s)) toast({ title: `${I.name} maxed!`, body: G.maxedCount(cls) === 8 ? `${CLASSES[cls].name} is Perfected: all eight stats maxed!` : `${CLASSES[cls].name} is ${G.maxedCount(cls)}/8.`, kind: 'gold' });
        rerender(); onChange?.();
      },
    },
    h('span', { class: 'flask' }),
    h('span', { class: 'nm' }, h('b', {}, I.abbr), h('small', {}, I.does)),
    h('span', { class: 'val tnum' }, maxed ? 'MAX' : `${statValue(cls, s, k)}`, h('small', {}, `/${statValue(cls, s, K)}`)),
    maxed ? h('span', { class: 'c' }, '★') : h('span', { class: 'c' }, n > 1 ? `×${n} ` : '', coin(cost)),
    h('i', { class: 'bar' }));
  };
  return h('div', { class: 'panel potpanel' },
    h('div', { class: 'row between' },
      h('b', {}, 'Stats ', h('span', { class: `eight${n8 === 8 ? ' full' : ''}` }, `${n8}/8`)),
      h('button', { class: 'chip on', onclick: () => { mode = (mode + 1) % MODES.length; tap(); rerender(); } }, `Drink ×${MODES[mode]}`)),
    h('div', { class: 'pots' }, STATS.map(cell)),
    );
}
