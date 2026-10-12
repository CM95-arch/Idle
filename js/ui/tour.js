// Guided walkthrough: dims the screen, spotlights one thing at a time, and explains it in a short card.
import { h } from './dom.js';
import { play } from './sound.js';

let active = null;
export const touring = () => !!active;

/**
 * steps: [{ target: () => Element|null, title, text, before?: () => void }]
 * A step without a target (or whose target isn't on screen) shows its card in the middle.
 */
export function runTour(steps, onDone) {
  if (active) return;
  let i = 0;
  const hole = h('div', { class: 'tour-hole' });
  const card = h('div', { class: 'tour-card', role: 'dialog', 'aria-live': 'polite' });
  const root = h('div', { class: 'tour' }, hole, card);
  document.body.append(root);
  active = root;
  const finish = () => { root.remove(); active = null; window.removeEventListener('resize', place); onDone?.(); };
  function place() {
    const st = steps[i], el = st.target?.();
    const r = el?.getBoundingClientRect();
    const vw = window.innerWidth, vh = window.innerHeight;
    if (r && r.width && r.bottom > 0 && r.top < vh) {
      const pad = 6;
      Object.assign(hole.style, { display: 'block', left: `${r.left - pad}px`, top: `${r.top - pad}px`, width: `${r.width + pad * 2}px`, height: `${r.height + pad * 2}px` });
      const below = r.top + r.height / 2 < vh / 2;
      const cw = Math.min(340, vw - 24);
      card.style.width = `${cw}px`;
      card.style.left = `${Math.max(12, Math.min(vw - cw - 12, r.left + r.width / 2 - cw / 2))}px`;
      if (below) { card.style.top = `${Math.min(vh - 200, r.bottom + 16)}px`; card.style.bottom = ''; }
      else { card.style.bottom = `${Math.max(12, vh - r.top + 16)}px`; card.style.top = ''; }
      card.classList.remove('center');
    } else {
      hole.style.display = 'none';
      Object.assign(card.style, { width: `${Math.min(340, vw - 24)}px`, left: `${(vw - Math.min(340, vw - 24)) / 2}px`, top: '', bottom: '' });
      card.classList.add('center');
    }
  }
  function show() {
    const st = steps[i];
    st.before?.();
    const last = i === steps.length - 1;
    card.replaceChildren(...[
      steps.length > 1 ? h('div', { class: 'tour-step' }, `${i + 1} / ${steps.length}`) : null,
      h('div', { class: 'tour-title' }, st.title),
      h('div', { class: 'tour-text' }, st.text),
      h('div', { class: 'row', style: { marginTop: '12px' } },
        steps.length > 1 && !last ? h('button', { class: 'btn alt sm', onclick: () => { play('tap'); finish(); } }, 'Skip') : null,
        h('div', { class: 'grow' }),
        h('button', { class: 'btn sm', onclick: () => { play('tap'); if (last) finish(); else { i++; show(); } } }, last ? (st.done || 'Got it') : 'Next'))].filter(Boolean));
    card.classList.remove('in'); void card.offsetWidth; card.classList.add('in');
    requestAnimationFrame(place);
  }
  window.addEventListener('resize', place);
  show();
}
