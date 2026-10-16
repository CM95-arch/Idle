// The Map: the Realm's zones and stages, then the dungeons, tier by tier: your progress, and where to fight.
import { ZONES, DUNGEONS, TIERS, isBoss, realmName, ROMAN, zoneOf } from '../data/zones.js';
import { UNIQUES } from '../data/uniques.js';
import * as G from '../core/game.js';
import { h } from './dom.js';
import { fmt, tap } from './common.js';
import { arena } from './art/arena.js';

const thumbs = new Map();
const thumb = (Z) => { const k = Z.arena || Z.id; if (!thumbs.has(k)) thumbs.set(k, arena(k).toDataURL('image/jpeg', 0.7)); return thumbs.get(k); };

export function createMapScreen(root, { goBattle }) {
  function zoneCard(Z) {
    const s = G.state, open = Z.dungeon ? G.dungeonOpen(Z) : Z.start <= s.best + 1;
    const cleared = Z.dungeon ? G.dungeonProgress(Z) : Math.max(0, Math.min(Z.len, s.best + 1 - Z.start));
    const nodes = Array.from({ length: Z.len }, (_, k) => {
      const st = Z.start + k, done = k < cleared, now = st === s.stage, can = open && G.canEnter(st), next = can && !done;
      return h('button', { class: `node${done ? ' done' : ''}${now ? ' now' : ''}${next && !now ? ' next' : ''}${isBoss(st) ? ' boss' : ''}`, disabled: !can,
        'aria-label': `${Z.name} stage ${k + 1}`, onclick: () => { G.goToStage(st); tap(); goBattle(); } }, isBoss(st) ? '☠' : `${k + 1}`);
    });
    const drops = UNIQUES.filter((U) => U.src === Z.id && s.realm >= (U.minRealm || 0));
    return h('div', { class: `zone${open ? '' : ' locked'}${Z.dungeon ? ' dungeon' : ''}`, style: { backgroundImage: `url(${thumb(Z)})`, backgroundSize: 'cover', backgroundPosition: 'center 35%' } },
      h('div', { class: 'row between' }, h('h3', {}, Z.name), h('small', { style: { fontWeight: 900, color: '#fff', opacity: 0.85 } }, open ? `${cleared}/${Z.len}` : 'Locked')),
      h('div', { class: `nodes${Z.len === 5 ? ' five' : ''}` }, nodes),
      h('div', { class: 'zfoot' }, h('span', {}, `☠ ${Z.boss[0]}`), h('span', { class: G.partyPower() >= G.stagePower(Z.start + Z.len - 1) ? 'ok' : 'low' }, `⚔ ${fmt(G.stagePower(Z.start + Z.len - 1))}`)),
      drops.length ? h('div', { class: 'zdrops' }, '✦ ', drops.map((U) => (G.state.uniques[U.id] ? U.name : '???')).join(' · ')) : null);
  }
  // two tabs: the Realm's biomes, and the dungeons; it opens on wherever the party is fighting
  let tab = null;
  function render() {
    root.classList.remove('fit');
    const s = G.state, tier = G.dungeonTier();
    if (!tab) tab = zoneOf(s.stage).dungeon ? 'dungeons' : 'biomes';
    const open = DUNGEONS.filter((d) => d.tier <= tier).length;
    const seg = h('div', { class: 'seg' },
      h('button', { class: tab === 'biomes' ? 'on' : '', onclick: () => { tab = 'biomes'; tap(); render(); } }, 'Biomes'),
      h('button', { class: tab === 'dungeons' ? 'on' : '', onclick: () => { tab = 'dungeons'; tap(); render(); } }, 'Dungeons', open ? h('span', { class: 'cnt' }, `${open}`) : null));
    let body;
    if (tab === 'biomes') body = ZONES.filter((Z) => !Z.dungeon).map(zoneCard);
    else {
      body = [];
      for (let t = 1; t <= TIERS; t++) {
        const list = DUNGEONS.filter((d) => d.tier === t), unlocked = t <= tier;
        if (unlocked) { body.push(h('div', { class: 'tierhead' }, h('b', {}, `Tier ${ROMAN[t - 1]}`)), ...list.map(zoneCard)); continue; }
        // locked tiers fold into one line each: what's there, and what opens it
        body.push(h('div', { class: 'tierlock' }, h('span', { class: 'lk' }, '🔒'), h('div', { class: 'grow' }, h('b', {}, `Tier ${ROMAN[t - 1]}`), h('small', {}, list.map((d) => d.name).join(' · '))),
          h('small', { class: 'req' }, `Oryx · ${realmName(t - 1)}`)));
      }
      if (!tier) body.unshift(h('div', { class: 'panel center muted', style: { fontSize: '13px', fontWeight: 800 } }, 'Defeat Oryx to open the first dungeons.'));
    }
    root.replaceChildren(
      h('div', { class: 'row between' }, h('div', { class: 'h1' }, 'Map'), h('div', { class: 'chip on' }, `⚔ ${fmt(G.partyPower())}`)),
      seg, ...body);
  }
  return { render, frame() {} };
}
