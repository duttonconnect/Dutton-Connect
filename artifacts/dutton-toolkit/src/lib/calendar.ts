/**
 * Firestore calendar service.
 *
 * Collection: calendarEvents/{id}
 * Only the owning user's events are returned; security rule required:
 *   match /calendarEvents/{id} {
 *     allow read, write: if request.auth != null && request.auth.uid == resource.data.userId;
 *     allow create: if request.auth != null && request.auth.uid == request.resource.data.userId;
 *   }
 */
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

export const CALENDAR_EVENT_TYPES = [
  "Job",
  "Quote Follow-up",
  "Payment Reminder",
  "Personal Note",
] as const;

export type CalendarEventType = (typeof CALENDAR_EVENT_TYPES)[number];

export type CalendarEvent = {
  id: string;
  userId: string;
  title: string;
  type: CalendarEventType;
  date: string;   // YYYY-MM-DD
  time: string;   // HH:MM  (empty string if not set)
  notes: string;
  jobId?: string;
  customerId?: string;
  createdAt: string;
};

/** Save a new calendar event. Returns the new doc ID or null on failure. */
export async function saveCalendarEvent(
  data: Omit<CalendarEvent, "id" | "createdAt">,
): Promise<string | null> {
  if (!isFirebaseConfigured || !db) {
    console.error("[Calendar] saveCalendarEvent: Firebase not configured.");
    return null;
  }
  try {
    const ref = await addDoc(collection(db, "calendarEvents"), {
      ...data,
      createdAt: new Date().toISOString(),
    });
    return ref.id;
  } catch (err) {
    console.error("[Calendar] saveCalendarEvent failed:", err);
    return null;
  }
}

/** Load all events belonging to the given user. */
export async function loadCalendarEvents(
  userId: string,
): Promise<CalendarEvent[]> {
  if (!isFirebaseConfigured || !db) return [];
  try {
    const snap = await getDocs(
      query(collection(db, "calendarEvents"), where("userId", "==", userId)),
    );
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as CalendarEvent));
  } catch (err) {
    console.error("[Calendar] loadCalendarEvents failed:", err);
    return [];
  }
}

/** Delete a calendar event by ID. */
export async function deleteCalendarEvent(eventId: string): Promise<void> {
  if (!isFirebaseConfigured || !db) return;
  try {
    await deleteDoc(doc(db, "calendarEvents", eventId));
  } catch (err) {
    console.error("[Calendar] deleteCalendarEvent failed:", err);
  }
}
