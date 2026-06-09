# GitHub App private-key rotation (cairn-cms)

The commit path signs a GitHub App JWT in-Worker with Web Crypto (no octokit). The App's
machine identity is separate from the editor auth, so rotating its key never touches your
editors' sessions. This page walks you through a rotation and the one brittle step in it
(the key-format conversion).

## What's stored

Each site holds the App private key as a single-line base64 of the PEM, in the worker secret
**`GITHUB_APP_PRIVATE_KEY_B64`** (alongside `GITHUB_APP_ID` and `GITHUB_APP_INSTALLATION_ID`).
The machine-local copy lives in `~/.dotfiles/secrets/values.age` and `~/.local/secrets`; the
workspace `CLAUDE.md` records the IDs.

## The conversion step (why it's brittle)

GitHub issues App keys in **PKCS#1** (`-----BEGIN RSA PRIVATE KEY-----`), and Web Crypto's
`importKey('pkcs8', …)` only accepts **PKCS#8**, so `github.ts` wraps the PKCS#1 DER in a PKCS#8
envelope in-process (`pkcs1ToPkcs8`: a fixed RSA `AlgorithmIdentifier` plus DER length octets).
A malformed key, a PKCS#8-format key, or a botched base64 round-trip breaks signing, and you
only find out when an editor saves.

Two guards already cover you. A unit test signs and verifies a JWT from a PKCS#1 fixture
(`github-commit.test.ts`), and `/admin/healthz` signs a dummy JWT against the *live* key and
returns `{ ok, checks.githubAppSigning }` (signed-in editors only). Hit `/admin/healthz` right
after any rotation or deploy, so you confirm the key still loads and signs before relying on save.

## Rotation procedure

1. **Generate a new key** in the GitHub App settings (Settings, then Developer settings, then
   GitHub Apps, then cairn-cms, then Private keys, then *Generate a private key*). GitHub
   downloads a `.pem` (PKCS#1). Keep the old key valid until step 5.
2. **Base64-encode it single-line:** `base64 -w0 cairn-cms.YYYY-MM-DD.private-key.pem`.
3. **Update the encrypted registry.** Write the new value to `GITHUB_APP_PRIVATE_KEY_B64` in
   `~/.dotfiles/secrets/values.age` and `~/.local/secrets`, then shred the loose `.pem`. Record
   the rotation in `~/.dotfiles/secrets/registry.md`.
4. **Push to each worker:** `wrangler secret put GITHUB_APP_PRIVATE_KEY_B64` for `ecnordic` and
   `907-life` (or the `sync.sh` that wraps it). The App ID and installation ID are unchanged.
5. **Verify, then revoke the old key.** Sign in to each site's `/admin`, open `/admin/healthz`,
   and expect `{"ok":true,…}`. Then delete the old key in the GitHub App settings.

If `/admin/healthz` returns `ok:false`, the `detail` field names the failure (bad base64, import
rejected, etc.) without leaking the key. Fix the secret and re-push before revoking the old key.

## Why not `jose`/`importPKCS8`?

`jose` is the mainstream pick, but `importPKCS8` still needs a PKCS#8 PEM, so GitHub's PKCS#1 key
would *still* require the same `pkcs1ToPkcs8` conversion. Adopting it removes the JWT-assembly
code without touching the brittle DER step. The detection guards above (the fixture test plus
`/admin/healthz`) cover the actual failure mode, so the lean zero-dependency signer stays.
Revisit if a future need (richer JWS handling, for example) justifies the dependency.
