// Lays a theme into a site: replaces `<siteDir>/src/theme/` wholesale with the theme directory minus
// `screenshots/`, then writes the names generated from the manifest (`theme-names.ts` and the cookie
// regex in `src/app.html`). Every channel that carries a theme calls this one step: the showcase
// (through `npm run theme:lay-in`), the committed template, and the engine tarball's template tree.
//
//   node scripts/theme/lay-in.mjs <themeDir> <siteDir>
//
// The copy under `src/theme/` is disposable, so nothing here preserves edits to it; the refusals
// catch swapped arguments and a theme directory that is the copy itself, which the wholesale
// replace would otherwise delete.
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync } from 'node:fs';
import path from 'node:path';
import { generateThemeNames } from './theme-names.mjs';

/** True when `inner` is `outer` or sits below it. */
function within(outer, inner) {
  const rel = path.relative(outer, inner);
  return rel === '' || (!rel.startsWith('..') && !path.isAbsolute(rel));
}

/**
 * Replace a site's `src/theme/` with a theme and write the generated names.
 * @param {string} themeDir the theme directory, holding `cairn-theme.json`
 * @param {string} siteDir the site root, holding `package.json`
 */
export function layIn(themeDir, siteDir) {
  const theme = path.resolve(themeDir);
  const site = path.resolve(siteDir);
  if (!existsSync(path.join(theme, 'cairn-theme.json'))) {
    throw new Error(`lay-in: ${theme} has no cairn-theme.json, so it is not a theme directory`);
  }
  if (!existsSync(path.join(site, 'package.json'))) {
    throw new Error(`lay-in: ${site} has no package.json, so it is not a site directory`);
  }
  const target = path.join(site, 'src/theme');
  if (within(theme, target) || within(target, theme)) {
    throw new Error(`lay-in: the theme directory ${theme} and the site copy ${target} overlap`);
  }
  const manifest = JSON.parse(readFileSync(path.join(theme, 'cairn-theme.json'), 'utf8'));
  rmSync(target, { recursive: true, force: true });
  mkdirSync(path.dirname(target), { recursive: true });
  cpSync(theme, target, {
    recursive: true,
    filter: (source) => path.relative(theme, source) !== 'screenshots',
  });
  generateThemeNames(site, manifest.colorModes);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [themeDir, siteDir] = process.argv.slice(2);
  if (!themeDir || !siteDir) {
    console.error('usage: lay-in.mjs <themeDir> <siteDir>');
    process.exit(2);
  }
  try {
    layIn(themeDir, siteDir);
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}
