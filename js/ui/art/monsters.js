// Enemies and bosses as vector figures in a 200×200 box (ground at y≈190), facing the party (down the screen).
// Each archetype is a function of a palette { a: main, b: light/secondary, c: accent/eyes }.
import { svgImage, shade, lit, metal, rad, blur, glowDot, ol } from './core.js';

const eyesGlow = (g, pts, c, r = 3.2) => pts.map(([x, y]) => `${glowDot(g, x, y, r * 1.9, c, 0.7)}<circle cx="${x}" cy="${y}" r="${r}" fill="${c}"/><circle cx="${x - r * 0.3}" cy="${y - r * 0.3}" r="${r * 0.35}" fill="#fff"/>`).join('');
const ground = (rx = 52) => `<ellipse cx="100" cy="190" rx="${rx}" ry="8" fill="#000" opacity=".3"/>`;

const ARCH = {
  // armed humanoid: pirates, orcs, elves, guards, henchmen (variant picks headgear and weapon)
  // armed humanoid, chibi-built like the heroes: pirates, goblins, orcs, elves, guards, henchmen
  humanoid(g, P, v = {}) {
    const skin = v.skin || '#b08a70', green = /^#[4-7][0-9a-f][7-9a-f]/i.test(skin) && parseInt(skin.slice(3, 5), 16) > parseInt(skin.slice(1, 3), 16);
    const hat = {
      bandana: `<path d="M64 74 Q100 40 136 74 L136 84 Q100 66 64 84 Z" fill="url(#${g}b)" ${ol()}/><path d="M74 70 Q100 52 126 70" stroke="#fff" stroke-width="2" fill="none" opacity=".35"/>
        ${[78, 92, 108, 122].map((x) => `<circle cx="${x}" cy="${70 - Math.abs(100 - x) * 0.18}" r="2.2" fill="#fff" opacity=".7"/>`).join('')}<path d="M132 76 L152 88 L138 94 Z M134 80 L148 100 L136 98 Z" fill="url(#${g}b)" ${ol(1.6)}/>`,
      hood: `<path d="M60 110 Q54 42 100 34 Q146 42 140 110 Q132 72 100 66 Q68 72 60 110 Z" fill="url(#${g}a)" ${ol()}/><path d="M100 34 Q122 38 132 60" stroke="#fff" stroke-width="2" fill="none" opacity=".25"/>`,
      helm: `<path d="M62 96 Q60 44 100 40 Q140 44 138 96 L124 98 L124 78 L76 78 L76 98 Z" fill="url(#${g}m)" ${ol()}/><path d="M100 40 L100 78" stroke="#fff" stroke-width="2.4" opacity=".55"/>
        <path d="M72 58 Q76 48 88 44" stroke="#fff" stroke-width="2" fill="none" opacity=".4"/><rect x="62" y="74" width="76" height="7" rx="3" fill="url(#${g}m)" ${ol(1.6)}/>`,
      horns: `<path d="M68 72 Q48 52 52 26 Q66 48 80 60 Z M132 72 Q152 52 148 26 Q134 48 120 60 Z" fill="url(#${g}h)" ${ol(1.8)}/><path d="M58 40 Q62 52 72 60 M142 40 Q138 52 128 60" stroke="#fff" stroke-width="1.6" fill="none" opacity=".4"/>`,
      crown: `<path d="M68 62 L72 30 L86 50 L100 24 L114 50 L128 30 L132 62 Z" fill="url(#${g}c)" ${ol(1.8)}/>${[[72, 32], [100, 26], [128, 32]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="3.4" fill="#ff4a5a" ${ol(1)}/>`).join('')}`,
    }[v.hat || 'hood'] || '';
    const wpn = {
      blade: `<path d="M150 158 L176 82 L184 86 L160 160 Z" fill="url(#${g}m)" ${ol(1.8)}/><path d="M155 154 L179 86" stroke="#fff" stroke-width="1.4" opacity=".6"/><rect x="144" y="152" width="22" height="7" rx="3" transform="rotate(-18 155 155)" fill="url(#${g}c)" ${ol(1.4)}/>`,
      axe: `<path d="M152 172 L172 62" stroke="${'#1a1020'}" stroke-width="9" stroke-linecap="round"/><path d="M152 172 L172 62" stroke="#6a4a2a" stroke-width="6" stroke-linecap="round"/><path d="M166 66 Q196 70 190 104 Q176 92 162 96 Z" fill="url(#${g}m)" ${ol(1.8)}/><path d="M172 72 Q186 76 186 94" stroke="#fff" stroke-width="1.6" fill="none" opacity=".5"/>`,
      staff: `<path d="M154 176 L166 44" stroke="#1a1020" stroke-width="9" stroke-linecap="round"/><path d="M154 176 L166 44" stroke="#6a4a2a" stroke-width="6" stroke-linecap="round"/>${glowDot(g, 167, 38, 14, P.c)}<circle cx="167" cy="38" r="8" fill="url(#${g}gl)" ${ol(1.4)}/>`,
      spear: `<path d="M150 178 L178 34" stroke="#1a1020" stroke-width="8" stroke-linecap="round"/><path d="M150 178 L178 34" stroke="#7a5a38" stroke-width="5" stroke-linecap="round"/><path d="M178 34 L170 14 L186 22 Z" fill="url(#${g}m)" ${ol(1.6)}/><path d="M168 60 L182 64" stroke="url(#${g}c)" stroke-width="4"/>`,
    }[v.weapon || 'blade'] || '';
    const big = v.big ? 1.14 : 1;
    const tusks = green ? `<path d="M86 108 L88 98 L92 108 Z M114 108 L112 98 L108 108 Z" fill="#f4eee0" ${ol(1.2)}/>` : '';
    return `<g transform="translate(100 190) scale(${big}) translate(-100 -190)">${ground(44)}
      <path d="M80 160 L78 184 L96 184 L97 160 Z M120 160 L122 184 L104 184 L103 160 Z" fill="${shade(P.a, -0.45)}" ${ol()}/>
      <path d="M74 182 Q86 176 98 182 L98 190 L72 190 Z M126 182 Q114 176 102 182 L102 190 L128 190 Z" fill="${shade(P.a, -0.65)}" ${ol(1.8)}/>
      <path d="M70 116 Q100 104 130 116 L136 166 Q100 176 64 166 Z" fill="url(#${g}a)" ${ol()}/>
      <path d="M80 122 Q78 146 76 164 M120 122 Q122 146 124 164" stroke="${shade(P.a, -0.45)}" stroke-width="2" fill="none" opacity=".7"/>
      <path d="M88 118 L100 146 L112 118" stroke="url(#${g}b)" stroke-width="5" fill="none" stroke-linejoin="round"/>
      <rect x="66" y="148" width="68" height="9" rx="3" fill="${shade(P.a, -0.55)}" ${ol(1.6)}/><rect x="94" y="146" width="12" height="13" rx="2" fill="url(#${g}c)" ${ol(1.4)}/>
      <path d="M72 120 Q56 136 56 156" stroke="#120c18" stroke-width="17" fill="none" stroke-linecap="round"/><path d="M72 120 Q56 136 56 156" stroke="url(#${g}a)" stroke-width="12" fill="none" stroke-linecap="round"/>
      <path d="M128 120 Q144 136 150 154" stroke="#120c18" stroke-width="17" fill="none" stroke-linecap="round"/><path d="M128 120 Q144 136 150 154" stroke="url(#${g}a)" stroke-width="12" fill="none" stroke-linecap="round"/>
      ${wpn}<circle cx="56" cy="158" r="8" fill="url(#${g}s)" ${ol(1.8)}/><circle cx="152" cy="156" r="8" fill="url(#${g}s)" ${ol(1.8)}/>
      ${green ? `<path d="M64 80 L44 70 L62 92 Z M136 80 L156 70 L138 92 Z" fill="url(#${g}s)" ${ol(1.8)}/>` : ''}
      <circle cx="100" cy="84" r="32" fill="url(#${g}s)" ${ol()}/>
      <path d="M76 70 Q82 58 94 54" stroke="#fff" stroke-width="2.4" fill="none" opacity=".25" stroke-linecap="round"/>
      <path d="M78 76 L94 82 M122 76 L106 82" stroke="#1a0c10" stroke-width="3.4" stroke-linecap="round"/>
      <ellipse cx="89" cy="88" rx="5.6" ry="5" fill="#fff8e8" ${ol(1.4)}/><ellipse cx="111" cy="88" rx="5.6" ry="5" fill="#fff8e8" ${ol(1.4)}/>
      ${glowDot(g, 90, 89, 3.4, P.c, 0.8)}${glowDot(g, 110, 89, 3.4, P.c, 0.8)}<circle cx="90" cy="89" r="3" fill="${P.c}"/><circle cx="110" cy="89" r="3" fill="${P.c}"/><circle cx="90" cy="89" r="1.3" fill="#000"/><circle cx="110" cy="89" r="1.3" fill="#000"/>
      <path d="M88 104 Q100 98 112 104 Q106 110 100 110 Q94 110 88 104 Z" fill="#2a0c10" ${ol(1.4)}/>${tusks}
      ${v.beard ? `<path d="M70 92 Q74 104 84 104 Q92 112 100 108 Q108 112 116 104 Q126 104 130 92 Q134 124 116 140 Q108 150 100 156 Q92 150 84 140 Q66 124 70 92 Z" fill="url(#${g}h)" ${ol(2)}/>
        <path d="M86 116 Q90 132 96 144 M114 116 Q110 132 104 144 M100 118 L100 150" stroke="${shade('#e8dcc0', -0.35)}" stroke-width="1.6" fill="none"/>
        <path d="M86 102 Q100 96 114 102 Q108 108 100 106 Q92 108 86 102 Z" fill="url(#${g}h)" ${ol(1.4)}/>` : ''}
      ${hat}</g>`;
  },
  crab(g, P) {
    const leg = (s) => [0, 1, 2].map((i) => `<path d="M${100 + s * 40} ${128 + i * 10} Q${100 + s * 70} ${120 + i * 12} ${100 + s * 76} ${160 + i * 8}" stroke="${shade(P.a, -0.4)}" stroke-width="6" fill="none" stroke-linecap="round"/>`).join('');
    const claw = (s) => `<path d="M${100 + s * 46} ${110} Q${100 + s * 74} ${80} ${100 + s * 70} ${54} Q${100 + s * 90} ${62} ${100 + s * 86} ${86} Q${100 + s * 84} ${70} ${100 + s * 74} ${74} Q${100 + s * 78} ${96} ${100 + s * 54} ${120} Z" fill="url(#${g}a)" ${ol()}/>`;
    return `${ground(60)}${leg(-1)}${leg(1)}${claw(-1)}${claw(1)}
      <ellipse cx="100" cy="132" rx="56" ry="36" fill="url(#${g}a)" ${ol()}/>
      <path d="M58 126 Q100 104 142 126" stroke="${shade(P.a, 0.4)}" stroke-width="3" fill="none" opacity=".7"/>
      <path d="M86 104 L84 86 M114 104 L116 86" stroke="${shade(P.a, -0.3)}" stroke-width="4"/>${eyesGlow(g, [[84, 84], [116, 84]], P.c, 4)}`;
  },
  slime(g, P) {
    return `${ground(56)}<path d="M48 186 Q40 128 74 96 Q100 66 126 94 Q164 124 154 186 Q100 194 48 186 Z" fill="url(#${g}a)" ${ol()} opacity=".96"/>
      <path d="M60 150 Q58 118 80 100" stroke="#fff" stroke-width="7" opacity=".45" fill="none" stroke-linecap="round"/><circle cx="92" cy="92" r="5" fill="#fff" opacity=".6"/>
      <circle cx="122" cy="162" r="10" fill="${shade(P.a, -0.3)}" opacity=".5"/><circle cx="78" cy="172" r="6" fill="${shade(P.a, -0.3)}" opacity=".5"/><circle cx="132" cy="138" r="4" fill="#fff" opacity=".35"/>
      <ellipse cx="86" cy="134" rx="7" ry="8" fill="#fff" ${ol(1.6)}/><ellipse cx="116" cy="134" rx="7" ry="8" fill="#fff" ${ol(1.6)}/>
      <circle cx="87" cy="136" r="4.4" fill="${P.c === '#2a1a0a' ? '#2a1a0a' : P.c}"/><circle cx="117" cy="136" r="4.4" fill="${P.c === '#2a1a0a' ? '#2a1a0a' : P.c}"/><circle cx="85" cy="133" r="1.8" fill="#fff"/><circle cx="115" cy="133" r="1.8" fill="#fff"/>
      <path d="M88 154 Q101 166 114 154 Q101 160 88 154 Z" fill="#2a0c14" ${ol(1.6)}/>
      <ellipse cx="74" cy="150" rx="6" ry="3" fill="#ff7a8a" opacity=".35"/><ellipse cx="128" cy="150" rx="6" ry="3" fill="#ff7a8a" opacity=".35"/>`;
  },
  serpent(g, P, v = {}) {
    return `${ground(52)}<path d="M54 184 Q46 150 84 146 Q130 142 140 168 Q148 190 112 188 Q78 186 92 166" fill="none" stroke="${shade(P.a, -0.55)}" stroke-width="30" stroke-linecap="round"/>
      <path d="M54 184 Q46 150 84 146 Q130 142 140 168 Q148 190 112 188 Q78 186 92 166" fill="none" stroke="url(#${g}a)" stroke-width="24" stroke-linecap="round"/>
      <path d="M92 166 Q86 120 102 88" fill="none" stroke="${shade(P.a, -0.55)}" stroke-width="26" stroke-linecap="round"/><path d="M92 166 Q86 120 102 88" fill="none" stroke="url(#${g}a)" stroke-width="20" stroke-linecap="round"/>
      <path d="M96 150 Q92 124 102 98" fill="none" stroke="url(#${g}b)" stroke-width="7" stroke-linecap="round" opacity=".9"/>
      ${v.hood ? `<path d="M74 92 Q72 52 104 46 Q136 52 132 92 Q118 76 104 74 Q88 76 74 92 Z" fill="url(#${g}a)" ${ol()}/><path d="M86 82 Q104 62 122 82" stroke="url(#${g}b)" stroke-width="4" fill="none"/>` : ''}
      <path d="M84 84 Q86 60 104 58 Q122 60 124 84 Q114 98 104 98 Q94 98 84 84 Z" fill="url(#${g}a)" ${ol()}/>
      ${eyesGlow(g, [[95, 76], [113, 76]], P.c, 3.2)}<path d="M104 96 L104 106 L100 112 M104 106 L108 112" stroke="#d03030" stroke-width="2" fill="none"/>`;
  },
  skeleton(g, P) {
    const bone = `url(#${g}a)`;
    return `${ground(40)}<path d="M88 150 L84 186 M112 150 L116 186" stroke="#120c18" stroke-width="12" stroke-linecap="round"/><path d="M88 150 L84 186 M112 150 L116 186" stroke="${bone}" stroke-width="7" stroke-linecap="round"/>
      <path d="M100 106 L100 152" stroke="#120c18" stroke-width="11"/><path d="M100 106 L100 152" stroke="${bone}" stroke-width="6"/>
      ${[0, 1, 2].map((i) => `<path d="M80 ${116 + i * 10} Q100 ${108 + i * 10} 120 ${116 + i * 10}" stroke="#120c18" stroke-width="8" fill="none" stroke-linecap="round"/><path d="M80 ${116 + i * 10} Q100 ${108 + i * 10} 120 ${116 + i * 10}" stroke="${bone}" stroke-width="4.4" fill="none" stroke-linecap="round"/>`).join('')}
      <path d="M84 148 Q100 156 116 148" stroke="#120c18" stroke-width="9" fill="none" stroke-linecap="round"/><path d="M84 148 Q100 156 116 148" stroke="${bone}" stroke-width="5" fill="none" stroke-linecap="round"/>
      <path d="M78 112 L60 150 M122 112 L142 148" stroke="#120c18" stroke-width="11" stroke-linecap="round"/><path d="M78 112 L60 150 M122 112 L142 148" stroke="${bone}" stroke-width="6" stroke-linecap="round"/>
      <path d="M142 150 L160 66" stroke="#120c18" stroke-width="8" stroke-linecap="round"/><path d="M142 150 L160 66" stroke="#8a7a68" stroke-width="5" stroke-linecap="round"/><path d="M154 70 L162 40 L168 72 Z" fill="url(#${g}m)" ${ol(1.4)}/>
      <path d="M68 76 Q66 36 100 32 Q134 36 132 76 Q132 98 116 104 L116 112 L84 112 L84 104 Q68 98 68 76 Z" fill="${bone}" ${ol()}/>
      <path d="M76 56 Q82 42 96 38" stroke="#fff" stroke-width="3" fill="none" opacity=".45" stroke-linecap="round"/>
      <path d="M78 70 Q86 64 96 72 L94 86 Q84 88 78 80 Z M122 70 Q114 64 104 72 L106 86 Q116 88 122 80 Z" fill="#120a14"/>
      ${glowDot(g, 88, 78, 5, P.c, 0.95)}${glowDot(g, 112, 78, 5, P.c, 0.95)}<circle cx="88" cy="78" r="2.6" fill="${P.c}"/><circle cx="112" cy="78" r="2.6" fill="${P.c}"/>
      <path d="M97 90 L100 96 L103 90 Z" fill="#120a14"/><path d="M86 104 L114 104 M90 100 L90 110 M96 100 L96 111 M104 100 L104 111 M110 100 L110 110" stroke="#120a14" stroke-width="1.8"/>`;
  },
  ghost(g, P) {
    return `<ellipse cx="100" cy="190" rx="30" ry="5" fill="#000" opacity=".2"/>${glowDot(g, 100, 110, 50, P.b, 0.35)}
      <path d="M56 160 Q48 80 100 40 Q152 80 144 160 Q136 150 130 172 Q120 156 112 182 Q104 160 94 180 Q86 156 76 174 Q68 150 56 160 Z" fill="url(#${g}a)" ${ol()} opacity=".9"/>
      <path d="M68 130 Q66 88 96 60" stroke="#fff" stroke-width="6" opacity=".3" fill="none" stroke-linecap="round"/>
      <path d="M118 120 Q130 132 128 150 M72 150 Q78 140 76 130" stroke="${shade(P.a, -0.35)}" stroke-width="2.4" fill="none" opacity=".6"/>
      <path d="M78 90 Q86 80 96 88 L96 104 Q86 110 78 102 Z M122 90 Q114 80 104 88 L104 104 Q114 110 122 102 Z" fill="#0c0814"/>
      ${glowDot(g, 88, 96, 5, P.c, 0.95)}${glowDot(g, 112, 96, 5, P.c, 0.95)}<circle cx="88" cy="96" r="3" fill="${P.c}"/><circle cx="112" cy="96" r="3" fill="${P.c}"/>
      <path d="M90 118 Q100 112 110 118 Q108 132 100 134 Q92 132 90 118 Z" fill="#0c0814"/>
      <path d="M56 130 Q36 122 30 104 Q44 118 60 116 Z M144 130 Q164 122 170 104 Q156 118 140 116 Z" fill="url(#${g}a)" ${ol(1.8)} opacity=".85"/>`;
  },
  golem(g, P, v = {}) {
    const k = v.tree ? 1 : v.big ? 1.12 : 1, dark = shade(P.a, -0.5);
    const rune = (x, y) => `${glowDot(g, x, y, 5, P.c, 0.7)}<path d="M${x - 3} ${y - 4} L${x} ${y + 4} L${x + 3} ${y - 4}" stroke="${P.c}" stroke-width="1.8" fill="none"/>`;
    return `<g transform="translate(100 190) scale(${k}) translate(-100 -190)">${ground(64)}
      <path d="M70 152 L64 188 L96 188 L96 154 Z M130 152 L136 188 L104 188 L104 154 Z" fill="url(#${g}a)" ${ol()}/>
      <path d="M68 168 L94 166 M132 168 L106 166" stroke="${dark}" stroke-width="2"/>
      <path d="M54 84 Q100 70 146 84 L154 150 Q100 166 46 150 Z" fill="url(#${g}a)" ${ol()}/>
      <path d="M62 92 Q72 84 88 84" stroke="#fff" stroke-width="2.6" fill="none" opacity=".3" stroke-linecap="round"/>
      <path d="M66 100 L82 112 L74 134 L84 146 M134 98 L118 120 L128 140 M98 132 L104 144 L96 152" stroke="${dark}" stroke-width="2.6" fill="none" stroke-linejoin="round"/>
      ${glowDot(g, 100, 112, 16, P.c, 0.7)}<path d="M90 104 L110 104 L106 124 L94 124 Z" fill="${P.c}" ${ol(1.6)}/><path d="M94 107 L104 107 L102 114 L96 114 Z" fill="#fff" opacity=".7"/>
      ${rune(70, 128)}${rune(130, 130)}
      <circle cx="46" cy="98" r="22" fill="url(#${g}a)" ${ol()}/><circle cx="154" cy="98" r="22" fill="url(#${g}a)" ${ol()}/>
      <path d="M34 90 Q40 80 52 80 M142 82 Q150 80 160 86" stroke="#fff" stroke-width="2.4" fill="none" opacity=".3"/>
      <path d="M32 112 L28 152 Q40 164 56 154 L60 116 Z M168 112 L172 152 Q160 164 144 154 L140 116 Z" fill="url(#${g}a)" ${ol()}/>
      <path d="M30 140 L56 142 M170 140 L144 142" stroke="${dark}" stroke-width="2"/>
      <path d="M74 44 Q100 36 126 44 L130 82 Q100 90 70 82 Z" fill="url(#${g}a)" ${ol()}/>
      <path d="M78 58 L122 58 L120 70 L80 70 Z" fill="#0c0814" ${ol(1.2)}/>${eyesGlow(g, [[89, 64], [111, 64]], P.c, 3.4)}
      <path d="M78 50 Q88 44 100 44" stroke="#fff" stroke-width="2" fill="none" opacity=".35"/>
      ${v.tree ? `<path d="M50 96 L24 62 L14 66 M150 96 L178 58 L188 62 M38 80 L30 74" stroke="#120c18" stroke-width="11" stroke-linecap="round" fill="none"/><path d="M50 96 L24 62 L14 66 M150 96 L178 58 L188 62 M38 80 L30 74" stroke="url(#${g}a)" stroke-width="7" stroke-linecap="round" fill="none"/>
        <circle cx="64" cy="40" r="24" fill="${shade(P.b, -0.3)}" ${ol(1.8)}/><circle cx="138" cy="38" r="26" fill="${shade(P.b, -0.25)}" ${ol(1.8)}/><circle cx="100" cy="22" r="28" fill="url(#${g}b)" ${ol(1.8)}/>
        <circle cx="88" cy="12" r="9" fill="${shade(P.b, 0.35)}" opacity=".6"/><circle cx="130" cy="30" r="6" fill="${shade(P.b, 0.3)}" opacity=".5"/><circle cx="56" cy="34" r="6" fill="${shade(P.b, 0.3)}" opacity=".5"/>
        ${[[70, 50], [124, 52], [104, 36]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="3" fill="#ff8ab0" ${ol(1)}/>`).join('')}
        <path d="M62 120 Q58 140 64 150 M140 118 Q146 136 138 150" stroke="${shade(P.b, 0.1)}" stroke-width="4" fill="none" opacity=".8"/>` : ''}
      ${v.crown ? `<path d="M74 46 L78 20 L90 36 L100 14 L110 36 L122 20 L126 46 Z" fill="url(#${g}c)" ${ol(1.8)}/>${glowDot(g, 100, 26, 4, '#ffffff', 0.8)}<circle cx="100" cy="26" r="3" fill="#fff"/>` : ''}</g>`;
  },
  beholder(g, P) {
    const stalks = [[-40, -46], [-20, -60], [0, -66], [20, -60], [40, -46]].map(([dx, dy]) => `<path d="M${100 + dx * 0.4} 90 Q${100 + dx * 0.8} ${80 + dy * 0.5} ${100 + dx} ${96 + dy}" stroke="url(#${g}a)" stroke-width="6" fill="none"/><circle cx="${100 + dx}" cy="${96 + dy}" r="7" fill="#f4eee0" ${ol(1.6)}/><circle cx="${100 + dx}" cy="${96 + dy}" r="3" fill="${P.c}"/>`).join('');
    return `<ellipse cx="100" cy="190" rx="34" ry="6" fill="#000" opacity=".22"/>${stalks}
      <circle cx="100" cy="116" r="48" fill="url(#${g}a)" ${ol()}/><path d="M64 100 Q72 76 96 70" stroke="#fff" stroke-width="5" opacity=".25" fill="none"/>
      <ellipse cx="100" cy="108" rx="22" ry="18" fill="#f4eee0" ${ol(2)}/>${glowDot(g, 100, 108, 12, P.c, 0.6)}<circle cx="100" cy="108" r="9" fill="${P.c}"/><circle cx="100" cy="108" r="4" fill="#000"/>
      <path d="M72 140 Q100 160 128 140 Q100 150 72 140 Z" fill="#2a0a14" ${ol(1.6)}/><path d="M80 142 L84 150 L88 144 L92 152 L96 145 L100 153 L104 145 L108 152 L112 144 L116 150 L120 142" stroke="#f4eee0" stroke-width="2" fill="none"/>`;
  },
  kraken(g, P) {
    const t = (x, c) => `<path d="M${x} 140 Q${x + c * 10} 170 ${x + c * 26} 182 Q${x + c * 36} 188 ${x + c * 30} 174" stroke="#120c18" stroke-width="17" fill="none" stroke-linecap="round"/><path d="M${x} 140 Q${x + c * 10} 170 ${x + c * 26} 182 Q${x + c * 36} 188 ${x + c * 30} 174" stroke="url(#${g}a)" stroke-width="12" fill="none" stroke-linecap="round"/>
      ${[0.3, 0.55, 0.8].map((k) => `<circle cx="${x + c * 26 * k}" cy="${142 + 40 * k}" r="2.2" fill="${P.b}" opacity=".85"/>`).join('')}`;
    return `${ground(70)}${t(64, -1)}${t(80, -1)}${t(120, 1)}${t(136, 1)}${t(96, -0.4)}${t(104, 0.4)}
      <path d="M50 140 Q44 58 100 38 Q156 58 150 140 Q100 158 50 140 Z" fill="url(#${g}a)" ${ol()}/>
      <path d="M64 110 Q66 70 98 52" stroke="#fff" stroke-width="6" opacity=".25" fill="none" stroke-linecap="round"/>
      ${[[70, 70, 6], [130, 74, 5], [118, 52, 4], [84, 56, 3.5]].map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${P.b}" opacity=".55"/>`).join('')}
      ${[[76, 128], [92, 132], [108, 132], [124, 128]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="4.4" fill="${P.b}" ${ol(1)} opacity=".9"/>`).join('')}
      <ellipse cx="82" cy="102" rx="10" ry="9" fill="#fff8e8" ${ol(1.6)}/><ellipse cx="118" cy="102" rx="10" ry="9" fill="#fff8e8" ${ol(1.6)}/>
      ${eyesGlow(g, [[83, 104], [117, 104]], P.c, 5)}<circle cx="83" cy="104" r="2.4" fill="#000"/><circle cx="117" cy="104" r="2.4" fill="#000"/>
      <path d="M68 86 L94 96 M132 86 L106 96" stroke="#0c0814" stroke-width="5" stroke-linecap="round"/>
      <path d="M88 120 Q100 128 112 120" stroke="#0c0814" stroke-width="3" fill="none" stroke-linecap="round"/>
      <path d="M74 48 L80 20 L92 38 L100 14 L108 38 L120 20 L126 48 Z" fill="url(#${g}c)" ${ol(1.8)}/>${[[80, 22], [100, 16], [120, 22]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="3" fill="#5de0ff" ${ol(1)}/>`).join('')}`;
  },
  demon(g, P, v = {}) {
    const wing = (s) => `<path d="M${100 + s * 28} 104 Q${100 + s * 84} 46 ${100 + s * 96} 66 Q${100 + s * 86} 86 ${100 + s * 94} 108 Q${100 + s * 76} 100 ${100 + s * 74} 124 Q${100 + s * 58} 108 ${100 + s * 40} 120 Z" fill="url(#${g}b)" ${ol()}/>
      <path d="M${100 + s * 34} 106 L${100 + s * 92} 68 M${100 + s * 38} 112 L${100 + s * 90} 104 M${100 + s * 40} 118 L${100 + s * 72} 120" stroke="${shade(P.b, -0.5)}" stroke-width="2" fill="none"/>`;
    return `${ground(52)}${wing(-1)}${wing(1)}
      <path d="M82 154 L76 184 L96 184 L97 156 Z M118 154 L124 184 L104 184 L103 156 Z" fill="url(#${g}a)" ${ol()}/>
      <path d="M72 182 L80 176 L84 184 L90 176 L98 184 L72 188 Z M128 182 L120 176 L116 184 L110 176 L102 184 L128 188 Z" fill="${shade(P.a, -0.5)}" ${ol(1.4)}/>
      <path d="M72 112 Q100 102 128 112 L134 160 Q100 170 66 160 Z" fill="url(#${g}a)" ${ol()}/>
      <path d="M84 120 Q100 128 116 120 M86 136 Q100 144 114 136" stroke="${shade(P.a, -0.5)}" stroke-width="2.4" fill="none"/>
      <path d="M74 114 Q58 132 58 152" stroke="#120c18" stroke-width="16" fill="none" stroke-linecap="round"/><path d="M74 114 Q58 132 58 152" stroke="url(#${g}a)" stroke-width="11" fill="none" stroke-linecap="round"/>
      <path d="M126 114 Q142 132 142 152" stroke="#120c18" stroke-width="16" fill="none" stroke-linecap="round"/><path d="M126 114 Q142 132 142 152" stroke="url(#${g}a)" stroke-width="11" fill="none" stroke-linecap="round"/>
      <path d="M52 152 L50 162 M58 156 L58 166 M64 152 L66 162 M136 152 L134 162 M142 156 L142 166 M148 152 L150 162" stroke="#f4eee0" stroke-width="2.4" stroke-linecap="round"/>
      <circle cx="100" cy="82" r="30" fill="url(#${g}a)" ${ol()}/><path d="M78 68 Q84 58 96 54" stroke="#fff" stroke-width="2.4" fill="none" opacity=".25" stroke-linecap="round"/>
      <path d="M78 64 Q60 40 66 18 Q78 40 90 54 Z M122 64 Q140 40 134 18 Q122 40 110 54 Z" fill="url(#${g}h)" ${ol(1.8)}/>
      <path d="M80 76 L94 82 M120 76 L106 82" stroke="#0c0814" stroke-width="3.4" stroke-linecap="round"/>
      ${eyesGlow(g, [[90, 88], [110, 88]], P.c, 4)}
      <path d="M86 100 Q100 94 114 100 Q108 110 100 110 Q92 110 86 100 Z" fill="#1a060c" ${ol(1.4)}/><path d="M90 100 L93 106 L96 101 M104 101 L107 106 L110 100" stroke="#f4eee0" stroke-width="1.6" fill="none"/>
      ${v.crown ? `<path d="M80 58 L84 34 L94 48 L100 28 L106 48 L116 34 L120 58 Z" fill="url(#${g}c)" ${ol(1.6)}/>` : ''}`;
  },
  insect(g, P) {
    const legs = [-1, 1].map((s) => [0, 1, 2].map((i) => `<path d="M${100 + s * 20} ${120 + i * 14} L${100 + s * 54} ${110 + i * 18} L${100 + s * 62} ${150 + i * 14}" stroke="${shade(P.a, -0.5)}" stroke-width="5" fill="none" stroke-linecap="round"/>`).join('')).join('');
    return `${ground(54)}${legs}<ellipse cx="100" cy="146" rx="34" ry="40" fill="url(#${g}a)" ${ol()}/>
      <path d="M100 108 L100 184" stroke="${shade(P.a, -0.6)}" stroke-width="2.5"/><path d="M76 130 Q90 120 98 134" stroke="#fff" stroke-width="3" opacity=".25" fill="none"/>
      <ellipse cx="100" cy="96" rx="24" ry="18" fill="url(#${g}b)" ${ol()}/>${eyesGlow(g, [[88, 94], [112, 94]], P.c, 5)}
      <path d="M90 80 Q76 54 64 50 M110 80 Q124 54 136 50" stroke="${shade(P.a, -0.4)}" stroke-width="3" fill="none"/>
      <path d="M92 110 L86 120 M108 110 L114 120" stroke="${shade(P.b, -0.5)}" stroke-width="4" stroke-linecap="round"/>`;
  },
  lich(g, P) {
    return `<ellipse cx="100" cy="190" rx="44" ry="6" fill="#000" opacity=".25"/>${glowDot(g, 100, 120, 70, P.c, 0.22)}
      <path d="M60 178 Q54 120 72 92 L128 92 Q146 120 140 178 Q132 170 124 184 Q116 172 108 186 Q100 174 92 186 Q84 172 76 184 Q68 170 60 178 Z" fill="url(#${g}a)" ${ol()}/>
      <path d="M86 98 L78 180 M114 98 L122 180 M100 104 L100 184" stroke="${shade(P.a, -0.55)}" stroke-width="2.4" opacity=".75" fill="none"/>
      <path d="M78 104 Q76 140 70 170" stroke="${shade(P.a, 0.35)}" stroke-width="2" opacity=".35" fill="none"/>
      <path d="M58 92 Q100 68 142 92 L136 116 Q100 98 64 116 Z" fill="url(#${g}c)" ${ol(1.8)}/><path d="M66 94 Q100 76 134 94" stroke="#fff" stroke-width="1.6" fill="none" opacity=".4"/>
      ${[76, 100, 124].map((x) => `<circle cx="${x}" cy="${x === 100 ? 84 : 92}" r="3" fill="${P.c}" ${ol(1)}/>`).join('')}
      <path d="M66 100 Q50 128 52 150" stroke="#120c18" stroke-width="16" fill="none" stroke-linecap="round"/><path d="M66 100 Q50 128 52 150" stroke="url(#${g}a)" stroke-width="11" fill="none" stroke-linecap="round"/>
      <path d="M54 162 L50 30" stroke="#120c18" stroke-width="8" stroke-linecap="round"/><path d="M54 162 L50 30" stroke="#4a3a52" stroke-width="5" stroke-linecap="round"/>
      <path d="M40 40 Q50 18 60 40 Q54 34 50 46 Q46 34 40 40 Z" fill="url(#${g}c)" ${ol(1.4)}/>
      ${glowDot(g, 50, 30, 16, P.c)}<circle cx="50" cy="30" r="8" fill="url(#${g}gl)" ${ol(1.2)}/><circle cx="52" cy="152" r="7" fill="${P.b}" ${ol(1.6)}/>
      <path d="M70 76 Q66 30 100 26 Q134 30 130 76 Q122 60 100 58 Q78 60 70 76 Z" fill="url(#${g}a)" ${ol()}/>
      <path d="M80 70 Q80 44 100 42 Q120 44 120 70 Q120 84 112 88 L112 94 L88 94 L88 88 Q80 84 80 70 Z" fill="${P.b}" ${ol()}/>
      <path d="M84 64 Q90 58 97 66 L95 76 Q88 78 84 72 Z M116 64 Q110 58 103 66 L105 76 Q112 78 116 72 Z" fill="#0c0814"/>
      ${glowDot(g, 91, 69, 6, P.c)}${glowDot(g, 109, 69, 6, P.c)}<circle cx="91" cy="69" r="2.6" fill="#fff"/><circle cx="109" cy="69" r="2.6" fill="#fff"/>
      <path d="M90 88 L110 88 M94 84 L94 92 M100 84 L100 93 M106 84 L106 92" stroke="#0c0814" stroke-width="1.6"/>
      <path d="M76 38 L80 14 L90 30 L100 8 L110 30 L120 14 L124 38 Z" fill="url(#${g}c)" ${ol(1.8)}/>${glowDot(g, 100, 22, 5, P.c)}<circle cx="100" cy="22" r="3.4" fill="#fff" ${ol(1)}/>`;
  },
  sphinx(g, P) {
    // a great lion lying on guard, with a pharaoh's face and headdress
    const paw = (x) => `<path d="M${x} 168 Q${x - 4} 186 ${x + 6} 188 L${x + 30} 188 Q${x + 36} 184 ${x + 30} 172 Z" fill="url(#${g}a)" ${ol()}/>
      <path d="M${x + 14} 182 L${x + 14} 188 M${x + 22} 181 L${x + 22} 188" stroke="#3a2a10" stroke-width="1.6"/>`;
    return `${ground(80)}<path d="M156 150 Q190 140 188 110 Q186 98 178 100" stroke="#120c18" stroke-width="11" fill="none" stroke-linecap="round"/><path d="M156 150 Q190 140 188 110 Q186 98 178 100" stroke="url(#${g}a)" stroke-width="7" fill="none" stroke-linecap="round"/>
      <path d="M170 96 Q182 90 184 104 Q176 106 170 96 Z" fill="${shade(P.a, -0.3)}" ${ol(1.4)}/>
      <path d="M58 130 Q66 104 100 102 L150 102 Q178 108 176 150 Q176 182 150 186 L64 186 Q46 180 52 160 Z" fill="url(#${g}a)" ${ol()}/>
      <path d="M100 110 Q140 106 166 122" stroke="#fff" stroke-width="2.6" fill="none" opacity=".3"/>
      <path d="M110 150 Q126 142 140 150 Q130 168 118 168" stroke="${shade(P.a, -0.4)}" stroke-width="2.4" fill="none"/>
      ${paw(30)}${paw(66)}
      <path d="M40 108 Q38 54 76 44 Q114 54 112 108 L100 134 L52 134 Z" fill="url(#${g}c)" ${ol()}/>
      ${[0, 1, 2, 3, 4, 5].map((i) => `<path d="M${46 + i * 2} ${70 + i * 10} L${106 - i * 2} ${70 + i * 10}" stroke="#2a4a8a" stroke-width="4.4" opacity=".9"/>`).join('')}
      <path d="M56 70 Q76 60 96 70 L96 106 Q76 120 56 106 Z" fill="url(#${g}b)" ${ol()}/>
      <path d="M60 78 Q66 72 72 76" stroke="#fff" stroke-width="2" fill="none" opacity=".4"/>
      <path d="M58 72 Q76 62 94 72 L94 76 Q76 68 58 76 Z" fill="url(#${g}c)" ${ol(1.2)}/>
      <path d="M62 84 L72 86 M90 84 L80 86" stroke="#1a1008" stroke-width="2.4" stroke-linecap="round"/>
      ${eyesGlow(g, [[67, 90], [85, 90]], P.c, 3)}<path d="M62 90 L58 92 M90 90 L94 92" stroke="#1a1008" stroke-width="1.6"/>
      <path d="M76 94 L76 100" stroke="${shade(P.b, -0.4)}" stroke-width="1.4"/><path d="M70 104 Q76 107 82 104" stroke="#3a2a1a" stroke-width="2" fill="none" stroke-linecap="round"/>
      <path d="M72 110 L80 110 L79 126 Q76 130 73 126 Z" fill="url(#${g}c)" ${ol(1.2)}/>
      <path d="M64 46 Q76 30 88 46 Q82 40 76 44 Q70 40 64 46 Z" fill="#d8b040" ${ol(1.4)}/>${glowDot(g, 76, 40, 5, '#5de0ff', 0.8)}<circle cx="76" cy="40" r="3" fill="#5de0ff" ${ol(1)}/>`;
  },
  oryx(g, P) {
    // the Usurper: towering black plate, a crown of horns, the burning heart of the realm
    return `${ground(76)}${glowDot(g, 100, 110, 80, '#ff2a5a', 0.18)}
      <path d="M42 96 Q100 66 158 96 L178 188 Q140 182 120 190 Q100 180 80 190 Q60 182 22 188 Z" fill="url(#${g}b)" ${ol()}/>
      <path d="M60 104 L44 184 M140 104 L156 184 M82 112 L74 186 M118 112 L126 186" stroke="${shade(P.b, -0.55)}" stroke-width="2.4" fill="none" opacity=".8"/>
      <path d="M48 120 Q44 150 36 180" stroke="${shade(P.b, 0.35)}" stroke-width="2" fill="none" opacity=".35"/>
      <path d="M78 150 L72 186 L96 186 L97 152 Z M122 150 L128 186 L104 186 L103 152 Z" fill="url(#${g}m)" ${ol()}/>
      <path d="M68 184 Q84 176 98 184 L98 192 L66 192 Z M132 184 Q116 176 102 184 L102 192 L134 192 Z" fill="#1a1420" ${ol(1.8)}/>
      <path d="M64 100 Q100 86 136 100 L140 154 Q100 168 60 154 Z" fill="url(#${g}m)" ${ol()}/>
      <path d="M100 96 L100 160" stroke="#fff" stroke-width="2" opacity=".45"/><path d="M70 120 Q100 130 130 120 M70 140 Q100 150 130 140" stroke="${shade('#8e939e', -0.6)}" stroke-width="2.4" fill="none"/>
      <path d="M72 104 Q80 96 92 96" stroke="#fff" stroke-width="2" fill="none" opacity=".45"/>
      ${glowDot(g, 100, 122, 20, '#ff2a5a', 0.8)}<path d="M92 112 L108 112 L100 132 Z" fill="#ff5a7a" ${ol(1.4)}/><path d="M96 115 L102 115 L99 122 Z" fill="#fff" opacity=".8"/>
      <path d="M100 98 L94 104 L100 110 L106 104 Z" fill="url(#${g}c)" ${ol(1.2)}/>
      <path d="M58 92 Q44 80 30 92 Q26 110 44 116 L70 104 Z M142 92 Q156 80 170 92 Q174 110 156 116 L130 104 Z" fill="url(#${g}m)" ${ol()}/>
      <path d="M36 92 L26 74 L44 86 M164 92 L174 74 L156 86" fill="#1a1420" stroke="#0c0a12" stroke-width="1.8"/>
      <path d="M46 112 L36 156 L52 162 L66 118 Z M154 112 L164 156 L148 162 L134 118 Z" fill="url(#${g}m)" ${ol()}/>
      <circle cx="44" cy="164" r="9" fill="#2a2030" ${ol(1.8)}/><circle cx="156" cy="164" r="9" fill="#2a2030" ${ol(1.8)}/>
      <path d="M156 168 L180 30" stroke="#0c0a12" stroke-width="10" stroke-linecap="round"/><path d="M156 168 L180 30" stroke="#3a2a4a" stroke-width="6" stroke-linecap="round"/>
      <path d="M172 48 Q198 36 192 10 Q182 28 174 28 Q178 14 168 2 Q164 24 176 38 Z" fill="url(#${g}c)" ${ol(1.6)}/>${glowDot(g, 180, 36, 10, '#ff2a5a', 0.7)}
      <circle cx="100" cy="66" r="28" fill="#1a1020" ${ol()}/><path d="M80 52 Q86 44 98 42" stroke="#fff" stroke-width="2" fill="none" opacity=".2"/>
      <path d="M78 52 Q52 36 48 4 Q66 26 86 38 Z M122 52 Q148 36 152 4 Q134 26 114 38 Z" fill="#2a1a2a" ${ol(1.8)}/><path d="M56 16 Q66 32 80 42 M144 16 Q134 32 120 42" stroke="#5a4a5a" stroke-width="1.6" fill="none"/>
      <path d="M80 60 L94 66 M120 60 L106 66" stroke="#ff2a5a" stroke-width="2" stroke-linecap="round" opacity=".6"/>
      ${eyesGlow(g, [[90, 70], [110, 70]], '#ff3a6a', 4.4)}
      <path d="M88 84 Q100 80 112 84 L108 90 L104 86 L100 92 L96 86 L92 90 Z" fill="#0c0814" stroke="#ff2a5a" stroke-width="1" opacity=".9"/>
      <path d="M76 44 L80 14 L92 32 L100 6 L108 32 L120 14 L124 44 Z" fill="url(#${g}c)" ${ol(1.8)}/>${glowDot(g, 100, 26, 6, '#ff3a6a', 0.9)}<circle cx="100" cy="26" r="4" fill="#ff3a6a" ${ol(1)}/>`;
  },
};

/** The enemy art spec: [archetype, variant]. Zones list these per enemy. */
export function monsterMarkup(spec, pal, g) {
  const [kind, v] = spec;
  const defs = `<defs>${lit(`${g}a`, pal.a)}${lit(`${g}b`, pal.b)}${lit(`${g}c`, pal.c, 0.4, 0.35)}${lit(`${g}s`, v?.skin || '#b08a70', 0.25, 0.35)}${lit(`${g}h`, '#e8dcc0', 0.3, 0.4)}${metal(`${g}m`, v?.metal || '#8e939e')}${rad(`${g}gl`, [[0, '#fff'], [0.4, pal.c], [1, pal.c, 0]])}${blur(`${g}bl`, 4)}</defs>`;
  return defs + (ARCH[kind] || ARCH.humanoid)(g, pal, v || {});
}
let n = 0;
export function monsterImage(spec, pal) {
  const key = `mon2|${JSON.stringify(spec)}|${JSON.stringify(pal)}`;
  return svgImage(key, 200, 200, () => monsterMarkup(spec, pal, `m${++n}`), 1.6, { inset: 0.014 });
}
export const ARCHETYPES = Object.keys(ARCH);
