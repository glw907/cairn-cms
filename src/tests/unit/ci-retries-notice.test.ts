// cairn-cms: the retry annotation. Each CI test job turns its machine-readable report into one
// `::notice title=retries::` line, so a test that passed only on a retry stays visible in the
// check-runs annotations even though the job is green.
//
// The four reports under src/tests/fixtures/ci-retries/ are real output, never hand-written: the
// Playwright pair came from `playwright test --reporter=json` over a throwaway spec that fails its
// first attempt (`retries: 1`), and the Vitest pair from the retry reporter over a throwaway test
// that does the same (`retry: 1`), each beside a spec that passes first time. The last describe
// block re-runs the reporter live, so a Vitest upgrade that changes `diagnostic()` fails here.
import { describe, it, expect } from 'vitest';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { formatNotice, noticeForReports } from '../../../scripts/ci/retries-notice.mjs';

const ROOT = resolve(__dirname, '../../..');
const FIXTURES = resolve(__dirname, '../fixtures/ci-retries');
const fixture = (name: string): string => join(FIXTURES, name);
const NOTICE = '::notice title=retries::';

function scratchDir(): string {
  return mkdtempSync(join(tmpdir(), 'cairn-retries-'));
}

describe('retries notice from recorded reports', () => {
  it('names the Playwright test that passed on its retry', () => {
    expect(noticeForReports([fixture('playwright-retried.json')])).toBe(
      `${NOTICE}retried.spec.mjs › throwaway › passes only on its retry`,
    );
  });

  it('names the Vitest test that passed on its retry', () => {
    expect(noticeForReports([fixture('vitest-retried.json')])).toBe(
      `${NOTICE}throwaway > passes only on its retry`,
    );
  });

  it('reads none from a Playwright report with no retry', () => {
    expect(noticeForReports([fixture('playwright-clean.json')])).toBe(`${NOTICE}none`);
  });

  it('reads none from a Vitest report with no retry', () => {
    expect(noticeForReports([fixture('vitest-clean.json')])).toBe(`${NOTICE}none`);
  });

  it('lists the retried test of one report beside a clean one', () => {
    expect(
      noticeForReports([fixture('vitest-clean.json'), fixture('vitest-retried.json')]),
    ).toBe(`${NOTICE}throwaway > passes only on its retry`);
  });
});

describe('retries notice when a report cannot be read', () => {
  it('reads an absent report as unknown, never none', () => {
    const line = noticeForReports([join(scratchDir(), 'missing.json')]);
    expect(line).toBe(`${NOTICE}unknown (missing.json is absent)`);
  });

  it('reads an empty report as unknown', () => {
    const path = join(scratchDir(), 'empty.json');
    writeFileSync(path, '');
    expect(noticeForReports([path])).toBe(`${NOTICE}unknown (empty.json is empty)`);
  });

  it('reads malformed JSON as unknown', () => {
    const path = join(scratchDir(), 'broken.json');
    writeFileSync(path, '{ "tests": [');
    expect(noticeForReports([path])).toMatch(/^::notice title=retries::unknown \(broken\.json is not valid JSON/);
  });

  it('reads JSON of neither reporter shape as unknown', () => {
    const path = join(scratchDir(), 'other.json');
    writeFileSync(path, '{"unrelated": true}');
    expect(noticeForReports([path])).toBe(`${NOTICE}unknown (other.json is neither a Playwright nor a retry-reporter report)`);
  });

  it('reads a path that cannot be read as a file as unknown, and does not throw', () => {
    const line = noticeForReports([scratchDir()]);
    expect(line).toMatch(/^::notice title=retries::unknown \(.+ cannot be read: /);
  });

  it('reads a call with no report path as unknown', () => {
    expect(noticeForReports([])).toBe(`${NOTICE}unknown (no report path given)`);
  });

  it('keeps the retried names when another report in the same job is unreadable', () => {
    const line = noticeForReports([fixture('vitest-retried.json'), join(scratchDir(), 'gone.json')]);
    expect(line).toBe(`${NOTICE}throwaway > passes only on its retry; unknown (gone.json is absent)`);
  });
});

describe('formatNotice escaping', () => {
  it('escapes the characters a workflow command treats as control', () => {
    expect(formatNotice(['100% sure\nsecond line'], [])).toBe(`${NOTICE}100%25 sure%0Asecond line`);
  });
});

describe('the command line', () => {
  it('prints the notice and exits zero even when the report is absent', () => {
    const run = spawnSync('node', ['scripts/ci/retries-notice.mjs', join(scratchDir(), 'none.json')], {
      cwd: ROOT,
      encoding: 'utf8',
    });
    expect(run.status).toBe(0);
    expect(run.stdout.trim()).toBe(`${NOTICE}unknown (none.json is absent)`);
  });
});

describe('the Vitest retry reporter, live', () => {
  it('records retryCount 1 and flaky true for a test that passed on its retry', () => {
    const dir = scratchDir();
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, 'vitest.config.mjs'), "export default { test: { globals: true, include: ['*.test.mjs'] } };\n");
    writeFileSync(
      join(dir, 'retried.test.mjs'),
      [
        'let attempts = 0;',
        "describe('throwaway', () => {",
        "  it('passes only on its retry', { retry: 1 }, () => {",
        '    attempts += 1;',
        "    if (attempts === 1) throw new Error('first attempt fails');",
        '  });',
        '});',
        '',
      ].join('\n'),
    );
    const report = join(dir, 'report.json');
    const run = spawnSync(
      process.execPath,
      [
        join(ROOT, 'node_modules/vitest/vitest.mjs'),
        'run',
        '--root',
        dir,
        '--config',
        join(dir, 'vitest.config.mjs'),
        '--reporter=default',
        `--reporter=${join(ROOT, 'scripts/ci/vitest-retry-reporter.mjs')}`,
      ],
      { encoding: 'utf8', env: { ...process.env, VITEST_RETRY_REPORT: report } },
    );
    expect(run.status, run.stdout + run.stderr).toBe(0);
    const parsed = JSON.parse(readFileSync(report, 'utf8')) as { tests: Array<Record<string, unknown>> };
    expect(parsed.tests).toEqual([
      { fullName: 'throwaway > passes only on its retry', retryCount: 1, flaky: true },
    ]);
    expect(noticeForReports([report])).toBe(`${NOTICE}throwaway > passes only on its retry`);
  });
});
