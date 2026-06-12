---
name: Codemagic iOS signing flags
description: Correct CLI usage for app-store-connect in Codemagic — which flags to omit
---

## Rule
Never pass `--certificate-key "$CERTIFICATE_PRIVATE_KEY"` to either `app-store-connect certificates create` or `app-store-connect fetch-signing-files`. The key is already available to the CLI via the `apple_credentials` env group; passing it as a flag causes a CLI error.

**Why:** The `CERTIFICATE_PRIVATE_KEY` env var in the `apple_credentials` group is auto-detected by the `app-store-connect` CLI. Supplying it again via `--certificate-key` causes a conflict/parse error that fails the signing step.

**How to apply:**
```bash
# Correct:
app-store-connect certificates create --type IOS_DISTRIBUTION 2>/dev/null

app-store-connect fetch-signing-files "$BUNDLE_ID" \
  --type IOS_APP_STORE \
  --create
```

Apple Team ID: XZ68HMHPP4. Bundle ID: com.duttonconnect.app.
