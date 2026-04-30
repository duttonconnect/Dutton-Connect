/**
 * Keyword synonyms: each entry maps a list of user-typed terms to the
 * canonical category name stored in the app.
 */
const SYNONYMS: [string[], string][] = [
  [["cleaning", "cleaner", "house cleaning", "maid", "housekeeping", "sweep", "vacuum"], "House Cleaning"],
  [["yard", "lawn", "grass", "mow", "mowing", "landscaping", "landscape", "mulch", "hedge", "trim"], "Yard Work"],
  [["mechanic", "auto", "car", "automobile", "vehicle", "truck", "engine", "alternator", "oil change"], "Automotive"],
  [["pressure wash", "power wash", "powerwash", "pressure clean", "power clean"], "Pressure Washing"],
  [["plumber", "pipe", "drain", "faucet", "toilet", "leak", "water heater", "sink"], "Plumbing"],
  [["appliance", "dishwasher", "washer", "dryer", "refrigerator", "fridge", "stove", "oven"], "Appliance Installation"],
  [["handyman", "repair", "fix", "maintenance", "home repair", "drywall", "fixture", "light"], "Handyman"],
];

/**
 * Returns true if `query` matches any of the provided `texts` either
 * via direct substring or via synonym expansion to a category name.
 * Always returns true when query is empty.
 */
export function matchesKeyword(query: string, texts: string[]): boolean {
  const q = query.toLowerCase().trim();
  if (!q) return true;

  const corpus = texts.join(" ").toLowerCase();

  // Direct substring match first
  if (corpus.includes(q)) return true;

  // Synonym expansion: if any synonym for a canonical category overlaps
  // with the query, check if that category name appears in the corpus.
  for (const [synonyms, category] of SYNONYMS) {
    const hit = synonyms.some((s) => q.includes(s) || s.includes(q));
    if (hit && corpus.includes(category.toLowerCase())) return true;
  }

  return false;
}
