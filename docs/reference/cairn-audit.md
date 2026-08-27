# The `cairn-audit` CLI

`cairn-audit` is the design-language audit. The package ships it in its `bin` field, so an install
puts it on the project's path.

```bash
npx cairn-audit                          # run the static rules over the admin surfaces
npx cairn-audit --rendered               # run the rendered rules against a running admin
npx cairn-audit norms <selector-or-role> # look up a measured norm
```

The static audit reads the working directory. The `norms` subcommand reads only the manifest inside
the installed package, so it needs no config, no built stylesheet, and no browser.

A build agent points at these mechanical checks rather than holding their formulas in working
memory. The packaged `cairn-admin-screens` skill names them by rule id and defers to the audit for
the details. [`cairn-doctor --fix`](./doctor.md#the---fix-skill-install) installs and
freshness-checks the skill in a consumer repo.

## What ships

`cairn-audit` ships whole, as consumer product: every registered rule, the static and rendered
rule sets alike, the norms manifest the `norms` subcommand reads, and the CLI itself. All 26
registered rules audit the `/admin` surface, and a consumer's admin IS cairn's own admin toolkit,
so conformance to cairn's design system is exactly the product being audited, not apparatus that
measures the engine from outside.

Two things stay engine-side, both apparatus for producing the manifest the CLI ships rather than
part of the audit a consumer runs: the norms generator that renders the admin and derives the
manifest ([Regenerating the manifest](#regenerating-the-manifest)), and the probe scripts that
back a rule's own development. A module under the packed rule directories that no rule registry
reaches fails `check:package`, so the shipped rule set and the registries the tables above
document can't drift apart.

## Tiers and exit codes

Every finding carries a tier. An error-tier finding gates: it exits the command nonzero, and only a
suppression takes it out of that count. An advisory-tier finding reports and can never change the
exit code, because each advisory rule measures a compositional question a legitimately novel
component can answer differently on purpose.

| Code | What happened |
|---|---|
| 0 | No unsuppressed error-tier finding survived |
| 1 | At least one did |
| 2 | The run couldn't start or couldn't finish: a bad flag, a malformed config, no server, no browser |

Exit code 2 is never a design verdict. The audit reports it rather than printing a clean report it
can't stand behind.

## Static mode

`npx cairn-audit`, with no flags, runs the static rules over the admin surfaces in the working
directory. It parses each component with `svelte/compiler` and resolves every class token against
the built admin stylesheet, so a class written as an array, an object, a template literal, or a
`class:` directive reads the same as one written in a plain attribute, and the match is exact.
`text-base`, the size utility, and `text-base-content`, the daisyUI color utility, never read as
the same class.

The CSS-family rules read each component's own scoped `<style>` block, plus any standalone CSS file
`static.cssFiles` names.

### The static rules

Twelve rules run, all error tier.

| ID | What it checks |
|---|---|
| `no-uncompiled-class` | Every class token a component's markup writes compiles into the built admin stylesheet, or is a name that component's own scoped `<style>` block defines. A class that reaches neither is in the author's mind and absent from what ships |
| `type-scale` | Every font size a text-sizing class token resolves to comes from a `--cairn-type-*` role. The rule reads only Tailwind's own text-sizing namespace and the `type-*` role utilities. A daisyUI component class carries its own size as part of the control's chrome, a separate system with its own `btn-sm`-style modifiers |
| `gap-scale` | An arbitrary margin, padding, or gap literal, a Tailwind bracket rather than a named step, resolves to a `--cairn-gap-*` role or lands on an exact half-step of Tailwind's spacing grid. A bracket whose value isn't a plain length, a viewport unit or a `calc()`, expresses geometry the spacing scale has no vocabulary for, so it falls outside the rule rather than failing it |
| `stock-default-hazards` | Four stock daisyUI patterns cairn's own recipes replace: `badge-ghost`, the focus-driven bare `.dropdown`, a native `disabled` on a guarded button, and a flat `base-300` card border. Each finding names the refuted alternative and where the decision is recorded |
| `token-colors` | No raw hex, `rgb()`, or named-color literal, and no pure achromatic, a color function whose chroma or saturation is exactly zero. `transparent` and `currentColor` are excluded: neither names a color the palette could have supplied. A file listed in `static.paletteFiles` is exempt, since writing literal values down is what a palette declaration site is for |
| `grammar-boundary` | CSS never redeclares a grammar token. A site re-tunes the palette tokens freely; a grammar token names structure and holds across both themes |
| `focus-parity` | Every hand-authored `:hover` selector has a sibling selector in the same source that swaps `:hover` for `:focus-visible`, or for `:focus-within` when a container's wash acknowledges a descendant gaining focus. Tailwind's `hover:` variant classes are deliberately out of scope: their keyboard affordance is the admin's blanket focus ring, a real guarantee of a different shape |
| `motion-band` | Every transition or animation duration lands in the admin's `150ms` to `250ms` band, and `transition: all` never ships. A declaration inside a `prefers-reduced-motion: reduce` guard is exempt, since collapsing a duration toward zero is what that guard is for |
| `reduced-motion` | Every selector that declares motion is named again inside an `@media (prefers-reduced-motion: reduce)` guard in the same source |
| `stripe-trim-parity` | A striped row's `:nth-child` background pattern, or a `.table-zebra`-style class, never co-occurs with an unconditioned first/last-child padding trim on the same row class in the same source: the trim clips the stripe fill on an even-count group unless it's scoped to its own parity (`:last-child:nth-child(odd)`). Applies to any row component, not only the admin's own tables |
| `unlayered-font-clobber` | A scoped `<style>` block never declares `font-family`, `font-size`, `font-weight`, or the `font` shorthand outside an `@layer` on an element that also carries a font-affecting utility class (a `text-*` size or a `font-*` weight/family). Under the no-Preflight admin, a Svelte scoped style carries no layer of its own while Tailwind utilities sit in `@layer utilities`, so cascade layer precedence, not specificity, decides the winner; the finding names that mechanism and points at moving the typography onto the ancestor the control inherits from. Applies to any component, not only the admin's own |
| `list-role` | A `<ul>`/`<ol>` carries no role attribute while its marker is suppressed: either its own classes remove it, a `list-style`/`list-style-type: none` declaration such as Tailwind's `list-none`, or an item's classes change that item's rendered display away from `list-item` to another display that still renders the item, such as `flex`, `grid`, `block`, or `inline-flex`, the way daisyUI's own `.list-row` renders `display: grid`. `display: none` (Tailwind's `hidden` and its responsive variants) is excluded: a hidden item never reaches the accessibility tree, so it cannot strip the enclosing list's implicit role. WebKit/VoiceOver stop announcing a marker-suppressed list as a list once it loses its implicit role this way; the fix is `role="list"`. A list already carrying a different explicit role stays exempt: the explicit role already overrides the implicit one on purpose, so a second, conflicting role would be the wrong remedy |

### Suppressing a finding

A static finding sits on a source line, so it's suppressed by a comment beside it:

```svelte
<!-- cairn-audit-disable-next-line type-scale -- the K4 keming fix raised the wordmark off text-xl -->
<span class="text-[1.375rem]">Cairn</span>
```

The directive works in HTML comments in markup, and in `//` and `/* */` comments in scripts and CSS.
Three properties make it honest, and each is its own error-tier finding when it fails:

- **The reason is required.** A directive with no `-- <reason>` reports rather than suppresses.
- **A directive that silences nothing is dead** and reports. An exemption that outlives its finding
  is where the next real one hides.
- **Neither of those errors can itself be suppressed.** A build that passes by suppression has to
  read as one.

Both report under the rule id `suppression`.

The counting contract is the other half. A suppressed finding leaves the exit-code math and stays in
the report: the summary line always prints a suppression total, including when it's zero.

```text
12 files scanned, 9 rules run
0 errors, 0 advisories, 5 suppressed
```

`disable-next-line` resolves to the next syntax-tree **node**, not the next physical line, and
suppresses matching findings anywhere in that node's source range. A directive preceding a
multi-line element covers the whole element, including an attribute several lines down. In a script
or a CSS
block, where there's no template node to attach to, it resolves to the next non-blank line, extended
through a brace block when that line opens one.

A directive only suppresses the rule id it names. A mismatched id suppresses nothing and leaves both
the finding and a dead directive.

## Configuration

Everything defaults, so a project with no config file gets a meaningful run. Write
`cairn-audit.config.json` in the audited root to override, or pass `--config <path>`.

| Key | Default | What it names |
|---|---|---|
| `static.scope` | `src/routes/admin`, `src/lib/admin-toolkit`, `src/lib/components` | Directories the static scan reads components from, recursively |
| `static.cssFiles` | none | Standalone CSS files the CSS-family rules also scan |
| `static.paletteFiles` | the engine's own admin stylesheet | Palette declaration sites `token-colors` skips. Name your own theme file here |
| `sheet` | the built admin stylesheet, in your tree or your installed package | One or more compiled-class sources the `no-uncompiled-class` rule resolves class tokens against, same shape as `static.paletteFiles`. A string still works as a single source. A site with its own compiled stylesheet lists it alongside the packaged one: `"sheet": ["dist/site.css", "node_modules/@glw907/cairn-cms/dist/components/cairn-admin.css"]` |
| `rendered.pages` | the core admin routes | The pages rendered mode visits. **Replaces the defaults, never extends them**: a config naming one page of your own audits that page alone, and the six core routes go unmeasured while the run still reports a clean pass. Restate the defaults beside your own page |
| `rendered.allowlist` | none | Rendered-mode exemptions. See [The allowlist](#the-allowlist) |

A default scan path your tree doesn't have is skipped, since the defaults span a library and a
consumer site. A path you wrote in `static.scope` yourself fails the run when it doesn't exist: a
typo that quietly narrows the audit to nothing is the silent green this engine exists to rule out.

## Rendered mode

Rendered mode checks the admin as it actually renders: computed contrast, computed touch-target
size, and the other measurements a source-only static rule can't reach.

Start the site first. The harness never starts a server. It reads `BASE_URL` (default
`http://localhost:4173`) and fails naming the URL it tried when nothing answers there, the same
contract the norms generator follows. Playwright loads as a dynamic import from the consuming
project's own install, printing `npm i -D playwright && npx playwright install chromium` when it is
absent, so a project that never runs rendered mode takes no browser dependency.

```bash
npm run build && npm run preview -- --port 4173   # in another shell
npx cairn-audit --rendered
```

Every configured page renders under both themes, always: a rule that only holds in one color scheme
is exactly the failure mode this exists to catch. The page list defaults to the core admin routes
and is overridable in `cairn-audit.config.json`'s `rendered.pages`. A rendered rule can also declare
an interaction state beyond a page's rest render, an open menu or a keyboard focus-visible pass, so
it only pays for the capture it actually reads from.

The run fails rather than reporting clean on every shape of silent green: no rules registered, no
pages configured, `BASE_URL` not answering, Playwright absent, or any configured page rendering
outside 2xx, which also catches a page path that names no route.

### The post-hydration page-identity guard

The runner checks every page once, after its own hydration settles, against the identity its
server-rendered response carried: the document title, and a signature of its `<main>`/`[role="main"]`
landmark plus that landmark's first heading, captured from a dedicated no-JavaScript context so the
baseline is genuinely what the server sent. Take a page whose settled DOM no longer matches: the run
navigated to `/admin/edit/some-post` and the DOM that settled belongs to an unrelated 404 or a
different route entirely. The runner reports that page unmeasurable rather than auditing it under
the wrong page's identity: a `rendered-page-identity-mismatch` finding names the route and both
identities, and no rule runs against that page in that theme. This is a harness finding, not a rule
finding, and it gates the exit code at error tier, the same way a stale allowlist entry does: a
route that hydrates into the wrong chrome is a defect worth fixing, not a compositional judgment
call.

The mechanism reads only `<title>`, `<main>`, and `[role="main"]`, none of them cairn-only markup,
so a consumer's own custom route and cairn's shell-less login page (which renders no `<main>` at
all) both stay auditable: a landmark of `null` on both the SSR and the hydrated side counts as
agreement, not as evidence of a swap.

### Auditing an authenticated admin

The admin routes rendered mode visits by default assume an unauthenticated request. Auditing a
consumer's authenticated admin, for example against a local `wrangler dev` carrying a real session,
needs a session cookie in the request. Set `CAIRN_AUDIT_COOKIES` for that, the run-specific
credential belonging in the environment rather than the config file, the same reasoning `BASE_URL`
follows:

```bash
CAIRN_AUDIT_COOKIES='cairn_session=<id>' npx cairn-audit --rendered
```

The value is Cookie-header syntax: `name=value` entries separated by a semicolon. The harness adds
every entry it parses to each browser context alongside the theme cookie. Two things throw rather
than degrading the run silently: an entry with no `=`, or an empty name, since a typo here should never
produce a quietly narrower audit; and an entry named `cairn-admin-theme`, since the run owns that
cookie itself, one per browser context, and a caller override would invalidate the per-theme
measurement.

### The rules

Fourteen rules run. The first five are error tier and exit the command nonzero.

| ID | What it checks |
|---|---|
| `one-filled-action` | At most one accent-filled control per surface. A surface is the topmost open layer, a dialog winning over the page beneath it, partitioned further by `<nav>` and `<aside>`. `<header>`, `<footer>`, and `<main>` itself don't partition: a DOM boundary between a page header and the card beneath it removes none of the harm the rule exists to catch, same visual column, same first look, where a nav rail's persistent chrome genuinely reads as a different part of the screen. "Filled" means the accent, read from the live computed background, so the sanctioned ink fills are exempt by construction rather than by name |
| `focus-renders` | Every tab stop renders a focus indicator. The rule tabs through the whole page and compares each stop's focused paint against that same element's resting paint, so a real outline, a `box-shadow` ring, and a ring an ancestor renders through `:focus-within` all count, and a decorative shadow the element already carries doesn't |
| `interactive-contrast` | Interactive text reads against its own composited background at a ratio of at least 1.5. This isn't a legibility floor. The bar is that a control isn't camouflaged against its own ground. Both the ink and the ground carry every `opacity` in the chain, so a dimmed wrapper lowers the measurement rather than raising it. Disabled controls are exempt |
| `touch-targets` | Every tap target renders at least 24x24 CSS px at a 390px viewport. This is a house floor derived from WCAG 2.2 level AA's success criterion 2.5.8, Target Size (Minimum), and not an implementation of it: the rule enforces a strict superset, so a finding is a house-bar failure and not on its own an AA failure. See [What `touch-targets` doesn't cover](#what-touch-targets-doesnt-cover). The measurement is the activation region rather than the painted box: the control's own box, unioned with a qualifying `::before` inset expansion, plus every label the platform reports as activating the control. A control passes when any one of its regions clears the floor |
| `viewport-overflow` | Nothing renders wider than the viewport at 390 and at 320. Both an element whose own box clears the viewport and an element whose content, an unbreakable string or a bleeding pseudo-element, is wider than its box |

The other nine are advisory. They report and never change the exit code, because each one measures a
compositional question that a legitimately novel component can answer differently on purpose.

| ID | What it checks |
|---|---|
| `chip-ground-collision` | A chip's own painted fill reads against the ground behind it at a ratio of at least 1.5, the same floor `interactive-contrast` applies and for the same reason. Neither rule is a contrast standard; the bar is that the chip isn't camouflaged. At 1.5:1 two surfaces aren't distinct, only not identical. The rule proves neither the chip's own label contrast nor its status cue. A chip is daisyUI's `.badge` or any element that renders as one, and a chip with no fill of its own, the `badge-outline` recipe, is exempt. Where an element outside the chip's own ancestors paints the ground behind it, an overlay chip on a sibling image, the rule reports an advisory naming the ground it couldn't read rather than an error claiming a collision. That painter test is a bounding-box intersection with no paint-order reading, and daisyUI paints a background-image on every `.btn`, so a chip overlapping a button downgrades the same way. **Demoted from error to advisory** (design infrastructure Pass 3, corpus C, 2026-07-28): the formula has no chroma term and cannot see hue, which produced 24 false errors of 40 on the first consumer admin it measured, so as coded it could not serve as a consumer gate. The formula is unchanged; a chroma-aware repair is filed in ROADMAP and re-promotes this rule on re-measured evidence |
| `border-contrast` | A rendered border reads at 3:1 against at least one of the two surfaces it separates. The number is the floor WCAG 1.4.11 sets for a control-identifying boundary, applied here to every rendered border as a house bar: the criterion reaches user interface components and graphical objects, so a finding on a card hairline or a row divider is a design observation and not a conformance failure. Adjacency is measured by hit-testing the pixel beyond each edge, not by walking the DOM, so an overlaid badge is judged against what it sits on. The stroke composites over the element's own fill first, which is where `background-clip: border-box` paints it. Where an ancestor dims the element with `opacity`, the geometric sample already carries that dimming, so the rule reports that it couldn't measure rather than a ratio it can't stand behind |
| `weight-budget` | At most two distinct font-weights per content region. A region is the body text inside `<main>`, or inside an open dialog layer, split at each visible heading, with chrome removed. Chrome is text inside `<nav>` or `[role="navigation"]`; `<button>`, `[role="button"]`, or `<summary>`; a `<header>` or `[role="banner"]` that contains the heading it introduces; and `<thead>` or `[role="columnheader"]`. Each shape is named by an HTML tag or the ARIA role that means the same thing, never by a class, so a rewritten component stays covered. A heading's own weight never spends the budget of the region it opens. Weights count on the hundreds ladder, so a variable-font ramp reads as one weight. Two limits follow from naming shapes rather than components: `PageHeader`'s caller-authored action slot renders inside the same `<header>` as the heading, so whatever a caller puts there is exempt, and a component's own non-chrome parts still spend the budget, such as `Pagination`'s item-range line and rows-per-page label, which sit outside its `<nav>` |
| `norms-bands` | A component's control heights, paddings, padding-to-type ratios, radii, and border treatments against the bands the [norms manifest](#the-norms-query) observed. An entry the manifest flags `open-question` or `ratified-drift` is treated as unbanded: a number that is not settled ground truth is not a reference to measure against |
| `screen-anatomy` | An office screen carries one `<h1>` inside PageHeader's `<header>`, renders a `.card-shell` region, and keeps its accent- and ink-filled actions in the header slot or inside the card. Desk routes are exempt, read from the drawer class the admin shell projects at SSR rather than from path depth |
| `relational-spacing` | The `--cairn-gap-*` scale matches the relationship the markup renders: a nested rhythm never opens wider than the rhythm containing it (per axis), a label sits the gap-label distance above its control, and same-level siblings sit at one gap |
| `form-font-parity` | Every rendered `input`, `select`, `textarea`, and `button` inside the theme root's own subtree computes the same first `font-family` as that root. String equality on the first family, so a control either loaded the reset or it didn't; this is the UA reset layer's own regression tripwire, catching a consumer whose sheet never reached the page. Scoped to the `[data-theme='cairn-admin']`/`[data-theme='cairn-admin-dark']` subtree (falling back to `body`, then the document root, on a page with no theme wrapper), so a control outside the admin theme is never compared against a face it never inherited. A control that opts into its own face on purpose is exempt: `font-mono` or an arbitrary `font-[family-name:...]` class. **Registered provisionally at advisory**: the intended tier is error, promoted only once a CI re-check confirms the rendered suite is green against cairn's own admin and showcase on the CI runner. Error-tier promotion also waits on the exemption net, which is still coarse: it misses variant-prefixed forms (`md:font-mono`, `dark:font-mono`), `font-serif`/`font-sans`, and Tailwind 4's `font-(family-name:--x)` shorthand, any of which would false-positive as a mismatch today (see [ROADMAP.md](../../ROADMAP.md)) |
| `field-edge-alignment` | Within a grid or flex-column container, two or more form controls (`.input`/`.select`/`.textarea`) rendering in the same visual column must share a left edge within 1.5px. The staircase detector: an `inline`-register field whose label width varies row to row pushes its control's left edge with it, a shape a consumer's own corpus surfaced at a 1440px viewport. Advisory, since "same column" is read from rendered geometry rather than a DOM contract, a heuristic over arbitrary layouts |
| `container-inset-asymmetry` | A `.card-shell`, `.list`, or `.modal-box` container whose rendered content sits more than 24px closer to one side than the other. The phantom-gutter detector, catching a one-sided padding or margin utility and, the case a consumer's corpus actually surfaced, an unreset user-agent default: a bare `<ul class="list">` keeping the 40px bullet indent read as a 40px left inset against a 0px right one. Advisory: the threshold is judged, and a deliberately asymmetric layout is a real composition this rule can't tell from a defect |

Every rule that compares two colors resolves them by painting each one on a canvas in the page and
reading the sRGB bytes back, rather than parsing color syntax. A themed admin computes to whatever
color space its palette is authored in, and cairn's own is `oklch` end to end, so a parser is the
one component in this pipeline guaranteed to be wrong about a real value.

Where a rule can't make its measurement, a gradient with no color under it leaves no single ground
to compare against, it reports an advisory finding naming what it couldn't read. That's deliberately
not silence: a check that skips itself is the failure mode the audit exists to rule out.

### What the rules don't cover

`cairn-audit` is a design-language audit, not an accessibility conformance tool. Two rules borrow a
number from WCAG, and neither implements the criterion it borrows from. A green run means these
fourteen questions came back clean. It isn't an accessibility result.

Nothing here checks:

- **1.4.3 Contrast (Minimum)**, the text legibility criterion, at 4.5:1 for normal text and 3:1 for
  large. `interactive-contrast` sits where a reader expects it, measuring a control's own `color`
  against its ground, and its floor is 1.5. No rule in the engine measures 1.4.3 at any ratio.
- **1.4.1 Use of Color**, where hue alone carries meaning with no text or shape backup.
- **2.4.11 Focus Not Obscured** and **2.4.13 Focus Appearance**. `focus-renders` proves an indicator
  exists and changes the paint; it measures neither its size, its contrast, nor whether something
  else covers it.
- **2.5.8's other four exceptions**. See below.

Run an accessibility tool for those. axe-core, Lighthouse, and Pa11y all cover the preceding
criteria, and none of them knows anything about cairn's design language, which is why a build wants
both.

### What `touch-targets` doesn't cover

`touch-targets` enforces a strict superset of SC 2.5.8, so it flags targets that conform to the
criterion. Four of its five exceptions aren't evaluated:

- **Spacing.** An undersized target is exempt when a 24px-diameter circle centered on it intersects
  no other target's circle. This is the one most admin toolbars pass on, and it's the largest gap:
  on cairn's own admin, 8 of the 10 errors this rule raises clear it.
- **Equivalent.** The rule applies a narrowed form of this one rather than omitting it. A label the
  platform reports as activating the control, but which doesn't touch it, counts as its own region,
  so a 20x20 checkbox with a large label elsewhere passes.
- **User agent control** and **Essential.**

Three more bounds, all stated rather than closed:

- The rule samples one viewport, 390px wide. The criterion carries no viewport qualifier, so a
  control that renders 24px tall at 390 and 20px at 320 is never measured.
- The target net is `a, button, [role="button"], input, select, summary`. A `textarea`, an `<area>`,
  a widget role such as `[role="tab"]` on a `<div>`, and a custom control carrying `tabindex` plus a
  pointer handler are all outside it.
- Findings collapse per selector signature at the smallest measured height, so twenty undersized
  rows sharing a class fingerprint report as one. A count here counts shapes, not elements, and it
  isn't a remediation estimate.
- The floor allows one Chromium layout quantum, 1/64 CSS px, for rect snapping, so the enforced bar
  is 23.984375.
- A control parked off-canvas at rest, a skip link at `left: -9999px`, is exempt. Such a link
  becomes a real target when focus reveals it, and the rule never measures it there.

### The allowlist

A live-page finding has no source line a suppression comment could sit beside, so rendered mode
exempts by a page+selector+reason JSON allowlist instead, in `rendered.allowlist`:

```json
{
  "rendered": {
    "allowlist": [
      { "page": "/admin/posts", "selector": ".legacy-badge", "reason": "ships in the next pass" }
    ]
  }
}
```

The `selector` is the signature a rule reports a finding under: a tag, then its id if it carries
one, then up to four of its classes, each escaped so a Tailwind class such as `lg:ml-56` stays a
valid CSS selector. Suppressed findings are counted and printed, never hidden.

An entry may also name the rule it exempts:

```json
{ "page": "/admin/posts", "selector": ".legacy-badge", "reason": "ships in the next pass", "rule": "border-contrast" }
```

Name it when you exempt an advisory finding. An entry that stops doing what it was written to do
reports under one of three rule ids of its own, rather than doing nothing silently:

| Rule id | What the entry did |
|---|---|
| `rendered-allowlist-stale` | The selector matched nothing the run visited |
| `rendered-allowlist-unprobeable` | The browser refused to parse the selector. Always advisory, because unreadable is a different claim from stale |
| `rendered-allowlist-dead` | The selector still matches an element, and the entry suppressed nothing |

A stale or dead entry reports at the tier of the rule it names. Without `rule`, it's an error, which
is right for a suppressed error-tier finding and would turn a suppressed advisory one into a gate
the next time the selector churns.

The dead verdict waits on a complete run. A rule can declare an interaction state a given page can't
reach, a page with no popup trigger can't open a menu, and on such a page the run reports an advisory
saying which state it missed instead of calling the entry dead. Removing an entry on that evidence
would leave the next complete run gating on the finding the entry covers.

### Rule-declared exemptions

A rendered rule can also carry its own exemption, for a ratified exception neither suppression idiom
can express: a design token every recipe shares, on every page, which no page+selector entry names
and no source-positioned directive can reach. `border-contrast` holds the one that ships.
`--cairn-card-border`, the card hairline, is a recorded decision, so a border painted through that
token still separates its two surfaces at least as well as the ratified rendering.

An exemption suppresses a finding without silencing it. The rule still constructs the finding, the
finding still carries its measurement, and it reaches the report's suppressed list with the reason
printed beside it, the same way an allowlisted finding does:

```text
Suppressed:
  /admin/posts [light, rest]:0  advisory  border-contrast  div.card-shell: top/right/bottom/left
  border rgb(235, 231, 226) reads at contrast 1.11 against the surface beside it rgb(246, 243, 239),
  and 1.19 against its own fill rgb(253, 251, 249), both under the 3:1 house floor (WCAG 1.4.11's
  bar for a control-identifying boundary, applied here to every rendered border) (exempt: RULING 2
  (2026-07-28): painted in this page's own --cairn-card-border, the ratified hairline, and still
  separating its two surfaces at 1.190 against the better of them (ratified floor 1.15))

1 file scanned, 1 rule run
0 errors, 0 advisories, 1 suppressed
```

Identical suppressed lines collapse to one with an `(xN)` count, and the summary still counts every
finding.

Only an advisory rule can exempt itself. On an error-tier finding the run refuses the reason: the
finding stays in the gating list, the exit code stands, and the report prints the refusal where the
exemption would have gone. The engine writes a rule-declared reason, not the project, so it applies
to every page automatically and appears in no diff. A gate any rule could quiet in one line is worth
no more than the runs it passes. The allowlist is the other authority and keeps working either way,
because a project owns and reviews that file: an entry covering an error-tier finding suppresses it
whether or not the rule also asked.

## The norms query

The package ships a norms manifest: the admin's measured design norms as data. A generator renders
the admin screens in both themes, reads the computed styles of each semantic role, and derives the
bands the query returns. The query exists so an agent or a developer building a new admin surface
reads a measured number instead of inferring one from a screenshot.

```bash
npx cairn-audit norms card
```

```text
card  (container)  .card-shell
  The floating card surface: the list table, the editor panes, the auth card.

  background-color  var(--color-base-100)  14 sites  observed
  border-color  var(--cairn-card-border)  14 sites  ratified
    ratified by ... (Ruling 2): the --cairn-card-border hairline measures 1.11 against the ambient
    beside it and 1.19 against the card's own fill in light, 1.43 and 1.20 in dark, and stays by
    design. The border-contrast rule applies a house floor of 3:1, the number WCAG 1.4.11 sets for a
    control-identifying boundary rather than for a card hairline, and exempts this one on the better
    of its two ratios against a ratified floor of 1.15
  border-radius  16px  14 sites  ratified
    ratified by docs/internal/admin-design-system.md (--radius-box)
```

### The term

The term is a role id, a class token, or a whole selector. All three of `status-chip`,
`.status-chip`, and `.btn.btn-primary` resolve. A term several roles share, such as `btn`, returns
every role that carries it.

A term that names no role exits 2 and prints the roles that exist. The command never returns an
empty result for an unknown term, because a query that printed nothing and exited 0 would read as a
role with no norms.

### The roles

| Role | Family | Selector |
|---|---|---|
| `button-primary` | control | `.btn.btn-primary` |
| `button-ghost` | control | `.btn.btn-ghost` |
| `input-text` | control | `input.input` |
| `select` | control | `select.select` |
| `status-chip` | control | `.status-chip` |
| `card` | container | `.card-shell` |
| `table-cell` | text | `table.table td` |
| `table-header-cell` | text | `table.table th` |
| `nav-item` | text | `nav[aria-label="Site content"] .menu a` |
| `page-title` | text | `h1.page-h1` |
| `eyebrow` | text | `.type-label` |
| `icon` | icon | `svg.lucide` |

A role's family decides which properties the manifest carries for it. A control carries its height,
its padding, its padding-to-font-size ratios, its border treatment, its radius, and its type size. A
container carries the border treatment and the radius, and no padding: a component composes its own
padding, so a padding band would be a distribution of per-screen choices rather than a norm. A text
role carries its type recipe. An icon carries its box.

### Reading an entry

Each entry is one role's one property.

| Field | What it states |
|---|---|
| Band | The distinct values observed, as a length in px, a ratio, a keyword vocabulary, or a relationship |
| Sites | How many distinct elements the band rests on. A theme repeat is one site, not two |
| Provenance | `ratified` when a recorded decision settles the value and the render still matches it, `observed` otherwise |
| Flags | Every caveat on the entry |

The manifest stores a palette-dependent property as a relationship, never as a resolved value. A
border color reads `var(--cairn-card-border)`, and a mixed value keeps its formula. A site that
re-tunes the palette therefore invalidates nothing in the manifest, and no entry teaches a number
that site's own theme never produces.

### Flags

| Flag | What it means |
|---|---|
| `open-question` | An open design question governs this norm. The band is a measurement, not settled ground truth, and the query prints the question |
| `single-observation` | The band rests on one element site. It is that component's value, not a distribution |
| `ratified-drift` | A recorded decision settles this pair and the render no longer matches it. Provenance falls back to `observed` |
| `literal-dropped` | At least one observation resolved to a palette value rather than a relationship, and the derivation dropped it from the band |

An entry flagged `open-question` never carries `ratified` provenance, and the `norms-bands` rule
treats it as unbanded rather than checking a measurement against an unsettled question.

The check runs in both directions, so a flag or a provenance with nothing behind it fails the same
way an unflagged open question does. An entry flagged `open-question` that no recorded question
governs, an entry claiming `ratified` that no recorded decision settles, an entry a decision does
settle that still reads `observed`, and a drifted band missing its `ratified-drift` flag are all
manifest errors. A one-directional check can only notice a row it already knows about, which is how
a settled ruling once left a stale `[open-question]` flag printing with no question behind it.

## Regenerating the manifest

The manifest is generated, committed, and shipped in `dist`. Regenerate it after a change to the
admin's rendered appearance.

```bash
VITE_CAIRN_E2E=1 npm --prefix examples/showcase run build
CAIRN_DEV_BACKEND=1 npm --prefix examples/showcase run preview -- --port 4173
npm run norms:generate
```

The generator never starts a server. It renders against `BASE_URL`, which defaults to
`http://localhost:4173`, and reports the command to start one when nothing answers. Playwright is
imported dynamically, so a project that never generates takes no browser dependency.

`npm run norms:check` regenerates into memory and compares against the committed file. The publish
workflow runs it, so a release cannot ship a stale manifest. Neither script belongs to the `check:*`
family: those run on every push and call `npm run package` on every invocation, and a browser render
in that path would slow and destabilize every other gate.

The generator refuses to write a manifest it cannot stand behind. A run that renders nothing, a role
whose selector matches nothing, and a manifest that violates one of the disciplines above each fail
the run rather than producing a smaller manifest that still reports success. The disciplines are
also checked against the committed manifest by the unit suite, which needs neither a browser nor a
server, so a manifest that drifts from the recorded decisions fails before a release does.
