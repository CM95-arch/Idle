# Realm Idle

A single-player idle RPG inspired by Realm of the Mad God. Lead a party of three classes across the Realm, from the Beaches to Oryx's Castle, then Ascend into a harder Realm with permanent bonuses. Your party keeps fighting while you're away.

Plain HTML/CSS/JavaScript, no build step. Save it to the iPhone home screen from Safari. Hosted as static files on Cloudflare (`wrangler.jsonc`).

> Private test build: Realm of the Mad God names (Oryx, the classes, zones) are placeholders and must be renamed before any public release.

## How it plays

| | |
|---|---|
| **Fame** | The one currency you earn: from kills, stage clears, bosses, and while you're away. Spend it on class levels and Unique upgrades. |
| **Gold** | Premium currency for convenience only (bag space, offline time, more slots). Never needed to progress. The store isn't open yet. |
| **Party** | Three classes fight at once. Start with the Wizard; Level 5 unlocks the next class (Priest → Archer → Rogue → Warrior), and higher classes unlock when two classes reach Level 20 (Knight, Huntress, Necromancer, Assassin, Paladin, Sorcerer). Each class has a role and an auto-ability. |
| **Stats (8/8)** | Each class has the eight ROTMG stats (Life, Mana, Attack, Defense, Speed, Dexterity, Vitality, Wisdom) at their real base and max values. Fame buys potions one at a time, in the potions' colors; prices rise toward each stat's max so a party reaches 8/8 around the Castle Approaches, just before Oryx. Stats reset when you Ascend. |
| **Endgame** | After Oryx, the Map opens two optional dungeons: the Lost Halls (Marble Colossus) and the Shatters (the Forgotten King). They are far harder (enemies ×4 and ×6 on top of normal growth), so a party has to farm to get through, and they guard their own Uniques: the real Lost Halls and Shatters UTs, plus new ones so every class has endgame gear. You can Ascend at any time instead. |
| **Uniques** | The only loot: 57 of Realm of the Mad God's UTs, recreated from the RealmEye wiki. Weapons fire their real patterns (Coral Bow's two pink arrows 9° apart at 125% rate, Doom Bow's single huge arrow at 33%, Staff of Extreme Prejudice's 360° ring, Demon Blade's V, Divinity's Exalted Beam), ability items change their class ability the way they do in ROTMG (Quiver of Thunder, Shield of Ogmur, Coral Venom Trap, Genesis Spell…), and armor and rings carry their real stat lines. Rare gold **Exalted** ones are the endgame chase. Bonuses are percentages, so they never go stale; a duplicate melts into your copy as +2 upgrades; kept when you Ascend. |
| **The horde** | No waves: enemies stream in without end while the party holds the middle of the field. Slay 50 to clear a stage and the fight rolls straight on into the next; every tenth stage a boss joins the horde. Enemies get tougher with every stage and zone, and the horde grows thicker. |
| **Stages** | 7 zones × 10 stages; every tenth is a boss. Auto-push moves you forward and falls back to farm when you hit a wall, retrying once you're 8% stronger. |
| **Offline** | Up to 8 hours of farming your best stage, with drops, shown on the Welcome Back screen. |
| **Ascension** | Beat Oryx to Ascend: stages, Fame and gear reset, classes keep a quarter of their levels, and you gain permanent Fame, damage, offline and drop-quality bonuses (big at first, smaller later) in a harder Realm that pays more. |

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

- `tools/gallery.html` (open on the dev server): every hero, monster, boss and Unique icon on one page, for reviewing the art.

```
npm start                                   # local server on :8080
node tools/sim.mjs 48 30 90                 # pacing: 48h of a scripted player, 30 min active / 90 min away
node tools/sim.mjs 24 30 90 levelCostGrowth=1.18   # try a balance change without editing the file
node tools/classes.mjs 30                   # class balance: every class at level 30 across every party
node tools/uniques.mjs 30                   # what each Unique is worth, in stages, against an empty slot
```
