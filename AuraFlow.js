class PerlinNoise {
    constructor() {
        this.p = new Uint8Array(512);
        this.perm = new Uint8Array(256);
        this.gradients = [
            [1, 1, 0], [-1, 1, 0], [1, -1, 0], [-1, -1, 0],
            [1, 0, 1], [-1, 0, 1], [1, 0, -1], [-1, 0, -1],
            [0, 1, 1], [0, -1, 1], [0, 1, -1], [0, -1, -1],
            [1, 1, 0], [-1, 1, 0], [0, -1, 1], [0, 1, 1] // Some duplicates for coverage, can be refined
        ];

        // Initialize permutation table
        for (let i = 0; i < 256; i++) {
            this.perm[i] = i;
        }

        // Shuffle permutation table
        for (let i = 255; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.perm[i], this.perm[j]] = [this.perm[j], this.perm[i]];
        }

        // Duplicate permutation table for wrapping
        for (let i = 0; i < 256; i++) {
            this.p[i] = this.p[i + 256] = this.perm[i];
        }
    }

    fade(t) {
        return t * t * t * (t * (t * 6 - 15) + 10); // 6t^5 - 15t^4 + 10t^3
    }

    lerp(t, a, b) {
        return a + t * (b - a);
    }

    grad(hash, x, y, z) {
        const h = hash & 15; // Take the lower 4 bits to pick a gradient
        const grad = this.gradients[h];
        return grad[0] * x + grad[1] * y + grad[2] * z;
    }

    noise(x, y, z = 0) {
        const X = Math.floor(x) & 255;
        const Y = Math.floor(y) & 255;
        const Z = Math.floor(z) & 255;

        x -= Math.floor(x);
        y -= Math.floor(y);
        z -= Math.floor(z);

        const u = this.fade(x);
        const v = this.fade(y);
        const w = this.fade(z);

        const A = this.p[X] + Y;
        const AA = this.p[A] + Z;
        const AB = this.p[A + 1] + Z;
        const B = this.p[X + 1] + Y;
        const BA = this.p[B] + Z;
        const BB = this.p[B + 1] + Z;

        const g1 = this.grad(this.p[AA], x, y, z);
        const g2 = this.grad(this.p[BA], x - 1, y, z);
        const g3 = this.grad(this.p[AB], x, y - 1, z);
        const g4 = this.grad(this.p[BB], x - 1, y - 1, z);
        const g5 = this.grad(this.p[AA + 1], x, y, z - 1);
        const g6 = this.grad(this.p[BA + 1], x - 1, y, z - 1);
        const g7 = this.grad(this.p[AB + 1], x, y - 1, z - 1);
        const g8 = this.grad(this.p[BB + 1], x - 1, y - 1, z - 1);

        const lerp1 = this.lerp(u, g1, g2);
        const lerp2 = this.lerp(u, g3, g4);
        const lerp3 = this.lerp(u, g5, g6);
        const lerp4 = this.lerp(u, g7, g8);

        const lerpY1 = this.lerp(v, lerp1, lerp2);
        const lerpY2 = this.lerp(v, lerp3, lerp4);

        return this.lerp(w, lerpY1, lerpY2); // Value between -1 and 1
    }
}


class AuraFlowApp {
    constructor(windowBody, appData) {
        console.log('AuraFlowApp constructor: Check 1: typeof window.d3 =', typeof window.d3);
        if (typeof window.d3 !== 'undefined') {
            console.log('AuraFlowApp constructor: Check 1: typeof window.d3.Delaunay =', typeof window.d3.Delaunay);
        }
        this.windowBody = windowBody;
        this.appData = appData;

        // Initialize Perlin Noise generator
        this.perlinNoise = new PerlinNoise();


        // Common properties
        this.nodes = []; // For Connected Fibers
        this.particles = []; // For Particle Flow
        this.seedPoints = []; // For Voronoi
        this.voronoiDiagram = null;
        this.mouseX = null;
        this.mouseY = null;
        this.controlPanel = null;
        this.controlPanelHideTimeout = null;
        this.currentPaletteIndex = 0;
        this.palettes = [
            { name: 'Theme Default', colors: ['--highlight-primary', '--highlight-secondary', '--text-color', '#FF6B6B', '#4ECDC4'] },
            { name: 'Forest', colors: ['#2f4f4f', '#556b2f', '#8fbc8f', '#228b22', '#006400'] },
            { name: 'Ocean', colors: ['#0077be', '#00a6d6', '#90d5e5', '#4682b4', '#000080'] },
            { name: 'Sunset', colors: ['#ff4500', '#ff8c00', '#ffd700', '#ff6347', '#dc143c'] },
            { name: 'Monochrome', colors: ['#222222', '#555555', '#888888', '#BBBBBB', '#EEEEEE'] },
        ];
        this.animationFrameId = null;
        this.isVisible = true; // For IntersectionObserver
        this.visibilityObserver = null;
        this.resizeObserver = null; // For canvas resize

        this.voronoiLoadRetries = 0;
        this.maxVoronoiLoadRetries = 100; // Approx 10 seconds if delay is 100ms


        // --- Particle Flow Settings ---
        this.noiseScale = 0.01; // User configurable, persisted
        this.time = 0; // Time variable for Perlin noise evolution
        this.numParticles = 1000; // Max particles cap
        this.initialParticles = 500; // Number of particles to start with
        this.particleSize = 1.5;
        this.particleSpeedMultiplier = 1;
        this.particleMaxAgeInSeconds = 10; // Default lifespan in seconds
        this.particleMaxAge = this.particleMaxAgeInSeconds * 60; // Lifespan in frames (assuming 60FPS)
        this.mouseInfluenceRadius = 100;
        this.mouseForceStrength = 0.5; // Repulsion strength
        this.particleBurstAmount = 50;

        // --- Connected Fibers Settings ---
        this.numNodes = 75;
        this.nodeSpeedMultiplier = 1.0;
        this.nodeSize = 2;
        this.nodeColor = 'rgba(200, 200, 255, 0.8)';
        this.connectionDistance = 120;
        this.fiberColor = getComputedStyle(document.documentElement).getPropertyValue('--highlight-primary').trim() || '#8a63d2';
        this.maxFiberThickness = 3.5;

        // --- Voronoi Settings ---
        this.numSeedPoints = 30;
        this.seedSpeedMultiplier = 0.5;
        this.voronoiFillStyle = 'pulsingSolid';
        // this.seedPointColor will be set by palette
        this.voronoiCellBorderColor = getComputedStyle(document.documentElement).getPropertyValue('--subtle-text-color').trim() || '#b0a8d9';
        this.mouseSeedIndex = 0; // The first seed point will follow the mouse if active. Set to -1 if no mouse seed.


        // Set initial mode
        this.currentMode = 'particleFlow';
        // this.currentMode = 'connectedFibers';
        // this.currentMode = 'voronoi';


        console.log("AuraFlowApp instance created");
        
        // Use requestAnimationFrame to ensure DOM is ready
        requestAnimationFrame(() => {
            console.log('AuraFlowApp rAF before initUI: typeof window.d3 =', typeof window.d3);
            if (typeof window.d3 !== 'undefined') {
                console.log('AuraFlowApp rAF before initUI: typeof window.d3.Delaunay =', typeof window.d3.Delaunay);
            }
            this.initUI();
            
            this._loadAppSettings().then(() => {
                this._initializeCurrentMode(); // This also applies palette
                this.startAnimation();
                this._updateControlPanelValues();
            }).catch(error => {
                console.error("Error loading AuraFlow settings, using defaults:", error);
                this._initializeCurrentMode();
                this.startAnimation();
                this._updateControlPanelValues();
            });
        });

        const windowElement = this.windowBody.closest('.window');
        if (windowElement) {
            this._boundCleanupEventListeners = this._cleanupEventListeners.bind(this);
            windowElement.addEventListener('aura:close', this._boundCleanupEventListeners);
        } else {
            console.warn("AuraFlowApp: Could not find parent .window element to attach close listener.");
        }
    }

    async _saveAppSettings() {
        if (typeof dbManager === 'undefined' || !dbManager) {
            console.warn("dbManager not available, cannot save AuraFlow settings.");
            return;
        }
        let elementCount;
        if (this.currentMode === 'particleFlow') elementCount = this.initialParticles;
        else if (this.currentMode === 'connectedFibers') elementCount = this.numNodes;
        else if (this.currentMode === 'voronoi') elementCount = this.numSeedPoints;

        const settings = {
            currentMode: this.currentMode,
            elementCount: elementCount,
            paletteIndex: this.currentPaletteIndex,
            voronoiFillStyle: this.voronoiFillStyle,
            mouseInfluenceRadius: this.mouseInfluenceRadius,
            mouseForceStrength: this.mouseForceStrength,
            backgroundDrawMode: this.backgroundDrawMode,
            noiseScale: this.noiseScale,
            particleMaxAgeInSeconds: this.particleMaxAgeInSeconds,
        };
        try {
            await dbManager.saveSetting('auraFlow_settings', settings);
            console.log('AuraFlow settings saved:', settings);
        } catch (error) {
            console.error('Error saving AuraFlow settings:', error);
        }
    }

    async _loadAppSettings() {
        if (typeof dbManager === 'undefined' || !dbManager) {
            console.warn("dbManager not available, cannot load AuraFlow settings.");
            return Promise.resolve();
        }
        try {
            const settings = await dbManager.loadSetting('auraFlow_settings');
            if (settings) {
                console.log('AuraFlow settings loaded:', settings);
                this.currentMode = settings.currentMode || 'particleFlow';
                this.currentPaletteIndex = settings.paletteIndex || 0;
                this.voronoiFillStyle = settings.voronoiFillStyle || 'pulsingSolid';
                this.mouseInfluenceRadius = settings.mouseInfluenceRadius || 100;
                this.mouseForceStrength = settings.mouseForceStrength || 0.5;
                this.backgroundDrawMode = settings.backgroundDrawMode || 'fadeToBlack';
                this.noiseScale = settings.noiseScale || 0.01;
                this.particleMaxAgeInSeconds = settings.particleMaxAgeInSeconds || 10;
                this.particleMaxAge = this.particleMaxAgeInSeconds * 60;

                if (this.currentMode === 'particleFlow') {
                    this.initialParticles = settings.elementCount || 500;
                    this.numParticles = Math.max(this.initialParticles, 1000);
                } else if (this.currentMode === 'connectedFibers') {
                    this.numNodes = settings.elementCount || 75;
                } else if (this.currentMode === 'voronoi') {
                    this.numSeedPoints = settings.elementCount || 30;
                     if (this.numSeedPoints > 0) this.mouseSeedIndex = 0; else this.mouseSeedIndex = -1;
                }
            } else {
                console.log('No AuraFlow settings found, using defaults.');
                 if (this.currentMode === 'voronoi' && this.numSeedPoints > 0) this.mouseSeedIndex = 0; else this.mouseSeedIndex = -1;
                 this.voronoiFillStyle = 'pulsingSolid'; // Ensure default if no settings
                 this.mouseInfluenceRadius = 100; // Default on no settings
                 this.mouseForceStrength = 0.5;   // Default on no settings
                 this.backgroundDrawMode = 'fadeToBlack'; // Default on no settings
                 this.noiseScale = 0.01; // Default on no settings
                 this.particleMaxAgeInSeconds = 10;
                 this.particleMaxAge = this.particleMaxAgeInSeconds * 60;
            }
        } catch (error) {
            console.error('Error loading AuraFlow settings:', error);
            if (this.currentMode === 'voronoi' && this.numSeedPoints > 0) this.mouseSeedIndex = 0; else this.mouseSeedIndex = -1;
            this.voronoiFillStyle = 'pulsingSolid'; // Ensure default on error
            this.mouseInfluenceRadius = 100; // Default on error
            this.mouseForceStrength = 0.5;   // Default on error
            this.backgroundDrawMode = 'fadeToBlack'; // Default on error
            this.noiseScale = 0.01; // Default on error
            this.particleMaxAgeInSeconds = 10;
            this.particleMaxAge = this.particleMaxAgeInSeconds * 60;
        }
    }

    _handleMouseMove(event) {
        const rect = this.canvas.getBoundingClientRect();
        this.mouseX = event.clientX - rect.left;
        this.mouseY = event.clientY - rect.top;
        // For control panel auto-hide, this event is now on windowBody.
    }

    _handleMouseClick(event) {
        const rect = this.canvas.getBoundingClientRect();
        const clickX = event.clientX - rect.left;
        const clickY = event.clientY - rect.top;

        if (this.currentMode === 'particleFlow') {
            for (let i = 0; i < this.particleBurstAmount; i++) {
                if (this.particles.length < this.numParticles) { // Cap total particles
                    const angle = Math.random() * Math.PI * 2;
                    const speed = Math.random() * 3 + 1; // Random speed for burst
                    const p = new Particle(
                        clickX,
                        clickY,
                        this.particleSize,
                        this._getRandomColorFromCurrentPalette(),
                        this.particleMaxAge,
                        this.canvas
                    );
                    p.vx = Math.cos(angle) * speed;
                    p.vy = Math.sin(angle) * speed;
                    this.particles.push(p);
                }
            }
        } else if (this.currentMode === 'connectedFibers') {
            this.nodes.push(new Node(
                clickX,
                clickY,
                (Math.random() - 0.5) * 2 * this.nodeSpeedMultiplier,
                (Math.random() - 0.5) * 2 * this.nodeSpeedMultiplier,
                this.nodeSize,
                this.nodeColor,
                this.canvas
            ));
             if (this.nodes.length > this.numNodes * 2) { // Example cap for added nodes
                this.nodes.shift(); // Remove the oldest node
            }
        } else if (this.currentMode === 'voronoi') {
            this.seedPoints.push(new SeedPoint(
                clickX,
                clickY,
                (Math.random() - 0.5) * 2 * this.seedSpeedMultiplier,
                (Math.random() - 0.5) * 2 * this.seedSpeedMultiplier,
                this._getRandomColorFromCurrentPalette(), // Use palette color
                this.canvas
            ));
            if (this.seedPoints.length > this.numSeedPoints * 2) {
                 if (this.mouseSeedIndex !== -1 && this.seedPoints.length > 1) {
                    let removed = false;
                    for(let k=0; k < this.seedPoints.length; k++) {
                        if (k !== this.mouseSeedIndex) {
                            this.seedPoints.splice(k,1);
                            if (k < this.mouseSeedIndex) this.mouseSeedIndex--;
                            removed = true;
                            break;
                        }
                    }
                    if(!removed && this.seedPoints.length > 0) {
                        this.seedPoints.shift();
                         if (this.mouseSeedIndex === 0 && this.seedPoints.length > 0) { /* mouseSeedIndex remains 0 */ }
                         else if (this.mouseSeedIndex > 0) { this.mouseSeedIndex--;}
                    }
                 } else if (this.seedPoints.length > 0) {
                    this.seedPoints.shift();
                 }
            }
        }
    }

    _cleanupEventListeners() {
        if (this.canvas) {
            if (this._boundHandleMouseMove) this.canvas.removeEventListener('mousemove', this._boundHandleMouseMove);
            if (this._boundHandleMouseClick) this.canvas.removeEventListener('click', this._boundHandleMouseClick);
        }
        if (this.controlPanel) {
             if (this._boundShowControlPanel) this.controlPanel.removeEventListener('mouseenter', this._boundShowControlPanel);
             if (this._boundHideControlPanelOnLeave) this.controlPanel.removeEventListener('mouseleave', this._boundHideControlPanelOnLeave);
        }
        if (this.windowBody && this._boundMouseMoveWindowBody) {
            this.windowBody.removeEventListener('mousemove', this._boundMouseMoveWindowBody);
        }

        const modeSelect = document.getElementById('auraFlowModeSelect');
        if (modeSelect && this._boundHandleModeChange) modeSelect.removeEventListener('change', this._boundHandleModeChange);

        const countSlider = document.getElementById('auraFlowElementCount');
        if (countSlider && this._boundHandleElementCountChange) countSlider.removeEventListener('input', this._boundHandleElementCountChange);

        const colorBtn = document.getElementById('auraFlowColorPaletteBtn');
        if (colorBtn && this._boundHandleColorPaletteChange) colorBtn.removeEventListener('click', this._boundHandleColorPaletteChange);

        const resetBtn = document.getElementById('auraFlowResetBtn');
        if (resetBtn && this._boundHandleResetSimulation) resetBtn.removeEventListener('click', this._boundHandleResetSimulation);

        const saveBtn = document.getElementById('auraFlowSaveImageBtn');
        if (saveBtn && this._boundHandleSaveImage) saveBtn.removeEventListener('click', this._boundHandleSaveImage);

        if (this.visibilityObserver) this.visibilityObserver.disconnect();
        if (this.resizeObserver) this.resizeObserver.disconnect(); // Disconnect resize observer
        if (this.animationFrameId) cancelAnimationFrame(this.animationFrameId);
        clearTimeout(this.controlPanelHideTimeout);

        console.log("AuraFlowApp event listeners and observers cleaned up.");
    }

    _showControlPanel() {
        if (!this.controlPanel) return;
        clearTimeout(this.controlPanelHideTimeout);
        this.controlPanel.style.opacity = '1';
        this.controlPanel.style.transform = 'translateY(0)';
        this.controlPanel.style.pointerEvents = 'auto';
    }

    _hideControlPanel() {
        if (!this.controlPanel) return;
        clearTimeout(this.controlPanelHideTimeout);
        this.controlPanelHideTimeout = setTimeout(() => {
            this.controlPanel.style.opacity = '0';
            this.controlPanel.style.transform = 'translateY(10px)';
            this.controlPanel.style.pointerEvents = 'none';
        }, 3000); // Hide after 3 seconds
    }

    _initializeCurrentMode() {
        if (this.currentMode === 'particleFlow') {
            this.initializeParticleFlow();
        } else if (this.currentMode === 'connectedFibers') {
            this.initializeConnectedFibers();
        } else if (this.currentMode === 'voronoi') {
            this.initializeVoronoi();
        }
        this._updateControlPanelVisibility();
        this._applyCurrentPaletteToMode();
    }

    _handleModeChange(event) {
        this.currentMode = event.target.value;
        console.log(`Mode changed to: ${this.currentMode}`);
        this._saveAppSettings();
        this._initializeCurrentMode();
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
        }
        this.startAnimation();
        this._updateElementCountSlider();
    }

    _updateControlPanelValues() { // New method to set UI from current state
        const modeSelect = document.getElementById('auraFlowModeSelect');
        if (modeSelect) modeSelect.value = this.currentMode;

        this._updateElementCountSlider(); // This sets slider value and span

        const paletteNameSpan = document.getElementById('auraFlowPaletteName');
        if (paletteNameSpan) paletteNameSpan.textContent = this.palettes[this.currentPaletteIndex].name;

        const voronoiFillStyleSelect = document.getElementById('auraFlowVoronoiFillStyleSelect');
        if (voronoiFillStyleSelect) voronoiFillStyleSelect.value = this.voronoiFillStyle;

        const mouseRadiusSlider = document.getElementById('auraFlowMouseRadiusSlider');
        const mouseRadiusValue = document.getElementById('auraFlowMouseRadiusValue');
        if (mouseRadiusSlider) mouseRadiusSlider.value = this.mouseInfluenceRadius;
        if (mouseRadiusValue) mouseRadiusValue.textContent = this.mouseInfluenceRadius;

        const mouseForceSlider = document.getElementById('auraFlowMouseForceSlider');
        const mouseForceValue = document.getElementById('auraFlowMouseForceValue');
        if (mouseForceSlider) mouseForceSlider.value = this.mouseForceStrength;
        if (mouseForceValue) mouseForceValue.textContent = this.mouseForceStrength.toFixed(1);

        const lifespanSlider = document.getElementById('auraFlowLifespanSlider');
        const lifespanValue = document.getElementById('auraFlowLifespanValue');
        if (lifespanSlider) lifespanSlider.value = this.particleMaxAgeInSeconds;
        if (lifespanValue) lifespanValue.textContent = this.particleMaxAgeInSeconds + 's';
    }


    _updateElementCountSlider() {
        const countSlider = document.getElementById('auraFlowElementCount');
        const countValueSpan = document.getElementById('auraFlowElementCountValue');
        if (!countSlider || !countValueSpan) return;

        if (this.currentMode === 'particleFlow') {
            countSlider.min = "100";
            countSlider.max = "3000";
            countSlider.step = "50";
            countSlider.value = this.initialParticles; // Use initialParticles for display
            countValueSpan.textContent = this.initialParticles;
        } else if (this.currentMode === 'connectedFibers') {
            countSlider.min = "10";
            countSlider.max = "200";
            countSlider.step = "5";
            countSlider.value = this.numNodes;
            countValueSpan.textContent = this.numNodes;
        } else if (this.currentMode === 'voronoi') {
             countSlider.min = "5";
            countSlider.max = "100";
            countSlider.step = "1";
            countSlider.value = this.numSeedPoints;
            countValueSpan.textContent = this.numSeedPoints;
        }
    }


    _handleElementCountChange(event) {
        const newValue = parseInt(event.target.value);
        const countValueSpan = document.getElementById('auraFlowElementCountValue');
        if(countValueSpan) countValueSpan.textContent = newValue;

        if (this.currentMode === 'particleFlow') {
            this.initialParticles = newValue;
            this.numParticles = Math.max(newValue, 1000);
            this.initializeParticleFlow();
        } else if (this.currentMode === 'connectedFibers') {
            this.numNodes = newValue;
            this.initializeConnectedFibers();
        } else if (this.currentMode === 'voronoi') {
            this.numSeedPoints = newValue;
            // If reducing points and mouseSeedIndex becomes invalid, adjust it
            if (this.mouseSeedIndex >= newValue && newValue > 0) {
                this.mouseSeedIndex = newValue - 1;
            } else if (newValue === 0) {
                this.mouseSeedIndex = -1;
            }
            this.initializeVoronoi();
        }
        this._saveAppSettings();
    }

    _getThemeColor(varName) {
        // Helper to get actual color from CSS var, with fallback
        if (varName.startsWith('--')) {
            return getComputedStyle(document.documentElement).getPropertyValue(varName).trim() || '#FFFFFF'; // Default to white if var not found
        }
        return varName; // Assume it's already a color string
    }

    _getRandomColorFromCurrentPalette() {
        const palette = this.palettes[this.currentPaletteIndex];
        const colorName = palette.colors[Math.floor(Math.random() * palette.colors.length)];
        return this._getThemeColor(colorName);
    }

    _applyCurrentPaletteToMode() {
        const palette = this.palettes[this.currentPaletteIndex];
        const newMainColor = this._getThemeColor(palette.colors[0]); // Use first color as main for some elements

        if (this.currentMode === 'particleFlow') {
            // Particles get random colors from the palette on reset/creation
            this.particles.forEach(p => p.color = this._getRandomColorFromCurrentPalette());
        } else if (this.currentMode === 'connectedFibers') {
            this.fiberColor = newMainColor;
            // Node color could also be from palette if desired
            // this.nodeColor = this._getThemeColor(palette.colors[1 % palette.colors.length]);
        } else if (this.currentMode === 'voronoi') {
            this.seedPoints.forEach((sp, index) => {
                sp.baseColor = this._getThemeColor(palette.colors[index % palette.colors.length]);
                // Re-trigger HSL calculation in SeedPoint if baseColor changes structure
                sp.updateBaseHSL();
            });
        }
    }


    _handleColorPaletteChange() {
        this.currentPaletteIndex = (this.currentPaletteIndex + 1) % this.palettes.length;
        const paletteNameSpan = document.getElementById('auraFlowPaletteName');
        if(paletteNameSpan) paletteNameSpan.textContent = this.palettes[this.currentPaletteIndex].name;

        this._applyCurrentPaletteToMode();
        this._saveAppSettings();
        console.log(`Palette changed to: ${this.palettes[this.currentPaletteIndex].name}`);
    }

    _handleResetSimulation() {
        // Reset common settings
        this.currentPaletteIndex = 0; // Or a preferred default

        // Reset mode-specific element counts to their initial defaults
        this.initialParticles = 500;
        this.numNodes = 75;
        this.numSeedPoints = 30;
        if (this.numSeedPoints > 0) this.mouseSeedIndex = 0; else this.mouseSeedIndex = -1;

        // Reset specific configurable properties to their global defaults
        this.noiseScale = 0.01;
        this.voronoiFillStyle = 'pulsingSolid';
        this.mouseInfluenceRadius = 100;
        this.mouseForceStrength = 0.5;
        this.particleMaxAgeInSeconds = 10; // Reset particle lifespan
        this.particleMaxAge = this.particleMaxAgeInSeconds * 60;


        // Set backgroundDrawMode based on the current mode after reset
        // This ensures the background mode is appropriate for the mode being reset to.
        if (this.currentMode === 'particleFlow') {
            this.backgroundDrawMode = 'fadeToBlack';
        } else if (this.currentMode === 'connectedFibers' || this.currentMode === 'voronoi') {
            this.backgroundDrawMode = 'clear';
        } else {
            this.backgroundDrawMode = 'fadeToBlack'; // Fallback default
        }

        this._initializeCurrentMode(); // Re-initializes based on currentMode and applies counts
        this._saveAppSettings(); // Save the fully reset state
        this._updateControlPanelValues(); // Ensure UI reflects the reset state including all controls
    }

    async _handleSaveImage() { // Made async
        if (typeof createItem !== 'function' || typeof getFileSystemNode !== 'function' || typeof AuraOS === 'undefined' || typeof AuraOS.showNotification !== 'function') {
            console.error("Required File System API or Notification API not available for saving image.");
            AuraOS.showNotification({
                title: 'Erro de Sistema',
                message: '❌ API do sistema de arquivos não disponível. Não é possível salvar a imagem.',
                type: 'error'
            });
            return;
        }
        const dataURL = this.canvas.toDataURL('image/png');
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `AuraFlow-${this.currentMode}-${timestamp}.png`;
        const picturesDir = (typeof AuraOS !== 'undefined' && AuraOS.paths && AuraOS.paths.PICTURES) ? AuraOS.paths.PICTURES : '/Pictures';

        try {
            let picturesNode = getFileSystemNode(picturesDir);
            if (!picturesNode) {
                console.log(`Attempting to create directory: ${picturesDir}`);
                // createItem expects the full path for the item to be created, and its type.
                // If picturesDir is '/Pictures', createItem('/Pictures', 'folder') is correct.
                const created = await createItem(picturesDir, 'folder');
                if (created) {
                    picturesNode = getFileSystemNode(picturesDir); // Re-fetch the node after creation
                    console.log(`${picturesDir} directory created.`);
                } else {
                    AuraOS.showNotification({ title: 'Error Saving Image', message: `Failed to create ${picturesDir} directory.`, type: 'error' });
                    return;
                }
            }

            if (picturesNode && picturesNode.type === 'folder') {
                const fullFilePath = `${picturesDir}/${filename}`; // Correct path concatenation
                const saveSuccess = await createItem(fullFilePath, 'file', dataURL);
                if (saveSuccess) {
                    AuraOS.showNotification({ title: 'Snapshot Saved', message: `Image saved as ${fullFilePath}`, type: 'success' });
                    if (typeof updateDesktopAndFileExplorer === "function") updateDesktopAndFileExplorer(picturesDir);
                } else {
                    AuraOS.showNotification({ title: 'Error Saving Image', message: `Failed to save image to ${fullFilePath}.`, type: 'error' });
                }
            } else {
                AuraOS.showNotification({ title: 'Error Saving Image', message: `${picturesDir} is not a valid directory.`, type: 'error' });
            }
        } catch (error) {
            console.error("Error saving image:", error);
            AuraOS.showNotification({ title: 'Error Saving Image', message: `An unexpected error occurred: ${error.message}`, type: 'error' });
        }
    }

    _updateControlPanelVisibility() {
        const countSliderRow = document.getElementById('auraFlowElementCountRow');
        const voronoiFillStyleRow = document.getElementById('auraFlowVoronoiFillStyleRow');
        const mouseRadiusRow = document.getElementById('auraFlowMouseRadiusRow');
        const mouseForceRow = document.getElementById('auraFlowMouseForceRow');
        const lifespanRow = document.getElementById('auraFlowLifespanRow'); // Get lifespan row

        if (countSliderRow) {
            if (this.currentMode === 'particleFlow' || this.currentMode === 'connectedFibers' || this.currentMode === 'voronoi') {
                countSliderRow.style.display = 'flex';
            } else {
                countSliderRow.style.display = 'none';
            }
        }

        if (voronoiFillStyleRow) {
            if (this.currentMode === 'voronoi') {
                voronoiFillStyleRow.style.display = 'flex';
            } else {
                voronoiFillStyleRow.style.display = 'none';
            }
        }

        if (mouseRadiusRow && mouseForceRow) {
            if (this.currentMode === 'particleFlow') {
                mouseRadiusRow.style.display = 'flex';
                mouseForceRow.style.display = 'flex';
            } else {
                mouseRadiusRow.style.display = 'none';
                mouseForceRow.style.display = 'none';
            }
        }

        if (lifespanRow) { // Control visibility of lifespan row
            if (this.currentMode === 'particleFlow') {
                lifespanRow.style.display = 'flex';
            } else {
                lifespanRow.style.display = 'none';
            }
        }
        this._updateElementCountSlider(); // Update slider ranges and current value
    }


    _updateCanvasSize() {
        // Update canvas dimensions to match the actual display size
        if (!this.windowBody || !this.canvas) {
            console.warn("AuraFlow: windowBody or canvas not available for sizing");
            return;
        }
        
        const rect = this.windowBody.getBoundingClientRect();
        
        // Ensure we have valid dimensions
        if (rect.width <= 0 || rect.height <= 0) {
            console.warn("AuraFlow: Invalid windowBody dimensions:", rect);
            return;
        }
        
        // Set canvas size to match container
        this.canvas.width = rect.width;
        this.canvas.height = rect.height;
        
        // Ensure context is available
        if (!this.ctx) {
            this.ctx = this.canvas.getContext('2d');
        }
        
        console.log(`Canvas updated to: ${rect.width}x${rect.height}`);
    }

    initUI() {
        // Clear the windowBody
        this.windowBody.innerHTML = '';
        
        // Set windowBody to relative positioning for absolute positioning of controls
        this.windowBody.style.position = 'relative';
        this.windowBody.style.overflow = 'hidden';

        // Create canvas element that fills the entire window
        this.canvas = document.createElement('canvas');
        this.canvas.style.position = 'absolute';
        this.canvas.style.top = '0';
        this.canvas.style.left = '0';
        this.canvas.style.width = '100%';
        this.canvas.style.height = '100%';
        this.canvas.style.display = 'block';
        
        this.windowBody.appendChild(this.canvas);
        this.ctx = this.canvas.getContext('2d');
        
        // Set initial canvas size after getting context
        this._updateCanvasSize();

        this.mouseX = this.canvas.width / 2;
        this.mouseY = this.canvas.height / 2;

        this._boundHandleMouseMove = this._handleMouseMove.bind(this);
        this._boundHandleMouseClick = this._handleMouseClick.bind(this);
        this.canvas.addEventListener('mousemove', this._boundHandleMouseMove);
        this.canvas.addEventListener('click', this._boundHandleMouseClick);

        // --- Control Panel ---
        this.controlPanel = document.createElement('div');
        this.controlPanel.id = 'auraFlowControlPanel';
        Object.assign(this.controlPanel.style, {
            position: 'absolute',
            bottom: '20px',
            left: '20px',
            background: 'var(--glass-background)',
            border: '1px solid var(--glass-border)',
            backdropFilter: 'blur(20px) saturate(1.8)',
            WebkitBackdropFilter: 'blur(20px) saturate(1.8)', // Safari support
            padding: '16px',
            borderRadius: 'var(--ui-corner-radius)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2), 0 2px 8px rgba(0, 0, 0, 0.1)',
            zIndex: '1000',
            color: 'var(--text-color)',
            opacity: '0',
            pointerEvents: 'none',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            transform: 'translateY(10px)',
            minWidth: '280px',
            maxWidth: '350px',
            fontSize: '13px',
            fontFamily: 'var(--system-font, -apple-system, BlinkMacSystemFont, sans-serif)'
        });

        // Auto-hide listeners for panel
        this._boundShowControlPanel = this._showControlPanel.bind(this); // Used for panel's own hover
        this._boundHideControlPanelOnLeave = this._hideControlPanel.bind(this); // Used for panel's own mouseleave
        this.controlPanel.addEventListener('mouseenter', this._boundShowControlPanel);
        this.controlPanel.addEventListener('mouseleave', this._boundHideControlPanelOnLeave);

        // Global mouse move to show panel (on windowBody, not just canvas)
        this._boundMouseMoveWindowBody = () => {
            this._showControlPanel();
            this._hideControlPanel(); // Restart hide timer
        };
        this.windowBody.addEventListener('mousemove', this._boundMouseMoveWindowBody);

        // Intersection Observer for performance
        if (typeof IntersectionObserver === 'function') {
            this.visibilityObserver = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    this.isVisible = entry.isIntersecting;
                    if (this.isVisible && !this.animationFrameId) {
                        console.log("AuraFlow: Canvas became visible, restarting animation.");
                        this.startAnimation();
                    } else if (!this.isVisible && this.animationFrameId) {
                        console.log("AuraFlow: Canvas hidden, pausing animation.");
                        cancelAnimationFrame(this.animationFrameId);
                        this.animationFrameId = null;
                    }
                });
            }, { threshold: 0.1 }); // Trigger if 10% is visible

            const windowEl = this.windowBody.closest('.window');
            if (windowEl) {
                this.visibilityObserver.observe(windowEl);
            } else {
                 this.visibilityObserver.observe(this.canvas); // Fallback to canvas if window not found
            }
        } else {
            this.isVisible = true; // Assume visible if IntersectionObserver is not supported
        }

        // Resize Observer for canvas
        if (typeof ResizeObserver === 'function') {
            this.resizeObserver = new ResizeObserver(entries => {
                for (let entry of entries) {
                    // Update canvas size dynamically
                    this._updateCanvasSize();
                    
                    // Reinitialize current mode with new dimensions
                    if (this.isVisible) {
                        this._initializeCurrentMode();
                    }
                }
            });
            this.resizeObserver.observe(this.windowBody);
        }


        // Helper to create a control row
        const createControlRow = (labelText, controlElement) => {
            const row = document.createElement('div');
            row.className = 'control-row';
            Object.assign(row.style, { 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center', 
                marginBottom: '12px',
                gap: '12px'
            });

            const label = document.createElement('label');
            label.textContent = labelText;
            Object.assign(label.style, {
                fontSize: '13px',
                fontWeight: '500',
                color: 'var(--text-color)',
                minWidth: '60px',
                textAlign: 'left'
            });
            if (controlElement.id) label.htmlFor = controlElement.id;

            row.appendChild(label);
            row.appendChild(controlElement);
            return row;
        };

        // Style function for buttons
        const styleButton = (button, isPrimary = false) => {
            Object.assign(button.style, {
                padding: '6px 12px',
                border: '1px solid var(--glass-border)',
                borderRadius: 'var(--ui-corner-radius-small)',
                background: isPrimary ? 'var(--highlight-primary)' : 'var(--glass-background)',
                color: isPrimary ? 'white' : 'var(--text-color)',
                fontSize: '12px',
                fontFamily: 'inherit',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                backdropFilter: 'blur(10px)',
                WebkitBackdropFilter: 'blur(10px)'
            });
            
            button.addEventListener('mouseenter', () => {
                button.style.transform = 'translateY(-1px)';
                button.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
                if (!isPrimary) {
                    button.style.background = 'var(--glass-hover, rgba(255, 255, 255, 0.1))';
                }
            });
            
            button.addEventListener('mouseleave', () => {
                button.style.transform = 'translateY(0)';
                button.style.boxShadow = 'none';
                if (!isPrimary) {
                    button.style.background = 'var(--glass-background)';
                }
            });
        };

        // Style function for select elements
        const styleSelect = (select) => {
            Object.assign(select.style, {
                padding: '6px 8px',
                border: '1px solid var(--glass-border)',
                borderRadius: 'var(--ui-corner-radius-small)',
                background: 'var(--glass-background)',
                color: 'var(--text-color)',
                fontSize: '12px',
                fontFamily: 'inherit',
                cursor: 'pointer',
                minWidth: '120px',
                backdropFilter: 'blur(10px)',
                WebkitBackdropFilter: 'blur(10px)'
            });
        };

        // Style function for range inputs
        const styleRange = (range) => {
            Object.assign(range.style, {
                width: '100px',
                height: '4px',
                background: 'var(--glass-border)',
                borderRadius: '2px',
                outline: 'none',
                cursor: 'pointer'
            });
        };

        // Mode Selector
        const modeSelect = document.createElement('select');
        modeSelect.id = 'auraFlowModeSelect';
        styleSelect(modeSelect);
        ['particleFlow', 'connectedFibers', 'voronoi'].forEach(mode => {
            const option = document.createElement('option');
            option.value = mode;
            option.textContent = mode.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()); // Format name
            if (mode === this.currentMode) option.selected = true;
            modeSelect.appendChild(option);
        });
        this._boundHandleModeChange = this._handleModeChange.bind(this);
        modeSelect.addEventListener('change', this._boundHandleModeChange);
        this.controlPanel.appendChild(createControlRow('Mode:', modeSelect));

        // Element Count Slider
        const countSliderRow = document.createElement('div'); // Container for this row
        countSliderRow.id = 'auraFlowElementCountRow'; // To show/hide the whole row
        Object.assign(countSliderRow.style, { 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            marginBottom: '12px',
            gap: '12px'
        });

        const countLabel = document.createElement('label');
        countLabel.textContent = 'Density:';
        countLabel.htmlFor = 'auraFlowElementCount';
        Object.assign(countLabel.style, {
            fontSize: '13px',
            fontWeight: '500',
            color: 'var(--text-color)',
            minWidth: '60px'
        });
        countSliderRow.appendChild(countLabel);

        const countSliderContainer = document.createElement('div'); // To hold slider and value
        Object.assign(countSliderContainer.style, { 
            display: 'flex', 
            alignItems: 'center',
            gap: '8px'
        });

        const countSlider = document.createElement('input');
        countSlider.type = 'range';
        countSlider.id = 'auraFlowElementCount';
        styleRange(countSlider);
        // Min/max/step will be set by _updateControlPanelVisibility
        this._boundHandleElementCountChange = this._handleElementCountChange.bind(this);
        countSlider.addEventListener('input', this._boundHandleElementCountChange);
        countSliderContainer.appendChild(countSlider);

        const countValueSpan = document.createElement('span');
        countValueSpan.id = 'auraFlowElementCountValue';
        Object.assign(countValueSpan.style, {
            minWidth: '35px',
            fontSize: '12px',
            color: 'var(--subtle-text-color)',
            textAlign: 'right',
            fontFamily: 'var(--monospace-font, Menlo, Monaco, monospace)'
        });
        countSliderContainer.appendChild(countValueSpan);

        countSliderRow.appendChild(countSliderContainer);
        this.controlPanel.appendChild(countSliderRow);


        // Color Palette Button
        const paletteButtonContainer = document.createElement('div');
        Object.assign(paletteButtonContainer.style, { 
            display: 'flex', 
            alignItems: 'center',
            gap: '8px'
        });
        
        const colorPaletteBtn = document.createElement('button');
        colorPaletteBtn.id = 'auraFlowColorPaletteBtn';
        colorPaletteBtn.textContent = 'Cycle';
        styleButton(colorPaletteBtn);
        this._boundHandleColorPaletteChange = this._handleColorPaletteChange.bind(this);
        colorPaletteBtn.addEventListener('click', this._boundHandleColorPaletteChange);
        paletteButtonContainer.appendChild(colorPaletteBtn);

        const paletteNameSpan = document.createElement('span');
        paletteNameSpan.id = 'auraFlowPaletteName';
        paletteNameSpan.textContent = this.palettes[this.currentPaletteIndex].name;
        Object.assign(paletteNameSpan.style, {
            fontSize: '12px',
            color: 'var(--subtle-text-color)',
            fontStyle: 'italic'
        });
        paletteButtonContainer.appendChild(paletteNameSpan);
        this.controlPanel.appendChild(createControlRow('Palette:', paletteButtonContainer));

        // Particle Lifespan Slider
        const lifespanSliderContainer = document.createElement('div');
        Object.assign(lifespanSliderContainer.style, { display: 'flex', alignItems: 'center', gap: '8px' });
        const lifespanSlider = document.createElement('input');
        lifespanSlider.type = 'range';
        lifespanSlider.id = 'auraFlowLifespanSlider';
        lifespanSlider.min = "1"; lifespanSlider.max = "60"; lifespanSlider.step = "1"; lifespanSlider.value = this.particleMaxAgeInSeconds;
        styleRange(lifespanSlider);
        const lifespanValue = document.createElement('span');
        lifespanValue.id = 'auraFlowLifespanValue';
        lifespanValue.textContent = this.particleMaxAgeInSeconds + 's';
        Object.assign(lifespanValue.style, { minWidth: '35px', fontSize: '12px', color: 'var(--subtle-text-color)', textAlign: 'right', fontFamily: 'var(--monospace-font, Menlo, Monaco, monospace)' });
        lifespanSlider.addEventListener('input', (event) => {
            this.particleMaxAgeInSeconds = parseInt(event.target.value);
            lifespanValue.textContent = this.particleMaxAgeInSeconds + 's';
            this.particleMaxAge = this.particleMaxAgeInSeconds * 60;
            this._saveAppSettings();
            // Existing particles will age out with old maxAge or be reset. New/Reset particles get new maxAge.
        });
        lifespanSliderContainer.appendChild(lifespanSlider);
        lifespanSliderContainer.appendChild(lifespanValue);
        const lifespanRow = createControlRow('Lifespan:', lifespanSliderContainer);
        lifespanRow.id = 'auraFlowLifespanRow'; // For visibility control
        this.controlPanel.appendChild(lifespanRow);


        // Voronoi Fill Style Selector
        const voronoiFillStyleSelect = document.createElement('select');
        voronoiFillStyleSelect.id = 'auraFlowVoronoiFillStyleSelect';
        styleSelect(voronoiFillStyleSelect);
        [
            { value: 'pulsingSolid', text: 'Pulsing Solid' },
            { value: 'gradient', text: 'Gradient' },
            { value: 'scanLines', text: 'Scan Lines' }
        ].forEach(opt => {
            const option = document.createElement('option');
            option.value = opt.value;
            option.textContent = opt.text;
            if (opt.value === this.voronoiFillStyle) option.selected = true;
            voronoiFillStyleSelect.appendChild(option);
        });
        voronoiFillStyleSelect.addEventListener('change', (event) => {
            this.voronoiFillStyle = event.target.value;
            this._saveAppSettings();
            // No need to re-initialize, animateVoronoi will pick it up
        });
        const voronoiFillStyleRow = createControlRow('Fill Style:', voronoiFillStyleSelect);
        voronoiFillStyleRow.id = 'auraFlowVoronoiFillStyleRow'; // For show/hide
        this.controlPanel.appendChild(voronoiFillStyleRow);

        // Mouse Radius Slider
        const mouseRadiusSliderContainer = document.createElement('div');
        Object.assign(mouseRadiusSliderContainer.style, { display: 'flex', alignItems: 'center', gap: '8px' });
        const mouseRadiusSlider = document.createElement('input');
        mouseRadiusSlider.type = 'range';
        mouseRadiusSlider.id = 'auraFlowMouseRadiusSlider';
        mouseRadiusSlider.min = "10"; mouseRadiusSlider.max = "300"; mouseRadiusSlider.step = "5"; mouseRadiusSlider.value = this.mouseInfluenceRadius;
        styleRange(mouseRadiusSlider);
        const mouseRadiusValue = document.createElement('span');
        mouseRadiusValue.id = 'auraFlowMouseRadiusValue';
        mouseRadiusValue.textContent = this.mouseInfluenceRadius;
        Object.assign(mouseRadiusValue.style, { minWidth: '35px', fontSize: '12px', color: 'var(--subtle-text-color)', textAlign: 'right', fontFamily: 'var(--monospace-font, Menlo, Monaco, monospace)' });
        mouseRadiusSlider.addEventListener('input', (event) => {
            this.mouseInfluenceRadius = parseInt(event.target.value);
            mouseRadiusValue.textContent = this.mouseInfluenceRadius;
            this._saveAppSettings();
        });
        mouseRadiusSliderContainer.appendChild(mouseRadiusSlider);
        mouseRadiusSliderContainer.appendChild(mouseRadiusValue);
        const mouseRadiusRow = createControlRow('Mouse Radius:', mouseRadiusSliderContainer);
        mouseRadiusRow.id = 'auraFlowMouseRadiusRow';
        this.controlPanel.appendChild(mouseRadiusRow);

        // Mouse Force Slider
        const mouseForceSliderContainer = document.createElement('div');
        Object.assign(mouseForceSliderContainer.style, { display: 'flex', alignItems: 'center', gap: '8px' });
        const mouseForceSlider = document.createElement('input');
        mouseForceSlider.type = 'range';
        mouseForceSlider.id = 'auraFlowMouseForceSlider';
        mouseForceSlider.min = "0.1"; mouseForceSlider.max = "2.0"; mouseForceSlider.step = "0.1"; mouseForceSlider.value = this.mouseForceStrength;
        styleRange(mouseForceSlider);
        const mouseForceValue = document.createElement('span');
        mouseForceValue.id = 'auraFlowMouseForceValue';
        mouseForceValue.textContent = this.mouseForceStrength.toFixed(1);
        Object.assign(mouseForceValue.style, { minWidth: '35px', fontSize: '12px', color: 'var(--subtle-text-color)', textAlign: 'right', fontFamily: 'var(--monospace-font, Menlo, Monaco, monospace)' });
        mouseForceSlider.addEventListener('input', (event) => {
            this.mouseForceStrength = parseFloat(event.target.value);
            mouseForceValue.textContent = this.mouseForceStrength.toFixed(1);
            this._saveAppSettings();
        });
        mouseForceSliderContainer.appendChild(mouseForceSlider);
        mouseForceSliderContainer.appendChild(mouseForceValue);
        const mouseForceRow = createControlRow('Mouse Force:', mouseForceSliderContainer);
        mouseForceRow.id = 'auraFlowMouseForceRow';
        this.controlPanel.appendChild(mouseForceRow);


        // Add separator
        const separator = document.createElement('div');
        Object.assign(separator.style, {
            height: '1px',
            background: 'var(--glass-border)',
            margin: '12px 0',
            opacity: '0.5'
        });
        this.controlPanel.appendChild(separator);

        // Action Buttons Container
        const actionsContainer = document.createElement('div');
        Object.assign(actionsContainer.style, {
            display: 'flex',
            gap: '8px',
            marginTop: '4px'
        });

        const resetBtn = document.createElement('button');
        resetBtn.id = 'auraFlowResetBtn';
        resetBtn.textContent = 'Reset';
        styleButton(resetBtn);
        this._boundHandleResetSimulation = this._handleResetSimulation.bind(this);
        resetBtn.addEventListener('click', this._boundHandleResetSimulation);
        actionsContainer.appendChild(resetBtn);

        const saveImageBtn = document.createElement('button');
        saveImageBtn.id = 'auraFlowSaveImageBtn';
        saveImageBtn.textContent = 'Save';
        styleButton(saveImageBtn, true); // Primary button style
        this._boundHandleSaveImage = this._handleSaveImage.bind(this);
        saveImageBtn.addEventListener('click', this._boundHandleSaveImage);
        actionsContainer.appendChild(saveImageBtn);

        this.controlPanel.appendChild(createControlRow('Actions:', actionsContainer));


        this.windowBody.appendChild(this.controlPanel);
        this._updateControlPanelVisibility(); // Initial setup of slider visibility and ranges
        this._showControlPanel(); // Show initially
        this._hideControlPanel(); // Then start timer to hide

        console.log("UI initialized with control panel. Event listeners added.");
    }

    initializeParticleFlow() {
        this.particles = [];
        this.time = 0; // Reset time for new flow
        for (let i = 0; i < this.initialParticles; i++) { // Use initialParticles
            this.particles.push(new Particle(
                Math.random() * this.canvas.width,
                Math.random() * this.canvas.height,
                this.particleSize,
                this._getRandomColorFromCurrentPalette(),
                this.particleMaxAge, // Pass particleMaxAge (in frames)
                this.canvas
            ));
        }
        console.log(`${this.initialParticles} particles initialized for particle flow.`);
    }

    animateParticleFlow() {
        // Background drawing logic based on mode
        if (this.backgroundDrawMode === 'clear') {
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        } else if (this.backgroundDrawMode === 'fadeToBlack') {
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        } // else 'persistent': do nothing to the background

        this.time += 0.005; // Increment time for noise evolution

        for (let i = this.particles.length - 1; i >= 0; i--) {
            const particle = this.particles[i];

            // Calculate Perlin noise for flow field angle
            const noiseValue = this.perlinNoise.noise(
                particle.x * this.noiseScale,
                particle.y * this.noiseScale,
                this.time
            );
            const angle = noiseValue * Math.PI * 4; // Map noise from -1 to 1 to an angle (0 to 4PI for more rotation)

            // Set particle velocity based on the flow field angle
            // We want current velocity to be primarily driven by the field, but allow for mouse interaction and damping.
            // So, we'll set a base velocity from the field and then let mouse/damping modify it.
            let fieldVx = Math.cos(angle) * this.particleSpeedMultiplier;
            let fieldVy = Math.sin(angle) * this.particleSpeedMultiplier;

            // Apply this field velocity, potentially adding to existing for a smoother transition or setting directly
            // For now, let's blend it with existing velocity slightly to avoid jerky movements if mouse was just active
            particle.vx = particle.vx * 0.5 + fieldVx * 0.5;
            particle.vy = particle.vy * 0.5 + fieldVy * 0.5;

            // Mouse interaction - this adds to the velocity calculated by the flow field
            if (this.mouseX !== null && this.mouseY !== null) {
                const dxMouse = particle.x - this.mouseX;
                const dyMouse = particle.y - this.mouseY;
                const distMouseSq = dxMouse * dxMouse + dyMouse * dyMouse;

                if (distMouseSq < this.mouseInfluenceRadius * this.mouseInfluenceRadius && distMouseSq > 0) {
                    const distMouse = Math.sqrt(distMouseSq);
                    const forceDirectionX = dxMouse / distMouse;
                    const forceDirectionY = dyMouse / distMouse;
                    const force = (this.mouseInfluenceRadius - distMouse) / this.mouseInfluenceRadius * this.mouseForceStrength;
                    // Add mouse force to the existing velocity
                    particle.vx += forceDirectionX * force;
                    particle.vy += forceDirectionY * force;
                }
            }

            // Add some friction/damping (applied after field and mouse)
            particle.vx *= 0.97;
            particle.vy *= 0.97;

            // Limit overall speed (applied after all forces and damping)
            const speed = Math.sqrt(particle.vx * particle.vx + particle.vy * particle.vy);
            const maxSpeed = this.particleSpeedMultiplier * 2.5; // Max speed particles can reach
            if (speed > maxSpeed) {
                particle.vx = (particle.vx / speed) * maxSpeed;
                particle.vy = (particle.vy / speed) * maxSpeed;
            }

            particle.update();
            particle.draw(this.ctx);

            if (particle.age > particle.maxAge) {
                if (this.particles.length > this.initialParticles * 0.5 || this.particles.length > this.particleBurstAmount) {
                   this.particles.splice(i, 1);
                } else {
                    particle.reset(
                        Math.random() * this.canvas.width,
                        Math.random() * this.canvas.height,
                        this._getRandomColorFromCurrentPalette()
                    );
                }
            }
        }
        if (this.isVisible) this.animationFrameId = requestAnimationFrame(this.animateParticleFlow.bind(this));
    }

    startAnimation() {
        if (!this.isVisible) {
            console.log("AuraFlow: Attempted to start animation while not visible. Aborting.");
            return;
        }
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
        }

        if (this.currentMode === 'particleFlow') {
            this.animateParticleFlow();
        } else if (this.currentMode === 'connectedFibers') {
            this.animateConnectedFibers();
        } else if (this.currentMode === 'voronoi') {
            console.log('Voronoi Mode: Checking for d3 library. typeof window.d3:', typeof window.d3, 'd3.Delaunay:', (typeof window.d3 !== 'undefined' && window.d3 ? typeof window.d3.Delaunay : 'd3 or d3.Delaunay undefined'));
            if (typeof window.d3 !== 'undefined' && typeof window.d3.Delaunay !== 'undefined') {
                this.voronoiLoadRetries = 0; // Reset retries on successful load
                this.animateVoronoi();
            } else {
                if (this.voronoiLoadRetries < this.maxVoronoiLoadRetries) {
                    this.voronoiLoadRetries++;
                    console.warn(`AuraFlow: d3-delaunay not yet loaded. Retry ${this.voronoiLoadRetries}/${this.maxVoronoiLoadRetries}. Retrying in 100ms...`);
                    if (this.canvas && this.ctx) {
                        const windowEl = this.windowBody.closest('.window');
                        if (windowEl && windowEl.id === this.appData.windowId && this.isVisible) { // Check if AuraFlow is active for this window
                            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height); // Clear previous frame/message
                            this.ctx.fillStyle = 'rgba(0,0,0,0.7)';
                            this.ctx.fillRect(0,0, this.canvas.width, this.canvas.height);
                            this.ctx.fillStyle = 'white';
                            this.ctx.font = '16px Arial';
                            this.ctx.textAlign = 'center';
                            this.ctx.fillText(`Voronoi: Waiting for library... (Attempt ${this.voronoiLoadRetries}/${this.maxVoronoiLoadRetries})`, this.canvas.width / 2, this.canvas.height / 2);
                        }
                    }
                    setTimeout(() => {
                        this.startAnimation();
                    }, 100);
                } else {
                    console.error(`AuraFlow: d3-delaunay failed to load after ${this.maxVoronoiLoadRetries} retries.`);
                    if (this.canvas && this.ctx) {
                        // Ensure this part only executes if the window is still the active AuraFlow window
                        const windowEl = this.windowBody.closest('.window');
                        if (windowEl && windowEl.id === this.appData.windowId && this.isVisible) {
                            this.ctx.fillStyle = 'rgba(0,0,0,0.7)';
                            this.ctx.fillRect(0,0, this.canvas.width, this.canvas.height);
                            this.ctx.fillStyle = 'white';
                            this.ctx.font = '16px Arial';
                            this.ctx.textAlign = 'center';
                            this.ctx.fillText("Voronoi library (d3-delaunay) could not be loaded.", this.canvas.width / 2, this.canvas.height / 2 - 10);
                            this.ctx.fillText("Please check internet or refresh.", this.canvas.width/2, this.canvas.height/2 + 10);
                        }
                    }
                }
            }
        } else {
            console.warn(`Animation mode "${this.currentMode}" not recognized.`);
        }
    }

    // --- Connected Fibers Mode Methods ---
    initializeConnectedFibers() {
        this.nodes = [];
        this.time = 0; // Reset time for potential noise use here too
        for (let i = 0; i < this.numNodes; i++) {
            this.nodes.push(new Node(
                Math.random() * this.canvas.width,
                Math.random() * this.canvas.height,
                (Math.random() - 0.5) * 2 * this.nodeSpeedMultiplier, // Initial random velocity
                (Math.random() - 0.5) * 2 * this.nodeSpeedMultiplier,
                this.nodeSize,
                this.nodeColor,
                this.canvas
            ));
        }
        console.log(`${this.numNodes} nodes initialized for connected fibers.`);
    }

    animateConnectedFibers() {
        // Background drawing logic based on mode
        if (this.backgroundDrawMode === 'clear') {
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        } else if (this.backgroundDrawMode === 'fadeToBlack') {
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        } // else 'persistent': do nothing to the background

        // this.time += 0.002; // Slower time evolution for fibers // Removed: No Perlin here

        for (const node of this.nodes) {
            // Original movement logic:
            // node.vx and node.vy are set during initialization or by interaction (e.g. click)
            // and then node.update() handles the movement based on these velocities.
            // No Perlin noise influence here.

            node.update(); // Updates position based on vx, vy and handles screen wrapping
            node.draw(this.ctx);
        }

        // Draw fibers between nodes and from nodes to mouse
        for (let i = 0; i < this.nodes.length; i++) {
            const nodeA = this.nodes[i];
            // Connections to other nodes
            for (let j = i + 1; j < this.nodes.length; j++) {
                const nodeB = this.nodes[j];
                const dx = nodeA.x - nodeB.x;
                const dy = nodeA.y - nodeB.y;
                const distance = Math.sqrt(dx * dx + dy * dy);

                if (distance < this.connectionDistance) {
                    const opacity = 1 - (distance / this.connectionDistance);
                    const thickness = Math.max(0.5, (1 - (distance / this.connectionDistance)) * this.maxFiberThickness);
                    this.ctx.beginPath();
                    this.ctx.moveTo(nodeA.x, nodeA.y);
                    this.ctx.lineTo(nodeB.x, nodeB.y);
                    this.ctx.strokeStyle = this.fiberColor;
                    this.ctx.lineWidth = thickness;
                    this.ctx.save();
                    this.ctx.globalAlpha = Math.max(0, Math.min(1, opacity * 0.8));
                    this.ctx.stroke();
                    this.ctx.restore();
                }
            }

            // Connections to mouse
            if (this.mouseX !== null && this.mouseY !== null) {
                const dxMouse = nodeA.x - this.mouseX;
                const dyMouse = nodeA.y - this.mouseY;
                const distMouse = Math.sqrt(dxMouse * dxMouse + dyMouse * dyMouse);

                if (distMouse < this.connectionDistance) {
                    const opacity = 1 - (distMouse / this.connectionDistance);
                    const thickness = Math.max(0.5, (1 - (distMouse / this.connectionDistance)) * this.maxFiberThickness);
                    this.ctx.beginPath();
                    this.ctx.moveTo(nodeA.x, nodeA.y);
                    this.ctx.lineTo(this.mouseX, this.mouseY);
                    this.ctx.strokeStyle = this.fiberColor;
                    this.ctx.lineWidth = thickness;
                    this.ctx.save();
                    this.ctx.globalAlpha = Math.max(0, Math.min(1, opacity * 0.5));
                    this.ctx.stroke();
                    this.ctx.restore();
                }
            }
        }
        if (this.isVisible) {
            this.animationFrameId = requestAnimationFrame(this.animateConnectedFibers.bind(this));
        }
    }

    // --- Voronoi Tessellation Mode Methods ---
    initializeVoronoi() {
        this.seedPoints = [];
        this.time = 0; // Reset time
        const palette = this.palettes[this.currentPaletteIndex];

        for (let i = 0; i < this.numSeedPoints; i++) {
            const baseColor = this._getThemeColor(palette.colors[i % palette.colors.length]);
            this.seedPoints.push(new SeedPoint(
                Math.random() * this.canvas.width,
                Math.random() * this.canvas.height,
                (Math.random() - 0.5) * 2 * this.seedSpeedMultiplier, // vx
                (Math.random() - 0.5) * 2 * this.seedSpeedMultiplier, // vy
                baseColor,
                this.canvas
            ));
        }
        if (this.seedPoints.length > 0 && this.mouseSeedIndex >= this.seedPoints.length) {
            this.mouseSeedIndex = this.seedPoints.length -1;
        } else if (this.seedPoints.length === 0) {
            this.mouseSeedIndex = -1;
        }

        console.log(`${this.numSeedPoints} seed points initialized for Voronoi. Mouse seed index: ${this.mouseSeedIndex}`);
    }

    animateVoronoi() {
        // Background drawing logic based on mode
        if (this.backgroundDrawMode === 'clear') {
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        } else if (this.backgroundDrawMode === 'fadeToBlack') {
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        } // else 'persistent': do nothing to the background

        this.time += 0.01; // Time for scanLines animation

        // Update seed points
        this.seedPoints.forEach((point, index) => {
            if (index === this.mouseSeedIndex && this.mouseX !== null && this.mouseY !== null) {
                if (this.mouseX >= 0 && this.mouseX <= this.canvas.width && this.mouseY >= 0 && this.mouseY <= this.canvas.height) {
                    point.x = this.mouseX;
                    point.y = this.mouseY;
                    point.vx = 0; // Stop its own movement when mouse-controlled and within bounds
                    point.vy = 0;
                } else {
                    point.update(); // Let it move if mouse is out of bounds
                }
            } else {
                point.update(); // Update non-mouse-controlled points
            }
            // All points should pulse, regardless of mouse control
            // point.pulsePhase is updated within point.update(), so no need to call it separately here
            // if we ensure point.update() is called for the mouse-controlled point when it's not moving.
            // Let's adjust SeedPoint.update() or call pulsePhase update here explicitly for the mouse seed.
            if (index === this.mouseSeedIndex) { // Ensure mouse seed also pulses
                 point.pulsePhase += 0.02;
            }
        });

        const pointsForDelaunay = this.seedPoints.map(p => [p.x, p.y]);
        const uniquePoints = Array.from(new Set(pointsForDelaunay.map(p => `${p[0]},${p[1]}`))).map(s => s.split(',').map(Number));

        if (uniquePoints.length < 3) {
            this.seedPoints.forEach(p => p.draw(this.ctx)); // Draw points if no valid diagram
            if (this.isVisible) this.animationFrameId = requestAnimationFrame(this.animateVoronoi.bind(this));
            return;
        }

        const delaunay = d3.Delaunay.from(pointsForDelaunay);
        this.voronoiDiagram = delaunay.voronoi([0, 0, this.canvas.width, this.canvas.height]);

        for (let i = 0; i < this.seedPoints.length; i++) {
            const point = this.seedPoints[i];
            const cell = this.voronoiDiagram.cellPolygon(i);

            if (cell) {
                this.ctx.beginPath();
                this.ctx.moveTo(cell[0][0], cell[0][1]);
                for (let k = 1; k < cell.length; k++) {
                    this.ctx.lineTo(cell[k][0], cell[k][1]);
                }
                this.ctx.closePath();

                // Calculate bounding box for gradient and scanlines
                let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
                if (this.voronoiFillStyle === 'gradient' || this.voronoiFillStyle === 'scanLines') {
                    for (const p_coord of cell) { // Renamed p to p_coord to avoid conflict
                        if (p_coord[0] < minX) minX = p_coord[0];
                        if (p_coord[0] > maxX) maxX = p_coord[0];
                        if (p_coord[1] < minY) minY = p_coord[1];
                        if (p_coord[1] > maxY) maxY = p_coord[1];
                    }
                }

                // Fill style logic
                if (this.voronoiFillStyle === 'pulsingSolid') {
                    this.ctx.fillStyle = point.getPulsingColor();
                    this.ctx.fill();
                } else if (this.voronoiFillStyle === 'gradient') {
                    const palette = this.palettes[this.currentPaletteIndex];
                    // Simpler secondary color selection using point's index
                    const secondaryColor = this._getThemeColor(palette.colors[(i + 1) % palette.colors.length]);

                    const gradient = this.ctx.createLinearGradient(minX, minY, maxX, maxY);
                    gradient.addColorStop(0, point.baseColor);
                    gradient.addColorStop(1, secondaryColor);
                    this.ctx.fillStyle = gradient;
                    this.ctx.fill();
                } else if (this.voronoiFillStyle === 'scanLines') {
                    this.ctx.save();
                    this.ctx.clip(); // Clip to the cell path

                    const lineColor = point.getPulsingColor();
                    const lineThickness = 2;
                    const lineSpacing = 4; // Space between lines
                    const totalSpacing = lineThickness + lineSpacing;

                    // Use this.time for animation, ensuring it's updated each frame.
                    // point.pulsePhase can also be used for individual offsets if desired.
                    const timeOffset = (this.time * 50) % totalSpacing;


                    this.ctx.strokeStyle = lineColor;
                    this.ctx.lineWidth = lineThickness;

                    if (isFinite(minX) && isFinite(minY) && isFinite(maxX) && isFinite(maxY)) {
                        for (let y = minY - totalSpacing + timeOffset; y < maxY + totalSpacing; y += totalSpacing) {
                            this.ctx.beginPath();
                            this.ctx.moveTo(minX, y);
                            this.ctx.lineTo(maxX, y);
                            this.ctx.stroke();
                        }
                    }
                    this.ctx.restore();
                }

                // Cell Border
                this.ctx.strokeStyle = this.voronoiCellBorderColor;
                this.ctx.lineWidth = 1;
                this.ctx.stroke();
            }
        }
        if (this.isVisible) this.animationFrameId = requestAnimationFrame(this.animateVoronoi.bind(this));
    }

    // _updateSeedPointWithPerlin removed as it's no longer used.
}

class SeedPoint {
    constructor(x, y, vx, vy, baseColor, canvas) {
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.baseColor = baseColor; // e.g., HSL or hex string
        this.color = baseColor;
        this.pulsePhase = Math.random() * Math.PI * 2; // Random start for pulsing
        this.canvas = canvas;
        this.size = 3; // Size for drawing the seed point itself (optional)

         // Convert baseColor to HSL if it's not already (simplification: assuming hex/rgb for now)
        let r = 0, g = 0, b = 0;
        if (baseColor.startsWith('#')) {
            const hex = baseColor.slice(1);
            r = parseInt(hex.substring(0,2), 16);
            g = parseInt(hex.substring(2,4), 16);
            b = parseInt(hex.substring(4,6), 16);
        } else if (baseColor.startsWith('rgb')) {
            const parts = baseColor.match(/[\d.]+/g);
            if (parts && parts.length >= 3) {
                r = parseInt(parts[0]);
                g = parseInt(parts[1]);
                b = parseInt(parts[2]);
            }
        }
        // Basic RGB to HSL conversion (simplified)
        const max = Math.max(r, g, b), min = Math.min(r, g, b);
        let h, s, l = (max + min) / 2 / 255;
        if (max === min) {
            h = s = 0; // achromatic
        } else {
            const d = max - min;
            s = l > 0.5 ? d / (2 * 255 - max - min) : d / (max + min);
            switch(max){
                case r: h = (g - b) / d + (g < b ? 6 : 0); break;
                case g: h = (b - r) / d + 2; break;
                case b: h = (r - g) / d + 4; break;
            }
            h /= 6;
        }
        this.baseH = h * 360;
        this.baseS = s * 100;
        this.baseL = l * 100;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;

        // Screen wrapping
        if (this.x > this.canvas.width + this.size) this.x = -this.size;
        else if (this.x < -this.size) this.x = this.canvas.width + this.size;
        if (this.y > this.canvas.height + this.size) this.y = -this.size;
        else if (this.y < -this.size) this.y = this.canvas.height + this.size;

        this.pulsePhase += 0.02; // Speed of pulsing
    }

    // Ensure pulsePhase is updated even if vx/vy are 0 (e.g. for mouse-controlled point)
    // This is now handled by calling point.pulsePhase += 0.02; explicitly in animateVoronoi for the mouse seed.
    // Alternatively, ensure update() always updates pulsePhase.

    getPulsingColor() {
        // Pulse lightness: L varies between baseL*0.7 and baseL*1.0 (or baseL and baseL*0.7 if baseL is high)
        const lightnessVariation = Math.sin(this.pulsePhase) * 15; // Pulse by +/- 15% lightness
        let currentL = this.baseL + lightnessVariation;
        currentL = Math.max(10, Math.min(90, currentL)); // Clamp lightness
        return `hsl(${this.baseH}, ${this.baseS}%, ${currentL}%)`;
    }

    updateBaseHSL() {
        // Re-convert baseColor to HSL if the color has changed
        let r = 0, g = 0, b = 0;
        if (this.baseColor.startsWith('#')) {
            const hex = this.baseColor.slice(1);
            r = parseInt(hex.substring(0,2), 16);
            g = parseInt(hex.substring(2,4), 16);
            b = parseInt(hex.substring(4,6), 16);
        } else if (this.baseColor.startsWith('rgb')) {
            const parts = this.baseColor.match(/[\d.]+/g);
            if (parts && parts.length >= 3) {
                r = parseInt(parts[0]);
                g = parseInt(parts[1]);
                b = parseInt(parts[2]);
            }
        }
        // Basic RGB to HSL conversion (simplified)
        const max = Math.max(r, g, b), min = Math.min(r, g, b);
        let h, s, l = (max + min) / 2 / 255;
        if (max === min) {
            h = s = 0; // achromatic
        } else {
            const d = max - min;
            s = l > 0.5 ? d / (2 * 255 - max - min) : d / (max + min);
            switch(max){
                case r: h = (g - b) / d + (g < b ? 6 : 0); break;
                case g: h = (b - r) / d + 2; break;
                case b: h = (r - g) / d + 4; break;
            }
            h /= 6;
        }
        this.baseH = h * 360;
        this.baseS = s * 100;
        this.baseL = l * 100;
    }

    draw(ctx) { // Optional: for drawing the seed points themselves
        ctx.fillStyle = this.getPulsingColor();
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
    }
}


class Node {
    constructor(x, y, vx, vy, size, color, canvas) {
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.size = size;
        this.color = color;
        this.canvas = canvas;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;

        // Screen wrapping
        if (this.x > this.canvas.width + this.size) this.x = -this.size;
        else if (this.x < -this.size) this.x = this.canvas.width + this.size;
        if (this.y > this.canvas.height + this.size) this.y = -this.size;
        else if (this.y < -this.size) this.y = this.canvas.height + this.size;
    }

    draw(ctx) {
        if (!this.size || !this.color) return; // Don't draw if no size/color
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
    }
}

class Particle {
    constructor(x, y, size, color, maxAge, canvas) {
        this.x = x;
        this.y = y;
        this.size = size;
        this.initialColor = color; // Store initial color
        this.color = color;
        this.maxAge = maxAge;
        this.age = 0;
        this.vx = 0;
        this.vy = 0;
        this.canvas = canvas; // Store canvas reference
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.age++;

        // Boundary conditions: wrap around screen
        if (this.x > this.canvas.width + this.size) this.x = -this.size;
        else if (this.x < -this.size) this.x = this.canvas.width + this.size;
        if (this.y > this.canvas.height + this.size) this.y = -this.size;
        else if (this.y < -this.size) this.y = this.canvas.height + this.size;
    }

    draw(ctx) {
        const opacity = 1 - (this.age / this.maxAge);
        ctx.save();
        ctx.globalAlpha = Math.max(0, opacity);
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    reset(x, y, color, newMaxAge) { // Added newMaxAge parameter
        this.x = x;
        this.y = y;
        this.age = 0;
        this.color = color || this.initialColor;
        this.vx = 0;
        this.vy = 0;
        if (newMaxAge !== undefined) { // Update maxAge if provided
            this.maxAge = newMaxAge;
        }
        // If newMaxAge is not provided, it keeps its original maxAge from construction.
        // Or, if global maxAge should always apply on reset:
        // this.maxAge = newMaxAge || this.maxAge; // Or reference a global this.particleMaxAge if available here
    }
}
