# Design Ratchet Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development
> (dispatch `cairn-implementer` per task) to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking. Per the cairn convention, tasks specify outcomes,
> constraints, and acceptance criteria, never implementation code.

**Goal:** Convert the six ASC Assets-trial harvest findings into engine repairs: a UA reset
layer, an exported stacked field register, a compile gate over the skill's own exemplars, the
ratified `one-filled-action` partition with a visible dark-ground selected state, and at most
three corpus-validated rendered geometry rules.

**Architecture:** The organizing frame is the grammar ladder the trial ratified: every
composition claim gets either a component that makes it automatic or a check that makes
deviation visible; prose alone is the demonstrated failure mode. Tasks 1-3 reify grammar into
vocabulary (reset layer, safelist, stacked register); Tasks 4-5 are the parser (partition
ruling, geometry rules); Task 6 validates against the trial's labeled corpus; Task 7 folds the
findings and lands the ladder as doctrine.

**Tech Stack:** Tailwind 4 + daisyUI 5 admin sheet (`scripts/admin-css.input.css`, built and
scoped by `scripts/build-admin-css.mjs`), Svelte 5 runes components, the `cairn-audit`
static/rendered rule engine (Playwright harness in `src/lib/audit/rendered.ts`).

## Global Constraints

- Source brief: `~/Projects/aksailingclub-org/docs/2026-07-30-assets-trial-harvest-findings.md`.
  Geoff's `one-filled-action` ruling (2026-07-30) is SETTLED: nav and aside partition, the
  topmost dialog layer partitions, header/footer nested inside main do NOT partition main, and
  the grader prompt's item b is unchanged. Do not re-litigate.
- The token layer is not the problem: no changes to type roles, gap-role values, chip
  registers, or theme color tokens, except the Task 2 safelist classes (implementation found
  six uncompiled exemplar classes, not the predicted two; all six landed the same way) and
  the dark `.btn-active` step (Task 4), both of which serve composition.
- `skills/cairn-admin-screens/references/grader-prompt.md` item b is untouched.
- The admin wrapper hosts the editor's rendered markdown preview, so the reset layer never
  touches bare content elements (`ul`, `ol`, headings, `p`); only form controls, `dialog`,
  `fieldset`/`legend`, and daisyUI's own `.list` container.
- At most three new rendered geometry rules. No geometry framework.
- Rules validated on this workstation must be re-checked on the CI runner before anything
  gates at error tier (the local visual suite diverges from CI by ~60 threshold-marginal
  comparisons).
- Worktree: `.claude/worktrees/design-ratchet` (branch `design-ratchet` off `main` at
  `584ae23d`). All edits target the worktree path.
- Per-task gate: targeted test red-then-green, `npm run check` 0/0, `npm test` exit 0.
  Sheet-inventory changes go through `npm run update-admin-sheet-inventory` with a
  CHANGELOG entry first (the regen script requires it).
- No version bump, no publish. All CHANGELOG entries land under `## Unreleased`.
- Commit convention: imperative mood, specific files, `Co-Authored-By: Claude
  <noreply@anthropic.com>`.

---

### Task 1: UA reset layer in the packaged admin sheet

Closes findings 1 and 6 (the same finding: `cairn-admin.css` ships no user-agent reset).
Deliverable count: 4 (layer restructure, reset block, browser test, CHANGELOG entry).

**Files:**
- Modify: `scripts/admin-css.input.css` (the `@layer` declaration, line 10)
- Modify: `src/lib/components/cairn-admin.css` (new `@layer base` block)
- Test: new component-browser test, e.g. `src/tests/component/AdminReset.test.ts`
- Modify: `CHANGELOG.md` (`## Unreleased`)

**Interfaces:**
- Produces: a `base` cascade layer ordered `theme, base, components, utilities`, which Task 3's
  stacked-register sheet hook and Task 5's font-parity rule both assume.

**Outcome.** The layer declaration becomes `@layer theme, base, components, utilities;` so the
reset loses to daisyUI's component classes and to any consumer style, while still beating
user-agent defaults (author origin always beats UA origin regardless of layer). The `base`
block, written in `cairn-admin.css` so the build script's `postcss-prefix-selector` scopes it
under the two `data-theme` roots like everything else, carries exactly:

1. The admin body face on the scoped root itself (the same family token `type-body`
   resolves to), so un-classed text inside the admin frame stops computing the browser
   serif default.
2. `button, input, select, textarea, optgroup { font: inherit; letter-spacing: inherit;
   color: inherit; }` (the Tailwind-preflight convention), which is what makes a bare
   textarea render the admin face instead of UA monospace.
3. `textarea { resize: vertical; }`. Decided: horizontal resize breaks layout integrity,
   which makes this a mechanic, not a taste call.
4. Bare `fieldset` loses the UA border, margin, and padding; `legend` loses UA padding.
   daisyUI's `.fieldset` class styling is unaffected (components layer wins).
5. `dialog { border: none; }`, killing the Chrome UA `border: solid currentColor` that
   paints a 3px frame around the viewport on every modal.
6. `ul.list, ol.list { padding-inline-start: 0; }` and `list-style: none` on the same
   selector: the UA's 40px bullet reservation on daisyUI's `.list` container. Scoped to
   `.list`, never bare `ul`/`ol` (the markdown-preview constraint above).

**Explicit ownership decisions, recorded so they are not re-derived:** cairn owns every UA
default that contradicts the packaged sheet's own claims (items 1-6). Cairn does NOT own
daisyUI's `width: clamp(3rem, 20rem, 100%)` on `.input`/`.select`/`.textarea`, and the
reason is design, not churn (churn is ratified free until the public beta, Geoff
2026-07-30): a global `width: 100%` would diverge a daisyUI primitive's intrinsic sizing
from the stock dialect cairn keeps, and would break the inline register's own composition,
where a label-adjacent control must not fill the row. Width is a composition concern; the
stacked register owns it (Task 3), and the trial's principle says the repair is the
component plus the check, not a raw-class default flip.

- [ ] **Step 1:** Write the failing component-browser test asserting, inside a
  `data-theme="cairn-admin"` wrapper with the built sheet loaded: a bare `<textarea>`
  computes the same first `font-family` as the wrapper root; `dialog.modal` computes
  `border-style: none` (or zero border-width); a `<ul class="list">` computes
  `padding-inline-start: 0px`; `<textarea class="textarea">` computes `resize: vertical`.
  Run it; expect red on all four against the current sheet (the test must rebuild or load
  the freshly built sheet, reusing the `buildAdminCss()` helper pattern from
  `src/tests/unit/admin-sheet-inventory.test.ts` or the component suite's existing
  sheet-loading pattern).
- [ ] **Step 2:** Restructure the layer declaration and add the `base` block per the outcome
  list. Rebuild the sheet; run the test to green.
- [ ] **Step 3:** Confirm the built sheet's base-layer selectors carry the
  `:where([data-theme='cairn-admin'], [data-theme='cairn-admin-dark'])` scope prefix, and
  that `admin-sheet-inventory.test.ts` still passes (element selectors add no classes; if
  the class set drifted anyway, stop and reconcile deliberately: CHANGELOG first, then
  `npm run update-admin-sheet-inventory`).
- [ ] **Step 4:** Full gate (`npm run check`, `npm test`). CHANGELOG entry under
  `## Unreleased`: the reset layer, listed defaults now normalized, `Consumers must:`
  nothing (behavior improves silently; note the visible changes: textareas take the admin
  face, modals lose the UA frame, `.list` loses the phantom gutter).
- [ ] **Step 5:** Commit.

---

### Task 2: the skill's own exemplars must compile, and the safelist honors the recipe

Closes finding 2. Deliverable count: 4 (compile-gate test, safelist addition, inventory
regen, CHANGELOG entry).

**Files:**
- Create: `src/tests/unit/skill-references-compile.test.ts`
- Modify: `scripts/admin-css.input.css` (the labeled compatibility/interface safelist)
- Modify: `src/tests/unit/fixtures/admin-sheet-inventory.txt` (via the regen script only)
- Modify: `CHANGELOG.md`

**Interfaces:**
- Consumes: the audit's sheet tokenizer (the `parseSheet` machinery `no-uncompiled-class`
  uses via `ctx.sheet.mentions()`) and the `buildAdminCss()` test helper.
- Produces: a standing gate in cairn's own suite; any future exemplar class that does not
  reach the built sheet fails cairn's CI. This deliberately does NOT widen `cairn-audit`'s
  consumer-facing config to scan markdown; the gate is cairn's own test.

**Outcome.** A unit test extracts candidate class tokens from every
`skills/cairn-admin-screens/references/*.md`: from `class="..."` attributes inside fenced
code blocks, and from inline code spans that parse as pure class lists (two or more tokens,
every token matching the class-token shape `no-uncompiled-class` accepts). Each candidate is
asserted against the built sheet with the rule's exact-match semantics (`text-base` ≠
`text-base-content`). Prose-shaped inline code (`file.styleClassNames`, function names,
file paths) must not false-positive; a small in-test allowlist for genuine placeholders is
acceptable if needed, each entry commented.

The known red: `form-anatomy.md:59` prescribes `gap-x-6 gap-y-4`, which never compiles. The
fix honors the recipe rather than rewriting it (the exemplar's own lines 59-70 explain the
named `gap-group`/`gap-section` roles set the single `gap` shorthand and cannot express an
axis split, so the raw pair is the deliberate prescription): both classes join the labeled
safelist in `admin-css.input.css` as documented interface classes, with a comment naming
`form-anatomy.md` as the reason. This also clears the standing ASC-side
`ClassForm.svelte`/`EventForm.svelte` convictions on the consumer's next upgrade.

- [ ] **Step 1:** Write the extraction + assertion test. Run it; expect red convicting
  exactly `gap-x-6` and `gap-y-4` (if it convicts more, each extra is either a real
  finding to fix the same way or an extraction false-positive to tighten; resolve before
  proceeding, and record any additional real convictions in the task's commit message).
- [ ] **Step 2:** Add the CHANGELOG entry (the regen script requires it), add the two
  classes to the safelist with the labeled comment, run
  `npm run update-admin-sheet-inventory`, and confirm the inventory diff is exactly the
  classes the safelist adds.
- [ ] **Step 3:** Test to green; full gate; commit.

---

### Task 3: export the stacked field register

Closes finding 3. Deliverable count: 5, stated per the pass-sizing rule (register prop +
sheet hook, component tests, reference page, skill-doc repoint, surface regen + CHANGELOG).
They cohere as one reviewable unit: the component and the docs that make it findable.

**Files:**
- Modify: `src/lib/admin-fields/FieldLabel.svelte`, `TextField.svelte`, `SelectField.svelte`
- Modify: `src/lib/components/cairn-admin.css` (components layer: the stacked-register hook)
- Test: the admin-fields component test suite (extend where the existing tests live)
- Modify: `docs/reference/admin-fields.md`,
  `skills/cairn-admin-screens/references/form-anatomy.md`
- Modify: `docs/internal/api-surface.md` (via `npm run check:surface -- --update`),
  `CHANGELOG.md`

**Interfaces:**
- Consumes: Task 1's `base` layer ordering (the hook lives in `components`, above it).
- Produces: `register?: 'inline' | 'stacked'` (default `'stacked'`) on `FieldLabel`,
  `TextField`, `SelectField`; a scoped class hook (e.g. `cairn-field-stacked`) whose
  descendant `.input`/`.select`/`.textarea` compute `width: 100%`.

**Outcome.** The stacked register that already works inside the package (extract the exact
shape from `FieldInput.svelte`'s rendered field blocks; do not invent a new one) becomes the
DEFAULT register on the three exported admin-fields components: label on its own line above
the control, `gap-label` spacing, and the container filling its grid cell. The full-width
behavior is automatic: the stacked wrapper's sheet hook forces contained controls to
`width: 100%`, so a consumer cannot forget `w-full` (this is the decided answer to daisyUI's
320px clamp, per Task 1's ownership note). `'inline'` stays available as the explicit choice
for control-adjacent compositions (toolbar filters, compact panels).

**The default flip is a deliberate breaking change** (ratified by Geoff 2026-07-30: site
contracts may break where the break is the better long-term engine design). Defaulting to
inline would reproduce the harvest's trap shape: the register that staircases in any grid
stays the effortless path and every consumer must know to opt out. Stacked is the robust
all-widths form-field shape; inline is the compact exception, so the names say so. In the
same task, sweep cairn's own call sites of the three components: set `register="inline"`
explicitly where the composition is genuinely control-adjacent, and accept the new default
where stacked is right; update affected existing tests deliberately (never loosen an
assertion to pass).

Docs make the construction findable: `admin-fields.md` documents both registers and states
the rule (stacked for any multi-column grid; inline staircases there), and
`form-anatomy.md`'s composition-width guidance is repointed at `register="stacked"` so the
claim now names its component. Public-surface change: `check:surface -- --update` with the
regenerated snapshot committed in this task.

- [ ] **Step 1:** Write the failing component test: two `TextField register="stacked"`
  instances in one column of a two-column grid assert shared left AND right control edges
  via `getBoundingClientRect` (the finding-3 measurement, as a test), and a control inside
  the stacked register computes `width` equal to its cell, not 320px. Expect red.
- [ ] **Step 2:** Implement the register prop on `FieldLabel`, pass-through on `TextField`
  and `SelectField`, and the sheet hook. Rebuild the sheet. Test to green. Sweep cairn's
  own call sites per the outcome; update affected existing tests deliberately. Reconcile
  the sheet inventory if the hook or scanned markup added classes (CHANGELOG first, then
  regen).
- [ ] **Step 3:** Update `docs/reference/admin-fields.md` and `form-anatomy.md` (inline
  becomes the marked exception); run `npm run check:surface -- --update` and commit the
  snapshot; CHANGELOG entry is BREAKING: `Consumers must:` pass `register="inline"` on any
  `FieldLabel`/`TextField`/`SelectField` whose inline label-beside-control layout should
  survive the upgrade; unmarked fields render the stacked register.
- [ ] **Step 4:** Full gate, plus `npm run check:reference` and
  `npm run check:reference:signatures` (public surface changed). Commit.

---

### Task 4: the one-filled-action ruling, with a visible dark-ground selected state

Closes finding 4 as ruled. Deliverable count: 4 (partition change + tests, dark
`.btn-active` step, cairn-own-admin sweep, docs + CHANGELOG).

**Files:**
- Modify: `src/lib/audit/rules/rendered/one-filled-action.ts`
- Test: extend the rendered-rule unit tests (beside
  `src/tests/unit/audit/rules/rendered/browser-regressions.test.ts`, or a new
  `one-filled-action-partition.test.ts` in the same idiom)
- Modify: `src/lib/components/cairn-admin.css` (dark-theme `.btn-active` override,
  components layer)
- Modify: `docs/reference/cairn-audit.md`, `CHANGELOG.md`

**Interfaces:**
- Produces: the partition set `{topmost open dialog layer, nav, aside}`. `header`,
  `footer`, and `main` no longer partition; within a layer, a control's surface is its
  closest enclosing `nav` or `aside` inside the layer, else the layer itself.

**Outcome.** The rule's landmark walk (currently `main, nav, aside, header, footer`) narrows
to `nav`/`aside`; the topmost-open-dialog logic is unchanged; the grader prompt is
untouched. Record the ruling's reasoning in the rule's header comment so it is not
re-litigated: the rule exists to stop two controls both claiming to be the action; a DOM
boundary between a page header and the card beneath it removes none of that harm (same
visual column, same first look), while a nav rail genuinely does (persistent chrome, its own
ground and spatial zone).

The same change ships the visible dark-ground selected state, because the ruling pushes
segmented controls off `btn-primary` and onto `btn-active`, and daisyUI's dark `.btn-active`
is a 0.011 lightness step against 0.068 in light. A components-layer rule under the
`cairn-admin-dark` root raises the `.btn` to `.btn-active` ground step into the 0.05-0.07
oklch-lightness range, staying in the Warm Stone dark family's hue and chroma (base tokens:
`cairn-admin.css` lines 238+). Without this, the ruling makes things worse; it ships in this
task or not at all.

**The accepted consequence, applied to our own screens:** after the change, run the rendered
audit against cairn's own admin and the showcase. Any screen newly failing (a filled header
action above a filled card action is now two primaries by definition) is fixed at the code
by demoting the non-primary fill to ghost. Never loosen the rule to pass a screen.

- [ ] **Step 1:** Write the failing partition unit tests: (a) filled action in an in-`main`
  `header` plus filled action in a card in `main` → one surface, rule fires; (b) filled
  action in `nav`, filled action in `main` → two surfaces, quiet; (c) two filled actions
  split across an open `dialog` and the page beneath → two surfaces, quiet; (d) two filled
  actions inside one open dialog → fires. Expect (a) red against the current partition.
- [ ] **Step 2:** Narrow the partition; tests to green.
- [ ] **Step 3:** Add the dark `.btn-active` override; extend the component-browser suite
  with a computed-style assertion that the dark-theme `.btn` → `.btn-active` background
  lightness step is ≥ 0.04 oklch (measure via the suite's existing color helpers; exact
  threshold from the implemented value). Rebuild the sheet; inventory reconcile if needed.
- [ ] **Step 4:** Run the rendered audit on cairn's own admin + showcase; fix any newly
  failing screen by demotion to ghost; record which screens changed in the commit message.
- [ ] **Step 5:** Update `docs/reference/cairn-audit.md`'s rule description (partition
  definition + reasoning), CHANGELOG (`Consumers must:` a screen with a filled header
  action above a filled card action now fails the error tier; demote the card action to
  ghost). Full gate; commit.

---

### Task 5: rendered geometry rules, capped at three

Closes the mechanical halves of findings 1, 3, and 6. Deliverable count: 4 (three rules +
registration, unit tests, reference rows, CHANGELOG).

**Files:**
- Create: `src/lib/audit/rules/rendered/form-font-parity.ts`,
  `src/lib/audit/rules/rendered/field-edge-alignment.ts`,
  `src/lib/audit/rules/rendered/container-inset-asymmetry.ts` (settle exact names in the
  repo's rule-naming idiom)
- Modify: `src/lib/audit/rules/rendered/index.ts`
- Test: one unit test file per rule under `src/tests/unit/audit/rules/rendered/`
- Modify: `docs/reference/cairn-audit.md`, `CHANGELOG.md`

**Interfaces:**
- Consumes: the rendered harness contract (rules declare states/viewports; findings carry
  tier), the shared color/geometry helpers in `rendered.ts`.
- Produces: three registered rules. Intended tiers: `form-font-parity` at **error**
  (finalized only after Task 6's CI re-check), the other two at **advisory**.

**Outcome.** Three rules, no more; the cap is deliberate and a fourth candidate goes to the
friction log instead.

1. **`form-font-parity`** (error-intent): every rendered `input`, `select`, `textarea`, and
   `button` must compute the same first `font-family` as the admin root. String equality on
   the first family, so it is crisp, not threshold-marginal. This is the reset layer's
   regression tripwire and catches a consumer whose sheet never loaded.
2. **`field-edge-alignment`** (advisory): within a grid or flex-column container holding two
   or more form controls (`.input`/`.select`/`.textarea`) in the same column, control left
   edges must align within 1.5px. The staircase detector. Advisory because "same column" is
   a heuristic over arbitrary layouts.
3. **`container-inset-asymmetry`** (advisory): a block container (card, `.list`, dialog box)
   whose content's left inset exceeds its right inset by more than 24px reads as pushed
   right. The phantom-gutter detector. Advisory: the threshold is judged, and intentional
   asymmetric layouts exist.

Each rule follows the existing rendered-rule shape (declared states, per-theme runs,
finding text naming the measured values and the repair). Reference rows in
`cairn-audit.md` state each rule's claim, tier, and the corpus evidence (Task 6).

- [ ] **Step 1:** Per rule: failing unit test with DOM fixtures in both directions (a
  violating fixture fires with the measured values in the finding; a conforming fixture is
  quiet). Expect red.
- [ ] **Step 2:** Implement the three rules; register them (`font-parity` provisionally at
  advisory until Task 6 finalizes); tests to green.
- [ ] **Step 3:** Reference rows + CHANGELOG (advisory additions need no consumer action;
  note the intended error promotion of `form-font-parity` pending CI evidence). Full gate;
  commit.

---

### Task 6: corpus validation and the CI re-check

Deliverable count: 4 (corpus harness, validation matrix as evidence, CI run, tier
finalization).

**Files:**
- No cairn source files except: `src/lib/audit/rules/rendered/index.ts` (tier finalization)
  and this plan's post-mortem section (the matrix).
- Scratch: detached worktrees of `~/Projects/aksailingclub-org` under the session
  scratchpad, at `8778556`, `5aad533`, `c340db6`.

**Interfaces:**
- Consumes: Tasks 4 and 5's rules, built into this worktree's `dist/audit/bin.js` via
  `npm run package`.

**Outcome.** The trial left a labeled corpus with known verdicts on both sides; validate
rather than assume. Before touching the ASC repo, verify no live executor (`pgrep -f
aksailingclub`, `git -C ~/Projects/aksailingclub-org status` for warm changes not ours; a
hit means stand down and coordinate). Then, per SHA: detached worktree, install, build, and
serve per the ASC trial's own measurement recipe (serving and session mint:
`aksailingclub-org/docs/plans/2026-07-29-cairn-design-trial-assets.md`), and run this
worktree's `cairn-audit --rendered` with a config listing `/admin/club/assets` and
`/admin/club/asset-requests`, at 390 and 1440, both themes.

The matrix a rule must satisfy (fire means at least one finding on the named page):

| Rule | 8778556 | 5aad533 | c340db6 |
| --- | --- | --- | --- |
| `one-filled-action` (tightened) | FIRES on assets (btn-primary switcher beside Assign) | quiet | quiet |
| `form-font-parity` | FIRES on asset-requests (native Reason textarea) | quiet | quiet |
| `field-edge-alignment` | FIRES on assets (label staircase, 1440) | — record | quiet |
| `container-inset-asymmetry` | FIRES on asset-requests (57px gutter, 390) | quiet | quiet |

A rule that misses its matrix goes back to its task and gets fixed or dropped; never tune a
threshold blind until the matrix passes. Record every cell actually observed, including the
unspecified ones, in the post-mortem. The corpus runs against the published `0.91.x` sheet
the SHAs pin, which is correct: the rules read the rendered result, and the "before" states
must stay as the trial measured them.

Then the CI leg: push the branch; CI runs the rendered suite against cairn's own admin and
showcase on the CI runner. `form-font-parity` promotes to error tier only if that run is
green; if CI disagrees with the workstation, it stays advisory and the divergence is
recorded in the post-mortem. Remove the scratch worktrees when done.

- [ ] **Step 1:** Executor check on the ASC repo; create the three detached worktrees.
- [ ] **Step 2:** Run the matrix; record all cells. Fix-or-drop any rule that misses.
- [ ] **Step 3:** Push the branch; confirm CI green; finalize `form-font-parity`'s tier in
  `rules/rendered/index.ts`; commit the tier change with the CI run URL in the message.
- [ ] **Step 4:** Clean up scratch worktrees.

---

### Task 7: fold the findings, land the ladder, update tracking

Deliverable count: 5 (friction-log fold, ROADMAP + upgrade guide, the ladder section in
`enforced-design.md`, ASC staging-file deletion, STATUS at merge).

**Files:**
- Modify: `docs/internal/docs-friction-log.md`, `ROADMAP.md`,
  `docs/guides/upgrade-cairn.md`, `docs/explanation/enforced-design.md`
- Cross-repo: delete `~/Projects/aksailingclub-org/docs/2026-07-30-assets-trial-harvest-findings.md`
  (its own header directs this once folded), as a small docs commit in the ASC repo.
- Modify (on `main`, at merge): `docs/STATUS.md`

**Outcome.** The six findings enter the friction log complete-or-moved per the standing
rule: findings 1, 2, 3, 4, 6 record as completed by this pass with one-line pointers to the
shipping task; finding 5 (daisyUI's `.list-row` `grid-row-start: 1` child pin) is the one
finding this pass deliberately does not repair (site-side overrides exist; the engine-side
repair needs its own design), so it files as a live entry with the harvest's measurement and
lands in ROADMAP's Next tier. ROADMAP also marks the queued rule-repair item shipped and
prunes it. The upgrade guide gains this window's behavior entries (the reset layer's visible
changes; the tightened `one-filled-action` with its `Consumers must:` demotion recipe; the
`register` default flip with its `Consumers must:` opt-back recipe).

The durable version of the pass lands as a short section in
`docs/explanation/enforced-design.md`: the grammar ladder. Component where the construction
is fixed, check where deviation is renderable, prose only for what needs judgment, and the
standing ratchet: a composition claim moves down the ladder the moment it is cited in a
second repeated miss. Keep it to a few paragraphs in the page's existing register; it is
doctrine, not a changelog.

- [ ] **Step 1:** Friction log fold + ROADMAP (ship + prune + file finding 5 + record in
  "Toward 1.0" that churn is ratified free until the public beta, Geoff 2026-07-30).
- [ ] **Step 2:** Upgrade guide entries; `npm run check:docs` green.
- [ ] **Step 3:** The ladder section in `enforced-design.md`; Vale clean.
- [ ] **Step 4:** Delete the ASC staging file (ASC repo docs commit).
- [ ] **Step 5:** Commit; STATUS.md update happens on `main` at merge per the pass-end
  ritual.

---

## Close-out state and remaining work (2026-07-30 handoff, written at context clear)

A fresh session resumes HERE. Verify before acting: `git -C
.claude/worktrees/design-ratchet log --oneline -12` for the landed commits, and confirm no
implementer is live in the worktree (warm uncommitted changes = stand down and investigate).

**Landed on `design-ratchet`:** Tasks 1-5 and 7 (T1 `3a110c54` reset layer; T2 `8d0f3791`
exemplar gate + six-class safelist, not two — Global Constraints corrected; T3 stacked
register, default flipped, width hook shipped as pinned unlayered rule 7 (the plan's
components-layer assumption was false: daisyUI widths compile into the `utilities` layer,
which beats `components`; the unlayered convention is the repo's own); T4 `ca2b9ae9`
partition narrowed to nav/aside + dark `.btn-active` (BROKEN, see fix A1) + own-admin sweep
clean; T5 `a640dea4` three geometry rules at advisory; T7 `088179fb` docs fold + grammar
ladder in `enforced-design.md`; ASC staging file deleted, ASC commit `bd12d6c`). The
12px-type-role ROADMAP bullet was deliberately KEPT (its design ruling is still open; this
pass's constraints forbade type-role changes).

**Corpus matrix, REFRESHED after fix C (two ASC SHAs re-run end to end against this worktree's
audit build, `8778556` on port 8811 and `c340db6` on 8812, both themes, all twelve configured
pages):**

| Rule | `8778556` | `c340db6` | Adjudication |
| --- | --- | --- | --- |
| `one-filled-action` (tightened) | FIRES, `/admin/club/assets`, error tier, "2 accent-filled controls compete on this surface", both themes | quiet | CORRECT |
| `field-edge-alignment` (reclustered) | FIRES, `/admin/club/assets`, `select.select-sm` 2px and `input.input-sm` 40px off their column's leftmost control, both themes | quiet | CORRECT |
| `container-inset-asymmetry` | FIRES, `/admin/club/asset-requests`, `ul.list` 40px left inset against 0px right, both themes | quiet | CORRECT |
| `form-font-parity` (scoped + exempted) | FIRES, 406 findings across 12 pages | FIRES, 406 findings, identical distribution | CORRECT, per the standing adjudication below |

`form-font-parity`'s adjudication is unchanged and re-confirmed: every corpus state runs the
published pre-reset sheet, where buttons genuinely compute Arial, so both legs firing identically
is the truth about those bytes and not a rule defect. Its quiet leg is proven on the NEW sheet (CI
plus the local sweep), never on the corpus. Batch B's scoping and exemptions did not move the
corpus count, which is the expected result: the four exempted controls are cairn's own, not ASC's.

**`container-inset-asymmetry`'s earlier MISS was a corpus-leg defect, not a rule defect** (fix C,
diagnosed empirically 2026-07-31). The rule file is byte-identical to the version the first matrix
ran, `a640dea4` being its only commit, so the whole difference between MISS and FIRES is page
state. The leg recipe as written stands up cairn's AUTH_DB and applies the CLUB_DB migrations, but
seeds no club rows, so `asset_requests` was empty and `/admin/club/asset-requests` rendered its
`EmptyState` branch. That branch contains no `<ul class="list">` at all, and the gutter lives only
in the populated branch.

The first run's own log settles it. In that run, identified as the `8778556` leg because its
`field-edge-alignment` and `one-filled-action` findings match the recorded matrix cells value for
value, `/admin/club/asset-requests` produced findings on exactly four selectors, and every one is
admin-shell chrome: the sidebar's collapse button, a sidebar `btn-block` button, the command
palette's `kbd`, and a sidebar `details`. Not one finding touches row content. The same page in
this run, same SHA with the rows seeded, produces fourteen findings on the rows' own `join-item`
buttons alone, plus the `ul.list` finding. The page the first matrix audited was the empty state.

Proven from both ends on the live leg besides: with the two pending rows the page carries one
`.list` and the rule fires; with the same rows flipped to `denied` it carries zero `.list` elements
and renders "Nothing pending". A hand-evaluation of the rule's measurement against the live `.list`
returned exactly what the harness reported, 40px left against 0px right, so the measurement logic
was never in question.

Two corrections follow, both landed: the rule's stated provenance was wrong (it named a textarea
and a "57px against 8px" one-sided padding utility; the real shape is a bare `<ul class="list">`
keeping the user agent's 40px bullet indent, which the harvest's own correction had already
recorded, and 57px was the composite card-edge-to-text read, not what the rule measures), and the
finding text now names an unreset user-agent default beside the one-sided utility. A regression
test pins the bare-`ul` shape with no author padding, since every prior fixture declared an
explicit one-sided padding and would have stayed green through a rewrite that only read
author-declared insets.

**Standing correction to the corpus-leg recipe:** a leg is not stood up until the screens under
test render their POPULATED branch. Copying the ASC checkout's own `.wrangler/state` (which carries
the trial's seeded `asset_requests` rows and a live owner session) is the cheap way there, and the
hand recipe's migrations-only path silently produces empty states that make every data-dependent
rule look quiet. An audit run over an empty state is not evidence.

**Review triage (two Opus reviews, findings adjudicated):**

- **Fix A1: DONE, commit `f790ffcf` (2026-07-31).** The dark `.btn-active` repair landed
  per the ratified design: variant-preserving `color-mix(in oklab, var(--btn-color,
  var(--color-base-200)), oklch(100% 0 0) 8%)` (measured step 0.0676 oklch L vs light's
  0.068; primary variant keeps chroma 0.138), `--btn-border` matched to the fill, an
  unlayered `:hover` companion at 14% (measured distinct, 0.2733), EditorToolbar unselected
  tabs moved `btn-ghost` → plain `btn`, three BtnActiveDarkGround fixtures red-then-green,
  full gate + custom-surface green. Hover-only companion was the deliberate scope (press
  feedback on the selected control was never a measured defect).
- **Fix A2 (sheet + components, one dispatch):** (1) stacked width hook `.cairn-field-stacked
  :where(...)` → child combinator `>` so nested compact rows escape; document the width
  escape in `docs/reference/admin-fields.md` and the CHANGELOG `Consumers must:` line.
  (2) `FieldLabel` register branches collapse to ONE `<label>` with a conditional class
  list (the `{#if}` pair remounts the control on a live register flip, dropping focus/IME).
  (3) `docs/reference/admin-fields.md`'s FieldLabel section is stale: no `register` in the
  signature block, prose still describes inline as the default. (4) `legend { padding: 0 }`
  breaks the one bordered fieldset: add `px-1` to `ComponentForm.svelte`'s legend (~line
  330). (5) The built sheet ships NO `@layer theme, base, components, utilities;` ordering
  statement — precedence is accidental file order; prepend it explicitly in
  `scripts/build-admin-css.mjs` (beside the font-face block, ~line 94) and assert it in
  `AdminReset.test.ts`. (6) Upgrade guide: one line that cairn's `base` layer merges by
  name with a consumer's own Tailwind `base`, so host import order decides within it.
- **Fix B (audit rules, one dispatch):** (1) `form-font-parity`: scope the walk to the
  theme root (currently document-wide) and exempt a control carrying an explicit face
  (`font-mono`, `font-[family-name:...]`); four shipped controls are mismatches by
  construction (CairnMediaLibrary slug + two type-to-confirm inputs, MarkdownEditor's
  no-JS fallback textarea). Required before any error-tier promotion. (2)
  `field-edge-alignment`: clustering is transitive rect-overlap, so a `col-span-2` row
  merges two real columns; cluster on left-edge proximity instead, add a `col-span-2`
  fixture. (3) `one-filled-action`: surface key is the landmark's TAG NAME, so all `<nav>`s
  merge into one surface; key per element (selector + index). Latent today only because
  Pagination uses `btn-active`.
- **Fix C: DONE (2026-07-31).** Both legs recreated and re-run; the refreshed matrix and the
  full diagnosis are in the corpus-matrix section above. Verdict: `container-inset-asymmetry`
  is CORRECT and ships, the miss was an empty-state corpus leg rather than a rule defect, so
  neither the fix-or-drop rule's fix branch nor its drop branch applied to the measurement
  logic. Landed alongside it: a bare-`ul` regression test, corrected provenance in the rule
  header and `docs/reference/cairn-audit.md`, a finding text that names an unreset user-agent
  default, and the standing corpus-leg recipe correction above.
- **Declined, recorded:** `color: inherit` on form controls stays (the preflight
  convention; deviating is its own surprise — the muted-wrapper scenario is real but rare
  and advisory rules surface it).

**Then, in order:** (1) push the branch; CI green including the rendered suite on the CI
runner; finalize `form-font-parity`'s tier — error ONLY if CI is quiet on cairn's own
admin + showcase after B's exemptions, else it stays advisory with the reasoning in
`cairn-audit.md`. (2) Pass-end ritual per the section below, PLUS: a focused
`daisyui-a11y-reviewer` re-check of the A1 repair; eyes-on reads owed — dark `.btn-active`
across Pagination/ListToolbar/EditorToolbar, an open modal's frame (dialog border), and
the two fieldset alt-groups the reset silently moved ~12px (`MediaHeroField.svelte:519`,
`CairnMediaLibrary.svelte:1801`), both themes. (3) Post-mortem appended here (carry the
matrix, the adjudications, the A1 story: the trial's own thesis — a builder's green tests
missing a composition defect — reproduced inside the pass that repaired it). (4) Merge to
`main`, STATUS updated there. (5) **NO release: Geoff held it (2026-07-30).** The cut
waits for the next pass and rolls both windows; number derived at the cut.

**Next pass seed (draft its plan at close-out or in a Fable sitting):** the
optical-centering ratchet — `text-box-trim` as a silent engine default, measurement-first:
capture Geoff's ASC chip sighting first (page/chip/theme unknown; ask or survey), decide
trim breadth (chips + buttons minimum; "more broadly" is an explicit scope question for
Geoff), corpus-style validation; fold in the `.list-row` `grid-row-start` pin (ROADMAP
Next, filed by T7) and any friction-log items that are genuinely small, verified against
code first, each with a deliverable count. Churn is free until the public beta (ratified
2026-07-30; memory `cairn-churn-free-until-beta`).

## Pass-end ritual (per `cairn-pass`, not a task)

Code-simplifier over the pass's changed code; full gate battery including
`npm run check:comments`, the four doc gates, `check:surface`; the worktree showcase-e2e
gotcha applies (fresh `npm install` in the worktree's showcase, or trust CI's checkout);
reviewer fan-out: `svelte-reviewer` and `daisyui-a11y-reviewer` (no auth surface touched);
live admin smoke (the pass touches the `/admin` surface via the sheet and admin-fields);
eyes-on read of the dark-ground `btn-active` state and a modal (the dialog border) before
merge; post-mortem appended here; STATUS on `main`; no version bump, no publish (hold
unpublished; whether ASC's trial wants a cut is Geoff's release call, noted in STATUS).
