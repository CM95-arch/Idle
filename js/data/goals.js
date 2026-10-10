// First Steps: early milestones with guaranteed rewards. Upgrade rewards go to the character you're viewing
// when you claim (you then pick which gear slot gets it). Checks look at the whole account.
import { levelOf } from '../core/character.js';

const lvl = (s, n) => s.chars.some((c) => c && levelOf(c.xp) >= n) || Object.values(s.classBest).some((l) => l >= n);
const visited = (s, b) => !!s.visited?.[b];

export const GOALS = [
  { id: 'kills', text: 'Defeat 25 enemies', check: (s) => s.stats.kills >= 25, reward: { upgrade: 2 } },
  { id: 'lv3', text: 'Reach level 3', check: (s) => lvl(s, 3), reward: { upgrade: 2 } },
  { id: 'plains', text: 'Farm in the Plains', check: (s) => visited(s, 'plains'), reward: { upgrade: 2 } },
  { id: 'snake', text: 'Clear the Snake Pit', check: (s) => (s.clears.snake_pit || 0) >= 1, reward: { upgrade: 2 } },
  { id: 'lv5', text: 'Reach level 5', check: (s) => lvl(s, 5), reward: { upgrade: 3 } },
  { id: 'upgrade', text: 'Choose a gear upgrade', check: (s) => (s.stats.upgrades || 0) >= 1, reward: { potions: 3 } },
  { id: 'desert', text: 'Farm in the Desert', check: (s) => visited(s, 'desert'), reward: { upgrade: 3 } },
  { id: 'drink', text: 'Drink a potion', check: (s) => s.stats.potionsDrunk >= 1, reward: { potions: 5 } },
  { id: 'lv10', text: 'Reach level 10', check: (s) => lvl(s, 10), reward: { upgrade: 4 } },
  { id: 'clears', text: 'Clear 5 dungeons', check: (s) => s.stats.clears >= 5, reward: { upgrade: 4 } },
  { id: 'sprite', text: 'Farm in the Sprite Forest', check: (s) => visited(s, 'sprite'), reward: { upgrade: 5 } },
  { id: 'ut', text: 'Wear a unique (UT) item', check: (s) => (s.stats.utEquips || 0) >= 1, reward: { potions: 5 } },
  { id: 'city', text: 'Farm in the Abandoned City', check: (s) => visited(s, 'city'), reward: { upgrade: 6 } },
  { id: 'class', text: 'Unlock a new class', check: (s) => lvl(s, 20), reward: { upgrade: 6 } },
];
