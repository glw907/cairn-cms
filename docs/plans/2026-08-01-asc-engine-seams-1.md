# ASC engine seams pass one: auth crypto and the section action

> **For agentic workers:** execute task-by-task by dispatching each task to `cairn-implementer`
> (pinned Sonnet) per the repo's plan-execution defaults; the main loop reviews each diff and
> confirms the full gate between dispatches. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** land the first two ASC-brief seams: a server-only `./auth-crypto` subpath exporting
the auth cryptography a site's second audience otherwise copies by hand, and a
`createSectionAction` factory on `./sveltekit` producing the guarded form-action wrapper every
site-built admin section otherwise hand-rolls.

**Authority:** the design spec `docs/superpowers/specs/2026-08-01-asc-engine-seams-design.md`
(decisions settled with Geoff 2026-08-01), tracing to the consumer brief
`docs/internal/2026-08-01-asc-consumer-brief.md`. Seams 3, 4, and 5 are designed in the same
spec but implemented in pass two; do not build them here.

**Architecture:** Seam 1 is mostly an export-map promotion: the pure crypto in
`src/lib/auth/crypto.ts` exports as is, one new `cookieName(base, secure)` primitive carries
the `__Host-` discipline (the engine's own cookie names become delegations through it, byte-
identical), and `tokensMatch` consolidates into the crypto module. No TTL, cookie-naming
policy, or session-model surface: a TTL is a site ruling. Seam 2 composes onto the existing
`adminAction` (editor identity, CSRF, single form read, audit contract) and adds only what
the engine cannot know: the site's DB-binding resolver and an optional rate limit. The access
map is never a parameter; the wrapper reads the guard-attached `locals.cairnAccess`, failing
closed when absent, so a POST can never check a different map than the loads enforce.

**Tech stack:** existing only. TypeScript, svelte-package, Vitest, the `check:*` gate
scripts. No new dependencies; the rate-limit binding is typed structurally, never via
`@cloudflare/workers-types`.

## Global constraints

- Every seam stays properly generic: ASC and ecxc are evidence, never shape. Nothing club-,
  member-, or binding-layout-specific in any exported name, type, or message.
- Full gate per task before it reports done: targeted test green, `npm run check` ending
  `0 ERRORS 0 WARNINGS`, `npm test` exit 0.
- Public-surface gates for any task that touches the export map or a documented export:
  `npm run check:surface` (regenerate `docs/internal/api-surface.md` with `--update` and
  commit the diff), `npm run check:reference`, `npm run check:reference:signatures`,
  `npm run check:package`, `npm run check:snippets`.
- TSDoc per the repo authoring standard (`npm run check:comments`); no em dash in comments.
- Reference-doc prose follows `docs/internal/docs-register.md` and the Google standard (Vale).
- Changelog entries accumulate under the existing `## Unreleased` window with
  `Consumers must: nothing`; the window's `release-size` marker stays `minor`. No version
  bump, no publish: this pass holds and batches (Geoff's 2026-08-01 call).
- The `docs-links` parity gate ties `CHANGELOG.md`'s Unreleased window to
  `docs/guides/upgrade-cairn.md`'s; a task that amends one amends both.
- Commit per task, specific files, imperative mood, `Co-Authored-By: Claude
  <noreply@anthropic.com>`.

---

### Task 1: the `cookieName` primitive and the `tokensMatch` consolidation

Internal refactor, behavior-identical; nothing exports publicly yet. Deliverable count: three
(the primitive, the move, the equivalence test).

**Files:**
- Modify: `src/lib/auth/crypto.ts`
- Modify: `src/lib/sveltekit/csrf.ts` (drop its `tokensMatch` definition, import from
  `../auth/crypto.js`)
- Modify: `src/lib/sveltekit/admin-action.ts:15` (import `tokensMatch` from
  `../auth/crypto.js` instead of `./csrf.js`)
- Create: `src/tests/unit/auth-crypto.test.ts`

**Interfaces:**
- Produces: `cookieName(base: string, secure: boolean): string` and
  `tokensMatch(a: string, b: string): boolean`, both exported from `src/lib/auth/crypto.ts`.
  Task 2's barrel re-exports them; Task 3 keeps consuming `tokensMatch` only through
  `adminAction`.

- [ ] **Step 1: write the failing test.** `src/tests/unit/auth-crypto.test.ts`, two describe
  blocks. `cookieName`: `cookieName('cairn_session', true)` is `'__Host-cairn_session'`;
  `cookieName('cairn_session', false)` is `'cairn_session'`; an arbitrary base
  (`'asc-member'`) prefixes the same way. Equivalence: for both `secure` states,
  `sessionCookieName(secure)` equals `cookieName('cairn_session', secure)` and
  `csrfCookieName(secure)` equals `cookieName('cairn_csrf', secure)`, so the refactor is
  provably byte-identical. Validation (adversarial-review hardening): a base starting with
  `__Host-` or `__Secure-` throws (double-prefixing is a browser-silently-rejects mystery);
  a base containing a character outside the cookie-name token set throws (test `;`, `=`, a
  space, and `\n`); `cairn_`-prefixed bases do NOT throw (the engine's own names delegate
  through this function; the namespace is reserved by documentation). `tokensMatch`
  (imported from `../../lib/auth/crypto.js`): equal tokens true; empty-vs-empty false;
  same-length mismatch false; different-length false; a non-ASCII pair differing only in a
  multibyte character compares correctly (the byte-encoding case).
- [ ] **Step 2: run it, confirm it fails** (`cookieName` and `tokensMatch` not exported from
  `crypto.ts`): `npx vitest run src/tests/unit/auth-crypto.test.ts`.
- [ ] **Step 3: implement.** In `crypto.ts`: add `cookieName(base, secure)` returning
  `` `__Host-${base}` `` when secure, `base` otherwise, throwing an actionable error on a
  `__Host-`/`__Secure-`-prefixed base or a character outside the RFC 6265 cookie-name token
  set, with a TSDoc comment carrying the `__Host-` rationale the two existing name
  functions carry today plus the other half of the prefix contract (the browser accepts a
  `__Host-` cookie only with `Secure`, `Path=/`, and no `Domain`) and the `cairn_`
  reservation; rewrite `sessionCookieName`/`csrfCookieName` as one-line delegations through
  it. Move `tokensMatch` in from `csrf.ts`, upgraded per the spec: encode both sides with
  `TextEncoder`, return false on unequal byte length, use `crypto.subtle.timingSafeEqual`
  when the runtime provides it (workerd does; Node's webcrypto does not) with the XOR loop
  as fallback, and a doc comment stating the three consumer-facing properties (length leak,
  empty-is-false, fixed-length CSPRNG tokens and hex hashes only). In `csrf.ts`: import
  `tokensMatch` alongside the existing `csrfCookieName, generateCsrfToken` import. Update
  `admin-action.ts`'s import. Then `grep -rn "tokensMatch" src/` and update any importer
  the list above missed (tests included); the only known importers today are `csrf.ts`'s
  own callers and `admin-action.ts`.
- [ ] **Step 4: targeted tests green:** the new file plus
  `npx vitest run src/tests/unit/admin-action.test.ts` (its CSRF mismatch cases prove the
  moved compare still backs the wrapper).
- [ ] **Step 5: full gate** (`npm run check`, `npm test`). No public surface changed, so
  `check:surface` must report no drift; if it reports any, the refactor was not
  behavior-identical: stop and fix.
- [ ] **Step 6: commit.**

### Task 2: the `./auth-crypto` server-only subpath

The promotion, with its gates and docs in one commit, imitating `82fcd36b` (the `./auth-store`
promotion) touch for touch. Deliverable count: five (barrel + export map, gate wiring,
contract test, reference page + docs index, changelog + upgrade window); the five are one
promotion viewed from five gates, not five features.

**Files:**
- Create: `src/lib/auth-crypto/index.ts`
- Create: `src/lib/auth-crypto/browser.ts` (one statement: throw
  `new Error('@glw907/cairn-cms/auth-crypto is server-only')` at import time, with a
  one-line comment saying why: every export here is Web Crypto and would run, uselessly and
  dangerously, in a client bundle)
- Modify: `package.json` (the `exports` map: a `./auth-crypto` entry with `types`,
  `browser` pointing at the built stub, and `default`, otherwise imitating the
  `./auth-store` entry)
- Modify: `scripts/reference-coverage.mjs` (add
  `{ subpath: '/auth-crypto', dts: 'dist/auth-crypto/index.d.ts', page: 'docs/reference/auth-crypto.md' }`
  to the subpath table at scripts/reference-coverage.mjs:309)
- Modify: `scripts/check-reference-signatures.mjs` (add `'/auth-crypto#hashToken'` and
  `'/auth-crypto#cookieName'` beside the `/auth-store` anchors at
  scripts/check-reference-signatures.mjs:39-40)
- Create: `docs/reference/auth-crypto.md`; Modify: `docs/reference/README.md` (one index
  line, imitating the auth-store line)
- Create: `src/tests/unit/auth-crypto-exports.test.ts` (imitate
  `src/tests/unit/auth-store-exports.test.ts`)
- Modify: `CHANGELOG.md` and `docs/guides/upgrade-cairn.md` (extend the existing
  `## Unreleased` window in both; retitle the upgrade guide's window heading to include the
  new subpath)
- Regenerate: `docs/internal/api-surface.md` (via `npm run check:surface -- --update`)

**Interfaces:**
- Consumes: Task 1's `cookieName` and `tokensMatch` on `src/lib/auth/crypto.ts`.
- Produces: the published subpath `@glw907/cairn-cms/auth-crypto` exporting exactly six
  names: `generateToken`, `generateSessionId`, `generateCsrfToken`, `hashToken`,
  `tokensMatch`, `cookieName`.

- [ ] **Step 1: write the failing exports test.** Import
  `* as authCrypto from '../../lib/auth-crypto/index.js'`; assert the sorted export list is
  exactly the six names above (the same exact-list style the auth-store test uses, so an
  accidental seventh export fails loudly); assert `generateToken()` matches
  `/^[A-Za-z0-9_-]{43}$/` and `await hashToken(...)` matches `/^[0-9a-f]{64}$/`; assert
  `cookieName('x', true)` is `'__Host-x'`.
- [ ] **Step 2: run it, confirm it fails** (module not found).
- [ ] **Step 3: create the barrel.** A pure re-export of the six names from
  `../auth/crypto.js`, with a header comment in the `auth-store/index.ts` register: what the
  subpath is for (a site authenticating a second audience stops copying the engine's
  cryptography), and what deliberately stays out (the TTL constants, the engine cookie-name
  functions, every auth-flow and store function; audience semantics, the store schema, and
  the two-stores-never-blur rule stay site-owned).
- [ ] **Step 4: wire the export map and gates** (`package.json`, `reference-coverage.mjs`,
  `check-reference-signatures.mjs`).
- [ ] **Step 5: write `docs/reference/auth-crypto.md`.** Imitate `auth-store.md`'s register:
  a `**Server only.**` banner as the first body line (the `browser` condition enforces it at
  build; the banner says so), a header naming the subpath and its audience (the
  second-audience story, with the ASC member-auth shape as the worked example, unnamed per
  the docs register), the what-stays-out paragraph (a TTL is the site's ruling; the
  engine's own cookie names are internal, and `cairn_`-prefixed bases are the engine's
  reserved namespace), an import snippet, then a section per export with `Stability tier:
  Extension API.` and a fenced signature. Reviewer-mandated content, all from the spec:
  `hashToken`'s precondition paragraph BEFORE its signature (CSPRNG-drawn values only;
  never a password, numeric OTP, email, or anything enumerable; those need a password KDF
  cairn does not ship; cite the OWASP Password Storage Cheat Sheet); `cookieName`'s
  attribute contract (`Secure`, `Path=/`, no `Domain`, or the browser silently rejects) and
  the `secure`-derivation caveat (behind upstream TLS termination `url.protocol` is not the
  externally visible scheme); `tokensMatch`'s three properties; and the "discipline these
  primitives assume" section per the spec (hash-only storage, atomic single-statement
  consume shown via the engine's own `consumeToken` SQL, token in POST body never a URL,
  `Referrer-Policy: no-referrer` plus the admin guard's header set named as the second
  audience's own responsibility, double-submit CSRF on the second audience's routes, rate
  limiting per email and per IP; cite the OWASP Authentication and Session Management
  cheat sheets). Include one composed snippet, a site building its own session cookie:
  `const name = cookieName('member-session', url.protocol === 'https:')`. Snippets must
  pass `check:snippets`. Add the README.md index line.
- [ ] **Step 6: changelog and upgrade window.** One `### Added` entry in `CHANGELOG.md`
  naming the six exports and the reference page, ending `Consumers must: nothing.`; a
  matching paragraph in `upgrade-cairn.md`'s Unreleased section; retitle that window's
  heading to cover the addition.
- [ ] **Step 7: regenerate the surface snapshot:** `npm run check:surface -- --update`;
  the diff must show only the new `## /auth-crypto` section. Commit the diff with the task.
- [ ] **Step 8: full gate,** including the five public-surface gates by name. Commit.

### Task 3: the `createSectionAction` module and its suite

The factory, internal only; Task 4 exports it. Deliverable count: four (two small
amendments to existing modules, the module, the test suite); the amendments exist because
the adversarial review compile-proved the factory cannot be built without them.

**Files:**
- Modify: `src/lib/sveltekit/admin-action.ts` (two review-mandated amendments, both
  compile-proven necessary: `AdminActionEvent` becomes `AdminActionEvent<Env = AuthEnv>
  extends EventBase<Env>` so the factory's returned function is assignable to a route's
  generated `Actions` when the site's `App.Platform['env']` is its own generated type (the
  default preserves every existing consumer's meaning; `adminAction` itself never reads
  `platform`), and its `locals` gain `cairnAccess?: AccessMap`, which `EventBase` already
  carries and the narrowed re-declaration dropped, so the wrapper can read it typed)
- Modify: `src/lib/sveltekit/guard.ts:132` (attach `access ?? {}` instead of `access`;
  behavior-identical, since `canReach` and `hasAccessRule` agree on `undefined` and `{}` in
  every branch, and it makes the wrapper's absent-map 500 mean what it says: the guard
  never ran)
- Create: `src/lib/sveltekit/section-action.ts`
- Create: `src/tests/unit/section-action.test.ts`
- Regenerate: `docs/internal/api-surface.md` (the `AdminActionEvent` widening is a declared
  public-shape change; disclose it in this task's diff)

**Interfaces:**
- Consumes: `adminAction`, `AdminActionContext`, `AdminActionEvent` from
  `./admin-action.js`; `canReach`, `hasAccessRule`, and `AccessMap` from
  `../auth/access.js`; `log` from `../log/index.js`; `fail`, `isActionFailure`, and the
  `ActionFailure` type from `@sveltejs/kit`.
- Produces, all exported from `section-action.ts` (Task 4 re-exports them):

```ts
/** The structural slice of a Workers RateLimit binding the wrapper calls; any conforming limiter serves. */
export interface RateLimitLike {
  limit(options: { key: string }): Promise<{ success: boolean }>;
}

/** Site-fixed configuration: only what the engine cannot know. */
export interface SectionActionConfig<Env, Db> {
  /** Resolve the section's database binding off the platform env; undefined fails the action closed (500). */
  resolveDb: (env: Env | undefined) => Db | undefined;
  /** Optional per-action rate limit, degrade-to-open: an unresolved binding never blocks. */
  rateLimit?: {
    resolve: (env: Env | undefined) => RateLimitLike | undefined;
    key: (ctx: AdminActionContext) => string;
    message?: string;
  };
}

/** Per-call-site options: the audit verbs, reused verbatim for denials. */
export interface SectionActionOptions {
  action: string;
  entity: string;
  /** The authorization target the access map matches; defaults to event.url.pathname. A route
   *  serving more than one section, or any route with a rest parameter, must declare it:
   *  SvelteKit dispatches actions by ?/name while the map matches paths, and on a catch-all
   *  route the pathname is attacker-chosen. */
  target?: string;
  ownerOnly?: boolean;
  deniedMessage?: string;
}

/** What a wrapped handler receives: adminAction's context plus the resolved binding.
 *  NonNullable so explicit type arguments cannot re-nullify what the check order proved. */
export type SectionActionContext<Db> = AdminActionContext & { db: NonNullable<Db> };

export function createSectionAction<Env, Db>(config: SectionActionConfig<Env, Db>): <T>(
  handler: (args: { event: AdminActionEvent<Env>; form: FormData; ctx: SectionActionContext<Db> }) => Promise<T>,
  opts: SectionActionOptions,
) => (event: AdminActionEvent<Env>) => Promise<T | ActionFailure<{ error: string }>>;
```

`Env` does not infer from the resolver parameter alone (compile-proven collapse to `{}`
under `check:snippets`' options): every documented snippet annotates the parameter or
passes explicit type arguments, and with `resolveDb` annotated, `rateLimit.resolve` is
contextually typed.

**Behavior contract** (the module's TSDoc carries this ordering the way `adminAction`'s and
ASC's `clubAdminAction`'s do; the wrapper's own refusals return SvelteKit's `fail(...)`, so
a form renders them, and each is audited through `ctx.audit` with `opts.action`/
`opts.entity` and the exact `detail` string given, except the rate limit, which logs but
never audits. Let `target = opts.target ?? event.url.pathname` throughout. User-facing
copy is deliberately uniform: both 403 branches share
`'You do not have access to this action.'` (overridable via `opts.deniedMessage`) and both
500 branches share `'This section is not available.'`, so an authenticated editor learns no
deployment or gating detail from the copy; branch identity lives in the audit `detail` and
the structured log):

1. `adminAction` composes underneath: editor resolution, CSRF, the single form read, the
   audit contract. A refusal it throws (`AdminActionError`) propagates untouched (a site
   maps it in `handleError`; the reference says so).
2. Rate limit, when configured: `resolve` returning undefined never blocks, and logs
   `log.warn('admin.action.rate_limit_absent', { path, action, entity })` so the open
   degrade is observable (local dev, vitest, an unprovisioned deploy all log it; a
   production Workers Logs query on the event finds a forgotten `[[ratelimits]]` block). A
   `limit()` call that THROWS also degrades to open, logged through the same event with an
   `error` field: a transient binding error must not become a 500. A present binding
   answering `success: false` logs `log.warn('admin.action.rate_limited', { path, action,
   entity, editor })` and returns
   `fail(429, { error: config.rateLimit.message ?? 'Too many requests. Wait a moment and try again.' })`.
   No `ctx.audit` on this branch: a limiter denial is back-pressure, not a domain state
   change, and auditing it would hand a flood one D1 insert per rejected request once the
   pass-two sink lands.
3. `resolveDb` returning undefined audits `detail: 'rejected: database not bound'`, logs
   `log.error('admin.action.misconfigured', { path, reason: 'db_not_bound' })`, and returns
   `fail(500, { error: 'This section is not available.' })`: a deployment
   misconfiguration, not a denial.
4. `event.locals.cairnAccess` absent (now typed on `AdminActionEvent` directly; no wrapper
   event interface, no cast) audits `detail: 'rejected: access map not attached'`, logs
   `log.error('admin.action.misconfigured', { path, reason: 'access_map_not_attached' })`,
   and returns `fail(500, { error: 'This section is not available.' })`. With the guard's
   `access ?? {}` amendment this genuinely means the guard never ran on this route; a
   zero-config site presents an empty map and lands in branch 5 instead, whose log names
   the remedy.
5. `hasAccessRule(map, target)` false audits `detail: 'rejected: no access rule'`, emits
   `auth.access.denied` (`warn`, the guard's own event shape: `{ email, role, target }`),
   logs the remedy (`declare the section path in defineAccess and pass access to
   createAuthGuard`), and returns `fail(403, { error: opts.deniedMessage ?? 'You do not
   have access to this action.' })`. This mirrors `requireAccess` exactly, owner included:
   a POST must never be admitted where the load fails closed, and `canReach` alone (its
   permissive unmapped reading is nav semantics) is never consulted without
   `hasAccessRule` first.
6. `canReach(map, ctx.editor, target)` false audits `detail: 'rejected: role not
   admitted'`; `opts.ownerOnly` set with a non-owner capability audits
   `detail: 'rejected: not owner'`; both emit `auth.access.denied` (`warn`) and return
   `fail(403, { error: opts.deniedMessage ?? 'You do not have access to this action.' })`.
   `ownerOnly` stacks on the map check, never replaces it.
7. The handler runs once with `ctx: { ...ctx, db }`.

- [ ] **Step 1: write the failing suite.** Imitate `admin-action.test.ts`'s `jar`/`makeEvent`
  fakes, extending the event with `platform: { env }` and `locals.cairnAccess`, WITHOUT
  casts (once the Task 3 amendments land, the shapes type cleanly; a cast here would hide
  the exact assignability defect the review caught). Cases, one `it` per line here:
  - no `rateLimit` config: handler runs (a matching CSRF pair, a valid editor, and a mapped
    path given);
  - `rateLimit.resolve` returns undefined: handler runs (degrade-to-open), and no audit
    record was emitted for it;
  - a `limit()` that throws: handler still runs (degrade-to-open on error);
  - binding present, over limit: 429 `ActionFailure` (assert via `isActionFailure` and
    `.status`), handler never called, and NO audit record emitted (the no-audit-on-429
    contract);
  - binding present, under limit: handler runs, and `rateLimit.key` was called with a ctx
    whose `editor.email` is the verified editor's;
  - `resolveDb` returns undefined: 500 with `'This section is not available.'`, audited
    `'rejected: database not bound'`, handler never called;
  - `locals.cairnAccess` absent: 500, audited `'rejected: access map not attached'`,
    handler never called;
  - `locals.cairnAccess` an EMPTY map (the guard's zero-config sentinel): 403, audited
    `'rejected: no access rule'`, handler never called, OWNER included (build the event
    with an owner-capability editor to prove the fail-closed mirror of `requireAccess`);
  - map present but no rule matches the pathname: 403, audited `'rejected: no access
    rule'`, owner included, even though `canReach` alone would have admitted (the
    fail-open defect the review caught, pinned as a test);
  - map rule present, role not admitted (a two-role map, an editor-capability session
    against a path mapped to the other role): 403 with the shared default message
    `'You do not have access to this action.'`; again with `deniedMessage` set, the
    override comes back;
  - `opts.target` set: authorization runs against `opts.target`, not `event.url.pathname`
    (map admits the pathname but not the target: refused; map admits the target but not
    the pathname: admitted — the catch-all defense);
  - `ownerOnly: true` with an editor-capability session a permissive map admits: 403,
    audited `'rejected: not owner'`, same shared default message;
  - ordering: with an over-limit binding AND an unbound db, the 429 wins (rate limit runs
    first, the evidence order);
  - happy path: `ctx.db` is the exact object `resolveDb` returned, the handler's return
    value comes back through both wrappers, and exactly one audit record was emitted by
    the handler itself (proving the wrapper's refusal audits did not fire).
- [ ] **Step 2: run it, confirm it fails** (module not found).
- [ ] **Step 3: land the two amendments** (`admin-action.ts` generic + `locals.cairnAccess`;
  `guard.ts` `access ?? {}`), then run
  `npx vitest run src/tests/unit/admin-action.test.ts src/tests/unit/guard.test.ts`: both
  suites stay green untouched, proving the amendments are additive.
- [ ] **Step 4: implement the factory to the contract above.** Header comment: what the
  factory is for (the enforcement every site-built section otherwise hand-rolls, because
  SvelteKit dispatches a matched action directly and never re-runs an ancestor layout's
  `load`), what it deliberately does not do (no schema, no domain, no member-side
  anything), and the fail-closed rationale per branch.
- [ ] **Step 5: add the compile-only type test** (review note N1: the runtime fakes cannot
  prove route assignability, and `check:snippets` rewrites `./$types` to `any`). In the
  test file, a non-executing block: declare a synthetic env type
  (`type SiteEnv = { SECTION_DB: { marker: true } }`), build
  `createSectionAction<SiteEnv, SiteEnv['SECTION_DB']>({ resolveDb: (env) => env?.SECTION_DB })`,
  and assert the produced action `satisfies` kit's `Action` shape for an event whose
  `platform.env` is `SiteEnv` (import the types from `@sveltejs/kit`). This must compile
  under the suite's `npm run check` without casts.
- [ ] **Step 6: suite green,** then full gate. Regenerate the surface snapshot
  (`npm run check:surface -- --update`); the diff must show ONLY the `AdminActionEvent`
  widening (the generic parameter and the `cairnAccess` local), which this task disclosed
  deliberately. Any other drift is a defect.
- [ ] **Step 7: commit.**

### Task 4: export `createSectionAction` and document it

Deliverable count: five (barrel export + signature anchor, reference sections + log-events
rows, guide update, changelog + upgrade window, ROADMAP filing). Stated per the pass-sizing
rule; the fifth is one line.

**Files:**
- Modify: `src/lib/sveltekit/index.ts` (export `createSectionAction` and the types
  `RateLimitLike`, `SectionActionConfig`, `SectionActionOptions`, `SectionActionContext`
  from `./section-action.js`, beside the existing `adminAction` exports)
- Modify: `scripts/check-reference-signatures.mjs` (add `'/sveltekit#createSectionAction'`)
- Modify: `docs/reference/sveltekit.md` (new sections beside `adminAction`'s; also correct
  the stale `AdminActionEvent` row, which asserts "A real SvelteKit `RequestEvent`
  satisfies it" unconditionally — after the Task 3 amendments the row documents the `Env`
  parameter and its default)
- Modify: `docs/reference/log-events.md` (four new rows: `admin.action.rate_limit_absent`
  `warn`, `admin.action.rate_limited` `warn`, `admin.action.misconfigured` `error` with its
  `reason` values `db_not_bound` and `access_map_not_attached`, and the note that the
  factory's 403 branches emit the existing `auth.access.denied`)
- Modify: `docs/guides/add-a-custom-admin-screen.md` (the actions section teaches
  `createSectionAction` as the default path; `adminAction` stays documented as the
  primitive beneath it for a section needing no db or rate limit)
- Modify: `ROADMAP.md` (file the `applySecurityHeaders` promotion the review suggested as a
  candidate: the guard applies the header set only under `/admin`, and a second audience
  built on `./auth-crypto` has no exported way to apply the same set; docs-only in this
  pass, the export is a future call)
- Modify: `CHANGELOG.md` and `docs/guides/upgrade-cairn.md` (extend both Unreleased windows)
- Regenerate: `docs/internal/api-surface.md` (via `npm run check:surface -- --update`)

**Interfaces:**
- Consumes: Task 3's exports, verbatim.
- Produces: the documented public factory on `@glw907/cairn-cms/sveltekit`.

- [ ] **Step 1: export from the barrel** and add the signatures anchor. Run
  `npx vitest run src/tests/unit/section-action.test.ts` (still green through the barrel).
- [ ] **Step 2: document in `sveltekit.md`.** Imitate the `adminAction` sections' register:
  the factory's purpose, the site-fixed vs per-call split, the check order with its
  statuses, the degrade-to-open and fail-closed conventions, `Stability tier: Extension
  API.`, fenced signatures for the factory and its four types. Review-mandated clauses,
  all from the spec: the section's layout `load` must call `requireAccess` (reads and
  writes then gate on the same fail-closed predicate) and a section path must carry a map
  rule; a multi-action or catch-all route must declare `opts.target`; `adminAction`'s own
  session/CSRF guards throw `AdminActionError` and need a site `handleError` mapping (only
  the factory's own branches render as form failures); the rate-limit `key` must carry an
  actor-scoped, normalized component, one binding is one shared budget, and the limiter
  never bounds request-parse cost (the body is read before it runs); only
  `createAuthGuard` may write `locals.editor`/`locals.cairnAccess` and it must be the last
  handle to set them; denial audits carry no `entityId`, so a handler's own audit should;
  a POST through SvelteKit remote functions never reaches form actions, so the factory
  does not guard it. The composed snippet uses the ANNOTATED resolver form
  (`resolveDb: (env: App.Platform['env'] | undefined) => env?.SECTION_DB`), never the bare
  `(env) =>` shape, which the review compile-proved collapses `Env` to `{}` and fails
  `check:snippets`. Add the four log-events rows.
- [ ] **Step 3: update `add-a-custom-admin-screen.md`.** Where the guide currently shows
  the hand-rolled action path, the factory becomes the shown path; keep the flow
  task-shaped per the guides register. The guide's prerequisites change and must say so
  (review note N7): declaring `defineAccess` with a rule covering the section path, and
  passing it to `createAuthGuard`, becomes a named prerequisite step, not an implication.
  Link the existing checkOrigin/CSRF page rather than restating its guidance (the watched
  kit#15992 removal has one place to land).
- [ ] **Step 4: changelog and upgrade window,** `Consumers must: nothing.`; retitle both
  window headings to cover the factory. The entry also names the `AdminActionEvent`
  widening (generic `Env` defaulting to `AuthEnv`, `locals.cairnAccess`) as additive. Add
  the one-line ROADMAP filing for `applySecurityHeaders`.
- [ ] **Step 5: regenerate the surface snapshot;** the diff must show only the five new
  `/sveltekit` names. Commit the diff with the task.
- [ ] **Step 6: full gate,** all five public-surface gates by name. Commit.

---

## Acceptance for the pass

- The six `./auth-crypto` exports resolve from the built package
  (`npm run check:package` covers the entry point) and the reference page names all six.
- ASC's retrofit story holds by inspection: `member-auth/lib/crypto.ts` reduces to imports
  plus its site-owned TTL constants and SQLite datetime helpers; `club-action.ts`'s
  `resolveCairnAccess` cast and hand-rolled composition are fully replaceable by the
  factory. Nothing in this pass edits ASC; the retrofits run in that repo on its own clock.
- `main` stays releasable: the window holds unpublished, `release-size: minor`,
  `Consumers must: nothing` on every entry.
- Pass-end runs the `cairn-pass` ritual: code-simplifier over the changed code, the reviewer
  fan-out (`web-auth-security-reviewer` is mandatory here: the pass touches auth crypto and
  an authorization wrapper), docs and ROADMAP dimensions, STATUS update, post-mortem.

---

## Post-mortem (2026-08-01)

**Shipped.** All four tasks landed, plus a fifth fold commit and a refinement commit, on
`asc-engine-seams-1`:

- `af886673` the `cookieName` primitive and the `tokensMatch` consolidation
- `19659a39` the `./auth-crypto` server-only subpath
- `a3812180` the `createSectionAction` module and its suite
- `43eade69` the barrel export and the documentation
- `adde6e3c` the pass-end review fold
- `9226f3b0` the code-simplifier refinement and the spec's amended check order

**Verified.** `npm run check` 1545 files 0 errors 0 warnings; `npm test` 377 files, 4638
tests, exit 0 confirmed unpiped (a first run captured `tail`'s status through a pipe, which is
exactly the masking the shell-gate-hygiene rule names); `check:comments`,
`check:reference`, `check:reference:signatures`, `check:package`, `check:docs`,
`check:snippets` (183 blocks), and `check:surface` all green, the four CI-only gates run by
name. The consumer build is proven by CI's own checkout on PR #15, not by the worktree, whose
symlinked showcase `node_modules` resolves to main's build.

**Decisions locked.**

1. **The check order moved, and the spec is amended, not the code excused.** `resolveDb` runs
   after every authorization check. Both pass-end reviewers independently found that the
   spec's order let a refused session read deployment state off the status code and audited
   its attempt as a config fault. The access-map-attached 500 stays ahead of authorization out
   of necessity and leaks nothing per-editor.
2. **Uniform refusal copy is now structural.** The simplifier factored the five refusal
   branches into `deny` and `misconfigured` helpers, so there is exactly one place each
   response body is built. The security property was previously a convention five branches
   had to keep by hand.
3. **Two review suggestions deliberately not adopted**, both recorded in the spec: throwing
   rather than `fail(...)` for the 403/500 branches (kept, with `requireAccess` in the
   section's load as the compensating requirement), and detecting a rest-parameter route to
   refuse the default target (`opts.target` is declarative on purpose; a pathname heuristic
   would refuse legitimate routes and still miss the multi-section case).

**Plan defects found in execution, all by verifying rather than complying.** Task 2's and
Task 4's instruction to add anchors to `scripts/check-reference-signatures.mjs` was wrong in
both directions: that list is an *exemption* allowlist, so following it would have skipped the
signature check for exactly the exports this pass added. Both implementers verified the gate
before and after and left the file untouched. Task 3's file list also omitted two compile
necessities (`src/lib/log/events.ts` for the new log vocabulary, and an integration test
asserting `cairnAccess` was literally `undefined`, which the guard amendment changed to `{}`).
The standing lesson holds: a plan's file list is a starting point, and `grep` beats trust in
"behavior-identical".

**Carried forward.** Pass two inherits the amended order and must describe denials as arriving
before binding resolution in the audit sink's reference. The `applySecurityHeaders` promotion
is filed in ROADMAP under Considering. A weak-type generic constraint (`Env extends AuthEnv`
fails TS2559 against a real site env, because an all-optional constraint triggers weak-type
detection) forced two narrow, commented casts in `section-action.ts`; both are load-bearing
and documented at the cast site.

**Budgets.** Six implementer/simplifier dispatches plus a four-agent workflow (two
implementers, two reviewers). Human interaction points: one, the pass-start instruction. Every
subsequent decision was either specified by the plan or settled against the spec. The
mid-pass roadmap conversation was Geoff-initiated and separate from the pass's own execution.
