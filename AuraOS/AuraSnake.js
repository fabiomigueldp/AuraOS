/**
 * @file AuraSnake.js
 * Implements the classic Snake game with a modern twist for AuraOS.
 */

function AuraSnakeGame(canvas) {
    if (!canvas || !(canvas instanceof HTMLCanvasElement)) {
        console.error("AuraSnake: Invalid canvas element provided.");
        // Potentially throw an error or return null if critical
        return;
    }

    const ctx = canvas.getContext('2d');
    AuraGameSDK.init('aura-snake', canvas);

    const self = this; // For calling instance methods from private functions

    // Game state variables
    let score = 0;
    let gameRunning = false;
    let snake; // Array of {x, y} segments, e.g., [{x: 10, y: 10}, {x: 9, y: 10}]
    let food; // Object {x, y}, e.g., {x: 15, y: 15}
    let direction; // 'right', 'left', 'up', 'down'

    const gridSize = 20; // Size of each grid cell in pixels
    let tileCountX; // Number of tiles in X, calculated in start() based on canvas size
    let tileCountY; // Number of tiles in Y, calculated in start() based on canvas size

    // Colors (placeholders, actual fetching from CSS variables will be done in start/reset)
    let snakeHeadColor = 'rgba(99, 210, 179, 1)'; // Placeholder for var(--highlight-secondary)
    let snakeBodyColor = 'rgba(99, 210, 179, 0.7)'; // Placeholder with some transparency
    let foodColor = 'rgba(255, 95, 86, 1)';      // Placeholder for var(--red-accent)
    let gridColor = 'rgba(50, 50, 50, 0.5)';    // Example grid color

    let animationFrameId = null; // To store the requestAnimationFrame ID
    let gameTickDelay = 120; // Milliseconds between snake movements
    let lastTickTime = 0;

    // Sound assets
    const eatSound = new Audio('https://www.soundjay.com/button/sounds/button-16.mp3');
    const gameOverSound = new Audio('https://www.soundjay.com/misc/sounds/fail-buzzer-01.mp3');

    // --- Event Listener Function ---
    function handleInput(event) {
        if (!gameRunning) return; // Only process input if game is running

        const key = event.key;
        let newDirection = direction;

        if (key === 'ArrowUp' && direction !== 'down') {
            newDirection = 'up';
        } else if (key === 'ArrowDown' && direction !== 'up') {
            newDirection = 'down';
        } else if (key === 'ArrowLeft' && direction !== 'right') {
            newDirection = 'left';
        } else if (key === 'ArrowRight' && direction !== 'left') {
            newDirection = 'right';
        }

        direction = newDirection; // Update direction
    }

    // --- Public Methods ---

    /**
     * Starts the AuraSnake game.
     * Initializes game state, resets elements, and starts the game loop.
     */
    this.start = function() {
        if (gameRunning) {
            console.log("AuraSnake: Game is already running.");
            return;
        }
        console.log("AuraSnake: Starting game...");

        // Initialize canvas-dependent variables
        tileCountX = Math.floor(canvas.width / gridSize);
        tileCountY = Math.floor(canvas.height / gridSize);

        try {
            const rootStyle = getComputedStyle(document.documentElement);
            const shc = rootStyle.getPropertyValue('--highlight-secondary').trim();
            const fc = rootStyle.getPropertyValue('--red-accent').trim();
            if (shc) snakeHeadColor = shc;
            if (fc) foodColor = fc;

            // Basic parsing for body color (assuming var is rgb/rgba or hex)
            let r=0, g=0, b=0;
            if (snakeHeadColor.startsWith('rgba')) {
                [r,g,b] = snakeHeadColor.match(/\d+/g).slice(0,3);
            } else if (snakeHeadColor.startsWith('rgb')) {
                [r,g,b] = snakeHeadColor.match(/\d+/g).slice(0,3);
            } else if (snakeHeadColor.startsWith('#')) {
                const hex = snakeHeadColor.replace('#', '');
                if (hex.length === 3) { [r,g,b] = [parseInt(hex[0]+hex[0],16), parseInt(hex[1]+hex[1],16), parseInt(hex[2]+hex[2],16)]; }
                else if (hex.length === 6) { [r,g,b] = [parseInt(hex.substring(0,2),16), parseInt(hex.substring(2,4),16), parseInt(hex.substring(4,6),16)]; }
            }
            if(r || g || b) snakeBodyColor = `rgba(${r}, ${g}, ${b}, 0.7)`;

        } catch (e) {
            console.warn("AuraSnake: Could not fetch CSS variable colors, using defaults.", e);
        }

        score = 0;
        snake = [
            { x: Math.floor(tileCountX / 4), y: Math.floor(tileCountY / 2) },
            { x: Math.floor(tileCountX / 4) - 1, y: Math.floor(tileCountY / 2) },
            { x: Math.floor(tileCountX / 4) - 2, y: Math.floor(tileCountY / 2) }
        ];
        direction = 'right';
        spawnFood(); // Place initial food correctly

        gameRunning = true;
        lastTickTime = 0; // Reset last tick time

        document.addEventListener('keydown', handleInput); // Add event listener

        // Remove previous animation frame if any to prevent multiple loops
        if (animationFrameId) {
            cancelAnimationFrame(animationFrameId);
        }
        gameLoop(0); // Start the game loop, passing initial timestamp

        console.log("AuraSnake: Game loop started.");
    };

    this.stop = function() {
        if (!gameRunning) {
            // console.log("AuraSnake: Game is not running or already stopped."); // Make it less verbose
            return;
        }
        console.log("AuraSnake: Stopping game...");
        gameRunning = false; // Set before potentially returning or further actions
        if (animationFrameId) {
            cancelAnimationFrame(animationFrameId);
            animationFrameId = null;
        }
        document.removeEventListener('keydown', handleInput); // Remove event listener

        // Clear canvas or show a "paused/stopped" message
        // const tempCtx = canvas.getContext('2d'); // ctx is already defined in the outer scope
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.font = "20px Inter, sans-serif";
        ctx.fillStyle = "grey";
        ctx.textAlign = "center";
        ctx.fillText("AuraSnake: Game Stopped.", canvas.width/2, canvas.height/2);
        console.log("AuraSnake: Game stopped.");
    };

    /**
     * Checks if the game is currently running.
     * @returns {boolean} True if the game is running, false otherwise.
     */
    this.isRunning = function() {
        return gameRunning;
    };

    // --- Private Helper Functions ---

    function spawnFood() {
        let newFoodX, newFoodY;
        let validPosition = false;
        while (!validPosition) {
            newFoodX = Math.floor(Math.random() * tileCountX);
            newFoodY = Math.floor(Math.random() * tileCountY);
            validPosition = true;
            for (const segment of snake) {
                if (segment.x === newFoodX && segment.y === newFoodY) {
                    validPosition = false;
                    break;
                }
            }
        }
        food = { x: newFoodX, y: newFoodY };
    }

    function updateGame() {
        if (!gameRunning) return;

        let newHeadX = snake[0].x;
        let newHeadY = snake[0].y;

        if (direction === 'right') newHeadX++;
        else if (direction === 'left') newHeadX--;
        else if (direction === 'up') newHeadY--;
        else if (direction === 'down') newHeadY++;

        // Wall collision
        if (newHeadX < 0 || newHeadX >= tileCountX || newHeadY < 0 || newHeadY >= tileCountY) {
            gameOverTrigger();
            return;
        }

        const newHead = { x: newHeadX, y: newHeadY };

        // Self-collision (check before unshifting new head to current snake)
        for (let i = 0; i < snake.length; i++) { // Check against all segments including current head (if it hasn't moved)
            if (newHead.x === snake[i].x && newHead.y === snake[i].y) {
                 // If the snake is very short (e.g. length 1 or 2), this check might be too sensitive
                 // For a typical snake, hitting any existing segment is game over.
                gameOverTrigger();
                return;
            }
        }

        snake.unshift(newHead); // Add new head

        // Food consumption
        if (newHead.x === food.x && newHead.y === food.y) {
            score += 10; // Increment score
            spawnFood(); // Generate new food
            eatSound.play();
            // Snake grows, so we don't pop the tail
        } else {
            snake.pop(); // Remove tail if no food eaten
        }
    }

    async function gameOverTrigger() { // Make the function async
        if (!gameRunning && !self.isRunning()) { // Check both internal and public state to be safe
             // If game is already stopped (e.g. multiple triggers or external stop), do nothing.
            return;
        }
        gameRunning = false; // Primary flag to stop game logic in updateGame/gameLoop

        console.log("Game Over! Final Score:", score);
        gameOverSound.play(); // Placeholder sound

        self.stop(); // Calls the public stop method for cleanup (cancels animation frame, removes input listeners)

        // Display Game Over message on canvas (already exists, can be kept or removed if SDK notification is enough)
        ctx.fillStyle = "rgba(0,0,0,0.75)"; // Dim the background
        ctx.fillRect(0,0,canvas.width, canvas.height);
        ctx.font = "bold 30px Inter, sans-serif";
        ctx.fillStyle = "white";
        ctx.textAlign = "center";
        ctx.shadowColor = "rgba(0,0,0,0.7)";
        ctx.shadowBlur = 5;
        ctx.fillText("Game Over!", canvas.width / 2, canvas.height / 2 - 30);
        ctx.font = "24px Inter, sans-serif";
        ctx.fillText("Score: " + score, canvas.width / 2, canvas.height / 2 + 15);
        ctx.shadowBlur = 0;


        // SDK Notifications and Score Submission
        AuraGameSDK.ui.showNotification('Game Over', `Your final score: ${score}`, 'error');

        try {
            await AuraGameSDK.leaderboard.submitScore('AuraUser', score); // AuraUser is a placeholder
            AuraGameSDK.ui.showNotification('Score Submitted', `Your score of ${score} was sent to the leaderboard!`, 'success');
        } catch (error) {
            console.error("AuraSnake: Failed to submit score:", error);
            AuraGameSDK.ui.showNotification('Score Submission Failed', `Could not save your score: ${error.message || 'Unknown error'}`, 'warning');
        }
    }

    function gameLoop(currentTime) { // currentTime is passed by requestAnimationFrame
        if (!gameRunning) {
            if (animationFrameId) { // Ensure we clear the animation frame if game stops externally
                cancelAnimationFrame(animationFrameId);
                animationFrameId = null;
            }
            return;
        }

        animationFrameId = requestAnimationFrame(gameLoop); // Request next frame immediately

        const elapsed = currentTime - lastTickTime;

        if (elapsed > gameTickDelay) {
            lastTickTime = currentTime - (elapsed % gameTickDelay); // Adjust lastTickTime to keep timing consistent

            updateGame();
            if(gameRunning) { // Only draw if game is still running after update
                 drawGame();
            }
        }
    }

    function drawGrid() {
        // ctx.strokeStyle = gridColor;
        // ctx.lineWidth = 0.5;
        // for (let x = 0; x < tileCountX; x++) {
        //     for (let y = 0; y < tileCountY; y++) {
        //         // ctx.strokeRect(x * gridSize, y * gridSize, gridSize, gridSize);
        //     }
        // }
    }

    function drawSnake() {
        const head = snake[0];
        ctx.fillStyle = snakeHeadColor;
        ctx.shadowColor = snakeHeadColor;
        ctx.shadowBlur = 10;

        ctx.beginPath();
        const headOffset = -1; // Make head appear slightly larger
        const headSize = gridSize - (headOffset * 2);
        ctx.roundRect((head.x * gridSize) + headOffset, (head.y * gridSize) + headOffset, headSize, headSize, 6);
        ctx.fill();
        ctx.shadowBlur = 0;

        for (let i = 1; i < snake.length; i++) {
            const segment = snake[i];
            const alpha = Math.max(0.4, 1 - (i / (snake.length * 1.1)));

            let currentBodyColor = snakeBodyColor;
            ctx.globalAlpha = alpha; // Use globalAlpha for simplicity if color format is unknown
            ctx.fillStyle = snakeBodyColor; // Use the base body color

            ctx.shadowColor = snakeBodyColor;
            ctx.shadowBlur = 8;

            ctx.beginPath();
            const segmentPadding = 1.5;
            ctx.roundRect(
                (segment.x * gridSize) + segmentPadding,
                (segment.y * gridSize) + segmentPadding,
                gridSize - (segmentPadding * 2),
                gridSize - (segmentPadding * 2),
                3);
            ctx.fill();

            ctx.globalAlpha = 1.0;
            ctx.shadowBlur = 0;
        }
    }

    function drawFood() {
        ctx.fillStyle = foodColor;
        ctx.shadowColor = foodColor;
        ctx.shadowBlur = 15;

        ctx.beginPath();
        const foodPadding = gridSize * 0.1;
        const foodActualSize = gridSize - (foodPadding * 2);
        ctx.roundRect((food.x * gridSize) + foodPadding, (food.y * gridSize) + foodPadding, foodActualSize, foodActualSize, 5);
        ctx.fill();
        ctx.shadowBlur = 0;
    }

    function drawScore() {
        ctx.font = "bold 20px Inter, sans-serif"; // Made score bold
        ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
        ctx.textAlign = "left";
        ctx.shadowColor = "rgba(0, 0, 0, 0.5)";
        ctx.shadowBlur = 3;
        ctx.shadowOffsetX = 1;
        ctx.shadowOffsetY = 1;
        ctx.fillText("Score: " + score, gridSize / 2, gridSize * 1.2);
        ctx.shadowBlur = 0; // Reset shadows
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
    }

    function drawGame() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        // drawGrid();
        drawFood();
        drawSnake();
        drawScore();
    }

    // Placeholder for gameLoop, update, handleInput, etc.
    // function gameLoop() { ... }
    // function updateGame() { ... }
    // function handleInput(event) { ... }
    // function resetGame() { ... } // Will contain logic from start() plus more
    // function spawnFood() { ... }
    // function checkCollisions() { ... }
    // function gameOver() { ... }

    // Initial message or state before game starts (optional)
    // const initialCtx = canvas.getContext('2d');
    // initialCtx.font = "20px Inter, sans-serif";
    // initialCtx.fillStyle = "grey";
    // initialCtx.textAlign = "center";
    // initialCtx.fillText("AuraSnake: Ready. Select 'Play'.", canvas.width/2, canvas.height/2);
}

// If AuraSnakeGame needs to be globally accessible for instantiation by Game Center:
window.AuraSnakeGame = AuraSnakeGame;
