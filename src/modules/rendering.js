// Rendering functions for board and UI
import { PHASES, STEP_MS } from './constants.js';
import { posToRowCol, rowColToCanvas, pathBetween, clamp, showFloatingComment } from './utils.js';
import { aggregatePlacements, normalizePlacements } from './models.js';
import { ui } from './ui.js';
import { getRoomRef } from './state.js';

export function maybeClearAnim(state) {
  const anim = state?.anim;
  if (!anim || !Array.isArray(anim.path) || !anim.start) return;
  
  const doneMs = anim.path.length * STEP_MS + 100; // Reduced buffer time
  const elapsed = Date.now() - anim.start;
  
  // Be more aggressive about clearing animations - clear if over 5 seconds old regardless
  if (elapsed > doneMs || elapsed > 5000) {
    const roomRef = getRoomRef();
    if (roomRef) {
      roomRef.update({ anim: null }).catch(() => {});
    }
  }
}

export function drawBoard(state) {
  const canvas = ui.board;
  if (!canvas) return;
  
  const ctx = canvas.getContext('2d');
  const W = canvas.width;
  ctx.clearRect(0, 0, W, W);
  
  const cell = W / 10;
  
  // Draw grid
  for (let r = 0; r < 10; r++) {
    for (let c = 0; c < 10; c++) {
      const x = c * cell;
      const y = r * cell;
      
      // Alternating colors
      ctx.fillStyle = ((r + c) % 2 === 0) ? '#0f1738' : '#121d45';
      ctx.fillRect(x, y, cell, cell);
      
      // Position numbers
      const pos = 100 - (r * 10 + (r % 2 === 0 ? c : (9 - c)));
      ctx.fillStyle = '#aab3d0';
      ctx.font = '12px Inter, sans-serif';
      ctx.fillText(String(pos), x + 6, y + 14);
    }
  }
  
  if (!state) return;
  
  const mePlayer = (state.players || []).find(p => p.id === window.me?.uid);
  
  // Determine which placements to show
  let ladders = [], snakes = [], boxes = [];
  if (state.status === PHASES.PLACING) {
    if (mePlayer?.placements) {
      ladders = [...mePlayer.placements.ladders];
      snakes = [...mePlayer.placements.snakes];
      if (mePlayer.placements.box) {
        boxes = [mePlayer.placements.box.cell];
      }
    }
  } else {
    const aggregated = aggregatePlacements(state);
    ladders = aggregated.ladders;
    snakes = aggregated.snakes;
    boxes = aggregated.boxes;
  }
  
  // Draw ladders and snakes
  ladders.forEach(ladder => pathBetween(ctx, ladder.from, ladder.to, W, '#27d1ff'));
  snakes.forEach(snake => pathBetween(ctx, snake.from, snake.to, W, '#ff5d76'));
  
  // Draw mystery boxes as squares
  boxes.forEach(boxPos => {
    const rc = posToRowCol(boxPos);
    const rect = rowColToCanvas(rc.r, rc.c, W);
    ctx.fillStyle = '#ffd54a';
    ctx.fillRect(
      rect.x + rect.w * 0.25, 
      rect.y + rect.h * 0.25, 
      rect.w * 0.5, 
      rect.h * 0.5
    );
  });
  
  // Draw placement preview
  if (window.placeSM?.mode && state.status === PHASES.PLACING) {
    const color = window.placeSM.mode === 'ladder' ? '#27d1ff' : 
                  window.placeSM.mode === 'snake' ? '#ff5d76' : '#ffd54a';
    
    if (window.placeSM.mode === 'box' && window.placeSM.step === 1 && window.placeSM.hoverCell) {
      const rc = posToRowCol(window.placeSM.hoverCell);
      const rect = rowColToCanvas(rc.r, rc.c, W);
      ctx.fillStyle = color + '80'; // Semi-transparent
      ctx.fillRect(rect.x + rect.w * 0.25, rect.y + rect.h * 0.25, rect.w * 0.5, rect.h * 0.5);
      ctx.strokeStyle = color;
      ctx.lineWidth = W * 0.01;
      ctx.strokeRect(rect.x + rect.w * 0.25, rect.y + rect.h * 0.25, rect.w * 0.5, rect.h * 0.5);
    }
    
    if ((window.placeSM.mode === 'ladder' || window.placeSM.mode === 'snake') && window.placeSM.step >= 1) {
      const from = window.placeSM.startCell ?? window.placeSM.hoverCell;
      const to = window.placeSM.hoverCell;
      if (from && to) {
        pathBetween(ctx, from, to, W, color);
      }
    }
  }
  
  // Draw player tokens with animation
  const anim = state.anim || window.localAnim;
  (state.players || []).forEach((player, i) => {
    let pos = clamp(player.pos || 1, 1, 100);
    
    if (anim && anim.actorId === player.id) {
      const elapsed = Date.now() - anim.start;
      const step = Math.min(anim.path.length - 1, Math.floor(elapsed / STEP_MS));
      pos = anim.path[step];
      
      if (step >= anim.path.length - 1) {
        window.localAnim = null;
      }
    }
    
    const rc = posToRowCol(pos);
    const rect = rowColToCanvas(rc.r, rc.c, W);
    const radius = rect.w * 0.18;
    const spread = radius * 1.6;
    const row = Math.floor(i / 3);
    const col = i % 3;
    const cx = rect.x + rect.w / 2 + (col - 1) * spread;
    const cy = rect.y + rect.h / 2 + (row - 0.5) * spread;
    
    ctx.fillStyle = player.color || '#fff';
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.strokeStyle = '#0008';
    ctx.lineWidth = 2;
    ctx.stroke();
  });
  
  // Continue animation if needed
  if (anim) {
    requestAnimationFrame(() => drawBoard(state));
  }
}

export function renderState(state) {
  // Check for new reactions and show floating comments to all players
  if (state.lastReaction && state.lastReaction.timestamp) {
    if (!window.lastShownReaction || window.lastShownReaction !== state.lastReaction.timestamp) {
      window.lastShownReaction = state.lastReaction.timestamp;
      
      if (state.lastReaction.text) {
        // Power usage message
        showFloatingComment(state.lastReaction.text);
      } else {
        // Emoji reaction
        showFloatingComment(`${state.lastReaction.playerName} ${state.lastReaction.emoji}`);
      }
    }
  }
  
  ui.phaseTag.textContent = 'Phase: ' + state.status;
  ui.youTag.textContent = 'You: ' + (window.me?.name || '(set name)');
  
  const iAmInRoom = (state.players || []).some(p => p.id === window.me?.uid);
  
  // Show/hide UI sections based on phase and membership
  ui.authBlock.style.display = (!iAmInRoom && state.status === PHASES.LOBBY) ? 'block' : 'none';
  ui.lobbyControls.style.display = (state.status === PHASES.LOBBY && iAmInRoom) ? 'block' : 'none';
  ui.placementBlock.style.display = (state.status === PHASES.PLACING && iAmInRoom) ? 'block' : 'none';
  ui.playBlock.style.display = ((state.status === PHASES.PLAYING || state.status === PHASES.FINISHED) && iAmInRoom) ? 'block' : 'none';
  
  // Render players list
  renderPlayersList(state);
  
  // Lobby controls
  ui.startPlacementBtn.disabled = (state.hostId !== window.me?.uid) || 
                                  (state.players || []).length < 2 || 
                                  state.status !== PHASES.LOBBY;
  
  // Placement controls
  const mePlayer = (state.players || []).find(p => p.id === window.me?.uid);
  renderMyPlacementList(mePlayer);
  
  if (state.status === PHASES.PLACING) {
    const allReady = (state.players || []).length >= 2 && 
      (state.players || []).every(p => {
        const placements = normalizePlacements(p.placements);
        return p.ready && 
               placements.ladders.length === 2 && 
               placements.snakes.length === 2 && 
               placements.box;
      });
    
    ui.startGameBtn.style.display = (state.hostId === window.me?.uid) ? 'inline-block' : 'none';
    ui.startGameBtn.disabled = !allReady;
  } else {
    ui.startGameBtn.style.display = 'none';
  }
  
  // Play controls
  if (state.status === PHASES.PLAYING) {
    const currentPlayer = state.players[state.turnIndex % state.players.length];
    
    ui.turnText.textContent = currentPlayer ? currentPlayer.name : '—';
    
    const isMyTurn = currentPlayer && (currentPlayer.id === window.me?.uid);
    const isAnimating = !!state.anim;
    const isFinished = state.status === PHASES.FINISHED;
    
    // Check for stuck animations - if animation is older than 10 seconds, ignore it
    let animationStuck = false;
    if (isAnimating && state.anim && state.anim.start) {
      const animAge = Date.now() - state.anim.start;
      animationStuck = animAge > 10000; // 10 seconds
    }
    
    ui.rollBtn.disabled = !isMyTurn || isFinished || (isAnimating && !animationStuck);
    
    ui.lastRoll.textContent = state.lastRoll ? `🎲 ${state.lastRoll}` : '—';
    renderUsePowerBar(mePlayer, state);
  }
  
  if (state.status === PHASES.FINISHED) {
    ui.rollBtn.disabled = true;
    const winner = (state.players || []).find(p => p.pos === 100);
    ui.turnText.textContent = winner ? `${winner.name} (Won!)` : 'Game Over';
  }
  
  drawBoard(state);
}

function renderPlayersList(state) {
  ui.players.innerHTML = '';
  
  (state.players || []).forEach(player => {
    const div = document.createElement('div');
    div.className = 'player';
    
    let status = '';
    if (state.status === PHASES.LOBBY) {
      status = 'Joined';
    } else if (state.status === PHASES.PLACING) {
      status = player.ready ? 'Ready ✅' : 'Placing…';
    } else if (state.status === PHASES.PLAYING || state.status === PHASES.FINISHED) {
      status = 'Pos ' + player.pos;
    }
    
    div.innerHTML = `
      <span class="item">
        <span class="dot" style="background:${player.color}"></span>
        <strong>${player.name}</strong>
      </span>
      <span class="tag">${status}</span>
    `;
    
    ui.players.appendChild(div);
  });
}

function renderMyPlacementList(mePlayer) {
  ui.myPlacementList.innerHTML = '';
  if (!mePlayer) return;
  
  const placements = normalizePlacements(mePlayer.placements);
  
  placements.ladders.forEach(ladder => {
    const li = document.createElement('li');
    li.className = 'item';
    li.innerHTML = `
      <span class="pill">🪜 ${ladder.from}→${ladder.to}</span> 
      <button class="ghost">Delete</button>
    `;
    li.querySelector('button').addEventListener('click', () => window.deletePlacement('ladder', ladder.id));
    ui.myPlacementList.appendChild(li);
  });
  
  placements.snakes.forEach(snake => {
    const li = document.createElement('li');
    li.className = 'item';
    li.innerHTML = `
      <span class="pill">🐍 ${snake.from}→${snake.to}</span> 
      <button class="ghost">Delete</button>
    `;
    li.querySelector('button').addEventListener('click', () => window.deletePlacement('snake', snake.id));
    ui.myPlacementList.appendChild(li);
  });
  
  if (placements.box) {
    const li = document.createElement('li');
    li.className = 'item';
    li.innerHTML = `
      <span class="pill">🎁 ${placements.box.cell} (${placements.box.power})</span> 
      <button class="ghost">Delete</button>
    `;
    li.querySelector('button').addEventListener('click', () => window.deletePlacement('box'));
    ui.myPlacementList.appendChild(li);
  }
}

function renderUsePowerBar(mePlayer, state) {
  ui.powerBar.innerHTML = '';
  
  if (!mePlayer || state.status !== PHASES.PLAYING) return;
  
  const isMyTurn = (state.players[state.turnIndex % state.players.length]?.id === window.me?.uid);
  const canUse = isMyTurn && !!mePlayer.heldPower;
  
  if (mePlayer.heldPower) {
    const button = document.createElement('button');
    button.className = 'power';
    button.textContent = `Use ${mePlayer.heldPower}`;
    button.disabled = !canUse;
    button.addEventListener('click', () => window.useHeldPower(mePlayer.heldPower));
    ui.powerBar.appendChild(button);
  }
  
  if (!mePlayer.heldPower && state.boxLockedBy) {
    const note = document.createElement('span');
    note.className = 'tag';
    note.textContent = 'Mystery boxes paused until power is used';
    ui.powerBar.appendChild(note);
  }
}

// Make drawBoard available globally for backward compatibility
window.drawBoard = drawBoard;
