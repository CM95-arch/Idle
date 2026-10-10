// Boot, navigation, the frame loop, sounds and offline catch-up.
import { BUILD } from './config.js';
import { ITEMS } from './data/items.js';
import { slotType } from './core/character.js';
import { BIOME } from './data/world.js';
import * as G from './core/game.js';
import { $, h, showDialog, confirmDialog, toast, fmtDur, fmtNum, fmtXp } from './ui/dom.js';
import { itemIcon } from './ui/sprites.js';
import { renderTopBar } from './ui/common.js';
import { createFarmScreen } from './ui/farm.js';
import { createDungeonScreen, showRunResult } from './ui/dungeons.js';
import { createVaultScreen } from './ui/vault.js';
import { createCharacterScreen } from './ui/character.js';
import { initSound, setSoundEnabled, play } from './ui/sound.js';

const TABS = [
  ['farm', 'Farm', '<path d="M4 20 18 6l2-2M14 4h6v6M7 13l4 4M5 19l2-2"/>'],
  ['dungeons', 'Dungeons', '<path d="M4 21V10l8-6 8 6v11M9 21v-6h6v6"/>'],
  ['vault', 'Vault', '<rect x="3" y="6" width="18" height="14" rx="2"/><path d="M3 11h18M10 11v3h4v-3"/>'],
  ['character', 'Character', '<circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/>'],
];

G.load();
initSound(G.state.settings.sound);
let tab = 'farm';
try { const t = sessionStorage.getItem('idle-tab'); if (TABS.some(([id]) => id === t)) tab = t; } catch {}
let catching = false;
const pendingResults = [];

const app = {
  nav(id) { tab = id; try { sessionStorage.setItem('idle-tab', id); } catch {} showTab(); },
  refresh() { showTab(); },
  refreshTop() { renderTop(); },
  sound: (name) => play(name),
};
const screens = {};
screens.farm = createFarmScreen($('#scr-farm'), app);
screens.dungeons = createDungeonScreen($('#scr-dungeons'), app);
screens.vault = createVaultScreen($('#scr-vault'), app);
screens.character = createCharacterScreen($('#scr-character'), app);

function renderTop() { renderTopBar($('#topbar'), { onChange: () => showTab(), onSettings: settings }); }
function renderTabs() {
  const hasNew = Object.keys(G.state.newIds).length > 0;
  $('#tabs').replaceChildren(...TABS.map(([id, label, svg]) => {
    const b = h('button', { class: `tab${id === tab ? ' on' : ''}`, onclick: () => app.nav(id), 'aria-label': label });
    b.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${svg}</svg><span>${label}</span>${id === 'vault' && hasNew ? '<i class="badge"></i>' : ''}${id === 'dungeons' && G.state.run ? '<i class="badge"></i>' : ''}`;
    return b;
  }));
}
function showTab() {
  for (const [id] of TABS) $(`#scr-${id}`).classList.toggle('hidden', id !== tab);
  screens[tab].render();
  renderTop(); renderTabs();
}

function settings() {
  showDialog((close, rerender) => [
    h('h2', {}, 'Settings'),
    h('button', { class: 'btn gray', onclick: () => { G.state.settings.sound = !G.state.settings.sound; setSoundEnabled(G.state.settings.sound); G.save(); rerender(); } }, `Sound: ${G.state.settings.sound ? 'On' : 'Off'}`),
    h('button', { class: 'btn gray', onclick: async () => {
      const code = G.exportSave();
      try { await navigator.clipboard.writeText(code); toast({ title: 'Save code copied' }); } catch { showDialog((c2) => [h('h2', {}, 'Save code'), h('textarea', { readonly: true, style: { height: '140px' } }, code), h('button', { class: 'btn', onclick: c2 }, 'Done')]); }
    } }, 'Copy save code'),
    h('button', { class: 'btn gray', onclick: () => {
      close(); let text = '';
      showDialog((c2) => [h('h2', {}, 'Load a save'), h('textarea', { id: 'import-save', placeholder: 'Paste a save code', oninput: (e) => { text = e.target.value; }, style: { height: '140px' } }),
        h('button', { class: 'btn', onclick: () => { try { G.importSave(text); c2(); location.reload(); } catch (e) { toast({ title: 'Could not load that save', body: e.message, kind: 'bad' }); } } }, 'Load save')]);
    } }, 'Load a save code'),
    h('button', { class: 'btn red', onclick: async () => { if (await confirmDialog({ title: 'Erase everything?', body: 'Deletes all characters, items and progress on this device.', ok: 'Erase', danger: true })) { G.resetGame(); location.reload(); } } }, 'Erase save'),
    h('div', { class: 'small muted', style: { textAlign: 'center', fontWeight: 700 } }, `Build ${BUILD} · ${fmtNum(G.state.stats.kills)} kills · ${G.state.stats.clears} clears`),
    h('button', { class: 'btn', onclick: close }, 'Done'),
  ]);
}

// ---------- events from the game ----------
const weaponOf = (slot) => { const c = G.state.chars[slot]; return c ? slotType(c.cls, 'weapon') : 'staff'; };
function withSound(screen, slotOf) {
  const show = (kind, d) => {
    screen.emit(kind, d);
    if (kind === 'hit') play(weaponOf(slotOf()));
    else if (kind === 'hurt' && d.big) play('hurt');
    else if (kind === 'drop') play(ITEMS[d.id].tier === 'UT' ? 'lootRare' : 'loot');
    else if (kind === 'ability') play('ability');
    else if (kind === 'dodged') play('dodge');
    else if (kind === 'telegraph') play('tele');
    else if (kind === 'spawn' && d.enemy?.event) { play('lootRare'); toast({ title: 'Event boss!', body: d.enemy.name, kind: 'gold' }); }
  };
  // Events carry `frac`, their position inside the 0.1s combat step; play them at that moment for a steady rhythm.
  return (kind, d) => { if (d?.frac > 0.02) setTimeout(() => show(kind, d), d.frac * 100); else show(kind, d); };
}
const farmEmit = withSound(screens.farm, () => G.state.view);
const runEmit = withSound(screens.dungeons, () => G.state.run?.slot);

G.on('toast', (t) => { if (!catching) toast(t); });
G.on('discover', ({ id }) => { if (!catching && ITEMS[id].slot !== 'potion') toast({ title: ITEMS[id].tier === 'UT' ? 'Unique item!' : 'New item', body: ITEMS[id].name, icon: itemIcon(id, 28), kind: ITEMS[id].tier === 'UT' ? 'gold' : '' }); renderTabs(); });
G.on('levelup', ({ name, level }) => {
  if (catching) return;
  play('levelup');
  const host = tab === 'farm' ? $('#scr-farm .scene') : null;
  if (host) { const el = h('div', { class: 'lvlup' }, `Level ${level}!`); host.append(el); setTimeout(() => el.remove(), 1700); } else toast({ title: `${name} reached level ${level}` });
  renderTop();
});
G.on('fallen', ({ slot }) => { if (!catching) toast({ title: `${G.state.chars[slot].name} has fallen`, kind: 'bad' }); renderTop(); });
G.on('runEnd', (res) => { if (catching) pendingResults.push(res); else showRunResult(res, showDialog, () => showTab()); renderTabs(); renderTop(); });
G.on('changed', () => showTab());
G.on('gear', (d) => { if (!d.drink) play('equip'); screens[tab].render(); renderTop(); });
G.on('estimates', () => { if (tab === 'farm' || (tab === 'dungeons' && !G.state.run)) screens[tab].render(); });

// ---------- catch-up after time away ----------
function snapshot() {
  return G.state.farms.map((f, i) => ({ status: f.status, kills: f.session?.kills || 0, xp: f.session?.xp || 0, items: f.session?.items || 0, potions: f.session?.potions || 0, finds: f.session?.newFinds || 0, start: f.session?.startMs, name: G.state.chars[i]?.name }));
}
async function catchUp() {
  const total = G.ticksBehind();
  if (total < 1500) return;
  catching = true;
  const awayMs = Date.now() - G.state.savedAt;
  const before = snapshot();
  const box = h('div', { class: 'boot' }, h('div', {}, h('div', { class: 'h1' }, 'Welcome back'), h('p', { style: { color: '#b8c2cd' } }, `Catching up ${fmtDur(awayMs)}…`), h('div', { class: 'bar xpbar', style: { width: '220px', margin: '0 auto' } }, h('i', { id: 'cu-bar', style: { width: '0%' } }))));
  if (total > 40000) $('#app').append(box);
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
    const kills = a.kills - (same ? b.kills : 0), items = a.items - (same ? b.items : 0), potions = a.potions - (same ? b.potions : 0), xp = a.xp - (same ? b.xp : 0);
    if (kills <= 0 && a.status === b.status) return;
    const f = G.state.farms[i];
    lines.push(h('div', { class: 'panel small' },
      h('div', { class: 'row between' }, h('b', {}, a.name), h('b', { style: { color: a.status === 'fallen' ? 'var(--red)' : 'var(--green)' } }, a.status === 'fallen' ? 'Fallen' : BIOME[f.biome].name)),
      h('div', { class: 'muted tnum', style: { fontWeight: 700 } }, `${fmtNum(kills)} kills · +${fmtXp(xp)} XP${potions ? ` · ${fmtNum(potions)} potions` : ''}${items ? ` · ${fmtNum(items)} unique!` : ''}`),
      a.status === 'fallen' && f.session?.endMs ? h('div', { style: { color: 'var(--red)', fontWeight: 700 } }, `Fell after ${fmtDur(f.session.endMs - f.session.startMs)}`) : null));
  });
  if (lines.length && awayMs > 60000) showDialog((close) => [h('div', { class: 'banner' }, h('h2', {}, `Away for ${fmtDur(awayMs)}`)), ...lines, h('button', { class: 'btn', onclick: close }, 'Nice')]);
  for (const r of pendingResults.splice(0)) showRunResult(r, showDialog, () => showTab());
  showTab();
}

// ---------- frame loop ----------
let last = performance.now(), lastSave = Date.now(), lastTop = 0;
function frame(t) {
  const dt = Math.min(0.1, (t - last) / 1000); last = t;
  if (!catching) {
    const now = Date.now();
    const s = G.state;
    for (let i = 0; i < s.slots; i++) G.advanceFarm(i, now, 600, tab === 'farm' && i === s.view ? farmEmit : null);
    if (s.run) {
      const live = tab === 'dungeons' && document.visibilityState === 'visible';
      G.advanceRunTo(now, 600, live ? runEmit : null, live ? 'live' : 'auto');
    }
    screens[tab].frame(dt);
    if (now - lastTop > 2000) { lastTop = now; renderTop(); }
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
