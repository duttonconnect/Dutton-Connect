import {
  collection,
  getDocs,
  doc,
  setDoc,
  getDoc,
  query,
  where,
} from "firebase/firestore";
import { db, isFirebaseConfigured } from "./firebase";
import { type FirestoreJobRequest } from "./matching";

export type CRMCustomer = {
  customerId: string;
  email: string;
  displayName: string;
  jobs: FirestoreJobRequest[];
};

export type CustomerNote = {
  proId: string;
  customerId: string;
  notes: string;
  updatedAt: string;
};

/** Load all job requests where acceptedProId === proId and status is accepted/scheduled/completed */
export async function loadCRMCustomers(
  proId: string,
): Promise<{ customerId: string; jobs: FirestoreJobRequest[] }[]> {
  if (!isFirebaseConfigured || !db) return [];
  try {
    const snap = await getDocs(
      query(
        collection(db, "jobRequests"),
        where("acceptedProId", "==", proId),
      ),
    );
    const jobs = snap.docs.map(
      (d) => ({ id: d.id, ...d.data() } as FirestoreJobRequest),
    );
    const byCustomer = new Map<string, FirestoreJobRequest[]>();
    for (const job of jobs) {
      if (!job.customerId) continue;
      const arr = byCustomer.get(job.customerId) ?? [];
      arr.push(job);
      byCustomer.set(job.customerId, arr);
    }
    return Array.from(byCustomer.entries()).map(([customerId, jobList]) => ({
      customerId,
      jobs: jobList.sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    }));
  } catch (err) {
    console.error("[CRM] loadCRMCustomers failed:", err);
    return [];
  }
}

export async function loadCustomerNote(
  proId: string,
  customerId: string,
): Promise<CustomerNote | null> {
  if (!isFirebaseConfigured || !db) return null;
  try {
    const id = `${proId}_${customerId}`;
    const snap = await getDoc(doc(db, "customerNotes", id));
    if (!snap.exists()) return null;
    return snap.data() as CustomerNote;
  } catch {
    return null;
  }
}

export async function saveCustomerNote(
  proId: string,
  customerId: string,
  notes: string,
): Promise<void> {
  if (!isFirebaseConfigured || !db) return;
  try {
    const id = `${proId}_${customerId}`;
    await setDoc(doc(db, "customerNotes", id), {
      proId,
      customerId,
      notes,
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error("[CRM] saveCustomerNote failed:", err);
  }
}

export async function loadProfileForUser(
  uid: string,
): Promise<{ displayName?: string; email?: string; businessName?: string } | null> {
  if (!isFirebaseConfigured || !db) return null;
  try {
    const snap = await getDoc(doc(db, "users", uid));
    if (!snap.exists()) return null;
    const d = snap.data();
    return { displayName: d.displayName, email: d.email, businessName: d.businessName };
  } catch {
    return null;
  }
}
