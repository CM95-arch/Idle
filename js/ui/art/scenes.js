// Zone backdrops, painted once per zone onto a canvas: sky, distant layers with atmospheric haze, light,
// fog, the ground the battle stands on, and dark framing props. Enemies stand around y≈110–190; the party below.
import { shade, mix } from './core.js';

export const SW = 360, SH = 430;
const HORIZON = 150;

function rng(seed) { let s = seed; return () => ((s = (s * 16807) % 2147483647) / 2147483647); }
function ridge(g, r, y, amp, rough, color, peaks = 6) {
  g.fillStyle = color; g.beginPath(); g.moveTo(0, SH);
  for (let x = 0; x <= SW; x += 6) {
    const t = x / SW;
    const h = Math.sin(t * Math.PI * peaks * 0.5 + r() * 0.2) * amp * 0.6 + Math.sin(t * Math.PI * peaks * 1.7) * amp * 0.25 + (r() - 0.5) * rough;
    g.lineTo(x, y - Math.abs(h));
  }
  g.lineTo(SW, SH); g.closePath(); g.fill();
}
function glow(g, x, y, r, c, a = 1) {
  const gr = g.createRadialGradient(x, y, 0, x, y, r);
  gr.addColorStop(0, c); gr.addColorStop(1, `${c}00`);
  g.globalAlpha = a; g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2); g.globalAlpha = 1;
}
function fog(g, y, h, c, a) { const gr = g.createLinearGradient(0, y - h, 0, y + h); gr.addColorStop(0, `${c}00`); gr.addColorStop(0.5, c); gr.addColorStop(1, `${c}00`); g.globalAlpha = a; g.fillStyle = gr; g.fillRect(0, y - h, SW, h * 2); g.globalAlpha = 1; }
function tree(g, x, y, s, c) {
  g.fillStyle = c; g.fillRect(x - s * 0.08, y - s * 0.5, s * 0.16, s * 0.5);
  for (let i = 0; i < 3; i++) { g.beginPath(); g.moveTo(x, y - s * (1.25 - i * 0.22)); g.lineTo(x + s * (0.32 + i * 0.1), y - s * (0.55 - i * 0.18)); g.lineTo(x - s * (0.32 + i * 0.1), y - s * (0.55 - i * 0.18)); g.closePath(); g.fill(); }
}
function roundTree(g, x, y, s, c) { g.fillStyle = c; g.fillRect(x - s * 0.07, y - s * 0.6, s * 0.14, s * 0.6); for (const [dx, dy, r] of [[0, -0.85, 0.42], [-0.3, -0.7, 0.32], [0.3, -0.68, 0.34]]) { g.beginPath(); g.arc(x + dx * s, y + dy * s, r * s, 0, Math.PI * 2); g.fill(); } }
function palm(g, x, y, s, c) {
  g.strokeStyle = c; g.lineWidth = s * 0.07; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + s * 0.15, y - s * 0.6, x + s * 0.05, y - s); g.stroke();
  g.fillStyle = c;
  for (let i = 0; i < 6; i++) { const a = -Math.PI / 2 + (i - 2.5) * 0.55; g.beginPath(); g.moveTo(x + s * 0.05, y - s); g.quadraticCurveTo(x + s * 0.05 + Math.cos(a) * s * 0.5, y - s + Math.sin(a) * s * 0.3 - s * 0.1, x + s * 0.05 + Math.cos(a) * s * 0.7, y - s + Math.sin(a) * s * 0.2 + s * 0.15); g.quadraticCurveTo(x + s * 0.05 + Math.cos(a) * s * 0.4, y - s + s * 0.02, x + s * 0.05, y - s); g.fill(); }
}
function rock(g, x, y, s, c) { g.fillStyle = c; g.beginPath(); g.moveTo(x - s, y); g.lineTo(x - s * 0.7, y - s * 0.6); g.lineTo(x - s * 0.1, y - s * 0.85); g.lineTo(x + s * 0.6, y - s * 0.55); g.lineTo(x + s, y); g.closePath(); g.fill(); g.fillStyle = 'rgba(255,255,255,.08)'; g.beginPath(); g.moveTo(x - s * 0.7, y - s * 0.6); g.lineTo(x - s * 0.1, y - s * 0.85); g.lineTo(x, y - s * 0.3); g.closePath(); g.fill(); }
function pillar(g, x, y, w, h, c) { g.fillStyle = c; g.fillRect(x - w / 2, y - h, w, h); g.fillRect(x - w * 0.7, y - h, w * 1.4, w * 0.35); g.fillRect(x - w * 0.7, y - w * 0.35, w * 1.4, w * 0.35); g.fillStyle = 'rgba(255,255,255,.06)'; g.fillRect(x - w / 2, y - h, w * 0.25, h); }
function castle(g, x, y, s, c) {
  g.fillStyle = c;
  const tower = (tx, w, h) => { g.fillRect(tx - w / 2, y - h, w, h); for (let i = -w / 2; i < w / 2; i += w / 3) g.fillRect(tx + i, y - h - s * 0.06, w / 6, s * 0.06); g.beginPath(); g.moveTo(tx - w * 0.6, y - h); g.lineTo(tx, y - h - w * 1.1); g.lineTo(tx + w * 0.6, y - h); g.fill(); };
  g.fillRect(x - s * 0.6, y - s * 0.35, s * 1.2, s * 0.35);
  tower(x - s * 0.5, s * 0.16, s * 0.6); tower(x + s * 0.5, s * 0.16, s * 0.6); tower(x, s * 0.22, s * 0.9); tower(x - s * 0.22, s * 0.12, s * 0.5); tower(x + s * 0.22, s * 0.12, s * 0.5);
}
function ground(g, top, colTop, colBot) {
  const gr = g.createLinearGradient(0, top, 0, SH); gr.addColorStop(0, colTop); gr.addColorStop(1, colBot);
  g.fillStyle = gr; g.fillRect(0, top, SW, SH - top);
}
function texture(g, r, top, c, n = 220) { g.fillStyle = c; for (let i = 0; i < n; i++) { const y = top + Math.pow(r(), 0.8) * (SH - top), s = 0.6 + ((y - top) / (SH - top)) * 2.4; g.globalAlpha = 0.05 + r() * 0.08; g.fillRect(r() * SW, y, s * (2 + r() * 4), s * 0.8); } g.globalAlpha = 1; }
function sky(g, stops) { const gr = g.createLinearGradient(0, 0, 0, HORIZON + 20); stops.forEach(([o, c]) => gr.addColorStop(o, c)); g.fillStyle = gr; g.fillRect(0, 0, SW, HORIZON + 20); }
function vignette(g, a = 0.55) {
  const gr = g.createRadialGradient(SW / 2, SH * 0.55, SH * 0.25, SW / 2, SH * 0.55, SH * 0.8);
  gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, `rgba(0,0,0,${a})`); g.fillStyle = gr; g.fillRect(0, 0, SW, SH);
}

const PAINT = {
  beach(g, r) {
    sky(g, [[0, '#1d4a66'], [0.6, '#5f9ab0'], [1, '#f0c890']]);
    glow(g, 270, 110, 120, '#ffe0a0', 0.55); glow(g, 270, 110, 22, '#fff4d0', 0.9);
    g.fillStyle = '#2c6a80'; g.fillRect(0, 118, SW, 40); for (let i = 0; i < 40; i++) { g.fillStyle = 'rgba(255,240,200,.35)'; g.fillRect(200 + r() * 140, 120 + r() * 30, 6 + r() * 14, 1.2); }
    ridge(g, r, 150, 10, 3, '#b89a64', 3);
    ground(g, 150, '#c8a86a', '#8a6a3c'); texture(g, r, 150, '#fff3d0');
    for (const [x, y, s] of [[22, 210, 110], [338, 196, 96]]) palm(g, x, y, s, '#14100c');
    rock(g, 40, 412, 34, '#2a2018'); rock(g, 330, 420, 40, '#2a2018');
  },
  lowlands(g, r) {
    sky(g, [[0, '#2a4a6a'], [0.6, '#7aa0b0'], [1, '#e8d8a8']]);
    glow(g, 90, 100, 110, '#fff0c0', 0.45);
    ridge(g, r, 128, 26, 4, mix('#5a7a6a', '#8aa0a8', 0.4), 4); fog(g, 128, 18, '#c8d8d0', 0.4);
    ridge(g, r, 146, 18, 3, '#4a6a3a', 5);
    for (let i = 0; i < 12; i++) roundTree(g, r() * SW, 150 - r() * 6, 18 + r() * 10, '#2f4a28');
    ground(g, 150, '#5a7a3a', '#2a3a1a'); texture(g, r, 150, '#c8e8a0');
    roundTree(g, 12, 260, 120, '#0e140c'); roundTree(g, 350, 300, 110, '#0e140c');
  },
  midlands(g, r) {
    sky(g, [[0, '#1a2a3a'], [0.6, '#4a6070'], [1, '#a0a890']]);
    ridge(g, r, 110, 40, 6, '#3a4a54', 3); fog(g, 112, 22, '#8a9aa0', 0.5);
    ridge(g, r, 140, 20, 4, '#2a3a2e', 6);
    for (let i = 0; i < 22; i++) tree(g, r() * SW, 152 - r() * 8, 22 + r() * 16, '#1a2a1e');
    fog(g, 150, 14, '#a0b0a8', 0.35);
    ground(g, 150, '#3e5a34', '#1a2616'); texture(g, r, 150, '#b0d090');
    tree(g, 18, 300, 150, '#070a07'); tree(g, 345, 280, 130, '#070a07');
  },
  highlands(g, r) {
    sky(g, [[0, '#141a24'], [0.6, '#3a4654'], [1, '#8a9098']]);
    glow(g, 260, 70, 90, '#c0d0e0', 0.3);
    ridge(g, r, 100, 60, 10, '#2a323c', 4); g.fillStyle = 'rgba(230,240,255,.5)'; ridge(g, r, 70, 20, 8, 'rgba(0,0,0,0)', 4);
    fog(g, 108, 26, '#7a8a98', 0.55); ridge(g, r, 140, 24, 8, '#22282e', 5);
    pillar(g, 60, 150, 10, 40, '#2a2e34'); pillar(g, 300, 148, 9, 30, '#2a2e34');
    ground(g, 150, '#5a6064', '#22262a'); texture(g, r, 150, '#d0d8e0');
    rock(g, 30, 400, 50, '#121418'); rock(g, 330, 380, 44, '#121418');
  },
  godlands(g, r) {
    sky(g, [[0, '#0e0820'], [0.5, '#2a1a4a'], [1, '#6a3a7a']]);
    for (let i = 0; i < 60; i++) { g.fillStyle = `rgba(255,240,255,${0.3 + r() * 0.6})`; g.fillRect(r() * SW, r() * 110, 1.2, 1.2); }
    glow(g, 180, 60, 140, '#b070ff', 0.35);
    ridge(g, r, 118, 34, 8, '#20143a', 4); fog(g, 122, 20, '#7a4a9a', 0.5);
    for (const [x, y, s] of [[70, 90, 16], [280, 76, 22], [180, 40, 12]]) { glow(g, x, y, s * 3, '#d090ff', 0.5); g.fillStyle = '#e0c0ff'; g.beginPath(); g.moveTo(x, y - s); g.lineTo(x + s * 0.5, y); g.lineTo(x, y + s); g.lineTo(x - s * 0.5, y); g.fill(); }
    pillar(g, 40, 150, 12, 60, '#1a1030'); pillar(g, 320, 150, 12, 70, '#1a1030');
    ground(g, 150, '#3a2a54', '#140c22'); texture(g, r, 150, '#d0a0ff');
  },
  approach(g, r) {
    sky(g, [[0, '#120808'], [0.6, '#4a1a14'], [1, '#a0402a']]);
    glow(g, 180, 150, 160, '#ff6030', 0.35);
    castle(g, 180, 140, 140, '#140a0a'); fog(g, 136, 16, '#a04a30', 0.45);
    ridge(g, r, 150, 10, 4, '#1a0c0a', 6);
    ground(g, 150, '#3a2622', '#120a08'); texture(g, r, 150, '#ffb090');
    for (const x of [26, 334]) { pillar(g, x, 330, 22, 200, '#0a0606'); glow(g, x, 130, 40, '#ff8a40', 0.8); g.fillStyle = '#ffd080'; g.beginPath(); g.ellipse(x, 126, 5, 10, 0, 0, Math.PI * 2); g.fill(); }
  },
  castle(g, r) {
    g.fillStyle = '#100a16'; g.fillRect(0, 0, SW, SH);
    for (let y = 0; y < 150; y += 18) for (let x = (y / 18) % 2 ? -20 : 0; x < SW; x += 40) { g.fillStyle = shade('#2a2036', (r() - 0.5) * 0.2); g.fillRect(x + 1, y + 1, 38, 16); }
    g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(0, 0, SW, 150);
    for (const x of [90, 270]) { g.fillStyle = '#5a0a1a'; g.fillRect(x - 22, 10, 44, 110); g.beginPath(); g.moveTo(x - 22, 120); g.lineTo(x, 136); g.lineTo(x + 22, 120); g.fill(); g.fillStyle = '#d8a830'; g.fillRect(x - 22, 10, 44, 4); g.beginPath(); g.arc(x, 60, 9, 0, Math.PI * 2); g.fill(); }
    for (const x of [30, 180, 330]) { glow(g, x, 80, 50, '#ff9a40', 0.7); g.fillStyle = '#ffd080'; g.beginPath(); g.ellipse(x, 78, 4, 9, 0, 0, Math.PI * 2); g.fill(); }
    ground(g, 150, '#2a2036', '#0c0812');
    g.strokeStyle = 'rgba(255,255,255,.05)'; g.lineWidth = 1;
    for (let i = -8; i <= 8; i++) { g.beginPath(); g.moveTo(SW / 2 + i * 12, 150); g.lineTo(SW / 2 + i * 60, SH); g.stroke(); }
    for (let y = 160; y < SH; y += (y - 140) * 0.18) { g.beginPath(); g.moveTo(0, y); g.lineTo(SW, y); g.stroke(); }
    g.fillStyle = 'rgba(140,20,40,.25)'; g.beginPath(); g.moveTo(SW / 2 - 30, 150); g.lineTo(SW / 2 + 30, 150); g.lineTo(SW / 2 + 110, SH); g.lineTo(SW / 2 - 110, SH); g.fill();
    pillar(g, 20, 420, 26, 300, '#06040a'); pillar(g, 340, 420, 26, 300, '#06040a');
  },
};

const cache = new Map();
export function backdrop(zoneId) {
  if (cache.has(zoneId)) return cache.get(zoneId);
  const cv = document.createElement('canvas'); const k = 2; cv.width = SW * k; cv.height = SH * k;
  const g = cv.getContext('2d'); g.scale(k, k);
  (PAINT[zoneId] || PAINT.beach)(g, rng(zoneId.length * 7919 + 13));
  vignette(g);
  cache.set(zoneId, cv);
  return cv;
}
