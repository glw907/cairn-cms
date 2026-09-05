// cairn-cms: the scripts/ tree's repo-root resolver. Every gate lives one level under a
// scripts/ subdirectory (checks/, build/, or lab/), two directories below the repo root, so
// `import.meta.url` resolves the same way from each. A dozen-plus gates still spell out
// `resolve(dirname(fileURLToPath(import.meta.url)), '../..')` inline rather than import this;
// this module is the target for that convergence, not yet the sole source of it.
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * The repo root, resolved from a scripts/ subdirectory file's own `import.meta.url`.
 * @param {string} moduleUrl
 * @returns {string}
 */
export function repoRoot(moduleUrl) {
  return resolve(dirname(fileURLToPath(moduleUrl)), '../..');
}
