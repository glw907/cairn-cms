import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { withdraw } from '../../../scripts/release/withdraw.mjs';

const NAMES = ['@glw907/cairn-cms', '@glw907/cairn-cms-dev', 'create-cairn-site'];
const V = '0.99.0-rc.3';
const LOG = readFileSync(new URL('./fixtures/release-verify/promote-log.txt', import.meta.url), 'utf8');

function runner(published: string[], promoted = false) {
  const calls: string[][] = [];
  const run = (cmd: string, args: string[]) => {
    calls.push([cmd, ...args]);
    if (cmd === 'npm' && args[0] === 'view' && args[2] === 'version') {
      return { status: 0, stdout: published.some((p) => args[1] === `${p}@${V}`) ? `${V}\n` : '' };
    }
    if (cmd === 'npm' && args[0] === 'view' && args[2] === 'dist-tags') {
      return { status: 0, stdout: JSON.stringify(promoted ? { gate: V, next: V } : { gate: V }) };
    }
    if (cmd === 'gh') return { status: 0, stdout: LOG };
    return { status: 1, stdout: '' };
  };
  return { run, calls };
}

describe('release withdraw', () => {
  it('prints three deprecations and the gate removals for a candidate on gate only', () => {
    const { run, calls } = runner(NAMES);
    const r = withdraw(run, { version: V });
    expect(r.ok).toBe(true);
    expect(r.commands.filter((c) => c.startsWith('npm deprecate'))).toHaveLength(3);
    expect(r.commands.filter((c) => c.startsWith('npm dist-tag rm') && c.endsWith(' gate'))).toHaveLength(3);
    expect(r.commands.some((c) => c.startsWith('npm dist-tag add'))).toBe(false);
    expect(calls.every(([cmd, verb]) => cmd === 'gh' || verb === 'view')).toBe(true);
  });

  it('moves next and latest back to what the promote run printed, given its log', () => {
    const { run } = runner(NAMES, true);
    const r = withdraw(run, { version: V, promoteRun: '123' });
    expect(r.ok).toBe(true);
    expect(r.commands).toEqual(
      expect.arrayContaining([
        'npm dist-tag add @glw907/cairn-cms@0.99.0-rc.2 next',
        'npm dist-tag add @glw907/cairn-cms-dev@0.99.0-rc.2 next',
        'npm dist-tag add create-cairn-site@0.99.0-rc.2 next',
        'npm dist-tag add create-cairn-site@0.99.0-rc.2 latest'
      ])
    );
    expect(r.commands.filter((c) => c.includes(' latest'))).toHaveLength(1);
  });

  it('deprecates only the published half of a half-published candidate', () => {
    const { run } = runner(['@glw907/cairn-cms', '@glw907/cairn-cms-dev']);
    const r = withdraw(run, { version: V });
    const deprecated = r.commands.filter((c) => c.startsWith('npm deprecate'));
    expect(deprecated).toHaveLength(2);
    expect(deprecated.join('\n')).not.toContain('create-cairn-site');
  });

  it('refuses a log it cannot read and a stable version, running no mutation', () => {
    const empty = (cmd: string) => ({ status: 0, stdout: cmd === 'gh' ? 'no listing here' : '' });
    expect(withdraw(empty, { version: V, promoteRun: '9' }).ok).toBe(false);
    expect(withdraw(empty, { version: '0.99.0' }).ok).toBe(false);
  });
});
