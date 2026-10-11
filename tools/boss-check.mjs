// Boss report: `node tools/boss-check.mjs [class]`. Skips to each boss with built-for gear; the bot weaves
// (no aimed dodging) and can't die, so this shows incoming damage per second (as % of max HP) and fight length.
import { DUNGEONS } from '../js/data/world.js';
import { createRun, step, arenaFighter } from '../js/core/arena.js';
import { referenceCharacter, fighterOf } from '../js/core/character.js';
import { recM } from './balance.mjs';

const RANGE = { staff: 340, wand: 380, bow: 320, sword: 145, dagger: 200 };
const cls = process.argv[2] || 'wizard';
console.log(`== ${cls} · boss fights at built-for gear: incoming %HP/s by phase, fight seconds ==`);
for (const d of DUNGEONS) {
  const rows = [];
  for (let s = 0; s < 4; s++) {
    const F = arenaFighter(fighterOf(referenceCharacter(cls, d.rec, recM(d.rec)), { exalt: {} }), cls);
    const R = createRun(d, F, cls, 7 + s * 31), input = { target: null };
    let t = 0, bt = 0; const taken = [0, 0, 0], time = [0, 0, 0];
    while (t < 900 && R.phase !== 'won') {
      const boss = R.enemies.find((e) => e.boss);
      if (!boss) for (const e of R.enemies) e.hp = 0;
      const e = R.enemies.reduce((a, b) => (!a || b.y > a.y ? b : a), null);
      input.target = { x: 180 + Math.sin(t * 0.9 + s) * 130, y: e ? Math.min(600, e.y + RANGE[F.weaponType] * 0.75) : 560 };
      const hp0 = R.hero.hp;
      step(R, F, input, 1 / 60); t += 1 / 60;
      if (boss) { const p = (boss.p || 1) - 1; time[p] += 1 / 60; taken[p] += Math.max(0, hp0 - R.hero.hp); bt += 1 / 60; }
      if (R.phase === 'dead') R.phase = 'fight';
      R.hero.hp = F.maxHp;
    }
    rows.push({ ph: taken.map((x, i) => (time[i] ? (x / F.maxHp / time[i]) * 100 : 0)), bt });
  }
  const avg = (f) => rows.reduce((a, r) => a + f(r), 0) / rows.length;
  console.log(`${d.name.padEnd(24)} ${[0, 1, 2].map((i) => avg((r) => r.ph[i]).toFixed(1).padStart(5)).join(' ')}   ${avg((r) => r.bt).toFixed(0).padStart(4)}s`);
}
