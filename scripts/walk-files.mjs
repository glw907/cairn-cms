// cairn-cms: the shared recursive-directory walk that seven scripts/checks/ gates plus three
// build and lab scripts reuse by filename predicate (check-cm-internals.mjs enumerates editor
// files that mention `.cm-`; check-custom-surface.mjs enumerates the admin and showcase markup
// trees). A handful of markdown-scanning gates (check-arm-indexes.mjs, check-symbols.mjs,
// check-visuals.mjs, docs-links.mjs, transcript-blocks.mjs) still hand-roll their own
// `walkMarkdown`, so a traversal bug fixed here does not yet reach them.
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
