# Motion language research for the cairn admin

Date: 2026-09-13. Status: research brief, no repo changes. Audience: the pass that writes the
`Motion` section of `docs/internal/admin-design-system.md`.

Geoff's direction (2026-09-13): gentle and minimal, in the register of modern GNOME. Short, eased,
one property at a time, nothing that draws attention to itself. The named defect is the zen-mode
toggle, which is abrupt.

## What the admin has today

`src/lib/audit/rules/static/motion-band.ts` requires every duration a component's own CSS declares
to land in a 150ms to 250ms band, and bans `transition: all`. `src/lib/audit/rules/static/reduced-motion.ts`
requires every selector that carries motion to be named again inside a `prefers-reduced-motion: reduce`
guard in the same file. `src/lib/components/cairn-admin.css` line 1115 collapses every admin
transition and animation to `0.01ms !important` under that guard.

The admin declares almost no motion of its own. The only transition in `cairn-admin.css` is
`transition: rotate 150ms ease` on `.cairn-caret` (line 545). Everything else the admin appears to
animate comes from DaisyUI.

Zen mode carries no motion at all. `EditPage.svelte` gates the topbar band, the document title, the
toolbar strip, the footer, and the zen chip behind `{#if !prefs.zen}` / `{#if prefs.zen}` blocks
(lines 1804, 1835, 2098, 2313, 2345). A Svelte `{#if}` adds and removes the node in one frame, so
every one of those regions appears and vanishes instantly. `setZen()` (line 441) then calls
`flushSync()` to move focus into the editing surface before the old nodes detach. That is the whole
defect: the toggle is not a slow or badly eased animation, it is the absence of one.

## 1. GNOME HIG and libadwaita

### The HIG publishes no motion guidance

The GNOME Human Interface Guidelines list eleven guideline pages: App Naming, App Icons, Pointer &
Touch, Keyboard, UI Icons, UI Styling, Writing Style, Typography, Navigation, Scaling &
Adaptiveness, and Accessibility ([guidelines index](https://developer.gnome.org/hig/guidelines.html)).
None covers motion, animation, or transitions. The UI Styling page covers light and dark styles,
high contrast, and custom styling, with nothing on animation
([UI Styling](https://developer.gnome.org/hig/guidelines/ui-styling.html)). The Design Principles
page lists Design for People, Make it Simple, Reduce User Effort, and Be Considerate, with nothing on
motion ([Principles](https://developer.gnome.org/hig/principles.html)).

The GNOME motion language therefore lives in libadwaita's code and stylesheet, not in prose. Every
claim below comes from the source.

### The Adwaita stylesheet uses one duration and one curve

`src/stylesheet/_common.scss` defines the whole CSS-level motion vocabulary in six lines
([source](https://gitlab.gnome.org/GNOME/libadwaita/-/raw/main/src/stylesheet/_common.scss)):

```scss
$ease-out-quad: cubic-bezier(0.25, 0.46, 0.45, 0.94);
$backdrop_transition: 200ms ease-out;
$focus_transition: outline-color 200ms $ease-out-quad,
                   outline-width 200ms $ease-out-quad,
                   outline-offset 200ms $ease-out-quad;
$button_transition: background 200ms $ease-out-quad,
                    box-shadow 200ms $ease-out-quad;
```

Four observations, all of them directly on Geoff's direction:

- One duration, 200ms, covers every button, focus ring, and backdrop in the desktop.
- One curve, `cubic-bezier(0.25, 0.46, 0.45, 0.94)`, an ease-out quad. Nothing overshoots.
- Every property is named individually. `transition: all` appears nowhere.
- The transitioned properties are `background`, `box-shadow`, `outline-color`, `outline-width`, and
  `outline-offset`. All are paint-only. No Adwaita hover or focus state moves anything.

The one animation in the file is `animation: needs_attention 150ms ease-in`, an attention cue, which
is the single case where GNOME deliberately does draw the eye.

### AdwTimedAnimation defaults to ease-out-cubic

`adw-timed-animation.c` declares the `easing` property with a default of `ADW_EASE_OUT_CUBIC`
([source](https://gitlab.gnome.org/GNOME/libadwaita/-/raw/main/src/adw-timed-animation.c), line 275).
The `duration` property has a default of `0` and is always set by the caller, so there is no
published default duration.

`AdwEasing` includes explicit CSS-equivalent members
([enum docs](https://gnome.pages.gitlab.gnome.org/libadwaita/doc/main/enum.Easing.html)):
`ADW_EASE` is cubic bezier (0.25, 0.1) to (0.25, 1.0), `ADW_EASE_OUT` is (0.0, 0.0) to (0.58, 1.0),
and `ADW_EASE_IN_OUT` is (0.42, 0.0) to (0.58, 1.0). The elastic, back, and bounce members exist but
no widget surveyed below uses one.

### Measured widget durations

From the libadwaita sources:

| Widget | Constant | Value |
| --- | --- | --- |
| `AdwToastOverlay` | `SHOW_DURATION`, `HIDE_DURATION` | 300ms, easing `ADW_EASE` |
| `AdwToastOverlay` | `REPLACE_DURATION` | 500ms |
| `AdwTabBox` | open, close, focus, scroll, resize, icon resize | 200ms each |
| `AdwTabBox` | `REORDER_ANIMATION_DURATION` | 250ms |
| `AdwLeaflet` | `mode-transition-duration` default | 250ms |

Sources: [adw-toast-overlay.c](https://gitlab.gnome.org/GNOME/libadwaita/-/raw/main/src/adw-toast-overlay.c)
lines 20 to 22 and 196 to 275, [adw-tab-box.c](https://gitlab.gnome.org/GNOME/libadwaita/-/raw/main/src/adw-tab-box.c)
lines 30 to 36, [adw-leaflet.c](https://gitlab.gnome.org/GNOME/libadwaita/-/raw/main/src/adw-leaflet.c) line 2294.

The clustering is tight. Almost everything GNOME animates runs 200ms to 300ms.

### Page and panel transitions use critically damped springs

`AdwNavigationView` does not use a timed animation for its page transition. It uses
`adw_spring_params_new (1, 1, SPRING_STIFFNESS)` with `SPRING_STIFFNESS 1000`
([adw-navigation-view.c](https://gitlab.gnome.org/GNOME/libadwaita/-/raw/main/src/adw-navigation-view.c)
lines 22 and 2152). The first argument is the damping ratio. A damping ratio of 1 is critically
damped, which means the animation settles at its target with zero overshoot and zero bounce. GNOME's
most prominent transition is engineered specifically not to draw attention to itself.

`AdwLeaflet` and `AdwFlap` both default their child transitions to
`adw_spring_params_new (1, 0.5, 500)`, again critically damped
([adw-leaflet.c](https://gitlab.gnome.org/GNOME/libadwaita/-/raw/main/src/adw-leaflet.c) line 2476,
[adw-flap.c](https://gitlab.gnome.org/GNOME/libadwaita/-/raw/main/src/adw-flap.c) line 1599).

### Reduced motion in GNOME snaps, it does not cross-fade

`adw_animation_play()` checks `adw_get_enable_animations()` and, when animations are off, calls
`adw_animation_skip()` and returns
([adw-animation.c](https://gitlab.gnome.org/GNOME/libadwaita/-/raw/main/src/adw-animation.c) lines 229
to 235). `adw_animation_skip()` jumps the value straight to the end. GNOME substitutes nothing. The
user setting is Settings > Accessibility > Seeing > Reduced animation, which maps to
`org.gnome.desktop.interface enable-animations`
([MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion)).

## 2. Material Design 3

### Duration tokens

`md.sys.motion.duration.*`, in milliseconds
([tokens and specs](https://m3.material.io/styles/motion/easing-and-duration/tokens-specs)):

| Tier | 1 | 2 | 3 | 4 |
| --- | --- | --- | --- | --- |
| short | 50 | 100 | 150 | 200 |
| medium | 250 | 300 | 350 | 400 |
| long | 450 | 500 | 550 | 600 |
| extra-long | 700 | 800 | 900 | 1000 |

### Easing tokens

| Token | Value |
| --- | --- |
| `standard` | `cubic-bezier(0.2, 0, 0, 1)` |
| `standard-decelerate` | `cubic-bezier(0, 0, 0, 1)` |
| `standard-accelerate` | `cubic-bezier(0.3, 0, 1, 1)` |
| `emphasized-decelerate` | `cubic-bezier(0.05, 0.7, 0.1, 1)` |
| `emphasized-accelerate` | `cubic-bezier(0.3, 0, 0.8, 0.15)` |
| `linear` | `cubic-bezier(0, 0, 1, 1)` |

`emphasized` is not expressible as a single CSS `cubic-bezier()`. M3 publishes it as a two-segment
spline, and web implementations chain the decelerate and accelerate halves instead. A `legacy` token
was not found in the current spec.

### Asymmetry and container transform

M3's rule is that an element entering the screen uses a decelerate curve and an element exiting uses
an accelerate curve. Short and medium durations pair with `standard`, long and extra-long with
`emphasized`. Confidence note: the token tables above were extracted directly and corroborated
against [Google's own Android motion doc](https://github.com/material-components/material-components-android/blob/master/docs/theming/Motion.md).
The pairing prose could not be pulled verbatim from the JS-rendered
[how it works](https://m3.material.io/styles/motion/overview/how-it-works) page, so treat it as
well-attested convention rather than a quoted requirement.

Container transform morphs one element directly into the container of the surface it navigates to,
producing a continuous link between two states
([MaterialContainerTransform](https://developer.android.com/reference/com/google/android/material/transition/MaterialContainerTransform)).
It uses `emphasized` easing and is commonly cited at 300ms. The exact canonical duration is not
confirmed from the primary spec page. It is listed here because it is the archetype of the kind of
transition cairn should decline, and its cost is the reason.

M3 Expressive (2025) adds spring-based spatial and effects token families in default, fast, and slow
tiers. The specific damping and stiffness numbers are not published in any reachable source, so no
number is given here.

No M3-specific reduced-motion guidance page was located.

## 3. Apple Human Interface Guidelines

The [Motion page](https://developer.apple.com/design/human-interface-guidelines/motion) is
principles-only. The ones that bear on this work:

- Add motion purposefully, supporting the experience without overshadowing it.
- Make motion optional. Do not let motion be the only channel carrying important information.
- Aim for brevity and precision in feedback animations. Concise, well-timed animation communicates
  better than prolonged effects.
- Avoid adding custom motion to frequently used interface elements, since the system already animates
  standard components appropriately.
- Let people cancel motion. Do not make someone wait out an animation before continuing.

Apple publishes very few numbers. `UIView.animate(withDuration:)` takes duration as a required
argument and has no published default. The documented default curve is ease-in-ease-out. The SwiftUI
presets `.smooth`, `.snappy`, and `.bouncy` are described qualitatively on
[developer.apple.com/documentation/swiftui/animation](https://developer.apple.com/documentation/swiftui/animation)
with no published numeric defaults. The older `Animation.spring()` does publish
`response: 0.55, dampingFraction: 0.825, blendDuration: 0`, and `interactiveSpring()` publishes
`response: 0.15, dampingFraction: 0.86, blendDuration: 0.25`. These two are medium confidence,
aggregated from API signatures rather than extracted verbatim.

Apple's Reduce Motion policy is the important contribution: replace motion with cross-fades or static
transitions. Reduce parallax, large zoom and scale, layered motion, sliding transitions, and
autoplay. Keep essential transitions such as a list insertion. iOS additionally ships a distinct
"Prefer Cross-Fade Transitions" toggle governing system-level transitions.

## 4. IBM Carbon

Carbon splits motion into productive and expressive
([motion overview](https://carbondesignsystem.com/elements/motion/overview/)). Productive motion
"creates a sense of efficiency and responsiveness, while remaining subtle and out of the way" and is
for moments when the user needs to focus on completing tasks. Expressive motion "delivers
enthusiastic, vibrant, and highly visible movement" and is reserved for occasional important moments.

### Easing tokens

Confirmed against the
[DTCG token source](https://raw.githubusercontent.com/carbon-design-system/carbon/main/packages/motion/src/dtcg/motion.json):

| Curve | Productive | Expressive |
| --- | --- | --- |
| standard | `cubic-bezier(0.2, 0, 0.38, 0.9)` | `cubic-bezier(0.4, 0.14, 0.3, 1)` |
| entrance | `cubic-bezier(0, 0, 0.38, 0.9)` | `cubic-bezier(0, 0, 0.3, 1)` |
| exit | `cubic-bezier(0.2, 0, 1, 0.9)` | `cubic-bezier(0.4, 0.14, 1, 1)` |

### Duration tokens

| Token | ms | Usage |
| --- | --- | --- |
| `duration-fast-01` | 70 | Button and toggle micro-interactions |
| `duration-fast-02` | 110 | Fade micro-interactions |
| `duration-moderate-01` | 150 | Small expansion, short distance movement |
| `duration-moderate-02` | 240 | Expansion, system communication, toast |
| `duration-slow-01` | 400 | Large expansion, important system notifications |
| `duration-slow-02` | 700 | Background dimming |

Carbon's selection rule is worth copying: use standard easing when an element stays visible
throughout the motion, entrance easing when it appears, and exit easing when it leaves permanently.
An element that leaves but stays nearby ready to reappear, such as a side panel, uses standard easing
rather than exit easing. Carbon also states that duration should scale with the distance travelled or
the size change, and that micro-interactions should target 90ms to 120ms with ease-out on user input.

Carbon's reduced-motion guidance is design-level only. It asks for alternatives to interface state
transitions and for messages to be communicable statically. It publishes no `prefers-reduced-motion`
token or implementation spec.

## 5. Atlassian Design System

From [atlassian.design/foundations/motion](https://atlassian.design/foundations/motion):

Durations are published as two use-case bands rather than discrete named values. Interactions run
50ms to 150ms, "used for hover and press states. Short durations ensure the interface feels
immediately responsive." Transitions run 150ms to 400ms, "used for elements entering, exiting, or
moving on screen."

| Name | Value | Purpose |
| --- | --- | --- |
| Ease-out bold | `cubic-bezier(0, 0.4, 0, 1)` | Entrances |
| Ease-in-out bold | `cubic-bezier(0.4, 0, 0, 1)` | Scaling and repositioning |
| Ease-in practical | `cubic-bezier(0.6, 0, 0.8, 0.6)` | Exits |
| Ease-out practical | `cubic-bezier(0.4, 1, 0.6, 1)` | Fades |

Two rules carry over directly. Keep small elements fast and understated, and allow larger elements
more time. Make exit motion faster than entrances so dismissed elements do not block someone's
workflow.

Atlassian's reduced-motion policy is the strictest surveyed: "Currently, when reduced motion is
active, motion is off and instant." All interfaces must remain functional with motion fully disabled.

## 6. WCAG 2.2 and reduced-motion practice

[SC 2.3.3 Animation from Interactions](https://www.w3.org/TR/WCAG22/#animation-from-interactions),
level AAA: "Motion animation triggered by interaction can be disabled, unless the animation is
essential to the functionality or the information being conveyed." The
[Understanding document](https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html)
defines essential narrowly. Motion is essential only if removing it would fundamentally change the
information or functionality and that could not be achieved another way. Decorative parallax is
explicitly not essential. Sufficient techniques are C39 (the `prefers-reduced-motion` media query),
SCR40 (the same via JavaScript), and a site-wide preference.

[SC 2.2.2 Pause, Stop, Hide](https://www.w3.org/TR/WCAG22/#pause-stop-hide), level A, requires a
pause, stop, or hide mechanism for motion that starts automatically, runs longer than five seconds,
and is presented in parallel with other content.
[SC 2.3.1](https://www.w3.org/TR/WCAG22/#three-flashes-or-below-threshold), level A, caps flashing at
three times per second.

The [WebKit "Responsive Design for Motion" post](https://webkit.org/blog/7551/responsive-design-for-motion/)
names the vestibular trigger classes: scaling and zooming, spinning and spiral movement, parallax and
multi-directional or varying-speed movement, 2.5D plane shifts, and peripheral horizontal motion. Its
core instruction is to "only remove the animations you know to be vestibular triggers," because
blanket removal can itself harm comprehension.

[web.dev's motion page](https://web.dev/learn/accessibility/motion) recommends removing non-essential
movement entirely, and providing pause, stop, or hide controls for anything auto-starting past five
seconds.

On `0.01ms` versus `0s` in a reduced-motion reset: a zero-duration transition does not fire, so no
`transitionend` event is dispatched. `0.01ms` is visually instant but still dispatches the event, so
any JavaScript gating further logic on `transitionend` continues to work. This is widely repeated
engineering consensus rather than a spec requirement. It is the reason `cairn-admin.css` line 1122 is
correct as written and should stay `0.01ms`.

Note the tension the sources leave unresolved. Apple says substitute a cross-fade. GNOME and
Atlassian say snap. WebKit says remove only known triggers and keep the rest. Section (c) resolves it
per property class.

## 7. Tailwind 4 and DaisyUI 5

Versions in this repo: `tailwindcss` 4.3.3, `daisyui` 5.7.20, read from
`examples/showcase/node_modules`.

### Tailwind 4 defaults

From `tailwindcss/theme.css`:

```css
--ease-in: cubic-bezier(0.4, 0, 1, 1);            /* line 434 */
--ease-out: cubic-bezier(0, 0, 0.2, 1);           /* line 435 */
--ease-in-out: cubic-bezier(0.4, 0, 0.2, 1);      /* line 436 */
--default-transition-duration: 150ms;             /* line 492 */
--default-transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);  /* line 493 */
```

A bare `transition` utility therefore means 150ms on `ease-in-out`. Tailwind's default is symmetric,
which is the opposite of every design system surveyed. Overriding
`--default-transition-timing-function` to an ease-out is a one-line change with repo-wide effect.

### DaisyUI 5 component motion

Extracted from `daisyui/components/*.css`:

| Component | Motion |
| --- | --- |
| `.btn` | 200ms, `cubic-bezier(0, 0, 0.2, 1)`, on color, background-color, border-color, box-shadow, **transform** |
| `.modal` | 300ms ease-out on translate, scale, box-shadow; opacity 200ms delayed 50ms; backdrop 300ms |
| `.drawer` | 300ms ease-out on translate, 200ms on width; overlay opacity 200ms delayed 100ms |
| `.dropdown` | 200ms `cubic-bezier(0.4, 0, 0.2, 1)` on opacity, scale, display, overlay; plus `@keyframes dropdown` (opacity only) |
| `.menu` | 200ms on color, background-color, box-shadow, rotate, translate; `@keyframes menu` (opacity only) |
| `.collapse` | 200ms and 300ms, **`transition-property: all`**, plus `grid-template-rows` 200ms |
| `.toast` | `animation: 0.25s ease-out toast`, keyframes go `opacity 0, scale 0.9` to `opacity 1, scale 1` |
| `.tooltip` | 200ms `cubic-bezier(0.4, 0, 0.2, 1)` on opacity and transform, delayed 75ms |
| `.toggle` | background-color 100ms, translate 200ms, inset-inline-start 200ms; also `rotate 0.4s` |
| `.checkbox` | background-color and box-shadow 200ms; clip-path, rotate, translate 300ms delayed 100ms |
| `.tab`, `.select`, `.card` | 200ms |
| `.swap` | 200ms `cubic-bezier(0, 0, 0.2, 1)` on transform, rotate, opacity |

Three things to override by name:

1. **`.modal` and `.drawer` run 300ms with a translate and a scale.** Both exceed the current 150ms
   to 250ms band, and both move and scale a large surface, which is the WebKit trigger class.
2. **`.collapse` ships `transition-property: all`**, the exact construct `motion-band` bans in the
   admin's own CSS. Vendor CSS is not scanned, so the ban does not reach it.
3. **`.btn` transitions `transform`.** Nothing in the admin should move on hover. Narrowing the
   button transition to the paint properties matches Adwaita's `$button_transition` exactly.

DaisyUI gates some components behind `@media (prefers-reduced-motion: no-preference)`: carousel,
collapse, toast, tooltip, rating, radio, progress, loading, aura, skeleton, menu, dropdown. It does
**not** gate modal, drawer, button, checkbox, toggle, tab, card, select, swap, or fab. Those animate
regardless of the user's preference. The blanket `!important` collapse in `cairn-admin.css` is
currently the only thing covering them, which is why that block must survive any refactor.

## (a) Comparison on the same axes

| Axis | GNOME / libadwaita | Material 3 | Apple | Carbon | Atlassian | WCAG | Tailwind / DaisyUI |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Fastest band | none published | 50ms | none published | 70ms | 50ms | n/a | 100ms (DaisyUI toggle) |
| Default band | **200ms** | 200 to 300ms | none published | 150 to 240ms | 150 to 400ms | n/a | 150ms Tailwind, 200ms DaisyUI |
| Largest band | 300 to 500ms (toast) | 1000ms | none published | 700ms | 400ms | n/a | 300ms (modal, drawer) |
| Easing count | **1 CSS curve** | 6 tokens plus a spline | none published | 6 tokens | 4 tokens | n/a | 3 tokens |
| Default curve | `cubic-bezier(0.25, 0.46, 0.45, 0.94)` | `standard` | ease-in-ease-out | productive standard | ease-out bold | n/a | `cubic-bezier(0.4, 0, 0.2, 1)` |
| Enter/exit asymmetry | no (one curve) | **yes**, decelerate in, accelerate out | not specified | **yes**, entrance and exit curves | **yes**, exits faster | n/a | no |
| Duration scales with size | not stated | yes | not stated | **yes, explicitly** | yes | n/a | no |
| Overshoot or bounce | **never** (damping ratio 1) | yes in Expressive | yes (`.bouncy`) | no | no | n/a | no |
| Publishes what snaps | by omission | no | no | no | no | n/a | no |
| Reduced motion | **skip to end value** | not located | **cross-fade substitute** | alternatives, no spec | **off and instant** | disable non-essential (AAA) | partial gating only |

## (b) Where they agree and where they disagree

### Agreement

1. **The working range is 100ms to 300ms.** Every system's everyday band falls inside it. Carbon's
   400ms and 700ms and M3's long tiers exist for large expansions and hero transforms, which cairn
   has none of.
2. **Ease-out is the default curve.** GNOME's only curve is an ease-out quad, Carbon's entrance is an
   ease-out, Atlassian's entrance is an ease-out, M3's decelerate is an ease-out. Tailwind's
   symmetric `ease-in-out` default is the outlier.
3. **Small and frequent means fast.** Carbon says 90ms to 120ms for micro-interactions, Atlassian
   says 50ms to 150ms for hover and press, M3's `short2` is 100ms. All three separate interaction
   feedback from element transitions.
4. **Duration scales with the size or distance of the change.** Carbon states it as a rule,
   Atlassian as guidance, M3 through its tier structure.
5. **Reduced motion is a hard requirement, and the trigger is positional motion.** WebKit, Apple, and
   web.dev all name scaling, zooming, spinning, and parallax. None names a color or opacity change.

### Disagreement

The three that matter for cairn are in the report summary. Two more, lower stakes:

- **Whether to publish numbers at all.** Carbon, M3, and Atlassian publish full token sets. Apple
  publishes principles and almost no numbers. GNOME publishes no motion prose whatsoever, and its
  language is recoverable only by reading libadwaita. Geoff asked for the GNOME register, and the
  GNOME register turns out to be a stylesheet with six lines in it. That is itself the finding: the
  register is achieved by having almost no vocabulary, not by having a well-documented one.
- **Springs versus timed curves for large transitions.** GNOME uses critically damped springs for its
  most prominent transitions and timed curves for everything small. M3 Expressive is moving the same
  way. Carbon and Atlassian stay entirely on cubic-beziers. CSS has no spring primitive that degrades
  well, so cairn stays on cubic-beziers and takes the no-overshoot intent instead of the mechanism.

## (c) Recommended ruleset for the cairn admin

Sized for a 40-line `Motion` section in `docs/internal/admin-design-system.md`.

```
## Motion

The admin's motion register is GNOME's: short, eased out, one property at a time, and never
something the eye is meant to follow. Motion confirms that something happened. It never
announces it.

Tokens. Four durations and three curves. A component that needs a fifth of either is wrong.
  --cairn-dur-tap:    100ms   hover, press, focus ring, disabled, any paint-only feedback
  --cairn-dur-quick:  150ms   small local state: caret, chip, disclosure, inline validation
  --cairn-dur-settle: 200ms   the default: menus, popovers, tooltips, drawers, modals
  --cairn-dur-shift:  300ms   page-level mode change only. Zen is the sole use today.
  --cairn-ease-out:   cubic-bezier(0.25, 0.46, 0.45, 0.94)  Adwaita's curve. Enters, settles.
  --cairn-ease-in:    cubic-bezier(0.4, 0, 1, 1)            Exits only.
  --cairn-ease-move:  cubic-bezier(0.4, 0, 0.2, 1)          Visible throughout, moves or resizes.

Enter and exit are asymmetric. An exit runs one duration band faster than its enter and uses
--cairn-ease-in. A settle-band panel enters at 200ms ease-out and leaves at 150ms ease-in. The
way out is never a wait.

What animates. Only opacity, color, background-color, border-color, box-shadow, outline-*,
rotate, translate, scale, and grid-template-rows. A translate stays under 8px.

What snaps, always, with no transition:
  - Theme change. A whole-admin colour crossfade is a flash on every token.
  - Route change between admin pages.
  - Text content replacing text content, including a changed label.
  - A list reflowing after a save, a sort, or a filter.
  - Validation messages and the aria-live feedback region. The reader needs them now.
  - Anything sized by the user's own typing.
  - width, height, top, left, right, bottom, margin, padding, font-size. Ever.

Reduced motion degrades by property class, it does not blank.
  - Paint (opacity, colour, shadow, outline): unchanged. These carry no positional motion and
    removing them removes the feedback.
  - Transform (translate, scale, rotate): duration to 0.01ms, substitute an opacity fade at the
    same band. 0.01ms and not 0s, so transitionend still fires.
  - Layout (grid-template-rows, min-height): 0.01ms. Snap.
  - Page-level mode change: one 150ms opacity cross-fade, no geometry, no delay.
```

That is 40 lines. Two notes for the pass, which belong in prose around the block rather than inside it:

- Set `--default-transition-timing-function: var(--cairn-ease-out)` on the admin root. Tailwind's
  symmetric default otherwise reaches every bare `transition` utility in the admin.
- Override the DaisyUI components named in section 7 by name: `.modal` and `.drawer` from 300ms to
  `--cairn-dur-settle` with the scale removed, `.collapse` off `transition-property: all`, and `.btn`
  off `transform`.

## (d) Zen mode under this ruleset

Zen changes four regions at once, which is why it reads as a jump cut. The fix is to give the leaving
chrome and the arriving chip separate, ordered treatment, and to let the editor card carry the only
geometry change.

### Entering zen, about 350ms total

1. **The chrome fades out.** The topbar band, document title, toolbar strip, and footer go to
   `opacity: 0` over `--cairn-dur-quick` (150ms) on `--cairn-ease-in`, then leave the DOM. None of
   them slides. A footer sliding down while a topbar slides up is two directions of peripheral motion
   at once, the WebKit trigger class.
2. **The editor card reclaims the space.** Its padding and max-width transition over
   `--cairn-dur-shift` (300ms) on `--cairn-ease-out`, starting at the same instant as the fade rather
   than after it. The overlap is what makes the change read as one movement.
3. **The zen chip arrives last.** Opacity 0 to 1 plus a 4px downward translate over
   `--cairn-dur-settle` (200ms) on `--cairn-ease-out`, with `transition-delay: 150ms` so it appears
   only once the chrome has gone. No scale. A scaling element fixed in the top-right corner is
   peripheral scaling, the one motion class every accessibility source names.

### Leaving zen, about 200ms total

1. **The chip goes immediately.** Opacity to 0 over `--cairn-dur-tap` (100ms), no delay, no translate.
   It is the control the pointer just hit, so it should be gone before anything else moves.
2. **The card geometry returns** over `--cairn-dur-settle` (200ms) on `--cairn-ease-out`, one band
   faster than the enter.
3. **The chrome fades back in** over `--cairn-dur-quick` (150ms) on `--cairn-ease-out`, no delay,
   concurrent with the card.

Exit is roughly 200ms against the enter's 350ms. That is Atlassian's rule and Carbon's side-panel
case: the chrome left but stayed nearby ready to reappear, so it comes back on the standard curve
rather than a dramatic one.

### Reduced motion

Both directions collapse to a single 150ms opacity cross-fade on the editor card. No geometry
transition, no chip translate, no delays. The chrome snaps in and out. This follows Apple's
substitute-a-cross-fade rule for the one surface large enough to need it, and GNOME's snap rule for
everything else.

### Two constraints the implementation must respect

- **Motion must never gate focus.** `setZen()` currently reads `document.activeElement` before the
  flip and calls `flushSync()` so focus lands on `.cm-content` before the old nodes detach
  (`EditPage.svelte` lines 441 to 459). That sequence must stay synchronous. Focus moves on the first
  frame while the fade is still running. Apple's "let people cancel motion" is the same principle:
  nobody waits out an animation.
- **`{#if}` cannot do this alone.** A Svelte `{#if}` removes the node in one frame, so there is no
  exit to animate. The chrome regions need either Svelte `transition:` directives (`fade`) or
  `@starting-style` plus `transition-behavior: allow-discrete`, which is what DaisyUI's own modal and
  dropdown use. The `transition:` directive is the smaller change and keeps the motion in the
  component that owns the state.

## (e) Audit rule changes

### `motion-band` tightens from a range to a vocabulary

The rule blocks the recommendation as written. `--cairn-dur-tap` at 100ms and `--cairn-dur-shift` at
300ms both fall outside the current 150ms to 250ms band, so zen cannot be built without a suppression.

Three changes:

1. **Raise the ceiling to 300ms and lower the floor to 100ms**, which is the minimum needed to make
   the four tokens legal.
2. **Replace the range check with a token check.** Require the declaration to reference a
   `var(--cairn-dur-*)` token rather than a literal duration. This is strictly stronger than widening
   the range. Today `175ms` passes and means nothing, and after widening `137ms` would pass too. A
   vocabulary check cannot drift.
3. **Police the timing function too.** The rule reads durations and ignores easing entirely. Today
   `transition: rotate 150ms ease` in `cairn-admin.css` line 545 passes, and bare `ease` is
   `cubic-bezier(0.25, 0.1, 0.25, 1)`, which is not the Adwaita curve. A bare `ease`,
   `ease-in-out`, `linear`, or a raw `cubic-bezier()` literal should be an error. The function must
   be one of the three `--cairn-ease-*` tokens.

Keep the `transition: all` ban unchanged. It is correct and it is the one rule DaisyUI's `.collapse`
violates.

### `reduced-motion` tightens from presence to behavior

Today the rule proves only that the selector is *named* inside a guard, with the comment stating that
matching is selector-text equality and not property inspection. Under the recommended policy the
guard has to do the right thing per property class, so presence is no longer sufficient. The rule
should assert that the guard's own declarations zero the transform and layout properties and leave
the paint properties alone. A guard that zeroes an `opacity` transition would become a finding, which
inverts today's behavior.

The file-scoped matching (`guardedByFile`) is right and should stay. It is what stops the blanket
`!important` block in `cairn-admin.css` from satisfying every component's obligation from a distance.

### New rule: `motion-property`

This is the rule that would have caught the zen defect class, and it is the one that encodes "one
property at a time."

- Every transitioned property is named individually and comes from the allowlist in section (c).
- `width`, `height`, `top`, `left`, `right`, `bottom`, `margin`, `padding`, and `font-size` are
  errors. These are the layout-thrashing properties, and the judder they produce is what reads as
  abrupt.
- A single declaration transitioning more than three properties is an error.
- A `transition-delay` over 150ms is an error outside an allowlisted page-level mode change. A long
  delay is how an interface starts to feel laggy rather than gentle.

### New check: DaisyUI motion overrides

`motion-band` and `reduced-motion` scan the admin's own CSS. Neither reaches `node_modules`, so
`.modal` at 300ms, `.drawer` at 300ms, and `.collapse` with `transition-property: all` all ship
un-audited. A `check:invisible-craft`-style check should assert that `cairn-admin.css` carries an
explicit override block for each DaisyUI component the admin actually renders. This is the mechanical
half of the finding, so by the cairn engine rule it belongs in `cairn-audit` rather than in a
consuming site's own probe.

### What a rendered rule cannot check

Enter and exit asymmetry is a relationship between two rules in different states, and the ordering of
the zen sequence is a relationship across time. Neither is reachable by static CSS inspection. Those
stay a `visual-verifier` concern, and the zen toggle in both directions is worth adding to the
reproduction manifest as a motion case.

## Confidence notes

- Every GNOME and libadwaita number above was read from the source files, not from a summary.
- Carbon's tokens were confirmed against the DTCG source file as well as the docs page.
- Tailwind and DaisyUI numbers were read from this repo's own `node_modules` at the pinned versions.
- M3's duration and easing tables are high confidence. The container-transform duration, the
  Expressive spring numbers, and M3's reduced-motion position are gaps, flagged inline.
- Apple publishes almost no numbers. The SwiftUI spring defaults given are medium confidence.
- The `0.01ms` versus `0s` rationale is engineering consensus, not a spec requirement.

## Second read: the responsive axis

Date: 2026-09-13, same day, second research pass. Everything above stands. This half answers a
question the first read did not ask: how each rule changes with the viewport and with the input
device, across the family's five-viewport bar of 320, 390, 768, 1440, and 2560. Section (f) below
supersedes section (c) as the ruleset the pass should implement, and section (g) supersedes the
desktop-only worked example in section (d).

Two corrections to the first read, both found while reading the shipped code for this pass:

- **Zen mode does carry motion today.** Section (d) states that zen has none. `CairnAdminShell.svelte`
  lines 669 and 670 set `class:lg:drawer-open={!isDeskRoute && !topbar.zen}` and
  `class:xl:drawer-open={isDeskRoute && !topbar.zen}`, so entering zen removes the drawer-open class
  at whichever breakpoint applies. DaisyUI's `.drawer-side > :not(.drawer-overlay)` declares
  `transition: translate .3s ease-out, width .2s ease-out`, and the `.drawer-side` element itself
  declares `transition: opacity .2s ease-out .1s allow-discrete, visibility .3s ease-out .1s
  allow-discrete` (`daisyui/components/drawer.css`, 5.7.20). Removing the class therefore slides the
  sidebar out over 300ms while its width animates over 200ms and its opacity fades after a 100ms
  delay. The `{#if}` regions still snap. Zen is a mixed toggle rather than a motionless one, which is
  a likelier explanation for "abrupt" than the absence of motion alone. Verify this on a real render
  before the pass builds against it.
- **The family already ships a route transition, and already declines it in the admin.** The
  showcase's public site layout runs the SvelteKit `onNavigate` plus `document.startViewTransition`
  recipe, with a 0.18s root cross-fade in `examples/showcase/src/theme/theme.css` and two independent
  reduced-motion guards. Its own comment states the scope: "This lives only in the (site) group's
  layout, so the admin never cross-fades."

## 8. Input modality

### Tailwind 4 already gates hover on hover capability

The `hover` variant compiles to `@media (hover: hover) { &:hover }`
([Tailwind hover, focus, and other states](https://tailwindcss.com/docs/hover-focus-and-other-states)).
This is not theoretical in this repo: the showcase's built client CSS carries 34 `@media
(hover:hover)` blocks, and no other hover-related media query. Every `hover:` utility the admin
writes is therefore already modality-gated for free.

The same page publishes `pointer-fine`, `pointer-coarse`, `pointer-none`, and the three `any-pointer`
variants. The admin already uses one: `CairnAdminShell.svelte` line 782 shows the Command-K hint with
`sm:pointer-fine:inline`, so the keyboard shortcut is advertised only where a keyboard is likely.

MDN defines the underlying features. `hover: none` means "the primary input mechanism cannot hover at
all or cannot conveniently hover (e.g., many mobile devices emulate hovering when the user performs
an inconvenient long tap)" ([MDN hover](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/hover)).
`pointer: coarse` is "a pointing device of limited accuracy, such as a finger on a touchscreen" and
`pointer: fine` "an accurate pointing device, such as a mouse"
([MDN pointer](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/pointer)). The emulated-hover
clause is the whole problem: a touch device does not report no hover, it reports a hover that arrives
on a long press and then sticks.

### DaisyUI gates six components and leaves eleven open

Measured across `daisyui/components/*.css` at 5.7.20, counting `@media (hover:hover)` blocks against
`:hover` selectors in each file:

| Gated on hover capability | Ungated |
| --- | --- |
| `button`, `link`, `table`, `tab`, `dock`, `breadcrumbs` | `menu`, `dropdown`, `tooltip`, `select`, `fab`, `calendar`, `diff`, `megamenu`, `hover3d`, `hovergallery`, `textrotate` |

Three of the ungated components are load-bearing in the admin: `menu` appears throughout the nav
tree, `dropdown` in three components, and `tooltip` in three. `.tooltip` is the sharpest case. It
transitions opacity and transform over 200ms with a 75ms delay, triggered by `:hover`, with no
capability gate, so a long press on a phone opens a tooltip the reader did not ask for and cannot
dismiss by moving away.

The admin's own CSS already carries one such guard, at `cairn-admin.css` line 1002, wrapping the dark
theme's `.btn-active:hover` repair. Its comment names the reason: "so a touch device does not strand
the lighter fill on the last-tapped segment." That rule is the template for the rest.

### What replaces hover on touch

Material's state layers are explicit that hover is a pointer state. "Ripples display on hover and
press pointer interactions" and "only one state layer is applied at a time"
([M2 states](https://m2.material.io/design/interaction/states.html)). The press layer is what a touch
interaction reaches, because there is no hover to reach first.

GNOME takes the opposite position and states it plainly: "designs should generally be input device
agnostic," and separately, "Pointer hover should not be relied upon for revealing actions or
essential information"
([GNOME HIG, Pointer and Touch](https://developer.gnome.org/hig/guidelines/pointer-touch.html)).
Read together, the two rules are compatible with the web practice: do not hang information on hover,
and where hover only adds feedback, gating it costs a touch user nothing.

The cairn rule follows from that. Hover carries feedback and never information. Press carries the
same feedback on touch, at the same token, with no delay. A touch device that loses a hover
transition loses nothing it needed.

### Focus motion separates itself

`:focus-visible` "applies while an element matches the `:focus` pseudo-class and the UA determines
via heuristics that the focus should be made evident on the element," and MDN describes the
heuristic: "when a button is clicked using a pointing device, the focus is generally not visually
indicated, but when a text box needing user input has focus, focus is indicated"
([MDN :focus-visible](https://developer.mozilla.org/en-US/docs/Web/CSS/:focus-visible)). A focus ring
that only paints for keyboard focus only animates for keyboard focus, so the modality split is
already handled by the selector. No second token and no second media query are needed.

WCAG 2.4.13 Focus Appearance specifies the indicator's size and its 3:1 contrast between focused and
unfocused states and says nothing about animating it
([Understanding 2.4.13](https://www.w3.org/WAI/WCAG22/Understanding/focus-appearance.html)). The one
constraint that follows is a timing one: the indicator must be at full contrast promptly, which the
`tap` band at 100ms satisfies and a `shift` band at 300ms would not. Adwaita's own
`$focus_transition` runs 200ms on `outline-color`, `outline-width`, and `outline-offset`, so the band
is in range either way.

No design system surveyed publishes guidance that focus-ring motion should differ between keyboard
and pointer focus. That is a genuine gap, not an omission in this survey.

## 9. Viewport-dependent components

### The breakpoints in play

Material publishes window size classes in dp: compact below 600, medium 600 to 839, expanded 840 to
1199, large 1200 to 1599, extra-large 1600 and above
([window size classes](https://developer.android.com/develop/adaptive-apps/guides/use-window-size-classes)).
Mapped onto the family's five-viewport bar: 320 and 390 are compact, 768 is medium, 1440 is large,
2560 is extra-large. The admin's own Tailwind breakpoints are `sm` at 640, `lg` at 1024, and `xl` at
1280, counted across `src/lib/components/*.svelte` as 156, 12, and 6 uses. The admin's real
responsive decisions therefore happen at 640 and at 1024 or 1280, and the five-viewport bar samples
either side of both.

### Navigation drawer

Material assigns the variants by size class. Standard drawers "allow interaction with both screen
content and the drawer at the same time. They can be used on tablet and desktop, but they aren't
suitable for mobile devices due to limited screen size." Modal drawers "block interaction with the
rest of an app's content with a scrim" and are "primarily used for mobile devices where screen space
is limited, and can be replaced by standard drawers on tablet and desktop"
([NavigationDrawer.md](https://github.com/material-components/material-components-android/blob/master/docs/components/NavigationDrawer.md)).
Note the same doc records that the component "is being deprecated in the Material 3 expressive
update" in favor of an expanded navigation rail, so treat the variant split as the durable finding
and the component as a moving target.

For motion, Material's Android theming doc maps navigation patterns to `motionDurationLong1` at 300ms
incoming and `motionDurationMedium2` at 250ms outgoing, and dialogs and menus to 150ms in and 75ms
out ([Motion.md](https://github.com/material-components/material-components-android/blob/master/docs/theming/Motion.md)).
Two things follow. The enter-versus-exit asymmetry is roughly 1.2:1 for navigation and 2:1 for
dialogs, which matches section (c)'s one-band-faster exit rule. And nothing in the published spec
animates a standard or permanent drawer that is simply present, because a drawer that never leaves
has no entrance to time.

Apple's equivalent is the split view. "The primary pane can overlay the secondary pane and can be
hidden offscreen when not in use. This is particularly useful when the device is in portrait
orientation," and the HIG advises to "consider automatically hiding and revealing a sidebar when its
container window resizes" ([Sidebars](https://developer.apple.com/design/human-interface-guidelines/sidebars),
[Split views](https://developer.apple.com/design/human-interface-guidelines/split-views); both pages
render through JavaScript, so these were recovered through search-index extraction of those URLs and
are medium confidence on exact wording, high confidence on substance).

DaisyUI implements the same split with one class. `.drawer-side` is `position: fixed`, full width,
`translate: -100%`, `opacity: 0`, `visibility: hidden`, and it declares `transition: translate .3s
ease-out, width .2s ease-out` on its non-overlay child plus `opacity .2s ease-out .1s allow-discrete`
on itself. Adding `.lg:drawer-open` inside `@media (width>=1024px)` flips it to `position: sticky`,
`width: auto`, `opacity: 1`, and `translate: 0%`. The transition declarations stay in force at every
width. The admin uses exactly this, at `lg` for content routes and `xl` for desk routes.

**The rule.** The overlay drawer is a slide-over and animates. The persistent sidebar is furniture and
does not. The transition on `.drawer-side` and its child must be scoped so that it applies only while
the drawer is acting as an overlay, which the shell already computes as `isPersistentSidebar`
(`CairnAdminShell.svelte` line 556). Leaving the DaisyUI declarations unscoped is what makes both the
breakpoint flip and the zen toggle animate, and neither should.

### Dialogs and sheets

DaisyUI's documented responsive dialog idiom is a class pair, `modal-bottom sm:modal-middle`.
Measured in `daisyui/components/modal.css` at 5.7.20, the two positions differ in travel by more than
an order of magnitude:

| Modifier | Box | Start state |
| --- | --- | --- |
| `.modal-bottom` | `width: 100%`, square top corners flush to the bottom edge | `translate: 0 100%`, `scale: 1` |
| `.modal-middle` | `width: 91.6667%`, `max-width: 32rem` | `translate: 0 2%`, `scale: .98` |

Both run under the same `.modal` transition, 300ms ease-out on translate and scale. At 390px wide a
bottom sheet travels the full viewport height. At 1440 a centered dialog travels 2% of a 512px box,
roughly 10px. One duration covers both.

Carbon says that is wrong. "Motion's duration should be dynamic based on the size of the animation;
the larger the change in distance (traveled) or size (scaling) of the element, the longer the
animation takes," and "Carbon uses a non-linear duration scale to achieve better perceived
consistency across all distances"
([Carbon motion overview](https://carbondesignsystem.com/elements/motion/overview/)). Atlassian says
the same thing in guidance form: "Keep small elements (hover states, micro-interactions) fast and
understated. Allow larger elements (like Panel or Modal entrances) more time and expression"
([Atlassian motion](https://atlassian.design/foundations/motion)). This is the source that justifies
the one token section (f) adds.

Apple supplies the pattern in its strongest form. Sheets present with detents, where "large is the
height of a fully expanded sheet and medium is about half of the fully expanded height," and on iPad
"it's possible to create a sheet with detents... often a popover is wanted instead that adapts to a
sheet in compact"
([Sheets](https://developer.apple.com/design/human-interface-guidelines/sheets)). The same content in
the same app is a popover at regular width and a sheet at compact width, which is the clearest
published statement that one surface legitimately moves differently at two viewports.

Material's own dialog doc splits basic from full-screen by task rather than by width. A full-screen
dialog "fills the entire screen, containing actions that require a series of tasks to complete," and
the doc notes "there is no specific Material implementation of a full-screen dialog"
([Dialog.md](https://github.com/material-components/material-components-android/blob/master/docs/components/Dialog.md)).
No width threshold and no dialog-specific duration is published beyond the 150ms in and 75ms out of
Motion.md.

**The rule.** Below `sm` (640), a dialog is a bottom sheet, full width, translating its own height. At
`sm` and above it is a centered box that fades and settles a few pixels. The two use the same easing
and different durations, because they travel different distances. No scale at either width, which is
the peripheral-scaling trigger class WebKit names.

### Menus, popovers, and the command palette

Apple is the only system with published guidance here. "On narrow screens (Compact Width), popovers
must adapt to improve usability. On iPhone, popovers appear as a sheet sliding up from the bottom"
([Popovers](https://developer.apple.com/design/human-interface-guidelines/popovers), search-index
extraction, medium confidence on wording). One caveat: an Apple WWDC 2025 session states that
"starting in iOS 26, action sheets behave the same on iPhone as on iPad, appearing directly over the
originating view," so Apple may be retiring the slide-from-bottom half of its own rule. Verify
against the live HIG before leaning on the direction.

Material publishes nothing about menus becoming full-screen or a sheet at narrow widths
([Menu.md](https://github.com/material-components/material-components-android/blob/master/docs/components/Menu.md)).
No primary source in Material, Apple, Carbon, or Atlassian addresses a command palette at phone
width. Cairn is setting its own rule here rather than following one.

**The rule.** A menu or popover anchored to a trigger stays anchored while it fits. Below `sm` it
becomes a full-width sheet at the bottom edge, and it takes the sheet's duration because it now
travels the viewport. The command palette is already a centered overlay at every width; below `sm` it
pins to the top edge, so the on-screen keyboard does not shove it, and it enters on opacity plus an
8px downward translate rather than a slide.

### Toasts

The three systems disagree on position, which is worth recording because it means no position can be
justified by appeal to consensus.

| System | Position | Source |
| --- | --- | --- |
| Material 3 | Bottom of the screen, anchored above a FAB or bottom nav; on medium and expanded windows "snackbars should scale horizontally to accommodate longer text strings" | [Snackbar.md](https://github.com/material-components/material-components-android/blob/master/docs/components/Snackbar.md), [M3 snackbar specs](https://m3.material.io/components/snackbar/specs) |
| Carbon | "Toast notifications slide in and out from the top right of the screen," stacking downward, persisting by default or dismissing after five seconds | [Carbon notification usage](https://carbondesignsystem.com/components/notification/usage/) |
| Atlassian | Flags "appear by overlaying content at the bottom left of the screen, emerging from the navigation sidebar" | [Atlassian flag](https://atlassian.design/components/flag) |

DaisyUI's `.toast` defaults to `bottom: 1rem`, `inset-inline: auto 1rem`, `max-width: calc(100vw -
2rem)`, and animates `.25s ease-out` on an opacity-plus-`scale(0.9)` keyframe, gated behind
`@media (prefers-reduced-motion: no-preference)`. The `max-width` already handles the phone case by
letting the toast fill the viewport minus its gutters.

Only Material publishes a viewport rule, and it is about width rather than position. No system says
the anchor moves between phone and desktop.

**The rule.** Bottom inline-end at every width, which matches the shipped DaisyUI default and needs no
override. Enter on opacity plus an 8px translate from the bottom, drop the `scale(0.9)`, and let the
`max-width` carry the phone case. The position does not change with the viewport, so the duration
does not either.

## 10. Resize and breakpoint flips

### A media query change fires the transitions on the properties it changes

This is ordinary transition behavior rather than a special case. When a media query begins matching
and changes a property that carries a `transition`, the property transitions. DaisyUI's drawer is the
worked example in this repo: at 1024px the `.lg:drawer-open` rules change `translate` from `-100%` to
`0%` and `width` from `100%` to `auto`, and both properties carry transitions declared outside the
media query, so dragging a window across 1024 slides and resizes the sidebar rather than swapping the
layout.

Container queries have the same property, because they change the same declarations from a different
trigger. Moving a breakpoint into a container query changes what observes the size, not whether the
resulting property change transitions.

### The published suppression technique

CSS-Tricks publishes the canonical one, with the rationale stated plainly: "Some of them get triggered
when the window is resized because they have to do with size of the page or position or padding or
something... the fact that the transition or animation runs may contribute to a feeling of jankiness
as you resize the window"
([Stop animations during window resizing](https://css-tricks.com/stop-animations-during-window-resizing/)).
The implementation is a class plus a trailing timer:

```javascript
let resizeTimer;
window.addEventListener("resize", () => {
  document.body.classList.add("resize-animation-stopper");
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    document.body.classList.remove("resize-animation-stopper");
  }, 400);
});
```

```css
.resize-animation-stopper * {
  animation: none !important;
  transition: none !important;
}
```

### GNOME argues the other way, and its own code does not

The GNOME HIG asks for the opposite: "Resizing the window should be smooth and glitch-free. For
example widgets should not jump around or disappear without an animation"
([Adaptive](https://developer.gnome.org/hig/guidelines/adaptive.html)). Its own mechanism does not
deliver that. `AdwBreakpoint` describes a size threshold whose setters set "the target property on
their target object to the specified value, and reset it back to the original value when it's
unapplied," with no animation mentioned anywhere in the class
([AdwBreakpoint](https://gnome.pages.gitlab.gnome.org/libadwaita/doc/main/class.Breakpoint.html)).
A libadwaita breakpoint apply is a snap. The HIG sentence is best read as a prohibition on visible
tearing and on content vanishing with no explanation, rather than a requirement to animate the layout
switch itself.

### View Transitions do not apply here

A resize is not a navigation and not a DOM update, so `document.startViewTransition` has nothing to
wrap. The API captures a snapshot of the old state and cross-fades it against the new one, which is
the wrong shape for a continuous drag: a resize produces a stream of intermediate widths rather than
one before and one after. Nothing in the spec offers a resize entry point
([CSS View Transitions 1](https://drafts.csswg.org/css-view-transitions-1/)).

### The rule

A layout change caused by a viewport resize, an orientation change, or a breakpoint flip snaps. Three
reasons, each from a source above. The user is already producing the motion by dragging or rotating,
so the interface adding its own is redundant. The properties that change at a breakpoint are the
layout properties the ruleset already bans from transitioning. And the change is not feedback for an
action the user took inside the interface, which is the only thing this motion language animates.

Implement it two ways, both cheap. Scope every transition so that no declaration lands on a property a
media query changes, which is the structural fix and the one that also stops the zen sidebar slide.
Then add the resize-stopper class as the backstop for the cases that slip through, keyed on `resize`
so it covers orientation changes too, since an orientation change fires `resize`.

## 11. Route transitions

### What the platform does by default

The View Transitions API's default is a cross-fade at a published duration. The UA stylesheet sets
`animation-duration: 0.25s` and `animation-fill-mode: both` on `:root::view-transition-group(*)`
([MDN ::view-transition-group](https://developer.mozilla.org/en-US/docs/Web/CSS/::view-transition-group)),
and the old and new pseudo-elements inherit that duration and run `-ua-view-transition-fade-out` and
`-ua-view-transition-fade-in`, which animate opacity only
([MDN ::view-transition-old](https://developer.mozilla.org/en-US/docs/Web/CSS/::view-transition-old),
[CSS View Transitions 1](https://drafts.csswg.org/css-view-transitions-1/)). Height and width changes
get a scaling animation and position and transform changes get a movement animation, so a transition
between two differently shaped pages is not purely a fade
([MDN, Using the View Transition API](https://developer.mozilla.org/en-US/docs/Web/API/View_Transition_API/Using)).

### What the frameworks publish

SvelteKit's `onNavigate` "runs the supplied callback immediately before we navigate to a new URL,"
and returning a promise lets the callback drive `document.startViewTransition`
([$app/navigation](https://svelte.dev/docs/kit/$app-navigation)). The official recipe:

```javascript
import { onNavigate } from '$app/navigation';

onNavigate((navigation) => {
	if (!document.startViewTransition) return;

	return new Promise((resolve) => {
		document.startViewTransition(async () => {
			resolve();
			await navigation.complete;
		});
	});
});
```

The same post notes that "reduced motion does not necessarily mean no animation" and offers both a
blanket `animation: none !important` under `prefers-reduced-motion` and a narrower
`no-preference` wrapper ([SvelteKit view transitions](https://svelte.dev/blog/view-transitions)).

Astro ships `fade` as its default, "an opinionated crossfade animation," with `slide` and `none` as
alternatives, and takes the blanket position on preferences: the `<ClientRouter />` component
"includes a CSS media query that disables all view transition animations... whenever the
`prefers-reduced-motion` setting is detected," swapping the DOM instead
([Astro view transitions](https://docs.astro.build/en/guides/view-transitions/)). Chrome's own
guidance publishes the same blanket snippet while cautioning that suppressing everything "may not
align with user intent," preferring "a more subtle animation, but one that still expresses the
relationship between elements"
([Chrome, same-document view transitions](https://developer.chrome.com/docs/web-platform/view-transitions/same-document)).

### The recommendation for the admin

No route transition in the admin, at any viewport, on any input device.

Four reasons. A cross-fade between two admin pages carries no information, because the two pages have
no spatial relationship to express; the first read's rule that motion confirms rather than announces
rules it out on its own. The default 0.25s duration is paid before the new route's first paint, which
makes an editing tool feel slower for no gain. A view transition holds a snapshot over the live DOM
while it runs, which collides with the admin's focus management, and the zen constraint in section (d)
applies here too: focus must land on the first frame. And the family already made this decision and
wrote it down. The showcase site runs the recipe at 0.18s, double-guarded, and the comment on the rule
scopes it deliberately: "This lives only in the (site) group's layout, so the admin never
cross-fades."

The positive form of the rule: a route change snaps, and the arriving page announces itself through
focus and a live region rather than through motion. That is also what the reader with reduced motion
gets, so there is one behavior to build and one to verify.

## 12. Case-by-case rules

Every case in one table. "Token" names the duration from section (f). A dash means the case carries no
motion at all, which is a decision rather than an omission.

| Case | Desktop pointer | Touch phone or tablet | Reduced motion | Token |
| --- | --- | --- | --- | --- |
| Hover | Paint only, inside `@media (hover: hover)` | No hover state exists | Unchanged, paint carries no positional motion | `tap` |
| Press | Paint change on `:active` | Same, and it is the only feedback | Unchanged | `tap` |
| Focus, keyboard | `outline-*` and `box-shadow` | Same, external keyboard | Unchanged | `tap` |
| Focus, pointer | No ring paints, so no motion | No ring paints | Nothing to reduce | - |
| Enter, small element | Opacity plus a translate under 8px | Same | Opacity only | `settle` |
| Exit, small element | Opacity, `--cairn-ease-in` | Same | Opacity only | `quick` |
| Disclosure, accordion | `grid-template-rows` plus opacity | Same | Layout snaps, opacity stays | `quick` |
| Tooltip | Opacity, 75ms delay, hover-gated | Suppressed; no tooltip on a coarse pointer | Unchanged where it shows | `settle` |
| Popover, menu | Opacity plus 4px from the trigger edge | Full-width bottom sheet below `sm` | Opacity only | `settle`, `sheet` below `sm` |
| Command palette | Opacity plus 4px, centered | Pinned to the top edge, opacity plus 8px | Opacity only | `settle` |
| Dialog | Opacity plus a 2% translate, no scale | `modal-bottom`, full width, travels its own height | Opacity only, no geometry | `settle`, `sheet` below `sm` |
| Drawer, overlay | Not reachable; the sidebar is persistent | Translate 100% from the inline start, scrim fades | Scrim fades, panel snaps | `sheet` |
| Drawer, persistent | No motion; it is furniture | Not reachable at this width | Nothing to reduce | - |
| Breakpoint flip | Snap | Snap | Snap | - |
| Window resize | All motion suppressed while resizing | Not reachable | Suppressed | - |
| Orientation change | Not reachable | Snap, same suppression | Snap | - |
| Route change | Snap | Snap | Snap | - |
| Page-level mode change, zen | The sequence in section (g) | Chrome fade only, no geometry | One 150ms opacity cross-fade | `shift` |
| List or table row added | Snap | Snap | Snap | - |
| Row removed | Snap | Snap | Snap | - |
| Row reorder, sort, filter | Snap | Snap | Snap | - |
| Toast | Opacity plus 8px from the bottom, bottom inline-end | Same anchor, width capped at the viewport minus gutters | Opacity only | `settle` |
| Live region, `aria-live` | No motion | No motion | No motion | - |
| Form validation message | No motion; the layout shift snaps | Same | Snap | - |
| Theme change, explicit toggle | Scoped cross-fade on the chrome surfaces | Same | Snap | `settle` |
| Theme change, OS or first paint | Snap | Snap | Snap | - |
| Skeleton, shimmer | The DaisyUI 1.8s loop | Same | Static tint, no loop | - |
| Spinner, progress | Runs; it is essential state | Runs | Runs; it conveys information | - |
| Tabs | Indicator paint only, no sliding underline | Same | Unchanged | `tap` |
| Sticky header collapse on scroll | None | None | Nothing to reduce | - |
| Pull to refresh, overscroll | None | None; `overscroll-behavior: contain` on the editor pane | Nothing to reduce | - |

Four rows need their reasoning recorded, because each departs from something.

**Theme change departs from the first read.** Section (c) lists theme change under "what snaps,
always." The showcase site already ships a narrower rule that is better: a `theme-flip-transition`
class lands on `<html>` for the duration of one explicit click, scoping a 0.2s cross-fade to four
chrome surfaces, so an OS scheme change and a first paint never animate
(`examples/showcase/src/theme/theme.css`). The distinction is the trigger rather than the property. A
user who clicked the toggle is owed confirmation; a user whose OS switched at sunset is not. The
admin's toggle is the same control, so it should behave the same way. Adopt the site's rule and scope
it to the admin shell's own surfaces.

**Skeletons run, and reduced motion stops them.** WCAG 2.2.2 Pause, Stop, Hide, level A, applies to
motion that "starts automatically, lasts more than five seconds, and is presented in parallel with
other content" ([SC 2.2.2](https://www.w3.org/TR/WCAG22/#pause-stop-hide)). A shimmer that outlives a
slow save qualifies. DaisyUI already handles it: `.skeleton` runs `animation: 1.8s ease-in-out
infinite skeleton` only inside `@media (prefers-reduced-motion: no-preference)` and falls back to a
flat `background-color: var(--color-base-300)` otherwise. Nothing to override.

**Row add, remove, and reorder all snap.** This is where cairn declines the strongest advice it found.
Carbon recommends staggering: "staggering the entrance of table content by 20 ms significantly reduces
the cognitive load," with the total kept inside 500ms
([Carbon choreography](https://carbondesignsystem.com/elements/motion/choreography/)). Apple keeps
"essential transitions such as a list insertion" even under Reduce Motion. Both are right for a list
a reader is browsing. The admin's lists change because the editor just saved, sorted, or filtered,
and the editor already knows what changed, so an animation is confirming something the user caused
and can already see. The first read put list reflow under "what snaps," and the responsive axis adds
a second reason: at 320 a reflowing list is most of the viewport, which is the peripheral-motion
class WebKit names.

**Scroll-linked motion is absent by choice.** Material publishes three collapsing behaviors for its
top app bar, including `pinnedScrollBehavior`, where "the app bar remains in place and does not react
to scrolling"
([TopAppBarScrollBehavior](https://kotlinlang.org/api/compose-multiplatform/material3/androidx.compose.material3/-top-app-bar-scroll-behavior/)),
and Apple's large titles collapse into the navigation bar on scroll. Both are phone patterns for
reclaiming vertical space on a reading surface. The admin's editing surface is the thing that needs
stable geometry, and a header that changes height while someone types moves the text under the caret.
web.dev's scroll guidance points the same way: "scrolling animations can cause vestibular disorders
when elements other than the main element associated with the scrolling move around a lot"
([web.dev, prefers-reduced-motion](https://web.dev/articles/prefers-reduced-motion)). Pull-to-refresh
is declined for a different reason: there is nothing to refresh, since the admin's content changes
when the editor changes it. `overscroll-behavior: contain` on the editor pane is worth setting anyway,
since it "disables native browser navigation, including the vertical pull-to-refresh gesture and
horizontal swipe navigation"
([MDN overscroll-behavior](https://developer.mozilla.org/en-US/docs/Web/CSS/overscroll-behavior)),
which stops a scroll inside the editor from bouncing the page behind it.

## (f) Recommended ruleset, revised

This supersedes section (c). The changes are one new duration, one gate rule, two new snap cases, and
a revised theme rule. Everything else is section (c) unchanged.

```
## Motion

The admin's motion register is GNOME's: short, eased out, one property at a time, and never
something the eye is meant to follow. Motion confirms that something happened. It never
announces it. The register does not change with the viewport or the input device. What
changes is how far a surface travels, and duration follows travel.

Tokens. Five durations and three curves. A component that needs a sixth of either is wrong.
  --cairn-dur-tap:    100ms   hover, press, focus ring, disabled, any paint-only feedback
  --cairn-dur-quick:  150ms   small local state: caret, chip, disclosure, inline validation
  --cairn-dur-settle: 200ms   the default: menus, popovers, tooltips, toasts, desktop dialogs
  --cairn-dur-sheet:  250ms   a surface whose travel is the viewport, not its own box
  --cairn-dur-shift:  300ms   page-level mode change only. Zen is the sole use today.
  --cairn-ease-out:   cubic-bezier(0.25, 0.46, 0.45, 0.94)  Adwaita's curve. Enters, settles.
  --cairn-ease-in:    cubic-bezier(0.4, 0, 1, 1)            Exits only.
  --cairn-ease-move:  cubic-bezier(0.4, 0, 0.2, 1)          Visible throughout, moves or resizes.

Sheet is not a phone token. It is the token for full-viewport travel, which is a thing that
happens on a phone. A bottom-sheet dialog at 390 travels the viewport's height; the same
dialog at 1440 travels ten pixels and takes settle. One surface, two distances, two
durations.

Enter and exit are asymmetric. An exit runs one duration band faster than its enter and uses
--cairn-ease-in. A settle-band panel enters at 200ms ease-out and leaves at 150ms ease-in. The
way out is never a wait.

Modality. Every hover-state transition lives inside @media (hover: hover). Tailwind's hover:
variant already compiles that way; hand-written :hover rules and DaisyUI's ungated components
(menu, dropdown, tooltip, select, fab) need the guard added. On touch, press carries the same
feedback at --cairn-dur-tap with no delay. Nothing is revealed by hover at any width.

What animates. Only opacity, color, background-color, border-color, box-shadow, outline-*,
rotate, translate, scale, and grid-template-rows. A translate stays under 8px, except a sheet,
which travels its own height and takes --cairn-dur-sheet.

What snaps, always, with no transition:
  - Route change between admin pages. No view transition, at any width.
  - Any layout change caused by a resize, an orientation change, or a breakpoint flip.
  - A drawer or panel that is persistent at this width. Furniture does not enter.
  - Text content replacing text content, including a changed label.
  - A list reflowing after a save, a sort, or a filter, including row add, remove, and reorder.
  - Validation messages and the aria-live feedback region. The reader needs them now.
  - Anything sized by the user's own typing.
  - width, height, top, left, right, bottom, margin, padding, font-size. Ever.

Theme change follows its trigger, not its property. An explicit toggle click gets one
--cairn-dur-settle cross-fade, scoped to the shell's chrome surfaces by a class present for
that flip only. An OS scheme change and a first paint snap.

Reduced motion degrades by property class, it does not blank.
  - Paint (opacity, colour, shadow, outline): unchanged. These carry no positional motion and
    removing them removes the feedback.
  - Transform (translate, scale, rotate): duration to 0.01ms, substitute an opacity fade at the
    same band. 0.01ms and not 0s, so transitionend still fires.
  - Layout (grid-template-rows, min-height): 0.01ms. Snap.
  - Page-level mode change: one 150ms opacity cross-fade, no geometry, no delay.
  - Looping motion (skeleton shimmer): off entirely, static tint instead.
```

### Why `--cairn-dur-sheet` earns a fifth duration

Section (c) said a fifth duration means something is wrong, and that rule was written before the
responsive axis was in scope. The fifth is not a fifth band. It is the second value of an existing
role, and the two never apply at the same viewport, so no component ever chooses between them.

The sources. Carbon states the principle: duration "should be dynamic based on the size of the
animation; the larger the change in distance (traveled) or size (scaling) of the element, the longer
the animation takes," on a "non-linear duration scale"
([Carbon motion overview](https://carbondesignsystem.com/elements/motion/overview/)). Atlassian states
the practice: "Allow larger elements (like Panel or Modal entrances) more time"
([Atlassian motion](https://atlassian.design/foundations/motion)). Material encodes it in its tiers,
with navigation patterns at 300ms and dialogs at 150ms
([Motion.md](https://github.com/material-components/material-components-android/blob/master/docs/theming/Motion.md)).
The measured gap is in this repo's own dependencies: DaisyUI runs a 100%-of-viewport bottom sheet and
a 2%-of-box centered dialog at the same 300ms.

Two alternatives were considered and rejected. A per-breakpoint override of `--cairn-dur-settle`
inside a media query hides the reason for the change, and the audit's vocabulary check cannot tell a
legitimate override from a drift. A continuous function of travel distance, which is what Carbon's
Motion Generator computes, needs a JavaScript measurement per open and produces values no static rule
can check. A named token for one extra travel class costs one line and stays inside a vocabulary
check.

### What the revised ruleset asks the audit rules to do

Section (e)'s three changes all still apply. Four additions, in the same spirit:

- **`motion-band`'s vocabulary check gains `--cairn-dur-sheet`.** Five legal durations rather than
  four. The band stays 100ms to 300ms.
- **A hover rule.** A declaration that transitions a property under a `:hover` selector is an error
  unless the rule sits inside `@media (hover: hover)`. This is statically checkable, it is the exact
  construct `cairn-admin.css` line 1002 already models, and the DaisyUI override check in section (e)
  should assert the guard exists for `menu`, `dropdown`, and `tooltip`.
- **A breakpoint rule.** A property that any media query in the same file changes must not carry a
  transition declared outside that media query. This is the static half of the resize finding, and it
  catches the drawer case without needing a render.
- **A view-transition rule.** `view-transition-name` and `::view-transition-*` are errors anywhere in
  the admin's CSS, and `startViewTransition` is an error anywhere under `src/lib`. This encodes "no
  route transitions in the admin" as a gate rather than a paragraph, which is the watch-item rule this
  repo already follows.

The responsive half of the ruleset is checkable in a different place. The showcase's visual suite
already runs the five-viewport bar (`examples/showcase/e2e/admin-visual.spec.ts`, `SIGNUPS_WIDTHS =
[320, 390, 768, 1440, 2560]`), so the sheet-versus-dialog and overlay-versus-persistent decisions have
a home. The motion itself does not: a still frame cannot show a duration. Add the zen toggle at 390
and at 1440, and the drawer open at 390, to the reproduction manifest as motion cases for
`visual-verifier`, which is where enter and exit asymmetry already lives.

## (g) Zen mode on phone and tablet

This extends section (d), which described the desktop sequence. Two things change below 1024.

### What zen currently does at each viewport

`isPersistentSidebar` is `!topbar.zen && (isDeskRoute ? matchesXl : matchesLg)`
(`CairnAdminShell.svelte` line 556), so the sidebar is persistent only at 1280 and above on desk
routes and 1024 and above elsewhere. Across the five-viewport bar:

| Width | Sidebar before zen | What zen changes |
| --- | --- | --- |
| 320, 390, 768 | Overlay, closed | Chrome regions only. No sidebar is on screen to remove. |
| 1440 | Persistent on content routes, overlay on desk routes | Chrome, plus the sidebar on content routes |
| 2560 | Persistent everywhere | Chrome, plus the sidebar |

The desktop sequence in section (d) therefore has a fourth actor that section (d) did not name: the
sidebar recedes, and today it recedes through DaisyUI's 300ms translate plus 200ms width transition,
which is a layout property animating at the widest viewport. Section (f) bans that. The sidebar should
leave the same way the chrome does, on opacity, and its width should not transition at all.

### Entering zen at 320 and 390

The phone case is simpler than the desktop case, and it is simpler in a way that matters: there is no
geometry change worth animating.

1. **The chrome fades out.** Topbar band, document title, toolbar strip, and footer to `opacity: 0`
   over `--cairn-dur-quick` (150ms) on `--cairn-ease-in`, then leave the DOM. Same as desktop.
2. **The editor card does not move.** At 390 the card is already full width minus its gutters, so the
   padding and max-width transition that carries the desktop change has nowhere to go. Skip the
   `--cairn-dur-shift` geometry step entirely below `sm`. What the reader gains is vertical space, and
   that arrives as a consequence of the chrome leaving rather than as its own animation.
3. **The zen chip arrives last**, over `--cairn-dur-settle` (200ms) with `transition-delay: 150ms`,
   opacity only, no translate. The 4px downward translate the desktop sequence uses is dropped:
   at 390 the chip sits in a corner of a viewport a third the width, so the same 4px reads as a larger
   proportional movement in peripheral vision.

Total is about 350ms, the same as desktop, with one moving part instead of three.

### Entering zen at 768

The tablet case is the phone case plus the card. The editor card at 768 does have room to widen, so
step 2 runs as the desktop sequence describes, over `--cairn-dur-shift` on `--cairn-ease-out`,
overlapping the chrome fade. The sidebar is still an overlay at this width and is closed, so it takes
no part.

### Leaving zen, every viewport

Unchanged from section (d), with one addition. The chip goes first at `--cairn-dur-tap` (100ms), the
card geometry returns at `--cairn-dur-settle` where it changed at all, and the chrome fades back at
`--cairn-dur-quick`. At 1440 and 2560 the sidebar returns with the chrome, on opacity, at the same
150ms, with no translate and no width transition.

### Touch, at every viewport

Zen's control is a chip the reader just tapped. On a coarse pointer the tap already gave its own press
feedback, so the chip's exit needs no additional delay, and the 100ms exit is if anything more
important on touch: the finger is still on the glass, and a control that lingers under it reads as an
unregistered tap. Nothing else about the sequence is modality-dependent.

### Reduced motion, revised for the responsive axis

Section (d)'s rule holds at every viewport: one 150ms opacity cross-fade on the editor card, no
geometry, no chip translate, no delays. Below `sm` there was no geometry transition to remove, so the
reduced-motion path and the ordinary path differ only in the chip's delay and the chrome's fade, which
makes the phone the cheapest viewport to verify the reduced-motion behavior on.

## Second-read confidence notes

- Every DaisyUI, Tailwind, and cairn number in sections 8 through 12 was measured in this repo at the
  pinned versions (`daisyui` 5.7.20, `tailwindcss` 4.3.3) or read from `src/lib`. The hover-gating
  table, the drawer transition declarations, the modal travel distances, and the 34 `@media
  (hover:hover)` blocks in the showcase's built CSS are all direct measurements.
- MDN, the CSS View Transitions spec, SvelteKit, Astro, Tailwind, Carbon, Atlassian, the GNOME HIG,
  and the libadwaita API docs were all fetched directly and quoted.
- `m3.material.io` renders through JavaScript and returns a bare title to a fetch, so every Material
  claim here comes from the `material-components-android` GitHub docs or
  `developer.android.com`. Where the M3 web page is cited (snackbar specs, window size classes), the
  text was recovered through search-index extraction of that URL and is medium confidence on exact
  wording.
- The Apple HIG pages for sheets, sidebars, split views, and popovers behave the same way. Their
  quotes are medium confidence on wording and high confidence on substance. The iOS 26 action-sheet
  change is flagged rather than relied on, and the HIG should be re-read before the pass builds
  anything that assumes a popover becomes a bottom sheet.
- Two claims were sought and not found in any primary source, which are findings rather than gaps in
  the search. No design system publishes guidance on command-palette behavior at phone width. No
  design system publishes guidance that focus-ring motion should differ between keyboard and pointer
  focus, which is unsurprising once `:focus-visible` is doing that work in the selector.
- The two corrections at the top of this second read (zen already animates the sidebar, and the
  showcase already ships a route transition scoped away from the admin) were read from the current
  source on `main` and should be re-verified on a render, not taken from this document.
