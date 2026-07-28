import { describe, it, expect } from 'vitest';
import {
  DEFAULT_SHEET_CANDIDATES,
  DEFAULT_STATIC_SCOPE,
  parseArgs,
  resolveConfig,
} from '../../../lib/audit/config.js';

describe('DEFAULT_STATIC_SCOPE', () => {
  // The Phase 1 finding: admin-fields is the third public surface rendering inside the admin
  // theme, and its absence from the stylesheet scan roots silently broke a shipped class. The
  // audit's default scope carries the same roots the build and the class gate scan.
  it('carries every surface that renders inside the admin theme', () => {
    expect(DEFAULT_STATIC_SCOPE).toContain('src/lib/admin-toolkit');
    expect(DEFAULT_STATIC_SCOPE).toContain('src/lib/admin-fields');
    expect(DEFAULT_STATIC_SCOPE).toContain('src/lib/components');
  });

  it("carries the consumer site's admin routes", () => {
    expect(DEFAULT_STATIC_SCOPE).toContain('src/routes/admin');
  });
});

describe('resolveConfig', () => {
  const sheetHere = (path: string) => path === DEFAULT_SHEET_CANDIDATES[0];

  it('defaults every field when the consumer wrote no config file', () => {
    const config = resolveConfig('/site', null, sheetHere);
    expect(config.root).toBe('/site');
    expect(config.staticScope).toEqual(DEFAULT_STATIC_SCOPE);
    expect(config.sheetPath).toBe(DEFAULT_SHEET_CANDIDATES[0]);
    expect(config.renderedPages).toEqual([]);
    expect(config.renderedAllowlist).toEqual([]);
  });

  it('falls back to the installed package sheet when the local build is absent', () => {
    const config = resolveConfig('/site', null, (path) => path === DEFAULT_SHEET_CANDIDATES[1]);
    expect(config.sheetPath).toBe(DEFAULT_SHEET_CANDIDATES[1]);
  });

  it('keeps the first candidate when no candidate exists, so the run fails naming a path', () => {
    const config = resolveConfig('/site', null, () => false);
    expect(config.sheetPath).toBe(DEFAULT_SHEET_CANDIDATES[0]);
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
    expect(config.sheetPath).toBe('build/admin.css');
    expect(config.renderedPages).toEqual(['/admin', '/admin/posts']);
    expect(config.renderedAllowlist).toEqual([
      { page: '/admin', selector: '.legacy', reason: 'ships in the next pass' },
    ]);
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
});

describe('parseArgs', () => {
  it('reads a bare invocation as the static audit', () => {
    expect(parseArgs([])).toEqual({ rendered: false });
  });

  it('reads --rendered', () => {
    expect(parseArgs(['--rendered'])).toEqual({ rendered: true });
  });

  it('reads --config with its path', () => {
    expect(parseArgs(['--config', 'audit.json'])).toEqual({ rendered: false, config: 'audit.json' });
  });

  it('rejects an unknown flag with a usage line', () => {
    expect(() => parseArgs(['--sideways'])).toThrow(/cairn-audit/);
  });

  it('rejects --config without a value', () => {
    expect(() => parseArgs(['--config'])).toThrow(/--config/);
  });
});
