// Screen 3: the vault, which is also the collection book.
import { STATS, STAT_NAME } from '../data/classes.js';
import { ITEM_LIST, ITEMS, CATEGORIES, ARMOR_TYPES, ABILITY_LABEL, MAX_TIER } from '../data/items.js';
import * as G from '../core/game.js';
import { h, confirmDialog, toast, fmtNum } from './dom.js';
import { itemIcon } from './sprites.js';
import { openItemSheet } from './itemSheet.js';

const WEAPON_CAT = { Staves: 'staff', Wands: 'wand', Bows: 'bow', Swords: 'sword', Daggers: 'dagger' };
const tiered = (type) => Array.from({ length: MAX_TIER }, (_, i) => `${type}_t${i + 1}`);
const uts = (type) => ITEM_LIST.filter((it) => it.tier === 'UT' && it.type === type).map((it) => it.id);

function sections(cat) {
  if (WEAPON_CAT[cat]) { const t = WEAPON_CAT[cat]; return [[cat, [...tiered(t), ...uts(t)]]]; }
  if (cat === 'Armor') return Object.entries(ARMOR_TYPES).map(([t, A]) => [`${A.label === 'Robe' ? 'Robes' : A.label}`, [...tiered(t), ...uts(t)]]);
  if (cat === 'Abilities') return Object.entries(ABILITY_LABEL).map(([t, l]) => [`${l}s`, [...tiered(t), ...uts(t)]]);
  if (cat === 'Rings') return [...STATS.map((st) => [`Rings of ${STAT_NAME[st]}`, Array.from({ length: MAX_TIER }, (_, i) => `ring_${st}_t${i + 1}`)]), ['Unique rings', uts('ring')]];
  return [['Potions', STATS.map((st) => `pot_${st}`)], ['Runes', ['rune_sword', 'rune_shield', 'rune_helm']]];
}

export function createVaultScreen(root) {
  let cat = 'Staves';
  try { cat = localStorage.getItem('idle-vault-cat') || cat; } catch {}

  function render() {
    const s = G.state;
    const gear = ITEM_LIST.filter((it) => it.slot !== 'potion' && it.slot !== 'rune');
    const found = gear.filter((it) => G.discovered(it.id)).length;
    const prev = G.dismantleAllPreview();
    const kids = [
      h('div', { class: 'row between' },
        h('div', {}, h('div', { class: 'h1' }, 'Vault'), h('div', { class: 'small muted tnum' }, `${found} of ${gear.length} items discovered`)),
        h('div', { style: { textAlign: 'right' } }, h('div', { class: 'ess', style: { fontSize: '16px' } }, `◆ ${fmtNum(s.essence)}`), h('div', { class: 'small muted' }, 'Essence'))),
      h('button', { class: 'btn ghost sm', disabled: !prev.copies, onclick: async () => {
        if (await confirmDialog({ title: 'Dismantle duplicates?', body: `${fmtNum(prev.copies)} spare copies become ${fmtNum(prev.essence)} Essence. One copy of every item is kept, and equipped gear is never touched. Potions are not included.`, ok: 'Dismantle', danger: true })) {
          const gain = G.dismantleAll(); toast({ title: `+${fmtNum(gain)} Essence`, body: 'Duplicates dismantled.', kind: 'gold' }); render();
        }
      } }, prev.copies ? `Dismantle ${fmtNum(prev.copies)} duplicate${prev.copies === 1 ? '' : 's'} · ` : 'No duplicates to dismantle', prev.copies ? h('span', { class: 'ess' }, `+◆${fmtNum(prev.essence)}`) : null),
      h('div', { class: 'cats' }, CATEGORIES.map((c) => {
        const hasNew = Object.keys(s.newIds).some((id) => ITEMS[id]?.cat === c);
        return h('button', { class: `cat${c === cat ? ' on' : ''}`, onclick: () => { cat = c; try { localStorage.setItem('idle-vault-cat', c); } catch {} render(); root.scrollTop = 0; } }, c, hasNew ? ' •' : '');
      })),
    ];
    for (const [title, ids] of sections(cat)) {
      if (!ids.length) continue;
      const n = ids.filter((id) => G.discovered(id)).length;
      kids.push(h('div', { class: 'vsec' }, h('span', {}, title), h('small', {}, `${n}/${ids.length}`)));
      kids.push(h('div', { class: 'grid' }, ids.map((id) => {
        const it = ITEMS[id], known = G.discovered(id);
        return h('button', { class: `tile${it.tier === 'UT' ? ' ut' : ''}${known ? '' : ' unk'}${s.newIds[id] ? ' new' : ''}`, 'aria-label': known ? it.name : 'Undiscovered item', onclick: () => { openItemSheet(id); render(); } },
          itemIcon(id, 34, !known));
      })));
    }
    root.replaceChildren(...kids);
  }
  return { render, frame() {} };
}
