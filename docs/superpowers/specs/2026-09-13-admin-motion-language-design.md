# Admin motion language design (the motion pass, after polish-C, before the cut)

**Status:** revision 1, 2026-09-13. One pass. Plan follows through `writing-plans`; the pass runs
unread on the adversarially reviewed plan as soon as polish-C merges (Geoff, 2026-09-13).

**Inputs.** Three research records on `main`, all revision 2:
`docs/internal/record/2026-09-13-motion-language-research.md` (the seven-system survey, the
responsive axis, the case table; cited below as **language**),
`docs/internal/record/2026-09-13-motion-enforcement-research.md` (the enforcement architecture, the
harness experiment, the Carbon-aliased token set; cited as **enforcement**), and
`docs/internal/record/2026-09-13-sidebar-zen-prior-art.md` (the sidebar survey, cairn's own toggle
measured, the ratified exception; cited as **zen**). Where the language record's ruleset differs
from the other two, the other two win: both were rewritten against IBM Carbon after Geoff chose it
as the single reference, and the language record's sections (c) and (f) predate that choice.
Supporting reads: `docs/internal/admin-design-system.md`, `docs/reference/cairn-audit.md`,
`docs/internal/what-cairn-is-and-is-not.md`, and ROADMAP's Next-tier entries "A motion language for
the admin" and "Borrowable patterns".

**Numbering.** The motion pass is its own slice, after polish-C (slice 12) and before the release
cut. The conductor writes the slice number into `docs/STATUS.md` when the plan is committed.

## The aim

The admin animates in a dozen places and no document says which state changes animate, which snap,
at what duration, on what curve, or how each degrades under reduced motion. This pass writes that
language, ships it as tokens the admin sheet carries, enforces it as `cairn-audit` rules, migrates
the admin onto it, and hands the result to the borrowable-patterns work as the extend track's first
per-pattern recipe.

Three things bound the scope. The pass adds no motion the language does not already require, so
every new transition in it is either the zen offset or a migration of a declaration that ships
today. It takes no rendered rule beyond the delay check. And it changes no public export.

## Decisions (Geoff, 2026-09-13)

Every clause a task writes into `docs/internal/engine-rulings.md`, the design system, or a docs page
cites this spec by path and date and quotes the decision text below.

1. **Purpose:** professional-level visual polish, nothing novel, in the admin's register. Clean,
   conventional, polished, understated, professional.
2. **One reference:** IBM Carbon's productive motion set. Its duration and easing tokens ship under
   cairn names, each naming the Carbon token it aliases; its entrance and exit pairing and its
   distance rule are adopted. Atlassian is the tiebreaker only where Carbon is silent, which is
   reduced motion ("off and instant"). GNOME and Material are comparison data and govern nothing.
3. **Zen mode:** the industry default, shadcn's shape. A transition on `.drawer-content`'s
   `margin-left` at the shift token on Carbon's productive entrance curve, exiting one band faster
   on the exit curve, snapping under reduced motion. It is the one documented exception to the
   property allowlist, enforced by selector.
4. **Conform to conventions:** DaisyUI's component timings stay the vendor's own vocabulary. No
   unlayered override of the four components (`.modal`, `.drawer`, `.collapse`, `.btn`). cairn's
   rules enforce authored code. The audit treats a DaisyUI component class as a vendor contribution,
   checked for the properties it animates rather than its durations.
5. **Enforcement is the critical deliverable.** The rules ship as `cairn-audit` rules a consumer
   runs on its own custom admin screens with no configuration. Each rule is specified consumer-first.
   The audit runs over the engine's own tree first, wired through
   `scripts/checks/check-invisible-craft.mjs`'s `RULE_IDS` and `CSS_FILES`. The reduced-motion rule is
   the CSSOM delay check at advisory tier; the rendered differential is out.
6. **Borrow hand-off:** the pass writes the extend track's first per-pattern recipe page, beside the
   design system's Motion section, which the later `cairn-extend` skill routes to.
7. **Sequencing:** its own pass, after polish-C merges and before the release cut, so the cut carries
   the tokens and the rules. Single release. The pass runs unread on its reviewed plan.
8. **Task zero:** author the token set, point Tailwind's two transition defaults at it, and fix the
   two shipped bugs before any rule is specified against them.

## The bar

The language is complete when no surface has to invent its own timing. Complete means every case in
the case table below has a token, an owner, and a reduced-motion answer, and the dash entries are
decisions rather than omissions. Restrained means the whole vocabulary is five durations and three
curves, and a component that needs a sixth of either is wrong.

The charter test runs first, per `what-cairn-is-and-is-not.md`. Motion in the admin frame is cairn's
job, because the admin frame is what cairn owns and a developer's custom screen inherits its idiom
through tokens and gates rather than by re-deriving it. Motion on a site's public pages is the
developer's, and the pass adds none.

## The token set

Five durations and three curves, authored in `scripts/build/admin-css.input.css` and carried on both
admin theme roots. Every value is Carbon's, read from the shipped `@carbon/motion` 11.52.0 package
and its DTCG `motion.json` (enforcement, Part 5).

| cairn token | Value | Carbon token | Use |
|---|---|---|---|
| `--cairn-dur-instant` | 70ms | `duration-fast-01` | Press, focus ring, any paint feedback on the control under the pointer |
| `--cairn-dur-quick` | 110ms | `duration-fast-02` | Small fades: a caret, a chip, a disclosure marker |
| `--cairn-dur-base` | 150ms | `duration-moderate-01` | The default: hover paint, menus, popovers, tooltips, most enter and exit |
| `--cairn-dur-shift` | 240ms | `duration-moderate-02` | Expansion, toast, system communication, the shell's content offset |
| `--cairn-dur-settle` | 400ms | `duration-slow-01` | Large expansion: a surface whose travel is the viewport, an important notification |
| `--cairn-ease-standard` | `cubic-bezier(0.2, 0, 0.38, 0.9)` | `easing.standard.productive` | The element stays visible throughout and moves or resizes |
| `--cairn-ease-entrance` | `cubic-bezier(0, 0, 0.38, 0.9)` | `easing.entrance.productive` | The element appears |
| `--cairn-ease-exit` | `cubic-bezier(0.2, 0, 1, 0.9)` | `easing.exit.productive` | The element leaves and does not stay nearby |

Carbon's `duration-slow-02` (700ms) has no case in the admin and is deliberately not aliased. Adding
a sixth token later is a token change, not a rule change. Carbon's expressive easing pair is out of
register for an admin and is not aliased either.

The band ladder, used by the exit rule below, is instant, quick, base, shift, settle.

Two Carbon rules the token set encodes rather than a gate enforcing them. Duration follows distance:
"the larger the change in distance (traveled) or size (scaling) of the element, the longer the
animation takes" (enforcement, Part 5), which is why a hover paint change takes `base` and the
shell's 224px offset takes `shift`. And enter and exit are paired: a surface leaves on the exit
curve, faster than it entered.

### The two theme defaults

The admin root sets `--default-transition-duration: var(--cairn-dur-base)` and
`--default-transition-timing-function: var(--cairn-ease-standard)`.

This is the whole migration for the eleven bare Tailwind utilities in the admin. Measured in the
shipped sheet, `.transition-colors` emits
`transition-duration: var(--tw-duration, var(--default-transition-duration))`, so a
`transition-*` utility with no sibling `duration-*` class resolves to the theme default
(enforcement, Part 2). The duration half is a rename: today's default is `.15s`, which is already
Carbon's `duration-moderate-01`. The easing half is a real change, from Tailwind's
`cubic-bezier(.4, 0, .2, 1)` to Carbon's productive standard curve, and it reaches every bare
`transition` utility in the admin and in a consumer's custom screens. It is a `Consumers must:` line.

## The property allowlist

A transition or a finite animation may name only these properties:

`opacity`, `color`, `background-color`, `border-color`, `box-shadow`, `outline-color`,
`outline-width`, `outline-offset`, `rotate`, `translate`, `scale`, `transform`, `grid-template-rows`.

Anything else is outside the language. Nine properties are named errors rather than merely absent,
because they are the layout-thrashing set and the judder they produce is what reads as abrupt:
`width`, `height`, `top`, `left`, `right`, `bottom`, `margin` and its longhands, `padding` and its
longhands, `font-size`. `transition: all` is an error for the reason the shipped `motion-band` rule
already gives: it re-animates every property a future edit adds, including ones that should snap.

A `translate` stays under 8px, except a surface whose travel is the viewport, which takes
`--cairn-dur-settle`. That bound is prose, not a gate; a static rule reads the property, not the
distance.

### What snaps, always

- A route change between admin pages. No view transition, at any width, on any input device.
- Any layout change caused by a resize, an orientation change, or a breakpoint flip.
- A drawer or panel that is persistent at this width. Furniture does not enter.
- Text content replacing text content, including a changed label.
- A list reflowing after a save, a sort, or a filter, including row add, remove, and reorder.
- Validation messages and the `aria-live` feedback regions.
- Anything sized by the reader's own typing.
- Every property on the named-error list above.

### The one exception

`CairnAdminShell.svelte`'s `.drawer-content` transitions `margin-left`, at `--cairn-dur-shift` on
`--cairn-ease-entrance` entering zen and one band faster (`--cairn-dur-base`) on `--cairn-ease-exit`
leaving it. Under reduced motion it takes the blanket block and snaps.

The exception is an allowlist entry scoped to that one selector and that one property, never a
global relaxation. Any other element transitioning a snap-list property still fails, in the engine
and on a consumer's custom screens alike. It ships with a two-sided fixture: the shell's own offset
passes, and a second element transitioning `margin-left` fails.

The evidence for it, from the zen record: shadcn/ui, the most-copied admin sidebar on the web,
animates `width` and `left` for 200ms and ships that way, so the industry default is a
layout-property transition (zen, §1); Carbon's distance rule says a 224px column shift should animate
and should take longer than a micro-interaction (zen, §5); and the measurement of cairn's own toggle
found the transition adds about ten layouts totalling under 0.01ms of layout work, with no variant
distinguishable from another in frame pacing even under a 4x CPU throttle on a saturated machine
(zen, "cairn's own zen toggle, measured").

## Enter and exit, with the floor

An exit runs one duration band faster than its enter and uses `--cairn-ease-exit`. A surface that
enters at `base` leaves at `quick`. The way out is never a wait.

`instant` is the floor. An `instant`-band exit stays at 70ms and changes only its curve, because
there is no band below it and a shorter exit is a snap with extra machinery.

Asymmetry applies to a surface arriving or leaving. It never applies to hover, press, or focus, which
are states of one element rather than arrivals and departures, and where a band's difference in
either direction is below what a reader can tell apart. A `:not(:hover)` counterpart per component is
declined: it is one more pinned unlayered rule each for a paint change nobody perceives.

Carbon's own carve-out holds: an element that leaves but stays nearby, ready to reappear, uses
`--cairn-ease-standard` rather than the exit curve, and keeps its band in both directions rather than
taking the one-band reduction. The zen chrome is that case, which is why it leaves and returns at
`quick`.

## The modality gate

Every hover-state transition sits inside `@media (hover: hover)`.

Tailwind's `hover:` variant already compiles that way, measured as 16 `(hover: hover)` media rules in
the admin's shipped sheets (enforcement, Part 2), so a `hover:` utility needs no work and the static
rule leaves it out of scope, exactly as `focus-parity` does. A hand-authored `:hover` rule needs the
guard added. The admin already models it once, at `cairn-admin.css:1002`, whose comment names the
reason: "so a touch device does not strand the lighter fill on the last-tapped segment."

On touch, press carries the same feedback at `--cairn-dur-instant` with no delay. Nothing is revealed
by hover at any width: hover carries feedback and never information, so a touch device that loses a
hover transition loses nothing it needed.

Focus separates itself in the selector. `:focus-visible` paints only for keyboard focus, so it
animates only for keyboard focus, and no second token and no second media query are needed. The one
timing constraint is that the indicator must reach full contrast promptly, which `instant` satisfies
and `settle` would not.

## Reduced motion

Two layers with different jobs, and the policy never blanks silently.

**The floor.** The blanket block at `cairn-admin.css:1115` stays, unchanged in shape and scoped to
the two admin theme roots. It exists for DaisyUI's twenty ungated components, which the admin does not
author and cannot enumerate stably across upgrades. Its universal selector is the point: it covers
what nobody named. It keeps `0.01ms` rather than `0s`, so `transitionend` still fires.

**The opt-back-in, by property class.**

| Class | Policy |
|---|---|
| Paint (`opacity`, `color`, `background-color`, `border-color`, `box-shadow`, `outline-*`) | May opt back in by restating the transition inside the same guard with `!important` on a class-bearing selector, which outranks the floor's `[data-theme] *`. Paint carries no positional motion, and removing it removes the feedback |
| Transform (`translate`, `scale`, `rotate`, `transform`) | Stays at the floor. Where the transform carried an entrance, substitute an opacity fade at the same band |
| Layout (`grid-template-rows`) | Stays at the floor. Snap |
| The zen offset | Stays at the floor. Snap, per decision 3 |
| Looping motion (a skeleton shimmer) | Off entirely, static tint instead. DaisyUI already gates `.skeleton`, so nothing is owed |
| Indeterminate progress (a spinner) | Runs. It conveys state, and WCAG 2.2.2 reaches auto-starting motion presented in parallel with other content, which a spinner replacing the content is not |

The class-bearing `!important` claim is specificity reasoning, not measurement. Task 1 proves it in
the built sheet, per the Tailwind v4 layer-order rule this workstation already carries (language,
revision 2 confidence notes).

This supersedes the language record's "one 150ms opacity cross-fade" for a page-level mode change.
Geoff's decision 3 says zen snaps under reduced motion, and Atlassian, the tiebreaker where Carbon is
silent, states the rule outright: "when reduced motion is active, motion is off and instant."

### The delay rule

Under `prefers-reduced-motion: reduce`, no admin-owned rule declares a nonzero `transition-delay` or
`animation-delay`.

The blanket block sets `animation-duration`, `animation-iteration-count`, `transition-duration`, and
`scroll-behavior`, and sets no delay (language, "The blanket block is missing `transition-delay`").
Measured at rest on `/admin/posts` in a reduced context, `div.drawer-side` computes
`transition-delay: 0.1s, 0.1s` and two `div.modal-box` elements compute `0s, 0s, 0.05s, 0s`
(enforcement, Part 2). A reader who asked for reduced motion gets an instant transition that starts
75ms after the hover, which is worse than either the motion or the snap: the interface is merely
late. Two declarations fix it, in the same block:

```css
  transition-delay: 0s !important;
  animation-delay: 0s !important;
```

This is a shipped bug today, independent of every recommendation here, and it is task 1's second half.

## Responsive rules

The register does not change with the viewport or the input device. What changes is how far a surface
travels, and duration follows travel.

The admin's own breakpoints are `sm` at 640, `lg` at 1024, and `xl` at 1280, counted at 156, 12, and 6
uses across `src/lib/components/*.svelte` (language, §9). `isPersistentSidebar` is
`!topbar.zen && (isDeskRoute ? matchesXl : matchesLg)` (`CairnAdminShell.svelte:556`).

| Width | What the rules say |
|---|---|
| 320, 390 | The drawer is an overlay and animates as one. No content offset exists, so zen changes the chrome only. A dialog that adopts the bottom-sheet shape travels the viewport and takes `settle`; every dialog ships as a centered `.modal` today, so this is a rule for future work rather than a migration |
| 768 | Same as 320 and 390: the drawer is still an overlay on every route kind, and no offset is in play. This is the cheapest viewport at which to verify the zen chrome sequence in isolation |
| 1024 to 1279 | The sidebar is persistent on content routes and an overlay on desk routes. The five-viewport bar does not sample this band; the rules hold by construction, not by capture |
| 1440, 2560 | The sidebar is persistent on every route kind, and the 224px content offset is in play. This is where the exception lives |

Three rules follow from the split, each of which the audit reaches:

- **The overlay drawer animates; the persistent sidebar does not.** DaisyUI declares its drawer
  transitions outside the breakpoint media query, so they stay in force at every width and the
  breakpoint flip itself slides and resizes the sidebar (language, §10). The transition must be scoped
  so it applies only while the drawer is acting as an overlay, which the shell already computes as
  `isPersistentSidebar`. Under decision 4 this is a scoping change on cairn's own wrapper, never an
  unlayered override of `.drawer`.
- **A breakpoint flip snaps.** The reader is already producing the motion by dragging or rotating, the
  properties that change at a breakpoint are the ones the snap list already bans, and the change is
  not feedback for an action taken inside the interface.
- **A resize suppresses motion while it runs.** The resize stopper is the published backstop
  (language, §10): a class on the theme root during `resize`, cleared on a 400ms trailing timer,
  zeroing durations and delays in the same `0.01ms` idiom the reduced-motion block uses, so the admin
  has one idiom rather than two. It is keyed on `resize`, which an orientation change also fires.

Input modality is the gate above. Nothing else in the language is modality-dependent.

## The case table

Every case, with its desktop-pointer behavior, its touch behavior, its reduced-motion behavior, its
token, and the component that owns the rule. A dash means the case carries no motion, which is a
decision rather than an omission. Tokens are the Carbon-aliased set; where the language record's
table named a superseded token, the mapping is `tap` to `instant`, `quick` to `quick`, `settle` to
`base`, `sheet` to `settle`, and the language record's 300ms `shift` to this set's 240ms `shift`.

Read the Token column as what the language prescribes for that case. Where the owner is a DaisyUI
component, the vendor's shipped timing stands and decision 4 declines the override, so the row states
the language and the sheet ships the vendor's number. The four rows where the two differ are press
(`.btn` at 200ms), dialog and overlay drawer (`.modal` and `.drawer` at 300ms), and disclosure
(`.collapse`). The modality gate is a separate matter from a timing override and is taken on two
vendor components, per the migration below.

| Case | Desktop pointer | Touch | Reduced motion | Token | Owner |
|---|---|---|---|---|---|
| Hover | Paint only, inside `@media (hover: hover)` | No hover state exists | Opts back in | `base` (theme default) | Shell, ConceptList, CairnMediaLibrary, MediaHeroField |
| Press | Paint change on `:active` | Same, and it is the only feedback | Opts back in | `instant` | DaisyUI `.btn`, vendor timing kept |
| Focus, keyboard | `outline-*` and `box-shadow` | Same, external keyboard | Opts back in | `instant` | `cairn-admin.css` |
| Focus, pointer | No ring paints, so no motion | No ring paints | Nothing to reduce | - | - |
| Guarded button, `aria-disabled` flip | `background-color` only; the button stays hit-testable | Same | Opts back in | `instant` | `cairn-admin.css:754`, a pinned unlayered rule |
| Enter, small element | Opacity plus a translate under 8px | Same | Opacity only | `base` | per component |
| Exit, small element | Opacity, `--cairn-ease-exit` | Same | Opacity only | `quick` | per component |
| Disclosure, accordion | `grid-template-rows` plus opacity | Same | Layout snaps, opacity stays | `quick` | DaisyUI `.collapse`, NavTree |
| Caret rotate on a disclosure | `rotate` only, no box change | Same | Snaps | `quick` | `cairn-admin.css:545`, `CairnAdminShell.svelte:1035` |
| Tooltip | Opacity, 75ms delay, hover-gated | Suppressed on a coarse pointer | Delay zeroed, then opts back in on opacity | `base` | DaisyUI `.tooltip`, ungated for hover today |
| Popover, menu | Opacity plus 4px from the trigger edge | Full-width bottom sheet below `sm` | Opacity only | `base`, `settle` below `sm` | `MediaInsertPopover.svelte`, DaisyUI `.menu` |
| Command palette | Opacity plus 4px, centered | Pinned to the top edge, opacity plus 8px | Opacity only | `base` | `CairnAdminShell.svelte:823` |
| Dialog | Opacity plus a 2% translate; the vendor scale is kept, see the DaisyUI decision | Same shape today; a bottom sheet would take `settle` | Opacity only, no geometry | `base` | `DeleteDialog.svelte` and thirteen siblings, all plain `.modal` |
| Login and confirm pages | No motion of their own | Same | Nothing to reduce | - | `LoginPage.svelte`, `ConfirmPage.svelte` |
| Drawer, overlay | Reachable below 1024 on content routes, below 1280 on desk routes | Translate from the inline start, scrim fades | Scrim fades, panel snaps | `settle` | DaisyUI `.drawer-side`, scoped by the shell |
| Drawer, persistent | No motion; it is furniture | Not reachable at this width | Nothing to reduce | - | `CairnAdminShell.svelte:556` |
| Zen content offset | `margin-left`, the one exception | Not reachable; no offset below 1024 | Snap | `shift` in, `base` out | `CairnAdminShell.svelte:692-693` |
| Zen chrome regions | Opacity out at `quick` on the exit curve, back at `quick` on the standard curve | Same | Snap | `quick` | `EditPage.svelte` |
| Zen chip | In at `base` on the entrance curve after a 110ms delay; out at `quick` on the exit curve with no delay | Same, and the short exit matters more: the finger is still on the glass | Snap | `base` in, `quick` out | `EditPage.svelte` |
| Zen editor card box | Snaps. `padding` and `max-width` are on the snap list | Snaps; at 390 there is nothing to reclaim | Snaps | - | `EditPage.svelte` |
| Breakpoint flip | Snap | Snap | Snap | - | the resize stopper |
| Window resize | All motion suppressed while resizing | Not reachable | Suppressed | - | the resize stopper |
| Orientation change | Not reachable | Snap, same suppression | Snap | - | the resize stopper |
| Route change | Snap | Snap | Snap | - | no owner; the rule is that nobody writes one |
| List or table row added, removed, reordered | Snap | Snap | Snap | - | `ConceptList.svelte`, `AdminTable` |
| Table row hover | `transition-colors` on the row ground | No hover state exists | Opts back in | `base` | `ConceptList.svelte:400`, `CairnMediaLibrary.svelte:845` |
| Media grid, selection change | `transition-shadow`; the `ring` changes with the selection | Same, on tap | Opts back in | `base` | `CairnMediaLibrary.svelte:747` |
| Drag-and-drop dropzone | Hover and focus paint; a drag-over paint state is added, since none exists today | Not reachable | Opts back in | `instant` | `MediaHeroField.svelte:450` |
| Upload progress bar | A determinate fill, on `transform: scaleX` | Same | Runs; it conveys information | `base` | `MarkdownEditor.svelte:530` |
| Preview pane width | Removed. The split-pane resize snaps | Not reachable; no split below `lg` | Snaps | - | `EditPage.svelte:2047` |
| Editor fold chevron | `opacity` plus `transform` | Persistent at 0.65 opacity on a coarse pointer | Already guarded to `none` | `quick` | `MarkdownEditor.svelte:584`, `:607`, `:612` |
| Editor unfold flash | `background-color`, one shot | Same | Already guarded to `none` | `base` | `MarkdownEditor.svelte:654`, `editor-folding.ts:277` |
| Save-state line | `transition-opacity` | Same | Opts back in | `base` | `EditPage.svelte:1428` |
| Feedback alert, `@starting-style` | Opacity plus a translate under 8px, property list named | Same | Opacity only, no translate | `base` | `EditPage.svelte:1643` |
| Live region, `aria-live` | No motion; both regions are `sr-only` | No motion | No motion | - | `EditPage.svelte:1637-1638` |
| Form validation message | No motion; the layout shift snaps | Same | Snap | - | `FieldInput.svelte` |
| Toast | Opacity plus 8px from the bottom, bottom inline-end | Same anchor, width capped at the viewport minus gutters | Opacity only | `base` | DaisyUI `.toast`, already gated |
| Theme change, explicit toggle | Scoped cross-fade on the shell's chrome surfaces, by a class present for that flip only | Same | Snap | `base` | `CairnAdminShell.svelte` |
| Theme change, OS or first paint | Snap | Snap | Snap | - | - |
| Skeleton, shimmer | The DaisyUI 1.8s loop | Same | Static tint, no loop | - | DaisyUI `.skeleton`, already gated |
| Spinner, progress | Runs; it is essential state | Runs | Runs | - | DaisyUI `.loading`, already gated |
| Sticky header collapse on scroll | None | None | Nothing to reduce | - | - |
| Pull to refresh, overscroll | None | None; `overscroll-behavior: contain` on the editor pane | Nothing to reduce | - | `MarkdownEditor.svelte` |

Four rows depart from something and need their reason recorded.

**The feedback alert is not the live region.** `EditPage.svelte:1637-1638` are two `sr-only` divs
carrying `aria-live`; they are invisible and "no motion" is correct for them. The visible success
strip at `:1643` is a separate element that animates in with `@starting-style`. The announcement
snaps and the visible confirmation moves, and the two rows do not contradict.

**The preview pane's width transition has no legal form.** It transitions `width`, which the snap
list bans, and the change it animates is a split-pane resize, which the resize rule says should snap
for an independent reason. Removing it is a behavior change a reader will notice, so it is a named
removal with a `Consumers must:` line, not a silent consequence.

**The upload progress bar changes property rather than losing its motion.** Today it is
`width 200ms ease` on a native `<progress>`'s `::-webkit-progress-value`. `width` is on the snap
list, and the motion conveys information, so the fill is rewritten as a cairn-owned bar element
transitioning `transform: scaleX()`, which is the one allowlisted expression of a determinate fill.
The property allowlist grows no exception for it.

**The dropzone gains a state rather than losing one.** `MediaHeroField.svelte:450` wires `ondrop` and
`ondragover` and changes nothing visually while a file is over the target (language, §12). The motion
pass is the first pass to look at this element, so it adds the paint-only drag-over state the language
already permits.

## The DaisyUI component-class decision

**DaisyUI's component timings stay the vendor's own vocabulary** (decision 4). cairn writes no
unlayered override of `.modal`, `.drawer`, `.collapse`, or `.btn`. The admin's own rules are what the
language governs, and the audit treats a DaisyUI component class as a vendor contribution: it is
checked for the properties it animates, never for its durations or its curves.

The decision governs timing and curve. The modality gate is a separate question, and two vendor
components get an `@media (hover: hover)` guard added, per the migration table: `.tooltip` and
`.menu` are the two ungated components the admin actually renders, neither is among the four named
here, and a guard adds no timing of its own.

The cost is stated rather than hidden. `.modal` and `.drawer` run 300ms where the language's nearest
band is 240ms; `.collapse` ships `transition-property: all`, the one construct the shipped rule bans;
and `.btn` transitions `transform`. The published language and the shipped behavior therefore
disagree at four vendor components, and the design system says so in the Motion section rather than
claiming a conformance the sheet does not have.

The reason the disagreement is acceptable: an override is not a CSS edit in this repo, it is a budget
change. No layered admin rule can outrank a DaisyUI rule, because DaisyUI emits inside `@layer
utilities` and layer order decides before specificity, so every override is an unlayered rule pinned
by exact selector in `scripts/checks/custom-surface-budget.json`. The budget pins 17 selectors today
with `componentsLayerCap: 19` and the gate's own stated intent that it "ratchets to zero." The four
components cost ten to fourteen pinned selectors, a 59% to 82% growth in a budget whose direction is
down, and each pinned selector puts cairn on the hook for a DaisyUI internal selector shape at every
upgrade (language, "Layer order and the custom-surface budget").

### The false-positive consequence, stated

Exempting vendor component classes from the vocabulary rule loses real coverage, and the spec names
what is lost rather than discovering it later. `.btn` computes `0.2s cubic-bezier(0, 0, 0.2, 1)` over
five properties including `transform`, on 19 elements at rest on `/admin/posts`, with no
`transition-*` utility in the markup at all, and `ctx.sheet.declarations('btn')` finds it
(enforcement, Part 5). Firing on that would make `class="btn"` a vocabulary violation on every button
in the engine and in every consumer tree, hundreds of unfixable findings on run one. Exempting it
means the vendor surface, which is where the ungated hover rules and the three delay bugs live, is
reached only by the two rules that read it deliberately: the rendered delay rule, at advisory tier,
and the property clause, which still applies to what the class animates.

The exemption must be enumerable rather than a hand-maintained list. It is defined as "a class whose
declarations resolve, in the built sheet, only inside DaisyUI's own nested component layer", which
`CompiledSheet.declarations()` already reports through each rule's `conditions` array.

### The one candidate override, declined

`.modal-box` opens with `scale: .98` to `1` over 300ms, and the candidate override was to drop the
scale and keep the rest.

**Declined.** Three reasons, in order. Decision 4 already forbids an unlayered override of `.modal`,
and the scale sits on `.modal-box` inside that component. The measured travel is small: `.modal-middle`
is `width: 91.6667%` capped at `max-width: 32rem`, so a 2% scale is roughly 10px of edge movement on
a 512px box (language, §9), which is not the peripheral-scaling class the accessibility sources name,
and it is zeroed under reduced motion by the blanket block regardless. And the cost is a pinned
selector in a budget that ratchets to zero, plus a per-upgrade maintenance surface on a DaisyUI
internal, in exchange for 10px.

**Reopen on:** the admin adopting `modal-bottom` at narrow widths. A bottom sheet scales a
full-viewport surface, the travel is then the viewport rather than 10px, and the override becomes
warranted. The design system's Motion section carries that trigger as a `WATCH:` line beside the
recipe, per this repo's watch-item rule, since the trigger is a markup change a future pass makes
rather than an external event.

## The migration

Seventeen motion declarations ship across seven components plus `cairn-admin.css`, every line number
read from `main` (language, "The motion the admin declares"). Three are CSS rules, eleven are Tailwind
utility classes in a `class` attribute, and three are string values inside a CodeMirror JS theme
object. Each has a fix, and the fix per site is the migration.

| Site | What ships today | The fix |
|---|---|---|
| `EditPage.svelte:1643` | `transition-all duration-[250ms] starting:-translate-y-2 starting:opacity-0` | Name the property list (`transition-[opacity,translate]`) and take the duration from the token form. The `@starting-style` entrance stays: it is what the transition exists for |
| `EditPage.svelte:2047` | `transition-[width] duration-[250ms]` on the preview frame | Removed. The split-pane resize snaps, per the resize rule and the snap list, and the removal is a `Consumers must:` line |
| `MarkdownEditor.svelte:530` | `width 200ms ease` on `::-webkit-progress-value` | The fill becomes a cairn-owned bar transitioning `transform: scaleX()` at `base`. The property allowlist grows no exception |
| `cairn-admin.css:545` | `transition: rotate 150ms ease` on `.cairn-caret` | Onto `var(--cairn-dur-quick)` and `var(--cairn-ease-standard)`. Bare `ease` is `cubic-bezier(0.25, 0.1, 0.25, 1)` and matches no token |
| `HelpHome.svelte:562`, `:787` | `border-color 150ms ease, background-color 150ms ease` and the step action's pair | Onto the tokens, same shape |
| `EditPage.svelte:1428` | `transition-opacity duration-[250ms]` | Drop the `duration-*` class; the theme default carries it at `base` |
| `MarkdownEditor.svelte:584`, `:654` | The fold chevron's `opacity`/`transform` pair and the unfold flash's `background-color`, inside the CodeMirror theme object | Onto the tokens. Both already sit inside a `prefers-reduced-motion: reduce` block in the same theme object, and the chevron carries a `@media (hover: none)` rest state at `:607`. That is the best motion in the admin and it keeps its shape |
| `CairnAdminShell.svelte:775`, `:971`, `:1024`, `:1035` | `transition-colors` and `transition-opacity`, bare | No edit. The theme default resolves them to `base` on the standard curve |
| `CairnMediaLibrary.svelte:747`, `:845`, `ConceptList.svelte:400`, `MediaHeroField.svelte:450` | `transition-shadow` and `transition-colors`, bare | No edit, same reason. `MediaHeroField` additionally gains the drag-over paint state it has never had |
| Three `animate-spin` uses | `spin 1s linear infinite` through `--animate-spin` | No edit. An `infinite` animation is exempt from the vocabulary and governed by the reduced-motion guard instead |
| DaisyUI `.tooltip` and `.menu` | `:hover` transitions with no capability guard anywhere in the vendor file | Two pinned unlayered `@media (hover: hover)` guards in `cairn-admin.css`, following the model at `:1002`. Neither component is among the four decision 4 names, and a modality gate is not a timing override. Cost: two entries in `scripts/checks/custom-surface-budget.json` against seventeen today, taken because the tooltip's long-press-opens-and-sticks behavior is the one real touch defect in the case table |

The accounting closes against the seventeen. Eleven sites are Tailwind utilities: two are fixed by
hand (`EditPage.svelte:2047` removed, `:1643` given a property list), one drops its `duration-*`
sibling (`:1428`), and eight need no edit at all because the theme defaults resolve them. Three are
CSS rules and three are CodeMirror theme strings, and all six move onto the tokens. The three
`animate-spin` uses are exempt. Two vendor hover guards are added, which is the one thing in the
migration that is not already on the inventory.

## The four rules

Every rule is specified consumer-first: what it reads in a site's tree, its tier, and the fix message
it prints. Tier is a property of the rule, not of the run, so one tier serves both the engine's gate
and a consumer's. Three rules ship error tier, matching every other static rule in the registry; the
one advisory rule is advisory because its findings are vendor CSS the consumer did not write.

### Rule 1: `motion-property`, static, error

**What it reads in a site's tree.** Both CSS-family surfaces `cssScopeRules` already yields (a
component's own scoped `<style>` block, plus any file `static.cssFiles` names), and the per-element
class-token join against `ctx.sheet.declarations()`, keyed on `ClassToken.elementStart`. A consumer
needs no configuration for either: `DEFAULT_STATIC_SCOPE` covers `src/routes/admin`,
`src/lib/components`, and `src/lib/admin-toolkit`, and `DEFAULT_SHEET_CANDIDATES` falls back to the
installed engine's `dist/components/cairn-admin.css`.

**What it asserts.**

- `transition-property`, and the property slot of the `transition` shorthand, names an allowlisted
  property.
- A named-error property (the nine-item snap list) is a finding. This reaches `transition-[width]`
  through the class join and `width 200ms` through the CSS path.
- `transition: all`, and `transition-all`, is a finding.
- More than three properties in one declaration is a finding.
- An `animate-*` class is checked through its `--animate-*` custom property's keyframes, so animating
  a snap-list property is the same finding as transitioning one.
- The one exception passes: `margin-left` on `CairnAdminShell`'s `.drawer-content` selector.

**Fix message.** Names the property, the rule ("the admin's motion language transitions paint,
transform, and `grid-template-rows`"), and the remedy. For `transition-all` on an `@starting-style`
element the remedy is the named property list, not deleting the transition, because that element's
entrance is the `@starting-style` and deleting the transition deletes the entrance.

**Fixtures, from the shipped examples.** `EditPage.svelte:1643` (`transition-all`, fails, remedy
`transition-[opacity,translate]`); `EditPage.svelte:2047` (`transition-[width]`, fails);
`MarkdownEditor.svelte:530` (`width 200ms`, fails); the shell's own `margin-left` (passes); a second
element transitioning `margin-left` (fails).

This is the cheapest rule and the one that catches every shipped violation on day one. Build it
first.

### Rule 2: `motion-vocabulary`, static, error

**What it reads.** The same two surfaces and the same join.

**What it asserts.**

- A CSS declaration naming a duration or a timing function references a `var(--cairn-dur-*)` or
  `var(--cairn-ease-*)` token. A literal, a bare `ease`, a bare `linear`, or a raw `cubic-bezier()` is
  a finding. This convicts `cairn-admin.css:545`'s `transition: rotate 150ms ease` today.
- A `duration-*` or `ease-*` class whose value is not a cairn token is a finding, which convicts
  `duration-[250ms]`.
- A `transition-*` class with no sibling `duration-*` or `ease-*` class passes, because it resolves to
  the theme default. The rule ships with a companion assertion that the built sheet sets
  `--default-transition-duration` and `--default-transition-timing-function` to cairn tokens on the
  admin root. Without that assertion the pass verdict is a lie on eleven of the admin's declarations,
  so the assertion is part of the rule and not a separate check.
- A finite animation resolves its duration and easing to cairn tokens.
- A vendor component class, as defined above, is exempt.

**The `infinite` carve-out.** An animation declared `infinite` is exempt from the vocabulary and is
governed instead by the reduced-motion guard, which the shipped `reduced-motion` rule already
polices. The reason: a continuous rotation is correct at `linear`, which the curve vocabulary does not
contain, and correct at a duration outside a 70ms to 400ms band. The three shipped `animate-spin`
uses are the population. This departs from the enforcement record, which wanted `animate-spin` to
fail on both its `1s` and its `linear`; the departure is recorded here because the record's remedy
has no legal form.

**Abstentions.** The rule records a note rather than a finding on three value shapes, each shipping
today: a `var()` in the property slot (`dist/components/cairn-admin.css:162`), a `calc()` over a
foreign variable (the sortable-list dependency's
`box-shadow calc(var(--ssl-transition-duration) / 3 * 2)`), and a shorthand carrying `allow-discrete`
keywords (`dist/components/cairn-admin.css:5243`, seven properties on DaisyUI's
`.collapse ::details-content`). Abstaining is stated in the report, so a check that skips itself is
visible.

**Fix message.** Names the literal found, the nearest cairn token by value, and the authoring form.

**Fixtures.** `duration-[250ms]` on `EditPage.svelte:1643` (fails); the token form (passes);
`transition-colors` alone (passes, with the companion assertion green); `transition-colors` alone with
the companion assertion red (the rule reports the assertion, not the element); `animate-spin`
(passes, `infinite`); a 700ms finite `animate-*` (fails); each of the three abstention shapes.

**The join's three blind spots, as accepted limits.** Each is documented in the reference page and
the recipe page rather than claimed away.

1. **A conditional class puts two values in one slot.** `markup.ts:459-463` returns both branches of
   a ternary and `:417-427` every object key, so `class={dense ? 'duration-75' : 'duration-500'}`
   gives the join two mutually exclusive durations under one `elementStart`. **The rule reports on
   every branch**, because the vocabulary question is per value and both branches are authored code
   the fix message can name. Where a pairing verdict would need one value (the sibling-duration
   lookup), the rule abstains on that element and records it.
2. **The token dedup drops the second owner.** `markup.ts:566-573` keys a token by
   `start:end:value` and keeps the first owning element, so a script constant used on three elements
   attributes its tokens to element one. **Accepted as a false negative**, because changing the dedup
   key changes the shared substrate every static rule reads, including `no-uncompiled-class`, and
   that is a separate change with its own re-baseline.
3. **A cross-component pair is out of reach.** `<Button class="duration-[250ms]" />` where `Button`
   applies `transition-colors` internally splits the pair across two files with no shared key, and
   every consumer component rendered inside `CairnAdminShell` has that shape. **Stated as the limit
   of the coverage claim.** The rules cover existence, not pairing, across a component boundary.

### Rule 3: `motion-hover-gate`, static, error

**What it reads.** The CSS-family surfaces only. No class join.

**What it asserts.** A hand-authored `:hover` selector that declares motion, whose conditions carry
no hover media feature, is a finding. Tailwind's `hover:` variant is out of scope by construction,
exactly as it is in `focus-parity`, because it already compiles to
`@media (hover: hover) { &:hover }`.

**Fix message.** Names the selector and the guard to wrap it in, and cites `cairn-admin.css:1002` as
the shipped model.

**Fixtures.** `cairn-admin.css:1002` (passes, guarded); a hand-authored `:hover` transition with no
guard (fails); a `hover:` utility (not read).

The rendered half, which would reach DaisyUI's ten ungated components through a touch context, is
**not in this pass**. It needs the same emulation axis rule 4 needs, it is advisory, and its remedy
would be an override decision 4 declines. It is filed to ROADMAP's Next tier with its trigger: the
borrow-1 pass, which owns the consumer-facing gates layer.

### Rule 4: `motion-reduced-delay`, rendered, advisory

**Rule id.** `motion-reduced-delay`, never `reduced-motion`. `reduced-motion` is a static rule id,
there is no duplicate-id guard across the two registries, and `suppress.ts` resolves directives by
id, so a source-positioned `cairn-audit-disable-next-line reduced-motion` would read as covering a
rendered finding it can never reach.

**What it reads.** One CSSOM scan inside a `reducedMotion: 'reduce'` context, at rest, on each
configured page. Any rule whose selector is admin-owned and whose `transition-delay` or
`animation-delay` resolves nonzero is a finding. No differential, no signature join, no second
capture, no new interaction state.

**Why not the differential.** The revision 1 design is withdrawn for two measured reasons.
`__cairnAudit.signature(el)` names a class of elements rather than an element: 483 elements on
`/admin/posts` collapse to 130 distinct signatures, so there is no join key. And the blanket block
never touches `transition-property`, whose initial value is `all`, so under reduced motion 370 of 433
motion-bearing elements report `transition-property: all` and the differential's transform and layout
clauses convict every element on the page (enforcement, Part 2).

**Tier: advisory.** All three known offenders are DaisyUI's and cairn ships no override for them
under decision 4. Error tier would fail every consumer's first `audit:rendered` on CSS the consumer
cannot edit.

**Fix message.** Names the selector, the delay, and the remedy: the admin's blanket block zeroes
delays, so a finding here is either a rule outside the block's scope or a vendor rule to leave alone
and record.

**Fixtures**, all measured at rest on `/admin/posts` in a reduced context: `.drawer-side`
(`0.1s, 0.1s`, ungated, fires); `.checkbox::before` (`0.1s` across four longhands, ungated, fires);
`.modal-box` (`50ms`, ungated, fires); and one negative, `.tooltip*` (`75ms`, correctly gated inside
`(prefers-reduced-motion: no-preference)`, must not fire).

## Reconciling with the shipped rules

Four items, each of which changes behavior the moment the motion work lands.

**`motion-band` is repointed, not retired.** Its duration regex finds literals
(`motion-band.ts:18-25`), so rewriting a declaration to `transition-duration: var(--cairn-dur-base)`
makes `durationsIn` return `[]` and the band check silently passes. Two changes keep it meaningful.
Its band widens from 150ms to 250ms to **70ms to 400ms**, the span of the five token values, so a
literal that rule 2 abstains on still gets a band check. And it keeps the `transition: all` ban,
which rule 1 therefore does **not** re-report, so one construct produces one finding under one id.
Retiring the id was considered and declined: the showcase's ratified 650ms carousel crossfade carries
a co-located `cairn-audit-disable-next-line motion-band` directive, and a retired id would turn that
directive into a dead-directive error, which is itself error tier.

**`isReducedMotionGuarded` treats `no-preference` as a guard.** `motion.ts:15` tests
`/prefers-reduced-motion/`, which matches `(prefers-reduced-motion: no-preference)`. Two live
consequences: `motion-band.ts:39` skips such a rule outright, so a 3000ms transition inside a
`no-preference` block is exempt from the band; and `reduced-motion.ts:94-97` registers its selectors
into `guardedByFile`, so a `no-preference` block satisfies the pairing for any identically selected
rule. DaisyUI already uses the inverse gate four times in the shipped sheet, so this latent defect
turns live the moment cairn writes correct CSS. It is task 1's third half, fixed before any rule is
specified against it (decision 8).

**`isMotionProperty` covers four properties.** `motion.ts:10` matches
`transition|transition-duration|animation|animation-duration`, with no `transition-property`,
`transition-timing-function`, `transition-delay`, `animation-delay`, or `animation-timing-function`.
Rule 2's easing half needs it widened, and widening it changes what `motion-band` and
`reduced-motion` see: `reduced-motion` starts convicting rules that declare only a timing function.
Both are re-baselined against the widened predicate in the same task, and the re-baselining is the
work rather than the predicate change.

**`cairn-admin.css:545` fires `reduced-motion` falsely the moment that file joins `CSS_FILES`.**
`reduced-motion.ts:107-115` matches by normalized selector-text equality while the blanket guard at
`:1115` names `[data-theme='cairn-admin'] *`, so the rule fires on `.cairn-caret`'s declaration,
which the blanket block genuinely covers. The fix follows the position the language record states
once and uses everywhere: a rule whose selector is universal or attribute-only, carrying no class,
is the floor, and a floor discharges the pairing for the file. `reduced-motion` gains that clause,
which resolves the false positive without weakening the file-scoped matching (`guardedByFile`) that
stops the blanket block from satisfying a component's obligation from a distance.

## The harness additions

Sized against the runner as it is, not as a rule's line item wishes it were.

| Addition | Size | Why |
|---|---|---|
| `RenderedBrowser.newContext` gains `reducedMotion` and `hasTouch` | Small | Two members on a narrow type (`rendered/types.ts:60`) |
| `runRendered` gains an emulation axis, declared by rules the way `states` is | **Large** | `runRendered` (`rendered.ts:149-252`) nests pages, then themes, then one context, then states, then one page, and `RenderedRule.check` takes one page with no mechanism to carry state between invocations. An axis above the context threads a new loop level through the runner, extends the rule declaration surface, and multiplies contexts: six pages by two themes by one reduced pass is twelve new contexts and twelve new page loads, each re-running the hydration settle |
| A shared CSSOM walker joins `__cairnAudit` beside `signature` and `isVisible` | Medium | A throwaway probe is about forty lines; a shared one handles `CSSNestedDeclarations`, `CSSSupportsRule`, `CSSContainerRule`, `CSSLayerBlockRule`, `@starting-style`, and a per-sheet `SecurityError` |
| `RenderedPage.hover` | Not needed | The modality gate reads the CSSOM rather than a forced state, and the rendered hover half is out of this pass anyway |

The axis is the pass's one large item and it exists for exactly one rule. It is taken rather than
cut, because the delay finding is a bug shipping today and the CSSOM delay scan is the only technique
that reaches it. Two negative results bound the design and are recorded so a later pass does not
re-run them: CDP `Emulation.setEmulatedMedia` with a `features` array for `hover` and `pointer` was
silently ignored on the measured Chromium, and computed styles resolve every `var()`, so a rendered
vocabulary check can compare values but never token names (enforcement, Part 2).

## CI wiring

**The static half joins the gate that already runs.** `scripts/checks/check-invisible-craft.mjs`
calls `runStatic` over five roots with `cssFiles: ['examples/showcase/src/theme/theme.css']`,
filtered by `scopeReport` to `['gap-scale', 'token-colors', 'motion-band']`, and it is wired into CI
at `.github/workflows/test.yml:71`. Two additions, and no second config and no second gate:

- `RULE_IDS` gains `motion-property`, `motion-vocabulary`, and `motion-hover-gate`.
- `CSS_FILES` gains `src/lib/components/cairn-admin.css`.

A root `cairn-audit.config.json` plus two npm scripts was considered and declined: it would create a
second, narrower gate beside the one already running, since `DEFAULT_STATIC_SCOPE` drops the three
showcase roots this gate covers, and `motion-band` would run twice against two different scopes.

Order matters. The `cairn-admin.css:545` false positive is resolved before `CSS_FILES` gains the
file, per the reconciliation above.

**The rendered half gets its own workflow step, owning its own preview server.** The alternative, a
Playwright spec inside the showcase e2e suite, is declined. The e2e server is Playwright's own
`webServer` (`examples/showcase/playwright.config.ts:29-34`), its lifetime is the `playwright test`
process, and `.github/workflows/e2e.yml:118` runs only the e2e command, while the audit harness
refuses to start a server (`rendered.ts:15-17`). The deciding reason is second-order: that server is
built with `VITE_CAIRN_E2E=1`, so riding it would audit an e2e-flagged build rather than the build a
consumer ships, and the rendered rule is the one that reads vendor CSS.

Per the gate-economy rule, the static half joins the per-task gate, because it is fast and already
there. The rendered half runs at the pass-end gate and in CI.

## Deliverables

Four artifacts beyond the code.

**The design system's Motion section** (`docs/internal/admin-design-system.md`). The token table, the
allowlist and the snap list with the one exception, the enter and exit rule with its floor, the
modality gate, the reduced-motion policy by property class, the responsive rules, and the DaisyUI
decision with its declined override and its reopen trigger. Written in that document's own register:
agent-facing, rules first, the load-bearing mechanics that are not visible in the markup called out.

**The extend track's motion recipe** (`docs/extend/animate-a-custom-screen.md`). The first
per-pattern recipe page, written for a developer building a custom admin screen: the tokens they
write, the four rules they will meet and what each fix message means, the three join limits stated as
limits, and the one configuration line a consumer owes (naming their own theme CSS in
`static.cssFiles` if they want the CSS-family rules to read it, which is already true of
`token-colors`). It joins `docs/extend/README.md`'s index. It grades under Vale's Google package and
the extend arm's register in `docs/internal/docs-register.md`.

**The audit reference** (`docs/reference/cairn-audit.md`). Three rows in the static table, one in the
rendered advisory table, the `motion-band` band correction, and the coverage limits. `check:reference`
gates an undocumented export; this page is gated by review, so the plan makes it a task acceptance
criterion.

**The records.** `docs/HISTORY.md`, the ROADMAP entry closed and the two follow-ups filed (the
rendered hover half, and the `modal-bottom` reopen trigger if it is not carried as a `WATCH:`), the
friction log triaged, and the `CHANGELOG.md` entry under `## Unreleased`.

## Verification

Three things carry the proof, because a still frame cannot show a duration.

**The visual suite gains six surfaces across the five-viewport bar.** Today `SIGNUPS_WIDTHS = [320,
390, 768, 1440, 2560]` (`examples/showcase/e2e/admin-visual.spec.ts:7`) drives exactly one route,
`/admin/signups`, a read-only list with no editor, no zen state, no dialog, and no open drawer, and
the edit page is captured at 1440 and 768 only. None of the surfaces this language legislates is
currently rendered across the bar.

| Surface | Why the bar matters |
|---|---|
| The edit page in zen | The content offset, the chrome regions, the chip placement |
| The drawer open as an overlay | Only reachable below `lg` on content routes, below `xl` on desk routes |
| The persistent sidebar | The other side of the same flip, at 1440 and 2560 |
| A dialog open | `DeleteDialog` is the smallest instance |
| The command palette open | Its narrow-width pinning is a cairn-invented rule with no precedent |
| The media library with a selection | The selection ring is a paint change the language governs |

Baselines are CI-canonical: they regenerate on CI through `e2e.yml`'s `update_snapshots` run and are
committed from there, never from this workstation.

**The zen toggle's layout-count assertion is the regression guard.** The zen record's measurement
gives the method and the numbers: entering zen with the margin untransitioned produces two distinct
computed `margin-left` values and one layout, and with the transition it produces ten or more values
and ten to eleven layouts (zen, "cairn's own zen toggle, measured"). The spec turns that into two
assertions in the showcase e2e:

- In a default context at 1440, toggling zen produces more than two distinct computed `margin-left`
  values on `.drawer-content` during the toggle window. This fails if the transition is ever dropped,
  scoped away, or beaten by a later rule.
- In a `reducedMotion: 'reduce'` context at the same width, it produces exactly two. This fails if
  the exception ever escapes the blanket block.

Frame-interval counts are deliberately not asserted. The same 700ms window returned 40 to 46 frames
in some runs and 88 to 92 in others under headless Chromium, so the over-threshold counts are a noise
floor and `LayoutCount` is the reliable signal.

**The fresh-context read.** The pass carries rendered paint, so it ends with a `visual-verifier`
dispatch over the new surfaces in both schemes, and the zen toggle at 390 and at 1440 joins the
reproduction manifest as a motion case. The builder's own "matches" is never the verdict.

## The changelog window

Six `Consumers must:` lines, all in one release.

1. `cairn-audit` gains three error-tier static rules (`motion-property`, `motion-vocabulary`,
   `motion-hover-gate`) and one advisory rendered rule (`motion-reduced-delay`). A custom admin screen
   that transitions a layout property, writes `transition-all`, writes a literal duration or easing, or
   declares an ungated hand-authored `:hover` transition now fails `npx cairn-audit`. Move onto the
   `--cairn-dur-*` and `--cairn-ease-*` tokens, or suppress with a reason.
2. `motion-band`'s band widens from 150ms to 250ms to 70ms to 400ms, and it no longer reports a call
   site that references a token. A site relying on the narrow band loses that check; the vocabulary
   rule is what replaces it.
3. The admin sheet sets `--default-transition-duration` and `--default-transition-timing-function` to
   cairn tokens on the admin root. A bare `transition` utility on a custom screen changes curve from
   Tailwind's `cubic-bezier(0.4, 0, 0.2, 1)` to Carbon's productive standard
   `cubic-bezier(0.2, 0, 0.38, 0.9)`. The duration is unchanged at 150ms.
4. The admin's reduced-motion block now zeroes `transition-delay` and `animation-delay`. A custom
   screen that relied on a delay surviving a reduced-motion preference loses it, which is the fix.
5. The edit page's preview pane no longer animates its width when the split changes. The resize snaps.
6. The upload progress fill is a cairn-owned bar transitioning `transform` rather than a native
   `<progress>` fill transitioning `width`. A site that styled `::-webkit-progress-value` on that
   element restyles the bar.

No export changes, so `check:surface` stays byte-identical.

## Non-goals

- **No route transitions in the admin**, at any viewport, on any input device. A cross-fade between
  two admin pages carries no information, the default 0.25s is paid before the new route's first
  paint, a view transition holds a snapshot over the live DOM while the admin's focus management
  needs focus on the first frame, and the family already made this decision: the showcase's own
  comment scopes its route transition away from the admin (`examples/showcase/src/theme/theme.css`
  lines 380 to 381). This pass writes no `startViewTransition` and no `view-transition-name`, and it
  adds no gate for them either; the rule is that nobody writes one.
- **No scroll-linked motion.** No collapsing header, no parallax, no pull-to-refresh. The editing
  surface is the thing that needs stable geometry, and a header that changes height while someone
  types moves the text under the caret.
- **No DaisyUI fork and no unlayered vendor override**, per decision 4.
- **No motion on public pages.** A site's own `render` output and its theme are the developer's, and
  the language governs the admin frame only.
- **No spring primitives.** CSS has none that degrades well; the no-overshoot intent is taken through
  Carbon's productive curves instead.
- **No rendered vocabulary check.** Computed styles resolve every `var()`, so a rendered check can
  compare values but never token names, which is a weaker rule wearing the strong one's name.

## Risks

- **The default curve change reaches everything.** Setting
  `--default-transition-timing-function` on the admin root repaints every bare `transition` utility in
  the admin and in every consumer's custom screens. It is a one-line change with repo-wide effect, it
  is the largest visual delta in the pass, and it lands in task 1 so the whole pass renders against
  it. Mitigation: the visual suite's new surfaces plus the CI-canonical baseline regen, and the
  `Consumers must:` line.
- **The three shipped violations convict on run one.** The moment `cairn-admin.css` joins `CSS_FILES`
  and the new ids join `RULE_IDS`, `EditPage.svelte:1643`, `EditPage.svelte:2047`,
  `MarkdownEditor.svelte:530`, and `cairn-admin.css:545` all fire. The gate goes red between the rule
  task and the migration task. Mitigation: the wiring task lands after the migration task, and the
  plan orders them that way explicitly.
- **The emulation axis is the one large item, for one advisory rule.** If it overruns, the cut is the
  rendered half in its entirety, per the enforcement record's own sequencing advice, and the pass
  still delivers the token set, the three static rules, and the migration, which is the ruling's core.
  Cutting it also cuts the delay bug's detection, not the delay bug's fix, which task 1 lands
  regardless.
- **The vocabulary rule ships at error tier on a consumer's first upgrade.** A consumer with custom
  admin screens gets findings on run one. Advisory-on-first-adoption was considered and declined:
  tier is a property of the rule and cannot differ between cairn's gate and a consumer's run, every
  other static rule in the registry is error tier, and an advisory static rule would be a novel shape.
  The migration path is the documented one, a suppression with a reason, and the recipe page carries
  it.
- **Three claims are reasoning rather than measurement and are proved in task 1**: that a
  class-bearing `!important` rule reliably outranks the blanket block's `[data-theme] *`, which the
  Tailwind v4 layer-order rule already requires proving in the built sheet; that the chosen
  token-referencing authoring form for a Tailwind duration compiles to a `var(--cairn-dur-*)` in the
  sheet rather than to a literal; and the ten-to-fourteen selector count for a DaisyUI override block
  nobody has written, which decision 4 makes moot.
- **A worktree showcase e2e proves `main`'s engine.** The showcase's `node_modules` symlinks back to
  the main checkout, so a from-scratch `npm install` in the worktree's showcase is a pre-dispatch step
  in the plan, per this repo's standing gotcha.

## Task outline

Eleven tasks, for the plan to expand. Each row names its files, its dependencies, and whether it moves
rendered paint and therefore carries the showcase e2e in its own gate.

**1. The token set, the theme defaults, and the two shipped bugs. Paint.**
Files: `scripts/build/admin-css.input.css`, `src/lib/components/cairn-admin.css`,
`src/tests/unit/admin-css-build.test.ts`, `src/tests/unit/admin-sheet-inventory.test.ts`.
Authors the five durations and three curves on both theme roots, points
`--default-transition-duration` and `--default-transition-timing-function` at them, adds
`transition-delay: 0s !important` and `animation-delay: 0s !important` to the blanket block, and
proves in the built sheet that a class-bearing `!important` rule outranks the blanket block and that
the chosen Tailwind duration authoring form compiles to a token reference. Depends on nothing.

**2. The shipped-rule reconciliation. Not paint.**
Files: `src/lib/audit/rules/static/motion.ts`, `motion-band.ts`, `reduced-motion.ts`, and their three
fixture suites.
Widens `isMotionProperty`, fixes `isReducedMotionGuarded`'s `no-preference` match, widens
`motion-band`'s band to 70ms to 400ms while keeping its `transition: all` ban, adds `reduced-motion`'s
floor clause so a universal or attribute-only selector discharges the file's pairing, and re-baselines
all three. Depends on task 1 (the token values fix the band).

**3. `motion-property`. Not paint.**
Files: `src/lib/audit/rules/static/motion-property.ts`, the static registry,
`src/tests/unit/audit/rules/motion-property.test.ts`.
The allowlist, the snap list, the `all` deferral to `motion-band`, the three-property cap, the
`animate-*` keyframe clause, and the shell exception with its two-sided fixture. Depends on task 2
(shares the widened predicate). Independent of tasks 4 and 5.

**4. `motion-vocabulary`. Not paint.**
Files: `src/lib/audit/rules/static/motion-vocabulary.ts`, the static registry,
`src/tests/unit/audit/rules/motion-vocabulary.test.ts`.
The token check on both surfaces, the class join on `elementStart`, the vendor-class exemption, the
companion built-sheet assertion, the `infinite` carve-out, the three abstention shapes, and the three
join limits documented in the rule's own doc comment. Depends on tasks 1 and 2. Independent of tasks
3 and 5.

**5. `motion-hover-gate`, static half. Not paint.**
Files: `src/lib/audit/rules/static/motion-hover-gate.ts`, the static registry,
`src/tests/unit/audit/rules/motion-hover-gate.test.ts`.
Mirrors `focus-parity`'s shape. Depends on task 2. Independent of tasks 3 and 4.

**6. The admin migrated onto the language. Paint.**
Files: `src/lib/components/EditPage.svelte`, `MarkdownEditor.svelte`, `CairnAdminShell.svelte`,
`CairnMediaLibrary.svelte`, `ConceptList.svelte`, `MediaHeroField.svelte`, `HelpHome.svelte`,
`cairn-admin.css`, `scripts/checks/custom-surface-budget.json`.
The three violations fixed (the feedback alert's named property list, the preview pane's width
transition removed, the upload fill rewritten to `transform`), `cairn-admin.css:545` onto tokens, the
three `duration-[250ms]` classes onto the token form, the dropzone's drag-over paint state added, the
two vendor hover guards added with their budget entries, the drawer transitions scoped to
`isPersistentSidebar`, and the resize stopper wired. Depends on tasks 3,
4, and 5, so the rules exist before the code is measured against them.

**7. Zen. Paint.**
Files: `src/lib/components/CairnAdminShell.svelte`, `EditPage.svelte`, `cairn-admin.css`.
The `.drawer-content` `margin-left` transition at `shift` in and `base` out on the paired curves, the
chrome regions' fade in and out, the chip's delayed entrance and immediate exit, the card's box left
snapping, and `setZen()`'s `flushSync()` focus sequence kept synchronous so motion never gates focus.
Depends on tasks 1 and 6.

**8. The rendered harness. Not paint.**
Files: `src/lib/audit/rendered/types.ts`, `src/lib/audit/rendered.ts`,
`src/lib/audit/rendered/page-surface.ts`, the rendered harness tests.
`newContext` gains `reducedMotion` and `hasTouch`; `runRendered` gains the emulation axis declared by
rules the way `states` is; the shared CSSOM walker joins `__cairnAudit`, handling nested declarations,
supports, container, layer-block, and `@starting-style` nodes plus a per-sheet `SecurityError`.
Depends on nothing. Runs in parallel with tasks 2 through 5.

**9. `motion-reduced-delay` and its CI step. Not paint.**
Files: `src/lib/audit/rules/rendered/motion-reduced-delay.ts`, the rendered registry,
`src/tests/unit/audit/rules/motion-reduced-delay.test.ts`, `.github/workflows/`.
The advisory CSSOM delay scan with its three positive and one negative fixture, plus the workflow step
that starts and holds its own `npm run preview` on a dedicated port and runs
`cairn-audit --rendered`. Depends on task 8.

**10. The engine's tree wired, and the visual suite. Paint.**
Files: `scripts/checks/check-invisible-craft.mjs`, `examples/showcase/e2e/admin-visual.spec.ts`,
`src/tests/unit/reproductions-manifest.test.ts`.
`RULE_IDS` and `CSS_FILES` additions with the gate green, the six new surfaces across the
five-viewport bar, the zen toggle's two layout-count assertions, and the zen toggle added to the
reproduction manifest as a motion case. Baselines regenerate on CI. Depends on tasks 6, 7, and 9.

**11. Docs and records. Not paint.**
Files: `docs/internal/admin-design-system.md`, `docs/extend/animate-a-custom-screen.md`,
`docs/extend/README.md`, `docs/reference/cairn-audit.md`, `docs/HISTORY.md`, `ROADMAP.md`,
`CHANGELOG.md`, `docs/internal/engine-rulings.md`.
The Motion section, the recipe page, the reference rows, the ruling rows quoting decisions 3 and 4,
the two follow-ups filed, and the `## Unreleased` block read whole. The conductor writes
`docs/STATUS.md`, never this task. Depends on everything.

**Parallelism.** Tasks 3, 4, 5, and 8 are independent of each other and share no files, so the plan
marks them for `pass-execute`'s parallel mode. Every other edge is a real dependency. Tasks 1, 6, 7,
and 10 move rendered paint and carry the showcase e2e in their own gate; the other seven run the check
suite and their own unit tests, with the full suite at the pass-end gate and on every CI push.
