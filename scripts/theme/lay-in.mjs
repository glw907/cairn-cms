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
import { cpSync, existsSync, mkdirSync, readFileSync, realpathSync, rmSync } from 'node:fs';
import path from 'node:path';
import { assertColorModes, generateThemeNames } from './theme-names.mjs';

/**
 * True when `inner` is `outer` or sits below it.
 * @param {string} outer
 * @param {string} inner
 * @returns {boolean}
 */
function within(outer, inner) {
  const rel = path.relative(outer, inner);
  return rel === '' || (rel !== '..' && !rel.startsWith(`..${path.sep}`) && !path.isAbsolute(rel));
}

/**
 * Replace a site's `src/theme/` with a theme and write the generated names.
 * @param {string} themeDir the theme directory, holding `cairn-theme.json`
 * @param {string} siteDir the site root, holding `package.json`
 */
export function layIn(themeDir, siteDir) {
  if (!existsSync(path.join(path.resolve(themeDir), 'cairn-theme.json'))) {
    throw new Error(`lay-in: ${path.resolve(themeDir)} has no cairn-theme.json, so it is not a theme directory`);
  }
  if (!existsSync(path.join(path.resolve(siteDir), 'package.json'))) {
    throw new Error(`lay-in: ${path.resolve(siteDir)} has no package.json, so it is not a site directory`);
  }
  // Real paths, so a symlinked theme directory cannot hide an overlap with the copy.
  const theme = realpathSync(themeDir);
  const site = realpathSync(siteDir);
  const target = path.join(site, 'src/theme');
  if (within(theme, target) || within(target, theme)) {
    throw new Error(`lay-in: the theme directory ${theme} and the site copy ${target} overlap`);
  }
  const manifest = JSON.parse(readFileSync(path.join(theme, 'cairn-theme.json'), 'utf8'));
  // Validate the names before the replace deletes anything, so a bad manifest leaves the site as it was.
  assertColorModes(manifest.colorModes);
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
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}
