# The `cairn-audit` CLI

`cairn-audit` is the design-language audit. The package ships it in its `bin` field, so an install
puts it on the project's path.

```bash
npx cairn-audit                          # run the static rules over the admin surfaces
npx cairn-audit norms <selector-or-role> # look up a measured norm
```

The static audit reads the working directory. The `norms` subcommand reads only the manifest inside
the installed package, so it needs no config, no built stylesheet, and no browser.

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
