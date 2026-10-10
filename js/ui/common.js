// Pieces shared by several screens: top bar, character list, slot purchase, new character sheet.
import { CONFIG } from '../config.js';
import { CLASS, CLASSES } from '../data/classes.js';
import { BIOME, DUNGEON } from '../data/world.js';
import { levelOf } from '../core/character.js';
import * as G from '../core/game.js';
import { h, openSheet, showDialog, toast, confirmDialog } from './dom.js';
import { heroIcon, itemIcon } from './sprites.js';
import { ITEMS, tierLabel } from '../data/items.js';

export const heroColors = (cls) => CLASS[cls].colors;

/** Survival estimate → difficulty label (high survival = low difficulty). */
export const DIFF = { high: ['Low', 'diff-low'], med: ['Moderate', 'diff-mod'], low: ['High', 'diff-high'] };
export function diffPill(est, prefix = 'Danger: ') {
  if (!est) return h('span', { class: 'pill diff-calc' }, `${prefix}…`);
  const [t, c] = DIFF[est.level];
  return h('span', { class: `pill ${c}` }, `${prefix}${t}`);
}

export function slotStatus(slot) {
  const c = G.state.chars[slot], f = G.state.farms[slot];
  if (!c) return { text: 'Empty slot', color: 'var(--ink-3)' };
  if (G.state.run?.slot === slot) return { text: DUNGEON[G.state.run.dungeonId].name, color: 'var(--gold)' };
  if (f.status === 'farming') return { text: BIOME[f.biome].name, color: 'var(--green)' };
  if (f.status === 'fallen') return { text: 'Fallen', color: 'var(--red)' };
  return { text: 'Idle', color: 'var(--ink-3)' };
}

const GEAR_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3h0a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8v0a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>';

/** The top bar: character button (opens the character list) and settings. */
export function renderTopBar(el, { onChange, onSettings }) {
  const s = G.state, c = s.chars[s.view];
  const st = slotStatus(s.view);
  const gear = h('button', { class: 'iconbtn', 'aria-label': 'Settings', onclick: onSettings });
  gear.innerHTML = GEAR_ICON;
  el.replaceChildren(
    h('button', { class: 'charbtn', onclick: () => characterList(onChange) },
      h('div', { class: 'av' }, c ? heroIcon(c.cls, heroColors(c.cls), 26) : h('span', {}, '+')),
      h('div', { style: { minWidth: 0 } },
        h('b', {}, c ? c.name : `Slot ${s.view + 1}`),
        h('span', {}, c ? `Lv ${levelOf(c.xp)} ${CLASS[c.cls].name} · ` : '', h('span', { style: { color: st.color === 'var(--ink-3)' ? 'var(--bar-dim)' : st.color } }, st.text))),
      h('span', { class: 'chev' }, '▼')),
    h('div', { class: 'spacer' }),
    G.goalsFinished() ? null : goalButton(onChange),
    gear);
}

const FLAG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 21V4"/><path d="M5 4h11l-2 4 2 4H5"/></svg>';
function goalButton(onChange) {
  const n = G.goalsClaimable();
  const b = h('button', { class: `iconbtn${n ? ' ready' : ''}`, 'aria-label': 'First Steps', onclick: () => goalsSheet(onChange) });
  b.innerHTML = FLAG + (n ? `<i class="dot">${n}</i>` : '');
  return b;
}
function rewardText(g) {
  if (g.reward.potions) return `${g.reward.potions} potions`;
  return g.reward.gear === 'ring' ? `T${g.reward.tier} ring` : `T${g.reward.tier} ${g.reward.gear}`;
}
export function goalsSheet(onChange) {
  openSheet((close, rerender) => {
    const list = G.goalList();
    const done = list.filter((g) => g.claimed).length;
    return [
      h('div', { class: 'row between' }, h('div', { class: 'h2' }, 'First Steps'), h('span', { class: 'small muted', style: { fontWeight: 800 } }, `${done} / ${list.length}`)),
      h('div', { class: 'list' }, list.map((g) => h('div', { class: `goal${g.claimed ? ' done' : ''}` },
        h('span', { class: 'chk' }, g.claimed ? '✓' : g.ready ? '!' : ''),
        h('div', { class: 'grow' }, h('b', {}, g.text), h('div', { class: 'small muted' }, rewardText(g))),
        g.ready ? h('button', { class: 'btn sm', onclick: () => {
          const ids = G.claimGoal(g.id);
          for (const id of ids.slice(0, 3)) toast({ title: 'Reward', body: `${ITEMS[id].name} ${tierLabel(ITEMS[id])}`.trim(), icon: itemIcon(id, 26), kind: 'gold' });
          rerender(); onChange?.();
        } }, 'Claim') : null))),
    ];
  });
}

export function characterList(onChange) {
  openSheet((close) => [
    h('div', { class: 'row between' }, h('div', { class: 'h2' }, 'Characters'), h('span', { class: 'small muted' }, `${G.state.chars.filter(Boolean).length} / ${G.state.slots} slots`)),
    h('div', { class: 'list' }, G.state.chars.map((c, i) => {
      const st = slotStatus(i);
      return h('button', { class: `pick${G.state.view === i ? ' on' : ''}`, onclick: () => { G.state.view = i; close(); if (!c) newCharacterSheet(i, onChange); onChange(); } },
        h('div', { class: 'ic' }, c ? heroIcon(c.cls, heroColors(c.cls), 30) : h('b', { class: 'muted' }, '+')),
        h('div', {}, h('b', {}, c ? c.name : `Slot ${i + 1}`), h('div', { class: 'small muted' }, c ? `${CLASS[c.cls].name} · Lv ${levelOf(c.xp)}` : 'Create a character')),
        h('span', { class: 'small', style: { fontWeight: 900, color: st.color } }, c ? st.text : ''));
    })),
    G.state.slots < CONFIG.maxSlots ? h('button', { class: 'btn gray', onclick: () => { close(); buySlot(onChange); } }, `+ Add a slot · ${CONFIG.slotPriceLabel}`) : null,
  ]);
}

export function buySlot(onChange) {
  showDialog((close) => [
    h('h2', {}, 'New character slot'),
    h('p', { class: 'muted', style: { margin: 0, textAlign: 'center' } }, `Every slot farms at the same time. ${CONFIG.slotPriceLabel}, one time.`),
    h('p', { class: 'small', style: { margin: 0, textAlign: 'center', color: 'var(--gold-dark)', fontWeight: 800 } }, 'Test build: no payment is taken.'),
    h('div', { class: 'row' },
      h('button', { class: 'btn gray grow', onclick: close }, 'Not now'),
      h('button', { class: 'btn grow', onclick: () => { close(); if (G.addSlot('purchase')) { toast({ title: 'Slot added', body: `You now have ${G.state.slots} slots.`, kind: 'gold' }); onChange?.(); } } }, `Buy · ${CONFIG.slotPriceLabel}`)),
  ]);
}

export function unlockText(cls) {
  const C = CLASS[cls];
  return C.parent ? `${CLASS[C.parent].name} Lv ${CONFIG.classUnlockLevel}` : '';
}

export function newCharacterSheet(slot, after) {
  let pick = CLASSES.find((c) => G.classUnlocked(c.id)).id;
  let name = '';
  openSheet((close, rerender) => {
    const C = CLASS[pick];
    return [
      h('div', { class: 'h2' }, G.state.chars[slot] ? 'Replace character' : 'New character'),
      h('div', { class: 'classes' }, CLASSES.map((k) => {
        const ok = G.classUnlocked(k.id);
        return h('button', { class: `cls${ok ? '' : ' lock'}${pick === k.id ? ' on' : ''}`, onclick: () => { if (ok) { pick = k.id; rerender(); } } },
          heroIcon(k.id, k.colors, 34), h('span', {}, k.name), ok ? null : h('small', {}, `🔒 ${unlockText(k.id)}`));
      })),
      h('div', { class: 'panel small' }, h('b', {}, C.name), ` · ${C.blurb}`),
      h('input', { id: 'new-name', maxlength: 16, placeholder: 'Name (optional)', value: name, oninput: (e) => { name = e.target.value; } }),
      h('button', { class: 'btn', onclick: async () => {
        const old = G.state.chars[slot];
        if (old && !(await confirmDialog({ title: `Retire ${old.name}?`, body: 'Their gear goes back to the vault. Potions they drank and their level are lost.', ok: 'Retire', danger: true }))) return;
        const c = G.createCharacterIn(slot, pick, name);
        G.startFarming(slot, 'forest');
        G.state.view = slot; close();
        toast({ title: `${c.name} the ${CLASS[c.cls].name}`, icon: heroIcon(c.cls, heroColors(c.cls), 28), kind: 'gold' });
        after?.();
      } }, `Create ${C.name}`),
    ];
  });
}
