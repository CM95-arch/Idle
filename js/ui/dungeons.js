// Screen 2: dungeon list, plus the live run view.
import { CONFIG } from '../config.js';
import { DUNGEONS, DUNGEON } from '../data/world.js';
import { ITEMS, tierLabel, typeLabel } from '../data/items.js';
import { abilityCost } from '../core/combat.js';
import { runProgress } from '../core/dungeon.js';
import * as G from '../core/game.js';
import { h, openSheet, confirmDialog, toast, fmtDur } from './dom.js';
import { draw, itemIcon } from './sprites.js';
import { BattleScene } from './scene.js';
import { heroColors, newCharacterSheet, diffPill } from './common.js';
import { dungeonEstimate } from './estimates.js';
import { levelOf } from '../core/character.js';
import { openItemSheet } from './itemSheet.js';

const GROUPS = [['Early', 0, 5], ['Mid', 5, 11], ['Late', 11, 15], ['Endgame · runes', 15, 18]];
const range = ([a, b]) => (a === b ? `${a}` : `${a}–${b}`);
const RUNES = [['rune_sword', 'Lost Halls'], ['rune_shield', 'The Void'], ['rune_helm', 'The Shatters']];

function thumb(d, size = 74) {
  const sc = d.bossSprite === 'snake' ? 3 : 4;
  return h('div', { class: 'thumb', style: { width: `${size}px`, height: `${Math.round(size * 0.8)}px`, background: `radial-gradient(circle at 50% 35%, ${d.pal.bg}, #0b090e 85%)` } }, (() => {
    const cv = draw(d.bossSprite, sc, d.pal); const out = cv.cloneNode(); out.getContext('2d').drawImage(cv, 0, 0); out.className = 'spr'; return out;
  })());
}
const skulls = (i) => { const n = Math.min(5, 1 + Math.floor((i / DUNGEONS.length) * 5)); return h('span', { class: 'skulls' }, h('i', {}, '☠'.repeat(n)), '☠'.repeat(5 - n)); };

export function createDungeonScreen(root, app) {
  let scene = null, refs = {}, mode = '';

  function detailSheet(d) {
    const slot = G.state.view, c = G.state.chars[slot];
    const sh = openSheet((close) => {
      const est = c ? dungeonEstimate(slot, d.id) : null;
      const busy = G.state.run;
      const ok = G.canEnter(d.id);
      return [
        h('div', { class: 'row' }, thumb(d, 74), h('div', { class: 'grow' }, h('div', { class: 'h2' }, d.name), h('div', { class: 'small muted' }, `Boss: ${d.boss}`), h('div', { class: 'small muted' }, `${d.rooms} rooms, then the boss · cleared ${G.state.clears[d.id] || 0}×`))),
        h('div', { class: 'kv' },
          h('div', {}, h('span', {}, 'Loot'), `T${d.tiers[0]}–T${d.tiers[1]} · ${CONFIG.dungeonLootRolls.join('–')} items`),
          h('div', {}, h('span', {}, 'XP'), `+${d.xp}`),
          h('div', {}, h('span', {}, 'Potions'), d.potions[1] ? `${range(d.potions)}${d.sig ? ` · often ${d.sig.toUpperCase()}` : ''}` : '—'),
          h('div', {}, h('span', {}, 'Difficulty'), c ? diffPill(est) : '—')),
        h('div', { class: 'label' }, 'Unique items'),
        h('div', { class: 'vgrid' }, d.uts.map((id) => h('button', { class: `tile${G.discovered(id) ? '' : ' unk'} ut`, onclick: () => openItemSheet(id) }, itemIcon(id, 30, !G.discovered(id))))),
        d.rune ? h('div', { class: 'small', style: { color: 'var(--gold-dark)', fontWeight: 800 } }, `Can drop the ${ITEMS[d.rune].name}`) : null,
        d.slotReward && !G.state.clears[d.id] ? h('div', { class: 'small', style: { color: 'var(--gold-dark)', fontWeight: 800 } }, 'First clear: +1 character slot') : null,
        h('button', { class: 'btn', disabled: !c || !!busy || !ok, onclick: () => {
          if (G.enterDungeon(slot, d.id)) { close(); render(); }
        } }, busy ? 'Another run is in progress' : !ok ? 'Needs all three runes' : `Enter as ${c?.name || '…'}`),
      ];
    });
    const off = G.on('estimates', () => (sh.isOpen() ? sh.render() : off()));
  }

  function listView() {
    const s = G.state, slot = s.view, c = s.chars[slot];
    const kids = [h('div', { class: 'h1' }, 'Dungeons')];
    if (!c) kids.push(h('button', { class: 'btn gray', onclick: () => newCharacterSheet(slot, () => app.refresh()) }, 'Create a character in this slot'));

    // Oryx feature card
    const oryx = DUNGEON.oryx;
    const have = G.runesOwned();
    const missing = RUNES.filter(([r]) => !have.includes(r));
    kids.push(h('div', { class: 'panel dark feature', style: { display: 'grid', gap: '8px' } },
      h('button', { class: 'row between', style: { textAlign: 'left' }, onclick: () => detailSheet(oryx) },
        h('div', {}, h('div', { class: 'label', style: { color: 'var(--gold)' } }, 'Final boss'), h('div', { class: 'h2' }, oryx.name),
          h('div', { class: 'small', style: { color: '#a9b4c0' } }, `Loot T${oryx.tiers[0]}–T${oryx.tiers[1]} · needs all 3 runes`)), thumb(oryx, 74)),
      h('div', { class: 'row between' },
        h('div', { class: 'runes' }, RUNES.map(([r]) => h('div', { class: `rune${have.includes(r) ? '' : ' miss'}`, title: ITEMS[r].name }, itemIcon(r, 22, !have.includes(r))))),
        missing.length === 0 ? h('button', { class: 'btn sm', disabled: !c || !!s.run, onclick: () => detailSheet(oryx) }, 'Enter')
          : h('div', { class: 'small', style: { textAlign: 'right', color: '#a9b4c0' } }, `${have.length}/3 runes`))));

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
            h('div', { class: 'meta' }, skulls(i), c ? diffPill(est) : null),
            h('div', { class: 'meta' }, `T${d.tiers[0]}–T${d.tiers[1]} · UT ${found}/${d.uts.length}`, G.state.clears[d.id] ? ` · ${G.state.clears[d.id]}× cleared` : '')),
          h('button', { class: `btn sm${est?.level === 'low' ? ' gray' : ''}`, disabled: !c || !!s.run, onclick: () => detailSheet(d) }, 'Enter')));
      });
    }
    return kids;
  }

  function runView() {
    const s = G.state, r = s.run, d = DUNGEON[r.dungeonId], c = s.chars[r.slot];
    refs = {};
    if (!scene || scene.dungeon !== r.dungeonId) {
      scene = new BattleScene(h('div', { class: 'scene', style: { maxHeight: 'none' } }));
      scene.dungeon = r.dungeonId;
      scene.setTheme({ sky: [d.pal.bg, d.pal.a], ground: d.pal.bg, decor: null, seed: 7 });
    }
    scene.setHero(c.cls, heroColors(c.cls), ITEMS[c.equip.weapon]?.type, c.name, levelOf(c.xp));
    scene.setEnemyLevel('');
    scene.onTap = () => { G.runInput('tap'); return !!G.state.run?.cs.enemy; };
    refs.dodge = h('button', { class: 'dodge-btn hidden', onpointerdown: (e) => { e.preventDefault(); G.runInput('dodge'); } }, 'TAP TO DODGE');
    scene.host.append(refs.dodge);
    const ab = c.equip.ability ? ITEMS[c.equip.ability] : null;
    return [
      h('div', { class: 'panel row between' },
        h('div', {}, h('div', { class: 'h2' }, d.name), refs.rooms = h('div', { class: 'rooms', style: { marginTop: '5px' } })),
        h('button', { class: 'btn gray sm', onclick: async () => {
          if (await confirmDialog({ title: 'Leave the dungeon?', body: 'Rewards only come from clearing it. Leaving now gives nothing.', ok: 'Leave', danger: true })) { G.abandonRun(); render(); }
        } }, 'Leave')),
      refs.bossWrap = h('div', { style: { display: 'grid', gap: '4px' } },
        h('div', { class: 'row between' }, h('span', { style: { fontWeight: 900, fontSize: '14px', color: 'var(--red-dark)' } }, d.boss), refs.bossPct = h('span', { class: 'small muted tnum', style: { fontWeight: 800 } }, '')),
        h('div', { class: 'bossbar' }, refs.bossBar = h('i', { style: { width: '100%' } }), h('u', { style: { left: '66%' } }), h('u', { style: { left: '33%' } }))),
      refs.roomInfo = h('div', { class: 'small muted', style: { fontWeight: 800 } }),
      scene.host,
      h('div', { class: 'abil panel' },
        refs.abtn = h('button', { class: 'abtn', disabled: !ab, onpointerdown: (e) => { e.preventDefault(); G.runInput('cast'); } }, refs.ring = h('div', { class: 'ring' }), ab ? itemIcon(ab.id, 36) : h('span', { class: 'muted' }, '—')),
        h('div', {}, h('div', { style: { fontWeight: 900 } }, ab ? `${ab.name} · ${abilityCost({ type: ab.type, cost: ab.ability.cost })} MP` : 'No ability equipped'),
          h('div', { class: 'small muted', style: { fontWeight: 700 } }, `Clear: +${d.xp} XP · ${CONFIG.dungeonLootRolls.join('–')} items T${d.tiers[0]}–T${d.tiers[1]}${d.potions[1] ? ` · ${range(d.potions)} potions` : ''}`),
          refs.elapsed = h('div', { class: 'small muted tnum' }))),
    ];
  }

  function render() {
    const nextMode = G.state.run ? 'run' : 'list';
    if (nextMode === 'list') scene = null;
    mode = nextMode;
    root.classList.toggle('fit', mode === 'run');
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
    refs.ring.style.background = `conic-gradient(var(--mp) 0 ${frac * 100}%, #9aa3ad ${frac * 100}% 100%)`;
    refs.abtn.classList.toggle('ready', !!ab && cs.mp >= cost && !!e);
    refs.elapsed.textContent = fmtDur(r.ticks * CONFIG.tickSeconds * 1000);
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

export function showRunResult(res, showDialog, onChange) {
  const d = DUNGEON[res.dungeonId], c = G.state.chars[res.slot];
  if (!res.won) {
    showDialog((close) => [
      h('div', { class: 'banner', style: { background: 'linear-gradient(#a8352d, #6e1f1a)' } }, h('h2', {}, `${c?.name || 'Your character'} fell`)),
      h('p', { class: 'muted', style: { margin: 0, textAlign: 'center', fontWeight: 700 } }, `No rewards from ${d.name}. Gear is safe.`),
      h('button', { class: 'btn', onclick: close }, 'OK'),
    ]);
    return;
  }
  const pots = {};
  for (const id of res.potions) pots[id] = (pots[id] || 0) + 1;
  showDialog((close, rerender) => {
    const rows = res.items.map((id) => {
      const it = ITEMS[id], isNew = res.newIds.includes(id);
      const canEq = c && G.canUse(c.cls, id) && G.owned(id) > 0 && c.equip[it.slot] !== id;
      const up = canEq && G.isUpgrade(res.slot, id);
      return h('div', { class: 'loot' },
        h('button', { class: 'ic', onclick: () => openItemSheet(id, onChange) }, itemIcon(id, 34)),
        h('button', { style: { textAlign: 'left', minWidth: 0 }, onclick: () => openItemSheet(id, onChange) },
          h('b', { style: { color: it.tier === 'UT' ? 'var(--ut)' : '' } }, it.name, isNew ? h('span', { class: 'tag' }, 'NEW') : null, up ? h('span', { class: 'tag up' }, '▲') : null),
          h('span', { class: 'small muted', style: { fontWeight: 700 } }, `${tierLabel(it)} ${typeLabel(it)}`),
          it.special ? h('span', { class: 'small', style: { display: 'block', color: 'var(--ut)', fontWeight: 800 } }, it.special) : null),
        canEq ? h('button', { class: `btn sm${up ? '' : ' gray'}`, onclick: () => { G.state.view = res.slot; G.equip(res.slot, id); toast({ title: 'Equipped', body: it.name, icon: itemIcon(id, 26) }); rerender(); onChange?.(); } }, 'Equip') : h('span'));
    });
    return [
      h('div', { class: 'banner' }, h('h2', {}, `${d.name} cleared!`), h('div', { class: 'small', style: { color: '#b8c2cd', fontWeight: 700 } }, `${c?.name} beat ${d.boss} in ${fmtDur(res.durationMs)}`)),
      h('div', { class: 'row', style: { justifyContent: 'center', gap: '18px', fontWeight: 900 } },
        h('span', { style: { color: '#7a4fc0' } }, `+${res.xp} XP`),
        Object.entries(pots).map(([id, n]) => h('span', { class: 'row', style: { gap: '3px' } }, itemIcon(id, 22), `×${n}`))),
      res.items.some((id) => ITEMS[id].tier === 'UT') ? h('div', { style: { textAlign: 'center', fontWeight: 900, color: 'var(--ut)' } }, 'A unique item dropped!') : null,
      res.slotEarned ? h('div', { style: { textAlign: 'center', fontWeight: 900, color: 'var(--gold-dark)' } }, '+1 character slot') : null,
      h('div', { class: 'lootlist' }, rows),
      h('button', { class: 'btn', onclick: close }, 'Collect'),
    ];
  });
}
