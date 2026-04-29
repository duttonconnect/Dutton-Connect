/**
 * Firestore Sync Bridge
 *
 * Sits inside both AuthProvider and AppProvider. On login it loads the user's
 * stored app state from Firestore and hydrates the local store. On every store
 * change it debounce-writes back to Firestore (images stripped to stay under
 * the 1 MB document limit).
 */
import { useEffect, useRef } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db, isFirebaseConfigured } from "./firebase";
import { useAuth } from "./auth";
import { useAppStore } from "./store";

// Strip base64 image blobs before writing to Firestore.
function stripImages<T>(items: T[]): T[] {
  return items.map((item) => {
    const copy = { ...item } as Record<string, unknown>;
    if ("imageDataUrl" in copy) copy.imageDataUrl = undefined;
    if ("photoDataUrl" in copy) copy.photoDataUrl = undefined;
    return copy as T;
  });
}

export function FirestoreSyncBridge() {
  const { user } = useAuth();
  const store = useAppStore();
  const loadedRef = useRef<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load from Firestore when user logs in (once per uid).
  useEffect(() => {
    if (!isFirebaseConfigured || !db || !user) return;
    if (loadedRef.current === user.uid) return;
    loadedRef.current = user.uid;

    (async () => {
      try {
        const snap = await getDoc(doc(db!, "users", user.uid, "private", "appState"));
        if (snap.exists()) {
          const data = snap.data();
          if (data?.state) {
            store.loadState(data.state);
          }
        }
      } catch (err) {
        console.warn("[Firestore] Could not load app state:", err);
      }
    })();
  }, [user?.uid]);

  // Save to Firestore (debounced 2 s) whenever store state changes.
  useEffect(() => {
    if (!isFirebaseConfigured || !db || !user) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const stateToSave = {
        customers: store.customers,
        jobs: store.jobs,
        quotes: store.quotes,
        payments: store.payments,
        trips: store.trips,
        receipts: stripImages(store.receipts),
        jobRequests: stripImages(store.jobRequests ?? []),
      };
      setDoc(
        doc(db!, "users", user.uid, "private", "appState"),
        { state: stateToSave, updatedAt: new Date().toISOString() },
        { merge: false },
      ).catch((err) => console.warn("[Firestore] Save failed:", err));
    }, 2000);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [
    user?.uid,
    store.customers,
    store.jobs,
    store.quotes,
    store.payments,
    store.trips,
    store.receipts,
    store.jobRequests,
  ]);

  return null;
}
