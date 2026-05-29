# GitHub App private key rotation

The engine signs installation-token requests with the GitHub App private key, stored as
`GITHUB_APP_PRIVATE_KEY_B64` (base64 of the PEM, single line) in each site's Worker secrets.

The key is PKCS#1 RSA as GitHub issues it. The engine wraps it to PKCS#8 in-process before
calling Web Crypto's `importKey`, so no external conversion tool is needed at signing time.
The conversion is exercised on every signing call, including the healthz self-test.

## When to rotate

On suspected exposure, on a maintainer change, or on a routine schedule.

## Steps

1. In the GitHub App settings, generate a new private key. GitHub issues PKCS#1 PEM.
2. Base64-encode the PEM to a single line: `base64 -w0 new-key.pem`.
3. Set the new value on each consuming site's Worker:
   `npx wrangler secret put GITHUB_APP_PRIVATE_KEY_B64`.
4. Hit `/admin/healthz` on each site and confirm the signing self-test passes
   (`"ok": true` in the JSON response).
5. Delete the old key in the GitHub App settings.
6. Shred the local PEM files: `shred -u new-key.pem`.

## Verification

`/admin/healthz` signs a dummy JWT through the real PKCS#1-to-PKCS#8 conversion and Web
Crypto import and sign path, with no network call and no key material in the response. A
`"ok": true` response confirms the new key works end to end before the old one is removed.

## Dev env note

In the showcase dev environment (no `GITHUB_APP_PRIVATE_KEY_B64` Worker secret),
`/admin/healthz` returns `"ok": false` with `"detail": "GITHUB_APP_PRIVATE_KEY_B64 is not
configured"`. This is expected. The live green `ok: true` check is verified at each site's
deploy in Plan 08 and on every subsequent rotation as described above.

## Bundle sanity check

Before deploying a new engine version, `npm run build` in the showcase app is the standing
bundle sanity check. The E2E CI runs it as part of the pre-test build step. Per-site
`wrangler deploy --dry-run` guards land with each site's CI in Plan 08.
