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

export type SavedPro = {
  id: string;
  customerId: string;
  proId: string;
  businessName: string;
  services: string[];
  createdAt: string;
};

export async function loadSavedPros(customerId: string): Promise<SavedPro[]> {
  if (!isFirebaseConfigured || !db) return [];
  try {
    const snap = await getDocs(
      query(collection(db, "savedPros"), where("customerId", "==", customerId)),
    );
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as SavedPro));
  } catch (err) {
    console.error("[SavedPros] load failed:", err);
    return [];
  }
}

export async function savePro(
  data: Omit<SavedPro, "id" | "createdAt">,
): Promise<string | null> {
  if (!isFirebaseConfigured || !db) return null;
  try {
    const ref = await addDoc(collection(db, "savedPros"), {
      ...data,
      createdAt: new Date().toISOString(),
    });
    return ref.id;
  } catch (err) {
    console.error("[SavedPros] save failed:", err);
    return null;
  }
}

export async function unsavePro(savedId: string): Promise<void> {
  if (!isFirebaseConfigured || !db) return;
  try {
    await deleteDoc(doc(db, "savedPros", savedId));
  } catch (err) {
    console.error("[SavedPros] unsave failed:", err);
  }
}

export async function isProSaved(
  customerId: string,
  proId: string,
): Promise<string | null> {
  if (!isFirebaseConfigured || !db) return null;
  try {
    const snap = await getDocs(
      query(
        collection(db, "savedPros"),
        where("customerId", "==", customerId),
        where("proId", "==", proId),
      ),
    );
    if (snap.empty) return null;
    return snap.docs[0].id;
  } catch {
    return null;
  }
}
