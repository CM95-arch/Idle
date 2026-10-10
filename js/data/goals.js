// First Steps: early milestones with guaranteed rewards. Gear rewards are made for the class of the
// character you're viewing when you claim. Checks look at the whole account.
import { levelOf } from '../core/character.js';

const lvl = (s, n) => s.chars.some((c) => c && levelOf(c.xp) >= n) || Object.values(s.classBest).some((l) => l >= n);
const visited = (s, b) => !!s.visited?.[b];

export const GOALS = [
  { id: 'kills', text: 'Defeat 25 enemies', check: (s) => s.stats.kills >= 25, reward: { gear: 'weapon', tier: 2 } },
  { id: 'equip', text: 'Equip an item from the Vault', check: (s) => (s.stats.equips || 0) >= 1, reward: { gear: 'armor', tier: 2 } },
  { id: 'lv3', text: 'Reach level 3', check: (s) => lvl(s, 3), reward: { gear: 'ability', tier: 2 } },
  { id: 'plains', text: 'Farm in the Plains', check: (s) => visited(s, 'plains'), reward: { gear: 'weapon', tier: 3 } },
  { id: 'lv5', text: 'Reach level 5', check: (s) => lvl(s, 5), reward: { gear: 'ring', tier: 3, ring: 'def' } },
  { id: 'snake', text: 'Clear the Snake Pit', check: (s) => (s.clears.snake_pit || 0) >= 1, reward: { gear: 'armor', tier: 4 } },
  { id: 'fuse', text: 'Fuse 3 copies of an item', check: (s) => (s.stats.fused || 0) >= 1, reward: { gear: 'ability', tier: 4 } },
  { id: 'desert', text: 'Farm in the Desert', check: (s) => visited(s, 'desert'), reward: { gear: 'weapon', tier: 5 } },
  { id: 'lv10', text: 'Reach level 10', check: (s) => lvl(s, 10), reward: { gear: 'ring', tier: 5, ring: 'att' } },
  { id: 'clears', text: 'Clear 3 dungeons', check: (s) => s.stats.clears >= 3, reward: { potions: 5 } },
  { id: 'sprite', text: 'Farm in the Sprite Forest', check: (s) => visited(s, 'sprite'), reward: { gear: 'armor', tier: 6 } },
  { id: 'drink', text: 'Drink a potion', check: (s) => s.stats.potionsDrunk >= 1, reward: { potions: 5 } },
  { id: 'city', text: 'Farm in the Abandoned City', check: (s) => visited(s, 'city'), reward: { gear: 'weapon', tier: 7 } },
  { id: 'class', text: 'Unlock a new class', check: (s) => lvl(s, 20), reward: { gear: 'ability', tier: 7 } },
];
