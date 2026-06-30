# Admin and starter-template idiomatic re-expression: design

> A foundation-and-sweep initiative for cairn-cms, brainstormed 2026-06-29 on
> `worktree-tag-management-1`. It supersedes the incremental Tasks D/E of
> `2026-06-29-cairn-admin-design-modernization.md` and absorbs the tag-management Plan 3
> vocabulary screen as its proving pilot. Read the charter
> (`docs/internal/what-cairn-is-and-is-not.md`) and the admin design system
> (`docs/internal/admin-design-system.md`) first.

## What this is, and what it is not

The cairn admin is good. It is not bad, and this is not a redesign or a fresh start. The
problem is narrower and more durable: the admin is **excessively custom**. It carries
bespoke CSS, parallel color tokens, and hand-rolled markup in places where DaisyUI 5.6 and
Tailwind 4 now ship a native primitive. Every line of that custom surface is a tax paid on
every framework upgrade, because a bespoke override is exactly what a DaisyUI or Tailwind
bump can silently break.

This initiative re-expresses every admin surface in the framework's own primitives, keeps
the Warm Stone theme verbatim, and shrinks the custom surface to its irreducible floor. The
look stays. The behavior stays, ported under the existing test suite, not rewritten. What
leaves is the accidental custom that the framework can now carry for us.

**The starter template gets the same treatment.** `examples/showcase` is the scaffold a
developer inherits (`create-cairn-site` builds from it), and per the charter its
getting-started scaffold is DaisyUI + Tailwind, the idiom a developer extends in. A clean,
idiomatic, upgrade-resilient template matters as much as the admin, because the developer
lives in it. The same North Star, the same triage, the same gate, and the same upgrade
rehearsal apply to the showcase. The one difference is that the template carries its own site
design rather than Warm Stone, and its rendered-content typography is brand design the site
legitimately owns. See "The starter template" below.

**North Star: upgrade-resilience.** When DaisyUI or Tailwind majors, the admin and the starter
template should both recompile cleanly and screenshot-diff quiet, because almost nothing in
either fights the framework. The success of this work is measured years out, at the next
upgrade, not at the end of the pass.

## The custom-surface triage

The custom surface sorts into three tiers. Naming them is what makes "excessively custom"
precise and actionable. These examples are pulled from `src/lib/components/cairn-admin.css`
as it stands.

### Tier 1: the Warm Stone theme (keep verbatim; the idiom and the look are the same layer)

`[data-theme='cairn-admin']` already **is** a DaisyUI 5 theme. It sets the DaisyUI theme
variables: every `--color-*` (base-100/200/300 and content, primary, secondary, accent,
neutral, info, success, warning, error, each with its `-content`), `--radius-selector/field/box`,
`--size-selector/field`, `--border`, `--depth`, `--noise`, and the three `--font-*` vars.

This is Warm Stone, and it is already idiomatic DaisyUI theming. It does not change. There is
no parity-versus-idiom tension at this layer: keeping the theme is simultaneously the most
faithful and the most idiomatic choice.

One idiomatic upgrade is in scope to **investigate** (not assumed): the theme is authored
today as a raw `[data-theme]{}` variable block, with a deliberate comment that this keeps the
sheet self-contained (DaisyUI v5 reads the vars at point of use, so the admin needs no host
`@plugin` and no host build step). Authoring it through DaisyUI's `@plugin "daisyui/theme"{}`
mechanism in source, compiled down into the same self-contained sheet by
`build-admin-css.mjs`, would let a future DaisyUI theming change flow through the plugin
rather than past a hand-written block. Phase 0 proves whether the compiled output stays
standalone (the embed-anywhere constraint is non-negotiable); if it cannot, the raw block
stays and is recorded as Tier 2.

### Tier 2: essential non-theme custom (keep; no native equivalent exists)

This tier is real and owned on purpose. It exists because the job has constraints DaisyUI
does not cover.

- **Accessibility text inks.** DaisyUI's `--color-warning` and `--color-error` are tuned as
  fills behind dark content; as small text on a light surface they fall near 2.2:1, under the
  4.5:1 AA floor. The admin defines the readable small-text counterparts at locked, measured
  contrast: `--cairn-warning-ink`, `--color-positive-ink`, and the `--cairn-error-ink/tint/border`
  family. No native primitive supplies these.
- **The editor system.** `--cairn-directive-*` (the nested-directive depth ramp and its rail
  alphas), `--cairn-focus-dim-*`, `--cairn-code-chip`, and `--cairn-tidy-*` are CodeMirror
  `EditorView.theme` territory. There is no DaisyUI equivalent for a markdown editor's syntax
  theme, the directive rails, the fold affordance, or the tidy diff.
- **The embed-anywhere infrastructure.** The admin ships a scoped sheet that self-styles on
  any host with no host CSS and no global Preflight. That forces the box-sizing reset, the
  bare-button and anchor Preflight-replacement resets, the post-compile `@font-face` rebasing,
  and the `postcss-prefix-selector` scoping. These are architectural, not gratuitous.
- **The theme-adaptive elevation pair** `--cairn-shadow` / `--cairn-card-border`, pending the
  Phase 0 finding on whether DaisyUI's native `--depth` plus a native card treatment can carry
  the same lift on both themes. If they can, this folds to Tier 3 and leaves; if not, it stays
  here.

**The key deliverable for this tier: it lives in one labeled place, with its contrast floors
co-located, owned on purpose.** Today the essential custom is interleaved with the rest of
`cairn-admin.css`. The pass walls it into a single, clearly labeled home (a partition of the
source sheet, or a dedicated partial the build concatenates) with each locked contrast value
stated beside its token, so a reader sees the whole essential floor at once and knows it is
deliberate. Tier 2 is the answer to "why is there any custom CSS at all," and that answer
should be one page, not a scavenger hunt.

### Tier 3: excessive custom (the target; drive toward zero)

- The parallel text tones `--color-muted` / `--color-subtle`, which fold onto native
  `base-content` opacity **if the locked contrast holds** (see the role-layer rule below).
- The bespoke `.btn-primary` box-shadow lift, a candidate to fold onto the theme's native
  `--depth: 1` feature.
- The `@layer components` overrides and the two unlayered exceptions that exist only to
  re-create something 5.6 now ships natively, evaluated one by one.
- Hand-rolled markup where 5.6 added a native primitive: the segmented / check-and-tint
  control, card-selectable states, floating labels, the `status` component.
- Arbitrary-value utilities (`bg-base-content/[0.04]`, `text-[var(--color-muted)]`) where a
  native scale step or semantic role exists.

The initiative is, in one line: **Tier 3 to zero; Tier 1 and Tier 2 documented as the floor;
a gate that holds the line so Tier 3 cannot regrow.**

## The starter template

`examples/showcase` carries its own custom surface: `src/lib/theme.css` (its DaisyUI theme and
tokens), `src/lib/prose.css` (the rendered-content typography), `src/lib/site.css`, the
`SiteHeader` and `SiteFooter` components, the `(site)` route layouts and pages, and a
`styleguide` route that is the template's analog of the admin's live-components bar. The same
three tiers and the same five rules govern it, with two differences that follow from the
charter's design-agnostic boundary.

- **Tier 1 is the template's own theme, not Warm Stone.** The showcase has its own DaisyUI
  theme expressing the example site's look. It is kept and treated as idiomatic theming, the
  same way Warm Stone is for the admin. This pass does not impose Warm Stone on the public
  site; the public output is design-agnostic by charter, and the template demonstrates a site
  bringing its own design.
- **Tier 2 includes the content and brand design the site legitimately owns.** The
  rendered-markdown typography (`prose.css`), the `.cairn-place-*` figure-placement classes
  (the contract cairn defines and the site styles), and the genuine brand styling are not
  "excessive custom." They are the design a scaffolded site owns and will restyle. The pass
  keeps them clean and idiomatic, walls and documents them as the template's owned design, and
  does not try to delete them. The same labeled-home discipline applies: a developer reading
  the scaffold should see at a glance what is cairn's frame and what is theirs to change.
- **Tier 3 is the same target.** Bespoke patterns in `site.css`, the components, and the route
  markup where a Tailwind 4 or DaisyUI 5.6 primitive exists are folded onto the primitive, so
  the developer inherits idiomatic, upgrade-resilient source rather than a thicket to maintain.

The `check:custom-surface` gate and the upgrade rehearsal both extend to cover the showcase,
so the template holds its line the same way the admin does, and the rehearsal already
screenshot-diffs the showcase, which means it proves both surfaces in one run.

## The five de-customization rules

Every surface obeys these, and a plan task that violates one is wrong.

1. **Theme values stay in the theme.** Tier 1 is never duplicated into a component.
2. **A named role, a themed value.** Semantics live in named component classes or utilities;
   values resolve from the theme. A component writes `text-muted` (the role), never
   `text-[var(--color-muted)]` (a parallel token) and never a bare `/60` (an anonymous magic
   number). The role layer for secondary text is a small set of Tailwind 4 `@utility`
   definitions compiled into the sheet, mapped onto `base-content` opacity, each validated
   against the same AA floor the current locked vars hold. If an opacity step cannot reach the
   floor, that role stays Tier 2 with a guaranteed value. No silent contrast regression.
3. **A native primitive replaces a hand-rolled one wherever 5.6 ships one.** Idiom wins at the
   component layer.
4. **Essential custom is walled and documented, not scattered.** Tier 2 lives in one labeled
   home with its contrast floors, owned on purpose.
5. **The theme anchors the look, so component-level pixel drift is acceptable and usually an
   improvement.** Screenshots are a review aid, not a gate.

## The resilience mechanism

Three pieces turn this from a one-time cleanup that rots into a standing property.

- **`check:custom-surface`, a ratchet gate.** A script that counts the Tier-3 indicators
  (non-theme, non-essential lines in `cairn-admin.css`; `@layer components` overrides;
  unlayered exceptions; arbitrary `[var(--…)]` and `[0.0x]` utilities in
  `src/lib/components/*.svelte`) against a budget that only ever ratchets down. New custom
  must either fold away or be justified into the documented Tier-2 floor (an explicit
  allowlist), or CI fails. This is the durable line-holder, the same gold standard the repo
  already uses for `check:reference` and `check:version`: a watch converted into a failing
  test cannot be forgotten. The gate scans both surfaces: `src/lib/components` for the admin
  and `examples/showcase/src` for the starter template, each with its own budget and its own
  Tier-2 allowlist.
- **Theme via `@plugin "daisyui/theme"`** if Phase 0 proves the compiled sheet stays
  self-contained.
- **The upgrade rehearsal.** A documented procedure, and a CI canary, that bumps DaisyUI and
  Tailwind to latest, recompiles the admin sheet, and screenshot-diffs the showcase. An
  upgrade becomes a known cheap operation rather than an open-ended audit. This is the live
  proof that the North Star holds.

## Phasing

Each phase is its own just-in-time plan under `docs/superpowers/plans/`, written after the
prior one lands, adversarially reviewed before execution, executed task-by-task via
`cairn-implementer` (Sonnet) with the main loop reviewing each diff and clearing the gate.

### Phase 0: foundation

- Audit the full custom surface into the Tier-1/2/3 ledger (a committed artifact).
- Build the semantic role layer (muted, subtle, and peers) as contrast-validated named
  utilities; prove or refute the `base-content` opacity fold for each.
- Re-express the core shared primitives natively: button, card, badge, dialog, eyebrow, empty
  state, and the segmented / check-and-tint control.
- Wall Tier 2 into its single labeled home with the contrast floors.
- Investigate theme-as-plugin and the `--depth` fold for the `.btn-primary` lift.
- Stand up `check:custom-surface` and the upgrade rehearsal.
- **Deliverable: the idiomatic primitive layer and the gate.**

### Phase 1: pilot and ship

- Build the vocabulary admin screen (tag-management Plan 3) natively on the Phase 0
  foundation. It is a new screen with no bespoke legacy to unwind and a near-twin of the
  existing `CairnTidySettings`, which makes it the ideal first real consumer of the new
  primitive layer.
- Finish the rest of tag-management Plan 3: the route pair already landed (`9ba8791`); this
  phase adds the size-gated showcase filter (`TAG_FILTER_MIN_ENTRIES = 12`) and the e2e, and
  carries Plan 3's seed/orphan flow built on the new idiom.
- **Cut the held tag-management release** (the first free minor after `0.77.0` publishes;
  verify free with `npm view` at cut time). The pilot proves the idiom on a real screen before
  the sweep commits to it.

### Phases 2 to N: the sweep

By surface cluster, test-first, ratcheting `check:custom-surface` down each phase. Cluster
boundaries are verification surfaces, so each phase proves out as a unit:

- **Office chrome:** `AdminLayout` / shell, `NavTree`, `ConceptList`, `LoginPage` /
  `ConfirmPage`, the empty states, the dialog family (`DeleteDialog`, `RenameDialog`,
  `ShortcutsDialog`, `WebLinkDialog`, `EntryPicker`, `LinkPicker`, `IconPicker`).
- **Forms and settings:** `FieldInput`, `ReferenceField`, `ObjectGroupField`,
  `RepeatableField`, `CairnTidySettings`, `ManageEditors`, `HelpHome`.
- **Desk chrome:** `EditPage` chrome (the topbar context portal, the slide-overs, the headless
  dialogs), `EditorToolbar`, the footer environment strip. **Not** the CodeMirror content
  theme.
- **Media:** `CairnMediaLibrary`, `MediaPicker`, `MediaCaptureCard`, `MediaHeroField`,
  `MediaInsertPopover`, `MediaFigureControl`.
- **Walled and validated unchanged:** the `MarkdownEditor` `EditorView.theme` (directive
  rails, fold gutter, syntax highlight, media decorations). This is Tier 2; the pass confirms
  it is untouched, not that it is re-expressed.

### The starter template track

The showcase de-customization runs as its own track, sequenced after Phase 0 (so the shared
gate, the rehearsal, and the triage method exist) and able to run in parallel with the admin
sweep, since the two touch different trees (`src/lib/components` versus `examples/showcase`).
The one standing caution: a template change must keep the admin e2e green, because the
showcase is also where the admin preview and the consumer build are proven.

- **Template foundation:** audit `examples/showcase` into its own Tier-1/2/3 ledger; wall and
  document its owned design (`prose.css`, the `.cairn-place-*` contract, the brand styling) as
  the template's Tier 2; extend `check:custom-surface` to the showcase tree with its own budget.
- **Template chrome:** `SiteHeader`, `SiteFooter`, the `(site)` layouts and pages, the
  `styleguide` route, folding bespoke `site.css` and `theme.css` patterns onto Tailwind 4 and
  DaisyUI 5.6 primitives where one exists.

### Final phase: docs

Rewrite `admin-design-system.md` from "bespoke recipes" to "native primitives plus the
documented essential floor." Document the starter template's owned design and its idiomatic
chrome the same way, so a developer reading the scaffold sees what is cairn's frame and what is
theirs. Add the upgrade guide and the upgrade-rehearsal procedure. Update STATUS and the
`cairn-admin-design-modernization` memory.

## Behavior preservation and testing

The existing test suite (2838 at the time of this spec) is the contract. Each re-expressed
component keeps its tests green; behavior is ported, not rewritten. The tests that pin bespoke
CSS (the `admin-css-build` byte-pin, the font and scope pins) are updated deliberately as the
sheet shrinks, and those diffs are the intended, reviewed record of what left.

The accessibility contracts are load-bearing and must survive the re-expression intact: the
roving-tabindex models (the Media Library grid, the triage radiogroups), the paired live
regions (the MediaPicker and TidyReview discipline), the focus-management on the slide-overs
and dialogs, and the desk context portal. `daisyui-a11y-reviewer` is the load-bearing reviewer
at every gate, alongside `svelte-reviewer`. The full `check:*` family stays green, plus the new
`check:custom-surface`.

## Hard floors and constraints

Two constraints bound "maximally idiomatic" and cannot be removed:

- **Embed-anywhere.** The admin self-styles on any host with no host CSS and no global
  Preflight. This forces the scoped sheet, the resets, and the post-compile `@font-face`. The
  compiled output must stay standalone through every change in this pass.
- **The CodeMirror writing surface.** The editor's content theme has no DaisyUI primitive and
  is a settled design from the editor-experience passes. It is preserved, not re-expressed.

## Open investigations (resolved in Phase 0, recorded in the ledger)

1. Can the theme be authored via `@plugin "daisyui/theme"` and still compile to a
   self-contained sheet? If not, the raw block stays as Tier 2.
2. Does the native `--depth: 1` treatment carry the `.btn-primary` lift on both themes, or does
   the bespoke shadow stay?
3. For each secondary-text role, does a `base-content` opacity step reach the locked AA floor on
   both `base-100` and `base-200` in both themes? Fold the ones that pass; keep the rest as
   Tier 2.

## Non-goals

- No redesign. The Warm Stone look is preserved for the admin, and the template keeps its own
  look; this is not a visual rethink, and Warm Stone is not imposed on the public site.
- No rewrite of behavior or logic. Loads, actions, the `CairnAdmin` view switcher, the media
  pipeline, and the editor instrument are ported and re-housed, never re-derived.
- No new admin features. The vocabulary screen is the one new surface, and it arrives from the
  already-specified tag-management Plan 3, not from this pass.
- No change to the CodeMirror content theme.

## Success criteria

- `check:custom-surface` exists and is green for both the admin and the starter template, with
  Tier 3 driven to zero and a budget that cannot regrow.
- Tier 2 lives in one labeled home with its contrast floors stated, for the admin and for the
  template's owned design, and `admin-design-system.md` describes both as native primitives plus
  that documented floor.
- The upgrade rehearsal runs and passes against the latest DaisyUI and Tailwind.
- Every component keeps its tests green; the a11y contracts are intact under
  `daisyui-a11y-reviewer`.
- The Warm Stone look reads as unchanged in spirit; component-level drift is deliberate and
  reviewed.
- The held tag-management release ships after Phase 1, on the new idiom.
