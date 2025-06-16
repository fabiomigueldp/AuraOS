class AuraWhackGame {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = this.canvas.getContext('2d');
        AuraGameSDK.init('aura-whack', this.canvas);

        // Fetch CSS Variables
        const styles = getComputedStyle(document.documentElement);
        this.holeColor = styles.getPropertyValue('--subtle-text-color').trim() || '#555';
        this.moleColor = styles.getPropertyValue('--highlight-secondary').trim() || '#FF6347';
        this.specialMoleColor = styles.getPropertyValue('--highlight-primary').trim() || '#8a63d2';
        this.textColor = styles.getPropertyValue('--text-color').trim() || '#f0f0f5';
        this.backgroundColor = styles.getPropertyValue('--background-color').trim() || '#100f18';        // Game state
        this.gameState = 'menu'; // 'menu', 'playing', 'paused', 'gameOver'
        this.gameRunning = false;
        this.score = 0;
        this.timeLeft = 60;
        this.level = 1;
        this.animationFrameId = null;

        // Menu and UI animations
        this.menuPulse = 0;
        this.titleGlow = 0;
        this.buttonHover = -1;
        this.gameOverAnimation = 0;
        this.pauseBlinkTimer = 0;
        
        // Game statistics
        this.stats = {
            totalHits: 0,
            totalMisses: 0,
            specialMolesHit: 0,
            longestCombo: 0,
            accuracy: 0,
            gameTime: 0
        };

        // Scoring system
        this.combo = 0;
        this.maxCombo = 0;
        this.baseScore = 10;
        this.specialMoleScore = 50;
        this.comboMultiplier = 1;

        // Game difficulty
        this.difficulty = {
            moleSpeed: 1000, // ms - how long mole stays visible
            appearanceDelay: 800, // ms - delay between moles
            specialMoleChance: 0.1, // 10% chance for special mole
            maxMoles: 1 // number of simultaneous moles
        };

        // Moles array to support multiple moles
        this.moles = [];
        this.holes = [];
        this.lastMoleTime = 0;

        // Visual effects
        this.particles = [];
        this.hitEffects = [];

        // Animation states
        this.moleAnimations = new Map(); // Track mole pop-up/down animations        // Bind methods
        this.gameLoop = this.gameLoop.bind(this);
        this.boundHandleCanvasClick = this.handleCanvasClick.bind(this);
        this.boundHandleKeyPress = this.handleKeyPress.bind(this);
        this.boundHandleMouseMove = this.handleMouseMove.bind(this);

        // Start the game loop for menu animations
        this.gameLoop(performance.now());
        
        // Add global event listeners for menu
        this.canvas.addEventListener('mousedown', this.boundHandleCanvasClick);
        this.canvas.addEventListener('mousemove', this.boundHandleMouseMove);
        document.addEventListener('keydown', this.boundHandleKeyPress);
    }start() {
        if (this.gameRunning) {
            console.warn("Game is already running.");
            return;
        }

        // Stop any existing music first (for restarts)
        AuraGameSDK.audio.stop();
        // Start background music
        AuraGameSDK.audio.playLoopMusic('music/tracks/whack_bgm.mp3');        this.gameState = 'playing';
        this.gameRunning = true;
        this.score = 0;
        this.timeLeft = 60;
        this.level = 1;
        this.combo = 0;
        this.maxCombo = 0;
        this.comboMultiplier = 1;

        // Reset stats
        this.stats = {
            totalHits: 0,
            totalMisses: 0,
            specialMolesHit: 0,
            longestCombo: 0,
            accuracy: 0,
            gameTime: 60
        };

        // Reset difficulty
        this.difficulty = {
            moleSpeed: 1000,
            appearanceDelay: 800,
            specialMoleChance: 0.1,
            maxMoles: 1
        };

        // Initialize hole positions
        this.initializeHoles();

        // Reset game elements
        this.moles = [];
        this.particles = [];
        this.hitEffects = [];
        this.moleAnimations.clear();
        this.lastMoleTime = performance.now();
        this.lastTickTime = performance.now();        // Start the game loop
        this.gameLoop(performance.now());
        console.log("AuraWhack Game Started!");
    }

    initializeHoles() {
        this.holes = [];
        const gridSize = 3;
        const padding = this.canvas.width / (gridSize * 2.5);
        const holeRadius = (this.canvas.width - padding * (gridSize + 1)) / (gridSize * 2);

        const startX = holeRadius + padding;
        const startY = holeRadius + padding + 60; // Leave space for UI
        const stepX = holeRadius * 2 + padding;
        const stepY = holeRadius * 2 + padding;

        for (let i = 0; i < gridSize; i++) {
            for (let j = 0; j < gridSize; j++) {
                this.holes.push({
                    x: startX + j * stepX,
                    y: startY + i * stepY,
                    radius: holeRadius,
                    id: i * gridSize + j
                });
            }
        }
    }    stop() {
        console.log("AuraWhack: Stopping game...");
        
        this.gameRunning = false;
        this.gameState = 'menu';

        // Cancel animation frame to stop the game loop completely
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }

        // Remove all event listeners to prevent ghost interactions
        this.canvas.removeEventListener('mousedown', this.boundHandleCanvasClick);
        this.canvas.removeEventListener('mousemove', this.boundHandleMouseMove);
        document.removeEventListener('keydown', this.boundHandleKeyPress);

        // Stop all audio
        AuraGameSDK.audio.stop();

        // Clear all game arrays to prevent memory leaks
        this.moles = [];
        this.particles = [];
        this.hitEffects = [];
        this.moleAnimations.clear();

        // Reset canvas cursor
        this.canvas.style.cursor = 'default';

        console.log("AuraWhack Game Completely Stopped! Final Score:", this.score);
    }

    pause() {
        if (this.gameState === 'playing') {
            this.gameState = 'paused';
            AuraGameSDK.audio.pause();
        }
    }

    resume() {
        if (this.gameState === 'paused') {
            this.gameState = 'playing';
            AuraGameSDK.audio.resume();
        }
    }    gameOver() {
        this.timeLeft = 0;
        this.gameState = 'gameOver';
        this.gameOverAnimation = 0;
        
        console.log("Game Over! Final Score:", this.score);
        console.log("Max Combo:", this.maxCombo);

        // SDK Integrations
        AuraGameSDK.ui.showError(`Game Over - Score: ${this.score}`, {
            duration: 4000,
            closeable: true
        });
        AuraGameSDK.leaderboard.submitScore('AuraUser', this.score);
        AuraGameSDK.audio.playSfx('gameassets/sounds/game_over.wav');

        // Keep the game loop running for animations, but stop gameplay
        this.gameRunning = false;
    }isRunning() {
        return this.gameRunning;
    }

    getGameState() {
        return this.gameState;
    }

    getScore() {
        return this.score;
    }

    getStats() {
        return {
            score: this.score,
            level: this.level,
            combo: this.combo,
            maxCombo: this.maxCombo,
            timeLeft: this.timeLeft
        };
    }    // --- Game Loop ---
    gameLoop(currentTime) {
        // Stop the loop if the game has been completely stopped
        if (this.animationFrameId === null) {
            return;
        }

        if (!this.gameRunning && this.gameState === 'menu') {
            // Allow menu animations even when game is not running
            this.updateMenuAnimations(currentTime);
        }

        // Update game state based on current state
        switch (this.gameState) {
            case 'menu':
                this.updateMenuAnimations(currentTime);
                break;
            case 'playing':
                if (this.gameRunning) {
                    this.update(currentTime);
                }
                break;
            case 'paused':
                this.updatePauseAnimations(currentTime);
                break;
            case 'gameOver':
                this.updateGameOverAnimations(currentTime);
                this.updateEffects(currentTime);
                break;
        }

        // Always draw
        this.draw();

        // Only continue the loop if not stopped
        if (this.animationFrameId !== null) {
            this.animationFrameId = requestAnimationFrame(this.gameLoop);
        }
    }

    updateMenuAnimations(currentTime) {
        this.menuPulse = Math.sin(currentTime * 0.003) * 0.5 + 0.5;
        this.titleGlow = Math.sin(currentTime * 0.005) * 0.3 + 0.7;
    }

    updatePauseAnimations(currentTime) {
        this.pauseBlinkTimer = Math.sin(currentTime * 0.008) * 0.5 + 0.5;
    }

    updateGameOverAnimations(currentTime) {
        this.gameOverAnimation = Math.min(1, this.gameOverAnimation + 0.02);
    }

    // --- Update and Draw ---
    update(currentTime) {
        if (this.gameState !== 'playing') {
            return;
        }

        // Game Timer Logic
        const elapsedTime = currentTime - this.lastTickTime;
        if (elapsedTime >= 1000) { // One second has passed
            this.timeLeft--;
            this.lastTickTime = currentTime - (elapsedTime % 1000);

            // Increase difficulty every 15 seconds
            if (this.timeLeft % 15 === 0 && this.timeLeft < 60) {
                this.increaseDifficulty();
            }

            if (this.timeLeft <= 0) {
                this.timeLeft = 0;
                this.gameOver();
                return;
            }
        }

        // Update game elements
        this.updateMoles(currentTime);
        this.updateEffects(currentTime);
        this.manageMoleSpawning(currentTime);
    }

    increaseDifficulty() {
        this.level++;
        this.difficulty.moleSpeed = Math.max(500, this.difficulty.moleSpeed - 50);
        this.difficulty.appearanceDelay = Math.max(400, this.difficulty.appearanceDelay - 50);
        this.difficulty.specialMoleChance = Math.min(0.3, this.difficulty.specialMoleChance + 0.05);
        
        if (this.level % 3 === 0) {
            this.difficulty.maxMoles = Math.min(3, this.difficulty.maxMoles + 1);
        }        AuraGameSDK.ui.showSuccess(`Level ${this.level}`, {
            duration: 2000,
            showProgress: true
        });
        AuraGameSDK.audio.playSfx('gameassets/sounds/mole_appear.wav');
    }

    manageMoleSpawning(currentTime) {
        const activeMoles = this.moles.filter(mole => mole.active).length;
        
        if (activeMoles < this.difficulty.maxMoles && 
            currentTime - this.lastMoleTime >= this.difficulty.appearanceDelay) {
            
            this.spawnMole(currentTime);
            this.lastMoleTime = currentTime;
        }
    }

    spawnMole(currentTime) {
        // Find available holes
        const occupiedHoles = this.moles.filter(mole => mole.active).map(mole => mole.holeIndex);
        const availableHoles = this.holes
            .map((hole, index) => index)
            .filter(index => !occupiedHoles.includes(index));

        if (availableHoles.length === 0) return;

        const holeIndex = availableHoles[Math.floor(Math.random() * availableHoles.length)];
        const isSpecial = Math.random() < this.difficulty.specialMoleChance;

        const mole = {
            holeIndex: holeIndex,
            active: true,
            special: isSpecial,
            appearanceTime: currentTime,
            duration: this.difficulty.moleSpeed,
            animationPhase: 'appearing', // 'appearing', 'visible', 'disappearing'
            animationProgress: 0
        };

        this.moles.push(mole);
        
        AuraGameSDK.audio.playSfx('gameassets/sounds/mole_appear.wav');
        console.log(`${isSpecial ? 'Special ' : ''}Mole appeared in hole ${holeIndex}`);
    }

    updateMoles(currentTime) {
        this.moles = this.moles.filter(mole => {
            if (!mole.active) return false;

            const elapsedTime = currentTime - mole.appearanceTime;
            const animationDuration = 200; // 200ms for appear/disappear animation

            // Update animation phase
            if (mole.animationPhase === 'appearing') {
                mole.animationProgress = Math.min(1, elapsedTime / animationDuration);
                if (mole.animationProgress >= 1) {
                    mole.animationPhase = 'visible';
                }
            } else if (mole.animationPhase === 'visible') {
                if (elapsedTime >= mole.duration - animationDuration) {
                    mole.animationPhase = 'disappearing';
                    mole.animationProgress = 0;
                }
            } else if (mole.animationPhase === 'disappearing') {
                mole.animationProgress = Math.min(1, (elapsedTime - (mole.duration - animationDuration)) / animationDuration);
                if (mole.animationProgress >= 1) {
                    mole.active = false;
                    // Reset combo if mole escapes
                    if (this.combo > 0) {
                        this.combo = 0;
                        this.comboMultiplier = 1;
                    }
                    return false;
                }
            }

            return true;
        });
    }

    updateEffects(currentTime) {
        // Update hit effects
        this.hitEffects = this.hitEffects.filter(effect => {
            effect.life -= 16; // Assume ~60fps
            effect.y -= 2;
            effect.alpha = effect.life / effect.maxLife;
            return effect.life > 0;
        });

        // Update particles
        this.particles = this.particles.filter(particle => {
            particle.x += particle.vx;
            particle.y += particle.vy;
            particle.vy += 0.2; // gravity
            particle.life -= 16;
            particle.alpha = particle.life / particle.maxLife;
            return particle.life > 0;
        });
    }    draw() {
        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw background
        this.drawBackground();

        // Draw based on game state
        switch (this.gameState) {
            case 'menu':
                this.drawMenu();
                break;
            case 'playing':
                this.drawGame();
                break;
            case 'paused':
                this.drawGame();
                this.drawPauseOverlay();
                break;
            case 'gameOver':
                this.drawGame();
                this.drawGameOverOverlay();
                break;
        }
    }

    drawBackground() {
        // Create retro arcade-style gradient background
        const gradient = this.ctx.createLinearGradient(0, 0, 0, this.canvas.height);
        gradient.addColorStop(0, '#0f0f23');
        gradient.addColorStop(0.3, '#1a1a2e');
        gradient.addColorStop(0.7, '#16213e');
        gradient.addColorStop(1, '#0f0f23');
        
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Add subtle grid pattern
        this.ctx.strokeStyle = 'rgba(138, 99, 210, 0.1)';
        this.ctx.lineWidth = 1;
        const gridSize = 40;
        
        for (let x = 0; x < this.canvas.width; x += gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, this.canvas.height);
            this.ctx.stroke();
        }
        
        for (let y = 0; y < this.canvas.height; y += gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(this.canvas.width, y);
            this.ctx.stroke();
        }
    }    drawMenu() {
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;

        // Draw retro title with glow effect
        this.ctx.save();
        
        // Title glow
        this.ctx.shadowColor = this.specialMoleColor;
        this.ctx.shadowBlur = 25 * this.titleGlow;
        this.ctx.fillStyle = this.specialMoleColor;
        this.ctx.font = 'bold 68px "Courier New", monospace';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText('AURA WHACK', centerX, centerY - 140);
        
        this.ctx.restore();

        // Subtitle with retro styling
        this.ctx.fillStyle = this.textColor;
        this.ctx.font = '20px "Courier New", monospace';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText('━━━ RETRO ARCADE EDITION ━━━', centerX, centerY - 95);

        // Instructions with retro box styling - maior para melhor espaçamento
        this.drawRetroBox(centerX - 240, centerY - 60, 480, 140, false);
        
        this.ctx.fillStyle = this.textColor;
        this.ctx.font = '16px "Courier New", monospace';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText('WHACK THE MOLES AS FAST AS YOU CAN!', centerX, centerY - 25);
        this.ctx.fillText('PURPLE MOLES GIVE EXTRA POINTS!', centerX, centerY - 5);
        this.ctx.fillText('BUILD COMBOS FOR HIGHER SCORES!', centerX, centerY + 15);
        this.ctx.fillText('CLICK FAST AND BE PRECISE!', centerX, centerY + 35);
        
        // Pulsing start button com melhor posicionamento
        const pulseScale = 1 + this.menuPulse * 0.15;
        this.ctx.save();
        this.ctx.translate(centerX, centerY + 110);
        this.ctx.scale(pulseScale, pulseScale);
        
        this.drawRetroBox(-120, -25, 240, 50, true);
        this.ctx.fillStyle = this.backgroundColor;
        this.ctx.font = 'bold 18px "Courier New", monospace';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText('PRESS SPACE TO START', 0, 0);
        
        this.ctx.restore();

        // Controls com melhor formatação
        this.ctx.fillStyle = 'rgba(240, 240, 245, 0.7)';
        this.ctx.font = '12px "Courier New", monospace';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText('CONTROLS: MOUSE CLICK TO WHACK  |  P: PAUSE  |  ESC: QUIT', centerX, centerY + 170);
    }

    drawRetroBox(x, y, width, height, highlighted) {
        this.ctx.save();
        
        // Box shadow
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        this.ctx.fillRect(x + 3, y + 3, width, height);
        
        // Main box
        this.ctx.fillStyle = highlighted ? this.specialMoleColor : 'rgba(138, 99, 210, 0.2)';
        this.ctx.fillRect(x, y, width, height);
        
        // Border
        this.ctx.strokeStyle = highlighted ? this.textColor : this.specialMoleColor;
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(x, y, width, height);
        
        // Corner details
        const cornerSize = 8;
        this.ctx.strokeStyle = this.textColor;
        this.ctx.lineWidth = 1;
        
        // Top-left corner
        this.ctx.beginPath();
        this.ctx.moveTo(x, y + cornerSize);
        this.ctx.lineTo(x, y);
        this.ctx.lineTo(x + cornerSize, y);
        this.ctx.stroke();
        
        // Top-right corner
        this.ctx.beginPath();
        this.ctx.moveTo(x + width - cornerSize, y);
        this.ctx.lineTo(x + width, y);
        this.ctx.lineTo(x + width, y + cornerSize);
        this.ctx.stroke();
        
        // Bottom-left corner
        this.ctx.beginPath();
        this.ctx.moveTo(x, y + height - cornerSize);
        this.ctx.lineTo(x, y + height);
        this.ctx.lineTo(x + cornerSize, y + height);
        this.ctx.stroke();
        
        // Bottom-right corner
        this.ctx.beginPath();
        this.ctx.moveTo(x + width - cornerSize, y + height);
        this.ctx.lineTo(x + width, y + height);
        this.ctx.lineTo(x + width, y + height - cornerSize);
        this.ctx.stroke();
        
        this.ctx.restore();
    }

    drawGame() {
        this.drawBoard();
        this.drawMoles();
        this.drawUI();
        this.drawEffects();
    }

    drawBoard() {
        this.ctx.fillStyle = this.holeColor;
        this.holes.forEach(hole => {
            this.ctx.beginPath();
            this.ctx.arc(hole.x, hole.y, hole.radius, 0, Math.PI * 2);
            this.ctx.fill();
            
            // Draw hole border
            this.ctx.strokeStyle = this.textColor + '40';
            this.ctx.lineWidth = 2;
            this.ctx.stroke();
        });
    }

    drawMoles() {
        this.moles.forEach(mole => {
            if (!mole.active) return;

            const hole = this.holes[mole.holeIndex];
            const moleRadius = hole.radius * 0.7;
            
            // Calculate animation offset
            let yOffset = 0;
            if (mole.animationPhase === 'appearing') {
                yOffset = (1 - mole.animationProgress) * moleRadius;
            } else if (mole.animationPhase === 'disappearing') {
                yOffset = mole.animationProgress * moleRadius;
            }

            // Draw mole shadow
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
            this.ctx.beginPath();
            this.ctx.ellipse(hole.x, hole.y + yOffset + moleRadius * 0.3, moleRadius, moleRadius * 0.5, 0, 0, Math.PI * 2);
            this.ctx.fill();

            // Draw mole
            this.ctx.fillStyle = mole.special ? this.specialMoleColor : this.moleColor;
            this.ctx.beginPath();
            this.ctx.arc(hole.x, hole.y + yOffset, moleRadius, 0, Math.PI * 2);
            this.ctx.fill();

            // Draw mole border
            this.ctx.strokeStyle = this.textColor;
            this.ctx.lineWidth = 3;
            this.ctx.stroke();

            // Draw special mole indicator
            if (mole.special) {
                this.ctx.fillStyle = this.textColor;
                this.ctx.font = 'bold 16px Inter';
                this.ctx.textAlign = 'center';
                this.ctx.fillText('★', hole.x, hole.y + yOffset + 6);
            }

            // Draw eyes
            this.ctx.fillStyle = this.backgroundColor;
            this.ctx.beginPath();
            this.ctx.arc(hole.x - moleRadius * 0.3, hole.y + yOffset - moleRadius * 0.2, moleRadius * 0.15, 0, Math.PI * 2);
            this.ctx.arc(hole.x + moleRadius * 0.3, hole.y + yOffset - moleRadius * 0.2, moleRadius * 0.15, 0, Math.PI * 2);
            this.ctx.fill();
        });
    }    drawUI() {
        // Setup consistent font styling
        this.ctx.textBaseline = 'middle';
        
        // Draw score with retro styling
        this.ctx.fillStyle = this.textColor;
        this.ctx.font = 'bold 20px "Courier New", monospace';
        this.ctx.textAlign = 'left';
        this.ctx.fillText(`SCORE: ${this.score}`, 20, 25);

        // Draw combo with highlighting
        if (this.combo > 1) {
            this.ctx.save();
            this.ctx.shadowColor = this.specialMoleColor;
            this.ctx.shadowBlur = 8;
            this.ctx.fillStyle = this.specialMoleColor;
            this.ctx.font = 'bold 18px "Courier New", monospace';
            this.ctx.fillText(`COMBO: ${this.combo}x`, 20, 50);
            this.ctx.restore();
        }

        // Draw time left with warning colors
        this.ctx.fillStyle = this.timeLeft <= 10 ? '#ff4444' : this.textColor;
        this.ctx.font = 'bold 20px "Courier New", monospace';
        this.ctx.textAlign = 'right';
        this.ctx.fillText(`TIME: ${this.timeLeft}`, this.canvas.width - 20, 25);

        // Draw level
        this.ctx.fillStyle = this.textColor;
        this.ctx.font = 'bold 18px "Courier New", monospace';
        this.ctx.fillText(`LEVEL: ${this.level}`, this.canvas.width - 20, 50);

        // Draw progress bar for time with improved styling
        const barWidth = this.canvas.width - 40;
        const barHeight = 12;
        const barX = 20;
        const barY = this.canvas.height - 35;
        
        // Bar shadow
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        this.ctx.fillRect(barX + 2, barY + 2, barWidth, barHeight);
        
        // Background
        this.ctx.fillStyle = 'rgba(85, 85, 85, 0.8)';
        this.ctx.fillRect(barX, barY, barWidth, barHeight);
        
        // Progress
        const progress = this.timeLeft / 60;
        const gradient = this.ctx.createLinearGradient(barX, 0, barX + barWidth, 0);
        
        if (progress > 0.5) {
            gradient.addColorStop(0, this.specialMoleColor);
            gradient.addColorStop(1, '#4ecdc4');
        } else if (progress > 0.3) {
            gradient.addColorStop(0, '#ffd700');
            gradient.addColorStop(1, '#ff8c00');
        } else {
            gradient.addColorStop(0, '#ff4444');
            gradient.addColorStop(1, '#cc0000');
        }
        
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(barX, barY, barWidth * progress, barHeight);
        
        // Border with retro style
        this.ctx.strokeStyle = this.textColor;
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(barX, barY, barWidth, barHeight);
        
        // Time label
        this.ctx.fillStyle = this.textColor;
        this.ctx.font = '12px "Courier New", monospace';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('TIME REMAINING', this.canvas.width / 2, barY - 8);
    }    drawEffects() {
        // Draw hit effects
        this.hitEffects.forEach(effect => {
            this.ctx.fillStyle = `rgba(${effect.color}, ${effect.alpha})`;
            this.ctx.font = `bold ${effect.size}px "Courier New", monospace`;
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText(effect.text, effect.x, effect.y);
        });

        // Draw particles
        this.particles.forEach(particle => {
            this.ctx.fillStyle = `rgba(${particle.color}, ${particle.alpha})`;
            this.ctx.fillRect(particle.x, particle.y, particle.size, particle.size);
        });
    }drawPauseOverlay() {
        // Semi-transparent background
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        
        // Pause box - maior para melhor espaçamento
        this.drawRetroBox(centerX - 180, centerY - 120, 360, 240, false);
        
        // Blinking PAUSED text
        if (this.pauseBlinkTimer > 0.5) {
            this.ctx.save();
            this.ctx.shadowColor = this.specialMoleColor;
            this.ctx.shadowBlur = 10;
            this.ctx.fillStyle = this.specialMoleColor;
            this.ctx.font = 'bold 40px "Courier New", monospace';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText('PAUSED', centerX, centerY - 60);
            this.ctx.restore();
        }
        
        // Linha divisória
        this.ctx.strokeStyle = this.specialMoleColor;
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.moveTo(centerX - 120, centerY - 25);
        this.ctx.lineTo(centerX + 120, centerY - 25);
        this.ctx.stroke();
        
        // Controles com melhor espaçamento
        this.ctx.fillStyle = this.textColor;
        this.ctx.font = '18px "Courier New", monospace';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText('PRESS P TO RESUME', centerX, centerY + 5);
        this.ctx.fillText('PRESS ESC TO QUIT', centerX, centerY + 30);
        
        // Linha divisória inferior
        this.ctx.strokeStyle = 'rgba(240, 240, 245, 0.3)';
        this.ctx.lineWidth = 1;
        this.ctx.beginPath();
        this.ctx.moveTo(centerX - 120, centerY + 50);
        this.ctx.lineTo(centerX + 120, centerY + 50);
        this.ctx.stroke();
        
        // Game stats durante pausa com melhor formatação
        this.ctx.fillStyle = 'rgba(240, 240, 245, 0.8)';
        this.ctx.font = '14px "Courier New", monospace';
        this.ctx.fillText(`CURRENT SCORE: ${this.score}`, centerX, centerY + 70);
        this.ctx.fillText(`TIME LEFT: ${this.timeLeft}s`, centerX, centerY + 90);
    }    drawGameOverOverlay() {
        // Calculate final stats
        const totalShots = this.stats.totalHits + this.stats.totalMisses;
        this.stats.accuracy = totalShots > 0 ? Math.round((this.stats.totalHits / totalShots) * 100) : 0;
        this.stats.gameTime = 60 - this.timeLeft;
        
        // Animated background
        this.ctx.fillStyle = `rgba(0, 0, 0, ${0.9 * this.gameOverAnimation})`;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        if (this.gameOverAnimation < 0.5) return;
        
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        
        // Main game over box - maior para melhor organização
        this.drawRetroBox(centerX - 250, centerY - 200, 500, 400, false);
        
        // GAME OVER title com melhor posicionamento
        this.ctx.save();
        this.ctx.shadowColor = '#ff4444';
        this.ctx.shadowBlur = 20;
        this.ctx.fillStyle = '#ff4444';
        this.ctx.font = 'bold 48px "Courier New", monospace';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText('GAME OVER', centerX, centerY - 160);
        this.ctx.restore();
        
        // Linha divisória superior
        this.ctx.strokeStyle = '#ff4444';
        this.ctx.lineWidth = 3;
        this.ctx.beginPath();
        this.ctx.moveTo(centerX - 200, centerY - 130);
        this.ctx.lineTo(centerX + 200, centerY - 130);
        this.ctx.stroke();
        
        // Final Score com destaque
        this.ctx.fillStyle = this.textColor;
        this.ctx.font = 'bold 28px "Courier New", monospace';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText(`FINAL SCORE: ${this.score}`, centerX, centerY - 100);
        
        // Performance rating logo abaixo do score
        const rating = this.getPerformanceRating();
        this.ctx.fillStyle = rating.color;
        this.ctx.font = 'bold 22px "Courier New", monospace';
        this.ctx.fillText(`RATING: ${rating.text}`, centerX, centerY - 70);
        
        // Linha divisória das estatísticas
        this.ctx.strokeStyle = 'rgba(240, 240, 245, 0.5)';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.moveTo(centerX - 180, centerY - 45);
        this.ctx.lineTo(centerX + 180, centerY - 45);
        this.ctx.stroke();
        
        // Statistics header
        this.ctx.fillStyle = this.specialMoleColor;
        this.ctx.font = 'bold 18px "Courier New", monospace';
        this.ctx.fillText('━━━━━━ STATISTICS ━━━━━━', centerX, centerY - 20);
        
        // Detailed stats em duas colunas para melhor organização
        this.ctx.fillStyle = this.textColor;
        this.ctx.font = '16px "Courier New", monospace';
        this.ctx.textAlign = 'left';
        
        const leftCol = centerX - 120;
        const rightCol = centerX + 20;
        const statsStartY = centerY + 10;
        
        // Coluna esquerda
        this.ctx.fillText(`LEVEL REACHED:`, leftCol, statsStartY);
        this.ctx.fillText(`LONGEST COMBO:`, leftCol, statsStartY + 25);
        this.ctx.fillText(`TOTAL HITS:`, leftCol, statsStartY + 50);
        this.ctx.fillText(`ACCURACY:`, leftCol, statsStartY + 75);
        
        // Coluna direita (valores)
        this.ctx.textAlign = 'right';
        this.ctx.fillStyle = this.specialMoleColor;
        this.ctx.fillText(`${this.level}`, rightCol + 100, statsStartY);
        this.ctx.fillText(`${this.maxCombo}`, rightCol + 100, statsStartY + 25);
        this.ctx.fillText(`${this.stats.totalHits}`, rightCol + 100, statsStartY + 50);
        this.ctx.fillText(`${this.stats.accuracy}%`, rightCol + 100, statsStartY + 75);
        
        // Segunda linha de stats
        this.ctx.textAlign = 'left';
        this.ctx.fillStyle = this.textColor;
        this.ctx.fillText(`SPECIAL MOLES:`, leftCol, statsStartY + 100);
        this.ctx.fillText(`GAME TIME:`, leftCol, statsStartY + 125);
        
        this.ctx.textAlign = 'right';
        this.ctx.fillStyle = this.specialMoleColor;
        this.ctx.fillText(`${this.stats.specialMolesHit}`, rightCol + 100, statsStartY + 100);
        this.ctx.fillText(`${this.stats.gameTime}s`, rightCol + 100, statsStartY + 125);
        
        // Linha divisória inferior
        this.ctx.strokeStyle = 'rgba(240, 240, 245, 0.3)';
        this.ctx.lineWidth = 1;
        this.ctx.beginPath();
        this.ctx.moveTo(centerX - 180, centerY + 155);
        this.ctx.lineTo(centerX + 180, centerY + 155);
        this.ctx.stroke();
        
        // Continue prompt com destaque
        this.ctx.save();
        this.ctx.shadowColor = this.specialMoleColor;
        this.ctx.shadowBlur = 8;
        this.ctx.fillStyle = this.specialMoleColor;
        this.ctx.font = 'bold 18px "Courier New", monospace';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText('PRESS SPACE FOR MENU', centerX, centerY + 175);
        this.ctx.restore();
    }

    getPerformanceRating() {
        const score = this.score;
        const accuracy = this.stats.accuracy;
        const combo = this.maxCombo;
        
        if (score >= 1000 && accuracy >= 90 && combo >= 20) {
            return { text: 'LEGENDARY', color: '#ffd700' };
        } else if (score >= 700 && accuracy >= 80 && combo >= 15) {
            return { text: 'MASTER', color: '#ff6b6b' };
        } else if (score >= 500 && accuracy >= 70 && combo >= 10) {
            return { text: 'EXPERT', color: '#4ecdc4' };
        } else if (score >= 300 && accuracy >= 60) {
            return { text: 'SKILLED', color: '#45b7d1' };
        } else if (score >= 150) {
            return { text: 'NOVICE', color: '#96ceb4' };
        } else {
            return { text: 'BEGINNER', color: '#ffeaa7' };
        }
    }    // --- Event Handlers ---
    handleCanvasClick(event) {
        const rect = this.canvas.getBoundingClientRect();
        const clickX = event.clientX - rect.left;
        const clickY = event.clientY - rect.top;

        switch (this.gameState) {
            case 'menu':
                this.start();
                break;
            case 'playing':
                this.handleGameClick(clickX, clickY);
                break;
            case 'gameOver':
                this.returnToMenu();
                break;
        }
    }

    handleMouseMove(event) {
        if (this.gameState !== 'menu') return;
        
        const rect = this.canvas.getBoundingClientRect();
        const mouseX = event.clientX - rect.left;
        const mouseY = event.clientY - rect.top;
        
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        
        // Check if hovering over start button
        if (mouseX >= centerX - 100 && mouseX <= centerX + 100 &&
            mouseY >= centerY + 80 && mouseY <= centerY + 120) {
            this.canvas.style.cursor = 'pointer';
        } else {
            this.canvas.style.cursor = 'default';
        }
    }

    returnToMenu() {
        this.gameState = 'menu';
        this.gameRunning = false;
        this.gameOverAnimation = 0;
        AuraGameSDK.audio.stop();
        
        // Start menu loop if not already running
        if (!this.animationFrameId) {
            this.gameLoop(performance.now());
        }
    }

    handleGameClick(clickX, clickY) {
        let hitMole = false;

        // Check if click hit any active mole
        for (let i = this.moles.length - 1; i >= 0; i--) {
            const mole = this.moles[i];
            if (!mole.active || mole.animationPhase === 'disappearing') continue;

            const hole = this.holes[mole.holeIndex];
            const moleRadius = hole.radius * 0.7;
            const distance = Math.sqrt(Math.pow(clickX - hole.x, 2) + Math.pow(clickY - hole.y, 2));

            if (distance < moleRadius) {
                this.hitMole(mole, hole.x, hole.y);
                this.moles.splice(i, 1);
                hitMole = true;
                break; // Only hit one mole per click
            }
        }

        if (!hitMole) {
            this.missMole(clickX, clickY);
        }
    }    handleKeyPress(event) {
        switch (event.key.toLowerCase()) {
            case 'p':
                if (this.gameState === 'playing') {
                    this.pause();
                } else if (this.gameState === 'paused') {
                    this.resume();
                }
                break;
            case 'escape':
                if (this.gameState === 'playing' || this.gameState === 'paused') {
                    this.stop();
                    this.returnToMenu();
                }
                break;
            case ' ':
            case 'enter':
                if (this.gameState === 'menu') {
                    this.start();
                } else if (this.gameState === 'gameOver') {
                    this.returnToMenu();
                }
                break;
        }
        
        // Prevent default behavior for game keys
        if (['p', 'escape', ' ', 'enter'].includes(event.key.toLowerCase())) {
            event.preventDefault();
        }
    }    hitMole(mole, x, y) {
        // Calculate score
        let points = mole.special ? this.specialMoleScore : this.baseScore;
        
        // Apply combo multiplier
        this.combo++;
        this.maxCombo = Math.max(this.maxCombo, this.combo);
        this.comboMultiplier = 1 + (this.combo - 1) * 0.1; // 10% increase per combo
        points = Math.floor(points * this.comboMultiplier);
        
        this.score += points;

        // Update statistics
        this.stats.totalHits++;
        if (mole.special) {
            this.stats.specialMolesHit++;
        }
        this.stats.longestCombo = Math.max(this.stats.longestCombo, this.combo);// Show combo notifications for special achievements
        if (this.combo === 5) {
            AuraGameSDK.ui.showSuccess("Nice Combo! 5 hits", { duration: 1800 });
        } else if (this.combo === 10) {
            AuraGameSDK.ui.showSuccess("Great! 10 combo", { duration: 2000 });
        } else if (this.combo === 20) {
            AuraGameSDK.ui.showSuccess("Amazing! 20 combo streak", { duration: 2500 });
        } else if (this.combo % 25 === 0 && this.combo > 20) {
            AuraGameSDK.ui.showSuccess(`Outstanding ${this.combo} combo!`, { duration: 2500 });
        }

        // Special mole notification
        if (mole.special) {
            AuraGameSDK.ui.showInfo(`Special +${points}`, { duration: 1200 });
        }

        // Create hit effect
        this.createHitEffect(x, y, points, mole.special);
        this.createParticles(x, y, mole.special);

        // Play sound
        AuraGameSDK.audio.playSfx('gameassets/sounds/whack_hit.wav');
        
        console.log(`Mole hit! Points: ${points}, Combo: ${this.combo}`);
    }    missMole(x, y) {
        // Show combo broken notification if it was significant
        if (this.combo >= 8) {
            AuraGameSDK.ui.showWarning(`Combo broken at ${this.combo}`, { duration: 1800 });
        }
        
        // Reset combo
        if (this.combo > 0) {
            this.combo = 0;
            this.comboMultiplier = 1;
        }

        // Update statistics
        this.stats.totalMisses++;

        // Create miss effect
        this.createMissEffect(x, y);
        
        // Play miss sound
        AuraGameSDK.audio.playSfx('gameassets/sounds/whack_miss.wav');
        
        console.log("Whack missed!");
    }

    createHitEffect(x, y, points, isSpecial) {
        this.hitEffects.push({
            x: x,
            y: y,
            text: `+${points}`,
            size: isSpecial ? 32 : 24,
            color: isSpecial ? '138, 99, 210' : '255, 255, 255',
            alpha: 1,
            life: 1000,
            maxLife: 1000
        });
    }

    createMissEffect(x, y) {
        this.hitEffects.push({
            x: x,
            y: y,
            text: 'MISS',
            size: 20,
            color: '255, 68, 68',
            alpha: 1,
            life: 800,
            maxLife: 800
        });
    }

    createParticles(x, y, isSpecial) {
        const particleCount = isSpecial ? 12 : 8;
        const colors = isSpecial ? 
            ['138, 99, 210', '160, 130, 255', '255, 255, 255'] :
            ['255, 99, 71', '255, 140, 0', '255, 215, 0'];

        for (let i = 0; i < particleCount; i++) {
            const angle = (Math.PI * 2 * i) / particleCount;
            const speed = 2 + Math.random() * 3;
            
            this.particles.push({
                x: x,
                y: y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - 2, // Initial upward velocity
                size: 3 + Math.random() * 3,
                color: colors[Math.floor(Math.random() * colors.length)],
                alpha: 1,
                life: 800 + Math.random() * 400,
                maxLife: 800 + Math.random() * 400
            });
        }
    }

    triggerHitEffect(x, y) {
        // This method is kept for backward compatibility but functionality moved to createHitEffect
        console.log("Hit effect triggered at", x, y);
    }

    // Complete cleanup method for when switching games or closing
    destroy() {
        console.log("AuraWhack: Destroying game instance...");
        
        // Stop the game first
        this.stop();
        
        // Additional cleanup for complete destruction
        this.canvas.style.cursor = 'default';
        
        // Clear the canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Reset all properties to prevent any lingering references
        this.moles = [];
        this.holes = [];
        this.particles = [];
        this.hitEffects = [];
        this.moleAnimations.clear();
        
        // Reset stats
        this.stats = {
            totalHits: 0,
            totalMisses: 0,
            specialMolesHit: 0,
            longestCombo: 0,
            accuracy: 0,
            gameTime: 0
        };
        
        // Reset scores and state
        this.score = 0;
        this.timeLeft = 60;
        this.level = 1;
        this.combo = 0;
        this.maxCombo = 0;
        this.comboMultiplier = 1;
        
        console.log("AuraWhack: Game instance completely destroyed!");
    }
}

// Expose the class to the window object
window.AuraWhackGame = AuraWhackGame;
