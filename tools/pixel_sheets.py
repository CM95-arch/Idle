# Turn the pixel-art sheets in art/pixel/ into true pixel sprites: `python3 tools/pixel_sheets.py [previewDir]`
# Generated "pixel art" is drawn big and a little soft, with pixels of slightly uneven size. This finds the sheet's
# real pixel grid, takes one color per grid square, keys out the magenta, cuts out each sprite (sheets are 5×5 grids;
# tools/sprites/pixel_sheets.json names what is in each cell, row by row) and packs them into
# assets/pixels/<sheet>.png at one art pixel per pixel. Writes js/data/pixels.js: where every sprite is.
import json, os, sys
import numpy as np
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC, OUT = os.path.join(ROOT, 'art', 'pixel'), os.path.join(ROOT, 'assets', 'pixels')
NAMES = json.load(open(os.path.join(ROOT, 'tools', 'sprites', 'pixel_sheets.json')))


def comb(sig, p):
    """How well a grid of pitch p fits the edges along one axis (edges on the lines, not between them), and its phase."""
    n = len(sig); k = np.arange(0, n / p); best = (-1e9, 0)
    for off in np.arange(0, p, 0.25):
        idx = np.round(off + k * p).astype(int); idx = idx[idx < n]
        mid = np.round(off + (k + 0.5) * p).astype(int); mid = mid[mid < n]
        sc = sig[idx].mean() - sig[mid].mean()
        if sc > best[0]: best = (sc, off)
    return best


def grid(ex, ey, lo=5.5, hi=10.5):
    """The pixel pitch (square pixels: one pitch for both axes) and the phase along each."""
    best = (-1e9, 0, 0, 0)
    for p in np.arange(lo, hi, 0.02):
        sx, ox = comb(ex, p); sy, oy = comb(ey, p)
        if sx + sy > best[0]: best = (sx + sy, p, ox, oy)
    return best[1:]


def magenta(rgb):
    """The background, and the pink blend where a soft edge met it."""
    r, g, b = rgb[..., 0].astype(int), rgb[..., 1].astype(int), rgb[..., 2].astype(int)
    return (np.minimum(r, b) - g > 70) & (r > 120) & (b > 110)


def keep_body(sp):
    """Drop specks: keep the biggest connected piece and any piece at least a tenth its size (a separate staff tip,
    a floating eye), and nothing else."""
    from collections import deque
    on = sp[..., 3] > 0; h, w = on.shape
    lab = np.zeros((h, w), int); sizes = [0]
    for y in range(h):
        for x in range(w):
            if not on[y, x] or lab[y, x]: continue
            n = len(sizes); q = deque([(y, x)]); lab[y, x] = n; c = 0
            while q:
                cy, cx = q.popleft(); c += 1
                for dy in (-1, 0, 1):
                    for dx in (-1, 0, 1):
                        ny, nx = cy + dy, cx + dx
                        if 0 <= ny < h and 0 <= nx < w and on[ny, nx] and not lab[ny, nx]: lab[ny, nx] = n; q.append((ny, nx))
            sizes.append(c)
    if len(sizes) == 1: return sp
    big = max(sizes); keep = [i for i, c in enumerate(sizes) if i and c >= big / 10]
    out = sp.copy(); out[~np.isin(lab, keep), 3] = 0
    return out


def edges(a):
    gray = a.sum(2)
    ex = np.abs(np.diff(gray, axis=1)).sum(0); ey = np.abs(np.diff(gray, axis=0)).sum(1)
    return np.concatenate([[0], ex]).astype(float), np.concatenate([[0], ey]).astype(float)


def sample(a):
    """One cell of the sheet as true pixels: find its grid, then one color per grid square (the median of its middle
    half, so the soft edges between squares don't bleed in)."""
    p, ox, oy = grid(*edges(a))
    cols = int((a.shape[1] - ox) // p); rows = int((a.shape[0] - oy) // p)
    out = np.zeros((rows, cols, 4), np.uint8)
    for j in range(rows):
        y0 = oy + j * p
        for i in range(cols):
            x0 = ox + i * p
            blk = a[int(y0 + p * 0.25):int(y0 + p * 0.75) + 1, int(x0 + p * 0.25):int(x0 + p * 0.75) + 1].reshape(-1, 3)
            c = np.median(blk, 0).astype(np.uint8)
            out[j, i, :3] = c; out[j, i, 3] = 0 if magenta(c[None, None])[0, 0] else 255
    return out, p


def tidy(sp):
    """Snap near-identical colors together (the source wobbles a little within one flat area)."""
    im = Image.fromarray(sp)
    a = im.split()[3]
    q = im.convert('RGB').quantize(32, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE).convert('RGBA')
    q.putalpha(a)
    return q


def main():
    prev = sys.argv[1] if len(sys.argv) > 1 else None
    os.makedirs(OUT, exist_ok=True)
    atlases, table = [], {}
    for sheet, names in NAMES.items():
        path = next((os.path.join(SRC, f) for f in os.listdir(SRC) if os.path.splitext(f)[0] == sheet), None)
        if not path: print('  missing', sheet); continue
        a = np.asarray(Image.open(path).convert('RGB')).astype(np.int16)
        H, W = a.shape[:2]
        pieces = []
        for n, key in enumerate(names):
            if not key: continue
            r, c = divmod(n, 5)
            cell, pitch = sample(a[round(r * H / 5):round((r + 1) * H / 5), round(c * W / 5):round((c + 1) * W / 5)])
            cell = keep_body(cell)
            ys, xs = np.nonzero(cell[..., 3])
            if not len(ys): print('  empty cell', key); continue
            sp = cell[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
            print(f'  {key:22s} pitch {pitch:5.2f}  {sp.shape[1]}x{sp.shape[0]}')
            pieces.append((key, tidy(sp)))
        pieces.sort(key=lambda p: -p[1].height)
        aw, x, y, shelf, placed = 256, 0, 0, 0, []
        for key, im in pieces:
            if x + im.width > aw: x, y, shelf = 0, y + shelf + 1, 0
            placed.append((key, im, x, y)); x += im.width + 1; shelf = max(shelf, im.height)
        atlas = Image.new('RGBA', (aw, y + shelf), (0, 0, 0, 0))
        for key, im, ax, ay in placed:
            atlas.paste(im, (ax, ay)); table[key] = [len(atlases), ax, ay, im.width, im.height]
        name = f'{sheet}.png'
        atlas.save(os.path.join(OUT, name), optimize=True)
        atlases.append([name, atlas.width, atlas.height])
        if prev:
            os.makedirs(prev, exist_ok=True)
            big = Image.new('RGBA', (atlas.width, atlas.height), (90, 100, 80, 255)); big.alpha_composite(atlas)
            big.resize((atlas.width * 4, atlas.height * 4), Image.NEAREST).save(os.path.join(prev, f'{sheet}-preview.png'))
    with open(os.path.join(ROOT, 'js', 'data', 'pixels.js'), 'w') as f:
        f.write('// Generated by tools/pixel_sheets.py from the sheets in art/pixel/. Do not edit by hand.\n')
        f.write('// Each sprite: [atlas, x, y, w, h] in art pixels; an atlas is [file in assets/pixels/, width, height].\n')
        f.write(f'export const ATLASES = {json.dumps(atlases)};\n')
        f.write('export const PIXELS = {\n' + ''.join(f'  {json.dumps(k)}: {json.dumps(v)},\n' for k, v in sorted(table.items())) + '};\n')
    print(f'{len(table)} sprites')


if __name__ == '__main__':
    main()
