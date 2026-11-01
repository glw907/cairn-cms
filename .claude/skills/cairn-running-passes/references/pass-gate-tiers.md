# Pass gate tiers

## Contents

- [The targeted gate](#the-targeted-gate)
- [The fast lane](#the-fast-lane)
- [Protected paths](#protected-paths)
- [The pinned tiers](#the-pinned-tiers)
- [The `tool` tier and mixed diffs](#the-tool-tier-and-mixed-diffs)
- [The pin](#the-pin)
- [Verified against the showcase Playwright config (2026-09-15)](#verified-against-the-showcase-playwright-config-2026-09-15)


The per-task gate a diff demands. The classifier is `scripts/checks/gate-tier.mjs`; its own header
carries the same rules this page states. A pass session calls

`node scripts/checks/gate-tier.mjs --range <base>..HEAD [--fast] [--paint yes|no] [--class <passClass>] [--pin <tier>]`

and takes the gate string from stdout (the only line there; `--fast` prints one or two). The legs,
and the paths and rules behind each, print to stderr. An empty range, a git failure, an unknown
`--class`, or an unknown `--pin` prints nothing on stdout and exits non-zero, so the caller falls
back to the plan's gate. An unknown flag exits 2 with nothing on stdout.

The default output is the targeted gate below, which a pass runs when CI is not its full-suite
home. `--fast` prints the fast lane, the inner-loop gate a pass runs after each task. `--pin <tier>`
prints one of the old tier strings (kept under "The pinned tiers") unchanged, and `--protected` is a
separate mode (see "Protected paths").

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
   when every path is a docs-bucket path, a harness-bucket path, or on the no-check list, since the
   component project cannot see them; stderr says so. A selection that cannot be computed runs the
   whole project.
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
| harness | `.claude/` |
| showcase | `examples/showcase/`, `templates/`, `packages/create-cairn-site/` |
| engine | `src/lib/`, `scripts/build/`, `packages/cairn-cms-dev/`, `migrations/`, `migrations-channel/`, `package.json`, `package-lock.json`, `svelte.config.js`, `tsconfig.json` |
| export surface | `src/lib/**/index.ts`, every `src/lib` source behind a `package.json` `exports` entry, `package.json`, the surface and self-use allowlists, `scripts/checks/api-surface.md`, `docs/internal/option-map.json`, `skills/`, `claude/` |

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
- The harness bucket (`.claude/`) selects only `check` and `test:emit`. A diff confined to
  `.claude/` therefore runs those two, no component leg, and no e2e spec.
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

## The fast lane

`--fast` prints the legs a pass session runs after each task while CI carries the whole suites. It
prints one or two lines, each a complete gate string for `cairn-run-gate`. It runs no whole node
project and no e2e, and its output holds no bare `npm run package` and no bare `npm run check:close`
(the close runner is only ever given a label subset, and it builds `dist` itself). `--fast` cannot
combine with `--pin` or `--protected`.

**Line 1**, the non-browser legs, fails if any leg fails. It runs on the heavy lane, cairn-run-gate's
default, with no lane prefix.

- A serial chain, because each of its parts builds or reads `dist` and a build beside a reader
  races: `npm run check:close -- <labels>` for the diff's static checks (minus the type check), then
  the type check (`npm run check`, whose program loads `dist` through the package's self-import),
  then `check:tool-heuristics`, `test:emit`, and the showcase's `test:unit` where the diff selects
  them, then `npm run check:docs-gate` when a docs path changed, then the unit tests related to the
  diff (`npx vitest related --run --passWithNoTests --project unit <paths>`; the whole `unit`
  project when the diff deletes or renames a path under `src/` or `scripts/`).
- Beside the chain, concurrently: tellgrader, the Cairn Vale rule-case tests, and `make -C tool
  check` when the diff holds a `tool/**` path. A tool-only diff prints just the tool gate.

`--fast` accepts `--class` and `--paint` and ignores them, since they only shape the e2e leg that
CI carries.

**Line 2**, only when the diff reaches component tests: the related component tests,
`CAIRN_RELATED_RUN=1 npm run test:component -- --no-file-parallelism <files>`, selected as in
leg 4 above. It is always heavy (a browser), so it runs alone after line 1. No line 2 prints when no
component test relates to the diff or every path is a docs path; the whole project runs when a
rerun trigger or a deletion forces it, or when the selection cannot be computed.

**Measured lane.** Line 1 ran three times on 2026-10-10 over `c495ed11~1..8e2b7d29`, a 19-path
`src/lib` range, each under the heavy lock inside `systemd-run --user --wait -P -d`. The three
`Memory peak` values were 2G, 2G, and 2G (systemd rounds to the nearest 0.1G), under the light lane's
3G cap. That measurement ran without a cgroup limit, and it did not carry over: the same line, run
through `CAIRN_GATE_LANE=light cairn-run-gate` over `origin/main..HEAD`, exited 1 with `JavaScript
heap out of memory` in `check:reference`. Node sizes its default heap from the cgroup limit, about
1GB under the light cap, so a leg that peaks at 2G uncapped can still run out of heap there. Line 1
therefore stays on the heavy lane. Prove a lane by a run under that lane's own cap, never by a peak
measured outside it.

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
check:leaks, check:symbols, check:snippets, check:transcripts, check:visuals,
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
