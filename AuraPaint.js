class AuraPaintApp {
    constructor(windowBody, appData = {}) {
        this.windowBody = windowBody;
        this.appData = appData;
        this.filePath = appData.filePath || null;
        this.isDirty = false;
        this.previousDrawingTool = 'pencil';

        this.state = { /* ... existing state ... */
            currentTool: 'pencil',
            primaryColor: '#000000',
            secondaryColor: '#FFFFFF',
            lineWidth: 5,
            opacity: 1,
            history: [],
            historyPointer: -1,
            shapeType: 'rectangle',
            shapeFillColor: '#000000',
            shapeStrokeColor: '#FFFFFF',
            shapeStrokeWidth: 2,
            shapeEnableFill: true,
            shapeEnableStroke: true,
            shapeStartX: null,
            shapeStartY: null,
            isDrawingShape: false,
            previewCanvas: null,
            previewCtx: null,
        };
        this.state.shapeFillColor = this.state.primaryColor;
        this.state.shapeStrokeColor = this.state.secondaryColor;

        // UI Elements
        this.canvas = null;
        this.ctx = null;
        this.tempDrawingCanvas = null; // For offscreen drawing of strokes
        this.tempDrawingCtx = null;
        // ... (all other UI element properties initialized to null)
        this.primaryColorPicker = null;
        this.secondaryColorPicker = null;
        this.clearButton = null;
        this.toolbar = null;
        this.toolOptionsPanel = null;
        this.brushOptionsContainer = null;
        this.lineWidthSlider = null;
        this.lineWidthValueDisplay = null;
        this.opacitySlider = null;
        this.opacityValueDisplay = null;
        this.shapeOptionsContainer = null;
        this.shapeTypeSelector = null;
        this.shapeEnableFillCheckbox = null;
        this.shapeEnableStrokeCheckbox = null;
        this.shapeStrokeWidthSlider = null;
        this.shapeStrokeWidthValueDisplay = null;
        this.fileMenuButton = null;
        this.fileMenuDropdown = null;
        this.undoButton = null;
        this.redoButton = null;


        this.drawing = false;
        this.lastX = 0;
        this.lastY = 0;

        this.initUI();
        this.initCanvas();
        this.initPreviewCanvas();
        this.initTempDrawingCanvas(); // Initialize the new temporary canvas
        this.addEventListeners();
        this.updateToolOptionsVisibility();

        const initialFilePath = this.filePath;
        const postInitActions = async () => {
            if (initialFilePath) {
                await this.loadFromFile(initialFilePath);
            } else {
                this.updateWindowTitle();
                this.saveHistoryState();
            }
            this.updateUndoRedoButtonStates();
        };

        setTimeout(() => {
            postInitActions();
            this.ensureDefaultSaveDirectory();
        }, 100);

        console.log("AuraPaint app instance created and initialized. Initial FilePath:", initialFilePath);
    }

    async ensureDefaultSaveDirectory() { /* ... same ... */ }
    initUI() { /* ... same ... */ }
    updateToolOptionsVisibility() { /* ... same ... */ }
    initCanvas() { /* ... same ... */ }
    initPreviewCanvas() { /* ... same ... */ }

    initTempDrawingCanvas() {
        if (!this.canvas) { // Depends on main canvas size
            console.error("Main canvas not initialized before temp drawing canvas.");
            return;
        }
        this.tempDrawingCanvas = document.createElement('canvas');
        this.tempDrawingCtx = this.tempDrawingCanvas.getContext('2d');
        // Dimensions and scaling will be set in resizeCanvas
        this.tempDrawingCtx.lineCap = 'round';
        this.tempDrawingCtx.lineJoin = 'round';
    }

    resizeCanvas(width, height) {
        if (!this.canvas || !this.ctx || !this.state.previewCanvas || !this.state.previewCtx || !this.tempDrawingCanvas || !this.tempDrawingCtx) return;

        const dpr = window.devicePixelRatio || 1;
        const logicalWidth = Math.max(10, width);
        const logicalHeight = Math.max(10, height);
        const physicalWidth = Math.floor(logicalWidth * dpr);
        const physicalHeight = Math.floor(logicalHeight * dpr);

        // Preserve main canvas content
        let oldContent = null;
        if (this.canvas.width > 0 && this.canvas.height > 0) {
            const tempOldCanvas = document.createElement('canvas');
            tempOldCanvas.width = this.canvas.width; tempOldCanvas.height = this.canvas.height;
            tempOldCanvas.getContext('2d').drawImage(this.canvas, 0, 0);
            oldContent = tempOldCanvas;
        }

        // Resize and scale main canvas
        this.canvas.width = physicalWidth;
        this.canvas.height = physicalHeight;
        this.canvas.style.width = `${logicalWidth}px`;
        this.canvas.style.height = `${logicalHeight}px`;
        this.ctx.scale(dpr, dpr);
        if (oldContent) {
            this.ctx.clearRect(0,0, logicalWidth, logicalHeight);
            this.ctx.drawImage(oldContent, 0, 0, oldContent.width, oldContent.height, 0, 0, logicalWidth, logicalHeight);
        }

        // Resize and scale preview canvas
        this.state.previewCanvas.width = physicalWidth;
        this.state.previewCanvas.height = physicalHeight;
        this.state.previewCanvas.style.width = `${logicalWidth}px`;
        this.state.previewCanvas.style.height = `${logicalHeight}px`;
        this.state.previewCanvas.style.left = `${this.canvas.offsetLeft}px`;
        this.state.previewCanvas.style.top = `${this.canvas.offsetTop}px`;
        this.state.previewCtx.scale(dpr, dpr);

        // Resize and scale temporary drawing canvas
        this.tempDrawingCanvas.width = physicalWidth;
        this.tempDrawingCanvas.height = physicalHeight;
        this.tempDrawingCtx.scale(dpr, dpr);


        // Re-apply settings to all relevant contexts
        const contexts = [this.ctx, this.state.previewCtx, this.tempDrawingCtx];
        contexts.forEach(currentCtx => {
            if (!currentCtx) return;
            currentCtx.lineCap = 'round';
            currentCtx.lineJoin = 'round';
            // Initial/default settings; tool-specific settings will override during drawing
            currentCtx.strokeStyle = this.state.primaryColor;
            currentCtx.lineWidth = this.state.lineWidth;
            currentCtx.globalAlpha = this.state.opacity;
            currentCtx.globalCompositeOperation = this.state.currentTool === 'eraser' ? 'destination-out' : 'source-over';
        });
    }

    drawShape(context, startX, startY, endX, endY) { /* ... same ... */ }
    drawShapePreview(context, startX, startY, endX, endY) { /* ... same ... */ }
    hexToRgba(hex, alpha = 255) { /* ... same ... */ }
    colorsMatch(color1, color2, tolerance = 5) { /* ... same ... */ }
    floodFill(startX, startY) { /* ... same ... */ }
    updateWindowTitle() { /* ... same ... */ }
    setIsDirty(dirtyState) { /* ... same ... */ }
    performFileNew() { /* ... In performFileNew, also clear tempDrawingCtx ... */
        console.log("AuraPaint: Creating new canvas.");
        if (this.ctx) {
            const dpr = window.devicePixelRatio || 1;
            const currentCanvasWidth = this.canvas.width;
            const currentCanvasHeight = this.canvas.height;

            if (currentCanvasWidth > 0 && currentCanvasHeight > 0) {
                const logicalWidth = currentCanvasWidth / dpr;
                const logicalHeight = currentCanvasHeight / dpr;
                this.ctx.clearRect(0, 0, logicalWidth, logicalHeight);
                if (this.state.previewCtx && this.state.previewCanvas.width > 0 && this.state.previewCanvas.height > 0) {
                     this.state.previewCtx.clearRect(0, 0, logicalWidth, logicalHeight);
                }
                if (this.tempDrawingCtx && this.tempDrawingCanvas.width > 0 && this.tempDrawingCanvas.height > 0) {
                    this.tempDrawingCtx.clearRect(0, 0, logicalWidth, logicalHeight);
                }
            }

            this.filePath = null;
            this.setIsDirty(false);
            this.state.history = [];
            this.state.historyPointer = -1;
            this.drawing = false;
            this.state.isDrawingShape = false;
            this.state.shapeStartX = null;
            this.state.shapeStartY = null;

            this.saveHistoryState(); // Save this new blank state
            this.updateUndoRedoButtonStates();


            if (typeof AuraOS !== 'undefined' && AuraOS.showNotification) {
                 AuraOS.showNotification({ title: 'AuraPaint', message: 'New drawing canvas ready.', type: 'info' });
            }
        } else {
            console.error("AuraPaint: Main canvas context not available in performFileNew.");
        }
    }
    handleFileNew() { /* ... same ... */ }
    async handleFileOpen() { /* ... same ... */ }
    async loadFromFile(filePathToLoad) { /* ... In loadFromFile, after drawing to main ctx, save history ... */
        console.log(`Attempting to load: ${filePathToLoad}`);
        // ... (dbManager check)
        try {
            // ... (loadFile, parse, validate)
            const img = new Image();
            await new Promise((resolve, reject) => {
                img.onload = () => {
                    const dpr = window.devicePixelRatio || 1;
                    const logicalWidth = this.canvas.width / dpr; // Use current canvas logical size
                    const logicalHeight = this.canvas.height / dpr;

                    this.ctx.clearRect(0, 0, logicalWidth, logicalHeight);
                    if(this.state.previewCtx) { this.state.previewCtx.clearRect(0, 0, logicalWidth, logicalHeight); }
                    if(this.tempDrawingCtx) { this.tempDrawingCtx.clearRect(0, 0, logicalWidth, logicalHeight); }

                    this.ctx.drawImage(img, 0, 0, logicalWidth, logicalHeight);

                    this.filePath = filePathToLoad;
                    this.setIsDirty(false);
                    this.state.history = [];
                    this.state.historyPointer = -1;
                    this.saveHistoryState(); // Save loaded state as first history item
                    this.updateUndoRedoButtonStates();


                    AuraOS.showNotification({ title: 'AuraPaint', message: `Drawing '${filePathToLoad.substring(filePathToLoad.lastIndexOf('/') + 1)}' loaded.`, type: 'success' });
                    resolve();
                };
                img.onerror = () => { /* ... */ reject(new Error('Image load error')); };
                // ... (rest of the logic from previous step) ...
            });
        } catch (error) { /* ... */ }
    }
    async handleFileSave() { /* ... same ... */ }
    async handleFileSaveAs() { /* ... same ... */ }
    async saveToFile(filePathToSave) { /* ... same ... */ }
    saveHistoryState() { /* ... same ... */ }
    handleUndo() { /* ... same ... */ }
    handleRedo() { /* ... same ... */ }
    loadStateFromHistory(imageDataUrl) { /* ... In loadStateFromHistory, also clear tempDrawingCtx and previewCtx before drawing ... */
        if (!this.ctx || !this.canvas) return;
        const img = new Image();
        img.onload = () => {
            const dpr = window.devicePixelRatio || 1;
            const logicalWidth = this.canvas.width / dpr;
            const logicalHeight = this.canvas.height / dpr;

            this.ctx.clearRect(0, 0, logicalWidth, logicalHeight);
            if(this.state.previewCtx) { this.state.previewCtx.clearRect(0, 0, logicalWidth, logicalHeight); }
            if(this.tempDrawingCtx) { this.tempDrawingCtx.clearRect(0, 0, logicalWidth, logicalHeight); }

            this.ctx.drawImage(img, 0, 0, logicalWidth, logicalHeight);
            console.log(`Loaded history state. Pointer: ${this.state.historyPointer}`);
        };
        img.onerror = () => { /* ... */ };
        img.src = imageDataUrl;
    }
    updateUndoRedoButtonStates() { /* ... same ... */ }


    addEventListeners() {
        /* ... (ensure all previous listeners are correctly defined here) ... */
        // Toolbar click listener (for tools)
        this.toolbar.addEventListener('click', (e) => { /* ... same ... */ });
        // File Menu Button Listener & related
        this.fileMenuButton.addEventListener('click', (event) => { /* ... same ... */ });
        this.windowBody.addEventListener('click', (event) => { /* ... same, for closing dropdown ... */ }, true);
        this.fileMenuDropdown.addEventListener('click', (event) => { /* ... same, calling handleFile... methods ... */ });
        // Color pickers
        this.primaryColorPicker.addEventListener('input', (e) => { /* ... same ... */ });
        this.secondaryColorPicker.addEventListener('input', (e) => { /* ... same ... */ });
        // Clear button
        this.clearButton.addEventListener('click', () => {
            if (!this.ctx || !this.state.previewCtx || !this.tempDrawingCtx) return;
            const dpr = window.devicePixelRatio || 1;
            const logicalWidth = this.canvas.width / dpr;
            const logicalHeight = this.canvas.height / dpr;
            this.ctx.clearRect(0, 0, logicalWidth, logicalHeight);
            this.state.previewCtx.clearRect(0, 0, logicalWidth, logicalHeight);
            this.tempDrawingCtx.clearRect(0, 0, logicalWidth, logicalHeight);
            this.setIsDirty(true);
            this.saveHistoryState(); // Save after clear
        });
        // Sliders & Checkboxes (Tool Options)
        this.lineWidthSlider.oninput = (e) => { /* ... same ... */ };
        this.opacitySlider.oninput = (e) => { /* ... same ... */ };
        this.shapeTypeSelector.onchange = (e) => { /* ... same ... */ };
        this.shapeEnableFillCheckbox.onchange = (e) => { /* ... same ... */ };
        this.shapeEnableStrokeCheckbox.onchange = (e) => { /* ... same ... */ };
        this.shapeStrokeWidthSlider.oninput = (e) => { /* ... same ... */ };
        // Undo/Redo buttons
        if(this.undoButton) this.undoButton.addEventListener('click', () => this.handleUndo());
        if(this.redoButton) this.redoButton.addEventListener('click', () => this.handleRedo());


        // Canvas drawing listeners - MODIFIED
        this.canvas.addEventListener('mousedown', (e) => {
            if (!this.ctx) return;
            const rect = this.canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            this.drawing = true; // General flag, tool-specific logic below

            if (this.state.currentTool === 'eyedropper') { /* ... same ... */ this.drawing = false; return; }
            if (this.state.currentTool === 'fill') { this.floodFill(x, y); this.setIsDirty(true); this.saveHistoryState(); this.drawing = false; return; }

            this.lastX = x;
            this.lastY = y;

            if (this.state.currentTool === 'shape') {
                this.state.isDrawingShape = true;
                this.state.shapeStartX = x;
                this.state.shapeStartY = y;
                // Preview will be on previewCanvas, main draw on mouseup
            } else { // Pencil, Brush, Eraser
                const dpr = window.devicePixelRatio || 1;
                this.tempDrawingCtx.clearRect(0, 0, this.tempDrawingCanvas.width / dpr, this.tempDrawingCanvas.height / dpr);

                this.tempDrawingCtx.lineWidth = this.state.lineWidth;
                this.tempDrawingCtx.lineCap = 'round';
                this.tempDrawingCtx.lineJoin = 'round';

                if (this.state.currentTool === 'eraser') {
                    this.tempDrawingCtx.strokeStyle = '#FFFFFF'; // Effectively, color doesn't matter with destination-out
                    this.tempDrawingCtx.globalAlpha = 1; // Eraser always full strength on its layer
                    this.tempDrawingCtx.globalCompositeOperation = 'destination-out';
                } else { // Pencil, Brush
                    this.tempDrawingCtx.strokeStyle = this.state.primaryColor;
                    this.tempDrawingCtx.globalAlpha = 1; // Draw opaque on temp canvas
                    this.tempDrawingCtx.globalCompositeOperation = 'source-over';
                }
                this.tempDrawingCtx.beginPath();
                this.tempDrawingCtx.moveTo(this.lastX, this.lastY);
            }
        });

        this.canvas.addEventListener('mousemove', (e) => {
            if (!this.drawing) return; // Only proceed if drawing flag is set from mousedown
            if (!this.ctx) return;

            const rect = this.canvas.getBoundingClientRect();
            const currentX = e.clientX - rect.left;
            const currentY = e.clientY - rect.top;
            const dpr = window.devicePixelRatio || 1;
            const logicalPreviewWidth = this.state.previewCanvas.width / dpr;
            const logicalPreviewHeight = this.state.previewCanvas.height / dpr;

            if (this.state.isDrawingShape) { // Shape tool
                this.state.previewCtx.clearRect(0, 0, logicalPreviewWidth, logicalPreviewHeight);
                this.drawShapePreview(this.state.previewCtx, this.state.shapeStartX, this.state.shapeStartY, currentX, currentY);
                // No setIsDirty on preview
            } else if (this.state.currentTool === 'pencil' || this.state.currentTool === 'brush' || this.state.currentTool === 'eraser') {
                // Drawing on tempDrawingCtx
                const midPointX = (this.lastX + currentX) / 2;
                const midPointY = (this.lastY + currentY) / 2;
                this.tempDrawingCtx.quadraticCurveTo(this.lastX, this.lastY, midPointX, midPointY);
                this.tempDrawingCtx.stroke();

                // Preview the stroke from temp canvas to preview canvas with opacity
                this.state.previewCtx.clearRect(0, 0, logicalPreviewWidth, logicalPreviewHeight);
                this.state.previewCtx.globalAlpha = (this.state.currentTool === 'eraser') ? 1 : this.state.opacity;
                this.state.previewCtx.drawImage(this.tempDrawingCanvas, 0, 0, logicalPreviewWidth, logicalPreviewHeight);

                this.lastX = midPointX;
                this.lastY = midPointY;
                // isDirty will be set on mouseup for freehand strokes
            }
        });

        this.canvas.addEventListener('mouseup', (e) => {
            if (!this.ctx) return;
            this.drawing = false; // Reset general drawing flag

            const dpr = window.devicePixelRatio || 1;
            const logicalPreviewWidth = this.state.previewCanvas.width / dpr;
            const logicalPreviewHeight = this.state.previewCanvas.height / dpr;

            if (this.state.isDrawingShape) {
                this.state.isDrawingShape = false;
                this.state.previewCtx.clearRect(0, 0, logicalPreviewWidth, logicalPreviewHeight);
                const rect = this.canvas.getBoundingClientRect();
                const endX = e.clientX - rect.left;
                const endY = e.clientY - rect.top;

                // Set main context properties for shape drawing
                this.ctx.globalCompositeOperation = 'source-over'; // Shapes always source-over
                this.ctx.globalAlpha = this.state.opacity; // Use general opacity for shapes too for now

                this.drawShape(this.ctx, this.state.shapeStartX, this.state.shapeStartY, endX, endY);

                this.state.shapeStartX = null;
                this.state.shapeStartY = null;
                this.setIsDirty(true);
                this.saveHistoryState();
            } else if (this.state.currentTool === 'pencil' || this.state.currentTool === 'brush' || this.state.currentTool === 'eraser') {
                this.state.previewCtx.clearRect(0, 0, logicalPreviewWidth, logicalPreviewHeight);

                // Apply the completed stroke from temp canvas to main canvas
                this.ctx.globalAlpha = (this.state.currentTool === 'eraser') ? 1 : this.state.opacity;
                this.ctx.globalCompositeOperation = (this.state.currentTool === 'eraser') ? 'destination-out' : 'source-over';
                this.ctx.drawImage(this.tempDrawingCanvas, 0, 0, logicalPreviewWidth, logicalPreviewHeight); // Use logical for drawImage source if temp is also logical

                // Clear the temp canvas for the next stroke
                this.tempDrawingCtx.clearRect(0,0, logicalPreviewWidth, logicalPreviewHeight);

                this.setIsDirty(true);
                this.saveHistoryState();
            }
        });

        this.canvas.addEventListener('mouseleave', (e) => {
             if (!this.ctx) return;
             const dpr = window.devicePixelRatio || 1;
             const logicalPreviewWidth = this.state.previewCanvas.width / dpr;
             const logicalPreviewHeight = this.state.previewCanvas.height / dpr;

             if (this.state.isDrawingShape) {
                this.state.isDrawingShape = false;
                this.state.previewCtx.clearRect(0, 0, logicalPreviewWidth, logicalPreviewHeight);
                this.state.shapeStartX = null;
                this.state.shapeStartY = null;
             } else if (this.drawing) { // Freehand tool was drawing
                 this.drawing = false;
                 // Commit the stroke that was on tempDrawingCanvas to main canvas
                this.state.previewCtx.clearRect(0, 0, logicalPreviewWidth, logicalPreviewHeight);

                this.ctx.globalAlpha = (this.state.currentTool === 'eraser') ? 1 : this.state.opacity;
                this.ctx.globalCompositeOperation = (this.state.currentTool === 'eraser') ? 'destination-out' : 'source-over';
                this.ctx.drawImage(this.tempDrawingCanvas, 0, 0, logicalPreviewWidth, logicalPreviewHeight);

                this.tempDrawingCtx.clearRect(0,0, logicalPreviewWidth, logicalPreviewHeight);

                this.setIsDirty(true);
                this.saveHistoryState();
             }
        });
    }
}

// Re-attach prototype methods
AuraPaintApp.prototype.ensureDefaultSaveDirectory = AuraPaintApp.prototype.ensureDefaultSaveDirectory;
AuraPaintApp.prototype.initUI = AuraPaintApp.prototype.initUI;
AuraPaintApp.prototype.updateToolOptionsVisibility = AuraPaintApp.prototype.updateToolOptionsVisibility;
AuraPaintApp.prototype.initCanvas = AuraPaintApp.prototype.initCanvas;
AuraPaintApp.prototype.initPreviewCanvas = AuraPaintApp.prototype.initPreviewCanvas;
AuraPaintApp.prototype.initTempDrawingCanvas = AuraPaintApp.prototype.initTempDrawingCanvas;
AuraPaintApp.prototype.resizeCanvas = AuraPaintApp.prototype.resizeCanvas;
AuraPaintApp.prototype.drawShape = AuraPaintApp.prototype.drawShape;
AuraPaintApp.prototype.drawShapePreview = AuraPaintApp.prototype.drawShapePreview;
AuraPaintApp.prototype.hexToRgba = AuraPaintApp.prototype.hexToRgba;
AuraPaintApp.prototype.colorsMatch = AuraPaintApp.prototype.colorsMatch;
AuraPaintApp.prototype.floodFill = AuraPaintApp.prototype.floodFill;
AuraPaintApp.prototype.updateWindowTitle = AuraPaintApp.prototype.updateWindowTitle;
AuraPaintApp.prototype.setIsDirty = AuraPaintApp.prototype.setIsDirty;
AuraPaintApp.prototype.performFileNew = AuraPaintApp.prototype.performFileNew;
AuraPaintApp.prototype.handleFileNew = AuraPaintApp.prototype.handleFileNew;
AuraPaintApp.prototype.handleFileOpen = AuraPaintApp.prototype.handleFileOpen;
AuraPaintApp.prototype.loadFromFile = AuraPaintApp.prototype.loadFromFile;
AuraPaintApp.prototype.handleFileSave = AuraPaintApp.prototype.handleFileSave;
AuraPaintApp.prototype.handleFileSaveAs = AuraPaintApp.prototype.handleFileSaveAs;
AuraPaintApp.prototype.saveToFile = AuraPaintApp.prototype.saveToFile;
AuraPaintApp.prototype.saveHistoryState = AuraPaintApp.prototype.saveHistoryState;
AuraPaintApp.prototype.handleUndo = AuraPaintApp.prototype.handleUndo;
AuraPaintApp.prototype.handleRedo = AuraPaintApp.prototype.handleRedo;
AuraPaintApp.prototype.loadStateFromHistory = AuraPaintApp.prototype.loadStateFromHistory;
AuraPaintApp.prototype.updateUndoRedoButtonStates = AuraPaintApp.prototype.updateUndoRedoButtonStates;
AuraPaintApp.prototype.addEventListeners = AuraPaintApp.prototype.addEventListeners;
