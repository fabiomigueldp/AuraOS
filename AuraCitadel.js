/**
 * @file AuraCitadel.js
 * Main game logic for Aura Citadel, a tower defense game.
 */

// Helper for unique IDs
function generateUniqueId() {
    return `id_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Aura-like colors (placeholders, actual values might come from CSS vars if possible later)
const AURA_COLORS = {
    primaryText: '#E0E0E0', // Light grey/white for text
    highlightPrimary: '#00BFFF', // Deep sky blue for highlights
    highlightSecondary: '#FFD700', // Gold for important highlights
    enemyDefault: '#FF6347', // Tomato red for enemies
    enemyStrong: '#FF4500', // OrangeRed
    projectileDefault: '#ADFF2F', // GreenYellow
    towerBase: '#A9A9A9', // DarkGray
    towerWeapon: '#778899', // LightSlateGray
    uiBackground: 'rgba(30, 30, 30, 0.8)', // Semi-transparent dark background for UI panels
    gridLines: '#4A4A4A', // Darker grey for grid
    pathColor: 'rgba(139, 0, 0, 0.3)', // DarkRed, semi-transparent for path
};


function AuraCitadelGame(canvas) {
    if (!canvas || !(canvas instanceof HTMLCanvasElement)) {
        console.error('AuraCitadelGame: Invalid canvas element provided.');
        throw new Error('Invalid canvas element provided for AuraCitadelGame.');
    }

    AuraGameSDK.init('aura-citadel', canvas);
    this.canvas = canvas;

    // Event Listeners
    this._handleCanvasMouseDown = this._handleCanvasMouseDown.bind(this);
    this._handleCanvasMouseMove = this._handleCanvasMouseMove.bind(this);
    this.canvas.addEventListener('mousedown', this._handleCanvasMouseDown);
    this.canvas.addEventListener('mousemove', this._handleCanvasMouseMove);

    this.gameRunning = false;
    this.animationFrameId = null;
    this.currentWave = 0;
    this.playerCurrency = 100;
    this.auraCoreHealth = 100;
    this.towers = [];
    this.enemies = [];
    this.projectiles = [];
    this.gameGrid = null;
    this.enemyPath = [];
    this.unlockedComponents = [];
    this.waveSpawningComplete = true;

    // Shop and Tower Placement UI / State
    this.shopUIDrawInfo = {
        x: 0,
        y: this.canvas.height - 100, // Assuming shop height is 100px
        width: this.canvas.width,
        height: 100,
        backgroundColor: AURA_COLORS.uiBackground,
        itemSize: 60, // Size of each shop item icon
        itemPadding: 10,
        textColor: AURA_COLORS.primaryText
    };
    this.shopItems = []; // To store objects representing clickable shop items
    this.selectedShopItem = null; // To store the component object selected from the shop
    this.isPlacingTower = false; // Boolean to indicate if player is currently placing a tower
    this.currentGhostGridCoords = { x: -1, y: -1 }; // For tower placement ghost

    // Define default ranges and fire rates if not specified in component
    const DEFAULT_WEAPON_RANGE = 3; // in grid units
    const DEFAULT_WEAPON_FIRERATE = 1; // shots per second

    this.masterComponentList = {
        'base_standard': { id: 'base_standard', name: 'Standard Base', type: 'base', cost: 20, health: 100 },
        'base_reinforced': { id: 'base_reinforced', name: 'Reinforced Base', type: 'base', cost: 35, health: 200 },
        'base_energy_siphon': { id: 'base_energy_siphon', name: 'Energy Siphon Base', type: 'base', cost: 50, health: 75, siphonRate: 0.5 },

        'weapon_blaster': { id: 'weapon_blaster', name: 'Blaster', type: 'weapon', cost: 30, damage: 10, range: DEFAULT_WEAPON_RANGE, fireRate: 1.5 },
        'weapon_pulser': { id: 'weapon_pulser', name: 'Pulser', type: 'weapon', cost: 45, damage: 5, range: DEFAULT_WEAPON_RANGE - 0.5, fireRate: 3, areaOfEffect: 1 },
        'weapon_slow_field': { id: 'weapon_slow_field', name: 'Slow Field Emitter', type: 'weapon', cost: 40, slowAmount: 0.3, range: DEFAULT_WEAPON_RANGE, fireRate: 0.5, isUtility: true }, // isUtility helps differentiate from damage towers
        'weapon_sniper': {id: 'weapon_sniper', name: 'Sniper Cannon', type: 'weapon', cost: 60, damage: 35, range: DEFAULT_WEAPON_RANGE + 4, fireRate: 0.5 },

        'mod_none': { id: 'mod_none', name: 'No Modifier', type: 'modifier', cost: 0 },
        'mod_range_increase': { id: 'mod_range_increase', name: 'Range Augment', type: 'modifier', cost: 25, range_boost: 1.5 }, // Boost in grid units
        'mod_damage_boost': { id: 'mod_damage_boost', name: 'Damage Amplifier', type: 'modifier', cost: 30, damage_multiplier: 1.25 },
        'mod_fire_rate_enhancer': { id: 'mod_fire_rate_enhancer', name: 'Rapid Reloader', type: 'modifier', cost: 35, fire_rate_multiplier: 1.25 }, // Multiplier for shots per second
    };

    this.gridTileSize = 32;
    this.gridWidth = Math.floor(this.canvas.width / this.gridTileSize);
    this.gridHeight = Math.floor(this.canvas.height / this.gridTileSize);

    console.log(`AuraCitadelGame: Initializing with grid ${this.gridWidth}x${this.gridHeight}`);
    this._setupInitialGameBoard();
    this._populateShopItems(); // Called after constructor setup
}

// --- Enemy Glitch Logic ---
AuraCitadelGame.prototype._createGlitch = function(type, health, speed, waveNumber) {
    if (!this.enemyPath || this.enemyPath.length === 0) {
        console.error("AuraCitadelGame: Enemy path not defined."); return null;
    }
    const startTile = this.enemyPath[0];
    const startX = (startTile.x + 0.5) * this.gridTileSize;
    const startY = (startTile.y + 0.5) * this.gridTileSize;

    return {
        id: generateUniqueId(), type, x: startX, y: startY, maxHealth: health, health, speed,
        pathIndex: 0, spriteColor: type === 'basic' ? AURA_COLORS.enemyDefault : AURA_COLORS.enemyStrong,
        radius: this.gridTileSize / 3.5, wave: waveNumber,
    };
};

// --- Projectile Logic ---
AuraCitadelGame.prototype._createProjectile = function(startX, startY, targetEnemy, damage, speed, type = 'bullet') {
    return {
        id: generateUniqueId(), x: startX, y: startY, targetEnemy, damage, speed,
        type, spriteColor: AURA_COLORS.projectileDefault, radius: 5,
    };
};

// --- Game Lifecycle & Control ---
AuraCitadelGame.prototype.start = async function() {
    console.log("Aura Citadel: Starting game...");
    this.gameRunning = true;
    this.currentWave = 0;
    this.playerCurrency = 100;
    this.auraCoreHealth = 100;
    this.towers = []; this.enemies = []; this.projectiles = [];
    this.waveSpawningComplete = true;
    this.gameState = "build_phase";
    this._setupInitialGameBoard();

    try {
        this.unlockedComponents = await AuraGameSDK.progression.getUnlockedComponents();
    } catch (error) { this.unlockedComponents = ['base_standard', 'weapon_blaster', 'mod_none']; }

    try {
        AuraGameSDK.audio.playLoopMusic('music/tracks/game_start_or_calm_phase.mp3', 0.5);
    } catch (error) {
        console.warn('AuraCitadel: Could not play background music:', error);
    }

    if (this.animationFrameId) cancelAnimationFrame(this.animationFrameId);
    this._gameLoop();
    this._populateShopItems(); // Called after start
};

AuraCitadelGame.prototype.stop = function() { /* ... same as before ... */
    console.log("Aura Citadel: Stopping game...");
    this.gameRunning = false;
    if (this.animationFrameId) {
        cancelAnimationFrame(this.animationFrameId);
        this.animationFrameId = null;
    }
    AuraGameSDK.audio.stop(); // Stop any looping music

    // Remove event listeners
    this.canvas.removeEventListener('mousedown', this._handleCanvasMouseDown);
    this.canvas.removeEventListener('mousemove', this._handleCanvasMouseMove);

    console.log("Aura Citadel: Game stopped.");
};
AuraCitadelGame.prototype.isRunning = function() { return this.gameRunning; };
AuraCitadelGame.prototype.continueGame = async function() { /* ... same as before, ensure _reconstructGameState initializes tower properties like lastFireTime ... */
    console.log("Aura Citadel: Attempting to continue game...");
    try {
        await AuraGameSDK._ensureReady();
        const loadedState = await AuraGameSDK.storage.loadState();

        if (loadedState) {
            this.currentWave = loadedState.currentWave || 0;
            this.playerCurrency = loadedState.playerCurrency || 100;
            this.auraCoreHealth = loadedState.auraCoreHealth || 100;
            // Ensure towers from save get their non-serialized properties initialized
            this.towers = loadedState.towers.map(t => ({...t, lastFireTime: 0, targetEnemyId: null })) || [];
            this.waveSpawningComplete = true;

            console.log("Aura Citadel: Game state restored.", loadedState);

            try {
                this.unlockedComponents = await AuraGameSDK.progression.getUnlockedComponents();
            } catch (error) { this.unlockedComponents = ['base_standard', 'weapon_blaster', 'mod_none']; }

            this.gameRunning = true;
            this._setupInitialGameBoard();
            this._reconstructGameState();

            if (this.animationFrameId) cancelAnimationFrame(this.animationFrameId);
            this._gameLoop();
            AuraGameSDK.audio.playLoopMusic('music/game_resume_or_calm_phase.mp3', 0.5);
            console.log("Aura Citadel: Resuming from wave " + this.currentWave);
            this._populateShopItems(); // Called after state restoration in continueGame

        } else {
            console.log("Aura Citadel: No saved state found, starting new game.");
            await this.start(); // _populateShopItems will be called by start()
        }
    } catch (error) {
        console.error("Aura Citadel: Error during continueGame:", error);
        await this.start(); // _populateShopItems will be called by start()
    }
};

AuraCitadelGame.prototype._handleCanvasMouseMove = function(event) {
    if (this.isPlacingTower && this.selectedShopItem) {
        const rect = this.canvas.getBoundingClientRect();
        const mouseX = event.clientX - rect.left;
        const mouseY = event.clientY - rect.top;

        const gridX = Math.floor(mouseX / this.gridTileSize);
        const gridY = Math.floor(mouseY / this.gridTileSize);

        this.currentGhostGridCoords = { x: gridX, y: gridY };
    }
};

// --- Game Setup & State Management ---
AuraCitadelGame.prototype._setupInitialGameBoard = function() { /* ... same as before ... */
    this.gridWidth = Math.floor(this.canvas.width / this.gridTileSize);
    this.gridHeight = Math.floor(this.canvas.height / this.gridTileSize);
    this.gameGrid = Array(this.gridHeight).fill(null).map(() => Array(this.gridWidth).fill(null).map(() => ({ buildable: true, hasTower: false })));

    const pathY = Math.floor(this.gridHeight / 2);
    this.enemyPath = Array(this.gridWidth).fill(null).map((_, i) => ({ x: i, y: pathY }));

    this.enemyPath.forEach(p => { if(this.gameGrid[p.y] && this.gameGrid[p.y][p.x]) this.gameGrid[p.y][p.x].buildable = false; });

    const ctx = this.canvas.getContext('2d');
    if (ctx) ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
};
AuraCitadelGame.prototype._saveGameState = async function() { /* ... same as before ... */
    console.log(`Aura Citadel: Saving game state at wave ${this.currentWave}.`);
    const gameState = {
        currentWave: this.currentWave,
        playerCurrency: this.playerCurrency,
        auraCoreHealth: this.auraCoreHealth,
        towers: this.towers.map(t => ({ baseId: t.baseId, weaponId: t.weaponId, modifierId: t.modifierId, x: t.x, y: t.y, uniqueId: t.uniqueId }))
    };
    try {
        await AuraGameSDK.storage.saveState(gameState);
        console.log("Aura Citadel: Game state saved successfully.", gameState);
    } catch (error) {
        console.error("Aura Citadel: Error saving game state:", error);
    }
};
AuraCitadelGame.prototype._reconstructGameState = function() { /* ... ensure lastFireTime is set for towers ... */
    console.log("Aura Citadel: Reconstructing game state...");
    if (!this.gameGrid) this._setupInitialGameBoard();
    this.towers.forEach(tower => {
        tower.lastFireTime = 0; // Initialize for loaded towers
        tower.targetEnemyId = null; // Clear any stale target
        if (this.gameGrid[tower.y] && this.gameGrid[tower.y][tower.x]) {
            this.gameGrid[tower.y][tower.x].hasTower = true;
            this.gameGrid[tower.y][tower.x].buildable = false;
        }
    });
};
AuraCitadelGame.prototype._gameOver = async function() { /* ... same as before ... */
    console.log("Aura Citadel: Game Over!");
    this.gameRunning = false;
    if (this.animationFrameId) {
        cancelAnimationFrame(this.animationFrameId);
        this.animationFrameId = null;
    }
    AuraGameSDK.audio.stop();
    AuraGameSDK.ui.showNotification({ message: `Game Over! You survived ${this.currentWave > 0 ? this.currentWave -1 : 0} waves.`, type: 'error' });

    const finalScore = (this.currentWave > 0 ? (this.currentWave -1) * 100 : 0) + Math.floor(this.playerCurrency * 0.5);
    console.log(`Aura Citadel: Final score: ${finalScore}`);
    try {
        await AuraGameSDK.leaderboard.submitScore('AuraUser', finalScore);
        console.log("Aura Citadel: Score submitted successfully.");
    } catch (error) {
        console.error("Aura Citadel: Error submitting score:", error);
    }
};

// --- Wave & Enemy Management ---
AuraCitadelGame.prototype._initializeWave = function(waveNumber) { /* ... play music ... */
    console.log(`Aura Citadel: Initializing wave ${waveNumber}...`);    AuraGameSDK.ui.showNotification({ message: `Wave ${waveNumber} starting!`, type: 'info' });
    try {
        AuraGameSDK.audio.playLoopMusic('music/tracks/wave_battle.mp3', 0.6);
    } catch (error) {
        console.warn('AuraCitadel: Could not play wave battle music:', error);
    }

    this.currentWave = waveNumber;
    this.enemies = [];
    this.waveSpawningComplete = false;

    const numEnemies = 5 + waveNumber * 2;
    const enemyHealth = 20 + waveNumber * 5;
    const enemySpeed = 1 + waveNumber * 0.05; // Adjusted speed scaling

    for (let i = 0; i < numEnemies; i++) {
        const newGlitch = this._createGlitch('basic', enemyHealth, enemySpeed, waveNumber);
        if (newGlitch) this.enemies.push(newGlitch);
    }
    this.waveSpawningComplete = true;
    console.log(`Aura Citadel: Spawned ${this.enemies.length} glitches for wave ${waveNumber}.`);
};
AuraCitadelGame.prototype._updateEnemies = function() { /* ... same as before ... */
    if (!this.enemyPath || this.enemyPath.length === 0) return;
    for (let i = this.enemies.length - 1; i >= 0; i--) {
        const enemy = this.enemies[i];
        if (enemy.pathIndex >= this.enemyPath.length) { this.enemies.splice(i, 1); continue; }

        const targetTile = this.enemyPath[enemy.pathIndex];
        const targetX = (targetTile.x + 0.5) * this.gridTileSize;
        const targetY = (targetTile.y + 0.5) * this.gridTileSize;
        const dx = targetX - enemy.x, dy = targetY - enemy.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < enemy.speed) {
            enemy.pathIndex++;
            if (enemy.pathIndex >= this.enemyPath.length) {
                this.auraCoreHealth -= 10;
                AuraGameSDK.ui.showNotification({ message: 'Aura Core is under attack!', type: 'warning' });
                this.enemies.splice(i, 1);
                if (this.auraCoreHealth <= 0) { this._gameOver(); return; }
                continue;
            }
        } else { enemy.x += (dx / distance) * enemy.speed; enemy.y += (dy / distance) * enemy.speed; }
    }
};

// --- Tower Actions ---
AuraCitadelGame.prototype._updateTowers = function() {
    const now = Date.now();
    this.towers.forEach(tower => {
        const weaponComp = this.masterComponentList[tower.weaponId];
        const modifierComp = this.masterComponentList[tower.modifierId];
        if (!weaponComp || weaponComp.isUtility) return; // Skip non-attacking or utility towers for now

        let range = (weaponComp.range || 3) * this.gridTileSize; // Convert grid units to pixels
        let fireRate = weaponComp.fireRate || 1; // Shots per second
        let damage = weaponComp.damage || 1;

        if (modifierComp) {
            if (modifierComp.range_boost) range += modifierComp.range_boost * this.gridTileSize;
            if (modifierComp.fire_rate_multiplier) fireRate *= modifierComp.fire_rate_multiplier;
            if (modifierComp.damage_multiplier) damage *= modifierComp.damage_multiplier;
        }

        const fireCooldown = 1000 / fireRate; // Milliseconds

        if (now - (tower.lastFireTime || 0) < fireCooldown) return; // Still on cooldown

        let target = null;
        let minDistance = range + 1; // Start with distance just outside range

        // Basic targeting: find first enemy in range (can be improved to nearest, weakest etc.)
        for (const enemy of this.enemies) {
            const dx = enemy.x - ((tower.x + 0.5) * this.gridTileSize);
            const dy = enemy.y - ((tower.y + 0.5) * this.gridTileSize);
            const distance = Math.sqrt(dx * dx + dy * dy);
            if (distance <= range && distance < minDistance) {
                target = enemy;
                minDistance = distance;
            }
        }

        if (target) {
            this.projectiles.push(this._createProjectile(
                (tower.x + 0.5) * this.gridTileSize,
                (tower.y + 0.5) * this.gridTileSize,
                target, damage, 5 /* projectile speed */
            ));
            tower.lastFireTime = now;
            tower.targetEnemyId = target.id; // For visualization or advanced logic            // Placeholder firing sound
            try {
                const fireSound = new Audio('gameassets/sounds/tower_fire.wav');
                fireSound.volume = AuraGameSDK.audio.getVolume ? AuraGameSDK.audio.getVolume() : 0.5;
                fireSound.play().catch(e => console.warn("Audio play failed:", e));
            } catch (error) {
                console.warn('AuraCitadel: Could not load fire sound:', error);
            }
        } else {
            tower.targetEnemyId = null;
        }
    });
};

AuraCitadelGame.prototype._updateProjectiles = function() {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
        const proj = this.projectiles[i];
        const target = proj.targetEnemy;

        if (!target || target.health <= 0 || !this.enemies.find(e => e.id === target.id)) {
            this.projectiles.splice(i, 1); // Target gone or dead
            continue;
        }

        const dx = target.x - proj.x;
        const dy = target.y - proj.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < proj.speed || distance < target.radius) { // Hit
            target.health -= proj.damage;
            this.projectiles.splice(i, 1);

            if (target.health <= 0) {
                const enemyIndex = this.enemies.findIndex(e => e.id === target.id);
                if (enemyIndex !== -1) this.enemies.splice(enemyIndex, 1);                this.playerCurrency += 5; // Currency for kill
                
                try {
                    const deathSound = new Audio('gameassets/sounds/enemy_death.wav');
                    deathSound.volume = AuraGameSDK.audio.getVolume ? AuraGameSDK.audio.getVolume() : 0.3;
                    deathSound.play().catch(e => console.warn("Audio play failed:", e));
                } catch (error) {
                    console.warn('AuraCitadel: Could not load death sound:', error);
                }

                if (Math.random() < 0.1) { // 10% chance to drop blueprint
                    this._unlockRandomComponent();
                }
            }
            continue;
        }
        proj.x += (dx / distance) * proj.speed;
        proj.y += (dy / distance) * proj.speed;
    }
};

// --- Blueprint Unlocking ---
AuraCitadelGame.prototype._unlockRandomComponent = async function() {
    const allComponentIds = Object.keys(this.masterComponentList);
    const currentlyUnlocked = new Set(this.unlockedComponents);
    const lockedComponents = allComponentIds.filter(id => !currentlyUnlocked.has(id) && this.masterComponentList[id].type !== 'modifier'); // Exclude modifiers or specific items if needed

    if (lockedComponents.length === 0) {
        console.log("Aura Citadel: All components already unlocked!");
        AuraGameSDK.ui.showNotification({ message: 'All blueprints already discovered!', type: 'info' });
        return;
    }

    const randomIndex = Math.floor(Math.random() * lockedComponents.length);
    const chosenComponentId = lockedComponents[randomIndex];
    const component = this.masterComponentList[chosenComponentId];

    try {
        await AuraGameSDK.progression.unlockComponent(chosenComponentId);
        // Refresh local list
        this.unlockedComponents = await AuraGameSDK.progression.getUnlockedComponents();
        AuraGameSDK.ui.showNotification({ message: `Blueprint Unlocked: ${component.name}!`, type: 'success' });        try {
            const blueprintSound = new Audio('gameassets/sounds/blueprint_unlocked.wav');
            blueprintSound.volume = AuraGameSDK.audio.getVolume ? AuraGameSDK.audio.getVolume() : 0.7;
            blueprintSound.play().catch(e => console.warn("Audio play failed:", e));
        } catch (error) {
            console.warn('AuraCitadel: Could not load blueprint sound:', error);
        }

    } catch (error) {
        console.error(`Aura Citadel: Error unlocking component ${chosenComponentId}:`, error);
        AuraGameSDK.ui.showNotification({ message: `Error unlocking ${component.name}.`, type: 'error' });
    }
};


// --- Crafting & Towers ---
AuraCitadelGame.prototype._handlePlayerCrafting = function(baseId, weaponId, modifierId, gridX, gridY) { /* ... Add sound ... */
    if (gridY < 0 || gridY >= this.gridHeight || gridX < 0 || gridX >= this.gridWidth) {
         console.warn(`Aura Citadel: Attempted to build tower outside grid bounds at (${gridX},${gridY}).`);
         return false;
    }
    if (!this.gameGrid[gridY][gridX].buildable || this.gameGrid[gridY][gridX].hasTower) {
        console.warn(`Aura Citadel: Cannot place tower at (${gridX},${gridY}). Tile not buildable or occupied.`);
        return false;
    }

    const baseC = this.masterComponentList[baseId], weaponC = this.masterComponentList[weaponId], modC = this.masterComponentList[modifierId];
    if (!baseC || !weaponC || !modC) { console.error("Aura Citadel: Invalid component ID for crafting."); return false; }

    const totalCost = (baseC.cost||0) + (weaponC.cost||0) + (modC.cost||0);
    if (this.playerCurrency >= totalCost) {
        this.playerCurrency -= totalCost;
        const newTower = { baseId, weaponId, modifierId, x: gridX, y: gridY, uniqueId: generateUniqueId(), lastFireTime: 0, targetEnemyId: null };
        this.towers.push(newTower);
        this.gameGrid[gridY][gridX].hasTower = true;
        this.gameGrid[gridY][gridX].buildable = false;        try {
            const placeSound = new Audio('gameassets/sounds/tower_place.wav');
            placeSound.volume = AuraGameSDK.audio.getVolume ? AuraGameSDK.audio.getVolume() : 0.5;
            placeSound.play().catch(e => console.warn("Audio play failed:", e));
        } catch (error) {
            console.warn('AuraCitadel: Could not load place sound:', error);
        }
        console.log(`Aura Citadel: Crafted tower ${newTower.uniqueId} at (${gridX},${gridY}). Cost: ${totalCost}.`);
        return true;
    } else {
        console.log(`Aura Citadel: Not enough currency. Needed: ${totalCost}, Have: ${this.playerCurrency}`);
        return false;
    }
};

// --- Main Game Loop ---
AuraCitadelGame.prototype._gameLoop = function() { /* ... same ... */
    if (!this.gameRunning) {
        if (this.animationFrameId) cancelAnimationFrame(this.animationFrameId);
        this.animationFrameId = null;
        return;
    }
    this._update();
    this._draw();
    this.animationFrameId = requestAnimationFrame(this._gameLoop.bind(this));
};

AuraCitadelGame.prototype._update = function() {
    if (!this.gameRunning) return;

    if (this.gameState === "combat_phase") {
        this._updateEnemies();
        this._updateTowers();
        this._updateProjectiles();
    }

    if (this.gameState === "combat_phase" && this.waveSpawningComplete && this.enemies.length === 0 && this.auraCoreHealth > 0 && this.gameRunning) {
        console.log(`Aura Citadel: Wave ${this.currentWave} cleared!`);
        this.playerCurrency += (100 + this.currentWave * 10); // this.currentWave here is correct as it's the wave just cleared
        AuraGameSDK.ui.showNotification({ message: `Wave ${this.currentWave} cleared! Currency +${100 + this.currentWave * 10}`, type: 'success' });

        this._saveGameState(); // Save progress

        this.gameState = "build_phase"; // Transition to build phase
        this.waveSpawningComplete = false; // Reset for the next wave's spawning process

        try {
            AuraGameSDK.audio.playLoopMusic('music/tracks/build_phase.mp3', 0.4);
        } catch (error) {
            console.warn('AuraCitadel: Could not play build phase music:', error);
        }
        console.log("Aura Citadel: Entering Build Phase. Click 'Start Wave' to begin wave " + (this.currentWave + 1));
        // No more setTimeout to automatically start the next wave.
    }
};

AuraCitadelGame.prototype._draw = function() {
    const ctx = this.canvas.getContext('2d');
    if (!ctx) { console.error("AuraCitadelGame: No canvas context."); this.stop(); return; }
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.fillStyle = '#1C1C1C'; // Aura background color
    ctx.fillRect(0,0, this.canvas.width, this.canvas.height);


    // Grid
    ctx.strokeStyle = AURA_COLORS.gridLines; ctx.lineWidth = 1;
    for (let y = 0; y < this.gridHeight; y++) {
        for (let x = 0; x < this.gridWidth; x++) {
            ctx.strokeRect(x * this.gridTileSize, y * this.gridTileSize, this.gridTileSize, this.gridTileSize);
        }
    }
    // Path
    ctx.strokeStyle = AURA_COLORS.pathColor; ctx.lineWidth = this.gridTileSize; // Draw path wider for visual clarity
    ctx.lineCap = "round"; ctx.lineJoin = "round";
    if (this.enemyPath.length > 0) {
        ctx.beginPath();
        ctx.moveTo((this.enemyPath[0].x + 0.5) * this.gridTileSize, (this.enemyPath[0].y + 0.5) * this.gridTileSize);
        for(let i = 1; i < this.enemyPath.length; i++) {
             ctx.lineTo((this.enemyPath[i].x + 0.5) * this.gridTileSize, (this.enemyPath[i].y + 0.5) * this.gridTileSize);
        }
        ctx.stroke();
    }
    // Reset line cap/join for other drawings
    ctx.lineCap = "butt"; ctx.lineJoin = "miter"; ctx.lineWidth = 1;


    // Towers
    this.towers.forEach(tower => {
        const baseC = this.masterComponentList[tower.baseId], weaponC = this.masterComponentList[tower.weaponId];
        ctx.fillStyle = AURA_COLORS.towerBase; // Base color
        if (baseC && baseC.id === 'base_energy_siphon') ctx.fillStyle = AURA_COLORS.highlightSecondary; // Special base color
        ctx.fillRect(tower.x * this.gridTileSize + 4, tower.y * this.gridTileSize + 4, this.gridTileSize - 8, this.gridTileSize - 8);

        if (weaponC) {
            ctx.fillStyle = AURA_COLORS.towerWeapon; // Weapon color
            if (weaponC.id === 'weapon_slow_field') ctx.fillStyle = AURA_COLORS.highlightPrimary;
            ctx.beginPath();
            ctx.arc((tower.x + 0.5) * this.gridTileSize, (tower.y + 0.5) * this.gridTileSize, this.gridTileSize / 4, 0, Math.PI * 2);
            ctx.fill();
        }
         // Visualize tower target line if it has one
        if (tower.targetEnemyId && this.gameRunning) {
            const target = this.enemies.find(e => e.id === tower.targetEnemyId);
            if (target) {
                ctx.beginPath();
                ctx.moveTo((tower.x + 0.5) * this.gridTileSize, (tower.y + 0.5) * this.gridTileSize);
                ctx.lineTo(target.x, target.y);
                ctx.strokeStyle = 'rgba(255, 0, 0, 0.3)'; // Faint red line
                ctx.lineWidth = 1;
                ctx.stroke();
            }
        }
    });

    // Draw Tower Ghost (if placing)
    this._drawTowerGhost(ctx);

    // Projectiles
    this.projectiles.forEach(proj => {
        ctx.fillStyle = proj.spriteColor;
        ctx.beginPath();
        ctx.arc(proj.x, proj.y, proj.radius, 0, Math.PI * 2);
        ctx.fill();
    });

    // Enemies
    this.enemies.forEach(enemy => { /* ... same health bar logic ... */
        ctx.fillStyle = enemy.spriteColor;
        ctx.beginPath();
        ctx.arc(enemy.x, enemy.y, enemy.radius, 0, Math.PI * 2);
        ctx.fill();
        if (enemy.health < enemy.maxHealth) {
            const barWidth = enemy.radius * 1.5; const barHeight = 4;
            const barX = enemy.x - barWidth / 2; const barY = enemy.y - enemy.radius - barHeight - 3;
            ctx.fillStyle = '#333'; ctx.fillRect(barX, barY, barWidth, barHeight);
            ctx.fillStyle = AURA_COLORS.enemyDefault; ctx.fillRect(barX, barY, barWidth * (enemy.health / enemy.maxHealth), barHeight);
        }
    });

    // UI
    ctx.fillStyle = AURA_COLORS.primaryText; ctx.font = '16px "Segoe UI", Arial, sans-serif'; // Aura-like font stack
    ctx.fillText(`Wave: ${this.currentWave}`, 10, 25);
    ctx.fillText(`Currency: ${this.playerCurrency}`, 10, 50);
    ctx.fillText(`Core Health: ${this.auraCoreHealth}`, 10, 75);

    // Draw Shop UI
    this._drawShopUI(ctx);

    // Draw Start Wave Button if in build phase
    if (this.gameState === "build_phase") {
        this._drawStartWaveButton(ctx);
    }

    if (!this.gameRunning && this.auraCoreHealth <= 0) {
        ctx.fillStyle = AURA_COLORS.enemyDefault;
        ctx.font = 'bold 48px "Segoe UI", Arial, sans-serif';
        ctx.textAlign = "center";
        ctx.fillText("GAME OVER", this.canvas.width / 2, this.canvas.height / 2);
        ctx.textAlign = "left"; // Reset
    }
};

// Global Accessibility
window.AuraCitadelGame = AuraCitadelGame;
console.log('AuraCitadel.js loaded and AuraCitadelGame is now globally accessible.');

// --- UI Drawing Methods ---
AuraCitadelGame.prototype._drawShopUI = function(ctx) {
    const sUI = this.shopUIDrawInfo;

    // Draw Shop Panel Background
    ctx.fillStyle = sUI.backgroundColor;
    ctx.fillRect(sUI.x, sUI.y, sUI.width, sUI.height);

    // Draw Shop Items
    ctx.font = '12px "Segoe UI", Arial, sans-serif'; // Smaller font for item details
    this.shopItems.forEach(item => {
        // Determine item color by component type
        switch (item.component.type) {
            case 'base':
                ctx.fillStyle = AURA_COLORS.towerBase;
                break;
            case 'weapon':
                ctx.fillStyle = AURA_COLORS.towerWeapon;
                break;
            case 'modifier':
                ctx.fillStyle = AURA_COLORS.highlightPrimary;
                break;
            default:
                ctx.fillStyle = AURA_COLORS.gridLines; // Default color if type is unknown
        }
        ctx.fillRect(item.x, item.y, item.width, item.height);

        // Draw item name and cost
        ctx.fillStyle = sUI.textColor;
        ctx.textAlign = "center";
        // Adjust text position to be below the item box
        const textY = item.y + item.height + sUI.itemPadding + 5; // +5 for a bit of space from item bottom

        ctx.fillText(item.component.name, item.x + item.width / 2, textY);
        ctx.fillText(`Cost: ${item.component.cost}`, item.x + item.width / 2, textY + 14); // 14px for next line

        ctx.textAlign = "left"; // Reset alignment
    });
};

AuraCitadelGame.prototype._drawTowerGhost = function(ctx) {
    if (this.isPlacingTower && this.selectedShopItem && this.currentGhostGridCoords.x !== -1) {
        const gridX = this.currentGhostGridCoords.x;
        const gridY = this.currentGhostGridCoords.y;

        // Boundary Check
        if (gridX < 0 || gridX >= this.gridWidth || gridY < 0 || gridY >= this.gridHeight) {
            // Optionally, you could draw the ghost red at the edge of the screen or clamped to grid,
            // but for now, just don't draw if mouse is way off-grid.
            // If you want to show it even if slightly off-grid, adjust this check or how gridX/Y are clamped.
            return;
        }

        // Ensure grid cell exists (it should if boundary check passed, but good for safety)
        if (!this.gameGrid[gridY] || !this.gameGrid[gridY][gridX]) {
            return;
        }
        const cell = this.gameGrid[gridY][gridX];
        const isBuildable = cell.buildable && !cell.hasTower;

        // Draw Ghost Base
        ctx.globalAlpha = 0.5; // Transparency for the base
        ctx.fillStyle = isBuildable ? 'green' : 'red';
        ctx.fillRect(
            gridX * this.gridTileSize,
            gridY * this.gridTileSize,
            this.gridTileSize,
            this.gridTileSize
        );
        // No need to reset globalAlpha here if the icon also uses it or if it's reset after both.

        // Draw Ghost "Icon" (representing selected item)
        let itemColor = AURA_COLORS.towerBase; // Default for 'base' type
        if (this.selectedShopItem.type === 'weapon') {
            itemColor = AURA_COLORS.towerWeapon;
        } else if (this.selectedShopItem.type === 'modifier') {
            itemColor = AURA_COLORS.highlightPrimary;
        }
        // If selectedShopItem.type is 'base', itemColor remains AURA_COLORS.towerBase.

        ctx.globalAlpha = 0.7; // Different alpha for the icon, or could be same as base.
        const iconSize = this.gridTileSize / 2;
        ctx.fillStyle = itemColor;
        ctx.fillRect(
            gridX * this.gridTileSize + (this.gridTileSize - iconSize) / 2,
            gridY * this.gridTileSize + (this.gridTileSize - iconSize) / 2,
            iconSize,
            iconSize
        );
        ctx.globalAlpha = 1.0; // Reset global alpha after all ghost drawing
    }
};

AuraCitadelGame.prototype._drawStartWaveButton = function(ctx) {
    const buttonWidth = 150;
    const buttonHeight = 50;
    const buttonX = (this.canvas.width - buttonWidth) / 2;
    const buttonY = this.shopUIDrawInfo.y - buttonHeight - 20; // Above shop UI

    this.startWaveButtonRect = { x: buttonX, y: buttonY, width: buttonWidth, height: buttonHeight };

    // Draw Button Background
    ctx.fillStyle = AURA_COLORS.highlightPrimary;
    ctx.fillRect(buttonX, buttonY, buttonWidth, buttonHeight);

    // Draw Button Text
    ctx.fillStyle = AURA_COLORS.primaryText;
    ctx.font = 'bold 20px "Segoe UI", Arial, sans-serif';
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("Start Wave", buttonX + buttonWidth / 2, buttonY + buttonHeight / 2);

    // Reset text alignment and baseline
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
};

// --- Event Handlers ---
AuraCitadelGame.prototype._handleCanvasMouseDown = function(event) {
    const rect = this.canvas.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;

    // Check for Start Wave button click
    if (this.gameState === "build_phase" && this.startWaveButtonRect) {
        const btn = this.startWaveButtonRect;
        if (mouseX >= btn.x && mouseX <= btn.x + btn.width &&
            mouseY >= btn.y && mouseY <= btn.y + btn.height) {

            console.log("Aura Citadel: Start Wave button clicked.");
            this.gameState = "combat_phase";

            // currentWave should represent the wave that was just COMPLETED,
            // or 0 if no waves have been completed yet.
            // So, the wave to start is always currentWave + 1.
            this._initializeWave(this.currentWave + 1);

            this.selectedShopItem = null;
            this.isPlacingTower = false;
            this.currentGhostGridCoords = { x: -1, y: -1 };
            return; // Exit after handling button click
        }
    }

    // Shop Interaction Logic
    if (mouseY >= this.shopUIDrawInfo.y) { // Click is within the shop panel's Y range
        for (const item of this.shopItems) {
            if (mouseX >= item.x && mouseX <= item.x + item.width &&
                mouseY >= item.y && mouseY <= item.y + item.height) {

                // Clicked on a shop item
                if (this.playerCurrency >= item.component.cost) {
                    this.selectedShopItem = item.component;
                    this.isPlacingTower = true;
                    console.log("AuraCitadel: Selected item:", this.selectedShopItem.name);
                    AuraGameSDK.ui.showNotification({ message: `Selected: ${this.selectedShopItem.name}. Click on grid to place.`, type: 'info' });
                } else {
                    console.log("AuraCitadel: Not enough currency for:", item.component.name);
                    AuraGameSDK.ui.showNotification({ message: `Not enough currency for ${item.component.name}`, type: 'warning' });
                    this.selectedShopItem = null;
                    this.isPlacingTower = false;
                }
                return; // Processed shop click
            }
        }

        // If click was in shop area but not on an item, and currently placing a tower, cancel placement.
        if (this.isPlacingTower) {
            console.log("AuraCitadel: Placement cancelled by clicking shop area.");
            AuraGameSDK.ui.showNotification({ message: 'Placement cancelled.', type: 'info' });
            this.selectedShopItem = null;
            this.isPlacingTower = false;
            this.currentGhostGridCoords = { x: -1, y: -1 }; // Reset ghost coords
            return;
        }
        // If click in shop area and not placing, do nothing further (e.g. don't try to place tower in shop)
        return;
    }

    // Tower Placement Logic (if not handled by shop interaction above)
    if (this.isPlacingTower && this.selectedShopItem) {
        const gridX = Math.floor(mouseX / this.gridTileSize);
        const gridY = Math.floor(mouseY / this.gridTileSize);

        // Validate grid coordinates and buildability
        if (gridX >= 0 && gridX < this.gridWidth && gridY >= 0 && gridY < this.gridHeight &&
            this.gameGrid[gridY][gridX].buildable && !this.gameGrid[gridY][gridX].hasTower) {

            // For now, selectedShopItem is assumed to be a 'base'.
            // Hardcoding 'weapon_blaster' and 'mod_none' as per subtask instructions.
            // This will need to be updated when full tower configuration is implemented.
            let baseId = null, weaponId = 'weapon_blaster', modId = 'mod_none';

            if (this.selectedShopItem.type === 'base') {
                baseId = this.selectedShopItem.id;
            } else {
                // This case should ideally not happen with current shop logic if only bases are purchasable
                // Or, if other types are purchasable, this logic needs to be smarter.
                // For now, let's assume the selected item IS the base.
                console.warn("AuraCitadel: Selected shop item is not of type 'base'. Attempting to use it as base ID:", this.selectedShopItem.name);
                baseId = this.selectedShopItem.id;
            }

            // Ensure a base component is selected before attempting to craft
            if (!this.masterComponentList[baseId] || this.masterComponentList[baseId].type !== 'base') {
                 console.error("AuraCitadel: Invalid or non-base component selected for tower placement:", baseId);
                 AuraGameSDK.ui.showNotification({ message: `Invalid selection for base. Please select a Base component.`, type: 'error' });
                 this.selectedShopItem = null;
                 this.isPlacingTower = false;
                 this.currentGhostGridCoords = { x: -1, y: -1 };
                 return;
            }


            if (this._handlePlayerCrafting(baseId, weaponId, modId, gridX, gridY)) {
                console.log("AuraCitadel: Tower placed at:", gridX, gridY);
                AuraGameSDK.ui.showNotification({ message: `${this.selectedShopItem.name} placed!`, type: 'success' });
            } else {
                // _handlePlayerCrafting should manage its own notifications for specific failure reasons like cost
                 AuraGameSDK.ui.showNotification({ message: `Failed to place ${this.selectedShopItem.name}.`, type: 'error' });
            }
            // Reset placement mode whether successful or not
            this.selectedShopItem = null;
            this.isPlacingTower = false;
            this.currentGhostGridCoords = { x: -1, y: -1 };
        } else {
            console.log("AuraCitadel: Cannot place tower at:", gridX, gridY, "Valid placement area or buildable check failed.");
            AuraGameSDK.ui.showNotification({ message: 'Cannot build here! Invalid location or occupied.', type: 'warning' });
            // Keep isPlacingTower = true to allow user to try another spot
        }
    }
};

AuraCitadelGame.prototype._populateShopItems = function() {
    this.shopItems = [];
    const sUI = this.shopUIDrawInfo;
    let currentX = sUI.x + sUI.itemPadding;
    const itemY = sUI.y + sUI.itemPadding;

    for (const componentId in this.masterComponentList) {
        if (this.unlockedComponents.includes(componentId)) {
            const component = this.masterComponentList[componentId];

            // Basic sequential positioning for now
            // This will need refinement if there are too many items to fit
            if (currentX + sUI.itemSize + sUI.itemPadding > sUI.x + sUI.width) {
                // Simple overflow handling: log and skip.
                // A more robust solution might involve multiple rows or scrolling.
                console.warn("AuraCitadel: Too many shop items to display in a single row. Some items might be hidden.");
                continue;
            }

            this.shopItems.push({
                component: component,
                x: currentX,
                y: itemY,
                width: sUI.itemSize,
                height: sUI.itemSize
            });
            currentX += sUI.itemSize + sUI.itemPadding;
        }
    }
};
