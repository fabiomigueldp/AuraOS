/**
 * Game Center - Game Launcher Module
 * 
 * Handles game launching, canvas sizing, and game lifecycle management.
 */

/**
 * Global game instance reference
 */
let currentGameInstance = null;

/**
 * Launches a game in the content area
 * @param {Object} gameData - Game configuration object
 * @param {HTMLElement} contentArea - Content area to render the game
 * @param {Function} onExit - Callback when game is exited
 */
export function launchGame(gameData, contentArea, onExit) {
    // Stop any running game instance
    if (currentGameInstance && currentGameInstance.isRunning()) {
        stopCurrentGame();
    }

    const canvasId = gameData.id + 'Canvas';
    contentArea.innerHTML = `
        <div class="game-canvas-view" style="width:100%; height:100%; display:flex; flex-direction:column; align-items:center; justify-content: center;">
            <canvas id="${canvasId}" style="background-color: #111; border-radius: var(--ui-corner-radius-small); display: block; box-shadow: 0 0 15px rgba(0,0,0,0.5);"></canvas>
            <button class="exit-game-button" style="margin-top: 15px;">Exit Game</button>
        </div>
    `;
    
    // Calculate and set canvas size
    const canvas = document.getElementById(canvasId);
    if (!canvas) {
        console.error(`Canvas element with ID '${canvasId}' not found!`);
        contentArea.innerHTML = "<p>Error: Game canvas element missing.</p>";
        return;
    }

    const { width, height } = calculateCanvasSize(gameData, contentArea);
    canvas.width = Math.floor(width);
    canvas.height = Math.floor(height);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    // Check if AuraOS system is ready
    if (!window.auraOSSystemReady) {
        if (window.AuraOS && window.AuraOS.showNotification) {
            window.AuraOS.showNotification({ 
                title: 'System Not Ready', 
                message: 'AuraOS is still starting up. Please wait a moment and try again.', 
                type: 'warning' 
            });
        }
        console.warn('Game launch aborted: AuraOS system not ready (DB might not be initialized).');
        onExit();
        return;
    }

    // Launch the specific game
    const gameClassName = gameData.gameClass;
    const GameClass = window[gameClassName];
    
    if (typeof GameClass === 'function') {
        // Pass the onExit callback to the game instance if it might need it (e.g., for pause menu quit)
        currentGameInstance = new GameClass(canvas, onExit);
        
        // Handle different game starting patterns
        if (gameData.id === 'aura-whack') {
            // AuraWhack doesn't auto-start - let the player see the menu first
        } else {
            currentGameInstance.start();
        }

        // Set up resize observer for responsive games (e.g., Tetris)
        setupResizeObserver(gameData, canvas, contentArea);

        // Set global reference for compatibility
        window.currentGameInstance = currentGameInstance;
        
    } else {
        console.error("Game class not found or ID mismatch for:", gameData.id);
        contentArea.innerHTML = "<p>Error: Could not load game.</p>";
        return;
    }

    // Set up exit button
    const exitButton = contentArea.querySelector('.exit-game-button');
    if (exitButton) {
        exitButton.addEventListener('click', () => {
            exitGame(contentArea, onExit);
        });
    }
}

/**
 * Exits the current game and returns to the previous view
 * @param {HTMLElement} contentArea - Content area element
 * @param {Function} onExit - Callback when game is exited
 */
export function exitGame(contentArea, onExit) {
    stopCurrentGame();
    onExit();
}

/**
 * Stops the current game instance and cleans up resources
 */
function stopCurrentGame() {
    if (currentGameInstance) {
        try {
            // Use destroy method for AuraWhack, stop for others
            if (typeof currentGameInstance.destroy === 'function') {
                currentGameInstance.destroy();
                console.log('Game instance destroyed via Game Center exit.');
            } else if (typeof currentGameInstance.stop === 'function') {
                currentGameInstance.stop();
                console.log('Game instance stopped via Game Center exit.');
            } else {
                console.warn('Current game instance does not have a stop() method.');
            }

            // Perform cleanup if the method exists
            if (typeof currentGameInstance.cleanup === 'function') {
                currentGameInstance.cleanup();
                console.log('Game instance cleaned up via Game Center exit.');
            }

            // Clean up resize observer if it exists
            if (currentGameInstance._resizeObserver && 
                typeof currentGameInstance._resizeObserver.disconnect === 'function') {
                currentGameInstance._resizeObserver.disconnect();
                currentGameInstance._resizeObserver = null;
                console.log('Game instance resize observer disconnected.');
            }

        } catch (error) {
            console.error('Error during game stop/cleanup:', error);
        } finally {
            // Release the instance
            currentGameInstance = null;
            window.currentGameInstance = null;
            console.log('Game instance set to null.');
        }
    }
}

/**
 * Calculates optimal canvas size for a game
 * @param {Object} gameData - Game configuration object
 * @param {HTMLElement} contentArea - Content area element
 * @returns {Object} Object with width and height properties
 */
export function calculateCanvasSize(gameData, contentArea) {
    const containerWidth = contentArea.clientWidth;
    const containerHeight = contentArea.clientHeight - 60; // Space for exit button
    let canvasWidth, canvasHeight;

    switch (gameData.id) {
        case 'aura-breaker':
            canvasWidth = containerWidth * 0.95;
            canvasHeight = canvasWidth * (3/4); // 4:3 aspect ratio
            if (canvasHeight > containerHeight) {
                canvasHeight = containerHeight;
                canvasWidth = canvasHeight * (4/3);
            }
            break;

        case 'aura-snake':
            // Square-ish aspect ratio for snake
            const smallerDim = Math.min(containerWidth * 0.9, containerHeight);
            canvasWidth = smallerDim;
            canvasHeight = smallerDim;
            break;

        case 'aura-whack':
            // Square canvas for the 3x3 grid
            const whackDim = Math.min(containerWidth * 0.85, containerHeight);
            canvasWidth = whackDim;
            canvasHeight = whackDim;
            break;

        case 'aura-timber':
            // Portrait orientation for tree cutting
            const margin = 20;
            const availableWidth = containerWidth - margin;
            const availableHeight = containerHeight - margin;
            const timberRatio = 3 / 4; // width/height ratio
            
            let optimalWidth = availableWidth;
            let optimalHeight = optimalWidth / timberRatio;
            
            if (optimalHeight > availableHeight) {
                optimalHeight = availableHeight;
                optimalWidth = optimalHeight * timberRatio;
            }
            
            const minWidth = 400;
            const minHeight = minWidth / timberRatio;
            
            canvasWidth = Math.max(optimalWidth, minWidth);
            canvasHeight = Math.max(optimalHeight, minHeight);
            
            if (canvasWidth > availableWidth) canvasWidth = availableWidth;
            if (canvasHeight > availableHeight) canvasHeight = availableHeight;
            break;

        case 'aura-tetris':
            // Optimize for Tetris game board proportions
            const tetrisMargin = 20;
            const tetrisAvailableWidth = containerWidth - tetrisMargin;
            const tetrisAvailableHeight = containerHeight - tetrisMargin;
            
            const gameBoardRatio = 10 / 20; // 0.5 (width/height of game board)
            const totalWidthRatio = gameBoardRatio / 0.7; // Account for UI space
            
            let tetrisOptimalWidth = tetrisAvailableWidth;
            let tetrisOptimalHeight = tetrisOptimalWidth / totalWidthRatio;
            
            if (tetrisOptimalHeight > tetrisAvailableHeight) {
                tetrisOptimalHeight = tetrisAvailableHeight;
                tetrisOptimalWidth = tetrisOptimalHeight * totalWidthRatio;
            }
            
            const minGameWidth = 350;
            const minGameHeight = minGameWidth / totalWidthRatio;
            
            canvasWidth = Math.max(tetrisOptimalWidth, minGameWidth);
            canvasHeight = Math.max(tetrisOptimalHeight, minGameHeight);
            
            if (canvasWidth > tetrisAvailableWidth) canvasWidth = tetrisAvailableWidth;
            if (canvasHeight > tetrisAvailableHeight) canvasHeight = tetrisAvailableHeight;
            break;

        case 'aura-driller':
            // AuraDriller has a fixed grid width (e.g., 8 blocks)
            // Let's say blocks are 32x32. Grid width = 8 * 32 = 256.
            // We want to maintain this aspect ratio for the game area.
            const drillerGridWidthPixels = 8 * 32; // Example: 8 blocks * 32px/block
            const drillerAspectRatio = drillerGridWidthPixels / (drillerGridWidthPixels * 2); // Example: 1:2 width to effective height for play area

            canvasHeight = Math.min(containerHeight * 0.95, containerWidth / drillerAspectRatio);
            canvasWidth = canvasHeight * drillerAspectRatio;

            // Ensure it fits within the container, adjusting if necessary
            if (canvasWidth > containerWidth * 0.95) {
                canvasWidth = containerWidth * 0.95;
                canvasHeight = canvasWidth / drillerAspectRatio;
            }
            // Ensure minimum size for playability
            const minDrillerWidth = 256; // 8 blocks * 32px
            if (canvasWidth < minDrillerWidth) {
                canvasWidth = minDrillerWidth;
                canvasHeight = canvasWidth / drillerAspectRatio;
                 // Re-check height bounds after enforcing min width
                if (canvasHeight > containerHeight * 0.95) {
                    canvasHeight = containerHeight * 0.95;
                    canvasWidth = canvasHeight * drillerAspectRatio;
                }
            }
            break;

        default:
            // Fallback for other games
            canvasWidth = containerWidth * 0.9;
            canvasHeight = canvasWidth * (3/4);
            if (canvasHeight > containerHeight) {
                canvasHeight = containerHeight;
                canvasWidth = canvasHeight * (4/3);
            }
            break;
    }

    return { width: canvasWidth, height: canvasHeight };
}

/**
 * Sets up resize observer for responsive games
 * @param {Object} gameData - Game configuration object
 * @param {HTMLElement} canvas - Canvas element
 * @param {HTMLElement} contentArea - Content area element
 */
function setupResizeObserver(gameData, canvas, contentArea) {
    // Currently only Tetris needs resize handling
    if (gameData.id === 'aura-tetris' && window.ResizeObserver && currentGameInstance) {
        const resizeObserver = new ResizeObserver((entries) => {
            if (!currentGameInstance || !currentGameInstance.isRunning()) return;
            
            const entry = entries[0];
            if (!entry) return;
            
            const { width, height } = calculateCanvasSize(gameData, contentArea);
            
            // Update canvas size if significantly different
            if (Math.abs(canvas.width - width) > 10 || Math.abs(canvas.height - height) > 10) {
                canvas.width = Math.floor(width);
                canvas.height = Math.floor(height);
                canvas.style.width = `${width}px`;
                canvas.style.height = `${height}px`;
                
                // Trigger resize in game instance if method exists
                if (typeof currentGameInstance.onCanvasResize === 'function') {
                    currentGameInstance.onCanvasResize();
                }
            }
        });
        
        resizeObserver.observe(contentArea);
        currentGameInstance._resizeObserver = resizeObserver;
    }
}

/**
 * Get the current running game instance
 * @returns {Object|null} Current game instance or null
 */
export function getCurrentGameInstance() {
    return currentGameInstance;
}

/**
 * Set up window close handler for game cleanup
 * @param {HTMLElement} windowEl - Window element
 */
export function setupWindowCloseHandler(windowEl) {
    windowEl.addEventListener('aura:close', () => {
        console.log('Game Center window closing. Stopping game if running.');
        stopCurrentGame();
    });
}
