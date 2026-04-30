import { doc, getDoc, setDoc } from "firebase/firestore";
import { db, isFirebaseConfigured } from "./firebase";

export type DayOfWeek =
  | "Monday"
  | "Tuesday"
  | "Wednesday"
  | "Thursday"
  | "Friday"
  | "Saturday"
  | "Sunday";

export const DAYS_OF_WEEK: DayOfWeek[] = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

export type DayAvailability = {
  available: boolean;
  startTime: string; // HH:MM
  endTime: string;   // HH:MM
};

export type BlockedDate = {
  date: string; // YYYY-MM-DD
  reason: string;
};

export type ProAvailability = {
  userId: string;
  weeklyAvailability: Record<DayOfWeek, DayAvailability>;
  blockedDates: BlockedDate[];
  updatedAt: string;
};

export const DEFAULT_WEEKLY: Record<DayOfWeek, DayAvailability> = {
  Monday:    { available: true,  startTime: "08:00", endTime: "17:00" },
  Tuesday:   { available: true,  startTime: "08:00", endTime: "17:00" },
  Wednesday: { available: true,  startTime: "08:00", endTime: "17:00" },
  Thursday:  { available: true,  startTime: "08:00", endTime: "17:00" },
  Friday:    { available: true,  startTime: "08:00", endTime: "17:00" },
  Saturday:  { available: false, startTime: "09:00", endTime: "13:00" },
  Sunday:    { available: false, startTime: "09:00", endTime: "13:00" },
};

export async function loadAvailability(uid: string): Promise<ProAvailability | null> {
  if (!isFirebaseConfigured || !db) return null;
  try {
    const snap = await getDoc(doc(db, "availability", uid));
    if (!snap.exists()) return null;
    return snap.data() as ProAvailability;
  } catch (err) {
    console.error("[Availability] load failed:", err);
    return null;
  }
}

export async function saveAvailability(
  uid: string,
  data: Omit<ProAvailability, "updatedAt">,
): Promise<boolean> {
  if (!isFirebaseConfigured || !db) return false;
  try {
    await setDoc(doc(db, "availability", uid), {
      ...data,
      updatedAt: new Date().toISOString(),
    });
    return true;
  } catch (err) {
    console.error("[Availability] save failed:", err);
    return false;
  }
}

/** Returns a human-readable summary like "Mon–Fri, 8 AM – 5 PM" */
export function availabilitySummary(avail: ProAvailability): string {
  const available = DAYS_OF_WEEK.filter(
    (d) => avail.weeklyAvailability[d]?.available,
  );
  if (available.length === 0) return "Not currently available";

  const short: Record<DayOfWeek, string> = {
    Monday: "Mon", Tuesday: "Tue", Wednesday: "Wed",
    Thursday: "Thu", Friday: "Fri", Saturday: "Sat", Sunday: "Sun",
  };

  // Try to collapse consecutive days
  let rangeStr = "";
  let rangeStart = available[0];
  let prev = available[0];
  const allDays = DAYS_OF_WEEK;
  const ranges: string[] = [];

  for (let i = 1; i < available.length; i++) {
    const cur = available[i];
    if (allDays.indexOf(cur) === allDays.indexOf(prev) + 1) {
      prev = cur;
    } else {
      ranges.push(rangeStart === prev ? short[rangeStart] : `${short[rangeStart]}–${short[prev]}`);
      rangeStart = cur;
      prev = cur;
    }
  }
  ranges.push(rangeStart === prev ? short[rangeStart] : `${short[rangeStart]}–${short[prev]}`);
  rangeStr = ranges.join(", ");

  // Use the time from the first available day
  const firstDay = available[0];
  const { startTime, endTime } = avail.weeklyAvailability[firstDay];
  const fmt = (t: string) => {
    const [h, m] = t.split(":").map(Number);
    const period = h >= 12 ? "PM" : "AM";
    const hr = h % 12 || 12;
    return m === 0 ? `${hr} ${period}` : `${hr}:${String(m).padStart(2, "0")} ${period}`;
  };

  return `${rangeStr}, ${fmt(startTime)} – ${fmt(endTime)}`;
}

/** Returns true if the given date (YYYY-MM-DD) conflicts with the pro's availability */
export function hasConflict(
  avail: ProAvailability,
  date: string,
  time?: string,
): boolean {
  // Check blocked dates
  if (avail.blockedDates.some((b) => b.date === date)) return true;

  // Check weekly availability
  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const dayOfWeek = dayNames[new Date(date + "T12:00:00").getDay()] as DayOfWeek;
  const dayAvail = avail.weeklyAvailability[dayOfWeek];
  if (!dayAvail?.available) return true;

  if (time && dayAvail.startTime && dayAvail.endTime) {
    if (time < dayAvail.startTime || time > dayAvail.endTime) return true;
  }

  return false;
}
