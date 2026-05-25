import { initializeApp } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getStorage, connectStorageEmulator } from 'firebase/storage';

// Read runtime env variables injected by Vite. Keep secrets out of source control.
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Basic safety: ensure required keys are set in runtime (development will throw if missing)
if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
  // eslint-disable-next-line no-console
  console.warn('[firebase] Missing Firebase configuration in environment variables.');
}

export const firebaseApp = initializeApp(firebaseConfig as any);
export const firebaseAuth = getAuth(firebaseApp);
export const firebaseDb = getFirestore(firebaseApp);
export const firebaseStorage = getStorage(firebaseApp);

// If running with emulators locally, connect the SDKs to them when requested via env
const useEmulator = import.meta.env.VITE_USE_FIREBASE_EMULATOR === 'true'
if (useEmulator) {
  try {
    // Default emulator host/ports from firebase.json
    connectAuthEmulator(firebaseAuth, 'http://localhost:9099', { disableWarnings: true })
  } catch (e) {
    // ignore
  }

  try {
    connectFirestoreEmulator(firebaseDb, 'localhost', 8080)
  } catch (e) {
    // ignore
  }

  try {
    connectStorageEmulator(firebaseStorage, 'localhost', 9199)
  } catch (e) {
    // ignore
  }
}

export default firebaseApp;
