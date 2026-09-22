// cairn-cms: the conditions-mirror drift gate. tool/internal/spine/conditions.json and
// tool/internal/doctor/site-config-path.json are committed, generated output (see
// scripts/build/emit-tool-conditions.mjs); this regenerates both into memory and fails on the
// first byte that differs from the committed file, so a registry edit that forgets to regenerate
// the mirror is a red gate, not a silent drift the Go tool discovers at runtime.
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildMirrors } from '../build/emit-tool-conditions.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

/**
 * Compares one regenerated mirror against its committed file.
 * @param {string} path Repo-relative path of the committed mirror.
 * @param {string} expected The freshly regenerated contents.
 * @returns {string | null} A diff-shaped problem line, or null when the file matches.
 */
function compareMirror(path, expected) {
  const absPath = resolve(ROOT, path);
  if (!existsSync(absPath)) {
    return `${path}: missing; run "node scripts/build/emit-tool-conditions.mjs" to create it`;
  }
  const actual = readFileSync(absPath, 'utf8');
  if (actual === expected) return null;
  return `${path}: does not match its generator; run "node scripts/build/emit-tool-conditions.mjs" and commit the result`;
}

async function main() {
  const mirrors = await buildMirrors();
  const problems = Object.entries(mirrors)
    .map(([path, contents]) => compareMirror(path, contents))
    .filter((problem) => problem !== null);
  if (problems.length > 0) {
    console.error(`check-tool-conditions: ${problems.length} problem(s)`);
    for (const problem of problems) console.error(`  ${problem}`);
    process.exitCode = 1;
    return;
  }
  console.log(`check-tool-conditions: OK (${Object.keys(mirrors).length} mirror(s) match their generator)`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main();
}
