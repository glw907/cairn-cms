# Scratch site and the operator class

Docs reset pass 1, Task 3. Records what the scratch site is, how the runner mints and scopes its
GitHub credential, what each `cairn auth check` row does under the scoped tokens, the live
verification of `cairn auth set`'s refusal, and the teardown pass 2a's close runs.

## The site

- Repository: `glw907/cairn-scratch-b` (private), id `1384270163`, default branch `main`. HEAD
  commit `5ed23f8bdbe745de02472ea99a86f6cf08510d37` (a single "Initial commit from
  create-cairn-site" commit, the tracked files `packages/create-cairn-site`'s own scaffold action
  produces from `templates/waymark`, with `finalize.mjs`'s real `createGithubApp` identity and a
  minimal `wrangler.jsonc`).
- Worker: `cairn-scratch-b`, deployed over the Task 0 placeholder. Current version id
  `9d591b21-15f2-4417-9c8f-b46d56fef60a`. Bindings: `AUTH_DB` (D1 `cairn-scratch-b-auth`,
  `1fe11784-f64e-408f-8bc2-029e997c11a9`, migrations applied), `ASSETS`, `PUBLIC_ORIGIN`
  (`https://cairn-scratch-b.glw907.workers.dev`). No `APP_DB`, no `MEDIA_BUCKET`, no
  `send_email`: the scratch site exists only for the docs-and-binary reader class's read-only
  `cairn` checks, never for an editor session, so the signups and media-library extras (each its
  own D1 or R2 resource Task 0 never provisioned) are left out rather than pointed at fake ids.
  The `GITHUB_APP_PRIVATE_KEY_B64` Worker secret is set from the shared cairn-cms App identity
  (`GITHUB_APP_ID` `3847496`, the same App and installation `135372268` that already covers
  `ecxc-ski` and `907-life`, per `docs/internal/credentials.md`); `src/theme/cairn.config.ts`'s
  `createGithubApp` call carries `owner: 'glw907', repo: 'cairn-scratch-b', appId: '3847496',
  installationId: '135372268'`, written by the real `finalizeGithubIdentity` (never hand-edited).
- Live checks against the deployed Worker: `GET /` returns 200; `GET /healthz` returns
  `{"ok":true,"checks":{"githubAppSigning":{"ok":true}}}` (the real GitHub App key signs
  correctly); `GET /admin` redirects to sign-in (303), confirming the auth guard is live.
- Deviation from a full setup-command run: the interactive GitHub-App-creation chapter (a live
  browser manifest flow) was skipped, per the task's own instruction to reuse the existing
  cairn-cms App installation. The repository, Worker, and D1 already existed from Task 0, so the
  scaffold, package-tarball install, config finalize, build, migration, secret, and deploy steps
  ran directly (each the same code the setup command itself runs: `scaffoldSite`,
  `finalizeGithubIdentity`, `wrangler d1 migrations apply`, `wrangler secret put`, `wrangler
  deploy`), rather than through the live interactive CLI.

## Deliverable 6 (owner addition): the packed-tarball cache

`scripts/docs-readers/lib/prepare-class.ts`'s `packEngineTarballs` now takes an optional
`cacheRoot`. `tarballCacheKey` returns HEAD's own commit hash only when `git status --porcelain`
is clean across `packageInputPaths(repoRoot)`: `PACKAGE_FIXED_INPUTS` (`src/lib`,
`packages/cairn-cms-dev`, `package.json`, `package-lock.json`, `svelte.config.js`,
`tsconfig.json`, `scripts/build`, `README.md`, `LICENSE`) plus every entry `package.json`'s own
`files` field ships into the tarball (`migrations`, `migrations-channel`, `skills`, `claude`,
`CHANGELOG.md`, and each docs arm: `docs/README.md`, `docs/why-cairn.md`, `docs/reference`,
`docs/admin`, `docs/editors`, `docs/extend`), `dist` excluded (the build's own output, whose
freshness already follows `src/lib`, not a second input to key against): every one of the
`files`-listed paths reaches the tarball unbuilt, copied as-is, so a dirty docs page (exactly the
shape of change this initiative makes) needs its own place in the check rather than riding along
with `src/lib`'s. A dirty tree in any of these paths returns no key, so the
caller always rebuilds. A hit under `<cacheRoot>/tarballs/<key>/{engine,dev}.tgz` skips `npm run
package` and both `npm pack` calls entirely, and touches the key's own directory mtime, so a key
kept in active use is not the one `pruneTarballCache` evicts next. `pruneTarballCache` keeps the
newest three keys by directory mtime. The startup sweep (`lib/sweep.ts`) preserves the `tarballs/`
cache root by name, alongside `results/` and `ledger.jsonl`, alongside the run-id and live-check
scratch patterns it does remove.

Timing from this task's own scratch-site preparation (this worktree's real `npm run package`,
`src/lib` and `packages/cairn-cms-dev` clean at HEAD): a cold build (cache miss) took **27,863
ms**; a second call for the same clean HEAD (cache hit) took **25 ms**, reading both tarballs
straight from `~/.cache/docs-readers/tarballs/a4355360924ac32f265965908ffe0e26d5536c2c/`.

Unit tests (`src/tests/unit/docs-readers-prepare-class.test.ts`, `describe('packEngineTarballs:
the tarball cache')`): a cache hit skips `npm run package` and both `npm pack` calls; a dirty tree
(a fake `git status --porcelain` line under a cached path) bypasses the cache and rebuilds even
though a cached pair already exists for that HEAD; a different HEAD rebuilds under its own key
while the old key's cache survives; a fifth build across four distinct HEADs prunes down to the
newest three keys.

## Per-batch GitHub App installation-token minting

`scripts/docs-readers/lib/github-app-token.ts` (`signAppJwt`, `mintInstallationToken`) signs a
ten-minute RS256 App JWT and posts it to `POST /app/installations/{id}/access_tokens` with
`{"repositories":["cairn-scratch-b"],"permissions":{"contents":"read","metadata":"read"}}`,
verifying the response's own `repositories` list is exactly what was requested before returning
the token (a mismatch throws rather than handing a reader a wider-scoped credential than its
class declares). `run.ts`'s `operatorSecretResolver` mints this the first time a job asks for
`CAIRN_GH_READ_TOKEN`, caches it, and re-mints once the cached token is within ten minutes of its
own one-hour expiry (GitHub's own installation-token lifetime), since Task 4's batches run several
jobs, each with its own timeout, and can outlive a single mint; two calls racing the same in-flight
or about-to-expire mint always share one mint, never two. `CAIRN_CF_READ_TOKEN` maps onto the host
secret `CAIRN_SCRATCH_CF_TOKEN`. Neither the App's private key nor `CAIRN_SCRATCH_CF_TOKEN` is
ever handed to a reader directly; only the derived, scoped values are.

**Verified before relying on it** (this task, live, both the minted-token round trip and
`cairn auth check`'s own acceptance of the result):

- A fresh mint (installation `135372268`, repo `cairn-scratch-b`, permissions `contents:read,
  metadata:read`) returned a token whose own `repositories` list was exactly `["cairn-scratch-b"]`.
- `cairn auth check --json`, run directly against the real tool binary (`tool/v1.1.0`,
  `cairn_1.1.0_linux_amd64.tar.gz`, SHA256 verified) with that token as `CAIRN_GH_READ_TOKEN`,
  accepted it: both GitHub-credentialed rows (`Contents`, `Metadata`) returned `pass`.

## `cairn auth check` rows under the scoped tokens

Run bare (`cairn auth check --json`, no site named) and against the one registered site
(`cairn auth check cairn-scratch-b-9f21ac --json`). Verdict both times: `CRITICAL` (exit 2), from
the two `fail` rows below, which are expected under this token's deliberately narrow scope.

| Label | Credential | Scope | Bare result | Named-site result | Expected? | Why |
| --- | --- | --- | --- | --- | --- | --- |
| Workers Scripts | `CAIRN_CF_READ_TOKEN` | account | pass | pass | yes | The account-owned token's one policy (Individual Workers `cairn-scratch-b`, Metadata Read-only) covers this Worker's own metadata. |
| Workers Builds Configuration | `CAIRN_CF_READ_TOKEN` | account | fail (forbidden) | fail (forbidden) | **yes, expected to fail** | Metadata Read-only carries no Builds scope; Task 0 recorded the same token as scoped to metadata alone. |
| Workers Observability | `CAIRN_CF_READ_TOKEN` | account | fail (forbidden) | fail (forbidden) | **yes, expected to fail** | Task 0 already found the account-level telemetry query 403 under this token; `cairn logs` (below) reproduces the same 403 live. |
| Zone | `CAIRN_CF_READ_TOKEN` | account | pass | pass | **weak pass, proves little** | `GET /zones` returns 200 with zero zones in the result. The token carries no Zone permission at all (its one policy is Individual Workers, Metadata Read-only), so this `pass` shows only that the call was not rejected outright, never that the token can actually read a real zone's data; the account itself does hold zones (`ecxc.ski`, `907.life`, and others), so the empty result reflects the token's own view, not an empty account. A meaningful proof needs a token with real Zone scope, which this one deliberately lacks. |
| Zone Settings | `CAIRN_CF_READ_TOKEN` | site | skip (no site named) | unknown (`not-found`) | **yes, expected** | The scratch site carries no domain and no zone id; there is nothing to check. |
| DNS | `CAIRN_CF_READ_TOKEN` | site | skip | unknown (`not-found`) | **yes, expected** | Same: no zone. |
| Email Sending | `CAIRN_CF_READ_TOKEN` | site | skip | unknown (`not-found`) | **yes, expected** | Same: no zone, and email sending is off for this site by design. |
| Contents | `CAIRN_GH_READ_TOKEN` | site | skip | **pass** | yes | The minted token's `contents:read` scope on `cairn-scratch-b`. |
| Metadata | `CAIRN_GH_READ_TOKEN` | account | pass | pass | yes | The minted token's `metadata:read` scope; App metadata is readable for any repository the installation covers. |

`cairn health` (bare, over the one registered site) is a separate, stricter set of checks, not
`auth check`'s per-permission table:

- `serving`: **pass** (after the operator egress fix below).
- `publish-path`: pass (no edits waiting to publish).
- `creds`: **fail**: `cloudflare, via environment, the token was rejected; github, via
  environment, GitHub reports no expiry for this token`. **Expected-failing capability**: this
  check appears to call a broader token-validity endpoint than any single `auth check` row probes
  (a resource-scoped Cloudflare token and a short-lived GitHub installation token both read as
  "not a normal long-lived credential" to it). Recorded here rather than worked around: the
  scratch site's tokens are deliberately narrow, and this is the cost of that, not a defect in the
  minting or the check.
- `delegation`, `deploy`, `errors`, `https-forced`, `engine`: `unknown` (`no zone for this
  domain`, `token lacks a required permission`, `not-observable`), all the same expected
  consequence of no zone and a Workers-Observability-forbidden token.

`cairn logs cairn-scratch-b-9f21ac` (live, as Task 0 asked this task to confirm): `cairn:
cloudflare: forbidden (status 403, code 10000)`, exit 3. Reproduces Task 0's own finding under the
tool itself rather than a raw API probe. **Expected-failing capability**, per Task 0: the token is
never widened for this.

`cairn doctor` (bare, run from a directory holding no cairn site project files, which is exactly
what the docs-and-binary reader's own working directory is): `{"verdict":"UNKNOWN","checks":[]}`,
exit 3. This is `doctor`'s own documented behavior for a directory that is not a cairn site
project, not a failure.

## Denied calls

- **Cloudflare token against another Worker**: `GET
  /accounts/120c269ad6d3dfbe6d63a0bb53758ca0/workers/services/907-life` with
  `CAIRN_SCRATCH_CF_TOKEN` returns `{"success":false,"errors":[{"message":"No access to the
  specified service."}]}`. The same token's own settings route for `cairn-scratch-b` returns 200.
  Re-verifies Task 0's finding under this task's own credential handling.
- **Installation token against another repository**: the real scope proof is the mint response's
  own `repositories` list, already named above: a token requested for `["cairn-scratch-b"]` and
  scoped to installation `135372268` (which also covers `907-life` and `ecxc-ski`) came back
  naming only `cairn-scratch-b`, so GitHub itself narrowed the grant to the one requested
  repository even though the installation covers more. The live denied call below is a second,
  weaker check, recorded for completeness rather than as the scope proof: the token reads `GET
  /repos/glw907/cairn-scratch-b/contents/` as 200 and `GET /repos/glw907/cairn-pub/contents/` as
  404. `cairn-pub` is private and outside this installation entirely, so its 404 shows the
  installation boundary, not the token's own narrower repository scope within that
  installation; `907-life` and `ecxc-ski`, the installation's other two repositories, are both
  public, so a contents read against either would succeed for any token, or none, regardless of
  scope, which is why neither was used for this check.

## `cairn auth set` and a production site name: refused

Both refusals were exercised live, in the actual `docs-and-binary` reader container, as one job
(`npx tsx scripts/docs-readers/live-checks.ts docs-and-binary`; transcript at
`~/.cache/docs-readers/results/docs-and-binary-smoke-20260924t020750-4d3e42/`).

- **`cairn health 907-life`** (a production site name, not in this reader's own one-site
  registry): `cairn: no site named "907-life". Run 'cairn sites list' to see the sites cairn
  knows`, exit 3. The registry itself is the boundary: the reader's `CAIRN_STATE_DIR` holds
  exactly one record (`cairn-scratch-b-9f21ac`, confirmed by its own `cairn sites list` output
  quoting only that one row), so no production site name can ever resolve there.
- **`echo x | cairn auth set CAIRN_GH_READ_TOKEN`**: denied before it ran. Claude Code's own
  permission system refused the Bash call (`denials[0]`, source `permission`), since the
  allowlist's `cairn auth *` patterns name only `auth list` and `auth check*`, and the pipe makes
  this a compound command in any case (the carried-forward finding from Tasks 1 and 2: the
  allowlist refuses a compound command outright). **This alone is not proof**, per this task's own
  added acceptance: a bare (non-piped) `auth set` invocation, or a future allowlist change, could
  in principle reach the binary. So this task additionally ran the real `cairn` binary directly
  inside the same reader image, outside the CLI's own permission system entirely (`podman run
  --rm -i --read-only --tmpfs /tmp --cap-drop=all --unsetenv-all
  localhost/docs-reader:757a08d46af4 cairn auth set CAIRN_GH_READ_TOKEN`, with `echo x` piped on
  stdin): **`cairn: the OS keyring did not open. Set CAIRN_GH_READ_TOKEN in the environment
  instead`**, exit 3. The container itself (no D-Bus socket, no keyring, from Task 1's own
  confinement design) is the boundary that would refuse the write even if the permission layer
  ever let the command through. Both layers are recorded here so a future allowlist change is
  judged against the real backstop, not against the allowlist's own claim.

## A runner-infra fix this task made, not scoped to docs-and-binary alone

`init-baseline.json` had no entry for the host's current Claude Code version (`2.1.281`; Tasks 1
and 2 pinned `2.1.280`). Without a matching entry every class's init check fails
(`verified.init: false`), which is a workstation CLI upgrade between passes, not a docs-and-binary
defect. Re-probed (`run.ts --probe-init --class docs-and-binary`) and added the `2.1.281` entry:
the same 16 skills as `2.1.280`, plus one new builtin plugin (`agents-md@builtin`) that version
itself ships. Fixed here because it blocked this task's own live check from ever reaching
`verified.ok: true`; left for a later task to decide whether the pinned-baseline maintenance needs
its own process.

A second fix, also general rather than docs-and-binary-specific: `scripts/docs-readers/lib/
podman.ts`'s two `cpSync` copies (`prepare`'s host copy, then the copy into the container mount)
each preserve a copied file's permission mode but reset a copied *directory*'s mode to the
process default, so the docs-and-binary class's `state/` registry directory (written at `0700` by
`writeScratchSiteRecord`) reached the container at `0755`, and the Go tool's `store.checkSafePerm`
refused to read it (`store: list /reader/job/state: store: unsafe permissions`). Added
`restrictStateDirPermissions` (`lib/prepare-class.ts`), called after each `cpSync`, which
re-chmods a copied `state/` directory to `0700` and its files to `0600`; a tree with no `state/`
(every other class) is untouched. Unit-tested directly (`describe('restrictStateDirPermissions')`)
and confirmed live: `cairn sites list` inside the reader container now lists the one record
correctly, where the first live run (before this fix) failed with the permissions error above.

A third fix: the operator egress allowlist (`scripts/docs-readers/egress.json`) named only the
Cloudflare and GitHub API hosts, so `cairn health`'s own `serving` check (which fetches the
site's public origin directly) was blocked by the proxy on the first live run (`serving: fail -
the hostname does not answer`). Added `cairn-scratch-b.glw907.workers.dev:443` to the `operator`
egress class, scoped to this one scratch site's own hostname, not a general `workers.dev`
allowance. Confirmed live on the next run: `serving` now passes.

A fourth fix, from review: the startup sweep's first cut reaped every container, network, and
run-id directory carrying the runner's own label outright, with no regard for whether the run
that made them was still alive. Since parallel lanes are planned for this pass, a concurrent
runner (another worktree, another session) would have lost its own live containers to a second
runner's startup sweep. `lib/sweep.ts` now writes an owner marker (the creating process's pid and
its own `/proc` start time, which a reused pid cannot fake) into every run and scratch directory
at creation, and the sweep reaps a directory, and a run id's own labeled containers and network
(filtered by `label=docs-readers.run=<that id>`, never the bare label), only when that marker's
process is no longer the one that wrote it. `STALE_DIR_PATTERN` also gained the
`docs-and-binary-<hex>` stem `live-checks.ts`'s own scratch directory uses, which the first cut
missed. Unit-tested: a live owner's run-id and scratch directories both survive the sweep with no
podman query issued for them at all; a dead owner's (or a missing marker's, treated the same as
dead) directory is reaped along with its own containers and network.

## Teardown for pass 2a's close

Not run in this task; recorded here as the procedure pass 2a's close follows.

1. **Dry-run listing** (no deletion): `gh api repos/glw907/cairn-scratch-b` (confirms the
   repository still exists and its current default-branch commit); `npx wrangler deployments list
   --name cairn-scratch-b` and `npx wrangler d1 info cairn-scratch-b-auth` (confirms the Worker
   and D1 still exist); a listing of every token this task's ledger names
   (`CAIRN_SCRATCH_CF_TOKEN` in `~/.local/secrets` and the age store; no standing GitHub token,
   since installation tokens are minted per run and expire in an hour on their own). Print this
   listing for the owner to read before anything is touched.
2. **Deletion, only on owner confirmation, in this order**: `npx wrangler delete --name
   cairn-scratch-b` (the Worker); `npx wrangler d1 delete cairn-scratch-b-auth` (the D1 database);
   `gh api -X DELETE repos/glw907/cairn-scratch-b` (the repository); remove `cairn-scratch-b` from
   the cairn-cms GitHub App's installation repository list (`gh api -X PATCH
   /user/installations/135372268` is not the right call for a selected-repository install; do
   this in the GitHub UI, the same owner-confirmed-change pattern Task 0 used to add it); revoke
   `CAIRN_SCRATCH_CF_TOKEN`, API first: `DELETE
   /accounts/120c269ad6d3dfbe6d63a0bb53758ca0/tokens/{token_id}` (the token's own id, from `GET
   /accounts/{account_id}/tokens` filtered by name, not the token value itself), falling back to
   the Cloudflare dashboard only if the estate's admin token cannot reach that route; then remove
   its row from `~/.dotfiles/secrets/registry.md` and `~/.local/secrets`.
3. Every deletion is independent and idempotent to re-run (a 404 on a second attempt is success,
   not a failure), so a partially completed teardown is safe to resume.
