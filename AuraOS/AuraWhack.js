class AuraWhackGame {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = this.canvas.getContext('2d');
        AuraGameSDK.init('aura-whack', this.canvas);

        // Fetch CSS Variables
        const styles = getComputedStyle(document.documentElement);
        this.holeColor = styles.getPropertyValue('--subtle-text-color').trim() || '#555'; // Fallback
        this.moleColor = styles.getPropertyValue('--highlight-secondary').trim() || '#FF6347'; // Fallback Tomato

        this.gameRunning = false;
        this.score = 0;
        this.timeLeft = 60; // Default 60 seconds
        this.animationFrameId = null;

        // Placeholders for game elements
        this.holes = [];
        this.mole = {
            active: false,
            holeIndex: -1,
            appearanceTime: 0,
            duration: 800, // ms
            nextAppearanceDelay: 1000 // ms
        };
        this.lastMoleTime = 0; // Tracks when the last mole event (hide/hit) occurred

        // Bind methods
        this.gameLoop = this.gameLoop.bind(this);
        // Ensure this line is present and correct for event handling
        this.boundHandleCanvasClick = this.handleCanvasClick.bind(this);
    }

    start() {
        if (this.gameRunning) {
            console.warn("Game is already running.");
            return;
        }
        // Stop any existing music first (for restarts)
        AuraGameSDK.audio.stopMusic();
        // Start background music
        AuraGameSDK.audio.playLoopMusic('whack_bgm.mp3');

        this.gameRunning = true;
        this.score = 0;
        this.timeLeft = 60; // Reset time

        // Initialize hole positions
        this.holes = [];
        const gridSize = 3;
        const padding = this.canvas.width / (gridSize * 2 + 1) / 4; // Space around and between holes
        const holeRadius = (this.canvas.width - padding * (gridSize + 1)) / (gridSize * 2);

        const startX = holeRadius + padding;
        const startY = holeRadius + padding;
        const stepX = holeRadius * 2 + padding;
        const stepY = holeRadius * 2 + padding;

        for (let i = 0; i < gridSize; i++) {
            for (let j = 0; j < gridSize; j++) {
                this.holes.push({
                    x: startX + j * stepX,
                    y: startY + i * stepY,
                    radius: holeRadius
                });
            }
        }

        // Reset mole state
        this.mole = {
            ...this.mole, // Keep configured duration/delay
            active: false,
            holeIndex: -1,
            appearanceTime: 0
        };
        this.lastMoleTime = performance.now(); // Initialize for first appearance
        this.lastTickTime = performance.now(); // Initialize for game timer

        // Start the game loop
        this.gameLoop(performance.now());
        console.log("AuraWhack Game Started!");
        // Add event listener for clicks
        this.canvas.addEventListener('mousedown', this.boundHandleCanvasClick);
    }

    stop() {
        if (!this.gameRunning) {
            console.warn("Game is not running.");
            return;
        }
        this.gameRunning = false;
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
        this.canvas.removeEventListener('mousedown', this.boundHandleCanvasClick); // Clean up

        AuraGameSDK.audio.stopMusic(); // Stop music when game is stopped manually or by game over

        console.log("AuraWhack Game Stopped! Final Score (if applicable):", this.score);
    }

    gameOver() {
        this.timeLeft = 0; // Ensure timeLeft is exactly 0
        console.log("Game Over! Final Score:", this.score);

        // SDK Integrations
        AuraGameSDK.ui.showNotification('Game Over!', 'Your final score: ' + this.score, 'info');
        AuraGameSDK.leaderboard.submitScore('AuraUser', this.score); // Assuming 'AuraUser' for now
        AuraGameSDK.audio.playSfx('game_over.wav');
        // playLoopMusic is stopped by this.stop() which is called next.

        this.stop(); // Handles gameRunning = false, cancels animation, removes listeners, stops music
        // Optionally, display a game over message directly on the canvas here
        // For example:
        // this.ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
        // this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        // this.ctx.fillStyle = "white";
        // this.ctx.font = "40px Inter";
        // this.ctx.textAlign = "center";
        // this.ctx.fillText("Game Over!", this.canvas.width / 2, this.canvas.height / 2 - 30);
        // this.ctx.font = "20px Inter";
        // this.ctx.fillText("Final Score: " + this.score, this.canvas.width / 2, this.canvas.height / 2 + 10);
        // this.ctx.fillText("Click to try again?", this.canvas.width/2, this.canvas.height/2 + 50)
        // (If adding 'click to try again', re-add a listener or use a UI button from SDK)
    }

    isRunning() {
        return this.gameRunning;
    }

    // --- Game Loop ---
    gameLoop(currentTime) {
        if (!this.gameRunning) {
            return;
        }

        // Update game state
        this.update(currentTime);
        // Draw everything
        this.draw();

        this.animationFrameId = requestAnimationFrame(this.gameLoop);
    }

    // --- Update and Draw ---
    update(currentTime) {
        if (!this.gameRunning) {
            return;
        }

        // Game Timer Logic
        const elapsedTime = currentTime - this.lastTickTime;
        if (elapsedTime >= 1000) { // One second has passed
            this.timeLeft--;
            this.lastTickTime = currentTime - (elapsedTime % 1000); // Adjust for precision

            if (this.timeLeft <= 0) {
                this.timeLeft = 0;
                this.gameOver();
                return; // Stop further game logic for this frame
            }
        }

        // Mole Management Logic
        this.manageMoleAppearance(currentTime);
    }

    manageMoleAppearance(currentTime) {
        if (!this.mole.active && this.timeLeft > 0) {
            if (currentTime - this.lastMoleTime >= this.mole.nextAppearanceDelay) {
                // Time to make a new mole appear
                this.mole.holeIndex = Math.floor(Math.random() * this.holes.length);
                this.mole.active = true;
                this.mole.appearanceTime = currentTime;
                this.lastMoleTime = currentTime; // Reset timer for next appearance decision

                // Optional: Randomize next appearance delay
                this.mole.nextAppearanceDelay = 500 + Math.random() * 1000;

                AuraGameSDK.audio.playSfx('mole_appear.wav');
                console.log(`Mole appeared in hole ${this.mole.holeIndex} at ${currentTime}`);
            }
        } else if (this.mole.active) {
            // Mole is active, check if its duration is over
            if (currentTime - this.mole.appearanceTime > this.mole.duration) {
                this.mole.active = false;
                this.lastMoleTime = currentTime; // Mole escaped, time for next one starts now
                // No specific "escaped" sound in requirements, miss sound covers general non-hit
                console.log(`Mole in hole ${this.mole.holeIndex} escaped at ${currentTime}`);
            }
        }
    }

    draw() {
        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw game elements
        this.drawBoard();
        this.drawMole();
        this.drawUI();
    }

    drawBoard() {
        this.ctx.fillStyle = this.holeColor;
        this.holes.forEach(hole => {
            this.ctx.beginPath();
            this.ctx.arc(hole.x, hole.y, hole.radius, 0, Math.PI * 2);
            this.ctx.fill();
        });
    }

    drawMole() {
        if (this.mole.active && this.mole.holeIndex >= 0 && this.mole.holeIndex < this.holes.length) {
            const hole = this.holes[this.mole.holeIndex];
            // Draw mole slightly smaller than the hole
            const moleRadius = hole.radius * 0.8;
            this.ctx.fillStyle = this.moleColor;
            this.ctx.beginPath();
            this.ctx.arc(hole.x, hole.y, moleRadius, 0, Math.PI * 2);
            this.ctx.fill();
        }
    }

    drawUI() {
        this.ctx.fillStyle = '#FFF'; // Assuming white text for UI
        this.ctx.font = '24px Inter'; // Example font

        // Draw Score
        this.ctx.textAlign = 'left';
        this.ctx.fillText(`Score: ${this.score}`, 20, 30);

        // Draw Time Left
        this.ctx.textAlign = 'right';
        this.ctx.fillText(`Time: ${this.timeLeft}`, this.canvas.width - 20, 30);
    }

    // --- Event Handlers ---
    handleCanvasClick(event) {
        if (!this.gameRunning || !this.mole.active) {
            // If a click happens when no mole is active but game is running (missed click on empty area)
            if (this.gameRunning && event) { // Ensure event is passed
                 AuraGameSDK.audio.playSfx('whack_miss.wav');
            }
            return;
        }

        const rect = this.canvas.getBoundingClientRect();
        const clickX = event.clientX - rect.left;
        const clickY = event.clientY - rect.top;

        const moleHole = this.holes[this.mole.holeIndex];
        const moleClickableRadius = moleHole.radius * 0.8; // Mole is slightly smaller

        const distance = Math.sqrt(Math.pow(clickX - moleHole.x, 2) + Math.pow(clickY - moleHole.y, 2));

        if (distance < moleClickableRadius) {
            // Hit
            this.score += 10;
            this.mole.active = false;
            this.lastMoleTime = Date.now(); // Update for next mole appearance timing
            this.triggerHitEffect(moleHole.x, moleHole.y);
            AuraGameSDK.audio.playSfx('whack_hit.wav');
            console.log("Mole Whacked!");
        } else {
            // Miss (clicked active mole's hole, but missed the mole itself, or clicked elsewhere)
            AuraGameSDK.audio.playSfx('whack_miss.wav');
            console.log("Whack Missed!");
        }
    }

    triggerHitEffect(x, y) {
        // Simple placeholder - could be expanded for visual feedback
        console.log("Hit effect triggered at", x, y);
        // For now, the mole disappearing (this.mole.active = false) is the primary feedback.
    }
}

// Expose the class to the window object
window.AuraWhackGame = AuraWhackGame;
