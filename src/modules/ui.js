// UI wiring and DOM references
import { onCreateRoom, onJoinRoom, onCodeInput, onStartGame, onResetRoom, onDeleteRoom, leaveRoom, changePhase } from './state.js';
import { placementStart, toggleReady, onCanvasMove, onCanvasClick } from './placement.js';
import { onRoll } from './play.js';
import { showToast } from './utils.js';

export let ui = {};

export function wireUI() {
  const $ = s => document.querySelector(s);
  ui = {
    youTag: $('#youTag'),
    roomTag: $('#roomTag'),
    phaseTag: $('#phaseTag'),
    displayName: $('#displayName'),
    colorPick: $('#colorPick'),
    createRoomBtn: $('#createRoomBtn'),
    joinRoomBtn: $('#joinRoomBtn'),
    joinCode: $('#joinCode'),
    authBlock: $('#authBlock'),
    lobbyControls: $('#lobbyControls'),
    placementBlock: $('#placementBlock'),
    playBlock: $('#playBlock'),
    copyLinkBtn: $('#copyLinkBtn'),
    startPlacementBtn: $('#startPlacementBtn'),
    resetRoomBtn: $('#resetRoomBtn'),
    deleteRoomBtn: $('#deleteRoomBtn'),
    placeLadderBtn: $('#placeLadderBtn'),
    placeSnakeBtn: $('#placeSnakeBtn'),
    placeBoxBtn: $('#placeBoxBtn'),
    boxPower: $('#boxPower'),
    readyBtn: $('#readyBtn'),
    startGameBtn: $('#startGameBtn'),
    players: $('#players'),
    myPlacementList: $('#myPlacementList'),
    turnText: $('#turnText'),
    powerBar: $('#powerBar'),
    rollBtn: $('#rollBtn'),
    lastRoll: $('#lastRoll'),
    leaveBtn: $('#leaveBtn'),
    board: $('#board'),
    emojiBar: $('#emojiBar')
  };

  // Room actions
  ui.createRoomBtn.addEventListener('click', onCreateRoom);
  ui.joinRoomBtn.addEventListener('click', onJoinRoom);
  ui.joinCode.addEventListener('input', onCodeInput);
  ui.copyLinkBtn.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(location.href);
      showToast('Invite link copied');
    } catch (err) {
      showToast('Failed to copy link');
    }
  });
  ui.startPlacementBtn.addEventListener('click', () => changePhase('placing'));
  ui.startGameBtn.addEventListener('click', onStartGame);
  ui.resetRoomBtn.addEventListener('click', onResetRoom);
  ui.deleteRoomBtn.addEventListener('click', onDeleteRoom);
  ui.leaveBtn.addEventListener('click', leaveRoom);

  // Placement controls
  ui.placeLadderBtn.addEventListener('click', () => placementStart('ladder'));
  ui.placeSnakeBtn.addEventListener('click', () => placementStart('snake'));
  ui.placeBoxBtn.addEventListener('click', () => placementStart('box'));
  ui.readyBtn.addEventListener('click', toggleReady);

  // Play controls
  ui.rollBtn.addEventListener('click', onRoll);

  // Canvas interactions
  ui.board.addEventListener('mousemove', onCanvasMove);
  ui.board.addEventListener('mouseleave', () => {
    if (window.placeSM) {
      window.placeSM.hoverCell = null;
      window.drawBoard(window.currentState);
    }
  });
  ui.board.addEventListener('click', onCanvasClick);

  // Emoji reactions
  ui.emojiBar.addEventListener('click', (e) => {
    if (e.target.classList.contains('emoji-btn')) {
      const emoji = e.target.getAttribute('data-emoji');
      if (emoji) {
        window.sendEmoji(emoji);
      }
    }
  });

  // Window events
  window.addEventListener('resize', () => {
    if (window.drawBoard && window.currentState) {
      window.drawBoard(window.currentState);
    }
  });

  // Initialize stored values
  const storedName = localStorage.getItem('sl_name');
  if (storedName) ui.displayName.value = storedName;
  
  const storedColor = localStorage.getItem('sl_color');
  if (storedColor) ui.colorPick.value = storedColor;
  
  ui.displayName.addEventListener('change', e => {
    localStorage.setItem('sl_name', (e.target.value || '').trim());
  });
  
  // Check for room code in URL
  const code = (location.hash || '').replace('#', '').toUpperCase();
  if (code) {
    ui.joinCode.value = code;
  }
  
  onCodeInput();
}
