# GitHub App private-key rotation (cairn-cms)

The commit path signs a GitHub App JWT in-Worker with Web Crypto (no octokit). The signer is
bespoke and stays that way. Better-auth replaced only the *editor* auth, not the App machine
identity. This note documents rotation and the one brittle step (M2 in the architecture critique).

## What's stored

Each site holds the App private key as a single-line base64 of the PEM, in the worker secret
**`GITHUB_APP_PRIVATE_KEY_B64`** (plus `GITHUB_APP_ID`, `GITHUB_APP_INSTALLATION_ID`). The
machine-local copy lives in `~/.dotfiles/secrets/values.age` + `~/.local/secrets`; see the
workspace `CLAUDE.md` for the IDs.

## The conversion step (why it's brittle)

GitHub issues App keys in **PKCS#1** (`-----BEGIN RSA PRIVATE KEY-----`). Web Crypto's
`importKey('pkcs8', …)` only accepts **PKCS#8**, so `github.ts` wraps the PKCS#1 DER in a PKCS#8
envelope in-process (`pkcs1ToPkcs8`: a fixed RSA `AlgorithmIdentifier` + DER length octets). A
malformed key, a PKCS#8-format key, or a botched base64 round-trip breaks signing. The
failure only shows up when an editor saves.

**Guards already in place:** a unit test signs + verifies a JWT from a PKCS#1 fixture
(`github-commit.test.ts`); `/admin/healthz` signs a dummy JWT against the *live* key and returns
`{ ok, checks.githubAppSigning }` (signed-in editors only). Hit `/admin/healthz` right after any
rotation or deploy to confirm the key still loads and signs before relying on save.

## Rotation procedure

1. **Generate a new key** in the GitHub App settings (Settings → Developer settings → GitHub
   Apps → cairn-cms → Private keys → *Generate a private key*). GitHub downloads a `.pem`
   (PKCS#1). Keep the old key valid until step 5.
2. **Base64-encode it single-line:** `base64 -w0 cairn-cms.YYYY-MM-DD.private-key.pem`.
3. **Update the encrypted registry** (`~/.dotfiles/secrets/values.age` → `GITHUB_APP_PRIVATE_KEY_B64`,
   and `~/.local/secrets`); shred the loose `.pem`. Record the rotation in
   `~/.dotfiles/secrets/registry.md`.
4. **Push to each worker:** `wrangler secret put GITHUB_APP_PRIVATE_KEY_B64` for `ecnordic` and
   `907-life` (or the `sync.sh` that wraps it). The App ID / installation ID are unchanged.
5. **Verify, then revoke the old key.** Sign in to each site's `/admin` and open `/admin/healthz`
   → expect `{"ok":true,…}`. Then delete the old key in the GitHub App settings.

If `/admin/healthz` returns `ok:false`, the `detail` field names the failure (bad base64, import
rejected, etc.) without leaking the key. Fix the secret and re-push before revoking the old key.

## Why not `jose`/`importPKCS8`?

`jose` is the mainstream pick, but `importPKCS8` still needs a PKCS#8 PEM. GitHub's PKCS#1 key
would *still* require the same `pkcs1ToPkcs8` conversion, so `jose` removes the JWT-assembly code
but not the brittle DER step. The detection guards above (fixture test + `/admin/healthz`) cover
the actual failure mode, so the lean zero-dependency signer is retained. Revisit if a future need
(e.g. richer JWS handling) justifies the dependency.
