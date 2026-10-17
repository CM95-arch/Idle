// The painted sprites (cut from the sprite sheets by tools/slice_sheets.py). Every hero, creature and piece of gear
// that has one uses it; anything without one keeps its drawn art. Atlases load the first time something asks
// for them, so a fight only fetches the sheets it shows.
import { SPRITES, ATLASES } from '../../data/sprites.js';

const atlasImgs = [];
const frames = new Map();
function atlas(i) {
  let im = atlasImgs[i];
  if (!im) {
    im = new Image(); im.decoding = 'async';
    im.onload = () => { im.ready = true; };
    im.src = `assets/sprites/${ATLASES[i][0]}`;
    atlasImgs[i] = im;
  }
  return im;
}
/** The key a creature's sprite is filed under: its name, as a slug ("Usurper's Henchman" -> "usurpers-henchman"). */
export const mobKey = (name) => `mob:${name.toLowerCase().replace(/[’']/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`;
export const hasSprite = (key) => !!SPRITES[key];
export const frameCount = (key) => SPRITES[key]?.length || 0;
/** Start loading every atlas these sprites live in. */
export function preload(keys) { for (const k of keys) for (const f of SPRITES[k] || []) atlas(f[0]); }

/** Frame `i` of a sprite as { key, bmp, w, h } (the shape the drawn art has, so hit flashes work on it), or null
 * while its atlas is still loading or if there is no such sprite. */
export function spriteFrame(key, i = 0) {
  const all = SPRITES[key];
  if (!all) return null;
  const n = Math.min(i, all.length - 1), id = `${key}|${n}`;
  const hit = frames.get(id);
  if (hit) return hit;
  const [a, x, y, w, h] = all[n], im = atlas(a);
  if (!im.ready) return null;
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
  cv.getContext('2d').drawImage(im, x, y, w, h, 0, 0, w, h);
  const art = { key: id, bmp: cv, w, h };
  frames.set(id, art);
  return art;
}

/** A sprite frame as a page element, fitted inside a `boxW` × `boxH` box (a CSS background on its atlas, so it
 * shows as soon as the atlas arrives with no script involved). */
export function spriteEl(key, boxW, boxH, i = 0, cls = 'figure sprite') {
  const all = SPRITES[key];
  if (!all) return null;
  const [a, x, y, w, h] = all[Math.min(i, all.length - 1)], [file, aw, ah] = ATLASES[a];
  const s = Math.min(boxW / w, boxH / h);
  const el = document.createElement('span');
  el.className = cls; el.setAttribute('role', 'img');
  Object.assign(el.style, {
    width: `${Math.round(w * s)}px`, height: `${Math.round(h * s)}px`,
    backgroundImage: `url(assets/sprites/${file})`, backgroundSize: `${aw * s}px ${ah * s}px`, backgroundPosition: `${-x * s}px ${-y * s}px`,
  });
  return el;
}
