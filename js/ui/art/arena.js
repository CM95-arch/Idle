// The battlefield of each zone, seen from above at a three-quarter angle and painted once onto a canvas:
// textured ground, a worn lane the horde comes down, chunky props with shadows around the edges, and night
// lighting with pools of colored light (lanterns, braziers, crystals). The party holds the lower middle.
import { shade, mix } from './core.js';

export const AW = 360, AH = 430;
function rng(seed) { let s = seed; return () => ((s = (s * 16807) % 2147483647) / 2147483647); }
const TAU = Math.PI * 2;

// ---- painting helpers ----
// lights are held back while the scene is painted, then laid over it after nightfall so they glow
let deferred = null;
function light(g, x, y, r, c, a = 1) {
  if (deferred) { deferred.push([x, y, r, c, a]); return; }
  const gr = g.createRadialGradient(x, y, 0, x, y, r);
  gr.addColorStop(0, c); gr.addColorStop(0.4, `${c}88`); gr.addColorStop(1, `${c}00`);
  g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = a; g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2); g.restore();
}
function shadow(g, x, y, rx, ry, a = 0.4) { g.fillStyle = `rgba(0,0,0,${a})`; g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, TAU); g.fill(); }
function ink(g, w = 1.6) { g.strokeStyle = 'rgba(8,6,12,.9)'; g.lineWidth = w; g.lineJoin = 'round'; g.stroke(); }
function speckle(g, r, n, c, size = [0.6, 1.8], area = [0, 0, AW, AH]) {
  g.fillStyle = c;
  for (let i = 0; i < n; i++) { const s = size[0] + r() * (size[1] - size[0]); g.globalAlpha = 0.25 + r() * 0.5; g.fillRect(area[0] + r() * area[2], area[1] + r() * area[3], s, s * 0.7); }
  g.globalAlpha = 1;
}
function lane(g, c, w0 = 70, w1 = 150) {
  // the trodden path the horde pours down, wider near the party
  const gr = g.createLinearGradient(0, 0, 0, AH);
  gr.addColorStop(0, `${c}00`); gr.addColorStop(0.15, `${c}aa`); gr.addColorStop(1, `${c}cc`);
  g.fillStyle = gr; g.beginPath();
  g.moveTo(AW / 2 - w0 / 2, -10); g.bezierCurveTo(AW / 2 - w0, 140, AW / 2 - w1 / 2 - 20, 260, AW / 2 - w1 / 2, AH + 10);
  g.lineTo(AW / 2 + w1 / 2, AH + 10); g.bezierCurveTo(AW / 2 + w1 / 2 + 20, 260, AW / 2 + w0, 140, AW / 2 + w0 / 2, -10); g.closePath(); g.fill();
}
function tiles(g, r, c, line, x0 = 0, x1 = AW) {
  // flagstones, a little narrower toward the top for depth
  for (let y = -10, row = 0; y < AH; row++) {
    const h = 20 + (y / AH) * 10, w = 30 + (y / AH) * 14;
    for (let x = x0 - (row % 2) * w / 2; x < x1; x += w) {
      g.fillStyle = shade(c, (r() - 0.5) * 0.18); g.fillRect(x + 1, y + 1, w - 2, h - 2);
      g.fillStyle = 'rgba(255,255,255,.05)'; g.fillRect(x + 1, y + 1, w - 2, 2);
    }
    g.fillStyle = line; g.fillRect(x0, y + h - 1, x1 - x0, 1.5);
    y += h;
  }
}
// ---- props (anchored at their base) ----
const P = {
  crate(g, x, y, s = 1, c = '#8a5a2e') {
    shadow(g, x + 4 * s, y + 2 * s, 18 * s, 6 * s);
    g.fillStyle = shade(c, -0.25); g.beginPath(); g.rect(x - 14 * s, y - 16 * s, 28 * s, 16 * s); g.fill(); ink(g);
    g.fillStyle = shade(c, 0.15); g.beginPath(); g.rect(x - 14 * s, y - 28 * s, 28 * s, 12 * s); g.fill(); ink(g);
    g.strokeStyle = shade(c, -0.45); g.lineWidth = 1.4; g.beginPath(); g.moveTo(x - 14 * s, y - 16 * s); g.lineTo(x + 14 * s, y); g.moveTo(x - 14 * s, y - 28 * s); g.lineTo(x + 14 * s, y - 16 * s); g.stroke();
  },
  barrel(g, x, y, s = 1, c = '#7a4a2a') {
    shadow(g, x + 3 * s, y + 1, 13 * s, 5 * s);
    g.fillStyle = shade(c, -0.15); g.beginPath(); g.moveTo(x - 11 * s, y - 22 * s); g.lineTo(x - 11 * s, y - 3 * s); g.ellipse(x, y - 3 * s, 11 * s, 4 * s, 0, Math.PI, 0, true); g.lineTo(x + 11 * s, y - 22 * s); g.fill(); ink(g);
    g.fillStyle = shade(c, 0.25); g.beginPath(); g.ellipse(x, y - 22 * s, 11 * s, 4.5 * s, 0, 0, TAU); g.fill(); ink(g);
    g.strokeStyle = '#3a3a40'; g.lineWidth = 2; g.beginPath(); g.ellipse(x, y - 9 * s, 11 * s, 4 * s, 0, 0, Math.PI); g.stroke();
  },
  rock(g, x, y, s = 1, c = '#6a6a72') {
    shadow(g, x + 3 * s, y + 1, 20 * s, 6 * s);
    g.fillStyle = shade(c, -0.15); g.beginPath(); g.moveTo(x - 18 * s, y); g.lineTo(x - 14 * s, y - 14 * s); g.lineTo(x - 2 * s, y - 20 * s); g.lineTo(x + 12 * s, y - 15 * s); g.lineTo(x + 18 * s, y - 2 * s); g.closePath(); g.fill(); ink(g);
    g.fillStyle = shade(c, 0.22); g.beginPath(); g.moveTo(x - 14 * s, y - 14 * s); g.lineTo(x - 2 * s, y - 20 * s); g.lineTo(x + 12 * s, y - 15 * s); g.lineTo(x + 2 * s, y - 9 * s); g.closePath(); g.fill();
  },
  palm(g, x, y, s = 1) {
    shadow(g, x + 10 * s, y + 2, 26 * s, 9 * s, 0.35);
    g.strokeStyle = '#3a2614'; g.lineWidth = 7 * s; g.lineCap = 'round'; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + 6 * s, y - 26 * s, x + 2 * s, y - 44 * s); g.stroke();
    g.strokeStyle = '#8a6030'; g.lineWidth = 4 * s; g.stroke();
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * TAU + 0.3, cx = x + 2 * s, cy = y - 44 * s;
      g.fillStyle = i % 2 ? '#2f7a3a' : '#3f9a48'; g.beginPath(); g.moveTo(cx, cy);
      g.quadraticCurveTo(cx + Math.cos(a - 0.3) * 22 * s, cy + Math.sin(a - 0.3) * 12 * s - 6 * s, cx + Math.cos(a) * 32 * s, cy + Math.sin(a) * 16 * s + 4 * s);
      g.quadraticCurveTo(cx + Math.cos(a + 0.3) * 18 * s, cy + Math.sin(a + 0.3) * 10 * s, cx, cy); g.fill(); ink(g, 1.2);
    }
  },
  tree(g, x, y, s = 1, c = '#2f6a34') {
    shadow(g, x + 8 * s, y + 2, 28 * s, 10 * s, 0.4);
    g.fillStyle = '#4a3020'; g.fillRect(x - 4 * s, y - 16 * s, 8 * s, 16 * s);
    for (const [dx, dy, r, k] of [[0, -40, 22, 0], [-14, -30, 16, -0.12], [14, -28, 17, -0.08], [0, -52, 14, 0.12]]) {
      g.fillStyle = shade(c, k); g.beginPath(); g.arc(x + dx * s, y + dy * s, r * s, 0, TAU); g.fill(); ink(g, 1.4);
    }
    g.fillStyle = 'rgba(255,255,255,.12)'; g.beginPath(); g.arc(x - 6 * s, y - 48 * s, 8 * s, 0, TAU); g.fill();
  },
  pine(g, x, y, s = 1, c = '#1f4a34') {
    shadow(g, x + 8 * s, y + 2, 20 * s, 8 * s, 0.4);
    for (let i = 0; i < 3; i++) { g.fillStyle = shade(c, 0.08 * i); g.beginPath(); g.moveTo(x, y - (60 - i * 14) * s); g.lineTo(x + (22 - i * 4) * s, y - (16 + i * 14) * s); g.lineTo(x - (22 - i * 4) * s, y - (16 + i * 14) * s); g.closePath(); g.fill(); ink(g, 1.4); }
  },
  lamp(g, x, y, s = 1, c = '#ffcf6a') {
    shadow(g, x + 2, y + 1, 7 * s, 3 * s);
    g.fillStyle = '#1c1a22'; g.fillRect(x - 2 * s, y - 40 * s, 4 * s, 40 * s);
    g.fillStyle = '#2a2830'; g.beginPath(); g.rect(x - 6 * s, y - 50 * s, 12 * s, 11 * s); g.fill(); ink(g, 1.2);
    g.fillStyle = c; g.fillRect(x - 4 * s, y - 48 * s, 8 * s, 7 * s);
    light(g, x, y - 44 * s, 26 * s, c, 0.9); light(g, x, y + 6, 46 * s, c, 0.35);
  },
  brazier(g, x, y, s = 1, c = '#ff8a2a') {
    shadow(g, x + 2, y + 1, 12 * s, 4 * s);
    g.fillStyle = '#2a2224'; g.beginPath(); g.moveTo(x - 4 * s, y); g.lineTo(x - 2 * s, y - 12 * s); g.lineTo(x + 2 * s, y - 12 * s); g.lineTo(x + 4 * s, y); g.fill();
    g.fillStyle = '#3a3034'; g.beginPath(); g.ellipse(x, y - 14 * s, 11 * s, 5 * s, 0, 0, TAU); g.fill(); ink(g, 1.2);
    g.fillStyle = c; g.beginPath(); g.moveTo(x - 7 * s, y - 15 * s); g.quadraticCurveTo(x - 4 * s, y - 30 * s, x, y - 34 * s); g.quadraticCurveTo(x + 4 * s, y - 26 * s, x + 7 * s, y - 15 * s); g.fill();
    g.fillStyle = '#fff2b0'; g.beginPath(); g.ellipse(x, y - 19 * s, 3 * s, 5 * s, 0, 0, TAU); g.fill();
    light(g, x, y - 18 * s, 30 * s, c, 0.9); light(g, x, y, 60 * s, c, 0.35);
  },
  pillar(g, x, y, s = 1, c = '#5a5266') {
    shadow(g, x + 8 * s, y + 2, 18 * s, 6 * s, 0.45);
    g.fillStyle = shade(c, -0.2); g.fillRect(x - 11 * s, y - 64 * s, 22 * s, 64 * s);
    g.fillStyle = 'rgba(255,255,255,.12)'; g.fillRect(x - 11 * s, y - 64 * s, 6 * s, 64 * s);
    g.beginPath(); g.rect(x - 11 * s, y - 64 * s, 22 * s, 64 * s); ink(g);
    g.fillStyle = shade(c, 0.2); g.beginPath(); g.rect(x - 15 * s, y - 72 * s, 30 * s, 9 * s); g.fill(); ink(g);
    g.fillStyle = shade(c, -0.1); g.beginPath(); g.rect(x - 15 * s, y - 6 * s, 30 * s, 7 * s); g.fill(); ink(g);
  },
  crystal(g, x, y, s = 1, c = '#b05cff') {
    shadow(g, x + 2, y + 1, 14 * s, 4 * s);
    for (const [dx, h, w] of [[-7, 22, 6], [0, 34, 8], [8, 18, 6]]) {
      g.fillStyle = shade(c, -0.1); g.beginPath(); g.moveTo(x + (dx - w) * s, y); g.lineTo(x + dx * s, y - h * s); g.lineTo(x + (dx + w) * s, y); g.closePath(); g.fill(); ink(g, 1.2);
      g.fillStyle = shade(c, 0.45); g.beginPath(); g.moveTo(x + dx * s, y - h * s); g.lineTo(x + (dx + w) * s, y); g.lineTo(x + (dx + 1) * s, y); g.closePath(); g.fill();
    }
    light(g, x, y - 14 * s, 40 * s, c, 0.75);
  },
  ruin(g, x, y, s = 1, c = '#6a6470') {
    shadow(g, x + 8 * s, y + 2, 34 * s, 7 * s, 0.4);
    g.fillStyle = shade(c, -0.2); g.beginPath(); g.moveTo(x - 30 * s, y); g.lineTo(x - 30 * s, y - 26 * s); g.lineTo(x - 14 * s, y - 34 * s); g.lineTo(x, y - 22 * s); g.lineTo(x + 12 * s, y - 28 * s); g.lineTo(x + 30 * s, y - 14 * s); g.lineTo(x + 30 * s, y); g.closePath(); g.fill(); ink(g);
    g.strokeStyle = 'rgba(0,0,0,.35)'; g.lineWidth = 1; for (let k = 1; k < 4; k++) { g.beginPath(); g.moveTo(x - 30 * s, y - k * 8 * s); g.lineTo(x + 30 * s, y - k * 8 * s); g.stroke(); }
  },
  tuft(g, x, y, s = 1, c = '#4a8a3a') { g.strokeStyle = c; g.lineWidth = 1.6; g.lineCap = 'round'; for (let k = -2; k <= 2; k++) { g.beginPath(); g.moveTo(x, y); g.lineTo(x + k * 3 * s, y - (7 + Math.abs(2 - Math.abs(k)) * 2) * s); g.stroke(); } },
  bones(g, x, y, s = 1) { g.strokeStyle = '#d8d0b8'; g.lineWidth = 2.4 * s; g.lineCap = 'round'; g.beginPath(); g.moveTo(x - 7 * s, y - 2 * s); g.lineTo(x + 7 * s, y + 2 * s); g.moveTo(x - 5 * s, y + 4 * s); g.lineTo(x + 6 * s, y - 4 * s); g.stroke(); g.fillStyle = '#e8e0c8'; g.beginPath(); g.arc(x + 10 * s, y - 6 * s, 4 * s, 0, TAU); g.fill(); },
  banner(g, x, y, s = 1, c = '#7a0a1a') {
    g.fillStyle = '#1a1418'; g.fillRect(x - 1.5 * s, y - 70 * s, 3 * s, 70 * s);
    g.fillStyle = c; g.beginPath(); g.moveTo(x, y - 68 * s); g.lineTo(x + 20 * s, y - 68 * s); g.lineTo(x + 20 * s, y - 34 * s); g.lineTo(x + 10 * s, y - 40 * s); g.lineTo(x, y - 34 * s); g.closePath(); g.fill(); ink(g, 1.2);
    g.fillStyle = '#d8a830'; g.beginPath(); g.arc(x + 10 * s, y - 54 * s, 4 * s, 0, TAU); g.fill();
  },
};

// ---- each zone: ground, lane, props, light ----
const ZONE = {
  beach: { ground: '#c8a868', lane: '#e0c48a', dark: 0.42, tint: '#1a2a4a',
    paint(g, r) {
      // the sea along the top, foam where it meets the sand
      const sea = g.createLinearGradient(0, 0, 0, 90); sea.addColorStop(0, '#0e3a5a'); sea.addColorStop(1, '#1e7a8a');
      g.fillStyle = sea; g.beginPath(); g.moveTo(0, 0); g.lineTo(AW, 0); g.lineTo(AW, 70);
      for (let x = AW; x >= 0; x -= 20) g.lineTo(x, 70 + Math.sin(x * 0.05) * 8 + r() * 4);
      g.closePath(); g.fill();
      g.strokeStyle = 'rgba(255,255,255,.6)'; g.lineWidth = 3; g.beginPath(); for (let x = 0; x <= AW; x += 20) g.lineTo(x, 72 + Math.sin(x * 0.05) * 8); g.stroke();
      speckle(g, r, 260, '#8a6a3a', [0.8, 2]);
      return [['palm', 30, 150, 1.1], ['palm', 330, 120, 1], ['palm', 40, 330, 1.2], ['palm', 336, 300, 1.1], ['crate', 300, 210], ['barrel', 60, 220], ['crate', 52, 410, 1.1], ['barrel', 316, 400], ['rock', 320, 360, 0.8, '#8a7a6a'], ['lamp', 92, 120, 1, '#ffd38a'], ['lamp', 270, 330, 1, '#8ae0ff']];
    } },
  lowlands: { ground: '#4a7a3a', lane: '#8a7048', dark: 0.38, tint: '#14243a',
    paint(g, r) {
      speckle(g, r, 300, '#2a5a24', [1, 2.5]); speckle(g, r, 80, '#e8e070', [1, 1.8]);
      for (let i = 0; i < 40; i++) P.tuft(g, r() * AW, r() * AH, 1, '#3a6a2a');
      return [['tree', 34, 130, 1.1], ['tree', 330, 100], ['tree', 30, 300, 1.2], ['tree', 334, 290, 1.1], ['tree', 300, 420, 0.9], ['rock', 70, 410], ['barrel', 290, 200], ['crate', 60, 200], ['lamp', 98, 250, 1, '#ffcf6a'], ['lamp', 264, 150, 1, '#ffcf6a']];
    } },
  midlands: { ground: '#2e4a2e', lane: '#5a5038', dark: 0.48, tint: '#0e1a2a',
    paint(g, r) {
      speckle(g, r, 300, '#1a301c', [1, 3]);
      for (let i = 0; i < 30; i++) P.tuft(g, r() * AW, r() * AH, 1, '#2a4a24');
      return [['pine', 26, 120, 1.2], ['pine', 66, 70], ['pine', 334, 110, 1.2], ['pine', 300, 60], ['pine', 24, 320, 1.3], ['pine', 336, 310, 1.2], ['rock', 300, 410, 1, '#5a5a62'], ['bones', 90, 200], ['bones', 260, 380], ['brazier', 70, 230, 1, '#4affc0'], ['brazier', 290, 220, 1, '#4affc0']];
    } },
  highlands: { ground: '#5a5a5e', lane: '#7a7468', dark: 0.42, tint: '#101a2a',
    paint(g, r) {
      tiles(g, r, '#56565c', 'rgba(0,0,0,.25)', 90, 270);
      speckle(g, r, 200, '#3a3a40', [1, 3]);
      return [['rock', 40, 140, 1.3], ['rock', 320, 120, 1.2], ['ruin', 50, 300, 1.1], ['ruin', 310, 320], ['rock', 300, 420], ['pine', 26, 420, 1.1, '#2a4030'], ['brazier', 96, 190], ['brazier', 266, 190], ['barrel', 330, 220]];
    } },
  godlands: { ground: '#2e2448', lane: '#4a3a6a', dark: 0.5, tint: '#140a2a',
    paint(g, r) {
      speckle(g, r, 260, '#5a4a8a', [1, 2.4]);
      tiles(g, r, '#3a2e58', 'rgba(0,0,0,.3)', 110, 250);
      return [['crystal', 40, 160, 1.2, '#b05cff'], ['crystal', 322, 130, 1.1, '#5de0ff'], ['ruin', 50, 330, 1, '#5a5070'], ['crystal', 310, 330, 1.3, '#ff6ad8'], ['pillar', 24, 430, 1, '#4a4060'], ['pillar', 336, 430, 1, '#4a4060'], ['crystal', 100, 90, 0.8, '#5de0ff'], ['crystal', 260, 240, 0.7, '#b05cff']];
    } },
  approach: { ground: '#3a2c2c', lane: '#5a4440', dark: 0.48, tint: '#1a0a0a',
    paint(g, r) {
      tiles(g, r, '#3e3030', 'rgba(0,0,0,.35)');
      return [['pillar', 30, 180, 1.1, '#4a4048'], ['pillar', 330, 180, 1.1, '#4a4048'], ['pillar', 30, 420, 1.2, '#4a4048'], ['pillar', 330, 420, 1.2, '#4a4048'], ['brazier', 86, 120], ['brazier', 274, 120], ['brazier', 70, 300], ['brazier', 290, 300], ['bones', 120, 380], ['banner', 56, 250, 1, '#5a0a1a'], ['banner', 296, 250, 1, '#5a0a1a']];
    } },
  castle: { ground: '#241a30', lane: '#5a0a1a', dark: 0.5, tint: '#12081e',
    paint(g, r) {
      tiles(g, r, '#2a2038', 'rgba(0,0,0,.4)');
      // the red carpet up to the throne
      g.fillStyle = '#6a0a1e'; g.fillRect(140, 0, 80, AH); g.fillStyle = '#d8a830'; g.fillRect(140, 0, 4, AH); g.fillRect(216, 0, 4, AH);
      return [['pillar', 40, 140, 1.2, '#3a2e48'], ['pillar', 320, 140, 1.2, '#3a2e48'], ['pillar', 40, 330, 1.3, '#3a2e48'], ['pillar', 320, 330, 1.3, '#3a2e48'], ['brazier', 100, 80, 1, '#ff5a2a'], ['brazier', 260, 80, 1, '#ff5a2a'], ['brazier', 100, 250, 1, '#b05cff'], ['brazier', 260, 250, 1, '#b05cff'], ['banner', 76, 420, 1.1, '#6a0a1e'], ['banner', 268, 420, 1.1, '#6a0a1e']];
    } },
  // ---- dungeon themes ----
  cave: { ground: '#2a2420', lane: '#4a3e34', dark: 0.5, tint: '#0a0806',
    paint(g, r) {
      speckle(g, r, 300, '#1a1410', [1, 3]); speckle(g, r, 60, '#6a5a48', [1, 2]);
      return [['rock', 30, 140, 1.4, '#4a4038'], ['rock', 330, 120, 1.3, '#4a4038'], ['rock', 26, 330, 1.5, '#4a4038'], ['rock', 334, 320, 1.4, '#4a4038'], ['crystal', 80, 230, 0.8, '#b05cff'], ['crystal', 290, 200, 0.7, '#5de0ff'], ['bones', 120, 400], ['bones', 260, 120], ['brazier', 70, 90, 1, '#ff9a3a'], ['brazier', 290, 380, 1, '#ff9a3a']];
    } },
  crypt: { ground: '#24262a', lane: '#3a3c44', dark: 0.52, tint: '#06080e',
    paint(g, r) {
      tiles(g, r, '#2c2e34', 'rgba(0,0,0,.45)');
      return [['pillar', 30, 170, 1.1, '#4a4c54'], ['pillar', 330, 170, 1.1, '#4a4c54'], ['pillar', 30, 420, 1.2, '#4a4c54'], ['pillar', 330, 420, 1.2, '#4a4c54'], ['brazier', 90, 110, 1, '#5affc8'], ['brazier', 270, 110, 1, '#5affc8'], ['brazier', 76, 300, 1, '#5affc8'], ['brazier', 284, 300, 1, '#5affc8'], ['bones', 140, 220], ['bones', 230, 360], ['bones', 60, 240], ['ruin', 300, 250, 0.8, '#4a4c54']];
    } },
  abyss: { ground: '#2a1210', lane: '#4a1c14', dark: 0.42, tint: '#140404',
    paint(g, r) {
      tiles(g, r, '#301614', 'rgba(0,0,0,.4)');
      for (let i = 0; i < 6; i++) { let x = r() * AW, y = r() * AH; g.strokeStyle = '#ff5a1a'; g.lineWidth = 2.6; g.shadowColor = '#ff8a3a'; g.shadowBlur = 8; g.beginPath(); g.moveTo(x, y); for (let k = 0; k < 5; k++) { x += (r() - 0.5) * 46; y += (r() - 0.3) * 30; g.lineTo(x, y); } g.stroke(); g.shadowBlur = 0; }
      return [['pillar', 30, 180, 1.1, '#3a2220'], ['pillar', 330, 180, 1.1, '#3a2220'], ['rock', 40, 380, 1.3, '#3a2220'], ['rock', 320, 400, 1.2, '#3a2220'], ['brazier', 96, 120, 1, '#ff5a1a'], ['brazier', 264, 120, 1, '#ff5a1a'], ['brazier', 70, 300, 1.1, '#ff5a1a'], ['brazier', 290, 300, 1.1, '#ff5a1a'], ['bones', 150, 380]];
    } },
  lab: { ground: '#262c30', lane: '#3e484e', dark: 0.42, tint: '#060c0e',
    paint(g, r) {
      tiles(g, r, '#2e363c', 'rgba(120,255,160,.12)');
      return [['crate', 40, 150, 1.1, '#5a6a72'], ['barrel', 320, 140, 1, '#4a7a5a'], ['crate', 34, 380, 1.2, '#5a6a72'], ['barrel', 326, 390, 1.1, '#4a7a5a'], ['lamp', 92, 110, 1, '#7aff8a'], ['lamp', 268, 110, 1, '#7aff8a'], ['lamp', 80, 300, 1, '#7ad0ff'], ['lamp', 280, 300, 1, '#7ad0ff'], ['crystal', 300, 250, 0.6, '#7aff8a']];
    } },
  sewer: { ground: '#22281c', lane: '#3a4230', dark: 0.48, tint: '#060a04',
    paint(g, r) {
      tiles(g, r, '#283020', 'rgba(0,0,0,.4)', 0, 110); tiles(g, r, '#283020', 'rgba(0,0,0,.4)', 250, AW);
      const w = g.createLinearGradient(110, 0, 250, 0); w.addColorStop(0, '#2a4a14'); w.addColorStop(0.5, '#5a8a24'); w.addColorStop(1, '#2a4a14');
      g.globalAlpha = 0.55; g.fillStyle = w; g.fillRect(118, 0, 124, AH); g.globalAlpha = 1;
      speckle(g, r, 80, '#b0e06a', [1, 2.4], [120, 0, 120, AH]);
      return [['barrel', 50, 160, 1, '#4a5a2a'], ['barrel', 310, 150, 1, '#4a5a2a'], ['bones', 60, 330], ['bones', 300, 360], ['lamp', 80, 90, 1, '#c0ff4a'], ['lamp', 280, 90, 1, '#c0ff4a'], ['rock', 40, 410, 1, '#3a4230'], ['rock', 320, 420, 1, '#3a4230']];
    } },
  docks: { ground: '#3a2c20', lane: '#5a4430', dark: 0.48, tint: '#08101a',
    paint(g, r) {
      // dark sea along the sides, wet planks down the middle
      g.fillStyle = '#0e2a34'; g.fillRect(0, 0, 60, AH); g.fillRect(300, 0, 60, AH);
      for (let y = 0; y < AH; y += 18) { g.fillStyle = y % 36 ? '#4a3626' : '#523c2a'; g.fillRect(60, y, 240, 17); g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(60, y + 17, 240, 1); }
      speckle(g, r, 90, '#7affd8', [0.6, 1.4], [0, 0, 60, AH]); speckle(g, r, 90, '#7affd8', [0.6, 1.4], [300, 0, 60, AH]);
      return [['barrel', 80, 150, 1, '#5a4030'], ['crate', 280, 160], ['crate', 76, 380, 1.1], ['barrel', 286, 390, 1, '#5a4030'], ['lamp', 66, 260, 1, '#7affd8'], ['lamp', 294, 260, 1, '#7affd8'], ['banner', 100, 430, 1, '#1a3a4a']];
    } },
  sprite: { ground: '#1e3a34', lane: '#3a5a48', dark: 0.4, tint: '#04140e',
    paint(g, r) {
      speckle(g, r, 260, '#2a6a4a', [1, 2.6]); speckle(g, r, 70, '#ff9ad8', [1, 1.8]);
      for (let i = 0; i < 40; i++) P.tuft(g, r() * AW, r() * AH, 1, '#3a8a5a');
      return [['tree', 30, 140, 1.1, '#2a7a5a'], ['tree', 332, 120, 1, '#3a8a6a'], ['tree', 26, 330, 1.2, '#2a7a5a'], ['tree', 334, 320, 1.1, '#3a8a6a'], ['crystal', 90, 240, 0.8, '#5affc8'], ['crystal', 280, 230, 0.8, '#ff8ad8'], ['crystal', 180, 420, 0.6, '#5ae0ff'], ['rock', 300, 420, 0.9, '#3a5a4a']];
    } },
  ice: { ground: '#9ab8cc', lane: '#c8dce8', dark: 0.36, tint: '#081420',
    paint(g, r) {
      speckle(g, r, 260, '#e8f4ff', [1, 2.6]); speckle(g, r, 100, '#6a8aa8', [1, 2]);
      return [['crystal', 40, 160, 1.3, '#8ad8ff'], ['crystal', 322, 140, 1.2, '#bfefff'], ['crystal', 34, 360, 1.4, '#8ad8ff'], ['crystal', 330, 350, 1.2, '#bfefff'], ['rock', 300, 420, 1, '#8aa8c0'], ['rock', 60, 420, 1, '#8aa8c0'], ['pine', 26, 260, 1, '#3a5a6a'], ['pine', 336, 250, 1, '#3a5a6a']];
    } },
  tomb: { ground: '#a08050', lane: '#c8a870', dark: 0.42, tint: '#140c04',
    paint(g, r) {
      tiles(g, r, '#a8885a', 'rgba(60,30,10,.35)');
      speckle(g, r, 200, '#7a5a30', [0.8, 2]);
      return [['pillar', 30, 170, 1.1, '#b8985a'], ['pillar', 330, 170, 1.1, '#b8985a'], ['pillar', 30, 420, 1.2, '#b8985a'], ['pillar', 330, 420, 1.2, '#b8985a'], ['brazier', 90, 110, 1, '#5de0ff'], ['brazier', 270, 110, 1, '#5de0ff'], ['ruin', 60, 300, 0.9, '#a88a5a'], ['ruin', 300, 290, 0.9, '#a88a5a'], ['bones', 180, 400]];
    } },
  trench: { ground: '#0e3040', lane: '#1a4a5a', dark: 0.38, tint: '#020c18',
    paint(g, r) {
      speckle(g, r, 260, '#08202c', [1, 3]); speckle(g, r, 80, '#5ad0e0', [0.6, 1.4]);
      return [['rock', 34, 150, 1.3, '#2a4a5a'], ['rock', 326, 130, 1.2, '#2a4a5a'], ['crystal', 40, 330, 1.1, '#ff8ab0'], ['crystal', 320, 320, 1.1, '#ff8ab0'], ['crystal', 100, 230, 0.7, '#5ae0ff'], ['crystal', 270, 240, 0.7, '#5ae0ff'], ['rock', 300, 420, 1, '#2a4a5a'], ['rock', 60, 420, 1, '#2a4a5a']];
    } },
  temple: { ground: '#2a3a30', lane: '#4a5a4a', dark: 0.44, tint: '#060e08',
    paint(g, r) {
      tiles(g, r, '#304236', 'rgba(0,0,0,.35)', 80, 280);
      speckle(g, r, 200, '#1a2a20', [1, 3]);
      return [['pine', 24, 140, 1.2, '#2a5a3a'], ['pine', 336, 130, 1.2, '#2a5a3a'], ['pillar', 70, 330, 1.1, '#5a8a6a'], ['pillar', 290, 330, 1.1, '#5a8a6a'], ['brazier', 96, 110, 1, '#ffde3d'], ['brazier', 264, 110, 1, '#ffde3d'], ['banner', 40, 430, 1, '#8a1a1a'], ['banner', 316, 430, 1, '#8a1a1a'], ['rock', 330, 240, 1, '#4a5a4a']];
    } },
  // ---- the Halls of the Forsaken and the Fractured Keep ----
  halls: { ground: '#6e6878', lane: '#b8b2c4', dark: 0.46, tint: '#0a0c22',
    paint(g, r) {
      // polished marble: big pale tiles with gold seams
      tiles(g, r, '#8a8496', 'rgba(216,168,48,.35)');
      g.strokeStyle = 'rgba(255,255,255,.08)'; g.lineWidth = 1;
      for (let i = 0; i < 26; i++) { const x = r() * AW, y = r() * AH; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + 14, y + 6, x + 28, y - 4); g.stroke(); }
      return [['pillar', 34, 160, 1.2, '#cfc8da'], ['pillar', 326, 160, 1.2, '#cfc8da'], ['pillar', 34, 400, 1.3, '#cfc8da'], ['pillar', 326, 400, 1.3, '#cfc8da'], ['brazier', 96, 110, 1, '#7ad0ff'], ['brazier', 264, 110, 1, '#7ad0ff'], ['brazier', 80, 290, 1, '#b07aff'], ['brazier', 280, 290, 1, '#b07aff'], ['bones', 300, 240], ['bones', 70, 360], ['banner', 120, 430, 1, '#2a2a7a'], ['banner', 228, 430, 1, '#2a2a7a']];
    } },
  shatters: { ground: '#1c1a24', lane: '#3a3448', dark: 0.5, tint: '#0a0614',
    paint(g, r) {
      tiles(g, r, '#26222f', 'rgba(0,0,0,.45)');
      // the floor is broken: glowing violet rifts run through it
      for (let i = 0; i < 7; i++) {
        let x = r() * AW, y = r() * AH;
        g.strokeStyle = '#8a4aff'; g.lineWidth = 2.2; g.shadowColor = '#b07aff'; g.shadowBlur = 8; g.beginPath(); g.moveTo(x, y);
        for (let k = 0; k < 6; k++) { x += (r() - 0.5) * 50; y += (r() - 0.3) * 30; g.lineTo(x, y); }
        g.stroke(); g.shadowBlur = 0;
      }
      return [['ruin', 46, 150, 1.1, '#4a4458'], ['ruin', 316, 130, 1, '#4a4458'], ['pillar', 30, 420, 1.2, '#3a3448'], ['pillar', 330, 420, 1.2, '#3a3448'], ['crystal', 70, 300, 1, '#8a4aff'], ['crystal', 300, 290, 1.1, '#5de0ff'], ['rock', 300, 220, 1, '#3a3640'], ['brazier', 110, 70, 1, '#b07aff'], ['brazier', 250, 70, 1, '#b07aff'], ['bones', 140, 400]];
    } },
};

const cache = new Map();
/** The zone's battlefield, painted once (2× for sharpness). */
export function arena(zoneId) {
  if (cache.has(zoneId)) return cache.get(zoneId);
  const Z = ZONE[zoneId] || ZONE.beach, r = rng(zoneId.length * 7919 + 101);
  const cv = document.createElement('canvas'); const k = 2; cv.width = AW * k; cv.height = AH * k;
  const g = cv.getContext('2d'); g.scale(k, k);
  g.fillStyle = Z.ground; g.fillRect(0, 0, AW, AH);
  speckle(g, r, 500, shade(Z.ground, -0.3), [0.6, 1.6]); speckle(g, r, 250, shade(Z.ground, 0.25), [0.5, 1.2]);
  lane(g, Z.lane);
  speckle(g, r, 140, shade(Z.lane, -0.3), [0.8, 2], [100, 0, 160, AH]);
  deferred = [];
  const props = Z.paint(g, r);
  for (const [kind, x, y, s, c] of props.sort((a, b) => a[2] - b[2])) P[kind](g, x, y, s, c);
  const lights = deferred; deferred = null;
  // night falls: darken everything, then let the light sources glow through
  g.fillStyle = Z.tint; g.globalAlpha = Z.dark; g.fillRect(0, 0, AW, AH); g.globalAlpha = 1;
  // a pale pool of light where the party stands
  light(g, AW / 2, 325, 150, mix(Z.lane, '#fff6d0', 0.5), 0.22);
  for (const L of lights) light(g, ...L);
  // vignette
  const v = g.createRadialGradient(AW / 2, AH * 0.6, AH * 0.3, AW / 2, AH * 0.55, AH * 0.85);
  v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,.6)');
  g.fillStyle = v; g.fillRect(0, 0, AW, AH);
  cache.set(zoneId, cv);
  return cv;
}
