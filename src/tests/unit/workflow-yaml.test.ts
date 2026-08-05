// cairn-cms: every GitHub Actions workflow must parse as YAML. GitHub reports an unparseable
// workflow as a run that fails with no jobs, no failed step, and no log, so `gh run view
// --log-failed` answers "log not found" and the cause is invisible from the run page. Nothing else
// in the suite reads these files, so a syntax error reaches `main` and takes the whole workflow
// offline rather than failing one gate.
//
// The 2026-08-05 instance: a step name was written `- name: Gate self-test: the markers ARE
// present ...`. An unquoted colon-and-space inside a plain scalar is a mapping indicator, so both
// e2e.yml and scaffold.yml stopped parsing and both went dark in the same push. Quoting the value
// fixes it; this test is what catches the next one.
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parse } from 'yaml';

const WORKFLOW_DIR = resolve(__dirname, '../../../.github/workflows');

function workflowFiles(): string[] {
  return readdirSync(WORKFLOW_DIR).filter((name) => name.endsWith('.yml') || name.endsWith('.yaml'));
}

describe('.github/workflows', () => {
  it('holds at least one workflow, so a bad path cannot make this suite vacuous', () => {
    expect(workflowFiles().length).toBeGreaterThan(0);
  });

  it.each(workflowFiles())('%s parses as YAML and declares jobs', (name) => {
    const source = readFileSync(resolve(WORKFLOW_DIR, name), 'utf8');
    const parsed = parse(source) as { jobs?: Record<string, unknown> } | null;
    expect(parsed, `${name} parsed to nothing`).toBeTruthy();
    // A workflow whose `jobs` key went missing still parses, and still runs nothing.
    expect(Object.keys(parsed?.jobs ?? {}).length, `${name} declares no jobs`).toBeGreaterThan(0);
  });
});
