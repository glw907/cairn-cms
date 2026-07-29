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

### The rules

Eleven rules run. The first six are error tier and exit the command nonzero.

| ID | What it checks |
|---|---|
| `one-filled-action` | At most one accent-filled control per surface. A surface is the topmost open layer, a dialog winning over the page beneath it, partitioned further by the landmarks that layer carries. "Filled" means the accent, read from the live computed background, so the sanctioned ink fills are exempt by construction rather than by name |
| `focus-renders` | Every tab stop renders a focus indicator. The rule tabs through the whole page and compares each stop's focused paint against that same element's resting paint, so a real outline, a `box-shadow` ring, and a ring an ancestor renders through `:focus-within` all count, and a decorative shadow the element already carries doesn't |
| `interactive-contrast` | Interactive text reads against its own composited background at a ratio of at least 1.5. This isn't a legibility floor. The bar is that a control isn't camouflaged against its own ground. Disabled controls are exempt |
| `touch-targets` | Every tap target renders at least 24x24 CSS px at a 390px viewport, which is WCAG 2.2 level AA's success criterion 2.5.8, Target Size (Minimum). The measurement is the activation region rather than the painted box: the control's own box, unioned with a qualifying `::before` inset expansion, plus every label the platform reports as activating the control. A control passes when any one of its regions clears the floor. Of the criterion's exceptions only the inline one is implemented, narrowed to a link that is a run of text inside prose |
| `viewport-overflow` | Nothing renders wider than the viewport at 390 and at 320. Both an element whose own box clears the viewport and an element whose content, an unbreakable string or a bleeding pseudo-element, is wider than its box |
| `chip-ground-collision` | A chip's own painted fill reads against the ground behind it at a ratio of at least 1.5, the same floor `interactive-contrast` applies and for the same reason. Neither rule states a legibility standard; the bar is that the chip isn't accidentally camouflaged. Legibility is `border-contrast`'s separate job, at WCAG 1.4.11's 3:1. A chip is daisyUI's `.badge` or any element that renders as one, and a chip with no fill of its own, the `badge-outline` recipe, is exempt. Where an element outside the chip's own ancestors paints the ground behind it, an overlay chip on a sibling image, the rule reports an advisory naming the ground it couldn't read rather than an error claiming a collision |

The other five are advisory. They report and never change the exit code, because each one measures a
compositional question that a legitimately novel component can answer differently on purpose.

| ID | What it checks |
|---|---|
| `border-contrast` | A rendered border reads at 3:1 (WCAG 1.4.11) against at least one of the two surfaces it separates. Adjacency is measured by hit-testing the pixel beyond each edge, not by walking the DOM, so an overlaid badge is judged against what it sits on. The stroke composites over the element's own fill first, which is where `background-clip: border-box` paints it |
| `weight-budget` | At most two distinct font-weights per content region. A region is the body text inside `<main>`, or inside an open dialog layer, split at each visible heading, with chrome removed. Chrome is text inside `<nav>` or `[role="navigation"]`; `<button>`, `[role="button"]`, or `<summary>`; a `<header>` or `[role="banner"]` that contains the heading it introduces; and `<thead>` or `[role="columnheader"]`. Each shape is named by an HTML tag or the ARIA role that means the same thing, never by a class, so a rewritten component stays covered. A heading's own weight never spends the budget of the region it opens. Weights count on the hundreds ladder, so a variable-font ramp reads as one weight |
| `norms-bands` | A component's control heights, paddings, padding-to-type ratios, radii, and border treatments against the bands the [norms manifest](#the-norms-query) observed. An entry the manifest flags `open-question` or `ratified-drift` is treated as unbanded: a number that is not settled ground truth is not a reference to measure against |
| `screen-anatomy` | An office screen carries one `<h1>` inside PageHeader's `<header>`, renders a `.card-shell` region, and keeps its accent- and ink-filled actions in the header slot or inside the card. Desk routes are exempt, read from the drawer class the admin shell projects at SSR rather than from path depth |
| `relational-spacing` | The `--cairn-gap-*` scale matches the relationship the markup renders: a nested rhythm never opens wider than the rhythm containing it (per axis), a label sits the gap-label distance above its control, and same-level siblings sit at one gap |

Every rule that compares two colors resolves them by painting each one on a canvas in the page and
reading the sRGB bytes back, rather than parsing color syntax. A themed admin computes to whatever
color space its palette is authored in, and cairn's own is `oklch` end to end, so a parser is the
one component in this pipeline guaranteed to be wrong about a real value.

Where a rule can't make its measurement, a gradient with no color under it leaves no single ground
to compare against, it reports an advisory finding naming what it couldn't read. That's deliberately
not silence: a check that skips itself is the failure mode the audit exists to rule out.

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

Name it when you exempt an advisory finding. An allowlist entry whose selector matches nothing the
run visited reports as a stale entry rather than doing nothing silently, and a stale entry is
reported at the tier of the rule it names. Without `rule`, a stale entry is an error, which is right
for a suppressed error-tier finding and would turn a suppressed advisory one into a gate the next
time the selector churns.

An entry whose selector the browser refuses to parse reports separately, and always advisory:
unreadable is a different claim from stale, and the run says which one it is.

An entry whose selector still matches an element while suppressing nothing reports as a dead entry,
at the tier of the rule it names. An exemption that outlives its finding is where the next real one
hides. The verdict waits on a complete run: a rule can declare an interaction state a given page
can't reach, a page with no popup trigger can't open a menu, and on such a page the run reports an
advisory saying which state it missed instead of calling the entry dead. Removing an entry on that
evidence would leave the next complete run gating on the finding the entry covers.

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
  and 1.19 against its own fill rgb(253, 251, 249), so it renders no visible boundary on either side
  (floor 3, WCAG 1.4.11) (exempt: RULING 2 (2026-07-28): painted in this page's own
  --cairn-card-border, the ratified hairline, and still separating its two surfaces at 1.19
  (ratified floor 1.15))

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
    ratified by ... (Ruling 2): the --cairn-card-border hairline measures 1.11:1 light and 1.43:1
    dark against WCAG 1.4.11's 3:1 floor and stays by design, a quiet edge deliberately below the
    floor
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
