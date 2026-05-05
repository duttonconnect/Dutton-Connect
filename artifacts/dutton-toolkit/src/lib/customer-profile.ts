import { doc, getDoc, setDoc } from "firebase/firestore";
import { db, isFirebaseConfigured } from "./firebase";

export type CustomerProfile = {
  uid: string;
  displayName: string;
  phone?: string;
  location?: string;
  bio?: string;
  profilePhoto?: string;
  updatedAt: string;
};

export async function loadCustomerProfile(
  uid: string,
): Promise<CustomerProfile | null> {
  if (!isFirebaseConfigured || !db) return null;
  try {
    const snap = await getDoc(doc(db, "customerProfiles", uid));
    if (!snap.exists()) return null;
    return { uid: snap.id, ...snap.data() } as CustomerProfile;
  } catch {
    return null;
  }
}

export async function saveCustomerProfile(
  uid: string,
  data: Omit<CustomerProfile, "uid" | "updatedAt">,
): Promise<boolean> {
  if (!isFirebaseConfigured || !db) return false;
  try {
    await setDoc(
      doc(db, "customerProfiles", uid),
      { uid, ...data, updatedAt: new Date().toISOString() },
      { merge: true },
    );
    return true;
  } catch {
    return false;
  }
}
