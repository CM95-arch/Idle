// The pixel-art sprites (made from the sheets in art/pixel/ by tools/pixel_sheets.py). A hero or creature that has
// one is drawn with it, crisp and unsmoothed; anything without one keeps its drawn art. The atlases are tiny, so
// they all load at startup.
import { PIXELS, ATLASES } from '../../data/pixels.js';

const atlasImgs = ATLASES.map(([file]) => { const im = new Image(); im.onload = () => { im.ready = true; }; im.src = `assets/pixels/${file}`; return im; });
const cache = new Map();

/** The key a creature's sprite is filed under: its name as a slug ("Usurper's Henchman" -> "mob:usurpers-henchman"). */
export const mobKey = (name) => `mob:${name.toLowerCase().replace(/[’']/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`;
export const hasPixel = (key) => !!PIXELS[key];

/** A sprite as { key, bmp, w, h } in art pixels (the shape the drawn art has, so hit flashes work on it), or null
 * if there is none or its atlas hasn't arrived yet. */
export function pixelArt(key) {
  const hit = cache.get(key);
  if (hit) return hit;
  const P = PIXELS[key];
  if (!P) return null;
  const [a, x, y, w, h] = P, im = atlasImgs[a];
  if (!im.ready) return null;
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
  cv.getContext('2d').drawImage(im, x, y, w, h, 0, 0, w, h);
  const art = { key: `px:${key}`, bmp: cv, w, h };
  cache.set(key, art);
  return art;
}

/** A sprite as a page element at `scale` screen pixels per art pixel (a CSS background on its atlas). */
export function pixelEl(key, scale, cls = 'figure pixel') {
  const P = PIXELS[key];
  if (!P) return null;
  const [a, x, y, w, h] = P, [file, aw, ah] = ATLASES[a];
  const el = document.createElement('span');
  el.className = cls; el.setAttribute('role', 'img');
  Object.assign(el.style, {
    width: `${w * scale}px`, height: `${h * scale}px`,
    backgroundImage: `url(assets/pixels/${file})`, backgroundSize: `${aw * scale}px ${ah * scale}px`, backgroundPosition: `${-x * scale}px ${-y * scale}px`,
  });
  return el;
}
/** The scale for a figure in a box `size` screen pixels tall: the same for every hero (sized for the tallest), in
 * whole steps when it's big enough, so each art pixel is a clean square and no hero looks bigger than another. */
export const fitScale = (key, size) => { const s = size / 31; return s >= 2 ? Math.floor(s) : s; };
