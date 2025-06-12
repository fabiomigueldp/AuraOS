/**
 * AuraInvadersGame constructor.
 * @param {HTMLCanvasElement} canvas - The canvas element for the game.
 */
function AuraInvadersGame(canvas) {
  if (!canvas || !(canvas instanceof HTMLCanvasElement)) {
    console.error("AuraInvaders: Invalid canvas element provided.");
    return;
  }

  // this.canvas = canvas; // Removed as per review
  const ctx = canvas.getContext('2d');
  AuraGameSDK.init('aura-invaders', canvas);

  // Sound Effects
  const playerShootSound = new Audio('https://www.sfxr.me/static/wav/r_shoot1.wav');
  const invaderDestroyedSound = new Audio('https://www.sfxr.me/static/wav/r_explosion1.wav');
  const playerDestroyedSound = new Audio('https://www.sfxr.me/static/wav/r_hit1.wav');

  playerShootSound.volume = 0.3;
  invaderDestroyedSound.volume = 0.2;
  playerDestroyedSound.volume = 0.4;

  // Game state variables (local scope)
  let score = 0;
  let lives = 3;
  let gameRunning = false;
  let animationFrameId = null;

  const playerSpeed = 5;
  const bulletSpeed = 7;
  const invaderSpeed = 1; // Initial speed, can be increased
  const invaderBulletSpeed = 5;
  const invaderDropDistance = 10;
  const maxShootCooldown = 20; // Frames between player shots
  const invaderShootInterval = 1000; // ms between invader shots

  let player = { x: canvas.width / 2 - 25, y: canvas.height - 60, width: 50, height: 20, speed: playerSpeed };
  let invaders = [];
  let bullets = [];
  let invaderBullets = [];
  let keys = { ArrowLeft: false, ArrowRight: false, Space: false, ArrowUp: false };

  let invaderDirection = 1; // 1 for right, -1 for left
  let shootCooldown = 0;
  let lastInvaderShotTime = 0;

  // Invader configuration constants
  const invaderRowCount = 5;
  const invaderColumnCount = 10;
  const invaderWidth = 30;
  const invaderHeight = 20;
  const invaderPadding = 10;
  const invaderOffsetTop = 30;
  const invaderOffsetLeft = 30;
  const invaderColors = ["#FF1744", "#F50057", "#D500F9", "#651FFF", "#3D5AFE"];

  // --- Drawing Functions ---
  function drawPlayer() {
    ctx.fillStyle = '#FFF'; // Bright white
    ctx.shadowColor = 'var(--highlight-secondary)';
    ctx.shadowBlur = 15;
    ctx.fillRect(player.x, player.y, player.width, player.height);
    ctx.shadowBlur = 0;
  }

  function setupInvaders() {
    invaders = []; // Clear existing invaders before setting up new ones
    for (let r = 0; r < invaderRowCount; r++) {
      for (let c = 0; c < invaderColumnCount; c++) {
        const invaderX = c * (invaderWidth + invaderPadding) + invaderOffsetLeft;
        const invaderY = r * (invaderHeight + invaderPadding) + invaderOffsetTop;
        invaders.push({
          x: invaderX,
          y: invaderY,
          width: invaderWidth,
          height: invaderHeight,
          color: invaderColors[r % invaderColors.length],
          alive: true
        });
      }
    }
  }

  function drawInvaders() {
    invaders.forEach(invader => {
      if (invader.alive) {
        ctx.fillStyle = invader.color;
        ctx.shadowColor = invader.color;
        ctx.shadowBlur = 10;
        ctx.fillRect(invader.x, invader.y, invader.width, invader.height);
        ctx.shadowBlur = 0;
      }
    });
  }

  function drawPlayerBullets() {
    bullets.forEach(bullet => {
      ctx.fillStyle = '#00DDFF';
      ctx.shadowColor = '#00DDFF';
      ctx.shadowBlur = 10;
      // Assuming bullet is {x, y, width, height, speed}
      // Bullet width and height are defined when created
      ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
      ctx.shadowBlur = 0;
    });
  }

  function drawInvaderBullets() {
    invaderBullets.forEach(bullet => {
      ctx.fillStyle = '#FF5555';
      ctx.shadowColor = '#FF5555';
      ctx.shadowBlur = 8;
      // Assuming bullet is {x, y, width, height, speed}
      // Bullet width and height are defined when created
      ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
      ctx.shadowBlur = 0;
    });
  }

  function drawUI() {
    ctx.font = "16px Inter, sans-serif";
    ctx.fillStyle = "#FFF";
    ctx.fillText("Score: " + score, 8, 20);
    ctx.fillText("Lives: " + lives, canvas.width - 70, 20);
  }

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // ctx.fillStyle = 'rgba(0, 0, 20, 0.8)';
    // ctx.fillRect(0, 0, canvas.width, canvas.height);
    drawPlayer();
    drawInvaders();
    drawPlayerBullets();
    drawInvaderBullets();
    drawUI();
  }

  // --- Event Handlers ---
  function keyDownHandler(e) {
    if (keys.hasOwnProperty(e.key)) {
        keys[e.key] = true;
        if (['ArrowLeft', 'ArrowRight', 'Space', 'ArrowUp'].includes(e.key)) {
            e.preventDefault();
        }
    }
  }

  function keyUpHandler(e) {
    if (keys.hasOwnProperty(e.key)) {
        keys[e.key] = false;
         if (['ArrowLeft', 'ArrowRight', 'Space', 'ArrowUp'].includes(e.key)) {
            e.preventDefault();
        }
    }
  }

  // --- Collision Detection ---
  function checkCollision(rect1, rect2) {
    return rect1.x < rect2.x + rect2.width &&
           rect1.x + rect1.width > rect2.x &&
           rect1.y < rect2.y + rect2.height &&
           rect1.y + rect1.height > rect2.y;
  }

  // --- Game Logic ---
  function update() {
    // Player Movement
    if (keys.ArrowLeft && player.x > 0) {
      player.x -= player.speed;
    }
    if (keys.ArrowRight && player.x < canvas.width - player.width) {
      player.x += player.speed;
    }

    // Player Shooting
    if (shootCooldown > 0) {
      shootCooldown--;
    }
    if ((keys.Space || keys.ArrowUp) && shootCooldown <= 0 && bullets.length === 0) {
      bullets.push({
        x: player.x + player.width / 2 - 2,
        y: player.y,
        width: 4,
        height: 10,
        speed: bulletSpeed
      });
      playerShootSound.currentTime = 0; // Rewind to start
      playerShootSound.play().catch(e => console.warn("AuraInvaders: Error playing player shoot sound:", e));
      shootCooldown = maxShootCooldown;
    }

    // Move Player Bullets
    for (let i = bullets.length - 1; i >= 0; i--) {
      bullets[i].y -= bullets[i].speed;
      if (bullets[i].y + bullets[i].height < 0) {
        bullets.splice(i, 1);
      }
    }

    // Invader Logic
    let moveDownAndReverse = false;
    let anInvaderReachedBottom = false;
    for (let i = 0; i < invaders.length; i++) {
        const invader = invaders[i];
        if (invader.alive) {
            invader.x += invaderSpeed * invaderDirection;
            if (invader.x <= 0 || invader.x + invader.width >= canvas.width) {
                moveDownAndReverse = true;
            }
            if (invader.y + invader.height >= canvas.height - 20) {
                anInvaderReachedBottom = true;
                break;
            }
        }
    }

    if (anInvaderReachedBottom) {
        playerDestroyedSound.currentTime = 0;
        playerDestroyedSound.play().catch(e => console.warn("AuraInvaders: Error playing player destroyed sound (invader bottom):", e));
        gameOver(false);
        return;
    }

    if (moveDownAndReverse) {
        invaderDirection *= -1;
        invaders.forEach(invader => {
            if (invader.alive) {
                 invader.y += invaderDropDistance;
            }
        });
    }

    // Invader Shooting
    const currentTime = Date.now();
    if (currentTime - lastInvaderShotTime > invaderShootInterval) {
      const livingInvaders = invaders.filter(inv => inv.alive);
      if (livingInvaders.length > 0) {
        const randomInvader = livingInvaders[Math.floor(Math.random() * livingInvaders.length)];
        invaderBullets.push({
          x: randomInvader.x + randomInvader.width / 2 - 2,
          y: randomInvader.y + randomInvader.height,
          width: 4,
          height: 8,
          speed: invaderBulletSpeed
        });
        lastInvaderShotTime = currentTime;
      }
    }

    // Move Invader Bullets
    for (let i = invaderBullets.length - 1; i >= 0; i--) {
      invaderBullets[i].y += invaderBullets[i].speed;
      if (invaderBullets[i].y > canvas.height) {
        invaderBullets.splice(i, 1);
      }
    }

    // Collision Detection: Player Bullets vs. Invaders
    for (let i = bullets.length - 1; i >= 0; i--) {
      for (let j = invaders.length - 1; j >= 0; j--) {
        if (invaders[j].alive && bullets[i] && checkCollision(bullets[i], invaders[j])) {
          invaders[j].alive = false;
          bullets.splice(i, 1);
          score += 10;
          invaderDestroyedSound.currentTime = 0;
          invaderDestroyedSound.play().catch(e => console.warn("AuraInvaders: Error playing invader destroyed sound:", e));
          // Check for win condition
          if (invaders.every(inv => !inv.alive)) {
            gameOver(true);
            return;
          }
          break; // Bullet hit one invader, no need to check other invaders for this bullet
        }
      }
    }

    // Collision Detection: Invader Bullets vs. Player
    for (let k = invaderBullets.length - 1; k >= 0; k--) {
      if (checkCollision(invaderBullets[k], player)) {
        invaderBullets.splice(k, 1);
        lives--;
        playerDestroyedSound.currentTime = 0;
        playerDestroyedSound.play().catch(e => console.warn("AuraInvaders: Error playing player destroyed sound (bullet hit):", e));
        // Reset player position (optional, or give brief invulnerability)
        player.x = canvas.width / 2 - player.width / 2;
        player.y = canvas.height - 60;
        if (lives <= 0) {
          gameOver(false);
          return;
        }
        break; // Player hit once, process next frame
      }
    }
  }

  function resetGame() {
    score = 0;
    lives = 3;
    player.x = canvas.width / 2 - player.width / 2;
    player.y = canvas.height - 60;
    bullets = [];
    invaderBullets = [];
    setupInvaders(); // This will repopulate the local 'invaders' array
    invaderDirection = 1;
    keys = { ArrowLeft: false, ArrowRight: false, Space: false, ArrowUp: false };
    shootCooldown = 0;
    lastInvaderShotTime = 0;
    gameRunning = false; // Ensure game is not running until start is called
    if (animationFrameId) { // Clear any existing animation frame
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
    }
  }

  function gameOver(isWin) {
    gameRunning = false;
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
    }

    if (isWin) {
        AuraGameSDK.ui.showNotification('You Win!', 'Congratulations! Final Score: ' + score, 'success');
    } else {
        AuraGameSDK.ui.showNotification('Game Over', 'Final Score: ' + score, 'error');
    }

    async function submitScoreAsync() {
        try {
            // Assuming 'AuraUser' is a placeholder for actual user identification if available
            // For now, as per instructions, we use 'AuraUser'.
            await AuraGameSDK.leaderboard.submitScore('AuraUser', score);
            AuraGameSDK.ui.showNotification('Leaderboard Updated', 'Your score of ' + score + ' has been submitted!', 'info');
        } catch (error) {
            console.error('AuraInvaders: Failed to submit score:', error);
            AuraGameSDK.ui.showNotification('Submission Error', 'Could not save your score to the leaderboard.', 'warning');
        }
    }
    submitScoreAsync();

    // Optional: Clear canvas after a delay. The game loop is stopped, so the last frame remains.
    // If a clean slate is desired and to give a clear message if user doesn't immediately exit:
    // setTimeout(() => {
    //    if (!gameRunning) {
    //        ctx.clearRect(0, 0, canvas.width, canvas.height);
    //        ctx.font = "20px Inter, sans-serif";
    //        ctx.fillStyle = "grey";
    //        ctx.textAlign = "center";
    //        const endMessage = isWin ? "You Won! Score: " + score : "Game Over. Score: " + score;
    //        ctx.fillText(endMessage, canvas.width/2, canvas.height/2 -10);
    //        ctx.fillText("Return to Game Center to play again.", canvas.width/2, canvas.height/2 + 20);
    //    }
    // }, 500); // Delay to allow notifications to be seen
  }

  function gameLoop() {
    if (!gameRunning) return;
    animationFrameId = requestAnimationFrame(gameLoop); // Store the ID
    update();
    draw();
  }

  // Initial setup call (draws initial state but game is not "running")
  setupInvaders();
  draw();
  console.log("AuraInvaders: Game initialized with local state, drawing, and game logic functions.");


  // --- Public Methods (Bound to 'this' of AuraInvadersGame instance) ---
  this.start = function() {
    console.log("AuraInvaders: Attempting to start game...");
    resetGame(); // Reset state before starting
    gameRunning = true; // Set gameRunning to true *after* reset
    document.addEventListener('keydown', keyDownHandler);
    document.addEventListener('keyup', keyUpHandler);
    console.log("AuraInvaders: Event listeners added. Starting game loop.");
    gameLoop();
  };

  this.stop = function() {
    console.log("AuraInvaders: Stopping game...");
    gameRunning = false;
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
    }
    document.removeEventListener('keydown', keyDownHandler);
    document.removeEventListener('keyup', keyUpHandler);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.font = "20px Inter, sans-serif";
    ctx.fillStyle = "grey";
    ctx.textAlign = "center";
    ctx.fillText("Game Paused. Select 'Play' to resume.", canvas.width/2, canvas.height/2);
    console.log("AuraInvaders: Game stopped, listeners removed, paused message shown.");
  };

  /**
   * Checks if the AuraInvaders game is currently running.
   * @return {boolean} True if the game is running, false otherwise.
   */
  this.isRunning = function() {
    return gameRunning; // Accesses the local 'gameRunning' variable
  };
