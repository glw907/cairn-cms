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

/**
 * Whether a read-only run counts as the command having actually run, as opposed to a usage error,
 * a tool fault, or a crash: `cli-cairn-exit-codes.md` documents a Nagios-style `cairn health`,
 * `cairn doctor`, and `cairn auth check` whose exit code alone spans 0 to 3 whether the verdict is
 * a real pass or a real failure, so exit code cannot tell a broken invocation from a genuinely
 * unhealthy site. The same reference page says a usage error writes no payload; an empty stdout is
 * the one signal common to every broken invocation, real report or not.
 * @param result - The executor's result.
 * @returns True when the command produced a real report on stdout.
 */
function ran(result: ExecResult): boolean {
  return result.stdout.trim() !== '';
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
    const producedReport = ran(result);
    const jsonOk = !proc.expectJson || isValidJson(result.stdout);
    const pass = producedReport && jsonOk;
    const problems = [
      ...(producedReport ? [] : ['stdout was empty (a usage error, a tool fault, or a crash)']),
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
