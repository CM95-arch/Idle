// Gear UI: the four slot buttons, the slot sheet (UT choice, ring stat) and the upgrade chooser.
import { CLASS, STATS, STAT_LABEL, ABILITY_TYPES } from '../data/classes.js';
import { ITEM_LIST, ITEMS, typeLabel } from '../data/items.js';
import { GEAR_SLOTS, gearItem, fighterOf, dpsOf, slotType } from '../core/character.js';
import { abilityCost } from '../core/combat.js';
import * as G from '../core/game.js';
import { h, openSheet, toast, fmtNum } from './dom.js';
import { itemIcon } from './sprites.js';

const SLOT_LABEL = { weapon: 'Weapon', ability: 'Ability', armor: 'Armor', ring: 'Ring' };

export function statLines(it) {
  const rows = [];
  if (it.weapon) rows.push(['Damage', `${it.weapon.dmgMin}–${it.weapon.dmgMax}`], ['Shots', it.weapon.shots], ['Fire rate', `${Math.round(it.weapon.rof * 100)}%`]);
  if (it.ability) rows.push(['Power', fmtNum(it.ability.power)], ['MP cost', abilityCost({ type: it.type, cost: it.ability.cost })]);
  for (const [k, v] of Object.entries(it.bonus || {})) if (v) rows.push([k === 'def' && it.slot === 'armor' ? 'Defense' : STAT_LABEL[k], `+${v}`]);
  return rows;
}

/** "+120 DPS · −4 DEF" comparing the character now against a changed copy, or null when nothing changes. */
export function compareChar(c, changed) {
  const parts = [];
  const add = (n, label) => { if (Math.round(n)) parts.push(h('span', { class: n > 0 ? 'better' : 'worse' }, `${n > 0 ? '+' : ''}${fmtNum(n)} ${label}`)); };
  const base = fighterOf(c, G.state), test = fighterOf(changed, G.state);
  add(dpsOf(test) - dpsOf(base), 'DPS');
  add(test.maxHp - base.maxHp, 'HP');
  add(test.def - base.def, 'DEF');
  add(test.maxMp - base.maxMp, 'MP');
  const a = test.ability, b = base.ability;
  add((a?.power || 0) - (b?.power || 0), 'power');
  if (a && b) add(-(abilityCost(a) - abilityCost(b)), 'MP cost');
  const sb = (ch) => Object.fromEntries(['att', 'spd', 'dex', 'vit', 'wis'].map((k) => [k, GEAR_SLOTS.reduce((n, s) => n + (gearItem(ch, s)?.bonus?.[k] || 0), 0)]));
  const x = sb(changed), y = sb(c);
  for (const k of Object.keys(x)) add(x[k] - y[k], STAT_LABEL[k]);
  return parts.length ? parts.reduce((acc, p, i) => (i ? [...acc, ' · ', p] : [p]), []) : null;
}

/** The four gear slots. Gold ▲ marks slots a pending upgrade can raise. */
export function gearSlots(slot, onTap = (k) => slotSheet(slot, k)) {
  const c = G.state.chars[slot];
  const t = G.pendingUpgrade(slot), can = t ? G.upgradeSlots(slot, t) : [];
  return h('div', { class: 'slots' }, GEAR_SLOTS.map((k) => {
    const it = gearItem(c, k), ut = !!c.ut[k];
    return h('button', { class: `slot${ut ? ' ut' : ''}${can.includes(k) ? ' canup' : ''}`, 'aria-label': k, onclick: () => onTap(k) },
      h('span', { class: 'kind' }, k), itemIcon(it.id, 38), h('span', { class: 'tier' }, `T${c.tiers[k]}`),
      can.includes(k) ? h('span', { class: 'upmark' }, '▲') : null);
  }));
}

/** Pick which slot gets a pending upgrade. Used on the dungeon result, the character screen and First Steps. */
export function upgradeChooser(slot, onDone) {
  const c = G.state.chars[slot], t = G.pendingUpgrade(slot);
  if (!c || !t) return null;
  const opts = G.upgradeSlots(slot, t);
  const more = c.pending.length - 1;
  return h('div', { class: 'upbox' },
    h('div', { class: 'row between' }, h('b', {}, `Gear upgrade · T${t}`), more > 0 ? h('span', { class: 'small', style: { fontWeight: 800 } }, `+${more} more waiting`) : null),
    h('div', { class: 'small', style: { fontWeight: 700 } }, `Choose one of ${c.name}'s slots to raise to T${t}. It stays at T${t} for good.`),
    h('div', { class: 'uplist' }, opts.map((k) => {
      const cmp = compareChar(c, { ...c, tiers: { ...c.tiers, [k]: t } });
      return h('button', { class: 'upopt', onclick: () => {
        if (G.chooseUpgrade(slot, k)) {
          toast({ title: `${SLOT_LABEL[k]} upgraded to T${t}`, body: gearItem(c, k).name, icon: itemIcon(gearItem(c, k).id, 26), kind: 'gold' });
          onDone?.();
        }
      } },
      itemIcon(gearItem(c, k, { tier: t }).id, 32),
      h('div', { style: { minWidth: 0 } }, h('b', {}, `${SLOT_LABEL[k]} T${c.tiers[k]} → T${t}`), h('div', { class: 'small' }, cmp || h('span', { class: 'muted' }, '—'))));
    })));
}

/** UTs that fit this class and slot, unlocked first. */
function utsFor(cls, kind) {
  const type = slotType(cls, kind);
  return ITEM_LIST.filter((it) => it.tier === 'UT' && it.slot === kind && (kind === 'ring' || it.type === type));
}

/** Tapping a gear slot: what's in it, its upgrade, ring stat choice and the UTs it can show instead. */
export function slotSheet(slot, kind, onChange) {
  openSheet((close, rerender) => {
    const c = G.state.chars[slot];
    if (!c) { close(); return []; }
    const it = gearItem(c, kind), t = c.tiers[kind];
    const done = () => { rerender(); onChange?.(); };
    const kids = [
      h('div', { class: 'ihead' }, h('div', { class: 'ibig' }, itemIcon(it.id, 54)),
        h('div', {},
          h('div', { class: 'h2', style: { color: c.ut[kind] ? 'var(--ut)' : '' } }, it.name),
          h('div', { class: 'small muted', style: { fontWeight: 700 } }, `${SLOT_LABEL[kind]} · T${t}${c.ut[kind] ? ` · unique ${typeLabel(it).toLowerCase()}` : ''}`))),
      h('div', { class: 'kv tnum' }, statLines(it).map(([k, v]) => h('div', {}, h('span', {}, k), String(v)))),
    ];
    if (it.special) kids.push(h('div', { class: 'special' }, it.special));
    if (kind === 'ability') kids.push(h('div', { class: 'small muted' }, ABILITY_TYPES[CLASS[c.cls].ability].effect));
    const up = G.pendingUpgrade(slot);
    if (up && G.upgradeSlots(slot, up).includes(kind)) kids.push(upgradeChooser(slot, done));
    else kids.push(h('div', { class: 'small muted' }, `Slot tiers go up from dungeon clears: each dungeon has a 1 in 5 chance to raise one slot to its tier.`));

    if (kind === 'ring') {
      kids.push(h('div', { class: 'label' }, `Ring stat · free to change`));
      kids.push(h('div', { class: 'classes' }, STATS.map((st) => {
        const r = ITEMS[`ring_${st}_t${t}`];
        const on = !c.ut.ring && c.ringStat === st;
        return h('button', { class: `cls${on ? ' on' : ''}`, onclick: () => { G.setRingStat(slot, st); done(); } },
          itemIcon(r.id, 26), h('span', {}, STAT_LABEL[st]), h('small', {}, Object.entries(r.bonus).filter(([, v]) => v).map(([k, v]) => `+${v} ${STAT_LABEL[k]}`).join(' ')));
      })));
    }

    const list = utsFor(c.cls, kind);
    const have = list.filter((u) => G.unlocked(u.id));
    kids.push(h('div', { class: 'row between' }, h('span', { class: 'label' }, 'Unique items'), h('span', { class: 'small muted', style: { fontWeight: 800 } }, `${have.length} / ${list.length} unlocked`)));
    if (!have.length) kids.push(h('div', { class: 'small muted' }, 'None unlocked yet. Unique items drop rarely in biomes and dungeons, and work at this slot\'s tier.'));
    const rows = [];
    if (c.ut[kind] && kind !== 'ring') {
      const plain = gearItem(c, kind, { ut: null });
      rows.push(h('div', { class: 'loot' }, h('span', { class: 'ic' }, itemIcon(plain.id, 34)),
        h('div', { style: { minWidth: 0 } }, h('b', {}, plain.name), h('span', { class: 'small muted', style: { display: 'block', fontWeight: 700 } }, compareChar(c, { ...c, ut: { ...c.ut, [kind]: null } }) || 'Same')),
        h('button', { class: 'btn sm gray', onclick: () => { G.setUt(slot, kind, null); done(); } }, 'Wear')));
    }
    for (const u of have) {
      const on = c.ut[kind] === u.id;
      const atT = gearItem(c, kind, { ut: u.id });
      rows.push(h('div', { class: `loot${on ? ' on' : ''}` }, h('span', { class: 'ic' }, itemIcon(u.id, 34)),
        h('div', { style: { minWidth: 0 } },
          h('b', { style: { color: 'var(--ut)' } }, u.name),
          h('span', { class: 'small', style: { display: 'block', fontWeight: 800 } }, u.special),
          on ? null : h('span', { class: 'small muted', style: { display: 'block', fontWeight: 700 } }, compareChar(c, { ...c, ut: { ...c.ut, [kind]: u.id } }) || `T${atT.slotTier} base stats`)),
        h('button', { class: `btn sm${on ? ' gray' : ''}`, onclick: () => { G.setUt(slot, kind, on ? null : u.id); done(); } }, on ? 'Take off' : 'Wear')));
    }
    if (rows.length) kids.push(h('div', { class: 'lootlist' }, rows));
    return kids;
  });
}
