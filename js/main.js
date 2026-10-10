// Boot, tab navigation, the frame loop and offline catch-up.
import { ITEMS } from './data/items.js';
import { BIOME } from './data/world.js';
import * as G from './core/game.js';
import { $, h, showDialog, toast, fmtDur, fmtNum, fmtXp } from './ui/dom.js';
import { itemIcon } from './ui/sprites.js';
import { createFarmScreen } from './ui/farm.js';
import { createDungeonScreen, showRunResult } from './ui/dungeons.js';
import { createVaultScreen } from './ui/vault.js';
import { createCharacterScreen } from './ui/character.js';

const TABS = [
  ['farm', 'Farm', '<path d="M4 20 18 6l2-2M14 4h6v6M7 13l4 4M5 19l2-2"/>'],
  ['dungeons', 'Dungeons', '<path d="M4 21V10l8-6 8 6v11M9 21v-6h6v6"/>'],
  ['vault', 'Vault', '<rect x="3" y="6" width="18" height="14" rx="2"/><path d="M3 11h18M10 11v3h4v-3"/>'],
  ['character', 'Character', '<circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/>'],
];

G.load();
let tab = 'farm';
try { const t = sessionStorage.getItem('idle-tab'); if (TABS.some(([id]) => id === t)) tab = t; } catch {}
let catching = false;
const pendingResults = [];

const screens = {};
const nav = (id) => { tab = id; try { sessionStorage.setItem('idle-tab', id); } catch {} showTab(); };
screens.farm = createFarmScreen($('#scr-farm'), nav);
screens.dungeons = createDungeonScreen($('#scr-dungeons'));
screens.vault = createVaultScreen($('#scr-vault'));
screens.character = createCharacterScreen($('#scr-character'));

const tabBar = $('#tabs');
function renderTabs() {
  const hasNew = Object.keys(G.state.newIds).length > 0;
  tabBar.replaceChildren(...TABS.map(([id, label, svg]) => {
    const b = h('button', { class: `tab${id === tab ? ' on' : ''}`, onclick: () => nav(id), 'aria-label': label });
    b.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${svg}</svg><span>${label}</span>${id === 'vault' && hasNew ? '<i class="badge"></i>' : ''}${id === 'dungeons' && G.state.run ? '<i class="badge"></i>' : ''}`;
    return b;
  }));
}
function showTab() {
  for (const [id] of TABS) $(`#scr-${id}`).classList.toggle('hidden', id !== tab);
  screens[tab].render();
  renderTabs();
}

// ---------- notifications from the game ----------
G.on('toast', (t) => { if (!catching) toast(t); });
G.on('discover', ({ id }) => { if (!catching) toast({ title: 'New discovery', body: ITEMS[id].name, icon: itemIcon(id, 28), kind: ITEMS[id].tier === 'UT' ? 'gold' : '' }); renderTabs(); });
G.on('levelup', ({ name, level }) => { if (!catching) toast({ title: `${name} reached level ${level}` }); });
G.on('fallen', ({ slot }) => { if (!catching) toast({ title: `${G.state.chars[slot].name} has fallen`, body: 'Farming stopped. Nothing was lost.', kind: 'bad' }); });
G.on('runEnd', (res) => { if (catching) pendingResults.push(res); else showRunResult(res, showDialog); renderTabs(); });
G.on('changed', () => showTab());
G.on('upgrade', ({ slot, id }) => {
  if (catching) return;
  toast({ title: 'Upgrade equipped', body: `${ITEMS[id].name} on ${G.state.chars[slot].name}`, icon: itemIcon(id, 28), kind: 'gold' });
  if (tab === 'farm' || tab === 'character') screens[tab].render();
});
G.on('estimates', () => { if (tab === 'farm' || (tab === 'dungeons' && !G.state.run)) screens[tab].render(); });

// ---------- catch-up after time away ----------
function snapshot() {
  return G.state.farms.map((f, i) => ({ status: f.status, kills: f.session?.kills || 0, xp: f.session?.xp || 0, items: f.session?.items || 0, potions: f.session?.potions || 0, finds: f.session?.newFinds || 0, ups: f.session?.upgrades || 0, start: f.session?.startMs, name: G.state.chars[i]?.name }));
}
async function catchUp() {
  const total = G.ticksBehind();
  if (total < 1500) return;
  catching = true;
  const awayMs = Date.now() - G.state.savedAt;
  const before = snapshot();
  const box = h('div', { class: 'boot' }, h('div', {}, h('div', { class: 'h1' }, 'Welcome back'), h('p', { class: 'muted' }, `Replaying ${fmtDur(awayMs)} of farming…`), h('div', { class: 'bar xpbar', style: { width: '220px', margin: '0 auto' } }, h('i', { id: 'cu-bar', style: { width: '0%' } }))));
  if (total > 40000) document.querySelector('#app').append(box);
  while (G.ticksBehind() > 0) {
    const now = Date.now();
    let budget = 120000;
    for (let i = 0; i < G.state.slots && budget > 0; i++) budget -= G.advanceFarm(i, now, budget);
    if (budget > 0) G.advanceRunTo(now, budget, null, 'auto');
    const left = G.ticksBehind();
    const bar = document.getElementById('cu-bar'); if (bar) bar.style.width = `${Math.min(100, (1 - left / total) * 100)}%`;
    if (left > 0) await new Promise((r) => setTimeout(r, 0));
  }
  box.remove();
  catching = false;
  G.save();
  const after = snapshot();
  const lines = [];
  after.forEach((a, i) => {
    const b = before[i];
    if (!a.name) return;
    const same = a.start === b.start;
    const kills = a.kills - (same ? b.kills : 0), items = a.items - (same ? b.items : 0), potions = a.potions - (same ? b.potions : 0), xp = a.xp - (same ? b.xp : 0), finds = a.finds - (same ? b.finds : 0), ups = a.ups - (same ? b.ups : 0);
    if (kills <= 0 && a.status === b.status) return;
    const f = G.state.farms[i];
    lines.push(h('div', { class: 'card small' },
      h('div', { class: 'row between' }, h('b', {}, a.name), h('span', { class: a.status === 'fallen' ? 'st-fallen' : 'st-farming' }, a.status === 'fallen' ? '✕ Fell' : `● ${BIOME[f.biome].name}`)),
      h('div', { class: 'muted tnum' }, `${fmtNum(kills)} kills · +${fmtXp(xp)} XP · ${fmtNum(items)} items${potions ? ` · ${fmtNum(potions)} potions` : ''}${finds ? ` · ${finds} new` : ''}`),
      ups > 0 ? h('div', { style: { color: 'var(--high)' } }, `Equipped ${ups} upgrade${ups > 1 ? 's' : ''}.`) : null,
      a.status === 'fallen' && f.session?.endMs ? h('div', { style: { color: 'var(--low)' } }, `Fell after ${fmtDur(f.session.endMs - f.session.startMs)} in ${BIOME[f.biome].name}.`) : null));
  });
  if (lines.length && awayMs > 60000) showDialog((close) => [h('h2', {}, `Away for ${fmtDur(awayMs)}`), ...lines, h('button', { class: 'btn', onclick: close }, 'Nice')]);
  for (const r of pendingResults.splice(0)) showRunResult(r, showDialog);
  showTab();
}

// ---------- frame loop ----------
let last = performance.now(), lastSave = Date.now();
function frame(t) {
  const dt = Math.min(0.1, (t - last) / 1000); last = t;
  if (!catching) {
    const now = Date.now();
    const s = G.state;
    for (let i = 0; i < s.slots; i++) {
      const watching = tab === 'farm' && i === s.view;
      G.advanceFarm(i, now, 600, watching ? screens.farm.emit : null);
    }
    if (s.run) {
      const live = tab === 'dungeons' && document.visibilityState === 'visible';
      G.advanceRunTo(now, 600, live ? screens.dungeons.emit : null, live ? 'live' : 'auto');
    }
    screens[tab].frame(dt);
    if (now - lastSave > 5000) { G.save(); lastSave = now; }
  }
  requestAnimationFrame(frame);
}

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') G.save();
  else catchUp();
});
window.addEventListener('pagehide', () => G.save());

showTab();
catchUp().then(() => requestAnimationFrame(frame));
if ('serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register('sw.js').catch(() => {});
// Developer hook for testing from the browser console.
window.idle = G;
