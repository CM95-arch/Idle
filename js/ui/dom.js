// DOM helpers: element builder, bottom sheets, dialogs, toasts, formatting.
export const $ = (sel, root = document) => root.querySelector(sel);

export function h(tag, attrs = {}, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
    else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else if (k === 'html') el.innerHTML = v;
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const kid of kids.flat()) if (kid != null && kid !== false) el.append(kid instanceof Node ? kid : document.createTextNode(String(kid)));
  return el;
}

// ---------- bottom sheet ----------
let sheetClose = null;
export function openSheet(build) {
  closeSheet();
  const root = $('#sheet-root');
  const scrim = h('div', { class: 'scrim', onclick: () => closeSheet() });
  const sheet = h('div', { class: 'sheet', role: 'dialog' }, h('div', { class: 'grab' }));
  const render = () => { sheet.replaceChildren(h('div', { class: 'grab' }), ...[].concat(build(close, render)).filter((x) => x != null && x !== false)); };
  const close = () => { scrim.remove(); sheet.remove(); if (sheetClose === close) sheetClose = null; };
  render();
  root.append(scrim, sheet);
  sheetClose = close;
  return { close, render, isOpen: () => sheet.isConnected };
}
export function closeSheet() { sheetClose?.(); }

// ---------- dialogs ----------
export function showDialog(build, { dismissable = true } = {}) {
  const root = $('#overlay-root');
  const ov = h('div', { class: 'overlay' });
  const close = () => ov.remove();
  const box = h('div', { class: 'dialog', role: 'dialog' });
  box.append(...[].concat(build(close)).filter((x) => x != null && x !== false));
  ov.append(box);
  if (dismissable) ov.addEventListener('click', (e) => { if (e.target === ov) close(); });
  root.append(ov);
  return close;
}
export function confirmDialog({ title, body, ok = 'Confirm', cancel = 'Cancel', danger = false }) {
  return new Promise((resolve) => {
    showDialog((close) => [
      h('h2', {}, title),
      body ? h('p', { class: 'muted', style: { margin: 0, textAlign: 'center' } }, body) : null,
      h('div', { class: 'row' },
        h('button', { class: 'btn ghost grow', onclick: () => { close(); resolve(false); } }, cancel),
        h('button', { class: `btn grow${danger ? ' stop' : ''}`, onclick: () => { close(); resolve(true); } }, ok)),
    ]);
  });
}

// ---------- toasts ----------
export function toast({ title, body, icon, kind = '' }) {
  const root = $('#toast-root');
  const el = h('div', { class: `toast ${kind}` }, icon ? h('div', { class: 'ic' }, icon) : null, h('div', {}, h('b', {}, title), body ? h('span', { class: 'muted' }, body) : null));
  root.append(el);
  while (root.children.length > 3) root.firstChild.remove();
  setTimeout(() => { el.style.transition = 'opacity .3s'; el.style.opacity = '0'; setTimeout(() => el.remove(), 320); }, 2600);
}

// ---------- formatting ----------
export const fmtNum = (n) => Math.round(n).toLocaleString('en-US');
export function fmtDur(ms) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const d = Math.floor(s / 86400), hh = Math.floor((s % 86400) / 3600), mm = Math.floor((s % 3600) / 60);
  if (d) return `${d}d ${hh}h`;
  if (hh) return `${hh}h ${mm}m`;
  if (mm) return `${mm}m ${s % 60}s`;
  return `${s}s`;
}
export function fmtHours(hrs) {
  if (hrs === Infinity) return '8h+';
  if (hrs >= 1) return `${hrs.toFixed(1)}h`;
  return `${Math.max(1, Math.round(hrs * 60))}m`;
}
export const fmtXp = (n) => (n < 10 ? (Math.floor(n * 10) / 10).toFixed(1) : fmtNum(Math.floor(n)));
export const plural = (n, word) => `${fmtNum(n)} ${word}${n === 1 ? '' : 's'}`;
