import subprocess, plistlib, glob, os, sys

BUNDLE_ID = "com.duttonconnect.app"

search_dirs = [
    "~/Library/MobileDevice/Provisioning Profiles/*.mobileprovision",
    "~/Library/Developer/Xcode/UserData/Provisioning Profiles/*.mobileprovision",
]

profiles = []
for pattern in search_dirs:
    profiles.extend(glob.glob(os.path.expanduser(pattern)))

if not profiles:
    print("ERROR: No provisioning profiles found in any search location", file=sys.stderr)
    sys.exit(1)

# Sort newest-first so stale cached profiles from previous builds are skipped.
profiles.sort(key=lambda p: os.path.getmtime(p), reverse=True)

print(f"Found {len(profiles)} profile(s) on disk (newest first):", file=sys.stderr)
for p in profiles:
    print(f"  {p}", file=sys.stderr)

# Pick the newest profile that matches our bundle ID.
for profile_path in profiles:
    result = subprocess.run(
        ["security", "cms", "-D", "-i", profile_path], capture_output=True)
    if result.returncode != 0:
        print(f"  SKIP (decode failed): {profile_path}", file=sys.stderr)
        continue
    try:
        plist = plistlib.loads(result.stdout)
    except Exception as e:
        print(f"  SKIP (plist parse failed): {profile_path}: {e}", file=sys.stderr)
        continue

    app_id = plist.get("Entitlements", {}).get("application-identifier", "")
    uuid = plist.get("UUID", "")
    name = plist.get("Name", "")
    print(f"  Checking: {name} ({uuid}) app-id={app_id}", file=sys.stderr)

    if BUNDLE_ID in app_id:
        print(f"SELECTED: {name} ({uuid})", file=sys.stderr)
        print(uuid)
        sys.exit(0)

# Fallback: use the newest profile regardless of bundle ID.
print("WARNING: no profile matched bundle ID — falling back to newest profile", file=sys.stderr)
result = subprocess.run(
    ["security", "cms", "-D", "-i", profiles[0]], capture_output=True)
plist = plistlib.loads(result.stdout)
uuid = plist["UUID"]
print(f"FALLBACK: {profiles[0]} ({uuid})", file=sys.stderr)
print(uuid)
