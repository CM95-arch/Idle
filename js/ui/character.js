// Screen 4: character stats, one-tap potions, gear and classes.
import { CLASS, CLASSES, STATS, STAT_LABEL, ABILITY_TYPES } from '../data/classes.js';
import { levelInfo, statBreakdown, maxedCount, dpsOf, gearItem } from '../core/character.js';
import { abilityCost } from '../core/combat.js';
import * as G from '../core/game.js';
import { h, showDialog, fmtNum, fmtXp } from './dom.js';
import { heroCanvas, itemIcon } from './sprites.js';
import { heroColors, newCharacterSheet, unlockText } from './common.js';
import { gearSlots, slotSheet } from './gear.js';
import { ABILITY_INFO } from '../core/arena.js';

export function createCharacterScreen(root, app) {
  function drink(slot, k) {
    if (G.drinkPotion(slot, k, 1)) { app.sound?.('drink'); render(); }
  }

  function render() {
    const s = G.state, slot = s.view, c = s.chars[slot];
    root.classList.remove('fit');
    if (!c) {
      root.replaceChildren(h('div', { class: 'panel', style: { textAlign: 'center', padding: '28px 16px' } }, h('div', { class: 'h2' }, 'Empty slot'), h('button', { class: 'btn', style: { marginTop: '10px' }, onclick: () => newCharacterSheet(slot, () => app.refresh()) }, 'Create character')));
      return;
    }
    const C = CLASS[c.cls], li = levelInfo(c.xp), sb = statBreakdown(c, s), F = G.fighter(slot);
    const pc = heroCanvas(c.cls, heroColors(c.cls), false, 8).cloneNode();
    pc.getContext('2d').drawImage(heroCanvas(c.cls, heroColors(c.cls), false, 8), 0, 0); pc.className = 'spr';
    const kids = [h('div', { class: 'panel hero' },
      h('div', { class: 'portrait' }, pc),
      h('div', { style: { display: 'grid', gap: '4px', minWidth: 0 } },
        h('button', { class: 'h1', style: { textAlign: 'left', lineHeight: 1.05 }, onclick: () => rename(slot) }, c.name, h('span', { class: 'muted', style: { fontSize: '14px' } }, ' ✎')),
        h('div', { class: 'small', style: { fontWeight: 800, color: 'var(--ink-2)' } }, `${C.name} · life ${c.life || 1} · ${maxedCount(c, s)}/8 maxed`),
        h('div', { class: 'xprow' }, h('span', {}, `Lv ${li.level}`), h('div', { class: 'bar xpbar' }, h('i', { style: { width: `${(li.into / li.need) * 100}%` } })), h('span', { class: 'muted tnum' }, li.max ? 'MAX' : `${fmtXp(li.into)}/${li.need}`)),
        h('div', { class: 'small muted tnum', style: { fontWeight: 700 } }, `DPS ${fmtNum(dpsOf(F))} · ${fmtNum(c.kills)} kills · ${c.clears} clears`)))];

    const st = h('div', { class: 'panel' });
    for (const k of STATS) {
      const b = sb[k], max = C.max[k], atMax = b.base >= max, ex = G.exaltInfo(c.cls, k), have = G.owned(`pot_${k}`);
      const bonus = b.gear + b.exalt;
      const legacyW = Math.min(100, ((C.base[k] + b.level + b.legacy) / max) * 100), levelW = Math.min(100, ((C.base[k] + b.level) / max) * 100);
      st.append(h('div', { class: 'srow' },
        h('span', { class: 'k', style: { color: `var(--${k})` } }, STAT_LABEL[k]),
        // bar: level stats (dark), class legacy (gold), potions (stat color)
        h('div', { class: 'bar', style: { position: 'relative' } },
          h('i', { style: { width: `${Math.min(100, (b.base / max) * 100)}%`, background: `var(--${k})` } }),
          b.legacy ? h('i', { style: { position: 'absolute', left: 0, top: 0, bottom: 0, width: `${legacyW}%`, background: 'var(--gold)', opacity: 0.75 } }) : null,
          h('i', { style: { position: 'absolute', left: 0, top: 0, bottom: 0, width: `${levelW}%`, background: '#5b6573' } })),
        h('span', { class: `val tnum${atMax ? ' maxed' : ''}` }, `${b.base}/${max}`, bonus ? h('span', { class: 'g' }, ` +${bonus}`) : null, ex.level ? h('span', { class: 'star' }, `★${ex.level > 1 ? ex.level : ''}`) : null),
        h('button', { class: 'drink', disabled: !have || (atMax && ex.maxed), onclick: () => drink(slot, k), title: atMax ? `Exalt ${ex.drunk}/${ex.need}` : '' },
          itemIcon(`pot_${k}`, 18), fmtNum(have), atMax && !ex.maxed ? h('span', { class: 'ex' }, `${ex.drunk}/${ex.need}`) : null)));
    }
    kids.push(st);
    kids.push(h('div', { class: 'small muted', style: { fontWeight: 700, marginTop: '-4px' } }, h('span', { style: { color: '#5b6573' } }, '■'), ' levels  ', h('span', { style: { color: 'var(--gold)' } }, '■'), ` ${C.name} legacy  `, h('span', { style: { color: 'var(--hp)' } }, '■'), ' potions'));
    kids.push(gearSlots(slot, (k) => slotSheet(slot, k, render)));
    const ab = gearItem(c, 'ability');
    kids.push(h('div', { class: 'panel row' }, ab ? itemIcon(ab.id, 34) : null,
      h('div', { class: 'small' }, h('b', {}, ab ? ab.name : ABILITY_TYPES[C.ability].name), ` · ${ABILITY_INFO[C.ability]}`, ab ? h('span', { class: 'muted' }, ` ${abilityCost({ type: ab.type, cost: ab.ability.cost })} MP`) : null)));
    // what a fall costs, and what the class keeps
    const leg = G.legacyOf(s, c.cls), legTotal = STATS.reduce((n, k) => n + (leg[k] || 0), 0);
    kids.push(h('div', { class: 'panel', style: { display: 'grid', gap: '6px' } },
      h('span', { class: 'label' }, `${C.name} legacy`),
      h('div', { class: 'small', style: { fontWeight: 700 } }, legTotal ? STATS.filter((k) => leg[k]).map((k) => `+${leg[k]} ${STAT_LABEL[k]}`).join(' · ') : 'None yet.'),
      h('div', { class: 'small muted', style: { fontWeight: 700 } }, `If ${c.name} falls in a dungeon: back to level 1 and the gear they wear is lost. Every ${C.name} keeps half of their potion stats as legacy (it never goes down). Biomes are safe: they retreat instead.`),
      s.graveyard.length ? h('div', { class: 'small muted' }, h('b', {}, 'Fallen: '), s.graveyard.slice(0, 4).map((g) => `${g.name} (${CLASS[g.cls].name} Lv ${g.level}, ${g.where})`).join(' · ')) : null));
    kids.push(h('div', { class: 'panel', style: { display: 'grid', gap: '8px' } },
      h('div', { class: 'row between' }, h('span', { class: 'label' }, 'Classes'), h('span', { class: 'small muted', style: { fontWeight: 800 } }, `${CLASSES.filter((k) => G.classUnlocked(k.id)).length}/${CLASSES.length}`)),
      h('div', { class: 'classes' }, CLASSES.map((k) => {
        const ok = G.classUnlocked(k.id);
        const cv = heroCanvas(k.id, k.colors, false, 3); const out = cv.cloneNode(); out.getContext('2d').drawImage(cv, 0, 0); out.className = 'spr';
        return h('div', { class: `cls${ok ? '' : ' lock'}${k.id === c.cls ? ' on' : ''}` }, out, h('span', {}, k.name), ok ? h('small', {}, `best Lv ${s.classBest[k.id] || 0}`) : h('small', {}, `🔒 ${unlockText(k.id)}`));
      })),
      h('button', { class: 'btn gray sm', onclick: () => newCharacterSheet(slot, () => app.refresh()) }, 'New character in this slot')));
    root.replaceChildren(...kids);
  }

  function rename(slot) {
    let name = G.state.chars[slot].name;
    showDialog((close) => [h('h2', {}, 'Rename'), h('input', { id: 'rename', maxlength: 16, value: name, oninput: (e) => { name = e.target.value; } }), h('button', { class: 'btn', onclick: () => { G.renameCharacter(slot, name); close(); app.refresh(); } }, 'Save')]);
  }
  return { render, frame() {} };
}
