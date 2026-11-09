import { describe, it, expect } from 'vitest';
import { preflight } from '../../../scripts/release/preflight.mjs';

const SHA = 'a'.repeat(40);
const CHANGELOG = '## Unreleased\n\nSomething shipped.\n\n## 0.98.0\n\nOld.\n';

interface World {
  dirty: boolean;
  head: string;
  remote: string;
  published: Record<string, string[]>;
  installed: boolean;
  changelog: string;
  stable: boolean;
}

function world(over: Partial<World> = {}): World {
  return {
    dirty: false,
    head: SHA,
    remote: SHA,
    published: {},
    installed: true,
    changelog: CHANGELOG,
    stable: false,
    ...over
  };
}

function check(w: World) {
  const run = (cmd: string, args: string[]) => {
    const key = [cmd, ...args].join(' ');
    if (key === 'git status --porcelain') return { status: 0, stdout: w.dirty ? ' M x\n' : '' };
    if (key === 'git rev-parse HEAD') return { status: 0, stdout: `${w.head}\n` };
    if (key === 'git ls-remote origin refs/heads/main') return { status: 0, stdout: `${w.remote}\trefs/heads/main\n` };
    if (cmd === 'npm' && args[0] === 'view') {
      return { status: 0, stdout: JSON.stringify(w.published[args[1]] ?? ['0.98.0']) };
    }
    return { status: 1, stdout: '' };
  };
  return preflight(run, {
    version: '0.99.0',
    stable: w.stable,
    root: '/repo',
    exists: () => w.installed,
    changelog: w.changelog
  });
}

describe('preflight', () => {
  it('passes a clean world, printing the sha and a Next line', () => {
    const r = check(world());
    expect(r.ok).toBe(true);
    expect(r.sha).toBe(SHA);
    expect(r.next).toMatch(/^Next: /);
  });

  it('refuses a dirty tree', () => {
    expect(check(world({ dirty: true })).errors.join('\n')).toContain('dirty');
  });

  it('refuses a HEAD behind the remote answer, so a stale origin/main cannot pass', () => {
    const r = check(world({ remote: 'b'.repeat(40) }));
    expect(r.ok).toBe(false);
    expect(r.errors.join('\n')).toContain('not the tip of origin main');
  });

  it('refuses a version already published on one package', () => {
    const r = check(world({ published: { '@glw907/cairn-cms-dev': ['0.98.0', '0.99.0'] } }));
    expect(r.ok).toBe(false);
    expect(r.errors).toEqual([expect.stringContaining('@glw907/cairn-cms-dev already has 0.99.0')]);
  });

  it('refuses when npm view fails, instead of reading nothing as unpublished', () => {
    const run = (cmd: string, args: string[]) => {
      if (cmd === 'npm') return { status: 1, stdout: '' };
      if (args[0] === 'rev-parse') return { status: 0, stdout: SHA };
      if (args[0] === 'ls-remote') return { status: 0, stdout: `${SHA}\trefs/heads/main` };
      return { status: 0, stdout: '' };
    };
    const r = preflight(run, { version: '0.99.0', stable: true, root: '/repo', exists: () => true, changelog: CHANGELOG });
    expect(r.ok).toBe(false);
    expect(r.errors.join('\n')).toContain('npm view failed');
  });

  it('reads a failed npm view that reports E404 as unpublished', () => {
    const run = (cmd: string, args: string[]) => {
      if (cmd === 'npm') return { status: 1, stdout: '{"error":{"code":"E404"}}' };
      if (args[0] === 'rev-parse') return { status: 0, stdout: SHA };
      if (args[0] === 'ls-remote') return { status: 0, stdout: `${SHA}\trefs/heads/main` };
      return { status: 0, stdout: '' };
    };
    const r = preflight(run, { version: '0.99.0', stable: true, root: '/repo', exists: () => true, changelog: CHANGELOG });
    expect(r.errors).toEqual([]);
    expect(r.ok).toBe(true);
  });

  it('refuses a missing install, naming the command', () => {
    const r = check(world({ installed: false }));
    expect(r.errors.join('\n')).toContain('npm ci');
  });

  it('refuses an empty Unreleased window, which --stable skips', () => {
    const empty = '## Unreleased\n\n## 0.98.0\n\nOld.\n';
    const r = check(world({ changelog: empty }));
    expect(r.ok).toBe(false);
    expect(r.errors.join('\n')).toContain('Unreleased');
    expect(check(world({ changelog: empty, stable: true })).ok).toBe(true);
  });
});
