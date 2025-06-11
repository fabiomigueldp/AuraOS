/**
 * @file AuraBreaker.js
 * Implements a simple Breakout clone game using AuraGameSDK.
 */

function AuraBreakerGame(canvas) {
    if (!canvas || !(canvas instanceof HTMLCanvasElement)) {
        console.error("AuraBreaker: Invalid canvas element provided.");
        return null;
    }

    const ctx = canvas.getContext('2d');
    AuraGameSDK.init('aura-breaker', canvas); // Initialize SDK

    let score = 0;
    let lives = 3;
    let gameRunning = false;
    let animationFrameId = null;

    // Ball properties
    const ballRadius = 8;
    let ballX = canvas.width / 2;
    let ballY = canvas.height - 30;
    let ballSpeed = 3;
    let ballDX = ballSpeed;
    let ballDY = -ballSpeed;

    // Paddle properties
    const paddleHeight = 12;
    const paddleWidth = 75;
    let paddleX = (canvas.width - paddleWidth) / 2;

    // Brick properties
    const brickRowCount = 5;
    const brickColumnCount = 7;
    const brickWidth = Math.floor((canvas.width - 40) / brickColumnCount) - 10; // Adjusted for padding
    const brickHeight = 20;
    const brickPadding = 10;
    const brickOffsetTop = 30;
    const brickOffsetLeft = 20; // Centering bricks a bit

    let bricks = [];

    function setupBricks() {
        bricks = [];
        const colors = ["#FF1744", "#F50057", "#D500F9", "#651FFF", "#3D5AFE"]; // Material Design colors
        for (let c = 0; c < brickColumnCount; c++) {
            bricks[c] = [];
            for (let r = 0; r < brickRowCount; r++) {
                bricks[c][r] = { x: 0, y: 0, status: 1, color: colors[r % colors.length] };
            }
        }
    }

    function drawBall() {
        ctx.beginPath();
        ctx.arc(ballX, ballY, ballRadius, 0, Math.PI * 2);
        ctx.fillStyle = "#00DDFF"; // Bright cyan
        ctx.fill();
        ctx.closePath();
    }

    function drawPaddle() {
        ctx.beginPath();
        ctx.rect(paddleX, canvas.height - paddleHeight - 5, paddleWidth, paddleHeight);
        ctx.fillStyle = "#0095DD"; // AuraOS primary-like blue
        ctx.fill();
        ctx.closePath();
    }

    function drawBricks() {
        for (let c = 0; c < brickColumnCount; c++) {
            for (let r = 0; r < brickRowCount; r++) {
                if (bricks[c][r].status === 1) {
                    const brickX = (c * (brickWidth + brickPadding)) + brickOffsetLeft;
                    const brickY = (r * (brickHeight + brickPadding)) + brickOffsetTop;
                    bricks[c][r].x = brickX;
                    bricks[c][r].y = brickY;
                    ctx.beginPath();
                    ctx.rect(brickX, brickY, brickWidth, brickHeight);
                    ctx.fillStyle = bricks[c][r].color;
                    ctx.fill();
                    ctx.closePath();
                }
            }
        }
    }

    function drawScore() {
        ctx.font = "16px Inter, sans-serif";
        ctx.fillStyle = "#FFF";
        ctx.fillText("Score: " + score, 8, 20);
    }

    function drawLives() {
        ctx.font = "16px Inter, sans-serif";
        ctx.fillStyle = "#FFF";
        ctx.fillText("Lives: " + lives, canvas.width - 65, 20);
    }

    function collisionDetection() {
        for (let c = 0; c < brickColumnCount; c++) {
            for (let r = 0; r < brickRowCount; r++) {
                const b = bricks[c][r];
                if (b.status === 1) {
                    if (ballX > b.x && ballX < b.x + brickWidth && ballY > b.y && ballY < b.y + brickHeight) {
                        ballDY = -ballDY;
                        b.status = 0;
                        score += 10;
                        if (score === brickRowCount * brickColumnCount * 10) {
                            AuraGameSDK.ui.showNotification('Congratulations!', 'You cleared all bricks!', 'success');
                            // For now, just reset. Could add levels later.
                            gameOver(true); // Win
                        }
                    }
                }
            }
        }
    }

    function update() {
        // Ball movement and wall collision
        if (ballX + ballDX > canvas.width - ballRadius || ballX + ballDX < ballRadius) {
            ballDX = -ballDX;
        }
        if (ballY + ballDY < ballRadius) {
            ballDY = -ballDY;
        } else if (ballY + ballDY > canvas.height - ballRadius - paddleHeight - 5) { // Check paddle collision
            if (ballX > paddleX && ballX < paddleX + paddleWidth) {
                ballDY = -ballDY;
                // Optional: Add slight angle change based on where it hits paddle
                let deltaX = ballX - (paddleX + paddleWidth / 2);
                ballDX = deltaX * 0.2; // Max change to ballDX based on hit point
                if (Math.abs(ballDX) > ballSpeed * 0.8) { // Cap horizontal speed influence
                    ballDX = ballSpeed * 0.8 * Math.sign(ballDX);
                }

            } else { // Ball missed paddle
                lives--;
                if (lives <= 0) {
                    gameOver(false); // Lose
                    return; // Stop update loop
                } else {
                    resetBallAndPaddle();
                }
            }
        }

        ballX += ballDX;
        ballY += ballDY;

        // Paddle movement is handled by mousemove event
    }

    function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        drawBricks();
        drawBall();
        drawPaddle();
        drawScore();
        drawLives();
        collisionDetection();
    }

    function gameLoop() {
        if (!gameRunning) return;
        update();
        draw();
        animationFrameId = requestAnimationFrame(gameLoop);
    }

    function resetBallAndPaddle() {
        ballX = canvas.width / 2;
        ballY = canvas.height - 30 - ballRadius;
        const initialAngle = (Math.random() * Math.PI / 2) + Math.PI / 4; // Random angle upwards
        ballDX = ballSpeed * Math.cos(initialAngle);
        ballDY = -ballSpeed * Math.sin(initialAngle);
        if (Math.random() < 0.5) ballDX = -ballDX; // Random initial horizontal direction
        paddleX = (canvas.width - paddleWidth) / 2;
    }

    function resetGame() {
        score = 0;
        lives = 3;
        setupBricks();
        resetBallAndPaddle();
    }

    async function gameOver(isWin) {
        gameRunning = false;
        if (animationFrameId) {
            cancelAnimationFrame(animationFrameId);
            animationFrameId = null;
        }
        if (isWin) {
            AuraGameSDK.ui.showNotification('You Win!', `Final Score: ${score}`, 'success');
        } else {
            AuraGameSDK.ui.showNotification('Game Over', `Final Score: ${score}`, 'error');
        }

        // Always try to submit score
        try {
            // For now, playerName is hardcoded. In a real app, you'd get this from user input or profile.
            await AuraGameSDK.leaderboard.submitScore('AuraUser', score);
            AuraGameSDK.ui.showNotification('Score Submitted!', `Your score of ${score} was sent to the leaderboard.`, 'info');
        } catch (error) {
            AuraGameSDK.ui.showNotification('Score Submission Failed', 'Could not save your score.', 'warning');
            console.error("AuraBreaker: Failed to submit score:", error);
        }

        // Consider adding a "Play Again" button or similar, or let Game Center handle this.
        // For now, the game stops. The Game Center's "Back to Library" button will allow restart.
        // To allow an in-game restart:
        // ctx.font = "24px Inter, sans-serif";
        // ctx.fillStyle = "white";
        // ctx.textAlign = "center";
        // ctx.fillText(isWin ? "YOU WIN!" : "GAME OVER", canvas.width/2, canvas.height/2 - 30);
        // ctx.fillText("Click to Play Again", canvas.width/2, canvas.height/2 + 10);
        // canvas.addEventListener('click', startGame, { once: true }); // Re-add click listener for restart
    }

    // Mouse movement handler
    function mouseMoveHandler(e) {
        const rect = canvas.getBoundingClientRect();
        const relativeX = e.clientX - rect.left;
        if (relativeX > 0 && relativeX < canvas.width) {
            paddleX = relativeX - paddleWidth / 2;
            if (paddleX < 0) paddleX = 0;
            if (paddleX + paddleWidth > canvas.width) paddleX = canvas.width - paddleWidth;
        }
    }

    // Public methods
    this.start = function() {
        if (gameRunning) return;
        console.log("AuraBreaker: Starting game...");
        resetGame();
        gameRunning = true;

        // Add mouse listener only when game starts
        document.addEventListener("mousemove", mouseMoveHandler, false);
        // canvas.addEventListener("mousemove", mouseMoveHandler, false); // Use document for wider paddle control

        gameLoop();
    };

    this.stop = function() {
        if (!gameRunning) return;
        console.log("AuraBreaker: Stopping game...");
        gameRunning = false;
        if (animationFrameId) {
            cancelAnimationFrame(animationFrameId);
            animationFrameId = null;
        }
        // Remove mouse listener when game stops
        document.removeEventListener("mousemove", mouseMoveHandler, false);
        // canvas.removeEventListener("mousemove", mouseMoveHandler, false);

        // Clear canvas or show a "paused" message if desired
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.font = "20px Inter, sans-serif";
        ctx.fillStyle = "grey";
        ctx.textAlign = "center";
        ctx.fillText("Game Paused. Select 'Play' to resume.", canvas.width/2, canvas.height/2);

    };

    this.isRunning = function() {
        return gameRunning;
    };

    // Initial setup
    setupBricks(); // Setup bricks once initially for display even before start
    draw(); // Draw initial state (bricks, paddle, etc.)
}

// Make AuraBreakerGame globally accessible if needed by Game Center to instantiate it.
// window.AuraBreakerGame = AuraBreakerGame;
