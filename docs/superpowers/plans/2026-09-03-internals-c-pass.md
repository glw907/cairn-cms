# Internals-C Pass Implementation Plan (audit remediation, slice 7: coherence)

> **For agentic workers:** execute through the `cairn-pass` skill's implementer chain
> (`cairn-implementer` → `diff-reviewer` → gate), workflow mode via
> `~/.claude/workflows/pass-execute.js`. Steps use checkbox syntax for tracking.
> **Runs only after internals-B merges** (ratified ordering: gates and sweeps must not
> churn under files being split). Reconcile every anchor against post-B `main` at
> dispatch; the B splits move several files this plan sweeps.

**Goal:** land the coherence layer the any-site audit proved missing: a compile-time
exhaustiveness idiom over `FieldDescriptor`, an enforcing idiom gate (indentation, exit
idiom, comment register), the `ec-*` → engine-owned prefix rename, the `as never`
test-cast retirement, truthful module headers, the public/internal boundary signal with
the newcomer internals map, and the two reconciliations routed at the internals close
(`csrfSecure`'s origin read, the F-1 `/components` premise).

**Architecture:** coherence work is sweeps plus one new gate. The gate (`check:idioms`)
enforces only machine-checkable rules and lands AFTER each sweep makes the tree conform,
so it never ships red. Behavioral surface changes are exactly two: the `ec-*` class rename
(a `Consumers must:` event in the already-batching window) and `csrfSecure`'s widened
origin read (documented, doctor-probe semantics preserved deliberately).

**Tech stack:** TypeScript, Svelte 5, the repo's `scripts/checks/*` gate estate, vitest.

**Spec:** `docs/internal/record/2026-08-26-any-site-audit/int-coherence.md` (the thirteen,
lines 70-379), `int-walk-newcomer.md` (the map's ten asks), the internals-B docket's
ratified defaults (3, 4, 5) and routed-at-close items, all verified 2026-09-03; anchors
against `ed586ee0` pre-B and re-verified at dispatch.

**Token ceiling:** 5.5M. **Checkpoint interval:** every four tasks (checkpoints at 4, 8).
**Execution:** workflow mode; independence marked per task. **Worktree:**
`.claude/worktrees/internals-c` off post-B `main`, from-scratch showcase `npm ci` before
any e2e.

## Ruled inputs (recorded; no task re-derives them)

- **Exhaustiveness (ratified default 5, mechanism ruled here from the recon):**
  `FieldDescriptor` is a closed 15-arm union (`content/fields.ts:122-137`) whose values
  originate in site config through the engine's own `fields.*` constructors, so the guard
  is compile-time: a shared `unreachable(value: never): never` helper that throws if ever
  reached. The five full dispatchers close on it; the four partial/implicit sites keep
  their silent-skip semantics with a one-line note each (closing them would distort
  deliberate no-ops; recon tiered them as lower risk). `render/registry.ts:234` is the
  existing fail-closed exemplar the ledger row cites.
- **Formatter (ratified default 4, measured):** 2-space indentation is the dominant
  practice (354 of 381 files, ~97.9%); the eight tab-indented stragglers are enumerated in
  Task 2. Enforcement is the measured thing only — indentation — via `check:idioms`.
  Wholesale formatter adoption (Prettier) is explicitly out of scope: it would reformat
  wrapping across the whole tree, the opposite of the ratified least-churn default.
- **`ec-*` (ratified default 3):** rename to the engine-owned `cairn-*` namespace the
  engine already declares for its other emitted tokens (`render/highlight.ts:15` states
  the contract: engine owns class names, site owns colors). One `Consumers must:` line.
- **`as never` (docket sizing: large but mechanical):** full retirement, not a ratchet —
  862 casts across 91 test files at last count, replaced by a typed test-event builder;
  the sweep parallelizes per file under workflow mode.

## Global constraints

- `check:surface` unchanged except Task 9's stated regeneration (if the leak-model change
  moves the snapshot); no public export added or removed anywhere except as Task 4 states.
- Sweeps rewrite comments and whitespace, never code behavior; any task step that changes
  behavior says so and is test-first.
- New gate rules land in the same task as the sweep that makes the tree conform: the gate
  is born green.
- TSDoc/comment standards throughout; every touched header ends the pass true.
- The six CI-only gates by name at pass end; the internals-B lesson list applies (a green
  local ritual is not CI; run the six by name).

---

### Task 1: The exhaustiveness idiom (independent)

**Files:**
- Create: `src/lib/unreachable.ts` (internal, exported from no subpath), plus its unit test
- Modify: `src/lib/content/frontmatter.ts` (`decodeField` default ~:53,
  `frontmatterFromForm` default ~:151), `src/lib/content/fieldset.ts` (`validateField`'s
  fall-through, ~:253-259), `src/lib/components/FieldInput.svelte` (the `{:else}` at ~:311),
  `src/lib/components/ComponentForm.svelte` (the `{:else}` at ~:272), and one-line notes at
  the four partial sites (`content/references.ts:55-58`, `delivery/site-resolver.ts:167-168`,
  `components/ReferenceField.svelte:38-39`, the `required || boolean` carve-outs at
  `ComponentInsertDialog.svelte:126` / `ComponentForm.svelte:154`)
- Modify: `docs/internal/engine-rulings.md` (the mechanism ruling row)

**Interfaces:**
- Produces: `unreachable(value: never, context?: string): never` — throws
  `cairn: unreachable <context> arm` if ever reached at runtime; its real job is the
  compile error when a sixteenth `FieldDescriptor` arm forgets a dispatcher.

- [ ] **Step 1:** write the helper and its test (a deliberately widened value throws; the
  type-level contract is pinned with a `@ts-expect-error` case).
- [ ] **Step 2:** close the five dispatchers. The template `{:else}` branches become
  explicit final arms over the remaining union members with `unreachable` guarding the
  true dead end — the currently-reachable generic-input rendering for the arms the chain
  does not name must remain byte-identical in output (enumerate the unhandled arms
  explicitly rather than guessing; the compiler names them).
- [ ] **Step 3:** run the field-rendering component suites and the frontmatter/fieldset
  unit suites; mutation check: add a scratch sixteenth arm locally, confirm `npm run check`
  fails at every dispatcher, revert (this is the audit's own experiment, now failing
  closed).
- [ ] **Step 4:** record the ledger row; full gate; commit.

**Acceptance criteria:** the audit's half-added-arm experiment can no longer pass the
gate; zero behavior change across the 15 real arms (suite-proven); the four partial sites
carry their deliberate-no-op notes.

### Task 2: `check:idioms` — indentation, exit idiom, gate identity (independent)

**Files:**
- Create: `scripts/checks/check-idioms.mjs` + unit test beside the sibling gate tests
- Modify: the eight tab-indented files (`src/lib/components/{tidy-diff,tidy-validate,tidy-categorize,chrome-guard,editor-tidy}.ts`,
  `src/lib/sveltekit/tidy-prompt.ts`, `src/lib/diagnostics/{conditions,error}.ts`),
  the twelve `process.exit(1)` gate scripts (converge on `process.exitCode = 1`, the
  ledger-backed idiom the internals pass already applied to its own gates), gate output
  strings that spell their own identity inconsistently (the audit's four-spellings
  finding, int-coherence.md :312-329), `.editorconfig` (header comment becomes true),
  `package.json` (`check:idioms` wired into `check` and CI)

**Interfaces:**
- Produces: `check:idioms` with three rules at birth — leading-tab indentation banned in
  `src/lib` + `scripts` (`*.ts`/`*.svelte`/`*.mjs`), `process.exit(` banned in
  `scripts/checks/*.mjs` (the exitCode idiom), and a gate self-identity check (each
  `check-*.mjs` names itself in output by its script name, one spelling). The
  `{ ok } | { ok: false }` verdict shape and `formatViolations` conventions copied from
  `check-self-use.mjs`. Task 3 extends it; the rule list is data, not hardcoded prose.

- [ ] **Step 1:** write the gate + tests (fixture trees for each rule, red and green).
- [ ] **Step 2:** sweep the eight files to 2-space (whitespace-only diffs; verify with
  `git diff -w` empty), the twelve exits, the identity spellings; the gate goes green on
  the real tree.
- [ ] **Step 3:** wire into `package.json` and CI; full gate; commit.

**Acceptance criteria:** `check:idioms` green; `git diff -w` empty for the indentation
sweep; `.editorconfig`'s enforcement claim is now backed by a gate; no
`process.exit(` remains under `scripts/checks/`.

### Task 3: The comment-register purge (independent; large mechanical sweep)

**Files:**
- Modify: every `src/lib` file carrying pass-scoped process references (~179 `Plan NN` /
  `Task N` / pass-name citations), `docs/superpowers/` pointers (19), or private
  consumer-site names (18) in comments — re-enumerate at dispatch; the counts are
  2026-08-26 audit figures
- Modify: `scripts/checks/check-idioms.mjs` (the register rules land once the tree is clean)

**Interfaces:** none new; comment rewrites only.

- [ ] **Step 1:** enumerate the current hits (the audit's three patterns; int-coherence.md
  :189-209); partition: a comment whose rationale survives without the process citation is
  reworded to state the rationale (or cite a ledger slug — the durable form the internals
  pass established); a comment that is ONLY a process citation is deleted; consumer-site
  names become generic descriptions ("a consuming site's member area"), never named sites.
- [ ] **Step 2:** sweep in parallel per directory under workflow mode; `npm run
  check:comments` green throughout.
- [ ] **Step 3:** add the three register rules to `check:idioms` (ban `docs/superpowers/`
  paths in `src/lib` comments; ban the process-reference patterns; ban the known consumer
  hostnames); gate born green; full gate; commit.

**Acceptance criteria:** zero process-scoped references, superpowers pointers, or consumer
names in `src/lib` comments; every rewritten comment still states a true rationale
(spot-verified by the diff-reviewer against the code); the gate holds the line.

### Task 4: `ec-*` → `cairn-*` (independent; the pass's one consumer-facing rename)

**Files:**
- Modify: `src/lib/render/glyph.ts` and `src/lib/render/rehype-dispatch.ts` (the two
  emission sites), the three admin components re-declaring the classes locally
  (`ComponentInsertDialog.svelte`, `IconPicker.svelte`, `MediaPicker.svelte`),
  `docs/reference/render.md` (the documented `ec-icon` contract plus newly documenting the
  full emitted-class list), `examples/showcase/src/**/prose.css` (the ten `ec-*` selector
  rules), the e2e locator that keys on one, `CHANGELOG.md`, `docs/extend/migration-notes.md`
- Test: render unit suites; the showcase visual suite via CI

**Interfaces:**
- Produces: emitted classes `cairn-head`, `cairn-icon`, `cairn-icon-secondary`,
  `cairn-glyph`, `cairn-grid` (the five, re-inventoried at dispatch — the audit's 18-site
  figure is directionally right, recount before citing). The namespace rule lands in
  `render.md`: engine-emitted public markup uses `cairn-*`; `toolkit-*` stays
  admin-internal and undocumented.

- [ ] **Step 1:** write the failing render tests asserting the new class names on the
  glyph/head/grid fixtures.
- [ ] **Step 2:** rename at the two emission sites and the three local re-declarations;
  green.
- [ ] **Step 3:** sweep the showcase selectors and the e2e locator; document the full class
  list and namespace rule in `render.md`; CHANGELOG entry with the `Consumers must:` line
  (sites styling `ec-*` selectors rename them to `cairn-*`; the old names emit nothing);
  migration-notes entry. Full gate; commit.

**Acceptance criteria:** `grep -rn 'ec-' src/lib examples/showcase docs/reference` returns
no emitted-class hits (allowlist unrelated matches explicitly); the showcase renders
identically (CI visual suite green); the `Consumers must:` line names the exact selectors.

### Task 5: The typed test-event builder (independent; feeds Task 6)

**Files:**
- Create: `src/tests/helpers/test-event.ts` (or the tests' existing helper home — match
  `_setup.ts` conventions) + its own unit test
- Modify: the five heaviest cast files (`component/CairnMediaLibrary.test.ts` 73,
  `unit/cairn-admin-actions.test.ts` 51, `integration/content-routes-revert.test.ts` 50,
  `unit/content-routes-edit.test.ts` 47, `integration/content-routes-preview.test.ts` 42)

**Interfaces:**
- Produces: a builder producing real `CairnEvent`-shaped values without type erasure —
  design it from what the five files actually fake (params, locals, platform.env, request,
  cookies); partial overrides typed with `Partial`/`satisfies`, never `as never`. Task 6
  relies on its exact exported name and signature; pin them in this task's test.

- [ ] **Step 1:** inventory the cast shapes in the five files; write the builder + test.
- [ ] **Step 2:** convert the five files (263 casts); suites green; full gate; commit.

**Acceptance criteria:** zero `as never` in the five files; no test's assertions weakened
(the diff-reviewer checks deleted casts did not take assertions with them); the builder's
doc comment states the erasure hazard it replaces.

### Task 6: The `as never` retirement sweep (depends on Task 5)

**Files:**
- Modify: the remaining ~86 test files (re-count at dispatch; post-B paths differ)
- Modify: `scripts/checks/check-idioms.mjs` (ban `as never` under `src/tests` once zero)

**Interfaces:** consumes Task 5's builder verbatim.

- [ ] **Step 1:** sweep per file in parallel under workflow mode, each conversion running
  its own file's suite.
- [ ] **Step 2:** confirm repo-wide zero; add the gate rule (born green); full gate; commit.

**Acceptance criteria:** `grep -rn "as never" src/tests` returns nothing; the full suite
count is unchanged or higher (no test deleted to dodge a conversion); `check:idioms` holds
it at zero.

### Task 7: Truthful headers and the self-licensing duplication comments (after Tasks 3; shares files)

**Files:**
- Modify: the ~12 headers stating something the code contradicts (int-coherence.md
  :163-182; `admin-icons.ts` is the exemplar), the 10 headerless `render/` files (M1
  headers written), the 34 duplication-precedent comments (:107-120), plus the
  `ctx.logCommitFailed` call-style note handed forward by internals-B Task 3

**Interfaces:** none new.

- [ ] **Step 1:** re-enumerate both lists against the post-B tree; for each lying header,
  make it true (fix the header, never the code, unless the mismatch reveals a one-line
  defect — then flag to the conductor rather than fixing silently).
- [ ] **Step 2:** for each duplication-precedent comment: if the duplication is a ruled
  exception, cite the ledger slug; if it is unruled and the collapse is one import line,
  collapse it; otherwise reword to state the actual tradeoff without citing a sibling copy
  as license. Unify the two `logCommitFailed` call styles onto one (pick the module import;
  it is the majority).
- [ ] **Step 3:** `render/` gets its ten M1 headers (each stating the module's contract,
  written from the code as it is post-B). Full gate; commit.

**Acceptance criteria:** every header in the touched set states something the code does;
no comment cites "the sibling does this too" as its only rationale; `render/` is fully
headered.

### Task 8: The boundary signal and the newcomer internals map (after B; independent of 1-7)

**Files:**
- Create: `src/lib/README.md` (the internals map)
- Modify: the four docs disagreeing on `cairn.config.ts`'s location (re-enumerate; the walk
  names `src/lib/` in two published pages vs `src/theme/` everywhere real),
  `CONTRIBUTING.md` (points at the map), `docs/internal/docs-friction-log.md` if writing
  surfaces design friction

**Interfaces:** none; documentation.

- [ ] **Step 1:** write the map to the walk's ten asks (int-walk-newcomer.md): the ~23
  directories mapped to subsystems with the 13-public/10-internal split MARKED per
  directory; the request flow traced in code (`cairn-admin.ts` → `admin-dispatch.ts` →
  `guard.ts` → `content-routes.ts`, the walk's own praised path); the five loose root
  files placed; the post-B `content-routes-*` sibling pattern explained; where `/render`
  symbols are defined vs re-exported; "where would I add a field type" answered by
  pointing at Task 1's now-enforced dispatcher list.
- [ ] **Step 2:** fix the config-location disagreement in all four docs (the scaffold's
  `src/theme/` is the truth); `check:docs` green.
- [ ] **Step 3:** run the register/prose review the repo applies to internal docs; full
  gate; commit.

**Acceptance criteria:** a newcomer following README → map answers the walk's six
orienting questions without grep; every named doc agrees on `src/theme/cairn.config.ts`;
the public/internal marking matches `package.json`'s real export map (derive, don't
assert).

### Task 9: The two routed reconciliations (independent)

**Files:**
- Modify: `src/lib/dev-flag.ts` (export `readPublicOrigin`), `src/lib/sveltekit/csrf.ts`
  (:34, :63-75), `scripts/checks/check-surface-leaks.mjs` (:233-244 skip premise),
  `docs/reference/` pages if the csrf behavior note warrants it
- Test: csrf unit suites (new cases first), check-surface-leaks unit suite

**Interfaces:**
- Produces: `readPublicOrigin(env: unknown): string | undefined` exported from
  `dev-flag.ts`; `csrfSecure` consumes it, gaining the `process.env` fallback
  DELIBERATELY: the doctor probe path (`csrf.ts:59-61`, calls with no platform) now reads
  a dev machine's `process.env.PUBLIC_ORIGIN` when set, which makes the probe match the
  deployment instead of silently differing — state this in the function docs and the
  probe's comment as intended, not incidental.
- The F-1 `/components` skip: derive the subpath's type-export list from the components
  barrel + dist declarations mechanically (the enumerated-exports premise becomes verified
  by the gate itself instead of asserted in prose), or, if the derivation proves
  structurally unreachable in this gate's two models, record WHY in the comment with the
  concrete blocked shape and keep the skip — either outcome updates the comment the
  internals pass left pointing here.

- [ ] **Step 1:** csrf: failing tests for the two new source paths (platform-first,
  process fallback, local-origin fallback to hostname); land the shared read; existing
  csrf suite green unchanged.
- [ ] **Step 2:** the leak-model derivation (or its recorded impossibility); gate suite
  green; surface snapshot regenerated only if the model change moves it. Full gate; commit.

**Acceptance criteria:** one function answers "is PUBLIC_ORIGIN a non-local origin"
everywhere; the doctor probe's behavior change is documented at both sites; the
`/components` skip comment no longer asserts an unverified premise.

### Task 10: Exemplar-tier drift, the fifth monolith line, and records (last)

**Files:**
- Modify: the `createSectionAction` docs (verify current call-site count — the audit
  measured zero non-test callers; either the extend arm repositions it as the sanctioned
  shape with a worked example that the chassis pass will realize in the showcase, or it is
  demoted with a ledger note — decide from what the docs claim TODAY, and route the
  showcase half to chassis inputs either way), `ROADMAP.md` (`content-routes-media.ts`,
  1,414 lines, recorded as the remaining tracked monolith; the coherence items shipped
  here leave the tiers), the chassis-inputs record (the showcase exemplar item)

**Interfaces:** none; documentation and routing.

- [ ] **Step 1:** the `createSectionAction` verification and doc fix; the chassis routing
  line.
- [ ] **Step 2:** ROADMAP updates; full gate; commit.

**Acceptance criteria:** the docs teach the shape the engine actually sanctions; ROADMAP's
monolith accounting matches the tree; chassis inputs carry the showcase half explicitly.

---

## Pass-end ritual (cairn-pass; not a numbered task)

Code-simplifier; reviewer fan-out — `svelte-reviewer` (Tasks 1's template arms, 4's
components), `web-auth-security-reviewer` (Task 9's csrf change — mandatory), the standing
cleanliness-and-beauty review, `daisyui-a11y-reviewer` only if Task 4's rename touched
rendered semantics (it should not); the six CI-only gates by name plus the newborn
`check:idioms`; from-scratch consumer proof (Task 4's rename is the consumer-visible
change the e2e must see); whole-log friction triage; STATUS/HISTORY/ROADMAP; post-mortem
here; both budgets scored.

## What this pass hands forward

- **Chassis:** the showcase exemplar realization (Task 10's routing); the standing chassis
  mandate applies in full.
- **Polish:** unchanged list (OfficeList ruling + scroll rider, `formatTimestamp`
  widening, palette live region) plus whatever the sweeps surface.
- **Release:** the window holds; ONE cut after polish, now carrying this pass's two
  `Consumers must:` lines (`ec-*` rename; the formatTimestamp line from internals).
