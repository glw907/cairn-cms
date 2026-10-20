# The retires pass: executing list (b) (remediation initiative, slice 3)

> **For agentic workers:** five serial chain dispatches (three Task 1 batches, Task 2,
> Task 3), each a `cairn-implementer` / `diff-reviewer` chain with the full gate inside. No
> dispatch is an `opus` candidate: every deletion is verdict-settled; judgment calls route to
> the conductor. **This plan was adversarially reviewed pre-dispatch by two engine-triage
> lenses (claims and mechanics, 2026-08-30); all 23 findings and Geoff's three addendum
> rulings are folded in below. No further pre-flight is owed.**

**Token ceiling (WHOLE pass, chains plus ritual): 4.5M** (re-based on the mechanics review:
the 60 live names carry ~2,800 raw grep hits, and foundations B spent ~2.4M on a ten-name
sweep plus two narrower tasks; the original 2.5M was ~4x low). **Checkpoint:** at every batch
boundary, not every task; the conductor restates spend at each and flags at 80% by name.
**Worktree:** `retires` off `main` at the commit carrying BOTH ruled sections of the R4
record (verify `docs/internal/record/2026-08-30-r4-rederivation.md` section 7 contains
"RULED (Geoff, 2026-08-30" AND the "ADDENDUM RULINGS" subsection before the first dispatch).
**Worktree prep, mandatory before dispatch 1:** inside the worktree run `npm ci`,
`npm ci --prefix examples/showcase`, `npm run package`. After that, a `check:consumers` or
`check:template` failure is a real regression until proven otherwise; do not attribute it to
the worktree symlink trap post-install.
**Shared files (why the dispatches are serial):** `docs/internal/engine-rulings.md`,
`docs/internal/api-surface.md`, `scripts/checks/check-surface-reexports.json`,
`scripts/checks/check-rulings-format-allowlist.json`, `CHANGELOG.md`,
`docs/extend/migration-notes.md`.
**Spec:** `docs/superpowers/specs/2026-08-27-audit-remediation-initiative-design.md` (slice
3; standing constraints apply verbatim).

**The ratified input and the counts as executed (the record's tables plus the two ruled
subsections supersede any count stated elsewhere):**
`docs/internal/record/2026-08-30-r4-rederivation.md`. The list (b) table has 63 rows. As
executed:

- **List (a), already executed: 2.** `STATUS_CHIP_DOT_CLASS` (ledger `:2097`) and
  `StatusChipTone` (`:2322`), both closed by the toolkit-seams pass; absent from
  `api-surface.md` and from `src/`. The record's "list (a) is EMPTY" claim predates this
  discovery (its `check:surface`-diff test is structurally blind to retires executed before
  the snapshot existed); the addendum corrects it. Task 3 verifies both remain absent and
  carries them into the move record as list (a).
- **Deferred to the chassis pass (chassis-coupled, addendum ruling): 3.** `cardShell`
  (`:3106`), `headRow` (`:3120`), `iconSpan` (`:3113`) are value-imported by
  `examples/showcase/src/theme/cairn.config.ts` / `src/chassis/render.ts` and the baked
  `templates/waymark` twins, and taught as `docs/extend/configure-rendering.md`'s worked
  example. Their deletion requires the chassis re-homing, template re-emit, and guide
  rewrite in the same change, which is slice 6's designed scope. This pass only annotates
  their ledger entries with the deferral. They join list (c) as Tier 4.
- **Moved to list (c) Tier 2 (reshape-blocked, addendum ruling): 1.** `ReproFenceValidation`
  (`:3188`) is named in the return of `validateReproFence` (`api-surface.md:467`), an OPEN
  RESHAPE (`:3203`); deleting it now manufactures an unrecorded leak. It retires with (or
  after) that reshape in the conventions pass. Task 3 annotates its ledger entry.
- **Tier 3 (first ruling): 1.** `AdminActionOptions` (`:1887`), argument-position, blocked.
- **Executed this pass: 56 = 38 unsanctioned + 18 sanctioned.** The 18 are section 5's F-1
  table minus `AdminActionOptions`; `ReproInstance` STAYS sanctioned (addendum ruling: it is
  a callback parameter, inference covers the inline case, and the `Parameters<>` replacement
  below covers the extracted-helper case). The 38 are the remaining table rows.
- **List (c): 36** (Tier 1: 25, Tier 2: 7, Tier 3: 1, Tier 4: 3). Untouched by this pass
  except the annotations Task 3 names. **Partition: 2 + 56 + 36 = 94.**
- **`DEFAULT_ROLES`** (`audit-adapter-default-roles`, `:276`) is the named exclusion; it
  must survive unchanged.

**Goal:** delete the 56 ratified retires, close their ledger entries, record the 18 accepted
closure leaks by name, annotate the deferrals, and leave the surface snapshot, ledger, and
leak record agreeing.

## Global constraints

- **Three dispositions, decided per name** (mechanics F3; the foundations B post-mortem's
  operative rule). (1) No remaining reference anywhere in `src/lib`: delete the declaration
  and every barrel line. (2) Consumed only inside its declaring module: drop the `export`
  keyword and every barrel line. (3) Consumed by another `src/lib` module (the
  `createContentRoutesInternal` disposition, the majority case): the module-level `export`
  STAYS; only the barrel and subpath publication go. Never relocate a declaration to convert
  case 3 into case 2. The task report states each name's disposition.
- **Tests, three clauses.** (i) A test whose SUBJECT is the retired export itself is deleted
  with it. (ii) **Repoint first:** a test whose subject is a surviving mechanic (e.g.
  `admin-toolkit-fields.test.ts`'s stacked-register block riding `TextInput`;
  `_FieldRowHarness.svelte` under `vertical-alignment-recipes.test.ts`) is re-expressed on
  hand-rolled markup BEFORE its vehicle component is deleted; every repointed test is named
  in the report. (iii) A barrel-membership assertion (`*-barrel-prune.test.ts`,
  `*-exports.test.ts`) moves the name from its KEPT list to its demoted list rather than
  dropping the assertion; the diff review verifies no name was ADDED to any KEPT list and
  each moved name belongs to the dispatch.
- **Ledger closes.** Established form (`Reopens on: closed. Executed by the retires pass,
  <batch>: ...`). Exactly **7** executed slugs are on the format allowlist
  (`audit-auth-devdelivery`, `audit-auth-insertownerifempty`, `audit-delivery-feedview`,
  `audit-delivery-unlistedroutes`, the three `audit-cli-*` declined proposals), all in the
  unsanctioned bucket: repair-and-delist each at close, EXCEPT the three `audit-cli-*`
  declined proposals, where the gate's `shape-needs-rederivation` marker is the correct
  repair, not a fabricated shape. **Closing never deletes an existing `- **Shape:**` line**
  (the exit ratchet requires it permanently for `ORIGINAL_TRUNCATED_SLUGS`; three executed
  names are in that state: `audit-sveltekit-resolvenavlayout`, `-resolvenavlayoutoptions`,
  `-validatenavlayout`). `npm run check:rulings-format` green after every batch.
- **The gate is re-derived, not recited** (spec `:135-136`): before the first commit, list
  every step of `.github/workflows/test.yml` in order and run them locally per batch, plus
  `.github/workflows/scaffold.yml`'s emit-and-build whenever `templates/`,
  `examples/showcase/src/chassis/`, or `examples/showcase/src/theme/` changes. Two riders
  this diff trips that the shorter local ritual misses: `check:arm-indexes` (58 of the 60
  names sit in `docs/reference/` across ~10 pages) and `check:custom-surface` (budgeted in
  `scripts/checks/custom-surface-budget.json`). `templates/waymark` compiles at every batch
  gate; `npm run check` 0/0 and `npm test` exit 0 always.
- `npm run check:surface -- --update` with the regenerated snapshot committed in the same
  batch as its deletions. Expected shape of the whole pass's surface diff: **exactly 56
  export-row removals and ZERO changed surviving exports**; every keep parent's rendered
  line byte-identical (the rendering never read export status, so a changed keep line means
  a mistake).
- Per deleted name, the drift hunt across `docs/`, `src/` (comments), `examples/`,
  `templates/`, `scripts/`. Retained-hit classes: implementation history, tests handled per
  the tests clauses, ledger, CHANGELOG, historical plans/specs/records, **and
  precedent-comments** (a live consumer comment citing a deleted export as a design
  precedent stays; `devDelivery` has exactly 5 such showcase hits, comments not imports).
  Reference pages drop each deleted name's rows in the same batch; `check:docs` guards
  inbound links.
- One rolled `CHANGELOG.md` entry per batch under `## Unreleased` with `Consumers must:`
  lines; the sanctioned 18's lines name the replacement expressions from Task 2's table.
- No version bump, no publish; no annotation on list (c) entries beyond the ones Task 3
  enumerates.

---

## Task 1: The 38 unsanctioned deletions, three family batches

Each batch is its own chain dispatch ending at a commit with the full re-derived gate.
Batch enumeration comes from the record's list (b) table minus the 18 F-1 rows,
`AdminActionOptions`, the 2 list (a) slugs, `ReproFenceValidation`, and the render trio; the
task report enumerates each batch with ledger anchors and dispositions, and the diff review
checks the enumeration first.

- [ ] **Batch 1a — `audit-adapter` (2) + `audit-admin` (17): 19 names.** Carries the
      toolkit component deletions and both repoint-first cases named above.
- [ ] **Batch 1b — `audit-auth` (5) + `audit-cli` (3): 8 names.** The three `audit-cli-*`
      rows are process proposals (ledger-only closes with the `shape-needs-rederivation`
      marker; nothing to delete in `src/`); say so in the report rather than hunting for
      code. Carries 6 of the 7 allowlist repairs.
- [ ] **Batch 1c — `audit-delivery` (6) + `audit-render` (1: `isElement`, disposition 3, its
      internal consumers `render/authoring.ts` and `render/rehype-dispatch.ts` keep the
      module export) + `audit-repro` (1) + `audit-sveltekit` (3): 11 names.** The
      `configure-rendering.md` sentence naming `isElement` beside the deferred trio is
      trimmed to drop `isElement` only; the trio's teaching stays until the chassis pass.
- [ ] Acceptance per batch: gate green; api-surface diff shows exactly that batch's rows
      gone and nothing else changed; ledger closes verified; pair-death check (a name whose
      only naming site is another retire dying in the same pass is fine ONLY if both are in
      this batch or an earlier one — the seven known pairs are
      `AppliedFilterPill`/`computeAppliedFilters`, `FormatMoneyOptions`/`formatMoney`,
      `FormatPhoneOptions`/`formatPhone`, `ItemRange`/`computeItemRange`,
      `PageWindowItem`/`computePageWindow`, `AiCrawler`/`AI_CRAWLERS`,
      `ResolveNavLayoutOptions`/`resolveNavLayout`; keep each pair within one batch).

## Task 2: The 18 sanctioned-leak deletions and the leak record

**Files:** as Task 1 for the 18, plus the new
`docs/internal/record/<date>-retires-move-record.md` (the manual leak ledger until the
internals pass lands the gate rider).

- [ ] Delete each of the 18 (dispositions per the three-case rule; most are case 3, their
      declarations consumed by keep contracts in other modules). Ledger close names the
      accepted leak ("survives structurally inside `<keep parent>`; accepted `NavIcon`-class
      leak per the F-1 hybrid ruling, r4-rederivation section 7").
- [ ] **The replacement-expression table, pre-written; the implementer transcribes and
      proves, never derives.** The five non-obvious ones: `LoginData` →
      `Extract<AdminData, { view: 'login' }>['page']` (or
      `Awaited<ReturnType<AuthRoutes['loginLoad']>>`); `ConfirmData` → the same `Extract`
      form with `view: 'confirm'`; `EditorsData` → `Extract<AdminData,
      { view: 'editors' }>['page']` (or via `EditorRoutes`); `TidyKeyProbeResult` →
      `Exclude<SettingsData['keyStatus'], 'missing'>` (verify the exact member name against
      `api-surface.md:642` before writing it); `ReproInstance` →
      `Parameters<NonNullable<ReproStory['pose']>>[1]`. `AdvisoryAction` is two hops
      (`EditData['advisories'][number]['actions'][number]`; verify member names at
      `api-surface.md:481`). The remaining twelve are single-hop indexed access off their
      F-1 keep parents (`ListData['entries'][number]` and kin); derive each from the
      parent's rendered row and record it in the move record.
- [ ] The move record: the 18 rows (keep parents, api-surface anchors, replacement
      expression, ruling citation), the list (a) pair, the standing leak arithmetic in the
      scoped predicate's terms (below), and the internals pass named as the rider's owner.
- [ ] The executable proof: a compile-only fixture under `src/tests/unit/` importing SOURCE
      paths (the `env-genericity.test.ts` idiom, `../../lib/...`), typing one value per
      replacement expression. This proves the structural forms; **the shipped-subpath proof
      is `check:consumers`** (do not attempt a package self-import from `src/tests`).
- [ ] Acceptance: gate green; the api-surface diff for this task is exactly the 18 export
      rows gone, zero changed exports, every F-1 keep parent's rendered line byte-identical
      (grep each of the 18 names in the regenerated snapshot: it appears only inside keep
      parents' shapes, never as an export row); ledger closes and move record agree
      row-for-row.

## Task 3: Closure verification and consolidation

**Files:** `scripts/checks/check-surface-reexports.json`, `docs/internal/api-surface.md`
(final), `docs/internal/engine-rulings.md`, `docs/extend/migration-notes.md`, `CHANGELOG.md`,
`docs/internal/record/2026-08-30-r4-rederivation.md` (an "executed" annotation atop section
3 pointing at the move record; nothing else there changes).

- [ ] **Re-export record: the expected shrink is ZERO entries** (none of the 56 is a
      recorded re-export) **and the real work is 4 reason-prose repairs**: `ConceptDescriptor`
      (cites `feedView`), `AccessMap` (cites `ResolveNavLayoutOptions`), `Capability` (cites
      `EditorsData`), `PreviewConfig` (cites `ResolvedPreview`) — prune the dead name from
      each `reason`, keep the surviving requirers. A removal would be a surprise; report it
      as one.
- [ ] **Ledger bookkeeping, the complete annotation list** (resolving the earlier
      annotations contradiction; these and no others): (i) a new first-class entry for the
      F-1 hybrid ruling and its addendum (suggested slug
      `f1-return-position-leak-sanction`), `Verdict:` quoting the hybrid plus the three
      addendum rulings, `Shape:` the rider's fail-unless-recorded form, `Reopens on:` the
      rider landing in the internals pass, `Record:` the R4 record section 7 and the move
      record — the foundations A precedent (`read-from-the-source-rule`,
      `canonical-home-rule`) for a standing rule as a ledger entry; (ii) `AdminActionOptions`
      (`:1887`): progress annotation carrying the Tier 3 blocker and reopen trigger; (iii)
      `ReproFenceValidation` (`:3188`): the Tier 2 move and its reshape coupling; (iv) the
      render trio (`:3106`, `:3113`, `:3120`): the chassis deferral.
- [ ] Verify the ledger totals: 56 closed by this pass + 2 previously closed (verified
      still absent from `api-surface.md` and `src/`) + 36 open (list (c)) = 94;
      `DEFAULT_ROLES` untouched.
- [ ] **The leak check, scoped and runnable** (the bare "exactly 23" was untestable): the
      predicate is *retire-verdicted name, absent from every export list, named in a
      surviving rendered public shape*. Expected: **20** (the 18 sanctioned +
      `DictionaryAddFailure` + `TidyFailure`). Authorized: a throwaway derivation script
      over `check-surface.mjs`'s `buildSurfaceModel()` per-subpath model with an
      externals/type-parameter allowlist named in the report; NOT committed (the permanent
      rider is the internals pass's). Two written exclusions in the move record:
      `RemoveIndex`/`ValueOf`/`StandardResult` are never-exported internal helpers outside
      the class, and `NavIcon`/`EngineScreenId`/`SlotKind` are the EXPANSION class
      (rendered expanded, not by name), out of this predicate's reach and owned by the
      internals pass.
- [ ] `migration-notes.md` entry under `## Unreleased`; the batches' CHANGELOG entries
      consolidate into one block, `Consumers must:` lines grouped by family with the
      replacement expressions.
- [ ] Acceptance: the full re-derived gate green; a CI consumer proof (push / PR for the
      e2e run) before the pass is called releasable.

---

## Pass-end notes

`diff-reviewer` per dispatch plus a pass-end `engine-triage` dispatch verifying: the 56
closes, the 38/18 split, the move record's rows and replacement expressions, the 20-leak
arithmetic with its written exclusions, the four ledger annotations, and that list (c)'s 36
and `DEFAULT_ROLES` are untouched. Routing confirmed by the addendum rulings: the
**conventions pass** owns `validateReproFence`'s reshape and with it `ReproFenceValidation`'s
retire, the `ContentFormFailure` reshape (Tier 2's other six), and the
`DEFAULT_ROLES`/`defineAccess` pair; the **chassis pass** owns the render-trio re-homing
(local hast builders in the showcase chassis, `emit:template` re-bake, the
`configure-rendering.md` worked-example rewrite, then the three deletions); the **internals
pass** owns the leak-class `check:surface` rider and the expansion-class trio.

---

## Post-mortem (2026-08-30, appended at pass close)

**What landed.** Nine commits on the `retires` worktree off `main` at `6f643a31`. The 56
ratified retires executed: 38 unsanctioned across three family batches (1a: 19, 1b: 8 of
which 3 were ledger-only process proposals, 1c: 11) and the 18 F-1 sanctioned leaks with
the move record (`docs/internal/record/2026-08-30-retires-move-record.md`), the
compile-only replacement fixture, and the consolidated CHANGELOG block. The format
allowlist shrank 40 to 33 (all 7 executed slugs repaired and delisted). Task 3 landed the
four reason-prose repairs, the four ledger annotations, and the `f1-return-position-leak-sanction`
standing-rule entry. The api-surface diff against `main` is 58 removed export rows, 0
added, 0 modified (53 removed names; 5 published from two subpaths; 3 closes carried no
symbol).

**Verification.** Every batch ran the re-derived gate from `test.yml` locally, green,
including the CI-only riders (`check:arm-indexes`, `check:custom-surface`,
`check:snippets`, `check:comments`, `check:transcripts`, `check:symbols`). Each dispatch
was reviewed by `diff-reviewer` (Opus) against independently re-derived enumerations: two
first-pass accepts, three fix-then-accept cycles. The pass-end `engine-triage` audit
re-derived all seven acceptance items from the artifacts and returned PASS on each,
including the 2 + 56 + 36 = 94 partition and the 25/7/1/3 tier split of the untouched
list (c). The auth security review found the mechanical claim clean (zero-byte diff on
`src/lib/auth/**`; the factory still fails closed) and its findings were prose defects,
fixed in `a7f92e43`.

**Decisions the plan did not settle, taken during execution.**
- The drift-hunt scope now includes `skills/` (ships in the npm tarball; the plan's
  directory list omitted it, and batch 1a's review caught two shipped skill pages
  teaching deleted components).
- The plan's "6 of the 7 allowlist repairs" in batch 1b was a miscount: the split is 5
  (auth + cli) and 2 (delivery, batch 1c).
- The plan's pre-written `AdvisoryAction` replacement does not compile (`actions` is
  optional); the corrected form `NonNullable<EditData['advisories'][number]['actions']>[number]`
  is used everywhere. The plan body at :166 still carries the broken literal; the move
  record supersedes it.
- The leak check's literal predicate yields **17**, not the plan's expected 20:
  `AdvisoryAction` is invisible to one-hop rendering, and `DictionaryAddFailure` /
  `TidyFailure` carry no retire verdict, so the plan's own number contradicted its
  predicate. The move record states the full arithmetic (17 rendered strict / 18 type
  graph / 19 rendered and 20 type-graph including the two un-verdicted standing leaks).
- The pass-end security review found the CHANGELOG's `devDelivery` migration snippet
  ungated (production OTPs to Workers Logs; xcathletes will follow that line) and a
  factory-side control cited as fact that was never built. Both fixed: the gated in-body
  refusal form from the showcase's capture transport is the taught replacement, and a new
  showcase Playwright spec pins the refusal executable again.

**Carried forward.**
- *Internals pass (rider owner):* the move record's predicate is subpath-blind —
  `NavIcon`/`EngineScreenId` carry their own `/sveltekit` export rows and need a
  per-subpath clause, only `SlotKind` is absent-everywhere; `RemoveIndex`/`ValueOf`/
  `StandardResult` are structurally identical to `DictionaryAddFailure`/`TidyFailure`
  under the predicate, so the split needs a stated rule; the record's "retire-verdicted"
  clause deliberately narrows F-1's "retire-or-absent" wording. All three are now stated
  in the move record itself. Also: a reference-page convention for teaching the
  indexed-access form beside a shape that names an un-importable member (18 sites), and
  whether the factory grows a per-call `CAIRN_DEV_BACKEND` refusal.
- *Conventions pass:* `ReproFenceValidation` retires with the `validateReproFence`
  reshape. *Chassis pass:* the render trio re-homing then deletion.
- Cosmetic: `reproductions-stories.test.ts`'s per-story `has a matching manifest entry`
  assertion is now vacuous (the aggregate reverse-containment test carries the
  guarantee); tidy when next in that file.
- Local `check:vale` shows 18 errors on three files untouched since `main` (local Vale
  3.19.0 vs the CI pin); CI is the arbiter and `main` is green there.

**Budgets.** Ceiling 4.5M for chains plus ritual; subagent meters sum to ~4.6M (nine
implementer/fix dispatches ~3.0M, nine review dispatches ~1.1M, simplifier + triage +
auth review + pass-end fixes ~0.6M), landing at the ceiling, driven by three
fix-and-verify cycles the per-batch reviews caught. Human interaction points: zero
questions mid-pass.
