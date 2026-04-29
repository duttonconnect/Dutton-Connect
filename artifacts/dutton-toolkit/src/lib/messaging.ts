/**
 * Firestore messaging service.
 *
 * Collections:
 *   conversations/{id}            — one per job-request + participant pair
 *   conversations/{id}/messages/{msgId} — individual messages
 *
 * Firestore security rules needed:
 *   match /conversations/{cid} {
 *     allow read, write: if request.auth != null &&
 *       request.auth.uid in resource.data.participants;
 *     allow create: if request.auth != null &&
 *       request.auth.uid in request.resource.data.participants;
 *     match /messages/{mid} {
 *       allow read: if request.auth != null &&
 *         request.auth.uid in get(/databases/$(database)/documents/conversations/$(cid))
 *           .data.participants;
 *       allow create: if request.auth != null &&
 *         request.resource.data.senderId == request.auth.uid;
 *     }
 *   }
 */
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
  where,
  type Unsubscribe,
} from "firebase/firestore";
import { db, isFirebaseConfigured } from "./firebase";

export type Conversation = {
  id: string;
  participants: [string, string];
  jobRequestId: string;
  jobRequestTitle: string;
  createdAt: string;
  lastMessage?: string;
  lastMessageAt?: string;
};

export type Message = {
  id: string;
  senderId: string;
  text: string;
  createdAt: string;
};

/**
 * Find an existing conversation between two participants for a given job request,
 * or create a new one. Returns the conversation ID.
 */
export async function getOrCreateConversation(
  participantIds: [string, string],
  jobRequestId: string,
  jobRequestTitle: string,
): Promise<string | null> {
  if (!isFirebaseConfigured || !db) return null;
  try {
    const snap = await getDocs(
      query(
        collection(db, "conversations"),
        where("jobRequestId", "==", jobRequestId),
        where("participants", "array-contains", participantIds[0]),
      ),
    );
    const existing = snap.docs.find((d) =>
      (d.data().participants as string[]).includes(participantIds[1]),
    );
    if (existing) return existing.id;

    const ref = await addDoc(collection(db, "conversations"), {
      participants: participantIds,
      jobRequestId,
      jobRequestTitle,
      createdAt: new Date().toISOString(),
    });
    return ref.id;
  } catch (err) {
    console.warn("[Messaging] Could not get or create conversation:", err);
    return null;
  }
}

/** Load all conversations where userId is a participant. */
export async function loadConversationsForUser(
  userId: string,
): Promise<Conversation[]> {
  if (!isFirebaseConfigured || !db) return [];
  try {
    const snap = await getDocs(
      query(
        collection(db, "conversations"),
        where("participants", "array-contains", userId),
      ),
    );
    return snap.docs.map(
      (d) => ({ id: d.id, ...d.data() } as Conversation),
    );
  } catch (err) {
    console.warn("[Messaging] Could not load conversations:", err);
    return [];
  }
}

/** Load a single conversation document by ID. */
export async function loadConversation(
  conversationId: string,
): Promise<Conversation | null> {
  if (!isFirebaseConfigured || !db) return null;
  try {
    const snap = await getDoc(doc(db, "conversations", conversationId));
    if (!snap.exists()) return null;
    return { id: snap.id, ...snap.data() } as Conversation;
  } catch (err) {
    console.warn("[Messaging] Could not load conversation:", err);
    return null;
  }
}

/**
 * Subscribe to real-time messages in a conversation sorted by createdAt.
 * Returns an unsubscribe function.
 */
export function subscribeToMessages(
  conversationId: string,
  callback: (messages: Message[]) => void,
): Unsubscribe {
  if (!isFirebaseConfigured || !db) return () => {};
  return onSnapshot(
    query(
      collection(db, "conversations", conversationId, "messages"),
      orderBy("createdAt", "asc"),
    ),
    (snap) => {
      callback(
        snap.docs.map((d) => ({ id: d.id, ...d.data() } as Message)),
      );
    },
    (err) => console.warn("[Messaging] Message stream error:", err),
  );
}

/** Send a message and update the conversation's last-message preview. */
export async function sendMessage(
  conversationId: string,
  senderId: string,
  text: string,
): Promise<void> {
  if (!isFirebaseConfigured || !db) return;
  const createdAt = new Date().toISOString();
  await addDoc(collection(db, "conversations", conversationId, "messages"), {
    senderId,
    text,
    createdAt,
  });
  await updateDoc(doc(db, "conversations", conversationId), {
    lastMessage: text.length > 80 ? text.slice(0, 80) + "…" : text,
    lastMessageAt: createdAt,
  });
}
