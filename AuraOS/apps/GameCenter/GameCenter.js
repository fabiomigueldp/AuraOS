class GameCenterApp {
    static #GAMES = [
        {
            id: 'aura-breaker',
            title: 'Aura Breaker',
            description: 'Break the bricks and conquer the levels!',
            icon: 'assets/icons/aura-breaker-icon.png', // Replace with actual path
            banner: 'assets/banners/aura-breaker-banner.png', // Replace with actual path
            gameClass: 'AuraBreakerGame', // Assuming a global class, adjust if using modules
            settings: {
                canvasSize: { width: 800, height: 600 }
            }
        },
        {
            id: 'galaxy-defender',
            title: 'Galaxy Defender',
            description: 'Defend the galaxy from alien invaders!',
            icon: 'assets/icons/galaxy-defender-icon.png', // Replace with actual path
            banner: 'assets/banners/galaxy-defender-banner.png', // Replace with actual path
            gameClass: 'GalaxyDefenderGame', // Assuming a global class
            settings: {
                canvasSize: { width: 1024, height: 768 }
            }
        },
        {
            id: 'puzzle-quest',
            title: 'Puzzle Quest',
            description: 'Solve intricate puzzles and unlock secrets.',
            icon: 'assets/icons/puzzle-quest-icon.png', // Replace with actual path
            banner: 'assets/banners/puzzle-quest-banner.png', // Replace with actual path
            gameClass: 'PuzzleQuestGame', // Assuming a global class
             settings: {
                canvasSize: { width: 700, height: 700 }
            }
        }
        // Add more games as needed
    ];

    constructor(appId, windowEl, data) {
        this.appId = appId;
        this.windowEl = windowEl;
        this.data = data; // Might contain user session, preferences, etc.
        this.activeGameId = null;
        this.currentGameInstance = null;
        // this.resizeObserver = null; // General app resize observer, game specific one is on currentGameInstance

        // Bind methods
        this._showGameDetails = this._showGameDetails.bind(this);
        this._launchGame = this._launchGame.bind(this);
        this._exitGame = this._exitGame.bind(this);
        this._showLeaderboardsView = this._showLeaderboardsView.bind(this);
        this._showSettingsView = this._showSettingsView.bind(this);
        this._handleGameSelection = this._handleGameSelection.bind(this);
        this._displayLeaderboard = this._displayLeaderboard.bind(this);

        this.boundDestroy = this.destroy.bind(this); // For event listener
        this.windowEl.addEventListener('aura:close', this.boundDestroy);

        this._init();
    }

    async _init() {
        try {
            const response = await fetch('AuraOS/apps/GameCenter/index.html');
            if (!response.ok) {
                throw new Error(`Failed to load GameCenter HTML: ${response.status}`);
            }
            const htmlContent = await response.text();
            const windowBody = this.windowEl.querySelector('.window-body');
            if (!windowBody) {
                console.error('GameCenterApp: .window-body not found in window element.');
                return;
            }
            windowBody.innerHTML = htmlContent;

            this._loadStyleSheet('AuraOS/apps/GameCenter/style.css');
            this._setupDOMReferences();
            this._initializeGameListAndListeners();
        } catch (error) {
            console.error('GameCenterApp initialization failed:', error);
            const windowBody = this.windowEl.querySelector('.window-body');
            if (windowBody) {
                windowBody.innerHTML = `<p_now>Error loading Game Center. Please try again later.</p_now>`;
            }
        }
    }

    _loadStyleSheet(cssPath) {
        const styleId = `gc-style-${this.appId}`;
        if (document.getElementById(styleId)) {
            return; // Stylesheet already loaded
        }
        const link = document.createElement('link');
        link.id = styleId;
        link.rel = 'stylesheet';
        link.type = 'text/css';
        link.href = cssPath;
        document.head.appendChild(link);
    }

    _setupDOMReferences() {
        this.gameListDiv = this.windowEl.querySelector('.game-list');
        this.gameContentArea = this.windowEl.querySelector('.game-content-area');
        this.sidebar = this.windowEl.querySelector('.game-library-sidebar');
    }

    _initializeGameListAndListeners() {
        if (!this.gameListDiv) {
            console.error("GameCenterApp: gameListDiv not found.");
            return;
        }
        this.gameListDiv.innerHTML = '';

        GameCenterApp.#GAMES.forEach(game => {
            const gameItem = document.createElement('div');
            gameItem.classList.add('game-item');
            gameItem.dataset.gameId = game.id;

            const icon = document.createElement('img');
            icon.src = game.icon || 'assets/icons/default-game-icon.png';
            icon.alt = game.title;
            icon.classList.add('game-item-icon');

            const title = document.createElement('span');
            title.textContent = game.title;
            title.classList.add('game-item-title');

            gameItem.appendChild(icon);
            gameItem.appendChild(title);

            gameItem.addEventListener('click', () => this._handleGameSelection(game));
            this.gameListDiv.appendChild(gameItem);
        });

        this.windowEl.querySelector('#gc-leaderboards-tab')?.addEventListener('click', this._showLeaderboardsView);
        this.windowEl.querySelector('#gc-settings-tab')?.addEventListener('click', this._showSettingsView);
        this.windowEl.querySelector('#gc-library-tab')?.addEventListener('click', () => {
            this.windowEl.querySelectorAll('.sidebar-nav-item.active').forEach(item => item.classList.remove('active'));
            this.windowEl.querySelector('#gc-library-tab')?.classList.add('active');
            if (GameCenterApp.#GAMES.length > 0) {
                this._handleGameSelection(GameCenterApp.#GAMES[0]);
            } else {
                 this.gameContentArea.innerHTML = '<p_now>No games available in the library.</p_now>';
            }
        });

        if (GameCenterApp.#GAMES.length > 0) {
            this._handleGameSelection(GameCenterApp.#GAMES[0]);
            this.windowEl.querySelector('#gc-library-tab')?.classList.add('active');
        } else {
            if (this.gameContentArea) {
                this.gameContentArea.innerHTML = '<p_now>No games available.</p_now>';
            }
        }
    }

    _handleGameSelection(gameData) {
        this.windowEl.querySelectorAll('.game-item.active').forEach(item => item.classList.remove('active'));
        this.windowEl.querySelector(`.game-item[data-game-id="${gameData.id}"]`)?.classList.add('active');

        this.windowEl.querySelectorAll('.sidebar-nav-item.active').forEach(item => item.classList.remove('active'));
        this.windowEl.querySelector('#gc-library-tab')?.classList.add('active');

        this._showGameDetails(gameData);
    }

    _showGameDetails(gameData) {
        if (!this.gameContentArea) {
            console.error("GameCenterApp: gameContentArea not found.");
            return;
        }
        this.activeGameId = gameData.id;

        this.gameContentArea.innerHTML = `
            <div class="game-detail-banner" style="background-image: url('${gameData.banner || ''}');"></div>
            <div class="game-detail-header">
                <h2 class="game-title">${gameData.title}</h2>
                <button class="play-button">Play</button>
            </div>
            <p_now class="game-description">${gameData.description}</p_now>
            <div class="leaderboard-preview">
                <h3>Leaderboard</h3>
                <div id="gc-leaderboard-scores-${gameData.id}">Loading...</div>
            </div>
        `;

        const playButton = this.gameContentArea.querySelector('.play-button');
        if(playButton){
            playButton.addEventListener('click', () => this._launchGame(gameData.id));
        } else {
            console.error("Play button not found for game:", gameData.id);
        }

        this._displayLeaderboard(gameData.id, `gc-leaderboard-scores-${gameData.id}`);
    }

    _launchGame(gameId) {
        this.activeGameId = gameId;
        const gameData = GameCenterApp.#GAMES.find(g => g.id === gameId);
        if (!gameData) {
            console.error(`Game data for ${gameId} not found.`);
            this.gameContentArea.innerHTML = `<p_now>Error: Game data not found.</p_now>`;
            return;
        }

        // Clean up previous game instance before launching a new one
        if (this.currentGameInstance) {
            if (typeof this.currentGameInstance.destroy === 'function') {
                this.currentGameInstance.destroy();
            } else if (typeof this.currentGameInstance.stop === 'function') {
                this.currentGameInstance.stop();
            }
            if (this.currentGameInstance._resizeObserver && typeof this.currentGameInstance._resizeObserver.disconnect === 'function') {
                this.currentGameInstance._resizeObserver.disconnect();
                this.currentGameInstance._resizeObserver = null;
            }
            this.currentGameInstance = null;
        }
        // Note: The general this.resizeObserver for the app itself is not handled here, only game-specific one.

        this.gameContentArea.innerHTML = `
            <div class="game-canvas-container">
                <canvas id="gameCanvas-${this.appId}"></canvas>
            </div>
            <button class="exit-game-button">Exit Game</button>
        `;

        const canvas = this.gameContentArea.querySelector(`#gameCanvas-${this.appId}`);
        const canvasContainer = this.gameContentArea.querySelector('.game-canvas-container');

        if (!canvas || !canvasContainer) {
            console.error("Canvas or container not found for game:", gameId);
            this.gameContentArea.innerHTML = `<p_now>Error: Could not set up game area.</p_now>`;
            return;
        }

        let canvasWidth = gameData.settings?.canvasSize?.width || 800;
        let canvasHeight = gameData.settings?.canvasSize?.height || 600;
        canvas.width = canvasWidth;
        canvas.height = canvasHeight;

        canvasContainer.style.display = 'flex';
        canvasContainer.style.justifyContent = 'center';
        canvasContainer.style.alignItems = 'center';
        canvasContainer.style.height = 'calc(100% - 40px)';

        if (gameData.id === 'aura-breaker') {
        } else if (gameData.id === 'galaxy-defender') {
        } else if (gameData.id === 'puzzle-quest') {
        }

        if (typeof window[gameData.gameClass] === 'function') {
            this.currentGameInstance = new window[gameData.gameClass](canvas);
            if (typeof this.currentGameInstance.start === 'function') {
                this.currentGameInstance.start();
            } else {
                console.error(`Game class ${gameData.gameClass} does not have a start method.`);
                this.gameContentArea.innerHTML = `<p_now>Error: Could not start game.</p_now>`;
            }
        } else {
            console.error(`Game class ${gameData.gameClass} not found.`);
            this.gameContentArea.innerHTML = `<p_now>Error: Game files might be missing.</p_now>`;
            return;
        }

        const exitButton = this.gameContentArea.querySelector('.exit-game-button');
        if(exitButton) {
            exitButton.addEventListener('click', this._exitGame);
        } else {
            console.error("Exit game button not found");
        }
    }

    _exitGame() {
        // Clean up the current game instance
        if (this.currentGameInstance) {
            if (typeof this.currentGameInstance.destroy === 'function') {
                this.currentGameInstance.destroy();
            } else if (typeof this.currentGameInstance.stop === 'function') {
                this.currentGameInstance.stop();
            }
            if (typeof this.currentGameInstance.cleanup === 'function') { // Added for completeness
                this.currentGameInstance.cleanup();
            }
            if (this.currentGameInstance._resizeObserver && typeof this.currentGameInstance._resizeObserver.disconnect === 'function') {
                this.currentGameInstance._resizeObserver.disconnect();
                this.currentGameInstance._resizeObserver = null;
            }
            this.currentGameInstance = null;
        }
        // Note: The general this.resizeObserver for the app itself is not handled here.
        // It would be managed in the main destroy method if it were used.

        const gameData = GameCenterApp.#GAMES.find(g => g.id === this.activeGameId);
        if (gameData) {
            this._showGameDetails(gameData);
        } else {
            this._initializeGameListAndListeners();
            if (GameCenterApp.#GAMES.length > 0) {
                 this._handleGameSelection(GameCenterApp.#GAMES[0]);
            }
        }
    }

    _showLeaderboardsView() {
        if (!this.gameContentArea) return;
        this.activeGameId = null;

        this.windowEl.querySelectorAll('.sidebar-nav-item.active').forEach(item => item.classList.remove('active'));
        this.windowEl.querySelector('#gc-leaderboards-tab')?.classList.add('active');

        let gameOptionsHtml = GameCenterApp.#GAMES.map(game => `<option value="${game.id}">${game.title}</option>`).join('');

        this.gameContentArea.innerHTML = `
            <div class="leaderboards-view">
                <h2>Leaderboards</h2>
                <select id="gc-leaderboard-game-select">
                    <option value="">Select a Game</option>
                    ${gameOptionsHtml}
                </select>
                <div id="gc-leaderboard-scores-global" class="leaderboard-scores-container">
                    <p_now>Select a game to view its leaderboard.</p_now>
                </div>
            </div>
        `;

        const gameSelect = this.windowEl.querySelector('#gc-leaderboard-game-select');
        if(gameSelect){
            gameSelect.addEventListener('change', (event) => {
                const selectedGameId = event.target.value;
                if (selectedGameId) {
                    this._displayLeaderboard(selectedGameId, 'gc-leaderboard-scores-global');
                } else {
                    const scoresDiv = this.windowEl.querySelector(`#gc-leaderboard-scores-global`);
                    if(scoresDiv) scoresDiv.innerHTML = '<p_now>Select a game to view its leaderboard.</p_now>';
                }
            });
        }
    }

    _showSettingsView() {
        if (!this.gameContentArea) return;
        this.activeGameId = null;

        this.windowEl.querySelectorAll('.sidebar-nav-item.active').forEach(item => item.classList.remove('active'));
        this.windowEl.querySelector('#gc-settings-tab')?.classList.add('active');

        const currentVolume = typeof AuraGameSDK !== 'undefined' && AuraGameSDK.audio ? AuraGameSDK.audio.getVolume() : 0.5;

        this.gameContentArea.innerHTML = `
            <div class="settings-view">
                <h2>Settings</h2>
                <div class="setting-item">
                    <label for="gc-volume-slider">Master Volume:</label>
                    <input type="range" id="gc-volume-slider" min="0" max="1" step="0.01" value="${currentVolume}">
                    <span id="gc-volume-value">${Math.round(currentVolume * 100)}%</span>
                </div>
                </div>
        `;

        const volumeSlider = this.windowEl.querySelector('#gc-volume-slider');
        const volumeValueDisplay = this.windowEl.querySelector('#gc-volume-value');

        if (volumeSlider && volumeValueDisplay) {
            volumeSlider.addEventListener('input', (event) => {
                const newVolume = parseFloat(event.target.value);
                if (typeof AuraGameSDK !== 'undefined' && AuraGameSDK.audio) {
                    AuraGameSDK.audio.setVolume(newVolume);
                }
                volumeValueDisplay.textContent = `${Math.round(newVolume * 100)}%`;
            });
        }
    }

    async _displayLeaderboard(gameId, containerId) {
        const scoresDiv = this.windowEl.querySelector(`#${containerId}`);
        if (!scoresDiv) {
            console.error(`Leaderboard container #${containerId} not found.`);
            return;
        }
        scoresDiv.innerHTML = 'Loading scores...';

        try {
            if (typeof AuraGameSDK === 'undefined' || !AuraGameSDK.leaderboard) {
                scoresDiv.innerHTML = '<p_now>Leaderboard system is unavailable.</p_now>';
                return;
            }
            const highScores = await AuraGameSDK.leaderboard.getHighScores(gameId, 10);

            if (highScores && highScores.length > 0) {
                let scoresHtml = '<ol>';
                highScores.forEach(scoreEntry => {
                    scoresHtml += `<li>${scoreEntry.playerName || 'Anonymous'}: ${scoreEntry.score}</li>`;
                });
                scoresHtml += '</ol>';
                scoresDiv.innerHTML = scoresHtml;
            } else {
                scoresDiv.innerHTML = '<p_now>No scores available for this game yet.</p_now>';
            }
        } catch (error) {
            console.error(`Error fetching leaderboard for ${gameId}:`, error);
            scoresDiv.innerHTML = '<p_now>Could not load scores. Please try again later.</p_now>';
        }
    }

    destroy() {
        console.log(`GameCenterApp destroy called for ID: ${this.appId}`);

        // 3.b. Cleanup current game instance
        if (this.currentGameInstance) {
            // 3.b.i. Check for destroy method (e.g., AuraWhackGame)
            if (typeof this.currentGameInstance.destroy === 'function') {
                this.currentGameInstance.destroy();
            }
            // 3.b.ii. Else if, check for stop method
            else if (typeof this.currentGameInstance.stop === 'function') {
                this.currentGameInstance.stop();
            }
            // 3.b.iii. Check for cleanup method
            if (typeof this.currentGameInstance.cleanup === 'function') {
                this.currentGameInstance.cleanup();
            }
            // 3.b.iv. Check for game's own resize observer
            if (this.currentGameInstance._resizeObserver && typeof this.currentGameInstance._resizeObserver.disconnect === 'function') {
                this.currentGameInstance._resizeObserver.disconnect();
                this.currentGameInstance._resizeObserver = null;
            }
            // 3.b.v. Nullify the instance
            this.currentGameInstance = null;
        }

        // Note: The previous code had a 'this.resizeObserver' for the app itself.
        // If that was intended, it should be disconnected here too.
        // For now, sticking to the subtask's focus on currentGameInstance._resizeObserver.

        // 3.c. Stop all SDK audio
        if (typeof AuraGameSDK !== 'undefined' && AuraGameSDK.audio && typeof AuraGameSDK.audio.stopAll === 'function') {
            AuraGameSDK.audio.stopAll();
        }

        // Remove stylesheet
        const styleId = `gc-style-${this.appId}`;
        const styleElement = document.getElementById(styleId);
        if (styleElement) {
            styleElement.remove();
        }

        // Clear content from window body
        if (this.windowEl) {
            const windowBody = this.windowEl.querySelector('.window-body');
            if (windowBody) windowBody.innerHTML = '';
        }

        // 5. Remove aura:close listener
        if (this.windowEl && this.boundDestroy) {
            this.windowEl.removeEventListener('aura:close', this.boundDestroy);
        }

        // 3.d. Further listener cleanup would go here if GameCenterApp added global listeners.
        // For now, listeners on specific elements within gameContentArea are implicitly removed
        // when gameContentArea.innerHTML is changed or when windowBody.innerHTML is cleared.

        console.log(`GameCenterApp ${this.appId} cleanup complete.`);
    }
}
