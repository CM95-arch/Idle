// Party: who fights, every class (owned or still locked), and each class's details sheet.
import { CLASSES, CLASS_IDS, ROLES } from '../data/classes.js';
import { SLOTS, SLOT_NAME } from '../data/gear.js';
import { BAL } from '../data/balance.js';
import * as G from '../core/game.js';
import { heroStats } from '../core/heroes.js';
import { kindFor, fits, itemScore, slotOf, canUpgrade, upgradeCost, maxUpOf } from '../core/items.js';
import { h, openSheet, closeSheet, toast } from './dom.js';
import { portrait, coin, fmt, itemTile, tap } from './common.js';
import { openItemSheet } from './gear.js';
import { statPanel } from './potions.js';
import { formationEditor } from './formation.js';

export function abilityText(cls, pow = 1) {
  const A = CLASSES[cls].ability;
  return A.desc.replace('{p}', Math.round(A.pow * pow * 100));
}

export function openClassSheet(cls, onChange) {
  const sheet = openSheet((close, rerender) => {
    const s = G.state, C = CLASSES[cls], me = s.classes[cls];
    if (!me) return [h('div', { class: 'center muted' }, 'Locked')];
    const st = heroStats(cls, me, s.mult), inParty = s.party.includes(cls);
    const lvBtn = (n, label) => {
      const k = n === 'max' ? Math.max(1, G.affordableLevels(cls)) : n;
      let cost = 0; for (let i = 0; i < k; i++) cost += G.levelCostForLevel(me.lv + i);
      if (G.atCap(cls)) return h('button', { class: 'btn grow sm stack', disabled: true }, h('span', {}, 'Max level'), h('small', {}, `cap ${G.levelCap()}`));
      return h('button', { class: 'btn grow sm stack', disabled: s.fame < G.levelCost(cls), onclick: () => { if (G.levelUp(cls, k)) tap('upgrade'); rerender(); onChange?.(); } }, h('span', {}, label), coin(cost));
    };
    const slotTile = (slot) => {
      const it = me.gear[slot];
      const better = s.inv.some((x) => fits(cls, x) && slotOf(x) === slot && (!it || itemScore(x) > itemScore(it)));
      return h('div', {},
        itemTile(it, { upFor: false, who: false, label: '+', onclick: () => openSlotSheet(cls, slot, () => { rerender(); onChange?.(); }) }),
        h('div', { class: 'lab' }, it ? SLOT_NAME[slot] : KIND_NAME[kindFor(cls, slot)] || SLOT_NAME[slot], better ? h('span', { class: 'delta-up' }, ' ▲') : null));
    };
    const partyAction = inParty
        ? h('button', { class: 'btn alt block', disabled: s.party.length <= 1, onclick: () => { G.removeFromParty(cls); tap(); onChange?.(); close(); } }, s.party.length <= 1 ? 'Your only hero' : 'Remove from party')
        : s.party.length < BAL.partySize
          ? h('button', { class: 'btn block', onclick: () => { G.setParty(s.party.length, cls); tap('equip'); onChange?.(); rerender(); } }, 'Add to party')
          : h('div', {}, h('div', { class: 'h2', style: { marginTop: '4px' } }, 'Swap into the party for…'),
            h('div', { class: 'row' }, s.party.map((p, i) => h('button', { class: 'btn alt grow sm', onclick: () => { G.setParty(i, cls); tap('equip'); onChange?.(); rerender(); } }, portrait(p, 30), CLASSES[p].name))));
    return [
      h('div', { class: 'row' },
        h('div', { style: { width: '92px', display: 'grid', placeItems: 'center' } }, portrait(cls, 118)),
        h('div', { class: 'grow' },
          h('div', { class: 'pixel', style: { fontSize: '24px' } }, C.name),
          h('div', { class: 'muted', style: { fontWeight: 800, fontSize: '13px' } }, `${ROLES[C.role]} · Level ${me.lv} · ${G.maxedCount(cls)}/8`),
          h('div', { class: 'dim', style: { fontSize: '12px', marginTop: '2px' } }, C.blurb))),
      inParty ? null : partyAction,
      h('div', { class: 'row' }, lvBtn(1, `Level ${me.lv + 1}`), lvBtn(10, '+10'), lvBtn('max', 'Max')),
      h('div', { class: 'row between' }, h('div', { class: 'h2', style: { margin: 0 } }, 'Gear'),
        h('button', { class: 'btn sm', disabled: !s.inv.some((x) => G.isUpgradeFor(cls, x)), onclick: () => { const n = G.equipBest(cls); tap('equip'); toast({ title: n ? `Equipped ${n} upgrade${n === 1 ? '' : 's'}` : 'Nothing better in your bag', kind: n ? 'gold' : '' }); rerender(); onChange?.(); } }, 'Equip best')),
      h('div', { class: 'gslots' }, SLOTS.map(slotTile)),
      statPanel(cls, rerender, onChange),
      h('div', { class: 'panel stats' },
        stat('HP', fmt(st.hp)), stat('Attack', fmt(st.atk)), stat('Defense', fmt(st.def)), stat('Fire rate', `${st.spd.toFixed(1)} shots/s`),
        stat('Crit', `${Math.round(st.crit * 100)}%`), stat('Ability power', `${Math.round(st.pow * 100)}%`),
        st.fx.dodge ? stat('Dodge', `${Math.round(Math.min(0.6, st.fx.dodge) * 100)}%`) : null, st.fx.regen ? stat('Regen', `${(st.fx.regen * 100).toFixed(1)}%/s`) : null,
        st.fx.cdr ? stat('Recharge', `+${Math.round(Math.min(0.6, st.fx.cdr) * 100)}%`) : null),
      h('div', { class: 'panel' },
        h('div', { class: 'row between' }, h('b', {}, `✦ ${C.ability.name}`), h('small', { class: 'dim', style: { fontWeight: 800 } }, `every ${C.ability.cd}s`)),
        h('div', { class: 'muted', style: { fontSize: '13px', marginTop: '4px' } }, abilityText(cls, st.pow)),
        C.role === 'tank' ? h('div', { class: 'dim', style: { fontSize: '12px', marginTop: '6px', fontWeight: 700 } }, `Tank · draws the horde and takes ${Math.round(BAL.tankGuard * 100)}% less damage`) : null),
      inParty ? partyAction : null,
    ];
  });
  return sheet;
}
// what goes in an empty slot, by the class's gear kinds
const KIND_NAME = { staff: 'Staff', wand: 'Wand', bow: 'Bow', dagger: 'Dagger', sword: 'Sword', robe: 'Robe', leather: 'Leather', heavy: 'Plate', ring: 'Ring', spell: 'Spell', tome: 'Tome', quiver: 'Quiver', cloak: 'Cloak', helm: 'Helm', shield: 'Shield', trap: 'Trap', skull: 'Skull', poison: 'Poison', seal: 'Seal', scepter: 'Scepter' };
const stat = (k, v) => h('div', { class: 'stat' }, h('span', {}, k), h('b', { class: 'tnum' }, v));

/** Pick gear for one class's slot: what's on now, and everything in the bag that fits. */
export function openSlotSheet(cls, slot, onChange) {
  openSheet((close, rerender) => {
    const s = G.state, me = s.classes[cls], cur = me.gear[slot], kind = kindFor(cls, slot);
    const options = s.inv.filter((it) => it.kind === kind).sort((a, b) => itemScore(b) - itemScore(a));
    return [
      h('div', { class: 'pixel center', style: { fontSize: '20px' } }, `${CLASSES[cls].name} · ${SLOT_NAME[slot]}`),
      cur ? h('div', { class: 'panel', style: { display: 'grid', gap: '10px' } },
        h('div', { class: 'row' },
          h('div', { style: { width: '64px', flex: 'none' } }, itemTile(cur, { upFor: false, who: false, onclick: () => openItemSheet(cur.id, () => { rerender(); onChange?.(); }) })),
          h('div', { class: 'grow' }, h('b', { style: { color: BAL.rarities[cur.rarity].color } }, `${cur.name}${cur.up ? ` +${cur.up}` : ''}`),
            h('div', { class: 'dim', style: { fontSize: '12px', fontWeight: 800 } }, `Upgrades ${cur.up} / ${maxUpOf(cur)}`))),
        h('div', { class: 'row' },
          h('button', { class: 'btn grow sm', disabled: !canUpgrade(cur) || s.fame < upgradeCost(cur), onclick: () => { if (G.upgrade(cur.id)) { tap('upgrade'); rerender(); onChange?.(); } } },
            canUpgrade(cur) ? [h('span', {}, `Upgrade to +${cur.up + 1}`), coin(upgradeCost(cur))] : 'Fully upgraded'),
          h('button', { class: 'btn alt sm', onclick: () => { if (G.unequip(cls, slot)) { tap(); rerender(); onChange?.(); } else toast({ title: 'Your bag is full', body: 'Salvage something first.' }); } }, 'Remove')))
        : h('div', { class: 'panel center dim' }, 'Nothing equipped'),
      h('div', { class: 'h2' }, options.length ? `Vault · ${options.length}` : 'Nothing in the vault fits'),
      h('div', { class: 'igrid' }, options.map((it) => h('div', {},
        itemTile(it, { upFor: false, who: false, onclick: () => { close(); const ok = G.equip(cls, it.id); tap('equip'); if (ok) toast({ title: `Equipped on ${CLASSES[cls].name}`, body: it.name, kind: 'gold' }); onChange?.(); } }),
        h('div', { class: 'center', style: { fontSize: '10px', fontWeight: 900, marginTop: '2px' } }, !cur ? h('span', { class: 'delta-up' }, 'NEW') : itemScore(it) > itemScore(cur) ? h('span', { class: 'delta-up' }, '▲ better') : h('span', { class: 'dim' }, 'weaker'))))),
    ];
  });
}

/** The Companion (a Realm reward): its level, what it does, and a button to level it with Glory. */
function companionCard(rerender) {
  if (!G.hasReward('companion')) return null;
  const s = G.state, lv = s.pet.lv, cap = G.petCap(), full = lv >= cap;
  const share = Math.round((BAL.petBase + BAL.petPerLv * lv) * 100);
  const extras = [G.hasReward('aura') && 'shots burst', G.hasReward('crown') && 'three at once'].filter(Boolean).join(' · ');
  return h('div', { class: 'panel row companion' },
    h('div', { class: 'petic' }, '✦'),
    h('div', { class: 'grow' }, h('b', {}, `Companion · Lv ${lv}`, h('small', { class: 'dim' }, ` / ${cap}`)),
      h('div', { class: 'cdesc' }, `Shoots for ${share}% of the party's damage${extras ? ` · ${extras}` : ''}`)),
    h('button', { class: 'btn sm stack', disabled: full || s.fame < G.petCost(), onclick: () => { if (G.petUp(1)) tap('upgrade'); rerender(); } },
      full ? h('span', {}, 'Max') : h('span', {}, 'Level up'), full ? h('small', {}, 'beat more Realms') : coin(G.petCost())));
}

export function createPartyScreen(root) {
  function render() {
    root.classList.remove('fit');
    const s = G.state;
    const cards = CLASS_IDS.map((cls) => {
      const C = CLASSES[cls], me = s.classes[cls];
      if (me) return h('button', { class: `ccard${s.party.includes(cls) ? ' inparty' : ''}`, onclick: () => openClassSheet(cls, render) }, h('div', { class: 'por' }, portrait(cls, 76)), h('b', {}, C.name), h('small', {}, `Lv ${me.lv} · ${G.maxedCount(cls)}/8`));
      const needs = Object.entries(C.unlock?.needs || {});
      const prog = Math.min(...needs.map(([k, lv]) => Math.min(1, (s.classes[k]?.lv || 0) / lv)));
      return h('div', { class: 'ccard locked' }, h('div', { class: 'por' }, portrait(cls, 76, true)), h('b', {}, C.name),
        h('div', { class: 'req' }, needs.map(([k, lv]) => `${CLASSES[k].name} ${lv}`).join(' + ')),
        h('div', { class: 'pbar' }, h('i', { style: { width: `${prog * 100}%` } })));
    });
    root.replaceChildren(
      h('div', { class: 'h1' }, 'Party'),
      h('div', { class: 'h2', style: { marginTop: 0 } }, 'Formation'),
      formationEditor({ onChange: render, openClass: (c) => openClassSheet(c, render) }).el,
      companionCard(render),
      h('div', { class: 'h2' }, `Classes · ${Object.keys(s.classes).length} / ${CLASS_IDS.length}`),
      h('div', { class: 'grid3' }, cards),
      );
  }
  return { render, frame() {} , close: closeSheet };
}
