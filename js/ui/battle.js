// The main screen: the live battle, where you are, and the party's upgrades: levels and stat potions.
import { CLASSES } from '../data/classes.js';
import { zoneOf, stageLabel, isBoss } from '../data/zones.js';
import * as G from '../core/game.js';
import { TICK } from '../core/battle.js';
import { BattleView, VW, VH } from './battleView.js';
import { h, toast } from './dom.js';
import { portrait, coin, fmt, tap, holdable } from './common.js';
import { statPips } from './potions.js';
import { openFormationSheet } from './formation.js';
import { STATS, STAT_INFO, statValue } from '../data/stats.js';
import { play } from './sound.js';

const MODES = [1, 10, 'Max'];

export function createBattleScreen(root, { onFame, openClass, onDrop, goParty }) {
  let view = null, cv = null, acc = 0, endT = 0, mode = 0, refs = {}, slow = 0, visible = true;

  function levelCount(cls) {
    const m = MODES[mode];
    return m === 'Max' ? G.affordableLevels(cls) : Math.min(m, G.affordableLevels(cls));
  }
  // The dock: a tab for each hero in the party, and for the chosen one a Level button and the eight stat
  // potions in their ROTMG colors. Every button can be held to keep buying.
  let selC = null;
  const selCls = () => (G.state.party.includes(selC) ? selC : G.state.party.find((c) => G.formSlot(c) === 1) || G.state.party[0]);
  function potionCount(cls, st) {
    const m = MODES[mode];
    return G.affordablePotions(cls, st, m === 'Max' ? Infinity : m).n;
  }
  function flash(el) { el.classList.remove('levelup'); void el.offsetWidth; el.classList.add('levelup'); }
  function doLevel() {
    const cls = selCls(), n = Math.max(1, levelCount(cls));
    if (G.levelUp(cls, n)) { tap('upgrade'); flash(refs.panel); G.state.flags.leveled = true; }
    update();
  }
  function doDrink(st) {
    const cls = selCls(), n = Math.max(1, potionCount(cls, st));
    if (!G.drink(cls, st, n)) return;
    tap('upgrade');
    if (G.statMaxed(cls, st)) toast({ title: `${STAT_INFO[st].name} maxed!`, body: G.maxedCount(cls) === 8 ? `${CLASSES[cls].name} is 8/8!` : `${CLASSES[cls].name} is ${G.maxedCount(cls)}/8.`, kind: 'gold' });
    update();
  }
  function buildDock() {
    refs.tabs = h('div', { class: 'htabs' });
    refs.lv = h('button', { class: 'btn lvbtn' });
    holdable(refs.lv, doLevel);
    refs.pots = {};
    const grid = h('div', { class: 'dpots' });
    for (const st of STATS) {
      const I = STAT_INFO[st], b = h('button', { class: 'dpot', style: { '--c': I.color }, 'aria-label': `${I.name} potion` });
      holdable(b, () => doDrink(st));
      refs.pots[st] = b; grid.append(b);
    }
    refs.panel = h('div', { class: 'hpanel' }, refs.lv, grid);
    refs.dock.append(refs.tabs, refs.panel);
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
      refs.arena = h('div', { class: 'arena' }, cv),
      refs.dock = h('div', { class: 'dock' },
        h('div', { class: 'lvmode' },
          h('button', { class: 'chip', onclick: () => { tap(); openFormationSheet(() => update(true), openClass); } }, '⇄ Formation'),

          refs.mode = h('button', { class: 'chip on', onclick: () => { mode = (mode + 1) % MODES.length; tap(); update(true); } }, ''))));
    buildDock();
    view = new BattleView(cv);
    requestAnimationFrame(() => view?.resize());
    if (!G.battle) G.startBattle();
    update(true);
  }

  // Only touch the DOM when something changed. Replacing a button's insides while a finger is on it makes
  // iPhone Safari drop the tap, so this runs four times a second but usually does nothing.
  function patch(el, sig, build) { if (el._sig === sig) return; el._sig = sig; el.replaceChildren(...[].concat(build())); }
  function update(force) {
    if (!refs.where) return;
    if (force) for (const el of [refs.where, refs.power, refs.auto, refs.mode, refs.tabs]) el._sig = null;
    const s = G.state, Z = zoneOf(s.stage), boss = isBoss(s.stage);
    const walled = s.flags.wallAt != null && s.stage === s.best && s.best < G.LAST_STAGE && s.autoPush && !zoneOf(s.stage).dungeon;
    // the zone's name on its own line (it can be long), then the stage and where you stand
    const sub = walled ? `needs more power` : boss ? Z.boss[0] : Z.dungeon ? `Tier ${Z.tier} · cleared ${G.dungeonProgress(Z)}/${Z.len}` : `Best ${s.best >= 0 ? stageLabel(s.best) : '—'}`;
    patch(refs.where, Z.name + stageLabel(s.stage) + sub + walled, () => [h('small', { class: 'zn' }, Z.name),
      h('div', { class: 'st' }, h('b', {}, stageLabel(s.stage), boss ? ' ☠' : ''), h('small', { class: walled ? 'walled' : boss ? 'bossn' : '' }, walled ? `${stageLabel(s.flags.wallAt)} ${sub}` : sub))]);
    const pw = fmt(G.partyPower()), need = G.stagePower(s.stage), ok = G.partyPower() >= need;
    patch(refs.power, `${pw}|${need}|${ok}`, () => ['⚔ ', h('span', { class: ok ? 'ok' : 'low' }, pw), h('span', { class: 'dim' }, ` / ${fmt(need)}`)]);
    refs.auto.classList.toggle('on', s.autoPush);
    patch(refs.auto, String(s.autoPush), () => (s.autoPush ? 'Auto ▶▶' : 'Farm ⟳'));
    patch(refs.mode, String(mode), () => `Buy ×${MODES[mode]}`);
    // hero tabs, in formation order (left, front, right) like the field: tap one to choose who to upgrade; tap
    // the chosen one again for its details
    for (const c of s.party) G.formSlot(c);
    const party = s.form.filter(Boolean), cur = selCls();
    const canAny = (c) => s.fame >= G.levelCost(c) || STATS.some((x) => !G.statMaxed(c, x) && s.fame >= G.potionCost(c, x));
    const tabSig = party.map((c) => `${c}:${s.classes[c].lv}:${G.maxedCount(c)}:${STATS.map((x) => G.potions(c, x)).join('.')}:${c === cur}:${canAny(c)}`).join('|');
    patch(refs.tabs, tabSig, () => [0, 1, 2].map((i) => {
      const c = party[i];
      if (!c) return h('button', { class: 'htab empty', 'aria-label': 'Add a hero', onclick: () => { tap(); goParty?.(); } }, '+');
      const n8 = G.maxedCount(c);
      return h('button', { class: `htab${c === cur ? ' on' : ''}${canAny(c) ? ' ready' : ''}`, onclick: () => { if (c === cur) openClass(c); else { selC = c; tap(); update(); } } },
        h('div', { class: 'tp' }, portrait(c, 40)),
        h('div', { class: 'tt' }, h('b', {}, CLASSES[c].name), h('small', {}, `Lv ${s.classes[c].lv} · `, h('span', { class: n8 === 8 ? 'full' : '' }, `${n8}/8`)), statPips(c)));
    }));
    // the chosen hero's Level button and potions
    const cls = selCls();
    const lv = s.classes[cls].lv, n = MODES[mode] === 'Max' ? Math.max(1, G.affordableLevels(cls)) : MODES[mode];
    let cost = 0; for (let i = 0; i < n; i++) cost += G.levelCostForLevel(lv + i);
    const can = s.fame >= G.levelCost(cls);
    if (refs.lv.disabled !== !can) refs.lv.disabled = !can;
    patch(refs.lv, `${cls}|${lv}|${n}|${fmt(cost)}`, () => [h('small', {}, `${CLASSES[cls].name}`), h('span', {}, `Level ${lv + 1}${n > 1 ? `+` : ''}`), h('small', {}, n > 1 ? `×${n} ` : '', coin(cost))]);
    for (const st of STATS) {
      const b = refs.pots[st], k = G.potions(cls, st), K = G.potCap(cls, st), maxed = k >= K;
      const pc = potionCount(cls, st), m = Math.max(1, pc);
      let pcost = 0; if (!maxed) { if (pc) pcost = G.affordablePotions(cls, st, MODES[mode] === 'Max' ? Infinity : MODES[mode]).cost; else pcost = G.potionCost(cls, st); }
      const off = maxed || s.fame < G.potionCost(cls, st);
      if (b.disabled !== off) b.disabled = off;
      b.classList.toggle('maxed', maxed);
      b.style.setProperty('--p', `${(k / K) * 100}%`);
      patch(b, `${cls}|${k}|${m}|${fmt(pcost)}`, () => [h('b', {}, STAT_INFO[st].abbr), h('span', { class: 'v tnum' }, `${statValue(cls, st, k)}`),
        maxed ? h('small', { class: 'mx' }, 'MAX') : h('small', {}, m > 1 ? `×${m} ` : '', coin(pcost)), h('i')]);
    }
    // a new player's first level: the button pulses until it's pressed
    refs.lv.classList.toggle('pulse', can && !s.flags.leveled);
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
          if (r.k === 'clear') { onFame(r.n); if (r.first && isBoss(r.stage)) toast({ title: `${zoneOf(r.stage).boss[0]} defeated!`, body: r.stage === G.LAST_STAGE ? 'Oryx has fallen. You can Ascend!' : zoneOf(r.stage).dungeon ? 'Its gear can drop on every run.' : `${zoneOf(r.stage + 1).name} is open.`, kind: 'gold' }); }
          if (r.k === 'dungeons') toast({ title: `Dungeons unlocked: Tier ${r.tier}`, body: `${r.names.join(' and ')}. Find them on the Map.`, kind: 'gold' });
          if (r.k === 'drop' && r.salvaged) onFame(r.salvaged);
          if (r.k === 'drop' && !r.salvaged) onDrop?.(r.it, r);
        }
        endT = 0;
      } else if ((endT += TICK) > 1.4) { G.nextBattle(); endT = 0; update(true); }
    }
    if (visible && view && G.battle && !document.querySelector('#overlay-root .overlay, .tour')) {
      const b = { x: VW - 24, y: VH - 8 }, c = { x: 24, y: -14 };
      view.render(G.battle, dt, c, b);
    }
    if ((slow += dt) > 0.25) { slow = 0; if (visible) update(); }
  }
  function show(on) { visible = on; if (on) { if (!view) render(); else { requestAnimationFrame(() => view.resize()); update(true); } } }
  return { render, frame, show, update, resize: () => view?.resize() };
}
