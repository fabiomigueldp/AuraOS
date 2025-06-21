/**
 * Game Center - Leaderboard View Module
 * 
 * Handles the leaderboard interface where users can view high scores
 * for all games in a centralized view.
 */

import { games } from './gameData.js';
import { getCurrentGameInstance } from './GameLauncher.js';

/**
 * Debug function to add sample scores for testing
 */
async function addSampleScores() {
    if (!window.AuraGameSDK || !window.AuraGameSDK.leaderboard) {
        console.error('AuraGameSDK not available for adding sample scores');
        return;
    }

    console.log('Adding sample scores for testing...');
    
    const sampleScores = [
        { gameId: 'aura-snake', playerName: 'Player1', score: 150 },
        { gameId: 'aura-snake', playerName: 'Player2', score: 120 },
        { gameId: 'aura-snake', playerName: 'Player3', score: 95 },
        { gameId: 'aura-tetris', playerName: 'TetrisMaster', score: 50000 },
        { gameId: 'aura-tetris', playerName: 'BlockBuster', score: 45000 },
        { gameId: 'aura-breaker', playerName: 'BrickBreaker', score: 8500 },
        { gameId: 'aura-pong', playerName: 'PongChamp', score: 10 },
        { gameId: 'aura-whack', playerName: 'MoleHunter', score: 25 },
    ];

    try {
        for (const score of sampleScores) {
            // Initialize SDK for each game temporarily
            window.AuraGameSDK.init(score.gameId, document.createElement('canvas'));
            await window.AuraGameSDK.leaderboard.submitScore(score.playerName, score.score);
            console.log(`Added sample score: ${score.playerName} - ${score.score} for ${score.gameId}`);
        }
        console.log('Sample scores added successfully!');
    } catch (error) {
        console.error('Error adding sample scores:', error);
    }
}

/**
 * Debug function to check database status
 */
async function checkDatabaseStatus(debugInfoElement) {
    console.log('🔍 Checking database status...');
    
    try {
        // Check if AuraGameSDK is available
        if (!window.AuraGameSDK) {
            debugInfoElement.innerHTML = '❌ AuraGameSDK not available';
            return;
        }

        // Check if dbManager is available
        if (!window.dbManager) {
            debugInfoElement.innerHTML = '❌ dbManager not available';
            return;
        }

        // Check if system is ready
        if (!window.auraOSSystemReady) {
            debugInfoElement.innerHTML = '⏳ AuraOS system not ready yet';
            return;
        }

        // Try to ensure AuraGameSDK is ready
        await window.AuraGameSDK._ensureReady();
        
        // Check database connection
        if (!window.dbManager.db) {
            debugInfoElement.innerHTML = '❌ Database connection not available';
            return;
        }

        // Check if high_scores store exists
        if (!window.dbManager.db.objectStoreNames.contains('high_scores')) {
            debugInfoElement.innerHTML = '❌ high_scores store not found in database';
            return;
        }

        // Count existing scores
        const transaction = window.dbManager.db.transaction(['high_scores'], 'readonly');
        const store = transaction.objectStore('high_scores');
        const countRequest = store.count();
        
        countRequest.onsuccess = () => {
            const count = countRequest.result;
            debugInfoElement.innerHTML = `✅ Database OK - ${count} scores in database`;
        };

        countRequest.onerror = (error) => {
            debugInfoElement.innerHTML = '❌ Error counting scores: ' + error.message;
        };

    } catch (error) {
        console.error('Error in checkDatabaseStatus:', error);
        debugInfoElement.innerHTML = '❌ Error: ' + error.message;
    }
}

/**
 * Shows the leaderboard view with game selector and scores
 * @param {HTMLElement} contentArea - Content area to display leaderboards
 */
export function showLeaderboardView(contentArea) {
    // Stop any running game instance
    const currentGame = getCurrentGameInstance();
    if (currentGame) {
        stopCurrentGameInstance(currentGame);
    }

    contentArea.innerHTML = `
        <div style="padding: 10px; width: 100%; box-sizing: border-box;">
            <h2 style="margin-top:0; margin-bottom: 15px; text-align:center;">Leaderboards</h2>
            
            <!-- Debug Section -->
            <div style="margin-bottom: 20px; text-align: center; padding: 10px; background: rgba(255,255,255,0.05); border-radius: var(--ui-corner-radius-small);">
                <button id="debug-add-scores" style="padding: 8px 16px; background: var(--highlight-primary); color: white; border: none; border-radius: var(--ui-corner-radius-small); cursor: pointer; margin-right: 10px;">Add Sample Scores</button>
                <button id="debug-check-db" style="padding: 8px 16px; background: var(--highlight-secondary); color: white; border: none; border-radius: var(--ui-corner-radius-small); cursor: pointer;">Check Database</button>
                <div id="debug-info" style="margin-top: 10px; font-size: 0.8rem; color: var(--subtle-text-color);"></div>
            </div>
            
            <div style="margin-bottom: 20px; display: flex; justify-content: center;">
                <select id="leaderboard-game-selector" style="padding: 8px 12px; border-radius: var(--ui-corner-radius-small); background: var(--glass-background); color: var(--text-color); border: 1px solid var(--glass-border); font-size: 0.9rem;">
                    <option value="">-- Select a Game --</option>
                    ${games.map(g => `<option value="${g.id}">${g.title}</option>`).join('')}
                </select>
            </div>
            <div id="leaderboard-scores-display" style="min-height: 200px; padding:10px; border: 1px solid var(--glass-border); border-radius: var(--ui-corner-radius-small); background: rgba(0,0,0,0.1);">
                <p style="text-align:center; color: var(--subtle-text-color);">Select a game to view its leaderboard.</p>
            </div>
        </div>
    `;

    // Set up debug buttons
    const debugAddBtn = contentArea.querySelector('#debug-add-scores');
    const debugCheckBtn = contentArea.querySelector('#debug-check-db');
    const debugInfo = contentArea.querySelector('#debug-info');

    if (debugAddBtn) {
        debugAddBtn.addEventListener('click', async () => {
            debugInfo.innerHTML = 'Adding sample scores...';
            try {
                await addSampleScores();
                debugInfo.innerHTML = '✅ Sample scores added successfully!';
                // Refresh current selection if any
                const selector = contentArea.querySelector('#leaderboard-game-selector');
                if (selector && selector.value) {
                    displayScoresForGame(selector.value);
                }
            } catch (error) {
                debugInfo.innerHTML = '❌ Error adding sample scores: ' + error.message;
            }
        });
    }

    if (debugCheckBtn) {
        debugCheckBtn.addEventListener('click', async () => {
            debugInfo.innerHTML = 'Checking database...';
            try {
                await checkDatabaseStatus(debugInfo);
            } catch (error) {
                debugInfo.innerHTML = '❌ Error checking database: ' + error.message;
            }
        });
    }

    // Set up game selector event listener
    const selector = contentArea.querySelector('#leaderboard-game-selector');
    if (selector) {
        selector.addEventListener('change', (event) => {
            if (event.target.value) {
                displayScoresForGame(event.target.value);
            } else {
                resetScoresDisplay();
            }
        });
    }
}

/**
 * Displays scores for a specific game
 * @param {string} gameId - Game identifier
 */
async function displayScoresForGame(gameId) {
    console.log(`🎯 Displaying scores for game: ${gameId}`);
    
    const scoresDisplayDiv = document.querySelector('#leaderboard-scores-display');
    if (!scoresDisplayDiv) {
        console.error("Score display div not found for leaderboards.");
        return;
    }

    scoresDisplayDiv.innerHTML = '<p><em>Loading high scores...</em></p>';

    // Check AuraGameSDK availability
    if (!window.AuraGameSDK || !window.AuraGameSDK.leaderboard) {
        console.error('AuraGameSDK or leaderboard not available');
        scoresDisplayDiv.innerHTML = '<p style="color: var(--red-accent); text-align:center;">AuraGameSDK not available.</p>';
        return;
    }

    // Check system readiness
    if (!window.auraOSSystemReady) {
        console.warn('AuraOS system not ready yet');
        scoresDisplayDiv.innerHTML = '<p style="color: var(--red-accent); text-align:center;">System not ready yet. Please wait...</p>';
        return;
    }

    try {
        console.log(`📊 Fetching high scores for ${gameId}...`);
        const scores = await window.AuraGameSDK.leaderboard.getHighScores(gameId, 50);
        console.log(`📋 Received scores for ${gameId}:`, scores);
        
        if (scores && scores.length > 0) {
            console.log(`✅ Found ${scores.length} scores for ${gameId}`);
            let scoresHTML = '<ol style="padding-left: 20px; list-style: decimal;">';
            scores.forEach((scoreEntry, index) => {
                const dateStr = new Date(scoreEntry.timestamp).toLocaleDateString();
                scoresHTML += `
                    <li style="margin-bottom: 8px; padding-bottom: 5px; border-bottom: 1px solid var(--glass-border); display: flex; justify-content: space-between; align-items: center;">
                        <span>${index + 1}. <strong>${scoreEntry.playerName}</strong> - ${scoreEntry.score}</span>
                        <small style="color: var(--subtle-text-color); font-size: 0.8em;">${dateStr}</small>
                    </li>
                `;
            });
            scoresHTML += '</ol>';
            scoresDisplayDiv.innerHTML = scoresHTML;
        } else {
            console.log(`📭 No scores found for ${gameId}`);
            scoresDisplayDiv.innerHTML = '<p style="text-align:center;"><em>No scores available for this game yet.</em></p>';
        }
    } catch (error) {
        console.error(`❌ Error fetching high scores for ${gameId}:`, error);
        scoresDisplayDiv.innerHTML = `<p style="color: var(--red-accent); text-align:center;">Error loading scores: ${error.message || error}</p>`;
    }
}

/**
 * Resets the scores display to initial state
 */
function resetScoresDisplay() {
    const scoresDisplayDiv = document.querySelector('#leaderboard-scores-display');
    if (scoresDisplayDiv) {
        scoresDisplayDiv.innerHTML = '<p style="text-align:center; color: var(--subtle-text-color);">Select a game to view its leaderboard.</p>';
    }
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
