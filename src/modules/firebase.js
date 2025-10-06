// Firebase initialization
export function initFirebase() {
  // Firebase config from environment variables (for security)
  // IMPORTANT: Set these in your deployment environment or .env file
  const firebaseConfig = {
    apiKey: import.meta.env?.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env?.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env?.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env?.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env?.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env?.VITE_FIREBASE_APP_ID
  };

  // Validate that all required config is present
  const requiredKeys = ['apiKey', 'authDomain', 'projectId', 'storageBucket', 'messagingSenderId', 'appId'];
  const missingKeys = requiredKeys.filter(key => !firebaseConfig[key]);
  
  if (missingKeys.length > 0) {
    throw new Error(`Missing Firebase configuration: ${missingKeys.join(', ')}. Please check your environment variables.`);
  }

  // Initialize Firebase
  firebase.initializeApp(firebaseConfig);
  
  // Initialize services
  window.auth = firebase.auth();
  window.db = firebase.firestore();
  
  console.log('Firebase initialized successfully');
}
