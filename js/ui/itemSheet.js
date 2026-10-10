// Item detail sheet: stats, a comparison against what the current character wears, and actions.
import { CONFIG } from '../config.js';
import { CLASSES, STAT_LABEL, ABILITY_TYPES } from '../data/classes.js';
import { ITEMS, tierLabel, typeLabel } from '../data/items.js';
import { sourcesOf } from '../core/loot.js';
import { fighterOf, dpsOf } from '../core/character.js';
import { abilityCost } from '../core/combat.js';
import * as G from '../core/game.js';
import { h, openSheet, toast, confirmDialog, fmtNum } from './dom.js';
import { itemIcon } from './sprites.js';

const usableBy = (id) => CLASSES.filter((c) => G.canUse(c.id, id)).map((c) => c.name);

export function statLines(it) {
  const rows = [];
  if (it.weapon) rows.push(['Damage', `${it.weapon.dmgMin}–${it.weapon.dmgMax}`], ['Shots', it.weapon.shots], ['Fire rate', `${Math.round(it.weapon.rof * 100)}%`]);
  if (it.ability) rows.push(['Power', fmtNum(it.ability.power)], ['MP cost', abilityCost({ type: it.type, cost: it.ability.cost })]);
  for (const [k, v] of Object.entries(it.bonus || {})) if (v) rows.push([k === 'def' && it.slot === 'armor' ? 'Defense' : STAT_LABEL[k], `+${v}`]);
  return rows;
}

/** "+120 DPS · −4 DEF" style comparison against the equipped item, or null. */
export function compareText(slot, id) {
  const c = G.state.chars[slot], it = ITEMS[id];
  if (!c || !G.canUse(c.cls, id)) return null;
  const cur = c.equip[it.slot];
  if (cur === id) return h('span', { class: 'muted' }, 'Equipped');
  const parts = [];
  const add = (n, label) => { if (Math.round(n)) parts.push(h('span', { class: n > 0 ? 'better' : 'worse' }, `${n > 0 ? '+' : ''}${fmtNum(n)} ${label}`)); };
  const base = fighterOf(c, G.state), test = fighterOf({ ...c, equip: { ...c.equip, [it.slot]: id } }, G.state);
  add(dpsOf(test) - dpsOf(base), 'DPS');
  add(test.maxHp - base.maxHp, 'HP');
  add(test.def - base.def, 'DEF');
  add(test.maxMp - base.maxMp, 'MP');
  if (it.slot === 'ability') {
    const a = test.ability, b = base.ability;
    add((a?.power || 0) - (b?.power || 0), 'power');
    if (a && b) add(-(abilityCost(a) - abilityCost(b)), 'MP cost');
  }
  if (it.slot === 'ring') {
    const curB = cur ? ITEMS[cur].bonus : {};
    for (const k of ['att', 'spd', 'dex', 'vit', 'wis']) add((it.bonus[k] || 0) - (curB[k] || 0), STAT_LABEL[k]);
  }
  if (!parts.length) return h('span', { class: 'muted' }, 'Same as equipped');
  return parts.reduce((acc, p, i) => (i ? [...acc, ' · ', p] : [p]), []);
}

function sourceText(it) {
  const s = sourcesOf(it);
  const parts = [];
  if (s.biomes.length) parts.push(s.biomes.join(', '));
  if (s.dungeons.length) parts.push(s.dungeons.length > 4 ? `${s.dungeons.slice(0, 4).join(', ')} +${s.dungeons.length - 4} more` : s.dungeons.join(', '));
  return parts.join(' · ') || 'Starter gear';
}
function hintText(it) {
  const s = sourcesOf(it);
  if (it.tier === 'UT') return `A unique ${typeLabel(it).toLowerCase()} from ${s.dungeons[0] || 'a dungeon'}.`;
  if (it.slot === 'rune') return `Drops from ${s.dungeons[0]}.`;
  return `Found in ${s.biomes[0] || s.dungeons[0]}${s.biomes.length > 1 ? ' and beyond' : ''}.`;
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
    ];
    const own = G.owned(id), eq = G.equippedCount(id), spare = G.spareCopies(id), cost = G.forgeCost(id);
    const kids = [
      h('div', { class: 'ihead' }, h('div', { class: 'ibig' }, itemIcon(id, 54)),
        h('div', {},
          h('div', { class: 'h2', style: { color: it.tier === 'UT' ? 'var(--ut)' : '' } }, it.name),
          h('div', { class: 'small muted', style: { fontWeight: 700 } }, [tierLabel(it), typeLabel(it)].filter(Boolean).join(' '), it.slot !== 'potion' && it.slot !== 'rune' ? ` · ${usableBy(id).join(', ')}` : ''),
          h('div', { class: 'small', style: { fontWeight: 800, marginTop: '2px' } }, `×${own} in vault`, eq ? h('span', { class: 'muted' }, ` · ${eq} equipped`) : null))),
    ];
    const rows = statLines(it);
    if (rows.length) kids.push(h('div', { class: 'kv tnum' }, rows.map(([k, v]) => h('div', {}, h('span', {}, k), String(v)))));
    if (it.ability) kids.push(h('div', { class: 'small muted' }, ABILITY_TYPES[it.type].effect));
    const cmp = c && compareText(slot, id);
    if (cmp) kids.push(h('div', { class: 'cmp' }, h('span', { class: 'muted' }, `vs ${c.name}'s gear: `), cmp));
    kids.push(h('p', { class: 'flav' }, it.desc));
    kids.push(h('div', { class: 'small muted' }, 'Found in ', h('b', { style: { color: 'var(--ink)' } }, sourceText(it))));
    if (it.slot === 'potion') {
      kids.push(h('div', { class: 'row' },
        h('button', { class: 'btn gray sm grow', disabled: own < 1, onclick: async () => { if (await confirmDialog({ title: `Dismantle ${own} potions?`, body: `For ${fmtNum(own * CONFIG.potionEssenceValue)} Essence.`, ok: 'Dismantle', danger: true })) { G.dismantle(id, own); rerender(); onChange?.(); } } }, 'Dismantle all')));
      return kids;
    }
    if (it.slot === 'rune') return kids;
    const actions = [];
    if (c && G.canUse(c.cls, id)) {
      const isOn = c.equip[it.slot] === id;
      actions.push(h('button', { class: 'btn sm grow', disabled: isOn || own < 1, onclick: () => { G.equip(slot, id); toast({ title: 'Equipped', body: it.name, icon: itemIcon(id, 26) }); close(); onChange?.(); } }, isOn ? 'Equipped' : own < 1 ? 'None spare' : 'Equip'));
    }
    actions.push(h('button', { class: 'btn gray sm grow', disabled: cost == null || G.state.essence < cost, onclick: async () => {
      if (await confirmDialog({ title: `Forge ${it.name}?`, body: `Costs ${fmtNum(cost)} Essence.`, ok: 'Forge' })) { G.forge(id); rerender(); onChange?.(); }
    } }, 'Forge ', h('span', { class: 'ess' }, `◆${fmtNum(cost)}`)));
    if (spare) actions.push(h('button', { class: 'btn gray sm grow', onclick: async () => {
      if (await confirmDialog({ title: `Dismantle ${spare}?`, body: `Keeps one copy. +${fmtNum(G.essenceValue(id) * spare)} Essence.`, ok: 'Dismantle', danger: true })) { G.dismantle(id); rerender(); onChange?.(); }
    } }, `Dismantle ${spare}`));
    kids.push(h('div', { class: 'row', style: { flexWrap: 'wrap' } }, actions));
    return kids;
  });
}
