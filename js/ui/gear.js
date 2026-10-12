// Gear: the bag, item details with comparisons, upgrading, and salvaging into Fame.
import { CLASSES } from '../data/classes.js';
import { SLOT_NAME, EXTRA, STAT_NAME } from '../data/gear.js';
import { BAL } from '../data/balance.js';
import * as G from '../core/game.js';
import { itemStats, slotOf, fits, itemScore, upgradeCost, canUpgrade, salvageValue } from '../core/items.js';
import { h, openSheet, showDialog, toast } from './dom.js';
import { coin, fmt, itemTile, itemIcon, portrait, rcolor, tap } from './common.js';

const listNames = (cls) => (cls.length > 2 ? `${cls.slice(0, -1).map((c) => CLASSES[c].name).join(', ')} and ${CLASSES[cls[cls.length - 1]].name}` : cls.map((c) => CLASSES[c].name).join(' and '));
const PLURAL = { staff: 'Staves', wand: 'Wands', bow: 'Bows', dagger: 'Daggers', sword: 'Swords', robe: 'Robes', leather: 'Leather armor', heavy: 'Heavy armor', ring: 'Rings', spell: 'Spells', tome: 'Tomes', quiver: 'Quivers', cloak: 'Cloaks', helm: 'Helms', shield: 'Shields', trap: 'Traps', skull: 'Skulls', poison: 'Poisons', seal: 'Seals', scepter: 'Scepters' };
const KIND_LABEL = (it) => PLURAL[it.kind] || it.kind;
const FILTERS = [['all', 'All'], ['weapon', 'Weapons'], ['ability', 'Abilities'], ['armor', 'Armor'], ['ring', 'Rings']];
const AUTO = [[-1, 'Off'], [0, 'Common'], [1, '≤ Uncommon'], [2, '≤ Rare']];

function statRows(it, vs) {
  const a = itemStats(it), b = vs ? itemStats(vs) : null;
  const keys = [...new Set([...Object.keys(a), ...(b ? Object.keys(b) : [])])];
  return keys.map((k) => {
    const name = STAT_NAME[k] || EXTRA[k]?.name || k, pct = k in EXTRA, v = a[k] || 0, d = b ? v - (b[k] || 0) : 0;
    const show = (x) => (k === 'pow' ? `+${Math.round(x * 100)}%` : pct ? `+${Math.round(x)}%` : `+${fmt(x)}`);
    return h('div', { class: 'stat' }, h('span', {}, name), h('b', { class: 'tnum' }, v ? show(v) : '—',
      b && Math.abs(d) > 1e-6 ? h('small', { class: d > 0 ? 'delta-up' : 'delta-down' }, ` ${d > 0 ? '▲' : '▼'}${show(Math.abs(d)).slice(1)}`) : null));
  });
}

/** Details for one item, wherever it is (bag or worn). */
export function openItemSheet(id, onChange) {
  openSheet((close, rerender) => {
    const f = G.findItem(id);
    if (!f) { close(); return []; }
    const { it, cls: wornBy } = f, R = BAL.rarities[it.rarity], slot = slotOf(it);
    const owners = Object.keys(G.state.classes).filter((c) => fits(c, it));
    return [
      h('div', { class: 'row' },
        h('div', { class: `itile r${it.rarity}`, style: { '--rc': R.color, width: '72px' } }, itemIcon(it, 56)),
        h('div', { class: 'grow' },
          h('div', { style: { fontWeight: 900, fontSize: '18px', color: R.color } }, `${it.name}${it.up ? ` +${it.up}` : ''}`),
          h('div', { class: 'muted', style: { fontWeight: 800, fontSize: '12px' } }, `${R.name} ${SLOT_NAME[slot]} · item level ${it.ilvl + 1}`),
          wornBy ? h('div', { class: 'gold', style: { fontWeight: 800, fontSize: '12px' } }, `Worn by ${CLASSES[wornBy].name}`) : null)),
      h('div', { class: 'panel stats', style: { gridTemplateColumns: '1fr' } }, statRows(it)),
      !wornBy && owners.length ? h('div', {}, h('div', { class: 'h2', style: { marginTop: 0 } }, 'Equip on'),
        ...owners.map((c) => {
          const cur = G.state.classes[c].gear[slot], better = !cur || itemScore(it) > itemScore(cur);
          return h('div', { class: 'panel row', style: { marginBottom: '6px', padding: '8px 10px' } }, portrait(c, 40),
            h('div', { class: 'grow' }, h('b', {}, CLASSES[c].name), h('div', { style: { fontSize: '12px', fontWeight: 800 } }, cur ? h('span', { class: better ? 'delta-up' : 'delta-down' }, better ? '▲ Better than current' : '▼ Weaker than current') : h('span', { class: 'delta-up' }, 'Empty slot'))),
            h('button', { class: `btn sm${better ? '' : ' alt'}`, onclick: () => { close(); const ok = G.equip(c, it.id); tap('equip'); toast(ok ? { title: `Equipped on ${CLASSES[c].name}`, body: cur ? `${it.name} on, ${cur.name} back in your bag.` : it.name, kind: 'gold' } : { title: 'Couldn’t equip that', body: 'It may have already been equipped.' }); onChange?.(); } }, 'Equip'));
        })) : null,
      !wornBy && !owners.length ? h('div', { class: 'panel center', style: { fontSize: '13px', fontWeight: 700 } }, h('div', { class: 'muted' }, `Worn by ${listNames(G.wearers(it))}. You haven’t unlocked ${G.wearers(it).length > 1 ? 'any of them' : 'them'} yet.`), h('div', { class: 'dim', style: { marginTop: '4px' } }, 'Keep it for later, or salvage it for Fame.')) : null,
      !wornBy && owners.length ? h('div', { class: 'dim center', style: { fontSize: '11px', fontWeight: 800 } }, `${KIND_LABEL(it)} are worn by ${listNames(G.wearers(it))}.`) : null,
      h('div', { class: 'row' },
        h('button', { class: 'btn grow', disabled: !canUpgrade(it) || G.state.fame < upgradeCost(it), onclick: () => { if (G.upgrade(it.id)) { tap('upgrade'); rerender(); onChange?.(); } } },
          canUpgrade(it) ? [h('span', {}, `Upgrade to +${it.up + 1}`), coin(upgradeCost(it))] : 'Fully upgraded'),
        !wornBy ? h('button', { class: 'btn alt', onclick: () => { const v = G.salvage([it.id]); tap('fame'); toast({ title: `+${fmt(v)} Fame`, body: `Salvaged ${it.name}`, kind: 'gold' }); onChange?.(); close(); } }, h('span', {}, 'Salvage'), coin(salvageValue(it))) : null),
      h('div', { class: 'dim center', style: { fontSize: '11px', fontWeight: 800 } }, `Upgrades ${it.up} / ${R.maxUp} · each adds ${Math.round(BAL.upgradeStep * 100)}% to its main stats`),
    ];
  });
}

export function createGearScreen(root, { onChange }) {
  let filter = 'all';
  function salvageDialog() {
    let max = 0, keepUp = true;
    showDialog((close, rerender) => {
      const pick = G.state.inv.filter((it) => it.rarity <= max && !(keepUp && Object.keys(G.state.classes).some((c) => G.isUpgradeFor(c, it))));
      const gain = pick.reduce((a, it) => a + salvageValue(it), 0);
      return [
        h('h2', {}, 'Salvage'),
        h('div', { class: 'muted center', style: { fontSize: '13px' } }, 'Turn spare gear into Fame. Worn gear is never touched.'),
        h('div', { class: 'row', style: { justifyContent: 'center', flexWrap: 'wrap' } }, BAL.rarities.slice(0, 5).map((R, i) => h('button', { class: `chip${i === max ? ' on' : ''}`, style: { color: R.color }, onclick: () => { max = i; rerender(); } }, i ? `≤ ${R.name}` : R.name))),
        h('button', { class: `chip${keepUp ? ' on' : ''}`, onclick: () => { keepUp = !keepUp; rerender(); } }, keepUp ? '✓ Keep upgrades for any class' : 'Keep upgrades for any class'),
        h('div', { class: 'center', style: { fontWeight: 900 } }, `${pick.length} item${pick.length === 1 ? '' : 's'} → `, coin(gain)),
        h('button', { class: 'btn', disabled: !pick.length, onclick: () => { const v = G.salvage(pick.map((x) => x.id)); tap('fame'); toast({ title: `+${fmt(v)} Fame`, body: `Salvaged ${pick.length} items`, kind: 'gold' }); close(); render(); onChange?.(); } }, 'Salvage'),
        h('button', { class: 'btn alt', onclick: close }, 'Cancel'),
      ];
    });
  }
  function render() {
    root.classList.remove('fit');
    const s = G.state;
    const items = s.inv.filter((it) => filter === 'all' || slotOf(it) === filter).sort((a, b) => b.rarity - a.rarity || b.ilvl - a.ilvl || b.up - a.up);
    const auto = AUTO.find(([v]) => v === s.settings.autoSalvage) || AUTO[0];
    root.replaceChildren(
      h('div', { class: 'row between' }, h('div', { class: 'h1' }, 'Gear'), h('div', { class: 'chip', style: { color: s.inv.length >= G.invCap() ? 'var(--red)' : '' } }, `Bag ${s.inv.length} / ${G.invCap()}`)),
      h('div', { class: 'row', style: { overflowX: 'auto', paddingBottom: '4px' } }, FILTERS.map(([k, l]) => h('button', { class: `chip${k === filter ? ' on' : ''}`, onclick: () => { filter = k; tap(); render(); } }, l))),
      h('div', { class: 'h2' }, items.length ? `${items.length} item${items.length === 1 ? '' : 's'} · ▲ = better for someone in your party` : ''),
      items.length ? h('div', { class: 'igrid' }, items.map((it) => itemTile(it, { onclick: () => openItemSheet(it.id, () => { render(); onChange?.(); }) })))
        : h('div', { class: 'panel center muted' }, s.inv.length ? 'Nothing in this category.' : 'Your bag is empty. Gear drops from waves and bosses.'),
      h('div', { class: 'row', style: { marginTop: '14px' } },
        h('button', { class: 'btn grow sm', disabled: !G.bestUpgrades(), onclick: () => { let n = 0; for (const c of s.party) n += G.equipBest(c); tap('equip'); toast({ title: n ? `Equipped ${n} upgrade${n === 1 ? '' : 's'}` : 'Nothing better to equip', kind: n ? 'gold' : '' }); render(); onChange?.(); } }, 'Equip best for party')),
      h('div', { class: 'row', style: { marginTop: '8px' } },
        h('button', { class: 'btn alt grow sm', onclick: salvageDialog }, 'Salvage…'),
        h('button', { class: 'btn alt grow sm', onclick: () => { const i = AUTO.indexOf(auto); s.settings.autoSalvage = AUTO[(i + 1) % AUTO.length][0]; tap(); G.save(); render(); } }, `Auto-salvage: ${auto[1]}`)),
      h('p', { class: 'dim center', style: { fontSize: '12px', fontWeight: 700 } }, 'When the bag is full, new drops turn straight into Fame.'));
    void rcolor;
  }
  return { render, frame() {} };
}
