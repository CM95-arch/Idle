// Draws a dungeon run (core/arena.js) top-down in pixel style.
import { draw, mapSize, heroCanvas } from './sprites.js';
import { W, H } from '../core/arena.js';
import { ITEMS } from '../data/items.js';
import { bagOf } from '../core/loot.js';

const BAG = { brown: { a: '#7a5a3a', b: '#b08a5a' }, pink: { a: '#c04a8a', b: '#ff9ad0' }, purple: { a: '#7a3ac0', b: '#b88aff' }, cyan: { a: '#3ac8d8', b: '#9af0ff' }, gold: { a: '#d9a441', b: '#ffe08a' }, white: { a: '#f4f4f8', b: '#ffffff' } };
const BAG_TEXT = { brown: '#e8d8a8', pink: '#ff9ad0', purple: '#c9a6ff', cyan: '#9af0ff', gold: '#ffe08a', white: '#ffffff' };

export class ArenaView {
  constructor(canvas, pal = {}) {
    this.cv = canvas; this.g = canvas.getContext('2d'); this.t = 0;
    const bg = pal.bg || '#2f3a1f';
    // a scattered stone floor, drawn once
    this.floor = document.createElement('canvas'); this.floor.width = W; this.floor.height = H;
    const f = this.floor.getContext('2d');
    f.fillStyle = shade(bg, 0.05); f.fillRect(0, 0, W, H);
    let s = 7;
    const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    for (let y = 0; y < H; y += 24) for (let x = 0; x < W; x += 24) {
      f.fillStyle = rnd() < 0.5 ? shade(bg, 0.12) : shade(bg, -0.05); f.fillRect(x, y, 24, 24);
      if (rnd() < 0.15) { f.fillStyle = shade(bg, 0.25); f.fillRect(x + 6 + rnd() * 10, y + 6 + rnd() * 10, 4, 3); }
    }
    f.fillStyle = shade(bg, -0.45); f.fillRect(0, 0, W, 34); // the far wall
    for (let x = 0; x < W; x += 30) { f.fillStyle = shade(bg, -0.3); f.fillRect(x, 0, 28, 30); }
  }
  /** Screen point → world point. */
  toWorld(clientX, clientY) {
    const r = this.cv.getBoundingClientRect(), dpr = Math.min(window.devicePixelRatio || 1, 3);
    return { x: ((clientX - r.left) * dpr - this.ox) / this.scale, y: ((clientY - r.top) * dpr - this.oy) / this.scale };
  }
  fit() {
    const r = this.cv.getBoundingClientRect(), dpr = Math.min(window.devicePixelRatio || 1, 3);
    const w = Math.round(r.width * dpr), hh = Math.round(r.height * dpr);
    if (this.cv.width !== w || this.cv.height !== hh) { this.cv.width = w; this.cv.height = hh; }
    this.scale = Math.min(r.width / W, r.height / H) * dpr;
    this.ox = (w - W * this.scale) / 2; this.oy = (hh - H * this.scale) / 2;
    return this.scale / dpr;
  }
  render(R, F, dt) {
    this.fit();
    const g = this.g; this.t += dt;
    g.setTransform(1, 0, 0, 1, 0, 0); g.fillStyle = '#0d1008'; g.fillRect(0, 0, this.cv.width, this.cv.height);
    g.setTransform(this.scale, 0, 0, this.scale, this.ox, this.oy); g.imageSmoothingEnabled = false;
    g.drawImage(this.floor, 0, 0);

    // bags
    for (const b of R.bags) {
      const kind = bagOf(b.id), cv = draw('bag', 3, BAG[kind]);
      const bob = Math.sin(this.t * 4 + b.x) * 1.5;
      if (kind === 'white') { g.fillStyle = `rgba(255,255,255,${0.25 + 0.2 * Math.sin(this.t * 6)})`; g.beginPath(); g.arc(b.x, b.y, 14, 0, Math.PI * 2); g.fill(); }
      g.drawImage(cv, Math.round(b.x - cv.width / 2), Math.round(b.y - cv.height / 2 + bob));
    }
    // zones: trap and poison
    for (const z of R.zones || []) {
      g.globalAlpha = 0.25 + 0.1 * Math.sin(this.t * 8); g.fillStyle = z.color; g.beginPath(); g.arc(z.x, z.y, z.r, 0, Math.PI * 2); g.fill();
      g.globalAlpha = 0.8; g.strokeStyle = z.color; g.lineWidth = 2; g.beginPath(); g.arc(z.x, z.y, z.r, 0, Math.PI * 2); g.stroke(); g.globalAlpha = 1;
    }
    // enemies
    for (const e of R.enemies) {
      const sc = e.boss ? 5 : 3;
      const cv = draw(e.sprite, sc, e.pal); const { w, h } = mapSize(e.sprite);
      g.globalAlpha = e.stunUntil > R.t ? 0.6 : 1;
      g.drawImage(cv, Math.round(e.x - (w * sc) / 2), Math.round(e.y - (h * sc) / 2));
      if (e.flash > 0) { g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.6; g.drawImage(cv, Math.round(e.x - (w * sc) / 2), Math.round(e.y - (h * sc) / 2)); g.globalCompositeOperation = 'source-over'; }
      g.globalAlpha = 1;
      if (!e.boss) {
        const bw = 24, fr = Math.max(0, e.hp / e.maxHp);
        g.fillStyle = '#111'; g.fillRect(e.x - bw / 2 - 1, e.y + e.r + 2, bw + 2, 4);
        g.fillStyle = fr > 0.5 ? '#3fbf5c' : fr > 0.2 ? '#e8b928' : '#e0483e'; g.fillRect(e.x - bw / 2, e.y + e.r + 3, bw * fr, 2);
      }
    }
    // player shots
    for (const s of R.shots) {
      const x = s.px ?? s.x, y = s.py ?? s.y;
      g.fillStyle = s.color;
      if (s.arrow) {
        g.save(); g.translate(x, y); g.rotate(s.ang); const L = s.kind === 'quiver' ? 18 : 9;
        g.fillRect(-L, -1, L * 1.6, 2); g.fillRect(L * 0.5, -2, 4, 4); g.restore();
      } else if (s.blade) {
        g.save(); g.translate(x, y); g.rotate(s.ang); g.globalAlpha = 0.9;
        g.fillRect(-4, -s.r, 8, s.r * 2); g.fillStyle = '#c9d8ff'; g.fillRect(-1, -s.r + 2, 2, s.r * 2 - 4); g.restore(); g.globalAlpha = 1;
      } else {
        g.shadowColor = s.color; g.shadowBlur = 8;
        g.fillRect(x - s.r * 0.7, y - s.r * 0.7, s.r * 1.4, s.r * 1.4);
        g.shadowBlur = 0;
      }
    }
    // hero
    const h = R.hero;
    if (R.phase !== 'dead') {
      const hc = heroCanvas(R.cls, F.colors, false, 3);
      g.globalAlpha = h.invisUntil > R.t ? 0.35 : h.hurtT > 0 && Math.floor(this.t * 30) % 2 ? 0.4 : 1;
      g.drawImage(hc, Math.round(h.x - hc.width / 2), Math.round(h.y - hc.height / 2));
      g.globalAlpha = 1;
      if (h.berserkUntil > R.t) { g.strokeStyle = 'rgba(255,90,74,.7)'; g.lineWidth = 2; g.beginPath(); g.arc(h.x, h.y, 16, 0, Math.PI * 2); g.stroke(); }
      // the real hitbox: a small dot, like Realm
      g.fillStyle = '#ffffff'; g.beginPath(); g.arc(h.x, h.y, 2.5, 0, Math.PI * 2); g.fill();
    }
    // enemy bullets on top of everything: they're what you watch
    for (const b of R.bullets) {
      g.fillStyle = b.color; g.beginPath(); g.arc(b.x, b.y, b.r, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#ffffff'; g.beginPath(); g.arc(b.x, b.y, b.r * 0.45, 0, Math.PI * 2); g.fill();
    }
    // effects
    for (const f of R.fx) {
      const p = f.t / f.life;
      if (f.k === 'burst' || f.k === 'puff') { g.strokeStyle = f.c; g.globalAlpha = 1 - p; g.lineWidth = 3; g.beginPath(); g.arc(f.x, f.y, 6 + p * (f.k === 'burst' ? 50 : 26), 0, Math.PI * 2); g.stroke(); g.globalAlpha = 1; }
      else if (f.k === 'zap') { g.strokeStyle = '#8ae8ff'; g.globalAlpha = 1 - p; g.lineWidth = 2; g.beginPath(); g.moveTo(f.x0, f.y0); for (let z = 1; z <= 6; z++) g.lineTo(f.x0 + (f.x1 - f.x0) * z / 6 + (Math.random() - 0.5) * 8, f.y0 + (f.y1 - f.y0) * z / 6 + (Math.random() - 0.5) * 8); g.stroke(); g.globalAlpha = 1; }
      else if (f.k === 'tele') { const boss = R.enemies.find((e) => e.boss); if (boss) { g.strokeStyle = `rgba(255,58,90,${0.4 + 0.5 * Math.sin(this.t * 25)})`; g.lineWidth = 3; g.beginPath(); g.arc(boss.x, boss.y, 50 - p * 20, 0, Math.PI * 2); g.stroke(); } }
      else if (f.k === 'fly') { const cv = draw('bag', 3, BAG[bagOf(f.id)]); const x = f.x + (h.x - f.x) * p, y = f.y + (h.y - f.y) * p - Math.sin(p * Math.PI) * 30; g.globalAlpha = 1 - p * 0.5; g.drawImage(cv, Math.round(x - cv.width / 2), Math.round(y - cv.height / 2)); g.globalAlpha = 1; }
      else if (f.k === 'pickup') { const it = ITEMS[f.id]; g.globalAlpha = 1 - p; text(g, `${it.name}${typeof it.tier === 'number' ? ` T${it.tier}` : ''}`, Math.max(60, Math.min(W - 60, f.x)), f.y - 14 - p * 20, BAG_TEXT[bagOf(f.id)], 10); g.globalAlpha = 1; }
      else if (f.k === 'banner' && f.text) { g.globalAlpha = Math.min(1, (1 - p) * 3); text(g, f.text, W / 2, H * 0.42, '#ffe08a', 16); g.globalAlpha = 1; }
    }
    for (const n of R.nums) { g.globalAlpha = 1 - n.t / 0.7; text(g, n.text, n.x, n.y - n.t * 22, n.c, 9); g.globalAlpha = 1; }
  }
}
function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  const ch = (v) => Math.max(0, Math.min(255, Math.round(amt >= 0 ? v + (255 - v) * amt : v * (1 + amt))));
  return `rgb(${ch(n >> 16)},${ch((n >> 8) & 255)},${ch(n & 255)})`;
}
function text(g, s, x, y, c, size) {
  g.font = `700 ${size}px "Pixelify Sans", monospace`; g.textAlign = 'center';
  g.fillStyle = '#000'; g.fillText(s, x + 1, y + 1); g.fillStyle = c; g.fillText(s, x, y);
}
