import { describe, it, expect } from 'vitest';
import {
  DEFAULT_PALETTE_CSS_FILES,
  DEFAULT_RENDERED_PAGES,
  DEFAULT_SHEET_CANDIDATES,
  DEFAULT_STATIC_SCOPE,
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
    expect(DEFAULT_STATIC_SCOPE).toContain('src/lib/components');
  });

  it("carries the consumer site's admin routes", () => {
    expect(DEFAULT_STATIC_SCOPE).toContain('src/routes/admin');
  });
});

describe('DEFAULT_PALETTE_CSS_FILES', () => {
  // The engine's own admin stylesheet is the declared palette (and grammar) declaration site;
  // token-colors reads this list rather than carrying its own filename special case for it.
  it('names the admin stylesheet as the engine\'s one declared palette site', () => {
    expect(DEFAULT_PALETTE_CSS_FILES).toContain('src/lib/components/cairn-admin.css');
  });
});

describe('DEFAULT_RENDERED_PAGES', () => {
  it('carries the core admin routes rendered mode visits absent a configured page list', () => {
    expect(DEFAULT_RENDERED_PAGES).toContain('/admin/posts');
    expect(DEFAULT_RENDERED_PAGES).toContain('/admin/login');
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
    expect(config.renderedPages).toEqual(DEFAULT_RENDERED_PAGES);
    expect(config.renderedAllowlist).toEqual([]);
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

  it('takes the scan scope, the sheet, and the rendered inputs from the config file', () => {
    const config = resolveConfig(
      '/site',
      {
        static: { scope: ['src/routes/office'] },
        sheet: 'build/admin.css',
        rendered: {
          pages: ['/admin', '/admin/posts'],
          allowlist: [{ page: '/admin', selector: '.legacy', reason: 'ships in the next pass' }],
        },
      },
      sheetHere
    );
    expect(config.staticScope).toEqual(['src/routes/office']);
    expect(config.sheetPaths).toEqual(['build/admin.css']);
    expect(config.renderedPages).toEqual(['/admin', '/admin/posts']);
    expect(config.renderedAllowlist).toEqual([
      { page: '/admin', selector: '.legacy', reason: 'ships in the next pass' },
    ]);
  });

  // The ledger's ruled shape: `sheet` is a list of compiled-class sources, exactly as
  // `paletteFiles` and `cssFiles` already are, so a site's own compiled stylesheet joins the
  // packaged one instead of needing case-by-case exemption from no-uncompiled-class.
  it('takes a list of compiled-class sources from a list-valued sheet', () => {
    const config = resolveConfig(
      '/site',
      { sheet: ['dist/components/cairn-admin.css', 'src/theme/site.css'] },
      sheetHere
    );
    expect(config.sheetPaths).toEqual(['dist/components/cairn-admin.css', 'src/theme/site.css']);
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

  it('rejects an allowlist entry missing its reason', () => {
    const raw = { rendered: { allowlist: [{ page: '/admin', selector: '.legacy' }] } };
    expect(() => resolveConfig('/site', raw, sheetHere)).toThrow(/reason/);
  });

  // Naming the rule is how suppressing an ADVISORY finding stays non-gating when its selector
  // later churns: the staleness finding is then raised at that rule's own tier.
  it('carries an allowlist entry\'s optional rule id, and rejects a non-string one', () => {
    const raw = {
      rendered: { allowlist: [{ page: '/admin', selector: '.legacy', reason: 'held', rule: 'border-contrast' }] },
    };
    expect(resolveConfig('/site', raw, sheetHere).renderedAllowlist[0].rule).toBe('border-contrast');

    const bad = { rendered: { allowlist: [{ page: '/admin', selector: '.legacy', reason: 'held', rule: 7 }] } };
    expect(() => resolveConfig('/site', bad, sheetHere)).toThrow(/rule/);
  });
});

describe('parseArgs', () => {
  it('reads a bare invocation as the static audit', () => {
    expect(parseArgs([])).toEqual({ command: 'audit', rendered: false });
  });

  it('reads --rendered', () => {
    expect(parseArgs(['--rendered'])).toEqual({ command: 'audit', rendered: true });
  });

  it('reads --config with its path', () => {
    expect(parseArgs(['--config', 'audit.json'])).toEqual({
      command: 'audit',
      rendered: false,
      config: 'audit.json',
    });
  });

  it('rejects an unknown flag with a usage line', () => {
    expect(() => parseArgs(['--sideways'])).toThrow(/cairn-audit/);
  });

  it('rejects --config without a value', () => {
    expect(() => parseArgs(['--config'])).toThrow(/--config/);
  });

  it('reads the norms subcommand and its term', () => {
    expect(parseArgs(['norms', '.btn.btn-primary'])).toEqual({
      command: 'norms',
      term: '.btn.btn-primary',
      rendered: false,
    });
  });

  // A flag standing where the term belongs is a typo, not a term. Accepting it would run a query
  // for the literal string `--rendered` and report that no role matches it.
  it('rejects the norms subcommand with no term', () => {
    expect(() => parseArgs(['norms'])).toThrow(/norms needs a selector or role/);
    expect(() => parseArgs(['norms', '--rendered'])).toThrow(/norms needs a selector or role/);
  });
});
