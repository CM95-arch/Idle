// Boots the game: top bar, tabs, the frame loop, saving, and offline earnings.
import { BUILD } from './config.js';
import * as G from './core/game.js';
import { h, $, openSheet, confirmDialog, toast } from './ui/dom.js';
import { initSound, setSoundEnabled, play } from './ui/sound.js';
import { fmt, tap } from './ui/common.js';
import { createBattleScreen } from './ui/battle.js';
import { createPartyScreen, openClassSheet } from './ui/party.js';
import { createGearScreen, openItemSheet } from './ui/gear.js';
import { createMapScreen } from './ui/map.js';
import { createAscendScreen } from './ui/ascend.js';
import { showWelcome, showOffline, showUnlock, showAscended, showUnique } from './ui/celebrate.js';
import { icon } from './ui/icons.js';
import { runTour, touring } from './ui/tour.js';
import { CLASSES } from './data/classes.js';
import { heroImage } from './ui/art/heroes.js';

// show any error as a toast, so problems on a phone can be reported
window.addEventListener('error', (e) => toast({ title: 'Something went wrong', body: String(e.message || e.error || 'unknown error').slice(0, 140) }));
window.addEventListener('unhandledrejection', (e) => toast({ title: 'Something went wrong', body: String(e.reason?.message || e.reason).slice(0, 140) }));

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
  battle: createBattleScreen($('#scr-battle'), { onFame, openClass: (c) => openClassSheet(c, refresh), onDrop: (it, r) => setTimeout(() => showUnique(it, seeItem, r?.dupe), 1700) }),
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
function seeItem(it) { go('gear'); openItemSheet(it.id, refresh); }
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

// ---------- walkthrough ----------
const tab = (k) => () => tabEls[k];
const TOUR = [
  { title: 'Welcome, hero', text: 'A quick tour of how everything works. It takes about half a minute.', before: () => go('battle') },
  { target: () => fameBox, title: 'Fame', text: 'Your one currency. You earn it from every enemy, every cleared stage, salvaged gear, and even while you’re away. Spend it to grow stronger.' },
  { target: () => $('.arena'), title: 'The battle', text: 'The horde never stops coming. Your party holds its ground and fights on its own; slay 50 to clear a stage and push on, and every tenth stage a boss joins the horde. Attacks, abilities and loot all happen automatically.' },
  { target: () => $('.stagebar .power'), title: 'Power', text: 'Your party’s strength against what this stage needs. Green means you should win. Red means level up or gear up first.' },
  { target: () => $('.stagebar .toggle'), title: 'Auto or Farm', text: 'Auto moves on to the next stage after every win. Switch to Farm to stay on one stage and keep earning.' },
  { target: () => $('.htabs'), title: 'Your party', text: 'Tap a hero to choose who to upgrade. Tap the chosen hero again for their stats, ability and gear. A gold dot means they have something you can afford.' },
  { target: () => $('.hpanel .lvbtn'), title: 'Level up', text: 'Spend Fame to level the chosen hero: more HP, damage and armor. Hold any button to keep buying.' },
  { target: () => $('.dpots'), title: 'Stat potions', text: 'The eight ROTMG stats, in their potion colors. Each potion raises a stat toward this class’s max. Max all eight (8/8) before Oryx’s Castle.' },
  { target: () => $('.lvmode .chip'), title: 'Buy ×1, ×10, Max', text: 'Tap to switch how many levels or potions each press buys.' },
  { target: tab('party'), title: 'Party', text: 'All your classes. Leveling unlocks new ones: Wizard level 5 unlocks the Priest, and so on. Up to three fight at once, and you can swap them any time.' },
  { target: tab('gear'), title: 'Gear', text: 'The only loot is Uniques: named items with special powers, guarded by each zone’s boss. Their bonuses are percentages, so they never go stale. Each class wears its own kinds (Wizards: staves, robes, spells, rings). A repeat find upgrades the copy you have.' },
  { target: tab('map'), title: 'Map', text: 'The whole Realm, from the Beaches to Oryx’s Castle, and after Oryx the optional Lost Halls and Shatters. Tap any stage you’ve cleared to farm it.' },
  { target: tab('ascend'), title: 'Ascend', text: 'Defeat Oryx the Mad God to Ascend: start over in a harder Realm with permanent bonuses that keep stacking.' },
  { title: 'While you’re away', text: 'Your party keeps fighting for up to 8 hours when the game is closed. Come back to collect what they earned. Good luck, hero.', done: 'Begin' },
];
function startTour() { if (touring()) return; runTour(TOUR, () => { G.state.flags.tour = true; G.save(); }); }

// ---------- settings ----------
function openSettings() {
  tap();
  openSheet((close, rerender) => [
    h('div', { class: 'pixel center', style: { fontSize: '22px' } }, 'Settings'),
    h('button', { class: 'btn alt block', onclick: () => { close(); startTour(); } }, 'Replay the walkthrough'),
    h('button', { class: 'btn alt block', onclick: () => { G.state.settings.sound = !G.state.settings.sound; setSoundEnabled(G.state.settings.sound); G.save(); rerender(); } }, `Sound: ${G.state.settings.sound ? 'On' : 'Off'}`),
    h('div', { class: 'panel', style: { fontSize: '13px', fontWeight: 700 } },
      h('div', { class: 'stat' }, h('span', {}, 'Enemies defeated'), h('b', {}, fmt(G.state.stats.kills))),
      h('div', { class: 'stat' }, h('span', {}, 'Stages cleared'), h('b', {}, fmt(G.state.stats.clears))),
      h('div', { class: 'stat' }, h('span', {}, 'Bosses slain'), h('b', {}, fmt(G.state.stats.bosses))),
      h('div', { class: 'stat' }, h('span', {}, 'Fame earned'), h('b', {}, fmt(G.state.stats.fameEarned))),
      h('div', { class: 'stat' }, h('span', {}, 'Offline limit'), h('b', {}, `${G.offlineCapH()}h`))),
    h('div', { class: 'panel', style: { fontSize: '13px', fontWeight: 700 } },
      h('div', { class: 'stat' }, h('span', {}, 'Uniques found'), h('b', {}, `${Object.keys(G.state.uniques).length}`)),
      h('div', { class: 'stat' }, h('span', {}, 'Ascensions'), h('b', {}, `${G.state.ascensions}`))),
    h('button', { class: 'btn red block', onclick: async () => { if (await confirmDialog({ title: 'Erase all progress?', body: 'This deletes your save on this device. It cannot be undone.', ok: 'Erase', danger: true })) { G.resetAll(); close(); location.reload(); } } }, 'Erase progress'),
    h('div', { class: 'dim center', style: { fontSize: '11px', fontWeight: 800 } }, `Realm Idle · build ${BUILD} · `,
      h('button', { class: 'linkbtn', onclick: () => { G.state.settings.tapDebug = !G.state.settings.tapDebug; G.save(); tapDebug(G.state.settings.tapDebug); rerender(); } }, `tap debugger ${G.state.settings.tapDebug ? 'on' : 'off'}`)),
  ]);
}

// ---------- tap debugger (Settings): shows what each touch actually reaches, to diagnose dead buttons ----------
let dbg = null;
function tapDebug(on) {
  if (!on) { dbg?.el.remove(); for (const [t, f] of dbg?.ls || []) window.removeEventListener(t, f, true); dbg = null; return; }
  if (dbg) return;
  const el = h('div', { style: { position: 'fixed', left: '6px', right: '6px', bottom: 'calc(var(--sab) + 70px)', zIndex: 99999, pointerEvents: 'none', background: 'rgba(0,0,0,.82)', color: '#9f9', font: '11px/1.35 monospace', padding: '6px 8px', borderRadius: '8px', whiteSpace: 'pre-wrap' } });
  const lines = [];
  const desc = (n) => (n ? `${n.tagName?.toLowerCase()}${n.className && typeof n.className === 'string' ? `.${n.className.trim().split(/\s+/).slice(0, 2).join('.')}` : ''}${n.textContent ? ` "${n.textContent.trim().slice(0, 14)}"` : ''}` : '—');
  const log = (t) => (e) => { const pt = e.changedTouches?.[0] || e; const top = document.elementFromPoint(pt.clientX, pt.clientY); lines.push(`${t.padEnd(10)} ${desc(e.target).padEnd(34)} top:${desc(top)}`); while (lines.length > 7) lines.shift(); el.textContent = lines.join('\n'); };
  const ls = ['touchstart', 'touchend', 'touchcancel', 'pointercancel', 'click'].map((t) => [t, log(t)]);
  for (const [t, f] of ls) window.addEventListener(t, f, { capture: true, passive: true });
  document.body.append(el);
  dbg = { el, ls };
}
if (G.state.settings.tapDebug) tapDebug(true);

// ---------- offline earnings ----------
function collect() {
  const r = G.collectOffline();
  if (r) { showOffline(r, () => { onFame(r.fame); refresh(); }); for (const u of r.uniques) showUnique(u.it, seeItem, u.dupe); }
  // an older save's regular gear was turned into Fame when it loaded
  const old = G.state.flags.retired;
  if (old) { delete G.state.flags.retired; G.save(); setTimeout(() => toast({ title: 'Regular gear is gone', body: `Only Uniques drop now. Your ${old.n} old items became +${fmt(old.fame)} Fame.`, kind: 'gold' }), 1500); }
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
if (!G.state.flags.intro) showWelcome(() => { G.state.flags.intro = true; G.save(); setTimeout(startTour, 400); });
else { collect(); if (!G.state.flags.tour) setTimeout(() => { if (!document.querySelector('#overlay-root .overlay')) startTour(); }, 900); }
requestAnimationFrame(frame);
// decode every hero's art in the background so unlocks and swaps show instantly
setTimeout(() => { for (const c of Object.keys(CLASSES)) for (const back of [false, true]) heroImage(c, back); }, 1500);
