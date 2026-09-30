import { describe, it, expect } from 'vitest';
import { parseArgs, buildSteps } from '../../../scripts/checks/docs-gate.mjs';

describe('parseArgs', () => {
  it('defaults page and brief to null when neither flag is given', () => {
    expect(parseArgs([])).toEqual({ page: null, brief: null });
  });

  it('parses --page and --brief together', () => {
    expect(parseArgs(['--page', 'docs/extend/choose-an-ai-posture.md', '--brief', 'docs/internal/briefs/extend/choose-an-ai-posture.json'])).toEqual({
      page: 'docs/extend/choose-an-ai-posture.md',
      brief: 'docs/internal/briefs/extend/choose-an-ai-posture.json',
    });
  });
});

describe('buildSteps', () => {
  const LABELS = [
    'check:docs',
    'check:vale',
    'check:vale-rules',
    'check:facts',
    'check:provenance',
    'check:symbols',
    'check:snippets',
    'check:transcripts',
    'check:visuals',
    'check:arm-indexes',
    'check:editor-quotes',
    'check:readiness',
    'check:tool-conditions',
    'check:target-stack',
    'check:reference',
    'check:reference:signatures',
  ];

  it('runs exactly the docs-gate list from the spec, in order', () => {
    const steps = buildSteps({ page: null, brief: null });
    expect(steps.map((step) => step.label)).toEqual(LABELS);
  });

  it('runs every component directly (node or vale), never through an "npm run check:*" wrapper, since the runner builds dist once itself', () => {
    const steps = buildSteps({ page: null, brief: null });
    for (const step of steps) expect(step.command).not.toBe('npm');
  });

  it('scopes Vale to the fixed default path list when no --page is given', () => {
    const steps = buildSteps({ page: null, brief: null });
    const vale = steps.find((step) => step.label === 'check:vale');
    expect(vale?.args).toEqual(['--minAlertLevel=error', 'docs', 'README.md', 'examples/showcase/README.md']);
  });

  it('scopes Vale to only the given --page path', () => {
    const steps = buildSteps({ page: 'docs/extend/choose-an-ai-posture.md', brief: null });
    const vale = steps.find((step) => step.label === 'check:vale');
    expect(vale?.args).toEqual(['--minAlertLevel=error', 'docs/extend/choose-an-ai-posture.md']);
  });

  it('runs the Cairn rules\' vale test cases over both test files under the fixture config in tree mode', () => {
    const steps = buildSteps({ page: null, brief: null });
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
    const steps = buildSteps({ page: 'docs/extend/choose-an-ai-posture.md', brief: null });
    expect(steps.map((step) => step.label)).not.toContain('check:vale-rules');
  });

  it('runs check:provenance with no brief argument (whole-tree mode) when no --brief is given', () => {
    const steps = buildSteps({ page: null, brief: null });
    const provenance = steps.find((step) => step.label === 'check:provenance');
    expect(provenance?.args).toEqual(['scripts/checks/check-provenance.mjs']);
  });

  it('scopes check:provenance to only the given --brief path', () => {
    const steps = buildSteps({ page: null, brief: 'docs/internal/briefs/extend/choose-an-ai-posture.json' });
    const provenance = steps.find((step) => step.label === 'check:provenance');
    expect(provenance?.args).toEqual([
      'scripts/checks/check-provenance.mjs',
      'docs/internal/briefs/extend/choose-an-ai-posture.json',
    ]);
  });

  it('leaves every other component unscoped by --page or --brief', () => {
    const scoped = buildSteps({ page: 'docs/extend/choose-an-ai-posture.md', brief: 'docs/internal/briefs/extend/choose-an-ai-posture.json' });
    const unscoped = buildSteps({ page: null, brief: null });
    for (const label of LABELS) {
      if (label === 'check:vale' || label === 'check:vale-rules' || label === 'check:provenance') continue;
      const scopedStep = scoped.find((step) => step.label === label);
      const unscopedStep = unscoped.find((step) => step.label === label);
      expect(scopedStep).toEqual(unscopedStep);
    }
  });
});
