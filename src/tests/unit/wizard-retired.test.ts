import { describe, it, expect } from 'vitest';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '../../..');
const launcher = resolve(root, 'packages/create-cairn-site');

describe('the JavaScript wizard is retired', () => {
  it('leaves no wizard source tree in the launcher package', () => {
    expect(existsSync(resolve(launcher, 'src'))).toBe(false);
    expect(existsSync(resolve(launcher, 'scripts'))).toBe(false);
    expect(existsSync(resolve(launcher, 'template-repo'))).toBe(false);
    expect(existsSync(resolve(root, '.github/workflows/create-site.yml'))).toBe(false);
  });

  it('packs only the launcher, its manifest, and its readme', () => {
    const out = execFileSync('npm', ['pack', '--dry-run', '--json', '--ignore-scripts'], {
      cwd: launcher,
      encoding: 'utf8',
    });
    const files = (JSON.parse(out)[0].files as { path: string }[]).map((f) => f.path).sort();
    expect(files).toEqual(['README.md', 'bin.mjs', 'package.json']);
  });

  it('keeps a fixture hygiene test beside the Go tool corpus', () => {
    const hygiene = readFileSync(resolve(root, 'tool/testdata/fixtures-hygiene.test.mjs'), 'utf8');
    expect(hygiene).toContain("new URL('./fixtures', import.meta.url)");
    expect(existsSync(resolve(root, 'tool/testdata/fixtures'))).toBe(true);
  });
});
