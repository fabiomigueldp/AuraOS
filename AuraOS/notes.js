class AuraNotesApp {
    constructor(appId, windowEl, data = {}) {
        this.appId = appId;
        this.windowEl = windowEl;
        this.data = data;
        this.notesCache = []; // Initialize notes cache
        this.currentNotePath = null; // Initialize currentNotePath
        this.NOTES_DIR = (typeof AuraOS !== 'undefined' && AuraOS.paths && AuraOS.paths.NOTES) ? AuraOS.paths.NOTES : '/Notes';


        console.log(`AuraNotesApp constructor: ${appId}`, data);

        this.boundDestroy = this.destroy.bind(this);
        this.windowEl.addEventListener('aura:close', this.boundDestroy);

        this._initUI();
        // Call the async initialization logic
        this._initialize();
    }

    async _initialize() {
        try {
            await this._ensureNotesDirectory(); // Ensure the notes directory exists before anything else
            await this._initEditor(); // Wait for editor to be ready
            await this._loadNotesList(); // Then load notes metadata

            if (this.data && this.data.filePath && this.data.filePath.startsWith(this.NOTES_DIR + '/')) {
                console.log(`AuraNotesApp: filePath provided: ${this.data.filePath}. Loading it.`);
                await this._loadNoteIntoEditor(this.data.filePath);
            } else if (this.data && this.data.filePath) {
                console.warn(`AuraNotesApp: filePath ${this.data.filePath} is outside the notes directory ${this.NOTES_DIR}. Ignoring.`);
                // Potentially load default note or empty state
                 if (this.notesCache.length > 0) {
                    await this._loadNoteIntoEditor(this.notesCache[0].path);
                } else {
                    this._loadNoteIntoEditor(null);
                }
            }
             else {
                console.log("AuraNotesApp: No specific filePath provided, relying on _loadNotesList's default selection or empty state.");
                 // _loadNotesList already handles selecting the first note or empty state
            }
        } catch (error) {
            console.error("AuraNotesApp: Error during initialization:", error);
            const body = this.windowEl.querySelector('.window-body');
            if (body) {
                body.innerHTML = `<p style="color:red;padding:10px;">Error initializing Notes app: ${error.message}</p>`;
            }
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
                    if (noteInCache) noteInCache.content = `// Error: Invalid content from DB for ${filePath}`; else console.warn("Note not in cache during load error handling");
                    this.currentNotePath = filePath;
                }
            } catch (error) {
                console.error(`AuraNotesApp: Error loading note ${filePath} from DB:`, error);
                this.editor.setValue(`// Erro ao carregar anotação: ${error.message}`);
                AuraOS.showNotification({ title: 'Erro ao Carregar Anotação', message: error.message, type: 'error' });
                if (noteInCache) noteInCache.content = `// Error: DB load failed for ${filePath}. ${error.message}`; else console.warn("Note not in cache during load error handling");
                this.currentNotePath = filePath;
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
        // Use cached title (filename based) or derive from path for the confirmation dialog and notifications.
        const noteTitle = noteToDelete ? (noteToDelete.title || filePath.split('/').pop().replace('.txt','')) : filePath.split('/').pop().replace('.txt','');

        AuraOS.dialog.confirm(
            `Tem certeza que deseja excluir "${noteTitle}"? Esta ação não pode ser desfeita.`,
            async () => {
                try {
                    await dbManager.deleteFile(filePath);
                    console.log(`AuraNotesApp: Note ${filePath} deleted from DB.`);
                    AuraOS.showNotification({ title: 'Anotação Excluída', message: `"${noteTitle}" foi excluída.`, type: 'info' });

                    if (this.currentNotePath === filePath) {
                        this.currentNotePath = null; // Signal to _loadNotesList to select a new default
                        if (this.editor) {
                            // Clear editor immediately, _loadNotesList will load new content if a note is selected
                            this.editor.setValue('');
                        }
                    }

                    // Reloads cache from DB (which will exclude the deleted note),
                    // re-renders the list, and handles selection logic
                    // (e.g. selects most recent if currentNotePath is null and notes exist,
                    // or sets empty state if no notes are left).
                    await this._loadNotesList();

                } catch (error) {
                    console.error(`AuraNotesApp: Error deleting note ${filePath}:`, error);
                    AuraOS.showNotification({ title: 'Erro ao Excluir', message: `Não foi possível excluir "${noteTitle}". Detalhes: ${error.message}`, type: 'error' });
                }
            }
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
        // _ensureNotesDirectory is called in _initialize, so it should exist.

        let newNoteName = 'Nova Anotação.txt';
        let counter = 0;
        const baseName = 'Nova Anotação';
        let newFilePath;
        let fileExists = true;

        try {
            while (fileExists) {
                if (counter === 0) {
                    newNoteName = `${baseName}.txt`;
                } else {
                    newNoteName = `${baseName} (${counter}).txt`;
                }
                newFilePath = `${this.NOTES_DIR}/${newNoteName}`;

                let existingFile = null;
                try {
                    existingFile = await dbManager.loadFile(newFilePath);
                } catch (loadError) {
                    existingFile = null;
                }

                if (existingFile) {
                    console.log(`AuraNotesApp: File ${newFilePath} exists, trying next name.`);
                    counter++;
                    fileExists = true;
                } else {
                    fileExists = false;
                }

                if (counter > 100) {
                    AuraOS.showNotification({ title: 'Error Creating Note', message: 'Too many notes with similar names.', type: 'error'});
                    console.error('AuraNotesApp: Exceeded max attempts to find unique note name.');
                    return;
                }
            }

            const initialContent = `# ${newNoteName.replace('.txt', '')}\n\n`;
            const newFileMeta = {
                path: newFilePath,
                type: 'file',
                lastModified: Date.now()
            };

            await dbManager.saveFile(newFileMeta, initialContent);
            console.log(`AuraNotesApp: New note created at ${newFilePath}`);
            AuraOS.showNotification({ title: 'Anotação Criada', message: `"${newNoteName.replace('.txt', '')}" foi criada.`, type: 'success' });

            await this._loadNotesList();
            await this._loadNoteIntoEditor(newFilePath);

            if (this.editor) {
                this.editor.focus();
            }

        } catch (error) {
            console.error('AuraNotesApp: Error creating new note:', error);
            AuraOS.showNotification({ title: 'Erro ao Criar Nota', message: `Ocorreu um erro: ${error.message}`, type: 'error' });
        }
    }

    async _ensureNotesDirectory() {
        try {
            const notesDirObject = await dbManager.loadFile(this.NOTES_DIR);
            if (notesDirObject && notesDirObject.type === 'folder') {
                console.log(`AuraNotesApp: ${this.NOTES_DIR} directory exists.`);
            } else if (notesDirObject && notesDirObject.type !== 'folder') {
                console.error(`AuraNotesApp: A file exists at ${this.NOTES_DIR} path, cannot create directory.`);
                AuraOS.showNotification({ title: 'Notes App Error', message: `File system conflict at ${this.NOTES_DIR}.`, type: 'error' });
                throw new Error(`File system conflict at ${this.NOTES_DIR}.`);
            }
            // If loadFile throws (directory doesn't exist), the catch block will handle creation.
        } catch (error) { // Catches if loadFile fails (e.g. dir not found)
            console.log(`AuraNotesApp: ${this.NOTES_DIR} directory not found or error accessing. Attempting to create it.`);
            try {
                await dbManager.saveFile({
                    path: this.NOTES_DIR,
                    type: 'folder',
                    name: this.NOTES_DIR.split('/').pop() || 'Notes', // Extract name
                    lastModified: Date.now()
                }, {}); // Content for folder is empty or null data
                console.log(`AuraNotesApp: ${this.NOTES_DIR} directory created successfully.`);
                // Update in-memory representation if necessary (depends on global FS management)
                if (window.fileSystem && window.fileSystem['/'] && !window.fileSystem['/'].children[this.NOTES_DIR.substring(1)]) {
                     window.fileSystem['/'].children[this.NOTES_DIR.substring(1)] = { type: 'folder', children: {}, lastModified: Date.now() };
                }
            } catch (createError) {
                console.error(`AuraNotesApp: Failed to create ${this.NOTES_DIR} directory:`, createError);
                AuraOS.showNotification({ title: 'Notes App Error', message: `Failed to create ${this.NOTES_DIR} directory.`, type: 'error' });
                throw createError; // Re-throw to halt initialization if critical
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
            // _ensureNotesDirectory is now called in _initialize
            const filesInNotesDir = await dbManager.listFiles(this.NOTES_DIR);
            this.notesCache = [];

            for (const fileInfo of filesInNotesDir) {
                // Ensure we are only processing files directly within NOTES_DIR and ending with .txt
                if (fileInfo.path.startsWith(this.NOTES_DIR + '/') && fileInfo.path.endsWith('.txt') && fileInfo.type === 'file') {
                    const title = fileInfo.name.replace('.txt', ''); // fileInfo.name should be just the filename
                    this.notesCache.push({
                        id: fileInfo.path,
                        path: fileInfo.path,
                        content: null,
                        lastModified: fileInfo.lastModified || Date.now(),
                        title: title
                    });
                }
            }

            this.notesCache.sort((a, b) => b.lastModified - a.lastModified);
            this._renderFilteredNotes(this.notesCache);

            let noteToSelect = null;
            if (this.currentNotePath && this.notesCache.find(n => n.path === this.currentNotePath)) {
                noteToSelect = this.currentNotePath;
            } else if (this.notesCache.length > 0) {
                noteToSelect = this.notesCache[0].path;
            }

            // Call _loadNoteIntoEditor regardless of whether a note is selected or not
            // to handle the empty state correctly.
            await this._loadNoteIntoEditor(noteToSelect);

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
            deleteBtn.className = 'delete-note-btn';
            deleteBtn.innerHTML = '<svg viewBox="0 0 16 16" width="10" height="10" fill="currentColor"><path d="M2.146 2.854a.5.5 0 1 1 .708-.708L8 7.293l5.146-5.147a.5.5 0 0 1 .708.708L8.707 8l5.147 5.146a.5.5 0 0 1-.708.708L8 8.707l-5.146 5.147a.5.5 0 0 1-.708-.708L7.293 8 2.146 2.854Z"/></svg>';
            deleteBtn.title = 'Excluir anotação';
            deleteBtn.style.position = 'absolute';
            deleteBtn.style.top = '8px';
            deleteBtn.style.right = '8px';
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
