// cairn-cms: the static-import-graph walk the reproductions node-safety specs share
// (reproductions-manifest.test.ts, reproductions-fixtures.test.ts). Both halves of the reproductions
// module make the same claim about a different entry file, that nothing in its static graph is a
// `.svelte` component, and one walk keeps the two from drifting into checking different graphs.
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

// A bound specifier (`import x from './a.js'`, `export * from './b.js'`) and a side-effect one
// (`import './c.svelte'`) are both static graph edges, and the side-effect form is the one that
// pulls in a stylesheet or a component for its effects alone. Matching only the `from` shape let
// `import './probe.svelte'` walk straight past the callers, so both forms are matched.
const BOUND_IMPORT = /(?:^|\n)\s*(?:import|export)[\s\S]*?\bfrom\s*['"](\.[^'"]+)['"]/g;
const SIDE_EFFECT_IMPORT = /(?:^|\n)\s*import\s*['"](\.[^'"]+)['"]/g;

/** Every relative specifier a module names. A dynamic import is not a static graph edge. */
function relativeImports(source: string): string[] {
  const out: string[] = [];
  for (const pattern of [BOUND_IMPORT, SIDE_EFFECT_IMPORT]) {
    for (const match of source.matchAll(pattern)) out.push(match[1]);
  }
  return out;
}

/**
 * Walk a module's static import graph, resolving each NodeNext `.js` specifier to its `.ts`.
 * @param entry - the absolute path of the entry module's source file
 * @returns every source file reachable from `entry`, `entry` included
 */
export function staticImportGraph(entry: string): string[] {
  const seen = new Set<string>();
  const queue = [entry];
  while (queue.length) {
    const file = queue.shift();
    if (!file || seen.has(file)) continue;
    seen.add(file);
    const source = readFileSync(file, 'utf8');
    for (const specifier of relativeImports(source)) {
      // NodeNext specifiers name the emitted `.js`; the source beside it is `.ts`. A `.svelte`
      // specifier resolves to itself, which is exactly the case the callers exist to catch.
      const resolved = resolve(dirname(file), specifier.replace(/\.js$/, '.ts'));
      queue.push(resolved);
    }
  }
  return [...seen];
}
