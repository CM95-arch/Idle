// First Steps: early milestones with guaranteed rewards (potions and essence). Checks look at the whole account.
import { levelOf } from '../core/character.js';

const lvl = (s, n) => s.chars.some((c) => c && levelOf(c.xp) >= n) || Object.values(s.classBest).some((l) => l >= n);
const visited = (s, b) => !!s.visited?.[b];

export const GOALS = [
  { id: 'kills', text: 'Defeat 25 enemies', check: (s) => s.stats.kills >= 25, reward: { potions: 3 } },
  { id: 'lv5', text: 'Reach level 5', check: (s) => lvl(s, 5), reward: { potions: 3 } },
  { id: 'plains', text: 'Farm in the Plains', check: (s) => visited(s, 'plains'), reward: { potions: 3 } },
  { id: 'snake', text: 'Clear the Snake Pit', check: (s) => (s.clears.snake_pit || 0) >= 1, reward: { potions: 5, essence: 50 } },
  { id: 'equip', text: 'Equip an item from a dungeon', check: (s) => (s.stats.equips || 0) >= 1, reward: { potions: 3 } },
  { id: 'drink', text: 'Drink a potion', check: (s) => s.stats.potionsDrunk >= 1, reward: { potions: 5 } },
  { id: 'lv10', text: 'Reach level 10', check: (s) => lvl(s, 10), reward: { potions: 5 } },
  { id: 'desert', text: 'Farm in the Desert', check: (s) => visited(s, 'desert'), reward: { potions: 5 } },
  { id: 'clears', text: 'Clear 5 dungeons', check: (s) => s.stats.clears >= 5, reward: { potions: 5, essence: 100 } },
  { id: 'salvage', text: 'Salvage an item for essence', check: (s) => (s.stats.salvaged || 0) >= 1, reward: { essence: 50 } },
  { id: 'sprite', text: 'Farm in the Sprite Forest', check: (s) => visited(s, 'sprite'), reward: { potions: 8 } },
  { id: 'lv20', text: 'Reach level 20', check: (s) => lvl(s, 20), reward: { potions: 8 } },
  { id: 'city', text: 'Farm in the Abandoned City', check: (s) => visited(s, 'city'), reward: { potions: 10 } },
  { id: 'ut', text: 'Find a unique (UT) item', check: (s) => Object.keys(s.found).some((id) => id.startsWith('ut_')), reward: { essence: 150 } },
];
