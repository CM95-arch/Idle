// Screen 3: the vault. Unique items are account-wide unlocks (any character that can use one may wear it);
// potions and runes are stacks. Tiered gear isn't kept here: it lives on each character as slot tiers.
import { CLASS, STATS } from '../data/classes.js';
import { ITEM_LIST, ITEMS, ARMOR_TYPES, ABILITY_LABEL, WEAPON_TYPES } from '../data/items.js';
import * as G from '../core/game.js';
import { h } from './dom.js';
import { itemIcon } from './sprites.js';
import { openItemSheet } from './itemSheet.js';

const uts = (type) => ITEM_LIST.filter((it) => it.tier === 'UT' && it.type === type).map((it) => it.id);
const plural = (l) => ({ Staff: 'Staves', 'Leather Armor': 'Leather', 'Heavy Armor': 'Heavy' }[l] || `${l}s`);

const CATS = {
  weapon: { label: 'Weapons', subs: Object.keys(WEAPON_TYPES).map((t) => [t, plural(WEAPON_TYPES[t].label)]) },
  armor: { label: 'Armor', subs: Object.keys(ARMOR_TYPES).map((t) => [t, plural(ARMOR_TYPES[t].label)]) },
  ability: { label: 'Abilities', subs: Object.keys(ABILITY_LABEL).map((t) => [t, plural(ABILITY_LABEL[t])]) },
  ring: { label: 'Rings', subs: [['ring', 'Rings']] },
  potion: { label: 'Potions', subs: [['potion', 'Potions'], ['rune', 'Runes']] },
};
function idsFor(cat, sub) {
  if (cat === 'potion') return sub === 'rune' ? ['rune_sword', 'rune_shield', 'rune_helm'] : STATS.map((st) => `pot_${st}`);
  return uts(sub);
}
const classSub = (cat) => { const c = G.state.chars[G.state.view]; const C = c && CLASS[c.cls]; return C && { weapon: C.weapon, armor: C.armor, ability: C.ability, ring: 'ring' }[cat]; };

export function createVaultScreen(root) {
  let cat = 'weapon', sub = null;

  function tile(id) {
    const s = G.state, it = ITEMS[id], known = G.discovered(id), c = s.chars[s.view];
    const stack = it.slot === 'potion' || it.slot === 'rune';
    const isEq = !stack && c && Object.values(c.ut).includes(id);
    const own = G.owned(id);
    const cls = ['tile', isEq ? 'on' : '', stack ? '' : 'ut', known ? '' : 'unk', stack && known && !own ? 'none' : '', s.newIds[id] ? 'new' : ''].filter(Boolean).join(' ');
    return h('button', { class: cls, 'aria-label': known ? it.name : 'Undiscovered', onclick: () => openItemSheet(id, () => render()) },
      itemIcon(id, 34, !known),
      isEq ? h('span', { class: 'eq' }, '✓') : null,
      known && stack && !s.newIds[id] ? h('span', { class: 'tl' }, `×${own}`) : null);
  }

  function render() {
    const s = G.state, c = s.chars[s.view];
    root.classList.remove('fit');
    if (!sub || !CATS[cat].subs.some(([k]) => k === sub)) sub = classSub(cat) || CATS[cat].subs[0][0];
    const all = ITEM_LIST.filter((it) => it.tier === 'UT');
    const found = all.filter((it) => G.discovered(it.id)).length;
    const kids = [
      h('div', { class: 'row between' }, h('div', { class: 'h1' }, 'Vault'), h('span', { class: 'small muted tnum', style: { fontWeight: 800 } }, `${found} / ${all.length} uniques`)),
      h('div', { class: 'seg' }, Object.keys(CATS).map((k) => h('button', { class: k === cat ? 'on' : '', onclick: () => { cat = k; sub = null; render(); root.scrollTop = 0; } }, CATS[k].label))),
    ];
    const subs = CATS[cat].subs;
    if (subs.length > 1) kids.push(h('div', { class: 'chips' }, subs.map(([k, l]) => {
      const mine = c && k === classSub(cat);
      const hasNew = idsFor(cat, k).some((id) => s.newIds[id]);
      return h('button', { class: `chip${k === sub ? ' on' : ''}`, onclick: () => { sub = k; render(); } }, l, mine ? ' ★' : '', hasNew ? ' •' : '');
    })));
    const ids = idsFor(cat, sub);
    const n = ids.filter((id) => G.discovered(id)).length;
    const title = (subs.find(([k]) => k === sub) || [, ''])[1];
    kids.push(h('div', { class: 'vsec' }, h('span', {}, cat === 'potion' ? title : `Unique ${title.toLowerCase()}`), h('small', {}, cat === 'potion' ? '' : `${n} / ${ids.length}`)));
    kids.push(h('div', { class: 'vgrid' }, ids.map(tile)));
    if (cat !== 'potion') kids.push(h('p', { class: 'small muted', style: { fontWeight: 700 } }, 'Unlocked uniques can be worn by any of your characters that can use them, at that character\'s slot tier. Tap a gear slot to swap.'));
    root.replaceChildren(...kids);
  }
  return { render, frame() {} };
}
