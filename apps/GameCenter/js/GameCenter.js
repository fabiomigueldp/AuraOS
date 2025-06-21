/**
 * Game Center - Main Controller
 * 
 * Main orchestrator for the Game Center application.
 * Manages initialization, component coordination, and state management.
 */

import { renderGameList, setActiveItem, clearActiveStates } from './GameList.js';
import { showGameDetails, showInitialMessage } from './GameDetails.js';
import { showLeaderboardView } from './LeaderboardView.js';
import { showSettingsView } from './SettingsView.js';
import { setupWindowCloseHandler } from './GameLauncher.js';

/**
 * Current state tracking
 */
let currentDetailedGameId = null;
let gameListContainer = null;
let gameContentArea = null;

/**
 * Initializes the Game Center application
 * @param {HTMLElement} windowEl - The window element containing the Game Center
 */
export function initializeGameCenter(windowEl) {
    const body = windowEl.querySelector('.window-body');
    
    // Create the main HTML structure
    body.innerHTML = `
        <div class="game-center-container" style="display: flex; height: 100%; background: transparent;">
            <div class="game-library-sidebar" style="width: 220px; height: 100%; padding: 10px; box-sizing: border-box; display: flex; flex-direction: column;">
                <h3 style="margin-top: 0; margin-bottom: 10px; border-bottom: 1px solid var(--glass-border); padding-bottom: 8px;">Games</h3>
                <div class="game-list" style="flex-grow: 1; overflow-y: auto;">
                    <!-- Games will be populated by JavaScript -->
                </div>
            </div>
            <div class="game-content-area" style="flex-grow: 1; padding: 20px; box-sizing: border-box; display: flex; flex-direction: column; align-items: center; justify-content: center;">
                <h2 class="initial-message">Select a game</h2>
            </div>
        </div>
    `;

    // Get references to key elements
    gameListContainer = body.querySelector('.game-list');
    gameContentArea = body.querySelector('.game-content-area');

    if (!gameListContainer || !gameContentArea) {
        console.error('Failed to find required Game Center elements');
        return;
    }

    // Initialize the game list with event handlers
    renderGameList(
        gameListContainer,
        handleGameSelection,
        handleTabSelection
    );

    // Set up window close handler for cleanup
    setupWindowCloseHandler(windowEl);

    console.log('Game Center initialized successfully');
}

/**
 * Handles game selection from the sidebar
 * @param {Object} gameData - Selected game data
 */
function handleGameSelection(gameData) {
    currentDetailedGameId = gameData.id;
    showGameDetails(gameData, gameContentArea, handleGameLaunch);
}

/**
 * Handles tab selection (leaderboards or settings)
 * @param {string} tabType - Type of tab selected ('leaderboards' or 'settings')
 */
function handleTabSelection(tabType) {
    currentDetailedGameId = null;
    
    switch (tabType) {
        case 'leaderboards':
            showLeaderboardView(gameContentArea);
            break;
        case 'settings':
            showSettingsView(gameContentArea);
            break;
        default:
            console.warn('Unknown tab type:', tabType);
            showInitialMessage(gameContentArea);
    }
}

/**
 * Handles game launch events
 * @param {Object} gameData - Game that was launched
 */
function handleGameLaunch(gameData) {
    // Currently no special handling needed for game launch
    // This could be extended for analytics, notifications, etc.
    console.log('Game launched:', gameData.title);
}

/**
 * Utility function to get current state
 * @returns {Object} Current Game Center state
 */
export function getCurrentState() {
    return {
        detailedGameId: currentDetailedGameId,
        hasGameList: !!gameListContainer,
        hasContentArea: !!gameContentArea
    };
}

/**
 * Utility function to reset Game Center to initial state
 */
export function resetToInitialState() {
    currentDetailedGameId = null;
    
    if (gameListContainer) {
        clearActiveStates(gameListContainer);
    }
    
    if (gameContentArea) {
        showInitialMessage(gameContentArea);
    }
}
