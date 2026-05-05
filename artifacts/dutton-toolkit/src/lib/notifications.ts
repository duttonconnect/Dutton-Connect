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
