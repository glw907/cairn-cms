# Admin motion language design (the motion pass, after polish-C, before the cut)

**Status:** revision 2, folded 2026-09-13 against three adversarial reviews. One pass. Plan follows through `writing-plans`; the pass runs
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

## Fold (2026-09-13)

Three adversarial reviews ran against revision 2 and the plan's draft 1: a contract-and-criteria
lens, a mechanics-and-feasibility lens, and a domain-risk lens. Every ranked change from all three is
applied here and in the plan. Six items had two lenses disagreeing, and each is resolved on the
standing rule that the domain lens wins on safety and the mechanics lens wins on executability.

1. **The resize stopper is cut from the pass.** The domain lens showed the specified form is a no-op:
   a class on the bare theme wrapper never matches the scoped sheet, whose every rule is
   `:where([data-theme]) .thing`, and `transition-*` and `animation-*` do not inherit, so the class
   suppresses nothing on the drawer or the sidebar. Its working form is a universal descendant rule,
   which is unlayered and costs an allowlist entry. The mechanics lens measured the components layer
   at 19 selectors against a cap of 19, so the specified form could not land either. Safety wins: the
   stopper becomes a documented limitation in the design system's Motion section and a ROADMAP Later
   entry carrying the finding that its working form costs an unlayered rule. A layout change on
   resize snaps structurally already, because no layout property transitions.
2. **The vendor exemption reaches `motion-property`'s class join.** The domain lens measured four
   DaisyUI component classes transitioning snap-list properties in the shipped sheet, one of them on
   cairn's own markup, so the rule as specified could not go green in the engine's own tree. The
   mechanics lens showed the `conditions` array reports at-rule preludes only, so it cannot tell
   DaisyUI's `@layer components` output from a cairn rule in the same layer. Executability wins on
   the discriminator: the exemption tests whether the compiled declaration's rule came from DaisyUI's
   plugin output, and where the sheet cannot answer that, it falls back to an explicit list of
   DaisyUI component class names shipped with the rule.
3. **The zen offset is authored in `cairn-admin.css`.** Both the domain lens and the mechanics lens
   found that `CairnAdminShell.svelte` carries no `<style>` block, no `margin-left`, and no
   `setZen()`, so the exception's file key matched nothing that could exist. Executability decides
   the authoring site: `cairn-admin.css` is the only file a `.drawer-content` selector can live in,
   and the exception is keyed on that file plus that selector plus `margin-left`.
4. **The upload fill keeps the native `<progress>` and loses its motion.** The domain lens measured
   that `PlaceholderWidget.eq()` compares the progress fraction, so CodeMirror destroys and recreates
   the widget on every tick and no transition can apply to it. Safety wins: the element's ARIA is
   already correct and stays, the transform overlay is dropped, and the changelog line says what
   ships, which is a snap.
5. **The hover gate's predicate widens.** The domain lens showed both shipped exemplars declare paint
   rather than motion, so the rule as specified was vacuous over the engine tree and the migration it
   mandated was an unrequested paint change that would have removed hover paint on coarse pointers.
   The predicate now reaches a `:hover` state whose element carries a transition or animation, the
   migration is dropped, and the fixtures are synthetic.
6. **The consumer scope question is answered in the audit rather than in the gate.** The domain lens
   showed `DEFAULT_STATIC_SCOPE`'s `src/lib/components` is where a consuming site keeps its public
   components, which the charter gives the developer. The mechanics lens wanted the restriction in
   the gate script, where the engine's own red would be fixed. Both are served by one mechanism, a
   rule-level `adminOnly` flag resolved over a `static.adminScope` root list: a consumer gets the
   boundary from that list's own default, and the engine's gate sets the list to its own roots. The
   Fold correction below records the mechanism in full.

Two consequences the fold carries beyond the six. The vendor property exemption records four more
disagreements, so the DaisyUI section enumerates eleven rather than seven. And the dropzone's
drag-over paint takes `base` rather than `instant`, because it rides the element's existing
`transition-colors`, and the alternatives are a CSS rule the components layer has no room for or a
duration class that would retime the same element's hover paint.

### Fold correction (2026-09-13)

A review of the folded pair escalated one item, and the conductor ruled it. **The admin boundary is
one mechanism, not two.** The fold left the rule-level `adminOnly` flag and a path term inside the
gate's own `scopeReport` standing side by side, and the two contradict each other: `scopeReport`
filters a report `runStatic` has already produced, so a path term there can only subtract, and it
can never restore a root the flag excluded. The mechanism is this, and nothing else:

- A static rule declares `adminOnly: true`. The field is new and optional on the static rule type,
  and `./audit` is not a package export subpath, so no package surface moves.
- The audit config gains an optional `static.adminScope` root list, which is a new consumer-facing
  config key. Its default is `src/routes/admin` and `src/lib/admin-toolkit`.
- `runStatic` resolves an `adminOnly` rule over `static.adminScope` alone, and every other rule over
  `static.scope` as today. The restriction reaches both surfaces a rule reads: the components under
  those roots, and the `static.cssFiles` entries that lie inside them.
- The engine's own gate sets `static.adminScope` to `src/lib/components`, `src/lib/admin-toolkit`,
  and `examples/showcase/src/routes/admin` when it builds its config. `scopeReport` is unchanged, it
  keeps filtering by rule id alone, and its second caller
  (`scripts/checks/check-admin-css-classes.mjs`) is untouched.

The boundary is no longer free of surface: it costs one config key. The key is documented in
`docs/reference/cairn-audit.md` and in the recipe page, where it joins `static.cssFiles` as the
second configuration line a consumer may owe. Neither is required by default.

Two smaller corrections ride with it here, and the plan carries the rest. Task 6a's third deliverable
is reconciled with the migration table above: of the three `duration-[250ms]` sites, only
`EditPage.svelte:1643` takes the token form, `:2047` is removed outright, and `:1428` drops its
duration class to ride the theme default. And the fold made a third judgment call of its own,
disclosed here beside the dropzone's token and the disagreement count: `editor-folding.ts`'s
`FLASH_MS = 400` does not move with the unfold flash's token, because it is the timer that removes
the flash class and the CSS transition is what paints the fade.

## Revision 2 (2026-09-13)

This section records what revision 2 changed against revision 1. It is history: where an item below
conflicts with the Fold above, the Fold governs, and three of them do (the per-rule root restriction,
the transform overlay, and the resize stopper). Revision 1 went to an adversarial review, which
returned fifteen ranked changes, a fidelity table against Carbon, and thirteen completeness items.
This revision applied all of them. What changed:

- **The CI wiring no longer runs the admin language over the showcase's public theme.** The three new
  ids are restricted to the two engine roots, and the per-rule root restriction is a task 10
  deliverable, because `scopeReport` filters by rule id alone today.
- **`transition: all` has one owner, `motion-band`.** Rule 1 no longer re-reports it.
- **Rule 4 reads computed values per element** under the reduced context, with the CSSOM walk
  supplying the authored rule its fix message names.
- **Three attributions to Carbon are corrected.** The one-band-faster exit ladder and the
  stays-nearby carve-out are cairn's, on Atlassian and Material precedent. Carbon is not silent on
  reduced motion, and its "always provide alternatives" is quoted with decision 3 recorded as
  overriding it for the zen offset. The scrim's departure from Carbon's `duration-slow-02` is stated.
- **The theme-change cross-fade row is cut to a dash**, and the scope bound is restated to cover what
  the pass does add.
- **"May opt back in" is a permission**, and the opt-back-ins this pass mandates are listed.
- **The upload progress bar keeps its native `<progress>`** and gains a transform overlay, so the
  implicit `progressbar` role and its values survive.
- **The `infinite` carve-out is a positive clause** rather than a blanket exemption.
- **Task 5 folds into task 3, task 9 into task 8, and task 6 splits into 6a and 6b.** Tasks 3 and 4
  no longer claim to be file-disjoint. Ten tasks.
- **Eleven line citations are corrected** against `main`, and one piece of evidence that does not
  exist in the tree is replaced with evidence that does.

Two escalations went to Geoff and came back as rulings, both applications of decision 4's
conform-to-conventions position. No unlayered override of a DaisyUI internal, and a vendor timing
stays the vendor's vocabulary.

1. **The two `@media (hover: hover)` guards on `.tooltip` and `.menu` are dropped.** Both components
   are recorded as vendor disagreements instead, and the touch-tooltip visibility defect (long-press
   opens and sticks) is filed to the borrowable-patterns borrow-1 pass beside the rendered hover-gate
   half, carrying the review's finding that a transition guard does not fix a visibility rule.
2. **The drawer scoping to `isPersistentSidebar` is dropped.** The persistent drawer's vendor
   transition is recorded as a fifth vendor disagreement. The zen offset exception stands as decided.

## The aim

The admin animates in a dozen places and no document says which state changes animate, which snap,
at what duration, on what curve, or how each degrades under reduced motion. This pass writes that
language, ships it as tokens the admin sheet carries, enforces it as `cairn-audit` rules, migrates
the admin onto it, and hands the result to the borrowable-patterns work as the extend track's first
per-pattern recipe.

Three things bound the scope. The pass adds motion in exactly two places, each named here and
nowhere else: the zen offset (decision 3) and the dropzone's drag-over paint state. Every other
transition it touches is a migration of a declaration that ships today. It takes no rendered rule beyond the delay check. And it changes no public export.
No paint opts back in under reduced motion this pass, for the budget reason the migration states.

## Decisions (Geoff, 2026-09-13)

Every clause a task writes into `docs/internal/engine-rulings.md`, the design system, or a docs page
cites this spec by path and date and quotes the decision text below.

1. **Purpose:** professional-level visual polish, nothing novel, in the admin's register. Clean,
   conventional, polished, understated, professional.
2. **One reference:** IBM Carbon's productive motion set. Its duration and easing tokens ship under
   cairn names, each naming the Carbon token it aliases; its entrance and exit curve pairing and its
   distance rule are adopted. Atlassian is the tiebreaker where Carbon publishes no machine-checkable
   rule, which is reduced motion ("off and instant"). Carbon is not silent there: it asks that a
   system "always provide alternatives for interface state transitions" and "consider simplified or
   reduced motion designs", and it publishes no `prefers-reduced-motion` pattern to check. GNOME and
   Material are comparison data and govern nothing, except where this spec cites Material or
   Atlassian by name for a rule Carbon does not publish.
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
curves, and a component that needs a sixth duration or a fourth curve is wrong.

The charter test runs first, per `what-cairn-is-and-is-not.md`. Motion in the admin frame is cairn's
job, because the admin frame is what cairn owns and a developer's custom screen inherits its idiom
through tokens and gates rather than by re-deriving it. Motion on a site's public pages is the
developer's, and the pass adds none.

## The token set

Five durations and three curves, authored in `src/lib/components/cairn-admin.css`'s two existing
`[data-theme=…]` blocks, near `:81` and `:255`, which `scripts/build/admin-css.input.css` imports.
That file declares no theme root and no `@theme` block of its own, so the two existing blocks are the
only authoring site that needs no new rule, and adding declarations to a rule that already ships
costs no `unlayeredAllowlist` entry, because the check compares whole-rule selector sets. Every value
is Carbon's, read from the shipped `@carbon/motion` 11.52.0 package and its DTCG `motion.json`
(enforcement, Part 5).

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

Carbon's `duration-slow-02` (700ms) is deliberately not aliased, and that is a departure worth
naming rather than a gap. Carbon documents slow-02 for "background dimming, large hero transitions",
and the admin has exactly one background-dimming surface, the overlay drawer's scrim. cairn puts the
scrim on `settle` with the panel it accompanies instead, for two reasons: a scrim that outlasts its
panel by 300ms reads as a lag rather than a dimming, and 700ms is out of the register decision 1
sets. Adding a sixth token later is a token change, not a rule change. Carbon's expressive easing
set is out of register for an admin and is not aliased either; Carbon's model is three curves in two
registers, and cairn aliases the productive three.

The band ladder, used by the exit rule below, is instant, quick, base, shift, settle.

The `--cairn-dur-*` and `--cairn-ease-*` namespace is public surface. It is not a package export, so
`check:surface` and `check:reference` never see it, but the recipe page tells a developer to write
those names and an error-tier rule requires them, which is the definition of a contract. What holds
it is `src/tests/unit/admin-sheet-inventory.test.ts`, which asserts the eight names and their values
in the built sheet. Renaming one is a `Consumers must:` line.

One Carbon rule the token set encodes rather than a gate enforcing it. Duration follows distance:
"the larger the change in distance (traveled) or size (scaling) of the element, the longer the
animation takes" (enforcement, Part 5), which is why a hover paint change takes `base` and the
shell's 224px offset takes `shift`.

Enter and exit are paired, and the pairing has two halves with different owners. The curve half is
Carbon's: an element that enters uses the entrance curve and one that leaves uses the exit curve,
which "speeds up as it exits from view". The duration half, that an exit runs one band faster than
its enter, is **cairn's own rule**, not Carbon's. Carbon publishes no exit-is-shorter duration rule.
The precedent cairn takes it from is Atlassian's and Material's shared position that an exit should
not make the reader wait, and decision 2 names Atlassian as the tiebreaker where Carbon publishes no
checkable rule. It is recorded here as a cairn rule so a later pass does not go looking for it in
Carbon's tables.

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

The defaults themselves are Tailwind's, declared inside `@layer theme` on the admin scope by the
built sheet, and every transition utility reads
`var(--tw-duration, var(--default-transition-duration))`. Overriding them takes an unlayered
restatement on the same two roots, which outranks the layered declaration, or a `@theme` block if the
build accepts one on those roots. Task 1 measures which form the build produces and reports it, and
asserts by computed style that both defaults resolve to the token values on the admin root at
runtime. That runtime assertion is the only proof the curve change has, because a resting frame
carries no curve.

## The property allowlist

A transition or a finite animation may name only these properties:

`opacity`, `color`, `background-color`, `border-color`, `box-shadow`, `outline-color`,
`outline-width`, `outline-offset`, `rotate`, `translate`, `scale`, `transform`, `grid-template-rows`.

Anything else is outside the language. Nine properties are named errors rather than merely absent,
because they are the layout-thrashing set and the judder they produce is what reads as abrupt:
`width`, `height`, `top`, `left`, `right`, `bottom`, `margin` and its longhands, `padding` and its
longhands, `font-size`. `transition: all`, and `transition-all`, is an error for the reason
the shipped `motion-band` rule already gives: it re-animates every property a future edit adds,
including ones that should snap. **`motion-band` is its one owner.** Rule 1 below does not re-report
it, so one construct produces one finding under one id, and the fix message that knows about
`@starting-style` lives with `motion-band`.

A property that is neither allowlisted nor named on the error list still fails, as merely outside
the language. `max-width` on the zen editor card is the shipped instance: it is not layout-thrashing
in the way the nine are, so it earns no named error, and the finding a reader gets says the property
is outside the vocabulary rather than naming a judder. That difference in message is deliberate.

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

The admin sheet's `.drawer-content` rule transitions `margin-left`, at `--cairn-dur-shift` on
`--cairn-ease-entrance` entering zen and one band faster (`--cairn-dur-base`) on `--cairn-ease-exit`
leaving it. Under reduced motion it takes the blanket block and snaps.

**The authoring site is `src/lib/components/cairn-admin.css`, and the exception is keyed on it.**
`CairnAdminShell.svelte` carries no `<style>` block, so a `.drawer-content` rule cannot come from
that file at all, and the shipped offset is two conditional Tailwind margin utilities on the
drawer-content element (`CairnAdminShell.svelte:692-693`), which the class-token join would see as
the compiled sheet's own utility selector rather than as `.drawer-content`. The admin sheet is the
one file a `.drawer-content` selector can live in, so the transition rule is authored there beside
the margin utilities the shell keeps.

The exception is an allowlist entry scoped to one engine-owned file, one selector in it, and one
property, never a global relaxation. Keying it on the selector alone would hand the licence to any
consumer element that happens to be called `.drawer-content`, which is DaisyUI's class name and
therefore likely. The key is the triple: the file must resolve inside the engine's own tree
(`src/lib/components/cairn-admin.css`, or its `dist` equivalent when the rule runs from an installed
package), the selector must be `.drawer-content`, and the property must be `margin-left`. Any other
element transitioning a snap-list property still fails, in the engine and on a consumer's custom
screens alike. It ships with a three-sided fixture: the admin sheet's own offset passes, a second
selector in the same file transitioning `margin-left` fails, and a consumer-owned file's
`.drawer-content` transitioning `margin-left` fails.

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

One carve-out, also cairn's own. An element that leaves but stays nearby, ready to reappear, uses
`--cairn-ease-standard` rather than the exit curve, and keeps its band in both directions rather than
taking the one-band reduction. Carbon's published text for standard easing is narrower than this:
it covers an element "visible from the beginning to the end of a motion", which is a moving element
rather than a departing one, and Carbon names no side-panel case. The carve-out is cairn's reading
of that text, recorded as cairn's. The zen chrome is the case, which is why it leaves and returns at
`quick`.

One accessibility obligation travels with the offset. `setZen()`'s `flushSync()` focus lands while
`.drawer-content` is still traveling 224px, so 2.4.11's non-obscured requirement is a question about
the travel window rather than about the resting frame, which is the only thing a screenshot can see.
Keeping the focus sequence synchronous is necessary and not sufficient; the Motion section records
that the travel window is unasserted, so a later pass knows the gap is known rather than missed.

The zen offset fits the same description and does not take the carve-out. The offset leaves and
stays nearby in exactly the chrome's sense, so the carve-out would give it `shift` in both
directions on the standard curve. Decision 3 settles it the other way, at `shift` in on the entrance
curve and `base` out on the exit curve, because the offset is the motion the reader asked for and
the way back out of zen is the one the finger is waiting on. It is an explicit exception to the
carve-out rather than an oversight, and the design system's Motion section says so.

## The modality gate

Every hover-state transition cairn authors sits inside `@media (hover: hover)`.

**The rule's predicate is wider than the rule name suggests, and the widening is what makes it
detect anything.** It fires on a hand-authored `:hover` state whose element carries a transition or
an animation, or on a `:hover` rule that itself declares motion, when neither sits inside a hover
media feature. The narrow reading, a `:hover` rule that itself declares motion, finds nothing in the
engine's tree: both candidates the migration named declare paint on the `:hover` alternative and
carry their `transition` on the base selector (`HelpHome.svelte:562` and `:787`), and the shipped
guarded rule at `cairn-admin.css:1002` declares `--btn-bg` alone. A rule that convicts nothing in
the tree it ships from is the vacuous-gate failure this repo has recorded once already, so the
predicate reaches the pairing rather than the declaration.

The gate governs cairn's own authored rules. It does not reach a vendor component, because reaching
one means an unlayered rule pinned by a DaisyUI internal selector, which decision 4 refuses. Two
DaisyUI components the admin renders, `.tooltip` and `.menu`, ship ungated `:hover` transitions and
stay that way; they are recorded as vendor disagreements in the DaisyUI section below.

Tailwind's `hover:` variant already compiles that way, measured as 16 `(hover: hover)` media rules in
the admin's shipped sheets (enforcement, Part 2), so a `hover:` utility needs no work and the static
rule leaves it out of scope, exactly as `focus-parity` does. A hand-authored `:hover` rule needs the
guard added. The admin already models it once, at `cairn-admin.css:1002`, whose comment names the
reason: "so a touch device does not strand the lighter fill on the last-tapped segment."

**Adding the guard splits a hover and focus selector list in two, and that is authoring guidance
rather than a migration this pass runs.** The admin authors its pairs as one selector list;
`HelpHome.svelte:789-790` is the shipped shape, `.btn-quiet:hover, .btn-quiet:focus-visible`.
Wrapping that list in `@media (hover: hover)` carries the `:focus-visible` half into the guard and
kills focus motion for a keyboard attached to a touch device. So a pair splits before the guard goes
on: the `:hover` alternative moves inside it and the `:focus-visible` alternative stays outside.
`focus-parity` still passes after the split, because it looks for the sibling selector anywhere in
the same file rather than in the same selector list (`focus-parity.ts:33-40`, `knownByFile`).

**The engine tree has no shipped instance to migrate.** Both `HelpHome` pairs declare paint on their
`:hover` alternative and carry their `transition` on the base selector, so the widened predicate
reaches them through the base rule's motion rather than through the alternative, and the remedy the
fix message asks for is a guard on the alternative, not a rewrite of the paint. This pass migrates
those two rules onto the tokens and adds no guard, because wrapping a paint-only pair would remove
hover paint on a coarse pointer for no enforcement gain. The split is carried by the rule's fix
message and by the recipe page, as the one non-obvious step a consumer meets when their own rule
does declare motion. The rule ships a fixture that FIRES on a `:focus-visible` alternative sitting
inside the guard, so the mistake the fix message warns about is itself detected.

On touch, press carries the same feedback at `--cairn-dur-instant` with no delay. Nothing cairn
authors is revealed by hover at any width: in cairn's own surfaces hover carries feedback and never
information, so a touch device that loses a hover transition loses nothing it needed. DaisyUI's
`.tooltip` is the one surface where that does not hold, since a tooltip is information revealed by
hover, which is why the touch defect it produces is filed rather than patched.

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
| Paint (`opacity`, `color`, `background-color`, `border-color`, `box-shadow`, `outline-*`) | **May** opt back in by restating the transition inside the same guard with `!important`. Paint carries no positional motion, so keeping it is defensible. This is a permission, not a behavior: the floor is what the paint gets unless someone writes the restatement. cairn's own admin writes none this pass, for the budget reason below |
| Transform (`translate`, `scale`, `rotate`, `transform`) | Stays at the floor. Where the transform carried an entrance, substitute an opacity fade at the same band |
| Layout (`grid-template-rows`) | Stays at the floor. Snap |
| The zen offset | Stays at the floor. Snap, per decision 3 |
| Looping motion (a skeleton shimmer) | Off entirely, static tint instead. DaisyUI already gates `.skeleton`, so nothing is owed |
| Indeterminate progress (a spinner) | Runs. It conveys state, and WCAG 2.2.2 reaches auto-starting motion presented in parallel with other content, which a spinner replacing the content is not |

**The skeleton's own 2.2.2 answer, since the spinner's reasoning does not cover it.** A skeleton
shimmer is an infinite loop presented in parallel with other content, which is exactly what 2.2.2
reaches, and it runs longer than five seconds. What discharges it is the reduced-motion off switch
DaisyUI already ships on `.skeleton`, which is the mechanism 2.2.2 accepts. The spinner's argument
(it replaces the content rather than accompanying it) does not transfer, and the design system's
Motion section states both answers rather than one.

**Transitioning `outline-width` and `outline-offset` has a bound.** Mid-transition the focus
indicator can be thinner than 2.4.13's minimum. At `instant`, 70ms, the exposure is negligible, so
the allowlist keeps both properties and the Motion section carries the bound in a line: a focus
indicator's own geometry animates at `instant` and at no longer band.

**What the opt-back-in costs, and why cairn takes none of it.** Nine rows of the case table carry a
paint transition the floor would zero. None of them is restated this pass. The mechanism is the
reason: a restatement must sit unlayered, inside the same `@media (prefers-reduced-motion: reduce)`
block, and `check-custom-surface.mjs:158` compares the unlayered rule list to the allowlist **by
length**, so every restatement costs one allowlist entry even when it reuses a selector already
pinned. Nine entries is a 53% growth in a budget whose stated direction is zero, in the same pass
that declines two entries for the vendor hover guards and ten to fourteen for the `.modal-box`
override. Applying the budget asymmetrically here would be the same error the `.modal-box` decline
avoids. The second reason is that the loss is small: under the floor the paint still changes,
instantly, which is what decision 2's "off and instant" asks for. Every "Opts back in" cell in the
case table therefore reads "Snaps to the new paint", and the permission stands for a consumer, who
owns their own budget. Task 6a owns the cells and the migration row that records the empty list.

The restatement's specificity is stated correctly here because the recipe page teaches it. The
floor's selector `[data-theme='cairn-admin'] *` is (0,1,0) and a class selector is also (0,1,0), so
a class-bearing restatement does **not** outrank the floor on specificity. Both carry `!important`,
the specificities tie, and **source order decides**. A consumer wins by default, because their sheet
loads after the engine's; an engine-authored restatement would have to sit after `cairn-admin.css`'s
`:1115` block in the same file. Task 1 proves the ordering in the built sheet rather than asserting
it, per the Tailwind v4 layer-order rule this workstation already carries (language, revision 2
confidence notes).

This supersedes the language record's "one 150ms opacity cross-fade" for a page-level mode change.
Geoff's decision 3 says zen snaps under reduced motion, and Atlassian, the tiebreaker where Carbon
publishes no checkable rule, states it outright: "when reduced motion is active, motion is off and
instant."

Carbon's own position runs the other way and is recorded rather than elided. Its motion overview asks
a system to "always provide alternatives for interface state transitions" and to ensure "there is
always a way to communicate similar messages statically", which is the strongest published argument
for giving the zen offset a static substitute instead of a bare snap. **Decision 3 overrides it.**
The reasoning: zen's own state is already communicated statically by the chrome that is gone and the
chip that names the mode, so the snap is not a silent blank, and a substitute cross-fade would be
new motion the pass's scope bound refuses. Carbon publishes no `prefers-reduced-motion` pattern to
check against, which is why decision 2 gives the tiebreak to Atlassian here.

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

This is a shipped bug today, independent of every recommendation here, and it is task 1's second
half. Its regression guard is named rather than implied, because rule 4 is advisory and cuttable and
would otherwise be the only thing watching it: `src/tests/unit/admin-sheet-inventory.test.ts` asserts
that the built sheet's reduced-motion block declares both `transition-delay: 0s !important` and
`animation-delay: 0s !important`. That assertion survives every cut in the Risks section.

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

- **The language says the overlay drawer animates and the persistent sidebar does not. The sheet
  disagrees, and the disagreement stands.** DaisyUI declares its drawer transitions outside the
  breakpoint media query, so they stay in force at every width and the breakpoint flip itself slides
  and resizes the sidebar (language, §10). Revision 1 proposed scoping the transition to
  `isPersistentSidebar` and called that a change on cairn's own wrapper. It is not: the transition is
  declared on `.drawer-side`, so suppressing it at persistent widths requires a rule targeting
  `.drawer-side`, which is an unlayered override of `.drawer`, one of the four components decision 4
  names. **Dropped** (Geoff, 2026-09-13). The persistent drawer's vendor transition is recorded as
  the fifth vendor disagreement in the DaisyUI section, the language keeps its rule, and the design
  system states that the shipped sheet does not honor it at the breakpoint flip. What still holds the
  flip is nothing this pass ships, which the Motion section states as a limitation rather than
  leaving a reader to infer conformance the sheet does not have.
- **A breakpoint flip snaps.** The reader is already producing the motion by dragging or rotating, the
  properties that change at a breakpoint are the ones the snap list already bans, and the change is
  not feedback for an action taken inside the interface.
- **A resize suppresses motion while it runs, and this pass does not ship that suppression.** The
  resize stopper is the published backstop (language, §10) and revision 2 specified it in full. It is
  **cut**, for two measured reasons that the plan's fold records. Its specified form is a no-op: the
  class would sit on the bare element the `data-theme` attribute sits on, and the admin sheet's every
  scoped rule is `:where([data-theme]) .thing`, so a class on the theme element itself never matches
  (`CairnAdminShell.svelte:632-635` states that rule); and `transition-*` and `animation-*` do not
  inherit, so even a matching rule on that one element would suppress nothing on the drawer or the
  sidebar. Its working form is a universal descendant rule in the blanket block's shape, which is
  unlayered and costs one `unlayeredAllowlist` entry, the budget cost this pass declines everywhere
  else. The measured components layer is 19 selectors against a `componentsLayerCap` of 19, so the
  specified form had no room either.

  **What holds the resize case meanwhile.** A layout change caused by a resize snaps structurally,
  because no layout property in the admin transitions: every one of them is on the named-error list
  and the one exception is the zen offset, which a resize does not drive. The residue is the vendor
  drawer transition at the breakpoint flip, recorded as a disagreement. The design system's Motion
  section states the limitation in the responsive rules, and ROADMAP's Later tier carries the stopper
  with the finding that its working form costs an unlayered rule, which is what a future pass needs
  in hand before it re-argues the entry.

Input modality is the gate above. Nothing else in the language is modality-dependent.

## The case table

Every case, with its desktop-pointer behavior, its touch behavior, its reduced-motion behavior, its
token, and the component that owns the rule. A dash means the case carries no motion, which is a
decision rather than an omission. Tokens are the Carbon-aliased set; where the language record's
table named a superseded token, the mapping is `tap` to `instant`, `quick` to `quick`, `settle` to
`base`, `sheet` to `settle`, and the language record's 300ms `shift` to this set's 240ms `shift`.

Read the Token column as what the language prescribes for that case. Where the owner is a DaisyUI
component, the vendor's shipped behavior stands and decision 4 declines the override, so the row
states the language and the sheet ships the vendor's. There are eleven such disagreements, enumerated
in the DaisyUI section below: seven over timing, curve, or modality, and four over property, which
the vendor exemption records rather than convicts. The modality gate does not buy an exception either: after the two
escalations were ruled (2026-09-13), it governs cairn's own authored rules and nothing else.

| Case | Desktop pointer | Touch | Reduced motion | Token | Owner |
|---|---|---|---|---|---|
| Hover | Paint only, inside `@media (hover: hover)` | No hover state exists | Snaps to the new paint | `base` (theme default) | Shell, ConceptList, CairnMediaLibrary, MediaHeroField |
| Press | Paint change on `:active` | Same, and it is the only feedback | Snaps to the new paint | `instant` | DaisyUI `.btn`, vendor timing kept (disagreement 1) |
| Focus, keyboard | `outline-*` and `box-shadow` | Same, external keyboard | Snaps to the new paint | `instant` | `cairn-admin.css` |
| Focus, pointer | No ring paints, so no motion | No ring paints | Nothing to reduce | - | - |
| Guarded button, `aria-disabled` flip | `background-color` only; the button stays hit-testable | Same | Snaps to the new paint | `instant` | `cairn-admin.css:754`, a pinned unlayered rule |
| Enter, small element | Opacity plus a translate under 8px | Same | Opacity only | `base` | per component |
| Exit, small element | Opacity, `--cairn-ease-exit` | Same | Opacity only | `quick` | per component |
| Disclosure, accordion | `grid-template-rows` plus opacity | Same | Layout snaps, opacity stays | `quick` | DaisyUI `.collapse` (disagreement 4), NavTree |
| Caret rotate on a disclosure | `rotate` only, no box change | Same | Snaps | `quick` | `cairn-admin.css:545`, `CairnAdminShell.svelte:1035` |
| Tooltip | Opacity, 75ms delay; the vendor's `:hover` is ungated and stays so | Opens on long-press and sticks, a vendor defect filed to borrow-1 | The delay is authored inside a `(prefers-reduced-motion: no-preference)` guard, so none applies; the opacity snaps | `base` | DaisyUI `.tooltip` (disagreement 6) |
| Popover, menu | Opacity plus 4px from the trigger edge; `.menu`'s own `:hover` is ungated and stays so | Full-width bottom sheet below `sm` | Opacity only | `base`, `settle` below `sm` | `MediaInsertPopover.svelte`, DaisyUI `.menu` (disagreement 7) |
| Command palette | Opacity plus 4px, centered | Pinned to the top edge, opacity plus 8px | Opacity only | `base` | `CairnAdminShell.svelte:822` |
| Dialog | Opacity plus a 2% translate; the vendor scale is kept, see the DaisyUI decision | Same shape today; a bottom sheet would take `settle` | Opacity only, no geometry | `base` | DaisyUI `.modal` (disagreement 2); `DeleteDialog.svelte` and twenty-two siblings, twenty-three plain `.modal` dialogs in all, none `modal-bottom` |
| Login and confirm pages | No motion of their own | Same | Nothing to reduce | - | `LoginPage.svelte`, `ConfirmPage.svelte` |
| Drawer, overlay | Reachable below 1024 on content routes, below 1280 on desk routes | Translate from the inline start, scrim fades | Scrim fades, panel snaps | `settle` | DaisyUI `.drawer-side`, vendor timing kept (disagreement 3) |
| Drawer, persistent | The language says no motion, because it is furniture. The vendor transition runs anyway at the breakpoint flip and stays (disagreement 5) | Not reachable at this width | The blanket block zeroes it | - | DaisyUI `.drawer-side`; `isPersistentSidebar` at `CairnAdminShell.svelte:556` |
| Zen content offset | `margin-left`, the one exception | Not reachable; no offset below 1024 | Snap | `shift` in, `base` out | `cairn-admin.css`, on `.drawer-content`; the shell keeps the margin utilities at `CairnAdminShell.svelte:692-693` |
| Zen chrome regions | Opacity out at `quick` on the exit curve, back at `quick` on the standard curve | Same | Snap | `quick` | `EditPage.svelte` |
| Zen chip | In at `base` on the entrance curve after a 110ms delay, the delay authored inside a `(prefers-reduced-motion: no-preference)` guard; out at `quick` on the exit curve with no delay | Same, and the short exit matters more: the finger is still on the glass | Snap, and the guard means the delay never resolves nonzero, so rule 4 does not fire on it | `base` in, `quick` out | `EditPage.svelte` |
| Zen editor card box | Snaps. `padding` is a named error and `max-width` is outside the allowlist, so both snap for different reasons | Snaps; at 390 there is nothing to reclaim | Snaps | - | `EditPage.svelte` |
| Breakpoint flip | Snap, because every layout property that changes is on the named-error list; the vendor drawer transition runs anyway (disagreement 5) | Snap | Snap | - | no owner; the rule is that nobody writes one |
| Window resize | Snap, for the same reason. The published suppression backstop is cut from this pass and filed | Not reachable | Snap | - | no owner; the limitation is stated in the Motion section |
| Orientation change | Not reachable | Snap, same reason | Snap | - | no owner; same limitation |
| Route change | Snap | Snap | Snap | - | no owner; the rule is that nobody writes one |
| List or table row added, removed, reordered | Snap | Snap | Snap | - | `ConceptList.svelte`, `AdminTable` |
| Table row hover | `transition-colors` on the row ground | No hover state exists | Snaps to the new paint | `base` | `ConceptList.svelte:400`, `CairnMediaLibrary.svelte:845` |
| Media grid, selection change | `transition-shadow`; the `ring` changes with the selection | Same, on tap | Snaps to the new paint | `base` | `CairnMediaLibrary.svelte:747` |
| Drag-and-drop dropzone | Hover and focus paint; a drag-over paint state is added, since none exists today | Not reachable | Snaps to the new paint | `base`, the theme default the element's own `transition-colors` resolves to | `MediaHeroField.svelte:450` is the class, `:453-454` the drag wiring |
| Upload progress bar | The determinate fill snaps. The native `<progress>` keeps its role and its values, and its `width` transition is removed with no replacement | Same | Snaps | - | `MarkdownEditor.svelte:530`, `editor-placeholder.ts:49-84` |
| Preview pane width | Removed. The split-pane resize snaps | Not reachable; no split below `lg` | Snaps | - | `EditPage.svelte:2047` |
| Editor fold chevron | `opacity` plus `transform` | Persistent at 0.65 opacity on a coarse pointer | Already guarded to `none` | `quick` | `MarkdownEditor.svelte:584`, `:607`, `:612` |
| Editor unfold flash | `background-color`, one shot | Same | Already guarded to `none` | `base` | `MarkdownEditor.svelte:654`, `editor-folding.ts:277` |
| Save-state line | `transition-opacity` | Same | Snaps to the new paint | `base` | `EditPage.svelte:1428` |
| Feedback alert, `@starting-style` | Opacity plus a translate under 8px, property list named | Same | Opacity only, no translate | `base` | `EditPage.svelte:1643` |
| Live region, `aria-live` | No motion; both regions are `sr-only` | No motion | No motion | - | `EditPage.svelte:1637-1638` |
| Form validation message | No motion; the layout shift snaps | Same | Snap | - | `FieldInput.svelte` |
| Toast | Opacity plus 8px from the bottom, bottom inline-end | Same anchor, width capped at the viewport minus gutters | Opacity only | `base` | DaisyUI `.toast`, already gated |
| Theme change, explicit toggle | Snap. The admin authors no cross-fade, and this pass adds none | Snap | Snap | - | - |
| Theme change, OS or first paint | Snap | Snap | Snap | - | - |
| Skeleton, shimmer | The DaisyUI 1.8s loop | Same | Static tint, no loop | - | DaisyUI `.skeleton`, already gated |
| Spinner, progress | Runs; it is essential state | Runs | Runs | - | DaisyUI `.loading`, already gated |
| Sticky header collapse on scroll | None | None | Nothing to reduce | - | - |
| Smooth scrolling, `scroll-behavior` | None. No admin surface sets it, and the language prescribes none | None | The blanket block sets `scroll-behavior: auto` regardless | - | no owner; the rule is that nobody writes one |
| Pull to refresh, overscroll | None | None; `overscroll-behavior: contain` on the editor pane | Nothing to reduce | - | `MarkdownEditor.svelte` |

Six rows depart from something and need their reason recorded.

**The feedback alert is not the live region.** `EditPage.svelte:1637-1638` are two `sr-only` divs
carrying `aria-live`; they are invisible and "no motion" is correct for them. The visible success
strip at `:1643` is a separate element that animates in with `@starting-style`. The announcement
snaps and the visible confirmation moves, and the two rows do not contradict.

**The preview pane's width transition has no legal form.** It transitions `width`, which the snap
list bans, and the change it animates is a split-pane resize, which the resize rule says should snap
for an independent reason. Removing it is a behavior change a reader will notice, so it is a named
removal with a `Consumers must:` line, not a silent consequence.

**The upload progress bar loses its motion and keeps everything else.** Today it is
`width 200ms ease` on a native `<progress>`'s `::-webkit-progress-value`
(`MarkdownEditor.svelte:530`). `width` is on the snap list, so the transition goes. Revision 2
replaced it with a `transform: scaleX()` overlay; that is **cut**, because the overlay would animate
nothing. `PlaceholderWidget.eq()` compares the placeholder's progress fraction
(`editor-placeholder.ts:49-84`), so CodeMirror destroys and recreates the widget on every progress
tick, and a fresh element has no previous value to transition from. The same mechanism means today's
`width 200ms ease` almost certainly already snaps. So the fill snaps, deliberately and visibly, and
the changelog line says so rather than promising motion the change cannot deliver.

**The native `<progress>` element stays, untouched.** Revision 1 replaced it outright, which would
have dropped the implicit `progressbar` role and the `value` and `max` mapping to `aria-valuenow`
and `aria-valuemax` that assistive technology reads. The element keeps all of it: it remains the
accessible object with its `value` and `max` attributes, it paints its own fill, and the widget
deliberately hosts no live region (`editor-placeholder.ts:44-48`, whose comment gives the reason).
No new ARIA is authored and no overlay is added, because neither is needed. The one edit is the
removal of the `width` transition from the CodeMirror theme string, and of the reduced-motion pin on
`::-webkit-progress-value` at `MarkdownEditor.svelte:614`, which has nothing left to pin. If a later
pass drops the native element, it owes an explicit `role="progressbar"` with `aria-valuenow`,
`aria-valuemin`, and `aria-valuemax`, and that is a `daisyui-a11y-reviewer` gate, not a silent
substitution.

**The dropzone gains a state rather than losing one.** `MediaHeroField.svelte:453-454` wires
`ondrop` and `ondragover` on the button whose class list is at `:450`, and nothing changes visually
while a file is over the target (language, §12). The motion pass is the first pass to look at this
element, so it adds the paint-only drag-over state the language already permits. The state is
specified rather than left to the implementer: a `dragOver` boolean set on `ondragenter` and
`ondragover` (which must also `preventDefault` for the drop to be allowed), cleared on `ondrop` and
on `ondragleave` only when the event's `relatedTarget` lies outside the button, so the dropzone's
own child spans do not flicker it off. The paint it applies is the same border and background tint
the `:hover` rule gives, at the band the element's own `transition-colors` resolves to, applied
through a class rather than a hover
selector so it reaches a coarse pointer and needs no modality guard. Nothing moves and nothing
resizes.

The paint is applied by toggling, on the `dragOver` boolean, the same utility classes the element's
own `hover:` variants already carry, so no CSS rule is authored and the components layer is not
touched. That is why the row's token is `base` rather than `instant`: the paint rides the element's
existing `transition-colors`, which resolves to the theme default, and the two ways to reach
`instant` are a CSS rule the components layer has no room for or an unconditional duration class
that would retime the same element's hover paint. `base` on a paint change is inside the language,
and the departure from the token the register would otherwise pick is recorded here.

**The theme-change cross-fade is cut.** Revision 1's case table gave the explicit theme toggle a
scoped cross-fade on the shell's chrome surfaces. No such transition exists in the admin today, and
adding one is new motion, which the pass's scope bound refuses. It is cut to a dash rather than
given a task. The showcase's public theme ships the pattern this row described
(`examples/showcase/src/theme/theme.css:361-368`, `.theme-flip-transition` on the site shell), so a
later pass that wants it in the admin has a working precedent to port and a `Consumers must:` line
to write. It is not this pass's.

## The DaisyUI component-class decision

**DaisyUI's component timings stay the vendor's own vocabulary** (decision 4). cairn writes no
unlayered override of `.modal`, `.drawer`, `.collapse`, or `.btn`. The admin's own rules are what the
language governs, and the audit treats a DaisyUI component class as a vendor contribution: it is
checked for the properties it animates, never for its durations or its curves.

The decision governs timing, curve, property, and modality alike. Revision 1 carved the modality
gate out of it and proposed two `@media (hover: hover)` guards on `.tooltip` and `.menu`. **Geoff
ruled against the carve-out** (2026-09-13): a modality guard on a vendor component is still an
unlayered rule pinned by that vendor's internal selector, the budget counts pinned selectors rather
than intentions, and the review found besides that a transition guard does not fix the defect it was
justified by. The tooltip's long-press-opens-and-sticks behavior is a **visibility** rule, not a
transition, so gating the transition changes nothing a reader would notice. Both guards are dropped.

### The eleven vendor disagreements

The cost is stated rather than hidden. The published language and the shipped sheet disagree in
eleven places, every one of them a place where cairn declines an override. The design system's Motion
section carries this list rather than claiming a conformance the sheet does not have. Seven are
disagreements over timing, curve, or modality. Four are over property, and they are what the vendor
exemption on rule 1's class join records instead of convicting.

1. **`.btn`, press.** Runs 200ms where the language says `instant` (70ms), and transitions
   `transform`, which the language allows but would not have chosen for a press.
2. **`.modal`, dialog.** Runs 300ms where the language's nearest band is `shift` (240ms), and opens
   with a `scale: .98` the declined override below discusses.
3. **`.drawer`, overlay.** Runs 300ms where the language says `settle` (400ms) for a panel whose
   travel is the viewport edge.
4. **`.collapse`, disclosure.** Ships `transition-property: all`, the one construct the shipped
   `motion-band` rule bans in cairn's own code.
5. **`.drawer`, at the breakpoint flip.** DaisyUI declares the drawer transition outside the
   breakpoint media query, so the sidebar slides and resizes when the viewport crosses `lg` or `xl`,
   where the language says furniture snaps. Revision 1 proposed scoping it away and **Geoff ruled
   against** (2026-09-13), because the only form that change can take is a rule targeting
   `.drawer-side`, an unlayered override of `.drawer`. Nothing in this pass covers it: the resize
   stopper that would have suppressed the drag case is cut, so every flip, dragged or scripted, shows
   the vendor slide, and the Motion section says so.
6. **`.tooltip`, hover.** Ships an ungated `:hover` transition, so a coarse pointer can long-press
   the tooltip open and strand it. Filed to the borrowable-patterns borrow-1 pass, beside the
   rendered half of `motion-hover-gate`, with the review's finding that fixing it means gating the
   visibility rather than the transition, which is a behavioral override of a vendor component and a
   decision in its own right.
7. **`.menu`, hover.** Ships an ungated `:hover` transition, same shape, no reader-visible defect
   found. Filed with the same follow-up.

The four property disagreements, each measured in the built sheet at the line named.

8. **`.drawer-side > :not(.drawer-overlay)`** transitions `width` beside `translate`
   (`dist/components/cairn-admin.css:1689`). `width` is on the named-error list, and
   `CairnAdminShell.svelte:949` carries `class="drawer-side"`, so without the exemption cairn's own
   markup produces an error-tier finding it cannot fix without the unlayered override decision 4
   refuses.
9. **`.filter input`** transitions `margin`, `padding`, and `border-width` beside `visibility` and
   `opacity` (`:2541`). Three named errors in one declaration.
10. **`.collapse …::details-content`** transitions `min-height`, `padding`, and `height` among seven
    properties (`:5243`), which is also the shorthand the vocabulary rule abstains on.
11. **`.toggle:before`** transitions `inset-inline-start` (`:2763`), a logical `left`, which the
    allowlist does not carry and the named-error list does not name, so it would fail as outside the
    vocabulary.

None of the four is reachable without an override of `.drawer`, `.collapse`, or a vendor internal,
so each is recorded here and none is fixed.

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

The exemption must be enumerable rather than a hand-maintained list, and the discriminator is named
here because the obvious one does not work. `CompiledSheet.declarations()` reports each rule's
`conditions`, but `conditions` is the enclosing at-rule preludes (`sheet.ts:23`), so the only layer
signal it carries is `@layer components`, which cairn's own rules also sit in. The exemption is
therefore defined as "a class whose declarations, in the built sheet, come from a rule the sheet
attributes to DaisyUI's plugin output". Where the compiled sheet cannot answer that, the rule falls
back to an explicit list of DaisyUI component class names shipped beside it, and the fallback is a
stated limitation rather than a hidden one: a cairn class that collides with a DaisyUI component
name would be exempted, which is why the list is explicit and reviewed rather than pattern-matched.

**The exemption applies to rule 1's class join as well as to rule 2.** Revision 2 gave it to the
vocabulary rule alone and left `motion-property` "checked for the properties it animates", which the
four property disagreements above show is unreachable: the rule would convict `class="drawer-side"`
on cairn's own shell. The CSS-family half of rule 1 keeps the full check, because a rule the audit
reads out of an authored CSS file is authored code by definition.

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
| `MarkdownEditor.svelte:530` | `width 200ms ease` on `::-webkit-progress-value` | The transition is removed with no replacement, and the reduced-motion pin on the same pseudo-element at `:614` goes with it, having nothing left to pin. The native `<progress>` is untouched and keeps its role, its `value`, and its `max`. No overlay is added: the widget is recreated on every progress tick, so no transition can apply to it |
| `cairn-admin.css:545` | `transition: rotate 150ms ease` on `.cairn-caret` | Onto `var(--cairn-dur-quick)` and `var(--cairn-ease-standard)`. Bare `ease` is `cubic-bezier(0.25, 0.1, 0.25, 1)` and matches no token |
| `HelpHome.svelte:562`, `:787` | `border-color 150ms ease, background-color 150ms ease` at `:562`, and `border-color 150ms ease, color 150ms ease` at `:787` | Onto the tokens, same shape, and nothing else. Both `transition` declarations sit on the base selector; the paired `:hover, :focus-visible` lists at `:566-567` and `:789-790` declare paint alone. No guard is added, because wrapping a paint-only pair removes hover paint on a coarse pointer for no enforcement gain |
| `EditPage.svelte:1428` | `transition-opacity duration-[250ms]` | Drop the `duration-*` class; the theme default carries it at `base` |
| `MarkdownEditor.svelte:584`, `:654` | The fold chevron's `opacity`/`transform` pair and the unfold flash's `background-color`, inside the CodeMirror theme object | Onto the tokens. Both already sit inside a `prefers-reduced-motion: reduce` block in the same theme object, and the chevron carries a `@media (hover: none)` rest state at `:607`. That is the best motion in the admin and it keeps its shape. The flash's own lifetime is `editor-folding.ts`'s `FLASH_MS = 400` timer, which removes the class; the CSS transition is what paints the fade and the two are independent, so `FLASH_MS` does not move with the token |
| `CairnAdminShell.svelte:775`, `:971`, `:1024`, `:1035` | `transition-colors` and `transition-opacity`, bare | No edit. The theme default resolves them to `base` on the standard curve |
| `CairnMediaLibrary.svelte:747`, `:845`, `ConceptList.svelte:400`, `MediaHeroField.svelte:450` | `transition-shadow` and `transition-colors`, bare | No edit, same reason. `MediaHeroField` additionally gains the drag-over paint state it has never had, on the `ondragover`/`ondrop` wiring at `:453-454` |
| Three `animate-spin` uses | `spin 1s linear infinite` through `--animate-spin` | No edit. An `infinite` animation is exempt from the vocabulary and governed by the reduced-motion guard instead |
| DaisyUI `.tooltip` and `.menu` | `:hover` transitions with no capability guard anywhere in the vendor file | **No edit.** Revision 1 proposed two pinned unlayered `@media (hover: hover)` guards; Geoff ruled against them (2026-09-13). Recorded as vendor disagreements 6 and 7, and the touch-tooltip defect filed to borrow-1 |
| DaisyUI `.drawer-side`, at the breakpoint flip | The vendor transition runs at every width, so the sidebar slides across `lg` and `xl` | **No edit.** Revision 1 proposed scoping it to `isPersistentSidebar`; Geoff ruled against it (2026-09-13), because the only form is a rule targeting `.drawer-side`. Recorded as vendor disagreement 5 |
| The nine reduced-motion paint opt-back-ins | Nothing; the blanket block zeroes all nine today | **No edit.** The opt-back-in is a permission the policy grants, and cairn takes none of it this pass: each restatement costs one unlayered allowlist entry (`check-custom-surface.mjs:158` compares by length), and the paint still changes instantly under the floor. Owned by task 6a, which writes the case-table cells to match |
| The hand-authored `:hover` and `:focus-visible` selector lists | One selector list per pair, ungated, declaring paint | **No edit.** The engine tree has no pair whose `:hover` alternative declares motion, so no guard is owed and none is added. The split remains the authoring step the fix message and the recipe page teach for a consumer whose own pair does declare motion, and the rule ships a fixture that fires on a `:focus-visible` alternative wrongly left inside the guard |

The accounting closes against the seventeen. Eleven sites are Tailwind utilities: two are fixed by
hand (`EditPage.svelte:2047` removed, `:1643` given a property list), one drops its `duration-*`
sibling (`:1428`), and eight need no edit at all because the theme defaults resolve them. Three are
CSS rules and move onto the tokens. Three are CodeMirror theme strings: two move onto the tokens and
one, the progress fill at `:530`, is removed. The three `animate-spin` uses are exempt.

Three of the eleven Tailwind utility sites leave the shipped sheet when the pass lands, which is a
consumer-visible act rather than a side effect. `transition-[width]`, `transition-all`, and
`duration-[250ms]` each have exactly the call sites task 6a removes or rewrites and no others, so
Tailwind tree-shakes all three out of the packaged sheet. `src/tests/unit/fixtures/admin-sheet-inventory.txt`
freezes the shipped class inventory in both directions and its own contract says a class may only
leave as a deliberate act carried in `CHANGELOG.md`, so the departure is a `Consumers must:` line and
a fixture regeneration, in that order.

Nothing outside the inventory is added to the sheet. Revision 1 added two vendor hover guards; both
are dropped, and the resize stopper is cut, so the migration touches only declarations that already
ship, plus the dropzone's drag-over paint state task 6b owns and the zen work task 7 owns. That is
the whole of what this pass paints.

## The four rules

Every rule is specified consumer-first: what it reads in a site's tree, its tier, and the fix message
it prints. Tier is a property of the rule, not of the run, so one tier serves both the engine's gate
and a consumer's. Three rules ship error tier, matching every other static rule in the registry; the
one advisory rule is advisory because its findings are vendor CSS the consumer did not write.

### The `adminOnly` scope, which all three static rules declare

The static rule type gains one optional field, `adminOnly`, and the three motion rules set it. The
audit config gains the root list it resolves over, `static.adminScope`, whose default is
`src/routes/admin` and `src/lib/admin-toolkit`. `runStatic` resolves a rule that declares
`adminOnly` over `static.adminScope` alone, never over `src/lib/components` unless a site names it
there, and every other static rule over the full `static.scope` as today. The restriction reaches
both surfaces a rule reads: the components under those roots, and the `static.cssFiles` entries that
lie inside them, so an `adminOnly` rule never reads a site's public theme file.

The two halves are one mechanism. `adminOnly` says which rules the boundary applies to;
`static.adminScope` says where the boundary falls in a given tree. A consumer whose admin screens
sit at the default roots writes neither.

The reason is the charter boundary, and it is a consumer problem before it is an engine one.
`DEFAULT_STATIC_SCOPE` is `src/routes/admin`, `src/lib/components`, and `src/lib/admin-toolkit`
(`config.ts:16-20`), and in a SvelteKit site the middle root is where shared **public** components
live. Shipping three error-tier admin-motion rules over that root runs the admin's language across a
developer's public UI, which "The bar" and the non-goal "No motion on public pages" both give to the
developer. A consumer has no escape short of narrowing `static.scope` for every static rule at once,
which would also drop `no-uncompiled-class`, `focus-parity`, and the rest.

Declaring it on the rule rather than in a gate script is what keeps the boundary cheap for a
consumer: a default answers it, and the key is there for a site whose admin screens sit elsewhere.
The engine's own gate sets the key to its own tree, which is laid out differently:
`src/lib/components` plus `src/lib/admin-toolkit` plus `examples/showcase/src/routes/admin`. That
config is the gate's, not the rule's, and it is specified under "CI wiring" below.

The cost is one config key, which is consumer-facing and owes documentation. `./audit` is not a
package export subpath, so `check:surface` and `check:reference` never see the field or the key; the
reference page's config section and the recipe page are what carry them.

### Rule 1: `motion-property`, static, error

**What it reads in a site's tree.** Both CSS-family surfaces `cssScopeRules` already yields (a
component's own scoped `<style>` block, plus any file `static.cssFiles` names), and the per-element
class-token join against `ctx.sheet.declarations()`, keyed on `ClassToken.elementStart`. It declares
`adminOnly`, so the markup it reads is whatever `static.adminScope` names, `src/routes/admin` and
`src/lib/admin-toolkit` by default.
`DEFAULT_SHEET_CANDIDATES` names the engine's own `dist/components/cairn-admin.css` first and the
installed `node_modules/@glw907/cairn-cms/dist/components/cairn-admin.css` second, taking the first
that exists (`config.ts:24-27`, `:185`). A consumer resolves to the second. When neither exists the
last-resort default is the first entry, the library's own dist path, which is a library-tree
default rather than a consumer one.

**What it asserts.**

- `transition-property`, and the property slot of the `transition` shorthand, names an allowlisted
  property.
- A named-error property (the nine-item snap list) is a finding. This reaches `transition-[width]`
  through the class join and `width 200ms` through the CSS path.
- More than three properties in one declaration is a finding.
- An `animate-*` class is checked through its `--animate-*` custom property's keyframes, so animating
  a snap-list property is the same finding as transitioning one.
- `transition: all` and `transition-all` are **not** this rule's findings. `motion-band` owns that
  construct, per the reconciliation below, so one construct produces one finding under one id.
- **A vendor component class is exempt on the class-join half only.** The four DaisyUI components
  enumerated as disagreements 8 through 11 transition named-error properties, and one of them,
  `.drawer-side`, sits on cairn's own shell markup, so without the exemption the rule convicts the
  engine and every consumer on run one for CSS neither wrote. The exemption uses the same
  discriminator rule 2 uses, including the explicit class-name fallback. The CSS-family half keeps
  the full check, because a declaration the audit reads out of an authored CSS file is authored code
  by definition.
- The one exception passes: `margin-left` on `.drawer-content` in `cairn-admin.css`, keyed on that
  file plus that selector plus that property, never on the selector alone.

**Fix message.** Names the property, the rule ("the admin's motion language transitions paint,
transform, and `grid-template-rows`"), and the remedy.

**Fixtures, from the shipped examples.** `EditPage.svelte:2047` (`transition-[width]`, fails);
`MarkdownEditor.svelte:530` (`width 200ms`, fails); `EditPage.svelte:1643` (`transition-all`, this
rule does not report, `motion-band` does); the admin sheet's own `margin-left` on `.drawer-content`
(passes); a second selector in the same file transitioning `margin-left` (fails); a consumer-owned
file's `.drawer-content` transitioning `margin-left` (fails); `class="drawer-side"` joined to the
vendor's `width` transition (exempt, no finding); the same `width` transition authored in a CSS file
the audit reads (fails).

This is the cheapest rule and the one that catches every shipped violation on day one. Build it
first.

### Rule 2: `motion-vocabulary`, static, error

**What it reads.** The same two surfaces and the same join. It declares `adminOnly`.

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

**The `infinite` carve-out, as a positive clause.** Revision 1 exempted an `infinite` animation from
the vocabulary outright, which would have let a five-second infinite animation ship unchecked. The
clause is positive instead: **an animation declared `infinite` must declare `linear`, and is exempt
from the duration check only.** Its easing is still checked, against the one value the carve-out
permits. Its duration is unchecked, because a continuous rotation is correct at a duration outside a
70ms to 400ms band, and the reduced-motion guard, which the shipped `reduced-motion` rule already
polices, is what governs whether it runs at all. The three shipped `animate-spin` uses are the
population and they pass on both halves. This departs from the enforcement record, which wanted
`animate-spin` to fail on both its `1s` and its `linear`; the departure is recorded here because the
record's remedy has no legal form for the `linear` half.

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
(passes: `linear` and `infinite`, duration exempt); a five-second `linear infinite` animation
(passes, and the fixture records that the duration is deliberately unchecked); an `infinite`
animation declaring `ease-in-out` (fails on its easing); a 700ms finite `animate-*` (fails); each of
the three abstention shapes.

**The join's three blind spots, as accepted limits.** Each is documented in the reference page and
the recipe page rather than claimed away.

1. **A conditional class puts two values in one slot.** `markup.ts:405-409` returns both branches of
   a ternary and `:392-403` every object key, so `class={dense ? 'duration-75' : 'duration-500'}`
   gives the join two mutually exclusive durations under one `elementStart`. **The rule reports on
   every branch**, because the vocabulary question is per value and both branches are authored code
   the fix message can name. Where a pairing verdict would need one value (the sibling-duration
   lookup), the rule abstains on that element and records it.
2. **The token dedup drops the second owner.** `markup.ts:560-571` keys a token by
   `start:end:value` and keeps the first owning element, so a script constant used on three elements
   attributes its tokens to element one. **Accepted as a false negative**, because changing the dedup
   key changes the shared substrate every static rule reads, including `no-uncompiled-class`, and
   that is a separate change with its own re-baseline.
3. **A cross-component pair is out of reach.** `<Button class="duration-[250ms]" />` where `Button`
   applies `transition-colors` internally splits the pair across two files with no shared key, and
   every consumer component rendered inside `CairnAdminShell` has that shape. **Stated as the limit
   of the coverage claim.** The rules cover existence, not pairing, across a component boundary.

### Rule 3: `motion-hover-gate`, static, error

**What it reads.** The CSS-family surfaces only. No class join. It declares `adminOnly`.

**What it asserts.** Two predicates, both requiring the absence of a hover media feature in the
rule's conditions.

- A hand-authored `:hover` state whose element carries a transition or an animation is a finding,
  whether the motion is declared on the `:hover` rule itself or on a base rule the same selector
  matches. The narrow reading, motion declared on the `:hover` rule, convicts nothing in the engine's
  own tree, so the rule would ship unable to detect the thing it exists for.
- A `:focus-visible` rule declaring motion that sits **inside** `@media (hover: hover)` is a finding.
  That is the mistake the fix message's own remedy invites, and a rule that warns about a mistake it
  cannot detect is prose.

Tailwind's `hover:` variant is out of scope by construction, exactly as it is in `focus-parity`,
because it already compiles to `@media (hover: hover) { &:hover }`.

**Fix message.** Names the selector and the guard to wrap it in, cites `cairn-admin.css:1002` as the
shipped model, and warns that a selector list pairing `:hover` with `:focus-visible` must be split
before the guard goes on, or focus motion dies on a touch device with a keyboard.

**Fixtures, synthetic, because the engine tree has no shipped instance of either predicate.**
`cairn-admin.css:1002` (passes, guarded, and declares paint rather than motion); a hand-authored
`:hover` state on an element whose base rule declares a transition, ungated (fails); a `:hover` rule
declaring a transition directly, ungated (fails); a `hover:` utility (not read); a correctly split
pair, the `:hover` half guarded and the `:focus-visible` half outside (both pass, and `focus-parity`
passes alongside); and a `:focus-visible` alternative declaring motion from inside the guard
(**fails**, which is the migration hazard made detectable).

The rendered half, which would reach DaisyUI's ten ungated components through a touch context, is
**not in this pass**. It needs the same emulation axis rule 4 needs, it is advisory, and its remedy
would be an override decision 4 declines. It is filed to ROADMAP's Next tier with its trigger: the
borrow-1 pass, which owns the consumer-facing gates layer. **Two items travel with it**, both from
the 2026-09-13 ruling on the dropped hover guards: the `.tooltip` touch defect, where a long press
opens the tooltip and strands it, and the finding that closing that defect means gating the
tooltip's **visibility**, not its transition, which is a behavioral override of a vendor component
and a decision borrow-1 has to take on its own terms. A guard on the transition would have changed
nothing a reader sees, which is why this pass files the defect instead of appearing to fix it.

### Rule 4: `motion-reduced-delay`, rendered, advisory

**Rule id.** `motion-reduced-delay`, never `reduced-motion`. `reduced-motion` is a static rule id,
there is no duplicate-id guard across the two registries, and `suppress.ts` resolves directives by
id, so a source-positioned `cairn-audit-disable-next-line reduced-motion` would read as covering a
rendered finding it can never reach. The repo already ships one duplicated id across the two
registries, `list-role` (`rules/static/list-role.ts` and `rules/rendered/list-role.ts`), so the
hazard is a known one rather than a novel reading, and this rule takes a distinct id precisely
because that pair sets the precedent for how confusing the alternative is.

**What it reads, and the one mechanism it uses.** Revision 1 left this ambiguous between a CSSOM
rule walk and a computed-style read, and the two answer different questions: a rule walk cannot
resolve the cascade, so an authored delay still reads nonzero in the walk even when the blanket
block zeroes it from another rule. **The rule reads computed values, per element.** In a
`reducedMotion: 'reduce'` context, at rest, on each configured page, it reads `transition-delay` and
`animation-delay` off each element the page surface yields, and a nonzero value is a finding. That
is the value a reader actually experiences, and it is what the shipped defect is.

The CSSOM walk stays, as the locator rather than the detector. A computed value has no selector to
name, so the fix message would otherwise say only "some element is late". The walker supplies the
authored rule: for a firing element, it reports the admin-owned rule whose selector matches that
element and whose authored text declares the nonzero delay. **The fix message's locator is therefore
the element's `__cairnAudit.signature(el)` plus that authored rule's selector and file condition.**
Where the walk finds no matching authored rule, the message says so and gives the signature alone,
which is still enough to find the element. No differential, no signature join across contexts, no
second capture, no new interaction state.

A consequence worth stating: because the rule reads computed values, cairn's own zen chip does not
fire. Its 110ms entrance delay is authored inside a `(prefers-reduced-motion: no-preference)` guard,
so under the reduced context the declaration does not apply and the computed delay is zero. Under
the rule-walk reading it would have fired on cairn's own code on run one.

**Why not the differential.** The revision 1 design is withdrawn for two measured reasons.
`__cairnAudit.signature(el)` names a class of elements rather than an element: 483 elements on
`/admin/posts` collapse to 130 distinct signatures, so there is no join key. And the blanket block
never touches `transition-property`, whose initial value is `all`, so under reduced motion 370 of 433
motion-bearing elements report `transition-property: all` and the differential's transform and layout
clauses convict every element on the page (enforcement, Part 2).

**Tier: advisory.** All three known offenders are DaisyUI's and cairn ships no override for them
under decision 4. Error tier would fail every consumer's first `audit:rendered` on CSS the consumer
cannot edit.

**Fix message.** Names the element's signature, the computed delay, the authored rule the walk found
for it, and the remedy: the admin's blanket block zeroes delays, so a finding here is either a rule
outside the block's scope or a vendor rule to leave alone and record.

**Fixtures**, all measured at rest on `/admin/posts` in a reduced context: `div.drawer-side`
(computes `0.1s, 0.1s`, ungated, fires); `.checkbox::before` (`0.1s` across four longhands, ungated,
fires); `div.modal-box` (`50ms`, ungated, fires); and two negatives, the tooltip (authored at 75ms
inside `(prefers-reduced-motion: no-preference)`, so it computes zero and must not fire) and the zen
chip (cairn's own 110ms delay, authored inside the same guard, computes zero and must not fire).

## Reconciling with the shipped rules

Four items, each of which changes behavior the moment the motion work lands.

**`motion-band` is repointed, not retired.** Its duration regex finds literals
(`motion-band.ts:18-25`), so rewriting a declaration to `transition-duration: var(--cairn-dur-base)`
makes `durationsIn` return `[]` and the band check silently passes. Three changes keep it meaningful.
Its band widens from 150ms to 250ms to **70ms to 400ms**, the span of the five token values, so a
literal that rule 2 abstains on still gets a band check. It becomes the **one owner** of the
`transition: all` and `transition-all` construct, which rule 1 therefore does not re-report, so one
construct produces one finding under one id. And its fix message takes on the `@starting-style`
clause that revision 1 gave to rule 1: for `transition-all` on an element whose entrance is a
`@starting-style`, the remedy is a named property list, never deleting the transition, because
deleting the transition deletes the entrance. `EditPage.svelte:1643` is that element and the
fixture.

Retiring the id was considered and declined, on a cost this revision restates because revision 1's
evidence for it does not exist. Revision 1 cited a co-located
`cairn-audit-disable-next-line motion-band` directive on the showcase's 650ms carousel crossfade.
There is no such directive and no such crossfade in the tree: the only suppression directives on
`main` are `token-colors` in `PreviewBanner.svelte` and one `type-scale` in `CairnAdminShell.svelte`,
and the showcase theme's own motion is a 0.2s theme-flip cross-fade and a 0.18s view transition. The
cost that does hold is the consumer's. `motion-band` is a public rule id, a consumer may carry a
co-located directive for it, and `suppress.ts:201-206` reports a directive that silences nothing as a
**dead suppression at error tier, which cannot itself be suppressed**. Retiring the id would turn
every such directive into a hard failure on upgrade, with no migration short of editing their source.

**`isReducedMotionGuarded` treats `no-preference` as a guard.** `motion.ts:15` tests
`/prefers-reduced-motion/`, which matches `(prefers-reduced-motion: no-preference)`. Two live
consequences: `motion-band.ts:39` skips such a rule outright, so a 3000ms transition inside a
`no-preference` block is exempt from the band; and `reduced-motion.ts:31-35` registers its selectors
into `guardedByFile`, so a `no-preference` block satisfies the pairing for any identically selected
rule. DaisyUI already uses the inverse gate four times in the shipped sheet, so this latent defect
turns live the moment cairn writes correct CSS, and the zen chip's own delay guard is one of the
rules that would be wrongly exempted. It is the second of the two shipped bugs decision 8 names, so
**task 1 owns it**, not task 2, and it is fixed before any rule is specified against it. Task 2
still owns `isMotionProperty`'s widening and the three re-baselines, which are not bug fixes.

**`isMotionProperty` covers four properties.** `motion.ts:6`'s `MOTION_PROPERTY` matches
`transition|transition-duration|animation|animation-duration`, with no `transition-property`,
`transition-timing-function`, `transition-delay`, `animation-delay`, or `animation-timing-function`.
Rule 2's easing half needs it widened, and widening it changes what `motion-band` and
`reduced-motion` see: `reduced-motion` starts convicting rules that declare only a timing function.
Both are re-baselined against the widened predicate in the same task, and the re-baselining is the
work rather than the predicate change.

The widened set is nine: the four it matches today plus `transition-property`,
`transition-timing-function`, `transition-delay`, `animation-delay`, and `animation-timing-function`.
`transition-property` is included deliberately, and the consequence is named rather than discovered:
a rule declaring `transition-property` alone is not discharged by the floor, which zeroes durations
and delays and never touches it. The regex is anchored, so no longhand outside the nine is matched.

Two consumer-visible consequences of the widening carry no rule change and are named here because
they carry a changelog obligation. A consumer's `transition-delay: 600ms` now reaches `motion-band`'s
band check, since its duration regex reads any time value in the declaration. And a rule declaring
only `transition-timing-function` now owes a reduced-motion sibling under the error-tier
`reduced-motion` rule. The engine's own tree has zero such declarations, so neither reddens cairn's
gate; the whole exposure is the consumer's, and changelog line 2 states it.

**`cairn-admin.css:545` fires `reduced-motion` falsely the moment that file joins `CSS_FILES`.**
`reduced-motion.ts:45` matches by normalized selector-text equality while the blanket guard at
`:1115` names `[data-theme='cairn-admin'] *` among its four alternatives, so the rule fires on
`.cairn-caret`'s declaration, which the blanket block genuinely covers. The fix follows the position
the language record states once and uses everywhere: a rule whose selector is universal or
attribute-only, carrying no class, is the floor, and a floor discharges the pairing.

**The discharge is scoped to what the floor actually zeroes, and the consequence of not scoping it is
stated.** A clause that discharges the whole file the moment a floor rule exists would make
`reduced-motion` vacuous over `cairn-admin.css`, the engine's largest CSS file, trading one false
positive for total blindness on 1100 lines. So the clause carries two conditions: the floor's own
selector must match the rule's selector, and the floor must declare the motion property the rule
declares. The blanket block sets `animation-duration`, `animation-iteration-count`,
`transition-duration`, `scroll-behavior`, and after task 1 the two delays. A rule declaring only
`transition-timing-function`, which the widened `isMotionProperty` now sees, is **not** discharged,
because the floor does not zero it.

**A shorthand counts as declaring the longhands the floor zeroes.** `.cairn-caret` declares
`transition` (`cairn-admin.css:545`) and the floor declares `transition-duration`, so read literally
the clause would not discharge the one false positive it exists to kill. It reads the other way: a
`transition` shorthand declares `transition-duration`, and an `animation` shorthand declares
`animation-duration` and `animation-iteration-count`, for the purpose of the match. The reverse does
not hold, because a longhand the floor does not carry stays undischarged, which is what keeps the
residue real. That residue is the rule's remaining coverage over the file, and
it is real rather than nominal. The file-scoped matching (`guardedByFile`) is unchanged, so the
blanket block still cannot satisfy a component's obligation from a distance in another file.

## The harness additions

Sized against the runner as it is, not as a rule's line item wishes it were.

| Addition | Size | Why |
|---|---|---|
| `RenderedBrowser.newContext` gains `reducedMotion` and `hasTouch` | Small | Two members on a narrow type (`rendered/types.ts:60`) |
| `runRendered` gains an emulation axis, declared by rules the way `states` is | **Large** | `runRendered` (`rendered.ts:149-252`) nests pages, then themes, then one context, then states, then one page, and `RenderedRule.check` takes one page with no mechanism to carry state between invocations. An axis above the context threads a new loop level through the runner, extends the rule declaration surface, and multiplies contexts: six pages by two themes by one reduced pass is twelve new contexts and twelve new page loads, each re-running the hydration settle |
| The axis is **opt-in per rule**, declared the way `states` is | Small, and load-bearing | A rule that declares no axis runs in the default context alone, so the seventeen registered rendered rules run exactly the context count they run today. Without the opt-in the axis multiplies every rule's contexts for the sake of one |
| `RenderedRuleContext` gains the axis value | Small | It carries `pagePath`, `theme`, `state`, and `config` today. A rule running under two axis values that cannot tell them apart cannot decide whether to check |
| `ResolvedRenderedFinding` gains the axis, and `RenderedPageVisit.selectorsSeen` is keyed by it | Small | `rendered.ts:229` keys a resolved finding on page, theme, and state. With an axis above, the same element fires twice under different axis values and the allowlist bookkeeping has no dimension to tell the two apart |
| A shared CSSOM walker joins `__cairnAudit` beside `signature` and `isVisible` | Medium | A throwaway probe is about forty lines; a shared one handles `CSSNestedDeclarations`, `CSSSupportsRule`, `CSSContainerRule`, `CSSLayerBlockRule`, `@starting-style`, and a per-sheet `SecurityError`. It is rule 4's locator. The detector is a per-element `getComputedStyle` read, which needs no harness member at all |
| `RenderedPage.hover` | Not needed | The modality gate reads the CSSOM rather than a forced state, and the rendered hover half is out of this pass anyway |

The axis is the pass's one large item and it exists for exactly one rule. It is taken rather than
cut, because the delay finding is a bug shipping today and a reduced-motion context is the only
place the computed delay can be read. Two negative results bound the design and are recorded so a later pass does not
re-run them: CDP `Emulation.setEmulatedMedia` with a `features` array for `hover` and `pointer` was
silently ignored on the measured Chromium, and computed styles resolve every `var()`, so a rendered
vocabulary check can compare values but never token names (enforcement, Part 2).

## CI wiring

**The static half joins the gate that already runs.** `scripts/checks/check-invisible-craft.mjs`
calls `runStatic` over five roots with `cssFiles: ['examples/showcase/src/theme/theme.css']`,
filtered by `scopeReport` to `['gap-scale', 'token-colors', 'motion-band']`, and it is wired into CI
at `.github/workflows/test.yml:71`. Three additions, and no second config and no second gate:

- `RULE_IDS` gains `motion-property`, `motion-vocabulary`, and `motion-hover-gate`.
- `CSS_FILES` gains `src/lib/components/cairn-admin.css`.
- **`static.adminScope` in the config the gate builds**, naming the gate's own admin roots. The gate
  assembles its config in the script (`check-invisible-craft.mjs`'s `resolveConfig` call), so this is
  one more key on that object and a code deliverable of task 10, not a file a consumer writes.

**Why the admin scope is required rather than nice.** The gate's `SCAN_SCOPE` is
`src/lib/components`, `src/lib/admin-toolkit`, and three showcase roots,
`examples/showcase/src/{chassis,routes,theme}` (`check-invisible-craft.mjs:41-47`), and that scope is
what every rule resolves over until `static.adminScope` narrows the ones declaring `adminOnly`. The
gate's default for the key is the consumer default, which names two roots this tree does not have, so
the gate has to set it. Adding the three ids without setting it runs the admin's motion language, at
error tier, over the showcase's
public site theme and chassis. That tree is not the admin, it declares no `--cairn-dur-*` token, and
it carries the exact constructs the rules convict: three literal `0.2s ease-out` durations on the
theme-flip cross-fade (`examples/showcase/src/theme/theme.css:365-368`) and
`animation-duration: 0.18s` on the root view-transition pseudo-elements (`:384`). The gate would be
red the moment the wiring lands, and it would be red for the right reason under the wrong rule: the
non-goal "No motion on public pages" and the charter boundary in "The bar" both say the language
governs the admin frame only.

**The shape of the gate's admin scope.** The boundary itself lives on the rule, as `adminOnly`
above, so the gate only has to say which of its own roots are admin. It names three:
`src/lib/components`, `src/lib/admin-toolkit`, and `examples/showcase/src/routes/admin`. The
first two are the engine's admin frame. The third is deliberate and is a gain rather than a
concession: `examples/showcase/src/routes/admin/signups/+page.svelte` is the repo's one
consumer-shaped admin screen, so including it dogfoods the rules on the surface a consumer's own
screen most resembles, while the two public roots and the site routes stay out. Today that screen
produces no finding, which is the result the wiring records rather than a reason to skip it.

`gap-scale`, `token-colors`, and `motion-band` declare no `adminOnly` and keep the full five-root
scope, so no existing coverage narrows, which the gate's own header comment requires ("a graduation
may not shrink the ground the gate covered"). `CSS_FILES` keeps both entries, and the CSS-family
rules read the file that belongs to their roots: the admin sheet lies inside an admin root, so the
three motion rules read it, and the showcase theme file does not, so they do not.
**`scopeReport` does not change.** It keeps filtering by rule id alone, it grows no path term, and
its second caller, `check-admin-css-classes.mjs:35`, is untouched. The whole boundary is resolved
inside `runStatic`, before a report exists to filter.

A root `cairn-audit.config.json` plus two npm scripts was considered and declined: it would create a
second, narrower gate beside the one already running, since `DEFAULT_STATIC_SCOPE` drops the three
showcase roots this gate covers, and `motion-band` would run twice against two different scopes.

Order matters. The `cairn-admin.css:545` false positive is resolved before `CSS_FILES` gains the
file, per the reconciliation above.

**The rendered half gets its own workflow step, owning its own preview server, and the recipe is
`norms.yml`'s verbatim.** The alternative, a Playwright spec inside the showcase e2e suite, is
declined: the e2e server is Playwright's own `webServer`
(`examples/showcase/playwright.config.ts:29-34`), its lifetime is the `playwright test` process, and
`.github/workflows/e2e.yml:118` runs only the e2e command, while the audit harness refuses to start
a server (`rendered.ts:15-17`).

Revision 2 also declined the e2e-flagged build, reasoning that riding it would audit a flagged build
rather than the one a consumer ships. **That reasoning is withdrawn**, because a default build cannot
serve the pages the rule reads at all. `__CAIRN_DEV_BUILD__` (`examples/showcase/vite.config.ts:28`)
folds the dev backend out of a default build, and the runtime `CAIRN_DEV_BACKEND=1` half then has
nothing to enable. `DEFAULT_RENDERED_PAGES` is six `/admin/*` routes (`config.ts:41-49`), so the step
would either fail to load them or, worse, audit `/admin/login` redirects and report clean, which is a
vacuous advisory rule wearing a green tick.

The recipe is the one `norms.yml:51-56` already proves on CI: `VITE_CAIRN_E2E=1` build, then
`CAIRN_DEV_BACKEND=1 nohup … run preview -- --port <its own port>` detached with its output
redirected, then a readiness poll on `/admin/posts` that fails the step if the server never answers.
The port is the step's own and is never 4173. Before the step is wired, the `CAIRN_DEV_BACKEND`
tripwire recorded in `docs/HISTORY.md` (the internals pass, round A), which refuses the variable when
it is set alongside a non-local host, is re-read, since the step is the second place in the repo to
set it.

Per the gate-economy rule, the static half joins the per-task gate, because it is fast and already
there. The rendered half runs at the pass-end gate and in CI.

## Deliverables

Four artifacts beyond the code.

**The design system's Motion section** (`docs/internal/admin-design-system.md`). The token table, the
allowlist and the snap list with the one exception, the enter and exit rule with its floor, the
modality gate, the reduced-motion policy by property class, the responsive rules, and the DaisyUI
decision with its eleven disagreements, its declined override, and its reopen trigger. Written in
that document's own register: agent-facing, rules first, the load-bearing mechanics that are not
visible in the markup called out.

Four limitations belong in it rather than in a reader's inference. The resize stopper is not shipped,
and the section says what does hold the resize case (every layout property snaps already) and what
does not (the vendor drawer transition at the breakpoint flip). The zen offset's travel window is
unasserted against 2.4.11, so the synchronous focus sequence is necessary and not sufficient. The
skeleton shimmer's own 2.2.2 answer is DaisyUI's reduced-motion off switch, not the spinner's
replaces-the-content reasoning. And a focus indicator's own geometry animates at `instant` and no
longer band, so `outline-width` and `outline-offset` stay allowlisted with a bound rather than
openly.

**This section is canonical.** Where the design system and the recipe page state the same rule, the
design system is the source and the recipe cites it by heading rather than restating it. Without
that, the two drift, and the recipe is the one a developer reads. Both documents say so in a line of
their own.

**The extend track's motion recipe** (`docs/extend/animate-a-custom-screen.md`). The first
per-pattern recipe page, written for a developer building a custom admin screen: the tokens they
write, the four rules they will meet and what each fix message means, the three join limits stated as
limits, and the two configuration lines a consumer may owe, neither required by default (naming
their own theme CSS in `static.cssFiles` if they want the CSS-family rules to read it, which is
already true of `token-colors`, and naming `static.adminScope` if their admin screens sit outside
`src/routes/admin` and `src/lib/admin-toolkit`). It also carries the one non-obvious authoring step,
splitting a `:hover` and
`:focus-visible` selector list before adding the modality guard, and the opt-back-in permission with
its budget caveat. It cites the design system's Motion section as canonical rather than restating its
rules. It joins `docs/extend/README.md`'s index. It grades under Vale's Google package and the extend
arm's register in `docs/internal/docs-register.md`.

**The audit reference** (`docs/reference/cairn-audit.md`). Three rows in the static table, one in the
rendered advisory table, the `static.adminScope` config key with its default, the `motion-band` band
correction, and the coverage limits. The key is the pass's one consumer-facing config addition, and
this page is where a consumer meets it. Two prose counts
on that page move with them and are named here because a reviewer will not find them by reading the
tables: `:66` says "Twelve rules run, all error tier", which becomes fifteen and is no longer all
error tier once the rendered advisory lands, and `:24-25` says "All 28 registered rules", which
becomes 32. `check:reference` gates an undocumented export; this page is gated by review, so the plan
makes it a task acceptance criterion.

**The records.** `docs/HISTORY.md`, the ROADMAP entry closed and the follow-ups filed (the rendered
hover half, the `.tooltip` and `.menu` gates, the `modal-bottom` reopen trigger if it is not carried
as a `WATCH:`, and the resize stopper in the Later tier with the finding that its working form costs
an unlayered rule), the friction log triaged, and the `CHANGELOG.md` entry under `## Unreleased`.

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

**The cost of the six surfaces is stated.** Six surfaces across five widths in two themes is exactly
60 new CI-canonical baseline files, committed by the regen run, plus whatever the five paint tasks
move in the existing set. That is the pass's largest artifact and
the reason task 10 depends on every task that paints. The standing gotcha applies to the regen: after
it lands, this workstation's Chromium renders some of those files a few pixels differently, so a
local `CI=1 test:e2e` is green when its only visual failures are exactly the files the regen commit
rewrote.

**The zen toggle's layout-count assertion is the regression guard, and it lands in the task that
ships the motion.** The zen record's measurement gives the method and the numbers: entering zen with
the margin untransitioned produces two distinct computed `margin-left` values and one layout, and
with the transition it produces ten or more values and ten to eleven layouts (zen, "cairn's own zen
toggle, measured"). The spec turns that into two assertions in the showcase e2e, **owned by task 7**
rather than by task 10, because they are the pass's only real proof of motion and a task that ships
motion should gate on it:

- In a default context at 1440, toggling zen produces more than two distinct computed `margin-left`
  values on `.drawer-content` during the toggle window. This fails if the transition is ever dropped,
  scoped away, or beaten by a later rule.
- In a `reducedMotion: 'reduce'` context at the same width, it produces **at most two**. The floor
  keeps `0.01ms` rather than `0s`, deliberately, so `transitionend` still fires, which leaves a
  0.01ms window a sample could in principle land inside. The assertion is stated as a bound rather
  than an exact count, and the companion `LayoutCount` reading is the signal the text elsewhere calls
  reliable. It fails if the exception ever escapes the blanket block.

Frame-interval counts are deliberately not asserted. The same 700ms window returned 40 to 46 frames
in some runs and 88 to 92 in others under headless Chromium, so the over-threshold counts are a noise
floor and `LayoutCount` is the reliable signal.

**The fresh-context read.** The pass carries rendered paint, so it ends with a `visual-verifier`
dispatch over the new surfaces in both schemes. The builder's own "matches" is never the verdict.

**The zen reproduction-manifest entry is cut.** Revision 2 added the zen toggle to
`src/lib/reproductions/manifest.ts` as a motion case. Three things rule against it. The frozen id
list is a cross-repo contract: `reproductions-manifest.test.ts:13-15` records that cairn-pub's
`2026-08-15-live-reproduction-seam-design.md` owns it and that changing one id is a spec edit. The
edit needs a third file nobody listed, since `getStory` throws for an unregistered id, so the new id
owes either a story component under `src/lib/reproductions/stories/` or a `PENDING_STORY_IDS` entry
in `src/tests/component/reproductions-stories.test.ts`. And a reproduction is a static mount, so the
case it would carry cannot show motion at all. The cost is a cross-repo contract edit for no motion
evidence.

**The per-task capture set is narrowed to what the change can reach.** Global constraint 6 forbids
touching any file `site-visual.spec.ts` renders, so `home`, `article`, `archive2`, and `error404`
cannot move, and five paint tasks capturing all six surfaces twice is about a thousand captures of
pure leak proof against a constraint `git status` already enforces. A paint task's capture pair
covers `signups` and `styleguide`; the pass-end `visual-verifier` runs the full set.

## The changelog window

Seven `Consumers must:` lines, all in one release.

1. `cairn-audit` gains three error-tier static rules (`motion-property`, `motion-vocabulary`,
   `motion-hover-gate`) and one advisory rendered rule (`motion-reduced-delay`). A custom admin screen
   that transitions a layout property, writes `transition-all`, writes a literal duration or easing, or
   declares an ungated hand-authored `:hover` transition now fails `npx cairn-audit`. Move onto the
   `--cairn-dur-*` and `--cairn-ease-*` tokens, or suppress with a reason.
2. `motion-band`'s band widens from 150ms to 250ms to 70ms to 400ms, and it no longer reports a call
   site that references a token. A site relying on the narrow band loses that check; the vocabulary
   rule is what replaces it. An existing `cairn-audit-disable-next-line motion-band` directive that
   covered a finding inside the old band and outside the new one now silences nothing, which
   `cairn-audit` reports as a dead suppression at error tier that cannot itself be suppressed:
   delete the directive on upgrade. The motion predicate also widens, so a `transition-delay` reaches
   `motion-band`'s band check and a rule declaring only `transition-timing-function` now owes a
   reduced-motion sibling under `reduced-motion`.
3. The admin sheet sets `--default-transition-duration` and `--default-transition-timing-function` to
   cairn tokens on the admin root. A bare `transition` utility on a custom screen changes curve from
   Tailwind's `cubic-bezier(0.4, 0, 0.2, 1)` to Carbon's productive standard
   `cubic-bezier(0.2, 0, 0.38, 0.9)`. The duration is unchanged at 150ms.
4. The admin's reduced-motion block now zeroes `transition-delay` and `animation-delay`. A custom
   screen that relied on a delay surviving a reduced-motion preference loses it, which is the fix.
5. The edit page's preview pane no longer animates its width when the split changes. The resize snaps.
6. The upload progress fill no longer transitions its `width`, and no motion replaces it: the fill
   snaps to each new value. The native `<progress>` element is unchanged and keeps its implicit
   `progressbar` role and its `value`/`max` mapping, so nothing changes for assistive technology. The
   reduced-motion pin on `::-webkit-progress-value` goes with the transition it pinned.
7. Three utility classes leave the packaged admin sheet, because their last call sites go:
   `transition-all`, `transition-[width]`, and `duration-[250ms]`. A site whose own markup carries any
   of the three was relying on the engine's sheet to compile it; add the class to that site's own
   Tailwind content or restate the declaration.

No export changes, so `check:surface` stays byte-identical. That is a narrower statement than it
looks, and the gap is named here rather than discovered later: the `--cairn-dur-*` and
`--cairn-ease-*` namespace is a public contract with no export gate behind it, because
`check:public-tokens` reads only the showcase's public theme files and would never see an admin
token. What holds it is `src/tests/unit/admin-sheet-inventory.test.ts`, which asserts the eight names
and their values in the built sheet, and task 1 owns that assertion.

## Non-goals

- **No route transitions in the admin**, at any viewport, on any input device. A cross-fade between
  two admin pages carries no information, the default 0.25s is paid before the new route's first
  paint, a view transition holds a snapshot over the live DOM while the admin's focus management
  needs focus on the first frame, and the family already made this decision: the showcase's own
  comment scopes its route transition away from the admin (`examples/showcase/src/theme/theme.css`
  lines 378 to 380). This pass writes no `startViewTransition` and no `view-transition-name`, and it
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
- **The shipped violations convict on run one.** The moment `cairn-admin.css` joins `CSS_FILES` and
  the new ids join `RULE_IDS`, `EditPage.svelte:2047` and `MarkdownEditor.svelte:530` fire under
  `motion-property`, `cairn-admin.css:545` fires under `motion-vocabulary`, and
  `EditPage.svelte:1643` fires under `motion-band`, which owns `transition-all`. The gate goes red
  between the rule tasks and the migration task. Mitigation: task 10 lands after tasks 6a, 6b, and 7,
  and the plan orders them that way explicitly.
- **The `adminOnly` scope is a rule-type change, a config key, and one line in the gate's config,
  none of which exists yet.** Without them the three new ids run at error tier over a consumer's
  public components and over the showcase's public theme, and the engine's gate is red on landing for
  a reason the charter forbids. The field and the key are task 3's, the second rule declares the
  field in task 4, and the gate's `static.adminScope` is task 10's. Mitigation: task 10's acceptance
  criterion is that `gap-scale`, `token-colors`, and `motion-band` keep the full five-root scope and
  the three motion ids report nothing from `examples/showcase/src/{chassis,theme}` or from the
  showcase's public routes, proved by a paired run with and without the key.
- **The vendor exemption is a coverage loss on cairn's own markup, not only a false-positive fix.**
  Exempting the four DaisyUI property disagreements means `motion-property` cannot see a snap-list
  transition that arrives through a vendor class, and `CairnAdminShell.svelte:949` carries one today.
  The exposure is bounded by the CSS-family half, which keeps the full check on anything authored,
  and by the eleven disagreements being enumerated rather than silent. Mitigation: the explicit
  class-name fallback list is reviewed rather than pattern-matched, so a cairn class never inherits
  the exemption by accident.
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
- **Two claims are reasoning rather than measurement and are proved in task 1**: that a restatement
  inside the reduced-motion guard reliably beats the blanket block, which is a source-order question
  rather than a specificity one, since `[data-theme='cairn-admin'] *` and a class selector are both
  (0,1,0) and both carry `!important`; and that the chosen token-referencing authoring form for a
  Tailwind duration compiles to a `var(--cairn-dur-*)` in the sheet rather than to a literal. A third
  claim, the ten-to-fourteen selector count for a DaisyUI override block nobody has written, stays
  unmeasured and is moot under decision 4, which is why the DaisyUI section states it as a range.
- **A worktree showcase e2e proves `main`'s engine.** The showcase's `node_modules` symlinks back to
  the main checkout, so a from-scratch `npm install` in the worktree's showcase is a pre-dispatch step
  in the plan, per this repo's standing gotcha.

## Task outline

Ten tasks, for the plan to expand. Revision 1 had eleven; the adversarial review folded task 5 into
task 3 and task 9 into task 8, and split task 6 into 6a and 6b, which is where an implementer would
otherwise have guessed. The retired ids are not reused, so every other number means what it meant in
revision 1. Each row names its files, its dependencies, and whether it moves rendered paint and
therefore carries the showcase e2e in its own gate.

**1. The token set, the theme defaults, and the two shipped bugs. Paint.**
Files: `src/lib/components/cairn-admin.css`, `scripts/build/admin-css.input.css`,
`src/lib/audit/rules/static/motion.ts`, `src/tests/unit/admin-css-build.test.ts`,
`src/tests/unit/admin-sheet-inventory.test.ts`, `src/tests/unit/audit/rules/reduced-motion.test.ts`.
Authors the five durations and three curves into `cairn-admin.css`'s two existing `[data-theme=…]`
blocks, points `--default-transition-duration` and `--default-transition-timing-function` at them in
whichever form the build accepts (an unlayered restatement on the same roots, or a `@theme` block),
reports which form it measured, and fixes both shipped bugs decision 8 names:
`transition-delay: 0s !important` and `animation-delay: 0s !important` in the blanket block, and
`isReducedMotionGuarded` no longer treating `(prefers-reduced-motion: no-preference)` as a guard. The
second fix moves what the existing `reduced-motion` fixtures assert, so their update is part of the
fix rather than task 2's re-baseline. Also proves three things: that a restatement inside the reduced
guard beats the blanket block by source order, that the chosen Tailwind duration authoring form
compiles to a token reference, and, by computed style on the admin root at runtime, that both theme
defaults resolve to the token values. That third proof is the only evidence the curve change has.
Asserts the eight token names and values, which is what holds the public namespace. Depends on
nothing. **Independent.**

**2. The shipped-rule reconciliation. Not paint.**
Files: `src/lib/audit/rules/static/motion.ts`, `motion-band.ts`, `reduced-motion.ts`, and the two
fixture suites that exist, `src/tests/unit/audit/rules/motion-band.test.ts` and
`reduced-motion.test.ts`. `motion.ts` carries the shared predicates and has no fixture suite of its
own, so the re-baseline is two suites rather than three.
Widens `isMotionProperty` to the nine properties, `transition-property` included, widens
`motion-band`'s band to 70ms to 400ms, makes `motion-band` the one owner of `transition: all` and
gives its fix message the `@starting-style` clause, adds `reduced-motion`'s floor clause scoped to
the properties the floor actually zeroes with the shorthand-counts-as-longhand reading stated, and
re-baselines the two existing suites against the widened predicate. The `no-preference` fix is task
1's, not this task's. Depends on task 1. Not independent of it.

**3. `motion-property` and `motion-hover-gate`. Not paint.**
Files: `src/lib/audit/rules/static/motion-property.ts`, `motion-hover-gate.ts`, `src/lib/audit/types.ts`
(the optional `adminOnly` field), `src/lib/audit/config.ts` (the optional `static.adminScope` key),
`src/lib/audit/run.ts` (resolving the one over the other), the static registry
`src/lib/audit/rules/static/index.ts`, and the two fixture suites under
`src/tests/unit/audit/rules/`.
This task also adds the optional `adminOnly` field to the static rule type, the `static.adminScope`
config key it resolves over, and declares the field on both new rules. `motion-property` carries the
allowlist, the snap list, the three-property cap, the
`animate-*` keyframe clause, the deferral of `transition: all` to `motion-band`, the vendor-class
exemption on its class-join half, and the zen exception keyed on `cairn-admin.css` plus
`.drawer-content` plus `margin-left`, with its three-sided fixture. `motion-hover-gate` mirrors
`focus-parity`'s shape, carries both predicates, and its fix message warns about the hover and focus
selector-list split, a warning its own firing fixture makes detectable.
Revision 1 gave `motion-hover-gate` its own task; it is one 59-line rule in the same file family with
the same dependency, and folding it saves a task's fixed overhead. Depends on task 2. **Shares the
static registry with task 4**, so the two are not file-disjoint.

**4. `motion-vocabulary`. Not paint.**
Files: `src/lib/audit/rules/static/motion-vocabulary.ts`, the static registry
`src/lib/audit/rules/static/index.ts`, `src/tests/unit/audit/rules/motion-vocabulary.test.ts`.
The token check on both surfaces, the class join on `elementStart`, the vendor-class exemption with
its named discriminator and its explicit class-name fallback, the companion built-sheet assertion,
the positive `infinite` clause, the three abstention shapes, the `adminOnly` declaration, and the
three join limits documented in the rule's own doc comment. Depends on tasks 1 and 2. **Shares the
static registry with task 3.**

**6a. The admin migrated onto the language. Paint.**
Files: `src/lib/components/EditPage.svelte`, `MarkdownEditor.svelte`, `CairnAdminShell.svelte`,
`CairnMediaLibrary.svelte`, `ConceptList.svelte`, `MediaHeroField.svelte`, `HelpHome.svelte`,
`cairn-admin.css`, `editor-folding.ts`, and
`src/tests/unit/fixtures/admin-sheet-inventory.txt`.
The seventeen shipped declarations, and nothing else. The three violations fixed (the feedback
alert's named property list, the preview pane's width transition removed, and the upload fill's
`width` transition removed with its reduced-motion pin, the native `<progress>` untouched),
`cairn-admin.css:545` onto tokens, the three `duration-[250ms]` classes onto the token form, the two
`HelpHome` rules onto tokens with no guard added, the fold chevron and unfold flash onto tokens with
`editor-folding.ts`'s `FLASH_MS` left alone and the independence recorded. It owns the seventh
`Consumers must:` line, for the three utility classes that leave the packaged sheet, and regenerates
`admin-sheet-inventory.txt` after writing that line. No entry is added to
`custom-surface-budget.json`, which is the test that this task stayed inside the two rulings. Depends
on tasks 3 and 4, so the rules exist before the code is measured against them.

**6b. The dropzone's drag-over state. Paint.**
Files: `src/lib/components/MediaHeroField.svelte`,
`src/tests/component/media-hero-field-dropzone.test.ts`, and
`src/tests/unit/fixtures/admin-sheet-inventory.txt`.
The dropzone's drag-over paint state, fully specified in the case table's notes: a `dragOver` boolean
set on `ondragenter` and `ondragover`, cleared on `ondrop` and on `ondragleave` only when
`relatedTarget` lies outside the button, toggling the same utility classes the element's own `hover:`
variants carry, so the paint reaches a coarse pointer, needs no modality guard, and authors no CSS
rule. Its component test drives the four handlers and the `relatedTarget` boundary, which is the
task's one piece of real logic. The resize stopper that revision 2 paired with it is **cut** and
filed; the responsive rules section carries the reasons. Depends on task 6a, whose file it shares.

**7. Zen. Paint.**
Files: `src/lib/components/cairn-admin.css`, `CairnAdminShell.svelte`, `EditPage.svelte`,
`examples/showcase/e2e/admin-visual.spec.ts`, and
`src/tests/unit/fixtures/admin-sheet-inventory.txt`.
The `.drawer-content` `margin-left` transition authored in `cairn-admin.css` at `shift` in and `base`
out on the paired curves, the chrome regions' fade in and out, the chip's delayed entrance and
immediate exit with the 110ms delay authored inside a `(prefers-reduced-motion: no-preference)`
guard, the card's box left snapping, and `setZen()`'s `flushSync()` focus sequence at
`EditPage.svelte:441` kept synchronous so motion never gates focus. It also carries the two zen
layout-count assertions, which revision 2 parked in task 10: the task that ships the motion is the
task that gates on the proof of it. Depends on tasks 1, 6a, and 6b.

**8. The rendered harness, `motion-reduced-delay`, and its CI step. Not paint.**
Files: `src/lib/audit/rendered/types.ts`, `src/lib/audit/rendered.ts`,
`src/lib/audit/rendered/page-surface.ts`, `src/lib/audit/rules/rendered/motion-reduced-delay.ts`, the
rendered registry `src/lib/audit/rules/rendered/index.ts`,
`src/tests/unit/audit/rules/rendered/motion-reduced-delay.test.ts`, the rendered harness suite
`src/tests/unit/audit/rendered.test.ts`, and `.github/workflows/norms.yml`.
`newContext` gains `reducedMotion` and `hasTouch`; `runRendered` gains the emulation axis, opt-in per
rule and declared the way `states` is, with `RenderedRuleContext` and `ResolvedRenderedFinding` both
carrying the axis value and `selectorsSeen` keyed by it; the shared CSSOM walker joins `__cairnAudit`,
handling nested declarations, supports, container, layer-block, and `@starting-style` nodes plus a
per-sheet `SecurityError`. The rule reads computed delays per element and uses the walker to name the
authored rule in its fix message, with three positive fixtures and two negatives. The workflow step
follows `norms.yml`'s recipe verbatim, a `VITE_CAIRN_E2E=1` build plus a detached
`CAIRN_DEV_BACKEND=1` preview on its own port with a readiness poll on `/admin/posts`, and re-reads
the `CAIRN_DEV_BACKEND` tripwire before wiring. Revision 1 gave the rule and its step a separate task;
it is one rule and one workflow step against a harness task with no other consumer. Depends on
nothing. **Independent.**

**10. The engine's tree wired, and the visual suite. Paint.**
Files: `scripts/checks/check-invisible-craft.mjs`, `examples/showcase/e2e/admin-visual.spec.ts`, and
the gate's own test file, `src/tests/unit/audit-gate.test.ts`. `scripts/checks/audit-gate.mjs` and
`scripts/checks/check-admin-css-classes.mjs` are not touched.
The gate's own `static.adminScope`, naming its three admin roots, which is the deliverable that makes
the wiring legal, since the key's default names two roots this tree does not have. Then `RULE_IDS`
and `CSS_FILES` with the gate green and the three existing
ids keeping their full scope, and the six new surfaces across the five-viewport bar. The zen
layout-count assertions belong to task 7 and the reproduction-manifest entry is cut, so this task
touches neither. Baselines regenerate on CI, 60 new files. Depends on tasks 6a, 6b, 7, and 8 by merge
order; it shares no file with task 8.

**11. Docs and records. Not paint.**
Files: `docs/internal/admin-design-system.md`, `docs/extend/animate-a-custom-screen.md`,
`docs/extend/README.md`, `docs/reference/cairn-audit.md`, `docs/extend/migration-notes.md`,
`docs/HISTORY.md`, `ROADMAP.md`, `CHANGELOG.md`, `docs/internal/engine-rulings.md`,
`docs/internal/docs-friction-log.md`.
The Motion section, canonical, with the eleven vendor disagreements and the four stated limitations;
the recipe page, citing it rather than restating it; the reference rows plus the two prose counts at
`cairn-audit.md:66` and `:24-25`; the migration-notes entry this window's behavior changes owe; the
ruling rows quoting decisions 3 and 4 and the two escalation rulings of 2026-09-13; the follow-ups
filed (the rendered hover half, the `.tooltip` touch defect with the visibility-not-transition
finding, the `.menu` gate, the `modal-bottom` reopen trigger if it is not carried as a `WATCH:`, and
the resize stopper in the Later tier); and the `## Unreleased` block read whole, carrying all seven
`Consumers must:` lines. The conductor writes `docs/STATUS.md`, never this task. Depends on
everything.

**Parallelism.** Two chains, not four. Task 8 is genuinely independent and runs alongside the static
work from the start. Tasks 3 and 4 both register a rule in
`src/lib/audit/rules/static/index.ts`, so revision 1's claim that they "share no files" was wrong and
parallel worktrees would collide on the registry every time; one chain owns 2, then 3, then 4, in
that order. Everything downstream of 4 is a real dependency chain: 6a, then 6b, then 7, then 10, then
11. Tasks 1, 6a, 6b, 7, and 10 move rendered paint and carry the showcase e2e in their own gate; the
other five run the check suite and their own unit tests, with the full suite at the pass-end gate and
on every CI push.
