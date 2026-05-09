import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
} from "firebase/firestore";
import { db, isFirebaseConfigured } from "./firebase";

export const BUSINESS_CATEGORIES = [
  "House Cleaning",
  "Handyman",
  "Plumbing",
  "Automotive",
  "Pressure Washing",
  "Yard Work",
  "Appliance Installation",
  "Other",
] as const;

export type BusinessCategory = (typeof BUSINESS_CATEGORIES)[number];

export type BusinessProfile = {
  proId: string;
  businessName: string;
  ownerName: string;
  serviceCategories: BusinessCategory[];
  serviceArea: string;
  serviceRadius: number;
  about: string;
  yearsExperience: number;
  website?: string;
  publicPhone?: string;
  profilePhoto?: string;
  businessLogo?: string;
  updatedAt: string;
  // Trust badges — toggled by admin
  verifiedPro?: boolean;
  fastResponder?: boolean;
  topRated?: boolean;
  // Jobs completed count — incremented when a job is marked completed
  completedJobsCount?: number;
};

/**
 * Fields written to publicProfiles/{uid} — never includes email or isAdmin.
 * Readable by any authenticated user for pro discovery / browsing.
 * Trust badges (verifiedPro, fastResponder, topRated) and completedJobsCount
 * are only set by admins via toggleProBadge / incrementCompletedJobsCount.
 */
export type PublicProfile = {
  displayName: string;
  businessName: string;
  services: string[];
  serviceArea: string;
  serviceRadiusMiles: number;
  about: string;
  publicPhone?: string;
  profilePhoto?: string;
  role: string;
  updatedAt: string;
  // Admin-managed fields
  verifiedPro?: boolean;
  fastResponder?: boolean;
  topRated?: boolean;
  completedJobsCount?: number;
};

export async function loadAllBusinessProfiles(): Promise<BusinessProfile[]> {
  if (!isFirebaseConfigured || !db) return [];
  try {
    const snap = await getDocs(collection(db, "businessProfiles"));
    return snap.docs.map((d) => ({ proId: d.id, ...d.data() } as BusinessProfile));
  } catch (err) {
    console.error("[BusinessProfile] loadAll failed:", err);
    return [];
  }
}

/**
 * Load all public pro profiles from the publicProfiles collection.
 * This collection is readable by any authenticated user and contains only
 * safe fields — never email or isAdmin.
 * Use this for customer-facing pro discovery instead of loadAllBusinessProfiles.
 */
export async function loadAllPublicProfiles(): Promise<(PublicProfile & { proId: string })[]> {
  if (!isFirebaseConfigured || !db) return [];
  try {
    const snap = await getDocs(collection(db, "publicProfiles"));
    return snap.docs.map((d) => ({ proId: d.id, ...d.data() } as PublicProfile & { proId: string }));
  } catch (err) {
    console.error("[BusinessProfile] loadAllPublicProfiles failed:", err);
    return [];
  }
}

export async function loadBusinessProfile(uid: string): Promise<BusinessProfile | null> {
  if (!isFirebaseConfigured || !db) return null;
  try {
    const snap = await getDoc(doc(db, "businessProfiles", uid));
    if (!snap.exists()) return null;
    return { proId: snap.id, ...snap.data() } as BusinessProfile;
  } catch (err) {
    console.error("[BusinessProfile] load failed:", err);
    return null;
  }
}

export async function saveBusinessProfile(
  uid: string,
  data: Omit<BusinessProfile, "proId" | "updatedAt">,
): Promise<boolean> {
  if (!isFirebaseConfigured || !db) return false;
  try {
    const updatedAt = new Date().toISOString();

    // Write the full profile (owner-only access) to businessProfiles
    await setDoc(
      doc(db, "businessProfiles", uid),
      { proId: uid, ...data, updatedAt },
      { merge: true },
    );

    // Sync key fields to users/{uid} for owner/admin reads (e.g. admin panel).
    // Use setDoc+merge so this works even if the users doc doesn't exist yet.
    await setDoc(
      doc(db, "users", uid),
      {
        businessName: data.businessName,
        displayName: data.ownerName,
        hasBusinessProfile: true,
      },
      { merge: true },
    );

    // Write ONLY public fields to publicProfiles/{uid}.
    // This collection is readable by any authenticated user for pro browsing.
    // Sensitive fields (email, isAdmin) are deliberately never written here.
    const publicProfile: PublicProfile = {
      displayName: data.ownerName,
      businessName: data.businessName,
      services: data.serviceCategories as string[],
      serviceArea: data.serviceArea,
      serviceRadiusMiles: data.serviceRadius,
      about: data.about,
      role: "pro",
      updatedAt,
      ...(data.publicPhone ? { publicPhone: data.publicPhone } : {}),
      ...(data.profilePhoto ? { profilePhoto: data.profilePhoto } : {}),
    };
    await setDoc(doc(db, "publicProfiles", uid), publicProfile, { merge: true });

    return true;
  } catch (err) {
    console.error("[BusinessProfile] save failed:", err);
    return false;
  }
}

export type BadgeKey = "verifiedPro" | "fastResponder" | "topRated";

/**
 * Toggle a trust badge on a pro's businessProfile and sync to publicProfiles/{uid}.
 * publicProfiles is readable by any authenticated user, so this makes the badge
 * visible on the customer-facing pro profile page.
 * Requires the caller to be an admin (enforced by Firestore rules).
 */
export async function toggleProBadge(
  uid: string,
  badge: BadgeKey,
  value: boolean,
): Promise<boolean> {
  if (!isFirebaseConfigured || !db) return false;
  try {
    const updatedAt = new Date().toISOString();
    // Write badge to the full (admin-readable) business profile
    await setDoc(
      doc(db, "businessProfiles", uid),
      { [badge]: value, updatedAt },
      { merge: true },
    );
    // Sync badge to publicProfiles/{uid} so any authenticated user can see it
    // via loadProProfile() and loadAllPublicProfiles().
    // Admin write to publicProfiles is permitted by the Firestore rule.
    await setDoc(
      doc(db, "publicProfiles", uid),
      { [badge]: value, updatedAt },
      { merge: true },
    );
    return true;
  } catch (err) {
    console.error("[BusinessProfile] toggleProBadge failed:", err);
    return false;
  }
}
