import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { CLOSE_COMPONENTS, closeSteps } from '../../../scripts/checks/close-prebuilt.mjs';
import { buildSteps } from '../../../scripts/checks/docs-gate.mjs';

const PACKAGE_JSON = JSON.parse(readFileSync(resolve(process.cwd(), 'package.json'), 'utf8')) as {
  scripts: Record<string, string>;
};

/** The shell commands of every single-line `run:` step in a workflow file. */
function runCommands(workflow: string): string[] {
  const text = readFileSync(resolve(process.cwd(), '.github/workflows', workflow), 'utf8');
  return [...text.matchAll(/^\s*(?:-\s+)?run:\s+(\S.*?)\s*$/gm)].map((match) => match[1]);
}

const WORKFLOW_COMMANDS = [...runCommands('test.yml'), ...runCommands('design.yml')];
const DOCS_GATE_LABELS = new Set(buildSteps({ page: null, brief: null }).map((step) => step.label));

/**
 * Whether CI runs a component: as its own workflow step, or as a check inside the docs gate when
 * a workflow step runs the docs gate.
 * @param component - One entry of the exported component list.
 * @param label - That component's label in the runner.
 */
function runsOnCi(component: string, label: string): boolean {
  if (WORKFLOW_COMMANDS.includes(component)) return true;
  return WORKFLOW_COMMANDS.includes('npm run check:docs-gate') && DOCS_GATE_LABELS.has(label);
}

describe('check:close components run on CI', () => {
  const steps = closeSteps(PACKAGE_JSON.scripts);

  it('names a workflow step or a docs-gate check for every component', () => {
    const missing = CLOSE_COMPONENTS.filter((component, index) => !runsOnCi(component, steps[index].label));
    expect(missing).toEqual([]);
  });

  it('reads the workflow steps it judges from, so an empty read cannot pass', () => {
    expect(WORKFLOW_COMMANDS).toContain('npm run check:comments');
    expect(WORKFLOW_COMMANDS).toContain('npm run check:public-tokens');
    expect(DOCS_GATE_LABELS.has('check:vale')).toBe(true);
  });
});
