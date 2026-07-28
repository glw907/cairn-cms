import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { loadConfig } from '../../../lib/audit/config.js';
import { runStatic } from '../../../lib/audit/run.js';
import { exitCodeFor, formatReport } from '../../../lib/audit/report.js';
import { staticRules } from '../../../lib/audit/rules/static/index.js';
import type { AuditReport, Finding, StaticRule, StaticRuleContext } from '../../../lib/audit/types.js';

let root: string;

beforeAll(() => {
  root = mkdtempSync(join(tmpdir(), 'cairn-audit-'));
  mkdirSync(join(root, 'dist/components'), { recursive: true });
  mkdirSync(join(root, 'src/lib/admin-fields'), { recursive: true });
  mkdirSync(join(root, 'src/routes/admin/posts'), { recursive: true });
  writeFileSync(
    join(root, 'dist/components/cairn-admin.css'),
    '.type-body { font-size: var(--cairn-type-body) }'
  );
  writeFileSync(
    join(root, 'src/lib/admin-fields/FieldLabel.svelte'),
    '<span class="type-label">x</span>\n'
  );
  writeFileSync(join(root, 'src/routes/admin/posts/+page.svelte'), '<div class="card"></div>\n');
});

afterAll(() => {
  rmSync(root, { recursive: true, force: true });
});

/** A rule that records the context it received and reports one finding per class token. */
function probeRule(seen: StaticRuleContext[]): StaticRule {
  return {
    id: 'probe',
    tier: 'error',
    check(ctx) {
      seen.push(ctx);
      return ctx.files.flatMap((file) =>
        file.classTokens.map((token) => ({
          ruleId: 'probe',
          tier: 'error' as const,
          file: file.file,
          line: token.line,
          start: token.start,
          end: token.end,
          message: `saw ${token.value}`,
        }))
      );
    },
  };
}

describe('the static rule registry', () => {
  // Task 7 shipped the contract with an empty registry; Task 9a's four markup-family rules are
  // the first modules to register, without touching run.ts.
  it('carries the four markup-family rules Task 9a registered', () => {
    expect(staticRules().map((rule) => rule.id)).toEqual([
      'no-uncompiled-class',
      'type-scale',
      'gap-scale',
      'stock-default-hazards',
    ]);
  });

  it('hands back a fresh array each call', () => {
    expect(staticRules()).not.toBe(staticRules());
  });
});

describe('runStatic', () => {
  it('parses every component under the scan scope and resolves the built sheet', () => {
    const seen: StaticRuleContext[] = [];
    const report = runStatic(loadConfig(root), [probeRule(seen)]);
    expect(report.filesScanned).toBe(2);
    expect(seen).toHaveLength(1);
    expect(seen[0].files.map((f) => f.file).sort()).toEqual([
      'src/lib/admin-fields/FieldLabel.svelte',
      'src/routes/admin/posts/+page.svelte',
    ]);
    expect(seen[0].sheet.has('type-body')).toBe(true);
    expect(seen[0].config.root).toBe(root);
  });

  it('collects the registered rules findings, sorted by file and line', () => {
    const report = runStatic(loadConfig(root), [probeRule([])]);
    expect(report.ruleIds).toEqual(['probe']);
    expect(report.findings.map((f) => `${f.file}:${f.line} ${f.message}`)).toEqual([
      'src/lib/admin-fields/FieldLabel.svelte:1 saw type-label',
      'src/routes/admin/posts/+page.svelte:1 saw card',
    ]);
    expect(report.suppressed).toEqual([]);
  });

  it('runs the shipped registry, which now flags this fixture tree\'s uncompiled classes', () => {
    // Task 9a's first rule to register: type-label and card never compile into the fixture
    // sheet above, which only defines type-body. A clean tree is proven by rules.test.ts's
    // fixtures, not by this generic wiring test.
    const report = runStatic(loadConfig(root));
    expect(report.ruleIds).toEqual(['no-uncompiled-class', 'type-scale', 'gap-scale', 'stock-default-hazards']);
    expect(report.findings.map((f) => f.ruleId)).toEqual(['no-uncompiled-class', 'no-uncompiled-class']);
    expect(exitCodeFor(report)).toBe(1);
  });

  it('fails naming the sheet path when the built stylesheet is missing', () => {
    const bare = mkdtempSync(join(tmpdir(), 'cairn-audit-bare-'));
    try {
      expect(() => runStatic(loadConfig(bare))).toThrow(/cairn-admin\.css/);
    } finally {
      rmSync(bare, { recursive: true, force: true });
    }
  });
});

/** A report carrying the given findings, with everything else empty. */
function reportOf(findings: Finding[], suppressed: Finding[] = []): AuditReport {
  return { findings, suppressed, filesScanned: 1, ruleIds: ['type-scale'] };
}

const finding = (tier: 'error' | 'advisory'): Finding => ({
  ruleId: 'type-scale',
  tier,
  file: 'src/lib/components/EditPage.svelte',
  line: 1842,
  start: 0,
  end: 1,
  message: 'font-size 30px resolves to no --cairn-type-* token',
});

describe('exitCodeFor', () => {
  it('exits zero on a clean report', () => {
    expect(exitCodeFor(reportOf([]))).toBe(0);
  });

  it('exits nonzero on an unsuppressed error-tier finding', () => {
    expect(exitCodeFor(reportOf([finding('error')]))).toBe(1);
  });

  it('never exits nonzero on an advisory finding', () => {
    expect(exitCodeFor(reportOf([finding('advisory')]))).toBe(0);
  });

  // The suppression contract: a suppressed finding leaves the exit-code math and stays in the
  // count, so a build that passes by suppression reads as one.
  it('never exits nonzero on a suppressed error-tier finding', () => {
    expect(exitCodeFor(reportOf([], [finding('error')]))).toBe(0);
  });
});

describe('formatReport', () => {
  it('renders each finding with file:line, rule id, and tier', () => {
    const text = formatReport(reportOf([finding('error'), finding('advisory')]));
    expect(text).toContain('src/lib/components/EditPage.svelte:1842');
    expect(text).toContain('error');
    expect(text).toContain('advisory');
    expect(text).toContain('type-scale');
    expect(text).toContain('font-size 30px resolves to no --cairn-type-* token');
  });

  it('totals the suppressions loudly, so a passing run still shows them', () => {
    expect(formatReport(reportOf([], [finding('error')]))).toMatch(/1 suppressed/);
    expect(formatReport(reportOf([]))).toMatch(/0 suppressed/);
  });

  it('names the scan size and the rules that ran', () => {
    const text = formatReport(reportOf([]));
    expect(text).toContain('1 file');
    expect(text).toContain('1 rule');
  });
});
