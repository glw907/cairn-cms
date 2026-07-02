// cairn-cms: the CodeMirror internal-class ratchet. The editor themes CodeMirror through EditorView.theme
// object keys; a chrome `.cm-*` class (a built-in widget's internal structure) is fragile across a CM
// major, so this gate holds the editor theme's chrome coupling to a by-name floor. Writing-surface content
// classes and cairn's own `.cm-cairn-*` decorations are allow-listed; the sole sanctioned chrome touch is a
// neutralize of `.cm-tooltip` (CM force-adds that class to every tooltip). Wired as `npm run check:cm-internals`.
import { readFileSync } from 'node:fs';
import { resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { walk } from './walk-files.mjs';
import { repoRoot } from './repo-root.mjs';

const ROOT = repoRoot(import.meta.url);
// Three regexes with three jobs. TOKEN is GLOBAL (for matchAll) and must never be reused for `.test()`
// (a global regex's .test() advances lastIndex and is stateful across calls). HAS_CM is the stateless
// boolean for the staleness guard. DYNAMIC catches a dynamically composed CHROME name; cairn's own
// `.cm-cairn-*` decorations (which legitimately interpolate, e.g. `.cm-cairn-depth-${depth}`) are exempt
// via the negative lookahead, so the gate does not false-positive on sanctioned rail selectors.
const TOKEN = /\.cm-[a-zA-Z][a-zA-Z-]*/g;
const HAS_CM = /\.cm-[a-zA-Z]/;
const DYNAMIC = /\.cm-(?!cairn-)[a-zA-Z-]*\$\{/;

/** @typedef {{ writingSurface: string[], cairnPrefix: string, chromeFloor: string[], enumeratedFiles: string[] }} Allowlist */

/**
 * Every `.cm-*` token in a source, composite keys (`.cm-a.cm-b`) split into individual tokens.
 * @param {string} source
 * @returns {string[]}
 */
export function collectCmTokens(source) {
  return [...source.matchAll(TOKEN)].map((m) => m[0]);
}

/**
 * Evaluate the enumerated editor files against the allowlist.
 * @param {{path: string, source: string}[]} files
 * @param {Allowlist} allow
 */
export function evaluate(files, allow) {
  const failures = [];
  const sanctioned = new Set([...allow.writingSurface, ...allow.chromeFloor]);
  for (const { path, source } of files) {
    if (DYNAMIC.test(source)) failures.push(`dynamically composed .cm- chrome selector in ${path}`);
    for (const token of collectCmTokens(source)) {
      if (token.startsWith(allow.cairnPrefix)) continue;
      if (sanctioned.has(token)) continue;
      failures.push(`unsanctioned chrome class: ${token} (${path})`);
    }
  }
  return { pass: failures.length === 0, failures };
}

function main() {
  /** @type {Allowlist} */
  const allow = JSON.parse(readFileSync(resolve(ROOT, 'scripts/cm-internals-allowlist.json'), 'utf8'));
  const enumerated = new Set(allow.enumeratedFiles);
  const failures = [];
  // Staleness guard: any file under src/lib/components that mentions `.cm-` MUST be enumerated. HAS_CM is
  // stateless, so this cannot skip a file the way a reused global .test() would.
  for (const file of walk(resolve(ROOT, 'src/lib/components'), (n) => n.endsWith('.ts') || n.endsWith('.svelte'))) {
    const rel = relative(ROOT, file).split('\\').join('/');
    if (HAS_CM.test(readFileSync(file, 'utf8')) && !enumerated.has(rel)) {
      failures.push(`un-enumerated file contains .cm-: ${rel}`);
    }
  }
  const files = allow.enumeratedFiles.map((rel) => ({ path: rel, source: readFileSync(resolve(ROOT, rel), 'utf8') }));
  const all = [...failures, ...evaluate(files, allow).failures];
  if (all.length === 0) {
    console.log('cm-internals: PASS');
    process.exit(0);
  }
  console.error('cm-internals: FAIL');
  for (const f of all) console.error(`  ${f}`);
  process.exit(1);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
