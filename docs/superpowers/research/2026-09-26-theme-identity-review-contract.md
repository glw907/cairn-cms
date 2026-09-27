# Theme identity spec review: contract and criteria lens

Target: `docs/superpowers/specs/2026-09-26-theme-identity-design.md` at `2776dfa3`.
Reviewer: fresh context, contract-and-criteria lens. Taste is not re-litigated.

Verdict: the spec is buildable. The theme-variable decisions are exact values and will not
drift. The weak points are criteria that name no fixture that exists in the tree (the switch,
the info alert), one recipe that matches no live markup (the page heading), an unspecified
alert variant that the tree does use (success), and a sweep with a start count but no end
condition. Counts: 0 blockers, 5 major, 6 minor.

## Major

### M1. The page-heading recipe matches zero live sites

- **Location:** spec:154-157.
- **Defect:** The spec changes `text-2xl font-bold font-[family-name:var(--font-display)]`
  and scopes the change to "the `text-2xl` display page headings." No admin `.svelte` file
  carries `text-2xl`. The live page heading is
  `src/lib/admin-toolkit/PageHeader.svelte:59`,
  `page-h1 m-0 type-title font-bold font-[family-name:var(--font-display)]`. The spec's recipe
  is the design-system doc's stale text (`admin-design-system.md:264`), not the code. An
  implementer who greps the recipe finds nothing, and the criterion passes vacuously. A second
  display-bold heading, the document title input at `EditPage.svelte:1861` (1.875rem, bold,
  display face), falls under neither rule.
- **Fold:** Name the site: "`PageHeader.svelte`'s `h1` (`type-title font-bold`) takes
  `font-[550]`." Correct the design-system recipe to `type-title` in the same pass.
  Acceptance: grep `PageHeader.svelte` for `font-[550]` and confirm no `type-title font-bold`
  remains under `src/lib`.
- **OWNER FORK (the EditPage document title):**
  - (a) Keep the title at 700 and add it to the felt-refinement audit's named inputs, beside
    the dialog headings.
  - (b) Move it to 550 with the page heading.

  Recommendation: (a). The round-4 verdict covered page headings, the title is content the
  editor types rather than chrome, and (a) matches how the spec already treats the dialog
  headings.

### M2. Success alerts are used in the tree and have no values

- **Location:** spec:129-137.
- **Defect:** The table specifies error, warning, and info. It then says "a success alert
  follows the same construction if one exists in the tree." Five exist:
  `NavTree.svelte:138`, `CairnTidySettings.svelte:351`, `EditPage.svelte:1680`,
  `CairnMediaLibrary.svelte:645`, `ConceptList.svelte:312`. `alert-info` has zero uses. So
  the table specifies the variant nobody renders and leaves the most-seen variant for the
  implementer to invent. The ink, the percentages, and the dark values are all unset. The
  contrast proof at spec:203 ("every alert ink") has no success pair to measure.
- **Fold:** Add a success row. The construction rule makes most of it mechanical: 7% panel,
  30% edge, dark 12%. The ink is the one open value. `--color-positive-ink` already exists
  (`scripts/build/admin-css.input.css:110`, fallback `oklch(48% 0.12 150)`), which makes it
  the obvious light ink. Pair it with a dark ink at the same lightness pattern as the other
  rows (about 82%), and add both pairs to the contrast list. Since the owner saw the other
  three in the probe, flag the success row for the before-and-after read. It does not need
  its own design round.

### M3. The switch and the info alert have no in-tree fixture

- **Location:** spec:142-150, 203-205, 209-212.
- **Defect:** No admin markup or showcase admin route uses DaisyUI's `toggle`. The only
  switch the owner saw is the probe's "Notify" switch, and `alert-info` has no uses either.
  Three proofs therefore have nothing to run against: the measured switch contrast, the CI
  baselines (`admin-visual` cannot catch a switch regression), and the `visual-verifier` read
  of "the built showcase against `switch-1.html`." As written, the switch criteria pass
  vacuously on the built admin.
- **Fold:** Pick one committed fixture that renders every theme-only component the admin
  does not use itself: a checked and unchecked `toggle`, `alert-info`, `alert-success`, a bare
  `btn`, a `join` with an active segment, and `btn-soft btn-primary`. The fixture could be a
  showcase custom admin route or a section of an existing test route. Include it in
  `admin-visual` in both themes, and run the contrast measurements against it. This is also
  the proof of the spec's headline claim (spec:17-19) that a developer's plain-DaisyUI screen
  inherits the identity. Without it, nothing in the tree exercises that claim.

### M4. The ratified reference is not durable for a fresh-context verifier

- **Location:** spec:5-7, 211-212.
- **Defect:** The `visual-verifier` grades against `final-1.html` and `switch-1.html`, which
  live under `.superpowers/brainstorm/1233016-1790462579/`. That path is gitignored
  (`.gitignore:12`). The spec also says the alert values "are the probe's" (spec:135). A
  verifier dispatched from a later session or another worktree may not have the folder, and
  "reproducible from this spec" makes the spec its own reference, which is circular for a
  fidelity gate. The workstation visual-fidelity rule is reference capture before any plan.
- **Fold:** Before the plan is approved, capture the two probe pages to PNG in light and
  dark, at 1440 and 390. Commit the captures beside the arc log (for example
  `docs/internal/record/2026-09-26-theme-identity-probe/`) and point spec:6 and spec:212 at
  them. Keep the HTML optional.

### M5. The markup sweep has a start count and no end condition

- **Location:** spec:165-179, 75-82.
- **Defect:** The sweep records counts at spec time (5 `shadow-none`, 7 `border-transparent`,
  4 ink-hover brackets, about 80 fixed radii). It never states what must be true afterward.
  "The plan re-counts before the sweep" is a start condition. A partial sweep passes every
  named gate: `npm run check`, `check:admin-css-classes`, and the baselines all stay green
  with a leftover `rounded-lg` or ink recipe. The new load-bearing rule at spec:231-232
  ("never a per-element patch") also has no tripwire. By the repo's own watch-item rule, a
  code condition becomes a gate.
- **Fold:** State the post-condition as a command with an expected result. For example, run
  over `src/lib/components` and `src/lib/admin-toolkit` `.svelte` files:
  - zero matches for `hover:bg-\[var\(--cairn-ink-hover\)\]` and `bg-primary/10 text-primary shadow-none`;
  - zero matches for `\brounded(-sm|-md|-lg|-xl|-2xl|-\[[^]]*\])?\b` outside a named allowlist
    (the true circles plus the structural join zeros, see m3);
  - zero `border-radius:` literals in component `<style>` blocks other than `var(--radius-*)`
    or a `calc` over one.

  Promoting that grep to a standing `check:*` gate, or to a cairn-audit static rule like
  `no-uncompiled-class`, is cheap. It is the leanest form of the new load-bearing rule, so
  take it now rather than filing it.

## Minor

### m1. The starter theme has three copies, and one of them is generated

- **Location:** spec:28-29, 183-184.
- **Defect:** `templates/waymark/src/theme/theme.css` is emitted wholesale from the showcase
  by `emit:template`, and `check:template` fails on drift. A third copy,
  `packages/create-cairn-site/template/src/theme/theme.css`, is an untracked bake output.
  "Both copies change identically" invites a hand edit of the emitted file, and "the plan
  checks that" names no command.
- **Fold:** Rewrite as: "Edit `examples/showcase/src/theme/theme.css`, then run
  `npm run emit:template`. `npm run check:template` is the byte-identity gate."

### m2. The "nothing reaches zero" rule collides with structural join zeros

- **Location:** spec:91-92.
- **Defect:** `EditorToolbar.svelte:271,290,291,440` (`rounded-l-none`, `rounded-r-none`)
  and `CairnMediaLibrary.svelte:974` (`rounded-t-none`) zero one edge so two controls fuse.
  A literal reading of "nothing reaches zero" invites removing them, which would break the
  fused edges.
- **Fold:** Add: "Edge-zeroing on a fused or joined edge is structural and stays."

### m3. The bare-`btn` selector is under-specified

- **Location:** spec:109-111.
- **Defect:** "A `btn` with no color or style modifier" leaves open `btn-link`,
  `btn-outline`, `btn-circle`, `btn-square`, `btn-active`, `btn-disabled`, and a `join-item`
  segment. The join segments in `ListToolbar.svelte:289` and `Pagination.svelte:102` are
  bare `btn`s, so they become hairlines. Their active state also has to reconcile with the
  existing `.btn-active` dark-mode block at `cairn-admin.css:1025-1074`, which the spec does
  not mention.
- **Fold:** Write out the `:not()` list the rule excludes. Say that join segments take the
  hairline, and that the 7% wash replaces or composes with the existing `.btn-active` block.
  Have the implementer name which one.

### m4. The weight change interacts with the E3 tracking scale

- **Location:** spec:117-118.
- **Defect:** The E3 scale (`admin-css.input.css:113-124`) keys letter spacing to weight:
  semibold text gets `tracking-small-semibold`, medium text `tracking-small-medium`. Eight
  buttons carry `tracking-small-semibold` in markup. Any of them that lands as a plain or
  ghost button at weight 500 is now mis-tracked.
- **Fold:** Add one line to the sweep: "tracking follows the new weight: a plain or ghost
  button carrying `tracking-small-semibold` moves to `tracking-small-medium`."

### m5. The Lucide layer question has one correct answer

- **Location:** spec:261-263.
- **Defect:** The spec leaves open whether the Lucide stroke rule needs to sit unlayered. It
  does not. `@lucide/svelte` sets `stroke-width` as an SVG presentation attribute
  (`Icon.svelte:20` adds the `lucide-icon` class). Any author CSS outranks a presentation
  attribute, so a rule in `@layer components` wins. Separately, the same file carries a
  `@TODO` about dropping the `lucide-icon` class, which is an upstream tripwire.
- **Fold:** Settle it in the spec: the Lucide rule goes in `@layer components`. Add a
  `// WATCH:` comment on the rule, per the repo's watch-item convention, noting that it keys
  on a class upstream may drop. Only the switch question stays open for the plan.

### m6. The contrast measurements name no method

- **Location:** spec:135-136, 203-206.
- **Defect:** The pairs are named, but the measuring tool is not. A panel is a `color-mix`
  over `base-100`, so a hand estimate can drift. `check:interactive-contrast` covers only
  interactive elements, so it does not reach alert panels.
- **Fold:** Name the method: resolve the colors in the browser, as the cairn-audit engine
  does (paint to canvas, read back sRGB), on the M3 fixture. Record the ratio per pair per
  theme. Adding the alert pairs to a static token check like `check:public-tokens` is
  optional.

## Checked and sound

- The theme-variable values (spec:63-66, 73-74, 96-97, 186-187) are exact and match
  DaisyUI 5's variable names. The current admin values (`cairn-admin.css:209-216`,
  `412-419`) and starter values (`theme.css:131-137`, `171-177`) confirm that the before
  state is as described.
- The sweep counts are accurate at `2776dfa3`: 5 `shadow-none` and 7 `border-transparent`
  are exact. The 4 ink-hover brackets are exact once the token's own two definitions in
  `cairn-admin.css` are excluded.
- The scope boundaries are sharp: no palette values, no motion, no editor canvas, no font
  re-cut, no release. The "finding, not a silent fix" clause (spec:178-179) is a good
  anti-drift rule.
- The documentation dimension names each gate that applies (`check:facts`,
  `check:reference`) and the frozen-arm deficiency path.
