/**
 * Admin service — only callable by users whose Firestore `users/{uid}` doc
 * has `isAdmin: true`.  The page layer enforces this; add matching Firestore
 * security rules in production:
 *
 *   match /users/{uid} {
 *     allow read: if request.auth != null
 *       && (request.auth.uid == uid
 *           || get(/databases/$(database)/documents/users/$(request.auth.uid)).data.isAdmin == true);
 *     allow write: if request.auth != null
 *       && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.isAdmin == true;
 *   }
 */
import { collection, getDocs, doc, updateDoc } from "firebase/firestore";
import { db, isFirebaseConfigured } from "./firebase";

export type AdminUser = {
  id: string;
  email: string;
  displayName: string;
  role: string;
  isAdmin: boolean;
  createdAt: string;
};

/** Fetch all documents from the `users` collection. */
export async function loadAllUsers(): Promise<AdminUser[]> {
  if (!isFirebaseConfigured || !db) return [];
  try {
    const snap = await getDocs(collection(db, "users"));
    return snap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        email: data.email ?? "",
        displayName: data.displayName ?? "",
        role: data.role ?? "unknown",
        isAdmin: Boolean(data.isAdmin),
        createdAt: data.createdAt ?? "",
      };
    });
  } catch (err) {
    console.error("[Admin] loadAllUsers failed:", err);
    return [];
  }
}

/** Toggle `isAdmin` flag on a user document. */
export async function setUserAdmin(uid: string, value: boolean): Promise<void> {
  if (!isFirebaseConfigured || !db) return;
  try {
    await updateDoc(doc(db, "users", uid), { isAdmin: value });
  } catch (err) {
    console.error("[Admin] setUserAdmin failed:", err);
    throw err;
  }
}

/** Change a user's role field. */
export async function setUserRole(
  uid: string,
  role: "pro" | "customer",
): Promise<void> {
  if (!isFirebaseConfigured || !db) return;
  try {
    await updateDoc(doc(db, "users", uid), { role });
  } catch (err) {
    console.error("[Admin] setUserRole failed:", err);
    throw err;
  }
}
