import { describe, it, expect } from 'vitest';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { CSS_FILES, SCAN_SCOPE, scopeReport } from '../../../scripts/check-invisible-craft.mjs';
import type { AuditReport } from '../../lib/audit/types.js';

// The rule fixtures for motion-band, gap-scale, and token-colors (the three rules this gate
// graduated into) already carry their own exhaustive behavioral coverage under
// src/tests/unit/audit/rules/. What is specific to this gate, and worth pinning here, is the
// wrapper's own restriction logic: a full audit report's findings and suppressions narrowed to
// exactly the rule ids this gate owns, never touching a rule outside that set.
// The graduation's other half: a gate that runs the right rules over less ground than it used to
// is still a coverage regression, and this one silently stopped walking the showcase when it
// inherited the engine's consumer-shaped default scope.
describe('SCAN_SCOPE', () => {
  it('keeps walking the showcase roots the pre-graduation gate walked', () => {
    expect(SCAN_SCOPE).toContain('examples/showcase/src/chassis');
    expect(SCAN_SCOPE).toContain('examples/showcase/src/routes');
    expect(SCAN_SCOPE).toContain('examples/showcase/src/theme');
  });

  it('keeps walking the admin surfaces', () => {
    expect(SCAN_SCOPE).toContain('src/lib/components');
    expect(SCAN_SCOPE).toContain('src/lib/admin-toolkit');
    expect(SCAN_SCOPE).toContain('src/lib/admin-fields');
  });

  it('names only directories the tree actually has, so a rename fails loudly', () => {
    for (const dir of SCAN_SCOPE) {
      expect(existsSync(resolve(process.cwd(), dir)), dir).toBe(true);
    }
  });
});

// The declared-palette-site concept (config.ts's paletteCssFiles) only protects a file this gate
// actually names as a consumer CSS file; a rename here that CSS_FILES does not track would go
// back to being unscanned entirely, the same silent narrowing SCAN_SCOPE guards against above.
describe('CSS_FILES', () => {
  it('names the showcase theme\'s own palette declaration site', () => {
    expect(CSS_FILES).toContain('examples/showcase/src/theme/theme.css');
  });

  it('names only files the tree actually has, so a rename fails loudly', () => {
    for (const file of CSS_FILES) {
      expect(existsSync(resolve(process.cwd(), file)), file).toBe(true);
    }
  });
});

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

  it('never lets an unrelated rule\'s unsuppressed finding affect this gate\'s own result', () => {
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
});
