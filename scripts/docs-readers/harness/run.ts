/**
 * Running a page's extracted procedures over two tiers: a read-only command runs literally,
 * through `execCairn`; a state-changing one is checked only as a dry run, its own
 * `--help`, through `execHelp`, and `execCairn` is never called for it. Both executors are
 * injected so a unit test proves the dry-run promise with a spy, and the live script
 * (`run-live.ts`) wires real podman execution outside every gate.
 */
import { commandPath, isReadOnly } from './classify.js';
import type { Procedure } from './extract.js';

/** One executor's result: an exit code and the text it wrote to stdout. */
export interface ExecResult {
  exitCode: number;
  stdout: string;
}

/** The doctor report's own closing tally line, for example `6 passed, 1 failed, 0 skipped, 0 info, 4 unchecked`. */
const DOCTOR_SUMMARY = /\d+ passed,\s*\d+ failed,/;

/**
 * Cobra's own help-text signature: a `Usage:` line, on its own line anywhere in the output (a
 * mistyped subcommand's help opens with the command's own Short description first, so `Usage:`
 * sits a few lines down, never at the very start), or the `Available Commands:` heading a
 * multi-subcommand help block prints.
 */
const HELP_SIGNATURE = /^Usage:/m;

/**
 * Whether a read-only run counts as the command having actually run, as opposed to a usage error,
 * a tool fault, or a crash: `cli-cairn-exit-codes.md` documents a Nagios-style `cairn health`,
 * `cairn doctor`, and `cairn auth check` whose exit code alone spans 0 to 3 whether the verdict is
 * a real pass or a real failure, so exit code cannot tell a broken invocation from a genuinely
 * unhealthy site. The same reference page says a usage error writes no payload, but cobra's own
 * help text for a mistyped subcommand word writes its usage block to stdout and still exits 0, so
 * an empty stdout alone is not enough either; that block opens with the command's own Short
 * description, then a `Usage:` line further down, then often an `Available Commands:` heading, so
 * both are checked rather than only a `Usage:` prefix. `cairn doctor`'s own report additionally
 * needs its closing tally line, the one line no help block or truncated crash output could
 * produce by accident.
 * @param result - The executor's result.
 * @param words - The command's own words, `cairn` excluded (`words[0]` names the subcommand).
 * @returns True when the command produced a real report on stdout.
 */
function ran(result: ExecResult, words: string[]): boolean {
  const stdout = result.stdout.trim();
  if (stdout === '' || HELP_SIGNATURE.test(stdout) || stdout.includes('Available Commands:')) return false;
  if (words[0] === 'doctor') return DOCTOR_SUMMARY.test(stdout);
  return true;
}

/** The executors a harness run needs, real ones live, fakes in a unit test. */
export interface HarnessDeps {
  /** The docs-and-binary class's own read-only `bashAllowlist` patterns. */
  allowlist: string[];
  /** Runs a read-only `cairn` command literally (`words` excludes the leading `cairn`). */
  execCairn: (words: string[]) => Promise<ExecResult>;
  /** Runs `cairn <path> --help`, never anything that changes state. */
  execHelp: (path: string[]) => Promise<ExecResult>;
}

/** One procedure's checked outcome. */
export interface HarnessStep {
  page: string;
  line: number;
  command: string;
  kind: 'run' | 'help-checked';
  outcome: 'pass' | 'fail';
  detail: string;
}

/**
 * Run and check one procedure, per its own read-only-or-state-changing tier.
 * @param proc - The extracted procedure.
 * @param deps - The executors and the read-only allowlist.
 * @returns The step's outcome.
 */
export async function runProcedure(proc: Procedure, deps: HarnessDeps): Promise<HarnessStep> {
  const words = proc.command.trim().split(/\s+/).slice(1);
  const base = { page: proc.page, line: proc.line, command: proc.command };
  if (isReadOnly(proc.command, deps.allowlist)) {
    const result = await deps.execCairn(words);
    const producedReport = ran(result, words);
    const jsonOk = !proc.expectJson || isValidJson(result.stdout);
    const pass = producedReport && jsonOk;
    const problems = [
      ...(producedReport ? [] : ['stdout did not carry a real report (empty, a usage block, or missing its own summary line)']),
      ...(producedReport && !jsonOk ? ['stdout did not parse as JSON'] : []),
    ];
    const detail = `exit ${result.exitCode}${problems.length > 0 ? `; ${problems.join('; ')}` : ''}`;
    return { ...base, kind: 'run', outcome: pass ? 'pass' : 'fail', detail };
  }
  const path = commandPath(proc.command);
  const result = await deps.execHelp(path);
  return {
    ...base,
    kind: 'help-checked',
    outcome: result.exitCode === 0 ? 'pass' : 'fail',
    detail: `cairn ${path.join(' ')} --help exited ${result.exitCode}`,
  };
}

/**
 * Whether text parses as a JSON value.
 * @param text - The text to check.
 * @returns True when `JSON.parse` succeeds on the trimmed text.
 */
function isValidJson(text: string): boolean {
  try {
    JSON.parse(text.trim());
    return true;
  } catch {
    return false;
  }
}

/**
 * Run every procedure on a page.
 * @param procedures - The page's extracted procedures.
 * @param deps - The executors and the read-only allowlist.
 * @returns One step per procedure, in order.
 */
export async function runProcedures(procedures: Procedure[], deps: HarnessDeps): Promise<HarnessStep[]> {
  const steps: HarnessStep[] = [];
  for (const proc of procedures) steps.push(await runProcedure(proc, deps));
  return steps;
}
