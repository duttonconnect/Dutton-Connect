import { deleteField, doc, getDoc, setDoc } from "firebase/firestore";
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
    // Use deleteField() for optional fields so clearing a value actually removes
    // it from Firestore. Never pass JavaScript `undefined` — the SDK rejects it.
    await setDoc(
      doc(db, "customerProfiles", uid),
      {
        uid,
        displayName: data.displayName,
        phone: data.phone ?? deleteField(),
        location: data.location ?? deleteField(),
        bio: data.bio ?? deleteField(),
        profilePhoto: data.profilePhoto ?? deleteField(),
        updatedAt: new Date().toISOString(),
      },
      { merge: true },
    );
    return true;
  } catch (err) {
    console.error("[CustomerProfile] save failed:", err);
    return false;
  }
}
