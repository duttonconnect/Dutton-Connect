import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
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
    await setDoc(
      doc(db, "businessProfiles", uid),
      { proId: uid, ...data, updatedAt },
      { merge: true },
    );
    // Also sync key fields to users/{uid} so ProProfile can read them
    await updateDoc(doc(db, "users", uid), {
      businessName: data.businessName,
      displayName: data.ownerName,
      services: data.serviceCategories,
      serviceArea: data.serviceArea,
      serviceRadiusMiles: data.serviceRadius,
      about: data.about,
      publicPhone: data.publicPhone ?? null,
      profilePhoto: data.profilePhoto ?? null,
      hasBusinessProfile: true,
    });
    return true;
  } catch (err) {
    console.error("[BusinessProfile] save failed:", err);
    return false;
  }
}

export type BadgeKey = "verifiedPro" | "fastResponder" | "topRated";

/** Toggle a trust badge on a pro's businessProfile and sync to users/{uid}. */
export async function toggleProBadge(
  uid: string,
  badge: BadgeKey,
  value: boolean,
): Promise<boolean> {
  if (!isFirebaseConfigured || !db) return false;
  try {
    await setDoc(
      doc(db, "businessProfiles", uid),
      { [badge]: value, updatedAt: new Date().toISOString() },
      { merge: true },
    );
    // Sync badge to users/{uid} so ProProfile reads it too
    await updateDoc(doc(db, "users", uid), { [badge]: value });
    return true;
  } catch (err) {
    console.error("[BusinessProfile] toggleProBadge failed:", err);
    return false;
  }
}
