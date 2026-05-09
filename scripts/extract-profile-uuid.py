import subprocess, plistlib, glob, os, sys

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

result = subprocess.run(
    ["security", "cms", "-D", "-i", profiles[0]], capture_output=True)
plist = plistlib.loads(result.stdout)
print(plist["UUID"])
