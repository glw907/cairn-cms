// cairn-cms: the scripts/ tree's repo-root resolver. Every caller lives one level under a
// scripts/ subdirectory, two directories below the repo root, so `import.meta.url` resolves the
// same way from each. Every check script under scripts/checks takes its root through
// scripts/checks/shared.mjs. Other scripts/ trees import repoRoot too, and a few still compute their
// root inline (BACKLOG #570).
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * The repo root, resolved from a scripts/ subdirectory file's `import.meta.url`.
 * @param {string} moduleUrl
 * @returns {string}
 */
export function repoRoot(moduleUrl) {
  return resolve(dirname(fileURLToPath(moduleUrl)), '../..');
}
