// Gear: the bag, item details with comparisons, upgrading, and salvaging into Fame.
import { CLASSES } from '../data/classes.js';
import { SLOT_NAME, EXTRA, STAT_NAME } from '../data/gear.js';
import { BAL } from '../data/balance.js';
import * as G from '../core/game.js';
import { itemStats, slotOf, fits, itemScore, upgradeCost, canUpgrade, salvageValue, ilvlOf, uniqueOf } from '../core/items.js';
import { h, openSheet, toast } from './dom.js';
import { UNIQUES } from '../data/uniques.js';
import { ZONES } from '../data/zones.js';
import { itemImage } from './art/items.js';
import { artImg } from './art/core.js';
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
    const show = (x) => (k === 'pow' ? `+${Math.round(x * 100)}%` : pct ? `${x < 0 ? '−' : '+'}${Math.abs(Math.round(x))}%` : `+${fmt(x)}`);
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
        h('div', { class: `itile r${it.rarity}${uniqueOf(it)?.exalted ? ' ex' : ''}`, style: { '--rc': R.color, width: '72px' } }, itemIcon(it, 56)),
        h('div', { class: 'grow' },
          h('div', { style: { fontWeight: 900, fontSize: '18px', color: uniqueOf(it)?.exalted ? '#ffe08a' : R.color } }, `${it.name}${it.up ? ` +${it.up}` : ''}`),
          h('div', { class: 'muted', style: { fontWeight: 800, fontSize: '12px' } }, `${uniqueOf(it)?.exalted ? 'Exalted Unique' : R.name} ${SLOT_NAME[slot]} · item level ${ilvlOf(it) + 1}`),
          wornBy ? h('div', { class: 'gold', style: { fontWeight: 800, fontSize: '12px' } }, `Worn by ${CLASSES[wornBy].name}`) : null)),
      uniqueOf(it) ? h('div', { class: 'panel ufx' }, h('b', {}, '✦ Unique effect'), h('div', { style: { fontSize: '14px', fontWeight: 700, marginTop: '2px' } }, uniqueOf(it).desc), h('div', { class: 'dim', style: { fontSize: '11px', fontWeight: 800, marginTop: '4px' } }, 'Grows with you: always as strong as gear from just behind your best stage. Kept when you Ascend (upgrades reset).')) : null,
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
  // Salvage mode: tap tiles to pick them, then confirm. null = normal browsing.
  let sel = null;
  const startSalvage = () => { sel = new Set(); tap(); render(); };
  const endSalvage = () => { sel = null; render(); };
  function toggle(id) { if (sel.has(id)) sel.delete(id); else sel.add(id); tap(); render(); }
  function doSalvage() {
    const ids = [...sel].filter((id) => G.state.inv.some((x) => x.id === id));
    if (!ids.length) return;
    const v = G.salvage(ids); tap('fame');
    toast({ title: `+${fmt(v)} Fame`, body: `Salvaged ${ids.length} item${ids.length === 1 ? '' : 's'}`, kind: 'gold' });
    endSalvage(); onChange?.();
  }
  function tile(it) {
    if (!sel) return itemTile(it, { onclick: () => openItemSheet(it.id, () => { render(); onChange?.(); }) });
    const t = itemTile(it, { onclick: () => toggle(it.id) });
    if (sel.has(it.id)) { t.classList.add('picked'); t.append(h('span', { class: 'check' }, '✓')); }
    return t;
  }
  function salvageBar(items) {
    const picked = G.state.inv.filter((it) => sel.has(it.id));
    const gain = picked.reduce((a, it) => a + salvageValue(it), 0);
    const allOn = items.length && items.every((it) => sel.has(it.id));
    return h('div', { class: 'salvbar' },
      h('div', { class: 'row' },
        h('button', { class: 'chip', onclick: () => { for (const it of items) if (it.rarity === 0) sel.add(it.id); tap(); render(); } }, 'All Common'),
        h('button', { class: 'chip', disabled: !items.length, onclick: () => { for (const it of items) if (allOn) sel.delete(it.id); else if (!it.u) sel.add(it.id); tap(); render(); } }, allOn ? 'Clear shown' : 'Select shown'),
        picked.length ? h('button', { class: 'chip', onclick: () => { sel.clear(); tap(); render(); } }, 'Clear') : null),
      h('div', { class: 'row' },
        h('button', { class: 'btn alt sm', onclick: endSalvage }, 'Cancel'),
        h('button', { class: 'btn grow', disabled: !picked.length, onclick: doSalvage },
          picked.length ? [h('span', {}, `Salvage ${picked.length}`), coin(gain)] : 'Select items')));
  }
  function render() {
    root.classList.remove('fit');
    const s = G.state;
    const items = s.inv.filter((it) => filter === 'all' || slotOf(it) === filter).sort((a, b) => b.rarity - a.rarity || b.ilvl - a.ilvl || b.up - a.up);
    const auto = AUTO.find(([v]) => v === s.settings.autoSalvage) || AUTO[0];
    root.replaceChildren(
      h('div', { class: 'row between' }, h('div', { class: 'h1' }, 'Gear'), h('div', { class: 'chip', style: { color: s.inv.length >= G.invCap() ? 'var(--red)' : '' } }, `Bag ${s.inv.length} / ${G.invCap()}`)),
      h('div', { class: 'row', style: { overflowX: 'auto', paddingBottom: '4px' } }, FILTERS.map(([k, l]) => h('button', { class: `chip${k === filter ? ' on' : ''}`, onclick: () => { filter = k; tap(); render(); } }, l))),
      h('div', { class: 'h2' }, sel ? 'Tap items to salvage them' : items.length ? `${items.length} item${items.length === 1 ? '' : 's'} · ▲ = better for someone in your party` : ''),
      items.length ? h('div', { class: 'igrid' }, items.map(tile))
        : h('div', { class: 'panel center muted' }, s.inv.length ? 'Nothing in this category.' : 'Your bag is empty. Gear drops from waves and bosses.'),
      sel ? salvageBar(items) : h('div', {},
        h('div', { class: 'row', style: { marginTop: '14px' } },
          h('button', { class: 'btn grow sm', disabled: !G.bestUpgrades(), onclick: () => { let n = 0; for (const c of s.party) n += G.equipBest(c); tap('equip'); toast({ title: n ? `Equipped ${n} upgrade${n === 1 ? '' : 's'}` : 'Nothing better to equip', kind: n ? 'gold' : '' }); render(); onChange?.(); } }, 'Equip best for party')),
        h('button', { class: 'btn alt block sm', style: { marginTop: '8px' }, onclick: openCollection }, `✦ Uniques found: ${Object.keys(s.uniques).length} / ${UNIQUES.length}`),
        h('div', { class: 'row', style: { marginTop: '8px' } },
          h('button', { class: 'btn alt grow sm', disabled: !s.inv.length, onclick: startSalvage }, 'Salvage'),
          h('button', { class: `btn ${auto[0] >= 0 ? '' : 'alt '}grow sm`, onclick: () => {
            const next = AUTO[(AUTO.indexOf(auto) + 1) % AUTO.length];
            const r = G.setAutoSalvage(next[0]); tap(r.n ? 'fame' : 'tap');
            toast(next[0] < 0 ? { title: 'Auto-salvage off', body: 'Every drop goes into your bag.' }
              : { title: `Auto-salvage: ${next[1]}`, body: r.n ? `Salvaged ${r.n} item${r.n === 1 ? '' : 's'} already in your bag for +${fmt(r.fame)} Fame.` : 'Nothing in your bag to salvage right now.', kind: 'gold' });
            render(); onChange?.();
          } }, `Auto-salvage: ${auto[1]}`)),
        h('p', { class: 'dim center', style: { fontSize: '12px', fontWeight: 700 } },
          auto[0] >= 0 ? `New ${auto[1] === 'Common' ? 'Common' : `${auto[1].replace('≤ ', '')} and lower`} drops turn straight into Fame, unless they’re an upgrade for someone in your party. Uniques are never salvaged.` : 'Tap Auto-salvage to turn low-rarity drops straight into Fame.',
          s.stats.auto?.n ? h('div', { class: 'gold', style: { marginTop: '4px' } }, `Auto-salvaged so far: ${fmt(s.stats.auto.n)} items, +${fmt(s.stats.auto.fame)} Fame`) : null,
          h('div', { style: { marginTop: '4px' } }, 'When the bag is full, new drops turn into Fame too.'))));
    void rcolor;
  }
  return { render, frame() {} };
}

/** Every Unique in the game: the ones you've found, and silhouettes of the rest with where they drop. */
export function openCollection() {
  tap();
  openSheet(() => {
    const found = G.state.uniques;
    return [
      h('div', { class: 'pixel center', style: { fontSize: '22px' } }, 'Uniques'),
      h('div', { class: 'muted center', style: { fontSize: '13px', fontWeight: 700 } }, `${Object.keys(found).length} of ${UNIQUES.length} found. Each zone boss guards its own; its other enemies drop them very rarely. Exalted Uniques are rarer still.`),
      ...ZONES.map((Z, zi) => h('div', {},
        h('div', { class: 'h2' }, `${Z.name} · ${Z.boss[0]}`),
        ...UNIQUES.filter((U) => U.zone === zi).map((U) => {
          const has = found[U.id];
          const icon = artImg(itemImage(U.kind, 6, U.pal)); icon.style.width = '44px';
          return h('div', { class: 'panel row', style: { marginBottom: '6px', padding: '8px 10px', alignItems: 'flex-start' } },
            h('div', { class: `itile r6${U.exalted ? ' ex' : ''}${has ? '' : ' locked'}`, style: { width: '56px', flex: 'none', '--rc': '#fff' } }, icon),
            h('div', { class: 'grow' },
              h('b', { style: { color: has ? (U.exalted ? '#ffe08a' : '#ffffff') : 'var(--ink-3)' } }, has ? U.name : '???', U.exalted ? h('small', { class: 'exalt' }, ' ✦ Exalted') : null),
              h('div', { style: { fontSize: '12px', fontWeight: 700, color: has ? 'var(--ink-2)' : 'var(--ink-3)' } }, has ? U.desc : `Not found yet · ${KIND_LABEL({ kind: U.kind })}`),
              has ? h('div', { class: 'dim', style: { fontSize: '11px', fontWeight: 800 } }, `Found ×${has}`) : null));
        }))),
    ];
  });
}
