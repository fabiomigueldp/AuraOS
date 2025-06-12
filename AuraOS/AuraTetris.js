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

    let score = 0;
    let level = 1; // Start at level 1
    let linesCleared = 0; // Total lines cleared in the game

    const gameBoardWidth = 10;
    const gameBoardHeight = 20;

    const BLOCK_SIZE = 30;
    const BLOCK_PADDING = 2;
    const BOARD_BORDER_COLOR = 'rgba(100, 100, 100, 0.5)';
    const GRID_COLOR = 'rgba(50, 50, 70, 0.5)';

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

    generateNewPiece();

    function drawBlock(x,y,c,iS=false){if(iS){ctx.globalAlpha=0.3;ctx.strokeStyle=c;ctx.lineWidth=2;ctx.strokeRect(x+BLOCK_PADDING,y+BLOCK_PADDING,BLOCK_SIZE-2*BLOCK_PADDING,BLOCK_SIZE-2*BLOCK_PADDING);ctx.globalAlpha=1.0;return;}
ctx.globalAlpha=0.6;ctx.fillStyle=c;ctx.fillRect(x+BLOCK_PADDING,y+BLOCK_PADDING,BLOCK_SIZE-2*BLOCK_PADDING,BLOCK_SIZE-2*BLOCK_PADDING);
ctx.globalAlpha=0.3;ctx.fillStyle='rgba(255,255,255,0.5)';const gI=BLOCK_PADDING*2;ctx.fillRect(x+gI,y+gI,BLOCK_SIZE-2*gI,BLOCK_SIZE-2*gI);
ctx.globalAlpha=0.8;ctx.strokeStyle='rgba(255,255,255,0.3)';ctx.lineWidth=1;ctx.strokeRect(x+BLOCK_PADDING,y+BLOCK_PADDING,BLOCK_SIZE-2*BLOCK_PADDING,BLOCK_SIZE-2*BLOCK_PADDING);ctx.globalAlpha=1.0;}
    function drawGameBoard(){ctx.strokeStyle=BOARD_BORDER_COLOR;ctx.lineWidth=2;ctx.strokeRect(0,0,gameBoardWidth*BLOCK_SIZE,gameBoardHeight*BLOCK_SIZE);
ctx.strokeStyle=GRID_COLOR;ctx.lineWidth=0.5;for(let x=0;x<gameBoardWidth;x++){ctx.beginPath();ctx.moveTo(x*BLOCK_SIZE,0);ctx.lineTo(x*BLOCK_SIZE,gameBoardHeight*BLOCK_SIZE);ctx.stroke();}
for(let y=0;y<gameBoardHeight;y++){ctx.beginPath();ctx.moveTo(0,y*BLOCK_SIZE);ctx.lineTo(gameBoardWidth*BLOCK_SIZE,y*BLOCK_SIZE);ctx.stroke();}
for(let r=0;r<gameBoardHeight;r++)for(let c=0;c<gameBoardWidth;c++)if(gameBoard[r][c]!==0)drawBlock(c*BLOCK_SIZE,r*BLOCK_SIZE,gameBoard[r][c]);}
    function drawPiece(pDI,pOX,pOY,iS=false){if(!pDI||!pDI.shape)return;const M=pDI.shape;const C=pDI.color;for(let r=0;r<M.length;r++)for(let c=0;c<M[r].length;c++)if(M[r][c])drawBlock((pOX+c)*BLOCK_SIZE,(pOY+r)*BLOCK_SIZE,C,iS);}
    function drawGhostPiece(){if(!currentPiece||!gameRunning)return;let gY=currentPiece.y;while(isValidMove(currentPiece,currentPiece.x,gY+1,currentPiece.shape))gY++;drawPiece(currentPiece,currentPiece.x,gY,true);}
    function drawUI(){const uXO=gameBoardWidth*BLOCK_SIZE+20;let uYO=30;ctx.fillStyle='white';ctx.font='bold 18px Inter,sans-serif';
ctx.fillText('Next:',uXO,uYO);uYO+=10;const nPBS=4*BLOCK_SIZE;ctx.strokeStyle=GRID_COLOR;ctx.lineWidth=1;ctx.strokeRect(uXO,uYO,nPBS,nPBS);
if(nextPiece){const m=nextPiece.shape;const mW=m[0].length;const mH=m.length;let minR=mH,maxR=-1,minC=mW,maxC=-1;
for(let r=0;r<mH;++r)for(let c=0;c<mW;++c)if(m[r][c]){if(r<minR)minR=r;if(r>maxR)maxR=r;if(c<minC)minC=c;if(c>maxC)maxC=c;}
const pAW=(maxC-minC+1);const pAH=(maxR-minR+1);const pOX=uXO+(nPBS-pAW*BLOCK_SIZE)/2;const pOY=uYO+(nPBS-pAH*BLOCK_SIZE)/2;
for(let r=0;r<m.length;r++)for(let c=0;c<m[r].length;c++)if(m[r][c])drawBlock(pOX-(minC*BLOCK_SIZE)+(c*BLOCK_SIZE),pOY-(minR*BLOCK_SIZE)+(r*BLOCK_SIZE),nextPiece.color);}
uYO+=nPBS+30;ctx.font='16px Inter,sans-serif';ctx.fillText(`Score: ${score}`,uXO,uYO);uYO+=25;ctx.fillText(`Level: ${level}`,uXO,uYO);uYO+=25;ctx.fillText(`Lines: ${linesCleared}`,uXO,uYO);}
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
document.removeEventListener('keydown',handleKeyPress);document.addEventListener('keydown',handleKeyPress);lastTime=performance.now();gameLoop(lastTime);};
    this.stop=function(){if(!gameRunning)return;console.log("AuraTetrisGame:Stopping game...");gameRunning=false;if(animationFrameId)cancelAnimationFrame(animationFrameId);animationFrameId=null;document.removeEventListener('keydown',handleKeyPress);};
    this.isRunning=function(){return gameRunning;};
}
window.AuraTetrisGame = AuraTetrisGame;
