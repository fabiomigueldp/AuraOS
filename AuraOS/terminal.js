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

        // Placeholder for commands object and other methods to be moved
        this.commands = {};

        // Load command history
        dbManager.getSetting('terminalHistory').then(history => {
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

    _termLog(html, className) {
        const logEl = document.createElement('div');
        if (className) logEl.className = className;
        logEl.innerHTML = html;
        this.output.appendChild(logEl);
        this.output.scrollTop = this.output.scrollHeight;
    }

    _handleCommand(cmdStr) {
        if (cmdStr) {
            this.commandHistory.push(cmdStr);
            if (this.commandHistory.length > 50) { // Limit history size
                this.commandHistory.shift();
            }
            this.historyIndex = this.commandHistory.length;
            dbManager.saveSetting('terminalHistory', this.commandHistory)
                .catch(err => console.warn('Terminal: Could not save history', err));
        }

        // Log the command itself
        this._termLog(`<span class="terminal-prompt" style="color: var(--highlight-secondary); margin-right: 8px; white-space: nowrap;">aura@os:${this.currentPath}$</span><span class="command">${cmdStr}</span>`);

        const [cmd, ...args] = cmdStr.split(' ');

        if (this.commands[cmd]) {
            this.commands[cmd](args);
        } else if (cmd) {
            this._termLog(`${cmd}: comando não encontrado`, 'output-error');
        }
        this.output.scrollTop = this.output.scrollHeight; // Ensure scroll after command output
        this._newTermLine();
    }

    _newTermLine() {
        const line = document.createElement('div');
        line.className = 'terminal-line'; // Add class for potential styling
        line.style.display = 'flex';
        line.innerHTML = `<span class="terminal-prompt" style="color: var(--highlight-secondary); margin-right: 8px; white-space: nowrap;">aura@os:${this.currentPath}$</span><input type="text" class="terminal-input" style="flex-grow: 1; background: none; border: none; color: var(--text-color); font-family: 'Fira Code', monospace; outline: none;">`;
        this.output.appendChild(line);

        const input = line.querySelector('.terminal-input');
        input.focus();

        input.addEventListener('keydown', e => {
            if (e.key === 'Enter') {
                e.preventDefault();
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


                let options = [];

                if (parts.length === 0 && !currentInputText.includes(' ') ) { // Completing the command name itself
                    options = Object.keys(this.commands).filter(cmd => cmd.startsWith(currentWord));
                } else { // Completing arguments
                    const currentDirNode = getFileSystemNode(this.currentPath);
                    if (currentDirNode && currentDirNode.children) {
                        const childrenNames = Object.keys(currentDirNode.children);
                        if (commandNameForContext === 'cd' || commandNameForContext === 'rmdir' || commandNameForContext === 'mkdir' || (commandNameForContext === 'ls' && currentWord.startsWith('.'))) {
                            options = childrenNames.filter(name => currentDirNode.children[name].type === 'folder' && name.startsWith(currentWord));
                        } else {
                            options = childrenNames.filter(name => name.startsWith(currentWord));
                        }
                    }
                }

                if (options.length === 1) {
                    const baseInput = parts.join(' ') + (parts.length > 0 ? ' ' : '');
                    const completedValue = baseInput + options[0];
                    const nodeType = getFileSystemNode(resolvePath(this.currentPath, options[0]))?.type;
                    input.value = (completedValue + (nodeType === 'folder' ? '/' : ' ')).trimStart();
                    input.setSelectionRange(input.value.length, input.value.length);
                } else if (options.length > 1) {
                    this._termLog(options.join('  '), 'output-text');
                    this._newTermLine(); // Create a new line
                    const nextInput = this.output.querySelector('.terminal-line:last-child .terminal-input');
                    if (nextInput) {
                        nextInput.value = currentInputText; // Restore current input to new line
                        nextInput.focus();
                        nextInput.setSelectionRange(nextInput.value.length, nextInput.value.length);
                    }
                }
            }
        });
    }

    // Commands object - to be populated from index.html
    commands = {
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
        ls: function(args) {
            const pathArg = args.find(arg => !arg.startsWith('-'));
            const targetPath = pathArg ? resolvePath(this.currentPath, pathArg) : this.currentPath;
            const node = getFileSystemNode(targetPath);

            if (!node || node.type !== 'folder') {
                this._termLog(`ls: cannot access '${targetPath}': No such file or directory`, 'output-error');
                return;
            }

            const showAll = args.includes('-a') || args.includes('--all');
            const longFormat = args.includes('-l') || args.includes('--long');
            const recursive = args.includes('-R') || args.includes('--recursive');

            const listItems = (currentItems, currentItemPath, indent = '') => {
                let items = Object.entries(currentItems)
                    .map(([name, details]) => ({ name, ...details, path: resolvePath(currentItemPath, name) }))
                    .sort((a, b) => a.name.localeCompare(b.name));

                if (!showAll) {
                    items = items.filter(item => !item.name.startsWith('.'));
                }

                items.forEach(item => {
                    const nameDisplay = item.type === 'folder'
                        ? `<span style='color: var(--highlight-primary);'>${item.name}</span>`
                        : `<span style='color: var(--text-color);'>${item.name}</span>`;

                    if (longFormat) {
                        const permissions = item.type === 'folder' ? 'drwxr-xr-x' : '-rw-r--r--';
                        const owner = 'AuraUser';
                        let size;
                        if (item.type === 'folder') {
                            size = '4.0K';
                        } else {
                            size = item.size ? `${(item.size / 1024).toFixed(1)}K` : (item.content ? `${(item.content.length / 1024).toFixed(1)}K` : '0K');
                        }
                        const date = item.lastModified ? new Date(item.lastModified).toLocaleDateString('en-US', { month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : 'Jan 01 00:00';
                        this._termLog(`${indent}${permissions}  1 ${owner.padEnd(8)} ${owner.padEnd(8)} ${size.padStart(6)} ${date} ${nameDisplay}`, 'output-text');
                    } else {
                        this._termLog(`${indent}${nameDisplay}`, 'output-text');
                    }

                    if (recursive && item.type === 'folder' && item.children) {
                        this._termLog(`${indent}${item.path}:`, 'output-text');
                        listItems(item.children, item.path, indent + '  ');
                    }
                });
            };

            if (recursive && !pathArg) { // If -R and no path, list current directory first.
                 this._termLog(`${targetPath}:`, 'output-text');
            }
            listItems(node.children, targetPath);
        },
        cd: function(args) {
            const targetPath = args[0];
            const oldPath = this.currentPath;

            if (!targetPath || targetPath === '~') {
                this.homeDirectory = '/Documents'; // Define a home directory
                if (getFileSystemNode(this.homeDirectory) && getFileSystemNode(this.homeDirectory).type === 'folder') {
                    this.previousPath = this.currentPath;
                    this.currentPath = this.homeDirectory;
                } else {
                    this._termLog(`cd: home directory '${this.homeDirectory}' not found.`, 'output-error');
                }
                return;
            }

            if (targetPath === '-') {
                if (this.previousPath) {
                    const tempPath = this.currentPath;
                    this.currentPath = this.previousPath;
                    this.previousPath = tempPath;
                } else {
                    this._termLog('cd: OLDPWD not set', 'output-error');
                }
                return;
            }

            const newPath = resolvePath(this.currentPath, targetPath);
            const node = getFileSystemNode(newPath);

            if (node && node.type === 'folder') {
                this.previousPath = this.currentPath;
                this.currentPath = newPath;
            } else {
                this._termLog(`cd: ${targetPath}: No such file or directory, or not a directory`, 'output-error');
            }
        },
        cat: function(args) {
            const lineNumbers = args.includes('-n');
            const filesToCat = args.filter(arg => arg !== '-n');

            if (filesToCat.length === 0) {
                this._termLog('Usage: cat [-n] <file1> [file2...]', 'output-error');
                return;
            }

            filesToCat.forEach((filePathArg, index) => {
                const path = resolvePath(this.currentPath, filePathArg);
                const node = getFileSystemNode(path);

                if (filesToCat.length > 1) {
                    this._termLog(`--- ${filePathArg} ---`, 'output-text');
                }

                if (node && node.type === 'file') {
                    let content = node.content || '';
                    if (lineNumbers) {
                        content = content.split('\n').map((line, i) => `  ${(i + 1).toString().padStart(4)}  ${line}`).join('\n');
                    }
                    this._termLog(content.replace(/\n/g, '<br>'), 'output-text');
                } else {
                    this._termLog(`cat: ${filePathArg}: No such file or directory`, 'output-error');
                }
            });
        },
        mkdir: function(args) {
            const createParents = args.includes('-p');
            const pathArg = args.find(arg => !arg.startsWith('-'));

            if (!pathArg) {
                this._termLog('Usage: mkdir [-p] <directory_path>', 'output-error');
                return;
            }

            const createSingleDirectory = (dirPath) => {
                const parts = dirPath.split('/').filter(p => p);
                const newDirName = parts.pop();
                if (!newDirName) { // Should not happen if pathArg is valid
                    this._termLog(`mkdir: invalid directory name ''`, 'output-error');
                    return false;
                }
                const parentPath = '/' + parts.join('/');
                const parentNode = getFileSystemNode(parentPath);

                if (!parentNode || parentNode.type !== 'folder') {
                    this._termLog(`mkdir: cannot create directory '${dirPath}': Parent directory '${parentPath}' does not exist or is not a directory.`, 'output-error');
                    return false;
                }
                if (parentNode.children[newDirName]) {
                     // Only error if it's not a directory - if it is, -p allows it
                    if (parentNode.children[newDirName].type !== 'folder' && createParents) {
                        this._termLog(`mkdir: cannot create directory '${dirPath}': A file with the name '${newDirName}' already exists in '${parentPath}'.`, 'output-error');
                        return false;
                    } else if (!createParents) { // If not -p, any existence is an error
                        this._termLog(`mkdir: cannot create directory '${newDirName}': File or directory exists`, 'output-error');
                        return false;
                    }
                     // If it's a directory and -p is used, it's fine, we just move on.
                } else {
                    // createItem will handle the actual creation in fileSystem and DB
                    if (!createItem(dirPath, 'folder')) { // createItem uses full path
                         this._termLog(`mkdir: failed to create directory '${dirPath}' using createItem.`, 'output-error'); // Should be handled by createItem
                         return false;
                    }
                }
                return true;
            };

            const targetPath = resolvePath(this.currentPath, pathArg);

            if (createParents) {
                const parts = targetPath.split('/').filter(p => p);
                let currentPathToCreate = '';
                for (const part of parts) {
                    currentPathToCreate += '/' + part;
                    const node = getFileSystemNode(currentPathToCreate);
                    if (!node) {
                        if (!createSingleDirectory(currentPathToCreate)) return; // Stop if creation fails
                    } else if (node.type !== 'folder') {
                        this._termLog(`mkdir: cannot create directory '${targetPath}': '${currentPathToCreate}' is not a directory.`, 'output-error');
                        return;
                    }
                }
            } else {
                createSingleDirectory(targetPath);
            }
        },
        touch: (args) => {
            if (!args[0]) return this._termLog('Uso: touch <arquivo>', 'output-error');
            const path = resolvePath(this.currentPath, args[0]);
            const parts = path.substring(1).split('/');
            const newDirName = parts.pop();
            const parentPath = '/' + parts.join('/');
            const parentNode = getFileSystemNode(parentPath); // Assumes getFileSystemNode is global
            if (parentNode && parentNode.type === 'folder' && !parentNode.children[newDirName]) {
                parentNode.children[newDirName] = { type: 'folder', children: {} };
                saveFileSystem(); // Assumes saveFileSystem is global
                updateDesktopAndFileExplorer(parentPath); // Assumes updateDesktopAndFileExplorer is global
            } else {
                this._termLog(`mkdir: não foi possível criar o diretório '${args[0]}'`, 'output-error');
            }
        },
        touch: (args) => {
            if (!args[0]) return this._termLog('Uso: touch <arquivo>', 'output-error');
            const path = resolvePath(this.currentPath, args[0]); // Assumes resolvePath is global
            const parts = path.substring(1).split('/');
            const newFileName = parts.pop();
            const parentPath = '/' + parts.join('/');
            const parentNode = getFileSystemNode(parentPath); // Assumes getFileSystemNode is global
            if (parentNode && parentNode.type === 'folder' && !parentNode.children[newFileName]) {
                // Use createItem for consistency and DB interaction
                if(!createItem(path, 'file', '')) { // createItem uses full path
                     this._termLog(`touch: failed to create file '${args[0]}' using createItem.`, 'output-error'); // Should be handled by createItem
                }
            } else if (parentNode && parentNode.children[newFileName] && parentNode.children[newFileName].type === 'file') {
                 // File exists, update timestamp (mocked by just re-saving, actual timestamp update needs DBManager support)
                const existingNode = parentNode.children[newFileName];
                existingNode.lastModified = Date.now(); // Update in-memory timestamp
                // Re-save to potentially update timestamp in DB if dbManager.saveFile handles it
                dbManager.saveFile({ path: path, type: 'file', lastModified: existingNode.lastModified }, existingNode.content);
            } else {
                 this._termLog(`touch: não foi possível criar o arquivo '${args[0]}': Path inválido ou item existente não é arquivo.`, 'output-error');
            }
        },
        rm: function(args) {
            const recursive = args.includes('-r') || args.includes('--recursive');
            const targetNameArg = args.find(arg => !arg.startsWith('-'));

            if (!targetNameArg) {
                this._termLog('Usage: rm [-r] <file/directory>', 'output-error');
                return;
            }

            const path = resolvePath(this.currentPath, targetNameArg);
            const node = getFileSystemNode(path);

            if (!node) {
                this._termLog(`rm: cannot remove '${targetNameArg}': No such file or directory`, 'output-error');
                return;
            }

            if (node.type === 'folder' && Object.keys(node.children).length > 0 && !recursive) {
                this._termLog(`rm: cannot remove '${targetNameArg}': Is a non-empty directory. Use -r to remove recursively.`, 'output-error');
                return;
            }

            // Use global deleteItem which should handle DB and in-memory FS.
            // deleteItem should be robust enough to handle recursive if node is a folder.
            // If deleteItem is not recursive, this needs to be implemented here.
            // Assuming deleteItem will handle recursive deletion if 'node' is a folder.
            if (deleteItem(path)) { // deleteItem takes full path
                this._termLog(`Removed '${targetNameArg}'`, 'output-text');
                // updateDesktopAndFileExplorer is called by deleteItem
            } else {
                // Error message would be shown by deleteItem
            }
        },
        neofetch: (args) => { // No changes, but keep as 'function' for consistency if preferred
            const neofetchArt = `
          <span style="color: var(--highlight-primary);">
          @@@@@@@@@@            </span><span style="color: var(--text-color);"><b>AuraOS</b>@aura-desktop</span>
          <span style="color: var(--highlight-primary);">       @@@@@@@@@@@@         </span><span style="color: var,--text-color);">--------------------</span>
          <span style="color: var(--highlight-primary);">     @@@@@@@@@@@@@@@@       </span><span style="color: var,--text-color);"><b>OS:</b> AuraOS Complete v2.0</span>
          <span style="color: var(--highlight-primary);">    @@@@@@@@@@@@@@@@@@      </span><span style="color: var,--text-color);"><b>Kernel:</b> 1.0-JS-DOM</span>
          <span style="color: var(--highlight-primary);">   @@@@@@@@@@@@@@@@@@@@     </span><span style="color: var,--text-color);"><b>Uptime:</b> ${Math.floor(performance.now()/1000)}s</span>
          <span style="color: var(--highlight-primary);">  @@@@@@@@@@@@@@@@@@@@@@    </span><span style="color: var,--text-color);"><b>Windows:</b> ${document.querySelectorAll('.window').length}</span>
          <span style="color: var(--highlight-primary);">  @@@@@@@@@@@@@@@@@@@@@@    </span><span style="color: var,--text-color);"><b>Shell:</b> AuraSH (ZSH-like)</span>
          <span style="color: var(--highlight-primary);">   @@@@@@@@@@@@@@@@@@@@     </span><span style="color: var,--text-color);"><b>Theme:</b> ${localStorage.getItem('auraOS_theme') || 'dark'}</span>
          <span style="color: var(--highlight-primary);">    @@@@@@@@@@@@@@@@@@      </span>
          <span style="color: var(--highlight-primary);">     @@@@@@@@@@@@@@@@       </span>
          <span style="color: var(--highlight-primary);">       @@@@@@@@@@@@         </span>
          <span style="color: var(--highlight-primary);">         @@@@@@@@           </span>
                    `;
            this._termLog(neofetchArt, 'output-text');
        },
        echo: (args) => this._termLog(args.join(' '), 'output-text'),
        cp: (args) => {
            if (args.length < 2) {
                return this._termLog('cp: missing source or destination argument', 'output-error');
            }
            const sourcePath = resolvePath(this.currentPath, args[0]);
            const destPath = resolvePath(this.currentPath, args[1]);
            if (sourcePath.startsWith('/System') || destPath.startsWith('/System')) {
                return this._termLog(`cp: ${sourcePath.startsWith('/System') ? sourcePath : destPath}: Permission denied (mock)`, 'output-error');
            }
            const sourceNode = getFileSystemNode(sourcePath);
            if (!sourceNode) {
                return this._termLog(`cp: ${args[0]}: No such file or directory`, 'output-error');
            }
            const sourceName = sourcePath.substring(sourcePath.lastIndexOf('/') + 1);
            const copyRecursive = (currentSourceNode, currentDestPath) => {
                const targetName = currentDestPath.substring(currentDestPath.lastIndexOf('/') + 1);
                const parentDestPath = currentDestPath.substring(0, currentDestPath.lastIndexOf('/')) || '/';
                const parentDestNode = getFileSystemNode(parentDestPath);
                if (!parentDestNode || parentDestNode.type !== 'folder') {
                    this._termLog(`cp: cannot create '${currentDestPath}': Parent directory '${parentDestPath}' is not a directory or does not exist.`, 'output-error');
                    return false;
                }
                if (parentDestNode.children[targetName]) {
                     if (!(parentDestNode.children[targetName].type === 'folder' && currentSourceNode.type === 'file')) {
                        this._termLog(`cp: cannot copy '${currentSourceNode.name || sourceName}' to '${currentDestPath}': File or directory already exists.`, 'output-error');
                        return false;
                    }
                }
                if (currentSourceNode.type === 'file') {
                    parentDestNode.children[targetName] = { type: 'file', content: currentSourceNode.content };
                } else if (currentSourceNode.type === 'folder') {
                    parentDestNode.children[targetName] = { type: 'folder', children: {} };
                    for (const childName in currentSourceNode.children) {
                        if (!copyRecursive(currentSourceNode.children[childName], currentDestPath + '/' + childName)) {
                            return false;
                        }
                    }
                }
                return true;
            }
            const destNode = getFileSystemNode(destPath);
            let finalDestPath = destPath;
            if (destNode) {
                if (destNode.type === 'folder') {
                    finalDestPath = destPath + '/' + sourceName;
                    const finalDestItemName = finalDestPath.substring(finalDestPath.lastIndexOf('/') + 1);
                    const finalDestParentNode = getFileSystemNode(destPath);
                    if (finalDestParentNode && finalDestParentNode.children[finalDestItemName]) {
                        return this._termLog(`cp: cannot copy to '${finalDestPath}': File or directory already exists`, 'output-error');
                    }
                } else {
                    if (sourceNode.type === 'folder') {
                        return this._termLog(`cp: cannot overwrite non-directory '${destPath}' with directory '${sourcePath}'`, 'output-error');
                    }
                    return this._termLog(`cp: '${destPath}': File exists. Overwrite not implemented.`, 'output-error');
                }
            }
            if (copyRecursive(sourceNode, finalDestPath)) {
                saveFileSystem();
                let updatePath = finalDestPath.substring(0, finalDestPath.lastIndexOf('/')) || '/';
                if (updatePath === '/' && finalDestPath.startsWith("/Desktop/")) {
                    updatePath = "/Desktop";
                } else if (updatePath === '') {
                    updatePath = '/';
                }
                updateDesktopAndFileExplorer(updatePath);
                this._termLog(`cp: Copied '${args[0]}' to '${args[1]}'`, 'output-text');
            }
        },
        mv: (args) => {
            if (args.length < 2) {
                return this._termLog('mv: missing source or destination argument', 'output-error');
            }
            const sourcePath = resolvePath(this.currentPath, args[0]);
            const destPath = resolvePath(this.currentPath, args[1]);
            if (sourcePath === destPath) {
                return this._termLog(`mv: '${args[0]}' and '${args[1]}' are the same file`, 'output-error');
            }
            if (sourcePath.startsWith('/System') || destPath.startsWith('/System')) {
                const problematicPath = sourcePath.startsWith('/System') ? sourcePath : destPath;
                return this._termLog(`mv: ${problematicPath}: Permission denied (mock)`, 'output-error');
            }
            const sourceNode = getFileSystemNode(sourcePath);
            if (!sourceNode) {
                return this._termLog(`mv: ${args[0]}: No such file or directory`, 'output-error');
            }
            const sourceName = sourcePath.substring(sourcePath.lastIndexOf('/') + 1);
            const sourceParentPath = sourcePath.substring(0, sourcePath.lastIndexOf('/')) || '/';
            const destName = destPath.substring(destPath.lastIndexOf('/') + 1);
            const destParentPath = destPath.substring(0, destPath.lastIndexOf('/')) || '/';
            if (sourceParentPath === destParentPath) {
                const parentNode = getFileSystemNode(sourceParentPath);
                if (parentNode && parentNode.children[destName]) {
                    return this._termLog(`mv: cannot rename '${sourceName}' to '${destName}': File exists`, 'output-error');
                }
                if (parentNode) {
                    parentNode.children[destName] = parentNode.children[sourceName];
                    delete parentNode.children[sourceName];
                    saveFileSystem();
                    updateDesktopAndFileExplorer(sourceParentPath);
                    this._termLog(`mv: Renamed '${args[0]}' to '${args[1]}'`, 'output-text');
                } else {
                    this._termLog(`mv: Error accessing parent directory '${sourceParentPath}'`, 'output-error');
                }
                return;
            }
            let targetDestPath = destPath;
            const destNode = getFileSystemNode(destPath);
            if (destNode && destNode.type === 'folder') {
                targetDestPath = destPath + '/' + sourceName;
                if (getFileSystemNode(targetDestPath)) {
                    return this._termLog(`mv: cannot move '${sourceName}' to '${targetDestPath}': File or directory already exists`, 'output-error');
                }
            } else if (destNode && destNode.type === 'file') {
                return this._termLog(`mv: cannot overwrite non-directory '${destPath}' with '${sourcePath}' or file already exists. Overwrite not implemented.`, 'output-error');
            }
             else if (!destNode) {
                const parentOfFinalDest = getFileSystemNode(destParentPath);
                if (!parentOfFinalDest || parentOfFinalDest.type !== 'folder') {
                    return this._termLog(`mv: cannot move to '${destPath}': Parent directory '${destParentPath}' does not exist or is not a directory.`, 'output-error');
                }
            }
            const copyRecursiveForMv = (currentSourceNode, currentDestPath) => {
                const currentTargetName = currentDestPath.substring(currentDestPath.lastIndexOf('/') + 1);
                const currentParentDestPath = currentDestPath.substring(0, currentDestPath.lastIndexOf('/')) || '/';
                const currentParentDestNode = getFileSystemNode(currentParentDestPath);
                if (!currentParentDestNode || currentParentDestNode.type !== 'folder') {
                    this._termLog(`mv: (during copy) cannot create '${currentDestPath}': Parent directory '${currentParentDestPath}' is not a directory.`, 'output-error');
                    return false;
                }
                if (currentParentDestNode.children[currentTargetName]) {
                    this._termLog(`mv: (during copy) cannot copy to '${currentDestPath}': File or directory already exists.`, 'output-error');
                    return false;
                }
                if (currentSourceNode.type === 'file') {
                    currentParentDestNode.children[currentTargetName] = { type: 'file', content: currentSourceNode.content };
                } else if (currentSourceNode.type === 'folder') {
                    currentParentDestNode.children[currentTargetName] = { type: 'folder', children: {} };
                    for (const childNameKey in currentSourceNode.children) {
                        if (!copyRecursiveForMv(currentSourceNode.children[childNameKey], currentDestPath + '/' + childNameKey)) {
                            return false;
                        }
                    }
                }
                return true;
            }
            if (copyRecursiveForMv(sourceNode, targetDestPath)) {
                const sourceParentNode = getFileSystemNode(sourceParentPath);
                if (sourceParentNode && sourceParentNode.children[sourceName]) {
                    delete sourceParentNode.children[sourceName];
                } else {
                    this._termLog(`mv: Error finding original source '${sourcePath}' for deletion after copy. File system might be inconsistent.`, 'output-error');
                }
                saveFileSystem();
                updateDesktopAndFileExplorer(sourceParentPath);
                updateDesktopAndFileExplorer(targetDestPath.substring(0, targetDestPath.lastIndexOf('/')) || '/');
                this._termLog(`mv: Moved '${args[0]}' to '${args[1]}'`, 'output-text');
            }
        },
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
        edit: function(args) {
            if (!args[0]) {
                this._termLog('Usage: edit <filepath>', 'output-error');
                return;
            }
            const resolvedPath = resolvePath(this.currentPath, args[0]);
            const fileNode = getFileSystemNode(resolvedPath);

            if (!fileNode || fileNode.type !== 'file') {
                this._termLog(`Error: File '${resolvedPath}' not found or is not a file.`, 'output-error');
                return;
            }
            // Assuming 'notes-app' can handle a filePath in its data
            createWindow('notes-app', { filePath: resolvedPath, title: `Notes - ${resolvedPath.split('/').pop()}` });
            this._termLog(`Opening ${resolvedPath} in Notes...`, 'output-text');
        },
        run: function(args) {
            if (!args[0]) {
                this._termLog('Usage: run <game_id>', 'output-error');
                return;
            }
            const gameId = args[0];
            const validGameIds = ['aura-snake', 'aura-pong', 'aura-tetris', 'aura-invaders', 'aura-breaker']; // Should be dynamically sourced if possible

            if (!validGameIds.includes(gameId)) {
                this._termLog(`Error: Game '${gameId}' not found. Valid games: ${validGameIds.join(', ')}`, 'output-error');
                return;
            }
            // Assumes game-center can handle a launchGame parameter
            createWindow('game-center', { launchGame: gameId });
            this._termLog(`Launching ${gameId} via Game Center...`, 'output-text');
        },
        ps: function(args) {
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
                const appDefinition = Object.entries(apps).find(([id, def]) => uniqueId.startsWith(id));
                if (appDefinition) {
                    baseAppId = appDefinition[0];
                }

                this._termLog(`${title.padEnd(20).substring(0,20)} | ${baseAppId.padEnd(18).substring(0,18)} | ${uniqueId}`, 'output-text');
            });
        },
        kill: function(args) {
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
            const appDefinition = Object.entries(apps).find(([id, def]) => windowIdToKill.startsWith(id));
            if (appDefinition) {
                appId = appDefinition[0];
            }

            closeWindow(windowIdToKill, appId); // Assumes closeWindow is global
            this._termLog(`Process ${windowIdToKill} terminated.`, 'output-text');
        },
        history: function(args) {
            this.commandHistory.forEach((cmd, index) => {
                this._termLog(`  ${(index + 1).toString().padStart(3)}  ${cmd}`, 'output-text');
            });
        },
        date: function(args) {
            const now = new Date();
            this._termLog(now.toLocaleString('en-US', {
                weekday: 'short', year: 'numeric', month: 'short',
                day: 'numeric', hour: '2-digit', minute: '2-digit',
                second: '2-digit', hour12: false
            }), 'output-text');
        },
        whoami: function(args) {
            this._termLog('AuraUser', 'output-text');
        },
        about: function(args) {
            const aboutMsg = `
  <span style="color: var(--highlight-primary); white-space: pre;">    ___       </span>
  <span style="color: var(--highlight-primary); white-space: pre;">   /   |      </span> <span style="color: var(--text-color);">AuraOS - Your Creative Space</span>
  <span style="color: var(--highlight-primary); white-space: pre;">  / /| |      </span> <span style="color: var(--subtle-text-color);">Version: 2.0 (Terminal Enhanced)</span>
  <span style="color: var(--highlight-primary); white-space: pre;"> / ___ |      </span> <span style="color: var(--subtle-text-color);">---------------------------------</span>
  <span style="color: var(--highlight-primary); white-space: pre;">/_/  |_|      </span> <span style="color: var(--text-color);">Thanks for using AuraOS!</span>
`;
            this._termLog(aboutMsg, 'output-text');
        },
        ping: function(args) {
            if (!args[0]) {
                this._termLog('Usage: ping <hostname>', 'output-error');
                return;
            }
            const hostname = args[0];
            this._termLog(`PING ${hostname} (simulated):`, 'output-text');

            let pingsSent = 0;
            const intervalId = setInterval(() => {
                if (pingsSent >= 4) {
                    clearInterval(intervalId);
                    // Remove this intervalId from activeIntervals
                    if (this.activeIntervals) {
                        this.activeIntervals = this.activeIntervals.filter(id => id !== intervalId);
                    }
                    this._termLog(`
Ping statistics for ${hostname}:
    Packets: Sent = 4, Received = 4, Lost = 0 (0% loss)`, 'output-text');
                    // _newTermLine() will be called by _handleCommand after this command function finishes
                    return;
                }
                pingsSent++;
                const fakeLatency = Math.floor(Math.random() * 100) + 10;
                const ttl = Math.floor(Math.random() * 50) + 50;
                this._termLog(`Reply from ${hostname}: bytes=32 time=${fakeLatency}ms TTL=${ttl}`, 'output-text');
            }, 1000);

            if (!this.activeIntervals) this.activeIntervals = [];
            this.activeIntervals.push(intervalId);
        }
    };
}
