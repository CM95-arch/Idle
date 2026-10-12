// Enemies and bosses as vector figures in a 200×200 box (ground at y≈190), facing the party (down the screen).
// Each archetype is a function of a palette { a: main, b: light/secondary, c: accent/eyes }.
import { svgImage, shade, lit, metal, rad, blur, glowDot, ol } from './core.js';

const eyesGlow = (g, pts, c, r = 3.2) => pts.map(([x, y]) => `${glowDot(g, x, y, r * 1.9, c, 0.7)}<circle cx="${x}" cy="${y}" r="${r}" fill="${c}"/><circle cx="${x - r * 0.3}" cy="${y - r * 0.3}" r="${r * 0.35}" fill="#fff"/>`).join('');
const ground = (rx = 52) => `<ellipse cx="100" cy="190" rx="${rx}" ry="8" fill="#000" opacity=".3"/>`;

const ARCH = {
  // armed humanoid: pirates, orcs, elves, guards, henchmen (variant picks headgear and weapon)
  humanoid(g, P, v = {}) {
    const hat = {
      bandana: `<path d="M78 58 Q100 40 122 58 L122 66 Q100 58 78 66 Z" fill="url(#${g}b)" ${ol()}/><path d="M120 60 L134 70 L124 74 Z" fill="url(#${g}b)" ${ol(1.6)}/>`,
      hood: `<path d="M74 84 Q70 40 100 34 Q130 40 126 84 Q120 62 100 58 Q80 62 74 84 Z" fill="url(#${g}a)" ${ol()}/>`,
      helm: `<path d="M76 70 Q76 38 100 36 Q124 38 124 70 L114 72 L114 60 L86 60 L86 72 Z" fill="url(#${g}m)" ${ol()}/><path d="M100 36 L100 60" stroke="${shade(P.b, 0.4)}" stroke-width="2"/>`,
      horns: `<path d="M80 56 Q66 40 68 22 Q78 40 88 48 Z M120 56 Q134 40 132 22 Q122 40 112 48 Z" fill="#d8ccb0" ${ol(1.8)}/>`,
      crown: `<path d="M78 52 L82 30 L92 44 L100 26 L108 44 L118 30 L122 52 Z" fill="url(#${g}c)" ${ol(1.8)}/>`,
    }[v.hat || 'hood'] || '';
    const wpn = {
      blade: `<path d="M150 150 L176 70 L182 74 L158 152 Z" fill="url(#${g}m)" ${ol(1.8)}/><rect x="146" y="146" width="16" height="6" rx="2" transform="rotate(-18 154 149)" fill="url(#${g}c)" ${ol(1.4)}/>`,
      axe: `<path d="M152 160 L170 60" stroke="#4a3020" stroke-width="6"/><path d="M166 64 Q190 70 184 96 Q172 86 162 88 Z" fill="url(#${g}m)" ${ol(1.8)}/>`,
      staff: `<path d="M154 168 L164 40" stroke="#4a3020" stroke-width="6"/>${glowDot(g, 165, 36, 12, P.c)}<circle cx="165" cy="36" r="7" fill="${P.c}" ${ol(1.2)}/>`,
      spear: `<path d="M150 172 L176 34" stroke="#5a4028" stroke-width="5"/><path d="M176 34 L170 20 L182 26 Z" fill="url(#${g}m)" ${ol(1.6)}/>`,
    }[v.weapon || 'blade'] || '';
    const big = v.big ? 1.12 : 1;
    return `<g transform="translate(100 190) scale(${big}) translate(-100 -190)">${ground(46)}
      <path d="M82 140 L78 186 L96 186 L98 142 Z M118 140 L122 186 L104 186 L102 142 Z" fill="${shade(P.a, -0.45)}" ${ol()}/>
      <path d="M68 82 Q100 70 132 82 L138 150 Q100 162 62 150 Z" fill="url(#${g}a)" ${ol()}/>
      <path d="M86 86 L100 132 L114 86" stroke="url(#${g}b)" stroke-width="5" fill="none"/>
      <rect x="66" y="128" width="68" height="9" rx="2" fill="${shade(P.a, -0.5)}" ${ol(1.6)}/>
      <path d="M66 86 Q52 110 50 140 L62 144 Q66 116 78 100 Z M134 86 Q148 110 152 140 L140 144 Q136 116 122 100 Z" fill="url(#${g}a)" ${ol()}/>
      <circle cx="56" cy="146" r="7" fill="${v.skin || '#b08a70'}" ${ol(1.8)}/><circle cx="146" cy="146" r="7" fill="${v.skin || '#b08a70'}" ${ol(1.8)}/>
      <ellipse cx="100" cy="66" rx="17" ry="20" fill="${v.skin || '#b08a70'}" ${ol()}/>
      <path d="M84 60 Q100 52 116 60 L116 66 Q100 60 84 66 Z" fill="#000" opacity=".4"/>
      ${eyesGlow(g, [[93, 66], [107, 66]], P.c, 2.4)}
      <path d="M92 78 Q100 82 108 78" stroke="#2a1a14" stroke-width="2" fill="none"/>
      ${hat}${wpn}</g>`;
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
    return `${ground(54)}<path d="M50 186 Q44 120 80 92 Q100 70 122 90 Q160 116 152 186 Z" fill="url(#${g}a)" ${ol()} opacity=".95"/>
      <path d="M62 150 Q60 118 82 102" stroke="#fff" stroke-width="6" opacity=".35" fill="none" stroke-linecap="round"/>
      <circle cx="118" cy="160" r="9" fill="${shade(P.a, -0.35)}" opacity=".6"/><circle cx="80" cy="170" r="5" fill="${shade(P.a, -0.35)}" opacity=".6"/>
      ${eyesGlow(g, [[88, 132], [116, 132]], P.c, 4.5)}<path d="M90 152 Q102 160 114 152" stroke="#000" stroke-width="3" fill="none" opacity=".6"/>`;
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
    const bone = 'url(#' + g + 'a)';
    return `${ground(40)}<path d="M88 142 L84 186 M112 142 L116 186" stroke="${shade(P.a, -0.3)}" stroke-width="8" stroke-linecap="round"/>
      <path d="M100 86 L100 142" stroke="${shade(P.a, -0.3)}" stroke-width="7"/>
      ${[0, 1, 2, 3].map((i) => `<path d="M80 ${96 + i * 10} Q100 ${88 + i * 10} 120 ${96 + i * 10}" stroke="${bone}" stroke-width="5" fill="none"/>`).join('')}
      <path d="M78 92 L60 140 M122 92 L140 140" stroke="${bone}" stroke-width="6" stroke-linecap="round"/>
      <path d="M140 140 L156 70" stroke="#8a8a90" stroke-width="5"/><path d="M152 72 L158 50 L162 74 Z" fill="#c0c0c8"/>
      <path d="M80 60 Q80 32 100 30 Q120 32 120 60 Q120 76 108 80 L92 80 Q80 76 80 60 Z" fill="${bone}" ${ol()}/>
      <path d="M86 52 L96 54 L95 64 L86 62 Z M114 52 L104 54 L105 64 L114 62 Z" fill="#000"/>${glowDot(g, 91, 58, 4, P.c, 0.9)}${glowDot(g, 109, 58, 4, P.c, 0.9)}
      <path d="M92 74 L108 74" stroke="#000" stroke-width="2"/>`;
  },
  ghost(g, P) {
    return `<ellipse cx="100" cy="190" rx="30" ry="5" fill="#000" opacity=".2"/>
      <path d="M58 170 Q52 90 100 48 Q148 90 142 170 Q132 160 124 176 Q114 162 104 178 Q94 162 84 176 Q74 160 58 170 Z" fill="url(#${g}a)" ${ol()} opacity=".88"/>
      <path d="M70 140 Q70 96 98 66" stroke="#fff" stroke-width="5" opacity=".25" fill="none"/>
      <path d="M80 90 Q100 80 120 90 L118 112 Q100 120 82 112 Z" fill="#000" opacity=".8"/>${eyesGlow(g, [[91, 100], [109, 100]], P.c, 3.6)}`;
  },
  golem(g, P, v = {}) {
    const k = v.tree ? 1 : v.big ? 1.12 : 1;
    return `<g transform="translate(100 190) scale(${k}) translate(-100 -190)">${ground(60)}
      <path d="M74 150 L70 188 L94 188 L94 152 Z M126 150 L130 188 L106 188 L106 152 Z" fill="url(#${g}a)" ${ol()}/>
      <path d="M58 80 L142 80 L150 152 L50 152 Z" fill="url(#${g}a)" ${ol()}/>
      <path d="M70 96 L86 110 L78 132 M130 96 L116 118 L126 140" stroke="${shade(P.a, -0.5)}" stroke-width="2.5" fill="none"/>
      ${glowDot(g, 100, 116, 10, P.c, 0.6)}<path d="M94 110 L106 110 L104 124 L96 124 Z" fill="${P.c}" opacity=".9"/>
      <path d="M58 82 L34 104 L36 150 L56 150 L56 112 L64 100 Z M142 82 L166 104 L164 150 L144 150 L144 112 L136 100 Z" fill="url(#${g}a)" ${ol()}/>
      <path d="M78 46 L122 46 L126 80 L74 80 Z" fill="url(#${g}a)" ${ol()}/><path d="M80 58 L120 58 L118 66 L82 66 Z" fill="#000" opacity=".7"/>
      ${eyesGlow(g, [[90, 62], [110, 62]], P.c, 3)}${v.tree ? `<circle cx="70" cy="40" r="22" fill="${shade(P.b, -0.25)}" ${ol(1.8)}/><circle cx="130" cy="38" r="24" fill="${shade(P.b, -0.2)}" ${ol(1.8)}/><circle cx="100" cy="26" r="24" fill="${P.b}" ${ol(1.8)}/><circle cx="92" cy="18" r="8" fill="${shade(P.b, 0.3)}" opacity=".6"/><path d="M52 100 L30 70 M148 100 L172 66" stroke="${P.a}" stroke-width="7" stroke-linecap="round"/>` : ''}
      ${v.crown ? `<path d="M80 46 L84 26 L94 38 L100 22 L106 38 L116 26 L120 46 Z" fill="url(#${g}c)" ${ol(1.8)}/>` : ''}</g>`;
  },
  beholder(g, P) {
    const stalks = [[-40, -46], [-20, -60], [0, -66], [20, -60], [40, -46]].map(([dx, dy]) => `<path d="M${100 + dx * 0.4} 90 Q${100 + dx * 0.8} ${80 + dy * 0.5} ${100 + dx} ${96 + dy}" stroke="url(#${g}a)" stroke-width="6" fill="none"/><circle cx="${100 + dx}" cy="${96 + dy}" r="7" fill="#f4eee0" ${ol(1.6)}/><circle cx="${100 + dx}" cy="${96 + dy}" r="3" fill="${P.c}"/>`).join('');
    return `<ellipse cx="100" cy="190" rx="34" ry="6" fill="#000" opacity=".22"/>${stalks}
      <circle cx="100" cy="116" r="48" fill="url(#${g}a)" ${ol()}/><path d="M64 100 Q72 76 96 70" stroke="#fff" stroke-width="5" opacity=".25" fill="none"/>
      <ellipse cx="100" cy="108" rx="22" ry="18" fill="#f4eee0" ${ol(2)}/>${glowDot(g, 100, 108, 12, P.c, 0.6)}<circle cx="100" cy="108" r="9" fill="${P.c}"/><circle cx="100" cy="108" r="4" fill="#000"/>
      <path d="M72 140 Q100 160 128 140 Q100 150 72 140 Z" fill="#2a0a14" ${ol(1.6)}/><path d="M80 142 L84 150 L88 144 L92 152 L96 145 L100 153 L104 145 L108 152 L112 144 L116 150 L120 142" stroke="#f4eee0" stroke-width="2" fill="none"/>`;
  },
  kraken(g, P) {
    const t = (x, c) => `<path d="M${x} 140 Q${x + c * 10} 170 ${x + c * 26} 182 Q${x + c * 34} 188 ${x + c * 30} 176" stroke="url(#${g}a)" stroke-width="12" fill="none" stroke-linecap="round"/>`;
    return `${ground(66)}${t(64, -1)}${t(80, -1)}${t(120, 1)}${t(136, 1)}${t(96, -0.4)}${t(104, 0.4)}
      <path d="M52 140 Q46 60 100 40 Q154 60 148 140 Q100 156 52 140 Z" fill="url(#${g}a)" ${ol()}/>
      <path d="M64 110 Q66 70 98 54" stroke="#fff" stroke-width="5" opacity=".2" fill="none"/>
      ${[[76, 128], [92, 132], [108, 132], [124, 128]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="4" fill="${P.b}" opacity=".8"/>`).join('')}
      ${eyesGlow(g, [[82, 100], [118, 100]], P.c, 6)}<path d="M74 88 L92 94 M126 88 L108 94" stroke="#000" stroke-width="4"/>
      <path d="M78 46 L84 24 L94 40 L100 20 L106 40 L116 24 L122 46 Z" fill="#d8b040" ${ol(1.8)}/>`;
  },
  demon(g, P, v = {}) {
    const wing = (s) => `<path d="M${100 + s * 30} 84 Q${100 + s * 80} 40 ${100 + s * 92} 60 Q${100 + s * 84} 80 ${100 + s * 90} 104 Q${100 + s * 74} 96 ${100 + s * 72} 118 Q${100 + s * 58} 104 ${100 + s * 40} 112 Z" fill="url(#${g}b)" ${ol()}/>`;
    return `${ground(52)}${wing(-1)}${wing(1)}
      <path d="M80 138 L72 186 L92 186 L96 144 Z M120 138 L128 186 L108 186 L104 144 Z" fill="url(#${g}a)" ${ol()}/>
      <path d="M70 84 Q100 72 130 84 L136 144 Q100 156 64 144 Z" fill="url(#${g}a)" ${ol()}/>
      <path d="M82 96 Q100 104 118 96 M84 112 Q100 120 116 112" stroke="${shade(P.a, -0.5)}" stroke-width="2.5" fill="none"/>
      <path d="M70 86 L52 132 L62 138 L78 104 Z M130 86 L148 132 L138 138 L122 104 Z" fill="url(#${g}a)" ${ol()}/>
      <path d="M82 66 Q82 40 100 38 Q118 40 118 66 Q114 80 100 82 Q86 80 82 66 Z" fill="url(#${g}a)" ${ol()}/>
      <path d="M84 48 Q72 30 76 14 Q86 30 92 40 Z M116 48 Q128 30 124 14 Q114 30 108 40 Z" fill="#d8ccb0" ${ol(1.6)}/>
      ${eyesGlow(g, [[93, 60], [107, 60]], P.c, 3)}<path d="M92 72 L96 76 L100 72 L104 76 L108 72" stroke="#f4eee0" stroke-width="1.6" fill="none"/>
      ${v.crown ? `<path d="M84 42 L88 24 L96 36 L100 20 L104 36 L112 24 L116 42 Z" fill="url(#${g}c)" ${ol(1.6)}/>` : ''}`;
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
    return `${ground(50)}<path d="M64 186 Q60 120 72 90 L128 90 Q140 120 136 186 Q100 194 64 186 Z" fill="url(#${g}a)" ${ol()}/>
      <path d="M86 96 L80 186 M114 96 L120 186" stroke="${shade(P.a, -0.5)}" stroke-width="2.5" opacity=".7"/>
      <path d="M60 92 Q100 70 140 92 L134 112 Q100 96 66 112 Z" fill="url(#${g}c)" ${ol(1.8)}/>
      <path d="M70 96 Q54 130 56 150 L66 152 Q70 126 82 108 Z" fill="url(#${g}a)" ${ol()}/><path d="M60 152 L56 40" stroke="#3a3040" stroke-width="6"/>
      ${glowDot(g, 56, 36, 14, P.c)}<circle cx="56" cy="36" r="8" fill="${P.c}" ${ol(1.2)}/>
      <path d="M82 70 Q82 42 100 40 Q118 42 118 70 Q116 84 100 86 Q84 84 82 70 Z" fill="${P.b}" ${ol()}/>
      <path d="M88 60 L97 62 L96 70 L88 68 Z M112 60 L103 62 L104 70 L112 68 Z" fill="#000"/>${glowDot(g, 92, 65, 4, P.c)}${glowDot(g, 108, 65, 4, P.c)}
      <path d="M80 44 L84 24 L92 36 L100 18 L108 36 L116 24 L120 44 Z" fill="url(#${g}c)" ${ol(1.8)}/>`;
  },
  sphinx(g, P) {
    return `${ground(70)}<path d="M40 186 L44 150 Q50 120 90 116 L150 116 Q172 120 172 150 L168 186 L150 186 L148 158 L66 160 L62 186 Z" fill="url(#${g}a)" ${ol()}/>
      <path d="M162 130 Q190 120 186 96" stroke="url(#${g}a)" stroke-width="8" fill="none" stroke-linecap="round"/>
      <path d="M56 120 Q48 70 80 52 Q112 70 104 120 Z" fill="url(#${g}c)" ${ol()}/>
      <path d="M64 70 Q80 58 96 70 L96 104 Q80 114 64 104 Z" fill="${P.b}" ${ol()}/>
      <path d="M58 62 L102 62" stroke="#2a4a8a" stroke-width="6"/><path d="M58 76 L64 76 M96 76 L102 76" stroke="#2a4a8a" stroke-width="5"/>
      ${eyesGlow(g, [[73, 84], [87, 84]], P.c, 3)}<path d="M74 98 Q80 102 86 98" stroke="#3a2a1a" stroke-width="2" fill="none"/>`;
  },
  oryx(g, P) {
    return `${ground(70)}<g transform="translate(100 190) scale(0.9) translate(-100 -190)"><path d="M50 96 Q100 70 150 96 L170 186 Q100 196 30 186 Z" fill="url(#${g}b)" ${ol()}/>
      <path d="M78 142 L72 186 L94 186 L96 146 Z M122 142 L128 186 L106 186 L104 146 Z" fill="url(#${g}m)" ${ol()}/>
      <path d="M66 86 Q100 74 134 86 L138 146 Q100 158 62 146 Z" fill="url(#${g}m)" ${ol()}/>
      <path d="M100 84 L100 152" stroke="${shade(P.c, 0.3)}" stroke-width="3"/><path d="M80 104 Q100 112 120 104 M80 124 Q100 132 120 124" stroke="${shade(P.a, -0.5)}" stroke-width="3" fill="none"/>
      ${glowDot(g, 100, 112, 12, '#ff3a6a', 0.7)}<path d="M94 106 L106 106 L100 120 Z" fill="#ff5a7a"/>
      <path d="M60 80 Q50 74 40 84 Q36 100 52 104 L70 96 Z M140 80 Q150 74 160 84 Q164 100 148 104 L130 96 Z" fill="url(#${g}m)" ${ol()}/>
      <path d="M58 98 L44 148 L58 152 L72 112 Z M142 98 L156 148 L142 152 L128 112 Z" fill="url(#${g}m)" ${ol()}/>
      <path d="M150 150 L176 36" stroke="#2a1a3a" stroke-width="7"/><path d="M168 52 Q192 40 186 20 Q178 34 170 34 Q174 22 166 12 Q164 30 172 40 Z" fill="url(#${g}c)" ${ol(1.6)}/>
      <path d="M80 66 Q80 36 100 34 Q120 36 120 66 Q116 82 100 84 Q84 82 80 66 Z" fill="${shade(P.a, -0.3)}" ${ol()}/>
      <path d="M82 46 Q62 30 58 6 Q74 24 88 36 Z M118 46 Q138 30 142 6 Q126 24 112 36 Z" fill="#1a1020" ${ol(1.6)}/>
      ${eyesGlow(g, [[92, 60], [108, 60]], '#ff3a6a', 3.6)}
      <path d="M80 40 L84 18 L92 32 L100 12 L108 32 L116 18 L120 40 Z" fill="url(#${g}c)" ${ol(1.8)}/>${glowDot(g, 100, 28, 4, '#ff3a6a', 0.9)}</g>`;
  },
};

/** The enemy art spec: [archetype, variant]. Zones list these per enemy. */
export function monsterMarkup(spec, pal, g) {
  const [kind, v] = spec;
  const defs = `<defs>${lit(`${g}a`, pal.a)}${lit(`${g}b`, pal.b)}${lit(`${g}c`, pal.c, 0.4, 0.35)}${metal(`${g}m`, v?.metal || '#8e939e')}${rad(`${g}gl`, [[0, '#fff'], [0.4, pal.c], [1, pal.c, 0]])}${blur(`${g}bl`, 4)}</defs>`;
  return defs + (ARCH[kind] || ARCH.humanoid)(g, pal, v || {});
}
let n = 0;
export function monsterImage(spec, pal) {
  const key = `mon|${JSON.stringify(spec)}|${JSON.stringify(pal)}`;
  return svgImage(key, 200, 200, () => monsterMarkup(spec, pal, `m${++n}`), 1.6);
}
export const ARCHETYPES = Object.keys(ARCH);
