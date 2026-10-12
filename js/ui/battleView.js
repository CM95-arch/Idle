// Draws the live battle on a canvas: zone backdrop, party, enemies, projectiles, ability effects, numbers, loot.
// It only reads the simulation (core/battle.js) and reacts to its events; it never changes the game.
import { CLASSES } from '../data/classes.js';
import { zoneOf } from '../data/zones.js';
import { BAL } from '../data/balance.js';
import { heroImage } from './art/heroes.js';
import { monsterImage } from './art/monsters.js';
import { itemImage, RARITY_SHADES } from './art/items.js';
import { backdrop } from './art/scenes.js';
import { ready } from './art/core.js';

export const VW = 360, VH = 430;
const MOD_COLOR = { chain: '#7ae8ff', burn: '#ff8a2a', chill: '#bfe8ff' };
const EXALT_PAL = ['#a07a20', '#fff3c0', '#ffffff'];
export const HERO_POS = [{ x: 180, y: 335 }, { x: 92, y: 362 }, { x: 268, y: 362 }];
const TAU = Math.PI * 2;
const rand = (a, b) => a + Math.random() * (b - a);

// soft round glow sprites, cached per color
const glowCache = new Map();
function glow(color, r) {
  const k = `${color}|${r}`;
  if (glowCache.has(k)) return glowCache.get(k);
  const cv = document.createElement('canvas'); cv.width = cv.height = r * 2;
  const g = cv.getContext('2d'), gr = g.createRadialGradient(r, r, 0, r, r, r);
  gr.addColorStop(0, color); gr.addColorStop(0.35, color + 'aa'); gr.addColorStop(1, color + '00');
  g.fillStyle = gr; g.fillRect(0, 0, r * 2, r * 2);
  glowCache.set(k, cv);
  return cv;
}
// a red-tinted copy of an image, for hit flashes
const tintCache = new Map();
function tinted(art, color) {
  const k = `${art.key}|${color}`;
  if (tintCache.has(k)) return tintCache.get(k);
  const cv = document.createElement('canvas'); cv.width = art.bmp.width; cv.height = art.bmp.height;
  const g = cv.getContext('2d'); g.drawImage(art.bmp, 0, 0); g.globalCompositeOperation = 'source-atop'; g.fillStyle = color; g.fillRect(0, 0, cv.width, cv.height);
  tintCache.set(k, cv);
  return cv;
}
const HERO_H = 116, ENEMY_SIZE = 110, BOSS_SIZE = 186;

export class BattleView {
  constructor(canvas) {
    this.cv = canvas; this.g = canvas.getContext('2d');
    this.t = 0; this.shake = 0; this.flash = 0; this.flashColor = '#fff';
    this.fx = []; this.parts = []; this.nums = []; this.banners = []; this.bags = []; this.coins = [];
    this.ev = new Map(); // enemy visuals by id
    this.hv = [0, 1, 2].map(() => ({ hurt: 0, lunge: 0, aura: 0, auraColor: '#fff', cast: 0 }));
    this.motes = Array.from({ length: 26 }, () => ({ x: rand(0, VW), y: rand(0, VH), v: rand(4, 14), s: rand(1, 2.5), p: rand(0, TAU) }));
    this.resize();
  }
  resize() {
    const r = this.cv.getBoundingClientRect(), dpr = Math.min(2, window.devicePixelRatio || 1); // 2× is sharp enough and far lighter on phones
    const s = Math.min(r.width / VW, r.height / VH) || 1;
    this.scale = s; this.ox = (r.width - VW * s) / 2; this.oy = (r.height - VH * s) / 2;
    this.cv.width = Math.round(r.width * dpr); this.cv.height = Math.round(r.height * dpr); this.dpr = dpr;
  }
  /** Where a world point sits on the page (for flying things into DOM counters). */
  toPage(x, y) { const r = this.cv.getBoundingClientRect(); return { x: r.left + this.ox + x * this.scale, y: r.top + this.oy + y * this.scale }; }

  heroPos(B, i) { const p = HERO_POS[i]; const v = this.hv[i]; return { x: p.x, y: p.y - v.lunge * 10 + Math.sin(this.t * 2.2 + i) * 2 }; }
  enemyVis(e) {
    let v = this.ev.get(e.id);
    if (!v) { v = { flash: 0, kx: 0, ky: 0, born: this.t, dead: 0, ph: Math.random() * TAU }; this.ev.set(e.id, v); }
    return v;
  }

  /** React to one tick's events and rewards. */
  feed(B, events, rewards, sound) {
    const byId = (id) => B.enemies.find((e) => e.id === id);
    for (const ev of events) {
      switch (ev.k) {
        case 'shot': {
          const h = B.heroes[ev.hero], e = byId(ev.to); if (!e) break;
          const C = CLASSES[h.cls], p = this.heroPos(B, ev.hero);
          this.hv[ev.hero].lunge = Math.max(this.hv[ev.hero].lunge, h.spd > 4 ? 0.45 : 1);
          this.fx.push({ k: 'bolt', x0: p.x + (i => (i === 2 ? -14 : 14))(ev.hero), y0: p.y - 44, id: e.id, t: 0, life: ev.flight, c: MOD_COLOR[ev.mod] || C.shot, crit: ev.crit, w: C.weapon, big: ev.big, mod: ev.mod });
          if (ev.big) this.hv[ev.hero].lunge = 1.4;
          sound?.(C.weapon);
          break;
        }
        case 'hit': {
          const e = byId(ev.id); if (!e) break;
          const v = this.enemyVis(e); v.flash = 0.12; v.ky = -3;
          // rapid plain hits add up into one number every ~0.25s so fast shooters don't bury the screen
          const plain = !ev.crit && !ev.ab;
          if (plain) v.acc = (v.acc || 0) + ev.dmg;
          if (!plain || this.t - (v.numAt || 0) > 0.25) {
            if (plain) { v.numAt = this.t; this.num(e.x + rand(-12, 12), e.y - 26, fmt(v.acc), '#ffffff', 11); v.acc = 0; }
            else this.num(e.x + rand(-12, 12), e.y - 26, fmt(ev.dmg), ev.crit ? '#ffd34d' : '#ffb070', ev.crit ? 15 : 13, ev.crit);
          }
          if (ev.crit) this.shake = Math.max(this.shake, 2);
          for (let i = 0; i < (ev.crit ? 8 : plain ? 2 : 4); i++) this.parts.push({ x: e.x, y: e.y, vx: rand(-80, 80), vy: rand(-90, 30), t: 0, life: rand(0.25, 0.5), c: ev.crit ? '#ffd34d' : '#ffffff', s: rand(1.5, 3) });
          break;
        }
        case 'die': {
          const e = byId(ev.id); if (!e) break;
          const v = this.enemyVis(e); v.dead = 0.001;
          for (let i = 0; i < (ev.boss ? 60 : 22); i++) { const a = rand(0, TAU), sp = rand(40, ev.boss ? 260 : 160); this.parts.push({ x: e.x, y: e.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 40, t: 0, life: rand(0.4, ev.boss ? 1.4 : 0.8), c: [e.pal.a, e.pal.b, e.pal.c][i % 3], s: rand(2, 4), g: 160 }); }
          if (ev.boss) { this.shake = 10; this.flash = 0.5; this.flashColor = '#fff6d0'; sound?.('bossDie'); } else sound?.('kill');
          break;
        }
        case 'eshot': {
          const e = byId(ev.id); if (!e) break;
          const p = this.heroPos(B, ev.hero);
          this.fx.push({ k: 'ebolt', x0: e.x, y0: e.y + 14, x1: p.x, y1: p.y - 10, t: 0, life: ev.flight, c: ev.boss ? '#ff3a5a' : '#ff6a4a', r: ev.boss ? 6 : 4.5 });
          break;
        }
        case 'pattern': {
          const e = byId(ev.id); if (!e) break;
          const n = ev.kind === 'ring' ? 18 : ev.kind === 'spread' ? 9 : 14;
          for (let i = 0; i < n; i++) {
            const a = ev.kind === 'ring' ? (i / n) * TAU : ev.kind === 'spread' ? Math.PI / 2 + (i / (n - 1) - 0.5) * 1.6 : (i / n) * TAU + this.t * 3;
            this.fx.push({ k: 'pbullet', x: e.x, y: e.y + 10, vx: Math.cos(a) * (ev.kind === 'spiral' ? 240 : 300), vy: Math.sin(a) * (ev.kind === 'spiral' ? 240 : 300), spin: ev.kind === 'spiral' ? 1.6 : 0, t: 0, life: 1.4, c: '#ff3a8a' });
          }
          this.fx.push({ k: 'ringwave', x: e.x, y: e.y, t: 0, life: 0.5, c: '#ff3a8a' });
          sound?.('boss');
          break;
        }
        case 'ehit': {
          const p = this.heroPos(B, ev.hero);
          this.hv[ev.hero].hurt = 0.2;
          this.num(p.x + rand(-10, 10), p.y - 40, ev.shield && ev.dmg < 1 ? 'blocked' : fmt(ev.dmg), ev.shield ? '#7ad0ff' : '#ff6b5e', ev.big ? 13 : 11);
          if (ev.big) this.shake = Math.max(this.shake, 6);
          sound?.('hurt');
          break;
        }
        case 'heal': { const p = this.heroPos(B, ev.hero); this.num(p.x, p.y - 44, `+${fmt(ev.amt)}`, '#6cff8a', 12); for (let i = 0; i < 8; i++) this.parts.push({ x: p.x + rand(-14, 14), y: p.y + rand(-10, 10), vx: 0, vy: rand(-60, -30), t: 0, life: rand(0.5, 0.9), c: '#8fff9f', s: 2.5 }); break; }
        case 'blast': {
          const e = byId(ev.id); if (!e) break;
          this.fx.push({ k: 'boom', x: e.x, y: e.y, t: 0, life: ev.big ? 0.7 : 0.5, c: '#ffb070', big: ev.big });
          this.fx.push({ k: 'ringwave', x: e.x, y: e.y, t: 0, life: ev.big ? 0.55 : 0.4, c: '#ffe0b0' });
          for (let i = 0; i < (ev.big ? 18 : 8); i++) { const a = rand(0, TAU), sp = rand(80, ev.big ? 240 : 160); this.parts.push({ x: e.x, y: e.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, t: 0, life: rand(0.3, 0.6), c: i % 2 ? '#ffd34d' : '#ff7a3a', s: rand(2, 3.5) }); }
          this.shake = Math.max(this.shake, ev.big ? 5 : 2.5);
          sound?.('blast');
          break;
        }
        case 'arc': {
          const a = byId(ev.from); if (!a) break;
          let prev = a;
          for (const id of ev.ids) { const o = byId(id); if (!o) continue; this.fx.push({ k: 'zap', x0: prev.x, y0: prev.y, x1: o.x, y1: o.y, t: 0, life: 0.25, c: '#7ae8ff' }); prev = o; }
          sound?.('zap');
          break;
        }
        case 'ignite': case 'chill': {
          if (this.fx.some((f) => f.k === 'burn' && f.id === ev.id && f.life - f.t > 0.5)) break;
          this.fx.push({ k: 'burn', id: ev.id, t: 0, life: ev.k === 'chill' ? ev.dur : 3, c: ev.k === 'chill' ? '#9ad8ff' : '#ff8a2a' });
          break;
        }
        case 'stunned': this.fx.push({ k: 'stars', id: ev.id, t: 0, life: 0.8 }); break;
        case 'barrier': for (const i of ev.heroes) { this.hv[i].aura = 0.8; this.hv[i].auraColor = '#7ad0ff'; } break;
        case 'dodge': { const p = this.heroPos(B, ev.hero); this.num(p.x + rand(-10, 10), p.y - 40, 'dodge', '#b8c0d8', 11); break; }
        case 'revive': { const p = this.heroPos(B, ev.hero); this.num(p.x, p.y - 50, 'Revived!', '#ffffff', 15, true); this.hv[ev.hero].cast = 0.8; for (let i = 0; i < 24; i++) this.parts.push({ x: p.x + rand(-16, 16), y: p.y + rand(-20, 20), vx: rand(-20, 20), vy: rand(-140, -60), t: 0, life: rand(0.6, 1.1), c: '#ffffff', s: 3 }); sound?.('levelup'); break; }
        case 'fall': { const p = this.heroPos(B, ev.hero); for (let i = 0; i < 18; i++) this.parts.push({ x: p.x, y: p.y, vx: rand(-90, 90), vy: rand(-120, 0), t: 0, life: 0.8, c: '#ff4030', s: 3, g: 200 }); this.shake = 5; sound?.('fall'); break; }
        case 'ability': this.ability(B, ev, byId, sound); break;
        case 'wave': if (ev.boss) { this.banner('BOSS', '#ff3a5a', 1.6, true); sound?.('bossWarn'); this.flash = 0.25; this.flashColor = '#ff2040'; } else if (ev.n > 0) this.banner(`Wave ${ev.n + 1}`, '#ffffff', 0.9); break;
        case 'won': this.banner('Stage clear!', '#ffd34d', 1.4); this.confetti(); sound?.('clear'); break;
        case 'lost': this.banner(ev.timeout ? 'Out of time' : 'Defeated', '#ff6b5e', 1.6); break;
        default: break;
      }
    }
    for (const r of rewards) {
      if (r.k === 'fame') { const e = B.enemies.find((x) => x.id === r.id) || { x: 180, y: 120 }; for (let i = 0; i < Math.min(6, 2 + Math.floor(Math.log10(r.n + 1))); i++) this.coins.push({ x: e.x + rand(-10, 10), y: e.y + rand(-10, 10), vx: rand(-90, 90), vy: rand(-140, -60), t: -i * 0.03, life: 0.95 }); }
      if (r.k === 'drop') {
        const e = [...B.enemies].reverse().find((x) => x.hp <= 0) || { x: 180, y: 140 };
        if (r.salvaged) {
          // auto-salvaged (or the bag was full): it bursts straight into Fame
          for (let i = 0; i < 5; i++) this.coins.push({ x: e.x + rand(-8, 8), y: e.y + rand(-8, 8), vx: rand(-110, 110), vy: rand(-160, -70), t: -i * 0.03, life: 0.95 });
          this.num(e.x, e.y - 40, `+${fmt(r.salvaged)}`, BAL.rarities[r.it.rarity].color, 11);
          sound?.('fame');
          continue;
        }
        this.bags.push({ x: e.x, y: e.y, t: 0, rarity: r.it.rarity, salvaged: r.salvaged, life: r.unique ? (r.exalted ? 3.4 : 2.6) : 1.5, ex: r.exalted });
        if (r.unique) {
          // the white bag: a pillar of light, a flash, and a chime you learn to love
          if (r.exalted) { this.banner('EXALTED!', '#ffe08a', 3, true); this.flash = 0.7; this.flashColor = '#fff2b0'; this.shake = 10; this.confetti(); } else { this.banner('UNIQUE!', '#ffffff', 2.2, true); this.flash = 0.45; this.flashColor = '#ffffff'; this.shake = 6; }
          for (let i = 0; i < 40; i++) { const a = rand(0, TAU), sp = rand(60, 220); this.parts.push({ x: e.x, y: e.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 60, t: 0, life: rand(0.8, 1.6), c: i % 3 ? '#ffffff' : '#6ff2ff', s: rand(2, 3.5), g: 80 }); }
          sound?.(r.exalted ? 'exalted' : 'unique');
        } else sound?.(r.it.rarity >= 3 ? 'lootRare' : 'loot');
      }
    }
  }
  ability(B, ev, byId, sound) {
    const h = B.heroes[ev.hero], C = CLASSES[h.cls], p = this.heroPos(B, ev.hero);
    this.hv[ev.hero].cast = 0.5;
    this.fx.push({ k: 'castring', x: p.x, y: p.y, t: 0, life: 0.45, c: C.shot });
    const ts = (ev.targets || []).map(byId).filter(Boolean);
    sound?.('ability');
    switch (ev.fx) {
      case 'aoe': for (const e of ts) this.fx.push({ k: 'boom', x: e.x, y: e.y, t: 0, life: 0.55, c: '#ff8a3c' }); this.shake = Math.max(this.shake, 5); this.flash = 0.12; this.flashColor = '#ffb070'; break;
      case 'pierce': if (ts.length) { const last = ts[ts.length - 1]; this.fx.push({ k: 'beam', x0: p.x, y0: p.y - 20, x1: last.x + (last.x - p.x) * 0.6, y1: last.y + (last.y - p.y) * 0.6, t: 0, life: 0.35, c: '#ffe08a', w: 6 }); } break;
      case 'execute': for (const e of ts) this.fx.push({ k: 'slash', x: e.x, y: e.y, t: 0, life: 0.4, c: '#e6e6f5' }); this.shake = Math.max(this.shake, 4); break;
      case 'berserk': this.hv[ev.hero].aura = 4; this.hv[ev.hero].auraColor = '#ff4a3a'; break;
      case 'stun': this.fx.push({ k: 'shock', x: p.x, y: p.y - 10, t: 0, life: 0.6, c: '#9ec2ff' }); for (const e of ts) this.fx.push({ k: 'stars', id: e.id, t: 0, life: 2 }); this.shake = Math.max(this.shake, 6); break;
      case 'dot': for (const e of ts) this.fx.push({ k: 'burn', id: e.id, t: 0, life: 4, c: '#ffa040' }); break;
      case 'poison': for (const e of ts) this.fx.push({ k: 'burn', id: e.id, t: 0, life: 5, c: '#7cff4a' }); break;
      case 'drain': for (const e of ts) for (const hi of ev.heroes || []) { const q = this.heroPos(B, hi); this.fx.push({ k: 'stream', x0: e.x, y0: e.y, x1: q.x, y1: q.y - 10, t: 0, life: 0.6, c: '#8fff9f' }); } break;
      case 'heal': for (const hi of ev.heroes || []) { this.hv[hi].aura = 0.8; this.hv[hi].auraColor = '#8fff9f'; } break;
      case 'buff': for (const hi of ev.heroes || []) { this.hv[hi].aura = 5; this.hv[hi].auraColor = '#ffd34d'; } this.flash = 0.1; this.flashColor = '#ffe08a'; break;
      case 'chain': { let from = { x: p.x, y: p.y - 20 }; for (const e of ts) { this.fx.push({ k: 'zap', x0: from.x, y0: from.y, x1: e.x, y1: e.y, t: 0, life: 0.35, c: '#5de0ff' }); from = e; } this.flash = 0.08; this.flashColor = '#bff3ff'; break; }
      default: break;
    }
  }
  num(x, y, text, c, size, pop) { this.nums.push({ x, y, text, c, size, t: 0, pop }); if (this.nums.length > 40) this.nums.shift(); }
  banner(text, c, life, big) { this.banners.push({ text, c, t: 0, life, big }); }
  confetti() { const cs = ['#ffd34d', '#ff6b9d', '#5de0ff', '#8fff9f', '#b05cff']; for (let i = 0; i < 70; i++) this.parts.push({ x: rand(40, 320), y: rand(-20, 40), vx: rand(-40, 40), vy: rand(40, 160), t: 0, life: rand(1, 1.8), c: cs[i % 5], s: rand(2, 3.5), rot: rand(0, TAU), conf: true }); }

  /** Draw a frame. dt in seconds. coinTarget: world point the Fame coins fly to. */
  render(B, dt, coinTarget, bagTarget) {
    this.t += dt;
    const g = this.g;
    g.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    const r = this.cv.getBoundingClientRect();
    g.fillStyle = '#0b0910'; g.fillRect(0, 0, r.width, r.height);
    const sx = (Math.random() - 0.5) * this.shake, sy = (Math.random() - 0.5) * this.shake;
    this.shake = Math.max(0, this.shake - dt * 30);
    g.setTransform(this.dpr * this.scale, 0, 0, this.dpr * this.scale, this.dpr * (this.ox + sx), this.dpr * (this.oy + sy));
    const Z = zoneOf(B.stage);
    g.imageSmoothingEnabled = true;
    g.drawImage(backdrop(Z.id), 0, 0, VW, VH);
    // ambient motes
    for (const m of this.motes) {
      m.y -= m.v * dt; m.x += Math.sin(this.t + m.p) * 6 * dt;
      if (m.y < -4) { m.y = VH + 4; m.x = rand(0, VW); }
      g.globalAlpha = 0.25 + 0.2 * Math.sin(this.t * 2 + m.p); g.fillStyle = '#fffbe0'; g.fillRect(m.x, m.y, m.s, m.s);
    }
    g.globalAlpha = 1;

    // enemies
    const stunned = new Set(this.fx.filter((f) => f.k === 'stars').map((f) => f.id));
    for (const e of B.enemies) {
      const v = this.enemyVis(e);
      if (v.dead) v.dead += dt;
      if (v.dead > 0.45) continue;
      v.flash = Math.max(0, v.flash - dt); v.ky *= 0.8;
      const img = monsterImage(e.sprite, e.pal);
      if (!ready(img)) continue;
      const size = e.boss ? BOSS_SIZE : ENEMY_SIZE, feet = e.y + (e.boss ? 70 : 40);
      const appear = Math.min(1, (this.t - v.born) / 0.4);
      const breathe = 1 + Math.sin(this.t * 2.2 + v.ph) * 0.018, hitSq = v.flash > 0 ? 0.93 : 1;
      const x = e.x, w = size * (hitSq > 0 ? 1 / Math.sqrt(hitSq) : 1), hh = size * breathe * hitSq;
      g.fillStyle = 'rgba(0,0,0,.35)'; g.beginPath(); g.ellipse(x, feet - 2, size * 0.28, size * 0.05, 0, 0, TAU); g.fill();
      if (e.boss) { g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.22 + 0.1 * Math.sin(this.t * 3); g.drawImage(glow('#ff3a5a', 90), x - 90, feet - size * 0.55 - 90); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; }
      const dk = v.dead ? 1 + v.dead * 0.8 : 1;
      g.globalAlpha = (v.dead ? Math.max(0, 1 - v.dead / 0.45) : 1) * appear;
      const top = feet - hh * dk - (1 - appear) * 24 + v.ky;
      g.drawImage(img.bmp, x - (w * dk) / 2, top, w * dk, hh * dk);
      if (v.flash > 0) { g.globalAlpha = Math.min(1, v.flash * 7) * 0.85; g.drawImage(tinted(img, '#ffffff'), x - (w * dk) / 2, top, w * dk, hh * dk); }
      g.globalAlpha = 1;
      if (!v.dead && !e.boss) bar(g, x - 20, feet + 4, 40, 4, e.hp / e.maxHp, '#e0483e');
      if (stunned.has(e.id) && !v.dead) for (let k = 0; k < 3; k++) { const a = this.t * 4 + (k * TAU) / 3; star(g, x + Math.cos(a) * 18, top - 4 + Math.sin(a) * 4, '#ffe08a'); }
    }
    for (const id of [...this.ev.keys()]) if (!B.enemies.some((e) => e.id === id)) this.ev.delete(id);

    // party
    B.heroes.forEach((h, i) => {
      const v = this.hv[i], C = CLASSES[h.cls], p = this.heroPos(B, i);
      v.lunge = Math.max(0, v.lunge - dt * 7); v.hurt = Math.max(0, v.hurt - dt); v.aura = Math.max(0, v.aura - dt); v.cast = Math.max(0, v.cast - dt);
      g.fillStyle = 'rgba(0,0,0,.3)'; g.beginPath(); g.ellipse(p.x, HERO_POS[i].y + 24, 18, 5, 0, 0, TAU); g.fill();
      if (h.dead) { g.globalAlpha = 0.35; }
      if (v.aura > 0 || v.cast > 0) { g.globalCompositeOperation = 'lighter'; g.globalAlpha = Math.min(1, v.aura + v.cast) * (0.5 + 0.2 * Math.sin(this.t * 10)); g.drawImage(glow(v.cast > 0 ? C.shot : v.auraColor, 40), p.x - 40, p.y - 44); g.globalAlpha = h.dead ? 0.35 : 1; g.globalCompositeOperation = 'source-over'; }
      const rar = h.gearRarity ?? 0;
      if (rar >= 3 && !h.dead) { g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.25 + 0.1 * Math.sin(this.t * 2 + i); g.drawImage(glow(BAL.rarities[rar].color, 40), p.x - 40, p.y - 52); g.globalAlpha = h.dead ? 0.35 : 1; g.globalCompositeOperation = 'source-over'; }
      const gem = h.weaponRarity >= 0 ? RARITY_SHADES[h.weaponRarity][1] : null;
      const img = heroImage(h.cls, true, gem);
      if (ready(img)) {
        const breathe = 1 + Math.sin(this.t * 2.4 + i * 1.3) * 0.015, H = HERO_H * breathe, W = HERO_H * (200 / 260);
        const feet = HERO_POS[i].y + 34 - v.lunge * 9;
        g.save(); g.translate(p.x, feet); g.rotate((v.lunge * (i === 2 ? -1 : 1)) * 0.06);
        g.drawImage(img.bmp, -W / 2, -H, W, H);
        if (v.hurt > 0) { g.globalAlpha = Math.min(1, v.hurt * 4) * 0.7; g.drawImage(tinted(img, '#ff2a2a'), -W / 2, -H, W, H); }
        g.restore();
      }
      g.globalAlpha = 1;
      if (!h.dead) {
        bar(g, p.x - 20, HERO_POS[i].y + 30, 40, 5, h.hp / h.maxHp, h.hp / h.maxHp > 0.5 ? '#3fbf5c' : h.hp / h.maxHp > 0.25 ? '#e8b928' : '#e0483e');
        const cd = Math.max(0, h.cd) / C.ability.cd;
        bar(g, p.x - 20, HERO_POS[i].y + 36, 40, 2, 1 - cd, cd <= 0.02 ? '#ffd34d' : '#3d7fe0');
      } else { g.fillStyle = '#ff6b5e'; g.font = '700 9px Nunito, sans-serif'; g.textAlign = 'center'; g.fillText('down', p.x, HERO_POS[i].y + 36); }
    });

    // effects
    this.fx = this.fx.filter((f) => (f.t += dt) < f.life);
    g.globalCompositeOperation = 'lighter';
    for (const f of this.fx) this.drawFx(g, f, B);
    g.globalCompositeOperation = 'source-over';
    // particles
    this.parts = this.parts.filter((p) => (p.t += dt) < p.life);
    for (const p of this.parts) {
      p.vy += (p.g || 0) * dt; p.x += p.vx * dt; p.y += p.vy * dt; if (!p.conf) { p.vx *= 0.96; p.vy *= p.g ? 1 : 0.96; }
      g.globalAlpha = 1 - p.t / p.life; g.fillStyle = p.c;
      if (p.conf) { g.save(); g.translate(p.x, p.y); g.rotate(p.rot + p.t * 6); g.fillRect(-p.s, -p.s / 2, p.s * 2, p.s); g.restore(); } else g.fillRect(p.x - p.s / 2, p.y - p.s / 2, p.s, p.s);
    }
    g.globalAlpha = 1;
    // loot bags pop out, sparkle, then fly to the bag counter
    this.bags = this.bags.filter((b) => (b.t += dt) < (b.life || 1.5));
    for (const b of this.bags) {
      const L = b.life || 1.5, R = BAL.rarities[b.rarity], q = Math.max(0, (b.t - (L - 0.7)) / 0.7);
      const x = b.x + (bagTarget.x - b.x) * easeIn(q), y = b.y + 20 - Math.sin(Math.min(1, b.t / 0.4) * Math.PI) * 26 + (bagTarget.y - b.y - 20) * easeIn(q);
      if (b.rarity >= 2) { g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.6; g.drawImage(glow(R.color, 30), x - 30, y - 30); if (b.rarity >= 4 && b.t < L - 0.7) { const w = b.rarity === 6 ? (b.ex ? 26 : 14) + 4 * Math.sin(b.t * 12) : 6; g.fillStyle = b.ex ? '#ffe08a' : R.color; g.globalAlpha = b.rarity === 6 ? 0.55 : 0.35; g.fillRect(x - w / 2, 0, w, y); } g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; }
      const bag = itemImage('bag', b.rarity, b.ex ? EXALT_PAL : null);
      g.globalAlpha = 1 - q * 0.6; if (ready(bag)) g.drawImage(bag.bmp, x - 15, y - 15, 30, 30); g.globalAlpha = 1;
    }
    // fame coins burst, then fly to the counter
    this.coins = this.coins.filter((c) => (c.t += dt) < c.life);
    for (const c of this.coins) {
      if (c.t < 0) continue;
      const q = Math.max(0, (c.t - 0.35) / (c.life - 0.35));
      if (q === 0) { c.x += c.vx * dt; c.y += c.vy * dt; c.vy += 300 * dt; c.vx *= 0.94; }
      const x = c.x + (coinTarget.x - c.x) * easeIn(q), y = c.y + (coinTarget.y - c.y) * easeIn(q);
      g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.5; g.drawImage(glow('#ffc23a', 8), x - 8, y - 8); g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;
      g.fillStyle = '#ffd34d'; g.fillRect(Math.round(x - 2), Math.round(y - 2), 4, 4); g.fillStyle = '#fff6c0'; g.fillRect(Math.round(x - 1), Math.round(y - 2), 2, 1);
    }
    // numbers
    this.nums = this.nums.filter((n) => (n.t += dt) < 0.9);
    g.textAlign = 'center';
    for (const n of this.nums) {
      const pop = n.t < 0.12 ? 1 + (n.pop ? 0.8 : 0.4) * (1 - n.t / 0.12) : 1;
      g.globalAlpha = Math.min(1, (0.9 - n.t) * 3);
      g.font = `900 ${Math.round(n.size * pop)}px Nunito, sans-serif`;
      const y = n.y - n.t * 26;
      g.lineWidth = 3; g.strokeStyle = 'rgba(0,0,0,.75)'; g.strokeText(n.text, n.x, y); g.fillStyle = n.c; g.fillText(n.text, n.x, y);
    }
    g.globalAlpha = 1;
    // boss bar
    const boss = B.enemies.find((e) => e.boss && e.hp > 0);
    if (boss) {
      g.font = '800 11px Nunito, sans-serif'; g.textAlign = 'center'; g.lineWidth = 3; g.strokeStyle = '#000'; g.strokeText(boss.name, VW / 2, 16); g.fillStyle = '#ffd0d8'; g.fillText(boss.name, VW / 2, 16);
      bar(g, 50, 21, VW - 100, 7, boss.hp / boss.maxHp, '#e0304a');
    }
    // banners
    this.banners = this.banners.filter((b) => (b.t += dt) < b.life);
    for (const b of this.banners) {
      const inT = Math.min(1, b.t / 0.18), out = Math.min(1, (b.life - b.t) / 0.3);
      g.globalAlpha = Math.min(inT, out);
      const s = (b.big ? 34 : 24) * (1 + (1 - inT) * 0.6);
      g.font = `900 ${Math.round(s)}px Cinzel, Georgia, serif`; g.textAlign = 'center';
      g.lineWidth = 6; g.strokeStyle = 'rgba(0,0,0,.8)'; g.strokeText(b.text, VW / 2, 215); g.fillStyle = b.c; g.fillText(b.text, VW / 2, 215);
    }
    g.globalAlpha = 1;
    if (this.flash > 0) { g.fillStyle = this.flashColor; g.globalAlpha = Math.min(0.5, this.flash); g.fillRect(-20, -20, VW + 40, VH + 40); g.globalAlpha = 1; this.flash -= dt * 1.6; }
  }

  drawFx(g, f, B) {
    const p = f.t / f.life;
    switch (f.k) {
      case 'bolt': {
        const e = B.enemies.find((x) => x.id === f.id) || { x: f.x1 ?? 180, y: f.y1 ?? 100 };
        f.x1 = e.x; f.y1 = e.y;
        const x = f.x0 + (e.x - f.x0) * p, y = f.y0 + (e.y - f.y0) * p, ang = Math.atan2(e.y - f.y0, e.x - f.x0);
        if (f.w === 'bow' || f.w === 'dagger') {
          // arrows and thrown blades: a bright streak with a glint at the tip
          const len = (f.w === 'bow' ? 26 : 14) * (f.big ? 1.6 : 1);
          g.globalAlpha = 0.5; g.strokeStyle = f.c; g.lineWidth = (f.crit ? 5 : 3) * (f.big ? 2 : 1); g.lineCap = 'round';
          g.beginPath(); g.moveTo(x - Math.cos(ang) * len * 1.8, y - Math.sin(ang) * len * 1.8); g.lineTo(x, y); g.stroke();
          g.globalAlpha = 1; g.strokeStyle = '#ffffff'; g.lineWidth = 1.6;
          g.beginPath(); g.moveTo(x - Math.cos(ang) * len, y - Math.sin(ang) * len); g.lineTo(x, y); g.stroke();
          g.drawImage(glow(f.c, 8), x - 8, y - 8);
        } else if (f.w === 'sword') {
          // a crescent of force
          g.save(); g.translate(x, y); g.rotate(ang + Math.PI / 2);
          if (f.big) g.scale(1.7, 1.7);
          g.globalAlpha = 0.9; g.strokeStyle = f.c; g.lineWidth = f.crit ? 5 : 3.5;
          g.beginPath(); g.arc(0, 8, f.crit ? 18 : 14, Math.PI * 1.15, Math.PI * 1.85); g.stroke();
          g.globalAlpha = 0.5; g.lineWidth = 9; g.beginPath(); g.arc(0, 8, f.crit ? 18 : 14, Math.PI * 1.2, Math.PI * 1.8); g.stroke();
          g.restore();
        } else {
          const r = (f.crit ? 15 : 11) * (f.big ? 1.8 : 1), wob = f.w === 'staff' && !f.big ? Math.sin(p * 9) * 6 : 0;
          for (let k = 1; k <= 4; k++) { const q = Math.max(0, p - k * 0.05); g.globalAlpha = 0.4 / k; g.drawImage(glow(f.c, r), f.x0 + (e.x - f.x0) * q - r + wob, f.y0 + (e.y - f.y0) * q - r); }
          g.globalAlpha = 1; g.drawImage(glow(f.c, r), x - r + wob, y - r);
          g.fillStyle = '#ffffff'; g.beginPath(); g.arc(x + wob, y, 2.2, 0, TAU); g.fill();
        }
        break;
      }
      case 'ebolt': {
        const x = f.x0 + (f.x1 - f.x0) * p, y = f.y0 + (f.y1 - f.y0) * p;
        g.globalAlpha = 0.9; g.drawImage(glow(f.c, f.r * 2.4), x - f.r * 2.4, y - f.r * 2.4);
        g.globalCompositeOperation = 'source-over'; g.fillStyle = f.c; g.beginPath(); g.arc(x, y, f.r, 0, TAU); g.fill(); g.fillStyle = '#fff'; g.beginPath(); g.arc(x, y, f.r * 0.45, 0, TAU); g.fill(); g.globalCompositeOperation = 'lighter';
        break;
      }
      case 'pbullet': {
        const a = Math.atan2(f.vy, f.vx) + f.spin * f.t, sp = Math.hypot(f.vx, f.vy);
        const x = f.x + Math.cos(a) * sp * f.t, y = f.y + Math.sin(a) * sp * f.t;
        g.globalAlpha = 1 - p * 0.5; g.drawImage(glow(f.c, 12), x - 12, y - 12);
        g.globalCompositeOperation = 'source-over'; g.fillStyle = f.c; g.beginPath(); g.arc(x, y, 5, 0, TAU); g.fill(); g.fillStyle = '#fff'; g.beginPath(); g.arc(x, y, 2, 0, TAU); g.fill(); g.globalCompositeOperation = 'lighter';
        break;
      }
      case 'ringwave': case 'castring': case 'shock': {
        g.globalAlpha = 1 - p; g.strokeStyle = f.c; g.lineWidth = f.k === 'shock' ? 6 : 3;
        g.beginPath(); g.arc(f.x, f.y, (f.k === 'castring' ? 14 : 20) + p * (f.k === 'shock' ? 240 : f.k === 'castring' ? 30 : 120), 0, TAU); g.stroke();
        break;
      }
      case 'boom': {
        g.globalAlpha = 1 - p; const r = (20 + p * 46) * (f.big ? 1.5 : 1); g.drawImage(glow(f.c, r), f.x - r, f.y - r);
        if (p < 0.3) { g.drawImage(glow('#fff2c0', 18), f.x - 18, f.y - 18); }
        break;
      }
      case 'beam': case 'zap': case 'stream': {
        g.globalAlpha = 1 - p; g.strokeStyle = f.c; g.lineWidth = f.k === 'beam' ? f.w * (1 - p) + 1 : 2.5;
        g.beginPath(); g.moveTo(f.x0, f.y0);
        if (f.k === 'zap') { for (let z = 1; z <= 6; z++) g.lineTo(f.x0 + ((f.x1 - f.x0) * z) / 6 + (z < 6 ? rand(-9, 9) : 0), f.y0 + ((f.y1 - f.y0) * z) / 6 + (z < 6 ? rand(-9, 9) : 0)); }
        else if (f.k === 'stream') { const q = Math.min(1, p * 1.6); g.lineTo(f.x0 + (f.x1 - f.x0) * q, f.y0 + (f.y1 - f.y0) * q); }
        else g.lineTo(f.x1, f.y1);
        g.stroke();
        break;
      }
      case 'slash': {
        g.globalAlpha = 1 - p; g.strokeStyle = f.c; g.lineWidth = 4;
        g.beginPath(); g.moveTo(f.x - 26 + p * 10, f.y - 22); g.lineTo(f.x + 26 - p * 10, f.y + 22); g.stroke();
        g.beginPath(); g.moveTo(f.x + 26 - p * 10, f.y - 22); g.lineTo(f.x - 26 + p * 10, f.y + 22); g.stroke();
        break;
      }
      case 'burn': {
        const e = B.enemies.find((x) => x.id === f.id && x.hp > 0); if (!e) { f.t = f.life; break; }
        g.globalAlpha = 0.5 + 0.3 * Math.sin(f.t * 12); g.drawImage(glow(f.c, 24), e.x - 24, e.y - 10);
        if (Math.random() < 0.3) this.parts.push({ x: e.x + rand(-12, 12), y: e.y + rand(-4, 10), vx: 0, vy: rand(-50, -25), t: 0, life: 0.5, c: f.c, s: 2.5 });
        break;
      }
      default: break;
    }
    g.globalAlpha = 1;
  }
}

function bar(g, x, y, w, h, f, c) {
  g.fillStyle = 'rgba(0,0,0,.65)'; g.fillRect(x - 1, y - 1, w + 2, h + 2);
  g.fillStyle = '#2a1416'; g.fillRect(x, y, w, h);
  g.fillStyle = c; g.fillRect(x, y, Math.max(0, Math.min(1, f)) * w, h);
  g.fillStyle = 'rgba(255,255,255,.25)'; g.fillRect(x, y, Math.max(0, Math.min(1, f)) * w, Math.max(1, h / 3));
}
function star(g, x, y, c) { g.fillStyle = c; g.fillRect(x - 1, y - 3, 2, 6); g.fillRect(x - 3, y - 1, 6, 2); }
const easeIn = (q) => q * q;
export function fmt(n) {
  if (n < 1000) return String(Math.round(n));
  const u = ['K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No', 'Dc'];
  let i = -1; while (n >= 1000 && i < u.length - 1) { n /= 1000; i++; }
  return `${n < 10 ? n.toFixed(2) : n < 100 ? n.toFixed(1) : Math.round(n)}${u[i]}`;
}
