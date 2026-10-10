// The build path applies the nested-image rule: the generated verify source must hand verifyManifest
// the adapter, because the rule keys on the concepts the adapter declares. A unit call to
// verifyManifest cannot prove that wiring, so this scaffolds a real temp Vite project (the pattern of
// vite-verify-references.test.ts) whose adapter declares array(image) over a corpus with gallery
// references, and drives verifyManifestFromVite over a committed manifest that predates mediaRefs.
// It imports @glw907/cairn-cms (the dist), so it exercises the verify-mode source the plugin runs in
// buildStart.
import { describe, it, expect, afterAll } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { verifyManifestFromVite, buildManifestFromVite } from '../../lib/vite/internal.js';

const VITE_ARM = resolve(process.cwd(), 'src/lib/vite/index.ts');

const PLUGIN_CONFIG = `import { cairnManifest } from ${JSON.stringify(VITE_ARM)};
export default {
  plugins: [
    cairnManifest({
      configModule: '/src/lib/cairn.config.ts',
      content: { posts: '/src/content/posts/*.md' },
      manifestPath: '/src/content/.cairn/index.json',
    }),
  ],
};
`;

const adapter = (extraField: string) => `import { defineAdapter, defineFieldset, fields, parseSiteConfig } from '@glw907/cairn-cms';
export const cairn = defineAdapter({
  rendering: { render: ({ body }) => Promise.resolve(body) },
  email: { from: 'cms@test.example' },
  content: {
    posts: {
      dir: 'src/content/posts',
      fields: defineFieldset({
        title: fields.text({ label: 'Title', required: true }),
        ${extraField}
      }),
    },
  },
});
export const siteConfig = parseSiteConfig('siteName: Test\\n');
`;

const GALLERY_ADAPTER = adapter("gallery: fields.array(fields.image({ label: 'Image' })),");
const HERO_ADAPTER = adapter("hero: fields.image({ label: 'Hero' }),");

const GALLERY_POST =
  '---\ntitle: Hello\ngallery:\n  - src: media:a.00112233445566aa\n    alt: A cairn\n---\nBody.\n';
const HERO_POST = '---\ntitle: Hello\nhero:\n  src: media:a.00112233445566aa\n  alt: A cairn\n---\nBody.\n';

const OPTS = {
  configModule: '/src/lib/cairn.config.ts',
  content: { posts: '/src/content/posts/*.md' },
  manifestPath: '/src/content/.cairn/index.json',
};

const made: string[] = [];

function tempProject(files: Record<string, string>): string {
  const dir = mkdtempSync(join(process.cwd(), '.cairn-vite-test-'));
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

/** Commit the manifest the corpus builds, with every `mediaRefs` key removed: a manifest generated
 *  before the field existed. */
async function seedPreFieldManifest(dir: string): Promise<void> {
  const built = JSON.parse(await buildManifestFromVite(OPTS, dir)) as { entries: Record<string, unknown>[] };
  for (const entry of built.entries) delete entry.mediaRefs;
  const out = join(dir, 'src/content/.cairn/index.json');
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, `${JSON.stringify(built, null, 2)}\n`);
}

describe('the nested-image rule on the build path', () => {
  it('rejects a pre-field manifest when the adapter declares array(image) and the corpus has gallery refs', async () => {
    const dir = tempProject({
      'vite.config.ts': PLUGIN_CONFIG,
      'src/lib/cairn.config.ts': GALLERY_ADAPTER,
      'src/content/posts/hello.md': GALLERY_POST,
    });
    await seedPreFieldManifest(dir);
    expect(readFileSync(join(dir, 'src/content/.cairn/index.json'), 'utf8')).not.toContain('mediaRefs');
    await expect(verifyManifestFromVite(OPTS, dir)).rejects.toThrow(/Regenerate/);
  }, 30000);

  it('still accepts a pre-field manifest when the adapter declares only top-level image fields', async () => {
    const dir = tempProject({
      'vite.config.ts': PLUGIN_CONFIG,
      'src/lib/cairn.config.ts': HERO_ADAPTER,
      'src/content/posts/hello.md': HERO_POST,
    });
    await seedPreFieldManifest(dir);
    await expect(verifyManifestFromVite(OPTS, dir)).resolves.toBeUndefined();
  }, 30000);
});
