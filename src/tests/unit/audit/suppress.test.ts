import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { lineAt, parseComponent } from '../../../lib/audit/markup.js';
import { applySuppressions, parseDirectives } from '../../../lib/audit/suppress.js';
import { exitCodeFor, formatReport } from '../../../lib/audit/report.js';
import { loadConfig } from '../../../lib/audit/config.js';
import { runStatic } from '../../../lib/audit/run.js';
import type { ParsedComponent } from '../../../lib/audit/markup.js';
import type { Finding, StaticRule, Tier } from '../../../lib/audit/types.js';

/** A component parsed from lines, so a fixture reads as the markup an author would write. */
function fixture(lines: string[]): ParsedComponent {
  return parseComponent('Fixture.svelte', lines.join('\n'));
}

/** A finding positioned on the first occurrence of a needle, the way a real rule would report it. */
function findingAt(
  file: { file: string; source: string },
  needle: string,
  ruleId = 'type-scale',
  tier: Tier = 'error'
): Finding {
  const start = file.source.indexOf(needle);
  if (start === -1) throw new Error(`fixture has no ${needle}`);
  return {
    ruleId,
    tier,
    file: file.file,
    line: lineAt(file.source, start),
    start,
    end: start + needle.length,
    message: `${needle} resolves to no --cairn-type-* token`,
  };
}

const REASON = 'the editor canvas sets its own scale, ratified in the deviations ledger';

describe('parseDirectives', () => {
  it('reads the HTML comment form markup is annotated in', () => {
    const [directive] = parseDirectives(
      'Fixture.svelte',
      `<!-- cairn-audit-disable-next-line type-scale -- ${REASON} -->\n<span></span>\n`
    );
    expect(directive.ruleId).toBe('type-scale');
    expect(directive.reason).toBe(REASON);
    expect(directive.form).toBe('html');
    expect(directive.line).toBe(1);
  });

  it('reads the line-comment form a script or style block is annotated in', () => {
    const [directive] = parseDirectives(
      'Fixture.svelte',
      `<script>\n  // cairn-audit-disable-next-line motion-band -- ${REASON}\n</script>\n`
    );
    expect(directive.ruleId).toBe('motion-band');
    expect(directive.reason).toBe(REASON);
    expect(directive.form).toBe('line');
    expect(directive.line).toBe(2);
  });

  it('reads the block-comment form CSS is annotated in', () => {
    const [directive] = parseDirectives(
      'admin.css',
      `/* cairn-audit-disable-next-line token-colors -- ${REASON} */\n.x { color: #fff }\n`
    );
    expect(directive.ruleId).toBe('token-colors');
    expect(directive.reason).toBe(REASON);
    expect(directive.form).toBe('block');
  });

  it('ignores a comment that carries no directive', () => {
    expect(parseDirectives('Fixture.svelte', '<!-- a plain note -->\n// another\n')).toEqual([]);
  });

  it('records a directive that names no reason, and one that names no rule', () => {
    const directives = parseDirectives(
      'Fixture.svelte',
      '<!-- cairn-audit-disable-next-line type-scale -->\n<!-- cairn-audit-disable-next-line -->\n'
    );
    expect(directives.map((d) => [d.ruleId, d.reason])).toEqual([
      ['type-scale', null],
      [null, null],
    ]);
  });

  it('does not let a URL earlier on the line swallow the directive after it', () => {
    // The `//` of a protocol is not a comment. A single left-to-right scan that reads it as one
    // consumes the rest of the line, and the directive beside it disappears silently.
    const directives = parseDirectives(
      'Fixture.svelte',
      `<a href="https://example.com">d</a> <!-- cairn-audit-disable-next-line type-scale -- ${REASON} -->\n`
    );
    expect(directives.map((d) => d.ruleId)).toEqual(['type-scale']);
  });
});

describe('applySuppressions', () => {
  it('moves a matching finding out of the gating list and into the counted list', () => {
    const file = fixture([
      `<!-- cairn-audit-disable-next-line type-scale -- ${REASON} -->`,
      '<span class="text-[30px]">Title</span>',
    ]);
    const split = applySuppressions([findingAt(file, 'text-[30px]')], [file]);
    expect(split.findings).toEqual([]);
    expect(split.suppressed.map((f) => f.ruleId)).toEqual(['type-scale']);
    expect(exitCodeFor({ ...split, filesScanned: 1, ruleIds: ['type-scale'] })).toBe(0);
  });

  it('leaves a finding the directive does not cover alone', () => {
    const file = fixture([
      `<!-- cairn-audit-disable-next-line type-scale -- ${REASON} -->`,
      '<span class="text-[30px]">Title</span>',
      '<span class="text-[19px]">Other</span>',
    ]);
    const split = applySuppressions(
      [findingAt(file, 'text-[30px]'), findingAt(file, 'text-[19px]')],
      [file]
    );
    expect(split.findings.map((f) => f.line)).toEqual([3]);
    expect(split.suppressed.map((f) => f.line)).toEqual([2]);
  });

  it('reports a directive with no reason, and still counts the suppression', () => {
    const file = fixture([
      '<!-- cairn-audit-disable-next-line type-scale -->',
      '<span class="text-[30px]">Title</span>',
    ]);
    const split = applySuppressions([findingAt(file, 'text-[30px]')], [file]);
    expect(split.suppressed).toHaveLength(1);
    expect(split.findings).toHaveLength(1);
    expect(split.findings[0].tier).toBe('error');
    expect(split.findings[0].ruleId).toBe('suppression');
    expect(split.findings[0].line).toBe(1);
    expect(split.findings[0].message).toMatch(/reason/);
  });

  it('reports a directive that names no rule', () => {
    const file = fixture([
      '<!-- cairn-audit-disable-next-line -->',
      '<span class="text-[30px]">Title</span>',
    ]);
    const split = applySuppressions([findingAt(file, 'text-[30px]')], [file]);
    expect(split.suppressed).toEqual([]);
    expect(split.findings.map((f) => f.ruleId).sort()).toEqual(['suppression', 'type-scale']);
    expect(split.findings.find((f) => f.ruleId === 'suppression')?.message).toMatch(/name a rule/);
  });

  it('reports a dead directive, whose target raises no matching finding', () => {
    const file = fixture([
      `<!-- cairn-audit-disable-next-line type-scale -- ${REASON} -->`,
      '<span class="p-4">Title</span>',
    ]);
    const split = applySuppressions([], [file]);
    expect(split.suppressed).toEqual([]);
    expect(split.findings.map((f) => [f.ruleId, f.tier])).toEqual([['suppression', 'error']]);
    expect(split.findings[0].message).toMatch(/dead/);
  });

  it('does not suppress a finding from another rule, and calls the directive dead', () => {
    const file = fixture([
      `<!-- cairn-audit-disable-next-line gap-scale -- ${REASON} -->`,
      '<span class="text-[30px]">Title</span>',
    ]);
    const split = applySuppressions([findingAt(file, 'text-[30px]')], [file]);
    expect(split.suppressed).toEqual([]);
    expect(split.findings.map((f) => f.ruleId).sort()).toEqual(['suppression', 'type-scale']);
  });

  // The Phase 1 amendment. This is the shape of cairn's own EditPage document title: the directive
  // sits above `<input`, and the class attribute it must cover lands three lines further down. A
  // line-literal reading scores one correctly annotated site as two errors, a dead directive and an
  // unsuppressed finding.
  const multiline = [
    '<div>',
    `  <!-- cairn-audit-disable-next-line type-scale -- ${REASON} -->`,
    '  <input',
    '    type="text"',
    '    class="cairn-doc-title text-[1.875rem] font-bold"',
    '  />',
    '</div>',
  ];

  it('covers a multi-line element whose finding lands below the directive plus one', () => {
    const file = fixture(multiline);
    const finding = findingAt(file, 'text-[1.875rem]');
    expect(finding.line).toBe(5);
    const split = applySuppressions([finding], [file]);
    expect(split.findings).toEqual([]);
    expect(split.suppressed).toHaveLength(1);
  });

  it('does not call that directive dead', () => {
    const file = fixture(multiline);
    const split = applySuppressions([findingAt(file, 'text-[1.875rem]')], [file]);
    expect(split.findings).toEqual([]);
  });

  it('resolves past the whitespace text between a directive and its element', () => {
    const file = fixture([
      '<div>',
      '',
      `  <!-- cairn-audit-disable-next-line type-scale -- ${REASON} -->`,
      '',
      '  <span class="text-[30px]">Title</span>',
      '</div>',
    ]);
    const split = applySuppressions([findingAt(file, 'text-[30px]')], [file]);
    expect(split.findings).toEqual([]);
    expect(split.suppressed).toHaveLength(1);
  });

  it('lets two directives stack above one element', () => {
    const file = fixture([
      `<!-- cairn-audit-disable-next-line type-scale -- ${REASON} -->`,
      `<!-- cairn-audit-disable-next-line gap-scale -- ${REASON} -->`,
      '<span class="text-[30px] p-[7px]">Title</span>',
    ]);
    const split = applySuppressions(
      [findingAt(file, 'text-[30px]'), findingAt(file, 'p-[7px]', 'gap-scale')],
      [file]
    );
    expect(split.findings).toEqual([]);
    expect(split.suppressed.map((f) => f.ruleId).sort()).toEqual(['gap-scale', 'type-scale']);
  });

  it('resolves a script-block directive against its own lines, never a template node', () => {
    const file = fixture([
      '<script>',
      `  // cairn-audit-disable-next-line motion-band -- ${REASON}`,
      '  const duration = 0;',
      '</script>',
      '',
      '<div class="p-4"></div>',
    ]);
    const split = applySuppressions([findingAt(file, 'duration = 0', 'motion-band')], [file]);
    expect(split.findings).toEqual([]);
    expect(split.suppressed).toHaveLength(1);
  });

  it('covers the whole rule a CSS block-comment directive sits above', () => {
    const sheet = {
      file: 'src/lib/components/cairn-admin.css',
      source: [
        `/* cairn-audit-disable-next-line token-colors -- ${REASON} */`,
        '.cairn-print {',
        '  color: #ffffff;',
        '}',
      ].join('\n'),
    };
    const split = applySuppressions([findingAt(sheet, '#ffffff', 'token-colors')], [sheet]);
    expect(split.findings).toEqual([]);
    expect(split.suppressed).toHaveLength(1);
  });

  it('never suppresses its own findings', () => {
    // A directive naming `suppression` would silence the dead-directive and missing-reason errors,
    // which is the one hole that would make every other guarantee optional.
    const file = fixture([
      `<!-- cairn-audit-disable-next-line suppression -- ${REASON} -->`,
      '<!-- cairn-audit-disable-next-line type-scale -->',
      '<span class="text-[30px]">Title</span>',
    ]);
    const split = applySuppressions([findingAt(file, 'text-[30px]')], [file]);
    expect(split.findings.filter((f) => f.ruleId === 'suppression')).not.toEqual([]);
  });
});

describe('runStatic with suppressions', () => {
  let root: string;

  beforeAll(() => {
    root = mkdtempSync(join(tmpdir(), 'cairn-audit-suppress-'));
    mkdirSync(join(root, 'dist/components'), { recursive: true });
    mkdirSync(join(root, 'src/routes/admin'), { recursive: true });
    writeFileSync(join(root, 'dist/components/cairn-admin.css'), '.type-body { font-size: 1rem }');
    writeFileSync(
      join(root, 'src/routes/admin/+page.svelte'),
      [
        `<!-- cairn-audit-disable-next-line probe -- ${REASON} -->`,
        '<div',
        '  class="text-[30px]"',
        '></div>',
        '',
      ].join('\n')
    );
  });

  afterAll(() => {
    rmSync(root, { recursive: true, force: true });
  });

  /** A rule that reports one error per class token, the shape a real static rule reports in. */
  const probe: StaticRule = {
    id: 'probe',
    tier: 'error',
    check: (ctx) =>
      ctx.files.flatMap((file) =>
        file.classTokens.map((token) => ({
          ruleId: 'probe',
          tier: 'error' as const,
          file: file.file,
          line: token.line,
          start: token.start,
          end: token.end,
          message: `saw ${token.value}`,
        }))
      ),
  };

  it('splits the suppressed findings out of the gating list and totals them loudly', () => {
    const report = runStatic(loadConfig(root), [probe]);
    expect(report.findings).toEqual([]);
    expect(report.suppressed.map((f) => f.message)).toEqual(['saw text-[30px]']);
    expect(exitCodeFor(report)).toBe(0);
    expect(formatReport(report)).toMatch(/1 suppressed/);
  });
});
