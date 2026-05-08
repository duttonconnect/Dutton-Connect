import { useEffect, useState } from "react";
import {
  collection,
  addDoc,
  getDocs,
  updateDoc,
  doc,
  query,
  where,
  orderBy,
  writeBatch,
} from "firebase/firestore";
import { db, isFirebaseConfigured } from "./firebase";

export type NotificationType =
  | "job_posted"
  | "quote_sent"
  | "quote_accepted"
  | "job_scheduled"
  | "message_received"
  | "job_completed"
  | "review_received";

export type Notification = {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  read: boolean;
  relatedId: string;
  relatedType?: string;
  createdAt: string;
};

export async function createNotification(
  data: Omit<Notification, "id" | "read" | "createdAt">,
): Promise<void> {
  if (!isFirebaseConfigured || !db) return;
  try {
    await addDoc(collection(db, "notifications"), {
      ...data,
      read: false,
      createdAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error("[Notifications] createNotification failed:", err);
  }
}

export async function loadNotifications(userId: string): Promise<Notification[]> {
  if (!isFirebaseConfigured || !db) return [];
  try {
    const snap = await getDocs(
      query(
        collection(db, "notifications"),
        where("userId", "==", userId),
        orderBy("createdAt", "desc"),
      ),
    );
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Notification));
  } catch {
    // orderBy requires composite index; fallback without ordering
    try {
      const snap2 = await getDocs(
        query(collection(db, "notifications"), where("userId", "==", userId)),
      );
      const items = snap2.docs.map((d) => ({ id: d.id, ...d.data() } as Notification));
      return items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    } catch (err2) {
      console.error("[Notifications] loadNotifications failed:", err2);
      return [];
    }
  }
}

export async function markNotificationRead(notifId: string): Promise<void> {
  if (!isFirebaseConfigured || !db) return;
  try {
    await updateDoc(doc(db, "notifications", notifId), { read: true });
  } catch (err) {
    console.error("[Notifications] markNotificationRead failed:", err);
  }
}

export async function markAllNotificationsRead(userId: string): Promise<void> {
  if (!isFirebaseConfigured || !db) return;
  try {
    const snap = await getDocs(
      query(
        collection(db, "notifications"),
        where("userId", "==", userId),
        where("read", "==", false),
      ),
    );
    if (snap.empty) return;
    const batch = writeBatch(db);
    snap.docs.forEach((d) => batch.update(d.ref, { read: true }));
    await batch.commit();
  } catch (err) {
    console.error("[Notifications] markAllNotificationsRead failed:", err);
  }
}

export async function getUnreadCount(userId: string): Promise<number> {
  if (!isFirebaseConfigured || !db) return 0;
  try {
    const snap = await getDocs(
      query(
        collection(db, "notifications"),
        where("userId", "==", userId),
        where("read", "==", false),
      ),
    );
    return snap.size;
  } catch {
    return 0;
  }
}

export function useUnreadNotificationCount(userId: string | undefined): number {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!userId) { setCount(0); return; }
    getUnreadCount(userId).then(setCount).catch(() => setCount(0));
  }, [userId]);
  return count;
}

// ─── FCM Push Notification Triggers ──────────────────────────────────────────
// These call the API server which uses Firebase Admin to send FCM messages.

const _BASE = (import.meta.env.BASE_URL ?? "/").replace(/\/$/, "");

async function _postNotify(body: Record<string, unknown>) {
  try {
    await fetch(`${_BASE}/api/notify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    // Notifications are best-effort — never block the main flow
  }
}

export function notifyNewMessage(
  recipientId: string,
  senderName: string,
  messagePreview: string,
  conversationId: string,
) {
  return _postNotify({
    event: "new_message",
    recipientId,
    title: `New message from ${senderName}`,
    body: messagePreview.length > 80 ? messagePreview.slice(0, 80) + "\u2026" : messagePreview,
    data: { url: `/messages/${conversationId}`, tag: `msg-${conversationId}` },
  });
}

export function notifyQuoteSent(
  customerId: string,
  proName: string,
  jobTitle: string,
  jobRequestId: string,
) {
  return _postNotify({
    event: "quote_sent",
    recipientId: customerId,
    title: `New quote from ${proName}`,
    body: `You received a quote on "${jobTitle}"`,
    data: { url: `/my-jobs/${jobRequestId}/quotes`, tag: `quote-${jobRequestId}` },
  });
}

export function notifyQuoteAccepted(
  proId: string,
  customerName: string,
  jobTitle: string,
  jobRequestId: string,
) {
  return _postNotify({
    event: "quote_accepted",
    recipientId: proId,
    title: "Quote accepted",
    body: `${customerName} accepted your quote for "${jobTitle}"`,
    data: { url: `/nearby-jobs`, tag: `accepted-${jobRequestId}` },
  });
}

export function notifyQuoteDeclined(
  proId: string,
  jobTitle: string,
  jobRequestId: string,
) {
  return _postNotify({
    event: "quote_declined",
    recipientId: proId,
    title: "Quote not selected",
    body: `Your quote for "${jobTitle}" was not selected`,
    data: { url: `/nearby-jobs`, tag: `declined-${jobRequestId}` },
  });
}

export function notifyQuoteRequested(
  proId: string,
  customerName: string,
  service: string,
) {
  return _postNotify({
    event: "quote_requested",
    recipientId: proId,
    title: `Quote request from ${customerName}`,
    body: `Requested service: ${service}`,
    data: { url: `/lead-inbox`, tag: `request-${proId}` },
  });
}

export function notifyNewJobMatch(
  proId: string,
  jobTitle: string,
  jobRequestId: string,
) {
  return _postNotify({
    event: "new_job_match",
    recipientId: proId,
    title: "New job near you",
    body: jobTitle,
    data: { url: `/nearby-jobs`, tag: `match-${jobRequestId}` },
  });
}

// ─── Browser (OS-level) Notifications ────────────────────────────────────────

export function browserNotificationsSupported(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

export function browserNotificationPermission(): NotificationPermission {
  if (!browserNotificationsSupported()) return "denied";
  return Notification.permission;
}

export async function requestBrowserNotificationPermission(): Promise<NotificationPermission> {
  if (!browserNotificationsSupported()) return "denied";
  if (Notification.permission !== "default") return Notification.permission;
  try {
    return await Notification.requestPermission();
  } catch {
    return "denied";
  }
}

export function sendBrowserNotification(
  title: string,
  body: string,
  tag?: string,
): void {
  if (!browserNotificationsSupported() || Notification.permission !== "granted") return;
  try {
    new Notification(title, { body, tag, icon: "/favicon.ico" });
  } catch {
    // silently fail in sandboxed/embedded contexts
  }
}
