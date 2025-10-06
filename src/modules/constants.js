// Game constants and configuration
export const MAX_PLAYERS = 6;
export const PHASES = {
  LOBBY: 'lobby',
  PLACING: 'placing', 
  PLAYING: 'playing',
  FINISHED: 'finished'
};
export const POWERS = ['BOOST', 'REROLL', 'SHIELD', 'SWAP_LEADER', 'MINI_LEAP'];
export const COLOR_PALETTE = ['#ff6b6b', '#4dd2ff', '#ffd166', '#06d6a0', '#f78c6b', '#c792ea'];
export const STEP_MS = 180; // animation speed per cell

// Power descriptions for UI
export const POWER_DESCRIPTIONS = {
  BOOST: 'Add +2 to your roll',
  REROLL: 'Roll twice, take the higher',
  SHIELD: 'Ignore the next snake',
  SWAP_LEADER: 'Swap positions with the leader',
  MINI_LEAP: 'Jump forward 6 spaces immediately'
};
