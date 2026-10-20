# ASC engine seams pass two: the `./cloudflare` subpath and the packaged audit sink

> **For agentic workers:** execute task-by-task by dispatching each task to `cairn-implementer`
> (pinned Sonnet) per the repo's plan-execution defaults; the main loop reviews each diff and
> confirms the full gate between dispatches. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** land the remaining three ASC-brief seams: a server-only `./cloudflare` subpath carrying
the Cloudflare-native platform primitives two sites already copy (`verifyTurnstile`, and the
rate-limit wrapper with its degrade-to-open convention), and a packaged D1 audit sink
(`createD1AuditSink` plus a migration) for the `AdminActionAuditSink` seam the engine defines but
has never implemented.

**Authority:** the design spec `docs/superpowers/specs/2026-08-01-asc-engine-seams-design.md`,
sections "Pass two, seams 3 and 4" and "Pass two, seam 5", tracing to the consumer brief
`docs/internal/2026-08-01-asc-consumer-brief.md`. Pass one (seams 1 and 2) shipped in `0.93.0`;
its post-mortem is appended to `docs/superpowers/plans/2026-08-01-asc-engine-seams-1.md`.

**Architecture:** `./cloudflare` is a new server-only subpath whose membership rule is the charter
line itself: Cloudflare-native platform primitives only. Turnstile is the platform's own bot
defense and the `RateLimit` binding is a platform binding, so both belong; a third-party verifier
(Stripe, Discord, and their kin) never does, and the subpath exists partly to make that boundary
physical and snapshot it in `check:surface`. `RateLimitLike` moves from `section-action.ts` into
the new rate-limit module and `section-action.ts` re-exports it, so the engine has one structural
limiter type, not two. Seam 5 packages what ASC already proved generic: one `audit_log` table as a
migration a site opts into, and a fire-and-forget `waitUntil` insert that fails open, hardened so
a persist failure cannot become log evasion.

**Tech stack:** existing only. TypeScript, svelte-package, Vitest, the `check:*` gate scripts. No
new dependencies; the rate-limit binding stays structurally typed, and the D1 handle is typed the
way `src/lib/auth/store.ts` already types it (`D1Database` from `@cloudflare/workers-types`, a
`devDependency` type-only import).

## Decisions settled at plan time

The spec left two calls to the planning session. Both are settled here.

1. **The migration number is `0002`.** `migrations/` holds `0000_auth.sql` and `0001_roles.sql`
   today, and the queued `COLLATE NOCASE` auth migration (ROADMAP, Next) has not been written, so
   `0002_audit.sql` is free and this pass claims it. Task 4 amends the ROADMAP entry to say the
   NOCASE migration takes the next free number after this one.
2. **The `./cloudflare` charter line is load-bearing and gets written down twice**, once in the
   barrel's header comment (where a future contributor adding an export reads it) and once in the
   reference page's opening (where a developer proposing one reads it). Both state the same rule:
   Cloudflare-native platform primitives are in-stack; third-party service helpers are not, and
   must never ride the Turnstile precedent in.

A third call this plan makes, an addition to the spec rather than a choice it deferred:
**`verifyTurnstile`'s infrastructure failures get a log event, `turnstile.verify_failed`.** The
function is fail-closed, so a Cloudflare outage, a 5xx, or an unparseable body turns every
protected form into a silent refusal; that is exactly the diagnosable path the repo's logging
doctrine says gets an event rather than nothing. A plain `success: false` (an ordinary bot
rejection) emits nothing, since it is the function working. A `hostname` or `action` mismatch does
emit, because that signals a token replayed from another widget, which an operator wants to see.
The event never carries the response body or the secret.

## Global constraints

- Every seam stays properly generic: ASC and ecxc are evidence, never shape. Nothing club-,
  member-, or binding-layout-specific in any exported name, type, or message. `RATE_LIMIT_MESSAGE`
  and ASC's site key stay site-side; refusal copy is site voice.
- Full gate per task before it reports done: targeted test green, `npm run check` ending
  `0 ERRORS 0 WARNINGS`, `npm test` exit 0. Run `npm test` unpiped, or read `PIPESTATUS`; a
  `| tail` captures `tail`'s exit status and masks the gate.
- Public-surface gates for any task that touches the export map or a documented export:
  `npm run check:surface` (regenerate `docs/internal/api-surface.md` with `--update` and commit the
  diff), `npm run check:reference`, `npm run check:reference:signatures`, `npm run check:package`,
  `npm run check:snippets`.
- **`scripts/check-reference-signatures.mjs`'s name list is an EXEMPTION allowlist, not a
  registration list.** Adding this pass's exports to it would skip the signature check for exactly
  the exports this pass ships. Add nothing there; instead confirm `check:reference:signatures`
  passes with the new pages covered. (Pass one's plan had this instruction backwards in two tasks
  and three implementers caught it by verifying rather than complying. Verify the file lists below
  the same way: a plan's file list is a starting point, not a contract.)
- TSDoc per the repo authoring standard (`npm run check:comments`); no em dash in comments.
- Reference-doc prose follows `docs/internal/docs-register.md` and the Google standard (Vale).
- Changelog entries open a new `## Unreleased` window above the published `## 0.93.0` heading, with
  `Consumers must: nothing` (everything here is additive), and the matching window in
  `docs/guides/upgrade-cairn.md` (the `docs-links` parity gate ties the two). The window's
  `release-size` marker is `minor`: this pass adds a public export subpath. No version bump, no
  publish; the pass holds unless a consumer needs it.
- Commit per task, specific files, imperative mood, `Co-Authored-By: Claude
  <noreply@anthropic.com>`.

---

### Task 1: `verifyTurnstile` and its suite

Internal only; Task 3 exports it. Deliverable count: three (the module, the log event, the suite).

**Files:**
- Create: `src/lib/cloudflare/turnstile.ts`
- Modify: `src/lib/log/events.ts` (add `'turnstile.verify_failed'` to the `CairnLogEvent` union,
  beside the `admin.action.*` entries)
- Modify: `docs/reference/log-events.md` (one table row for the new event, imitating the
  `admin.action.rate_limit_failed` row's shape: trigger sentence plus its field list)
- Create: `src/tests/unit/turnstile.test.ts`

**Interfaces:**
- Produces:
  `verifyTurnstile(token: string, secret: string, opts?: { ip?: string; hostname?: string; action?: string }): Promise<boolean>`.
  Note the argument order is `(token, secret, opts)`, not ASC's evidenced `(token, ip, secret)`:
  the two required arguments lead and every optional narrowing moves into `opts`.

- [ ] **Step 1: write the failing test.** `src/tests/unit/turnstile.test.ts`, stubbing
  `globalThis.fetch` per case and restoring it after. Prove, in order: a `success: true` body
  returns `true`; a `success: false` body returns `false`; a non-200 response returns `false` even
  when its body says `success: true` (fail closed on status first); a body that is not JSON, and a
  body that is JSON but not an object, both return `false`; a `fetch` that rejects returns `false`
  rather than throwing; a blank or empty `token`, and a blank or empty `secret`, each return
  `false` **without calling `fetch`** (assert the stub was never called). Request shape: the POST
  goes to `https://challenges.cloudflare.com/turnstile/v0/siteverify` with a
  `application/x-www-form-urlencoded` body carrying `secret` and `response`, carrying `remoteip`
  only when `opts.ip` is supplied, and never carrying a key for an omitted option. Narrowing: with
  `opts.hostname` supplied, a response whose `hostname` differs returns `false` and one that
  matches returns `true`; the same pair for `opts.action`; with neither supplied, a response
  carrying any `hostname`/`action` still returns `true`. Logging: assert the emitted event for the
  rejected-fetch, non-200, and unparseable cases is `turnstile.verify_failed` with a `reason` of
  `request_failed`, `bad_status`, and `unparseable`; assert the two mismatch cases emit it with
  `hostname_mismatch` and `action_mismatch`; assert a plain `success: false` emits **nothing**; and
  assert no emitted record contains the secret or the response body (search the captured records).
  Capture log records the way the existing unit suites capture them (follow
  `src/tests/unit/admin-action.test.ts`'s approach to `src/lib/log/`).
- [ ] **Step 2: run it, confirm it fails** (module not found):
  `npx vitest run src/tests/unit/turnstile.test.ts`.
- [ ] **Step 3: implement.** One exported function, fail-closed at every exit. Guard the blank
  arguments first and return `false` without a request. Wrap the whole fetch-and-parse in a single
  `try`/`catch` whose `catch` logs `request_failed` and returns `false`. Check `res.ok` before
  reading the body. Parse defensively: treat a non-object body as unparseable. Compare `hostname`
  and `action` only when the caller supplied them. The TSDoc states the contract the reference page
  then repeats for developers: every failure mode returns `false`, deliberately, so no future
  refactor flips it open; degrade-to-open (the "no secret configured means skip the check" policy)
  belongs to the caller, never to this function; `opts.ip` must come from `CF-Connecting-IP` and
  never from a forwardable header; supplying `hostname` and `action` is what stops a token solved
  on one widget from replaying against another form sharing the sitekey.
- [ ] **Step 4: targeted test green.**
- [ ] **Step 5: full gate** (`npm run check`, `npm test`, `npm run check:comments`). No public
  surface changed yet, so `check:surface` must report no drift.
- [ ] **Step 6: commit.**

### Task 2: the rate-limit wrapper and the shared `RateLimitLike`

Internal only; Task 3 exports it. Deliverable count: three (the module, the type consolidation, the
suite).

**Files:**
- Create: `src/lib/cloudflare/rate-limit.ts`
- Modify: `src/lib/sveltekit/section-action.ts` (delete its local `RateLimitLike` declaration at
  `src/lib/sveltekit/section-action.ts:31`, import the type from `../cloudflare/rate-limit.js`, and
  re-export it so `./sveltekit`'s public surface is unchanged)
- Create: `src/tests/unit/rate-limit.test.ts`

**Interfaces:**
- Produces: `RateLimitLike` (moved, not redefined),
  `checkRateLimit(binding: RateLimitLike | undefined, key: string): Promise<boolean>`, and
  `checkRateLimitKeys(binding: RateLimitLike | undefined, keys: string[]): Promise<boolean>`.
- Consumed by: `section-action.ts` for the type only. The wrapper keeps its own inline limit call
  and its own catch; it does not route through `checkRateLimit`, because the wrapper's
  degrade-to-open-on-throw is a policy the bare helper deliberately does not carry.

- [ ] **Step 1: write the failing test.** `src/tests/unit/rate-limit.test.ts` against fake
  bindings. `checkRateLimit`: an `undefined` binding returns `true` and calls nothing; a binding
  answering `{ success: true }` returns `true`; one answering `{ success: false }` returns `false`;
  the binding receives exactly `{ key }`. `checkRateLimitKeys`: an empty `keys` array returns
  `true` with no call; every key passing returns `true` and calls the binding once per key in
  order; a failing key returns `false` and **the keys after it are never called** (assert the
  recorded key list, since a later key's counter must not be incremented); an `undefined` binding
  with several keys returns `true` with no call. Also assert a throwing `limit()` propagates out of
  `checkRateLimit` (the caller owns that policy).
- [ ] **Step 2: run it, confirm it fails** (module not found):
  `npx vitest run src/tests/unit/rate-limit.test.ts`.
- [ ] **Step 3: implement.** Move `RateLimitLike` into the new module with its doc comment intact.
  Both functions are the evidenced ASC shapes, generalized only in their typing. The module's TSDoc
  states the two sentences the reference page then carries for developers: the Workers limiter is
  per-location and eventually consistent, so it is best-effort back pressure and never an
  authoritative security control (the engine's own D1-backed send cooldown is the pattern for
  anything that must hold); and `checkRateLimitKeys` short-circuits at the first failing key, so
  later keys' counters are not incremented. Document the one degrade-to-open case (an absent
  binding, for local dev, vitest, and a not-yet-provisioned deploy) and state that a throwing
  `limit()` propagates.
- [ ] **Step 4: update `section-action.ts`.** Import the type, re-export it, delete the local
  declaration. `src/lib/sveltekit/index.ts` keeps its existing `type RateLimitLike` export line
  untouched.
- [ ] **Step 5: targeted tests green:** the new file plus
  `npx vitest run src/tests/unit/section-action.test.ts` (the wrapper's rate-limit branches must be
  unaffected by the type move).
- [ ] **Step 6: full gate.** `npm run check:surface` must report **no drift**: the type moved
  modules but its `./sveltekit` export and shape are identical. Any drift means the re-export is
  wrong; stop and fix rather than regenerating the snapshot.
- [ ] **Step 7: commit.**

### Task 3: the `./cloudflare` server-only subpath

The promotion, with its gates and docs in one commit, imitating `82fcd36b` (the `./auth-store`
promotion) and pass one's `./auth-crypto` task touch for touch. Deliverable count: four (barrel +
export map, gate wiring, contract test, reference page + index + changelog).

**Files:**
- Create: `src/lib/cloudflare/index.ts`
- Create: `src/lib/cloudflare/browser.ts` (one statement: throw
  `new Error('@glw907/cairn-cms/cloudflare is server-only')` at import time, with a one-line
  comment saying why: these primitives handle a Turnstile secret and call platform bindings, and
  would leak or fail in a client bundle. Imitate `src/lib/auth-crypto/browser.ts`.)
- Modify: `package.json` (a `./cloudflare` entry in `exports` with `types`, `browser`, and
  `default`, imitating the `./auth-crypto` entry)
- Modify: `scripts/reference-coverage.mjs` (add
  `{ subpath: '/cloudflare', dts: 'dist/cloudflare/index.d.ts', page: 'docs/reference/cloudflare.md' }`
  to the `CONFIG` table beside the `/auth-crypto` entry)
- Create: `docs/reference/cloudflare.md`; Modify: `docs/reference/README.md` (one index line,
  imitating the auth-crypto line)
- Create: `src/tests/unit/cloudflare-exports.test.ts` (imitate
  `src/tests/unit/auth-crypto-exports.test.ts`)
- Modify: `CHANGELOG.md` and `docs/guides/upgrade-cairn.md` (open the new `## Unreleased` window in
  both)
- Regenerate: `docs/internal/api-surface.md` (via `npm run check:surface -- --update`)
- Do **not** modify `scripts/check-reference-signatures.mjs` (see the global constraint).

**Interfaces:**
- Produces: the published subpath `@glw907/cairn-cms/cloudflare` exporting exactly three runtime
  names, `verifyTurnstile`, `checkRateLimit`, `checkRateLimitKeys`, plus the `RateLimitLike` type.

- [ ] **Step 1: write the failing exports test.** Import
  `* as cloudflare from '../../lib/cloudflare/index.js'`; assert the sorted runtime export list is
  exactly the three names above (the exact-list style, so an accidental fourth export fails
  loudly); assert `checkRateLimit(undefined, 'k')` resolves `true`; assert `verifyTurnstile('', '')`
  resolves `false`.
- [ ] **Step 2: run it, confirm it fails** (module not found).
- [ ] **Step 3: create the barrel and the browser trap.** The barrel is a pure re-export with a
  header comment in the `auth-store/index.ts` register: what the subpath is for (Cloudflare-native
  platform primitives two sites already copy verbatim), and the membership rule stated as a rule,
  not a description, so a future contributor reads the boundary before adding an export: anything
  here must be a Cloudflare platform primitive; a third-party service verifier (a payment
  processor's webhook check, a chat platform's notifier) belongs to the site, whatever precedent
  Turnstile appears to set.
- [ ] **Step 4: wire the export map and the coverage gate** (`package.json`,
  `scripts/reference-coverage.mjs`).
- [ ] **Step 5: write `docs/reference/cloudflare.md`.** Imitate `auth-crypto.md`'s register: a
  `**Server only.**` banner as the first body line (the `browser` condition enforces it at build;
  the banner says so), a header naming the subpath and its membership rule, an import snippet, then
  a section per export with `Stability tier: Extension API.` and a fenced signature. Required
  content, all from the spec and Tasks 1 and 2: for `verifyTurnstile`, that every failure mode
  returns `false` by contract; that `ip` must come from `CF-Connecting-IP` and never a forwardable
  header; that a token is single-use with a roughly 300-second window; that `hostname` and `action`
  should be supplied whenever a sitekey serves more than one form, since without them a token
  solved on any widget sharing the sitekey replays; that the caller never logs the response body or
  the secret; and that degrade-to-open is the caller's convention (`if (secret && ...)`), shown as
  the worked snippet, with the site key and any `window.turnstile` ambient declaration named as
  site-side. For the rate-limit pair, the two sentences from Task 2 (best-effort, per-location and
  eventually consistent, never an authoritative security control; and the short-circuit's effect on
  later keys' counters), the absent-binding degrade-to-open case, and a cross-link to
  `createSectionAction`, whose `rateLimit` option is the in-engine consumer of `RateLimitLike`.
  Snippets must pass `check:snippets`: `declare` any site-local helper a block references rather
  than reaching for a skip comment.
- [ ] **Step 6: open the changelog and upgrade windows.** A new `## Unreleased` heading above
  `## 0.93.0` in `CHANGELOG.md` carrying `<!-- release-size: minor -->` and one `### Added` entry
  naming the subpath, its three exports, and the reference page, ending `Consumers must: nothing.`;
  a matching `## Unreleased` window in `docs/guides/upgrade-cairn.md`. Run `npm run check:version`
  and `npm run check:docs` to confirm both windows parse and pair.
- [ ] **Step 7: regenerate the surface snapshot:** `npm run check:surface -- --update`; the diff
  must show only the new `## /cloudflare` section. Commit it with the task.
- [ ] **Step 8: full gate,** including the five public-surface gates by name. Commit.

### Task 4: the packaged D1 audit sink and its migration

The seam's first implementation, internal; Task 5 exports and documents it. Deliverable count: four
(the migration, the module, the log event, the suites).

**Files:**
- Create: `migrations/0002_audit.sql`
- Create: `src/lib/sveltekit/audit-sink.ts`
- Modify: `src/lib/log/events.ts` (add `'admin.audit.sink_failed'`)
- Modify: `docs/reference/log-events.md` (one table row for the new event)
- Create: `src/tests/unit/audit-sink.test.ts`
- Create: `src/tests/integration/audit-sink.test.ts`
- Modify: `ROADMAP.md` (the `COLLATE NOCASE` entry in Next: it now takes the next free migration
  number after `0002`)

**Interfaces:**
- Produces:
  `createD1AuditSink(db: D1Database, waitUntil: ((promise: Promise<unknown>) => void) | undefined): AdminActionAuditSink`.
  `waitUntil` is **required and explicitly accepts `undefined`**: an optional parameter would make
  the shortest call the one that silently drops records when the isolate tears down first, so
  omitting it has to be a decision on the record.
- Consumes: `AdminActionAuditRecord` and `AdminActionAuditSink` from `./admin-action.js`, and
  `D1Database` from `@cloudflare/workers-types` (type-only, matching `src/lib/auth/store.ts:11`).

- [ ] **Step 1: write `migrations/0002_audit.sql`.** ASC's schema carried whole:
  `id INTEGER PRIMARY KEY AUTOINCREMENT`, `actor TEXT NOT NULL`, `action TEXT NOT NULL`,
  `entity TEXT NOT NULL`, `entity_id TEXT`, `detail TEXT`,
  `created_at TEXT NOT NULL DEFAULT (datetime('now'))`. A header comment says what it is, that it
  is opt-in (only a site wiring `createD1AuditSink` applies it), and that `actor` holds whatever
  string the writing wrapper supplies (an editor email from this sink; a site's own wrappers may
  write a member id or `'system'`). Note that `created_at` is a `datetime('now')` string here,
  deliberately unlike the auth tables' epoch-millisecond integers, because this is ASC's proven
  schema and the column is read by humans, not by the engine. The test harness applies every file
  in `migrations/` in lexical order, so this table exists in the integration pool from this commit
  on.
- [ ] **Step 2: write the failing unit test.** `src/tests/unit/audit-sink.test.ts` against a fake
  `db` recording `prepare(sql)`, `bind(...args)`, and `run()`. Prove: a record produces exactly one
  parameterized `INSERT` whose SQL contains no interpolated values (assert the SQL string has no
  record content in it) and whose bound arguments are, in order, the editor, action, entity,
  `entityId`, and `detail`; an absent `entityId` and an absent `detail` bind `null`, not
  `undefined`; a numeric `entityId` binds as a string; every field truncates to its documented
  maximum (drive one oversized value per field and assert the bound length); the returned sink
  returns synchronously, before the insert settles (its declared type is `(record) => void`); a
  provided `waitUntil` receives the in-flight promise exactly once; an explicit `undefined`
  `waitUntil` still performs the insert; and a `run()` that rejects **does not throw out of the
  sink** and emits `admin.audit.sink_failed` carrying the whole truncated record plus the error
  message. Also assert the emitted failure record carries no `undefined`-shaped surprises: it names
  the actor, action, entity, entityId, and detail actually bound.
- [ ] **Step 3: run it, confirm it fails.**
- [ ] **Step 4: implement.** One exported factory. Truncate every bound field to a module-level
  documented maximum before binding, so an oversized handler-composed `detail` cannot suppress its
  own audit row (the fail-open path must not become log evasion); pick maxima that fit the real
  values with room to spare and state each in the TSDoc, since the reference page repeats them.
  Bind through `prepare`/`bind`, and say in a comment that this is parameterized deliberately, so
  nobody later simplifies it to a template string. `.catch()` the run, log
  `admin.audit.sink_failed`, and hand the promise to `waitUntil?.()`. The TSDoc carries the three
  consumer-facing properties: fail-open (a persist failure never fails the audited action), the
  drop risk when `waitUntil` is `undefined`, and the truncation maxima.
- [ ] **Step 5: write the integration test.** `src/tests/integration/audit-sink.test.ts` against the
  real miniflare D1, imitating the existing integration suites' harness use: wire the sink to the
  test `AUTH_DB`, emit one record with a `waitUntil` that awaits, and assert the row lands in
  `audit_log` with the expected column values, including a `created_at` the database populated.
  This is what proves the migration and the statement agree; the unit suite only proves the shape.
- [ ] **Step 6: targeted tests green,** then the full gate.
- [ ] **Step 7: amend the ROADMAP entry** for `COLLATE NOCASE` so it names the next free number
  rather than `0002`, which this pass took.
- [ ] **Step 8: commit.**

### Task 5: export the sink, document seam 5, and close the pass

The public surface and the docs for seam 5, plus the pass's closing gate sweep. Deliverable count:
three (the export, the reference and guide prose, the changelog and snapshot).

**Files:**
- Modify: `src/lib/sveltekit/index.ts` (export `createD1AuditSink` beside the existing
  `AdminActionAuditSink` type export)
- Modify: `docs/reference/sveltekit.md` (a `createD1AuditSink` section, and the migration)
- Modify: `docs/guides/add-a-custom-admin-screen.md` (the sink as the one-line way to persist the
  audit trail a guarded section emits)
- Modify: `CHANGELOG.md` and `docs/guides/upgrade-cairn.md` (extend Task 3's Unreleased window)
- Regenerate: `docs/internal/api-surface.md`

**Interfaces:**
- Produces: `createD1AuditSink` on `@glw907/cairn-cms/sveltekit`.

- [ ] **Step 1: export it,** and extend `src/tests/unit/*sveltekit-exports*` (or whichever suite
  asserts that subpath's export list; find it by grep rather than trusting this line) so the new
  name is covered.
- [ ] **Step 2: write the reference section.** In `docs/reference/sveltekit.md`, beside
  `AdminActionAuditSink`: what the factory is, its fenced signature, and the four things the spec
  and the review require a developer to know. That `waitUntil` is required and takes `undefined`
  explicitly, with the drop risk stated. That it fails open, and what the truncation maxima are, so
  an oversized `detail` is truncated rather than able to suppress its own row. That the migration
  is opt-in: show the copy line the auth guides already use
  (`cp node_modules/@glw907/cairn-cms/migrations/0002_audit.sql migrations/`) followed by
  `wrangler d1 migrations apply`, and name the table's columns. And that a site wiring the sink
  should configure `createSectionAction`'s rate limit, because **authorization denials insert
  rows**: `createSectionAction` audits every refusal, and denials arrive **before** any
  binding resolution (the amended check order pass one shipped), so a refused session still
  produces audit traffic. Include the one-line `hooks.server.ts` wiring as a snippet that passes
  `check:snippets`.
- [ ] **Step 3: update the custom-admin-screen guide.** Where it teaches `createSectionAction`, add
  the sink as the way to persist what `ctx.audit` emits, one wiring line plus the migration
  pointer, cross-linked to the reference. Keep it short; the reference carries the contract.
- [ ] **Step 4: extend the changelog and upgrade windows** with one `### Added` entry for the sink
  and the packaged migration, ending `Consumers must: nothing.` (a site that wants persistence opts
  in by applying the migration and wiring one line; nothing changes for a site that does not).
- [ ] **Step 5: regenerate the surface snapshot** (`npm run check:surface -- --update`); the diff
  must show only `createD1AuditSink` on `/sveltekit` and, if Task 3's regeneration missed it,
  nothing else.
- [ ] **Step 6: the full closing gate,** every check by name: `npm run check`, `npm test` (unpiped),
  `npm run check:comments`, `npm run check:reference`, `npm run check:reference:signatures`,
  `npm run check:surface`, `npm run check:package`, `npm run check:snippets`, `npm run check:docs`,
  `npm run check:version`. Commit.

## Acceptance for the pass

- `@glw907/cairn-cms/cloudflare` publishes `verifyTurnstile`, `checkRateLimit`,
  `checkRateLimitKeys`, and `RateLimitLike`, is server-only by build condition, and has a reference
  page stating its membership rule.
- `RateLimitLike` has exactly one declaration in the source tree, and `./sveltekit`'s surface is
  byte-identical for it.
- `@glw907/cairn-cms/sveltekit` publishes `createD1AuditSink`, and `migrations/0002_audit.sql`
  ships in the package (`migrations` is already in `package.json`'s `files`).
- `turnstile.verify_failed` and `admin.audit.sink_failed` are in the `CairnLogEvent` union and in
  `docs/reference/log-events.md`.
- Every gate above passes, including the four CI-only ones run by name.
- The `## Unreleased` window in `CHANGELOG.md` and `docs/guides/upgrade-cairn.md` carries both
  additions, `release-size: minor`, `Consumers must: nothing` on each. No version bump; no publish.
- The pass-end reviewer fan-out runs `web-auth-security-reviewer` and
  `cloudflare-workers-reviewer`, both mandatory (STATUS, 2026-08-01).

## Post-mortem (2026-08-01)

**Built.** The five planned tasks landed as specified, on `asc-engine-seams-2`:

- `d1b23796` `verifyTurnstile`, fail-closed against Cloudflare siteverify
- `182d3734` the rate-limit wrapper and the `RateLimitLike` consolidation
- `c3957d70` the `./cloudflare` server-only subpath, its reference page, and the Unreleased window
- `09492434` the packaged D1 audit sink and `migrations/0002_audit.sql`
- `70e53cfe` the `createD1AuditSink` export and seam 5's documentation
- `a3215031` the code-simplifier refinement over the implementation

Then two review rounds and their folds, which are the real story of this pass:

- `a2369bb4` turnstile and rate-limit hardening (round one)
- `33528d65` the audit sink and its migration (round one)
- `04880a0a` the documentation sweep (round one)
- `b013ad2f` the verification-round findings on both modules
- `27dbf155` the documentation reconciled against the final code
- `f8ddf88c` `verifyTurnstile`'s own doc block reconciled with it

**Verified.** `npm run check` 1555 files, 0 errors, 0 warnings; `npm test` 382 files, 4705 tests,
exit 0 confirmed unpiped; `check:comments`, `check:reference`, `check:reference:signatures`,
`check:package`, `check:docs`, `check:snippets`, `check:surface`, and `check:version` all green,
the four CI-only gates run by name. The consumer build is proven by CI's own checkout, never by the
worktree, whose symlinked showcase `node_modules` resolves to main's build. Three reviewers ran the
pass-end gate (`web-auth-security-reviewer` and `cloudflare-workers-reviewer`, both mandatory per
STATUS, plus `svelte-reviewer` on the type and export surface); the two mandatory ones then
re-verified the fold, probing their claims in node rather than asserting them.

**Decisions locked.**

1. **The migration claimed `0002`,** with the queued `COLLATE NOCASE` auth migration renumbered to
   the next free number in ROADMAP. Its `created_at` default deviates from the spec's
   "ASC's schema carried whole": `datetime('now')` produces a format that `new Date()` parses as
   local time in a browser and that sorts non-deterministically within a second, so it ships as
   `strftime('%Y-%m-%dT%H:%M:%fZ','now')`. The reasoning is in the migration header. Free to fix
   now, a migration against two production sites later, and the column exists to be read by people.
   Two indexes ship for the same reason.
2. **The `./cloudflare` charter line is written twice,** in the barrel header where a contributor
   adding an export reads it, and in the reference page where a developer proposing one reads it.
   Cloudflare-native platform primitives are in-stack; a third-party service verifier never rides
   the Turnstile precedent in.
3. **`verifyTurnstile` gained a log event the spec did not call for.** A fail-closed verifier that
   logs nothing turns a Cloudflare outage or a rotated secret into a silent site-wide human lockout.
   The final shape logs every refusal except an ordinary bot rejection, which is the function
   working.
4. **Three review findings deliberately not adopted**, each for a stated reason: a log event on the
   bare rate-limit helpers' absent-binding branch (a helper with no call-site context emits an
   untriageable event; the reference page carries the guidance and `createSectionAction` keeps the
   event where it has the context); changing `createD1AuditSink` to take the `ExecutionContext`
   object rather than the `waitUntil` method (spec-locked signature, with the bind requirement
   documented and the try/catch covering the failure); and the
   `check-reference-signatures.mjs` `| undefined` fix, filed to ROADMAP as C1's opening item
   because its snapshot regen can cascade.

**What the reviewers caught that the gates could not.** Every gate was green when the first
reviewer fan-out began, and the pass still had a defect in each of its two headline features. The
audit sink's advertised fail-open covered only a rejected promise, so an unbound binding or a
`D1_TYPE_ERROR` from `bind` turned a completed mutation into a 500 the editor would retry, and
turned `createSectionAction`'s clean 403 into a 500. `isSiteverifyBody` checked that `success`
existed and then tested it for truthiness, so `{"success":"false"}` verified as a solved token in
a module whose entire contract is that a refactor cannot flip it open. Both were probe-confirmed by
two independent reviewers. Neither is reachable by any test that was written first, because both
are failures of a claim the implementation made about itself.

**The process defect, which repeated.** Documentation ran as a sibling of code changes in the first
fold, so the reference pages described a moving target: the failure-mode lists, the `created_at`
format, and a retention command that silently never prunes its boundary day all shipped stale, and
half of round two's findings were that staleness rather than new defects. Round two ran code first
and documentation strictly second, against the final code, and the docs dispatch then caught the
one page the earlier ordering had left behind. **When code is still moving, documentation goes
last, not alongside.** The same shape appeared inside a single dispatch's output: the sink
dispatch wrote a TSDoc naming the deprecated `platform.context` while the docs dispatch fixed the
markdown, and neither fixed the other's copy.

**Plan defects found in execution.** Task 1's "wrap the whole fetch-and-parse in a single
try/catch" contradicted the same task's test step, which required a rejected fetch and an
unparseable body to log distinct reasons; the implementer used two guards and reported the
deviation rather than complying. The standing lesson from pass one held again: a plan's file list
and its prose are starting points, and an implementer that verifies beats one that complies.

**Budgets.** Three workflows (nine agents, then five, then two) plus a scoped simplifier run and
one inline main-loop fix, against a plan that expected five dispatches and one review gate. Subagent
tokens, by workflow: 1,145,459 for the implementation and first review; 628,867 for the first fold
and its verification; 326,861 for the verification-round close; 84,056 for the fold simplifier.
About 2.19M across seventeen agents, and the two review-and-fold rounds account for roughly 47% of
it. The
pass roughly doubled, and the honest split is that the review rounds found real defects while the
documentation staleness was self-inflicted. Human interaction points: five. One was the pass-start
instruction and one was a substantive decision (adding the fifth item to C1, with its sizing
caveat). **Two were Geoff asking whether work was still running**, which is an attention cost the
orchestrator caused by leaving long background work opaque; a progress signal on a multi-hour
workflow is owed rather than optional. The fifth was a forward-planning question, separate from
this pass's execution.

**Carried forward.** The `check-reference-signatures.mjs` `| undefined` fix opens C1. The
`sideEffects` coverage gate is filed as mechanical hardening: the fix works today but nothing tests
it, and the glob is depth-fixed, so the next server-only subpath silently reopens the hole. The
window holds unpublished at `release-size: minor`, `Consumers must: nothing` on both entries.
