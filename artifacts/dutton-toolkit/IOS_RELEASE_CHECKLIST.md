# Dutton Connect iOS release checks

## Before starting Codemagic

- Build the GitHub commit containing these startup fixes, using `ios-release`.
- Keep the bundle identifier `com.duttonconnect.app`.
- Keep the saved App Store distribution certificate and matching provisioning
  profile available to the `apple_credentials` environment group / iOS signing
  configuration. The workflow uses `xcode-project use-profiles` to configure signing
  and `xcode-project build-ipa` to archive/export.
- Confirm these **web client** settings belong to the Dutton Connect Firebase
  project in the Codemagic workflow:
  - `VITE_FIREBASE_API_KEY`
  - `VITE_FIREBASE_AUTH_DOMAIN`
  - `VITE_FIREBASE_PROJECT_ID`
  - `VITE_FIREBASE_STORAGE_BUCKET`
  - `VITE_FIREBASE_MESSAGING_SENDER_ID`
  - `VITE_FIREBASE_APP_ID`
- Keep Firebase Authentication's email/password provider enabled.

This app uses the Firebase JavaScript SDK, not a native Firebase plugin.
`GoogleService-Info.plist` is not required by its current implementation.
Vite embeds the client settings during `cap:build`; changing them after building
the JavaScript does not update the installed app.

## What the workflow verifies

1. Required Firebase build variables are present, without printing their values.
2. `cap:build` generates `dist/public/index.html`, an asset manifest, and the
   referenced JavaScript, CSS, and lazy-loaded chunks.
3. `cap:sync` copies those assets and `capacitor.config.json` into the iOS project.
4. The copied bundle passes the same asset checks before archiving.
5. Signing uses the matching Dutton Connect profile and Apple Distribution identity.

The iOS app loads its **bundled** web files. It does not depend on the Replit
preview server or a configured production `server.url` for its first screen.

## Startup changes

- Native Firebase Auth uses explicit persistence without the browser popup/redirect
  resolver. Web authentication retains its existing initializer.
- Firebase initialization failures are caught and logged instead of aborting module
  loading. Existing offline mode remains available if cloud setup is unavailable.
- Session restoration errors and long waits no longer block the first screen forever.
- An import/render error displays a retry screen instead of an empty WebView.
- Native startup unregisters PWA workers and removes the old PWA cache; native assets
  are already packaged with the app.
- Removed the app-bound navigation restriction that had no corresponding domain list.
- Account-state storage write errors no longer crash startup effects.

## Verification limits

Local syntax checks, mocked Firebase initialization checks, and bundle-verifier
fixture checks passed. The full Vite build and preview were blocked by incomplete
dependency installation in Replit (`vite: command not found`).

An iOS archive cannot be built or launched in this Linux environment. A successful
Codemagic archive plus a launch of the new TestFlight build is still required to
confirm the login/home screen on iPhone. Existing installed builds do not receive
these changes automatically.
