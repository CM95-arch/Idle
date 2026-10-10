// Screen 2: dungeon list, plus the live run view.
import { CONFIG } from '../config.js';
import { DUNGEONS, DUNGEON } from '../data/world.js';
import { ITEMS } from '../data/items.js';
import { abilityCost } from '../core/combat.js';
import { runProgress } from '../core/dungeon.js';
import * as G from '../core/game.js';
import { h, openSheet, confirmDialog, fmtNum, fmtDur } from './dom.js';
import { draw, itemIcon } from './sprites.js';
import { BattleScene } from './scene.js';
import { chips, heroColors, newCharacterSheet } from './common.js';
import { dungeonEstimate, LEVEL_TEXT } from './estimates.js';
import { openItemSheet } from './itemSheet.js';

const GROUPS = [['Early', 0, 5], ['Mid', 5, 11], ['Late', 11, 15], ['Endgame · runes', 15, 18]];
const range = ([a, b]) => (a === b ? `${a}` : `${a}–${b}`);
const RUNES = [['rune_sword', 'Lost Halls'], ['rune_shield', 'The Void'], ['rune_helm', 'The Shatters']];

function thumb(d, size = 60) {
  const sc = d.bossSprite === 'snake' ? 3 : 4;
  return h('div', { class: 'thumb', style: { width: `${size}px`, height: `${size}px`, background: `radial-gradient(circle at 50% 35%, ${d.pal.bg}, #0b090e 85%)` } }, (() => {
    const cv = draw(d.bossSprite, sc, d.pal); const out = cv.cloneNode(); out.getContext('2d').drawImage(cv, 0, 0); out.className = 'spr'; return out;
  })());
}
const skulls = (i) => { const n = Math.min(5, 1 + Math.floor((i / DUNGEONS.length) * 5)); return h('span', { class: 'skulls' }, h('i', {}, '☠'.repeat(n)), '☠'.repeat(5 - n)); };

export function createDungeonScreen(root) {
  let scene = null, refs = {}, mode = '';

  function detailSheet(d) {
    const slot = G.state.view, c = G.state.chars[slot];
    const sh = openSheet((close) => {
      const est = c ? dungeonEstimate(slot, d.id) : null;
      const busy = G.state.run;
      const ok = G.canEnter(d.id);
      return [
        h('div', { class: 'row' }, thumb(d, 64), h('div', { class: 'grow' }, h('div', { class: 'title', style: { fontSize: '18px' } }, d.name), h('div', { class: 'small muted' }, `Boss: ${d.boss}`), h('div', { class: 'small muted' }, `${d.rooms} rooms, then the boss · cleared ${G.state.clears[d.id] || 0}×`))),
        h('div', { class: 'kv' },
          h('div', {}, h('span', {}, 'Loot'), `T${d.tiers[0]}–T${d.tiers[1]} · ${CONFIG.dungeonLootRolls.join('–')} items`),
          h('div', {}, h('span', {}, 'XP'), `+${d.xp}`),
          h('div', {}, h('span', {}, 'Potions'), d.potions[1] ? `${range(d.potions)}${d.sig ? ` · often ${d.sig.toUpperCase()}` : ''}` : '—'),
          h('div', {}, h('span', {}, 'Clear chance'), est ? h('span', { class: `pill ${est.level}` }, LEVEL_TEXT[est.level]) : '…')),
        h('div', { class: 'label' }, 'Unique items'),
        h('div', { class: 'drops' }, d.uts.map((id) => h('button', { class: 'd', onclick: () => openItemSheet(id) }, itemIcon(id, 24, !G.discovered(id))))),
        d.rune ? h('div', { class: 'small', style: { color: 'var(--ember)' } }, `Every clear drops the ${ITEMS[d.rune].name}.`) : null,
        d.slotReward && !G.state.clears[d.id] ? h('div', { class: 'small', style: { color: 'var(--ember)' } }, 'First clear earns a free character slot.') : null,
        h('p', { class: 'small muted', style: { margin: 0 } }, 'Rewards are only given when the boss falls. If your character falls, the run gives nothing, but no gear is lost.'),
        !c ? h('div', { class: 'small muted' }, 'Pick a character first.') : null,
        h('button', { class: 'btn', disabled: !c || !!busy || !ok, onclick: () => {
          if (G.enterDungeon(slot, d.id)) { close(); render(); }
        } }, busy ? 'Another run is in progress' : !ok ? 'Needs all three runes' : `Enter as ${c?.name || '…'}`),
      ];
    });
    const off = G.on('estimates', () => (sh.isOpen() ? sh.render() : off()));
  }

  function listView() {
    const s = G.state, slot = s.view, c = s.chars[slot];
    const kids = [h('div', { class: 'row between' }, h('span', { class: 'h1' }, 'Dungeons'), h('span', { class: 'small muted' }, 'Free to replay'))];
    kids.push(chips(() => render()));
    if (!c) kids.push(h('button', { class: 'btn ghost', onclick: () => newCharacterSheet(slot, render) }, 'Create a character in this slot'));

    // Oryx feature card
    const oryx = DUNGEON.oryx;
    const have = G.runesOwned();
    const missing = RUNES.filter(([r]) => !have.includes(r));
    kids.push(h('div', { class: 'card feature', style: { display: 'grid', gap: '8px' } },
      h('button', { class: 'row between', style: { textAlign: 'left' }, onclick: () => detailSheet(oryx) },
        h('div', {}, h('div', { class: 'label', style: { color: 'var(--ember)' } }, 'Final boss · repeatable'), h('div', { class: 'title', style: { fontSize: '17px' } }, oryx.name),
          h('div', { class: 'small muted' }, `Loot T${oryx.tiers[0]}–T${oryx.tiers[1]} · uses all three runes`)), thumb(oryx, 52)),
      h('div', { class: 'row between' },
        h('div', { class: 'runes' }, RUNES.map(([r]) => h('div', { class: `rune${have.includes(r) ? '' : ' miss'}`, title: ITEMS[r].name }, itemIcon(r, 22, !have.includes(r))))),
        missing.length === 0 ? h('button', { class: 'btn sm', disabled: !c || !!s.run, onclick: () => detailSheet(oryx) }, 'Enter')
          : missing.length === 1 ? h('button', { class: 'btn ghost sm', disabled: s.essence < CONFIG.runeEssenceCost, onclick: async () => {
            if (await confirmDialog({ title: `Buy the ${ITEMS[missing[0][0]].name}?`, body: `Costs ${fmtNum(CONFIG.runeEssenceCost)} Essence. You can only buy a rune when you hold the other two.`, ok: 'Buy' })) { G.buyRune(); render(); }
          } }, 'Buy rune ', h('span', { class: 'ess' }, `◆${fmtNum(CONFIG.runeEssenceCost)}`))
            : h('div', { class: 'small muted', style: { textAlign: 'right' } }, `Runes drop in`, h('br'), RUNES.filter(([r]) => !have.includes(r)).map(([, n]) => n).join(', ')))));

    for (const [name, a, b] of GROUPS) {
      kids.push(h('div', { class: 'dgroup' }, name));
      DUNGEONS.slice(a, b).forEach((d, j) => {
        const i = a + j;
        const est = c ? dungeonEstimate(slot, d.id) : null;
        const found = d.uts.filter((id) => G.discovered(id)).length;
        kids.push(h('div', { class: 'dun' },
          h('button', { onclick: () => detailSheet(d) }, thumb(d)),
          h('button', { style: { minWidth: 0, textAlign: 'left' }, onclick: () => detailSheet(d) },
            h('div', { class: 'nm' }, d.name),
            h('div', { class: 'meta' }, skulls(i), est ? h('span', { class: `pill ${est.level}`, style: { fontSize: '9.5px', padding: '1px 6px' } }, LEVEL_TEXT[est.level]) : c ? h('span', { class: 'pill calc', style: { fontSize: '9.5px', padding: '1px 6px' } }, '…') : null),
            h('div', { class: 'meta' }, `T${d.tiers[0]}–T${d.tiers[1]} · Uniques ${found}/${d.uts.length}`, G.state.clears[d.id] ? ` · ${G.state.clears[d.id]}×` : '', d.rune ? h('span', { style: { color: 'var(--ember)' } }, ` · ${ITEMS[d.rune].name}`) : null)),
          h('button', { class: `btn sm${est?.level === 'low' ? ' ghost' : ''}`, disabled: !c || !!s.run, onclick: () => detailSheet(d) }, 'Enter')));
      });
    }
    return kids;
  }

  function runView() {
    const s = G.state, r = s.run, d = DUNGEON[r.dungeonId], c = s.chars[r.slot];
    refs = {};
    if (!scene || scene.dungeon !== r.dungeonId) {
      scene = new BattleScene(h('div', { class: 'scene', style: { height: 'clamp(250px, 42vh, 380px)' } }));
      scene.dungeon = r.dungeonId;
      scene.setTheme({ sky: [d.pal.bg, '#0b090e'], ground: '#111', decor: null, seed: 7 });
    }
    scene.setHero(c.cls, heroColors(c.cls), ITEMS[c.equip.weapon]?.type);
    refs.dodge = h('button', { class: 'dodge-btn hidden', onpointerdown: (e) => { e.preventDefault(); G.runInput('dodge'); } }, 'TAP TO DODGE');
    scene.host.append(refs.dodge);
    const ab = c.equip.ability ? ITEMS[c.equip.ability] : null;
    return [
      h('div', { class: 'row between' },
        h('div', {}, h('div', { class: 'label' }, d.name), refs.rooms = h('div', { class: 'rooms', style: { marginTop: '5px' } })),
        h('button', { class: 'btn ghost sm', onclick: async () => {
          if (await confirmDialog({ title: 'Leave the dungeon?', body: 'Rewards only come from clearing it. Leaving now gives nothing.', ok: 'Leave', danger: true })) { G.abandonRun(); render(); }
        } }, 'Leave')),
      refs.bossWrap = h('div', { style: { display: 'grid', gap: '4px' } },
        h('div', { class: 'row between' }, h('span', { class: 'title', style: { fontSize: '14px', color: '#ffb3a8' } }, d.boss), refs.bossPct = h('span', { class: 'small muted tnum' }, '')),
        h('div', { class: 'bossbar' }, refs.bossBar = h('i', { style: { width: '100%' } }), h('u', { style: { left: '66%' } }), h('u', { style: { left: '33%' } }))),
      refs.roomInfo = h('div', { class: 'small muted' }),
      scene.host,
      h('div', { class: 'abil card' },
        refs.abtn = h('button', { class: 'abtn', disabled: !ab, onpointerdown: (e) => { e.preventDefault(); G.runInput('cast'); } }, refs.ring = h('div', { class: 'ring' }), ab ? itemIcon(ab.id, 36) : h('span', { class: 'muted' }, '—')),
        h('div', {}, h('div', { class: 'title', style: { fontSize: '14px' } }, ab ? `${ab.name} · ${abilityCost({ type: ab.type, cost: ab.ability.cost })} MP` : 'No ability equipped'),
          h('div', { class: 'small muted' }, 'Tap when it glows. When the boss winds up a big attack, tap the red button to dodge and stun it.'))),
      h('div', { class: 'card risk small' }, h('div', { class: 'label', style: { color: 'var(--low)' } }, 'Rewards on clear'),
        `+${d.xp} XP · ${CONFIG.dungeonLootRolls.join('–')} items T${d.tiers[0]}–T${d.tiers[1]}`, d.potions[1] ? ` · ${range(d.potions)} potion${d.potions[1] > 1 ? 's' : ''}` : '', d.rune ? ` · ${ITEMS[d.rune].name}` : '',
        h('div', { class: 'muted' }, `If ${c.name} falls, the run gives nothing.`), refs.elapsed = h('div', { class: 'muted tnum' })),
    ];
  }

  function render() {
    const nextMode = G.state.run ? 'run' : 'list';
    if (nextMode === 'list') scene = null;
    mode = nextMode;
    root.replaceChildren(...(mode === 'run' ? runView() : listView()));
  }

  function frameRun(dt) {
    const r = G.state.run; if (!r) return;
    const F = G.fighter(r.slot), cs = r.cs, e = cs.enemy;
    scene.frame(dt, cs, F);
    const prog = runProgress(r);
    refs.rooms.replaceChildren(...r.rooms.map((n, i) => h('i', { class: i < r.room ? 'done' : i === r.room && r.phase === 'room' ? 'now' : '' })), h('i', { class: `boss${r.phase === 'boss' ? ' now' : ''}` }));
    const bossOn = r.phase === 'boss' && e?.boss;
    refs.bossWrap.classList.toggle('hidden', !bossOn);
    refs.roomInfo.classList.toggle('hidden', !!bossOn);
    if (bossOn) { refs.bossBar.style.width = `${(e.hp / e.maxHp) * 100}%`; refs.bossPct.textContent = `${Math.ceil((e.hp / e.maxHp) * 100)}%`; }
    else refs.roomInfo.textContent = r.phase === 'boss' ? 'The boss is coming…' : `Room ${r.room + 1} of ${r.rooms.length} · ${prog.done} / ${prog.total} enemies`;
    refs.dodge.classList.toggle('hidden', !e?.tele);
    const ab = F.ability;
    const cost = ab ? abilityCost(ab) : 1;
    const frac = Math.min(1, cs.mp / cost);
    refs.ring.style.background = `conic-gradient(var(--mp) 0 ${frac * 100}%, var(--seam) ${frac * 100}% 100%)`;
    refs.abtn.classList.toggle('ready', !!ab && cs.mp >= cost && !!e);
    refs.elapsed.textContent = `Run time ${fmtDur(r.ticks * CONFIG.tickSeconds * 1000)}`;
  }

  return {
    render,
    emit: (kind, d) => scene?.event(kind, d),
    isLive: () => mode === 'run',
    frame(dt) {
      const want = G.state.run ? 'run' : 'list';
      if (want !== mode) { render(); return; }
      if (mode === 'run') frameRun(dt);
    },
  };
}

export function showRunResult(res, showDialog) {
  const d = DUNGEON[res.dungeonId], c = G.state.chars[res.slot];
  showDialog((close) => res.won ? [
    h('h2', { style: { color: 'var(--ember)' } }, `${d.name} cleared`),
    h('p', { class: 'muted', style: { margin: 0, textAlign: 'center' } }, `${c?.name || 'Your character'} defeated ${d.boss} in ${fmtDur(res.durationMs)}.`),
    h('div', { class: 'rewards' },
      h('div', { class: 'rw' }, h('b', { style: { color: 'var(--ember)' } }, `+${res.xp}`), h('span', {}, 'XP')),
      h('div', { class: 'rw' }, h('b', {}, res.items.length), h('span', {}, 'Items')),
      h('div', { class: 'rw' }, h('b', { style: { color: 'var(--mp)' } }, res.potions.length), h('span', {}, 'Potions'))),
    h('div', { class: 'drops', style: { flexWrap: 'wrap', justifyContent: 'center' } }, [...res.items, ...res.potions].map((id) => h('button', { class: `d${res.newIds.includes(id) ? ' new' : ''}`, onclick: () => openItemSheet(id) }, itemIcon(id, 24)))),
    res.items.some((id) => ITEMS[id].tier === 'UT') ? h('p', { style: { margin: 0, textAlign: 'center', color: 'var(--ut)' } }, 'A unique item dropped!') : null,
    res.slotEarned ? h('p', { style: { margin: 0, textAlign: 'center', color: 'var(--ember)' } }, 'First clear: you earned a free character slot.') : null,
    h('button', { class: 'btn', onclick: close }, 'Collect'),
  ] : [
    h('h2', { style: { color: 'var(--low)' } }, `${c?.name || 'Your character'} fell`),
    h('p', { class: 'muted', style: { margin: 0, textAlign: 'center' } }, `${d.name} gave no rewards this time. Gear is safe. Better gear, more potions, or well-timed dodges will help.`),
    h('button', { class: 'btn', onclick: close }, 'OK'),
  ]);
}
