# Admin and starter-template idiomatic re-expression: design

> A foundation-and-sweep initiative for cairn-cms, brainstormed 2026-06-29 on
> `worktree-tag-management-1`. It supersedes the incremental Tasks D/E of
> `2026-06-29-cairn-admin-design-modernization.md` and absorbs the tag-management Plan 3
> vocabulary screen as its proving pilot. Read the charter
> (`docs/internal/what-cairn-is-and-is-not.md`) and the admin design system
> (`docs/internal/admin-design-system.md`) first.
>
> **Revised after an adversarial review** (four lenses: charter, feasibility, a11y/test risk,
> sequencing; 2026-06-29). The review disproved three proposed folds with code evidence,
> right-sized the scope, and hardened the verification and gate design. The "what the review
> changed" note at the end records the deltas.

## What this is, and what it is not

The cairn admin is good. This is not a redesign or a fresh start. STATUS recorded the original
pivot as "start the admin UI fresh"; the brainstorm reassessed that into something narrower and
truer, which Geoff confirmed in session: the admin is not bad, it is **excessively custom in
places**. It carries some bespoke CSS, parallel tokens, and hand-rolled markup where DaisyUI
5.6 and Tailwind 4 now ship a native primitive. This initiative re-expresses those places in
the framework's own primitives, walls the custom that must stay, and installs a gate that holds
the line, so the admin reads as an idiomatic build and survives framework upgrades with less
hand-fixing.

The starter template (`examples/showcase`) gets the same treatment, for the same reason: it is
the scaffold a developer inherits (`create-cairn-site` builds from it), and per the charter its
getting-started scaffold is DaisyUI + Tailwind, the idiom a developer extends in. Its own design
stays its own (not Warm Stone), and its rendered-content typography is brand design the site
legitimately owns.

The look stays. Behavior is ported under the existing test suite, not rewritten. What leaves is
the accidental custom the framework can now carry. As the premise check below makes explicit,
the review showed that accidental surface is smaller than the pivot first assumed.

## Premise check and the honest case

The charter governs every spec with one question: is this cairn's job, and is it the leanest
form? Run honestly, the answer is yes with caveats, and the caveats shape the scope.

**Is it cairn's job?** Yes. The admin frame and the getting-started scaffold are squarely in
cairn's scope; this is maintenance of a surface cairn already owns, not a new subsystem or a new
actor. It adds no feature (the one new screen, the vocabulary admin, comes from the already-specified
tag-management Plan 3, not from this pass).

**Is the value real, and is it the leanest form?** Here the case must be honest, because the
review pushed on it.

- The upgrade tax this removes is **currently small**. The repo just bumped DaisyUI 5.4 to 5.6.6
  and Tailwind to 4.3.2 (`8e0bda1`) with the full gate green and exactly one regression to fix
  (`c25a72c`, a tooltip). A minor bump is already cheap. So upgrade-resilience cannot be the sole
  justification, and this spec does not claim it is.
- The durable value is **the exemplar**. The admin and the template are what an extending
  developer reads and inherits. Idiomatic source is the teaching surface, and bespoke overrides
  teach the wrong idiom. This is the half of "all of the above" (Geoff's framing) that does not
  depend on a future upgrade to pay off.
- The upgrade value is a **stated bet on the next major**. Minor bumps are cheap; a major (DaisyUI
  6, Tailwind 5) is where overrides written against the framework's internal class structure break.
  This spec bets that reducing that surface ahead of a major is cheaper than fixing it under one. It
  is a bet, named as a bet, not a measured certainty.
- The leanest form is **smaller than the pivot implied**. The review's call-site census shows the
  high-volume custom is mostly essential Tier 2 that stays (see the triage): `--color-muted` at 267
  sites and `--color-subtle` are hue-shifted tones an opacity step cannot reproduce identically on
  both themes, so they likely stay; the ink families (~140 sites), `--cairn-card-border` (151), and
  `--cairn-shadow` (21) are Tier 2 by definition. The genuinely-foldable Tier 3 is a modest
  remainder. The work is therefore "idiomatic cleanup plus wall Tier 2 plus a durable gate," not
  "rebuild every component's presentation." The scope is bounded by what is provably excessive, and
  the success criterion is reframed below from "Tier 3 to zero" to "Tier 3 to its proven floor."

This premise check is the reason the scope is what it is. If the proven-foldable remainder turns
out trivially small after Phase 0's audit, the right move is to shrink the sweep, not to invent
folds to justify it.

## The custom-surface triage

The custom surface sorts into three tiers. These examples are pulled from
`src/lib/components/cairn-admin.css` as it stands.

### Tier 1: the Warm Stone theme (keep verbatim; the idiom and the look are the same layer)

`[data-theme='cairn-admin']` already **is** a DaisyUI 5 theme. It sets the DaisyUI theme
variables: every `--color-*` (base-100/200/300 and content, primary, secondary, accent, neutral,
info, success, warning, error, each with its `-content`), `--radius-selector/field/box`,
`--size-selector/field`, `--border`, `--depth`, `--noise`, and the three `--font-*` vars.

This is Warm Stone, already idiomatic DaisyUI theming. It does not change. There is no
parity-versus-idiom tension here: keeping the theme is simultaneously the most faithful and the
most idiomatic choice.

The theme is authored today as a raw `[data-theme]{}` block rather than through DaisyUI's
`@plugin "daisyui/theme"{}` mechanism. The review settled this (it inspected `build-admin-css.mjs`
and the daisyui plugin): the `@plugin "daisyui/theme"` form compiles to exactly the same flat
`[data-theme]{}` var block and would pass the existing scope-transform untouched, so it is
feasible. But it offers no new tokens, and it would **strip the co-located contrast comments**
(the locked AA math interleaved through the var block), which Rule 4 makes load-bearing. So the
**expected and recommended outcome is to keep the raw block** as documented Tier-2 infrastructure,
precisely because the comments must stay with the values. Phase 0 records this rather than
re-opening it.

### Tier 2: essential non-theme custom (keep; walled and documented as the floor)

This tier is real, larger than the pivot assumed, and owned on purpose. It exists because the job
has constraints DaisyUI does not cover, and because some custom is a forced workaround for the
framework's own choices.

- **Accessibility text inks.** DaisyUI's `--color-warning` and `--color-error` are fills tuned
  behind dark content; as small text on a light surface they fall near 2.2:1, under the 4.5:1 AA
  floor. The admin defines the readable small-text counterparts at locked, measured contrast:
  `--cairn-warning-ink`, `--color-positive-ink`, and the `--cairn-error-ink/tint/border` family
  (~140 call-sites total). No native primitive supplies these.
- **The editor system.** `--cairn-directive-*`, `--cairn-focus-dim-*`, `--cairn-code-chip`,
  `--cairn-tidy-*` are CodeMirror `EditorView.theme` territory. No DaisyUI equivalent exists.
- **The embed-anywhere infrastructure.** The admin self-styles on any host with no host CSS and no
  global Preflight, which forces the box-sizing reset, the bare-button (`button:not(.btn)`) and
  anchor Preflight-replacement resets, the post-compile `@font-face` rebasing, and the
  `postcss-prefix-selector` scoping. These live in `@layer components` by necessity, so a naive
  "count components-layer rules" metric must exempt them (see the gate design).
- **The two unlayered exceptions, reclassified here by the review.** The `.menu` `:focus-visible`
  ring and the `.btn.cairn-btn-guarded[aria-disabled]` pointer-events restore are *not* excessive
  custom. They are forced workarounds: a layered rule cannot outrank DaisyUI's own utilities-layer
  rules, so these must stay unlayered, and both fix real shipped bugs (lost menu focus, a killed
  tooltip). They stay, pinned by exact selector, and the gate guards them against deletion and
  against multiplication.
- **The `.btn-primary` lift, reclassified here by the review.** The bespoke soft-violet shadow lift
  cannot fold onto the theme's native `--depth`: depth is already global at 1, the lift is additive
  on top of it, and native depth has a tight 4px blur with no hover-growth, while the lift is a soft
  16px violet glow that grows on hover. It is design intent the primitive does not express, so it
  stays Tier 2.
- **`--color-muted` / `--color-subtle`, likely Tier 2.** These are desaturated, hue-shifted tones,
  not opacity steps, and the dark theme inverts which reads stronger (`subtle` is the stronger role
  per the design system, yet sits lighter than `muted` on dark). One `base-content/NN` opacity step
  cannot reproduce "subtle stronger than muted" on both themes, and opacity over the non-opaque
  base-200 composites differently than over base-100, where the AA floor is asserted on both. Phase
  0 publishes the measured per-theme, per-surface ratio table; a role folds only if a single opacity
  step holds the AA floor on both surfaces in both themes *and* preserves the muted/subtle ordering.
  The realistic outcome is they stay Tier 2 with guaranteed values, and only new incidental
  secondary text uses an opacity utility.
- **The theme-adaptive elevation pair** `--cairn-shadow` / `--cairn-card-border`. Tier 2.

**The key deliverable for this tier: it lives in one labeled home, with its contrast floors
co-located, owned on purpose.** Today the essential custom is interleaved through `cairn-admin.css`.
The pass walls it into a single, clearly labeled home (a partition of the source sheet, or a
dedicated partial the build concatenates) with each locked contrast value stated beside its token,
so a reader sees the whole essential floor at once and knows it is deliberate. Tier 2 is the answer
to "why is there any custom CSS at all," and that answer should be one page, not a scavenger hunt.

### Tier 3: excessive custom (the proven-foldable remainder; the target)

The review pared this list to what the code supports. A candidate is Tier 3 only when a native 5.6
primitive provably replaces it without losing an accessibility cue or a design intent.

- **Genuine native primitives to adopt where they help:** `status` (the status dot), `floating-label`,
  and `tab` all ship in DaisyUI 5.6 (verified in `node_modules/daisyui/components/`). Note
  `floating-label` is a *new* pattern, not a re-expression: the admin's fields use the v5
  `fieldset`/`legend` idiom, so adopting floating labels is an addition to weigh, not a fold of an
  existing control.
- **Retired token references in markup:** `text-[var(--color-muted)]` / `text-[var(--color-subtle)]`
  arbitrary-token references migrate to the role layer **if** the Tier-2 investigation above clears
  the fold; otherwise they migrate to a named guaranteed-value utility. Either way the arbitrary
  `[var(--…)]` reference in `.svelte` leaves.
- **Truly redundant `@layer components` overrides:** any scoped override that exists only to
  re-create something 5.6 now ships natively, evaluated one by one against the load-bearing-rules
  invariant list (most of the current block is Tier 2, so this set is small).

**Explicitly NOT Tier 3 (the review rejected these as fold targets):**

- The segmented / check-and-tint control and card-selectable states have **no native 5.6 primitive**.
  The closest, `.filter`, hides non-selected segments (`opacity:0;width:0`) and renders no check
  glyph, which would break the deliberate WCAG 1.4.1 non-color cue. These stay hand-rolled (Tier 2 by
  Rule 3's own "wherever 5.6 ships one" logic).
- The `.btn-primary` lift, the two unlayered rules, and `--color-muted`/`--color-subtle` (pending the
  ratio table). All reclassified to Tier 2 above.

The initiative, restated honestly: **adopt the genuine primitives, migrate the retired token
references, fold the small redundant-override remainder, wall Tier 2 as the documented floor, and
install a gate that holds the line.**

## The starter template

`examples/showcase` carries its own custom surface: `src/lib/theme.css` (its DaisyUI theme and
tokens), `src/lib/prose.css` (the rendered-content typography), `src/lib/site.css`, the `SiteHeader`
and `SiteFooter` components, the `(site)` route layouts and pages, and a `styleguide` route that is
the template's analog of the admin's live-components bar. The same three tiers and five rules govern
it, with two differences from the charter's design-agnostic boundary.

- **Tier 1 is the template's own theme, not Warm Stone.** The showcase has its own DaisyUI theme. It
  is kept and treated as idiomatic theming. This pass does not impose Warm Stone on the public site;
  the public output is design-agnostic by charter.
- **Tier 2 includes the content and brand design the site legitimately owns:** the rendered-markdown
  typography (`prose.css`), the `.cairn-place-*` figure-placement classes (the contract cairn defines
  and the site styles), and the genuine brand styling. These are not excessive custom; they are the
  design a scaffolded site owns and will restyle. The pass keeps them clean, walls and documents them,
  and does not try to delete them. A developer reading the scaffold should see at a glance what is
  cairn's frame and what is theirs to change.
- **Tier 3 is the same target:** bespoke patterns in `site.css`, the components, and the route markup
  where a Tailwind 4 or DaisyUI 5.6 primitive provably exists.

`check:custom-surface` and the upgrade rehearsal extend to cover the showcase tree with its own
budget and its own Tier-2 allowlist. Sequencing of this track is in the phasing section; it is not
truly parallel.

## The five de-customization rules

Every surface obeys these, and a plan task that violates one is wrong.

1. **Theme values stay in the theme.** Tier 1 is never duplicated into a component.
2. **A named role, a themed value.** Semantics live in named component classes or utilities; values
   resolve from the theme. A component writes `text-muted` (the role), never `text-[var(--color-muted)]`
   (a parallel token) and never a bare `/60` (an anonymous magic number). The role layer is published
   only after Phase 0's ratio table proves each role; a role that cannot fold to an opacity step keeps
   a named guaranteed-value utility, which still satisfies the rule (named role, themed value) without
   the opacity claim.
3. **A native primitive replaces a hand-rolled one only where 5.6 provably ships one** (`status`,
   `floating-label`, `tab`; not segmented, not card-selectable). Idiom wins at the component layer; a
   primitive that drops an accessibility cue is not a replacement.
4. **Essential custom is walled and documented, not scattered.** Tier 2 lives in one labeled home with
   its contrast floors, owned on purpose, with its load-bearing rules pinned by exact selector.
5. **The theme anchors the look, so component-level pixel drift is acceptable and usually an
   improvement** — but drift is caught, not waved through (see the verification section: a per-phase
   showcase screenshot baseline is the record of intended drift).

## The resilience mechanism

Three pieces turn this from a one-time cleanup that rots into a standing property.

### `check:custom-surface`: a ratchet gate built on enumerable signals

The review rejected a line-count metric: classifying a line as theme/essential/excessive is the human
judgment the pass is making, line counts are gamed by reformatting, and a raw arbitrary-value count
would flag the design system's own sanctioned patterns (`bg-primary/10`, `bg-base-content/[0.04]`). The
gate is instead defined on enumerable, unambiguous signals:

- **The unlayered-rule set, pinned by exact selector.** Currently exactly two (the `.menu` focus ring
  and `.cairn-btn-guarded` pointer-events). The gate pins the *exact set*: neither may be deleted nor a
  third added without an explicit, reviewed allowlist change. This guards the forced workarounds against
  both loss and proliferation.
- **A hard cap on `@layer components` rule selectors** in `cairn-admin.css`, excluding the named Tier-2
  infrastructure rules (the resets), which are themselves pinned by selector.
- **A retired-token budget that ratchets to zero:** the count of `text-[var(--color-muted)]` /
  `text-[var(--color-subtle)]` (and peers, once the role set is fixed) in `*.svelte`, seeded per-tree at
  the current count and lowered by each sweep phase as it retires its cluster's tokens. The migration is
  complete when the budget reaches zero. (Phase 0 retires only the pilot-adjacent files, so the budget
  starts below the raw total, not at it.)
- **A frozen Tier-2 allowlist, by exact token name, not by category.** Adding to it requires a
  one-line charter-premise note, so the "justify into Tier 2" escape hatch cannot become a silent
  regrowth path.

**Seeding and scope, so the gate is not a CI footgun.** The gate is per-tree: an admin budget over
`src/lib/components` and a separate showcase budget over `examples/showcase/src`, so neither tree's
count blocks the other. It is seeded in Phase 0 at the **current measured values** (it passes on day
one and blocks nothing). Each sweep phase's plan **lowers that phase's caps to its own post-sweep
count** as part of that phase's gate. The ratchet is per-phase and manual-floor, never an absolute
target enforced before the sweep delivers it. `check:custom-surface` is a hard Phase-0 exit criterion:
it must exist and be green before any sweep phase opens, and Phase 1 is gated on it being green. It
complements, and does not replace, `admin-css-build.test.ts` (which guards structural invariants; see
verification).

### Theme via `@plugin`: resolved, not deferred

Settled by the review (above): keep the raw `[data-theme]{}` block as Tier-2 infrastructure for the
co-located contrast comments. Phase 0 records the finding; there is no open investigation here.

### The upgrade rehearsal: a documented procedure plus a scheduled watcher

The North Star ("a major bump recompiles cleanly") is an **external trigger** (an upstream major
publishes), and the repo's convention answers an external trigger with a scheduled cloud agent, not an
always-on CI canary that tests an upgrade nobody is performing. So the rehearsal is two parts:

- **A documented procedure** a human runs at upgrade time: bump DaisyUI/Tailwind, recompile the admin
  sheet, run the showcase screenshot baseline, read the diff.
- **A scheduled watcher** (via the `schedule` skill) that pings only when a new DaisyUI or Tailwind
  major actually publishes, the same pattern CLAUDE.md cites for the SvelteKit `checkOrigin` watch. It
  does not run the bump on every CI pass.

## Phasing

Each phase is its own just-in-time plan under `docs/superpowers/plans/`, written after the prior one
lands, adversarially reviewed before execution, executed task-by-task via `cairn-implementer` (Sonnet)
with the main loop reviewing each diff and clearing the gate.

### Phase 0: foundation (scoped to what the pilot needs, so the release is not hostage to the full sweep)

The review's central sequencing fix: Phase 0 delivers only what the pilot consumes plus the durable
gate, not the entire idiomatic foundation. The broad audit beyond the pilot's primitives, and the
scheduled watcher, may complete alongside or in Phase 1 rather than blocking the release.

- Audit the custom surface into the Tier-1/2/3 ledger (a committed artifact), including the
  presence-only a11y tests (see verification) and the test selectors coupled to fold targets.
- **Publish and freeze the role-layer interface** the pilot will use: produce the measured per-theme,
  per-surface ratio table, decide each role's fold-or-guaranteed-value outcome, and fix the utility
  names. This interface is frozen and contrast-validated *before* the pilot starts, so a later
  investigation cannot reshape what the pilot already consumes.
- Re-express only the core shared primitives the pilot needs: button, card, badge, dialog, the eyebrow,
  the empty state, and the segmented control (re-housed as-is, since it stays hand-rolled).
- Wall Tier 2 into its single labeled home with the contrast floors and the load-bearing-rules invariant
  list (mirroring the admin-design-system "break these and the admin renders wrong" set: layer ordering,
  the nesting-flatten, the post-compile `@font-face`, the resets, the two unlayered rules).
- Stand up `check:custom-surface`, seeded at current values, per-tree, as a hard exit criterion.
- Record the resolved investigations (theme-as-plugin: keep raw block; `.btn-primary` lift: stays Tier
  2).
- **Deliverable: the pilot's primitive layer, the frozen role interface, the walled Tier 2, and the
  gate.**

### Phase 0 to Phase 1 contingency gate

Phase 1 (and the held release) is contingent only on the pilot, which is contingent only on the
**frozen role-layer interface**, not on any unresolved investigation. The theme-as-plugin and
`.btn-primary` questions are resolved to "stays Tier 2" and carry no schedule impact. If the ratio
table forces a role to a guaranteed-value utility, the interface still freezes (with that utility) and
the pilot proceeds. There is no path by which a Phase 0 investigation silently cascades into the
release.

### Phase 1: pilot and ship

- Build the vocabulary admin screen (tag-management Plan 3) natively on the frozen Phase 0 interface. It
  is a new screen with no bespoke legacy and a near-twin of `CairnTidySettings`, the ideal first
  consumer.
- Finish the rest of tag-management Plan 3: the route pair already landed (`9ba8791`); this phase adds
  the size-gated showcase filter (`TAG_FILTER_MIN_ENTRIES = 12`), the e2e, and Plan 3's seed/orphan flow
  on the new idiom.
- **Cut the held tag-management release** (the first free minor after `0.77.0`; verify free with
  `npm view` at cut time).

> **Sequencing note (flagged for Geoff, a change from the chosen "foundation-first").** The original
> sequencing was foundation-first with the vocab screen as pilot. The review flagged (charter, as a
> blocker; sequencing, with a fix) that this holds a shippable release behind speculative infrastructure.
> The revision keeps Geoff's intent (the pilot is built on the new idiom, so it is built once) while
> removing the hostage problem, by scoping Phase 0 to only the pilot's needs. If a faster release is
> worth more than building the vocab screen once, the alternative is to ship tag-management Plan 3 on the
> current idiom now and re-express it during the sweep like every other surface. That call is Geoff's.

### Phases 2 to 6: the sweep (a closed set, not open-ended)

The clusters are enumerated, so N is closed. Each phase is test-first and lowers its `check:custom-surface`
caps to its post-sweep count. "Done" for the admin tree is a terminal state: the Tier-3 signals are at
their proven floor (retired tokens gone, the redundant-override remainder folded, the genuine primitives
adopted where chosen), the Tier-2 allowlist is the complete reviewed floor, and every named component is
swept.

- **Phase 2 — Office chrome:** `AdminLayout`/shell, `NavTree`, `ConceptList`, `LoginPage`/`ConfirmPage`,
  the empty states, the dialog family (`DeleteDialog`, `RenameDialog`, `ShortcutsDialog`, `WebLinkDialog`,
  `EntryPicker`, `LinkPicker`, `IconPicker`).
- **Phase 3 — Forms and settings:** `FieldInput`, `ReferenceField`, `ObjectGroupField`, `RepeatableField`,
  `CairnTidySettings`, `ManageEditors`, `HelpHome`.
- **Phase 4 — Desk chrome:** `EditPage` chrome (the topbar context portal, the slide-overs, the headless
  dialogs), `EditorToolbar`, the footer environment strip. **Not** the CodeMirror content theme.
- **Phase 5 — Media, part one:** `CairnMediaLibrary`'s grid/listbox and triage radiogroup, `MediaPicker`.
  The review flagged `CairnMediaLibrary` (175 KB, six distinct a11y models, a 1592-line test) as
  unreviewable in one diff, so the component is split along its a11y seams across two phases.
- **Phase 6 — Media, part two:** `CairnMediaLibrary`'s non-modal slide-over and safe-delete alertdialog,
  `MediaCaptureCard`, `MediaHeroField`, `MediaInsertPopover`, `MediaFigureControl`.
- **Walled and validated unchanged:** the `MarkdownEditor` `EditorView.theme` (directive rails, fold
  gutter, syntax highlight, media decorations). Tier 2; the sweep confirms it is untouched.

### The starter-template track (serialized, not parallel)

The template track is independent in *scope* (it touches `examples/showcase`, not `src/lib/components`)
but **serialized through the shared e2e and `file:../..` package gate**: the showcase consumes the
packaged admin, so an admin-primitive change can break the showcase build and a showcase change runs the
admin e2e. The track therefore lands *after* the admin primitive layer is published into the showcase's
`file:` dependency, so the template builds against a stable admin. It is two phases:

- **Template foundation:** audit `examples/showcase` into its own Tier-1/2/3 ledger; wall and document its
  owned design (`prose.css`, the `.cairn-place-*` contract, the brand styling) as the template's Tier 2;
  extend `check:custom-surface` to the showcase tree with its own seeded budget.
- **Template chrome:** `SiteHeader`, `SiteFooter`, the `(site)` layouts and pages, the `styleguide` route,
  folding the bespoke `site.css` and `theme.css` remainder onto Tailwind 4 and DaisyUI 5.6 primitives
  where one provably exists.

### Final phase: docs

Rewrite `admin-design-system.md` from "bespoke recipes" to "native primitives plus the documented
essential floor," and document the template's owned design and idiomatic chrome the same way. Add the
upgrade-rehearsal procedure and wire the scheduled watcher. Update STATUS and the
`cairn-admin-design-modernization` memory.

## Behavior preservation and verification

The existing test suite (2838 at the time of this spec) is the contract, but the review showed it is not
a sufficient net on its own. Three gaps are closed as first-class deliverables.

- **Structural invariants are non-negotiable.** `src/tests/unit/admin-css-build.test.ts` is not a
  byte-pin; it asserts the embed-anywhere and cascade-layer invariants (scope present, no global-reset
  leakage, the nesting-flatten, the four `@font-face` URLs, the unlayered menu-focus exception). As the
  sheet shrinks, **only the present-class lists may shrink; an invariant assertion may never be removed or
  weakened.** Dropping a `not.toMatch` re-opens a real shipped bug (the drawer `display:block`, the auth
  centering). The test file states this distinction in a comment so a future editor cannot relax an
  invariant under cover of "the sheet changed."
- **A per-phase visual gate, because the component tests are visually blind.** The browser component tests
  import the variables-only partial, not the compiled sheet, so they cannot see a DaisyUI-component visual
  regression even in principle, and Rule 5 demotes screenshots to advisory. To catch accumulated drift
  during the sweep (not only at upgrade time), each sweep phase stands up and runs a Playwright
  `toHaveScreenshot` baseline over the live-components bar and the pilot screen. A reviewed, committed
  baseline update is the explicit record of intended drift, the same discipline applied to the CSS test.
- **Selector de-coupling is a first-class deliverable, not a side effect.** Component tests bind to classes
  that are fold targets (`EditPage.test.ts` couples to `.alert`, `.badge`, `.cairn-save-state .bg-warning`).
  When a phase folds those classes, the test goes red in a way that looks like a regression but is an
  intended idiom change. So before each sweep phase, the plan inventories the test selectors coupled to that
  cluster's folded classes and pre-declares which assertions migrate to `getByRole`/`data-testid`/role
  selectors as part of the port. A red test is then a known migration, never an ambiguous regression.
- **Presence-only a11y tests are hardened ahead of their cluster.** The roving-tabindex and dual-live-region
  math is genuinely pinned in places (`CairnMediaLibrary.test.ts`, `tidy-review.test.ts:173`), but the
  parallel MediaPicker live-region discipline is tested only as `live.length >= 2` (`MediaPicker.test.ts:90`),
  pure presence. A re-expression that wires both regions to one source passes it while breaking the
  clobber-avoidance the design system names load-bearing. Phase 0 enumerates the presence-only a11y tests in
  the ledger, and the cluster that touches each one upgrades it to the behavioral assertion
  `tidy-review.test.ts:173` models before re-expressing.

`daisyui-a11y-reviewer` is the load-bearing reviewer at every gate, alongside `svelte-reviewer`, with the
explicit understanding that a reviewer reads a diff and does not re-derive a keyboard model, which is why the
hardened tests above carry the contract. The full `check:*` family stays green, plus `check:custom-surface`.

## Hard floors and constraints

- **Embed-anywhere.** The admin self-styles on any host with no host CSS and no global Preflight. The
  compiled output must stay standalone through every change.
- **The CodeMirror writing surface.** The editor's content theme has no DaisyUI primitive and is a settled
  design. It is preserved, not re-expressed.
- **The load-bearing-rules invariant list.** Layer ordering, the nesting-flatten, the post-compile
  `@font-face`, the resets, and the two unlayered rules are invariants the sweep treats as fixed, not fold
  targets.

## Open investigations (resolved in Phase 0, recorded in the ledger)

1. **The per-role `base-content` opacity fold.** For each secondary-text role, does a single opacity step
   reach the locked AA floor on both `base-100` and `base-200` in both themes *and* preserve the muted/subtle
   ordering? Publish the ratio table; fold the roles that pass, keep the rest as Tier-2 guaranteed-value
   utilities. (The realistic expectation, per the review, is that most stay Tier 2.)

(The theme-as-plugin and `.btn-primary --depth` questions are resolved above, not open.)

## Non-goals

- No redesign. Warm Stone is preserved for the admin; the template keeps its own look; Warm Stone is not
  imposed on the public site.
- No rewrite of behavior or logic. Loads, actions, the `CairnAdmin` view switcher, the media pipeline, and
  the editor instrument are ported and re-housed, never re-derived. Where a native primitive forces a markup
  change, the selector-de-coupling deliverable keeps that change from masquerading as a behavior change.
- No new admin features. The vocabulary screen is the one new surface, from tag-management Plan 3.
- No change to the CodeMirror content theme.
- No invention of folds to justify scope. The sweep targets only the provably-excessive remainder; if that is
  small, the sweep is small.

## Success criteria

- `check:custom-surface` exists and is green for both the admin and the starter template, per-tree, seeded at
  current and ratcheted to each phase's proven floor. "Tier 3 to its **proven floor**" (retired tokens gone,
  the genuine primitives adopted where chosen, the redundant-override remainder folded), not an absolute zero
  that the investigations may not support.
- Tier 2 lives in one labeled home with its contrast floors stated and its load-bearing rules pinned by
  selector, for the admin and the template's owned design; `admin-design-system.md` describes both as native
  primitives plus that documented floor.
- The structural invariants in `admin-css-build.test.ts` are intact (never weakened), the per-phase
  screenshot baselines are committed records of intended drift, the selector-coupled assertions are migrated
  to role/test-id selectors, and the presence-only a11y tests are upgraded to behavioral assertions.
- The upgrade-rehearsal procedure is documented and the scheduled watcher is wired (no always-on canary).
- Every component keeps its tests green; the a11y contracts are intact under `daisyui-a11y-reviewer`.
- The Warm Stone look reads as unchanged in spirit; component-level drift is deliberate, screenshot-recorded,
  and reviewed.
- The held tag-management release ships after Phase 1, on the new idiom.

## What the adversarial review changed

- **Disproved three folds.** `--color-muted`/`--color-subtle` to opacity (hue-shifted tones, dark-theme
  inversion, base-200 compositing), the `.btn-primary` lift to `--depth` (additive, no hover-growth in
  native depth), and theme-as-`@plugin` as a net win (strips the load-bearing comments). All reclassified to
  Tier 2.
- **Corrected the native-primitive list.** `status`/`floating-label`/`tab` are real; segmented/check-and-tint
  and card-selectable have no native equivalent and stay hand-rolled; `.filter` rejected (breaks the
  non-color cue).
- **Reclassified the two unlayered rules and the Preflight resets** from Tier-3 fold candidates to Tier-2
  forced infrastructure, pinned by selector.
- **Redefined the gate** from line-counting to enumerable signals (pinned selector sets, retired-token
  detection, a frozen by-name allowlist), with explicit per-tree seeding so it is not a CI footgun.
- **Decoupled the release from the full foundation** by scoping Phase 0 to the pilot's needs and adding the
  frozen-role-interface contingency gate; flagged the residual sequencing call for Geoff.
- **Closed the open-ended sweep** into Phases 2 to 6 with a terminal "done" state, and split the 175 KB Media
  component across two phases along its a11y seams.
- **Hardened verification:** non-negotiable structural invariants, a per-phase screenshot baseline, selector
  de-coupling as a deliverable, and presence-only a11y tests upgraded before their cluster.
- **Added the premise check** and an honest account of the (currently small) upgrade tax, reconciled with the
  STATUS "fresh start" pivot, and reframed the scope as smaller than the pivot assumed.
