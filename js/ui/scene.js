// The battle view: player seen from behind at the bottom, enemy at the top.
// It only draws; the combat engine decides everything and sends events here.
import { draw, mapSize, heroCanvas, bagColor } from './sprites.js';
import { h } from './dom.js';

const PROJ = { staff: '#7fd8ff', wand: '#d29bff', bow: '#e8c890', sword: '#ffffff', dagger: '#e0e0f0' };
const ABIL_COLOR = { spell: '#ff8a3c', tome: '#7dff9a', quiver: '#ffe08a', cloak: '#9aa0c0', helm: '#ff5a4a', shield: '#9ec2ff', seal: '#ffe08a', trap: '#c8a060', scepter: '#8ae8ff', skull: '#8fff9f', poison: '#7cff4a' };

export class BattleScene {
  constructor(host) {
    this.host = host;
    this.cv = h('canvas');
    this.g = this.cv.getContext('2d');
    this.tag = h('div', { class: 'enemy-tag' }, this.tagName = h('span', { class: 'nm' }), h('div', { class: 'bar' }, this.tagHp = h('i', { style: { width: '100%', background: 'var(--hpbar)' } })));
    this.bars = h('div', { class: 'hero-bars' },
      h('div', { class: 'bar' }, this.hpI = h('i', { style: { background: 'var(--hpbar)' } })),
      h('div', { class: 'bar', style: { height: '5px' } }, this.mpI = h('i', { style: { background: 'var(--mpbar)' } })));
    this.restLbl = h('div', { class: 'resting hidden' }, 'Resting');
    this.msg = h('div', { class: 'overlay-msg hidden' });
    host.replaceChildren(this.cv, this.tag, this.bars, this.restLbl, this.msg);
    this.fx = []; this.nums = []; this.shake = 0; this.flash = 0; this.t = 0;
    this.decor = [];
    this.enemyAlpha = 1; this.lastEnemy = null; this.tele = null;
    this.weapon = 'staff';
  }
  setTheme({ sky, ground, decor, seed = 1 }) {
    this.sky = sky; this.ground = ground; this.decorMap = decor;
    let s = seed;
    const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    this.decor = Array.from({ length: 9 }, () => ({ x: rnd(), y: 0.12 + rnd() * 0.8, sc: 2 + Math.round(rnd() * 2), side: rnd() < 0.5 }));
  }
  setHero(cls, colors, weapon) { this.heroCls = cls; this.heroColors = colors; this.weapon = weapon || 'staff'; }
  showMessage(node) { if (node) { this.msg.replaceChildren(node); this.msg.classList.remove('hidden'); } else this.msg.classList.add('hidden'); }

  size() {
    const r = this.host.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    const w = Math.max(1, Math.round(r.width * dpr)), hh = Math.max(1, Math.round(r.height * dpr));
    if (this.cv.width !== w || this.cv.height !== hh) { this.cv.width = w; this.cv.height = hh; }
    this.dpr = dpr; this.W = r.width; this.H = r.height;
  }
  enemyPos() { return { x: this.W / 2, y: this.H * 0.33 }; }
  heroPos() { return { x: this.W / 2, y: this.H - 52 }; }

  event(kind, d) {
    const E = this.enemyPos(), P = this.heroPos();
    const jitter = () => (Math.random() - 0.5) * 30;
    if (kind === 'hit') {
      const melee = this.weapon === 'sword' || this.weapon === 'dagger';
      for (let i = 0; i < Math.min(d.shots, 3); i++) {
        this.fx.push({ k: melee ? 'slash' : 'shot', x0: P.x + (i - (d.shots - 1) / 2) * 8, y0: P.y - 30, x1: E.x + jitter() * 0.6, y1: E.y + 10, t: 0, life: melee ? 0.18 : 0.22, c: PROJ[this.weapon] || '#fff' });
      }
      this.later(0.2, () => { this.num(E.x + jitter() * 1.5, E.y - 42 - Math.random() * 12, `${d.dmg}${d.crit ? '!' : ''}`, d.crit ? '#ffd34d' : '#ffffff', d.crit ? 19 : 14); this.flash = 0.12; });
    } else if (kind === 'hurt') {
      this.fx.push({ k: 'shot', x0: E.x + jitter(), y0: E.y + 20, x1: P.x, y1: P.y - 20, t: 0, life: 0.28, c: d.big ? '#ff4030' : '#ff8a5c', big: d.big });
      this.later(0.28, () => { this.num(P.x + jitter(), P.y - 50, `-${d.dmg}`, '#ff6b5e', d.big ? 20 : 14); if (d.big) this.shake = 0.35; });
    } else if (kind === 'dodge' || kind === 'miss') {
      this.num(P.x + jitter(), P.y - 54, kind === 'dodge' ? 'dodge' : 'miss', '#9fd8ff', 12);
    } else if (kind === 'ability') {
      this.fx.push({ k: 'burst', x: d.dmg ? E.x : P.x, y: d.dmg ? E.y : P.y - 20, t: 0, life: 0.5, c: ABIL_COLOR[d.type] || '#fff' });
      if (d.dmg) this.later(0.1, () => this.num(E.x, E.y - 60, `${d.dmg}`, ABIL_COLOR[d.type], 22));
      if (d.heal) this.num(P.x, P.y - 60, `+${d.heal}`, '#58c06f', 16);
    } else if (kind === 'kill') {
      this.fx.push({ k: 'puff', x: E.x, y: E.y, t: 0, life: 0.45, c: d.enemy?.pal?.b || '#fff' });
      this.dying = { enemy: d.enemy, t: 0 };
    } else if (kind === 'drop') {
      this.fx.push({ k: 'bag', x: E.x + jitter(), y: E.y + 20, t: 0, life: 1.6, id: d.id });
    } else if (kind === 'telegraph') {
      this.tele = { t: 0 };
    } else if (kind === 'dodged') {
      this.tele = null; this.num(P.x, P.y - 70, 'DODGED!', '#58c06f', 18);
      this.fx.push({ k: 'burst', x: E.x, y: E.y, t: 0, life: 0.4, c: '#ffffff' });
    } else if (kind === 'death') {
      this.fx.push({ k: 'puff', x: P.x, y: P.y - 20, t: 0, life: 0.6, c: '#ff4030' });
    }
    if (kind === 'hurt' && d.big) this.tele = null;
  }
  later(sec, fn) { this.fx.push({ k: 'timer', t: 0, life: sec, fn }); }
  num(x, y, text, color, size) { this.nums.push({ x, y, text, color, size, t: 0 }); if (this.nums.length > 24) this.nums.shift(); }

  /** cs: combat state (or null), F: fighter, opts: { boss } */
  frame(dt, cs, F) {
    this.size();
    const g = this.g, W = this.W, H = this.H;
    this.t += dt;
    g.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    g.imageSmoothingEnabled = false;
    let sx = 0, sy = 0;
    if (this.shake > 0) { this.shake -= dt; sx = (Math.random() - 0.5) * 8; sy = (Math.random() - 0.5) * 8; }
    g.save(); g.translate(sx, sy);

    // ground and sky
    const grd = g.createLinearGradient(0, 0, 0, H);
    grd.addColorStop(0, this.sky?.[0] || '#222'); grd.addColorStop(0.55, this.sky?.[1] || '#111'); grd.addColorStop(1, '#050407');
    g.fillStyle = grd; g.fillRect(-10, -10, W + 20, H + 20);
    g.fillStyle = this.ground || '#111'; g.globalAlpha = 0.5;
    for (let y = H * 0.5; y < H; y += 10) for (let x = (y / 10) % 2 ? 0 : 10; x < W; x += 20) g.fillRect(x, y, 10, 10);
    g.globalAlpha = 1;
    if (this.decorMap) for (const d of this.decor) {
      const cv = draw(this.decorMap, d.sc, decorColors(this.decorMap));
      const x = d.side ? d.x * W * 0.22 : W - d.x * W * 0.22 - cv.width;
      g.globalAlpha = 0.55; g.drawImage(cv, x, d.y * H - cv.height); g.globalAlpha = 1;
    }

    // enemy
    const E = this.enemyPos();
    const e = cs?.enemy;
    if (e) {
      const big = e.boss ? 8 : e.elite ? 7 : 6;
      const cv = draw(e.sprite, big, e.pal);
      const { w, h: hh } = mapSize(e.sprite);
      const bob = Math.sin(this.t * 3) * 3;
      const stunned = e.stunUntil > cs.t;
      g.save();
      if (stunned) { g.globalAlpha = 0.75; }
      g.drawImage(cv, E.x - (w * big) / 2, E.y - (hh * big) / 2 + bob);
      if (this.flash > 0) { g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.5; g.drawImage(cv, E.x - (w * big) / 2, E.y - (hh * big) / 2 + bob); }
      g.restore();
      if (stunned) { g.fillStyle = '#ffe08a'; g.font = '700 12px "Pixelify Sans", monospace'; g.textAlign = 'center'; g.fillText('STUNNED', E.x, E.y + (hh * big) / 2 + 14); }
      this.tagName.textContent = e.name; this.tagName.classList.toggle('elite', !!e.elite);
      this.tagHp.style.width = `${Math.max(0, (e.hp / e.maxHp) * 100)}%`;
      this.tag.classList.toggle('hidden', !!e.boss);
    } else this.tag.classList.add('hidden');
    if (this.flash > 0) this.flash -= dt;

    // telegraph ring around the hero
    const P = this.heroPos();
    if (this.tele && e?.tele) {
      this.tele.t += dt;
      const p = Math.min(1, this.tele.t / 1.8);
      g.strokeStyle = `rgba(224,80,63,${0.5 + 0.5 * Math.sin(this.t * 18)})`; g.lineWidth = 3; g.setLineDash([6, 5]);
      g.beginPath(); g.ellipse(P.x, P.y + 6, 70 - 30 * p, 22 - 8 * p, 0, 0, Math.PI * 2); g.stroke(); g.setLineDash([]);
      g.fillStyle = `rgba(224,80,63,${0.12 + 0.2 * p})`; g.fill();
    } else this.tele = null;

    // hero
    if (this.heroCls) {
      const cv = heroCanvas(this.heroCls, this.heroColors, true, 5);
      const invis = cs && cs.invisUntil > cs.t;
      g.globalAlpha = cs?.dead ? 0.25 : invis ? 0.4 : 1;
      const step = cs?.enemy || cs?.resting ? 0 : Math.abs(Math.sin(this.t * 8)) * 3;
      g.drawImage(cv, P.x - cv.width / 2, P.y - cv.height + 8 - step);
      g.globalAlpha = 1;
    }

    // effects
    for (const f of this.fx) {
      f.t += dt;
      const p = Math.min(1, f.t / f.life);
      if (f.k === 'shot') {
        const x = f.x0 + (f.x1 - f.x0) * p, y = f.y0 + (f.y1 - f.y0) * p;
        g.fillStyle = f.c; g.shadowColor = f.c; g.shadowBlur = 8;
        const r = f.big ? 7 : 3;
        g.fillRect(x - r, y - r, r * 2, r * 2); g.shadowBlur = 0;
      } else if (f.k === 'slash') {
        g.strokeStyle = f.c; g.globalAlpha = 1 - p; g.lineWidth = 3;
        g.beginPath(); g.arc(f.x1, f.y1, 22, -0.8 + p * 2, 0.6 + p * 2); g.stroke(); g.globalAlpha = 1;
      } else if (f.k === 'burst' || f.k === 'puff') {
        g.strokeStyle = f.c; g.globalAlpha = 1 - p; g.lineWidth = f.k === 'burst' ? 4 : 2;
        g.beginPath(); g.arc(f.x, f.y, 10 + p * (f.k === 'burst' ? 60 : 30), 0, Math.PI * 2); g.stroke();
        if (f.k === 'puff') for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; g.fillStyle = f.c; g.fillRect(f.x + Math.cos(a) * p * 34 - 2, f.y + Math.sin(a) * p * 34 - 2, 4, 4); }
        g.globalAlpha = 1;
      } else if (f.k === 'bag') {
        const cv = draw('bag', 4, bagColor(f.id));
        const yy = f.y + Math.min(p * 3, 1) * 30 - Math.sin(Math.min(p * 3, 1) * Math.PI) * 18;
        g.globalAlpha = p > 0.75 ? (1 - p) * 4 : 1;
        g.drawImage(cv, f.x - cv.width / 2, yy - cv.height / 2); g.globalAlpha = 1;
      } else if (f.k === 'timer' && p >= 1 && !f.done) { f.done = true; f.fn(); }
    }
    this.fx = this.fx.filter((f) => f.t < f.life || (f.k === 'timer' && !f.done));

    // numbers
    g.textAlign = 'center';
    for (const n of this.nums) {
      n.t += dt;
      const a = n.t < 0.15 ? n.t / 0.15 : Math.max(0, 1 - (n.t - 0.6) / 0.5);
      g.globalAlpha = a;
      g.font = `700 ${n.size}px "Pixelify Sans", monospace`;
      g.fillStyle = '#000'; g.fillText(n.text, n.x + 1, n.y - n.t * 28 + 2);
      g.fillStyle = n.color; g.fillText(n.text, n.x, n.y - n.t * 28);
    }
    g.globalAlpha = 1;
    this.nums = this.nums.filter((n) => n.t < 1.1);
    g.restore();

    // hero bars (DOM)
    if (cs && F) {
      this.hpI.style.width = `${(cs.hp / F.maxHp) * 100}%`;
      this.mpI.style.width = `${(cs.mp / F.maxMp) * 100}%`;
      this.bars.classList.remove('hidden');
      this.restLbl.classList.toggle('hidden', !cs.resting || !!cs.enemy);
    } else { this.bars.classList.add('hidden'); this.restLbl.classList.add('hidden'); }
  }
}

function decorColors(map) {
  return {
    tree: { a: '#2e5a35', b: '#4f8a55', d: '#3a2618' }, rock: { a: '#5a4a3a', b: '#8a7a64', d: '#2a2018' },
    grass: { a: '#4a6a2a' }, ruin: { a: '#5a5a66', b: '#8a8a96' }, flame: { a: '#ffd040', b: '#ff8a20', c: '#c02010' },
    crystal: { a: '#6a3ac0', b: '#b090ff' }, pillar: { a: '#8a7a5a', b: '#c8b88a' },
  }[map] || {};
}
