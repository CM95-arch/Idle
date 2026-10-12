// Gear icons as vector art in a 64×64 box, colored by rarity: main (a), light (b), accent/gem (c).
import { svgImage, lit, metal, rad, blur, glowDot, ol } from './core.js';

const RAR = [
  ['#8a9098', '#c9ced6', '#e6e9ed'], ['#2f8a3c', '#6fd47a', '#c6ffb0'], ['#2463b8', '#5aaaff', '#bfe2ff'],
  ['#6a2fb8', '#b06cff', '#f0d0ff'], ['#c46a10', '#ffb83e', '#fff0a0'], ['#b81f48', '#ff5a82', '#ffd34d'],
  ['#8f96b8', '#ffffff', '#6ff2ff'], // Unique: pearl white with a cyan gem
];
const WOOD = '#6a4a2a';
const ICON = {
  staff: (g) => `<path d="M14 58 L46 12" stroke="#0c0a12" stroke-width="7" stroke-linecap="round"/><path d="M14 58 L46 12" stroke="${WOOD}" stroke-width="4" stroke-linecap="round"/>${glowDot(g, 48, 10, 9, 'var(--c)')}<circle cx="48" cy="10" r="6" fill="url(#${g}gm)" ${ol(1.4)}/><path d="M40 16 Q46 22 52 16" stroke="url(#${g}a)" stroke-width="3" fill="none"/>`,
  wand: (g) => `<path d="M16 54 L42 20" stroke="#0c0a12" stroke-width="6" stroke-linecap="round"/><path d="M16 54 L42 20" stroke="url(#${g}a)" stroke-width="3.4" stroke-linecap="round"/>${glowDot(g, 45, 16, 8, 'var(--c)')}<path d="M45 6 L51 16 L45 26 L39 16 Z" fill="url(#${g}gm)" ${ol(1.4)}/>`,
  bow: (g) => `<path d="M18 6 Q52 32 18 58" fill="none" stroke="#0c0a12" stroke-width="7" stroke-linecap="round"/><path d="M18 6 Q52 32 18 58" fill="none" stroke="url(#${g}a)" stroke-width="4" stroke-linecap="round"/><path d="M18 7 L18 57" stroke="#e8e0c8" stroke-width="1.2"/><path d="M30 30 L36 34" stroke="var(--c)" stroke-width="5"/>`,
  dagger: (g) => `<path d="M20 50 L44 10 L48 14 L26 54 Z" fill="url(#${g}m)" ${ol(1.6)}/><path d="M16 44 L30 56" stroke="url(#${g}a)" stroke-width="5"/><path d="M14 58 L22 50" stroke="${WOOD}" stroke-width="5" stroke-linecap="round"/>${glowDot(g, 23, 50, 4, 'var(--c)')}`,
  sword: (g) => `<path d="M18 46 L48 8 L56 8 L56 16 L22 50 Z" fill="url(#${g}m)" ${ol(1.6)}/><path d="M24 44 L52 12" stroke="#fff" stroke-width="1.2" opacity=".6"/><path d="M12 42 L26 56" stroke="url(#${g}a)" stroke-width="6" stroke-linecap="round"/><path d="M8 60 L17 51" stroke="${WOOD}" stroke-width="5" stroke-linecap="round"/>${glowDot(g, 19, 49, 4, 'var(--c)')}`,
  robe: (g) => `<path d="M20 10 Q32 4 44 10 L54 58 Q32 64 10 58 Z" fill="url(#${g}a)" ${ol()}/><path d="M28 10 L32 40 L36 10" stroke="url(#${g}b)" stroke-width="3" fill="none"/><path d="M12 54 Q32 60 52 54" stroke="url(#${g}b)" stroke-width="3" fill="none"/>`,
  leather: (g) => `<path d="M16 12 Q32 6 48 12 L50 52 Q32 58 14 52 Z" fill="url(#${g}a)" ${ol()}/><path d="M18 16 L46 46" stroke="#4a3020" stroke-width="5"/><rect x="14" y="40" width="36" height="5" fill="#3a2418"/>`,
  heavy: (g) => `<path d="M16 14 Q32 8 48 14 L46 50 Q32 56 18 50 Z" fill="url(#${g}m)" ${ol()}/><ellipse cx="16" cy="16" rx="9" ry="7" fill="url(#${g}m)" ${ol(1.6)}/><ellipse cx="48" cy="16" rx="9" ry="7" fill="url(#${g}m)" ${ol(1.6)}/><path d="M32 12 L32 52" stroke="url(#${g}b)" stroke-width="2"/>`,
  ring: (g) => `<circle cx="32" cy="38" r="16" fill="none" stroke="#0c0a12" stroke-width="9"/><circle cx="32" cy="38" r="16" fill="none" stroke="url(#${g}a)" stroke-width="5.5"/>${glowDot(g, 32, 20, 9, 'var(--c)')}<path d="M32 10 L40 20 L32 28 L24 20 Z" fill="url(#${g}gm)" ${ol(1.4)}/>`,
  spell: (g) => `<circle cx="32" cy="34" r="20" fill="url(#${g}a)" ${ol()}/>${glowDot(g, 32, 34, 12, 'var(--c)')}<path d="M32 18 L36 30 L48 34 L36 38 L32 50 L28 38 L16 34 L28 30 Z" fill="url(#${g}gm)"/>`,
  tome: (g) => `<path d="M12 12 L48 8 L52 52 L16 56 Z" fill="url(#${g}a)" ${ol()}/><path d="M16 14 L16 54" stroke="url(#${g}b)" stroke-width="4"/><circle cx="34" cy="31" r="8" fill="url(#${g}gm)" ${ol(1.4)}/>`,
  quiver: (g) => `<path d="M22 20 L42 16 L46 58 L26 60 Z" fill="url(#${g}a)" ${ol()}/>${[0, 1, 2].map((i) => `<path d="M${28 + i * 5} 18 L${26 + i * 6} 4" stroke="#d8c8a0" stroke-width="2"/><path d="M${26 + i * 6} 4 L${23 + i * 6} 9 L${29 + i * 6} 8 Z" fill="var(--c)"/>`).join('')}`,
  cloak: (g) => `<path d="M18 10 Q32 2 46 10 L54 58 Q32 50 10 58 Z" fill="url(#${g}a)" ${ol()}/><path d="M24 12 Q32 20 40 12" stroke="url(#${g}b)" stroke-width="3" fill="none"/><circle cx="32" cy="16" r="3" fill="var(--c)"/>`,
  helm: (g) => `<path d="M14 46 Q12 14 32 10 Q52 14 50 46 L42 50 L42 30 L22 30 L22 50 Z" fill="url(#${g}m)" ${ol()}/><path d="M28 30 L36 30 L36 48 L28 48 Z" fill="#0c0a12"/><path d="M32 10 Q36 0 46 4" stroke="var(--c)" stroke-width="4" fill="none"/>`,
  shield: (g) => `<path d="M12 10 L52 10 L50 36 Q32 60 14 36 Z" fill="url(#${g}a)" ${ol()}/><path d="M12 10 L52 10 L50 36 Q32 60 14 36 Z" fill="none" stroke="url(#${g}m)" stroke-width="3"/><path d="M32 14 L32 46 M20 26 L44 26" stroke="var(--c)" stroke-width="4"/>`,
  trap: (g) => `<circle cx="32" cy="38" r="20" fill="url(#${g}m)" ${ol()}/><circle cx="32" cy="38" r="9" fill="#0c0a12"/>${[0, 1, 2, 3, 4, 5].map((i) => { const a = i / 6 * Math.PI * 2; return `<path d="M${32 + Math.cos(a) * 12} ${38 + Math.sin(a) * 12} L${32 + Math.cos(a) * 22} ${38 + Math.sin(a) * 22}" stroke="#d8d8e0" stroke-width="3"/>`; }).join('')}${glowDot(g, 32, 38, 6, 'var(--c)')}`,
  skull: (g) => `<path d="M14 32 Q14 8 32 8 Q50 8 50 32 Q50 42 42 46 L42 54 L22 54 L22 46 Q14 42 14 32 Z" fill="url(#${g}b)" ${ol()}/><path d="M20 28 L29 30 L28 38 L20 36 Z M44 28 L35 30 L36 38 L44 36 Z" fill="#0c0a12"/>${glowDot(g, 24, 33, 4, 'var(--c)')}${glowDot(g, 40, 33, 4, 'var(--c)')}`,
  poison: (g) => `<path d="M26 8 L38 8 L38 20 Q52 28 50 44 Q48 58 32 58 Q16 58 14 44 Q12 28 26 20 Z" fill="url(#${g}a)" ${ol()} opacity=".9"/><path d="M16 40 Q32 34 48 40 Q48 56 32 56 Q16 56 16 40 Z" fill="var(--c)" opacity=".85"/><rect x="24" y="4" width="16" height="6" rx="2" fill="${WOOD}" ${ol(1.4)}/>`,
  seal: (g) => `<circle cx="32" cy="32" r="22" fill="url(#${g}a)" ${ol()}/><circle cx="32" cy="32" r="15" fill="none" stroke="url(#${g}b)" stroke-width="3"/><path d="M32 20 L32 44 M22 30 L42 30" stroke="var(--c)" stroke-width="4"/>`,
  scepter: (g) => `<path d="M18 56 L40 18" stroke="#0c0a12" stroke-width="7" stroke-linecap="round"/><path d="M18 56 L40 18" stroke="url(#${g}a)" stroke-width="4" stroke-linecap="round"/>${glowDot(g, 44, 12, 10, 'var(--c)')}<circle cx="44" cy="12" r="7" fill="url(#${g}gm)" ${ol(1.4)}/><path d="M36 8 Q44 0 52 8" stroke="url(#${g}b)" stroke-width="2.5" fill="none"/>`,
  bag: (g) => `<path d="M18 22 Q32 16 46 22 L54 50 Q32 62 10 50 Z" fill="url(#${g}a)" ${ol()}/><path d="M22 22 Q32 6 42 22" fill="url(#${g}a)" ${ol(1.8)}/><path d="M20 24 Q32 30 44 24" stroke="url(#${g}b)" stroke-width="3" fill="none"/><circle cx="32" cy="40" r="5" fill="var(--c)"/>`,
};

export function itemMarkup(kind, rarity, g = 'i') {
  const [a, b, c] = RAR[rarity];
  return `<defs>${lit(`${g}a`, a)}${lit(`${g}b`, b)}${metal(`${g}m`, kind === 'heavy' || kind === 'helm' || kind === 'trap' ? b : '#b8bcc8')}${rad(`${g}gm`, [[0, '#fff'], [0.4, c], [1, a]])}${blur(`${g}bl`, 2.6)}</defs>
    <g style="--c:${c}">${(ICON[kind] || ICON.bag)(g)}</g>`.replace(/var\(--c\)/g, c);
}
export function itemImage(kind, rarity) {
  return svgImage(`item|${kind}|${rarity}`, 64, 64, () => itemMarkup(kind, rarity, `i${kind.slice(0, 3)}${rarity}`), 2);
}
export const RARITY_SHADES = RAR;
