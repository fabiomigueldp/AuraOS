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
                    const homeDirectory = '/Documents'; // Define a default home directory
                    try {
                        const node = await dbManager.loadFile(homeDirectory);
                        if (node && node.type === 'folder') {
                            this.previousPath = this.currentPath;
                            this.currentPath = homeDirectory;
                        } else {
                            this._termLog(`cd: home directory '${homeDirectory}' not found or not a folder.`, 'output-error');
                        }
                    } catch (error) {
                        this._termLog(`cd: error accessing home directory '${homeDirectory}': ${error.message}`, 'output-error');
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
                const dirName = targetPath.split('/').pop();

                // Helper function to create a single directory
                const createSingleDirectory = async (dirPath, name) => {
                    try {
                        // Check if parent exists and is a folder
                        const parentPath = this.resolvePath(dirPath, '..');
                        if (parentPath !== '/') { // Root has no parent to check this way
                            try {
                                const parentNode = await dbManager.loadFile(parentPath);
                                if (parentNode.type !== 'folder') {
                                    this._termLog(`mkdir: cannot create directory '${dirPath}': Parent '${parentPath}' is not a directory.`, 'output-error');
                                    return false;
                                }
                            } catch (e) {
                                // Parent doesn't exist, and -p was not specified for this segment
                                this._termLog(`mkdir: cannot create directory '${dirPath}': Parent directory '${parentPath}' does not exist.`, 'output-error');
                                return false;
                            }
                        }

                        // Check if the item already exists
                        let existingNode;
                        try {
                            existingNode = await dbManager.loadFile(dirPath);
                        } catch (e) {
                            // Doesn't exist, which is good in this case
                        }

                        if (existingNode) {
                            if (existingNode.type === 'folder') {
                                // If -p is used, existing folder is fine. If not, it's an error.
                                if (!createParents) {
                                     this._termLog(`mkdir: cannot create directory '${name}': File or directory exists`, 'output-error');
                                     return false;
                                }
                                return true; // Folder already exists, and that's okay with -p or if it's the final target.
                            } else {
                                this._termLog(`mkdir: cannot create directory '${dirPath}': A file with the same name already exists.`, 'output-error');
                                return false;
                            }
                        }

                        // Create the directory
                        await dbManager.saveFile({ path: dirPath, type: 'folder', name: name, lastModified: Date.now(), content: {} }, {}); // content for folder is empty obj
                        console.log(`UI update needed for path ${dirPath} (mkdir)`); // Placeholder for UI update
                        return true;
                    } catch (error) {
                        this._termLog(`mkdir: failed to create directory '${dirPath}': ${error.message}`, 'output-error');
                        return false;
                    }
                };

                if (createParents) {
                    const parts = targetPath.split('/').filter(p => p);
                    let currentPathToCreate = '';
                    for (let i = 0; i < parts.length; i++) {
                        const part = parts[i];
                        currentPathToCreate += '/' + part;
                        // Normalize path in case of multiple slashes like /Documents///Music -> /Documents/Music
                        currentPathToCreate = currentPathToCreate.replace(/\/\//g, '/');


                        let node;
                        try {
                            node = await dbManager.loadFile(currentPathToCreate);
                        } catch (e) {
                            // Node doesn't exist, attempt to create it
                        }

                        if (node) {
                            if (node.type !== 'folder') {
                                this._termLog(`mkdir: cannot create directory '${targetPath}': Part of path '${currentPathToCreate}' is not a directory.`, 'output-error');
                                return; // Stop if a part of the path is a file
                            }
                            // If it is a folder, continue to the next part
                        } else {
                            // Node doesn't exist, create it
                            const success = await createSingleDirectory(currentPathToCreate, part);
                            if (!success) return; // Stop if creation of an intermediate directory fails
                        }
                    }
                } else {
                    // No -p, just create the target directory
                    await createSingleDirectory(targetPath, dirName);
                }
            },
            touch: async (args) => {
                if (!args[0]) {
                    this._termLog('Usage: touch <filepath>', 'output-error');
                    return;
                }
                const filePath = this.resolvePath(this.currentPath, args[0]);
                const fileName = filePath.split('/').pop();
                const parentPath = this.resolvePath(filePath, '..');

                try {
                    // Check parent directory
                    if (parentPath !== '/') { // Root doesn't need this check
                        const parentNode = await dbManager.loadFile(parentPath);
                        if (parentNode.type !== 'folder') {
                            this._termLog(`touch: cannot create file '${filePath}': Parent '${parentPath}' is not a directory.`, 'output-error');
                            return;
                        }
                    }

                    let existingNode;
                    try {
                        existingNode = await dbManager.loadFile(filePath);
                    } catch (e) {
                        // File doesn't exist, which is fine, we'll create it.
                    }

                    if (existingNode) {
                        // File exists
                        if (existingNode.type === 'file') {
                            // Update lastModified timestamp
                            await dbManager.saveFile({
                                path: filePath,
                                type: 'file',
                                name: fileName,
                                content: existingNode.content, // Preserve content
                                lastModified: Date.now()
                            }, existingNode.content);
                            console.log(`UI update needed for path ${filePath} (touch - existing file timestamp update)`);
                        } else {
                            this._termLog(`touch: cannot touch '${filePath}': It exists and is not a file (it's a ${existingNode.type}).`, 'output-error');
                        }
                    } else {
                        // File does not exist, create it
                        await dbManager.saveFile({
                            path: filePath,
                            type: 'file',
                            name: fileName,
                            content: '',
                            lastModified: Date.now()
                        }, '');
                        console.log(`UI update needed for path ${filePath} (touch - new file created)`);
                    }
                } catch (error) {
                     this._termLog(`touch: failed to process file '${filePath}': ${error.message}`, 'output-error');
                }
            },
            rm: async (args) => {
                const recursive = args.includes('-r') || args.includes('--recursive');
                const targetNameArg = args.find(arg => !arg.startsWith('-'));

                if (!targetNameArg) {
                    this._termLog('Usage: rm [-r] <file/directory>', 'output-error');
                    return;
                }

                const path = this.resolvePath(this.currentPath, targetNameArg);

                let nodeToDelete;
                try {
                    nodeToDelete = await dbManager.loadFile(path);
                } catch (error) {
                    this._termLog(`rm: cannot remove '${targetNameArg}': No such file or directory. ${error.message}`, 'output-error');
                    return;
                }

                if (nodeToDelete.type === 'folder') {
                    if (!recursive) {
                        // Check if directory is empty
                        try {
                            const children = await dbManager.listFiles(path);
                            if (children && children.length > 0) {
                                this._termLog(`rm: cannot remove '${targetNameArg}': Directory is not empty. Use -r to remove recursively.`, 'output-error');
                                return;
                            }
                        } catch (error) {
                            this._termLog(`rm: error checking if directory '${targetNameArg}' is empty: ${error.message}`, 'output-error');
                            return;
                        }
                    } else {
                        // Recursive deletion
                        const deleteRecursive = async (currentPath) => {
                            let children;
                            try {
                                children = await dbManager.listFiles(currentPath);
                            } catch (e) {
                                // If listing fails for a subdirectory, maybe it was already deleted or an error occurred
                                console.warn(`rm: Could not list files in ${currentPath} during recursive delete: ${e.message}`);
                                children = []; // Assume empty or inaccessible
                            }

                            for (const child of children) {
                                if (child.type === 'folder') {
                                    await deleteRecursive(child.path); // child.path should be the full path
                                } else {
                                    try {
                                        await dbManager.deleteFile(child.path);
                                        console.log(`UI update needed for path ${child.path} (rm -r file)`);
                                    } catch (error) {
                                        this._termLog(`rm: failed to remove file '${child.path}' during recursive delete: ${error.message}`, 'output-error');
                                        // Optionally, re-throw or collect errors to stop the whole process
                                    }
                                }
                            }
                            // After deleting all children, delete the folder itself
                            try {
                                await dbManager.deleteFile(currentPath);
                                console.log(`UI update needed for path ${currentPath} (rm -r folder)`);
                            } catch (error) {
                                this._termLog(`rm: failed to remove folder '${currentPath}' during recursive delete: ${error.message}`, 'output-error');
                                // Optionally, re-throw or collect errors
                            }
                        };
                        await deleteRecursive(path);
                        this._termLog(`Recursively removed '${targetNameArg}'`, 'output-text');
                        return; // Exit after recursive delete logic
                    }
                }

                // Non-recursive deletion for files or empty folders
                try {
                    await dbManager.deleteFile(path);
                    this._termLog(`Removed '${targetNameArg}'`, 'output-text');
                    console.log(`UI update needed for path ${path} (rm)`);
                } catch (error) {
                    this._termLog(`rm: failed to remove '${targetNameArg}': ${error.message}`, 'output-error');
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
                const recursive = args.includes('-r') || args.includes('-R');
                const paths = args.filter(arg => !arg.startsWith('-'));

                if (paths.length !== 2) {
                    this._termLog('Usage: cp [-r | -R] <source> <destination>', 'output-error');
                    return;
                }

                const sourcePath = this.resolvePath(this.currentPath, paths[0]);
                const destPath = this.resolvePath(this.currentPath, paths[1]);

                const getFileName = (path) => path.substring(path.lastIndexOf('/') + 1);


                const copyItemRecursive = async (src, dest) => {
                    let sourceNode;
                    try {
                        sourceNode = await dbManager.loadFile(src);
                    } catch (error) {
                        this._termLog(`cp: cannot stat '${src}': No such file or directory`, 'output-error');
                        throw error; // Propagate error to stop further processing if a source is missing
                    }

                    if (sourceNode.type === 'folder') {
                        if (!recursive) {
                            this._termLog(`cp: -r not specified; omitting directory '${src}'`, 'output-error');
                            return; // Do not throw, just skip this directory
                        }

                        // Create destination directory
                        try {
                            // Check if dest itself exists and is a file
                            let destNodeCheck;
                            try { destNodeCheck = await dbManager.loadFile(dest); } catch(e) {/*ok*/}
                            if(destNodeCheck && destNodeCheck.type === 'file'){
                                this._termLog(`cp: cannot overwrite non-directory '${dest}' with directory '${src}'`, 'output-error');
                                throw new Error("Destination is a file");
                            }
                            // Ensure parent of dest exists if dest is a new subdir
                            const destParentPath = this.resolvePath(dest, '..');
                            if (destParentPath !== '/' && destParentPath !== dest) {
                                try {
                                    const destParentNode = await dbManager.loadFile(destParentPath);
                                    if (destParentNode.type !== 'folder') {
                                        this._termLog(`cp: cannot create directory '${dest}': Parent '${destParentPath}' is not a directory.`, 'output-error');
                                        throw new Error("Destination parent not a folder");
                                    }
                                } catch (e) {
                                    this._termLog(`cp: cannot create directory '${dest}': Parent directory '${destParentPath}' does not exist.`, 'output-error');
                                    throw new Error("Destination parent does not exist");
                                }
                            }


                            await dbManager.saveFile({ path: dest, type: 'folder', name: getFileName(dest), lastModified: Date.now(), content: {} }, {});
                            console.log(`UI update needed for path ${dest} (cp folder created)`);
                        } catch (error) {
                            this._termLog(`cp: failed to create directory '${dest}': ${error.message}`, 'output-error');
                            throw error; // Propagate
                        }

                        let items;
                        try {
                            items = await dbManager.listFiles(src);
                        } catch (error) {
                            this._termLog(`cp: cannot list items in '${src}': ${error.message}`, 'output-error');
                            throw error; // Propagate
                        }

                        for (const item of items) {
                            // item.path is full path of source item, item.name is just the name
                            await copyItemRecursive(item.path, this.resolvePath(dest, item.name));
                        }
                    } else { // It's a file
                        let destNodeForFile;
                        try {
                            destNodeForFile = await dbManager.loadFile(dest);
                        } catch (e) {
                            // Destination does not exist, which is fine for file copy to a new name.
                            // Or, it could be that `dest` is a directory.
                        }

                        let finalDestPath = dest;
                        if (destNodeForFile && destNodeForFile.type === 'folder') {
                            // If dest is an existing directory, copy source file *into* it
                            finalDestPath = this.resolvePath(dest, getFileName(src));
                        }

                        // Ensure parent of finalDestPath exists if it's a new file in a non-root directory
                         const finalDestParentPath = this.resolvePath(finalDestPath, '..');
                         if (finalDestParentPath !== '/' && finalDestParentPath !== finalDestPath) {
                             try {
                                 const finalDestParentNode = await dbManager.loadFile(finalDestParentPath);
                                 if (finalDestParentNode.type !== 'folder') {
                                     this._termLog(`cp: cannot create file '${finalDestPath}': Parent '${finalDestParentPath}' is not a directory.`, 'output-error');
                                     throw new Error("Destination parent for file not a folder");
                                 }
                             } catch (e) {
                                 this._termLog(`cp: cannot create file '${finalDestPath}': Parent directory '${finalDestParentPath}' does not exist.`, 'output-error');
                                 throw new Error("Destination parent for file does not exist");
                             }
                         }


                        try {
                            await dbManager.saveFile({
                                path: finalDestPath,
                                type: 'file',
                                name: getFileName(finalDestPath),
                                content: sourceNode.content || sourceNode.data || '',
                                lastModified: Date.now()
                            }, sourceNode.content || sourceNode.data || '');
                            console.log(`UI update needed for path ${finalDestPath} (cp file created/updated)`);
                        } catch (error) {
                            this._termLog(`cp: failed to copy file '${src}' to '${finalDestPath}': ${error.message}`, 'output-error');
                            throw error; // Propagate
                        }
                    }
                };

                try {
                    await copyItemRecursive(sourcePath, destPath);
                } catch (error) {
                    // Error messages are already logged by copyItemRecursive or initial checks
                    // console.error("cp operation failed:", error); // Optional additional logging
                    throw error; // Re-throw the error so mv can catch it
                }
            },
            mv: async (args) => {
                // mv command will use the same recursive copy logic and then remove source
                const paths = args.filter(arg => !arg.startsWith('-')); // mv doesn't typically use -r, recursion is default for dirs

                if (paths.length !== 2) {
                    this._termLog('Usage: mv <source> <destination>', 'output-error');
                    return;
                }

                const sourcePath = this.resolvePath(this.currentPath, paths[0]);
                const destPath = this.resolvePath(this.currentPath, paths[1]);

                if (sourcePath === destPath) {
                    this._termLog('mv: source and destination are the same.', 'output-error');
                    return;
                }

                // Prevent moving a directory into itself or a subdirectory of itself.
                if (destPath.startsWith(sourcePath + '/')) {
                    this._termLog(`mv: cannot move '${sourcePath}' to a subdirectory of itself, '${destPath}'`, 'output-error');
                    return;
                }

                let sourceNodeInitial;
                try {
                    sourceNodeInitial = await dbManager.loadFile(sourcePath);
                } catch (error) {
                    this._termLog(`mv: cannot stat '${sourcePath}': No such file or directory`, 'output-error');
                    return;
                }

                const isRecursiveMove = sourceNodeInitial.type === 'folder';

                try {
                    // 1. Perform the copy operation
                    // Re-using the cp logic by calling it directly.
                    // Need to pass appropriate args for cp.
                    // cp expects args like ['-r', source, dest] or [source, dest]
                    const cpArgs = [];
                    if (isRecursiveMove) cpArgs.push('-r'); // cp needs -r for directories
                    cpArgs.push(sourcePath); // cp needs absolute paths here
                    cpArgs.push(destPath);

                    // Directly call the cp command's function
                    await this.commands.cp.call(this, cpArgs); // Pass `this` context

                    // Check if any error was logged by cp by inspecting the last terminal output
                    // This is a bit of a hack. Ideally, cp would throw an error or return a status.
                    const lastLogEntry = this.output.lastChild;
                    let cpFailed = false;
                    if (lastLogEntry && lastLogEntry.classList.contains('output-error')) {
                         // Heuristic: if last log was an error, assume cp failed.
                         // This is not perfectly reliable as other async operations could log.
                         // A better way would be for cp to throw an exception on failure.
                         // For now, we assume copyItemRecursive in cp throws and is caught by cp's try/catch.
                         // If cp's main try/catch re-throws, this outer mv try/catch will catch it.
                         // The current cp implementation logs errors but doesn't always re-throw.
                         // Let's assume for now if an error occurred, it was logged and we should not proceed with rm.
                         // A more robust solution is needed here. For this iteration, if no specific error thrown from cp,
                         // we check if source still exists. If it does, we proceed with rm.
                         // This means if partial copy happened, source is still deleted.
                    }


                    // 2. Perform the remove operation on the source
                    // rm command expects args like ['-r', path] or [path]
                    const rmArgs = [];
                    if (isRecursiveMove) { // rm also needs -r for directories
                        rmArgs.push('-r');
                    }
                    rmArgs.push(sourcePath); // rm needs an absolute path

                    await this.commands.rm.call(this, rmArgs); // Pass `this` context

                    this._termLog(`Moved '${sourcePath}' to '${destPath}'`, 'output-text');
                    // UI updates are logged by cp and rm individually
                } catch (error) {
                    this._termLog(`mv: operation failed: ${error.message}`, 'output-error');
                    // If copy succeeded but rm failed, user has a copy.
                    // If copy failed, this catch handles it.
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
