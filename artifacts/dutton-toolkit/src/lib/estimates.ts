import {
  collection,
  addDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  doc,
  query,
  where,
} from "firebase/firestore";
import { db, isFirebaseConfigured } from "./firebase";

export const ESTIMATE_STATUSES = ["draft", "sent", "accepted", "paid"] as const;
export type EstimateStatus = (typeof ESTIMATE_STATUSES)[number];

export type Estimate = {
  id: string;
  proId: string;
  customerId?: string;
  jobRequestId?: string;
  type: "estimate" | "invoice";
  customerName: string;
  customerEmail?: string;
  serviceDescription: string;
  laborAmount: number;
  materialsAmount: number;
  taxAmount: number;
  discount: number;
  totalAmount: number;
  status: EstimateStatus;
  notes: string;
  dueDate: string;
  createdAt: string;
  updatedAt: string;
};

export function calcTotal(
  labor: number,
  materials: number,
  tax: number,
  discount: number,
): number {
  return Math.max(0, labor + materials + tax - discount);
}

export async function loadEstimates(proId: string): Promise<Estimate[]> {
  if (!isFirebaseConfigured || !db) return [];
  try {
    const snap = await getDocs(
      query(collection(db, "estimates"), where("proId", "==", proId)),
    );
    return snap.docs
      .map((d) => ({ id: d.id, ...d.data() } as Estimate))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  } catch (err) {
    console.error("[Estimates] load failed:", err);
    return [];
  }
}

export async function createEstimate(
  data: Omit<Estimate, "id" | "createdAt" | "updatedAt">,
): Promise<string | null> {
  if (!isFirebaseConfigured || !db) return null;
  try {
    const now = new Date().toISOString();
    const ref = await addDoc(collection(db, "estimates"), {
      ...data,
      createdAt: now,
      updatedAt: now,
    });
    return ref.id;
  } catch (err) {
    console.error("[Estimates] create failed:", err);
    return null;
  }
}

export async function updateEstimate(
  id: string,
  data: Partial<Omit<Estimate, "id" | "createdAt">>,
): Promise<void> {
  if (!isFirebaseConfigured || !db) return;
  try {
    await updateDoc(doc(db, "estimates", id), {
      ...data,
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error("[Estimates] update failed:", err);
  }
}

export async function deleteEstimate(id: string): Promise<void> {
  if (!isFirebaseConfigured || !db) return;
  try {
    await deleteDoc(doc(db, "estimates", id));
  } catch (err) {
    console.error("[Estimates] delete failed:", err);
  }
}
