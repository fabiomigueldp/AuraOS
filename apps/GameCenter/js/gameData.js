/**
 * Game Center - Game Data Configuration
 * 
 * Contains the configuration for all available games in the Game Center.
 * Each game entry includes metadata like title, description, icons, and banners.
 */

export const games = [
    { 
        id: 'aura-breaker', 
        title: 'Aura Breaker', 
        iconSvg: '<svg viewBox="0 0 24 24" width="32" height="32" fill="var(--icon-fill)"><path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zM6 16H4v-2h2v2zm0-3H4v-2h2v2zm0-3H4V8h2v2zm10 6h-2v-2h2v2zm0-3h-2v-2h2v2zm0-3h-2V8h2v2zm4 6h-2v-2h2v2zm0-3h-2v-2h2v2zM8 9H6V7h2v2zm4 0h-2V7h2v2zm4 0h-2V7h2v2z"/></svg>',
        banner: 'gameassets/aurabreaker.png',
        description: 'A classic brick-breaking adventure! Use your paddle to bounce the ball and destroy all the bricks to advance through levels. Aim for the high score!',
        gameClass: 'AuraBreakerGame'
    },
    { 
        id: 'aura-snake', 
        title: 'Aura Snake', 
        iconSvg: '<svg viewBox="0 0 24 24" width="32" height="32" fill="var(--icon-fill)"><path d="M14 6c0-2.21-1.79-4-4-4S6 3.79 6 6s1.79 4 4 4 4-1.79 4-4zm-4 5c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4zm6.17-5.59L18 7.27l2.45-2.45c.49-.49 1.28-.49 1.77 0 .49.49.49 1.28 0 1.77L19.77 9l2.45 2.45c.49.49.49 1.28 0 1.77-.49.49-1.28.49-1.77 0L18 10.73l-1.83 1.83c-.49.49-1.28.49-1.77 0s-.49-1.28 0-1.77L16.23 9l-1.83-1.83c-.49-.49-.49-1.28 0-1.77s1.28-.49 1.77 0z"/></svg>',
        banner: 'gameassets/aurasnake.png',
        description: 'Guide your snake to eat food and grow longer! Avoid hitting the walls or your own tail in this classic arcade game. How long can you survive?',
        gameClass: 'AuraSnakeGame'
    },
    {
        id: 'aura-pong',
        title: 'Aura Pong',
        iconSvg: '<svg viewBox="0 0 32 32" fill="var(--icon-fill)"><rect x="2" y="14" width="4" height="10"/><rect x="26" y="10" width="4" height="10"/><circle cx="16" cy="16" r="2"/></svg>',
        banner: 'gameassets/aurapong.png',
        description: 'Experience the classic table tennis simulation! Control your paddle to hit the ball and score against the AI opponent. First to reach the winning score wins!',
        gameClass: 'AuraPongGame'
    },
    {
        id: 'aura-tetris',
        title: 'Aura Tetris',
        iconSvg: '<svg viewBox="0 0 32 32" fill="var(--icon-fill)"><rect x="10" y="2" width="12" height="4"/><rect x="6" y="6" width="4" height="4"/><rect x="10" y="6" width="4" height="4"/><rect x="14" y="6" width="4" height="4"/><rect x="18" y="6" width="4" height="4"/><rect x="10" y="10" width="12" height="4"/></svg>',
        banner: 'gameassets/auratetris.png',
        description: 'Arrange falling blocks to create complete horizontal lines! Clear lines to score points and advance levels. The classic puzzle game that never gets old!',
        gameClass: 'AuraTetrisGame'
    },
    {
        id: 'aura-invaders',
        title: 'Aura Invaders',
        iconSvg: '<svg viewBox="0 0 32 32" fill="var(--icon-fill)"><path d="M16 4l-4 8h8zm-6 10h12v2H10zm-4 4h20v2H6zm2 4h16v2H8zM4 28h24v2H4z"/></svg>',
        banner: 'gameassets/aurainvaders.png',
        description: 'Defend Earth from alien invaders! Shoot down waves of enemies before they reach the ground. How many waves can you survive in this retro space shooter?',
        gameClass: 'AuraInvadersGame'
    },
    {
        id: 'aura-citadel',
        title: 'Aura Citadel',
        iconSvg: '<svg viewBox="0 0 32 32" fill="var(--icon-fill)"><path d="M16 2L2 8v10l14 6 14-6V8L16 2zm0 2.76L26.94 9 16 13.24 5.06 9 16 4.76zM4 10.34l12 5.14 12-5.14v7.32L16 22.8l-12-5.14v-7.32z"/></svg>',
        banner: 'gameassets/auracitadel.png',
        description: 'Defend the Aura Core from waves of glitches by building and upgrading powerful towers. A strategic tower defense game.',
        gameClass: 'AuraCitadelGame'
    },
    {
        id: 'aura-whack',
        title: 'Aura Whack',
        iconSvg: '<svg viewBox="0 0 32 32" fill="var(--icon-fill)"><circle cx="8" cy="24" r="3"/><circle cx="16" cy="24" r="3"/><circle cx="24" cy="24" r="3"/><circle cx="12" cy="16" r="3"/><circle cx="20" cy="16" r="3"/><circle cx="16" cy="8" r="3"/><path d="M16 2l2 4h4l-2 2 2 4-4-2-4 2 2-4-2-2h4z"/></svg>',
        banner: 'gameassets/aurawhack.png',
        description: 'Test your reflexes in this classic whack-a-mole game! Hit the moles as they pop up from their holes. How many can you whack before time runs out?',
        gameClass: 'AuraWhackGame'
    },
    {
        id: 'aura-timber',
        title: 'Aura Timber',
        iconSvg: '<svg viewBox="0 0 32 32" fill="var(--icon-fill)"><path d="M16 2l-2 4v8l2-2 2 2V6l-2-4zm-4 14v12h8V16h-8zm-2 0H6v12h4V16zm12 0v12h4V16h-4zm-6-2h4V8h-4v6z"/></svg>',
        banner: 'gameassets/auratimber.png',
        description: 'Test your reflexes in this fast-paced tree-chopping game! Chop wood while avoiding branches. Time is running out - how high can you score?',
        gameClass: 'AuraTimberGame'
    }
];

/**
 * Get game data by ID
 * @param {string} gameId - The game identifier
 * @returns {Object|null} Game data object or null if not found
 */
export function getGameById(gameId) {
    return games.find(game => game.id === gameId) || null;
}

/**
 * Get all available game IDs
 * @returns {string[]} Array of game IDs
 */
export function getAllGameIds() {
    return games.map(game => game.id);
}
