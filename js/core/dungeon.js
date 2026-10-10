// Dungeon runs: 3–4 rooms of enemies, then the boss. Rewards are only granted on a clear.
import { CONFIG } from '../config.js';
import { DUNGEON, DUNGEON_MOBS } from '../data/world.js';
import { makeRng } from './rng.js';
import { newCombat, step } from './combat.js';
import { dungeonEnemy, dungeonBoss, rollItem, rollPotion } from './loot.js';

export function createRun(dungeonId, F, seed) {
  const d = DUNGEON[dungeonId];
  const rng = makeRng(seed);
  const rooms = Array.from({ length: d.rooms }, () => rng.int(...CONFIG.dungeonEnemiesPerRoom));
  return { dungeonId, seed, rngState: rng.s, cs: newCombat(F), rooms, room: 0, killed: 0, phase: 'room', ticks: 0 };
}

/** Engine source for a run. Mutates run as rooms are cleared. */
export function runSource(run) {
  const d = DUNGEON[run.dungeonId];
  return {
    restBelow: CONFIG.dungeonRestBelow,
    castDelay: 0,
    next(rng) {
      if (run.phase === 'room') {
        if (run.killed >= run.rooms[run.room]) {
          run.room++; run.killed = 0;
          if (run.room >= run.rooms.length) run.phase = 'boss';
          run.cs.resting = true; // catch your breath between rooms
          run.cs.travel = 1.5;
          return null;
        }
        return dungeonEnemy(d, rng.pick(DUNGEON_MOBS[run.dungeonId]), rng);
      }
      if (run.phase === 'boss' && !run.bossSpawned) { run.bossSpawned = true; return dungeonBoss(d); }
      return null;
    },
    onKill(e) {
      if (e.boss) run.phase = 'won';
      else run.killed++;
    },
  };
}

/** Advance a run by n ticks. mode 'live' while the player watches the run screen. */
export function advanceRun(run, F, n, emit, mode) {
  const rng = makeRng(0); rng.s = run.rngState;
  const src = runSource(run);
  if (mode !== 'live') src.castDelay = CONFIG.closedAppAbilityDelay;
  for (let i = 0; i < n && run.phase !== 'won' && run.phase !== 'lost'; i++) {
    step(run.cs, F, src, rng, emit, mode);
    run.ticks++;
    if (run.cs.dead) run.phase = 'lost';
  }
  run.rngState = rng.s;
}

export function runProgress(run) {
  const total = run.rooms.reduce((a, b) => a + b, 0);
  const done = run.rooms.slice(0, run.room).reduce((a, b) => a + b, 0) + (run.phase === 'room' ? run.killed : 0);
  return { total, done };
}

/** Rewards for a clear. Uses its own seeded roll so it can't be re-rolled by reloading. */
export function rollRewards(run, cls) {
  const d = DUNGEON[run.dungeonId];
  const rng = makeRng(run.seed ^ 0x9e3779b9);
  const items = [];
  const n = rng.int(...CONFIG.dungeonLootRolls);
  for (let i = 0; i < n; i++) items.push(rollItem(d.tiers, cls, rng));
  for (const ut of d.uts) if (rng.next() < CONFIG.dungeonUtChance) items.push(ut);
  const potions = [];
  const pc = rng.int(...d.potions);
  for (let i = 0; i < pc; i++) potions.push(rollPotion(rng, d.sig));
  if (d.rune) items.push(d.rune);
  return { xp: d.xp, items, potions };
}
