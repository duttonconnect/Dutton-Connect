import {
  doc,
  getDoc,
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
};

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
      hasBusinessProfile: true,
    });
    return true;
  } catch (err) {
    console.error("[BusinessProfile] save failed:", err);
    return false;
  }
}
