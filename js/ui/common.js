// Pieces shared by several screens: character chips, slot purchase, new character sheet.
import { CONFIG } from '../config.js';
import { CLASS, CLASSES } from '../data/classes.js';
import { BIOME, DUNGEON } from '../data/world.js';
import { ITEMS, tierLabel } from '../data/items.js';
import { levelOf } from '../core/character.js';
import * as G from '../core/game.js';
import { h, openSheet, showDialog, toast, confirmDialog } from './dom.js';
import { heroIcon, itemIcon } from './sprites.js';

export const heroColors = (cls) => CLASS[cls].colors;

export function slotStatus(slot) {
  const c = G.state.chars[slot], f = G.state.farms[slot];
  if (!c) return { text: 'Empty slot', cls: '' };
  if (G.state.run?.slot === slot) return { text: `● ${DUNGEON[G.state.run.dungeonId].name}`, cls: 'st-dungeon' };
  if (f.status === 'farming') return { text: `● ${BIOME[f.biome].name}`, cls: 'st-farming' };
  if (f.status === 'fallen') return { text: '✕ Fell · tap to restart', cls: 'st-fallen' };
  return { text: 'Resting in town', cls: '' };
}

export function chips(onPick, { showAdd = true } = {}) {
  const wrap = h('div', { class: 'chips' });
  G.state.chars.forEach((c, i) => {
    const st = slotStatus(i);
    wrap.append(h('button', { class: `chip${G.state.view === i ? ' on' : ''}`, onclick: () => { G.state.view = i; onPick(i); } },
      h('div', { class: 'av' }, c ? heroIcon(c.cls, heroColors(c.cls), 26) : h('span', { class: 'muted' }, '+')),
      h('div', {}, h('b', {}, c ? `${c.name} · ${CLASS[c.cls].name}` : `Slot ${i + 1}`), h('span', { class: st.cls }, c ? st.text : 'Create a character'))));
  });
  if (showAdd && G.state.slots < CONFIG.maxSlots) wrap.append(h('button', { class: 'chip add', onclick: buySlot }, `+ Slot · ${CONFIG.slotPriceLabel}`));
  return wrap;
}

export function buySlot() {
  showDialog((close) => [
    h('h2', {}, 'New character slot'),
    h('p', { class: 'muted', style: { margin: 0, textAlign: 'center' } }, `Every slot farms at the same time, so each one adds a full character's worth of loot. ${CONFIG.slotPriceLabel}, one time.`),
    h('p', { class: 'small', style: { margin: 0, textAlign: 'center', color: 'var(--ember)' } }, 'Test build: no payment is taken.'),
    h('div', { class: 'row' },
      h('button', { class: 'btn ghost grow', onclick: close }, 'Not now'),
      h('button', { class: 'btn grow', onclick: () => { close(); if (G.addSlot('purchase')) { toast({ title: 'Slot added', body: `You now have ${G.state.slots} slots.`, kind: 'gold' }); G.emitUi('changed', {}); } } }, `Buy · ${CONFIG.slotPriceLabel}`)),
  ]);
}

export function unlockText(cls) {
  const C = CLASS[cls];
  if (!C.parent) return 'Unlocked';
  return `${CLASS[C.parent].name} Lv ${CONFIG.classUnlockLevel}`;
}

export function newCharacterSheet(slot, after) {
  let pick = CLASSES.find((c) => G.classUnlocked(c.id)).id;
  let name = '';
  openSheet((close, rerender) => {
    const C = CLASS[pick];
    return [
      h('div', { class: 'title', style: { fontSize: '18px' } }, G.state.chars[slot] ? 'Replace character' : 'New character'),
      h('div', { class: 'classes' }, CLASSES.map((k) => {
        const ok = G.classUnlocked(k.id);
        return h('button', { class: `cls${ok ? '' : ' lock'}${pick === k.id ? ' on' : ''}`, onclick: () => { if (ok) { pick = k.id; rerender(); } } },
          heroIcon(k.id, k.colors, 34), h('span', {}, k.name), h('small', {}, ok ? '' : `🔒 ${unlockText(k.id)}`));
      })),
      h('div', { class: 'card small' }, h('b', {}, C.name), ' · ', C.blurb, h('div', { class: 'muted', style: { marginTop: '4px' } }, `Uses ${ITEMS[`${C.weapon}_t1`].name.split(' ').pop()}s, ${C.ability === 'seal' ? 'seals' : `${C.ability}s`} and ${C.armor === 'heavy' ? 'heavy armor' : C.armor === 'leather' ? 'leather armor' : 'robes'}. Starts with T1 gear.`)),
      h('label', { class: 'small muted', for: 'new-name' }, 'Name'),
      h('input', { id: 'new-name', maxlength: 16, placeholder: 'Leave blank for a random name', value: name, oninput: (e) => { name = e.target.value; },
        style: { background: 'var(--well)', border: '1px solid var(--seam)', borderRadius: '10px', padding: '10px 12px', color: 'var(--parchment)', font: 'inherit', userSelect: 'text', WebkitUserSelect: 'text' } }),
      G.state.chars[slot] ? h('p', { class: 'small', style: { margin: 0, color: 'var(--low)' } }, `${G.state.chars[slot].name}'s gear returns to the vault. Potions they drank are lost.`) : null,
      h('button', { class: 'btn', onclick: async () => {
        const old = G.state.chars[slot];
        if (old && !(await confirmDialog({ title: `Retire ${old.name}?`, body: 'Their gear goes back to the vault. Potions they drank and their level are lost.', ok: 'Retire', danger: true }))) return;
        const c = G.createCharacterIn(slot, pick, name);
        G.startFarming(slot, 'forest');
        G.state.view = slot; close();
        toast({ title: `${c.name} the ${CLASS[c.cls].name}`, body: 'Started farming in the Forest.', icon: heroIcon(c.cls, heroColors(c.cls), 28), kind: 'gold' });
        after?.();
      } }, `Create ${C.name}`),
    ];
  });
}

/** Small row of item icons */
export function itemRow(ids, { newIds = [], onTap } = {}) {
  return h('div', { class: 'drops' }, ids.map((id) => h('button', { class: `d${newIds.includes(id) ? ' new' : ''}`, onclick: () => onTap?.(id), title: `${ITEMS[id].name} ${tierLabel(ITEMS[id])}` }, itemIcon(id, 24))));
}
export const levelText = (c) => `Lv ${levelOf(c.xp)}`;
