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

    // Music system for Tetris theme
    let isMusicPlaying = false;
    let isMusicPaused = false;
    const TETRIS_THEME_PATH = 'music/tracks/tetris_-_theme.mp3';

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
    let animationFrameId = null;
    let gameTickTimer = 0;
    const initialDropInterval = 1000;
    let currentDropInterval = initialDropInterval;

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

    function getRandomPieceType() {
        return PIECE_TYPES[Math.floor(Math.random() * PIECE_TYPES.length)];
    }

    function createPiece(type) {
        const pieceData = TETROMINOES[type];
        return { type: type, shape: pieceData.shape, color: pieceData.color, x: 0, y: 0 };
    }

    function generateNextPieceObject() {
        const type = getRandomPieceType();
        return createPiece(type);
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

    async function triggerGameOver() { // Made async
        if (!gameRunning) {
            return;
        }

        console.log("AuraTetrisGame: Game Over. Final Score:", score);

        gameRunning = false;
        if (animationFrameId) {
            cancelAnimationFrame(animationFrameId);
            animationFrameId = null;
        }
        document.removeEventListener('keydown', handleKeyPress);

        // Stop music when game ends
        if (isMusicPlaying) {
            AuraGameSDK.audio.stop();
            isMusicPlaying = false;
            isMusicPaused = false;
            console.log("AuraTetris: Music stopped due to game over");
        }

        // Play game over sound (TODO)
        // if (gameOverSound) gameOverSound.play();

        AuraGameSDK.ui.showNotification('Game Over!', `Your final score: ${score}`, 'error');

        try {
            await AuraGameSDK.leaderboard.submitScore('AuraUser', score);
            AuraGameSDK.ui.showNotification('Score Submitted', `Score of ${score} sent to leaderboard.`, 'success');
        } catch (error) {
            console.error("AuraTetris: Failed to submit score:", error);
            AuraGameSDK.ui.showNotification('Submission Failed', 'Could not save your score to the leaderboard.', 'warning');
        }
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

    function drawBlock(x,y,c,iS=false){
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
        
        for(let r=0;r<gameBoardHeight;r++)
            for(let c=0;c<gameBoardWidth;c++)
                if(gameBoard[r][c]!==0)
                    drawBlock(c*finalBlockSize,r*finalBlockSize,gameBoard[r][c]);
    }
    function drawPiece(pDI,pOX,pOY,iS=false){if(!pDI||!pDI.shape)return;const M=pDI.shape;const C=pDI.color;for(let r=0;r<M.length;r++)for(let c=0;c<M[r].length;c++)if(M[r][c])drawBlock((pOX+c)*finalBlockSize,(pOY+r)*finalBlockSize,C,iS);}
    function drawGhostPiece(){if(!currentPiece||!gameRunning)return;let gY=currentPiece.y;while(isValidMove(currentPiece,currentPiece.x,gY+1,currentPiece.shape))gY++;drawPiece(currentPiece,currentPiece.x,gY,true);}
    function drawUI(){
        const boardPixelWidth = gameBoardWidth * finalBlockSize;
        const uiStartX = BOARD_OFFSET_X + boardPixelWidth + Math.max(10, finalBlockSize * 0.4);
        let uiY = BOARD_OFFSET_Y + Math.max(10, finalBlockSize * 0.5);
        
        // Responsive font sizes based on block size
        const titleFontSize = Math.max(14, Math.floor(finalBlockSize * 0.7));
        const textFontSize = Math.max(12, Math.floor(finalBlockSize * 0.55));
        
        ctx.fillStyle='white';
        ctx.font=`bold ${titleFontSize}px Inter,sans-serif`;
        
        // Next piece section
        ctx.fillText('Next:',uiStartX,uiY);
        uiY += Math.max(8, finalBlockSize * 0.3);
        
        // Next piece preview box - responsive size
        const previewBoxSize = Math.max(80, finalBlockSize * 3.2);
        ctx.strokeStyle=GRID_COLOR;
        ctx.lineWidth=1;
        ctx.strokeRect(uiStartX, uiY, previewBoxSize, previewBoxSize);
        
        if(nextPiece){
            const m = nextPiece.shape;
            const mW = m[0].length;
            const mH = m.length;
            let minR=mH,maxR=-1,minC=mW,maxC=-1;
            
            // Find piece bounds
            for(let r=0;r<mH;++r)for(let c=0;c<mW;++c)if(m[r][c]){
                if(r<minR)minR=r;if(r>maxR)maxR=r;if(c<minC)minC=c;if(c>maxC)maxC=c;
            }
            
            const pAW=(maxC-minC+1);
            const pAH=(maxR-minR+1);
            
            // Calculate preview block size to fit nicely in the box
            const maxPreviewSize = previewBoxSize * 0.8;
            const previewBlockSize = Math.min(
                finalBlockSize * 0.8, 
                maxPreviewSize / Math.max(pAW, pAH)
            );
            
            const pOX = uiStartX + (previewBoxSize - pAW*previewBlockSize)/2;
            const pOY = uiY + (previewBoxSize - pAH*previewBlockSize)/2;
            
            // Draw preview piece
            for(let r=0;r<m.length;r++)for(let c=0;c<m[r].length;c++)if(m[r][c]){
                if(r >= minR && r <= maxR && c >= minC && c <= maxC) {
                    const x = pOX + (c-minC)*previewBlockSize;
                    const y = pOY + (r-minR)*previewBlockSize;
                    
                    ctx.globalAlpha=0.7;
                    ctx.fillStyle=nextPiece.color;
                    ctx.fillRect(x+1, y+1, previewBlockSize-2, previewBlockSize-2);
                    
                    // Add small highlight
                    ctx.globalAlpha=0.3;
                    ctx.fillStyle='rgba(255,255,255,0.5)';
                    ctx.fillRect(x+2, y+2, previewBlockSize-4, previewBlockSize-4);
                    ctx.globalAlpha=1.0;
                }
            }
        }
        
        // Game stats section
        uiY += previewBoxSize + Math.max(15, finalBlockSize * 0.6);
        ctx.font=`${textFontSize}px Inter,sans-serif`;
        
        const lineHeight = Math.max(20, finalBlockSize * 0.8);
        ctx.fillText(`Score: ${score}`, uiStartX, uiY);
        uiY += lineHeight;
        ctx.fillText(`Level: ${level}`, uiStartX, uiY);
        uiY += lineHeight;
        ctx.fillText(`Lines: ${linesCleared}`, uiStartX, uiY);
        
        // Add controls hint if there's space
        if (uiY + lineHeight * 3 < canvas.height - 20) {
            uiY += lineHeight * 1.5;
            ctx.font=`${Math.max(10, textFontSize * 0.8)}px Inter,sans-serif`;
            ctx.fillStyle='rgba(255,255,255,0.6)';
            ctx.fillText('← → Move', uiStartX, uiY);
            uiY += lineHeight * 0.8;
            ctx.fillText('↑ Rotate', uiStartX, uiY);
            uiY += lineHeight * 0.8;
            ctx.fillText('↓ Soft Drop', uiStartX, uiY);
            uiY += lineHeight * 0.8;
            ctx.fillText('Space: Hard Drop', uiStartX, uiY);
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
        }
    };
    function draw(){ctx.clearRect(0,0,canvas.width,canvas.height);drawGameBoard();if(gameRunning)drawGhostPiece();if(currentPiece&&gameRunning)drawPiece(currentPiece,currentPiece.x,currentPiece.y);drawUI();}
    draw();

    let lastTime = 0;

    function rotateMatrix(m){const r=m.length,c=m[0].length;const nM=[];for(let i=0;i<c;i++){nM[i]=[];for(let j=0;j<r;j++)nM[i][j]=m[j][i];}nM.forEach(rw=>rw.reverse());return nM;}
    function rotatePiece(){if(!currentPiece||!gameRunning)return;const oS=currentPiece.shape;const rS=rotateMatrix(oS);const tO=[{x:0,y:0},{x:-1,y:0},{x:1,y:0},{x:-2,y:0},{x:2,y:0}];for(const o of tO){if(isValidMove(currentPiece,currentPiece.x+o.x,currentPiece.y+o.y,rS)){currentPiece.x+=o.x;currentPiece.y+=o.y;currentPiece.shape=rS;draw();return;}}}
    function movePiece(dx){if(!currentPiece||!gameRunning)return;if(isValidMove(currentPiece,currentPiece.x+dx,currentPiece.y,currentPiece.shape)){currentPiece.x+=dx;draw();}}
    function softDrop(){if(!currentPiece||!gameRunning)return;if(isValidMove(currentPiece,currentPiece.x,currentPiece.y+1,currentPiece.shape)){currentPiece.y+=1;gameTickTimer=0;draw();}else{lockPiece();}}
    function hardDrop(){if(!currentPiece||!gameRunning)return;while(isValidMove(currentPiece,currentPiece.x,currentPiece.y+1,currentPiece.shape))currentPiece.y+=1;lockPiece();}
    function handleKeyPress(e){if(!gameRunning||!currentPiece)return;if(['ArrowLeft','ArrowRight','ArrowDown','ArrowUp',' '].includes(e.key))e.preventDefault();switch(e.key){case 'ArrowLeft':movePiece(-1);break;case 'ArrowRight':movePiece(1);break;case 'ArrowDown':softDrop();break;case 'ArrowUp':rotatePiece();break;case ' ':hardDrop();break;}}

    function updateLevel() {
        const newLevel = Math.floor(linesCleared / 10) + 1;
        if (newLevel > level) {
            level = newLevel;
            currentDropInterval = initialDropInterval - ((level - 1) * 50);
            if (currentDropInterval < 100) currentDropInterval = 100;
        }
    }

    function clearLines() {
        let linesClearedThisTurn = 0;
        for (let r = gameBoardHeight - 1; r >= 0; r--) {
            if (gameBoard[r].every(cell => cell !== 0)) {
                linesClearedThisTurn++;
                linesCleared++;
                gameBoard.splice(r, 1);
                gameBoard.unshift(new Array(gameBoardWidth).fill(0));
                r++;
            }
        }
        return linesClearedThisTurn;
    }

    function lockPiece() {
        if (!currentPiece) return;
        const pieceM = currentPiece.shape; const pX = currentPiece.x; const pY = currentPiece.y;
        for(let r=0;r<pieceM.length;r++)for(let c=0;c<pieceM[r].length;c++)if(pieceM[r][c]){if(pY+r<0){triggerGameOver();return;}if(pY+r<gameBoardHeight&&pX+c>=0&&pX+c<gameBoardWidth)gameBoard[pY+r][pX+c]=currentPiece.color;}

        const linesDone = clearLines();
        if (linesDone > 0) {
            score += (SCORE_MAP[linesDone] || 0) * level;
            updateLevel();
        }

        if (!generateNewPiece()) return;
        currentDropInterval = initialDropInterval - ((level - 1) * 50);
        if (currentDropInterval < 100) currentDropInterval = 100;
    }

    function update(dT) {
        if (!gameRunning) return; gameTickTimer+=dT;
        if (gameTickTimer >= currentDropInterval) {
            gameTickTimer=0; if(currentPiece){if(isValidMove(currentPiece,currentPiece.x,currentPiece.y+1,currentPiece.shape))currentPiece.y+=1;else lockPiece();}}
    }

    function gameLoop(tS) {
        if(!gameRunning){if(animationFrameId)cancelAnimationFrame(animationFrameId);animationFrameId=null;return;}
        const dT=tS-lastTime;lastTime=tS;update(dT||0);draw();animationFrameId=requestAnimationFrame(gameLoop);
    }

    this.start=function(){if(gameRunning)return;console.log("AuraTetrisGame:Starting game...");level=1;score=0;linesCleared=0;
gameBoard=initializeGameBoard();generateNewPiece();currentDropInterval=initialDropInterval-((level-1)*50);if(currentDropInterval<100)currentDropInterval=100;
gameTickTimer=0;gameRunning=true;if(animationFrameId)cancelAnimationFrame(animationFrameId);
document.removeEventListener('keydown',handleKeyPress);document.addEventListener('keydown',handleKeyPress);lastTime=performance.now();

// Start Tetris theme music when game starts
if (!isMusicPlaying) {
    AuraGameSDK.audio.playLoopMusic(TETRIS_THEME_PATH, 0.4).then(() => {
        isMusicPlaying = true;
        console.log("AuraTetris: Background music started");
    }).catch((error) => {
        console.warn("AuraTetris: Could not start background music:", error);
    });
}

gameLoop(lastTime);};
    this.stop=function(){if(!gameRunning)return;console.log("AuraTetrisGame:Stopping game...");gameRunning=false;if(animationFrameId)cancelAnimationFrame(animationFrameId);animationFrameId=null;document.removeEventListener('keydown',handleKeyPress);

// Stop music when game is manually stopped
if (isMusicPlaying) {
    AuraGameSDK.audio.stop();
    isMusicPlaying = false;
    isMusicPaused = false;
    console.log("AuraTetris: Music stopped due to manual game stop");
}

};
    this.isRunning=function(){return gameRunning;};

    // Cleanup function to stop music when window/game is closed
    this.cleanup = function() {
        if (isMusicPlaying) {
            AuraGameSDK.audio.stop();
            isMusicPlaying = false;
            isMusicPaused = false;
            console.log("AuraTetris: Music stopped due to cleanup");
        }
        
        // Remove visibility change listener
        if (this._visibilityChangeHandler) {
            document.removeEventListener('visibilitychange', this._visibilityChangeHandler);
            this._visibilityChangeHandler = null;
        }
        
        // Clean up resize observer if it exists
        if (this._resizeObserver) {
            this._resizeObserver.disconnect();
            this._resizeObserver = null;
        }
    };

    // Pause music (for window minimization, etc.)
    this.pauseMusic = function() {
        if (isMusicPlaying && !isMusicPaused) {
            AuraGameSDK.audio.pause();
            isMusicPaused = true;
            console.log("AuraTetris: Music paused");
        }
    };

    // Resume music (for window restoration, etc.)
    this.resumeMusic = function() {
        if (isMusicPlaying && isMusicPaused) {
            AuraGameSDK.audio.resume();
            isMusicPaused = false;
            console.log("AuraTetris: Music resumed");
        }
    };

    // Listen for window close event to cleanup music
    if (canvas && canvas.closest) {
        const gameWindow = canvas.closest('.window');
        if (gameWindow) {
            gameWindow.addEventListener('aura:close', () => {
                this.cleanup();
            });
        }
    }

    // Listen for page visibility changes to pause/resume music
    const handleVisibilityChange = () => {
        if (document.hidden) {
            this.pauseMusic();
        } else {
            this.resumeMusic();
        }
    };

    // Add visibility change listener
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Store reference to remove listener on cleanup
    this._visibilityChangeHandler = handleVisibilityChange;
}
window.AuraTetrisGame = AuraTetrisGame;
