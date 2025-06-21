/**
 * Game Center - Game List Module
 * 
 * Handles the rendering and management of the game list sidebar,
 * including games, leaderboards tab, and settings tab.
 */

import { games } from './gameData.js';

/**
 * Renders the game list and tabs in the sidebar
 * @param {HTMLElement} container - The game list container element
 * @param {Function} onGameSelect - Callback when a game is selected
 * @param {Function} onTabSelect - Callback when a tab (leaderboard/settings) is selected
 */
export function renderGameList(container, onGameSelect, onTabSelect) {
    // Clear existing content
    container.innerHTML = '';

    // Render individual games
    games.forEach(game => {
        const gameItemEl = document.createElement('div');
        gameItemEl.className = 'game-item';
        gameItemEl.dataset.gameId = game.id;
        gameItemEl.innerHTML = `
            <div class="game-item-icon">${game.iconSvg}</div>
            <span class="game-item-title">${game.title}</span>
        `;
        
        gameItemEl.addEventListener('click', () => {
            setActiveItem(container, game.id);
            onGameSelect(game);
        });
        
        container.appendChild(gameItemEl);
    });

    // Add leaderboards tab
    const leaderboardsTab = createTab(
        'leaderboards-tab',
        'Leaderboards',
        '<svg viewBox="0 0 24 24" width="32" height="32" fill="var(--icon-fill)"><path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm-1 4l6 6v10c0 1.1-.9 2-2 2H7.99C6.89 23 6 22.1 6 21l.01-14c0-1.1.89-2 1.99-2h7zm-1 7h5.5L11 4.5V9c0 .55.45 1 1 1z"/></svg>'
    );
    
    leaderboardsTab.addEventListener('click', () => {
        setActiveItem(container, 'leaderboards-tab');
        onTabSelect('leaderboards');
    });
    
    container.appendChild(leaderboardsTab);

    // Add settings tab
    const settingsTab = createTab(
        'settings-tab',
        'Settings',
        '<svg viewBox="0 0 24 24" width="32" height="32" fill="var(--icon-fill)"><path d="M19.14,12.94c0.04-0.3,0.06-0.61,0.06-0.94c0-0.32-0.02-0.64-0.07-0.94l2.03-1.58c0.18-0.14,0.23-0.41,0.12-0.61 l-1.92-3.32c-0.12-0.22-0.37-0.29-0.59-0.22l-2.39,0.96c-0.5-0.38-1.03-0.69-1.62-0.92L14.4,2.23C14.34,2.01,14.14,1.86,13.9,1.86 h-3.8c-0.24,0-0.44,0.15-0.5,0.37L9.16,4.61C8.57,4.85,8.04,5.15,7.55,5.53L5.16,4.57c-0.22-0.08-0.47,0-0.59,0.22L2.65,8.11 c-0.11,0.2-0.06,0.47,0.12,0.61l2.03,1.58C4.74,10.7,4.73,11.02,4.73,11.33c0,0.31,0.01,0.63,0.06,0.94l-2.03,1.58 c-0.18,0.14-0.23,0.41-0.12,0.61l1.92,3.32c0.12,0.22,0.37,0.29,0.59,0.22l2.39-0.96c0.5,0.38,1.03,0.69,1.62,0.92L9.6,21.77 c0.06,0.22,0.26,0.37,0.5,0.37h3.8c0.24,0,0.44-0.15,0.5-0.37l0.43-2.34c0.59-0.23,1.12-0.54,1.62-0.92l2.39,0.96 c0.22,0.08,0.47,0,0.59-0.22l1.92-3.32c0.11-0.2,0.06-0.47-0.12-0.61L19.14,12.94z M12,15.6c-1.98,0-3.6-1.62-3.6-3.6 s1.62-3.6,3.6-3.6s3.6,1.62,3.6,3.6S13.98,15.6,12,15.6z"/></svg>'
    );
    
    settingsTab.addEventListener('click', () => {
        setActiveItem(container, 'settings-tab');
        onTabSelect('settings');
    });
    
    container.appendChild(settingsTab);

    // Show message if no games available
    if (games.length === 0) {
        container.innerHTML = '<p style="color: var(--subtle-text-color); font-style: italic; padding: 10px;">No games available.</p>';
    }
}

/**
 * Creates a tab element (leaderboards or settings)
 * @param {string} className - CSS class for the tab
 * @param {string} title - Tab title
 * @param {string} iconSvg - SVG icon for the tab
 * @returns {HTMLElement} The created tab element
 */
function createTab(className, title, iconSvg) {
    const tab = document.createElement('div');
    tab.className = `game-item ${className}`;
    tab.innerHTML = `
        <div class="game-item-icon">${iconSvg}</div>
        <span class="game-item-title">${title}</span>
    `;
    return tab;
}

/**
 * Sets the active item in the game list
 * @param {HTMLElement} container - The game list container
 * @param {string} itemId - The ID of the item to activate (game ID or tab class)
 */
export function setActiveItem(container, itemId) {
    // Remove active class from all items
    container.querySelectorAll('.game-item.active').forEach(item => {
        item.classList.remove('active');
    });

    // Add active class to selected item
    let targetElement;
    if (itemId === 'leaderboards-tab' || itemId === 'settings-tab') {
        targetElement = container.querySelector(`.${itemId}`);
    } else {
        targetElement = container.querySelector(`[data-game-id="${itemId}"]`);
    }

    if (targetElement) {
        targetElement.classList.add('active');
    }
}

/**
 * Clears all active states in the game list
 * @param {HTMLElement} container - The game list container
 */
export function clearActiveStates(container) {
    container.querySelectorAll('.game-item.active').forEach(item => {
        item.classList.remove('active');
    });
}
