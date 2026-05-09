import subprocess, plistlib, glob, os, sys

profiles = glob.glob(os.path.expanduser(
    "~/Library/MobileDevice/Provisioning Profiles/*.mobileprovision"))

if not profiles:
    print("ERROR: No provisioning profiles found", file=sys.stderr)
    sys.exit(1)

result = subprocess.run(
    ["security", "cms", "-D", "-i", profiles[0]], capture_output=True)
plist = plistlib.loads(result.stdout)
print(plist["UUID"])
