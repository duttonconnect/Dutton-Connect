import {
  collection,
  addDoc,
  getDocs,
  updateDoc,
  doc,
  orderBy,
  query,
} from "firebase/firestore";
import { db, isFirebaseConfigured } from "./firebase";

export type BugReport = {
  id: string;
  bugTitle: string;
  description: string;
  pageOrFeature: string;
  userRole: string;
  priority: "Low" | "Medium" | "High";
  screenshotFileName?: string;
  reporterId: string;
  status: "open" | "reviewed" | "resolved";
  createdAt: string;
};

export async function saveBugReport(
  data: Omit<BugReport, "id">,
): Promise<string | null> {
  if (!isFirebaseConfigured || !db) return null;
  try {
    const ref = await addDoc(collection(db, "bugReports"), data);
    return ref.id;
  } catch {
    return null;
  }
}

export async function loadBugReports(): Promise<BugReport[]> {
  if (!isFirebaseConfigured || !db) return [];
  try {
    const snap = await getDocs(
      query(collection(db, "bugReports"), orderBy("createdAt", "desc")),
    );
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as BugReport));
  } catch {
    return [];
  }
}

export async function updateBugReportStatus(
  id: string,
  status: BugReport["status"],
): Promise<boolean> {
  if (!isFirebaseConfigured || !db) return false;
  try {
    await updateDoc(doc(db, "bugReports", id), { status });
    return true;
  } catch {
    return false;
  }
}
