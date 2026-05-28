import { describe, it, expect } from 'vitest';
import { parseSiteConfig, extractMenu, SiteConfigError } from '../lib/nav';

const SAMPLE = `
siteName: Test Site
description: A test.
url: https://test.example
menus:
  primary:
    - { label: Home, url: / }
    - label: Group
      children:
        - { label: Child, url: /child }
settings:
  feedMaxItems: 20
`;

describe('parseSiteConfig', () => {
  it('parses a well-formed config', () => {
    const config = parseSiteConfig(SAMPLE);
    expect(config.siteName).toBe('Test Site');
    expect(config.url).toBe('https://test.example');
    expect(config.settings?.feedMaxItems).toBe(20);
  });

  it('throws on a non-mapping root', () => {
    expect(() => parseSiteConfig('- just\n- a list')).toThrow(SiteConfigError);
  });

  it('throws when siteName is missing', () => {
    expect(() => parseSiteConfig('description: no name')).toThrow(SiteConfigError);
  });
});

describe('extractMenu', () => {
  it('returns a validated, nested menu', () => {
    const tree = extractMenu(parseSiteConfig(SAMPLE), 'primary', 2);
    expect(tree).toEqual([
      { label: 'Home', url: '/' },
      { label: 'Group', children: [{ label: 'Child', url: '/child' }] },
    ]);
  });

  it('returns [] for an absent menu', () => {
    expect(extractMenu(parseSiteConfig(SAMPLE), 'footer', 2)).toEqual([]);
  });

  it('throws when a node has no label', () => {
    const bad = parseSiteConfig('siteName: X\nmenus:\n  primary:\n    - { url: /x }');
    expect(() => extractMenu(bad, 'primary', 2)).toThrow();
  });

  it('throws when nesting exceeds maxDepth', () => {
    expect(() => extractMenu(parseSiteConfig(SAMPLE), 'primary', 1)).toThrow();
  });
});
