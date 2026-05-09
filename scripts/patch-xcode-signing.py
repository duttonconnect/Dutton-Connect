import os, sys, re

pbxproj = "artifacts/dutton-toolkit/ios/App/App.xcodeproj/project.pbxproj"
team_id = os.environ.get("APPLE_TEAM_ID", "")

if not team_id:
    print("ERROR: APPLE_TEAM_ID env var not set", file=sys.stderr)
    sys.exit(1)

with open(pbxproj) as f:
    content = f.read()

# Inject DEVELOPMENT_TEAM next to every PRODUCT_BUNDLE_IDENTIFIER for this app.
# Leave CODE_SIGN_STYLE as Automatic so -allowProvisioningUpdates can manage signing.
updated = re.sub(
    r'(PRODUCT_BUNDLE_IDENTIFIER = com\.duttonconnect\.app;)',
    r'\1\n\t\t\t\tDEVELOPMENT_TEAM = ' + team_id + ';',
    content
)

if updated == content:
    print("WARNING: PRODUCT_BUNDLE_IDENTIFIER not found — project may not be patched", file=sys.stderr)
else:
    print(f"Patched {updated.count('DEVELOPMENT_TEAM = ' + team_id)} occurrence(s) with DEVELOPMENT_TEAM={team_id}")

with open(pbxproj, "w") as f:
    f.write(updated)
