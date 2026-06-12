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

export type SaveResult =
  | { ok: true }
  | { ok: false; error: string };

export async function loadCustomerProfile(
  uid: string,
): Promise<CustomerProfile | null> {
  if (!isFirebaseConfigured || !db) return null;
  try {
    const snap = await getDoc(doc(db, "customerProfiles", uid));
    if (!snap.exists()) return null;
    return { uid: snap.id, ...snap.data() } as CustomerProfile;
  } catch (err) {
    const code = (err as { code?: string })?.code ?? "unknown";
    console.error(`[CustomerProfile] load failed (code=${code}):`, err);
    return null;
  }
}

export async function saveCustomerProfile(
  uid: string,
  data: Omit<CustomerProfile, "uid" | "updatedAt">,
): Promise<SaveResult> {
  if (!isFirebaseConfigured || !db) {
    return { ok: false, error: "Firebase is not configured on this device." };
  }
  try {
    console.log("[CustomerProfile] Writing customerProfiles/%s...", uid);
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
    console.log("[CustomerProfile] customerProfiles write OK");
    return { ok: true };
  } catch (err) {
    const code = (err as { code?: string })?.code ?? "unknown";
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[CustomerProfile] save failed (code=${code}):`, err);
    return { ok: false, error: `${code}: ${message}` };
  }
}
