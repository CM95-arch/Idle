// Long-term goals on screen: the Realm rewards track and the achievements sheet.
import { REWARDS, ACHIEVEMENTS } from '../data/rewards.js';
import { realmName } from '../data/zones.js';
import * as G from '../core/game.js';
import { h, openSheet } from './dom.js';
import { tap } from './common.js';

const pct = (v) => `+${Math.round(v * 100)}%`;
/** What an achievement pays, in a few words. */
export const achPays = (A) => [A.dmg && `${pct(A.dmg)} damage`, A.hp && `${pct(A.hp)} HP`, A.fame && `${pct(A.fame)} Glory`].filter(Boolean).join(' · ');

/** The Realm rewards: ones you've earned, the next one, and the rest further off. */
export function rewardTrack() {
  const peak = G.state.peak || 0, next = G.nextReward();
  return h('div', { class: 'rtrack' }, REWARDS.map((R) => {
    const got = peak >= R.realm, isNext = R === next;
    return h('div', { class: `rrow${got ? ' got' : ''}${isNext ? ' next' : ''}` },
      h('div', { class: 'ric' }, got ? R.icon : '🔒'),
      h('div', { class: 'grow' },
        h('b', {}, R.name),
        h('div', { class: 'rdesc' }, R.desc)),
      h('small', { class: 'rreq' }, got ? '✓' : realmName(R.realm - 1)));
  }));
}

export function openAchievements() {
  tap();
  openSheet(() => {
    const s = G.state, done = ACHIEVEMENTS.filter((A) => s.ach?.[A.id]).length, b = G.achBonus();
    return [
      h('div', { class: 'pixel center', style: { fontSize: '22px' } }, 'Achievements'),
      h('div', { class: 'muted center', style: { fontSize: '13px', fontWeight: 700 } }, `${done} of ${ACHIEVEMENTS.length} · ${[b.dmg && `${pct(b.dmg)} damage`, b.hp && `${pct(b.hp)} HP`, b.fame && `${pct(b.fame)} Glory`].filter(Boolean).join(' · ') || 'no bonuses yet'}`),
      ...ACHIEVEMENTS.map((A) => {
        const got = !!s.ach?.[A.id];
        return h('div', { class: `panel row ach${got ? ' got' : ''}` },
          h('div', { class: 'aic' }, got ? '🏆' : '·'),
          h('div', { class: 'grow' }, h('b', {}, A.name), h('div', { class: 'adesc' }, A.desc)),
          h('small', { class: 'apay' }, achPays(A)));
      }),
    ];
  });
}
