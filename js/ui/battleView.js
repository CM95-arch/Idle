// Draws the live battle on a canvas: zone backdrop, party, enemies, projectiles, ability effects, numbers, loot.
// It only reads the simulation (core/battle.js) and reacts to its events; it never changes the game.
import { CLASSES } from '../data/classes.js';
import { zoneOf } from '../data/zones.js';
import { BAL } from '../data/balance.js';
import { draw, mapSize, heroCanvas, itemColors } from './sprites.js';

export const VW = 360, VH = 430;
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
// zone backdrop, painted once per zone
const bgCache = new Map();
function backdrop(Z) {
  if (bgCache.has(Z.id)) return bgCache.get(Z.id);
  const cv = document.createElement('canvas'); cv.width = VW; cv.height = VH;
  const g = cv.getContext('2d');
  const sky = g.createLinearGradient(0, 0, 0, VH);
  sky.addColorStop(0, Z.bg[2]); sky.addColorStop(0.45, Z.bg[1]); sky.addColorStop(1, Z.bg[0]);
  g.fillStyle = sky; g.fillRect(0, 0, VW, VH);
  // checker floor tiles, like the Realm's ground
  let seed = Z.id.length * 977;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let y = 0; y < VH; y += 20) for (let x = 0; x < VW; x += 20) {
    g.fillStyle = `rgba(${rnd() < 0.5 ? '255,255,255' : '0,0,0'},${0.03 + rnd() * 0.05})`;
    g.fillRect(x, y, 20, 20);
  }
  for (let i = 0; i < 14; i++) {
    const m = Z.deco[i % Z.deco.length], sc = 3, cvs = draw(m, sc, { a: shade(Z.ground, -30), b: shade(Z.ground, 25), c: Z.bg[2], d: shade(Z.ground, -60) });
    const x = rnd() * (VW - 30), y = 20 + rnd() * (VH - 60);
    if (Math.abs(x - 180) < 120 && y > 260) continue; // keep the party clear
    g.globalAlpha = 0.55; g.drawImage(cvs, Math.round(x), Math.round(y)); g.globalAlpha = 1;
  }
  const vig = g.createRadialGradient(VW / 2, VH / 2, VH * 0.25, VW / 2, VH / 2, VH * 0.75);
  vig.addColorStop(0, 'rgba(0,0,0,0)'); vig.addColorStop(1, 'rgba(0,0,0,0.45)');
  g.fillStyle = vig; g.fillRect(0, 0, VW, VH);
  bgCache.set(Z.id, cv);
  return cv;
}
function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16), c = (v) => Math.max(0, Math.min(255, v + amt));
  return `#${((c(n >> 16) << 16) | (c((n >> 8) & 255) << 8) | c(n & 255)).toString(16).padStart(6, '0')}`;
}

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
    const r = this.cv.getBoundingClientRect(), dpr = Math.min(3, window.devicePixelRatio || 1);
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
          this.hv[ev.hero].lunge = 1;
          this.fx.push({ k: 'bolt', x0: p.x, y0: p.y - 18, id: e.id, t: 0, life: ev.flight, c: C.shot, crit: ev.crit, w: C.weapon });
          sound?.(C.weapon);
          break;
        }
        case 'hit': {
          const e = byId(ev.id); if (!e) break;
          const v = this.enemyVis(e); v.flash = 0.12; v.ky = -3;
          this.num(e.x + rand(-12, 12), e.y - 26, fmt(ev.dmg), ev.crit ? '#ffd34d' : ev.ab ? '#ffb070' : '#ffffff', ev.crit ? 15 : ev.ab ? 13 : 11, ev.crit);
          if (ev.crit) this.shake = Math.max(this.shake, 2);
          for (let i = 0; i < (ev.crit ? 8 : 4); i++) this.parts.push({ x: e.x, y: e.y, vx: rand(-80, 80), vy: rand(-90, 30), t: 0, life: rand(0.25, 0.5), c: ev.crit ? '#ffd34d' : '#ffffff', s: rand(1.5, 3) });
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
          this.num(p.x + rand(-10, 10), p.y - 40, fmt(ev.dmg), '#ff6b5e', ev.big ? 13 : 11);
          if (ev.big) this.shake = Math.max(this.shake, 6);
          sound?.('hurt');
          break;
        }
        case 'heal': { const p = this.heroPos(B, ev.hero); this.num(p.x, p.y - 44, `+${fmt(ev.amt)}`, '#6cff8a', 12); for (let i = 0; i < 8; i++) this.parts.push({ x: p.x + rand(-14, 14), y: p.y + rand(-10, 10), vx: 0, vy: rand(-60, -30), t: 0, life: rand(0.5, 0.9), c: '#8fff9f', s: 2.5 }); break; }
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
        this.bags.push({ x: e.x, y: e.y, t: 0, rarity: r.it.rarity, salvaged: r.salvaged });
        sound?.(r.it.rarity >= 3 ? 'lootRare' : 'loot');
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
    g.imageSmoothingEnabled = false;
    const Z = zoneOf(B.stage);
    g.drawImage(backdrop(Z), 0, 0);
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
      const sc = e.boss ? 6 : 4, cv = draw(e.sprite, sc, e.pal), { w, h } = mapSize(e.sprite);
      const appear = Math.min(1, (this.t - v.born) / 0.35);
      const bob = Math.sin(this.t * 2 + v.ph) * (e.boss ? 3 : 2);
      const x = e.x, y = e.y + bob + v.ky - (1 - appear) * 30;
      // shadow
      g.fillStyle = 'rgba(0,0,0,.28)'; g.beginPath(); g.ellipse(x, e.y + (h * sc) / 2 + 2, (w * sc) / 2.4, 5, 0, 0, TAU); g.fill();
      if (e.boss) { g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.35 + 0.15 * Math.sin(this.t * 3); g.drawImage(glow('#ff3a5a', 70), x - 70, y - 70); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; }
      const dScale = v.dead ? 1 + v.dead * 1.2 : 1;
      g.globalAlpha = (v.dead ? 1 - v.dead / 0.45 : 1) * appear;
      g.drawImage(cv, Math.round(x - (w * sc * dScale) / 2), Math.round(y - (h * sc * dScale) / 2), w * sc * dScale, h * sc * dScale);
      if (v.flash > 0) { g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.8; g.drawImage(cv, Math.round(x - (w * sc) / 2), Math.round(y - (h * sc) / 2)); g.globalCompositeOperation = 'source-over'; }
      g.globalAlpha = 1;
      if (!v.dead && !e.boss) bar(g, x - 18, y + (h * sc) / 2 + 5, 36, 4, e.hp / e.maxHp, '#e0483e');
      if (stunned.has(e.id) && !v.dead) for (let k = 0; k < 3; k++) { const a = this.t * 4 + (k * TAU) / 3; star(g, x + Math.cos(a) * 16, y - (h * sc) / 2 - 6 + Math.sin(a) * 4, '#ffe08a'); }
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
      if (rar >= 3 && !h.dead) { g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.25 + 0.1 * Math.sin(this.t * 2 + i); g.drawImage(glow(BAL.rarities[rar].color, 34), p.x - 34, p.y - 38); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; }
      const cv = heroCanvas(C.look, C.colors, true, 4);
      g.drawImage(cv, Math.round(p.x - cv.width / 2), Math.round(p.y - cv.height / 2));
      if (v.hurt > 0) { g.globalCompositeOperation = 'lighter'; g.globalAlpha = v.hurt * 3; g.drawImage(draw(`${C.look}_b`, 4, { a: '#ff2020', b: '#ff4040', c: '#ff6060', d: '#ff2020', e: '#ff4040', k: '#ff0000', o: '#400000' }), Math.round(p.x - cv.width / 2), Math.round(p.y - cv.height / 2)); g.globalCompositeOperation = 'source-over'; }
      // weapon, colored by its rarity
      const wcv = draw(C.weapon, 2, h.weaponRarity >= 0 ? itemColors({ kind: C.weapon, rarity: h.weaponRarity }) : { a: '#6a5a4a', b: '#9a8a7a', c: '#c0b0a0' });
      g.drawImage(wcv, Math.round(p.x + 10), Math.round(p.y - 14 - v.lunge * 4));
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
    this.bags = this.bags.filter((b) => (b.t += dt) < 1.5);
    for (const b of this.bags) {
      const R = BAL.rarities[b.rarity], q = Math.max(0, (b.t - 0.8) / 0.7);
      const x = b.x + (bagTarget.x - b.x) * easeIn(q), y = b.y + 20 - Math.sin(Math.min(1, b.t / 0.4) * Math.PI) * 26 + (bagTarget.y - b.y - 20) * easeIn(q);
      if (b.rarity >= 2) { g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.6; g.drawImage(glow(R.color, 30), x - 30, y - 30); if (b.rarity >= 4 && b.t < 0.8) { g.fillStyle = R.color; g.globalAlpha = 0.35; g.fillRect(x - 3, 0, 6, y); } g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; }
      const cv = draw('bag', 3, { a: R.color, b: shade(R.color, 50) });
      g.globalAlpha = 1 - q * 0.6; g.drawImage(cv, Math.round(x - cv.width / 2), Math.round(y - cv.height / 2)); g.globalAlpha = 1;
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
      g.font = `900 ${Math.round(s)}px 'Pixelify Sans', Nunito, sans-serif`; g.textAlign = 'center';
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
        const x = f.x0 + (e.x - f.x0) * p, y = f.y0 + (e.y - f.y0) * p, r = f.crit ? 14 : 10;
        const wob = f.w === 'staff' ? Math.sin(p * 9) * 6 : 0;
        for (let k = 1; k <= 3; k++) { const q = Math.max(0, p - k * 0.06); g.globalAlpha = 0.35 / k; g.drawImage(glow(f.c, r), f.x0 + (e.x - f.x0) * q - r + wob, f.y0 + (e.y - f.y0) * q - r); }
        g.globalAlpha = 1; g.drawImage(glow(f.c, r), x - r + wob, y - r);
        g.fillStyle = '#ffffff'; g.fillRect(x - 1.5 + wob, y - 1.5, 3, 3);
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
        g.globalAlpha = 1 - p; const r = 20 + p * 46; g.drawImage(glow(f.c, r), f.x - r, f.y - r);
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
