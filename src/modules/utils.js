// Utility functions
export const $ = s => document.querySelector(s);

export function showToast(message) {
  const toast = $('#toast');
  if (!toast) return;
  toast.textContent = message;
  toast.style.display = 'block';
  setTimeout(() => {
    toast.style.display = 'none';
  }, 1800);
}

export function showFloatingComment(message) {
  // Remove any existing floating comment
  const existing = document.querySelector('.floating-comment');
  if (existing) {
    existing.remove();
  }
  
  // Create new floating comment
  const comment = document.createElement('div');
  comment.className = 'floating-comment';
  comment.textContent = message;
  document.body.appendChild(comment);
  
  // Auto remove after animation
  setTimeout(() => {
    if (comment.parentNode) {
      comment.parentNode.removeChild(comment);
    }
  }, 2000);
}

export function randomName() {
  const adjectives = ['Swift', 'Bold', 'Calm', 'Lucky', 'Neon', 'Cosmic', 'Turbo', 'Zen', 'Witty', 'Merry'];
  const animals = ['Fox', 'Otter', 'Panda', 'Koala', 'Hawk', 'Whale', 'Tiger', 'Yak', 'Raven', 'Moose'];
  return adjectives[Math.floor(Math.random() * adjectives.length)] + ' ' + 
         animals[Math.floor(Math.random() * animals.length)];
}

export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function generateId() {
  return Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4);
}

// Board position utilities
export function posToRowCol(pos) {
  const idx = pos - 1;
  const row = Math.floor(idx / 10);
  let col = idx % 10;
  // Snake pattern - even rows go left to right, odd rows go right to left
  col = (row % 2 === 0 ? col : 9 - col);
  return { r: row, c: col };
}

export function rowColToCanvas(r, c, size) {
  const cell = size / 10;
  return {
    x: c * cell,
    y: (9 - r) * cell,
    w: cell,
    h: cell
  };
}

export function pathBetween(ctx, fromPos, toPos, size, color) {
  const from = rowColToCanvas(posToRowCol(fromPos).r, posToRowCol(fromPos).c, size);
  const to = rowColToCanvas(posToRowCol(toPos).r, posToRowCol(toPos).c, size);
  
  const fromX = from.x + from.w / 2;
  const fromY = from.y + from.h / 2;
  const toX = to.x + to.w / 2;
  const toY = to.y + to.h / 2;
  
  ctx.strokeStyle = color;
  ctx.lineWidth = size * 0.01;
  ctx.beginPath();
  ctx.moveTo(fromX, fromY);
  ctx.lineTo(toX, toY);
  ctx.stroke();
}

// Human-readable placement summary for debugging
export function serializePlacements(placements) {
  if (!placements) return '—';
  
  const ladders = (placements.ladders || [])
    .map(x => `${x.from}→${x.to}`)
    .join(',') || '—';
    
  const snakes = (placements.snakes || [])
    .map(x => `${x.from}→${x.to}`)
    .join(',') || '—';
    
  const box = placements.box ? 
    `${placements.box.cell} (${placements.box.power})` : '—';
    
  return `Ladders:${ladders} | Snakes:${snakes} | Box:${box}`;
}

// Validate room code format
export function validateRoomCode(code) {
  const sanitized = (code || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  return /^[A-Z0-9]{6}$/.test(sanitized) ? sanitized : null;
}
