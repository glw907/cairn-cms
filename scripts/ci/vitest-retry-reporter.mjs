// cairn-cms: a Vitest reporter that records which tests needed a retry. Vitest's built-in JSON
// reporter carries no retry field, so a test that failed its first attempt and passed on a retry
// is invisible in its output. This reporter reads the public per-test diagnostic instead and writes
// one JSON file at run end: `{ "tests": [{ "fullName", "retryCount", "flaky" }] }`.
//
// Pass it next to the default reporter, and name the output file in the environment:
// `VITEST_RETRY_REPORT=<path> vitest run --reporter=default --reporter=./scripts/ci/vitest-retry-reporter.mjs`.
// A run killed before it ends writes nothing, which the notice script reads as an unknown, never
// as a clean run.
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

/** The report path used when the environment names none. */
const DEFAULT_REPORT = 'vitest-retries.json';

/** Collects the retry diagnostic of every finished test and writes it when the run ends. */
export default class VitestRetryReporter {
  /** @type {Array<{ fullName: string, retryCount: number, flaky: boolean }>} */
  #tests = [];

  /**
   * Records one finished test.
   *
   * @param {import('vitest/node').TestCase} testCase - The test that just finished its hooks.
   */
  onTestCaseResult(testCase) {
    const diagnostic = testCase.diagnostic();
    this.#tests.push({
      fullName: testCase.fullName,
      retryCount: diagnostic?.retryCount ?? 0,
      flaky: diagnostic?.flaky ?? false,
    });
  }

  /** Writes the collected records to the path named by `VITEST_RETRY_REPORT`. */
  onTestRunEnd() {
    const path = resolve(process.env.VITEST_RETRY_REPORT ?? DEFAULT_REPORT);
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, `${JSON.stringify({ tests: this.#tests }, null, 2)}\n`);
  }
}
