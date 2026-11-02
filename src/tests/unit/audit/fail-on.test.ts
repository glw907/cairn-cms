// `cairn-audit --fail-on advisory` makes an unsuppressed advisory exit nonzero. The bare call keeps
// the original rule (only an error-tier finding gates), and a value other than the two tiers is a
// usage error rather than a silently ignored flag.
import { describe, it, expect } from 'vitest';
import { parseArgs } from '../../../lib/audit/config.js';
import { exitCodeFor } from '../../../lib/audit/report.js';
import type { AuditReport, Finding } from '../../../lib/audit/types.js';

function finding(tier: Finding['tier']): Finding {
  return { ruleId: 'probe', tier, file: 'a.css', line: 1, start: 0, end: 1, message: 'm' };
}

function report(...tiers: Finding['tier'][]): AuditReport {
  return { findings: tiers.map(finding), suppressed: [], filesScanned: 1, ruleIds: ['probe'] };
}

describe('exitCodeFor', () => {
  it('exits 0 on an advisory-only report, bare', () => {
    expect(exitCodeFor(report('advisory'))).toBe(0);
  });

  it('exits nonzero on an advisory-only report under fail-on advisory', () => {
    expect(exitCodeFor(report('advisory'), 'advisory')).toBe(1);
  });

  it('exits nonzero on an error-tier report either way', () => {
    expect(exitCodeFor(report('error'))).toBe(1);
    expect(exitCodeFor(report('error', 'advisory'), 'advisory')).toBe(1);
  });

  it('exits 0 on a clean report either way', () => {
    expect(exitCodeFor(report())).toBe(0);
    expect(exitCodeFor(report(), 'advisory')).toBe(0);
  });

  it('counts only an unsuppressed advisory, since a suppressed one never reaches the findings', () => {
    const suppressed = { ...report(), suppressed: [{ ...finding('advisory'), reason: 'ok' }] } as unknown as AuditReport;
    expect(exitCodeFor(suppressed, 'advisory')).toBe(0);
  });
});

describe('parseArgs --fail-on', () => {
  it('reads advisory and error', () => {
    expect(parseArgs(['--fail-on', 'advisory'])).toEqual({ failOn: 'advisory' });
    expect(parseArgs(['--fail-on', 'error'])).toEqual({ failOn: 'error' });
  });

  it('leaves failOn unset on a bare call', () => {
    expect(parseArgs([]).failOn).toBeUndefined();
  });

  it('treats an unknown value as a usage error', () => {
    expect(() => parseArgs(['--fail-on', 'warning'])).toThrow(/--fail-on.*advisory/s);
  });

  it('treats a missing value as a usage error', () => {
    expect(() => parseArgs(['--fail-on'])).toThrow(/--fail-on needs a value/);
    expect(() => parseArgs(['--fail-on', '--config'])).toThrow(/--fail-on needs a value/);
  });
});
