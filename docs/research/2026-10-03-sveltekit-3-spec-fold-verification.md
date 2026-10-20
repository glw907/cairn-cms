# SvelteKit 3 spec: fold verification (2026-10-03)

Fresh-context read of `docs/superpowers/specs/2026-10-03-sveltekit-3-upgrade-design.md` (405 lines,
HEAD `0d41bbd9`) against the pre-fold spec (`d5c2ca98`), the fold record, the four reviews, the Kit
3.0.0 and adapter-cloudflare 8.0.0 tarballs, the installed Kit 2.70.3 and adapter 7.2.9, and the repo.
New probes ran in this session's scratchpad on wrangler 4.147.0, with the showcase's
`compatibility_date` (2026-08-21) and no compatibility flags. A Chromium probe ran through the repo's
Playwright.

Counts: 0 blocker, 1 major, 6 minor.

## Q1. Did each blocker and major close where the fold record says?

Yes, all of them. The table gives the location for each.

| Finding | Closed at | Check |
|---|---|---|
| M1/R1/C2 prerender throw | spec:95-98, S0 item 1 (spec:276-277) | Stub source confirms the env traps and `withEnv` throw without the proxy (`virtual-cloudflare-workers.js`, `withEnv` block). The dev handles are also gated (spec:97), which matters because the e2e build prerenders behind them. |
| M2 `vite preview` | S2 (spec:291-295) | `preview.log` in the rig shows `ERR_UNSUPPORTED_ESM_URL_SCHEME`. |
| M3/R3/K6 locals override | spec:99-104 | The override key is gone. A new probe shows native `withEnv` working across an `await` in workerd **without** `nodejs_als`, at the showcase's flags. The rig had `nodejs_als` set, so that point was still open before this probe. |
| M4/R2/K2 `originMatches` | spec:160-163 | Holds. |
| K1 public surface | spec:122-138 | Holds. Twenty-four `CairnEvent<` uses in `src/lib` (public callback types in `auth-channel/factory.ts:296-378` and `section-action.ts`) lose the argument. The Consumers must line at spec:371 covers that. |
| C1/K4 S2 can't end green | S3 moved onto Kit 2.70 (spec:296-312) | Kit 2.70.3 `respond.js:73-100` confirmed. The check is `request_origin !== url.origin && (!request_origin \|\| !trusted.includes(request_origin))`, behind `is_form_content_type` and outside `__SVELTEKIT_DEV__`. The literal `"null"` header is never trusted, so it rejects. An absent content type passes. |
| K3 tool major | spec:231-249 | `check_csrf.go` already reads `vite.config.ts` (`check_csrf.go:76-82`), so the repurposing really is a new predicate on existing machinery. |
| K5 ROADMAP watches | spec:259-265 | Holds. |
| C3-C6, C8, C9 | spec:214-216, 317-321, 372-374; 272-288; 301-311; 333-336; 376-377 | Hold. The cross-origin case asserts Kit's body. That matters because `createAuthChannel`'s own `originMatches` also returns 403, so the body is what tells the two refusals apart. |
| C7 | Ruling 1 | Raised. See V3. |
| R4, R5, R6 | spec:307-311; 149-156, 171-174; 233-240, 365-366 | Hold. R4 is closed only together with the live smoke. Either Ruling 1 option runs the real guard with Kit's check on. |

## Findings

### V1 (major): the fold record's suggested cut after S3 would leave `main` unreleasable, with a silent security regression

- **Location:** `docs/superpowers/research/2026-10-03-sveltekit-3-spec-fold.md:211-214`. The spec's segment preamble (spec:269-270) is where the cut would be recorded.
- **Defect:** S3 deletes guard Rule 2 and `config.csrf-disable-missing`, and it ships the v2 doctor, while the engine still peers on Kit `^2.70`. Every existing consumer was told by the v1 doctor and the old templates to set `checkOrigin: false`. On a post-S3 Kit 2 engine, such a site loses its only non-admin Origin check: Rule 2 is gone and Kit's check is off. The v2 doctor flags only `'*'`, so the site gets no warning either. The CLAUDE.md contract is "`main` stays releasable". In `0.x`, a patch cut from that `main` also flows into `^0.98.x` ranges.
- **Fix:** If the pass splits, cut after S2. The first half (S0 spike, S1 deprecations and Vite-plugin config, S2 harness host move) changes no runtime security behavior and is safely releasable. The second half runs S3 through S5, so the CSRF handover and the Kit 3 peer land together. If the conductor keeps one pass, nothing changes: the segments live on the pass worktree. See the split recommendation below.

### V2 (minor): the `node:sqlite` stop rule is worded so it can pass falsely, and its contingency is now certain

- **Location:** spec:280-282, spec:286-287.
- **Evidence (new probe):** In workerd at the showcase's compatibility date, `await import('node:sqlite')` resolves, but `new DatabaseSync(':memory:')` throws `Illegal constructor`. A check for "absent" sees the import succeed and proceeds. `channel-db.ts:45` then fails at runtime.
- **Consequences:** The local-D1 move for the members fixture is not contingent. It is S2 scope: drop the `MEMBER_DB` double in `membersDevHandle`, apply local migrations in the e2e `webServer` command, and have `/test/reset-members` reset the D1. It also leaves `createChannelDb`, a public `@glw907/cairn-cms-dev` export with a facts bullet, with no in-repo consumer, and the spec doesn't rule on it.
- **Second evidence (new probe):** `process` exists in that same workerd configuration, and `process.env` carries the `vars` values. So `devBackendOptIn()` (`dev-gate.ts:24-25`, read at module scope by `hooks.server.ts:19`, `cairn.server.ts:23`, and the `/test` routes) works under `wrangler dev` with the flag supplied as a var. S0's worry about the missing `nodejs_compat` (spec:282) is answered for `vars`. `.dev.vars` delivery is the same binding class but was not probed.
- **Fix:**
  - State the probed fact in spec:280-282.
  - Make the local-D1 move an S2 item rather than a stop rule.
  - Rule on `createChannelDb` in one line: keep it for `vite dev` on Node, or retire it.
  - Say that item 3 runs on the Kit 2.70 / adapter 7 showcase (S2's host). Items 1-2 run on the fresh Kit 3 project.

### V3 (minor): Ruling 1 names a "logging transport" that doesn't exist

- **Location:** spec:395.
- **Evidence:**
  - The engine has no logging email transport. `src/lib/email.ts` sends through `env.EMAIL.send`. The showcase's `captureDeliver` serves only the members channel and refuses without the dev flag.
  - New probe: under `wrangler dev`, a local `send_email` binding answers with a `messageId`. It writes the message body to `.wrangler/tmp/email/.../email-text/<id>.txt` and logs that path.
- **Fix:** Replace the phrase with "the magic link read from the message file wrangler's local `send_email` emulation writes". The ruling's costs and recommendation stand.

### V4 (minor): the admin referrer meta was stated from a spec citation; it now has a probe, and one placement caveat is unstated

- **Location:** spec:70-72, spec:150-156.
- **Evidence (new Chromium probe):**
  - With a response header `Referrer-Policy: no-referrer` and `<meta name="referrer" content="strict-origin">` in the head, a JS-free form POST sent `origin=http://localhost:4321`.
  - It sent the same Origin when an earlier `<meta name="referrer" content="no-referrer">` came first, which is the shape of an `app.html` meta placed before `%sveltekit.head%`.
  - The mechanism holds. The spec's mechanism (HTML's last-processed meta wins) implies that a site meta placed after `%sveltekit.head%` would override cairn's meta. That case was not probed.
- **Fix:**
  - Cite the probe in the Evidence bullet.
  - At spec:152, say "its `app.html` (a meta before `%sveltekit.head%`, the SvelteKit default position)".
  - Optionally add the after-head case to the reworded `config.no-referrer-blanket` text.

### V5 (minor): an open reading is pushed to the plan

- **Location:** spec:110-111 ("the plan checks `dev-flag.ts:89`'s `PUBLIC_ORIGIN` fallback against the same rule").
- **Defect:** `readPublicOrigin` falls back to `process.env.PUBLIC_ORIGIN`. The same Cloudflare-only reasoning that retires the flag's `process.env` reads applies, and the fold's own errata (`dev-backend-flag-refusal`: "the `process.env` leg retires") already assume it.
- **Fix:** Decide it in the spec: the fallback retires with the others. The workstation process rule says a plan carries no open readings.

### V6 (minor): S4 carries work that lands on Kit 2.70, contrary to the segment principle

- **Location:** spec:269-270 vs spec:313-316.
- **Defect:** The subpath-import move (`#lib`, `#chassis`, `#theme` through package.json `imports`) is Node and Vite standard and doesn't depend on Kit 3. Kit 3 forces only the removal of `$lib` (`build-errors.js:521-527`, `module_removed_lib`) and the deprecation of `kit.alias`. Doing the move in S4 inflates the one atomic Opus task, which the fold record already calls near the split threshold. Two items in S4 really are Kit 3-only: `Handle` (Kit 2.70's `@sveltejs/kit/hooks` doesn't export it) and the redirect allowlist.
- **Fix:** Move the subpath imports to S1, gated on a quick `svelte-check` plus build on 2.70. If that check fails, they stay in S4 with a recorded reason.

### V7 (minor): proportionality, about 80 lines cut with no decision, constraint, or acceptance criterion lost

The growth is mostly legitimate: the public-surface table, the doctor major, S2, the rulings, and Consumers must. Each candidate below is restated rationale, inventory, or process narrative.

| Location | Cut | Why safe |
|---|---|---|
| spec:20-21 | "Supporting Kit 2 beside it would need..." | Rationale for a settled decision; the survey holds it. |
| spec:44-47 | vite-plugin-svelte noExternal mechanics | S0 re-proves it. One clause plus the survey cite is enough. |
| spec:85-88, 119-120 | Occurrence counts (141/39, ~150/42) and the helper-name list | Plan sizing, not design. |
| spec:164-168 | Enumeration of the token's owners | No decision changes ("the token stays"). One sentence remains. |
| spec:175-178 | Guard-comment and https-page re-read | A plan task note. |
| spec:191-195 | History of the risk lens's two questions | Keep one line: the reviewer reads the fold's three deltas before S3. |
| spec:243-249 | Tombstone argument, `docsAnchor` detail, `site-config-path.json` negation | The fold record carries the argument. The negation exists only to retract an old claim. Keep the decision lines (v2.0.0, three ids retire, new id, Consumers line). |
| spec:255-257 | STATUS rewrite instruction | Close-out procedure; the fold record lists it as owed. |
| spec:322-327 + 389 | "Already rewritten... so that step is done", stated twice | Narrates done work. Keep only the two owed edits. |
| spec:339-340 | Smoke-doc `Origin` header step | A plan task note. |
| spec:352-356 | Facts ids and line numbers | Keep "correct every falsified bullet; add the three new ones". The plan inventories ids. |

The result is about 325 lines, roughly 58% over the original. That is what remains of the grown decision surface, not over-folding. S0 and the S3 proof list stay. They are the acceptance criteria that keep the spike and the CSRF proofs from passing vacuously.

## Q2. Contradictions and buildable order

- **S3 on Kit 2.70 (CSRF):** Buildable. Kit 2.70 rejects `Origin: null` and a foreign Origin before `handle` for form types. The e2e runs `devBackendHandle` instead of the guard, so after S3 the admin documents carry the meta and send a real Origin. The e2e helpers that POST bodyless (`members.spec.ts:26,177`) pass on 2.70 because an absent content type isn't checked there. The only other e2e `request.post` sends JSON (`media-slice.spec.ts:107`). The cross-origin pair works because, as the probe showed, `wrangler dev` keeps the request's own host in `request.url` (`127.0.0.1` vs `localhost`).
- **S2 on adapter 7 under `wrangler dev`:** Buildable. Adapter 7 output is what the showcase's `wrangler.jsonc` deploys (`main: .svelte-kit/cloudflare/_worker.js`), and the e2e workflow already bundles it through `wrangler deploy --dry-run`. The dev package's only `node:` import is `node:sqlite`. With V2's D1 move folded in, nothing blocks workerd. The flag gate works under workerd (V2).
- **Dev backend `node:sqlite` under workerd:** Unusable (V2). The fallback the spec names is the path.
- **No contradiction between sections**, apart from V6's principle mismatch and V5's open reading.

## Q3. New mechanisms: quoted or proven?

| Mechanism | Status |
|---|---|
| Kit 2.70.3 rejects `Origin: null` | Quoted and confirmed (`respond.js:73-100`). |
| `withEnv` throws during prerender | Quoted and confirmed (stub `withEnv` and `withEnvAndExports` throw without the proxy). |
| Adapter 7 output runs under `wrangler dev` | Inferred from production deploys and the dry-run bundle, not probed. The e2e-flagged variant is S0 item 3. Acceptable. |
| Referrer meta governs form POST Origin over a header | Cited, not probed by the fold. Proven now (V4). |
| Repurposed `check_csrf.go` | Existing file already reads `vite.config.ts`; a new predicate only. Kit's `'*'` switch is quoted (`vite/index.js:495`). |
| "Logging transport" for the smoke | Not real (V3). |

## Q4. Rulings for Geoff

- **Ruling 1 (smoke target)** is a genuine budget and risk fork, and the evidence is enough once V3's wording is fixed.
- **Ruling 2 (`@sveltejs/package` major)** is required by the global "ask before a major" rule, and the evidence is enough.
- No decision in the spec is a wrongly taken product fork. Three calls each have one answer: the tool `v2.0.0` under the frozen contract, the 2a sequencing under one-executor-per-worktree, and the R4 choice-one refusal, since either smoke option exercises the real guard. The only item that needs a one-line ruling is `createChannelDb`'s fate (V2). That is a method call under the debt-free decision, not a fork for Geoff.

## Split recommendation

Six segments: S0, S1, S2, S3 (two tasks, engine and doctor), S4 (one atomic Opus task), and S5 (scaffold and docs). That is roughly nine to eleven tasks. One pass holds them under the segment discipline, as long as V6 moves the subpath imports out of S4.

If the token ceiling forces a split, cut **after S2, not after S3** (V1):

- **Pass A** is S0, S1, and S2. It is releasable and has no behavior change.
- **Pass B** is S3, S4, and S5. The CSRF handover and the Kit 3 peer land on `main` together, so no intermediate `main` strips Rule 2 from Kit 2 consumers.
