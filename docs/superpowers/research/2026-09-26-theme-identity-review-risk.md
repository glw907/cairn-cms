# Theme identity spec review: failure and regression risk

**Target:** `docs/superpowers/specs/2026-09-26-theme-identity-design.md` at `2776dfa3`.
**Lens:** what breaks, silently, when this lands (visual and accessibility regression, gates,
consumers, sequencing). Ratified taste is not re-argued; where a finding touches taste it is an
OWNER FORK.

**Counts:** 1 blocker, 6 major, 8 minor.

Evidence method: source reads, the gate scripts, and one headless-Chromium probe of the built
`dist/components/cairn-admin.css` (a `btn btn-primary btn-sm`, a plain `btn btn-sm`, and a
`.modal-box` inside `[data-theme='cairn-admin']`). Contrast estimates are an OKLab to sRGB
computation from the palette values in `cairn-admin.css`, good to about 0.05; the plan still
measures on the built sheet.

## Blocker

### B1. The spec's lever 3 home (`@layer components`) cannot override daisyUI, and the two alternatives each carry a silent failure

- **Location:** spec lines 47-57 (the three levers), 258-263 (open item scoped to Lucide and the
  switch only); `src/lib/components/cairn-admin.css:132` (the components block),
  `cairn-admin.css:163-168` (the file's own truthfulness note on the same mechanism).
- **Defect:** the built sheet orders `properties, theme, base, components, utilities`, and every
  daisyUI component rule sits in `utilities` sublayers (`daisyui.l1.l2...`). A components-layer
  rule loses to daisyUI on every property daisyUI sets, whatever its specificity. That covers
  nearly every decision in the spec. `.btn` sets `font-weight: 600`, `box-shadow`, `--btn-bg`,
  `--btn-border`, and `--btn-p`, and `.btn-sm` resets `--btn-p` on the element. The same holds
  for the alert colors and the toggle. The probe proves it on the admin's own lift: the existing
  components-layer `.btn-primary` violet lift renders as daisyUI's depth shadow
  (`oklab(0.52 ...) / 0.3) 0 3px 2px -2px`), not the rule's `color-mix(... 22%)` pair. So that
  rule is dead code today.

  The alternatives each fail silently in a different way:

  1. **In `@layer components`.** The button weights (500/600), `--btn-p`, the plain-`btn` hairline,
     the `btn-neutral` hover, the soft-primary tint, the join wash, the alert panels, the switch,
     and the warm lift simply do not render. Only a computed-style test notices, and none is
     named.
  2. **Unlayered.** The rule then outranks every Tailwind utility too. A developer's
     `btn border-transparent` or `btn bg-base-200` on a custom screen loses to it (the pinned
     rule 10 note records exactly this: `btn btn-active text-error` lost its ink). It also
     outranks daisyUI's layered `:hover`, `.btn-active`, and `:disabled` restatements of the same
     variables, the defect pinned rule 12 exists to repair.

  Two ratchet gates also stand in the way. The components-layer selector count is 19 against a
  cap of 19 (`scripts/checks/custom-surface-budget.json`, measured with
  `componentsLayerSelectorCount`), so the first new rule fails `check:custom-surface`. The
  unlayered set is pinned by exact selector. And the Tier-2 floor "may only SHRINK, and only with
  a matching update to `docs/internal/design/2026-06-29-custom-surface-ledger.md`"
  (`cairn-admin.css:22-26`). The spec names none of these, and its Proof list omits
  `check:custom-surface`.
- **Proposed fold:** the spec names the home for component-variable and scoped rules, the gate
  and ledger changes it needs, and a rule that every new override carries a computed-style
  assertion in a component test. This is the test the dead lift never had.
- **OWNER FORK (the home):**
  - (a) **Recommended.** A new sanctioned sublayer inside `@layer utilities`, declared after
    daisyUI's sublayers (for example `@layer utilities { @layer cairn-theme { ... } }`). A later
    sublayer beats daisyUI's sublayers. Unnested Tailwind utilities still beat every sublayer, so
    a developer's utility class keeps winning on a custom screen. That is the inheritance the
    spec's goal depends on. It needs `check:custom-surface` taught the new block, with its own
    cap, and a ledger entry.
  - (b) Unlayered rules, raising the pinned set by roughly ten. Each rule must set only daisyUI
    component variables, never properties, and must restate hover, active, and disabled
    explicitly (the rule 10 and rule 12 pattern). Consumer utilities that set a property still
    win, but any consumer utility that works through a variable loses.
  - (c) Keep only what theme variables reach (radii, size, depth, noise) and drop the rest. This
    loses most of the ratified ladder.

## Major

### M1. The `btn-primary` warm lift has no working home, and depth 0 leaves one achromatic shadow

- **Location:** spec lines 67-69 ("The existing `.btn-primary` lift rule is the home for it") and
  219-220 ("the depth-0 change removes achromatic shadows"); `cairn-admin.css:176-185` (the lift),
  `cairn-admin.css:246-249` (`.modal-box`).
- **Defect:** the probe shows both components-layer rules are overridden today (see B1). At
  depth 0, daisyUI's `--btn-shadow` goes transparent, so `btn-primary` renders with no lift at
  all while the spec believes it keeps one. The `.modal-box` "floating-card" rule is dead too.
  The probe computes the modal shadow as daisyUI's theme-invariant
  `oklch(0 0 0 / 0.25) 0 25px 50px -12px`, which `--depth` does not drive. So the claim that
  depth 0 removes the achromatic shadows is false for the admin's highest-elevation surface.
- **Proposed fold:** move the lift, and the pre-existing `.modal-box` repair, into B1's home. Add
  a computed `box-shadow` assertion for both, in both themes. Correct the Proof sentence.

### M2. The plain-`btn` hairline needs a stated state and variable contract, or it drops disabled, selected, hover, and focus states

- **Location:** spec lines 109-111; 86 plain `btn btn-sm` call sites in `src/lib/components` and
  `src/lib/admin-toolkit`; `admin-toolkit/Pagination.svelte:98` (`btn btn-disabled` ellipsis),
  `Pagination.svelte:102`, `ListToolbar.svelte:289`, `EditorToolbar.svelte:289` (`btn-active`
  segments).
- **Defect:** "a `btn` with no color or style modifier" also matches `.btn-active`,
  `.btn-disabled`, `:disabled`, and `[aria-disabled]` buttons. A resting `--btn-bg`/`--btn-border`
  override placed high enough to beat daisyUI (B1) also beats daisyUI's own disabled reset
  (`--btn-bg` to a 10% mix, `--btn-border` to transparent), its `.btn-active` fill, and its
  `:hover` step. A disabled plain button would then look enabled apart from its text, and a
  selected segment would look unselected. Focus is a separate trap. daisyUI draws a button's
  focus outline in `var(--btn-color, base-content)` (`cairn-admin.css:163-168`). An implementer
  who reaches the base-100 fill by setting `--btn-color: var(--color-base-100)`, the obvious way
  to keep daisyUI's derived hover, paints the focus ring base-100 on a base-100 card. That is an
  invisible keyboard focus (WCAG 2.4.7, 1.4.11) that no current gate catches, because
  `focus-renders` checks that an outline exists, not its contrast.
- **Proposed fold:** the spec states the selector's exclusions: `.btn-active`, `.btn-disabled`,
  `:disabled`, `[disabled]`, and `[aria-disabled='true']`. That is the rule 10 list plus
  `.btn-active`. It also states that the rule sets `--btn-bg` and `--btn-border` only, never
  `--btn-color` and never a property, and gives an explicit hover value. Proof adds the
  focus-ring contrast (3:1 against the adjacent ground) and a measured hover step for every
  restyled button family: plain, neutral, soft primary, and the join segment.

### M3. The active join segment's state cue drops to 1.16:1, and the spec does not say what happens to pinned rules 10-12

- **Location:** spec lines 112-116 and 203-205 (Proof checks only the segment's text at 4.5:1);
  `cairn-admin.css:578-640` (pinned rules 10, 11, 12); `src/tests/component/BtnActiveDarkGround.test.ts`.
- **Defect:** the new wash, 7% base-content over base-100, measures about **1.16:1** against a
  base-100 neighbor in both themes by this review's estimate. After the sweep, the unselected
  siblings are plain buttons on base-100. The only other cue is 600 against 500 weight. Rule
  10's comment records that a fill step this small cannot carry a state under WCAG 1.4.11, and
  that the 3:1 cue rides on `--btn-border` (the `oklch(57% 0.012 75)` inset hairline). That rule
  is dark-only today. The spec's "in both themes" wash leaves unsaid whether it replaces rule
  10's `--btn-bg` mix toward white, whether the 3:1 hairline survives, and whether light gains
  one. It also calls this the "join" segment, while the EditorToolbar mode switch
  (`btn-active` against `btn-ghost`, not a join) is the same device.
- **Proposed fold:** keep the `--btn-border` hairline as the pressed-state cue in both themes (the
  design system's sanctioned device), and let the wash replace only `--btn-bg`. Name rules 10
  and 12 and their test as edited in place, with the selector unchanged so the pin holds. Add
  "the selected state's edge at 3:1 or better against its unselected sibling and the ground"
  to Proof. Say "segmented control" rather than "join segment".

### M4. The shipped cairn-audit norms manifest and its ratified table go stale, and the drift is downgraded silently

- **Location:** `src/lib/audit/norms.ts:241-268` (`RATIFIED_NORMS`: `button-primary`,
  `button-ghost`, `input-text`, `select` border-radius `[10]`; `card` border-radius `[16]`),
  `src/lib/audit/norms-manifest.json` (heights `32` observed, `page-title` font-weight `700`),
  `docs/reference/cairn-audit.md:467-468` (the printed `border-radius 16px ... ratified` example).
  Spec Proof and Documentation (lines 201-247) name none of these.
- **Defect:** the manifest ships in the npm tarball, and consumers query it (`cairn-audit
  norms`) and audit their custom screens against it (`norms-bands`). After this pass, every
  ratified radius pair disagrees with the render. `norms.ts` then downgrades each one to
  `ratified-drift`, and `norms-bands` treats it as unbanded, so the radius norm silently stops
  being checked anywhere. CI's `norms.yml` (`npm run norms:check`) does catch the committed
  file, but only if the plan knows to regenerate rather than to suppress. The advisory
  `weight-budget` rule also reads font-weight, and moving plain and ghost buttons to 500 inside
  content regions can change cairn's own advisory baseline.
- **Proposed fold:** add to the plan: update `RATIFIED_NORMS` (6px field, 8px box), run
  `npm run norms:generate` on the built admin, and keep `norms:check` green. Update the
  `cairn-audit.md` example and add a facts bullet saying the manifest's radius and height bands
  moved. Proof adds a before-and-after `cairn-audit --rendered` run over the showcase admin, with
  the `weight-budget` and `norms-bands` counts recorded. The STATUS watch already notes the
  rendered count is unstable (133 against 116).

### M5. The density step reaches every selector-sized component, which the spec and its layout checks do not account for

- **Location:** spec lines 94-100 ("A `-sm` control grows from 32px to 36px") and 207-208.
- **Defect:** daisyUI 5.7.44 derives `--size` from `--size-selector` in `badge`, `checkbox`,
  `radio`, `toggle`, `kbd`, `loading`, `status`, `range`, and `rating`, and from `--size-field` in
  `button`, `input`, `select`, `fileinput`, `label`, and `tab`. So every size grows, not only
  `-sm`. A default `btn` and `input` go from 40 to 45px, `btn-xs` from 24 to 27px, `badge` from 24
  to 27px, and `badge-sm` and `checkbox-sm` from 20 to **22.5px**. The admin carries 9 `badge`,
  3 `badge-sm`, and 2 `badge-xs` sites. The half-pixel sizes are what the vertical-alignment
  inventory's 1px bar and the `cairn-line-slot` chip recipe (`cairn-admin.css:305-322`) are
  sensitive to. The checkbox hit-slop rule's measured 20-24px
  (`cairn-admin.css:251-259`) and the EditPage bottom-bar note (`min-h-11`, "about 3.8rem",
  `cairn-admin.css:231-240`) restate numbers that change. Widths change too: `--btn-p` adds 4px
  per `btn-sm` segment and the weight drops. Beyond the desk band and toolbar row the spec names,
  the office list's segmented filter (`ListToolbar`) and `Pagination` at 320 are the likeliest
  places to overflow.
- **Proposed fold:** restate the density decision as "every field-sized and selector-sized
  component grows one step" and list the families. Add the office-list filter join, Pagination,
  and a chip-beside-heading row at 320 to the explicit five-viewport checks. Add the
  `viewport-overflow` and `panel-width` rendered rules at 320 and 390 to Proof, and a re-run of
  `vertical-alignment-recipes.test.ts`.
- **OWNER FORK (only if the probe did not render them):** did round 2's ratified render include
  badges and checkboxes at the stepped `--size-selector`? If not, the options are (a) step both
  tokens as specified, or (b) step `--size-field` only and hold `--size-selector` at `0.25rem`,
  which keeps chips and checkboxes on whole pixels. Recommendation: (b), unless the probe shows
  the stepped selector size was seen and approved.

### M6. The draft-docs pass 0+1 is about to fact-check the same reference pages this pass invalidates

- **Location:** `docs/STATUS.md` ("Immediate next action"); plan
  `docs/superpowers/plans/2026-09-26-draft-docs-pass-0-1.md:4` ("lift the narrative-arm freeze"),
  `:438-461` (stage 1 checks every prose claim on each reference page against the facts); spec
  lines 239-247.
- **Defect:** stage 1 verifies `docs/reference/*`, including `cairn-audit.md` (the 16px radius
  example) and `admin-grammar-tokens.md`, against the facts container and the engine on `main`.
  If this pass lands during or after stage 1, those verified pages go stale the day they are
  verified, and nothing re-verifies them. The draft pass also edits `docs/internal/facts/`,
  `CLAUDE.md`, and `docs-register.md`. It changes the freeze rule that spec line 241 relies on
  ("The extend arm is frozen..."). Both passes contend for `## Unreleased`, `docs/STATUS.md`, and
  the one-full-browser-gate-at-a-time lock.
- **Proposed fold:** the theme pass branches from `main` after draft-docs 0+1 merges, or at least
  after its stage 1. Its plan re-reads the freeze rule at plan time instead of inheriting the
  spec's sentence. Its facts bullet and reference edits then land on verified pages, as a normal
  pass-dimension update. Record the ordering in STATUS so a fresh session does not run both.

## Minor

### m1. The Lucide stroke rule hooks a class upstream has marked for removal

- **Location:** spec lines 160-163; `node_modules/@lucide/svelte/dist/Icon.svelte:19` (v1.47.0:
  "`@TODO: maybe drop the extra lucide-icon class altogether`").
- **Defect:** a minor Lucide bump could drop `lucide-icon`, and every stroke would silently
  revert to 2px. A CSS `stroke-width` also overrides any future `strokeWidth` prop. There are
  none today, but a deliberately heavier icon would be flattened with no warning.
- **Proposed fold:** select `svg.lucide`, the stable class the norms manifest's `icon` role
  already uses, and have the design doc say that a heavier Lucide icon needs a scoped exception,
  not a prop.

### m2. The true-circle exemption list is incomplete

- **Location:** spec lines 85-86. Round elements the list does not name: the circular icon
  medallions at `CairnTidySettings.svelte:611`, `:637` (`h-12 w-12`), `:647`, and `:653`
  (`h-5 w-5`); the success dot at `EditPage.svelte:2423`; the spinner at
  `ComponentInsertDialog.svelte:376`.
- **Proposed fold:** state the rule by shape. An element with equal width and height that is a
  dot, disc, spinner, avatar, or switch keeps `rounded-full`. A padded text chip moves to
  `rounded-selector`.

### m3. The toolkit Tooltip radius needs a fallback when mapped to a token

- **Location:** `src/lib/admin-toolkit/Tooltip.svelte:409` (`border-radius: 0.375rem`); spec lines
  78-79.
- **Defect:** toolkit components ship on a public subpath and may mount outside the admin theme
  root. There, `var(--radius-field)` is undefined (square corners) or resolves to the host's
  daisyUI theme. The grammar-token rule in `cairn-admin.css` already requires a literal fallback
  in `src/lib/admin-toolkit`.
- **Proposed fold:** use `var(--radius-field, 0.375rem)`, which equals the new ladder value.

### m4. The plain-button edge reads weaker than a non-interactive chip's

- **Location:** spec lines 109-111; `cairn-admin.css:456-460` (outline chip at 55%),
  `cairn-admin.css:736-743` (field edges at 55%).
- **Defect:** the plain `btn` edge at 22% measures about 1.64:1 against base-100. The outline
  chip, a non-interactive state marker, keeps a 55% edge, about 3.6:1. The WCAG exemption holds
  because the label identifies the button, so this is not a conformance failure. It does invert
  the affordance that pinned rule 6 was built to protect, since a chip now looks more bounded
  than a button.
- **Proposed fold:** name "an outline chip beside a plain button" as an input to the
  felt-refinement audit and the `visual-verifier` read. The spec needs no change.

### m5. The alert construction leaves three cases open and bypasses the palette seam

- **Location:** spec lines 123-140; `alert-success` at `ConceptList.svelte:312`,
  `NavTree.svelte:138`, and `CairnMediaLibrary.svelte:645`; a plain `alert` at
  `LoginPage.svelte:150`; hand-built danger panels at `MediaUploadDialog.svelte:271`,
  `MediaBulkDeleteDialog.svelte:376`, and `MediaReplaceDialog.svelte:431`.
- **Defect:** a success alert exists, but the spec gives it no ink value, and the plain `alert`
  is not addressed. The error and info inks are oklch literals. A site that re-tunes
  `--color-error` or `--color-info` (the documented palette seam) gets alert inks that stay on
  cairn's hue. The existing danger family (`--cairn-error-ink`/`-tint`/`-border`) already styles
  three hand-built error panels. The new `alert-error` recipe differs from it, so the admin ends
  up with two error-panel looks. The estimates are good news: error about 7.2:1 light and 7.7:1
  dark, info about 6.6:1, and warning about 5.5:1 light and 7.0:1 dark, all clearing 4.5:1.
- **Proposed fold:** declare the inks as theme-root tokens (a Tier-2 ledger entry). Reuse
  `--cairn-error-ink` if it clears 4.5:1 on the 7% panel. Add the success ink, and state that a
  bare `.alert` is unchanged. Proof adds the nested `link` inside the refusal alert
  (`ConceptList.svelte:325`) at 4.5:1.

### m6. The starter half ships at merge, and its copy is generated, not hand-edited

- **Location:** spec lines 183-184 and 249-252;
  `packages/create-cairn-site/scripts/emit-template-dir.mjs:1-9`;
  `templates/waymark/README.md:25` (Deploy button URL on `tree/main/templates/waymark`).
- **Defect:** `templates/waymark` is emitted wholesale from the bake. A hand edit "survives at
  most one run", and the `--check` gate fails on drift. The Deploy button and C3 read the
  template from `main`, so the starter change reaches new sites on merge, not at the next
  release. The spec's Release section says nothing ships until then.
- **Proposed fold:** edit the showcase, re-emit the template, and keep the emit `--check` gate
  green, in place of a hand-edited byte-identity check. Correct the Release section to say the
  starter half is live on merge.

### m7. The starter's outline rule has no stated home or scope

- **Location:** spec lines 189-191; `examples/showcase/src/theme/theme.css:1-14` (the header:
  "nothing below duplicates chassis machinery, only chassis VALUES").
- **Defect:** the hairline cannot be a daisyUI theme variable, so it needs a component rule, and
  the showcase compiles daisyUI into the same utilities sublayers (B1 applies). The spec also
  leaves open whether `btn-outline btn-primary` loses its colored edge. The public pages carry
  only plain `btn-outline` today: `members/login/+page.svelte:96`, `members/+page.svelte:37`, and
  the styleguide.
- **Proposed fold:** name the file and layer, scope the rule to an uncolored `btn-outline` and
  `badge-outline`, and keep `test:reskin` and `check:public-tokens` in Proof.

### m8. Proof and gate list gaps

- **Location:** spec lines 201-220.
- **Defect:** these are omitted: `check:custom-surface` (B1), `norms:check` (M4), the live
  `check:touch-targets` and `check:interactive-contrast` against the showcase preview,
  `test:reskin` and the template emit `--check` (m6), and the preview-pane note. The edit page's
  preview iframe is listed out of scope, yet the starter radii reach it, so `admin-visual`
  baselines change for two reasons at once.
- **Proposed fold:** add these to the Proof list. Say plainly that the preview pane changes
  through the starter.

## Checked and clean

- The Bricolage face ships `font-weight: 400 800` in the built sheet's `@font-face`, so the
  heading's `font-[550]` renders a true 550, not a synthesized weight.
- The admin uses no `tabs-box` and no daisyUI `toggle` today, so depth 0 removes no tab-state
  cue. The switch recipe governs a future or consumer switch only.
- The keyboard focus ring is an `outline`, which `--depth` does not affect. The only focus
  hazard is M2's `--btn-color` trap.
- The inks, the switch (neutral track against base-100, base-100 knob against track), and the
  soft-primary text (about 5.1:1 light, 4.8:1 dark) all clear their floors by estimate.
- The `one-filled-action` audit rule reads the computed accent fill, so `btn-soft btn-primary`
  and `btn-neutral` do not trip it.
- A consumer's own `theme.css` is unaffected. Only new sites from the template and the showcase
  change.
