# Sprite prompt pack: `python3 tools/sprite_pack.py <out.html>`
# Plans every sprite sheet for the art overhaul from the game's own data: heroes (front portrait, plus a rear view
# in four attack frames for battle), every enemy and boss (three walk frames), every piece of gear (one icon).
# Writes tools/sprites/sheets.json (which cell of which sheet is which sprite; tools/slice_sheets.py reads it)
# and a page with one ready-to-paste image prompt per sheet.
import colorsys, html, json, os, re, subprocess, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from sprite_looks import HEROES, ENEMIES, KIND_LOOK  # noqa: E402

data = json.loads(subprocess.check_output(['node', '-e', """
(async()=>{const {ZONES}=await import('./js/data/zones.js');const {UNIQUES}=await import('./js/data/uniques.js');
const {CLASS_IDS}=await import('./js/data/classes.js');
const seen=new Set(), enemies=[], bosses=[];
for(const z of ZONES){for(const e of z.enemies){if(!seen.has(e[0])){seen.add(e[0]);enemies.push({name:e[0],zone:z.name});}}
  if(!seen.has(z.boss[0])){seen.add(z.boss[0]);bosses.push({name:z.boss[0],zone:z.name});}}
const items=UNIQUES.map(u=>({id:u.id,name:u.name,kind:u.kind,pal:u.pal,mythic:!!u.exalted,zone:(ZONES.find(z=>z.id===u.src)||{}).name}));
console.log(JSON.stringify({classes:CLASS_IDS,enemies,bosses,items}));})()"""], cwd=ROOT))

slug = lambda s: re.sub(r'[^a-z0-9]+', '-', s.lower().replace('’', '').replace("'", '')).strip('-')


def color_word(hexc):
    r, g, b = (int(hexc[i:i + 2], 16) / 255 for i in (1, 3, 5))
    h, l, s = colorsys.rgb_to_hls(r, g, b)
    if l > 0.88: return 'white'
    if l < 0.14: return 'near-black'
    if s < 0.15: return 'grey' if l < 0.7 else 'pale grey'
    names = [(15, 'red'), (40, 'orange'), (55, 'gold'), (70, 'yellow'), (160, 'green'), (195, 'teal'), (250, 'blue'), (290, 'violet'), (335, 'magenta'), (360, 'red')]
    hue = h * 360
    word = next(n for lim, n in names if hue <= lim)
    return ('dark ' if l < 0.3 else 'pale ' if l > 0.72 else '') + word


STYLE = (
    'Art style: stylized low-poly painterly fantasy concept art. Faceted geometric planes with soft painterly brush shading, '
    'clean readable silhouettes, a muted earthy palette (sage green, rust, ochre, slate, bone) with small glowing accents. '
    'Realistic adult proportions: not chibi, not cartoon, not pixel art. Every humanoid has a blank, smooth, featureless '
    'mannequin face (no eyes, nose or mouth) or a face lost in hood shadow. Soft light from the upper left.\n'
    'Background: one flat solid magenta (#FF00FF) everywhere, with no gradient, scenery, floor, cast shadow, reflection, '
    'text, numbers, labels, grid lines or borders.'
)
GRID = ('Layout: an exact grid of {rows} rows by {cols} columns of equal, invisible cells. One figure per cell, centered, '
        'entirely inside its cell with a small margin; nothing crosses into another cell. ')
STAND = 'All figures share one scale and stand on the same baseline near the bottom of their cell.'
ICON = 'All items share one scale.'

sheets = []


def add(sid, title, size, rows, cols, intro, cells, lines, rule=None):
    sheets.append({'id': sid, 'title': title, 'size': size, 'rows': rows, 'cols': cols, 'cells': cells,
                   'prompt': f"{STYLE}\n\nImage: {size} pixels. {GRID.format(rows=rows, cols=cols)}{rule or STAND}\n{intro}\n\n" + '\n'.join(lines)})


# heroes: one front portrait each (Party screen, tiles)
H = data['classes']
lines, cells = [], []
for i, c in enumerate(H):
    name, look, _ = HEROES[c]
    lines.append(f'{i + 1}. {name}: {look}. Standing, facing the viewer, full body.')
    cells.append({'kind': 'hero-front', 'id': c})
for i in range(len(H), 12):
    lines.append(f'{i + 1}. Leave this cell empty (plain magenta).'); cells.append(None)
add('heroes-front', 'Heroes, front', '1024×1536 portrait', 4, 3,
    'Eleven fantasy heroes, each facing the viewer. Cells in reading order (left to right, top to bottom):', cells, lines)

# heroes in battle: seen from behind, one hero per row in four frames (ready, wind-up, strike, follow-through)
for n in range(0, len(H), 3):
    group = H[n:n + 3]
    lines, cells = [], []
    for i, c in enumerate(group):
        name, look, (wind, strike, follow) = HEROES[c]
        lines.append(f'Row {i + 1}: {name} ({look}). Frame 1 standing ready; frame 2 {wind}; frame 3 {strike}; frame 4 {follow}.')
        cells += [{'kind': 'hero-back', 'id': c, 'frame': f} for f in range(4)]
    while len(cells) < 12: cells.append(None)
    if len(group) < 3: lines.append('Leave the remaining rows empty (plain magenta).')
    add(f'heroes-battle-{n // 3 + 1}', f'Heroes in battle {n // 3 + 1}', '1536×1024 landscape', 3, 4,
        'Fantasy heroes seen from behind and slightly above (three-quarter rear view), facing away from the viewer toward the '
        'top of the image, as if facing an oncoming horde. Each row is ONE hero shown in four animation frames of a single '
        'attack, left to right; every frame shows the same hero at the same size, colors and position, only the pose changes, '
        'so the frames play as smooth motion. Rows:', cells, lines)


# creatures: one per row in three walk frames (left step, passing, right step; played 1-2-3-2)
def creature_sheets(prefix, title, items, extra):
    for n in range(0, len(items), 4):
        group = items[n:n + 4]
        cells, lines = [], []
        for i, e in enumerate(group):
            lines.append(f'Row {i + 1}: {e["name"]} ({e["zone"]}): {ENEMIES[e["name"]]}.')
            cells += [{'kind': 'enemy', 'id': slug(e['name']), 'name': e['name'], 'frame': f} for f in range(3)]
        while len(cells) < 12: cells.append(None)
        if len(group) < 4: lines.append('Leave the remaining rows empty (plain magenta).')
        add(f'{prefix}-{n // 4 + 1}', f'{title} {n // 4 + 1}', '1024×1536 portrait', 4, 3,
            'Fantasy creatures facing the viewer, walking toward the viewer. Each row is ONE creature shown in three frames of a '
            'walk cycle, left to right: frame 1 left foot forward, frame 2 passing (feet together, body slightly higher), '
            'frame 3 right foot forward. Every frame shows the same creature at the same size, colors and position, only the pose '
            'changes. A creature without legs sways or squashes instead: leaning left, upright and stretched, leaning right. '
            + (extra + ' ' if extra else '') + 'Rows:', cells, lines)


creature_sheets('enemies', 'Enemies', data['enemies'], '')
creature_sheets('bosses', 'Bosses', data['bosses'], 'These are bosses: make them grand and imposing, filling most of their cell.')

# gear icons: 5 × 6 per sheet
items = data['items']
for n in range(0, len(items), 30):
    group = items[n:n + 30]
    lines, cells = [], []
    for i, it in enumerate(group):
        cols = ', '.join(dict.fromkeys(color_word(c) for c in it['pal']))
        lines.append(f'{i + 1}. {it["name"]}: {KIND_LOOK[it["kind"]]} in {cols}{"; ornate, with a faint golden glow" if it["mythic"] else ""}.')
        cells.append({'kind': 'icon', 'id': it['id']})
    while len(cells) < 30: cells.append(None)
    if len(group) < 30: lines.append('Leave the remaining cells empty (plain magenta).')
    add(f'gear-{n // 30 + 1}', f'Gear icons {n // 30 + 1}', '1024×1536 portrait', 6, 5,
        'Inventory icons for a fantasy game: each item alone, centered, turned slightly, filling about 80 percent of its cell, '
        'all with the same lighting and edge treatment. Items in reading order:', cells, lines, ICON)

os.makedirs(os.path.join(ROOT, 'tools', 'sprites'), exist_ok=True)
with open(os.path.join(ROOT, 'tools', 'sprites', 'sheets.json'), 'w') as f:
    json.dump([{k: s[k] for k in ('id', 'title', 'size', 'rows', 'cols', 'cells')} for s in sheets], f, indent=1)

# ---------- the page ----------
out = sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, 'tools', 'sprites', 'prompts.html')
counts = {'heroes': sum(1 for s in sheets if s['id'].startswith('heroes')), 'enemies': sum(1 for s in sheets if s['id'].startswith('enemies')),
          'bosses': sum(1 for s in sheets if s['id'].startswith('bosses')), 'gear': sum(1 for s in sheets if s['id'].startswith('gear'))}
cards = []
for i, s in enumerate(sheets):
    group = s['id'].split('-')[0]
    cards.append(f'''<article class="sheet" data-group="{group}" id="{s['id']}">
  <header><label class="done"><input type="checkbox" id="done-{s['id']}" data-done="{s['id']}"><span>{html.escape(s['title'])}</span></label>
  <span class="meta">{s['size']} · {s['rows']}×{s['cols']} grid · upload as <code>{s['id']}</code></span></header>
  <pre id="p-{s['id']}">{html.escape(s['prompt'])}</pre>
  <button class="copy" data-copy="p-{s['id']}">Copy prompt</button>
</article>''')

page = f'''<title>Sprite Prompt Pack</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Marcellus&family=Karla:wght@400;600;800&family=JetBrains+Mono:wght@400;600&display=swap">
<style>
/* layout: one reading column; a sticky filter bar; each sheet a card with its prompt and a copy button */
:root {{
  --bg: #e8e6e1; --panel: #f4f2ee; --fg: #23262a; --muted: #5d6268; --line: #cfcbc2;
  --sage: #5f7a5c; --rust: #a4553a; --code: #ebe8e1;
  --display: 'Marcellus', Georgia, serif; --body: 'Karla', system-ui, sans-serif; --mono: 'JetBrains Mono', ui-monospace, monospace;
}}
@media (prefers-color-scheme: dark) {{ :root:not([data-theme="light"]) {{ --bg: #1c1f22; --panel: #24282c; --fg: #e4e1da; --muted: #9aa0a6; --line: #363b40; --sage: #9cb894; --rust: #e0906e; --code: #1a1d20; color-scheme: dark; }} }}
:root[data-theme="dark"] {{ --bg: #1c1f22; --panel: #24282c; --fg: #e4e1da; --muted: #9aa0a6; --line: #363b40; --sage: #9cb894; --rust: #e0906e; --code: #1a1d20; color-scheme: dark; }}
body {{ background: var(--bg); color: var(--fg); font: 16px/1.55 var(--body); padding-left: max(16px, env(safe-area-inset-left, 0px)); padding-right: max(16px, env(safe-area-inset-right, 0px)); padding-block: 24px 64px; }}
body::before {{ content: ""; position: fixed; inset: 0 0 auto; height: env(safe-area-inset-top, 0px); z-index: 10; background: var(--bg); }}
main {{ max-width: 860px; margin: 0 auto; display: flex; flex-direction: column; gap: 22px; }}
h1 {{ font: 400 clamp(30px, 6vw, 44px)/1.1 var(--display); margin: 0; letter-spacing: .5px; text-wrap: balance; }}
h2 {{ font: 400 22px/1.2 var(--display); margin: 0 0 8px; }}
.lead {{ color: var(--muted); max-width: 62ch; margin: 6px 0 0; }}
ol.steps {{ margin: 0; padding-left: 22px; display: flex; flex-direction: column; gap: 6px; max-width: 66ch; }}
ol.steps b {{ color: var(--fg); }}
.style {{ background: var(--panel); border: 1px solid var(--line); border-radius: 10px; padding: 16px; display: flex; flex-direction: column; gap: 10px; min-width: 0; }}
.bar {{ position: sticky; top: env(safe-area-inset-top, 0px); z-index: 5; background: var(--bg); padding-block: 10px; display: flex; flex-wrap: wrap; gap: 8px; align-items: center; border-bottom: 1px solid var(--line); }}
.bar button {{ font: 600 14px var(--body); border: 1px solid var(--line); background: var(--panel); color: var(--fg); padding: 6px 12px; border-radius: 999px; cursor: pointer; }}
.bar button[aria-pressed="true"] {{ background: var(--sage); border-color: var(--sage); color: var(--bg); }}
.bar .progress {{ margin-left: auto; font: 600 13px var(--mono); color: var(--muted); font-variant-numeric: tabular-nums; }}
.sheet {{ background: var(--panel); border: 1px solid var(--line); border-radius: 10px; padding: 14px 16px; display: flex; flex-direction: column; gap: 10px; min-width: 0; }}
.sheet header {{ display: flex; flex-wrap: wrap; gap: 4px 14px; align-items: baseline; justify-content: space-between; }}
.sheet .done {{ display: flex; gap: 10px; align-items: center; font: 400 19px var(--display); cursor: pointer; }}
.sheet .done input {{ width: 18px; height: 18px; accent-color: var(--sage); }}
.sheet.is-done {{ opacity: .55; }}
.meta {{ color: var(--muted); font-size: 13px; }}
code {{ font: 600 12.5px var(--mono); color: var(--rust); }}
pre {{ margin: 0; background: var(--code); border: 1px solid var(--line); border-radius: 8px; padding: 12px; font: 12.5px/1.5 var(--mono); white-space: pre-wrap; overflow-wrap: anywhere; max-height: 260px; overflow: auto; }}
button.copy {{ align-self: flex-start; font: 800 14px var(--body); background: var(--rust); color: #fff; border: 0; border-radius: 8px; padding: 9px 16px; cursor: pointer; }}
button.copy.ok {{ background: var(--sage); }}
button:focus-visible, input:focus-visible {{ outline: 2px solid var(--sage); outline-offset: 2px; }}
</style>
<main>
  <section>
    <h1>Sprite Prompt Pack</h1>
    <p class="lead">{len(sheets)} image prompts covering every hero ({len(H)}), enemy ({len(data['enemies'])}), boss ({len(data['bosses'])}) and piece of gear ({len(items)}) in the game, in the low-poly painterly style with blank faces.</p>
  </section>
  <section>
    <h2>How to use it</h2>
    <ol class="steps">
      <li><b>Start with “Heroes, front”.</b> Paste its prompt into ChatGPT and regenerate until the style is exactly right.</li>
      <li><b>Lock the style.</b> For every later sheet, attach that approved hero image and add “Match the art style of the attached image exactly.”</li>
      <li><b>Check each sheet:</b> one character per row, its frames the same size and spot with only the pose changing, a flat magenta background, nothing touching the cell edges.</li>
      <li><b>Upload sheets here in chat</b> with their name (the <code>upload as</code> label). Slicing, background removal and wiring into the game happen on my side, and anything not drawn yet keeps today’s art.</li>
    </ol>
  </section>
  <section class="style">
    <h2>The style block</h2>
    <pre id="p-style">{html.escape(STYLE)}</pre>
    <button class="copy" data-copy="p-style">Copy style block</button>
  </section>
  <nav class="bar" aria-label="Filter sheets">
    <button data-filter="all" aria-pressed="true">All {len(sheets)}</button>
    <button data-filter="heroes" aria-pressed="false">Heroes {counts['heroes']}</button>
    <button data-filter="enemies" aria-pressed="false">Enemies {counts['enemies']}</button>
    <button data-filter="bosses" aria-pressed="false">Bosses {counts['bosses']}</button>
    <button data-filter="gear" aria-pressed="false">Gear {counts['gear']}</button>
    <span class="progress" id="progress"></span>
  </nav>
  {''.join(cards)}
</main>
<script>
const store = {{ get(k) {{ try {{ return localStorage.getItem(k); }} catch {{ return null; }} }}, set(k, v) {{ try {{ localStorage.setItem(k, v); }} catch {{}} }} }};
const boxes = [...document.querySelectorAll('[data-done]')];
function progress() {{ const n = boxes.filter((b) => b.checked).length; document.getElementById('progress').textContent = `${{n}} / ${{boxes.length}} done`; }}
for (const b of boxes) {{
  b.checked = store.get('done:' + b.dataset.done) === '1';
  b.closest('.sheet').classList.toggle('is-done', b.checked);
  b.addEventListener('change', () => {{ store.set('done:' + b.dataset.done, b.checked ? '1' : '0'); b.closest('.sheet').classList.toggle('is-done', b.checked); progress(); }});
}}
progress();
for (const btn of document.querySelectorAll('[data-copy]')) btn.addEventListener('click', () => {{
  const pre = document.getElementById(btn.dataset.copy), done = () => {{ btn.classList.add('ok'); const t = btn.textContent; btn.textContent = 'Copied'; setTimeout(() => {{ btn.classList.remove('ok'); btn.textContent = t; }}, 1400); }};
  navigator.clipboard?.writeText(pre.textContent).then(done, () => {{ const r = document.createRange(); r.selectNodeContents(pre); const s = getSelection(); s.removeAllRanges(); s.addRange(r); }});
}});
for (const f of document.querySelectorAll('[data-filter]')) f.addEventListener('click', () => {{
  for (const o of document.querySelectorAll('[data-filter]')) o.setAttribute('aria-pressed', String(o === f));
  for (const s of document.querySelectorAll('.sheet')) s.hidden = f.dataset.filter !== 'all' && s.dataset.group !== f.dataset.filter;
}});
</script>
'''
with open(out, 'w') as f:
    f.write(page)
print(f'{len(sheets)} sheets -> {out}')
