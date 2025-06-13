/**
 * @file AuraCoreDefender.js
 * Main game logic for Aura Core Defender.
 * A tower defense game where the player protects a central core from waves of enemies.
 */

function AuraCoreDefenderGame(canvas) {
    if (!canvas || !(canvas instanceof HTMLCanvasElement)) {
        throw new Error("AuraCoreDefenderGame: Valid canvas element is required.");
    }
    this.canvas = canvas;
    this.ctx = this.canvas.getContext('2d');

    AuraGameSDK.init('auracore-defender', this.canvas);
    console.log("AuraCoreDefenderGame: SDK Initialized with gameId 'auracore-defender'");

    this.gameRunning = false;
    this.animationFrameId = null;
    this.gameTime = 0;
    this.gameState = 'playing'; // 'playing', 'upgrade', 'gameOver', 'victory'

    this.coreHealth = 100;
    this.dataBits = 0; // New currency for permanent upgrades

    // Store initial values that upgrades can modify
    this.initialPlayerResources = { cpu: 200, ram: 100 };
    this.playerResources = JSON.parse(JSON.stringify(this.initialPlayerResources)); // Current game's starting resources


    this.core = {
        x: this.canvas.width / 2,
        y: this.canvas.height / 2,
        radius: 20,
        color: 'lightblue'
    };

    this.enemies = [];
    this.towers = [];
    this.projectiles = [];

    this.paths = [ /* ... (paths definition unchanged) ... */
        { id: 1, points: [ { x: 0, y: 100 }, { x: this.canvas.width / 2 - 50, y: 100 }, { x: this.canvas.width / 2 - 50, y: this.core.y - 50 }, { x: this.core.x, y: this.core.y } ] },
        { id: 2, points: [ { x: this.canvas.width, y: this.canvas.height - 100 }, { x: this.canvas.width / 2 + 50, y: this.canvas.height - 100}, { x: this.canvas.width / 2 + 50, y: this.core.y + 50 }, { x: this.core.x, y: this.core.y } ] }
    ];

    this.waveDefinitions = [ /* ... (add dataBitReward to enemies) ... */
        {
            waveNumber: 1,
            enemies: [
                { type: 'Glitches', count: 5, pathId: 1, spawnDelay: 60, health: 30, maxHealth: 30, speed: 1.5, rewardCpu: 5, rewardRam: 2, dataBitReward: 1 },
                { type: 'Glitches', count: 3, pathId: 2, spawnDelay: 100, health: 30, maxHealth: 30, speed: 1.5, rewardCpu: 5, rewardRam: 2, dataBitReward: 1 }
            ],
            completionBonus: { cpu: 50, ram: 25 }
        },
        {
            waveNumber: 2,
            enemies: [
                { type: 'Viruses', count: 5, pathId: 1, spawnDelay: 90, health: 50, maxHealth: 50, speed: 1, rewardCpu: 8, rewardRam: 3, dataBitReward: 2 },
                { type: 'Glitches', count: 10, pathId: 1, spawnDelay: 45, health: 30, maxHealth: 30, speed: 1.5, rewardCpu: 5, rewardRam: 2, dataBitReward: 1 },
                { type: 'Spyware', count: 1, pathId: 2, spawnDelay: 300, health: 60, maxHealth: 60, speed: 0.8, rewardCpu: 15, rewardRam: 10, dataBitReward: 5, timeToStartDrain: 180, ramDrainAmount: 2, ramDrainInterval: 120 }
            ],
            completionBonus: { cpu: 75, ram: 35 }
        },
        {
            waveNumber: 3,
            enemies: [
                 { type: 'Bloatware', count: 3, pathId: 1, spawnDelay: 180, health: 100, maxHealth: 100, speed: 0.5, rewardCpu: 10, rewardRam: 5, dataBitReward: 3 },
                 { type: 'Viruses', count: 5, pathId: 2, spawnDelay: 100, health: 50, maxHealth: 50, speed: 1, rewardCpu: 8, rewardRam: 3, dataBitReward: 2 },
                 { type: 'Spyware', count: 2, pathId: 1, spawnDelay: 240, health: 60, maxHealth: 60, speed: 0.8, rewardCpu: 15, rewardRam: 10, dataBitReward: 5, timeToStartDrain: 180, ramDrainAmount: 2, ramDrainInterval: 120 }
            ],
            completionBonus: { cpu: 100, ram: 50}
        }
    ];
    this.currentWaveNumber = 0;
    this.enemiesToSpawn = [];
    this.waveSpawnTimers = {};
    this.waveInProgress = false;

    this.availableUpgrades = [
        { id: 'initial_ram_1', name: 'RAM Cache I', description: 'Start with +25 RAM.', cost: 50, purchased: false, effectTarget: 'initialRam', effectValue: 25, maxLevel: 1, currentLevel: 0 },
        { id: 'initial_cpu_1', name: 'CPU Core I', description: 'Start with +25 CPU.', cost: 50, purchased: false, effectTarget: 'initialCpu', effectValue: 25, maxLevel: 1, currentLevel: 0 },
        { id: 'firewall_cdr_1', name: 'Firewall Optimization', description: 'Reduce Firewall cooldown by 10%.', cost: 75, purchased: false, effectTarget: 'abilities.firewall.cooldown', effectMultiplier: 0.9, maxLevel: 1, currentLevel: 0 },
        { id: 'core_health_1', name: 'Core Reinforcement I', description: 'Increase Core Max Health by 20.', cost: 100, purchased: false, effectTarget: 'coreMaxHealth', effectValue: 20, maxLevel: 1, currentLevel: 0 }, // Note: coreMaxHealth needs to be a new property if we want to upgrade it
    ];
    this.coreMaxHealth = 100; // Base max health for the core

    this.abilities = { /* ... (unchanged) ... */
        firewall: { name: 'Firewall', cost: { cpu: 20 }, duration: 300, cooldown: 600, lastUsed: -Infinity, activeInstances: [], width: 100, height: 10, damagePerFrame: 0.5 },
        antivirus: { name: 'Antivirus Scan', cost: { cpu: 15 }, damage: 50, cooldown: 300, lastUsed: -Infinity, radius: 50 },
        defragment: { name: 'Defragment', cost: { ram: 30 }, duration: 500, cooldown: 1000, lastUsed: -Infinity, active: false, activationTime: 0, speedMultiplier: 0.5 },
        dataScrub: { name: 'Data Scrub', cost: { cpu: 50, ram: 20 }, damage: 30, cooldown: 1200, lastUsed: -Infinity, pathIdToScrub: null }
    };
    this.selectedAbility = null;
    this.abilityButtonHeight = 40;
    this.abilityButtonYOffset = this.canvas.height - this.abilityButtonHeight - 10;

    this.handleCanvasClick = this.handleCanvasClick.bind(this);
    console.log("AuraCoreDefenderGame: Instance created.");
}

// --- Rendering Methods ---
AuraCoreDefenderGame.prototype.drawGameBoard = function() { /* ... (unchanged) ... */
    this.ctx.fillStyle = '#1a1a1a'; this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.strokeStyle = '#333333'; this.ctx.lineWidth = 20;
    this.paths.forEach(path => {
        this.ctx.beginPath();
        path.points.forEach((point, index) => { (index === 0) ? this.ctx.moveTo(point.x, point.y) : this.ctx.lineTo(point.x, point.y); });
        this.ctx.stroke();
    });
    this.ctx.lineWidth = 1;
    this.abilities.firewall.activeInstances.forEach(fw => {
        this.ctx.fillStyle = 'rgba(255, 165, 0, 0.5)'; this.ctx.fillRect(fw.x - fw.width / 2, fw.y - fw.height / 2, fw.width, fw.height);
        this.ctx.strokeStyle = 'orange'; this.ctx.strokeRect(fw.x - fw.width / 2, fw.y - fw.height / 2, fw.width, fw.height);
    });
};
AuraCoreDefenderGame.prototype.drawCore = function() { /* ... (unchanged) ... */
    this.ctx.fillStyle = this.core.color; this.ctx.beginPath(); this.ctx.arc(this.core.x, this.core.y, this.core.radius, 0, Math.PI * 2); this.ctx.fill();
    this.ctx.strokeStyle = 'white'; this.ctx.stroke();
};
AuraCoreDefenderGame.prototype.getEnemyColor = function(enemy) { /* ... (unchanged) ... */
    if (enemy.type === 'Spyware' && enemy.isDrainingRam) return '#FFD700';
    switch (enemy.type) {
        case 'Glitches': return '#ff4444'; case 'Viruses': return '#44ff44'; case 'Bloatware': return '#4444ff'; case 'Spyware': return '#ffff44';
        default: return '#cccccc';
    }
};
AuraCoreDefenderGame.prototype.drawEnemies = function() { /* ... (unchanged) ... */
    this.enemies.forEach(enemy => {
        this.ctx.fillStyle = this.getEnemyColor(enemy);
        let size = 10; let originalSpeed = enemy.originalSpeed || enemy.speed;
        if (this.abilities.defragment.active && enemy.speed < originalSpeed) this.ctx.globalAlpha = 0.7;
        if (enemy.type === 'Spyware' && enemy.isDrainingRam) {
            this.ctx.strokeStyle = 'purple'; this.ctx.lineWidth = 2; this.ctx.beginPath(); this.ctx.arc(enemy.x, enemy.y, size * 1.2, 0, Math.PI * 2); this.ctx.stroke(); this.ctx.lineWidth = 1;
        }
        switch (enemy.type) {
            case 'Glitches': size = 8; this.ctx.fillRect(enemy.x - size / 2, enemy.y - size / 2, size, size); break;
            case 'Viruses': size = 12; this.ctx.beginPath(); this.ctx.arc(enemy.x, enemy.y, size / 2, 0, Math.PI * 2); this.ctx.fill(); break;
            case 'Bloatware': size = 16; this.ctx.fillRect(enemy.x - size / 2, enemy.y - size / 1.5, size, size * 1.5); break;
            case 'Spyware': size = 10; this.ctx.save(); this.ctx.translate(enemy.x, enemy.y); this.ctx.rotate(Math.PI / 4); this.ctx.fillRect(-size / 2, -size / 2, size, size); this.ctx.restore(); break;
            default: this.ctx.fillRect(enemy.x - size / 2, enemy.y - size / 2, size, size);
        }
        this.ctx.globalAlpha = 1.0;
        if (enemy.maxHealth) {
            this.ctx.fillStyle = 'red'; this.ctx.fillRect(enemy.x - size, enemy.y - size - 5, size * 2, 3);
            this.ctx.fillStyle = 'green'; this.ctx.fillRect(enemy.x - size, enemy.y - size - 5, (size * 2) * (enemy.health / enemy.maxHealth), 3);
        }
    });
};
AuraCoreDefenderGame.prototype.drawResources = function() { /* ... (unchanged) ... */
    this.ctx.font = "16px Arial"; this.ctx.fillStyle = "white";
    this.ctx.fillText(`CPU: ${AuraGameSDK.resources.get('cpu')}`, 10, 60);
    this.ctx.fillText(`RAM: ${AuraGameSDK.resources.get('ram')}`, 10, 80);
};
AuraCoreDefenderGame.prototype.drawAbilityButtons = function() { /* ... (unchanged) ... */
    const buttonWidth = (this.canvas.width - (Object.keys(this.abilities).length + 1) * 10) / Object.keys(this.abilities).length;
    let currentX = 10; this.ctx.font = "12px Arial";
    for (const key in this.abilities) {
        const ability = this.abilities[key]; const onCooldown = this.gameTime < ability.lastUsed + ability.cooldown;
        this.ctx.fillStyle = onCooldown ? '#555' : (this.selectedAbility === key ? '#999' : '#777');
        this.ctx.fillRect(currentX, this.abilityButtonYOffset, buttonWidth, this.abilityButtonHeight);
        this.ctx.fillStyle = 'white'; this.ctx.textAlign = 'center';
        this.ctx.fillText(ability.name, currentX + buttonWidth / 2, this.abilityButtonYOffset + 15);
        const costString = Object.entries(ability.cost).map(([res, val]) => `${val} ${res.toUpperCase()}`).join(', ');
        this.ctx.fillText(`Cost: ${costString}`, currentX + buttonWidth / 2, this.abilityButtonYOffset + 30);
        if (onCooldown) {
            const remainingCooldown = Math.ceil((ability.lastUsed + ability.cooldown - this.gameTime) / 60);
            this.ctx.fillStyle = 'rgba(0,0,0,0.5)'; this.ctx.fillRect(currentX, this.abilityButtonYOffset, buttonWidth, this.abilityButtonHeight);
            this.ctx.fillStyle = 'yellow'; this.ctx.fillText(`CD: ${remainingCooldown}s`, currentX + buttonWidth / 2, this.abilityButtonYOffset + 22);
        }
        currentX += buttonWidth + 10;
    }
    this.ctx.textAlign = 'left';
};

AuraCoreDefenderGame.prototype.drawUpgradeScreen = function() {
    if (this.gameState !== 'upgrade') return;

    this.ctx.fillStyle = "rgba(0, 0, 0, 0.85)"; // Dark overlay
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    this.ctx.fillStyle = "white";
    this.ctx.font = "30px Arial";
    this.ctx.textAlign = "center";
    this.ctx.fillText("UPGRADE MODE", this.canvas.width / 2, 50);

    this.ctx.font = "20px Arial";
    this.ctx.fillText(`Data Bits: ${this.dataBits}`, this.canvas.width / 2, 90);

    const upgradeButtonHeight = 60;
    const upgradeButtonWidth = this.canvas.width * 0.6;
    const startX = this.canvas.width * 0.2;
    let currentY = 130;

    this.availableUpgrades.forEach((upgrade, index) => {
        upgrade.buttonRect = { x: startX, y: currentY, width: upgradeButtonWidth, height: upgradeButtonHeight }; // Store for click detection

        this.ctx.fillStyle = upgrade.purchased ? '#555' : (this.dataBits >= upgrade.cost ? '#008000' : '#8B0000'); // Green if affordable, DarkRed if not, Grey if purchased
        this.ctx.fillRect(startX, currentY, upgradeButtonWidth, upgradeButtonHeight);

        this.ctx.fillStyle = "white";
        this.ctx.textAlign = "left";
        this.ctx.font = "16px Arial";
        this.ctx.fillText(`${upgrade.name} (Cost: ${upgrade.cost} DB)`, startX + 10, currentY + 20);
        this.ctx.font = "12px Arial";
        this.ctx.fillText(upgrade.description, startX + 10, currentY + 40);
        if (upgrade.purchased) {
            this.ctx.textAlign = "right";
            this.ctx.fillText("PURCHASED", startX + upgradeButtonWidth - 10, currentY + 35);
        }
        currentY += upgradeButtonHeight + 15;
    });

    // "Start Next Wave" button
    this.nextWaveButtonRect = { x: this.canvas.width / 2 - 100, y: this.canvas.height - 70, width: 200, height: 50 };
    this.ctx.fillStyle = "#007bff"; // Blue button
    this.ctx.fillRect(this.nextWaveButtonRect.x, this.nextWaveButtonRect.y, this.nextWaveButtonRect.width, this.nextWaveButtonRect.height);
    this.ctx.fillStyle = "white";
    this.ctx.font = "20px Arial";
    this.ctx.textAlign = "center";
    this.ctx.fillText("Start Next Wave", this.canvas.width / 2, this.nextWaveButtonRect.y + 33);
    this.ctx.textAlign = "left"; // Reset
};


// --- Game Lifecycle & Logic ---

AuraCoreDefenderGame.prototype.startNextWave = function() { /* ... (unchanged from previous, but gameState handled outside) ... */
    this.currentWaveNumber++;
    const waveIndex = this.currentWaveNumber - 1;

    if (waveIndex >= this.waveDefinitions.length) {
        console.log("AuraCoreDefenderGame: All waves cleared! Game Won!");
        AuraGameSDK.achievements.unlock('all_waves_cleared', 'System Secured', 'You have successfully defended the core against all waves.');
        this.gameState = 'victory'; // New state
        this.waveInProgress = false;
        this.stop(); // Stop game loop for victory, but don't clear canvas immediately for message
        return;
    }
    this.waveInProgress = true;
    this.enemiesToSpawn = [];
    this.waveSpawnTimers = {};
    const currentWaveDef = this.waveDefinitions[waveIndex];
    console.log(`AuraCoreDefenderGame: Starting Wave ${this.currentWaveNumber}`);
    currentWaveDef.enemies.forEach((group, groupIndex) => {
        for (let i = 0; i < group.count; i++) {
            this.enemiesToSpawn.push({
                type: group.type, pathId: group.pathId, health: group.health, maxHealth: group.maxHealth, speed: group.speed, originalSpeed: group.speed,
                rewardCpu: group.rewardCpu, rewardRam: group.rewardRam, dataBitReward: group.dataBitReward || 0, age: 0,
                isDrainingRam: false, timeToStartDrain: group.timeToStartDrain || 180, ramDrainAmount: group.ramDrainAmount || 1, ramDrainInterval: group.ramDrainInterval || 60, nextRamDrainTime: 0,
                spawnOrder: i, groupIndex: groupIndex
            });
        }
        this.waveSpawnTimers[`group_${groupIndex}`] = { nextSpawnTime: this.gameTime + group.spawnDelay, spawnDelay: group.spawnDelay, spawnedCount: 0, totalCount: group.count };
    });
    this.enemiesToSpawn.sort((a,b) => a.groupIndex - b.groupIndex || a.spawnOrder - b.spawnOrder);
};

AuraCoreDefenderGame.prototype.updateWaveSpawning = function() { /* ... (unchanged) ... */
    if (!this.waveInProgress) return;
    const currentWaveDef = this.waveDefinitions[this.currentWaveNumber - 1];
    if (!currentWaveDef) return;
    currentWaveDef.enemies.forEach((group, groupIndex) => {
        const timerKey = `group_${groupIndex}`; const groupTimer = this.waveSpawnTimers[timerKey];
        if (groupTimer && groupTimer.spawnedCount < groupTimer.totalCount && this.gameTime >= groupTimer.nextSpawnTime) {
            const enemyToSpawnIndex = this.enemiesToSpawn.findIndex(e => e.groupIndex === groupIndex);
            if (enemyToSpawnIndex !== -1) {
                const enemyData = this.enemiesToSpawn.splice(enemyToSpawnIndex, 1)[0];
                const path = this.paths.find(p => p.id === enemyData.pathId);
                if (path && path.points.length > 0) {
                    enemyData.x = path.points[0].x; enemyData.y = path.points[0].y; enemyData.currentTargetPointIndex = 1;
                    this.enemies.push(enemyData);
                } else console.error(`Path ID ${enemyData.pathId} not found or empty for enemy type ${enemyData.type}`);
                groupTimer.spawnedCount++; groupTimer.nextSpawnTime = this.gameTime + groupTimer.spawnDelay;
            }
        }
    });
};

AuraCoreDefenderGame.prototype.start = function() {
    if (this.isRunning() && this.gameState !== 'gameOver') { console.warn("AuraCoreDefenderGame.start: Game is already running or in a non-startable state."); return; }

    this.gameRunning = true;
    this.gameState = 'playing';
    this.gameTime = 0;
    this.coreHealth = this.coreMaxHealth; // Use max health, potentially upgraded
    this.dataBits = this.dataBits || 0; // Retain databits across game restarts (if this.start is called for a new game after losing)
                                       // For a true full reset, this would be 0. For now, let's assume it persists.

    this.enemies = []; this.towers = []; this.projectiles = [];
    Object.values(this.abilities).forEach(ability => {
        ability.lastUsed = -Infinity;
        if(ability.activeInstances) ability.activeInstances = [];
        if(ability.hasOwnProperty('active')) ability.active = false;
    });

    // Initialize player resources based on potentially upgraded initial values
    this.playerResources = JSON.parse(JSON.stringify(this.initialPlayerResources));
    AuraGameSDK.resources.init(this.playerResources);

    this.currentWaveNumber = 0;
    this.waveInProgress = false;
    this.startNextWave();

    this.canvas.addEventListener('click', this.handleCanvasClick);
    console.log("AuraCoreDefenderGame: Game (re)started.");
    this.gameLoop();
};

AuraCoreDefenderGame.prototype.stop = function() { /* ... (gameRunning = false only) ... */
    // this.gameRunning = false; // Game state will determine if loop continues
    if (this.animationFrameId) cancelAnimationFrame(this.animationFrameId);
    this.canvas.removeEventListener('click', this.handleCanvasClick); // Always remove if stopping game loop
    console.log("AuraCoreDefenderGame: Game loop stopped. Final state:", this.gameState);
};

AuraCoreDefenderGame.prototype.isRunning = function() { return this.gameRunning; }; // if true, gameLoop continues attempts

AuraCoreDefenderGame.prototype.handleCanvasClick = function(event) {
    const rect = this.canvas.getBoundingClientRect();
    const clickX = event.clientX - rect.left; const clickY = event.clientY - rect.top;

    if (this.gameState === 'playing') {
        const buttonWidth = (this.canvas.width - (Object.keys(this.abilities).length + 1) * 10) / Object.keys(this.abilities).length;
        let currentX = 10; let abilityClicked = null;
        for (const key in this.abilities) {
            if (clickX >= currentX && clickX <= currentX + buttonWidth && clickY >= this.abilityButtonYOffset && clickY <= this.abilityButtonYOffset + this.abilityButtonHeight) {
                abilityClicked = key; break;
            }
            currentX += buttonWidth + 10;
        }
        if (abilityClicked) { /* ... (existing ability selection logic unchanged) ... */
            if (this.selectedAbility === abilityClicked) { this.selectedAbility = null; console.log(`AuraCoreDefenderGame: Deselected ${abilityClicked}`); }
            else {
                if (abilityClicked === 'defragment') { this.activateAbility(abilityClicked); this.selectedAbility = null; }
                else { this.selectedAbility = abilityClicked; console.log(`AuraCoreDefenderGame: Selected ability ${abilityClicked}. Click on target.`);
                    if (abilityClicked === 'dataScrub') { this.abilities.dataScrub.pathIdToScrub = 1; }
                }
            }
        } else if (this.selectedAbility) { this.activateAbility(this.selectedAbility, clickX, clickY); this.selectedAbility = null; }

    } else if (this.gameState === 'upgrade') {
        // Check upgrade clicks
        this.availableUpgrades.forEach(upgrade => {
            if (!upgrade.buttonRect || upgrade.purchased) return; // Already purchased or rect not defined
            if (clickX >= upgrade.buttonRect.x && clickX <= upgrade.buttonRect.x + upgrade.buttonRect.width &&
                clickY >= upgrade.buttonRect.y && clickY <= upgrade.buttonRect.y + upgrade.buttonRect.height) {

                if (this.dataBits >= upgrade.cost) {
                    this.dataBits -= upgrade.cost;
                    upgrade.purchased = true; // For non-stacking upgrades
                    // upgrade.currentLevel = (upgrade.currentLevel || 0) + 1; // For stacking

                    console.log(`Purchased upgrade: ${upgrade.name}`);
                    AuraGameSDK.achievements.unlock('first_upgrade', 'Enhancement Acquired', 'Player purchased their first upgrade.');


                    // Apply effect
                    if (upgrade.effectTarget === 'initialRam') {
                        this.initialPlayerResources.ram += upgrade.effectValue;
                    } else if (upgrade.effectTarget === 'initialCpu') {
                        this.initialPlayerResources.cpu += upgrade.effectValue;
                    } else if (upgrade.effectTarget === 'coreMaxHealth') {
                        this.coreMaxHealth += upgrade.effectValue;
                        // this.coreHealth = this.coreMaxHealth; // Optionally heal to new max
                    } else if (upgrade.effectTarget && upgrade.effectTarget.startsWith('abilities.')) {
                        const parts = upgrade.effectTarget.split('.'); // e.g., "abilities.firewall.cooldown"
                        let target = this;
                        parts.forEach(part => { if(target) target = target[part]; });
                        if (target && upgrade.effectMultiplier) {
                             this.abilities[parts[1]][parts[2]] *= upgrade.effectMultiplier; // Assumes path is like abilities.abilityName.property
                        } else if (target && upgrade.effectValue) {
                             this.abilities[parts[1]][parts[2]] += upgrade.effectValue;
                        }
                    }
                    // TODO: Save profile/upgrades via AuraGameSDK
                } else {
                    console.log(`Not enough Data Bits for ${upgrade.name}. Need ${upgrade.cost}, have ${this.dataBits}.`);
                }
            }
        });

        // Check "Start Next Wave" button click
        if (this.nextWaveButtonRect &&
            clickX >= this.nextWaveButtonRect.x && clickX <= this.nextWaveButtonRect.x + this.nextWaveButtonRect.width &&
            clickY >= this.nextWaveButtonRect.y && clickY <= this.nextWaveButtonRect.y + this.nextWaveButtonRect.height) {

            this.gameState = 'playing';
            this.playerResources = JSON.parse(JSON.stringify(this.initialPlayerResources)); // Apply potential initial resource upgrades
            AuraGameSDK.resources.init(this.playerResources);
            this.coreHealth = this.coreMaxHealth; // Start wave with (potentially upgraded) full health
            this.startNextWave();
        }
    }
};

AuraCoreDefenderGame.prototype.activateAbility = function(abilityName, clickX, clickY) { /* ... (unchanged) ... */
    const ability = this.abilities[abilityName]; if (!ability) return;
    if (this.gameTime < ability.lastUsed + ability.cooldown) { console.warn(`AuraCoreDefenderGame: Ability ${abilityName} is on cooldown.`); return; }
    let costPaid = true;
    for (const resourceType in ability.cost) { if (!AuraGameSDK.resources.spend(resourceType, ability.cost[resourceType])) { costPaid = false; console.warn(`AuraCoreDefenderGame: Not enough ${resourceType} for ${abilityName}.`); break; } }
    if (!costPaid) return;
    ability.lastUsed = this.gameTime; console.log(`AuraCoreDefenderGame: Activating ${abilityName}.`);
    switch (abilityName) {
        case 'firewall': if (clickX && clickY) { ability.activeInstances.push({ x: clickX, y: clickY, width: ability.width, height: ability.height, creationTime: this.gameTime, duration: ability.duration }); } else { console.log("Firewall selected, click on map to place."); this.selectedAbility = 'firewall'; ability.lastUsed = -Infinity; for (const resourceType in ability.cost) AuraGameSDK.resources.add(resourceType, ability.cost[resourceType]); } break;
        case 'antivirus': if (clickX && clickY) { let targetEnemy = null; let minDistance = Infinity; this.enemies.forEach(enemy => { const dx = enemy.x - clickX; const dy = enemy.y - clickY; const distance = Math.sqrt(dx*dx + dy*dy); if (distance < ability.radius && distance < minDistance) { targetEnemy = enemy; minDistance = distance; } }); if (targetEnemy) { targetEnemy.health -= ability.damage; console.log(`Antivirus hit ${targetEnemy.type} for ${ability.damage} damage.`); if (targetEnemy.health <= 0) this.neutralizeEnemy(targetEnemy); } else console.log("Antivirus: No enemy found at target location."); } else { console.log("Antivirus selected, click on enemy to target."); this.selectedAbility = 'antivirus'; ability.lastUsed = -Infinity; for (const resourceType in ability.cost) AuraGameSDK.resources.add(resourceType, ability.cost[resourceType]); } break;
        case 'defragment': ability.active = true; ability.activationTime = this.gameTime; this.enemies.forEach(enemy => { if(!enemy.originalSpeed) enemy.originalSpeed = enemy.speed; enemy.speed *= ability.speedMultiplier; }); break;
        case 'dataScrub': const pathIdToScrub = ability.pathIdToScrub || (this.paths.length > 0 ? this.paths[0].id : null); if (pathIdToScrub !== null) { console.log(`Data Scrub targeting path ID: ${pathIdToScrub}`); this.enemies.forEach(enemy => { if (enemy.pathId === pathIdToScrub) { enemy.health -= ability.damage; console.log(`Data Scrub hit ${enemy.type} on path ${pathIdToScrub} for ${ability.damage} damage.`); if (enemy.health <= 0) this.neutralizeEnemy(enemy); } }); } else { console.warn("DataScrub: No path selected or available to scrub."); ability.lastUsed = -Infinity; for (const resourceType in ability.cost) AuraGameSDK.resources.add(resourceType, ability.cost[resourceType]); } this.abilities.dataScrub.pathIdToScrub = null; break;
    }
};
AuraCoreDefenderGame.prototype.updateAbilities = function() { /* ... (unchanged) ... */
    const fwAbility = this.abilities.firewall;
    for (let i = fwAbility.activeInstances.length - 1; i >= 0; i--) {
        const fw = fwAbility.activeInstances[i];
        if (this.gameTime >= fw.creationTime + fw.duration) { fwAbility.activeInstances.splice(i, 1); continue; }
        this.enemies.forEach(enemy => { if (enemy.x > fw.x - fw.width/2 && enemy.x < fw.x + fw.width/2 && enemy.y > fw.y - fw.height/2 && enemy.y < fw.y + fw.height/2) { enemy.health -= fwAbility.damagePerFrame; } });
    }
    const defragAbility = this.abilities.defragment;
    if (defragAbility.active && this.gameTime >= defragAbility.activationTime + defragAbility.duration) {
        defragAbility.active = false; this.enemies.forEach(enemy => { if(enemy.originalSpeed) enemy.speed = enemy.originalSpeed; });
        console.log("AuraCoreDefenderGame: Defragment effect ended.");
    }
};
AuraCoreDefenderGame.prototype.neutralizeEnemy = function(enemy) {
    const index = this.enemies.indexOf(enemy);
    if (index > -1) {
        AuraGameSDK.resources.add('cpu', enemy.rewardCpu || 5);
        AuraGameSDK.resources.add('ram', enemy.rewardRam || 2);
        this.dataBits += (enemy.dataBitReward || 0); // Add data bits
        console.log(`Enemy ${enemy.type} neutralized. Rewarded: ${enemy.rewardCpu || 5} CPU, ${enemy.rewardRam || 2} RAM, ${enemy.dataBitReward || 0} Data Bits. Current Data Bits: ${this.dataBits}`);
        this.enemies.splice(index, 1);
    }
};
AuraCoreDefenderGame.prototype.updateEnemies = function() { /* ... (unchanged) ... */
    for (let i = this.enemies.length - 1; i >= 0; i--) {
        const enemy = this.enemies[i];
        if (enemy.health <= 0) { if (this.enemies.includes(enemy)) this.neutralizeEnemy(enemy); continue; }
        enemy.age++;
        if (enemy.type === 'Spyware') {
            if (!enemy.isDrainingRam && enemy.age >= enemy.timeToStartDrain) {
                enemy.isDrainingRam = true; enemy.nextRamDrainTime = this.gameTime + enemy.ramDrainInterval;
                console.log(`AuraCoreDefenderGame: Spyware (id ${i}) started draining RAM.`);
            }
            if (enemy.isDrainingRam && this.gameTime >= enemy.nextRamDrainTime) {
                const drainSuccess = AuraGameSDK.resources.spend('ram', enemy.ramDrainAmount);
                if (drainSuccess) console.log(`AuraCoreDefenderGame: Spyware (id ${i}) drained ${enemy.ramDrainAmount} RAM. Current RAM: ${AuraGameSDK.resources.get('ram')}`);
                else console.warn(`AuraCoreDefenderGame: Spyware (id ${i}) failed to drain RAM (insufficient). RAM: ${AuraGameSDK.resources.get('ram')}`);
                enemy.nextRamDrainTime = this.gameTime + enemy.ramDrainInterval;
            }
        }
        const path = this.paths.find(p => p.id === enemy.pathId);
        if (!path || enemy.currentTargetPointIndex >= path.points.length) {
            this.coreHealth -= (enemy.type === 'Bloatware' ? 20 : (enemy.type === 'Spyware' ? 15 : 10));
            AuraGameSDK.achievements.isUnlocked('first_leak').then(unlocked => { if(!unlocked) AuraGameSDK.achievements.unlock('first_leak', 'First Leak!', 'An enemy reached the core.'); });
            this.enemies.splice(i, 1); if (this.coreHealth <= 0) { this.coreHealth = 0; this.gameState = 'gameOver'; this.stop(); } // Set gameState
            continue;
        }
        const targetPoint = path.points[enemy.currentTargetPointIndex];
        const dx = targetPoint.x - enemy.x; const dy = targetPoint.y - enemy.y; const distance = Math.sqrt(dx * dx + dy * dy);
        let currentSpeed = enemy.speed;
        if (distance < currentSpeed) { enemy.x = targetPoint.x; enemy.y = targetPoint.y; enemy.currentTargetPointIndex++; }
        else { enemy.x += (dx / distance) * currentSpeed; enemy.y += (dy / distance) * currentSpeed; }
    }
};

AuraCoreDefenderGame.prototype.gameLoop = function() {
    if (!this.gameRunning && this.gameState !== 'upgrade' && this.gameState !== 'gameOver' && this.gameState !== 'victory') { // Allow loop for upgrade/gameover/victory screen drawing
        return;
    }

    this.ctx.clearRect(0,0,this.canvas.width, this.canvas.height); // Clear once at the beginning

    if (this.gameState === 'playing') {
        this.gameTime++;
        this.updateWaveSpawning();
        this.updateEnemies();
        this.updateAbilities();

        // Wave Completion Check
        if (this.waveInProgress && this.enemiesToSpawn.length === 0 && this.enemies.length === 0) {
            this.waveInProgress = false;
            const waveDef = this.waveDefinitions[this.currentWaveNumber - 1];
            if (waveDef && waveDef.completionBonus) {
                AuraGameSDK.resources.add('cpu', waveDef.completionBonus.cpu);
                AuraGameSDK.resources.add('ram', waveDef.completionBonus.ram);
                console.log(`AuraCoreDefenderGame: Wave ${this.currentWaveNumber} complete! Bonus: CPU +${waveDef.completionBonus.cpu}, RAM +${waveDef.completionBonus.ram}`);
            }
            if (typeof AuraOS !== 'undefined' && AuraOS.showNotification) {
                 AuraOS.showNotification({ title: 'AuraCore Defender', message: `Wave ${this.currentWaveNumber} Complete!`, type: 'success' });
            }

            this.gameState = 'upgrade'; // Transition to upgrade screen
            AuraGameSDK.achievements.isUnlocked('first_upgrade_screen').then(unlocked => {
                if(!unlocked) AuraGameSDK.achievements.unlock('first_upgrade_screen', 'Time to Upgrade', 'Reached the first upgrade screen.');
            });
            console.log("AuraCoreDefenderGame: Transitioning to Upgrade Screen.");
            // No automatic next wave start here
        }

        this.drawGameBoard();
        this.drawCore();
        this.drawEnemies();
        this.drawResources();
        this.drawAbilityButtons();
        this.ctx.font = "16px Arial"; this.ctx.fillStyle = "white";
        this.ctx.fillText(`Core Health: ${this.coreHealth} / ${this.coreMaxHealth} | Wave: ${this.currentWaveNumber} / ${this.waveDefinitions.length} | Data Bits: ${this.dataBits}`, 10, 20);

    } else if (this.gameState === 'upgrade') {
        this.drawUpgradeScreen(); // Only draw upgrade screen
    } else if (this.gameState === 'gameOver') {
        this.ctx.fillStyle = "rgba(0,0,0,0.85)"; this.ctx.fillRect(0,0, this.canvas.width, this.canvas.height);
        this.ctx.font = "40px Arial"; this.ctx.fillStyle = "red"; this.ctx.textAlign = "center";
        this.ctx.fillText("GAME OVER", this.canvas.width/2, this.canvas.height/2 - 20);
        this.ctx.font = "20px Arial";
        this.ctx.fillText("Click to Restart", this.canvas.width/2, this.canvas.height/2 + 20); // Placeholder for restart
        this.ctx.textAlign = "left";
        // In a real scenario, you might add a click listener here to call this.start() for a new game.
        // For now, it just stops. If start() is called again, it will reset.
    } else if (this.gameState === 'victory') {
        this.ctx.fillStyle = "rgba(0, 20, 0, 0.85)"; this.ctx.fillRect(0,0, this.canvas.width, this.canvas.height);
        this.ctx.font = "30px Arial"; this.ctx.fillStyle = "lightgreen"; this.ctx.textAlign = "center";
        this.ctx.fillText("ALL WAVES CLEARED - VICTORY!", this.canvas.width/2, this.canvas.height/2);
        this.ctx.textAlign = "left";
    }


    if (this.gameState === 'playing' || this.gameState === 'upgrade') { // Continue animation if playing or on upgrade screen
        this.animationFrameId = requestAnimationFrame(this.gameLoop.bind(this));
    }
};

window.AuraCoreDefenderGame = AuraCoreDefenderGame;
console.log("AuraCoreDefender.js loaded. Game class: window.AuraCoreDefenderGame");
