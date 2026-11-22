// cairn-cms: what every check script under scripts/checks shares, its repo root and its verdict.
import { repoRoot } from '../repo-root.mjs';

/** The repo root, for every check script under scripts/checks. */
export const ROOT = repoRoot(import.meta.url);

/**
 * Runs one check and prints its verdict. Each problem goes to stderr as the body wrote it, then
 * one stdout line reads `<name>: OK` or `<name>: FAIL`, and the exit code is set to 0 or 1. A throw
 * from the body counts as one problem, its message. The process is never ended early, so a caller
 * in the same process keeps running.
 * @param {string} name - The check's name, which starts the verdict line.
 * @param {() => string[] | Promise<string[]>} body - Returns the problems found; none is a pass.
 * @returns {Promise<void>}
 */
export async function runCheck(name, body) {
  /** @type {string[]} */
  let problems;
  try {
    problems = await body();
  } catch (error) {
    problems = [error instanceof Error ? error.message : String(error)];
  }
  for (const problem of problems) console.error(problem);
  console.log(`${name}: ${problems.length === 0 ? 'OK' : 'FAIL'}`);
  process.exitCode = problems.length === 0 ? 0 : 1;
}
