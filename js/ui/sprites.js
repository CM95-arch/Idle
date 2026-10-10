// Original placeholder pixel art, drawn from tiny text maps. Your own sprites replace these later:
// drop a PNG named after the item id into assets/items/ and list it in js/data/artManifest.js.
// Map letters: o = outline, a = main, b = light, c = accent, d = dark, e = skin, k = eyes. "." is empty.
import { ITEMS } from '../data/items.js';
import { ART } from '../data/artManifest.js';

const M = {
  // ---- items ----
  staff: ['......cc', '.....ocb', '....oao.', '...oao..', '..oao...', '.oao....', 'oao.....', 'oo......'],
  wand: ['........', '.....cc.', '....occ.', '...oao..', '..oao...', '.oao....', '.oo.....', '........'],
  bow: ['..oo....', '.oab....', '.oa.ob..', 'oa...b..', 'oa...b..', '.oa.ob..', '.oab....', '..oo....'],
  sword: ['......ob', '.....obo', '....obo.', '...obo..', 'o.obo...', 'ocoo....', '.oc.....', 'o.o.....'],
  dagger: ['........', '......ob', '.....obo', '....obo.', '..ooo...', '..co....', '.oc.....', '........'],
  robe: ['..o..o..', '.oaooao.', 'oaaccaao', '.oaaaao.', '.oaaaao.', '.oaaaao.', 'oaaaaaao', 'oooooooo'],
  leather: ['.oo..oo.', 'oaaooaao', 'oaaaaaao', '.oaaaao.', '.occcco.', '.oaaaao.', '.oaooao.', '.oo..oo.'],
  heavy: ['oo....oo', 'obooooao', 'oabbbaao', '.oaaaao.', '.oacbao.', '.oaaaao.', '.oaaaao.', '..oooo..'],
  ring: ['...cc...', '..occo..', '.oo..oo.', 'oa....ao', 'oa....ao', '.oa..ao.', '..oaao..', '...oo...'],
  spell: ['...c....', '..obo.c.', '.obaao..', 'oaabaao.', 'oaaaaao.', '.oaaao..', '..ooo...', '........'],
  tome: ['.oooooo.', 'oaaaaabo', 'oacccabo', 'oaacaabo', 'oaacaabo', 'oaaaaabo', '.oooooo.', '........'],
  quiver: ['....cc..', '...ccc..', '..oao...', '.oaao...', 'oaaao...', 'oaao....', 'oao.....', '.o......'],
  cloak: ['..oooo..', '.oaaaao.', 'oaobboao', 'oaaaaaao', 'oaaaaaao', '.oaaaao.', '.oaoaao.', '..o..o..'],
  helm: ['...cc...', '..oooo..', '.oaaaao.', 'oaaaaaao', 'oaoooaao', 'oaocooao', '.oo..oo.', '........'],
  shield: ['oooooooo', 'oaaccaao', 'oaaccaao', 'oacccbao', '.oaccao.', '.oaaao..', '..oao...', '...o....'],
  seal: ['..oooo..', '.oaaaao.', 'oaacaaao', 'oacccaao', 'oaacaaao', '.oaaaao.', '..oooo..', '........'],
  trap: ['........', '.o.o.o..', 'oaoaoao.', 'oaaaaao.', 'occccco.', 'oaaaaao.', '.ooooo..', '........'],
  scepter: ['......cc', '.....ccc', '....oao.', '...oao..', '..oao...', '.oao....', 'oao.....', '.o......'],
  skull: ['..oooo..', '.obbbbo.', 'obbbbbbo', 'obooboob', 'obbbbbbo', '.obobbo.', '..oooo..', '........'],
  poison: ['...oo...', '...ab...', '..oaao..', '.occcco.', 'occcccco', 'occbccco', '.occcco.', '..oooo..'],
  potion: ['...oo...', '...db...', '..oddo..', '.occcco.', 'occbccco', 'occcccco', '.occcco.', '..oooo..'],
  rune: ['..oooo..', '.obbbbo.', 'obbcbbbo', 'obcccbbo', 'obbcbbbo', 'obbcbbbo', '.obbbbo.', '..oooo..'],
  bag: ['..oooo..', '...oo...', '.oaaaao.', 'oaabaaao', 'oaaaaaao', 'oaaaaaao', '.oaaaao.', '..oooo..'],
  // ---- characters (front / back) ----
  hat_f: ['....oo....', '...oaao...', '..oaaaao..', '.oooooooo.', '..oeeeeo..', '..oekkeo..', '.oaaccaao.', 'oaaaaaaaao', 'oaabaabaao', '.oaaaaaao.', '.oaa..aao.', '.oo....oo.'],
  hat_b: ['....oo....', '...oaao...', '..oaaaao..', '.oooooooo.', '..odddddo.', '.oaaaaaao.', 'oaaabbaaao', 'oaaaaaaaao', '.occcccco.', '.oaaaaaao.', '.oaa..aao.', '.oo....oo.'],
  hood_f: ['...oooo...', '..oaaaao..', '.oaaaaaao.', '.oaekkeao.', '.oaeeeeao.', '..oaccao..', '.oaaaaaao.', 'oaabaabaao', 'oaaaaaaaao', '.oaaaaaao.', '.oaa..aao.', '.oo....oo.'],
  hood_b: ['...oooo...', '..oaaaao..', '.oaaaaaao.', '.oaaaaaao.', '.oaaaaaao.', '..oaaaao..', '.oaaaaaao.', 'oaaabbaaao', 'oaaaaaaaao', '.occcccco.', '.oaa..aao.', '.oo....oo.'],
  helm_f: ['..oooooo..', '.occcccco.', '.ocokkoco.', '.occcccco.', '..oaaaao..', '.oaabbaao.', 'oaaaaaaaao', 'oaacaacaao', '.oaaaaaao.', '.oaaaaaao.', '.oaa..aao.', '.oo....oo.'],
  helm_b: ['..oooooo..', '.occcccco.', '.occcccco.', '.occcccco.', '..oaaaao..', '.oaaaaaao.', 'oaaabbaaao', 'oaaaaaaaao', '.oddddddo.', '.oaaaaaao.', '.oaa..aao.', '.oo....oo.'],
  // ---- enemies ----
  beast: ['............', '..o......o..', '.oao....oao.', '.oaaooooaao.', 'oaaaaaaaaaao', 'oacaaaaaacao', 'oaaaabbaaaao', '.oaaobboaao.', '..oaaaaaao..', '.oao.oo.oao.', '.oo......oo.'],
  blob: ['............', '....oooo....', '...obbbbo...', '..obbaabbo..', '.oaakaakaao.', '.oaaaaaaaao.', 'oaaaaccaaaao', 'oaaaaaaaaaao', 'oaaaaaaaaaao', '.oooooooooo.'],
  humanoid: ['....oooo....', '...oaaaao...', '...oekkeo...', '...oeeeeo...', '..ooaaaaoo..', '.oaaabbaaao.', 'oaoaaaaaaoao', 'oeoaaccaaoeo', '.o.oaaaao.o.', '...oaooao...', '...oaooao...', '...oo..oo...'],
  ghost: ['....oooo....', '...obbbbo...', '..obbbbbbo..', '..obkbbkbo..', '.obbbbbbbbo.', '.obbboobbbo.', '.obbbbbbbbo.', 'obbbbbbbbbbo', 'obabbabbabbo', 'oaoaaoaaoaao', '.o..o..o..o.'],
  bug: ['o..........o', '.o.oooooo.o.', '..oaaaaaao..', '.oakaaaakao.', 'oaaaaaaaaaao', 'ooabbbbbbaoo', 'o.oaaaaaao.o', '.ooaccccaoo.', 'o.oaaaaaao.o', '...oooooo...'],
  wisp: ['....oo....', '...obbo...', '..obccbo..', '.obcbbcbo.', 'obbbbbbbbo', 'obdbbbbdbo', '.obbbbbbo.', '..obbbbo..', '.ob.ob.bo.', 'o...o...o.'],
  golem: ['...oooooo...', '..oaaaaaao..', '..oakaakao..', '.ooaaaaaaoo.', 'oaaoabbaoaao', 'oaaaabbaaaao', 'oaaoaaaaoaao', 'oaao.oo.oaao', '.oo.oaao.oo.', '....oaao....', '...oaaaao...', '...oooooo...'],
  demon: ['o..........o', 'oo..oooo..oo', '.oooaaaaooo.', '..oaakkaao..', '..oaaaaaao..', '.ooaaccaaoo.', 'oaaoaaaaoaao', 'oaaaabbaaaao', '.ooaaaaaaoo.', '..oaaooaao..', '..oao..oao..', '..oo....oo..'],
  eye: ['...oooooo...', '..obbbbbbo..', '.obbbbbbbbo.', 'obbbccccbbbo', 'obbcckkccbbo', 'obbcckkccbbo', 'obbbccccbbbo', '.obbbbbbbbo.', '..obbbbbbo..', '...oaoaoao..', '...o.o.o.o..'],
  snake: ['.....oooo.....', '....oaaaao....', '...oacaacao...', '...oaaaaaao...', '....obbbbo....', '..ooaaaaaoo...', '.oaaoooooaao..', 'oao.......oao.', 'oao.ooooo.oao.', '.oaoaaaaaoao..', '..oaaoooaao...', '...oo...oo....'],
  skeleton: ['....oooo....', '...obbbbo...', '...okbbko...', '...obbbbo...', '....obbo....', '..oobbbboo..', '.ob.obbo.bo.', '.ob.obbo.bo.', '....obbo....', '...ob..bo...', '...ob..bo...', '...oo..oo...'],
  // ---- scenery ----
  tree: ['...oo...', '..oaao..', '.oaabao.', '..oaao..', '.oaaaao.', 'oaabaaao', '...dd...', '...dd...'],
  rock: ['..oooo..', '.obbaao.', 'obaaaado', 'oaaaaddo', '.oooooo.'],
  grass: ['..a..a..', '.aa.aa.a', 'aaaaaaaa'],
  ruin: ['.oooo.', '.obao.', 'oobaoo', '.obao.', '.obao.', 'oobaoo', 'oooooo'],
  flame: ['...c....', '..cc.c..', '.cbbcc..', '.cbbbcc.', 'cbbabbc.', 'cbaaabc.', '.caaac..'],
  crystal: ['...o....', '..obo...', '..obao..', '.obaao..', '.obaao..', 'obaaaao.', 'oooooooo'],
  pillar: ['oooooo', '.obao.', '.obao.', '.obao.', '.obao.', '.obao.', 'oooooo'],
};

const BASE = { o: '#0a080c', d: '#2a2230', e: '#e5b98f', k: '#1a1418' };
export const TIER_COLORS = (t) => (t >= 12 ? ['#b2263a', '#ff8a7a', '#ffd34d'] : t >= 10 ? ['#7b4bd1', '#c9a6ff', '#ffd34d'] : t >= 7 ? ['#2f62c9', '#8ec1ff', '#ffe08a'] : t >= 4 ? ['#2d8f73', '#8fe0c3', '#f2c14e'] : ['#8a6a4a', '#cdb08a', '#b8c0c8']);
export const POT_COLORS = { hp: '#f0dfa6', mp: '#a98cff', att: '#e24fcf', def: '#3c3a44', spd: '#49c25c', dex: '#f28c2a', vit: '#d83b3b', wis: '#4aa3f0' };
const UT_COLORS = ['#c0408f', '#ff9de6', '#fff2a8'];

const cache = new Map();
export function draw(map, scale, colors, silhouette = false) {
  const key = `${map}|${scale}|${JSON.stringify(colors)}|${silhouette}`;
  if (cache.has(key)) return cache.get(key);
  const m = M[map];
  const w = Math.max(...m.map((r) => r.length)), h = m.length;
  const cv = document.createElement('canvas');
  cv.width = w * scale; cv.height = h * scale;
  const g = cv.getContext('2d');
  m.forEach((row, y) => [...row].forEach((ch, x) => {
    if (ch === '.') return;
    g.fillStyle = silhouette ? (ch === 'o' ? '#000' : '#26212d') : colors[ch] || BASE[ch] || '#f0f';
    g.fillRect(x * scale, y * scale, scale, scale);
  }));
  cache.set(key, cv);
  return cv;
}
export const mapSize = (map) => ({ w: Math.max(...M[map].map((r) => r.length)), h: M[map].length });

export function itemColors(it) {
  if (it.slot === 'potion') return { c: POT_COLORS[it.potStat], b: '#ffffff', d: '#cfc7b8' };
  if (it.slot === 'rune') return { b: '#e9d9a8', c: '#8a5a1a' };
  const [a, b, c] = it.tier === 'UT' ? UT_COLORS : TIER_COLORS(it.tier);
  if (it.type === 'poison') return { a: '#cfc7b8', b: '#e9ffe0', c: it.tier === 'UT' ? '#ff6ad5' : a };
  if (it.type === 'ring') return { a, b, c: it.tier === 'UT' ? c : POT_COLORS[it.ringStat] || c };
  return { a, b, c };
}
const itemMap = (it) => (it.slot === 'potion' ? 'potion' : it.slot === 'rune' ? 'rune' : it.type);

/** A DOM node for an item icon. size is the rendered CSS size in px. */
export function itemIcon(id, size = 32, silhouette = false) {
  const it = ITEMS[id];
  if (ART.has(id)) {
    const img = new Image(); img.src = `assets/items/${id}.png`; img.alt = '';
    img.className = 'spr'; img.width = size; img.height = size;
    if (silhouette) img.style.filter = 'brightness(0) opacity(.75)';
    return img;
  }
  const cv = draw(itemMap(it), 4, itemColors(it), silhouette);
  const out = cv.cloneNode(); out.getContext('2d').drawImage(cv, 0, 0);
  out.className = 'spr'; out.style.width = out.style.height = `${size}px`;
  return out;
}
export const itemCanvas = (id) => draw(itemMap(ITEMS[id]), 4, itemColors(ITEMS[id]));

const SHAPE = { wizard: 'hat', sorcerer: 'hat', priest: 'hood', necromancer: 'hood', archer: 'hood', huntress: 'hood', rogue: 'hood', assassin: 'hood', warrior: 'helm', knight: 'helm', paladin: 'helm' };
export function heroCanvas(cls, colors, back = false, scale = 4) {
  return draw(`${SHAPE[cls]}_${back ? 'b' : 'f'}`, scale, colors);
}
export function heroIcon(cls, colors, size = 32) {
  const cv = heroCanvas(cls, colors, false, 4);
  const out = cv.cloneNode(); out.getContext('2d').drawImage(cv, 0, 0);
  out.className = 'spr'; out.style.height = `${size}px`; out.style.width = 'auto';
  return out;
}
export function bagColor(id) {
  const it = ITEMS[id];
  if (it.tier === 'UT') return { a: '#f4f4f8', b: '#ffffff' };
  if (it.slot === 'potion') return { a: '#3a6ad8', b: '#8ab0ff' };
  if (it.slot === 'rune') return { a: '#d9a441', b: '#ffe08a' };
  const t = it.tier;
  return t >= 11 ? { a: '#3ac8d8', b: '#9af0ff' } : t >= 8 ? { a: '#7a3ac0', b: '#b88aff' } : t >= 5 ? { a: '#c04a8a', b: '#ff9ad0' } : { a: '#7a5a3a', b: '#b08a5a' };
}
