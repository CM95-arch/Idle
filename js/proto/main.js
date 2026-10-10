// PROTOTYPE page: try formation battles with different weapon patterns, abilities and ability rules.
import { newCharacter, fighterOf } from '../core/character.js';
import { weaponStats } from '../data/items.js';
import { makeRng } from '../core/rng.js';
import { CONFIG } from '../config.js';
import { h } from '../ui/dom.js';
import { newArena, stepArena, WEAPONS, ABILITIES, RULES, WAVES } from './arena.js';
import { ArenaScene } from './scene.js';

const F = fighterOf(newCharacter(1, 'wizard', 'Proto'), { exalt: {} });
const ws = weaponStats('wand', 1), BASE = (ws.dmgMin + ws.dmgMax) / 2;
const load = () => { try { return JSON.parse(localStorage.getItem('idle-proto')) || {}; } catch { return {}; } };
const loadout = { weapon: 'bolt', ability: 'meteor', rule: 'pack', ...load() };
const saveLoadout = () => { try { localStorage.setItem('idle-proto', JSON.stringify(loadout)); } catch {} };
let A = newArena(F), rng = makeRng(42), speed = 1, acc = 0, recent = [];
const root = document.getElementById('proto');
const scene = new ArenaScene(h('div', { class: 'scene' }));
scene.onFocus = (uid) => { A.focus = A.focus === uid ? null : uid; };
const emit = (kind, d) => scene.event(kind, d);

const refs = {};
function chips(obj, key, label) {
  return h('div', { style: { display: 'grid', gap: '4px' } },
    h('div', { class: 'label' }, label),
    h('div', { class: 'chips' }, Object.entries(obj).map(([k, v]) => h('button', { class: `chip${loadout[key] === k ? ' on' : ''}`, onclick: () => { loadout[key] = k; saveLoadout(); render(); } }, typeof v === 'string' ? v : v.name))));
}
function compare() {
  refs.cmp.replaceChildren(h('div', { class: 'small muted' }, 'Simulating…'));
  setTimeout(() => {
    const sim = (weapon, only, min) => {
      const B = newArena(F); B.only = only; const r = makeRng(7);
      for (let i = 0; i < min * 600; i++) stepArena(B, F, { ...loadout, weapon }, BASE, r, null);
      return only ? B.stats.kills / min : [B.stats.kills / min, B.stats.deaths];
    };
    const keys = Object.keys(WEAPONS);
    const cols = [['All', null, 20], ...WAVES.map((w) => [w.short, w.name, 4])];
    const all = keys.map((k) => sim(k, null, 20));
    const data = keys.map((k, i) => [all[i][0], ...WAVES.map((w) => sim(k, w.name, 4))]);
    const head = h('tr', {}, h('th', {}, 'Kills/min'), cols.map(([n]) => h('th', {}, n)), h('th', {}, 'Falls'));
    const rows = keys.map((k, i) => h('tr', {}, h('td', {}, WEAPONS[k].name.split(' ')[0]), data[i].map((v, j) => {
      const col = data.map((r) => r[j]), max = Math.max(...col), min = Math.min(...col);
      return h('td', { class: v === max ? 'best' : v === min ? 'worst' : '' }, v.toFixed(1));
    }), h('td', {}, String(all[i][1]))));
    refs.cmp.replaceChildren(h('table', {}, head, ...rows), h('div', { class: 'small muted', style: { marginTop: '4px' } }, `20 simulated minutes (4 per fight type) with your ability and rule. Green = best weapon for that fight, red = worst. Falls = deaths in the 20 minutes.`));
  }, 30);
}

function render() {
  const W = WEAPONS[loadout.weapon], Ab = ABILITIES[loadout.ability];
  root.replaceChildren(
    h('div', { class: 'row between' }, h('div', {}, h('div', { class: 'h2' }, 'Battle prototype'), h('div', { class: 'small muted' }, 'Forest · T1 Wizard · tap an enemy to focus it')),
      h('a', { class: 'btn gray sm', href: './' }, 'Back to game')),
    scene.host,
    h('div', { class: 'panel pstats tnum' },
      h('div', {}, refs.kpm = h('span', {}, '0'), h('small', {}, 'kills/min')),
      h('div', {}, refs.dps = h('span', {}, '0'), h('small', {}, 'dps')),
      h('div', {}, refs.waves = h('span', {}, '0'), h('small', {}, 'waves')),
      h('div', {}, refs.deaths = h('span', {}, '0'), h('small', {}, 'falls'))),
    h('div', { class: 'row' },
      refs.cast = h('button', { class: 'btn gold grow', onpointerdown: (e) => { e.preventDefault(); A.cast = true; } }, `Cast ${Ab.name}`),
      h('button', { class: 'btn gray', onclick: () => { speed = speed === 1 ? 3 : 1; render(); } }, `×${speed}`),
      h('button', { class: 'btn gray', onclick: () => { A = newArena(F); rng = makeRng(42); recent = []; } }, 'Reset')),
    h('div', { class: 'panel', style: { display: 'grid', gap: '10px' } },
      chips(WEAPONS, 'weapon', 'Weapon'),
      h('div', { class: 'small', style: { fontWeight: 700 } }, h('b', { style: { color: '#7a4fc0' } }, W.name), ` · ${W.desc}`),
      chips(ABILITIES, 'ability', 'Ability'),
      h('div', { class: 'small', style: { fontWeight: 700 } }, h('b', {}, Ab.name), ` · ${Ab.desc} ${Ab.cost} MP`),
      chips(RULES, 'rule', 'Auto-cast rule'),
      h('div', { class: 'small muted', style: { fontWeight: 700 } }, 'Enemies: ◆ armored (small hits bounce off) · + healer (heals the pack) · rats rush from the back row when the front frees up.')),
    h('div', { class: 'panel cmp', style: { display: 'grid', gap: '6px' } },
      h('button', { class: 'btn gray sm', onclick: compare }, 'Compare all weapons (simulated)'),
      refs.cmp = h('div')),
  );
}

let last = performance.now();
function frame(t) {
  const dt = Math.min(0.1, (t - last) / 1000); last = t;
  acc += dt * speed;
  while (acc >= CONFIG.tickSeconds) {
    acc -= CONFIG.tickSeconds;
    stepArena(A, F, loadout, BASE, rng, speed === 1 ? emit : (k, d) => { if (k !== 'hit' || Math.random() < 0.5) emit(k, d); });
  }
  scene.frame(dt, A, F, loadout);
  const min = Math.max(A.stats.time / 60, 0.25);
  refs.kpm.textContent = (A.stats.kills / min).toFixed(1);
  refs.dps.textContent = Math.round(A.stats.dmg / Math.max(1, A.stats.time));
  refs.waves.textContent = A.stats.waves; refs.deaths.textContent = A.stats.deaths;
  refs.cast.disabled = A.mp < ABILITIES[loadout.ability].cost;
  void recent;
  requestAnimationFrame(frame);
}
render();
requestAnimationFrame(frame);
