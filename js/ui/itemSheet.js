// Item detail sheet: stats, what it does, where it drops, and actions (equip, salvage, reforge, convert).
import { CONFIG } from '../config.js';
import { CLASSES, STATS, STAT_LABEL } from '../data/classes.js';
import { ITEMS, tierLabel, typeLabel } from '../data/items.js';
import { sourcesOf } from '../core/loot.js';
import * as G from '../core/game.js';
import { h, openSheet, toast, fmtNum } from './dom.js';
import { itemIcon } from './sprites.js';
import { statLines, compareItem } from './gear.js';

const usableBy = (id) => CLASSES.filter((c) => G.canUse(c.id, id)).map((c) => c.name);

function sourceText(it) {
  const s = sourcesOf(it);
  const list = [...s.biomes, ...s.dungeons];
  return list.length > 5 ? `${list.slice(0, 5).join(', ')} +${list.length - 5} more` : list.join(', ') || '—';
}

export function openItemSheet(id, onChange) {
  const it = ITEMS[id];
  delete G.state.newIds[id];
  openSheet((close, rerender) => {
    const slot = G.state.view, c = G.state.chars[slot];
    const known = G.discovered(id), own = G.owned(id), ut = it.tier === 'UT';
    const done = () => { rerender(); onChange?.(); };
    if (!known && ut) return [
      h('div', { class: 'ihead' }, h('div', { class: 'ibig' }, itemIcon(id, 54, true)),
        h('div', {}, h('div', { class: 'h2' }, '???'), h('div', { class: 'small muted' }, `Unique ${typeLabel(it).toLowerCase()}`))),
      h('p', { class: 'flav' }, `Drops in ${sourceText(it)}.`),
      it.special ? h('div', { class: 'special' }, it.special) : null,
    ];
    const kids = [
      h('div', { class: 'ihead' }, h('div', { class: 'ibig' }, itemIcon(id, 54)),
        h('div', {},
          h('div', { class: 'h2', style: { color: ut ? 'var(--ut)' : '' } }, it.name),
          h('div', { class: 'small muted', style: { fontWeight: 700 } }, [tierLabel(it), typeLabel(it)].filter(Boolean).join(' '), G.isGear(id) ? ` · ${usableBy(id).join(', ')}` : ''),
          h('div', { class: 'small', style: { fontWeight: 800, marginTop: '2px' } }, `×${own} in vault`))),
    ];
    const rows = statLines(it);
    if (rows.length) kids.push(h('div', { class: 'kv tnum' }, rows.map(([k, v]) => h('div', {}, h('span', {}, k), String(v)))));
    if (it.special) kids.push(h('div', { class: 'special' }, it.special));
    const cmp = c && G.isGear(id) && compareItem(c, id);
    if (cmp) kids.push(h('div', { class: 'cmp' }, h('span', { class: 'muted' }, `vs ${c.name}'s gear: `), cmp));
    if (it.desc) kids.push(h('p', { class: 'flav' }, it.desc));
    kids.push(h('div', { class: 'small muted' }, 'Found in ', h('b', { style: { color: 'var(--ink)' } }, sourceText(it))));

    if (it.slot === 'potion') {
      kids.push(h('div', { class: 'label' }, `Convert ${CONFIG.potionConvertCost} → 1`));
      kids.push(h('div', { class: 'classes' }, STATS.filter((k) => k !== it.potStat).map((k) => h('button', { class: 'cls', disabled: own < CONFIG.potionConvertCost, style: { opacity: own < CONFIG.potionConvertCost ? 0.45 : 1 }, onclick: () => { if (G.convertPotions(it.potStat, k)) { toast({ title: `+1 ${ITEMS[`pot_${k}`].name}`, icon: itemIcon(`pot_${k}`, 24) }); done(); } } },
        itemIcon(`pot_${k}`, 26), h('span', {}, STAT_LABEL[k])))));
      return kids;
    }
    if (!G.isGear(id)) return kids;
    const actions = [];
    if (c && G.canUse(c.cls, id) && own > 0) actions.push(h('button', { class: `btn sm grow${G.isUpgrade(slot, id) ? '' : ' gray'}`, disabled: G.state.run?.slot === slot, onclick: () => { if (G.equip(slot, id)) { toast({ title: 'Equipped', body: it.name, icon: itemIcon(id, 26) }); close(); onChange?.(); } } }, `Equip on ${c.name}`));
    if (own > 0) actions.push(h('button', { class: 'btn gray sm grow', onclick: () => { const got = G.salvage(id, 1); if (got) { toast({ title: `+${got} essence`, body: `Salvaged ${it.name}` }); done(); } } }, `Salvage +${G.salvageValue(id)} ✦`));
    if (ut) {
      const cost = G.reforgeCost(id);
      actions.push(h('button', { class: 'btn gold sm grow', disabled: G.state.essence < cost, onclick: () => { if (G.reforge(id)) { toast({ title: 'Reforged', body: it.name, icon: itemIcon(id, 26), kind: 'gold' }); done(); } } }, `Reforge · ${fmtNum(cost)} ✦`));
    }
    if (actions.length) kids.push(h('div', { class: 'row', style: { flexWrap: 'wrap' } }, actions));
    if (ut) kids.push(h('div', { class: 'small muted' }, `You have ${fmtNum(G.state.essence)} essence. Once found, a UT can always be reforged, even after it's lost.`));
    return kids;
  });
}
