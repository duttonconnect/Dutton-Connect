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
import { type RequestCategory } from "./store";

export type JobTemplate = {
  id: string;
  userId: string;
  templateName: string;
  category: RequestCategory;
  title: string;
  description: string;
  typicalBudget: number;
  notes: string;
  createdAt: string;
};

export async function loadJobTemplates(userId: string): Promise<JobTemplate[]> {
  if (!isFirebaseConfigured || !db) return [];
  try {
    const snap = await getDocs(
      query(collection(db, "jobTemplates"), where("userId", "==", userId)),
    );
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as JobTemplate));
  } catch (err) {
    console.error("[JobTemplates] load failed:", err);
    return [];
  }
}

export async function saveJobTemplate(
  data: Omit<JobTemplate, "id" | "createdAt">,
): Promise<string | null> {
  if (!isFirebaseConfigured || !db) return null;
  try {
    const ref = await addDoc(collection(db, "jobTemplates"), {
      ...data,
      createdAt: new Date().toISOString(),
    });
    return ref.id;
  } catch (err) {
    console.error("[JobTemplates] save failed:", err);
    return null;
  }
}

export async function deleteJobTemplate(id: string): Promise<void> {
  if (!isFirebaseConfigured || !db) return;
  try {
    await deleteDoc(doc(db, "jobTemplates", id));
  } catch (err) {
    console.error("[JobTemplates] delete failed:", err);
  }
}
