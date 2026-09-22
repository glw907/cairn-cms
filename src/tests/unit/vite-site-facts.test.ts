// site-facts.json is the cross-language contract: the three adapter-derived values (the media
// bucket binding, the role vocabulary, the AI-crawler posture) a Go process cannot evaluate, since
// only Node can load a site's TypeScript adapter through Vite. This suite proves the shape
// (formatSiteFacts), the absent-versus-stale split checkSiteFacts makes (an upgrading consumer's
// missing file is not drift; a present file that disagrees with the adapter is), and that the
// cairnManifest plugin's buildStart wires both outcomes into the build: exactly one warning on
// absent, a hard error naming the fix on stale. Each buildStart case invokes the real plugin
// object's hooks with a fake Rollup context (warn/error recorded, error rethrown, matching Rollup's
// own `never`-typed contract) rather than a full `vite build`, the same weight
// vite-verify-references.test.ts uses for its own build-time gate.
import { describe, it, expect, afterAll } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import {
  cairnManifest,
  buildManifestFromVite,
  buildSiteFactsFromVite,
  checkSiteFacts,
  formatSiteFacts,
  writeSiteFacts,
  siteFactsAbsentWarning,
} from '../../lib/vite/internal.js';

const WORKTREE = process.cwd();
const VITE_ARM = resolve(process.cwd(), 'src/lib/vite/index.ts');

const OPTS = {
  configModule: '/src/lib/cairn.config.ts',
  content: { posts: '/src/content/posts/*.md', pages: '/src/content/pages/*.md' },
  manifestPath: '/src/content/.cairn/index.json',
  siteFactsPath: '/src/content/.cairn/site-facts.json',
};

function pluginConfig(): string {
  return `import { cairnManifest } from ${JSON.stringify(VITE_ARM)};
export default {
  plugins: [
    cairnManifest(${JSON.stringify(OPTS)}),
  ],
};
`;
}

const ADAPTER_NO_FACTS = `import { defineAdapter, defineFieldset, fields, parseSiteConfig } from '@glw907/cairn-cms';
export const cairn = defineAdapter({
  rendering: { render: ({ body }) => Promise.resolve(body) },
  email: { from: 'cms@test.example' },
  content: {
    posts: { dir: 'src/content/posts', fields: defineFieldset({ title: fields.text({ label: 'Title', required: true }) }) },
    pages: { dir: 'src/content/pages', fields: defineFieldset({ title: fields.text({ label: 'Title', required: true }) }) },
  },
});
export const siteConfig = parseSiteConfig('siteName: Test\\n');
`;

const ADAPTER_FULL = `import { defineAdapter, defineFieldset, fields, parseSiteConfig } from '@glw907/cairn-cms';
export const cairn = defineAdapter({
  rendering: { render: ({ body }) => Promise.resolve(body) },
  email: { from: 'cms@test.example' },
  backend: { kind: 'github-app', owner: 'acme', repo: 'site', branch: 'main' },
  media: { bucketBinding: 'MEDIA_BUCKET' },
  roles: { owner: 'owner', instructor: { capability: 'editor', home: '/admin/schedule' } },
  aiPosture: 'decline',
  content: {
    posts: { dir: 'src/content/posts', fields: defineFieldset({ title: fields.text({ label: 'Title', required: true }) }) },
    pages: { dir: 'src/content/pages', fields: defineFieldset({ title: fields.text({ label: 'Title', required: true }) }) },
  },
});
export const siteConfig = parseSiteConfig('siteName: Test\\n');
`;

const ADAPTER_FULL_DRIFTED = ADAPTER_FULL.replace("bucketBinding: 'MEDIA_BUCKET'", "bucketBinding: 'OTHER_BUCKET'");

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

async function seedManifest(dir: string): Promise<void> {
  const serialized = await buildManifestFromVite(OPTS, dir);
  const out = join(dir, 'src/content/.cairn/index.json');
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, serialized);
}

/** A fake Rollup plugin context recording warn/error calls, error rethrown as buildStart itself does. */
function fakeContext(): { warn: (m: unknown) => void; error: (m: unknown) => never; warnings: string[] } {
  const warnings: string[] = [];
  return {
    warnings,
    warn: (m: unknown) => {
      warnings.push(typeof m === 'string' ? m : String((m as { message?: string }).message ?? m));
    },
    error: (m: unknown) => {
      throw new Error(typeof m === 'string' ? m : String((m as { message?: string }).message ?? m));
    },
  };
}

describe('formatSiteFacts', () => {
  it('writes {"version": 1} and nothing else when the adapter declares no facts', () => {
    const raw = formatSiteFacts({});
    expect(JSON.parse(raw)).toEqual({ version: 1 });
  });

  it('carries exactly the declared fields, in a stable order, with a trailing newline', () => {
    const raw = formatSiteFacts({
      mediaBucketBinding: 'MEDIA_BUCKET',
      roles: { owner: 'owner' },
      aiPosture: 'decline',
    });
    expect(Object.keys(JSON.parse(raw))).toEqual(['version', 'mediaBucketBinding', 'roles', 'aiPosture']);
    expect(raw.endsWith('\n')).toBe(true);
  });
});

describe('buildSiteFactsFromVite', () => {
  it('produces {"version": 1} only for an adapter with no media, roles, or posture', async () => {
    const dir = tempProject({
      'vite.config.ts': pluginConfig(),
      'src/lib/cairn.config.ts': ADAPTER_NO_FACTS,
    });
    const raw = await buildSiteFactsFromVite(OPTS, dir);
    expect(JSON.parse(raw)).toEqual({ version: 1 });
  }, 30000);

  it('never writes owner, repo, or from, even though the adapter declares them', async () => {
    const dir = tempProject({
      'vite.config.ts': pluginConfig(),
      'src/lib/cairn.config.ts': ADAPTER_FULL,
    });
    const raw = await buildSiteFactsFromVite(OPTS, dir);
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    expect(Object.keys(parsed).sort()).toEqual(['aiPosture', 'mediaBucketBinding', 'roles', 'version']);
    // Nothing at the top level names the three dropped fields; a nested role id happening to be
    // named "owner" (asserted in the adapter fixture) is not the same claim, so this checks the
    // top-level key set only, which the line above already pins exactly.
    expect(parsed).not.toHaveProperty('owner');
    expect(parsed).not.toHaveProperty('repo');
    expect(parsed).not.toHaveProperty('from');
  }, 30000);
});

describe('checkSiteFacts', () => {
  it('reports absent, never stale, when no file has been committed yet', async () => {
    const dir = tempProject({
      'vite.config.ts': pluginConfig(),
      'src/lib/cairn.config.ts': ADAPTER_FULL,
    });
    await expect(checkSiteFacts(OPTS, dir)).resolves.toEqual({ status: 'absent' });
  }, 30000);

  it('reports stale, naming the fix, when the committed file no longer matches the adapter', async () => {
    const dir = tempProject({
      'vite.config.ts': pluginConfig(),
      'src/lib/cairn.config.ts': ADAPTER_FULL,
    });
    await writeSiteFacts(dir);
    writeFileSync(join(dir, 'src/lib/cairn.config.ts'), ADAPTER_FULL_DRIFTED);
    const result = await checkSiteFacts(OPTS, dir);
    expect(result.status).toBe('stale');
    if (result.status === 'stale') {
      expect(result.message).toMatch(/site-facts\.json is stale/);
      expect(result.message).toMatch(/npx cairn-manifest/);
    }
  }, 30000);

  it('reports ok when the committed file matches the adapter, including right after a regenerate', async () => {
    const dir = tempProject({
      'vite.config.ts': pluginConfig(),
      'src/lib/cairn.config.ts': ADAPTER_FULL,
    });
    await writeSiteFacts(dir);
    await expect(checkSiteFacts(OPTS, dir)).resolves.toEqual({ status: 'ok' });
  }, 30000);
});

describe('cairnManifest buildStart, the site-facts arms', () => {
  it('the absent arm: the build succeeds with exactly one warning naming cairn-manifest', async () => {
    const dir = tempProject({
      'vite.config.ts': pluginConfig(),
      'src/lib/cairn.config.ts': ADAPTER_FULL,
    });
    await seedManifest(dir);
    const plugin = cairnManifest(OPTS);
    (plugin.configResolved as (c: { root: string }) => void)({ root: dir });
    const ctx = fakeContext();
    await expect((plugin.buildStart as (this: unknown) => Promise<void>).call(ctx)).resolves.toBeUndefined();
    expect(ctx.warnings).toHaveLength(1);
    expect(ctx.warnings[0]).toBe(siteFactsAbsentWarning('src/content/.cairn/site-facts.json'));
    expect(ctx.warnings[0]).toMatch(/cairn-manifest/);
  }, 30000);

  it('the stale arm: the build fails through the same this.error path as the manifest', async () => {
    const dir = tempProject({
      'vite.config.ts': pluginConfig(),
      'src/lib/cairn.config.ts': ADAPTER_FULL,
    });
    await seedManifest(dir);
    await writeSiteFacts(dir);
    writeFileSync(join(dir, 'src/lib/cairn.config.ts'), ADAPTER_FULL_DRIFTED);
    // Re-seed the manifest against the drifted adapter so the manifest gate stays green and the
    // build-start failure this test asserts on is the site-facts gate, not the manifest gate.
    await seedManifest(dir);
    const plugin = cairnManifest(OPTS);
    (plugin.configResolved as (c: { root: string }) => void)({ root: dir });
    const ctx = fakeContext();
    await expect((plugin.buildStart as (this: unknown) => Promise<void>).call(ctx)).rejects.toThrow(
      /site-facts\.json is stale/,
    );
  }, 30000);
});
