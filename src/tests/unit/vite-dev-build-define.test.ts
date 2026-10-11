// The cairnManifest plugin's `config` hook supplies `__CAIRN_DEV_BUILD__`, the build-time half of
// the dev-backend gate. The define decides whether a handle that mints owner sessions compiles into
// a deployed Worker, so each case pins one way it could fold the wrong direction: the default build
// must read false, `vite dev` and an explicit VITE_CAIRN_E2E=1 opt-in must read true, and a define
// the site already set must survive whichever plugin order Vite merges the hooks in.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { mkdtempSync, mkdirSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { resolveConfig, type Plugin } from 'vite';
import { cairnManifest } from '../../lib/vite/internal.js';

const OPTS = {
  configModule: '/src/lib/cairn.config.ts',
  content: { posts: '/src/content/posts/*.md' },
  manifestPath: '/src/content/.cairn/index.json',
};

const REPO_ROOT = resolve(import.meta.dirname, '../../..');

type ConfigHook = (
  config: Record<string, unknown>,
  env: { command: 'build' | 'serve'; mode: string },
) => Promise<{ define?: Record<string, string> } | undefined>;

/** Run the plugin's `config` hook the way Vite does, returning the define it contributes. */
async function defineFor(command: 'build' | 'serve', mode: string, config: Record<string, unknown> = {}) {
  const hook = cairnManifest(OPTS).config as unknown as ConfigHook;
  const result = await hook(config, { command, mode });
  return result?.define?.__CAIRN_DEV_BUILD__;
}

const scratch: string[] = [];

/** A throwaway app root whose `vite` resolves to the repo's, holding the named env files. */
function appRootWith(envFiles: Record<string, string>): string {
  const root = mkdtempSync(join(tmpdir(), 'cairn-dev-define-'));
  scratch.push(root);
  mkdirSync(join(root, 'node_modules'));
  symlinkSync(join(REPO_ROOT, 'node_modules/vite'), join(root, 'node_modules/vite'));
  writeFileSync(join(root, 'package.json'), '{"name":"scratch","type":"module"}');
  for (const [name, text] of Object.entries(envFiles)) writeFileSync(join(root, name), text);
  return root;
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  for (const dir of scratch.splice(0)) rmSync(dir, { recursive: true, force: true });
});

describe('cairnManifest config hook, __CAIRN_DEV_BUILD__', () => {
  it('is true while Vite serves', async () => {
    vi.stubEnv('VITE_CAIRN_E2E', undefined);
    expect(await defineFor('serve', 'development')).toBe('true');
  });

  it('is false in a default build', async () => {
    vi.stubEnv('VITE_CAIRN_E2E', undefined);
    vi.spyOn(process, 'cwd').mockReturnValue(appRootWith({}));
    expect(await defineFor('build', 'production')).toBe('false');
  });

  it('is true in a build when VITE_CAIRN_E2E=1 is in the process env', async () => {
    vi.stubEnv('VITE_CAIRN_E2E', '1');
    vi.spyOn(process, 'cwd').mockReturnValue(appRootWith({}));
    expect(await defineFor('build', 'production')).toBe('true');
  });

  it('is true in a build when only a .env.production file sets the flag', async () => {
    vi.stubEnv('VITE_CAIRN_E2E', undefined);
    vi.spyOn(process, 'cwd').mockReturnValue(appRootWith({ '.env.production': 'VITE_CAIRN_E2E=1\n' }));
    expect(await defineFor('build', 'production')).toBe('true');
  });

  it.each(['0', '', 'true'])('is false in a build when VITE_CAIRN_E2E is %j', async (value) => {
    vi.stubEnv('VITE_CAIRN_E2E', value);
    vi.spyOn(process, 'cwd').mockReturnValue(appRootWith({}));
    expect(await defineFor('build', 'production')).toBe('false');
  });

  it('leaves a define the config already carries alone', async () => {
    vi.stubEnv('VITE_CAIRN_E2E', '1');
    vi.spyOn(process, 'cwd').mockReturnValue(appRootWith({}));
    expect(await defineFor('build', 'production', { define: { __CAIRN_DEV_BUILD__: 'false' } })).toBeUndefined();
  });
});

describe('cairnManifest config hook, plugin order', () => {
  const sitePlugin: Plugin = {
    name: 'site-dev-build-define',
    config: () => ({ define: { __CAIRN_DEV_BUILD__: 'false' } }),
  };

  /** The define a resolved build config carries, with the plugins in the given order. */
  async function resolvedDefine(plugins: Plugin[]) {
    vi.stubEnv('VITE_CAIRN_E2E', '1');
    const resolved = await resolveConfig(
      { configFile: false, root: REPO_ROOT, logLevel: 'silent', plugins },
      'build',
    );
    return resolved.define?.__CAIRN_DEV_BUILD__;
  }

  it('keeps a site-set false when the engine plugin runs first', async () => {
    expect(await resolvedDefine([cairnManifest(OPTS), sitePlugin])).toBe('false');
  });

  it('keeps a site-set false when the engine plugin runs second', async () => {
    expect(await resolvedDefine([sitePlugin, cairnManifest(OPTS)])).toBe('false');
  });

  it('supplies the define when the site sets none', async () => {
    expect(await resolvedDefine([cairnManifest(OPTS)])).toBe('true');
  });
});
