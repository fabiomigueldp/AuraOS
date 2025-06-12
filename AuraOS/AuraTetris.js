/**
 * @file AuraTetris.js
 * Implements a Tetris clone game using AuraGameSDK.
 */

function AuraTetrisGame(canvas) {
    if (!canvas || !(canvas instanceof HTMLCanvasElement)) {
        console.error("AuraTetrisGame: Invalid canvas element provided.");
        return;
    }

    const ctx = canvas.getContext('2d');
    AuraGameSDK.init('aura-tetris', canvas);
    const gameInstance = this; // Capture the instance context

    // Music will be managed by AuraGameSDK.audio

    let score = 0;
    let level = 1; // Start at level 1
    let linesCleared = 0; // Total lines cleared in the game

    const gameBoardWidth = 10;
    const gameBoardHeight = 20;

    // Optimized block size calculation for maximum space usage
    const uiWidthRatio = 0.28; // UI takes about 28% of total width
    const gameAreaWidth = canvas.width * (1 - uiWidthRatio);
    const gameAreaHeight = canvas.height * 0.95; // Leave small margin
    
    // Calculate block size based on available space
    const maxBlockSizeByWidth = Math.floor(gameAreaWidth / gameBoardWidth);
    const maxBlockSizeByHeight = Math.floor(gameAreaHeight / gameBoardHeight);
    const BLOCK_SIZE = Math.min(maxBlockSizeByWidth, maxBlockSizeByHeight);
    
    // Ensure minimum playable size
    let finalBlockSize = Math.max(BLOCK_SIZE, 12); // Minimum 12px blocks
    let BLOCK_PADDING = Math.max(1, Math.floor(finalBlockSize * 0.05)); // Small proportional padding
    
    console.log(`AuraTetris: Canvas ${canvas.width}x${canvas.height}, Block size: ${finalBlockSize}px`);
    
    const BOARD_BORDER_COLOR = 'rgba(100, 100, 100, 0.5)';
    const GRID_COLOR = 'rgba(50, 50, 70, 0.5)';

    // Calculate optimal positioning for game board and UI
    const totalGameWidth = gameBoardWidth * finalBlockSize;
    const totalGameHeight = gameBoardHeight * finalBlockSize;
    const uiWidth = canvas.width * uiWidthRatio;
    
    // Center the game board in its allocated space
    const gameAreaX = 0;
    const gameAreaY = 0;
    const gameAreaUsedWidth = gameAreaWidth;
    const gameAreaUsedHeight = totalGameHeight;
    
    let BOARD_OFFSET_X = gameAreaX + Math.max(0, (gameAreaUsedWidth - totalGameWidth) / 2);
    let BOARD_OFFSET_Y = gameAreaY + Math.max(0, (canvas.height - totalGameHeight) / 2);

    let gameBoard = [];
    let currentPiece = null;
    let nextPiece = null;
    let gameRunning = false;
    let currentBag = [];
    let heldPiece = null;
    let canHold = true;
    let animationFrameId = null;
    let gameTickTimer = 0;
    const initialDropInterval = 1000;
    let currentDropInterval = initialDropInterval;

    const LOCK_DELAY_DURATION = 500; // milliseconds
    let lockDelayTimer = 0;
    let isLocking = false;
    let successfulMovesWhileLocking = 0; // For potential future limit on Infinity
    const MAX_INFINITY_MOVES = 15; // Guideline: limit Infinity resets

    const LINE_CLEAR_ANIMATION_DURATION = 300; // milliseconds
    let isAnimatingLineClear = false;
    let lineClearAnimationTimer = 0;
    let linesBeingCleared = []; // Array to store indices of rows being cleared
    let isPaused = false;

    const SRS_KICK_DATA = {
        'JLSTZ': { // Kicks for J, L, S, T, Z pieces
            '0_R': [{x: 0, y: 0}, {x: -1, y: 0}, {x: -1, y: -1}, {x: 0, y: +2}, {x: -1, y: +2}], // State 0 to R (Rotation 1)
            'R_0': [{x: 0, y: 0}, {x: +1, y: 0}, {x: +1, y: +1}, {x: 0, y: -2}, {x: +1, y: -2}], // State R to 0
            'R_2': [{x: 0, y: 0}, {x: +1, y: 0}, {x: +1, y: +1}, {x: 0, y: -2}, {x: +1, y: -2}], // State R to 2 (Rotation 2)
            '2_R': [{x: 0, y: 0}, {x: -1, y: 0}, {x: -1, y: -1}, {x: 0, y: +2}, {x: -1, y: +2}], // State 2 to R
            '2_L': [{x: 0, y: 0}, {x: +1, y: 0}, {x: +1, y: -1}, {x: 0, y: +2}, {x: +1, y: +2}], // State 2 to L (Rotation 3)
            'L_2': [{x: 0, y: 0}, {x: -1, y: 0}, {x: -1, y: +1}, {x: 0, y: -2}, {x: -1, y: -2}], // State L to 2
            'L_0': [{x: 0, y: 0}, {x: -1, y: 0}, {x: -1, y: +1}, {x: 0, y: -2}, {x: -1, y: -2}], // State L to 0 (Rotation 0)
            '0_L': [{x: 0, y: 0}, {x: +1, y: 0}, {x: +1, y: -1}, {x: 0, y: +2}, {x: +1, y: +2}]  // State 0 to L
        },
        'I': { // Kicks for I piece
            '0_R': [{x: 0, y: 0}, {x: -2, y: 0}, {x: +1, y: 0}, {x: -2, y: +1}, {x: +1, y: -2}],
            'R_0': [{x: 0, y: 0}, {x: +2, y: 0}, {x: -1, y: 0}, {x: +2, y: -1}, {x: -1, y: +2}],
            'R_2': [{x: 0, y: 0}, {x: -1, y: 0}, {x: +2, y: 0}, {x: -1, y: -2}, {x: +2, y: +1}],
            '2_R': [{x: 0, y: 0}, {x: +1, y: 0}, {x: -2, y: 0}, {x: +1, y: +2}, {x: -2, y: -1}],
            '2_L': [{x: 0, y: 0}, {x: +2, y: 0}, {x: -1, y: 0}, {x: +2, y: -1}, {x: -1, y: +2}],
            'L_2': [{x: 0, y: 0}, {x: -2, y: 0}, {x: +1, y: 0}, {x: -2, y: +1}, {x: +1, y: -2}],
            'L_0': [{x: 0, y: 0}, {x: +1, y: 0}, {x: -2, y: 0}, {x: +1, y: +2}, {x: -2, y: -1}],
            '0_L': [{x: 0, y: 0}, {x: -1, y: 0}, {x: +2, y: 0}, {x: -1, y: -2}, {x: +2, y: +1}]
        },
        'O': { // O piece does not use kicks
            '0_R': [{x: 0, y: 0}], 'R_0': [{x: 0, y: 0}], 'R_2': [{x: 0, y: 0}], '2_R': [{x: 0, y: 0}],
            '2_L': [{x: 0, y: 0}], 'L_2': [{x: 0, y: 0}], 'L_0': [{x: 0, y: 0}], '0_L': [{x: 0, y: 0}]
        }
    };

    const SCORE_MAP = { // For lines cleared at once
        1: 40,
        2: 100,
        3: 300,
        4: 1200
    };

    function initializeGameBoard() {
        const board = [];
        for (let row = 0; row < gameBoardHeight; row++) {
            board[row] = [];
            for (let col = 0; col < gameBoardWidth; col++) {
                board[row][col] = 0;
            }
        }
        return board;
    }
    gameBoard = initializeGameBoard();

    const TETROMINOES = {
        'I': { shape: [[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]], color: '#00DDFF' },
        'L': { shape: [[0,1,0],[0,1,0],[0,1,1]], color: '#FFA500' },
        'J': { shape: [[0,1,0],[0,1,0],[1,1,0]], color: '#0000FF' },
        'O': { shape: [[1,1],[1,1]], color: '#FFFF00' },
        'S': { shape: [[0,1,1],[1,1,0],[0,0,0]], color: '#00FF00' },
        'T': { shape: [[0,0,0],[1,1,1],[0,1,0]], color: '#AA00FF' },
        'Z': { shape: [[1,1,0],[0,1,1],[0,0,0]], color: '#FF1744' }
    };
    const PIECE_TYPES = Object.keys(TETROMINOES);

    function fillNextBag() {
        currentBag = [...PIECE_TYPES]; // Copy all piece types
        // Shuffle the bag (Fisher-Yates shuffle)
        for (let i = currentBag.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [currentBag[i], currentBag[j]] = [currentBag[j], currentBag[i]];
        }
        // console.log("AuraTetris: New 7-Bag generated:", currentBag); // For debugging
    }

    function createPiece(type) {
        const pieceData = TETROMINOES[type];
        if (!pieceData) {
            console.error(`AuraTetris: Attempted to create piece with unknown type: ${type}. Using 'I' piece as fallback.`);
            const fallbackData = TETROMINOES['I'];
            return {
                type: 'I',
                shape: JSON.parse(JSON.stringify(fallbackData.shape)), // Deep copy
                color: fallbackData.color,
                x: 0, y: 0,
                rotationState: 0
            };
        }
        return {
            type: type,
            shape: JSON.parse(JSON.stringify(pieceData.shape)), // Deep copy for mutable shape
            color: pieceData.color,
            x: 0, y: 0, // Initial position, will be centered by generateNewPiece
            rotationState: 0 // Initial rotation state (0, 1, 2, 3 mapping to '0', 'R', '2', 'L')
        };
    }

    function generateNextPieceObject() {
        if (currentBag.length === 0) {
            fillNextBag();
        }
        const pieceType = currentBag.pop(); // Get piece from the end of the bag
        if (!pieceType) { // Should not happen if logic is correct
            console.error("AuraTetris: Bag was empty after fill, or pieceType is undefined! Attempting recovery.");
            fillNextBag(); // Attempt to recover
            const recoveryPieceType = currentBag.pop();
             if (!recoveryPieceType) { // If still no piece, major issue
                console.error("AuraTetris: CRITICAL - Bag still empty after recovery attempt. Defaulting to 'I' piece.");
                return createPiece('I'); // Final fallback
            }
            return createPiece(recoveryPieceType);
        }
        return createPiece(pieceType);
    }

    function isValidMove(pieceToCheck, testX, testY, matrixToTest) {
        for (let r = 0; r < matrixToTest.length; r++) {
            for (let c = 0; c < matrixToTest[r].length; c++) {
                if (matrixToTest[r][c]) {
                    const boardX = testX + c;
                    const boardY = testY + r;
                    if (boardX < 0 || boardX >= gameBoardWidth || boardY >= gameBoardHeight) return false;
                    if (boardY >= 0 && gameBoard[boardY] && gameBoard[boardY][boardX] !== 0) return false;
                }
            }
        }
        return true;
    }

    async function triggerGameOver() {
        const wasRunning = gameRunning;
        gameRunning = false; // Stop game logic immediately

        if (animationFrameId) {
            cancelAnimationFrame(animationFrameId);
            animationFrameId = null;
        }
        document.removeEventListener('keydown', handleKeyPress);

        if (wasRunning) { // Only process these if the game was actually running
            AuraGameSDK.audio.stop();
            console.log("AuraTetris: Music stopped due to game over.");

            try {
                await AuraGameSDK.leaderboard.submitScore('AuraUser', score); // Using 'AuraUser' as placeholder
                console.log("AuraTetris: Score submitted successfully: ", score);
            } catch (error) {
                console.error("AuraTetris: Failed to submit score:", error);
            }
        }

        if (isPaused) { // Ensure any active pause modal is hidden
            AuraGameSDK.ui.hideModal('auraTetrisPauseMenu');
            isPaused = false;
        }

        const gameOverContent = `
            <div style="text-align: center;">
                <p style="font-size: 1.3em; margin-bottom: 10px;">Final Score: ${score}</p>
                <p>Lines Cleared: ${linesCleared}</p>
                <p>Level Reached: ${level}</p>
            </div>
        `;

        const gameOverModalOptions = {
            title: 'Game Over',
            content: gameOverContent,
            buttons: [
                {
                    text: 'Restart',
                    className: 'aura-sdk-button-primary',
                    callback: () => {
                        AuraGameSDK.ui.hideModal('auraTetrisGameOverMenu');
                        gameInstance.stop();
                        gameInstance.start();
                    }
                },
                {
                    text: 'Quit to AuraOS',
                    callback: () => {
                        AuraGameSDK.ui.hideModal('auraTetrisGameOverMenu');
                        gameInstance.stop();
                        if (canvas && canvas.closest) {
                            const gameWindow = canvas.closest('.window');
                            if (gameWindow && gameWindow.closeWindow) {
                                gameWindow.closeWindow();
                            } else {
                                console.warn("AuraTetris: Could not find standard AuraOS window close method for quit.");
                            }
                        }
                    }
                }
            ]
        };

        const existingModal = document.getElementById('auraTetrisGameOverMenu');
        if (existingModal) { // Optional: Remove if exists to ensure fresh content if somehow re-triggered
            // existingModal.remove(); // This might be too aggressive if SDK has internal state.
            // For now, we rely on not calling triggerGameOver multiple times or SDK handling ID conflicts.
            // Or, just update content if SDK supported it.
            // Safest for now is to just try to show. If it was already shown, this does little.
            // If it was hidden, it shows.
        } else {
             AuraGameSDK.ui.createModal('auraTetrisGameOverMenu', gameOverModalOptions);
        }
        AuraGameSDK.ui.showModal('auraTetrisGameOverMenu');

        // Draw the final board state once under the modal
        draw();
    }

    function generateNewPiece() {
        if (nextPiece === null) nextPiece = generateNextPieceObject();
        currentPiece = nextPiece;
        nextPiece = generateNextPieceObject();
        currentPiece.x = Math.floor(gameBoardWidth / 2) - Math.floor(currentPiece.shape[0].length / 2);
        currentPiece.y = 0;
        let pieceTopMargin = 0;
        for (let r = 0; r < currentPiece.shape.length; r++) {
            if (currentPiece.shape[r].some(cell => cell !== 0)) break;
            pieceTopMargin++;
        }
        currentPiece.y = -pieceTopMargin;
        if (!isValidMove(currentPiece, currentPiece.x, currentPiece.y, currentPiece.shape)) {
            triggerGameOver(); // This will now call the async version
            return false;
        }
        return true;
    }

    function drawBlock(x,y,c,iS=false){ // c can be a color string or an animation instruction object
        const drawX = x + BOARD_OFFSET_X;
        const drawY = y + BOARD_OFFSET_Y;
        
        if(iS){
            ctx.globalAlpha=0.3;
            ctx.strokeStyle=c;
            ctx.lineWidth=2;
            ctx.strokeRect(drawX+BLOCK_PADDING,drawY+BLOCK_PADDING,finalBlockSize-2*BLOCK_PADDING,finalBlockSize-2*BLOCK_PADDING);
            ctx.globalAlpha=1.0;
            return;
        }
        ctx.globalAlpha=0.6;
        ctx.fillStyle=c;
        ctx.fillRect(drawX+BLOCK_PADDING,drawY+BLOCK_PADDING,finalBlockSize-2*BLOCK_PADDING,finalBlockSize-2*BLOCK_PADDING);
        ctx.globalAlpha=0.3;
        ctx.fillStyle='rgba(255,255,255,0.5)';
        const gI=BLOCK_PADDING*2;
        ctx.fillRect(drawX+gI,drawY+gI,finalBlockSize-2*gI,finalBlockSize-2*gI);
        ctx.globalAlpha=0.8;
        ctx.strokeStyle='rgba(255,255,255,0.3)';
        ctx.lineWidth=1;
        ctx.strokeRect(drawX+BLOCK_PADDING,drawY+BLOCK_PADDING,finalBlockSize-2*BLOCK_PADDING,finalBlockSize-2*BLOCK_PADDING);
        ctx.globalAlpha=1.0;
    }
    function drawGameBoard(){
        const boardPixelWidth = gameBoardWidth * finalBlockSize;
        const boardPixelHeight = gameBoardHeight * finalBlockSize;
        
        ctx.strokeStyle=BOARD_BORDER_COLOR;
        ctx.lineWidth=2;
        ctx.strokeRect(BOARD_OFFSET_X, BOARD_OFFSET_Y, boardPixelWidth, boardPixelHeight);
        
        ctx.strokeStyle=GRID_COLOR;
        ctx.lineWidth=0.5;
        for(let x=0;x<=gameBoardWidth;x++){
            ctx.beginPath();
            ctx.moveTo(BOARD_OFFSET_X + x*finalBlockSize, BOARD_OFFSET_Y);
            ctx.lineTo(BOARD_OFFSET_X + x*finalBlockSize, BOARD_OFFSET_Y + boardPixelHeight);
            ctx.stroke();
        }
        for(let y=0;y<=gameBoardHeight;y++){
            ctx.beginPath();
            ctx.moveTo(BOARD_OFFSET_X, BOARD_OFFSET_Y + y*finalBlockSize);
            ctx.lineTo(BOARD_OFFSET_X + boardPixelWidth, BOARD_OFFSET_Y + y*finalBlockSize);
            ctx.stroke();
        }
        
        for(let r=0;r<gameBoardHeight;r++) {
            for(let c=0;c<gameBoardWidth;c++) {
                if(gameBoard[r][c]!==0) {
                    if (isAnimatingLineClear && linesBeingCleared.includes(r)) {
                        const animProgress = lineClearAnimationTimer / LINE_CLEAR_ANIMATION_DURATION;
                        // Simple blink: alternate between white and a darker version
                        const showWhite = Math.floor(animProgress * 8) % 2 === 0; // Blinks 4 times
                        const animColor = showWhite ? 'white' : '#444444'; // Flash white, then dark grey
                        drawBlock(c * finalBlockSize, r * finalBlockSize, animColor, false);
                    } else {
                        drawBlock(c*finalBlockSize,r*finalBlockSize,gameBoard[r][c]);
                    }
                }
            }
        }
    }
    function drawPiece(pDI,pOX,pOY,iS=false){if(!pDI||!pDI.shape)return;const M=pDI.shape;const C=pDI.color;for(let r=0;r<M.length;r++)for(let c=0;c<M[r].length;c++)if(M[r][c])drawBlock((pOX+c)*finalBlockSize,(pOY+r)*finalBlockSize,C,iS);}
    function drawGhostPiece(){if(!currentPiece||!gameRunning)return;let gY=currentPiece.y;while(isValidMove(currentPiece,currentPiece.x,gY+1,currentPiece.shape))gY++;drawPiece(currentPiece,currentPiece.x,gY,true);}

    function drawPieceInPreviewBox(piece, boxX, boxY, boxSize, title) {
        ctx.fillStyle = 'white';
        ctx.font = `bold ${Math.max(14, Math.floor(finalBlockSize * 0.7))}px Inter,sans-serif`;
        ctx.fillText(title, boxX, boxY);

        const actualBoxStartY = boxY + Math.max(8, finalBlockSize * 0.3);
        ctx.strokeStyle = GRID_COLOR;
        ctx.lineWidth = 1;
        ctx.strokeRect(boxX, actualBoxStartY, boxSize, boxSize);

        if (piece) {
            const m = piece.shape;
            const mW = m[0].length;
            const mH = m.length;
            let minR = mH, maxR = -1, minC = mW, maxC = -1;

            for (let r = 0; r < mH; ++r) for (let c = 0; c < mW; ++c) if (m[r][c]) {
                if (r < minR) minR = r; if (r > maxR) maxR = r; if (c < minC) minC = c; if (c > maxC) maxC = c;
            }
            
            const pAW = (maxC - minC + 1);
            const pAH = (maxR - minR + 1);

            const maxPreviewSize = boxSize * 0.8; // Max size of piece drawing within the box
            const previewBlockSize = Math.min(
                finalBlockSize * 0.8, // Don't make preview blocks larger than 80% of game block
                maxPreviewSize / Math.max(pAW, pAH)
            );

            const pOX = boxX + (boxSize - pAW * previewBlockSize) / 2;
            const pOY = actualBoxStartY + (boxSize - pAH * previewBlockSize) / 2;

            for (let r = 0; r < m.length; r++) {
                for (let c = 0; c < m[r].length; c++) {
                    if (m[r][c]) {
                         // Only draw the part of the shape that has blocks
                        if (r >= minR && r <= maxR && c >= minC && c <= maxC) {
                            const x = pOX + (c - minC) * previewBlockSize;
                            const y = pOY + (r - minR) * previewBlockSize;

                            ctx.globalAlpha = 0.7;
                            ctx.fillStyle = piece.color;
                            ctx.fillRect(x + 1, y + 1, previewBlockSize - 2, previewBlockSize - 2);

                            ctx.globalAlpha = 0.3;
                            ctx.fillStyle = 'rgba(255,255,255,0.5)';
                            ctx.fillRect(x + 2, y + 2, previewBlockSize - 4, previewBlockSize - 4);
                            ctx.globalAlpha = 1.0;
                        }
                    }
                }
            }
        }
        return actualBoxStartY + boxSize; // Return Y coordinate after this box
    }

    function drawUI() {
        const boardPixelWidth = gameBoardWidth * finalBlockSize;
        const uiStartX = BOARD_OFFSET_X + boardPixelWidth + Math.max(10, finalBlockSize * 0.4);
        let currentSectionY = BOARD_OFFSET_Y + Math.max(10, finalBlockSize * 0.5);
        
        const titleFontSize = Math.max(14, Math.floor(finalBlockSize * 0.7));
        const textFontSize = Math.max(12, Math.floor(finalBlockSize * 0.55));
        const previewBoxSize = Math.max(80, finalBlockSize * 3.2); // For Next and Hold
        const sectionSpacing = Math.max(15, finalBlockSize * 0.6);

        // Next Piece Display
        currentSectionY = drawPieceInPreviewBox(nextPiece, uiStartX, currentSectionY, previewBoxSize, 'Next:');
        currentSectionY += sectionSpacing;

        // Hold Piece Display
        currentSectionY = drawPieceInPreviewBox(heldPiece, uiStartX, currentSectionY, previewBoxSize, 'Hold:');
        currentSectionY += sectionSpacing;
        
        // Game stats section
        ctx.fillStyle = 'white';
        ctx.font = `${textFontSize}px Inter,sans-serif`;
        const lineHeight = Math.max(20, finalBlockSize * 0.8);
        ctx.fillText(`Score: ${score}`, uiStartX, currentSectionY);
        currentSectionY += lineHeight;
        ctx.fillText(`Level: ${level}`, uiStartX, currentSectionY);
        currentSectionY += lineHeight;
        ctx.fillText(`Lines: ${linesCleared}`, uiStartX, currentSectionY);
        
        // Add controls hint if there's space
        if (currentSectionY + lineHeight * 4 < canvas.height - 20) { // Adjusted for Shift key
            currentSectionY += lineHeight * 1.5;
            ctx.font = `${Math.max(10, textFontSize * 0.8)}px Inter,sans-serif`;
            ctx.fillStyle = 'rgba(255,255,255,0.6)';
            ctx.fillText('← → Move', uiStartX, currentSectionY);
            currentSectionY += lineHeight * 0.8;
            ctx.fillText('↑ Rotate', uiStartX, currentSectionY);
            currentSectionY += lineHeight * 0.8;
            ctx.fillText('↓ Soft Drop', uiStartX, currentSectionY);
            currentSectionY += lineHeight * 0.8;
            ctx.fillText('Space: Hard Drop', uiStartX, currentSectionY);
            currentSectionY += lineHeight * 0.8;
            ctx.fillText('Shift: Hold', uiStartX, currentSectionY);
        }
    }

    // Function to recalculate dimensions when canvas size changes  
    function recalculateDimensions() {
        const newUiWidthRatio = 0.28;
        const newGameAreaWidth = canvas.width * (1 - newUiWidthRatio);
        const newGameAreaHeight = canvas.height * 0.95;
        
        const newMaxBlockSizeByWidth = Math.floor(newGameAreaWidth / gameBoardWidth);
        const newMaxBlockSizeByHeight = Math.floor(newGameAreaHeight / gameBoardHeight);
        const newBlockSize = Math.max(Math.min(newMaxBlockSizeByWidth, newMaxBlockSizeByHeight), 12);
        
        // Update block size and related calculations
        finalBlockSize = newBlockSize;
        BLOCK_PADDING = Math.max(1, Math.floor(finalBlockSize * 0.05));
        
        // Recalculate positioning
        const newTotalGameWidth = gameBoardWidth * finalBlockSize;
        const newTotalGameHeight = gameBoardHeight * finalBlockSize;
        
        BOARD_OFFSET_X = Math.max(0, (newGameAreaWidth - newTotalGameWidth) / 2);
        BOARD_OFFSET_Y = Math.max(0, (canvas.height - newTotalGameHeight) / 2);
        
        console.log(`Tetris recalculated: Block size ${finalBlockSize}px, Canvas ${canvas.width}x${canvas.height}`);
        return newBlockSize;
    }

    // Public method to handle canvas resize
    this.onCanvasResize = function() {
        if (gameRunning) {
            recalculateDimensions();
            draw(); // Redraw with new dimensions
            
            // Show brief resize notification
            if (typeof AuraGameSDK !== 'undefined' && AuraGameSDK.ui) {
                AuraGameSDK.ui.showNotification('Display Updated', `Canvas resized to ${canvas.width}x${canvas.height}`, 'info', 1000);
            }
        }
    };
    function draw(){ctx.clearRect(0,0,canvas.width,canvas.height);drawGameBoard();if(gameRunning)drawGhostPiece();if(currentPiece&&gameRunning)drawPiece(currentPiece,currentPiece.x,currentPiece.y);drawUI();}
    draw();

    // Initialize with optimal layout
    console.log(`AuraTetris initialized: Canvas ${canvas.width}x${canvas.height}, Block size: ${finalBlockSize}px`);

    let lastTime = 0;

    function rotateMatrix(m){const r=m.length,c=m[0].length;const nM=[];for(let i=0;i<c;i++){nM[i]=[];for(let j=0;j<r;j++)nM[i][j]=m[j][i];}nM.forEach(rw=>rw.reverse());return nM;}

    function isPieceOnGround() {
        if (!currentPiece) return false;
        return !isValidMove(currentPiece, currentPiece.x, currentPiece.y + 1, currentPiece.shape);
    }

    function resetLockDelayIfActive() {
        if (isLocking && isPieceOnGround()) { // Check isPieceOnGround again, piece might have rotated off ground
            if (successfulMovesWhileLocking < MAX_INFINITY_MOVES) {
                lockDelayTimer = LOCK_DELAY_DURATION;
                successfulMovesWhileLocking++;
                // console.log("Lock delay reset (Infinity). Count: " + successfulMovesWhileLocking);
            } else {
                // Infinity limit reached, lock piece immediately
                // console.log("Infinity limit reached. Locking piece.");
                lockPiece();
            }
        }
    }

    function rotatePiece() { // Handles clockwise rotation (ArrowUp)
        if (!currentPiece || !gameRunning) return;

        if (currentPiece.type === 'O') {
            return;
        }

        const originalRotationState = currentPiece.rotationState;
        const tempShapeMatrix = JSON.parse(JSON.stringify(currentPiece.shape));
        const rotatedShapeAttempt = rotateMatrix(tempShapeMatrix);
        const nextRotationState = (originalRotationState + 1) % 4;

        const pieceTypeKey = (currentPiece.type === 'I') ? 'I' : 'JLSTZ';
        const srsStateMap = ['0', 'R', '2', 'L'];
        const currentSrsStateLabel = srsStateMap[originalRotationState];
        const nextSrsStateLabel = srsStateMap[nextRotationState];
        const kickTableId = `${currentSrsStateLabel}_${nextSrsStateLabel}`;

        const kicksToTest = (SRS_KICK_DATA[pieceTypeKey] && SRS_KICK_DATA[pieceTypeKey][kickTableId])
                           ? SRS_KICK_DATA[pieceTypeKey][kickTableId]
                           : [{x:0,y:0}];

        for (const kick of kicksToTest) {
            const testX = currentPiece.x + kick.x;
            const testY = currentPiece.y + kick.y;

            if (isValidMove(currentPiece, testX, testY, rotatedShapeAttempt)) {
                currentPiece.x = testX;
                currentPiece.y = testY;
                currentPiece.shape = rotatedShapeAttempt;
                currentPiece.rotationState = nextRotationState;

                resetLockDelayIfActive();

                draw();
                return;
            }
        }
    }

    function movePiece(dx){
        if(!currentPiece||!gameRunning)return;
        if(isValidMove(currentPiece,currentPiece.x+dx,currentPiece.y,currentPiece.shape)){
            currentPiece.x+=dx;
            resetLockDelayIfActive();
            draw();
        }
    }

    function softDrop() {
        if (!currentPiece || !gameRunning) return;

        if (isValidMove(currentPiece, currentPiece.x, currentPiece.y + 1, currentPiece.shape)) { // Can move down
            currentPiece.y += 1;
            gameTickTimer = 0; // Reset gravity timer

            if (isLocking) { // If piece was in lock delay but is now moved down, cancel lock.
                isLocking = false;
                successfulMovesWhileLocking = 0;
            }
        } else { // Cannot move down further (is on ground)
            if (!isLocking) { // If not already trying to lock, start the process.
                isLocking = true;
                lockDelayTimer = LOCK_DELAY_DURATION;
                successfulMovesWhileLocking = 0;
            } else { // Already locking and on ground
                if (successfulMovesWhileLocking >= MAX_INFINITY_MOVES) {
                    lockPiece(); // Infinity limit reached, lock immediately
                }
                // If already locking and on ground, and infinity not reached, soft drop does not reset or expedite the lock here.
                // The lockDelayTimer continues to run.
            }
        }
        draw();
    }

    function hardDrop(){
        if(!currentPiece||!gameRunning)return;
        while(isValidMove(currentPiece,currentPiece.x,currentPiece.y+1,currentPiece.shape)){
            currentPiece.y+=1;
        }
        isLocking = false;
        successfulMovesWhileLocking = 0;
        lockDelayTimer = 0;
        lockPiece();
    }

    function holdPiece() {
        if (!gameRunning || !currentPiece || !canHold) {
            return;
        }

        const pieceToStoreInHold = {
            type: currentPiece.type,
            shape: JSON.parse(JSON.stringify(currentPiece.shape)),
            rotationState: currentPiece.rotationState,
            color: currentPiece.color
        };

        if (heldPiece === null) { // Hold slot is empty
            heldPiece = pieceToStoreInHold;
            if (!generateNewPiece()) {
                // Game over occurred during generateNewPiece
                // To be absolutely safe, clear heldPiece if game over, though it's minor at this point.
                // The main thing is that gameRunning will be false.
                // heldPiece = null; // Not strictly necessary as game is over.
                return;
            }
        } else { // Hold slot is occupied, swap
            const pieceFromHold = heldPiece; // This is already a well-formed piece object
            heldPiece = pieceToStoreInHold;

            // currentPiece takes properties from pieceFromHold
            currentPiece.type = pieceFromHold.type;
            currentPiece.shape = JSON.parse(JSON.stringify(pieceFromHold.shape)); // Deep copy
            currentPiece.rotationState = pieceFromHold.rotationState;
            currentPiece.color = pieceFromHold.color;

            // Reset position for the new currentPiece (from hold)
            currentPiece.x = Math.floor(gameBoardWidth / 2) - Math.floor(currentPiece.shape[0].length / 2);
            currentPiece.y = 0;
            let pieceTopMargin = 0;
            for (let r = 0; r < currentPiece.shape.length; r++) {
                if (currentPiece.shape[r].some(cell => cell !== 0)) break;
                pieceTopMargin++;
            }
            currentPiece.y = -pieceTopMargin;

            if (!isValidMove(currentPiece, currentPiece.x, currentPiece.y, currentPiece.shape)) {
                // If swapped piece from hold can't be placed, it's game over.
                // Revert currentPiece and heldPiece to state before attempted swap for consistency, though game is over.
                // This is complex because currentPiece was overwritten.
                // For simplicity: triggerGameOver. The exact state of currentPiece/heldPiece at this instant of game over is less critical.
                triggerGameOver();
                return;
            }
        }
        canHold = false;
        draw(); // Redraw the game state
    }

    gameInstance.togglePause = function() {
        isPaused = !isPaused;
        if (isPaused) {
            if(gameRunning) AuraGameSDK.audio.pause();
            const pauseModalOptions = {
                title: 'Game Paused',
                content: '<p>The game is currently paused.</p>',
                buttons: [
                    {
                        text: 'Resume',
                        className: 'aura-sdk-button-primary',
                        callback: () => gameInstance.togglePause() // Resume game
                    },
                    {
                        text: 'Restart',
                        callback: () => {
                            AuraGameSDK.ui.hideModal('auraTetrisPauseMenu');
                            // isPaused will be set to false by gameInstance.start()
                            gameInstance.stop(); // Stop current game first
                            gameInstance.start(); // Restart new game
                        }
                    },
                    {
                        text: 'Quit to AuraOS',
                        callback: () => {
                            AuraGameSDK.ui.hideModal('auraTetrisPauseMenu');
                            isPaused = false; // Ensure unpaused state for proper stop
                            gameInstance.stop();
                            if (canvas && canvas.closest) {
                                const gameWindowElement = canvas.closest('.window');
                                if (gameWindowElement && typeof gameWindowElement.closeWindow === 'function') {
                                    gameWindowElement.closeWindow();
                                } else {
                                    console.warn("AuraTetris: Could not find standard AuraOS window close method on parent.");
                                }
                            } else {
                                console.warn("AuraTetris: Canvas is not part of a known window structure to close.");
                            }
                        }
                    }
                ]
            };

            // Check if modal exists, if not create it.
            // This check might be an issue if the modal was closed by other means (e.g. user manually removing from DOM - unlikely)
            // AuraGameSDK.ui should ideally handle this gracefully (e.g. createModal is idempotent or has an option)
            // For now, a simple check:
            if (!document.getElementById('auraTetrisPauseMenu')) {
                 AuraGameSDK.ui.createModal('auraTetrisPauseMenu', pauseModalOptions);
            }
            AuraGameSDK.ui.showModal('auraTetrisPauseMenu');
        } else { // Resuming
            if(gameRunning) AuraGameSDK.audio.resume();
            AuraGameSDK.ui.hideModal('auraTetrisPauseMenu');
            // Ensure game focus if needed, though typically modal handling by SDK should suffice
        }
    };

    function handleKeyPress(e){
        if (['p', 'P', 'Escape'].includes(e.key)) {
            e.preventDefault();
            if (e.key === 'Escape' && !gameRunning && !isPaused) { // If game is over (not running) and not paused, Esc shouldn't toggle pause
                 // Potentially allow Esc to close a "Game Over" summary modal if one exists in future
                return;
            }
            if (!gameRunning && !isPaused && (e.key === 'p' || e.key === 'P')) { // Don't allow pausing if game hasn't started or is over
                return;
            }
            gameInstance.togglePause();
            return;
        }

        if (isPaused || !gameRunning || (isAnimatingLineClear && e.key !== 'Escape')) return;
        if (!currentPiece && gameRunning && !isAnimatingLineClear) return;

        if (['ArrowLeft', 'ArrowRight', 'ArrowDown', 'ArrowUp', ' ', 'Shift', 's', 'S'].includes(e.key)) {
            e.preventDefault();
        }
        switch(e.key){
            case 'ArrowLeft': movePiece(-1); break;
            case 'ArrowRight': movePiece(1); break;
            case 'ArrowDown': softDrop(); break;
            case 'ArrowUp': rotatePiece(); break;
            case ' ': hardDrop(); break;
            case 'Shift': // Fallthrough for 's' or 'S'
            case 's':
            case 'S':
                holdPiece(); break;
        }
    }

    function updateLevel() {
        const newLevel = Math.floor(linesCleared / 10) + 1;
        if (newLevel > level) {
            level = newLevel;
            currentDropInterval = initialDropInterval - ((level - 1) * 50);
            if (currentDropInterval < 100) currentDropInterval = 100;
            console.log(`AuraTetris: Level up! New Level: ${level}, Drop Interval: ${currentDropInterval}ms`);
        }
    }

    function markLinesForClearingAndGetCount() {
        let linesClearedThisTurn = 0;
        linesBeingCleared = []; // Reset for current turn

        for (let r = gameBoardHeight - 1; r >= 0; r--) {
            if (gameBoard[r].every(cell => cell !== 0)) {
                linesClearedThisTurn++;
                linesBeingCleared.push(r); // Store row index
            }
        }
        return linesClearedThisTurn;
    }

    function performActualLineClear() {
        if (linesBeingCleared.length === 0) return;

        linesBeingCleared.sort((a, b) => b - a); // Sort descending for correct in-place splicing

        for (const rowIndex of linesBeingCleared) {
            gameBoard.splice(rowIndex, 1);
            gameBoard.unshift(new Array(gameBoardWidth).fill(0));
        }

        const linesCount = linesBeingCleared.length;
        linesCleared += linesCount; // Update total lines cleared for the game
        score += (SCORE_MAP[linesCount] || 0) * level;
        updateLevel(); // updateLevel checks linesCleared to adjust level and drop interval

        linesBeingCleared = []; // Clear the array for the next turn

        // After clearing and scoring, generate the next piece
        if (!generateNewPiece()) {
            // Game over was triggered by generateNewPiece (e.g., board full)
            return;
        }
    }

    function lockPiece() {
        if (!currentPiece) return;

        // Place piece on board
        const pieceM = currentPiece.shape;
        const pX = currentPiece.x;
        const pY = currentPiece.y;
        for (let r = 0; r < pieceM.length; r++) {
            for (let c = 0; c < pieceM[r].length; c++) {
                if (pieceM[r][c]) {
                    if (pY + r < 0) {
                        triggerGameOver();
                        return;
                    }
                    if (pY + r < gameBoardHeight && pX + c >= 0 && pX + c < gameBoardWidth) {
                        gameBoard[pY + r][pX + c] = currentPiece.color;
                    }
                }
            }
        }

        isLocking = false;
        lockDelayTimer = 0;
        successfulMovesWhileLocking = 0;

        const linesFound = markLinesForClearingAndGetCount();

        if (linesFound > 0) {
            isAnimatingLineClear = true;
            lineClearAnimationTimer = LINE_CLEAR_ANIMATION_DURATION;
        } else {
            if (!generateNewPiece()) {
                return;
            }
        }

        canHold = true;
    }

    function update(dT) {
        if (!gameRunning || isPaused) { // Added isPaused check here
            return;
        }

        if (isAnimatingLineClear) {
            lineClearAnimationTimer -= dT;
            if (lineClearAnimationTimer <= 0) {
                isAnimatingLineClear = false;
                performActualLineClear();
            }
        } else if (currentPiece) {
            gameTickTimer += dT;

            if (isLocking) {
                lockDelayTimer -= dT;
                if (lockDelayTimer <= 0) {
                    if (isPieceOnGround()) {
                        lockPiece();
                    } else {
                        isLocking = false;
                        successfulMovesWhileLocking = 0;
                    }
                }
            } else {
                if (gameTickTimer >= currentDropInterval) {
                    gameTickTimer = 0;
                    if (isPieceOnGround()) {
                        isLocking = true;
                        lockDelayTimer = LOCK_DELAY_DURATION;
                        successfulMovesWhileLocking = 0;
                    } else {
                        currentPiece.y += 1;
                    }
                }
            }
        }
    }

    function gameLoop(tS) {
        if(!gameRunning && !isPaused){ // If not running AND not paused (e.g. after stop()), truly stop the loop.
                                     // If only paused, loop continues for drawing.
            if(animationFrameId) cancelAnimationFrame(animationFrameId);
            animationFrameId=null;
            return;
        }

        const currentDeltaTime = tS - lastTime;
        if (!isPaused) {
            lastTime = tS;
        }
        // If game is running, call update. If paused, dT is 0 so update does minimum.
        // If game is not running but paused (e.g. pause menu over a game over screen), update is skipped.
        if(gameRunning) {
            update(isPaused ? 0 : currentDeltaTime || 0);
        }
        draw();
        animationFrameId = requestAnimationFrame(gameLoop);
    }

    this.start=function(){
        if(gameRunning) return;
        console.log("AuraTetrisGame:Starting game...");
        level = 1;
        score = 0;
        linesCleared = 0;
        gameBoard = initializeGameBoard();
        currentBag = [];
        heldPiece = null;
        canHold = true;
        nextPiece = null;

        isLocking = false;
        lockDelayTimer = 0;
        successfulMovesWhileLocking = 0;

        isAnimatingLineClear = false;
        lineClearAnimationTimer = 0;
        linesBeingCleared = [];
        isPaused = false;

        if (!generateNewPiece()) {
            console.error("AuraTetris: Failed to generate initial piece on game start. Game cannot begin.");
            // Potentially show a UI error or ensure gameRunning remains false
            gameRunning = false;
            return;
        }

        currentDropInterval = initialDropInterval - ((level - 1) * 50);
        if(currentDropInterval < 100) currentDropInterval = 100;

        gameTickTimer = 0;
        gameRunning = true;
        if(animationFrameId) cancelAnimationFrame(animationFrameId);

        document.removeEventListener('keydown', handleKeyPress); // Ensure no duplicates
        document.addEventListener('keydown', handleKeyPress);
        lastTime = performance.now();

// Start Tetris theme music when game starts
AuraGameSDK.audio.playLoopMusic('music/tracks/tetris_-_theme.mp3', 0.4)
    .then(() => {
        console.log("AuraTetris: Background music started via SDK");
    })
    .catch((error) => {
        console.warn("AuraTetris: Could not start background music via SDK:", error);
    });

// Before starting the loop, ensure lastTime is current for the first frame.
lastTime = performance.now();
gameLoop(lastTime);}; // Pass initial time to gameLoop

    this.stop=function(){
        // if(!gameRunning && !isPaused) return; // This check might prevent stopping a game that's already "over" but was paused.
                                         // Better to allow stop to run to ensure cleanup.
        console.log("AuraTetrisGame:Stopping game...");
        gameRunning=false; // This will affect update() and eventually gameLoop condition if not paused.
                           // If paused, gameLoop continues for drawing, so explicit cancel is good.
        if(animationFrameId) {
            cancelAnimationFrame(animationFrameId);
            animationFrameId=null;
        }
        document.removeEventListener('keydown',handleKeyPress);

        AuraGameSDK.audio.stop();
        console.log("AuraTetris: Music stop requested due to manual game stop/quit.");

        if (isPaused) {
            AuraGameSDK.ui.hideModal('auraTetrisPauseMenu');
            isPaused = false;
        }
    };
    this.isRunning=function(){return gameRunning;};

    // Cleanup function to stop music when window/game is closed
    this.cleanup = function() {
        AuraGameSDK.audio.stop(); // SDK handles if music is playing or not
        console.log("AuraTetris: Music stop requested due to cleanup");
        
        // Clean up resize observer if it exists
        if (this._resizeObserver) {
            this._resizeObserver.disconnect();
            this._resizeObserver = null;
        }
    };

    // Listen for window close event to cleanup music
    // This ensures that if the game instance is still around when the window closes,
    // it attempts to tell the SDK to stop its music.
    if (canvas && canvas.closest) {
        const gameWindow = canvas.closest('.window');
        if (gameWindow) {
            gameWindow.addEventListener('aura:close', () => {
                this.cleanup();
            });
        }
    }
}
window.AuraTetrisGame = AuraTetrisGame;
