import os, sys

pbxproj = "artifacts/dutton-toolkit/ios/App/App.xcodeproj/project.pbxproj"
team_id = os.environ.get("APPLE_TEAM_ID", "")

if not team_id:
    print("ERROR: APPLE_TEAM_ID env var not set", file=sys.stderr)
    sys.exit(1)

with open(pbxproj) as f:
    content = f.read()

content = content.replace(
    "PRODUCT_BUNDLE_IDENTIFIER = com.duttonconnect.app;",
    "PRODUCT_BUNDLE_IDENTIFIER = com.duttonconnect.app;\n\t\t\t\tDEVELOPMENT_TEAM = " + team_id + ";"
)

with open(pbxproj, "w") as f:
    f.write(content)

print("Patched Xcode project with DEVELOPMENT_TEAM:", team_id)
