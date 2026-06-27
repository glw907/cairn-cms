// verifyReferences is the only integrity authority for frontmatter references (they have no
// prerender backstop the way body links do), so it must run inside the GENERATED virtual-module
// source, where `built` is in scope, not at the verifyManifestFromVite TS call site. A unit call to
// verifyReferences cannot prove that wiring. This test scaffolds a real temp Vite project (mirroring
// the doctor-derive harness) whose adapter declares a reference field and whose one content file
// holds a dangling edge, then drives verifyManifestFromVite over it and asserts the BUILD path
// rejects. It imports @glw907/cairn-cms (the dist), so it exercises the verify-mode resultExpr the
// plugin runs in buildStart.
import { describe, it, expect, afterAll } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { verifyManifestFromVite, buildManifestFromVite, readAdapterFacts } from '../../lib/vite/index.js';

// The temp project's nested Vite must resolve `@glw907/cairn-cms` (and its subpaths), which the
// generated virtual module imports. That package lives only in the repo's own node_modules (a
// self-symlink to the worktree root), so the temp project is rooted INSIDE the worktree, not in the
// OS tmpdir: Vite then walks up to the repo node_modules. The .cairn-vite-test-* prefix is gitignored.
const WORKTREE = process.cwd();

const VITE_ARM = resolve(process.cwd(), 'src/lib/vite/index.ts');

const PLUGIN_CONFIG = `import { cairnManifest } from ${JSON.stringify(VITE_ARM)};
export default {
  plugins: [
    cairnManifest({
      configModule: '/src/lib/cairn.config.ts',
      content: { posts: '/src/content/posts/*.md', pages: '/src/content/pages/*.md' },
      manifestPath: '/src/content/.cairn/index.json',
    }),
  ],
};
`;

const ADAPTER = `import { defineAdapter, fieldset, fields, parseSiteConfig } from '@glw907/cairn-cms';
export const cairn = defineAdapter({
  rendering: { render: (md) => md },
  email: { from: 'cms@test.example' },
  media: { bucketBinding: 'MEDIA_BUCKET' },
  content: {
    posts: {
      dir: 'src/content/posts',
      fields: fieldset({
        title: fields.text({ label: 'Title', required: true }),
        author: fields.reference({ concept: 'pages', label: 'Author' }),
      }),
    },
    pages: {
      dir: 'src/content/pages',
      fields: fieldset({ title: fields.text({ label: 'Title', required: true }) }),
    },
  },
});
export const siteConfig = parseSiteConfig('siteName: Test\\n');
`;

const made: string[] = [];

function tempProject(files: Record<string, string>): string {
  const dir = mkdtempSync(join(WORKTREE, '.cairn-vite-test-'));
  made.push(dir);
  for (const [rel, content] of Object.entries(files)) {
    const path = join(dir, rel);
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, content);
  }
  return dir;
}

afterAll(() => {
  for (const dir of made) rmSync(dir, { recursive: true, force: true });
});

const OPTS = {
  configModule: '/src/lib/cairn.config.ts',
  content: { posts: '/src/content/posts/*.md', pages: '/src/content/pages/*.md' },
  manifestPath: '/src/content/.cairn/index.json',
};

// Seed the committed manifest from the corpus itself, so verifyManifest (which runs FIRST in the
// verify-mode resultExpr) passes and the build reaches verifyReferences. buildManifestFromVite (write
// mode) does NOT run verifyReferences, so it happily serializes a manifest that still carries a
// dangling edge, which is exactly what the dangling test needs to isolate the reference gate.
async function seedManifest(dir: string): Promise<void> {
  const serialized = await buildManifestFromVite(OPTS, dir);
  const out = join(dir, 'src/content/.cairn/index.json');
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, serialized);
}

describe('verifyReferences wired into the manifest build', () => {
  it('rejects the build when a frontmatter reference points at a missing target', async () => {
    const dir = tempProject({
      'vite.config.ts': PLUGIN_CONFIG,
      'src/lib/cairn.config.ts': ADAPTER,
      // ghost-id is a well-formed id (so the entry validates and is built) but no pages/ghost-id
      // entry exists, so the build-time verifyReferences gate must reject.
      'src/content/posts/hello.md': '---\ntitle: Hello\nauthor: ghost-id\n---\nBody.\n',
    });
    await seedManifest(dir);
    await expect(verifyManifestFromVite(OPTS, dir)).rejects.toThrow(/pages\/ghost-id/);
  }, 30000);

  it('accepts the build when every frontmatter reference resolves', async () => {
    const dir = tempProject({
      'vite.config.ts': PLUGIN_CONFIG,
      'src/lib/cairn.config.ts': ADAPTER,
      'src/content/posts/hello.md': '---\ntitle: Hello\nauthor: jane-doe\n---\nBody.\n',
      'src/content/pages/jane-doe.md': '---\ntitle: Jane Doe\n---\nBio.\n',
    });
    await seedManifest(dir);
    await expect(verifyManifestFromVite(OPTS, dir)).resolves.toBeUndefined();
  }, 30000);
});

// The type checker cannot parse the string-templated adapter-facts virtual module, so this end-to-end
// read against a v2-shaped adapter (email/media groups) is the net that the moved reads still resolve.
describe('readAdapterFacts reads the v2 adapter groups', () => {
  it('derives from off cairn.email and mediaBucketBinding off cairn.media', async () => {
    const dir = tempProject({
      'vite.config.ts': PLUGIN_CONFIG,
      'src/lib/cairn.config.ts': ADAPTER,
    });
    const facts = await readAdapterFacts(dir);
    expect(facts?.from).toBe('cms@test.example');
    expect(facts?.mediaBucketBinding).toBe('MEDIA_BUCKET');
  }, 30000);
});
