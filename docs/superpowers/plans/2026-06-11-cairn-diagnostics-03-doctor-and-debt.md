# Diagnostics Pass 3 (cairn doctor) and Debt Removal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship `cairn doctor` (the environment preflight CLI) and the gated Cloudflare readiness checklist per the Pass 3 spec, and clear the accumulated debt carry-forwards from the 0.39.0 and 0.40.0 post-mortems.

**Architecture:** The doctor is a new bin beside `cairn-manifest`: a registry of isolated checks (each `{ id, conditionId, title, run() }`) over three sources (local config files, the Cloudflare API, the GitHub App), a runner that accumulates every result into one table and exits non-zero on any failure. The checks tie 1:1 to `CairnCondition` entries in the existing internal registry (`src/lib/diagnostics/`), and a new `check:readiness` gate pins the checklist doc to that registry, so the doctor, the runtime errors, and the doc cannot drift. The debt tasks are independent small fixes over the existing suites.

**Tech Stack:** TypeScript (NodeNext ESM, `.js` specifiers), Vitest, the existing `yaml` dependency, Node 20+ `fetch` and WebCrypto (the GitHub signing module already runs on Web Crypto), no new runtime dependencies.

**Spec:** `docs/superpowers/specs/2026-06-08-cairn-email-delivery-and-environment-preflight-design.md` (Arms B and C; Arm A shipped as Pass 2 / 0.38.0). The umbrella is `docs/superpowers/specs/2026-06-08-cairn-diagnostics-initiative-design.md`.

**Project gate (every task ends green):** the task's targeted test passes, `npm run check` 0/0, `npm test` exit 0 (re-run once if only the known `delivery-*-split` import-timeout flake fails), `npm run check:prose` when admin copy changes. The docs task bumps the version to **`0.41.0`** (the doctor is initiative-closing feature work, a minor under the new x.1.0-for-larger-stuff rule).

**The spec's three open questions, settled at plan time:**
1. **Config discovery.** The doctor reads what sits in the site directory directly: `site.config.yaml` through the existing `parseSiteConfig`, the wrangler config (`wrangler.jsonc` or `wrangler.toml`) through a small tolerant reader for the handful of keys it needs, and `svelte.config.js` as text (the CSRF check is a documented heuristic). `branding.from` lives in the site's TypeScript adapter, which a CLI cannot evaluate, so the from-address arrives as `--from <addr>` or `CAIRN_FROM`; the GitHub repo as `--repo <owner/name>` or `GITHUB_REPO`. A check missing its input reports `skip` with a remediation naming the flag. No Vite evaluation.
2. **GitHub App check depth.** v1 stops at the full reachability chain (key parses, App authenticates, installation token mints, the repo answers a read). No permissions probe; a read-only installation surfaces at first commit with a clear GitHub error, and the probe would double the check's API surface.
3. **Sequencing.** All v1 checks ship in this pass. The registry shape keeps each check small, and the checklist doc needs the full set to be the superset the spec demands.

**Debt scope (from the 0.39.0 and 0.40.0 post-mortems), folded in as Tasks 8-10:** the SSR boundary leak and test gap; the `editLoad` probe waterfall; token-mint coalescing; the publish-all "1 entries" plural and empty-batch flash; `draftWarning` derivation; the `willUnload` double-fire; the roving-tab-stop jump; word-count inline marks; the LoginPage dismissed-banner regression test; the flash-pattern convergence; a popover sweep check. Explicitly out: the gallery-owned Image button, the Edited-badge vocabulary (parked for editor feedback), edge rate-limiting, and the gates-and-tooling pass's CI items (still its own queued pass).

---

### Task 1: Pass 3 conditions join the registry, and the registry hardens

**Files:**
- Modify: `src/lib/diagnostics/conditions.ts`
- Test: `src/tests/unit/diagnostics-conditions.test.ts` (extend or create), `src/tests/unit/condition-response.test.ts` (the renderer 1:1 test, extend)

The doctor's checks need condition identities (the 1:1:1). Add these entries to `REGISTRY`, following the existing entry shape exactly (id, severity, title, why, remediation, optional logEvent):

| id | severity | summary |
|---|---|---|
| `config.bindings-missing` | blocker | `send_email` (EMAIL) or `AUTH_DB` not declared in the wrangler config |
| `config.observability-off` | warning | `observability.enabled` is not `true`, so Workers Logs has no sink |
| `config.csrf-disable-missing` | warning | `svelte.config.js` does not carry `csrf: { checkOrigin: false }` (heuristic read) |
| `config.site-config-invalid` | blocker | `site.config.yaml` fails to parse or fails the URL-policy validation |
| `edge.hsts-off` | warning | the zone HSTS setting is off or `max-age` is trivial |
| `auth.store-unreachable` | blocker | the `AUTH_DB` D1 database is missing, lacks the auth schema, or holds no owner |
| `github.app-unreachable` | blocker | the App key, authentication, installation, or repository is unreachable (logEvent: `github.unreachable`, added in Task 2) |

Write the `why` and `remediation` strings in the registry's existing voice (one or two plain sentences; the remediation names the command or file). `edge.https-not-forced`, `email.sender-not-onboarded`, and `email.send-failed` already exist and serve their checks unchanged.

Two Pass 1 carry-forwards land here too: `Object.freeze` the `REGISTRY` object and each entry (a test asserts mutation throws in strict mode), and extend the renderer coverage test so every condition the guard's `REASON_CONDITION` map names resolves through `condition()` (read `src/lib/sveltekit/condition-response.ts` first; the test may largely exist, in which case extend it to cover the new entries' field completeness: every entry has a non-empty `why` and `remediation`).

- [ ] **Step 1: Write the failing tests** (new ids resolve through `condition()`; `allConditions()` includes them; the registry is frozen; every entry carries non-empty why/remediation).
- [ ] **Step 2: Verify failures. Step 3: Implement. Step 4: Targeted pass. Step 5: Project gate. Step 6: Commit** (`Add the Pass 3 conditions and freeze the registry`).

---

### Task 2: The layoutLoad degrade gets a log event

**Files:**
- Modify: `src/lib/log/events.ts` (add `'github.unreachable'`), `src/lib/sveltekit/content-routes.ts` (the `layoutLoad` catch)
- Test: `src/tests/unit/content-routes-layout.test.ts` (extend)

The 0.39.0 carry-forward: `layoutLoad`'s GitHub failure degrades `pendingEntries` to `null` silently, so a revoked installation shows only as a missing topbar button. The catch now logs once at warn: `log.warn('github.unreachable', { scope: 'layout', error: String(err) })`. Keep the degrade behavior identical (the shell must never fail); the event is the only addition. Mind the existing redaction posture: `String(err)` on this path carries a fetch or auth error, never a token (the mint failure message is the risk spot; check what `cachedInstallationToken` throws and assert the test's spied record carries no key material).

- [ ] **Step 1: Failing test** (a mint failure yields `pendingEntries: null` AND one `github.unreachable` warn record via the console spy pattern from `content-routes-publish.test.ts`; the record has no `BEGIN PRIVATE KEY` substring).
- [ ] **Steps 2-5: fail, implement, pass, gate. Step 6: Commit** (`Log the layout's GitHub degrade`).

---

### Task 3: The doctor core (check shape, runner, report)

**Files:**
- Create: `src/lib/doctor/types.ts`, `src/lib/doctor/run.ts`, `src/lib/doctor/report.ts`
- Test: `src/tests/unit/doctor-run.test.ts`

Pure core, no I/O. The shapes:

```ts
// src/lib/doctor/types.ts
// The doctor's check model (diagnostics spec, Arm B). Each check is isolated: no check reads
// another's result. The conditionId ties the check to the registry entry whose why/remediation
// the report prints, keeping the doctor, the runtime errors, and the checklist on one identity.
export type CheckStatus = 'pass' | 'fail' | 'skip';

export interface CheckResult {
	status: CheckStatus;
	/** One line of evidence ("sending subdomain enabled", "wrangler.jsonc not found"). */
	detail: string;
}

export interface DoctorCheck {
	/** Stable id, e.g. 'email.sender-onboarded'. */
	id: string;
	/** The registry condition this check probes; the report prints its remediation on failure. */
	conditionId: string;
	title: string;
	run: (ctx: DoctorContext) => Promise<CheckResult>;
}

/** Everything a check may read, resolved once by the bin. Absent fields make checks skip. */
export interface DoctorContext {
	/** The site directory the doctor runs in. */
	cwd: string;
	/** The from-address (--from / CAIRN_FROM). */
	from?: string;
	/** owner/name (--repo / GITHUB_REPO). */
	repo?: string;
	/** CLOUDFLARE_API_TOKEN. */
	cfToken?: string;
	/** CLOUDFLARE_ACCOUNT_ID. */
	cfAccountId?: string;
	/** GITHUB_APP_ID / GITHUB_APP_INSTALLATION_ID / GITHUB_APP_PRIVATE_KEY_B64. */
	github?: { appId: string; installationId: string; privateKeyB64: string };
	/** Injected fetch for tests; defaults to global fetch. */
	fetch: typeof fetch;
	/** Read a file under cwd, or null when absent. Injected for tests. */
	readFile: (relPath: string) => Promise<string | null>;
}
```

`run.ts` exports `runDoctor(checks: DoctorCheck[], ctx: DoctorContext): Promise<{ results: { check: DoctorCheck; result: CheckResult }[]; failed: number }>`: executes every check sequentially (a thrown check becomes `{ status: 'fail', detail: String(err) }`, never aborts the run), counts failures. `report.ts` exports `formatReport(results): string`: one line per check (`PASS`/`FAIL`/`SKIP`, the title, the detail), then for each failure the condition's `why` and `remediation` (resolve via `condition(check.conditionId)`), then a one-line summary (`3 passed, 1 failed, 2 skipped`). Plain text, no color (CI-safe).

- [ ] **Step 1: Failing tests** (accumulate-all: three stub checks where the second throws, all three report and `failed === 1`; the report carries the failing check's remediation from the registry; a skip prints SKIP with its detail).
- [ ] **Steps 2-5: fail, implement, pass, gate. Step 6: Commit** (`Add the doctor check runner and report`).

---

### Task 4: Local-config checks

**Files:**
- Create: `src/lib/doctor/checks-local.ts`, `src/lib/doctor/wrangler-config.ts`
- Test: `src/tests/unit/doctor-checks-local.test.ts`

`wrangler-config.ts`: a tolerant reader for the three facts the checks need from `wrangler.jsonc` or `wrangler.toml` (whichever exists; jsonc wins when both do). For jsonc, strip `//` and `/* */` comments and trailing commas, then `JSON.parse`. For toml, do NOT write a TOML parser; extract the three facts with line-anchored matching: a `[[send_email]]` table or `"send_email"` key with `name = "EMAIL"`, a `[[d1_databases]]` table with `binding = "AUTH_DB"` (capture its `database_id`), and `[observability]`/`enabled = true`. Return `{ hasEmailBinding, hasAuthDb, authDbId?: string, observabilityEnabled }` plus `null` when neither file exists. Document the toml read as deliberately shallow (the doctor's remediation tells the operator what to add; it does not need full fidelity).

`checks-local.ts` exports four `DoctorCheck`s:
- `config.bindings` (condition `config.bindings-missing`): fail naming whichever of EMAIL/AUTH_DB is absent; skip when no wrangler config file exists (detail names both filenames).
- `config.observability` (condition `config.observability-off`): fail when the config exists and `observability.enabled` is not true.
- `config.csrf-disable` (condition `config.csrf-disable-missing`): read `svelte.config.js` text; pass when it matches `/checkOrigin\s*:\s*false/`; fail otherwise; skip when the file is absent. The detail names this a heuristic read.
- `config.site-config` (condition `config.site-config-invalid`): read `site.config.yaml`; run `parseSiteConfig` then the URL-policy validation chain the engine already exports internally (`parseSiteConfig` and `urlPolicyFrom` from `src/lib/nav/site-config.js` feeding the validator `resolveConcepts` consumes; read how the engine wires them and reuse those exports rather than restating the rules). Fail with the parse or validation message; skip when absent.

- [ ] **Step 1: Failing tests** over injected `readFile` fixtures: a good jsonc config passes all; a toml config with the three facts passes; missing EMAIL fails `config.bindings` naming it; `enabled = false` fails observability; a svelte.config without the disable fails the heuristic; a site.config with a bad permalink fails with the validator's message; absent files skip.
- [ ] **Steps 2-5: fail, implement, pass, gate. Step 6: Commit** (`Add the doctor's local-config checks`).

---

### Task 5: Cloudflare API checks

**Files:**
- Create: `src/lib/doctor/checks-cloudflare.ts`
- Test: `src/tests/unit/doctor-checks-cloudflare.test.ts`

Four checks over `ctx.fetch` with `Authorization: Bearer ${ctx.cfToken}`; every check skips with a remediation naming `CLOUDFLARE_API_TOKEN` (and `CLOUDFLARE_ACCOUNT_ID` where needed) when the credential is absent. **Verify each endpoint against the current Cloudflare API docs at implementation time** (the `cloudflare:cloudflare` skill or developers.cloudflare.com); the shapes below are the expected ones, and the tests pin whatever the verified endpoints return:

- `email.sender-onboarded` (condition `email.sender-not-onboarded`): derive the domain from `ctx.from` (skip when absent, naming `--from`); query the account's Email Sending domains (expected `GET /accounts/{account}/email/sending/domains` or the zone-scoped equivalent; verify) and pass when the from-domain has an enabled sending subdomain.
- `edge.https-forced` (condition `edge.https-not-forced`): resolve the zone by the from-domain's registrable domain (`GET /zones?name=`), then `GET /zones/{id}/settings/always_use_https`; pass on `"on"`.
- `edge.hsts` (condition `edge.hsts-off`): `GET /zones/{id}/settings/security_header`; pass when enabled with `max_age >= 2592000` (30 days; the production zones run two years).
- `auth.store` (condition `auth.store-unreachable`): needs `authDbId` from the wrangler config via the Task 4 reader (skip otherwise); `POST /accounts/{account}/d1/database/{id}/query` with `SELECT name FROM sqlite_master WHERE type='table'` asserting `editor`, `magic_token`, `session` exist, then `SELECT count(*) AS n FROM editor WHERE role='owner'` asserting `n >= 1`. Fail details distinguish unreachable, missing schema, and no owner (the wrong-owner-address class from the original incident).

- [ ] **Step 1: Failing tests** over a scripted `ctx.fetch` (the URL-dispatching mock idiom from `content-routes-edit.test.ts`): each check's pass, fail, and skip branch; the D1 check's three failure shapes.
- [ ] **Steps 2-5: fail, implement, pass, gate. Step 6: Commit** (`Add the doctor's Cloudflare checks`).

---

### Task 6: The GitHub App check and the opt-in live send

**Files:**
- Create: `src/lib/doctor/checks-github.ts`, `src/lib/doctor/check-send.ts`
- Test: `src/tests/unit/doctor-checks-github.test.ts`

- `github.app` (condition `github.app-unreachable`): skip when `ctx.github` or `ctx.repo` is absent (remediation names the env vars and `--repo`). Build credentials the way the engine does: base64-decode the key, mint an installation token through the existing `src/lib/github/signing.js` chain (read `appCredentials` and `cachedInstallationToken` first; Node 20+ supplies WebCrypto, and the module must import cleanly outside a Worker; if it reaches for a Workers-only global, report that in the dispatch instead of patching around it), then `GET /repos/{owner}/{repo}` with the token via `ctx.fetch`. Pass on 200. Fail details distinguish key-parse failure, auth failure, and repo unreachable.
- `email.live-send` in `check-send.ts`: only registered when the bin gets `--send-test <addr>`; sends one real message through the Email Sending REST API (verify the endpoint; the Worker binding is unavailable in a CLI) from `ctx.from` to the given address with a fixed subject (`cairn doctor test send`). Pass on accepted. This check is opt-in by construction: the bin appends it to the check list only when the flag is present.

- [ ] **Step 1: Failing tests** (scripted fetch: the token mint sequence then the repo read; the three failure shapes; the live-send check posts the right payload and is absent from the default check list).
- [ ] **Steps 2-5: fail, implement, pass, gate. Step 6: Commit** (`Add the doctor's GitHub check and the opt-in live send`).

---

### Task 7: The `cairn-doctor` bin

**Files:**
- Create: `src/lib/doctor/bin.ts`, `src/lib/doctor/index.ts` (the internal barrel: the check registry assembly plus `runDoctor` re-export)
- Modify: `package.json` (`"cairn-doctor": "./dist/doctor/bin.js"` under `bin`; confirm `svelte-package` emits `dist/doctor/`, and mirror the existing `chmod +x dist/vite/bin.js` step in the `package` script)
- Test: `src/tests/unit/doctor-bin.test.ts` (argument parsing and context assembly as pure functions; extract `parseArgs(argv)` and `contextFromEnv(env, args, cwd)` so the bin shell stays two lines like `cairn-manifest`'s)

The bin: parse `--from`, `--repo`, `--send-test`; assemble `DoctorContext` from `process.env` (`CAIRN_FROM`, `GITHUB_REPO`, `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, `GITHUB_APP_ID`, `GITHUB_APP_INSTALLATION_ID`, `GITHUB_APP_PRIVATE_KEY_B64`), real `fetch` and a `node:fs/promises` readFile; run the assembled registry (local + cloudflare + github, plus live-send when flagged); print `formatReport`; `process.exit(failed ? 1 : 0)`. The doctor module is internal (no public subpath export beyond the bin), matching `cairn-manifest`.

Empirically verify the packaging lock (the Plan 07 lesson): after `npm run package`, run `node dist/doctor/bin.js` from a fixture dir with no credentials and assert it prints a report full of SKIPs and exits 1 only if a local check fails (a plain-Node spawn assertion in the test file, or a recorded manual run in the dispatch report).

- [ ] **Step 1: Failing tests** (parseArgs and contextFromEnv branches; the default registry excludes live-send). **Steps 2-5: fail, implement, pass, gate** (including the real `node dist/doctor/bin.js` spawn). **Step 6: Commit** (`Ship the cairn-doctor bin`).

---

### Task 8: The readiness checklist and the `check:readiness` gate

**Files:**
- Create: `docs/guides/cloudflare-readiness.md`, `scripts/check-readiness.mjs`
- Modify: `package.json` (`"check:readiness": "node scripts/check-readiness.mjs"`, added to CI beside `check:reference`/`check:docs`; read `.github/workflows/` and mirror), `src/lib/diagnostics/conditions.ts` (fill each condition's `docsAnchor` with its checklist anchor), `docs/guides/README.md` (index the new guide under Set up the backend)
- Test: `src/tests/unit/check-readiness.test.ts`

The checklist guide walks a developer from a default 2026 Cloudflare account to a working cairn site, per the spec's Arm C: the ordered deltas (Workers Paid, the deployed Worker, Always Use HTTPS plus HSTS, the onboarded sending domain, the D1 auth store and schema, the three bindings, the GitHub App install and secrets, the `csrf` disable, at least one owner), linking out to Cloudflare's docs for generic operations and spelling out only the cairn-specific configuration. Each registry-backed condition gets a section with a stable anchor the condition's `docsAnchor` points at; the two human prerequisite steps (register or move the domain, upgrade the plan) are marked as setup steps, not checked conditions. Close with `cairn doctor` as the automated pass over the same list. Prose per the repo register; the prose-guard blocks the usual tells.

`check-readiness.mjs`: loads `allConditions()` from the built `dist` (mirror how `reference-coverage.mjs` reaches built code), reads the checklist markdown, and fails listing (a) any condition whose `docsAnchor` anchor is missing from the doc, and (b) any condition-anchored section in the doc whose anchor matches no registry entry. Fail-closed both directions.

- [ ] **Step 1: Failing test** (the gate script as a function against fixture markdown: a missing anchor fails naming the condition; an orphan section fails naming the anchor). **Step 2: write the guide and fill the anchors. Steps 3-5: gate passes against the real doc, full gate plus all doc gates. Step 6: Commit** (`Add the readiness checklist and its gate`).

---

### Task 9: Engine debt batch

**Files:**
- Modify: `src/lib/components/link-completion.ts`, `src/tests/unit/editor-boundary.test.ts`, `src/lib/sveltekit/content-routes.ts` (editLoad, publishAllAction), `src/lib/github/signing.ts`
- Test: extend `editor-boundary.test.ts`, `content-routes-edit.test.ts`, `content-routes-publish.test.ts`, and the signing/token-cache suite (find where `cachedInstallationToken` is covered)

Four independent fixes:
1. **The SSR boundary leak.** `link-completion.ts` statically imports `@codemirror/language` (`syntaxTree`) and EditPage imports the module statically, so the consumer's server bundle pulls CodeMirror. Restructure: resolve `syntaxTree` lazily inside the completion source (a dynamic `await import('@codemirror/language')` cached in a module-level variable; a `CompletionSource` may return a Promise, so the async hop is legal; verify against the installed types). Then widen `editor-boundary.test.ts` to scan every `src/lib/components/*.ts` for static `@codemirror/` and `@lezer/` value imports, allowlisting only `editor-highlight.ts`, with an added assertion that no file imports `editor-highlight.js` statically except through `MarkdownEditor.svelte`'s dynamic path.
2. **The editLoad probe waterfall.** `editLoad` awaits `branchHeadSha` before its `Promise.all`. Restructure: start the probe, the main-path read, and the manifest read together; the branch read happens after the probe resolves (two stages instead of three serial steps). Keep behavior identical; the existing suite is the contract.
3. **Token-mint coalescing.** `cachedInstallationToken` caches the resolved token, so a cold isolate's parallel loads double-mint. Cache the in-flight `Promise<string>` instead, deleting the entry on rejection. Extend the cache test with a concurrent-miss case (two simultaneous calls, one mint).
4. **Publish-all polish.** The commit message pluralizes (`Publish 1 entry` versus `Publish ${n} entries`), and the empty-batch redirect carries a flash: redirect to `${listPage}?error=${encodeURIComponent('Nothing to publish. Every entry is already live.')}` (the list page already renders `?error` as `formError`).

- [ ] **Step 1: Failing tests per fix. Steps 2-5: fail, implement, pass, gate. Step 6: Commit** (`Clear the engine debt batch`).

---

### Task 10: Component debt batch

**Files:**
- Modify: `src/lib/components/EditPage.svelte`, `src/lib/components/EditorToolbar.svelte`, `src/lib/components/ConceptList.svelte`
- Test: extend `src/tests/component/EditPage.test.ts`, `EditorToolbar.test.ts`, `ConceptList.test.ts`, `LoginPage.test.ts`; an `$app/state` stub may need adding beside the existing `$app/navigation` alias in `vitest.config.ts`

Seven small items:
1. **`draftWarning` via `page.url`.** Replace the effect-plus-`location.search` read with `$derived` over `page.url.searchParams` from `$app/state` (static import; SSR-safe). Add an `$app/state` alias stub to the component test project mirroring the `$app/navigation` one (a settable `page` object). This also fixes its staleness across client-side navigation.
2. **The `willUnload` branch.** In `beforeNavigate`: `if (navigation.willUnload) { if (dirty && !busy && !leaving) navigation.cancel(); return; }` before the confirm, so full unloads do not double-fire `confirm()` alongside the native dialog.
3. **Roving sync.** In `EditorToolbar`'s roving effect, write the clamped value back (`roving = stop`) so the stop does not jump after a Preview round trip. Mind the effect-writes-state rule; if the assignment inside the effect loops, derive the clamp instead and report the shape chosen.
4. **Word count.** Strip inline syntax marks before counting: after the existing line filter, remove inline-directive ranges (`findInlineDirectives`) and the marker characters (`` * _ ~ ` [ ] ( ) # ``) from the counted text, then split. Pin with cases (`**bold** word` counts 2, `:icon[ski]{s=1} after` counts 1).
5. **LoginPage regression test.** The dismissed-banner branch (`(form?.status === 'sent' || form?.sent) && !dismissed`) gets a component test: render the sent state, click "Use a different email", assert the form returns. This is the exact expression svelte 5.56.1 miscompiled; the test pins the behavior whatever the compiler does. Test only; no component change expected.
6. **Flash convergence.** ConceptList's `role="status"` visible flash moves to the EditPage pattern: a persistent sr-only polite region announces the message and the visible alert drops its role. Copy unchanged.
7. **Popover sweep check.** Grep `src/lib/components/*.svelte` for any remaining focus-driven DaisyUI dropdown (`dropdown` class without `popover`). Convert any hit to the design system's popover recipe; if none remain beyond the two already converted, record "none found" in the commit body and touch nothing.

- [ ] **Step 1: Failing tests per item. Steps 2-5: fail, implement, pass, gate (`check:prose` included). Step 6: Commit** (`Clear the component debt batch`).

---

### Task 11: Docs, changelog, and the 0.41.0 bump

**Files:**
- Create: `docs/reference/doctor.md` (the bin: flags, env vars, the check table with condition ids, exit codes, CI wiring)
- Modify: `docs/reference/README.md` (index the new page), `docs/reference/log-events.md` (the `github.unreachable` row), `docs/guides/deploy-to-cloudflare.md` (the "Onboard your sending domain" section per the spec's Arm C: the wrangler command, the DNS records it writes, the Workers Paid note, the exact error strings, pointers at `cairn doctor` and the readiness checklist), `docs/guides/upgrade-cairn.md`, `CHANGELOG.md`, `package.json` (`0.41.0`), `docs/superpowers/specs/2026-06-08-cairn-email-delivery-and-environment-preflight-design.md` (a one-line plan-time reconciliation where the spec implies `branding.from` is readable from site.config.yaml: it arrives via `--from`/`CAIRN_FROM` because branding lives in the adapter)
- The changelog entry is "Consumers may" throughout (the doctor, the checklist, the gate, and every debt fix are additive; no shim or action changes). Note the `github.unreachable` event and the behavior-neutral editLoad/coalescing improvements with no-action lines.

- [ ] **Step 1: Write the docs and bump. Step 2: All gates** (`check:reference` if the bin counts as documented surface, `check:package`, `check:docs`, `check:readiness`, the full gate, `check:prose`). **Step 3: Commit** (`Document the doctor and the readiness checklist; bump 0.41.0`).

---

## Self-review notes

- **Spec coverage (Arm B):** check architecture and isolation (Task 3), the full v1 check set across local, Cloudflare, and GitHub sources (Tasks 4-6), the opt-in live send (Task 6), credentials-absent-means-skip (the `DoctorContext` optionality and every check's skip branch), accumulate-all and the exit code (Tasks 3 and 7). **(Arm C):** the readiness checklist with the registry gate (Task 8), the deploy-guide onboarding section and the doctor reference page (Task 11), the changelog lines (Task 11). The Pass 2-owned Arm C items (the stale gotcha, the log-events `code` row) shipped in 0.38.0 and are untouched.
- **The 1:1:1 holds.** Every check's `conditionId` resolves through `condition()`, which throws on an unknown id and the runner tests exercise that path; the `check:readiness` gate pins the checklist to the registry in both directions (Task 8).
- **Debt coverage against the post-mortems.** From 0.40.0: items 2 (boundary leak and test), 3 (draftWarning), 4 (willUnload), 5 (roving), 6 (word count), plus the LoginPage test and the popover sweep, land in Tasks 9 and 10. From 0.39.0: the layout degrade event (Task 2), mint coalescing, the editLoad waterfall, the plural, and the empty-batch flash land in Tasks 2 and 9, and the flash convergence is Task 10 item 6. Remaining open after this pass, deliberately: the live `%2F` ref-route proof and the consumer smoke (ride the site retrofits), the Edited-badge vocabulary (parked), the Image button (gallery's), the publish-all dialog titles (gallery-adjacent), and the gates-and-tooling pass's own queue.
- **Type consistency.** `DoctorCheck`, `DoctorContext`, and `CheckResult` are defined once in Task 3 and consumed by name in Tasks 4-7; `runDoctor` and `formatReport` signatures match between Tasks 3 and 7. The wrangler reader (Task 4) feeds the D1 check's `authDbId` (Task 5) by the check calling the reader itself through `ctx.readFile`, keeping checks isolated; `contextFromEnv` never reads the wrangler config.
- **Risk spots flagged to the implementer.** The Cloudflare endpoints must be verified against current docs, never trusted from this plan; the signing module's Node compatibility is asserted, not assumed; the `svelte-package` emission of `dist/doctor/` is verified empirically at Task 7 (the Plan 07 packaging lesson).
- **Review gate (ritual, not tasks).** `web-auth-security-reviewer` (the doctor handles every credential the engine owns, the report must never print a secret value per the spec's security section, and the new log event's redaction posture); `cloudflare-workers-reviewer` (the API usage, though the doctor runs in Node); `svelte-reviewer` (the Task 10 component changes). The live admin smoke does not apply: no admin-surface behavior changes beyond Task 10's internals, which the component suites and the existing E2E cover.

---

## Post-mortem (2026-06-11, pass complete)

**What was built.** Diagnostics Pass 3 plus the 0.39/0.40 debt batch, eleven plan tasks plus a
simplifier pass, a review fold-in, and a live-run fix: commits `dce3925..95a7061` on `main`,
version `0.41.0`. The pass closes the diagnostics initiative: the condition registry grew to
twelve frozen entries with `docsAnchor`s, the `cairn-doctor` bin runs nine isolated checks
(local config, Cloudflare API, GitHub App) into one accumulate-all report with per-failure
remediation from the registry, the readiness checklist guide pins to the registry through the
new `check:readiness` CI gate, and the `github.unreachable` event covers the admin layout's
GitHub degrade. The debt batch cleared eleven carry-forwards across the engine and components.

**The doctor proved itself on its first live run.** Run against the ecxc-ski checkout with real
credentials, it found a real production misconfiguration: the `ecxc.ski` zone, created at the
2026-06-09 rename, never received Always Use HTTPS or HSTS (the 2026-06-07 hardening reached
only the old zones). Verified directly against the zone-settings API, fixed in place (HTTPS on,
HSTS max-age two years with includeSubdomains), and re-verified: 9/9 checks pass. The run also
surfaced a real DX gap (the site-config check probed only the cwd while sites keep the file at
`src/lib/site.config.yaml`), fixed as the conventional-locations probe. This is exactly the
silent-failure class the initiative was built to catch.

**The review gate's keep.** Three reviewers, no Critical. One publish-blocking contract gap:
`$app/state` (the draftWarning fix) raised the real SvelteKit floor to 2.12 while the peer range
said `^2`; the fold-in bumps the peer to `^2.12` with a `Consumers must:` changelog line. One
Important false assurance: the doctor's CSRF check green-lit `checkOrigin: false` alone, which
without cairn's guard wired means no CSRF at all; the check now requires the pair (an
uncommented disable AND a cairn-wired hooks file). Minors folded in: clean wrangler parse
errors (no source-snippet echo), `encodeURIComponent` on the D1 path, 401/403 reported as
token-scope guidance rather than the product condition, `process.exitCode` over `process.exit`
(pipe truncation), exact-zone-then-apex resolution, the willUnload comment, and the
`context.aborted` early return.

**Verification evidence (run first-hand at the tip `95a7061`).** `npm run check` 887 files 0/0.
`npm test` 148 files / 1146 tests exit 0. `check:reference`/`check:package`/`check:docs`/
`check:readiness`/`check:prose` all clean. The doctor bin spawns and runs from plain Node
against a fixture dir (the packaging proof) and 9/9 against the live production site. The live
admin smoke was satisfied by the component suites plus the existing E2E (Task 10 changed
component internals only); the doctor's live run is this pass's real-world proof.

**Decisions locked.** Config discovery via `--from`/`CAIRN_FROM` and `--repo`/`GITHUB_REPO`
(branding lives in the adapter; a CLI cannot evaluate TypeScript), with the site-config file
probed at conventional locations. The GitHub check stops at reachability. The CSRF check is a
paired heuristic by design. The kit peer floor is `^2.12`.

**Carry-forwards (recorded, not fixed).**
1. The doctor has no token-scope condition; a 401/403 carries the truth in the detail string
   only. Add `cloudflare.token-scope` if it recurs.
2. The child-zone fallback resolves exact-then-apex; a from-domain deeper than one zone level
   (a.b.example.com under a b.example.com zone) would still miss. Unlikely; noted.
3. ConceptList's error alerts (`formError`, `error`) still use the inserted-fresh `role="alert"`
   pattern; converge on a persistent assertive region when next touched. The publish flash's
   sr-only region pays off fully only once those forms gain `use:enhance`.
4. The mint coalescing shares one in-flight promise across requests; a cancelled originating
   request fails coalesced waiters once (self-healing, accepted).
5. `branches.ts` error messages embed GitHub response bodies, which now reach the
   `github.unreachable` log field; status-only messages on log-bound paths would remove the
   dependency on GitHub's body behavior.
6. The showcase's own hooks file fails the paired CSRF check (it wires a fixture handle);
   correct behavior, noted so nobody chases it.
7. The `0.40.0` carries still open: the live `%2F` ref-route proof and the consumer smoke (the
   site retrofits), the Edited-badge vocabulary (parked), the publish-all dialog titles
   (gallery-adjacent).
