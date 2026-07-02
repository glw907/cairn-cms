import { describe, it, expect } from 'vitest';
import {
  validateNavTree,
  NavValidationError,
  parseSiteConfig,
  SiteConfigError,
  extractMenu,
  setMenu,
  setTidy,
  validateVocabulary,
  extractVocabulary,
  setVocabulary,
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

  it('throws on a stale per-concept content block, pointing to defineConcept (Contract v2)', () => {
    expect(() =>
      parseSiteConfig('siteName: S\ncontent:\n  posts:\n    permalink: /:year/:month/:slug\n    datePrefix: month\n'),
    ).toThrow(/defineConcept/);
  });

  it('parses a content-free config', () => {
    expect(parseSiteConfig('siteName: S\nmenus:\n  primary: []\n')).toMatchObject({ siteName: 'S' });
  });

  it('throws on an unrecognized top-level key, naming the known keys', () => {
    expect(() => parseSiteConfig('siteName: S\ntypoKey: 1\n')).toThrow(
      /unrecognized key "typoKey"; known keys are/,
    );
  });

  it('throws on a known adapter misplacement (backend), naming cairn.config.ts', () => {
    expect(() => parseSiteConfig('siteName: S\nbackend:\n  kind: github-app\n')).toThrow(
      /"backend" belongs in cairn\.config\.ts/,
    );
  });

  it('throws on a known adapter misplacement (rendering), naming cairn.config.ts', () => {
    expect(() => parseSiteConfig('siteName: S\nrendering:\n  render: x\n')).toThrow(
      /"rendering" belongs in cairn\.config\.ts/,
    );
  });

  it('accepts every known top-level key together', () => {
    const raw = [
      'siteName: S',
      'description: d',
      'author: a',
      'locale: en-US',
      'menus:',
      '  primary: []',
      'spellcheck:',
      '  dialect: en-US',
      'tidy:',
      '  enabled: false',
      'vocabulary: []',
      '',
    ].join('\n');
    expect(() => parseSiteConfig(raw)).not.toThrow();
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

describe('setTidy', () => {
  it('writes the conventions block and preserves comments and key order', () => {
    const raw = [
      '# the site config',
      'siteName: S',
      'description: keep me',
      'tidy:',
      '  # the developer-tier facts, never touched by the editor screen',
      '  enabled: true',
      '  model: claude-sonnet-4-6',
      '  conventions:',
      '    fixes: true',
      '',
    ].join('\n');
    const out = setTidy(raw, { fixes: true, oxfordComma: 'always', timeFormat: '5 PM' });
    // The comments and the developer-tier facts round-trip; only conventions changed.
    expect(out).toContain('# the site config');
    expect(out).toContain('# the developer-tier facts');
    expect(out).toContain('enabled: true');
    expect(out).toContain('model: claude-sonnet-4-6');
    // siteName stays the first data key (key order preserved).
    expect(out.indexOf('siteName')).toBeLessThan(out.indexOf('description'));
    expect(out.indexOf('description')).toBeLessThan(out.indexOf('tidy:'));
    const reparsed = parseSiteConfig(out);
    expect(reparsed.description).toBe('keep me');
    expect(reparsed.tidy?.enabled).toBe(true);
    expect(reparsed.tidy?.model).toBe('claude-sonnet-4-6');
    expect(reparsed.tidy?.conventions).toEqual({ fixes: true, oxfordComma: 'always', timeFormat: '5 PM' });
  });

  it('drops a collapsed (undefined) multi-position toggle so the YAML carries only on toggles', () => {
    const out = setTidy('siteName: S\ntidy:\n  enabled: true\n', {
      fixes: true,
      oxfordComma: undefined,
      enDashRanges: false,
      smartQuotes: false,
      brandCaps: false,
    });
    const reparsed = parseSiteConfig(out);
    expect(reparsed.tidy?.conventions).toEqual({ fixes: true, enDashRanges: false, smartQuotes: false, brandCaps: false });
    expect(reparsed.tidy?.conventions).not.toHaveProperty('oxfordComma');
  });

  it('creates the tidy block when the file has none yet, leaving other keys intact', () => {
    const out = setTidy('siteName: S\ndescription: x\n', { fixes: false });
    const reparsed = parseSiteConfig(out);
    expect(reparsed.description).toBe('x');
    expect(reparsed.tidy?.conventions).toEqual({ fixes: false });
  });

  it('throws when the root has no siteName', () => {
    expect(() => setTidy('description: x\n', { fixes: true })).toThrow(SiteConfigError);
  });
});

describe('validateVocabulary', () => {
  it('accepts a well-formed vocabulary and returns it in input order', () => {
    expect(
      validateVocabulary([
        { value: 'web-design', label: 'Web Design' },
        { value: 'svelte', label: 'Svelte' },
      ]),
    ).toEqual([
      { value: 'web-design', label: 'Web Design' },
      { value: 'svelte', label: 'Svelte' },
    ]);
  });

  it('throws on a non-array', () => {
    expect(() => validateVocabulary({ value: 'a', label: 'A' })).toThrow(SiteConfigError);
  });

  it('throws on a duplicate value', () => {
    expect(() =>
      validateVocabulary([
        { value: 'web-design', label: 'Web Design' },
        { value: 'web-design', label: 'Again' },
      ]),
    ).toThrow(SiteConfigError);
  });

  it('throws on an empty label', () => {
    expect(() => validateVocabulary([{ value: 'web-design', label: '' }])).toThrow(SiteConfigError);
  });

  it('throws on a non-slug value', () => {
    for (const bad of ['Web Design', 'WebDesign', 'web design', '-x']) {
      expect(() => validateVocabulary([{ value: bad, label: 'X' }])).toThrow(SiteConfigError);
    }
  });
});

describe('extractVocabulary', () => {
  it('parses and returns a well-formed vocabulary from a config', () => {
    const config = parseSiteConfig('siteName: S\nvocabulary:\n  - value: web-design\n    label: Web Design\n');
    expect(extractVocabulary(config)).toEqual([{ value: 'web-design', label: 'Web Design' }]);
  });

  it('returns [] when the key is absent', () => {
    expect(extractVocabulary(parseSiteConfig('siteName: S\n'))).toEqual([]);
  });
});

describe('setVocabulary', () => {
  it('round-trips the vocabulary while preserving siteName and other keys', () => {
    const raw = 'siteName: S\ndescription: keep me\nmenus:\n  primary:\n    - label: Home\n      url: /\n';
    const out = setVocabulary(raw, [{ value: 'a', label: 'A' }]);
    const reparsed = parseSiteConfig(out);
    expect(reparsed.siteName).toBe('S');
    expect(reparsed.description).toBe('keep me');
    expect(reparsed.menus?.primary).toEqual([{ label: 'Home', url: '/' }]);
    expect(extractVocabulary(reparsed)).toEqual([{ value: 'a', label: 'A' }]);
  });

  it('throws when the root has no siteName', () => {
    expect(() => setVocabulary('description: x\n', [{ value: 'a', label: 'A' }])).toThrow(SiteConfigError);
  });
});
