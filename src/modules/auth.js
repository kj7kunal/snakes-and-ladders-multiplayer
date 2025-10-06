// Auth logic
export async function ensureAuth() {
  if(window.auth?.currentUser) {
    window.me = window.me || {};
    window.me.uid = window.auth.currentUser.uid;
    return;
  }
  await window.auth.signInAnonymously();
  window.me = window.me || {};
  window.me.uid = window.auth.currentUser ? window.auth.currentUser.uid : null;
  if(window.ui && window.ui.youTag) window.ui.youTag.textContent = 'You: ' + (window.me.name || '(set name)');
}
