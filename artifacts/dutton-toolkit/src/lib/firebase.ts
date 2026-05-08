/**
 * Firebase client configuration.
 *
 * Firestore Security Rules
 * ─────────────────────────
 * The rules for this project live in `firestore.rules` (project root).
 * Key rule for the `routes` collection:
 *
 *   match /routes/{routeId} {
 *     // Read / delete: caller must own the existing document.
 *     allow read, delete: if request.auth != null
 *                         && request.auth.uid == resource.data.userId;
 *
 *     // Create: caller must set userId to their own UID (prevents spoofing).
 *     allow create: if request.auth != null
 *                   && request.auth.uid == request.resource.data.userId;
 *
 *     // Update: caller must own the doc AND must not transfer ownership.
 *     allow update: if request.auth != null
 *                   && request.auth.uid == resource.data.userId
 *                   && request.auth.uid == request.resource.data.userId;
 *   }
 *
 *   // Per-user app-state (firestore-sync.tsx)
 *   match /users/{userId}/private/appState {
 *     allow read, write: if request.auth != null
 *                        && request.auth.uid == userId;
 *   }
 *
 * Deploy rules with: firebase deploy --only firestore:rules
 */
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

/**
 * Send the Firebase config to the service worker so it can initialise
 * Firebase Messaging for background push notifications.
 */
export function sendConfigToServiceWorker() {
  if (!API_KEY || !("serviceWorker" in navigator)) return;
  navigator.serviceWorker.ready.then((registration) => {
    registration.active?.postMessage({
      type: "FIREBASE_CONFIG",
      config: {
        apiKey: API_KEY,
        authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string,
        projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID as string,
        storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET as string,
        messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID as string,
        appId: import.meta.env.VITE_FIREBASE_APP_ID as string,
      },
    });
  }).catch(() => {});
}
