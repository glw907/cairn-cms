# Sidebar collapse and zen-mode prior art

Research for cairn-cms's `/admin` zen-toggle jump: the content column's margin snaps
while the fixed sidebar slides. Three fixes were on the table: (a) transition the margin,
(b) a grid shell whose `grid-template-columns` transitions, (c) snap the layout and
fade the chrome. Revision 2 adds a fourth, `interpolate-size` with `calc-size()`, and
measures cairn's own toggle.

The feel reference for cairn's admin is web-native: IBM Carbon first, with Atlassian as
the tiebreaker where Carbon is silent, plus the industry-default components such as
shadcn's sidebar. The libadwaita and Material entries below are comparison data, not the
reference cairn matches.

## Revision 2 (2026-09-13)

An adversarial review refuted two readings this document's Verdict rested on. What changed:

- **The shadcn reading is corrected.** shadcn animates `width` and `left` at 200ms
  `ease-linear`, which is layout-thread work. Revision 1's Verdict recommended
  "shadcn's spacer-plus-fixed pattern" as a way to stay off the layout thread. It is not one.
- **The VS Code claim is dropped.** VS Code ships live CSS transitions on view chrome and a
  `workbench.reduceMotion` setting. It is not a snap, so option (c) loses its only
  layout-half precedent.
- **"Snap the layout, fade the chrome" is labeled as this document's own proposal**, with
  the five costs it carries, rather than a pattern with two half-precedents.
- **The performance claim is split in two.** "Layout animation is risky under main-thread
  load" and "this 224px transition drops frames" are separate claims. The first now cites
  web.dev's animations guidance. The second is now measured, and it is false here.
- **A fourth option is added**: `interpolate-size: allow-keywords` with `calc-size()`,
  which DaisyUI already ships inside cairn's own built admin sheet.
- **Un-surveyed apps are marked as not publicly documented**, replacing an asserted
  "library consensus" the survey never measured.
- **Option (c) is costed honestly**, including the `{#if}` to `allow-discrete` rewrite and
  the collision with the blanket reduced-motion block.
- **A new section, "cairn's own zen toggle, measured"**, traces the real subtree.
- **The Verdict is rewritten as a decision**, not a recommendation, against the Carbon
  motion tokens.

## 1. shadcn/ui Sidebar (React)

Source: `sidebar.tsx` in the shadcn/ui registry.

- Transitions three separate elements, each with its own Tailwind arbitrary-property
  class, all `duration-200 ease-linear`:
  - the width-reserving gap element: `transition-[width]`
  - the fixed sidebar container: `transition-[left,right,width]`
  - the group label: `transition-[margin,opacity]`
  - group/menu action buttons: `transition-transform` only
- Content reflow: the sidebar is `position: fixed`, positioned by `left`/`right`.
  A separate zero-content "gap" div with `width: var(--sidebar-width)` sits in
  normal flow next to the main content and its width animates in lockstep, which is
  what pushes the content over. This is functionally a fixed-position sidebar plus
  an animated spacer, not a content-column margin and not a CSS grid track.
- **Thread: layout, not compositor.** `width`, `left`, and `right` all force layout on
  every frame. Only the rail handle uses `translate-x`. The most-copied admin sidebar on
  the web animates layout properties for 200ms and ships that way. Any reading of this
  component as a transform-based, compositor-only pattern is wrong.
- State persistence: a cookie, `SIDEBAR_COOKIE_NAME = "sidebar_state"`,
  `SIDEBAR_COOKIE_MAX_AGE = 60 * 60 * 24 * 7` (7 days), set via
  `document.cookie` on toggle.
- Keyboard shortcut: `SIDEBAR_KEYBOARD_SHORTCUT = "b"`, bound to Cmd/Ctrl+B.
- Reduced motion: no `prefers-reduced-motion` handling anywhere in the component.
  Duration and easing are hardcoded constants regardless of the user's OS setting.

Sources:
- https://ui.shadcn.com/docs/components/sidebar
- https://raw.githubusercontent.com/shadcn-ui/ui/main/apps/v4/registry/new-york-v4/ui/sidebar.tsx

## 2. Mantine AppShell, Ant Design Sider, Chakra/Ark, Radix, Material web

**Mantine AppShell** (`Navbar`/`Aside` collapse): exposes
`transitionDuration` and `transitionTimingFunction` props on `<AppShell>` itself,
backed by CSS custom properties (`--app-shell-transition-duration`,
`--app-shell-transition-timing-function`). Default community pattern is a plain
`transition: width 0.3s` (or `min-width`) on the navbar element; Mantine does not
publish a single canonical duration in the docs excerpt available, it is left as a
consumer-configurable prop. No dedicated reduced-motion handling is documented at
the component level (Mantine's own global `respectReducedMotion` toggle is
separate and off by default per-component).
Source: https://github.com/mantinedev/mantine/blob/master/packages/@mantine/core/src/components/AppShell/AppShell.tsx,
https://mantine.dev/core/app-shell/

**Ant Design `Layout.Sider`**: `Sider.tsx` computes `flex`/`maxWidth`/`minWidth`/`width`
inline per collapsed state, and the actual transition timing lives in the
component's compiled stylesheet, not the component logic (`useStyle(prefixCls)`),
so it is not visible from the component source alone. A code comment in the file
flags "Fix width transition bug in IE11," confirming width itself is the animated
property, historically a source of cross-browser pain. The trigger bar separately
transitions `background .3s ease`.
Source: https://github.com/ant-design/ant-design/blob/master/components/layout/Sider.tsx

**Chakra UI / Ark UI**: neither ships a dedicated sidebar/collapse primitive. The
documented pattern is composing `Box` (or Ark's headless primitives) with a
`Drawer`/`useDisclosure`-style show-hide, so consumers build their own
transition, typically width or transform, with no house convention to survey.
Source: https://github.com/chakra-ui/chakra-ui/discussions/10454

**Radix UI Primitives**: no sidebar or navigation-rail primitive exists. Radix
ships `Collapsible` (a generic panel expand/collapse) as the closest building
block; a sidebar built on it inherits whatever transition the consumer writes.
Source: https://www.radix-ui.com/primitives/docs/components/collapsible,
https://github.com/radix-ui/primitives/discussions/2748

**Material 3 navigation drawer / rail (web)**: Material's motion system assigns
drawer expand/collapse to its "emphasized" easing pair rather than a flat
linear/ease curve: an emphasized-decelerate curve on enter (fast start, gentle
settle) and emphasized-accelerate on exit (slow start, quick exit), with standard
easing reserved for smaller, non-hero transitions. Duration scales with the
motion token set (Material's published short/medium/long/extra-long buckets run
roughly 50ms to 700ms; a drawer-scale transition sits in the medium range,
300 to 400ms per Material's dialog/drawer guidance). Material does not publish a
literal `width` versus `transform` mandate for the web implementation in the pages
surveyed; the token system governs timing and easing, and implementations such as
Material Web Components are left to choose the animated property.
Sources: https://m3.material.io/styles/motion/easing-and-duration,
https://m3.material.io/components/navigation-drawer/specs

## 3. libadwaita AdwOverlaySplitView / AdwNavigationSplitView

Comparison data only. These are GTK4 desktop widgets, and cairn's reference is web-native.

Per the adaptive-layouts documentation: `AdwNavigationSplitView` swaps to a full
`AdwNavigationView` (push/pop stack, slide transition) when collapsed, so what
animates is the navigation-view's own slide-in/out page transition, not a bare
width or opacity tween. `AdwOverlaySplitView` instead overlays the sidebar on top
of the content when collapsed, sliding it in and out as an overlay panel (the
`:collapsed` and `:show-sidebar` properties drive this); its behavior is
explicitly described as similar to the older `AdwFlap`, which animated via a
slide/reveal transition, not a discrete display toggle. GTK animations of this
kind run through the toolkit's own transition clock and universally respect the
desktop's `gtk-enable-animations` setting, and by extension the
`org.gnome.desktop.interface` reduced-motion preference, which is GNOME's
standing accessibility convention rather than something restated per-widget in
these two classes' docs. Exact duration and easing constants were not confirmed from
source in this pass (the GNOME GitLab source fetch failed to load); the docs
confirm the animated quantity (position/overlay reveal, page-stack slide) but not
the numeric timing.
Sources: https://gnome.pages.gitlab.gnome.org/libadwaita/doc/main/adaptive-layouts.html,
https://gnome.pages.gitlab.gnome.org/libadwaita/doc/1.5/class.OverlaySplitView.html,
https://gnome.pages.gitlab.gnome.org/libadwaita/doc/main/class.NavigationSplitView.html

## 4. Editor zen/focus modes

- **VS Code Zen Mode**: hides the activity bar, side bar, status bar, tabs, and
  optionally centers the editor (`zenMode.centerLayout`), driven by
  `src/vs/workbench/browser/layout.ts`. **VS Code is not a snap.** Its workbench
  ships live CSS transitions on view chrome, including a `0.2s max-width ease-out`
  in `views.css`, plus transitions in `sash.css`, `tree.css`, `minimap.css`, and
  `folding.css`. The `workbench.reduceMotion` setting (default `auto`) exists
  because that chrome is animated by default, and microsoft/vscode#175990 is the
  issue asking those transitions to respect the OS preference. Revision 1 of this
  document hedged this reading in the body, hardened it in the comparison table,
  and stated it flatly in the Verdict. It is withdrawn.
  Sources: https://github.com/microsoft/vscode/blob/main/src/vs/workbench/browser/layout.ts,
  https://github.com/microsoft/vscode/issues/175990,
  https://code.visualstudio.com/docs/getstarted/userinterface
- **Obsidian**: no built-in animated sidebar collapse; the CSS-snippet community
  (Obsidian is Electron and CSS-themable) treats animating the sidebar as a
  user-added enhancement, not a shipped default, implying the stock toggle snaps.
  Source: https://forum.obsidian.md/t/change-left-sidebar-width/80126
- **iA Writer / Typora Focus Mode**: a categorically different feature from a
  sidebar toggle. Both fade non-active paragraphs, lines, or sentences to gray while
  the current block stays full-contrast. This is an opacity fade on text blocks,
  not a layout collapse, and both apps' "no sidebar" writing mode is the default
  static state rather than an animated transition into it.
  Sources: https://ia.net/writer/support/editor/focus-mode/focus-mode-windows,
  https://support.typora.io/Focus-and-Typewriter-Mode/
- **Notion**: the sidebar is `position: absolute` and transformed out of flow, so the
  content area does not reflow via a margin or grid change; the container's
  transform-based slide keeps the animation off the layout thread. Independent
  reverse-engineering also flags Notion's sidebar for janky performance, blamed on
  four animated `box-shadow`s riding alongside the transform, not on the
  transform itself.
  Source: https://medium.com/@quickmasum/ui-breakdown-of-notions-sidebar-2121364ec78d
- **Linear**: ships a collapsible sidebar (`[` shortcut). Linear publishes no
  implementation detail. The one independent benchmark that includes it reports
  Linear animating `left`, a layout-thread property, and holding up comparatively
  well, which cuts against reading Linear as a transform exemplar.
  Source: https://linear.app/changelog/unpublished-collapsible-sidebar
- **Not publicly documented**: Slack, Figma, Discord, Gmail, Google Docs, and
  github.com. None publishes its sidebar implementation, and no citable source ties
  a specific animated property to any of their shipped code. This survey makes no
  claim about them in either direction, and no "industry consensus" claim in this
  document rests on them.

## 5. Published guidance on collapse-animate versus fade

### `grid-template-columns` is animatable and interoperable

Supported in Chrome/Edge 107+, Firefox 66+, Safari 16.1+ (web.dev's framing: grid
layouts "can smoothly transition between states, instead of snapping at the halfway
point"). Neither web.dev's article nor CSS-Tricks' companion piece makes a
performance claim, and grid track interpolation is a layout-thread operation like
`width`. Practical caveat repeated across sources: interpolating grid templates
requires matching track counts between start and end states, so `1fr 1fr 0fr` to
`1fr 1fr 1fr`, never `1fr 1fr` to `1fr 1fr 1fr`.
Sources: https://web.dev/articles/css-animated-grid-layouts,
https://css-tricks.com/animating-css-grid-how-to-examples/

### Two separate claims about layout-thread animation

Revision 1 merged these. They need separating, because only the first is established.

**Claim one, established: layout-thread animation is a real risk under main-thread
load.** web.dev's animations guide is the canonical citation, and it is shipped
tooling rather than one benchmark. Its own DevTools comparison reports the
`top`/`left` example dropping 50% of frames where the `transform` example drops 1%,
and its rule is to avoid any property that triggers layout or paint unless it is
necessary. Chrome's Lighthouse ships this as the "Avoid non-composited animations"
audit. Note that html5rocks is retired and redirects to web.dev, so citations should
point at web.dev.
Sources: https://web.dev/articles/animations-guide,
https://web.dev/articles/stick-to-compositor-only-properties-and-manage-layer-count

**Claim two, not established by any source: this specific 224px margin transition on
this specific subtree drops frames.** Revision 1 promoted one practitioner benchmark
(joshuawootonn.com/sidebar-animation-performance) to "the single most direct,
citable, performance argument" and let its Verdict turn on it. That benchmark is one
author on one M1 Mac mini under artificial CPU load, and its own conclusion is more
nuanced than revision 1 reported: the animation mechanism mattered as much as the
property. Notion, held up in revision 1 as the transform exemplar, drives its slide
with `requestAnimationFrame` and jags anyway. Linear animates `left`, a layout-thread
property, and stayed comparatively stable. Claim two is now measured directly, in
"cairn's own zen toggle, measured" below.
Source: https://www.joshuawootonn.com/sidebar-animation-performance

### Carbon's position on this class of change

Carbon's motion overview states that duration should be dynamic with the size of the
change: "the larger the change in distance (traveled) or size (scaling) of the
element, the longer the animation takes." A 224px column shift is a large-distance
move by that rule, which puts it at `moderate-02` (240ms) or `slow-01` (400ms) rather
than a micro-interaction duration. Carbon's productive motion set is the reference
for cairn's admin register.
Source: https://carbondesignsystem.com/elements/motion/overview/

Material's own guidance agrees that this class of change should animate rather than
snap when frame budget allows, assigning drawer expand and collapse to its emphasized
easing pair. Comparison data only.
Source: https://m3.material.io/styles/motion/easing-and-duration

### Reduced motion

None of the surveyed web component libraries (shadcn, Mantine, Ant Design) builds in
automatic `prefers-reduced-motion` handling for the sidebar transition. Carbon's
overview asks for alternatives to motion but publishes no machine-checkable rule, so
the tiebreaker is Atlassian, which states plainly: "when reduced motion is active,
motion is off and instant." libadwaita is the one surveyed platform with a systemic
toolkit-level gate (`gtk-enable-animations`) that every animated widget inherits
without per-component opt-in, and it is comparison data for cairn rather than the
reference.
Sources: https://carbondesignsystem.com/elements/motion/overview/,
https://atlassian.design/foundations/motion

### A fourth technique: `interpolate-size` with `calc-size()`

`interpolate-size: allow-keywords` makes intrinsic sizing keywords (`auto`,
`min-content`, `max-content`, `fit-content`) interpolable, so a panel can transition
between a fixed size and `auto` without a JavaScript measurement step.

This is already inside cairn. DaisyUI compiles it into the built admin sheet at
`dist/components/cairn-admin.css:5244`, on `.collapse ::details-content`, beside a
seven-property `allow-discrete` transition, inside
`@media (prefers-reduced-motion: no-preference)`. Cairn ships the technique today
without having surveyed it.

Support is Chromium 129+ only: no Firefox, no Safari as of this pass. The degradation
is a snap, which is the graceful shape, and the same shape option (c) proposes as a
default. Revision 1 omitted a technique compiled into the product's own stylesheet.
Source: https://developer.mozilla.org/en-US/docs/Web/CSS/interpolate-size

## Comparison table

| Implementation | Mechanism | Property transitioned | Duration | Easing | Reduced motion | Notes |
|---|---|---|---|---|---|---|
| shadcn/ui Sidebar | fixed sidebar + animated spacer div | `width`, `left`/`right`, `margin`/`opacity` (separate elements) | 200ms | `ease-linear` | none | layout-thread, not compositor; cookie-persisted, Cmd/Ctrl+B |
| Mantine AppShell | flow-positioned navbar | `width` (consumer CSS) or shell-level prop | consumer-set, no fixed default | consumer-set | not built in | duration and easing exposed as props and CSS vars |
| Ant Design Sider | flow-positioned aside | `width` (inline style + stylesheet) | not exposed in source (theme CSS) | not exposed in source | none documented | historic IE11 width-transition bug noted in source |
| Chakra / Ark UI | no shipped sidebar | consumer's choice | n/a | n/a | n/a | composed from Box/Drawer/Collapsible |
| Radix Primitives | no shipped sidebar | consumer's choice via `Collapsible` | n/a | n/a | n/a | lowest-level building block only |
| Material 3 drawer/rail (web) | token-driven, property left to implementation | not mandated | ~medium bucket, roughly 300 to 400ms | emphasized decelerate (enter), accelerate (exit) | not addressed at component level | comparison data; this class of change should animate |
| libadwaita Overlay/NavigationSplitView | overlay reveal or navigation-stack slide | position/overlay reveal, page-stack slide | not confirmed from source this pass | not confirmed from source this pass | yes, systemic via `gtk-enable-animations` | comparison data, desktop toolkit |
| VS Code workbench (incl. Zen Mode) | class-driven show/hide over animated chrome | `max-width` and others in `views.css`, `sash.css`, `tree.css` | 0.2s on the `views.css` case | `ease-out` on that case | `workbench.reduceMotion`, default `auto` | not a snap; vscode#175990 tracks OS-preference support |
| Obsidian sidebar | class toggle | none by default | n/a | n/a | n/a | animation is a community CSS snippet, not stock |
| iA Writer / Typora Focus Mode | text-block dimming | `opacity` on inactive paragraphs | not specified | not specified | not addressed | not a layout collapse; a different problem shape |
| Notion sidebar | transform-based overlay, out of flow | `transform` (plus box-shadow, flagged as the jank source) | not confirmed | not confirmed | not addressed | content is covered and uncovered, never reflowed |
| Linear sidebar | collapsible, `[` shortcut | `left`, per the one independent benchmark | not confirmed | not confirmed | not addressed | layout-thread, and comparatively stable in that benchmark |
| Slack, Figma, Discord, Gmail, Google Docs, github.com | not publicly documented | not publicly documented | n/a | n/a | n/a | no citable source; this survey makes no claim |

## The case against "snap the layout, fade the chrome"

Option (c) is **this document's own proposal**, not a surveyed pattern. Revision 1
presented VS Code and iA Writer as "the two closest analogues, each covering half the
pattern." One of them does not do its half (VS Code animates), and revision 1 itself
calls the other "a categorically different feature." Two half-precedents for
different halves are not a precedent. Independent checks of Carbon, Material 3, Apple
HIG, Fluent, and Atlassian surfaced no documented instant-layout-plus-timed-chrome-fade
pattern anywhere.

What a reader loses when 224px jumps in one frame while chrome fades over 200ms:

1. **Object permanence.** The sidebar is a navigational surface. An instant reflow
   gives no cue where it went, so the return trip has no reversal to read. Continuity
   is what every surveyed source treats the motion as buying.
2. **The two halves disagree with each other.** For roughly 200ms the reader sees
   ghost chrome floating over already-reflowed content. That is the worst reading of
   both moves, which is plausibly why no shipped product in this survey does it.
3. **Reading position.** The editor is a text column. Changing its measure in one
   frame moves every line break at once, and the eye loses its place in a way a
   200ms ramp does not cause. This is the cairn-specific cost, and it is the whole
   point of a zen mode.
4. **cairn's zen is an `{#if}`, not an opacity.** `CairnAdminShell.svelte:701` removes
   the topbar band from the DOM. Fading it means keeping it mounted, which needs
   `transition-behavior: allow-discrete` plus `@starting-style` for the return trip.
   That is Chromium-solid with a known Firefox gap (mdn/browser-compat-data#26155).
   Option (c) buys a cross-browser caveat to avoid a width transition shadcn ships
   unbothered.
5. **The snap is already the reduced-motion answer.**
   `src/lib/components/cairn-admin.css:1115-1124` collapses every admin duration to
   0.01ms under `prefers-reduced-motion: reduce`. Choosing snap as the default spends
   that affordance on everyone and leaves the reduced-motion path nothing distinct to
   say.

## cairn's own zen toggle, measured

Revision 1 surveyed nine implementations and measured none. This section traces the
actual subtree.

**Method.** Playwright 1.62.1 Chromium 151.0.7922.34, headless, one 1440x900 context
per run, against the showcase dev server on port 5602 under `CAIRN_DEV_BACKEND=1`,
on the edit page `/admin/posts/2026-06-hello`. Zen is toggled with its own keyboard
binding, Ctrl+Shift+period. Each run enters zen, then leaves it, and each variant runs
three times. During each 700ms toggle window the page collects `requestAnimationFrame`
timestamps, `PerformanceObserver` long-task entries, and the computed `margin-left` of
`.drawer-content`; `Performance.getMetrics` over CDP brackets the window for
`LayoutCount`, `RecalcStyleCount`, and `LayoutDuration`.

**Variants.**

1. `current`: the code as it ships. The margin snaps, the DaisyUI sidebar slides.
2. `marginTransition`: option (a), injected with `page.addStyleTag` as
   `.drawer-content { transition: margin-left 200ms linear !important; }`.
3. `allSnap`: an approximation of option (c)'s layout half, injected as a blanket
   `transition-duration: 0s !important; animation-duration: 0s !important`, which
   disables the sidebar slide along with everything else.

All three variants were produced without editing source. `marginSteps` counts distinct
computed `margin-left` values observed during the window, and it is the check that the
injected transition actually ran: 2 means the margin snapped between 224px and 0px,
and 10 or more means it interpolated.

**Unthrottled, median of three runs per direction.**

| Variant | Dir | rAF frames in 700ms | Intervals >16.7ms | >33ms | Worst interval | marginSteps | Long tasks | Layouts | Style recalcs | Total layout ms |
|---|---|---|---|---|---|---|---|---|---|---|
| current | enter | 42 | 14 | 4 | 50ms | 2 | 0 | 1 | 24 | 0.004 |
| current | exit | 90 | 9 | 1 | 100ms | 2 | 1 | 2 | 22 | 0.005 |
| marginTransition | enter | 40 | 13 | 7 | 50ms | 10 | 1 | 10 | 22 | 0.008 |
| marginTransition | exit | 46 | 7 | 1 | 117ms | 10 | 1 | 11 | 22 | 0.009 |
| allSnap | enter | 45 | 10 | 1 | 50ms | 2 | 0 | 1 | 3 | 0.004 |
| allSnap | exit | 88 | 10 | 1 | 100ms | 2 | 1 | 2 | 2 | 0.004 |

**4x CPU throttle (`Emulation.setCPUThrottlingRate`), median of three.**

| Variant | Dir | rAF frames | >16.7ms | >33ms | Worst interval | marginSteps | Long tasks | Layouts | Total layout ms |
|---|---|---|---|---|---|---|---|---|---|
| current | enter | 32 | 20 | 9 | 1983ms | 2 | 2 | 1 | 0.148 |
| current | exit | 42 | 17 | 3 | 600ms | 2 | 3 | 2 | 0.025 |
| marginTransition | enter | 28 | 15 | 8 | 2500ms | 6 | 4 | 6 | 0.319 |
| marginTransition | exit | 21 | 13 | 3 | 600ms | 2 | 4 | 5 | 0.036 |
| allSnap | enter | 43 | 19 | 3 | 2767ms | 2 | 2 | 1 | 0.174 |
| allSnap | exit | 46 | 16 | 3 | 667ms | 2 | 3 | 2 | 0.018 |

**What the numbers say.**

- **The margin transition runs, and it costs about ten layouts.** `marginSteps` rises
  from 2 to 10 and `LayoutCount` rises from 1 to 10 or 11, which is one layout per
  animated frame over 200ms, exactly as expected. Total `LayoutDuration` across the
  whole 700ms window rises from 0.004ms to 0.009ms.
- **Frame pacing does not separate the three variants.** The over-16.7ms and over-33ms
  counts overlap across all three, in both directions, throttled and not.
- **The frame-interval metric is weak here, and the document should not lean on it.**
  The same 700ms window returned 40 to 46 frames in some runs and 88 to 92 in others,
  which means headless Chromium's own frame clock varied between runs rather than the
  page dropping frames. Treat the over-threshold counts as noise floor, and treat
  `LayoutCount` and `LayoutDuration` as the reliable signal.
- **The large throttled spikes belong to the editor, not the transition.** Each
  variant, `allSnap` included, produced one run whose enter gesture coincided with a
  1.8 to 2.8 second long task. A variant where nothing at all animates produced the
  single worst interval measured (2767ms). That work is the edit page's own
  (CodeMirror, hydration, the dev server's module graph), and no layout transition
  causes it.

**Load conditions, stated plainly.** 11th Gen Intel Core i7-1185G7, 8 threads, 16GB,
Fedora 44, `uptime` load average 8.70 across the measurement, which is a fully
saturated machine. A Vite dev server, not a production build. Headless Chromium, so no
compositor is driving a real display. The result should be read as "no measurable cost
was found for one 224px margin transition on this subtree, even on a saturated
machine," never as "layout animation is free." web.dev's guidance stands for animations
that are larger, longer, or more numerous than this one.

## Verdict

**Decision (Geoff, 2026-09-13): cairn's admin animates the content offset, the way the
industry default does, and carries exactly one documented exception in the motion
ruleset for it.**

The evidence supports it on three legs. shadcn/ui, the most-copied admin sidebar on
the web, animates `width` and `left` for 200ms and ships that way (§1), so the
industry default is a layout-property transition, not a compositor-only trick.
Carbon's own guidance says a change of this distance should animate and should take
longer than a micro-interaction (§5). And the measurement found no frame cost for
cairn's own case: the transition adds about ten layouts totalling under 0.01ms of
layout work, and no variant is distinguishable from another in frame pacing, even
under a 4x CPU throttle on a saturated machine. Option (c), snap the layout and fade
the chrome, is withdrawn: it has no precedent, it is this document's own invention, it
carries five costs the survey did not weigh, and the one claim that motivated it
(that the transition would jank) is now measured false.

### The exception's shape

- **Property and element.** The drawer content's `margin-left`, on
  `CairnAdminShell.svelte`'s `.drawer-content` element, or whichever single offset
  property the shell ends up on if the shell moves to a grid track or a spacer.
  One element, one property, named in the ruleset.
- **Duration.** The shift token, aliasing Carbon's `duration-moderate-02` (240ms) per
  Carbon's distance rule, since a 224px column shift is a large-distance move and not
  a micro-interaction. `duration-slow-01` (400ms) is the fallback only if 240ms reads
  hurried against the sidebar's own slide.
- **Easing.** Carbon's productive entrance curve, `cubic-bezier(0, 0, 0.38, 0.9)`, on
  the way in. Exit one band faster on Carbon's productive exit curve,
  `cubic-bezier(0.2, 0, 1, 0.9)`, so leaving zen resolves quicker than entering it,
  which is Carbon's entrance and exit pairing.
- **Reduced motion: snap.** Under `prefers-reduced-motion: reduce` the offset takes
  the blanket admin block at `cairn-admin.css:1115-1124` like every other admin
  transition, so it snaps. Carbon asks for an alternative without publishing a
  machine-checkable rule, and Atlassian's tiebreaker is "off and instant."

### How the ruleset enforces it

The property-allowlist rule (document A's rule 2) bans layout properties outright,
`margin` included. The exception is an allowlist entry **scoped to that one selector
and that one property**, never a global relaxation of the snap list. Any other element
that transitions `margin`, `width`, `height`, `top`, `left`, `right`, `bottom`,
`padding`, or `font-size` still fails, on the engine's own tree and on a consumer's
custom screens alike. The entry ships with a fixture proving both halves: the shell's
own offset passes, and a second element transitioning the same property fails.

### The other options, recorded

- **(a) transition the offset** is the decision above. shadcn is the primary example;
  Ant Design Sider is a second, with a long-lived cross-browser transition bug noted
  in its own source as a cautionary data point.
- **(b) grid shell with a `grid-template-columns` transition** is not chosen. No
  production sidebar surveyed uses it, the two strongest citations are technique
  demonstrations rather than shipped sidebars, and it carries the matching-track-count
  caveat. It is the same performance class as (a) with less prior art.
- **(c) snap the layout, fade the chrome** is withdrawn, per the case above.
- **(d) `interpolate-size` with `calc-size()`** is not chosen for the shell, since it
  is Chromium-only and the shell's offset is a fixed 224px rather than an intrinsic
  keyword. It stays on the table for any future collapse whose target size is `auto`,
  and cairn already ships it transitively through DaisyUI.
