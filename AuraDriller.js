/**
 * @file AuraDriller.js
 * Implements the AuraDriller game for AuraOS - MVP Version
 * 
 * A deep-drilling mining adventure where players control an astronaut
 * drilling through layers of colored blocks while managing oxygen.
 */

class AuraDrillerGame {
    /**
     * Constructs the AuraDrillerGame instance.
     * @param {HTMLCanvasElement} canvas - The canvas element for the game.
     * @param {Function} [onExit] - Optional callback provided by GameCenter to handle quitting.
     */
    constructor(canvas, onExit) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.gameRunning = false;
        this.gamePaused = false;
        this.gameInterval = null;
        this.onExitCallback = onExit || null;

        // Initialize SDK
        if (typeof AuraGameSDK !== 'undefined' && AuraGameSDK) {
            AuraGameSDK.init('aura-driller', this.canvas);
        } else {
            console.warn('AuraGameSDK not found. Some features may be limited.');
        }

        // Setup canvas for optimal rendering
        this.setupCanvas();
        
        // Game constants - optimized for MVP
        this.blockSize = Math.max(24, Math.min(32, Math.floor(this.canvas.width / 16)));
        this.gridWidth = Math.floor(this.canvas.width / this.blockSize);
        this.gridHeight = Math.floor(this.canvas.height / this.blockSize) + 20;
        this.targetDepth = 100; // Reasonable target for MVP
        
        // Ensure playable grid dimensions
        if (this.gridWidth < 8) {
            this.blockSize = Math.floor(this.canvas.width / 8);
            this.gridWidth = 8;
        }
        if (this.gridHeight < 15) {
            this.gridHeight = 20;
        }

        // Game state
        this.grid = [];
        this.player = {
            x: Math.floor(this.gridWidth / 2),
            y: 0, // Current depth in terms of blocks drilled from the initial surface
            visualX: Math.floor(this.gridWidth / 2) * this.blockSize, // For smooth horizontal movement
            visualY: this.blockSize,
            oxygen: 100,
            maxOxygen: 100,
            score: 0,
            depth: 0,
            isDrilling: false,
            drillParticles: [],
            movingLeft: false,
            movingRight: false
        };
        this.currentScrollOffset = 0; // How much the grid has scrolled up in pixels
        this.lowOxygenNotified = false;

        // Input handling
        this.keys = {};
        this.drillCooldownTimer = 0;
        this.drillCooldownTime = 120; // ms between drills (faster drill)

        // Falling block mechanics
        this.fallingBlocks = [];
        this.fallCheckDelay = 300; // ms before unsupported blocks start to fall (shorter delay)
        this.fallSpeed = 6; // pixels per frame for falling blocks

        // Particle effects
        this.particles = [];

        // Assets and visuals
        this.blockImages = {};
        this.playerSprite = null;
        this.oxygenCapsuleImage = null;
        this.drillSparkImage = null;
        this.blockParticlesImage = null;
        this.backgroundColor = '#120c1c'; // AuraOS dark purple
        
        // Player sprite animation
        this.playerSpriteSize = 1024; // Original sprite size
        this.playerFrameSize = Math.floor(this.playerSpriteSize / 3); // Each frame is 341x341
        this.playerCurrentFrame = 0;
        this.playerAnimationTimer = 0;
        this.playerAnimationSpeed = 10; // Frames between sprite changes
        
        // Block colors for fallback
        this.blockColors = {
            'blue': '#4a90e2',
            'cyan': '#63d2b3', 
            'green': '#27c93f',
            'magenta': '#8a63d2',
            'red': '#ff5f56',
            'yellow': '#ffbd2e'
        };

        this._loadAssets();
        this._setupTheming();

        // Bind event listeners
        this._boundKeyDown = this._handleKeyDown.bind(this);
        this._boundKeyUp = this._handleKeyUp.bind(this);
    }

    /**
     * Setup canvas for optimal rendering
     */
    setupCanvas() {
        // Ensure canvas has reasonable minimum dimensions
        if (this.canvas.width < 320) this.canvas.width = 320;
        if (this.canvas.height < 240) this.canvas.height = 240;
        
        // Set canvas style to prevent blurring
        this.canvas.style.imageRendering = 'pixelated';
        this.canvas.style.imageRendering = 'crisp-edges';
        
        // Ensure 2D context is crisp
        this.ctx.imageSmoothingEnabled = false;
    }

    _setupTheming() {
        // Use fixed colors for consistency in MVP
        this.playerColor = '#f0f0f5';
        this.drillColor = '#b0a8d9';
        this.oxygenCapsuleColor = 'rgba(100, 200, 255, 0.9)';
        
        // Ensure colors are available even without CSS
        const colorKeys = Object.keys(this.blockColors);
        if (colorKeys.length === 0) {
            this.blockColors = {
                'blue': '#4a90e2',
                'cyan': '#63d2b3', 
                'green': '#27c93f',
                'magenta': '#8a63d2',
                'red': '#ff5f56',
                'yellow': '#ffbd2e'
            };
        }
    }

    /**
     * Starts the game.
     */
    start() {
        if (this.gameRunning) return;
        this.gameRunning = true;
        this.gamePaused = false;
        this._setupTheming(); // Re-apply theme colors in case they changed

        this.player = {
            x: Math.floor(this.gridWidth / 2),
            y: 0,
            visualX: Math.floor(this.gridWidth / 2) * this.blockSize,
            visualY: this.blockSize,
            oxygen: 100,
            maxOxygen: 100,
            score: 0,
            depth: 0,
            isDrilling: false,
            drillParticles: [],
            movingLeft: false,
            movingRight: false
        };
        this.currentScrollOffset = 0;
        this.fallingBlocks = [];
        this.particles = [];
        this.keys = {};
        this.lowOxygenNotified = false;

        this.initializeGrid();

        document.addEventListener('keydown', this._boundKeyDown);
        document.addEventListener('keyup', this._boundKeyUp);

        this.gameInterval = setInterval(() => {
            if (!this.gamePaused) {
                this.updateGame();
                this.draw();
            }
        }, 1000 / 60); // 60 FPS

        // Play background music
        if (AuraGameSDK && AuraGameSDK.audio) {
            AuraGameSDK.audio.playLoopMusic('gameassets/auradriller/music/auradriller_bgm.mp3', 0.6);
        }
        console.log('AuraDriller started!');
    }

    /**
     * Stops the game.
     */
    stop(quitToMenu = false) {
        if (!this.gameRunning && !quitToMenu) return; // Allow stop to be called for quitting even if not "running"
        this.gameRunning = false;
        clearInterval(this.gameInterval);
        this.gameInterval = null;

        document.removeEventListener('keydown', this._boundKeyDown);
        document.removeEventListener('keyup', this._boundKeyUp);

        if (AuraGameSDK && AuraGameSDK.audio) {
            AuraGameSDK.audio.stop();
        }
        console.log('AuraDriller stopped!');
    }

    isRunning() { return this.gameRunning; }

    pause() {
        if (!this.gameRunning || this.gamePaused) return;
        this.gamePaused = true;
        if (AuraGameSDK && AuraGameSDK.audio) {
            AuraGameSDK.audio.pause();
        }
        console.log('AuraDriller paused');
    }

    resume() {
        if (!this.gameRunning || !this.gamePaused) return;
        this.gamePaused = false;
        if (AuraGameSDK && AuraGameSDK.audio) {
            AuraGameSDK.audio.resume();
        }
        // Re-focus canvas if needed, though GameCenter usually handles this.
        if (this.canvas && typeof this.canvas.focus === 'function') {
            this.canvas.focus();
        }
        console.log('AuraDriller resumed');
    }

    restart() {
        this.stop();
        // Ensure canvas is available for the new game instance
        if (!this.canvas) {
            console.error("AuraDriller: Canvas not available for restart.");
            return;
        }
        // A short delay can help ensure the old instance is fully cleaned up
        // and the SDK/UI is ready for a new game instance.
        setTimeout(() => {
            // Re-initialize or create a new instance if necessary.
            // For simplicity, we'll re-call start which resets state.
            this.start();
        }, 100);
    }

    initializeGrid() {
        this.grid = [];
        const colorValues = Object.values(this.blockColors);
        
        for (let r = 0; r < this.gridHeight; r++) {
            const row = [];
            for (let c = 0; c < this.gridWidth; c++) {
                if (r < 3) { // Initial empty space
                    row.push(null);
                } else {
                    const isOxygenCapsule = Math.random() < 0.04; // Balanced oxygen chance
                    if (isOxygenCapsule) {
                        row.push({ 
                            type: 'oxygen', 
                            color: this.oxygenCapsuleColor, 
                            id: `block-${r}-${c}`, 
                            visualState: 'normal' 
                        });
                    } else {
                        row.push({
                            type: 'normal',
                            color: colorValues[Math.floor(Math.random() * colorValues.length)],
                            id: `block-${r}-${c}`,
                            visualState: 'normal'
                        });
                    }
                }
            }
            this.grid.push(row);
        }
    }

    drawGrid() {
        const startRow = Math.floor(this.currentScrollOffset / this.blockSize);
        const offsetY = this.currentScrollOffset % this.blockSize;
        const visibleRows = Math.ceil(this.canvas.height / this.blockSize) + 2; // +2 for smooth scrolling

        for (let r = 0; r < visibleRows; r++) {
            const actualRowIndex = startRow + r;
            if (actualRowIndex < 0 || actualRowIndex >= this.grid.length) continue;

            const row = this.grid[actualRowIndex];
            for (let c = 0; c < this.gridWidth; c++) {
                const block = row[c];
                if (block) {
                    const x = c * this.blockSize;
                    const y = r * this.blockSize - offsetY;
                    
                    // Only draw blocks that are visible on screen
                    if (y > -this.blockSize && y < this.canvas.height && x >= 0 && x < this.canvas.width) {
                        if (block.visualState === 'breaking') {
                            const animProgress = (Date.now() - block.breakStartTime) / 150; // Faster break
                            if (animProgress >= 1) {
                                this.grid[actualRowIndex][c] = null;
                                continue;
                            }
                            this.ctx.save();
                            this.ctx.globalAlpha = 1 - animProgress;
                            this.ctx.fillStyle = block.color;
                            this.ctx.fillRect(x + (this.blockSize * animProgress / 2), y + (this.blockSize * animProgress / 2),
                                              this.blockSize * (1 - animProgress), this.blockSize * (1 - animProgress));
                            this.ctx.restore();
                        } else if (block.type === 'oxygen') {
                            // Draw oxygen capsule with image if available, fallback to colored rect
                            if (this.oxygenCapsuleImage && this.oxygenCapsuleImage.complete) {
                                this.ctx.drawImage(this.oxygenCapsuleImage, x, y, this.blockSize, this.blockSize);
                            } else {
                                this.ctx.fillStyle = block.color;
                                this.ctx.fillRect(x + 2, y + 2, this.blockSize - 4, this.blockSize - 4);
                                this.ctx.fillStyle = '#ffffff';
                                this.ctx.font = `bold ${Math.max(8, this.blockSize * 0.35)}px Arial`;
                                this.ctx.textAlign = 'center';
                                this.ctx.textBaseline = 'middle';
                                this.ctx.fillText('O₂', x + this.blockSize / 2, y + this.blockSize / 2);
                            }
                        } else {
                            // Draw normal block with image if available, fallback to colored rect
                            const blockType = this.getBlockTypeFromColor(block.color);
                            const blockImage = this.blockImages[blockType];
                            
                            if (blockImage && blockImage.complete) {
                                this.ctx.drawImage(blockImage, x, y, this.blockSize, this.blockSize);
                            } else {
                                this.ctx.fillStyle = block.color;
                                this.ctx.fillRect(x, y, this.blockSize, this.blockSize);
                            }
                        }
                        
                        // Draw border for better visibility
                        if (block.visualState !== 'breaking') {
                            this.ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
                            this.ctx.lineWidth = 1;
                            this.ctx.strokeRect(x + 0.5, y + 0.5, this.blockSize - 1, this.blockSize - 1);
                        }
                    }
                }
            }
        }
    }

    drawPlayer() {
        // Smooth horizontal movement
        this.player.visualX += (this.player.x * this.blockSize - this.player.visualX) * 0.3;

        const playerScreenX = Math.max(0, Math.min(this.canvas.width - this.blockSize, this.player.visualX));
        const playerScreenY = this.player.visualY;

        // Ensure player stays within canvas bounds
        if (playerScreenX < 0 || playerScreenX + this.blockSize > this.canvas.width) {
            return; // Skip drawing if player would be outside bounds
        }

        // Player Body - use sprite if available, fallback to rectangle
        if (this.playerSprite && this.playerSprite.complete) {
            // Update animation based on player state
            this.updatePlayerAnimation();
            
            // Calculate sprite position on spritesheet (3x3 grid)
            const col = this.playerCurrentFrame % 3;
            const row = Math.floor(this.playerCurrentFrame / 3);
            const spriteX = col * this.playerFrameSize;
            const spriteY = row * this.playerFrameSize;
            
            // Draw the current frame from spritesheet
            this.ctx.drawImage(
                this.playerSprite,
                spriteX, spriteY, this.playerFrameSize, this.playerFrameSize, // Source rectangle
                playerScreenX, playerScreenY, this.blockSize, this.blockSize  // Destination rectangle
            );
        } else {
            this.ctx.fillStyle = this.playerColor;
            this.ctx.fillRect(playerScreenX, playerScreenY, this.blockSize, this.blockSize);
            this.ctx.strokeStyle = 'rgba(138, 99, 210, 0.8)';
            this.ctx.lineWidth = 2;
            this.ctx.strokeRect(playerScreenX + 1, playerScreenY + 1, this.blockSize - 2, this.blockSize - 2);
        }

        // Drill Bit (more detailed) - ensure it doesn't go outside canvas
        const drillTipY = playerScreenY + this.blockSize * 1.6;
        if (drillTipY < this.canvas.height) {
            this.ctx.fillStyle = this.drillColor;
            this.ctx.beginPath();
            this.ctx.moveTo(playerScreenX + this.blockSize * 0.2, playerScreenY + this.blockSize);
            this.ctx.lineTo(playerScreenX + this.blockSize * 0.8, playerScreenY + this.blockSize);
            this.ctx.lineTo(playerScreenX + this.blockSize * 0.5, Math.min(drillTipY, this.canvas.height - 5));
            this.ctx.closePath();
            this.ctx.fill();
        }

        // Drilling particles
        if (this.player.isDrilling) {
            this.player.drillParticles.forEach((p, index) => {
                p.y += p.vy;
                p.x += p.vx;
                p.life--;
                if (p.life <= 0) this.player.drillParticles.splice(index, 1);
                else {
                    const particleX = p.x;
                    const particleY = p.y - this.currentScrollOffset + playerScreenY + this.blockSize;
                    
                    // Only draw particles within canvas bounds
                    if (particleX >= 0 && particleX <= this.canvas.width && 
                        particleY >= 0 && particleY <= this.canvas.height) {
                        this.ctx.fillStyle = p.colorAlpha || `rgba(220, 220, 200, ${p.life / p.initialLife})`;
                        this.ctx.beginPath();
                        this.ctx.arc(particleX, particleY, p.size, 0, Math.PI * 2);
                        this.ctx.fill();
                    }
                }
            });
        }
    }

    drawParticles() {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.alpha -= p.fade;
            p.size *= 0.98; // Shrink

            if (p.alpha <= 0 || p.size < 0.5) {
                this.particles.splice(i, 1);
            } else {
                this.ctx.beginPath();
                this.ctx.arc(p.x, p.y - this.currentScrollOffset, p.size, 0, Math.PI * 2);
                this.ctx.fillStyle = `rgba(${p.r}, ${p.g}, ${p.b}, ${p.alpha})`;
                this.ctx.fill();
            }
        }
    }


    drawUI() {
        // Dynamic font sizes based on canvas size
        const baseFontSize = Math.max(12, Math.min(18, this.canvas.width / 30));
        const smallFontSize = Math.max(10, Math.min(14, this.canvas.width / 40));
        
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = `bold ${baseFontSize}px Arial`;
        this.ctx.textAlign = 'left';
        this.ctx.textBaseline = 'top';

        // Text shadow for better readability
        this.ctx.shadowColor = 'rgba(0,0,0,0.7)';
        this.ctx.shadowBlur = 2;
        this.ctx.shadowOffsetX = 1;
        this.ctx.shadowOffsetY = 1;

        this.ctx.fillText(`Score: ${this.player.score}`, 15, 15);
        this.ctx.fillText(`Depth: ${this.player.depth}m / ${this.targetDepth}m`, 15, 15 + baseFontSize + 5);

        this.ctx.shadowColor = 'transparent';

        // Oxygen bar - responsive sizing
        const oxygenBarMaxWidth = Math.min(180, this.canvas.width * 0.25);
        const oxygenBarHeight = Math.max(20, Math.min(25, this.canvas.height * 0.04));
        const oxygenBarX = this.canvas.width - oxygenBarMaxWidth - 15;
        const oxygenBarY = 15;
        const barRadius = 6;

        // Oxygen bar background
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        this.ctx.fillRect(oxygenBarX, oxygenBarY, oxygenBarMaxWidth, oxygenBarHeight);

        // Oxygen bar fill
        const oxygenPercent = Math.max(0, this.player.oxygen / this.player.maxOxygen);
        const currentOxygenWidth = oxygenPercent * oxygenBarMaxWidth;
        
        // Color gradient based on oxygen level
        let oxygenColor;
        if (oxygenPercent > 0.6) {
            oxygenColor = '#27c93f'; // Green
        } else if (oxygenPercent > 0.3) {
            oxygenColor = '#ffbd2e'; // Yellow
        } else {
            oxygenColor = '#ff5f56'; // Red
        }
        
        this.ctx.fillStyle = oxygenColor;
        this.ctx.fillRect(oxygenBarX, oxygenBarY, currentOxygenWidth, oxygenBarHeight);

        // Oxygen bar border
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(oxygenBarX, oxygenBarY, oxygenBarMaxWidth, oxygenBarHeight);

        // Oxygen label
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = `bold ${smallFontSize}px Arial`;
        this.ctx.textAlign = 'center';
        this.ctx.shadowColor = 'rgba(0,0,0,0.8)';
        this.ctx.shadowBlur = 2;
        this.ctx.fillText(`OXYGEN ${Math.floor(this.player.oxygen)}%`, 
                         oxygenBarX + oxygenBarMaxWidth / 2, 
                         oxygenBarY + oxygenBarHeight / 2 + 4);
        this.ctx.shadowColor = 'transparent';
    }

    /**
     * Draw pause screen
     */
    drawPauseScreen() {
        if (!this.gamePaused) return;
        
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        this.ctx.fillStyle = '#8a63d2';
        this.ctx.font = `bold ${Math.min(24, this.canvas.width / 15)}px 'Inter', sans-serif`;
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText('PAUSED', this.canvas.width / 2, this.canvas.height / 2 - 20);
        
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = `${Math.min(14, this.canvas.width / 25)}px 'Inter', sans-serif`;
        this.ctx.fillText('Press ESC to resume', this.canvas.width / 2, this.canvas.height / 2 + 20);
    }

    /**
     * Main draw function
     */
    draw() {
        // Clear canvas with background
        this.ctx.fillStyle = this.backgroundColor;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        if (this.gameRunning) {
            this.drawGrid();
            this.drawPlayer();
            this.drawParticles();
            this.drawFallingBlocks();
            this.drawUI();
            
            if (this.gamePaused) {
                this.drawPauseScreen();
            }
        }
    }

    updateGame() {
        if (!this.gameRunning || this.gamePaused) return;
        const now = Date.now();

        this.handlePlayerActions(now);

        // Oxygen depletion - balanced for MVP
        this.player.oxygen -= 0.025; // Slower depletion for better gameplay
        if (this.player.oxygen <= 0) {
            this.player.oxygen = 0;
            this.gameOver('Out of Oxygen');
            return;
        }
        
        // Low oxygen warning
        if (this.player.oxygen < 25 && !this.lowOxygenNotified) {
            if (AuraGameSDK && AuraGameSDK.audio) {
                AuraGameSDK.audio.playSfx('gameassets/auradriller/sounds/sfx_low_oxygen_warning.wav', 0.8);
            }
            if (AuraGameSDK && AuraGameSDK.ui) {
                AuraGameSDK.ui.showNotification({ 
                    message: 'Oxygen Critical!', 
                    type: 'error', 
                    duration: 2500 
                });
            }
            this.lowOxygenNotified = true;
        } else if (this.player.oxygen >= 30) {
            this.lowOxygenNotified = false;
        }

        this.updateFallingBlocks(now);
        this.initiateFallingBlocks(now);
        this.checkCollisions();

        // Extend grid when needed
        const playerVisualGridTop = Math.floor(this.currentScrollOffset / this.blockSize);
        if (playerVisualGridTop > this.grid.length - (this.canvas.height / this.blockSize) * 2) {
            this.extendGrid();
        }

        // Win condition
        if (this.player.depth >= this.targetDepth) {
            this.gameWin();
        }
    }

    handlePlayerActions(currentTime) {
        if (this.drillCooldownTimer > 0) {
            this.drillCooldownTimer -= (1000 / 60);
        }

        // Reset movement states
        this.player.movingLeft = false;
        this.player.movingRight = false;

        let targetVisualX = this.player.x * this.blockSize;
        if (this.keys['ArrowLeft'] || this.keys['a'] || this.keys['A']) {
            if (this.player.x > 0) {
                this.player.x--;
                this.player.movingLeft = true;
            }
        }
        if (this.keys['ArrowRight'] || this.keys['d'] || this.keys['D']) {
            if (this.player.x < this.gridWidth - 1) {
                this.player.x++;
                this.player.movingRight = true;
            }
        }
        // Player horizontal movement is now continuous if key is held, visualX smooths it

        if ((this.keys['ArrowDown'] || this.keys['s'] || this.keys[' ']) && this.drillCooldownTimer <= 0) {
            this.drillBlock();
            this.drillCooldownTimer = this.drillCooldownTime;
            // For continuous drilling if held, don't clear keys here.
            // If single drill per press:
            // this.keys['ArrowDown'] = false; this.keys['s'] = false; this.keys[' '] = false;
        }
    }

    drillBlock() {
        const drillEffectiveRow = Math.floor(this.currentScrollOffset / this.blockSize) + 1;
        const drillCol = this.player.x;

        if (drillEffectiveRow >= this.grid.length || drillCol < 0 || drillCol >= this.gridWidth) {
            return;
        }

        const blockToDrill = this.grid[drillEffectiveRow][drillCol];

        if (blockToDrill && blockToDrill.visualState !== 'breaking') {
            // Play drill sound
            if (AuraGameSDK && AuraGameSDK.audio) {
                AuraGameSDK.audio.playSfx('gameassets/auradriller/sounds/drill.wav', 0.7);
            }

            if (blockToDrill.type === 'oxygen') {
                // Oxygen pickup
                this.player.oxygen = Math.min(this.player.maxOxygen, this.player.oxygen + 25);
                this.player.score += 50; // Bonus for oxygen
                
                if (AuraGameSDK && AuraGameSDK.audio) {
                    AuraGameSDK.audio.playSfx('gameassets/auradriller/sounds/oxygen_pickup.wav', 0.8);
                }
                if (AuraGameSDK && AuraGameSDK.ui) {
                    AuraGameSDK.ui.showNotification({ 
                        message: 'Oxygen +25!', 
                        type: 'success', 
                        duration: 1500 
                    });
                }
            } else {
                // Normal block drilling
                this.player.oxygen -= 0.5; // Drilling cost
                this.player.score += 10;
                
                if (AuraGameSDK && AuraGameSDK.audio) {
                    AuraGameSDK.audio.playSfx('gameassets/auradriller/sounds/block_break.wav', 0.6);
                }
            }

            // Start breaking animation
            blockToDrill.visualState = 'breaking';
            blockToDrill.breakStartTime = Date.now();

            // Create drill particles
            this.createDrillParticles(blockToDrill);

            // Update depth and scroll
            this.player.depth++;
            this.currentScrollOffset += this.blockSize;
            this.player.y = Math.floor(this.currentScrollOffset / this.blockSize);
        }
    }

    createDrillParticles(block) {
        this.player.isDrilling = true;
        this.player.drillParticles = [];
        
        const particleCount = block.type === 'oxygen' ? 12 : 6;
        const particleBaseColor = block.type === 'oxygen' ? 
            {r: 100, g: 200, b: 255} : 
            this.hexToRgb(block.color);

        for(let i = 0; i < particleCount; i++) {
            this.player.drillParticles.push({
                x: (this.player.x + 0.5) * this.blockSize + (Math.random() - 0.5) * (this.blockSize * 0.6),
                y: this.player.visualY + this.blockSize * 1.5,
                vx: (Math.random() - 0.5) * 2.5,
                vy: Math.random() * 1.5 + 0.5,
                size: Math.random() * 2.5 + 1.5,
                life: Math.random() * 20 + 15,
                initialLife: Math.random() * 20 + 15,
                colorAlpha: particleBaseColor ? 
                    `rgba(${particleBaseColor.r}, ${particleBaseColor.g}, ${particleBaseColor.b}, 0.8)` : 
                    `rgba(200,200,200,0.7)`
            });
        }
        
        // Stop drilling animation after short duration
        setTimeout(() => this.player.isDrilling = false, 100);
    }


    extendGrid() {
        const rowsToExtend = 10;
        const colorValues = Object.values(this.blockColors);
        
        for (let i = 0; i < rowsToExtend; i++) {
            const newRowArray = [];
            const newRowIndexGlobal = this.grid.length;
            
            for (let c = 0; c < this.gridWidth; c++) {
                // Decrease oxygen chance as player goes deeper
                const depthFactor = Math.min(0.02, newRowIndexGlobal / (this.targetDepth * 5));
                const oxygenChance = Math.max(0.01, 0.04 - depthFactor);
                
                if (Math.random() < oxygenChance) {
                    newRowArray.push({ 
                        type: 'oxygen', 
                        color: this.oxygenCapsuleColor, 
                        id: `block-${newRowIndexGlobal}-${c}`, 
                        visualState: 'normal' 
                    });
                } else {
                    newRowArray.push({
                        type: 'normal',
                        color: colorValues[Math.floor(Math.random() * colorValues.length)],
                        id: `block-${newRowIndexGlobal}-${c}`,
                        visualState: 'normal'
                    });
                }
            }
            this.grid.push(newRowArray);
        }
        this.gridHeight = this.grid.length;
    }

    checkCollisions() {
        const playerHeadRow = Math.floor(this.currentScrollOffset / this.blockSize) + 1;
        const playerCol = this.player.x;

        for (let i = this.fallingBlocks.length - 1; i >= 0; i--) {
            const fb = this.fallingBlocks[i];
            const fbGridRow = Math.floor((fb.y + this.blockSize -1) / this.blockSize);
            const fbGridCol = fb.gridX;

            if (fbGridCol === playerCol && fbGridRow === playerHeadRow) {
                if (AuraGameSDK && AuraGameSDK.audio) {
                    AuraGameSDK.audio.playSfx('gameassets/auradriller/sounds/player_hit.wav', 0.8);
                }
                this.gameOver('Crushed by a falling block!');
                return;
            }
        }
    }

     isBlockSupported(r, c, visited = new Set()) {
        const key = `${r},${c}`;
        if (visited.has(key)) return false;
        visited.add(key);

        const block = this.grid[r]?.[c];
        if (!block || block.visualState === 'breaking') return true;

        if (r >= this.grid.length - 1) return true;
        if (this.grid[r + 1]?.[c] !== null && this.grid[r+1][c].visualState !== 'breaking') return true;

        if (c > 0 && this.grid[r]?.[c - 1]?.color === block.color && this.isBlockSupported(r, c - 1, visited)) return true;
        if (c < this.gridWidth - 1 && this.grid[r]?.[c + 1]?.color === block.color && this.isBlockSupported(r, c + 1, visited)) return true;

        return false;
    }

    initiateFallingBlocks(currentTime) {
        for (let r = this.grid.length - 2; r >= 0; r--) {
            for (let c = 0; c < this.gridWidth; c++) {
                const block = this.grid[r][c];
                if (block && block.visualState !== 'breaking' && !this.isBlockSupported(r, c, new Set())) {
                    const isAlreadyFalling = this.fallingBlocks.some(fb => fb.id === block.id);
                    if (!isAlreadyFalling) {
                        this.fallingBlocks.push({
                            gridX: c, y: r * this.blockSize, originalR: r, originalC: c,
                            color: block.color, fallStartTime: currentTime + this.fallCheckDelay,
                            id: block.id, visualState: 'falling'
                        });
                        this.grid[r][c] = null;
                    }
                }
            }
        }
    }

    updateFallingBlocks(currentTime) {
        for (let i = this.fallingBlocks.length - 1; i >= 0; i--) {
            const fb = this.fallingBlocks[i];
            if (currentTime < fb.fallStartTime) continue;

            fb.y += this.fallSpeed;
            // Add wobble/animation to falling blocks
            fb.visualXOffset = Math.sin(Date.now() / 100 + fb.originalR) * 2; // Gentle wobble

            const currentBlockBottomEdge = fb.y + this.blockSize;
            const landingRowCandidate = Math.floor(currentBlockBottomEdge / this.blockSize);
            const col = fb.gridX;

            let hasLanded = false;
            let finalLandingRow = -1;

            if (landingRowCandidate >= this.grid.length) {
                hasLanded = true;
                finalLandingRow = this.grid.length - 1;
            } else if (this.grid[landingRowCandidate]?.[col] !== null && this.grid[landingRowCandidate]?.[col]?.visualState !== 'breaking') {
                hasLanded = true;
                finalLandingRow = landingRowCandidate - 1;
            }

            if (hasLanded) {
                if (finalLandingRow < 0 || finalLandingRow >= this.grid.length || col < 0 || col >= this.gridWidth) {
                    this.fallingBlocks.splice(i, 1);
                    continue;
                }

                if (this.grid[finalLandingRow][col] === null) {
                    this.grid[finalLandingRow][col] = { type: fb.color === this.oxygenCapsuleColor ? 'oxygen' : 'normal', color: fb.color, id: fb.id, visualState: 'normal' };
                    this.handleChainReaction(finalLandingRow, col, fb.color);
                } else {
                    this.grid[finalLandingRow][col] = { type: fb.color === this.oxygenCapsuleColor ? 'oxygen' : 'normal', color: fb.color, id: fb.id, visualState: 'normal' };
                    this.handleChainReaction(finalLandingRow, col, fb.color);
                }

                this.fallingBlocks.splice(i, 1);
                if (AuraGameSDK && AuraGameSDK.audio) {
                    AuraGameSDK.audio.playSfx('gameassets/auradriller/sounds/block_land.wav', 0.6);
                }
                this.createLandingParticles(col * this.blockSize + this.blockSize / 2, (finalLandingRow + 1) * this.blockSize - this.currentScrollOffset, fb.color);
            }
        }
    }

    /**
     * Draw falling blocks
     */
    drawFallingBlocks() {
        for (const fb of this.fallingBlocks) {
            if (Date.now() < fb.fallStartTime) continue; // Not started falling yet
            
            const x = fb.gridX * this.blockSize + (fb.visualXOffset || 0);
            const y = fb.y - this.currentScrollOffset;
            
            // Only draw if visible on screen
            if (y > -this.blockSize && y < this.canvas.height && x >= 0 && x < this.canvas.width) {
                // Draw falling block with slight transparency
                this.ctx.save();
                this.ctx.globalAlpha = 0.9;
                
                if (fb.color === this.oxygenCapsuleColor) {
                    // Draw oxygen capsule
                    if (this.oxygenCapsuleImage && this.oxygenCapsuleImage.complete) {
                        this.ctx.drawImage(this.oxygenCapsuleImage, x, y, this.blockSize, this.blockSize);
                    } else {
                        this.ctx.fillStyle = fb.color;
                        this.ctx.fillRect(x + 2, y + 2, this.blockSize - 4, this.blockSize - 4);
                    }
                } else {
                    // Draw normal block
                    const blockType = this.getBlockTypeFromColor(fb.color);
                    const blockImage = this.blockImages[blockType];
                    
                    if (blockImage && blockImage.complete) {
                        this.ctx.drawImage(blockImage, x, y, this.blockSize, this.blockSize);
                    } else {
                        this.ctx.fillStyle = fb.color;
                        this.ctx.fillRect(x, y, this.blockSize, this.blockSize);
                    }
                }
                
                // Add falling effect border
                this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
                this.ctx.lineWidth = 2;
                this.ctx.strokeRect(x, y, this.blockSize, this.blockSize);
                
                this.ctx.restore();
            }
        }
    }
    handleChainReaction(r, c, landedBlockColor) {
        const landedBlock = this.grid[r]?.[c];
        if (!landedBlock || landedBlock.type === 'oxygen' || landedBlockColor === this.oxygenCapsuleColor) {
            return;
        }

        let q = [[r, c]];
        let visited = new Set([`${r},${c}`]);
        let group = [{r, c, color: landedBlock.color}];

        while (q.length > 0) {
            const [currR, currC] = q.shift();
            const neighbors = [
                [currR, currC - 1], [currR, currC + 1],
                [currR - 1, currC], [currR + 1, currC]
            ];

            for (const [nr, nc] of neighbors) {
                const neighborKey = `${nr},${nc}`;
                if (nr >= 0 && nr < this.grid.length && nc >= 0 && nc < this.gridWidth &&
                    !visited.has(neighborKey) && this.grid[nr]?.[nc]?.type === 'normal' && this.grid[nr]?.[nc]?.color === landedBlockColor) {

                    visited.add(neighborKey);
                    q.push([nr, nc]);
                    group.push({r: nr, c: nc, color: this.grid[nr][nc].color});
                }
            }
        }

        if (group.length >= 2) {
            let destroyedCount = 0;
            for (const blockPos of group) {
                const blockInGrid = this.grid[blockPos.r]?.[blockPos.c];
                if (blockInGrid) {
                    blockInGrid.visualState = 'breaking';
                    blockInGrid.breakStartTime = Date.now() + destroyedCount * 30; // Stagger break animation
                    this.createChainReactionParticles(blockPos.c * this.blockSize + this.blockSize / 2, blockPos.r * this.blockSize - this.currentScrollOffset + this.blockSize / 2, blockInGrid.color);
                    destroyedCount++;
                }
            }

            if (destroyedCount > 0) {
                this.player.oxygen = Math.min(this.player.maxOxygen, this.player.oxygen + destroyedCount * 2); // More oxygen
                const chainBonusScore = destroyedCount * (destroyedCount + 1) * 10; // Higher bonus
                this.player.score += chainBonusScore;
                if (AuraGameSDK && AuraGameSDK.ui) {
                    AuraGameSDK.ui.showNotification({ message: `Chain Reaction! +${chainBonusScore} Score, +${destroyedCount * 2} Oxygen!`, type: 'success', duration: 2000 });
                }
                if (AuraGameSDK && AuraGameSDK.audio) {
                    AuraGameSDK.audio.playSfx('gameassets/auradriller/sounds/chain_reaction.wav', 0.9);
                }
            }
        }
    }

    createLandingParticles(x, y, colorHex) {
        const count = 8;
        const baseColor = this.hexToRgb(colorHex) || {r:200, g:200, b:200};
        for (let i = 0; i < count; i++) {
            this.particles.push({
                x: x + (Math.random() - 0.5) * 10,
                y: y,
                vx: (Math.random() - 0.5) * 2.5,
                vy: -(Math.random() * 2 + 1), // Upwards
                size: Math.random() * 2 + 2,
                r: baseColor.r, g: baseColor.g, b: baseColor.b,
                alpha: 0.8,
                fade: 0.03
            });
        }
    }

    createChainReactionParticles(x, y, colorHex) {
        const count = 15;
        const baseColor = this.hexToRgb(colorHex) || {r:255, g:255, b:0}; // Default yellow
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 3 + 1;
            this.particles.push({
                x: x, y: y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                size: Math.random() * 3 + 2,
                r: baseColor.r, g: baseColor.g, b: baseColor.b,
                alpha: 1,
                fade: 0.02
            });
        }
    }

    /**
     * Load game assets
     */
    _loadAssets() {
        // Load block images
        const blockTypes = ['blue', 'cyan', 'green', 'magenta', 'red', 'yellow'];
        blockTypes.forEach(type => {
            const img = new Image();
            img.src = `gameassets/auradriller/images/block_${type}.png`;
            this.blockImages[type] = img;
        });

        // Load special images
        this.playerSprite = new Image();
        this.playerSprite.src = 'gameassets/auradriller/images/player_spritesheet.png';
        
        this.oxygenCapsuleImage = new Image();
        this.oxygenCapsuleImage.src = 'gameassets/auradriller/images/oxygen_capsule.png';
        
        this.drillSparkImage = new Image();
        this.drillSparkImage.src = 'gameassets/auradriller/images/drill_spark.png';
        
        this.blockParticlesImage = new Image();
        this.blockParticlesImage.src = 'gameassets/auradriller/images/block_particles.png';
    }

    /**
     * Get hex color to RGB conversion
     */
    hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : {r: 200, g: 200, b: 200};
    }

    /**
     * Get block type from color
     */
    getBlockTypeFromColor(color) {
        const colorMap = {
            '#4a90e2': 'blue',
            '#63d2b3': 'cyan', 
            '#27c93f': 'green',
            '#8a63d2': 'magenta',
            '#ff5f56': 'red',
            '#ffbd2e': 'yellow'
        };
        return colorMap[color] || 'blue'; // Default fallback
    }

    /**
     * Create game over screen
     */
    gameOver(reason) {
        if (!this.gameRunning) return;
        
        this.gameRunning = false;
        this.gamePaused = true;
        
        // Play game over sound
        if (AuraGameSDK && AuraGameSDK.audio) {
            AuraGameSDK.audio.stop();
            AuraGameSDK.audio.playSfx('gameassets/auradriller/sounds/game_over.wav', 0.8);
        }
        
        // Draw game over screen
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        this.ctx.fillStyle = '#ff5f56';
        this.ctx.font = `bold ${Math.min(32, this.canvas.width / 12)}px 'Inter', sans-serif`;
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText('GAME OVER', this.canvas.width / 2, this.canvas.height / 2 - 60);
        
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = `${Math.min(18, this.canvas.width / 20)}px 'Inter', sans-serif`;
        this.ctx.fillText(reason, this.canvas.width / 2, this.canvas.height / 2 - 20);
        this.ctx.fillText(`Score: ${this.player.score}`, this.canvas.width / 2, this.canvas.height / 2 + 10);
        this.ctx.fillText(`Depth: ${this.player.depth}m`, this.canvas.width / 2, this.canvas.height / 2 + 40);
        
        this.ctx.fillStyle = '#8a63d2';
        this.ctx.font = `${Math.min(14, this.canvas.width / 25)}px 'Inter', sans-serif`;
        this.ctx.fillText('Press ESC to return to menu or R to restart', this.canvas.width / 2, this.canvas.height / 2 + 80);
        
        // Show notification
        if (AuraGameSDK && AuraGameSDK.ui) {
            AuraGameSDK.ui.showNotification({ 
                message: `Game Over! Score: ${this.player.score}`, 
                type: 'error', 
                duration: 3000 
            });
        }
    }

    /**
     * Handle winning the game
     */
    gameWin() {
        if (!this.gameRunning) return;
        
        this.gameRunning = false;
        this.gamePaused = true;
        
        // Stop audio
        if (AuraGameSDK && AuraGameSDK.audio) {
            AuraGameSDK.audio.stop();
        }
        
        // Calculate final score with bonuses
        const depthBonus = this.player.depth * 5;
        const oxygenBonus = Math.floor(this.player.oxygen) * 2;
        const finalScore = this.player.score + depthBonus + oxygenBonus;
        
        // Draw win screen
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        this.ctx.fillStyle = '#27c93f';
        this.ctx.font = `bold ${Math.min(32, this.canvas.width / 12)}px Arial`;
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText('MISSION COMPLETE!', this.canvas.width / 2, this.canvas.height / 2 - 80);
        
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = `${Math.min(16, this.canvas.width / 22)}px Arial`;
        this.ctx.fillText(`Target depth of ${this.targetDepth}m reached!`, this.canvas.width / 2, this.canvas.height / 2 - 40);
        this.ctx.fillText(`Final Score: ${finalScore}`, this.canvas.width / 2, this.canvas.height / 2 - 10);
        this.ctx.fillText(`Depth: ${this.player.depth}m`, this.canvas.width / 2, this.canvas.height / 2 + 20);
        this.ctx.fillText(`Oxygen Remaining: ${Math.floor(this.player.oxygen)}%`, this.canvas.width / 2, this.canvas.height / 2 + 50);
        
        this.ctx.fillStyle = '#8a63d2';
        this.ctx.font = `${Math.min(14, this.canvas.width / 25)}px Arial`;
        this.ctx.fillText('Press ESC to return to menu or R to play again', this.canvas.width / 2, this.canvas.height / 2 + 90);
        
        // Show notification
        if (AuraGameSDK && AuraGameSDK.ui) {
            AuraGameSDK.ui.showNotification({ 
                message: `Mission Complete! Score: ${finalScore}`, 
                type: 'success', 
                duration: 4000 
            });
        }
        
        // Update player score to final score
        this.player.score = finalScore;
    }
    /**
     * Handle key input
     */
    _handleKeyDown(event) {
        this.keys[event.key] = true;
        
        // Handle game over inputs
        if (!this.gameRunning) {
            if (event.key === 'Escape') {
                if (this.onExitCallback) {
                    this.onExitCallback();
                }
            } else if (event.key === 'r' || event.key === 'R') {
                this.restart();
            }
            return;
        }
        
        // Handle pause
        if (event.key === 'Escape') {
            if (this.gamePaused) {
                this.resume();
            } else {
                this.pause();
            }
        }
    }

    /**
     * Handle key release
     */
    _handleKeyUp(event) {
        this.keys[event.key] = false;
    }

    /**
     * Update canvas dimensions for responsive design
     */
    updateCanvasDimensions() {
        // Ensure canvas has reasonable minimum dimensions
        if (this.canvas.width < 320) this.canvas.width = 320;
        if (this.canvas.height < 240) this.canvas.height = 240;
        
        // Set canvas style to prevent blurring
        this.canvas.style.imageRendering = 'pixelated';
        this.canvas.style.imageRendering = 'crisp-edges';
        
        // Ensure 2D context is crisp
        this.ctx.imageSmoothingEnabled = false;
    }

    /**
     * Update player sprite animation based on current state
     */
    updatePlayerAnimation() {
        this.playerAnimationTimer++;
        
        // Determine which animation to play based on player state
        let targetFrame = 0; // Default idle frame (top-left of spritesheet)
        
        if (this.player.isDrilling) {
            // Drilling animation - use frames 3, 4, 5 (middle row)
            const drillingFrames = [3, 4, 5];
            const frameIndex = Math.floor(this.playerAnimationTimer / (this.playerAnimationSpeed / 2)) % drillingFrames.length;
            targetFrame = drillingFrames[frameIndex];
        } else if (this.player.movingLeft) {
            // Moving left - use frame 1 (top-center)
            targetFrame = 1;
        } else if (this.player.movingRight) {
            // Moving right - use frame 2 (top-right)
            targetFrame = 2;
        } else if (this.player.oxygen < 30) {
            // Low oxygen warning - alternate between frames 6 and 7 (bottom row)
            const lowOxygenFrames = [6, 7];
            const frameIndex = Math.floor(this.playerAnimationTimer / this.playerAnimationSpeed) % lowOxygenFrames.length;
            targetFrame = lowOxygenFrames[frameIndex];
        } else {
            // Idle animation - use frame 0 with occasional blink at frame 8
            if (this.playerAnimationTimer % (this.playerAnimationSpeed * 8) < this.playerAnimationSpeed) {
                targetFrame = 8; // Blink frame (bottom-right)
            } else {
                targetFrame = 0; // Normal idle frame
            }
        }
        
        this.playerCurrentFrame = targetFrame;
    }
}

window.AuraDrillerGame = AuraDrillerGame;
console.log('AuraDriller.js loaded');
