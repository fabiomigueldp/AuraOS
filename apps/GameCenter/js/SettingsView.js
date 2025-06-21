/**
 * Game Center - Settings View Module
 * 
 * Handles the settings interface for Game Center configuration,
 * including audio settings and other game-related preferences.
 */

import { getCurrentGameInstance } from './GameLauncher.js';

/**
 * Shows the settings view for Game Center
 * @param {HTMLElement} contentArea - Content area to display settings
 */
export function showSettingsView(contentArea) {
    // Stop any running game instance
    const currentGame = getCurrentGameInstance();
    if (currentGame) {
        stopCurrentGameInstance(currentGame);
    }

    contentArea.innerHTML = `
        <div style="padding: 20px; width: 100%; box-sizing: border-box; text-align: center;">
            <h2 style="margin-top:0; margin-bottom: 30px;">Settings</h2>
            <div class="setting-row" style="max-width: 400px; margin: 0 auto; display: flex; flex-direction: column; align-items: center; gap: 10px;">
                <label for="global-volume-slider" style="font-size: 1rem; color: var(--text-color);">Global Volume</label>
                <div style="display: flex; align-items: center; width: 100%; gap: 15px;">
                    <input type="range" id="global-volume-slider" min="0" max="1" step="0.01" style="flex-grow: 1; cursor: pointer;">
                    <span id="volume-percentage" style="font-size: 0.9rem; color: var(--subtle-text-color); min-width: 45px; text-align: right;"></span>
                </div>
            </div>
            <div class="setting-row" style="max-width: 400px; margin: 20px auto 0; display: flex; flex-direction: column; align-items: center; gap: 10px;">
                <label style="font-size: 1rem; color: var(--text-color);">Game Center Info</label>
                <div style="text-align: center; color: var(--subtle-text-color); font-size: 0.9rem;">
                    <p>Game Center provides access to all AuraOS games in one place.</p>
                    <p>Scores and achievements are automatically saved.</p>
                </div>
            </div>
        </div>
    `;

    // Initialize volume control
    initializeVolumeControl();
}

/**
 * Initializes the volume control slider and its event handlers
 */
function initializeVolumeControl() {
    const volumeSlider = document.querySelector('#global-volume-slider');
    const volumePercentageDisplay = document.querySelector('#volume-percentage');

    if (!volumeSlider || !volumePercentageDisplay) {
        console.warn('Volume control elements not found');
        return;
    }

    // Check if AuraGameSDK is available
    if (!window.AuraGameSDK || !window.AuraGameSDK.audio) {
        console.warn('AuraGameSDK audio not available');
        volumeSlider.disabled = true;
        volumePercentageDisplay.textContent = 'N/A';
        return;
    }

    // Get current volume and update UI
    const currentVolume = window.AuraGameSDK.audio.getVolume();
    volumeSlider.value = currentVolume;
    volumePercentageDisplay.textContent = `${Math.round(currentVolume * 100)}%`;

    // Set up volume change handler
    volumeSlider.addEventListener('input', (event) => {
        const newVolume = parseFloat(event.target.value);
        
        // Update AuraGameSDK volume
        window.AuraGameSDK.audio.setVolume(newVolume);
        
        // Update percentage display
        volumePercentageDisplay.textContent = `${Math.round(newVolume * 100)}%`;
        
        // Note: Persistence of this setting would require AuraGameSDK.storage.saveSetting
        // or similar functionality to be implemented in the SDK
    });
}

/**
 * Stops the current game instance safely
 * @param {Object} gameInstance - Current game instance
 */
function stopCurrentGameInstance(gameInstance) {
    try {
        if (typeof gameInstance.destroy === 'function') {
            gameInstance.destroy();
        } else if (typeof gameInstance.stop === 'function') {
            gameInstance.stop();
        }
        
        if (typeof gameInstance.cleanup === 'function') {
            gameInstance.cleanup();
        }
        
        if (gameInstance._resizeObserver && typeof gameInstance._resizeObserver.disconnect === 'function') {
            gameInstance._resizeObserver.disconnect();
            gameInstance._resizeObserver = null;
        }
    } catch (error) {
        console.error('Error stopping game instance:', error);
    }
}
