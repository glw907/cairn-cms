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
  provably byte-identical. `tokensMatch` (imported from `../../lib/auth/crypto.js`): equal
  tokens true; empty-vs-empty false; same-length mismatch false; different-length false.
- [ ] **Step 2: run it, confirm it fails** (`cookieName` and `tokensMatch` not exported from
  `crypto.ts`): `npx vitest run src/tests/unit/auth-crypto.test.ts`.
- [ ] **Step 3: implement.** In `crypto.ts`: add `cookieName(base, secure)` returning
  `` `__Host-${base}` `` when secure, `base` otherwise, with a TSDoc comment carrying the
  `__Host-` rationale the two existing name functions carry today; rewrite
  `sessionCookieName`/`csrfCookieName` as one-line delegations through it; move `tokensMatch`
  in from `csrf.ts` with its doc comment. In `csrf.ts`: import `tokensMatch` alongside the
  existing `csrfCookieName, generateCsrfToken` import. Update `admin-action.ts`'s import.
  Then `grep -rn "tokensMatch" src/` and update any importer the list above missed (tests
  included); the only known importers today are `csrf.ts`'s own callers and
  `admin-action.ts`.
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
- Modify: `package.json` (the `exports` map: a `./auth-crypto` entry with `types` +
  `default`, no `svelte` condition, imitating the `./auth-store` entry exactly)
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
  a header naming the subpath and its audience (the second-audience story, with the ASC
  member-auth shape as the worked example, unnamed per the docs register), the
  what-stays-out paragraph (a TTL is the site's ruling; the engine's own cookie names are
  internal), an import snippet, then a section per export with `Stability tier: Extension
  API.` and a fenced signature. Include one composed snippet, a site building its own
  session cookie: `const name = cookieName('member-session', url.protocol === 'https:')`.
  Snippets must pass `check:snippets`. Add the README.md index line.
- [ ] **Step 6: changelog and upgrade window.** One `### Added` entry in `CHANGELOG.md`
  naming the six exports and the reference page, ending `Consumers must: nothing.`; a
  matching paragraph in `upgrade-cairn.md`'s Unreleased section; retitle that window's
  heading to cover the addition.
- [ ] **Step 7: regenerate the surface snapshot:** `npm run check:surface -- --update`;
  the diff must show only the new `## /auth-crypto` section. Commit the diff with the task.
- [ ] **Step 8: full gate,** including the five public-surface gates by name. Commit.

### Task 3: the `createSectionAction` module and its suite

The factory, internal only; Task 4 exports it. Deliverable count: two (module, test suite).

**Files:**
- Create: `src/lib/sveltekit/section-action.ts`
- Create: `src/tests/unit/section-action.test.ts`

**Interfaces:**
- Consumes: `adminAction`, `AdminActionContext`, `AdminActionEvent` from
  `./admin-action.js`; `canReach` and `AccessMap` from `../auth/access.js`; `fail`,
  `isActionFailure`, and the `ActionFailure` type from `@sveltejs/kit`.
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
  ownerOnly?: boolean;
  deniedMessage?: string;
}

/** What a wrapped handler receives: adminAction's context plus the resolved binding. */
export type SectionActionContext<Db> = AdminActionContext & { db: Db };

export function createSectionAction<Env, Db>(config: SectionActionConfig<Env, Db>): <T>(
  handler: (args: { event: AdminActionEvent; form: FormData; ctx: SectionActionContext<Db> }) => Promise<T>,
  opts: SectionActionOptions,
) => (event: AdminActionEvent) => Promise<T | ActionFailure<{ error: string }>>;
```

**Behavior contract** (the module's TSDoc carries this ordering the way `adminAction`'s and
ASC's `clubAdminAction`'s do; every refusal returns SvelteKit's `fail(...)`, never a throw,
so a form renders it, and every refusal is audited through `ctx.audit` with `opts.action`/
`opts.entity` and the exact `detail` string given):

1. `adminAction` composes underneath: editor resolution, CSRF, the single form read, the
   audit contract. A refusal it throws (`AdminActionError`) propagates untouched.
2. Rate limit, when configured: `resolve` returning undefined never blocks (local dev,
   vitest, an unprovisioned deploy); a present binding whose `limit()` answers
   `success: false` audits `detail: 'rejected: rate limited'` and returns
   `fail(429, { error: config.rateLimit.message ?? 'Too many requests. Wait a moment and try again.' })`.
3. `resolveDb` returning undefined audits `detail: 'rejected: database not bound'` and
   returns `fail(500, { error: 'The section database is not bound.' })`: a deployment
   misconfiguration, not a denial.
4. The guard-attached access map absent from `event.locals` audits
   `detail: 'rejected: access map not attached'` and returns
   `fail(500, { error: 'The access map is not attached.' })`. Never fall through to
   `canReach` with an absent map: its permissive absent-map reading is nav semantics, and a
   form action never re-runs the layout `load` that would have refused. The wrapper reads
   the map from the event's locals under the guard's own key (`cairnAccess`; see
   `src/lib/sveltekit/types.ts:42` and `guard.ts:132`), typed on the wrapper's own event
   interface extending `AdminActionEvent`, so no site ever casts.
5. `canReach(map, ctx.editor, event.url.pathname)` false audits
   `detail: 'rejected: role not admitted'` and returns
   `fail(403, { error: opts.deniedMessage ?? 'Your role does not have access to this action.' })`.
   With `opts.ownerOnly` and a non-owner capability, audit `detail: 'rejected: not owner'`
   and return `fail(403, { error: opts.deniedMessage ?? 'Only an owner can do this.' })`;
   `ownerOnly` stacks on the map check, never replaces it.
6. The handler runs once with `ctx: { ...ctx, db }`.

- [ ] **Step 1: write the failing suite.** Imitate `admin-action.test.ts`'s `jar`/`makeEvent`
  fakes, extending the event with `platform: { env }` and `locals.cairnAccess`. Cases, one
  `it` per line here:
  - no `rateLimit` config: handler runs (a matching CSRF pair and a valid editor given);
  - `rateLimit.resolve` returns undefined: handler runs (degrade-to-open);
  - binding present, over limit: 429 `ActionFailure` (assert via `isActionFailure` and
    `.status`), audit record emitted with `detail: 'rejected: rate limited'`, handler never
    called;
  - binding present, under limit: handler runs, and `rateLimit.key` was called with a ctx
    whose `editor.email` is the verified editor's;
  - `resolveDb` returns undefined: 500, audited `'rejected: database not bound'`, handler
    never called;
  - `locals.cairnAccess` absent: 500, audited `'rejected: access map not attached'`, handler
    never called, even though `canReach` alone would have admitted;
  - map present, role not admitted for the event's pathname (use a two-role map and an
    editor-capability session against a path mapped to the other role): 403 with the default
    message; again with `deniedMessage` set, the override comes back;
  - `ownerOnly: true` with an editor-capability session a permissive map admits: 403,
    audited `'rejected: not owner'`;
  - ordering: with an over-limit binding AND an unbound db, the audit detail is
    `'rejected: rate limited'` (rate limit runs first, the evidence order);
  - happy path: `ctx.db` is the exact object `resolveDb` returned, the handler's return
    value comes back through both wrappers, and exactly one audit record was emitted by the
    handler itself (proving the wrapper's refusal audits did not fire).
- [ ] **Step 2: run it, confirm it fails** (module not found).
- [ ] **Step 3: implement to the contract above.** Header comment: what the factory is for
  (the enforcement every site-built section otherwise hand-rolls, because SvelteKit
  dispatches a matched action directly and never re-runs an ancestor layout's `load`), what
  it deliberately does not do (no schema, no domain, no member-side anything), and the
  fail-closed rationale per branch.
- [ ] **Step 4: suite green,** plus `npx vitest run src/tests/unit/admin-action.test.ts`
  (composition unchanged).
- [ ] **Step 5: full gate.** No public surface yet, so `check:surface` reports no drift.
- [ ] **Step 6: commit.**

### Task 4: export `createSectionAction` and document it

Deliverable count: four (barrel export + signature anchor, reference sections, guide update,
changelog + upgrade window).

**Files:**
- Modify: `src/lib/sveltekit/index.ts` (export `createSectionAction` and the types
  `RateLimitLike`, `SectionActionConfig`, `SectionActionOptions`, `SectionActionContext`
  from `./section-action.js`, beside the existing `adminAction` exports)
- Modify: `scripts/check-reference-signatures.mjs` (add `'/sveltekit#createSectionAction'`)
- Modify: `docs/reference/sveltekit.md` (new sections beside `adminAction`'s)
- Modify: `docs/guides/add-a-custom-admin-screen.md` (the actions section teaches
  `createSectionAction` as the default path; `adminAction` stays documented as the primitive
  beneath it for a section needing no db or rate limit)
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
  API.`, fenced signatures for the factory and its four types. One composed snippet showing
  a site defining its wrapper once and using it in an action (the spec's shape:
  `resolveDb: (env) => env?.CLUB_DB` becomes a generic `env?.SECTION_DB`); snippets must
  pass `check:snippets`.
- [ ] **Step 3: update `add-a-custom-admin-screen.md`.** Where the guide currently shows the
  hand-rolled action path, the factory becomes the shown path; keep the flow task-shaped per
  the guides register.
- [ ] **Step 4: changelog and upgrade window,** `Consumers must: nothing.`; retitle both
  window headings to cover the factory.
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
