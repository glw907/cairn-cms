// cairn-cms: the throwaway showcase copy the theme-fixture harness builds and the public-scope gate
// audits. The copy sits at the repository root, in a gitignored `.cairn-theme-fixture-<pid>/`
// directory, so a `../src/lib/public` path from it reaches the engine's public component root the
// way the showcase's `../../src/lib/public` does. Its node_modules is a symlink to the showcase's
// own, so the engine and daisyUI resolve to the working build without a second install.
//
// A copy is removed when its process exits, failure and signals included, and any copy left by a
// process that no longer runs is deleted before a new one is made.
import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, symlinkSync } from 'node:fs';
import { join, resolve } from 'node:path';

/** The directory-name prefix every copy carries, matched by `.gitignore`. */
export const COPY_PREFIX = '.cairn-theme-fixture-';

/** The showcase's top-level entries a copy leaves behind: installs, build outputs, and its e2e tree. */
const SKIPPED = new Set(['node_modules', '.svelte-kit', '.cairn', '.wrangler', '.claude', 'e2e', 'test-results']);

/** Copies made by this process, removed on exit. @type {string[]} */
const made = [];
let hooked = false;

/**
 * Whether a process with this id is running.
 * @param {number} pid
 * @returns {boolean}
 */
function isAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (err) {
    return /** @type {NodeJS.ErrnoException} */ (err).code === 'EPERM';
  }
}

/**
 * Delete every copy under `root` whose owning process no longer runs, and this process's own.
 * @param {string} root
 * @returns {string[]} the directories removed
 */
export function removeStaleCopies(root) {
  const removed = [];
  for (const name of readdirSync(root)) {
    if (!name.startsWith(COPY_PREFIX)) continue;
    const pid = Number(name.slice(COPY_PREFIX.length));
    if (pid !== process.pid && Number.isInteger(pid) && isAlive(pid)) continue;
    rmSync(join(root, name), { recursive: true, force: true });
    removed.push(name);
  }
  return removed;
}

/** Remove every copy this process made. */
function removeMade() {
  for (const dir of made.splice(0)) rmSync(dir, { recursive: true, force: true });
}

/** Register the exit and signal hooks once. */
function hook() {
  if (hooked) return;
  hooked = true;
  process.on('exit', removeMade);
  for (const signal of /** @type {const} */ (['SIGINT', 'SIGTERM', 'SIGHUP'])) {
    process.on(signal, () => process.exit(1));
  }
}

/**
 * Make a copy of the showcase with a theme in place of its own.
 * @param {object} options
 * @param {string} options.root the repository root
 * @param {string} [options.themeFile] a stylesheet copied over `src/theme/theme.css`
 * @param {string} [options.themeDir] a directory overlaid onto `src/theme`, taking precedence over
 *   `themeFile`, for a theme that brings its own chrome
 * @returns {{ dir: string, remove: () => void }} the copy's directory, and a function that removes it
 */
export function makeShowcaseCopy({ root, themeFile, themeDir }) {
  hook();
  removeStaleCopies(root);
  const showcase = resolve(root, 'examples/showcase');
  const dir = join(root, `${COPY_PREFIX}${process.pid}`);
  made.push(dir);
  mkdirSync(dir, { recursive: true });
  cpSync(showcase, dir, {
    recursive: true,
    filter: (source) => {
      const rel = source.slice(showcase.length + 1);
      return rel === '' || !SKIPPED.has(rel.split('/')[0]);
    },
  });
  symlinkSync(join(showcase, 'node_modules'), join(dir, 'node_modules'), 'dir');
  if (themeDir) {
    if (!existsSync(themeDir)) throw new Error(`theme directory not found: ${themeDir}`);
    cpSync(resolve(themeDir), join(dir, 'src/theme'), { recursive: true });
  } else if (themeFile) {
    if (!existsSync(themeFile)) throw new Error(`theme stylesheet not found: ${themeFile}`);
    cpSync(resolve(themeFile), join(dir, 'src/theme/theme.css'));
  }
  return {
    dir,
    remove: () => {
      rmSync(dir, { recursive: true, force: true });
      made.splice(made.indexOf(dir), 1);
    },
  };
}
