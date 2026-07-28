import { describe, it, expect } from 'vitest';
import { scopeReport } from '../../../scripts/check-admin-css-classes.mjs';
import type { AuditReport } from '../../lib/audit/types.js';

// no-uncompiled-class's own behavioral coverage (a static class token, a ternary literal, a
// class: directive, the scoped-<style> exclusion, the exact-match-never-a-substring guarantee)
// already lives at src/tests/unit/audit/rules/no-uncompiled-class.test.ts. What is specific to
// this gate is the wrapper's own restriction logic: a full audit report narrowed to exactly the
// one rule id this gate owns.
describe('scopeReport', () => {
  const report: AuditReport = {
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

  it('keeps only the owned rule id among the findings and the suppressed set', () => {
    const scoped = scopeReport(report, 'no-uncompiled-class');
    expect(scoped.findings.map((f) => f.ruleId)).toEqual(['no-uncompiled-class']);
    expect(scoped.suppressed.map((f) => f.ruleId)).toEqual(['no-uncompiled-class']);
  });

  it('never lets an unrelated rule\'s unsuppressed finding affect this gate\'s own result', () => {
    const scoped = scopeReport(report, 'no-uncompiled-class');
    expect(scoped.findings.some((f) => f.ruleId === 'type-scale')).toBe(false);
  });

  it('narrows ruleIds to the one owned rule and leaves filesScanned untouched', () => {
    const scoped = scopeReport(report, 'no-uncompiled-class');
    expect(scoped.ruleIds).toEqual(['no-uncompiled-class']);
    expect(scoped.filesScanned).toBe(50);
  });
});
