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

- [ ] **Step 1:** Trigger `e2e.yml` `workflow_dispatch` with `update_snapshots` on `main`.
- [ ] **Step 2:** Read each regenerated image against the `0.90.x` design intent (STATUS
  names the changes: ExpandableRow graduation, ListToolbar menu facet + flex-row
  recomposition + select sizing, StatusChip hairline border, OfficeList fixes). This
  blesses shipped work, so the read is a real design read, not a diff glance.
- [ ] **Step 3:** Land the images on `main`, confirm the `e2e` workflow is green.
- [ ] **Step 4:** Update STATUS's red-CI paragraph to closed; commit
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

- [ ] **Step 1: Measure before defining.** body takes `text-sm`'s 20px and title takes
  `text-2xl`'s 32px (ruled, spec section 13). For subtitle, meta, label, and chip, measure
  the dominant COMPUTED line-height at current call sites in the rendered admin; record
  the measurement table in the task commit message. A tie or a sub-two-site sample defers
  to the Tailwind named step nearest the role's size.
- [ ] **Step 2: Failing tests first.** Extend `grammar-tokens.test.ts`: (a) every
  `GRAMMAR_TOKENS` name defined exactly once in the built sheet, outside theme blocks;
  (b) NEW, the reverse direction owed from the Pass 1 post-mortem: every
  `--cairn-type-*`/`--cairn-gap-*` custom property defined in the built sheet appears in
  `GRAMMAR_TOKENS`; (c) each `type-*` utility's compiled declarations set both
  `font-size` and a `line-height` that references `--tw-leading` (so `leading-*`
  composition survives).
- [ ] **Step 3:** Define the tokens and utility changes, run to green, full gate.
- [ ] **Step 4: Capture the drift yardstick.** Run the showcase `admin-visual` suite
  locally with snapshot updates into an UNCOMMITTED local reference directory (never the
  committed baselines). Tasks 3–5 compare against this set; it dies at Task 6's real regen.
- [ ] **Step 5: Commit** (`feat(admin): type roles carry ruled leading`).

### Task 2: The heading-role probe (Geoff's pick)

Main-loop work plus one async Geoff read; run it EARLY so the pick lands before Task 5
needs it. Per design-iteration-economics: this is a probe, reviewed on Geoff's own time
while Tasks 3, 4, 7, 8 proceed.

- [ ] **Step 1:** From the running showcase, capture side-by-side crops of the two live
  candidate recipes at real call sites: 16px semibold (`RenameDialog`/`EntryPicker`/
  `EditPage` panel headings) and 18px display-bold (`CairnMediaLibrary` dialog headings),
  light and dark, plus each recipe mocked into the OTHER family's context.
- [ ] **Step 2:** Deliver the labeled crops to Geoff with a one-line recommendation and
  the consequence of each pick (which family visually changes). No build waits on the
  reply except Task 5.
- [ ] **Step 3:** Record the pick in the deviations ledger's rulings section and the spec
  section 13 (size, weight, font family, leading); commit
  (`docs(spec): ratify the heading-role recipe`).

### Task 3: Named-step migration (text-sm, text-2xl)

**Files:**
- Modify: `src/lib/components/*.svelte`, `src/lib/admin-toolkit/*.svelte` (127 `text-sm`
  sites → `type-body`; 2 `text-2xl` sites → `type-title`)

Deterministic substitution per the Pass 1 method note: a pure string replacement verified
by grep, run in the main loop or one dispatch, never a fan-out. With Task 1's ruled
leading equal to the named steps' own, these swaps are pixel-identical.

- [ ] **Step 1:** Substitute; verify by grep that zero `text-sm`/`text-2xl` class tokens
  remain in admin markup (word-boundary matching, the ledger's counting lesson).
- [ ] **Step 2:** Compare a fresh local render against Task 1's captured reference: these
  two swaps must move NOTHING relative to it (Task 1's leading drift is already inside
  the reference; any new delta means the substitution is wrong).
- [ ] **Step 3:** Full gate, commit (`refactor(admin): named type steps onto their roles`).

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

- [ ] **Step 1:** Produce the per-site decision table (file:line, old class, chosen role,
  relationship named) BEFORE editing; main loop reviews the table, then the edits apply.
- [ ] **Step 2:** Grep-zero: no `text-xs` or `text-[0.75rem]` tokens remain in admin markup.
- [ ] **Step 3:** Full gate (`admin-visual` expected red from here until Task 6; every
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

- [ ] **Step 1:** Define the heading token/utility per the pick, extending the Task 1
  tests (they enumerate from `GRAMMAR_TOKENS`, so the new role rides the same assertions).
- [ ] **Step 2:** Migrate both heading families onto `type-heading`; the losing family
  changes appearance by ruling. The 17px and 18px one-offs (`CairnMediaLibrary:1769`,
  `EditPage:1842`) resolve to `type-heading` or `type-subtitle` by the same relationship
  judgment, recorded in the decision table.
- [ ] **Step 3:** The slips: `ComponentInsertDialog:368` (11.2px) → `type-label`;
  `CairnMediaLibrary:1982` (9.6px) → `type-chip`.
- [ ] **Step 4:** Exceptions: the three wordmark sites and the EditPage document title
  keep their values and gain the suppression directive in the Task 8 syntax
  (`cairn-audit-disable-next-line type-scale -- <reason>`), reasons naming the K4 keming
  fix and the editor-canvas ruling. Decide the stat numbers (resolve to `type-heading` or
  ratify as a fourth exception) by eye against the rendered stats strip; record either way
  in the ledger.
- [ ] **Step 5:** Grep-zero for `text-base`, `text-lg`, `text-xl`, `text-3xl` as
  font-size tokens in admin markup (word-boundary; `text-base-content` etc. are color
  utilities and stay). Full gate; commit (`feat(admin): the heading role lands; type scale complete`).

### Task 6: One regeneration, the eyes-on read, and the docs that must not lie

- [ ] **Step 1:** Regenerate ALL `admin-visual` baselines once via the CI canonical
  renderer (`e2e.yml` `update_snapshots` against the worktree branch).
- [ ] **Step 2:** Main-loop eyes-on read of every regenerated image against intent;
  before/after strips of the most-changed screens (media library, EditPage, dialogs) go
  to Geoff, batched with anything else owed him at that point.
- [ ] **Step 3:** Retire the resolved ledger entries (type sections collapse to a
  ratified-history note; spacing sections stay open for Pass 3); update
  `docs/reference/admin-grammar-tokens.md` (seven roles, leading column, the exception
  list, the `--tw-leading` composition note) and `docs/internal/admin-design-system.md`
  recipes (the Pass 1 post-mortem's stale-recipe lesson: no recipe may still prescribe a
  migrated literal or the losing heading recipe).
- [ ] **Step 4:** Full gate including the now-green `admin-visual` suite; commit
  (`test(e2e): regenerate baselines for the ruled normalization`).

## Phase 2: cairn-audit, static mode

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

- [ ] **Step 1: Fixture tests first.** `markup.ts` must extract class tokens from the
  three idioms the adversarial review proved regexes fail open on: single-quoted
  attributes, array classes, object classes (Svelte 5), plus template-literal and
  `class:` directives; and must NOT match prose ("the white background" fixture).
  `sheet.ts` resolves a class token to its declarations from a compiled CSS string.
- [ ] **Step 2:** Implement; config loading (consumer file: static scan scope defaulting
  to admin routes plus imported components, rendered page list, rendered allowlist);
  wire `bin.ts` with `--rendered` reserved (clear "not yet available" until Task 15).
- [ ] **Step 3:** `npm run check:package` green (publint/attw see the new bin); a smoke
  run of `npx cairn-audit` against cairn's own tree executes with zero rules registered.
- [ ] **Step 4:** Full gate; commit (`feat(audit): cairn-audit skeleton and substrates`).

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

- [ ] **Step 1:** Fixture tests: suppressed finding drops from exit-code math but counts;
  missing reason errors; dead directive errors; rule-id mismatch does not suppress.
- [ ] **Step 2:** Implement into `run.ts`'s finding pipeline; full gate; commit
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

- [ ] **Step 1:** Fixtures first, then implementations.
- [ ] **Step 2:** Run against cairn's own tree: exactly the ratified-exception
  suppressions fire, nothing else. Any other finding is either a real miss from Phase 1
  (fix it) or a rule false positive (fix the rule); record which, per finding.
- [ ] **Step 3:** Full gate; commit (`feat(audit): the four markup-family static rules`).

### Task 9b: Static rules, CSS family

**Files:** `rules/static/token-colors.ts`, `grammar-boundary.ts`, `focus-parity.ts`,
`motion-band.ts`, `reduced-motion.ts` + fixture trios.

Rule contracts (spec 6.2, exact): `token-colors` — no raw hex/rgb/named colors, no pure
achromatics, neutrals derive from the palette's neutral role. `grammar-boundary` —
consumer CSS never redeclares a `GRAMMAR_TOKENS` name. `focus-parity` — every `:hover`
selector carries a matching `:focus-visible`. `motion-band` — durations 150–250ms, no
`transition: all`. `reduced-motion` — every transition-bearing selector covered by a
`prefers-reduced-motion` guard.

- [ ] **Step 1:** Fixtures first, then implementations; scope is component `<style>`
  blocks plus consumer CSS files named by the config scan scope.
- [ ] **Step 2:** Same own-tree discipline as Task 9a Step 2.
- [ ] **Step 3:** Full gate; commit (`feat(audit): the five CSS-family static rules`).

### Task 10: Graduate the two static repo gates

**Files:**
- Modify: `scripts/check-invisible-craft.mjs`, `scripts/check-admin-css-classes.mjs`
  (become thin wrappers invoking the packaged engine)
- Delete (after the proof): their regex logic; fold `invisible-craft-budget.json` and
  `admin-css-classes-allowlist.json` entries into co-located suppression directives or
  rule config, whichever each entry actually is.

- [ ] **Step 1: No-drift proof.** Run old and new on the same tree; diff the findings.
  Every delta must be a documented regex false positive/negative dying, listed in the
  commit message.
- [ ] **Step 2:** Wrappers land; `npm run check:invisible-craft` and
  `check:admin-css-classes` keep their names and their places in CI.
- [ ] **Step 3:** Full gate; commit (`refactor(gates): static gates graduate into cairn-audit`).

## Phase 3: primitives gap-closure

Source material for both tasks: aksailingclub-org's `docs/design-benchmark/decisions.md`,
the `docs/2026-07-2*-harvest-findings.md` files (findings 9 and 10 name the card-shell
and empty-notice evidence), and cairn's `docs/internal/admin-design-system.md`.

### Task 11: card-shell and the in-card empty-notice recipe

**Files:** `src/lib/admin-toolkit/` (new `CardShell.svelte` or the leanest equivalent the
evidence supports), the four sites carrying the verbatim shell string, the three
empty-notice reinventions; reference page for any new export.

- [ ] **Step 1:** Locate the four verbatim shell sites and three empty-notice sites by
  grep; extract the leanest shared form (a component only if the markup genuinely
  repeats; a documented recipe plus class contract if a component would be ceremony).
- [ ] **Step 2:** Migrate the sites; `admin-visual` must not move (this phase is
  post-regen; extraction is pixel-identical by definition).
- [ ] **Step 3:** Full gate, reference page if a new export shipped; commit.

### Task 12: form-row register, PageHeader adoption, destination-picker

**Files:** per the evidence trail above; plus `PageHeader.svelte:60` (the `meta`-prop
size collision from the ledger's structural findings).

- [ ] **Step 1:** Write the form-row/label register contract from ASC's two-level label
  ruling and the ClassForm label-wrap debt; encode it as toolkit structure or a
  documented recipe, whichever is leanest.
- [ ] **Step 2:** PageHeader adoption sweep (the filed gap: screens still hand-rolling
  header anatomy adopt it) and the `meta`-prop ruling: EITHER the header's secondary line
  is body-sized on purpose (rename the prop's documented register) or it joins
  `type-meta`; decide by eye against rendered screens, record in the ledger.
- [ ] **Step 3:** Destination-picker: extract the pattern per its harvest finding, same
  leanest-form test as Task 11.
- [ ] **Step 4:** Full gate; snapshots regenerate ONLY if Step 2's ruling moves the
  header line, folded into the same eyes-on discipline as Task 6; commit.

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

- [ ] Fixture-test the contract failures (no BASE_URL, no Playwright, allowlist match),
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

- [ ] Fixtures first (showcase pages are the live fixtures), implement, no-drift proof
  for the two graduations, own-tree clean run both themes, full gate, commit.

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

- [ ] Fixtures, implement, verify NONE can affect exit codes, full gate, commit.

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
