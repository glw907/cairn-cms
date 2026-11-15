// Lays a theme into a site: makes `<siteDir>/src/theme/` an exact copy of the theme directory minus
// `screenshots/`, then writes the names generated from the manifest (`theme-names.ts` and the cookie
// regex in `src/app.html`). Every channel that carries a theme calls this one step: the showcase
// (through `npm run theme:lay-in`), the committed template, and the engine tarball's template tree.
//
//   node scripts/theme/lay-in.mjs <themeDir> <siteDir>
//
// The copy under `src/theme/` is disposable, so nothing here preserves edits to it; the refusals
// catch swapped arguments and a theme directory that is the copy itself, which the copy's removal
// of stale files would otherwise delete.
import { copyFileSync, existsSync, lstatSync, mkdirSync, readdirSync, readFileSync, readlinkSync, realpathSync, rmSync, symlinkSync } from 'node:fs';
import path from 'node:path';
import { assertColorModes, generateThemeNames, THEME_NAMES_FILE } from './theme-names.mjs';

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
 * Make `target` hold exactly the theme's files, minus the top-level `screenshots/`, writing only the
 * files whose bytes differ and removing only the entries the theme lacks. The generated names file
 * is left in place for the caller to write. A running `vite dev` reloads every module whose file is
 * touched, so deleting the tree and copying it back reloads every theme module even when one file
 * changed; on a loaded machine that reload outlasts Vite's 60-second module-fetch limit, and a page
 * requested during it answers 500.
 * @param {string} theme the theme directory
 * @param {string} target the site's `src/theme/`
 */
export function mirrorTheme(theme, target) {
  /** @param {string} rel the directory's path under the theme, `''` for the root */
  const walk = (rel) => {
    const from = path.join(theme, rel);
    const to = path.join(target, rel);
    if (lstatSync(to, { throwIfNoEntry: false })?.isDirectory() === false) rmSync(to, { force: true });
    mkdirSync(to, { recursive: true });
    const kept = new Set(rel === '' ? [THEME_NAMES_FILE] : []);
    for (const entry of readdirSync(from, { withFileTypes: true })) {
      const child = path.join(rel, entry.name);
      if (child === 'screenshots') continue;
      kept.add(entry.name);
      if (entry.isSymbolicLink()) copyLinkIfChanged(path.join(from, entry.name), path.join(to, entry.name));
      else if (entry.isDirectory()) walk(child);
      else copyIfChanged(path.join(from, entry.name), path.join(to, entry.name));
    }
    for (const name of readdirSync(to)) {
      if (!kept.has(name)) rmSync(path.join(to, name), { recursive: true, force: true });
    }
  };
  walk('');
}

/**
 * Copy a file unless the target already holds the same bytes.
 * @param {string} from the theme's file
 * @param {string} to the file's place under the site's `src/theme/`
 */
function copyIfChanged(from, to) {
  const held = lstatSync(to, { throwIfNoEntry: false });
  if (held?.isFile() && readFileSync(to).equals(readFileSync(from))) return;
  if (held && !held.isFile()) rmSync(to, { recursive: true, force: true });
  copyFileSync(from, to);
}

/**
 * Copy a symlink as a link with the same target unless the target already holds that link. The
 * link is kept rather than followed, as a recursive copy keeps it, so a link to a directory does
 * not fail and a relative link still resolves inside the copy.
 * @param {string} from the theme's link
 * @param {string} to the link's place under the site's `src/theme/`
 */
function copyLinkIfChanged(from, to) {
  const link = readlinkSync(from);
  const held = lstatSync(to, { throwIfNoEntry: false });
  if (held?.isSymbolicLink() && readlinkSync(to) === link) return;
  if (held) rmSync(to, { recursive: true, force: true });
  symlinkSync(link, to);
}

/**
 * Make a site's `src/theme/` a copy of a theme and write the generated names.
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
  // Validate the names before the copy touches anything, so a bad manifest leaves the site as it was.
  assertColorModes(manifest.colorModes);
  mirrorTheme(theme, target);
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
