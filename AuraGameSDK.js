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
            try {
                await AuraGameSDK._ensureReady();
            } catch (error) {
                console.error(`AuraGameSDK.storage.loadState: Pre-condition check failed for game ${AuraGameSDK._gameId || 'N/A'}. Cannot load state. Error: ${error}`);
                return Promise.resolve(null);
            }

            if (!AuraGameSDK._gameId) {
                console.error('AuraGameSDK.storage.loadState: SDK not initialized with a gameId. Call init() first.');
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
            try {
                await AuraGameSDK._ensureReady();
            } catch (error) {
                console.error(`AuraGameSDK.leaderboard.submitScore: Pre-condition check failed for game ${AuraGameSDK._gameId || 'N/A'}. Cannot submit score. Error: ${error}`);
                return Promise.reject(error);
            }

            if (!AuraGameSDK._gameId) {
                console.error('AuraGameSDK.leaderboard.submitScore: SDK not initialized with a gameId. Call init() first.');
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
            try {
                await AuraGameSDK._ensureReady();
            } catch (error) {
                console.error(`AuraGameSDK.leaderboard.getHighScores: Pre-condition check failed for game ${gameId}. Cannot get high scores. Error: ${error}`);
                return Promise.resolve([]);
            }

            // Parameter validation
            if (typeof gameId !== 'string' || !gameId.trim()) {
                 console.error('AuraGameSDK.leaderboard.getHighScores: gameId must be a non-empty string.');
                 return Promise.resolve([]);
            }

            return new Promise((resolve) => {
                try {
                    // _ensureReady guarantees AuraGameSDK._dbManager and AuraGameSDK._dbManager.db are available.
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

    profile: {
        /**
         * Saves the game-specific user profile data.
         * @param {object} profileData - The profile data to save. Must be JSON-serializable.
         * @returns {Promise<void>} A Promise that resolves on successful save, or rejects on error.
         */
        async saveProfile(profileData) {
            try {
                await AuraGameSDK._ensureReady();
            } catch (error) {
                console.error(`AuraGameSDK.profile.saveProfile: Pre-condition check failed for game ${AuraGameSDK._gameId || 'N/A'}. Cannot save profile. Error:`, error);
                return Promise.reject(error);
            }

            if (!AuraGameSDK._gameId) {
                const errorMsg = 'AuraGameSDK.profile.saveProfile: SDK not initialized with a gameId. Call init() first.';
                console.error(errorMsg);
                return Promise.reject(errorMsg);
            }
            if (typeof profileData !== 'object' || profileData === null) {
                const errorMsg = 'AuraGameSDK.profile.saveProfile: Invalid profileData provided. Must be an object.';
                console.error(errorMsg);
                return Promise.reject(errorMsg);
            }

            const profileKey = `profile-${AuraGameSDK._gameId}`;
            try {
                // The 'settings' store expects an object { key: 'keyName', value: 'theValue' }
                // We can also store gameId for potential direct queries on game-specific settings if needed,
                // though profileKey already contains gameId.
                await AuraGameSDK._dbManager.setObject('settings', {
                    key: profileKey,
                    value: profileData,
                    gameId: AuraGameSDK._gameId
                });
                console.log(`AuraGameSDK.profile.saveProfile: Profile saved for game ${AuraGameSDK._gameId}.`);
            } catch (error) {
                console.error(`AuraGameSDK.profile.saveProfile: Error saving profile for game ${AuraGameSDK._gameId}:`, error);
                return Promise.reject(error);
            }
        },

        /**
         * Loads the game-specific user profile data.
         * @returns {Promise<object|null>} A Promise that resolves with the profile data object,
         *                                or null if no profile is found or an error occurs.
         */
        async loadProfile() {
            try {
                await AuraGameSDK._ensureReady();
            } catch (error) {
                console.error(`AuraGameSDK.profile.loadProfile: Pre-condition check failed for game ${AuraGameSDK._gameId || 'N/A'}. Cannot load profile. Error:`, error);
                return Promise.resolve(null); // Resolve with null on pre-condition error
            }

            if (!AuraGameSDK._gameId) {
                console.error('AuraGameSDK.profile.loadProfile: SDK not initialized with a gameId. Call init() first.');
                return Promise.resolve(null); // Resolve with null if gameId is missing
            }

            const profileKey = `profile-${AuraGameSDK._gameId}`;
            try {
                const result = await AuraGameSDK._dbManager.getObject('settings', profileKey);
                if (result && typeof result.value !== 'undefined') {
                    console.log(`AuraGameSDK.profile.loadProfile: Profile loaded for game ${AuraGameSDK._gameId}.`);
                    return result.value;
                }
                console.log(`AuraGameSDK.profile.loadProfile: No profile found for game ${AuraGameSDK._gameId}.`);
                return null;
            } catch (error) {
                console.error(`AuraGameSDK.profile.loadProfile: Error loading profile for game ${AuraGameSDK._gameId}:`, error);
                return Promise.resolve(null); // Resolve with null on error
            }
        }
    },

    achievements: {
        /**
         * Unlocks an achievement for the current game.
         * @param {string} achievementId - A unique identifier for the achievement (e.g., "level_1_complete").
         * @param {string} title - The user-facing title of the achievement (e.g., "Level 1 Conquered!").
         * @param {string} description - A user-facing description of how the achievement was earned.
         * @returns {Promise<void>} A Promise that resolves on successful unlock, or rejects on error.
         */
        async unlock(achievementId, title, description) {
            try {
                await AuraGameSDK._ensureReady();
            } catch (error) {
                console.error(`AuraGameSDK.achievements.unlock: Pre-condition check failed for game ${AuraGameSDK._gameId || 'N/A'}. Cannot unlock achievement. Error:`, error);
                return Promise.reject(error);
            }

            if (!AuraGameSDK._gameId) {
                const errorMsg = 'AuraGameSDK.achievements.unlock: SDK not initialized with a gameId. Call init() first.';
                console.error(errorMsg);
                return Promise.reject(errorMsg);
            }
            if (typeof achievementId !== 'string' || !achievementId.trim()) {
                const errorMsg = 'AuraGameSDK.achievements.unlock: achievementId must be a non-empty string.';
                console.error(errorMsg);
                return Promise.reject(errorMsg);
            }
            if (typeof title !== 'string' || !title.trim()) {
                const errorMsg = 'AuraGameSDK.achievements.unlock: title must be a non-empty string.';
                console.error(errorMsg);
                return Promise.reject(errorMsg);
            }
            if (typeof description !== 'string' || !description.trim()) {
                const errorMsg = 'AuraGameSDK.achievements.unlock: description must be a non-empty string.';
                console.error(errorMsg);
                return Promise.reject(errorMsg);
            }

            const achievementRecord = {
                gameId: AuraGameSDK._gameId,
                achievementId: achievementId.trim(),
                title: title.trim(),
                description: description.trim(),
                timestamp: Date.now()
            };

            try {
                await AuraGameSDK._dbManager.setObject('achievements', achievementRecord);
                console.log(`AuraGameSDK.achievements.unlock: Achievement unlocked for game ${AuraGameSDK._gameId}: '${achievementId}'.`);
                // Optionally, trigger a UI notification here if the OS supports it
                // Example: AuraGameSDK.ui.showNotification(`Achievement Unlocked: ${title}`);
            } catch (error) {
                console.error(`AuraGameSDK.achievements.unlock: Error unlocking achievement '${achievementId}' for game ${AuraGameSDK._gameId}:`, error);
                return Promise.reject(error);
            }
        },

        /**
         * Checks if a specific achievement has been unlocked for the current game.
         * @param {string} achievementId - The identifier of the achievement to check.
         * @returns {Promise<boolean>} A Promise that resolves with true if unlocked, false otherwise.
         */
        async isUnlocked(achievementId) {
            try {
                await AuraGameSDK._ensureReady();
            } catch (error) {
                console.error(`AuraGameSDK.achievements.isUnlocked: Pre-condition check failed for game ${AuraGameSDK._gameId || 'N/A'}. Error:`, error);
                return Promise.resolve(false);
            }

            if (!AuraGameSDK._gameId) {
                console.error('AuraGameSDK.achievements.isUnlocked: SDK not initialized with a gameId.');
                return Promise.resolve(false);
            }
            if (typeof achievementId !== 'string' || !achievementId.trim()) {
                console.error('AuraGameSDK.achievements.isUnlocked: achievementId must be a non-empty string.');
                return Promise.resolve(false);
            }

            const key = [AuraGameSDK._gameId, achievementId.trim()];
            try {
                const result = await AuraGameSDK._dbManager.getObject('achievements', key);
                console.log(`AuraGameSDK.achievements.isUnlocked: Check for achievement '${achievementId}' in game ${AuraGameSDK._gameId}: ${Boolean(result)}.`);
                return Boolean(result);
            } catch (error) {
                console.error(`AuraGameSDK.achievements.isUnlocked: Error checking achievement '${achievementId}' for game ${AuraGameSDK._gameId}:`, error);
                return Promise.resolve(false); // Resolve with false on error
            }
        },

        /**
         * Gets all achievements unlocked for the current game.
         * @returns {Promise<Array<object>>} A Promise that resolves with an array of achievement objects,
         *                                   or an empty array if none are found or an error occurs.
         */
        async getGameAchievements() {
            try {
                await AuraGameSDK._ensureReady();
            } catch (error) {
                console.error(`AuraGameSDK.achievements.getGameAchievements: Pre-condition check failed for game ${AuraGameSDK._gameId || 'N/A'}. Error:`, error);
                return Promise.resolve([]);
            }

            if (!AuraGameSDK._gameId) {
                console.error('AuraGameSDK.achievements.getGameAchievements: SDK not initialized with a gameId.');
                return Promise.resolve([]);
            }

            if (!AuraGameSDK._dbManager || !AuraGameSDK._dbManager.db) {
                 console.error('AuraGameSDK.achievements.getGameAchievements: DB connection not available.');
                 return Promise.resolve([]);
            }

            return new Promise((resolve) => {
                const gameAchievements = [];
                try {
                    const db = AuraGameSDK._dbManager.db;
                    const transaction = db.transaction('achievements', 'readonly');
                    const store = transaction.objectStore('achievements');
                    // Create a key range for all achievements for the current gameId.
                    // The keyPath for 'achievements' is ['gameId', 'achievementId'].
                    // We want all records where the first part of the key is AuraGameSDK._gameId.
                    const range = IDBKeyRange.bound([AuraGameSDK._gameId, ''], [AuraGameSDK._gameId, '\uffff']);

                    const request = store.openCursor(range);

                    request.onsuccess = (event) => {
                        const cursor = event.target.result;
                        if (cursor) {
                            gameAchievements.push(cursor.value);
                            cursor.continue();
                        } else {
                            // No more entries
                            console.log(`AuraGameSDK.achievements.getGameAchievements: Found ${gameAchievements.length} achievements for game ${AuraGameSDK._gameId}.`);
                            resolve(gameAchievements);
                        }
                    };

                    request.onerror = (event) => {
                        console.error(`AuraGameSDK.achievements.getGameAchievements: Error fetching achievements for game ${AuraGameSDK._gameId}:`, event.target.error);
                        resolve([]); // Resolve with empty array on DB error
                    };
                } catch (error) {
                    console.error(`AuraGameSDK.achievements.getGameAchievements: Critical error for game ${AuraGameSDK._gameId}:`, error);
                    resolve([]); // Resolve with empty array on critical error
                }
            });
        }
    },

    resources: {
        _resources: {},

        /**
         * Initializes the resource manager with initial quantities for various resource types.
         * Example: AuraGameSDK.resources.init({ gold: 100, wood: 50 });
         * @param {object} initialResources - An object where keys are resource types (string)
         *                                  and values are their initial amounts (number).
         */
        init(initialResources) {
            if (typeof initialResources === 'object' && initialResources !== null) {
                try {
                    this._resources = JSON.parse(JSON.stringify(initialResources));
                    console.log(`AuraGameSDK.resources: Initialized with`, this._resources);
                } catch (e) {
                    console.error('AuraGameSDK.resources.init: Error deep copying initialResources. Ensure it is JSON-serializable.', e);
                    this._resources = {}; // Fallback to empty if copy fails
                }
            } else {
                this._resources = {};
                console.warn('AuraGameSDK.resources.init: initialResources was not a valid object. Initializing with empty resources.');
            }
        },

        /**
         * Gets the current amount of a specific resource.
         * @param {string} resourceType - The type of resource to get (e.g., "gold").
         * @returns {number} The amount of the resource, or 0 if the resource type is not defined.
         */
        get(resourceType) {
            const amount = this._resources[resourceType];
            return typeof amount === 'number' ? amount : 0;
        },

        /**
         * Spends a specified amount of a resource.
         * @param {string} resourceType - The type of resource to spend.
         * @param {number} amount - The amount to spend. Must be a positive number.
         * @returns {boolean} True if the resource was successfully spent, false otherwise (e.g., insufficient resources or invalid amount).
         */
        spend(resourceType, amount) {
            if (typeof amount !== 'number' || amount < 0) {
                console.error(`AuraGameSDK.resources.spend: Invalid amount. Amount must be a non-negative number. Attempted to spend ${amount} of ${resourceType}.`);
                return false;
            }
            if (this._resources[resourceType] !== undefined && this._resources[resourceType] >= amount) {
                this._resources[resourceType] -= amount;
                console.log(`AuraGameSDK.resources.spend: Spent ${amount} of ${resourceType}. Remaining: ${this._resources[resourceType]}.`);
                return true;
            } else {
                console.warn(`AuraGameSDK.resources.spend: Insufficient ${resourceType}. Current: ${this._resources[resourceType] || 0}, tried to spend: ${amount}.`);
                return false;
            }
        },

        /**
         * Adds a specified amount to a resource.
         * If the resource type does not exist, it will be initialized with 0 before adding.
         * @param {string} resourceType - The type of resource to add to.
         * @param {number} amount - The amount to add. Must be a positive number.
         */
        add(resourceType, amount) {
            if (typeof amount !== 'number' || amount < 0) {
                console.error(`AuraGameSDK.resources.add: Invalid amount. Amount must be a non-negative number. Attempted to add ${amount} to ${resourceType}.`);
                return; // Or return false if a return value is preferred for chaining/error checking
            }
            if (this._resources[resourceType] === undefined) {
                this._resources[resourceType] = 0;
                console.log(`AuraGameSDK.resources.add: Initialized new resource type ${resourceType}.`);
            }
            this._resources[resourceType] += amount;
            console.log(`AuraGameSDK.resources.add: Added ${amount} to ${resourceType}. New total: ${this._resources[resourceType]}.`);
            // return true; // if a return value is preferred
        },

        /**
         * Gets a deep copy of the current state of all resources.
         * Useful for saving the resource state.
         * @returns {object} A deep copy of the internal resources object.
         */
        getState() {
            try {
                return JSON.parse(JSON.stringify(this._resources));
            } catch (e) {
                console.error('AuraGameSDK.resources.getState: Error deep copying resources state.', e);
                return {}; // Fallback to empty if copy fails
            }
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
    },

    /**
     * @private
     * Ensures that the AuraOS system and DBManager are ready for operations.
     * It checks for system readiness, DBManager instance, and its initialization promise.
     * If the DBManager is not initialized, it attempts to initialize it.
     * @returns {Promise<void>} A Promise that resolves when ready, or rejects on error.
     */
    async _ensureReady() {
        const methodName = "_ensureReady"; // Simplified logging for now

        // Wait for AuraOS system to be ready
        if (typeof window.auraOSSystemReady !== 'undefined' && !window.auraOSSystemReady) {
            console.warn(`AuraGameSDK.${methodName}: System not ready yet, waiting...`);
            await new Promise(resolve => {
                const check = () => {
                    if (window.auraOSSystemReady) {
                        resolve();
                    } else {
                        setTimeout(check, 100);
                    }
                };
                check();
            });
            console.log(`AuraGameSDK.${methodName}: System is now ready.`);
        }

        const dbManager = AuraGameSDK._dbManager;

        if (!dbManager) {
            const errorMsg = `AuraGameSDK.${methodName}: FATAL - window.dbManager instance not found.`;
            console.error(errorMsg);
            return Promise.reject(errorMsg);
        }

        if (dbManager.initializationPromise === null || typeof dbManager.initializationPromise === 'undefined') {
            console.warn(`AuraGameSDK.${methodName}: dbManager.initializationPromise is null or undefined. Calling dbManager.init() now.`);
            try {
                dbManager.init();
                if (!dbManager.initializationPromise) {
                    const errorMsg = `AuraGameSDK.${methodName}: dbManager.init() was called but initializationPromise is still missing.`;
                    console.error(errorMsg);
                    return Promise.reject(errorMsg);
                }
            } catch (initError) {
                const errorMsg = `AuraGameSDK.${methodName}: Error calling dbManager.init(): ${initError}`;
                console.error(errorMsg, initError);
                return Promise.reject(errorMsg);
            }
        }

        try {
            await dbManager.initializationPromise;
            // console.log(`AuraGameSDK.${methodName}: DB init promise resolved. Verifying dbManager.db state...`); // Too verbose for every call
            if (!dbManager.db) {
                const errorMsg = `AuraGameSDK.${methodName}: DB connection (dbManager.db) is not available after initialization.`;
                console.error(errorMsg);
                return Promise.reject(errorMsg);
            }
        } catch (dbError) {
            const errorMsg = `AuraGameSDK.${methodName}: Error awaiting DB initialization: ${dbError}`;
            console.error(errorMsg, dbError);
            return Promise.reject(errorMsg);
        }
    }
};

// Make it globally accessible (optional, depending on module system)
// window.AuraGameSDK = AuraGameSDK;

[end of AuraGameSDK.js]
