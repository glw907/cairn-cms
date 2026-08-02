# Pre-beta phase C1: the seam-shape pass

> **For agentic workers:** execute task-by-task by dispatching each task to `cairn-implementer`
> (pinned Sonnet) per the repo's plan-execution defaults; the main loop reviews each diff and
> confirms the full gate between dispatches. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** settle the shape of the public contract before C2's naming pass reads it and before the
core features build on it. Five entries: make the surface snapshot stop lying about nullability,
sweep the env-genericity defect class, rule on each seam's function color, document the refusal
channels, and declare the supported toolchain.

**Authority:** `ROADMAP.md`'s Next tier, five "Pre-beta contract" entries (the
`check-reference-signatures.mjs` `| undefined` fix, the env-genericity sweep, the function-color
audit, the refusal-channel ruling, the toolchain matrix), sequenced by the "pre-beta pass series"
section at `ROADMAP.md:69-105`. Pass two's post-mortem is
`docs/superpowers/plans/2026-08-01-asc-engine-seams-2.md`.

**Branch topology, load-bearing:** this pass branches off `asc-engine-seams-2`, NOT off `main`.
Pass two is deliberately unmerged ([PR #16](https://github.com/glw907/cairn-cms/pull/16)), so `main`
lacks the `./cloudflare` subpath, `createD1AuditSink`, and their `api-surface.md` entries.
Regenerating the surface snapshot from `main` would silently drop pass two's exports. The worktree
is `.claude/worktrees/pre-beta-c1` on branch `pre-beta-c1-seam-shape`.

**Architecture:** nothing structural changes. This pass changes what the contract *says* about
itself, plus two narrow behavior fixes where the code did not hold a promise the docs already made.

**Tech stack:** existing only. No new dependencies.

## Decisions settled at plan time

### 1. The `check-reference-signatures.mjs` fix STAYS in C1, against the pre-authorized split

ROADMAP and STATUS both pre-authorize splitting this item back out to P1 "if the regen cascades past
a handful of signatures". It cascades to **27 entries across 8 subpaths**. The literal trigger fires.
It stays anyway, and the reason is what the measurement actually found.

The item was written as a three-parameter problem: `createD1AuditSink`'s `waitUntil` and `binding` on
the two rate-limit helpers, recorded in the snapshot as plain required parameters. The truth is
larger and different in kind. `normalizeSignature` strips `| undefined` unconditionally, and
`check-surface.mjs` imports that same function (`scripts/check-surface.mjs:17`), so the snapshot
drops nullability from **return types** as well as parameters, everywhere:

- `ContentIndex.byId: (id) => ContentEntry<F>` (real: `| undefined`) — a lookup that can miss,
  recorded as one that cannot.
- `SiteResolver.byPermalink: (path) => ContentEntry` (real: `| undefined`).
- `CookieJar.get: (name) => string` (real: `| undefined`).
- `canReach`, `hasAccessRule`, `ownerLevelRoles`, `resolveCapability`, `roleHome` — every one takes
  `AccessMap | undefined` or `RolesDeclaration | undefined` and is recorded as taking it required.

The decisive measurement: **`| undefined` occurs zero times in `docs/internal/api-surface.md`.** Not
rarely. Never. No nullability change made anywhere on the public surface, in the whole life of the
gate, has ever produced a diff in the artifact that exists to catch surface drift. That is a live
correctness hole in a gate, not a documentation blemish.

Three things follow, and together they invert the split:

1. **The fix's effort is unchanged by the cascade size.** One function, its unit tests, and one
   `--update` regen of a generated file. The 27 entries are regenerated, not hand-edited. The split
   rule exists to protect the pass from unbounded work; there is no unbounded work here.
2. **Deferring it defeats its own stated purpose.** The item runs first because C2's naming sitting
   reads `api-surface.md` as its review document. P1 sits in phase P, after C2 and after release one.
   Splitting it out means C2 reviews a snapshot that lies about nullability on 27 entries.
3. **The signature gate stays green under the fix.** Zero reference-page edits are needed; the pages
   were already written correctly. Only the internal snapshot was wrong. (Verified by running the
   patched gate: all 16 subpaths report OK.)

**The bound that keeps this honest:** Task 1 changes the normalizer and regenerates the snapshot. It
changes **no API**. Where the regen reveals a signature whose nullability looks wrong on the merits
(`SectionActionConfig.resolveDb: (env: Env | undefined) => Db | undefined` is the live candidate),
that is **recorded as input for C2, not fixed here**. An implementer who finds themselves editing
`src/lib` in Task 1 has left the task.

### 2. The env-genericity sweep is decided by compilation, not by design debate

Two constraints from the pass-one record, both non-obvious:

- **`Env extends AuthEnv` does not compile.** It was tried and rejected with TS2559: `AuthEnv` is an
  all-optional interface, so TypeScript's weak-type detection rejects a concrete site env sharing no
  property names with it, even under an `extends` constraint. Every generic introduced by this sweep
  uses **unconstrained `Env` with an `AuthEnv` default**, with narrow commented casts bridging
  internal `AuthEnv`-typed code, exactly as `src/lib/sveltekit/section-action.ts:135,217-222` does.
  Those casts are load-bearing; a later pass must not "clean them up".
- **Already fixed, do not re-fix:** `AdminActionEvent` (`admin-action.ts:47`) and
  `SectionActionConfig`/`createSectionAction` (`section-action.ts:34-43,119`). They are the reference
  instances the sweep matches.

The remaining candidates (`RequestContext`, `HandleInput`, `AdminEvent`, `ContentEvent`,
`SendMagicLink`, `healthLoad`) do not have an obvious answer, and the reason is real: making
`RequestContext` generic is inert unless the factories consuming it also become generic, and a
compliant site's `App.Platform['env']` may already avoid the TS2559 trigger by construction, because
`CairnPlatformBindings` (`platform-bindings.ts:30-44`) guarantees it shares `AUTH_DB`/`EMAIL`/
`PUBLIC_ORIGIN` property names with `AuthEnv`.

**So the sweep does not argue. It compiles.** Task 2 writes a compile-only fixture per public factory
that proves its return value assigns into a site's own ambient-typed slot under a custom
`App.Platform['env']`. A fixture that fails to compile names a type to make generic. A fixture that
compiles means the pinning is harmless today, and the task **documents the pin as intentional at the
declaration** rather than making it generic speculatively. Adding a type parameter nobody can reach
is surface for C2 to rename and a promise to keep, bought for nothing.

Highest-priority fixture, because it is the highest-traffic call site in the library:
`createCairnAdmin`. `AdminEvent` (`cairn-admin.ts:37`) is not exported by name, but its shape is
embedded in the public `.d.ts` of the returned `load`/`actions`/`shellLoad`, and every documented
site writes `export const actions = admin.actions;` — structurally the same assignment that produced
the original `AdminActionEvent` bug.

### 3. The function-color entry's headline case is stale, and the entry gets corrected

`ROADMAP.md:700-706` says "`render(md)` (sync today; a site wanting async embeds post-1.0 would force
a major)". **`SiteRender` has returned `Promise<string>` since `0.76.0`** (`src/lib/content/types.ts:200-207`;
commit `deaa3854`, 2026-06-27; `CHANGELOG.md` 0.76.0 `Consumers must:` step 15). All three engine call
sites already await it. The seam is already async and already ratified in `docs/reference/core.md:560-561`.

The deliverable for `render` is **closing that ROADMAP line**, not changing code. The audit's real
subjects are the seams whose color is undocumented: `ComponentDef.build`, `FieldsetOptions.refine`,
and `RendererOptions.sanitizeSchema` (all sync-only, all inside the synchronous hast pipeline, none
stating so), plus two reference rows that omit what their siblings state (`LinkResolve`,
`SendMagicLink`).

### 4. `AdminActionAuditSink` gets the shim, not just louder prose

The type is `(record) => void`, fire-and-forget, and the docs already promise fail-open
(`docs/reference/sveltekit.md:371-378`; `docs/guides/add-a-custom-admin-screen.md:338-345`). The
engine does not enforce it: `event.locals.auditSink?.(full)` at `admin-action.ts:132` sits inside the
`await handler(...)` path with no `try`/`catch`, so a hand-rolled sink that throws synchronously
fails the whole admin action.

That is the exact defect class pass two paid for twice: a failure of a claim the implementation made
about itself, unreachable by a test written first because the claim lived in prose. Pass two's own
packaged sink is fail-open only because it wraps its own body. The engine should hold the promise for
every sink, not just its own.

Task 3 wraps the call site and emits a log event on a throwing sink, so the failure is diagnosable
rather than invisible. ROADMAP licenses this explicitly ("at most small additive shims"). Silently
swallowing is not acceptable on its own: the repo's logging doctrine says a diagnosable path gets an
event. The dev-mode zero-audit throw at `admin-action.ts:142` stays as it is.

### 5. The refusal-channel entry undercounts. There are five channels

The entry names two (`adminAction` throws, `createSectionAction` returns `fail(...)`). The surface
carries five, and the third one is taught to developers first:

| # | Channel | Where | What the consumer sees |
|---|---|---|---|
| A | `fail(...)` | `section-action.ts:140-151` | Inline form state |
| B | thrown `AdminActionError` | `admin-action.ts:114,122,142` | Nothing useful without a site `handleError` |
| C | thrown SvelteKit `error()` | `guard.ts:162,175,192,217` (`requireOwner`/`requireEditor`/`requireEngineAccess`/`requireAccess`) | Correct status via `+error.svelte`, no `handleError` needed |
| D | thrown SvelteKit `redirect()` | `guard.ts:123,151`; built-in actions' `?error=` bounce | A 3xx |
| E | raw branded `Response` from the Handle | `guard.ts:76,87,101,117` | Pre-routing refusal, before any action runs |

C is the one that matters and the one nobody named. `docs/guides/add-a-custom-admin-screen.md:47-73`
teaches `requireOwner(event)` inside a hand-rolled action as its **first and simplest** example, and
only later upgrades to `createSectionAction`. The two patterns refuse differently and no sentence
anywhere contrasts them. A reader who stops early never learns `AdminActionError` exists; a reader
who starts late never learns the earlier pattern behaves differently.

**The ruling: document, do not converge.** The spec's rationale holds and the shipped code matches it
exactly (verified: `section-action.ts:153-214` implements the amended seven-step order). The
documentation task covers A, B, and C as the developer-facing set, with D and E as one-line
cross-references. Verbatim rationale to quote, from
`docs/superpowers/specs/2026-08-01-asc-engine-seams-design.md:311-317`:

> One security finding was deliberately not adopted: throwing for the 403/500 branches. `fail(...)`
> is kept (type-verified, ASC-proven form UX), and the exposure it worried about closes by requiring
> `requireAccess` in a section's `load`, so reads and writes share one fail-closed predicate.

**Not doing:** an exported `isAdminActionError` type guard. It is new public surface added immediately
before the pass that renames public surface, and `instanceof` works. Filed for C2 to consider.

### 6. The toolchain matrix asserts only what is proven, and `engines.node` is a build-toolchain floor

Four calls the evidence forces:

1. **Two rows per dimension, not one.** The peer floor and the CI-proven point are different claims
   and the lockfiles disagree (root resolves svelte `5.56.3`, kit `2.61.1`, vite `8.0.16`; the
   showcase resolves `5.56.4`, `2.68.0`, `8.1.0`). The table states "minimum supported" from
   `peerDependencies` and "proven against" from the showcase lockfile, which is what CI exercises.
2. **The TypeScript floor is 5.0**, forced by `const` type parameters on the public surface
   (`src/lib/content/fields.ts:147-165`: `defineAdapter`, `defineConcept`, `fieldset`, every
   `fields.*`). This is distinct from the `^6.0.3` devDependency, which is what the engine develops
   against.
3. **State the resolution requirement positively.** The package is ESM-only with a conditional
   `exports` map and no legacy `main`/`types` fallback, so the matrix asserts it needs
   `moduleResolution` of `node16`, `nodenext`, or `bundler`. It does **not** assert that `node10`
   fails, which is sound general TypeScript behavior but unproven in this repo and not worth a probe
   task to publish. Only `bundler` is positively proven end-to-end (the showcase's own
   `tsconfig.json:6-10`).
4. **`engines.node` is `>=22`, and the matrix says why.** Node is the build toolchain, never the
   runtime; the runtime is workerd. CI's Node 22 pin is a vitest-pool-workers constraint, so it is
   evidence about tooling, not about consumers. The floor that IS consumer-facing comes from Vite 8
   and SvelteKit 2, and Node 22 is already the published claim at
   `docs/tutorial/build-your-first-cairn-site.md:7`. Declaring it matches what the docs already
   promise. `wrangler` and `@cloudflare/workers-types` get "proven against" rows only, since the
   package declares no formal dependency on either.

**Out of scope, filed to ROADMAP:** extending `cairn-doctor`'s `config.dependency-floors` check
(`src/lib/doctor/check-floors.ts`) beyond svelte and kit.

## Global constraints

- **Documentation goes LAST in any task where code is still moving** (Geoff, 2026-08-01). Pass two
  paid for the opposite: docs ran as a sibling of code changes, described a moving target, and half
  of one review round was self-inflicted staleness. Tasks 1-3 are code and carry only the doc changes
  their own gates force. Tasks 4-6 are documentation, written after the code has settled.
- Full gate per task before it reports done: targeted test green, `npm run check` ending
  `0 ERRORS 0 WARNINGS`, `npm test` exit 0. Run `npm test` unpiped, or read `PIPESTATUS`; a `| tail`
  captures `tail`'s exit status and masks the gate.
- **`scripts/check-reference-signatures.mjs`'s `ALLOWLIST` is an EXEMPTION list, not a registration
  list.** Adding a name to it SKIPS the signature check for that export. Task 1 changes the
  normalizer, never the allowlist. (Pass one's plan had this instruction backwards in two tasks and
  three implementers caught it by verifying rather than complying. Verify every file list below the
  same way: a plan's file list is a starting point, not a contract.)
- Public-surface gates for any task touching the export map or a documented export:
  `npm run check:surface` (regenerate with `--update` and commit the diff), `npm run check:reference`,
  `npm run check:reference:signatures`, `npm run check:package`, `npm run check:snippets`.
- The four CI-only gates the local ritual skips: `check:comments`, `check:reference:signatures`,
  `check:surface`, `check:snippets`. Run them by name. `check:snippets` sits at
  `.github/workflows/test.yml:35` and short-circuits five gates after it.
- TSDoc per the repo authoring standard (`npm run check:comments`); no em dash in comments.
- Reference prose follows `docs/internal/docs-register.md` and the Google standard (Vale).
- Changelog entries go under the EXISTING `## Unreleased` window (pass two's, `release-size: minor`),
  with the matching window in `docs/guides/upgrade-cairn.md`. No version bump, no publish.
- Commit per task, specific files, imperative mood, `Co-Authored-By: Claude <noreply@anthropic.com>`.

---

### Task 1: teach the signature normalizer what an optional artifact is

**Deliverables: 2** (the normalizer fix with tests; the regenerated snapshot.)

**Problem.** `normalizeSignature` (`scripts/check-reference-signatures.mjs:70`) runs
`s.replace(/\s*\|\s*undefined\b/g, '')` over the whole signature. Its own comment claims every
`| undefined` is an artifact of `typeToString` expanding an optional `x?: T`, and that no
deliberately-required `T | undefined` exists in the surface. Both halves are now false.
`check-surface.mjs:17` imports the same function, so `docs/internal/api-surface.md` carries the same
blindness: `| undefined` appears zero times in it.

**The rule to implement.** A `| undefined` is an optional artifact if and only if the innermost
enclosing type region was introduced by a `?:`. Everything else is a real union member and survives.
The regions nest, so a bare "outermost only" reading is wrong: in
`(opts?: { roles?: RolesDeclaration | undefined } | undefined)` BOTH occurrences are artifacts, the
outer one belonging to `opts?:` and the inner to `roles?:`.

A depth-scoped single pass implements this. Track bracket depth over `(`, `[`, `{`, `<`; on `name?:`
mark the current depth optional; on `,` or `;` clear the current depth (the next parameter or member
starts fresh); on entering a bracket, the new depth starts non-optional. Strip a `| undefined` only
when the current depth is marked optional. **`=>` must be consumed as a unit**, or its `>` decrements
depth and corrupts every arrow-bearing signature. The existing `headToArrow` helper carries the same
hazard and documents it at `check-reference-signatures.mjs:172-174`.

**Steps**

- [ ] Write the unit tests FIRST in `src/tests/unit/check-reference-signatures.test.ts` (the file
      already exists and imports `normalizeSignature`). Cover, at minimum: a required
      `T | undefined` parameter survives (`waitUntil: ((p: Promise<unknown>) => void) | undefined`);
      an optional parameter's artifact is stripped (`key?: string | undefined` becomes `key?: string`);
      a nested optional member's artifact is stripped while a sibling required union survives
      (`(binding: RateLimitLike | undefined, key?: string | undefined)`); both levels of
      `(opts?: { roles?: R | undefined } | undefined)` are stripped; and a `| undefined` nested inside
      a type argument under an optional parameter survives
      (`x?: Array<T | undefined> | undefined` keeps the inner, drops the outer).
- [ ] Replace the blanket regex with the depth-scoped pass. Rewrite the comment at lines 65-69: it
      currently asserts the false premise, and the new comment states the rule and why the arrow
      exception exists.
- [ ] Run `node scripts/check-reference-signatures.mjs`. Expected: all 16 subpaths OK, zero problems.
      **If any reference page now fails, STOP and report it rather than editing the page** — the
      measurement says this should not happen, and a failure means the rule is wrong.
- [ ] Run `npm run check:surface` to see the diff, then `npm run check:surface -- --update` and commit
      the regenerated `docs/internal/api-surface.md`. Expected: 27 changed entries across `.`,
      `/admin-toolkit`, `/cloudflare`, `/delivery`, `/delivery/data`, `/media`, `/render`, `/sveltekit`.
      A materially different count means the rule is wrong; report rather than accepting it.
- [ ] **Change no file under `src/lib`.** If the regen surfaces a signature whose nullability looks
      wrong on the merits, record it in the task report for C2. Do not fix it here.

**Acceptance:** the five unit cases pass; `check:reference:signatures` green across all 16 subpaths;
`api-surface.md` regenerated and committed with nullability visible; `git diff --stat src/lib` empty.

---

### Task 2: prove the env-genericity boundary, then fix only what fails

**Deliverables: 3** (the compile fixtures; the generic conversions the fixtures force; the
intentional-pin doc comments where they do not.)

**Problem.** `AdminActionEvent` was hard-pinned to `AuthEnv` and broke route `Actions` assignability
for a site whose `App.Platform['env']` is its own generated type. Pass one fixed that instance. The
class was never swept.

**The acceptance pattern.** `src/tests/**/section-action.test.ts` already carries a compile-only
block: a local `SiteEnv`/`SiteRequestEvent` type override (**never** a `declare global App.Platform`,
which would leak across the suite), then `satisfies Action` and
`satisfies Record<string, (event: SiteRequestEvent) => unknown>`. Read it before writing the new
fixtures and match its shape.

**Steps**

- [ ] Write a compile-only fixture per public factory, each proving its return value assigns into a
      site's own ambient-typed slot under a custom `App.Platform['env']` that is a superset of
      `AuthEnv` plus site-specific bindings. Cover, in this order of priority:
      `createCairnAdmin` (its `actions`, `load`, and `shellLoad` — the highest-traffic case, since
      every documented site writes `export const actions = admin.actions;`), `createAuthGuard` (its
      returned `Handle` into `sequence()`), `createContentRoutes`, `createNavRoutes`,
      `createAuthRoutes`, and `createEditorRoutes`.
- [ ] For each fixture that FAILS to compile, make the offending type generic over `Env` with an
      `AuthEnv` default. Candidates in likely order: `AdminEvent` (`cairn-admin.ts:37`, pinned to
      `BackendEnv & AuthEnv`), `RequestContext` (`sveltekit/types.ts:46`), `HandleInput`
      (`sveltekit/types.ts:53-56`, chained to `RequestContext`), `ContentEvent` (pinned to
      `BackendEnv`), `healthLoad`'s inline `{ platform?: { env?: BackendEnv } }`.
      **Use unconstrained `Env` with a default. Never `Env extends AuthEnv`** — it fails TS2559
      against a real site env, because `AuthEnv` is all-optional and TypeScript's weak-type detection
      rejects it. Bridge internal `AuthEnv`-typed code with narrow casts, each carrying a comment
      saying why, exactly as `section-action.ts:135,217-222` does.
- [ ] For each fixture that COMPILES today, add a short doc comment at the type's declaration
      recording that the pin is intentional and what makes it safe (the `CairnPlatformBindings`
      guarantee at `platform-bindings.ts:30-44` that a compliant site's `Platform.env` shares
      `AUTH_DB`/`EMAIL`/`PUBLIC_ORIGIN` names with `AuthEnv`, which is what avoids the TS2559
      trigger). **Do not make it generic speculatively.** An unreachable type parameter is surface
      C2 has to rename and the project has to keep.
- [ ] Rule on `adminAction` explicitly in its doc comment: it stays non-generic by design, because it
      never reads `event.platform`, and a site whose action needs its own env bindings reaches for
      `createSectionAction`. Recording this stops a later reader filing it as a missed instance.
- [ ] Leave `SendMagicLink` alone. It names `AuthEnv` as a parameter, but the engine only ever calls
      it with a `RequestContext`-derived value, so changing it in isolation is inert. Note it in the
      task report.
- [ ] Not in this class, confirmed, do not touch: `requireAccess`/`requireEditor`/`requireOwner`/
      `requireSession`, `createMediaRoute`, and `csrf.ts`'s helpers (no `platform`/`env` field, or
      they use SvelteKit's own ambient `RequestHandler`).

**Acceptance:** every fixture compiles; `npm run check` 0/0; `npm test` exit 0; `check:surface`
regenerated if any exported type gained a parameter (a type parameter WITH a default is not
source-breaking, so the changelog entry says `Consumers must: nothing`); every remaining pin carries
a comment saying it is deliberate.

---

### Task 3: make the audit sink's advertised fail-open true

**Deliverables: 2** (the guarded call site with its log event; the tests.)

**Problem.** `docs/reference/sveltekit.md:371-378` and
`docs/guides/add-a-custom-admin-screen.md:338-345` both promise the audit sink is fail-open. The
engine's own call site does not hold that promise: `event.locals.auditSink?.(full);`
(`admin-action.ts:132`) has no `try`/`catch` and sits inside the `await handler(...)` path
(`admin-action.ts:136`), so a hand-rolled sink that throws synchronously turns a completed mutation
into a failed admin action. The packaged `createD1AuditSink` is fail-open only because it wraps its
own body (`audit-sink.ts:91-157`).

**Steps**

- [ ] Write the failing test first: an `adminAction` whose `locals.auditSink` throws synchronously
      completes its handler and returns the handler's result.
- [ ] Wrap the call site so a throwing sink cannot fail the action.
- [ ] Emit a log event when a sink throws, so the failure is diagnosable rather than invisible.
      Follow the repo's logging doctrine (`src/lib/log/`): a new event name in the existing
      vocabulary, carrying the action identity and the error, and **never** the audit record's
      contents. Swallowing silently is not acceptable; the whole reason the shim is safe is that the
      failure stays visible in the logs.
- [ ] Leave the dev-mode zero-audit throw (`admin-action.ts:142`) exactly as it is. It catches a
      developer who forgot to audit, which is a different failure from a sink that broke.
- [ ] Add a test that the log event fires on a throwing sink.

**Acceptance:** both tests green; `npm test` exit 0; `npm run check` 0/0. The log event's reference
row is written in Task 4, not here (docs go last while code is moving).

---

### Task 4: record the function-color rulings

**Deliverables: 3** (the reference rulings; the log-events row from Task 3; the ROADMAP correction.)

Documentation task. Tasks 1-3 have settled; nothing under `src/lib` moves here.

The template to imitate is the `attention` seam (`docs/reference/sveltekit.md:1367-1372`), the
best-documented color ruling in the surface: it states the color AND the failure-mode consequence
("A dep that throws fails the whole shell load, by contract: the engine never swallows the error for
you").

**Steps**

- [ ] `docs/reference/sveltekit.md`: state `AdminActionAuditSink`'s ruling — synchronous,
      fire-and-forget, return value discarded, and (as of Task 3) fail-open enforced by the engine
      rather than by the sink's own discipline. Say what happens when a sink throws.
- [ ] `docs/reference/log-events.md`: add the row for Task 3's new event.
- [ ] `docs/reference/core.md`: rule that `ComponentDef.build` and `FieldsetOptions.refine` are
      deliberately synchronous, each with its reason (both run inline inside the render pipeline's
      synchronous hast transform, and validation runs inline in the save action's request path), and
      that a site needing async data pre-fetches and passes it through `attributes` or a resolver.
      These are the two seams a site is most likely to want async, so the omission must read as a
      decision. Add the same one-line ruling for `RendererOptions.sanitizeSchema`.
- [ ] `docs/reference/core.md`: rule that the resolver family (`LinkResolve`, `MediaResolve`,
      `FragmentResolve`) stays synchronous, and align `LinkResolve`'s table row (`core.md:984`) with
      its siblings — it omits the signature and the throw-is-the-build-backstop convention that
      `FragmentResolve` (`core.md:985`) and `MediaResolve` (`media.md:148`) both state.
- [ ] `docs/reference/core.md:1009`: expand `SendMagicLink`'s bare row to its full signature
      `(env, message) => Promise<void>`, matching how `SiteRender`'s row (`core.md:991`) states its
      Promise.
- [ ] `ROADMAP.md:700-706`: correct the entry. Its `render(md)` premise is stale — the seam has
      returned `Promise<string>` since `0.76.0`. Mark the entry done, since this task completes it,
      and remove it from the live tier per the roadmap-is-a-pass-dimension rule.
- [ ] Confirm `docs/reference/core.md:560-561` and the `SiteRender` row still read correctly against
      the shipped async signature. No change expected; verify rather than assume.

**Acceptance:** `npm run check:docs`, `check:reference`, `check:reference:signatures`,
`check:snippets`, and `check:arm-indexes` green; Vale clean on the touched pages.

---

### Task 5: document the refusal channels

**Deliverables: 3** (the reference model; the guide's contrast sentence; the showcase `handleError`.)

Documentation task plus one small showcase addition.

**Steps**

- [ ] `docs/reference/sveltekit.md`: write the refusal-channel model covering the three
      developer-facing channels — hand-rolled `requireOwner`/`requireAccess` in an action throw
      SvelteKit's native `error()`/`redirect()` (correct status with no `handleError`);
      `adminAction`'s own guards throw `AdminActionError` (needs a site `handleError`);
      `createSectionAction`'s own authorization and binding branches return `fail(...)` (renders as
      inline form state). Quote the spec rationale from
      `docs/superpowers/specs/2026-08-01-asc-engine-seams-design.md:311-317` verbatim (reproduced in
      "Decisions settled at plan time" above). Add one-line cross-references for the two channels a
      developer never writes: the built-in actions' `redirect(303, '...?error=')` pattern, and the
      guard's pre-routing raw `Response` (which is why `adminAction`'s own CSRF branch is
      defense-in-depth and rarely observed).
- [ ] `docs/reference/sveltekit.md:236-284`: the `adminAction` section never says `handleError`. That
      sentence exists only inside the `createSectionAction` section (`:445-447`), so a developer using
      `adminAction` standalone — as that section's own example at `:271-283` shows — cannot learn it.
      Add it there.
- [ ] `docs/reference/sveltekit.md:1481`: reword the `AdminActionError` row. It currently says "A
      site's error boundary reads `status`", which reads as SvelteKit's automatic `+error.svelte`
      handling. SvelteKit does NOT recognize `AdminActionError` as an `HttpError` and will not read
      `.status` off an arbitrary thrown `Error`. Name `handleError` explicitly.
- [ ] `docs/guides/add-a-custom-admin-screen.md`: at the transition around `:246-255`, contrast the
      three shapes. The guide's own first example (`:47-73`) calls `requireOwner` directly inside an
      action, which refuses differently from the `createSectionAction` pattern it teaches later, and
      nothing says so.
- [ ] Add a minimal `handleError` to `examples/showcase/src/hooks.server.ts` mapping
      `AdminActionError` to its status. The showcase is the library's own dogfood and today exports
      no `handleError` at all, so the documented mapping has never been proven to work end to end.
      **This step is droppable** if the task runs long; say so in the report rather than trimming a
      documentation step to fit it.
- [ ] Do NOT add an exported `isAdminActionError`. It is new public surface immediately before the
      pass that renames public surface, and `instanceof` works. Record it for C2.

**Acceptance:** `check:docs`, `check:snippets`, `check:arm-indexes` green; Vale clean; if the showcase
step lands, `npm --prefix examples/showcase run build` succeeds.

---

### Task 6: declare the supported-toolchain matrix

**Deliverables: 3** (the matrix page; the `engines` field; the reconciled inbound claims.)

**Steps**

- [ ] Write the matrix. Two claims per dimension, never conflated: **minimum supported** (from
      `peerDependencies`, what the package promises) and **proven against** (the showcase lockfile,
      what CI actually exercises). Rows and their evidence:
      - `@sveltejs/kit`: min `^2.12` (`package.json:168`), proven `2.68.0`. The floor is deliberate
        (`CHANGELOG.md:2688-2690`: the edit page reads `$app/state`, which shipped in kit 2.12.0).
      - `svelte`: min `^5.56.3` (`package.json:169`), proven `5.56.4`. Floor deliberate
        (`CHANGELOG.md:2578-2586`: svelte 5.56.1 miscompiles parenthesized boolean groupings).
      - `typescript`: min **5.0**, forced by `const` type parameters on the public surface
        (`src/lib/content/fields.ts:147-165`). Say plainly that the `^6.0.3` devDependency is what the
        engine develops against, not what a consumer needs.
      - `vite`: proven `8.1.0`. No peer entry exists; state it as proven-against, not a promise.
      - `node`: `>=22`, the BUILD toolchain floor. Say the runtime is workerd, not Node.
      - `moduleResolution`: `node16`, `nodenext`, or `bundler`. Only `bundler` is positively proven
        (`examples/showcase/tsconfig.json:6-10`). Do NOT assert that `node10` fails; it is sound
        general TypeScript behavior but unproven here, and the positive statement covers the reader.
      - `wrangler` / `@cloudflare/workers-types`: proven-against rows only (`4.105.0`,
        `4.20260630.1`). The package declares no formal dependency on either.
      - Footnote the SvelteKit `checkOrigin` deprecation (kit#15992) so a reader does not read
        "deprecated" as "unsupported". It is watched by a scheduled routine, not by this table.
- [ ] Add `"engines": { "node": ">=22" }` to the root `package.json`. This matches CI, matches the
      already-published claim at `docs/tutorial/build-your-first-cairn-site.md:7`, and gives the Node
      dimension its first machine enforcement.
- [ ] Point `docs/tutorial/build-your-first-cairn-site.md:7` at the matrix rather than restating the
      version, so the two cannot drift.
- [ ] Note in the matrix that `check:package`'s three `attw --ignore-rules` entries
      (`package.json:34`) are structural svelte-package limitations with recorded rationale
      (`docs/superpowers/plans/2026-05-29-cairn-rebuild-07-engine-distribution.md:1317-1318`;
      `docs/superpowers/plans/2026-06-28-cairn-extensibility-2-enforced-boundary.md:15`), not masked
      defects. Both plans conclude "do not un-mute".
- [ ] File to ROADMAP (Next): extend `cairn-doctor`'s `config.dependency-floors` check
      (`src/lib/doctor/check-floors.ts`) beyond svelte and kit. It is the only floor enforcement that
      reaches a real consumer, and it covers two of the matrix's rows.

**Acceptance:** `check:docs`, `check:arm-indexes`, `check:package` green; `npm install` still resolves
with the `engines` field present; no docs page contradicts the matrix.

---

### Task 7: close the pass

**Deliverables: 4** (changelog and upgrade guide; ROADMAP; STATUS; post-mortem.)

- [ ] `CHANGELOG.md`, under the EXISTING `## Unreleased` window (pass two's, `release-size: minor`):
      one entry per landed change. `Consumers must: nothing` on the normalizer fix, the genericity
      sweep (a type parameter with a default is not source-breaking), the audit-sink shim (a throwing
      sink previously failed the action and now does not), and the documentation. The `engines` field
      carries `Consumers must: be on Node 22 or later for the build toolchain`, since it is newly
      declared even though it was already the documented requirement.
- [ ] The matching window in `docs/guides/upgrade-cairn.md` (the `docs-links` parity gate ties the
      two).
- [ ] `ROADMAP.md`: mark all five contract entries done and remove them from the live tier. File the
      C2 carry-ins this pass produced: the `SectionActionConfig.resolveDb` nullability question, the
      `isAdminActionError` consideration, and anything Task 1's regen surfaced. File the doctor
      check-floors extension.
- [ ] `docs/STATUS.md`: point the immediate next action at C2, and carry the branch topology forward.
      **Both `asc-engine-seams-2` and this branch are unmerged**, so C2 branches off
      `pre-beta-c1-seam-shape`, not off `main`. A cold session branches off `main` by default and
      would build against an engine missing both passes.
- [ ] Append the post-mortem to this plan file.
- [ ] Hold unpublished. No version bump, no `gh release create`.

---

## Acceptance for the pass

- All seven tasks' acceptance criteria met.
- Full gate green: `npm run check` 0/0, `npm test` exit 0, plus the four CI-only gates by name
  (`check:comments`, `check:reference:signatures`, `check:surface`, `check:snippets`).
- `docs/internal/api-surface.md` shows nullability, and `check:surface` is green against it.
- Reviewer fan-out folded (`svelte-reviewer` and `web-auth-security-reviewer` are the relevant two:
  Task 3 changes an auth-adjacent call site, Task 2 changes types every route assigns through).
- The pass holds unpublished on `pre-beta-c1-seam-shape`.

---

## Post-mortem (2026-08-02)

**Shipped.** All five ROADMAP contract entries, across eleven commits on
`pre-beta-c1-seam-shape`, holding unpublished. Full gate green at close: `npm run check` 0/0,
`npm test` exit 0 unpiped (383 files, 4717 tests), and every named gate passing, including all
four CI-only ones (`check:comments`, `check:reference:signatures`, `check:surface`,
`check:snippets`) plus `check:package`, `check:docs`, `check:arm-indexes`, and `check:version`.

**What each entry actually turned out to be**, which in three of five cases was not what the entry
said:

1. **The signature normalizer** was written as a three-parameter problem and was a systemic one.
   `check-surface.mjs` imports the same `normalizeSignature`, so the blanket `| undefined` strip ran
   over the surface snapshot too, including return types. `| undefined` occurred **zero times** in
   `api-surface.md`: no nullability change on the public surface had ever produced a diff in the
   gate that exists to catch surface drift. The regen corrected 27 entries across 8 subpaths,
   including `ContentIndex.byId`, `SiteResolver.byPermalink`, and `CookieJar.get`, all recorded as
   returning a value that cannot be missing. No reference page needed editing: the pages were right
   and only the internal snapshot was wrong.
2. **The env-genericity sweep** ended with no type made generic, and that conclusion was then found
   to be scoped narrower than it was stated. See "The thing this pass got wrong" below.
3. **The function-color audit's headline case was stale.** `render(md)` has returned
   `Promise<string>` since `0.76.0` (commit `deaa3854`, in that release's `Consumers must:` list).
   The ROADMAP line describing it as sync predated the change by five weeks. The audit's real
   subjects were the seams with no ruling at all: `ComponentDef.build`, `FieldsetOptions.refine`,
   and `RendererOptions.sanitizeSchema`.
4. **The refusal-channel entry undercounted at two.** There are five, and the third
   (`requireOwner`/`requireAccess` throwing SvelteKit-native `error()`) is the one
   `add-a-custom-admin-screen.md` teaches first, un-contrasted against the `createSectionAction`
   pattern it upgrades to later.
5. **The toolchain matrix** was the only entry that was what it said. Its one surprise: the
   TypeScript floor is 5.0, forced by `const` type parameters on the public surface, nowhere near
   the `^6.0.3` the engine develops against.

**The thing this pass got wrong, and how it got caught.** Task 2 concluded "no generics needed" from
seven compile fixtures, and the orchestrator verified the negative control (a disjoint env fails all
seven) before accepting it. That check was real but insufficient. The `svelte-reviewer` found that
the fixtures built `SiteEnv` from `CairnPlatformBindings`, whose `EMAIL` is declared as
`NonNullable<AuthEnv['EMAIL']>`, so for that member the fixture proved cairn's own type assigns to
cairn's own type. A site using the standard Cloudflare workflow (`wrangler types` to generate `Env`)
does **not** assign, because `@cloudflare/workers-types`' `SendEmail.send` returns
`Promise<EmailSendResult>` where `AuthEnv['EMAIL'].send` declares `Promise<void>`. Independently
compile-verified before folding.

The lesson is narrower than "test your tests". A negative control proves a fixture can fail; it does
not prove the fixture models the real input. Both checks are needed, and the second one is the one a
builder skips, because the fixture's own author picks the input from the same materials they built
with. **When a fixture stands in for a consumer, build its input from the consumer's sources, not
from the library's own types.**

The fix was not to make the types generic. Unlike pass one's `AdminActionEvent` (a type consumers
reference), making the factories generic requires a site to write `createCairnAdmin<SiteEnv>(runtime)`
explicitly, since inference has nothing to work from, so it is a `Consumers must:` change and a
design question. C1 recorded the truth instead: a `@ts-expect-error` tripwire in
`src/tests/unit/env-genericity.test.ts` locks the known-incompatible shape and fails the build on
TS2578 if the incompatibility is ever fixed upstream, and the `CairnPlatformBindings` intersection is
now documented as a requirement rather than a recommendation. The decision itself goes to C2 whole.

Note for a reader of `git log`: commit `38d23a3a`'s message says "no generics needed" without that
qualification. It was accurate to what was known then and was not rewritten.

**What the review gate earned, for the third pass running.** Every gate was green when the fan-out
began, and two reviewers found five real defects between them, two of them independently:

- The fixtures' circular env (above), which no gate could see.
- `adminAction`'s non-generic ruling was reasoned from a true premise to a conclusion that does not
  follow: what breaks a site's `Actions` assignment is the returned function's declared parameter
  type, not what its body reads. The ruling was also the one seam ruled on with no fixture behind
  it, in a file whose whole premise is that the sweep compiles rather than argues.
- The audit-sink `catch` swallowed SvelteKit's `redirect()` and `error()`, which are plain classes
  rather than `Error` instances, and logged them as the literal string `"[object Object]"`. That is
  precisely what this plan's own Task 3 forbade in writing.
- The fail-open promise did not cover an async sink: `(record) => void` admits an `async` function
  through void-return bivariance, and the un-awaited call's rejection escaped the `try`. So the
  shim that existed to make a documented promise true was itself one line short of true.
- The showcase `handleError` silently disabled SvelteKit's default server error logging, found by
  both reviewers independently. Defining the hook replaces the default rather than layering on it.

Three of these five are the same species pass two named: **a claim the code makes about itself,
invisible to every mechanical check.** The orchestrator's own diff review caught two more of the
same species (an `audit-sink.ts` rationale that Task 3's guard had just invalidated, and
`AdminActionError`'s doc block asserting behavior SvelteKit does not implement).

**The defect the pass found but did not fix.** `AdminActionError`'s `status` never reaches the
browser. SvelteKit's `get_status` derives a status only from its own `HttpError`/`SvelteKitError`,
so a plain `Error` subclass always renders 500, and `handleError` receives the status as an input
and cannot change it. A 403 authorization refusal is therefore indistinguishable from an engine
fault in logs and monitoring. Not a security defect (the refusal still happens, fail-closed) and not
urgent (the guard refuses both conditions pre-routing in practice, so the branches rarely fire), but
not something to carry into beta. The security review's recommended shape is filed for C2: converge
the channel rather than document the workaround. It also argued against adding an
`isAdminActionError` guard on the grounds that making the workaround comfortable removes the
pressure to remove the need for it. This pass had already declined that export for a different
reason.

**Sequencing decisions that paid off.**

- **Running the normalizer fix first, against the pre-authorized split.** The trigger fired (27
  entries, past "a handful"), but the measurement showed the cascade was a regenerated artifact
  rather than work, and that P1 sits after the C2 sitting that reads the snapshot. Splitting it out
  would have defeated the item's own stated purpose. The bound that kept it honest: the task changed
  no API, and the one signature that looks wrong on the merits
  (`SectionActionConfig.resolveDb`) was recorded for C2 rather than fixed.
- **Documentation last.** Pass two's lesson held. Tasks 1 through 3 moved code, Tasks 4 through 6
  described it, and no doc in this pass described a moving target. The two stale-comment defects
  that did occur were both in code comments written *before* the code moved, which is the same
  failure at a smaller grain and argues for extending the rule: a comment explaining why code does
  something is invalidated by changing that something, so it belongs to the change, not to the
  documentation task.

**Carried, and where.** Four C2 carry-ins filed in ROADMAP: the refusal-channel convergence, the
env-genericity decision whole, the two near-identical log event names
(`admin.audit.sink_failed` versus `admin.action.audit_sink_failed`, both still unpublished so the
rename is free), and a gate gap where `check:reference:signatures` reads only fenced `ts` blocks, so
a signature stated only in a reference table is ungated. Also filed: extending `cairn-doctor`'s
`config.dependency-floors` check beyond svelte and kit, which is the only floor enforcement that
reaches a real consumer.

One boundary recorded rather than fixed, found by `code-simplifier`: for a hypothetical
`f?: (a: string) => T | undefined`, the page form and the real type normalize differently, so the
gate fails loudly rather than passing silently. That is the safe direction and the shape does not
occur in the surface today.

**Process note on pass size.** Six content tasks, a simplifier pass, a two-reviewer fan-out, and a
two-part review fold. The fold was repair of this pass's own work rather than new scope, so it
stayed in; the orchestrator raised the length with Geoff unprompted at the point it became clear,
and offered the docs half as a clean cut. Worth watching: a pass whose review gate finds five real
defects is a pass whose fold is a second pass in miniature.
