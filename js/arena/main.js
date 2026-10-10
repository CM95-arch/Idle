// PROTOTYPE page: play the Snake Pit as a one-thumb bullet hell.
import { CLASS } from '../data/classes.js';
import { newCharacter, fighterOf, statBreakdown } from '../core/character.js';
import { h } from '../ui/dom.js';
import { createRun, step, WEAPONS, UTS, ABILITIES, roomCount } from './sim.js';
import { ArenaView } from './view.js';

const CLASSES = ['wizard', 'archer', 'warrior'];
const TIERS = [[1, 'Fresh (T1)'], [3, 'Geared (T3)'], [5, 'Strong (T5)']];
const BAGC = { brown: '#a07a50', pink: '#ff9ad0', purple: '#b88aff', white: '#ffffff' };
let setup = { cls: 'wizard', ut: false, tier: 3 };
try { setup = { ...setup, ...JSON.parse(localStorage.getItem('idle-arena') || '{}') }; } catch {}

function fighter() {
  const c = newCharacter(1, setup.cls, 'Hero');
  const t = setup.tier;
  c.tiers = { weapon: t, ability: t, armor: t, ring: t };
  const F = fighterOf(c, { exalt: {} }), sb = statBreakdown(c, { exalt: {} });
  return { ...F, weapon: CLASS[setup.cls].weapon, spd: sb.spd.total, colors: CLASS[setup.cls].colors, abilityPower: F.ability?.power || 80 };
}

const root = document.getElementById('ar');
let R = null, F = null, view = null, input = { target: null, cast: false }, refs = {}, over = null;
const THUMB_GAP = 70; // world px between your thumb and the hero

function start() {
  try { localStorage.setItem('idle-arena', JSON.stringify(setup)); } catch {}
  F = fighter();
  R = createRun(F, setup.cls, setup.ut);
  R.weaponType = F.weapon;
  over?.remove(); over = null;
  build();
}

function build() {
  const cv = h('canvas');
  view = new ArenaView(cv);
  const ab = ABILITIES[setup.cls];
  root.replaceChildren(
    h('div', { class: 'ahud' },
      h('button', { class: 'abtn2 retreat', onclick: () => end('retreat') }, 'Retreat'),
      h('div', { class: 'grow' }, refs.rooms = h('div', { class: 'rooms2' }), refs.bossWrap = h('div', { style: { display: 'none' } }, h('div', { style: { fontSize: '11px', fontWeight: 900, marginTop: '3px' } }, 'Stheno, the Snake Queen'), h('div', { class: 'bbar' }, refs.boss = h('i')))),
      h('div', { style: { fontSize: '11px', fontWeight: 800, textAlign: 'right', color: '#a9b4a0' } }, `${CLASS[setup.cls].name}`, h('br'), setup.ut ? UTS[F.weapon].name : WEAPONS[F.weapon].name)),
    cv,
    h('div', { class: 'ahud' },
      h('div', { class: 'grow', style: { display: 'grid', gap: '5px' } },
        h('div', { class: 'vbar' }, refs.hp = h('i', { style: { background: '#3fbf5c' } }), refs.hpT = h('b')),
        h('div', { class: 'vbar' }, refs.mp = h('i', { style: { background: '#3d7fe0' } }), refs.mpT = h('b')),
        h('div', { style: { fontSize: '11px', color: '#a9b4a0', fontWeight: 700 } }, 'Touch and hold: your hero stays just above your thumb · weapon fires on its own')),
      refs.cast = h('button', { class: 'cast', onpointerdown: (e) => { e.preventDefault(); e.stopPropagation(); input.cast = true; } }, ab.name, h('br'), `${ab.cost} MP`)),
  );
  // the hero sits just above your thumb so it's never hidden under it
  const aim = (e) => { const p = view.toWorld(e.clientX, e.clientY); input.target = { x: p.x, y: p.y - THUMB_GAP }; };
  cv.addEventListener('pointerdown', (e) => { cv.setPointerCapture(e.pointerId); aim(e); });
  cv.addEventListener('pointermove', (e) => { if (input.target) aim(e); });
  const up = () => { input.target = null; };
  cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
}

// keyboard for testing on a computer
const keys = new Set();
window.addEventListener('keydown', (e) => { keys.add(e.key.toLowerCase()); if (e.key === ' ') input.cast = true; });
window.addEventListener('keyup', (e) => keys.delete(e.key.toLowerCase()));

function end(kind) {
  if (!R || over) return;
  R.phase = kind === 'retreat' ? 'retreated' : R.phase;
  const loot = R.loot;
  const gear = [setup.ut ? UTS[F.weapon].name : WEAPONS[F.weapon].name, 'your armor, ability and ring'];
  const kids = kind === 'won' ? [
    h('h2', {}, 'Snake Pit cleared!'),
    h('div', { class: 'note', style: { textAlign: 'center' } }, `${R.stats.kills} kills · ${Math.round(R.t)}s`),
    ...(loot.length ? loot.map((b) => h('div', { class: 'lootrow' }, h('span', { class: 'bagdot', style: { background: BAGC[b.kind] } }), b.item, b.kind === 'white' ? ' ★' : '')) : [h('div', { class: 'note' }, 'No bags dropped this time.')]),
  ] : kind === 'dead' ? [
    h('h2', { style: { color: '#b0302a' } }, 'You fell'),
    h('div', { class: 'note' }, `In the full game this character would restart at level 1, keep part of its potion stats, and lose what it was wearing: ${gear.join(', ')}. Bags picked up this run are lost too.`),
  ] : [
    h('h2', {}, 'Escaped'),
    h('div', { class: 'note' }, 'Safe: you keep your character and gear. Bags from this run are left behind.'),
  ];
  over = h('div', { class: 'aover' }, h('div', { class: 'acard' }, ...kids,
    h('button', { class: 'btn', onclick: start }, 'Run again'),
    h('button', { class: 'btn gray', onclick: () => { over.remove(); over = null; menu(); } }, 'Change class / gear'),
    h('a', { class: 'btn gray', href: './' }, 'Back to the game')));
  document.body.append(over);
}

function menu() {
  R = null;
  const render = () => {
    const card = h('div', { class: 'acard' },
      h('h2', {}, 'Snake Pit'),
      h('div', { class: 'note', style: { textAlign: 'center' } }, 'Prototype of the active dungeon: your hero follows your thumb, your weapon fires on its own, loot goes straight to your bag. Clear 2 rooms, then beat Stheno.'),
      h('div', { class: 'label' }, 'Class'),
      h('div', { class: 'opt' }, CLASSES.map((c) => h('button', { class: setup.cls === c ? 'on' : '', onclick: () => { setup.cls = c; render(); } }, CLASS[c].name))),
      h('div', { class: 'label' }, 'Weapon'),
      h('div', { class: 'opt' }, [false, true].map((u) => {
        const wt = CLASS[setup.cls].weapon;
        return h('button', { class: setup.ut === u ? 'on' : '', onclick: () => { setup.ut = u; render(); } }, u ? `UT: ${UTS[wt].name}` : WEAPONS[wt].name);
      })),
      h('div', { class: 'note' }, (setup.ut ? UTS : WEAPONS)[CLASS[setup.cls].weapon].desc, ' Ability: ', ABILITIES[setup.cls].desc),
      h('div', { class: 'label' }, 'Gear'),
      h('div', { class: 'opt' }, TIERS.map(([t, l]) => h('button', { class: setup.tier === t ? 'on' : '', onclick: () => { setup.tier = t; render(); } }, l))),
      h('button', { class: 'btn', onclick: start }, 'Enter the Snake Pit'),
      h('a', { class: 'btn gray', href: './' }, 'Back to the game'));
    root.replaceChildren(h('div', { class: 'aover', style: { position: 'static', minHeight: '100%' } }, card));
  };
  render();
}

let lastT = performance.now(), acc = 0;
function frame(t) {
  const dt = Math.min(0.05, (t - lastT) / 1000); lastT = t;
  if (R && !over) {
    // keyboard movement adds to the finger movement
    const kx = (keys.has('d') || keys.has('arrowright')) - (keys.has('a') || keys.has('arrowleft'));
    const ky = (keys.has('s') || keys.has('arrowdown')) - (keys.has('w') || keys.has('arrowup'));
    if (kx || ky) input.target = { x: R.hero.x + kx * 300 * dt, y: R.hero.y + ky * 300 * dt };
    else if (keys.size && !kx && !ky) input.target = null;
    acc += dt;
    while (acc >= 1 / 60) { acc -= 1 / 60; step(R, F, input, 1 / 60); }
    view.render(R, F, dt);
    const hh = R.hero;
    refs.hp.style.width = `${(hh.hp / F.maxHp) * 100}%`; refs.hpT.textContent = `${Math.ceil(hh.hp)} / ${F.maxHp}`;
    refs.mp.style.width = `${(hh.mp / F.maxMp) * 100}%`; refs.mpT.textContent = `${Math.floor(hh.mp)} / ${F.maxMp}`;
    refs.cast.disabled = hh.mp < ABILITIES[setup.cls].cost;
    refs.rooms.replaceChildren(...Array.from({ length: roomCount }, (_, i) => h('i', { class: i < R.room ? 'done' : i === R.room ? 'now' : '' })));
    const boss = R.enemies.find((e) => e.boss);
    refs.bossWrap.style.display = boss ? '' : 'none';
    if (boss) refs.boss.style.width = `${(boss.hp / boss.maxHp) * 100}%`;
    if (R.phase === 'dead') setTimeout(() => end('dead'), 900), R.phase = 'over';
    if (R.phase === 'won') { R.phase = 'over'; end('won'); }
  }
  requestAnimationFrame(frame);
}
menu();
requestAnimationFrame(frame);
