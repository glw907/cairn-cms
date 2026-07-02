// cairn-cms: the scripts/ tree's repo-root resolver. Every gate lives directly under scripts/, one
// directory below the repo root, so `import.meta.url` resolves the same way from each; sharing the
// resolution here keeps that one-level-up assumption in one place instead of restated per file.
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * The repo root, resolved from a scripts/ file's own `import.meta.url`.
 * @param {string} moduleUrl
 * @returns {string}
 */
export function repoRoot(moduleUrl) {
  return resolve(dirname(fileURLToPath(moduleUrl)), '..');
}
