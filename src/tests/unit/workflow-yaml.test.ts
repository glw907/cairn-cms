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
import { basename, resolve } from 'node:path';
import { parse } from 'yaml';

const REPO_ROOT = resolve(__dirname, '../../..');
const WORKFLOW_DIR = resolve(REPO_ROOT, '.github/workflows');

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

// The pins below keep a workflow edit from weakening what CI proves. Each reads the parsed
// workflows, so a comment or a reformat cannot satisfy or break one.

interface Step {
  name?: string;
  run?: string;
  if?: string;
  shell?: string;
  uses?: string;
  'continue-on-error'?: unknown;
}

interface Job {
  uses?: string;
  'timeout-minutes'?: unknown;
  steps?: Step[];
}

interface Workflow {
  on?: unknown;
  true?: unknown;
  jobs?: Record<string, Job>;
}

interface CiGreen {
  expected: string[];
  judgedWhenPresent: string[];
  neverOnPullRequest: string[];
  ignorePrefixes: string[];
}

function loadWorkflow(name: string): Workflow {
  return parse(readFileSync(resolve(WORKFLOW_DIR, name), 'utf8')) as Workflow;
}

/** The workflow's trigger map, tolerating a YAML 1.1 reading of `on` as the boolean `true`. */
function triggers(workflow: Workflow): Record<string, unknown> {
  const raw = workflow.on ?? workflow.true;
  if (typeof raw === 'string') return { [raw]: null };
  if (Array.isArray(raw)) return Object.fromEntries(raw.map((name: string) => [name, null]));
  return (raw ?? {}) as Record<string, unknown>;
}

/**
 * Names every job that sets no `timeout-minutes`. A reusable-workflow call is exempt because
 * GitHub rejects the key there; it is judged by the jobs of the workflow it calls instead.
 */
function jobsWithoutTimeout(name: string, seen: string[] = []): string[] {
  const missing: string[] = [];
  for (const [jobId, job] of Object.entries(loadWorkflow(name).jobs ?? {})) {
    if (job.uses !== undefined) {
      const called = /^\.\/\.github\/workflows\/([\w.-]+)$/.exec(job.uses)?.[1];
      if (called === undefined) {
        missing.push(`${name}:${jobId} calls ${job.uses}, which is not a local workflow this suite can read`);
      } else if (!seen.includes(called)) {
        missing.push(...jobsWithoutTimeout(called, [...seen, called]));
      }
      continue;
    }
    if (typeof job['timeout-minutes'] !== 'number') missing.push(`${name}:${jobId}`);
  }
  return missing;
}

describe('every job is bounded', () => {
  it.each(workflowFiles())('%s sets timeout-minutes on every job it runs', (name) => {
    expect(jobsWithoutTimeout(name)).toEqual([]);
  });

  it('reads a reusable-workflow call through the jobs of the workflow it calls', () => {
    const calls = workflowFiles().filter((name) =>
      Object.values(loadWorkflow(name).jobs ?? {}).some((job) => job.uses !== undefined),
    );
    expect(calls.sort()).toEqual(['e2e.yml', 'publish.yml']);
    for (const name of calls) {
      for (const job of Object.values(loadWorkflow(name).jobs ?? {})) {
        if (job.uses !== undefined) expect(job).not.toHaveProperty('timeout-minutes');
      }
    }
    expect(Object.keys(loadWorkflow('norms.yml').jobs ?? {}).length).toBeGreaterThan(0);
  });
});

describe('.github/ci-green.json classifies every workflow by trigger shape', () => {
  const green = JSON.parse(readFileSync(resolve(REPO_ROOT, '.github/ci-green.json'), 'utf8')) as CiGreen;
  const asName = (path: string): string => basename(path);

  it('lists every workflow file in exactly one class', () => {
    const listed = [...green.expected, ...green.judgedWhenPresent, ...green.neverOnPullRequest].map(asName);
    expect([...new Set(listed)].sort()).toEqual(workflowFiles().sort());
    expect(listed.length).toBe(new Set(listed).size);
  });

  it('gives each expected workflow a pull_request trigger that ignores only tool/**', () => {
    for (const path of green.expected) {
      expect(triggers(loadWorkflow(asName(path))).pull_request, path).toEqual({ 'paths-ignore': ['tool/**'] });
    }
  });

  it('gives each judged-when-present workflow a pull_request trigger with a paths filter', () => {
    for (const path of green.judgedWhenPresent) {
      const pullRequest = triggers(loadWorkflow(asName(path))).pull_request as { paths?: unknown } | undefined;
      expect(Array.isArray(pullRequest?.paths) && pullRequest.paths.length > 0, path).toBe(true);
    }
  });

  it('keeps pull_request off every never-on-pull-request workflow', () => {
    for (const path of green.neverOnPullRequest) {
      expect(Object.keys(triggers(loadWorkflow(asName(path)))), path).not.toContain('pull_request');
    }
  });

  it('names the tool tree as the only ignored prefix', () => {
    expect(green.ignorePrefixes).toEqual(['tool/']);
  });
});

describe('the test jobs keep their gates and report their retries', () => {
  const TEST_WORKFLOWS = ['test.yml', 'e2e.yml', 'design.yml'];
  const TEST_STEP = /\bnpm\b[^\n]*\btest\b/;
  const stepsOf = (name: string): Step[] =>
    Object.values(loadWorkflow(name).jobs ?? {}).flatMap((job) => job.steps ?? []);
  const isRetriesStep = (step: Step): boolean => (step.run ?? '').includes('scripts/ci/retries-notice.mjs');

  it.each(TEST_WORKFLOWS)('%s sets continue-on-error on no step', (name) => {
    for (const step of stepsOf(name)) {
      expect(step, step.name ?? step.run ?? step.uses).not.toHaveProperty('continue-on-error');
    }
  });

  it.each(TEST_WORKFLOWS)('%s sets shell: bash on any test step that pipes', (name) => {
    // The default `bash -e {0}` has no pipefail, so a failing test in a pipeline would pass.
    for (const step of stepsOf(name).filter((s) => TEST_STEP.test(s.run ?? '') && (s.run ?? '').includes('|'))) {
      expect(step.shell, step.run).toBe('bash');
    }
  });

  it.each(TEST_WORKFLOWS)('%s runs one retries step, under if: always(), after the steps that write its report', (name) => {
    for (const [jobId, job] of Object.entries(loadWorkflow(name).jobs ?? {})) {
      const steps = job.steps ?? [];
      const retries = steps.filter(isRetriesStep);
      if (retries.length === 0) continue;
      expect(retries, `${name}:${jobId}`).toHaveLength(1);
      expect(retries[0].if, `${name}:${jobId}`).toBe('always()');
      const retriesAt = steps.indexOf(retries[0]);
      // The steps that write a report are the ones that name a reporter; later steps run other tools.
      const lastReportingAt = steps.reduce((last, s, at) => ((s.run ?? '').includes('--reporter=') ? at : last), -1);
      expect(retriesAt, `${name}:${jobId}`).toBeGreaterThan(lastReportingAt);
    }
  });

  it('puts a retries step in the test, e2e, and design jobs', () => {
    for (const name of TEST_WORKFLOWS) {
      expect(stepsOf(name).filter(isRetriesStep), name).toHaveLength(1);
    }
  });

  it('splits the test chain into exactly the scripts npm test runs', () => {
    const scripts = (JSON.parse(readFileSync(resolve(REPO_ROOT, 'package.json'), 'utf8')) as {
      scripts: Record<string, string>;
    }).scripts;
    const chain = scripts.test.split('&&').map((part) => /^\s*npm run ([\w:-]+)\s*$/.exec(part)?.[1]);
    expect(chain.every((script) => script !== undefined)).toBe(true);
    const steps = stepsOf('test.yml').map((s) => s.run ?? '');
    expect(steps.some((run) => /^npm test\b/m.test(run)), 'a bare npm test would skip the reporters').toBe(false);
    const split = steps
      .map((run) => /^npm run (test:node-projects|test:component) -- (.+)$/m.exec(run))
      .filter((match): match is RegExpExecArray => match !== null);
    expect(split.map((match) => match[1])).toEqual(chain);
    for (const match of split) {
      expect(match[2]).toContain('--reporter=default');
      expect(match[2]).toContain('--reporter=./scripts/ci/vitest-retry-reporter.mjs');
    }
  });

  it('adds the json reporter on every Playwright run', () => {
    const runs = [...stepsOf('e2e.yml'), ...stepsOf('design.yml')]
      .map((s) => s.run ?? '')
      .filter((run) => run.includes('test:e2e'));
    expect(runs.length).toBeGreaterThanOrEqual(3);
    for (const run of runs) expect(run).toMatch(/--reporter=dot(,html)?,json\b/);
  });
});
