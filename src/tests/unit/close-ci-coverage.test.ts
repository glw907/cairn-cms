import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { CHECKS, GROUPS } from '../../../scripts/checks/registry.mjs';

type Row = (typeof CHECKS)[number];

/** The shell commands of every single-line `run:` step in a workflow file. */
function runCommands(workflow: string): string[] {
  const text = readFileSync(resolve(process.cwd(), '.github/workflows', workflow), 'utf8');
  return [...text.matchAll(/^\s*(?:-\s+)?run:\s+(\S.*?)\s*$/gm)].map((match) => match[1]);
}

const WORKFLOW_COMMANDS = [...runCommands('test.yml'), ...runCommands('design.yml')];
const inGroup = (group: string) => CHECKS.filter((row) => Object.hasOwn(row.groups, group));
const DOCS_GATE_NAMES = new Set(inGroup('docs-gate').map((row) => row.name));

/**
 * Whether CI runs a row as direct `node` calls after its one shared build: the row builds, and
 * every call in its command is a `node` call that is a workflow step.
 * @param row - One registry row.
 */
function runsAsDirectNodeCalls(row: Row): boolean {
  if (!row.build) return false;
  return row.command.split(' && ').every((call) => call.startsWith('node ') && WORKFLOW_COMMANDS.includes(call));
}

/**
 * Whether CI runs a row: as its own workflow step by script or by command, or as a check inside
 * the docs gate when a workflow step runs the docs gate.
 * @param row - One registry row.
 */
function runsOnCi(row: Row): boolean {
  if (WORKFLOW_COMMANDS.includes(`npm run ${row.name}`) || WORKFLOW_COMMANDS.includes(row.command)) return true;
  if (runsAsDirectNodeCalls(row)) return true;
  return WORKFLOW_COMMANDS.includes(`npm run ${GROUPS['docs-gate']}`) && DOCS_GATE_NAMES.has(row.name);
}

describe('the close group rows run on CI', () => {
  it('names a workflow step or a docs-gate check for every row', () => {
    const missing = inGroup('close')
      .filter((row) => !runsOnCi(row))
      .map((row) => row.name);
    expect(missing).toEqual([]);
  });

  it('reads the workflow steps it judges from, so an empty read cannot pass', () => {
    expect(WORKFLOW_COMMANDS).toContain('npm run check:comments');
    expect(WORKFLOW_COMMANDS).toContain('npm run check:public-tokens');
    expect(DOCS_GATE_NAMES.has('check:vale')).toBe(true);
  });
});
