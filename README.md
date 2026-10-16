# Realm Idle

A single-player idle RPG inspired by Realm of the Mad God. Lead a party of three classes across the Realm, from the Beaches to Oryx's Castle, then Ascend into a harder Realm with permanent bonuses. Your party keeps fighting while you're away.

Plain HTML/CSS/JavaScript, no build step. Save it to the iPhone home screen from Safari. Hosted as static files on Cloudflare (`wrangler.jsonc`).

> Private test build: Realm of the Mad God names (Oryx, the classes, zones) are placeholders and must be renamed before any public release.

## How it plays

| | |
|---|---|
| **Fame** | The one currency you earn: from kills, stage clears, bosses, and while you're away. Spend it on class levels and gear upgrades. |
| **Gold** | Premium currency for convenience only (bag space, offline time, more slots). Never needed to progress. The store isn't open yet. |
| **Party** | Three classes fight at once. Start with the Wizard; Level 5 unlocks the next class (Priest → Archer → Rogue → Warrior), and higher classes unlock when two classes reach Level 20 (Knight, Huntress, Necromancer, Assassin, Paladin, Sorcerer). Each class has a role and an auto-ability. |
| **Stats (8/8)** | Each class has the eight ROTMG stats (Life, Mana, Attack, Defense, Speed, Dexterity, Vitality, Wisdom) at their real base and max values. Fame buys potions one at a time, in the potions' colors; prices rise toward each stat's max so a party reaches 8/8 around the Castle Approaches, just before Oryx. Ascending puts every class back to level 1 with a fifth of its potions, and each Ascension raises every stat's cap by 3 potions (+3 ATT, +15 Life…), so the stats (and what's kept) grow without end. |
| **Dungeons** | 26 real ROTMG dungeons in 15 tiers, from the Spider Den and Snake Pit to the Lost Halls and the Shatters. Beating Oryx in Realm N opens tier N for good. Each is five stages ending in its real boss, run again and again, and that boss guards its real gear (per RealmEye's drop data). |
| **Gear** | The only loot: 89 named pieces of gear with their own names, inspired by Realm of the Mad God's UTs (shot patterns and stat lines from the RealmEye wiki). Each drops only from its real source: the Grand Sphinx and the Keyper in the Realm (1 kill in 20), and every dungeon boss (about 1 in 16). Weapons fire distinct patterns (the Reefsong Bow's twin arrows, the Gravecaller Longbow's single huge arrow, the Sunburst Staff's 360° ring, Dawnbreaker's beam), ability items change their class ability (Stormcaller Quiver, Spell of First Light, Polarity Vial…), and armor and rings each add an effect you can see: orbiting motes, burning halos, shield bubbles, healing waves, thorn bursts, lightning on crits, hunting spirits. Rare gold **Exalted** ones are the endgame chase. The Beaches hide one ability item per class, a rare drop from any enemy there (the first Beach boss always drops one): modest stats, but every cast adds a burst of embers, feathers, kelp, spirits or sea-lightning. A duplicate melts into your copy as +2 upgrades; kept when you Ascend. |
| **The horde** | No waves: enemies stream in without end while the party holds the middle of the field. Slay 50 to clear a stage and the fight rolls straight on into the next; every tenth stage a boss joins the horde. Enemies get tougher with every stage and zone, and the horde grows thicker. |
| **Stages** | 7 zones × 10 stages; every tenth is a boss. Auto-push moves you forward and falls back to farm when you hit a wall, retrying once you're 8% stronger. |
| **Offline** | Up to 8 hours of farming your best stage, with drops, shown on the Welcome Back screen. |
| **Ascension** | Beat Oryx to Ascend: stages, Fame and gear upgrades reset, classes go back to level 1 (keeping their gear and a fifth of their potions), and you gain permanent Fame, damage, offline and drop-quality bonuses (big at first, smaller later) in a harder Realm that pays more. The first Realm pays 4× Fame, so a new player reaches Oryx and the first dungeons in a few hours. |

## Code map

- `js/data/uniques.js`: the Unique items and their effects (applied in `js/core/battle.js`).
- `js/data/balance.js`: **every tuning number** (growth curves, costs, rewards, rarities, Ascension).
- `js/data/classes.js`, `zones.js`, `gear.js`: classes and abilities, the Realm's zones and bosses, gear kinds and stats.
- `js/core/battle.js`: the horde battle simulation on a flat field (runs live, offline and in the balance tools).
- `js/core/game.js`: the save and every action (leveling, gear, rewards, offline, Ascension).
- `js/core/heroes.js`, `items.js`: hero stats and party power; items.
- `js/ui/battleView.js`: the battle renderer, top-down at a three-quarter angle (horde, tracers, blasts, splats, numbers, loot).
- `js/ui/art/`: all the art, as vector SVG built in code: `heroes.js` (11 classes, portraits), `chibi.js` (the chunky battle figures), `monsters.js` (enemy and boss archetypes), `items.js` (gear icons by rarity), `arena.js` (each zone's battlefield, lit at night), `core.js` (shading helpers).
- `js/ui/*.js`: the screens (battle, party, gear, map, ascend) and celebration overlays.

## Tools

- `tools/gallery.html` (open on the dev server): every hero, monster, boss and gear icon on one page, for reviewing the art.

```
npm start                                   # local server on :8080
node tools/sim.mjs 48 30 90                 # pacing: 48h of a scripted player, 30 min active / 90 min away
node tools/sim.mjs 24 30 90 levelCostGrowth=1.18   # try a balance change without editing the file
node tools/classes.mjs 30                   # class balance: every class at level 30 across every party
node tools/endgame.mjs 1500                # a maxed post-Shatters player: how long each Realm past XV takes
node tools/uniques.mjs 30                   # what each Unique is worth, in stages, against an empty slot
```
