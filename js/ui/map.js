// The Realm map: every zone and stage, your progress, and where to fight.
import { ZONES, MAIN_ZONES, STAGES_PER_ZONE, stageLabel, isBoss, realmName } from '../data/zones.js';
import * as G from '../core/game.js';
import { h } from './dom.js';
import { fmt, tap } from './common.js';
import { arena } from './art/arena.js';

const thumbs = new Map();
const thumb = (id) => { if (!thumbs.has(id)) thumbs.set(id, arena(id).toDataURL('image/jpeg', 0.7)); return thumbs.get(id); };

export function createMapScreen(root, { goBattle }) {
  function render() {
    root.classList.remove('fit');
    const s = G.state, pw = G.partyPower();
    const zones = ZONES.map((Z, zi) => {
      const first = zi * STAGES_PER_ZONE, open = first <= s.best + 1 && (!Z.endgame || G.endgameOpen());
      const nodes = Array.from({ length: STAGES_PER_ZONE }, (_, k) => {
        const st = first + k, done = st <= s.best, now = st === s.stage, next = st === s.best + 1, can = open && st <= s.best + 1;
        return h('button', { class: `node${done ? ' done' : ''}${now ? ' now' : ''}${next && !now ? ' next' : ''}${isBoss(st) ? ' boss' : ''}`, disabled: !can,
          'aria-label': `Stage ${stageLabel(st)}`, onclick: () => { G.goToStage(st); tap(); goBattle(); } }, isBoss(st) ? '☠' : `${k + 1}`);
      });
      const cleared = Math.max(0, Math.min(STAGES_PER_ZONE, s.best + 1 - first));
      return h('div', { class: `zone${open ? '' : ' locked'}${Z.endgame ? ' endgame' : ''}`, style: { backgroundImage: `url(${thumb(Z.id)})`, backgroundSize: 'cover', backgroundPosition: 'center 35%' } },
        h('div', { class: 'row between' }, h('h3', {}, Z.name), h('small', { style: { fontWeight: 900, color: '#fff', opacity: 0.85 } }, open ? `${cleared}/${STAGES_PER_ZONE}` : 'Locked')),
        h('div', { class: 'nodes' }, nodes),
        h('div', { style: { marginTop: '8px', fontSize: '12px', fontWeight: 800, color: '#fff', opacity: 0.85 } }, `Boss: ${Z.boss[0]} · needs ⚔ ${fmt(G.stagePower(first + STAGES_PER_ZONE - 1))}`));
    });
    root.replaceChildren(
      h('div', { class: 'row between' }, h('div', { class: 'h1' }, 'The Realm'), h('div', { class: 'chip on' }, realmName(s.realm))),
      h('div', { class: 'muted', style: { fontSize: '13px', fontWeight: 700, margin: '-4px 2px 12px' } }, `Your party: ⚔ ${fmt(pw)}. Tap any cleared stage to farm it, or the next one to push.`),
      ...zones.slice(0, MAIN_ZONES),
      h('div', { class: 'h2' }, 'Endgame dungeons · optional'),
      h('div', { class: 'muted', style: { fontSize: '13px', fontWeight: 700, margin: '-2px 2px 12px' } }, G.endgameOpen()
        ? 'Far harder than anything in the Realm: farm, level and upgrade to get through. Their bosses guard the best Uniques. You can Ascend at any time instead.'
        : 'Open once Oryx falls: the Lost Halls and the Shatters, far harder, with the best Uniques in the game.'),
      ...zones.slice(MAIN_ZONES));
  }
  return { render, frame() {} };
}
