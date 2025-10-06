// Firebase configuration
// For production: Replace these with your actual Firebase config values
// For development: Copy this to firebase-config.local.js and gitignore it

export const firebaseConfig = {
  apiKey: "your_api_key_here",
  authDomain: "your_project.firebaseapp.com",
  projectId: "your_project_id",
  storageBucket: "your_project.firebasestorage.app",
  messagingSenderId: "your_sender_id",
  appId: "your_app_id"
};

// Note: These values are safe to expose in client-side code for Firebase
// They are not secret keys - Firebase security is handled by Firestore rules
