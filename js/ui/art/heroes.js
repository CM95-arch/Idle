// The heroes, drawn as layered vector figures in a 200×260 box (feet at y≈250), lit from the upper left.
// Front view for portraits; back view for battle (the party faces the enemy, up the screen).
import { svgImage, shade, lit, metal, lin, rad, blur, glowDot, ol, OUT } from './core.js';

// cloth, trim, leather, metal, skin, accent (magic/glow), and the look of each piece
export const HERO = {
  wizard: { body: 'robe', head: 'hat', weapon: 'staff', cape: true, cloth: '#2c3266', trim: '#b8913a', leather: '#4a3424', metal: '#9a9aa8', skin: '#c99a7c', accent: '#ff7a2e', hair: '#d8d8e0' },
  priest: { body: 'robe', head: 'cowl', weapon: 'wand', cape: false, cloth: '#d6d0c0', trim: '#b8913a', leather: '#6a5038', metal: '#c9b37a', skin: '#d4a88a', accent: '#ffe7a0' },
  archer: { body: 'leather', head: 'hood', weapon: 'bow', cape: true, cloth: '#3a5234', trim: '#a88a52', leather: '#6b4a2e', metal: '#8a8a90', skin: '#c99a7c', accent: '#e8d8a0' },
  rogue: { body: 'leather', head: 'mask', weapon: 'dagger', cape: true, cloth: '#2b2a33', trim: '#7a2a2a', leather: '#463830', metal: '#b8bcc8', skin: '#c08e72', accent: '#d03a3a' },
  warrior: { body: 'plate', head: 'barbute', weapon: 'sword', cape: true, cloth: '#7a1f1f', trim: '#c9a25a', leather: '#4a3424', metal: '#8e939e', skin: '#c08e72', accent: '#ffd7a0' },
  knight: { body: 'plate', head: 'greathelm', weapon: 'sword', cape: true, cloth: '#22345a', trim: '#c0c8d8', leather: '#3a2c24', metal: '#a4b0c4', skin: '#c08e72', accent: '#9ec2ff', shield: true },
  paladin: { body: 'plate', head: 'winged', weapon: 'sword', cape: true, cloth: '#e4ddc8', trim: '#c9a23a', leather: '#5a4030', metal: '#d4ccb0', skin: '#d4a88a', accent: '#ffd98a' },
  huntress: { body: 'leather', head: 'furhood', weapon: 'bow', cape: true, cloth: '#55502e', trim: '#8a7a5a', leather: '#6a4a2a', metal: '#8a8a90', skin: '#c99a7c', accent: '#9be07a' },
  necromancer: { body: 'robe', head: 'skullcowl', weapon: 'staff', cape: true, cloth: '#1d2620', trim: '#5f7a5a', leather: '#2a2420', metal: '#6a6a6a', skin: '#d8d0b8', accent: '#6fff8f' },
  assassin: { body: 'leather', head: 'wrap', weapon: 'dagger', cape: true, cloth: '#2a2236', trim: '#4a8a3a', leather: '#3a2c3a', metal: '#b8bcc8', skin: '#c08e72', accent: '#7cff4a' },
  sorcerer: { body: 'robe', head: 'circlet', weapon: 'wand', cape: true, cloth: '#3a2466', trim: '#c0c8e0', leather: '#2a2040', metal: '#c0c8e0', skin: '#d4a88a', accent: '#5de0ff', hair: '#1a1424' },
};

/** The figure's SVG markup. opts: { back, gem } where gem recolors the weapon's focus (rarity). */
export function heroMarkup(cls, { back = false, gem = null, g = 'h' } = {}) {
  const P = HERO[cls], A = gem || P.accent;
  const defs = [
    lit(`${g}cl`, P.cloth), lit(`${g}tr`, P.trim, 0.4, 0.35), lit(`${g}le`, P.leather), metal(`${g}mt`, P.metal),
    lit(`${g}sk`, P.skin, 0.2, 0.35), lit(`${g}cp`, shade(P.cloth, -0.25), 0.15, 0.55),
    rad(`${g}gl`, [[0, '#ffffff'], [0.35, A], [1, A, 0]]), blur(`${g}bl`, 4), blur(`${g}bs`, 1.6),
    lin(`${g}sh`, [[0, '#000', 0], [1, '#000', 0.55]]),
  ].join('');
  const parts = [];
  // ---- cape, behind everything (front view) / over the back (back view) ----
  const cape = `<path d="M66 116 Q100 98 134 116 L150 238 Q126 246 100 242 Q74 246 50 238 Z" fill="url(#${g}cp)" ${ol()}/>
    <path d="M86 124 L78 236 M114 124 L122 236 M100 122 L100 240" stroke="${shade(P.cloth, -0.55)}" stroke-width="2" opacity=".55" fill="none"/>`;
  if (P.cape && !back) parts.push(cape);
  // ---- legs ----
  if (P.body !== 'robe') {
    const leg = P.body === 'plate' ? `url(#${g}mt)` : `url(#${g}le)`;
    parts.push(`<path d="M84 176 L80 240 L97 240 L99 178 Z" fill="${leg}" ${ol()}/><path d="M116 176 L120 240 L103 240 L101 178 Z" fill="${leg}" ${ol()}/>
      <path d="M76 236 Q88 230 99 236 L99 248 L74 248 Z" fill="${shade(P.leather, -0.3)}" ${ol()}/><path d="M124 236 Q112 230 101 236 L101 248 L126 248 Z" fill="${shade(P.leather, -0.3)}" ${ol()}/>`);
    if (P.body === 'plate') parts.push(`<path d="M82 206 Q90 200 98 206 M118 206 Q110 200 102 206" stroke="${shade(P.metal, 0.5)}" stroke-width="2" fill="none"/>`);
  }
  // ---- body ----
  if (P.body === 'robe') {
    parts.push(`<path d="M72 116 Q100 104 128 116 L146 238 Q100 252 54 238 Z" fill="url(#${g}cl)" ${ol()}/>
      <path d="M90 128 L80 242 M110 128 L120 242 M100 140 L100 246" stroke="${shade(P.cloth, -0.5)}" stroke-width="2.2" opacity=".6" fill="none"/>
      <path d="M56 232 Q100 248 144 232 L146 238 Q100 254 54 238 Z" fill="url(#${g}tr)" opacity=".95"/>
      <path d="M96 118 L100 176 L104 118" stroke="url(#${g}tr)" stroke-width="5" fill="none"/>
      <rect x="76" y="162" width="48" height="8" rx="2" fill="url(#${g}tr)" ${ol(1.6)}/>
      <path d="M66 120 Q100 96 134 120 L130 140 Q100 126 70 140 Z" fill="url(#${g}tr)" ${ol(1.8)}/>`);
  } else if (P.body === 'leather') {
    parts.push(`<path d="M72 116 Q100 104 128 116 L132 184 Q100 194 68 184 Z" fill="url(#${g}cl)" ${ol()}/>
      <path d="M74 122 L126 176" stroke="url(#${g}le)" stroke-width="7" fill="none"/><path d="M74 122 L126 176" stroke="${OUT}" stroke-width="1" opacity=".5" fill="none"/>
      <rect x="70" y="170" width="60" height="9" rx="2" fill="url(#${g}le)" ${ol(1.6)}/><rect x="95" y="170" width="10" height="9" fill="url(#${g}tr)"/>
      <path d="M70 182 L66 204 Q100 212 134 204 L130 182 Z" fill="url(#${g}cl)" ${ol()}/>
      <path d="M68 118 Q100 102 132 118 L128 132 Q100 122 72 132 Z" fill="${shade(P.cloth, -0.2)}" ${ol(1.8)}/>`);
  } else {
    parts.push(`<path d="M84 180 L80 214 Q100 220 120 214 L116 180 Z" fill="url(#${g}cl)" ${ol()}/>
      <path d="M72 116 Q100 106 128 116 L126 180 Q100 188 74 180 Z" fill="url(#${g}mt)" ${ol()}/>
      <path d="M100 114 L100 184" stroke="${shade(P.metal, 0.6)}" stroke-width="2" opacity=".8"/>
      <path d="M76 150 Q100 158 124 150" stroke="${shade(P.metal, -0.5)}" stroke-width="2" fill="none"/>
      <rect x="74" y="174" width="52" height="8" rx="2" fill="url(#${g}le)" ${ol(1.6)}/><rect x="95" y="174" width="10" height="8" fill="url(#${g}tr)"/>
      <path d="M74 182 L70 204 L88 208 L90 184 Z M126 182 L130 204 L112 208 L110 184 Z" fill="url(#${g}mt)" ${ol(1.8)}/>`);
    if (cls === 'paladin' || cls === 'knight') parts.push(`<path d="M90 120 L110 120 L108 186 L100 196 L92 186 Z" fill="url(#${g}cl)" ${ol(1.6)}/><path d="M100 136 L100 170 M92 148 L108 148" stroke="url(#${g}tr)" stroke-width="4"/>`);
  }
  // ---- arms ----
  const sleeve = P.body === 'plate' ? `url(#${g}mt)` : `url(#${g}cl)`;
  parts.push(`<path d="M70 120 Q58 140 54 176 L66 180 Q70 150 80 134 Z" fill="${sleeve}" ${ol()}/><path d="M130 120 Q142 140 146 176 L134 180 Q130 150 120 134 Z" fill="${sleeve}" ${ol()}/>`);
  if (P.body === 'plate') parts.push(`<ellipse cx="70" cy="122" rx="17" ry="13" fill="url(#${g}mt)" ${ol()}/><ellipse cx="130" cy="122" rx="17" ry="13" fill="url(#${g}mt)" ${ol()}/>
    <path d="M56 124 Q70 114 84 124 M116 124 Q130 114 144 124" stroke="url(#${g}tr)" stroke-width="3" fill="none"/>`);
  if (P.body === 'leather') parts.push(`<rect x="52" y="160" width="15" height="14" rx="3" fill="url(#${g}le)" ${ol(1.6)}/><rect x="133" y="160" width="15" height="14" rx="3" fill="url(#${g}le)" ${ol(1.6)}/>`);
  parts.push(`<circle cx="60" cy="182" r="7" fill="url(#${g}sk)" ${ol(1.8)}/><circle cx="140" cy="182" r="7" fill="url(#${g}sk)" ${ol(1.8)}/>`);
  if (P.cape && back) parts.push(cape);
  // ---- head ----
  parts.push(head(P, cls, back, g, A));
  // ---- weapon (in the right hand, viewer's left in front view; mirrored from behind) ----
  const wx = back ? 140 : 60;
  parts.push(weapon(P.weapon, wx, 182, g, P, A, back));
  if (P.shield) parts.push(shield(back ? 60 : 140, 176, g));
  // rim light along the right side
  parts.push(`<path d="M134 120 Q144 150 146 176" stroke="${shade(P.cloth, 0.7)}" stroke-width="1.6" opacity=".35" fill="none"/>`);
  return `<defs>${defs}</defs><ellipse cx="100" cy="249" rx="44" ry="7" fill="#000" opacity=".28"/>${parts.join('')}`;
}

function head(P, cls, back, g, A) {
  const face = back ? '' : `<ellipse cx="100" cy="94" rx="14" ry="17" fill="url(#${g}sk)" ${ol()}/>`;
  const eyes = (c, glow = false) => (back ? '' : `${glow ? glowDot(g, 94, 92, 3, c) + glowDot(g, 106, 92, 3, c) : ''}<path d="M90 92 L97 93 M103 93 L110 92" stroke="${c}" stroke-width="2.4" stroke-linecap="round"/>`);
  const neck = `<rect x="93" y="104" width="14" height="10" fill="${shade(P.skin, -0.3)}"/>`;
  switch (P.head) {
    case 'hat': return `${neck}${face}${back ? `<path d="M84 98 Q100 112 116 98 L114 84 L86 84 Z" fill="${P.hair}" ${ol(1.6)}/>` : `<path d="M88 104 Q100 124 112 104 Q106 112 100 112 Q94 112 88 104 Z" fill="${P.hair}" ${ol(1.4)}/><rect x="86" y="84" width="28" height="9" fill="#000" opacity=".45"/>`}${eyes(A, true)}
      <ellipse cx="100" cy="84" rx="40" ry="9" fill="url(#${g}cl)" ${ol()}/>
      <path d="M74 84 Q86 50 108 30 Q122 16 136 22 Q118 30 116 52 Q114 70 126 84 Z" fill="url(#${g}cl)" ${ol()}/>
      <path d="M76 80 Q100 88 124 80 L125 72 Q100 80 76 72 Z" fill="url(#${g}tr)" ${ol(1.4)}/>
      <circle cx="100" cy="77" r="3.2" fill="${A}"/>`;
    case 'cowl': return `${neck}${back ? '' : `<path d="M78 104 Q76 68 100 64 Q124 68 122 104 L114 112 L86 112 Z" fill="${shade(P.cloth, -0.5)}"/>`}${face}${back ? '' : `<path d="M86 86 Q100 80 114 86 L114 92 Q100 88 86 92 Z" fill="#000" opacity=".35"/>`}${eyes('#3a2a20')}
      <path d="M74 112 Q66 70 100 56 Q134 70 126 112 Q120 90 116 80 Q100 70 84 80 Q80 90 74 112 Z" fill="url(#${g}cl)" ${ol()}/>
      ${back ? `<path d="M76 108 Q70 68 100 58 Q130 68 124 108 Z" fill="url(#${g}cl)" ${ol()}/>` : ''}
      <path d="M84 74 Q100 66 116 74" stroke="url(#${g}tr)" stroke-width="3.5" fill="none"/>${back ? '' : `<circle cx="100" cy="70" r="3" fill="${A}"/>`}`;
    case 'hood': case 'furhood': case 'mask': case 'wrap': case 'skullcowl': {
      const hoodC = P.head === 'skullcowl' ? `url(#${g}cl)` : P.head === 'hood' || P.head === 'furhood' ? `url(#${g}cl)` : `url(#${g}cp)`;
      const inner = back ? '' : P.head === 'skullcowl'
        ? `<path d="M86 84 Q100 74 114 84 L112 104 Q100 112 88 104 Z" fill="${P.skin}" ${ol(1.6)}/><path d="M89 90 L97 92 L96 97 L88 95 Z M111 90 L103 92 L104 97 L112 95 Z" fill="#000"/>${glowDot(g, 93, 94, 3, A)}${glowDot(g, 107, 94, 3, A)}<path d="M93 104 L107 104 M96 101 L96 107 M100 101 L100 107 M104 101 L104 107" stroke="#3a3428" stroke-width="1.2"/>`
        : `<ellipse cx="100" cy="94" rx="14" ry="17" fill="url(#${g}sk)" ${ol()}/><path d="M84 78 Q100 70 116 78 L116 92 Q100 84 84 92 Z" fill="#000" opacity=".55"/>${eyes(P.head === 'wrap' ? A : '#1a1410', P.head === 'wrap')}`
          + (P.head === 'mask' ? `<path d="M86 96 Q100 102 114 96 L114 110 Q100 116 86 110 Z" fill="${shade(P.cloth, -0.2)}" ${ol(1.4)}/>` : '')
          + (P.head === 'wrap' ? `<path d="M85 97 Q100 104 115 97 L114 112 Q100 118 86 112 Z" fill="${P.trim}" ${ol(1.4)}/>` : '');
      const fur = P.head === 'furhood' ? `<path d="M70 108 Q76 96 84 104 Q90 94 98 104 Q104 94 110 104 Q118 94 124 106 Q130 98 132 112 Q100 122 70 112 Z" fill="#b8a888" ${ol(1.6)}/>` : '';
      return `${neck}${back ? '' : `<path d="M76 108 Q72 70 100 62 Q128 70 124 108 Z" fill="#000" opacity=".7"/>`}${inner}
        <path d="M72 114 Q64 66 100 52 Q136 66 128 114 Q124 90 118 80 Q100 70 82 80 Q76 90 72 114 Z" fill="${hoodC}" ${ol()}/>
        ${back ? `<path d="M74 112 Q66 66 100 54 Q134 66 126 112 Q100 120 74 112 Z" fill="${hoodC}" ${ol()}/><path d="M100 58 L100 112" stroke="${shade(P.cloth, -0.5)}" stroke-width="2" opacity=".6"/>` : ''}${fur}`;
    }
    case 'barbute': return `${neck}<path d="M80 108 Q76 66 100 62 Q124 66 120 108 L112 112 L112 92 L88 92 L88 112 Z" fill="url(#${g}mt)" ${ol()}/>
      ${back ? `<path d="M80 108 Q76 66 100 62 Q124 66 120 108 Q100 116 80 108 Z" fill="url(#${g}mt)" ${ol()}/>` : `<path d="M96 80 L104 80 L104 108 L96 108 Z M88 86 L112 86 L112 92 L88 92 Z" fill="#000"/>${glowDot(g, 100, 89, 2.5, '#ff9a6a', 0.6)}`}
      <path d="M100 62 Q104 40 92 30 Q112 34 114 56 Q110 50 104 52 Z" fill="url(#${g}cl)" ${ol(1.8)}/>
      <path d="M80 100 Q100 106 120 100" stroke="${shade(P.metal, 0.6)}" stroke-width="1.5" fill="none" opacity=".7"/>`;
    case 'greathelm': return `${neck}<path d="M80 110 L78 74 Q80 62 100 60 Q120 62 122 74 L120 110 Q100 116 80 110 Z" fill="url(#${g}mt)" ${ol()}/>
      ${back ? '' : `<path d="M84 86 L116 86 L116 91 L84 91 Z M99 91 L101 91 L101 104 L99 104 Z" fill="#000"/>${[0, 1, 2].map((i) => `<circle cx="${90 + i * 4}" cy="98" r="1.2" fill="#000"/><circle cx="${110 - i * 4}" cy="98" r="1.2" fill="#000"/>`).join('')}${glowDot(g, 100, 88, 3, A, 0.5)}`}
      <path d="M100 60 L100 112" stroke="${shade(P.metal, 0.6)}" stroke-width="2" opacity=".6"/><path d="M78 76 L122 76" stroke="url(#${g}tr)" stroke-width="3"/>`;
    case 'winged': return `${neck}<path d="M82 108 Q78 70 100 64 Q122 70 118 108 L110 112 L110 92 L90 92 L90 112 Z" fill="url(#${g}mt)" ${ol()}/>
      ${back ? `<path d="M82 108 Q78 70 100 64 Q122 70 118 108 Q100 116 82 108 Z" fill="url(#${g}mt)" ${ol()}/>` : `<path d="M90 84 L110 84 L110 92 L90 92 Z" fill="#000"/>${glowDot(g, 100, 88, 3, A, 0.6)}`}
      <path d="M80 84 Q62 70 58 50 Q72 62 82 66 Q70 52 72 40 Q84 58 86 72 Z" fill="url(#${g}tr)" ${ol(1.6)}/>
      <path d="M120 84 Q138 70 142 50 Q128 62 118 66 Q130 52 128 40 Q116 58 114 72 Z" fill="url(#${g}tr)" ${ol(1.6)}/>
      <path d="M100 64 L100 112" stroke="url(#${g}tr)" stroke-width="3"/>`;
    case 'circlet': return `${neck}${face}${eyes(A, true)}
      <path d="M84 96 Q78 66 100 62 Q122 66 116 96 Q114 78 100 76 Q86 78 84 96 Z" fill="${P.hair}" ${ol(1.6)}/>
      ${back ? `<path d="M84 104 Q78 66 100 62 Q122 66 116 104 Q100 112 84 104 Z" fill="${P.hair}" ${ol(1.6)}/>` : ''}
      <path d="M84 80 Q100 72 116 80" stroke="url(#${g}tr)" stroke-width="3.5" fill="none"/><path d="M100 70 L96 78 L104 78 Z" fill="${A}"/>
      <path d="M70 116 Q76 96 84 112 L84 124 Z M130 116 Q124 96 116 112 L116 124 Z" fill="url(#${g}tr)" ${ol(1.6)}/>`;
    default: return face;
  }
}

function weapon(kind, x, y, g, P, A, back) {
  const wood = '#5a3c22', steel = P.metal;
  switch (kind) {
    case 'staff': return `<g><path d="M${x - 2} ${y + 60} L${x + 2} ${y - 120}" stroke="${OUT}" stroke-width="8" stroke-linecap="round"/><path d="M${x - 2} ${y + 60} L${x + 2} ${y - 120}" stroke="${wood}" stroke-width="5" stroke-linecap="round"/>
      <path d="M${x - 10} ${y - 118} Q${x} ${y - 140} ${x + 12} ${y - 118} Q${x + 4} ${y - 126} ${x} ${y - 110} Q${x - 4} ${y - 126} ${x - 10} ${y - 118} Z" fill="${wood}" ${ol(1.8)}/>
      ${glowDot(g, x + 1, y - 128, 13, A)}<circle cx="${x + 1}" cy="${y - 128}" r="7" fill="url(#${g}gl)" ${ol(1.2)}/></g>`;
    case 'wand': return `<g><path d="M${x} ${y + 6} L${x + 4} ${y - 60}" stroke="${OUT}" stroke-width="7" stroke-linecap="round"/><path d="M${x} ${y + 6} L${x + 4} ${y - 60}" stroke="url(#${g}tr)" stroke-width="4" stroke-linecap="round"/>
      ${glowDot(g, x + 4, y - 64, 10, A)}<path d="M${x + 4} ${y - 74} L${x + 10} ${y - 64} L${x + 4} ${y - 54} L${x - 2} ${y - 64} Z" fill="url(#${g}gl)" ${ol(1.4)}/></g>`;
    case 'bow': {
      const s = back ? -1 : 1;
      return `<g><path d="M${x} ${y - 70} Q${x - 26 * s} ${y - 10} ${x} ${y + 50}" fill="none" stroke="${OUT}" stroke-width="8" stroke-linecap="round"/>
        <path d="M${x} ${y - 70} Q${x - 26 * s} ${y - 10} ${x} ${y + 50}" fill="none" stroke="${wood}" stroke-width="5" stroke-linecap="round"/>
        <path d="M${x} ${y - 68} L${x} ${y + 48}" stroke="#e8e0c8" stroke-width="1.2"/><path d="M${x - 14 * s} ${y - 12} L${x - 6 * s} ${y - 6}" stroke="url(#${g}tr)" stroke-width="5"/>
        ${glowDot(g, x - 18 * s, y - 10, 5, A, 0.5)}</g>`;
    }
    case 'dagger': return `<g><path d="M${x} ${y + 2} L${x + 3} ${y - 40} L${x + 7} ${y + 2} Z" fill="url(#${g}mt)" ${ol(1.8)}/><path d="M${x + 3} ${y - 36} L${x + 3} ${y}" stroke="${shade(steel, 0.7)}" stroke-width="1"/>
      <rect x="${x - 6}" y="${y + 1}" width="18" height="4" rx="1.5" fill="url(#${g}tr)" ${ol(1.4)}/>${glowDot(g, x + 3, y - 14, 5, A, 0.45)}</g>`;
    case 'sword': return `<g><path d="M${x - 5} ${y - 4} L${x - 4} ${y - 108} L${x + 2} ${y - 120} L${x + 8} ${y - 108} L${x + 9} ${y - 4} Z" fill="url(#${g}mt)" ${ol(2)}/>
      <path d="M${x + 2} ${y - 112} L${x + 2} ${y - 8}" stroke="${shade(steel, 0.75)}" stroke-width="1.4"/>
      <rect x="${x - 14}" y="${y - 6}" width="32" height="6" rx="2" fill="url(#${g}tr)" ${ol(1.6)}/><rect x="${x - 1}" y="${y}" width="6" height="14" fill="${wood}" ${ol(1.4)}/>
      ${glowDot(g, x + 2, y - 3, 4, A, 0.7)}</g>`;
    default: return '';
  }
}
function shield(x, y, g) {
  return `<g><path d="M${x - 22} ${y - 30} L${x + 22} ${y - 30} L${x + 20} ${y + 6} Q${x} ${y + 34} ${x - 20} ${y + 6} Z" fill="url(#${g}cl)" ${ol(2.2)}/>
    <path d="M${x - 22} ${y - 30} L${x + 22} ${y - 30} L${x + 20} ${y + 6} Q${x} ${y + 34} ${x - 20} ${y + 6} Z" fill="none" stroke="url(#${g}mt)" stroke-width="4"/>
    <path d="M${x} ${y - 24} L${x} ${y + 20} M${x - 14} ${y - 6} L${x + 14} ${y - 6}" stroke="url(#${g}tr)" stroke-width="4"/></g>`;
}

/** Cached image of a hero. */
export function heroImage(cls, back = false, gem = null) {
  return svgImage(`hero|${cls}|${back}|${gem}`, 200, 260, () => heroMarkup(cls, { back, gem, g: `h${cls.slice(0, 3)}${back ? 'b' : 'f'}` }), 1.7, { inset: 0.012 });
}
