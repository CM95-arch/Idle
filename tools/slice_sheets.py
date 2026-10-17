# Slice the sprite sheets: `python3 tools/slice_sheets.py [contactDir]`
# Reads every image in art/sheets/ (named like the Sprite Prompt Pack titles: "Enemies 3", "Heroes, battle 2"...),
# keys out the magenta, finds each figure, assigns it to its grid cell (tools/sprites/sheets.json says which cell is
# which sprite), crops all frames of one character to one shared box so the animation doesn't jitter, scales them
# down and packs each sheet into one WebP atlas in art/cut/ (the full-detail cut-outs, with art/cut/index.json saying
# where every sprite is). Then runs tools/pixelate.py, which turns those into the pixel art the game ships.
# With a directory argument, also writes contact sheets there for reviewing the cut.
import json, os, re, sys
import numpy as np
from PIL import Image, ImageDraw

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SHEETS = json.load(open(os.path.join(ROOT, 'tools', 'sprites', 'sheets.json')))
BY_ID = {s['id']: s for s in SHEETS}
SRC, OUT = os.path.join(ROOT, 'art', 'sheets'), os.path.join(ROOT, 'art', 'cut')
# how tall each kind of sprite is stored (pixels): about 3× its biggest size on screen
HEIGHT = {'hero-front': 360, 'hero-back': 240, 'enemy': 180, 'boss': 300, 'icon': 128}


def sheet_id(fname):
    """'Heroes, battle 2.png' -> 'heroes-battle-2', 'Gear icons 4.jpg' -> 'gear-4'."""
    s = re.sub(r'\.(png|jpe?g|webp)$', '', fname.lower())
    s = re.sub(r'[^a-z0-9]+', ' ', s).replace(' icons', '').replace(' in ', ' ').split()
    return '-'.join(s)


def key_magenta(im):
    """RGBA with the magenta background removed: alpha from how magenta a pixel is, and the pink fringe on soft
    edges pulled back toward the figure's own color."""
    a = np.asarray(im.convert('RGB')).astype(np.float32)
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    m = np.minimum(r, b) - g  # magenta-ness: high red and blue, low green
    alpha = np.clip((190 - m) / 120, 0, 1)
    # despill: on semi-transparent pixels, no channel may stand above green by more than the opacity allows
    spill = 1 - alpha
    r = np.where(spill > 0, np.minimum(r, g + (r - g) * alpha + 20), r)
    b = np.where(spill > 0, np.minimum(b, g + (b - g) * alpha + 20), b)
    out = np.dstack([r, g, b, alpha * 255]).clip(0, 255).astype(np.uint8)
    return out


def components(mask):
    """Label 8-connected regions of a boolean mask (two-pass union-find)."""
    h, w = mask.shape
    lab = np.zeros((h, w), np.int32)
    parent = [0]
    def find(x):
        while parent[x] != x:
            parent[x] = parent[parent[x]]; x = parent[x]
        return x
    nxt = 1
    for y in range(h):
        row, up = mask[y], lab[y - 1] if y else None
        for x in range(w):
            if not row[x]: continue
            ns = []
            if x and lab[y, x - 1]: ns.append(lab[y, x - 1])
            if y:
                for dx in (-1, 0, 1):
                    if 0 <= x + dx < w and up[x + dx]: ns.append(up[x + dx])
            if not ns:
                parent.append(nxt); lab[y, x] = nxt; nxt += 1
            else:
                m = min(find(n) for n in ns); lab[y, x] = m
                for n in ns:
                    rn = find(n)
                    if rn != m: parent[rn] = m
    roots = np.array([find(i) for i in range(len(parent))], np.int32)
    return roots[lab]


def slice_sheet(sheet, path):
    im = Image.open(path)
    W, H = im.size
    rgba = key_magenta(im)
    alpha = rgba[..., 3]
    # find figures on a quarter-size mask. Shrinking it a little breaks the thin contacts where two figures touch;
    # each core left is one figure, owned by the cell holding most of it; growing the cores back out over the
    # whole mask hands every pixel to the figure it belongs to, overhangs into the next cell included
    k = 4
    small = alpha[::k, ::k] > 40
    rows, cols = sheet['rows'], sheet['cols']
    cw, ch = W / cols, H / rows
    gy, gx = np.mgrid[0:small.shape[0], 0:small.shape[1]]
    by_grid = (np.minimum(rows - 1, (gy * k) // ch) * cols + np.minimum(cols - 1, (gx * k) // cw)).astype(np.int32)
    def shift(m, dy, dx, fill):
        out = np.full_like(m, fill)
        out[max(0, dy):m.shape[0] + min(0, dy), max(0, dx):m.shape[1] + min(0, dx)] = m[max(0, -dy):m.shape[0] + min(0, -dy), max(0, -dx):m.shape[1] + min(0, -dx)]
        return out
    core = small.copy()
    for _ in range(2):
        nb = core.copy()
        for dy in (-1, 0, 1):
            for dx in (-1, 0, 1):
                nb &= shift(core, dy, dx, False)
        core = nb
    lab = components(core)
    owner = np.full(small.shape, -1, np.int32)
    for l in np.unique(lab):
        if l == 0: continue
        sel = lab == l
        if sel.sum() < 4: continue  # specks
        cnt = np.bincount(by_grid[sel], minlength=rows * cols)
        owner[sel] = cnt.argmax() if cnt.max() >= 0.85 * sel.sum() else by_grid[sel]
    for _ in range(12):  # grow back out over the figure
        todo = small & (owner < 0)
        if not todo.any(): break
        for dy, dx in ((-1, 0), (1, 0), (0, -1), (0, 1), (-1, -1), (-1, 1), (1, -1), (1, 1)):
            nb = shift(owner, dy, dx, -1)
            take = todo & (nb >= 0) & (owner < 0)
            owner[take] = nb[take]
    left = small & (owner < 0)
    owner[left] = by_grid[left]  # loose sparks far from any figure: whichever cell they're in
    owner_full = np.kron(owner, np.ones((k, k), np.int32))[:H, :W]
    cells = []
    for i, cell in enumerate(sheet['cells']):
        if not cell: cells.append(None); continue
        # this cell's pieces: its main figure, plus anything touching or just beside it; a sliver of a neighbouring
        # figure cut off at the grid line floats apart from it and is dropped
        mine = (owner == i) & small
        if not mine.any(): cells.append(None); continue
        pl = components(mine)
        sizes = np.bincount(pl.ravel()); sizes[0] = 0
        main = sizes.argmax()
        my, mx = np.nonzero(pl == main)
        box = (my.min() - 5, mx.min() - 5, my.max() + 5, mx.max() + 5)  # the main figure, plus a little room
        ok = [main]
        for l in np.nonzero(sizes)[0]:
            if l == main: continue
            ly, lx = np.nonzero(pl == l)
            near = ly.max() >= box[0] and ly.min() <= box[2] and lx.max() >= box[1] and lx.min() <= box[3]
            if near and sizes[l] >= 0.01 * sizes[main]: ok.append(l)  # a loose spark or a held item, not a stray
        keep = np.isin(pl, ok)
        sel = (np.kron(keep, np.ones((k, k), bool))[:H, :W]) & (owner_full == i) & (alpha > 8)
        if not sel.any(): cells.append(None); continue
        ys, xs = np.nonzero(sel)
        cx0, cy0 = (i % cols) * cw, (i // cols) * ch
        # bounds relative to the cell's own corner, so frames of one character can share one box
        cells.append({'cell': cell, 'img': np.where(sel[..., None], rgba, 0).astype(np.uint8),
                      'box': (xs.min() - cx0, ys.min() - cy0, xs.max() + 1 - cx0, ys.max() + 1 - cy0), 'org': (cx0, cy0)})
    return cells


def kind_of(cell, sheet_id):
    if cell['kind'] == 'enemy': return 'boss' if sheet_id.startswith('bosses') else 'enemy'
    return cell['kind']


def main():
    contact = sys.argv[1] if len(sys.argv) > 1 else None
    os.makedirs(OUT, exist_ok=True)
    files = sorted(f for f in os.listdir(SRC) if re.search(r'\.(png|jpe?g|webp)$', f, re.I))
    sprites, atlases, missing, kinds = {}, [], [], {}
    for f in files:
        sid = sheet_id(f)
        if sid not in BY_ID: print('  ? no sheet called', sid, '(', f, ')'); continue
        sheet = BY_ID[sid]
        cells = slice_sheet(sheet, os.path.join(SRC, f))
        # group the frames of each character
        groups = {}
        for c in cells:
            if not c: continue
            groups.setdefault((c['cell']['kind'], c['cell']['id']), []).append(c)
        expected = {(c['kind'], c['id']) for c in sheet['cells'] if c}
        missing += [f'{sid}: {k[1]}' for k in expected - set(groups)]
        pieces = []  # (key, frame index, image)
        for (kind, cid), frames in groups.items():
            frames.sort(key=lambda c: c['cell'].get('frame', 0))
            x0 = min(c['box'][0] for c in frames); y0 = min(c['box'][1] for c in frames)
            x1 = max(c['box'][2] for c in frames); y1 = max(c['box'][3] for c in frames)
            kk = kind_of(frames[0]['cell'], sid)
            scale = min(1, HEIGHT[kk] / max(1, y1 - y0)) if kk != 'icon' else min(1, HEIGHT[kk] / max(1, x1 - x0, y1 - y0))
            for c in frames:
                ox, oy = c['org']
                crop = Image.fromarray(c['img']).crop((int(ox + x0), int(oy + y0), int(ox + x1), int(oy + y1)))
                if scale < 1: crop = crop.resize((max(1, round(crop.width * scale)), max(1, round(crop.height * scale))), Image.LANCZOS)
                key = {'hero-front': f'hero:{cid}:front', 'hero-back': f'hero:{cid}:back', 'enemy': f'mob:{cid}', 'icon': f'icon:{cid}'}[kind]
                pieces.append((key, c['cell'].get('frame', 0), crop))
                kinds[key] = kk
        # pack this sheet's pieces into one atlas (shelves)
        pieces.sort(key=lambda p: -p[2].height)
        aw, x, y, shelf, placed = 2048, 0, 0, 0, []
        for key, fi, img in pieces:
            if x + img.width > aw: x, y, shelf = 0, y + shelf + 2, 0
            placed.append((key, fi, img, x, y)); x += img.width + 2; shelf = max(shelf, img.height)
        atlas = Image.new('RGBA', (aw, y + shelf), (0, 0, 0, 0))
        idx = len(atlases)
        for key, fi, img, px, py in placed:
            atlas.paste(img, (px, py))
            sprites.setdefault(key, {})[fi] = [idx, px, py, img.width, img.height]
        name = f'{sid}.webp'
        atlas.save(os.path.join(OUT, name), 'WEBP', quality=86, method=6)
        atlases.append([name, atlas.width, atlas.height])
        print(f'  {sid:18s} {len(groups):3d} sprites  {os.path.getsize(os.path.join(OUT, name)) // 1024} KB')
    # frames in order
    table = {k: [v[i] for i in sorted(v)] for k, v in sorted(sprites.items())}
    with open(os.path.join(OUT, 'index.json'), 'w') as f:
        json.dump({'atlases': atlases, 'sprites': {k: {'kind': kinds[k], 'frames': v} for k, v in table.items()}}, f, indent=0)
    print(f'{len(table)} sprites, {len(atlases)} atlases, {sum(os.path.getsize(os.path.join(OUT, a[0])) for a in atlases) // 1024} KB total')
    if missing: print('MISSING:', *missing, sep='\n  ')
    if contact: contact_sheets(contact, table, atlases)
    import pixelate
    pixelate.main()


def contact_sheets(d, table, atlases):
    """One review image per kind: every sprite with all its frames, labelled, on a grey ground."""
    os.makedirs(d, exist_ok=True)
    imgs = [Image.open(os.path.join(OUT, a[0])) for a in atlases]
    for prefix, label in (('hero:', 'heroes'), ('mob:', 'creatures'), ('icon:', 'gear')):
        keys = [k for k in table if k.startswith(prefix)]
        tile = 120 if prefix != 'icon:' else 72
        per_row = 4 if prefix != 'icon:' else 12
        rows_ = []
        for k in keys:
            fr = table[k]
            row = Image.new('RGB', (tile * (1 if prefix == 'icon:' else 4) + (0 if prefix == 'icon:' else 150), tile + (0 if prefix == 'icon:' else 0)), (128, 130, 136))
            for i, (a, x, y, w, h) in enumerate(fr):
                im = imgs[a].crop((x, y, x + w, y + h)); im.thumbnail((tile - 6, tile - 6))
                row.paste(im, (i * tile + (tile - im.width) // 2, tile - im.height - 3), im)
            if prefix != 'icon:': ImageDraw.Draw(row).text((tile * 4 + 6, tile // 2 - 6), k.split(':')[1][:22], fill=(255, 255, 255))
            rows_.append(row)
        if not rows_: continue
        cols = per_row if prefix == 'icon:' else 2
        rw, rh = rows_[0].width, rows_[0].height
        n = (len(rows_) + cols - 1) // cols
        sheet = Image.new('RGB', (rw * cols, rh * n), (110, 112, 118))
        for i, r in enumerate(rows_): sheet.paste(r, ((i % cols) * rw, (i // cols) * rh))
        sheet.save(os.path.join(d, f'contact-{label}.jpg'), quality=85)


if __name__ == '__main__':
    main()
