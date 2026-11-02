// cairn-cms: warns, once per unit run, when the built `dist` is older than `src/lib`. About 35
// unit files read `dist`, and a hand `vitest run` (unlike the fast lane) does not rebuild it first,
// so a stale `dist` can pass or fail a test for the wrong reason. The check only warns: a run
// that reads no `dist` must not fail on it.
import { existsSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

/**
 * The newest modification time under a directory, recursively.
 * @param dir - An existing directory.
 * @returns The newest mtime in milliseconds, or 0 for an empty tree.
 */
function newestMtime(dir: string): number {
  let newest = 0;
  for (const entry of readdirSync(dir, { recursive: true, withFileTypes: true })) {
    if (!entry.isFile()) continue;
    newest = Math.max(newest, statSync(join(entry.parentPath, entry.name)).mtimeMs);
  }
  return newest;
}

/**
 * The one-line warning for a `dist` the unit tests would read stale, or null when it is fresh.
 * Never throws: an unreadable tree reads as no warning.
 * @param root - The repo root.
 * @returns The warning line, or null.
 */
export function staleDistWarning(root: string): string | null {
  try {
    const lib = join(root, 'src/lib');
    if (!existsSync(lib)) return null;
    const barrel = join(root, 'dist/index.js');
    if (!existsSync(barrel)) {
      return 'cairn: dist is missing; unit tests that read dist fail until `npm run package` builds it.';
    }
    if (newestMtime(lib) > statSync(barrel).mtimeMs) {
      return 'cairn: src/lib is newer than dist; unit tests that read dist run on a stale build. Run `npm run package` first.';
    }
    return null;
  } catch {
    return null;
  }
}

/** Prints the stale-dist warning, if any, before the unit project's test files start. */
export default function setup(): void {
  const warning = staleDistWarning(resolve(import.meta.dirname, '../..'));
  if (warning) console.warn(warning);
}
