# Conventions Pass (4a) Implementation Plan

> **For agentic workers:** execute through the `cairn-implementer` chain per task
> (implementer, `diff-reviewer`, full gate), workflow mode via
> `~/.claude/workflows/pass-execute.js` with **`parallel: false` — the tasks share files and
> carry stated data dependencies; execution is strictly sequential.** Steps use checkbox
> (`- [ ]`) syntax for tracking.

**Goal:** Codify the five ratified coherence conventions as standing rules, then execute them
across the factory population, the auth family, the coupled reshape/retire items, and the four
engine bins, in one worktree, batched into the standing `Consumers must:` window.

**Architecture:** This is audit-remediation slice 4a (initiative design
`docs/superpowers/specs/2026-08-27-audit-remediation-initiative-design.md`, "The conventions
pass"). The rulings were ratified by Geoff in the 2026-08-30 plan-authoring sitting and are
restated in full below; the pass writes them into the ledger first, then applies them, so no
signature is touched twice. Slice 4b (the cross-surface conformance sweep) executes the
remaining open reshapes against 4a's merged surface and additionally inherits list (c) Tier 1
(see "What this pass unblocks" at the end). This plan absorbed a two-reviewer adversarial
round before dispatch; the round-1 findings and their dispositions are in the post-mortem
section placeholder at the end.

**Tech Stack:** TypeScript 6 / SvelteKit 2 / Svelte 5 runes; Vitest; the repo gate
(`npm run check` 0/0, `npm test` exit 0, plus the CI-derived gate list).

**Spec:** `docs/superpowers/specs/2026-08-27-audit-remediation-initiative-design.md` (slice 4),
with per-item shapes in `docs/internal/engine-rulings.md` and the coherence evidence in
`docs/internal/record/2026-08-26-any-site-audit/coherence-v2.md`.

**Worktree:** `.claude/worktrees/conventions`, branched from `main`. After creating it, run a
from-scratch `npm ci` in `examples/showcase` before trusting any e2e (the worktree showcase
symlink gotcha, `CLAUDE.md`).

**Token ceiling:** 5.5M for the WHOLE pass (chains plus ritual; sized against the retires
pass's 4.6M actual for a lighter, more mechanical pass). **Checkpoint interval:** every four
tasks (STATUS written at each checkpoint, at any split, and before any question).

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
   exception. **One grammar:** the discriminant key is `outcome`, a string literal union; every
   discriminated result this pass introduces uses it. **`Failure` is the family suffix;
   `Refusal` and `Skip` retire as TYPE-NAME suffixes** (a discriminant VALUE like
   `'last-owner'` or a field name is not a suffix and is unaffected).
6. **Auth postures.** A missing cookie jar from an untyped caller fails LOUDLY (throw), never a
   soft `fail(403)`. `adminAction` gains the authorization sequence `createSectionAction`
   carries, with the zero-config default preserved (see Task 7's Interfaces block). The
   `platform` required-but-nullable convention applies uniformly across the CSRF/auth helpers.
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
   factory folds onto the engine's one auth grammar (Task 8).

## Global Constraints

Copied from the initiative design's standing-constraints section, plus the review-derived
rules; every task inherits them.

- Test-first. The full gate is `npm run check` 0/0 plus `npm test` exit 0 plus the CI-derived
  gate list re-derived from `.github/workflows/` before the first commit, never from memory.
- `check:surface -- --update` on any exported-type change, regenerated snapshot committed.
- Every public-API change updates its reference page in the same task (per-task page lists
  below are from the 2026-08-30 fact sheets; re-verify with grep before editing).
- Every task adds its `CHANGELOG.md` line under `## Unreleased`, with a `Consumers must:` line
  where consumer action is needed. Renames batch into the window; no version bump, no publish.
  **The window must stay self-consistent: a task that re-introduces or re-shapes a name an
  earlier unpublished entry retired or instructed against AMENDS that earlier entry in the same
  task** (the cut ships one coherent rolled note, never a self-contradicting sequence).
- A task executing a ruling closes (or progress-notes) its ledger entry in the same task, and
  re-authors any truncated shape it consumes from the rank sources (the `check:rulings-format`
  allowlist shrinks accordingly; never grows). A partially executed entry gets a progress note
  in the same task, always.
- Drift-hunt scope for every removed or renamed name: `docs/`, `src/` (comments),
  `examples/`, `templates/` (verification only, see next bullet), and `skills/` (ships in the
  tarball).
- **`templates/waymark` is a GENERATED artifact and is never hand-edited** (the showcase is
  the single source; `scripts/build/emit-template.mjs`). A task whose renames reach the
  template edits `examples/showcase`, runs `npm run emit:template` (verify the exact script
  name in `package.json` first), and commits the regenerated tree. `check:template` and
  `check:consumers` are both part of every task's gate.
- **Line anchors in this plan are pre-pass anchors against `main` at `a1f2d45b`.** Tasks
  editing a file an earlier task already touched treat anchors as symbolic (the named
  construct, not the line); only a file this pass touches once may be navigated by line.
- The renames are type-level and name-level only where stated; behavior changes are called out
  explicitly per task and nowhere else.

---

### Task 1: Standing-rule ledger entries and the two reopens

**Files:**
- Modify: `docs/internal/engine-rulings.md`
- Modify: `docs/internal/docs-friction-log.md` (complete-or-move: the 2026-08-29 cookie-jar
  posture entry moves into the ledger ruling and leaves the log)

**Interfaces:**
- Produces: the standing-rule ledger entries (kebab-case slugs:
  `convention-parameter-bags`, `convention-interop-carve-out`, `convention-contract-first-returns`,
  `convention-verb-rules`, `convention-bare-noun-functions`, `convention-outcome-idiom` (which
  carries the one-grammar `outcome`-discriminant clause and the suffix-scope clarification),
  `convention-failure-suffix`, `convention-auth-loud-postures`,
  `convention-internal-sibling-comment`, `convention-identifier-grammar`), each carrying the
  ruling text from "The ratified rulings" above, the sitting date, and a reopen line. Later
  tasks cite these slugs in their ledger closes.
- Produces: TWO reopen rewrites, both using the full mechanism (entry rewritten, overturned
  premise recorded with its evidence, satellites annotated):
  1. `audit-auth-createauthchannel` per ruling 8: verdict stays `reshape`, the shape becomes
     Task 8's fold list, the entry records the xcathletes citation and the honest ground.
     Annotate the seven open satellite entries (`audit-auth-authchannel`,
     `audit-auth-authchannelevent`, `audit-auth-authchannelconfig`,
     `audit-auth-delivercontext`, `audit-auth-channelrequestresult`,
     `audit-auth-channelconfirmresult`, `audit-auth-channel-schema-sql`) to follow the
     rewritten factory shape — eight open family entries total including the factory.
  2. `audit-delivery-publicroutes` (CLOSED by the retires pass, batch 1c): reopened and
     rewritten on the ratified contract-first ruling — the retire targeted the mechanically
     derived `ReturnType` alias; ruling 2 introduces a deliberately AUTHORED contract under
     the same name, and Task 2 executes it. The rewrite records that the overturning evidence
     is the sitting's ruling, not new consumer data.

- [ ] **Step 1:** Author the standing-rule entries in `docs/internal/engine-rulings.md`, one per
      clause above, in the existing standing-rule register (the
      `f1-return-position-leak-sanction` entry is the shape model). Each entry: verdict line,
      the ruling verbatim, **Reopens on**, **Record** pointing at this plan.
- [ ] **Step 2:** Execute both reopen rewrites per the Interfaces block.
- [ ] **Step 3:** Move the friction-log cookie-jar entry (2026-08-29, csrf-hardening close)
      into `convention-auth-loud-postures` and delete it from the log (the log's
      complete-or-move rule).
- [ ] **Step 4:** Run `npm run check:rulings-format`; expected 0 findings and an allowlist no
      larger than before.
- [ ] **Step 5:** Commit: `docs(ledger): codify the conventions-pass rulings; reopen auth-channel and PublicRoutes`

### Task 2: Parameter bags and contract-first factory returns

**Files:**
- Modify: `src/lib/sveltekit/cairn-admin.ts` (`CairnAdminOptions:34`, `CairnAdminRoutes:346`)
- Modify: `src/lib/sveltekit/content-routes-context.ts:130` and
  `src/lib/sveltekit/content-routes.ts:35,152-199` (`ContentRoutesOptions`)
- Modify: `src/lib/sveltekit/editors-routes.ts:47,162` (`EditorRoutesOptions`, `EditorRoutes`)
- Modify: `src/lib/delivery/public-routes.ts:22,184` (`PublicRoutesConfig`'s `deps` param; the
  missing return declaration)
- Modify: `src/lib/sveltekit/guard.ts:78` (unnamed handle return; the bag stays, see below)
- Modify: `src/lib/sveltekit/section-action.ts:151-159` (unnamed curried return)
- Modify: `src/lib/sveltekit/auth-routes.ts:269`, `src/lib/sveltekit/nav-routes.ts:164`
  (ReturnType-derived aliases convert)
- Modify: `src/lib/vite/index.ts` (interop barrel comment)
- Modify: `CHANGELOG.md` `## Unreleased` — the retires-pass lines at `:306` ("stop importing
  … `PublicRoutes`") and `:312` (the `ReturnType<typeof createPublicRoutes>` instruction, the
  exact idiom ruling 2 bans) are AMENDED to the new instruction (annotate the declared
  `PublicRoutes` contract), per the window-consistency constraint
- Test: Create `src/tests/unit/factory-contracts.test.ts` (compile-only)

**Interfaces:**
- Produces: renamed bags `CairnAdminConfig`, `ContentRoutesConfig`, `EditorRoutesConfig`; the
  `deps` parameters renamed `config` (and `opts` → `config` only where the bag renames,
  editors-routes); declared return types `CairnAdminRoutes`, `AuthRoutes`, `EditorRoutes`,
  `NavRoutes`, `PublicRoutes` (reopened in Task 1), `SectionAction<Env, Db>`;
  `createAuthGuard` annotated `: Handle` (kit's type, interop clause); `createMediaRoute`'s
  kit `RequestHandler` return recorded as interop-conforming. `createAuthGuard` keeps
  `AuthGuardOptions`/`opts` unchanged — the audit ruled it correct as a secondary bag (C2's
  table), and this plan honors that annotation.
- Consumes: Task 1's standing-rule slugs and the `PublicRoutes` reopen.

- [ ] **Step 1:** Write the failing type-level test first: a compile-only fixture
      (`src/tests/unit/factory-contracts.test.ts`) that imports each factory and its declared
      return type and asserts assignability both ways where the contract is meant to be exact
      (the retires-pass `retires-task2-sanctioned-leak-replacements.test.ts` is the shape
      model). It must fail before the declarations exist.
- [ ] **Step 2:** Execute the renames: `CairnAdminOptions` → `CairnAdminConfig`,
      `ContentRoutesOptions` → `ContentRoutesConfig`, `EditorRoutesOptions` →
      `EditorRoutesConfig`; `deps` → `config` everywhere, `opts` → `config` in editors-routes
      only. Old names do NOT remain as deprecated aliases (churn is free; the window batches).
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
      `createPublicRoutes(config: PublicRoutesConfig): PublicRoutes` (the Task 1 reopen).
      Declare `SectionAction<Env, Db>` for `createSectionAction`'s curried return. Annotate
      `createAuthGuard(...): Handle`.
- [ ] **Step 4:** Add the interop comment to `src/lib/vite/index.ts` (why `cairnManifest` /
      `CairnManifestOptions` keep Vite's convention), citing `convention-interop-carve-out`.
- [ ] **Step 5:** Run the fixture, then `npm run check:surface -- --update` and commit the
      regenerated snapshot; drift-hunt the old names across the full scope (expect heavy hits
      in `docs/reference/sveltekit.md`, `admin-routes.md`, `delivery-data.md`, `components.md`,
      `examples/showcase`; regenerate `templates/waymark` via the emit script, never by hand).
- [ ] **Step 6:** Update reference pages (fact-sheet map: cairn-admin/content-routes/editors →
      `admin-routes.md`, `sveltekit.md`, `components.md`; public-routes → `delivery.md`,
      `delivery-data.md`; guard → `ambient.md`, `cloudflare.md`, `core.md`). CHANGELOG entry
      with one consolidated `Consumers must:` rename table for this task, PLUS the two amended
      retires-pass lines per the Files block.
- [ ] **Step 7:** Full gate; commit: `refactor(surface)!: apply the parameter-bag and contract-first return conventions`

### Task 3: Verb and bare-noun renames

**Files:**
- Modify: `src/lib/render/resolve-media.ts:89-105`, `src/lib/delivery/site-resolver.ts:191,205`
  (resolver trio)
- Modify: `src/lib/nav/site-config.ts:345,415` (`extractMenu`, `extractVocabulary`)
- Modify: delivery barrel members (`siteDescriptors`, `newlyPublishedEntries`, `sitemapView`,
  `jsonLdScript`), `src/lib/media/reference.ts:44` (`mediaToken`), root-barrel `glyph` and
  `fieldset`, `src/lib/auth/roles.ts:108` (`ownerLevelRoles`)
- Test: the existing unit suites for each renamed symbol (rename the imports), plus the Task 2
  fixture where signatures are named

**Interfaces:**
- Produces the renamed exports:
  `createMediaResolver`, `createLinkResolver`, `createFragmentResolver` (function factories);
  `readMenu`, `readVocabulary` (declaration readers, `extract*` retired);
  `buildSiteDescriptors`, `diffNewlyPublished`, `buildSitemapView`, `renderJsonLdScript`,
  `renderGlyph`, `formatMediaToken` (paired with `parseMediaToken` as the codec),
  `defineFieldset`, `resolveOwnerLevelRoles`.
- **One deliberate signature change rides the rename** (so the signature moves once):
  `createMediaResolver` drops its dead `opts?: { preset?: string }` parameter per the ruled
  shape of `audit-media-buildmediaresolver` ("opts.preset has zero non-test callers anywhere
  … Drop opts; keep (manifest, resolved)"); that entry closes here. Everything else in this
  task is names only; `verifyManifest`, `verifyReferences` (throw) and `validateReproFence`
  (returns issues) already conform and are untouched. `checkRateLimit`/`checkRateLimitKeys`
  are NOT renamed here; Task 4 reshapes them (name and shape move together).

- [ ] **Step 1:** Rename in source with module-level `export` lines and barrel lines moving
      together; drop `createMediaResolver`'s `opts` in the same edit; run the type check to
      enumerate all import sites mechanically.
- [ ] **Step 2:** Drift-hunt every old name across `docs/`, `src/` comments, `examples/`,
      `skills/`; regenerate `templates/waymark` (primary reference pages:
      `delivery-data.md`, `media.md`, `core.md`, `reproductions.md`,
      `supported-toolchain.md` for `fieldset`).
- [ ] **Step 3:** `check:surface -- --update`; full gate.
- [ ] **Step 4:** CHANGELOG entry with the consolidated rename table (`Consumers must:` one
      list). Ledger closes/annotations: `audit-media-buildmediaresolver` closes; any audit
      entry naming a renamed symbol gets an annotation citing `convention-verb-rules` /
      `convention-bare-noun-functions` — disambiguate the DUPLICATE slug pair
      `audit-adapter-fieldset` (the `Fieldset` type at `:1120` vs the `fieldset` function at
      `:1134`); only the function's entry is annotated for `defineFieldset`.
- [ ] **Step 5:** Commit: `refactor(surface)!: apply the verb-rule and bare-noun naming conventions`

### Task 4: The outcome idiom applied (rate limit, owner guards, turnstile exception)

**Files:**
- Modify: `src/lib/cloudflare/rate-limit.ts`, `src/lib/cloudflare/index.ts`
- Modify: `src/lib/sveltekit/section-action.ts` (the rate-limit block inside the wrapper — a
  SYMBOLIC anchor; Task 2 already edited this file)
- Modify: `src/lib/auth/store.ts` (`deleteEditor`, `removeOwnerIfNotLast`, `setEditorRole`,
  `demoteOwnerIfNotLast`), `src/lib/auth-store/index.ts`
- Modify: `src/lib/cloudflare/turnstile.ts` (`verifyTurnstile` doc comment)
- Test: `src/tests/unit/` suites for rate-limit, auth-store, section-action

**Interfaces:**
- Produces: one rate-limit function replacing the boolean pair —
  `resolveRateLimit(binding, keys: string | string[])` returning
  `{ outcome: 'allowed' } | { outcome: 'limited'; key: string } | { outcome: 'no-binding' } | { outcome: 'failed'; error: unknown }`.
  **Four arms, not three**: the call site distinguishes a thrown `limit()` today
  (`admin.action.rate_limit_failed`, its own documented triage story). Contract division:
  the helper captures a throwing `limit()` into the `failed` arm (degrade-to-open stays each
  caller's decision, exactly as `rate-limit.ts`'s current contract states); the call site
  KEEPS its own try/catch around the site-supplied `key()` callback and its
  redirect/HttpError rethrow guard (a `redirect()` thrown from `key()` must never be
  swallowed into a degrade-to-open pass). The collapse is deliberately partial and the
  existing log events (`admin.action.rate_limited`, `rate_limit_absent`,
  `rate_limit_failed`) are asserted unchanged.
- Produces: owner-guard discriminated results, SAME `outcome` grammar:
  `removeOwnerIfNotLast` and `demoteOwnerIfNotLast` return
  `{ outcome: 'ok' } | { outcome: 'last-owner' } | { outcome: 'not-eligible' }` — the third
  arm is `not-eligible`, not `not-found`, because the follow-up read can only establish "no
  row matched email AND owner-capability", which conflates absent-from-roster with
  present-but-not-owner (security round N4: name only what the predicate knows).
  `setEditorRole` takes the `ownerRoles` vocabulary and refuses last-owner demotion
  (rank-19 shape); `deleteEditor`'s two-export dispatch resolves per rank-22 (one operation;
  the cascade knowledge stays engine-side). Names follow the verb rules; the
  `Failure`-suffix ruling governs type names.
- **Atomicity invariant, mandated (security round F3):** the refusal predicate stays INSIDE
  the single conditional write — run the atomic statement FIRST, and only on
  `changes === 0` run a follow-up READ purely to classify the refusal (a read that cannot
  change the outcome). A select-then-write shape is forbidden: it is exactly the concurrent
  double-demote that strands a roster at zero owners, which the current docstrings exist to
  prevent. `setEditorRole`'s new refusal is likewise ONE conditional `UPDATE` whose `WHERE`
  encodes "not a demotion out of owner-capability OR another owner-capability row remains".
  The acceptance criterion is a concurrency test: two simultaneous demotes of a two-owner
  roster, exactly one succeeds.
- Consumes: Task 3's naming rulings; the ledger entries' re-authored shapes.

- [ ] **Step 1:** Re-author the truncated ledger shapes for the four auth-store entries and
      two rate-limit entries from their rank sources (`rank-auth-family.md` ranks 19-24,
      `rank-cloudflare-audit-sink.md`) before writing code; the shapes above must match what
      the re-authored entries prescribe.
- [ ] **Step 2:** Test-first per function: failing tests asserting the discriminated outcomes
      (all four rate-limit arms including `failed`; the last-owner refusal on a one-owner
      roster), then implement.
- [ ] **Step 3:** Collapse `createSectionAction`'s inline reimplementation onto
      `resolveRateLimit` per the contract division above (the "Mirrors checkRateLimit"
      comment block goes; the caller-side `key()` try and rethrow guard stay; the three log
      events asserted unchanged in the existing section-action tests).
- [ ] **Step 4:** State `verifyTurnstile`'s fail-closed boolean exception in its doc comment,
      citing `convention-outcome-idiom`.
- [ ] **Step 5:** `check:surface -- --update`; reference pages (`cloudflare.md`,
      `auth-store.md`); drift-hunt; CHANGELOG `Consumers must:`; close the six ledger entries.
- [ ] **Step 6:** Full gate; commit: `refactor(auth-store,cloudflare)!: discriminated outcomes replace conflating booleans`

### Task 5: ContentFormFailure flattened; the Tier 2 retires, leak-free

**Files:**
- Modify: `src/lib/sveltekit/content-routes.ts` (the `ContentFormFailure` declaration, the arm
  re-exports, and the `ContentRoutes` contract's action signatures — symbolic anchors; Task 2
  edited this file)
- Modify: `src/lib/sveltekit/cairn-admin.ts` (the composer's action union re-types — symbolic)
- Modify: the arm declaration sites (`content-routes-core.ts`, `content-routes-media.ts`,
  `content-routes-tidy.ts`) — module-level exports stay where a cross-module consumer needs
  them (the retires pass's three-case rule)
- Test: `src/tests/unit/` content-routes suites; the seven components annotating
  `form: ContentFormFailure` (`CairnAdmin.svelte`, `CairnTidySettings.svelte`,
  `VocabularyAdmin.svelte`, `EditPage.svelte`, `NavTree.svelte`, `ConceptList.svelte`,
  `CairnMediaLibrary.svelte`)

**Interfaces:**
- Produces: `ContentFormFailure` as ONE FLAT INTERFACE, every field optional, each field
  documented against the action that sets it (the ledger's prescribed shape,
  `audit-sveltekit-contentformfailure`).
- **The five core arms retire WITHOUT manufacturing leaks (review finding B1): the action
  signatures that carry them are re-typed in the same task.** Today `ContentRoutes`,
  `CairnAdminRoutes`, and `createCairnAdmin`'s rendered shapes name the five arms in their
  action members (`saveAction: … ActionFailure<SaveFailure>` and siblings). This task
  re-types those five actions' failure payloads to `ActionFailure<ContentFormFailure>` in
  `content-routes.ts` and the composer, which completes the ratified flatten (the union IS
  the documented form type) and removes every surviving carrier — the F-1 leak predicate then
  has nothing to fire on. Only after that re-type do `SaveFailure`, `DeleteRefusal`,
  `RenameFailure`, `CreateFailure`, `PreviewMintFailure` retire (barrel and subpath
  publications drop; module-level exports stay only where a cross-module consumer needs
  them). The five media arms stay module-internal (their Tier 1 retires ride 4b);
  `TidyFailure` is already un-nameable.
- **`UsageEntry` does NOT retire in this pass** (review findings N3/B1-adjacent): the
  flattened `ContentFormFailure` itself carries `usage?: UsageEntry[]`, so the flat keep is
  its own surviving carrier. `UsageEntry` stays exported; its Tier 2 entry gets a progress
  note routing the retire decision to 4b beside Tier 1 (where its other carriers,
  `MediaDeleteRefusal`/`MediaReplaceFailure`, retire), naming the inline-vs-keep choice 4b
  must make.
- The `Failure`-suffix ruling governs any surviving refusal-shaped name this task touches.

- [ ] **Step 1:** Write the failing test: a type-level fixture asserting the flat
      `ContentFormFailure` is assignable from each action's actual failure payload and that
      the five re-typed actions declare `ActionFailure<ContentFormFailure>` (compile-only;
      the existing component mounts stay green). PLUS one runtime test per re-typed action
      asserting its returned failure's KEY SET is unchanged (security round N8: the flat
      all-optional type no longer prevents an action from carrying another action's fields,
      so the tests hold that line instead).
- [ ] **Step 2:** Author the flat interface (derive the field union from the eleven arms'
      current members; `usage?: UsageEntry[]` stays a field), drop the `Partial<>`
      intersection, re-type the five action signatures, keep the arms module-internal per the
      three-case rule.
- [ ] **Step 3:** Execute the five core-arm retires; verify with the F-1 predicate (no
      retire-verdicted name remains inside any surviving rendered shape — grep the
      regenerated `api-surface.md` for all five names, expect zero hits).
- [ ] **Step 4:** `check:surface -- --update`; reference pages (`components.md`,
      `sveltekit.md`); drift-hunt the five names; CHANGELOG `Consumers must:` (sites
      annotating a specific arm move to `ContentFormFailure`); close the five arm entries
      plus `audit-sveltekit-contentformfailure`; progress-note the `UsageEntry` entry as
      routed to 4b.
- [ ] **Step 5:** Full gate; commit: `refactor(sveltekit)!: flatten ContentFormFailure; retire the Tier 2 arms leak-free`

### Task 6: Auth cookie posture (derivation, probe cross-check, loud jars, platform sweep)

**Files:**
- Modify: `src/lib/sveltekit/csrf.ts` (the derivation helper generalizes),
  `src/lib/sveltekit/guard.ts` (the two session-cookie reads — symbolic anchors),
  `src/lib/sveltekit/auth-routes.ts` (`confirmAction`/`logoutAction` secure derivation —
  symbolic)
- Modify: `src/lib/doctor/check-probe.ts` (the derivation comment and cross-check, see below)
- Modify: `src/lib/sveltekit/content-routes-dictionary.ts` (`dictionaryAddAction`),
  `content-routes-media.ts` (`ingestAndStore`, `mediaReplacePreviewAction`,
  `mediaAltPreviewAction`), `content-routes-tidy.ts` (`tidyAction`) — the five soft jar
  guards
- Test: `src/tests/unit/csrf.test.ts`, `src/tests/integration/auth-load-csrf.test.ts`,
  `src/tests/unit/doctor-check-probe.test.ts`, content-routes suites

**Interfaces:**
- **Session cookie:** the three call sites (`guard`'s two reads, `confirmAction`,
  `logoutAction`) derive through the same `PUBLIC_ORIGIN`-aware, MONOTONIC derivation the
  CSRF pair uses. Mechanically: the helper body is ORIGIN-PARAMETERIZED (one body taking
  `{ url, platform }`-shaped input), with the existing event-taking `csrfSecure` becoming a
  thin wrapper; the session call sites call the same body. An https request always resolves
  Secure; `PUBLIC_ORIGIN` can only raise, never lower. The `secure` passed to any
  `cookies.delete` and the boolean fed to `sessionCookieName` come from ONE variable, never
  two calls (SvelteKit's `cookies.delete` Secure default over non-localhost http; the
  csrf-hardening HISTORY rule). Belt-and-braces (security round, N1): `logoutAction` deletes
  BOTH cookie-name forms (bare and `__Host-`, session and CSRF), each with its matching
  `secure` — a `PUBLIC_ORIGIN` change between login and logout must not strand a browser
  cookie. The ledger close states plainly that on guarded admin paths this is a COHERENCE
  change, not a security fix (`guard.ts` refuses http+non-local before any route runs, so
  the one differing derivation row is unreachable there), and names the one residual: auth
  routes a site mounts OUTSIDE `/admin` over http on a non-local host would mint a
  discarded `__Host-` cookie — `security-model.md`'s mount-under-`/admin` instruction is the
  guard. Docs updated IN THIS BULLET: `docs/extend/security-model.md` (the "derives from the
  request's own protocol" and "can diverge on one request" paragraphs are the divergence
  this removes) and `crypto.ts`'s `csrfCookieName` "mirroring `sessionCookieName`" docstring
  (the ledger entry's named listener). Closes ledger
  `session-cookie-derivation-out-of-csrf-slice`.
- **Probe (deliberately NOT a total fold; review findings F8 + N3):** the doctor probe's
  derivation from the PROBED URL is a detection mechanism, not drift: it is what catches a
  deployed site whose leftover-`http` `PUBLIC_ORIGIN` minted a weak cookie. The probe KEEPS
  deriving its expected cookie name from the probed origin, via the shared
  origin-parameterized body fed the PROBED base itself (provably equal to today's answer,
  and immune to the `--url`-overrides-wrangler-origin trap), with a comment stating why an
  external observer derives from the observed scheme as a CROSS-CHECK on the runtime. The
  ledger close for the carried `check-probe.ts:49` item records this resolution: one body,
  two deliberate inputs, not a silenced disagreement.
- **Loud jars (review finding F7 shapes the mechanism):** the five soft
  `if (!event.cookies || …)` guards convert via a small internal `requireCookieJar(event)`
  that THROWS and NARROWS; the exported CSRF helpers' parameter types stay strict
  (`cookies: CookieJar`, non-nullable) — widening them to `| undefined` would trade a
  compile error for a runtime throw, the inverse of the platform convention. The
  CSRF-verdict half of each guard KEEPS its `fail(403)`. Observable behavior for an untyped
  caller: `viewAction`'s catch turns the throw into `fail(500)` plus an
  `admin.action.failed` record — the CHANGELOG line says that, not "crashes", and the thrown
  message names only the jar, never a cookie value. Cites `convention-auth-loud-postures`.
- **Platform sweep:** audit the CSRF/auth helper family for any remaining optional-`platform`
  signature and align to required-but-nullable (the csrf-hardening precedent).

- [ ] **Step 1:** Test-first per bullet (the failing test precedes each change; the probe test
      asserts the cross-check still reddens on a mismatched derivation pair).
- [ ] **Step 2:** Implement in the order listed; each bullet is its own commit.
- [ ] **Step 3:** `check:surface -- --update` where signatures moved; reference pages
      (`auth-crypto.md`, `doctor.md` probe section, `security-model.md`); CHANGELOG; ledger
      closes per bullet.
- [ ] **Step 4:** Full gate; commit (final):
      `fix(auth)!: one cookie derivation body, probe cross-check, loud jars`

### Task 7: Login-CSRF nonce binding and adminAction authorization (security-round-hardened)

**Files:**
- Modify: `src/lib/sveltekit/auth-routes.ts` (`requestAction`, `confirmAction`,
  `logoutAction` — symbolic anchors; Tasks 2 and 6 edited this file)
- Modify: `src/lib/auth/store.ts` (`issueToken`, `consumeToken` — the nonce is VALUE-BOUND
  server-side, see below)
- Create: `migrations/0004_login_nonce.sql`
- Modify: `src/lib/components/LoginPage.svelte` / `ConfirmPage.svelte` (the distinct
  absent-nonce error copy)
- Modify: `src/lib/doctor/checks-d1.ts` (or wherever the `auth.store` D1 probe lives —
  locate by check id; it learns to assert the `nonce_hash` column)
- Modify: `src/lib/sveltekit/admin-action.ts` and `src/lib/sveltekit/section-action.ts` (the
  authorization sequence extracts to one shared implementation — symbolic)
- Test: auth-routes integration suites (`auth-request.test.ts`, the confirm suite),
  admin-action and section-action unit suites

**Interfaces — nonce binding (security round B2, B3, F1, F2, N6 all fold here):**
- **Value-bound, not presence-only.** `migrations/0004_login_nonce.sql` adds a NULLABLE
  `nonce_hash TEXT` column to `magic_token`; `issueToken` stores the hash of the browser's
  pending nonce with the token row; `consumeToken`'s single atomic DELETE gains the
  predicate `AND (nonce_hash IS NULL OR nonce_hash = ?)` so pre-migration rows stay
  confirmable and new rows require the match. Hashes compare inside that one SQL predicate
  (constant-time concerns end there; no `===` on secrets anywhere). Presence-only is NOT
  acceptable: it re-admits the victim-has-their-own-pending-cookie variant and the
  visited-scanner variant (round-1 N6: the nonce is what defeats a link-following mail
  scanner, and only value-binding does it fully).
- **The mint is UNCONDITIONAL and identical on all four `requestAction` exits** (send-ok,
  non-editor neutral, throttled, send-failed): the `Set-Cookie` for `cairn_login_pending`
  is emitted with byte-identical attributes BEFORE any branch on `editor`, using
  reuse-unexpired-or-mint; only the server-side binding write rides token issue. Anything
  else is a one-request allowlist oracle in the response headers (round B3). A test asserts
  the neutral and send-ok responses' headers are identical INCLUDING `Set-Cookie`.
- **Rotation never unconditional; consumption only on success.** Reuse-unexpired is
  mandatory (a throttled resend must NOT rotate the cookie away from the still-live emailed
  token — test: request → throttled resend → the first link still confirms). The nonce
  cookie is deleted on successful confirm and on logout ONLY; a failed confirm attempt
  leaves it (deleting on failure is a lockout amplifier). The logout delete passes its
  setter's `secure` (Task 6's one-variable rule).
- **Ordering:** the nonce check runs BEFORE `consumeToken`, so a cross-browser click does
  not burn the token; the same emailed link still works from the requesting browser.
- **The absent-nonce refusal gets its OWN error code and copy** (round F1; the transplant
  source's own reasoning: "absent is a statement about the requester's own browser"):
  `?error=` distinct from `expired`, page copy naming the same-browser requirement
  ("request the link from the browser you'll open it in"), a `log-events.md` row, and a
  `security-model.md` flow section. Collapsing it into "invalid or expired" tells a
  cross-device user to do the thing that reproduces the failure, and on a single-owner site
  that is an admin lockout.
- **Known cost, stated:** the cross-device flow (request on desktop, click on phone, or an
  in-app mail WebView with a separate cookie jar) now refuses with the instruction above.
  This is a deliberate availability-for-integrity trade the ledger close records, with
  re-requesting from the clicking browser as the escape hatch. The alternative that
  preserves cross-device (a request-time verifier code shown on the login page) is filed as
  a ROADMAP note, not built here.
- **Rollout:** the un-migrated failure mode (SQL naming `nonce_hash` against an un-migrated
  `AUTH_DB`) is a TOTAL login outage with no second channel, so this is a hard, guided
  requirement, not a silent degrade: the CHANGELOG `Consumers must:` line says "apply
  migration 0004 before deploying", the `auth.store` doctor probe asserts the column (so a
  pre-deploy doctor run catches it), and the batched window's per-site update sheets carry
  the step. The WATCH double-mint discriminator semantics must keep holding; assert
  `guard.rejected` fields unchanged, and add the pending-cookie double-mint analogue test
  (two concurrent cookie-less request POSTs: the surviving cookie must confirm the
  surviving token).

**Interfaces — adminAction authorization (security round B1 reshapes the ratified item):**
- The round-1 security review proved the literal "same sequence, default-on" form 403s
  EVERY existing zero-config consumer: the guard attaches `cairnAccess = access ?? {}`
  (empty object, never undefined), and `hasAccessRule({}, target)` is false for every
  target, so default-on enforcement is a breaking lockout of the documented DB-less
  default, not a hardening. The executed form closes the asymmetry by making the CAPABILITY
  symmetric, opt-in:
  - ONE shared internal `authorizeAdminTarget(access, editor, { target, ownerOnly })`
    implementation; `createSectionAction` calls it (behavior byte-identical on its existing
    suites, including check order and log events).
  - `adminAction` gains an OPT-IN `access?: { target: string; ownerOnly?: boolean }` member
    on its options bag. Absent = today's behavior exactly. Present = the shared sequence
    runs, refusals are AUDITED and then THROW `error(403)` — adminAction's existing refusal
    channel (its contract: authorization refusals throw; its return type must NOT widen to
    `T | ActionFailure`).
  - The audit-sink consequence is named in the CHANGELOG: a site opting in starts receiving
    denial records through its `cairnAuditSink`.
  - `check:surface -- --update` covers the new options member; reference pages state the
    opt-in and the absent-means-today default in one sentence each.

- [ ] **Step 1:** Test-first per the Interfaces bullets (each named test exists and fails
      before its implementation lands).
- [ ] **Step 2:** Implement; nonce and adminAction are separate commits.
- [ ] **Step 3:** Reference pages (`sveltekit.md`, `ambient.md`, `admin-routes.md`,
      `security-model.md`, `log-events.md`, `doctor.md` for the probe column assert);
      CHANGELOG lines per bullet; close `login-csrf-no-same-browser-binding` with the
      trade-off recorded; file the per-IP rate-limit note (security round N5) and the
      request-time-verifier alternative as ROADMAP lines in the ritual.
- [ ] **Step 4:** Full gate; commit (final):
      `feat(auth)!: value-bound login nonce; opt-in audited authorization for adminAction`

### Task 8: The auth-channel fold

**Files:**
- Modify: `src/lib/auth-channel/factory.ts` (`AuthChannelEvent`, the config interface,
  `revokeSessions` — symbolic anchors), `src/lib/auth-channel/store.ts`
  (`CHANNEL_SCHEMA_SQL`), `src/lib/auth-channel/index.ts`
- Create: `migrations-channel/0000_channel.sql` — a SIBLING directory, **never under
  `migrations/`** (security round F4: `migrations/` is `AUTH_DB`'s `migrations_dir`; the
  showcase's own wrangler.jsonc states twice that sharing it cross-applies schemas, and the
  vitest harness walks `migrations/` into `AUTH_DB`). Add `migrations-channel` to
  `package.json` `files` with a `check:package` assertion.
- Test: auth-channel unit suites; the EXISTING byte-pin drift test
  (`src/tests/unit/auth-channel-migration-drift.test.ts`, currently pinning the showcase's
  `migrations-members/0000_channel.sql` to `CHANNEL_SCHEMA_SQL`) is REPOINTED so the
  packaged file becomes canonical and both the showcase fixture and the internal version
  constant assert byte-equality against it (round N7: a one-character drift between file and
  `CHANNEL_SCHEMA_VERSION` is a fail-closed outage for every channel action, so the tripwire
  is the acceptance criterion, not prose); a compile-only consumer fixture mirroring
  xcathletes' usage

**Interfaces:**
- `CHANNEL_SCHEMA_SQL` retires as an export: the DDL becomes the packaged migration file at
  `migrations-channel/0000_channel.sql`, canonical, with the store's constant asserted
  against it per the repointed drift test. The DDL ships in idempotent form
  (`CREATE TABLE IF NOT EXISTS`, `CREATE INDEX IF NOT EXISTS`, `INSERT OR IGNORE` for the
  `schema_version` row — byte-compatible with a fresh install), because an
  already-provisioned consumer (xcathletes ran the SQL directly; its channel D1 has no
  `d1_migrations` rows) pointing `migrations_dir` at the file must not abort on
  `table already exists`; the `Consumers must:` line carries the explicit
  "already provisioned: insert the `d1_migrations` marker, do not re-apply" step.
  `verifySchema` semantics unchanged; the schema itself does not change in this pass.
- **Cookie-delete `secure` fix rides this task** (security round F6, a live latent bug): the
  channel's three cookie deletes (confirm's pending + session deletes, logout's) pass their
  setter's `secure` flag, per the engine's own recorded rule — today logout over http on a
  non-localhost host leaves the browser cookie standing.
- `AuthChannelEvent` retires: callbacks take `CairnEvent`. **This IS a breaking change for
  xcathletes** (review finding F9: it imports the NAME and uses it in a public signature;
  structural compatibility does not save a named import). The claim is stated honestly: the
  compile-only fixture asserts the NEW shape compiles against a xcathletes-shaped consumer,
  and the CHANGELOG `Consumers must:` carries the rename line (`AuthChannelEvent` →
  `CairnEvent`).
- `revokeSessions(db, subject)` **KEEPS its event-free signature as the recorded exception**
  (review finding F9): it is the one member callable outside a request (xcathletes calls it
  from a roster-archive path with a `db` and no event; cron/queue callers are the same
  class). The asymmetry gets a stated reason in the doc comment and in the re-authored
  ledger shape (`audit-auth-authchannel`), per `convention-internal-sibling-comment`'s
  stated-split culture — uniformity was weighed and the out-of-request capability won.
- `AuthChannelConfig`: the nine-knob `ttl` bag re-derives per its re-authored ledger shape
  (rank 13: regroup by what a site actually tunes together), and `lookup`/`verify` gain a
  NARROW context, not the event (security round F5): `lookup: (contact: string,
  ctx: { env: Env }) => …`, same for `verify`, mirroring the existing `DeliverContext`
  precedent. The evidenced need is a BINDING (`ctx.env` closes the xcathletes `WeakMap` gap
  exactly); handing the full event would put `request`/`cookies`/`url` into the two most
  safety-critical callbacks — `lookup` decides subject-vs-decoy (the no-roster-leak
  property; a request-keyed lookup makes membership request-controlled and the factory
  swallows its throw as a miss), and a `false` from `verify` DESTROYS the session row on
  every authenticated request. The TSDoc states that neither callback may read
  request-shaped data.
- `DeliverContext`, `ChannelRequestResult`, `ChannelConfirmResult` keep with the factory,
  shapes per their entries (the no-roster-leak and challenge-required-is-retry rulings
  survive verbatim).
- Reference page `auth-channel.md` rewritten for all of the above;
  `docs/extend/add-a-second-audience.md` Path B updated; CHANGELOG `Consumers must:` carries
  the full xcathletes migration list (event type, ttl bag, lookup/verify signature, schema
  file; revokeSessions unchanged).

- [ ] **Step 1:** Re-author the truncated shapes for `audit-auth-authchannelconfig`,
      `audit-auth-authchannel`, and `audit-auth-createauthchannel` from `rank-auth-family.md`
      (ranks 11, 13, 15) as amended by Task 1's reopen entry, before code. Close all EIGHT
      open family entries in this task against the rewritten shapes.
- [ ] **Step 2:** Test-first per bullet; the compile-only consumer fixture mirrors
      xcathletes' actual post-migration usage (module-scope channel per binding, D1-backed
      lookup using the new event parameter, `sessionPerson(event: CairnEvent)`).
- [ ] **Step 3:** Implement; `check:surface -- --update`; drift-hunt (`skills/` included;
      waymark regenerated); docs; CHANGELOG.
- [ ] **Step 4:** Full gate; commit: `refactor(auth-channel)!: fold the channel onto the engine's auth grammar`

### Task 9: The coupled pairs (validateReproFence, defineAccess)

**Files:**
- Modify: `src/lib/reproductions/validate.ts`, `src/lib/reproductions/manifest.ts` (the
  `:331` re-export)
- Modify: `src/lib/auth/access.ts` (`defineAccess`), `src/lib/auth/roles.ts` (`DEFAULT_ROLES`
  and `resolveOwnerLevelRoles` — post-Task-3 name)
- Modify: `scripts/checks/check-visuals.mjs` (the caller supplies the register options
  explicitly)
- Test: `src/tests/unit/reproductions-validate.test.ts`, `src/tests/unit/check-visuals.test.ts`,
  the access/roles unit suites

**Interfaces:**
- `validateReproFence(body, manifest, options?)`: the manifest-dependent half (story resolves,
  width declared, required keys `story`/`alt`/`caption`) stays engine-owned; the register half
  moves behind options — `options: { altPrefix?: RegExp; maxAltLength?: number; extraKeys?: string[] }`
  with NO register defaults baked in (omitting an option skips that check; `check-visuals.mjs`
  passes cairn-pub's register explicitly). Return type becomes the inline
  `{ issues: string[] }`; **`ReproFenceValidation` retires with the reshape** (leak-free: the
  inlined return removes its only carrier, exactly as the addendum ruling intended — review
  note N4). Closes `audit-repro-validatereprofence` and `audit-repro-reprofencevalidation`.
- `defineAccess(roles: RolesDeclaration | undefined, map)`: accepts `undefined` like its
  siblings (`resolveCapability`, `roleHome`, `resolveOwnerLevelRoles`), defaulting the
  vocabulary to the same source `resolveCapability` uses. Then **`DEFAULT_ROLES` retires**
  (leak-free: rendered as a literal value, named inside no surviving shape — review note N4;
  the flip on `audit-adapter-default-roles` executes exactly the condition its keep verdict
  named, pre-authorized). The default vocabulary keeps ONE definition (`DEFAULT_ROLES` may
  survive as an internal constant); `docs/extend/restrict-admin-access.md`'s instructed
  import updates.

- [ ] **Step 1:** Test-first both halves (a localized alt prefix passing under caller
      options; `defineAccess(undefined, map)` validating against the default vocabulary; the
      owner-only-must-be-written-`['owner']` empty-list rule unchanged).
- [ ] **Step 2:** Implement; `check:surface -- --update`; drift-hunt (`reproductions.md`,
      `core.md`, `restrict-admin-access.md`, showcase; waymark regenerated).
- [ ] **Step 3:** CHANGELOG `Consumers must:`; ledger closes per the Interfaces block, plus
      an annotation on `audit-adapter-defineaccess`.
- [ ] **Step 4:** Full gate; commit: `refactor!: validateReproFence caller-register options; defineAccess default vocabulary; DEFAULT_ROLES retires`

### Task 10: The doctor's anti-silent-green posture

**Files:**
- Modify: `src/lib/doctor/types.ts` (the `CheckStatus`/`CheckResult` vocabulary and
  constructors — review finding F13), `src/lib/doctor/report.ts`, `src/lib/doctor/run.ts`,
  `src/lib/doctor/bin.ts`
- Modify: `src/lib/doctor/checks-local.ts` (`config.csrf-disable`, `config.site-config`,
  `config.tidy-key`, `admin.mount-shape`), `src/lib/doctor/check-floors.ts`,
  `src/lib/doctor/check-edge.ts` (or wherever `edge.https-forced`/`edge.hsts` live — locate
  by check id)
- Test: the doctor unit suites; `docs/reference/doctor.md`

**Interfaces (review-hardened; findings B2, B3, F12, F13):**
- The status vocabulary becomes FOUR values with distinct semantics and a three-way exit
  contract:
  - `pass` / `fail` — unchanged; `fail` drives exit 1.
  - `skip` — NOT APPLICABLE only; never gates.
  - `info` — a heuristic could not see, or a finding is advisory; reported with guidance,
    never gates. **`admin.mount-shape` converts to `info`** (its ledger shape prescribes
    exactly this INFO tier; its never-fails design survives; entry closes).
    **`edge.https-forced` and `edge.hsts` demote to `info`** per their ledger shape
    ("demote both to advisory (report, never gate)") — the new tier is the advisory tier
    that entry says the doctor lacks; entry closes (review finding F12).
  - `unchecked` — a deterministic check's required input was absent or unreadable ("could
    not look"). Distinct tag, distinct summary count, and drives **exit 3** (a NEW code:
    2 stays "bad flags / run couldn't start", so CI can distinguish all three; the exit
    table in `doctor.md` and its "A skip never fails the run" sentence rewrite
    accordingly, and the CI-gate section states the new semantics).
- Recategorizations, each honoring its own ledger shape:
  - `config.csrf-disable` reads BOTH `svelte.config.js` and `vite.config.ts` (the sv-create
    scaffold wires the adapter in vite config); `unchecked` only when NEITHER yields an
    answer — and found-in-neither is NEVER reported as found-and-correct (security round
    N9). Closes `audit-cli-config-csrf-disable-check`.
  - `config.site-config`: `src/theme/site.config.yaml` joins `SITE_CONFIG_PATHS` (closing
    the scaffold gap); `unchecked` when no candidate path matches. The one-source derivation
    from the bake constant is the internals pass's dogfood rider; a `// WATCH:` comment
    points there. Closes `audit-cli-config-site-config-check`.
  - `config.dependency-floors` **executes its ruled shape instead of going loud-red on
    pnpm/yarn (review finding B2): the check READS `pnpm-lock.yaml` and `yarn.lock`**
    alongside `package-lock.json`, so those consumers get a real verdict; `unchecked` only
    when NO recognized lockfile exists. Closes `audit-cli-config-dependency-floors-check`.
  - `auth.role-wiring` is a KEEP (its heuristic skip branches are ruled fine); its
    could-not-see branches convert to `info`, its no-custom-roles branch stays `skip`;
    annotate, don't close.
  - `config.tidy-key` gets its own condition id, and the readiness count gets its own field
    so a check carries the right remediation without borrowing `config.bindings-missing`
    (C16's two-jobs finding). Closes or progress-notes
    `audit-cli-config-tidy-key-check-and-its-active-anthropic-probe` per its re-authored
    shape.
- [ ] **Step 1:** Re-author the truncated shapes for every CLI entry this task closes, from
      `rank-cli-surface.md`.
- [ ] **Step 2:** Test-first: the four-status vocabulary, the 0/1/2/3 exit matrix, the
      both-files csrf-disable read, the pnpm and yarn lockfile parses against fixtures, the
      site-config theme path.
- [ ] **Step 3:** Implement; `doctor.md` rewritten (status table, exit table, CI section);
      CHANGELOG (`Consumers must:` states the exit-3 semantics for CI users and that
      pnpm/yarn consumers now get real floor verdicts).
- [ ] **Step 4:** Full gate; commit: `feat(doctor)!: four-status vocabulary, exit 3 for unchecked, real pnpm/yarn floor reads`

### Task 11: Bin evenness and the audit config contract

**Files:**
- Modify: `src/lib/vite/bin.ts` (whole file, 10 lines), plus a new `parseArgs`/`USAGE`
  beside `writeManifest` (`src/lib/vite/internal.ts` or a new `assemble.ts` mirroring the
  doctor split)
- Modify: `src/lib/doctor/assemble.ts` (`USAGE`), `src/lib/audit/config.ts` (`USAGE`,
  `rendered.extraPages`), `src/lib/media-seed/assemble.ts` (`USAGE`) — `--help` at exit 0
- Modify: `src/lib/audit/rendered.ts` (the redirect-trap refusal)
- Test: bin suites; `cairn-audit.md`, `cli-cairn-manifest.md`, `cli-cairn-media-seed.md`

**Interfaces:**
- **Evenness (R-11):** `vite/bin.ts` moves to `process.exitCode` (the stdout-flush rule its
  three siblings state verbatim), gains argv parsing that accepts `--help` and rejects
  everything else with a usage line at exit 2; all four engine bins answer `--help` by
  printing their existing `USAGE` constant at exit 0. Ledger
  `audit-cli-no-help-on-any-of-the-five-commands` closes for the four engine bins with a
  progress note routing `create-cairn-site`'s `--help` to the tool's pre-publish pass.
  `audit-cli-cairn-manifest-command-vite-config-discovery-exit-behavior` closes per its
  re-authored shape.
- **Config contract:** (a) `rendered.extraPages` lands as ADDITIVE beside `rendered.pages`
  (appends to `DEFAULT_RENDERED_PAGES` or to an explicit `pages`; the "replaces, never
  extends" doc warning dissolves); (c) the rendered harness gains the redirect-trap refusal:
  when EVERY configured page settles on the login card (the page-identity signals resolve to
  the login route's title/landmark for all pages), the run exits 2 with a message naming
  `CAIRN_AUDIT_COOKIES` (rank-32(c): "a silent green the run should exit 2 on"). Edit (b) is
  already landed (verified: `sheet` resolves through `asPathOrPathList`). Ledger
  `audit-cli-cairn-audit-config-json-contract-…` closes with all three edits accounted.
- Routed to 4b explicitly (review finding F12): the two audit REGISTRY-rule reshapes
  (`audit-cli-chip-ground-collision-rendered-rule`,
  `audit-cli-form-font-parity-rendered-rule`) — they are cairn-audit rules, not doctor
  checks, and no 4a task touches them.
- [ ] **Step 1:** Re-author truncated shapes for the entries this task closes.
- [ ] **Step 2:** Test-first: the vite-bin argv matrix, the `--help` exit-0 matrix across
      four bins, the extraPages merge, the all-pages-login refusal against a fixture harness
      run.
- [ ] **Step 3:** Implement; docs pages; CHANGELOG; ledger closes and the two explicit 4b
      routings.
- [ ] **Step 4:** Full gate; commit: `feat(cli)!: bin evenness, --help, additive rendered pages, redirect-trap refusal`

---

## Pass-end ritual (cairn-pass; not a numbered task)

Code-simplifier over the changed code; domain reviewer fan-out (`svelte-reviewer`,
`web-auth-security-reviewer` MANDATORY for Tasks 6-8, `cloudflare-workers-reviewer`,
`daisyui-a11y-reviewer` if any component markup moved); fix rounds; the mid-pass mechanic
check (`engine-triage` on anything filed); STATUS/HISTORY/ROADMAP updates; post-mortem
appended here; both budgets scored. ROADMAP filings owed by this pass (from the security
round): per-IP rate limiting on `requestAction`/`confirmAction` (N5 — the `RateLimitLike`
seam Task 4 reshapes is the natural mechanism), and the request-time verifier code as the
cross-device-preserving alternative to the login nonce (F1), each one line in the tier
where it bites.

## What this pass unblocks and hands to 4b

- **List (c) Tier 1 (25 media-janitorial retires)** unblocks when Task 2 declares
  `CairnAdminRoutes` narrow. 4b executes them with the same ratification-gate discipline the
  retires pass used (no keep-to-retire flip without Geoff).
- **`UsageEntry`** rides with Tier 1 (Task 5's progress note names the inline-vs-keep choice).
- The remaining open reshapes execute in 4b against the ruled conventions, finalized against
  4a's merged surface: `AuthBranding`, `PublishActionsConfig`, `RevertFailure`'s
  `lastSavedAt` rename, `TidyClient`, `MediaEntry`, `mintPreviewToken`, `formatTimestamp`,
  `OfficeList`, `StatusChip`, `normalizeAssets`, `fixtureMediaBase`, `strAttr`'s `ctx.str()`
  where not chassis-coupled, the eleven log-event evenness reshapes, the two audit
  registry-rule reshapes (`chip-ground-collision`, `form-font-parity`), and the four
  `rendered-*` harness failure ids conforming to the identifier-grammar clause
  (dot-namespaced, prefix retired).
- Routed OUT of slice 4 entirely: everything `create-cairn-site`-scoped (cost narrative, flag
  set, resume store, console, `--help` — the tool's pre-publish pass); `MarkdownEditor`'s
  seam collapse, the dogfood tripwire, the leak-class `check:surface` rider, the
  `SITE_CONFIG_PATHS`-from-bake-constant derivation (internals); the render trio re-homing
  (chassis).

## Review folds (round 1, 2026-08-30)

The two-reviewer adversarial round 1 (`engine-triage`, `web-auth-security-reviewer`) ran
against the plan as committed at `a1f2d45b`. The engine-triage findings (B1-B4, F5-F14,
N1-N6) are folded throughout this revision: B1 → Task 5's carrier re-type; B2/B3 → Task 10's
four-status design executing the ruled shapes; B4 → Task 1's `PublicRoutes` reopen and
Task 2's CHANGELOG amendments; F5 → the generated-waymark global constraint; F6/F7 → Task 4's
four-arm result and the one-grammar `outcome` clause; F8 → Task 6's probe cross-check; F9 →
Task 8's honest breaking-change statement and the `revokeSessions` exception; F10 →
Task 9's post-rename sibling name; F11 → the symbolic-anchor constraint and `parallel:
false`; F12 → `buildMediaResolver`'s opts-drop in Task 3, the edge/hsts demotion in Task 10,
the two registry rules routed to 4b; F13 → `types.ts` in Task 10's files; F14 → the 6/9
splits (now Tasks 6/7 and 10/11) and the 5.5M ceiling.

The security round (`web-auth-security-reviewer`) returned three BLOCKING findings, all
folded: B1 (default-on adminAction enforcement 403s every zero-config consumer via the
guard's empty-map default) → Task 7's opt-in `access` option with the throw-`error(403)`
channel; B2 (the nonce needs value-binding, a schema migration, and a rollout story — the
un-migrated failure is a total login outage) → Task 7's `migrations/0004_login_nonce.sql`,
nullable-column predicate, doctor column assert, and hard guided `Consumers must:`; B3
(minting only where a token issues is an allowlist oracle) → the unconditional
identical-headers mint. Its FIX findings landed as: F1 → the distinct absent-nonce error
copy and the recorded cross-device trade; F2 → reuse-unexpired mandatory, consume on
success/logout only, the throttle-resend and double-mint tests; F3 → Task 4's
atomic-write-first mandate and concurrency acceptance test; F4 → `migrations-channel/` as a
sibling dir with idempotent DDL and the already-provisioned marker step; F5 → the narrow
`{ env }` context on `lookup`/`verify`; F6 → the channel cookie-delete `secure` fix; F7 →
`requireCookieJar` narrowing with strict exported helpers. Notes N1-N9 landed as the
one-variable secure/name rule, the both-names logout delete, the coherence-not-security
ledger wording, the security-model.md/crypto-docstring listeners, the probe
probed-base-input rule, the `not-eligible` discriminant, the per-action key-set tests, the
never-found-means-correct clause, and the two ROADMAP filings.

Two folds moved beyond the ratified sitting options' letter and are flagged for Geoff at
plan review: adminAction's authorization is OPT-IN (the ratified "symmetric checks" option
said "gains the same checks"; the review proved default-on is a lockout of the documented
zero-config default, so the executed form makes the capability symmetric instead), and the
login nonce's cross-device cost (request on one device, click on another, now refused with
instructive copy) is accepted as a deliberate trade per the ledger entry's own prescription,
with the verifier-code alternative filed to ROADMAP.

Round 2 (`engine-triage`, focused verification of this folded revision) ran before the
plan was handed to execution; its residual findings and dispositions are recorded below
when it completes.
