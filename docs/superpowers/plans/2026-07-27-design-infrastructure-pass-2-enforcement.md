# Design infrastructure Pass 2: enforcement

> **For agentic workers:** execute task-by-task by dispatching each task to
> `cairn-implementer` (pinned Sonnet); the main loop reviews each diff and confirms the
> full gate before the next dispatch. Pass `model: opus` only where a task flags it.
> Steps use checkbox (`- [ ]`) syntax for tracking. Task 0 runs on `main` BEFORE the
> worktree exists; everything else runs on a feature worktree off `main` (`cairn-pass`
> conventions; after creating the worktree, `npm install` in `examples/showcase` so its
> `file:` deps point at the worktree, per the CLAUDE.md symlink gotcha).

**Goal:** the admin's design language becomes mechanically enforceable: the ruled
normalization (the three 2026-07-27 amendments) empties the deviations ledger's type
sections, `cairn-audit` ships as a packaged bin with the nine static and eleven rendered
rules, the four repo gates graduate into it, the toolkit closes its filed primitive gaps,
and the norms manifest generates with provenance and a CLI query.

**Architecture:** the audit follows the `cairn-doctor` per-command-bin shape
(`src/lib/audit/` with `bin.ts`, `run.ts`, `report.ts`, `types.ts`, per-mode rule modules,
exposed as `"cairn-audit": "./dist/audit/bin.js"`). Static analysis parses markup with
`svelte/compiler` and resolves class tokens against the built `cairn-admin.css`, never
regexes. Rendered mode drives a consumer-supplied BASE_URL through a dynamically imported
Playwright, both themes, and never starts a server. The rule core stays a pure module.
Normalization precedes enforcement so cairn's own tree is the audit's first honest consumer.

**Tech stack:** TypeScript, `svelte/compiler` (peer dep, guaranteed present), Tailwind 4
`@utility` in `scripts/admin-css.input.css`, tokens in `src/lib/components/cairn-admin.css`,
Vitest fixtures, showcase Playwright suite, Workers-free Node CLI.

**Spec:** `docs/superpowers/specs/2026-07-27-cairn-design-infrastructure-design.md`,
sections 5 (extended primitives list), 6 (all of it), 10 (Pass 2), 13 (the ratified
rulings). Calibration input: `docs/internal/2026-07-design-infrastructure-pass-1-deviations.md`.
Read spec sections 6 and 13 before starting.

## Global constraints

- **The pixel-freeze is over, deliberately.** Pass 2 applies the section 13 rulings, which
  move pixels. Rule: zero visual drift OUTSIDE the ratified rulings; all drift inside them
  lands in one baseline regeneration (Task 6) with an eyes-on read. Drift begins at Task 1
  (ruled leading reaches the already-migrated bracketed sites through the utilities), so
  from Task 1 until Task 6 the `admin-visual` suite is expected red; every OTHER showcase
  e2e spec must stay green at every commit. Task 1 ends by capturing a local
  post-normalization-start reference set, the drift yardstick Tasks 3–5 compare against
  (the Pass 1 captured-reference method).
- **Suppression discipline.** The only permanent suppressions in cairn's tree are the
  ratified named exceptions (spec section 13): the three wordmark sites (22px), the
  EditPage document title (30px), plus whatever Task 5 ratifies for the stat numbers.
  Every directive carries a reason. The audit counts them; the count must equal the
  exception list.
- **No speculative rules or tokens.** Every new token value is measured from the rendered
  admin, never invented. Advisory rendered rules never gate; promotion needs the Task 18
  calibration evidence.
- **Full gate per task:** targeted tests green, `npm run check` 0/0, `npm test` exit 0.
  Tasks touching admin markup or CSS additionally run `npm run check:admin-css-classes`
  and `npm run check:invisible-craft` while those wrappers exist.
- **Graduation is behavior-preserving.** A repo gate becomes a thin wrapper only with a
  same-tree no-drift proof (old implementation's findings vs new engine's, diffed;
  documented deltas only where a regex false-positive dies). The regexes never ship.
- Comments follow TSDoc/repo standards; the em dash is banned in comments. CHANGELOG
  entries go under `## Unreleased` (this pass strengthens the initiative's existing
  `<!-- release-size: minor -->` case: a new bin). No version bump, no publish.
- Docs are a pass dimension: a task that changes public surface updates its reference page
  in the same task, and `check:reference` / `check:package` stay green.

---

## Phase 0: un-red the gate (on `main`)

### Task 0: Regenerate the six stale 0.90.x baselines

Main-loop work, not a dispatch (it is a workflow trigger plus an eyes-on read).

**Files:**
- Modify (via CI): `examples/showcase/e2e/admin-visual.spec.ts-snapshots/` — the office
  shell, media library, and media detail images, light and dark (6 files).

- [x] **Step 1:** Trigger `e2e.yml` `workflow_dispatch` with `update_snapshots` on `main`.
- [x] **Step 2:** Read each regenerated image against the `0.90.x` design intent (STATUS
  names the changes: ExpandableRow graduation, ListToolbar menu facet + flex-row
  recomposition + select sizing, StatusChip hairline border, OfficeList fixes). This
  blesses shipped work, so the read is a real design read, not a diff glance.
- [x] **Step 3:** Land the images on `main`, confirm the `e2e` workflow is green.
- [x] **Step 4:** Update STATUS's red-CI paragraph to closed; commit
  (`test(e2e): regenerate the six 0.90.x admin-visual baselines`).

## Phase 1: the ruled normalization

### Task 1: Ruled leading for the six roles, and the reverse-direction token guard

**Files:**
- Modify: `src/lib/components/cairn-admin.css` (leading tokens in the grammar block)
- Modify: `scripts/admin-css.input.css` (role utilities gain `line-height`; safelist
  unchanged in names)
- Modify: `src/lib/design/grammar-tokens.ts`
- Test: `src/tests/unit/grammar-tokens.test.ts`

**Interfaces:**
- Produces: tokens `--cairn-type-<role>--leading` for all six roles; each `type-<role>`
  utility now declares `line-height: var(--tw-leading, var(--cairn-type-<role>--leading))`
  alongside its `font-size`. `GRAMMAR_TOKENS` lists the new names (Tasks 5, 9a consume it).

- [x] **Step 1: Measure before defining.** body takes `text-sm`'s 20px and title takes
  `text-2xl`'s 32px (ruled, spec section 13). For subtitle, meta, label, and chip, measure
  the dominant COMPUTED line-height at current call sites in the rendered admin; record
  the measurement table in the task commit message. A tie or a sub-two-site sample defers
  to the Tailwind named step nearest the role's size.
- [x] **Step 2: Failing tests first.** Extend `grammar-tokens.test.ts`: (a) every
  `GRAMMAR_TOKENS` name defined exactly once in the built sheet, outside theme blocks;
  (b) NEW, the reverse direction owed from the Pass 1 post-mortem: every
  `--cairn-type-*`/`--cairn-gap-*` custom property defined in the built sheet appears in
  `GRAMMAR_TOKENS`; (c) each `type-*` utility's compiled declarations set both
  `font-size` and a `line-height` that references `--tw-leading` (so `leading-*`
  composition survives).
- [x] **Step 3:** Define the tokens and utility changes, run to green, full gate.
- [x] **Step 4: Capture the drift yardstick.** Run the showcase `admin-visual` suite
  locally with snapshot updates into an UNCOMMITTED local reference directory (never the
  committed baselines). Tasks 3–5 compare against this set; it dies at Task 6's real regen.
- [x] **Step 5: Commit** (`feat(admin): type roles carry ruled leading`).

### Task 2: The heading-role probe (Geoff's pick)

Main-loop work plus one async Geoff read; run it EARLY so the pick lands before Task 5
needs it. Per design-iteration-economics: this is a probe, reviewed on Geoff's own time
while Tasks 3, 4, 7, 8 proceed.

- [x] **Step 1:** From the running showcase, capture side-by-side crops of the two live
  candidate recipes at real call sites: 16px semibold (`RenameDialog`/`EntryPicker`/
  `EditPage` panel headings) and 18px display-bold (`CairnMediaLibrary` dialog headings),
  light and dark, plus each recipe mocked into the OTHER family's context.
- [x] **Step 2:** Deliver the labeled crops to Geoff with a one-line recommendation and
  the consequence of each pick (which family visually changes). No build waits on the
  reply except Task 5.
- [x] **Step 3:** Record the pick in the deviations ledger's rulings section and the spec
  section 13 (size, weight, font family, leading); commit
  (`docs(spec): ratify the heading-role recipe`).

### Task 3: Named-step migration (text-sm, text-2xl)

**Files:**
- Modify: `src/lib/components/*.svelte`, `src/lib/admin-toolkit/*.svelte` (127 `text-sm`
  sites → `type-body`; 2 `text-2xl` sites → `type-title`)

Deterministic substitution per the Pass 1 method note: a pure string replacement verified
by grep, run in the main loop or one dispatch, never a fan-out. With Task 1's ruled
leading equal to the named steps' own, these swaps are pixel-identical.

- [x] **Step 1:** Substitute; verify by grep that zero `text-sm`/`text-2xl` class tokens
  remain in admin markup (word-boundary matching, the ledger's counting lesson).
- [x] **Step 2:** Compare a fresh local render against Task 1's captured reference: these
  two swaps must move NOTHING relative to it (Task 1's leading drift is already inside
  the reference; any new delta means the substitution is wrong).
- [x] **Step 3:** Full gate, commit (`refactor(admin): named type steps onto their roles`).

### Task 4: The 12px resolution

**Files:**
- Modify: the 120 sites (`text-xs` 80, `text-[0.75rem]` 40; concentrations in the ledger:
  EditPage 17, CairnTidySettings 13, CairnMediaLibrary 50, MediaHeroField 8)

Per-site relationship judgment, NEVER blanket substitution (the Pass 1 gap-migration
method). Dispatch with these criteria: a site expressing the label relationship
(uppercase, eyebrow-tracked, form-label, chip-adjacent annotation) resolves to
`type-label` (11px); running secondary text, timestamps, counts, and helper copy resolve
to `type-meta` (13px). A site fitting neither cleanly goes to `type-meta` and is listed
in the dispatch report for main-loop review.

- [x] **Step 1:** Produce the per-site decision table (file:line, old class, chosen role,
  relationship named) BEFORE editing; main loop reviews the table, then the edits apply.
- [x] **Step 2:** Grep-zero: no `text-xs` or `text-[0.75rem]` tokens remain in admin markup.
- [x] **Step 3:** Full gate (`admin-visual` expected red from here until Task 6; every
  behavioral spec green). Commit (`refactor(admin): resolve the 12px sites onto meta and label`).

### Task 5: The heading unification, one-offs, and ratified exceptions

Blocked on Task 2's pick. **Files:** the `text-base font-semibold` family (19 sites), the
`text-lg font-bold` display family (~15 sites), `text-xl` stat numbers
(`CairnMediaLibrary.svelte` x3), the one-off literals (ledger section 3), plus
`src/lib/components/cairn-admin.css` / `scripts/admin-css.input.css` /
`src/lib/design/grammar-tokens.ts` for the new role.

**Interfaces:**
- Produces: `--cairn-type-heading`, `--cairn-type-heading--leading`, utility
  `type-heading` (in the safelist), per Task 2's ratified recipe.

- [x] **Step 1:** Define the heading token/utility per the pick, extending the Task 1
  tests (they enumerate from `GRAMMAR_TOKENS`, so the new role rides the same assertions).
- [x] **Step 2:** Migrate both heading families onto `type-heading`; the losing family
  changes appearance by ruling. The 17px and 18px one-offs (`CairnMediaLibrary:1769`,
  `EditPage:1842`) resolve to `type-heading` or `type-subtitle` by the same relationship
  judgment, recorded in the decision table.
- [x] **Step 3:** The slips: `ComponentInsertDialog:368` (11.2px) → `type-label`;
  `CairnMediaLibrary:1982` (9.6px) → `type-chip`.
- [x] **Step 4:** Exceptions: the three wordmark sites and the EditPage document title
  keep their values and gain the suppression directive in the Task 8 syntax
  (`cairn-audit-disable-next-line type-scale -- <reason>`), reasons naming the K4 keming
  fix and the editor-canvas ruling. Decide the stat numbers (resolve to `type-heading` or
  ratify as a fourth exception) by eye against the rendered stats strip; record either way
  in the ledger.
- [x] **Step 5:** Grep-zero for `text-base`, `text-lg`, `text-xl`, `text-3xl` as
  font-size tokens in admin markup (word-boundary; `text-base-content` etc. are color
  utilities and stay). Full gate; commit (`feat(admin): the heading role lands; type scale complete`).

### Task 6: One regeneration, the eyes-on read, and the docs that must not lie

- [x] **Step 1:** Regenerate ALL `admin-visual` baselines once via the CI canonical
  renderer (`e2e.yml` `update_snapshots` against the worktree branch).
- [x] **Step 2:** Main-loop eyes-on read of every regenerated image against intent;
  before/after strips of the most-changed screens (media library, EditPage, dialogs) go
  to Geoff, batched with anything else owed him at that point.
- [x] **Step 3:** Retire the resolved ledger entries (type sections collapse to a
  ratified-history note; spacing sections stay open for Pass 3); update
  `docs/reference/admin-grammar-tokens.md` (seven roles, leading column, the exception
  list, the `--tw-leading` composition note) and `docs/internal/admin-design-system.md`
  recipes (the Pass 1 post-mortem's stale-recipe lesson: no recipe may still prescribe a
  migrated literal or the losing heading recipe).
- [x] **Step 4:** Full gate including the now-green `admin-visual` suite; commit
  (`test(e2e): regenerate baselines for the ruled normalization`).

## Phase 2: cairn-audit, static mode

> **PHASE 1 COMPLETE, 2026-07-28.** Tasks 0 through 6 landed. Task 0 merged to `main`
> (`640b48d2`); Tasks 1 through 6 are on `design-infra-pass-2-enforcement`, unmerged. The type
> scale is closed: seven roles each carrying a ruled leading, 119 twelve-pixel sites resolved,
> 129 named steps migrated, the heading role ratified at 18px/700/display, five counted
> exceptions, and one baseline regeneration read by eye. Everything below is untouched.
>
> Three findings from Phase 1 that bind the tasks below:
>
> 1. **Task 8's suppression semantics are amended** (see the amendment in Task 8): "next line"
>    must mean the next AST node, not the next physical line. Cairn's own tree already contains
>    a multi-line-element exception site that a line-literal parser would score as two errors.
> 2. **Task 9a's `type-scale` rule must know about `text-base-content` and friends.** A word
>    boundary alone matches `text-base` inside the daisyUI COLOR utilities. This has now caused
>    a miscount twice in this initiative.
> 3. **The audit's static scan scope must include `src/lib/admin-fields`**, the third public
>    surface that renders inside the admin theme. It was missing from the stylesheet scan roots
>    and from `check:admin-css-classes` until Phase 1 added it, and the omission had already
>    silently broken a shipped class.

### Task 7: The audit skeleton and the two resolution substrates

Novel correctness-critical core: dispatch with `model: opus`.

**Files:**
- Create: `src/lib/audit/bin.ts`, `run.ts`, `report.ts`, `types.ts`, `config.ts`,
  `markup.ts` (svelte/compiler class-token extraction), `sheet.ts` (built-CSS resolution),
  `rules/static/` (empty registry), `index.ts`
- Modify: `package.json` (`bin` gains `"cairn-audit": "./dist/audit/bin.js"`; the
  `package` script's chmod list gains `dist/audit/bin.js`)
- Test: `src/tests/unit/audit/` fixtures

**Interfaces:**
- Produces: `runStatic(config): AuditReport` and the rule registration contract
  `StaticRule { id, tier: 'error' | 'advisory', check(ctx): Finding[] }` with
  `ctx = { files: ParsedComponent[], sheet: CompiledSheet, config }`. `report.ts` renders
  findings with file:line, rule id, tier, and the suppression count; exit nonzero iff
  unsuppressed error-tier findings exist. Tasks 8–10 and 15–17 consume these exact names.

- [x] **Step 1: Fixture tests first.** `markup.ts` must extract class tokens from the
  three idioms the adversarial review proved regexes fail open on: single-quoted
  attributes, array classes, object classes (Svelte 5), plus template-literal and
  `class:` directives; and must NOT match prose ("the white background" fixture).
  `sheet.ts` resolves a class token to its declarations from a compiled CSS string.
- [x] **Step 2:** Implement; config loading (consumer file: static scan scope defaulting
  to admin routes plus imported components, rendered page list, rendered allowlist);
  wire `bin.ts` with `--rendered` reserved (clear "not yet available" until Task 15).
- [x] **Step 3:** `npm run check:package` green (publint/attw see the new bin); a smoke
  run of `npx cairn-audit` against cairn's own tree executes with zero rules registered.
- [x] **Step 4:** Full gate; commit (`feat(audit): cairn-audit skeleton and substrates`).

### Task 8: The suppression idiom

**Files:** `src/lib/audit/suppress.ts` + fixtures.

**Interfaces:**
- Produces: parsing of `cairn-audit-disable-next-line <rule-id> -- <reason>` (comment
  forms: HTML in markup, `//` and `/* */` in scripts and CSS); reasons REQUIRED (a bare
  directive is itself an error-tier finding); dead-directive detection (a directive whose
  next line raises no matching finding is an error); the report's loud total.

**AMENDED 2026-07-28, discovered while writing the five ratified exceptions in Task 5.**
"Next line" must mean the next ELEMENT, not the next physical line. Three of the five
exception sites are single-line elements where the two readings agree, but the EditPage
document title is a multi-line element: the directive sits above `<input`, whose `class`
attribute lands two lines further down. A line-literal parser scores that as a DEAD
directive AND leaves the real finding unsuppressed, turning a correctly annotated site
into two errors. So the resolution rule is: a directive attaches to the first AST node
beginning on or after the following line, and suppresses matching findings anywhere in
that node's source range. This is cheap on the `svelte/compiler` substrate and impossible
on a regex one, which is a point in favor of the substrate the spec already chose. Fixture
tests must cover the multi-line-element case explicitly, using this exact site's shape.

- [x] **Step 1:** Fixture tests: suppressed finding drops from exit-code math but counts;
  missing reason errors; dead directive errors; rule-id mismatch does not suppress.
- [x] **Step 2:** Implement into `run.ts`'s finding pipeline; full gate; commit
  (`feat(audit): counted, reasoned suppressions`).

### Task 9a: Static rules, markup family

**Files:** `src/lib/audit/rules/static/no-uncompiled-class.ts`, `type-scale.ts`,
`gap-scale.ts`, `stock-default-hazards.ts` + per-rule fixture trios (failing, passing,
suppressed).

Rule contracts (spec 6.2, exact): `no-uncompiled-class` — every markup class token exists
in the built sheet. `type-scale` — every font-size-bearing declaration a class token
resolves to comes from a `--cairn-type-*` token (consumes `GRAMMAR_TOKENS`).
`gap-scale` — margin/padding/gap ARBITRARY literals (bracketed values) must resolve to
gap-role or spacing-scale tokens; named Tailwind steps pass. `stock-default-hazards` —
`badge-ghost`, bare `.dropdown`, native `disabled` on guarded buttons, flat `base-300`
card borders; each finding's message cites the refuted alternative on record in
`admin-design-system.md`.

- [x] **Step 1:** Fixtures first, then implementations.
- [x] **Step 2:** Run against cairn's own tree: exactly the ratified-exception
  suppressions fire, nothing else. Any other finding is either a real miss from Phase 1
  (fix it) or a rule false positive (fix the rule); record which, per finding.
- [x] **Step 3:** Full gate; commit (`feat(audit): the four markup-family static rules`).

### Task 9b: Static rules, CSS family

**Files:** `rules/static/token-colors.ts`, `grammar-boundary.ts`, `focus-parity.ts`,
`motion-band.ts`, `reduced-motion.ts` + fixture trios.

Rule contracts (spec 6.2, exact): `token-colors` — no raw hex/rgb/named colors, no pure
achromatics, neutrals derive from the palette's neutral role. `grammar-boundary` —
consumer CSS never redeclares a `GRAMMAR_TOKENS` name. `focus-parity` — every `:hover`
selector carries a matching `:focus-visible`. `motion-band` — durations 150–250ms, no
`transition: all`. `reduced-motion` — every transition-bearing selector covered by a
`prefers-reduced-motion` guard.

- [x] **Step 1:** Fixtures first, then implementations; scope is component `<style>`
  blocks plus consumer CSS files named by the config scan scope.
- [x] **Step 2:** Same own-tree discipline as Task 9a Step 2.
- [x] **Step 3:** Full gate; commit (`feat(audit): the five CSS-family static rules`).

### Task 10: Graduate the two static repo gates

**Files:**
- Modify: `scripts/check-invisible-craft.mjs`, `scripts/check-admin-css-classes.mjs`
  (become thin wrappers invoking the packaged engine)
- Delete (after the proof): their regex logic; fold `invisible-craft-budget.json` and
  `admin-css-classes-allowlist.json` entries into co-located suppression directives or
  rule config, whichever each entry actually is.

- [x] **Step 1: No-drift proof.** Run old and new on the same tree; diff the findings.
  Every delta must be a documented regex false positive/negative dying, listed in the
  commit message.
- [x] **Step 2:** Wrappers land; `npm run check:invisible-craft` and
  `check:admin-css-classes` keep their names and their places in CI.
- [x] **Step 3:** Full gate; commit (`refactor(gates): static gates graduate into cairn-audit`).

## Phase 3: primitives gap-closure

Source material for both tasks: aksailingclub-org's `docs/design-benchmark/decisions.md`,
the `docs/2026-07-2*-harvest-findings.md` files (findings 9 and 10 name the card-shell
and empty-notice evidence), and cairn's `docs/internal/admin-design-system.md`.

### Task 11: card-shell and the in-card empty-notice recipe

**Files:** `src/lib/admin-toolkit/` (new `CardShell.svelte` or the leanest equivalent the
evidence supports), the four sites carrying the verbatim shell string, the three
empty-notice reinventions; reference page for any new export.

- [x] **Step 1:** Locate the four verbatim shell sites and three empty-notice sites by
  grep; extract the leanest shared form (a component only if the markup genuinely
  repeats; a documented recipe plus class contract if a component would be ceremony).
- [x] **Step 2:** Migrate the sites; `admin-visual` must not move (this phase is
  post-regen; extraction is pixel-identical by definition).
- [x] **Step 3:** Full gate, reference page if a new export shipped; commit.

**Landed** as `b617219e` (plus `2fb0e8c7`, two role-utility count corrections). The leanest
form was NOT a component: the repeated string lands on `<div>`, `<form>`, `<details>`, `<a>`,
and `<span>` alike, so a wrapper component would have served almost none of the sites. It
shipped as two safelisted `@utility` container roles, `card-shell` and `card-shadow`, with the
declarations derived from the compiled sheet rather than hand-typed and a no-drift test
comparing resolved property maps. 25 sites migrated, 17 with the shadow and 8 without (all
eight are `CairnMediaLibrary` nested surfaces). `admin-visual` held at 18/18 with zero movement.
The empty-notice half closed as documentation: `AdminTable` already owns that register in its
own scoped CSS, and pinning a type role would have moved `ConceptList`'s empty state, so the
size question went to the ledger instead.

### Task 12: form-row register, PageHeader adoption, destination-picker

**Files:** per the evidence trail above; plus `PageHeader.svelte:60` (the `meta`-prop
size collision from the ledger's structural findings).

- [x] **Step 1:** Write the form-row/label register contract from ASC's two-level label
  ruling and the ClassForm label-wrap debt; encode it as toolkit structure or a
  documented recipe, whichever is leanest.
- [x] **Step 2:** PageHeader adoption sweep (the filed gap: screens still hand-rolling
  header anatomy adopt it) and the `meta`-prop ruling: EITHER the header's secondary line
  is body-sized on purpose (rename the prop's documented register) or it joins
  `type-meta`; decide by eye against rendered screens, record in the ledger.
- [~] **Step 3:** Destination-picker: extract the pattern per its harvest finding, same
  leanest-form test as Task 11. **DEFERRED, not built** (see below).
- [x] **Step 4:** Full gate; snapshots regenerate ONLY if Step 2's ruling moves the
  header line, folded into the same eyes-on discipline as Task 6; commit.

**Landed** as `34c2a5b5` (plus `40f6f3f9`, three stale scan-scope comments). Four rulings:

1. **A defect this task did not go looking for.** `PageHeader` never received the UA-margin
   fix `OfficeList` documents and carries, though its own doc calls itself that component's
   shape generalized, so its `gap-0.5` intent rendered as a roughly 58px title-to-meta gap.
   Ported verbatim, with a regression test confirmed red against the pre-fix markup. This is
   the second graduation-drift instance on record (Classes harvest finding 1 was the first):
   a component that says it generalizes another may have dropped the original's fixes, and
   the phrase "shape, generalized" is not evidence that it did not.
2. **The `meta` prop joins `type-meta`,** decided by eye against the media-library baseline,
   where the header's 14px meta line sat directly above `ListToolbar`'s own 13px count line.
   The prop is not renamed.
3. **Destination-picker deferred.** It has exactly one implementation in existence
   (aksailingclub-org's Move… dialog) and zero call sites in cairn, so extracting it would be
   the speculative generalization this plan's global constraints forbid, against a repo whose
   documented graduation bar is a second consumer. Recorded in the ledger with its trigger.
4. **PageHeader adoption was already complete.** Seven components mount it (not the eight the
   dispatch claimed; `WelcomeView` uses `EmptyState` with `headingLevel="h1"` instead), and
   the five non-adopters are all deliberate. The filed gap closed during the 0.90.x work.

**CARRIED, do not lose: ten `admin-visual` baselines are red and owed a regeneration.** Rulings
1 and 2 move the header line on every screen mounting `PageHeader` (office shell, vocabulary,
editors, media library, media detail, each in both schemes). They were deliberately NOT
regenerated here. Baselines regenerate on CI, the canonical renderer, so the regen needs the
branch pushed plus an `e2e.yml` `update_snapshots` dispatch, and it batches to the pass end for
two reasons: one push at the boundary rather than mid-plan, and Task 15's probe graduations may
move pixels again, which would make an early regen wasted work. Until then `admin-visual` is
expected red and every OTHER showcase spec must stay green at every commit, the same discipline
Phase 1 ran between Tasks 1 and 6. The eyes-on read at regeneration is the main loop's, not an
implementer's.

## Phase 4: the norms manifest

### Task 13: Generator, provenance, freshness, and the CLI query

Dispatch with `model: opus` (band extraction and provenance logic are novel).

**Files:**
- Create: `scripts/generate-norms-manifest.mjs` (Playwright render of the toolkit and
  admin screens, computed-style extraction), `src/lib/audit/norms.ts` (load + query),
  manifest JSON emitted into `dist/` at package time
- Modify: `.github/workflows/` publish/CI job (generation + freshness check; NOT in the
  `check:*` hot path, per spec 6.4), `src/lib/audit/bin.ts` (`cairn-audit norms
  <selector-or-role>`)
- Test: fixtures for band derivation, provenance flags, and the query

**Interfaces:**
- Produces: manifest entries `{ role, property, band, observations, provenance:
  'ratified' | 'observed', flags }`; palette-dependent norms stored as relationships
  (role, mix formula, floor), never resolved Warm Stone values.

- [ ] **Step 1:** Extraction: control heights by role, padding-to-font-size ratios,
  border treatment vocabulary, corner radii, icon and chip metrics, computed styles per
  semantic role.
- [ ] **Step 2:** The three disciplines as tests: an entry matching an OPEN design
  question (the `--cairn-card-border` hairline, still on Geoff's queue) is excluded or
  flagged; a band under the minimum observation count is flagged single-observation; no
  resolved palette literal appears in a palette-dependent entry.
- [ ] **Step 3:** Freshness: the CI/publish job fails if the committed/emitted manifest
  does not match a fresh generation; a cut cannot ship stale.
- [ ] **Step 4:** Full gate; reference page for the norms query; commit.

## Phase 5: rendered mode and calibration

### Task 14: The rendered harness

**Files:** `src/lib/audit/rendered.ts`, `rules/rendered/` registry + fixtures.

**Interfaces:**
- Produces: `runRendered(config): AuditReport`; BASE_URL contract (clear error when not
  answering, NEVER starts a server); dynamic `import('playwright')` from the consumer's
  node_modules with a one-line install instruction on absence; both themes per page,
  always; the page list from config (defaulting to the core admin routes); the
  page+selector+reason JSON allowlist; interaction-state captures (an open menu, a
  focus-visible pass) available to rules.

- [x] Fixture-test the contract failures (no BASE_URL, no Playwright, allowlist match),
  implement, full gate, commit.

### Task 15: The six error-tier rendered rules, and the two probe graduations

**Files:** `rules/rendered/one-filled-action.ts`, `focus-renders.ts`,
`interactive-contrast.ts`, `touch-targets.ts`, `viewport-overflow.ts`,
`chip-ground-collision.ts`; `scripts/check-interactive-contrast.mjs` and
`scripts/check-touch-targets.mjs` become wrappers (same no-drift proof discipline as
Task 10, allowlist JSONs fold into the rendered allowlist).

Rule contracts (spec 6.3, exact): `one-filled-action` — at most one accent-filled control
per surface; surface = topmost open layer, landmarks partition within a layer; sanctioned
ink fills exempt. `focus-renders` — keyboard focus produces a real computed outline.
`interactive-contrast` — interactive text vs its own composited background ≥ 1.5.
`touch-targets` — 44px at 390, aware of `::before` inset hit-area expansion.
`viewport-overflow` — nothing wider than the viewport at 390 AND 320.
`chip-ground-collision` — chip background distinguishable from its row background.

- [x] Fixtures first (showcase pages are the live fixtures), implement, no-drift proof
  for the two graduations, own-tree clean run both themes, full gate, commit.

**AMENDED 2026-07-28, at the adversarial verify.** The six rules were built by six agents
and each was refuted by a second agent hunting fail-opens, with a demonstrated runnable
input required for every finding. All six were refuted, and the fold closed every
demonstrated defect at the substrate. Two lessons the plan should carry forward.

First, the shared cause. Three rules parsed computed colors with an `rgb()`-only regex
against a palette that is `oklch` end to end, so they could not fire against the shipped
admin at all: the `badge-ghost`-on-zebra collision named in `chip-ground-collision`'s own
header passed it with zero findings. Colors now resolve by painting them on a canvas in
the page (`resolveColors` in `rendered.ts`, arithmetic in `color.ts`), so the browser
answers the question. This is the Phase 2 lesson one layer down: the engine that exists
because regexes fail open had built three rules on a regex.

Second, the test shape. Every one of the six shipped green under a `page.evaluate` test
double, so no in-page function ever executed: two threw `ReferenceError` on every real
page and had never run against a browser. Unit doubles cannot prove a rendered rule. The
suite is now `src/tests/unit/audit/rules/rendered/browser-regressions.test.ts`, real
Chromium, every demonstrated input preserved as a fixture, plus a smoke case that
executes every REGISTERED rule against a real page so the next serialization mistake
fails there. Task 16's five advisory rules follow the same shape.

**The `--rendered` decision Task 14 deferred:** wired. `bin.ts` runs `runRendered` under
the flag, and the placeholder message is gone. `runRendered` already throws on every
shape of silent green, so a rendered run that cannot start exits 2 with the reason rather
than printing an empty, reassuring report.

### Task 16: The five advisory rendered rules

**Files:** `rules/rendered/relational-spacing.ts`, `screen-anatomy.ts`,
`weight-budget.ts`, `border-contrast.ts`, `norms-bands.ts` (consumes Task 13's
`norms.ts`).

Contracts per spec 6.3 verbatim, all `tier: 'advisory'`: relational-spacing (gap
monotonicity section > group > label, label-gap distance, equal sibling gaps);
screen-anatomy (one PageHeader/h1, primary action in header slot, desk routes exempt);
weight-budget (two weights per content REGION, not route); border-contrast (1.4.11's
3:1, report-only while the hairline question is open on Geoff's queue); norms-bands
(measurements inside manifest bands, single-observation bands reported as such).

- [x] Fixtures, implement, verify NONE can affect exit codes, full gate, commit.

#### Amendment: what the refutation round taught (2026-07-28)

All five rules were built, then each was adversarially refuted against real Chromium driving the
running showcase admin. Every one was REFUTED: 39 findings across the five. The build-then-refute
shape paid for itself, and four lessons generalize beyond Task 16.

1. **Every rule independently reinvented "is this visible" and "name this element", and every copy
   was wrong in a different way.** An `sr-only` element counted as a rendered heading in one rule
   and spent a typographic budget in another; an ancestor `opacity: 0` was invisible to one rule's
   visibility test and visible to its own ground arithmetic; four rules emitted unescaped Tailwind
   class signatures that `querySelectorAll` refuses. These are one substrate defect wearing five
   costumes. The fix is one set of measurement helpers installed on the page
   (`ensurePageHelpers`), which the serializer permits because a rule reaches them through a global
   rather than a closure. Any later rendered rule should reach for them first.

2. **"Advisory" is a claim about a whole system, not a field on a finding.** All five carried
   `tier: 'advisory'` on every finding and all five could still reach the exit code, by four
   distinct paths: an unparseable selector reading as a stale allowlist entry (error tier), a stale
   entry for a suppressed advisory finding gating on a class churn, a prose string used where a CSS
   selector belongs, and a rule reading a file inside `check` and taking the run to exit 2 on a
   throw. The exit criterion is now a proof over all four paths, not an assertion that
   `tier === 'advisory'`.

3. **A rule and the reference it measures against must see the same population.** `norms-bands`
   applied a stricter visibility filter than the manifest generator did, so it audited a subset of
   the elements its own bands were derived from, and on two routes audited zero of the roles it
   exists for. The band's own minimum came from an element the rule refused to look at. Whenever a
   rule checks live measurement against generated data, the candidacy predicate is part of the
   contract.

4. **A skip is a claim, and the honest ones are narrow.** The silent-skip count was the largest
   single category: a negative gap discarding a whole sibling group, an asymmetric grid gap
   dropping the box, a gradient fill dropping a candidate, an open dialog discarding `<main>`. Each
   was defended in a file header as abstention. The distinction that survives adjudication is
   between "this shape carries no claim" (a wrap boundary, a horizontal caption row the design
   system never speaks to), which is scope and belongs in the header, and "I could not read this"
   (an unresolvable fill, an empty region, a viewport that cannot be borrowed), which is a finding.

One refutation was REJECTED on measurement: a sub-pixel `border-width: 0.05px` was reported as a
false positive on the reasoning that it renders nothing, and Chromium computes it as `1px` and
paints it. The rejection is preserved as a test.

Every demonstrated input is a regression fixture in
`src/tests/unit/audit/rules/rendered/advisory-refutations.test.ts`, real Chromium throughout.

### Task 16b: The four rulings (ADDED 2026-07-28, Geoff)

Task 16's rendered baseline put four design questions in front of Geoff, and calibrating against
rules that are about to change would be waste, so the rulings land BEFORE Task 17 measures. All
four are ruled; none is open.

**Ruling 1, `touch-targets` enforces 24x24, not 44x44.** Spec 6.3 set 44x44, which is WCAG 2.2
AAA (2.5.5); the AA bar (2.5.8) is 24x24, and AA is the conformance level cairn can honestly
claim. The admin runs `btn-sm` 32px, `btn-xs` 24px, and 30px toolbar controls, so nearly all 138
findings clear and `btn-xs` sits exactly on the line. The rule keeps catching anything genuinely
too small. Watch the second-order effect: the graduated allowlist rows were written against the
44px bar, so some will go inert and the stale-allowlist detector will fire on them. Remove a row
that no longer names a real exception rather than leaving it to rot.

**Ruling 2, the `--cairn-card-border` hairline is RATIFIED and suppressed.** It measures 1.11:1
light and 1.43:1 dark against WCAG 1.4.11's 3:1, and it stays: the look is deliberate. Record it
as a ratified exception carrying its measurement and reason, so the 326 advisories stop drowning
the tier. The rule must still catch every OTHER boundary; a blanket disable is the wrong shape,
and the suppression has to be specific enough that a genuinely bad border elsewhere still reports.

**Ruling 3, the `chip-ground-collision` floor of 1.5 is RATIFIED.** Spec 6.3 named no number and a
builder borrowed it from `interactive-contrast`. The shared rationale is correct and is now on the
record: both rules test "not accidentally camouflaged", not a legibility standard, which is
`border-contrast`'s different job. The measured admin collisions sit at 1.01 to 1.12, far below it.
Write the reasoning into the rule's TSDoc and the reference page so the next agent does not
re-litigate it. The number is load-bearing: the dark regression turned on a measured 1.514.

**Ruling 4, `weight-budget`'s content region EXCLUDES chrome.** All 10 advisories are
toolbar, pagination, and eyebrow chrome that happens to live inside `<main>`. Two weights per
region stays the claim; the region definition was too wide. Narrowing it to actual body content
tests what the rule actually asserts and is expected to take the 10 toward zero. State the chrome
definition explicitly in the TSDoc; if narrowing cannot be done defensibly, say so rather than
inventing a heuristic.

- [x] Implement the four rulings, each with a real-Chromium fixture, adversarially verified;
      update the reference page and the deviations ledger; full gate; commit.

### Task 17: Calibration, the promotion evidence base

Main-loop orchestrated (it is measurement, not build).

- [ ] **Step 1:** Full audit (static + rendered, both themes) against cairn's showcase
  admin routes; record per-rule finding counts and classify each advisory finding true
  positive / false positive by eye.
- [ ] **Step 2:** Same against ASC's screens: reach dev/staging read-only via the Access
  service token (`ASC_ACCESS_CLIENT_ID`/`SECRET` in `~/.local/secrets`, CF-Access-Client
  headers; process in the `asc-cloudflare-access` memory). No ASC code changes; findings
  are data.
- [ ] **Step 3:** Write `docs/internal/2026-07-design-infrastructure-audit-calibration.md`:
  per-rule FP rates on both corpora, the promotion bar restated (spec 6.1), and each
  compositional rule's verdict (stays advisory / promotion candidate with evidence).
  Commit.

## Pass end

### Task 18: Docs, changelog, ledger, and the ritual

- [ ] Reference page `docs/reference/cairn-audit.md` (both modes, the config file, the
  suppression idiom with its counting contract, tiers, the norms query, the exception
  list); `check:reference` and `check:package` green.
- [ ] CHANGELOG under `## Unreleased`: the audit bin, the seven-role scale with ruled
  leading, the normalization (with a `Consumers must:` line ONLY if a consumer-visible
  contract changed; the admin's internal appearance is not one), the graduated gates, the
  manifest. Confirm the window carries the `<!-- release-size: minor -->` marker once.
- [ ] ROADMAP: mark shipped items, file anything Pass 2 surfaced into tiers; ledger and
  STATUS updated (STATUS points at Pass 3 planning as the next action); friction log
  entries for any docs-surfaced design friction.
- [ ] `code-simplifier` has run before each task's commit (standing rule); pass-end
  reviewer fan-out per `cairn-pass` (svelte-reviewer, cloudflare-workers-reviewer,
  daisyui-a11y-reviewer at minimum; web-auth-security-reviewer only if auth-adjacent
  files moved); post-mortem appended here; merge per `cairn-pass` ritual; no publish.

---

## Phase 2 post-mortem (2026-07-28)

Phase 2 is complete. `cairn-audit` exists as a packaged bin with nine static rules, a counted
suppression idiom, and two graduated repo gates. Eight commits, `dcb41778` through `2b63c282`.

### What was built

| Commit | Task | What landed |
| --- | --- | --- |
| `dcb41778` | 7 | Skeleton on the `cairn-doctor` bin shape, plus both resolution substrates |
| `6ae4ecb3` | 8 | Suppressions: reasons required, dead-directive detection, next-AST-node resolution |
| `8ff91c7c` | 9a | `no-uncompiled-class`, `type-scale`, `gap-scale`, `stock-default-hazards` |
| `eee3aca9` | 9b | `token-colors`, `grammar-boundary`, `focus-parity`, `motion-band`, `reduced-motion` |
| `d8ab3957` | 10 | `check:invisible-craft` and `check:admin-css-classes` become thin wrappers |
| `4eac48a0` | verify | Eleven demonstrated fail-open cases closed at the substrate |
| `dccd3c36` | 10 fix | Theme scan root restored behind a first-class palette-site rule |
| `ab25e6a8` | simplify | Three seam duplications collapsed, byte-identical audit output |
| `2b63c282` | watches | The two deliberate coverage gaps co-located as `WATCH:` notes |

The engine's own-tree run is the honest acceptance evidence: `1 error, 0 advisories, 5 suppressed`,
where the five are exactly the ratified `type-scale` exceptions and the one error is a real design
defect (below), not a rule bug.

### The adversarial verify earned its cost, and that is the finding

Three read-only lenses ran against the finished engine, each required to DEMONSTRATE a miss with a
runnable input rather than report a theory. They returned 13 findings, and several were live in
cairn's own tree rather than synthetic:

- Class strings built in a component's `<script>` were unreachable in principle, because the walk
  only visited `root.fragment`. That blind spot is the only reason `ftr-toggle`, a class styled
  nowhere, had been shipping green.
- Every rule prefilter anchored at the start of the RAW class token, so `text-sm` was audited while
  `2xl:text-sm` was not. The engine's own reason for existing is that regexes fail open, and it had
  reproduced the failure one layer up.
- `gap-scale` never consulted the sheet at all. It matched bracket text, so `mt-[.4375rem]` passed
  while byte-identical `mt-[0.4375rem]` failed.
- Standard CSS nesting hid an entire rule's declarations from all four CSS-family rules.
- A typo in a configured scan path produced a clean, exit-0 audit.

Eleven were fixed at the substrate with the reviewer's demonstrated input as the regression fixture.
Two were correctly refused by the implementer as ratified-contract changes rather than implementation
bugs, and are carried below.

**Method note worth keeping.** Requiring a demonstrated input is what made this cheap to act on: no
finding needed re-litigation, and the fold agent could treat all 13 as real. The lens split (markup
idioms / sheet plus suppressions / an independent audit of the own-tree-clean claim) mattered too.
The third lens is what caught that the graduated gate had quietly dropped scan roots, which neither
code-reading lens would have found.

### The graduation nearly shipped narrower than what it replaced

Task 10's constraint was that graduation is behavior-preserving and every finding delta must be a
documented regex false positive dying. Two violations surfaced, one closed and one carried:

1. **Closed.** The wrapper had dropped `examples/showcase/src/{chassis,routes,theme}`. The first two
   restored clean. `theme` needed a ruling, taken at the main loop: a theme's palette declaration
   site is where literal colors are DEFINED, so `token-colors` cannot meaningfully apply to it, and
   `cairn-admin.css` was already exempt for exactly that reason by construction. That exemption is
   now a first-class named concept (`AuditConfig.paletteCssFiles`) that both files flow through,
   rather than two separate special cases. The Carousel's 650ms crossfade migrated from the deleted
   budget JSON to a co-located directive, which is spec 6.1's stated replacement path, so the
   exception is counted rather than invisible.
2. **Carried.** The old gate walked `/\.(svelte|ts|css)$/` for achromatic colors. The new engine
   scans component `<style>` blocks and named `.css` files only. So `preview-doc.ts`'s `#fff`, a
   RATIFIED budget entry with a written reason, did not migrate to a directive: it stopped being
   seen. This is the orphaned-allowlist failure spec 6.1 warns about, arriving via graduation
   instead of rename. Closing it needs a substrate extension for `.ts`-embedded style strings.

### Carried into Phase 3 and Task 17

1. **`badge-ghost` on EditPage's Published pill (`EditPage.svelte:989`), for Geoff.** The tree
   patched around its own refuted alternative with a PINNED unlayered CSS rule (allowlisted in
   `custom-surface-budget.json`) to stop the pill vanishing in dark, while `StatusChip.svelte:15`
   records `badge-ghost` as refuted. A naive swap to `badge-outline` is wrong on its own (StatusChip
   demotes the outline's border or it reads as a button), it moves pixels, and it leaves the pinned
   rule dead, whose removal needs a custom-surface budget change. Design work, not a substrate fix.
2. **Suppression range semantics.** A directive covers the next construct AND its children, so one
   above a large wrapper silences that rule for everything inside. The only non-arbitrary alternative
   ("the next construct's own header") would make a directive above an `@media` or `{#if}` dead. Both
   satisfy cairn's five live exceptions. A consumer-visible semantics choice, so it wants Task 17's
   evidence rather than a guess. Suppressions are counted and printed, so the case is loud.
3. **`.ts`-embedded styles unaudited**, above. `WATCH:` note at `preview-doc.ts:99`.
4. **`stock-default-hazards` reads raw token values** while `type-scale` and `gap-scale` read
   `utilityBase()`, so `sm:badge-ghost` slips past. Routing it through WIDENS the rule and may
   surface real findings, which makes it a rule-design call. `WATCH:` note at the rule.

### Process notes

- **Two executors nearly raced one worktree.** A `code-simplifier` dispatch went 6 hours without
  writing to its transcript; the main loop read that as death and re-dispatched. The second agent
  detected the contention, made zero edits, and stood down, which is the doctrine's verify-not-
  duplicate recovery working. The diagnostic was the defect: transcript mtime cannot distinguish a
  dead agent from one inside a long gate run. The signal that would have been correct is whether a
  process still holds the worktree. Banked in the runaway-guard memory.
- **The runaway guard false-alarmed twice** on healthy work because it was armed at journal-idle
  25min plus 900KB, against defaults the guard memory already warned about. Measured cairn numbers
  are now in that memory: an implementer clearing the full gate runs 18 to 30 minutes and produces a
  0.4 to 1.1MB transcript, and a serial workflow's journal is silent for each task's whole duration.
- **No implementer could run `code-simplifier`.** `cairn-implementer`'s toolset has no agent
  dispatch, so all five did manual passes and the real agent ran once at the end, from the main loop.
  Worth knowing when planning a pass: the simplifier is a main-loop step, not a per-task one.

---

## Phase 5 and whole-pass post-mortem (2026-07-28)

Phase 5 is complete, and with it the pass. `cairn-audit` now has a rendered mode: eleven rules
driving real Chromium against a running admin, six of them gating. Task 17 measured the whole engine
against two corpora and Task 18 folded a review gate over the result.

The headline is not the eleven rules. It is that four separate adversarial passes, run against the
same four rules over two tasks, each found real defects, and a fifth pass at the very end found six
more in the same code. An enforcement engine is unusually good at looking correct.

### What was built

| Commit | Task | What landed |
| --- | --- | --- |
| `87c2e0dc` | 14 | The rendered harness: page visits, themes, interaction states, the allowlist |
| `001e817b` | 14 | Baseline regeneration for the harness's own admin changes |
| `c14c2f03` | 15 | The six error-tier rules, and the two probe graduations |
| `4cacfd5f` | 16 | The five advisory rules |
| `ba7f401d` | 16 | Dark-theme detection restored in `chip-ground-collision` |
| `80041424` | 16b | Geoff's four rulings recorded before calibration, not after |
| `40cb6d77` | 16b | The four rulings implemented, plus counted rendered suppression |
| `37bd1f43` | 16b | Plan tick |
| uncommitted | 17 | The calibration doc, both corpora measured and classified |
| uncommitted | 18 | Docs, changelog, roadmap, `norms.yml`, and the review gate's fixes |

### What the calibration measured, and what it could not reach

Corpus A is cairn's own admin: 6 routes times 2 themes. Corpus B is ASC, a live consumer site at
HEAD `55578d78`, 10 pages times 2 themes, running the worktree engine by absolute path so the
measurement was of this pass and not of published `0.90.1`.

| Corpus | Tier | Findings | True positive | False positive | FP rate |
| --- | --- | ---: | ---: | ---: | ---: |
| A (cairn) | error | 20 | 20 | 0 | 0% |
| A (cairn) | advisory | 214 | 172 | 42 | 19.6% |
| B (ASC) | error | 39 | 36 | 3 | 7.7% |
| B (ASC) | advisory | 283 | 2 | 281 | 99.3% |

The 19.6% against 99.3% is the finding, and it is not flattering. The five compositional rules are
roughly calibrated against the codebase their own authors wrote and close to useless against the
first outside codebase they met. All five stay advisory; the evidence for promoting any of them is
not close. The suppression numbers say the same thing from the other side: corpus A suppresses 130
findings, corpus B suppresses 2, and both of those 2 are on `/admin/login`, which is cairn's own
markup. No consumer-authored element is forgiven by any exemption the engine ships, because
`border-contrast`'s exemption keys on the literal string `--cairn-card-border`.

**What corpus B could not reach is the part that limits the evidence.** ASC's entire authenticated
admin returns 303 to `/admin/login`, including its 31 custom admin routes under
`src/routes/admin/club/**`. That is the exact corpus this task wanted: an extending developer's own
markup rendering inside `CairnAdminShell`, drawer present, theme root mounted, gap tokens in scope.
It is where the compositional rules are designed to apply and it is where they were never measured.
ASC ships no dev-auth backend by design, and reaching it would have meant a D1 write into a live
site or modifying the thing being measured. That gap is itself a finding: **a consumer cannot run
`cairn-audit --rendered` against their own admin today** without hand-seeding a session row, and if
they try, the redirect defect hands them a clean-looking report of the login screen measured six
times.

Nine of corpus B's ten pages are ASC's public marketing pages, so an objection that the admin rules
were pointed at the wrong surface is fair on its face. It does not survive: `rendered.pages` is a
documented consumer-owned config surface, and none of these rules carries any scope predicate. They
do not decline, they assert, and they assert citing an internal cairn document the consumer has
never seen.

### The method lesson: eleven of eleven rules were refuted on first build

Every rendered rule this pass shipped failed an adversarial pass before it was correct.

- **Task 15**, six error-tier rules: refuted, with demonstrated inputs. `touch-targets`'s
  `::before` expansion arithmetic was exactly backwards, inflating a 42px tab past the floor while
  flagging the `.nav-caret` pattern the rule exists to understand. `findSmallTouchTargets`
  referenced a module-scope constant inside a serialized page function and threw `ReferenceError` on
  every real page, so it had never once executed against a browser while its tests passed.
- **Task 16**, five advisory rules: refuted. `chip-ground-collision`'s color parser matched `rgb()`
  only, against a built sheet containing zero `rgb()` background declarations and 82 oklch token
  references, so the rule could not fire against the shipped admin at all.
- **Task 16b**, the four rulings: four rules changed, four adversarial refutations run, 23
  demonstrated findings returned, and **all four rules were refuted on the first build**. The
  `resolveGround` canvas default manufactured a ratio of 1.514 against a 1.5 floor, one hundredth
  over the line, and silently dropped two real dark-theme collisions while every other gate stayed
  green.
- **Task 18**, this gate: 27 findings from a fresh-context review of the finished engine, 2 of them
  blocking. Six were confirmed code defects in the same four rules that had already survived three
  adversarial passes.

The pattern to carry: **a rendered rule's tests prove the rule agrees with itself.** Every one of
these defects sat behind a green suite. What caught them was a reader required to produce a runnable
input, or a measurement taken against real pixels. Budget for the refutation pass as part of building
a rule, not as a review afterwards, and require the demonstrated input; not one of the 23 findings
needed re-litigation because each arrived with its own proof.

The counter-example is worth keeping too. This gate rejected one finding on measurement:
`resolveGround` was reported as fail-open on a `null` layer color, and the proposed fix breaks two
pinned fixtures in `color.test.ts` that use `null` to mean "this layer painted nothing", one of
which exists to hold the dark-canvas defect closed. The underlying concern is real, since
`resolveColors` overloads `null` for both an empty string and a color the browser refused, but the
repair belongs at that boundary and not in `resolveGround`. Recorded at the code and in ROADMAP.

### The defect a count delta caught, which no gate could have

`border-contrast`'s derivation probe substitutes a sentinel for `--cairn-card-border` and reads back
which border colors follow. On `/admin/media` it reported four findings against a button whose
border demonstrably was painted through the token. The rule was blind to a CSS transition: daisyUI's
`.btn` transitions `border-color` over 0.2s, so one synchronous tick after the substitution
`getComputedStyle` still reports the old color and the sentinel never appears. The tell was a
serialization flip from `oklch(0.93 0.008 75)` to `oklab(0.93 0.00207 0.00773)`, the same color
re-expressed in the space Chromium interpolates in.

Nothing in the gate could have found this. The suite was green, `check` was 0/0, and the rule's own
fixtures passed, because every fixture set a border without a transition. What found it was a human
question about a single finding's plausibility, and what confirmed the fix was the count moving:
228 to 214 advisories, 116 to 130 suppressed, errors unchanged at 20 and byte-identical. Exactly 14
findings moved, all `border-contrast`, all on `<button>` elements painted in the ratified token. Four
are the button the adjudication was about; the other ten are the same latent defect on
`CairnAdminShell`'s command-palette trigger, on 5 routes times 2 themes, which nobody went looking
for.

A second defect fell out of the fix and the existing restore fixture did catch it: restoring
`transition-property` before the color had settled left the element animating 0.2s back from the
sentinel, so the audit was repainting the page it was about to measure.

This gate re-derived the 14-finding delta independently rather than accepting it, by disabling only
the transition fix, repackaging, and re-running: the count returned to exactly 20 errors, 228
advisories, 116 suppressed. That also proves Task 18's own six code fixes move no count on this
corpus, which was the thing worth knowing.

### Two source files were invisible to grep, and every grep-based gate reported success

`src/lib/audit/norms.ts` and `src/lib/content/references.ts` each carried a raw NUL byte, used as a
composite-key separator. Git, `grep`, and `file` all classify such a file as binary. Every
grep-based gate over `src/lib` therefore skipped both files silently while reporting success, and
`git show --stat` rendered `references.ts` as `Bin 8035 -> 8045 bytes` rather than as a diff.

Both were rewritten to a unicode escape in `40cb6d77`, and a scan of HEAD confirms zero control
bytes outside tab, newline, and carriage return anywhere in `src/lib`. Nothing stops a third. The
trigger is machine-detectable, so ROADMAP carries it as a `check:*` script rather than a note, per
this repo's own watch-item doctrine.

The general shape is the one worth remembering: **a gate that scans files can be defeated by a file
it declines to read, and it reports that as a pass.** This is the same failure family as the
orphaned-allowlist entry and the typo'd scan path, both of which this pass also found.

### The blocking finding: the engine misstated a standard

The highest-severity item this gate folded was not a crash. Three source files, the reference page,
and the CHANGELOG all carried the sentence that legibility "is `border-contrast`'s different job,
measured against WCAG 1.4.11's 3:1 non-text floor". That is false twice. SC 1.4.11 is Non-text
Contrast and cannot be a legibility standard under any reading; text legibility is SC 1.4.3 at
4.5:1, which **no rule in this engine measures**. And `border-contrast` measures a border stroke
against the surfaces it separates, so it is not the legibility check for anything.

The consequence is specific. `interactive-contrast` sits exactly where a reader expects text
contrast, it measures a control's computed `color` against its ground, it gates at 1.5, and the
paragraph beside it said the real bar was covered elsewhere. The sentence told a consumer a gap was
covered.

Related and equally wrong in the other direction: SC 1.4.11 was asserted over every rendered border,
including decorative ones. The criterion reaches user interface components and graphical objects, so
a card hairline or a table row divider is neither. That framing had already propagated into shipped
data: `norms.ts`'s provenance string, baked into `norms-manifest.json` and printed by
`cairn-audit norms card` on every consumer install, recorded a WCAG failure about a boundary the
criterion never reached. The same over-claim ran through `touch-targets`, which is presented as SC
2.5.8 while enforcing a strict superset of it; the calibration's own numbers show 8 of its 10 errors
on cairn's admin would clear the spacing exception alone.

All of it is corrected: the floors are now stated as house bars that borrow a WCAG number, each
finding message says so, and the reference page carries a coverage-boundary section naming what the
engine does not check (1.4.3, 1.4.1, 2.4.11, 2.4.13) and pointing at the tools that do.

**The lesson is proportional to the blast radius.** An engine that enforces is read as authoritative,
and a citation inside it is not decoration. It ships to two production sites and prints into every
consumer's console. Cite a standard only where the rule implements it, and where a rule borrows a
number, say that it borrowed it.

### Carried forward

1. **`norms.yml` must be staged with `publish.yml` in the same commit.** Task 18 extracted the norms
   job into a reusable workflow and pointed `publish.yml` at it. If `publish.yml` lands without
   `norms.yml`, the release workflow fails to load at the moment `gh release create` fires the OIDC
   publish, which by this repo's release doctrine is the worst possible place: the number is already
   cut and immutable. Rehearse once with `gh workflow run norms.yml --ref <branch>`.
2. **`check:version` cannot see the `## Unreleased` window at all**, so it reports `OK (patch)` and
   the `<!-- release-size: minor -->` marker is inert until the cut renames the heading. Verified
   here by simulating the cut against the exported `checkVersion`: with the marker `{ok: true, bump:
   'minor'}`, without it the miss. The marker is correct and correctly placed. The gate that would
   prove it does not exist yet, and the friction log carries the tightening.
3. **Eight rule repairs**, confirmed by this gate and deliberately not taken, are in ROADMAP with
   their costs: `touch-targets`'s single viewport and tag-shaped target net, the two error-tier rules
   disagreeing about what a control is and about whether to collapse findings,
   `chip-ground-collision`'s over-wide painter set, `border-contrast`'s literal ratified floor and
   its per-element style recalcs, `weight-budget`'s PageHeader action-slot hole, and the
   `resolveColors` null overload. Each is documented at the code, so a reader meets it in context.
4. **20 error-tier findings against cairn's own admin**, all true positives, are in ROADMAP for the
   next admin design pass. A gate its own author's tree fails is worth less than the runs it passes.
   The sequencing hazard is recorded with them: fixing `/admin/login`'s missing `<main>` immediately
   creates two `screen-anatomy` false positives, because that rule's only working exemption today is
   an accidental `if (!mainEl) return null`.
5. **`badge-ghost` at `EditPage.svelte:989`** is still open for Geoff, carried from Phase 2. The
   engine and `StatusChip.svelte:15` agree it is refuted; it is a design call.

### Process notes

- **The pass shipped no release, correctly.** The window holds a new bin, eleven rendered rules, a
  norms manifest, and a closed type scale, which is minor-sized, and the marker records that. Nothing
  here is consumer-blocking, so it holds unpublished.
- **The gate stage found more than the review fan-out that preceded it**, which suggests the
  fan-out's value depends on running against a finished artifact rather than per-task. Six confirmed
  code defects survived three prior adversarial passes and a full green suite.
- **Two corpora is the minimum honest number, and this pass nearly shipped with one.** Every verdict
  that matters in the calibration comes from the gap between them. The engine measured against its
  own tree alone would have read as calibrated at 19.6% and been shipped as such.
