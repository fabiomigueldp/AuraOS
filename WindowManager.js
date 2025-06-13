class WindowManager {
    constructor() {
        this.windows = [];
        this.baseWindowZIndex = 1000;
        this.currentWindowZIndexCounter = this.baseWindowZIndex;

        this.WORK_AREA_INSETS = {
            top: 40,    // Default height of the top bar
            right: 10,  // Default padding from right edge
            bottom: 60, // Default height of the dock + padding
            left: 10    // Default padding from left edge
        };

        this.SNAP_THRESHOLD = 15; // Pixels from edge to trigger snap
        this.SNAP_PREVIEW_ID = 'aura-snap-preview';
        this.resizeHandleSize = 8; // px, for the invisible border handles


        this.Z_INDEX_LAYERS = {
            desktopIcon: 100,
            window: 1000,
            focusedWindow: 9000,
            snapPreview: 40000,
            contextMenu: 50000,
            dialog: 100000,
            notification: 200000,
            lockScreen: 1000000,
        };
    }

    registerWindow(windowEl, options = {}) {
        console.log(`WM.registerWindow: Called for ${windowEl?.id}, options:`, options);
        if (!windowEl || !windowEl.id) {
            console.error("WindowManager: Cannot register window without an element or ID.", windowEl);
            return;
        }
        if (this.windows.some(w => w.id === windowEl.id)) {
            console.warn(`WindowManager: Window with ID ${windowEl.id} is already registered.`);
            this.focusWindow(windowEl); // Attempt to focus existing
            return;
        }

        const initialZIndex = options.zIndexToRestore || this.getNewZIndex("window");
        windowEl.style.zIndex = initialZIndex;
        console.log(`WM.registerWindow: Assigned initial z-index ${initialZIndex} to ${windowEl.id}`);

        const windowRecord = {
            id: windowEl.id,
            element: windowEl,
            title: options.title || windowEl.querySelector('.window-title')?.textContent || 'Untitled',
            state: "normal",
            zIndex: initialZIndex,
            originalNormalPosition: { top: windowEl.offsetTop, left: windowEl.offsetLeft },
            originalNormalSize: { width: windowEl.offsetWidth, height: windowEl.offsetHeight },
            currentPosition: { top: windowEl.offsetTop, left: windowEl.offsetLeft },
            currentSize: { width: windowEl.offsetWidth, height: windowEl.offsetHeight },
            isFocused: false, // Initial focus will be handled by focusWindow or loadAndRestoreWindowState
            resizable: options.resizable !== undefined ? options.resizable : true, // Get from options
            filePath: options.filePath || null,
            state: options.initialState || "normal" // Use initialState from options if provided
        };
        this.windows.push(windowRecord);
        windowEl.dataset.aurawmId = windowEl.id;
        console.log(`WM.registerWindow: Record pushed. windowEl.dataset.aurawmId set to ${windowEl.id}. Total windows: ${this.windows.length}`);

        if (windowRecord.resizable) {
            console.log(`WM.registerWindow: Window ${windowRecord.id} is resizable, creating handles.`);
            this.createResizeHandles(windowEl);
        }

        if (options.restoredId) {
            console.log(`WM.registerWindow: Registered restored window: ${windowRecord.title} (ID: ${windowRecord.id}). Focus deferred.`);
        } else {
            console.log(`WM.registerWindow: Registering new window: ${windowRecord.title} (ID: ${windowRecord.id}). Attempting focus.`);
            this.focusWindow(windowEl); // Auto-focus brand new windows
        }
        console.log(`WM.registerWindow: Finished for ${windowEl.id}`);
    }

    unregisterWindow(windowEl) {
        console.log(`WM.unregisterWindow: Called for ${windowEl?.id}`);
        if (!windowEl || !windowEl.id) {
            console.warn("WindowManager: Cannot unregister window without an element or ID.", windowEl);
            return;
        }
        const windowId = windowEl.id;
        const index = this.windows.findIndex(w => w.id === windowId);
        if (index !== -1) {
            const unregisteredWindowTitle = this.windows[index].title;
            this.windows.splice(index, 1);
            console.log(`WM.unregisterWindow: Window unregistered: ${unregisteredWindowTitle} (ID: ${windowId}). Total windows: ${this.windows.length}`);
            if (this.windows.filter(w => w.zIndex < this.Z_INDEX_LAYERS.focusedWindow).length === 0) {
                this.currentWindowZIndexCounter = this.baseWindowZIndex;
                console.log("WM.unregisterWindow: All normal windows closed, z-index counter reset to", this.baseWindowZIndex);
            }
        } else {
            console.warn(`WM.unregisterWindow: Window with ID ${windowId} not found for unregistration.`);
        }
        console.log(`WM.unregisterWindow: Finished for ${windowEl?.id}`);
    }

    getWindowRecord(windowEl) {
        // console.log(`WM.getWindowRecord: Called for element with ID ${windowEl?.id}, dataset.aurawmId: ${windowEl?.dataset?.aurawmId}`);
        if (!windowEl || !windowEl.dataset.aurawmId) {
            // console.log("WM.getWindowRecord: Element or aurawmId missing, returning undefined.");
            return undefined;
        }
        const record = this.windows.find(w => w.id === windowEl.dataset.aurawmId);
        // console.log(`WM.getWindowRecord: Found record:`, record ? { id: record.id, title: record.title, state: record.state } : "undefined");
        return record;
    }

    getNewZIndex(layerName) {
        if (this.Z_INDEX_LAYERS[layerName]) {
            if (layerName === 'window') {
                this.currentWindowZIndexCounter = Math.max(this.currentWindowZIndexCounter, this.baseWindowZIndex) + 1;
                return this.currentWindowZIndexCounter;
            }
            return this.Z_INDEX_LAYERS[layerName];
        }
        console.warn(`WindowManager: Unknown z-index layer name: ${layerName}. Defaulting to base window layer.`);
        return this.baseWindowZIndex;
    }

    focusWindow(windowEl) {
        console.log(`WM.focusWindow: Called for ${windowEl?.id}`);
        if (!windowEl || !windowEl.id) {
            console.log("WM.focusWindow: Window element or ID missing.");
            return;
        }
        const recordToFocus = this.getWindowRecord(windowEl);
        if (!recordToFocus) {
            console.warn(`WM.focusWindow: Tried to focus an unregistered window: ${windowEl.id}`);
            return;
        }
        console.log(`WM.focusWindow: Record to focus: ${recordToFocus.id}, Current state: ${recordToFocus.state}, Current z-index: ${recordToFocus.element.style.zIndex}`);

        let maxNormalZIndex = this.baseWindowZIndex;
        this.windows.forEach(w => {
            if (w.id !== recordToFocus.id) {
                if (w.isFocused) {
                    // console.log(`WM.focusWindow: Defocusing ${w.id}, resetting z-index to ${w.zIndex}`);
                    w.element.style.zIndex = String(w.zIndex);
                }
                w.element.classList.remove('focused');
                w.isFocused = false;
            }
            if (w.zIndex < this.Z_INDEX_LAYERS.focusedWindow) {
                 maxNormalZIndex = Math.max(maxNormalZIndex, w.zIndex);
            }
        });

        const newFocusedZIndex = this.getNewZIndex("focusedWindow");
        windowEl.style.zIndex = String(newFocusedZIndex);

        windowEl.classList.add('focused');
        recordToFocus.isFocused = true;
        // this.currentWindowZIndexCounter = Math.max(this.currentWindowZIndexCounter, maxNormalZIndex); // Not strictly needed here as focused Z is separate
        console.log(`WM.focusWindow: Window ${recordToFocus.id} focused. New z-index: ${newFocusedZIndex}. Max normal z-index was: ${maxNormalZIndex}. Base normal z-index now: ${this.currentWindowZIndexCounter}`);
        // console.log(`WindowManager: Window focused: ${recordToFocus.title} (ID: ${recordToFocus.id}), new element z-index: ${newFocusedZIndex}. Normal stack z-index: ${recordToFocus.zIndex}`);
        console.log(`WM.focusWindow: Finished for ${windowEl?.id}. Focused: ${recordToFocus.isFocused}, Z-Index: ${windowEl.style.zIndex}`);
    }

    setWindowState(windowEl, newState) {
        const record = this.getWindowRecord(windowEl);
        // console.log(`WM.setWindowState: Called for ${windowEl?.id}, new state: ${newState}, current record:`, record ? {id: record.id, title: record.title, oldState: record.state} : "NO RECORD");
        if (!record) {
            console.error(`WindowManager: Window not found for setWindowState. Element ID: ${windowEl?.id}, Dataset ID: ${windowEl?.dataset?.aurawmId}`);
            return;
        }
        const oldState = record.state;
        if (oldState === newState) {
            console.log(`WM.setWindowState: State is already ${newState} for ${record.id}`);
            return;
        }
        console.log(`WM.setWindowState: Changing ${record.id} from ${oldState} to ${newState}`);

        if (oldState === "normal" && (newState === "maximized" || newState === "snapped-left" || newState === "snapped-right")) {
            record.originalNormalPosition = { top: record.element.offsetTop, left: record.element.offsetLeft };
            record.originalNormalSize = { width: record.element.offsetWidth, height: record.element.offsetHeight };
            console.log(`WM.setWindowState: Stored original normal position/size for ${record.id}:`, record.originalNormalPosition, record.originalNormalSize);
        }

        record.state = newState;

        if (newState === "normal") {
            if (record.originalNormalSize && record.originalNormalPosition) {
                console.log(`WM.setWindowState: Restoring ${record.id} to normal with original dimensions/position.`);
                record.element.style.width = `${record.originalNormalSize.width}px`;
                record.element.style.height = `${record.originalNormalSize.height}px`;
                record.element.style.top = `${record.originalNormalPosition.top}px`;
                record.element.style.left = `${record.originalNormalPosition.left}px`;
            } else {
                console.log(`WM.setWindowState: Restoring ${record.id} to normal, but no original dimensions/position stored. Defaulting might occur.`);
            }
            if (record.resizable) this.showResizeHandles(windowEl); else this.hideResizeHandles(windowEl);
            windowEl.classList.remove('maximized', 'snapped-left', 'snapped-right', 'minimized');
        } else {
            this.hideResizeHandles(windowEl);
            if (newState === "maximized") {
                windowEl.classList.add('maximized');
                windowEl.classList.remove('snapped-left', 'snapped-right', 'minimized');
            } else if (newState === "snapped-left") {
                windowEl.classList.add('snapped-left');
                windowEl.classList.remove('maximized', 'snapped-right', 'minimized');
            } else if (newState === "snapped-right") {
                windowEl.classList.add('snapped-right');
                windowEl.classList.remove('maximized', 'snapped-left', 'minimized');
            } else if (newState === "minimized") {
                windowEl.classList.add('minimized');
                windowEl.classList.remove('maximized', 'snapped-left', 'snapped-right');
            }
        }

        // Update currentPosition and currentSize in the record
        record.currentPosition = { top: record.element.offsetTop, left: record.element.offsetLeft };
        record.currentSize = { width: record.element.offsetWidth, height: record.element.offsetHeight };
        console.log(`WM.setWindowState: ${record.id} state changed. Element classes: ${record.element.className}`);
        console.log(`WM.setWindowState: ${record.id} new pos: (${record.currentPosition.left},${record.currentPosition.top}), new size: (${record.currentSize.width}x${record.currentSize.height})`);
        console.log(`WM.setWindowState: Finished for ${windowEl?.id}, new state: ${newState}`);
    }

    getWorkArea() {
        if (document.fullscreenElement) {
            return {
                x: 0,
                y: 0,
                width: window.innerWidth,
                height: window.innerHeight
            };
        }
        let topInset = this.WORK_AREA_INSETS.top;
        let rightInset = this.WORK_AREA_INSETS.right;
        let bottomInset = this.WORK_AREA_INSETS.bottom;
        let leftInset = this.WORK_AREA_INSETS.left;

        const topBarEl = document.getElementById('top-bar');
        if (topBarEl) {
            topInset = topBarEl.offsetHeight;
        }

        const dockEl = document.getElementById('dock');
        if (dockEl) {
            const dockStyle = getComputedStyle(dockEl);
            if (dockStyle.display !== 'none' && (dockStyle.position === 'absolute' || dockStyle.position === 'fixed')) {
                if (dockEl.classList.contains('dock-bottom')) {
                    bottomInset = Math.max(this.WORK_AREA_INSETS.bottom, dockEl.offsetHeight + parseFloat(dockStyle.bottom || 0) + parseFloat(dockStyle.marginBottom || 0) + 5);
                } else if (dockEl.classList.contains('dock-left')) {
                    leftInset = Math.max(this.WORK_AREA_INSETS.left, dockEl.offsetWidth + parseFloat(dockStyle.left || 0) + parseFloat(dockStyle.marginLeft || 0) + 5);
                } else if (dockEl.classList.contains('dock-right')) {
                    rightInset = Math.max(this.WORK_AREA_INSETS.right, dockEl.offsetWidth + parseFloat(dockStyle.right || 0) + parseFloat(dockStyle.marginRight || 0) + 5);
                }
            }
        }

        const workArea = {
            x: leftInset,
            y: topInset,
            width: window.innerWidth - leftInset - rightInset,
            height: window.innerHeight - topInset - bottomInset
        };
        workArea.width = Math.max(0, workArea.width);
        workArea.height = Math.max(0, workArea.height);
        return workArea;
    }

    maximizeWindow(windowEl) {
        console.log(`WM.maximizeWindow: Called for ${windowEl?.id}`);
        const record = this.getWindowRecord(windowEl);
        if (!record) {
            console.error(`WM.maximizeWindow: No record found for ${windowEl?.id}`);
            return;
        }
        if (!record.resizable && record.state !== "maximized") {
             console.warn(`WM.maximizeWindow: Attempted to maximize non-resizable window: ${record.id}`);
             return;
        }

        if (record.state === "maximized") {
            console.log(`WM.maximizeWindow: Window ${record.id} is already maximized, calling restoreWindow.`);
            this.restoreWindow(windowEl);
        } else {
            console.log(`WM.maximizeWindow: Maximizing window ${record.id}. Current state: ${record.state}`);
            if(record.state === "normal"){ // Only store if current state is normal, otherwise originalNormal is already set
                 record.originalNormalPosition = { top: record.element.offsetTop, left: record.element.offsetLeft };
                 record.originalNormalSize = { width: record.element.offsetWidth, height: record.element.offsetHeight };
                 console.log(`WM.maximizeWindow: Stored original normal pos/size for ${record.id}:`, record.originalNormalPosition, record.originalNormalSize);
            }
            const workArea = this.getWorkArea();
            console.log(`WM.maximizeWindow: Work area for ${record.id}:`, workArea);
            record.element.style.top = `${workArea.y}px`;
            record.element.style.left = `${workArea.x}px`;
            record.element.style.width = `${workArea.width}px`;
            record.element.style.height = `${workArea.height}px`;
            this.setWindowState(windowEl, "maximized");
            const maxBtn = windowEl.querySelector('.maximize-btn');
            if (maxBtn) maxBtn.title = "Restaurar";
            windowEl.dispatchEvent(new CustomEvent('aura:window-resized', { detail: { width: workArea.width, height: workArea.height } }));
        }
        console.log(`WM.maximizeWindow: Finished for ${windowEl?.id}`);
    }

    restoreWindow(windowEl) {
        console.log(`WM.restoreWindow: Called for ${windowEl?.id}`);
        const record = this.getWindowRecord(windowEl);
        if (!record) {
            console.error(`WM.restoreWindow: No record found for ${windowEl?.id}`);
            return;
        }

        if (record.originalNormalSize && record.originalNormalPosition) {
            console.log(`WM.restoreWindow: Restoring ${record.id} to originalNormalSize:`, record.originalNormalSize, `and originalNormalPosition:`, record.originalNormalPosition);
            record.element.style.width = `${record.originalNormalSize.width}px`;
            record.element.style.height = `${record.originalNormalSize.height}px`;
            record.element.style.top = `${record.originalNormalPosition.top}px`;
            record.element.style.left = `${record.originalNormalPosition.left}px`;
            this.setWindowState(windowEl, "normal");
            const maxBtn = windowEl.querySelector('.maximize-btn');
            if (maxBtn) maxBtn.title = "Maximizar";
            windowEl.dispatchEvent(new CustomEvent('aura:window-resized', { detail: { width: record.originalNormalSize.width, height: record.originalNormalSize.height } }));
        } else {
            console.warn(`WM.restoreWindow: No originalNormalSize/Position for ${record.id}. Restoring to default normal state.`);
            this.setWindowState(windowEl, "normal");
            const workArea = this.getWorkArea();
            record.element.style.left = `${workArea.x + 50}px`;
            record.element.style.top = `${workArea.y + 50}px`;
            record.element.style.width = `400px`;
            record.element.style.height = `300px`;
            windowEl.dispatchEvent(new CustomEvent('aura:window-resized', { detail: { width: 400, height: 300 } }));
        }
        console.log(`WM.restoreWindow: Finished for ${windowEl?.id}`);
    }

    snapWindow(windowEl, edge) {
        const record = this.getWindowRecord(windowEl);
        if (!record || !record.resizable) {
             console.warn(`WindowManager: Attempted to snap non-resizable window: ${record?.id}`);
             this.hideSnapPreview();
             return;
        }
        this.hideSnapPreview();

        if (edge === "top") {
            this.maximizeWindow(windowEl);
            return;
        }

        if (record.state === "normal") {
            record.originalNormalPosition = { top: record.element.offsetTop, left: record.element.offsetLeft };
            record.originalNormalSize = { width: record.element.offsetWidth, height: record.element.offsetHeight };
        }

        const workArea = this.getWorkArea();
        const newWidth = workArea.width / 2;
        const newHeight = workArea.height;

        record.element.style.top = `${workArea.y}px`;
        record.element.style.height = `${newHeight}px`;
        record.element.style.width = `${newWidth}px`;

        if (edge === "left") {
            record.element.style.left = `${workArea.x}px`;
            this.setWindowState(windowEl, "snapped-left");
        } else if (edge === "right") {
            record.element.style.left = `${workArea.x + (workArea.width - newWidth)}px`;
            this.setWindowState(windowEl, "snapped-right");
        }
        windowEl.dispatchEvent(new CustomEvent('aura:window-resized', { detail: { width: newWidth, height: newHeight } }));
    }

    isSnappingActive(mouseX, mouseY) {
        const screenWidth = window.innerWidth;
        const topBarHeight = document.getElementById('top-bar')?.offsetHeight || this.WORK_AREA_INSETS.top;

        if (mouseY >= 0 && mouseY <= Math.max(this.SNAP_THRESHOLD, topBarHeight / 2) && mouseX > this.SNAP_THRESHOLD && mouseX < screenWidth - this.SNAP_THRESHOLD) {
            return "top";
        }
        if (mouseX >= 0 && mouseX <= this.SNAP_THRESHOLD) return "left";
        if (mouseX <= screenWidth && mouseX >= screenWidth - this.SNAP_THRESHOLD) return "right";

        this.hideSnapPreview();
        return null;
    }

    showSnapPreview(edge) {
        this.hideSnapPreview();
        const previewEl = document.createElement('div');
        previewEl.id = this.SNAP_PREVIEW_ID;
        const workArea = this.getWorkArea();
        previewEl.style.position = 'fixed';
        previewEl.style.backgroundColor = 'rgba(var(--highlight-primary-rgb, 138, 99, 210), 0.3)';
        previewEl.style.border = '2px dashed var(--highlight-primary)';
        previewEl.style.zIndex = String(this.getNewZIndex('snapPreview'));
        previewEl.style.transition = 'all 0.1s ease-out';
        previewEl.style.boxSizing = 'border-box';

        if (edge === "top") {
            previewEl.style.top = `${workArea.y}px`;
            previewEl.style.left = `${workArea.x}px`;
            previewEl.style.width = `${workArea.width}px`;
            previewEl.style.height = `${workArea.height}px`;
        } else if (edge === "left") {
            previewEl.style.top = `${workArea.y}px`;
            previewEl.style.left = `${workArea.x}px`;
            previewEl.style.width = `${workArea.width / 2}px`;
            previewEl.style.height = `${workArea.height}px`;
        } else if (edge === "right") {
            previewEl.style.top = `${workArea.y}px`;
            previewEl.style.left = `${workArea.x + (workArea.width - (workArea.width / 2))}px`;
            previewEl.style.width = `${workArea.width / 2}px`;
            previewEl.style.height = `${workArea.height}px`;
        }
        document.body.appendChild(previewEl);
    }

    hideSnapPreview() {
        const previewEl = document.getElementById(this.SNAP_PREVIEW_ID);
        if (previewEl) {
            previewEl.remove();
        }
    }

   createResizeHandles(windowEl) {
       const record = this.getWindowRecord(windowEl);
       if (!record || !record.resizable) return;

       const handlesData = [
           { name: 'top-left', cursor: 'nwse-resize' }, { name: 'top', cursor: 'ns-resize' }, { name: 'top-right', cursor: 'nesw-resize' },
           { name: 'left', cursor: 'ew-resize' }, { name: 'right', cursor: 'ew-resize' },
           { name: 'bottom-left', cursor: 'nesw-resize' }, { name: 'bottom', cursor: 'ns-resize' }, { name: 'bottom-right', cursor: 'nwse-resize' }
       ];

       handlesData.forEach(data => {
           const handleEl = document.createElement('div');
           handleEl.className = `resize-handle resize-handle-${data.name}`;
           handleEl.style.position = 'absolute';
           handleEl.style.cursor = data.cursor;
           handleEl.style.userSelect = 'none';

           const s = this.resizeHandleSize;
           const hs = s / 2;

           if (data.name.includes('top')) handleEl.style.top = `-${hs}px`;
           if (data.name.includes('bottom')) handleEl.style.bottom = `-${hs}px`;
           if (data.name.includes('left')) handleEl.style.left = `-${hs}px`;
           if (data.name.includes('right')) handleEl.style.right = `-${hs}px`;

           if (data.name === 'top' || data.name === 'bottom') {
               handleEl.style.left = `${s}px`; handleEl.style.right = `${s}px`; handleEl.style.height = `${s}px`;
           } else if (data.name === 'left' || data.name === 'right') {
               handleEl.style.top = `${s}px`; handleEl.style.bottom = `${s}px`; handleEl.style.width = `${s}px`;
           } else {
               handleEl.style.width = `${s}px`; handleEl.style.height = `${s}px`;
           }

           handleEl.style.display = (record.state === 'normal' && record.resizable) ? 'block' : 'none';

           handleEl.addEventListener('mousedown', (eStart) => {
               eStart.preventDefault();
               eStart.stopPropagation();

               const initialRect = windowEl.getBoundingClientRect();
               const initialMouseX = eStart.clientX;
               const initialMouseY = eStart.clientY;
               const minWidth = parseInt(getComputedStyle(windowEl).minWidth) || 150;
               const minHeight = parseInt(getComputedStyle(windowEl).minHeight) || 100;
               const workArea = this.getWorkArea();

               const onMouseMove = (eMove) => {
                   let newWidth = initialRect.width;
                   let newHeight = initialRect.height;
                   let newLeft = initialRect.left;
                   let newTop = initialRect.top;

                   const deltaX = eMove.clientX - initialMouseX;
                   const deltaY = eMove.clientY - initialMouseY;

                   if (data.name.includes('right')) newWidth = Math.max(minWidth, initialRect.width + deltaX);
                   if (data.name.includes('left')) {
                       const potentialWidth = initialRect.width - deltaX;
                       if (potentialWidth >= minWidth) {
                           newWidth = potentialWidth;
                           newLeft = initialRect.left + deltaX;
                       } else {
                           newWidth = minWidth;
                           newLeft = initialRect.left + (initialRect.width - minWidth);
                       }
                   }
                   if (data.name.includes('bottom')) newHeight = Math.max(minHeight, initialRect.height + deltaY);
                   if (data.name.includes('top')) {
                       const potentialHeight = initialRect.height - deltaY;
                       if (potentialHeight >= minHeight) {
                           newHeight = potentialHeight;
                           newTop = initialRect.top + deltaY;
                       } else {
                           newHeight = minHeight;
                           newTop = initialRect.top + (initialRect.height - minHeight);
                       }
                   }

                   if (newLeft < workArea.x) { newWidth -= (workArea.x - newLeft); newLeft = workArea.x; }
                   if (newTop < workArea.y) { newHeight -= (workArea.y - newTop); newTop = workArea.y; }
                   if (newLeft + newWidth > workArea.x + workArea.width) newWidth = workArea.x + workArea.width - newLeft;
                   if (newTop + newHeight > workArea.y + workArea.height) newHeight = workArea.y + workArea.height - newTop;
                   newWidth = Math.max(minWidth, newWidth);
                   newHeight = Math.max(minHeight, newHeight);

                   windowEl.style.width = `${newWidth}px`;
                   windowEl.style.height = `${newHeight}px`;
                   windowEl.style.left = `${newLeft}px`;
                   windowEl.style.top = `${newTop}px`;

                   const currentRecord = this.getWindowRecord(windowEl);
                   if (currentRecord) {
                       currentRecord.currentSize = { width: newWidth, height: newHeight };
                       currentRecord.currentPosition = { top: newTop, left: newLeft };
                       if (currentRecord.state === "normal") {
                           currentRecord.originalNormalSize = { ...currentRecord.currentSize };
                           currentRecord.originalNormalPosition = { ...currentRecord.currentPosition };
                       }
                   }
               };

               const onMouseUp = async () => { // Made async
                   document.removeEventListener('mousemove', onMouseMove);
                   document.removeEventListener('mouseup', onMouseUp);

                   const finalWidth = windowEl.offsetWidth;
                   const finalHeight = windowEl.offsetHeight;
                   windowEl.dispatchEvent(new CustomEvent('aura:window-resized', { detail: { width: finalWidth, height: finalHeight } }));

                   if (typeof saveDesktopState === 'function') {
                       await saveDesktopState(); // Awaited
                   }
               };

               document.addEventListener('mousemove', onMouseMove);
               document.addEventListener('mouseup', onMouseUp);
           });
           windowEl.appendChild(handleEl);
       });
   }

   showResizeHandles(windowEl) {
        const record = this.getWindowRecord(windowEl);
        if(record && record.resizable && record.state === 'normal') {
            windowEl.querySelectorAll('.resize-handle').forEach(h => h.style.display = 'block');
        }
   }

   hideResizeHandles(windowEl) {
        windowEl.querySelectorAll('.resize-handle').forEach(h => h.style.display = 'none');
   }

    async saveWindowState() {
       if (!this.windows) {
           console.warn("WindowManager: No windows to save.");
           // If there are no windows, we should still save an empty array to clear previous state
           try {
               await dbManager.saveSetting('window_manager_state', []);
               console.log('WindowManager: No windows open, saved empty state to DB.');
           } catch (error) {
               console.error('WindowManager: Error saving empty window state to DB:', error);
           }
           return;
       }

       const stateToSave = this.windows.map(record => {
           if (!record.element || !record.element.dataset.aurawmId) return null;

           let baseAppId = record.element.dataset.appId; // dataset.appId should be set at creation
           if (!baseAppId && record.id) { // Fallback, though dataset.appId is preferred
               baseAppId = record.id.split('-')[0];
               if (apps[baseAppId]?.allowMultiple && record.id.includes('-')) {
                   // It's a valid baseAppId for a multi-instance app
               } else if (!apps[baseAppId]) {
                   baseAppId = record.id; // If not multi-instance or not found, consider full id as appId
               }
           }
            if (!baseAppId && record.title) { // Try to infer from title if ID doesn't help
                const appEntry = Object.entries(apps).find(([_, appDetails]) => appDetails.title === record.title);
                if (appEntry) baseAppId = appEntry[0];
            }

           if (!baseAppId) {
               console.warn("WindowManager: Could not determine valid appId for window:", record.id, record.title, ". Skipping save for this window.");
               return null;
           }

           // Ensure currentPosition and currentSize are up-to-date before saving
           record.currentPosition = { top: record.element.offsetTop, left: record.element.offsetLeft };
           record.currentSize = { width: record.element.offsetWidth, height: record.element.offsetHeight };


           return {
               id: record.id,
               appId: baseAppId,
               title: record.title,
               left: record.element.style.left,
               top: record.element.style.top,
               width: record.element.style.width,
               height: record.element.style.height,
               zIndex: record.zIndex, // Save the normal stacking zIndex
               state: record.state,
               originalNormalLeft: record.originalNormalPosition ? record.originalNormalPosition.left + 'px' : null,
               originalNormalTop: record.originalNormalPosition ? record.originalNormalPosition.top + 'px' : null,
               originalNormalWidth: record.originalNormalSize ? record.originalNormalSize.width + 'px' : null,
               originalNormalHeight: record.originalNormalSize ? record.originalNormalSize.height + 'px' : null,
               isFocused: record.isFocused, // Save focus state
               filePath: record.filePath || null,
               resizable: record.resizable
           };
       }).filter(s => s !== null);

       try {
           await dbManager.saveSetting('window_manager_state', stateToSave);
           console.log(`WindowManager: ${stateToSave.length} window states saved to DB.`);
       } catch (error) {
           console.error('WindowManager: Error saving window states to DB:', error);
       }
   }

   async loadAndRestoreWindowState() {
       try {
           const savedStates = await dbManager.loadSetting('window_manager_state');
           if (!savedStates || !Array.isArray(savedStates)) { // Handle null, undefined, or non-array
               console.log("WindowManager: No saved window states found or state is invalid. Starting fresh.");
               return;
           }
            if (savedStates.length === 0) {
                console.log("WindowManager: Saved window state is empty. No windows to restore.");
                return;
            }

            console.log(`WindowManager: Found ${savedStates.length} saved window states. Restoring...`);

            // Sort windows by their normal zIndex to influence initial DOM order before focus logic applies final z-index
            savedStates.sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0));

            let focusedWindowToRestore = null;

            for (const s of savedStates) {
                const appToRestoreId = s.appId;
                if (!appToRestoreId || !apps[appToRestoreId]) {
                    console.warn("WindowManager: Cannot restore window, appId missing or invalid in saved state:", s);
                    continue;
                }

                const creationData = {
                    title: s.title,
                    // Ensure px is stripped before parseFloat, and provide defaults if parsing fails
                    left: s.left ? parseFloat(s.left.replace('px', '')) : undefined,
                    top: s.top ? parseFloat(s.top.replace('px', '')) : undefined,
                    width: s.width ? parseFloat(s.width.replace('px', '')) : undefined,
                    height: s.height ? parseFloat(s.height.replace('px', '')) : undefined,
                    originalNormalPosition: (s.originalNormalLeft && s.originalNormalTop) ?
                        { left: parseFloat(s.originalNormalLeft.replace('px', '')), top: parseFloat(s.originalNormalTop.replace('px', '')) } : undefined,
                    originalNormalSize: (s.originalNormalWidth && s.originalNormalHeight) ?
                        { width: parseFloat(s.originalNormalWidth.replace('px', '')), height: parseFloat(s.originalNormalHeight.replace('px', '')) } : undefined,
                    initialState: s.state,
                    restoredId: s.id, // Pass the original ID for the new window element
                    resizable: s.resizable !== undefined ? s.resizable : (apps[appToRestoreId].resizable !== undefined ? apps[appToRestoreId].resizable : true),
                    filePath: s.filePath || null,
                    zIndexToRestore: s.zIndex // Pass the saved normal zIndex
                };

                // Create window but don't let global createWindow apply focus yet.
                const newWindowEl = createWindow(appToRestoreId, creationData, false);

                if (newWindowEl) {
                    const record = this.getWindowRecord(newWindowEl);
                    if (record) {
                        // Restore originalNormal values directly to the record AFTER registration
                        if (creationData.originalNormalPosition) record.originalNormalPosition = creationData.originalNormalPosition;
                        if (creationData.originalNormalSize) record.originalNormalSize = creationData.originalNormalSize;

                        // Restore the "normal" zIndex from saved state
                        if (creationData.zIndexToRestore) {
                            record.zIndex = creationData.zIndexToRestore;
                            newWindowEl.style.zIndex = creationData.zIndexToRestore; // Apply it for initial stacking
                            // Ensure the global counter is at least this high for subsequent new windows
                            this.currentWindowZIndexCounter = Math.max(this.currentWindowZIndexCounter, creationData.zIndexToRestore);
                        }

                        // Apply the saved state (maximized, snapped, minimized)
                        // Must be done AFTER zIndex is restored and record's originalNormal might be set
                        if (s.state && s.state !== "normal") {
                            if (s.state === "maximized" && record.resizable) this.maximizeWindow(newWindowEl);
                            else if (s.state === "snapped-left" && record.resizable) this.snapWindow(newWindowEl, "left");
                            else if (s.state === "snapped-right" && record.resizable) this.snapWindow(newWindowEl, "right");
                            else if (s.state === "minimized") this.setWindowState(newWindowEl, "minimized");
                            else this.setWindowState(newWindowEl, "normal"); // Fallback
                        } else {
                             this.setWindowState(newWindowEl, "normal"); // Default to normal
                        }
                    }
                    if (s.isFocused && s.state !== "minimized") { // Only mark for focus if it was focused and not minimized
                        focusedWindowToRestore = newWindowEl;
                    }
                }
            }

            // After all windows are created and states applied, focus the one that was last focused.
            if (focusedWindowToRestore) {
                this.focusWindow(focusedWindowToRestore);
            } else {
                // If no window was marked as focused (e.g. all were minimized or none had isFocused true),
                // focus the one with the highest original z-index among non-minimized windows.
                let lastInteractedWindow = null;
                let highestZ = -1;
                this.windows.forEach(rec => {
                    if (rec.state !== 'minimized' && rec.zIndex > highestZ) {
                        highestZ = rec.zIndex;
                        lastInteractedWindow = rec.element;
                    }
                });
                if (lastInteractedWindow) this.focusWindow(lastInteractedWindow);
            }
            console.log("WindowManager: Window states restored.");
       } catch (error) {
           console.error('WindowManager: Error loading or restoring window states from DB:', error);
           // Attempt to clear potentially corrupted state to prevent boot loops
           try {
               await dbManager.deleteSetting('window_manager_state');
               console.warn("WindowManager: Cleared potentially corrupted 'window_manager_state' from DB.");
           } catch (clearError) {
               console.error("WindowManager: Failed to clear corrupted window state:", clearError);
           }
       }
   }
}

// Make the WindowManager globally available (if not using ES6 modules for import/export)
window.windowManager = new WindowManager();
console.log('WindowManager instance created and attached to window object.');

// If using ES6 modules, you would export the class:
// export default WindowManager;
