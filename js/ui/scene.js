// The battle view, laid out like a classic handheld monster battle:
// enemy top-right with its HP box top-left, your character bottom-left (seen from behind) with its box bottom-right.
// It only draws; the combat engine decides everything and sends events here.
import { draw, mapSize, heroCanvas, bagColor } from './sprites.js';
import { h } from './dom.js';

const PROJ = { staff: '#7fd8ff', wand: '#d29bff', bow: '#f0d9a0', sword: '#ffffff', dagger: '#e6e6f5' };
const ABIL_COLOR = { spell: '#ff8a3c', tome: '#7dff9a', quiver: '#ffe08a', cloak: '#b6bcd8', helm: '#ff5a4a', shield: '#9ec2ff', seal: '#ffe08a', trap: '#d8b070', scepter: '#8ae8ff', skull: '#8fff9f', poison: '#7cff4a' };

export class BattleScene {
  constructor(host) {
    this.host = host;
    this.cv = h('canvas');
    this.g = this.cv.getContext('2d');
    this.eBox = h('div', { class: 'hpbox enemy' },
      h('div', { class: 'nm' }, this.eName = h('span'), this.eLv = h('span', { class: 'lv' })),
      h('div', { class: 'hprow' }, h('b', {}, 'HP'), h('div', { class: 'bar' }, this.eHp = h('i', { style: { width: '100%', background: '#3fbf5c' } }))));
    this.pBox = h('div', { class: 'hpbox player' },
      h('div', { class: 'nm' }, this.pName = h('span'), this.pLv = h('span', { class: 'lv' })),
      h('div', { class: 'hprow' }, h('b', {}, 'HP'), h('div', { class: 'bar' }, this.pHp = h('i', { style: { width: '100%', background: '#3fbf5c' } }))),
      h('div', { class: 'hprow' }, h('b', { style: { color: '#3d7fe0' } }, 'MP'), h('div', { class: 'bar mp', style: { height: '5px' } }, this.pMp = h('i', { style: { width: '100%' } }))),
      this.pNum = h('div', { class: 'num tnum' }));
    this.msg = h('div', { class: 'overlay-msg hidden' });
    host.replaceChildren(this.cv, this.eBox, this.pBox, this.msg);
    this.fx = []; this.nums = []; this.shake = 0; this.flash = 0; this.t = 0;
    this.weapon = 'staff';
    host.addEventListener('pointerdown', (e) => {
      if (e.target.closest('button') || !this.onTap) return;
      const r = host.getBoundingClientRect();
      if (this.onTap()) this.fx.push({ k: 'ripple', x: e.clientX - r.left, y: e.clientY - r.top, t: 0, life: 0.3 });
    });
  }
  setTheme({ sky, ground, decor, seed = 1 }) {
    this.sky = sky; this.ground = ground; this.decorMap = decor;
    let s = seed * 7919 + 1;
    const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    this.hills = [0, 1].map((layer) => Array.from({ length: 6 }, () => ({ x: rnd(), w: 0.25 + rnd() * 0.35, hgt: (0.08 + rnd() * 0.12) * (layer ? 0.7 : 1) })));
    this.decor = Array.from({ length: 7 }, () => ({ x: rnd(), y: 0.36 + rnd() * 0.12, sc: 2 + Math.round(rnd()) }));
    this.tufts = Array.from({ length: 26 }, () => ({ x: rnd(), y: 0.5 + rnd() * 0.5 }));
  }
  setHero(cls, colors, weapon, name, level) {
    this.heroCls = cls; this.heroColors = colors; this.weapon = weapon || 'staff';
    this.pName.textContent = name || ''; this.pLv.textContent = level ? `Lv${level}` : '';
  }
  setEnemyLevel(text) { this.enemyLvText = text; }
  showMessage(node) { if (node) { this.msg.replaceChildren(node); this.msg.classList.remove('hidden'); } else this.msg.classList.add('hidden'); }

  size() {
    const r = this.host.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    const w = Math.max(1, Math.round(r.width * dpr)), hh = Math.max(1, Math.round(r.height * dpr));
    if (this.cv.width !== w || this.cv.height !== hh) { this.cv.width = w; this.cv.height = hh; }
    this.dpr = dpr; this.W = r.width; this.H = r.height;
  }
  enemyPos() { return { x: this.W * 0.72, y: this.H * 0.4 }; }
  heroPos() { return { x: this.W * 0.27, y: this.H * 0.86 }; }
  scale() { return Math.max(4, Math.min(7, Math.round(this.H / 38))); }

  event(kind, d) {
    const E = this.enemyPos(), P = this.heroPos();
    const jitter = () => (Math.random() - 0.5) * 26;
    if (kind === 'hit') {
      const melee = this.weapon === 'sword' || this.weapon === 'dagger';
      const n = Math.min(d.shots, 3);
      for (let i = 0; i < n; i++) {
        this.fx.push({ k: melee ? 'slash' : 'shot', x0: P.x + 14, y0: P.y - 40 + i * 4, x1: E.x + jitter() * 0.5, y1: E.y + jitter() * 0.3, t: 0, life: melee ? 0.14 : 0.18, c: PROJ[this.weapon] || '#fff', arrow: this.weapon === 'bow' });
      }
      this.later(0.16, () => { this.num(E.x + jitter() * 1.4, (this.eTop ?? E.y - 46) - 4 - Math.random() * 12, `${d.dmg}`, d.crit ? '#ffd34d' : '#ffffff', d.crit ? 17 : 13); this.flash = 0.07; });
    } else if (kind === 'hurt') {
      this.fx.push({ k: 'shot', x0: E.x - 10, y0: E.y + 10, x1: P.x + 6, y1: P.y - 30, t: 0, life: 0.24, c: d.big ? '#ff4030' : '#ff8a5c', big: d.big });
      this.later(0.24, () => { this.num(P.x + 30 + jitter(), P.y - 70, `-${d.dmg}`, '#ff6b5e', d.big ? 20 : 14); this.hurtFlash = 0.15; if (d.big) this.shake = 0.35; });
    } else if (kind === 'dodge' || kind === 'miss') {
      this.num(P.x + 30, P.y - 74, kind === 'dodge' ? 'dodge' : 'miss', '#9fd8ff', 12);
    } else if (kind === 'ability') {
      this.fx.push({ k: 'burst', x: d.dmg ? E.x : P.x, y: d.dmg ? E.y : P.y - 30, t: 0, life: 0.5, c: ABIL_COLOR[d.type] || '#fff' });
      if (d.dmg) this.later(0.1, () => this.num(E.x, E.y - 66, `${d.dmg}`, ABIL_COLOR[d.type], 21));
      if (d.heal) this.num(P.x + 30, P.y - 84, `+${d.heal}`, '#58c06f', 16);
    } else if (kind === 'kill') {
      this.fx.push({ k: 'puff', x: E.x, y: E.y, t: 0, life: 0.45, c: d.enemy?.pal?.b || '#fff' });
    } else if (kind === 'drop') {
      this.fx.push({ k: 'bag', x: E.x + jitter(), y: E.y + 14, t: 0, life: 1.4, id: d.id });
    } else if (kind === 'telegraph') {
      this.tele = { t: 0 };
    } else if (kind === 'dodged') {
      this.tele = null; this.num(P.x + 30, P.y - 90, 'DODGED!', '#58c06f', 18);
      this.fx.push({ k: 'burst', x: E.x, y: E.y, t: 0, life: 0.4, c: '#ffffff' });
    } else if (kind === 'cheat') {
      this.num(P.x + 30, P.y - 96, 'UNDYING!', '#ffd34d', 18);
      this.fx.push({ k: 'burst', x: P.x, y: P.y - 30, t: 0, life: 0.6, c: '#ffd34d' });
    } else if (kind === 'death') {
      this.fx.push({ k: 'puff', x: P.x, y: P.y - 30, t: 0, life: 0.6, c: '#ff4030' });
    }
    if (kind === 'hurt' && d.big) this.tele = null;
  }
  later(sec, fn) { this.fx.push({ k: 'timer', t: 0, life: sec, fn }); }
  num(x, y, text, color, size) { this.nums.push({ x, y, text, color, size, t: 0 }); if (this.nums.length > 28) this.nums.shift(); }

  pad(x, y, w) {
    const g = this.g;
    g.fillStyle = 'rgba(0,0,0,.28)'; g.beginPath(); g.ellipse(x, y, w, w * 0.28, 0, 0, Math.PI * 2); g.fill();
    g.strokeStyle = 'rgba(255,255,255,.12)'; g.lineWidth = 2; g.beginPath(); g.ellipse(x, y - 2, w * 0.92, w * 0.24, 0, 0, Math.PI * 2); g.stroke();
  }

  frame(dt, cs, F) {
    this.size();
    const g = this.g, W = this.W, H = this.H;
    this.t += dt;
    g.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    g.imageSmoothingEnabled = false;
    let sx = 0, sy = 0;
    if (this.shake > 0) { this.shake -= dt; sx = (Math.random() - 0.5) * 8; sy = (Math.random() - 0.5) * 8; }
    g.save(); g.translate(sx, sy);

    // sky, hills, ground
    const horizon = H * 0.46;
    const sky = g.createLinearGradient(0, 0, 0, horizon);
    sky.addColorStop(0, shade(this.sky?.[0] || '#445', 0.35)); sky.addColorStop(1, this.sky?.[0] || '#334');
    g.fillStyle = sky; g.fillRect(-10, -10, W + 20, horizon + 10);
    if (this.hills) this.hills.forEach((layer, li) => {
      g.fillStyle = shade(this.sky?.[1] || '#223', li ? -0.1 : 0.12);
      for (const hl of layer) {
        g.beginPath(); g.ellipse(hl.x * W, horizon + 2, hl.w * W, hl.hgt * H * (li ? 1.4 : 1), 0, Math.PI, 0); g.fill();
      }
    });
    const gr = g.createLinearGradient(0, horizon, 0, H);
    gr.addColorStop(0, shade(this.ground || '#222', 0.25)); gr.addColorStop(1, shade(this.ground || '#222', -0.25));
    g.fillStyle = gr; g.fillRect(-10, horizon, W + 20, H - horizon + 10);
    g.fillStyle = 'rgba(255,255,255,.06)';
    if (this.tufts) for (const t of this.tufts) g.fillRect(Math.round(t.x * W), Math.round(horizon + (t.y - 0.5) * 2 * (H - horizon)), 6, 3);
    if (this.decorMap && this.decor) for (const d of this.decor) {
      const cv = draw(this.decorMap, d.sc, decorColors(this.decorMap));
      g.globalAlpha = 0.9; g.drawImage(cv, Math.round(d.x * W - cv.width / 2), Math.round(d.y * H - cv.height)); g.globalAlpha = 1;
    }

    // enemy
    const E = this.enemyPos(), sc = this.scale();
    this.pad(E.x, E.y + sc * 6, sc * 11);
    const e = cs?.enemy;
    if (e) {
      const big = e.boss ? sc + 2 : e.elite ? sc + 1 : sc;
      const cv = draw(e.sprite, big, e.pal);
      const { w, h: hh } = mapSize(e.sprite);
      const bob = Math.sin(this.t * 3) * 2;
      const x = Math.round(E.x - (w * big) / 2), y = Math.round(E.y + sc * 6 - hh * big + 4 + bob);
      g.globalAlpha = e.stunUntil > cs.t ? 0.7 : 1;
      g.drawImage(cv, x, y);
      this.eTop = Math.max(y, 62);
      if (this.flash > 0) { g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.45; g.drawImage(cv, x, y); g.globalCompositeOperation = 'source-over'; }
      g.globalAlpha = 1;
      if (e.stunUntil > cs.t) { g.fillStyle = '#ffe08a'; g.font = '700 12px "Pixelify Sans", monospace'; g.textAlign = 'center'; g.fillText('STUNNED', E.x, y - 6); }
      this.eName.textContent = e.name; this.eLv.textContent = e.boss ? 'BOSS' : e.elite ? '★' : (this.enemyLvText || '');
      this.eBox.classList.toggle('elite', !!e.elite);
      const fr = Math.max(0, e.hp / e.maxHp);
      this.eHp.style.width = `${fr * 100}%`; this.eHp.style.background = hpColor(fr);
      this.eBox.classList.remove('hidden');
    } else this.eBox.classList.add('hidden');
    if (this.flash > 0) this.flash -= dt;

    // hero (bottom-left, from behind)
    const P = this.heroPos();
    this.pad(P.x, P.y, sc * 12);
    if (this.tele && e?.tele) {
      this.tele.t += dt;
      const p = Math.min(1, this.tele.t / 1.8);
      g.strokeStyle = `rgba(214,70,61,${0.5 + 0.5 * Math.sin(this.t * 18)})`; g.lineWidth = 3; g.setLineDash([6, 5]);
      g.beginPath(); g.ellipse(P.x, P.y, sc * 14 - 20 * p, sc * 4 - 4 * p, 0, 0, Math.PI * 2); g.stroke(); g.setLineDash([]);
    } else this.tele = null;
    if (this.heroCls) {
      const hs = sc + 1;
      const cv = heroCanvas(this.heroCls, this.heroColors, true, hs);
      const invis = cs && cs.invisUntil > cs.t;
      g.globalAlpha = cs?.dead ? 0.25 : invis ? 0.4 : 1;
      const stepY = cs?.enemy ? 0 : Math.abs(Math.sin(this.t * 9)) * 3;
      g.drawImage(cv, Math.round(P.x - cv.width / 2), Math.round(P.y - cv.height + hs * 2 - stepY));
      if (this.hurtFlash > 0) { this.hurtFlash -= dt; g.globalCompositeOperation = 'source-atop'; }
      g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
    }

    // effects
    for (const f of this.fx) {
      f.t += dt;
      const p = Math.min(1, f.t / f.life);
      if (f.k === 'shot') {
        const x = f.x0 + (f.x1 - f.x0) * p, y = f.y0 + (f.y1 - f.y0) * p;
        g.fillStyle = f.c;
        if (f.arrow) { g.save(); g.translate(x, y); g.rotate(Math.atan2(f.y1 - f.y0, f.x1 - f.x0)); g.fillRect(-8, -1, 14, 2); g.fillRect(4, -2, 4, 4); g.restore(); }
        else { const r = f.big ? 7 : 3; g.shadowColor = f.c; g.shadowBlur = 8; g.fillRect(x - r, y - r, r * 2, r * 2); g.shadowBlur = 0; }
      } else if (f.k === 'slash') {
        g.strokeStyle = f.c; g.globalAlpha = 1 - p; g.lineWidth = 3;
        g.beginPath(); g.arc(f.x1, f.y1, 22, -0.8 + p * 2, 0.6 + p * 2); g.stroke(); g.globalAlpha = 1;
      } else if (f.k === 'burst' || f.k === 'puff') {
        g.strokeStyle = f.c; g.globalAlpha = 1 - p; g.lineWidth = f.k === 'burst' ? 4 : 2;
        g.beginPath(); g.arc(f.x, f.y, 10 + p * (f.k === 'burst' ? 60 : 30), 0, Math.PI * 2); g.stroke();
        if (f.k === 'puff') for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; g.fillStyle = f.c; g.fillRect(f.x + Math.cos(a) * p * 34 - 2, f.y + Math.sin(a) * p * 34 - 2, 4, 4); }
        g.globalAlpha = 1;
      } else if (f.k === 'ripple') {
        g.strokeStyle = '#ffe08a'; g.globalAlpha = 1 - p; g.lineWidth = 2;
        g.beginPath(); g.arc(f.x, f.y, 6 + p * 22, 0, Math.PI * 2); g.stroke(); g.globalAlpha = 1;
      } else if (f.k === 'bag') {
        const cv = draw('bag', 4, bagColor(f.id));
        const q = Math.min(p * 3, 1);
        g.globalAlpha = p > 0.75 ? (1 - p) * 4 : 1;
        g.drawImage(cv, Math.round(f.x - cv.width / 2), Math.round(f.y + q * 26 - Math.sin(q * Math.PI) * 18 - cv.height / 2)); g.globalAlpha = 1;
      } else if (f.k === 'timer' && p >= 1 && !f.done) { f.done = true; f.fn(); }
    }
    this.fx = this.fx.filter((f) => f.t < f.life || (f.k === 'timer' && !f.done));

    g.textAlign = 'center';
    for (const n of this.nums) {
      n.t += dt;
      g.globalAlpha = n.t < 0.12 ? n.t / 0.12 : Math.max(0, 1 - (n.t - 0.5) / 0.4);
      g.font = `700 ${n.size}px "Pixelify Sans", monospace`;
      g.fillStyle = '#000'; g.fillText(n.text, n.x + 1, n.y - n.t * 26 + 2);
      g.fillStyle = n.color; g.fillText(n.text, n.x, n.y - n.t * 26);
    }
    g.globalAlpha = 1;
    this.nums = this.nums.filter((n) => n.t < 0.9);
    g.restore();

    if (cs && F) {
      const fr = Math.max(0, cs.hp / F.maxHp);
      this.pHp.style.width = `${fr * 100}%`; this.pHp.style.background = hpColor(fr);
      this.pMp.style.width = `${(cs.mp / F.maxMp) * 100}%`;
      this.pNum.textContent = `${Math.ceil(cs.hp)} / ${F.maxHp}`;
      this.pBox.classList.remove('hidden');
    } else this.pBox.classList.add('hidden');
  }
}

const hpColor = (f) => (f > 0.5 ? '#3fbf5c' : f > 0.2 ? '#e8b928' : '#e0483e');
function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  const ch = (v) => Math.max(0, Math.min(255, Math.round(amt >= 0 ? v + (255 - v) * amt : v * (1 + amt))));
  return `rgb(${ch(n >> 16)},${ch((n >> 8) & 255)},${ch(n & 255)})`;
}
function decorColors(map) {
  return {
    tree: { a: '#2e5a35', b: '#4f8a55', d: '#3a2618' }, rock: { a: '#6a5a4a', b: '#9a8a74', d: '#3a3028' },
    grass: { a: '#4a6a2a' }, ruin: { a: '#6a6a76', b: '#9a9aa6' }, flame: { a: '#ffd040', b: '#ff8a20', c: '#c02010' },
    crystal: { a: '#7a4ad0', b: '#c0a0ff' }, pillar: { a: '#9a8a6a', b: '#d8c89a' },
  }[map] || {};
}
