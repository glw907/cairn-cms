// cairn-cms: the reference-arm coverage gate. It enumerates the exported names of each package
// subpath from the built .d.ts through the TypeScript compiler API (so re-exports, `export *`, and
// type-only exports all resolve correctly), then asserts each name appears in that subpath's
// reference page. A missing or renamed export fails the gate. The RED output is the page worklist.
import ts from 'typescript';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

// Load a .d.ts module through the compiler API and return its type checker plus its export
// symbols (re-exports and `export *` resolved). The two reference gates share this so they
// enumerate the same surface; the signature gate keeps the checker to render each export's type.
/** @param {string} dtsPath */
export function moduleExports(dtsPath) {
  const program = ts.createProgram([dtsPath], {
    noEmit: true,
    skipLibCheck: true,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
  });
  const checker = program.getTypeChecker();
  const source = program.getSourceFile(dtsPath);
  if (!source) throw new Error(`cannot load ${dtsPath}`);
  const moduleSymbol = checker.getSymbolAtLocation(source);
  if (!moduleSymbol) throw new Error(`no module symbol for ${dtsPath}`);
  return { checker, symbols: checker.getExportsOfModule(moduleSymbol) };
}

// Enumerate the exported names of a .d.ts module. Resolves re-exports and `export *`.
/** @param {string} dtsPath */
export function enumerateExports(dtsPath) {
  return moduleExports(dtsPath)
    .symbols.map((s) => s.name)
    .sort();
}

// The names from `names` that do not appear as a whole-word token in the page text.
/**
 * @param {string[]} names
 * @param {string} pageText
 */
export function missingNames(names, pageText) {
  return names.filter((/** @type {string} */ name) => {
    const escaped = name.replace(/[$]/g, '\\$&');
    return !new RegExp(`(?<![\\w$])${escaped}(?![\\w$])`).test(pageText);
  });
}

// One reference page per importable subpath. `excludeDts` drops a re-exported surface that is
// documented on its own page: /delivery re-exports all of /delivery/data, so the delivery page
// documents only its own additions. The /delivery/head entry points at the same delivery.md page,
// so the folded-in CairnHead is covered there.
export const CONFIG = [
  { subpath: '.', dts: 'dist/index.d.ts', page: 'docs/reference/core.md' },
  { subpath: '/sveltekit', dts: 'dist/sveltekit/index.d.ts', page: 'docs/reference/sveltekit.md' },
  { subpath: '/components', dts: 'dist/components/index.d.ts', page: 'docs/reference/components.md' },
  { subpath: '/render', dts: 'dist/render/authoring.d.ts', page: 'docs/reference/render.md' },
  { subpath: '/delivery', dts: 'dist/delivery/index.d.ts', page: 'docs/reference/delivery.md', excludeDts: 'dist/delivery/data.d.ts' },
  { subpath: '/delivery/data', dts: 'dist/delivery/data.d.ts', page: 'docs/reference/delivery-data.md' },
  { subpath: '/delivery/head', dts: 'dist/delivery/head.d.ts', page: 'docs/reference/delivery.md' },
  { subpath: '/vite', dts: 'dist/vite/index.d.ts', page: 'docs/reference/vite.md' },
  // Type-only: the module exports no names, so the entry asserts only that the page exists.
  { subpath: '/ambient', dts: 'dist/ambient.d.ts', page: 'docs/reference/ambient.md' },
];

/** @param {{ subpath: string, dts: string, page: string, excludeDts?: string }} entry */
function checkOne(entry) {
  const dtsPath = resolve(ROOT, entry.dts);
  if (!existsSync(dtsPath)) throw new Error(`missing ${entry.dts}; run "npm run package" first`);
  let names = enumerateExports(dtsPath);
  if (entry.excludeDts) {
    const excluded = new Set(enumerateExports(resolve(ROOT, entry.excludeDts)));
    names = names.filter((n) => !excluded.has(n));
  }
  const pagePath = resolve(ROOT, entry.page);
  if (!existsSync(pagePath)) return { subpath: entry.subpath, page: entry.page, missing: names, noPage: true };
  const missing = missingNames(names, readFileSync(pagePath, 'utf8'));
  return { subpath: entry.subpath, page: entry.page, missing };
}

function main() {
  const only = process.argv[2];
  const entries = only ? CONFIG.filter((c) => c.subpath === only) : CONFIG;
  if (only && entries.length === 0) {
    console.error(`unknown subpath ${only}`);
    process.exit(2);
  }
  let failed = false;
  for (const entry of entries) {
    const r = checkOne(entry);
    if (r.noPage) {
      console.error(`MISSING PAGE ${r.page} (${r.subpath})`);
      failed = true;
    } else if (r.missing.length) {
      console.error(`${r.subpath} (${r.page}): ${r.missing.length} uncovered: ${r.missing.join(', ')}`);
      failed = true;
    } else {
      console.log(`OK ${r.subpath} (${r.page})`);
    }
  }
  process.exit(failed ? 1 : 0);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
