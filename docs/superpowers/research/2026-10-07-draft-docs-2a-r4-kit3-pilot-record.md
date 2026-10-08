# Stage 2a R4: the SvelteKit 3 correction, record (2026-10-07)

Agent-facing. Scope: the R4 task of the 2a unattended finish, a scoped correction of seven extend
pages after the engine's `@sveltejs/kit` peer moved to `^3` (and `@sveltejs/adapter-cloudflare` to
`^8`). Baseline `9f8f218e`; commits through `140ab482`. Claim lists were built first (one file per
page, run scratch under `$HOME/.cache/claude-tmp/2a-run/r4-claims/`, not in the repo), then facts,
then pages.

## Commits (oldest first)

| Commit | Subject |
|---|---|
| `e397f3cf` | File the SvelteKit 3 facts the 2a page redrafts need and correct the channel origin fact |
| `1bd5a086` | Correct and extend extend facts for SvelteKit 3 (R4) |
| `03ec19e5` | Correct security-model for SvelteKit 3 |
| `2d25a811` | Correct add-a-custom-admin-screen for SvelteKit 3 |
| `344c2100` | Correct theme-your-public-site for SvelteKit 3 |
| `768f43d4` | Correct replace-magic-links-with-cloudflare-access for SvelteKit 3 |
| `666720bc` | Correct choose-an-ai-posture for SvelteKit 3 |
| `6ea06c56` | Correct architecture for SvelteKit 3 |
| `d2dc7376` | Correct add-cairn-to-a-sveltekit-app for SvelteKit 3 |
| `140ab482` | Support the add-cairn Node types step with a fact |

## Per page

### add-cairn-to-a-sveltekit-app (`d2dc7376`, then `140ab482`)

Changes:
- Version-pin paragraph states SvelteKit 3 and adapter-cloudflare 8 with no pin; one sentence in the
  opening for an existing app still on `^2` (stops with `ERESOLVE`); step lead-ins and install commands drop the pin.
- `tsconfig.json` step deleted (the Kit 3 scaffold extends `$app/tsconfig`); `vite.config.ts` step renumbers 5 to 4.
- Existing-app `svelte.config.js` clause becomes two sentences: the file fails the build on Kit 3, and the app moves its kit options into `sveltekit()` and deletes it.
- Both `csrf: { checkOrigin: false }` blocks and the handoff paragraph deleted; the section, its objective, and the define-plugin step lose the handoff (heading renamed). New origin-check paragraph on f:7rehzh, f:3cekcy, f:ytwrgp.
- `App.Platform` clause becomes the `cloudflare:workers` and `Env` clause (f:vvgpr5).
- Every `$lib` import in the admin and entry route samples becomes `#lib` (Kit 3 removes `$lib`; the scaffold already carries `#lib`).
- Re-test fix: hooks sample imports `Handle` from `@sveltejs/kit/hooks` (f:hk3hdl), carries `/// <reference types="node" />`, step 1 installs `@types/node` with the dev package; one sentence says why the flag test reads `process.env` (f:f21bcz).
- Final fix (`140ab482`): f:4lcto0 filed and cited with f:g48ytv on step 1 and the hooks step (f:g48ytv moves from cut to carried); the doctor clause reads "warns on it" to match `security-model.md` (f:ytwrgp is a warning-severity check).

Scoped reads: register fix and fact fix, both applied (8 rewrites; f:ytwrgp amended to name `cairn doctor`, f:ntdafg platform env to Worker env, f:pgeeq3 filed for `#lib`). Re-test (milestones 1 to 3, a fresh `sv create` Kit 3 scaffold, `./field-notes`) passed every exercised page step but failed `svelte-check` on the hooks sample (Handle import; `process` untyped). One scoped redraft, then the re-test passed.

Unexercised steps (no remote account, no push, or no registry release):
- `npx wrangler login`, the real `wrangler deploy` (ran `--dry-run`: pass, ASSETS binding listed), Verify the deployed site, Deploy a change.
- Push the site to GitHub (steps 1 to 3); milestone 4 in full; the deployed `/admin` refusal page; the sign-in email; the GitHub App; `bootstrapOwner`.
- Engine install: the registry serves 0.98.0 on SvelteKit 2 (`ERESOLVE` on `peer @sveltejs/kit@"^2.70"`), so the engine went in through `link:consumer` after hand-declaring the packages. Disposed "unexercised: unreleased engine".

### security-model (`03ec19e5`)

Changes:
- CSRF protection section rewritten: SvelteKit's origin check covers every route, `/admin` included; the guard adds the double-submit token on unsafe `/admin` form posts; no `checkOrigin` handoff (f:gncd64 rejected).
- "Why no Origin check" argument replaced: the admin keeps its `Origin` because it serves `strict-origin` (f:ubuj1w, f:hl5asm); the Fetch Standard premise stays (f:x2stjk); `checkOrigin` removal sentence follows the one-global-setting sentence.
- Limits of CSRF protection: `strict-origin` on `/admin` only; a site-wide `no-referrer` still breaks other same-origin form posts; the doctor's `config.no-referrer-blanket` and `config.csrf-trusted-origins` (warns on `'*'` or `'null'`, f:ytwrgp).
- Guard order list loses the origin step (five steps); header list reads `strict-origin` plus the referrer meta tag; CSP home is the `csp` key of the `sveltekit()` call; dev-flag read is "the Worker env alone" (f:tkpmxr); the auth-channel origin sentence no longer says the guard restores the origin check (f:8u4iiv rewritten); responsibilities bullet on `checkOrigin` deleted or inverted.

Scoped reads: register fix and fact fix, both applied (9 rewrites; f:x2stjk amended; f:hl5asm filed).

### add-a-custom-admin-screen (`2d25a811`)

Changes:
- Read-the-table snippet reads `env.APP_DB` from `cloudflare:workers` (`requireAppDb()`, f:onqm6k, f:vvgpr5).
- Section action typed with the generated `Env` (f:esp93u, f:n52h8f); snippet-skip reasons reworded.
- Audit-sink hooks snippet: `building` from `$app/env`, `env` and `waitUntil` from `cloudflare:workers`; the `waitUntil` sentence now says the handle binds nothing and a caller with an `ExecutionContext` binds `ctx.waitUntil` (f:ph6kjg, f:i8pbhc).
- `invalidateAll()` becomes `refreshAll()` (f:jra92k); `SubmitFunction` imported from `$app/forms`, code only (f:wd78d2); `Handle` imported from `@sveltejs/kit/hooks`, code only (f:hk3hdl).

Scoped reads: register accept, fact accept, one advisory polish round applied (three rewrites; f:hk3hdl filed; f:esp93u Source corrected). Compile check on the page's snippets: 0 errors.

### Substitution pages (no scoped reads, per the governing plan's exemption for substitution-only edits)

- theme-your-public-site (`344c2100`): one sentence "alias" to "subpath import" (f:n4rg1z), brief and plan rows with it.
- replace-magic-links-with-cloudflare-access (`768f43d4`): one line.
- choose-an-ai-posture (`666720bc`): two lines.
- architecture (`6ea06c56`): `$app/environment` to `$app/env` in the page, brief, plan, and `docs/internal/outlines/extend.json`. The hand list said "leave alone"; the claim list found L61 stale.

## Facts added or changed

- New: f:wd78d2, f:i8pbhc, f:4ckvnm, f:ytwrgp (`e397f3cf`); f:hk3hdl, f:pgeeq3, f:hl5asm (`1bd5a086`); f:4lcto0 (`140ab482`, `[verified]`: on a fresh Kit 3 scaffold a hooks module reading `process.env` fails `svelte-check` until `@types/node` is installed and named, because `$app/tsconfig` sets `types` to `["$app/types"]`).
- Rewritten in place (ids kept): f:8u4iiv (the guard adds no Origin compare; `e397f3cf`), f:esp93u, f:ntdafg (Worker env), f:x2stjk, f:ytwrgp (names `cairn doctor`) (`1bd5a086`).
- Moved: f:g48ytv from cut to carried in the add-cairn brief and plan (`140ab482`).

## The R4 file-set review

The fresh-context review of the R4 file set returned one finding: the add-cairn Node types step and hooks step had no fact behind them. `140ab482` is that fix (f:4lcto0 plus the doctor "warns" wording). This record is the commit after it.

## Engine and tooling friction found

Filed in the friction log at checkpoint 1 on `main` (not in this worktree; verify each first):
- `@glw907/cairn-cms-dev` ships `.ts` source that fails a consumer's `svelte-check` (`cloudflare:workers`, `node:sqlite` in `handle.ts` and `channel-db.ts`); not retried after adding `@types/node`.
- The stale-manifest build error names `npm run cairn:manifest`, a script a site lacks; the page uses `npx cairn-manifest`.
- `link:consumer` refuses a site that declares neither package, so a fresh site following add-cairn must hand-declare them first.
- A `snippet-check-skip` on the hooks snippet hid the `Handle` import error, and no gate typechecks page snippets against a fresh scaffold (`process` is untyped there).
- Related, not R4-specific: fact Sources drift in range after Kit 3 shrank files (`check:facts` cannot see in-range drift).
