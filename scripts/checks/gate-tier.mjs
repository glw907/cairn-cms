// cairn-cms: the per-task gate classifier. The dotfiles chain runner
// (~/.claude/workflows/pass-execute.js) calls this after an implementer commits and before the
// gate, so the gate string a task runs is sized to its committed diff, not the plan's forecast.
// docs/internal/pass-gate-tiers.md is the page a reviewer reads to reproduce a classification.
//
// Interface: `node scripts/checks/gate-tier.mjs --range <base>..HEAD [--paint yes|no] [--class
// <passClass>] [--pin <tier>]`. On success the gate string is the ONLY line on stdout; the legs and
// the reasons behind them print to stderr. On an empty range, a git failure, an unknown class, or an
// unknown pin, nothing prints to stdout and the process exits non-zero, so a caller that captures
// only stdout gets a shell-safe empty string rather than a bogus gate command; the runner's own
// prompt falls back to the plan's gate string in that case.
//
// The default output is the targeted gate. Its legs run in this order:
//
//   1. `npm run package`, unconditionally.
//   2. The static checks the diff's buckets select, through the build-once runner's subset form
//      (`npm run check:close -- <label>...`, see close-prebuilt.mjs), plus the few checks that sit
//      outside check:close.
//   3. The whole node projects. They hold the guard tests that read files, spawn scripts, or walk
//      trees, which no import graph can see.
//   4. The component project, narrowed to the tests Vitest's own related selection picks for the
//      diff. The whole project runs on a rerun trigger, a deleted or renamed path under `src/`, or an
//      empty selection. A diff whose every path is a docs path (or a path no check reads) skips
//      the leg, since the component project cannot see it.
//   5. The create-cairn-site suite, when the diff touches the package, the showcase it bakes from,
//      the emitter, or the root package.json.
//   6. The e2e specs the table's map selects, at zero retries, on a port of its own.
//
// The buckets, the per-check bucket lists, the no-check list, the e2e map, and the protected paths
// live in gate-table.json beside this file. Fail closed: a path the table cannot place runs every
// static check and the whole e2e suite, a selection that cannot be computed runs the whole
// component project, and any failure prints nothing on stdout and exits non-zero.
//
// `--pin <tier>` bypasses all of it and prints the old tier string for that tier, unchanged.
// `tool/**`, the Go `cairn` CLI module, keeps its own gate (`make -C tool check`): a diff with
// paths on both sides runs the targeted gate and then the tool gate.
//
// `--protected` is a separate mode. It prints `ciWait` when the range touches a path on the table's
// protected list and nothing otherwise, exiting zero either way. It reads the list at `<base>`, so a
// range that removes its own entry still flags, and an unreadable table at `<base>` flags too. It
// never changes the default mode's output.
//
// This is dependency-based test selection, the method Google's TAP uses to pick the tests a change
// can affect (Memon et al., "Taming Google-Scale Continuous Testing", ICSE-SEIP 2017), applied
// where the graph is sound: the component project, the slowest serialized leg.
//
// This classifier chooses a gate, never a gate lane. A plan that pins the light lane for a Go-only
// pass must not carry that pin onto a mixed diff whose npm half launches a browser suite; the lane
// decision stays with the caller.
import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { posix, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { repoRoot } from '../repo-root.mjs';
import { COMPONENT_RERUN_TRIGGERS } from '../test/component-rerun-triggers.mjs';
import { CLOSE_COMPONENTS, PACKAGE_PREFIX, closeSteps } from './close-prebuilt.mjs';

const ROOT = repoRoot(import.meta.url);

/** The repo-relative path of the committed bucket, e2e-map, and protected-path table. */
export const TABLE_PATH = 'scripts/checks/gate-table.json';

// The five npm gate strings are cumulative, each a strict superset of every tier below it, built
// by concatenation rather than five independent literals so the superset relationship cannot
// drift. TOOL_GATE stands alone: `make -C tool check` proves the Go module's own three legs and
// is never folded into or out of the npm chain.
//
// DOCS_GATE is the one `check:docs-gate` script (scripts/checks/docs-gate.mjs), which owns the
// full docs check list. That list already includes check:snippets, check:transcripts, and
// check:symbols, so FULL_GATE does not repeat them.
const DOCS_GATE = 'npm run check:docs-gate';
// Stock `npm test` runs the vitest component project (real Chromium) in parallel with the three
// node projects, and that parallel component run stalls on the maintainer's workstation. This
// gate runs the node projects first, then the component project alone with file parallelism off,
// so the local gate stays reliable. CI's `test.yml` keeps running `npm test` and stays parallel;
// this serialization is local-gate-only. `npm test` (root) never reaches the create-cairn-site
// workspace member's own `node --test` suite, so its own invocation is appended here too, to
// keep the five-tier superset chain intact rather than adding a sixth severity level for one
// workspace member.
const SCRIPTS_GATE = `${DOCS_GATE} && npm run check && npm run test:node-projects && npm run test:component -- --no-file-parallelism && npm test -w packages/create-cairn-site`;
const ADMIN_VISUAL_GATE = `${SCRIPTS_GATE} && npm --prefix examples/showcase run test:e2e -- admin-visual.spec.ts`;
// The CI `test` job's remaining steps, in test.yml's own order, so the full tier proves everything
// CI would. The steps already in a lower tier (`npm run check`, the test projects, the docs gate,
// the create-cairn-site suite) and the install and bake steps a local gate cannot run are not
// repeated; the gate-tier test pins this list against test.yml.
const CI_CHECKS = [
  'npm run test:emit',
  'npm run check:package',
  'npm run check:audit-pack',
  'npm run check:self-use',
  'npm run check:custom-surface',
  'npm run check:chassis-boundary',
  'npm run check:cm-internals',
  'npm run check:idioms',
  'npm run check:invisible-craft',
  'npm run check:admin-css-classes',
  'npm run check:rulings-format',
  'npm run check:prose',
  'npm run check:version',
  'npm run check:dev-package',
  'npm run check:template',
  'npm run check:consumers',
  'npm --prefix examples/showcase run check',
  'npm --prefix examples/showcase run check:cairn',
  'npm --prefix examples/showcase run test:unit',
  'npm --prefix examples/showcase run format:check',
  'npm run check:public-skill',
  'npm run check:tool-heuristics',
].join(' && ');
const FULL_GATE = `${ADMIN_VISUAL_GATE} && npm run check:comments && npm run check:surface && ${CI_CHECKS} && npm --prefix examples/showcase run test:e2e`;
const TOOL_GATE = 'make -C tool check';

/**
 * The gate string for every tier. `scripts` and `engine` run the identical string (both are
 * "prove the code and its tests"); each of the five npm tiers' strings is a superset of the one
 * below it. `tool` is the one exception: it is not part of that superset chain, so its string
 * shares nothing with the other five.
 * @type {Record<string, string>}
 */
export const TIER_GATES = {
  docs: DOCS_GATE,
  scripts: SCRIPTS_GATE,
  engine: SCRIPTS_GATE,
  'admin-visual': ADMIN_VISUAL_GATE,
  full: FULL_GATE,
  tool: TOOL_GATE,
};

/** The five npm tier names, ascending severity; `--pin` accepts these and `tool`. */
export const TIER_ORDER = ['docs', 'scripts', 'engine', 'admin-visual', 'full'];

/** The pass classes `--class` accepts; only `auth-data` changes the output. */
export const PASS_CLASSES = ['auth-data', 'engine-logic', 'paint', 'sweep', 'docs', 'tool'];

const NODE_PROJECTS = 'npm run test:node-projects';
const COMPONENT_FULL = 'npm run test:component -- --no-file-parallelism';
const COMPONENT_SELECTED = 'CAIRN_RELATED_RUN=1 npm run test:component -- --no-file-parallelism';
const CREATE_CAIRN_SITE = 'npm test -w packages/create-cairn-site';
const E2E_PORT = '4392';
const E2E_GUARD = `export E2E_PORT=${E2E_PORT} && ! ss -Htln 'sport = :${E2E_PORT}' | grep -q .`;
const E2E_RUN = 'npm --prefix examples/showcase run test:e2e -- --retries=0';
const E2E_VISUAL_INVERT = ' --grep-invert "site home|archive page 2"';
const SITE_VISUAL = 'site-visual.spec.ts';

/**
 * Repo-relative globs whose change reaches the create-cairn-site suite: the package itself, the
 * showcase its template is baked from, the emitter that bakes it, and the root package.json whose
 * versions the bake writes into the template.
 */
export const CREATE_CAIRN_SITE_TRIGGERS = [
  'packages/create-cairn-site/**',
  'examples/showcase/**',
  'scripts/build/emit-template*',
  'package.json',
];

// Test trees the component project never includes, so a change there reaches no component test.
const NODE_ONLY_TESTS = ['src/tests/unit/**', 'src/tests/integration/**', 'src/tests/lab/**', 'src/tests/types/**'];

/**
 * @typedef {object} GateTable
 * @property {Record<string, string[]>} buckets - Bucket name to its path patterns.
 * @property {string[]} noCheck - Paths no check and no test reads.
 * @property {string[]} scriptsTestOnly - Script directories only tests and the comment lint read.
 * @property {Record<string, string[]>} checks - Check label to the buckets that select it.
 * @property {Record<string, string>} extraCommands - Checks outside check:close, by label.
 * @property {{ floor: { prefixes: string[], specs: string[] }, unmappedLib: string[], authData: string[], paint: string[], map: { prefixes: string[], specs: string[] }[] }} e2e - The e2e map.
 * @property {string[]} protected - Paths whose change waits for CI green.
 */

/** The characters that make a table pattern a glob rather than a prefix or an exact path. */
const GLOB_CHARS = /[*?[\]{}]/;

/**
 * Whether a path matches one table pattern. A pattern ending in a slash is a literal directory
 * prefix, a pattern with no glob character is an exact path, and anything else is a glob. Dot
 * paths (`.vale/`, `.github/`) are written as prefixes because a double star never crosses a dot
 * directory.
 * @param {string} path - A repo-relative, forward-slash path.
 * @param {string} pattern - A table pattern.
 * @returns {boolean} Whether the path matches.
 */
export function matchesPattern(path, pattern) {
  if (pattern.endsWith('/')) return path.startsWith(pattern);
  if (!GLOB_CHARS.test(pattern)) return path === pattern;
  return posix.matchesGlob(path, pattern);
}

/**
 * Whether a path matches any pattern of a list.
 * @param {string} path - A repo-relative path.
 * @param {readonly string[]} patterns - Table patterns.
 * @returns {boolean} Whether any pattern matches.
 */
function matchesAny(path, patterns) {
  return patterns.some((pattern) => matchesPattern(path, pattern));
}

/**
 * Every pattern string the table carries, for the shape check.
 * @param {GateTable} table - The parsed table.
 * @returns {string[]} The patterns of every list.
 */
function allPatterns(table) {
  return [
    ...Object.values(table.buckets).flat(),
    ...table.noCheck,
    ...table.scriptsTestOnly,
    ...table.protected,
    ...table.e2e.floor.prefixes,
    ...table.e2e.map.flatMap((entry) => entry.prefixes),
  ];
}

/**
 * The shape problems of a table: a glob pattern with a dot segment (a double star before `.vale`, say) would
 * match nothing under a dot directory, so a dot path must be a literal prefix or an exact path.
 * @param {GateTable} table - The parsed table.
 * @returns {string[]} One message per problem; empty when the table is sound.
 */
export function tableProblems(table) {
  return allPatterns(table)
    .filter(
      (pattern) =>
        GLOB_CHARS.test(pattern) && pattern.split('/').some((segment) => segment.length > 1 && segment.startsWith('.')),
    )
    .map((pattern) => `dot pattern "${pattern}" must be a literal prefix, not a glob`);
}

/**
 * Read and check the table in a checkout.
 * @param {string} [root] - The repo root.
 * @returns {GateTable} The parsed table.
 * @throws {Error} When the table has a shape problem.
 */
export function loadTable(root = ROOT) {
  const table = JSON.parse(readFileSync(resolve(root, TABLE_PATH), 'utf8'));
  const problems = tableProblems(table);
  if (problems.length > 0) throw new Error(`gate-tier: ${TABLE_PATH}: ${problems.join('; ')}`);
  return table;
}

/**
 * @typedef {object} Context
 * @property {string} root - The repo root the context reads.
 * @property {GateTable} table - The parsed table.
 * @property {string[]} labels - Every selectable check label, in run order, extras last.
 * @property {string[]} closeLabels - The check:close component labels.
 * @property {Set<string>} packagePrefixed - Labels whose own script starts with the package build.
 * @property {Map<string, Set<string>>} closures - Label to the script files its entry reaches.
 * @property {Set<string>} exportEntries - Source files behind a package export.
 */

/** @type {Map<string, Context>} */
const contexts = new Map();

/**
 * The repo's check universe and table, read once per root.
 * @param {string} [root] - The repo root.
 * @returns {Context} The context.
 */
export function loadContext(root = ROOT) {
  const cached = contexts.get(root);
  if (cached) return cached;
  const pkg = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'));
  const table = loadTable(root);
  const steps = closeSteps(pkg.scripts);
  const closeLabels = steps.map((step) => step.label);
  /** @type {Map<string, string>} */
  const bodies = new Map(steps.map((step, index) => [step.label, closeBody(CLOSE_COMPONENTS[index], pkg.scripts)]));
  const packagePrefixed = new Set(
    [...bodies].filter(([, body]) => body.startsWith(PACKAGE_PREFIX)).map(([label]) => label),
  );
  for (const [label, command] of Object.entries(table.extraCommands)) bodies.set(label, command);
  const closures = new Map([...bodies].map(([label, body]) => [label, scriptClosure(body, root)]));
  const exportEntries = new Set();
  for (const target of JSON.stringify(pkg.exports ?? {}).matchAll(/"\.\/dist\/([^"]+?)\.(?:d\.ts|js)"/g)) {
    exportEntries.add(`src/lib/${target[1]}.ts`);
  }
  const context = {
    root,
    table,
    labels: [...closeLabels, ...Object.keys(table.extraCommands)],
    closeLabels,
    packagePrefixed,
    closures,
    exportEntries,
  };
  contexts.set(root, context);
  return context;
}

/**
 * The script text a close component runs, for reading which script files it names.
 * @param {string} component - A CLOSE_COMPONENTS entry.
 * @param {Record<string, string>} scripts - package.json's scripts block.
 * @returns {string} The component's script body, or the component text itself.
 */
function closeBody(component, scripts) {
  const named = component.match(/^npm run (\S+)$/);
  return named ? (scripts[named[1]] ?? component) : component;
}

/**
 * The script files a check reaches: every `scripts/` path its command names, plus everything those
 * files import by a relative specifier.
 * @param {string} body - The check's command text.
 * @param {string} root - The repo root.
 * @returns {Set<string>} Repo-relative paths.
 */
function scriptClosure(body, root) {
  /** @type {Set<string>} */
  const seen = new Set();
  const queue = [...body.matchAll(/scripts\/[\w./-]+/g)].map((match) => match[0]);
  while (queue.length > 0) {
    const file = /** @type {string} */ (queue.pop());
    if (seen.has(file)) continue;
    seen.add(file);
    if (!/\.(?:mjs|js|ts)$/.test(file) || !existsSync(resolve(root, file))) continue;
    const text = readFileSync(resolve(root, file), 'utf8');
    for (const spec of text.matchAll(/(?:from\s*|import\s*\(\s*|import\s+)['"](\.{1,2}\/[^'"]+)['"]/g)) {
      queue.push(posix.normalize(posix.join(posix.dirname(file), spec[1])));
    }
  }
  return seen;
}

/**
 * The buckets a path belongs to. A path may belong to several.
 * @param {string} path - A repo-relative path.
 * @param {Context} context - The check universe and table.
 * @returns {Set<string>} Bucket names; empty for a path the table cannot place.
 */
export function pathBuckets(path, context) {
  const found = new Set(
    Object.entries(context.table.buckets)
      .filter(([, patterns]) => matchesAny(path, patterns))
      .map(([name]) => name),
  );
  if (context.exportEntries.has(path)) found.add('exportSurface');
  return found;
}

/**
 * Whether a path is on the no-check list.
 * @param {string} path - A repo-relative path.
 * @param {Context} context - The check universe and table.
 * @returns {boolean} True for a path no check and no test reads.
 */
export function isNoCheck(path, context) {
  return context.table.noCheck.includes(path);
}

/**
 * The static checks a diff selects. A path the table cannot place selects every check, so does a
 * script file no check reaches (unless only tests read that directory), and a check the table
 * leaves unlisted and whose script does not start with the package build runs on every diff.
 * @param {string[]} paths - The diff's non-tool paths.
 * @param {Context} context - The check universe and table.
 * @returns {{ labels: string[], all: boolean, reasons: string[] }} The selected labels in run order.
 */
export function selectChecks(paths, context) {
  const { table } = context;
  /** @type {Set<string>} */
  const picked = new Set();
  /** @type {string[]} */
  const reasons = [];
  let all = false;
  const live = paths.filter((path) => !isNoCheck(path, context));
  for (const path of live) {
    const buckets = pathBuckets(path, context);
    if (buckets.size === 0) {
      all = true;
      reasons.push(`${path} is in no bucket, so every static check runs`);
      continue;
    }
    for (const label of context.labels) {
      const listed = table.checks[label];
      const wants = listed ?? (context.packagePrefixed.has(label) ? ['engine'] : null);
      if (wants === null || wants.some((bucket) => buckets.has(bucket))) picked.add(label);
    }
    if (path.startsWith('scripts/') && !matchesAny(path, table.scriptsTestOnly)) {
      const reached = context.labels.filter((label) => context.closures.get(label)?.has(path));
      for (const label of reached) picked.add(label);
      if (reached.length === 0 && [...buckets].every((bucket) => bucket === 'scripts')) {
        all = true;
        reasons.push(`${path} is read by no check, so every static check runs`);
      }
    }
  }
  const labels = all ? context.labels : context.labels.filter((label) => picked.has(label));
  return { labels, all, reasons };
}

/**
 * A word as one shell argument: bare when it holds only safe characters, single-quoted otherwise.
 * @param {string} word - The text to pass.
 * @returns {string} The shell-safe form.
 */
function shellQuote(word) {
  return /^[\w@%+=:,./-]+$/.test(word) ? word : `'${word.replaceAll("'", `'\\''`)}'`;
}

/**
 * The static leg: the selected close checks through the build-once runner, then the extras.
 * @param {string[]} labels - Selected labels in run order.
 * @param {Context} context - The check universe and table.
 * @returns {string[]} Zero to several `&&`-joined commands.
 */
function staticLeg(labels, context) {
  const closeSelected = labels.filter((label) => context.closeLabels.includes(label));
  const commands = [];
  if (closeSelected.length === context.closeLabels.length) commands.push('npm run check:close');
  else if (closeSelected.length > 0) commands.push(`npm run check:close -- ${closeSelected.map(shellQuote).join(' ')}`);
  for (const label of labels) {
    if (context.table.extraCommands[label]) commands.push(context.table.extraCommands[label]);
  }
  return commands;
}

/**
 * Whether the docs bucket is the only bucket a path belongs to.
 * @param {string} path - A repo-relative path.
 * @param {Context} context - The check universe and table.
 * @returns {boolean} True for a path only the docs checks read.
 */
function isDocsOnlyPath(path, context) {
  const buckets = pathBuckets(path, context);
  return buckets.size === 1 && buckets.has('docs');
}

/**
 * How the component project runs for a diff.
 * @param {string[]} paths - The diff's non-tool paths.
 * @param {string[]} deleted - The paths the diff deletes, renames away included.
 * @param {Context} context - The check universe and table.
 * @returns {{ mode: 'skip' | 'full' | 'select', reason: string, reach: string[] }} `select` means
 *   the caller computes Vitest's related selection over `reach` before the string is built.
 */
export function componentPlan(paths, deleted, context) {
  const docsOnly = paths.every((path) => isNoCheck(path, context) || isDocsOnlyPath(path, context));
  if (docsOnly) return { mode: 'skip', reason: 'every path is a docs path or one no check reads', reach: [] };
  const forcing = paths.filter((path) => matchesAny(path, COMPONENT_RERUN_TRIGGERS));
  if (forcing.length > 0) return { mode: 'full', reason: `rerun trigger ${forcing.join(', ')}`, reach: [] };
  const gone = deleted.filter((path) => path.startsWith('src/'));
  if (gone.length > 0) return { mode: 'full', reason: `deleted or renamed ${gone.join(', ')}`, reach: [] };
  const goneSet = new Set(deleted);
  const reach = paths.filter(
    (path) => path.startsWith('src/') && !matchesAny(path, NODE_ONLY_TESTS) && !goneSet.has(path),
  );
  if (reach.length === 0) return { mode: 'full', reason: 'nothing under src/ to select from', reach: [] };
  return { mode: 'select', reason: 'related selection', reach };
}

/**
 * The e2e specs a diff reaches.
 * @param {string[]} paths - The diff's non-tool paths.
 * @param {{ passClass?: string | null, paint?: 'yes' | 'no' }} options - Pass class and paint flag.
 * @param {Context} context - The check universe and table.
 * @returns {{ all: boolean, specs: string[] }} The whole suite, or the sorted spec names.
 */
export function e2eSpecs(paths, options, context) {
  const { e2e } = context.table;
  /** @type {Set<string>} */
  const specs = new Set();
  let all = false;
  for (const path of paths) {
    if (isNoCheck(path, context)) continue;
    const own = path.match(/^examples\/showcase\/e2e\/([^/]+\.spec\.ts)(?:-snapshots\/.*)?$/);
    if (own) {
      specs.add(own[1]);
      continue;
    }
    if (path.startsWith('examples/showcase/e2e/')) {
      all = true;
      continue;
    }
    const buckets = pathBuckets(path, context);
    if (buckets.size === 0) {
      all = true;
      continue;
    }
    if (matchesAny(path, e2e.floor.prefixes)) for (const spec of e2e.floor.specs) specs.add(spec);
    const mapped = e2e.map.filter((entry) => matchesAny(path, entry.prefixes));
    for (const entry of mapped) for (const spec of entry.specs) specs.add(spec);
    if (mapped.length > 0) continue;
    if (path.startsWith('examples/showcase/')) {
      all = true;
    } else if (buckets.has('engine') || buckets.has('exportSurface')) {
      for (const spec of e2e.unmappedLib) specs.add(spec);
    }
  }
  if (options.passClass === 'auth-data') for (const spec of e2e.authData) specs.add(spec);
  if (options.paint === 'yes') for (const spec of e2e.paint) specs.add(spec);
  return { all, specs: [...specs].sort() };
}

/**
 * The e2e leg: the port export, the no-listener guard, and the Playwright run.
 * @param {{ all: boolean, specs: string[] }} selection - The reached specs.
 * @returns {string | null} The command, or null when no spec is reached.
 */
function e2eLeg(selection) {
  if (!selection.all && selection.specs.length === 0) return null;
  const invert = selection.all || selection.specs.includes(SITE_VISUAL) ? E2E_VISUAL_INVERT : '';
  const names = selection.all ? '' : ` ${selection.specs.join(' ')}`;
  return `${E2E_GUARD} && ${E2E_RUN}${names}${invert}`;
}

/**
 * @typedef {object} Decision
 * @property {string} tier - `targeted`, `tool`, `targeted+tool`, or the pinned tier.
 * @property {string} reason - `computed` or `pin`.
 * @property {string[]} decidingPaths - Always empty for a pin.
 * @property {string} gate - The gate string.
 * @property {string[]} notes - Why each leg is what it is, for stderr.
 */

/**
 * Resolve a diff into the gate to run.
 * @param {string[]} paths - Every changed path, deleted ones included.
 * @param {{ paint?: 'yes' | 'no', pin?: string | null, passClass?: string | null, deleted?: string[], selected?: string[] | null, root?: string }} [opts] -
 *   `selected` is Vitest's related selection over `componentPlan(...).reach`; absent means the
 *   whole component project runs.
 * @returns {Decision} The decision.
 * @throws {Error} On an unknown pin tier or pass class.
 */
export function decideGate(paths, opts = {}) {
  const { paint = 'no', pin = null, passClass = null, deleted = [], selected = null, root = ROOT } = opts;
  if (pin) {
    if (!Object.hasOwn(TIER_GATES, pin)) {
      const known = [...TIER_ORDER, 'tool'].join(', ');
      throw new Error(`gate-tier: unknown --pin tier "${pin}" (want one of ${known})`);
    }
    return { tier: pin, reason: 'pin', decidingPaths: [], gate: TIER_GATES[pin], notes: [] };
  }
  if (passClass !== null && !PASS_CLASSES.includes(passClass)) {
    throw new Error(`gate-tier: unknown --class "${passClass}" (want one of ${PASS_CLASSES.join(', ')})`);
  }

  if (paths.length === 0) throw new Error('gate-tier: no changed paths to size a gate from');
  const toolPaths = paths.filter((path) => path.startsWith('tool/'));
  const npmPaths = paths.filter((path) => !path.startsWith('tool/'));
  if (npmPaths.length === 0) {
    return { tier: 'tool', reason: 'computed', decidingPaths: toolPaths, gate: TIER_GATES.tool, notes: [] };
  }

  const context = loadContext(root);
  /** @type {string[]} */
  const notes = [];
  const legs = ['npm run package'];

  const checks = selectChecks(npmPaths, context);
  notes.push(...checks.reasons);
  notes.push(`static checks: ${checks.labels.length === 0 ? 'none' : checks.labels.join(', ')}`);
  legs.push(...staticLeg(checks.labels, context));

  legs.push(NODE_PROJECTS);

  const plan = componentPlan(npmPaths, deleted, context);
  if (plan.mode === 'skip') {
    notes.push(`component project skipped: ${plan.reason}`);
  } else if (plan.mode === 'select' && selected && selected.length > 0) {
    notes.push(`component project: ${selected.length} related test file(s)`);
    legs.push(`${COMPONENT_SELECTED} ${selected.map(shellQuote).join(' ')}`);
  } else {
    const why = plan.mode === 'select' ? 'empty or uncomputed selection' : plan.reason;
    notes.push(`component project: whole (${why})`);
    legs.push(COMPONENT_FULL);
  }

  if (npmPaths.some((path) => matchesAny(path, CREATE_CAIRN_SITE_TRIGGERS))) legs.push(CREATE_CAIRN_SITE);

  const e2e = e2eLeg(e2eSpecs(npmPaths, { passClass, paint }, context));
  if (e2e) legs.push(e2e);

  const gate = legs.join(' && ');
  if (toolPaths.length === 0) {
    return { tier: 'targeted', reason: 'computed', decidingPaths: [], gate, notes };
  }
  return {
    tier: 'targeted+tool',
    reason: 'computed',
    decidingPaths: toolPaths,
    gate: `${gate} && ${TIER_GATES.tool}`,
    notes,
  };
}

/**
 * Vitest's related selection for the component project over a set of changed files, with the
 * trigger switch on so a rerun trigger selects every file.
 * @param {string[]} reach - Repo-relative changed files.
 * @param {string} [root] - The repo root.
 * @returns {Promise<string[] | null>} Sorted repo-relative test files, or null when the selection
 *   could not be computed (the caller then runs the whole project).
 */
export async function selectComponentTests(reach, root = ROOT) {
  const previous = process.env.CAIRN_RELATED_RUN;
  process.env.CAIRN_RELATED_RUN = '1';
  try {
    const { createVitest } = await import('vitest/node');
    const vitest = await createVitest(
      'test',
      { root, related: reach.map((file) => resolve(root, file)), project: ['component'], run: true, watch: false },
      {},
      {},
    );
    try {
      const specs = await vitest.getRelevantTestSpecifications();
      return specs.map((spec) => posix.relative(root, spec.moduleId)).sort();
    } finally {
      await vitest.close();
    }
  } catch {
    return null;
  } finally {
    if (previous === undefined) delete process.env.CAIRN_RELATED_RUN;
    else process.env.CAIRN_RELATED_RUN = previous;
  }
}

/**
 * Parse the fixed CLI shape: `--range <spec>`, an optional `--paint yes|no`, an optional
 * `--class <passClass>`, an optional `--pin <tier>`, and the bare `--protected`.
 * @param {string[]} argv - Arguments after the script path.
 * @returns {{ range: string | null, paint: 'yes' | 'no', pin: string | null, passClass: string | null, protectedMode: boolean }}
 *   The parsed flags; `passClass` is null when the flag is absent and empty when it lacks a value.
 */
export function parseArgs(argv) {
  let range = null;
  /** @type {'yes' | 'no'} */
  let paint = 'no';
  let pin = null;
  let passClass = null;
  let protectedMode = false;
  for (let i = 0; i < argv.length; i++) {
    switch (argv[i]) {
      case '--range':
        range = argv[++i] ?? null;
        break;
      case '--paint':
        paint = argv[++i] === 'yes' ? 'yes' : 'no';
        break;
      case '--pin':
        pin = argv[++i] ?? null;
        break;
      case '--class':
        passClass = argv[++i] ?? '';
        break;
      case '--protected':
        protectedMode = true;
        break;
    }
  }
  return { range, paint, pin, passClass, protectedMode };
}

/**
 * Every changed path in `range` with its status, renames split into a delete and an add so the old
 * path is never lost.
 * @param {string} range - A git range.
 * @param {string} [root] - The repo root.
 * @returns {{ status: string, path: string }[] | null} Null when git itself fails (a malformed
 *   range, a missing ref); empty when git succeeds but the range carries no diff.
 */
export function diffEntries(range, root = ROOT) {
  const result = spawnSync('git', ['diff', '--name-status', '--no-renames', '-z', range], {
    cwd: root,
    encoding: 'utf8',
  });
  if (result.error || result.status !== 0) return null;
  const fields = result.stdout.split('\0').filter((field) => field.length > 0);
  const entries = [];
  for (let i = 0; i + 1 < fields.length; i += 2) entries.push({ status: fields[i], path: fields[i + 1] });
  return entries;
}

/**
 * The `--protected` verdict for a range. The protected list is read from the table at the range's
 * base commit, so a range that deletes its own entry still flags; a table that is absent or
 * unreadable at the base flags too.
 * @param {string} range - A git range `<base>..<head>`.
 * @param {string} [root] - The repo root.
 * @returns {{ verdict: 'ciWait' | 'none' | 'error', reason?: string }} The verdict; `error` is a
 *   git failure.
 */
export function protectedVerdict(range, root = ROOT) {
  const entries = diffEntries(range, root);
  if (entries === null) return { verdict: 'error', reason: `git diff failed for range "${range}"` };
  if (entries.length === 0) return { verdict: 'none' };
  const base = range.split('..')[0];
  const shown = spawnSync('git', ['show', `${base}:${TABLE_PATH}`], { cwd: root, encoding: 'utf8' });
  if (shown.error || shown.status !== 0) {
    return { verdict: 'ciWait', reason: `${TABLE_PATH} is absent or unreadable at ${base}` };
  }
  let list;
  try {
    list = JSON.parse(shown.stdout).protected;
  } catch {
    return { verdict: 'ciWait', reason: `${TABLE_PATH} at ${base} is not valid JSON` };
  }
  if (!Array.isArray(list) || list.some((pattern) => typeof pattern !== 'string')) {
    return { verdict: 'ciWait', reason: `${TABLE_PATH} at ${base} has no protected list` };
  }
  const hit = entries.find((entry) => matchesAny(entry.path, list));
  return hit ? { verdict: 'ciWait', reason: `${hit.path} is protected` } : { verdict: 'none' };
}

/**
 * Report a refusal on stderr and set the failing exit code, leaving stdout empty so a caller that
 * captures only stdout gets a shell-safe empty string.
 * @param {string} message - The refusal.
 */
function fail(message) {
  console.error(message);
  process.exitCode = 1;
}

/**
 * Read the flags, classify the range, and print the gate (or the protected verdict).
 * @returns {Promise<void>} Resolves once the output is printed or the refusal reported.
 */
async function main() {
  const { range, paint, pin, passClass, protectedMode } = parseArgs(process.argv.slice(2));
  if (!range) return fail('gate-tier: --range <base>..HEAD is required');
  if (passClass !== null && !PASS_CLASSES.includes(passClass)) {
    return fail(`gate-tier: unknown --class "${passClass}" (want one of ${PASS_CLASSES.join(', ')})`);
  }

  if (protectedMode) {
    const { verdict, reason } = protectedVerdict(range);
    if (verdict === 'error') return fail(`gate-tier: ${reason}`);
    if (verdict === 'ciWait') {
      if (reason) console.error(`gate-tier: ${reason}`);
      console.log('ciWait');
    }
    return;
  }

  const entries = diffEntries(range);
  if (entries === null) return fail(`gate-tier: git diff failed for range "${range}"`);
  if (entries.length === 0) return fail(`gate-tier: range "${range}" carries no changed paths`);
  const paths = entries.map((entry) => entry.path);
  const deleted = entries.filter((entry) => entry.status === 'D').map((entry) => entry.path);

  try {
    let selected = null;
    if (!pin) {
      const npmPaths = paths.filter((path) => !path.startsWith('tool/'));
      const plan = npmPaths.length > 0 ? componentPlan(npmPaths, deleted, loadContext()) : null;
      if (plan?.mode === 'select') selected = await selectComponentTests(plan.reach);
    }
    const decision = decideGate(paths, { paint, pin, passClass, deleted, selected });
    const pathsLine = decision.decidingPaths.length ? `\n  ${decision.decidingPaths.join('\n  ')}` : '';
    console.error(`gate-tier: ${decision.tier} (${decision.reason})${pathsLine}`);
    for (const note of decision.notes) console.error(`gate-tier: ${note}`);
    console.log(decision.gate);
  } catch (err) {
    fail(err instanceof Error ? err.message : String(err));
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
