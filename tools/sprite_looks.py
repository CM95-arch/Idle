# What every hero and enemy looks like, written for an image generator (see tools/sprite_pack.py).
# Heroes: outfit, weapon, colors, and the three beats of their attack (wind-up, strike, follow-through). Enemies: a short description in the game's art style.

HEROES = {
    'wizard': ('Wizard', 'a tall pointed wide-brimmed wizard hat, a long deep-blue robe with gold trim, a wooden staff topped with a glowing amber orb',
               ('drawing the staff back over one shoulder, the orb gathering light', 'thrusting the staff forward overhead, the orb blazing', 'the staff lowering, a wisp of light trailing from the orb')),
    'priest': ('Priest', 'white and cream hooded robes with gold trim, a slender golden wand, a small holy book at the hip',
               ('lifting the wand, light gathering at its tip', 'the wand raised high, a bright golden glow', 'the wand lowering, the glow fading')),
    'archer': ('Archer', 'a forest-green hooded leather tunic, brown leather bracers and boots, a longbow, a quiver of arrows on the back',
               ('nocking an arrow, the bow coming up', 'the bow at full draw, aiming forward', 'the arrow just loosed, bow arm still forward, string hand pulled back past the ear')),
    'rogue': ('Rogue', 'charcoal and dusk-purple hooded leathers, a short ragged cloak, a dagger in each hand',
              ('crouching low, a dagger drawn back', 'lunging forward, the dagger thrust out', 'recovering from the lunge, both blades low')),
    'warrior': ('Warrior', 'crimson-red heavy plate armor with steel trim, an open steel helm with a red plume, a broad longsword',
                ('raising the longsword high overhead', 'mid-swing, the sword slashing down and across', 'the sword low after the swing, body twisted through')),
    'knight': ('Knight', 'steel-blue full plate armor, a closed great helm, a longsword and a kite shield with a blue field',
               ('shield raised and braced, sword drawn back', 'bashing forward behind the shield', 'stepping back into guard, shield up')),
    'huntress': ('Huntress', 'tan and olive hooded leathers, a longbow, an iron snare trap hanging from the belt',
                 ('nocking an arrow, the bow coming up', 'the bow at full draw, aiming forward', 'the arrow just loosed, bow arm still forward, string hand pulled back past the ear')),
    'necromancer': ('Necromancer', 'a dark-green hooded robe with bone ornaments, a bone staff, a small skull glowing green at the belt',
                    ('drawing the bone staff back, the skull beginning to glow', 'the staff raised high, green light pouring from the skull', 'the staff lowering, green wisps drifting away')),
    'assassin': ('Assassin', 'deep-violet hooded leathers, two curved daggers, green poison vials on a bandolier',
                 ('reaching for a poison vial, body coiled', 'throwing the vial forward, arm outstretched', 'the throwing arm following through, body turned')),
    'paladin': ('Paladin', 'ivory-and-gold plate armor, a great helm, a longsword, a blue holy seal emblem on the chest',
                ('gripping the longsword in both hands, the seal glowing', 'the sword raised high overhead, the seal blazing', 'the sword lowered into guard')),
    'sorcerer': ('Sorcerer', 'a violet robe with a tall pointed hood, a slender wand crackling with cyan light, a short scepter at the belt',
                 ('drawing the wand back, sparks gathering', 'pointing the wand forward, cyan lightning crackling from it', 'the wand lowering, sparks fading')),
}

# enemy name -> appearance
ENEMIES = {
    # Sunken Shore
    'Pirate': 'a lean pirate in a red bandana and navy coat, holding a cutlass',
    'Giant Crab': 'a giant red-orange crab with raised pincers',
    'Sand Slime': 'a squat blob of sandy-yellow slime with dark grains',
    'Kraken King': 'a huge violet-pink kraken rising up, thick curling tentacles, a gold crown',
    # Greenvale
    'Halfling Hexer': 'a small hooded halfling witch in brown robes with a crooked staff, a blue spark at its tip',
    'Goblin': 'a wiry green goblin with small horns and leather scraps, holding a jagged blade',
    'Viper': 'a coiled olive-green viper with yellow markings, head raised',
    'Dwarf Warlord': 'a broad dwarf warlord with a braided beard, bronze armor, a gold crown and a great axe',
    # Thornwood
    'Orc Warrior': 'a hulking green-skinned orc in dark iron helm and armor, holding a battle axe',
    'Dark Elf': 'a slender hooded dark elf in violet and black, holding a spear',
    'Skeleton': 'a bone-white skeleton warrior with a rusted sword, red glinting eye sockets',
    'Lich': 'a tall gaunt lich in tattered violet robes, skeletal hands, cyan glow in its hood',
    # Stormcrag Peaks
    'Ogre': 'a huge tan-skinned ogre with a crude stone axe and leather loincloth',
    'Stone Golem': 'a hulking grey stone golem made of rough boulders, amber light in its cracks',
    'Wraith': 'a pale blue-grey hooded wraith, its lower body fading into mist',
    'Elder Treant': 'a towering ancient tree creature with a bark body, mossy branches and glowing green eyes',
    # Starfall Expanse
    'Medusa': 'a medusa with a teal serpent tail and gold-scaled torso, snakes for hair',
    'Gazer': 'a floating round magenta creature with one huge eye and short eyestalks',
    'Mind Leech': 'a pale pink floating brain-like blob trailing thin tendrils',
    'Sandsworn Sphinx': 'a great golden sphinx with a lion body, wings and a pharaoh headdress',
    # Spire Approach
    'Spire Sentinel': 'a tall armored guard in dark violet plate and a crested helm, holding a spear',
    'Stone Gargoyle': 'a crouching grey stone gargoyle with bat wings and horns',
    'Scarab': 'a large armored beetle, dark olive shell with gold edges',
    'The Gatewarden': 'a colossal steel-grey stone golem guardian with a crown and glowing blue runes',
    # The Usurper's Spire
    'Usurper’s Henchman': 'a horned soldier in deep crimson armor with gold trim, holding a blade',
    'Royal Golem': 'a violet stone golem with gold inlays and a small crown',
    'Spire Thrall': 'a hunched shadowy demon thrall in dark purple with glowing magenta eyes',
    'Vexis the Usurper': 'a towering dark-armored tyrant king in black and crimson plate, a jagged gold crown, a long cape and a great dark sword',
    # Webwood Hollow
    'Black Widow': 'a large black spider with a red hourglass mark',
    'Spider Hatchling': 'a small brown spider with yellow markings',
    'Egg Sac': 'a pale white silken egg sac, lumpy and pulsing',
    'Silkmother Veyra': 'a huge spider queen with a purple-black body, red markings and webbing trailing from her legs',
    # Serpent's Coil
    'Coil Guard': 'a scaly green lizardfolk guard in a helm, holding a spear',
    'Pit Snake': 'a coiled green snake with yellow belly scales',
    'Pit Viper': 'a coiled rust-red viper with tan bands, fangs bared',
    'Ssaresh the Coiled Queen': 'a serpent queen with a long teal tail, golden scales, a hooded cobra crown',
    # Glimmerglade
    'Nature Sprite': 'a small glowing green fairy spirit with leaf wings',
    'Sprite Imp': 'a mischievous little green imp with pointed ears and leafy wings',
    'Glimmerling': 'a tiny glowing mint-green blob with sparkles',
    'Lumi the Glade Mother': 'a tall radiant fairy queen of pale cyan light with long flowing hair and gossamer wings',
    # The Bonecrypt
    'Crypt Skeleton': 'a bone skeleton warrior with faint teal light in its eye sockets',
    'Crypt Ghost': 'a pale grey-blue ghost in a tattered shroud',
    'Crypt Mummy': 'a bandaged mummy with a curved blade, teal glow under the wraps',
    'Morvane the Grave Lord': 'a skeletal lich lord in dark teal robes with a bone crown and a glowing staff',
    # Brinewreck Harbor
    'Brinewreck Sailor': 'a drowned grey-skinned sailor in a bandana and torn coat, holding a cutlass',
    'Bottled Spirit': 'a pale blue spirit escaping from a glass bottle',
    'Harbor Crab': 'a teal-shelled crab encrusted with barnacles',
    'Captain Saltmarrow': 'a big bearded ghostly pirate captain in a long coat and tricorn, a cutlass in hand',
    # The Ashen Pit
    'Imp': 'a small red imp with horns, bat wings and a pointed tail',
    'Demon Warrior': 'a horned red-skinned demon in black armor, holding an axe',
    'Pit Brute': 'a hulking dark-red demon brute with cracked lava skin',
    'Archfiend Korzul': 'a towering crowned archfiend with crimson skin, great horns and burning wings',
    # The Mossmaze
    'Giant Larva': 'a fat pale-green larva with soft segments',
    'Dusk Moth': 'a large tan moth with patterned wings',
    'Feral Squirrel': 'a big snarling brown squirrel standing upright with a tiny blade',
    'The Moth Matriarch': 'an enormous moth with dark brown and amber wings marked with eye patterns',
    # The Alchemy Works
    'Escaped Experiment': 'a bubbling purple slime creature with glass shards stuck in it',
    'Brass Golem': 'a steel-blue brass golem with pipes and a glowing green core',
    'Clockwork Eye': 'a floating brass orb with a single green lens eye and small gears',
    'Doctor Grimsby': 'a tall alchemist in a white coat and brass goggles holding a bubbling staff',
    # Gravemoor
    'Zombie': 'a rotting green-skinned zombie in torn clothes holding a rusty axe',
    'Restless Ghost': 'a pale lavender ghost with a mournful hollow face',
    'Grave Skeleton': 'a weathered yellowed skeleton with red eye sockets',
    'The Gravemoor Wraith': 'a towering blue-grey wraith in a hooded shroud with long clawed hands',
    # Crimson Manor
    'Vampire Bat': 'a large dark bat with red eyes and leathery wings',
    'Vampire Servant': 'a pale hooded servant in dark crimson holding a dagger',
    'Haunted Armor': 'an empty suit of grey plate armor holding a spear, red light in the visor',
    'Count Vasilrei': 'a tall pale vampire noble in a high-collared black and crimson coat, a thin crown and a rapier',
    # The Sludgeways
    'Sewer Rat': 'a big mangy brown rat with red eyes',
    'Toxic Slime': 'a glowing acid-green slime blob',
    'Sewer Bat': 'a grimy olive bat with sickly green eyes',
    'Glorb the Sludge King': 'a huge green sludge blob wearing a battered crown, junk floating inside it',
    # The Forbidden Archive
    'Cursed Tome': 'a flying leather-bound book with teeth along its pages and a teal glow',
    'Library Spirit': 'a pale blue spectral scholar trailing loose pages',
    'Mad Scholar': 'a hooded scholar in violet robes clutching a staff and a book',
    'The Ink-Bound Archivist': 'a skeletal archivist in violet robes, wrapped in floating pages and ink tendrils',
    # Frostfang Grotto
    'Ice Golem': 'a pale blue golem of ice blocks with frosted edges',
    'Snow Bat': 'a white-furred bat with icy blue wing membranes',
    'Frost Sprite': 'a small glowing white and blue ice spirit',
    'Hrimvald the Frozen': 'a frozen lich king in pale blue robes with an icicle crown and a frost staff',
    # The Drowned Hold
    'Ghost Sailor': 'a translucent teal ghost of a sailor with a lantern',
    'Drowned Pirate': 'a seaweed-draped drowned pirate with a cutlass',
    'Phantom Crab': 'a translucent ghostly teal crab',
    'The Drowned Captain': 'a huge bearded drowned captain in a waterlogged coat, seaweed in his beard, a cutlass',
    # Sunscorch Tomb
    'Tomb Mummy': 'a pale bandaged mummy guard with a spear and a gold collar',
    'Tomb Guardian': 'a sandstone guardian statue with gold inlays and cyan eyes',
    'The Three Sun Kings': 'three golden pharaoh statue-kings fused into one giant figure, each with a crown',
    # The Abyssal Reef
    'Reef Warrior': 'a blue-scaled fishfolk warrior in a shell helm, holding a spear',
    'Pink Jellyfish': 'a translucent pink jellyfish with trailing tendrils',
    'Deep Slime': 'a deep-blue glowing slime blob',
    'Nerissa of the Deep': 'a mermaid sorceress with a long teal tail, coral-pink hair and a gold circlet',
    # Prismhollow
    'Crystal Worm': 'a segmented worm made of violet crystal',
    'Crystal Golem': 'a golem of jagged violet crystal shards',
    'Shard Eye': 'a floating violet crystal with a single glowing pink eye',
    'The Prism Tyrant': 'a towering crowned golem of pale violet crystal radiating pink light',
    # Jade Monastery
    'Temple Monk': 'a hooded green-robed monk with a wooden staff',
    'Jade Statue': 'a living jade warrior statue with gold details',
    'Stone Dragon': 'a coiled grey-green stone dragon with orange eyes',
    'The Fallen Abbot': 'a tall corrupted abbot in dark green armor-robes with a curved sword',
    # Dragonspire Roost
    'Dragon Whelp': 'a small red-orange dragon with stubby wings',
    'Roost Guard': 'a red-armored dragon-cult guard in a horned helm, holding a spear',
    'Dragon Egg': 'a large golden speckled dragon egg, cracking',
    'Viridax the Green Wyrm': 'a great green dragon with emerald scales, spread wings and golden horns',
    # The Fleshwarrens
    'Parasite': 'a crimson segmented parasite with hooked legs',
    'Flesh Blob': 'a quivering pink flesh blob',
    'Host': 'a hooded humanoid with pink parasitic growths, holding a blade',
    'The Hive Heart': 'an enormous pulsing crimson heart-like hive with tendrils and many small eyes',
    # Cinderforge
    'Fire Imp': 'a small orange fire imp with flaming horns',
    'Magma Golem': 'a hulking black rock golem with glowing orange lava cracks',
    'Flame Spirit': 'a dancing spirit of orange flame',
    'Ignaroth the Forgemaster': 'a giant crowned fire demon blacksmith with a molten hammer and ember wings',
    # The Marionette Stage
    'Knight Puppet': 'a wooden knight marionette on strings with a painted helm and sword',
    'Archer Puppet': 'a wooden archer marionette on strings with a small bow',
    'Priest Puppet': 'a wooden priest marionette in cream robes on strings',
    'The Stringmaster': 'a tall masked puppeteer in a crimson coat and crown, golden strings flowing from the fingers',
    # Cogsmoke Foundry
    'Gearling': 'a small green-skinned tinkerer in a brass helm holding a wrench-axe',
    'Steam Golem': 'a bronze steam golem venting smoke, pipes on its back',
    'Gear Bot': 'a floating round brass bot with a single amber eye',
    'The Iron Overseer': 'a huge crowned iron and brass foreman automaton with smokestacks',
    # The Overgrown Ruins
    'Masked Warrior': 'a jungle warrior in a carved wooden mask and leaf armor, holding a spear',
    'Jungle Snake': 'a bright green jungle snake with red markings',
    'Totem': 'a carved wooden totem pole with glowing teal eyes',
    'Tlaxu the Masked Serpent': 'a giant feathered serpent with a golden ceremonial mask',
    # Nightshade Garden
    'Thorn Vine': 'a writhing thorny green vine with pink blossoms',
    'Blooming Golem': 'a golem of roots and earth covered in pink flowers',
    'Garden Bee': 'a big fuzzy yellow and black bee',
    'The Nightshade Queen': 'a towering queen made of dark vines and magenta poison blooms, a flower crown',
    # The Usurper's Sanctum
    'Sanctum Guard': 'a crowned violet stone guardian golem with gold trim',
    'Vexis Ascendant': 'the tyrant king Vexis in ascended form: black and crimson plate, glowing gold eyes behind a jagged crown, burning wings',
    # Halls of the Forsaken
    'Forsaken Sentry': 'a pale alabaster stone sentry with blue glowing eyes',
    'Cultist': 'a hooded crimson-robed cultist holding a staff',
    'Void Mite': 'a small dark violet void insect with glowing purple eyes',
    'The Alabaster Colossus': 'a colossal white alabaster statue warrior with gold trim and a crown',
    # The Fractured Keep
    'Fractured Knight': 'a dark knight in cracked grey plate with violet light leaking from the cracks',
    'Stone Mage': 'a hooded mage of grey stone with a cyan-glowing staff',
    'Twilight Wraith': 'a violet and magenta twilight wraith trailing shadow',
    'The Last Monarch': 'a skeletal king in dark violet robes with a broken gold crown and a scepter',
}

# what each gear kind looks like as an icon
KIND_LOOK = {
    'bow': 'a bow', 'staff': 'a magic staff', 'wand': 'a wand', 'dagger': 'a dagger', 'sword': 'a sword',
    'spell': 'a glowing spell orb', 'tome': 'a spellbook', 'quiver': 'a quiver of arrows', 'cloak': 'a hooded cloak',
    'helm': 'a war helm', 'shield': 'a shield', 'trap': 'a hunter’s snare trap', 'skull': 'a carved skull charm',
    'poison': 'a glass poison vial', 'seal': 'a round holy seal medallion', 'scepter': 'a short scepter',
    'robe': 'a robe', 'leather': 'a leather armor vest', 'heavy': 'a plate armor chestpiece', 'ring': 'a ring',
}
