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
  registers, or theme color tokens, except the two safelist classes (Task 2) and the dark
  `.btn-active` step (Task 4), both of which serve composition.
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
daisyUI's `width: clamp(3rem, 20rem, 100%)` on `.input`/`.select`/`.textarea`: a global
`width: 100%` would ripple through every compact toolbar control, and the trial's own
principle says the repair is a component that makes full width automatic (Task 3) plus a
check that makes the shortfall visible, not a default flip.

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
- Produces: `register?: 'inline' | 'stacked'` (default `'inline'`) on `FieldLabel`,
  `TextField`, `SelectField`; a scoped class hook (e.g. `cairn-field-stacked`) whose
  descendant `.input`/`.select`/`.textarea` compute `width: 100%`.

**Outcome.** The stacked register that already works inside the package (extract the exact
shape from `FieldInput.svelte`'s rendered field blocks; do not invent a new one) becomes the
opt-in register on the three exported admin-fields components: label on its own line above
the control, `gap-label` spacing, and the container filling its grid cell. The full-width
behavior is automatic: the stacked wrapper's sheet hook forces contained controls to
`width: 100%`, so a consumer cannot forget `w-full` (this is the decided answer to daisyUI's
320px clamp, per Task 1's ownership note). The default stays `'inline'`: the trap was that
the working register required re-derivation, not that inline exists, and a default flip
would churn every existing screen.

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
  and `SelectField`, and the sheet hook. Rebuild the sheet. Test to green; existing
  admin-fields tests stay green (inline default unchanged). Reconcile the sheet inventory
  if the hook or scanned markup added classes (CHANGELOG first, then regen).
- [ ] **Step 3:** Update `docs/reference/admin-fields.md` and `form-anatomy.md`; run
  `npm run check:surface -- --update` and commit the snapshot; CHANGELOG entry
  (non-breaking addition; `Consumers must:` nothing, but name the new prop).
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
new `register` prop).

The durable version of the pass lands as a short section in
`docs/explanation/enforced-design.md`: the grammar ladder. Component where the construction
is fixed, check where deviation is renderable, prose only for what needs judgment, and the
standing ratchet: a composition claim moves down the ladder the moment it is cited in a
second repeated miss. Keep it to a few paragraphs in the page's existing register; it is
doctrine, not a changelog.

- [ ] **Step 1:** Friction log fold + ROADMAP (ship + prune + file finding 5).
- [ ] **Step 2:** Upgrade guide entries; `npm run check:docs` green.
- [ ] **Step 3:** The ladder section in `enforced-design.md`; Vale clean.
- [ ] **Step 4:** Delete the ASC staging file (ASC repo docs commit).
- [ ] **Step 5:** Commit; STATUS.md update happens on `main` at merge per the pass-end
  ritual.

---

## Pass-end ritual (per `cairn-pass`, not a task)

Code-simplifier over the pass's changed code; full gate battery including
`npm run check:comments`, the four doc gates, `check:surface`; the worktree showcase-e2e
gotcha applies (fresh `npm install` in the worktree's showcase, or trust CI's checkout);
reviewer fan-out: `svelte-reviewer` and `daisyui-a11y-reviewer` (no auth surface touched);
live admin smoke (the pass touches the `/admin` surface via the sheet and admin-fields);
eyes-on read of the dark-ground `btn-active` state and a modal (the dialog border) before
merge; post-mortem appended here; STATUS on `main`; no version bump, no publish (hold
unpublished; whether ASC's trial wants a cut is Geoff's release call, noted in STATUS).
