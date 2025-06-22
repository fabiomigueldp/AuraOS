class AuraNotesApp {
    constructor(appId, windowEl, data = {}) {
        this.appId = appId;
        this.windowEl = windowEl;
        this.data = data;
        this.notesCache = []; // Initialize notes cache
        this.currentNotePath = null; // Initialize currentNotePath

        console.log(`AuraNotesApp constructor: ${appId}`, data);

        this.boundDestroy = this.destroy.bind(this);
        this.windowEl.addEventListener('aura:close', this.boundDestroy);

        // Bind file system change handler
        this.boundHandleFileSystemChange = this.handleFileSystemChange.bind(this);
        document.addEventListener('aura:filesystem:change', this.boundHandleFileSystemChange);

        this._initUI();
        // Call the async initialization logic
        this._initialize();
    }

    async _initialize() {
        try {
            await this._initEditor(); // Wait for editor to be ready
            await this._loadNotesList(); // Then load notes metadata

            // Check if a specific file path was provided to open
            if (this.data && this.data.filePath && this.data.filePath.endsWith('.txt')) {
                console.log(`AuraNotesApp: filePath provided: ${this.data.filePath}. Loading it.`);
                // Ensure this note exists in cache or can be loaded
                // _loadNoteIntoEditor will handle fetching if not in cache.
                await this._loadNoteIntoEditor(this.data.filePath);
            } else if (this.notesCache.length > 0) {
                // If no specific file, and notes exist, load the most recent (first in sorted cache)
                console.log("AuraNotesApp: No specific filePath, loading most recent note.");
                await this._loadNoteIntoEditor(this.notesCache[0].path);
            } else {
                // No notes exist, and no specific file to load
                console.log("AuraNotesApp: No specific filePath and no notes in cache. Editor will be empty.");
                if (this.editor) {
                    this.editor.setValue('Nenhuma anotação. Crie uma nova!');
                }
                this.currentNotePath = null;
            }
        } catch (error) {
            console.error("AuraNotesApp: Error during initialization:", error);
            const body = this.windowEl.querySelector('.window-body');
            if (body) {
                body.innerHTML = `<p style="color:red;padding:10px;">Error initializing Notes app: ${error.message}</p>`;
            }
        }
    }

    handleFileSystemChange(event) {
        console.log('AuraNotesApp: Received aura:filesystem:change event', event.detail);
        const { action, path, oldPath, type } = event.detail;
        let relevantChange = false;

        // Determine if the change is relevant to the Notes app's view
        // Typically, Notes app cares about changes in its designated notes directory (e.g., /Notes/)
        // or changes to the currently open file, regardless of its location.
        const notesAppDirectory = '/Notes/'; // Configurable or determined dynamically if needed

        if (path.startsWith(notesAppDirectory) || (oldPath && oldPath.startsWith(notesAppDirectory))) {
            relevantChange = true;
        } else if (this.currentNotePath && (path === this.currentNotePath || (oldPath && oldPath === this.currentNotePath))) {
            relevantChange = true;
        }

        if (relevantChange) {
            console.log('AuraNotesApp: Filesystem change is relevant. Refreshing notes list.');
            this._loadNotesList().then(async () => {
                // Special handling if the currently open note was deleted or renamed
                if (action === 'delete' && path === this.currentNotePath) {
                    console.log(`AuraNotesApp: Currently open note ${this.currentNotePath} was deleted.`);
                    this.currentNotePath = null; // Clear current path
                    // _loadNotesList will attempt to load the most recent or set empty state
                    // If _loadNotesList doesn't automatically select a new note, explicitly clear editor:
                    if (!this.currentNotePath && this.editor) { // Check if a new note was selected by _loadNotesList
                        this.editor.setValue('Anotação excluída. Selecione outra ou crie uma nova.');
                    }
                } else if (action === 'rename' && oldPath === this.currentNotePath) {
                    console.log(`AuraNotesApp: Currently open note ${oldPath} was renamed to ${path}.`);
                    this.currentNotePath = path; // Update to new path
                    // Content is still the same, editor doesn't need update unless title is derived from path.
                    // _loadNotesList will re-render sidebar with new name.
                    // Re-highlight in sidebar if necessary (though _loadNotesList should handle active states)
                    const activeListItem = this.notesListDiv.querySelector(`.note-item[data-note-path="${CSS.escape(path)}"]`);
                    if (activeListItem) {
                        this.notesListDiv.querySelectorAll('.note-item.active').forEach(item => item.classList.remove('active'));
                        activeListItem.classList.add('active');
                    }
                }
                // If a new file was created and it's now the most recent, _loadNotesList might select it.
            }).catch(error => {
                console.error("AuraNotesApp: Error refreshing notes list after filesystem change:", error);
            });
        }
    }


    async _loadNoteIntoEditor(filePath) {
        if (!this.editor) {
            console.error('AuraNotesApp: Editor not initialized.');
            return;
        }
        if (!filePath) {
            console.warn('AuraNotesApp: loadNoteIntoEditor called with no filePath.');
            this.editor.setValue('');
            this.currentNotePath = null;
            if (this.notesListDiv) {
                this.notesListDiv.querySelectorAll('.note-item.active').forEach(item => item.classList.remove('active'));
            }
            return;
        }

        console.log(`AuraNotesApp: Attempting to load note ${filePath} into editor.`);
        const noteInCache = this.notesCache.find(n => n.path === filePath);

        // Update active highlight in sidebar
        if (this.notesListDiv) {
            this.notesListDiv.querySelectorAll('.note-item.active').forEach(item => item.classList.remove('active'));
            if (filePath) { // Only add active class if a filePath is provided
                const activeListItem = this.notesListDiv.querySelector(`.note-item[data-note-path="${CSS.escape(filePath)}"]`);
                if (activeListItem) {
                    activeListItem.classList.add('active');
                }
            }
        }

        if (noteInCache && noteInCache.content === null) {
            console.log(`AuraNotesApp: Content for ${filePath} not in cache. Fetching from DB.`);
            this.editor.setValue('// Carregando...'); // Temporary loading message
            try {
                const noteFileObject = await dbManager.loadFile(filePath);
                // dbManager.saveFile stores content in 'data' field, not 'content'
                const content = noteFileObject?.data || noteFileObject?.content;
                if (noteFileObject && typeof content === 'string') {
                    noteInCache.content = content; // Cache the loaded content
                    this.editor.setValue(content);
                    this.currentNotePath = filePath;
                    this.editor.focus();
                    console.log(`AuraNotesApp: Successfully loaded and cached content for ${filePath}.`);
                } else {
                    // This case should ideally not be reached if dbManager.loadFile throws an error for missing files/content
                    console.error(`AuraNotesApp: Fetched object for ${filePath} is invalid or content missing.`, noteFileObject);
                    this.editor.setValue(`// Erro: Não foi possível carregar o conteúdo da anotação ${filePath}.`);
                    AuraOS.showNotification({ title: 'Erro ao Carregar', message: `Conteúdo inválido para ${filePath}.`, type: 'error' });
                    // noteInCache.content remains null, so next attempt will retry loading
                    this.currentNotePath = filePath; // Keep path, but content is missing
                }
            } catch (error) {
                console.error(`AuraNotesApp: Error loading note ${filePath} from DB:`, error);
                this.editor.setValue(`// Erro ao carregar anotação: ${error.message}`);
                AuraOS.showNotification({ title: 'Erro ao Carregar Anotação', message: error.message, type: 'error' });
                // noteInCache.content remains null, ensuring a retry is possible
                this.currentNotePath = filePath; // Keep path to indicate which note failed
            }
        } else if (noteInCache && typeof noteInCache.content === 'string') {
            console.log(`AuraNotesApp: Content for ${filePath} already in cache.`);
            this.editor.setValue(noteInCache.content);
            this.currentNotePath = filePath;
            this.editor.focus();
        } else {
            // filePath is null, or noteInCache is not found (e.g., after a failed deletion or inconsistent state)
            console.warn(`AuraNotesApp: filePath is null or note not found in cache for path: ${filePath}. Clearing editor.`);
            this.editor.setValue('// Selecione uma anotação ou crie uma nova.');
            this.currentNotePath = null;
            // Active highlight already cleared if filePath is null, or handled by general logic if filePath was for a non-existent note
        }
    }

    async _deleteNote(filePath) {
        if (!filePath) return;

        const noteToDelete = this.notesCache.find(n => n.path === filePath);
        const noteTitle = noteToDelete ? (noteToDelete.title || filePath.split('/').pop().replace('.txt','')) : filePath.split('/').pop().replace('.txt','');

        // Use global AuraOS.dialog.confirm
        AuraOS.dialog.confirm(
            `Tem certeza que deseja excluir "${noteTitle}"? Esta ação não pode ser desfeita.`,
            async () => { // onConfirm
                try {
                    const success = await window.deleteItem(filePath); // Use global deleteItem
                    if (success) {
                        console.log(`AuraNotesApp: Note ${filePath} deletion initiated via global deleteItem.`);
                        // Notification is handled by deleteItem if successful.
                        // The file system event 'aura:filesystem:change' will trigger _loadNotesList
                        // and handle UI updates, including clearing editor if current note was deleted.
                    } else {
                        // deleteItem handles its own error notifications.
                        console.error(`AuraNotesApp: Failed to delete note ${filePath} via global deleteItem.`);
                    }
                } catch (error) {
                    console.error(`AuraNotesApp: Error calling global deleteItem for ${filePath}:`, error);
                    AuraOS.showNotification({ title: 'Erro ao Excluir', message: `Não foi possível excluir "${noteTitle}". Detalhes: ${error.message}`, type: 'error' });
                }
            }
            // No onCancel needed for AuraOS.dialog.confirm if default behavior is just to close.
        );
    }

    async _autoSaveNote() {
        if (!this.currentNotePath || !this.editor) {
            return;
        }
        const newContent = this.editor.getValue();
        const noteInCache = this.notesCache.find(n => n.path === this.currentNotePath);

        // Ensure content is actually loaded before trying to compare or save
        if (!noteInCache || noteInCache.content === null) {
            // This might happen if autosave triggers for a note whose content hasn't been fully loaded into cache yet.
            // Or if currentNotePath is somehow invalid after a deletion/error.
            console.warn(`AuraNotesApp: Auto-save skipped for ${this.currentNotePath}, content not loaded in cache or note not found.`);
            return;
        }

        const oldContent = noteInCache.content;
        if (newContent === oldContent) {
            return;
        }

        const newLastModified = Date.now();
        try {
            await dbManager.saveFile({
                path: this.currentNotePath,
                type: 'file', // Ensure type is always passed
                lastModified: newLastModified
            }, newContent);

            console.log(`AuraNotesApp: Note ${this.currentNotePath} auto-saved to DB.`);
            // Update cache
            noteInCache.content = newContent;
            noteInCache.lastModified = newLastModified;
            // noteInCache.title (which is derived from filename) does not change during auto-save.
            // The display title in _renderFilteredNotes will use the new noteInCache.content's first line.

            // Sort cache and re-render the entire list
            this.notesCache.sort((a, b) => b.lastModified - a.lastModified);
            this._renderFilteredNotes(this.notesCache); // This re-renders list and applies active class

        } catch (error) {
            console.error(`AuraNotesApp: Error auto-saving note ${this.currentNotePath}:`, error);
            AuraOS.showNotification({ title: 'Erro ao Salvar Automaticamente', message: `Falha ao salvar "${noteInCache.title || this.currentNotePath}".`, type: 'error' });
        }
    }

    async _handleNewNote() {
        console.log('AuraNotesApp: Handling new note creation.');
        await this._ensureNotesDirectory();

        let newNoteName = 'Nova Anotação.txt';
        let counter = 0; // Start counter at 0 for "Nova Anotação.txt" first
        const baseName = 'Nova Anotação';
        let newFilePath;
        let fileExists = true; // Assume file exists to enter loop

        try {
            while (fileExists) {
                if (counter === 0) {
                    newNoteName = `${baseName}.txt`;
                } else {
                    newNoteName = `${baseName} (${counter}).txt`;
                }
                newFilePath = `/Notes/${newNoteName}`; // Ensure leading slash for absolute path

                // Check if file exists
                let existingFile = null;
                try {
                    existingFile = await dbManager.loadFile(newFilePath);
                } catch (loadError) {
                    // dbManager.loadFile might throw if not found, which is desired for this check
                    existingFile = null;
                }

                if (existingFile) {
                    console.log(`AuraNotesApp: File ${newFilePath} exists, trying next name.`);
                    counter++;
                    fileExists = true;
                } else {
                    // File does not exist, this name is unique
                    fileExists = false;
                }

                if (counter > 100) { // Safety break for extreme cases
                    AuraOS.showNotification({ title: 'Error Creating Note', message: 'Too many notes with similar names. Please try a different name or clean up existing notes.', type: 'error'});
                    console.error('AuraNotesApp: Exceeded max attempts to find unique note name.');
                    return; // Exit if too many attempts
                }
            }

            const initialContent = `# ${newNoteName.replace('.txt', '')}\n\n`;
            // Use global createItem
            const success = await window.createItem(newFilePath, 'file', initialContent);

            if (success) {
                console.log(`AuraNotesApp: New note ${newFilePath} creation initiated via global createItem.`);
                // Notification is handled by createItem.
                // The filesystem event will trigger _loadNotesList, which will update the sidebar.
                // We then explicitly load the new note into the editor.
                await this._loadNotesList(); // Ensure cache is updated before loading
                await this._loadNoteIntoEditor(newFilePath);
                if (this.editor) {
                    this.editor.focus();
                }
            } else {
                // createItem handles its own error notifications.
                console.error(`AuraNotesApp: Failed to create new note ${newFilePath} via global createItem.`);
            }
        } catch (error) {
            console.error('AuraNotesApp: Error in new note creation process:', error);
            AuraOS.showNotification({ title: 'Erro ao Criar Nota', message: `Ocorreu um erro inesperado: ${error.message}`, type: 'error' });
        }
    }

    async _ensureNotesDirectory() {
        const notesDirPath = '/Notes/';
        try {
            const notesDirObject = await dbManager.loadFile(notesDirPath);
            if (notesDirObject && notesDirObject.type === 'folder') {
                console.log('AuraNotesApp: /Notes/ directory exists.');
            } else if (notesDirObject && notesDirObject.type !== 'folder') {
                console.error('AuraNotesApp: A file exists at /Notes/ path, cannot create directory.');
                AuraOS.showNotification({ title: 'Notes App Error', message: 'File system conflict at /Notes/.', type: 'error' });
                throw new Error('File system conflict at /Notes/.');
            } else {
                console.log('AuraNotesApp: /Notes/ directory not found (or not a folder). Attempting to create it.');
                await dbManager.saveFile({
                    path: notesDirPath,
                    type: 'folder',
                    lastModified: Date.now()
                }, null);
                console.log('AuraNotesApp: /Notes/ directory marker created successfully.');
                if (window.fileSystem && window.fileSystem['/'] && !window.fileSystem['/'].children['Notes']) {
                    window.fileSystem['/'].children['Notes'] = { type: 'folder', children: {}, lastModified: Date.now() };
                }
            }
        } catch (error) {
            let dirExists = false;
            try {
                const notesDirObjectCheck = await dbManager.loadFile(notesDirPath);
                if (notesDirObjectCheck && notesDirObjectCheck.type === 'folder') {
                    dirExists = true;
                } else if (notesDirObjectCheck) {
                     console.error('AuraNotesApp: Path /Notes/ exists but is not a folder (checked in catch).');
                     AuraOS.showNotification({ title: 'Notes App Error', message: 'File system conflict for /Notes/.', type: 'error' });
                     throw new Error('Path /Notes/ exists but is not a folder.');
                }
            } catch (nestedLoadError) {
                 console.log('AuraNotesApp: /Notes/ directory confirmed not to exist (load error in catch).');
            }

            if (!dirExists) {
                try {
                    console.log('AuraNotesApp: Creating /Notes/ directory marker (in catch).');
                    await dbManager.saveFile({
                        path: notesDirPath,
                        type: 'folder',
                        lastModified: Date.now()
                    }, null);
                    console.log('AuraNotesApp: /Notes/ directory marker created successfully (in catch).');
                    if (window.fileSystem && window.fileSystem['/'] && !window.fileSystem['/'].children['Notes']) {
                         window.fileSystem['/'].children['Notes'] = { type: 'folder', children: {}, lastModified: Date.now() };
                    }
                } catch (createError) {
                    console.error('AuraNotesApp: Failed to create /Notes/ directory marker (in catch):', createError);
                    AuraOS.showNotification({ title: 'Notes App Error', message: 'Failed to create /Notes/ directory.', type: 'error' });
                    throw createError;
                }
            } else if (error && dirExists) {
                 console.error('AuraNotesApp: Error ensuring /Notes/ directory (exists but other error occurred):', error);
                 AuraOS.showNotification({ title: 'Notes App Error', message: 'Error with /Notes/ directory.', type: 'error' });
                 throw error;
            }
        }
    }

    async _loadNotesList() {
        if (!this.notesListDiv) {
            console.error('AuraNotesApp: notesListDiv is not defined.');
            return;
        }
        this.notesListDiv.innerHTML = '<p style="text-align:center; color:var(--subtle-text-color); padding-top:20px;">Carregando anotações...</p>';
        try {
            await this._ensureNotesDirectory();
            const files = await dbManager.listFiles('/Notes/'); // Renamed to files for clarity
            this.notesCache = []; // Clear existing cache

            for (const fileInfo of files) {
                if (fileInfo.path.endsWith('.txt') && fileInfo.type === 'file') {
                    // Extract title from path: "/Notes/My Note.txt" -> "My Note"
                    const title = fileInfo.path.split('/').pop().replace('.txt', '');

                    this.notesCache.push({
                        id: fileInfo.path, // Use path as ID
                        path: fileInfo.path,
                        content: null, // Content is not loaded yet
                        lastModified: fileInfo.lastModified || Date.now(), // Ensure lastModified is present
                        title: title // Store the extracted title
                    });
                }
            }

            this.notesCache.sort((a, b) => b.lastModified - a.lastModified);
            this._renderFilteredNotes(this.notesCache); // Render with metadata-only notes

            let noteToSelect = null;
            if (this.currentNotePath && this.notesCache.find(n => n.path === this.currentNotePath)) {
                noteToSelect = this.currentNotePath;
            } else if (this.notesCache.length > 0) {
                noteToSelect = this.notesCache[0].path;
            }
            if (noteToSelect) {
                await this._loadNoteIntoEditor(noteToSelect);
            } else {
                if (this.editor) this.editor.setValue('Nenhuma anotação. Crie uma nova!');
                this.currentNotePath = null;
                if (this.notesListDiv) {
                    const activeItem = this.notesListDiv.querySelector('.note-item.active');
                    if (activeItem) activeItem.classList.remove('active');
                }
            }
        } catch (error) {
            console.error('AuraNotesApp: Error loading notes list:', error);
            this.notesListDiv.innerHTML = '<p style="color:red;text-align:center;padding-top:20px;">Erro ao carregar anotações.</p>';
        }
    }

    _renderFilteredNotes(notesToRender) {
        if (!this.notesListDiv) return;
        this.notesListDiv.innerHTML = '';
        if (notesToRender.length === 0) {
            const query = this.searchInput.value.trim();
            if (query) {
                this.notesListDiv.innerHTML = `<p style="text-align:center; color:var(--subtle-text-color); padding-top:20px;">Nenhum resultado para "${query}".</p>`;
            } else {
                this.notesListDiv.innerHTML = '<p style="text-align:center; color:var(--subtle-text-color); padding-top:20px;">Nenhuma anotação encontrada.</p>';
            }
            return;
        }
        notesToRender.forEach(note => {
            const listItem = document.createElement('div');
            listItem.className = 'note-item';
            listItem.dataset.notePath = note.path;
            if (note.path === this.currentNotePath) {
                listItem.classList.add('active');
            }
            // Use note.title (extracted from path)
            const title = note.title || 'Sem Título';
            // Display placeholder if content is not loaded
            const preview = note.content === null ? "Selecione para carregar o conteúdo..." : (note.content.split('\n').slice(1).join(' ') || 'Sem conteúdo adicional').substring(0, 100) + '...';
            const timestamp = new Date(note.lastModified).toLocaleString('pt-BR', {
                day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
            });
            listItem.innerHTML = `
                <div class="note-title" style="font-weight: 600; font-size: 14px; color: var(--text-color); margin-bottom: 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${title}</div>
                <div class="note-timestamp" style="font-size: 11px; color: var(--subtle-text-color); opacity: 0.8; margin-bottom: 4px;">${timestamp}</div>
                <div class="note-preview" style="font-size: 12px; color: var(--subtle-text-color); opacity: 0.7; line-height: 1.4; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; text-overflow: ellipsis;">${preview}</div>
            `;
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'delete-note-btn aura-icon-button';
            deleteBtn.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zm2.46-7.12l1.41-1.41L12 12.59l2.12-2.12 1.41 1.41L13.41 14l2.12 2.12-1.41 1.41L12 15.41l-2.12 2.12-1.41-1.41L10.59 14l-2.13-2.12zM15.5 4l-1-1h-5l-1 1H5v2h14V4z"></path></svg>';
            deleteBtn.title = 'Excluir anotação';
            deleteBtn.style.position = 'absolute';
            deleteBtn.style.top = '8px';
            deleteBtn.style.right = '8px';
            deleteBtn.style.opacity = '0.7'; // Default state

            deleteBtn.onmouseover = () => {
                deleteBtn.style.opacity = '1';
                // deleteBtn.style.color = 'var(--aura-danger-color, red)'; // Optional: if color change is desired
            };
            deleteBtn.onmouseout = () => {
                deleteBtn.style.opacity = '0.7';
                // deleteBtn.style.color = 'currentColor'; // Optional: revert color
                deleteBtn.style.transform = 'scale(1)'; // Ensure transform is reset if mouse leaves while pressed
            };
            deleteBtn.onmousedown = () => {
                deleteBtn.style.transform = 'scale(0.9)';
            };
            deleteBtn.onmouseup = () => {
                deleteBtn.style.transform = 'scale(1)';
            };

            deleteBtn.onclick = (e) => {
                e.stopPropagation();
                this._deleteNote(note.path);
            };
            listItem.appendChild(deleteBtn);
            listItem.addEventListener('click', () => {
                this._loadNoteIntoEditor(note.path);
            });
            this.notesListDiv.appendChild(listItem);
        });
    }

    _handleSearch() {
        if (!this.searchInput || !this.notesListDiv) return;
        const query = this.searchInput.value.toLowerCase().trim();
        if (!query) {
            this.notesCache.sort((a, b) => b.lastModified - a.lastModified);
            this._renderFilteredNotes(this.notesCache);
            return;
        }
        const filteredNotes = this.notesCache.filter(note => {
            const titleMatch = note.title.toLowerCase().includes(query);
            const contentMatch = (note.content && typeof note.content === 'string') ? note.content.toLowerCase().includes(query) : false;
            return titleMatch || contentMatch;
        });
        // Sort filtered notes by lastModified, keeping consistency with other views
        filteredNotes.sort((a, b) => b.lastModified - a.lastModified);
        this._renderFilteredNotes(filteredNotes);
    }

    _initEditor() {
        return new Promise((resolve, reject) => {
            if (!this.editorContainerDiv) {
                console.error('AuraNotesApp: editorContainerDiv is not defined. UI not initialized properly?');
                this.windowEl.querySelector('.window-body').innerHTML = '<p style="color:red;padding:10px;">Error: Editor container missing.</p>';
                return reject(new Error('Editor container missing.'));
            }
            this.editorContainerDiv.innerHTML = ''; // Clear placeholder

            if (typeof require === 'undefined') { // Check if loader has defined require
                console.error('AuraNotesApp: Monaco Editor loader (require) is not available. Ensure loader.js is loaded globally and before notes.js.');
                this.editorContainerDiv.innerHTML = '<p style="color:red;padding:10px;">Error: Monaco Editor loader `require` not found. Check console.</p>';
                return reject(new Error('Monaco Editor loader `require` not found.'));
            }

            require.config({
                paths: { 'vs': 'https://cdn.jsdelivr.net/npm/monaco-editor@0.44.0/min/vs' }
            });

            require(['vs/editor/editor.main'], () => {
                if (typeof monaco === 'undefined') { // Check if monaco global is available after editor.main
                    console.error('AuraNotesApp: Monaco global object not available after loading editor.main. Check CDN integrity or script loading order.');
                    this.editorContainerDiv.innerHTML = '<p style="color:red;padding:10px;">Error: Monaco global object not found. Check console.</p>';
                    return reject(new Error('Monaco global object not found.'));
                }

                const isDarkTheme = document.documentElement.classList.contains('dark-theme');
            const editorTheme = isDarkTheme ? 'vs-dark' : 'vs';

            this.editor = monaco.editor.create(this.editorContainerDiv, {
                value: '// Bem-vindo ao AuraNotes!\n// Selecione uma anotação ou crie uma nova.',
                language: 'plaintext',
                theme: editorTheme,
                automaticLayout: true,
                wordWrap: 'on',
                minimap: { enabled: false },
                scrollbar: {
                    verticalScrollbarSize: 10,
                    horizontalScrollbarSize: 10,
                    useShadows: false
                },
                padding: { top: 15, bottom: 15 },
                lineNumbers: 'off',
                renderLineHighlight: 'gutter',
                fontSize: 14,
                fontFamily: 'var(--system-font, "Inter", sans-serif)',
            });

            console.log('AuraNotesApp: Monaco Editor initialized with theme:', editorTheme);

            this.editor.onDidChangeModelContent(() => {
                if (this._autoSaveNote) {
                    this._debouncedAutoSave();
                }
            });

            let autoSaveTimeout;
            this._debouncedAutoSave = () => {
                clearTimeout(autoSaveTimeout);
                autoSaveTimeout = setTimeout(() => {
                    if (this._autoSaveNote) {
                        this._autoSaveNote();
                    }
                }, 1500);
            };

            this.themeObserver = new MutationObserver((mutationsList) => {
                for (const mutation of mutationsList) {
                    if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                        const isNowDarkTheme = document.documentElement.classList.contains('dark-theme');
                        const newEditorTheme = isNowDarkTheme ? 'vs-dark' : 'vs';
                        if (this.editor && typeof monaco !== 'undefined' && monaco.editor) {
                            monaco.editor.setTheme(newEditorTheme);
                            console.log('AuraNotesApp: Monaco Editor theme updated to', newEditorTheme);
                        }
                    }
                }
            });
            this.themeObserver.observe(document.documentElement, { attributes: true });

            if (this.editor) {
                console.log('AuraNotesApp: Monaco Editor initialized.');
                resolve(); // Resolve the promise when editor is ready
            } else {
                console.error('AuraNotesApp: Editor creation failed.');
                reject(new Error('Monaco Editor creation failed.'));
            }
        });
    });
    }

    _initUI() {
        const body = this.windowEl.querySelector('.window-body');
        if (!body) {
            console.error('AuraNotesApp: window-body not found in windowEl.');
            return;
        }
        body.innerHTML = '';
        body.style.display = 'flex';
        body.style.padding = '0';

        const sidebar = document.createElement('div');
        sidebar.className = 'notes-sidebar';
        sidebar.style.width = 'var(--notes-sidebar-width, 240px)';
        sidebar.style.height = '100%';
        sidebar.style.display = 'flex';
        sidebar.style.flexDirection = 'column';
        sidebar.style.backgroundColor = 'var(--glass-background)';
        sidebar.style.borderRight = '1px solid var(--glass-border)';
        sidebar.style.backdropFilter = 'blur(20px) saturate(1.8)';
        sidebar.style.webkitBackdropFilter = 'blur(20px) saturate(1.8)';

        const sidebarHeader = document.createElement('div');
        sidebarHeader.className = 'sidebar-header';
        sidebarHeader.style.padding = '16px 16px 12px 16px';
        sidebarHeader.style.borderBottom = '1px solid var(--glass-border)';
        sidebarHeader.style.flexShrink = '0';

        this.newNoteBtn = document.createElement('button');
        this.newNoteBtn.className = 'new-note-btn';
        this.newNoteBtn.innerHTML = `
            <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" style="margin-right: 8px; opacity: 0.8;">
                <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"></path>
            </svg>
            Nova Anotação
        `;
        this.newNoteBtn.style.display = 'flex';
        this.newNoteBtn.style.alignItems = 'center';
        this.newNoteBtn.style.justifyContent = 'flex-start';
        this.newNoteBtn.style.width = '100%';
        this.newNoteBtn.style.padding = '8px 12px';
        this.newNoteBtn.style.background = 'rgba(var(--highlight-primary-rgb, 138, 99, 210), 0.1)';
        this.newNoteBtn.style.border = '1px solid rgba(var(--highlight-primary-rgb, 138, 99, 210), 0.3)';
        this.newNoteBtn.style.borderRadius = 'var(--ui-corner-radius-small, 8px)';
        this.newNoteBtn.style.fontSize = '13px';
        this.newNoteBtn.style.fontWeight = '500';
        this.newNoteBtn.style.color = 'var(--highlight-primary)';
        this.newNoteBtn.style.cursor = 'pointer';
        this.newNoteBtn.style.transition = 'all 0.2s ease';
        this.newNoteBtn.onmouseover = () => {
            this.newNoteBtn.style.background = 'rgba(var(--highlight-primary-rgb, 138, 99, 210), 0.2)';
            this.newNoteBtn.style.borderColor = 'rgba(var(--highlight-primary-rgb, 138, 99, 210), 0.5)';
        };
        this.newNoteBtn.onmouseout = () => {
            this.newNoteBtn.style.background = 'rgba(var(--highlight-primary-rgb, 138, 99, 210), 0.1)';
            this.newNoteBtn.style.borderColor = 'rgba(var(--highlight-primary-rgb, 138, 99, 210), 0.3)';
        };
        this.newNoteBtn.addEventListener('click', () => this._handleNewNote());
        sidebarHeader.appendChild(this.newNoteBtn);

        this.searchInput = document.createElement('input');
        this.searchInput.type = 'text';
        this.searchInput.className = 'notes-search-input';
        this.searchInput.placeholder = 'Buscar anotações...';
        this.searchInput.style.width = 'calc(100% - 0px)';
        this.searchInput.style.marginTop = '12px';
        this.searchInput.style.padding = '8px 10px';
        this.searchInput.style.borderRadius = 'var(--ui-corner-radius-small, 6px)';
        this.searchInput.style.border = '1px solid var(--glass-border)';
        this.searchInput.style.backgroundColor = 'rgba(var(--background-color-rgb, 28, 25, 45), 0.5)';
        this.searchInput.style.color = 'var(--text-color)';
        this.searchInput.style.fontSize = '13px';
        this.searchInput.addEventListener('input', () => this._handleSearch());
        sidebarHeader.appendChild(this.searchInput);

        this.notesListDiv = document.createElement('div');
        this.notesListDiv.className = 'notes-list';
        this.notesListDiv.style.flexGrow = '1';
        this.notesListDiv.style.overflowY = 'auto';
        this.notesListDiv.style.padding = '8px 12px';
        this.notesListDiv.innerHTML = '<p style="text-align:center; color:var(--subtle-text-color); padding-top:20px;">Carregando anotações...</p>';

        sidebar.appendChild(sidebarHeader);
        sidebar.appendChild(this.notesListDiv);

        const editorArea = document.createElement('div');
        editorArea.className = 'notes-editor-area';
        editorArea.style.flexGrow = '1';
        editorArea.style.display = 'flex';
        editorArea.style.flexDirection = 'column';
        editorArea.style.height = '100%';
        editorArea.style.position = 'relative';
        editorArea.style.backgroundColor = 'var(--background-color)';

        const editorHeader = document.createElement('div');
        editorHeader.className = 'editor-header';
        editorHeader.style.padding = '12px 20px';
        editorHeader.style.borderBottom = '1px solid var(--glass-border)';
        editorHeader.style.flexShrink = '0';
        editorArea.appendChild(editorHeader);

        this.editorContainerDiv = document.createElement('div');
        this.editorContainerDiv.className = 'monaco-editor-container';
        this.editorContainerDiv.style.flexGrow = '1';
        this.editorContainerDiv.style.height = 'calc(100% - 45px)';
        this.editorContainerDiv.style.position = 'relative';
        editorArea.appendChild(this.editorContainerDiv);

        this.editorContainerDiv.innerHTML = '<p style="text-align:center; color:var(--subtle-text-color); padding-top:50px;">Editor será carregado aqui.</p>';

        body.appendChild(sidebar);
        body.appendChild(editorArea);

        console.log('AuraNotesApp: UI constructed.');

        this.sidebar = sidebar;
        this.editorArea = editorArea;
    }

    destroy() {
        console.log(`AuraNotesApp destroy: ${this.appId}`);
        this.windowEl.removeEventListener('aura:close', this.boundDestroy);

        if (this.editor) {
            this.editor.dispose();
            console.log(`AuraNotesApp: Monaco editor for ${this.appId} disposed.`);
        }

        if (this.themeObserver) {
            this.themeObserver.disconnect();
            console.log(`AuraNotesApp: Theme observer for ${this.appId} disconnected.`);
        }

        const body = this.windowEl.querySelector('.window-body');
        if (body) {
            body.innerHTML = '';
        }

        console.log(`AuraNotesApp ${this.appId} destroyed.`);
    }
}
