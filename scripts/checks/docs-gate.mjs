// cairn-cms: the docs gate. One script runs every docs check, so CI, the gate-tier classifier's
// `docs` tier, and a page-chain page's own gate all read the identical list from one place
// instead of sixteen separate steps that can drift apart. `check:package` is deliberately not in
// this list: it checks the tarball's own shape (publint, attw, the file manifest), not a doc
// arm's content, so it keeps its own CI step.
//
// Interface: `node scripts/checks/docs-gate.mjs [--page <path>] [--brief <path>]`. Every component
// reads the whole tree except two: `--page <path>` narrows Vale to that one path in place of the
// fixed list `check:vale` runs by default, and `--brief <path>` narrows check:provenance to that
// one brief through check-provenance.mjs's own positional-argument mode. Both flags exist so a
// page-chain page's gate (npm run check:docs-gate -- --page {page} --brief {brief}) proves only
// the page and brief it drafted, not every sibling page's in-flight brief or prose.
//
// Tree mode (no `--page`) also runs `vale test` over the Cairn rules' own cases, since a rule's
// pass and fail cases guard the rule itself, not any one page.
//
// `dist` is built exactly once, before any component runs. Six of the sixteen checks
// (check:snippets, check:visuals, check:readiness, check:tool-conditions, check:reference,
// check:reference:signatures) call `npm run package` themselves when run as their own npm script,
// so this runner calls each component's underlying node script directly and pays that cost once.
import { spawnSync } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

// check:vale's own default target list (package.json's check:vale script, unscoped).
const DEFAULT_VALE_PATHS = ['docs', 'README.md', 'examples/showcase/README.md'];

// The custom rules that keep `vale test` cases beside them, and the fixture config that applies
// the Cairn style to test input (test input matches no section of the root .vale.ini).
const VALE_RULE_TESTS = [
  '.vale/styles/Cairn/Headings.test.yml',
  '.vale/styles/Cairn/ProseProcedure.test.yml',
];

/**
 * Parse the fixed CLI shape: an optional `--page <path>` and an optional `--brief <path>`.
 * @param {string[]} argv
 * @returns {{ page: string | null, brief: string | null }}
 */
export function parseArgs(argv) {
  let page = null;
  let brief = null;
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--page') page = argv[++i] ?? null;
    else if (argv[i] === '--brief') brief = argv[++i] ?? null;
  }
  return { page, brief };
}

/**
 * The ordered component list this gate runs, each a label plus the command and args `spawnSync`
 * runs (relative to ROOT). `page` and `brief` reach only the two components that read them;
 * every other component runs unscoped.
 * @param {{ page: string | null, brief: string | null }} args
 * @returns {{ label: string, command: string, args: string[] }[]}
 */
export function buildSteps({ page, brief }) {
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
            args: ['--config=.vale/tests/vale.ini', 'test', ...VALE_RULE_TESTS],
          },
        ]),
    { label: 'check:facts', ...node('scripts/checks/check-facts.mjs') },
    {
      label: 'check:provenance',
      ...node('scripts/checks/check-provenance.mjs', brief ? [brief] : []),
    },
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
  ];
}

function main() {
  const { page, brief } = parseArgs(process.argv.slice(2));

  console.log('== npm run package (dist, built once for the whole docs gate) ==');
  const pkg = spawnSync('npm', ['run', 'package'], { cwd: ROOT, stdio: 'inherit' });
  if (pkg.status !== 0) {
    console.error('check:docs-gate: npm run package failed; no component ran');
    process.exitCode = 1;
    return;
  }

  const steps = buildSteps({ page, brief });
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
