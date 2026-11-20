import { describe, it, expect } from 'vitest';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { runSteps } from '../../../scripts/checks/run.mjs';

const fixture = (name: string) => resolve(process.cwd(), `scripts/checks/fixtures/${name}.mjs`);

function runFixture(name: string) {
  const result = spawnSync(process.execPath, [fixture(name)], { encoding: 'utf8' });
  const lines = result.stdout.trimEnd().split('\n');
  return { status: result.status, last: lines[lines.length - 1], stderr: result.stderr };
}

describe('runCheck', () => {
  it('prints OK and exits 0 when the body finds no problem', () => {
    const { status, last, stderr } = runFixture('shared-pass');
    expect(last).toBe('shared-pass: OK');
    expect(status).toBe(0);
    expect(stderr).toBe('');
  });

  it('prints the problem on stderr, then FAIL, and exits 1', () => {
    const { status, last, stderr } = runFixture('shared-fail');
    expect(last).toBe('shared-fail: FAIL');
    expect(status).toBe(1);
    expect(stderr).toBe('shared-fail: one problem found\n');
  });

  it('turns a throw into one problem, the error message', () => {
    const { status, last, stderr } = runFixture('shared-throw');
    expect(last).toBe('shared-throw: FAIL');
    expect(status).toBe(1);
    expect(stderr).toBe('shared-throw: the body threw\n');
  });
});

describe('runSteps verdicts', () => {
  it('ends a step that names a command with the same OK or FAIL line', () => {
    for (const [command, want] of [
      ['true', 'OK'],
      ['false', 'FAIL'],
    ] as const) {
      const lines: string[] = [];
      runSteps([{ name: command, command, targets: [], words: [], build: false }], {
        out: (line) => lines.push(line),
        err: () => {},
      });
      expect(lines[lines.length - 1]).toBe(`${command}: ${want}`);
    }
  });
});
