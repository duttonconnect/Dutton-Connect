import { useEffect, useRef } from "react";
import { getMessaging, getToken, onMessage } from "firebase/messaging";
import { doc, setDoc } from "firebase/firestore";
import { app, db, isFirebaseConfigured } from "@/lib/firebase";
import { toast } from "sonner";

const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY as string | undefined;

export function usePushNotifications(userId: string | null) {
  const registered = useRef(false);

  useEffect(() => {
    if (!userId || !isFirebaseConfigured || !app || !db) return;
    if (registered.current) return;
    if (!("Notification" in window) || !("serviceWorker" in navigator)) return;
    if (!VAPID_KEY) return;

    registered.current = true;

    async function setup() {
      try {
        const permission = await Notification.requestPermission();
        if (permission !== "granted") return;

        const registration = await navigator.serviceWorker.ready;
        const messaging = getMessaging(app!);

        const token = await getToken(messaging, {
          vapidKey: VAPID_KEY,
          serviceWorkerRegistration: registration,
        });

        if (token && db && userId) {
          await setDoc(
            doc(db, "fcmTokens", userId),
            {
              token,
              userId,
              updatedAt: new Date().toISOString(),
              platform: "web",
            },
            { merge: true },
          );
        }

        onMessage(messaging, (payload) => {
          const title = payload.notification?.title ?? "Dutton Connect";
          const body = payload.notification?.body ?? "";
          toast(title, {
            description: body,
            duration: 6000,
          });
        });
      } catch {
        // Silently fail — push notifications are optional
      }
    }

    void setup();
  }, [userId]);
}
