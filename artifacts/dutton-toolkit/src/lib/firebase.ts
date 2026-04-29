import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import {
  getFirestore,
  type Firestore,
} from "firebase/firestore";

const API_KEY = import.meta.env.VITE_FIREBASE_API_KEY as string | undefined;

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;

if (API_KEY) {
  const firebaseConfig = {
    apiKey: API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID as string,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET as string,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID as string,
    appId: import.meta.env.VITE_FIREBASE_APP_ID as string,
  };

  app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
  auth = getAuth(app);
  db = getFirestore(app);
} else {
  console.warn(
    "[Dutton Connect] Firebase is not configured. " +
      "Set VITE_FIREBASE_* environment variables to enable cloud sync and authentication. " +
      "App will run in offline/localStorage mode.",
  );
}

export { app, auth, db };
export const isFirebaseConfigured = Boolean(API_KEY);
