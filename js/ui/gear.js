// Gear UI: the four slot buttons and the slot sheet (what's worn, and what in the vault could go there).
import { CLASS, STAT_LABEL, ABILITY_TYPES } from '../data/classes.js';
import { ITEMS, ITEM_LIST, tierLabel } from '../data/items.js';
import { GEAR_SLOTS, gearItem, fighterOf, dpsOf, starterItem } from '../core/character.js';
import { abilityCost } from '../core/combat.js';
import { ABILITY_INFO } from '../core/arena.js';
import * as G from '../core/game.js';
import { h, openSheet, toast, fmtNum } from './dom.js';
import { itemIcon } from './sprites.js';

export const SLOT_LABEL = { weapon: 'Weapon', ability: 'Ability', armor: 'Armor', ring: 'Ring' };

export function statLines(it) {
  const rows = [];
  if (it.weapon) rows.push(['Damage', `${it.weapon.dmgMin}–${it.weapon.dmgMax}`], ['Shots', it.weapon.shots], ['Fire rate', `${Math.round(it.weapon.rof * 100)}%`]);
  if (it.ability) rows.push(['Power', fmtNum(it.ability.power)], ['MP cost', abilityCost({ type: it.type, cost: it.ability.cost })]);
  for (const [k, v] of Object.entries(it.bonus || {})) if (v) rows.push([k === 'def' && it.slot === 'armor' ? 'Defense' : STAT_LABEL[k], `+${v}`]);
  return rows;
}

/** "+120 DPS · −4 DEF" comparing a character against a copy wearing `id`, or null when nothing changes. */
export function compareItem(c, id) {
  const it = ITEMS[id];
  if (!c || !it || !G.canUse(c.cls, id)) return null;
  const changed = { ...c, equip: { ...c.equip, [it.slot]: id } };
  const parts = [];
  const add = (n, label) => { if (Math.round(n)) parts.push(h('span', { class: n > 0 ? 'better' : 'worse' }, `${n > 0 ? '+' : ''}${fmtNum(n)} ${label}`)); };
  const base = fighterOf(c, G.state), test = fighterOf(changed, G.state);
  add(dpsOf(test) - dpsOf(base), 'DPS');
  add(test.maxHp - base.maxHp, 'HP');
  add(test.def - base.def, 'DEF');
  add(test.maxMp - base.maxMp, 'MP');
  const a = test.ability, b = base.ability;
  add((a?.power || 0) - (b?.power || 0), 'power');
  const cur = gearItem(c, it.slot);
  for (const k of ['att', 'spd', 'dex', 'vit', 'wis']) add((it.bonus?.[k] || 0) - (cur?.bonus?.[k] || 0), STAT_LABEL[k]);
  return parts.length ? parts.reduce((acc, p, i) => (i ? [...acc, ' · ', p] : [p]), []) : null;
}

/** The four gear slots. ▲ marks a slot the vault has an upgrade for. */
export function gearSlots(slot, onTap = (k) => slotSheet(slot, k)) {
  const c = G.state.chars[slot];
  const upgrades = new Set(Object.keys(G.state.vault).filter((id) => G.owned(id) > 0 && G.isUpgrade(slot, id)).map((id) => ITEMS[id].slot));
  return h('div', { class: 'slots' }, GEAR_SLOTS.map((k) => {
    const it = gearItem(c, k), starter = !c.equip[k];
    return h('button', { class: `slot${it ? '' : ' empty'}${it?.tier === 'UT' ? ' ut' : ''}${upgrades.has(k) ? ' canup' : ''}`, 'aria-label': k, onclick: () => onTap(k) },
      h('span', { class: 'kind' }, k), it ? itemIcon(it.id, 38) : null,
      it ? h('span', { class: 'tier' }, starter ? 'T1' : tierLabel(it)) : null,
      upgrades.has(k) ? h('span', { class: 'upmark' }, '▲') : null);
  }));
}

/** Tapping a gear slot: what's worn there, and the vault items that fit (best first). */
export function slotSheet(slot, kind, onChange) {
  openSheet((close, rerender) => {
    const c = G.state.chars[slot];
    if (!c) { close(); return []; }
    const it = gearItem(c, kind), starter = !c.equip[kind];
    const busy = G.state.run?.slot === slot;
    const done = () => { rerender(); onChange?.(); };
    const kids = [];
    if (it) {
      kids.push(h('div', { class: 'ihead' }, h('div', { class: 'ibig' }, itemIcon(it.id, 54)),
        h('div', {},
          h('div', { class: 'h2', style: { color: it.tier === 'UT' ? 'var(--ut)' : '' } }, it.name),
          h('div', { class: 'small muted', style: { fontWeight: 700 } }, `${SLOT_LABEL[kind]} · ${tierLabel(it)}${starter ? ' · starter gear (never lost)' : ''}`))));
      kids.push(h('div', { class: 'kv tnum' }, statLines(it).map(([k, v]) => h('div', {}, h('span', {}, k), String(v)))));
      if (it.special) kids.push(h('div', { class: 'special' }, it.special));
    } else kids.push(h('div', { class: 'h2' }, 'No ring'), h('div', { class: 'small muted' }, 'Rings drop in dungeons.'));
    if (kind === 'ability') kids.push(h('div', { class: 'small muted' }, `${ABILITY_TYPES[CLASS[c.cls].ability].name}: ${ABILITY_INFO[CLASS[c.cls].ability]}`));
    if (!starter && !busy) kids.push(h('button', { class: 'btn gray sm', onclick: () => { G.unequip(slot, kind); done(); } }, kind === 'ring' ? 'Take off' : 'Back to starter gear'));
    if (!starter) kids.push(h('div', { class: 'small', style: { color: 'var(--red-dark)', fontWeight: 800 } }, 'Worn gear is lost if this character falls in a dungeon.'));

    const options = ITEM_LIST.filter((x) => x.slot === kind && G.owned(x.id) > 0 && G.canUse(c.cls, x.id) && x.id !== starterItem(c.cls, kind))
      .sort((a, b) => (b.tier === 'UT' ? b.eq + 0.5 : b.tier) - (a.tier === 'UT' ? a.eq + 0.5 : a.tier));
    kids.push(h('div', { class: 'label' }, `In your vault (${options.length})`));
    if (!options.length) kids.push(h('div', { class: 'small muted' }, 'Nothing for this slot yet. Gear drops in dungeons.'));
    else kids.push(h('div', { class: 'lootlist' }, options.map((x) => {
      const up = G.isUpgrade(slot, x.id), cmp = compareItem(c, x.id);
      return h('div', { class: `loot${x.tier === 'UT' ? ' on' : ''}` }, h('span', { class: 'ic' }, itemIcon(x.id, 34)),
        h('div', { style: { minWidth: 0 } },
          h('b', { style: { color: x.tier === 'UT' ? 'var(--ut)' : '' } }, x.name, ' ', h('span', { class: 'muted', style: { fontSize: '12px' } }, tierLabel(x)), G.owned(x.id) > 1 ? h('span', { class: 'muted', style: { fontSize: '12px' } }, ` ×${G.owned(x.id)}`) : null),
          x.special ? h('span', { class: 'small', style: { display: 'block', fontWeight: 800, color: 'var(--ut)' } }, x.special) : null,
          h('span', { class: 'small muted', style: { display: 'block', fontWeight: 700 } }, cmp || 'Same stats')),
        h('button', { class: `btn sm${up ? '' : ' gray'}`, disabled: busy, onclick: () => { if (G.equip(slot, x.id)) { toast({ title: 'Equipped', body: x.name, icon: itemIcon(x.id, 26) }); done(); } } }, 'Equip'));
    })));
    return kids;
  });
}
