/**
 * Game Center - Game Details Module
 * 
 * Handles the display of game details including banner, description,
 * play button, and leaderboard integration.
 */

import { launchGame } from './GameLauncher.js';

/**
 * Shows detailed view for a selected game
 * @param {Object} gameData - Game configuration object
 * @param {HTMLElement} contentArea - Content area to display details
 * @param {Function} onGameLaunch - Callback when game is launched
 */
export function showGameDetails(gameData, contentArea, onGameLaunch) {
    contentArea.innerHTML = `
        <div class="game-detail-view">
            <div class="game-banner" style="background-image: url('${gameData.banner}'); background-size: cover; background-position: center; background-color: var(--glass-background);"></div>
            <div class="game-info-debajo-banner">
                <h2 class="game-title-detail">${gameData.title}</h2>
                <p class="game-description">
                    ${gameData.description}
                </p>
                <button class="play-button" data-game-id="${gameData.id}">Play Game</button>
                <div class="leaderboard-section">
                    <h3>Leaderboard</h3>
                    <div id="leaderboard-list"><p><em>Loading high scores...</em></p></div>
                </div>
            </div>
        </div>
    `;

    // Set up play button event listener
    const playButton = contentArea.querySelector('.play-button');
    if (playButton) {
        playButton.addEventListener('click', () => {
            // Launch the game
            launchGame(gameData, contentArea, () => {
                // On exit, return to game details
                showGameDetails(gameData, contentArea, onGameLaunch);
            });
            
            // Notify parent about game launch
            if (onGameLaunch) {
                onGameLaunch(gameData);
            }
        });
    }

    // Load and display leaderboard
    loadGameLeaderboard(gameData.id);
}

/**
 * Loads and displays the leaderboard for a specific game
 * @param {string} gameId - Game identifier
 */
async function loadGameLeaderboard(gameId) {
    if (!window.AuraGameSDK || !window.AuraGameSDK.leaderboard) {
        console.warn('AuraGameSDK not available for leaderboard');
        return;
    }

    try {
        const scores = await window.AuraGameSDK.leaderboard.getHighScores(gameId, 5);
        const lbList = document.getElementById('leaderboard-list');
        
        if (lbList) {
            if (scores && scores.length > 0) {
                lbList.innerHTML = '<ul style="list-style:none; padding:0; text-align:left;">' + 
                    scores.map(s => `
                        <li style="padding: 3px 0; border-bottom: 1px solid var(--glass-border); display: flex; justify-content: space-between;">
                            <span style="font-weight:500;">${s.playerName}</span>
                            <span>${s.score}</span>
                        </li>
                    `).join('') + 
                    '</ul>';
            } else {
                lbList.innerHTML = '<p style="text-align:center;"><em>No high scores yet. Be the first!</em></p>';
            }
        }
    } catch (err) {
        console.error("Failed to load high scores for", gameId, err);
        const lbList = document.getElementById('leaderboard-list');
        if (lbList) {
            lbList.innerHTML = '<p style="text-align:center;"><em>Could not load high scores.</em></p>';
        }
    }
}

/**
 * Shows the initial "Select a game" message
 * @param {HTMLElement} contentArea - Content area element
 */
export function showInitialMessage(contentArea) {
    contentArea.innerHTML = '<h2 class="initial-message">Select a game</h2>';
}
