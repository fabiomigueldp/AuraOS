# Required Assets for AuraDriller

This document lists all the necessary assets for the AuraDriller game.

## I. Sprites & Images

All sprites should aim for a clean, modern aesthetic with neon accents, consistent with the AuraOS design language. Block sprites should be clearly distinguishable. Player and Oxygen Capsules should also be distinct.

**Directory:** `gameassets/auradriller/sprites/`

1.  **Player Sprite Sheet (`player_spritesheet.png`)**
    *   **Description:** A spritesheet for the player character. Dimensions per frame: 32x32px.
    *   **Animations needed:**
        *   Idle (facing down, ready to drill)
        *   Drilling animation (e.g., 2-4 frames, showing drill motion)
        *   Moving left/right (optional, if player visually turns or animates while moving horizontally at the surface)
        *   Hurt/Crushed (optional, for game over visual)
    *   **Style:** Neon accents (e.g., `var(--highlight-primary)`) on a modern, perhaps robotic or suit-clad figure.

2.  **Block Sprites (or parameters for procedural drawing if preferred)**
    *   **Option A: Individual Sprites (e.g., `block_red.png`, `block_blue.png`, etc.)**
        *   **Description:** Individual 32x32px sprites for each destructible block color.
        *   **Colors:** At least 4-6 distinct colors, matching the `this.blockColors` array in `AuraDriller.js`. Examples:
            *   Neon Red (`#FF5733` or similar)
            *   Neon Green (`#33FF57` or similar)
            *   Neon Blue (`#3357FF` or similar)
            *   Neon Yellow (`#FFFF33` or similar)
            *   Neon Magenta (`#FF33FF` or similar)
            *   Neon Cyan (`#33FFFF` or similar)
        *   **Style:** Clean, solid blocks, perhaps with a subtle neon glow or edge highlight.
    *   **Option B: Single Base Block Sprite with Tinting (`block_base.png`)**
        *   **Description:** A single 32x32px grayscale or base-colored block sprite that can be tinted in-game to the required colors. This might be more efficient.
        *   **Style:** Clean design, suitable for runtime color tinting.

3.  **Oxygen Capsule Sprite (`oxygen_capsule.png`)**
    *   **Description:** A 32x32px sprite for the oxygen capsule.
    *   **Style:** Distinct from regular blocks. Perhaps a slightly rounded, capsule shape with a clear "O₂" symbol or a bubbly/liquid appearance. Color should match `this.oxygenCapsuleColor` (light blue/whitish with transparency). Could have a subtle pulse animation (2-3 frames).

4.  **Block Breaking Particle Sprite Sheet (`block_particles.png`)**
    *   **Description:** A small spritesheet (e.g., 64x64px) containing various small particle shapes (e.g., shards, squares, circles) of different sizes. These will be colored and animated programmatically.
    *   **Style:** Generic shapes that can be tinted to match the broken block's color.

5.  **Drill Particle Sprite (`drill_spark.png`)**
    *   **Description:** A small sprite (e.g., 8x8px or 16x16px) for particles created while drilling.
    *   **Style:** Spark-like or small debris particle. Can be white or light gray to be tinted or used as is.

## II. Sound Effects

All sound effects should be short, crisp, and fit an arcade/modern-retro feel.

**Directory:** `gameassets/auradriller/sfx/`

1.  **Drilling Sound (`drill.wav`)**
    *   **Description:** A short, looping, or rapidly repeatable sound for active drilling. Could be a whirring or grinding sound.
    *   **Characteristics:** Not too harsh, should be tolerable if heard frequently.

2.  **Block Breaking Sound (`block_break.wav`)**
    *   **Description:** Sound for a regular block being destroyed by drilling.
    *   **Characteristics:** Crisp, percussive, perhaps with a slight crumble or pop.

3.  **Block Landing Sound (`block_land.wav`)**
    *   **Description:** Sound for a falling block landing on another block or the (conceptual) ground.
    *   **Characteristics:** A soft thud or impact sound. Different variations for landing on different surfaces could be nice but not essential.

4.  **Chain Reaction Sound (`chain_reaction.wav`)**
    *   **Description:** Sound for a successful chain reaction destroying multiple blocks.
    *   **Characteristics:** More prominent and rewarding than a single block break. Could be a series of quick pops, a whoosh, or a synthesized magical sound. Should have a positive feel.

5.  **Oxygen Pickup Sound (`oxygen_pickup.wav`)**
    *   **Description:** Sound for collecting an oxygen capsule.
    *   **Characteristics:** Positive, clear, and distinct. Perhaps a bubbly, "power-up" type sound.

6.  **Player Hit/Crushed Sound (`player_hit.wav`)**
    *   **Description:** Sound for when the player is hit or crushed by a falling block (leading to game over).
    *   **Characteristics:** A distinct impact/crushing sound, possibly with a short, sharp alarm or failure tone.

7.  **Game Over Sound (`game_over.wav`)**
    *   **Description:** Sound played when the game ends for any reason (oxygen depletion, crushed, or reaching target depth if it's not a "win" sound).
    *   **Characteristics:** A clear, somewhat melancholic or definitive game over jingle/sting.

8.  **Low Oxygen Warning (Optional - if not handled by UI notification sound)**
    *   **Description:** A subtle, repeating beep or warning tone when oxygen is low.
    *   **File:** `sfx_low_oxygen_warning.wav`

## III. Music

**Directory:** `gameassets/auradriller/music/`

1.  **Background Music Loop (`auradriller_bgm.mp3` or `.ogg`)**
    *   **Description:** An upbeat, engaging, and looping background music track suitable for an arcade puzzle game.
    *   **Style:** Modern-retro, synthwave, or chiptune elements could work well. Should not be too distracting but maintain energy.
    *   **Length:** Preferably 1-2 minutes before a clean loop.

## IV. GameCenter Assets

These are for display in the AuraOS GameCenter.

1.  **Icon (`icon_auradriller.svg` or `icon_auradriller.png`)**
    *   **Path:** `apps/GameCenter/assets/icons/` (or a new `gameassets/auradriller/ui/`)
    *   **Description:** A 32x32 or 64x64 pixel icon representing AuraDriller.
    *   **Style:** Should fit the AuraOS aesthetic. Could feature a stylized drill bit, a player character icon, or a representation of the colored blocks.
    *   **Placeholder for `gameData.js` `iconSvg`:**
        ```html
        <svg viewBox="0 0 32 32" fill="var(--icon-fill)"><path d="M16 3 L13 9 L14.5 9 L14.5 17 L10 17 L10 21 L13 21 L13 27 L19 27 L19 21 L22 21 L22 17 L17.5 17 L17.5 9 L19 9 Z M15 10 L17 10 L17 16 L15 16 Z M12 18 L20 18 L20 20 L12 20 Z M14 22 L18 22 L18 25 L14 25 Z M6 15 L6 20 L8 20 L8 15 Z M24 15 L24 20 L26 20 L26 15 Z" /></svg>
        ```
        *(This is a very rough SVG placeholder, a proper design is needed)*

2.  **Banner (`banner_auradriller.png`)**
    *   **Path:** `gameassets/` (as per existing games like `aurabreaker.png`) or `gameassets/auradriller/ui/`
    *   **Description:** A promotional banner image for AuraDriller, typically wider than it is tall (e.g., 600x300px or similar aspect ratio).
    *   **Style:** Dynamic, showing gameplay elements like the player drilling, blocks, and perhaps the game's title stylized. Should be eye-catching.
    *   **Placeholder path for `gameData.js` `banner`:** `gameassets/auradriller_banner.png` (Developer will need to create `auradriller_banner.png` and place it in `gameassets/`)

This list should cover all the external assets required to complete the visual and auditory experience of AuraDriller.
