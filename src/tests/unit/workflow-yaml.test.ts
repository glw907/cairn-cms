// cairn-cms: every GitHub Actions workflow must parse as YAML. GitHub reports an unparseable
// workflow as a run that fails with no jobs, no failed step, and no log, so `gh run view
// --log-failed` answers "log not found" and the cause is invisible from the run page. Nothing else
// in the suite reads these files, so a syntax error reaches `main` and takes the whole workflow
// offline rather than failing one gate.
//
// The 2026-08-05 instance: a step name was written `- name: Gate self-test: the markers ARE
// present ...`. An unquoted colon-and-space inside a plain scalar is a mapping indicator, so both
// e2e.yml and create-site.yml stopped parsing and both went dark in the same push. Quoting the value
// fixes it; this test is what catches the next one.
import { describe, it, expect } from 'vitest';
import { spawnSync } from 'node:child_process';
import { chmodSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, resolve } from 'node:path';
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
  with?: Record<string, unknown>;
  'continue-on-error'?: unknown;
}

interface Job {
  if?: unknown;
  'continue-on-error'?: unknown;
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

/** Names every job that sets no `timeout-minutes`. */
function jobsWithoutTimeout(name: string): string[] {
  const missing: string[] = [];
  for (const [jobId, job] of Object.entries(loadWorkflow(name).jobs ?? {})) {
    if (typeof job['timeout-minutes'] !== 'number') missing.push(`${name}:${jobId}`);
  }
  return missing;
}

describe('every job is bounded', () => {
  it.each(workflowFiles())('%s sets timeout-minutes on every job it runs', (name) => {
    expect(jobsWithoutTimeout(name)).toEqual([]);
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
  // The workflows that gate a pull_request; the ones above plus the create-site gate.
  const PR_WORKFLOWS = [...TEST_WORKFLOWS, 'create-site.yml'];
  const TEST_STEP = /\bnpm\b[^\n]*\btest\b/;
  const stepsOf = (name: string): Step[] =>
    Object.values(loadWorkflow(name).jobs ?? {}).flatMap((job) => job.steps ?? []);
  const isRetriesStep = (step: Step): boolean => (step.run ?? '').includes('scripts/ci/retries-notice.mjs');

  it.each(TEST_WORKFLOWS)('%s sets continue-on-error on no step', (name) => {
    for (const step of stepsOf(name)) {
      expect(step, step.name ?? step.run ?? step.uses).not.toHaveProperty('continue-on-error');
    }
  });

  it.each(TEST_WORKFLOWS)('%s sets continue-on-error on no job', (name) => {
    for (const [jobId, job] of Object.entries(loadWorkflow(name).jobs ?? {})) {
      expect(job, `${name}:${jobId}`).not.toHaveProperty('continue-on-error');
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
      // Naming a reporter replaces Vitest's resolved set, which on Actions would have included this one.
      expect(match[2]).toContain('--reporter=github-actions');
      expect(match[2]).toContain('--reporter=./scripts/ci/vitest-retry-reporter.mjs');
    }
  });

  it.each(PR_WORKFLOWS)('%s has no job or step whose if: skips a pull_request run', (name) => {
    // A condition that names the pull_request event is how a gate gets turned off for exactly the
    // runs that exist to judge a change before it merges.
    for (const [jobId, job] of Object.entries(loadWorkflow(name).jobs ?? {})) {
      expect(String(job.if ?? ''), `${name}:${jobId}`).not.toContain('pull_request');
      for (const step of job.steps ?? []) {
        expect(String(step.if ?? ''), `${name}:${jobId}:${step.name ?? step.run ?? step.uses}`).not.toContain('pull_request');
      }
    }
  });

  it.each(PR_WORKFLOWS)('%s ends no test step line in || true', (name) => {
    for (const step of stepsOf(name).filter((s) => TEST_STEP.test(s.run ?? ''))) {
      for (const line of (step.run ?? '').split('\n')) {
        expect(line.trim(), step.name ?? step.run).not.toMatch(/\|\|\s*true\s*$/);
      }
    }
  });

  it('adds the json reporter on every Playwright run', () => {
    const runs = [...stepsOf('e2e.yml'), ...stepsOf('design.yml')]
      .map((s) => s.run ?? '')
      .filter((run) => run.includes('test:e2e'));
    expect(runs.length).toBeGreaterThanOrEqual(3);
    for (const run of runs) expect(run).toMatch(/--reporter=dot(,html|,blob)?,json\b/);
  });
});

describe('publish.yml gates a candidate before it reaches next', () => {
  type PublishStep = Step & { env?: Record<string, string> };
  type PublishJob = Job & {
    permissions?: Record<string, string>;
    environment?: string;
    needs?: string | string[];
    steps?: PublishStep[];
  };
  const jobs = (loadWorkflow('publish.yml').jobs ?? {}) as Record<string, PublishJob>;
  const publishJobs = ['publish', 'publish-dev'];
  const PACKAGES = ['@glw907/cairn-cms', '@glw907/cairn-cms-dev'];
  const promoteScript = (jobs.promote?.steps ?? []).map((s) => s.run ?? '').find((run) => run.includes('dist-tag add')) ?? '';

  it('maps a prerelease to gate in each publish job and none to next', () => {
    for (const id of publishJobs) {
      const script = (jobs[id].steps ?? []).map((s) => s.run ?? '').join('\n');
      expect(script, id).toContain('*-*) TAG=gate ;;');
      expect(script, id).not.toMatch(/\*-\*\)\s*TAG=next/);
    }
  });

  it('admits only a published release to each publish job', () => {
    for (const id of publishJobs) {
      expect(jobs[id].if, id).toBe("github.event_name == 'release'");
    }
  });

  it('grants id-token to the publishing jobs and promote only, each under the npm-publish environment', () => {
    const workflow = loadWorkflow('publish.yml') as Workflow & { permissions?: Record<string, string> };
    expect(workflow.permissions).toEqual({ contents: 'read' });
    const holders = Object.entries(jobs)
      .filter(([, job]) => job.permissions?.['id-token'] === 'write')
      .map(([id]) => id);
    expect(holders.sort()).toEqual([...publishJobs, 'promote'].sort());
    for (const id of holders) expect(jobs[id].environment, id).toBe('npm-publish');
    for (const id of ['ci-green', 'build', 'verdict']) expect(jobs[id].permissions?.['id-token'], id).toBeUndefined();
    expect(jobs['ci-green'].permissions?.checks).toBe('read');
  });

  it('chains ci-green, build, the publish jobs, verdict, and promote; no id-token job installs', () => {
    expect(jobs.build.needs).toBe('ci-green');
    for (const id of publishJobs) expect([jobs[id].needs].flat(), id).toContain('build');
    expect(jobs.promote.needs).toBe('verdict');
    for (const [id, job] of Object.entries(jobs)) {
      if (job.permissions?.['id-token'] !== 'write') continue;
      const steps = job.steps ?? [];
      expect(steps.some((s) => /npm ci|bounded-install/.test(`${s.run ?? ''}${s.uses ?? ''}`)), id).toBe(false);
    }
    for (const id of publishJobs) {
      const publishes = (jobs[id].steps ?? []).map((s) => s.run ?? '').filter((run) => run.includes('npm publish'));
      expect(publishes.length, id).toBe(1);
      expect(publishes[0], id).toMatch(/npm publish "\$TGZ" --ignore-scripts /);
    }
  });

  it('pins every third-party action by a 40-hex commit sha', () => {
    const uses = Object.values(jobs)
      .flatMap((job) => job.steps ?? [])
      .map((s) => s.uses ?? '')
      .filter((u) => u !== '' && !u.startsWith('./'));
    expect(uses.length).toBeGreaterThan(0);
    for (const u of uses) expect(u).toMatch(/@[0-9a-f]{40}$/);
  });

  it('checks out only the two gate scripts in verdict, with a sha-pinned setup-node and no expression in its script', () => {
    const steps = jobs.verdict.steps ?? [];
    const checkout = steps.find((s) => (s.uses ?? '').startsWith('actions/checkout'));
    expect(String(checkout?.with?.['sparse-checkout']).split('\n').filter(Boolean)).toEqual([
      'scripts/gate/verdict.mjs',
      'scripts/gate/record.mjs'
    ]);
    expect(checkout?.with?.['sparse-checkout-cone-mode']).toBe(false);
    expect(steps.some((s) => /^actions\/setup-node@[0-9a-f]{40}$/.test(s.uses ?? ''))).toBe(true);
    const script = steps.map((s) => s.run ?? '').join('\n');
    expect(script).toContain('node scripts/gate/verdict.mjs "$PROMOTE_VERSION"');
    expect(script).not.toContain('${{');
    expect(steps.some((s) => /npm ci|bounded-install/.test(`${s.run ?? ''}${s.uses ?? ''}`))).toBe(false);
  });

  it('declares the promote job with job-level OIDC, no install, and next for each package', () => {
    const promote = jobs.promote;
    expect(promote.if).toBe("github.event_name == 'workflow_dispatch' && inputs.promote != ''");
    expect(promote.permissions?.['id-token']).toBe('write');
    const steps = promote.steps ?? [];
    expect(steps.some((s) => /npm ci|bounded-install/.test(`${s.run ?? ''}${s.uses ?? ''}`))).toBe(false);
    expect(steps.some((s) => (s.uses ?? '').startsWith('actions/checkout'))).toBe(false);
    expect(promoteScript).not.toContain('${{');
    const adds = [...promoteScript.matchAll(/npm dist-tag add "([^"@]*@?[^"@]+)@\$V" next/g)].map((m) => m[1]);
    expect(adds).toEqual(PACKAGES);
  });

  it('pins every npm install step to exactly 11.21.1', () => {
    const installs = Object.values(jobs)
      .flatMap((job) => job.steps ?? [])
      .filter((s) => (s.run ?? '').startsWith('npm install -g npm@'));
    // One per job that publishes or promotes; build and verdict use the runner's npm.
    expect(installs.length).toBe(3);
    for (const step of installs) expect(step.run).toBe('npm install -g npm@11.21.1');
  });

  describe('ci-green under bash with a stub gh', () => {
    const script = (jobs['ci-green']?.steps ?? []).map((s) => s.run ?? '').join('\n');

    // The stub answers each check name from CHECKS_DIR/<name>.<n>.json, n counting calls for that
    // name and sticking at the last file; a name with no file answers an empty list.
    function run(
      ref: string,
      checks: Record<string, object[][]>,
      deadline = 3
    ): { status: number | null; out: string } {
      const dir = mkdtempSync(resolve(tmpdir(), 'ci-green-'));
      for (const [name, sequence] of Object.entries(checks)) {
        sequence.forEach((runs, at) => writeFileSync(resolve(dir, `${name}.${at}.json`), JSON.stringify({ check_runs: runs })));
      }
      const stub = resolve(dir, 'gh');
      writeFileSync(
        stub,
        [
          '#!/bin/bash',
          'name=$(printf "%s" "$2" | sed -E "s/.*check_name=([^&]*).*/\\1/")',
          'n=0; [ -f "$CHECKS_DIR/$name.count" ] && n=$(cat "$CHECKS_DIR/$name.count")',
          'echo $((n + 1)) > "$CHECKS_DIR/$name.count"',
          'f="$CHECKS_DIR/$name.$n.json"',
          'while [ ! -f "$f" ] && [ "$n" -gt 0 ]; do n=$((n - 1)); f="$CHECKS_DIR/$name.$n.json"; done',
          '[ -f "$f" ] && cat "$f" || echo \'{"check_runs":[]}\''
        ].join('\n')
      );
      chmodSync(stub, 0o755);
      const result = spawnSync('bash', ['-e', '-c', script], {
        encoding: 'utf8',
        env: {
          PATH: `${dir}:${process.env.PATH}`,
          CHECKS_DIR: dir,
          GITHUB_REF_NAME: ref,
          GITHUB_REPOSITORY: 'o/r',
          GITHUB_SHA: 'abc',
          CI_GREEN_DEADLINE: String(deadline),
          CI_GREEN_POLL: '1'
        }
      });
      return { status: result.status, out: `${result.stdout}${result.stderr}` };
    }
    const done = (id: number, conclusion: string) => ({ id, status: 'completed', conclusion });
    const going = (id: number) => ({ id, status: 'in_progress', conclusion: null });

    it('passes a candidate once test goes from in progress to success', () => {
      const r = run('v1.0.0-rc.1', { test: [[going(1)], [done(1, 'success')]] });
      expect(r.status, r.out).toBe(0);
    });

    it('fails when test concludes in failure', () => {
      const r = run('v1.0.0-rc.1', { test: [[done(1, 'failure')]] });
      expect(r.status).not.toBe(0);
      expect(r.out).toContain("'test' concluded 'failure'");
    });

    it('requires e2e for a stable and passes when both are green', () => {
      expect(run('v1.0.0', { test: [[done(1, 'success')]] }, 2).status).not.toBe(0);
      const r = run('v1.0.0', { test: [[done(1, 'success')]], e2e: [[done(2, 'success')]] });
      expect(r.status, r.out).toBe(0);
    });

    it('judges a rerun by its newest run, not the failed one before it', () => {
      const r = run('v1.0.0-rc.1', { test: [[done(1, 'failure'), done(5, 'success')]] });
      expect(r.status, r.out).toBe(0);
      expect(run('v1.0.0-rc.1', { test: [[done(5, 'failure'), done(1, 'success')]] }).status).not.toBe(0);
    });

    it('fails at its deadline while a check is still running', () => {
      const r = run('v1.0.0-rc.1', { test: [[going(1)]] }, 2);
      expect(r.status).not.toBe(0);
      expect(r.out).toContain('were not green');
    });
  });

  describe('the build ref check under bash', () => {
    const script = (jobs.build?.steps ?? []).find((s) => (s.name ?? '').startsWith('The tag names'))?.run ?? '';

    function run(ref: string, versions: [string, string]): { status: number | null; out: string } {
      const dir = mkdtempSync(resolve(tmpdir(), 'build-ref-'));
      const paths = ['package.json', 'packages/cairn-cms-dev/package.json'];
      paths.forEach((path, at) => {
        mkdirSync(dirname(resolve(dir, path)), { recursive: true });
        writeFileSync(resolve(dir, path), JSON.stringify({ version: versions[at] }));
      });
      const result = spawnSync('bash', ['-e', '-c', script], {
        encoding: 'utf8',
        cwd: dir,
        env: { PATH: process.env.PATH, GITHUB_REF_NAME: ref }
      });
      return { status: result.status, out: `${result.stdout}${result.stderr}` };
    }

    it('passes when the tag is v plus the version in both manifests', () => {
      expect(run('v0.99.0-rc.3', ['0.99.0-rc.3', '0.99.0-rc.3']).status).toBe(0);
    });

    it('fails when any one manifest disagrees with the tag', () => {
      for (let at = 0; at < 2; at += 1) {
        const versions: [string, string] = ['0.99.0-rc.3', '0.99.0-rc.3'];
        versions[at] = '0.0.0';
        const r = run('v0.99.0-rc.3', versions);
        expect(r.status, `manifest ${at}`).not.toBe(0);
        expect(r.out).toContain('0.0.0');
      }
    });
  });

  it('passes actionlint over every workflow', () => {
    // go is required, not optional: a missing toolchain fails here rather than skipping.
    const result = spawnSync('go', ['run', 'github.com/rhysd/actionlint/cmd/actionlint@v1.7.12'], {
      encoding: 'utf8',
      cwd: REPO_ROOT
    });
    expect(result.error, 'go is not on PATH').toBeUndefined();
    // A cold module cache prints "go: downloading" progress on stderr; only findings count.
    const findings = `${result.stdout}${result.stderr}`
      .split('\n')
      .filter((line) => line !== '' && !line.startsWith('go: downloading '));
    expect(findings).toEqual([]);
    expect(result.status).toBe(0);
  }, 120_000);

  describe('the promote script under bash with a stub npm', () => {
    // The stub logs every call; `view` prints the version unless the package is in MISSING.
    function run(version: string, missing = ''): { status: number | null; calls: string[]; out: string } {
      const dir = mkdtempSync(resolve(tmpdir(), 'promote-'));
      const log = resolve(dir, 'calls.log');
      writeFileSync(log, '');
      const stub = resolve(dir, 'npm');
      writeFileSync(
        stub,
        [
          '#!/bin/bash',
          'echo "$*" >> "$NPM_LOG"',
          'if [ "$1" = view ]; then',
          '  pkg="${2%@*}"',
          '  [ "$pkg" = "$MISSING" ] && exit 1',
          '  echo "${2##*@}"',
          'fi',
          'if [ "$1" = dist-tag ] && [ "$2" = ls ]; then echo "tags of $3"; fi',
          'exit 0'
        ].join('\n')
      );
      chmodSync(stub, 0o755);
      const result = spawnSync('bash', ['-e', '-c', promoteScript], {
        encoding: 'utf8',
        env: { PATH: `${dir}:${process.env.PATH}`, PROMOTE_VERSION: version, NPM_LOG: log, MISSING: missing }
      });
      const calls = readFileSync(log, 'utf8').split('\n').filter(Boolean);
      return { status: result.status, calls, out: result.stdout };
    }
    const adds = (calls: string[]) => calls.filter((c) => c.startsWith('dist-tag add'));

    it('refuses a stable version and moves nothing', () => {
      const r = run('0.99.0');
      expect(r.status).not.toBe(0);
      expect(adds(r.calls)).toEqual([]);
    });

    it('refuses when one package lacks the version, moves nothing, and prints every tag state', () => {
      const r = run('0.99.0-rc.3', '@glw907/cairn-cms-dev');
      expect(r.status).not.toBe(0);
      expect(adds(r.calls)).toEqual([]);
      for (const pkg of PACKAGES) expect(r.out).toContain(`tags of ${pkg}`);
    });

    it('prints every package dist-tags before the first dist-tag add', () => {
      const r = run('0.99.0-rc.3');
      const firstAdd = r.calls.findIndex((c) => c.startsWith('dist-tag add'));
      const lsBefore = r.calls.slice(0, firstAdd).filter((c) => c.startsWith('dist-tag ls'));
      expect(lsBefore).toEqual(PACKAGES.map((p) => `dist-tag ls ${p}`));
    });

    it('moves both packages to next and touches no latest', () => {
      const r = run('0.99.0-rc.3');
      expect(r.status).toBe(0);
      expect(adds(r.calls)).toEqual([
        'dist-tag add @glw907/cairn-cms@0.99.0-rc.3 next',
        'dist-tag add @glw907/cairn-cms-dev@0.99.0-rc.3 next'
      ]);
    });
  });
});
