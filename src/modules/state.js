// State management and backend operations
import { MAX_PLAYERS, PHASES } from './constants.js';
import { showToast, randomName, generateId, validateRoomCode } from './utils.js';
import { ensureAuth } from './auth.js';
import { ui } from './ui.js';
import { normalizePlacements, chooseUniqueColor, defaultRoomState, playerObject } from './models.js';
import { renderState, maybeClearAnim } from './rendering.js';

// Global state
export let me = { uid: null, name: null, color: '#ff6b6b' };
export let roomRef = null;
export let unsubRoom = null;
export let currentState = null;
export let localAnim = null;

// Initialize global window references for backward compatibility
window.me = me;
window.currentState = currentState;
window.localAnim = localAnim;

// Export getter functions for safe access
export function getRoomRef() {
  return roomRef;
}

export function getCurrentState() {
  return currentState;
}

export function isFirebaseReady() {
  return !!(window.db && window.auth);
}

export function onCodeInput() {
  const code = validateRoomCode(ui.joinCode.value);
  if (code) ui.joinCode.value = code;
  const isValid = !!code;
  ui.createRoomBtn.disabled = !isValid;
  ui.joinRoomBtn.disabled = !isValid;
}

export async function onCreateRoom() {
  try {
    me.name = (ui.displayName.value || '').trim() || randomName();
    await ensureAuth();
    
    const code = validateRoomCode(ui.joinCode.value);
    if (!code) {
      showToast('Enter a valid 6-character room code');
      return;
    }
    
    roomRef = window.db.collection('rooms').doc(code);
    window.roomRef = roomRef; // Make available globally
    const exists = await roomRef.get();
    if (exists.exists) {
      showToast('Room code already in use');
      return;
    }
    
    await roomRef.set(defaultRoomState(me.uid));
    me.color = chooseUniqueColor([]);
    ui.colorPick.value = me.color;
    
    localStorage.setItem('sl_name', me.name);
    localStorage.setItem('sl_color', me.color);
    
    await roomRef.update({ players: [playerObject()] });
    onEnterRoom(code);
    
    showToast('Room created successfully');
  } catch (err) {
    console.error('Create room error:', err);
    showToast('Create failed: ' + (err?.message || 'Unknown error'));
  }
}

export async function onJoinRoom() {
  try {
    const code = validateRoomCode(ui.joinCode.value);
    if (!code) {
      showToast('Invalid room code');
      return;
    }
    
    me.name = (ui.displayName.value || '').trim() || randomName();
    await ensureAuth();
    
    roomRef = window.db.collection('rooms').doc(code);
    window.roomRef = roomRef; // Make available globally
    const snap = await roomRef.get();
    
    if (!snap.exists) {
      showToast('Room not found');
      return;
    }
    
    const data = snap.data();
    if ((data.players || []).length >= MAX_PLAYERS) {
      showToast('Room is full');
      return;
    }
    
    const alreadyInRoom = (data.players || []).some(p => p.id === me.uid);
    if (!alreadyInRoom) {
      me.color = chooseUniqueColor(data.players || []);
      ui.colorPick.value = me.color;
      
      localStorage.setItem('sl_name', me.name);
      localStorage.setItem('sl_color', me.color);
      
      const newPlayers = [...(data.players || []), playerObject()];
      await roomRef.update({ players: newPlayers });
    }
    
    onEnterRoom(code);
    showToast('Joined room successfully');
  } catch (err) {
    console.error('Join room error:', err);
    showToast('Join failed: ' + (err?.message || 'Unknown error'));
  }
}

export async function leaveRoom() {
  try {
    if (!roomRef) {
      location.reload();
      return;
    }
    
    await window.db.runTransaction(async tx => {
      const snap = await tx.get(roomRef);
      if (!snap.exists) return;
      
      const state = snap.data();
      const players = (state.players || []).filter(p => p.id !== me.uid);
      tx.update(roomRef, { players });
    });
  } catch (e) {
    console.error('Leave room error:', e);
  }
  
  location.href = location.origin + location.pathname + '#';
  location.reload();
}

export async function onResetRoom() {
  try {
    const snap = await roomRef.get();
    const state = snap.data();
    
    if (state.hostId !== me.uid) {
      showToast('Only host can reset');
      return;
    }
    
    await roomRef.set(defaultRoomState(state.hostId));
    showToast('Room reset');
  } catch (e) {
    console.error('Reset room error:', e);
    showToast('Reset failed');
  }
}

export async function onDeleteRoom() {
  try {
    const snap = await roomRef.get();
    const state = snap.data();
    
    if (state.hostId !== me.uid) {
      showToast('Only host can delete');
      return;
    }
    
    await roomRef.delete();
    showToast('Room deleted');
    
    location.href = location.origin + location.pathname + '#';
    location.reload();
  } catch (e) {
    console.error('Delete room error:', e);
    showToast('Delete failed');
  }
}

export function onEnterRoom(code) {
  ui.roomTag.textContent = 'Room: ' + code;
  history.replaceState({}, '', '#' + code);
  
  if (unsubRoom) {
    unsubRoom();
    unsubRoom = null;
  }
  
  unsubRoom = window.db.collection('rooms').doc(code).onSnapshot(snap => {
    if (!snap.exists) return;
    
    const state = snap.data();
    
    // Debug player info
    (state.players || []).forEach(p => {
      p.placements = normalizePlacements(p.placements);
    });
    
    maybeClearAnim(state);
    currentState = state;
    window.currentState = state; // Update global reference
    renderState(state);
    
    // Set up a periodic check to clear stuck animations
    if (state.status === PHASES.PLAYING && state.anim) {
      setTimeout(() => {
        if (window.currentState && window.currentState.anim) {
          maybeClearAnim(window.currentState);
        }
      }, 2000); // Check again in 2 seconds
    }
  }, err => {
    console.error('Realtime error:', err);
    showToast('Connection error: ' + (err?.message || 'Unknown error'));
  });
}

export async function changePhase(phase) {
  try {
    const snap = await roomRef.get();
    const state = snap.data();
    
    if (state.hostId !== me.uid) {
      showToast('Only host can change phase');
      return;
    }
    
    await roomRef.update({ status: phase });
  } catch (err) {
    console.error('Change phase error:', err);
    showToast('Phase change failed');
  }
}

export async function onStartGame() {
  try {
    const snap = await roomRef.get();
    const state = snap.data();
    
    if (state.hostId !== me.uid) {
      showToast('Only host can start');
      return;
    }
    
    const allReady = (state.players || []).length >= 2 && 
      (state.players || []).every(p => {
        const placements = normalizePlacements(p.placements);
        return p.ready && 
               placements.ladders.length === 2 && 
               placements.snakes.length === 2 && 
               placements.box;
      });
      
    if (!allReady) {
      showToast('All players must finish placement and be ready');
      return;
    }
    
    await roomRef.update({
      status: PHASES.PLAYING,
      turnIndex: 0,
      anim: null,
      boxLockedBy: null
    });
    
    showToast('Game started!');
  } catch (err) {
    console.error('Start game error:', err);
    showToast('Start failed: ' + (err?.message || 'Unknown error'));
  }
}
