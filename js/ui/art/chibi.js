// The heroes as chunky little battle figures for the horde view: big head, short body, weapon gripped and
// ready, thick ink outline and painterly cel shading, finished by the shared lighting pass (art/core.js).
// 120×130 box (the figure in 100×120 with a 10px margin for glows), feet at y≈124. Palettes come from the portraits (art/heroes.js) so a class always reads as itself.
import { svgImage, shade, lit, metal, lin, rad, glowDot, ol, OUT } from './core.js';
import { HERO } from './heroes.js';

// hair, eyes and a few extra touches per class
const LOOK = {
  wizard: { hair: '#e8e8f0', eye: '#4a7ad8', beard: true },
  priest: { hair: '#c89a5a', eye: '#5a8a4a' },
  archer: { hair: '#7a4a24', eye: '#3a6a2a' },
  rogue: { hair: '#2a2228', eye: '#8a2a2a' },
  warrior: { hair: '#6a3a1a', eye: '#4a3a2a', stubble: true },
  knight: { hair: '#c8a050', eye: '#3a5aa0' },
  paladin: { hair: '#e8d090', eye: '#5a8ad8' },
  huntress: { hair: '#a04a24', eye: '#4a8a3a' },
  necromancer: { hair: '#1a1a1a', eye: '#5aff7a', pale: true },
  assassin: { hair: '#1a1420', eye: '#7cff4a' },
  sorcerer: { hair: '#1a1424', eye: '#5de0ff' },
};

// ---- headgear, drawn in the old 80-box head frame (centre 40,38, r 19) and fitted over the new head ----
const HEADS = {
  hat: (g, P) => `<path d="M10 41 Q40 29 70 41 Q70 50 40 47 Q10 50 10 41 Z" fill="url(#${g}cl)" ${ol(2.4)}/>
    <path d="M14 42 Q40 33 66 42" stroke="${shade(P.cloth, 0.35)}" stroke-width="1.2" fill="none" opacity=".6"/>
    <path d="M23 40 Q29 18 43 4 Q46 1 49 6 Q51 22 58 40 Q40 33 23 40 Z" fill="url(#${g}cl)" ${ol(2.4)}/>
    <path d="M33 30 Q38 16 44 8" stroke="${shade(P.cloth, 0.4)}" stroke-width="1.6" fill="none" opacity=".55"/>
    <path d="M24 36 Q40 30 57 36 L58 41 Q40 35 23 41 Z" fill="url(#${g}tr)" ${ol(1.2)}/>
    <path d="M36 34 L38 30 L40 34 L44 32 L41 36 Z" fill="${P.accent}" opacity=".9"/><circle cx="47" cy="5" r="2.6" fill="${P.accent}" ${ol(1)}/>`,
  cowl: (g, P) => `<path d="M16 52 Q12 16 40 13 Q68 16 64 52 Q61 33 40 30 Q19 33 16 52 Z" fill="url(#${g}cl)" ${ol(2.4)}/>
    <path d="M22 44 Q22 24 40 20" stroke="${shade(P.cloth, 0.5)}" stroke-width="1.6" fill="none" opacity=".6"/>
    <path d="M29 17 L40 25 L51 17" stroke="url(#${g}tr)" stroke-width="3.2" fill="none" stroke-linejoin="round"/><circle cx="40" cy="25" r="2.4" fill="${P.accent}" ${ol(1)}/>`,
  hood: (g, P) => `<path d="M14 56 Q10 15 40 11 Q70 15 66 56 Q61 33 40 29 Q19 33 14 56 Z" fill="url(#${g}cp)" ${ol(2.4)}/>
    <path d="M40 11 Q54 13 60 28" stroke="${shade(P.cloth, 0.3)}" stroke-width="1.4" fill="none" opacity=".5"/>
    <path d="M20 46 Q22 30 34 24" stroke="${shade(P.cloth, 0.35)}" stroke-width="1.4" fill="none" opacity=".45"/>`,
  mask: (g, P) => `${HEADS.hood(g, P)}<path d="M21 46 Q40 54 59 46 L59 55 Q40 63 21 55 Z" fill="${shade(P.cloth, -0.35)}" ${ol(2)}/>
    <path d="M24 50 Q40 56 56 50" stroke="${shade(P.cloth, 0.1)}" stroke-width="1" fill="none" opacity=".6"/>`,
  barbute: (g, P) => `<path d="M15 51 Q13 13 40 11 Q67 13 65 51 L53 51 L53 36 L27 36 L27 51 Z" fill="url(#${g}mt)" ${ol(2.4)}/>
    <path d="M40 11 L40 36" stroke="#fff" stroke-width="1.6" opacity=".55"/><path d="M20 30 Q22 18 32 14" stroke="#fff" stroke-width="1.4" opacity=".35" fill="none"/>
    <circle cx="22" cy="44" r="1.3" fill="${shade(P.metal, -0.5)}"/><circle cx="58" cy="44" r="1.3" fill="${shade(P.metal, -0.5)}"/>
    <path d="M56 17 Q70 4 64 -2" stroke="${OUT}" stroke-width="7.5" fill="none" stroke-linecap="round"/><path d="M56 17 Q70 4 64 -2" stroke="#c03030" stroke-width="5" fill="none" stroke-linecap="round"/><path d="M58 13 Q66 6 64 1" stroke="#ff7a6a" stroke-width="1.6" fill="none" stroke-linecap="round"/>`,
  greathelm: (g, P) => `<path d="M14 55 Q12 11 40 9 Q68 11 66 55 Z" fill="url(#${g}mt)" ${ol(2.4)}/>
    <rect x="21" y="32" width="38" height="5" rx="2" fill="${OUT}"/><path d="M40 37 L40 53" stroke="${OUT}" stroke-width="3"/>
    <circle cx="30" cy="45" r="1" fill="${OUT}"/><circle cx="34" cy="48" r="1" fill="${OUT}"/><circle cx="46" cy="48" r="1" fill="${OUT}"/><circle cx="50" cy="45" r="1" fill="${OUT}"/>
    <path d="M40 9 L40 30" stroke="#fff" stroke-width="1.6" opacity=".55"/><path d="M19 28 Q21 16 31 12" stroke="#fff" stroke-width="1.4" opacity=".35" fill="none"/><circle cx="40" cy="21" r="2.6" fill="${P.accent}" ${ol(1)}/>`,
  winged: (g, P) => `<path d="M14 30 Q-2 18 1 3 Q10 17 19 21 Z M66 30 Q82 18 79 3 Q70 17 61 21 Z" fill="#fff" ${ol(1.8)}/>
    <path d="M5 10 Q10 18 16 22 M75 10 Q70 18 64 22" stroke="#c8c0b0" stroke-width="1.2" fill="none"/>${HEADS.greathelm(g, P)}`,
  furhood: (g, P) => `<path d="M13 56 Q9 13 40 9 Q71 13 67 56 Q61 31 40 28 Q19 31 13 56 Z" fill="url(#${g}le)" ${ol(2.4)}/>
    <path d="M13 32 L18 22 L22 31 L26 19 L31 29 M49 29 L54 19 L58 31 L62 22 L67 32" stroke="${shade(P.leather, 0.45)}" stroke-width="1.8" fill="none" opacity=".7"/>
    <path d="M24 12 L30 2 L34 12 Z M46 12 L50 2 L56 12 Z" fill="url(#${g}le)" ${ol(1.8)}/>`,
  skullcowl: (g, P) => `${HEADS.hood(g, P)}<path d="M27 19 Q40 5 53 19 Q55 27 49 29 L31 29 Q25 27 27 19 Z" fill="#ece4cc" ${ol(1.8)}/>
    <path d="M33 29 L33 33 M37 29 L37 33 M43 29 L43 33 M47 29 L47 33" stroke="${OUT}" stroke-width="1.2"/>
    ${glowDot(`${g}sk`, 35, 20, 3, P.accent)}${glowDot(`${g}sk2`, 45, 20, 3, P.accent)}<circle cx="35" cy="20" r="2.6" fill="${P.accent}"/><circle cx="45" cy="20" r="2.6" fill="${P.accent}"/>`,
  wrap: (g, P) => `<path d="M15 47 Q13 13 40 11 Q67 13 65 47 Q58 29 40 27 Q22 29 15 47 Z" fill="url(#${g}cl)" ${ol(2.4)}/>
    <path d="M18 26 Q40 18 62 26 M16 36 Q40 28 64 36" stroke="${shade(P.cloth, 0.25)}" stroke-width="1.2" fill="none" opacity=".6"/>
    <path d="M17 47 Q40 55 63 47 L63 57 Q40 65 17 57 Z" fill="url(#${g}cl)" ${ol(2)}/><path d="M61 22 Q74 26 74 40" stroke="${OUT}" stroke-width="6.5" fill="none" stroke-linecap="round"/><path d="M61 22 Q74 26 74 40" stroke="${P.trim}" stroke-width="4" fill="none" stroke-linecap="round"/>`,
  circlet: (g, P) => `<path d="M15 50 Q10 12 40 11 Q70 12 65 50 Q63 25 40 23 Q17 25 15 50 Z" fill="url(#${g}hr)" ${ol(2.4)}/>
    <path d="M22 26 Q30 18 40 18 M44 18 Q56 20 60 30" stroke="#fff" stroke-width="1.2" fill="none" opacity=".35"/>
    <path d="M19 31 Q40 22 61 31" stroke="${OUT}" stroke-width="5.6" fill="none"/><path d="M19 31 Q40 22 61 31" stroke="url(#${g}tr)" stroke-width="3.4" fill="none"/>
    ${glowDot(g, 40, 25, 6, P.accent)}<path d="M40 20 L44 25 L40 30 L36 25 Z" fill="${P.accent}" ${ol(1.2)}/>`,
};

// ---- weapons, in the old 80-box frame; `grip` is where the hand closes on each (also old frame) ----
const WEAPONS = {
  staff: { grip: [63, 76], draw: (g, P, A) => `<path d="M60 92 L73 12" stroke="${OUT}" stroke-width="7.5" stroke-linecap="round"/><path d="M60 92 L73 12" stroke="url(#${g}wd)" stroke-width="4.4" stroke-linecap="round"/>
    <path d="M62 80 L64 68 M66 56 L67 50" stroke="${shade(P.trim, 0.2)}" stroke-width="5" stroke-linecap="butt" opacity=".9"/>
    <path d="M66 18 Q60 10 66 4 M80 18 Q86 10 80 4" stroke="url(#${g}tr)" stroke-width="2.6" fill="none" stroke-linecap="round"/>
    ${glowDot(g, 73, 11, 13, A)}<circle cx="73" cy="11" r="7" fill="url(#${g}gl)" ${ol(1.8)}/><circle cx="71" cy="9" r="2.2" fill="#fff" opacity=".85"/>` },
  wand: { grip: [62, 68], draw: (g, P, A) => `<path d="M58 78 L72 32" stroke="${OUT}" stroke-width="6.5" stroke-linecap="round"/><path d="M58 78 L72 32" stroke="url(#${g}tr)" stroke-width="3.4" stroke-linecap="round"/>
    <path d="M66 52 L68 46" stroke="${shade(P.trim, -0.4)}" stroke-width="3.6"/>
    ${glowDot(g, 73, 28, 10, A)}<path d="M73 18 L79 28 L73 38 L67 28 Z" fill="url(#${g}gl)" ${ol(1.6)}/><path d="M73 21 L75 28 L73 30 Z" fill="#fff" opacity=".8"/>` },
  bow: { grip: [62, 53], draw: (g, P, A) => `<path d="M60 18 Q86 52 60 88" fill="none" stroke="${OUT}" stroke-width="7.5" stroke-linecap="round"/><path d="M60 18 Q86 52 60 88" fill="none" stroke="url(#${g}wd)" stroke-width="4.4" stroke-linecap="round"/>
    <path d="M66 26 Q76 40 77 50" stroke="#fff" stroke-width="1.2" fill="none" opacity=".35"/>
    <path d="M60 19 L60 87" stroke="#f0e8d8" stroke-width="1.3"/><path d="M48 53 L78 53" stroke="${OUT}" stroke-width="3.6"/><path d="M48 53 L78 53" stroke="#d8c8a0" stroke-width="1.8"/>
    <path d="M48 50 L44 53 L48 56 M51 50 L47 53 L51 56" stroke="${A}" stroke-width="1.6" fill="none"/><path d="M78 49 L85 53 L78 57 Z" fill="url(#${g}mt)" ${ol(1)}/>` },
  dagger: { grip: [60, 68], off: [20, 68], draw: (g, P, A) => `<path d="M58 66 L74 32 L79 34 L64 70 Z" fill="url(#${g}mt)" ${ol(1.8)}/><path d="M62 64 L75 36" stroke="#fff" stroke-width="1" opacity=".6"/><path d="M53 63 L67 72" stroke="${OUT}" stroke-width="7" stroke-linecap="round"/><path d="M53 63 L67 72" stroke="url(#${g}tr)" stroke-width="4.6" stroke-linecap="round"/>
    <path d="M22 66 L7 38 L2 40 L16 70 Z" fill="url(#${g}mt)" ${ol(1.8)}/><path d="M18 64 L6 41" stroke="#fff" stroke-width="1" opacity=".6"/><path d="M27 63 L13 72" stroke="${OUT}" stroke-width="7" stroke-linecap="round"/><path d="M27 63 L13 72" stroke="url(#${g}tr)" stroke-width="4.6" stroke-linecap="round"/>
    ${glowDot(g, 77, 34, 4, A)}${glowDot(`${g}o`, 4, 40, 4, A)}` },
  sword: { grip: [62, 76], draw: (g, P, A) => `<path d="M60 70 L74 6 L81 8 L68 72 Z" fill="url(#${g}mt)" ${ol(2)}/><path d="M64 66 L77 10" stroke="#fff" stroke-width="1.4" opacity=".75"/><path d="M67 70 L79 12" stroke="${shade(P.metal, -0.5)}" stroke-width="1" opacity=".6"/>
    <path d="M53 68 L78 75" stroke="${OUT}" stroke-width="8" stroke-linecap="round"/><path d="M53 68 L78 75" stroke="url(#${g}tr)" stroke-width="5.4" stroke-linecap="round"/>
    <path d="M63 76 L59 88" stroke="${OUT}" stroke-width="7.5" stroke-linecap="round"/><path d="M63 76 L59 88" stroke="#4a3020" stroke-width="4.6" stroke-linecap="round"/><circle cx="58.5" cy="89.5" r="3.4" fill="url(#${g}tr)" ${ol(1.4)}/>
    ${glowDot(g, 65.5, 71.5, 5, A)}<circle cx="65.5" cy="71.5" r="2.2" fill="${A}" ${ol(1)}/>` },
};
// old 80-box frame → new 100×120 box
const OLDX = (x) => x * 1.12 + 5.2, OLDY = (y) => y * 1.12 - 1;
const FIT = 'translate(5.2 -1) scale(1.12)';

function body(g, P) {
  const plate = P.body === 'plate';
  const legs = `<path d="M40 92 L39 106 L49 106 L49 92 Z M60 92 L61 106 L51 106 L51 92 Z" fill="url(#${g}${plate ? 'mt' : 'le'})" ${ol(2.2)}/>
    <path d="M35 104 Q42 99 49.5 104 L49.5 113 Q42 115 34 113 Z M65 104 Q58 99 50.5 104 L50.5 113 Q58 115 66 113 Z" fill="url(#${g}bt)" ${ol(2.2)}/>
    <path d="M35 111 L49 111 M51 111 L65 111" stroke="${OUT}" stroke-width="1.4" opacity=".7"/><path d="M38 104 Q42 102 46 104" stroke="#fff" stroke-width="1" fill="none" opacity=".35"/>`;
  if (P.body === 'robe') return `<path d="M35 62 Q50 55 65 62 L75 110 Q50 118 25 110 Z" fill="url(#${g}cl)" ${ol(2.4)}/>
    <path d="M42 70 Q40 90 34 110 M58 70 Q60 90 66 110" stroke="${shade(P.cloth, -0.45)}" stroke-width="1.6" fill="none" opacity=".7"/>
    <path d="M38 72 Q37 88 32 104" stroke="${shade(P.cloth, 0.35)}" stroke-width="1.2" fill="none" opacity=".45"/>
    <path d="M26 105 Q50 113 74 105 L75 110 Q50 118 25 110 Z" fill="url(#${g}tr)" ${ol(1.2)}/>
    <path d="M30 108 L32 108 M40 110.5 L42 110.5 M58 110.5 L60 110.5 M68 108 L70 108" stroke="${P.accent}" stroke-width="1.6" opacity=".8"/>
    <path d="M47 63 L50 104 L53 63" stroke="url(#${g}tr)" stroke-width="3.4" fill="none" stroke-linejoin="round"/>
    <rect x="35" y="82" width="30" height="5.5" rx="2" fill="url(#${g}tr)" ${ol(1.4)}/><rect x="47" y="81" width="6" height="7.5" rx="1.5" fill="${P.accent}" ${ol(1.2)}/>
    <path d="M33 62 Q50 52 67 62 L64 70 Q50 63 36 70 Z" fill="url(#${g}tr)" ${ol(1.6)}/>`;
  if (P.body === 'leather') return `${legs}<path d="M35 62 Q50 55 65 62 L67 94 Q50 100 33 94 Z" fill="url(#${g}cl)" ${ol(2.4)}/>
    <path d="M40 66 Q42 80 40 92 M60 66 Q58 80 60 92" stroke="${shade(P.cloth, -0.4)}" stroke-width="1.4" fill="none" opacity=".6"/>
    <path d="M37 63 L63 89" stroke="${OUT}" stroke-width="7" stroke-linecap="round"/><path d="M37 63 L63 89" stroke="url(#${g}le)" stroke-width="4.6" stroke-linecap="round"/>
    <circle cx="44" cy="70" r="1.2" fill="url(#${g}tr)"/><circle cx="52" cy="78" r="1.2" fill="url(#${g}tr)"/>
    <rect x="32" y="86" width="36" height="6.5" rx="2" fill="url(#${g}le)" ${ol(1.4)}/><rect x="46" y="85" width="8" height="8.5" rx="1.5" fill="url(#${g}tr)" ${ol(1.2)}/>
    <rect x="35" y="88" width="7" height="8" rx="2" fill="url(#${g}le)" ${ol(1.2)}/>
    <path d="M34 92 L33 101 Q42 104 50 101 L50 94 Z M66 92 L67 101 Q58 104 50 101 L50 94 Z" fill="url(#${g}cp)" ${ol(1.8)}/>
    <path d="M33 62 Q50 53 67 62 L64 68 Q50 62 36 68 Z" fill="${shade(P.cloth, -0.18)}" ${ol(1.6)}/>`;
  // plate
  return `${legs}<path d="M42 92 L40 104 Q50 107 60 104 L58 92 Z" fill="url(#${g}cl)" ${ol(2)}/><path d="M50 93 L50 104" stroke="url(#${g}tr)" stroke-width="2.4"/>
    <path d="M35 62 Q50 55 65 62 L64 90 Q50 96 36 90 Z" fill="url(#${g}mt)" ${ol(2.4)}/>
    <path d="M50 59 L50 92" stroke="#fff" stroke-width="1.6" opacity=".55"/><path d="M38 75 Q50 81 62 75" stroke="${shade(P.metal, -0.55)}" stroke-width="1.6" fill="none"/>
    <path d="M39 66 Q44 72 49 70 M61 66 Q56 72 51 70" stroke="${shade(P.metal, 0.6)}" stroke-width="1.2" fill="none" opacity=".7"/>
    <path d="M36 82 Q50 88 64 82" stroke="${shade(P.metal, -0.5)}" stroke-width="1.4" fill="none"/>
    <rect x="35" y="86" width="30" height="6" rx="2" fill="url(#${g}le)" ${ol(1.4)}/><rect x="46" y="85" width="8" height="8" rx="1.5" fill="url(#${g}tr)" ${ol(1.2)}/>
    <path d="M27 58 Q35 52 42 60 Q40 68 33 70 Q26 68 27 58 Z M73 58 Q65 52 58 60 Q60 68 67 70 Q74 68 73 58 Z" fill="url(#${g}mt)" ${ol(2)}/>
    <path d="M29 60 Q35 56 40 61 M71 60 Q65 56 60 61" stroke="#fff" stroke-width="1.2" fill="none" opacity=".55"/>
    <path d="M30 66 Q35 68 40 65 M70 66 Q65 68 60 65" stroke="url(#${g}tr)" stroke-width="1.8" fill="none"/>`;
}

function face(g, P, L) {
  const eyes = (x) => `<ellipse cx="${x}" cy="44" rx="3.9" ry="4.6" fill="#fff" ${ol(1.3)}/><circle cx="${x + 0.4}" cy="44.6" r="2.9" fill="${L.eye}"/>
    <circle cx="${x + 0.5}" cy="45" r="1.5" fill="${OUT}"/><circle cx="${x - 0.8}" cy="43" r="1.1" fill="#fff"/>`;
  const skin = L.pale ? 'pl' : 'sk';
  return `<path d="M27 43 Q24 38 28 37 M73 43 Q76 38 72 37" fill="url(#${g}${skin})" ${ol(1.6)}/>
    <circle cx="50" cy="41" r="21" fill="url(#${g}${skin})" ${ol(2.4)}/>
    <path d="M33 36 Q36 26 46 24" stroke="#fff" stroke-width="2" fill="none" opacity=".25" stroke-linecap="round"/>
    <path d="M31 30 Q40 20 50 22 Q60 20 69 30 Q62 26 56 28 Q52 24 48 28 Q42 25 31 30 Z" fill="url(#${g}hr)" ${ol(1.6)}/>
    ${eyes(42)}${eyes(58)}
    <path d="M37.5 37.5 L46 38.8 M62.5 37.5 L54 38.8" stroke="${shade(L.hair, -0.4)}" stroke-width="2.4" stroke-linecap="round"/>
    <path d="M49.4 47.5 Q50.4 49.4 51.6 47.6" stroke="${shade(P.skin, -0.45)}" stroke-width="1.2" fill="none" stroke-linecap="round"/>
    <path d="M46 53 Q50 55.5 54 53" stroke="${OUT}" stroke-width="1.8" fill="none" stroke-linecap="round"/>
    <ellipse cx="37" cy="51" rx="3.4" ry="2" fill="#ff7a7a" opacity=".32"/><ellipse cx="63" cy="51" rx="3.4" ry="2" fill="#ff7a7a" opacity=".32"/>
    ${L.stubble ? `<path d="M38 52 Q50 62 62 52 Q60 60 50 61 Q40 60 38 52 Z" fill="${shade(L.hair, -0.2)}" opacity=".35"/>` : ''}
    ${L.beard ? `<path d="M33 50 Q36 58 42 56 Q46 62 50 60 Q54 62 58 56 Q64 58 67 50 Q68 66 58 76 Q54 82 50 86 Q46 82 42 76 Q32 66 33 50 Z" fill="url(#${g}hr)" ${ol(2)}/>
      <path d="M42 64 Q44 72 48 78 M58 64 Q56 72 52 78 M50 66 L50 82" stroke="${shade(L.hair, -0.3)}" stroke-width="1.2" fill="none"/>
      <path d="M43 55 Q50 52 57 55 Q54 58 50 57 Q46 58 43 55 Z" fill="url(#${g}hr)" ${ol(1.4)}/>` : ''}`;
}

/** An arm from the shoulder to a hand, in the body's sleeve, with the hand drawn last (over a grip). */
const arm = (g, from, to, sleeve, plate) => {
  const [x0, y0] = from, [x1, y1] = to, mx = (x0 + x1) / 2 + (x1 > 50 ? 4 : -4), my = (y0 + y1) / 2 + 3;
  const d = `M${x0} ${y0} Q${mx} ${my} ${x1} ${y1}`;
  return `<path d="${d}" stroke="${OUT}" stroke-width="11" fill="none" stroke-linecap="round"/><path d="${d}" stroke="${sleeve}" stroke-width="7.6" fill="none" stroke-linecap="round"/>
    ${plate ? `<path d="${d}" stroke="#fff" stroke-width="1.4" fill="none" opacity=".35" transform="translate(-1.2 -1.2)"/>` : ''}`;
};
const hand = (g, [x, y], skin) => `<circle cx="${x}" cy="${y}" r="4.6" fill="url(#${g}${skin})" ${ol(1.8)}/><path d="M${x - 2.6} ${y - 1} Q${x} ${y + 1.6} ${x + 2.6} ${y - 1}" stroke="${OUT}" stroke-width="0.9" fill="none" opacity=".6"/>`;

export function chibiMarkup(cls, { gem = null, g = 'c' } = {}) {
  const P = HERO[cls], L = LOOK[cls] || { hair: '#4a3020', eye: '#3a2a1a' }, A = gem || P.accent;
  const defs = [lit(`${g}cl`, P.cloth, 0.35, 0.45), lit(`${g}tr`, P.trim, 0.45, 0.35), lit(`${g}le`, P.leather), metal(`${g}mt`, P.metal),
    lit(`${g}sk`, P.skin, 0.25, 0.3), lit(`${g}pl`, '#d8d4c8', 0.2, 0.35), lit(`${g}cp`, shade(P.cloth, -0.2), 0.2, 0.5), lit(`${g}hr`, L.hair, 0.35, 0.4),
    lit(`${g}bt`, shade(P.leather, -0.3), 0.25, 0.4), lin(`${g}wd`, [[0, '#a07848'], [0.5, '#6a4a2a'], [1, '#3a2614']], 0, 0, 1, 0),
    rad(`${g}gl`, [[0, '#ffffff'], [0.4, A], [1, shade(A, -0.4)]])].join('');
  const W = WEAPONS[P.weapon] || WEAPONS.sword, plate = P.body === 'plate';
  const sleeve = plate ? `url(#${g}mt)` : P.body === 'robe' ? `url(#${g}cl)` : `url(#${g}cp)`, skin = L.pale ? 'pl' : 'sk';
  const gripR = [OLDX(W.grip[0]), OLDY(W.grip[1])];
  const gripL = W.off ? [OLDX(W.off[0]), OLDY(W.off[1])] : P.shield ? [24, 80] : [30, 86];
  const cape = P.cape ? `<path d="M33 60 Q50 52 67 60 L79 110 Q64 116 50 113 Q36 116 21 110 Z" fill="url(#${g}cp)" ${ol(2.2)}/>
    <path d="M38 66 L30 110 M62 66 L70 110" stroke="${shade(P.cloth, -0.55)}" stroke-width="1.6" opacity=".6" fill="none"/>` : '';
  const shield = P.shield ? `<path d="M10 64 L36 64 L35 86 Q24 98 11 86 Z" fill="url(#${g}cl)" ${ol(2.4)}/>
    <path d="M13 66.5 L33 66.5 L32.4 85 Q23 94 13.6 85 Z" fill="none" stroke="url(#${g}tr)" stroke-width="2"/>
    <path d="M23 68 L23 90 M15 76 L31 76" stroke="url(#${g}tr)" stroke-width="3.4"/><path d="M14 68 Q18 66 22 67" stroke="#fff" stroke-width="1.2" fill="none" opacity=".5"/>` : '';
  return `<defs>${defs}</defs><g transform="translate(10 10)">${cape}${body(g, P)}
    ${arm(g, [37, 66], gripL, sleeve, plate)}${arm(g, [63, 66], gripR, sleeve, plate)}
    ${shield}${face(g, P, L)}<g transform="${FIT}">${(HEADS[P.head] || HEADS.hood)(g, P)}</g>
    <g transform="${FIT}">${W.draw(g, P, A)}</g>${hand(g, gripR, skin)}${P.shield ? '' : hand(g, gripL, skin)}</g>`;
}
/** A hero's battle figure. `gem` recolors the weapon's focus by its rarity. */
export function chibiImage(cls, gem = null) {
  return svgImage(`chibi2|${cls}|${gem || ''}`, 120, 130, () => chibiMarkup(cls, { gem, g: `c${cls.slice(0, 3)}${gem ? gem.slice(1) : ''}` }), 2, true);
}
