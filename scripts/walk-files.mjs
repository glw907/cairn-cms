// cairn-cms: the shared recursive-directory walk the scripts/ gates that scan a source tree by
// filename predicate reuse. check-cm-internals.mjs enumerates editor files that mention `.cm-`;
// check-custom-surface.mjs enumerates the admin and showcase markup trees. One walk, one place to
// fix a traversal bug.
import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Every file path under `dir` (recursive) whose basename passes `keep`.
 * @param {string} dir
 * @param {(name: string) => boolean} keep
 * @returns {string[]}
 */
export function walk(dir, keep) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) out.push(...walk(full, keep));
    else if (keep(name)) out.push(full);
  }
  return out;
}
