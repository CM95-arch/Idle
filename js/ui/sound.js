// Tiny synthesized sound effects (Web Audio, no files). Audio starts after the first tap, as browsers require.
let ctx = null, out = null, noise = null, enabled = true;
const last = {};

function ensure() {
  if (ctx) return ctx;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  ctx = new AC();
  out = ctx.createGain(); out.gain.value = 0.5; out.connect(ctx.destination);
  noise = ctx.createBuffer(1, ctx.sampleRate * 0.5, ctx.sampleRate);
  const d = noise.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return ctx;
}
export function initSound(on) {
  enabled = on;
  const unlock = () => { ensure(); ctx?.resume?.(); };
  window.addEventListener('pointerdown', unlock, { passive: true });
}
export function setSoundEnabled(on) { enabled = on; }

function env(g, t, peak, dur) { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + 0.005); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); }
function tone(type, f0, f1, dur, vol, t = ctx.currentTime) {
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
  env(g, t, vol, dur); o.connect(g).connect(out); o.start(t); o.stop(t + dur + 0.02);
}
function hiss(dur, vol, f0, f1, q = 1.2, t = ctx.currentTime) {
  const s = ctx.createBufferSource(); s.buffer = noise;
  const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = q;
  f.frequency.setValueAtTime(f0, t); f.frequency.exponentialRampToValueAtTime(f1, t + dur);
  const g = ctx.createGain(); env(g, t, vol, dur);
  s.connect(f).connect(g).connect(out); s.start(t); s.stop(t + dur + 0.02);
}

const SOUNDS = {
  staff: () => tone('square', 1100 * jit(), 320, 0.07, 0.035),
  wand: () => tone('sawtooth', 1400 * jit(), 500, 0.06, 0.03),
  sword: () => hiss(0.09, 0.09, 2600 * jit(), 700),
  dagger: () => hiss(0.06, 0.07, 3400 * jit(), 1200),
  bow: () => { hiss(0.015, 0.12, 4000, 3000, 0.8); tone('triangle', 900 * jit(), 600, 0.05, 0.04); },
  hurt: () => tone('sine', 180, 60, 0.12, 0.12),
  loot: () => { tone('sine', 660, 660, 0.08, 0.08); tone('sine', 990, 990, 0.12, 0.07, ctx.currentTime + 0.07); },
  lootRare: () => [523, 659, 784, 1047].forEach((f, i) => tone('triangle', f, f, 0.16, 0.08, ctx.currentTime + i * 0.07)),
  levelup: () => [392, 523, 659, 784].forEach((f, i) => tone('square', f, f, 0.12, 0.04, ctx.currentTime + i * 0.08)),
  drink: () => tone('sine', 300, 800, 0.16, 0.08),
  dodge: () => hiss(0.18, 0.08, 800, 3000),
  tele: () => tone('square', 440, 440, 0.12, 0.04),
  ability: () => { tone('sawtooth', 200, 900, 0.18, 0.05); hiss(0.2, 0.05, 1200, 400); },
  equip: () => { hiss(0.03, 0.08, 2500, 2000, 2); tone('triangle', 500, 700, 0.06, 0.05); },
};
const GAP = { staff: 0.06, wand: 0.06, sword: 0.08, dagger: 0.07, bow: 0.07, hurt: 0.1 };
const jit = () => 0.92 + Math.random() * 0.16;

export function play(name) {
  if (!enabled || !SOUNDS[name] || !ensure() || ctx.state !== 'running') return;
  const now = ctx.currentTime;
  if (now - (last[name] || 0) < (GAP[name] || 0.03)) return;
  last[name] = now;
  try { SOUNDS[name](); } catch { /* ignore */ }
}
