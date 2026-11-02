# cairn-audit: rules and fixes

## Contents

- [Run it and read it](#run-it-and-read-it)
- [Fix in the markup, not around it](#fix-in-the-markup-not-around-it)
- [Static rules](#static-rules)
- [Configuration](#configuration)

## Run it and read it

```bash
npm run check:cairn              # scaffold script: compile .cairn/admin.css, then the static rules
npx cairn-audit                  # the static rules alone
npx cairn-audit --rule list-role # narrow to one or more rule ids (repeat the flag)
npx cairn-audit --fail-on advisory
```

Run the audit before the first edit, so the fix answers the findings it names. Rerun it after the
fix, and report each rule id that fired, what it required, and the final exit code. Exit 0 means no
unsuppressed error-tier finding; 1 means at least one; 2 means the run could not start or finish
(bad flag, malformed config) and is never a design verdict. Advisory
findings print without changing the exit code unless `npx cairn-audit --fail-on advisory` is set. An unknown
`--rule` id exits nonzero.

## Fix in the markup, not around it

A finding on a screen is fixed in that screen's markup. Do not add a suppression comment, a
`cairn-audit.config.json` that narrows a scope, or an edit to the admin stylesheet, the audit's
rules, or `node_modules` to make a run pass. A suppression is for a finding you judge deliberate:

```svelte
<!-- cairn-audit-disable-next-line type-scale -- the wordmark's optical size sits off the scale -->
<span class="type-title">Cairn</span>
```

It needs a reason after `--`; it silences only the rule it names, over the next syntax-tree node;
a reasonless or dead directive is its own error under the rule id `suppression`, which cannot be
suppressed; and the summary always counts suppressions. Report every one you add.

## Static rules

The static scan reads `.svelte` components under the static scope, resolving each class token
against the compiled admin sheet, and reads scoped `<style>` blocks and `static.cssFiles`.
Error tier unless marked.

| Rule | Fires when | Fix |
|---|---|---|
| `no-uncompiled-class` | a class compiles into no configured sheet and no scoped `<style>` defines it | use a class the admin sheet ships, move the file under `src/routes/admin` or `src/lib/admin`, or define it in the scoped style |
| `type-scale` | a text-size class is not a `type-*` role (`text-sm`, `text-[13px]`) | use `type-title`, `type-heading`, `type-subtitle`, `type-body`, `type-meta`, `type-label`, or `type-chip` |
| `gap-scale` | a bracketed margin, padding, or gap is off the `--cairn-gap-*` roles and Tailwind's half-steps | use `gap-label`, `gap-control`, `gap-group`, `gap-section`, or a named spacing step |
| `radius-scale` (advisory, error at 0.99.0) | a bare, fixed, or arbitrary `rounded-*` class | `rounded-selector` (chip), `rounded-field` (control), `rounded-box` (card, dialog) |
| `stock-default-hazards` | `badge-ghost` | `StatusChip`, or `badge` plus `cairn-chip-quiet`, `cairn-chip-warning`, or `cairn-chip-outline` |
| | a bare `dropdown` wrapper (opens on focus, ignores Escape) | a daisyUI popover dropdown (`popover` attribute) or an explicit `dropdown-open` state toggle |
| | a native `disabled` on a guarded button | `aria-disabled`, with the reason in a `Tooltip` |
| | `border-base-300` on a floating card | `card-shell card-shadow` |
| | the retired `cairn-btn-guarded` class | wrap the control in `Tooltip` |
| | (advisory) `bg-neutral` on a `btn`; `bg-primary/10` on a `btn`; `shadow-none` on a `btn` | `btn btn-neutral`; `btn btn-soft btn-primary`; delete it |
| `token-colors` | a hex, `rgb()`, named, or zero-chroma color outside `static.paletteFiles` | a palette token (`var(--color-*)`, `text-muted`) |
| `grammar-boundary` | CSS redeclares a grammar token | retune palette tokens only |
| `focus-parity` | a hand-written `:hover` selector has no `:focus-visible` (or `:focus-within`) sibling | add the sibling selector |
| `motion-band` | a duration outside 70ms to 400ms, or `transition: all` | a `--cairn-dur-*` token; name the properties |
| `motion-property` | a transition or animation names a property off the motion allowlist (layout properties such as `width` or `margin` judder) | animate only `opacity`, `color`, `background-color`, `border-color`, `box-shadow`, the `outline-*` color, width, and offset, `rotate`, `translate`, `scale`, `transform`, or `grid-template-rows`; `display` and `overlay` pass with `allow-discrete` |
| `motion-vocabulary` | a literal duration or easing | `var(--cairn-dur-*)` and `var(--cairn-ease-*)` |
| `motion-hover-gate` | hover motion outside `@media (hover: hover)` | wrap the hover rule in that query |
| `reduced-motion` | a selector with motion has no `prefers-reduced-motion: reduce` counterpart | restate it inside that guard |
| `stripe-trim-parity` | zebra rows plus an unconditioned first or last child padding trim | scope the trim, for example `:last-child:nth-child(odd)` |
| `unlayered-font-clobber` | a scoped style sets a font property on an element that also carries a font utility | move the typography to an ancestor, or drop one of the two |
| `list-role` | a `ul`, `ol`, or `menu` with no role whose marker is suppressed (`list-none`, or an item with `flex`, `grid`, `block`, `inline-flex`) | `role="list"` on the list and `role="listitem"` on each item whose class changed its display |
| `log-event-grammar` | a log call's literal event name is reserved or not `area[.subject].verb_phrase` | rename the event |
| `log-secret-field` | a log call's fields key matches a redacted key name | drop the field; keep the value out of the message too |
| `public-literals`, `theme-conformance`, `theme-contrast` (advisory) | public files only, never an admin screen | see the public styling skill |

Motion values: the five durations are `--cairn-dur-instant` (70ms), `-quick` (110ms), `-base`
(150ms), `-shift` (240ms), and `-settle` (400ms); the curves are `--cairn-ease-standard`,
`-entrance`, and `-exit`. A `transition-*` utility with no duration or easing runs on the base
duration and standard curve. The motion rules exempt daisyUI component classes and Tailwind's six
`transition*` utilities on the class side, check an `animate-*` utility through its keyframes, and
allow one element per component to transition `margin-left` when it carries
`data-cairn-motion="frame-offset"` as a literal value (a bound value claims nothing).

`list-role` static reads only an element's own classes. A list reshaped by a selector on the list
(daisyUI's `.menu :where(li)`) is not seen by this rule.

## Configuration

Everything defaults. Write `cairn-audit.config.json` in the site root to override (the scaffold
ships one naming both sheets), or pass `--config <path>`.

| Key | Default | Note |
|---|---|---|
| `static.scope` | `src/routes/admin`, `src/lib/admin`, `src/lib/admin-toolkit` | replaces the defaults; a named path that does not exist fails the run |
| `static.adminScope` | same three | where the three admin-only motion rules run; name screens kept elsewhere |
| `static.sourceScope` | `src` | the plain-text walk for the two log rules |
| `static.cssFiles` | none | standalone CSS the CSS rules also read |
| `static.paletteFiles` | the engine's admin sheet | files `token-colors` skips; name your theme file |
| `sheet` | your build's sheet, else the installed package's | list `.cairn/admin.css` beside `node_modules/@glw907/cairn-cms/dist/admin/cairn-admin.css`; a wrong named path fails the run |

The audit is a design-language check, not accessibility conformance: run axe-core or Lighthouse
for text contrast and focus appearance.
