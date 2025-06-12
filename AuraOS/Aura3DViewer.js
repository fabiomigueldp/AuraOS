class Aura3DViewerApp {
    constructor(appId, windowEl, data) {
        this.appId = appId;
        this.windowEl = windowEl;
        this.data = data;

        this._boundDestroy = this.destroy.bind(this);
        this.windowEl.addEventListener('aura:close', this._boundDestroy);

        this._initUI();
        this._initControls(); // Initialize controls
        this._initialize();
    }

    _initUI() {
        const windowBody = this.windowEl.querySelector('.window-body');
        if (!windowBody) {
            console.error('Aura3DViewerApp: .window-body not found');
            return;
        }

        const containerHTML = `
            <div class="aura-3d-viewer-container" style="display: flex; height: 100%; width: 100%;">
                <div class="aura-3d-viewer-sidebar" style="width: 200px; height: 100%; background: rgba(0,0,0,0.1); padding: 10px; box-sizing: border-box; overflow-y: auto;">
                    <!-- Models list will be populated here -->
                </div>
                <div class="aura-3d-viewer-main-area" style="flex-grow: 1; height: 100%; padding: 10px; box-sizing: border-box; display: flex; flex-direction: column; align-items: center; justify-content: center;">
                    <div class="current-model-name" style="padding-bottom: 10px; font-weight: bold;">No model loaded</div>
                    <model-viewer src="" alt="3D Model" style="width: 100%; height: 80%; border: 1px solid var(--glass-border);" camera-controls auto-rotate shadow-intensity="1"></model-viewer>
                    <div class="model-controls" style="padding-top: 10px; display: flex; gap: 10px;">
                        <button data-action="play-pause">Play Animations</button>
                        <button data-action="toggle-rotate">Toggle Auto-Rotate</button>
                        <button data-action="toggle-shadow">Toggle Shadow</button>
                    </div>
                </div>
            </div>
        `;
        windowBody.innerHTML = containerHTML;

        this.sidebarDiv = windowBody.querySelector('.aura-3d-viewer-sidebar');
        this.mainAreaDiv = windowBody.querySelector('.aura-3d-viewer-main-area');
        this.modelViewerElement = windowBody.querySelector('model-viewer');
        this.modelNameDiv = windowBody.querySelector('.current-model-name');
        this.welcomeMessageArea = this.mainAreaDiv.querySelector('p');

        // Store references to control buttons
        const controlsDiv = windowBody.querySelector('.model-controls');
        this.playPauseButton = controlsDiv.querySelector('[data-action="play-pause"]');
        this.rotateButton = controlsDiv.querySelector('[data-action="toggle-rotate"]');
        this.shadowButton = controlsDiv.querySelector('[data-action="toggle-shadow"]');
    }

    _initControls() {
        if (this.playPauseButton) {
            this._boundPlayPauseClick = this._handlePlayPauseClick.bind(this);
            this.playPauseButton.addEventListener('click', this._boundPlayPauseClick);
        }
        if (this.rotateButton) {
            this._boundRotateClick = this._handleRotateClick.bind(this);
            this.rotateButton.addEventListener('click', this._boundRotateClick);
        }
        if (this.shadowButton) {
            this._boundShadowClick = this._handleShadowClick.bind(this);
            this.shadowButton.addEventListener('click', this._boundShadowClick);
        }
    }

    _handlePlayPauseClick() {
        if (this.modelViewerElement) {
            if (!this.modelViewerElement.paused) {
                this.modelViewerElement.pause();
                this.playPauseButton.textContent = 'Play Animations';
            } else {
                this.modelViewerElement.play();
                this.playPauseButton.textContent = 'Pause Animations';
            }
        }
    }

    _handleRotateClick() {
        if (this.modelViewerElement) {
            this.modelViewerElement.autoRotate = !this.modelViewerElement.autoRotate;
            this.rotateButton.textContent = this.modelViewerElement.autoRotate ? 'Disable Auto-Rotate' : 'Enable Auto-Rotate';
        }
    }

    _handleShadowClick() {
        if (this.modelViewerElement) {
            this.modelViewerElement.shadowIntensity = this.modelViewerElement.shadowIntensity === 0 ? 1 : 0;
            this.shadowButton.textContent = this.modelViewerElement.shadowIntensity === 0 ? 'Show Shadow' : 'Hide Shadow';
        }
    }

    async _initialize() {
        await this._scanAndPopulateModels();

        if (this.data && this.data.filePath) {
            this._loadModel(this.data.filePath);
        } else {
            if (!this.modelViewerElement.hasAttribute('src') || !this.modelViewerElement.getAttribute('src')) {
                 this.modelNameDiv.textContent = 'Welcome to Aura 3D Viewer!';
                 this.modelViewerElement.style.display = 'none';
                 const placeholderText = document.createElement('p');
                 placeholderText.textContent = 'Select a model from the list to begin.';
                 placeholderText.style.textAlign = 'center';
                 // Insert placeholder before model-controls
                 const controlsDiv = this.mainAreaDiv.querySelector('.model-controls');
                 if (controlsDiv) {
                    this.mainAreaDiv.insertBefore(placeholderText, controlsDiv);
                 } else { // Fallback if controlsDiv isn't there for some reason
                    this.mainAreaDiv.appendChild(placeholderText);
                 }
            }
        }
    }

    async _scanAndPopulateModels() {
        const modelsDir = (typeof AuraOS !== 'undefined' && AuraOS.paths && AuraOS.paths.MODELS) ? AuraOS.paths.MODELS : '/Models';
        this.sidebarDiv.innerHTML = ''; // Clear current list

        try {
            const files = await dbManager.listFiles(modelsDir);
            const glbFiles = files.filter(file => file.name.toLowerCase().endsWith('.glb') && file.type === 'file');

            if (glbFiles.length === 0) {
                this.sidebarDiv.innerHTML = `<p>No models found in ${modelsDir}</p>`;
                return;
            }

            glbFiles.forEach(file => {
                const listItem = document.createElement('div');
                listItem.className = 'sidebar-item';
                listItem.textContent = file.name;
                // file.path from dbManager.listFiles should already be the full path, e.g., /Models/Astronaut.glb
                // If not, and it's just the name, then: const filePath = `${modelsDir}/${file.name}`;
                const filePath = file.path; // Assuming file.path is the full path
                listItem.dataset.filePath = filePath;

                listItem.addEventListener('click', () => {
                    this._loadModel(filePath);
                    // Handle highlighting
                    this.sidebarDiv.querySelectorAll('.sidebar-item.active').forEach(activeItem => {
                        activeItem.classList.remove('active');
                    });
                    listItem.classList.add('active');
                });
                this.sidebarDiv.appendChild(listItem);
            });

        } catch (error) {
            console.error(`Error scanning models in ${modelsDir}:`, error);
            this.sidebarDiv.innerHTML = `<p>Error loading models.</p>`;
            // Show a notification to the user
             if (window.AuraOS && AuraOS.showNotification) {
                AuraOS.showNotification({
                    title: 'Error Loading Models',
                    message: `Could not scan ${modelsDir}. Ensure the directory exists.`,
                    type: 'error'
                });
            }
        }
    }

    _loadModel(filePath) {
        if (!filePath) {
            console.error('Aura3DViewerApp: No file path provided to _loadModel.');
            this.modelNameDiv.textContent = 'Error: Invalid model path.';
            this.modelViewerElement.style.display = 'none';
            // Ensure existing placeholder text is removed or managed
            const existingPlaceholder = this.mainAreaDiv.querySelector('p:not(.current-model-name)');
            if (existingPlaceholder) existingPlaceholder.remove();
            return;
        }

        this.modelViewerElement.setAttribute('src', filePath);
        const modelName = filePath.substring(filePath.lastIndexOf('/') + 1);
        this.modelNameDiv.textContent = `Current Model: ${modelName}`;
        this.modelViewerElement.style.display = 'block'; // Show viewer

        // Remove any welcome/placeholder message
        const placeholderText = this.mainAreaDiv.querySelector('p:not(.current-model-name)');
        if (placeholderText) {
            placeholderText.remove();
        }

        // Highlight in sidebar
        this.sidebarDiv.querySelectorAll('.sidebar-item').forEach(item => {
            item.classList.toggle('active', item.dataset.filePath === filePath);
        });

        // Listen for model load to update button states
        this.modelViewerElement.addEventListener('load', () => {
            if (this.playPauseButton) {
                this.playPauseButton.textContent = this.modelViewerElement.paused ? 'Play Animations' : 'Pause Animations';
            }
            if (this.rotateButton) {
                this.rotateButton.textContent = this.modelViewerElement.autoRotate ? 'Disable Auto-Rotate' : 'Enable Auto-Rotate';
            }
            if (this.shadowButton) {
                this.shadowButton.textContent = this.modelViewerElement.shadowIntensity === 0 ? 'Show Shadow' : 'Hide Shadow';
            }
        }, { once: true });
    }

    destroy() {
        console.log(`Aura3DViewerApp ${this.appId} destroyed`);
        this.windowEl.removeEventListener('aura:close', this._boundDestroy);

        // Remove control button event listeners
        if (this.playPauseButton && this._boundPlayPauseClick) {
            this.playPauseButton.removeEventListener('click', this._boundPlayPauseClick);
        }
        if (this.rotateButton && this._boundRotateClick) {
            this.rotateButton.removeEventListener('click', this._boundRotateClick);
        }
        if (this.shadowButton && this._boundShadowClick) {
            this.shadowButton.removeEventListener('click', this._boundShadowClick);
        }
        // Note: The 'load' event listener on modelViewerElement uses { once: true }, so it removes itself.

        const windowBody = this.windowEl.querySelector('.window-body');
        if (windowBody) {
            windowBody.innerHTML = '';
        }
    }
}
