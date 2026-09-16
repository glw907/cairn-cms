// cairn-cms: the per-task gate-tier classifier. The dotfiles chain runner
// (~/.claude/workflows/pass-execute.js) calls this after an implementer commits and before the
// gate, so the gate string a task runs is sized to its committed diff, not the plan's forecast.
// The tier table is ROADMAP.md:296 (the "Now" entry that proposed this script); its copy lives at
// docs/internal/pass-gate-tiers.md, the doc page a reviewer reads to reproduce a classification.
//
// Interface (fixed by the runner): `node scripts/checks/gate-tier.mjs --range <base>..HEAD
// [--paint yes|no] [--pin <tier>]`. On success, the chosen tier's gate string is the ONLY line on
// stdout; the tier and the paths that decided it print to stderr. On an empty range or a git
// failure, nothing prints to stdout and the process exits non-zero, so a caller that captures only
// stdout gets a shell-safe empty string rather than a bogus gate command; the runner's own prompt
// falls back to the plan's gate string in that case.
//
// Five tiers. classifyPath checks a path against them in DESCENDING severity, full first, then
// admin-visual, engine, scripts, and docs last, returning the first match: full's triggers name
// specific, narrow paths (the render seam, theme/chassis CSS, a public route, a snapshot file)
// that a broader src/lib/** or docs/** rule would otherwise swallow, so they have to be tried
// before the broader tiers get a chance. TIER_ORDER, by contrast, lists the five tiers ASCENDING
// (docs first, full last) and is used only for ranking: resolveTier takes the highest-ranked tier
// any path in a diff classifies to, and the paint floor compares against it the same way. A path
// this classifier does not recognize (a repo-root config file, a workflow file, anything outside
// the five named trees) is conservative-defaulted to full: an unclassified path is exactly the
// case the table does not cover, and a missed full-tier path costs a broken release while an
// unnecessary full run only costs time.
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { repoRoot } from '../repo-root.mjs';

const ROOT = repoRoot(import.meta.url);

// The five gate strings are cumulative, each a strict superset of every tier below it, built by
// concatenation rather than five independent literals so the superset relationship cannot drift.
const DOCS_GATE =
  'npm run check:docs && npm run check:vale && npm run check:reference && npm run check:reference:signatures && npm run check:facts';
const SCRIPTS_GATE = `${DOCS_GATE} && npm run check && npm test`;
const ADMIN_VISUAL_GATE = `${SCRIPTS_GATE} && npm --prefix examples/showcase run test:e2e -- admin-visual.spec.ts`;
const FULL_GATE = `${ADMIN_VISUAL_GATE} && npm run check:comments && npm run check:snippets && npm run check:transcripts && npm run check:symbols && npm run check:surface && npm --prefix examples/showcase run test:e2e`;

/**
 * The gate string for every tier. `scripts` and `engine` run the identical string (both are
 * "prove the code and its tests"); each tier's string is a superset of the one below it.
 * @type {Record<string, string>}
 */
export const TIER_GATES = {
  docs: DOCS_GATE,
  scripts: SCRIPTS_GATE,
  engine: SCRIPTS_GATE,
  'admin-visual': ADMIN_VISUAL_GATE,
  full: FULL_GATE,
};

/** Tier names, ascending severity; `resolveTier` and the paint floor both rank against this. */
export const TIER_ORDER = ['docs', 'scripts', 'engine', 'admin-visual', 'full'];

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
    path.startsWith('examples/showcase/src/chassis/') ||
    path.startsWith('examples/showcase/src/theme/') ||
    path.startsWith('examples/showcase/src/routes/(site)/') ||
    path.includes('-snapshots/') ||
    /\.(png|jpe?g|webp)$/.test(path)
  ) {
    return 'full';
  }
  if (path.startsWith('src/lib/components/') || path.startsWith('src/lib/admin-toolkit/')) {
    return 'admin-visual';
  }
  if (path.startsWith('src/lib/') && path.endsWith('.ts')) {
    return 'engine';
  }
  if (path.startsWith('scripts/') || path.startsWith('src/tests/') || /\.(test|spec)\.ts$/.test(path)) {
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
 * decided a computed tier, and the gate string to run.
 * @param {string[]} paths
 * @param {{ paint?: 'yes' | 'no', pin?: string | null }} [opts]
 * @returns {{ tier: string, reason: string, decidingPaths: string[], gate: string }}
 */
export function decideGate(paths, opts = {}) {
  const { paint = 'no', pin = null } = opts;
  if (pin) {
    if (!TIER_ORDER.includes(pin)) {
      throw new Error(`gate-tier: unknown --pin tier "${pin}" (want one of ${TIER_ORDER.join(', ')})`);
    }
    return { tier: pin, reason: 'pin', decidingPaths: [], gate: TIER_GATES[pin] };
  }
  const { tier: computed, decidingPaths } = resolveTier(paths);
  let tier = computed;
  let reason = 'computed';
  if (paint === 'yes' && TIER_ORDER.indexOf(tier) < TIER_ORDER.indexOf('admin-visual')) {
    tier = 'admin-visual';
    reason = 'paint floor';
  }
  return { tier, reason, decidingPaths, gate: TIER_GATES[tier] };
}

/**
 * Parse the fixed CLI shape: `--range <spec>`, an optional `--paint yes|no`, an optional
 * `--pin <tier>`.
 * @param {string[]} argv
 * @returns {{ range: string | null, paint: 'yes' | 'no', pin: string | null }}
 */
export function parseArgs(argv) {
  let range = null;
  /** @type {'yes' | 'no'} */
  let paint = 'no';
  let pin = null;
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
    }
  }
  return { range, paint, pin };
}

/**
 * Every changed path in `range` (`git diff --name-only`), forward-slash, relative to the repo
 * root. `null` when git itself fails (a malformed range, a missing ref); an empty array when git
 * succeeds but the range carries no diff.
 * @param {string} range
 * @returns {string[] | null}
 */
export function changedPaths(range) {
  const result = spawnSync('git', ['diff', '--name-only', range], { cwd: ROOT, encoding: 'utf8' });
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
  const { range, paint, pin } = parseArgs(process.argv.slice(2));
  if (!range) return fail('gate-tier: --range <base>..HEAD is required');

  const paths = changedPaths(range);
  if (paths === null) return fail(`gate-tier: git diff failed for range "${range}"`);
  if (paths.length === 0) return fail(`gate-tier: range "${range}" carries no changed paths`);

  let decision;
  try {
    decision = decideGate(paths, { paint, pin });
  } catch (err) {
    return fail(err instanceof Error ? err.message : String(err));
  }

  const pathsLine = decision.decidingPaths.length
    ? `\n  ${decision.decidingPaths.join('\n  ')}`
    : '';
  console.error(`gate-tier: ${decision.tier} (${decision.reason})${pathsLine}`);
  console.log(decision.gate);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
