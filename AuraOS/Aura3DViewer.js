class Aura3DViewerApp {
    constructor(appId, windowEl, data) {
        this.appId = appId;
        this.windowEl = windowEl;
        this.data = data;

        this.cdnModels = [
            { name: 'Astronaut', src: 'https://modelviewer.dev/shared-assets/models/Astronaut.glb' },
            { name: 'Horse', src: 'https://modelviewer.dev/shared-assets/models/Horse.glb' },
            { name: 'Damaged Helmet', src: 'https://modelviewer.dev/shared-assets/models/DamagedHelmet.glb' },
            { name: 'Robot Expressive', src: 'https://modelviewer.dev/shared-assets/models/RobotExpressive.glb' },
            { name: 'Alpha Blend Mode Test', src: 'https://modelviewer.dev/shared-assets/models/AlphaBlendModeTest.glb' }
        ];

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
            <div class="aura-3d-viewer-container">
                <div class="aura-3d-viewer-sidebar">
                    <!-- Models list will be populated here -->
                </div>
                <div class="aura-3d-viewer-main-area">
                    <div class="current-model-name">No model loaded</div>
                    <model-viewer class="model-viewer-tag" src="" alt="3D Model" camera-controls auto-rotate shadow-intensity="1"></model-viewer>
                    <div class="model-controls">
                        <button class="aura-os-button" data-action="play-pause">Play Animations</button>
                        <button class="aura-os-button" data-action="toggle-rotate">Toggle Auto-Rotate</button>
                        <button class="aura-os-button" data-action="toggle-shadow">Toggle Shadow</button>
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
        await this._scanAndPopulateModels(); // This now populates both CDN and local

        if (this.data && this.data.filePath) {
            this._loadModel(this.data.filePath);
        } else if (this.cdnModels && this.cdnModels.length > 0) {
            // If no specific file path, and CDN models exist, load the first one by default
            this._loadModel(this.cdnModels[0].src);
            // Optionally, find and activate the corresponding sidebar item
            const firstCdnItem = this.sidebarDiv.querySelector(`.sidebar-item[data-file-path="${this.cdnModels[0].src.replace(/"/g, '\\"')}"]`);
            if (firstCdnItem) {
                // Ensure other items are deactivated first
                this.sidebarDiv.querySelectorAll('.sidebar-item.active').forEach(activeItem => {
                    activeItem.classList.remove('active');
                });
                firstCdnItem.classList.add('active');
            }
        } else {
            // Existing logic for when no model is loaded (welcome message)
            if (!this.modelViewerElement.hasAttribute('src') || !this.modelViewerElement.getAttribute('src')) {
                 this.modelNameDiv.textContent = 'Welcome to Aura 3D Viewer!';
                 this.modelViewerElement.style.display = 'none';
                 // Ensure existing placeholder logic is still sound or simplified
                 let placeholderText = this.mainAreaDiv.querySelector('.viewer-placeholder-text');
                 if (!placeholderText) {
                     placeholderText = document.createElement('p');
                     placeholderText.className = 'viewer-placeholder-text'; // Use class
                     const controlsDiv = this.mainAreaDiv.querySelector('.model-controls');
                     if (controlsDiv) {
                        this.mainAreaDiv.insertBefore(placeholderText, controlsDiv);
                     } else {
                        this.mainAreaDiv.appendChild(placeholderText);
                     }
                 }
                 placeholderText.textContent = 'Select a model from the list to begin, or add local models to /Models/.';
            }
        }
    }

    async _scanAndPopulateModels() {
        this.sidebarDiv.innerHTML = ''; // Clear current list

        // --- Render CDN Models ---
        const cdnHeader = document.createElement('h3');
        cdnHeader.textContent = 'Cloud Models';
        this.sidebarDiv.appendChild(cdnHeader);

        if (this.cdnModels && this.cdnModels.length > 0) {
            this.cdnModels.forEach(model => {
                const listItem = document.createElement('div');
                listItem.className = 'sidebar-item';
                listItem.textContent = model.name;
                listItem.dataset.filePath = model.src; // Use filePath to be consistent with existing _loadModel logic

                listItem.addEventListener('click', () => {
                    this._loadModel(model.src);
                    // Handle highlighting (remove active from all, add to this one)
                    this.sidebarDiv.querySelectorAll('.sidebar-item.active').forEach(activeItem => {
                        activeItem.classList.remove('active');
                    });
                    listItem.classList.add('active');
                });
                this.sidebarDiv.appendChild(listItem);
            });
        } else {
            const noCdnModelsMsg = document.createElement('p');
            noCdnModelsMsg.textContent = 'No cloud models available.';
            noCdnModelsMsg.style.fontSize = '0.8rem'; // Optional: slightly smaller text for this message
            noCdnModelsMsg.style.color = 'var(--subtle-text-color)';
            this.sidebarDiv.appendChild(noCdnModelsMsg);
        }

        // --- Render Local Models ---
        const localHeader = document.createElement('h3');
        localHeader.textContent = 'Local Models';
        this.sidebarDiv.appendChild(localHeader);

        const modelsDirectory = '/Models/';
        try {
            const files = await dbManager.listFiles(modelsDirectory);
            const glbFiles = files.filter(file => file.name.toLowerCase().endsWith('.glb') && file.type === 'file');

            if (glbFiles.length === 0) {
                const noLocalModelsMsg = document.createElement('p');
                noLocalModelsMsg.textContent = `No models found in ${modelsDirectory}`;
                noLocalModelsMsg.style.fontSize = '0.8rem'; // Optional
                noLocalModelsMsg.style.color = 'var(--subtle-text-color)';
                this.sidebarDiv.appendChild(noLocalModelsMsg);
                // return; // Do not return here, allow app to function with only CDN models if local are none
            } else {
                glbFiles.forEach(file => {
                    const listItem = document.createElement('div');
                    listItem.className = 'sidebar-item';
                    listItem.textContent = file.name;
                    const filePath = modelsDirectory + file.name;
                    listItem.dataset.filePath = filePath;

                    listItem.addEventListener('click', () => {
                        this._loadModel(filePath);
                        this.sidebarDiv.querySelectorAll('.sidebar-item.active').forEach(activeItem => {
                            activeItem.classList.remove('active');
                        });
                        listItem.classList.add('active');
                    });
                    this.sidebarDiv.appendChild(listItem);
                });
            }

        } catch (error) {
            console.error(`Error scanning models in ${modelsDirectory}:`, error);
            const errorMsg = document.createElement('p');
            errorMsg.textContent = 'Error loading local models.';
            errorMsg.style.fontSize = '0.8rem'; // Optional
            errorMsg.style.color = 'var(--red-accent)'; // Indicate error
            this.sidebarDiv.appendChild(errorMsg);
            if (window.AuraOS && AuraOS.showNotification) {
                AuraOS.showNotification({
                    title: 'Error Loading Local Models',
                    message: `Could not scan ${modelsDirectory}. Ensure the directory exists.`,
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
