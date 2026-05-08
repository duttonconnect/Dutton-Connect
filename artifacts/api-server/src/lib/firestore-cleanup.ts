import { logger } from "./logger.js";

const SOFT_DELETE_FIELD = "deletedAt";
const ROUTES_COLLECTION = "routes";
const UNDO_WINDOW_MS = 5_000;
const CLEANUP_INTERVAL_MS = 60_000;
const FIRESTORE_BATCH_LIMIT = 500;

let cleanupInterval: ReturnType<typeof setInterval> | null = null;

async function initAdmin() {
  const serviceAccountJson = process.env["FIREBASE_SERVICE_ACCOUNT_KEY"];
  const projectId = process.env["FIREBASE_PROJECT_ID"] ?? process.env["VITE_FIREBASE_PROJECT_ID"];

  if (!serviceAccountJson && !projectId) {
    return null;
  }

  const { default: admin } = await import("firebase-admin");

  if (admin.apps.length > 0) return admin;

  if (serviceAccountJson) {
    try {
      const serviceAccount = JSON.parse(serviceAccountJson) as object;
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount as Parameters<typeof admin.credential.cert>[0]),
      });
    } catch {
      logger.warn("[firestore-cleanup] FIREBASE_SERVICE_ACCOUNT_KEY is not valid JSON — skipping cleanup.");
      return null;
    }
  } else {
    admin.initializeApp({ projectId: projectId! });
  }

  return admin;
}

async function purgeStaleRoutes() {
  const admin = await initAdmin();
  if (!admin) return;

  const db = admin.firestore();

  // deletedAt is stored as an ISO 8601 string (e.g. "2026-05-05T12:00:00.000Z").
  // ISO 8601 strings sort lexicographically in the same order as chronological time,
  // so a string <= comparison against a cutoff ISO string is equivalent to a time
  // comparison and will correctly match all docs soft-deleted before the cutoff.
  const cutoffIso = new Date(Date.now() - UNDO_WINDOW_MS).toISOString();

  const snap = await db
    .collection(ROUTES_COLLECTION)
    .where(SOFT_DELETE_FIELD, "<=", cutoffIso)
    .get();

  if (snap.empty) return;

  // Firestore batches are capped at 500 operations each. Chunk the deletes so
  // that a large backlog of stale docs never exceeds the limit and causes the
  // whole commit to fail.
  const docs = snap.docs;
  for (let i = 0; i < docs.length; i += FIRESTORE_BATCH_LIMIT) {
    const chunk = docs.slice(i, i + FIRESTORE_BATCH_LIMIT);
    const batch = db.batch();
    for (const docSnap of chunk) {
      batch.delete(docSnap.ref);
    }
    await batch.commit();
  }

  logger.info(
    { count: snap.size },
    "[firestore-cleanup] Purged stale soft-deleted routes",
  );
}

export function startFirestoreCleanup() {
  const serviceAccountJson = process.env["FIREBASE_SERVICE_ACCOUNT_KEY"];
  const projectId = process.env["FIREBASE_PROJECT_ID"] ?? process.env["VITE_FIREBASE_PROJECT_ID"];

  if (!serviceAccountJson && !projectId) {
    logger.info(
      "[firestore-cleanup] No Firebase credentials found — Firestore cleanup job not started. " +
        "Set FIREBASE_SERVICE_ACCOUNT_KEY or FIREBASE_PROJECT_ID to enable it.",
    );
    return;
  }

  purgeStaleRoutes().catch((err) =>
    logger.warn({ err }, "[firestore-cleanup] Initial purge failed"),
  );

  cleanupInterval = setInterval(() => {
    purgeStaleRoutes().catch((err) =>
      logger.warn({ err }, "[firestore-cleanup] Scheduled purge failed"),
    );
  }, CLEANUP_INTERVAL_MS);

  logger.info(
    { intervalMs: CLEANUP_INTERVAL_MS },
    "[firestore-cleanup] Firestore soft-delete cleanup job started",
  );
}

export function stopFirestoreCleanup() {
  if (cleanupInterval !== null) {
    clearInterval(cleanupInterval);
    cleanupInterval = null;
  }
}
