# Cut the pixel-art sheets in art/pixel/ into sprites: `python3 tools/pixel_sheets.py [previewDir]`
# Removes the magenta background and cuts each figure out along its own outline, so nothing that reaches past its
# grid cell is clipped. Then each figure is put back on its true pixel grid (generated pixel art is drawn big, with
# soft edges and pixels of slightly uneven size): one color per pixel, stored at one pixel per art pixel. Every
# snapped sprite is drawn back up and compared with the sheet; one that doesn't match closely is printed as a
# warning and kept as drawn instead (shrunk smoothly to the same scale).
# Sheets are 5×5 grids; tools/sprites/pixel_sheets.json names what is in each cell, row by row. Each figure goes to
# the cell its body sits in. Packs each sheet into assets/pixels/<sheet>.png and writes js/data/pixels.js.
import json, os, sys
from collections import deque
import numpy as np
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC, OUT = os.path.join(ROOT, 'art', 'pixel'), os.path.join(ROOT, 'assets', 'pixels')
NAMES = json.load(open(os.path.join(ROOT, 'tools', 'sprites', 'pixel_sheets.json')))
Q = 4  # pieces are found on a quarter-size mask (fast), then cut from the full-size sheet


def background(a):
    """The magenta, and the pink blend where a soft edge met it."""
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    return (np.minimum(r, b) - g > 70) & (r > 120) & (b > 110)


def pieces(mask):
    """Connected pieces of a boolean mask (8-way): a list of (pixel count, ys, xs)."""
    h, w = mask.shape
    seen = np.zeros_like(mask); out = []
    for y0, x0 in zip(*np.nonzero(mask)):
        if seen[y0, x0]: continue
        q = deque([(y0, x0)]); seen[y0, x0] = True; ys, xs = [], []
        while q:
            y, x = q.popleft(); ys.append(y); xs.append(x)
            for dy in (-1, 0, 1):
                for dx in (-1, 0, 1):
                    ny, nx = y + dy, x + dx
                    if 0 <= ny < h and 0 <= nx < w and mask[ny, nx] and not seen[ny, nx]: seen[ny, nx] = True; q.append((ny, nx))
        out.append((len(ys), np.array(ys), np.array(xs)))
    return out


def comb(sig, p):
    """How well a grid of pitch p fits the edges along one axis (edges on the lines, not between them), and its phase."""
    n = len(sig); k = np.arange(-1, n / p + 1); best = (-1e9, 0)
    for off in np.arange(0, p, 0.25):
        idx = np.round(off + k * p).astype(int); idx = idx[(idx >= 0) & (idx < n)]
        mid = np.round(off + (k + 0.5) * p).astype(int); mid = mid[(mid >= 0) & (mid < n)]
        sc = sig[idx].mean() - sig[mid].mean()
        if sc > best[0]: best = (sc, off)
    return best


def snap(rgb, alpha, lo=6.0, hi=16.0):
    """A cut-out figure on its true pixel grid: (RGBA image at one pixel per art pixel, pitch, how far off it is)."""
    g = rgb.sum(2).astype(float)
    ex = np.concatenate([[0], np.abs(np.diff(g, axis=1)).sum(0)]); ey = np.concatenate([[0], np.abs(np.diff(g, axis=0)).sum(1)])
    best = (-1e9, 0, 0, 0)
    for p in np.arange(lo, hi, 0.02):
        sx, ox = comb(ex, p); sy, oy = comb(ey, p)
        if sx + sy > best[0]: best = (sx + sy, p, ox, oy)
    _, p, ox, oy = best
    ox -= p * np.ceil(ox / p); oy -= p * np.ceil(oy / p)  # start the grid at or before the left/top edge
    H, W = alpha.shape
    cols, rows = int(np.ceil((W - ox) / p)), int(np.ceil((H - oy) / p))
    out = np.zeros((rows, cols, 4), np.uint8)
    for j in range(rows):
        for i in range(cols):
            y0, x0 = oy + j * p, ox + i * p
            ya, yb = max(0, int(y0 + p * 0.25)), min(H, int(y0 + p * 0.75) + 1)
            xa, xb = max(0, int(x0 + p * 0.25)), min(W, int(x0 + p * 0.75) + 1)
            if ya >= yb or xa >= xb: continue
            m = alpha[ya:yb, xa:xb]
            if m.mean() < 0.35: continue  # edge squares are often only partly covered on the sheet
            out[j, i, :3] = np.median(rgb[ya:yb, xa:xb][m], 0); out[j, i, 3] = 255
    # an edge pixel tinted by the magenta it blended into is background, not figure (the figures are outlined in
    # black, so a real edge pixel is dark, never purple-pink)
    on = out[..., 3] > 0
    pad = np.pad(on, 1)
    edge = on & ~(pad[:-2, 1:-1] & pad[2:, 1:-1] & pad[1:-1, :-2] & pad[1:-1, 2:])
    c = out[..., :3].astype(int)
    pink = (np.minimum(c[..., 0], c[..., 2]) - c[..., 1] > 35) & (c[..., 0] > 70)
    out[edge & pink, 3] = 0
    # draw it back up at the sheet's size and compare
    jj = np.clip(((np.arange(H) - oy) // p).astype(int), 0, rows - 1); ii = np.clip(((np.arange(W) - ox) // p).astype(int), 0, cols - 1)
    up = out[jj][:, ii]
    ua = up[..., 3] > 0
    shape_off = (ua != alpha).sum() / max(1, (ua | alpha).sum())
    both = ua & alpha
    color_off = np.abs(up[..., :3].astype(int) - rgb.astype(int))[both].mean() if both.any() else 999
    im = Image.fromarray(out, 'RGBA')
    return im.crop(im.getbbox()), p, shape_off, color_off


def main():
    prev = sys.argv[1] if len(sys.argv) > 1 else None
    os.makedirs(OUT, exist_ok=True)
    atlases, table = [], {}
    for sheet, names in NAMES.items():
        path = next((os.path.join(SRC, f) for f in os.listdir(SRC) if os.path.splitext(f)[0] == sheet), None)
        if not path: print('  missing', sheet); continue
        a = np.asarray(Image.open(path).convert('RGB')).astype(np.int16)
        H, W = a.shape[:2]
        fg = ~background(a)
        small = fg[: H // Q * Q, : W // Q * Q].reshape(H // Q, Q, W // Q, Q).any(axis=(1, 3))
        # every piece belongs to the cell its middle is in; specks (a few stray pixels) are dropped
        cells = {}
        for n, ys, xs in pieces(small):
            if n < 6: continue
            r, c = min(4, int(ys.mean() * Q * 5 // H)), min(4, int(xs.mean() * Q * 5 // W))
            cells.setdefault(r * 5 + c, []).append((n, ys, xs))
        out, cuts = [], []
        for i, key in enumerate(names):
            if not key or i not in cells: print('  empty cell', key); continue
            ps = cells[i]; big = max(p[0] for p in ps)
            ps = [p for p in ps if p[0] >= big * 0.02]  # a staff tip or a floating spark stays, dust doesn't
            y0 = min(p[1].min() for p in ps) * Q; y1 = (max(p[1].max() for p in ps) + 1) * Q
            x0 = min(p[2].min() for p in ps) * Q; x1 = (max(p[2].max() for p in ps) + 1) * Q
            keep = np.zeros((H, W), bool)
            for _, ys, xs in ps:
                for y, x in zip(ys, xs): keep[y * Q:(y + 1) * Q, x * Q:(x + 1) * Q] = True
            crop = a[y0:y1, x0:x1].astype(np.uint8)
            alpha = (fg & keep)[y0:y1, x0:x1]
            cuts.append((key, crop, alpha))
        # a sheet is drawn at one pixel size, give or take: find each sprite's grid near the sheet's usual pitch
        first = [snap(c.astype(np.int16), al)[1] for _, c, al in cuts]
        usual = float(np.median(first))
        for key, crop, alpha in cuts:
            sp, pitch, shape_off, color_off = snap(crop.astype(np.int16), alpha, usual - 0.8, usual + 0.8)
            ok = shape_off < 0.12 and color_off < 40
            print(f'  {key:22s} pitch {pitch:5.2f}  {sp.width}x{sp.height}  shape off {shape_off:5.1%}  color off {color_off:4.1f}' + ('' if ok else '   KEPT AS DRAWN'))
            if not ok:
                im = Image.fromarray(np.dstack([crop, alpha * 255]).astype(np.uint8), 'RGBA'); im = im.crop(im.getbbox())
                sp = im.resize((max(1, round(im.width / pitch)), max(1, round(im.height / pitch))), Image.LANCZOS)
            out.append((key, sp))
        out.sort(key=lambda p: -p[1].height)
        aw, x, y, shelf, placed = 256, 0, 0, 0, []
        for key, im in out:
            if x + im.width > aw: x, y, shelf = 0, y + shelf + 1, 0
            placed.append((key, im, x, y)); x += im.width + 1; shelf = max(shelf, im.height)
        atlas = Image.new('RGBA', (aw, y + shelf), (0, 0, 0, 0))
        for key, im, ax, ay in placed:
            atlas.paste(im, (ax, ay)); table[key] = [len(atlases), ax, ay, im.width, im.height]
        name = f'{sheet}.png'
        atlas.save(os.path.join(OUT, name), optimize=True)
        atlases.append([name, atlas.width, atlas.height])
        print(f'  {sheet}: {len(out)} sprites, {os.path.getsize(os.path.join(OUT, name)) // 1024} KB')
        if prev:
            os.makedirs(prev, exist_ok=True)
            bg = Image.new('RGBA', atlas.size, (90, 100, 80, 255)); bg.alpha_composite(atlas)
            bg.convert('RGB').resize((atlas.width * 5, atlas.height * 5), Image.NEAREST).save(os.path.join(prev, f'{sheet}-preview.png'))
    with open(os.path.join(ROOT, 'js', 'data', 'pixels.js'), 'w') as f:
        f.write('// Generated by tools/pixel_sheets.py from the sheets in art/pixel/. Do not edit by hand.\n')
        f.write('// Each sprite: [atlas, x, y, w, h] in art pixels; an atlas is [file in assets/pixels/, width, height].\n')
        f.write(f'export const ATLASES = {json.dumps(atlases)};\n')
        f.write('export const PIXELS = {\n' + ''.join(f'  {json.dumps(k)}: {json.dumps(v)},\n' for k, v in sorted(table.items())) + '};\n')
    print(f'{len(table)} sprites')


if __name__ == '__main__':
    main()
