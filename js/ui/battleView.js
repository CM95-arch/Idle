// Draws the live horde battle on a canvas, seen from above at a three-quarter angle: the zone's battlefield, the
// party holding the middle on glowing rings, the horde streaming in, tracers, blasts, splats, numbers and loot.
// It only reads the simulation (core/battle.js) and reacts to its events; it never changes the game.
import { CLASSES } from '../data/classes.js';
import { zoneOf, stageLabel } from '../data/zones.js';
import { BAL } from '../data/balance.js';
import { chibiImage } from './art/chibi.js';
import { monsterImage } from './art/monsters.js';
import { itemImage, RARITY_SHADES } from './art/items.js';
import { arena } from './art/arena.js';
import { ready } from './art/core.js';

export const VW = 360, VH = 430;
const MOD_COLOR = { chain: '#7ae8ff', burn: '#ff8a2a', chill: '#bfe8ff' };
const EXALT_PAL = ['#a07a20', '#fff3c0', '#ffffff'];
const TAU = Math.PI * 2;
const rand = (a, b) => a + Math.random() * (b - a);
const HERO_W = 70, HERO_H = 76; // the chibi art is a 120×130 box
// ambient particles per biome: how many, and how each one starts (`fresh` = anywhere, else at its source)
const rnd = (a, b) => a + Math.random() * (b - a);
const AMBIENT = {
  beach: { n: 14, twinkle: 3, spawn: (f) => ({ x: f ? rnd(0, 360) : -10, y: rnd(20, 140), vx: rnd(10, 22), vy: rnd(-2, 2), r: rnd(1.2, 2.4), c: '#bfefff', core: '#ffffff', a: 0.55, t: 0, life: rnd(8, 16), ph: rnd(0, 6) }) },
  lowlands: { n: 16, wander: true, twinkle: 4, spawn: () => ({ x: rnd(0, 360), y: rnd(60, 420), vx: rnd(-6, 6), vy: rnd(-6, 6), r: rnd(1.6, 2.6), c: '#d8ff6a', core: '#ffffe0', a: 0.8, t: 0, life: rnd(4, 9), ph: rnd(0, 6) }) },
  midlands: { n: 16, wander: true, twinkle: 4, spawn: () => ({ x: rnd(0, 360), y: rnd(60, 420), vx: rnd(-6, 6), vy: rnd(-6, 6), r: rnd(1.6, 2.6), c: '#6affc0', core: '#e0fff4', a: 0.8, t: 0, life: rnd(4, 9), ph: rnd(0, 6) }) },
  highlands: { n: 18, spawn: (f) => ({ x: f ? rnd(0, 360) : -10, y: rnd(0, 430), vx: rnd(6, 14), vy: rnd(-3, 3), r: rnd(1.5, 3.5), c: '#c8d0e0', a: 0.18, t: 0, life: rnd(10, 20), ph: rnd(0, 6) }) },
  godlands: { n: 18, twinkle: 5, spawn: () => ({ x: rnd(0, 360), y: rnd(0, 430), vx: rnd(-3, 3), vy: rnd(-8, -2), r: rnd(1.2, 2.4), c: '#d8a0ff', core: '#ffffff', a: 0.75, t: 0, life: rnd(3, 7), ph: rnd(0, 6) }) },
  approach: { n: 20, spawn: (f) => ({ x: rnd(0, 360), y: f ? rnd(0, 430) : 440, vx: rnd(-6, 6), vy: rnd(-34, -16), r: rnd(1, 2), c: '#ff8a3a', core: '#fff0c0', a: 0.75, t: 0, life: rnd(5, 12), ph: rnd(0, 6) }) },
  castle: { n: 22, spawn: (f) => ({ x: rnd(0, 360), y: f ? rnd(0, 430) : 440, vx: rnd(-6, 6), vy: rnd(-30, -14), r: rnd(1, 2.2), c: Math.random() < 0.5 ? '#ff5a2a' : '#c06aff', core: '#fff0e0', a: 0.75, t: 0, life: rnd(5, 12), ph: rnd(0, 6) }) },
  halls: { n: 16, twinkle: 2, spawn: (f) => ({ x: rnd(0, 360), y: f ? rnd(0, 430) : 440, vx: rnd(-3, 3), vy: rnd(-12, -5), r: rnd(1.4, 2.6), c: '#8ad8ff', core: '#ffffff', a: 0.6, t: 0, life: rnd(8, 16), ph: rnd(0, 6) }) },
  shatters: { n: 22, wander: true, twinkle: 3, spawn: (f) => ({ x: rnd(0, 360), y: f ? rnd(0, 430) : 440, vx: rnd(-5, 5), vy: rnd(-16, -6), r: rnd(1.4, 3), c: '#a05aff', core: '#f0e0ff', a: 0.7, t: 0, life: rnd(6, 12), ph: rnd(0, 6) }) },
};
// the dungeons' air: snow, bubbles, and the Realm's own styles where they fit
Object.assign(AMBIENT, {
  ice: { n: 26, spawn: (f) => ({ x: rnd(-20, 360), y: f ? rnd(0, 430) : -10, vx: rnd(4, 12), vy: rnd(14, 30), r: rnd(1, 2.4), c: '#ffffff', a: 0.7, t: 0, life: rnd(10, 20), ph: rnd(0, 6) }) },
  trench: { n: 18, spawn: (f) => ({ x: rnd(0, 360), y: f ? rnd(0, 430) : 440, vx: rnd(-3, 3), vy: rnd(-24, -10), r: rnd(1.2, 3), c: '#9ae8ff', core: '#ffffff', a: 0.45, t: 0, life: rnd(8, 16), ph: rnd(0, 6) }) },
});
Object.assign(AMBIENT, { cave: AMBIENT.highlands, crypt: AMBIENT.midlands, abyss: AMBIENT.approach, lab: AMBIENT.halls, sewer: AMBIENT.lowlands, docks: AMBIENT.trench, sprite: AMBIENT.godlands, tomb: AMBIENT.highlands, temple: AMBIENT.lowlands });
const sizeOf = (e) => (e.boss ? 120 : e.elite ? 54 : 42);

// soft round glow sprites, cached per color
const glowCache = new Map();
function glow(color, r) {
  const k = `${color}|${r}`;
  if (glowCache.has(k)) return glowCache.get(k);
  const cv = document.createElement('canvas'); cv.width = cv.height = r * 2;
  const g = cv.getContext('2d'), gr = g.createRadialGradient(r, r, 0, r, r, r);
  gr.addColorStop(0, color); gr.addColorStop(0.35, `${color}aa`); gr.addColorStop(1, `${color}00`);
  g.fillStyle = gr; g.fillRect(0, 0, r * 2, r * 2);
  glowCache.set(k, cv);
  return cv;
}
// a solid-color copy of an image, for hit flashes
const tintCache = new Map();
function tinted(art, color) {
  const k = `${art.key}|${color}`;
  if (tintCache.has(k)) return tintCache.get(k);
  const cv = document.createElement('canvas'); cv.width = art.bmp.width; cv.height = art.bmp.height;
  const g = cv.getContext('2d'); g.drawImage(art.bmp, 0, 0); g.globalCompositeOperation = 'source-atop'; g.fillStyle = color; g.fillRect(0, 0, cv.width, cv.height);
  tintCache.set(k, cv);
  return cv;
}

export class BattleView {
  constructor(canvas) {
    this.cv = canvas; this.g = canvas.getContext('2d');
    this.t = 0; this.shake = 0; this.flash = 0; this.flashColor = '#fff';
    this.fx = []; this.parts = []; this.nums = []; this.banners = []; this.bags = []; this.coins = []; this.decals = []; this.corpses = [];
    this.ev = new Map(); // enemy visuals by id
    this.hv = [0, 1, 2].map(() => ({ hurt: 0, kick: 0, aura: 0, auraColor: '#fff', cast: 0, muzzle: 0 }));
    this.motes = Array.from({ length: 22 }, () => ({ x: rand(0, VW), y: rand(0, VH), v: rand(4, 12), s: rand(1, 2.2), p: rand(0, TAU) }));
    this.resize();
  }
  resize() {
    const r = this.cv.getBoundingClientRect(), dpr = Math.min(2, window.devicePixelRatio || 1); // 2× is sharp enough and far lighter on phones
    const s = Math.max(r.width / VW, r.height / VH) || 1; // fill the frame; the edges of the field may crop
    this.scale = s; this.ox = (r.width - VW * s) / 2; this.oy = (r.height - VH * s) / 2;
    this.cv.width = Math.round(r.width * dpr); this.cv.height = Math.round(r.height * dpr); this.dpr = dpr;
  }
  /** Where a world point sits on the page (for flying things into DOM counters). */
  toPage(x, y) { const r = this.cv.getBoundingClientRect(); return { x: r.left + this.ox + x * this.scale, y: r.top + this.oy + y * this.scale }; }
  /** A hero's weapon tip, where shots leave from. */
  muzzle(h) { return { x: h.x + 13, y: h.y - 40 + this.hv[h.i].kick * 2 }; }
  enemyVis(e) {
    let v = this.ev.get(e.id);
    if (!v) { v = { flash: 0, born: this.t, ph: Math.random() * TAU, numAt: 0, acc: 0 }; this.ev.set(e.id, v); }
    return v;
  }

  /** React to one tick's events and rewards. */
  feed(B, events, rewards, sound) {
    const byId = (id) => B.enemies.find((e) => e.id === id);
    for (const ev of events) {
      switch (ev.k) {
        case 'shot': {
          // each projectile flies its own straight line (a fan of arrows, twin wavy orbs, a piercing bolt)
          const h = B.heroes[ev.hero], C = CLASSES[h.cls], v = this.hv[ev.hero];
          v.kick = Math.max(v.kick, ev.big ? 1.4 : 0.7); v.muzzle = 0.06;
          this.fx.push({ k: 'bolt', x0: ev.x0, y0: ev.y0, ang: ev.ang, len: ev.len, t: 0, life: Math.max(0.05, ev.flight), c: ev.color || MOD_COLOR[ev.mod] || C.shot, crit: ev.crit, look: ev.look, big: ev.big, wavy: ev.wavy, size: ev.size || 1, ph: Math.random() * TAU });
          sound?.(C.weapon);
          break;
        }
        case 'hit': {
          const e = byId(ev.id); if (!e) break;
          const v = this.enemyVis(e); v.flash = 0.1;
          const top = e.y - sizeOf(e) * 0.75;
          // rapid plain hits add up into one number every ~0.3s so the horde doesn't bury the screen in digits
          const plain = !ev.crit && !ev.ab;
          if (plain) v.acc += ev.dmg;
          if (!plain || this.t - v.numAt > 0.3) {
            if (plain) { v.numAt = this.t; this.num(e.x + rand(-8, 8), top, fmt(v.acc), '#ffffff', 10); v.acc = 0; }
            else this.num(e.x + rand(-8, 8), top - 4, fmt(ev.dmg), ev.crit ? '#ffd34d' : '#ffb070', ev.crit ? 14 : 12, ev.crit);
          }
          if (ev.crit) this.shake = Math.max(this.shake, 1.5);
          for (let i = 0; i < (ev.crit ? 6 : 2); i++) this.parts.push({ x: e.x, y: e.y - sizeOf(e) * 0.35, vx: rand(-90, 90), vy: rand(-90, 20), t: 0, life: rand(0.18, 0.35), c: ev.crit ? '#ffd34d' : '#fff3c0', s: rand(1.5, 2.6), add: true });
          break;
        }
        case 'die': {
          const e = byId(ev.id); if (!e) break;
          const size = sizeOf(e), img = monsterImage(e.sprite, e.pal);
          this.corpses.push({ img, x: e.x, y: e.y, size, t: 0 });
          // a splat on the ground in the creature's colors
          this.decals.push({ x: e.x, y: e.y, r: size * 0.45, c: e.pal.a, c2: e.pal.b, t: 0, life: 7, rot: rand(0, TAU) });
          if (this.decals.length > 60) this.decals.shift();
          for (let i = 0; i < (ev.boss ? 60 : 10); i++) { const a = rand(0, TAU), sp = rand(40, ev.boss ? 260 : 140); this.parts.push({ x: e.x, y: e.y - size * 0.3, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 40, t: 0, life: rand(0.3, ev.boss ? 1.3 : 0.6), c: [e.pal.a, e.pal.b, e.pal.c][i % 3], s: rand(2, 3.5), g: 220 }); }
          if (ev.boss) { this.shake = 12; this.flash = 0.5; this.flashColor = '#fff6d0'; sound?.('bossDie'); } else sound?.('kill');
          break;
        }
        case 'eshot': this.fx.push({ k: 'ebolt', x0: ev.x0, y0: ev.y0 - 14, x1: ev.x1, y1: ev.y1 - 18, t: 0, life: ev.flight, c: ev.boss ? '#ff3a5a' : '#ff6a4a', r: ev.boss ? 6 : 4 }); break;
        case 'claw': {
          const h = B.heroes[ev.hero];
          if (Math.random() < 0.5) this.fx.push({ k: 'scratch', x: h.x + rand(-10, 10), y: h.y - 22 + rand(-8, 8), t: 0, life: 0.25, rot: rand(-0.6, 0.6) });
          break;
        }
        case 'pattern': {
          const e = byId(ev.id); if (!e) break;
          const n = ev.kind === 'ring' ? 20 : ev.kind === 'spread' ? 11 : 16, cy = e.y - 40;
          for (let i = 0; i < n; i++) {
            const a = ev.kind === 'ring' ? (i / n) * TAU : ev.kind === 'spread' ? Math.PI / 2 + (i / (n - 1) - 0.5) * 1.8 : (i / n) * TAU + this.t * 3;
            const sp = ev.kind === 'spiral' ? 210 : 260;
            this.fx.push({ k: 'pbullet', x: e.x, y: cy, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, spin: ev.kind === 'spiral' ? 1.4 : 0, t: 0, life: 1.6, c: '#ff3a8a' });
          }
          this.fx.push({ k: 'ringwave', x: e.x, y: cy, t: 0, life: 0.5, c: '#ff3a8a' });
          sound?.('boss');
          break;
        }
        case 'ehit': {
          const h = B.heroes[ev.hero], v = this.hv[ev.hero];
          v.hurt = 0.18;
          if (ev.big || Math.random() < 0.35) this.num(h.x + rand(-10, 10), h.y - 52, ev.shield && ev.dmg < 1 ? 'blocked' : fmt(ev.dmg), ev.shield ? '#7ad0ff' : '#ff5a4e', ev.big ? 13 : 10);
          if (ev.big) this.shake = Math.max(this.shake, 6);
          sound?.('hurt');
          break;
        }
        case 'heal': { const h = B.heroes[ev.hero]; if (ev.amt > h.maxHp * 0.03) this.num(h.x, h.y - 58, `+${fmt(ev.amt)}`, '#6cff8a', 11); for (let i = 0; i < 6; i++) this.parts.push({ x: h.x + rand(-12, 12), y: h.y - rand(0, 30), vx: 0, vy: rand(-60, -30), t: 0, life: rand(0.5, 0.9), c: '#8fff9f', s: 2.4, add: true }); break; }
        case 'blast': {
          this.fx.push({ k: 'boom', x: ev.x, y: ev.y - 10, t: 0, life: ev.big ? 0.6 : 0.45, c: '#ffb070', big: ev.big });
          this.fx.push({ k: 'groundring', x: ev.x, y: ev.y, t: 0, life: 0.45, c: '#ffd9a0', r: BAL.splashRadius });
          for (let i = 0; i < (ev.big ? 16 : 8); i++) { const a = rand(0, TAU), sp = rand(80, ev.big ? 220 : 150); this.parts.push({ x: ev.x, y: ev.y - 10, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * 0.6, t: 0, life: rand(0.25, 0.5), c: i % 2 ? '#ffd34d' : '#ff7a3a', s: rand(2, 3.4), add: true }); }
          this.shake = Math.max(this.shake, ev.big ? 4 : 2);
          sound?.('blast');
          break;
        }
        case 'arc': {
          let prev = { x: ev.x, y: ev.y - 14 };
          for (const id of ev.ids) { const o = byId(id); if (!o) continue; const to = { x: o.x, y: o.y - 14 }; this.fx.push({ k: 'zap', x0: prev.x, y0: prev.y, x1: to.x, y1: to.y, t: 0, life: 0.22, c: '#7ae8ff' }); prev = to; }
          sound?.('zap');
          break;
        }
        case 'proc': this.proc(B, ev, byId, sound); break;
        case 'ignite': case 'chill': {
          if (this.fx.some((f) => f.k === 'burn' && f.id === ev.id && f.life - f.t > 0.5)) break;
          this.fx.push({ k: 'burn', id: ev.id, t: 0, life: ev.k === 'chill' ? ev.dur : 3, c: ev.k === 'chill' ? '#9ad8ff' : '#ff8a2a' });
          break;
        }
        case 'stunned': this.fx.push({ k: 'stars', id: ev.id, t: 0, life: 0.8 }); break;
        case 'status': { const e = byId(ev.id); if (e) this.num(e.x, e.y - sizeOf(e) - 4, ev.s === 'curse' ? 'Cursed' : 'Armor Broken', ev.s === 'curse' ? '#ff6ad8' : '#ffb070', 9); break; }
        case 'zap': for (let k = 0; k < 3; k++) { const a = rand(0, TAU), d = rand(10, ev.r); this.fx.push({ k: 'zap', x0: ev.x + (ev.look === 'portal' ? Math.cos(this.t * 2 + k * 2.1) * ev.r * 0.6 : 0), y0: ev.y - (ev.look === 'plant' ? 10 : 30) + (ev.look === 'portal' ? Math.sin(this.t * 2 + k * 2.1) * ev.r * 0.3 : 0), x1: ev.x + Math.cos(a) * d, y1: ev.y + Math.sin(a) * d * 0.5 - 10, t: 0, life: 0.2, c: ev.look === 'plant' ? '#9aff6a' : ev.look === 'soul' ? '#e0e8ff' : '#c8b8ff' }); } sound?.('zap'); break;
        case 'beam': { const h = B.heroes[ev.hero]; this.fx.push({ k: 'beam', x0: h.x, y0: h.y - 40, x1: ev.x, y1: ev.y - 20, t: 0, life: 0.3, c: '#fff3b0', w: 9 }); this.fx.push({ k: 'groundring', x: ev.x, y: ev.y, t: 0, life: 0.5, c: '#fff3b0', r: ev.r }); this.fx.push({ k: 'boom', x: ev.x, y: ev.y - 12, t: 0, life: 0.5, c: '#fff3b0', big: true }); this.shake = Math.max(this.shake, 3); sound?.('blast'); break; }
        case 'barrier': for (const i of ev.heroes) { this.hv[i].aura = 0.8; this.hv[i].auraColor = '#7ad0ff'; } break;
        case 'dodge': { const h = B.heroes[ev.hero]; if (ev.invuln) { this.hv[ev.hero].aura = 0.3; this.hv[ev.hero].auraColor = '#ffffff'; } else if (Math.random() < 0.5) this.num(h.x + rand(-10, 10), h.y - 52, 'dodge', '#b8c0d8', 10); break; }
        case 'revive': { const h = B.heroes[ev.hero]; this.num(h.x, h.y - 64, 'Revived!', '#ffffff', 14, true); this.hv[ev.hero].cast = 0.8; for (let i = 0; i < 24; i++) this.parts.push({ x: h.x + rand(-16, 16), y: h.y - rand(0, 40), vx: rand(-20, 20), vy: rand(-140, -60), t: 0, life: rand(0.6, 1.1), c: '#ffffff', s: 3, add: true }); sound?.('levelup'); break; }
        case 'fall': { const h = B.heroes[ev.hero]; for (let i = 0; i < 18; i++) this.parts.push({ x: h.x, y: h.y - 20, vx: rand(-90, 90), vy: rand(-120, 0), t: 0, life: 0.8, c: '#ff4030', s: 3, g: 200 }); this.shake = 5; sound?.('fall'); break; }
        case 'ability': this.ability(B, ev, byId, sound); break;
        case 'boss': this.banner('BOSS', '#ff3a5a', 1.8, true); sound?.('bossWarn'); this.flash = 0.25; this.flashColor = '#ff2040'; break;
        case 'stage': this.stageAt = this.t; break;
        case 'won':
          if (ev.boss) { this.banner(`${zoneOf(ev.stage).boss[0]} slain!`, '#ffd34d', 2, true); this.confetti(); sound?.('clear'); }
          else { this.banner(`Stage ${stageLabel(ev.stage)} cleared`, '#ffe9a8', 1.1); sound?.('clear'); }
          break;
        case 'lost': this.banner(ev.timeout ? 'Overwhelmed' : 'Defeated', '#ff6b5e', 1.6, true); break;
        default: break;
      }
    }
    for (const r of rewards) {
      const at = r.at || { x: 180, y: 120 };
      if (r.k === 'fame') { for (let i = 0; i < Math.min(4, 1 + Math.floor(Math.log10(r.n + 1) / 2)); i++) this.coins.push({ x: at.x + rand(-6, 6), y: at.y - 10, vx: rand(-80, 80), vy: rand(-130, -60), t: -i * 0.03, life: 0.9 }); }
      if (r.k === 'drop') {
        if (r.salvaged) {
          // auto-salvaged (or the bag was full): it bursts straight into Fame
          for (let i = 0; i < 5; i++) this.coins.push({ x: at.x + rand(-8, 8), y: at.y - 8, vx: rand(-110, 110), vy: rand(-160, -70), t: -i * 0.03, life: 0.95 });
          this.num(at.x, at.y - 40, `+${fmt(r.salvaged)}`, BAL.rarities[r.it.rarity].color, 11);
          sound?.('fame');
          continue;
        }
        if (r.quiet) { // a starter found again: it melts into the copy you have
          this.num(at.x, at.y - 40, r.dupe.ups ? `${r.it.name} +${r.dupe.ups}` : `+${fmt(r.dupe.fame)}`, '#bff6ff', 10);
          for (let i = 0; i < 14; i++) { const a = rand(0, TAU), sp = rand(40, 140); this.parts.push({ x: at.x, y: at.y - 10, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 40, t: 0, life: rand(0.5, 0.9), c: i % 2 ? '#ffffff' : '#6ff2ff', s: 2.4, g: 80, add: true }); }
          sound?.('loot');
          continue;
        }
        this.bags.push({ x: at.x, y: at.y, t: 0, rarity: r.it.rarity, life: r.unique ? (r.exalted ? 3.4 : 2.6) : 1.5, ex: r.exalted });
        if (r.unique) {
          // the white bag: a pillar of light, a flash, and a chime you learn to love
          if (r.exalted) { this.banner('EXALTED!', '#ffe08a', 3, true); this.flash = 0.7; this.flashColor = '#fff2b0'; this.shake = 10; this.confetti(); } else { this.banner('LOOT!', '#ffffff', 2.2, true); this.flash = 0.45; this.flashColor = '#ffffff'; this.shake = 6; }
          for (let i = 0; i < 40; i++) { const a = rand(0, TAU), sp = rand(60, 220); this.parts.push({ x: at.x, y: at.y - 10, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 60, t: 0, life: rand(0.8, 1.6), c: i % 3 ? '#ffffff' : '#6ff2ff', s: rand(2, 3.5), g: 80, add: true }); }
          sound?.(r.exalted ? 'exalted' : 'unique');
        } else sound?.(r.it.rarity >= 3 ? 'lootRare' : 'loot');
      }
    }
  }
  /** A Unique's visible effect going off (see runProc in core/battle.js). */
  proc(B, ev, byId, sound) {
    const h = B.heroes[ev.hero], c = ev.c || '#ffffff';
    if (!h) return;
    const burst = (x, y, n, sp, life, col = c, g = 0) => { for (let i = 0; i < n; i++) { const a = rand(0, TAU), s = rand(sp * 0.4, sp); this.parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s * 0.7, t: 0, life: rand(life * 0.6, life), c: col, s: rand(1.8, 3.2), add: true, g }); } };
    switch (ev.kind) {
      case 'nova':
        this.fx.push({ k: 'groundring', x: h.x, y: h.y, t: 0, life: 0.55, c, r: ev.r * 1.25 }, { k: 'groundring', x: h.x, y: h.y, t: -0.1, life: 0.55, c: '#ffffff', r: ev.r });
        burst(h.x, h.y - 10, 22, 220, 0.5); this.hv[ev.hero].aura = 0.35; this.hv[ev.hero].auraColor = c; this.shake = Math.max(this.shake, 3); sound?.('blast'); break;
      case 'orbit': {
        const e = byId(ev.id); if (!e) break;
        const o = this.orbPos(h, ev.n || 2, (ev.slot * 7) % (ev.n || 2), ev.slot);
        this.fx.push({ k: 'zap', x0: o.x, y0: o.y, x1: e.x, y1: e.y - 14, t: 0, life: 0.18, c });
        burst(e.x, e.y - 14, 5, 100, 0.25); break;
      }
      case 'meteor': {
        // falls from the sky onto the pack, then bursts (a flask arcs in from the hero instead)
        const flask = ev.look === 'flask';
        this.fx.push({ k: 'meteor', x0: flask ? h.x : ev.x + 60, y0: flask ? h.y - 40 : ev.y - 260, x1: ev.x, y1: ev.y - 6, t: -(ev.delay || 0), life: 0.32, c, flask, r: ev.r, burst: true });
        break;
      }
      case 'sigil': // a starter item's rune circle, flaring under the hero as the ability goes off
        this.fx.push({ k: 'sigil', x: h.x, y: h.y, t: 0, life: 0.9, c, a: rand(0, TAU) });
        for (let n = 0; n < 14; n++) { const a = (n / 14) * TAU; this.parts.push({ x: h.x + Math.cos(a) * 34, y: h.y + Math.sin(a) * 15, vx: 0, vy: rand(-90, -50), t: 0, life: rand(0.5, 0.8), c, s: 2.4, add: true }); }
        this.hv[ev.hero].aura = 0.4; this.hv[ev.hero].auraColor = c; break;
      case 'bubble': this.hv[ev.hero].bubbleIn = 0.35; burst(h.x, h.y - 26, 10, 80, 0.5); sound?.('ability'); break;
      case 'halo': case 'frost': {
        for (const id of ev.ids || []) { const e = byId(id); if (e && Math.random() < 0.4) burst(e.x, e.y - 10, 2, 50, 0.35, c, ev.kind === 'frost' ? 30 : -30); }
        break;
      }
      case 'healwave':
        for (const i of ev.heroes || []) { const o = B.heroes[i]; this.fx.push({ k: 'groundring', x: o.x, y: o.y, t: 0, life: 0.7, c, r: 40 }); for (let n = 0; n < 8; n++) this.parts.push({ x: o.x + rand(-14, 14), y: o.y - rand(0, 30), vx: 0, vy: rand(-70, -40), t: 0, life: rand(0.6, 1), c, s: 2.6, add: true }); }
        sound?.('drink'); break;
      case 'thornburst':
        for (let n = 0; n < 12; n++) { const a = (n / 12) * TAU; this.fx.push({ k: 'shard', x: h.x, y: h.y - 22, a, t: 0, life: 0.35, c, r: ev.r }); }
        this.hv[ev.hero].aura = 0.25; this.hv[ev.hero].auraColor = c; break;
      case 'lightning':
        this.fx.push({ k: 'bolt', x: ev.x, y: ev.y, t: 0, life: 0.3, c });
        this.fx.push({ k: 'groundring', x: ev.x, y: ev.y, t: 0, life: 0.4, c, r: ev.r });
        burst(ev.x, ev.y - 12, 12, 160, 0.35, '#ffffff'); this.flash = Math.max(this.flash || 0, 0.06); this.flashColor = c; this.shake = Math.max(this.shake, 3); sound?.('zap'); break;
      case 'spirit': { const e = byId(ev.id); if (e) this.fx.push({ k: 'wisp', x0: ev.x, y0: ev.y - 16, id: ev.id, t: 0, life: ev.flight, c }); break; }
      case 'vamp': this.fx.push({ k: 'orbfly', x0: ev.x, y0: ev.y - 12, hero: ev.hero, t: 0, life: 0.5, c }); break;
      default: break;
    }
  }
  /** Where an orbiting mote is now: `n` motes evenly spaced, circling the hero. */
  orbPos(h, n, k, set = 0) {
    const a = this.t * (2.2 - set * 0.4) + (k / n) * TAU + set;
    return { x: h.x + Math.cos(a) * 26, y: h.y - 24 + Math.sin(a) * 11 };
  }
  /** Effects that stay on a hero while the Unique is worn: orbiting motes, halos, frost, a shield bubble. */
  drawAuras(g, h) {
    if (h.dead) return;
    g.globalCompositeOperation = 'lighter';
    (h.procs || []).forEach((P, k) => {
      if (P.kind === 'orbit') for (let i = 0; i < P.n; i++) { const o = this.orbPos(h, P.n, i, k); g.globalAlpha = 0.95; g.drawImage(glow(P.c, 9), o.x - 9, o.y - 9); g.fillStyle = '#ffffff'; g.beginPath(); g.arc(o.x, o.y, 2, 0, TAU); g.fill(); }
      if (P.kind === 'halo' || P.kind === 'frost') {
        g.save(); g.translate(h.x, h.y + 2); g.scale(1, 0.42);
        g.globalAlpha = 0.18 + 0.06 * Math.sin(this.t * 3 + k); g.fillStyle = P.c; g.beginPath(); g.arc(0, 0, P.r, 0, TAU); g.fill();
        g.globalAlpha = 0.55; g.strokeStyle = P.c; g.lineWidth = 2; g.setLineDash(P.kind === 'frost' ? [3, 6] : [10, 6]); g.lineDashOffset = -this.t * (P.kind === 'frost' ? 10 : 30);
        g.beginPath(); g.arc(0, 0, P.r, 0, TAU); g.stroke(); g.setLineDash([]); g.restore();
        if (Math.random() < 0.15) { const a = rand(0, TAU); this.parts.push({ x: h.x + Math.cos(a) * P.r * 0.9, y: h.y + Math.sin(a) * P.r * 0.38, vx: 0, vy: P.kind === 'frost' ? 10 : -30, t: 0, life: 0.8, c: P.c, s: 2, add: true }); }
      }
    });
    if (h.shield > 0 && (h.procs || []).some((P) => P.kind === 'bubble')) {
      const P = h.procs.find((x) => x.kind === 'bubble'), v = this.hv[h.i], grow = 1 - Math.max(0, v.bubbleIn || 0) / 0.35;
      v.bubbleIn = Math.max(0, (v.bubbleIn || 0) - 1 / 60);
      const r = 30 * (0.6 + 0.4 * grow);
      g.globalAlpha = 0.22; g.fillStyle = P.c; g.beginPath(); g.ellipse(h.x, h.y - 26, r, r * 1.15, 0, 0, TAU); g.fill();
      g.globalAlpha = 0.7; g.strokeStyle = P.c; g.lineWidth = 1.6; g.stroke();
      g.globalAlpha = 0.6; g.fillStyle = '#ffffff'; g.beginPath(); g.ellipse(h.x - r * 0.4, h.y - 26 - r * 0.55, r * 0.22, r * 0.12, -0.6, 0, TAU); g.fill();
    }
    g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
  }
  ability(B, ev, byId, sound) {
    const h = B.heroes[ev.hero], C = CLASSES[h.cls];
    this.hv[ev.hero].cast = 0.5;
    this.fx.push({ k: 'groundring', x: h.x, y: h.y, t: 0, life: 0.45, c: C.shot, r: 34 });
    const ts = (ev.targets || []).map(byId).filter(Boolean);
    sound?.('ability');
    // Unique ability items look like their ROTMG selves
    switch (ev.mode) {
      case 'snipe': { const m = this.muzzle(h); this.fx.push({ k: 'beam', x0: m.x, y0: m.y, x1: ev.x, y1: ev.y - 20, t: 0, life: 0.4, c: '#ffe36a', w: 10 }); this.fx.push({ k: 'boom', x: ev.x, y: ev.y - 16, t: 0, life: 0.6, c: '#ffe36a', big: true }); this.shake = Math.max(this.shake, 6); sound?.('blast'); return; }
      case 'armorBreak': this.fx.push({ k: 'groundring', x: h.x, y: h.y, t: 0, life: 0.6, c: '#ffb070', r: 120 }); for (const e of ts) this.num(e.x, e.y - sizeOf(e) - 4, 'Armor Broken', '#ffb070', 9); this.shake = Math.max(this.shake, 5); return;
      case 'paralyze': this.fx.push({ k: 'groundring', x: ev.x, y: ev.y, t: 0, life: 0.6, c: '#ff7aa8', r: BAL.aoeRadius }); this.fx.push({ k: 'boom', x: ev.x, y: ev.y - 8, t: 0, life: 0.5, c: '#ff7aa8', big: true }); for (const e of ts) this.fx.push({ k: 'stars', id: e.id, t: 0, life: 2 }); return;
      case 'twinBombs': for (const [dx, r] of [[0, 0.6], [0, 1.2]]) this.fx.push({ k: 'groundring', x: ev.x + dx, y: ev.y, t: 0, life: 0.7, c: '#7cff4a', r: BAL.aoeRadius * r }); for (const e of ts) this.fx.push({ k: 'burn', id: e.id, t: 0, life: 4, c: '#7cff4a' }); return;
      case 'portals': this.fx.push({ k: 'groundring', x: ev.x, y: ev.y, t: 0, life: 0.6, c: '#b6a0ff', r: BAL.aoeRadius * 1.15 }); this.flash = 0.1; this.flashColor = '#d8c8ff'; return;
      default: break;
    }
    switch (ev.fx) {
      case 'aoe': this.fx.push({ k: 'boom', x: ev.x, y: ev.y - 10, t: 0, life: 0.6, c: '#ff8a3c', big: true }); this.fx.push({ k: 'groundring', x: ev.x, y: ev.y, t: 0, life: 0.5, c: '#ffb070', r: BAL.aoeRadius }); this.shake = Math.max(this.shake, 5); this.flash = 0.1; this.flashColor = '#ffb070'; break;
      case 'pierce': this.fx.push({ k: 'beam', x0: h.x, y0: h.y - 30, x1: ev.x, y1: ev.y - 30, t: 0, life: 0.35, c: '#ffe08a', w: 7 }); break;
      case 'execute': for (const e of ts) this.fx.push({ k: 'slash', x: e.x, y: e.y - 16, t: 0, life: 0.4, c: '#e6e6f5' }); this.shake = Math.max(this.shake, 3); break;
      case 'berserk': this.hv[ev.hero].aura = 4; this.hv[ev.hero].auraColor = '#ff4a3a'; break;
      case 'stun': this.fx.push({ k: 'groundring', x: h.x, y: h.y, t: 0, life: 0.6, c: '#9ec2ff', r: 120 }); for (const e of ts) this.fx.push({ k: 'stars', id: e.id, t: 0, life: 1.2 }); this.shake = Math.max(this.shake, 6); break;
      case 'dot': this.fx.push({ k: 'groundring', x: ev.x, y: ev.y, t: 0, life: 0.6, c: '#ffa040', r: BAL.aoeRadius }); for (const e of ts) this.fx.push({ k: 'burn', id: e.id, t: 0, life: 4, c: '#ffa040' }); break;
      case 'poison': for (const e of ts) this.fx.push({ k: 'burn', id: e.id, t: 0, life: 5, c: '#7cff4a' }); break;
      case 'drain': this.fx.push({ k: 'groundring', x: ev.x, y: ev.y, t: 0, life: 0.6, c: '#8fff9f', r: BAL.aoeRadius }); for (const e of ts.slice(0, 8)) for (const hi of ev.heroes || []) { const q = B.heroes[hi]; this.fx.push({ k: 'stream', x0: e.x, y0: e.y - 12, x1: q.x, y1: q.y - 24, t: 0, life: 0.6, c: '#8fff9f' }); } break;
      case 'heal': for (const hi of ev.heroes || []) { this.hv[hi].aura = 0.8; this.hv[hi].auraColor = '#8fff9f'; } break;
      case 'buff': for (const hi of ev.heroes || []) { this.hv[hi].aura = 5; this.hv[hi].auraColor = '#ffd34d'; } this.flash = 0.1; this.flashColor = '#ffe08a'; break;
      case 'chain': { let from = this.muzzle(h); for (const e of ts) { const to = { x: e.x, y: e.y - 14 }; this.fx.push({ k: 'zap', x0: from.x, y0: from.y, x1: to.x, y1: to.y, t: 0, life: 0.35, c: '#5de0ff' }); from = to; } this.flash = 0.08; this.flashColor = '#bff3ff'; break; }
      default: break;
    }
  }
  num(x, y, text, c, size, pop) { this.nums.push({ x, y, text, c, size, t: 0, pop }); if (this.nums.length > 50) this.nums.shift(); }
  banner(text, c, life, big) { this.banners = this.banners.filter((b) => b.big || big); this.banners.push({ text, c, t: 0, life, big }); }
  confetti() { const cs = ['#ffd34d', '#ff6b9d', '#5de0ff', '#8fff9f', '#b05cff']; for (let i = 0; i < 70; i++) this.parts.push({ x: rand(40, 320), y: rand(-20, 40), vx: rand(-40, 40), vy: rand(40, 160), t: 0, life: rand(1, 1.8), c: cs[i % 5], s: rand(2, 3.5), rot: rand(0, TAU), conf: true }); }

  /** Draw a frame. dt in seconds. coinTarget / bagTarget: world points the Fame coins and loot fly to. */
  render(B, dt, coinTarget, bagTarget) {
    this.t += dt;
    const g = this.g;
    g.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    const r = this.cv.getBoundingClientRect();
    g.fillStyle = '#07060a'; g.fillRect(0, 0, r.width, r.height);
    const sx = (Math.random() - 0.5) * this.shake, sy = (Math.random() - 0.5) * this.shake;
    this.shake = Math.max(0, this.shake - dt * 30);
    g.setTransform(this.dpr * this.scale, 0, 0, this.dpr * this.scale, this.dpr * (this.ox + sx), this.dpr * (this.oy + sy));
    g.imageSmoothingEnabled = true;
    { const Z = zoneOf(B.stage); g.drawImage(arena(Z.arena || Z.id), 0, 0, VW, VH); }

    // splats on the ground, fading
    this.decals = this.decals.filter((d) => (d.t += dt) < d.life);
    for (const d of this.decals) {
      g.globalAlpha = 0.55 * Math.min(1, (d.life - d.t) / 2) * Math.min(1, d.t * 8);
      g.save(); g.translate(d.x, d.y); g.rotate(d.rot); g.scale(1, 0.55);
      g.fillStyle = d.c; g.beginPath(); for (let k = 0; k < 9; k++) { const a = (k / 9) * TAU, rr = d.r * (0.6 + ((k * 37) % 7) / 14); g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); } g.closePath(); g.fill();
      g.fillStyle = d.c2; g.beginPath(); g.arc(d.r * 0.2, -d.r * 0.1, d.r * 0.3, 0, TAU); g.fill();
      g.restore();
    }
    g.globalAlpha = 1;

    // rings under the heroes: their spot on the field, with the ability charge around the edge
    for (const h of B.heroes) {
      const C = CLASSES[h.cls], v = this.hv[h.i];
      g.save(); g.translate(h.x, h.y + 4); g.scale(1, 0.45);
      g.globalCompositeOperation = 'lighter';
      g.globalAlpha = h.dead ? 0.15 : 0.32 + 0.1 * Math.sin(this.t * 3 + h.i); g.drawImage(glow(C.shot, 30), -30, -30);
      g.globalAlpha = h.dead ? 0.2 : 0.85; g.strokeStyle = C.shot; g.lineWidth = 2.4; g.beginPath(); g.arc(0, 0, 22, 0, TAU); g.stroke();
      if (!h.dead) { const cd = 1 - Math.max(0, h.cd) / C.ability.cd; g.strokeStyle = cd >= 0.98 ? '#ffffff' : '#ffd34d'; g.lineWidth = 4; g.beginPath(); g.arc(0, 0, 22, -Math.PI / 2, -Math.PI / 2 + cd * TAU); g.stroke(); }
      if (v.cast > 0) { g.globalAlpha = v.cast; g.lineWidth = 3; g.beginPath(); g.arc(0, 0, 22 + (0.5 - v.cast) * 40, 0, TAU); g.stroke(); }
      g.restore();
    }

    // everyone on the field, back to front
    const stunned = new Set(this.fx.filter((f) => f.k === 'stars').map((f) => f.id));
    const things = [];
    for (const e of B.enemies) if (e.hp > 0) things.push({ y: e.y, e });
    for (const h of B.heroes) things.push({ y: h.y, h });
    this.corpses = this.corpses.filter((c) => (c.t += dt) < 0.35);
    for (const c of this.corpses) things.push({ y: c.y, c });
    things.sort((a, b) => a.y - b.y);
    for (const it of things) {
      if (it.e) this.drawEnemy(g, it.e, dt, stunned.has(it.e.id));
      else if (it.h) { this.drawHero(g, it.h, dt); this.drawAuras(g, it.h); }
      else {
        const c = it.c, q = c.t / 0.35;
        if (!ready(c.img)) continue;
        g.globalAlpha = 1 - q; const w = c.size * (1 + q * 0.5), hh = c.size * (1 - q * 0.6);
        g.drawImage(tinted(c.img, '#ffffff'), c.x - w / 2, c.y - hh * 0.95, w, hh); g.globalAlpha = 1;
      }
    }
    for (const id of [...this.ev.keys()]) if (!B.enemies.some((e) => e.id === id)) this.ev.delete(id);

    // Genesis portals hovering over their area
    g.globalCompositeOperation = 'lighter';
    for (const z of B.zones || []) {
      if (z.plant || z.soul) {
        // a skull-flower rooted in the ground, or a wandering soul drifting over the pack
        const c = z.plant ? '#9aff6a' : '#c8d8ff', y = z.y - (z.soul ? 30 + Math.sin(this.t * 3) * 6 : 10);
        g.globalAlpha = 0.85; g.drawImage(glow(c, 22), z.x - 22, y - 22);
        g.fillStyle = z.plant ? '#ffb0d0' : '#ffffff'; g.beginPath(); g.arc(z.x, y, z.plant ? 5 : 6, 0, TAU); g.fill();
        if (z.plant) for (let k = 0; k < 5; k++) { const a = this.t + (k * TAU) / 5; g.beginPath(); g.ellipse(z.x + Math.cos(a) * 8, y + Math.sin(a) * 5, 5, 3, a, 0, TAU); g.fill(); }
        continue;
      }
      for (let k = 0; k < 4; k++) {
        const a = this.t * 2 + (k * TAU) / 4, x = z.x + Math.cos(a) * z.r * 0.6, y = z.y - 30 + Math.sin(a) * z.r * 0.3;
        g.globalAlpha = 0.8; g.drawImage(glow('#b6a0ff', 16), x - 16, y - 16); g.strokeStyle = '#efe8ff'; g.lineWidth = 2; g.beginPath(); g.ellipse(x, y, 7, 10, 0, 0, TAU); g.stroke();
      }
    }
    g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
    // effects, light on top
    this.fx = this.fx.filter((f) => (f.t += dt) < f.life);
    g.globalCompositeOperation = 'lighter';
    for (const f of this.fx) this.drawFx(g, f, B);
    g.globalCompositeOperation = 'source-over';
    // particles
    this.parts = this.parts.filter((p) => (p.t += dt) < p.life);
    for (const p of this.parts) {
      p.vy += (p.g || 0) * dt; p.x += p.vx * dt; p.y += p.vy * dt; if (!p.conf) { p.vx *= 0.95; p.vy *= p.g ? 1 : 0.95; }
      g.globalAlpha = 1 - p.t / p.life; g.fillStyle = p.c;
      if (p.add) g.globalCompositeOperation = 'lighter';
      if (p.conf) { g.save(); g.translate(p.x, p.y); g.rotate(p.rot + p.t * 6); g.fillRect(-p.s, -p.s / 2, p.s * 2, p.s); g.restore(); } else g.fillRect(p.x - p.s / 2, p.y - p.s / 2, p.s, p.s);
      if (p.add) g.globalCompositeOperation = 'source-over';
    }
    g.globalAlpha = 1;
    // ambient motes drifting through the light
    g.globalCompositeOperation = 'lighter';
    for (const m of this.motes) {
      m.y -= m.v * dt; m.x += Math.sin(this.t + m.p) * 6 * dt;
      if (m.y < -4) { m.y = VH + 4; m.x = rand(0, VW); }
      g.globalAlpha = 0.18 + 0.15 * Math.sin(this.t * 2 + m.p); g.fillStyle = '#fff3c0'; g.fillRect(m.x, m.y, m.s, m.s);
    }
    g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;
    // loot bags pop out, sparkle, then fly to the bag counter
    this.bags = this.bags.filter((b) => (b.t += dt) < b.life);
    for (const b of this.bags) {
      const L = b.life, R = BAL.rarities[b.rarity], q = Math.max(0, (b.t - (L - 0.7)) / 0.7);
      const x = b.x + (bagTarget.x - b.x) * easeIn(q), y = b.y - 6 - Math.sin(Math.min(1, b.t / 0.4) * Math.PI) * 26 + (bagTarget.y - b.y) * easeIn(q);
      if (b.rarity >= 2) { g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.6; g.drawImage(glow(R.color, 30), x - 30, y - 30); if (b.rarity >= 4 && b.t < L - 0.7) { const w = b.rarity === 6 ? (b.ex ? 26 : 14) + 4 * Math.sin(b.t * 12) : 6; g.fillStyle = b.ex ? '#ffe08a' : R.color; g.globalAlpha = b.rarity === 6 ? 0.55 : 0.35; g.fillRect(x - w / 2, 0, w, y); } g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; }
      const bag = itemImage('bag', b.rarity, b.ex ? EXALT_PAL : null);
      g.globalAlpha = 1 - q * 0.6; if (ready(bag)) g.drawImage(bag.bmp, x - 14, y - 14, 28, 28); g.globalAlpha = 1;
    }
    // fame coins pop, then fly to the counter
    this.coins = this.coins.filter((c) => (c.t += dt) < c.life);
    for (const c of this.coins) {
      if (c.t < 0) continue;
      const q = Math.max(0, (c.t - 0.3) / (c.life - 0.3));
      if (q === 0) { c.x += c.vx * dt; c.y += c.vy * dt; c.vy += 320 * dt; c.vx *= 0.94; }
      const x = c.x + (coinTarget.x - c.x) * easeIn(q), y = c.y + (coinTarget.y - c.y) * easeIn(q);
      g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.55; g.drawImage(glow('#ffc23a', 8), x - 8, y - 8); g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;
      g.fillStyle = '#c88a10'; g.beginPath(); g.arc(x, y, 3.2, 0, TAU); g.fill(); g.fillStyle = '#ffd34d'; g.beginPath(); g.arc(x - 0.4, y - 0.4, 2.4, 0, TAU); g.fill(); g.fillStyle = '#fff6c0'; g.fillRect(x - 1.4, y - 1.8, 1.2, 1.2);
    }
    // numbers
    this.nums = this.nums.filter((n) => (n.t += dt) < 0.8);
    g.textAlign = 'center';
    for (const n of this.nums) {
      const pop = n.t < 0.1 ? 1 + (n.pop ? 0.8 : 0.4) * (1 - n.t / 0.1) : 1;
      g.globalAlpha = Math.min(1, (0.8 - n.t) / 0.3);
      g.font = `900 ${Math.round(n.size * pop)}px Nunito, system-ui, sans-serif`;
      const y = n.y - n.t * 26;
      g.lineWidth = 3; g.strokeStyle = 'rgba(0,0,0,.85)'; g.strokeText(n.text, n.x, y); g.fillStyle = n.c; g.fillText(n.text, n.x, y);
    }
    g.globalAlpha = 1;
    this.ambience(g, zoneOf(B.stage).arena || zoneOf(B.stage).id, dt);
    this.hud(g, B);
    // banners
    this.banners = this.banners.filter((b) => (b.t += dt) < b.life);
    for (const b of this.banners) {
      const inT = Math.min(1, b.t / 0.18), out = Math.min(1, (b.life - b.t) / 0.3);
      g.globalAlpha = Math.min(inT, out);
      const s = (b.big ? 32 : 17) * (1 + (1 - inT) * 0.5);
      g.font = `900 ${Math.round(s)}px Cinzel, Georgia, serif`; g.textAlign = 'center';
      const y = b.big ? 170 : 120;
      g.lineWidth = b.big ? 7 : 5; g.strokeStyle = 'rgba(0,0,0,.85)'; g.strokeText(b.text, VW / 2, y); g.fillStyle = b.c; g.fillText(b.text, VW / 2, y);
    }
    g.globalAlpha = 1;
    if (this.flash > 0) { g.fillStyle = this.flashColor; g.globalAlpha = Math.min(0.5, this.flash); g.fillRect(-40, -40, VW + 80, VH + 80); g.globalAlpha = 1; this.flash -= dt * 1.6; }
  }

  drawEnemy(g, e, dt, stunned) {
    const v = this.enemyVis(e), img = monsterImage(e.sprite, e.pal);
    v.flash = Math.max(0, v.flash - dt);
    if (!ready(img)) return;
    const size = sizeOf(e), appear = Math.min(1, (this.t - v.born) / 0.3);
    // a shuffling, bobbing walk
    const step = stunned ? 0 : Math.abs(Math.sin(this.t * (e.boss ? 3 : 7) + v.ph)), bob = step * (e.boss ? 3 : 2.5), lean = stunned ? 0 : Math.sin(this.t * (e.boss ? 3 : 7) + v.ph) * 0.06;
    g.fillStyle = 'rgba(0,0,0,.38)'; g.beginPath(); g.ellipse(e.x, e.y, size * 0.32, size * 0.11, 0, 0, TAU); g.fill();
    if (e.boss || e.elite) { g.globalCompositeOperation = 'lighter'; g.globalAlpha = (e.boss ? 0.3 : 0.18) + 0.08 * Math.sin(this.t * 4); const R = e.boss ? 80 : 26; g.drawImage(glow(e.boss ? '#ff3a5a' : '#ffb02e', R), e.x - R, e.y - size * 0.5 - R); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; }
    g.save(); g.translate(e.x, e.y - bob); g.rotate(lean);
    g.globalAlpha = appear;
    g.drawImage(img.bmp, -size / 2, -size * 0.95, size, size);
    if (v.flash > 0) { g.globalAlpha = Math.min(1, v.flash * 9) * 0.85; g.drawImage(tinted(img, '#ffffff'), -size / 2, -size * 0.95, size, size); }
    g.restore(); g.globalAlpha = 1;
    if ((e.elite || e.boss) && e.hp < e.maxHp && !e.boss) bar(g, e.x - 16, e.y + 4, 32, 3, e.hp / e.maxHp, '#ff9a2e');
    if (stunned) for (let k = 0; k < 3; k++) { const a = this.t * 4 + (k * TAU) / 3; star(g, e.x + Math.cos(a) * size * 0.4, e.y - size * 0.95 + Math.sin(a) * 3, '#ffe08a'); }
  }
  drawHero(g, h, dt) {
    const v = this.hv[h.i];
    v.kick = Math.max(0, v.kick - dt * 8); v.hurt = Math.max(0, v.hurt - dt); v.aura = Math.max(0, v.aura - dt); v.cast = Math.max(0, v.cast - dt); v.muzzle = Math.max(0, v.muzzle - dt);
    const gem = h.weaponRarity >= 0 ? RARITY_SHADES[h.weaponRarity][1] : null;
    const img = chibiImage(h.cls, gem);
    g.fillStyle = 'rgba(0,0,0,.4)'; g.beginPath(); g.ellipse(h.x, h.y + 4, 15, 5, 0, 0, TAU); g.fill();
    if (h.dead) g.globalAlpha = 0.35;
    if ((v.aura > 0 || v.cast > 0) && !h.dead) { g.globalCompositeOperation = 'lighter'; g.globalAlpha = Math.min(1, v.aura + v.cast) * (0.45 + 0.2 * Math.sin(this.t * 10)); g.drawImage(glow(v.cast > 0 ? CLASSES[h.cls].shot : v.auraColor, 36), h.x - 36, h.y - 58); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; }
    const rar = h.gearRarity ?? 0;
    if (rar >= 3 && !h.dead) { g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.22 + 0.08 * Math.sin(this.t * 2 + h.i); g.drawImage(glow(BAL.rarities[rar].color, 34), h.x - 34, h.y - 56); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; }
    if (ready(img)) {
      const breathe = 1 + Math.sin(this.t * 3 + h.i * 1.3) * 0.02;
      g.save(); g.translate(h.x, h.y + 6 + v.kick * 1.5); g.rotate(-v.kick * 0.04);
      if (h.dead) g.rotate(1.3);
      g.drawImage(img.bmp, -HERO_W / 2, -HERO_H * breathe, HERO_W, HERO_H * breathe);
      if (v.hurt > 0) { g.globalAlpha = Math.min(1, v.hurt * 5) * 0.7; g.drawImage(tinted(img, '#ff2a2a'), -HERO_W / 2, -HERO_H * breathe, HERO_W, HERO_H * breathe); }
      g.restore();
    }
    g.globalAlpha = 1;
    if (v.muzzle > 0 && !h.dead) { const m = this.muzzle(h); g.globalCompositeOperation = 'lighter'; g.drawImage(glow('#fff2b0', 12), m.x - 12, m.y - 12); g.globalCompositeOperation = 'source-over'; }
    if (!h.dead) {
      if (h.shield > 0) bar(g, h.x - 16, h.y + 12, 32, 2, Math.min(1, h.shield / h.maxHp / 0.3), '#7ad0ff');
      bar(g, h.x - 16, h.y + 15, 32, 4, h.hp / h.maxHp, h.hp / h.maxHp > 0.5 ? '#3fdf6c' : h.hp / h.maxHp > 0.25 ? '#e8b928' : '#e0483e');
    }
  }
  /** Each biome's air: sea spray, fireflies, drifting dust, sparkles, embers and void motes. */
  ambience(g, zone, dt) {
    const A = AMBIENT[zone] || AMBIENT.beach;
    if (this.ambZone !== zone) { this.ambZone = zone; this.amb = []; }
    while (this.amb.length < A.n) this.amb.push(A.spawn(this.amb.length === 0 || Math.random() < 0.5));
    g.globalCompositeOperation = 'lighter';
    for (const p of this.amb) {
      p.t += dt; p.x += p.vx * dt; p.y += p.vy * dt;
      if (A.wander) { p.vx += Math.sin(this.t * 1.3 + p.ph) * 14 * dt; p.vy += Math.cos(this.t * 1.1 + p.ph) * 10 * dt; }
      const life = Math.min(1, p.t / 0.8, (p.life - p.t) / 0.8), tw = A.twinkle ? 0.5 + 0.5 * Math.sin(this.t * A.twinkle + p.ph) : 1;
      g.globalAlpha = Math.max(0, life) * p.a * tw;
      g.drawImage(glow(p.c, p.r * 3), p.x - p.r * 3, p.y - p.r * 3);
      g.fillStyle = p.core || p.c; g.beginPath(); g.arc(p.x, p.y, p.r * 0.45, 0, TAU); g.fill();
    }
    this.amb = this.amb.filter((p) => p.t < p.life && p.x > -20 && p.x < VW + 20 && p.y > -20 && p.y < VH + 20);
    g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
  }
  /** Stage progress along the top, and the boss's life bar when one is on the field. */
  hud(g, B) {
    const boss = B.enemies.find((e) => e.boss && e.hp > 0);
    const x = 70, w = VW - 140, y = 10;
    g.fillStyle = 'rgba(8,6,14,.72)'; roundRect(g, x - 8, y - 5, w + 16, 20, 10); g.fill();
    if (boss) {
      bar(g, x, y + 3, w, 8, boss.hp / boss.maxHp, '#ff3a5a');
      g.font = '900 9px Nunito, system-ui, sans-serif'; g.textAlign = 'center'; g.fillStyle = '#fff'; g.fillText(boss.name.toUpperCase(), VW / 2, y + 26);
    } else {
      const q = B.quota === Infinity ? Math.min(1, B.stageKills / BAL.bossAfter) : B.stageKills / B.quota;
      bar(g, x, y + 3, w, 8, q, '#ffd34d');
      g.font = '900 9px Nunito, system-ui, sans-serif'; g.textAlign = 'center'; g.fillStyle = '#fff';
      g.fillText(B.quota === Infinity ? 'BOSS APPROACHING' : `${Math.min(B.stageKills, B.quota)} / ${B.quota}`, VW / 2, y + 10.5);
    }
  }

  drawFx(g, f, B) {
    const p = f.t / f.life;
    if (p < 0) return; // not started yet (staggered)
    switch (f.k) {
      case 'bolt': {
        const cs = Math.cos(f.ang), sn = Math.sin(f.ang), d = f.len * p;
        let x = f.x0 + cs * d, y = f.y0 + sn * d;
        if (f.wavy) { const w = Math.sin(p * 9 + f.ph) * 7; x -= sn * w; y += cs * w; }
        const z = (f.big ? 1.7 : 1) * f.size, look = f.look;
        if (look === 'orb' || look === 'bolt' || look === 'star' || look === 'skull') {
          // glowing orbs and bolts with a short comet tail
          const r = (f.crit ? 8 : 6) * z;
          g.globalAlpha = 0.45; g.strokeStyle = f.c; g.lineWidth = r * 0.9; g.lineCap = 'round';
          const tail = Math.min(r * 3, d);
          g.beginPath(); g.moveTo(x - cs * tail, y - sn * tail); g.lineTo(x, y); g.stroke();
          g.globalAlpha = 1; g.drawImage(glow(f.c, r * 1.8), x - r * 1.8, y - r * 1.8);
          if (look === 'star') { g.save(); g.translate(x, y); g.rotate(f.t * 14); g.fillStyle = '#fff'; for (let k = 0; k < 4; k++) { g.rotate(Math.PI / 2); g.beginPath(); g.moveTo(0, -r); g.lineTo(r * 0.25, 0); g.lineTo(-r * 0.25, 0); g.fill(); } g.restore(); }
          else { g.fillStyle = '#ffffff'; g.beginPath(); g.arc(x, y, r * 0.35, 0, TAU); g.fill(); }
        } else if (look === 'slash') {
          g.save(); g.translate(x, y); g.rotate(f.ang + Math.PI / 2); g.scale(z, z);
          g.globalAlpha = 0.9; g.strokeStyle = f.c; g.lineWidth = f.crit ? 4 : 3;
          g.beginPath(); g.arc(0, 6, f.crit ? 14 : 11, Math.PI * 1.15, Math.PI * 1.85); g.stroke();
          g.globalAlpha = 0.45; g.lineWidth = 8; g.beginPath(); g.arc(0, 6, f.crit ? 14 : 11, Math.PI * 1.2, Math.PI * 1.8); g.stroke();
          g.restore();
        } else if (look === 'blade') {
          // a spinning thrown blade
          g.save(); g.translate(x, y); g.rotate(f.t * 30); g.scale(z, z);
          g.globalAlpha = 0.5; g.drawImage(glow(f.c, 9), -9, -9); g.globalAlpha = 1;
          g.fillStyle = '#f2f4ff'; g.beginPath(); g.moveTo(0, -7); g.lineTo(2, 0); g.lineTo(0, 7); g.lineTo(-2, 0); g.closePath(); g.fill();
          g.restore();
        } else {
          // arrows: a bright streak with a hot white core
          const len = Math.min(22 * z, d / 1.4 + 2);
          g.globalAlpha = 0.55; g.strokeStyle = f.c; g.lineWidth = (f.crit ? 4.5 : 3) * z; g.lineCap = 'round';
          g.beginPath(); g.moveTo(x - cs * len * 1.4, y - sn * len * 1.4); g.lineTo(x, y); g.stroke();
          g.globalAlpha = 1; g.strokeStyle = '#ffffff'; g.lineWidth = 1.4;
          g.beginPath(); g.moveTo(x - cs * len * 0.7, y - sn * len * 0.7); g.lineTo(x, y); g.stroke();
          g.drawImage(glow(f.c, 7), x - 7, y - 7);
        }
        break;
      }
      case 'ebolt': {
        const x = f.x0 + (f.x1 - f.x0) * p, y = f.y0 + (f.y1 - f.y0) * p;
        g.globalAlpha = 0.9; g.drawImage(glow(f.c, f.r * 2.6), x - f.r * 2.6, y - f.r * 2.6);
        g.globalCompositeOperation = 'source-over'; g.fillStyle = f.c; g.beginPath(); g.arc(x, y, f.r, 0, TAU); g.fill(); g.fillStyle = '#fff'; g.beginPath(); g.arc(x, y, f.r * 0.45, 0, TAU); g.fill(); g.globalCompositeOperation = 'lighter';
        break;
      }
      case 'pbullet': {
        const a = Math.atan2(f.vy, f.vx) + f.spin * f.t, sp = Math.hypot(f.vx, f.vy);
        const x = f.x + Math.cos(a) * sp * f.t, y = f.y + Math.sin(a) * sp * f.t;
        g.globalAlpha = 1 - p * 0.5; g.drawImage(glow(f.c, 11), x - 11, y - 11);
        g.globalCompositeOperation = 'source-over'; g.fillStyle = f.c; g.beginPath(); g.arc(x, y, 4.5, 0, TAU); g.fill(); g.fillStyle = '#fff'; g.beginPath(); g.arc(x, y, 1.8, 0, TAU); g.fill(); g.globalCompositeOperation = 'lighter';
        break;
      }
      case 'ringwave': {
        g.globalAlpha = 1 - p; g.strokeStyle = f.c; g.lineWidth = 3;
        g.beginPath(); g.arc(f.x, f.y, 16 + p * 110, 0, TAU); g.stroke();
        break;
      }
      case 'meteor': {
        const q = Math.min(1, p * 1.0), x = f.x0 + (f.x1 - f.x0) * q, y = f.y0 + (f.y1 - f.y0) * q - (f.flask ? Math.sin(q * Math.PI) * 60 : 0);
        g.globalCompositeOperation = 'lighter';
        if (!f.flask) { g.globalAlpha = 0.6; g.strokeStyle = f.c; g.lineWidth = 6; g.beginPath(); g.moveTo(x - (f.x1 - f.x0) * 0.25, y - (f.y1 - f.y0) * 0.25); g.lineTo(x, y); g.stroke(); }
        g.globalAlpha = 1; g.drawImage(glow(f.c, f.flask ? 10 : 16), x - (f.flask ? 10 : 16), y - (f.flask ? 10 : 16));
        g.fillStyle = '#ffffff'; g.beginPath(); g.arc(x, y, f.flask ? 3 : 5, 0, TAU); g.fill();
        g.globalCompositeOperation = 'source-over';
        if (f.burst && p > 0.95) {
          f.burst = false;
          this.fx.push({ k: 'boom', x: f.x1, y: f.y1 - 4, t: 0, life: 0.55, c: f.c, big: true }, { k: 'groundring', x: f.x1, y: f.y1 + 6, t: 0, life: 0.5, c: f.c, r: f.r });
          for (let i = 0; i < 18; i++) { const a = rand(0, TAU), s = rand(60, 200); this.parts.push({ x: f.x1, y: f.y1, vx: Math.cos(a) * s, vy: Math.sin(a) * s * 0.6 - 40, t: 0, life: rand(0.3, 0.6), c: i % 2 ? f.c : '#ffffff', s: rand(2, 3.4), add: true, g: 200 }); }
          this.shake = Math.max(this.shake, 4);
        }
        break;
      }
      case 'shard': {
        const d = 10 + p * f.r, x = f.x + Math.cos(f.a) * d, y = f.y + Math.sin(f.a) * d * 0.55;
        g.globalAlpha = 1 - p; g.strokeStyle = f.c; g.lineWidth = 3; g.beginPath(); g.moveTo(x - Math.cos(f.a) * 8, y - Math.sin(f.a) * 4.4); g.lineTo(x, y); g.stroke();
        break;
      }
      case 'bolt': {
        // a jagged lightning bolt from the sky
        g.globalCompositeOperation = 'lighter'; g.globalAlpha = 1 - p;
        for (const [w, c] of [[7, f.c], [2.4, '#ffffff']]) { g.strokeStyle = c; g.lineWidth = w * (1 - p * 0.5); g.beginPath(); let x = f.x + rand(-20, 20), y = -10; g.moveTo(x, y); while (y < f.y - 12) { y += rand(18, 34); x += rand(-14, 14); g.lineTo(Math.abs(y - f.y) < 40 ? f.x + (x - f.x) * 0.3 : x, Math.min(y, f.y - 12)); } g.stroke(); }
        g.globalCompositeOperation = 'source-over';
        break;
      }
      case 'wisp': case 'orbfly': {
        const to = f.k === 'wisp' ? (B.enemies.find((e) => e.id === f.id) || { x: f.x0, y: f.y0 + 16 }) : B.heroes[f.hero];
        const q = p * p, x = f.x0 + (to.x - f.x0) * q + Math.sin(p * 9) * 10 * (1 - p), y = f.y0 + (to.y - 18 - f.y0) * q - Math.sin(p * Math.PI) * 30;
        g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.95;
        g.drawImage(glow(f.c, 11), x - 11, y - 11); g.fillStyle = '#ffffff'; g.beginPath(); g.arc(x, y, 2.4, 0, TAU); g.fill();
        if (Math.random() < 0.6) this.parts.push({ x, y, vx: rand(-15, 15), vy: rand(-15, 15), t: 0, life: 0.3, c: f.c, s: 2, add: true });
        g.globalCompositeOperation = 'source-over';
        break;
      }
      case 'sigil': { // two rune rings turning opposite ways, with a glow rising out of them
        const r = 30 + 12 * Math.min(1, p * 3), fade = p < 0.15 ? p / 0.15 : 1 - (p - 0.15) / 0.85;
        g.save(); g.translate(f.x, f.y); g.globalCompositeOperation = 'lighter';
        g.globalAlpha = fade * 0.5; g.drawImage(glow(f.c, r * 1.3), -r * 1.3, -r * 1.3 - 18);
        g.scale(1, 0.45); g.globalAlpha = fade; g.strokeStyle = f.c; g.lineWidth = 2.5;
        g.beginPath(); g.arc(0, 0, r, 0, TAU); g.stroke();
        g.lineWidth = 1.5; g.beginPath(); g.arc(0, 0, r * 0.72, 0, TAU); g.stroke();
        for (let i = 0; i < 6; i++) { // a hexagram of runes
          const a = f.a + p * 2.4 + (i / 6) * TAU, b = f.a + p * 2.4 + ((i + 2) / 6) * TAU;
          g.beginPath(); g.moveTo(Math.cos(a) * r * 0.72, Math.sin(a) * r * 0.72); g.lineTo(Math.cos(b) * r * 0.72, Math.sin(b) * r * 0.72); g.stroke();
          const c = f.a - p * 3 + (i / 6) * TAU; g.fillStyle = '#ffffff'; g.beginPath(); g.arc(Math.cos(c) * r, Math.sin(c) * r, 3, 0, TAU); g.fill();
        }
        g.restore(); g.globalAlpha = 1;
        break;
      }
      case 'groundring': {
        g.save(); g.translate(f.x, f.y); g.scale(1, 0.5);
        g.globalAlpha = (1 - p) * 0.9; g.strokeStyle = f.c; g.lineWidth = 4 * (1 - p) + 1;
        g.beginPath(); g.arc(0, 0, f.r * (0.4 + p * 0.7), 0, TAU); g.stroke();
        g.globalAlpha = (1 - p) * 0.25; g.fillStyle = f.c; g.fill();
        g.restore();
        break;
      }
      case 'boom': {
        g.globalAlpha = 1 - p; const r = (16 + p * 40) * (f.big ? 1.5 : 1); g.drawImage(glow(f.c, r), f.x - r, f.y - r);
        if (p < 0.3) g.drawImage(glow('#fff2c0', 16), f.x - 16, f.y - 16);
        break;
      }
      case 'beam': case 'zap': case 'stream': {
        g.globalAlpha = 1 - p; g.strokeStyle = f.c; g.lineWidth = f.k === 'beam' ? f.w * (1 - p) + 1 : 2.4;
        g.beginPath(); g.moveTo(f.x0, f.y0);
        if (f.k === 'zap') { for (let z = 1; z <= 6; z++) g.lineTo(f.x0 + ((f.x1 - f.x0) * z) / 6 + (z < 6 ? rand(-8, 8) : 0), f.y0 + ((f.y1 - f.y0) * z) / 6 + (z < 6 ? rand(-8, 8) : 0)); }
        else if (f.k === 'stream') { const q = Math.min(1, p * 1.6); g.lineTo(f.x0 + (f.x1 - f.x0) * q, f.y0 + (f.y1 - f.y0) * q); }
        else g.lineTo(f.x1, f.y1);
        g.stroke();
        break;
      }
      case 'slash': {
        g.globalAlpha = 1 - p; g.strokeStyle = f.c; g.lineWidth = 3.5;
        g.beginPath(); g.moveTo(f.x - 20 + p * 8, f.y - 16); g.lineTo(f.x + 20 - p * 8, f.y + 16); g.stroke();
        g.beginPath(); g.moveTo(f.x + 20 - p * 8, f.y - 16); g.lineTo(f.x - 20 + p * 8, f.y + 16); g.stroke();
        break;
      }
      case 'scratch': {
        g.save(); g.translate(f.x, f.y); g.rotate(f.rot); g.globalAlpha = 1 - p; g.strokeStyle = '#ff6a5a'; g.lineWidth = 2;
        for (let k = -1; k <= 1; k++) { g.beginPath(); g.moveTo(-8, k * 4 - 6); g.lineTo(8, k * 4 + 6); g.stroke(); }
        g.restore();
        break;
      }
      case 'burn': {
        const e = B.enemies.find((x) => x.id === f.id && x.hp > 0); if (!e) { f.t = f.life; break; }
        const s = sizeOf(e);
        g.globalAlpha = 0.45 + 0.25 * Math.sin(f.t * 12); g.drawImage(glow(f.c, s * 0.6), e.x - s * 0.6, e.y - s * 0.95);
        if (Math.random() < 0.25) this.parts.push({ x: e.x + rand(-s * 0.3, s * 0.3), y: e.y - rand(0, s * 0.6), vx: 0, vy: rand(-50, -25), t: 0, life: 0.5, c: f.c, s: 2.2, add: true });
        break;
      }
      default: break;
    }
    g.globalAlpha = 1;
  }
}

function roundRect(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
function bar(g, x, y, w, h, f, c) {
  g.fillStyle = 'rgba(0,0,0,.7)'; g.fillRect(x - 1, y - 1, w + 2, h + 2);
  g.fillStyle = '#2a1416'; g.fillRect(x, y, w, h);
  g.fillStyle = c; g.fillRect(x, y, Math.max(0, Math.min(1, f)) * w, h);
  g.fillStyle = 'rgba(255,255,255,.28)'; g.fillRect(x, y, Math.max(0, Math.min(1, f)) * w, Math.max(1, h / 3));
}
function star(g, x, y, c) { g.fillStyle = c; g.fillRect(x - 1, y - 3, 2, 6); g.fillRect(x - 3, y - 1, 6, 2); }
const easeIn = (q) => q * q;
export function fmt(n) {
  if (n < 1000) return String(Math.round(n));
  const u = ['K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No', 'Dc'];
  let i = -1; while (n >= 1000 && i < u.length - 1) { n /= 1000; i++; }
  return `${n < 10 ? n.toFixed(2) : n < 100 ? n.toFixed(1) : Math.round(n)}${u[i]}`;
}
