// Screen 4: character stats, potions, gear, classes and settings.
import { CONFIG } from '../config.js';
import { CLASS, CLASSES, STATS, STAT_LABEL, STAT_NAME, ABILITY_TYPES } from '../data/classes.js';
import { ITEMS, tierLabel } from '../data/items.js';
import { levelInfo, statBreakdown, maxedCount, dpsOf } from '../core/character.js';
import { abilityCost } from '../core/combat.js';
import * as G from '../core/game.js';
import { h, openSheet, showDialog, confirmDialog, toast, fmtNum } from './dom.js';
import { itemIcon, heroCanvas } from './sprites.js';
import { chips, heroColors, newCharacterSheet, unlockText } from './common.js';
import { openEquipPicker } from './itemSheet.js';

const statColor = (k) => `var(--${k})`;

export function createCharacterScreen(root) {
  function statSheet(slot, k) {
    openSheet((close, rerender) => {
      const c = G.state.chars[slot], C = CLASS[c.cls], sb = statBreakdown(c, G.state)[k];
      const have = G.owned(`pot_${k}`), ex = G.exaltInfo(c.cls, k);
      const atMax = c.stats[k] >= C.max[k];
      const toMax = Math.ceil((C.max[k] - c.stats[k]) / CONFIG.potionGain[k]);
      return [
        h('div', { class: 'row' }, itemIcon(`pot_${k}`, 40), h('div', {}, h('div', { class: 'title', style: { fontSize: '17px' } }, `${STAT_NAME[k]} (${STAT_LABEL[k]})`), h('div', { class: 'small muted' }, `${fmtNum(have)} potions in the vault`))),
        h('div', { class: 'kv tnum' },
          h('div', {}, h('span', {}, 'Base + potions'), `${c.stats[k]} / ${C.max[k]}`), h('div', {}, h('span', {}, 'Gear'), `+${sb.gear}`),
          h('div', {}, h('span', {}, 'Exaltation'), `+${sb.exalt}`), h('div', {}, h('span', {}, 'Total'), String(sb.total))),
        atMax
          ? h('div', { class: 'card small' }, h('b', { style: { color: 'var(--ember)' } }, `Maxed. Exaltation ${ex.level}/${CONFIG.exaltMax}`),
            h('div', { class: 'muted' }, ex.maxed ? `Fully exalted. Extra ${STAT_NAME[k]} potions are best dismantled for Essence.` : `${ex.drunk} / ${ex.need} potions toward +${CONFIG.exaltGain[k]} ${STAT_LABEL[k]} for every ${C.name}.`),
            ex.maxed ? null : h('div', { class: 'bar xpbar', style: { marginTop: '6px' } }, h('i', { style: { width: `${(ex.drunk / ex.need) * 100}%` } })))
          : h('div', { class: 'small muted' }, `Each potion adds +${CONFIG.potionGain[k]}. ${toMax} more to max.`),
        h('div', { class: 'row' },
          h('button', { class: 'btn sm grow', disabled: !have || ex.maxed && atMax, onclick: () => { G.drinkPotion(slot, k, 1); rerender(); render(); } }, 'Drink 1'),
          h('button', { class: 'btn ghost sm grow', disabled: have < 2 || ex.maxed && atMax, onclick: () => { const n = G.drinkPotion(slot, k, atMax ? have : Math.min(have, toMax)); toast({ title: `Drank ${n}`, body: `${STAT_NAME[k]} potions`, icon: itemIcon(`pot_${k}`, 26) }); rerender(); render(); } }, atMax ? 'Drink all' : `Drink to max (${Math.min(have, toMax)})`)),
      ];
    });
  }

  function settings() {
    showDialog((close) => [
      h('h2', {}, 'Settings & save'),
      h('p', { class: 'small muted', style: { margin: 0 } }, 'Your game saves on this device. Copy the save code to move it to another device or keep a backup.'),
      h('button', { class: 'btn ghost sm', onclick: async () => {
        const code = G.exportSave();
        try { await navigator.clipboard.writeText(code); toast({ title: 'Save code copied' }); } catch { showDialog((c2) => [h('h2', {}, 'Save code'), h('textarea', { readonly: true, style: { height: '140px', background: 'var(--well)', color: 'var(--parchment)', border: '1px solid var(--seam)', borderRadius: '10px', userSelect: 'text' } }, code), h('button', { class: 'btn', onclick: c2 }, 'Done')]); }
      } }, 'Copy save code'),
      h('button', { class: 'btn ghost sm', onclick: () => {
        close();
        let text = '';
        showDialog((c2) => [h('h2', {}, 'Load a save'), h('textarea', { id: 'import-save', placeholder: 'Paste a save code', oninput: (e) => { text = e.target.value; }, style: { height: '140px', background: 'var(--well)', color: 'var(--parchment)', border: '1px solid var(--seam)', borderRadius: '10px', userSelect: 'text', WebkitUserSelect: 'text' } }),
          h('button', { class: 'btn', onclick: () => { try { G.importSave(text); c2(); location.reload(); } catch (e) { toast({ title: 'Could not load that save', body: e.message, kind: 'bad' }); } } }, 'Load save')]);
      } }, 'Load a save code'),
      h('button', { class: 'btn stop sm', onclick: async () => { if (await confirmDialog({ title: 'Erase everything?', body: 'This deletes all characters, items and progress on this device.', ok: 'Erase', danger: true })) { G.resetGame(); location.reload(); } } }, 'Erase save'),
      h('p', { class: 'small muted', style: { margin: 0, textAlign: 'center' } }, `Test build · ${G.state.stats.kills.toLocaleString()} kills · ${G.state.stats.clears} clears`),
      h('button', { class: 'btn', onclick: close }, 'Done'),
    ]);
  }

  function render() {
    const s = G.state, slot = s.view, c = s.chars[slot];
    const kids = [chips(() => render())];
    if (!c) {
      kids.push(h('div', { class: 'card', style: { textAlign: 'center', padding: '28px 16px' } }, h('div', { class: 'title', style: { fontSize: '18px' } }, 'Empty slot'), h('p', { class: 'muted' }, 'Pick a class to create a character.'), h('button', { class: 'btn', onclick: () => newCharacterSheet(slot, render) }, 'Create character')));
      kids.push(h('button', { class: 'btn ghost sm', onclick: settings }, 'Settings & save'));
      root.replaceChildren(...kids); return;
    }
    const C = CLASS[c.cls], li = levelInfo(c.xp), sb = statBreakdown(c, s), F = G.fighter(slot);
    const portrait = heroCanvas(c.cls, heroColors(c.cls), false, 8);
    const pc = portrait.cloneNode(); pc.getContext('2d').drawImage(portrait, 0, 0); pc.className = 'spr';
    kids.push(h('div', { class: 'hero' },
      h('div', { class: 'portrait' }, pc),
      h('div', { style: { display: 'grid', gap: '5px', minWidth: 0 } },
        h('button', { class: 'title', style: { fontSize: '22px', lineHeight: 1, textAlign: 'left' }, onclick: () => {
          let name = c.name;
          showDialog((close) => [h('h2', {}, 'Rename'), h('input', { id: 'rename', maxlength: 16, value: name, oninput: (e) => { name = e.target.value; }, style: { background: 'var(--well)', border: '1px solid var(--seam)', borderRadius: '10px', padding: '10px 12px', color: 'var(--parchment)', font: 'inherit', userSelect: 'text', WebkitUserSelect: 'text' } }), h('button', { class: 'btn', onclick: () => { G.renameCharacter(slot, name); close(); render(); } }, 'Save')]);
        } }, c.name, h('span', { class: 'small muted', style: { fontFamily: 'var(--body)', marginLeft: '6px' } }, '✎')),
        h('div', { class: 'small muted' }, `${C.name} · `, h('b', { style: { color: 'var(--ember)' } }, `${maxedCount(c)}/8 maxed`)),
        h('div', { class: 'row' }, h('span', { class: 'title', style: { fontSize: '12px', color: 'var(--ember)' } }, `Lv ${li.level}`), h('div', { class: 'bar xpbar grow' }, h('i', { style: { width: `${(li.into / li.need) * 100}%` } })), h('span', { class: 'small muted tnum' }, `${Math.floor(li.into)}/${li.need}`)),
        h('div', { class: 'small muted tnum' }, `DPS ${fmtNum(dpsOf(F))} · ${fmtNum(c.kills)} kills · ${c.clears} clears`),
        h('div', { class: 'small', style: { color: 'var(--faint)', lineHeight: 1.25 } }, 'Level is a score. Power comes from gear and potions.'))));

    const st = h('div', { class: 'card stats' }, h('div', { class: 'st label', style: { fontSize: '9.5px' } }, h('span', {}), h('span', {}, 'Base + potions ┆ gear'), h('span', { style: { textAlign: 'right' } }, 'Now/Max'), h('span', { style: { textAlign: 'center' } }, 'Potions')));
    for (const k of STATS) {
      const b = sb[k], max = C.max[k];
      const pct = Math.min(100, (b.base / max) * 100), gp = Math.max(0, Math.min(100 - pct, ((b.gear + b.exalt) / max) * 100));
      const have = G.owned(`pot_${k}`), atMax = b.base >= max, ex = G.exaltInfo(c.cls, k);
      st.append(h('div', { class: 'st' },
        h('span', { class: 'k', style: { color: statColor(k) } }, STAT_LABEL[k]),
        h('div', { class: 'bar' }, h('i', { style: { width: `${pct}%`, background: statColor(k) } }), b.gear + b.exalt ? h('s', { style: { left: `${pct}%`, width: `${Math.max(gp, 3)}%` } }) : null),
        h('span', { class: 'v tnum' }, `${b.base}`, b.gear + b.exalt ? h('span', { style: { color: 'var(--high)' } }, `+${b.gear + b.exalt}`) : '', h('span', { style: { color: 'var(--dust)' } }, `/${max}`)),
        h('button', { class: `drink${atMax ? ' max' : ''}`, disabled: !have && !atMax, onclick: () => statSheet(slot, k) }, atMax ? `★ ${ex.maxed ? 'MAX' : `${ex.drunk}/${ex.need}`}` : `Drink ·${fmtNum(have)}`)));
    }
    kids.push(st);

    kids.push(h('div', { class: 'slots' }, ['weapon', 'ability', 'armor', 'ring'].map((k) => {
      const id = c.equip[k];
      const label = { weapon: ITEMS[`${C.weapon}_t1`] && C.weapon, ability: C.ability, armor: C.armor === 'heavy' ? 'heavy' : C.armor, ring: 'ring' }[k];
      return h('button', { class: `slot${id ? '' : ' empty'}${id && ITEMS[id].tier === 'UT' ? ' ut' : ''}`, onclick: () => openEquipPicker(slot, k) },
        h('span', { class: 'kind' }, label), id ? itemIcon(id, 36) : null, id ? h('span', { class: 'tier' }, tierLabel(ITEMS[id])) : null);
    })));

    const ab = c.equip.ability ? ITEMS[c.equip.ability] : null;
    kids.push(h('div', { class: 'card', style: { display: 'grid', gap: '3px' } },
      h('div', { class: 'label' }, `Class ability · ${ABILITY_TYPES[C.ability].name}`),
      h('div', { class: 'small' }, ab ? h('b', {}, `${ab.name} `) : null, ABILITY_TYPES[C.ability].effect, ab ? ` Power ${fmtNum(ab.ability.power)}, ${abilityCost({ type: ab.type, cost: ab.ability.cost })} MP.` : ''),
      h('div', { class: 'small muted' }, 'Casts itself while farming. In dungeons you tap it.')));

    kids.push(h('div', { class: 'card', style: { display: 'grid', gap: '8px' } },
      h('div', { class: 'row between' }, h('span', { class: 'label' }, 'Classes'), h('span', { class: 'small muted' }, `${CLASSES.filter((k) => G.classUnlocked(k.id)).length}/${CLASSES.length} unlocked`)),
      h('div', { class: 'classes' }, CLASSES.map((k) => {
        const ok = G.classUnlocked(k.id);
        const cv = heroCanvas(k.id, k.colors, false, 3); const out = cv.cloneNode(); out.getContext('2d').drawImage(cv, 0, 0); out.className = 'spr';
        return h('div', { class: `cls${ok ? '' : ' lock'}${k.id === c.cls ? ' on' : ''}` }, out, h('span', {}, k.name), h('small', {}, ok ? `best Lv ${s.classBest[k.id] || 0}` : `🔒 ${unlockText(k.id)}`));
      })),
      h('button', { class: 'btn ghost sm', onclick: () => newCharacterSheet(slot, render) }, 'New character in this slot')));
    kids.push(h('button', { class: 'btn ghost sm', onclick: settings }, 'Settings & save'));
    root.replaceChildren(...kids);
  }
  return { render, frame() {} };
}
