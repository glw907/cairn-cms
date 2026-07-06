// cairn-cms: the chassis no-reach-ins gate (chassis-restructure Task 2). A theme file (anything
// under examples/showcase/src that is not itself inside src/chassis) may reach chassis machinery
// only through one of the seams src/chassis/README.md documents in its "What lives here" table:
// the $chassis alias in a .ts/.svelte import, or a relative @import in a .css file (aliases do not
// resolve in CSS). This script parses that table for the canonical seam list, then fails on any
// import that resolves into src/chassis/ but names a file the table does not list, the same way a
// reach past a package's public exports would fail. It says nothing about WHICH symbols a seam
// exports; svelte-check already fails an import of a name a module does not export.
//
// Wired as `npm run check:chassis-boundary`.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { resolve, relative, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { repoRoot } from './repo-root.mjs';

const ROOT = repoRoot(import.meta.url);
const SHOWCASE_SRC = resolve(ROOT, 'examples/showcase/src');
const CHASSIS_DIR = resolve(SHOWCASE_SRC, 'chassis');
const README = resolve(CHASSIS_DIR, 'README.md');

// Matches a static import's source, a dynamic import(), or a CSS @import, whichever a given file uses.
const IMPORT_SPEC =
  /from\s+['"]([^'"]+)['"]|import\(\s*['"]([^'"]+)['"]\s*\)|@import\s+['"]([^'"]+)['"]/g;

/**
 * The basename of an import specifier or a table filename, with its extension stripped once. Both
 * sides of the comparison run through this, so `$chassis/cairn.server.js` (the NodeNext import
 * form) and `cairn.server.ts` (the README's own filename) normalize to the same `cairn.server`.
 * @param {string} spec
 * @returns {string}
 */
export function seamBaseName(spec) {
  const base = spec.split('/').pop() ?? spec;
  return base.replace(/\.(ts|js|css|svelte)$/, '');
}

/**
 * The canonical seam list: every filename in a `| \`name\` | ... |` row of the chassis README's
 * table, normalized through {@link seamBaseName}.
 * @param {string} readmeText
 * @returns {Set<string>}
 */
export function parseSeams(readmeText) {
  const seams = new Set();
  for (const m of readmeText.matchAll(/^\|\s*`([^`]+)`\s*\|/gm)) seams.add(seamBaseName(m[1]));
  return seams;
}

/**
 * Whether an import specifier resolves into src/chassis/: the `$chassis` alias, or a relative path
 * with a `chassis/` path segment.
 * @param {string} spec
 * @returns {boolean}
 */
export function referencesChassis(spec) {
  return spec.startsWith('$chassis/') || /(^|\/)chassis\//.test(spec);
}

/**
 * Every file under `dir`, recursive, whose name ends in one of `exts`.
 * @param {string} dir
 * @param {string[]} exts
 * @returns {string[]}
 */
function walkExts(dir, exts) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) out.push(...walkExts(full, exts));
    else if (exts.some((ext) => name.endsWith(ext))) out.push(full);
  }
  return out;
}

/**
 * Every reach-in in one file's already-read source: a chassis-referencing import whose named file
 * is not in `seams`. Pure (no I/O), so it is unit-testable directly on a source string, without a
 * fixture file the root project's own type-check would otherwise pick up as real TypeScript.
 * @param {string} label The file path to report a violation under.
 * @param {string} source
 * @param {Set<string>} seams
 * @returns {{ file: string, spec: string }[]}
 */
export function reachInsInSource(label, source, seams) {
  const violations = [];
  for (const m of source.matchAll(IMPORT_SPEC)) {
    const spec = m[1] ?? m[2] ?? m[3];
    if (!spec || !referencesChassis(spec)) continue;
    if (!seams.has(seamBaseName(spec))) violations.push({ file: label, spec });
  }
  return violations;
}

/**
 * Every reach-in across every theme file (every file under `srcDir` except `chassisDir` itself).
 * @param {string} srcDir
 * @param {string} chassisDir
 * @param {Set<string>} seams
 * @returns {{ file: string, spec: string }[]}
 */
export function findReachIns(srcDir, chassisDir, seams) {
  const violations = [];
  for (const file of walkExts(srcDir, ['.ts', '.svelte', '.css'])) {
    if (file === chassisDir || file.startsWith(chassisDir + '/')) continue;
    const text = readFileSync(file, 'utf8');
    violations.push(...reachInsInSource(relative(ROOT, file), text, seams));
  }
  return violations;
}

function main() {
  const seams = parseSeams(readFileSync(README, 'utf8'));
  if (seams.size === 0) {
    console.error('check:chassis-boundary: parsed zero seams out of the chassis README table');
    process.exit(1);
  }
  const violations = findReachIns(SHOWCASE_SRC, CHASSIS_DIR, seams);
  if (violations.length === 0) {
    console.log(`chassis-boundary: PASS (${seams.size} documented seams, no reach-ins)`);
    process.exit(0);
  }
  console.error('chassis-boundary: FAIL');
  for (const v of violations) console.error(`  ${v.file}: reaches into chassis via "${v.spec}", which src/chassis/README.md does not document as a seam`);
  process.exit(1);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
