# cairn-audit: rules and fixes

## Contents

- [Run it and read it](#run-it-and-read-it)
- [Fix in the markup, not around it](#fix-in-the-markup-not-around-it)
- [Static rules](#static-rules)
- [Configuration](#configuration)
- [Rendered mode](#rendered-mode)
- [Rendered rules](#rendered-rules)
- [The rendered allowlist](#the-rendered-allowlist)
- [The norms query](#the-norms-query)

## Run it and read it

```bash
npm run check:cairn              # scaffold script: compile .cairn/admin.css, then the static rules
npx cairn-audit                  # the static rules alone
npx cairn-audit --rule list-role # narrow to one or more rule ids (repeat the flag)
npx cairn-audit --rendered       # the rendered rules, against a running server
npx cairn-audit --fail-on advisory
npx cairn-audit norms <role>     # a component's measured norm
```

Run the audit before the first edit, so the fix answers the findings it names. Rerun it after the
fix, and report each rule id that fired, what it required, and the final exit code. Exit 0 means no
unsuppressed error-tier finding; 1 means at least one; 2 means the run could not start or finish
(bad flag, malformed config, no server, no browser) and is never a design verdict. Advisory
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
(daisyUI's `.menu :where(li)`) is caught only by the rendered `list-role`.

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
| `rendered.pages` | the core admin routes | replaces the list |
| `rendered.extraPages` | none | adds pages; name your screen here |
| `rendered.allowlist` | none | rendered exemptions |

## Rendered mode

Start the server yourself; the harness never does. It reads `BASE_URL` (default
`http://localhost:4173`) and needs Playwright installed in the site.

```bash
npm run build && npm run preview -- --port 4173
CAIRN_AUDIT_COOKIES='cairn_session=<id>' npx cairn-audit --rendered
```

- Every page renders in both themes, always.
- The run fails instead of reporting clean when no rules or pages are configured, the server does
  not answer, Playwright is missing, or a page answers outside 2xx.
- Without a session cookie every authenticated page redirects to sign-in; when every page carries
  the login page's identity the run exits 2 and names `CAIRN_AUDIT_COOKIES`. The value is
  Cookie-header syntax; an entry with no `=`, an empty name, or the name `cairn-admin-theme`
  throws.
- A page whose hydrated `<title>` or `<main>` landmark differs from what the server sent reports
  `rendered.page-identity-mismatch` (error) and is not measured. A page with no `<main>` on both
  sides counts as agreement.

## Rendered rules

| Rule | Tier | Measures | Exempt or not covered |
|---|---|---|---|
| `one-filled-action` | error | at most one accent-filled control per surface; a surface is the topmost open layer, split by `<nav>` and `<aside>` only | ink fills (`btn-neutral`); a dialog is its own surface |
| `focus-renders` | error | every tab stop paints a focus change | |
| `interactive-contrast` | error | interactive text at least 1.5:1 against its composited ground, opacity included | disabled controls; not a legibility check |
| `touch-targets` | error | every target at least 24x24 px at 390 wide; the box, a `::before` expansion, or an activating label counts | WCAG spacing exception not applied; 320 not sampled; `textarea` and widget roles outside the net; off-canvas skip links |
| `viewport-overflow` | error | nothing wider than the viewport at 390 and 320 | content inside a scroll container |
| `panel-width` | error | an `ExpandableRow` row or panel clips nothing at 390 or 320 | a scrolling `AdminTable` wrap; native inputs; `text-overflow: ellipsis` |
| `list-role` | error | a list item's computed display is not `list-item` while the list has no role | lists with an explicit role |
| `chip-ground-collision` | advisory | a chip fill at least 1.5:1 against its ground | `badge-outline`; quiet and warning chips report by design |
| `border-contrast` | advisory | a border at 3:1 against one side | `--cairn-card-border` (rule-declared) |
| `weight-budget` | advisory | at most two font weights per content region | nav, buttons, `thead`, a header holding its heading |
| `norms-bands` | advisory | heights, paddings, radii, borders against the norms bands | unbanded entries |
| `screen-anatomy` | advisory | one `h1` inside `PageHeader`, a `card-shell` region, filled actions only in the header slot or the card | desk routes |
| `relational-spacing` | advisory | nested gaps never wider than their container; label at the label gap; siblings at one gap | |
| `form-font-parity` | advisory | form controls inherit the theme root's font | `font-mono`, `font-sans`, `font-serif`, arbitrary families |
| `field-edge-alignment` | advisory | controls in one column share a left edge within 1.5px | |
| `container-inset-asymmetry` | advisory | `card-shell`, `list`, or `modal-box` content more than 24px closer to one side (often a bare `<ul class="list">` keeping its bullet indent) | |
| `motion-reduced-delay` | advisory | no transition or animation delay survives reduced motion | |

The audit is a design-language check, not accessibility conformance: run axe-core or Lighthouse
for text contrast and focus appearance.

## The rendered allowlist

A rendered finding has no source line, so it is exempted in `rendered.allowlist` by page,
selector (the signature the finding prints), reason, and, for an advisory rule, `rule`:

```json
{ "rendered": { "allowlist": [
  { "page": "/admin/items", "selector": ".legacy-badge", "reason": "replaced next release", "rule": "border-contrast" }
] } }
```

| Finding | Meaning |
|---|---|
| `rendered.allowlist-stale` | the selector matched nothing the run visited |
| `rendered.allowlist-unprobeable` | the browser could not parse the selector (always advisory) |
| `rendered.allowlist-dead` | the selector matches, but the entry suppressed nothing |
| `rendered.state-unreachable` | a rule's interaction state (`row-expanded`) never happened on a page; advisory, ordinary on a page with no `ExpandableRow` |

A stale or dead entry reports at its named rule's tier, or error with no `rule`. Only an advisory
rule can carry its own exemption; on an error-tier finding the run refuses it and the exit code
stands.

## The norms query

`npx cairn-audit norms <term>` takes a role id, a class, or a selector (`button-primary`,
`button-ghost`, `input-text`, `select`, `status-chip`, `card`, `table-cell`,
`table-header-cell`, `nav-item`, `page-title`, `eyebrow`, `icon`). An unknown term exits 2 and
lists the roles. A `recipe:` line names the class to write.

Each entry is one property: **Band** (the observed values, as px, a ratio, keywords, or a
relationship such as `var(--cairn-card-border)`, never a resolved palette value), **Sites** (the
distinct elements behind it; a theme repeat counts once), **Provenance** (`ratified` when a
recorded decision settles it and the render matches, else `observed`), and **Flags**:

| Flag | Read it as |
|---|---|
| `open-question` | a measurement, not ground truth; never `ratified`; `norms-bands` treats it as unbanded |
| `single-observation` | one component's value, not a distribution |
| `ratified-drift` | the render no longer matches its decision; provenance falls to `observed`; unbanded |
| `literal-dropped` | an observation resolved to a palette value and was left out of the band |
