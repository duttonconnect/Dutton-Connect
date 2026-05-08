import { Router } from "express";
import { logger } from "../lib/logger.js";

const router = Router();

let adminPromise: Promise<typeof import("firebase-admin") | null> | null = null;

async function getAdmin() {
  if (adminPromise) return adminPromise;
  adminPromise = (async () => {
    const serviceAccountJson = process.env["FIREBASE_SERVICE_ACCOUNT_KEY"];
    const projectId =
      process.env["FIREBASE_PROJECT_ID"] ??
      process.env["VITE_FIREBASE_PROJECT_ID"];

    if (!serviceAccountJson && !projectId) {
      logger.warn("[notify] No Firebase credentials — push notifications disabled.");
      return null;
    }

    const { default: admin } = await import("firebase-admin");

    if (admin.apps.length > 0) return admin;

    if (serviceAccountJson) {
      try {
        const serviceAccount = JSON.parse(serviceAccountJson) as object;
        admin.initializeApp({
          credential: admin.credential.cert(
            serviceAccount as Parameters<typeof admin.credential.cert>[0],
          ),
        });
      } catch {
        logger.warn("[notify] FIREBASE_SERVICE_ACCOUNT_KEY is not valid JSON.");
        return null;
      }
    } else {
      admin.initializeApp({ projectId: projectId! });
    }

    return admin;
  })();
  return adminPromise;
}

/**
 * POST /api/notify
 *
 * Body:
 *   recipientId  string  — Firebase UID of the target user
 *   title        string  — Notification title
 *   body         string  — Notification body
 *   data?        object  — Optional key-value pairs (url, tag, etc.)
 *
 * Looks up the user's FCM token from the `fcmTokens/{uid}` Firestore doc,
 * then sends a FCM message via Firebase Admin SDK.
 */
router.post("/notify", async (req, res) => {
  const { recipientId, title, body, data } = req.body as {
    recipientId?: string;
    title?: string;
    body?: string;
    data?: Record<string, string>;
  };

  if (!recipientId || !title || !body) {
    res.status(400).json({ error: "recipientId, title, and body are required." });
    return;
  }

  try {
    const admin = await getAdmin();
    if (!admin) {
      res.status(503).json({ error: "Push notifications not configured." });
      return;
    }

    const db = admin.firestore();
    const tokenDoc = await db.collection("fcmTokens").doc(recipientId).get();

    if (!tokenDoc.exists) {
      res.status(404).json({ error: "No FCM token for this user." });
      return;
    }

    const token = tokenDoc.data()?.token as string | undefined;
    if (!token) {
      res.status(404).json({ error: "FCM token is missing." });
      return;
    }

    const stringData: Record<string, string> = {};
    if (data) {
      for (const [k, v] of Object.entries(data)) {
        stringData[k] = String(v);
      }
    }

    await admin.messaging().send({
      token,
      notification: { title, body },
      data: stringData,
      webpush: {
        notification: {
          title,
          body,
          icon: "/icon-192.png",
          badge: "/icon-192.png",
          tag: stringData.tag,
          requireInteraction: false,
        },
        fcmOptions: {
          link: stringData.url ?? "/",
        },
      },
      apns: {
        payload: {
          aps: {
            alert: { title, body },
            badge: 1,
            sound: "default",
          },
        },
      },
    });

    req.log.info({ recipientId, title }, "[notify] Push sent");
    res.json({ ok: true });
  } catch (err) {
    req.log.error({ err, recipientId }, "[notify] Failed to send push");
    res.status(500).json({ error: "Failed to send notification." });
  }
});

export default router;
