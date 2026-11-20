// cairn-cms: the install check a full local close and the release preflight share. The runner
// (`run.mjs`) calls it before a close group run, and `scripts/release/preflight.mjs` imports it from
// this path, which is why the function lives here and not in the runner.
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { repoRoot } from '../repo-root.mjs';

const ROOT = repoRoot(import.meta.url);

/**
 * The installs a close needs, each with the command that makes it. A worktree missing either fails
 * deep inside the build with an error that names neither.
 * @param {(path: string) => boolean} [exists] - Seam for the file check.
 * @param {string} [root] - The repo root.
 * @returns {string[]} The `npm ci` commands to run, empty when both installs are present.
 */
export function missingInstalls(exists = existsSync, root = ROOT) {
  const missing = [];
  if (!exists(join(root, 'node_modules', '.bin', 'svelte-package'))) missing.push('npm ci');
  if (!exists(join(root, 'examples', 'showcase', 'node_modules'))) {
    missing.push('npm ci --prefix examples/showcase');
  }
  return missing;
}
