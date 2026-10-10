// Screen 3: the vault and collection book. Also the place you pick gear: tapping a gear slot opens it here.
import { CLASS, STATS, STAT_NAME, STAT_LABEL } from '../data/classes.js';
import { ITEM_LIST, ITEMS, ARMOR_TYPES, ABILITY_LABEL, WEAPON_TYPES, MAX_TIER, tierLabel, typeLabel } from '../data/items.js';
import * as G from '../core/game.js';
import { h, toast, confirmDialog } from './dom.js';
import { itemIcon } from './sprites.js';
import { openItemSheet } from './itemSheet.js';

const tiered = (type) => Array.from({ length: MAX_TIER }, (_, i) => `${type}_t${i + 1}`);
const uts = (type) => ITEM_LIST.filter((it) => it.tier === 'UT' && it.type === type).map((it) => it.id);
const plural = (l) => ({ Staff: 'Staves', 'Leather Armor': 'Leather', 'Heavy Armor': 'Heavy' }[l] || `${l}s`);

const CATS = {
  weapon: { label: 'Weapons', subs: Object.keys(WEAPON_TYPES).map((t) => [t, plural(WEAPON_TYPES[t].label)]) },
  armor: { label: 'Armor', subs: Object.keys(ARMOR_TYPES).map((t) => [t, plural(ARMOR_TYPES[t].label)]) },
  ability: { label: 'Abilities', subs: Object.keys(ABILITY_LABEL).map((t) => [t, plural(ABILITY_LABEL[t])]) },
  ring: { label: 'Rings', subs: [...STATS.map((st) => [st, STAT_LABEL[st]]), ['ut', 'Unique']] },
  potion: { label: 'Potions', subs: [['potion', 'Potions'], ['rune', 'Runes']] },
};
function idsFor(cat, sub) {
  if (cat === 'ring') return sub === 'ut' ? uts('ring') : tiered(`ring_${sub}`);
  if (cat === 'potion') return sub === 'rune' ? ['rune_sword', 'rune_shield', 'rune_helm'] : STATS.map((st) => `pot_${st}`);
  return [...tiered(sub), ...uts(sub)];
}
const classSub = (cat) => { const c = G.state.chars[G.state.view]; const C = c && CLASS[c.cls]; return C && { weapon: C.weapon, armor: C.armor, ability: C.ability }[cat]; };

export function createVaultScreen(root, app) {
  let cat = 'weapon', sub = null, mode = null; // mode: { slot, kind, back }

  function openEquip(slot, kind, back) {
    mode = { slot, kind, back };
    cat = kind; sub = kind === 'ring' ? (sub && CATS.ring.subs.some(([k]) => k === sub) ? sub : 'att') : classSub(kind);
  }

  function tile(id) {
    const s = G.state, it = ITEMS[id], known = G.discovered(id), c = s.chars[s.view];
    const own = G.owned(id), isEq = c && Object.values(c.equip).includes(id);
    const up = known && own > 0 && c && G.isUpgrade(s.view, id);
    const potion = it.slot === 'potion' || it.slot === 'rune';
    const cls = ['tile', isEq ? 'on' : '', it.tier === 'UT' ? 'ut' : '', known ? '' : 'unk', known && !own && !isEq ? 'none' : '', s.newIds[id] ? 'new' : ''].filter(Boolean).join(' ');
    return h('button', { class: cls, 'aria-label': known ? it.name : 'Undiscovered', onclick: () => tap(id) },
      itemIcon(id, 34, !known),
      up ? h('span', { class: 'up' }, '▲') : null,
      known && G.canFuse(id) ? h('span', { class: 'fz' }, '⇧') : null,
      isEq ? h('span', { class: 'eq' }, '✓') : null,
      known && !s.newIds[id] ? h('span', { class: 'tl' }, potion ? `×${own}` : tierLabel(it)) : null);
  }

  function tap(id) {
    const it = ITEMS[id];
    if (mode && G.discovered(id) && G.owned(id) > 0 && it.slot === mode.kind && G.canUse(G.state.chars[mode.slot].cls, id)) {
      G.equip(mode.slot, id);
      delete G.state.newIds[id];
      toast({ title: 'Equipped', body: it.name, icon: itemIcon(id, 26) });
      const back = mode.back; mode = null;
      app.nav(back || 'farm');
      return;
    }
    openItemSheet(id, () => render());
  }

  function render() {
    const s = G.state, c = s.chars[s.view];
    root.classList.remove('fit');
    if (!sub || !CATS[cat].subs.some(([k]) => k === sub)) sub = classSub(cat) || CATS[cat].subs[0][0];
    const gear = ITEM_LIST.filter((it) => it.slot !== 'potion' && it.slot !== 'rune');
    const found = gear.filter((it) => G.discovered(it.id)).length;
    const kids = [];
    if (mode) {
      const label = mode.kind === 'ring' ? 'ring' : typeLabel({ type: { weapon: CLASS[c.cls].weapon, armor: CLASS[c.cls].armor, ability: CLASS[c.cls].ability }[mode.kind] }).toLowerCase();
      kids.push(h('div', { class: 'equipbar' },
        h('div', { class: 'grow' }, h('b', {}, `Pick a ${label} for ${c.name}`), h('div', { class: 'small muted' }, 'Tap an item to equip it')),
        c.equip[mode.kind] ? h('button', { class: 'btn gray sm', onclick: () => { G.unequip(mode.slot, mode.kind); render(); } }, 'Unequip') : null,
        h('button', { class: 'btn gray sm', onclick: () => { const back = mode.back; mode = null; app.nav(back || 'farm'); } }, 'Done')));
    } else {
      kids.push(h('div', { class: 'row between' }, h('div', { class: 'h1' }, 'Vault'), h('span', { class: 'small muted tnum', style: { fontWeight: 800 } }, `${found} / ${gear.length} discovered`)));
    }
    const cats = mode ? [mode.kind] : Object.keys(CATS);
    if (!mode) kids.push(h('div', { class: 'seg' }, cats.map((k) => h('button', { class: k === cat ? 'on' : '', onclick: () => { cat = k; sub = null; render(); root.scrollTop = 0; } }, CATS[k].label))));
    const subs = mode && mode.kind !== 'ring' ? CATS[cat].subs.filter(([k]) => k === sub) : CATS[cat].subs;
    if (subs.length > 1) kids.push(h('div', { class: 'chips' }, subs.map(([k, l]) => {
      const mine = c && k === classSub(cat);
      const hasNew = idsFor(cat, k).some((id) => s.newIds[id]);
      return h('button', { class: `chip${k === sub ? ' on' : ''}`, onclick: () => { sub = k; render(); } }, l, mine ? ' ★' : '', hasNew ? ' •' : '');
    })));
    const ids = idsFor(cat, sub);
    const n = ids.filter((id) => G.discovered(id)).length;
    const title = cat === 'ring' && sub !== 'ut' ? `Rings of ${STAT_NAME[sub]}` : (CATS[cat].subs.find(([k]) => k === sub) || [, ''])[1];
    kids.push(h('div', { class: 'vsec' }, h('span', {}, title), h('small', {}, cat === 'potion' ? '' : `${n} / ${ids.length}`)));
    kids.push(h('div', { class: 'vgrid' }, ids.map(tile)));
    if (!mode && cat !== 'potion') {
      const fusable = ids.filter((id) => G.fuseTarget(id) && G.owned(id) >= 4).length;
      if (fusable) kids.push(h('button', { class: 'btn gray sm', style: { marginTop: '6px' }, onclick: async () => {
        if (await confirmDialog({ title: 'Fuse extras?', body: 'Every 3 spare copies here become 1 copy of the next tier. One copy of each item is kept.', ok: 'Fuse' })) {
          const n = G.fuseAll(ids); toast({ title: `Fused ${n} item${n === 1 ? '' : 's'}`, kind: 'gold' }); render();
        }
      } }, 'Fuse extras ↑'));
    }
    root.replaceChildren(...kids);
  }
  return { render, frame() {}, openEquip, leaveEquip() { mode = null; } };
}
