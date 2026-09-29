import { afterEach, describe, expect, it, vi } from 'vitest';
import { resolveTheme, type ThemeToggleConfig } from './theme-toggle.js';

const config: ThemeToggleConfig<'day' | 'night'> = {
  light: 'day',
  dark: 'night',
  cookieName: 'test-theme',
};

/**
 * Stubs the three browser globals `resolveTheme` reads. The unit project runs in Node with no DOM,
 * so each stub answers only the call the function makes.
 */
function stubBrowser(opts: { attr: string | null; colorScheme: string; prefersDark: boolean }) {
  const root = { getAttribute: (name: string) => (name === 'data-theme' ? opts.attr : null) };
  vi.stubGlobal('document', { documentElement: root });
  vi.stubGlobal('getComputedStyle', (el: unknown) => {
    expect(el).toBe(root);
    return {
      getPropertyValue: (name: string) => (name === 'color-scheme' ? opts.colorScheme : ''),
    };
  });
  vi.stubGlobal('window', {
    matchMedia: (query: string) => ({
      matches: query === '(prefers-color-scheme: dark)' && opts.prefersDark,
    }),
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('resolveTheme', () => {
  it.each([
    { attr: 'day', colorScheme: 'dark', prefersDark: true, expected: 'day' },
    { attr: 'night', colorScheme: 'light', prefersDark: false, expected: 'night' },
    { attr: null, colorScheme: 'dark', prefersDark: false, expected: 'night' },
    { attr: null, colorScheme: 'light', prefersDark: true, expected: 'day' },
    { attr: null, colorScheme: 'normal', prefersDark: true, expected: 'night' },
    { attr: null, colorScheme: 'normal', prefersDark: false, expected: 'day' },
    { attr: null, colorScheme: 'light dark', prefersDark: true, expected: 'night' },
    { attr: null, colorScheme: 'light dark', prefersDark: false, expected: 'day' },
    { attr: 'not-a-theme', colorScheme: 'dark', prefersDark: false, expected: 'night' },
  ])(
    'attr $attr, color-scheme "$colorScheme", dark OS $prefersDark resolves to $expected',
    ({ attr, colorScheme, prefersDark, expected }) => {
      stubBrowser({ attr, colorScheme, prefersDark });
      expect(resolveTheme(config)).toBe(expected);
    },
  );
});
