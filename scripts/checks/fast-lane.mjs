// cairn-cms: the committed fast lane. It runs the legs `gate-tier.mjs --fast` prints for a range,
// in order, and fails on the first leg that fails. Anyone with a clone can run it; a maintainer's
// lane-aware wrapper runs the same legs and adds shared locks, which this script does not need.
//
// Interface: `node scripts/checks/fast-lane.mjs [--range <base>..HEAD]`, defaulting to
// `origin/main..HEAD`. Exit 0 means every leg passed.
//
// An empty classifier output is a failure. The classifier prints nothing on a git error or an
// empty range, and a lane that ran zero legs must not read as green (BACKLOG #55).
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const CLASSIFIER = resolve(fileURLToPath(import.meta.url), '../gate-tier.mjs');

/**
 * Turn the classifier's result into the legs to run.
 *
 * @param {{ status: number | null, stdout: string }} result The classifier's exit status and stdout.
 * @returns {{ lines: string[] } | { error: string }} The legs, or why there are none.
 */
export function fastLaneLines({ status, stdout }) {
  if (status !== 0) return { error: `the classifier exited ${status}` };
  const lines = stdout.split('\n').filter((line) => line.trim() !== '');
  if (lines.length === 0) return { error: 'the classifier printed no legs' };
  return { lines };
}

/** Run the classifier for a range and capture its stdout. */
function classifyRange(range) {
  const run = spawnSync(process.execPath, [CLASSIFIER, '--fast', '--range', range], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'inherit'],
  });
  return { status: run.status, stdout: run.stdout ?? '' };
}

/** Run one leg through bash with the terminal attached, returning its exit status. */
function runLeg(line) {
  console.error(`fast-lane: ${line}`);
  return spawnSync('bash', ['-c', line], { stdio: 'inherit' }).status ?? 1;
}

/**
 * Run the fast lane for a range.
 *
 * @param {string} range A git range, such as `origin/main..HEAD`.
 * @param {{ classify?: typeof classifyRange, run?: typeof runLeg }} [deps] Test seams.
 * @returns {number} Zero when every leg passed, otherwise the first failing exit code or 1.
 */
export function runFastLane(range, { classify = classifyRange, run = runLeg } = {}) {
  const plan = fastLaneLines(classify(range));
  if ('error' in plan) {
    console.error(`fast-lane: ${plan.error}`);
    return 1;
  }
  for (const line of plan.lines) {
    const code = run(line);
    if (code !== 0) return code;
  }
  return 0;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const flag = process.argv.indexOf('--range');
  const range = flag === -1 ? 'origin/main..HEAD' : process.argv[flag + 1];
  process.exitCode = runFastLane(range);
}
