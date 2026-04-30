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
  updateDoc,
  getDoc,
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
  status: "open" | "closed" | "accepted" | "scheduled" | "completed";
  createdAt: string;
  // Set when a quote is accepted
  acceptedProId?: string;
  acceptedQuoteId?: string;
  // Set when the customer schedules after accepting
  scheduledDate?: string;
  scheduledTime?: string;
  scheduleNotes?: string;
};

export type Review = {
  id: string;
  jobRequestId: string;
  customerId: string;
  proId: string;
  rating: number; // 1–5
  text: string;
  createdAt: string;
};

export type ProProfile = {
  uid: string;
  displayName?: string;
  email?: string;
  businessName?: string;
  services?: string[];
  serviceArea?: string;
  serviceRadiusMiles?: number;
  about?: string;
  publicPhone?: string; // only shown when explicitly set as public
  role?: string;
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

// ---------------------------------------------------------------------------
// Quote Requests — customer-initiated "please quote me" messages to a pro
// Firestore rule needed:
//   match /quoteRequests/{id} { allow read, write: if request.auth != null; }
// ---------------------------------------------------------------------------

export type QuoteRequest = {
  id: string;
  proId: string;
  customerId: string;
  service: string;
  message: string;
  status: "pending" | "responded";
  createdAt: string;
};

/**
 * Save a customer-initiated quote request to a pro.
 * Returns the new doc ID on success, or null on failure.
 */
export async function sendQuoteRequest(
  data: Omit<QuoteRequest, "id" | "status" | "createdAt">,
): Promise<string | null> {
  if (!isFirebaseConfigured || !db) {
    console.error("[Matching] sendQuoteRequest: Firebase is not configured.");
    return null;
  }
  try {
    const ref = await addDoc(collection(db, "quoteRequests"), {
      ...data,
      status: "pending",
      createdAt: new Date().toISOString(),
    });
    return ref.id;
  } catch (err) {
    console.error("[Matching] sendQuoteRequest failed:", err);
    return null;
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

/** Load all job requests posted by a customer (Firestore). */
export async function loadJobRequestsForCustomer(
  customerId: string,
): Promise<FirestoreJobRequest[]> {
  if (!isFirebaseConfigured || !db) return [];
  try {
    const snap = await getDocs(
      query(collection(db, "jobRequests"), where("customerId", "==", customerId)),
    );
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as FirestoreJobRequest));
  } catch (err) {
    console.warn("[Matching] Could not load customer job requests:", err);
    return [];
  }
}

/**
 * Accept a quote: marks the jobRequest as "accepted" and the chosen matchQuote
 * as "accepted". All other quotes for the same request stay unchanged.
 */
export async function acceptQuote(
  jobRequestId: string,
  quoteId: string,
  proId: string,
): Promise<boolean> {
  if (!isFirebaseConfigured || !db) return false;
  try {
    await updateDoc(doc(db, "jobRequests", jobRequestId), {
      status: "accepted",
      acceptedProId: proId,
      acceptedQuoteId: quoteId,
    });
    await updateDoc(doc(db, "matchQuotes", quoteId), { status: "accepted" });
    return true;
  } catch (err) {
    console.warn("[Matching] acceptQuote failed:", err);
    return false;
  }
}

/** Schedule an accepted job request and update its Firestore document. */
export async function scheduleJobRequest(
  jobRequestId: string,
  scheduledDate: string,
  scheduledTime: string,
  scheduleNotes: string,
): Promise<boolean> {
  if (!isFirebaseConfigured || !db) return false;
  try {
    await updateDoc(doc(db, "jobRequests", jobRequestId), {
      status: "scheduled",
      scheduledDate,
      scheduledTime,
      scheduleNotes,
    });
    return true;
  } catch (err) {
    console.warn("[Matching] scheduleJobRequest failed:", err);
    return false;
  }
}

/** Load a pro's public profile from the users collection. */
export async function loadProProfile(proId: string): Promise<ProProfile | null> {
  if (!isFirebaseConfigured || !db) return null;
  try {
    const snap = await getDoc(doc(db, "users", proId));
    if (!snap.exists()) return null;
    return { uid: snap.id, ...snap.data() } as ProProfile;
  } catch (err) {
    console.warn("[Matching] Could not load pro profile:", err);
    return null;
  }
}

/** Save a customer review for a pro. Returns the new doc ID or null. */
export async function saveReview(
  data: Omit<Review, "id" | "createdAt">,
): Promise<string | null> {
  if (!isFirebaseConfigured || !db) return null;
  try {
    const ref = await addDoc(collection(db, "reviews"), {
      ...data,
      createdAt: new Date().toISOString(),
    });
    return ref.id;
  } catch (err) {
    console.warn("[Matching] saveReview failed:", err);
    return null;
  }
}

/** Load all reviews for a specific pro. */
export async function loadReviewsForPro(proId: string): Promise<Review[]> {
  if (!isFirebaseConfigured || !db) return [];
  try {
    const snap = await getDocs(
      query(collection(db, "reviews"), where("proId", "==", proId)),
    );
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Review));
  } catch (err) {
    console.warn("[Matching] Could not load pro reviews:", err);
    return [];
  }
}

/** Check whether a customer has already reviewed a specific job request. */
export async function loadExistingReview(
  jobRequestId: string,
  customerId: string,
): Promise<Review | null> {
  if (!isFirebaseConfigured || !db) return null;
  try {
    const snap = await getDocs(
      query(
        collection(db, "reviews"),
        where("jobRequestId", "==", jobRequestId),
        where("customerId", "==", customerId),
      ),
    );
    if (snap.empty) return null;
    const d = snap.docs[0];
    return { id: d.id, ...d.data() } as Review;
  } catch (err) {
    console.warn("[Matching] loadExistingReview failed:", err);
    return null;
  }
}
