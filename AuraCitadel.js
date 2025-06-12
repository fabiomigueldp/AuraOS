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
    this._setupInitialGameBoard();

    try {
        this.unlockedComponents = await AuraGameSDK.progression.getUnlockedComponents();
    } catch (error) { this.unlockedComponents = ['base_standard', 'weapon_blaster', 'mod_none']; }

    if (this.unlockedComponents.includes('base_standard') && this.unlockedComponents.includes('weapon_blaster')) {
        this._handlePlayerCrafting('base_standard', 'weapon_blaster', 'mod_none', 3, Math.floor(this.gridHeight / 2) - 2);
    }

    AuraGameSDK.audio.playLoopMusic('music/game_start_or_calm_phase.mp3', 0.5); // Placeholder path

    setTimeout(() => { if (this.gameRunning) this._initializeWave(1); }, 100);
    if (this.animationFrameId) cancelAnimationFrame(this.animationFrameId);
    this._gameLoop();
};

AuraCitadelGame.prototype.stop = function() { /* ... same as before ... */
    console.log("Aura Citadel: Stopping game...");
    this.gameRunning = false;
    if (this.animationFrameId) {
        cancelAnimationFrame(this.animationFrameId);
        this.animationFrameId = null;
    }
    AuraGameSDK.audio.stop(); // Stop any looping music
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

        } else {
            console.log("Aura Citadel: No saved state found, starting new game.");
            await this.start();
        }
    } catch (error) {
        console.error("Aura Citadel: Error during continueGame:", error);
        await this.start();
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
    console.log(`Aura Citadel: Initializing wave ${waveNumber}...`);
    AuraGameSDK.ui.showNotification({ message: `Wave ${waveNumber} starting!`, type: 'info' });
    AuraGameSDK.audio.playLoopMusic('music/wave_battle.mp3', 0.6); // Placeholder path

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
            tower.targetEnemyId = target.id; // For visualization or advanced logic

            // Placeholder firing sound
            const fireSound = new Audio('sounds/tower_fire.wav'); // Placeholder
            fireSound.volume = AuraGameSDK.audio.getVolume ? AuraGameSDK.audio.getVolume() : 0.5;
            fireSound.play().catch(e => console.warn("Audio play failed:", e));
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
                if (enemyIndex !== -1) this.enemies.splice(enemyIndex, 1);
                this.playerCurrency += 5; // Currency for kill

                const deathSound = new Audio('sounds/enemy_death.wav'); // Placeholder
                deathSound.volume = AuraGameSDK.audio.getVolume ? AuraGameSDK.audio.getVolume() : 0.3;
                deathSound.play().catch(e => console.warn("Audio play failed:", e));

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
        AuraGameSDK.ui.showNotification({ message: `Blueprint Unlocked: ${component.name}!`, type: 'success' });

        const blueprintSound = new Audio('sounds/blueprint_unlocked.wav'); // Placeholder
        blueprintSound.volume = AuraGameSDK.audio.getVolume ? AuraGameSDK.audio.getVolume() : 0.7;
        blueprintSound.play().catch(e => console.warn("Audio play failed:", e));

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
        this.gameGrid[gridY][gridX].buildable = false;

        const placeSound = new Audio('sounds/tower_place.wav'); // Placeholder
        placeSound.volume = AuraGameSDK.audio.getVolume ? AuraGameSDK.audio.getVolume() : 0.5;
        placeSound.play().catch(e => console.warn("Audio play failed:", e));
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

    this._updateEnemies();
    this._updateTowers();    // New
    this._updateProjectiles(); // New

    if (this.waveSpawningComplete && this.enemies.length === 0 && this.auraCoreHealth > 0 && this.gameRunning) {
        console.log(`Aura Citadel: Wave ${this.currentWave} cleared!`);
        this.playerCurrency += (100 + this.currentWave * 10);
        AuraGameSDK.ui.showNotification({ message: `Wave ${this.currentWave} cleared! Currency +${100 + this.currentWave * 10}`, type: 'success' });

        this._saveGameState();
        AuraGameSDK.audio.playLoopMusic('music/build_phase.mp3', 0.4); // Placeholder for build phase

        const nextWave = this.currentWave + 1;
        this.waveSpawningComplete = false;
        setTimeout(() => {
            if(this.gameRunning) this._initializeWave(nextWave);
        }, 5000); // 5 second delay for build phase
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
