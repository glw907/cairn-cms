import { describe, it, expect } from 'vitest';
import {
  IMPORT_LINE,
  formatCheckReport,
  gitignoreExcludesClaude,
  hasFixes,
  judgeCheckCairnScript,
  judgeSourceExclusion,
  judgeTree,
  runGuidanceCheck,
  type ReadFile,
} from '../../../lib/guidance/check.js';
import { flattenGuidanceTree, type GuidanceSource } from '../../../lib/guidance/install.js';

const source: GuidanceSource = {
  skills: { foo: { 'SKILL.md': 'core' } },
  agents: { 'cairn-extension-reviewer.md': 'agent' },
  fragment: 'fragment text',
  version: '1.0.0',
  snippets: {
    'check-cairn.json': '{"scripts":{"check:cairn":"cairn-audit"}}',
    'cairn-audit.config.json': '{}',
    'check.yml': 'name: check\n',
  },
  refused: [],
};

function readFileFrom(files: Record<string, string>): ReadFile {
  return async (relPath) => files[relPath] ?? null;
}

describe('judgeTree', () => {
  const packaged = flattenGuidanceTree(source);

  it('reports missing when nothing is installed', () => {
    expect(judgeTree(null, packaged)).toBe('missing');
  });

  it('reports stale when the installed tree hashes differently', () => {
    expect(judgeTree({ '.claude/skills/foo/SKILL.md': 'stale' }, packaged)).toBe('stale');
  });

  it('reads fresh when only the stamped VERSION differs', () => {
    expect(judgeTree({ ...packaged, '.claude/cairn/VERSION': '9.9.9' }, packaged)).toBe('fresh');
  });

  it('still reads stale when a real guidance file differs beside a differing VERSION', () => {
    expect(
      judgeTree({ ...packaged, '.claude/cairn/VERSION': '9.9.9', '.claude/cairn/CLAUDE.md': 'edited' }, packaged)
    ).toBe('stale');
  });

  it('reports fresh when the installed tree matches byte for byte', () => {
    expect(judgeTree({ ...packaged }, packaged)).toBe('fresh');
  });
});

describe('gitignoreExcludesClaude', () => {
  it('matches a bare .claude line', () => {
    expect(gitignoreExcludesClaude('node_modules\n.claude\n')).toBe(true);
  });

  it('matches a rooted /.claude/ line', () => {
    expect(gitignoreExcludesClaude('/.claude/\n')).toBe(true);
  });

  it('does not match an unrelated line', () => {
    expect(gitignoreExcludesClaude('node_modules\ndist\n')).toBe(false);
  });
});

describe('judgeSourceExclusion', () => {
  const tw = '@import "tailwindcss";\n';

  it('passes on a gitignored .claude without reading any CSS', async () => {
    const result = await judgeSourceExclusion(readFileFrom({ '.gitignore': '.claude\n' }), ['src/admin.css']);
    expect(result.status).toBe('excluded');
  });

  it('fails ./.claude in src/admin.css, which resolves to src/.claude, and names the right line', async () => {
    const result = await judgeSourceExclusion(
      readFileFrom({ 'src/admin.css': `${tw}@source not "./.claude";\n` }),
      ['src/admin.css']
    );
    expect(result.status).toBe('not-excluded');
    expect(result.line).toBe('@source not "../.claude";');
  });

  it('passes ../.claude in src/admin.css', async () => {
    const result = await judgeSourceExclusion(
      readFileFrom({ 'src/admin.css': `${tw}@source not "../.claude";\n` }),
      ['src/admin.css']
    );
    expect(result.status).toBe('excluded');
  });

  it('passes ../../.claude in src/chassis/tokens.css', async () => {
    const result = await judgeSourceExclusion(
      readFileFrom({ 'src/chassis/tokens.css': `${tw}@source not "../../.claude";\n` }),
      ['src/chassis/tokens.css']
    );
    expect(result.status).toBe('excluded');
  });

  it.each([
    ['@import "tailwindcss" source("../src");', 'excluded'],
    ["@import 'tailwindcss' source('../src');", 'excluded'],
    ['@import "tailwindcss" source("../../x");', 'excluded'],
    ['@import "tailwindcss" source("..");', 'not-excluded'],
    ['@import "tailwindcss" source("../..");', 'not-excluded'],
    ['@import "tailwindcss" source(none);\n@import "tailwindcss/utilities" layer(utilities);', 'not-excluded'],
  ])('judges %j as %s from src/app.css', async (css, status) => {
    const result = await judgeSourceExclusion(readFileFrom({ 'src/app.css': `${css}\n` }), ['src/app.css']);
    expect(result.status).toBe(status);
  });

  it('fails a single-quoted import with no exclusion and names the line for its depth', async () => {
    const result = await judgeSourceExclusion(
      readFileFrom({ 'src/chassis/tokens.css': "@import 'tailwindcss';\n" }),
      ['src/chassis/tokens.css']
    );
    expect(result).toEqual({
      status: 'not-excluded',
      entry: 'src/chassis/tokens.css',
      line: '@source not "../../.claude";',
    });
  });

  it('counts an exclusion in another listed file for an entry', async () => {
    const result = await judgeSourceExclusion(
      readFileFrom({
        'src/chassis/tokens.css': tw,
        'src/theme/theme.css': '@source not "../../.claude";\n',
      }),
      ['src/chassis/tokens.css', 'src/theme/theme.css']
    );
    expect(result.status).toBe('excluded');
  });

  it('needs no exclusion for a utilities import with source(none)', async () => {
    const result = await judgeSourceExclusion(
      readFileFrom({
        'src/admin.css': '@import "tailwindcss/utilities.css" layer(utilities) source(none);\n',
      }),
      ['src/admin.css']
    );
    expect(result.status).toBe('excluded');
  });

  it('does not treat tailwindcss/theme.css alone as an entry', async () => {
    const result = await judgeSourceExclusion(
      readFileFrom({ 'src/app.css': '@import "tailwindcss/theme.css";\n' }),
      ['src/app.css']
    );
    expect(result.status).toBe('excluded');
  });

  it('ignores a @source not inside a CSS comment', async () => {
    const result = await judgeSourceExclusion(
      readFileFrom({ 'src/admin.css': `${tw}/* @source not "../.claude"; */\n` }),
      ['src/admin.css']
    );
    expect(result.status).toBe('not-excluded');
  });

  it('passes when there is no entry', async () => {
    const result = await judgeSourceExclusion(readFileFrom({}), []);
    expect(result.status).toBe('excluded');
  });
});

function greenFiles(): Record<string, string> {
  return {
    ...flattenGuidanceTree(source),
    'CLAUDE.md': `see ${IMPORT_LINE}`,
    'package.json': JSON.stringify({ scripts: { 'check:cairn': 'cairn-audit' } }),
    'cairn-audit.config.json': '{}',
    '.github/workflows/check.yml': 'name: check\n',
    '.gitignore': '.claude\n',
  };
}

describe('judgeCheckCairnScript', () => {
  it('is false with no package.json', () => {
    expect(judgeCheckCairnScript(null)).toBe(false);
  });

  it('is false with unparseable JSON', () => {
    expect(judgeCheckCairnScript('not json')).toBe(false);
  });

  it('is true when scripts declares check:cairn', () => {
    expect(judgeCheckCairnScript(JSON.stringify({ scripts: { 'check:cairn': 'cairn-audit' } }))).toBe(true);
  });
});

describe('runGuidanceCheck', () => {
  it('on a fresh tree with snippets present reports seven green lines', async () => {
    const packaged = flattenGuidanceTree(source);
    const files: Record<string, string> = {
      ...packaged,
      'CLAUDE.md': `see ${IMPORT_LINE}`,
      'package.json': JSON.stringify({ scripts: { 'check:cairn': 'cairn-audit' } }),
      'cairn-audit.config.json': '{}',
      '.github/workflows/check.yml': 'name: check\n',
      '.gitignore': '.claude\n',
    };
    const report = await runGuidanceCheck(readFileFrom(files), source, []);

    expect(report.tree.status).toBe('fresh');
    expect(report.importLine.present).toBe(true);
    expect(report.checkCairnScript.present).toBe(true);
    expect(report.auditConfig.present).toBe(true);
    expect(report.ciWorkflow.present).toBe(true);
    expect(report.sourceExclusion.status).toBe('excluded');
    expect(report.orig.paths).toEqual([]);
    // Every item is present, so none of the not-present snippet bodies appear.
    const formatted = formatCheckReport(report);
    expect(formatted).not.toContain(source.snippets['check-cairn.json']);
    expect(formatted).not.toContain(source.snippets['cairn-audit.config.json']);
    expect(formatted).not.toContain(source.snippets['check.yml']);
  });

  it('prints the exact import line when CLAUDE.md is missing it', async () => {
    const report = await runGuidanceCheck(readFileFrom({}), source, []);
    expect(report.importLine.detail).toContain(IMPORT_LINE);
  });

  it('prints the packaged snippet body under check:cairn, cairn-audit.config.json, and the CI workflow when each is missing', async () => {
    const report = await runGuidanceCheck(readFileFrom({}), source, []);
    expect(report.checkCairnScript.detail).toContain(source.snippets['check-cairn.json']);
    expect(report.auditConfig.detail).toContain(source.snippets['cairn-audit.config.json']);
    expect(report.ciWorkflow.detail).toContain(source.snippets['check.yml']);
  });

  it('prints the exact exclusion line and the entry when the Tailwind entry lacks one', async () => {
    const report = await runGuidanceCheck(
      readFileFrom({ 'src/chassis/tokens.css': '@import "tailwindcss";\n' }),
      source,
      ['src/chassis/tokens.css']
    );
    expect(report.sourceExclusion.ok).toBe(false);
    expect(report.sourceExclusion.detail).toContain('@source not "../../.claude";');
    expect(report.sourceExclusion.detail).toContain('src/chassis/tokens.css');
  });

  it('reports every present .orig file', async () => {
    const packaged = flattenGuidanceTree(source);
    const files: Record<string, string> = {
      ...packaged,
      '.claude/skills/foo/SKILL.md.orig': 'old content',
    };
    const report = await runGuidanceCheck(readFileFrom(files), source, []);
    expect(report.orig.paths).toContain('.claude/skills/foo/SKILL.md.orig');
  });

  it('lists a MANIFEST path the current package no longer ships as removable', async () => {
    const packaged = flattenGuidanceTree(source);
    const files: Record<string, string> = {
      ...packaged,
      '.claude/cairn/MANIFEST': '.claude/skills/foo/SKILL.md\n.claude/skills/retired/SKILL.md\n',
    };
    const report = await runGuidanceCheck(readFileFrom(files), source, []);
    expect(report.tree.removable).toContain('.claude/skills/retired/SKILL.md');
  });

  it('never prints a MANIFEST line that is absolute or traverses out of .claude as removable', async () => {
    const packaged = flattenGuidanceTree(source);
    const files: Record<string, string> = {
      ...packaged,
      '.claude/cairn/MANIFEST': '/etc/passwd\n../../x\n.claude/skills/retired/SKILL.md\n',
    };
    const report = await runGuidanceCheck(readFileFrom(files), source, []);
    expect(report.tree.removable).toEqual(['.claude/skills/retired/SKILL.md']);
    expect(report.tree.detail).not.toContain('/etc/passwd');
    expect(report.tree.detail).not.toContain('../../x');
  });
});

describe('hasFixes', () => {
  it('is true when the tree is stale', async () => {
    const packaged = flattenGuidanceTree(source);
    const report = await runGuidanceCheck(readFileFrom({ ...packaged, '.claude/skills/foo/SKILL.md': 'edited' }), source, []);
    expect(hasFixes(report)).toBe(true);
  });

  it('is true when the tree is missing', async () => {
    const report = await runGuidanceCheck(readFileFrom({}), source, []);
    expect(hasFixes(report)).toBe(true);
  });

  it('is true when a leftover .orig is present beside an otherwise green report', async () => {
    const report = await runGuidanceCheck(readFileFrom({ ...greenFiles(), '.claude/skills/foo/SKILL.md.orig': 'old' }), source, []);
    expect(report.orig.ok).toBe(false);
    expect(hasFixes(report)).toBe(true);
  });

  it('is false when every line passes', async () => {
    const report = await runGuidanceCheck(readFileFrom(greenFiles()), source, []);
    expect(hasFixes(report)).toBe(false);
  });
});

describe('formatCheckReport', () => {
  it('prefixes each of seven lines PASS or FIX and ends with the count after the recommendations', async () => {
    const report = await runGuidanceCheck(readFileFrom({ ...greenFiles(), 'CLAUDE.md': 'no import' }), source, []);
    const lines = formatCheckReport(report).split('\n');
    expect(lines.slice(0, 7).filter((l) => l.startsWith('PASS  ')).length).toBe(6);
    expect(lines[1]).toMatch(/^FIX {3}CLAUDE\.md is missing the import line/);
    expect(lines.indexOf('Recommendations (not gated):')).toBeGreaterThan(6);
    expect(lines.at(-1)).toBe('6 passed, 1 to fix');
  });

  it('keeps a snippet body under its FIX line', async () => {
    const report = await runGuidanceCheck(readFileFrom({}), source, []);
    const text = formatCheckReport(report);
    expect(text).toContain(`${source.snippets['check.yml']}`);
    expect(text.endsWith('2 passed, 5 to fix')).toBe(true);
  });
});
