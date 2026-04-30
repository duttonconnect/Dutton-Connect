import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  query,
  where,
} from "firebase/firestore";
import { db, isFirebaseConfigured } from "./firebase";

export const ADDRESS_LABELS = ["Home", "Work", "Rental Property", "Other"] as const;
export type AddressLabel = (typeof ADDRESS_LABELS)[number];

export type SavedAddress = {
  id: string;
  userId: string;
  label: AddressLabel;
  address: string;
  city: string;
  state: string;
  zip: string;
  notes: string;
  createdAt: string;
};

export function formatSavedAddress(a: SavedAddress): string {
  return [a.address, a.city, a.state, a.zip].filter(Boolean).join(", ");
}

export async function loadSavedAddresses(userId: string): Promise<SavedAddress[]> {
  if (!isFirebaseConfigured || !db) return [];
  try {
    const snap = await getDocs(
      query(collection(db, "savedAddresses"), where("userId", "==", userId)),
    );
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as SavedAddress));
  } catch (err) {
    console.error("[SavedAddresses] load failed:", err);
    return [];
  }
}

export async function saveAddress(
  data: Omit<SavedAddress, "id" | "createdAt">,
): Promise<string | null> {
  if (!isFirebaseConfigured || !db) return null;
  try {
    const ref = await addDoc(collection(db, "savedAddresses"), {
      ...data,
      createdAt: new Date().toISOString(),
    });
    return ref.id;
  } catch (err) {
    console.error("[SavedAddresses] save failed:", err);
    return null;
  }
}

export async function deleteSavedAddress(id: string): Promise<void> {
  if (!isFirebaseConfigured || !db) return;
  try {
    await deleteDoc(doc(db, "savedAddresses", id));
  } catch (err) {
    console.error("[SavedAddresses] delete failed:", err);
  }
}
