class DBManager {
    constructor() {
        this.dbName = 'AURA_OS_DB';
        this.dbVersion = 3;
        this.db = null;
        this.initializationPromise = null;
    }

    init() {
        if (this.initializationPromise) {
            return this.initializationPromise;
        }

        this.initializationPromise = new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.dbVersion);

            request.onupgradeneeded = (event) => {
                this.db = event.target.result;
                console.log('Upgrading database to version', this.dbVersion); // Updated log

                // Existing stores
                if (!this.db.objectStoreNames.contains('files')) {
                    this.db.createObjectStore('files', { keyPath: 'path' });
                    console.log('Created "files" object store.');
                }
                if (!this.db.objectStoreNames.contains('settings')) {
                    this.db.createObjectStore('settings', { keyPath: 'key' });
                    console.log('Created "settings" object store.');
                }

                // New Game Center stores
                if (!this.db.objectStoreNames.contains('games')) {
                    this.db.createObjectStore('games', { keyPath: 'gameId' });
                    console.log('Created "games" object store.');
                }

                if (!this.db.objectStoreNames.contains('game_saves')) {
                    this.db.createObjectStore('game_saves', { keyPath: 'saveId' });
                    console.log('Created "game_saves" object store.');
                }

                if (!this.db.objectStoreNames.contains('high_scores')) {
                    const scoreStore = this.db.createObjectStore('high_scores', { autoIncrement: true });
                    scoreStore.createIndex('by_game', 'gameId', { unique: false });
                    console.log('Created "high_scores" object store and "by_game" index.');
                }

                // New player_progress store
                if (!this.db.objectStoreNames.contains('player_progress')) {
                    this.db.createObjectStore('player_progress', { keyPath: 'gameId_playerId' });
                    console.log('Created "player_progress" object store.');
                }
                // Add any other future stores here in subsequent versions

                console.log('Database upgrade complete.');
            };

            request.onsuccess = (event) => {
                this.db = event.target.result;
                console.log('DBManager.init onsuccess: this.db set. Type:', typeof this.db, 'Instance of IDBDatabase:', this.db instanceof IDBDatabase, 'DB Name:', this.db ? this.db.name : 'N/A');
                console.log('Database initialized successfully.');
                resolve(this.db);
            };

            request.onerror = (event) => {
                console.error('Error initializing database:', event.target.error);
                reject(event.target.error);
            };
        });

        return this.initializationPromise;
    }

    // Generic CRUD operations
    getObject(storeName, key) {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                console.error('Database not initialized.');
                return reject('Database not initialized.');
            }
            const transaction = this.db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.get(key);

            request.onsuccess = (event) => {
                resolve(event.target.result);
            };

            request.onerror = (event) => {
                console.error(`Error getting object from ${storeName}:`, event.target.error);
                reject(event.target.error);
            };
        });
    }

    setObject(storeName, object) {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                console.error('Database not initialized.');
                return reject('Database not initialized.');
            }
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.put(object);

            request.onsuccess = () => {
                resolve();
            };

            request.onerror = (event) => {
                console.error(`Error setting object in ${storeName}:`, event.target.error);
                reject(event.target.error);
            };
        });
    }

    deleteObject(storeName, key) {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                console.error('Database not initialized.');
                return reject('Database not initialized.');
            }
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.delete(key);

            request.onsuccess = () => {
                resolve();
            };

            request.onerror = (event) => {
                console.error(`Error deleting object from ${storeName}:`, event.target.error);
                reject(event.target.error);
            };
        });
    }

    // File system specific methods
    saveFile(fileMetadata, fileData) {
        // Ensure fileMetadata has a 'path' property, as it's the keyPath for the 'files' store.
        if (!fileMetadata || !fileMetadata.path) {
            console.error('saveFile: fileMetadata must include a "path" property.');
            return Promise.reject('fileMetadata must include a "path" property.');
        }
        console.log(`Saving file: ${fileMetadata.path}`);
        const fileObject = { ...fileMetadata, data: fileData };
        return this.setObject('files', fileObject);
    }

    loadFile(filePath) {
        console.log(`Loading file: ${filePath}`);
        return this.getObject('files', filePath);
    }

    deleteFile(filePath) {
        console.log(`Deleting file: ${filePath}`);
        return this.deleteObject('files', filePath);
    }

    listFiles(directoryPath) {
        console.log(`Listing files for directory: ${directoryPath}`);
        return new Promise((resolve, reject) => {
            if (!this.db) {
                console.error('Database not initialized.');
                return reject('Database not initialized.');
            }

            const transaction = this.db.transaction(['files'], 'readonly');
            const store = transaction.objectStore('files');
            const request = store.getAll(); // Get all files

            request.onsuccess = (event) => {
                const allFiles = event.target.result;
                // Normalize directoryPath: ensure it ends with a '/' if it's not root, and handle root case.
                // Root path is expected to be '/' for this new logic.
                // The terminal passes '/' for root. An empty string "" might also be considered root by some old logic,
                // but the new filter explicitly checks for '/'.
                let normalizedDirPath = directoryPath;
                if (normalizedDirPath !== '/' && !normalizedDirPath.endsWith('/')) {
                    normalizedDirPath += '/';
                }
                // If original directoryPath was empty string (potentially old root representation), treat as '/'
                if (directoryPath === "") {
                    normalizedDirPath = '/';
                }


                const filesInDir = allFiles.filter(file => {
                    // Ensure file.path exists and is a string
                    if (typeof file.path !== 'string') {
                        return false;
                    }

                    if (normalizedDirPath === '/') {
                        // For root directory:
                        // 1. Item must not be the root path itself.
                        // 2. Item path must start with '/' (implicitly true if it's an absolute path).
                        // 3. The path part after the initial '/' must not contain any more slashes.
                        if (file.path === '/') {
                            return false;
                        }
                        // Check if it's a top-level item, e.g., /Desktop, /Documents
                        // Path should start with '/' and the rest should not contain '/'
                        return file.path.startsWith('/') && !file.path.substring(1).includes('/');
                    } else {
                        // For non-root directories:
                        // Item path must start with the normalized directory path.
                        // The remaining part of the path must not contain any slashes.
                        // And the item path must not be the directory path itself (e.g. when listing /A, /A/B is a child, but /A is not its own child)
                        if (file.path.startsWith(normalizedDirPath) && file.path !== normalizedDirPath) {
                            const remainingPath = file.path.substring(normalizedDirPath.length);
                            return !remainingPath.includes('/');
                        }
                    }
                    return false;
                });
                resolve(filesInDir);
            };

            request.onerror = (event) => {
                console.error(`Error listing files from directory ${directoryPath}:`, event.target.error);
                reject(event.target.error);
            };
        });
    }

    // System settings specific methods
    saveSetting(key, value) {
        console.log(`Saving setting: ${key} =`, value);
        return this.setObject('settings', { key, value });
    }

    loadSetting(key) {
        console.log(`Loading setting: ${key}`);
        return this.getObject('settings', key).then(setting => {
            return setting ? setting.value : undefined; // Return undefined if not found, to distinguish from null/false values
        });
    }

    deleteSetting(key) {
        console.log(`Deleting setting: ${key}`);
        return this.deleteObject('settings', key);
    }

    // Migration from localStorage
    migrateFromLocalStorage() {
        console.log('Starting migration from localStorage to IndexedDB...');
        return new Promise(async (resolve, reject) => {
            if (!this.db) {
                console.error('DBManager: Database not initialized. Cannot migrate from localStorage.');
                return reject('Database not initialized.');
            }

            const migrationPromises = [];

            // Migrate File System (auraOS_fileSystem)
            const fileSystemString = localStorage.getItem('auraOS_fileSystem');
            if (fileSystemString) {
                console.log('DBManager: Found auraOS_fileSystem in localStorage. Starting migration.');
                try {
                    const fileSystem = JSON.parse(fileSystemString);
                    // Helper function to recursively traverse the file system tree
                    const migrateDir = async (currentPath, dirObject) => {
                        for (const name in dirObject) {
                            const item = dirObject[name];
                            const itemPath = (currentPath ? currentPath + '/' : '') + name;
                            if (item.type === 'file') {
                                console.log(`DBManager: Migrating file: ${itemPath}`);
                                // Assuming item structure is { type: 'file', content: '...', lastModified: ..., ... }
                                // We need to ensure the object stored matches what saveFile expects or adapt.
                                // For now, let's assume 'item' itself is the fileMetadata and item.content is fileData.
                                const { content, ...metadata } = item;
                                metadata.path = itemPath; // Ensure path is part of metadata
                                migrationPromises.push(this.saveFile(metadata, content));
                            } else if (item.type === 'folder') {
                                console.log(`DBManager: Migrating folder (structure): ${itemPath}`);
                                // Optionally, save folder as a distinct object if needed, e.g.,
                                // migrationPromises.push(this.setObject('files', { path: itemPath, type: 'folder', ...item }));
                                // Then recurse
                                if (item.children) {
                                    await migrateDir(itemPath, item.children);
                                }
                            }
                        }
                    };

                    await migrateDir('', fileSystem); // Start from root
                    console.log('DBManager: File system migration processing initiated.');
                    // localStorage.removeItem('auraOS_fileSystem'); // Removed as per instruction to do it after all promises resolve
                    // console.log('DBManager: Cleaned up localStorage.auraOS_fileSystem.');
                } catch (error) {
                    console.error('DBManager: Error migrating auraOS_fileSystem:', error);
                    // Do not reject immediately, try to migrate settings next
                }
            } else {
                console.log('DBManager: auraOS_fileSystem not found in localStorage. Skipping file system migration.');
            }

            // Migrate System Settings (auraOS_systemState)
            const systemStateString = localStorage.getItem('auraOS_systemState');
            if (systemStateString) {
                console.log('DBManager: Found auraOS_systemState in localStorage. Starting migration.');
                try {
                    const systemState = JSON.parse(systemStateString);
                    for (const key in systemState) {
                        if (Object.hasOwnProperty.call(systemState, key)) {
                            const value = systemState[key];
                            console.log(`DBManager: Migrating setting: ${key}`);
                            migrationPromises.push(this.saveSetting(key, value));
                        }
                    }
                    console.log('DBManager: System settings migration processing initiated.');
                    // localStorage.removeItem('auraOS_systemState'); // Removed as per instruction
                    // console.log('DBManager: Cleaned up localStorage.auraOS_systemState.');
                } catch (error)
                {
                    console.error('DBManager: Error migrating auraOS_systemState:', error);
                }
            } else {
                console.log('DBManager: auraOS_systemState not found in localStorage. Skipping settings migration.');
            }

            try {
                await Promise.all(migrationPromises);
                console.log('DBManager: All migration tasks from localStorage completed successfully.');

                // Cleanup localStorage items after successful migration of all parts
                if (fileSystemString) {
                    localStorage.removeItem('auraOS_fileSystem');
                    console.log('DBManager: Cleaned up localStorage.auraOS_fileSystem.');
                }
                if (systemStateString) {
                    localStorage.removeItem('auraOS_systemState');
                    console.log('DBManager: Cleaned up localStorage.auraOS_systemState.');
                }
                resolve();
            } catch (error) {
                console.error('DBManager: Error during final settlement of migration promises:', error);
                reject(error);
            }
        });
    }

    getAllFiles() {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                console.error('DBManager: Database not initialized.');
                return reject('Database not initialized.');
            }
            const transaction = this.db.transaction(['files'], 'readonly');
            const store = transaction.objectStore('files');
            const request = store.getAll();

            request.onsuccess = (event) => {
                console.log('DBManager: getAllFiles successful.');
                resolve(event.target.result || []); // Ensure an array is returned
            };

            request.onerror = (event) => {
                console.error('DBManager: Error getting all files:', event.target.error);
                reject(event.target.error);
            };
        });
    }    getAllSettings() {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                console.error('DBManager: Database not initialized.');
                return reject('Database not initialized.');
            }
            const transaction = this.db.transaction(['settings'], 'readonly');
            const store = transaction.objectStore('settings');
            const request = store.getAll();

            request.onsuccess = (event) => {
                const settingsArray = event.target.result || [];
                const settingsObject = {};
                settingsArray.forEach(setting => {
                    settingsObject[setting.key] = setting.value;
                });
                console.log('DBManager: getAllSettings successful.');
                resolve(settingsObject);
            };

            request.onerror = (event) => {
                console.error('DBManager: Error getting all settings:', event.target.error);
                reject(event.target.error);
            };
        });
    }

    // Factory reset - clears all data from IndexedDB
    resetToFactory() {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                console.error('DBManager: Database not initialized.');
                return reject('Database not initialized.');
            }

            console.log('DBManager: Starting factory reset - clearing all data...');
            
            const transaction = this.db.transaction(['files', 'settings'], 'readwrite');
            const promises = [];

            // Clear files store
            const filesStore = transaction.objectStore('files');
            promises.push(new Promise((res, rej) => {
                const clearRequest = filesStore.clear();
                clearRequest.onsuccess = () => {
                    console.log('DBManager: Files store cleared.');
                    res();
                };
                clearRequest.onerror = (event) => {
                    console.error('DBManager: Error clearing files store:', event.target.error);
                    rej(event.target.error);
                };
            }));

            // Clear settings store
            const settingsStore = transaction.objectStore('settings');
            promises.push(new Promise((res, rej) => {
                const clearRequest = settingsStore.clear();
                clearRequest.onsuccess = () => {
                    console.log('DBManager: Settings store cleared.');
                    res();
                };
                clearRequest.onerror = (event) => {
                    console.error('DBManager: Error clearing settings store:', event.target.error);
                    rej(event.target.error);
                };
            }));

            Promise.all(promises)
                .then(() => {
                    console.log('DBManager: Factory reset completed successfully.');
                    resolve();
                })
                .catch((error) => {
                    console.error('DBManager: Error during factory reset:', error);
                    reject(error);
                });
        });
    }
}

// Create a global instance for immediate use
const dbManager = new DBManager();

// Make the dbManager instance globally accessible
window.dbManager = dbManager;

// Export an instance or the class depending on usage preference
// For now, let's export the class so it can be instantiated.
// If a singleton is preferred, instantiate here and export the instance.
// const dbManager = new DBManager();
// export default dbManager;

// For CommonJS environments if this runs in Node for some reason (though IndexedDB is browser-specific)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DBManager;
}
// For ES6 modules in the browser
// export default DBManager; // This line would be used if the environment supports ES6 modules natively or via a bundler.
console.log('DBManager.js loaded. Note: IndexedDB is a browser feature. Global instance available at window.dbManager');
