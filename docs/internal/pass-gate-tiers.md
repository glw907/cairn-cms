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

The classifier's own `classifyPath` checks a path against these five triggers HIGHEST TIER FIRST
(`full`, then `admin-visual`, `engine`, `scripts`, `docs` last) and returns the first one it
matches: `full`'s triggers name specific, narrow paths that a broader `src/lib/**` or `docs/**`
rule would otherwise swallow, so they have to be tried before the broader tiers get a chance.
`TIER_ORDER`'s own list is the opposite direction, ASCENDING (`docs`, `scripts`, `engine`,
`admin-visual`, `full`), and is used only to rank a diff with paths in more than one tier: the
diff resolves to the highest tier present.

Each npm tier's gate string is a strict superset of the npm tier below it: `scripts`/`engine` add
`check && test` on top of the `docs` string, `admin-visual` adds the admin-visual spec run on top
of that, and `full` adds the remaining CI-only checks plus the whole showcase e2e suite on top of
`admin-visual`. A sixth tier, `tool`, stands outside that chain (see below).

| Tier | Trigger (glob, matched per changed path) | Gate string |
| --- | --- | --- |
| `docs` | `docs/**`, any `*.md`, `CHANGELOG.md` | `npm run check:docs && npm run check:vale && npm run check:reference && npm run check:reference:signatures && npm run check:facts` |
| `scripts` | `scripts/**`, `src/tests/**`, any `*.test.ts`/`*.spec.ts` | docs string + `&& npm run check && npm test` |
| `engine` | `src/lib/**/*.ts`, excluding `src/lib/components/**` and `src/lib/admin-toolkit/**` | same string as `scripts` |
| `admin-visual` | `src/lib/components/**` (Svelte components and `cairn-admin.css`) or `src/lib/admin-toolkit/**` (the shared admin-table components) | scripts/engine string + `&& npm --prefix examples/showcase run test:e2e -- admin-visual.spec.ts` |
| `full` | `src/lib/render/**` (the render seam), `examples/showcase/src/chassis/**` and `examples/showcase/src/theme/**` (theme/chassis CSS), `examples/showcase/src/routes/(site)/**` (a public route), any path containing `-snapshots/` or ending `.png`/`.jpg`/`.jpeg`/`.webp` (a visual baseline) | admin-visual string + `&& npm run check:comments && npm run check:snippets && npm run check:transcripts && npm run check:symbols && npm run check:surface && npm --prefix examples/showcase run test:e2e` |
| `tool` | `tool/**`, the Go `cairn` CLI module, including its own `tool/**/*.md` | `make -C tool check` |

## The `tool` tier and mixed diffs

`tool/**` (the Go module) is not part of the five-npm-tier superset chain above: its gate proves
three Go legs, not any npm script, and an npm gate proves nothing about Go code. `decideGate`
splits a diff's changed paths into `tool/` and everything else before ranking. A diff whose paths
are ALL under `tool/` resolves to `tool` outright and runs only `make -C tool check`. A mixed diff
(some `tool/` paths, some not) ranks the non-`tool/` paths through the five npm tiers as usual,
then reports `<npm tier>+tool` and runs the npm tier's gate string followed by
`&& make -C tool check`, so both halves are proven. `--paint yes` never floors a `tool`-only diff
(see below); it still floors the npm half of a mixed diff.

A public-page component that is not under one of `full`'s own named directories (for example a
theme component under `examples/showcase/src/theme/**`, or a route file under
`examples/showcase/src/routes/(site)/**`) is already caught by those existing `full` triggers;
there is no separate "component a public page imports" rule, since `examples/showcase` carries no
`src/lib/**` directory today.

A path outside all five globs (a repo-root config file, a GitHub Actions workflow, a
`templates/waymark/**` file, anything not named above) resolves to `full`: it is exactly the case
the table does not cover, and an unnecessary full run costs time, while a missed full-tier path
costs a broken release.

## The paint floor and the pin

`--paint yes` floors the computed npm tier at `admin-visual`: a task that touches paint (visible
admin surface) never runs below the admin-visual gate, even if its diff alone would classify
lower. It never lowers an already-higher tier (`engine` under `--paint yes` never demotes a
`full`-classified diff). Paint names an npm-admin concept, so it never touches the `tool` half of
a decision: a `tool`-only diff stays `tool` under `--paint yes`, and a mixed diff floors only its
npm half before the `+tool` suffix and gate are appended.

`--pin <tier>` overrides the computed tier entirely, in either direction, and reports as `pin`
rather than `computed`; `tool` is a valid pin alongside the five npm tiers. A plan task pins a
tier when its diff cannot size the change itself (for example, a token value a later pass will
wire into a component that does not exist yet). `--pin` beats the paint floor: `--pin docs
--paint yes` still runs the `docs` gate, since a pin is a deliberate override, not another input
the floor ranks against. `--pin docs` is the standing escape hatch for a comment-only workflow
edit (a `.github/workflows/**` file, which otherwise defaults to `full` as an unrecognized path)
that a task's own review has confirmed changes no behavior.

## Verified against the showcase Playwright config (2026-09-15)

`examples/showcase/playwright.config.ts` carries no `projects` array, so there is no Playwright
project named `admin-visual` to pass to `--project`; the plan's draft gate string for that tier
assumed one exists. The `admin-visual` gate string above instead targets the spec file directly
(`npm --prefix examples/showcase run test:e2e -- admin-visual.spec.ts`), which Playwright resolves
against `testDir: 'e2e'` the same way a bare filename argument always has. If a later pass adds
named projects to that config, this page and the classifier's `TIER_GATES.admin-visual` string
should move to `--project admin-visual` instead.
