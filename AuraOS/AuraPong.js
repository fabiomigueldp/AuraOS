// AuraPong.js

/**
 * AuraPongGame constructor.
 *
 * @param {HTMLCanvasElement} canvas - The canvas element for the game.
 */
function AuraPongGame(canvas) {
  this.canvas = canvas;
  this.ctx = canvas.getContext('2d');
  this.gameRunning = false;

  if (typeof AuraGameSDK !== 'undefined' && AuraGameSDK) {
    AuraGameSDK.init('aura-pong', this.canvas);
  } else {
    console.error('AuraGameSDK not found. Game initialization may be incomplete.');
  }

  this.playerScore = 0;
  this.aiScore = 0;
  this.ball = { x: this.canvas.width / 2, y: this.canvas.height / 2, radius: 8, dx: 0, dy: 0 };
  this.paddleHeight = 80;
  this.paddleWidth = 10;
  this.playerPaddle = { x: 0, y: (this.canvas.height - this.paddleHeight) / 2, width: this.paddleWidth, height: this.paddleHeight };
  this.aiPaddle = { x: this.canvas.width - this.paddleWidth, y: (this.canvas.height - this.paddleHeight) / 2, width: this.paddleWidth, height: this.paddleHeight };

  // Store colors queried from CSS variables or use fallbacks
  try {
    const styles = getComputedStyle(document.documentElement);
    this.playerPaddleColor = styles.getPropertyValue('--highlight-primary').trim() || '#00DDFF';
    this.aiPaddleColor = styles.getPropertyValue('--subtle-text-color').trim() || '#CCCCCC';
    this.ballColor = styles.getPropertyValue('--highlight-secondary').trim() || '#FF00FF';
  } catch (e) {
    // Fallback colors if getComputedStyle is not available (e.g., in a test environment)
    this.playerPaddleColor = '#00DDFF';
    this.aiPaddleColor = '#CCCCCC';
    this.ballColor = '#FF00FF';
    console.warn('Could not access document styles. Using default colors for AuraPong.');
  }

  this.particles = [];
  this.animationFrameId = null;

  this.mouseMoveHandler = (e) => {
    const rect = this.canvas.getBoundingClientRect();
    let mouseY = e.clientY - rect.top;
    // Keep paddle within canvas boundaries
    this.playerPaddle.y = mouseY - this.playerPaddle.height / 2;
    if (this.playerPaddle.y < 0) {
      this.playerPaddle.y = 0;
    }
    if (this.playerPaddle.y + this.playerPaddle.height > this.canvas.height) {
      this.playerPaddle.y = this.canvas.height - this.playerPaddle.height;
    }
  };
  // Add event listener only when canvas is available. Consider moving to start() if issues arise.
  if (this.canvas && typeof this.canvas.addEventListener === 'function') {
    this.canvas.addEventListener('mousemove', this.mouseMoveHandler);
  }

  this.maxBallSpeed = 10; // Maximum speed for ball components
  this.winningScore = 7;

  // Sound Effects
  const hitSoundUrl = 'https://www.soundjay.com/button/sounds/button-16.mp3'; // Example generic hit
  const scoreSoundUrl = 'https://www.soundjay.com/misc/sounds/bell-ringing-05.mp3'; // Example generic score
  const wallHitSoundUrl = 'https://www.soundjay.com/button/sounds/button-09.mp3'; // Example generic wall hit

  const dummySound = { play: function() {}, pause: function() {}, currentTime: 0, volume: 0 };

  try {
    this.hitSound = dummySound;
    this.scoreSound = dummySound;
    this.wallHitSound = dummySound;

    // Optional: Set volume
    // this.hitSound.volume = 0.5;
    // this.scoreSound.volume = 0.7;
    // this.wallHitSound.volume = 0.3;
  } catch (e) {
    console.error("Error initializing audio:", e);
    this.hitSound = { play: () => console.warn("Audio not initialized: hitSound") };
    this.scoreSound = { play: () => console.warn("Audio not initialized: scoreSound") };
    this.wallHitSound = { play: () => console.warn("Audio not initialized: wallHitSound") };
  }


  /**
   * Starts the game.
   */
  this.start = function() {
    this.gameRunning = true;
    this.playerScore = 0;
    this.aiScore = 0;
    this.resetBall(); // Initialize ball position and velocity

    // Clear any previous animation frame to prevent multiple loops
    if (this.animationFrameId) {
        cancelAnimationFrame(this.animationFrameId);
    }
    this.gameLoop(); // Start the game loop
  };

  /**
   * Stops the game.
   */
  this.stop = function() {
    this.gameRunning = false;
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    // Ensure listener removal is also guarded if added conditionally
    if (this.canvas && typeof this.canvas.removeEventListener === 'function') {
        this.canvas.removeEventListener('mousemove', this.mouseMoveHandler);
    }
  };

  /**
   * Checks if the game is currently running.
   *
   * @returns {boolean} True if the game is running, false otherwise.
   */
  this.isRunning = function() {
    return this.gameRunning;
  };
}

/**
 * Draws the player and AI paddles.
 */
AuraPongGame.prototype.drawPaddles = function() {
  // Draw player paddle
  this.ctx.fillStyle = this.playerPaddleColor;
  this.ctx.fillRect(this.playerPaddle.x, this.playerPaddle.y, this.playerPaddle.width, this.playerPaddle.height);

  // Draw AI paddle
  this.ctx.fillStyle = this.aiPaddleColor;
  this.ctx.fillRect(this.aiPaddle.x, this.aiPaddle.y, this.aiPaddle.width, this.aiPaddle.height);
};

/**
 * Draws the ball.
 */
AuraPongGame.prototype.drawBall = function() {
  this.ctx.fillStyle = this.ballColor;
  this.ctx.beginPath();
  this.ctx.arc(this.ball.x, this.ball.y, this.ball.radius, 0, Math.PI * 2);
  this.ctx.fill();
};

/**
 * Draws the game UI (scores, center line).
 */
AuraPongGame.prototype.drawUI = function() {
  // Set text properties for scores
  this.ctx.fillStyle = '#FFF'; // Assuming white text for scores for now, can be themed later
  this.ctx.font = '24px Inter, sans-serif';

  // Draw player score
  this.ctx.fillText(this.playerScore, this.canvas.width / 4, 50);

  // Draw AI score
  this.ctx.fillText(this.aiScore, (this.canvas.width / 4) * 3, 50);

  // Draw dashed center line
  this.ctx.beginPath();
  this.ctx.setLineDash([10, 10]);
  this.ctx.moveTo(this.canvas.width / 2, 0);
  this.ctx.lineTo(this.canvas.width / 2, this.canvas.height);
  this.ctx.strokeStyle = '#555'; // A neutral color for the dashed line
  this.ctx.stroke();
  this.ctx.setLineDash([]); // Reset line dash
};

/**
 * Clears the canvas with a semi-transparent rectangle to create a trail effect.
 */
AuraPongGame.prototype.drawCourt = function() {
  this.ctx.fillStyle = 'rgba(16, 15, 24, 0.2)'; // Aura-like dark, semi-transparent
  this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
};

/**
 * Resets the ball's position and velocity (e.g., after a score or at game start).
 * Server direction is randomized.
 */
AuraPongGame.prototype.resetBall = function() {
  this.ball.x = this.canvas.width / 2;
  this.ball.y = this.canvas.height / 2;

  let angle = Math.random() * Math.PI / 2 - Math.PI / 4; // Angle between -45 and 45 degrees
  const speed = 5; // Initial speed of the ball

  this.ball.dy = Math.sin(angle) * speed;
  // Randomize serve direction
  this.ball.dx = (Math.random() > 0.5 ? 1 : -1) * Math.cos(angle) * speed;
};

/**
 * Updates game state (ball position, paddle AI, collision detection, etc.).
 */
AuraPongGame.prototype.update = function() {
  // AI Opponent Control
  // Simple AI: tries to follow the ball's y position
  const aiSpeedFactor = 0.08; // Controls how fast the AI paddle reacts
  this.aiPaddle.y += (this.ball.y - (this.aiPaddle.y + this.aiPaddle.height / 2)) * aiSpeedFactor;

  // AI Paddle boundary check
  if (this.aiPaddle.y < 0) {
    this.aiPaddle.y = 0;
  }
  if (this.aiPaddle.y + this.aiPaddle.height > this.canvas.height) {
    this.aiPaddle.y = this.canvas.height - this.aiPaddle.height;
  }

  // Ball movement and collision logic will be added here in a subsequent step
  this.ball.x += this.ball.dx;
  this.ball.y += this.ball.dy;

  // Wall Collision (Top/Bottom)
  if (this.ball.y - this.ball.radius < 0) {
    this.ball.dy = -this.ball.dy;
    this.ball.y = this.ball.radius;
    if (this.wallHitSound && typeof this.wallHitSound.play === 'function') this.wallHitSound.play().catch(e => console.warn("Wall hit sound play failed:", e));
  } else if (this.ball.y + this.ball.radius > this.canvas.height) {
    this.ball.dy = -this.ball.dy;
    this.ball.y = this.canvas.height - this.ball.radius;
    if (this.wallHitSound && typeof this.wallHitSound.play === 'function') this.wallHitSound.play().catch(e => console.warn("Wall hit sound play failed:", e));
  }

  // Player Paddle Collision
  if (this.ball.dx < 0 && // Ball moving towards player
      this.ball.x - this.ball.radius < this.playerPaddle.x + this.playerPaddle.width &&
      this.ball.x + this.ball.radius > this.playerPaddle.x &&
      this.ball.y + this.ball.radius > this.playerPaddle.y &&
      this.ball.y - this.ball.radius < this.playerPaddle.y + this.playerPaddle.height) {

    this.ball.dx = -this.ball.dx;
    this.ball.x = this.playerPaddle.x + this.playerPaddle.width + this.ball.radius;

    let hitPos = (this.ball.y - (this.playerPaddle.y + this.playerPaddle.height / 2)) / (this.playerPaddle.height / 2);
    this.ball.dy = hitPos * 5;

    this.createImpactParticles(this.ball.x - this.ball.radius, this.ball.y, this.playerPaddleColor);

    // Increase speed and apply max speed limit
    this.ball.dx *= 1.05;
    // this.ball.dy *= 1.05; // dy is now more influenced by hitPos, consider if applying factor here is good.
                             // Let's only increase dx for now to make it primarily faster horizontally.

    if (Math.abs(this.ball.dx) > this.maxBallSpeed) {
        this.ball.dx = Math.sign(this.ball.dx) * this.maxBallSpeed;
    }
    if (Math.abs(this.ball.dy) > this.maxBallSpeed) { // Still cap dy in case hitPos * 5 is too high
        this.ball.dy = Math.sign(this.ball.dy) * this.maxBallSpeed;
    }
    if (this.hitSound && typeof this.hitSound.play === 'function') this.hitSound.play().catch(e => console.warn("Hit sound play failed:", e));
  }

  // AI Paddle Collision
  if (this.ball.dx > 0 && // Ball moving towards AI
      this.ball.x + this.ball.radius > this.aiPaddle.x &&
      this.ball.x - this.ball.radius < this.aiPaddle.x + this.aiPaddle.width &&
      this.ball.y + this.ball.radius > this.aiPaddle.y &&
      this.ball.y - this.ball.radius < this.aiPaddle.y + this.aiPaddle.height) {

    this.ball.dx = -this.ball.dx;
    this.ball.x = this.aiPaddle.x - this.ball.radius;

    let hitPos = (this.ball.y - (this.aiPaddle.y + this.aiPaddle.height / 2)) / (this.aiPaddle.height / 2);
    this.ball.dy = hitPos * 5;

    this.createImpactParticles(this.ball.x + this.ball.radius, this.ball.y, this.aiPaddleColor);

    // Increase speed and apply max speed limit
    this.ball.dx *= 1.05;
    // this.ball.dy *= 1.05; // Similar to player, dy is set by hitPos.

    if (Math.abs(this.ball.dx) > this.maxBallSpeed) {
        this.ball.dx = Math.sign(this.ball.dx) * this.maxBallSpeed;
    }
    if (Math.abs(this.ball.dy) > this.maxBallSpeed) { // Still cap dy
        this.ball.dy = Math.sign(this.ball.dy) * this.maxBallSpeed;
    }
    if (this.hitSound && typeof this.hitSound.play === 'function') this.hitSound.play().catch(e => console.warn("Hit sound play failed:", e));
  }

  // Scoring logic
  // Player scores (ball passes AI paddle - right side)
  if (this.ball.x + this.ball.radius > this.canvas.width) {
    this.playerScore++;
    if (this.scoreSound && typeof this.scoreSound.play === 'function') this.scoreSound.play().catch(e => console.warn("Score sound play failed:", e));
    console.log('Player scores! Player: ' + this.playerScore + ', AI: ' + this.aiScore);
    if (this.playerScore >= this.winningScore) {
      this.gameOver(true); // Player won
    } else {
      this.resetBall(false); // AI serves next
    }
  }
  // AI scores (ball passes player paddle - left side)
  else if (this.ball.x - this.ball.radius < 0) {
    this.aiScore++;
    if (this.scoreSound && typeof this.scoreSound.play === 'function') this.scoreSound.play().catch(e => console.warn("Score sound play failed:", e));
    console.log('AI scores! Player: ' + this.playerScore + ', AI: ' + this.aiScore);
    if (this.aiScore >= this.winningScore) {
      this.gameOver(false); // AI won
    } else {
      this.resetBall(true); // Player serves next
    }
  }
};

/**
 * Handles game over logic.
 * @param {boolean} playerWon - True if the player won, false if AI won.
 */
AuraPongGame.prototype.gameOver = function(playerWon) {
  this.gameRunning = false; // Stops the game loop
  console.log('Game Over. Player won: ' + playerWon);

  // 1. Show Notification for Game Result
  const resultTitle = 'AuraPong Result';
  const resultMessage = playerWon ? 'Congratulations! You won!' : 'Game Over. AI wins.';
  const resultType = playerWon ? 'success' : 'info'; // 'success' for win, 'info' for AI win

  if (typeof AuraGameSDK !== 'undefined' && AuraGameSDK.ui && AuraGameSDK.ui.showNotification) {
    AuraGameSDK.ui.showNotification({
      title: resultTitle,
      message: resultMessage,
      type: resultType,
      duration: 5000 // 5 seconds
    });
  } else {
    console.warn('AuraGameSDK.ui.showNotification not available. Skipping game result notification.');
    // Fallback using AuraOS notification system if available
    if (typeof AuraOS !== 'undefined' && AuraOS.showNotification) {
      AuraOS.showNotification({
        title: 'Aura Pong',
        message: resultMessage,
        type: 'info'
      });
    } else {
      console.log(resultMessage); // Console fallback
    }
  }

  // 2. Submit Score to Leaderboard
  const scoreToSubmit = this.playerScore;
  const userName = 'AuraUser'; // As specified

  if (typeof AuraGameSDK !== 'undefined' && AuraGameSDK.leaderboard && AuraGameSDK.leaderboard.submitScore) {
    try {
      AuraGameSDK.leaderboard.submitScore(userName, scoreToSubmit)
        .then(response => {
          console.log('Score submitted successfully:', response);
          if (AuraGameSDK.ui && AuraGameSDK.ui.showNotification) {
            AuraGameSDK.ui.showNotification({
              title: 'Leaderboard',
              message: 'Your score (' + scoreToSubmit + ') has been submitted!',
              type: 'info',
              duration: 3000
            });
          }
        })
        .catch(error => {
          console.error('Error submitting score:', error);
          if (AuraGameSDK.ui && AuraGameSDK.ui.showNotification) {
            AuraGameSDK.ui.showNotification({
              title: 'Leaderboard Error',
              message: 'Could not submit score: ' + (error.message || 'Unknown error'),
              type: 'error',
              duration: 4000
            });
          }
        });
    } catch (e) {
      console.error('Exception when trying to submit score:', e);
      if (AuraGameSDK.ui && AuraGameSDK.ui.showNotification) {
        AuraGameSDK.ui.showNotification({
          title: 'Leaderboard Error',
          message: 'Failed to submit score due to an unexpected error.',
          type: 'error',
          duration: 4000
        });
      }
    }
  } else {
    console.warn('AuraGameSDK.leaderboard.submitScore not available. Skipping score submission.');
    console.log('Leaderboard not available. Player score (' + userName + '): ' + scoreToSubmit);
  }
};

/**
 * The main game loop.
 */
AuraPongGame.prototype.gameLoop = function() {
  if (!this.gameRunning) {
    return;
  }

  this.update(); // Update game logic (AI, player input handled by event listener)

  // Drawing sequence
  this.drawCourt();
  this.drawPaddles();
  this.drawBall();
  this.drawParticles();
  this.drawUI();

  this.animationFrameId = requestAnimationFrame(() => this.gameLoop());
};

/**
 * Creates impact particles at a given position and color.
 * @param {number} x - The x-coordinate of the impact.
 * @param {number} y - The y-coordinate of the impact.
 * @param {string} color - The color of the particles.
 */
AuraPongGame.prototype.createImpactParticles = function(x, y, color) {
  const particleCount = 8;
  for (let i = 0; i < particleCount; i++) {
    this.particles.push({
      x: x,
      y: y,
      vx: (Math.random() - 0.5) * 3, // Random horizontal velocity
      vy: (Math.random() - 0.5) * 3, // Random vertical velocity
      size: Math.random() * 3 + 1,   // Random size (1 to 4 pixels)
      color: color,
      lifespan: Math.random() * 30 + 30 // Lifespan (30 to 60 frames)
    });
  }
};

/**
 * Draws and updates active particles.
 */
AuraPongGame.prototype.drawParticles = function() {
  for (let i = this.particles.length - 1; i >= 0; i--) {
    const particle = this.particles[i];

    // Update position
    particle.x += particle.vx;
    particle.y += particle.vy;

    // Decrease lifespan
    particle.lifespan--;

    // Optional: Decrease size or fade color
    // particle.size -= 0.05; // Example: shrink particle
    // To fade, you might need to convert color to rgba and decrease alpha

    if (particle.lifespan <= 0 || particle.size <= 0) {
      this.particles.splice(i, 1); // Remove dead particle
    } else {
      this.ctx.fillStyle = particle.color;
      // Draw particle (simple square for now)
      this.ctx.fillRect(particle.x - particle.size / 2, particle.y - particle.size / 2, particle.size, particle.size);
      // Could also draw as a circle:
      // this.ctx.beginPath();
      // this.ctx.arc(particle.x, particle.y, particle.size / 2, 0, Math.PI * 2);
      // this.ctx.fill();
    }
  }
};

window.AuraPongGame = AuraPongGame;
