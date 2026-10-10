// Screen 2: the dungeon list. Dungeons are active bullet-hell runs and the only place gear drops.
import { CONFIG } from '../config.js';
import { CLASS } from '../data/classes.js';
import { DUNGEONS, DUNGEON } from '../data/world.js';
import { ITEMS, tierLabel, typeLabel } from '../data/items.js';
import { gearItem, GEAR_SLOTS } from '../core/character.js';
import { bagOf } from '../core/loot.js';
import * as G from '../core/game.js';
import { h, openSheet, confirmDialog, showDialog, fmtDur, fmtNum } from './dom.js';
import { draw, itemIcon } from './sprites.js';
import { newCharacterSheet } from './common.js';
import { openItemSheet } from './itemSheet.js';
import { playDungeon } from './arena.js';

const GROUPS = [['Early', 0, 5], ['Mid', 5, 11], ['Late', 11, 15], ['Endgame · runes', 15, 18]];
const RUNES = [['rune_sword', 'Lost Halls'], ['rune_shield', 'The Void'], ['rune_helm', 'The Shatters']];
const BAGC = { brown: '#a07a50', pink: '#ff9ad0', purple: '#b88aff', cyan: '#7cf0ff', gold: '#ffe08a', white: '#ffffff' };

function thumb(d, size = 74) {
  const sc = d.bossSprite === 'snake' ? 3 : 4;
  return h('div', { class: 'thumb', style: { width: `${size}px`, height: `${Math.round(size * 0.8)}px`, background: `radial-gradient(circle at 50% 35%, ${d.pal.bg}, #0b090e 85%)` } }, (() => {
    const cv = draw(d.bossSprite, sc, d.pal); const out = cv.cloneNode(); out.getContext('2d').drawImage(cv, 0, 0); out.className = 'spr'; return out;
  })());
}
const skulls = (i) => { const n = Math.min(5, 1 + Math.floor((i / DUNGEONS.length) * 5)); return h('span', { class: 'skulls' }, h('i', {}, '☠'.repeat(n)), '☠'.repeat(5 - n)); };
/** Average tier of what a character wears (starter gear counts as T1, an empty ring as 0). */
function gearTier(c) {
  const ts = GEAR_SLOTS.map((k) => { const it = gearItem(c, k); return !it ? 0 : it.tier === 'UT' ? it.eq : it.tier; });
  return ts.reduce((a, b) => a + b, 0) / ts.length;
}

export function createDungeonScreen(root, app) {
  function enter(d) {
    const slot = G.state.view, c = G.state.chars[slot];
    const worn = GEAR_SLOTS.map((k) => c.equip[k]).filter(Boolean);
    confirmDialog({
      title: `Enter ${d.name}?`,
      body: worn.length
        ? `If ${c.name} falls here, they go back to level 1 and lose what they wear: ${worn.map((id) => ITEMS[id].name).join(', ')}. You can retreat any time and keep everything.`
        : `If ${c.name} falls here, they go back to level 1 (they only wear starter gear, so no items are at risk). You can retreat any time.`,
      ok: 'Enter',
      danger: worn.length > 0,
    }).then((yes) => {
      if (!yes) return;
      const info = G.beginDungeon(slot, d.id);
      if (!info) return;
      playDungeon(info, (outcome, loot, ms) => {
        const res = G.endDungeon(outcome, loot, ms);
        app.refresh();
        if (res) showRunResult(res, app);
      }, app.sound);
    });
  }

  function detailSheet(d) {
    const slot = G.state.view, c = G.state.chars[slot];
    openSheet((close) => {
      const ok = G.canEnter(d.id), gt = c ? gearTier(c) : 0;
      return [
        h('div', { class: 'row' }, thumb(d, 74), h('div', { class: 'grow' }, h('div', { class: 'h2' }, d.name), h('div', { class: 'small muted' }, `Boss: ${d.boss}`), h('div', { class: 'small muted' }, `2 rooms, then the boss · cleared ${G.state.clears[d.id] || 0}×`))),
        h('div', { class: 'kv' },
          h('div', {}, h('span', {}, 'Gear drops'), `T${d.tiers[0]}–T${d.tiers[1]}`),
          h('div', {}, h('span', {}, 'Built for'), `T${d.rec} gear`),
          h('div', {}, h('span', {}, 'XP'), `+${d.xp}`),
          h('div', {}, h('span', {}, 'Essence'), `+${CONFIG.clearEssence(d)}`)),
        c ? h('div', { class: 'small', style: { fontWeight: 800, color: gt + 0.5 < d.rec ? 'var(--red-dark)' : 'var(--ink-2)' } }, `${c.name} wears about T${gt.toFixed(1)} gear.`) : null,
        h('div', { class: 'label' }, `Unique items · 1 in ${Math.round(1 / CONFIG.dungeonUtChance)} clears`),
        h('div', { class: 'vgrid' }, d.uts.map((id) => h('button', { class: `tile${G.discovered(id) ? '' : ' unk'} ut`, onclick: () => openItemSheet(id) }, itemIcon(id, 30, !G.discovered(id))))),
        d.rune ? h('div', { class: 'small', style: { color: 'var(--gold-dark)', fontWeight: 800 } }, `Can drop the ${ITEMS[d.rune].name}`) : null,
        d.slotReward && !G.state.clears[d.id] ? h('div', { class: 'small', style: { color: 'var(--gold-dark)', fontWeight: 800 } }, 'First clear: +1 character slot') : null,
        h('button', { class: 'btn', disabled: !c || !ok, onclick: () => { close(); enter(d); } }, !ok ? 'Needs all three runes' : `Enter as ${c?.name || '…'}`),
      ];
    });
  }

  function render() {
    const s = G.state, slot = s.view, c = s.chars[slot];
    root.classList.remove('fit');
    const kids = [h('div', { class: 'h1' }, 'Dungeons'),
      h('div', { class: 'small muted', style: { fontWeight: 700 } }, 'You play these: touch and hold to dodge, your weapon fires on its own. Gear only drops here. Falling costs a life and the gear you wear; retreating is always safe.')];
    if (!c) kids.push(h('button', { class: 'btn gray', onclick: () => newCharacterSheet(slot, () => app.refresh()) }, 'Create a character in this slot'));

    const oryx = DUNGEON.oryx;
    const have = G.runesOwned();
    kids.push(h('div', { class: 'panel dark feature', style: { display: 'grid', gap: '8px' } },
      h('button', { class: 'row between', style: { textAlign: 'left' }, onclick: () => detailSheet(oryx) },
        h('div', {}, h('div', { class: 'label', style: { color: 'var(--gold)' } }, 'Final boss'), h('div', { class: 'h2' }, oryx.name),
          h('div', { class: 'small', style: { color: '#a9b4c0' } }, `Gear T${oryx.tiers[0]}–T${oryx.tiers[1]} · needs all 3 runes`)), thumb(oryx, 74)),
      h('div', { class: 'row between' },
        h('div', { class: 'runes' }, RUNES.map(([r]) => h('div', { class: `rune${have.includes(r) ? '' : ' miss'}`, title: ITEMS[r].name }, itemIcon(r, 22, !have.includes(r))))),
        have.length === 3 ? h('button', { class: 'btn sm', disabled: !c, onclick: () => detailSheet(oryx) }, 'Enter')
          : h('div', { class: 'small', style: { textAlign: 'right', color: '#a9b4c0' } }, `${have.length}/3 runes`))));

    const gt = c ? gearTier(c) : 0;
    for (const [name, a, b] of GROUPS) {
      kids.push(h('div', { class: 'dgroup' }, name));
      DUNGEONS.slice(a, b).forEach((d, j) => {
        const found = d.uts.filter((id) => G.discovered(id)).length;
        const under = c && gt + 0.5 < d.rec;
        kids.push(h('div', { class: 'dun' },
          h('button', { onclick: () => detailSheet(d) }, thumb(d)),
          h('button', { style: { minWidth: 0, textAlign: 'left' }, onclick: () => detailSheet(d) },
            h('div', { class: 'nm' }, d.name),
            h('div', { class: 'meta' }, skulls(a + j), h('span', { class: `pill ${under ? 'diff-high' : 'diff-low'}` }, `T${d.rec} gear`)),
            h('div', { class: 'meta' }, h('span', {}, `Drops T${d.tiers[0]}–${d.tiers[1]} · UT ${found}/${d.uts.length}`, s.clears[d.id] ? ` · ${s.clears[d.id]}×` : ''))),
          h('button', { class: `btn sm${under ? ' gray' : ''}`, disabled: !c, onclick: () => detailSheet(d) }, 'Enter')));
      });
    }
    root.replaceChildren(...kids);
  }

  return { render, emit() {}, frame() {} };
}

export function showRunResult(res, app) {
  const d = DUNGEON[res.dungeonId];
  showDialog((close) => {
    if (res.outcome === 'retreated') return [
      h('div', { class: 'banner' }, h('h2', {}, 'Retreated')),
      h('p', { class: 'muted', style: { margin: 0, textAlign: 'center', fontWeight: 700 } }, `${res.name} is safe and keeps their gear. Loot from this run was left in ${d.name}.`),
      h('button', { class: 'btn', onclick: close }, 'OK'),
    ];
    if (res.outcome === 'died') {
      const D = res.death;
      const gained = Object.entries(D.legacyGained).filter(([, v]) => v > 0);
      return [
        h('div', { class: 'banner', style: { background: 'linear-gradient(#a8352d, #6e1f1a)' } }, h('h2', {}, `${res.name} fell in ${d.name}`)),
        h('p', { class: 'muted', style: { margin: 0, textAlign: 'center', fontWeight: 700 } }, `Level ${D.level} → a new life at level 1.`),
        D.lost.length ? h('div', { class: 'lootlist' }, D.lost.map((id) => h('div', { class: 'loot' }, h('span', { class: 'ic' }, itemIcon(id, 34)),
          h('div', {}, h('b', {}, ITEMS[id].name), h('span', { class: 'small', style: { display: 'block', color: 'var(--red-dark)', fontWeight: 800 } }, ITEMS[id].tier === 'UT' ? 'Lost · can be reforged' : 'Lost')), h('span')))) : h('div', { class: 'small muted', style: { textAlign: 'center' } }, 'Only starter gear was worn: nothing lost.'),
        gained.length ? h('div', { class: 'small', style: { textAlign: 'center', fontWeight: 800, color: 'var(--gold-dark)' } }, `${CLASS[res.cls].name} legacy grew: ${gained.map(([k, v]) => `+${v} ${k.toUpperCase()}`).join(' · ')}`) : null,
        h('div', { class: 'small', style: { textAlign: 'center', fontWeight: 800 } }, `+${fmtNum(res.essence)} essence`),
        h('button', { class: 'btn', onclick: close }, 'Carry on'),
      ];
    }
    const rows = res.items.map((id) => {
      const it = ITEMS[id], isNew = res.newIds.includes(id), up = G.isGear(id) && G.isUpgrade(res.slot, id);
      return h('div', { class: 'loot' },
        h('button', { class: 'ic', style: { borderColor: BAGC[bagOf(id)] }, onclick: () => openItemSheet(id, () => app.refresh()) }, itemIcon(id, 34)),
        h('button', { style: { textAlign: 'left', minWidth: 0 }, onclick: () => openItemSheet(id, () => app.refresh()) },
          h('b', { style: { color: it.tier === 'UT' ? 'var(--ut)' : '' } }, it.name, isNew ? h('span', { class: 'tag' }, 'NEW') : null, up ? h('span', { class: 'tag up' }, '▲') : null),
          h('span', { class: 'small muted', style: { fontWeight: 700 } }, `${tierLabel(it)} ${typeLabel(it)}`.trim())),
        up ? h('button', { class: 'btn sm', onclick: (e) => { if (G.equip(res.slot, id)) { e.target.disabled = true; e.target.textContent = 'Worn'; app.refresh(); } } }, 'Equip') : h('span'));
    });
    return [
      h('div', { class: 'banner' }, h('h2', {}, `${d.name} cleared!`), h('div', { class: 'small', style: { color: '#b8c2cd', fontWeight: 700 } }, `${res.name} beat ${d.boss} in ${fmtDur(res.durationMs)}`)),
      h('div', { class: 'row', style: { justifyContent: 'center', gap: '18px', fontWeight: 900 } }, h('span', { style: { color: '#7a4fc0' } }, `+${res.xp} XP`), h('span', { style: { color: 'var(--gold-dark)' } }, `+${res.essence} ✦`)),
      res.items.some((id) => ITEMS[id].tier === 'UT') ? h('div', { style: { textAlign: 'center', fontWeight: 900, color: 'var(--ut)' } }, 'A unique item dropped!') : null,
      res.slotEarned ? h('div', { style: { textAlign: 'center', fontWeight: 900, color: 'var(--gold-dark)' } }, '+1 character slot') : null,
      rows.length ? h('div', { class: 'lootlist' }, rows) : h('div', { class: 'small muted', style: { textAlign: 'center' } }, 'No bags this time.'),
      h('button', { class: 'btn', onclick: close }, 'Collect'),
    ];
  });
}
