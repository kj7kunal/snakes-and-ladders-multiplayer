// Play phase logic
import { PHASES, POWERS, STEP_MS } from './constants.js';
import { showToast, showFloatingComment, clamp } from './utils.js';
import { aggregatePlacements } from './models.js';
import { getRoomRef } from './state.js';

export async function onRoll() {
  try {
    const roomRef = getRoomRef();
    if (!roomRef) {
      showToast('Not connected to room');
      return;
    }
    
    let rollResult = 0; // Declare outside transaction
    
    await window.db.runTransaction(async tx => {
      const snap = await tx.get(roomRef);
      if (!snap.exists) {
        throw new Error('Room not found');
      }
      
      const state = snap.data();
      
      if (state.status !== PHASES.PLAYING) {
        throw new Error('Game not started');
      }
      
      const players = [...(state.players || [])];
      if (players.length < 2) {
        throw new Error('Need 2+ players');
      }
      
      const turnIndex = ((state.turnIndex || 0) % players.length + players.length) % players.length;
      const currentPlayer = { ...players[turnIndex] };
      
      if (currentPlayer.id !== window.me?.uid) {
        throw new Error(`Not your turn - it's ${currentPlayer.name}'s turn`);
      }
      
      if (state.anim) {
        throw new Error('Animation in progress');
      }
      
      // Roll dice
      let roll = 1 + Math.floor(Math.random() * 6);
      rollResult = roll; // Store for later use
      
      // Apply power effects
      if (currentPlayer.tempReroll) {
        const roll2 = 1 + Math.floor(Math.random() * 6);
        roll = Math.max(roll, roll2);
      }
      
      if (currentPlayer.tempBoost) {
        roll = Math.min(6, roll + 2);
      }
      
      if (currentPlayer.tempMiniLeap) {
        currentPlayer.pos = clamp((currentPlayer.pos || 1) + 6, 1, 100);
      }
      
      // Reset temporary effects
      currentPlayer.tempReroll = false;
      currentPlayer.tempBoost = false;
      currentPlayer.tempMiniLeap = false;
      
      // Calculate movement path
      const path = computeMovePath(state, currentPlayer, roll);
      const finalPos = path[path.length - 1];
      currentPlayer.pos = finalPos;
      
      // Check for mystery box pickup
      const landedOwner = (state.players || []).find(p => 
        p.placements && 
        p.placements.box && 
        p.placements.box.cell === currentPlayer.pos
      );
      
      if (landedOwner && (!state.boxLockedBy || state.boxLockedBy === window.me?.uid)) {
        const powerToGain = landedOwner.placements.box.power || 
                           POWERS[Math.floor(Math.random() * POWERS.length)];
        
        if (!currentPlayer.heldPower) {
          currentPlayer.heldPower = powerToGain;
          state.boxLockedBy = window.me?.uid;
        }
      }
      
      // Check win condition
      let newStatus = state.status;
      let newTurnIndex = turnIndex; // Start from current turn index
      
      if (currentPlayer.pos === 100) {
        newStatus = PHASES.FINISHED;
      } else {
        newTurnIndex = (turnIndex + 1) % players.length; // Advance from current turn
      }
      
      // Validate the new turn index
      if (newTurnIndex < 0 || newTurnIndex >= players.length) {
        newTurnIndex = 0;
      }
      
      players[turnIndex] = currentPlayer;
      
      const updateData = {
        players,
        status: newStatus,
        turnIndex: Math.max(0, newTurnIndex % players.length), // Ensure valid index
        lastRoll: roll,
        lastActor: currentPlayer.id,
        anim: {
          actorId: currentPlayer.id,
          path,
          start: Date.now()
        }
      };
      
      if (state.boxLockedBy !== undefined) {
        updateData.boxLockedBy = state.boxLockedBy;
      }
      
      tx.update(roomRef, updateData);
    });
    
    // Start local animation immediately for smoother experience
    const roomRef2 = getRoomRef();
    if (roomRef2) {
      const snap = await roomRef2.get();
      const data = snap.data();
      if (data && data.anim) {
        window.localAnim = data.anim;
        
        // Auto-clear animation after it completes - but be more aggressive about clearing
        if (Array.isArray(data.anim.path)) {
          const animMs = data.anim.path.length * STEP_MS + 100; // Reduced buffer time
          setTimeout(() => {
            roomRef2.update({ anim: null }).catch(() => {});
          }, animMs);
          
          // Also set a backup timeout to force clear if needed
          setTimeout(() => {
            roomRef2.update({ anim: null }).catch(() => {});
          }, animMs + 1000);
        }
      }
    }
    
    showFloatingComment(`Rolled ${rollResult}!`);
  } catch (e) {
    console.error('Roll error:', e);
    showToast(e.message || 'Roll failed');
  }
}

function computeMovePath(state, player, roll) {
  const start = player.pos || 1;
  const path = [start];
  
  // Basic movement
  let target = start + roll;
  
  if (target > 100) {
    target = start; // Exact 100 required - ignore move if overshoot
    // Show floating comment for exact 100 requirement
    setTimeout(() => {
      showFloatingComment(`${player.name} needs exactly ${100 - start} to win!`);
    }, 500);
  }
  
  // Build path step by step
  while (path[path.length - 1] !== target) {
    path.push(path[path.length - 1] + 1);
  }
  
  // Resolve ladders and snakes at final position
  const allPlacements = aggregatePlacements(state);
  const finalPos = path[path.length - 1];
  
  // Check for ladder
  const ladder = (allPlacements.ladders || []).find(l => l.from === finalPos);
  if (ladder) {
    path.push(ladder.to);
  }
  
  // Check for snake (after potential ladder movement)
  const currentPos = path[path.length - 1];
  const snake = (allPlacements.snakes || []).find(s => s.from === currentPos);
  if (snake) {
    if (player.shield) {
      // Shield blocks snake - consume it
      player.shield = false;
    } else {
      path.push(snake.to);
    }
  }
  
  return path;
}

export async function useHeldPower(power) {
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
      
      const playerIndex = state.players.findIndex(p => p.id === window.me?.uid);
      if (playerIndex < 0) return;
      
      const currentPlayer = { ...state.players[playerIndex] };
      
      if (currentPlayer.heldPower !== power) {
        return; // Race condition protection
      }
      
      // Apply power effect and create message
      let powerMessage = '';
      switch (power) {
        case 'BOOST':
          currentPlayer.tempBoost = true;
          powerMessage = `${currentPlayer.name} used BOOST!`;
          break;
        case 'REROLL':
          currentPlayer.tempReroll = true;
          powerMessage = `${currentPlayer.name} used REROLL!`;
          break;
        case 'MINI_LEAP':
          currentPlayer.tempMiniLeap = true;
          powerMessage = `${currentPlayer.name} used MINI_LEAP!`;
          break;
        case 'SHIELD':
          currentPlayer.shield = true;
          powerMessage = `${currentPlayer.name} used SHIELD!`;
          break;
        case 'SWAP_LEADER':
          let leaderIndex = -1;
          let leaderPos = currentPlayer.pos;
          
          // Find the actual leader
          state.players.forEach((p, idx) => {
            if (p.pos > leaderPos) {
              leaderPos = p.pos;
              leaderIndex = idx;
            }
          });
          
          if (leaderIndex !== -1 && leaderIndex !== playerIndex) {
            const tempPos = state.players[leaderIndex].pos;
            state.players[leaderIndex].pos = currentPlayer.pos;
            currentPlayer.pos = tempPos;
            powerMessage = `${currentPlayer.name} swapped with ${state.players[leaderIndex].name}!`;
          } else {
            powerMessage = `${currentPlayer.name} is already the leader!`;
          }
          break;
      }
      
      // Consume power and unlock boxes
      currentPlayer.heldPower = null;
      
      const players = [...state.players];
      players[playerIndex] = currentPlayer;
      
      tx.update(roomRef, {
        players,
        boxLockedBy: null, // Reactivate mystery boxes
        lastReaction: powerMessage ? {
          playerName: currentPlayer.name,
          emoji: '⚡', // Power indicator
          timestamp: Date.now(),
          text: powerMessage
        } : undefined
      });
    });
    
    // No need for local floating comment since it will be shown via state update
  } catch (e) {
    console.error('Use power error:', e);
    showToast('Power use failed');
  }
}

export async function sendEmoji(emoji) {
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
      const player = (state.players || []).find(p => p.id === window.me?.uid);
      
      if (!player) {
        throw new Error('Player not found in room');
      }
      
      // Store the emoji reaction in the database so all players can see it
      tx.update(roomRef, {
        lastReaction: {
          playerName: player.name,
          emoji: emoji,
          timestamp: Date.now()
        }
      });
    });
    
  } catch (e) {
    console.error('Send emoji error:', e);
    showToast('Failed to send reaction');
  }
}

// Make functions globally available for compatibility
window.useHeldPower = useHeldPower;
window.sendEmoji = sendEmoji;
