// AuraOS/AuraTimber.js - MVP Complete Edition

// Game Constants
const GAME_CONFIG = {
    // Player
    PLAYER_WIDTH: 45,
    PLAYER_HEIGHT: 65,
    PLAYER_Y_OFFSET: 15,
    PLAYER_ANIMATION_SPEED: 0.15,
    
    // Tree
    TREE_SEGMENT_WIDTH: 90,
    TREE_SEGMENT_HEIGHT: 28,
    TREE_MOVEMENT_SPEED: 2,
    
    // Branch
    BRANCH_WIDTH: 70,
    BRANCH_HEIGHT: 18,
    BRANCH_PROBABILITY: 0.4,
    MIN_SEGMENTS_BETWEEN_BRANCHES: 1,
    INITIAL_SAFE_SEGMENTS: 4,
    
    // Timing
    TIME_LIMIT: 60, // seconds
    HURRY_THRESHOLD: 15, // seconds left to trigger hurry music
    
    // Difficulty
    SCORE_FOR_SPEEDUP: 20, // Every 20 points, game speeds up
    MAX_SPEED_MULTIPLIER: 2.5,
    
    // Visual Effects
    PARTICLE_COUNT: 8,
    SCREEN_SHAKE_DURATION: 300, // ms
    ANIMATION_DURATION: 200, // ms for chop animation
};

// Color Palette
const COLORS = {
    // Background
    SKY_TOP: '#87CEEB',
    SKY_MID: '#4682B4', 
    SKY_BOTTOM: '#2F4F4F',
    
    // Tree
    TRUNK_MAIN: '#8B4513',
    TRUNK_SHADOW: '#654321',
    TRUNK_HIGHLIGHT: '#A0522D',
    
    // Branch
    BRANCH_MAIN: '#228B22',
    BRANCH_SHADOW: '#006400',
    BRANCH_HIGHLIGHT: '#32CD32',
    
    // Player
    PLAYER_BODY: '#FF6B35',
    PLAYER_SHIRT: '#004225',
    PLAYER_HAT: '#8B0000',
    PLAYER_SKIN: '#FFDBAC',
    
    // UI
    TEXT_MAIN: '#FFFFFF',
    TEXT_SHADOW: '#000000',
    UI_BACKGROUND: 'rgba(0, 0, 0, 0.7)',
    TIMER_NORMAL: '#32CD32',
    TIMER_WARNING: '#FFD700',
    TIMER_DANGER: '#FF4500',
    
    // Effects
    PARTICLE_WOOD: '#D2691E',
    PARTICLE_LEAF: '#90EE90',
};

function AuraTimberGame(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.gameRunning = false;
    this.gameOver = false;
    this.gamePaused = false;
    this.animationFrameId = null;
    
    // Game State
    this.score = 0;
    this.timeLeft = GAME_CONFIG.TIME_LIMIT;
    this.speedMultiplier = 1;
    this.lastTime = 0;
    this.deltaTime = 0;
    
    // Player State
    this.player = {
        x: 0, y: 0,
        width: GAME_CONFIG.PLAYER_WIDTH,
        height: GAME_CONFIG.PLAYER_HEIGHT,
        side: 'left',
        animationFrame: 0,
        isChopping: false,
        choppingTime: 0
    };
    
    // Tree State
    this.tree = {
        segments: [],
        segmentHeight: GAME_CONFIG.TREE_SEGMENT_HEIGHT,
        segmentWidth: GAME_CONFIG.TREE_SEGMENT_WIDTH,
        x: 0,
        shakeOffset: { x: 0, y: 0 },
        shakeIntensity: 0,
        shakeTime: 0
    };
    
    // Visual Effects
    this.particles = [];
    this.screenShake = { intensity: 0, duration: 0 };
    this.backgroundOffset = 0;
    
    // Audio System
    this.audioContext = null;
    this.sounds = {};
    this.currentMusic = null;
    this.gamePhase = 'menu'; // menu, normal, hurry, gameover
    
    // Game Mechanics
    this.segmentsSinceLastBranch = 0;
    this.treeSegmentCount = 0;
    
    // Initialize
    this.initializeAudio();
    this.calculateDimensions();
    
    // SDK Integration
    if (typeof AuraGameSDK !== 'undefined' && AuraGameSDK) {
        AuraGameSDK.init('aura-timber', this.canvas);
        console.log('AuraTimber MVP initialized with AuraGameSDK');
    }
    
    this.keydownHandler = this.handleKeydown.bind(this);
    this.keyupHandler = this.handleKeyup.bind(this);
}

// Audio System
AuraTimberGame.prototype.initializeAudio = function() {
    try {
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
          // Preload all audio files
        const audioFiles = {
            // Music
            menuMusic: 'music/tracks/timber_menu_farm_loop.mp3',
            gameplayMusic: 'music/tracks/timber_gameplay_farm_loop.mp3',
            hurryMusic: 'music/tracks/timber_hurry_farm_loop.mp3',
            gameOverMusic: 'music/tracks/timber_game_over_farm_sting.mp3',
            
            // Sound Effects
            chopSound: 'gameassets/sounds/timber_axe_chop.wav',
            branchFallSound: 'gameassets/sounds/timber_branch_fall.wav',
            scoreTickSound: 'gameassets/sounds/timber_score_tick.wav',
            failBuzzSound: 'gameassets/sounds/timber_fail_buzz.wav'
        };
        
        // Load each audio file
        Object.keys(audioFiles).forEach(key => {
            this.loadAudio(key, audioFiles[key]);
        });
        
    } catch (error) {
        console.warn('Audio context initialization failed:', error);
    }
};

AuraTimberGame.prototype.loadAudio = function(name, url) {
    const audio = new Audio(url);
    audio.preload = 'auto';
    audio.volume = name.includes('Music') ? 0.6 : 0.8;
    
    if (name.includes('Music')) {
        audio.loop = !name.includes('gameOver');
    }
    
    this.sounds[name] = audio;
    
    audio.addEventListener('canplaythrough', () => {
        console.log(`Audio loaded: ${name}`);
    });
    
    audio.addEventListener('error', (e) => {
        console.warn(`Failed to load audio: ${name}`, e);
    });
};

AuraTimberGame.prototype.playSound = function(soundName) {
    if (this.sounds[soundName]) {
        try {
            this.sounds[soundName].currentTime = 0;
            this.sounds[soundName].play().catch(e => {
                console.warn(`Failed to play sound: ${soundName}`, e);
            });
        } catch (error) {
            console.warn(`Error playing sound: ${soundName}`, error);
        }
    }
};

AuraTimberGame.prototype.playMusic = function(musicName) {
    // Stop current music
    if (this.currentMusic && this.sounds[this.currentMusic]) {
        this.sounds[this.currentMusic].pause();
        this.sounds[this.currentMusic].currentTime = 0;
    }
    
    // Start new music
    if (this.sounds[musicName]) {
        this.currentMusic = musicName;
        this.sounds[musicName].currentTime = 0;
        this.sounds[musicName].play().catch(e => {
            console.warn(`Failed to play music: ${musicName}`, e);
        });
    }
};

AuraTimberGame.prototype.stopAllAudio = function() {
    Object.values(this.sounds).forEach(audio => {
        audio.pause();
        audio.currentTime = 0;
    });
    this.currentMusic = null;
};

// Game Lifecycle
AuraTimberGame.prototype.start = function() {
    console.log('Starting AuraTimber MVP...');
    
    this.gameOver = false;
    this.gameRunning = true;
    this.gamePaused = false;
    this.score = 0;
    this.timeLeft = GAME_CONFIG.TIME_LIMIT;
    this.speedMultiplier = 1;
    this.gamePhase = 'normal';
    
    this.resetGameElements();
    this.startGameTimer();
    
    // Start gameplay music
    this.playMusic('gameplayMusic');
    
    if (this.animationFrameId) {
        cancelAnimationFrame(this.animationFrameId);
    }
    
    // Event listeners
    document.removeEventListener('keydown', this.keydownHandler);
    document.removeEventListener('keyup', this.keyupHandler);
    document.addEventListener('keydown', this.keydownHandler);
    document.addEventListener('keyup', this.keyupHandler);
    
    this.lastTime = performance.now();
    this.gameLoop();
    
    console.log('AuraTimber MVP started successfully');
};

AuraTimberGame.prototype.startGameTimer = function() {
    this.gameTimer = setInterval(() => {
        if (this.gameRunning && !this.gamePaused && !this.gameOver) {
            this.timeLeft--;
            
            // Check for hurry phase
            if (this.timeLeft <= GAME_CONFIG.HURRY_THRESHOLD && this.gamePhase !== 'hurry') {
                this.gamePhase = 'hurry';
                this.playMusic('hurryMusic');
            }
            
            // Time's up!
            if (this.timeLeft <= 0) {
                this.handleGameOver('time');
            }
        }
    }, 1000);
};

AuraTimberGame.prototype.stop = function() {
    this.gameRunning = false;
    this.gamePaused = false;
    
    if (this.animationFrameId) {
        cancelAnimationFrame(this.animationFrameId);
        this.animationFrameId = null;
    }
    
    if (this.gameTimer) {
        clearInterval(this.gameTimer);
        this.gameTimer = null;
    }
    
    this.stopAllAudio();
    
    document.removeEventListener('keydown', this.keydownHandler);
    document.removeEventListener('keyup', this.keyupHandler);
    
    console.log('AuraTimber MVP stopped');
};

AuraTimberGame.prototype.isRunning = function() {
    return this.gameRunning;
};

// Game Loop & Updates
AuraTimberGame.prototype.gameLoop = function() {
    const currentTime = performance.now();
    this.deltaTime = (currentTime - this.lastTime) / 1000; // Convert to seconds
    this.lastTime = currentTime;
    
    if (this.gameRunning && !this.gamePaused) {
        this.update();
    }
    
    this.draw();
    
    if (this.gameRunning) {
        this.animationFrameId = requestAnimationFrame(() => this.gameLoop());
    }
};

AuraTimberGame.prototype.update = function() {
    // Update speed multiplier based on score
    const newSpeedMultiplier = Math.min(1 + (this.score / GAME_CONFIG.SCORE_FOR_SPEEDUP) * 0.1, GAME_CONFIG.MAX_SPEED_MULTIPLIER);
    if (newSpeedMultiplier !== this.speedMultiplier) {
        this.speedMultiplier = newSpeedMultiplier;
    }
    
    // Update player animation
    this.updatePlayerAnimation();
    
    // Update tree shake effect
    this.updateTreeShake();
    
    // Update screen shake
    this.updateScreenShake();
    
    // Update particles
    this.updateParticles();
    
    // Update background scrolling
    this.backgroundOffset += this.deltaTime * 10 * this.speedMultiplier;
    if (this.backgroundOffset > 100) this.backgroundOffset = 0;
};

AuraTimberGame.prototype.updatePlayerAnimation = function() {
    if (this.player.isChopping) {
        this.player.choppingTime += this.deltaTime;
        if (this.player.choppingTime >= GAME_CONFIG.ANIMATION_DURATION / 1000) {
            this.player.isChopping = false;
            this.player.choppingTime = 0;
        }
    }
    
    // Idle animation
    this.player.animationFrame += this.deltaTime * GAME_CONFIG.PLAYER_ANIMATION_SPEED;
    if (this.player.animationFrame > 1) this.player.animationFrame = 0;
};

AuraTimberGame.prototype.updateTreeShake = function() {
    if (this.tree.shakeTime > 0) {
        this.tree.shakeTime -= this.deltaTime * 1000;
        this.tree.shakeIntensity = Math.max(0, this.tree.shakeIntensity * 0.95);
        
        // Generate shake offset
        this.tree.shakeOffset.x = (Math.random() - 0.5) * this.tree.shakeIntensity;
        this.tree.shakeOffset.y = (Math.random() - 0.5) * this.tree.shakeIntensity;
        
        if (this.tree.shakeTime <= 0) {
            this.tree.shakeOffset.x = 0;
            this.tree.shakeOffset.y = 0;
        }
    }
};

AuraTimberGame.prototype.updateScreenShake = function() {
    if (this.screenShake.duration > 0) {
        this.screenShake.duration -= this.deltaTime * 1000;
        this.screenShake.intensity = Math.max(0, this.screenShake.intensity * 0.9);
        
        if (this.screenShake.duration <= 0) {
            this.screenShake.intensity = 0;
        }
    }
};

AuraTimberGame.prototype.updateParticles = function() {
    for (let i = this.particles.length - 1; i >= 0; i--) {
        const particle = this.particles[i];
        
        particle.x += particle.vx * this.deltaTime;
        particle.y += particle.vy * this.deltaTime;
        particle.vy += 200 * this.deltaTime; // Gravity
        particle.life -= this.deltaTime;
        particle.alpha = Math.max(0, particle.life / particle.maxLife);
        
        if (particle.life <= 0 || particle.y > this.canvas.height + 50) {
            this.particles.splice(i, 1);
        }
    }
};

// Rendering System
AuraTimberGame.prototype.draw = function() {
    // Clear canvas with screen shake
    let shakeX = 0, shakeY = 0;
    if (this.screenShake.intensity > 0) {
        shakeX = (Math.random() - 0.5) * this.screenShake.intensity;
        shakeY = (Math.random() - 0.5) * this.screenShake.intensity;
    }
    
    this.ctx.save();
    this.ctx.translate(shakeX, shakeY);
    
    this.drawBackground();
    this.drawTree();
    this.drawPlayer();
    this.drawParticles();
    
    this.ctx.restore();
    
    // UI (not affected by screen shake)
    this.drawUI();
    
    if (this.gameOver) {
        this.drawGameOverScreen();
    }
};

AuraTimberGame.prototype.drawBackground = function() {
    // Animated gradient background
    const gradient = this.ctx.createLinearGradient(0, -this.backgroundOffset, 0, this.canvas.height + this.backgroundOffset);
    gradient.addColorStop(0, COLORS.SKY_TOP);
    gradient.addColorStop(0.6, COLORS.SKY_MID);
    gradient.addColorStop(1, COLORS.SKY_BOTTOM);
    
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    
    // Add some moving clouds effect
    this.drawClouds();
    
    // Ground
    this.ctx.fillStyle = '#2F4F4F';
    this.ctx.fillRect(0, this.canvas.height - 30, this.canvas.width, 30);
    
    // Grass details
    this.ctx.fillStyle = '#228B22';
    for (let i = 0; i < this.canvas.width; i += 15) {
        const grassHeight = 8 + Math.sin((i + this.backgroundOffset) * 0.1) * 3;
        this.ctx.fillRect(i, this.canvas.height - 30, 3, -grassHeight);
    }
};

AuraTimberGame.prototype.drawClouds = function() {
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    
    const cloudOffset = this.backgroundOffset * 0.5;
    
    // Cloud 1
    this.drawCloud(this.canvas.width * 0.2 + cloudOffset * 0.3, 60);
    
    // Cloud 2
    this.drawCloud(this.canvas.width * 0.7 - cloudOffset * 0.2, 90);
    
    // Cloud 3
    this.drawCloud(this.canvas.width * 0.1 + cloudOffset * 0.4, 120);
};

AuraTimberGame.prototype.drawCloud = function(x, y) {
    // Wrap clouds around screen
    x = ((x % (this.canvas.width + 100)) + this.canvas.width + 100) % (this.canvas.width + 100) - 50;
    
    this.ctx.beginPath();
    this.ctx.arc(x, y, 20, 0, Math.PI * 2);
    this.ctx.arc(x + 25, y, 25, 0, Math.PI * 2);
    this.ctx.arc(x + 50, y, 20, 0, Math.PI * 2);
    this.ctx.arc(x + 15, y - 15, 15, 0, Math.PI * 2);
    this.ctx.arc(x + 35, y - 15, 18, 0, Math.PI * 2);
    this.ctx.fill();
};

AuraTimberGame.prototype.drawTree = function() {
    if (!this.tree.segments || this.tree.segments.length === 0) return;
    
    const treeX = this.tree.x + this.tree.shakeOffset.x;
    const treeTrunkBaseX = treeX - this.tree.segmentWidth / 2;
    
    // Draw tree segments with enhanced visual
    for (let i = 0; i < this.tree.segments.length; i++) {
        const segment = this.tree.segments[i];
        const segmentY = segment.y + this.tree.shakeOffset.y;
        
        // Draw trunk segment with texture
        this.drawTreeSegment(treeTrunkBaseX, segmentY, this.tree.segmentWidth, this.tree.segmentHeight);
        
        // Draw branch if exists
        if (segment.hasBranch) {
            this.drawBranch(segment.hasBranch, treeTrunkBaseX, segmentY);
        }
    }
    
    // Draw tree top/leaves
    this.drawTreeTop(treeX, this.tree.segments[this.tree.segments.length - 1].y + this.tree.shakeOffset.y);
};

AuraTimberGame.prototype.drawTreeSegment = function(x, y, width, height) {
    // Main trunk
    this.ctx.fillStyle = COLORS.TRUNK_MAIN;
    this.ctx.fillRect(x, y, width, height);
    
    // Highlight
    this.ctx.fillStyle = COLORS.TRUNK_HIGHLIGHT;
    this.ctx.fillRect(x + 2, y + 2, 8, height - 4);
    
    // Shadow
    this.ctx.fillStyle = COLORS.TRUNK_SHADOW;
    this.ctx.fillRect(x + width - 8, y + 2, 6, height - 4);
    
    // Wood texture lines
    this.ctx.strokeStyle = COLORS.TRUNK_SHADOW;
    this.ctx.lineWidth = 1;
    for (let i = 0; i < 3; i++) {
        const lineY = y + height * (0.25 + i * 0.25);
        this.ctx.beginPath();
        this.ctx.moveTo(x + 5, lineY);
        this.ctx.lineTo(x + width - 5, lineY);
        this.ctx.stroke();
    }
    
    // Outer border
    this.ctx.strokeStyle = COLORS.TRUNK_SHADOW;
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(x, y, width, height);
};

AuraTimberGame.prototype.drawBranch = function(side, trunkX, trunkY) {
    let branchX = side === 'left' ? 
        trunkX - GAME_CONFIG.BRANCH_WIDTH : 
        trunkX + this.tree.segmentWidth;
    
    const branchY = trunkY + (this.tree.segmentHeight - GAME_CONFIG.BRANCH_HEIGHT) / 2;
    
    // Main branch
    this.ctx.fillStyle = COLORS.BRANCH_MAIN;
    this.ctx.fillRect(branchX, branchY, GAME_CONFIG.BRANCH_WIDTH, GAME_CONFIG.BRANCH_HEIGHT);
    
    // Branch highlight
    this.ctx.fillStyle = COLORS.BRANCH_HIGHLIGHT;
    this.ctx.fillRect(branchX + 2, branchY + 2, GAME_CONFIG.BRANCH_WIDTH - 8, 4);
    
    // Branch shadow
    this.ctx.fillStyle = COLORS.BRANCH_SHADOW;
    this.ctx.fillRect(branchX + 2, branchY + GAME_CONFIG.BRANCH_HEIGHT - 6, GAME_CONFIG.BRANCH_WIDTH - 8, 4);
    
    // Border
    this.ctx.strokeStyle = COLORS.BRANCH_SHADOW;
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(branchX, branchY, GAME_CONFIG.BRANCH_WIDTH, GAME_CONFIG.BRANCH_HEIGHT);
    
    // Leaves on branch
    this.drawBranchLeaves(branchX, branchY, side);
};

AuraTimberGame.prototype.drawBranchLeaves = function(branchX, branchY, side) {
    this.ctx.fillStyle = COLORS.BRANCH_HIGHLIGHT;
    
    const leafCount = 4;
    for (let i = 0; i < leafCount; i++) {
        const leafX = branchX + (i / leafCount) * GAME_CONFIG.BRANCH_WIDTH + Math.sin(performance.now() * 0.005 + i) * 2;
        const leafY = branchY - 5 + Math.cos(performance.now() * 0.003 + i) * 1;
        
        this.ctx.beginPath();
        this.ctx.arc(leafX, leafY, 3, 0, Math.PI * 2);
        this.ctx.fill();
    }
};

AuraTimberGame.prototype.drawTreeTop = function(centerX, topY) {
    // Tree crown/leaves
    this.ctx.fillStyle = COLORS.BRANCH_MAIN;
    this.ctx.beginPath();
    this.ctx.arc(centerX, topY - 20, 35, 0, Math.PI * 2);
    this.ctx.fill();
    
    // Lighter green highlights
    this.ctx.fillStyle = COLORS.BRANCH_HIGHLIGHT;
    this.ctx.beginPath();
    this.ctx.arc(centerX - 10, topY - 25, 15, 0, Math.PI * 2);
    this.ctx.arc(centerX + 12, topY - 22, 12, 0, Math.PI * 2);
    this.ctx.fill();
    
    // Crown border
    this.ctx.strokeStyle = COLORS.BRANCH_SHADOW;
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.arc(centerX, topY - 20, 35, 0, Math.PI * 2);
    this.ctx.stroke();
};

AuraTimberGame.prototype.drawPlayer = function() {
    const playerX = this.player.x;
    const playerY = this.player.y;
    
    // Animation offset for chopping
    let choppingOffset = 0;
    if (this.player.isChopping) {
        const progress = this.player.choppingTime / (GAME_CONFIG.ANIMATION_DURATION / 1000);
        choppingOffset = Math.sin(progress * Math.PI) * 8;
    }
    
    // Idle bobbing animation
    const idleBob = Math.sin(this.player.animationFrame * Math.PI * 2) * 1;
    
    const drawX = playerX + (this.player.side === 'left' ? choppingOffset : -choppingOffset);
    const drawY = playerY + idleBob;
    
    this.drawPlayerSprite(drawX, drawY);
};

AuraTimberGame.prototype.drawPlayerSprite = function(x, y) {
    const width = this.player.width;
    const height = this.player.height;
    
    // Body
    this.ctx.fillStyle = COLORS.PLAYER_SHIRT;
    this.ctx.fillRect(x + width * 0.2, y + height * 0.4, width * 0.6, height * 0.4);
    
    // Arms
    this.ctx.fillStyle = COLORS.PLAYER_SKIN;
    this.ctx.fillRect(x + width * 0.1, y + height * 0.3, width * 0.15, height * 0.3);
    this.ctx.fillRect(x + width * 0.75, y + height * 0.3, width * 0.15, height * 0.3);
    
    // Legs
    this.ctx.fillStyle = COLORS.PLAYER_BODY;
    this.ctx.fillRect(x + width * 0.25, y + height * 0.75, width * 0.2, height * 0.25);
    this.ctx.fillRect(x + width * 0.55, y + height * 0.75, width * 0.2, height * 0.25);
    
    // Head
    this.ctx.fillStyle = COLORS.PLAYER_SKIN;
    this.ctx.beginPath();
    this.ctx.arc(x + width * 0.5, y + height * 0.2, width * 0.25, 0, Math.PI * 2);
    this.ctx.fill();
    
    // Hat
    this.ctx.fillStyle = COLORS.PLAYER_HAT;
    this.ctx.fillRect(x + width * 0.3, y + height * 0.05, width * 0.4, height * 0.15);
    
    // Axe
    this.drawAxe(x, y);
    
    // Simple face
    this.ctx.fillStyle = '#000000';
    this.ctx.beginPath();
    this.ctx.arc(x + width * 0.45, y + height * 0.18, 2, 0, Math.PI * 2);
    this.ctx.arc(x + width * 0.55, y + height * 0.18, 2, 0, Math.PI * 2);
    this.ctx.fill();
};

AuraTimberGame.prototype.drawAxe = function(playerX, playerY) {
    const baseAxeX = this.player.side === 'left' ? 
        playerX - 15 : 
        playerX + this.player.width + 5;
    const baseAxeY = playerY + this.player.height * 0.3;
    
    // Calculate animation offsets
    let axeRotation = 0;
    let axeOffsetX = 0;
    let axeOffsetY = 0;
    let axeScale = 1;
    
    if (this.player.isChopping) {
        // Chopping animation progress (0 to 1)
        const progress = this.player.choppingTime / (GAME_CONFIG.ANIMATION_DURATION / 1000);
        const easedProgress = this.easeOutBounce(progress);
        
        // Rotation animation - swings from -45° to +15° and back
        const maxRotation = this.player.side === 'left' ? Math.PI / 4 : -Math.PI / 4; // 45 degrees
        axeRotation = Math.sin(easedProgress * Math.PI) * maxRotation;
        
        // Scale animation - slightly enlarges during swing
        axeScale = 1 + Math.sin(easedProgress * Math.PI) * 0.15;
        
        // Position offset for more dynamic movement
        const swingRadius = 8;
        axeOffsetX = Math.sin(easedProgress * Math.PI) * swingRadius * (this.player.side === 'left' ? -1 : 1);
        axeOffsetY = -Math.sin(easedProgress * Math.PI) * swingRadius * 0.5;
    } else {
        // Idle animation - subtle bobbing
        const idleBob = Math.sin(performance.now() * 0.003) * 1.5;
        axeOffsetY = idleBob;
        
        // Slight rotation for idle stance
        axeRotation = (this.player.side === 'left' ? -1 : 1) * Math.PI / 12; // 15 degrees
    }
    
    const finalAxeX = baseAxeX + axeOffsetX;
    const finalAxeY = baseAxeY + axeOffsetY;
    
    // Save context for rotation and scaling
    this.ctx.save();
    
    // Move to axe center for rotation
    const axeCenterX = finalAxeX + 4; // Middle of handle
    const axeCenterY = finalAxeY + 20; // Middle of axe
    
    this.ctx.translate(axeCenterX, axeCenterY);
    this.ctx.rotate(axeRotation);
    this.ctx.scale(axeScale, axeScale);
    
    // Draw axe relative to center
    const handleWidth = 8;
    const handleHeight = 40;
    const headWidth = 18;
    const headHeight = 15;
    
    // Axe handle (brown wood with texture)
    this.ctx.fillStyle = '#8B4513';
    this.ctx.fillRect(-handleWidth/2, -handleHeight/2, handleWidth, handleHeight);
    
    // Handle highlight
    this.ctx.fillStyle = '#A0522D';
    this.ctx.fillRect(-handleWidth/2 + 1, -handleHeight/2 + 2, 2, handleHeight - 4);
    
    // Handle grip wrapping
    this.ctx.strokeStyle = '#654321';
    this.ctx.lineWidth = 1;
    for (let i = 0; i < 3; i++) {
        const wrapY = -handleHeight/2 + 10 + i * 8;
        this.ctx.beginPath();
        this.ctx.moveTo(-handleWidth/2, wrapY);
        this.ctx.lineTo(handleWidth/2, wrapY);
        this.ctx.stroke();
    }
    
    // Axe head (metallic with gradient effect)
    const headGradient = this.ctx.createLinearGradient(-headWidth/2, -headHeight/2, headWidth/2, headHeight/2);
    headGradient.addColorStop(0, '#E6E6FA'); // Light metallic
    headGradient.addColorStop(0.5, '#C0C0C0'); // Silver
    headGradient.addColorStop(1, '#696969'); // Dark gray
    
    this.ctx.fillStyle = headGradient;
    this.ctx.fillRect(-headWidth/2, -headHeight/2 - 5, headWidth, headHeight);
    
    // Axe edge (sharp white edge)
    this.ctx.fillStyle = '#FFFFFF';
    this.ctx.fillRect(-headWidth/2 + 3, -headHeight/2 - 3, headWidth - 6, 3);
    
    // Metallic shine effect
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    this.ctx.fillRect(-headWidth/2 + 2, -headHeight/2 - 4, 6, 2);
    
    // Axe head border for definition
    this.ctx.strokeStyle = '#404040';
    this.ctx.lineWidth = 1;
    this.ctx.strokeRect(-headWidth/2, -headHeight/2 - 5, headWidth, headHeight);
    
    // Motion blur effect during chopping
    if (this.player.isChopping) {
        const progress = this.player.choppingTime / (GAME_CONFIG.ANIMATION_DURATION / 1000);
        if (progress > 0.2 && progress < 0.8) {
            this.ctx.globalAlpha = 0.3;
            this.ctx.fillStyle = '#C0C0C0';
            
            // Draw motion blur trail
            for (let i = 1; i <= 3; i++) {
                const blurOffset = i * 3;
                const blurRotation = axeRotation * 0.8;
                
                this.ctx.save();
                this.ctx.rotate(blurRotation * (i / 3));
                this.ctx.fillRect(-headWidth/2, -headHeight/2 - 5 + blurOffset, headWidth, headHeight);
                this.ctx.restore();
            }
            
            this.ctx.globalAlpha = 1;
        }
    }
    
    this.ctx.restore();
};

// Easing function for smooth animation
AuraTimberGame.prototype.easeOutBounce = function(t) {
    if (t < 1 / 2.75) {
        return 7.5625 * t * t;
    } else if (t < 2 / 2.75) {
        return 7.5625 * (t -= 1.5 / 2.75) * t + 0.75;
    } else if (t < 2.5 / 2.75) {
        return 7.5625 * (t -= 2.25 / 2.75) * t + 0.9375;
    } else {
        return 7.5625 * (t -= 2.625 / 2.75) * t + 0.984375;
    }
};

AuraTimberGame.prototype.drawParticles = function() {
    for (const particle of this.particles) {
        this.ctx.save();
        this.ctx.globalAlpha = particle.alpha;
        this.ctx.fillStyle = particle.color;
        this.ctx.fillRect(particle.x - particle.size/2, particle.y - particle.size/2, particle.size, particle.size);
        this.ctx.restore();
    }
};

AuraTimberGame.prototype.drawUI = function() {
    // Score
    this.ctx.fillStyle = COLORS.TEXT_SHADOW;
    this.ctx.font = 'bold 32px Arial';
    this.ctx.textAlign = 'left';
    this.ctx.fillText('Score: ' + this.score, 22, 42);
    
    this.ctx.fillStyle = COLORS.TEXT_MAIN;
    this.ctx.fillText('Score: ' + this.score, 20, 40);
    
    // Timer
    const timerColor = this.timeLeft <= 10 ? COLORS.TIMER_DANGER :
                       this.timeLeft <= 20 ? COLORS.TIMER_WARNING :
                       COLORS.TIMER_NORMAL;
    
    this.ctx.fillStyle = COLORS.TEXT_SHADOW;
    this.ctx.textAlign = 'right';
    this.ctx.fillText('Time: ' + this.timeLeft, this.canvas.width - 18, 42);
    
    this.ctx.fillStyle = timerColor;
    this.ctx.fillText('Time: ' + this.timeLeft, this.canvas.width - 20, 40);
    
    // Speed indicator
    if (this.speedMultiplier > 1) {
        this.ctx.fillStyle = COLORS.TEXT_SHADOW;
        this.ctx.textAlign = 'center';
        this.ctx.font = '24px Arial';
        this.ctx.fillText('Speed: x' + this.speedMultiplier.toFixed(1), this.canvas.width / 2 + 2, 82);
        
        this.ctx.fillStyle = COLORS.TIMER_WARNING;
        this.ctx.fillText('Speed: x' + this.speedMultiplier.toFixed(1), this.canvas.width / 2, 80);
    }
    
    // Instructions
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    this.ctx.font = '18px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('← → Arrow Keys to Chop', this.canvas.width / 2, this.canvas.height - 15);
};

AuraTimberGame.prototype.drawGameOverScreen = function() {
    // Semi-transparent overlay
    this.ctx.fillStyle = COLORS.UI_BACKGROUND;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    
    // Game Over title
    this.ctx.fillStyle = COLORS.TEXT_SHADOW;
    this.ctx.font = 'bold 64px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('GAME OVER', this.canvas.width / 2 + 3, this.canvas.height / 2 - 67);
    
    this.ctx.fillStyle = '#FF4444';
    this.ctx.fillText('GAME OVER', this.canvas.width / 2, this.canvas.height / 2 - 70);
    
    // Final score
    this.ctx.fillStyle = COLORS.TEXT_SHADOW;
    this.ctx.font = '42px Arial';
    this.ctx.fillText('Final Score: ' + this.score, this.canvas.width / 2 + 2, this.canvas.height / 2 - 8);
    
    this.ctx.fillStyle = COLORS.TEXT_MAIN;
    this.ctx.fillText('Final Score: ' + this.score, this.canvas.width / 2, this.canvas.height / 2 - 10);
    
    // High score if applicable
    if (this.isNewHighScore) {
        this.ctx.fillStyle = COLORS.TIMER_WARNING;
        this.ctx.font = '28px Arial';
        this.ctx.fillText('NEW HIGH SCORE!', this.canvas.width / 2, this.canvas.height / 2 + 30);
    }
    
    // Restart instruction
    this.ctx.fillStyle = COLORS.TEXT_SHADOW;
    this.ctx.font = '32px Arial';
    this.ctx.fillText('Press R to Restart', this.canvas.width / 2 + 2, this.canvas.height / 2 + 72);
    
    this.ctx.fillStyle = COLORS.TEXT_MAIN;
    this.ctx.fillText('Press R to Restart', this.canvas.width / 2, this.canvas.height / 2 + 70);
};

// Game Mechanics
AuraTimberGame.prototype.calculateDimensions = function() {
    this.tree.x = this.canvas.width / 2;
    this.treeSegmentCount = Math.ceil(this.canvas.height / GAME_CONFIG.TREE_SEGMENT_HEIGHT) + 2;
};

AuraTimberGame.prototype.resetGameElements = function() {
    this.calculateDimensions();
    
    // Reset tree
    this.tree.segments = [];
    this.tree.shakeOffset = { x: 0, y: 0 };
    this.tree.shakeIntensity = 0;
    this.tree.shakeTime = 0;
    this.segmentsSinceLastBranch = 0;
    
    // Generate initial tree segments
    for (let i = 0; i < this.treeSegmentCount; i++) {
        const segment = this.generateNewSegment(i);
        segment.y = this.canvas.height - (i + 1) * this.tree.segmentHeight;
        this.tree.segments.push(segment);
    }
    
    // Reset player
    this.player.side = 'left';
    this.player.y = this.canvas.height - this.player.height - GAME_CONFIG.PLAYER_Y_OFFSET;
    this.player.x = this.calculatePlayerX();
    this.player.isChopping = false;
    this.player.choppingTime = 0;
    this.player.animationFrame = 0;
    
    // Reset effects
    this.particles = [];
    this.screenShake = { intensity: 0, duration: 0 };
    this.backgroundOffset = 0;
    
    console.log('Game elements reset. Tree segments: ' + this.tree.segments.length);
};

AuraTimberGame.prototype.generateNewSegment = function(indexForInitialSetup = -1) {
    let hasBranch = null;
    
    if (indexForInitialSetup !== -1 && indexForInitialSetup < GAME_CONFIG.INITIAL_SAFE_SEGMENTS) {
        hasBranch = null;
        this.segmentsSinceLastBranch++;
    } else {
        if (this.segmentsSinceLastBranch >= GAME_CONFIG.MIN_SEGMENTS_BETWEEN_BRANCHES && 
            Math.random() < GAME_CONFIG.BRANCH_PROBABILITY) {
            hasBranch = (Math.random() < 0.5) ? 'left' : 'right';
            this.segmentsSinceLastBranch = 0;
        } else {
            hasBranch = null;
            this.segmentsSinceLastBranch++;
        }
    }
    
    return { 
        y: 0, 
        hasBranch: hasBranch,
        color: COLORS.TRUNK_MAIN 
    };
};

AuraTimberGame.prototype.calculatePlayerX = function() {
    const gap = 10;
    if (this.player.side === 'left') {
        return this.tree.x - this.tree.segmentWidth / 2 - this.player.width - gap;
    } else {
        return this.tree.x + this.tree.segmentWidth / 2 + gap;
    }
};

// Input Handling
AuraTimberGame.prototype.handleKeydown = function(e) {
    if (this.gameOver) {
        if (e.key === 'r' || e.key === 'R') {
            this.start();
        }
        return;
    }
    
    if (!this.gameRunning || this.gamePaused) {
        return;
    }
    
    if (e.key === 'ArrowLeft') {
        this.chopTree('left');
        e.preventDefault();
    } else if (e.key === 'ArrowRight') {
        this.chopTree('right');
        e.preventDefault();
    } else if (e.key === ' ') {
        this.togglePause();
        e.preventDefault();
    }
};

AuraTimberGame.prototype.handleKeyup = function(e) {
    // Handle key releases if needed
};

AuraTimberGame.prototype.togglePause = function() {
    this.gamePaused = !this.gamePaused;
    
    if (this.gamePaused) {
        // Pause current music
        if (this.currentMusic && this.sounds[this.currentMusic]) {
            this.sounds[this.currentMusic].pause();
        }
    } else {
        // Resume music
        if (this.currentMusic && this.sounds[this.currentMusic]) {
            this.sounds[this.currentMusic].play().catch(e => console.warn('Failed to resume music:', e));
        }
    }
};

// Core Game Logic
AuraTimberGame.prototype.chopTree = function(side) {
    if (!this.gameRunning || this.gameOver || this.gamePaused) {
        return;
    }
    
    if (this.tree.segments.length === 0) return;
    
    // Move player to chosen side
    this.player.side = side;
    this.player.x = this.calculatePlayerX();
    this.player.isChopping = true;
    this.player.choppingTime = 0;
    
    const bottomSegment = this.tree.segments[0];
    
    // Check for collision with branch
    if (bottomSegment.hasBranch && bottomSegment.hasBranch === side) {
        this.handleGameOver('branch');
        return;
    }
      // Successful chop
    this.score++;
    this.playSound('chopSound');
    
    // Play score tick sound only every 10 points
    if (this.score % 10 === 0) {
        this.playSound('scoreTickSound');
    }
    
    // Create wood particles
    this.createWoodParticles(this.tree.x, bottomSegment.y);
    
    // If there was a branch, create branch particles
    if (bottomSegment.hasBranch) {
        this.createBranchParticles(this.tree.x, bottomSegment.y, bottomSegment.hasBranch);
        this.playSound('branchFallSound');
    }
    
    // Tree shake effect
    this.tree.shakeIntensity = 8;
    this.tree.shakeTime = 200;
    
    // Screen shake for impact
    this.screenShake.intensity = 3;
    this.screenShake.duration = 100;
    
    // Remove chopped segment and add new one at top
    this.tree.segments.shift();
    const newSegment = this.generateNewSegment();
    this.tree.segments.push(newSegment);
    
    // Update all segment positions
    for (let i = 0; i < this.tree.segments.length; i++) {
        this.tree.segments[i].y = this.canvas.height - (i + 1) * this.tree.segmentHeight;
    }
    
    // Add time bonus for successful chop
    if (this.timeLeft < GAME_CONFIG.TIME_LIMIT) {
        this.timeLeft = Math.min(this.timeLeft + 0.5, GAME_CONFIG.TIME_LIMIT);
    }
};

AuraTimberGame.prototype.createWoodParticles = function(x, y) {
    for (let i = 0; i < GAME_CONFIG.PARTICLE_COUNT; i++) {
        this.particles.push({
            x: x + (Math.random() - 0.5) * 40,
            y: y + Math.random() * 20,
            vx: (Math.random() - 0.5) * 200,
            vy: -Math.random() * 100 - 50,
            size: Math.random() * 6 + 2,
            color: COLORS.PARTICLE_WOOD,
            life: Math.random() * 1.5 + 0.5,
            maxLife: Math.random() * 1.5 + 0.5,
            alpha: 1
        });
    }
};

AuraTimberGame.prototype.createBranchParticles = function(x, y, side) {
    const branchX = side === 'left' ? x - 30 : x + 30;
    
    for (let i = 0; i < GAME_CONFIG.PARTICLE_COUNT / 2; i++) {
        this.particles.push({
            x: branchX + (Math.random() - 0.5) * 30,
            y: y + Math.random() * 15,
            vx: (side === 'left' ? -1 : 1) * (Math.random() * 150 + 50),
            vy: -Math.random() * 80 - 30,
            size: Math.random() * 4 + 2,
            color: COLORS.PARTICLE_LEAF,
            life: Math.random() * 2 + 1,
            maxLife: Math.random() * 2 + 1,
            alpha: 1
        });
    }
};

AuraTimberGame.prototype.handleGameOver = function(reason) {
    this.gameOver = true;
    this.gameRunning = false;
    this.gamePhase = 'gameover';
    
    // Stop game timer
    if (this.gameTimer) {
        clearInterval(this.gameTimer);
        this.gameTimer = null;
    }
    
    // Play appropriate sound and music
    if (reason === 'branch') {
        this.playSound('failBuzzSound');
    }
    
    this.playMusic('gameOverMusic');
    
    // Screen shake for dramatic effect
    this.screenShake.intensity = 10;
    this.screenShake.duration = 500;
    
    console.log(`Game Over! Reason: ${reason}, Final Score: ${this.score}`);
    
    // Submit score to leaderboard
    this.submitScore();
};

AuraTimberGame.prototype.submitScore = function() {
    if (typeof AuraGameSDK !== 'undefined' && AuraGameSDK && 
        AuraGameSDK.leaderboard && typeof AuraGameSDK.leaderboard.submitScore === 'function') {
        
        AuraGameSDK.leaderboard.submitScore('AuraUser', this.score)
            .then((result) => {
                console.log('Score submitted successfully:', result);
                this.isNewHighScore = result && result.isNewHighScore;
            })
            .catch(e => {
                console.error('Score submission failed:', e);
                this.isNewHighScore = false;
            });
    } else {
        console.log('AuraGameSDK leaderboard not available');
        this.isNewHighScore = false;
    }
};

// Export for global access
if (typeof window !== 'undefined') {
    window.AuraTimberGame = AuraTimberGame;
}

console.log('AuraTimber MVP loaded successfully!');
