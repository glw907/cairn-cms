import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { themeConfig } from './theme-names.js';

/** Reads a sibling source file of this test's directory, or of `src/` with a `../` prefix. */
function read(rel: string): string {
  return readFileSync(fileURLToPath(new URL(rel, import.meta.url)), 'utf8');
}

/** The `name:` value of every `@plugin "daisyui/theme"` block, comments stripped first. */
function daisyThemeNames(css: string): string[] {
  const bare = css.replace(/\/\*[\s\S]*?\*\//g, '');
  return [...bare.matchAll(/@plugin\s+"daisyui\/theme"\s*\{[^}]*?\bname:\s*"([^"]+)"/g)].map(
    (m) => m[1],
  );
}

/** The regex literal `app.html`'s inline script matches the cookie with, and the cookie it names. */
function headScriptCookie(): { pattern: RegExp; cookieName: string } {
  const html = read('../app.html');
  const source = /document\.cookie\.match\(\/(.+)\/\)/.exec(html)?.[1];
  if (!source) throw new Error('app.html carries no document.cookie.match regex literal');
  const cookieName = /\(\?:\^\|; \)(.+?)=\(/.exec(source)?.[1];
  if (!cookieName) throw new Error('app.html regex names no cookie');
  return { pattern: new RegExp(source), cookieName };
}

describe('theme names', () => {
  it('match the two daisyUI theme blocks in theme.css', () => {
    expect(daisyThemeNames(read('./theme.css')).sort()).toEqual(
      [themeConfig.light, themeConfig.dark].sort(),
    );
  });

  it('match the cookie name app.html reads', () => {
    expect(headScriptCookie().cookieName).toBe(themeConfig.cookieName);
  });

  it.each([
    { label: 'light', name: themeConfig.light },
    { label: 'dark', name: themeConfig.dark },
  ])("are accepted by app.html's regex for the $label name", ({ name }) => {
    const { pattern } = headScriptCookie();
    expect(pattern.exec(`${themeConfig.cookieName}=${name}`)?.[1]).toBe(name);
  });

  it("are the only names app.html's regex accepts", () => {
    const { pattern } = headScriptCookie();
    expect(pattern.test(`${themeConfig.cookieName}=${themeConfig.light}-retired`)).toBe(false);
    expect(pattern.test(`${themeConfig.cookieName}=retired`)).toBe(false);
  });
});
