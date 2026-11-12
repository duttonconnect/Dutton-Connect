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
import {
  getApps,
  initializeApp,
  type FirebaseApp,
  type FirebaseOptions,
} from "firebase/app";
import { Capacitor } from "@capacitor/core";
import {
  browserLocalPersistence,
  getAuth,
  indexedDBLocalPersistence,
  initializeAuth,
  type Auth,
} from "firebase/auth";
import {
  getFirestore,
  type Firestore,
} from "firebase/firestore";

const firebaseConfig: FirebaseOptions = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY as string | undefined,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string | undefined,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID as string | undefined,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET as string | undefined,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID as string | undefined,
  appId: import.meta.env.VITE_FIREBASE_APP_ID as string | undefined,
};

const missingConfig = Object.entries(firebaseConfig)
  .filter(([, value]) => typeof value !== "string" || value.trim() === "")
  .map(([key]) => key);

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;
let activeFirebaseConfig: FirebaseOptions | null = null;

if (missingConfig.length === 0) {
  try {
    app =
      getApps().find((firebaseApp) => firebaseApp.name === "[DEFAULT]") ??
      initializeApp(firebaseConfig);

    if (Capacitor.isNativePlatform()) {
      try {
        // The browser popup/redirect resolver is not needed for this app's
        // email/password flows and can do unsupported work in WKWebView.
        auth = initializeAuth(app, {
          persistence: [indexedDBLocalPersistence, browserLocalPersistence],
        });
      } catch (nativeAuthError) {
        // HMR can revisit this module after Auth was initialized. Do not fall
        // back to browser popup dependencies for unrelated native errors.
        if (
          typeof nativeAuthError === "object" &&
          nativeAuthError !== null &&
          "code" in nativeAuthError &&
          nativeAuthError.code === "auth/already-initialized"
        ) {
          auth = getAuth(app);
        } else {
          throw nativeAuthError;
        }
      }
    } else {
      auth = getAuth(app);
    }

    db = getFirestore(app);
    activeFirebaseConfig = firebaseConfig;
  } catch (error) {
    console.error(
      "[Dutton Connect] Firebase initialization failed; starting without cloud services.",
      error,
    );
    app = null;
    auth = null;
    db = null;
  }
} else {
  console.error(
    "[Dutton Connect] Firebase client configuration is incomplete. " +
      `Missing fields: ${missingConfig.join(", ")}. ` +
      "The app will start in offline/localStorage mode.",
  );
}

export { app, auth, db };
export const isFirebaseConfigured = Boolean(auth && db);

/**
 * Send the Firebase config to the service worker so it can initialise
 * Firebase Messaging for background push notifications.
 */
export function sendConfigToServiceWorker() {
  if (
    !activeFirebaseConfig ||
    Capacitor.isNativePlatform() ||
    typeof navigator === "undefined" ||
    !("serviceWorker" in navigator)
  ) {
    return;
  }

  navigator.serviceWorker.ready.then((registration) => {
    registration.active?.postMessage({
      type: "FIREBASE_CONFIG",
      config: activeFirebaseConfig,
    });
  }).catch(() => {});
}
