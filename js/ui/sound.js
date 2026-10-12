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
  tap: () => tone('sine', 880, 660, 0.05, 0.05),
  kill: () => { tone('square', 300 * jit(), 120, 0.08, 0.035); hiss(0.08, 0.05, 1200, 300); },
  fame: () => tone('triangle', 1320 * jit(), 1760, 0.06, 0.03),
  boss: () => { tone('sawtooth', 160, 90, 0.35, 0.06); hiss(0.3, 0.06, 600, 200); },
  bossWarn: () => [0, 0.22, 0.44].forEach((d) => tone('square', 220, 200, 0.16, 0.05, ctx.currentTime + d)),
  bossDie: () => { [196, 262, 330, 392, 523].forEach((f, i) => tone('square', f, f, 0.22, 0.05, ctx.currentTime + i * 0.09)); hiss(0.6, 0.08, 3000, 200); },
  clear: () => [523, 659, 784, 1047].forEach((f, i) => tone('triangle', f, f, 0.14, 0.06, ctx.currentTime + i * 0.06)),
  fall: () => tone('sawtooth', 300, 60, 0.4, 0.06),
  upgrade: () => { tone('triangle', 660, 990, 0.1, 0.07); tone('sine', 1320, 1320, 0.12, 0.05, ctx.currentTime + 0.08); },
  unlock: () => [392, 494, 587, 784, 988].forEach((f, i) => tone('triangle', f, f, 0.25, 0.07, ctx.currentTime + i * 0.1)),
  ascend: () => { [262, 330, 392, 523, 659, 784, 1047].forEach((f, i) => tone('triangle', f, f, 0.5, 0.06, ctx.currentTime + i * 0.12)); hiss(1.4, 0.05, 200, 4000, 0.6); },
  coinCount: () => tone('square', 1500 * jit(), 1500, 0.03, 0.025),
};
const GAP = { staff: 0.06, wand: 0.06, sword: 0.08, dagger: 0.07, bow: 0.07, hurt: 0.1, kill: 0.05, fame: 0.05, coinCount: 0.04, loot: 0.08 };
const jit = () => 0.92 + Math.random() * 0.16;

export function play(name) {
  if (!enabled || !SOUNDS[name] || !ensure() || ctx.state !== 'running') return;
  const now = ctx.currentTime;
  if (now - (last[name] || 0) < (GAP[name] || 0.03)) return;
  last[name] = now;
  try { SOUNDS[name](); } catch { /* ignore */ }
}
