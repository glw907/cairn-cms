// cairn-cms: the one list of checks. Each row names a check, the shell command it runs, whether it
// needs a fresh `dist`, the gate-table buckets that pick it in the fast lane, and its place in each
// group it belongs to. `run.mjs` runs a row or a group from this list, and every other caller reads
// the rows rather than keeping a list of its own.
//
// A row's command never builds the package: a check that reads `dist` sets `build`, and the runner
// builds once for it. Each group keeps its own run order through `groups`, because the close, the
// docs gate, and the full tier each run their checks in a different order.

/**
 * One check.
 * @typedef {object} Check
 * @property {string} name - The npm script that runs the row through `run.mjs`.
 * @property {string} command - The shell command, run through `sh -c` from the repo root.
 * @property {boolean} build - Whether a run of this row alone builds `dist` first.
 * @property {readonly string[]} buckets - The gate-table buckets that pick the row in the fast lane. With none, the fast lane sends a row that builds to `engine` and picks any other row for every diff.
 * @property {Readonly<Record<string, number>>} groups - Each group the row belongs to, mapped to its place in that group's run order.
 * @property {Readonly<Record<string, readonly string[]>>} [groupArgs] - Words a run of the named group appends to the command.
 * @property {readonly string[]} [targets] - Default trailing words, which a `--page` run replaces with the page.
 * @property {'narrow' | 'skip'} [page] - Under `--page`: `narrow` puts the page in place of the targets, and `skip` leaves the row out. Absent, the row runs unchanged.
 * @property {boolean} [distFree] - Whether a row outside the close never reads `dist`, so the fast lane runs it beside the dist chain.
 */

/**
 * Freeze a row and every array and object inside it.
 * @template T
 * @param {T} value - The value to freeze.
 * @returns {T} The same value, frozen all the way down.
 */
function deepFreeze(value) {
  if (value && typeof value === 'object') {
    for (const inner of Object.values(value)) deepFreeze(inner);
    Object.freeze(value);
  }
  return value;
}

/**
 * Every check. The array, each row, and each field inside a row are frozen.
 * @type {readonly Check[]}
 */
export const CHECKS = deepFreeze(
  /** @type {Check[]} */ ([
    {
      name: 'check',
      // A caller's NODE_OPTIONS comes after the cap, and node takes the last heap size it reads, so a
      // caller can still raise or lower it.
      command:
        'NODE_OPTIONS="--max-old-space-size=6144${NODE_OPTIONS:+ $NODE_OPTIONS}" svelte-check --tsconfig ./tsconfig.json && tsc -p src/tests/types/tsconfig.json',
      build: false,
      buckets: ['engine', 'scripts', 'harness'],
      groups: { close: 1 },
    },
    {
      name: 'check:package',
      command: `rm -rf template && publint --strict && T=$(mktemp -d) && trap 'rm -rf "$T"' EXIT && node scripts/build/pack-engine-template.mjs && npm pack --ignore-scripts --silent --pack-destination "$T" && attw "$T"/*.tgz --ignore-rules no-resolution cjs-resolves-to-esm internal-resolution-error && node scripts/checks/check-package-files.mjs && node scripts/checks/check-skill-budget.mjs`,
      build: true,
      buckets: ['exportSurface'],
      groups: { close: 2, full: 4 },
    },
    {
      name: 'check:audit-pack',
      command: 'node scripts/checks/check-audit-pack.mjs',
      build: true,
      buckets: ['exportSurface'],
      groups: { close: 3, full: 5 },
    },
    {
      name: 'check:options',
      command: 'node scripts/checks/check-options.mjs',
      build: true,
      buckets: ['exportSurface', 'docs', 'engine'],
      groups: { close: 4, 'docs-gate': 11 },
    },
    {
      name: 'check:tiers',
      command: 'node scripts/checks/check-tiers.mjs',
      build: true,
      buckets: ['exportSurface', 'engine'],
      groups: { close: 5, 'docs-gate': 12 },
    },
    {
      name: 'check:surface',
      command: 'node scripts/checks/check-surface-leaks.mjs && node scripts/checks/check-surface.mjs',
      build: true,
      buckets: ['exportSurface'],
      groups: { close: 6, full: 2 },
    },
    {
      name: 'check:self-use',
      command: 'node scripts/checks/check-self-use.mjs',
      build: true,
      buckets: ['exportSurface', 'showcase'],
      groups: { close: 7, full: 6 },
    },
    {
      name: 'check:custom-surface',
      command: 'node scripts/checks/check-custom-surface.mjs',
      build: true,
      buckets: ['engine', 'showcase'],
      groups: { close: 8, full: 7 },
    },
    {
      name: 'check:chassis-boundary',
      command: 'node scripts/checks/check-chassis-boundary.mjs',
      build: false,
      buckets: ['showcase', 'scripts'],
      groups: { close: 9, full: 8 },
    },
    {
      name: 'check:cm-internals',
      command: 'node scripts/checks/check-cm-internals.mjs',
      build: false,
      buckets: ['engine', 'scripts'],
      groups: { close: 10, full: 9 },
    },
    {
      name: 'check:idioms',
      command: 'node scripts/checks/check-idioms.mjs',
      build: false,
      buckets: ['engine', 'scripts'],
      groups: { close: 11, full: 10 },
    },
    {
      name: 'check:invisible-craft',
      command: 'node scripts/checks/check-invisible-craft.mjs',
      build: true,
      buckets: ['engine', 'showcase'],
      groups: { close: 12, full: 11 },
    },
    {
      name: 'check:admin-css-classes',
      command: 'node scripts/checks/check-admin-css-classes.mjs',
      build: true,
      buckets: [],
      groups: { close: 13, full: 12 },
    },
    {
      name: 'check:readiness',
      command: 'node scripts/checks/check-readiness.mjs',
      build: true,
      buckets: ['docs', 'engine'],
      groups: { close: 14, 'docs-gate': 9 },
    },
    {
      name: 'check:docs',
      command: 'node scripts/checks/docs-links.mjs',
      build: false,
      buckets: ['docs'],
      groups: { close: 15, 'docs-gate': 1 },
    },
    {
      name: 'check:rulings-format',
      command: 'node scripts/checks/check-rulings-format.mjs',
      build: false,
      buckets: ['docs'],
      groups: { close: 16, full: 13 },
    },
    {
      name: 'check:consumers-must',
      command: 'node scripts/checks/check-consumers-must.mjs',
      build: false,
      buckets: ['docs', 'scripts'],
      groups: { close: 17, full: 14 },
    },
    {
      name: 'check:editor-quotes',
      command: 'node scripts/checks/check-editor-quotes.mjs',
      build: false,
      buckets: ['docs', 'engine'],
      groups: { close: 18, 'docs-gate': 8 },
    },
    {
      name: 'check:leaks',
      command: 'node scripts/checks/check-leaks.mjs',
      build: false,
      buckets: ['docs', 'engine', 'showcase'],
      groups: { close: 19, 'docs-gate': 4 },
    },
    {
      name: 'check:visuals',
      command: 'node scripts/checks/check-visuals.mjs',
      build: true,
      buckets: ['docs', 'engine'],
      groups: { close: 20, 'docs-gate': 7 },
    },
    {
      name: 'check:symbols',
      command: 'node scripts/checks/check-symbols.mjs',
      build: false,
      buckets: ['docs', 'engine', 'showcase'],
      groups: { close: 21, 'docs-gate': 5 },
    },
    {
      name: 'check:snippets',
      command: 'node scripts/checks/check-snippets.mjs',
      build: true,
      buckets: ['docs', 'engine'],
      groups: { close: 22, 'docs-gate': 6 },
    },
    {
      name: 'check:prose',
      command: 'node scripts/checks/check-admin-prose.mjs',
      build: false,
      buckets: ['engine'],
      groups: { close: 23, full: 16 },
    },
    {
      name: 'check:version',
      command: 'node scripts/checks/check-version.mjs',
      build: false,
      buckets: ['docs', 'engine'],
      groups: { close: 24, full: 17 },
    },
    {
      name: 'check:dev-package',
      command: 'node scripts/checks/check-dev-package.mjs',
      build: false,
      buckets: ['engine'],
      groups: { close: 25, full: 18 },
    },
    {
      name: 'check:template',
      command: 'node scripts/build/emit-template-dir.mjs --check',
      build: false,
      buckets: ['showcase', 'engine'],
      groups: { close: 26, full: 19 },
    },
    {
      name: 'check:consumers',
      command: 'node scripts/checks/check-consumers.mjs',
      build: true,
      buckets: ['exportSurface', 'showcase'],
      groups: { close: 27, full: 20 },
    },
    {
      name: 'check:showcase-types',
      command: 'npm --prefix examples/showcase run check',
      build: false,
      buckets: ['showcase', 'engine'],
      groups: { close: 28, full: 21 },
    },
    {
      name: 'check:showcase-cairn',
      command: 'npm --prefix examples/showcase run check:cairn',
      build: false,
      buckets: ['showcase', 'engine'],
      groups: { close: 29, full: 22 },
    },
    {
      name: 'check:showcase-format',
      command: 'npm --prefix examples/showcase run format:check',
      build: false,
      buckets: ['showcase'],
      groups: { close: 30, full: 24 },
    },
    {
      name: 'check:public-skill',
      command: 'node scripts/checks/check-public-skill.mjs',
      build: true,
      buckets: ['docs', 'exportSurface', 'showcase'],
      groups: { close: 31, full: 25 },
    },
    {
      name: 'check:vale',
      command: 'vale --minAlertLevel=error',
      build: false,
      buckets: ['docs'],
      groups: { close: 32, 'docs-gate': 2 },
      targets: ['docs', 'README.md', 'examples/showcase/README.md'],
      page: 'narrow',
    },
    {
      name: 'check:comments',
      command: 'bash scripts/checks/check-comments.sh',
      build: false,
      buckets: ['engine', 'showcase', 'scripts'],
      groups: { close: 33, full: 1 },
    },
    {
      name: 'check:public-tokens',
      command: 'node scripts/checks/check-public-scope.mjs',
      build: true,
      buckets: ['engine', 'showcase'],
      groups: { close: 34 },
    },
    {
      name: 'check:definitions',
      command: 'node scripts/checks/check-definitions.mjs',
      build: false,
      buckets: ['showcase', 'exportSurface', 'scripts'],
      groups: { full: 15 },
      distFree: true,
    },
    {
      name: 'test:emit',
      command:
        'node --test scripts/build/emit-definitions.test.mjs scripts/build/emit-template.test.mjs scripts/build/emit-template-dir.test.mjs scripts/build/bake-template.test.mjs scripts/build/starter-overlay.test.mjs scripts/build/pack-engine-template.test.mjs scripts/build/plugin-manifests.test.mjs scripts/theme/theme-names.test.mjs scripts/theme/build-tokens.test.mjs scripts/theme/contract.test.mjs scripts/theme/lay-in.test.mjs .claude/skills/cairn-writing-docs/evals/run.test.mjs .claude/skills/cairn-writing-docs/evals/run-site.test.mjs',
      build: false,
      buckets: ['showcase', 'engine', 'harness', 'plugins'],
      groups: { full: 3 },
    },
    {
      name: 'check:showcase-unit',
      command: 'npm --prefix examples/showcase run test:unit',
      build: false,
      buckets: ['showcase', 'engine'],
      groups: { full: 23 },
    },
    {
      name: 'test:theme',
      command: 'node --test --test-force-exit --test-concurrency=2 scripts/theme/*.test.mjs',
      build: false,
      buckets: ['theme'],
      groups: { full: 26 },
    },
    {
      name: 'check:theme',
      command: 'node scripts/theme/check.mjs',
      build: false,
      buckets: [],
      groups: { full: 27 },
      groupArgs: { full: ['--catalog'] },
    },
    {
      name: 'test:catalog',
      command: `node --test --test-force-exit 'scripts/catalog/**/*.test.mjs'`,
      build: false,
      buckets: ['scripts', 'showcase'],
      groups: { full: 28 },
    },
    {
      name: 'check:version-rise',
      // With no range given, the check compares the merge base with origin/main.
      command: 'node scripts/catalog/version-rise.mjs',
      build: false,
      buckets: ['showcase'],
      groups: { full: 29 },
    },
    {
      name: 'check:site-record-page',
      command: 'node scripts/checks/check-site-record-page.mjs',
      build: false,
      buckets: [],
      groups: { 'docs-gate': 10 },
    },
    {
      name: 'check:tellgrader',
      // Workstation-only: skips with one line and passes when the tellgrader binary is absent (CI).
      command: 'node scripts/checks/check-tellgrader.mjs',
      build: false,
      buckets: ['docs'],
      groups: { 'docs-gate': 13 },
      targets: [],
      page: 'narrow',
      distFree: true,
    },
    {
      name: 'check:vale-rules',
      // A Cairn rule's pass and fail cases guard the rule itself, not a page, so a page run skips them.
      command:
        'vale --config=.vale/tests/vale.ini test .vale/styles/Cairn/Headings.test.yml .vale/styles/Cairn/ProseProcedure.test.yml',
      build: false,
      buckets: ['docs'],
      groups: { 'docs-gate': 3 },
      page: 'skip',
      distFree: true,
    },
  ]),
);

/**
 * Each group, mapped to the npm script that runs it. A group with no script (`full`) is read only
 * by the gate tiers, never run through `run.mjs`.
 * @type {Readonly<Record<string, string | null>>}
 */
export const GROUPS = Object.freeze({ close: 'check:close', 'docs-gate': 'check:docs-gate', full: null });
