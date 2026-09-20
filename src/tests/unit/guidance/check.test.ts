import { describe, it, expect } from 'vitest';
import {
  IMPORT_LINE,
  SOURCE_EXCLUSION_LINE,
  formatCheckReport,
  gitignoreExcludesClaude,
  isStaleUnderStrict,
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
  it('passes on a gitignored .claude without reading any CSS candidate', async () => {
    const result = await judgeSourceExclusion(readFileFrom({ '.gitignore': '.claude\n' }));
    expect(result.status).toBe('excluded');
  });

  it('reads the exclusion line off the scaffold\'s admin.css when .claude is not gitignored', async () => {
    const result = await judgeSourceExclusion(
      readFileFrom({ '.gitignore': 'dist\n', 'src/admin.css': `@source "./routes/admin";\n${SOURCE_EXCLUSION_LINE}\n` })
    );
    expect(result.status).toBe('excluded');
  });

  it('reports not-excluded when the entry has @source directives but no exclusion', async () => {
    const result = await judgeSourceExclusion(
      readFileFrom({ 'src/admin.css': '@source "./routes/admin";\n' })
    );
    expect(result.status).toBe('not-excluded');
  });

  it('reports unknown and names every path checked when no entry can be identified', async () => {
    const result = await judgeSourceExclusion(readFileFrom({}));
    expect(result.status).toBe('unknown');
    expect(result.checked).toContain('.gitignore');
    expect(result.checked).toContain('src/admin.css');
  });
});

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
    const report = await runGuidanceCheck(readFileFrom(files), source);

    expect(report.tree.status).toBe('fresh');
    expect(report.importLine.present).toBe(true);
    expect(report.checkCairnScript.present).toBe(true);
    expect(report.auditConfig.present).toBe(true);
    expect(report.ciWorkflow.present).toBe(true);
    expect(report.sourceExclusion.status).toBe('excluded');
    expect(report.orig.paths).toEqual([]);
    // Every item is present, so none of the not-present snippet bodies appear.
    expect(formatCheckReport(report)).not.toContain(source.snippets['check-cairn.json']);
  });

  it('prints the exact import line when CLAUDE.md is missing it', async () => {
    const report = await runGuidanceCheck(readFileFrom({}), source);
    expect(report.importLine.detail).toContain(IMPORT_LINE);
  });

  it('prints the packaged snippet body under check:cairn, cairn-audit.config.json, and the CI workflow when each is missing', async () => {
    const report = await runGuidanceCheck(readFileFrom({}), source);
    expect(report.checkCairnScript.detail).toContain(source.snippets['check-cairn.json']);
    expect(report.auditConfig.detail).toContain(source.snippets['cairn-audit.config.json']);
    expect(report.ciWorkflow.detail).toContain(source.snippets['check.yml']);
  });

  it('prints the exclusion line with placement guidance when no Tailwind entry can be identified', async () => {
    const report = await runGuidanceCheck(readFileFrom({}), source);
    expect(report.sourceExclusion.status).toBe('unknown');
    expect(report.sourceExclusion.detail).toContain(SOURCE_EXCLUSION_LINE);
    expect(report.sourceExclusion.detail).toContain('.gitignore');
    expect(report.sourceExclusion.detail).toContain('src/admin.css');
  });

  it('reports every present .orig file', async () => {
    const packaged = flattenGuidanceTree(source);
    const files: Record<string, string> = {
      ...packaged,
      '.claude/skills/foo/SKILL.md.orig': 'old content',
    };
    const report = await runGuidanceCheck(readFileFrom(files), source);
    expect(report.orig.paths).toContain('.claude/skills/foo/SKILL.md.orig');
  });

  it('lists a MANIFEST path the current package no longer ships as removable', async () => {
    const packaged = flattenGuidanceTree(source);
    const files: Record<string, string> = {
      ...packaged,
      '.claude/cairn/MANIFEST': '.claude/skills/foo/SKILL.md\n.claude/skills/retired/SKILL.md\n',
    };
    const report = await runGuidanceCheck(readFileFrom(files), source);
    expect(report.tree.removable).toContain('.claude/skills/retired/SKILL.md');
  });
});

describe('isStaleUnderStrict', () => {
  it('is true when the tree is stale', async () => {
    const packaged = flattenGuidanceTree(source);
    const report = await runGuidanceCheck(readFileFrom({ ...packaged, '.claude/skills/foo/SKILL.md': 'edited' }), source);
    expect(isStaleUnderStrict(report)).toBe(true);
  });

  it('is true when the tree is missing', async () => {
    const report = await runGuidanceCheck(readFileFrom({}), source);
    expect(isStaleUnderStrict(report)).toBe(true);
  });

  it('is false when the tree is fresh', async () => {
    const packaged = flattenGuidanceTree(source);
    const report = await runGuidanceCheck(readFileFrom(packaged), source);
    expect(isStaleUnderStrict(report)).toBe(false);
  });
});

describe('formatCheckReport', () => {
  it('renders all seven lines plus the recommendation block', async () => {
    const packaged = flattenGuidanceTree(source);
    const report = await runGuidanceCheck(readFileFrom(packaged), source);
    const text = formatCheckReport(report);
    expect(text).toContain('DaisyUI');
    expect(text.split('\n').filter(Boolean).length).toBeGreaterThanOrEqual(7);
  });
});
