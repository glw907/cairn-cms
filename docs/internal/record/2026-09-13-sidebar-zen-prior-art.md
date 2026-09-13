# Sidebar collapse and zen-mode prior art

Research for cairn-cms's `/admin` zen-toggle jump: the content column's margin snaps
while the fixed sidebar slides. Three fixes on the table: (a) transition the margin,
(b) a grid shell whose `grid-template-columns` transitions, (c) snap the layout and
fade the chrome.

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
- State persistence: a cookie, `SIDEBAR_COOKIE_NAME = "sidebar_state"`,
  `SIDEBAR_COOKIE_MAX_AGE = 60 * 60 * 24 * 7` (7 days), set via
  `document.cookie` on toggle.
- Keyboard shortcut: `SIDEBAR_KEYBOARD_SHORTCUT = "b"`, bound to Cmd/Ctrl+B.
- Reduced motion: no `prefers-reduced-motion` handling anywhere in the component.
  Duration and easing are hardcoded constants regardless of the user's OS setting.
- Mechanism: width plus fixed-position offset, not grid tracks.

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
`Drawer`/`useDisclosure`-style show-hide, i.e., consumers build their own
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
literal `width` vs `transform` mandate for the web implementation in the pages
surveyed; the token system governs timing/easing, and implementations (e.g.
Material Web Components) are left to choose the animated property.
Sources: https://m3.material.io/styles/motion/easing-and-duration,
https://m3.material.io/components/navigation-drawer/specs

## 3. libadwaita AdwOverlaySplitView / AdwNavigationSplitView

Both are GTK4/libadwaita adaptive-layout widgets, not web components. Per the
adaptive-layouts documentation: `AdwNavigationSplitView` swaps to a full
`AdwNavigationView` (push/pop stack, slide transition) when collapsed, so what
animates is the navigation-view's own slide-in/out page transition, not a bare
width or opacity tween. `AdwOverlaySplitView` instead overlays the sidebar on top
of the content when collapsed, sliding it in/out as an overlay panel (the
`:collapsed` and `:show-sidebar` properties drive this); its behavior is
explicitly described as similar to the older `AdwFlap`, which animated via a
slide/reveal transition, not a discrete display toggle. GTK animations of this
kind run through the toolkit's own transition clock and universally respect the
desktop's `gtk-enable-animations` setting (and by extension the
`org.gnome.desktop.interface` reduced-motion preference), which is GNOME's
standing accessibility convention rather than something restated per-widget in
these two classes' docs. Exact duration/easing constants were not confirmed from
source in this pass (the GNOME GitLab source fetch failed to load); the docs
confirm the animated quantity (position/overlay reveal, page-stack slide) but not
the numeric timing.
Sources: https://gnome.pages.gitlab.gnome.org/libadwaita/doc/main/adaptive-layouts.html,
https://gnome.pages.gitlab.gnome.org/libadwaita/doc/1.5/class.OverlaySplitView.html,
https://gnome.pages.gitlab.gnome.org/libadwaita/doc/main/class.NavigationSplitView.html

## 4. Editor zen/focus modes

- **VS Code Zen Mode**: hides the activity bar, side bar, status bar, tabs, and
  optionally centers the editor (`zenMode.centerLayout`), driven by
  `src/vs/workbench/browser/layout.ts`. Public docs and the linked issues describe
  it as a set of visibility toggles and CSS class changes on the workbench
  container; nothing in the available material describes an animated width/opacity
  transition for the toggle itself; it reads as a snap (class-driven show/hide),
  consistent with VS Code's general non-animated chrome philosophy outside of a
  small number of dedicated CSS transitions (this could not be fully confirmed
  from the layout.ts source directly; issue trackers reference the
  hide/show behavior but not a transition timing).
  Sources: https://github.com/microsoft/vscode/blob/main/src/vs/workbench/browser/layout.ts,
  https://code.visualstudio.com/docs/getstarted/userinterface
- **Obsidian**: no built-in animated sidebar collapse; the CSS-snippet community
  (Obsidian is Electron/CSS-themable) treats animating the sidebar as a
  user-added enhancement, not a shipped default, implying the stock toggle snaps.
  Source: https://forum.obsidian.md/t/change-left-sidebar-width/80126
- **iA Writer / Typora Focus Mode**: a categorically different feature from a
  sidebar toggle. Both fade non-active paragraphs/lines/sentences to gray while
  the current block stays full-contrast; this is an opacity fade on text blocks,
  not a layout collapse, and both apps' "no sidebar" writing mode is the default
  static state rather than an animated transition into it.
  Sources: https://ia.net/writer/support/editor/focus-mode/focus-mode-windows,
  https://support.typora.io/Focus-and-Typewriter-Mode/
- **Notion**: the sidebar is `position: absolute`/transformed out of flow, so the
  content area does not reflow via a margin/grid change; the container's
  transform-based slide keeps the animation off the layout thread. Independent
  reverse-engineering also flags Notion's sidebar for janky performance, blamed on
  four animated `box-shadow`s riding alongside the transform, not on the
  transform itself.
  Source: https://medium.com/@quickmasum/ui-breakdown-of-notions-sidebar-2121364ec78d
- **Linear**: ships a collapsible sidebar (`[` shortcut). No official writeup of
  the exact animated property was found; independent performance analysis (see
  §5) that benchmarks GitLab's sidebar alongside Linear-style patterns credits a
  "simple structure" for its lack of jank, consistent with a transform-based
  approach, but this is inference, not a confirmed Linear source citation.
  Source: https://linear.app/changelog/unpublished-collapsible-sidebar
- **GitHub repository sidebar**: no authoritative source located confirming
  GitHub's own file-tree/sidebar transition mechanism; general community
  implementations use width or transform transitions of 0.25 to 0.5s, but nothing
  citable ties a specific property to github.com's shipped code in this pass.

## 5. Published guidance on collapse-animate vs fade, and `grid-template-columns` performance

- **`grid-template-columns` is animatable and interoperable**: supported in
  Chrome/Edge 107+, Firefox 66+, Safari 16.1+ (web.dev's framing: grid layouts "can
  smoothly transition between states, instead of snapping at the halfway point").
  Neither web.dev's article nor CSS-Tricks' companion piece makes a performance
  claim (compositor vs. main-thread); grid track interpolation is a layout-thread
  operation like `width`, not a compositor-only operation like `transform`.
  Practical caveat repeated across sources: interpolating grid templates requires
  matching track counts between start and end states (e.g. `1fr 1fr 0fr` to
  `1fr 1fr 1fr`, not `1fr 1fr` to `1fr 1fr 1fr`).
  Sources: https://web.dev/articles/css-animated-grid-layouts,
  https://css-tricks.com/animating-css-grid-how-to-examples/
- **The compositor-only argument for `transform`/`opacity`**: an independent
  practitioner benchmark (simulated CPU load against several real sidebars,
  including GitLab's) states plainly that `width` and `left` animations force
  layout recalculation on the main thread every frame, while `transform` and
  `opacity` "go straight to composite," and demonstrates that only the
  `translateX`-based sidebar held 60fps under heavy simulated load; the
  `requestAnimationFrame`-driven (JS) sidebar dropped frames earliest, and width/left
  approaches degraded next. This is the single most direct, citable, performance
  argument found for preferring transform-based approaches over width or grid-track
  approaches when frame budget is tight.
  Source: https://www.joshuawootonn.com/sidebar-animation-performance
- **Material's own motion guidance** treats a drawer/rail expand as a "leading"
  layout change warranting emphasized easing rather than a linear snap, i.e.
  Material's institutional position is that this class of transition should
  animate, not snap, when frame budget allows.
  Source: https://m3.material.io/styles/motion/easing-and-duration
- **`prefers-reduced-motion`**: none of the surveyed component libraries
  (shadcn, Mantine, Ant Design) build in automatic `prefers-reduced-motion`
  handling for the sidebar transition; GNOME/libadwaita is the one platform in
  this survey with a systemic, toolkit-level reduced-motion gate
  (`gtk-enable-animations`) that every animated widget, including the split
  views, inherits without per-component opt-in.

## Comparison table

| Implementation | Mechanism | Property transitioned | Duration | Easing | Reduced motion | Notes |
|---|---|---|---|---|---|---|
| shadcn/ui Sidebar | fixed sidebar + animated spacer div | `width`, `left/right`, `margin/opacity` (separate elements) | 200ms | `ease-linear` | none | cookie-persisted, Cmd/Ctrl+B |
| Mantine AppShell | flow-positioned navbar | `width` (consumer CSS) or shell-level prop | consumer-set, no fixed default | consumer-set | not built in | duration/easing exposed as props/CSS vars |
| Ant Design Sider | flow-positioned aside | `width` (inline style + stylesheet) | not exposed in source (theme CSS) | not exposed in source | none documented | historic IE11 width-transition bug noted in source |
| Chakra / Ark UI | no shipped sidebar | consumer's choice | n/a | n/a | n/a | composed from Box/Drawer/Collapsible |
| Radix Primitives | no shipped sidebar | consumer's choice via `Collapsible` | n/a | n/a | n/a | lowest-level building block only |
| Material 3 drawer/rail (web) | token-driven, property left to implementation | not mandated (guidance is timing/easing, not property) | ~medium bucket, roughly 300 to 400ms | emphasized decelerate (enter) / accelerate (exit) | not addressed at component level | institutional stance: this class of change should animate |
| libadwaita Overlay/NavigationSplitView | overlay reveal or navigation-stack slide | position/overlay reveal, page-stack slide (not confirmed as pure width or opacity) | not confirmed from source this pass | not confirmed from source this pass | yes, systemic via `gtk-enable-animations` | only surveyed system with toolkit-wide reduced-motion gating |
| VS Code Zen Mode | class-driven show/hide | none confirmed; reads as a snap | n/a | n/a | n/a (no motion to reduce) | docs/source describe visibility toggles, not a transition |
| Obsidian sidebar | class toggle | none by default | n/a | n/a | n/a | animation is a community CSS-snippet add-on, not stock |
| iA Writer / Typora Focus Mode | text-block dimming | `opacity` on inactive paragraphs | not specified | not specified | not addressed | not a layout collapse; a content fade, different problem shape |
| Notion sidebar | transform-based overlay, out of flow | `transform` (plus box-shadow, flagged as the actual jank source) | not confirmed | not confirmed | not addressed | content does not reflow via margin/grid, it is covered/uncovered |
| Linear sidebar | inferred transform-based | inferred `transform` | not confirmed | not confirmed | not addressed | inference only, no primary source located |

## Verdict

The strongest, most directly citable engineering argument in this survey is
Wootonn's benchmark: `width`/`left`/margin-style transitions force main-thread
layout recalculation every frame, while `transform`/`opacity` reach the
compositor directly, and only the transform-based sidebar held frame rate under
load. That argument cuts against both (a) and (b) as literally specified,
since a content-column margin transition and a `grid-template-columns`
transition are both layout-thread operations, functionally the same performance
class as the `width` transitions that degraded first in that benchmark. Nothing
surveyed shows a shipped, well-known implementation animating
`grid-template-columns` for a sidebar specifically; the two sources on that
property (web.dev, CSS-Tricks) demonstrate it works and is broadly supported,
not that it is anyone's chosen production technique for this exact interaction.

None of the surveyed libraries do the pure "snap layout, fade chrome" pattern
(c) as their headline sidebar mechanism either; the closest analogues are VS
Code's Zen Mode (a snap with no animation at all, not a snap-plus-fade) and
iA Writer/Typora's Focus Mode (a fade with no layout collapse at all, a
different interaction shape: dimming inactive text, not hiding a navigational
sidebar). So (c) as cairn frames it, snap the grid and fade the chrome, is a
hybrid with no direct precedent found; it is defensible as an application of
the same "compositor-only properties are safe, layout properties are not"
principle, using `opacity` (compositor-safe) for the one thing that must animate
and skipping the true layout jump (`display`/instant width). The library
consensus, in practice, is to keep everything one gesture, animate the sidebar
itself with `transform`, not the content margin, and accept that when a
column reflows, it reflows as a byproduct of the sidebar's own transform-based
slide rather than a resized track running in parallel with it. Two strongest
examples per option:

- **(a) transition the margin**: shadcn/ui Sidebar (explicit, documented,
  `duration-200 ease-linear` on width/left/right); Ant Design Sider (width-based,
  with a long-lived cross-browser transition bug noted directly in its own
  source, a cautionary data point for this option rather than an endorsement).
- **(b) grid shell with `grid-template-columns` transition**: no production
  sidebar implementation surveyed uses this as its mechanism; the two strongest
  examples are purely technique demonstrations, web.dev's animated-grid article
  and CSS-Tricks' companion piece, both proving feasibility and browser support,
  neither a real sidebar shipping it.
- **(c) snap layout, fade chrome**: no single surveyed example matches exactly;
  the two closest analogues, each covering half the pattern, are VS Code Zen
  Mode (snap, no animation, for the layout half) and iA Writer/Typora Focus Mode
  (fade via opacity, for the chrome half), neither of which combines both moves
  the way cairn's option (c) proposes.

If avoiding jank is the binding constraint, prior art points past all three
options as literally stated and toward a fourth: keep the content-column shift
as a byproduct of a `transform`-based sidebar slide (shadcn's spacer-plus-fixed
pattern, or Notion's transform-only sidebar) rather than animating margin or
grid tracks directly.
