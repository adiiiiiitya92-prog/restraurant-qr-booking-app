import { initializeApp, getApps, getApp } from 'firebase/app';
import { initializeFirestore, getFirestore } from 'firebase/firestore';
import {
  getAuth,
  initializeAuth,
  indexedDBLocalPersistence,
  browserLocalPersistence,
  browserPopupRedirectResolver,
} from 'firebase/auth';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Check if actual credentials have been supplied
export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey &&
  firebaseConfig.apiKey !== 'your_api_key_here' &&
  firebaseConfig.apiKey !== 'demo-api-key' &&
  firebaseConfig.projectId &&
  firebaseConfig.projectId !== 'your_project_id' &&
  firebaseConfig.projectId !== 'demo-project'
);

let app;
let db;
let auth;

if (isFirebaseConfigured) {
  try {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

    // Use experimentalAutoDetectLongPolling to avoid WebChannel stream assertion failure in Vite & React StrictMode
    try {
      db = initializeFirestore(app, {
        experimentalAutoDetectLongPolling: true,
      });
    } catch {
      db = getFirestore(app);
    }

    // Keep staff signed in across refreshes, tab closes and device restarts
    // (IndexedDB, falling back to localStorage). They stay signed in until they
    // press Logout, or an admin blocks them / changes their password.
    try {
      auth = initializeAuth(app, {
        persistence: [indexedDBLocalPersistence, browserLocalPersistence],
        popupRedirectResolver: browserPopupRedirectResolver,
      });
    } catch {
      auth = getAuth(app); // already initialised (hot reload)
    }
    console.info('🔥 Firebase initialized successfully with LongPolling for project:', firebaseConfig.projectId);
  } catch (error) {
    console.error('Error initializing Firebase:', error);
  }
} else {
  console.warn(
    '⚠️ Firebase credentials not configured or in Demo Mode. The app will use reactive local storage.'
  );
}

export { app, db, auth, firebaseConfig };
