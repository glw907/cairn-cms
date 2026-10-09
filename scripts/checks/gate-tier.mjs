// cairn-cms: the per-task gate-tier classifier. The dotfiles chain runner
// (~/.claude/workflows/pass-execute.js) calls this after an implementer commits and before the
// gate, so the gate string a task runs is sized to its committed diff, not the plan's forecast.
// The tier table is ROADMAP.md:296 (the "Now" entry that proposed this script); its copy lives at
// docs/internal/pass-gate-tiers.md, the doc page a reviewer reads to reproduce a classification.
//
// Interface (fixed by the runner): `node scripts/checks/gate-tier.mjs --range <base>..HEAD
// [--paint yes|no] [--pin <tier>] [--related]`. On success, the chosen tier's gate string is the ONLY line on
// stdout; the tier and the paths that decided it print to stderr. On an empty range or a git
// failure, nothing prints to stdout and the process exits non-zero, so a caller that captures only
// stdout gets a shell-safe empty string rather than a bogus gate command; the runner's own prompt
// falls back to the plan's gate string in that case.
//
// Five npm tiers plus one standalone `tool` tier for `tool/**`, the Go `cairn` CLI module.
// classifyPath checks a path against the five npm tiers in DESCENDING severity, full first, then
// admin-visual, engine, scripts, and docs last, returning the first match: full's triggers name
// specific, narrow paths (the render seam, theme/chassis CSS, a public route, a snapshot file)
// that a broader src/lib/** or docs/** rule would otherwise swallow, so they have to be tried
// before the broader tiers get a chance. TIER_ORDER, by contrast, lists the five npm tiers
// ASCENDING (docs first, full last) and is used only for ranking: resolveTier takes the
// highest-ranked tier any path in a diff classifies to, and the paint floor compares against it
// the same way. A path this classifier does not recognize (a repo-root config file, a workflow
// file, anything outside the five named trees) is conservative-defaulted to full: an unclassified
// path is exactly the case the table does not cover, and a missed full-tier path costs a broken
// release while an unnecessary full run only costs time.
//
// `tool/**` (including a `tool/**/*.md`) never reaches classifyPath: `decideGate` splits a diff's
// paths into `tool/` and everything else before ranking, because the Go module has its own gate
// (`make -C tool check`) that proves nothing an npm script proves and vice versa. `tool` is not
// part of the five-npm-tier superset chain (it does not run `npm test` or any Vale/docs check),
// so it is not in TIER_ORDER; a diff with paths on both sides runs the computed npm gate AND the
// tool gate, reported as `<npm tier>+tool`.
//
// Related mode (`--related`, opt-in). Without the flag every output above is unchanged. With it, a
// diff whose npm half resolves to `scripts` or `engine` (computed or pinned; the two share one
// string) gets a narrower string than the whole engine suite, built by `relatedGate`:
//
//   1. The static checks: `check:close:prebuilt` (check:close with `dist` built once; see
//      close-prebuilt.mjs), `check:tool-heuristics`, `test:emit`, and the showcase's `test:unit`,
//      which CI runs and check:close does not.
//   2. The whole node projects (`test:node-projects`). They hold every guard test that reads files,
//      spawns a script, or walks a tree, which no import graph can see, and they take minutes, so
//      narrowing them would save little and lose those guards.
//   3. The component project, narrowed with Vitest's `vitest related <files> --run`: Vitest walks
//      each component test's static import graph and runs the tests that reach a changed file, and
//      a changed test file always runs (https://vitest.dev/guide/cli#vitest-related; confirmed
//      against the installed Vitest 4.1 CLI help and its `filterTestsBySource`). Only paths under
//      `src/` outside the node-only test trees can reach a component test, so a diff with none
//      runs no component command. When the diff touches `src/lib`, the run passes
//      `--no-passWithNoTests`, so a selection that comes back empty fails the gate instead of
//      passing silently. When the diff touches a path in COMPONENT_RERUN_TRIGGERS
//      (scripts/test/component-rerun-triggers.mjs, the paths that reach component tests outside
//      the import graph), the whole component project runs instead. vitest.config.ts reads the
//      same list as `forceRerunTriggers`, so Vitest enforces the fallback on its own as well.
//   4. The create-cairn-site suite, only when the diff touches a path in
//      CREATE_CAIRN_SITE_TRIGGERS, the inputs that reach the scaffolder and its baked template.
//
// This is dependency-based test selection, the method Google's TAP uses to pick the tests a change
// can affect (Memon et al., "Taming Google-Scale Continuous Testing", ICSE-SEIP 2017), applied
// where the graph is sound: the component project, the slowest serialized leg. e2e spec selection
// is unchanged; the runner still appends the specs a change reaches.
//
// This classifier chooses a tier, never a gate lane. A plan that pins the light lane for a
// Go-only pass must not carry that pin onto a mixed diff whose npm half launches a browser
// suite; the lane decision stays with the caller, checked against the tier this script reports
// for the actual diff in hand.
import { spawnSync } from 'node:child_process';
import { matchesGlob, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { repoRoot } from '../repo-root.mjs';
import { COMPONENT_RERUN_TRIGGERS } from '../test/component-rerun-triggers.mjs';

const ROOT = repoRoot(import.meta.url);

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
 * shares nothing with the other five (see the header comment).
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

/** Tier names, ascending severity; `resolveTier` and the paint floor both rank against this. */
export const TIER_ORDER = ['docs', 'scripts', 'engine', 'admin-visual', 'full'];

/** The npm tiers `--related` narrows; every other tier keeps its string under the flag. */
export const RELATED_TIERS = ['scripts', 'engine'];

// The related-mode legs, in the order `relatedGate` joins them (see the header comment).
const RELATED_STATIC = [
  'npm run check:close:prebuilt',
  'npm run check:tool-heuristics',
  'npm run test:emit',
  'npm --prefix examples/showcase run test:unit',
].join(' && ');
const NODE_PROJECTS = 'npm run test:node-projects';
const COMPONENT_FULL = 'npm run test:component -- --no-file-parallelism';
const COMPONENT_RELATED =
  'node scripts/test/contained.mjs npx vitest related --run --project component --no-file-parallelism';
const CREATE_CAIRN_SITE = 'npm test -w packages/create-cairn-site';

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
 * The single tier one repo-relative, forward-slash path (relative to the repo root) demands, per
 * the ROADMAP.md:296 table. Returns `null` for a path none of the five triggers names; the caller
 * treats an unclassified path as `full` (see the header note above for why the default lives at
 * the caller rather than here, where a unit test can assert the "unrecognized" case on its own).
 * @param {string} path
 * @returns {string | null}
 */
export function classifyPath(path) {
  if (
    path.startsWith('src/lib/render/') ||
    path.startsWith('src/lib/public/') ||
    path.startsWith('examples/showcase/src/chassis/') ||
    path.startsWith('examples/showcase/src/theme/') ||
    path.startsWith('examples/showcase/src/routes/(site)/') ||
    path.includes('-snapshots/') ||
    /\.(png|jpe?g|webp)$/.test(path)
  ) {
    return 'full';
  }
  if (path.startsWith('src/lib/admin/') || path.startsWith('src/lib/admin-toolkit/')) {
    return 'admin-visual';
  }
  if (path.startsWith('src/lib/') && path.endsWith('.ts')) {
    return 'engine';
  }
  if (
    path.startsWith('scripts/') ||
    path.startsWith('src/tests/') ||
    path.startsWith('packages/create-cairn-site/') ||
    /\.(test|spec)\.ts$/.test(path)
  ) {
    return 'scripts';
  }
  if (path.startsWith('docs/') || path.endsWith('.md') || path === 'CHANGELOG.md') {
    return 'docs';
  }
  return null;
}

/**
 * The overall tier a set of changed paths demands: the highest-ranked tier any single path
 * classifies to (an unclassified path counts as `full`), plus every path that tied for it.
 * @param {string[]} paths
 * @returns {{ tier: string, decidingPaths: string[] }}
 */
export function resolveTier(paths) {
  const classified = paths.map((path) => ({ path, tier: classifyPath(path) ?? 'full' }));
  const tier = TIER_ORDER[Math.max(...classified.map((c) => TIER_ORDER.indexOf(c.tier)))];
  return { tier, decidingPaths: classified.filter((c) => c.tier === tier).map((c) => c.path) };
}

/**
 * Resolve a diff's changed paths, a paint flag, and an optional tier pin into the final gate
 * decision: the tier, why it was chosen (`computed`, `paint floor`, or `pin`), the paths that
 * decided it, and the gate string to run.
 *
 * `tool/**` paths are split off before the npm five-tier ranking runs, since the Go module's own
 * gate is not part of that chain. A diff with only `tool/` paths resolves to `tool` outright,
 * skipping the paint floor: paint names an npm-admin concept (a task touching visible admin
 * surface), which a tool-only diff by definition does not. A diff with paths on both sides ranks
 * the non-tool paths as usual, applies the paint floor to that half same as always, then reports
 * `<npm tier>+tool` and runs both gate strings in sequence so each half is proven.
 *
 * With `related`, a `scripts` or `engine` npm half swaps its string for `relatedGate`'s and the
 * decision gains a `related` record; `deleted` names the diff's deleted paths, which no test can
 * import. Every other tier returns the same decision with or without `related`.
 * @param {string[]} paths
 * @param {{ paint?: 'yes' | 'no', pin?: string | null, related?: boolean, deleted?: string[] }} [opts]
 * @returns {{ tier: string, reason: string, decidingPaths: string[], gate: string, related?: { component: string, forcing: string[] } }}
 */
export function decideGate(paths, opts = {}) {
  const decision = tierDecision(paths, opts);
  return opts.related ? withRelated(decision, paths, opts.deleted ?? []) : decision;
}

/**
 * The tier decision with no related narrowing: the whole of `decideGate` without `--related`.
 * @param {string[]} paths
 * @param {{ paint?: 'yes' | 'no', pin?: string | null }} opts
 * @returns {{ tier: string, reason: string, decidingPaths: string[], gate: string }}
 */
function tierDecision(paths, opts) {
  const { paint = 'no', pin = null } = opts;
  if (pin) {
    if (!Object.hasOwn(TIER_GATES, pin)) {
      const known = [...TIER_ORDER, 'tool'].join(', ');
      throw new Error(`gate-tier: unknown --pin tier "${pin}" (want one of ${known})`);
    }
    return { tier: pin, reason: 'pin', decidingPaths: [], gate: TIER_GATES[pin] };
  }

  const toolPaths = paths.filter((path) => path.startsWith('tool/'));
  const npmPaths = paths.filter((path) => !path.startsWith('tool/'));

  if (npmPaths.length === 0 && toolPaths.length > 0) {
    return { tier: 'tool', reason: 'computed', decidingPaths: toolPaths, gate: TIER_GATES.tool };
  }

  const { tier: computed, decidingPaths } = resolveTier(npmPaths);
  let tier = computed;
  let reason = 'computed';
  if (paint === 'yes' && TIER_ORDER.indexOf(tier) < TIER_ORDER.indexOf('admin-visual')) {
    tier = 'admin-visual';
    reason = 'paint floor';
  }

  if (toolPaths.length === 0) {
    return { tier, reason, decidingPaths, gate: TIER_GATES[tier] };
  }
  return {
    tier: `${tier}+tool`,
    reason,
    decidingPaths: [...decidingPaths, ...toolPaths],
    gate: `${TIER_GATES[tier]} && ${TIER_GATES.tool}`,
  };
}

/**
 * Narrow a `scripts` or `engine` decision (alone or as the npm half of `<tier>+tool`) to the
 * related-mode string; return any other decision untouched.
 * @param {{ tier: string, reason: string, decidingPaths: string[], gate: string }} decision
 * @param {string[]} paths
 * @param {string[]} deleted
 * @returns {{ tier: string, reason: string, decidingPaths: string[], gate: string, related?: { component: string, forcing: string[] } }}
 */
function withRelated(decision, paths, deleted) {
  const tier = decision.tier ?? '';
  const withTool = tier.endsWith('+tool');
  const npmTier = withTool ? tier.slice(0, -'+tool'.length) : tier;
  if (!RELATED_TIERS.includes(npmTier)) return decision;
  const { gate, component, forcing } = relatedGate(
    paths.filter((path) => !path.startsWith('tool/')),
    deleted,
  );
  return {
    ...decision,
    gate: withTool ? `${gate} && ${TIER_GATES.tool}` : gate,
    related: { component, forcing },
  };
}

/**
 * The related-mode gate string for a diff's npm paths (see the header comment for each leg).
 * `component` reports how the component project runs: `full`, `related`, or `none`; `forcing`
 * names the paths that matched COMPONENT_RERUN_TRIGGERS.
 * @param {string[]} paths
 * @param {string[]} [deleted] - Paths the diff deletes; they stay out of the related file list.
 * @returns {{ gate: string, component: 'full' | 'related' | 'none', forcing: string[] }}
 */
export function relatedGate(paths, deleted = []) {
  const matchesAny = (/** @type {string} */ path, /** @type {readonly string[]} */ globs) =>
    globs.some((glob) => matchesGlob(path, glob));
  const forcing = paths.filter((path) => matchesAny(path, COMPONENT_RERUN_TRIGGERS));
  const gone = new Set(deleted);
  const reach = paths.filter(
    (path) => path.startsWith('src/') && !matchesAny(path, NODE_ONLY_TESTS) && !gone.has(path),
  );

  /** @type {'full' | 'related' | 'none'} */
  let component = 'none';
  let componentLeg = null;
  if (forcing.length > 0) {
    component = 'full';
    componentLeg = COMPONENT_FULL;
  } else if (reach.length > 0) {
    component = 'related';
    const strict = reach.some((path) => path.startsWith('src/lib/')) ? ' --no-passWithNoTests' : '';
    componentLeg = `${COMPONENT_RELATED}${strict} ${reach.map(shellQuote).join(' ')}`;
  }

  const legs = [RELATED_STATIC, NODE_PROJECTS];
  if (componentLeg) legs.push(componentLeg);
  if (paths.some((path) => matchesAny(path, CREATE_CAIRN_SITE_TRIGGERS))) legs.push(CREATE_CAIRN_SITE);
  return { gate: legs.join(' && '), component, forcing };
}

/**
 * A path as one shell word: bare when it holds only safe characters, single-quoted otherwise (a
 * SvelteKit route group such as `(site)` would otherwise open a subshell).
 * @param {string} path
 * @returns {string}
 */
function shellQuote(path) {
  return /^[\w@%+=:,./-]+$/.test(path) ? path : `'${path.replaceAll("'", `'\\''`)}'`;
}

/**
 * Parse the fixed CLI shape: `--range <spec>`, an optional `--paint yes|no`, an optional
 * `--pin <tier>`, an optional bare `--related`.
 * @param {string[]} argv
 * @returns {{ range: string | null, paint: 'yes' | 'no', pin: string | null, related: boolean }}
 */
export function parseArgs(argv) {
  let range = null;
  /** @type {'yes' | 'no'} */
  let paint = 'no';
  let pin = null;
  let related = false;
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
      case '--related':
        related = true;
        break;
    }
  }
  return { range, paint, pin, related };
}

/**
 * Every changed path in `range` (`git diff --name-only`), forward-slash, relative to the repo
 * root. `null` when git itself fails (a malformed range, a missing ref); an empty array when git
 * succeeds but the range carries no diff. A `filter` passes through as `--diff-filter`.
 * @param {string} range
 * @param {string} [filter]
 * @returns {string[] | null}
 */
export function changedPaths(range, filter) {
  const args = ['diff', '--name-only', ...(filter ? [`--diff-filter=${filter}`] : []), range];
  const result = spawnSync('git', args, { cwd: ROOT, encoding: 'utf8' });
  if (result.error || result.status !== 0) return null;
  return result.stdout.split('\n').filter((line) => line.length > 0);
}

/**
 * Report a refusal on stderr and set the failing exit code, leaving stdout empty so a caller that
 * captures only stdout gets a shell-safe empty string.
 * @param {string} message
 */
function fail(message) {
  console.error(message);
  process.exitCode = 1;
}

function main() {
  const { range, paint, pin, related } = parseArgs(process.argv.slice(2));
  if (!range) return fail('gate-tier: --range <base>..HEAD is required');

  const paths = changedPaths(range);
  if (paths === null) return fail(`gate-tier: git diff failed for range "${range}"`);
  if (paths.length === 0) return fail(`gate-tier: range "${range}" carries no changed paths`);

  const deleted = related ? changedPaths(range, 'D') : [];
  if (deleted === null) return fail(`gate-tier: git diff failed for range "${range}"`);

  let decision;
  try {
    decision = decideGate(paths, { paint, pin, related, deleted });
  } catch (err) {
    return fail(err instanceof Error ? err.message : String(err));
  }

  const pathsLine = decision.decidingPaths.length
    ? `\n  ${decision.decidingPaths.join('\n  ')}`
    : '';
  console.error(`gate-tier: ${decision.tier} (${decision.reason})${pathsLine}`);
  if (decision.related) {
    const forcing = decision.related.forcing.length
      ? `, forced by\n  ${decision.related.forcing.join('\n  ')}`
      : '';
    console.error(`gate-tier: related, component project ${decision.related.component}${forcing}`);
  }
  console.log(decision.gate);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
