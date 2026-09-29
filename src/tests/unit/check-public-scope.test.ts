import { describe, it, expect } from 'vitest';
import { PUBLIC_RULES, VARIANTS, publicScopeExitCode } from '../../../scripts/checks/check-public-scope.mjs';
import { staticRules } from '../../lib/audit/rules/static/index.js';
import type { Finding } from '../../lib/audit/types.js';

const finding = (tier: 'error' | 'advisory'): Finding => ({
  ruleId: 'theme-contrast',
  tier,
  file: 'src/theme/theme.css',
  line: 1,
  start: 0,
  end: 0,
  message: 'x',
});

const schemes = [
  { name: 'cairn', expected: 24, measured: 24 },
  { name: 'cairn-dark', expected: 24, measured: 24 },
];

/** One run whose report holds the given unsuppressed findings. */
const run = (findings: Finding[]) => ({ report: { findings, filesScanned: 12 }, schemes });

describe('check-public-scope exit logic', () => {
  it('exits 0 when no run leaves a finding', () => {
    expect(publicScopeExitCode([run([]), run([])])).toBe(0);
  });

  it('exits 1 on an unsuppressed advisory finding, the tier a consumer never gates on', () => {
    expect(publicScopeExitCode([run([]), run([finding('advisory')])])).toBe(1);
  });

  it('exits 1 on an unsuppressed error finding', () => {
    expect(publicScopeExitCode([run([finding('error')]), run([])])).toBe(1);
  });

  it('exits 0 when the only finding was suppressed, since a report lists suppressed findings apart', () => {
    const suppressedOnly = { report: { findings: [], suppressed: [finding('advisory')], filesScanned: 12 }, schemes };
    expect(publicScopeExitCode([suppressedOnly, run([])])).toBe(0);
  });

  it('exits 1 when a run scanned nothing, measured no scheme, or measured a scheme short', () => {
    expect(publicScopeExitCode([{ report: { findings: [], filesScanned: 0 }, schemes }])).toBe(1);
    expect(publicScopeExitCode([{ report: { findings: [], filesScanned: 12 }, schemes: [] }])).toBe(1);
    expect(
      publicScopeExitCode([{ report: { findings: [], filesScanned: 12 }, schemes: [{ name: 'cairn', expected: 24, measured: 23 }] }])
    ).toBe(1);
  });
});

describe('check-public-scope runs', () => {
  it('runs every registered public-scope rule, and only those', () => {
    const registered = staticRules()
      .filter((rule) => rule.publicScope)
      .map((rule) => rule.id);
    expect([...PUBLIC_RULES].sort()).toEqual(registered.sort());
  });

  it('runs the showcase alone and with the cairn-theme overlay after its theme', () => {
    expect(VARIANTS.map((variant) => variant.stylesheets)).toEqual([
      undefined,
      ['src/theme/theme.css', '../cairn-theme/cairn.css'],
    ]);
  });
});
