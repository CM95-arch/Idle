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
| **Battles** | Enemies come in groups: a front row and a back row across three lanes. Archers and casters shoot from the back; melee enemies step up when the front opens. Each weapon type has its own pattern: staves fire two weaving bolts that also hit a neighbor, wands pierce through to the enemy behind, bows spread one arrow down each lane, swords sweep the whole front row, daggers dart to the most wounded enemy anywhere. Abilities have shapes too (lane, row, chain, splash). Tap an enemy to focus it. |
| **Farm** | Every character slot farms at the same time. Attack speed follows ROTMG (8 shots/s at 75 DEX), and fights take about 5 seconds at matched gear. HP and MP carry over when you switch biomes. There's no resting: HP comes back quickly while walking to the next enemy. The simulation keeps running while the app is closed and replays the time you were away when you reopen it. A fall stops farming; nothing is lost. |
| **Gear** | Each character has four slots (weapon, ability, armor, ring) with a tier from T1 to T20. Tiers only go up, and only from dungeons. There are no random gear drops, no duplicates and no salvaging. |
| **Difficulty** | Estimated by running the real combat engine ahead: Low = survives 8h+, Moderate = 1–8h, High = under 1h. |
| **Dungeons** | 3–4 rooms, then a boss (about 3–5 minutes). Combat is automatic, but in dungeons you tap the ability yourself and tap to dodge boss attacks (which stuns the boss). Each dungeon has one tier, from Snake Pit (T2) to Oryx's Castle (T20). Every clear has a flat 1 in 5 chance to upgrade one slot to that tier, and you pick the slot (only slots below it are offered). Once all four slots reach a dungeon's tier, it shows ✓. A dungeon is tuned for a character whose slots are all one tier below it. Clears also give XP, potions and a 1 in 10 chance at one of the dungeon's UTs. Rewards are only given on a clear. If you close the app mid-run, it plays on with worse timing. |
| **Oryx's Castle** | Needs the Sword, Shield and Helm runes. Each drops from its dungeon (Lost Halls, The Void, The Shatters) on about 40% of clears, guaranteed by the third. Entering uses them up. |
| **Potions** | Drop in every biome, more often deeper in: Forest 1 in 200 kills up to Godlands 1 in 20, plus dungeons. Stored in the vault and drunk on any character. 3 potions of one kind convert into 1 of your choice. |
| **Exaltation** | Potions drunk past a stat's max count toward +1 for every character of that class: 25 potions, then 50 more, then 75… up to +5. |
| **Biome UTs** | Each biome has one rare UT (about two days of farming that biome). Godlands event bosses each have their own. |
| **UT items** | Unlocks for the whole account: any character that can use one can wear it at any time, at that character's slot tier. A UT has the normal stats of its tier plus a small bonus and a special effect (poison, exploding hits, cheat death, ramping damage, double casts…), shown in pink. Tap a gear slot to swap. |
| **Rings** | Rings use the same tier ladder. Pick the ring's stat in its slot for free, any time: ATT/DEX for damage, SPD for tempo (shorter walks and dodging), WIS/MP for abilities, HP/DEF/VIT for survival. |
| **First Steps** | 14 early milestones (flag button in the top bar). Rewards are potions or gear upgrades for the character you're viewing. |
| **Classes** | Wizard, Priest, Archer, Rogue and Warrior from the start. Knight (Warrior), Paladin (Knight), Huntress (Archer), Sorcerer (Wizard), Necromancer (Priest) and Assassin (Rogue) unlock at level 20 of the class in brackets, about 2–2.5 hours of farming. Early levels come every minute or two. |
| **Slots** | 1 to start. +1 for the first clear of Lost Halls (T17, late game). More cost $2.99 each (a stand-in in the test build; no payment is taken). |

## Changing the balance

All numbers live in two files:

- `js/config.js`: stat formulas, upgrade and UT chances, potions, exaltation, dungeon rules.
- `js/data/world.js`: biomes, dungeons, enemy strength curves, boss multipliers.

After a change, run the balance report to see what it did:

```bash
npm run balance                     # survival time and kills/hour per biome for reference builds
npm run balance:dungeons -- wizard  # clear rate per dungeon (closed app)
node tools/classes.mjs              # every class side by side: kills/hour and survival
node tools/tune-dungeons.mjs wizard # suggested enemy level per dungeon (slots one tier under clear ~70%)
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
