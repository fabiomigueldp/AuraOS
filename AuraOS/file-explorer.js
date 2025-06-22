class AuraFileExplorerApp {
    constructor(appId, windowEl, data = {}) {
        this.appId = appId;
        this.windowEl = windowEl;
        this.data = data; // Expected to contain 'path' for initial directory
        this.currentPath = this.data.path || '/'; // Default to root if no path specified
        this.selectedItemPath = null;

        console.log(`AuraFileExplorerApp constructor: ${appId}, initial path: ${this.currentPath}`);

        this.boundDestroy = this.destroy.bind(this);
        this.windowEl.addEventListener('aura:close', this.boundDestroy);

        this.boundHandleFileSystemChange = this.handleFileSystemChange.bind(this);
        document.addEventListener('aura:filesystem:change', this.boundHandleFileSystemChange);

        this._initUI();
        this._renderView(this.currentPath);
    }

    _initUI() {
        const body = this.windowEl.querySelector('.window-body');
        body.innerHTML = `
            <div class="file-explorer-container" style="display: flex; height: 100%; flex-direction: column;">
                <div class="file-explorer-toolbar" style="display: flex; align-items: center; padding: 8px; border-bottom: 1px solid var(--glass-border); flex-shrink: 0;">
                    <button class="fe-nav-btn" data-action="up" title="Up" style="margin-right: 5px;">
                        <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M7.41 15.41L12 10.83l4.59 4.58L18 14l-6-6-6 6z"/></svg>
                    </button>
                    <input type="text" class="fe-address-bar" style="flex-grow: 1; margin: 0 5px; padding: 5px; border-radius: 5px;" readonly>
                    <button class="fe-action-btn" data-action="create-folder" title="Nova Pasta" style="margin-left: 10px;">
                        <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M20 6h-8l-2-2H4c-1.11 0-2 .9-2 2v12c0 1.1.89 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-8-2h-2l-2 2H4v12h16V8h-8l-2-2z"/></svg>
                    </button>
                     <button class="fe-action-btn" data-action="rename" title="Renomear" style="margin-left: 5px;">
                        <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34a.9959.9959 0 00-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>
                    </button>
                    <button class="fe-action-btn" data-action="delete" title="Excluir" style="margin-left: 5px;">
                        <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
                    </button>
                </div>
                <div class="file-explorer-main-view" style="padding: 10px; overflow-y: auto; flex-grow: 1; display: flex; flex-wrap: wrap; align-content: flex-start; gap: 10px;">
                    <!-- File and folder icons will be rendered here -->
                </div>
            </div>
        `;

        this.addressBar = body.querySelector('.fe-address-bar');
        this.mainView = body.querySelector('.file-explorer-main-view');

        // Toolbar button listeners
        body.querySelector('.fe-nav-btn[data-action="up"]').addEventListener('click', () => this._navigateUp());
        body.querySelector('.fe-action-btn[data-action="create-folder"]').addEventListener('click', () => this._createNewFolder());
        body.querySelector('.fe-action-btn[data-action="delete"]').addEventListener('click', () => this._deleteSelectedItem());
        body.querySelector('.fe-action-btn[data-action="rename"]').addEventListener('click', () => this._renameSelectedItem());


        // Click on background to deselect
        this.mainView.addEventListener('click', (event) => {
            if (event.target === this.mainView) {
                this._selectItem(null, null);
            }
        });
    }

    _updateWindowTitle() {
        const titleEl = this.windowEl.querySelector('.window-title');
        if (titleEl) {
            const pathParts = this.currentPath.split('/').filter(p => p);
            const currentFolderName = pathParts.length > 0 ? pathParts[pathParts.length - 1] : 'Raiz';
            titleEl.textContent = `Explorador - ${currentFolderName}`;
        }
    }

    async _renderView(path) {
        this.currentPath = path;
        this.addressBar.value = path;
        this._updateWindowTitle();
        this.mainView.innerHTML = '<p style="color:var(--subtle-text-color);width:100%;text-align:center;">Carregando...</p>';
        this.selectedItemPath = null; // Deselect on navigation

        try {
            const node = await dbManager.loadFile(path);
            if (!node || node.type !== 'folder') {
                this.mainView.innerHTML = '<p>Diretório não encontrado ou inválido.</p>';
                return;
            }

            this.mainView.innerHTML = ''; // Clear loading message

            // Parent directory ("..")
            if (path !== '/') {
                const parentPath = path.substring(0, path.lastIndexOf('/')) || '/';
                this._addItemToView({ name: '..', type: 'folder', path: parentPath }, parentPath, true);
            }

            const children = await dbManager.listFiles(path);
            children.sort((a, b) => { // Sort folders first, then by name
                if (a.type === 'folder' && b.type !== 'folder') return -1;
                if (a.type !== 'folder' && b.type === 'folder') return 1;
                return a.name.localeCompare(b.name);
            });

            if (children.length === 0 && path === '/') {
                 // If root is empty (after '..'), show a message
                this.mainView.innerHTML = '<p style="color:var(--subtle-text-color);width:100%;text-align:center;">Este diretório está vazio.</p>';
            } else if (children.length === 0 && path !== '/') {
                 // If a non-root folder is empty (after '..'), show empty message
                 // This check might need adjustment if '..' isn't the only thing, or if children.length is 0
                 if (this.mainView.children.length === 1 && this.mainView.children[0].dataset.itemName === '..') {
                    this.mainView.innerHTML += '<p style="color:var(--subtle-text-color);width:100%;text-align:center;margin-top:10px;">Esta pasta está vazia.</p>';
                 } else if (this.mainView.children.length === 0) { // Truly empty, no ".."
                    this.mainView.innerHTML = '<p style="color:var(--subtle-text-color);width:100%;text-align:center;">Esta pasta está vazia.</p>';
                 }
            }


            children.forEach(item => {
                this._addItemToView(item, this.resolvePath(path, item.name));
            });

        } catch (error) {
            console.error(`FileExplorer: Error rendering view for ${path}:`, error);
            this.mainView.innerHTML = `<p style="color:red;">Erro ao carregar diretório: ${error.message}</p>`;
        }
    }

    _addItemToView(item, itemFullPath, isParentLink = false) {
        const itemEl = document.createElement('div');
        itemEl.className = 'file-explorer-item';
        itemEl.setAttribute('draggable', 'true');
        itemEl.dataset.itemName = item.name;
        itemEl.title = item.name;

        let iconSvg = '';
        if (item.type === 'folder') {
            iconSvg = '<svg viewBox="0 0 24 24" width="48" height="48" fill="var(--highlight-primary)"><path d="M10 4H4c-1.11 0-2 .9-2 2v12c0 1.1.89 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"/></svg>';
            itemEl.dataset.folderPath = itemFullPath; // Store full path for folders
            itemEl.addEventListener('dblclick', () => {
                this._renderView(itemFullPath);
            });
        } else { // File
            iconSvg = '<svg viewBox="0 0 24 24" width="48" height="48" fill="var(--text-color)"><path d="M6 2c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6H6zm7 7V3.5L18.5 9H13z"/></svg>';
            itemEl.dataset.filePath = itemFullPath; // Store full path for files
            itemEl.addEventListener('dblclick', () => {
                if (typeof window.openFile === 'function') {
                    window.openFile(itemFullPath);
                } else {
                    console.error('FileExplorer: global openFile function not found.');
                    AuraOS.showNotification({title: 'Erro', message: 'Não foi possível abrir o arquivo.', type: 'error'});
                }
            });
        }
        itemEl.innerHTML = `${iconSvg}<p>${item.name}</p>`;

        itemEl.addEventListener('click', (e) => {
            e.stopPropagation();
            this._selectItem(itemEl, itemFullPath);
        });

        this.mainView.appendChild(itemEl);
    }

    _selectItem(itemEl, itemFullPath) {
        this.mainView.querySelectorAll('.file-explorer-item.selected').forEach(el => el.classList.remove('selected'));
        if (itemEl) {
            itemEl.classList.add('selected');
            this.selectedItemPath = itemFullPath;
        } else {
            this.selectedItemPath = null;
        }
        console.log('Selected item:', this.selectedItemPath);
    }

    _navigateUp() {
        if (this.currentPath === '/') return;
        const parentPath = this.currentPath.substring(0, this.currentPath.lastIndexOf('/')) || '/';
        this._renderView(parentPath);
    }

    async _createNewFolder() {
        AuraOS.dialog.prompt("Nome da nova pasta:", "Nova Pasta", async (folderName) => {
            if (folderName && folderName.trim() !== "") {
                const newFolderPath = this.resolvePath(this.currentPath, folderName.trim());
                const success = await window.createItem(newFolderPath, 'folder');
                if (!success) {
                    // createItem handles notifications
                    console.error(`FileExplorer: Failed to create folder '${newFolderPath}'`);
                }
                // Filesystem event 'aura:filesystem:change' will trigger a refresh if current view is affected.
            } else if (folderName !== null) { // User submitted empty or whitespace
                 AuraOS.showNotification({title: 'Nome Inválido', message: 'O nome da pasta não pode ser vazio.', type: 'warning'});
            }
        });
    }

    async _deleteSelectedItem() {
        if (!this.selectedItemPath) {
            AuraOS.showNotification({ title: 'Nenhum Item Selecionado', message: 'Selecione um item para excluir.', type: 'warning' });
            return;
        }
        if (this.selectedItemPath === '/') {
             AuraOS.showNotification({ title: 'Ação Inválida', message: 'Não é possível excluir o diretório raiz.', type: 'error' });
            return;
        }
        // Check if trying to delete ".." (parent directory link)
        const selectedItemElement = this.mainView.querySelector('.file-explorer-item.selected');
        if (selectedItemElement && selectedItemElement.dataset.itemName === '..') {
            AuraOS.showNotification({ title: 'Ação Inválida', message: 'Não é possível excluir o link para o diretório pai ("..").', type: 'warning' });
            return;
        }

        const itemName = this.selectedItemPath.substring(this.selectedItemPath.lastIndexOf('/') + 1);
        AuraOS.dialog.confirm(`Tem certeza que deseja excluir "${itemName}"?`, async () => {
            const success = await window.deleteItem(this.selectedItemPath);
            if (success) {
                this.selectedItemPath = null; // Deselect after deletion
                // Refresh is handled by filesystem event listener
            } else {
                // deleteItem handles its own error notifications
                 console.error(`FileExplorer: Failed to delete item '${this.selectedItemPath}'`);
            }
        });
    }

    async _renameSelectedItem() {
        if (!this.selectedItemPath) {
            AuraOS.showNotification({ title: 'Nenhum Item Selecionado', message: 'Selecione um item para renomear.', type: 'warning' });
            return;
        }
         if (this.selectedItemPath === '/') {
             AuraOS.showNotification({ title: 'Ação Inválida', message: 'Não é possível renomear o diretório raiz.', type: 'error' });
            return;
        }
        const selectedItemElement = this.mainView.querySelector('.file-explorer-item.selected');
        if (selectedItemElement && selectedItemElement.dataset.itemName === '..') {
            AuraOS.showNotification({ title: 'Ação Inválida', message: 'Não é possível renomear o link para o diretório pai ("..").', type: 'warning' });
            return;
        }

        const oldName = this.selectedItemPath.substring(this.selectedItemPath.lastIndexOf('/') + 1);
        AuraOS.dialog.prompt("Novo nome:", oldName, async (newName) => {
            if (newName && newName.trim() !== "" && newName.trim() !== oldName) {
                // The global renameItem function takes full paths.
                // The newName here is just the new base name, not the full new path.
                // We need to construct the new full path based on the current parent directory.
                const parentPath = this.currentPath; // selectedItemPath's parent is the currentPath
                const newFullPath = this.resolvePath(parentPath, newName.trim());

                const success = await window.renameItem(this.selectedItemPath, newFullPath); // Pass new FULL path
                if (success) {
                    this.selectedItemPath = newFullPath; // Update selection to new path
                    // Refresh is handled by filesystem event listener
                } else {
                    // renameItem handles its own error notifications
                    console.error(`FileExplorer: Failed to rename item '${this.selectedItemPath}' to '${newFullPath}'`);
                }
            } else if (newName && newName.trim() === oldName) {
                // No change in name, do nothing.
            } else if (newName !== null) { // User submitted empty or whitespace
                AuraOS.showNotification({ title: 'Nome Inválido', message: 'O nome não pode ser vazio.', type: 'warning'});
            }
        });
    }

    resolvePath(current, target) { // Utility specific to File Explorer, could be global
        if (target.startsWith('/')) return target; // Absolute path

        const currentParts = current.split('/').filter(p => p);
        const targetParts = target.split('/').filter(p => p);
        let resultParts = [...currentParts];

        for (const part of targetParts) {
            if (part === '..') {
                if (resultParts.length > 0) resultParts.pop();
            } else if (part !== '.' && part !== '') {
                resultParts.push(part);
            }
        }
        const newPath = '/' + resultParts.join('/');
        return newPath === '//' ? '/' : newPath; // Handle root case
    }

    handleFileSystemChange(event) {
        const { path, oldPath, action } = event.detail;
        const affectedParentPath = path.substring(0, path.lastIndexOf('/')) || '/';
        const oldAffectedParentPath = oldPath ? (oldPath.substring(0, oldPath.lastIndexOf('/')) || '/') : null;

        // If the change happened in the current directory, or if a rename affected the current directory's path
        if (this.currentPath === affectedParentPath || (oldPath && this.currentPath === oldAffectedParentPath) || (action === 'rename' && path === this.currentPath)) {
            console.log(`FileExplorer (${this.appId}): Refreshing view for ${this.currentPath} due to ${action} on ${path}`);
            this._renderView(this.currentPath);
        } else if (action === 'rename' && this.currentPath.startsWith(oldPath + '/')) {
            // If the current path was a subfolder of a renamed folder
            const newCurrentPath = this.currentPath.replace(oldPath, path);
            console.log(`FileExplorer (${this.appId}): Current path ${this.currentPath} updated to ${newCurrentPath} due to parent rename.`);
            this._renderView(newCurrentPath);
        }
    }

    destroy() {
        console.log(`AuraFileExplorerApp ${this.appId} destroyed`);
        document.removeEventListener('aura:filesystem:change', this.boundHandleFileSystemChange);
        this.windowEl.removeEventListener('aura:close', this.boundDestroy);
    }
}
