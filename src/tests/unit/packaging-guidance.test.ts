// cairn-cms: the packaged claude/ tree's own gate. Three concerns, each proven a different way.
// First, the tarball npm would publish carries every file under claude/ (needs a real npm pack,
// so it skips until dist is built, the same skipIf convention packaging-boundary.test.ts uses).
// Second, the shipped agent's frontmatter never grows a tool that can write or execute, checked
// directly off the source tree through the same self-reference resolveSourceRoot uses, so this
// runs unconditionally. Third, every relative link claude/CLAUDE.md carries resolves inside the
// packed docs allowlist, and the snippets byte-match (or parse-equal) their in-repo counterparts,
// so neither can drift silently.
import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join, resolve } from 'node:path';
import { IMPORT_LINE } from '../../lib/guidance/check.js';
import { resolveSourceRoot } from '../../lib/guidance/install.js';
import { DOCS_ALLOWED_ARM_PREFIXES, DOCS_ROOT_FILES, parsePackFilePaths } from '../../../scripts/checks/check-package-files.mjs';

const ROOT = resolve(process.cwd());
const CLAUDE_ROOT = resolveSourceRoot('claude');
const BUILT = existsSync(resolve(ROOT, 'dist/index.js'));

describe('packed tarball (needs dist/index.js; run npm run package to unskip)', () => {
  it.skipIf(!BUILT)('npm pack --dry-run lists every file under claude/', () => {
    const out = spawnSync(
      'npm',
      ['pack', '--dry-run', '--json', '--ignore-scripts', '--offline', '--loglevel=silent'],
      { cwd: ROOT, encoding: 'utf8' }
    );
    expect(out.status).toBe(0);

    const packed = new Set(parsePackFilePaths(out.stdout));

    expect(packed.has('claude/CLAUDE.md')).toBe(true);
    expect(packed.has('claude/agents/cairn-extension-reviewer.md')).toBe(true);
    for (const name of [
      'check-cairn.json',
      'cairn-audit.config.json',
      'check.yml',
      'settings-hook.json',
      'claude-md-import.txt',
    ]) {
      expect(packed.has(`claude/snippets/${name}`)).toBe(true);
    }
  });
});

describe('the review agent frontmatter', () => {
  const agentText = readFileSync(join(CLAUDE_ROOT, 'agents/cairn-extension-reviewer.md'), 'utf8');
  const frontmatterMatch = agentText.match(/^---\n([\s\S]*?)\n---/);
  if (!frontmatterMatch) throw new Error('cairn-extension-reviewer.md carries no frontmatter block');
  const frontmatter = frontmatterMatch[1];

  it('carries name, description, and tools: Read, Grep, Glob only', () => {
    expect(frontmatter).toContain('name: cairn-extension-reviewer');
    expect(frontmatter).toContain('description:');
    expect(frontmatter).toContain('tools: Read, Grep, Glob');
  });

  it('names no tool that can write or execute', () => {
    expect(frontmatter).not.toMatch(/\bBash\b/);
    expect(frontmatter).not.toMatch(/\bWrite\b/);
    expect(frontmatter).not.toMatch(/\bEdit\b/);
  });

  it('carries no model or effort pin', () => {
    expect(frontmatter).not.toMatch(/^model:/m);
    expect(frontmatter).not.toMatch(/^effort:/m);
  });
});

describe('claude/snippets/* against their in-repo counterparts', () => {
  it('check-cairn.json parse-equals the seven script entries in the showcase package.json', () => {
    const snippet = JSON.parse(readFileSync(join(CLAUDE_ROOT, 'snippets/check-cairn.json'), 'utf8'));
    const showcase = JSON.parse(readFileSync(resolve(ROOT, 'examples/showcase/package.json'), 'utf8'));
    const keys = [
      'build:admin-css',
      'precheck',
      'prebuild',
      'predev',
      'dev:admin-css',
      'check:cairn',
      'check:cairn:rendered',
    ];
    expect(Object.keys(snippet).sort()).toEqual(keys.slice().sort());
    for (const key of keys) {
      expect(snippet[key]).toBe(showcase.scripts[key]);
    }
  });

  it('cairn-audit.config.json is byte-identical to the showcase copy', () => {
    const snippet = readFileSync(join(CLAUDE_ROOT, 'snippets/cairn-audit.config.json'), 'utf8');
    const source = readFileSync(resolve(ROOT, 'examples/showcase/cairn-audit.config.json'), 'utf8');
    expect(snippet).toBe(source);
  });

  it('check.yml is byte-identical to the showcase workflow', () => {
    const snippet = readFileSync(join(CLAUDE_ROOT, 'snippets/check.yml'), 'utf8');
    const source = readFileSync(
      resolve(ROOT, 'examples/showcase/.github/workflows/check.yml'),
      'utf8'
    );
    expect(snippet).toBe(source);
  });

  it('claude-md-import.txt is the same import line check.ts exposes', () => {
    const snippet = readFileSync(join(CLAUDE_ROOT, 'snippets/claude-md-import.txt'), 'utf8').trim();
    expect(snippet).toBe(IMPORT_LINE);
  });

  it("settings-hook.json is byte-identical to the fragment's own hook block", () => {
    const snippet = readFileSync(join(CLAUDE_ROOT, 'snippets/settings-hook.json'), 'utf8').trim();
    const fragment = readFileSync(join(CLAUDE_ROOT, 'CLAUDE.md'), 'utf8');
    const fenced = fragment.match(/```json\n([\s\S]*?)\n```/);
    if (!fenced) throw new Error('claude/CLAUDE.md carries no fenced json hook block');
    expect(fenced[1]).toBe(snippet);
  });
});

describe('claude/CLAUDE.md word budget and links', () => {
  const fragment = readFileSync(join(CLAUDE_ROOT, 'CLAUDE.md'), 'utf8');

  it('stays under 1500 words', () => {
    const words = fragment.trim().split(/\s+/).filter(Boolean);
    expect(words.length).toBeLessThan(1500);
  });

  it('every node_modules path it names is inside the packed docs allowlist and exists', () => {
    const paths = [...fragment.matchAll(/node_modules\/@glw907\/cairn-cms\/([^\s`)]+)/g)].map(
      (m) => m[1]
    );
    expect(paths.length).toBeGreaterThan(0);

    for (const path of paths) {
      const allowed =
        DOCS_ROOT_FILES.includes(path) ||
        DOCS_ALLOWED_ARM_PREFIXES.some((prefix: string) => path.startsWith(prefix));
      expect(allowed).toBe(true);

      const resolved = resolve(ROOT, path);
      expect(existsSync(resolved)).toBe(true);
    }
  });
});
