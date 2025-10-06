// Firebase initialization
import { firebaseConfig } from './firebase-config.js';

export function initFirebase() {
  // Validate that all required config is present
  const requiredKeys = ['apiKey', 'authDomain', 'projectId', 'storageBucket', 'messagingSenderId', 'appId'];
  const missingKeys = requiredKeys.filter(key => !firebaseConfig[key]);
  
  if (missingKeys.length > 0) {
    throw new Error(`Missing Firebase configuration: ${missingKeys.join(', ')}. Please check your firebase-config.js file.`);
  }

  // Initialize Firebase
  firebase.initializeApp(firebaseConfig);
  
  // Initialize services
  window.auth = firebase.auth();
  window.db = firebase.firestore();
  
  console.log('Firebase initialized successfully');
}
