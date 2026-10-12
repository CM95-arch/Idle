// Pixel art drawn from tiny text maps, cached as canvases.
// Map letters: o = outline, a = main, b = light, c = accent, d = dark, e = skin, k = eyes. "." is empty.
import { KINDS } from '../data/gear.js';
import { BAL } from '../data/balance.js';

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
  cube: ['..oooooooo..', '.obbbbbbbbo.', 'obbbbbbbbbbo', 'oaaaaaaabbbo', 'oakaaakaabbo', 'oaaaaaaabbbo', 'oacccccaabbo', 'oaaaaaaabbo.', 'oaaaaaaabo..', '.oooooooo...'],
  dragon: ['..o.......o...', '.oao.....oao..', '.oaaooooaao...', '..oaaaaaaao...', '.oakaaaakaao..', 'oaaaaaaaaaaao.', 'oabbaaaaabbaoo', 'oabbbaaabbbaao', '.oaaaccaaaaoao', '..oaao.oaao.oo', '..ooo...ooo...'],
  lich: ['...c.c.c...', '...ccccc...', '..obbbbbo..', '..okbbbko..', '..obbbbbo..', '...obbbo...', '..oaaaaao..', '.oaaaaaaao.', 'oaaacacaaao', '.oaaaaaaao.', '.oaaaaaaao.', '..ooooooo..'],
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
export const hasMap = (map) => !!M[map];

// item colors by rarity: main, light, accent
const RAR = [
  ['#7c838c', '#b9c0c9', '#e6e9ed'], ['#2f8a3c', '#5fd16a', '#c6ffb0'], ['#2463b8', '#4aa3ff', '#bfe2ff'],
  ['#6a2fb8', '#b05cff', '#f0d0ff'], ['#c46a10', '#ffb02e', '#fff0a0'], ['#b81f48', '#ff4f7a', '#ffd34d'],
];
export const rarityColor = (r) => BAL.rarities[r].color;
export function itemColors(it) {
  const [a, b, c] = RAR[it.rarity];
  return it.kind === 'ring' ? { a, b, c: { hp: '#2ad1c2', atk: '#e24fcf', def: '#8a8a9a' }[it.ring] || c } : { a, b, c };
}
/** A DOM canvas for an item icon at a CSS size. */
export function itemIcon(it, size = 32) {
  const cv = draw(it.kind in M ? it.kind : KINDS[it.kind].slot, 4, itemColors(it));
  const out = cv.cloneNode(); out.getContext('2d').drawImage(cv, 0, 0);
  out.className = 'spr'; out.style.width = out.style.height = `${size}px`;
  return out;
}
export function heroCanvas(look, colors, back = false, scale = 4) { return draw(`${look}_${back ? 'b' : 'f'}`, scale, colors); }
export function heroIcon(look, colors, size = 32, silhouette = false) {
  const cv = draw(`${look}_f`, 4, colors, silhouette);
  const out = cv.cloneNode(); out.getContext('2d').drawImage(cv, 0, 0);
  out.className = 'spr'; out.style.height = `${size}px`; out.style.width = 'auto';
  return out;
}
