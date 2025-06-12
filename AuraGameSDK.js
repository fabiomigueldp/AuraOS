/**
 * @file AuraGameSDK.js
 * Provides an SDK for games to interact with AuraOS services.
 * 
 * Features:
 * - Game state persistence (save/load)
 * - Leaderboard system
 * - Audio system (background music with loop and playlist support)
 * - UI notifications
 * - Asset loading helpers
 * 
 * Audio System Usage:
 * 
 * Single track loop (for continuous background music):
 * - AuraGameSDK.audio.playLoopMusic('music/tracks/game_theme.mp3');
 * - AuraGameSDK.audio.playLoopMusic('music/tracks/beethoven_-_fur_elise.mp3', 0.5);
 * 
 * Playlist mode (for varied background music):
 * - AuraGameSDK.audio.playPlaylist(['track1.mp3', 'track2.mp3']);
 * - AuraGameSDK.audio.playPlaylist([
 *     'music/tracks/beethoven_-_fur_elise.mp3',
 *     'music/tracks/bennett_-_vois_sur_ton_chemin.mp3'
 *   ], 0.6, true); // volume 0.6, shuffle enabled
 * 
 * Audio controls:
 * - AuraGameSDK.audio.pause();
 * - AuraGameSDK.audio.resume();
 * - AuraGameSDK.audio.stop();
 * - AuraGameSDK.audio.setVolume(0.8);
 * - AuraGameSDK.audio.nextTrack(); // only in playlist mode
 * - AuraGameSDK.audio.previousTrack(); // only in playlist mode
 * 
 * Audio info:
 * - const info = AuraGameSDK.audio.getCurrentTrackInfo();
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
            // Wait for AuraOS system to be ready
            if (typeof window.auraOSSystemReady !== 'undefined' && !window.auraOSSystemReady) {
                console.warn('AuraGameSDK.saveState: System not ready yet, waiting...');
                return new Promise((resolve, reject) => {
                    const checkReady = () => {
                        if (window.auraOSSystemReady && AuraGameSDK._dbManager && AuraGameSDK._dbManager.initializationPromise) {
                            AuraGameSDK.storage.saveState(data).then(resolve).catch(reject);
                        } else {
                            setTimeout(checkReady, 100);
                        }
                    };
                    checkReady();
                });
            }

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
            // Wait for AuraOS system to be ready
            if (typeof window.auraOSSystemReady !== 'undefined' && !window.auraOSSystemReady) {
                console.warn('AuraGameSDK.loadState: System not ready yet, waiting...');
                return new Promise((resolve) => {
                    const checkReady = () => {
                        if (window.auraOSSystemReady && AuraGameSDK._dbManager && AuraGameSDK._dbManager.initializationPromise) {
                            AuraGameSDK.storage.loadState().then(resolve).catch(() => resolve(null));
                        } else {
                            setTimeout(checkReady, 100);
                        }
                    };
                    checkReady();
                });
            }

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
            // Wait for AuraOS system to be ready
            if (typeof window.auraOSSystemReady !== 'undefined' && !window.auraOSSystemReady) {
                console.warn('AuraGameSDK.submitScore: System not ready yet, waiting...');
                return new Promise((resolve, reject) => {
                    const checkReady = () => {
                        if (window.auraOSSystemReady && AuraGameSDK._dbManager && AuraGameSDK._dbManager.initializationPromise) {
                            AuraGameSDK.leaderboard.submitScore(playerName, score).then(resolve).catch(reject);
                        } else {
                            setTimeout(checkReady, 100);
                        }
                    };
                    checkReady();
                });
            }

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
            // Wait for AuraOS system to be ready
            if (typeof window.auraOSSystemReady !== 'undefined' && !window.auraOSSystemReady) {
                console.warn('AuraGameSDK.getHighScores: System not ready yet, waiting...');
                return new Promise((resolve) => {
                    const checkReady = () => {
                        if (window.auraOSSystemReady && AuraGameSDK._dbManager && AuraGameSDK._dbManager.initializationPromise) {
                            AuraGameSDK.leaderboard.getHighScores(gameId, limit).then(resolve).catch(() => resolve([]));
                        } else {
                            setTimeout(checkReady, 100);
                        }
                    };
                    checkReady();
                });
            }

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

    audio: {
        _currentAudio: null,
        _playlist: [],
        _currentTrackIndex: 0,
        _isLooping: false,
        _isPlaylistMode: false,
        _volume: 0.7,

        /**
         * Plays a single music track in loop mode.
         * Perfect for background music in games that need continuous audio.
         * 
         * Usage examples:
         * - AuraGameSDK.audio.playLoopMusic('music/tracks/game_theme.mp3');
         * - AuraGameSDK.audio.playLoopMusic('music/tracks/beethoven_-_fur_elise.mp3', 0.5);
         * 
         * @param {string} musicPath - Path to the music file (relative to the root or absolute URL)
         * @param {number} [volume=0.7] - Volume level (0.0 to 1.0)
         * @returns {Promise<void>} Promise that resolves when music starts playing
         */
        async playLoopMusic(musicPath, volume = 0.7) {
            try {
                // Stop any currently playing audio
                this.stop();

                // Create new audio element
                this._currentAudio = new Audio(musicPath);
                this._currentAudio.loop = true;
                this._currentAudio.volume = Math.max(0, Math.min(1, volume));
                this._volume = this._currentAudio.volume;
                this._isLooping = true;
                this._isPlaylistMode = false;

                // Wait for the audio to be ready and play
                return new Promise((resolve, reject) => {
                    this._currentAudio.addEventListener('canplaythrough', () => {
                        this._currentAudio.play()
                            .then(() => {
                                console.log(`AuraGameSDK.audio: Started looping music - ${musicPath}`);
                                resolve();
                            })
                            .catch(reject);
                    }, { once: true });

                    this._currentAudio.addEventListener('error', (e) => {
                        console.error(`AuraGameSDK.audio: Error loading music - ${musicPath}`, e);
                        reject(new Error(`Failed to load music: ${musicPath}`));
                    }, { once: true });

                    // Start loading the audio
                    this._currentAudio.load();
                });
            } catch (error) {
                console.error('AuraGameSDK.audio.playLoopMusic error:', error);
                throw error;
            }
        },

        /**
         * Plays a playlist of music tracks in sequence.
         * Perfect for games that need varied background music or different tracks for different game states.
         * 
         * Usage examples:
         * - AuraGameSDK.audio.playPlaylist(['music/tracks/level1.mp3', 'music/tracks/level2.mp3']);
         * - AuraGameSDK.audio.playPlaylist([
         *     'music/tracks/beethoven_-_fur_elise.mp3',
         *     'music/tracks/bennett_-_vois_sur_ton_chemin.mp3'
         *   ], 0.6, true);
         * 
         * @param {string[]} musicPaths - Array of paths to music files
         * @param {number} [volume=0.7] - Volume level (0.0 to 1.0)
         * @param {boolean} [shuffle=false] - Whether to shuffle the playlist
         * @returns {Promise<void>} Promise that resolves when first track starts playing
         */
        async playPlaylist(musicPaths, volume = 0.7, shuffle = false) {
            try {
                if (!Array.isArray(musicPaths) || musicPaths.length === 0) {
                    throw new Error('Playlist must be a non-empty array of music paths');
                }

                // Stop any currently playing audio
                this.stop();

                // Setup playlist
                this._playlist = shuffle ? this._shuffleArray([...musicPaths]) : [...musicPaths];
                this._currentTrackIndex = 0;
                this._volume = Math.max(0, Math.min(1, volume));
                this._isPlaylistMode = true;
                this._isLooping = false;

                console.log(`AuraGameSDK.audio: Starting playlist with ${this._playlist.length} tracks`);
                
                // Start playing the first track
                return this._playTrackAtIndex(0);
            } catch (error) {
                console.error('AuraGameSDK.audio.playPlaylist error:', error);
                throw error;
            }
        },

        /**
         * Stops all audio playback and clears the current audio/playlist.
         * 
         * Usage example:
         * - AuraGameSDK.audio.stop();
         */
        stop() {
            if (this._currentAudio) {
                this._currentAudio.pause();
                this._currentAudio.src = '';
                this._currentAudio = null;
            }
            this._playlist = [];
            this._currentTrackIndex = 0;
            this._isLooping = false;
            this._isPlaylistMode = false;
            console.log('AuraGameSDK.audio: Stopped all audio playback');
        },

        /**
         * Pauses the currently playing audio.
         * 
         * Usage example:
         * - AuraGameSDK.audio.pause();
         */
        pause() {
            if (this._currentAudio && !this._currentAudio.paused) {
                this._currentAudio.pause();
                console.log('AuraGameSDK.audio: Audio paused');
            }
        },

        /**
         * Resumes the currently paused audio.
         * 
         * Usage example:
         * - AuraGameSDK.audio.resume();
         */
        resume() {
            if (this._currentAudio && this._currentAudio.paused) {
                this._currentAudio.play().catch(error => {
                    console.error('AuraGameSDK.audio: Error resuming audio:', error);
                });
            }
        },

        /**
         * Sets the volume for the currently playing audio.
         * 
         * Usage examples:
         * - AuraGameSDK.audio.setVolume(0.5); // 50% volume
         * - AuraGameSDK.audio.setVolume(1.0); // 100% volume
         * 
         * @param {number} volume - Volume level (0.0 to 1.0)
         */
        setVolume(volume) {
            this._volume = Math.max(0, Math.min(1, volume));
            if (this._currentAudio) {
                this._currentAudio.volume = this._volume;
            }
        },

        /**
         * Gets the current volume level.
         * 
         * Usage example:
         * - const volume = AuraGameSDK.audio.getVolume();
         * 
         * @returns {number} Current volume level (0.0 to 1.0)
         */
        getVolume() {
            return this._volume;
        },

        /**
         * Skips to the next track in the playlist (if in playlist mode).
         * 
         * Usage example:
         * - AuraGameSDK.audio.nextTrack();
         */
        nextTrack() {
            if (!this._isPlaylistMode || this._playlist.length === 0) {
                console.warn('AuraGameSDK.audio: nextTrack called but not in playlist mode');
                return;
            }

            this._currentTrackIndex = (this._currentTrackIndex + 1) % this._playlist.length;
            this._playTrackAtIndex(this._currentTrackIndex);
        },

        /**
         * Skips to the previous track in the playlist (if in playlist mode).
         * 
         * Usage example:
         * - AuraGameSDK.audio.previousTrack();
         */
        previousTrack() {
            if (!this._isPlaylistMode || this._playlist.length === 0) {
                console.warn('AuraGameSDK.audio: previousTrack called but not in playlist mode');
                return;
            }

            this._currentTrackIndex = this._currentTrackIndex === 0 
                ? this._playlist.length - 1 
                : this._currentTrackIndex - 1;
            this._playTrackAtIndex(this._currentTrackIndex);
        },

        /**
         * Gets information about the currently playing audio.
         * 
         * Usage example:
         * - const info = AuraGameSDK.audio.getCurrentTrackInfo();
         * - console.log(`Now playing: ${info.name} (${info.currentTime}/${info.duration})`);
         * 
         * @returns {object|null} Object with track information or null if nothing is playing
         */
        getCurrentTrackInfo() {
            if (!this._currentAudio) {
                return null;
            }

            const pathParts = this._currentAudio.src.split('/');
            const fileName = pathParts[pathParts.length - 1];

            return {
                name: fileName,
                src: this._currentAudio.src,
                currentTime: this._currentAudio.currentTime,
                duration: this._currentAudio.duration || 0,
                volume: this._currentAudio.volume,
                paused: this._currentAudio.paused,
                isLooping: this._isLooping,
                isPlaylistMode: this._isPlaylistMode,
                playlistIndex: this._isPlaylistMode ? this._currentTrackIndex : null,
                playlistLength: this._isPlaylistMode ? this._playlist.length : null
            };
        },

        /**
         * Internal method to play a track at a specific index in the playlist.
         * @private
         */
        async _playTrackAtIndex(index) {
            if (index < 0 || index >= this._playlist.length) {
                console.error(`AuraGameSDK.audio: Invalid track index ${index}`);
                return;
            }

            try {
                const trackPath = this._playlist[index];
                
                // Stop current audio
                if (this._currentAudio) {
                    this._currentAudio.pause();
                    this._currentAudio.src = '';
                }

                // Create new audio for the track
                this._currentAudio = new Audio(trackPath);
                this._currentAudio.volume = this._volume;
                this._currentAudio.loop = false; // Playlist tracks don't loop individually

                // Setup event listener for when track ends
                this._currentAudio.addEventListener('ended', () => {
                    console.log(`AuraGameSDK.audio: Track ended - ${trackPath}`);
                    // Auto-play next track in playlist
                    this.nextTrack();
                });

                // Wait for audio to be ready and play
                return new Promise((resolve, reject) => {
                    this._currentAudio.addEventListener('canplaythrough', () => {
                        this._currentAudio.play()
                            .then(() => {
                                console.log(`AuraGameSDK.audio: Playing track ${index + 1}/${this._playlist.length} - ${trackPath}`);
                                resolve();
                            })
                            .catch(reject);
                    }, { once: true });

                    this._currentAudio.addEventListener('error', (e) => {
                        console.error(`AuraGameSDK.audio: Error loading track - ${trackPath}`, e);
                        reject(new Error(`Failed to load track: ${trackPath}`));
                    }, { once: true });

                    // Start loading the audio
                    this._currentAudio.load();
                });
            } catch (error) {
                console.error(`AuraGameSDK.audio: Error playing track at index ${index}:`, error);
                throw error;
            }
        },

        /**
         * Internal method to shuffle an array.
         * @private
         */
        _shuffleArray(array) {
            const shuffled = [...array];
            for (let i = shuffled.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
            }
            return shuffled;
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
