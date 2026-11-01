import { describe, it, expect } from 'vitest';
import { parseArgs, buildSteps } from '../../../scripts/checks/docs-gate.mjs';

describe('parseArgs', () => {
  it('defaults page to null when no flag is given', () => {
    expect(parseArgs([])).toEqual({ page: null, prebuilt: false });
  });

  it('parses --prebuilt as a flag that takes no value', () => {
    expect(parseArgs(['--prebuilt', '--page', 'docs/a.md'])).toEqual({
      page: 'docs/a.md',
      prebuilt: true,
    });
  });
});

describe('buildSteps', () => {
  const LABELS = [
    'check:docs',
    'check:vale',
    'check:vale-rules',
    'check:leaks',
    'check:symbols',
    'check:snippets',
    'check:transcripts',
    'check:visuals',
    'check:editor-quotes',
    'check:readiness',
    'check:tool-conditions',
    'check:options',
    'check:tiers',
    'check:tellgrader',
  ];

  it('runs exactly the docs-gate list from the spec, in order', () => {
    const steps = buildSteps({ page: null });
    expect(steps.map((step) => step.label)).toEqual(LABELS);
  });

  it('runs every component directly (node or vale), never through an "npm run check:*" wrapper, since the runner builds dist once itself', () => {
    const steps = buildSteps({ page: null });
    for (const step of steps) expect(step.command).not.toBe('npm');
  });

  it('scopes Vale to the fixed default path list when no --page is given', () => {
    const steps = buildSteps({ page: null });
    const vale = steps.find((step) => step.label === 'check:vale');
    expect(vale?.args).toEqual(['--minAlertLevel=error', 'docs', 'README.md', 'examples/showcase/README.md']);
  });

  it('scopes Vale to only the given --page path', () => {
    const steps = buildSteps({ page: 'docs/editors/write-in-the-editor.md' });
    const vale = steps.find((step) => step.label === 'check:vale');
    expect(vale?.args).toEqual(['--minAlertLevel=error', 'docs/editors/write-in-the-editor.md']);
  });

  it('runs the Cairn rules\' vale test cases over both test files under the fixture config in tree mode', () => {
    const steps = buildSteps({ page: null });
    const rules = steps.find((step) => step.label === 'check:vale-rules');
    expect(rules?.command).toBe('vale');
    expect(rules?.args).toEqual([
      '--config=.vale/tests/vale.ini',
      'test',
      '.vale/styles/Cairn/Headings.test.yml',
      '.vale/styles/Cairn/ProseProcedure.test.yml',
    ]);
  });

  it('leaves the rule test cases out of a page-scoped run', () => {
    const steps = buildSteps({ page: 'docs/editors/write-in-the-editor.md' });
    expect(steps.map((step) => step.label)).not.toContain('check:vale-rules');
  });

  it('scopes check:tellgrader to only the given --page path and scans the tree otherwise', () => {
    const unscoped = buildSteps({ page: null }).find((step) => step.label === 'check:tellgrader');
    expect(unscoped?.args).toEqual(['scripts/checks/check-tellgrader.mjs']);
    const scoped = buildSteps({ page: 'docs/editors/write-in-the-editor.md' }).find(
      (step) => step.label === 'check:tellgrader',
    );
    expect(scoped?.args).toEqual(['scripts/checks/check-tellgrader.mjs', 'docs/editors/write-in-the-editor.md']);
  });

  it('leaves every other component unscoped by --page', () => {
    const scoped = buildSteps({ page: 'docs/editors/write-in-the-editor.md' });
    const unscoped = buildSteps({ page: null });
    for (const label of LABELS) {
      if (['check:vale', 'check:vale-rules', 'check:tellgrader'].includes(label)) continue;
      const scopedStep = scoped.find((step) => step.label === label);
      const unscopedStep = unscoped.find((step) => step.label === label);
      expect(scopedStep).toEqual(unscopedStep);
    }
  });
});
