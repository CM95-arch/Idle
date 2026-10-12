// Boots the game: top bar, tabs, the frame loop, saving, and offline earnings.
import { BUILD } from './config.js';
import * as G from './core/game.js';
import { h, $, openSheet, confirmDialog, toast } from './ui/dom.js';
import { initSound, setSoundEnabled, play } from './ui/sound.js';
import { fmt, tap } from './ui/common.js';
import { createBattleScreen } from './ui/battle.js';
import { createPartyScreen, openClassSheet } from './ui/party.js';
import { createGearScreen } from './ui/gear.js';
import { createMapScreen } from './ui/map.js';
import { createAscendScreen } from './ui/ascend.js';
import { showWelcome, showOffline, showUnlock, showAscended } from './ui/celebrate.js';
import { icon } from './ui/icons.js';

G.load();
initSound(G.state.settings.sound);

// ---------- top bar ----------
const fameEl = h('b', { class: 'tnum' }, '0'), rateEl = h('small', {}, '');
const fameBox = h('div', { class: 'fame' }, h('span', { class: 'coin' }), h('div', {}, fameEl, rateEl));
const realmEl = h('div', { class: 'realm-tag grow' });
$('#topbar').append(fameBox, realmEl, h('button', { class: 'iconbtn', 'aria-label': 'Settings', onclick: openSettings }, icon('settings', 20)));
const recent = []; // fame earned in the last minute, for the rate readout
function onFame(n) {
  recent.push([performance.now(), n]);
  fameBox.classList.remove('bump'); void fameBox.offsetWidth; fameBox.classList.add('bump');
  if (Math.random() < 0.35) play('fame');
}
function updateTop() {
  fameEl.textContent = fmt(G.state.fame);
  const now = performance.now();
  while (recent.length && now - recent[0][0] > 60000) recent.shift();
  const per = recent.reduce((a, [, n]) => a + n, 0) * (60000 / Math.max(10000, now - (recent[0]?.[0] ?? now)));
  rateEl.textContent = recent.length ? `${fmt(per)} / min` : 'Fame';
  realmEl.textContent = G.state.realm ? `Realm ${['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'][G.state.realm] || G.state.realm + 1}` : '';
}

// ---------- screens ----------
const TABS = [
  ['battle', 'Battle'], ['party', 'Party'], ['gear', 'Gear'], ['map', 'Map'], ['ascend', 'Ascend'],
];
let current = 'battle';
const screens = {
  battle: createBattleScreen($('#scr-battle'), { onFame, openClass: (c) => openClassSheet(c, refresh) }),
  party: createPartyScreen($('#scr-party')),
  gear: createGearScreen($('#scr-gear'), { onChange: refresh }),
  map: createMapScreen($('#scr-map'), { goBattle: () => go('battle') }),
  ascend: createAscendScreen($('#scr-ascend'), { onAscend: (P) => { showAscended(P); go('battle'); } }),
};
const tabEls = {};
$('#tabs').append(...TABS.map(([id, label]) => (tabEls[id] = h('button', { class: 'tab', onclick: () => { tap(); go(id); } }, h('span', { class: 'ti' }, icon(id, 22)), h('span', {}, label)))));
function go(id) {
  current = id;
  for (const [k] of TABS) $(`#scr-${k}`).classList.toggle('hidden', k !== id);
  screens.battle.show(id === 'battle');
  if (id !== 'battle') screens[id].render();
  updateTabs();
}
function refresh() {
  if (current !== 'battle') screens[current].render();
  screens.battle.update(true);
  updateTabs();
}
function updateTabs() {
  for (const [k] of TABS) tabEls[k].classList.toggle('on', k === current);
  const ups = G.bestUpgrades();
  setBadge('gear', ups ? `${ups}` : '');
  setBadge('ascend', G.canAscend() ? '!' : '', true);
  tabEls.ascend.classList.toggle('locked', !G.canAscend() && !G.state.ascensions);
}
function setBadge(k, text, gold) {
  let b = tabEls[k].querySelector('.badge');
  if (!text) { b?.remove(); return; }
  if (!b) { b = h('span', { class: `badge${gold ? ' gold' : ''}` }); tabEls[k].append(b); }
  b.textContent = text;
}

// ---------- events from the game ----------
G.onChange((why) => {
  if (why?.unlock) showUnlock(why.unlock, why.joined, (c) => openClassSheet(c, refresh));
  if (why === 'gear' || why === 'party' || why?.unlock || why === 'ascend') { screens.battle.update(true); updateTabs(); }
});

// ---------- settings ----------
function openSettings() {
  tap();
  openSheet((close, rerender) => [
    h('div', { class: 'pixel center', style: { fontSize: '22px' } }, 'Settings'),
    h('button', { class: 'btn alt block', onclick: () => { G.state.settings.sound = !G.state.settings.sound; setSoundEnabled(G.state.settings.sound); G.save(); rerender(); } }, `Sound: ${G.state.settings.sound ? 'On' : 'Off'}`),
    h('div', { class: 'panel', style: { fontSize: '13px', fontWeight: 700 } },
      h('div', { class: 'stat' }, h('span', {}, 'Enemies defeated'), h('b', {}, fmt(G.state.stats.kills))),
      h('div', { class: 'stat' }, h('span', {}, 'Stages cleared'), h('b', {}, fmt(G.state.stats.clears))),
      h('div', { class: 'stat' }, h('span', {}, 'Bosses slain'), h('b', {}, fmt(G.state.stats.bosses))),
      h('div', { class: 'stat' }, h('span', {}, 'Fame earned'), h('b', {}, fmt(G.state.stats.fameEarned))),
      h('div', { class: 'stat' }, h('span', {}, 'Offline limit'), h('b', {}, `${G.offlineCapH()}h`))),
    h('div', { class: 'panel dim', style: { fontSize: '12px', fontWeight: 700 } }, 'Gold (for extra bag space, offline time and party slots) arrives with the store in a later update. Everything in the game can be earned with Fame.'),
    h('button', { class: 'btn red block', onclick: async () => { if (await confirmDialog({ title: 'Erase all progress?', body: 'This deletes your save on this device. It cannot be undone.', ok: 'Erase', danger: true })) { G.resetAll(); close(); location.reload(); } } }, 'Erase progress'),
    h('div', { class: 'dim center', style: { fontSize: '11px', fontWeight: 800 } }, `Realm Idle · build ${BUILD}`),
  ]);
}

// ---------- offline earnings ----------
function collect() {
  const r = G.collectOffline();
  if (r) showOffline(r, () => { onFame(r.fame); refresh(); });
}

// ---------- loop ----------
let last = performance.now(), saveT = 0;
function frame(t) {
  const dt = Math.min(0.1, (t - last) / 1000); last = t;
  screens.battle.frame(dt);
  updateTop();
  if ((saveT += dt) > 10) { saveT = 0; G.save(); }
  requestAnimationFrame(frame);
}

document.addEventListener('visibilitychange', () => {
  if (document.hidden) G.save();
  else { last = performance.now(); collect(); refresh(); }
});
window.addEventListener('pagehide', () => G.save());
window.addEventListener('resize', () => screens.battle.resize());

if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});

go('battle');
if (!G.state.flags.intro) showWelcome(() => { G.state.flags.intro = true; G.save(); });
else collect();
requestAnimationFrame(frame);
void toast;
