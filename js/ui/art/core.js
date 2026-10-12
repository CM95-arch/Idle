// Vector art helpers. Every character and item is built as SVG once, then rasterized ONE time into a bitmap.
// (Safari re-renders an SVG image from scratch every time it's painted, which on an iPhone eats the main thread
// and swallows taps. Bitmaps are cheap to draw and paint.)

const cache = new Map();
const queue = [];
let pumping = false;
function pump() {
  if (pumping) return;
  pumping = true;
  const run = () => {
    const art = queue.shift();
    if (!art) { pumping = false; return; }
    const cv = document.createElement('canvas');
    cv.width = art.img.naturalWidth; cv.height = art.img.naturalHeight;
    cv.getContext('2d').drawImage(art.img, 0, 0);
    art.bmp = cv;
    try { art.png = cv.toDataURL('image/png'); } catch { art.png = art.img.src; }
    for (const el of art.waiting) el.src = art.png;
    art.waiting = [];
    setTimeout(run, 0); // one per task, so the page stays responsive while art warms up
  };
  setTimeout(run, 0);
}
/** Art built from SVG markup on demand: { bmp (canvas, for drawing), png (for <img>) } once ready. */
export function svgImage(key, w, h, build, scale = 1.6) {
  let art = cache.get(key);
  if (art) return art;
  art = { key, vw: w, vh: h, bmp: null, png: null, waiting: [], img: new Image() };
  art.img.onload = () => { queue.push(art); pump(); };
  art.img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${Math.round(w * scale)}" height="${Math.round(h * scale)}">${build()}</svg>`)}`;
  cache.set(key, art);
  return art;
}
export const ready = (art) => !!art?.bmp;
/** An <img> showing the art (fills in as soon as it's rasterized). */
export function artImg(art) {
  const el = new Image();
  el.decoding = 'async'; el.draggable = false;
  if (art.png) el.src = art.png;
  else { art.waiting.push(el); const i = queue.indexOf(art); if (i > 0) { queue.splice(i, 1); queue.unshift(art); } }
  return el;
}

// ---- color ----
const hex = (c) => { const n = parseInt(c.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255]; };
const toHex = (r, g, b) => `#${[r, g, b].map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('')}`;
/** Lighten (amt > 0) or darken (amt < 0) by a share of the way to white/black. */
export function shade(c, amt) {
  const [r, g, b] = hex(c), t = amt < 0 ? 0 : 255, p = Math.abs(amt);
  return toHex(r + (t - r) * p, g + (t - g) * p, b + (t - b) * p);
}
export function mix(a, b, t) { const A = hex(a), B = hex(b); return toHex(A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t); }

// ---- defs ----
const stops = (s) => s.map(([o, c, a = 1]) => `<stop offset="${o}" stop-color="${c}" stop-opacity="${a}"/>`).join('');
export const lin = (id, s, x1 = 0, y1 = 0, x2 = 0, y2 = 1) => `<linearGradient id="${id}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}">${stops(s)}</linearGradient>`;
export const rad = (id, s, cx = 0.5, cy = 0.5, r = 0.5) => `<radialGradient id="${id}" cx="${cx}" cy="${cy}" r="${r}">${stops(s)}</radialGradient>`;
/** Light from the upper left: a light-to-dark diagonal gradient for a base color. */
export const lit = (id, c, hi = 0.28, lo = 0.45) => lin(id, [[0, shade(c, hi)], [0.45, c], [1, shade(c, -lo)]], 0.15, 0, 0.85, 1);
/** Polished metal: bright band near the top, dark at the bottom. */
export const metal = (id, c) => lin(id, [[0, shade(c, 0.55)], [0.22, shade(c, 0.15)], [0.5, shade(c, -0.25)], [0.62, shade(c, 0.2)], [1, shade(c, -0.6)]], 0, 0, 0.4, 1);
export const blur = () => ''; // kept for callers; glows use gradients instead of (slow) blur filters
/** A soft glow behind a shape. */
let gid = 0;
export const glowDot = (g, x, y, r, c, a = 0.85) => { const id = `${g}gd${++gid}`; return `<radialGradient id="${id}"><stop offset="0" stop-color="${c}" stop-opacity="${a}"/><stop offset=".45" stop-color="${c}" stop-opacity="${a * 0.55}"/><stop offset="1" stop-color="${c}" stop-opacity="0"/></radialGradient><circle cx="${x}" cy="${y}" r="${r * 1.7}" fill="url(#${id})"/>`; };

export const OUT = '#0c0a12'; // outline ink for every figure
export const ol = (w = 2.2) => `stroke="${OUT}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"`;
