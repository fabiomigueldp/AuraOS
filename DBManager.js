class DBManager {
    constructor() {
        this.dbName = 'AURA_OS_DB';
        this.dbVersion = 1;
        this.db = null;
    }

    init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.dbVersion);

            request.onupgradeneeded = (event) => {
                this.db = event.target.result;
                console.log('Upgrading database...');
                // Create 'files' object store if it doesn't exist
                if (!this.db.objectStoreNames.contains('files')) {
                    this.db.createObjectStore('files', { keyPath: 'path' }); // Using 'path' as keyPath for files
                    console.log('Created "files" object store.');
                }
                // Create 'settings' object store if it doesn't exist
                if (!this.db.objectStoreNames.contains('settings')) {
                    this.db.createObjectStore('settings', { keyPath: 'key' });
                    console.log('Created "settings" object store.');
                }
                console.log('Database upgrade complete.');
            };

            request.onsuccess = (event) => {
                this.db = event.target.result;
                console.log('Database initialized successfully.');
                resolve(this.db);
            };

            request.onerror = (event) => {
                console.error('Error initializing database:', event.target.error);
                reject(event.target.error);
            };
        });
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
                // Ensure directoryPath ends with a '/' for proper prefix matching, unless it's the root ""
                const normalizedDirPath = directoryPath === "" || directoryPath.endsWith('/') ? directoryPath : directoryPath + '/';

                const filesInDir = allFiles.filter(file => {
                    if (normalizedDirPath === "") { // Root directory, list all files not in subdirectories
                        return !file.path.includes('/');
                    }
                    // Check if file.path starts with normalizedDirPath and is not in a deeper subdirectory
                    // e.g. for /apps/, /apps/app.js is a match, but /apps/utils/util.js is not (it is for /apps/utils/)
                    if (file.path.startsWith(normalizedDirPath)) {
                        const remainingPath = file.path.substring(normalizedDirPath.length);
                        return !remainingPath.includes('/'); // no more slashes means it's directly in this dir
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
    }

    getAllSettings() {
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
}

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
console.log('DBManager.js loaded. Note: IndexedDB is a browser feature.');
