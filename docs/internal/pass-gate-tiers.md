# Pass gate tiers

The per-task gate tier a diff demands, and the gate string each tier runs. Source of truth:
`ROADMAP.md`'s "Now" entry on the gate-tier classifier (the entry that proposed this script);
this page is that table, copied for a reviewer who wants to reproduce a classification without
reading the roadmap entry. The classifier itself is `scripts/checks/gate-tier.mjs`; its own header
comment carries the same rules this page states.

`node scripts/checks/gate-tier.mjs --range <base>..HEAD [--paint yes|no] [--pin <tier>]` prints
the chosen gate string on stdout (and nothing else on success), and the chosen tier plus the paths
that decided it on stderr. It exits non-zero with empty stdout when the range carries no diff or
git itself fails, so the caller falls back to a fixed gate string.

## The five tiers

A path is checked against these five triggers in order; the classifier's own `classifyPath`
returns the first one a path matches. A diff with paths in more than one tier resolves to the
highest tier present, named by `TIER_ORDER` (ascending): `docs`, `scripts`, `engine`,
`admin-visual`, `full`.

| Tier | Trigger (glob, matched per changed path) | Gate string |
| --- | --- | --- |
| `docs` | `docs/**`, any `*.md`, `CHANGELOG.md` | `npm run check:docs && npm run check:vale && npm run check:reference && npm run check:facts` |
| `scripts` | `scripts/**`, `src/tests/**`, any `*.test.ts`/`*.spec.ts` | `npm run check && npm test` |
| `engine` | `src/lib/**/*.ts`, excluding `src/lib/components/**` | `npm run check && npm test` |
| `admin-visual` | `src/lib/components/**` (Svelte components and `cairn-admin.css`) | `npm run check && npm test && npm --prefix examples/showcase run test:e2e -- admin-visual.spec.ts` |
| `full` | `src/lib/render/**` (the render seam), `examples/showcase/src/chassis/**` and `examples/showcase/src/theme/**` (theme/chassis CSS), `examples/showcase/src/routes/(site)/**` (a public route), `examples/showcase/src/lib/**/*.svelte` (a component a public page imports), any path containing `-snapshots/` or ending `.png`/`.jpg`/`.jpeg`/`.webp` (a visual baseline) | the repo's full gate string: `npm run check && npm test && npm run check:comments && npm run check:snippets && npm run check:transcripts && npm run check:symbols && npm run check:surface && npm --prefix examples/showcase run test:e2e` |

A path outside all five globs (a repo-root config file, a GitHub Actions workflow, anything not
named above) resolves to `full`: it is exactly the case the table does not cover, and an
unnecessary full run costs time, while a missed full-tier path costs a broken release.

## The paint floor and the pin

`--paint yes` floors the computed tier at `admin-visual`: a task that touches paint (visible
admin surface) never runs below the admin-visual gate, even if its diff alone would classify
lower. It never lowers an already-higher tier (`engine` under `--paint yes` never demotes a
`full`-classified diff).

`--pin <tier>` overrides the computed tier entirely, in either direction, and reports as `pin`
rather than `computed`. A plan task pins a tier when its diff cannot size the change itself (for
example, a token value a later pass will wire into a component that does not exist yet).

## Verified against the showcase Playwright config (2026-09-15)

`examples/showcase/playwright.config.ts` carries no `projects` array, so there is no Playwright
project named `admin-visual` to pass to `--project`; the plan's draft gate string for that tier
assumed one exists. The `admin-visual` gate string above instead targets the spec file directly
(`npm --prefix examples/showcase run test:e2e -- admin-visual.spec.ts`), which Playwright resolves
against `testDir: 'e2e'` the same way a bare filename argument always has. If a later pass adds
named projects to that config, this page and the classifier's `TIER_GATES.admin-visual` string
should move to `--project admin-visual` instead.
