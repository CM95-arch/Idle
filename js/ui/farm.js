// Screen 1: idle farming.
import { BIOMES, BIOME, DUNGEON } from '../data/world.js';
import { ITEMS, tierLabel } from '../data/items.js';
import { levelInfo } from '../core/character.js';
import * as G from '../core/game.js';
import { h, openSheet, fmtNum, fmtDur, fmtHours, fmtXp, plural } from './dom.js';
import { itemIcon } from './sprites.js';
import { BattleScene } from './scene.js';
import { chips, heroColors, newCharacterSheet, itemRow } from './common.js';
import { biomeEstimate, LEVEL_TEXT } from './estimates.js';
import { openItemSheet, openEquipPicker } from './itemSheet.js';

export function createFarmScreen(root, nav) {
  let scene = null, refs = {}, sceneSlot = -1, sceneKey = '';

  function survivalPill(slot, biomeId) {
    const est = biomeEstimate(slot, biomeId);
    if (!est) return h('span', { class: 'pill calc' }, 'Estimating…');
    return h('span', { class: `pill ${est.level}` }, `Survival · ${LEVEL_TEXT[est.level]}`);
  }

  function biomeSheet(slot) {
    const sh = openSheet((close) => {
      const f = G.state.farms[slot];
      return [
        h('div', { class: 'title', style: { fontSize: '18px' } }, 'Choose a biome'),
        h('p', { class: 'small muted', style: { margin: 0 } }, 'Every biome is open. Survival is estimated from this character’s gear and stats; tougher biomes drop better loot.'),
        h('div', { class: 'list' }, BIOMES.map((b) => {
          const est = biomeEstimate(slot, b.id);
          return h('button', { class: `pick${f.biome === b.id ? ' on' : ''}`, onclick: () => { G.startFarming(slot, b.id); close(); render(); } },
            h('div', { class: 'ic', style: { background: `linear-gradient(${b.sky[0]}, ${b.sky[1]})` } }),
            h('div', {}, h('b', {}, b.name), h('div', { class: 'small muted' }, `Loot T${b.tiers[0]}–T${b.tiers[1]}`, b.potionRate ? ` · potions 1 in ${Math.round(1 / b.potionRate)}` : '')),
            h('div', { style: { textAlign: 'right' } }, est ? h('span', { class: `pill ${est.level}` }, LEVEL_TEXT[est.level]) : h('span', { class: 'pill calc' }, '…'),
              est ? h('div', { class: 'small muted tnum', style: { marginTop: '3px' } }, est.hours === Infinity ? `${fmtNum(est.kph)} kills/h` : `≈ ${fmtHours(est.hours)} to fall`) : null));
        })),
      ];
    });
    const off = G.on('estimates', () => (sh.isOpen() ? sh.render() : off()));
  }

  function render() {
    const s = G.state, slot = s.view, c = s.chars[slot], f = s.farms[slot];
    refs = {};
    const kids = [chips(() => render())];
    if (!c) {
      kids.push(h('div', { class: 'card', style: { textAlign: 'center', padding: '28px 16px' } },
        h('div', { class: 'title', style: { fontSize: '18px' } }, 'Empty slot'),
        h('p', { class: 'muted' }, 'Create a character here and it will farm alongside your others.'),
        h('button', { class: 'btn', onclick: () => newCharacterSheet(slot, render) }, 'Create character')));
      root.replaceChildren(...kids); scene = null; return;
    }
    const b = BIOME[f.biome];
    const est = biomeEstimate(slot, f.biome);
    kids.push(h('button', { class: 'card row between', style: { textAlign: 'left' }, onclick: () => biomeSheet(slot) },
      h('div', {}, h('div', { class: 'label' }, 'Biome · tap to change'), h('div', { class: 'title', style: { fontSize: '16px' } }, b.name),
        h('div', { class: 'small muted' }, `Loot T${b.tiers[0]}–T${b.tiers[1]}`, b.potionRate ? ` · potions 1 in ${Math.round(1 / b.potionRate)}` : ' · no potions')),
      h('div', { style: { textAlign: 'right' } }, survivalPill(slot, f.biome),
        h('div', { class: 'small muted tnum', style: { marginTop: '3px' } }, est ? (est.hours === Infinity ? '8h+ estimated' : `≈ ${fmtHours(est.hours)} estimated`) : ''))));

    const key = `${slot}|${f.biome}|${c.cls}`;
    if (!scene || sceneSlot !== slot || sceneKey !== key) {
      scene = new BattleScene(h('div', { class: 'scene' })); sceneSlot = slot; sceneKey = key;
    }
    kids.push(scene.host);
    scene.setTheme({ sky: b.sky, ground: b.ground, decor: b.decor, seed: BIOMES.indexOf(b) + 3 });
    scene.setHero(c.cls, heroColors(c.cls), ITEMS[c.equip.weapon]?.type);

    const li = levelInfo(c.xp);
    kids.push(h('div', { class: 'row' },
      refs.lv = h('span', { class: 'title', style: { fontSize: '13px', color: 'var(--ember)' } }, `Lv ${li.level}`),
      h('div', { class: 'bar xpbar grow' }, refs.xp = h('i', { style: { width: `${(li.into / li.need) * 100}%` } })),
      refs.xpTxt = h('span', { class: 'small muted tnum' }, `${fmtXp(li.into)} / ${li.need} XP`)));

    kids.push(h('div', { class: 'slots' }, ['weapon', 'ability', 'armor', 'ring'].map((k) => {
      const id = c.equip[k];
      return h('button', { class: `slot${id ? '' : ' empty'}${id && ITEMS[id].tier === 'UT' ? ' ut' : ''}`, onclick: () => openEquipPicker(slot, k) },
        h('span', { class: 'kind' }, k), id ? itemIcon(id, 36) : null, id ? h('span', { class: 'tier' }, tierLabel(ITEMS[id])) : null);
    })));

    // session
    const sess = f.session;
    if (sess) {
      refs.sess = h('div', { class: 'card', style: { display: 'grid', gap: '7px' } });
      kids.push(refs.sess);
    }
    // controls
    if (s.run?.slot === slot) {
      kids.push(h('div', { class: 'card small' }, `${c.name} is in ${DUNGEON[s.run.dungeonId].name}. Farming resumes when the run ends.`),
        h('button', { class: 'btn', onclick: () => nav('dungeons') }, 'Watch the run'));
    } else if (f.status === 'farming') {
      kids.push(h('div', { class: 'row' }, h('button', { class: 'btn ghost grow', onclick: () => biomeSheet(slot) }, 'Biome'), h('button', { class: 'btn stop', style: { flex: 2 }, onclick: () => { G.stopFarming(slot); render(); } }, '■ Stop farming')));
    } else {
      kids.push(h('div', { class: 'row' }, h('button', { class: 'btn ghost grow', onclick: () => biomeSheet(slot) }, 'Biome'), h('button', { class: 'btn', style: { flex: 2 }, onclick: () => { G.startFarming(slot, f.biome); render(); } }, f.status === 'fallen' ? '↻ Restart farming' : '▶ Start farming')));
    }
    root.replaceChildren(...kids);
    updateSession(true);
    updateMessage();
  }

  let lastSessKey = '';
  function updateSession(force) {
    const s = G.state, f = s.farms[s.view], sess = f?.session;
    if (!refs.sess || !sess) return;
    const end = sess.endMs || (f.status === 'farming' ? f.simMs : Date.now());
    const key = `${sess.kills}|${sess.items}|${sess.potions}|${Math.floor((end - sess.startMs) / 1000)}|${f.status}`;
    if (!force && key === lastSessKey) return;
    lastSessKey = key;
    const b = BIOME[f.biome];
    refs.sess.replaceChildren(
      h('div', { class: 'row between' }, h('span', { class: 'label' }, f.status === 'farming' ? 'This session' : f.status === 'fallen' ? 'Last session · fell' : 'Last session'),
        h('span', { class: 'small muted tnum' }, `${fmtDur(end - sess.startMs)} · ${plural(sess.kills, 'kill')}`)),
      h('div', { class: 'rewards' },
        h('div', { class: 'rw' }, h('b', { style: { color: 'var(--ember)' } }, `+${fmtXp(sess.xp)}`), h('span', {}, 'XP')),
        h('div', { class: 'rw' }, h('b', {}, fmtNum(sess.items)), h('span', {}, 'Items')),
        h('div', { class: `rw${b.potionRate ? '' : ' off'}` }, h('b', { style: { color: 'var(--mp)' } }, b.potionRate ? fmtNum(sess.potions) : '—'), h('span', {}, 'Potions'))),
      sess.drops.length ? h('div', { class: 'row between' }, itemRow(sess.drops.slice(0, 8), { newIds: Object.keys(s.newIds), onTap: openItemSheet }),
        sess.newFinds ? h('span', { class: 'small', style: { color: 'var(--ember)', whiteSpace: 'nowrap' } }, `${sess.newFinds} new ★`) : null)
        : h('div', { class: 'small muted' }, 'Drops show up here.'));
  }

  function updateMessage() {
    if (!scene) return;
    const s = G.state, slot = s.view, f = s.farms[slot], c = s.chars[slot];
    if (s.run?.slot === slot) scene.showMessage(h('div', {}, h('div', { class: 'title' }, 'In a dungeon'), h('div', { class: 'small muted' }, DUNGEON[s.run.dungeonId].name)));
    else if (f.status === 'fallen') scene.showMessage(h('div', {}, h('div', { class: 'title', style: { color: 'var(--low)', fontSize: '18px' } }, `${c.name} has fallen`), h('div', { class: 'small muted' }, `After ${fmtDur(f.session.endMs - f.session.startMs)} in ${BIOME[f.biome].name}. Nothing was lost.`)));
    else if (f.status !== 'farming') scene.showMessage(h('div', {}, h('div', { class: 'title' }, 'Not farming'), h('div', { class: 'small muted' }, 'Pick a biome and press Start.')));
    else scene.showMessage(null);
  }

  let lastStatus = '';
  return {
    render,
    emit: (kind, d) => scene?.event(kind, d),
    frame(dt) {
      const s = G.state, f = s.farms[s.view], c = s.chars[s.view];
      if (!c) return;
      const status = `${s.view}|${f.status}|${s.run?.slot}`;
      if (status !== lastStatus) { lastStatus = status; render(); return; }
      scene?.frame(dt, f.status === 'farming' ? f.cs : null, G.fighter(s.view));
      const li = levelInfo(c.xp);
      if (refs.xp) { refs.xp.style.width = `${(li.into / li.need) * 100}%`; refs.xpTxt.textContent = `${fmtXp(li.into)} / ${li.need} XP`; refs.lv.textContent = `Lv ${li.level}`; }
      updateSession(false);
    },
  };
}
