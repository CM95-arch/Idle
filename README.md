# Idle Realm

A roguelite idle RPG for iPhone, heavily inspired by Realm of the Mad God. Characters farm biomes on their own (even while the app is closed) for XP and stat potions. Dungeons are short bullet-hell runs you play with one thumb, and the only place gear drops. Falling in a dungeon ends that character's life, but its class remembers.

Like Mystic Coin, it's plain HTML/CSS/JavaScript with no build step, made to be saved to the iPhone home screen from Safari.

> **Test build.** Item, biome and dungeon names are Realm of the Mad God placeholders and must be renamed before any public release. All art is original placeholder pixel art.

## Play it locally

```bash
npm start            # http://localhost:8080
```

On desktop the game shows inside a phone frame. Use the browser's device toolbar (iPhone, 390×844) for touch.

## Put it on your phone (Cloudflare, one-time setup)

This works exactly like Mystic Coin:

1. In the Cloudflare dashboard, go to **Workers & Pages → Create → Import a repository** and pick `CM95-arch/Idle`.
2. Name the project **idle-realm** (it must match `name` in `wrangler.jsonc`). Leave the build command empty. The deploy command is the default `npx wrangler deploy`.
3. Deploy. Every push now updates the site, and every branch gets its own test link.
4. On the iPhone, open the link in Safari → Share → **Add to Home Screen**.

## How the game works

| | |
|---|---|
| **Lives** | A character is one life. Levels 1–20 give stats (Realm-style), potions push stats toward the class max. If a character falls in a dungeon, it starts a new life at level 1 and loses the gear it was wearing. Its class keeps a **legacy**: half of that character's potion stats, which never goes down and is capped at half of the potion range, so idling alone can't max a class. |
| **Biomes (idle)** | Every slot farms at the same time, one-on-one Pokémon-style fights, also while the app is closed. Biomes give XP and potions only. They are safe: below 20% HP the character **retreats** and waits until you send it back in, so farming far above your gear means babysitting retreats. |
| **Dungeons (active)** | One-thumb bullet hell: touch and hold, and your hero sits just above your thumb. Your weapon fires on its own with its Realm pattern (staff wavy pair, bow 3-way spread, wand fast bolt, sword short wide blade, dagger quick stream). Each class's ability fires on its own at the nearest enemy whenever there's enough MP. Two rooms, then a boss with three phases. Every boss is modeled on its Realm of the Mad God counterpart (see `js/core/bosses.js`): helpers that shield it (Davy's lanterns, Ruthven's coffins, the Forgotten King's guardians and crystals, Malus's cultists, the Worm Mother's segments), immune stretches, and its own attack cycle. Every bullet comes from an enemy's body, and nothing steers at you after it's fired. Enemies fire patterns based on their type. Loot bags go straight to your bag. **Retreat** any time to leave safely (the run's loot stays behind). Clearing gives the loot, XP and essence. Every dungeon is tuned to a gear tier ("Built for T5") and scales to the class entering it. |
| **Gear** | Dungeons are the only source of gear: tiered weapons, abilities, armor and rings for the class of the hero who cleared it (each dungeon drops a tier range) plus unique (UT) items, 1 clear in 10. Gear lives in the vault until equipped; only worn gear is ever at risk. Starter T1 gear is free and never lost. |
| **Essence** | From salvaging gear, clearing dungeons, and falling. Spend it to **reforge** any UT you've found before, even after losing it. |
| **SPD** | Shortens the walk between biome fights, and gives dungeon bullets a chance to graze past you. |
| **Oryx's Castle** | Needs the Sword, Shield and Helm runes. Each drops from its dungeon (Lost Halls, The Void, The Shatters) on about 40% of clears, guaranteed by the third. Entering uses them up. |
| **Potions** | Drop in every biome, more often deeper in (Forest 1 in 200 kills up to Godlands 1 in 20), and from dungeon bosses. 3 potions of one kind convert into 1 of your choice. |
| **Exaltation** | Potions drunk past a stat's max count toward +1 for every character of that class: 25 potions, then 50 more, then 75… up to +5. |
| **First Steps** | 14 early milestones (flag button in the top bar) with potion and essence rewards. |
| **Classes** | Wizard, Priest, Archer, Rogue and Warrior from the start. Knight (Warrior), Paladin (Knight), Huntress (Archer), Sorcerer (Wizard), Necromancer (Priest) and Assassin (Rogue) unlock at level 20 of the class in brackets. |
| **Slots** | 1 to start. +1 for the first clear of Lost Halls. More cost $2.99 each (a stand-in in the test build; no payment is taken). |

## Changing the balance

All numbers live in two files:

- `js/config.js`: stat formulas, levels and legacy, retreats, drop chances, essence, dungeon rules.
- `js/data/world.js`: biomes, dungeons, enemy strength curves, boss multipliers.
- `js/core/bosses.js`: every dungeon boss's fight.

After a change, run the balance report to see what it did:

```bash
npm run balance                     # survival time and kills/hour per biome for reference builds
node tools/classes.mjs              # every class side by side: kills/hour and survival
node tools/arena-bot.mjs wizard 6    # a bot plays every dungeon: clear rate at gear T-1 / built-for / T+1
node tools/boss-check.mjs wizard     # every boss at built-for gear: incoming damage per phase, fight length
```

## Adding your own art

1. Save a PNG named after the item id (for example `staff_t9.png`) in `assets/items/`. Item ids are in `js/data/items.js`.
2. Add the id to the list in `js/data/artManifest.js`.

Your art replaces the placeholder everywhere, and shows as a silhouette while undiscovered.

## Project layout

```
index.html, css/main.css     App shell and styles
js/config.js                 ★ Balance numbers
js/data/                     Classes, items, biomes, dungeons
js/core/                     Idle combat engine, dungeon bullet-hell engine (arena.js), loot, survival estimate, game state and saving (no DOM)
js/ui/                       Screens (farm, dungeons, vault, character), battle scene, sprites
tools/balance.mjs            Balance report
tools/icons.mjs              Renders the app icons from assets/icons/icon.svg
wireframes/                  The original wireframe sheet
```

Saves live in the browser's local storage on that device. Character → Settings & save can copy a save code to move it.
