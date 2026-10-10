// Screen 3: the vault. Gear from dungeons (safe here, even if a character falls), potions, runes,
// the unique-item collection with reforging, and essence.
import { CLASS, STATS } from '../data/classes.js';
import { ITEM_LIST, ITEMS, tierLabel } from '../data/items.js';
import * as G from '../core/game.js';
import { h, toast, fmtNum, showDialog } from './dom.js';
import { itemIcon } from './sprites.js';
import { openItemSheet } from './itemSheet.js';

const CATS = {
  weapon: 'Weapons', ability: 'Abilities', armor: 'Armor', ring: 'Rings', ut: 'Uniques', potion: 'Potions',
};
const value = (it) => (it.tier === 'UT' ? it.eq + 0.5 : it.tier || 0);

function idsFor(cat) {
  if (cat === 'potion') return [...STATS.map((st) => `pot_${st}`), 'rune_sword', 'rune_shield', 'rune_helm'];
  if (cat === 'ut') return ITEM_LIST.filter((it) => it.tier === 'UT').map((it) => it.id);
  return ITEM_LIST.filter((it) => it.slot === cat && G.owned(it.id) > 0).sort((a, b) => value(b) - value(a)).map((it) => it.id);
}

export function createVaultScreen(root) {
  let cat = 'weapon';

  function tile(id) {
    const s = G.state, it = ITEMS[id], known = G.discovered(id), own = G.owned(id);
    const ut = it.tier === 'UT', stack = it.slot === 'potion' || it.slot === 'rune';
    const up = !stack && own > 0 && G.isUpgrade(s.view, id);
    const cls = ['tile', ut ? 'ut' : '', known ? '' : 'unk', (stack || ut) && known && !own ? 'none' : '', s.newIds[id] ? 'new' : ''].filter(Boolean).join(' ');
    return h('button', { class: cls, 'aria-label': known ? it.name : 'Undiscovered', onclick: () => openItemSheet(id, () => render()) },
      itemIcon(id, 34, !known),
      up ? h('span', { class: 'up' }, '▲') : null,
      known && !s.newIds[id] ? h('span', { class: 'tl' }, stack ? `×${own}` : ut ? (own ? `×${own}` : '') : `${tierLabel(it)}${own > 1 ? ` ×${own}` : ''}`) : null);
  }

  function salvageDialog() {
    let max = 3;
    showDialog((close, rerender) => {
      const ids = ITEM_LIST.filter((it) => typeof it.tier === 'number' && G.isGear(it.id) && it.tier <= max && G.owned(it.id) > 0);
      const n = ids.reduce((a, it) => a + G.owned(it.id), 0), gain = ids.reduce((a, it) => a + G.owned(it.id) * G.salvageValue(it.id), 0);
      return [
        h('h2', {}, 'Salvage gear'),
        h('p', { class: 'muted', style: { margin: 0, textAlign: 'center' } }, 'Turn vault gear into essence. Uniques and worn gear are never touched.'),
        h('div', { class: 'row', style: { justifyContent: 'center', gap: '12px' } },
          h('button', { class: 'btn gray sm', onclick: () => { max = Math.max(1, max - 1); rerender(); } }, '−'),
          h('b', { style: { fontSize: '18px' } }, `T${max} and below`),
          h('button', { class: 'btn gray sm', onclick: () => { max = Math.min(20, max + 1); rerender(); } }, '+')),
        h('div', { style: { textAlign: 'center', fontWeight: 800 } }, `${n} item${n === 1 ? '' : 's'} → +${fmtNum(gain)} ✦`),
        h('button', { class: 'btn', disabled: !n, onclick: () => { let got = 0; for (const it of ids) got += G.salvage(it.id, G.owned(it.id)); toast({ title: `+${fmtNum(got)} essence` }); close(); render(); } }, 'Salvage'),
        h('button', { class: 'btn gray', onclick: close }, 'Cancel'),
      ];
    });
  }

  function render() {
    const s = G.state, c = s.chars[s.view];
    root.classList.remove('fit');
    const uts = ITEM_LIST.filter((it) => it.tier === 'UT');
    const kids = [
      h('div', { class: 'row between' }, h('div', { class: 'h1' }, 'Vault'),
        h('span', { class: 'pill', style: { background: '#2b333e', color: '#ffe08a', fontWeight: 900 } }, `✦ ${fmtNum(s.essence)} essence`)),
      h('div', { class: 'seg' }, Object.entries(CATS).map(([k, l]) => h('button', { class: k === cat ? 'on' : '', onclick: () => { cat = k; render(); root.scrollTop = 0; } }, l))),
    ];
    const ids = idsFor(cat);
    if (cat === 'ut') {
      kids.push(h('div', { class: 'vsec' }, h('span', {}, 'Unique items'), h('small', {}, `${uts.filter((it) => G.discovered(it.id)).length} / ${uts.length} found`)));
      kids.push(h('div', { class: 'small muted', style: { fontWeight: 700 } }, 'Found uniques can be reforged for essence any time, even after one is lost.'));
    } else if (cat === 'potion') kids.push(h('div', { class: 'vsec' }, h('span', {}, 'Potions and runes'), h('small', {}, '')));
    else {
      const C = c && CLASS[c.cls];
      kids.push(h('div', { class: 'vsec' }, h('span', {}, CATS[cat]), h('small', {}, C ? `▲ = upgrade for ${c.name}` : '')));
      if (!ids.length) kids.push(h('div', { class: 'panel small muted', style: { textAlign: 'center' } }, 'Nothing here yet. Gear only drops in dungeons.'));
    }
    if (ids.length) kids.push(h('div', { class: 'vgrid' }, ids.map(tile)));
    if (['weapon', 'ability', 'armor', 'ring'].includes(cat)) kids.push(h('button', { class: 'btn gray sm', style: { marginTop: '6px' }, onclick: salvageDialog }, 'Salvage gear for essence…'));
    root.replaceChildren(...kids);
  }
  return { render, frame() {} };
}
