import { describe, it, expect } from 'vitest';
import {
  validateNavTree,
  NavValidationError,
  parseSiteConfig,
  SiteConfigError,
  extractMenu,
  setMenu,
} from '../../lib/nav/site-config.js';

describe('validateNavTree', () => {
  it('normalizes a nested tree and keeps only known keys', () => {
    const tree = validateNavTree(
      [{ label: 'Home', url: '/', junk: 1 }, { label: 'Guides', children: [{ label: 'Start', url: '/start' }] }],
      2,
    );
    expect(tree).toEqual([
      { label: 'Home', url: '/' },
      { label: 'Guides', children: [{ label: 'Start', url: '/start' }] },
    ]);
  });

  it('keeps a label-only node (no url) as a grouping header', () => {
    expect(validateNavTree([{ label: 'Section' }], 1)).toEqual([{ label: 'Section' }]);
  });

  it('rejects a non-array', () => {
    expect(() => validateNavTree({}, 1)).toThrow(NavValidationError);
  });

  it('rejects an item with no label', () => {
    expect(() => validateNavTree([{ url: '/x' }], 1)).toThrow(/needs a label/);
  });

  it('rejects nesting deeper than maxDepth', () => {
    expect(() => validateNavTree([{ label: 'A', children: [{ label: 'B' }] }], 1)).toThrow(/deeper than 1/);
  });

  it('drops an empty children array rather than keeping the key', () => {
    expect(validateNavTree([{ label: 'A', children: [] }], 2)).toEqual([{ label: 'A' }]);
  });
});

describe('parseSiteConfig', () => {
  it('parses a mapping with a siteName', () => {
    expect(parseSiteConfig('siteName: My Site\n')).toMatchObject({ siteName: 'My Site' });
  });

  it('throws on a non-mapping root', () => {
    expect(() => parseSiteConfig('- a\n- b\n')).toThrow(SiteConfigError);
  });

  it('throws when siteName is missing', () => {
    expect(() => parseSiteConfig('description: x\n')).toThrow(/needs a siteName/);
  });
});

describe('extractMenu', () => {
  it('returns the named menu validated', () => {
    const config = parseSiteConfig('siteName: S\nmenus:\n  primary:\n    - label: Home\n      url: /\n');
    expect(extractMenu(config, 'primary', 2)).toEqual([{ label: 'Home', url: '/' }]);
  });

  it('returns an empty array when the menu is absent', () => {
    expect(extractMenu(parseSiteConfig('siteName: S\n'), 'primary', 2)).toEqual([]);
  });
});

describe('setMenu', () => {
  it('replaces one menu and preserves every other top-level key', () => {
    const raw = 'siteName: S\ndescription: keep me\nmenus:\n  primary:\n    - label: Old\n  footer:\n    - label: Privacy\n      url: /privacy\n';
    const out = setMenu(raw, 'primary', [{ label: 'Home', url: '/' }]);
    const reparsed = parseSiteConfig(out);
    expect(reparsed.description).toBe('keep me');
    expect(extractMenu(reparsed, 'primary', 2)).toEqual([{ label: 'Home', url: '/' }]);
    expect(extractMenu(reparsed, 'footer', 2)).toEqual([{ label: 'Privacy', url: '/privacy' }]);
  });

  it('creates the menus map when the file has none yet', () => {
    const out = setMenu('siteName: S\n', 'primary', [{ label: 'Home', url: '/' }]);
    expect(extractMenu(parseSiteConfig(out), 'primary', 2)).toEqual([{ label: 'Home', url: '/' }]);
  });

  it('throws when the root has no siteName', () => {
    expect(() => setMenu('description: x\n', 'primary', [])).toThrow(SiteConfigError);
  });
});
