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

    this.gameRunning = false;    this.animationFrameId = null;
    this.currentWave = 0;
    this.playerCurrency = 750;
    this.auraCoreHealth = 100;
    this.towers = [];
    this.enemies = [];
    this.projectiles = [];
    this.gameGrid = null;
    this.enemyPath = [];
    this.unlockedComponents = [];
    this.waveSpawningComplete = true;
    this.waveSpawnInstructions = []; // Added for spawn instructions    this.timeSinceLastSpawn = 0; // Added for spawn timing
    this.lastTimestamp = 0; // For deltaTime calculation

    // Shop and Tower Placement UI / State
    this.shopUIDrawInfo = {
        x: 0,
        y: this.canvas.height - 150, // Increased height for better component selection
        width: this.canvas.width,
        height: 150,
        backgroundColor: AURA_COLORS.uiBackground,
        itemSize: 50, // Reduced size to fit more items
        itemPadding: 8,
        textColor: AURA_COLORS.primaryText,
        tabHeight: 25
    };
    this.shopItems = []; // To store objects representing clickable shop items
    this.selectedComponents = {
        base: null,
        weapon: null,
        modifier: null
    }; // Store selected components for tower construction
    this.selectedShopItem = null; // Legacy compatibility
    this.isPlacingTower = false; // Boolean to indicate if player is currently placing a tower
    this.currentGhostGridCoords = { x: -1, y: -1 }; // For tower placement ghost
    this.currentShopTab = 'base'; // Current shop tab: 'base', 'weapon', 'modifier'

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
AuraCitadelGame.prototype._createProjectile = function(startX, startY, targetEnemy, damage, speed, towerId, type = 'bullet') {
    return {
        id: generateUniqueId(), x: startX, y: startY, targetEnemy, damage, speed, towerId,
        type, spriteColor: AURA_COLORS.projectileDefault, radius: 5,
    };
};

// --- Game Lifecycle & Control ---
AuraCitadelGame.prototype.start = async function() {
    console.log("Aura Citadel: Starting game...");
    this.gameRunning = true;    this.currentWave = 0;
    this.playerCurrency = 750;
    this.auraCoreHealth = 100;
    this.towers = []; this.enemies = []; this.projectiles = [];
    this.waveSpawningComplete = true;
    this.gameState = "build_phase";    this.lastTimestamp = 0; // Initialize for the first game loop
    this._setupInitialGameBoard();

    try {
        this.unlockedComponents = await AuraGameSDK.progression.getUnlockedComponents();
    } catch (error) { 
        this.unlockedComponents = [
            'base_standard', 'base_reinforced', 
            'weapon_blaster', 'weapon_pulser', 'weapon_slow_field', 'weapon_sniper',
            'mod_none', 'mod_range_increase', 'mod_damage_boost'
        ]; 
    }

    try {
        AuraGameSDK.audio.playLoopMusic('music/tracks/game_start_or_calm_phase.mp3', 0.5);
    } catch (error) {
        console.warn('AuraCitadel: Could not play background music:', error);
    }    if (this.animationFrameId) cancelAnimationFrame(this.animationFrameId);
    this._gameLoop();
    this._initializeDefaultComponents(); // Initialize default selections
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

            console.log("Aura Citadel: Game state restored.", loadedState);            try {
                this.unlockedComponents = await AuraGameSDK.progression.getUnlockedComponents();
            } catch (error) { 
                this.unlockedComponents = [
                    'base_standard', 'base_reinforced', 
                    'weapon_blaster', 'weapon_pulser', 'weapon_slow_field', 'weapon_sniper',
                    'mod_none', 'mod_range_increase', 'mod_damage_boost'
                ]; 
            }

            this.gameRunning = true;
            this._setupInitialGameBoard();
            this._reconstructGameState();            if (this.animationFrameId) cancelAnimationFrame(this.animationFrameId);
            this._gameLoop();
            AuraGameSDK.audio.playLoopMusic('music/game_resume_or_calm_phase.mp3', 0.5);
            console.log("Aura Citadel: Resuming from wave " + this.currentWave);
            this._initializeDefaultComponents(); // Initialize default selections
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
    if (this.isPlacingTower && this._canBuildTower()) {
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
    console.log(`Aura Citadel: Initializing wave ${waveNumber}...`);
    AuraGameSDK.ui.showNotification({ message: `Wave ${waveNumber} starting!`, type: 'info' });
    try {
        AuraGameSDK.audio.playLoopMusic('music/tracks/wave_battle.mp3', 0.6);
    } catch (error) {
        console.warn('AuraCitadel: Could not play wave battle music:', error);
    }

    this.currentWave = waveNumber;
    this.enemies = []; // Clear existing enemies, though spawning is now instruction-based
    this.waveSpawnInstructions = []; // Clear previous instructions
    this.waveSpawningComplete = false; // Set to false, actual spawning will occur over time
    this.timeSinceLastSpawn = 0; // Reset spawn timer

    const numEnemies = 5 + waveNumber * 2;
    const enemyHealth = 20 + waveNumber * 5;
    const enemySpeed = 1 + waveNumber * 0.05; // Adjusted speed scaling

    for (let i = 0; i < numEnemies; i++) {
        const spawnInstruction = {
            type: 'basic', // For now, all are basic
            health: enemyHealth,
            speed: enemySpeed,
            wave: waveNumber,
            delay: (i === 0 ? 500 : 1000) // 500ms for the first, 1000ms for subsequent
        };
        this.waveSpawnInstructions.push(spawnInstruction);
    }

    // Note: this.waveSpawningComplete = true; is removed from here.
    // It will be set to true in the _update loop once all instructions are processed.
    console.log(`Aura Citadel: Prepared ${this.waveSpawnInstructions.length} spawn instructions for wave ${waveNumber}.`);
};

AuraCitadelGame.prototype._handleSpawning = function() {
    if (this.waveSpawnInstructions.length === 0) {
        if (!this.waveSpawningComplete) { // Ensure this only logs once
            this.waveSpawningComplete = true;
            console.log("Aura Citadel: All enemies for the wave have spawned.");
        }
        return;
    }

    const currentInstruction = this.waveSpawnInstructions[0];
    if (this.timeSinceLastSpawn >= currentInstruction.delay) {
        const spawnDetails = this.waveSpawnInstructions.shift();
        const newGlitch = this._createGlitch(spawnDetails.type, spawnDetails.health, spawnDetails.speed, spawnDetails.wave);
        if (newGlitch) {
            this.enemies.push(newGlitch);
        }
        console.log(`Aura Citadel: Spawning enemy type ${spawnDetails.type} after ${this.timeSinceLastSpawn.toFixed(0)}ms delay. Target delay: ${spawnDetails.delay}ms.`);
        this.timeSinceLastSpawn = 0; // Reset timer for the next spawn

        if (this.waveSpawnInstructions.length === 0) {
            this.waveSpawningComplete = true;
            console.log("Aura Citadel: All enemies for the wave have now spawned (last one).");
        }
    }
};

AuraCitadelGame.prototype._updateEnemies = function() {
    if (!this.enemyPath || this.enemyPath.length === 0) return;
    const now = Date.now();

    for (let i = this.enemies.length - 1; i >= 0; i--) {
        const enemy = this.enemies[i];
        if (enemy.pathIndex >= this.enemyPath.length) {
            this.enemies.splice(i, 1);
            continue;
        }

        let currentSpeed = enemy.speed; // Base speed for this frame

        // Process status effects
        if (enemy.statusEffects && enemy.statusEffects.length > 0) {
            let activeSlowEffect = null;
            enemy.statusEffects = enemy.statusEffects.filter(effect => {
                if (effect.startTime + effect.duration < now) {
                    return false; // Remove expired effect
                }
                if (effect.type === 'slow_field_effect') {
                    if (!activeSlowEffect || effect.slowMultiplier < activeSlowEffect.slowMultiplier) {
                        activeSlowEffect = effect; // Find the most potent active slow effect
                    }
                }
                return true; // Keep non-expired effects and non-slow effects
            });

            if (activeSlowEffect) {
                currentSpeed *= activeSlowEffect.slowMultiplier;
            }
        }

        const targetTile = this.enemyPath[enemy.pathIndex];
        const targetX = (targetTile.x + 0.5) * this.gridTileSize;
        const targetY = (targetTile.y + 0.5) * this.gridTileSize;
        const dx = targetX - enemy.x, dy = targetY - enemy.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < currentSpeed) { // Use currentSpeed for movement calculation
            enemy.pathIndex++;
            if (enemy.pathIndex >= this.enemyPath.length) {
                this.auraCoreHealth -= 10;
                AuraGameSDK.ui.showNotification({ message: 'Aura Core is under attack!', type: 'warning' });
                this.enemies.splice(i, 1);
                if (this.auraCoreHealth <= 0) { this._gameOver(); return; }
                continue;
            }
        } else {
            if (distance > 0) // Avoid division by zero if enemy is already at target (e.g. due to very low speed)
                 enemy.x += (dx / distance) * currentSpeed;
                 enemy.y += (dy / distance) * currentSpeed;
        }
    }
};

// --- Tower Actions ---
AuraCitadelGame.prototype._updateTowers = function() {
    const now = Date.now();
    this.towers.forEach(tower => {
        const weaponComp = this.masterComponentList[tower.weaponId];
        const modifierComp = this.masterComponentList[tower.modifierId];
        if (!weaponComp) return; // Skip if no weapon component

        let range = (weaponComp.range || 3) * this.gridTileSize; // Convert grid units to pixels
        let fireRate = weaponComp.fireRate || 1; // Shots per second
        let damage = weaponComp.damage || 0; // Default to 0 for non-damaging towers

        if (modifierComp) {
            if (modifierComp.range_boost) range += modifierComp.range_boost * this.gridTileSize;
            if (modifierComp.fire_rate_multiplier) fireRate *= modifierComp.fire_rate_multiplier;
            if (modifierComp.damage_multiplier && weaponComp.damage) damage *= modifierComp.damage_multiplier; // Apply damage multiplier only if tower has base damage
        }

        const fireCooldown = 1000 / fireRate; // Milliseconds
        if (now - (tower.lastFireTime || 0) < fireCooldown) return; // Still on cooldown

        switch (weaponComp.id) {
            case 'weapon_slow_field':
                let affectedEnemy = false;
                this.enemies.forEach(enemy => {
                    const dx = enemy.x - ((tower.x + 0.5) * this.gridTileSize);
                    const dy = enemy.y - ((tower.y + 0.5) * this.gridTileSize);
                    const distance = Math.sqrt(dx * dx + dy * dy);

                    if (distance <= range) {
                        // Check if enemy already has this slow effect and if it's active
                        const existingEffect = enemy.statusEffects && enemy.statusEffects.find(eff => eff.type === 'slow_field_effect');
                        if (existingEffect && existingEffect.startTime + existingEffect.duration > now) {
                            // Effect already active, do nothing for this enemy
                        } else {
                            if (!enemy.statusEffects) enemy.statusEffects = [];
                            // Remove old instance if present and expired
                            enemy.statusEffects = enemy.statusEffects.filter(eff => !(eff.type === 'slow_field_effect' && eff.startTime + eff.duration <= now));                            enemy.statusEffects.push({
                                type: 'slow_field_effect',
                                slowMultiplier: 1 - (weaponComp.slowAmount || 0.3), // Convert slow amount to multiplier (0.3 slow = 0.7 speed)
                                duration: 1000, // Duration of 1 second
                                startTime: now,
                                towerId: tower.uniqueId // To identify the source if needed
                            });
                            affectedEnemy = true; // Mark that this tower affected at least one enemy
                        }
                    }
                });
                if (affectedEnemy) { // Update lastFireTime only if the tower successfully applied its effect
                    tower.lastFireTime = now;
                }
                // This tower type does not create projectiles.
                break;

            // Default case for projectile-based towers
            default:
                if (weaponComp.isUtility) break; // Explicitly skip utility towers that aren't handled above

                let target = null;
                let minDistance = range + 1; // Start with distance just outside range
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
                        target,
                        damage, // Use calculated damage
                        5, /* projectile speed */
                        tower.uniqueId // Pass towerId
                    ));
                    tower.lastFireTime = now;
                    tower.targetEnemyId = target.id;
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
                break;
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
            const primaryTarget = target; // Store for clarity
            const impactX = primaryTarget.x;
            const impactY = primaryTarget.y;

            // Damage primary target
            primaryTarget.health -= proj.damage;
            if (primaryTarget.health <= 0) {
                const enemyIndex = this.enemies.findIndex(e => e.id === primaryTarget.id);
                if (enemyIndex !== -1) this.enemies.splice(enemyIndex, 1);
                this.playerCurrency += 3;
                try {
                    const deathSound = new Audio('gameassets/sounds/enemy_death.wav');
                    deathSound.volume = AuraGameSDK.audio.getVolume ? AuraGameSDK.audio.getVolume() : 0.3;
                    deathSound.play().catch(e => console.warn("Audio play failed:", e));
                } catch (error) { console.warn('AuraCitadel: Could not load death sound:', error); }
                if (Math.random() < 0.1) this._unlockRandomComponent();
            }

            // Check for Pulser AoE damage
            const firingTower = this.towers.find(t => t.uniqueId === proj.towerId);
            if (firingTower && this.masterComponentList[firingTower.weaponId]?.id === 'weapon_pulser') {
                const pulserWeaponStats = this.masterComponentList[firingTower.weaponId];
                const areaOfEffectRadius = (pulserWeaponStats.areaOfEffect || 0) * this.gridTileSize;

                if (areaOfEffectRadius > 0) {
                    this.enemies.forEach(otherEnemy => {
                        // Skip primary target if it wasn't killed and is still in the enemies list,
                        // or if it was killed, ensure we are not processing it again if it was already removed.
                        if (otherEnemy.id === primaryTarget.id) return;

                        const distToImpact = Math.sqrt(Math.pow(otherEnemy.x - impactX, 2) + Math.pow(otherEnemy.y - impactY, 2));
                        if (distToImpact <= areaOfEffectRadius) {
                            otherEnemy.health -= proj.damage; // Apply same damage to secondary targets
                            if (otherEnemy.health <= 0) {
                                const otherEnemyIndex = this.enemies.findIndex(e => e.id === otherEnemy.id);
                                if (otherEnemyIndex !== -1) {
                                     // Important: Adjust loop index if splicing from the array being iterated
                                    if (otherEnemyIndex < i) i--;
                                    this.enemies.splice(otherEnemyIndex, 1);
                                }
                                this.playerCurrency += 3;
                                try {
                                    const deathSound = new Audio('gameassets/sounds/enemy_death.wav');
                                    deathSound.volume = AuraGameSDK.audio.getVolume ? AuraGameSDK.audio.getVolume() : 0.3;
                                    deathSound.play().catch(e => console.warn("Audio play failed:", e));
                                } catch (error) { console.warn('AuraCitadel: Could not load death sound:', error); }
                                if (Math.random() < 0.1) this._unlockRandomComponent();
                            }
                        }
                    });
                }
            }

            this.projectiles.splice(i, 1); // Remove projectile after processing hit and AoE
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

    const now = Date.now();
    const deltaTime = (now - (this.lastTimestamp || now)) / 1000; // deltaTime in seconds
    this.lastTimestamp = now;

    this._update(deltaTime);
    this._draw();
    this.animationFrameId = requestAnimationFrame(this._gameLoop.bind(this));
};

AuraCitadelGame.prototype._update = function(deltaTime) {
    if (!this.gameRunning) return;

    if (this.gameState === "combat_phase") {
        if (!this.waveSpawningComplete) {
            this.timeSinceLastSpawn += deltaTime * 1000; // Convert deltaTime to ms
            this._handleSpawning();
        }
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

    // Draw slow field effects
    this._drawSlowFieldEffects(ctx);// Draw Tower Ghost (if placing)
    this._drawTowerGhost(ctx);
    
    // Draw Tower Ranges (if placing)
    this._drawTowerRanges(ctx);

    // Projectiles
    this.projectiles.forEach(proj => {
        ctx.fillStyle = proj.spriteColor;
        ctx.beginPath();
        ctx.arc(proj.x, proj.y, proj.radius, 0, Math.PI * 2);
        ctx.fill();
    });    // Enemies
    this.enemies.forEach(enemy => {
        ctx.fillStyle = enemy.spriteColor;
        ctx.beginPath();
        ctx.arc(enemy.x, enemy.y, enemy.radius, 0, Math.PI * 2);
        ctx.fill();
        
        // Draw slow effect indicator
        if (enemy.statusEffects && enemy.statusEffects.some(effect => effect.type === 'slow_field_effect')) {
            ctx.strokeStyle = AURA_COLORS.highlightPrimary;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(enemy.x, enemy.y, enemy.radius + 3, 0, Math.PI * 2);
            ctx.stroke();
        }
        
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

    // Draw tower ranges if placing a tower
    this._drawTowerRanges(ctx);

    // Draw Slow Field visual effects
    this._drawSlowFieldEffects(ctx);
};

// Visual effects and range indicators
AuraCitadelGame.prototype._drawTowerRanges = function(ctx) {
    if (!this.isPlacingTower || !this._canBuildTower()) return;
    
    const gridX = this.currentGhostGridCoords.x;
    const gridY = this.currentGhostGridCoords.y;
    
    if (gridX === -1 || gridY === -1) return;
    
    const weapon = this.selectedComponents.weapon;
    const modifier = this.selectedComponents.modifier;
    
    if (!weapon) return;
    
    let range = (weapon.range || 3) * this.gridTileSize;
    if (modifier && modifier.range_boost) {
        range += modifier.range_boost * this.gridTileSize;
    }
    
    // Draw range circle
    ctx.strokeStyle = 'rgba(0, 191, 255, 0.5)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(
        (gridX + 0.5) * this.gridTileSize,
        (gridY + 0.5) * this.gridTileSize,
        range,
        0,
        Math.PI * 2
    );
    ctx.stroke();
    
    // Draw AoE indicator for Pulser
    if (weapon.id === 'weapon_pulser' && weapon.areaOfEffect) {
        ctx.strokeStyle = 'rgba(255, 165, 0, 0.7)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(
            (gridX + 0.5) * this.gridTileSize,
            (gridY + 0.5) * this.gridTileSize,
            weapon.areaOfEffect * this.gridTileSize,
            0,
            Math.PI * 2
        );
        ctx.stroke();
    }
};

// Visual effects for slow field
AuraCitadelGame.prototype._drawSlowFieldEffects = function(ctx) {
    const now = Date.now();
    
    this.towers.forEach(tower => {
        const weaponComp = this.masterComponentList[tower.weaponId];
        if (weaponComp && weaponComp.id === 'weapon_slow_field') {
            let range = (weaponComp.range || 3) * this.gridTileSize;
            const modifierComp = this.masterComponentList[tower.modifierId];
            if (modifierComp && modifierComp.range_boost) {
                range += modifierComp.range_boost * this.gridTileSize;
            }
            
            // Draw slow field aura
            ctx.strokeStyle = 'rgba(0, 191, 255, 0.3)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(
                (tower.x + 0.5) * this.gridTileSize,
                (tower.y + 0.5) * this.gridTileSize,
                range,
                0,
                Math.PI * 2
            );
            ctx.stroke();
            
            // Add pulsing effect
            const pulse = Math.sin(now * 0.005) * 0.1 + 0.9;
            ctx.strokeStyle = `rgba(0, 191, 255, ${0.2 * pulse})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(
                (tower.x + 0.5) * this.gridTileSize,
                (tower.y + 0.5) * this.gridTileSize,
                range * pulse,
                0,
                Math.PI * 2
            );
            ctx.stroke();
        }
    });
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

    // Draw Shop Tabs
    this._drawShopTabs(ctx);

    // Draw Shop Items for current tab
    ctx.font = '10px "Segoe UI", Arial, sans-serif';
    const currentTabItems = this.shopItems.filter(item => item.component.type === this.currentShopTab);
    
    currentTabItems.forEach(item => {
        // Determine item color by component type
        let itemColor = AURA_COLORS.gridLines;
        switch (item.component.type) {
            case 'base':
                itemColor = AURA_COLORS.towerBase;
                break;
            case 'weapon':
                itemColor = AURA_COLORS.towerWeapon;
                break;
            case 'modifier':
                itemColor = AURA_COLORS.highlightPrimary;
                break;
        }

        // Highlight if selected
        const isSelected = this.selectedComponents[item.component.type]?.id === item.component.id;
        if (isSelected) {
            ctx.fillStyle = AURA_COLORS.highlightSecondary;
            ctx.fillRect(item.x - 2, item.y - 2, item.width + 4, item.height + 4);
        }

        ctx.fillStyle = itemColor;
        ctx.fillRect(item.x, item.y, item.width, item.height);

        // Draw item name and cost
        ctx.fillStyle = sUI.textColor;
        ctx.textAlign = "center";
        
        // Draw name (truncated if too long)
        const maxNameWidth = item.width - 4;
        let displayName = item.component.name;
        if (ctx.measureText(displayName).width > maxNameWidth) {
            displayName = displayName.substring(0, 8) + '...';
        }
        
        ctx.fillText(displayName, item.x + item.width / 2, item.y + item.height + 12);
        ctx.fillText(`${item.component.cost}¤`, item.x + item.width / 2, item.y + item.height + 24);

        ctx.textAlign = "left"; // Reset alignment
    });

    // Draw selected components summary
    this._drawSelectedComponentsSummary(ctx);
};

AuraCitadelGame.prototype._drawShopTabs = function(ctx) {
    const sUI = this.shopUIDrawInfo;
    const tabs = ['base', 'weapon', 'modifier'];
    const tabWidth = sUI.width / tabs.length;
    
    tabs.forEach((tab, index) => {
        const tabX = sUI.x + index * tabWidth;
        const tabY = sUI.y;
        const isActive = this.currentShopTab === tab;
        
        // Draw tab background
        ctx.fillStyle = isActive ? AURA_COLORS.highlightPrimary : AURA_COLORS.gridLines;
        ctx.fillRect(tabX, tabY, tabWidth, sUI.tabHeight);
        
        // Draw tab border
        ctx.strokeStyle = AURA_COLORS.primaryText;
        ctx.lineWidth = 1;
        ctx.strokeRect(tabX, tabY, tabWidth, sUI.tabHeight);
        
        // Draw tab text
        ctx.fillStyle = AURA_COLORS.primaryText;
        ctx.font = '12px "Segoe UI", Arial, sans-serif';
        ctx.textAlign = "center";
        ctx.fillText(tab.charAt(0).toUpperCase() + tab.slice(1), tabX + tabWidth / 2, tabY + 16);
        ctx.textAlign = "left";
    });
};

AuraCitadelGame.prototype._drawSelectedComponentsSummary = function(ctx) {
    const sUI = this.shopUIDrawInfo;
    const summaryY = sUI.y + sUI.height - 35;
    
    ctx.fillStyle = sUI.textColor;
    ctx.font = '11px "Segoe UI", Arial, sans-serif';
    
    // Draw selected components
    let summaryText = "Selected: ";
    if (this.selectedComponents.base) summaryText += `Base: ${this.selectedComponents.base.name} `;
    if (this.selectedComponents.weapon) summaryText += `Weapon: ${this.selectedComponents.weapon.name} `;
    if (this.selectedComponents.modifier) summaryText += `Mod: ${this.selectedComponents.modifier.name} `;
    
    ctx.fillText(summaryText, sUI.x + 10, summaryY);
    
    // Draw total cost
    const totalCost = this._calculateTotalCost();
    const costText = `Total Cost: ${totalCost}¤`;
    const costColor = this.playerCurrency >= totalCost ? AURA_COLORS.primaryText : AURA_COLORS.enemyDefault;
    ctx.fillStyle = costColor;
    ctx.fillText(costText, sUI.x + 10, summaryY + 15);
    
    // Draw "Ready to Build" indicator
    if (this.selectedComponents.base && this.selectedComponents.weapon && this.selectedComponents.modifier && this.playerCurrency >= totalCost) {
        ctx.fillStyle = AURA_COLORS.highlightSecondary;
        ctx.fillText("Ready to build! Click on map to place tower.", sUI.x + 200, summaryY + 7);
    }
};

AuraCitadelGame.prototype._drawTowerGhost = function(ctx) {
    if (this.isPlacingTower && this._canBuildTower() && this.currentGhostGridCoords.x !== -1) {
        const gridX = this.currentGhostGridCoords.x;
        const gridY = this.currentGhostGridCoords.y;

        // Boundary Check
        if (gridX < 0 || gridX >= this.gridWidth || gridY < 0 || gridY >= this.gridHeight) {
            return;
        }

        // Ensure grid cell exists
        if (!this.gameGrid[gridY] || !this.gameGrid[gridY][gridX]) {
            return;
        }
        
        const cell = this.gameGrid[gridY][gridX];
        const isBuildable = cell.buildable && !cell.hasTower;

        // Draw Ghost Base
        ctx.globalAlpha = 0.5;
        ctx.fillStyle = isBuildable ? 'green' : 'red';
        ctx.fillRect(
            gridX * this.gridTileSize,
            gridY * this.gridTileSize,
            this.gridTileSize,
            this.gridTileSize
        );

        if (isBuildable) {
            // Draw base component
            if (this.selectedComponents.base) {
                ctx.fillStyle = this.selectedComponents.base.id === 'base_energy_siphon' ? 
                    AURA_COLORS.highlightSecondary : AURA_COLORS.towerBase;
                ctx.fillRect(
                    gridX * this.gridTileSize + 4,
                    gridY * this.gridTileSize + 4,
                    this.gridTileSize - 8,
                    this.gridTileSize - 8
                );
            }

            // Draw weapon component
            if (this.selectedComponents.weapon) {
                ctx.fillStyle = this.selectedComponents.weapon.id === 'weapon_slow_field' ? 
                    AURA_COLORS.highlightPrimary : AURA_COLORS.towerWeapon;
                ctx.beginPath();
                ctx.arc(
                    (gridX + 0.5) * this.gridTileSize,
                    (gridY + 0.5) * this.gridTileSize,
                    this.gridTileSize / 4,
                    0,
                    Math.PI * 2
                );
                ctx.fill();
            }

            // Draw modifier indicator
            if (this.selectedComponents.modifier && this.selectedComponents.modifier.id !== 'mod_none') {
                ctx.fillStyle = AURA_COLORS.highlightSecondary;
                ctx.fillRect(
                    gridX * this.gridTileSize + this.gridTileSize - 8,
                    gridY * this.gridTileSize + 2,
                    6,
                    6
                );
            }
        }

        ctx.globalAlpha = 1.0; // Reset global alpha
    }
};

AuraCitadelGame.prototype._drawStartWaveButton = function(ctx) {
    const buttonWidth = 150;
    const buttonHeight = 50;
    const buttonX = (this.canvas.width - buttonWidth) / 2;
    const buttonY = this.shopUIDrawInfo.y - buttonHeight - 30; // More space above shop UI

    this.startWaveButtonRect = { x: buttonX, y: buttonY, width: buttonWidth, height: buttonHeight };

    // Draw Button Background
    ctx.fillStyle = AURA_COLORS.highlightPrimary;
    ctx.fillRect(buttonX, buttonY, buttonWidth, buttonHeight);

    // Draw Button Border
    ctx.strokeStyle = AURA_COLORS.primaryText;
    ctx.lineWidth = 2;
    ctx.strokeRect(buttonX, buttonY, buttonWidth, buttonHeight);

    // Draw Button Text
    ctx.fillStyle = AURA_COLORS.primaryText;
    ctx.font = 'bold 16px "Segoe UI", Arial, sans-serif';
    ctx.textAlign = "center";
    ctx.fillText(`Start Wave ${this.currentWave + 1}`, buttonX + buttonWidth / 2, buttonY + buttonHeight / 2 + 6);
    ctx.textAlign = "left"; // Reset
};

// --- Event Handlers ---
AuraCitadelGame.prototype._handleCanvasMouseDown = function(event) {
    if (!this.gameRunning || this.gameState !== "build_phase") return;

    const rect = this.canvas.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;

    // Start Wave Button Logic
    if (this.startWaveButtonRect) {
        const btn = this.startWaveButtonRect;
        if (mouseX >= btn.x && mouseX <= btn.x + btn.width &&
            mouseY >= btn.y && mouseY <= btn.y + btn.height) {

            console.log("Aura Citadel: Start Wave button clicked.");
            this.gameState = "combat_phase";
            this._initializeWave(this.currentWave + 1);
            
            this.selectedComponents = { base: null, weapon: null, modifier: null };
            this.isPlacingTower = false;
            this.currentGhostGridCoords = { x: -1, y: -1 };
            return;
        }
    }

    // Shop Interaction Logic
    if (mouseY >= this.shopUIDrawInfo.y) {
        // Check tab clicks
        if (mouseY <= this.shopUIDrawInfo.y + this.shopUIDrawInfo.tabHeight) {
            const tabs = ['base', 'weapon', 'modifier'];
            const tabWidth = this.shopUIDrawInfo.width / tabs.length;
            const clickedTabIndex = Math.floor(mouseX / tabWidth);
            
            if (clickedTabIndex >= 0 && clickedTabIndex < tabs.length) {
                this.currentShopTab = tabs[clickedTabIndex];
                this._populateShopItems();
                return;
            }
        }

        // Check item clicks
        for (const item of this.shopItems) {
            if (item.component.type === this.currentShopTab &&
                mouseX >= item.x && mouseX <= item.x + item.width &&
                mouseY >= item.y && mouseY <= item.y + item.height) {

                if (this.playerCurrency >= item.component.cost) {
                    // Select component
                    this.selectedComponents[item.component.type] = item.component;
                    console.log(`AuraCitadel: Selected ${item.component.type}:`, item.component.name);
                    
                    // Set default components if not selected
                    if (!this.selectedComponents.base && item.component.type !== 'base') {
                        const defaultBase = this.masterComponentList['base_standard'];
                        if (this.unlockedComponents.includes('base_standard')) {
                            this.selectedComponents.base = defaultBase;
                        }
                    }
                    if (!this.selectedComponents.weapon && item.component.type !== 'weapon') {
                        const defaultWeapon = this.masterComponentList['weapon_blaster'];
                        if (this.unlockedComponents.includes('weapon_blaster')) {
                            this.selectedComponents.weapon = defaultWeapon;
                        }
                    }
                    if (!this.selectedComponents.modifier && item.component.type !== 'modifier') {
                        const defaultMod = this.masterComponentList['mod_none'];
                        if (this.unlockedComponents.includes('mod_none')) {
                            this.selectedComponents.modifier = defaultMod;
                        }
                    }
                    
                    // Check if ready to place
                    if (this._canBuildTower()) {
                        this.isPlacingTower = true;
                        AuraGameSDK.ui.showNotification({ 
                            message: `Tower configuration ready! Click on map to place.`, 
                            type: 'info' 
                        });
                    } else {
                        const missingComponents = [];
                        if (!this.selectedComponents.base) missingComponents.push('Base');
                        if (!this.selectedComponents.weapon) missingComponents.push('Weapon');
                        if (!this.selectedComponents.modifier) missingComponents.push('Modifier');
                        
                        if (missingComponents.length > 0) {
                            AuraGameSDK.ui.showNotification({ 
                                message: `Select: ${missingComponents.join(', ')}`, 
                                type: 'info' 
                            });
                        } else {
                            AuraGameSDK.ui.showNotification({ 
                                message: `Need ${this._calculateTotalCost() - this.playerCurrency} more currency`, 
                                type: 'warning' 
                            });
                        }
                    }
                } else {
                    AuraGameSDK.ui.showNotification({ 
                        message: `Not enough currency for ${item.component.name}`, 
                        type: 'warning' 
                    });
                }
                return;
            }
        }

        // Click in shop area but not on item - cancel placement if active
        if (this.isPlacingTower) {
            console.log("AuraCitadel: Placement cancelled by clicking shop area.");
            AuraGameSDK.ui.showNotification({ message: 'Placement cancelled.', type: 'info' });
            this.isPlacingTower = false;
            this.currentGhostGridCoords = { x: -1, y: -1 };
        }
        return;
    }

    // Tower Placement Logic
    if (this.isPlacingTower && this._canBuildTower()) {
        const gridX = Math.floor(mouseX / this.gridTileSize);
        const gridY = Math.floor(mouseY / this.gridTileSize);

        if (gridX >= 0 && gridX < this.gridWidth && gridY >= 0 && gridY < this.gridHeight &&
            this.gameGrid[gridY][gridX].buildable && !this.gameGrid[gridY][gridX].hasTower) {

            const baseId = this.selectedComponents.base.id;
            const weaponId = this.selectedComponents.weapon.id;
            const modId = this.selectedComponents.modifier.id;

            if (this._handlePlayerCrafting(baseId, weaponId, modId, gridX, gridY)) {
                console.log("AuraCitadel: Tower placed at:", gridX, gridY);
                AuraGameSDK.ui.showNotification({ 
                    message: `Tower placed successfully!`, 
                    type: 'success' 
                });
                
                // Reset placement but keep components selected for next tower
                this.isPlacingTower = false;
                this.currentGhostGridCoords = { x: -1, y: -1 };
            } else {
                AuraGameSDK.ui.showNotification({ 
                    message: `Failed to place tower.`, 
                    type: 'error' 
                });
            }
        } else {
            AuraGameSDK.ui.showNotification({ 
                message: 'Cannot build here! Invalid location or occupied.', 
                type: 'warning' 
            });
        }
    }
};

// Helper function to get component tooltip info
AuraCitadelGame.prototype._getComponentTooltip = function(component) {
    let tooltip = `${component.name}\nCost: ${component.cost}¤\n`;
    
    switch (component.type) {
        case 'base':
            if (component.health) tooltip += `Health: ${component.health}\n`;
            if (component.siphonRate) tooltip += `Energy Siphon: ${component.siphonRate}/s\n`;
            break;
            
        case 'weapon':
            if (component.damage) tooltip += `Damage: ${component.damage}\n`;
            if (component.range) tooltip += `Range: ${component.range} tiles\n`;
            if (component.fireRate) tooltip += `Fire Rate: ${component.fireRate}/s\n`;
            if (component.areaOfEffect) tooltip += `AoE Radius: ${component.areaOfEffect} tiles\n`;
            if (component.slowAmount) tooltip += `Slow Effect: ${(component.slowAmount * 100).toFixed(0)}%\n`;
            if (component.isUtility) tooltip += `Type: Utility\n`;
            break;
            
        case 'modifier':
            if (component.range_boost) tooltip += `Range Boost: +${component.range_boost} tiles\n`;
            if (component.damage_multiplier) tooltip += `Damage Multiplier: x${component.damage_multiplier}\n`;
            if (component.fire_rate_multiplier) tooltip += `Fire Rate Multiplier: x${component.fire_rate_multiplier}\n`;
            break;
    }
    
    return tooltip.trim();
};

// Function to populate shop items based on current tab
AuraCitadelGame.prototype._populateShopItems = function() {
    this.shopItems = [];
    
    const itemsPerRow = 3;
    const itemWidth = 80;
    const itemHeight = 80;
    const itemSpacing = 10;
    const startX = this.shopUIDrawInfo.x + 10;
    const startY = this.shopUIDrawInfo.y + 50; // After tabs
    
    const componentsForTab = Object.values(this.masterComponentList).filter(component => 
        component.type === this.currentShopTab && 
        this.unlockedComponents.includes(component.id)
    );
    
    componentsForTab.forEach((component, index) => {
        const row = Math.floor(index / itemsPerRow);
        const col = index % itemsPerRow;
        
        const x = startX + col * (itemWidth + itemSpacing);
        const y = startY + row * (itemHeight + itemSpacing);
        
        this.shopItems.push({
            component: component,
            x: x,
            y: y,
            width: itemWidth,
            height: itemHeight
        });
    });
};

// Helper function to calculate total cost of selected components
AuraCitadelGame.prototype._calculateTotalCost = function() {
    let totalCost = 0;
    
    if (this.selectedComponents.base) {
        totalCost += this.selectedComponents.base.cost;
    }
    if (this.selectedComponents.weapon) {
        totalCost += this.selectedComponents.weapon.cost;
    }
    if (this.selectedComponents.modifier) {
        totalCost += this.selectedComponents.modifier.cost;
    }
    
    return totalCost;
};

// Helper function to check if player can build a tower
AuraCitadelGame.prototype._canBuildTower = function() {
    const totalCost = this._calculateTotalCost();
    return this.playerCurrency >= totalCost && 
           this.selectedComponents.base && 
           this.selectedComponents.weapon;
};

// Initialize default component selections
AuraCitadelGame.prototype._initializeDefaultComponents = function() {
    // Set default base if available and unlocked
    if (!this.selectedComponents.base) {
        const defaultBase = this.masterComponentList['base_standard'];
        if (defaultBase && this.unlockedComponents.includes('base_standard')) {
            this.selectedComponents.base = defaultBase;
        }
    }
    
    // Set default weapon if available and unlocked
    if (!this.selectedComponents.weapon) {
        const defaultWeapon = this.masterComponentList['weapon_blaster'];
        if (defaultWeapon && this.unlockedComponents.includes('weapon_blaster')) {
            this.selectedComponents.weapon = defaultWeapon;
        }
    }
    
    // Modifier is optional, so no default needed
};
