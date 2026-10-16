// The Map: the Realm's zones and stages, then the dungeons, tier by tier: your progress, and where to fight.
import { ZONES, DUNGEONS, TIERS, isBoss, realmName, ROMAN } from '../data/zones.js';
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
    const drops = UNIQUES.filter((U) => U.src === Z.id);
    return h('div', { class: `zone${open ? '' : ' locked'}${Z.dungeon ? ' dungeon' : ''}`, style: { backgroundImage: `url(${thumb(Z)})`, backgroundSize: 'cover', backgroundPosition: 'center 35%' } },
      h('div', { class: 'row between' }, h('h3', {}, Z.name), h('small', { style: { fontWeight: 900, color: '#fff', opacity: 0.85 } }, open ? `${cleared}/${Z.len}` : 'Locked')),
      h('div', { class: `nodes${Z.len === 5 ? ' five' : ''}` }, nodes),
      h('div', { class: 'zfoot' }, `Boss: ${Z.boss[0]} · needs ⚔ ${fmt(G.stagePower(Z.start + Z.len - 1))}`),
      drops.length ? h('div', { class: 'zdrops' }, '✦ ', drops.map((U) => (G.state.uniques[U.id] ? U.name : '???')).join(' · ')) : null);
  }
  function render() {
    root.classList.remove('fit');
    const s = G.state, pw = G.partyPower(), tier = G.dungeonTier();
    const tiers = [];
    for (let t = 1; t <= TIERS; t++) {
      const list = DUNGEONS.filter((d) => d.tier === t), open = t <= tier;
      tiers.push(h('div', { class: `tierhead${open ? '' : ' locked'}` }, h('b', {}, `Tier ${ROMAN[t - 1]}`),
        h('small', {}, open ? list.map((d) => d.name).join(' · ') : `Beat Oryx in ${realmName(t - 1)} to unlock`)));
      // locked tiers past the next one stay folded up
      if (open || t === tier + 1) tiers.push(...list.map(zoneCard));
    }
    root.replaceChildren(
      h('div', { class: 'row between' }, h('div', { class: 'h1' }, 'The Realm'), h('div', { class: 'chip on' }, realmName(s.realm))),
      h('div', { class: 'muted', style: { fontSize: '13px', fontWeight: 700, margin: '-4px 2px 12px' } }, `Your party: ⚔ ${fmt(pw)}. Tap any cleared stage to farm it, or the next one to push.`),
      ...ZONES.filter((Z) => !Z.dungeon).map(zoneCard),
      h('div', { class: 'h2' }, `Dungeons · tier ${tier} of ${TIERS}`),
      h('div', { class: 'muted', style: { fontSize: '13px', fontWeight: 700, margin: '-2px 2px 12px' } },
        'Each Oryx you defeat (once per Realm) opens the next tier for good. Dungeons are five stages and their boss, run again and again: their bosses guard the Uniques listed on each.'),
      ...tiers);
  }
  return { render, frame() {} };
}
