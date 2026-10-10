// cairn-cms: turns a CI test job's machine-readable reports into one `::notice title=retries::`
// line. A test that fails its first attempt and passes on a retry leaves the job green, so without
// this line the flake is visible only inside a log nobody opens. GitHub surfaces the notice through
// the check-runs annotations API, where a run's reader finds it without downloading anything.
//
// Usage: `node scripts/ci/retries-notice.mjs <report.json>...`. Each report is either a Playwright
// JSON report or the file `vitest-retry-reporter.mjs` writes; the shape is detected, not named. The
// message lists the retried tests, reads `none` when every report is readable and holds no retry,
// and adds `unknown (<reason>)` for each report that is absent, empty, malformed, or of neither
// shape, so an unreadable report never reads as a clean run. The process always exits zero: a
// notice step must not turn a green job red or mask the failure of the step before it.
import { existsSync, readFileSync } from 'node:fs';
import { basename, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const TITLE = 'retries';

/**
 * Collects the full names of the Playwright tests that ran more than once.
 *
 * @param {{ suites?: unknown[] }} report - A parsed Playwright JSON report.
 * @returns {string[]} Names joined with ` › `, as Playwright prints them.
 */
function playwrightRetries(report) {
  const names = [];
  /** @param {any} suite @param {string[]} trail */
  const walk = (suite, trail) => {
    // The file-level suite carries the spec file name as its title, so the trail starts there.
    const here = suite.title ? [...trail, suite.title] : trail;
    for (const spec of suite.specs ?? []) {
      const retried = (spec.tests ?? []).some((test) =>
        (test.results ?? []).some((result) => result.retry > 0),
      );
      if (retried) names.push([...here, spec.title].join(' › '));
    }
    for (const child of suite.suites ?? []) walk(child, here);
  };
  for (const suite of report.suites ?? []) walk(suite, []);
  return names;
}

/**
 * Collects the full names of the Vitest tests that needed a retry.
 *
 * @param {{ tests: Array<{ fullName: string, retryCount: number, flaky: boolean }> }} report - A
 *   parsed retry-reporter file.
 * @returns {string[]} The tests whose `retryCount` is above zero.
 */
function vitestRetries(report) {
  return report.tests.filter((test) => test.retryCount > 0 || test.flaky).map((test) => test.fullName);
}

/**
 * Reads one report file into its retried test names or the reason it is unreadable.
 *
 * @param {string} path - The report file.
 * @returns {{ retried: string[] } | { unknown: string }} The names, or a reason for `unknown (...)`.
 */
function readReport(path) {
  const label = basename(path);
  if (!existsSync(path)) return { unknown: `${label} is absent` };
  const text = readFileSync(path, 'utf8');
  if (text.trim() === '') return { unknown: `${label} is empty` };
  let report;
  try {
    report = JSON.parse(text);
  } catch (error) {
    return { unknown: `${label} is not valid JSON: ${error instanceof Error ? error.message : error}` };
  }
  if (report !== null && typeof report === 'object') {
    if (Array.isArray(report.suites)) return { retried: playwrightRetries(report) };
    if (Array.isArray(report.tests)) return { retried: vitestRetries(report) };
  }
  return { unknown: `${label} is neither a Playwright nor a retry-reporter report` };
}

/**
 * Escapes a message for a GitHub workflow command, which treats these three characters as control.
 *
 * @param {string} message - The raw message.
 * @returns {string} The message with `%`, CR, and LF percent-encoded.
 */
function escapeMessage(message) {
  return message.replace(/%/g, '%25').replace(/\r/g, '%0D').replace(/\n/g, '%0A');
}

/**
 * Builds the notice line from the retried names and the reasons a report was unreadable.
 *
 * @param {string[]} retried - Retried test names across every readable report.
 * @param {string[]} unknowns - One reason per unreadable report.
 * @returns {string} The `::notice title=retries::` line.
 */
export function formatNotice(retried, unknowns) {
  const parts = [];
  if (retried.length > 0) parts.push(retried.join(', '));
  for (const reason of unknowns) parts.push(`unknown (${reason})`);
  return `::notice title=${TITLE}::${escapeMessage(parts.length > 0 ? parts.join('; ') : 'none')}`;
}

/**
 * Reads every report and builds the job's one notice line.
 *
 * @param {string[]} paths - The report files the job's test steps wrote.
 * @returns {string} The `::notice title=retries::` line.
 */
export function noticeForReports(paths) {
  if (paths.length === 0) return formatNotice([], ['no report path given']);
  const retried = [];
  const unknowns = [];
  for (const path of paths) {
    const result = readReport(path);
    if ('unknown' in result) unknowns.push(result.unknown);
    else retried.push(...result.retried);
  }
  return formatNotice(retried, unknowns);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  console.log(noticeForReports(process.argv.slice(2)));
}
