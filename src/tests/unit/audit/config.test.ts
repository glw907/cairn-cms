import { describe, it, expect } from 'vitest';
import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import {
  DEFAULT_ADMIN_SCOPE,
  DEFAULT_PALETTE_CSS_FILES,
  DEFAULT_PUBLIC_EXCLUDE,
  DEFAULT_PUBLIC_SCOPE,
  DEFAULT_PUBLIC_STYLESHEETS,
  DEFAULT_SHEET_CANDIDATES,
  DEFAULT_STATIC_SCOPE,
  DEFAULT_THEME_ROOTS,
  isPublicFile,
  parseArgs,
  resolveConfig,
} from '../../../lib/audit/config.js';

describe('DEFAULT_STATIC_SCOPE', () => {
  // The Phase 1 finding: a rendering surface's absence from the stylesheet scan roots silently
  // broke a shipped class (the retired admin-fields subpath, before its C2 merge into
  // admin-toolkit). The audit's default scope carries the same roots the build and the class gate
  // scan.
  it('carries every surface that renders inside the admin theme', () => {
    expect(DEFAULT_STATIC_SCOPE).toContain('src/lib/admin-toolkit');
    expect(DEFAULT_STATIC_SCOPE).toContain('src/lib/admin');
  });

  it("carries the consumer site's admin routes", () => {
    expect(DEFAULT_STATIC_SCOPE).toContain('src/routes/admin');
  });
});

describe('DEFAULT_ADMIN_SCOPE', () => {
  // The engine's own admin barrel renders only the admin's own views, never a site's shared public
  // components, so an adminOnly motion rule reading it gates no public design: DEFAULT_ADMIN_SCOPE
  // now agrees with DEFAULT_STATIC_SCOPE by default, and a site narrows one away from the other
  // only by naming static.adminScope itself.
  it('agrees with DEFAULT_STATIC_SCOPE by default', () => {
    expect(DEFAULT_ADMIN_SCOPE).toEqual(DEFAULT_STATIC_SCOPE);
  });

  it('carries the three admin surfaces', () => {
    expect(DEFAULT_ADMIN_SCOPE).toContain('src/routes/admin');
    expect(DEFAULT_ADMIN_SCOPE).toContain('src/lib/admin');
    expect(DEFAULT_ADMIN_SCOPE).toContain('src/lib/admin-toolkit');
  });
});

describe('DEFAULT_PALETTE_CSS_FILES', () => {
  // The engine's own admin stylesheet is the declared palette (and grammar) declaration site;
  // token-colors reads this list rather than carrying its own filename special case for it.
  it('names the admin stylesheet as the engine\'s one declared palette site', () => {
    expect(DEFAULT_PALETTE_CSS_FILES).toContain('src/lib/admin/cairn-admin.css');
  });
});

describe('resolveConfig', () => {
  const sheetHere = (path: string) => path === DEFAULT_SHEET_CANDIDATES[0];

  it('defaults every field when the consumer wrote no config file', () => {
    const config = resolveConfig('/site', null, sheetHere);
    expect(config.root).toBe('/site');
    expect(config.staticScope).toEqual(DEFAULT_STATIC_SCOPE);
    expect(config.sheetPaths).toEqual([DEFAULT_SHEET_CANDIDATES[0]]);
    expect(config.staticCssFiles).toEqual([]);
    expect(config.paletteCssFiles).toEqual(DEFAULT_PALETTE_CSS_FILES);
  });

  it('takes a declared palette site list from the config file, replacing the default', () => {
    const config = resolveConfig(
      '/site',
      { static: { paletteFiles: ['src/theme/theme.css'] } },
      sheetHere
    );
    expect(config.paletteCssFiles).toEqual(['src/theme/theme.css']);
  });

  it('falls back to the installed package sheet when the local build is absent', () => {
    const config = resolveConfig('/site', null, (path) => path === DEFAULT_SHEET_CANDIDATES[1]);
    expect(config.sheetPaths).toEqual([DEFAULT_SHEET_CANDIDATES[1]]);
  });

  it('keeps the first candidate when no candidate exists, so the run fails naming a path', () => {
    const config = resolveConfig('/site', null, () => false);
    expect(config.sheetPaths).toEqual([DEFAULT_SHEET_CANDIDATES[0]]);
  });

  it('takes the scan scope and the sheet from the config file, and ignores a leftover rendered key', () => {
    const config = resolveConfig(
      '/site',
      {
        static: { scope: ['src/routes/office'] },
        sheet: 'build/admin.css',
        rendered: { pages: ['/admin'] },
      },
      sheetHere
    );
    expect(config.staticScope).toEqual(['src/routes/office']);
    expect(config.sheetPaths).toEqual(['build/admin.css']);
    expect(config).not.toHaveProperty('renderedPages');
  });

  // The ledger's ruled shape: `sheet` is a list of compiled-class sources, exactly as
  // `paletteFiles` and `cssFiles` already are, so a site's own compiled stylesheet joins the
  // packaged one instead of needing case-by-case exemption from no-uncompiled-class.
  it('takes a list of compiled-class sources from a list-valued sheet', () => {
    const config = resolveConfig(
      '/site',
      { sheet: ['dist/admin/cairn-admin.css', 'src/theme/site.css'] },
      sheetHere
    );
    expect(config.sheetPaths).toEqual(['dist/admin/cairn-admin.css', 'src/theme/site.css']);
  });

  it('rejects a sheet that is neither a path nor a list of paths', () => {
    expect(() => resolveConfig('/site', { sheet: 42 }, sheetHere)).toThrow(/sheet/);
  });

  it('records whether the scan scope came from the config or from the defaults', () => {
    expect(resolveConfig('/site', null, sheetHere).staticScopeFromConfig).toBe(false);
    const configured = resolveConfig('/site', { static: { scope: ['src/x'] } }, sheetHere);
    expect(configured.staticScopeFromConfig).toBe(true);
  });

  it('rejects a scan scope that is not a list of paths', () => {
    expect(() => resolveConfig('/site', { static: { scope: 'src' } }, sheetHere)).toThrow(
      /static\.scope/
    );
  });
});

describe('the public scope', () => {
  const sheetHere = (path: string) => path === DEFAULT_SHEET_CANDIDATES[0];
  const resolve_ = (raw: unknown) => resolveConfig('/site', raw, sheetHere);

  it('defaults its roots, its exclusion, its theme roots, and its stylesheets', () => {
    const config = resolve_(null);
    expect(config.publicScope).toEqual(DEFAULT_PUBLIC_SCOPE);
    expect(DEFAULT_PUBLIC_SCOPE).toEqual([
      'src/theme',
      'src/chassis',
      'src/routes',
      'src/lib/public',
      'src/lib/components',
    ]);
    expect(config.publicExclude).toEqual(DEFAULT_PUBLIC_EXCLUDE);
    expect(DEFAULT_PUBLIC_EXCLUDE).toEqual(['src/routes/admin']);
    expect(config.themeRoots).toEqual(DEFAULT_THEME_ROOTS);
    expect(DEFAULT_THEME_ROOTS).toEqual(['src/theme', 'src/chassis/tokens.css']);
    expect(config.publicStylesheets).toEqual(DEFAULT_PUBLIC_STYLESHEETS);
    expect(DEFAULT_PUBLIC_STYLESHEETS).toEqual(['src/theme/theme.css']);
    expect(config.publicScopeFromConfig).toBe(false);
  });

  it('replaces the roots from public.scope, and merges public.exclude with the default', () => {
    const config = resolve_({ public: { scope: ['src/site'], exclude: ['src/site/private'] } });
    expect(config.publicScope).toEqual(['src/site']);
    expect(config.publicScopeFromConfig).toBe(true);
    expect(config.publicExclude).toEqual(['src/routes/admin', 'src/site/private']);
  });

  it('takes public.themeRoots and public.stylesheets from the config, replacing the defaults', () => {
    const config = resolve_({
      public: { themeRoots: ['src/look'], stylesheets: ['src/look/index.css'] },
    });
    expect(config.themeRoots).toEqual(['src/look']);
    expect(config.publicStylesheets).toEqual(['src/look/index.css']);
  });

  it.each(['scope', 'exclude', 'themeRoots', 'stylesheets'])('rejects a public.%s that is not a list of paths', (key) => {
    expect(() => resolve_({ public: { [key]: 'src' } })).toThrow(new RegExp(`public\\.${key}`));
  });

  // The two default root sets are disjoint once the default exclusion applies: no default admin
  // root is claimed by the public scope, and every default public root claims a file.
  it('keeps the two default root sets disjoint after the default exclusion', () => {
    const config = resolve_(null);
    for (const root of [...DEFAULT_STATIC_SCOPE, ...DEFAULT_ADMIN_SCOPE]) {
      expect(isPublicFile(config, `${root}/Fixture.svelte`)).toBe(false);
    }
    for (const root of DEFAULT_PUBLIC_SCOPE.filter((entry) => !DEFAULT_PUBLIC_EXCLUDE.includes(entry))) {
      expect(isPublicFile(config, `${root}/Fixture.svelte`)).toBe(true);
    }
    expect(isPublicFile(config, 'src/routes/blog/+page.svelte')).toBe(true);
    expect(isPublicFile(config, 'src/routes/admin/posts/+page.svelte')).toBe(false);
  });

  // A root a site names for the admin scope leaves the public defaults, in both keys that name one.
  it.each([
    ['static.scope', { static: { scope: ['src/routes/admin', 'src/lib/components'] } }],
    ['static.adminScope', { static: { adminScope: ['src/lib/components'] } }],
  ])('drops a root named under %s from the public defaults', (_key, raw) => {
    const config = resolve_(raw);
    expect(config.publicScope).not.toContain('src/lib/components');
    expect(config.publicScope).toContain('src/theme');
    expect(isPublicFile(config, 'src/lib/components/Widget.svelte')).toBe(false);
  });

  // The other direction: a root named under public.scope leaves the admin defaults, so the file
  // answers to the public grammar alone.
  it('drops a root named under public.scope from the admin defaults', () => {
    const config = resolve_({ public: { scope: ['src/lib/admin-toolkit', 'src/theme'] } });
    expect(config.staticScope).toEqual(['src/routes/admin', 'src/lib/admin']);
    expect(config.adminScope).toEqual(['src/routes/admin', 'src/lib/admin']);
    expect(config.staticScopeFromConfig).toBe(false);
    expect(isPublicFile(config, 'src/lib/admin-toolkit/Field.svelte')).toBe(true);
  });

  it('keeps a configured static.scope whole when public.scope names one of its roots', () => {
    const config = resolve_({
      static: { scope: ['src/lib/admin-toolkit'] },
      public: { scope: ['src/lib/admin-toolkit', 'src/theme'] },
    });
    expect(config.staticScope).toEqual(['src/lib/admin-toolkit']);
    expect(isPublicFile(config, 'src/lib/admin-toolkit/Field.svelte')).toBe(false);
  });

  // A consumer who broadens the public scope to the whole source tree must not move admin files
  // from the error-tier admin rules to the advisory public one.
  it('never claims a file under an admin root, however wide public.scope is or whatever public.exclude says', () => {
    for (const raw of [
      { public: { scope: ['src'] } },
      { public: { exclude: ['src/nothing'] } },
      { public: { scope: ['src'], exclude: ['src/nothing'] } },
      { static: { scope: ['src/routes/admin', 'src/lib/components'] }, public: { scope: ['src'] } },
      { static: { adminScope: ['src/screens'] }, public: { scope: ['src'] } },
    ]) {
      const config = resolve_(raw);
      expect(isPublicFile(config, 'src/routes/admin/posts/+page.svelte')).toBe(false);
      expect(isPublicFile(config, 'src/lib/admin/Shell.svelte')).toBe(false);
    }
    const widened = resolve_({ static: { adminScope: ['src/screens'] }, public: { scope: ['src'] } });
    expect(isPublicFile(widened, 'src/screens/Office.svelte')).toBe(false);
    expect(isPublicFile(widened, 'src/theme/theme.css')).toBe(true);
  });

  it('does not claim a standalone CSS file the config names under static.cssFiles', () => {
    const config = resolve_({ static: { cssFiles: ['src/theme/site.css'] } });
    expect(isPublicFile(config, 'src/theme/site.css')).toBe(false);
    expect(isPublicFile(config, 'src/theme/theme.css')).toBe(true);
  });

  it('keeps a default admin root in the admin scope when public.scope names it and an exclusion covers it', () => {
    const config = resolve_({ public: { scope: ['src/theme', 'src/routes/admin', 'src/routes/blog'] } });
    expect(config.staticScope).toContain('src/routes/admin');
    expect(config.adminScope).toContain('src/routes/admin');
    expect(isPublicFile(config, 'src/routes/admin/+page.svelte')).toBe(false);
    expect(isPublicFile(config, 'src/routes/blog/+page.svelte')).toBe(true);
  });

  it.each([
    ['is', ['src/theme', 'src/site/private']],
    ['lies under', ['src/theme', 'src/site/private/drafts']],
  ])('throws when a configured public root %s an exclusion no admin root reads', (_relation, scope) => {
    expect(() => resolve_({ public: { scope, exclude: ['src/site/private'] } })).toThrow(
      /src\/site\/private.*public\.exclude/
    );
  });

  it('normalizes every configured path: no leading ./, no trailing /, no doubled /', () => {
    const config = resolve_({
      static: { scope: ['./src/routes/admin/', 'src//lib/components'], adminScope: ['./src/lib/admin'], cssFiles: ['./src/theme/site.css'] },
      public: { scope: ['./src/theme/', 'src//routes'], exclude: ['src/routes/private/'], themeRoots: ['./src/theme'], stylesheets: ['./src/theme/theme.css'] },
    });
    expect(config.staticScope).toEqual(['src/routes/admin', 'src/lib/components']);
    expect(config.adminScope).toEqual(['src/lib/admin']);
    expect(config.staticCssFiles).toEqual(['src/theme/site.css']);
    expect(config.publicScope).toEqual(['src/theme', 'src/routes']);
    expect(config.publicExclude).toEqual(['src/routes/admin', 'src/routes/private']);
    expect(config.themeRoots).toEqual(['src/theme']);
    expect(config.publicStylesheets).toEqual(['src/theme/theme.css']);
  });

  it('keeps a path above the root as written once normalized', () => {
    const config = resolve_({ public: { scope: ['../../src/lib/public/', 'src/theme'] } });
    expect(config.publicScope).toEqual(['../../src/lib/public', 'src/theme']);
  });

  it('honors public.exclude for a file under a public root', () => {
    const config = resolve_({ public: { scope: ['src/site'], exclude: ['src/site/private'] } });
    expect(isPublicFile(config, 'src/site/private/Secret.svelte')).toBe(false);
    expect(isPublicFile(config, 'src/site/Page.svelte')).toBe(true);
  });
});

describe('parseArgs', () => {
  it('reads a bare invocation as the static audit', () => {
    expect(parseArgs([])).toEqual({});
  });

  it('reads --config with its path', () => {
    expect(parseArgs(['--config', 'audit.json'])).toEqual({ config: 'audit.json' });
  });

  it('rejects an unknown flag with a usage line', () => {
    expect(() => parseArgs(['--sideways'])).toThrow(/cairn-audit/);
  });

  it('rejects --config without a value', () => {
    expect(() => parseArgs(['--config'])).toThrow(/--config/);
  });

  it('rejects the removed --rendered flag and norms subcommand as unknown arguments', () => {
    expect(() => parseArgs(['--rendered'])).toThrow(/unknown argument --rendered/);
    expect(() => parseArgs(['norms', 'x'])).toThrow(/unknown argument norms/);
  });

  it('reads --help as a flag rather than rejecting it', () => {
    expect(parseArgs(['--help'])).toEqual({ help: true });
  });

  it('reads a single --rule', () => {
    expect(parseArgs(['--rule', 'motion-reduced-delay'])).toEqual({ rule: ['motion-reduced-delay'] });
  });

  it('reads --rule repeated, in the order given', () => {
    expect(parseArgs(['--rule', 'viewport-overflow', '--rule', 'panel-width'])).toEqual({
      rule: ['viewport-overflow', 'panel-width'],
    });
  });

  it('rejects --rule without a value', () => {
    expect(() => parseArgs(['--rule'])).toThrow(/--rule/);
  });
});

// The Plan 07 packaging lesson (proven in doctor-bin.test.ts): prove the emitted bin runs under
// plain Node from dist. Spawns only when the built bin exists and skips otherwise.
const BIN = resolve(process.cwd(), 'dist/audit/bin.js');
const built = existsSync(BIN);

describe('packaged bin (needs dist/audit/bin.js; run npm run package to unskip)', () => {
  it.skipIf(!built)('prints usage and exits 0 on --help, without running the audit', () => {
    const out = spawnSync(process.execPath, [BIN, '--help'], {
      cwd: tmpdir(),
      env: { PATH: process.env.PATH },
      encoding: 'utf8',
    });
    expect(out.status).toBe(0);
    expect(out.stdout).toContain('Usage: cairn-audit');
  });

  it.skipIf(!built)('prints usage to stderr and exits 2 on an unknown flag', () => {
    const out = spawnSync(process.execPath, [BIN, '--bogus'], {
      cwd: tmpdir(),
      env: { PATH: process.env.PATH },
      encoding: 'utf8',
    });
    expect(out.status).toBe(2);
    expect(out.stderr).toContain('Usage: cairn-audit');
  });
});
