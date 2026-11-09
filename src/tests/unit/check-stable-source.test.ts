import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
import {
  IGNORED,
  RULES,
  checkStableSource,
  isIgnored
} from '../../../scripts/checks/check-stable-source.mjs';

const REPO = resolve(__dirname, '../../../');

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

  it('accepts a Released line under the CHANGELOG heading, not a prose date', () => {
    const w = world();
    const head = '@@ -1,3 +1,4 @@\n-## 0.99.0-rc.2\n+## 0.99.0\n+';
    w.diffs['CHANGELOG.md'] = `${head}Released 2026-11-04.\n`;
    expect(check(w).errors).toEqual([]);
    w.diffs['CHANGELOG.md'] = `${head}Released Nov 4.\n`;
    const r = check(w);
    expect(r.ok).toBe(false);
    expect(r.errors.join('\n')).toContain('Released Nov 4.');
  });

  it('ignores harness, test, and inert paths whatever their status', () => {
    const w = world();
    w.raw.push(
      entry('scripts/gate/legs.mjs'),
      entry('src/tests/unit/gate-x.test.ts', 'A'),
      entry('examples/showcase/e2e/golden-path.spec.ts'),
      entry('packages/cairn-cms-dev/test/x.test.ts', 'D'),
      entry('docs/STATUS.md'),
      entry('BACKLOG.md'),
      entry('ROADMAP.md'),
      entry('docs/internal/x.md', 'A', '100644 100755')
    );
    const r = check(w);
    expect(r.errors).toEqual([]);
    expect(r.ok).toBe(true);
  });

  it.each([
    '.github/workflows/publish.yml',
    'scripts/build/build-guidance-hashes.mjs',
    'src/lib/index.ts'
  ])('still fails a change to %s', (path) => {
    const w = world();
    w.raw.push(entry(path));
    const r = check(w);
    expect(r.ok).toBe(false);
    expect(r.errors.join('\n')).toContain(path);
  });

  it('does not let a rename out of an ignored path hide', () => {
    const w = world();
    w.raw.push(`:100644 100644 aaaaaaa aaaaaaa R100\tsrc/tests/a.ts\tsrc/lib/a.ts`);
    expect(check(w).ok).toBe(false);
  });

  it('anchors a glob: docs/STATUS.md does not ignore a lookalike', () => {
    expect(isIgnored('docs/STATUS.md')).toBe(true);
    expect(isIgnored('docs/STATUS.md.bak')).toBe(false);
    expect(isIgnored('xsrc/tests/a.ts')).toBe(false);
    expect(isIgnored('packages/a/b/test/x.ts')).toBe(false);
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

describe('the ignore set against what ships', () => {
  const tracked = execFileSync('git', ['ls-files'], { cwd: REPO, encoding: 'utf8', maxBuffer: 1 << 28 })
    .split('\n')
    .filter(Boolean);
  const under = (dir: string) => tracked.filter((p) => p === dir || p.startsWith(`${dir}/`));
  const manifest = (rel: string) => JSON.parse(readFileSync(resolve(REPO, rel), 'utf8')) as { files: string[] };

  /** Every tracked path some package, or the template bake, puts into a published tarball. */
  function shippedInputs(): string[] {
    const inputs = new Set<string>();
    for (const [dir, rel] of [
      ['', 'package.json'],
      ['packages/cairn-cms-dev', 'packages/cairn-cms-dev/package.json'],
      ['packages/create-cairn-site', 'packages/create-cairn-site/package.json']
    ]) {
      for (const entry of manifest(rel).files) {
        if (entry.startsWith('!')) continue;
        for (const p of under(dir ? `${dir}/${entry}` : entry)) {
          if (!/\/src\/.*\.test\.mjs$/.test(p)) inputs.add(p);
        }
      }
    }
    for (const p of [...under('src/lib'), ...under('packages/cairn-cms-dev/src')]) inputs.add(p);
    const exclude = (
      JSON.parse(readFileSync(resolve(REPO, 'examples/showcase/.cairn-template.json'), 'utf8')) as {
        exclude: string[];
      }
    ).exclude;
    for (const p of under('examples/showcase')) {
      const rel = p.slice('examples/showcase/'.length);
      if (!exclude.some((e) => rel === e || rel.startsWith(`${e}/`))) inputs.add(p);
    }
    for (const p of [...under('skills'), ...under('claude')]) inputs.add(p);
    return [...inputs];
  }

  const collisions = (globs: readonly string[]) => shippedInputs().filter((p) => isIgnored(p, globs));

  it('finds inputs to compare', () => {
    const inputs = shippedInputs();
    expect(inputs).toContain('src/lib/index.ts');
    expect(inputs).toContain('CHANGELOG.md');
    expect(inputs).toContain('claude/CLAUDE.md');
  });

  it('collides with no ignored glob', () => {
    expect(collisions(IGNORED)).toEqual([]);
  });

  it('reports a collision when the set also ignores showcase source', () => {
    const hits = collisions([...IGNORED, 'examples/showcase/src/**']);
    expect(hits.length).toBeGreaterThan(0);
    expect(hits[0]).toMatch(/^examples\/showcase\/src\//);
  });

  it('exports a rule for each file the cut may change', () => {
    expect(Object.keys(RULES)).toContain('CHANGELOG.md');
    expect(Object.keys(RULES)).toContain('package.json');
  });
});
