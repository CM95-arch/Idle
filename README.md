# Idle Realm

An idle fantasy RPG for iPhone, heavily inspired by Realm of the Mad God. Characters farm biomes on their own (even while the app is closed), and you send one character at a time into dungeons for bosses, potions and unique items. All power comes from gear and stat potions; levels are only a score.

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
| **Farm** | Every character slot farms at the same time. The simulation keeps running while the app is closed and replays the time you were away when you reopen it. A fall stops farming; nothing is lost. |
| **Survival** | Estimated by running the real combat engine ahead: High = survives 8h+, Medium = 1–8h, Low = under 1h. |
| **Dungeons** | 3–4 rooms, then a boss (about 3–6 minutes). Combat is automatic, but in dungeons you tap the ability yourself and tap to dodge boss attacks (which stuns the boss). Rewards are only given on a clear. If you close the app mid-run, it plays on with worse timing. |
| **Oryx's Castle** | Needs the Sword, Shield and Helm runes (Lost Halls, The Void, The Shatters). Entering uses them up. If you hold two, the third can be bought with Essence. |
| **Potions** | Drop in Abandoned City (1 in 200 kills), Hell (1 in 100), Abyss (1 in 45), Godlands (1 in 20), and dungeons. Stored in the vault and drunk on any character. |
| **Exaltation** | Potions drunk past a stat's max count toward +1 for every character of that class: 25 potions, then 50 more, then 75… up to +5. |
| **Essence** | The only currency. Made by dismantling spare copies and potions. Spent on Forge (copy any discovered item, deliberately expensive) and on one rune. |
| **Classes** | Wizard, Priest, Archer, Rogue and Warrior from the start. Knight (Warrior), Paladin (Knight), Huntress (Archer), Sorcerer (Wizard), Necromancer (Priest) and Assassin (Rogue) unlock at level 10 of the class in brackets, about two hours of farming. |
| **Slots** | 2 to start. +1 for the first clear of Abyss of Demons and of Lost Halls. More cost $2.99 each (a stand-in in the test build; no payment is taken). |

## Changing the balance

All numbers live in two files:

- `js/config.js`: stat formulas, drop rates, potions, exaltation, Essence prices, dungeon rules.
- `js/data/world.js`: biomes, dungeons, enemy strength curves, boss multipliers.

After a change, run the balance report to see what it did:

```bash
npm run balance                     # survival time and kills/hour per biome for reference builds
npm run balance:dungeons -- wizard  # clear rate per dungeon (closed app)
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
js/core/                     Combat engine, loot, dungeons, survival estimate, game state and saving (no DOM)
js/ui/                       Screens (farm, dungeons, vault, character), battle scene, sprites
tools/balance.mjs            Balance report
tools/icons.mjs              Renders the app icons from assets/icons/icon.svg
wireframes/                  The original wireframe sheet
```

Saves live in the browser's local storage on that device. Character → Settings & save can copy a save code to move it.
