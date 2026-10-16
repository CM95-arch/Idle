import { UNIQUES } from './uniques.js';

// Long-term goals: rewards for beating Vexis in the Realms past the Fractured Keep, and achievements.
// A Realm reward is yours for good once you've beaten Vexis in that Realm (state.peak counts the Realms beaten).
// The track runs on past what anyone can reach today; updates add more Realms and more rewards.
export const REWARDS = [
  { realm: 16, id: 'companion', icon: '✦', name: 'Companion', desc: 'A star-sprite joins the party, flying above it and shooting the nearest enemy. Level it up with Glory on the Party screen.' },
  { realm: 18, id: 'awaken1', icon: '⬆', name: 'Gear Awakening', desc: 'Gear can be upgraded past +10, up to +15.', awaken: 1 },
  { realm: 20, id: 'aura', icon: '☀', name: 'Ascendant Aura', desc: 'Your heroes shine with the light of twenty Realms, and the Companion\'s shots burst on impact.' },
  { realm: 22, id: 'awaken2', icon: '⬆', name: 'Second Awakening', desc: 'Gear can be upgraded up to +20.', awaken: 2 },
  { realm: 24, id: 'crown', icon: '♛', name: 'Crown of the Realm', desc: 'A golden crown for every hero, and the Companion fires three shots at once.' },
  { realm: 26, id: 'awaken3', icon: '⬆', name: 'Third Awakening', desc: 'Gear can be upgraded up to +25.', awaken: 3 },
  { realm: 28, id: 'wings', icon: '❖', name: 'Wings of the Usurper', desc: 'Spectral wings for every hero, and +10% damage for the whole party.', dmg: 0.1 },
  { realm: 30, id: 'awaken4', icon: '⬆', name: 'Fourth Awakening', desc: 'Gear can be upgraded up to +30.', awaken: 4 },
];

// Achievements: each pays a small permanent bonus. There are only so many, so they never replace the wall.
// test(s, G): s is the save, G the game module.
const R = (n) => (s) => (s.peak || 0) >= n;
export const ACHIEVEMENTS = [
  { id: 'oryx1', name: 'The Usurper Falls', desc: 'Beat Vexis for the first time.', test: R(1), dmg: 0.02 },
  { id: 'oryx5', name: 'Seasoned', desc: 'Beat Vexis in Realm V.', test: R(5), hp: 0.03 },
  { id: 'oryx10', name: 'Veteran of Ten', desc: 'Beat Vexis in Realm X.', test: R(10), dmg: 0.03 },
  { id: 'oryx15', name: 'Fifteen Thrones', desc: 'Beat Vexis in Realm XV.', test: R(15), fame: 0.1 },
  { id: 'oryx20', name: 'Twenty Crowns', desc: 'Beat Vexis in Realm XX.', test: R(20), dmg: 0.04 },
  { id: 'oryx25', name: 'Beyond Reason', desc: 'Beat Vexis in Realm XXV.', test: R(25), hp: 0.05 },
  { id: 'dung1', name: 'Down the Hole', desc: 'Clear a dungeon.', test: (s) => Object.values(s.dbest || {}).some((v) => v >= 5), fame: 0.05 },
  { id: 'halls', name: 'Hallowed Ground', desc: 'Clear the Halls of the Forsaken.', test: (s) => (s.dbest?.halls || 0) >= 5, dmg: 0.03 },
  { id: 'shatters', name: 'Shattered', desc: 'Clear the Fractured Keep.', test: (s) => (s.dbest?.shatters || 0) >= 5, hp: 0.04 },
  { id: 'gear10', name: 'Collector', desc: 'Find 10 different pieces of gear.', test: (s) => Object.keys(s.uniques || {}).length >= 10, fame: 0.05 },
  { id: 'gear40', name: 'Curator', desc: 'Find 40 different pieces of gear.', test: (s) => Object.keys(s.uniques || {}).length >= 40, dmg: 0.02 },
  { id: 'gearAll', name: 'The Whole Vault', desc: 'Find every piece of gear.', test: (s) => UNIQUES.every((u) => s.uniques?.[u.id]), dmg: 0.05 },
  { id: 'exalted', name: 'Touched by Gold', desc: 'Find a Mythic piece of gear.', test: (s) => UNIQUES.some((u) => u.exalted && s.uniques?.[u.id]), hp: 0.03 },
  { id: 'maxed', name: 'Fully Upgraded', desc: 'Upgrade a piece of gear to +10.', test: (s, G) => G.allItems().some((it) => it.up >= 10), dmg: 0.02 },
  { id: 'awakened', name: 'Awakened', desc: 'Upgrade a piece of gear to +20.', test: (s, G) => G.allItems().some((it) => it.up >= 20), dmg: 0.03 },
  { id: 'eight', name: 'Perfected', desc: 'Max all eight stats on a class.', test: (s, G) => Object.keys(s.classes).some((c) => G.maxedCount(c) === 8), hp: 0.02 },
  { id: 'eight3', name: 'A Perfect Party', desc: 'Have three Perfected classes at once.', test: (s, G) => Object.keys(s.classes).filter((c) => G.maxedCount(c) === 8).length >= 3, dmg: 0.03 },
  { id: 'classes', name: 'Every Class', desc: 'Unlock all eleven classes.', test: (s) => Object.keys(s.classes).length >= 11, fame: 0.1 },
  { id: 'lv100', name: 'Level 100', desc: 'Get a hero to level 100.', test: (s) => Object.values(s.classes).some((C) => C.lv >= 100), hp: 0.02 },
  { id: 'lv150', name: 'Level 150', desc: 'Get a hero to level 150.', test: (s) => Object.values(s.classes).some((C) => C.lv >= 150), dmg: 0.03 },
  { id: 'kills', name: 'Ten Thousand', desc: 'Defeat 10,000 enemies.', test: (s) => s.stats.kills >= 1e4, fame: 0.05 },
  { id: 'kills2', name: 'A Million Down', desc: 'Defeat 1,000,000 enemies.', test: (s) => s.stats.kills >= 1e6, dmg: 0.04 },
  { id: 'bosses', name: 'Boss Hunter', desc: 'Defeat 500 bosses.', test: (s) => s.stats.bosses >= 500, hp: 0.03 },
  { id: 'pet', name: 'Best Friend', desc: 'Get the Companion to level 50.', test: (s) => (s.pet?.lv || 0) >= 50, dmg: 0.03 },
];
