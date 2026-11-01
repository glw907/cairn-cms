// cairn-cms: the docs gate. One script runs every docs check, so CI, the gate-tier classifier's
// `docs` tier, and a single page's gate all read the identical list from one place
// instead of a separate step per check that can drift apart. `check:package` is deliberately not in
// this list: it checks the tarball's shape (publint, attw, the file manifest), not a doc
// arm's content, so it keeps its own CI step.
//
// Interface: `node scripts/checks/docs-gate.mjs [--prebuilt] [--page <path>]`. Every component
// reads the whole tree except two: `--page <path>` narrows Vale to that one path in place of the
// fixed list `check:vale` runs by default, and also narrows check:tellgrader to that page, so a
// single page's gate (npm run check:docs-gate -- --page {page}) proves only the page it edited,
// not every sibling page's prose.
//
// `--prebuilt` skips the build for a caller that already built `dist` in the same run.
//
// Tree mode (no `--page`) also runs `vale test` over the Cairn rules' cases, since a rule's
// pass and fail cases guard the rule itself, not any one page.
//
// `dist` is built exactly once, before any component runs. Nine of the checks
// (check:snippets, check:visuals, check:readiness, check:tool-conditions, check:reference,
// check:reference:signatures, check:options, check:tiers, check:tier-docs) call `npm run package` themselves when run as their own npm script,
// so this runner calls each component's underlying node script directly and pays that cost once.
import { spawnSync } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

// check:vale's default target list (package.json's check:vale script, unscoped).
const DEFAULT_VALE_PATHS = ['docs', 'README.md', 'examples/showcase/README.md'];

// The custom rules that keep `vale test` cases beside them.
const VALE_RULE_TESTS = [
  '.vale/styles/Cairn/Headings.test.yml',
  '.vale/styles/Cairn/ProseProcedure.test.yml',
];
// The fixture config that applies the Cairn style to test input, which matches no section of the
// root .vale.ini.
const VALE_RULE_TEST_CONFIG = '.vale/tests/vale.ini';

/**
 * Parse the fixed CLI shape: an optional `--page <path>`, and the
 * valueless `--prebuilt`.
 * @param {string[]} argv
 * @returns {{ page: string | null, prebuilt: boolean }}
 */
export function parseArgs(argv) {
  let page = null;
  let prebuilt = false;
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--page') page = argv[++i] ?? null;
    else if (argv[i] === '--prebuilt') prebuilt = true;
  }
  return { page, prebuilt };
}

/**
 * The ordered component list this gate runs, each a label plus the command and args `spawnSync`
 * runs (relative to ROOT). `page` reaches only the components that read it;
 * every other component runs unscoped.
 * @param {{ page: string | null }} args
 * @returns {{ label: string, command: string, args: string[] }[]}
 */
export function buildSteps({ page }) {
  /**
   * @param {string} script
   * @param {string[]} [extra]
   * @returns {{ command: string, args: string[] }}
   */
  const node = (script, extra = []) => ({ command: process.execPath, args: [script, ...extra] });
  return [
    { label: 'check:docs', ...node('scripts/checks/docs-links.mjs') },
    {
      label: 'check:vale',
      command: 'vale',
      args: ['--minAlertLevel=error', ...(page ? [page] : DEFAULT_VALE_PATHS)],
    },
    ...(page
      ? []
      : [
          {
            label: 'check:vale-rules',
            command: 'vale',
            args: [`--config=${VALE_RULE_TEST_CONFIG}`, 'test', ...VALE_RULE_TESTS],
          },
        ]),
    { label: 'check:leaks', ...node('scripts/checks/check-leaks.mjs') },
    { label: 'check:symbols', ...node('scripts/checks/check-symbols.mjs') },
    { label: 'check:snippets', ...node('scripts/checks/check-snippets.mjs') },
    { label: 'check:transcripts', ...node('scripts/checks/transcript-blocks.mjs') },
    { label: 'check:visuals', ...node('scripts/checks/check-visuals.mjs') },
    { label: 'check:arm-indexes', ...node('scripts/checks/check-arm-indexes.mjs') },
    { label: 'check:editor-quotes', ...node('scripts/checks/check-editor-quotes.mjs') },
    { label: 'check:readiness', ...node('scripts/checks/check-readiness.mjs') },
    { label: 'check:tool-conditions', ...node('scripts/checks/check-tool-conditions.mjs') },
    { label: 'check:target-stack', ...node('scripts/checks/check-target-stack.mjs') },
    { label: 'check:reference', ...node('scripts/checks/reference-coverage.mjs') },
    { label: 'check:reference:signatures', ...node('scripts/checks/check-reference-signatures.mjs') },
    { label: 'check:options', ...node('scripts/checks/check-options.mjs') },
    { label: 'check:tiers', ...node('scripts/checks/check-tiers.mjs') },
    { label: 'check:tier-docs', ...node('scripts/checks/check-tier-docs.mjs') },
    // Workstation-only: skips with one line and passes when the tellgrader binary is absent (CI).
    { label: 'check:tellgrader', ...node('scripts/checks/check-tellgrader.mjs', page ? [page] : []) },
  ];
}

function main() {
  const { page, prebuilt } = parseArgs(process.argv.slice(2));

  if (!prebuilt) {
    console.log('== npm run package (dist, built once for the whole docs gate) ==');
    const pkg = spawnSync('npm', ['run', 'package'], { cwd: ROOT, stdio: 'inherit' });
    if (pkg.status !== 0) {
      console.error('check:docs-gate: npm run package failed; no component ran');
      process.exitCode = 1;
      return;
    }
  }

  const steps = buildSteps({ page });
  const results = steps.map((step) => {
    console.log(`== ${step.label} ==`);
    const result = spawnSync(step.command, step.args, { cwd: ROOT, stdio: 'inherit' });
    return { label: step.label, ok: result.status === 0 };
  });

  const failed = results.filter((result) => !result.ok);
  if (failed.length === 0) {
    console.log(`check:docs-gate: OK (${results.length} check(s))`);
    return;
  }
  console.error(
    `check:docs-gate: ${failed.length} check(s) failed: ${failed.map((result) => result.label).join(', ')}`,
  );
  process.exitCode = 1;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
