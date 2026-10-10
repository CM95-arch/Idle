// PROTOTYPE battle view: same handheld-battle layout as the real game (hero bottom-left from behind),
// but the enemy side is a formation: a front row and a smaller back row across three lanes.
import { draw, mapSize, heroCanvas } from '../ui/sprites.js';
import { h } from '../ui/dom.js';
import { ABILITIES } from './arena.js';
import { CLASS } from '../data/classes.js';

const SEG = 0.15; // seconds a projectile spends on each leg of its path

export class ArenaScene {
  constructor(host) {
    this.host = host;
    this.cv = h('canvas'); this.g = this.cv.getContext('2d');
    this.box = h('div', { class: 'hpbox enemy' },
      h('div', { class: 'nm' }, this.wName = h('span'), this.wNum = h('span', { class: 'lv' })),
      h('div', { class: 'hprow' }, h('b', {}, 'HP'), h('div', { class: 'bar' }, this.wHp = h('i', { style: { width: '100%', background: '#3fbf5c' } }))));
    this.pBox = h('div', { class: 'hpbox player' },
      h('div', { class: 'nm' }, h('span', {}, 'Wizard'), h('span', { class: 'lv' }, 'T1')),
      h('div', { class: 'hprow' }, h('b', {}, 'HP'), h('div', { class: 'bar' }, this.pHp = h('i', { style: { width: '100%', background: '#3fbf5c' } }))),
      h('div', { class: 'hprow' }, h('b', { style: { color: '#3d7fe0' } }, 'MP'), h('div', { class: 'bar mp', style: { height: '5px' } }, this.pMp = h('i', { style: { width: '100%' } }))),
      this.pNum = h('div', { class: 'num tnum' }));
    host.replaceChildren(this.cv, this.box, this.pBox);
    this.fx = []; this.nums = []; this.pos = new Map(); this.flash = new Map(); this.lunge = new Map(); this.dead = new Map(); this.t = 0; this.shake = 0;
    host.addEventListener('pointerdown', (e) => {
      const r = host.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
      let best = null, bd = 60;
      for (const [uid, p] of this.pos) { const d = Math.hypot(p.x - x, p.y - 20 - y); if (d < bd) { bd = d; best = uid; } }
      if (best != null) this.onFocus?.(best);
    });
  }

  size() {
    const r = this.host.getBoundingClientRect(), dpr = Math.min(window.devicePixelRatio || 1, 3);
    const w = Math.round(r.width * dpr), hh = Math.round(r.height * dpr);
    if (this.cv.width !== w || this.cv.height !== hh) { this.cv.width = w; this.cv.height = hh; }
    this.dpr = dpr; this.W = r.width; this.H = r.height;
    this.sc = Math.max(3, Math.min(6, Math.round(this.H / 70)));
  }
  slot(row, lane) {
    const { W, H } = this;
    return row === 'f' ? { x: W * (0.46 + 0.175 * lane), y: H * 0.55 } : { x: W * (0.55 + 0.15 * lane), y: H * 0.36 };
  }
  hero() { return { x: this.W * 0.2, y: this.H * 0.93 }; }
  posOf(uid) { return this.pos.get(uid) || this.dead.get(uid); }

  event(kind, d) {
    const P = this.hero();
    if (kind === 'shot') {
      this.fx.push({ k: 'proj', style: d.style, color: d.color, path: d.path, lane: d.lane, t: -d.delay, life: SEG * Math.max(1, (d.path?.length || 1)) + 0.05, from: { x: P.x + 16, y: P.y - 50 } });
    } else if (kind === 'hit') {
      this.later(d.delay, () => {
        const p = this.posOf(d.uid); if (!p) return;
        this.num(p.x + (Math.random() - 0.5) * 24, p.y - this.sc * 13 - Math.random() * 10, `${d.dmg}`, d.crit ? '#ffd34d' : d.color === '#ffffff' ? '#ffffff' : '#ffffff', d.crit ? 16 : d.small ? 10 : 13);
        this.flash.set(d.uid, 0.08);
      });
    } else if (kind === 'enemyShot') {
      const p = this.posOf(d.uid); if (!p) return;
      if (d.ranged) this.fx.push({ k: 'eproj', x0: p.x, y0: p.y - 20, x1: P.x + 10, y1: P.y - 40, t: 0, life: 0.3, c: '#ff8a5c' });
      else this.lunge.set(d.uid, 0.25);
      this.later(d.ranged ? 0.3 : 0.12, () => {
        if (d.dodged) this.num(P.x + 34, P.y - 80, 'dodge', '#9fd8ff', 12);
        else { this.num(P.x + 30 + (Math.random() - 0.5) * 20, P.y - 76, `-${d.dmg}`, '#ff6b5e', d.big ? 19 : 13); this.hurt = 0.15; if (d.big) this.shake = 0.3; }
      });
    } else if (kind === 'heal') {
      const a = this.posOf(d.from), b = this.posOf(d.uid); if (!a || !b) return;
      this.fx.push({ k: 'beam', x0: a.x, y0: a.y - 20, x1: b.x, y1: b.y - 20, t: 0, life: 0.35, c: '#7dff9a' });
      this.num(b.x, b.y - this.sc * 14, `+${d.amt}`, '#58c06f', 13);
    } else if (kind === 'kill') {
      const p = this.posOf(d.uid);
      this.later(0.2, () => { if (p) this.fx.push({ k: 'puff', x: p.x, y: p.y - 14, t: 0, life: 0.4, c: '#fff' }); });
    } else if (kind === 'ability') {
      const Ab = ABILITIES[d.kind];
      if (d.kind === 'meteor') for (const [i, uid] of (d.uids || []).entries()) { const p = this.posOf(uid); if (p) this.fx.push({ k: 'meteor', x: p.x, y: p.y - 10, t: -i * 0.08, life: 0.45, c: Ab.color }); }
      if (d.kind === 'shock') { this.fx.push({ k: 'wave', t: 0, life: 0.5, c: Ab.color }); this.shake = 0.25; }
      if (d.kind === 'trap') { const p = this.slot('f', d.lane); this.fx.push({ k: 'burst', x: p.x, y: p.y, t: 0, life: 0.4, c: Ab.color }); }
      this.banner = { text: Ab.name.toUpperCase(), t: 0, c: Ab.color };
    } else if (kind === 'wave') {
      this.banner = { text: d.name, t: 0, c: '#ffffff' };
    } else if (kind === 'death') {
      this.banner = { text: 'FALLEN', t: 0, c: '#ff6b5e' };
    }
  }
  later(sec, fn) { this.fx.push({ k: 'timer', t: 0, life: sec, fn }); }
  num(x, y, text, color, size) { this.nums.push({ x, y, text, color, size, t: 0 }); if (this.nums.length > 40) this.nums.shift(); }
  pad(x, y, w) {
    const g = this.g;
    g.fillStyle = 'rgba(0,0,0,.25)'; g.beginPath(); g.ellipse(x, y, w, w * 0.28, 0, 0, Math.PI * 2); g.fill();
  }
  pathPoints(f) {
    const pts = [f.from];
    if (f.path) for (const uid of f.path) { const p = this.posOf(uid); if (p) pts.push({ x: p.x, y: p.y - 16 }); }
    else if (f.lane != null) { const p = this.slot('b', f.lane); pts.push({ x: p.x, y: p.y - 30 }); }
    if (f.style === 'boomerang') pts.push(f.from);
    return pts;
  }

  frame(dt, A, F, loadout) {
    this.size();
    const g = this.g, W = this.W, H = this.H, sc = this.sc;
    this.t += dt;
    g.setTransform(this.dpr, 0, 0, this.dpr, 0, 0); g.imageSmoothingEnabled = false;
    let sx = 0, sy = 0;
    if (this.shake > 0) { this.shake -= dt; sx = (Math.random() - 0.5) * 7; sy = (Math.random() - 0.5) * 7; }
    g.save(); g.translate(sx, sy);
    // forest backdrop
    const horizon = H * 0.3;
    const sky = g.createLinearGradient(0, 0, 0, horizon); sky.addColorStop(0, '#bfe0ef'); sky.addColorStop(1, '#8cc4e0');
    g.fillStyle = sky; g.fillRect(-10, -10, W + 20, horizon + 10);
    g.fillStyle = '#3d7a48';
    for (let i = 0; i < 6; i++) { g.beginPath(); g.ellipse(((i * 0.23 + 0.05) % 1.1) * W, horizon + 2, W * 0.22, H * 0.09, 0, Math.PI, 0); g.fill(); }
    const gr = g.createLinearGradient(0, horizon, 0, H); gr.addColorStop(0, '#6fae52'); gr.addColorStop(1, '#447a30');
    g.fillStyle = gr; g.fillRect(-10, horizon, W + 20, H);
    const tree = draw('tree', 2, { a: '#2e5a35', b: '#4f8a55', d: '#3a2618' });
    for (const x of [0.06, 0.18, 0.33, 0.9]) g.drawImage(tree, Math.round(x * W), Math.round(horizon - 12));

    // lanes: faint guides and active traps
    for (let l = 0; l < 3; l++) {
      const f = this.slot('f', l), b = this.slot('b', l);
      this.pad(b.x, b.y, sc * 7); this.pad(f.x, f.y, sc * 8);
      const trap = A.traps.find((tr) => tr.lane === l);
      if (trap) {
        g.strokeStyle = ABILITIES.trap.color; g.lineWidth = 3; g.globalAlpha = 0.6 + 0.3 * Math.sin(this.t * 10);
        g.beginPath(); g.ellipse(f.x, f.y, sc * 9, sc * 2.6, 0, 0, Math.PI * 2); g.stroke();
        g.beginPath(); g.ellipse(b.x, b.y, sc * 7.5, sc * 2.1, 0, 0, Math.PI * 2); g.stroke(); g.globalAlpha = 1;
      }
    }

    // enemies: back row first so the front row overlaps it
    const seen = new Set();
    const list = [...A.enemies].sort((a, b) => (a.row === b.row ? 0 : a.row === 'b' ? -1 : 1));
    let packHp = 0, packMax = 0;
    for (const e of list) {
      seen.add(e.uid); packHp += Math.max(0, e.hp); packMax += e.maxHp;
      const target = this.slot(e.row, e.lane);
      let p = this.pos.get(e.uid);
      if (!p) p = { x: target.x + W * 0.25, y: target.y };
      p = { x: p.x + (target.x - p.x) * Math.min(1, dt * 8), y: p.y + (target.y - p.y) * Math.min(1, dt * 8) };
      this.pos.set(e.uid, p);
      const s = (e.row === 'f' ? sc - 1 : sc - 2) + (e.brute ? 1 : 0);
      const cv = draw(e.sprite, s, e.pal); const { w, h: hh } = mapSize(e.sprite);
      let lx = 0, ly = 0;
      const lg = this.lunge.get(e.uid);
      if (lg > 0) { const q = Math.sin((1 - lg / 0.25) * Math.PI); lx = -q * 22; ly = q * 16; this.lunge.set(e.uid, lg - dt); }
      const bob = Math.sin(this.t * 3 + e.uid) * 1.5;
      const x = Math.round(p.x - (w * s) / 2 + lx), y = Math.round(p.y - hh * s + 4 + bob + ly);
      g.globalAlpha = e.stunUntil > A.t ? 0.65 : 1;
      g.drawImage(cv, x, y);
      const fl = this.flash.get(e.uid) || 0;
      if (fl > 0) { g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.5; g.drawImage(cv, x, y); g.globalCompositeOperation = 'source-over'; this.flash.set(e.uid, fl - dt); }
      g.globalAlpha = 1;
      // mini HP bar
      const bw = Math.max(28, w * s * 0.8), fr = Math.max(0, e.hp / e.maxHp);
      g.fillStyle = '#20262e'; g.fillRect(Math.round(p.x - bw / 2) - 1, y - 9, bw + 2, 6);
      g.fillStyle = fr > 0.5 ? '#3fbf5c' : fr > 0.2 ? '#e8b928' : '#e0483e'; g.fillRect(Math.round(p.x - bw / 2), y - 8, Math.round(bw * fr), 4);
      if (e.def >= 10) { g.fillStyle = '#c9d2dc'; g.font = '700 10px "Pixelify Sans", monospace'; g.textAlign = 'right'; g.fillText('◆', Math.round(p.x - bw / 2) - 3, y - 3); }
      if (e.healer) { g.fillStyle = '#7dff9a'; g.font = '700 11px "Pixelify Sans", monospace'; g.textAlign = 'right'; g.fillText('+', Math.round(p.x - bw / 2) - 3, y - 2); }
      if (A.focus === e.uid) { g.fillStyle = '#ffd34d'; g.textAlign = 'center'; g.font = '700 14px "Pixelify Sans", monospace'; g.fillText('▼', p.x, y - 12 + Math.sin(this.t * 6) * 2); }
      if (e.stunUntil > A.t) { g.fillStyle = '#ffe08a'; g.textAlign = 'center'; g.font = '700 10px "Pixelify Sans", monospace'; g.fillText('STUN', p.x, y - 14); }
    }
    for (const [uid, p] of [...this.pos]) if (!seen.has(uid)) { this.dead.set(uid, { ...p, until: this.t + 1.5 }); this.pos.delete(uid); }
    for (const [uid, p] of [...this.dead]) if (p.until < this.t) this.dead.delete(uid);

    // hero
    const P = this.hero();
    this.pad(P.x, P.y, sc * 13);
    const hs = sc + 2, hcv = heroCanvas('wizard', CLASS.wizard.colors, true, hs);
    g.globalAlpha = A.dead ? 0.25 : 1;
    g.drawImage(hcv, Math.round(P.x - hcv.width / 2), Math.round(P.y - hcv.height + hs * 2 - (A.enemies.length ? 0 : Math.abs(Math.sin(this.t * 9)) * 3)));
    g.globalAlpha = 1;

    // effects
    for (const f of this.fx) {
      f.t += dt;
      if (f.t < 0) continue;
      const p = Math.min(1, f.t / f.life);
      if (f.k === 'proj') this.drawProj(f, p);
      else if (f.k === 'eproj') {
        const x = f.x0 + (f.x1 - f.x0) * p, y = f.y0 + (f.y1 - f.y0) * p;
        g.fillStyle = f.c; g.save(); g.translate(x, y); g.rotate(Math.atan2(f.y1 - f.y0, f.x1 - f.x0)); g.fillRect(-6, -1, 12, 2); g.restore();
      } else if (f.k === 'beam') {
        g.strokeStyle = f.c; g.globalAlpha = 1 - p; g.lineWidth = 3; g.beginPath(); g.moveTo(f.x0, f.y0); g.lineTo(f.x1, f.y1); g.stroke(); g.globalAlpha = 1;
      } else if (f.k === 'puff' || f.k === 'burst') {
        g.strokeStyle = f.c; g.globalAlpha = 1 - p; g.lineWidth = 3;
        g.beginPath(); g.arc(f.x, f.y, 8 + p * (f.k === 'burst' ? 50 : 26), 0, Math.PI * 2); g.stroke(); g.globalAlpha = 1;
      } else if (f.k === 'meteor') {
        const y = f.y - 160 * (1 - Math.min(1, p * 1.6));
        if (p < 0.62) { g.fillStyle = f.c; g.shadowColor = f.c; g.shadowBlur = 12; g.fillRect(f.x - 7 + (1 - p) * 40, y - 7, 14, 14); g.shadowBlur = 0; }
        else { g.strokeStyle = f.c; g.globalAlpha = (1 - p) * 2.5; g.lineWidth = 4; g.beginPath(); g.arc(f.x, f.y, 10 + (p - 0.62) * 120, 0, Math.PI * 2); g.stroke(); g.globalAlpha = 1; }
      } else if (f.k === 'wave') {
        g.strokeStyle = f.c; g.globalAlpha = 1 - p; g.lineWidth = 5;
        g.beginPath(); g.ellipse(P.x, P.y - 20, 30 + p * W * 0.8, 10 + p * H * 0.35, -0.3, 0, Math.PI * 2); g.stroke(); g.globalAlpha = 1;
      } else if (f.k === 'timer' && p >= 1 && !f.done) { f.done = true; f.fn(); }
    }
    this.fx = this.fx.filter((f) => f.t < f.life || (f.k === 'timer' && !f.done));

    g.textAlign = 'center';
    for (const n of this.nums) {
      n.t += dt;
      g.globalAlpha = n.t < 0.1 ? n.t / 0.1 : Math.max(0, 1 - (n.t - 0.45) / 0.35);
      g.font = `700 ${n.size}px "Pixelify Sans", monospace`;
      g.fillStyle = '#000'; g.fillText(n.text, n.x + 1, n.y - n.t * 24 + 1.5);
      g.fillStyle = n.color; g.fillText(n.text, n.x, n.y - n.t * 24);
    }
    g.globalAlpha = 1;
    this.nums = this.nums.filter((n) => n.t < 0.8);
    if (this.banner) {
      const b = this.banner; b.t += dt;
      g.globalAlpha = Math.max(0, 1 - Math.max(0, b.t - 0.7) / 0.4);
      g.font = '700 18px "Pixelify Sans", monospace'; g.fillStyle = '#000'; g.fillText(b.text, W * 0.5 + 1, H * 0.2 + 1); g.fillStyle = b.c; g.fillText(b.text, W * 0.5, H * 0.2);
      g.globalAlpha = 1; if (b.t > 1.1) this.banner = null;
    }
    g.restore();

    // boxes
    this.wName.textContent = A.enemies.length ? A.waveName : 'Walking…'; this.wNum.textContent = `Wave ${A.wave}`;
    const fr = packMax ? packHp / packMax : 0;
    this.wHp.style.width = `${fr * 100}%`;
    const pf = Math.max(0, A.hp / F.maxHp);
    this.pHp.style.width = `${pf * 100}%`; this.pHp.style.background = pf > 0.5 ? '#3fbf5c' : pf > 0.2 ? '#e8b928' : '#e0483e';
    this.pMp.style.width = `${(A.mp / F.maxMp) * 100}%`;
    this.pNum.textContent = `${Math.ceil(A.hp)} / ${F.maxHp}`;
    void loadout;
  }

  drawProj(f, p) {
    const g = this.g, pts = this.pathPoints(f);
    if (pts.length < 2) return;
    const segs = pts.length - 1, u = p * segs, i = Math.min(segs - 1, Math.floor(u)), q = u - i;
    const a = pts[i], b = pts[i + 1];
    let x = a.x + (b.x - a.x) * q, y = a.y + (b.y - a.y) * q;
    g.fillStyle = f.color; g.strokeStyle = f.color;
    if (f.style === 'lance') {
      g.globalAlpha = 1 - p; g.lineWidth = 5; g.shadowColor = f.color; g.shadowBlur = 10;
      const last = pts[pts.length - 1], dx = last.x - pts[0].x, dy = last.y - pts[0].y;
      g.beginPath(); g.moveTo(pts[0].x, pts[0].y); g.lineTo(last.x + dx * 0.25, last.y + dy * 0.25); g.stroke(); g.shadowBlur = 0; g.globalAlpha = 1;
      return;
    }
    if (f.style === 'arc') {
      g.lineWidth = 2; g.globalAlpha = 1 - p * 0.6;
      g.beginPath(); g.moveTo(pts[0].x, pts[0].y);
      for (let k = 1; k <= Math.min(segs, i + 1); k++) {
        const s0 = pts[k - 1], s1 = pts[k], lim = k === i + 1 ? q : 1;
        for (let z = 1; z <= 5; z++) { const t = (z / 5) * lim; g.lineTo(s0.x + (s1.x - s0.x) * t + (Math.random() - 0.5) * 10, s0.y + (s1.y - s0.y) * t + (Math.random() - 0.5) * 10); }
      }
      g.stroke(); g.globalAlpha = 1; return;
    }
    if (f.style === 'wave') y += Math.sin(p * Math.PI * 4) * 10;
    if (f.style === 'spread') {
      g.save(); g.translate(x, y); g.rotate(Math.atan2(b.y - a.y, b.x - a.x)); g.fillRect(-8, -1, 14, 2); g.fillRect(4, -2, 4, 4); g.restore();
      if (!f.path) { g.globalAlpha = 1; }
      return;
    }
    if (f.style === 'boomerang') {
      g.save(); g.translate(x, y); g.rotate(this.t * 20); g.fillRect(-8, -2, 16, 4); g.fillRect(-2, -8, 4, 16); g.restore(); return;
    }
    const r = f.style === 'bolt' ? 6 : 4;
    g.shadowColor = f.color; g.shadowBlur = 10; g.fillRect(x - r, y - r, r * 2, r * 2); g.shadowBlur = 0;
  }
}
