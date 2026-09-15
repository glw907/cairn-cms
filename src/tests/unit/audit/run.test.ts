import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { loadConfig } from '../../../lib/audit/config.js';
import { runStatic, selectRules } from '../../../lib/audit/run.js';
import { exitCodeFor, formatReport } from '../../../lib/audit/report.js';
import { staticRules } from '../../../lib/audit/rules/static/index.js';
import { noUncompiledClass } from '../../../lib/audit/rules/static/no-uncompiled-class.js';
import type { AuditReport, Finding, StaticRule, StaticRuleContext } from '../../../lib/audit/types.js';

let root: string;

beforeAll(() => {
  root = mkdtempSync(join(tmpdir(), 'cairn-audit-'));
  mkdirSync(join(root, 'dist/components'), { recursive: true });
  mkdirSync(join(root, 'src/lib/admin-toolkit'), { recursive: true });
  mkdirSync(join(root, 'src/routes/admin/posts'), { recursive: true });
  writeFileSync(
    join(root, 'dist/components/cairn-admin.css'),
    '.type-body { font-size: var(--cairn-type-body) }'
  );
  writeFileSync(
    join(root, 'src/lib/admin-toolkit/FieldLabel.svelte'),
    '<span class="type-label">x</span>\n'
  );
  writeFileSync(join(root, 'src/routes/admin/posts/+page.svelte'), '<div class="card"></div>\n');
  mkdirSync(join(root, 'src/lib/components'), { recursive: true });
  writeFileSync(join(root, 'src/lib/components/PublicWidget.svelte'), '<div></div>\n');
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
  // Task 7 shipped the contract with an empty registry; Task 9a's four markup-family rules,
  // Task 9b's five CSS-family rules, the harvest-detection pass's Tasks 3 and 4, and the motion
  // pass's motion-property, motion-hover-gate, and motion-vocabulary are the modules that have
  // registered since, without touching run.ts.
  it('carries the fifteen static rules registered since Task 7', () => {
    // Membership, not order: runStatic re-sorts its findings by file and line, so registration
    // order carries no behavioral meaning. Sorting both sides also catches a duplicate id, which
    // a Set-based comparison would silently collapse.
    expect(staticRules().map((rule) => rule.id).sort()).toEqual(
      [
        'no-uncompiled-class',
        'type-scale',
        'gap-scale',
        'stock-default-hazards',
        'token-colors',
        'grammar-boundary',
        'focus-parity',
        'motion-band',
        'motion-property',
        'motion-vocabulary',
        'motion-hover-gate',
        'reduced-motion',
        'stripe-trim-parity',
        'unlayered-font-clobber',
        'list-role',
      ].sort(),
    );
  });

  it('hands back a fresh array each call', () => {
    expect(staticRules()).not.toBe(staticRules());
  });
});

describe('selectRules', () => {
  const all = staticRules();

  it('returns every rule, in registry order, when no ids are named', () => {
    expect(selectRules(all, undefined)).toEqual(all);
  });

  it('narrows to the named ids, in registry order regardless of the ids order', () => {
    const selected = selectRules(all, ['motion-property', 'gap-scale']);
    expect(selected.map((rule) => rule.id)).toEqual(['gap-scale', 'motion-property']);
  });

  it('throws naming the known ids when an id matches no registered rule', () => {
    expect(() => selectRules(all, ['not-a-real-rule'])).toThrow(/not-a-real-rule/);
    expect(() => selectRules(all, ['not-a-real-rule'])).toThrow(/gap-scale/);
  });
});

describe('runStatic', () => {
  it('parses every component under the scan scope and resolves the built sheet', () => {
    const seen: StaticRuleContext[] = [];
    const report = runStatic(loadConfig(root), [probeRule(seen)]);
    // Task 3's own `src/lib/components` fixture (a `src/lib/components` root, no `adminOnly`
    // declaration on this probe) joins the two roots already here, since the probe resolves
    // over `static.scope`, not `static.adminScope`.
    expect(report.filesScanned).toBe(3);
    expect(seen).toHaveLength(1);
    expect(seen[0].files.map((f) => f.file).sort()).toEqual([
      'src/lib/admin-toolkit/FieldLabel.svelte',
      'src/lib/components/PublicWidget.svelte',
      'src/routes/admin/posts/+page.svelte',
    ]);
    expect(seen[0].sheet.has('type-body')).toBe(true);
    expect(seen[0].config.root).toBe(root);
  });

  it('collects the registered rules findings, sorted by file and line', () => {
    const report = runStatic(loadConfig(root), [probeRule([])]);
    expect(report.ruleIds).toEqual(['probe']);
    expect(report.findings.map((f) => `${f.file}:${f.line} ${f.message}`)).toEqual([
      'src/lib/admin-toolkit/FieldLabel.svelte:1 saw type-label',
      'src/routes/admin/posts/+page.svelte:1 saw card',
    ]);
    expect(report.suppressed).toEqual([]);
  });

  it('runs the shipped registry, which now flags this fixture tree\'s uncompiled classes', () => {
    // Task 9a's first rule to register: type-label and card never compile into the fixture
    // sheet above, which only defines type-body. Neither fixture component carries a <style>
    // block, so the CSS-family rules Task 9b added have nothing to scan here; a clean tree is
    // proven by each rule's own fixtures, not by this generic wiring test.
    const report = runStatic(loadConfig(root));
    // Membership is pinned once, in "the static rule registry" above; here just confirm the
    // default (no rules override) run wires up the full fifteen-rule registry. The new
    // `src/lib/components/PublicWidget.svelte` fixture carries no class and no CSS, so it trips
    // nothing beyond the two no-uncompiled-class findings the tree already carried.
    expect(report.ruleIds).toHaveLength(15);
    expect(report.findings.map((f) => f.ruleId)).toEqual(['no-uncompiled-class', 'no-uncompiled-class']);
    expect(exitCodeFor(report)).toBe(1);
  });

  // The silent green the spec rejected the ESLint route over, reproduced by one transposed letter
  // in a consumer's own config: nothing is scanned, no rule can raise anything, and the exit code
  // reads as a clean audit.
  it('fails naming a configured scan directory the tree does not have', () => {
    const configPath = join(root, 'typo.json');
    writeFileSync(configPath, JSON.stringify({ static: { scope: ['src/lib/componets'] } }));
    expect(() => runStatic(loadConfig(root, configPath))).toThrow(/src\/lib\/componets/);
  });

  it('fails when the scan matched no file at all, rather than reporting a clean run', () => {
    const empty = mkdtempSync(join(tmpdir(), 'cairn-audit-empty-'));
    try {
      mkdirSync(join(empty, 'dist/components'), { recursive: true });
      writeFileSync(join(empty, 'dist/components/cairn-admin.css'), '.type-body { font-size: 1rem }');
      expect(() => runStatic(loadConfig(empty))).toThrow(/matched no files/);
    } finally {
      rmSync(empty, { recursive: true, force: true });
    }
  });

  it('fails naming the sheet path when the built stylesheet is missing', () => {
    const bare = mkdtempSync(join(tmpdir(), 'cairn-audit-bare-'));
    try {
      expect(() => runStatic(loadConfig(bare))).toThrow(/cairn-admin\.css/);
    } finally {
      rmSync(bare, { recursive: true, force: true });
    }
  });

  // The ledger's ruled shape: `sheet` is a list of compiled-class sources, so a class a site's own
  // stylesheet compiles reads the same as a class the packaged sheet compiles, instead of needing
  // case-by-case exemption from no-uncompiled-class.
  describe('a list-valued sheet', () => {
    let siteRoot: string;

    beforeAll(() => {
      siteRoot = mkdtempSync(join(tmpdir(), 'cairn-audit-site-sheet-'));
      mkdirSync(join(siteRoot, 'dist/components'), { recursive: true });
      mkdirSync(join(siteRoot, 'src/lib/components'), { recursive: true });
      mkdirSync(join(siteRoot, 'src/theme'), { recursive: true });
      writeFileSync(join(siteRoot, 'dist/components/cairn-admin.css'), '.card { border: 1px solid black }');
      writeFileSync(join(siteRoot, 'src/theme/site.css'), '.site-badge { color: red }');
      writeFileSync(
        join(siteRoot, 'src/lib/components/Fixture.svelte'),
        '<div class="card site-badge ghost"></div>\n'
      );
    });

    afterAll(() => {
      rmSync(siteRoot, { recursive: true, force: true });
    });

    it('passes a class a registered site sheet compiles, and still flags an unregistered one', () => {
      const configPath = join(siteRoot, 'with-site-sheet.json');
      writeFileSync(
        configPath,
        JSON.stringify({ sheet: ['dist/components/cairn-admin.css', 'src/theme/site.css'] })
      );
      const report = runStatic(loadConfig(siteRoot, configPath), [noUncompiledClass]);
      expect(report.findings.map((f) => f.message)).toEqual([expect.stringContaining('"ghost" never compiles')]);
    });

    it('flags the same class when its site sheet is not named', () => {
      const configPath = join(siteRoot, 'without-site-sheet.json');
      writeFileSync(configPath, JSON.stringify({ sheet: ['dist/components/cairn-admin.css'] }));
      const report = runStatic(loadConfig(siteRoot, configPath), [noUncompiledClass]);
      expect(report.findings.map((f) => f.message).sort()).toEqual([
        expect.stringContaining('"ghost" never compiles'),
        expect.stringContaining('"site-badge" never compiles'),
      ]);
    });

    it('fails naming a listed sheet source that does not exist, rather than skipping it silently', () => {
      const configPath = join(siteRoot, 'missing-sheet-source.json');
      writeFileSync(
        configPath,
        JSON.stringify({ sheet: ['dist/components/cairn-admin.css', 'src/theme/absent.css'] })
      );
      expect(() => runStatic(loadConfig(siteRoot, configPath))).toThrow(/absent\.css/);
    });
  });
});

/** A rule that reports one finding naming every component file its context received. */
function seenFilesRule(id: string, adminOnly: boolean): StaticRule {
  return {
    id,
    tier: 'error',
    adminOnly,
    check(ctx) {
      return ctx.files.map((file) => ({
        ruleId: id,
        tier: 'error' as const,
        file: file.file,
        line: 1,
        start: 0,
        end: 1,
        message: `saw ${file.file}`,
      }));
    },
  };
}

/** A rule that reports one finding naming every standalone CSS file its context received. */
function seenCssFilesRule(id: string, adminOnly: boolean): StaticRule {
  return {
    id,
    tier: 'error',
    adminOnly,
    check(ctx) {
      return (ctx.cssFiles ?? []).map((cssFile) => ({
        ruleId: id,
        tier: 'error' as const,
        file: cssFile.file,
        line: 1,
        start: 0,
        end: 1,
        message: `saw ${cssFile.file}`,
      }));
    },
  };
}

describe('static.adminScope', () => {
  it('resolves an adminOnly rule over the admin roots, and a plain rule over every static.scope root', () => {
    const report = runStatic(loadConfig(root), [
      seenFilesRule('probe-admin', true),
      seenFilesRule('probe-default', false),
    ]);
    const adminSeen = report.findings.filter((f) => f.ruleId === 'probe-admin').map((f) => f.file);
    const defaultSeen = report.findings.filter((f) => f.ruleId === 'probe-default').map((f) => f.file);
    // The consumer default: adminScope names src/routes/admin and src/lib/admin-toolkit, never
    // the middle root a site keeps its own public components in.
    expect(adminSeen).not.toContain('src/lib/components/PublicWidget.svelte');
    expect(adminSeen).toContain('src/routes/admin/posts/+page.svelte');
    expect(defaultSeen).toContain('src/lib/components/PublicWidget.svelte');
    expect(defaultSeen).toContain('src/routes/admin/posts/+page.svelte');
  });

  it('reaches a static.cssFiles entry outside the admin roots with a plain rule, and never with an adminOnly one', () => {
    writeFileSync(join(root, 'src/lib/components/theme.css'), '.foo { color: red }\n');
    const configPath = join(root, 'admin-scope-css.json');
    writeFileSync(configPath, JSON.stringify({ static: { cssFiles: ['src/lib/components/theme.css'] } }));
    const report = runStatic(loadConfig(root, configPath), [
      seenCssFilesRule('probe-admin-css', true),
      seenCssFilesRule('probe-default-css', false),
    ]);
    expect(report.findings.filter((f) => f.ruleId === 'probe-admin-css')).toEqual([]);
    expect(report.findings.filter((f) => f.ruleId === 'probe-default-css').map((f) => f.file)).toEqual([
      'src/lib/components/theme.css',
    ]);
  });

  it('behaves as the two-root default when a config is silent about static.adminScope', () => {
    // No config file at root's default CONFIG_FILE path, so resolveConfig fills DEFAULT_ADMIN_SCOPE.
    // The prior test already proves that default resolves to src/routes/admin and
    // src/lib/admin-toolkit, never the middle staticScope root.
    expect(loadConfig(root).adminScope).toEqual(['src/routes/admin', 'src/lib/admin-toolkit']);
    expect(loadConfig(root).adminScopeFromConfig).toBe(false);
  });

  it('skips a default admin root the tree does not carry, and still returns a report', () => {
    const bare = mkdtempSync(join(tmpdir(), 'cairn-audit-adminscope-'));
    try {
      mkdirSync(join(bare, 'dist/components'), { recursive: true });
      mkdirSync(join(bare, 'src/lib/admin-toolkit'), { recursive: true });
      writeFileSync(join(bare, 'dist/components/cairn-admin.css'), '.type-body { font-size: 1rem }');
      writeFileSync(join(bare, 'src/lib/admin-toolkit/Field.svelte'), '<div></div>\n');
      // No src/routes/admin: the default admin root this tree does not have.
      const report = runStatic(loadConfig(bare));
      expect(report.filesScanned).toBe(1);
    } finally {
      rmSync(bare, { recursive: true, force: true });
    }
  });

  it('fails naming a configured static.adminScope root the tree does not have', () => {
    const bare = mkdtempSync(join(tmpdir(), 'cairn-audit-adminscope-throws-'));
    try {
      mkdirSync(join(bare, 'dist/components'), { recursive: true });
      mkdirSync(join(bare, 'src/lib/admin-toolkit'), { recursive: true });
      writeFileSync(join(bare, 'dist/components/cairn-admin.css'), '.type-body { font-size: 1rem }');
      writeFileSync(join(bare, 'src/lib/admin-toolkit/Field.svelte'), '<div></div>\n');
      const configPath = join(bare, 'cairn-audit.config.json');
      writeFileSync(configPath, JSON.stringify({ static: { adminScope: ['src/admin-missing'] } }));
      expect(() => runStatic(loadConfig(bare, configPath))).toThrow(/src\/admin-missing/);
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

  // One ratified rendered exemption can suppress the same line on scores of elements, and a
  // hundred-line block is read as noise rather than as the exception count it is. Repeats collapse
  // to one line carrying the multiplier; the summary total still counts every finding, and a line
  // that occurs once prints exactly as it always did.
  it('collapses repeated identical suppressed lines while the total stays exact', () => {
    const suppressed = [finding('advisory'), finding('advisory'), finding('advisory'), finding('error')];
    const text = formatReport(reportOf([], suppressed));
    expect(text).toMatch(/4 suppressed/);
    expect(text).toContain('(x3)');
    expect(text.split('\n').filter((row) => row.includes('type-scale'))).toHaveLength(2);
    expect(text).not.toContain('(x1)');
  });

  it('names the scan size and the rules that ran', () => {
    const text = formatReport(reportOf([]));
    expect(text).toContain('1 file');
    expect(text).toContain('1 rule');
  });
});
