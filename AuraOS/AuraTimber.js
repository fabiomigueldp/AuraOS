// AuraOS/AuraTimber.js

// Player Constants
const PLAYER_WIDTH = 40;
const PLAYER_HEIGHT = 60;
const PLAYER_COLOR = '#FF8C00'; // DarkOrange
const PLAYER_Y_OFFSET = 10;

// Tree Constants
const TREE_SEGMENT_WIDTH = 80;
const TREE_SEGMENT_HEIGHT = 25;
const TREE_TRUNK_COLOR = '#8B4513';

// Branch Constants
const BRANCH_WIDTH = 60;
const BRANCH_HEIGHT = 15;
const BRANCH_COLOR = '#006400';
const BRANCH_PROBABILITY = 0.3;
const MIN_SEGMENTS_BETWEEN_BRANCHES = 1;
const INITIAL_SAFE_SEGMENTS = 3;

function AuraTimberGame(canvas) {
  this.canvas = canvas;
  this.ctx = canvas.getContext('2d');
  this.gameRunning = false;
  this.gameOver = false;
  this.animationFrameId = null;

  this.player = { x: 0, y: 0, width: 0, height: 0, side: 'left' };

  this.treeSegmentCount = Math.ceil(this.canvas.height / TREE_SEGMENT_HEIGHT) + 1;

  this.tree = {
    segments: [],
    segmentHeight: TREE_SEGMENT_HEIGHT,
    segmentWidth: TREE_SEGMENT_WIDTH,
    x: this.canvas.width / 2
  };
  this.score = 0;
  this.segmentsSinceLastBranch = 0;

  if (typeof AuraGameSDK !== 'undefined' && AuraGameSDK) {
    AuraGameSDK.init('aura-timber', this.canvas);
    console.log('AuraTimber initialized with AuraGameSDK');
  } else {
    console.error('AuraGameSDK not found. AuraTimber initialization may be incomplete.');
  }

  this.keydownHandler = this.handleKeydown.bind(this);
}

AuraTimberGame.prototype.generateNewSegment = function(indexForInitialSetup = -1) {
  let hasBranch = null;
  if (indexForInitialSetup !== -1 && indexForInitialSetup < INITIAL_SAFE_SEGMENTS) {
    hasBranch = null;
    this.segmentsSinceLastBranch++;
  } else {
    if (this.segmentsSinceLastBranch >= MIN_SEGMENTS_BETWEEN_BRANCHES && Math.random() < BRANCH_PROBABILITY) {
      hasBranch = (Math.random() < 0.5) ? 'left' : 'right';
      this.segmentsSinceLastBranch = 0;
    } else {
      hasBranch = null;
      this.segmentsSinceLastBranch++;
    }
  }
  return { y: 0, color: TREE_TRUNK_COLOR, hasBranch: hasBranch };
};

AuraTimberGame.prototype.start = function() {
  console.log('Attempting to start AuraTimber game...');
  this.gameOver = false;
  this.gameRunning = true;
  this.score = 0;

  this.resetGameElements();

  if (this.animationFrameId) {
    cancelAnimationFrame(this.animationFrameId);
  }

  document.removeEventListener('keydown', this.keydownHandler);
  document.addEventListener('keydown', this.keydownHandler);

  console.log('AuraTimber game started. GameRunning: ' + this.gameRunning);
  this.gameLoop();
};

AuraTimberGame.prototype.stop = function() {
  this.gameRunning = false;
  if (this.animationFrameId) {
    cancelAnimationFrame(this.animationFrameId);
    this.animationFrameId = null;
  }
  document.removeEventListener('keydown', this.keydownHandler);
  console.log('AuraTimber game stopped.');
};

AuraTimberGame.prototype.gameLoop = function() {
  if (this.gameRunning) {
    this.update();
  }

  this.draw();

  if (this.gameRunning) {
    this.animationFrameId = requestAnimationFrame(() => this.gameLoop());
  } else {
    if (this.animationFrameId) {
        cancelAnimationFrame(this.animationFrameId);
        this.animationFrameId = null;
    }
    // console.log("Game loop halted. GameRunning: " + this.gameRunning + ", GameOver: " + this.gameOver);
  }
};

AuraTimberGame.prototype.update = function() {
  if (!this.gameRunning) {
      return;
  }
};

AuraTimberGame.prototype.draw = function() {
  // Draw Background Gradient
  const gradient = this.ctx.createLinearGradient(0, 0, 0, this.canvas.height);
  gradient.addColorStop(0, '#87CEEB'); // Light Sky Blue at the top
  gradient.addColorStop(0.7, '#4682B4'); // Steel Blue towards the bottom
  gradient.addColorStop(1, '#2F4F4F');   // Dark Slate Gray at the very bottom (ground hint)
  this.ctx.fillStyle = gradient;
  this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

  // Draw Tree and Player (only if game is not over, or to show final state)
  const treeTrunkBaseX = this.tree.x - this.tree.segmentWidth / 2;
  // Only draw tree and player if there are segments, to avoid errors if segments array is empty
  if (this.tree.segments && this.tree.segments.length > 0) {
    for (let i = 0; i < this.tree.segments.length; i++) {
      const segment = this.tree.segments[i];
      this.ctx.fillStyle = segment.color;
      this.ctx.fillRect(treeTrunkBaseX, segment.y, this.tree.segmentWidth, this.tree.segmentHeight);
      this.ctx.strokeStyle = '#654321';
      this.ctx.strokeRect(treeTrunkBaseX, segment.y, this.tree.segmentWidth, this.tree.segmentHeight);

      if (segment.hasBranch) {
        this.ctx.fillStyle = BRANCH_COLOR;
        let branchX;
        if (segment.hasBranch === 'left') {
          branchX = treeTrunkBaseX - BRANCH_WIDTH;
        } else {
          branchX = treeTrunkBaseX + this.tree.segmentWidth;
        }
        const branchY = segment.y + (this.tree.segmentHeight - BRANCH_HEIGHT) / 2;
        this.ctx.fillRect(branchX, branchY, BRANCH_WIDTH, BRANCH_HEIGHT);
        this.ctx.strokeStyle = '#004000';
        this.ctx.strokeRect(branchX, branchY, BRANCH_WIDTH, BRANCH_HEIGHT);
      }
    }

    this.ctx.fillStyle = PLAYER_COLOR;
    this.ctx.fillRect(this.player.x, this.player.y, this.player.width, this.player.height);
  }


  // UI Elements
  if (!this.gameOver) {
    // Active Score Display
    this.ctx.fillStyle = '#FFFFFF';
    this.ctx.strokeStyle = '#000000';
    this.ctx.lineWidth = 1; // Keep lineWidth consistent or reset before strokeText
    this.ctx.font = 'bold 28px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.strokeText('Score: ' + this.score, this.canvas.width / 2, 40);
    this.ctx.fillText('Score: ' + this.score, this.canvas.width / 2, 40);
  } else {
    // Game Over Screen
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    this.ctx.textAlign = 'center';

    this.ctx.fillStyle = '#FF0000';
    this.ctx.font = 'bold 56px Arial';
    this.ctx.fillText('GAME OVER', this.canvas.width / 2, this.canvas.height / 2 - 70);

    this.ctx.fillStyle = '#FFFFFF';
    this.ctx.font = '36px Arial';
    this.ctx.fillText('Final Score: ' + this.score, this.canvas.width / 2, this.canvas.height / 2 - 10);

    this.ctx.font = '28px Arial';
    this.ctx.fillText('Press R to Restart', this.canvas.width / 2, this.canvas.height / 2 + 50);
  }
  this.ctx.lineWidth = 1;
};

AuraTimberGame.prototype.resetGameElements = function() {
  this.tree.x = this.canvas.width / 2;
  this.tree.segmentWidth = TREE_SEGMENT_WIDTH;
  this.tree.segmentHeight = TREE_SEGMENT_HEIGHT;
  this.tree.segments = [];
  this.segmentsSinceLastBranch = 0;

  for (let i = 0; i < this.treeSegmentCount; i++) {
    const segment = this.generateNewSegment(i);
    segment.y = this.canvas.height - (i + 1) * this.tree.segmentHeight;
    this.tree.segments.push(segment);
  }

  this.player.width = PLAYER_WIDTH;
  this.player.height = PLAYER_HEIGHT;
  this.player.y = this.canvas.height - PLAYER_HEIGHT - PLAYER_Y_OFFSET;
  this.player.side = 'left';
  this.player.x = this.calculatePlayerX();
  console.log('Resetting game elements. Player at x: ' + this.player.x + '. Tree segments: ' + this.tree.segments.length);
};

AuraTimberGame.prototype.calculatePlayerX = function() {
  const treeEdgeGap = 5;
  if (this.player.side === 'left') {
    return this.tree.x - this.tree.segmentWidth / 2 - this.player.width - treeEdgeGap;
  } else {
    return this.tree.x + this.tree.segmentWidth / 2 + treeEdgeGap;
  }
};

AuraTimberGame.prototype.handleGameOver = function() {
    this.gameOver = true;
    this.gameRunning = false;
    console.log('Game Over! Final Score: ' + this.score);

    if (typeof AuraGameSDK !== 'undefined' && AuraGameSDK &&
        AuraGameSDK.leaderboard && typeof AuraGameSDK.leaderboard.submitScore === 'function') {
      AuraGameSDK.leaderboard.submitScore('AuraUser', this.score)
        .then(() => console.log('Score submitted to AuraGameSDK leaderboard.'))
        .catch(e => console.error('Score submission to AuraGameSDK failed:', e));
    } else {
      // console.log('AuraGameSDK leaderboard or submitScore not available.');
    }
};

AuraTimberGame.prototype.handleKeydown = function(e) {
  if (this.gameOver) {
    if (e.key === 'r' || e.key === 'R') {
        console.log("Restarting game...");
        this.start();
    }
    return;
  }

  if (!this.gameRunning) {
    return;
  }

  let actionPerformed = false;
  if (e.key === 'ArrowLeft') {
    this.player.side = 'left';
    this.player.x = this.calculatePlayerX();
    this.chopTree();
    actionPerformed = true;
  } else if (e.key === 'ArrowRight') {
    this.player.side = 'right';
    this.player.x = this.calculatePlayerX();
    this.chopTree();
    actionPerformed = true;
  }
};

AuraTimberGame.prototype.chopTree = function() {
  if (!this.gameRunning || this.gameOver) {
    return;
  }
  if (this.tree.segments.length === 0) return;

  const bottomSegment = this.tree.segments[0];

  if (bottomSegment.hasBranch && bottomSegment.hasBranch === this.player.side) {
    this.handleGameOver();
    return;
  }

  this.score++;

  this.tree.segments.shift();
  const newSegment = this.generateNewSegment();
  this.tree.segments.push(newSegment);

  for (let i = 0; i < this.tree.segments.length; i++) {
    this.tree.segments[i].y = this.canvas.height - (i + 1) * this.tree.segmentHeight;
  }
};

if (typeof window !== 'undefined') {
  window.AuraTimberGame = AuraTimberGame;
}
