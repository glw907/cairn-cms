import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { scopeReport } from '../../../scripts/checks/audit-gate.mjs';
import { ADMIN_SCOPE, CSS_FILES, SCAN_SCOPE } from '../../../scripts/checks/check-invisible-craft.mjs';
import { resolveConfig } from '../../lib/audit/config.js';
import { runStatic } from '../../lib/audit/run.js';
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

// The engine gate's own static.adminScope: without it, an adminOnly rule resolves over the
// consumer default, which never reaches src/lib/components. This proves the gate's config wires
// ADMIN_SCOPE in, using the gate's own exported lists (SCAN_SCOPE, ADMIN_SCOPE, CSS_FILES) over a
// temporary root, the idiom src/tests/unit/audit/run.test.ts already uses. Both fixtures carry an
// identical violation pair (a p-[13px] gap-scale hit, a scoped transition: width motion-property
// hit); the only difference between them is which SCAN_SCOPE root each sits under, isolating the
// admin-scope narrowing this test exists to prove.
describe('the engine gate: static.adminScope narrows the admin-only motion rules, never gap-scale', () => {
  let root: string;
  const FIXTURE = '<div class="p-[13px]"></div>\n\n<style>\n.mover { transition: width 200ms ease; }\n</style>\n';

  beforeAll(() => {
    root = mkdtempSync(join(tmpdir(), 'cairn-invisible-craft-'));
    for (const dir of SCAN_SCOPE) mkdirSync(join(root, dir), { recursive: true });
    mkdirSync(join(root, 'examples/showcase/src/routes/admin'), { recursive: true });
    mkdirSync(join(root, 'dist/components'), { recursive: true });
    writeFileSync(join(root, 'dist/components/cairn-admin.css'), '.type-body { font-size: var(--cairn-type-body) }\n');
    // CSS_FILES entries must exist for loadCssFiles to read them; harmless content keeps the
    // count this test asserts free of an extra motion-property hit from the standalone sheet.
    for (const cssFile of CSS_FILES) writeFileSync(join(root, cssFile), '.harmless { color: red }\n');
    writeFileSync(join(root, 'src/lib/components/Fixture.svelte'), FIXTURE);
    writeFileSync(join(root, 'examples/showcase/src/theme/Fixture.svelte'), FIXTURE);
  });

  afterAll(() => {
    rmSync(root, { recursive: true, force: true });
  });

  it('produces a motion-property finding under src/lib/components and none under the showcase theme, while gap-scale reports both', () => {
    const config = resolveConfig(
      root,
      { static: { scope: SCAN_SCOPE, adminScope: ADMIN_SCOPE, cssFiles: CSS_FILES } },
      (candidate) => existsSync(resolve(root, candidate))
    );
    const report = runStatic(config);
    const motionPropertyFiles = report.findings.filter((f) => f.ruleId === 'motion-property').map((f) => f.file);
    expect(motionPropertyFiles).toEqual(['src/lib/components/Fixture.svelte']);
    const gapScaleFiles = report.findings.filter((f) => f.ruleId === 'gap-scale').map((f) => f.file).sort();
    expect(gapScaleFiles).toEqual([
      'examples/showcase/src/theme/Fixture.svelte',
      'src/lib/components/Fixture.svelte',
    ]);
  });
});
