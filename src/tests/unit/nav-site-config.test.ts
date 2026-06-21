import { describe, it, expect } from 'vitest';
import {
  validateNavTree,
  NavValidationError,
  parseSiteConfig,
  SiteConfigError,
  extractMenu,
  setMenu,
  urlPolicyFrom,
  dictionaryFileForDialect,
  DEFAULT_DIALECT,
} from '../../lib/nav/site-config.js';
import { condition } from '../../lib/diagnostics/index.js';

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

  it('rejects a javascript: url', () => {
    expect(() => validateNavTree([{ label: 'X', url: 'javascript:alert(1)' }], 1)).toThrow(/URL must start with/i);
  });

  it('rejects a data: url', () => {
    expect(() => validateNavTree([{ label: 'X', url: 'data:text/html,<h1>hi</h1>' }], 1)).toThrow(/URL must start with/i);
  });

  it('accepts /path as a safe url', () => {
    expect(validateNavTree([{ label: 'X', url: '/path' }], 1)).toEqual([{ label: 'X', url: '/path' }]);
  });

  it('accepts #anchor as a safe url', () => {
    expect(validateNavTree([{ label: 'X', url: '#anchor' }], 1)).toEqual([{ label: 'X', url: '#anchor' }]);
  });

  it('accepts https://example.com as a safe url', () => {
    expect(validateNavTree([{ label: 'X', url: 'https://example.com' }], 1)).toEqual([{ label: 'X', url: 'https://example.com' }]);
  });

  it('accepts mailto:a@b.com as a safe url', () => {
    expect(validateNavTree([{ label: 'X', url: 'mailto:a@b.com' }], 1)).toEqual([{ label: 'X', url: 'mailto:a@b.com' }]);
  });

  it('accepts tel:+1234 as a safe url', () => {
    expect(validateNavTree([{ label: 'X', url: 'tel:+1234' }], 1)).toEqual([{ label: 'X', url: 'tel:+1234' }]);
  });

  it('rejects a label over 500 characters', () => {
    expect(() => validateNavTree([{ label: 'A'.repeat(501) }], 1)).toThrow(/label/i);
  });

  it('rejects a url over 2048 characters', () => {
    expect(() => validateNavTree([{ label: 'X', url: '/' + 'a'.repeat(2048) }], 1)).toThrow(/url/i);
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

  it('reads an optional spellcheck.dialect', () => {
    const config = parseSiteConfig('siteName: S\nspellcheck:\n  dialect: en-GB\n');
    expect(config.spellcheck?.dialect).toBe('en-GB');
  });

  it('leaves spellcheck undefined when the key is absent', () => {
    expect(parseSiteConfig('siteName: S\n').spellcheck).toBeUndefined();
  });
});

describe('dictionaryFileForDialect', () => {
  it('defaults to the US English dictionary when the dialect is unset', () => {
    expect(dictionaryFileForDialect(undefined)).toBe('dictionary-en-us.txt');
    expect(DEFAULT_DIALECT).toBe('en-US');
  });

  it('resolves an explicit en-US dialect to the US English dictionary', () => {
    expect(dictionaryFileForDialect('en-US')).toBe('dictionary-en-us.txt');
  });

  it('falls back to the default dictionary for an unknown dialect', () => {
    expect(dictionaryFileForDialect('xx-ZZ')).toBe('dictionary-en-us.txt');
  });
});

describe('SiteConfigError', () => {
  it('carries the registered site-config condition id', () => {
    const err = new SiteConfigError('bad');
    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe('SiteConfigError');
    expect(condition(err.conditionId).id).toBe('config.site-config-invalid');
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

describe('urlPolicyFrom', () => {
  it('reads a per-concept content section', () => {
    const cfg = parseSiteConfig('siteName: T\ncontent:\n  posts:\n    permalink: /:year/:month/:slug\n    datePrefix: month\n');
    expect(urlPolicyFrom(cfg)).toEqual({ posts: { permalink: '/:year/:month/:slug', datePrefix: 'month' } });
  });

  it('returns an empty policy when content is absent', () => {
    expect(urlPolicyFrom(parseSiteConfig('siteName: T\n'))).toEqual({});
  });
});
