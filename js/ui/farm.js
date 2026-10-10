// Screen 1: idle farming. Fits one phone screen, no scrolling.
import { CONFIG } from '../config.js';
import { STAT_LABEL } from '../data/classes.js';
import { BIOMES, BIOME, DUNGEON } from '../data/world.js';
import { ITEMS, tierLabel } from '../data/items.js';
import { levelInfo, statBreakdown } from '../core/character.js';
import * as G from '../core/game.js';
import { h, openSheet, fmtXp } from './dom.js';
import { itemIcon } from './sprites.js';
import { BattleScene } from './scene.js';
import { heroColors, newCharacterSheet, diffPill } from './common.js';
import { biomeEstimate } from './estimates.js';

export function gearSlots(slot, onTap) {
  const c = G.state.chars[slot];
  return h('div', { class: 'slots' }, ['weapon', 'ability', 'armor', 'ring'].map((k) => {
    const id = c.equip[k];
    return h('button', { class: `slot${id ? '' : ' empty'}${id && ITEMS[id].tier === 'UT' ? ' ut' : ''}`, 'aria-label': k, onclick: () => onTap(k) },
      h('span', { class: 'kind' }, k), id ? itemIcon(id, 38) : null, id ? h('span', { class: 'tier' }, tierLabel(ITEMS[id])) : null);
  }));
}

/** ROTMG-style always-visible stat block. Yellow = maxed, green = gear bonus. */
export function statPanel(slot) {
  const c = G.state.chars[slot], sb = statBreakdown(c, G.state);
  return h('div', { class: 'panel dark statgrid' }, ['hp', 'mp', 'att', 'def', 'spd', 'dex', 'vit', 'wis'].map((k) => {
    const b = sb[k], bonus = b.gear + b.exalt;
    return h('div', { class: 'stat' }, h('span', { class: 'k' }, STAT_LABEL[k]),
      h('span', {}, h('span', { class: `v tnum${b.base >= b.max ? ' maxed' : ''}` }, String(b.base + bonus)), bonus ? h('span', { class: 'g' }, ` (+${bonus})`) : null));
  }));
}

export function createFarmScreen(root, app) {
  let scene = null, sceneKey = '', refs = {};

  function biomeSheet(slot) {
    const sh = openSheet((close) => {
      const f = G.state.farms[slot];
      return [
        h('div', { class: 'h2' }, 'Choose a biome'),
        h('div', { class: 'list' }, BIOMES.map((b) => h('button', { class: `pick${f.biome === b.id ? ' on' : ''}`, onclick: () => { G.startFarming(slot, b.id); close(); render(); } },
          h('div', { class: 'ic', style: { background: `linear-gradient(${b.sky[0]} 55%, ${b.ground} 55%)` } }),
          h('div', {}, h('b', {}, b.name), h('div', { class: 'small muted' }, `Loot T${b.tiers[0]}–T${b.tiers[1]}${b.potionRate ? ' · potions' : ''}`)),
          diffPill(biomeEstimate(slot, b.id))))),
      ];
    });
    const off = G.on('estimates', () => (sh.isOpen() ? sh.render() : off()));
  }

  function nudge(slot) {
    const f = G.state.farms[slot];
    if (f.status !== 'farming') return null;
    const i = BIOMES.findIndex((b) => b.id === f.biome);
    const here = biomeEstimate(slot, f.biome), next = BIOMES[i + 1], prev = BIOMES[i - 1];
    if (here?.level === 'low' && prev) return h('button', { class: 'nudge warn', onclick: () => { G.startFarming(slot, prev.id); render(); } }, h('span', { class: 'grow' }, 'Very dangerous here'), h('span', {}, `← ${prev.name}`));
    const est = next && biomeEstimate(slot, next.id);
    if (!est || est.hours < CONFIG.nudgeHours) return null;
    return h('button', { class: 'nudge', onclick: () => { G.startFarming(slot, next.id); render(); } }, h('span', { class: 'grow' }, `Ready for ${next.name}`), h('span', {}, 'Go →'));
  }

  function render() {
    const s = G.state, slot = s.view, c = s.chars[slot], f = s.farms[slot];
    refs = {};
    root.classList.add('fit');
    if (!c) {
      scene = null;
      root.replaceChildren(h('div', { class: 'panel', style: { textAlign: 'center', padding: '28px 16px', margin: 'auto 0' } },
        h('div', { class: 'h2' }, 'Empty slot'),
        h('p', { class: 'muted' }, 'Create a character to farm in this slot.'),
        h('button', { class: 'btn', onclick: () => newCharacterSheet(slot, () => app.refresh()) }, 'Create character')));
      return;
    }
    const b = BIOME[f.biome], inRun = s.run?.slot === slot;
    const key = `${slot}|${f.biome}|${c.cls}`;
    if (!scene || sceneKey !== key) { scene = new BattleScene(h('div', { class: 'scene' })); sceneKey = key; }
    scene.onTap = () => G.farmTap(slot);
    scene.setTheme({ sky: b.sky, ground: b.ground, decor: b.decor, seed: BIOMES.indexOf(b) + 3 });
    const li = levelInfo(c.xp);
    scene.setHero(c.cls, heroColors(c.cls), ITEMS[c.equip.weapon]?.type, c.name, li.level);

    const action = inRun ? h('button', { class: 'btn gold sm', onclick: () => app.nav('dungeons') }, 'In dungeon')
      : f.status === 'farming' ? h('button', { class: 'btn red sm', onclick: () => { G.stopFarming(slot); render(); } }, 'Stop')
        : h('button', { class: 'btn sm', onclick: () => { G.startFarming(slot, f.biome); render(); } }, f.status === 'fallen' ? 'Restart' : 'Start');

    const kids = [
      h('div', { class: 'panel biomebar' },
        h('button', { class: 'grow', style: { textAlign: 'left' }, onclick: () => biomeSheet(slot) },
          h('div', { class: 'name' }, b.name, h('span', { class: 'muted', style: { fontSize: '12px' } }, ' ▼')),
          h('div', { class: 'sub' }, `Loot T${b.tiers[0]}–T${b.tiers[1]}${b.potionRate ? ' · potions' : ''}`)),
        diffPill(biomeEstimate(slot, f.biome)), action),
      scene.host,
      h('div', { class: 'xprow' }, refs.lv = h('span', {}, `Lv ${li.level}`), h('div', { class: 'bar xpbar' }, refs.xp = h('i', { style: { width: `${(li.into / li.need) * 100}%` } })), refs.xpTxt = h('span', { class: 'muted tnum' }, `${fmtXp(li.into)}/${li.need}`)),
    ];
    const n = nudge(slot);
    if (n) kids.push(n);
    kids.push(gearSlots(slot, (k) => app.equip(slot, k)), statPanel(slot));
    root.replaceChildren(...kids);
    updateMessage();
  }

  function updateMessage() {
    if (!scene) return;
    const s = G.state, slot = s.view, f = s.farms[slot], c = s.chars[slot];
    if (s.run?.slot === slot) scene.showMessage(h('div', {}, h('div', { class: 'h2' }, `${c.name} is in ${DUNGEON[s.run.dungeonId].name}`)));
    else if (f.status === 'fallen') scene.showMessage(h('div', { style: { display: 'grid', gap: '8px', justifyItems: 'center' } }, h('div', { class: 'h2' }, `${c.name} has fallen`), h('button', { class: 'btn sm', onclick: () => { G.startFarming(slot, f.biome); render(); } }, 'Restart')));
    else if (f.status !== 'farming') scene.showMessage(h('div', { style: { display: 'grid', gap: '8px', justifyItems: 'center' } }, h('div', { class: 'h2' }, 'Not farming'), h('button', { class: 'btn sm', onclick: () => { G.startFarming(slot, f.biome); render(); } }, 'Start')));
    else scene.showMessage(null);
  }

  let lastStatus = '';
  return {
    render,
    emit: (kind, d) => scene?.event(kind, d),
    frame(dt) {
      const s = G.state, f = s.farms[s.view], c = s.chars[s.view];
      if (!c) return;
      const status = `${s.view}|${f.status}|${s.run?.slot}|${f.biome}`;
      if (status !== lastStatus) { lastStatus = status; render(); return; }
      scene?.frame(dt, f.status === 'farming' ? f.cs : null, G.fighter(s.view));
      const li = levelInfo(c.xp);
      if (refs.xp) { refs.xp.style.width = `${(li.into / li.need) * 100}%`; refs.xpTxt.textContent = `${fmtXp(li.into)}/${li.need}`; refs.lv.textContent = `Lv ${li.level}`; }
    },
  };
}
