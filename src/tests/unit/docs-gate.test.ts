import { describe, it, expect } from 'vitest';
import { parseArgs, groupSteps } from '../../../scripts/checks/run.mjs';
import { CHECKS } from '../../../scripts/checks/registry.mjs';

/** The docs-gate group's steps, narrowed to `page` when one is given. */
function docsGate(page: string | null) {
  return groupSteps(CHECKS, 'docs-gate', [], { page });
}

describe('parseArgs', () => {
  it('defaults page to null when no flag is given', () => {
    expect(parseArgs(['docs-gate'])).toMatchObject({ group: true, name: 'docs-gate', page: null });
  });

  it('refuses --prebuilt, which nothing calls', () => {
    expect(() => parseArgs(['docs-gate', '--prebuilt', '--page', 'docs/a.md'])).toThrow(/--prebuilt/);
  });
});

describe('the docs-gate group', () => {
  const LABELS = [
    'check:docs',
    'check:vale',
    'check:vale-rules',
    'check:leaks',
    'check:symbols',
    'check:snippets',
    'check:visuals',
    'check:editor-quotes',
    'check:readiness',
    'check:site-record-page',
    'check:options',
    'check:tiers',
    'check:tellgrader',
  ];

  it('runs exactly the docs-gate list from the spec, in order', () => {
    expect(docsGate(null).map((step) => step.name)).toEqual(LABELS);
  });

  it('runs every component directly (node or vale), never through an "npm run check:*" wrapper, since the runner builds dist once itself', () => {
    for (const step of docsGate(null)) expect(step.command, step.name).not.toMatch(/^npm /);
  });

  it('scopes Vale to the fixed default path list when no --page is given', () => {
    const vale = docsGate(null).find((step) => step.name === 'check:vale');
    expect(vale?.command).toBe('vale --minAlertLevel=error');
    expect(vale?.targets).toEqual(['docs', 'README.md', 'examples/showcase/README.md']);
  });

  it('scopes Vale to only the given --page path', () => {
    const vale = docsGate('docs/editors/write-in-the-editor.md').find((step) => step.name === 'check:vale');
    expect(vale?.command).toBe('vale --minAlertLevel=error');
    expect(vale?.targets).toEqual(['docs/editors/write-in-the-editor.md']);
  });

  it('runs the Cairn rules\' vale test cases over both test files under the fixture config in tree mode', () => {
    const rules = docsGate(null).find((step) => step.name === 'check:vale-rules');
    expect(rules?.command).toBe(
      'vale --config=.vale/tests/vale.ini test .vale/styles/Cairn/Headings.test.yml .vale/styles/Cairn/ProseProcedure.test.yml',
    );
    expect(rules?.targets).toEqual([]);
  });

  it('leaves the rule test cases out of a page-scoped run', () => {
    const steps = docsGate('docs/editors/write-in-the-editor.md');
    expect(steps.map((step) => step.name)).not.toContain('check:vale-rules');
  });

  it('scopes check:tellgrader to only the given --page path and scans the tree otherwise', () => {
    const unscoped = docsGate(null).find((step) => step.name === 'check:tellgrader');
    expect(unscoped?.command).toBe('node scripts/checks/check-tellgrader.mjs');
    expect(unscoped?.targets).toEqual([]);
    const scoped = docsGate('docs/editors/write-in-the-editor.md').find((step) => step.name === 'check:tellgrader');
    expect(scoped?.command).toBe('node scripts/checks/check-tellgrader.mjs');
    expect(scoped?.targets).toEqual(['docs/editors/write-in-the-editor.md']);
  });

  it('leaves every other component unscoped by --page', () => {
    const scoped = docsGate('docs/editors/write-in-the-editor.md');
    const unscoped = docsGate(null);
    for (const label of LABELS) {
      if (['check:vale', 'check:vale-rules', 'check:tellgrader'].includes(label)) continue;
      const scopedStep = scoped.find((step) => step.name === label);
      const unscopedStep = unscoped.find((step) => step.name === label);
      expect(scopedStep).toEqual(unscopedStep);
    }
  });
});
