---
name: Codemagic iOS signing flags
description: Correct CLI usage for app-store-connect in Codemagic — which flags to omit
---

## Rules
1. Never pass `--certificate-key "$CERTIFICATE_PRIVATE_KEY"` — causes a CLI error (the distribution cert key is auto-detected, passing it again conflicts).
2. Always pass the three App Store Connect API credentials explicitly: `--issuer-id`, `--key-id`, `--private-key`. The CLI's env-var auto-detection of `APP_STORE_CONNECT_ISSUER_ID` / `APP_STORE_CONNECT_KEY_IDENTIFIER` / `APP_STORE_CONNECT_PRIVATE_KEY` is unreliable on some Codemagic runner images even when the `apple_credentials` group is declared.

**Why for rule 2:** The `apple_credentials` environment group is defined in the workflow, but the `app-store-connect` CLI still reported "Missing value ISSUER_ID" — meaning env-var auto-detection failed on the actual runner image. Passing flags explicitly works regardless of runner behaviour.

**How to apply:**
```bash
# Correct — explicit API credentials, no --certificate-key:
app-store-connect certificates create \
  --type IOS_DISTRIBUTION \
  --issuer-id "$APP_STORE_CONNECT_ISSUER_ID" \
  --key-id "$APP_STORE_CONNECT_KEY_IDENTIFIER" \
  --private-key "$APP_STORE_CONNECT_PRIVATE_KEY" 2>/dev/null

app-store-connect fetch-signing-files "$BUNDLE_ID" \
  --type IOS_APP_STORE \
  --issuer-id "$APP_STORE_CONNECT_ISSUER_ID" \
  --key-id "$APP_STORE_CONNECT_KEY_IDENTIFIER" \
  --private-key "$APP_STORE_CONNECT_PRIVATE_KEY" \
  --create
```

Note: `--private-key` here = `APP_STORE_CONNECT_PRIVATE_KEY` (API auth key). Completely different from `--certificate-key` / `CERTIFICATE_PRIVATE_KEY` (the iOS distribution cert key).

Apple Team ID: XZ68HMHPP4. Bundle ID: com.duttonconnect.app.
