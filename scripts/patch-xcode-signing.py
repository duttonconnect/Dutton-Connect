import os, sys, re

pbxproj = "artifacts/dutton-toolkit/ios/App/App.xcodeproj/project.pbxproj"
team_id = os.environ.get("APPLE_TEAM_ID", "")
profile_uuid = os.environ.get("PROVISIONING_PROFILE_UUID", "")

if not team_id:
    print("ERROR: APPLE_TEAM_ID env var not set", file=sys.stderr)
    sys.exit(1)
if not profile_uuid:
    print("ERROR: PROVISIONING_PROFILE_UUID env var not set", file=sys.stderr)
    sys.exit(1)

with open(pbxproj) as f:
    content = f.read()

content = content.replace("CODE_SIGN_STYLE = Automatic", "CODE_SIGN_STYLE = Manual")

content = re.sub(
    r'CODE_SIGN_IDENTITY = "[^"]*";',
    'CODE_SIGN_IDENTITY = "iPhone Distribution";',
    content
)

content = re.sub(
    r'(PRODUCT_BUNDLE_IDENTIFIER = com\.duttonconnect\.app;)',
    (
        r'\1' + "\n\t\t\t\t"
        + "DEVELOPMENT_TEAM = " + team_id + ";" + "\n\t\t\t\t"
        + 'PROVISIONING_PROFILE_SPECIFIER = "' + profile_uuid + '";'
    ),
    content
)

with open(pbxproj, "w") as f:
    f.write(content)

print(f"Patched: Manual signing | CODE_SIGN_IDENTITY=iPhone Distribution | team={team_id} | profile={profile_uuid}")
