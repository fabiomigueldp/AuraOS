class AuraPaintApp {
    /**
     * Construtor da aplicação AuraPaint.
     * @param {HTMLElement} windowBody - O elemento corpo da janela onde a aplicação será renderizada.
     * @param {object} appData - Dados iniciais da aplicação, como o caminho de um arquivo a ser carregado.
     */
    constructor(windowBody, appData = {}) {
        this.windowBody = windowBody;
        this.appData = appData;
        this.filePath = appData.filePath || null;
        this.isDirty = false;
        this.previousDrawingTool = 'pencil'; // Mantém o controle da ferramenta anterior, útil para o conta-gotas.

        // MERGE: O estado combina propriedades de ambos os textos. A base é do Texto 1, que já inclui o histórico.
        this.state = {
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
        // Sincroniza as cores das formas com as cores primária/secundária iniciais.
        this.state.shapeFillColor = this.state.primaryColor;
        this.state.shapeStrokeColor = this.state.secondaryColor;

        // MERGE: Propriedades de UI de ambos os textos. Inicializadas como null.
        // Canvas principal, de preview e temporário (do Texto 1)
        this.canvas = null;
        this.ctx = null;
        this.tempDrawingCanvas = null;
        this.tempDrawingCtx = null;
        
        // Elementos da UI (do Texto 2)
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

        // Elementos de UI do menu de arquivo e histórico (do Texto 1)
        this.fileMenuButton = null;
        this.fileMenuDropdown = null;
        this.undoButton = null;
        this.redoButton = null;

        // Estado de desenho
        this.drawing = false;
        this.lastX = 0;
        this.lastY = 0;

        // MERGE: A sequência de inicialização combina os dois textos.
        this.initUI(); // Usa a implementação robusta do Texto 2.
        this.initCanvas();
        this.initPreviewCanvas();
        this.initTempDrawingCanvas(); // Essencial para o desenho suave do Texto 1.
        this.addEventListeners(); // Usa uma versão mesclada.
        this.updateToolOptionsVisibility();

        // MERGE: Lógica de inicialização assíncrona do Texto 1 para carregar arquivos.
        const initialFilePath = this.filePath;
        const postInitActions = async () => {
            if (initialFilePath) {
                await this.loadFromFile(initialFilePath);
            } else {
                this.updateWindowTitle();
                this.saveHistoryState(); // Salva o estado inicial em branco no histórico.
            }
            this.updateUndoRedoButtonStates();
        };

        // Adiciona um pequeno atraso para garantir que a UI esteja totalmente renderizada e dimensionada.
        setTimeout(() => {
            postInitActions();
            this.ensureDefaultSaveDirectory();
        }, 100);

        console.log("Instância do AuraPaint criada e inicializada com recursos completos.");
    }

    /**
     * MERGE: O método initUI é pego integralmente do Texto 2 por ser muito mais completo.
     * Adicionamos a criação do menu de arquivo, que estava implícito no Texto 1.
     */
    initUI() {
        this.windowBody.innerHTML = ''; // Limpa o corpo da janela.

        // Painel superior para opções de ferramentas
        this.toolOptionsPanel = document.createElement('div');
        this.toolOptionsPanel.className = 'aura-paint-tool-options';
        this.toolOptionsPanel.style.cssText = `height: 50px; border-bottom: 1px solid var(--glass-border, rgba(255, 255, 255, 0.1)); padding: 5px 10px; box-sizing: border-box; display: flex; align-items: center; gap: 15px; background: var(--glass-background-lighter, rgba(20,20,30,0.3)); color: var(--text-color, white);`;

        // -- Adição do Menu de Arquivo (Inspirado no Texto 1) --
        const fileMenuContainer = document.createElement('div');
        fileMenuContainer.style.position = 'relative';

        this.fileMenuButton = document.createElement('button');
        this.fileMenuButton.textContent = 'File';
        this.fileMenuButton.className = 'aura-paint-file-menu-button';
        this.fileMenuButton.style.cssText = `background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); color: white; border-radius: 5px; padding: 5px 10px; cursor: pointer;`;
        
        this.fileMenuDropdown = document.createElement('div');
        this.fileMenuDropdown.className = 'aura-paint-file-menu-dropdown';
        this.fileMenuDropdown.style.cssText = `display: none; position: absolute; top: 100%; left: 0; background: var(--glass-background, rgba(28, 25, 45, 0.9)); backdrop-filter: blur(10px); border: 1px solid var(--glass-border, rgba(255, 255, 255, 0.1)); border-radius: 5px; padding: 5px 0; z-index: 1000; min-width: 150px;`;
        const menuItems = [
            { id: 'new', text: 'New' },
            { id: 'open', text: 'Open...' },
            { id: 'save', text: 'Save' },
            { id: 'saveAs', text: 'Save As...' }
        ];
        menuItems.forEach(item => {
            const menuItem = document.createElement('div');
            menuItem.dataset.action = item.id;
            menuItem.textContent = item.text;
            menuItem.style.cssText = `padding: 8px 15px; color: white; cursor: pointer;`;
            menuItem.onmouseover = () => menuItem.style.backgroundColor = 'rgba(255,255,255,0.1)';
            menuItem.onmouseout = () => menuItem.style.backgroundColor = 'transparent';
            this.fileMenuDropdown.appendChild(menuItem);
        });
        
        fileMenuContainer.append(this.fileMenuButton, this.fileMenuDropdown);
        this.toolOptionsPanel.appendChild(fileMenuContainer);
        // -- Fim do Menu de Arquivo --

        // Container para opções de pincel/lápis/borracha
        this.brushOptionsContainer = document.createElement('div');
        // ... (código do Texto 2 para criar sliders de largura e opacidade)
        this.brushOptionsContainer.id = 'brushOptionsContainer';
        this.brushOptionsContainer.style.cssText = 'display: flex; gap: 10px; align-items: center;';
        const lineWidthLabel = document.createElement('label');
        lineWidthLabel.htmlFor = 'lineWidthSlider';
        lineWidthLabel.textContent = 'Width:';
        this.lineWidthSlider = document.createElement('input');
        this.lineWidthSlider.type = 'range'; this.lineWidthSlider.id = 'lineWidthSlider';
        this.lineWidthSlider.min = '1'; this.lineWidthSlider.max = '100';
        this.lineWidthSlider.value = this.state.lineWidth;
        this.lineWidthValueDisplay = document.createElement('span');
        this.lineWidthValueDisplay.id = 'lineWidthValue';
        this.lineWidthValueDisplay.textContent = `${this.state.lineWidth}px`;

        const opacityLabel = document.createElement('label');
        opacityLabel.htmlFor = 'opacitySlider';
        opacityLabel.textContent = 'Opacity:';
        this.opacitySlider = document.createElement('input');
        this.opacitySlider.type = 'range'; this.opacitySlider.id = 'opacitySlider';
        this.opacitySlider.min = '0.05'; this.opacitySlider.max = '1'; this.opacitySlider.step = '0.05';
        this.opacitySlider.value = this.state.opacity;
        this.opacityValueDisplay = document.createElement('span');
        this.opacityValueDisplay.id = 'opacityValue';
        this.opacityValueDisplay.textContent = `${Math.round(this.state.opacity * 100)}%`;
        this.brushOptionsContainer.append(lineWidthLabel, this.lineWidthSlider, this.lineWidthValueDisplay, opacityLabel, this.opacitySlider, this.opacityValueDisplay);
        this.toolOptionsPanel.appendChild(this.brushOptionsContainer);

        // Container para opções de formas
        this.shapeOptionsContainer = document.createElement('div');
        // ... (código do Texto 2 para criar seletores de forma, preenchimento, etc.)
        this.shapeOptionsContainer.id = 'shapeOptionsContainer';
        this.shapeOptionsContainer.style.cssText = 'display: none; gap: 10px; align-items: center;';
        const shapeTypeLabel = document.createElement('label');
        shapeTypeLabel.htmlFor = 'shapeTypeSelector'; shapeTypeLabel.textContent = 'Shape:';
        this.shapeTypeSelector = document.createElement('select'); this.shapeTypeSelector.id = 'shapeTypeSelector';
        ['rectangle', 'ellipse', 'line'].forEach(type => {
            const option = document.createElement('option');
            option.value = type; option.textContent = type.charAt(0).toUpperCase() + type.slice(1);
            if (type === this.state.shapeType) option.selected = true;
            this.shapeTypeSelector.appendChild(option);
        });

        const shapeFillLabel = document.createElement('label');
        shapeFillLabel.htmlFor = 'shapeEnableFillCheckbox'; shapeFillLabel.textContent = 'Fill:';
        this.shapeEnableFillCheckbox = document.createElement('input');
        this.shapeEnableFillCheckbox.type = 'checkbox'; this.shapeEnableFillCheckbox.id = 'shapeEnableFillCheckbox';
        this.shapeEnableFillCheckbox.checked = this.state.shapeEnableFill;
        
        const shapeStrokeLabel = document.createElement('label');
        shapeStrokeLabel.htmlFor = 'shapeEnableStrokeCheckbox'; shapeStrokeLabel.textContent = 'Stroke:';
        this.shapeEnableStrokeCheckbox = document.createElement('input');
        this.shapeEnableStrokeCheckbox.type = 'checkbox'; this.shapeEnableStrokeCheckbox.id = 'shapeEnableStrokeCheckbox';
        this.shapeEnableStrokeCheckbox.checked = this.state.shapeEnableStroke;

        const shapeStrokeWidthLabel = document.createElement('label');
        shapeStrokeWidthLabel.htmlFor = 'shapeStrokeWidthSlider'; shapeStrokeWidthLabel.textContent = 'Stroke Width:';
        this.shapeStrokeWidthSlider = document.createElement('input');
        this.shapeStrokeWidthSlider.type = 'range'; this.shapeStrokeWidthSlider.id = 'shapeStrokeWidthSlider';
        this.shapeStrokeWidthSlider.min = '1'; this.shapeStrokeWidthSlider.max = '50';
        this.shapeStrokeWidthSlider.value = this.state.shapeStrokeWidth;
        this.shapeStrokeWidthValueDisplay = document.createElement('span');
        this.shapeStrokeWidthValueDisplay.id = 'shapeStrokeWidthValue';
        this.shapeStrokeWidthValueDisplay.textContent = `${this.state.shapeStrokeWidth}px`;
        this.shapeOptionsContainer.append(shapeTypeLabel, this.shapeTypeSelector, shapeFillLabel, this.shapeEnableFillCheckbox, shapeStrokeLabel, this.shapeEnableStrokeCheckbox, shapeStrokeWidthLabel, this.shapeStrokeWidthSlider, this.shapeStrokeWidthValueDisplay);
        this.toolOptionsPanel.appendChild(this.shapeOptionsContainer);

        this.windowBody.appendChild(this.toolOptionsPanel);

        // Layout principal (barra de ferramentas + área do canvas)
        const mainLayout = document.createElement('div');
        mainLayout.className = 'aura-paint-main-layout';
        const toolOptionsPanelHeight = this.toolOptionsPanel.offsetHeight || 50;
        mainLayout.style.cssText = `display: flex; width: 100%; height: calc(100% - ${toolOptionsPanelHeight}px); position: relative;`;
        
        // Barra de ferramentas lateral
        this.toolbar = document.createElement('div');
        // ... (código do Texto 2 para criar a barra de ferramentas com ícones SVG)
        this.toolbar.className = 'aura-paint-toolbar';
        this.toolbar.style.cssText = `
            width: 60px; height: 100%; padding: 10px; box-sizing: border-box;
            display: flex; flex-direction: column; align-items: center; gap: 10px;
            background: var(--glass-background, rgba(28, 25, 45, 0.7));
            backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px);
            border-right: 1px solid var(--glass-border, rgba(255, 255, 255, 0.1));
        `;
        const toolButtonStyles = `width: 40px; height: 40px; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); color: white; border-radius: 5px; cursor: pointer; display: flex; align-items: center; justify-content: center; padding: 5px;`;
        const svgIconStyle = `width: 20px; height: 20px; fill: white; pointer-events: none;`;
        const tools = [
            { name: 'pencil', svg: `<svg viewBox="0 0 24 24" style="${svgIconStyle}"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>` },
            { name: 'brush', svg: `<svg viewBox="0 0 24 24" style="${svgIconStyle}"><path d="M7 14c-1.66 0-3 1.34-3 3 0 1.31-1.16 2-2 2 .92 1.22 2.49 2 4 2 2.21 0 4-1.79 4-4 0-1.66-1.34-3-3-3zm13.71-9.37c-.39-.39-1.02-.39-1.41 0L18.34 5.6c-1.09.08-2.23.39-3.39.93-.9 .42-1.81.85-2.72 1.28L3 17.25V21h3.75l10.94-10.94c.3-.3.57-.62.81-.95l.03-.03c.74-1.02 1.22-2.14 1.44-3.33.08-.43.12-.87.12-1.31 0-.24-.02-.48-.05-.72l-.03-.26c.05-.2.05-.4-.01-.59z"/></svg>` },
            { name: 'eraser', svg: `<svg viewBox="0 0 24 24" style="${svgIconStyle}"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zm2.46-7.12l1.41-1.41L12 12.59l2.12-2.12 1.41 1.41L13.41 14l2.12 2.12-1.41 1.41L12 15.41l-2.12 2.12-1.41-1.41L10.59 14l-2.13-2.12zM15.5 4l-1-1h-5l-1 1H5v2h14V4z"/></svg>` },
            { name: 'shape', svg: `<svg viewBox="0 0 24 24" style="${svgIconStyle}"><path d="M3 3v18h18V3H3zm16 16H5V5h14v14z"/></svg>` },
            { name: 'fill', svg: `<svg viewBox="0 0 24 24" style="${svgIconStyle}"><path d="M19 3H5c-1.11 0-2 .9-2 2v10c0 .83.67 1.5 1.5 1.5S6 15.83 6 15V6c0-.55.45-1 1-1h10c.55 0 1 .45 1 1v1h-2V6H7v9h10v-2.09c.33-.05.66-.13 1-.22V15c0 1.11-.89 2-2 2H6.5c-.83 0-1.5-.67-1.5-1.5V20H2v-4h2v-1.5c0-1.93 1.57-3.5 3.5-3.5h5.5V9H9V7h7v2h2V7c0-1.11-.89-2-2-2h-1l-2-2-2 2H5zm-7 14.5c0 .83-.67 1.5-1.5 1.5S9 18.33 9 17.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5zM16 13.24l-4.09 4.09c-.78.78-2.05.78-2.83 0L5 13.24V20h14v-6.76l-3-3z"/></svg>` },
            { name: 'eyedropper', svg: `<svg viewBox="0 0 24 24" style="${svgIconStyle}"><path d="M19.31 4.69c-.39-.39-1.02-.39-1.41 0L13 9.59V3c0-.55-.45-1-1-1s-1 .45-1 1v6.59l-4.9-4.9c-.39-.39-1.02-.39-1.41 0-.39.39-.39 1.02 0 1.41L9.59 13H3c-.55 0-1 .45-1 1s.45 1 1 1h6.59l-4.9 4.9c-.39-.39-.39 1.02 0 1.41.19.19.45.29.7.29s.51-.1.7-.29L13 14.41V21c0 .55.45 1 1 1s1-.45 1-1v-6.59l4.9 4.9c.19.19.45.29.7.29s.51-.1.7-.29c.39-.39.39-1.02 0-1.41L14.41 13H21c.55 0 1-.45 1-1s-.45-1-1-1h-6.59l4.9-4.9c.39-.38.39-1.02 0-1.41z"/></svg>` }
        ];
        tools.forEach(tool => {
            const button = document.createElement('button');
            button.className = 'tool-button';
            button.dataset.tool = tool.name;
            button.innerHTML = tool.svg;
            button.style.cssText = toolButtonStyles;
            if (tool.name === this.state.currentTool) {
                button.classList.add('active');
                button.style.background = 'rgba(255,255,255,0.3)';
            }
            this.toolbar.appendChild(button);
        });

        // Seletores de cor
        const colorSwatchGroup = document.createElement('div');
        // ... (código do Texto 2 para criar seletores de cor)
        colorSwatchGroup.className = 'color-swatch-group';
        colorSwatchGroup.style.cssText = 'display: flex; flex-direction: column; gap: 5px; margin-top: 5px;';
        const colorInputBaseStyle = `-webkit-appearance: none; -moz-appearance: none; appearance: none; width: 30px; height: 30px; border: 1px solid rgba(255, 255, 255, 0.3); padding: 0; border-radius: 5px; cursor: pointer; background-color: transparent;`;
        const styleSheet = document.createElement("style");
        styleSheet.textContent = `input[type="color"]::-webkit-color-swatch { border: none; border-radius: 3px; padding: 0; } input[type="color"]::-moz-color-swatch { border: none; border-radius: 3px; padding: 0; }`;
        this.toolbar.appendChild(styleSheet);
        this.primaryColorPicker = document.createElement('input');
        this.primaryColorPicker.type = 'color'; this.primaryColorPicker.id = 'primaryColorPicker';
        this.primaryColorPicker.value = this.state.primaryColor;
        this.primaryColorPicker.style.cssText = colorInputBaseStyle;
        this.primaryColorPicker.title = "Primary Color";
        colorSwatchGroup.appendChild(this.primaryColorPicker);
        this.secondaryColorPicker = document.createElement('input');
        this.secondaryColorPicker.type = 'color'; this.secondaryColorPicker.id = 'secondaryColorPicker';
        this.secondaryColorPicker.value = this.state.secondaryColor;
        this.secondaryColorPicker.style.cssText = colorInputBaseStyle;
        this.secondaryColorPicker.title = "Secondary Color";
        colorSwatchGroup.appendChild(this.secondaryColorPicker);
        this.toolbar.appendChild(colorSwatchGroup);
        
        // Espaçador e botões de ação (Desfazer, Refazer, Limpar)
        const spacer = document.createElement('div');
        spacer.style.flexGrow = '1';
        this.toolbar.appendChild(spacer);
        const actionButtonsData = [
            { id: 'undoButton', svg: `<svg viewBox="0 0 24 24" style="${svgIconStyle}"><path d="M12.5 8c-2.65 0-5.05.99-6.9 2.6L2 7v9h9l-3.62-3.62c1.39-1.16 3.16-1.88 5.12-1.88 3.54 0 6.55 2.31 7.6 5.5l2.37-.78C22.18 12.69 17.84 8 12.5 8z"/></svg>` },
            { id: 'redoButton', svg: `<svg viewBox="0 0 24 24" style="${svgIconStyle}"><path d="M18.4 10.6C16.55 8.99 14.15 8 11.5 8c-4.16 0-7.76 2.38-9.43 5.72L4.4 13.5C5.45 10.31 8.46 8 11.5 8c1.96 0 3.73.72 5.12 1.88L13 13h9V4l-3.6 3.6z"/></svg>` },
            { id: 'clearCanvasButton', svg: `<svg viewBox="0 0 24 24" style="${svgIconStyle}"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>` }
        ];
        actionButtonsData.forEach(action => {
            const button = document.createElement('button');
            button.id = action.id; button.innerHTML = action.svg; button.style.cssText = toolButtonStyles;
            this.toolbar.appendChild(button);
            if (action.id === 'undoButton') this.undoButton = button;
            if (action.id === 'redoButton') this.redoButton = button;
            if (action.id === 'clearCanvasButton') this.clearButton = button;
        });
        
        mainLayout.appendChild(this.toolbar);

        // Área do Canvas
        const canvasArea = document.createElement('div');
        // ... (código do Texto 2 para criar a área do canvas)
        canvasArea.className = 'aura-paint-canvas-area';
        canvasArea.style.cssText = `flex-grow: 1; height: 100%; display: flex; align-items: center; justify-content: center; background: #333; padding: 10px; box-sizing: border-box; overflow: hidden; position: relative;`;
        
        this.canvas = document.createElement('canvas');
        this.canvas.id = 'auraPaintCanvas';
        this.canvas.style.cssText = `border: none; box-shadow: 0 0 10px rgba(0,0,0,0.5); background-color: #FFFFFF; display: block;`;
        canvasArea.appendChild(this.canvas);

        this.state.previewCanvas = document.createElement('canvas');
        this.state.previewCanvas.id = 'auraPaintPreviewCanvas';
        this.state.previewCanvas.style.cssText = `position: absolute; left: 10px; top: 10px; pointer-events: none; display: block;`;
        canvasArea.appendChild(this.state.previewCanvas);
        
        mainLayout.appendChild(canvasArea);
        this.windowBody.appendChild(mainLayout);
        
        // MERGE: O ResizeObserver do Texto 2 é a melhor abordagem para redimensionamento.
        const observer = new ResizeObserver(entries => {
            for (let entry of entries) {
                const { width: windowWidth, height: windowHeight } = entry.contentRect;
                const currentToolOptionsPanelHeight = this.toolOptionsPanel?.offsetHeight || 0;
                const currentToolbarWidth = this.toolbar?.offsetWidth || 0;
                const canvasAreaPadding = 20; 

                const availableCanvasWidth = Math.max(10, windowWidth - currentToolbarWidth - canvasAreaPadding);
                const availableCanvasHeight = Math.max(10, windowHeight - currentToolOptionsPanelHeight - canvasAreaPadding);
                
                this.resizeCanvas(availableCanvasWidth, availableCanvasHeight);
            }
        });
        observer.observe(this.windowBody);

        // Garante o dimensionamento inicial correto.
        requestAnimationFrame(() => {
            const initialWindowWidth = this.windowBody.clientWidth;
            const initialWindowHeight = this.windowBody.clientHeight;
            const initialToolOptionsPanelHeight = this.toolOptionsPanel?.offsetHeight || 0;
            const initialToolbarWidth = this.toolbar?.offsetWidth || 0;
            const canvasAreaPadding = 20;

            const initialCanvasWidth = Math.max(10, initialWindowWidth - initialToolbarWidth - canvasAreaPadding);
            const initialCanvasHeight = Math.max(10, initialWindowHeight - initialToolOptionsPanelHeight - canvasAreaPadding);
            this.resizeCanvas(initialCanvasWidth, initialCanvasHeight);
            mainLayout.style.height = `calc(100% - ${this.toolOptionsPanel?.offsetHeight || 0}px)`;
        });
    }    // MERGE: Métodos de arquivo, estado e histórico vêm do Texto 1.
    async ensureDefaultSaveDirectory() {
        // Implementação para garantir que existe uma pasta de save padrão
        try {
            if (typeof AuraOS !== 'undefined' && AuraOS.fileSystem) {
                const defaultDir = 'Documents/AuraPaint';
                if (!AuraOS.fileSystem[defaultDir]) {
                    AuraOS.fileSystem[defaultDir] = { type: 'folder', contents: {} };
                    console.log('AuraPaint: Created default save directory');
                }
            }
        } catch (e) {
            console.warn('AuraPaint: Error ensuring default save directory:', e);
        }
    }

    updateWindowTitle() {
        try {
            const windowEl = this.windowBody.closest('.window');
            if (windowEl) {
                const titleElement = windowEl.querySelector('.window-title');
                if (titleElement) {
                    const baseTitle = 'AuraPaint';
                    let title = baseTitle;
                    
                    if (this.filePath) {
                        const fileName = this.filePath.substring(this.filePath.lastIndexOf('/') + 1);
                        title = `${baseTitle} - ${fileName}`;
                    } else {
                        title = `${baseTitle} - Untitled`;
                    }
                    
                    if (this.isDirty) {
                        title = `• ${title}`;
                    }
                    
                    titleElement.textContent = title;
                }
            }
        } catch (e) {
            console.warn('AuraPaint: Error updating window title:', e);
        }
    }

    setIsDirty(dirtyState) {
        this.isDirty = dirtyState;
        this.updateWindowTitle();
    }

    handleFileNew() {
        if (this.isDirty) {
            if (typeof AuraOS !== 'undefined' && AuraOS.dialog) {
                AuraOS.dialog.confirm(
                    'Unsaved Changes',
                    'You have unsaved changes. Do you want to continue without saving?',
                    () => this.performFileNew(),
                    () => {}
                );
            } else {
                if (confirm('You have unsaved changes. Do you want to continue without saving?')) {
                    this.performFileNew();
                }
            }
        } else {
            this.performFileNew();
        }
    }

    async handleFileOpen() {
        try {
            if (typeof AuraOS !== 'undefined' && AuraOS.dialog && AuraOS.dialog.openFile) {
                const filePath = await AuraOS.dialog.openFile(['png', 'jpg', 'jpeg', 'gif', 'bmp']);
                if (filePath) {
                    await this.loadFromFile(filePath);
                }
            } else {
                console.warn('AuraPaint: File dialog not available');
                if (typeof AuraOS !== 'undefined' && AuraOS.showNotification) {
                    AuraOS.showNotification({
                        title: 'AuraPaint',
                        message: 'File dialog not available in this environment',
                        type: 'warning'
                    });
                }
            }
        } catch (e) {
            console.error('AuraPaint: Error opening file:', e);
            if (typeof AuraOS !== 'undefined' && AuraOS.showNotification) {
                AuraOS.showNotification({
                    title: 'AuraPaint',
                    message: 'Error opening file',
                    type: 'error'
                });
            }
        }
    }

    async handleFileSave() {
        if (this.filePath) {
            await this.saveToFile(this.filePath);
        } else {
            await this.handleFileSaveAs();
        }
    }

    async handleFileSaveAs() {
        try {
            if (typeof AuraOS !== 'undefined' && AuraOS.dialog && AuraOS.dialog.saveFile) {
                const filePath = await AuraOS.dialog.saveFile('png', 'Documents/AuraPaint');
                if (filePath) {
                    await this.saveToFile(filePath);
                }
            } else {
                // Fallback para ambiente sem dialog
                const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
                const fileName = `painting-${timestamp}.png`;
                const link = document.createElement('a');
                link.download = fileName;
                link.href = this.canvas.toDataURL();
                link.click();
                
                if (typeof AuraOS !== 'undefined' && AuraOS.showNotification) {
                    AuraOS.showNotification({
                        title: 'AuraPaint',
                        message: `Image downloaded as ${fileName}`,
                        type: 'success'
                    });
                }
            }
        } catch (e) {
            console.error('AuraPaint: Error saving file:', e);
            if (typeof AuraOS !== 'undefined' && AuraOS.showNotification) {
                AuraOS.showNotification({
                    title: 'AuraPaint',
                    message: 'Error saving file',
                    type: 'error'
                });
            }
        }
    }

    async saveToFile(filePathToSave) {
        try {
            if (!this.canvas) return;
            
            const dataURL = this.canvas.toDataURL('image/png');
            
            if (typeof AuraOS !== 'undefined' && AuraOS.fileSystem) {
                // Salvar no sistema de arquivos virtual do AuraOS
                const pathParts = filePathToSave.split('/');
                const fileName = pathParts.pop();
                const dirPath = pathParts.join('/');
                
                // Garantir que o diretório existe
                let currentDir = AuraOS.fileSystem;
                for (const part of pathParts) {
                    if (part) {
                        if (!currentDir[part]) {
                            currentDir[part] = { type: 'folder', contents: {} };
                        }
                        currentDir = currentDir[part].contents;
                    }
                }
                
                // Salvar o arquivo
                currentDir[fileName] = {
                    type: 'file',
                    content: dataURL,
                    mimeType: 'image/png',
                    size: Math.round(dataURL.length * 0.75), // Aproximação do tamanho
                    modified: new Date().toISOString()
                };
                
                this.filePath = filePathToSave;
                this.setIsDirty(false);
                
                if (typeof AuraOS.showNotification === 'function') {
                    AuraOS.showNotification({
                        title: 'AuraPaint',
                        message: 'File saved successfully',
                        type: 'success'
                    });
                }
            } else {
                // Fallback para download direto
                const link = document.createElement('a');
                link.download = filePathToSave.split('/').pop() || 'painting.png';
                link.href = dataURL;
                link.click();
            }
        } catch (e) {
            console.error('AuraPaint: Error saving file:', e);
            if (typeof AuraOS !== 'undefined' && AuraOS.showNotification) {
                AuraOS.showNotification({
                    title: 'AuraPaint',
                    message: 'Error saving file',
                    type: 'error'
                });
            }
        }
    }

    saveHistoryState() {
        if (!this.canvas) return;
        
        try {
            const dataURL = this.canvas.toDataURL();
            
            // Remove estados futuros se estamos no meio do histórico
            if (this.state.historyPointer < this.state.history.length - 1) {
                this.state.history = this.state.history.slice(0, this.state.historyPointer + 1);
            }
            
            // Adiciona o novo estado
            this.state.history.push(dataURL);
            
            // Limita o histórico a 50 estados para performance
            if (this.state.history.length > 50) {
                this.state.history.shift();
            } else {
                this.state.historyPointer++;
            }
            
            this.updateUndoRedoButtonStates();
        } catch (e) {
            console.warn('AuraPaint: Error saving history state:', e);
        }
    }

    handleUndo() {
        if (this.state.historyPointer > 0) {
            this.state.historyPointer--;
            this.loadStateFromHistory(this.state.history[this.state.historyPointer]);
            this.updateUndoRedoButtonStates();
        }
    }

    handleRedo() {
        if (this.state.historyPointer < this.state.history.length - 1) {
            this.state.historyPointer++;
            this.loadStateFromHistory(this.state.history[this.state.historyPointer]);
            this.updateUndoRedoButtonStates();
        }
    }

    updateUndoRedoButtonStates() {
        if (this.undoButton) {
            this.undoButton.disabled = this.state.historyPointer <= 0;
            this.undoButton.style.opacity = this.undoButton.disabled ? '0.5' : '1';
        }
        
        if (this.redoButton) {
            this.redoButton.disabled = this.state.historyPointer >= this.state.history.length - 1;
            this.redoButton.style.opacity = this.redoButton.disabled ? '0.5' : '1';
        }
    }

    /**
     * MERGE: Pego do Texto 1, pois lida com todos os 3 canvases.
     * Limpa todos os canvases e salva o estado de "novo" no histórico.
     */
    performFileNew() {
        console.log("AuraPaint: Criando novo canvas.");
        if (this.ctx) {
            const dpr = window.devicePixelRatio || 1;
            const logicalWidth = this.canvas.width / dpr;
            const logicalHeight = this.canvas.height / dpr;

            this.ctx.clearRect(0, 0, logicalWidth, logicalHeight);
            if (this.state.previewCtx) {
                 this.state.previewCtx.clearRect(0, 0, logicalWidth, logicalHeight);
            }
            if (this.tempDrawingCtx) {
                this.tempDrawingCtx.clearRect(0, 0, logicalWidth, logicalHeight);
            }

            this.filePath = null;
            this.setIsDirty(false);
            this.state.history = [];
            this.state.historyPointer = -1;
            this.drawing = false;
            this.state.isDrawingShape = false;

            this.saveHistoryState();
            this.updateUndoRedoButtonStates();

            if (typeof AuraOS !== 'undefined' && AuraOS.showNotification) {
                 AuraOS.showNotification({ title: 'AuraPaint', message: 'Novo desenho pronto.', type: 'info' });
            }
        }
    }
      /**
     * MERGE: Pego do Texto 1, pois lida com o histórico.
     * Carrega uma imagem e a define como o primeiro estado do histórico.
     */
    async loadFromFile(filePathToLoad) {
        try {
            if (!this.ctx || !this.canvas) return;
            
            let imageData = null;
            
            if (typeof AuraOS !== 'undefined' && AuraOS.fileSystem) {
                // Carregar do sistema de arquivos virtual
                const pathParts = filePathToLoad.split('/');
                let currentDir = AuraOS.fileSystem;
                
                for (const part of pathParts) {
                    if (part && currentDir[part]) {
                        if (currentDir[part].type === 'folder') {
                            currentDir = currentDir[part].contents;
                        } else if (currentDir[part].type === 'file') {
                            imageData = currentDir[part].content;
                            break;
                        }
                    }
                }
            }
            
            if (imageData) {
                const img = new Image();
                img.onload = () => {
                    const dpr = window.devicePixelRatio || 1;
                    const logicalWidth = this.canvas.width / dpr;
                    const logicalHeight = this.canvas.height / dpr;
                    
                    // Limpa todos os canvases
                    this.ctx.clearRect(0, 0, logicalWidth, logicalHeight);
                    if (this.state.previewCtx) {
                        this.state.previewCtx.clearRect(0, 0, logicalWidth, logicalHeight);
                    }
                    if (this.tempDrawingCtx) {
                        this.tempDrawingCtx.clearRect(0, 0, logicalWidth, logicalHeight);
                    }
                    
                    // Desenha a imagem carregada
                    this.ctx.drawImage(img, 0, 0, logicalWidth, logicalHeight);
                    
                    // Define como primeiro estado do histórico
                    this.filePath = filePathToLoad;
                    this.setIsDirty(false);
                    this.state.history = [];
                    this.state.historyPointer = -1;
                    this.saveHistoryState();
                    this.updateUndoRedoButtonStates();
                    
                    if (typeof AuraOS !== 'undefined' && AuraOS.showNotification) {
                        AuraOS.showNotification({
                            title: 'AuraPaint',
                            message: 'File loaded successfully',
                            type: 'success'
                        });
                    }
                };
                img.onerror = () => {
                    console.error('AuraPaint: Error loading image');
                    if (typeof AuraOS !== 'undefined' && AuraOS.showNotification) {
                        AuraOS.showNotification({
                            title: 'AuraPaint',
                            message: 'Error loading image file',
                            type: 'error'
                        });
                    }
                };
                img.src = imageData;
            } else {
                console.warn('AuraPaint: File not found:', filePathToLoad);
                if (typeof AuraOS !== 'undefined' && AuraOS.showNotification) {
                    AuraOS.showNotification({
                        title: 'AuraPaint',
                        message: 'File not found',
                        type: 'error'
                    });
                }
            }
        } catch (e) {
            console.error('AuraPaint: Error loading file:', e);
            if (typeof AuraOS !== 'undefined' && AuraOS.showNotification) {
                AuraOS.showNotification({
                    title: 'AuraPaint',
                    message: 'Error loading file',
                    type: 'error'
                });
            }
        }
    }

    /**
     * MERGE: Pego do Texto 1.
     * Carrega um estado do histórico para todos os canvases.
     */
    loadStateFromHistory(imageDataUrl) {
        if (!this.ctx || !this.canvas) return;
        const img = new Image();
        img.onload = () => {
            const dpr = window.devicePixelRatio || 1;
            const logicalWidth = this.canvas.width / dpr;
            const logicalHeight = this.canvas.height / dpr;

            // Limpa todos os canvases antes de desenhar o estado do histórico
            this.ctx.clearRect(0, 0, logicalWidth, logicalHeight);
            if(this.state.previewCtx) { this.state.previewCtx.clearRect(0, 0, logicalWidth, logicalHeight); }
            if(this.tempDrawingCtx) { this.tempDrawingCtx.clearRect(0, 0, logicalWidth, logicalHeight); }

            this.ctx.drawImage(img, 0, 0, logicalWidth, logicalHeight);
        };
        img.src = imageDataUrl;
    }

    // MERGE: Métodos de inicialização de canvas do Texto 1, pois incluem o tempDrawingCanvas.
    initCanvas() {
        if (!this.canvas) return;
        this.ctx = this.canvas.getContext('2d');
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';
    }

    initPreviewCanvas() {
        if (!this.state.previewCanvas) return;
        this.state.previewCtx = this.state.previewCanvas.getContext('2d');
        this.state.previewCtx.lineCap = 'round';
        this.state.previewCtx.lineJoin = 'round';
    }

    initTempDrawingCanvas() {
        if (!this.canvas) return;
        this.tempDrawingCanvas = document.createElement('canvas');
        this.tempDrawingCtx = this.tempDrawingCanvas.getContext('2d');
        this.tempDrawingCtx.lineCap = 'round';
        this.tempDrawingCtx.lineJoin = 'round';
    }
    
    /**
     * MERGE: Método de redimensionamento do Texto 1, pois ele gerencia os 3 canvases
     * (principal, preview e temporário), que é crucial para a técnica de desenho avançada.
     */
    resizeCanvas(width, height) {
        if (!this.canvas || !this.ctx || !this.state.previewCanvas || !this.state.previewCtx || !this.tempDrawingCanvas || !this.tempDrawingCtx) return;

        const dpr = window.devicePixelRatio || 1;
        const logicalWidth = Math.max(10, width);
        const logicalHeight = Math.max(10, height);
        const physicalWidth = Math.floor(logicalWidth * dpr);
        const physicalHeight = Math.floor(logicalHeight * dpr);

        let oldContent = null;
        if (this.canvas.width > 0 && this.canvas.height > 0) {
            oldContent = this.canvas.toDataURL();
        }
        
        // Redimensiona todos os 3 canvases
        [this.canvas, this.state.previewCanvas, this.tempDrawingCanvas].forEach(c => {
            c.width = physicalWidth;
            c.height = physicalHeight;
            c.style.width = `${logicalWidth}px`;
            c.style.height = `${logicalHeight}px`;
        });        // Ajusta posição do preview canvas para ficar exatamente sobre o canvas principal
        requestAnimationFrame(() => {
            const canvasRect = this.canvas.getBoundingClientRect();
            const canvasAreaRect = this.canvas.parentElement.getBoundingClientRect();
            this.state.previewCanvas.style.left = `${canvasRect.left - canvasAreaRect.left}px`;
            this.state.previewCanvas.style.top = `${canvasRect.top - canvasAreaRect.top}px`;
        });

        // Aplica escala e restaura conteúdo/configurações
        const contexts = [this.ctx, this.state.previewCtx, this.tempDrawingCtx];
        contexts.forEach(currentCtx => {
            currentCtx.scale(dpr, dpr);
            currentCtx.lineCap = 'round';
            currentCtx.lineJoin = 'round';
            currentCtx.strokeStyle = this.state.primaryColor;
            currentCtx.lineWidth = this.state.lineWidth;
            currentCtx.globalAlpha = 1; // Resetar para 1, será aplicado quando necessário
            currentCtx.globalCompositeOperation = 'source-over'; // Resetar para padrão
        });

        if (oldContent) {
            const img = new Image();
            img.onload = () => {
                this.ctx.clearRect(0, 0, logicalWidth, logicalHeight);
                this.ctx.drawImage(img, 0, 0, logicalWidth, logicalHeight);
            };
            img.src = oldContent;
        }
    }
    // MERGE: Métodos de desenho e helpers de ambos os textos (são similares, pegamos a versão mais explícita).
    updateToolOptionsVisibility() {
        if (!this.brushOptionsContainer || !this.shapeOptionsContainer) return;
        
        const currentTool = this.state.currentTool;
        
        if (currentTool === 'shape') {
            this.brushOptionsContainer.style.display = 'none';
            this.shapeOptionsContainer.style.display = 'flex';
        } else if (currentTool === 'pencil' || currentTool === 'brush' || currentTool === 'eraser') {
            this.brushOptionsContainer.style.display = 'flex';
            this.shapeOptionsContainer.style.display = 'none';
        } else {
            this.brushOptionsContainer.style.display = 'none';
            this.shapeOptionsContainer.style.display = 'none';
        }
    }

    drawShape(context, startX, startY, endX, endY) {
        if (!context) return;
        
        context.save();
        
        // Aplicar configurações de forma
        if (this.state.shapeEnableFill) {
            context.fillStyle = this.state.shapeFillColor;
        }
        
        if (this.state.shapeEnableStroke) {
            context.strokeStyle = this.state.shapeStrokeColor;
            context.lineWidth = this.state.shapeStrokeWidth;
        }
        
        const width = endX - startX;
        const height = endY - startY;
        
        context.beginPath();
        
        switch (this.state.shapeType) {
            case 'rectangle':
                context.rect(startX, startY, width, height);
                break;
                
            case 'ellipse':
                const centerX = startX + width / 2;
                const centerY = startY + height / 2;
                const radiusX = Math.abs(width / 2);
                const radiusY = Math.abs(height / 2);
                context.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, 2 * Math.PI);
                break;
                
            case 'line':
                context.moveTo(startX, startY);
                context.lineTo(endX, endY);
                break;
        }
        
        if (this.state.shapeEnableFill && this.state.shapeType !== 'line') {
            context.fill();
        }
        
        if (this.state.shapeEnableStroke) {
            context.stroke();
        }
        
        context.restore();
    }

    drawShapePreview(context, startX, startY, endX, endY) {
        if (!context) return;
        
        context.save();
        context.globalAlpha = 0.7; // Semi-transparente para preview
        this.drawShape(context, startX, startY, endX, endY);
        context.restore();
    }

    hexToRgba(hex, alpha = 255) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? [
            parseInt(result[1], 16),
            parseInt(result[2], 16),
            parseInt(result[3], 16),
            alpha
        ] : [0, 0, 0, alpha];
    }

    colorsMatch(color1, color2, tolerance = 5) {
        return Math.abs(color1[0] - color2[0]) <= tolerance &&
               Math.abs(color1[1] - color2[1]) <= tolerance &&
               Math.abs(color1[2] - color2[2]) <= tolerance &&
               Math.abs(color1[3] - color2[3]) <= tolerance;
    }
    
    /**
     * MERGE: Flood fill do Texto 2, mas garantindo que salve o histórico.
     */
    floodFill(startX, startY) {
        // ... implementação do floodFill do Texto 2 ...
        if (!this.ctx) return;
        const dpr = window.devicePixelRatio || 1;
        const physicalStartX = Math.floor(startX * dpr);
        const physicalStartY = Math.floor(startY * dpr);
        const canvasWidth = this.canvas.width;
        const canvasHeight = this.canvas.height;
        const imageData = this.ctx.getImageData(0, 0, canvasWidth, canvasHeight);
        const data = imageData.data;
        const targetColor = this.ctx.getImageData(physicalStartX, physicalStartY, 1, 1).data;
        const fillColorRgb = this.hexToRgba(this.state.primaryColor, Math.floor(this.state.opacity * 255));
    
        if (this.colorsMatch(targetColor, fillColorRgb)) return;
    
        const queue = [[physicalStartX, physicalStartY]];
        while (queue.length > 0) {
            const [x, y] = queue.shift();
            if (x < 0 || x >= canvasWidth || y < 0 || y >= canvasHeight) continue;
            
            const pixelIndex = (y * canvasWidth + x) * 4;
            const currentColor = [data[pixelIndex], data[pixelIndex + 1], data[pixelIndex + 2], data[pixelIndex + 3]];
    
            if (this.colorsMatch(currentColor, targetColor)) {
                data[pixelIndex] = fillColorRgb[0];
                data[pixelIndex + 1] = fillColorRgb[1];
                data[pixelIndex + 2] = fillColorRgb[2];
                data[pixelIndex + 3] = fillColorRgb[3];
    
                queue.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
            }
        }
        this.ctx.putImageData(imageData, 0, 0);

        // Ação crucial: Salvar no histórico após a conclusão.
        this.setIsDirty(true);
        this.saveHistoryState();
    }
    
    /**
     * MERGE: Este é o método mais complexo de mesclar.
     * Usamos a estrutura do Texto 1 (com 3 canvases) como base.
     * Injetamos a lógica das ferramentas do Texto 2 (conta-gotas, troca de ferramenta) dentro dessa estrutura.
     */
    addEventListeners() {
        // Toolbar click listener (do Texto 2, é mais completo)
        this.toolbar.addEventListener('click', (e) => {
            const button = e.target.closest('.tool-button');
            if (button && button.dataset.tool) {
                const newTool = button.dataset.tool;
                if (newTool !== 'eyedropper' && this.state.currentTool !== 'eyedropper') {
                    this.previousDrawingTool = this.state.currentTool;
                }
                this.state.currentTool = newTool;

                this.toolbar.querySelectorAll('.tool-button.active').forEach(btn => {
                    btn.classList.remove('active');
                    btn.style.background = 'rgba(255,255,255,0.1)';
                });
                button.classList.add('active');
                button.style.background = 'rgba(255,255,255,0.3)';
                this.updateToolOptionsVisibility();
            }
        });        // Listeners do menu de arquivo (do Texto 1)
        this.fileMenuButton.addEventListener('click', (event) => {
            event.stopPropagation();
            const isVisible = this.fileMenuDropdown.style.display === 'block';
            this.fileMenuDropdown.style.display = isVisible ? 'none' : 'block';
        });

        this.windowBody.addEventListener('click', (event) => {
            if (!this.fileMenuDropdown.contains(event.target) && event.target !== this.fileMenuButton) {
                this.fileMenuDropdown.style.display = 'none';
            }
        }, true);

        this.fileMenuDropdown.addEventListener('click', (event) => {
            const action = event.target.dataset.action;
            if (action) {
                this.fileMenuDropdown.style.display = 'none';
                
                switch (action) {
                    case 'new':
                        this.handleFileNew();
                        break;
                    case 'open':
                        this.handleFileOpen();
                        break;
                    case 'save':
                        this.handleFileSave();
                        break;
                    case 'saveAs':
                        this.handleFileSaveAs();
                        break;
                }
            }
        });

        // Listeners dos seletores de cor e opções (do Texto 2)
        this.primaryColorPicker.addEventListener('input', (e) => {
            this.state.primaryColor = e.target.value;
            this.state.shapeFillColor = this.state.primaryColor;
        });
        this.secondaryColorPicker.addEventListener('input', (e) => {
            this.state.secondaryColor = e.target.value;
            this.state.shapeStrokeColor = this.state.secondaryColor;
        });        this.lineWidthSlider.oninput = (e) => {
            this.state.lineWidth = parseInt(e.target.value);
            this.lineWidthValueDisplay.textContent = `${this.state.lineWidth}px`;
        };

        this.opacitySlider.oninput = (e) => {
            this.state.opacity = parseFloat(e.target.value);
            this.opacityValueDisplay.textContent = `${Math.round(this.state.opacity * 100)}%`;
        };

        this.shapeTypeSelector.onchange = (e) => {
            this.state.shapeType = e.target.value;
        };

        this.shapeEnableFillCheckbox.onchange = (e) => {
            this.state.shapeEnableFill = e.target.checked;
        };

        this.shapeEnableStrokeCheckbox.onchange = (e) => {
            this.state.shapeEnableStroke = e.target.checked;
        };

        this.shapeStrokeWidthSlider.oninput = (e) => {
            this.state.shapeStrokeWidth = parseInt(e.target.value);
            this.shapeStrokeWidthValueDisplay.textContent = `${this.state.shapeStrokeWidth}px`;
        };

        // Listener do botão de limpar (do Texto 1, mais completo)
        this.clearButton.addEventListener('click', () => {
            if (!this.ctx || !this.state.previewCtx || !this.tempDrawingCtx) return;
            const dpr = window.devicePixelRatio || 1;
            const logicalWidth = this.canvas.width / dpr;
            const logicalHeight = this.canvas.height / dpr;
            this.ctx.clearRect(0, 0, logicalWidth, logicalHeight);
            this.state.previewCtx.clearRect(0, 0, logicalWidth, logicalHeight);
            this.tempDrawingCtx.clearRect(0, 0, logicalWidth, logicalHeight);
            this.setIsDirty(true);
            this.saveHistoryState();
        });

        // Listeners de Desfazer/Refazer (do Texto 1)
        if(this.undoButton) this.undoButton.addEventListener('click', () => this.handleUndo());
        if(this.redoButton) this.redoButton.addEventListener('click', () => this.handleRedo());

        // --- MERGE: Lógica de desenho do Canvas (Base do Texto 1 com injeções do Texto 2) ---

        this.canvas.addEventListener('mousedown', (e) => {
            if (!this.ctx) return;
            const rect = this.canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;            // Injeção da lógica de ferramentas de clique único do Texto 2
            if (this.state.currentTool === 'eyedropper') {
                const dpr = window.devicePixelRatio || 1;
                const physicalX = Math.floor(x * dpr);
                const physicalY = Math.floor(y * dpr);
                
                try {
                    const imageData = this.ctx.getImageData(physicalX, physicalY, 1, 1);
                    const [r, g, b] = imageData.data;
                    const pickedColor = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
                    
                    // Atualiza a cor primária com a cor coletada
                    this.state.primaryColor = pickedColor;
                    this.state.shapeFillColor = pickedColor;
                    this.primaryColorPicker.value = pickedColor;
                    
                    // Volta para a ferramenta anterior
                    this.state.currentTool = this.previousDrawingTool;
                    
                    // Atualiza a UI
                    this.toolbar.querySelectorAll('.tool-button.active').forEach(btn => {
                        btn.classList.remove('active');
                        btn.style.background = 'rgba(255,255,255,0.1)';
                    });
                    
                    const newActiveButton = this.toolbar.querySelector(`.tool-button[data-tool="${this.state.currentTool}"]`);
                    if (newActiveButton) {
                        newActiveButton.classList.add('active');
                        newActiveButton.style.background = 'rgba(255,255,255,0.3)';
                    }
                    
                    this.updateToolOptionsVisibility();
                    
                    if (typeof AuraOS !== 'undefined' && AuraOS.showNotification) {
                        AuraOS.showNotification({
                            title: 'AuraPaint',
                            message: `Color picked: ${pickedColor}`,
                            type: 'info',
                            duration: 2000
                        });
                    }
                } catch (e) {
                    console.warn('AuraPaint: Error picking color:', e);
                }
                return;
            }
            if (this.state.currentTool === 'fill') {
                this.floodFill(x, y); // floodFill já salva o histórico
                return;
            }

            // Lógica de desenho do Texto 1 (base)
            this.drawing = true;
            this.lastX = x;
            this.lastY = y;

            if (this.state.currentTool === 'shape') {
                this.state.isDrawingShape = true;
                this.state.shapeStartX = x;
                this.state.shapeStartY = y;
            } else { // Lápis, Pincel, Borracha
                const dpr = window.devicePixelRatio || 1;
                this.tempDrawingCtx.clearRect(0, 0, this.tempDrawingCanvas.width / dpr, this.tempDrawingCanvas.height / dpr);
                
                this.tempDrawingCtx.lineWidth = this.state.lineWidth;
                this.tempDrawingCtx.lineCap = 'round';
                this.tempDrawingCtx.lineJoin = 'round';

                if (this.state.currentTool === 'eraser') {
                    this.tempDrawingCtx.globalCompositeOperation = 'destination-out';
                    this.tempDrawingCtx.strokeStyle = '#FFFFFF'; // Cor não importa com destination-out
                    this.tempDrawingCtx.globalAlpha = 1; // Borracha sempre com força total
                } else {
                    this.tempDrawingCtx.globalCompositeOperation = 'source-over';
                    this.tempDrawingCtx.strokeStyle = this.state.primaryColor;
                    this.tempDrawingCtx.globalAlpha = 1; // Desenha opaco no canvas temporário
                }
                this.tempDrawingCtx.beginPath();
                this.tempDrawingCtx.moveTo(this.lastX, this.lastY);
            }
        });

        this.canvas.addEventListener('mousemove', (e) => {
            // Lógica de desenho do Texto 1, que usa o canvas de preview para formas e o canvas temporário para traços
            if (!this.drawing) return;
            const rect = this.canvas.getBoundingClientRect();
            const currentX = e.clientX - rect.left;
            const currentY = e.clientY - rect.top;
            const dpr = window.devicePixelRatio || 1;
            const logicalWidth = this.canvas.width / dpr;
            const logicalHeight = this.canvas.height / dpr;

            if (this.state.isDrawingShape) {
                this.state.previewCtx.clearRect(0, 0, logicalWidth, logicalHeight);
                this.drawShapePreview(this.state.previewCtx, this.state.shapeStartX, this.state.shapeStartY, currentX, currentY);
            } else if (this.state.currentTool === 'pencil' || this.state.currentTool === 'brush' || this.state.currentTool === 'eraser') {
                // Desenha no canvas temporário
                const midPointX = (this.lastX + currentX) / 2;
                const midPointY = (this.lastY + currentY) / 2;
                this.tempDrawingCtx.quadraticCurveTo(this.lastX, this.lastY, midPointX, midPointY);
                this.tempDrawingCtx.stroke();
                  // Pré-visualiza o traço do canvas temporário no canvas de preview, aplicando opacidade
                this.state.previewCtx.clearRect(0, 0, logicalWidth, logicalHeight);
                this.state.previewCtx.globalAlpha = (this.state.currentTool === 'eraser') ? 1 : this.state.opacity;
                this.state.previewCtx.globalCompositeOperation = 'source-over'; // Preview sempre usa source-over
                this.state.previewCtx.drawImage(this.tempDrawingCanvas, 0, 0, logicalWidth, logicalHeight);

                this.lastX = midPointX;
                this.lastY = midPointY;
            }
        });

        this.canvas.addEventListener('mouseup', (e) => {
            // Lógica de "commit" do desenho do Texto 1
            if (!this.drawing) return;
            this.drawing = false;
            
            const rect = this.canvas.getBoundingClientRect();
            const dpr = window.devicePixelRatio || 1;
            const logicalWidth = this.canvas.width / dpr;
            const logicalHeight = this.canvas.height / dpr;

            // Limpa o canvas de preview
            this.state.previewCtx.clearRect(0, 0, logicalWidth, logicalHeight);
            
            if (this.state.isDrawingShape) {
                this.state.isDrawingShape = false;
                const endX = e.clientX - rect.left;
                const endY = e.clientY - rect.top;
                
                // Desenha a forma final no canvas principal
                this.drawShape(this.ctx, this.state.shapeStartX, this.state.shapeStartY, endX, endY);
            } else if (this.state.currentTool === 'pencil' || this.state.currentTool === 'brush' || this.state.currentTool === 'eraser') {                // Transfere o traço do canvas temporário para o principal
                this.ctx.globalAlpha = (this.state.currentTool === 'eraser') ? 1 : this.state.opacity;
                this.ctx.globalCompositeOperation = (this.state.currentTool === 'eraser') ? 'destination-out' : 'source-over';
                this.ctx.drawImage(this.tempDrawingCanvas, 0, 0, logicalWidth, logicalHeight);

                // Restaura configurações padrão do contexto principal
                this.ctx.globalAlpha = 1;
                this.ctx.globalCompositeOperation = 'source-over';

                // Limpa o canvas temporário
                this.tempDrawingCtx.clearRect(0, 0, logicalWidth, logicalHeight);
            }
            
            // Ação crucial: Salvar no histórico após qualquer ação de desenho.
            this.setIsDirty(true);
            this.saveHistoryState();
        });

        this.canvas.addEventListener('mouseleave', (e) => {
            // Lógica do Texto 1 para finalizar um desenho se o mouse sair da tela
            if (this.drawing) {
                this.canvas.dispatchEvent(new MouseEvent('mouseup', { clientX: e.clientX, clientY: e.clientY }));
            }
        });
    }
}

// As reatribuições de protótipo no final do Texto 1 e 2 são redundantes com a sintaxe de classe moderna
// e foram removidas para clareza. Todos os métodos já estão definidos dentro da classe.