import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const REPO = resolve(__dirname, '../../../');
const HOOK = resolve(REPO, '.claude/hooks/release-cut-guard.mjs');
const SHA = 'a'.repeat(40);
const OTHER = 'b'.repeat(40);

const STUB = `
const mode = process.env.STUB_MODE ?? 'pass';
if (mode === 'fail') process.exit(1);
if (mode === 'crash') throw new Error('boom');
if (mode === 'garbage') { console.log('sha: nonsense'); process.exit(0); }
console.log('check-stable-source: OK');
console.log('sha: ${SHA}');
`;

let stubRepo: string;
let bareRepo: string;

function git(cwd: string) {
  const r = spawnSync('git', ['init', '-q'], { cwd });
  expect(r.status).toBe(0);
}

beforeAll(() => {
  stubRepo = mkdtempSync(join(tmpdir(), 'guard-stub-'));
  git(stubRepo);
  mkdirSync(join(stubRepo, 'scripts/checks'), { recursive: true });
  mkdirSync(join(stubRepo, 'sub/dir'), { recursive: true });
  writeFileSync(join(stubRepo, 'scripts/checks/check-stable-source.mjs'), STUB);
  bareRepo = mkdtempSync(join(tmpdir(), 'guard-bare-'));
  git(bareRepo);
});

afterAll(() => {
  rmSync(stubRepo, { recursive: true, force: true });
  rmSync(bareRepo, { recursive: true, force: true });
});

type Decision = { permissionDecision?: string; permissionDecisionReason?: string } | null;

function runRaw(stdin: string, mode = 'pass'): Decision {
  const r = spawnSync('node', [HOOK], { input: stdin, encoding: 'utf8', env: { ...process.env, STUB_MODE: mode } });
  expect(r.status).toBe(0);
  if (r.stdout.trim() === '') return null;
  const out = JSON.parse(r.stdout);
  expect(out.hookSpecificOutput.hookEventName).toBe('PreToolUse');
  return out.hookSpecificOutput;
}

function guard(command: string, opts: { cwd?: string; mode?: string } = {}): Decision {
  const input = { hook_event_name: 'PreToolUse', tool_name: 'Bash', tool_input: { command }, cwd: opts.cwd ?? stubRepo };
  return runRaw(JSON.stringify(input), opts.mode);
}

const denied = (d: Decision) => d?.permissionDecision === 'deny';

describe('release-cut-guard: prerelease tags', () => {
  it('denies an rc tag without --prerelease', () => {
    expect(denied(guard('gh release create v1.0.0-rc.1 --target main'))).toBe(true);
  });
  it('gives no decision with --prerelease or -p', () => {
    expect(guard('gh release create v1.0.0-rc.1 --prerelease --title x')).toBeNull();
    expect(guard('gh release create v1.0.0-rc.1 -p --title x')).toBeNull();
  });
  it('denies --prerelease=false', () => {
    expect(denied(guard('gh release create v1.0.0-rc.1 --prerelease=false'))).toBe(true);
  });
  it('denies the probe command', () => {
    const cmd = 'gh release create v9.9.9-hookprobe --repo glw907/hookprobe-absent --target main --title x --notes x';
    expect(denied(guard(cmd))).toBe(true);
  });
});

describe('release-cut-guard: stable tags', () => {
  it('gives no decision for a passing stable', () => {
    expect(guard(`gh release create v1.0.0 --target ${SHA} --title x`)).toBeNull();
  });
  it('reads --target=<sha> like --target <sha>', () => {
    expect(guard(`gh release create v1.0.0 --target=${SHA}`)).toBeNull();
  });
  it('denies a stable whose check exits 1', () => {
    expect(denied(guard(`gh release create v1.0.0 --target ${SHA}`, { mode: 'fail' }))).toBe(true);
  });
  it('denies a different --target', () => {
    expect(denied(guard(`gh release create v1.0.0 --target ${OTHER}`))).toBe(true);
  });
  it('denies a missing, symbolic, or variable --target', () => {
    expect(denied(guard('gh release create v1.0.0 --title x'))).toBe(true);
    expect(denied(guard('gh release create v1.0.0 --target main'))).toBe(true);
    expect(denied(guard('gh release create v1.0.0 --target "$SHA"'))).toBe(true);
  });
  it('finds the check from a directory below the repo root', () => {
    const cwd = join(stubRepo, 'sub/dir');
    expect(guard(`gh release create v1.0.0 --target ${SHA}`, { cwd })).toBeNull();
  });
});

describe('release-cut-guard: non-literal tags and matching', () => {
  it('denies a variable tag', () => {
    expect(denied(guard(`gh release create "$TAG" --target ${SHA}`))).toBe(true);
    expect(denied(guard(`gh release create $(cat v) --target ${SHA}`))).toBe(true);
  });
  it('matches doubled spaces', () => {
    expect(denied(guard('gh  release  create v1.0.0-rc.1'))).toBe(true);
  });
  it('checks every release in a compound command', () => {
    const cmd = `gh release create v0.1.0-rc.1 --prerelease -t x -n x && gh release create v1.0.0 -t x -n x`;
    expect(denied(guard(cmd))).toBe(true);
    expect(denied(guard(`cd x && gh release create v1.0.0 --title y`))).toBe(true);
  });
  it('reads a redirection as a boundary, not part of the tag', () => {
    expect(denied(guard('gh release create v1.0.0>/dev/null'))).toBe(true);
    expect(denied(guard('gh release create v1.0.0 2>&1 --title x'))).toBe(true);
    expect(guard(`gh release create v1.0.0 --target ${SHA} > /tmp/out 2>&1`)).toBeNull();
  });
  it('catches the new alias, a global flag, and a quoted subcommand', () => {
    expect(denied(guard('gh release new v1.0.0 --title x'))).toBe(true);
    expect(denied(guard('gh -R o/r release create v1.0.0 --title x'))).toBe(true);
    expect(denied(guard('gh --repo glw907/cairn-cms release create v1.0.0'))).toBe(true);
    expect(denied(guard('gh "release" create v1.0.0'))).toBe(true);
  });
  it('reads a backslash-newline continuation as whitespace', () => {
    expect(guard('gh release create v1.0.0-rc.1 --prerelease\\\n  --title x')).toBeNull();
  });
  it('denies a gh release create it cannot parse', () => {
    expect(denied(guard('$(echo gh) release create v1.0.0'))).toBe(true);
    expect(denied(guard('gh $X release create v1.0.0'))).toBe(true);
    expect(guard('gh pr create --title x --body "notes for the release, a new page"')).toBeNull();
    expect(guard('gh release view v1.0.0 --json isPrerelease')).toBeNull();
  });
  it('gives no decision for another literal tag or another command', () => {
    expect(guard('gh release create nightly --title x')).toBeNull();
    expect(guard('gh release list')).toBeNull();
    expect(guard('npm test')).toBeNull();
  });
});

describe('release-cut-guard: fails closed on a stable tag', () => {
  const cmd = `gh release create v1.0.0 --target ${SHA}`;
  it('denies when the check script is absent', () => {
    expect(denied(guard(cmd, { cwd: bareRepo }))).toBe(true);
  });
  it('denies when the check crashes', () => {
    expect(denied(guard(cmd, { mode: 'crash' }))).toBe(true);
  });
  it('denies garbage stdout from the check', () => {
    expect(denied(guard(cmd, { mode: 'garbage' }))).toBe(true);
  });
  it('denies malformed stdin JSON', () => {
    const d = runRaw(`{"tool_input": {"command": "${cmd}"`);
    expect(denied(d)).toBe(true);
    expect(d?.permissionDecisionReason).toMatch(/internal error/);
  });
});

describe('.claude/settings.json', () => {
  const settings = JSON.parse(readFileSync(resolve(REPO, '.claude/settings.json'), 'utf8'));

  it('registers one fail-closed PreToolUse hook for gh release create', () => {
    const entries = settings.hooks.PreToolUse;
    expect(entries).toHaveLength(1);
    expect(entries[0].matcher).toBe('Bash');
    const hook = entries[0].hooks[0];
    expect(hook.command).toContain('.claude/hooks/release-cut-guard.mjs');
    expect(hook.onFailure).toBe('block');
    // No `if` filter: its permission-rule syntax cannot match the `release new` alias, a global
    // flag before the subcommand, or a compound command, so the hook reads every Bash call.
    expect(hook.if).toBeUndefined();
  });

  it('allows the release scripts and the promote workflow', () => {
    expect(settings.permissions.allow).toContain('Bash(node scripts/release/*)');
    expect(settings.permissions.allow).toContain('Bash(gh workflow run publish.yml --ref v* -f promote=*)');
  });
});
