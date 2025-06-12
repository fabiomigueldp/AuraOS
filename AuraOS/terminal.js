class AuraTerminalApp {
    constructor(appId, windowEl, data) {
        this.appId = appId;
        this.windowEl = windowEl;
        this.data = data;

        this.windowEl.addEventListener('aura:close', this.destroy.bind(this));

        this.body = this.windowEl.querySelector('.window-body');
        this.body.style.background = 'rgba(0,0,0,0.8)';
        this.body.style.padding = '10px';
        this.body.style.fontFamily = "'Fira Code', monospace";
        this.body.style.lineHeight = '1.6';
        this.body.style.overflow = 'hidden'; // To contain output and input area
        this.body.style.display = 'flex';
        this.body.style.flexDirection = 'column';

        this.output = document.createElement('div');
        this.output.className = 'terminal-output';
        this.output.style.height = '100%';
        this.output.style.overflowY = 'auto';
        this.output.style.flexGrow = '1';
        this.body.appendChild(this.output);

        // Initialize properties
        this.currentPath = '/';
        this.commandHistory = [];
        this.historyIndex = -1;

        // Initialize commands object
        this._initCommands();

        // Load command history
        dbManager.loadSetting('terminalHistory').then(history => {
            if (history && Array.isArray(history)) { this.commandHistory = history; this.historyIndex = history.length; }
            else { this.commandHistory = []; this.historyIndex = 0; }
        }).catch(err => {
            console.warn('Terminal: Could not load history', err);
            this.commandHistory = [];
            this.historyIndex = 0;
        });

        // Call to initialize terminal logic
        this._initTerminalLogic();

        // Click to focus input
        this.body.addEventListener('click', (e) => {
            if (e.target.tagName !== 'INPUT') {
                const lastInput = this.output.querySelector('.terminal-line:last-child .terminal-input');
                if (lastInput) { lastInput.focus(); }
            }
        });
    }

    destroy() {
        console.log(`AuraTerminalApp ${this.appId} destroyed`);
        if (this.activeIntervals) {
            this.activeIntervals.forEach(clearInterval);
            this.activeIntervals = [];
        }
        // Future: Remove any event listeners specific to this app instance if added
        // For example, if input event listeners are added directly to input elements managed by the class
    }

    _initTerminalLogic() {
        // Most of the logic from the original initializeTerminal function will go here.
        // It will set up the first prompt and input handling.
        this._newTermLine();
    }

    resolvePath(current, target) {
        if (!current) current = '/';
        if (!target) target = ''; // Ensure target is a string

        // If target is an absolute path
        if (target.startsWith('/')) {
            current = '/'; // Start from root
        }

        const currentParts = current.split('/').filter(p => p.length > 0);
        const targetParts = target.split('/').filter(p => p.length > 0);

        for (const part of targetParts) {
            if (part === '..') {
                if (currentParts.length > 0) {
                    currentParts.pop();
                }
            } else if (part !== '.' && part !== '') { // Ignore empty parts and '.'
                currentParts.push(part);
            }
        }
        // Join parts and ensure it starts with a single slash, and handles the root case.
        let newPath = '/' + currentParts.join('/');
        if (newPath === '//') newPath = '/'; // Handle cases like /../../ resulting in //
        return newPath;
    }

    _initCommands() {
        this.commands = {
            help: (args) => this._termLog(`Comandos disponíveis:
  ls [-l] [-a] [-R] [path]  - Lista arquivos e diretórios. -l (longo), -a (ocultos), -R (recursivo).
  cd <dir> | ~ | -         - Muda o diretório atual. '~' (home), '-' (anterior).
  pwd                       - Mostra o caminho do diretório atual.
  cat [-n] <file1> [file2...] - Exibe conteúdo de arquivo(s). -n (números de linha).
  mkdir [-p] <dir>          - Cria diretório(s). -p (cria pais se necessário).
  touch <file>              - Cria um novo arquivo vazio.
  rm [-r] <item>            - Remove arquivo ou diretório. -r (recursivo para diretórios).
  cp <src> <dest>           - Copia arquivos/diretórios.
  mv <src> <dest>           - Move (renomeia) arquivos/diretórios.
  df                        - Exibe informações de uso do disco (simulado).
  open <app_id>             - Abre um aplicativo (ex: open control-panel).
  theme [dark|light]        - Muda o tema do sistema.
  wallpaper [nome]          - Muda o papel de parede (ex: wallpaper aurora).
  taskmgr                   - Abre o Gerenciador de Tarefas.
  reboot                    - Reinicia o AuraOS.
  shutdown                  - Desliga o AuraOS (volta para tela de login).
  clear                     - Limpa o terminal.
  neofetch                  - Exibe informações do sistema (estilo Neofetch).
  echo [texto]              - Exibe o texto fornecido.
  help                      - Mostra esta lista de comandos.
  edit <filepath>           - Abre um arquivo de texto para edição.
  run <game_id>             - Executa um jogo.
  ps                        - Lista os processos (janelas) ativos.
  kill <window_id>          - Termina um processo (fecha uma janela).
  history                   - Mostra o histórico de comandos.
  date                      - Exibe a data e hora atuais.
  whoami                    - Exibe o nome do usuário atual.
  about                     - Mostra informações sobre o AuraOS.
  ping <hostname>           - Envia pacotes ICMP ECHO_REQUEST para um host de rede (simulado).`, 'output-text'),
            clear: (args) => { this.output.innerHTML = ''; },
            pwd: (args) => this._termLog(this.currentPath, 'output-text'),
            reboot: (args) => window.location.reload(),
            shutdown: (args) => {
                // These need to be global AuraOS functions or event dispatches
                // For now, direct DOM manipulation as in original
                document.getElementById('aura-os-container').style.display = 'none';
                document.getElementById('login-screen').style.opacity = '1';
                document.getElementById('login-screen').style.display = 'flex';
            },
            taskmgr: (args) => {
                // Assumes createWindow is a global function for now
                createWindow('task-manager');
                this._termLog('Opening Task Manager...', 'output-text');
            },
            open: (args) => {
                if (!args[0]) return this._termLog('Uso: open <app_id>', 'output-error');
                // Assumes apps and createWindow are global for now
                if (apps[args[0]]) createWindow(args[0]);
                else this._termLog(`App "${args[0]}" não encontrado.`, 'output-error');
            },
            theme: (args) => {
                if (args[0] === 'dark' || args[0] === 'light') setTheme(args[0]); // Assumes setTheme is global
                else this._termLog('Uso: theme [dark|light]', 'output-error');
            },
            wallpaper: (args) => {
                if (['default', 'aurora', 'sunset', 'forest', 'ocean', 'space', 'minimalist'].includes(args[0])) setWallpaper(args[0]); // Assumes setWallpaper is global
                else this._termLog('Uso: wallpaper [default|aurora|sunset|forest|ocean|space|minimalist]', 'output-error');
            },
            ls: async (args) => {
                const pathArg = args.find(arg => !arg.startsWith('-'));
                const targetPath = pathArg ? this.resolvePath(this.currentPath, pathArg) : this.currentPath;

                try {
                    // Check if targetPath is a directory
                    const targetNode = await dbManager.loadFile(targetPath);
                    if (!targetNode || targetNode.type !== 'folder') {
                        this._termLog(`ls: cannot access '${targetPath}': Not a directory`, 'output-error');
                        return;
                    }
                } catch (error) {
                    this._termLog(`ls: cannot access '${targetPath}': No such file or directory`, 'output-error');
                    return;
                }

                const showAll = args.includes('-a') || args.includes('--all');
                const longFormat = args.includes('-l') || args.includes('--long');
                const recursive = args.includes('-R') || args.includes('--recursive');

                const listItemsRecursive = async (currentItemPath, indent = '') => {
                    let items;
                    try {
                        items = await dbManager.listFiles(currentItemPath); // This should return array of item objects
                    } catch (error) {
                        this._termLog(`Error listing directory ${currentItemPath}: ${error.message}`, 'output-error');
                        return;
                    }

                    items.sort((a, b) => a.name.localeCompare(b.name));

                    if (!showAll) {
                        items = items.filter(item => !item.name.startsWith('.'));
                    }

                    for (const item of items) {
                        // dbManager.listFiles should ideally return full path or enough info to construct it.
                        // Assuming item from listFiles has: name, type, size, lastModified
                        // And path is the path of the item itself.
                        const itemName = item.name; // Name of the file/folder
                        const itemFullPath = item.path; // Full path to the item

                        const nameDisplay = item.type === 'folder'
                            ? `<span style='color: var(--highlight-primary);'>${itemName}</span>`
                            : `<span style='color: var(--text-color);'>${itemName}</span>`;

                        if (longFormat) {
                            const permissions = item.type === 'folder' ? 'drwxr-xr-x' : '-rw-r--r--';
                            const owner = item.owner || 'AuraUser'; // Assuming dbManager might provide owner
                            let sizeDisplay;
                            if (item.type === 'folder') {
                                sizeDisplay = '4.0K'; // Folders might not have a meaningful size from dbManager like this
                            } else {
                                // Assuming item.size is in bytes
                                sizeDisplay = item.size ? `${(item.size / 1024).toFixed(1)}K` : '0K';
                            }
                            const date = item.lastModified ? new Date(item.lastModified).toLocaleDateString('en-US', { month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : 'Jan 01 00:00';
                            this._termLog(`${indent}${permissions}  1 ${owner.padEnd(8)} ${owner.padEnd(8)} ${sizeDisplay.padStart(6)} ${date} ${nameDisplay}`, 'output-text');
                        } else {
                            this._termLog(`${indent}${nameDisplay}`, 'output-text');
                        }

                        if (recursive && item.type === 'folder') {
                            this._termLog(`${indent}${itemFullPath}:`, 'output-text');
                            await listItemsRecursive(itemFullPath, indent + '  ');
                        }
                    }
                };

                if (recursive && targetPath === this.currentPath && !pathArg) { // If -R and listing current directory.
                     this._termLog(`${targetPath}:`, 'output-text');
                }
                await listItemsRecursive(targetPath);
            },
            cd: async (args) => {
                const targetPathArg = args[0];

                if (!targetPathArg || targetPathArg === '~') {
                    const homeDirectory = (typeof AuraOS !== 'undefined' && AuraOS.paths && AuraOS.paths.HOME) ? AuraOS.paths.HOME : '/Documents';
                    try {
                        const node = await dbManager.loadFile(homeDirectory);
                        if (node && node.type === 'folder') {
                            this.previousPath = this.currentPath;
                            this.currentPath = homeDirectory;
                        } else {
                            this._termLog(`cd: home directory '${homeDirectory}' not found or not a folder. Defaulting to root.`, 'output-error');
                            this.previousPath = this.currentPath;
                            this.currentPath = '/'; // Fallback to root if home is invalid
                        }
                    } catch (error) {
                        this._termLog(`cd: error accessing home directory '${homeDirectory}': ${error.message}. Defaulting to root.`, 'output-error');
                        this.previousPath = this.currentPath;
                        this.currentPath = '/'; // Fallback to root on error
                    }
                    return;
                }

                if (targetPathArg === '-') {
                    if (this.previousPath) {
                        const tempPath = this.currentPath;
                        this.currentPath = this.previousPath;
                        this.previousPath = tempPath;
                    } else {
                        this._termLog('cd: OLDPWD not set', 'output-error');
                    }
                    return;
                }

                const newPath = this.resolvePath(this.currentPath, targetPathArg);
                try {
                    const node = await dbManager.loadFile(newPath);
                    if (node && node.type === 'folder') {
                        this.previousPath = this.currentPath;
                        this.currentPath = newPath;
                    } else {
                        this._termLog(`cd: '${targetPathArg}': Not a directory`, 'output-error');
                    }
                } catch (error) {
                    this._termLog(`cd: '${targetPathArg}': No such file or directory. ${error.message}`, 'output-error');
                }
            },
            cat: async (args) => {
                const lineNumbers = args.includes('-n');
                const filesToCat = args.filter(arg => arg !== '-n');

                if (filesToCat.length === 0) {
                    this._termLog('Usage: cat [-n] <file1> [file2...]', 'output-error');
                    return;
                }

                for (const filePathArg of filesToCat) {
                    const path = this.resolvePath(this.currentPath, filePathArg);
                    try {
                        const node = await dbManager.loadFile(path);

                        if (filesToCat.length > 1) {
                            // Potentially add a small delay or ensure output order if logging multiple files quickly
                            this._termLog(`--- ${filePathArg} ---`, 'output-text');
                        }

                        if (node && node.type === 'file') {
                            let content = node.content || node.data || ''; // Prefer .content, fallback to .data
                            if (typeof content !== 'string') {
                                try {
                                    content = JSON.stringify(content); // If content is object/array
                                } catch (e) {
                                    content = 'Error: Could not display content (not a string).';
                                }
                            }
                            if (lineNumbers) {
                                content = content.split('\n').map((line, i) => `  ${(i + 1).toString().padStart(4)}  ${line}`).join('\n');
                            }
                            this._termLog(content.replace(/\n/g, '<br>'), 'output-text');
                        } else {
                            this._termLog(`cat: '${filePathArg}': Not a file`, 'output-error');
                        }
                    } catch (error) {
                        this._termLog(`cat: '${filePathArg}': No such file or directory. ${error.message}`, 'output-error');
                    }
                }
            },
            mkdir: async (args) => {
                const createParents = args.includes('-p');
                const pathArg = args.find(arg => !arg.startsWith('-'));

                if (!pathArg) {
                    this._termLog('Usage: mkdir [-p] <directory_path>', 'output-error');
                    return;
                }

                const targetPath = this.resolvePath(this.currentPath, pathArg);

                if (createParents) {
                    const parts = targetPath.split('/').filter(p => p);
                    let currentPathToCreate = '';
                    for (let i = 0; i < parts.length; i++) {
                        const part = parts[i];
                        currentPathToCreate += '/' + part;
                        currentPathToCreate = currentPathToCreate.replace(/\/\//g, '/'); // Normalize

                        try {
                            // Check if it exists in-memory first (fast check)
                            let node = getFileSystemNode(currentPathToCreate);
                            if (node && node.type !== 'folder') {
                                this._termLog(`mkdir: cannot create directory '${targetPath}': Part of path '${currentPathToCreate}' is not a directory.`, 'output-error');
                                return;
                            }
                            if (!node) { // If not in memory, try to create it (global createItem handles DB and memory)
                                const success = await createItem(currentPathToCreate, 'folder');
                                if (!success && i < parts.length -1) { // If an intermediate path failed and it wasn't the last part
                                     this._termLog(`mkdir: failed to create intermediate directory '${currentPathToCreate}'.`, 'output-error');
                                     return;
                                } else if (!success && i === parts.length -1) { // If the final part failed
                                    // Error already shown by createItem
                                    return;
                                }
                            }
                        } catch (error) { // Should be caught by createItem, but as a fallback
                            this._termLog(`mkdir: error creating directory '${currentPathToCreate}': ${error.message}`, 'output-error');
                            return;
                        }
                    }
                } else {
                    // No -p, just create the target directory
                    const success = await createItem(targetPath, 'folder');
                    if (!success) {
                        // Error message is already handled by createItem
                    }
                }
            },
            touch: async (args) => {
                if (!args[0]) {
                    this._termLog('Usage: touch <filepath>', 'output-error');
                    return;
                }
                const filePath = this.resolvePath(this.currentPath, args[0]);

                try {
                    let existingNode;
                    try {
                        existingNode = await dbManager.loadFile(filePath); // Check DB directly
                    } catch (e) { /* Doesn't exist, will be created */ }

                    if (existingNode) {
                        if (existingNode.type === 'file') {
                            // Update lastModified timestamp in DB
                            await dbManager.saveFile({
                                ...existingNode, // Spread existing metadata
                                lastModified: Date.now()
                            }, existingNode.content || existingNode.data); // Pass existing content

                            // Update in-memory FS
                            const inMemoryFileNode = getFileSystemNode(filePath);
                            if (inMemoryFileNode) {
                                inMemoryFileNode.lastModified = Date.now();
                            } else { // Should ideally be in memory if in DB
                                await loadFileSystem(); // Resync
                            }
                            updateDesktopAndFileExplorer(this.resolvePath(filePath, '..'));
                        } else {
                            this._termLog(`touch: cannot touch '${filePath}': It exists and is not a file (it's a ${existingNode.type}).`, 'output-error');
                        }
                    } else {
                        // File does not exist, create it using global createItem
                        const success = await createItem(filePath, 'file', '');
                        if (!success) {
                            // Error message handled by createItem
                        }
                    }
                } catch (error) {
                     this._termLog(`touch: failed to process file '${filePath}': ${error.message}`, 'output-error');
                }
            },
            rm: async (args) => {
                const recursive = args.includes('-r') || args.includes('--recursive'); // deleteItem handles recursion based on item type if not told otherwise
                const targetNameArg = args.find(arg => !arg.startsWith('-'));

                if (!targetNameArg) {
                    this._termLog('Usage: rm [-r] <file/directory>', 'output-error');
                    return;
                }
                const path = this.resolvePath(this.currentPath, targetNameArg);
                const itemInMemory = getFileSystemNode(path);

                if (!itemInMemory && path !== '/') { // Check memory first; if not found, it likely isn't in DB either or FS is out of sync
                     try {
                        await dbManager.loadFile(path); // Check DB to be sure
                     } catch(e) {
                        this._termLog(`rm: cannot remove '${targetNameArg}': No such file or directory.`, 'output-error');
                        return;
                     }
                     // If it exists in DB but not memory, FS is out of sync. deleteItem will handle DB, then memory.
                }


                if (itemInMemory && itemInMemory.type === 'folder' && !recursive) {
                    // Check if directory is empty (from in-memory perspective, which should be sync if all ops are good)
                    if (Object.keys(itemInMemory.children || {}).length > 0) {
                        this._termLog(`rm: cannot remove '${targetNameArg}': Directory is not empty. Use -r to remove recursively.`, 'output-error');
                        return;
                    }
                }

                // Call global deleteItem. It handles DB first, then memory.
                // It also handles recursive deletion for folders internally based on DB state.
                const success = await deleteItem(path);
                if (!success && path !== '/') { // deleteItem shows its own errors.
                    // If deletion failed and it wasn't root, log generic failure.
                    // this._termLog(`rm: failed to remove '${targetNameArg}'.`, 'output-error');
                } else if (success){
                     this._termLog(`Removed '${targetNameArg}'`, 'output-text');
                }
            },
            neofetch: (args) => {
                const neofetchArt = `
          <span style="color: var(--highlight-primary);">
          @@@@@@@@@@            </span><span style="color: var(--text-color);"><b>AuraOS</b>@aura-desktop</span>
          <span style="color: var(--highlight-primary);">       @@@@@@@@@@@@         </span><span style="color: var(--text-color);">--------------------</span>
          <span style="color: var(--highlight-primary);">     @@@@@@@@@@@@@@@@       </span><span style="color: var(--text-color);"><b>OS:</b> AuraOS Complete v2.0</span>
          <span style="color: var(--highlight-primary);">    @@@@@@@@@@@@@@@@@@      </span><span style="color: var(--text-color);"><b>Kernel:</b> 1.0-JS-DOM</span>
          <span style="color: var(--highlight-primary);">   @@@@@@@@@@@@@@@@@@@@     </span><span style="color: var(--text-color);"><b>Uptime:</b> ${Math.floor(performance.now()/1000)}s</span>
          <span style="color: var(--highlight-primary);">  @@@@@@@@@@@@@@@@@@@@@@    </span><span style="color: var(--text-color);"><b>Windows:</b> ${document.querySelectorAll('.window').length}</span>
          <span style="color: var(--highlight-primary);">  @@@@@@@@@@@@@@@@@@@@@@    </span><span style="color: var,--text-color);"><b>Shell:</b> AuraSH (ZSH-like)</span>
          <span style="color: var(--highlight-primary);">   @@@@@@@@@@@@@@@@@@@@     </span><span style="color: var(--text-color);"><b>Theme:</b> ${localStorage.getItem('auraOS_theme') || 'dark'}</span>
          <span style="color: var(--highlight-primary);">    @@@@@@@@@@@@@@@@@@      </span>
          <span style="color: var(--highlight-primary);">     @@@@@@@@@@@@@@@@       </span>
          <span style="color: var(--highlight-primary);">       @@@@@@@@@@@@         </span>
          <span style="color: var(--highlight-primary);">         @@@@@@@@           </span>
                    `;
                this._termLog(neofetchArt, 'output-text');
            },
            echo: (args) => this._termLog(args.join(' '), 'output-text'),
            df: (args) => {
                const totalSizeGB = 1.0;
                const usedPercentage = 30;
                const totalSizeMB = totalSizeGB * 1024;
                const usedSizeMB = (totalSizeMB * usedPercentage) / 100;
                const availableSizeMB = totalSizeMB - usedSizeMB;
                const totalStr = totalSizeGB.toFixed(1) + 'G';
                const usedStr = Math.round(usedSizeMB) + 'M';
                const availableStr = Math.round(availableSizeMB) + 'M';
                const usePercentStr = usedPercentage + '%';
                const header = "Filesystem     Type        Total     Used Available Use% Mounted on";
                const dataRow =
                    "IndexedDB".padEnd(15) +
                    "AuraFS".padEnd(12) +
                    totalStr.padStart(7) + " " +
                    usedStr.padStart(7) + " " +
                    availableStr.padStart(9) + " " +
                    usePercentStr.padStart(4) + " /";
                this._termLog(header, 'output-text');
                this._termLog(dataRow, 'output-text');
            },
            edit: async (args) => {
                if (!args[0]) {
                    this._termLog('Usage: edit <filepath>', 'output-error');
                    return;
                }
                const resolvedPath = this.resolvePath(this.currentPath, args[0]);
                let fileNode;
                try {
                    fileNode = await dbManager.loadFile(resolvedPath);
                } catch (error) {
                    this._termLog(`Error: File '${resolvedPath}' not found: ${error.message}`, 'output-error');
                    return;
                }

                if (!fileNode || fileNode.type !== 'file') {
                    this._termLog(`Error: File '${resolvedPath}' not found or is not a file (type is ${fileNode ? fileNode.type : 'unknown'}).`, 'output-error');
                    return;
                }
                // Assuming 'notes-app' can handle a filePath in its data
                if (typeof createWindow !== 'undefined') {
                    createWindow('notes-app', { filePath: resolvedPath, title: `Notes - ${resolvedPath.split('/').pop()}` });
                    this._termLog(`Opening ${resolvedPath} in Notes...`, 'output-text');
                } else {
                    this._termLog('Error: createWindow function not available', 'output-error');
                }
            },
            run: (args) => {
                if (!args[0]) {
                    this._termLog('Usage: run <game_id>', 'output-error');
                    return;
                }
                const gameId = args[0];
                const validGameIds = ['aura-snake', 'aura-pong', 'aura-tetris', 'aura-invaders', 'aura-breaker'];

                if (!validGameIds.includes(gameId)) {
                    this._termLog(`Error: Game '${gameId}' not found. Valid games: ${validGameIds.join(', ')}`, 'output-error');
                    return;
                }
                // Assumes game-center can handle a launchGame parameter
                if (typeof createWindow !== 'undefined') {
                    createWindow('game-center', { launchGame: gameId });
                    this._termLog(`Launching ${gameId} via Game Center...`, 'output-text');
                } else {
                    this._termLog('Error: createWindow function not available', 'output-error');
                }
            },
            ps: (args) => {
                const openWindows = document.querySelectorAll('.window:not(.minimized)');
                if (openWindows.length === 0) {
                    this._termLog('No active processes.', 'output-text');
                    return;
                }
                this._termLog('PROCESS NAME         | APP ID             | WINDOW ID', 'output-text');
                this._termLog('---------------------|--------------------|-------------------', 'output-text');
                openWindows.forEach(win => {
                    const windowEl = win;
                    const title = windowEl.querySelector('.window-title')?.textContent || 'Untitled';
                    const uniqueId = windowEl.id;
                    let baseAppId = uniqueId;

                    // Attempt to find the base app ID (e.g. 'notes-app' from 'notes-app-12345')
                    if (typeof apps !== 'undefined') {
                        const appDefinition = Object.entries(apps).find(([id, def]) => uniqueId.startsWith(id));
                        if (appDefinition) {
                            baseAppId = appDefinition[0];
                        }
                    }

                    this._termLog(`${title.padEnd(20).substring(0,20)} | ${baseAppId.padEnd(18).substring(0,18)} | ${uniqueId}`, 'output-text');
                });
            },
            kill: (args) => {
                if (!args[0]) {
                    this._termLog('Usage: kill <window_id>', 'output-error');
                    return;
                }
                const windowIdToKill = args[0];
                const windowEl = document.getElementById(windowIdToKill);

                if (!windowEl) {
                    this._termLog(`Error: Window with ID '${windowIdToKill}' not found.`, 'output-error');
                    return;
                }

                let appId = windowEl.id; // Fallback to full ID
                if (typeof apps !== 'undefined') {
                    const appDefinition = Object.entries(apps).find(([id, def]) => windowIdToKill.startsWith(id));
                    if (appDefinition) {
                        appId = appDefinition[0];
                    }
                }

                if (typeof closeWindow !== 'undefined') {
                    closeWindow(windowIdToKill, appId);
                    this._termLog(`Process ${windowIdToKill} terminated.`, 'output-text');
                } else {
                    this._termLog('Error: closeWindow function not available', 'output-error');
                }
            },
            history: (args) => {
                this.commandHistory.forEach((cmd, index) => {
                    this._termLog(`  ${(index + 1).toString().padStart(3)}  ${cmd}`, 'output-text');
                });
            },
            date: (args) => {
                const now = new Date();
                this._termLog(now.toLocaleString('en-US', {
                    weekday: 'short', year: 'numeric', month: 'short',
                    day: 'numeric', hour: '2-digit', minute: '2-digit',
                    second: '2-digit', hour12: false
                }), 'output-text');
            },
            whoami: (args) => {
                this._termLog('AuraUser', 'output-text');
            },
            about: (args) => {
                const aboutMsg = `
  <span style="color: var(--highlight-primary); white-space: pre;">    ___       </span>
  <span style="color: var(--highlight-primary); white-space: pre;">   /   |      </span> <span style="color: var(--text-color);">AuraOS - Your Creative Space</span>
  <span style="color: var(--highlight-primary); white-space: pre;">  / /| |      </span> <span style="color: var(--subtle-text-color);">Version: 2.0 (Terminal Enhanced)</span>
  <span style="color: var(--highlight-primary); white-space: pre;"> / ___ |      </span> <span style="color: var(--subtle-text-color);">---------------------------------</span>
  <span style="color: var(--highlight-primary); white-space: pre;">/_/  |_|      </span> <span style="color: var(--text-color);">Thanks for using AuraOS!</span>
`;
                this._termLog(aboutMsg, 'output-text');
            },
            ping: (args) => {
                return new Promise((resolve, reject) => {
                    if (!args[0]) {
                        this._termLog('Usage: ping <hostname>', 'output-error');
                        resolve(); // Resolve immediately if usage is wrong, so terminal line renews
                        return;
                    }
                    const hostname = args[0];
                    this._termLog(`PING ${hostname} (simulated):`, 'output-text');

                    let pingsSent = 0;
                    const intervalId = setInterval(() => {
                        if (pingsSent >= 4) {
                            clearInterval(intervalId);
                            if (this.activeIntervals) {
                                this.activeIntervals = this.activeIntervals.filter(id => id !== intervalId);
                            }
                            this._termLog(`
Ping statistics for ${hostname}:
    Packets: Sent = 4, Received = 4, Lost = 0 (0% loss)`, 'output-text');
                            resolve(); // Resolve the promise once pinging is done
                            return;
                        }
                        pingsSent++;
                        const fakeLatency = Math.floor(Math.random() * 100) + 10;
                        const ttl = Math.floor(Math.random() * 50) + 50;
                        this._termLog(`Reply from ${hostname}: bytes=32 time=${fakeLatency}ms TTL=${ttl}`, 'output-text');
                    }, 1000);

                    if (!this.activeIntervals) this.activeIntervals = [];
                    this.activeIntervals.push(intervalId);
                });
            },
            cp: async (args) => {
                // The global copyItem function infers recursion if source is a folder.
                // The -r flag is not strictly needed for the global function but can be kept for user familiarity.
                const paths = args.filter(arg => !arg.startsWith('-r') && !arg.startsWith('-R'));

                if (paths.length !== 2) {
                    this._termLog('Usage: cp [-r] <source_path> <destination_path_or_file>', 'output-error');
                    return;
                }
                const sourcePath = this.resolvePath(this.currentPath, paths[0]);
                const destPath = this.resolvePath(this.currentPath, paths[1]);

                if (typeof copyItem !== 'function') {
                    this._termLog('cp: Global copyItem function is not available.', 'output-error');
                    return;
                }

                try {
                    const success = await copyItem(sourcePath, destPath);
                    if (success) {
                        this._termLog(`'${paths[0]}' copied to '${paths[1]}'`, 'output-text');
                    }
                    // Errors are handled by the global copyItem and should show notifications.
                    // The terminal might log additional context if needed, but primary error display is by copyItem.
                } catch (error) {
                     this._termLog(`cp: operation failed: ${error.message || 'Unknown error'}`, 'output-error');
                }
            },
            mv: async (args) => {
                const paths = args.filter(arg => !arg.startsWith('-'));

                if (paths.length !== 2) {
                    this._termLog('Usage: mv <source> <destination>', 'output-error');
                    return;
                }

                const sourcePath = this.resolvePath(this.currentPath, paths[0]);
                // The second argument to renameItem should be the new name if in the same directory,
                // or the full new path if moving to a different directory or renaming to a different path.
                // The global renameItem is designed to handle this: it takes (oldPath, newNameOrFullPath)
                // If newNameOrFullPath is a simple name, it assumes rename in same parent.
                // If newNameOrFullPath is a path, it attempts to move/rename to that path.
                const newNameOrPath = paths[1];

                if (sourcePath === this.resolvePath(this.currentPath, newNameOrPath)) {
                     this._termLog('mv: source and destination are the same.', 'output-error');
                     return;
                }

                // Prevent moving a directory into itself or a subdirectory of itself.
                // The global renameItem should also have similar checks, but good to have here too.
                const resolvedDestPath = this.resolvePath(this.currentPath, newNameOrPath);
                if (resolvedDestPath.startsWith(sourcePath + '/')) {
                    this._termLog(`mv: cannot move '${sourcePath}' to a subdirectory of itself, '${resolvedDestPath}'`, 'output-error');
                    return;
                }

                if (typeof renameItem !== 'function') {
                    this._termLog('mv: Global renameItem function is not available.', 'output-error');
                    return;
                }

                try {
                    // Pass the user's intended new name or path directly.
                    // The global renameItem will resolve it and handle parent path determination.
                    const success = await renameItem(sourcePath, newNameOrPath);
                    if (success) {
                        this._termLog(`Moved '${paths[0]}' to '${paths[1]}'`, 'output-text');
                    }
                    // Errors are handled by global renameItem and should show notifications.
                } catch (error) {
                     this._termLog(`mv: operation failed: ${error.message || 'Unknown error'}`, 'output-error');
                }
            }
        };
    }

    _termLog(html, className) {
        const logEl = document.createElement('div');
        if (className) logEl.className = className;
        logEl.innerHTML = html;
        this.output.appendChild(logEl);
        this.output.scrollTop = this.output.scrollHeight;
    }

    async _handleCommand(cmdStr) {
        const currentInput = this.output.querySelector('.terminal-line:last-child .terminal-input');
        if (currentInput) {
            currentInput.disabled = true;
        }

        if (cmdStr) {
            this.commandHistory.push(cmdStr);
            if (this.commandHistory.length > 50) { // Limit history size
                this.commandHistory.shift();
            }
            this.historyIndex = this.commandHistory.length;
            // No await here, saving history can be fire and forget
            dbManager.saveSetting('terminalHistory', this.commandHistory)
                .catch(err => console.warn('Terminal: Could not save history', err));
        }

        // Log the command itself
        this._termLog(`<span class="terminal-prompt" style="color: var(--highlight-secondary); margin-right: 8px; white-space: nowrap;">aura@os:${this.currentPath}$</span><span class="command">${cmdStr}</span>`);

        const [cmd, ...args] = cmdStr.split(' ');

        try {
            if (this.commands[cmd]) {
                await this.commands[cmd](args);
            } else if (cmd) {
                this._termLog(`${cmd}: comando não encontrado`, 'output-error');
            }
        } catch (error) {
            console.error(`Error executing command ${cmd}:`, error);
            this._termLog(`Error executing command ${cmd}: ${error.message}`, 'output-error');
        } finally {
            this.output.scrollTop = this.output.scrollHeight; // Ensure scroll after command output
            this._newTermLine();
        }
    }

    _newTermLine() {
        const line = document.createElement('div');
        line.className = 'terminal-line'; // Add class for potential styling
        line.style.display = 'flex';
        line.innerHTML = `<span class="terminal-prompt" style="color: var(--highlight-secondary); margin-right: 8px; white-space: nowrap;">aura@os:${this.currentPath}$</span><input type="text" class="terminal-input" style="flex-grow: 1; background: none; border: none; color: var(--text-color); font-family: 'Fira Code', monospace; outline: none;">`;
        this.output.appendChild(line);

        const input = line.querySelector('.terminal-input');
        input.focus();

        input.addEventListener('keydown', async e => { // Make event listener async
            if (e.key === 'Enter') {
                e.preventDefault();
                // handleCommand is already async, but we don't need to await it here
                // as its completion will trigger _newTermLine itself.
                this._handleCommand(input.value.trim());
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                if (this.historyIndex > 0) {
                    this.historyIndex--;
                    input.value = this.commandHistory[this.historyIndex];
                    input.setSelectionRange(input.value.length, input.value.length); // Move cursor to end
                }
            } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                if (this.historyIndex < this.commandHistory.length - 1) {
                    this.historyIndex++;
                    input.value = this.commandHistory[this.historyIndex];
                    input.setSelectionRange(input.value.length, input.value.length); // Move cursor to end
                } else {
                    this.historyIndex = this.commandHistory.length;
                    input.value = '';
                }
            } else if (e.key === 'Tab') {
                e.preventDefault();
                const currentInputText = input.value;
                const parts = currentInputText.split(' ');
                const currentWord = parts.pop() || '';

                // Determine the command context for argument completion
                // If currentInputText ends with a space, the last part IS the command.
                // If not, and there's only one "part" (or currentWord itself if parts is empty), it's the command.
                // Otherwise, the first part is the command.
                let commandNameForContext = null;
                if (parts.length === 0 && !currentInputText.includes(' ')) { // Completing the command itself
                     // No command context needed, we are completing the command name
                } else if (currentInputText.endsWith(' ') && parts.length > 0) {
                    commandNameForContext = parts[parts.length -1];
                } else if (parts.length > 0) {
                    commandNameForContext = parts[0];
                }


                let opciones = [];
                let fileNodeForType = null;

                if (parts.length === 0 && !currentInputText.includes(' ') ) { // Completing the command name itself
                    opciones = Object.keys(this.commands).filter(cmd => cmd.startsWith(currentWord));
                    // No change to fileNodeForType here, it remains null
                } else { // Completing arguments (files/directories)
                    let prefixToComplete = "";
                    let dirToListFrom = "";
                    let originalPathPrefixTyped = ""; // The part of currentWord before the prefix

                    if (!currentWord.includes('/')) {
                        prefixToComplete = currentWord;
                        dirToListFrom = this.currentPath; // List from current directory
                        originalPathPrefixTyped = "";
                    } else {
                        const lastSlashIndex = currentWord.lastIndexOf('/');
                        prefixToComplete = currentWord.substring(lastSlashIndex + 1);
                        originalPathPrefixTyped = currentWord.substring(0, lastSlashIndex + 1);
                        // Resolve the directory part relative to current path
                        // For example, if currentWord is 'somefolder/other/', resolvePath(this.currentPath, 'somefolder/other/')
                        // If currentWord is '/abs/path/', resolvePath will handle it correctly.
                        dirToListFrom = this.resolvePath(this.currentPath, originalPathPrefixTyped);
                    }

                    try {
                        const itemsInDir = await dbManager.listFiles(dirToListFrom);
                        const potentialMatches = itemsInDir.filter(item => item.name.startsWith(prefixToComplete));

                        if (potentialMatches.length === 1) {
                            fileNodeForType = potentialMatches[0]; // Store the single match object
                            opciones = [fileNodeForType.name];    // Name for completion
                        } else {
                            opciones = potentialMatches.map(item => item.name); // Just names for multiple options
                            fileNodeForType = null; // Not a single match
                        }

                        // Further filter if specific commands expect only folders (e.g. cd)
                        // This filtering should happen on the 'opciones' list of names
                        if (commandNameForContext === 'cd' || commandNameForContext === 'rmdir') {
                            const folderMatchesNames = [];
                            for (const matchName of opciones) {
                                // Find the corresponding full item from potentialMatches to check its type
                                const itemDetail = potentialMatches.find(i => i.name === matchName);
                                if (itemDetail && itemDetail.type === 'folder') {
                                    folderMatchesNames.push(matchName);
                                }
                            }
                            opciones = folderMatchesNames;

                            if (opciones.length === 1) {
                                fileNodeForType = potentialMatches.find(i => i.name === opciones[0] && i.type === 'folder');
                            } else {
                                fileNodeForType = null;
                            }
                        }
                    } catch (err) {
                        console.warn(`Error listing files from '${dirToListFrom}' for tab completion:`, err);
                        // Optionally inform user: this._termLog(`Tab complete error: ${err.message}`, 'output-error');
                        opciones = []; // Clear options on error
                        fileNodeForType = null;
                    }
                }

                if (opciones.length === 1) {
                    const baseCommandInput = parts.join(' ') + (parts.length > 0 ? ' ' : '');
                    // originalPathPrefixTyped is what the user typed before the part we are completing
                    // For command completion, originalPathPrefixTyped is "", fileNodeForType is null.
                    // For argument completion, originalPathPrefixTyped is the path part before the prefix.
                    const completedValue = baseCommandInput + (fileNodeForType ? originalPathPrefixTyped : "") + opciones[0];
                    const nodeType = fileNodeForType ? fileNodeForType.type : null;

                    input.value = (completedValue + (nodeType === 'folder' ? '/' : ' ')).trimStart();
                    input.setSelectionRange(input.value.length, input.value.length);
                } else if (opciones.length > 1) {
                    // For argument completion, show full matched names. For commands, also full names.
                    this._termLog(opciones.join('  '), 'output-text');
                    // We need to re-create the input line because the current one is now disabled by _handleCommand
                    // if the user presses tab multiple times.
                    // However, _newTermLine is called by _handleCommand's finally block.
                    // For multi-tab display, we should just show options and let user continue typing on current line.
                    // The original code called _newTermLine() then set its value.
                    // This is tricky because the event listener is on the *current* input.
                    // A simple solution is to log and then allow the user to continue typing on the *same* line.
                    // The new line will be created when they press Enter.
                    // So, removing the _newTermLine and subsequent input manipulation here for multiple options.
                    // Let's ensure the current input remains focused and value is preserved.
                    input.focus(); // Re-focus might be needed if _termLog causes blur
                    // This part for restoring input to a *new* line is problematic if we don't want a new line yet.
                    // const nextInput = this.output.querySelector('.terminal-line:last-child .terminal-input');
                    // if (nextInput) {
                    //     nextInput.value = currentInputText;
                    //     nextInput.focus();
                    //     nextInput.setSelectionRange(nextInput.value.length, nextInput.value.length);
                    // }
                }
            }
        });
    }
}
