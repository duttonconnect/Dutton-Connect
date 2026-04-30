import {
  collection,
  addDoc,
  getDocs,
  updateDoc,
  doc,
  query,
  orderBy,
} from "firebase/firestore";
import { db, isFirebaseConfigured } from "./firebase";

export const ISSUE_TYPES = [
  "Payment Issue",
  "No Show",
  "Poor Work Quality",
  "Harassment",
  "Scam",
  "Other",
] as const;

export type IssueType = (typeof ISSUE_TYPES)[number];

export type Report = {
  id: string;
  reporterId: string;
  issueType: IssueType;
  description: string;
  relatedJobId?: string;
  relatedUserId?: string;
  relatedConversationId?: string;
  status: "open" | "reviewed" | "resolved";
  createdAt: string;
};

export async function submitReport(
  data: Omit<Report, "id" | "status" | "createdAt">,
): Promise<string | null> {
  if (!isFirebaseConfigured || !db) return null;
  try {
    const ref = await addDoc(collection(db, "reports"), {
      ...data,
      status: "open",
      createdAt: new Date().toISOString(),
    });
    return ref.id;
  } catch (err) {
    console.error("[Reports] submit failed:", err);
    return null;
  }
}

export async function loadAllReports(): Promise<Report[]> {
  if (!isFirebaseConfigured || !db) return [];
  try {
    const snap = await getDocs(
      query(collection(db, "reports"), orderBy("createdAt", "desc")),
    );
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Report));
  } catch {
    try {
      const snap2 = await getDocs(collection(db, "reports"));
      return snap2.docs
        .map((d) => ({ id: d.id, ...d.data() } as Report))
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    } catch (err2) {
      console.error("[Reports] load failed:", err2);
      return [];
    }
  }
}

export async function markReportReviewed(reportId: string): Promise<void> {
  if (!isFirebaseConfigured || !db) return;
  try {
    await updateDoc(doc(db, "reports", reportId), { status: "reviewed" });
  } catch (err) {
    console.error("[Reports] markReviewed failed:", err);
  }
}
