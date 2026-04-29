/**
 * Firestore matching service.
 *
 * Shared collections (readable by all authenticated users):
 *   jobRequests/{id}   — open requests posted by customers, visible to pros
 *   matchQuotes/{id}   — quotes sent by pros in response to job requests
 *
 * Firestore security rules required:
 *   match /jobRequests/{id}  { allow read: if request.auth != null; allow write: if request.auth != null; }
 *   match /matchQuotes/{id}  { allow read, write: if request.auth != null; }
 */
import {
  collection,
  addDoc,
  setDoc,
  getDocs,
  query,
  where,
  doc,
} from "firebase/firestore";
import { db, isFirebaseConfigured } from "./firebase";

export type FirestoreJobRequest = {
  id: string;
  title: string;
  category: string;
  description: string;
  address: string;
  budget: number;
  preferredDate: string;
  urgency: string;
  customerId: string;
  status: "open" | "closed";
  createdAt: string;
};

export type MatchQuote = {
  id: string;
  jobRequestId: string;
  jobRequestTitle: string;
  proId: string;
  customerId: string;
  amount: number;
  message: string;
  status: "sent" | "accepted" | "declined";
  createdAt: string;
};

/**
 * Save a job request to the shared Firestore collection using the local store ID
 * so quotes can later be matched back to the specific request.
 */
export async function postJobRequestToFirestore(
  localId: string,
  data: Omit<FirestoreJobRequest, "id" | "status" | "createdAt">,
  createdAt: string,
): Promise<void> {
  if (!isFirebaseConfigured || !db) return;
  try {
    await setDoc(doc(db, "jobRequests", localId), {
      ...data,
      status: "open",
      createdAt,
    });
  } catch (err) {
    console.warn("[Matching] Could not post job request:", err);
  }
}

/** Load all open job requests — used by pros on the Nearby Jobs page. */
export async function loadOpenJobRequests(): Promise<FirestoreJobRequest[]> {
  if (!isFirebaseConfigured || !db) return [];
  try {
    const snap = await getDocs(
      query(collection(db, "jobRequests"), where("status", "==", "open")),
    );
    return snap.docs.map(
      (d) => ({ id: d.id, ...d.data() } as FirestoreJobRequest),
    );
  } catch (err) {
    console.warn("[Matching] Could not load open job requests:", err);
    return [];
  }
}

/** Save a quote from a pro to Firestore. Returns the new doc ID or null on failure. */
export async function sendMatchQuote(
  data: Omit<MatchQuote, "id" | "status" | "createdAt">,
): Promise<string | null> {
  if (!isFirebaseConfigured || !db) return null;
  try {
    const ref = await addDoc(collection(db, "matchQuotes"), {
      ...data,
      status: "sent",
      createdAt: new Date().toISOString(),
    });
    return ref.id;
  } catch (err) {
    console.warn("[Matching] Could not send quote:", err);
    return null;
  }
}

/** Load all quotes a customer has received across all their job requests. */
export async function loadQuotesForCustomer(
  customerId: string,
): Promise<MatchQuote[]> {
  if (!isFirebaseConfigured || !db) return [];
  try {
    const snap = await getDocs(
      query(
        collection(db, "matchQuotes"),
        where("customerId", "==", customerId),
      ),
    );
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as MatchQuote));
  } catch (err) {
    console.warn("[Matching] Could not load customer quotes:", err);
    return [];
  }
}

/** Load all quotes for a specific job request. */
export async function loadQuotesForRequest(
  jobRequestId: string,
): Promise<MatchQuote[]> {
  if (!isFirebaseConfigured || !db) return [];
  try {
    const snap = await getDocs(
      query(
        collection(db, "matchQuotes"),
        where("jobRequestId", "==", jobRequestId),
      ),
    );
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as MatchQuote));
  } catch (err) {
    console.warn("[Matching] Could not load quotes for request:", err);
    return [];
  }
}
