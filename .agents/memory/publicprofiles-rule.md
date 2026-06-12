---
name: publicProfiles Firestore update rule
description: Why the UPDATE rule uses affectedKeys() instead of hasOnly(), and when to apply this pattern
---

## Rule
For Firestore UPDATE rules on collections where existing documents may contain fields from older app versions, use `!request.resource.data.diff(resource.data).affectedKeys().hasAny([...sensitiveFields...])` instead of `request.resource.data.keys().hasOnly([...allowlist...])`.

**Why:** `hasOnly()` checks the FULL post-merge document. With `merge: true` writes, if an existing Firestore document has a legacy field (e.g. `yearsExperience` written by an old app version), that field is preserved in `request.resource.data`. If it is not in the hasOnly list, the update is denied — permanently locking the owner out of editing their profile. This produces a silent save failure (function catches the error, returns false, UI shows "Save failed").

**How to apply:** On any UPDATE rule where the schema has evolved over time and old documents may have extra fields. Keep `hasOnly()` on CREATE rules (schema is fully controlled at creation time). For badge/stat immutability, keep the equality checks (`verifiedPro == verifiedPro`, etc.) — they are unaffected by this change.

Example (publicProfiles UPDATE):
```
allow update: if isSignedIn()
              && request.auth.uid == userId
              && !request.resource.data.diff(resource.data).affectedKeys().hasAny(['email', 'isAdmin'])
              && request.resource.data.get('verifiedPro', null) == resource.data.get('verifiedPro', null)
              ...
```
