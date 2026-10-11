// The dungeon run screen: a full-screen bullet-hell overlay. Touch and hold: the hero sits just above your thumb.
import { ABILITY_TYPES } from '../data/classes.js';
import { ITEMS } from '../data/items.js';
import { createRun, step, arenaFighter } from '../core/arena.js';
import { abilityCost } from '../core/combat.js';
import { bagOf } from '../core/loot.js';
import { ArenaView } from './arenaView.js';
import { h } from './dom.js';

const THUMB_GAP = 70; // world px between your thumb and the hero

/**
 * Run a dungeon. info: what game.beginDungeon returned. onEnd(outcome, loot, ms) is called once.
 * sound(name) plays effects.
 */
export function playDungeon(info, onEnd, sound) {
  const F = arenaFighter(info.F, info.cls);
  const R = createRun(info.d, F, info.cls);
  R.runeDrop = info.runeDrop;
  R.hero.hp = Math.min(F.maxHp, info.hp); R.hero.mp = info.mp;
  const input = { target: null };
  const refs = {};
  const cv = h('canvas');
  const view = new ArenaView(cv, info.d.pal);
  let done = false, raf = 0, last = performance.now(), acc = 0, lastBags = 0, lastHits = 0;
  const ab = F.ability;
  const root = h('div', { class: 'arena' },
    h('div', { class: 'ahud' },
      h('button', { class: 'abtn2 retreat', onclick: () => finish('retreated') }, 'Retreat'),
      h('div', { class: 'grow' },
        h('div', { class: 'aname' }, info.d.name),
        refs.rooms = h('div', { class: 'rooms2' }),
        refs.bossWrap = h('div', { style: { display: 'none' } }, h('div', { class: 'bbar' }, refs.boss = h('i')))),
      refs.bag = h('div', { class: 'abag' }, '0')),
    h('div', { class: 'astage' }, cv),
    h('div', { class: 'ahud' },
      h('div', { class: 'grow', style: { display: 'grid', gap: '5px' } },
        h('div', { class: 'vbar' }, refs.hp = h('i', { style: { background: '#3fbf5c' } }), refs.hpT = h('b')),
        h('div', { class: 'vbar' }, refs.mp = h('i', { style: { background: '#3d7fe0' } }), refs.mpT = h('b')),
        h('div', { class: 'ahint' }, 'Touch and hold to move · weapon and ability fire on their own')),
      refs.ab = h('div', { class: 'aab' }, ab ? ABILITY_TYPES[ab.type].name : '—', h('br'), h('small', {}, ab ? `auto · ${abilityCost(ab)} MP` : ''))));
  document.body.append(root);
  document.body.classList.add('in-arena');

  const aim = (e) => { const p = view.toWorld(e.clientX, e.clientY); input.target = { x: p.x, y: p.y - THUMB_GAP }; };
  cv.addEventListener('pointerdown', (e) => { cv.setPointerCapture(e.pointerId); aim(e); });
  cv.addEventListener('pointermove', (e) => { if (input.target) aim(e); });
  const up = () => { input.target = null; };
  cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);

  function finish(outcome) {
    if (done) return;
    done = true;
    window.cancelAnimationFrame(raf);
    root.remove(); document.body.classList.remove('in-arena');
    onEnd(outcome, outcome === 'won' ? R.loot : [], Math.round(R.t * 1000));
  }

  function frame(t) {
    const dt = Math.min(0.05, (t - last) / 1000); last = t;
    acc += dt;
    while (acc >= 1 / 60 && !done) { acc -= 1 / 60; step(R, F, input, 1 / 60); }
    view.render(R, F, dt);
    const hh = R.hero;
    refs.hp.style.width = `${Math.max(0, hh.hp / F.maxHp) * 100}%`; refs.hpT.textContent = `${Math.ceil(hh.hp)} / ${F.maxHp}`;
    refs.mp.style.width = `${(hh.mp / F.maxMp) * 100}%`; refs.mpT.textContent = `${Math.floor(hh.mp)} / ${F.maxMp}`;
    refs.ab.classList.toggle('ready', !!ab && hh.mp >= abilityCost(ab));
    refs.rooms.replaceChildren(...Array.from({ length: R.rooms }, (_, i) => h('i', { class: i < R.room ? 'done' : i === R.room ? 'now' : '' })));
    const boss = R.enemies.find((e) => e.boss);
    refs.bossWrap.style.display = boss ? '' : 'none';
    if (boss) refs.boss.style.width = `${(boss.hp / boss.maxHp) * 100}%`;
    if (R.loot.length !== lastBags) {
      const fresh = R.loot.slice(lastBags);
      lastBags = R.loot.length;
      refs.bag.textContent = String(R.loot.length);
      sound?.(fresh.some((id) => bagOf(id) === 'white' || ITEMS[id]?.tier === 'UT') ? 'lootRare' : 'loot');
    }
    if (R.stats.hits !== lastHits) { if ((R.stats.hits - lastHits) > 0 && Math.random() < 0.3) sound?.(F.weaponType); lastHits = R.stats.hits; }
    if (R.phase === 'dead') { R.phase = 'over'; sound?.('hurt'); setTimeout(() => finish('died'), 900); }
    if (R.phase === 'won') { R.phase = 'over'; sound?.('levelup'); setTimeout(() => finish('won'), 600); }
    if (!done) raf = requestAnimationFrame(frame);
  }
  raf = requestAnimationFrame(frame);
}
