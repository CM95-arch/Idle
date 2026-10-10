// Item detail sheet for UTs, potions and runes: stats, what it does, where it drops, and actions.
import { CONFIG } from '../config.js';
import { CLASSES, STATS, STAT_LABEL, ABILITY_TYPES } from '../data/classes.js';
import { ITEMS, tierLabel, typeLabel } from '../data/items.js';
import { sourcesOf } from '../core/loot.js';
import { gearItem, utAtTier } from '../core/character.js';
import * as G from '../core/game.js';
import { h, openSheet, toast } from './dom.js';
import { itemIcon } from './sprites.js';
import { statLines, compareChar } from './gear.js';

const usableBy = (id) => CLASSES.filter((c) => G.canUse(c.id, id)).map((c) => c.name);

function sourceText(it) {
  const s = sourcesOf(it);
  const parts = [];
  if (s.biomes.length) parts.push(s.biomes.join(', '));
  if (s.dungeons.length) parts.push(s.dungeons.length > 4 ? `${s.dungeons.slice(0, 4).join(', ')} +${s.dungeons.length - 4} more` : s.dungeons.join(', '));
  return parts.join(' · ') || '—';
}
function hintText(it) {
  const s = sourcesOf(it);
  if (it.tier === 'UT') return `A unique ${typeLabel(it).toLowerCase()} from ${s.dungeons[0] || s.biomes[0] || 'a dungeon'}.`;
  if (it.slot === 'rune') return `Drops from ${s.dungeons[0]}.`;
  return `Found in ${s.biomes[0] || s.dungeons[0]}.`;
}

export function openItemSheet(id, onChange) {
  const it = ITEMS[id];
  delete G.state.newIds[id];
  openSheet((close, rerender) => {
    const slot = G.state.view, c = G.state.chars[slot];
    if (!G.discovered(id)) return [
      h('div', { class: 'ihead' }, h('div', { class: 'ibig' }, itemIcon(id, 54, true)),
        h('div', {}, h('div', { class: 'h2' }, '???'), h('div', { class: 'small muted' }, `${tierLabel(it)} ${typeLabel(it)}`))),
      h('p', { class: 'flav' }, hintText(it)),
      it.special ? h('div', { class: 'special' }, it.special) : null,
    ];
    const own = G.owned(id), ut = it.tier === 'UT';
    const fits = ut && c && G.canUse(c.cls, id);
    // a UT works at the slot tier of whoever wears it: show it at the viewed character's tier when it fits them
    const shown = fits ? gearItem(c, it.slot, { ut: id }) : ut ? utAtTier(id, it.eq) : it;
    const worn = ut ? G.wearers(id).length : 0;
    const kids = [
      h('div', { class: 'ihead' }, h('div', { class: 'ibig' }, itemIcon(id, 54)),
        h('div', {},
          h('div', { class: 'h2', style: { color: ut ? 'var(--ut)' : '' } }, it.name),
          h('div', { class: 'small muted', style: { fontWeight: 700 } }, [tierLabel(it), typeLabel(it)].filter(Boolean).join(' '), ut ? ` · ${usableBy(id).join(', ')}` : ''),
          h('div', { class: 'small', style: { fontWeight: 800, marginTop: '2px' } }, ut ? (fits ? `Shown at ${c.name}'s T${shown.slotTier}` : `Shown at T${it.eq}`) : `×${own} in vault`, worn ? h('span', { class: 'muted' }, ` · worn by ${worn}`) : null))),
    ];
    const rows = statLines(shown);
    if (rows.length) kids.push(h('div', { class: 'kv tnum' }, rows.map(([k, v]) => h('div', {}, h('span', {}, k), String(v)))));
    if (it.special) kids.push(h('div', { class: 'special' }, it.special));
    if (it.ability) kids.push(h('div', { class: 'small muted' }, ABILITY_TYPES[it.type].effect));
    const on = fits && c.ut[it.slot] === id;
    const cmp = fits && !on && compareChar(c, { ...c, ut: { ...c.ut, [it.slot]: id } });
    if (cmp) kids.push(h('div', { class: 'cmp' }, h('span', { class: 'muted' }, `vs ${c.name}'s gear: `), cmp));
    kids.push(h('p', { class: 'flav' }, it.desc));
    kids.push(h('div', { class: 'small muted' }, 'Found in ', h('b', { style: { color: 'var(--ink)' } }, sourceText(it))));
    if (it.slot === 'potion') {
      kids.push(h('div', { class: 'label' }, `Convert ${CONFIG.potionConvertCost} → 1`));
      kids.push(h('div', { class: 'classes' }, STATS.filter((k) => k !== it.potStat).map((k) => h('button', { class: 'cls', disabled: own < CONFIG.potionConvertCost, style: { opacity: own < CONFIG.potionConvertCost ? 0.45 : 1 }, onclick: () => { if (G.convertPotions(it.potStat, k)) { toast({ title: `+1 ${ITEMS[`pot_${k}`].name}`, icon: itemIcon(`pot_${k}`, 24) }); rerender(); onChange?.(); } } },
        itemIcon(`pot_${k}`, 26), h('span', {}, STAT_LABEL[k])))));
      return kids;
    }
    if (it.slot === 'rune') return kids;
    if (fits) kids.push(h('button', { class: `btn${on ? ' gray' : ''}`, onclick: () => { G.setUt(slot, it.slot, on ? null : id); if (!on) toast({ title: `${c.name} wears it`, body: it.name, icon: itemIcon(id, 26), kind: 'gold' }); rerender(); onChange?.(); } }, on ? 'Take off' : `Wear on ${c.name}`));
    else if (ut && c) kids.push(h('div', { class: 'small muted' }, `${c.name} can't use this. UT unlocks are shared by all your characters.`));
    return kids;
  });
}
