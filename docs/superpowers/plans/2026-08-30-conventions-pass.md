# Conventions Pass (4a) Implementation Plan

> **For agentic workers:** execute through the `cairn-implementer` chain per task
> (implementer, `diff-reviewer`, full gate), workflow mode via
> `~/.claude/workflows/pass-execute.js`. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Codify the five ratified coherence conventions as standing rules, then execute them
across the factory population, the auth family, the coupled reshape/retire items, and the four
engine bins, in one worktree, batched into the standing `Consumers must:` window.

**Architecture:** This is audit-remediation slice 4a (initiative design
`docs/superpowers/specs/2026-08-27-audit-remediation-initiative-design.md`, "The conventions
pass"). The rulings were ratified by Geoff in the 2026-08-30 plan-authoring sitting and are
restated in full below; the pass writes them into the ledger first, then applies them, so no
signature is touched twice. Slice 4b (the cross-surface conformance sweep) executes the
remaining open reshapes against 4a's merged surface and additionally inherits list (c) Tier 1
(see the "What this pass unblocks" note at the end).

**Tech Stack:** TypeScript 6 / SvelteKit 2 / Svelte 5 runes; Vitest; the repo gate
(`npm run check` 0/0, `npm test` exit 0, plus the CI-derived gate list).

**Spec:** `docs/superpowers/specs/2026-08-27-audit-remediation-initiative-design.md` (slice 4),
with per-item shapes in `docs/internal/engine-rulings.md` and the coherence evidence in
`docs/internal/record/2026-08-26-any-site-audit/coherence-v2.md`.

**Worktree:** `.claude/worktrees/conventions`, branched from `main`. After creating it, run a
from-scratch `npm ci` in `examples/showcase` before trusting any e2e (the worktree showcase
symlink gotcha, `CLAUDE.md`).

**Token ceiling:** 4.5M for the WHOLE pass (chains plus ritual). **Checkpoint interval:** every
four tasks (STATUS written at each checkpoint, at any split, and before any question).

## The ratified rulings (Geoff, 2026-08-30 sitting; Task 1 writes these into the ledger)

1. **Parameter bags.** R1 applied as written to the in-population rows: `*Config` is the primary
   bag, the primary parameter identifier is `config`. Plus the **interop carve-out clause**: on
   an interop surface, the host ecosystem's convention wins over cairn's grammar, and the barrel
   records why (`/vite` is the standing example; kit's `RequestHandler`/`Handle` returns are the
   same clause).
2. **Factory returns, contract-first.** Every public factory's signature declares a named,
   deliberately authored return type; the compiler enforces the implementation against it.
   `ReturnType<typeof f>` leaves the public surface. How a declaration is composed is free
   (hand-written members, or `Pick` over an internal wide shape, the foundations-B
   `ContentRoutes` precedent). A host-ecosystem return type (kit `Handle`, kit
   `RequestHandler`) satisfies the rule under the interop clause.
3. **Verb rules.** `verify*` = engine-owned integrity check that throws; `validate*` = check
   returning issues; `check*` retires as a verb (its members fall to the outcome idiom).
   `read*` = read a committed artifact or declaration into typed shape, retiring `extract*`;
   `parse*` reserved for string-to-structure codecs (paired with `format*`). `build*` = derives
   pure data; function factories belong to `create*`, so the resolver trio renames.
4. **Bare nouns.** An exported function's name begins with a verb; an exported value's does
   not; bin names and host-ecosystem plugin factories are out of scope.
5. **Outcome idiom.** An operation with more than two distinguishable outcomes returns a
   discriminated result, never a boolean; `verifyTurnstile`'s fail-closed boolean is the stated
   exception. **`Failure` is the family suffix; `Refusal` and `Skip` retire as suffixes.**
6. **Auth postures.** A missing cookie jar from an untyped caller fails LOUDLY (throw), never a
   soft `fail(403)`. `adminAction` gains the same authorization checks and audited `fail(403)`
   `createSectionAction` carries. The `platform` required-but-nullable convention applies
   uniformly across the CSRF/auth helpers.
7. **Two preventive clauses (R-10).** An internal sibling of a public export gets one barrel
   sentence naming why it stays internal (gated where reachability-shaped). A public-observable
   identifier is dot-namespaced by area; a prefix is never a substitute for a namespace.
8. **`/auth-channel` is KEPT, reopened on evidence (Geoff, 2026-08-30).** The 2026-08-26
   shrink-to-recipe shape is overturned: xcathletes-org now runs its member login on
   `createAuthChannel` (`xcathletes-org/src/lib/server/auth/channel.ts`, tests included, citing
   `docs/extend/add-a-second-audience.md` Path B), so the "no consumer anywhere has built
   against it" premise no longer holds. Ground for keeping: adoption evidence plus the
   high-consequence-hand-roll argument (enumeration oracle, unbounded guessing, identity-keyed
   throttle), NOT any-site breadth; the leanness boundary is held by the opt-in subpath. The
   factory folds onto the engine's one auth grammar (Task 7).

## Global Constraints

Copied from the initiative design's standing-constraints section; every task inherits them.

- Test-first. The full gate is `npm run check` 0/0 plus `npm test` exit 0 plus the CI-derived
  gate list re-derived from `.github/workflows/` before the first commit, never from memory.
- `check:surface -- --update` on any exported-type change, regenerated snapshot committed.
- Every public-API change updates its reference page in the same task (per-task page lists
  below are from the 2026-08-30 fact sheets; re-verify with grep before editing).
- Every task adds its `CHANGELOG.md` line under `## Unreleased`, with a `Consumers must:` line
  where consumer action is needed. Renames batch into the window; no version bump, no publish.
- A task executing a ruling closes (or progress-notes) its ledger entry in the same task, and
  re-authors any truncated shape it consumes from the rank sources (the `check:rulings-format`
  allowlist shrinks accordingly; never grows).
- Drift-hunt scope for every removed or renamed name: `docs/`, `src/` (comments),
  `examples/`, `templates/`, and `skills/` (the retires pass added `skills/`; it ships in the
  tarball).
- `templates/waymark` compiles at every task's gate (`check:consumers` and the scaffold job).
- The renames are type-level and name-level only where stated; behavior changes are called out
  explicitly per task and nowhere else.

---

### Task 1: Standing-rule ledger entries and the auth-channel reopen

**Files:**
- Modify: `docs/internal/engine-rulings.md`
- Modify: `docs/internal/docs-friction-log.md` (complete-or-move: the 2026-08-29 cookie-jar
  posture entry moves into the ledger ruling and leaves the log)

**Interfaces:**
- Produces: eight standing-rule ledger entries (kebab-case slugs:
  `convention-parameter-bags`, `convention-interop-carve-out`, `convention-contract-first-returns`,
  `convention-verb-rules`, `convention-bare-noun-functions`, `convention-outcome-idiom`,
  `convention-failure-suffix`, `convention-auth-loud-postures`, plus the two R-10 clauses as
  `convention-internal-sibling-comment` and `convention-identifier-grammar`), each carrying the
  ruling text from "The ratified rulings" above, the sitting date, and a reopen line. Later
  tasks cite these slugs in their ledger closes.

- [ ] **Step 1:** Author the standing-rule entries in `docs/internal/engine-rulings.md`, one per
      clause above, in the existing standing-rule register (the
      `f1-return-position-leak-sanction` entry is the shape model). Each entry: verdict line,
      the ruling verbatim, **Reopens on**, **Record** pointing at this plan.
- [ ] **Step 2:** Rewrite `audit-auth-createauthchannel` per ruling 8: verdict stays `reshape`
      but the shape becomes the Task 7 fold list; the entry records the overturned premise with
      the xcathletes citation and the honest ground (adoption + security hand-roll, not
      breadth). Annotate the seven satellite entries (`audit-auth-authchannel`,
      `audit-auth-authchannelevent`, `audit-auth-authchannelconfig`, `audit-auth-delivercontext`,
      `audit-auth-channelrequestresult`, `audit-auth-channelconfirmresult`,
      `audit-auth-channel-schema-version` is already retired-closed — instead
      `audit-auth-channel-schema-sql`) to follow the rewritten factory shape.
- [ ] **Step 3:** Move the friction-log cookie-jar entry (2026-08-29, csrf-hardening close)
      into `convention-auth-loud-postures` and delete it from the log (the log's
      complete-or-move rule).
- [ ] **Step 4:** Run `npm run check:rulings-format`; expected 0 findings and an allowlist no
      larger than before.
- [ ] **Step 5:** Commit: `docs(ledger): codify the conventions-pass rulings; reopen auth-channel on adoption evidence`

### Task 2: Parameter bags and contract-first factory returns

**Files:**
- Modify: `src/lib/sveltekit/cairn-admin.ts` (`CairnAdminOptions:34`, `CairnAdminRoutes:346`)
- Modify: `src/lib/sveltekit/content-routes-context.ts:130` and
  `src/lib/sveltekit/content-routes.ts:35,152-199` (`ContentRoutesOptions`)
- Modify: `src/lib/sveltekit/editors-routes.ts:47,162` (`EditorRoutesOptions`, `EditorRoutes`)
- Modify: `src/lib/delivery/public-routes.ts:22,184` (`PublicRoutesConfig`'s `deps` param; the
  missing return declaration)
- Modify: `src/lib/sveltekit/guard.ts:44,78` (`opts` param; unnamed handle return)
- Modify: `src/lib/sveltekit/section-action.ts:151-159` (unnamed curried return)
- Modify: `src/lib/sveltekit/auth-routes.ts:269`, `src/lib/sveltekit/nav-routes.ts:164`
  (ReturnType-derived aliases convert)
- Modify: `src/lib/vite/index.ts` (interop barrel comment)
- Test: extend `src/tests/unit/` type-level fixtures where they exist for these factories; the
  compile itself is the enforcement (see steps)

**Interfaces:**
- Produces: renamed bags `CairnAdminConfig`, `ContentRoutesConfig`, `EditorRoutesConfig`; all
  primary bag parameters named `config`; declared return types `CairnAdminRoutes`,
  `AuthRoutes`, `EditorRoutes`, `NavRoutes`, `PublicRoutes` (resurrected, see below),
  `SectionAction<Env, Db>`; `createAuthGuard` annotated `: Handle` (kit's type, interop
  clause); `createMediaRoute`'s kit `RequestHandler` return recorded as interop-conforming.
- Consumes: Task 1's standing-rule slugs for ledger annotations.

- [ ] **Step 1:** Write the failing type-level test first: a compile-only fixture
      (`src/tests/unit/factory-contracts.test.ts`) that imports each factory and its declared
      return type and asserts assignability both ways where the contract is meant to be exact
      (the retires-pass `retires-task2-sanctioned-leak-replacements.test.ts` is the shape
      model). It must fail before the declarations exist.
- [ ] **Step 2:** Execute the renames: `CairnAdminOptions` → `CairnAdminConfig`,
      `ContentRoutesOptions` → `ContentRoutesConfig`, `EditorRoutesOptions` →
      `EditorRoutesConfig`; every `deps` parameter → `config`, and `opts` → `config` only
      where the bag renames (editors-routes). `createAuthGuard` keeps `AuthGuardOptions`/`opts`
      unchanged — the audit ruled it correct as a secondary bag (C2's table), and this plan
      honors that annotation. Old names do NOT remain as deprecated aliases (churn is free;
      the window batches).
- [ ] **Step 3:** Convert the returns to declared contracts: author `CairnAdminRoutes` as a
      declared type (compose via `Pick` over the internal wide return, the `ContentRoutes`
      precedent at `content-routes.ts:172-199`) and make `createCairnAdmin`'s signature return
      it. **The membership decision is deliberate**: include the members `ContentRoutes`
      exposes plus the shell/help/auth members the admin mount needs; the ten media-janitorial
      actions stay off the declared contract. Record the decision in the task's ledger
      annotation — **this IS the createCairnAdmin narrowing question list (c) Tier 1 is blocked
      on** (r4-rederivation, "List (c)" Tier 1); the 25 Tier 1 retires route to 4b, unblocked.
      Convert `AuthRoutes`, `EditorRoutes`, `NavRoutes` from `ReturnType` aliases to declared
      interfaces the factory signatures return. Declare `PublicRoutes` and annotate
      `createPublicRoutes(config: PublicRoutesConfig): PublicRoutes` — this deliberately
      resurrects a retired name; the ledger annotation records that the retire targeted the
      mechanically derived alias and the ruled convention introduces an authored contract.
      Declare `SectionAction<Env, Db>` for `createSectionAction`'s curried return. Annotate
      `createAuthGuard(...): Handle`.
- [ ] **Step 4:** Add the interop comment to `src/lib/vite/index.ts` (why `cairnManifest` /
      `CairnManifestOptions` keep Vite's convention), citing `convention-interop-carve-out`.
- [ ] **Step 5:** Run the fixture, then `npm run check:surface -- --update` and commit the
      regenerated snapshot; drift-hunt the old names across the full scope (expect heavy hits
      in `docs/reference/sveltekit.md`, `admin-routes.md`, `delivery-data.md`, `components.md`,
      `examples/showcase`, `templates/waymark`, `skills/`).
- [ ] **Step 6:** Update reference pages (fact-sheet map: cairn-admin/content-routes/editors →
      `admin-routes.md`, `sveltekit.md`, `components.md`; public-routes → `delivery.md`,
      `delivery-data.md`; guard → `ambient.md`, `cloudflare.md`, `core.md`). CHANGELOG entry
      with one consolidated `Consumers must:` rename table for this task.
- [ ] **Step 7:** Full gate; commit: `refactor(surface)!: apply the parameter-bag and contract-first return conventions`

### Task 3: Verb and bare-noun renames

**Files:**
- Modify: `src/lib/render/resolve-media.ts:89`, `src/lib/delivery/site-resolver.ts:191,205`
  (resolver trio)
- Modify: `src/lib/nav/site-config.ts:345,415` (`extractMenu`, `extractVocabulary`)
- Modify: delivery barrel members (`siteDescriptors`, `newlyPublishedEntries`, `sitemapView`,
  `jsonLdScript`), `src/lib/media/reference.ts:44` (`mediaToken`), root-barrel `glyph` and
  `fieldset`, `src/lib/auth/roles.ts:108` (`ownerLevelRoles`)
- Test: the existing unit suites for each renamed symbol (rename the imports; no behavior
  change), plus the Task 2 fixture where signatures are named

**Interfaces:**
- Produces the renamed exports:
  `createMediaResolver`, `createLinkResolver`, `createFragmentResolver` (function factories);
  `readMenu`, `readVocabulary` (declaration readers, `extract*` retired);
  `buildSiteDescriptors`, `diffNewlyPublished`, `buildSitemapView`, `renderJsonLdScript`,
  `renderGlyph`, `formatMediaToken` (paired with `parseMediaToken` as the codec),
  `defineFieldset`, `resolveOwnerLevelRoles`.
- No signature or behavior changes in this task; names only. `verifyManifest`,
  `verifyReferences` (throw) and `validateReproFence` (returns issues) already conform and are
  untouched here. `checkRateLimit`/`checkRateLimitKeys` are NOT renamed here; Task 4 reshapes
  them (name and shape move together).

- [ ] **Step 1:** Rename in source with module-level `export` lines and barrel lines moving
      together; run the type check to enumerate all import sites mechanically.
- [ ] **Step 2:** Drift-hunt every old name across `docs/`, `src/` comments, `examples/`,
      `templates/`, `skills/` (the fact sheet's reference map names the primary pages:
      `delivery-data.md`, `media.md`, `core.md`, `reproductions.md`,
      `supported-toolchain.md` for `fieldset`).
- [ ] **Step 3:** `check:surface -- --update`; full gate.
- [ ] **Step 4:** CHANGELOG entry with the consolidated rename table (`Consumers must:` one
      list). Ledger annotations on any audit entry naming a renamed symbol, citing
      `convention-verb-rules` / `convention-bare-noun-functions`.
- [ ] **Step 5:** Commit: `refactor(surface)!: apply the verb-rule and bare-noun naming conventions`

### Task 4: The outcome idiom applied (rate limit, owner guards, turnstile exception)

**Files:**
- Modify: `src/lib/cloudflare/rate-limit.ts:32-57`, `src/lib/cloudflare/index.ts:7`
- Modify: `src/lib/sveltekit/section-action.ts:210-251` (the reimplementation collapses onto
  the reshaped helper; the `admin.action.rate_limit_absent` third branch is exactly what the
  discriminated result restores)
- Modify: `src/lib/auth/store.ts:169,188,233,243-259`, `src/lib/auth-store/index.ts`
- Modify: `src/lib/cloudflare/turnstile.ts:81` (doc comment states the exception)
- Test: `src/tests/unit/` suites for rate-limit, auth-store, section-action

**Interfaces:**
- Produces: one rate-limit function replacing the boolean pair, returning a discriminated
  result `{ outcome: 'allowed' } | { outcome: 'limited'; key: string } | { outcome: 'no-binding' }`
  (name it under the verb rules — it consults live state and returns a decision, so
  `resolveRateLimit(binding, keys: string | string[])` with the single-key case folded in;
  ledger entries `audit-cloudflare-checkratelimit` / `-checkratelimitkeys` close on it, their
  truncated shapes re-authored from `rank-cloudflare-audit-sink.md` first).
- Produces: owner-guard discriminated results per the ledger shapes:
  `removeOwnerIfNotLast` and `demoteOwnerIfNotLast` return
  `{ ok: true } | { refused: 'last-owner' } | { refused: 'not-found' }` (the rank-24 "right
  form: discriminated result", and the two false outcomes `listEditors` prose currently
  disambiguates); `setEditorRole` takes the `ownerRoles` vocabulary and refuses last-owner
  demotion (rank-19 shape); `deleteEditor`'s two-export dispatch resolves per rank-22 (one
  operation; the cascade knowledge stays engine-side). Names follow the verb rules and the
  `Failure`-suffix ruling.
- Consumes: Task 3's naming rulings.

- [ ] **Step 1:** Re-author the truncated ledger shapes for the four auth-store entries and
      two rate-limit entries from their rank sources (`rank-auth-family.md` ranks 19-24,
      `rank-cloudflare-audit-sink.md`) before writing code; the shapes above must match what
      the re-authored entries prescribe.
- [ ] **Step 2:** Test-first per function: failing tests asserting the discriminated outcomes
      (including the `no-binding` third branch and the last-owner refusal on a one-owner
      roster), then implement.
- [ ] **Step 3:** Collapse `createSectionAction`'s inline reimplementation onto the reshaped
      helper (delete the "Mirrors checkRateLimit" block; the third branch drives
      `admin.action.rate_limit_absent` exactly as today — assert the log events unchanged in
      the existing section-action tests).
- [ ] **Step 4:** State `verifyTurnstile`'s fail-closed boolean exception in its doc comment,
      citing `convention-outcome-idiom`.
- [ ] **Step 5:** `check:surface -- --update`; reference pages (`cloudflare.md:130,168`,
      `auth-store.md`); drift-hunt; CHANGELOG `Consumers must:`; close the six ledger entries.
- [ ] **Step 6:** Full gate; commit: `refactor(auth-store,cloudflare)!: discriminated outcomes replace conflating booleans`

### Task 5: ContentFormFailure flattened; the Tier 2 retires

**Files:**
- Modify: `src/lib/sveltekit/content-routes.ts:67,77,90-92` (the declaration and the arm
  re-exports)
- Modify: the arm declaration sites (`content-routes-core.ts`, `content-routes-media.ts`,
  `content-routes-tidy.ts:36`) — module-level exports stay where a cross-module consumer
  needs them (the retires pass's three-case rule)
- Test: `src/tests/unit/` content-routes suites; the seven components annotating
  `form: ContentFormFailure` (fact sheet list: `CairnAdmin.svelte:25`,
  `CairnTidySettings.svelte:51`, `VocabularyAdmin.svelte:38`, `EditPage.svelte:72`,
  `NavTree.svelte:20`, `ConceptList.svelte:13`, `CairnMediaLibrary.svelte:48`)

**Interfaces:**
- Produces: `ContentFormFailure` as ONE FLAT INTERFACE, every field optional, each field
  documented against the action that sets it (the ledger's prescribed shape,
  `audit-sveltekit-contentformfailure`). The eleven arms leave the public surface: the five
  core arms (`SaveFailure`, `DeleteRefusal`, `RenameFailure`, `CreateFailure`,
  `PreviewMintFailure`) retire per list (c) Tier 2; the five media arms stay module-internal
  (their Tier 1 retires ride 4b); `TidyFailure` is already un-nameable.
- `UsageEntry` (Tier 2's sixth name): retire its `/sveltekit` publication ONLY if the
  post-flatten surface audit shows no surviving rendered shape naming it; `MediaDeleteRefusal`
  (`api-surface.md:521`) and `MediaReplaceFailure` (`:528`) still render `usage: UsageEntry[]`
  and survive until 4b, so the expected outcome is a PROGRESS-NOTE routing `UsageEntry`'s
  retire to 4b with Tier 1, not a leak-manufacturing delete. Verify, don't assume.
- The `Failure`-suffix ruling governs any surviving refusal-shaped name this task touches.

- [ ] **Step 1:** Write the failing test: a type-level fixture asserting `ContentFormFailure`
      is assignable from each action's actual failure payload and that the flat fields carry
      the per-action docs (compile-only; plus the existing component mounts stay green).
- [ ] **Step 2:** Author the flat interface (derive the field union from the eleven arms'
      current members; `usage?: UsageEntry[]` stays a field), drop the `Partial<>`
      intersection, keep the arms module-internal per the three-case rule.
- [ ] **Step 3:** Execute the five core-arm retires (barrel and subpath publications drop;
      module-level exports stay only where a cross-module consumer needs them — derive, don't
      assume, per file). Run the `UsageEntry` carrier audit and progress-note or retire per the
      Interfaces block.
- [ ] **Step 4:** `check:surface -- --update`; reference pages (`components.md:204,254`,
      `sveltekit.md`); drift-hunt the five names; CHANGELOG `Consumers must:`; close the five
      arm entries plus `audit-sveltekit-contentformfailure`; progress-note
      the `UsageEntry` entry as routed.
- [ ] **Step 5:** Full gate; commit: `refactor(sveltekit)!: flatten ContentFormFailure; retire the Tier 2 arms`

### Task 6: The auth family (session cookie, probe, loud jars, nonce binding, adminAction)

**Files:**
- Modify: `src/lib/sveltekit/guard.ts:157,170`, `src/lib/sveltekit/auth-routes.ts:199,248`
  (session-cookie derivation)
- Modify: `src/lib/doctor/check-probe.ts:49`
- Modify: `src/lib/sveltekit/content-routes-dictionary.ts:95`,
  `content-routes-media.ts:494,1065,1265`, `content-routes-tidy.ts:111` (loud jars)
- Modify: `src/lib/sveltekit/auth-routes.ts:100-266` (the `_pending` nonce binding)
- Modify: `src/lib/sveltekit/admin-action.ts:143-247` (symmetric authorization)
- Test: `src/tests/unit/csrf.test.ts`, `src/tests/integration/auth-load-csrf.test.ts`,
  `src/tests/unit/doctor-check-probe.test.ts`, admin-action and content-routes suites

**Interfaces:**
- Session cookie: the three call sites derive through the same `PUBLIC_ORIGIN`-aware,
  MONOTONIC derivation the CSRF pair uses (`csrfSecure`, `csrf.ts:64-76`; an https request
  always resolves Secure; the helper generalizes or gets a session-named sibling delegating to
  the same body — one derivation, per the read-from-the-source rule). Closes ledger
  `session-cookie-derivation-out-of-csrf-slice`.
- Probe: `check-probe.ts:49` stops deriving independently (`csrfCookieName(origin.protocol ===
  'https:')`) and calls the same helper, so probe and runtime cannot disagree.
- Loud jars: the five soft `if (!event.cookies || ...)` guards convert to the
  `content-routes-core.ts` posture (missing jar throws inside the helper; the CSRF-verdict
  half of each guard keeps its `fail(403)`). Behavior change is unreachable for typed callers;
  say so in the CHANGELOG line. Cites `convention-auth-loud-postures`.
- Nonce binding: `requestAction` mints a `cairn_login_pending` nonce cookie (the
  `factory.ts:621-650` pattern: reuse-unexpired-or-mint, `httpOnly`, `lax`, maxAge = the
  token TTL, secure from the session derivation above); `confirmAction` requires and consumes
  it before `consumeToken`, failing with the existing generic invalid-token refusal when
  absent or mismatched, and `logoutAction` deletes it. The emailed token alone no longer
  confirms in a browser that never requested. `docs/reference/log-events.md` and
  `docs/extend/security-model.md` updated. Closes ledger
  `login-csrf-no-same-browser-binding`. NOTE the residual: the WATCH double-mint entry's
  discriminator semantics must keep holding; assert `guard.rejected` fields unchanged.
- adminAction: gains the access-map/`hasAccessRule`/`canReach`/`ownerOnly` sequence
  `createSectionAction` carries (`section-action.ts:255-265`), each an AUDITED `fail(403)`
  (or `fail(500)` for misconfiguration), with the same log events. `createSectionAction`'s own
  copies collapse onto the shared implementation (one source). Reference pages `sveltekit.md`,
  `cloudflare.md`, `ambient.md`; CHANGELOG `Consumers must:` names the new 403 surface for
  DB-less custom screens.
- The `platform` required-but-nullable convention: audit the CSRF/auth helper family for any
  remaining optional-`platform` signature and align (the csrf-hardening precedent:
  required-but-nullable makes omission a compile error).

- [ ] **Step 1:** Test-first, one sub-step per bullet above (the failing test precedes each
      change; the nonce test must prove a confirm in a cookie-less browser fails and a
      same-browser confirm succeeds, including the reuse-unexpired branch).
- [ ] **Step 2:** Implement in the order listed (derivation, probe, jars, nonce, adminAction,
      platform sweep); each bullet is its own commit.
- [ ] **Step 3:** `check:surface -- --update` where signatures moved; reference pages per
      bullet; CHANGELOG lines per bullet; ledger closes per bullet.
- [ ] **Step 4:** Full gate; final commit:
      `fix(auth)!: one cookie derivation, loud jars, login-CSRF nonce binding, symmetric adminAction authorization`

### Task 7: The auth-channel fold

**Files:**
- Modify: `src/lib/auth-channel/factory.ts` (`AuthChannelEvent:141-156`, config `:187-272`,
  `revokeSessions:952-954`), `src/lib/auth-channel/store.ts:33` (`CHANNEL_SCHEMA_SQL`),
  `src/lib/auth-channel/index.ts`
- Create: `migrations/channel/0000_channel.sql` (the packaged migration; `package.json`
  `files` already ships `migrations`)
- Test: auth-channel unit suites; a migration-file test in the shape of the existing AUTH_DB
  migration checks

**Interfaces:**
- `CHANNEL_SCHEMA_SQL` retires as an export: the DDL becomes the packaged migration file, and
  `verifySchema` reads its version from the same source the file is generated from (one
  source, never a copy — state how in the diff, e.g. the migration file is emitted from the
  store's constant at build, or the constant moves internal and the file is canonical; the
  implementer picks the direction that keeps `check:package` green and says so).
- `AuthChannelEvent` retires: callbacks take `CairnEvent` (kit's `RequestEvent` satisfies it
  structurally — the type's own header concedes it; xcathletes' usage compiles unchanged,
  verify against the fixture in the compile-only test).
- `revokeSessions(event, subject)`: takes the same event its siblings take and resolves
  through `config.resolveDb`.
- `AuthChannelConfig`: the nine-knob `ttl` bag re-derives per its re-authored ledger shape
  (rank 13: the grouping was transplanted from the design spec's Defaults table; regroup by
  what a site actually tunes together), and `lookup`/`verify` gain the event context
  (`lookup: (contact: string, event: CairnEvent) => ...`, same for `verify`) so a D1-backed
  roster needs no module-level `WeakMap` closure — the xcathletes-evidenced gap.
- `DeliverContext`, `ChannelRequestResult`, `ChannelConfirmResult` keep with the factory,
  shapes per their entries (the no-roster-leak and challenge-required-is-retry rulings
  survive verbatim).
- Reference page `auth-channel.md` rewritten for all of the above;
  `docs/extend/add-a-second-audience.md` Path B updated; CHANGELOG `Consumers must:` carries
  the xcathletes migration lines (event type, revokeSessions, ttl bag, lookup/verify
  signature, schema file).

- [ ] **Step 1:** Re-author the truncated shapes for `audit-auth-authchannelconfig` and
      `audit-auth-createauthchannel` from `rank-auth-family.md` (ranks 13, 15) as amended by
      Task 1's reopen entry, before code.
- [ ] **Step 2:** Test-first per bullet; the compile-only consumer fixture mirrors
      xcathletes' actual usage shape (module-scope channel per binding, D1-backed lookup
      using the new event parameter).
- [ ] **Step 3:** Implement; `check:surface -- --update`; drift-hunt (`skills/` included);
      docs; CHANGELOG; close the seven family entries against the rewritten shapes.
- [ ] **Step 4:** Full gate; commit: `refactor(auth-channel)!: fold the channel onto the engine's auth grammar`

### Task 8: The coupled pairs (validateReproFence, defineAccess)

**Files:**
- Modify: `src/lib/reproductions/validate.ts:13-16,29-31,45-48,80-85`,
  `src/lib/reproductions/manifest.ts:331`
- Modify: `src/lib/auth/access.ts:67`, `src/lib/auth/roles.ts:24`
- Modify: `scripts/checks/check-visuals.mjs:194-195` (the in-repo caller supplies the
  register options explicitly)
- Test: `src/tests/unit/reproductions-validate.test.ts`, `src/tests/unit/check-visuals.test.ts`,
  the access/roles unit suites

**Interfaces:**
- `validateReproFence(body, manifest, options?)`: the manifest-dependent half (story resolves,
  width declared, required keys `story`/`alt`/`caption`) stays engine-owned; the register half
  moves behind options — `options: { altPrefix?: RegExp; maxAltLength?: number; extraKeys?: string[] }`
  with NO register defaults baked in (omitting an option skips that check; the ledger shape:
  "move the alt prefix, 150-char ceiling, and closed key set behind caller options or back to
  the site" — `check-visuals.mjs` passes cairn-pub's register explicitly). Return type becomes
  the inline `{ issues: string[] }`; **`ReproFenceValidation` retires with the reshape** (the
  Tier 2 reshape-blocked retire, `audit-repro-reprofencevalidation`), closing the F-1 leak
  hazard the addendum ruling flagged.
- `defineAccess(roles: RolesDeclaration | undefined, map)`: accepts `undefined` like its three
  siblings (`resolveCapability`, `roleHome`, `ownerLevelRoles` — `roles.ts:83-108`), defaulting
  the vocabulary to the same source `resolveCapability` uses. Then **`DEFAULT_ROLES` retires**
  (the coupled pair: `docs/extend/restrict-admin-access.md:14`'s instructed import becomes
  unnecessary; the ledger flip on `audit-adapter-default-roles` records the executed
  condition its keep verdict named). The default vocabulary keeps ONE definition
  (read-from-the-source; `DEFAULT_ROLES` may survive as an internal constant).
- [ ] **Step 1:** Test-first both halves (a localized alt prefix passing under caller options;
      `defineAccess(undefined, map)` validating against the default vocabulary; the last-owner
      empty-list rule unchanged).
- [ ] **Step 2:** Implement; `check:surface -- --update`; drift-hunt (`reproductions.md`,
      `core.md:896,940,962`, `restrict-admin-access.md`, showcase/waymark).
- [ ] **Step 3:** CHANGELOG `Consumers must:`; close `audit-repro-validatereprofence`,
      `audit-repro-reprofencevalidation`, `audit-adapter-default-roles` (flip executed),
      annotate `audit-adapter-defineaccess`.
- [ ] **Step 4:** Full gate; commit: `refactor!: validateReproFence caller-register options; defineAccess default vocabulary; DEFAULT_ROLES retires`

### Task 9: The engine bins (anti-silent-green, evenness, config contract)

**Files:**
- Modify: `src/lib/doctor/report.ts:8-12`, `src/lib/doctor/run.ts:11-28`,
  `src/lib/doctor/bin.ts:24-31,85`
- Modify: `src/lib/doctor/checks-local.ts:91-92,139-156,216-226,271-311,362-378`,
  `src/lib/doctor/check-floors.ts:57-58`
- Modify: `src/lib/vite/bin.ts` (whole file, 10 lines), plus a new `parseArgs`/`USAGE` beside
  `writeManifest` (`src/lib/vite/internal.ts` or a new `assemble.ts` mirroring the doctor
  split)
- Modify: `src/lib/doctor/assemble.ts:33-34`, `src/lib/audit/config.ts:221-224`,
  `src/lib/media-seed/assemble.ts:7-8` (`--help` at exit 0)
- Modify: `src/lib/audit/config.ts:44-51,103,118-124,183`, `src/lib/audit/rendered.ts` (edits
  (a) and (c))
- Test: doctor/audit/media-seed/vite bin suites; `doctor.md`, `cairn-audit.md`,
  `cli-cairn-manifest.md`, `cli-cairn-media-seed.md`

**Interfaces:**
- **Anti-silent-green (R-9):** the doctor's result vocabulary splits `skip` into
  `skip` (not applicable; exit unchanged) and `unchecked` (could not look; distinct tag,
  distinct summary count, and a non-zero exit — use exit 2, the "run couldn't finish" tier
  `cairn-audit` already ratified, via a `--strict`-free default; `doctor.md:110-118` and the
  "A skip never fails the run" sentence rewrite accordingly, and the CI-gate section states
  the new semantics). Recategorized as `unchecked`: `config.csrf-disable` when neither
  `svelte.config.js` NOR `vite.config.ts` yields the answer (the check now reads BOTH files —
  the sv-create scaffold wires the adapter in `vite.config.ts`; ledger
  `audit-cli-config-csrf-disable-check`), `config.site-config` when no candidate path matches
  (AND `src/theme/site.config.yaml` joins `SITE_CONFIG_PATHS`, closing the scaffold gap;
  ledger `audit-cli-config-site-config-check`; the one-source derivation from the bake
  constant is the internals pass's dogfood rider — a `// WATCH:` comment points there),
  `config.dependency-floors` on a non-npm lockfile, and `auth.role-wiring`'s
  hooks-file-absent/unreadable branches (its no-custom-roles branch stays a true `skip`).
  `admin.mount-shape` keeps its never-fails design but reports `unchecked`, not `skip`, when
  it could not see a mount. The `config.tidy-key` check gets its own condition id, and the
  readiness count gets its own field so a check carries the right remediation without
  borrowing `config.bindings-missing` (C16's two-jobs finding; ledger
  `audit-cli-config-tidy-key-check-and-its-active-anthropic-probe` closes or progress-notes
  per its re-authored shape).
- **Evenness (R-11):** `vite/bin.ts` moves to `process.exitCode` (stdout flush rule its three
  siblings state verbatim), gains argv parsing that accepts `--help` and rejects everything
  else with a usage line at exit 2; all four bins answer `--help` by printing their existing
  `USAGE` constant at exit 0. Ledger `audit-cli-no-help-on-any-of-the-five-commands` closes
  for the four engine bins with a progress note routing `create-cairn-site`'s `--help` to the
  tool's pre-publish pass. Ledger
  `audit-cli-cairn-manifest-command-vite-config-discovery-exit-behavior` closes per its
  re-authored shape.
- **Config contract:** (a) `rendered.extraPages` lands as ADDITIVE beside `rendered.pages`
  (extraPages appends to `DEFAULT_RENDERED_PAGES` (`config.ts:44-51`) or to an explicit
  `pages`; the "replaces, never extends" trap and its doc warning dissolve); (c) the
  rendered harness gains the redirect-trap refusal: when EVERY configured page settles on the
  login card (the page-identity signals resolve to the login route's title/landmark for all
  pages), the run exits 2 with a message naming `CAIRN_AUDIT_COOKIES`, per rank-32(c) ("a
  silent green the run should exit 2 on"). Edit (b) is already landed (verified: `sheet`
  resolves through `asPathOrPathList`, `config.ts:180-182`). Ledger
  `audit-cli-cairn-audit-config-json-contract-...` closes with all three edits accounted.
- [ ] **Step 1:** Re-author the truncated shapes for the CLI entries this task closes, from
      `rank-cli-surface.md`.
- [ ] **Step 2:** Test-first per bullet (the `unchecked`-exit test, the both-files csrf-disable
      read, the extraPages merge, the all-pages-login refusal against a fixture harness run,
      the vite-bin argv matrix).
- [ ] **Step 3:** Implement; docs pages per the fact sheet's list; CHANGELOG (`Consumers
      must:` names the doctor exit-semantics change for CI users); ledger closes.
- [ ] **Step 4:** Full gate; commit: `feat(cli)!: one anti-silent-green posture, bin evenness, additive rendered pages, redirect-trap refusal`

---

## Pass-end ritual (cairn-pass; not a numbered task)

Code-simplifier over the changed code; domain reviewer fan-out (`svelte-reviewer`,
`web-auth-security-reviewer` MANDATORY for Tasks 6-7, `cloudflare-workers-reviewer`,
`daisyui-a11y-reviewer` if any component markup moved); fix rounds; the mid-pass mechanic
check (`engine-triage` on anything filed); STATUS/HISTORY/ROADMAP updates; post-mortem
appended here; both budgets scored.

## What this pass unblocks and hands to 4b

- **List (c) Tier 1 (25 media-janitorial retires)** unblocks when Task 2 declares
  `CairnAdminRoutes` narrow. 4b executes them with the same ratification-gate discipline the
  retires pass used (no keep-to-retire flip without Geoff).
- **`UsageEntry`** likely rides with Tier 1 (Task 5's carrier audit decides).
- The remaining ~20 open reshapes (AuthBranding, PublishActionsConfig, RevertFailure's
  `lastSavedAt`, TidyClient, MediaEntry, mintPreviewToken, formatTimestamp, OfficeList,
  StatusChip, normalizeAssets, fixtureMediaBase, strAttr's `ctx.str()` where not
  chassis-coupled, the eleven log-event evenness reshapes, and the doctor-check reshape
  entries not consumed by Task 9) execute in 4b against the ruled conventions, finalized
  against 4a's merged surface. The four `rendered-*` audit harness failure ids also conform to
  the identifier-grammar clause in 4b (dot-namespaced, prefix retired).
- Routed OUT of slice 4 entirely: everything `create-cairn-site`-scoped (cost narrative, flag
  set, resume store, console — the tool's pre-publish pass); `MarkdownEditor`'s seam collapse,
  the dogfood tripwire, the leak-class `check:surface` rider (internals); the render trio
  re-homing (chassis).
