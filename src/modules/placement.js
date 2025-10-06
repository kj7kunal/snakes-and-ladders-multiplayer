// Placement FSM and handlers
import { PHASES } from './constants.js';
import { showToast, showFloatingComment, generateId, posToRowCol, clamp } from './utils.js';
import { normalizePlacements } from './models.js';
import { ui } from './ui.js';
import { getRoomRef, isFirebaseReady } from './state.js';

// Placement state machine
export let placeSM = { mode: null, step: 0, startCell: null, power: null, hoverCell: null };

// Make globally available for compatibility
window.placeSM = placeSM;

export function placementStart(mode) {
  const state = window.currentState;
  if (!state || state.status !== PHASES.PLACING) {
    showToast('Not in placement phase');
    return;
  }
  
  const mePlayer = (state.players || []).find(p => p.id === window.me?.uid);
  if (mePlayer?.ready) {
    showToast('Unready yourself to edit placements');
    return;
  }
  
  placeSM = {
    mode,
    step: mode === 'box' ? 1 : 1,
    startCell: null,
    power: mode === 'box' ? ui.boxPower.value : null,
    hoverCell: null
  };
  
  window.placeSM = placeSM; // Update global reference
  
  showToast(mode === 'box' ? 
    'Click a cell for your mystery box' : 
    'Click start cell for your ' + mode);
}

export function onCanvasMove(evt) {
  if (!placeSM.mode) return;
  
  const pos = canvasPointToPos(evt);
  placeSM.hoverCell = pos;
  window.placeSM = placeSM; // Update global reference
  
  if (window.drawBoard && window.currentState) {
    window.drawBoard(window.currentState);
  }
}

export function onCanvasClick(evt) {
  if (!placeSM.mode) return;
  
  const pos = canvasPointToPos(evt);
  const mode = placeSM.mode;
  
  if (mode === 'box') {
    if (placeSM.step === 1) {
      commitBox(pos, placeSM.power);
    }
    return;
  }
  
  if (placeSM.step === 1) {
    placeSM.startCell = pos;
    placeSM.step = 2;
    window.placeSM = placeSM; // Update global reference
    showToast('Select end cell');
    if (window.drawBoard && window.currentState) {
      window.drawBoard(window.currentState);
    }
    return;
  }
  
  if (placeSM.step === 2) {
    const from = placeSM.startCell;
    const to = pos;
    
    if (mode === 'ladder' && !(to > from)) {
      showToast('Ladder must go up (higher number)');
      return;
    }
    
    if (mode === 'snake' && !(to < from)) {
      showToast('Snake must go down (lower number)');
      return;
    }
    
    commitLadderSnake(mode, from, to);
  }
}

function canvasPointToPos(evt) {
  const rect = ui.board.getBoundingClientRect();
  const x = (evt.clientX - rect.left) * (ui.board.width / rect.width);
  const y = (evt.clientY - rect.top) * (ui.board.height / rect.height);
  
  const cell = ui.board.width / 10;
  const c = Math.floor(x / cell);
  const rFromTop = Math.floor(y / cell);
  
  const pos = 100 - (rFromTop * 10 + (rFromTop % 2 === 0 ? c : (9 - c)));
  return clamp(pos, 1, 100);
}

async function commitLadderSnake(mode, from, to) {
  try {
    if (!isFirebaseReady()) {
      showToast('Firebase not ready');
      return;
    }
    
    const roomRef = getRoomRef();
    if (!roomRef) {
      showToast('Not connected to room');
      return;
    }
    
    await window.db.runTransaction(async tx => {
      const snap = await tx.get(roomRef);
      if (!snap.exists) {
        throw new Error('Room not found');
      }
      
      const state = snap.data();
      
      const players = (state.players || []).map(player => {
        if (player.id !== window.me?.uid) return player;
        
        const placements = normalizePlacements(player.placements);
        const array = mode === 'ladder' ? placements.ladders : placements.snakes;
        
        if (array.length >= 2) {
          showToast(`You can only have 2 ${mode}s`);
          return player;
        }
        
        array.push({
          id: generateId(),
          from,
          to
        });
        
        return { ...player, placements };
      });
      
      tx.update(roomRef, { players });
    });
    
    resetPlacementState();
    showFloatingComment(mode === 'ladder' ? 'Ladder placed!' : 'Snake placed!');
  } catch (e) {
    console.error('Commit placement error:', e);
    showToast('Save failed: ' + (e?.message || 'Unknown error'));
  }
}

async function commitBox(cell, power) {
  try {
    if (!isFirebaseReady()) {
      showToast('Firebase not ready');
      return;
    }
    
    const roomRef = getRoomRef();
    if (!roomRef) {
      showToast('Not connected to room');
      return;
    }
    
    await window.db.runTransaction(async tx => {
      const snap = await tx.get(roomRef);
      if (!snap.exists) {
        throw new Error('Room not found');
      }
      
      const state = snap.data();
      
      const players = (state.players || []).map(player => {
        if (player.id !== window.me?.uid) return player;
        
        const placements = normalizePlacements(player.placements);
        placements.box = { cell, power };
        
        return { ...player, placements };
      });
      
      tx.update(roomRef, { players });
    });
    
    resetPlacementState();
    showFloatingComment('Mystery box placed!');
  } catch (e) {
    console.error('Commit box error:', e);
    showToast('Save failed: ' + (e?.message || 'Unknown error'));
  }
}

export async function deletePlacement(type, itemId) {
  try {
    const roomRef = getRoomRef();
    if (!roomRef) {
      showToast('Not connected to room');
      return;
    }
    
    await window.db.runTransaction(async tx => {
      const snap = await tx.get(roomRef);
      if (!snap.exists) {
        throw new Error('Room not found');
      }
      
      const state = snap.data();
      
      const players = (state.players || []).map(player => {
        if (player.id !== window.me?.uid) return player;
        
        const placements = normalizePlacements(player.placements);
        
        if (type === 'ladder') {
          placements.ladders = placements.ladders.filter(x => x.id !== itemId);
        } else if (type === 'snake') {
          placements.snakes = placements.snakes.filter(x => x.id !== itemId);
        } else if (type === 'box') {
          placements.box = null;
        }
        
        return { ...player, placements };
      });
      
      tx.update(roomRef, { players });
    });
    
    showToast('Deleted');
  } catch (e) {
    console.error('Delete placement error:', e);
    showToast('Delete failed: ' + (e?.message || 'Unknown error'));
  }
}

export async function toggleReady() {
  try {
    const roomRef = getRoomRef();
    if (!roomRef) {
      showToast('Not connected to room');
      return;
    }
    
    await window.db.runTransaction(async tx => {
      const snap = await tx.get(roomRef);
      if (!snap.exists) {
        throw new Error('Room not found');
      }
      
      const state = snap.data();
      
      const players = (state.players || []).map(player => 
        player.id === window.me?.uid ? { ...player, ready: !player.ready } : player
      );
      
      tx.update(roomRef, { players });
    });
  } catch (e) {
    console.error('Toggle ready error:', e);
    showToast('Ready toggle failed');
  }
}

function resetPlacementState() {
  placeSM = { mode: null, step: 0, startCell: null, power: null, hoverCell: null };
  window.placeSM = placeSM; // Update global reference
}

// Make functions globally available for compatibility
window.deletePlacement = deletePlacement;
