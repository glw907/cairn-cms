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
