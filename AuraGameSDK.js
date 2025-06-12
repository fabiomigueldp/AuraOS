/**
 * @file AuraGameSDK.js
 * Provides an SDK for games to interact with AuraOS services.
 */

const AuraGameSDK = {
    _gameId: null,
    _canvasElement: null,
    get _dbManager() { return window.dbManager; }, // Assuming dbManager is globally available

    /**
     * Initializes the SDK for a specific game.
     * This must be called before any other SDK functions.
     * @param {string} gameId - The unique identifier for the game.
     * @param {HTMLCanvasElement} canvasElement - The canvas element the game will draw on.
     */
    init(gameId, canvasElement) {
        if (!gameId) {
            console.error('AuraGameSDK.init: gameId is required.');
            return;
        }
        if (!(canvasElement instanceof HTMLCanvasElement)) {
            console.error('AuraGameSDK.init: canvasElement must be a valid HTMLCanvasElement.');
            return;
        }
        this._gameId = gameId;
        this._canvasElement = canvasElement;
        console.log(`AuraGameSDK initialized for ${gameId}`);

        if (!this._dbManager) {
            console.error('AuraGameSDK: dbManager instance not found. Ensure DBManager.js is loaded and dbManager is global.');
        }
    },

    storage: {
        /**
         * Saves arbitrary JSON-serializable data for the current game.
         * The data is typically saved under a key like 'gameId-savegame'.
         * @param {object} data - The game state data to save.
         * @returns {Promise<void>} A Promise that resolves on successful save, or rejects on error.
         */
        async saveState(data) {
            if (!AuraGameSDK._dbManager) {
                console.error('AuraGameSDK method [' + (AuraGameSDK._gameId || 'SDK') + ' saveState]: FATAL - window.dbManager instance not found.');
                return Promise.reject('AuraGameSDK: FATAL - window.dbManager instance not found.');
            }
            if (AuraGameSDK._dbManager.initializationPromise === null) {
                console.warn('AuraGameSDK method [' + (AuraGameSDK._gameId || 'SDK') + ' saveState]: dbManager.initializationPromise is null. Calling AuraGameSDK._dbManager.init() now to create/get it.');
                AuraGameSDK._dbManager.init();
            }
            if (!AuraGameSDK._dbManager || !AuraGameSDK._dbManager.initializationPromise) {
                console.error('AuraGameSDK: DBManager not available or initialization promise missing.');
                return Promise.reject('AuraGameSDK: DBManager not available or initialization promise missing.');
            }
            try {
                await AuraGameSDK._dbManager.initializationPromise;
                console.log('AuraGameSDK method [' + (AuraGameSDK._gameId || 'N/A') + ' saveState]: DB init promise resolved. Verifying _dbManager.db state...');
                if (AuraGameSDK._dbManager) {
                    console.log('AuraGameSDK method [' + (AuraGameSDK._gameId || 'N/A') + ' saveState]: typeof _dbManager.db:', typeof AuraGameSDK._dbManager.db, ', Is IDBDatabase:', (AuraGameSDK._dbManager.db instanceof IDBDatabase), ', DB Name:', AuraGameSDK._dbManager.db ? AuraGameSDK._dbManager.db.name : 'N/A');
                } else {
                    console.error('AuraGameSDK method [' + (AuraGameSDK._gameId || 'N/A') + ' saveState]: _dbManager itself is null/undefined immediately after its initializationPromise supposedly resolved!');
                }
            } catch (dbError) {
                console.error('AuraGameSDK: Error awaiting DB initialization:', dbError);
                return Promise.reject('AuraGameSDK: DB initialization failed.');
            }
            if (!AuraGameSDK._dbManager.db) {
                console.error('AuraGameSDK: DB connection is not available after initialization.');
                return Promise.reject('AuraGameSDK: DB connection failed after awaiting promise.');
            }

            if (!AuraGameSDK._gameId) {
                return Promise.reject('AuraGameSDK not initialized. Call init() first.');
            }
            if (typeof data !== 'object' || data === null) {
                return Promise.reject('Invalid data provided. Must be an object.');
            }
            const saveId = `${AuraGameSDK._gameId}-savegame`;
            try {
                await AuraGameSDK._dbManager.setObject('game_saves', { saveId: saveId, data: data, lastModified: Date.now() });
                console.log(`Game state saved for ${AuraGameSDK._gameId}`, data);
            } catch (error) {
                console.error(`Error saving game state for ${AuraGameSDK._gameId}:`, error);
                return Promise.reject(error);
            }
        },

        /**
         * Loads the saved state for the current game.
         * @returns {Promise<object|null>} A Promise that resolves with the saved data object, or null if no save state is found or an error occurs.
         */
        async loadState() {
            if (!AuraGameSDK._dbManager) {
                console.error('AuraGameSDK method [' + (AuraGameSDK._gameId || 'SDK') + ' loadState]: FATAL - window.dbManager instance not found.');
                return Promise.reject('AuraGameSDK: FATAL - window.dbManager instance not found.');
            }
            if (AuraGameSDK._dbManager.initializationPromise === null) {
                console.warn('AuraGameSDK method [' + (AuraGameSDK._gameId || 'SDK') + ' loadState]: dbManager.initializationPromise is null. Calling AuraGameSDK._dbManager.init() now to create/get it.');
                AuraGameSDK._dbManager.init();
            }
            if (!AuraGameSDK._dbManager || !AuraGameSDK._dbManager.initializationPromise) {
                console.error('AuraGameSDK: DBManager not available or initialization promise missing.');
                return Promise.reject('AuraGameSDK: DBManager not available or initialization promise missing.');
            }
            try {
                await AuraGameSDK._dbManager.initializationPromise;
                console.log('AuraGameSDK method [' + (AuraGameSDK._gameId || 'N/A') + ' loadState]: DB init promise resolved. Verifying _dbManager.db state...');
                if (AuraGameSDK._dbManager) {
                    console.log('AuraGameSDK method [' + (AuraGameSDK._gameId || 'N/A') + ' loadState]: typeof _dbManager.db:', typeof AuraGameSDK._dbManager.db, ', Is IDBDatabase:', (AuraGameSDK._dbManager.db instanceof IDBDatabase), ', DB Name:', AuraGameSDK._dbManager.db ? AuraGameSDK._dbManager.db.name : 'N/A');
                } else {
                    console.error('AuraGameSDK method [' + (AuraGameSDK._gameId || 'N/A') + ' loadState]: _dbManager itself is null/undefined immediately after its initializationPromise supposedly resolved!');
                }
            } catch (dbError) {
                console.error('AuraGameSDK: Error awaiting DB initialization:', dbError);
                return Promise.reject('AuraGameSDK: DB initialization failed.');
            }
            if (!AuraGameSDK._dbManager.db) {
                console.error('AuraGameSDK: DB connection is not available after initialization.');
                return Promise.reject('AuraGameSDK: DB connection failed after awaiting promise.');
            }

            if (!AuraGameSDK._gameId) {
                console.error('AuraGameSDK not initialized. Call init() first.');
                return Promise.resolve(null); // Resolve with null on error to simplify game logic
            }
            const saveId = `${AuraGameSDK._gameId}-savegame`;
            try {
                const savedObject = await AuraGameSDK._dbManager.getObject('game_saves', saveId);
                if (savedObject && savedObject.data) {
                    console.log(`Game state loaded for ${AuraGameSDK._gameId}`, savedObject.data);
                    return savedObject.data;
                }
                console.log(`No saved game state found for ${AuraGameSDK._gameId}`);
                return null;
            } catch (error) {
                console.error(`Error loading game state for ${AuraGameSDK._gameId}:`, error);
                return Promise.resolve(null); // Resolve with null on error
            }
        }
    },

    leaderboard: {
        /**
         * Submits a new score for the current game to the leaderboard.
         * @param {string} playerName - The name of the player.
         * @param {number} score - The score achieved by the player.
         * @returns {Promise<void>} A Promise that resolves on successful submission, or rejects on error.
         */
        async submitScore(playerName, score) {
            if (!AuraGameSDK._dbManager) {
                console.error('AuraGameSDK method [' + (AuraGameSDK._gameId || 'SDK') + ' submitScore]: FATAL - window.dbManager instance not found.');
                return Promise.reject('AuraGameSDK: FATAL - window.dbManager instance not found.');
            }
            if (AuraGameSDK._dbManager.initializationPromise === null) {
                console.warn('AuraGameSDK method [' + (AuraGameSDK._gameId || 'SDK') + ' submitScore]: dbManager.initializationPromise is null. Calling AuraGameSDK._dbManager.init() now to create/get it.');
                AuraGameSDK._dbManager.init();
            }
            if (!AuraGameSDK._dbManager || !AuraGameSDK._dbManager.initializationPromise) {
                console.error('AuraGameSDK: DBManager not available or initialization promise missing.');
                return Promise.reject('AuraGameSDK: DBManager not available or initialization promise missing.');
            }
            try {
                await AuraGameSDK._dbManager.initializationPromise;
                console.log('AuraGameSDK method [' + (AuraGameSDK._gameId || 'N/A') + ' submitScore]: DB init promise resolved. Verifying _dbManager.db state...');
                if (AuraGameSDK._dbManager) {
                    console.log('AuraGameSDK method [' + (AuraGameSDK._gameId || 'N/A') + ' submitScore]: typeof _dbManager.db:', typeof AuraGameSDK._dbManager.db, ', Is IDBDatabase:', (AuraGameSDK._dbManager.db instanceof IDBDatabase), ', DB Name:', AuraGameSDK._dbManager.db ? AuraGameSDK._dbManager.db.name : 'N/A');
                } else {
                    console.error('AuraGameSDK method [' + (AuraGameSDK._gameId || 'N/A') + ' submitScore]: _dbManager itself is null/undefined immediately after its initializationPromise supposedly resolved!');
                }
            } catch (dbError) {
                console.error('AuraGameSDK: Error awaiting DB initialization:', dbError);
                return Promise.reject('AuraGameSDK: DB initialization failed.');
            }
            if (!AuraGameSDK._dbManager.db) {
                console.error('AuraGameSDK: DB connection is not available after initialization.');
                return Promise.reject('AuraGameSDK: DB connection failed after awaiting promise.');
            }

            if (!AuraGameSDK._gameId) {
                return Promise.reject('AuraGameSDK not initialized. Call init() first.');
            }
            if (typeof playerName !== 'string' || !playerName.trim()) {
                return Promise.reject('Player name must be a non-empty string.');
            }
            if (typeof score !== 'number' || isNaN(score)) {
                return Promise.reject('Score must be a valid number.');
            }

            const scoreEntry = {
                gameId: AuraGameSDK._gameId,
                playerName: playerName.trim(),
                score: score,
                timestamp: Date.now()
            };
            try {
                // 'high_scores' uses autoIncrement, so dbManager.setObject will add a new entry.
                await AuraGameSDK._dbManager.setObject('high_scores', scoreEntry);
                console.log(`Score submitted for ${AuraGameSDK._gameId}:`, scoreEntry);
            } catch (error) {
                console.error(`Error submitting score for ${AuraGameSDK._gameId}:`, error);
                return Promise.reject(error);
            }
        },

        /**
         * Gets the top N scores for the current game from the leaderboard.
         * Scores are returned in descending order (highest score first).
         * @param {string} gameId - The ID of the game for which to fetch scores.
         * @param {number} [limit=10] - The maximum number of high scores to retrieve.
         * @returns {Promise<Array<object>>} A Promise that resolves with an array of score objects, or an empty array if none are found or an error occurs.
         */
        async getHighScores(gameId, limit = 10) {
            if (!AuraGameSDK._dbManager) {
                console.error('AuraGameSDK method [' + (AuraGameSDK._gameId || 'SDK') + ' getHighScores]: FATAL - window.dbManager instance not found.');
                return Promise.reject('AuraGameSDK: FATAL - window.dbManager instance not found.');
            }
            if (AuraGameSDK._dbManager.initializationPromise === null) {
                console.warn('AuraGameSDK method [' + (AuraGameSDK._gameId || 'SDK') + ' getHighScores]: dbManager.initializationPromise is null. Calling AuraGameSDK._dbManager.init() now to create/get it.');
                AuraGameSDK._dbManager.init();
            }
            if (!AuraGameSDK._dbManager || !AuraGameSDK._dbManager.initializationPromise) {
                console.error('AuraGameSDK: DBManager not available or initialization promise missing.');
                return Promise.reject('AuraGameSDK: DBManager not available or initialization promise missing.');
            }
            try {
                await AuraGameSDK._dbManager.initializationPromise;
                console.log('AuraGameSDK method [' + (AuraGameSDK._gameId || 'N/A') + ' getHighScores]: DB init promise resolved. Verifying _dbManager.db state...');
                if (AuraGameSDK._dbManager) {
                    console.log('AuraGameSDK method [' + (AuraGameSDK._gameId || 'N/A') + ' getHighScores]: typeof _dbManager.db:', typeof AuraGameSDK._dbManager.db, ', Is IDBDatabase:', (AuraGameSDK._dbManager.db instanceof IDBDatabase), ', DB Name:', AuraGameSDK._dbManager.db ? AuraGameSDK._dbManager.db.name : 'N/A');
                } else {
                    console.error('AuraGameSDK method [' + (AuraGameSDK._gameId || 'N/A') + ' getHighScores]: _dbManager itself is null/undefined immediately after its initializationPromise supposedly resolved!');
                }
            } catch (dbError) {
                console.error('AuraGameSDK: Error awaiting DB initialization:', dbError);
                return Promise.reject('AuraGameSDK: DB initialization failed.');
            }
            if (!AuraGameSDK._dbManager.db) {
                console.error('AuraGameSDK: DB connection is not available after initialization.');
                return Promise.reject('AuraGameSDK: DB connection failed after awaiting promise.');
            }

            return new Promise((resolve, reject) => {
                try {
                    const transaction = AuraGameSDK._dbManager.db.transaction(['high_scores'], 'readonly');
                    const store = transaction.objectStore('high_scores');
                    const index = store.index('by_game'); // Use the 'by_game' index

                    const request = index.getAll(gameId); // Get all scores for the current gameId

                    request.onsuccess = (event) => {
                        const scores = event.target.result || [];
                        // Sort by score descending, then by timestamp ascending (for ties)
                        scores.sort((a, b) => {
                            if (b.score === a.score) {
                                return a.timestamp - b.timestamp; // Earlier score wins in a tie
                            }
                            return b.score - a.score;
                        });
                        resolve(scores.slice(0, limit));
                    };

                    request.onerror = (event) => {
                        console.error(`Error fetching high scores for ${gameId}:`, event.target.error);
                        resolve([]); // Resolve with empty array on DB error
                    };
                } catch (error) {
                    console.error(`Critical error in getHighScores for ${gameId}:`, error);
                    resolve([]); // Resolve with empty array on critical error
                }
            });
        }
    },

    ui: {
        /**
         * Shows an OS-level notification.
         * @param {string} title - The title of the notification.
         * @param {string} message - The main message content of the notification.
         * @param {'info' | 'warning' | 'error' | 'success'} [type='info'] - The type of notification.
         */
        showNotification(title, message, type = 'info') {
            if (window.AuraOS && typeof window.AuraOS.showNotification === 'function') {
                window.AuraOS.showNotification({ title, message, type });
            } else {
                console.warn('AuraGameSDK.ui.showNotification: AuraOS.showNotification function not found. Displaying as console log.');
                console.log(`[Notification (${type})]
Title: ${title}
Message: ${message}`);
            }
        }
    },

    assets: {
        /**
         * Helper to load an image asset.
         * @param {string} url - The URL of the image to load.
         * @returns {Promise<HTMLImageElement>} A Promise that resolves with the loaded Image object, or rejects on error.
         */
        loadImage(url) {
            return new Promise((resolve, reject) => {
                if (!url) {
                    reject(new Error('Image URL cannot be empty.'));
                    return;
                }
                const img = new Image();
                img.onload = () => resolve(img);
                img.onerror = (err) => {
                    console.error(`Error loading image: ${url}`, err);
                    reject(new Error(`Failed to load image: ${url}`));
                };
                img.src = url;
            });
        }
    },

    /**
     * Provides direct access to the game's canvas element.
     * @returns {HTMLCanvasElement|null} The canvas element, or null if not initialized.
     */
    getCanvasElement() {
        if (!this._canvasElement) {
             console.warn("AuraGameSDK: Canvas element requested before init or not set.");
        }
        return this._canvasElement;
    },

    /**
     * Provides direct access to the game's ID.
     * @returns {string|null} The game ID, or null if not initialized.
     */
    getGameId() {
        if (!this._gameId) {
            console.warn("AuraGameSDK: Game ID requested before init.");
        }
        return this._gameId;
    }
};

// Make it globally accessible (optional, depending on module system)
// window.AuraGameSDK = AuraGameSDK;
