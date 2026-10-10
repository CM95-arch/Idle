// The battle view, laid out like a classic handheld monster battle: your character bottom-left (seen from behind)
// with its box bottom-right, the enemy group top-right with a box top-left. Enemies stand in a front row and a
// smaller back row across three lanes. It only draws; the combat engine decides everything and sends events here.
import { draw, mapSize, heroCanvas, bagColor } from './sprites.js';
import { h } from './dom.js';

const PROJ = { staff: '#7fd8ff', wand: '#d29bff', bow: '#f0d9a0', sword: '#ffffff', dagger: '#e6e6f5' };
const ABIL_COLOR = { spell: '#ff8a3c', tome: '#7dff9a', quiver: '#ffe08a', cloak: '#b6bcd8', helm: '#ff5a4a', shield: '#9ec2ff', seal: '#ffe08a', trap: '#d8b070', scepter: '#8ae8ff', skull: '#8fff9f', poison: '#7cff4a' };
const SEG = 0.13; // seconds a projectile spends on each leg of its path
const MELEE = new Set(['sword', 'dagger']);

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
    this.fx = []; this.nums = []; this.shake = 0; this.t = 0;
    this.pos = new Map(); this.gone = new Map(); this.flash = new Map(); this.lunge = new Map(); this.lanes = [];
    this.weapon = 'staff';
    host.addEventListener('pointerdown', (e) => {
      if (e.target.closest('button') || !this.onTap) return;
      const r = host.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
      let uid = null, bd = 56;
      for (const [id, p] of this.pos) { const d = Math.hypot(p.x - x, p.y - this.sc * 5 - y); if (d < bd) { bd = d; uid = id; } }
      if (this.onTap(uid)) this.fx.push({ k: 'ripple', x, y, t: 0, life: 0.3 });
    });
  }
  setTheme({ sky, ground, decor, seed = 1 }) {
    this.sky = sky; this.ground = ground; this.decorMap = decor;
    let s = seed * 7919 + 1;
    const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    this.hills = [0, 1].map((layer) => Array.from({ length: 6 }, () => ({ x: rnd(), w: 0.25 + rnd() * 0.35, hgt: (0.06 + rnd() * 0.08) * (layer ? 0.7 : 1) })));
    this.decor = Array.from({ length: 6 }, () => ({ x: rnd() * 0.45, y: 0.26 + rnd() * 0.06, sc: 2 + Math.round(rnd()) }));
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
    this.sc = Math.max(3, Math.min(6, Math.round(this.H / 62)));
  }
  slot(row, lane) {
    const { W, H } = this;
    return row === 'f' ? { x: W * (0.47 + 0.17 * lane), y: H * 0.6 } : { x: W * (0.55 + 0.15 * lane), y: H * 0.42 };
  }
  heroPos() { return { x: this.W * 0.22, y: this.H * 0.93 }; }
  posOf(uid) { return this.pos.get(uid) || this.gone.get(uid); }
  aim(uid) { const p = this.posOf(uid); return p && { x: p.x, y: p.y - this.sc * 5 }; }

  event(kind, d) {
    const P = this.heroPos();
    const from = { x: P.x + 18, y: P.y - this.sc * 9 };
    if (kind === 'shot') {
      if (MELEE.has(d.weapon)) {
        d.path.forEach((uid, i) => this.later(i * 0.04, () => { const p = this.aim(uid); if (p) this.fx.push({ k: 'slash', x: p.x, y: p.y, t: 0, life: 0.16, c: PROJ[d.weapon], dir: d.k % 2 ? -1 : 1, small: d.weapon === 'dagger' }); }));
      } else this.fx.push({ k: 'proj', weapon: d.weapon, path: d.path, from, t: 0, life: SEG * d.path.length + 0.03, k: d.k, c: PROJ[d.weapon] || '#fff', tap: d.tap });
    } else if (kind === 'hit') {
      const delay = MELEE.has(this.weapon) ? d.seq * 0.04 + 0.05 : SEG * (d.seq + 1);
      this.later(delay, () => {
        const p = this.aim(d.uid); if (!p) return;
        this.num(p.x + (Math.random() - 0.5) * 22, p.y - this.sc * 6 - Math.random() * 8, `${d.dmg}`, d.crit ? '#ffd34d' : '#ffffff', d.crit ? 16 : 12);
        this.flash.set(d.uid, 0.07);
      });
    } else if (kind === 'hurt' || kind === 'dodge' || kind === 'miss') {
      const src = this.aim(d.uid);
      if (src && d.ranged) this.fx.push({ k: 'eproj', x0: src.x, y0: src.y, x1: P.x + 6, y1: P.y - this.sc * 8, t: 0, life: 0.24, c: d.big ? '#ff4030' : '#ff8a5c', big: d.big });
      else if (src) this.lunge.set(d.uid, 0.25);
      this.later(d.ranged ? 0.24 : 0.12, () => {
        if (kind === 'hurt') { this.num(P.x + 30 + (Math.random() - 0.5) * 24, P.y - this.sc * 13, `-${d.dmg}`, '#ff6b5e', d.big ? 20 : 13); this.hurtFlash = 0.15; if (d.big) this.shake = 0.35; }
        else this.num(P.x + 34, P.y - this.sc * 14, d.block ? 'block' : kind, '#9fd8ff', 12);
      });
    } else if (kind === 'ability') {
      const c = ABIL_COLOR[d.type] || '#fff';
      const hits = d.hits || [];
      if (d.type === 'scepter' && hits.length) this.fx.push({ k: 'chain', path: hits.map((x) => x.uid), from, t: 0, life: 0.35, c });
      else if (d.type === 'skull') hits.forEach((x) => { const p = this.aim(x.uid); if (p) this.fx.push({ k: 'beam', x0: p.x, y0: p.y, x1: P.x, y1: P.y - this.sc * 8, t: 0, life: 0.45, c }); });
      else if (d.type === 'quiver' && d.lane != null) { const b = this.slot('b', d.lane); this.fx.push({ k: 'lance', x0: from.x, y0: from.y, x1: b.x + (b.x - from.x) * 0.2, y1: b.y - 30, t: 0, life: 0.3, c }); }
      else if (d.type === 'shield') { this.fx.push({ k: 'wave', t: 0, life: 0.5, c }); this.shake = 0.25; }
      else if ((d.type === 'trap' || d.type === 'poison') && d.lane != null) this.lanes.push({ lane: d.lane, t: 0, life: d.type === 'trap' ? 5 : 4, c });
      else if (hits.length) hits.forEach((x, i) => { const p = this.aim(x.uid); if (p) this.fx.push({ k: 'burst', x: p.x, y: p.y, t: -i * 0.05, life: 0.5, c }); });
      if (!hits.length || d.heal) this.fx.push({ k: 'burst', x: P.x, y: P.y - this.sc * 8, t: 0, life: 0.5, c });
      hits.forEach((x, i) => { if (x.dmg) this.later(0.12 + i * 0.05, () => { const p = this.aim(x.uid); if (p) this.num(p.x, p.y - this.sc * 9, `${x.dmg}`, c, 18); }); });
      if (d.heal) this.num(P.x + 30, P.y - this.sc * 16, `+${d.heal}`, '#58c06f', 16);
    } else if (kind === 'heal') {
      const p = this.aim(d.uid); if (p) this.num(p.x, p.y - this.sc * 9, `+${d.amt}`, '#58c06f', 13);
    } else if (kind === 'kill') {
      this.later(0.15, () => { const p = this.aim(d.uid); if (p) this.fx.push({ k: 'puff', x: p.x, y: p.y, t: 0, life: 0.45, c: d.enemy?.pal?.b || '#fff' }); });
    } else if (kind === 'drop') {
      const p = this.lastKill ? this.aim(this.lastKill) : null;
      const E = p || this.slot('f', 1);
      this.fx.push({ k: 'bag', x: E.x + (Math.random() - 0.5) * 20, y: E.y + 6, t: 0, life: 1.4, id: d.id });
    } else if (kind === 'telegraph') {
      this.tele = { t: 0 };
    } else if (kind === 'dodged') {
      this.tele = null; this.num(P.x + 30, P.y - this.sc * 18, 'DODGED!', '#58c06f', 18);
      const p = this.aim(d.uid); if (p) this.fx.push({ k: 'burst', x: p.x, y: p.y, t: 0, life: 0.4, c: '#ffffff' });
    } else if (kind === 'cheat') {
      this.num(P.x + 30, P.y - this.sc * 19, 'UNDYING!', '#ffd34d', 18);
      this.fx.push({ k: 'burst', x: P.x, y: P.y - 30, t: 0, life: 0.6, c: '#ffd34d' });
    } else if (kind === 'death') {
      this.fx.push({ k: 'puff', x: P.x, y: P.y - 30, t: 0, life: 0.6, c: '#ff4030' });
    }
    if (kind === 'kill') this.lastKill = d.uid;
    if (kind === 'hurt' && d.big) this.tele = null;
  }
  later(sec, fn) { this.fx.push({ k: 'timer', t: 0, life: sec, fn }); }
  num(x, y, text, color, size) { this.nums.push({ x, y, text, color, size, t: 0 }); if (this.nums.length > 36) this.nums.shift(); }

  pad(x, y, w, a = 0.28) {
    const g = this.g;
    g.fillStyle = `rgba(0,0,0,${a})`; g.beginPath(); g.ellipse(x, y, w, w * 0.28, 0, 0, Math.PI * 2); g.fill();
  }
  pathPoints(f) {
    const pts = [f.from];
    for (const uid of f.path) { const p = this.aim(uid); if (p) pts.push(p); }
    return pts;
  }

  frame(dt, cs, F) {
    this.size();
    const g = this.g, W = this.W, H = this.H, sc = this.sc;
    this.t += dt;
    g.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    g.imageSmoothingEnabled = false;
    let sx = 0, sy = 0;
    if (this.shake > 0) { this.shake -= dt; sx = (Math.random() - 0.5) * 8; sy = (Math.random() - 0.5) * 8; }
    g.save(); g.translate(sx, sy);

    // sky, hills, ground
    const horizon = H * 0.32;
    const sky = g.createLinearGradient(0, 0, 0, horizon);
    sky.addColorStop(0, shade(this.sky?.[0] || '#445', 0.35)); sky.addColorStop(1, this.sky?.[0] || '#334');
    g.fillStyle = sky; g.fillRect(-10, -10, W + 20, horizon + 10);
    if (this.hills) this.hills.forEach((layer, li) => {
      g.fillStyle = shade(this.sky?.[1] || '#223', li ? -0.1 : 0.12);
      for (const hl of layer) { g.beginPath(); g.ellipse(hl.x * W, horizon + 2, hl.w * W, hl.hgt * H * (li ? 1.4 : 1), 0, Math.PI, 0); g.fill(); }
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

    // formation pads and lane effects (trap, poison cloud)
    for (let l = 0; l < 3; l++) { const b = this.slot('b', l), f = this.slot('f', l); this.pad(b.x, b.y, sc * 7, 0.18); this.pad(f.x, f.y, sc * 8, 0.22); }
    for (const ln of this.lanes) {
      ln.t += dt;
      const f = this.slot('f', ln.lane), b = this.slot('b', ln.lane);
      g.strokeStyle = ln.c; g.lineWidth = 3; g.globalAlpha = Math.min(1, (ln.life - ln.t) * 2) * (0.55 + 0.3 * Math.sin(this.t * 10));
      g.beginPath(); g.ellipse(f.x, f.y, sc * 9, sc * 2.6, 0, 0, Math.PI * 2); g.stroke();
      g.beginPath(); g.ellipse(b.x, b.y, sc * 7.5, sc * 2.1, 0, 0, Math.PI * 2); g.stroke(); g.globalAlpha = 1;
    }
    this.lanes = this.lanes.filter((ln) => ln.t < ln.life);

    // enemies: back row first so the front row overlaps it
    const list = cs ? [...cs.enemies].filter((e) => e.hp > 0).sort((a, b) => (a.row === b.row ? 0 : a.row === 'b' ? -1 : 1)) : [];
    const seen = new Set();
    for (const e of list) {
      seen.add(e.uid);
      const target = this.slot(e.row, e.lane);
      let p = this.pos.get(e.uid) || { x: target.x + W * 0.3, y: target.y };
      const k = Math.min(1, dt * 9);
      p = { x: p.x + (target.x - p.x) * k, y: p.y + (target.y - p.y) * k };
      this.pos.set(e.uid, p);
      const s = e.boss || e.event ? sc + 1 : (e.row === 'f' ? sc - 1 : sc - 2) + (e.elite ? 1 : 0);
      const cv = draw(e.sprite, s, e.pal);
      const { w, h: hh } = mapSize(e.sprite);
      let lx = 0, ly = 0;
      const lg = this.lunge.get(e.uid);
      if (lg > 0) { const q = Math.sin((1 - lg / 0.25) * Math.PI); lx = -q * 20; ly = q * 14; this.lunge.set(e.uid, lg - dt); }
      const bob = Math.sin(this.t * 3 + e.uid) * 1.5;
      const x = Math.round(p.x - (w * s) / 2 + lx), y = Math.round(p.y - hh * s + 4 + bob + ly);
      g.globalAlpha = e.stunUntil > cs.t ? 0.7 : 1;
      g.drawImage(cv, x, y);
      const fl = this.flash.get(e.uid) || 0;
      if (fl > 0) { g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.45; g.drawImage(cv, x, y); g.globalCompositeOperation = 'source-over'; this.flash.set(e.uid, fl - dt); }
      g.globalAlpha = 1;
      // mini HP bar (bosses use the big box)
      if (!e.boss) {
        const bw = Math.max(26, w * s * 0.75), fr = Math.max(0, e.hp / e.maxHp), bx = Math.round(p.x - bw / 2);
        g.fillStyle = '#20262e'; g.fillRect(bx - 1, y - 9, bw + 2, 6);
        g.fillStyle = hpColor(fr); g.fillRect(bx, y - 8, Math.round(bw * fr), 4);
        if (e.elite) { g.fillStyle = '#ffd34d'; g.font = '700 11px "Pixelify Sans", monospace'; g.textAlign = 'right'; g.fillText('★', bx - 3, y - 2); }
      }
      if (cs.focus === e.uid) { g.fillStyle = '#ffd34d'; g.textAlign = 'center'; g.font = '700 14px "Pixelify Sans", monospace'; g.fillText('▼', p.x, y - 12 + Math.sin(this.t * 6) * 2); }
      if (e.stunUntil > cs.t) { g.fillStyle = '#ffe08a'; g.font = '700 10px "Pixelify Sans", monospace'; g.textAlign = 'center'; g.fillText('STUN', p.x, y - 14); }
      if (e.tele) {
        g.strokeStyle = `rgba(214,70,61,${0.5 + 0.5 * Math.sin(this.t * 18)})`; g.lineWidth = 3;
        g.beginPath(); g.arc(p.x, y + (hh * s) / 2, (w * s) / 2 + 6, 0, Math.PI * 2); g.stroke();
      }
    }
    for (const [uid, p] of [...this.pos]) if (!seen.has(uid)) { this.gone.set(uid, { ...p, until: this.t + 1.2 }); this.pos.delete(uid); }
    for (const [uid, p] of [...this.gone]) if (p.until < this.t) this.gone.delete(uid);

    // hero (bottom-left, from behind)
    const P = this.heroPos();
    this.pad(P.x, P.y, sc * 13);
    const tele = list.find((e) => e.tele);
    if (this.tele && tele) {
      this.tele.t += dt;
      const p = Math.min(1, this.tele.t / 1.8);
      g.strokeStyle = `rgba(214,70,61,${0.5 + 0.5 * Math.sin(this.t * 18)})`; g.lineWidth = 3; g.setLineDash([6, 5]);
      g.beginPath(); g.ellipse(P.x, P.y, sc * 15 - 20 * p, sc * 4 - 4 * p, 0, 0, Math.PI * 2); g.stroke(); g.setLineDash([]);
    } else this.tele = null;
    if (this.heroCls) {
      const hs = sc + 2;
      const cv = heroCanvas(this.heroCls, this.heroColors, true, hs);
      const invis = cs && cs.invisUntil > cs.t;
      g.globalAlpha = cs?.dead ? 0.25 : invis ? 0.4 : 1;
      const stepY = list.length ? 0 : Math.abs(Math.sin(this.t * 9)) * 3;
      g.drawImage(cv, Math.round(P.x - cv.width / 2), Math.round(P.y - cv.height + hs * 2 - stepY));
      if (this.hurtFlash > 0) this.hurtFlash -= dt;
      g.globalAlpha = 1;
      if (cs && (cs.hasteUntil > cs.t || cs.dmgUntil > cs.t)) {
        g.strokeStyle = cs.hasteUntil > cs.t ? 'rgba(255,90,74,.6)' : 'rgba(255,224,138,.6)'; g.lineWidth = 2;
        g.beginPath(); g.ellipse(P.x, P.y, sc * 11, sc * 3, 0, 0, Math.PI * 2); g.stroke();
      }
    }

    // effects
    for (const f of this.fx) {
      f.t += dt;
      if (f.t < 0) continue;
      const p = Math.min(1, f.t / f.life);
      if (f.k === 'proj') this.drawProj(f, p);
      else if (f.k === 'eproj') {
        const x = f.x0 + (f.x1 - f.x0) * p, y = f.y0 + (f.y1 - f.y0) * p, r = f.big ? 6 : 3;
        g.fillStyle = f.c; g.shadowColor = f.c; g.shadowBlur = 6; g.fillRect(x - r, y - r, r * 2, r * 2); g.shadowBlur = 0;
      } else if (f.k === 'slash') {
        g.strokeStyle = f.c; g.globalAlpha = 1 - p; g.lineWidth = f.small ? 2 : 3;
        const r = f.small ? 12 : 22, a0 = f.dir > 0 ? -0.9 : 2.2;
        g.beginPath(); g.arc(f.x, f.y, r, a0 + p * 1.6 * f.dir, a0 + (1.2 + p * 1.6) * f.dir, f.dir < 0); g.stroke(); g.globalAlpha = 1;
      } else if (f.k === 'burst' || f.k === 'puff') {
        g.strokeStyle = f.c; g.globalAlpha = 1 - p; g.lineWidth = f.k === 'burst' ? 4 : 2;
        g.beginPath(); g.arc(f.x, f.y, 8 + p * (f.k === 'burst' ? 46 : 26), 0, Math.PI * 2); g.stroke();
        if (f.k === 'puff') for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; g.fillStyle = f.c; g.fillRect(f.x + Math.cos(a) * p * 30 - 2, f.y + Math.sin(a) * p * 30 - 2, 4, 4); }
        g.globalAlpha = 1;
      } else if (f.k === 'beam' || f.k === 'lance') {
        g.strokeStyle = f.c; g.globalAlpha = 1 - p; g.lineWidth = f.k === 'lance' ? 6 : 3; g.shadowColor = f.c; g.shadowBlur = 10;
        g.beginPath(); g.moveTo(f.x0, f.y0); g.lineTo(f.x1, f.y1); g.stroke(); g.shadowBlur = 0; g.globalAlpha = 1;
      } else if (f.k === 'chain') {
        const pts = this.pathPoints(f);
        g.strokeStyle = f.c; g.globalAlpha = 1 - p; g.lineWidth = 2;
        g.beginPath(); g.moveTo(pts[0].x, pts[0].y);
        for (let i = 1; i < pts.length; i++) for (let z = 1; z <= 5; z++) { const a = pts[i - 1], b = pts[i], t = z / 5; g.lineTo(a.x + (b.x - a.x) * t + (Math.random() - 0.5) * 10, a.y + (b.y - a.y) * t + (Math.random() - 0.5) * 10); }
        g.stroke(); g.globalAlpha = 1;
      } else if (f.k === 'wave') {
        g.strokeStyle = f.c; g.globalAlpha = 1 - p; g.lineWidth = 5;
        g.beginPath(); g.ellipse(P.x, P.y - 20, 30 + p * W * 0.8, 10 + p * H * 0.3, -0.3, 0, Math.PI * 2); g.stroke(); g.globalAlpha = 1;
      } else if (f.k === 'ripple') {
        g.strokeStyle = '#ffe08a'; g.globalAlpha = 1 - p; g.lineWidth = 2;
        g.beginPath(); g.arc(f.x, f.y, 6 + p * 22, 0, Math.PI * 2); g.stroke(); g.globalAlpha = 1;
      } else if (f.k === 'bag') {
        const cv = draw('bag', 4, bagColor(f.id));
        const q = Math.min(p * 3, 1);
        g.globalAlpha = p > 0.75 ? (1 - p) * 4 : 1;
        g.drawImage(cv, Math.round(f.x - cv.width / 2), Math.round(f.y + q * 20 - Math.sin(q * Math.PI) * 18 - cv.height / 2)); g.globalAlpha = 1;
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
    g.restore();

    // boxes: the boss/event/elite if there is one, else the group
    if (list.length) {
      const star = list.find((e) => e.boss) || list.find((e) => e.event) || list.find((e) => e.elite);
      const hp = star ? star.hp : list.reduce((n, e) => n + e.hp, 0), max = star ? star.maxHp : list.reduce((n, e) => n + e.maxHp, 0);
      this.eName.textContent = star ? star.name : list.length === 1 ? list[0].name : `${list.length} enemies`;
      this.eLv.textContent = star?.boss ? 'BOSS' : star?.event ? 'EVENT' : star ? '★' : (this.enemyLvText || '');
      this.eBox.classList.toggle('elite', !!star);
      this.eBox.classList.toggle('event', !!star?.event);
      const fr = Math.max(0, hp / max);
      this.eHp.style.width = `${fr * 100}%`; this.eHp.style.background = hpColor(fr);
      this.eBox.classList.remove('hidden');
    } else this.eBox.classList.add('hidden');
    if (cs && F) {
      const fr = Math.max(0, cs.hp / F.maxHp);
      this.pHp.style.width = `${fr * 100}%`; this.pHp.style.background = hpColor(fr);
      this.pMp.style.width = `${(cs.mp / F.maxMp) * 100}%`;
      this.pNum.textContent = `${Math.ceil(cs.hp)} / ${F.maxHp}`;
      this.pBox.classList.remove('hidden');
    } else this.pBox.classList.add('hidden');
  }

  drawProj(f, p) {
    const g = this.g, pts = this.pathPoints(f);
    if (pts.length < 2) return;
    const segs = pts.length - 1, u = p * segs, i = Math.min(segs - 1, Math.floor(u)), q = u - i;
    const a = pts[i], b = pts[i + 1];
    let x = a.x + (b.x - a.x) * q, y = a.y + (b.y - a.y) * q;
    g.fillStyle = f.c; g.strokeStyle = f.c;
    if (f.tap) g.globalAlpha = 0.7;
    if (f.weapon === 'wand') {
      // piercing: a bright streak that runs through its targets
      g.lineWidth = 3; g.shadowColor = f.c; g.shadowBlur = 10;
      const tx = x - (b.x - a.x) * 0.25, ty = y - (b.y - a.y) * 0.25;
      g.beginPath(); g.moveTo(tx, ty); g.lineTo(x, y); g.stroke(); g.fillRect(x - 3, y - 3, 6, 6); g.shadowBlur = 0;
    } else if (f.weapon === 'bow') {
      g.save(); g.translate(x, y); g.rotate(Math.atan2(b.y - a.y, b.x - a.x)); g.fillRect(-8, -1, 14, 2); g.fillRect(4, -2, 4, 4); g.restore();
    } else {
      // staff: weaving bolts
      y += Math.sin(p * Math.PI * 3 + (f.k ? Math.PI : 0)) * 9;
      x += Math.cos(p * Math.PI * 3 + (f.k ? Math.PI : 0)) * 3;
      g.shadowColor = f.c; g.shadowBlur = 8; g.fillRect(x - 4, y - 4, 8, 8); g.shadowBlur = 0;
    }
    g.globalAlpha = 1;
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
