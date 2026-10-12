# Realm Idle

A single-player idle RPG inspired by Realm of the Mad God. Lead a party of three classes across the Realm, from the Beaches to Oryx's Castle, then Ascend into a harder Realm with permanent bonuses. Your party keeps fighting while you're away.

Plain HTML/CSS/JavaScript, no build step. Save it to the iPhone home screen from Safari. Hosted as static files on Cloudflare (`wrangler.jsonc`).

> Private test build: Realm of the Mad God names (Oryx, the classes, zones) are placeholders and must be renamed before any public release.

## How it plays

| | |
|---|---|
| **Fame** | The one currency you earn: from kills, stage clears, bosses, salvaging gear, and while you're away. Spend it on class levels and gear upgrades. |
| **Gold** | Premium currency for convenience only (bag space, offline time, more slots). Never needed to progress. The store isn't open yet. |
| **Party** | Three classes fight at once. Start with the Wizard; Level 5 unlocks the next class (Priest → Archer → Rogue → Warrior), and higher classes unlock when two classes reach Level 20 (Knight, Huntress, Necromancer, Assassin, Paladin, Sorcerer). Each class has a role and an auto-ability. |
| **Gear** | Four slots per class (weapon, ability, armor, ring), six rarities from Common to Mythic. Rarer pieces roll extra stats. Upgrade with Fame; salvage spares into Fame. Better weapons glow on your heroes. |
| **Stages** | 7 zones × 10 stages; every tenth is a boss. Auto-push moves you forward and falls back to farm when you hit a wall, retrying once you're 8% stronger. |
| **Offline** | Up to 8 hours of farming your best stage, with drops, shown on the Welcome Back screen. |
| **Ascension** | Beat Oryx to Ascend: stages, Fame and gear reset, classes keep a quarter of their levels, and you gain permanent Fame, damage, offline and drop-quality bonuses (big at first, smaller later) in a harder Realm that pays more. |

## Code map

- `js/data/balance.js`: **every tuning number** (growth curves, costs, rewards, rarities, Ascension).
- `js/data/classes.js`, `zones.js`, `gear.js`: classes and abilities, the Realm's zones and bosses, gear kinds and stats.
- `js/core/battle.js`: the auto-battle simulation (runs live, offline and in the balance tool).
- `js/core/game.js`: the save and every action (leveling, gear, rewards, offline, Ascension).
- `js/core/heroes.js`, `items.js`: hero stats and party power; items.
- `js/ui/battleView.js`: the battle renderer (effects, numbers, loot, banners).
- `js/ui/art/`: all the art, as vector SVG built in code: `heroes.js` (11 classes, front and back), `monsters.js` (enemy and boss archetypes), `items.js` (gear icons by rarity), `scenes.js` (zone backdrops), `core.js` (shading helpers).
- `js/ui/*.js`: the screens (battle, party, gear, map, ascend) and celebration overlays.

## Tools

```
npm start                                   # local server on :8080
node tools/sim.mjs 48 30 90                 # pacing: 48h of a scripted player, 30 min active / 90 min away
node tools/sim.mjs 24 30 90 levelCostGrowth=1.18   # try a balance change without editing the file
```
