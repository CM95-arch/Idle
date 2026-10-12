// The main screen: the live battle, where you are, and the party with one-tap level-ups.
import { CLASSES, ROLES } from '../data/classes.js';
import { zoneOf, stageLabel, isBoss, realmName } from '../data/zones.js';
import * as G from '../core/game.js';
import { TICK } from '../core/battle.js';
import { BattleView, VW, VH } from './battleView.js';
import { h, toast } from './dom.js';
import { portrait, coin, fmt, tap } from './common.js';
import { play } from './sound.js';

const MODES = [1, 10, 'Max'];

export function createBattleScreen(root, { onFame, openClass }) {
  let view = null, cv = null, acc = 0, endT = 0, mode = 0, refs = {}, slow = 0, visible = true;

  function levelCount(cls) {
    const m = MODES[mode];
    return m === 'Max' ? G.affordableLevels(cls) : Math.min(m, G.affordableLevels(cls));
  }
  function doLevel(cls, card) {
    const n = Math.max(1, levelCount(cls));
    const got = G.levelUp(cls, n);
    if (got) {
      tap('upgrade');
      card.classList.remove('levelup'); void card.offsetWidth; card.classList.add('levelup');
      G.state.flags.leveled = true;
    }
    update(true);
  }
  // hold a level button to keep leveling, faster the longer you hold
  function holdable(btn, fn) {
    let t = null, delay = 0;
    const stop = () => { window.clearTimeout(t); t = null; };
    btn.addEventListener('pointerdown', (e) => { e.preventDefault(); fn(); delay = 380; const go = () => { t = setTimeout(() => { fn(); delay = Math.max(60, delay * 0.8); go(); }, delay); }; go(); });
    for (const ev of ['pointerup', 'pointerleave', 'pointercancel']) btn.addEventListener(ev, stop);
  }

  function heroCard(cls) {
    if (!cls) return h('div', { class: 'hcard empty' }, 'Empty slot', h('small', { class: 'dim' }, 'Unlock classes'));
    const C = CLASSES[cls], card = h('div', { class: 'hcard', 'data-cls': cls });
    const btn = h('button', { class: 'btn lvbtn' });
    holdable(btn, () => doLevel(cls, card));
    card.append(
      h('span', { class: 'role' }, ROLES[C.role]),
      h('button', { class: 'por', onclick: () => openClass(cls), 'aria-label': `${C.name} details` }, portrait(cls, 44)),
      h('div', { class: 'nm' }, C.name),
      h('div', { class: 'lv' }, ''),
      btn);
    return card;
  }

  function render() {
    root.classList.add('fit');
    cv = h('canvas', { 'aria-label': 'Battle' });
    refs = {};
    root.replaceChildren(
      h('div', { class: 'stagebar' },
        refs.where = h('div', { class: 'where grow' }),
        refs.power = h('div', { class: 'power' }),
        refs.auto = h('button', { class: 'toggle', onclick: () => { G.setAutoPush(!G.state.autoPush); tap(); update(true); } }, '')),
      refs.arena = h('div', { class: 'arena' }, cv, refs.wall = h('div', { class: 'wall hidden' })),
      refs.dock = h('div', { class: 'dock' },
        h('div', { class: 'lvmode' },
          h('small', { class: 'dim', style: { fontWeight: 800 } }, 'Party · hold a button to keep leveling'),
          refs.mode = h('button', { class: 'chip on', onclick: () => { mode = (mode + 1) % MODES.length; tap(); update(true); } }, ''))));
    for (let i = 0; i < 3; i++) refs.dock.append(heroCard(G.state.party[i]));
    view = new BattleView(cv);
    requestAnimationFrame(() => view?.resize());
    if (!G.battle) G.startBattle();
    update(true);
  }

  function update(force) {
    if (!refs.where) return;
    const s = G.state, Z = zoneOf(s.stage), boss = isBoss(s.stage);
    refs.where.replaceChildren(h('b', {}, `${Z.name} ${stageLabel(s.stage)}${boss ? ' ☠' : ''}`), h('small', {}, `${s.realm ? `${realmName(s.realm)} · ` : ''}${boss ? 'Boss stage' : `Best ${s.best >= 0 ? stageLabel(s.best) : '—'}`}`));
    const pw = G.partyPower(), need = G.stagePower(s.stage);
    refs.power.replaceChildren('⚔ ', h('span', { class: pw >= need ? 'ok' : 'low' }, fmt(pw)), h('span', { class: 'dim' }, ` / ${fmt(need)}`));
    refs.auto.className = `toggle${s.autoPush ? ' on' : ''}`;
    refs.auto.textContent = s.autoPush ? 'Auto ▶▶' : 'Farm ⟳';
    refs.mode.textContent = `Level ×${MODES[mode]}`;
    const walled = s.flags.wallAt != null && s.stage === s.best && s.best < G.LAST_STAGE;
    refs.wall.classList.toggle('hidden', !walled);
    if (walled) refs.wall.replaceChildren(h('div', { class: 'grow' }, h('b', {}, `Stuck at ${stageLabel(s.flags.wallAt)}. `), 'Level up or equip better gear. Auto retries once you’re 8% stronger.'), h('button', { class: 'btn sm', onclick: () => { G.goToStage(s.best + 1); tap(); update(true); } }, 'Try now'));
    // party cards
    const cards = [...refs.dock.querySelectorAll('.hcard')];
    const party = s.party;
    if (cards.length !== 3 || cards.some((c, i) => (c.dataset.cls || null) !== (party[i] || null))) {
      cards.forEach((c) => c.remove());
      for (let i = 0; i < 3; i++) refs.dock.append(heroCard(party[i]));
    }
    for (const card of refs.dock.querySelectorAll('.hcard[data-cls]')) {
      const cls = card.dataset.cls, n = MODES[mode] === 'Max' ? Math.max(1, G.affordableLevels(cls)) : MODES[mode];
      let cost = 0; for (let i = 0; i < n; i++) cost += G.levelCostForLevel(s.classes[cls].lv + i);
      const can = s.fame >= G.levelCost(cls);
      card.querySelector('.lv').textContent = `Lv ${s.classes[cls].lv}`;
      const btn = card.querySelector('.lvbtn');
      btn.disabled = !can;
      btn.replaceChildren(h('span', {}, `Level up${n > 1 ? ` ×${n}` : ''}`), h('small', {}, coin(cost)));
      card.classList.toggle('ready', can);
      card.querySelector('.hint')?.remove();
      if (can && !s.flags.leveled && cls === party[0]) card.append(h('div', { class: 'hint' }, 'Tap to level up!'));
    }
    void force;
  }

  /** Called every animation frame by main.js; runs the battle even when this screen is hidden. */
  function frame(dt) {
    acc += Math.min(dt, 0.25);
    while (acc >= TICK) {
      acc -= TICK;
      if (!G.battle) G.startBattle();
      if (G.battle.state === 'fight') {
        const { events, rewards } = G.tickBattle();
        if (visible && view) view.feed(G.battle, events, rewards, play);
        for (const r of rewards) {
          if (r.k === 'fame') onFame(r.n);
          if (r.k === 'clear') { onFame(r.n); if (r.first && isBoss(r.stage)) toast({ title: `${zoneOf(r.stage).boss[0]} defeated!`, body: r.stage === G.LAST_STAGE ? 'Oryx has fallen. You can Ascend!' : `${zoneOf(r.stage + 1).name} is open.`, kind: 'gold' }); }
          if (r.k === 'drop' && r.salvaged) onFame(r.salvaged);
        }
        endT = 0;
      } else if ((endT += TICK) > 1.4) { G.nextBattle(); endT = 0; update(true); }
    }
    if (visible && view && G.battle) {
      const b = { x: VW - 24, y: VH - 8 }, c = { x: 24, y: -14 };
      view.render(G.battle, dt, c, b);
    }
    if ((slow += dt) > 0.25) { slow = 0; if (visible) update(); }
  }
  function show(on) { visible = on; if (on) { if (!view) render(); else { requestAnimationFrame(() => view.resize()); update(true); } } }
  return { render, frame, show, update, resize: () => view?.resize() };
}
