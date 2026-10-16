// The formation: a small battlefield with the party's three spots. Tap a hero, then a spot, to move them there.
import { CLASSES, ROLES } from '../data/classes.js';
import * as G from '../core/game.js';
import { h, openSheet } from './dom.js';
import { portrait, tap } from './common.js';

/** The editor. `onChange` runs after a move; `openClass` opens a hero's sheet (tap a picked hero again). */
export function formationEditor({ onChange, openClass, compact = false } = {}) {
  let picked = null;
  const root = h('div', { class: `formation${compact ? ' compact' : ''}` });
  function render() {
    const s = G.state;
    for (const c of s.party) G.formSlot(c);
    const form = s.form;
    const spot = (k) => {
      const c = form[k], C = c && CLASSES[c];
      const cls = `fspot s${k}${c ? '' : ' empty'}${picked && picked === c ? ' picked' : ''}${picked && picked !== c ? ' target' : ''}`;
      return h('button', {
        class: cls, 'aria-label': `${G.FORM_SLOTS[k]} spot${c ? `: ${C.name}` : ''}`,
        onclick: () => {
          if (picked && picked !== c) { G.moveTo(picked, k); picked = null; tap('equip'); onChange?.(); }
          else if (picked && picked === c) { picked = null; if (openClass) openClass(c); }
          else if (c) { picked = c; tap(); }
          render();
        },
      },
      h('span', { class: 'flabel' }, G.FORM_SLOTS[k]),
      c ? [h('div', { class: 'fpor' }, portrait(c, compact ? 58 : 72)), h('b', {}, C.name), h('small', {}, `${ROLES[C.role]} · Lv ${s.classes[c].lv}`)]
        : h('small', { class: 'dim' }, picked ? 'Move here' : 'Empty'));
    };
    const tank = s.party.find((c) => CLASSES[c].role === 'tank');
    // only say something when it helps: where to tap next, or a tank standing out of place
    const tip = picked ? `Tap a spot for the ${CLASSES[picked].name}` : tank && form[1] !== tank ? `${CLASSES[tank].name}s hold the line best from the Front` : '';
    root.replaceChildren(h('div', { class: 'ffield' }, spot(1), spot(0), spot(2)), ...(tip ? [h('div', { class: `ftip${picked ? '' : ' warn'}` }, tip)] : []));
  }
  render();
  return { el: root, render };
}

/** The formation in a sheet (from the battle screen). */
export function openFormationSheet(onChange, openClass) {
  openSheet((close) => {
    const ed = formationEditor({ onChange, openClass: openClass && ((c) => { close(); openClass(c); }) });
    return [h('div', { class: 'pixel center', style: { fontSize: '22px' } }, 'Formation'), ed.el];
  });
}
