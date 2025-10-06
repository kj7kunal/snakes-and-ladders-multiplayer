// Main entrypoint for Snakes & Ladders
import { initFirebase } from './modules/firebase.js';
import { wireUI } from './modules/ui.js';
import { ensureAuth } from './modules/auth.js';

// Initialize the game
async function init() {
  try {
    initFirebase();
    wireUI();
    await ensureAuth();
  } catch (error) {
    console.error('Initialization failed:', error);
    
    // Show user-friendly error
    const toast = document.querySelector('#toast');
    if (toast) {
      toast.textContent = 'Failed to initialize game: ' + error.message;
      toast.style.display = 'block';
    }
  }
}

init();
