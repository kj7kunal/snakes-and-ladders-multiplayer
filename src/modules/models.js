// Data models and helpers
import { PHASES, COLOR_PALETTE } from './constants.js';
import { randomName, generateId } from './utils.js';
import { ui } from './ui.js';

export function defaultRoomState(hostId) {
  return {
    status: PHASES.LOBBY,
    hostId,
    turnIndex: 0,
    createdAt: window.firebase.firestore.FieldValue.serverTimestamp(),
    players: [],
    lastRoll: null,
    lastActor: null,
    anim: null,
    boxLockedBy: null
  };
}

export function playerObject() {
  return {
    id: window.me.uid,
    name: window.me.name || randomName(),
    color: window.me.color || '#ff6b6b',
    pos: 1,
    ready: false,
    placements: {
      ladders: [],
      snakes: [],
      box: null
    },
    heldPower: null,
    powers: [],
    shield: false,
    tempBoost: false,
    tempReroll: false,
    tempMiniLeap: false
  };
}

export function normalizePlacements(placements) {
  const normalized = {
    ladders: [],
    snakes: [],
    box: null
  };
  
  if (!placements) return normalized;
  
  // Normalize ladders
  (placements.ladders || []).forEach(ladder => {
    if (Array.isArray(ladder)) {
      normalized.ladders.push({
        from: ladder[0],
        to: ladder[1],
        id: generateId()
      });
    } else {
      normalized.ladders.push({ ...ladder });
    }
  });
  
  // Normalize snakes
  (placements.snakes || []).forEach(snake => {
    if (Array.isArray(snake)) {
      normalized.snakes.push({
        from: snake[0],
        to: snake[1],
        id: generateId()
      });
    } else {
      normalized.snakes.push({ ...snake });
    }
  });
  
  // Normalize box
  if (placements.box) {
    if (typeof placements.box === 'object') {
      normalized.box = placements.box;
    } else {
      normalized.box = {
        cell: placements.box,
        power: placements.boxPower || 'BOOST'
      };
    }
  }
  
  return normalized;
}

export function chooseUniqueColor(players) {
  const used = new Set((players || []).map(p => (p.color || '').toLowerCase()));
  const preferred = (ui?.colorPick?.value || '#ff6b6b').toLowerCase();
  
  if (!used.has(preferred)) return preferred;
  
  for (const color of COLOR_PALETTE) {
    if (!used.has(color.toLowerCase())) return color;
  }
  
  return COLOR_PALETTE[Math.floor(Math.random() * COLOR_PALETTE.length)];
}

export function aggregatePlacements(state) {
  const ladders = [];
  const snakes = [];
  const boxes = [];
  
  (state.players || []).forEach(player => {
    const placements = normalizePlacements(player.placements);
    
    placements.ladders.forEach(ladder => ladders.push(ladder));
    placements.snakes.forEach(snake => snakes.push(snake));
    
    if (placements.box) {
      boxes.push(placements.box.cell);
    }
  });
  
  return { ladders, snakes, boxes };
}
