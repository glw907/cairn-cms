import { describe, it, expect } from 'vitest';
import { scopeReport } from '../../../scripts/audit-gate.mjs';
import type { AuditReport } from '../../lib/audit/types.js';

// Each rule's own behavioral coverage lives under src/tests/unit/audit/rules/. What is specific to
// the gate wrappers, and worth pinning here, is the restriction they share: a full audit report's
// findings and suppressions narrowed to exactly the rule ids one gate owns, never touching a rule
// outside that set.
describe('scopeReport', () => {
  const report: AuditReport = {
    findings: [
      { ruleId: 'motion-band', tier: 'error', file: 'a.svelte', line: 1, start: 0, end: 1, message: 'm' },
      { ruleId: 'type-scale', tier: 'error', file: 'b.svelte', line: 2, start: 0, end: 1, message: 't' },
    ],
    suppressed: [
      { ruleId: 'gap-scale', tier: 'error', file: 'c.svelte', line: 3, start: 0, end: 1, message: 'g' },
      { ruleId: 'stock-default-hazards', tier: 'error', file: 'd.svelte', line: 4, start: 0, end: 1, message: 's' },
    ],
    filesScanned: 42,
    ruleIds: ['motion-band', 'type-scale', 'gap-scale', 'stock-default-hazards', 'token-colors'],
  };

  it('keeps only the owned rule ids among the findings and the suppressed set', () => {
    const scoped = scopeReport(report, ['gap-scale', 'token-colors', 'motion-band']);
    expect(scoped.findings.map((f) => f.ruleId)).toEqual(['motion-band']);
    expect(scoped.suppressed.map((f) => f.ruleId)).toEqual(['gap-scale']);
  });

  it('never lets an unrelated rule\'s unsuppressed finding affect a gate\'s own result', () => {
    const scoped = scopeReport(report, ['gap-scale', 'token-colors', 'motion-band']);
    expect(scoped.findings.some((f) => f.ruleId === 'type-scale')).toBe(false);
  });

  it('narrows ruleIds and leaves filesScanned untouched', () => {
    const scoped = scopeReport(report, ['gap-scale', 'token-colors', 'motion-band']);
    expect(scoped.ruleIds).toEqual(['motion-band', 'gap-scale', 'token-colors']);
    expect(scoped.filesScanned).toBe(42);
  });

  it('returns an empty report when nothing in scope raised or suppressed anything', () => {
    const clean = { ...report, findings: [], suppressed: [] };
    const scoped = scopeReport(clean, ['gap-scale', 'token-colors', 'motion-band']);
    expect(scoped.findings).toEqual([]);
    expect(scoped.suppressed).toEqual([]);
  });

  // The single-rule gate (check-admin-css-classes) is the same call with a one-entry list.
  it('narrows to a single owned rule across findings, suppressions, and ruleIds', () => {
    const single: AuditReport = {
      findings: [
        { ruleId: 'no-uncompiled-class', tier: 'error', file: 'a.svelte', line: 1, start: 0, end: 1, message: 'u' },
        { ruleId: 'type-scale', tier: 'error', file: 'b.svelte', line: 2, start: 0, end: 1, message: 't' },
      ],
      suppressed: [
        { ruleId: 'no-uncompiled-class', tier: 'error', file: 'c.svelte', line: 3, start: 0, end: 1, message: 'u2' },
        { ruleId: 'gap-scale', tier: 'error', file: 'd.svelte', line: 4, start: 0, end: 1, message: 'g' },
      ],
      filesScanned: 50,
      ruleIds: ['no-uncompiled-class', 'type-scale', 'gap-scale'],
    };
    const scoped = scopeReport(single, ['no-uncompiled-class']);
    expect(scoped.findings.map((f) => f.ruleId)).toEqual(['no-uncompiled-class']);
    expect(scoped.suppressed.map((f) => f.ruleId)).toEqual(['no-uncompiled-class']);
    expect(scoped.ruleIds).toEqual(['no-uncompiled-class']);
    expect(scoped.filesScanned).toBe(50);
  });
});
