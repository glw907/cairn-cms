import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { checkStableSource } from '../../../scripts/checks/check-stable-source.mjs';

// The fixture is a candidate cut's diff (rc.1 to rc.2, the shape of a real cut) rewritten into the
// stable's rc.2 to 0.99.0: versions, template pins, VERSION, headings, and the CHANGELOG anchor.
const DIR = resolve(__dirname, '../../../scripts/checks/fixtures/stable-source');
const RAW = readFileSync(resolve(DIR, 'raw.txt'), 'utf8').trim().split('\n');
const PATCH = readFileSync(resolve(DIR, 'stable.diff'), 'utf8');

function patchFor(file: string): string {
  const section = PATCH.split(/^(?=diff --git )/m).find((s) => s.startsWith(`diff --git a/${file} `));
  return section ?? '';
}

interface World {
  head: string;
  origin: string;
  next: [string, string, string];
  tagPresent: boolean;
  raw: string[];
  diffs: Record<string, string>;
  hashesStatus: number;
}

function world(): World {
  return {
    head: 'abc123',
    origin: 'abc123',
    next: ['0.99.0-rc.2', '0.99.0-rc.2', '0.99.0-rc.2'],
    tagPresent: true,
    raw: [...RAW],
    diffs: {},
    hashesStatus: 0
  };
}

function check(w: World) {
  const packages = ['@glw907/cairn-cms', '@glw907/cairn-cms-dev', 'create-cairn-site'];
  return checkStableSource((cmd, args) => {
    const key = [cmd, ...args].join(' ');
    const ok = (stdout = '') => ({ status: 0, stdout });
    if (key === 'git fetch origin main') return ok();
    if (key === 'git rev-parse HEAD') return ok(w.head);
    if (key === 'git rev-parse origin/main') return ok(w.origin);
    if (cmd === 'npm') return ok(w.next[packages.indexOf(args[1])]);
    if (key.startsWith('git rev-parse -q --verify')) return { status: w.tagPresent ? 0 : 1, stdout: '' };
    if (key.startsWith('git diff --raw')) return ok(w.raw.join('\n'));
    if (cmd === 'git' && args[1] === '--text') {
      const file = args[args.length - 1];
      return ok(w.diffs[file] ?? patchFor(file));
    }
    if (cmd === 'node') return { status: w.hashesStatus, stdout: '' };
    throw new Error(`unexpected command: ${key}`);
  });
}

const entry = (path: string, status = 'M', modes = '100644 100644') => `:${modes} aaaaaaa bbbbbbb ${status}\t${path}`;

describe('check-stable-source', () => {
  it('passes the stable rewrite of a candidate cut and reports the sha it read', () => {
    const r = check(world());
    expect(r.errors).toEqual([]);
    expect(r.ok).toBe(true);
    expect(r.sha).toBe('abc123');
  });

  it('fails a code line added to the template package.json, naming the line', () => {
    const w = world();
    w.diffs['templates/waymark/package.json'] =
      patchFor('templates/waymark/package.json') + '+    "left-pad": "^1.0.0",\n';
    const r = check(w);
    expect(r.ok).toBe(false);
    expect(r.errors.join('\n')).toContain('templates/waymark/package.json');
    expect(r.errors.join('\n')).toContain('left-pad');
  });

  it('fails a one-line change in src/, naming the file', () => {
    const w = world();
    w.raw.push(entry('src/lib/index.ts'));
    const r = check(w);
    expect(r.ok).toBe(false);
    expect(r.errors.join('\n')).toContain('src/lib/index.ts');
  });

  it('fails a CHANGELOG body change', () => {
    const w = world();
    w.diffs['CHANGELOG.md'] = '@@ -1,3 +1,3 @@\n-## 0.99.0-rc.2\n+## 0.99.0\n-- an old note\n+- a new note\n';
    const r = check(w);
    expect(r.ok).toBe(false);
    expect(r.errors.join('\n')).toContain('a new note');
  });

  it('fails a MIGRATION-NOTES body change that is not the anchor', () => {
    const w = world();
    w.diffs['MIGRATION-NOTES.md'] = '@@ -1,2 +1,2 @@\n-## 0.99.0-rc.2\n+## 0.99.0\n-old step\n+new step\n';
    expect(check(w).ok).toBe(false);
  });

  it('fails a binary file change', () => {
    const w = world();
    w.raw.push(entry('static/logo.png'));
    const r = check(w);
    expect(r.ok).toBe(false);
    expect(r.errors.join('\n')).toContain('static/logo.png');
  });

  it('fails a pure rename', () => {
    const w = world();
    w.raw.push(`:100644 100644 aaaaaaa aaaaaaa R100\tpackage.json\tpackage.renamed.json`);
    expect(check(w).ok).toBe(false);
  });

  it('fails a mode-only change to package.json', () => {
    const w = world();
    w.raw = w.raw.map((l) => (l.endsWith('\tpackage.json') ? entry('package.json', 'M', '100644 100755') : l));
    const r = check(w);
    expect(r.ok).toBe(false);
    expect(r.errors.join('\n')).toContain('mode');
  });

  it('fails a docs/STATUS.md change', () => {
    const w = world();
    w.raw.push(entry('docs/STATUS.md'));
    const r = check(w);
    expect(r.ok).toBe(false);
    expect(r.errors.join('\n')).toContain('docs/STATUS.md');
  });

  it('fails when the hashes check exits 1', () => {
    const w = world();
    w.hashesStatus = 1;
    const r = check(w);
    expect(r.ok).toBe(false);
    expect(r.errors.join('\n')).toContain('guidance-hashes.json');
  });

  it('fails when HEAD is not origin/main', () => {
    const w = world();
    w.origin = 'def456';
    expect(check(w).ok).toBe(false);
  });

  it('fails when next differs across the packages', () => {
    const w = world();
    w.next = ['0.99.0-rc.2', '0.99.0-rc.2', '0.99.0-rc.1'];
    expect(check(w).ok).toBe(false);
  });

  it('fails when the v<next> tag is absent', () => {
    const w = world();
    w.tagPresent = false;
    const r = check(w);
    expect(r.ok).toBe(false);
    expect(r.errors.join('\n')).toContain('v0.99.0-rc.2');
  });
});
