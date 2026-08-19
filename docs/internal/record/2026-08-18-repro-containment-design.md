# Containment in `ReproContext`: ratified design

Ratified 2026-08-18 by the seam Pass 2 conductor, from an eight-agent design workflow (four
investigation lenses, one synthesis, three adversarial skeptics). The skeptics produced four
substantiated blockers against the synthesized design, three of them carrying multi-engine browser
probes. This document is the synthesis **as amended by those blockers**, and it is the contract the
implementer builds against.

**Amended again 2026-08-18, from the implementation review gate** (a Svelte reviewer, an
accessibility reviewer, and a trust-boundary reviewer, all three run against the built
implementation, two carrying fresh multi-engine probes). Every amended passage below is marked
**[AMENDED]**, and where an amendment contradicts the ratified text the amendment governs. What
changed: M3 now cancels the two drag types as well as stopping them; M3's ordering claim is
registration order, not phase precedence; R6 and Risk 2 are replaced by the measured host-side focus
behavior, which does not do what they said; M1's WebKit note follows R6; T2b's prescribed red proof
did not falsify and is corrected; and the test plan and docs list gain the accessibility-tree
assumption and the mounting constraint.

Owed by seam Pass 2 before the `/repro` route ships (cairn-cms `ROADMAP.md`, first Now entry;
`docs/STATUS.md`, Pass 2's first owed item). The plan
(`docs/superpowers/plans/2026-08-15-live-reproduction-seam-plan.md`) put containment on the
consuming route via `inert`; Pass 1b's review gate disproved that, and this replaces it.

## The decision

Containment is a property of the mounted render, not of the page that embeds it. It lives in
`src/lib/reproductions/ReproContext.svelte`, holds from first paint, and does not depend on when or
whether a pose runs.

It cannot live on the consuming route, for two independent structural reasons rather than the one
the ROADMAP entry names. `TidyReview` calls `dialog.showModal()` inside its own mount `$effect`
(`src/lib/components/TidyReview.svelte:159-164`), which completes before any route-level step can
run. And `ReproContext` does not run poses at all: the consumer does
(`src/tests/component/reproductions-stories.test.ts` holds the only `.pose(` call sites in the
repo), so ROADMAP's "`inert` applied to the mounted subtree inside `ReproContext` after the pose
resolves" describes a hook that does not exist. Containment must therefore be time-independent and
event-driven, not a post-pose sweep.

## Rulings

These are conductor rulings on points where the lenses and skeptics disagreed. Each is binding.

**R1. Ancestor `inert` does NOT contain a modal dialog.** The HTML spec's inert algorithm exempts
the topmost modal dialog and its flat-tree descendants from an ancestor's inertness, and two lenses
verified it in real Chromium: wrapper `inert` set before `showModal()` still lands focus inside the
dialog. Any per-story reasoning that assumes inert-on-root covers a `showModal()` row is wrong and
must not be carried into implementation.

**R2. `inert` set directly on the dialog element itself DOES suppress the focus move, at no
fidelity cost.** Verified: `dialog.open` stays true, the dialog stays top-layered (`:modal`
matches), `::backdrop` still paints, centering is unchanged, and `document.activeElement` does not
move. This is the mechanism M1 applies.

**R3. RULED against ROADMAP's `openOnMount` prop on `TidyReview`.** It fixes one of sixteen
`showModal()` call sites, leaves the four pose-opened modals untouched, and its natural
implementation (render `<dialog open>` without `showModal()`) is a real fidelity loss: the dialog
leaves the top layer, paints no `::backdrop`, and lands in normal flow. `editor/tidy-review` is a
story whose entire subject is an open modal review. M1 gets the same containment with no component
edit and no fidelity change.

**R4. RULED against the synthesis's M3-M6: no admin component is edited, and
`picture-context.ts` is not created.** The synthesis proposed a `PICTURE_CONTEXT_KEY` module read
by `CairnAdminShell`, `EditPage`, `CairnMediaLibrary`, and `ListToolbar` to skip their window-level
bindings. All four are publicly exported components that exist to serve real admin users, and the
concern is docs-only. The scope skeptic showed, with a Chromium probe, that one window-capture
listener inside `ReproContext` covers all five event types by itself, and covers strictly more:
`EditPage`'s imperatively registered listeners, element-level handlers inside the frame, and any
future component that grows a `<svelte:window>` binding without anyone remembering to gate it.
That last case is the synthesis's own Risk 3, which `ListToolbar` already proves live. The leaner
design also removes the mechanism by which this could regress silently. Adopted as **M3** below.

**R5. "Nothing degrades" is FALSE, and the change is recorded rather than denied.** Two skeptics
independently found, with browser probes across three engines, that `cairn-admin.css:519` paints a
2px `--color-primary` ring on any `:focus-visible` element under either admin theme root, and that
both `showModal()` and a programmatic `.focus()` flip `:focus-visible` to true with no prior real
user interaction. Seven stories therefore paint a focus ring today, and containment removes it. See
Fidelity below. Pass 1b's locked decision 4 binds in its inverse: a containment change that alters
the picture is recorded, not silently accepted.

**R6. The host still owns the `<iframe>` element, and owns the focus repair outright. [AMENDED]**
Content-side `inert` does not remove a same-origin iframe from the host document's sequential focus
navigation; Tab from the host lands on the `<iframe>` element itself. Only the host removes it, and
the two attributes available are not interchangeable: `tabindex="-1"` takes the frame out of
sequential focus navigation only, while `inert` additionally blocks hit-testing on it. The ratified
text offered them as alternatives, which understates what a site gets from the cheaper one.

The ratified text went further and said that a host marking the frame `inert` or `tabindex="-1"`
releases the host document's focus pin, and that in WebKit this is the only thing that does. That is
false. The review gate measured all nine combinations, with a host page focusing an `<input>` and
then inserting a frame whose content programmatically focuses a button, which is the shape of all
seven auto-focusing stories. The host's `document.activeElement` afterward:

| engine | plain iframe | `tabindex="-1"` | `inert` |
|---|---|---|---|
| chromium | IFRAME | IFRAME | IFRAME |
| firefox | IFRAME | IFRAME | BODY |
| webkit | IFRAME | IFRAME | IFRAME |

Six of the nine contradict the claim, including the WebKit cell the sentence was specifically about,
and in all nine the reader's focused `<input>` was blurred. So a lazily loaded self-focusing
reproduction steals a reader's focus, host-side `inert` does not prevent it (at best, in Firefox, it
changes where the stolen focus lands), and nothing inside the frame can prevent it either: M1 is a
repair by construction, and prevention would need `dialog.inert` set before `showModal()`, for which
the engine has no hook. Do not publish the superseded sentence; four production sites would read it
as one attribute closing a hole it does not close.

**RULED, 2026-08-18.** The repair belongs to the embedding page, which records
`document.activeElement` before the frame loads and restores it after.
`docs/reference/reproductions.md`, the `@component` block, and `CHANGELOG.md` state it as the
embedding route's obligation. cairn-pub's seam spec needs the matching amendment, which item 6
below owes and the route task makes; this task does not edit that spec.

## Mechanisms

Three, all inside `src/lib/reproductions/ReproContext.svelte`. No admin component is touched. No
module is created. Nothing is exported.

### M1. The focus firewall: a modal dialog steals focus and keeps a live tab order

**What leaks.** `showModal()` runs the dialog focusing steps and moves focus into the dialog,
escaping any ancestor `inert` (R1). Inside the frame the dialog's own buttons stay fully tabbable,
because the dialog subtree is exempt from the wrapper's inertness. Across documents, the host page's
`activeElement` becomes the `<iframe>`, and a same-frame `.blur()` alone does not release it.

**Stories reached.** `editor/tidy-review` at mount with no user action
(`TidyReview.svelte:159-164`). Pose-opened: `publish/pending-list`
(`CairnAdminShell.svelte:678`), `media/lead-picture-dialog` (`MediaHeroField.svelte:202`),
`media/delete-in-use` (`CairnMediaLibrary.svelte:305`). Twelve further `showModal()` call sites in
`src/lib/components/` that no story reaches today and any future story may.

**Fix.** A capture-phase `focusin` listener on `document`, registered from `ReproContext`'s instance
body, guarded by `BROWSER` from `esm-env` (already a dependency; precedent
`src/lib/sveltekit/admin-action.ts:13`), removed by the shared `release()` under M3. Behavior:

1. Bail unless the event target is an `Element` inside the `[data-cairn-picture]` wrapper.
2. `const dialog = target.closest('dialog[open]'); if (dialog) dialog.inert = true;` This converts
   the first catch into permanent containment for that dialog, which is what removes its buttons
   from the frame's tab order. Ancestor inert cannot do this (R1).
3. Blur `document.activeElement` if it is an `HTMLElement`.
4. Release the host's focus pin on the frame. **Feature-test, never `instanceof`:**
   `window.frameElement` returns the PARENT realm's element, so `frame instanceof HTMLElement`
   evaluates against the frame realm's constructor and is `false` in Chromium and Firefox, which
   are exactly the engines where the blur works. Use
   `try { const frame = window.frameElement; if (frame && typeof frame.blur === 'function') frame.blur(); } catch { /* cross-origin */ }`.
   The `try` stays: `frameElement` returns `null` cross-origin per spec, but engines have differed.

Registration from the instance body, not `onMount` and not an `$effect`, is deliberate and
load-bearing: the instance body runs before the template creates any child, which removes every
question about parent-versus-child effect ordering. T3 is what proves the ordering holds.

**Engine limitation, stated honestly. [AMENDED]** Step 4 does not release the pin in WebKit
(probed). The ratified text concluded that host-side `inert` is therefore the only mechanism for
Safari readers; R6 as amended shows it is not a mechanism at all, in any engine. Step 4 is a partial
repair in Chromium and Firefox and nothing in WebKit, and it never restores the reader's own focus,
only resets it to `<body>`. The reader's focus is restored by the embedding page or not at all,
which is what the route task's acceptance criteria must say.

### M2. The inert wrapper: every other control is focusable and tabbable

**What leaks.** Buttons, inputs, links, and the CodeMirror `contenteditable` are focusable;
`.focus()` from any component effect succeeds; Tab inside the frame walks a full admin screen.

**Stories reached.** All 25.

**Fix.** Wrap all three of `ReproContext`'s host branches in one element carrying `inert` and
`data-cairn-picture`, styled `display: contents` through a Svelte scoped `<style>` block. Never an
inline `style` attribute, and never a rule in `cairn-admin.css`: that stylesheet ships to consumer
sites and this rule is reproduction-only.

`display: contents` keeps the wrapper out of layout, which is required because the `shell` branch
and the auth branch currently render with no wrapper of their own. `inert` is not layout-dependent,
so it still applies to flat-tree descendants.

The attribute is `data-cairn-picture`, deliberately distinct from the consuming route's own
`[data-repro-root]`, which sits OUTSIDE this wrapper and must keep working as the theme-flip hook.

### M3. The event firewall: window-level bindings answer keystrokes and drops

**What leaks.** Four components bind window-level handlers reached by mounted stories:
`CairnAdminShell.svelte:544` (`keydown` answering Ctrl/Cmd+K with the command palette and Ctrl/Cmd+B
with the drawer, plus `keydowncapture`), `EditPage.svelte:359-360` (imperative `keydown` carrying
Ctrl+S/Escape/Alt+P and others, plus `beforeunload`), `CairnMediaLibrary.svelte:1415` (`keydown`,
`dragover`, `drop`, so a file dropped anywhere over the frame opens the upload flow with no focus
involved), and `src/lib/admin-toolkit/ListToolbar.svelte:340` (`pointerdown`, `keydown`, reached
through two different hosts rather than as a story's own component, which is why no per-story
review found it).

**Stories reached.** All 15 shell-hosted, all four `EditPage`, all four media, plus
`editor/sidebar-list` and `publish/refusal-banner` through `ListToolbar`.

**Fix. [AMENDED]** One capture-phase listener per type on `window`, registered from `ReproContext`'s
instance body alongside M1's, removed by the shared `release()` below. Types: `keydown`,
`pointerdown`, `dragover`,
`drop`, `beforeunload`. Each calls `event.stopImmediatePropagation()`, and `dragover` and `drop`
additionally call `event.preventDefault()`.

The ratified text prescribed the stop alone, which makes the leak worse rather than closing it.
`CairnMediaLibrary`'s `onPageDragover` is the only thing making the window a valid drop target, and
its own `preventDefault` is what makes it one; the comment at `CairnMediaLibrary.svelte:624` says
so, naming the consequence of losing it ("drop never fires and the browser navigates to the raw
file"). Stopping that handler without taking over its cancellation means a reader who drops an image
on a mounted media story navigates the frame to `file://` and replaces the reproduction with the raw
file. Stopping an event and cancelling it are separate acts. The cancellation stays confined to
those two types: cancelling `keydown` takes away Tab and space-scroll, and for `beforeunload`
`preventDefault()` IS the unload prompt, which is the thing suppressing `beforeunload` exists to
avoid.

Why this works and why it is not scoped to the subtree **[AMENDED]**: the firewall's listener is
first in `window`'s capture queue, so `stopImmediatePropagation` halts the event before any listener
registered after it, in either phase. The ratified text credited phase precedence over a
`<svelte:window>` handler, "which Svelte registers on `window` in the bubble phase". That reasoning
is wrong, and the case it gets wrong is live in this repo: `CairnAdminShell.svelte:544` binds
`onkeydowncapture`, a capture registration on `window`. Capture listeners on one target fire in
registration order, so the firewall beats it by being registered first, which holds structurally
because a parent's instance body runs before any child template exists (the same ordering M1 relies
on). The precondition is that no window listener is already present when `ReproContext` mounts,
which is what makes "`ReproContext` owns its document" a requirement rather than a preference, and
what the capture sentinel in T5 records. Target-scoping is not available, and the design records
why: the shell's Ctrl+K handler is on `window` and fires whatever the target is, so a
`[data-cairn-picture]`-scoped check would let it through.

**Teardown, for all six listeners. [AMENDED, new]** `onDestroy(fn)` compiles to
`onMount(() => () => untrack(fn))`, so the cleanup does not exist until the mount effect runs, while
the six listeners are live from the instance body. Anything that throws in between aborts the mount
and leaves every one of them installed with no handle on them, which costs that document its
keyboard, pointer, and drag handling for good. So the removals are one named `release()`, called
both from `onDestroy` and from a `catch` around the rest of init, which rethrows: swallowing the
error would hide the story defect that caused it. Two reviewers converged on this independently, and
T10 holds it. What the `catch` does not reach is a child component throwing during template
creation, which is outside `ReproContext`'s own body; covering that would take a `<svelte:boundary>`
and a decision about what a failed story should render, which this task does not make.

**The honest cost.** This neutralizes those five types for the whole document the story is mounted
in, not only the mounted subtree. That is correct for a `/repro` page whose only job is to be a
picture, and `ReproContext` already imposes a document-wide effect today (it imports
`cairn-admin.css` unconditionally), so the precedent for reaching past the subtree exists. It is
also safe in the engine's own suite: `clickWhenPresent` is the only interaction primitive in the
whole story corpus (`src/lib/reproductions/stories/support.ts`), it calls `HTMLElement.click()`,
and scripted `.click()` and `dispatchEvent` are unaffected by both the firewall and `inert`.

**Why this replaces four component edits (R4).** It covers `EditPage`'s imperative registrations
and element-level handlers, which a per-component context flag would each need wiring for, and it
covers a future component that grows a `<svelte:window>` binding with nobody remembering to gate
it. `ListToolbar` is the standing proof that the fifth component arrives through a shared toolkit
primitive no per-story review opens.

## What stays out

Containment is scoped to the mounted subtree and to the frame's own window. It deliberately does
not:

- **Mark the `<iframe>` element itself unfocusable.** A host-document operation no engine code can
  perform (R6). The consuming route marks the embedding `<iframe>` `inert` or `tabindex="-1"`. In
  WebKit this is the only thing releasing the host focus pin, so it is required, not optional.
- **Sandbox the embed.** A red herring here: `allow-modals` does not govern `dialog.showModal()`,
  and dropping `allow-same-origin` breaks the theme sync and makes `window.frameElement`
  unreachable, disabling M1 step 4. If the route adds `sandbox` for other reasons it must keep
  `allow-same-origin`.
- **Own the page furniture.** The `noindex` robots meta tag, the `<noscript>` fallback,
  `loading="lazy"`, the theme-sync watcher writing `[data-repro-root]`, the width wrapper, the
  height refinement, and the `entries()` prerender generator all stay with the route.
- **Run poses.** The consumer runs `settle` then `pose`; `ReproContext` gains no pose hook. The
  route's acceptance criterion changes from "applies `inert` after the pose" to "applies no
  containment of its own, because the mounted content is contained at first paint."
- **Address non-focus escapes logged elsewhere.** `EditPage`'s `localStorage` preferences, the
  dormant `goto('/admin/media?uploaded=1')` at `CairnMediaLibrary.svelte:702`, and `<svelte:head>`
  writing the frame's own `document.title` are out of scope. The `goto` is worth a note in the
  route task, not a fix here.
- **Fix the adjacent ROADMAP entries.** The browser project's unserved `/repro-assets` images,
  `media/insert-panel`'s `trigger: true`, the site-wide `assets.publicBase` provider, and
  `EditPage`'s `btn-disabled` control are separate Now entries with their own triggers. None is
  owed before the route ships. Do not fold them in.

## Fidelity

**One thing changes, in seven of the 25 pictures, and it is recorded here rather than denied
(R5).**

`cairn-admin.css:519` paints `outline: 2px solid var(--color-primary)` at `2px` offset on any
`:focus-visible` element under either admin theme root. Probing across Chromium, Firefox, and
WebKit established that `showModal()` and a plain programmatic `.focus()` both flip
`:focus-visible` to true with no prior real user interaction, and that an untrusted scripted
`.click()` does not flip the heuristic back. A reproduction frame receives no real user
interaction, so every one of these frames sits in the keyboard-focus branch today and paints the
ring. Containment removes it, because nothing ends up focused.

The seven, each with the call site that focuses:

| Story | Focused by | What loses the ring |
|---|---|---|
| `editor/tidy-review` | `TidyReview.svelte:163` `showModal()` | the "Cancel review" icon button |
| `publish/pending-list` | `CairnAdminShell.svelte:678` `showModal()` | the dialog header's Close button |
| `media/lead-picture-dialog` | `MediaHeroField.svelte:202` `showModal()` | the dialog header's Close button |
| `media/delete-in-use` | `CairnMediaLibrary.svelte:305` `showModal()` | the first in-use entry's link, in the alertdialog's "These would break" list |
| `editor/details-panel` | `EditPage.svelte:1080` `detailsClose?.focus()` | the panel's Close X |
| `media/details-panel` | `CairnMediaLibrary.svelte:261` `closeButton?.focus()` | the slide-over close |
| `media/insert-panel` | `MediaInsertPopover.svelte:145` `panel?.focus()` | the whole panel container, which carries `tabindex="-1"`; the largest single delta in the set |

**The direction the change runs, which is not obvious and matters.** A real mouse user opening Tidy
or the Details panel sees no ring, because a trusted pointer interaction flips `:focus-visible`
off. So today's reproductions show the KEYBOARD face of each screen, and containment flips all seven
to the MOUSE face. That is arguably the more faithful picture, since a reader arriving at a docs
page has not tabbed into anything. It is still a change, so it is recorded, and any alt or caption
authored later against these seven must not describe a focus ring.

**Nothing else changes.**

- **Modal dialogs stay modal** (R2): `open` stays true, `:modal` matches, `::backdrop` paints,
  centering is unchanged. `inert` has no rendering consequences; its defined effects are
  hit-testing, selection, editability, find-in-page, and focusability.
- **The wrapper adds no box.** ASSUMPTION, proven by T2b plus the existing suite: `display: contents`
  is layout-neutral in all 25, including `CairnAdminShell`'s fixed sidebar and `min-h-screen`
  drawer.
- **Poses still run.** All nine posed stories drive state through `clickWhenPresent`, which calls
  `HTMLElement.click()`. Scripted `.click()` fires listeners normally inside an inert subtree and
  is not stopped by M3's firewall, which only intercepts the five window-level types. No pose uses
  `userEvent`, a real pointer, or `.focus()`.
- **CodeMirror mounts inside an inert subtree in five stories.** Content still renders; only editing
  and focus are suppressed. The existing settle assertion on `#cairn-pane-write .cm-content` is the
  regression net.

## Test plan

One new file, `src/tests/component/reproductions-containment.test.ts`, in the **browser** vitest
project (real chromium), reusing the `mountPosed` shape from `reproductions-stories.test.ts`.
Nothing here is node-safe, and inventing a `src/tests/unit/` counterpart would be ceremony.

Order matters: T0 first, because it fixes the platform assumptions the rest rests on.

**T0. Platform assumptions, DOM-only, no cairn component. [AMENDED]** Four claims the design depends
on: (a) `.click()` on a button inside an `inert` div still fires its listener; (b)
`wrapper.inert = true` before `dialog.showModal()` still moves focus into the dialog (the
escape-inertness carve-out, R1); (c) `dialog.inert = true` before `showModal()` leaves
`dialog.open === true`, `dialog.matches(':modal') === true`,
`getComputedStyle(dialog, '::backdrop').display !== 'none'`, and `document.activeElement` unmoved
(R2); (d) an inert subtree contributes zero nodes to the accessibility tree, including under
`display: contents`, so the alt text an embedding page authors is the whole accessible content of
the embed. RED proof: assert the opposite of (b) once, locally, and watch it fail; that is the only
way to see this test fail, since it describes the browser rather than the engine. Keep it
permanently: it is the tripwire if a future Chromium changes the carve-out.

(d) was added by the review gate, which measured it over CDP and found the reference page framing
containment as focus and event containment only. The DOM exposes no accessibility tree, so the
assertion goes through `cdp()` from `vitest/browser`: `Accessibility.enable`, then
`Accessibility.getFullAXTree` addressed to the frame whose URL matches the test document's, since a
browser-mode test runs in a child frame and the call answers for the top frame by default. Its
control half (the same node present before `inert` is set) is what keeps it falsifiable.

**T1. The wrapper exists and is inert.** Mount any bare story. Assert a `[data-cairn-picture]`
element exists, carries `inert`, and computes `display: contents`. RED today.

**T2. No control is focusable, and Tab does not enter.** Mount `editor/sidebar-list`. Take any
`button` inside, call `.focus()`, assert `document.activeElement !== button`. Then render a
focusable sibling outside the container, focus it, Tab, and assert the container does not contain
the active element. RED today.

**T2b. Geometry is unchanged (the `display: contents` assumption). [AMENDED]** Mount
`editor/entry-screen` at its manifest viewport; assert the shell's own root element's
`getBoundingClientRect()` width equals the viewport width and its top is `0`, and assert
`picture.getClientRects().length === 0`.

The ratified red proof, dropping the `display: contents` rule and watching the geometry assertion
fail, does not falsify: a block wrapper between `body > div` and a block child is width- and
top-neutral, so both geometry assertions hold either way. The implementer found this and both
reviewers confirmed it. `getClientRects().length === 0` is the discriminating assertion, because it
is what a block wrapper breaks, and it is what makes the assumption falsifiable. Keep both halves:
the box claim discriminates, the geometry claim is what the assumption is actually about.

**T3. `editor/tidy-review` does not steal focus and stays a real modal.** Mount through
`mountPosed`. Immediately, and again after one `requestAnimationFrame`, assert the container does
not contain the active element, and that `dialog.open`, `dialog.matches(':modal')`, `dialog.inert`,
and a painted `::backdrop` all hold. RED today. **This is also the proof for the ordering
assumption** that `ReproContext`'s instance body registers M1 before `TidyReview`'s mount `$effect`
runs: if registration happened later, the focus move would already be over, no `focusin` would
reach the handler, and the assertion fails. Say so in the test's comment so a future reader does
not weaken it.

**T4. Containment spans pose time.** Mount `publish/pending-list` through `mountPosed` (settle then
pose); same assertions as T3 against `dialog[aria-labelledby="cairn-shell-publish-all-title"]`.
Repeat for `media/delete-in-use`. RED today. This is the test that would have caught the
"apply inert after the pose resolves" design, which has no hook to hang on.

**T5. No window-level event reaches a handler.** Assert BEHAVIOR, never registration. Svelte
compiles `<svelte:window onkeydown={cond ? undefined : h}>` into an unconditional
`addEventListener` whose wrapper holds the ternary, so a spy over `window.addEventListener` records
the type regardless and cannot discriminate. Instead: after mount, register a sentinel listener of
each type on `window`, dispatch each of `keydown`, `pointerdown`, `dragover`, `drop`, and
`beforeunload`, and assert the sentinel observed none of them. Mount `media/delete-in-use` (which
stacks `CairnAdminShell`, `CairnMediaLibrary`, and `ListToolbar`) and `editor/entry-screen` (which
adds `EditPage`). RED today. This is the strictly stronger claim: what matters is that no listed
event reaches a handler, not that no listener was registered.

**[AMENDED], two cases the review gate added.** First, cancellation: dispatch a cancelable `dragover`
and a cancelable `drop` on `window` and assert `defaultPrevented` on each, then dispatch `keydown`,
`pointerdown`, and `beforeunload` and assert `defaultPrevented` is false on those. RED today, and it
is the only assertion separating the amended M3 from the ratified one. Second, the ordering
precondition: register a window **capture** sentinel BEFORE rendering `ReproContext`, mount, dispatch
all five, and assert the sentinel saw all five. The post-mount bubble-phase sentinel above registers
in the one ordering guaranteed to pass, so it cannot record the boundary; this case records it
honestly rather than contorting the code for a prettier answer. Its red proof is to assert the
phase-precedence claim (that the sentinel sees none) and watch the real observation come back.

**T6. Ctrl/Cmd+K opens nothing.** Mount any shell story, dispatch
`new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true })` on `window`, assert no
command-palette dialog is open. Repeat with `key: 'b'` and assert the drawer did not open. RED
today.

**T7. Escape does not disturb a posed state.** Mount `editor/details-panel` through `mountPosed`,
dispatch Escape on `window`, assert `[aria-label="Entry details"]:not([hidden])` still matches. RED
today: the panel closes, meaning a reader pressing Escape anywhere on the docs page changes the
picture.

**T8. The focus ring is gone, and that is the recorded change (R5). [AMENDED]** After mounting each
of the seven stories in the Fidelity table, assert that the element the uncontained render focused is
present, then that `container.querySelector(':focus-visible') === null`. RED today for all seven on
the second half. The first half is what makes the case discriminate: `:focus-visible` matches nothing
in a container that rendered nothing at all, so the null assertion alone passes against a broken
mount exactly as it passes against a contained one. The seven elements were measured against the
uncontained render, which also corrected three rows of the Fidelity table.

**T10. The listeners come off, and come off when the mount fails. [AMENDED, new]** Two cases. Mount a
story, assert the sentinel sees nothing, unmount it deliberately, assert the sentinel then sees all
five: self-contained, rather than resting on an earlier describe having mounted and been cleaned up.
Then mount a story whose `context` getter throws, assert the render throws, and assert the sentinel
still sees all five. RED today on the second: the sentinel sees nothing, because the aborted mount
leaves the whole firewall installed.

**T9. Poses still land.** Mount `media/bulk-selection` through `mountPosed`; assert its three
checkboxes are checked. This passes today and is a guard, not a RED test. Say so in the file rather
than dressing it as proof; its falsifiability comes from T0(a).

**Regression net.** `src/tests/component/reproductions-stories.test.ts` must stay green unchanged.
Its universal story contract already exercises all 25 stories through settle and pose and asserts
every marker and anchor resolves, so a containment change that breaks a pose or a rendered surface
fails there first.

## Docs and gates

**1. `docs/reference/reproductions.md`.** The opening paragraph currently states that the engine
mounts the component as-is, that "the render carries no `inert` attribute and no focus containment
of its own", and that containment is "the consuming site's obligation, not something this subpath
does for it." That is now inverted. Replace with prose stating: the engine mounts the real component
and contains it; the mounted subtree is inert, a modal dialog a story opens is marked inert as it
opens, and window-level keyboard, pointer, drag, and unload events are stopped before any handler
sees them; containment holds from first paint and does not depend on a pose, which a consumer runs.
**[AMENDED]** The same paragraph also discloses that an inert subtree reaches no assistive
technology, so the alt text a page authors is the whole accessible content of the embed. Then state
what stays with the site: a frame that loads and focuses a control takes the focus a reader had, in
every engine, and no host-side attribute prevents it (`tabindex="-1"` takes the `<iframe>` out of the
host's tab order, `inert` also blocks hit-testing on it), so the embedding page records
`document.activeElement` before the frame loads and restores it after. The `loading` attribute, a
`sandbox` value if it wants one (keeping `allow-same-origin`), the `noindex` meta tag, and the
no-JavaScript fallback are the site's too. The `ReproContext` section of the same page carries the
mounting constraint: the event firewall covers the whole document, so mount it only in a document
dedicated to one reproduction, never beside a live admin surface, where it would take away every
keyboard shortcut, every pointer-dismissed control, and the unsaved-work guard `beforeunload`
carries.

Vale runs Google over this arm. Keep the register the page already holds.

**2. `ReproContext.svelte`'s `@component` block.** The block makes no containment claim today, so
this is an addition rather than a correction. State that the wrapper contains what it mounts, name
the three mechanisms in one sentence each, say that containment registers before any child exists
and does not depend on a pose. **[AMENDED]** Say plainly where containment does not stop at the
document boundary: the focus listener calls `blur()` on `window.frameElement`, which is a reach into
the host's document, and the event firewall covers the whole document the story mounts in rather
than the wrapper. Carry the mounting constraint and the amended R6 focus statement here too. Follow
`svelte-conventions`. Any new TypeScript symbol needs TSDoc; `check:comments` runs ESLint over
`src/lib` and the em dash is banned in comments.

**3. `docs/internal/record/repro-story-audit.md`.** Append the seven-row focus-ring table from
Fidelity, with the direction of the flip (keyboard face to mouse face) and the instruction that alt
and caption text authored later against those seven must not describe a focus ring. This is Pass 1b
decision 4's inverse made concrete.

**4. `CHANGELOG.md`, under `## Unreleased`.** The reproduction seam is the first `### Added` bullet
in this same unpublished window, so fold containment into that bullet rather than adding a
`### Fixed` bullet for a subsystem that has never shipped. **[AMENDED]** Note the two things that
stay with the site because no code inside the frame can do them: a screen reader reaches none of an
inert subtree, so the authored alt text is the whole accessible content of the embed, and the
embedding page records and restores `document.activeElement` around the frame's load. Note the
mounting constraint in the same bullet. `Consumers must:` nothing. Leave `package.json` untouched; no release is warranted.

**5. Gates.** `npm run check` at 0/0 and `npm test` at exit 0 are the bar. Additionally run and
expect no diff: `check:surface`, `check:reference`, `check:reference:signatures`. Run
`check:comments`. `check:visuals` is unaffected (it validates fences, it renders nothing) and needs
no growth. No new gate script is owed: the browser test file is the only mechanism in this repo
that can fail when containment regresses, and it is falsifiable by construction.

**6. OWED BY THIS PASS, LIVES IN `~/Projects/cairn-pub`** (branch `pass-d-docs-tracks`), three edits
**[AMENDED, was two]** to `docs/superpowers/specs/2026-08-15-live-reproduction-seam-design.md`. All
three are made by the Pass 2 route task, not here.

- The route's responsibility clause "marks the mounted content `inert` after any pose completes" is
  now false in both halves: the engine does it, and it does not wait for a pose. Replace with: the
  route mounts one story, carries the `noindex` meta tag and the `<noscript>` fallback, owns the
  theme-sync watcher, the width wrapper, and the `entries()` generator, and marks the embedding
  `<iframe>` element itself `inert`. It applies no containment to the mounted content. Gate 4 keeps
  its form; only its target moves.
- The gate-1 bullet "`width` one of the two listed values" is stale twice over: the spec's own body
  now lists three pinned widths, and the implemented rule never enumerated them. Replace with
  "`width` either absent or a width the fence's own story declares a height for in its manifest
  entry". Stating the mechanism instead of a count is what stops it rotting again on the next
  pinned width.
- **[AMENDED, new]** The spec mandates `loading="lazy"` on the embed, and R6 as amended shows that a
  lazily loaded self-focusing story destroys a reader's focus with no host-side attribute able to
  stop it. The spec needs the matching obligation: the embed records `document.activeElement` before
  the frame loads and restores it after. R6 carries the ruling that settles it, so the route task
  writes the obligation rather than reopening the question.

## Risks

1. **M1 is a repair, not a prevention.** The native focus move happens and is reversed in the same
   script turn. Two lenses verified no intermediate state is observable synchronously in Chromium,
   but no normative ordering guarantee between the dialog focusing steps and `focusin` dispatch was
   found. If a browser ever dispatches `focusin` asynchronously, a reader sees a flash.
   **Detection:** T3 and T4 assert synchronously, so a browser change fails CI rather than a
   reader's page; T0(b) narrows the diagnosis to the platform.
2. **A lazily loaded self-focusing reproduction steals a reader's focus, and no attribute on the
   frame stops it. [AMENDED]** A reader with focus in the docs page's search box when a lazy iframe
   loads still loses it, in all three engines and under a plain, `tabindex="-1"`, and `inert`
   `<iframe>` alike (R6 carries the measured table). The ratified text said host-side `inert`
   prevents the scenario; it does not, so the mitigation moved rather than shrank. **Detection:**
   none available from inside the engine, by construction. The embedding page records
   `document.activeElement` before the frame loads and restores it after (ruled 2026-08-18), which
   is the amended acceptance criterion for the route task.
3. **M3's firewall is document-wide within the frame.** Correct for a picture page, and safe in the
   engine's suite (verified: the corpus's only interaction primitive is `.click()`). A future test
   or pose that needs a real keyboard event inside a mounted story would break.
   **Detection:** that test fails loudly and immediately; the fix is to reach past `ReproContext`,
   not to weaken the firewall.
4. **`display: contents` shifts a layout somewhere in the 25.** The wrapper is new to the `shell`
   and auth branches. **Detection:** T2b plus the existing story-mount suite, and cairn-pub's own
   gate 4 before publication.
5. **A pose starts to depend on focus or a real pointer.** Poses use `.click()` today, so inert and
   the firewall are both invisible to them. **Detection:** the story-mount suite fails loudly (the
   pose's `waitFor` throws with its own named message). Worth one sentence in story-authoring
   guidance: a pose drives state with `clickWhenPresent`, never with a real pointer.
6. **CodeMirror behaves differently inside an inert subtree.** Five stories mount it.
   **Detection:** the existing settle assertion on `#cairn-pane-write .cm-content`.
