// Dungeon runs: 3–4 rooms of enemy groups, then the boss and its guards. Rewards are only granted on a clear.
import { CONFIG } from '../config.js';
import { DUNGEON, DUNGEON_MOBS, BOSS_ADDS } from '../data/world.js';
import { makeRng } from './rng.js';
import { newCombat, step } from './combat.js';
import { dungeonEnemy, dungeonBoss, rollPotion } from './loot.js';

export function createRun(dungeonId, F, seed) {
  const d = DUNGEON[dungeonId];
  const rng = makeRng(seed);
  const rooms = Array.from({ length: d.rooms }, () => rng.int(...CONFIG.dungeonEnemiesPerRoom));
  return { dungeonId, seed, rngState: rng.s, cs: newCombat(F), rooms, room: 0, killed: 0, spawned: 0, phase: 'room', ticks: 0 };
}

/** Engine source for a run. Mutates run as rooms are cleared. */
export function runSource(run) {
  const d = DUNGEON[run.dungeonId];
  return {
    castDelay: 0,
    walkHealPct: CONFIG.dungeonWalkHealPct,
    wave(rng) {
      if (run.phase === 'room') {
        if (run.killed >= run.rooms[run.room]) {
          run.room++; run.killed = 0; run.spawned = 0;
          if (run.room >= run.rooms.length) run.phase = 'boss';
          run.cs.travel = CONFIG.roomTransitionSeconds; // walking to the next room heals faster
          return null;
        }
        const n = Math.min(CONFIG.dungeonGroupSize, run.rooms[run.room] - run.killed);
        run.spawned = run.killed + n;
        return Array.from({ length: n }, () => dungeonEnemy(d, rng.pick(DUNGEON_MOBS[run.dungeonId]), rng));
      }
      if (run.phase === 'boss' && !run.bossSpawned) {
        run.bossSpawned = true;
        return [dungeonBoss(d), ...Array.from({ length: BOSS_ADDS }, () => ({ ...dungeonEnemy(d, rng.pick(DUNGEON_MOBS[run.dungeonId]), rng), add: true }))];
      }
      return null;
    },
    // the rest of a room's enemies step into empty slots as others fall
    reinforce(rng) {
      if (run.phase !== 'room' || (run.spawned || 0) >= run.rooms[run.room]) return null;
      if (run.cs.enemies.filter((e) => e.hp > 0).length >= CONFIG.dungeonGroupSize) return null;
      run.spawned++;
      return dungeonEnemy(d, rng.pick(DUNGEON_MOBS[run.dungeonId]), rng);
    },
    onKill(e) {
      if (e.boss) run.phase = 'won';
      else if (!e.add) run.killed++;
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

/** Rewards for a clear. Uses its own seeded roll so it can't be re-rolled by reloading.
 *  canUpgrade: some slot is below the dungeon's tier. have(id): that UT is already unlocked. */
export function rollRewards(run, canUpgrade, have) {
  const d = DUNGEON[run.dungeonId];
  const rng = makeRng(run.seed ^ 0x9e3779b9);
  const upgrade = rng.next() < CONFIG.upgradeChance && canUpgrade ? d.tier : null;
  const items = [];
  const missing = d.uts.filter((id) => !have(id));
  if (rng.next() < CONFIG.dungeonUtChance && missing.length) items.push(rng.pick(missing));
  const potions = [];
  const pc = rng.int(...d.potions);
  for (let i = 0; i < pc; i++) potions.push(rollPotion(rng, d.sig));
  return { xp: d.xp, items, potions, upgrade };
}
