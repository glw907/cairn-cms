import { describe, it, expect, vi } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { deriveMissingInputs } from '../../lib/doctor/index.js';
import type { DerivationSources } from '../../lib/doctor/index.js';
import { readAdapterFacts } from '../../lib/vite/internal.js';

const ADAPTER = {
  owner: 'acme',
  repo: 'site',
  from: 'adapter@example.com',
  mediaBucketBinding: 'MEDIA_BUCKET',
};

function sources(overrides: Partial<DerivationSources> = {}): DerivationSources {
  return {
    adapterFacts: async () => ADAPTER,
    wranglerAccountId: async () => 'wrangler-acct',
    ...overrides,
  };
}

describe('deriveMissingInputs', () => {
  it.each([
    {
      name: 'derives from, repo, and the account id when nothing is provided',
      provided: {},
      expected: { from: 'adapter@example.com', repo: 'acme/site', cfAccountId: 'wrangler-acct' },
    },
    {
      name: 'a provided from beats the adapter',
      provided: { from: 'flag@example.com' },
      expected: { from: 'flag@example.com', repo: 'acme/site', cfAccountId: 'wrangler-acct' },
    },
    {
      name: 'a provided repo beats the adapter',
      provided: { repo: 'flag/repo' },
      expected: { from: 'adapter@example.com', repo: 'flag/repo', cfAccountId: 'wrangler-acct' },
    },
    {
      name: 'a provided account id beats the wrangler config',
      provided: { cfAccountId: 'env-acct' },
      expected: { from: 'adapter@example.com', repo: 'acme/site', cfAccountId: 'env-acct' },
    },
  ])('$name', async ({ provided, expected }) => {
    const out = await deriveMissingInputs({ cwd: '/site', ...provided }, sources());
    expect(out).toMatchObject(expected);
  });

  it('never reads the adapter when from, repo, and the media binding are all provided', async () => {
    const adapterFacts = vi.fn(async () => ADAPTER);
    await deriveMissingInputs(
      { cwd: '/site', from: 'a@b.c', repo: 'o/r', mediaBucketBinding: 'MEDIA_BUCKET' },
      sources({ adapterFacts })
    );
    expect(adapterFacts).not.toHaveBeenCalled();
  });

  it('reads the adapter once when both from and repo are missing', async () => {
    const adapterFacts = vi.fn(async () => ADAPTER);
    await deriveMissingInputs({ cwd: '/site' }, sources({ adapterFacts }));
    expect(adapterFacts).toHaveBeenCalledTimes(1);
  });

  it('reads the adapter for the media binding even when from and repo are provided', async () => {
    // The media bucket binding has no env source, so it always needs the adapter read.
    const adapterFacts = vi.fn(async () => ADAPTER);
    const out = await deriveMissingInputs(
      { cwd: '/site', from: 'a@b.c', repo: 'o/r' },
      sources({ adapterFacts })
    );
    expect(adapterFacts).toHaveBeenCalledTimes(1);
    expect(out.mediaBucketBinding).toBe('MEDIA_BUCKET');
  });

  it('never reads the wrangler config when the account id is provided', async () => {
    const wranglerAccountId = vi.fn(async () => 'wrangler-acct');
    await deriveMissingInputs(
      { cwd: '/site', cfAccountId: 'env-acct' },
      sources({ wranglerAccountId })
    );
    expect(wranglerAccountId).not.toHaveBeenCalled();
  });

  it('leaves the inputs absent when the sources yield nothing', async () => {
    const out = await deriveMissingInputs(
      { cwd: '/site' },
      { adapterFacts: async () => null, wranglerAccountId: async () => undefined }
    );
    expect(out.from).toBeUndefined();
    expect(out.repo).toBeUndefined();
    expect(out.cfAccountId).toBeUndefined();
  });

  it('survives throwing sources, leaving the inputs absent', async () => {
    const out = await deriveMissingInputs(
      { cwd: '/site' },
      {
        adapterFacts: async () => {
          throw new Error('vite exploded');
        },
        wranglerAccountId: async () => {
          throw new Error('wrangler.jsonc did not parse');
        },
      }
    );
    expect(out.from).toBeUndefined();
    expect(out.repo).toBeUndefined();
    expect(out.cfAccountId).toBeUndefined();
  });

  it('forms no repo from an owner without a name, and no owner from a name alone', async () => {
    const ownerOnly = await deriveMissingInputs(
      { cwd: '/site' },
      sources({ adapterFacts: async () => ({ owner: 'acme' }) })
    );
    expect(ownerOnly.repo).toBeUndefined();
    const nameOnly = await deriveMissingInputs(
      { cwd: '/site' },
      sources({ adapterFacts: async () => ({ repo: 'site' }) })
    );
    expect(nameOnly.repo).toBeUndefined();
  });

  it('mutates nothing on the context it was given', async () => {
    const ctx = { cwd: '/site' };
    await deriveMissingInputs(ctx, sources());
    expect(ctx).toEqual({ cwd: '/site' });
  });
});

// The derivation's reader evaluates a virtual module through the consumer's own Vite
// resolution, the same machinery the cairn-manifest bin uses, so these tests scaffold
// real temp projects whose vite.config imports the source vite arm by absolute path.
const VITE_ARM = resolve(process.cwd(), 'src/lib/vite/index.ts');

const PLUGIN_CONFIG = `import { cairnManifest } from ${JSON.stringify(VITE_ARM)};
export default {
  plugins: [
    cairnManifest({
      configModule: '/src/lib/cairn.config.ts',
      content: { posts: '/src/content/posts/*.md' },
    }),
  ],
};
`;

function tempProject(files: Record<string, string>): string {
  const dir = mkdtempSync(join(tmpdir(), 'cairn-derive-'));
  for (const [rel, content] of Object.entries(files)) {
    const path = join(dir, rel);
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, content);
  }
  return dir;
}

describe('readAdapterFacts', () => {
  it('returns null when the directory has no Vite config', async () => {
    expect(await readAdapterFacts(tempProject({}))).toBeNull();
  });

  it('returns null when the Vite config has no cairnManifest plugin', async () => {
    const dir = tempProject({ 'vite.config.ts': 'export default { plugins: [] };\n' });
    expect(await readAdapterFacts(dir)).toBeNull();
  }, 30000);

  it('returns null instead of throwing when the config module throws on load', async () => {
    const dir = tempProject({
      'vite.config.ts': PLUGIN_CONFIG,
      'src/lib/cairn.config.ts': "throw new Error('config module exploded');\n",
    });
    expect(await readAdapterFacts(dir)).toBeNull();
  }, 30000);

  it('reads owner, repo, and from off the adapter through the consumer resolution', async () => {
    const dir = tempProject({
      'vite.config.ts': PLUGIN_CONFIG,
      'src/lib/cairn.config.ts': `export const cairn = {
  backend: { kind: 'github-app', owner: 'acme', repo: 'site', branch: 'main' },
  email: { from: 'cms@acme.test' },
};
export const siteConfig = {};
`,
    });
    expect(await readAdapterFacts(dir)).toEqual({
      owner: 'acme',
      repo: 'site',
      from: 'cms@acme.test',
    });
  }, 30000);

  it('reads the media bucketBinding off the adapter assets block', async () => {
    const dir = tempProject({
      'vite.config.ts': PLUGIN_CONFIG,
      'src/lib/cairn.config.ts': `export const cairn = {
  backend: { kind: 'github-app', owner: 'acme', repo: 'site', branch: 'main' },
  email: { from: 'cms@acme.test' },
  media: { bucketBinding: 'MEDIA_BUCKET' },
};
export const siteConfig = {};
`,
    });
    expect(await readAdapterFacts(dir)).toEqual({
      owner: 'acme',
      repo: 'site',
      from: 'cms@acme.test',
      mediaBucketBinding: 'MEDIA_BUCKET',
    });
  }, 30000);

  it('omits adapter fields that are missing or not strings', async () => {
    const dir = tempProject({
      'vite.config.ts': PLUGIN_CONFIG,
      'src/lib/cairn.config.ts': `export const cairn = {
  backend: { kind: 'github-app', owner: 'acme', repo: 42 },
};
export const siteConfig = {};
`,
    });
    expect(await readAdapterFacts(dir)).toEqual({ owner: 'acme' });
  }, 30000);
});
