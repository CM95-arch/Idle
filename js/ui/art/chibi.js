// The heroes as chunky little battle figures for the horde view: big head, short body, weapon up and ready,
// thick ink outline and bold cel shading (like a mobile survivor game). 80×96 box, feet at y≈90.
// They use the same palettes as the portraits (art/heroes.js) so a class always reads as itself.
import { svgImage, shade, lit, metal, lin, rad, glowDot, ol, OUT } from './core.js';
import { HERO } from './heroes.js';

const HEADS = {
  hat: (g, P) => `<path d="M14 40 Q40 30 66 40 Q66 48 40 46 Q14 48 14 40 Z" fill="url(#${g}cl)" ${ol(2.4)}/>
    <path d="M24 40 Q30 18 44 4 Q46 2 48 6 Q50 22 58 40 Q40 34 24 40 Z" fill="url(#${g}cl)" ${ol(2.4)}/>
    <path d="M25 37 Q40 31 57 37 L57 41 Q40 36 25 41 Z" fill="url(#${g}tr)"/><circle cx="46" cy="5" r="2.4" fill="${P.accent}"/>`,
  cowl: (g) => `<path d="M17 50 Q14 18 40 14 Q66 18 63 50 Q60 34 40 31 Q20 34 17 50 Z" fill="url(#${g}cl)" ${ol(2.4)}/>
    <path d="M30 18 L40 24 L50 18" stroke="url(#${g}tr)" stroke-width="3" fill="none"/>`,
  hood: (g) => `<path d="M15 54 Q12 16 40 12 Q68 16 65 54 Q60 34 40 30 Q20 34 15 54 Z" fill="url(#${g}cp)" ${ol(2.4)}/>
    <path d="M40 12 Q52 14 58 26" stroke="${OUT}" stroke-width="1" opacity=".4" fill="none"/>`,
  mask: (g, P) => `${HEADS.hood(g)}<path d="M22 46 Q40 54 58 46 L58 54 Q40 62 22 54 Z" fill="${shade(P.cloth, -0.35)}" ${ol(2)}/>`,
  barbute: (g) => `<path d="M16 50 Q14 14 40 12 Q66 14 64 50 L52 50 L52 36 L28 36 L28 50 Z" fill="url(#${g}mt)" ${ol(2.4)}/>
    <path d="M40 12 L40 36" stroke="#fff" stroke-width="1.6" opacity=".5"/><path d="M58 18 Q70 6 64 0" stroke="#c03030" stroke-width="5" fill="none" stroke-linecap="round"/>`,
  greathelm: (g, P) => `<path d="M15 54 Q13 12 40 10 Q67 12 65 54 Z" fill="url(#${g}mt)" ${ol(2.4)}/>
    <rect x="22" y="32" width="36" height="5" rx="2" fill="${OUT}"/><path d="M40 37 L40 52" stroke="${OUT}" stroke-width="3"/>
    <path d="M40 10 L40 30" stroke="#fff" stroke-width="1.6" opacity=".5"/><circle cx="40" cy="22" r="2.4" fill="${P.accent}"/>`,
  winged: (g, P) => `${HEADS.greathelm(g, P)}<path d="M14 30 Q0 20 2 6 Q10 18 18 22 Z M66 30 Q80 20 78 6 Q70 18 62 22 Z" fill="#fff" ${ol(1.8)}/>`,
  furhood: (g) => `<path d="M14 54 Q10 14 40 10 Q70 14 66 54 Q60 32 40 29 Q20 32 14 54 Z" fill="url(#${g}le)" ${ol(2.4)}/>
    <path d="M14 30 L18 22 L22 30 L26 20 L30 28 M50 28 L54 20 L58 30 L62 22 L66 30" stroke="${OUT}" stroke-width="1.6" fill="none" opacity=".5"/>`,
  skullcowl: (g, P) => `${HEADS.hood(g)}<path d="M28 18 Q40 6 52 18 Q54 26 48 28 L32 28 Q26 26 28 18 Z" fill="#e8e0c8" ${ol(1.8)}/>
    <circle cx="35" cy="20" r="2.6" fill="${P.accent}"/><circle cx="45" cy="20" r="2.6" fill="${P.accent}"/>`,
  wrap: (g, P) => `<path d="M16 46 Q14 14 40 12 Q66 14 64 46 Q58 30 40 28 Q22 30 16 46 Z" fill="url(#${g}cl)" ${ol(2.4)}/>
    <path d="M18 46 Q40 54 62 46 L62 56 Q40 64 18 56 Z" fill="url(#${g}cl)" ${ol(2)}/><path d="M60 22 Q72 26 72 38" stroke="${P.trim}" stroke-width="4" fill="none" stroke-linecap="round"/>`,
  circlet: (g, P) => `<path d="M16 48 Q12 14 40 12 Q68 14 64 48 Q62 26 40 24 Q18 26 16 48 Z" fill="${P.hair || '#2a2030'}" ${ol(2.4)}/>
    <path d="M20 30 Q40 22 60 30" stroke="url(#${g}tr)" stroke-width="3.6" fill="none"/>${glowDot(g, 40, 25, 5, P.accent)}<circle cx="40" cy="25" r="3" fill="${P.accent}" ${ol(1.2)}/>`,
};

const WEAPONS = {
  staff: (g, P, A) => `<path d="M60 88 L72 14" stroke="${OUT}" stroke-width="7" stroke-linecap="round"/><path d="M60 88 L72 14" stroke="#7a5230" stroke-width="4" stroke-linecap="round"/>
    ${glowDot(g, 73, 11, 11, A)}<circle cx="73" cy="11" r="6.5" fill="url(#${g}gl)" ${ol(1.8)}/><path d="M66 18 Q73 24 80 18" stroke="url(#${g}tr)" stroke-width="2.6" fill="none"/>`,
  wand: (g, P, A) => `<path d="M60 72 L72 34" stroke="${OUT}" stroke-width="6" stroke-linecap="round"/><path d="M60 72 L72 34" stroke="url(#${g}tr)" stroke-width="3" stroke-linecap="round"/>
    ${glowDot(g, 73, 30, 8, A)}<path d="M73 22 L78 30 L73 38 L68 30 Z" fill="url(#${g}gl)" ${ol(1.6)}/>`,
  bow: (g, P, A) => `<path d="M60 20 Q84 52 60 86" fill="none" stroke="${OUT}" stroke-width="7" stroke-linecap="round"/><path d="M60 20 Q84 52 60 86" fill="none" stroke="url(#${g}le)" stroke-width="4" stroke-linecap="round"/>
    <path d="M60 21 L60 85" stroke="#eee" stroke-width="1.2"/><path d="M52 53 L76 53" stroke="${OUT}" stroke-width="3.4"/><path d="M52 53 L76 53" stroke="#d8c8a0" stroke-width="1.6"/><path d="M76 49 L82 53 L76 57 Z" fill="${A}" ${ol(1)}/>`,
  dagger: (g, P, A) => `<path d="M58 66 L74 34 L78 36 L64 70 Z" fill="url(#${g}mt)" ${ol(1.8)}/><path d="M54 64 L66 72" stroke="url(#${g}tr)" stroke-width="5" stroke-linecap="round"/>
    <path d="M22 66 L8 40 L4 42 L16 70 Z" fill="url(#${g}mt)" ${ol(1.8)}/><path d="M26 64 L14 72" stroke="url(#${g}tr)" stroke-width="5" stroke-linecap="round"/>${glowDot(g, 76, 36, 4, A)}`,
  sword: (g, P, A) => `<path d="M60 70 L74 8 L80 10 L68 72 Z" fill="url(#${g}mt)" ${ol(2)}/><path d="M64 66 L76 12" stroke="#fff" stroke-width="1.4" opacity=".7"/>
    <path d="M54 68 L76 74" stroke="url(#${g}tr)" stroke-width="5.5" stroke-linecap="round"/><path d="M62 74 L58 86" stroke="#4a3020" stroke-width="5" stroke-linecap="round"/>${glowDot(g, 64, 71, 4, A)}`,
};

function bodyMarkup(g, P) {
  // stubby legs and boots
  const boots = `<path d="M28 76 L27 88 L39 88 L39 76 Z M52 76 L53 88 L41 88 L41 76 Z" fill="url(#${g}${P.body === 'plate' ? 'mt' : 'le'})" ${ol(2.2)}/>
    <path d="M24 86 Q32 82 40 86 L40 92 L24 92 Z M56 86 Q48 82 40 86 L40 92 L56 92 Z" fill="${shade(P.leather, -0.35)}" ${ol(2)}/>`;
  if (P.body === 'robe') return `<path d="M22 54 Q40 46 58 54 L66 88 Q40 96 14 88 Z" fill="url(#${g}cl)" ${ol(2.4)}/>
    <path d="M15 84 Q40 92 65 84 L66 88 Q40 96 14 88 Z" fill="url(#${g}tr)"/><path d="M38 56 L40 82 L42 56" stroke="url(#${g}tr)" stroke-width="3" fill="none"/>
    <rect x="26" y="68" width="28" height="5" rx="2" fill="url(#${g}tr)" ${ol(1.4)}/>`;
  if (P.body === 'leather') return `${boots}<path d="M22 54 Q40 46 58 54 L60 80 Q40 86 20 80 Z" fill="url(#${g}cl)" ${ol(2.4)}/>
    <path d="M24 56 L56 78" stroke="url(#${g}le)" stroke-width="5"/><rect x="20" y="72" width="40" height="6" rx="2" fill="url(#${g}le)" ${ol(1.4)}/><rect x="37" y="72" width="6" height="6" fill="url(#${g}tr)"/>`;
  return `${boots}<path d="M22 54 Q40 46 58 54 L58 80 Q40 86 22 80 Z" fill="url(#${g}mt)" ${ol(2.4)}/>
    <path d="M40 50 L40 82" stroke="#fff" stroke-width="1.4" opacity=".5"/><rect x="22" y="74" width="36" height="6" rx="2" fill="url(#${g}le)" ${ol(1.4)}/>
    <ellipse cx="18" cy="56" rx="9" ry="7" fill="url(#${g}mt)" ${ol(2)}/><ellipse cx="62" cy="56" rx="9" ry="7" fill="url(#${g}mt)" ${ol(2)}/>`;
}

export function chibiMarkup(cls, { gem = null, g = 'c' } = {}) {
  const P = HERO[cls], A = gem || P.accent;
  const defs = [lit(`${g}cl`, P.cloth, 0.35, 0.45), lit(`${g}tr`, P.trim, 0.45, 0.35), lit(`${g}le`, P.leather), metal(`${g}mt`, P.metal),
    lit(`${g}sk`, P.skin, 0.25, 0.3), lit(`${g}cp`, shade(P.cloth, -0.2), 0.2, 0.5),
    rad(`${g}gl`, [[0, '#ffffff'], [0.4, A], [1, shade(A, -0.4)]]), lin(`${g}rim`, [[0, '#fff', 0.35], [0.4, '#fff', 0]], 0, 0, 1, 1)].join('');
  const cape = P.cape ? `<path d="M20 52 Q40 44 60 52 L66 86 Q40 92 14 86 Z" fill="url(#${g}cp)" ${ol(2.2)}/>` : '';
  const shield = P.shield ? `<path d="M2 54 L22 54 L21 72 Q12 82 3 72 Z" fill="url(#${g}cl)" ${ol(2.2)}/><path d="M12 56 L12 76 M5 64 L19 64" stroke="url(#${g}tr)" stroke-width="3"/>` : '';
  const arms = `<ellipse cx="20" cy="66" rx="5.5" ry="7" fill="url(#${g}sk)" ${ol(2)}/><ellipse cx="60" cy="68" rx="5.5" ry="7" fill="url(#${g}sk)" ${ol(2)}/>`;
  // a big round head, a determined face
  const face = `<circle cx="40" cy="38" r="19" fill="url(#${g}sk)" ${ol(2.4)}/>
    <ellipse cx="33" cy="40" rx="3.2" ry="4" fill="${OUT}"/><ellipse cx="47" cy="40" rx="3.2" ry="4" fill="${OUT}"/>
    <circle cx="34" cy="38.6" r="1.2" fill="#fff"/><circle cx="48" cy="38.6" r="1.2" fill="#fff"/>
    <path d="M28 33 L37 35 M52 33 L43 35" stroke="${OUT}" stroke-width="2.2" stroke-linecap="round"/>
    <path d="M37 48 Q40 49.5 43 48" stroke="${OUT}" stroke-width="1.8" fill="none" stroke-linecap="round"/>
    <ellipse cx="28" cy="45" rx="3" ry="1.8" fill="#ff8a8a" opacity=".35"/><ellipse cx="52" cy="45" rx="3" ry="1.8" fill="#ff8a8a" opacity=".35"/>`;
  return `<defs>${defs}</defs>${cape}${bodyMarkup(g, P)}${shield}${arms}${face}${(HEADS[P.head] || HEADS.hood)(g, P)}
    <circle cx="40" cy="38" r="19" fill="url(#${g}rim)"/>${(WEAPONS[P.weapon] || WEAPONS.sword)(g, P, A)}`;
}
/** A hero's battle figure. `gem` recolors the weapon's focus by its rarity. */
export function chibiImage(cls, gem = null) {
  return svgImage(`chibi|${cls}|${gem || ''}`, 80, 96, () => chibiMarkup(cls, { gem, g: `c${cls.slice(0, 3)}${gem ? gem.slice(1) : ''}` }), 2);
}
