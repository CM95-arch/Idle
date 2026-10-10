// Item detail sheet (vault, drops, equipment) and the equip picker.
import { CONFIG } from '../config.js';
import { CLASS, CLASSES, STAT_LABEL, ABILITY_TYPES } from '../data/classes.js';
import { ITEMS, ITEM_LIST, tierLabel, typeLabel, tierValue } from '../data/items.js';
import { sourcesOf } from '../core/loot.js';
import { fighterOf, dpsOf } from '../core/character.js';
import { abilityCost } from '../core/combat.js';
import * as G from '../core/game.js';
import { h, openSheet, closeSheet, toast, confirmDialog, fmtNum } from './dom.js';
import { itemIcon } from './sprites.js';

const usableBy = (id) => CLASSES.filter((c) => G.canUse(c.id, id)).map((c) => c.name);

export function statLines(it) {
  const rows = [];
  if (it.weapon) {
    rows.push(['Damage', `${it.weapon.dmgMin}–${it.weapon.dmgMax}`], ['Shots', it.weapon.shots], ['Fire rate', `${Math.round(it.weapon.rof * 100)}%`]);
  }
  if (it.ability) {
    rows.push(['Power', fmtNum(it.ability.power)], ['MP cost', abilityCost({ type: it.type, cost: it.ability.cost })]);
  }
  for (const [k, v] of Object.entries(it.bonus || {})) if (v) rows.push([k === 'def' && it.slot === 'armor' ? 'Defense' : STAT_LABEL[k], `+${v}`]);
  return rows;
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
  if (it.tier === 'UT') return `A unique ${typeLabel(it).toLowerCase()}. Drops from the boss of ${s.dungeons[0] || 'a dungeon'}.`;
  if (it.slot === 'rune') return `A rune. Drops from ${s.dungeons[0]}.`;
  const where = s.biomes[0] ? `${s.biomes[0]}${s.biomes.length > 1 ? ' and deeper' : ''}` : s.dungeons[0];
  return `An undiscovered ${tierLabel(it)} ${typeLabel(it).toLowerCase()}. Found in ${where}.`;
}

export function openItemSheet(id) {
  const it = ITEMS[id];
  delete G.state.newIds[id];
  openSheet((close, rerender) => {
    const known = G.discovered(id);
    if (!known) {
      return [
        h('div', { class: 'ihead' }, h('div', { class: 'ibig' }, itemIcon(id, 56, true)),
          h('div', {}, h('div', { class: 'title', style: { fontSize: '17px' } }, 'Undiscovered'), h('div', { class: 'muted small' }, `${it.tier === 'UT' ? 'UT' : tierLabel(it)} ${typeLabel(it)}`))),
        h('p', { class: 'flav' }, hintText(it)),
      ];
    }
    const slot = G.state.view, c = G.state.chars[slot];
    const own = G.owned(id), eq = G.equippedCount(id), spare = G.spareCopies(id), cost = G.forgeCost(id);
    const kids = [
      h('div', { class: 'ihead' }, h('div', { class: 'ibig' }, itemIcon(id, 56)),
        h('div', {},
          h('div', { class: 'title', style: { fontSize: '17px', lineHeight: 1.2, color: it.tier === 'UT' ? 'var(--ut)' : '' } }, it.name),
          h('div', { class: 'muted small' }, [tierLabel(it), typeLabel(it)].filter(Boolean).join(' '), it.slot !== 'potion' && it.slot !== 'rune' ? ` · ${usableBy(id).join(', ')}` : ''),
          h('div', { class: 'small', style: { marginTop: '3px' } }, 'In vault ', h('b', { class: 'tnum' }, `×${own}`), h('span', { class: 'muted' }, `${eq ? ` · ${eq} equipped` : ''} · ${fmtNum(G.state.found[id] || 0)} found all-time`)))),
    ];
    const rows = statLines(it);
    if (rows.length) kids.push(h('div', { class: 'kv tnum' }, rows.map(([k, v]) => h('div', {}, h('span', {}, k), String(v)))));
    if (it.ability) kids.push(h('div', { class: 'small muted' }, ABILITY_TYPES[it.type].effect));
    kids.push(h('p', { class: 'flav' }, it.desc));
    kids.push(h('div', { class: 'small muted' }, 'Found in ', h('b', { style: { color: 'var(--parchment)' } }, sourceText(it))));

    if (it.slot === 'potion') {
      kids.push(h('div', { class: 'small muted' }, `Drink potions from the Character screen. Each is worth ${CONFIG.potionEssenceValue} Essence.`));
      kids.push(h('div', { class: 'row' },
        h('button', { class: 'btn ghost sm grow', disabled: own < 10, onclick: () => { G.dismantle(id, 10); rerender(); } }, 'Dismantle 10'),
        h('button', { class: 'btn ghost sm grow', disabled: own < 1, onclick: async () => { if (await confirmDialog({ title: `Dismantle ${own} potions?`, body: `You get ${fmtNum(own * CONFIG.potionEssenceValue)} Essence.`, ok: 'Dismantle', danger: true })) { G.dismantle(id, own); rerender(); } } }, 'Dismantle all')));
      return kids;
    }
    if (it.slot === 'rune') return kids;

    const actions = [];
    if (c && G.canUse(c.cls, id)) {
      const isOn = c.equip[it.slot] === id;
      actions.push(h('button', { class: 'btn sm grow', disabled: isOn || own < 1, onclick: () => { G.equip(slot, id); toast({ title: 'Equipped', body: `${it.name} on ${c.name}`, icon: itemIcon(id, 28) }); close(); } }, isOn ? 'Equipped' : own < 1 ? 'No spare copy' : `Equip on ${c.name}`));
    }
    actions.push(h('button', { class: 'btn ghost sm grow', disabled: cost == null || G.state.essence < cost, onclick: async () => {
      if (await confirmDialog({ title: `Forge ${it.name}?`, body: `Costs ${fmtNum(cost)} Essence. You have ${fmtNum(G.state.essence)}.`, ok: 'Forge' })) { G.forge(id); toast({ title: 'Forged', body: it.name, icon: itemIcon(id, 28), kind: 'gold' }); rerender(); }
    } }, 'Forge ', h('span', { class: 'ess' }, `◆${fmtNum(cost)}`)));
    actions.push(h('button', { class: 'btn ghost sm grow', disabled: spare < 1, onclick: async () => {
      const gain = G.essenceValue(id) * spare;
      if (await confirmDialog({ title: `Dismantle ${spare}?`, body: `Keeps one copy. You get ${fmtNum(gain)} Essence.`, ok: 'Dismantle', danger: true })) { G.dismantle(id); rerender(); }
    } }, `Dismantle ${spare || ''}`.trim()));
    kids.push(h('div', { class: 'row', style: { flexWrap: 'wrap' } }, actions));
    return kids;
  });
}

/** Choose gear for one equipment slot of a character. */
export function openEquipPicker(slot, kind) {
  const c = G.state.chars[slot];
  if (!c) return;
  const C = CLASS[c.cls];
  const baseF = fighterOf(c, G.state);
  const compare = (id) => {
    const test = { ...c, equip: { ...c.equip, [kind]: id } };
    const F = fighterOf(test, G.state);
    const d = dpsOf(F) - dpsOf(baseF), hp = F.maxHp - baseF.maxHp, def = F.def - baseF.def;
    const bits = [];
    if (d) bits.push(h('span', { class: d > 0 ? 'better' : 'worse' }, `${d > 0 ? '+' : ''}${d} DPS`));
    if (hp) bits.push(h('span', { class: hp > 0 ? 'better' : 'worse' }, `${hp > 0 ? '+' : ''}${hp} HP`));
    if (def) bits.push(h('span', { class: def > 0 ? 'better' : 'worse' }, `${def > 0 ? '+' : ''}${def} DEF`));
    return bits.length ? bits.reduce((acc, b, i) => (i ? [...acc, ' · ', b] : [b]), []) : [h('span', { class: 'muted' }, 'no change')];
  };
  openSheet((close) => {
    const cur = c.equip[kind];
    const list = ITEM_LIST.filter((it) => it.slot === kind && G.canUse(c.cls, it.id) && G.owned(it.id) > 0 && it.id !== cur)
      .sort((a, b) => tierValue(b) - tierValue(a));
    const label = { weapon: typeLabel({ type: C.weapon }), ability: typeLabel({ type: C.ability }), armor: typeLabel({ type: C.armor }), ring: 'Ring' }[kind];
    const rows = [
      h('div', { class: 'row between' }, h('div', { class: 'title', style: { fontSize: '17px' } }, `${label} · ${c.name}`), h('span', { class: 'muted small' }, `${list.length} in vault`)),
    ];
    if (cur) rows.push(h('button', { class: 'pick on', onclick: () => { close(); openItemSheet(cur); } },
      h('div', { class: 'ic' }, itemIcon(cur, 32)), h('div', {}, h('b', {}, ITEMS[cur].name), h('div', { class: 'small muted' }, `Equipped · ${tierLabel(ITEMS[cur])}`)), h('span', { class: 'small muted' }, 'Details')));
    if (!list.length) rows.push(h('p', { class: 'muted small', style: { margin: '6px 0' } }, `No other ${label.toLowerCase()}s ${C.name}s can use are in your vault yet.`));
    rows.push(h('div', { class: 'list' }, list.map((it) => h('button', { class: 'pick', onclick: () => { G.equip(slot, it.id); close(); } },
      h('div', { class: 'ic' }, itemIcon(it.id, 32)),
      h('div', { style: { minWidth: 0 } }, h('b', { style: { color: it.tier === 'UT' ? 'var(--ut)' : '' } }, it.name), h('div', { class: 'small' }, compare(it.id))),
      h('span', { class: 'small muted tnum' }, `${tierLabel(it)} ×${G.owned(it.id)}`)))));
    if (cur) rows.push(h('button', { class: 'btn ghost sm', onclick: () => { G.unequip(slot, kind); close(); } }, 'Unequip'));
    return rows;
  });
}
export { closeSheet };
