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

        this._initUI();       // Existing
        this._initEditor();   // Modified in this step
        this._loadNotesList(); // Existing
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

        console.log(`AuraNotesApp: Loading note ${filePath} into editor.`);
        try {
            const noteFileObject = await dbManager.loadFile(filePath);
            if (noteFileObject && typeof noteFileObject.content === 'string') {
                this.editor.setValue(noteFileObject.content);
                this.currentNotePath = filePath;

                if (this.notesListDiv) {
                    this.notesListDiv.querySelectorAll('.note-item.active').forEach(item => item.classList.remove('active'));
                    const activeListItem = this.notesListDiv.querySelector(`.note-item[data-note-path="${CSS.escape(filePath)}"]`);
                    if (activeListItem) {
                        activeListItem.classList.add('active');
                    }
                }
                this.editor.focus();
            } else {
                console.error(`AuraNotesApp: Note content not found or invalid for ${filePath}.`);
                AuraOS.showNotification({ title: 'Error', message: `Could not load note: ${filePath}.`, type: 'error' });
                this.editor.setValue(`// Error: Could not load note ${filePath}`);
                this.currentNotePath = null;
            }
        } catch (error) {
            console.error(`AuraNotesApp: Error loading note ${filePath} into editor:`, error);
            AuraOS.showNotification({ title: 'Error Loading Note', message: error.message, type: 'error' });
            this.editor.setValue(`// Error loading note: ${error.message}`);
            this.currentNotePath = null;
        }
    }

    async _deleteNote(filePath) {
        if (!filePath) return;

        const noteToDelete = this.notesCache.find(n => n.path === filePath);
        const noteTitle = noteToDelete ? (noteToDelete.content.split('\n')[0] || 'esta anotação') : filePath;

        AuraOS.dialog.confirm(
            `Tem certeza que deseja excluir "${noteTitle}"? Esta ação não pode ser desfeita.`,
            async () => {
                try {
                    await dbManager.deleteFile(filePath);
                    console.log(`AuraNotesApp: Note ${filePath} deleted from DB.`);
                    this.notesCache = this.notesCache.filter(note => note.path !== filePath);

                    if (this.currentNotePath === filePath) {
                        this.currentNotePath = null;
                        if (this.editor) this.editor.setValue('');
                        if (this.notesCache.length > 0) {
                            this.notesCache.sort((a, b) => b.lastModified - a.lastModified);
                            await this._loadNoteIntoEditor(this.notesCache[0].path);
                        } else {
                             if (this.editor) this.editor.setValue('Nenhuma anotação. Crie uma nova!');
                        }
                    }
                    await this._loadNotesList();
                    AuraOS.showNotification({ title: 'Anotação Excluída', message: `"${noteTitle}" foi excluída.`, type: 'info' });
                } catch (error) {
                    console.error(`AuraNotesApp: Error deleting note ${filePath}:`, error);
                    AuraOS.showNotification({ title: 'Erro ao Excluir', message: `Não foi possível excluir "${noteTitle}".`, type: 'error' });
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
        const oldContent = noteInCache ? noteInCache.content : '';
        if (newContent === oldContent) {
            return;
        }
        const oldTitle = oldContent.split('\n')[0] || '';
        const newTitle = newContent.split('\n')[0] || '';
        try {
            const newLastModified = Date.now();
            await dbManager.saveFile({
                path: this.currentNotePath,
                type: 'file',
                lastModified: newLastModified,
            }, newContent);
            console.log(`AuraNotesApp: Note ${this.currentNotePath} auto-saved to DB.`);
            if (noteInCache) {
                noteInCache.content = newContent;
                noteInCache.lastModified = newLastModified;
            } else {
                this.notesCache.push({ id: this.currentNotePath, path: this.currentNotePath, content: newContent, lastModified: newLastModified });
            }
            this.notesCache.sort((a, b) => b.lastModified - a.lastModified);
            if (oldTitle !== newTitle) {
                await this._loadNotesList();
            } else {
                const activeListItem = this.notesListDiv.querySelector(`.note-item[data-note-path="${CSS.escape(this.currentNotePath)}"]`);
                if (activeListItem) {
                    const timestampEl = activeListItem.querySelector('.note-timestamp');
                    if (timestampEl) {
                         timestampEl.textContent = new Date(newLastModified).toLocaleString('pt-BR', {
                            day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
                        });
                    }
                    const previewEl = activeListItem.querySelector('.note-preview');
                    if (previewEl) {
                        previewEl.textContent = (newContent.split('\n').slice(1).join(' ') || 'Sem conteúdo adicional').substring(0, 100) + '...';
                    }
                }
            }
        } catch (error) {
            console.error(`AuraNotesApp: Error auto-saving note ${this.currentNotePath}:`, error);
            AuraOS.showNotification({ title: 'Erro ao Salvar', message: 'Falha no salvamento automático.', type: 'error' });
        }
    }

    async _handleNewNote() {
        console.log('AuraNotesApp: Handling new note creation.');
        await this._ensureNotesDirectory();
        let newNoteName = 'Nova Anotação.txt';
        let counter = 1;
        const baseName = 'Nova Anotação';
        let newFilePath = `/Notes/${newNoteName}`;
        try {
            while (true) {
                try {
                    await dbManager.loadFile(newFilePath);
                    counter++;
                    newNoteName = `${baseName} (${counter}).txt`;
                    newFilePath = `/Notes/${newNoteName}`;
                } catch (error) {
                    break;
                }
            }
            const initialContent = `# ${newNoteName.replace('.txt', '')}\n\n`;
            await dbManager.saveFile({
                path: newFilePath,
                type: 'file',
                lastModified: Date.now()
            }, initialContent);
            console.log(`AuraNotesApp: New note created at ${newFilePath}`);
            const newNoteForCache = {
                id: newFilePath,
                path: newFilePath,
                content: initialContent,
                lastModified: Date.now()
            };
            this.notesCache.unshift(newNoteForCache);
            this.notesCache.sort((a, b) => b.lastModified - a.lastModified);
            await this._loadNotesList();
            await this._loadNoteIntoEditor(newFilePath);
            if (this.editor) {
                this.editor.focus();
            }
        } catch (error) {
            console.error('AuraNotesApp: Error creating new note:', error);
            AuraOS.showNotification({ title: 'Error Creating Note', message: error.message, type: 'error' });
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
            } else { // This else block might not be reached if loadFile throws for non-existence
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
            // This catch block handles errors from dbManager.loadFile (e.g., if item doesn't exist)
            // OR errors from dbManager.saveFile if creation fails.
            let dirExists = false; // Re-check specifically if it was a "not found" error for loadFile
            try {
                const notesDirObjectCheck = await dbManager.loadFile(notesDirPath);
                if (notesDirObjectCheck && notesDirObjectCheck.type === 'folder') {
                    dirExists = true;
                } else if (notesDirObjectCheck) { // Exists but not a folder
                     console.error('AuraNotesApp: Path /Notes/ exists but is not a folder (checked in catch).');
                     AuraOS.showNotification({ title: 'Notes App Error', message: 'File system conflict for /Notes/.', type: 'error' });
                     throw new Error('Path /Notes/ exists but is not a folder.');
                }
            } catch (nestedLoadError) {
                 // This means it truly doesn't exist
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
            } else if (error && dirExists) { // Original error was not "not found" but something else
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
            const notesFiles = await dbManager.listFiles('/Notes/');
            this.notesCache = [];
            for (const fileInfo of notesFiles) {
                if (fileInfo.path.endsWith('.txt') && fileInfo.type === 'file') {
                    try {
                        const noteFileObject = await dbManager.loadFile(fileInfo.path);
                        this.notesCache.push({
                            id: noteFileObject.path,
                            path: noteFileObject.path,
                            content: noteFileObject.content || '',
                            lastModified: noteFileObject.lastModified || Date.now()
                        });
                    } catch (loadContentError) {
                        console.error(`AuraNotesApp: Failed to load content for ${fileInfo.path}`, loadContentError);
                    }
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
            const title = (note.content.split('\n')[0] || 'Nova Anotação').substring(0, 50);
            const preview = (note.content.split('\n').slice(1).join(' ') || 'Sem conteúdo adicional').substring(0, 100) + '...';
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
            const contentLower = note.content ? note.content.toLowerCase() : '';
            return contentLower.includes(query);
        });
        filteredNotes.sort((a, b) => b.lastModified - a.lastModified);
        this._renderFilteredNotes(filteredNotes);
    }

    _initEditor() {
        if (!this.editorContainerDiv) {
            console.error('AuraNotesApp: editorContainerDiv is not defined. UI not initialized properly?');
            this.windowEl.querySelector('.window-body').innerHTML = '<p style="color:red;padding:10px;">Error: Editor container missing.</p>';
            return;
        }
        this.editorContainerDiv.innerHTML = ''; // Clear placeholder

        if (typeof require === 'undefined' || typeof monaco === 'undefined') {
            console.error('AuraNotesApp: Monaco Editor (require or monaco global) not available. Ensure loader.js is loaded globally.');
            this.editorContainerDiv.innerHTML = '<p style="color:red;padding:10px;">Error: Monaco Editor components not found. Check console.</p>';
            // Attempt to load it dynamically as a fallback - might be too late if app expects it synchronously
            const loaderScript = document.createElement('script');
            loaderScript.src = 'https://cdn.jsdelivr.net/npm/monaco-editor@0.44.0/min/vs/loader.js';
            loaderScript.onload = () => {
                console.log('AuraNotesApp: Fallback Monaco loader.js loaded. Attempting re-init (manual refresh might be needed).');
                // Potentially re-call _initEditor or notify user to retry
            };
            document.head.appendChild(loaderScript);
            return;
        }

        // Path configuration for Monaco's assets.
        // This is crucial when the loader is separate from where editor/editor.main is.
        // The CDN structure usually handles this, but explicitly setting it can resolve issues.
        require.config({
            paths: { 'vs': 'https://cdn.jsdelivr.net/npm/monaco-editor@0.44.0/min/vs' }
        });

        require(['vs/editor/editor.main'], () => {
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
                        if (this.editor && monaco.editor) { // Ensure monaco.editor is also available
                            monaco.editor.setTheme(newEditorTheme);
                            console.log('AuraNotesApp: Monaco Editor theme updated to', newEditorTheme);
                        }
                    }
                }
            });
            this.themeObserver.observe(document.documentElement, { attributes: true });
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
