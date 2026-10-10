# Pass gate tiers

The per-task gate a diff demands. The classifier is `scripts/checks/gate-tier.mjs`; its own header
carries the same rules this page states. The runner calls

`node scripts/checks/gate-tier.mjs --range <base>..HEAD [--paint yes|no] [--class <passClass>] [--pin <tier>]`

and takes the gate string from stdout (the only line there). The legs, and the paths and rules
behind each, print to stderr. An empty range, a git failure, an unknown `--class`, or an unknown
`--pin` prints nothing on stdout and exits non-zero, so the caller falls back to the plan's gate.

The default output is the targeted gate below. `--pin <tier>` prints one of the old tier strings
(kept under "The pinned tiers") unchanged, and `--protected` is a separate mode (see "Protected
paths").

## The targeted gate

Seven legs, in this order. Each prints only when it applies.

1. `npm run package`, always.
2. The static checks the diff's buckets select, through the build-once runner:
   `npm run check:close -- <label>...` (see `scripts/checks/close-prebuilt.mjs`; bare
   `npm run check:close` when the selection is every close check), then the few checks that sit
   outside `check:close`: `check:tool-heuristics`, `test:emit`, the showcase's `test:unit`, and
   tellgrader (local only; it skips itself when the binary is absent). The runner builds `dist`
   once for the whole subset. Leg 1's build and the runner's own build are two builds of the same
   tree; the runner has no flag to skip its build.
3. `npm run test:node-projects`, always whole. The node projects hold the guard tests that read
   files, spawn scripts, or walk trees, which no import graph sees, so a docs-only diff runs them
   too.
4. The component project. Vitest's own related selection (`createVitest` with `related` and
   `project: ['component']`, then `getRelevantTestSpecifications()`, with `CAIRN_RELATED_RUN=1` so
   the rerun triggers apply) runs at classification time, and the leg lists the selected files:
   `CAIRN_RELATED_RUN=1 npm run test:component -- --no-file-parallelism <files>`. The whole project
   (`npm run test:component -- --no-file-parallelism`) runs when the diff touches a rerun trigger
   (`scripts/test/component-rerun-triggers.mjs`), deletes or renames a path under `src/`, or
   selects nothing, including any diff with no `src/` path that is not docs-only. The leg is skipped
   when every path is a docs-bucket path or on the no-check list, since the component project
   cannot see them; stderr says so. A selection that cannot be computed runs the whole project.
5. `npm test -w packages/create-cairn-site`, when a path matches `packages/create-cairn-site/**`,
   `examples/showcase/**`, `scripts/build/emit-template*`, or the root `package.json`.
6. The e2e specs the map selects (below), at zero retries, behind
   `export E2E_PORT=4392 && ! ss -Htln 'sport = :4392' | grep -q .` so a listener already on the
   port fails the gate instead of testing the wrong site. A selection that holds
   `site-visual.spec.ts`, or the whole suite, appends `--grep-invert "site home|archive page 2"`,
   the two tests this workstation's Chromium renders off CI's baselines (`durable-gotchas.md`);
   CI runs them whole.
7. `make -C tool check`, when the diff holds a `tool/**` path. A tool-only diff prints just this.

### Buckets and the static checks

`scripts/checks/gate-table.json` holds the table. A path belongs to every bucket whose pattern
matches it:

| Bucket | Patterns |
| --- | --- |
| docs | `docs/`, `*.md`, `**/*.md`, `.vale/`, `.vale.ini`, `.tellgrader.json`, `skills/`, `claude/` |
| scripts | `scripts/`, `src/tests/`, `.github/`, `eslint.config.js`, `vitest.config.ts`, `wrangler.test.jsonc` |
| showcase | `examples/showcase/`, `templates/`, `packages/create-cairn-site/` |
| engine | `src/lib/`, `scripts/build/`, `packages/cairn-cms-dev/`, `migrations/`, `migrations-channel/`, `package.json`, `package-lock.json`, `svelte.config.js`, `tsconfig.json` |
| export surface | `src/lib/**/index.ts`, every `src/lib` source behind a `package.json` `exports` entry, `package.json`, the surface and self-use allowlists, `docs/internal/api-surface.md`, `docs/internal/option-map.json`, `skills/`, `claude/` |

A pattern ending in `/` is a literal directory prefix, a pattern with no glob character is an exact
path, and anything else is a glob. Dot paths (`.vale/`, `.vale.ini`, `.tellgrader.json`,
`.github/`) are written as prefixes or exact paths, never as `**` globs: a double star does not
cross a dot directory, so such a glob would match nothing. The classifier refuses a table that
writes one.

The table's `checks` map lists, per check label, the buckets that select it. Rules the map does not
spell out:

- A close check whose own `package.json` script starts with `npm run package` and that the map
  does not list is selected by the engine bucket.
- The six dist-surface checks (`check:package`, `check:surface`, `check:self-use`,
  `check:audit-pack`, `check:consumers`, `check:public-skill`) list the export-surface bucket and
  no engine bucket, so an `index.ts` change (or a `package.json` export entry) selects them and
  another `src/lib` file does not. Only `check:public-skill` also lists the docs bucket, because
  it reads `docs/reference/render.md`; `check:surface` reads the built types and its golden file
  and no page, so a docs change does not select it. `check:reference`, `check:reference:signatures`, and
  `check:options` keep the engine bucket beside export surface and docs: a public option or type
  can change in a non-index file, and they must see it. A non-index change that alters the shape
  of an export is left to CI for the six.
- `check:vale-rules` (the Cairn rule cases `vale test` runs inside the docs gate) is a docs-bucket
  extra, so a `.vale/` or `.vale.ini` change runs it.
- A `scripts/` file selects the checks whose script reaches it by a relative import, plus the
  bucket's own checks. A `scripts/` file no check reaches (and that is not under
  `scripts/ci/`, `scripts/test/`, or the classifier and its table, which only tests and the comment
  lint read) selects every static check.
- A close check the map neither lists nor builds the package for runs on every diff.
- The docs bucket selects tellgrader and the docs checks.
- A path in no bucket and not on the no-check list selects every static check and the whole e2e
  suite. The no-check list is `.gitattributes` and `knip.jsonc`, the only tracked root files no
  check and no test reads; a unit test pins its members.

### The e2e map

The table's `e2e` block selects specs per path:

- A directory-prefix map from `src/lib/<dir>/` and showcase source directories to specs.
- The admin-visual floor: `src/lib/admin/**` and `src/lib/admin-toolkit/**` always add
  `admin-visual.spec.ts`.
- An engine path no map entry names (`src/lib/cloudflare/turnstile.ts`, `scripts/build/**`, the root
  `package.json`) selects `golden-path`, `access-map`, and `csrf-origin`.
- A changed `examples/showcase/e2e/<name>.spec.ts` (or its `-snapshots/`) selects that spec; a
  helper or fixture in that directory, a showcase config file, or a showcase source path the map
  does not name selects the whole suite.
- `--class auth-data` adds the three auth specs, and `--paint yes` adds `admin-visual.spec.ts`.
  The other five classes change nothing. A unit test requires every spec in
  `examples/showcase/e2e` to appear in some entry.

## Protected paths

`gate-tier.mjs --range <base>..HEAD --protected` prints `ciWait` when any path in the range matches
the table's `protected` list and prints nothing otherwise, exiting 0 either way. The list is
the table itself, `scripts/checks/gate-tier.mjs`, `scripts/test/component-rerun-triggers.mjs`,
`.github/ci-green.json`, and `.github/workflows/`. The mode reads the list at `<base>` (`git show
<base>:scripts/checks/gate-table.json`), so a range that deletes its own entry still flags; a table
that is absent or unreadable at `<base>` prints `ciWait` with the reason on stderr. A git failure
exits non-zero with empty stdout. The default mode's gate string is never altered by a protected
path. The runner reads this mode to decide a task waits for CI green on its own commit.

## The pinned tiers

These strings are what `--pin <tier>` prints, unchanged, and what the local full gate (`full`) runs
where CI's result is unavailable. No diff computes a tier any more; the Trigger column records the
paths each tier was sized for.

Each npm tier's gate string is a strict superset of the npm tier below it: `scripts`/`engine` add
`check`, the node test projects, and the component project run serially (`--no-file-parallelism`)
on top of the `docs` string, `admin-visual` adds the admin-visual spec run on top
of that, and `full` adds the remaining CI-only checks plus the whole showcase e2e suite on top of
`admin-visual`. A sixth tier, `tool`, stands outside that chain (see below).

| Tier | Trigger (glob, matched per changed path) | Gate string |
| --- | --- | --- |
| `docs` | `docs/**`, any `*.md`, `CHANGELOG.md` | `npm run check:docs-gate` |
| `scripts` | `scripts/**`, `src/tests/**`, `packages/create-cairn-site/**`, any `*.test.ts`/`*.spec.ts` | docs string + `&& npm run check && npm run test:node-projects && npm run test:component -- --no-file-parallelism && npm test -w packages/create-cairn-site` |
| `engine` | `src/lib/**/*.ts`, excluding `src/lib/admin/**`, `src/lib/public/**`, and `src/lib/admin-toolkit/**` | same string as `scripts` |
| `admin-visual` | `src/lib/admin/**` (Svelte components and `cairn-admin.css`) or `src/lib/admin-toolkit/**` (the shared admin-table components) | scripts/engine string + `&& npm --prefix examples/showcase run test:e2e -- admin-visual.spec.ts` |
| `full` | `src/lib/render/**` (the render seam), `src/lib/public/**` (the built-in public components, since they render on the public site), `examples/showcase/src/chassis/**` and `examples/showcase/src/theme/**` (theme/chassis CSS), `examples/showcase/src/routes/(site)/**` (a public route), any path containing `-snapshots/` or ending `.png`/`.jpg`/`.jpeg`/`.webp` (a visual baseline) | admin-visual string + `&& npm run check:comments && npm run check:surface`, then every other check the CI `test` job runs (`npm run test:emit`, `check:package`, `check:audit-pack`, `check:self-use`, `check:custom-surface`, `check:chassis-boundary`, `check:cm-internals`, `check:idioms`, `check:invisible-craft`, `check:admin-css-classes`, `check:rulings-format`, `check:prose`, `check:version`, `check:dev-package`, `check:template`, `check:consumers`, the showcase's `check`, `check:cairn`, `test:unit` and `format:check`, `check:public-skill`, `check:tool-heuristics`), then `npm --prefix examples/showcase run test:e2e` |
| `tool` | `tool/**`, the Go `cairn` CLI module, including its own `tool/**/*.md` | `make -C tool check` |

The `docs` gate string is `scripts/checks/docs-gate.mjs` (`npm run check:docs-gate`), the one
runner that carries every check that reads a doc arm's content: check:docs, check:vale,
check:facts, check:provenance, check:leaks, check:symbols, check:snippets, check:transcripts, check:visuals,
check:arm-indexes, check:editor-quotes, check:readiness, check:tool-conditions,
check:target-stack, check:reference, check:reference:signatures, and check:options. Every tier above `docs`
carries it once, through the superset chain, so `full`'s own explicit checks list does not repeat
check:snippets, check:transcripts, or check:symbols.

## The `tool` tier and mixed diffs

`tool/**` (the Go module) has its own gate: it proves three Go legs, not any npm script, and an npm
gate proves nothing about Go code. `decideGate` splits a diff's changed paths into `tool/` and
everything else first. A diff whose paths are all under `tool/` prints `make -C tool check` alone.
A mixed diff prints the targeted gate for the non-`tool/` paths followed by `&& make -C tool check`.

## The pin

`--pin <tier>` prints that tier's string and nothing else, in either direction; `tool` is a valid
pin alongside the five npm tiers. A plan task pins a tier when its diff cannot size the change
itself (for example, a token value a later pass will wire into a component that does not exist
yet). A pin beats `--paint` and `--class`. `--pin docs` is the standing escape hatch for a
comment-only workflow edit that a task's own review has confirmed changes no behavior.

## Verified against the showcase Playwright config (2026-09-15)

`examples/showcase/playwright.config.ts` carries no `projects` array, so there is no Playwright
project named `admin-visual` to pass to `--project`; the plan's draft gate string for that tier
assumed one exists. The `admin-visual` gate string above instead targets the spec file directly
(`npm --prefix examples/showcase run test:e2e -- admin-visual.spec.ts`), which Playwright resolves
against `testDir: 'e2e'` the same way a bare filename argument always has. If a later pass adds
named projects to that config, this page and the classifier's `TIER_GATES.admin-visual` string
should move to `--project admin-visual` instead.
