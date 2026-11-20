import { describe, it, expect } from 'vitest';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { groupSteps, parseArgs, runSteps } from '../../../scripts/checks/run.mjs';
import { CHECKS } from '../../../scripts/checks/registry.mjs';

const RUN_MJS = pathToFileURL(resolve(process.cwd(), 'scripts/checks/run.mjs')).href;

const fixtureRow = (name: string, build: boolean, place: number) => ({
  name,
  command: `node ${name}.mjs`,
  build,
  buckets: [],
  groups: { close: place },
});

// Every case stubs the install check, since CI's unit job runs before the showcase install.
function harness() {
  let builds = 0;
  const commands: string[] = [];
  const options = {
    build: () => {
      builds += 1;
      return true;
    },
    run: (step: { name: string; command: string }) => {
      commands.push(step.command);
      return true;
    },
    out: () => {},
    err: () => {},
    exists: () => true,
  };
  return { options, commands, builds: () => builds };
}

describe('runSteps builds', () => {
  it('builds once for a group run, however many of its rows build', () => {
    const rows = [fixtureRow('a', true, 1), fixtureRow('b', false, 2), fixtureRow('c', true, 3)];
    const { options, commands, builds } = harness();
    expect(runSteps(groupSteps(rows, 'close', []), { ...options, group: 'close' })).toBe(0);
    expect(builds()).toBe(1);
    expect(commands).toEqual(['node a.mjs', 'node b.mjs', 'node c.mjs']);
  });

  it('builds once for a row run of a row that builds, and never for one that does not', () => {
    for (const [build, want] of [
      [true, 1],
      [false, 0],
    ] as const) {
      const { options, builds } = harness();
      runSteps([{ name: 'a', command: 'node a.mjs', targets: [], words: [], build }], options);
      expect(builds()).toBe(want);
    }
  });
});

describe('runSteps failures', () => {
  it('exits non-zero on a failing row and still runs the row after it', () => {
    const dir = mkdtempSync(join(tmpdir(), 'check-run-'));
    try {
      const script = join(dir, 'fixture.mjs');
      const step = (name: string, command: string) => ({ name, command, targets: [], words: [], build: false });
      const steps = [step('first', 'true'), step('middle', `node -e "process.exit(1)"`), step('last', 'true')];
      writeFileSync(
        script,
        [
          `import { runSteps } from ${JSON.stringify(RUN_MJS)};`,
          `process.exitCode = runSteps(${JSON.stringify(steps)}, {`,
          `  group: 'close', build: () => true, exists: () => true,`,
          `});`,
        ].join('\n'),
      );
      const result = spawnSync(process.execPath, [script], { encoding: 'utf8' });
      expect(result.status).not.toBe(0);
      const lines = result.stdout.split('\n');
      const failed = lines.indexOf('middle: FAIL');
      expect(failed).toBeGreaterThan(-1);
      expect(lines.indexOf('last: OK')).toBeGreaterThan(failed);
      expect(result.stderr).toContain('check:close: 1 check(s) failed: middle');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe('a docs-gate page run', () => {
  it('narrows Vale and check:tellgrader to the page and leaves out check:vale-rules', () => {
    const args = parseArgs(['docs-gate', '--page', 'docs/x.md']);
    expect(args).toMatchObject({ name: 'docs-gate', group: true, words: [], page: 'docs/x.md' });
    const steps = groupSteps(CHECKS, 'docs-gate', args.words, { page: args.page });
    expect(steps.map((step) => step.name)).not.toContain('check:vale-rules');

    const { options, commands } = harness();
    runSteps(steps, { ...options, group: 'docs-gate' });
    expect(commands).toContain(`vale --minAlertLevel=error 'docs/x.md'`);
    expect(commands).toContain(`node scripts/checks/check-tellgrader.mjs 'docs/x.md'`);
  });
});

describe('a row run with words', () => {
  it('puts the words after the targets, each quoted', () => {
    const args = parseArgs(['check:v', "it's", '--strict']);
    expect(args).toMatchObject({ name: 'check:v', group: false, words: ["it's", '--strict'], page: null });
    const { options, commands } = harness();
    runSteps([{ name: 'check:v', command: 'vale', targets: ['docs', 'a b'], words: args.words, build: false }], options);
    expect(commands).toEqual([`vale 'docs' 'a b' 'it'\\''s' '--strict'`]);
  });

  it('refuses --prebuilt', () => {
    expect(() => parseArgs(['--prebuilt'])).toThrow(/unknown flag --prebuilt/);
    expect(() => parseArgs(['docs-gate', '--prebuilt'])).toThrow(/unknown flag --prebuilt/);
  });
});
