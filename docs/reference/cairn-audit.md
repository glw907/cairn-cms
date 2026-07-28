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

All six are error tier and exit the command nonzero.

| ID | What it checks |
|---|---|
| `one-filled-action` | At most one accent-filled control per surface. A surface is the topmost open layer, a dialog winning over the page beneath it, partitioned further by the landmarks that layer carries. "Filled" means the accent, read from the live computed background, so the sanctioned ink fills are exempt by construction rather than by name |
| `focus-renders` | Every tab stop renders a focus indicator. The rule tabs through the whole page and compares each stop's focused paint against that same element's resting paint, so a real outline, a `box-shadow` ring, and a ring an ancestor renders through `:focus-within` all count, and a decorative shadow the element already carries doesn't |
| `interactive-contrast` | Interactive text reads against its own composited background at a ratio of at least 1.5. This isn't a legibility floor. The bar is that a control isn't camouflaged against its own ground. Disabled controls are exempt |
| `touch-targets` | Every tap target renders at least 44x44 CSS px at a 390px viewport, measured on the effective hit rectangle, so a control widened by a `::before` inset expansion clears the floor it already meets |
| `viewport-overflow` | Nothing renders wider than the viewport at 390 and at 320. Both an element whose own box clears the viewport and an element whose content, an unbreakable string or a bleeding pseudo-element, is wider than its box |
| `chip-ground-collision` | A chip's own painted fill reads as distinct from the background behind it. A chip is daisyUI's `.badge` or any element that renders as one, and a chip with no fill of its own, the `badge-outline` recipe, is exempt |

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
one, then up to four of its classes. Suppressed findings are counted and printed, never hidden.

An allowlist entry whose selector matches nothing the run actually visited reports as a stale entry
rather than doing nothing silently, the same reasoning that requires every static suppression to
carry a reason.

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
  border-color  var(--cairn-card-border)  14 sites  observed  [open-question]
    OPEN: the --cairn-card-border hairline measures 1.11:1 light and 1.43:1 dark against base-200 ...
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
whose selector matches nothing, and a manifest that violates one of the three disciplines above each
fail the run rather than producing a smaller manifest that still reports success.
