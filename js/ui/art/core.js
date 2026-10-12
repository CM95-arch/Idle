// Vector art helpers: SVG markup → cached images, color math, gradient defs.
// Every character and item is built as SVG once, rasterized by the browser, then drawn on canvas or shown in the UI.

const cache = new Map();
/** An <img> for an SVG built on demand. `scale` sets the raster size relative to the viewBox. */
export function svgImage(key, w, h, build, scale = 1.6) {
  let img = cache.get(key);
  if (img) return img;
  img = new Image();
  img.decoding = 'async';
  const body = build();
  img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${Math.round(w * scale)}" height="${Math.round(h * scale)}">${body}</svg>`)}`;
  img.vw = w; img.vh = h;
  cache.set(key, img);
  return img;
}
export const ready = (img) => img && img.complete && img.naturalWidth > 0;

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
export const blur = (id, d = 3) => `<filter id="${id}" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="${d}"/></filter>`;
/** A soft glow behind a shape. */
export const glowDot = (g, x, y, r, c, a = 0.85) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${c}" opacity="${a}" filter="url(#${g}bl)"/>`;

export const OUT = '#0c0a12'; // outline ink for every figure
export const ol = (w = 2.2) => `stroke="${OUT}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"`;
