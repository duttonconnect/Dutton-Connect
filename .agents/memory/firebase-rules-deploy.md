---
name: Firebase rules deploy method
description: How to deploy Firestore rules to production in this project (CLI fails with 403)
---

## Rule
Deploy Firestore rules using the Python script with JWT authentication + `firebaserules.googleapis.com` REST API. The Firebase CLI fails with a `serviceusage 403` error in this environment.

**Why:** The Replit sandbox does not have the correct GCP permissions for the Firebase CLI's service usage checks. The REST API with a manually constructed JWT from the service account key bypasses this.

**How to apply:** Run the inline Python script that:
1. Reads `FIREBASE_SERVICE_ACCOUNT_KEY` env var (length ~2381, IS set)
2. Builds and signs a JWT (requires `cryptography` package — already installed)
3. Exchanges JWT for an OAuth2 access token via `https://oauth2.googleapis.com/token`
4. POSTs the rules content to `https://firebaserules.googleapis.com/v1/projects/{project_id}/rulesets`
5. PATCHes `projects/{project_id}/releases/cloud.firestore` to point at the new ruleset

Project ID: `dutton-connect`. Rules file: `artifacts/dutton-toolkit/firestore.rules`.
