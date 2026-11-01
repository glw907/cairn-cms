// cairn-cms: the shared loader for a built `.d.ts` module. The gates that enumerate the package's
// exports (the surface, option, and tier gates, and the reference gates) start a declaration program
// here, so the `moduleResolution` and `skipLibCheck` options and the missing-source guard stay in one
// place, outside any gate a later change might delete.
import ts from 'typescript';

// Load a .d.ts module through the compiler API and return its type checker plus its source file.
/** @param {string} dtsPath */
export function loadDts(dtsPath) {
  const program = ts.createProgram([dtsPath], {
    noEmit: true,
    skipLibCheck: true,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
  });
  const checker = program.getTypeChecker();
  const source = program.getSourceFile(dtsPath);
  if (!source) throw new Error(`cannot load ${dtsPath}`);
  return { checker, source };
}

// A .d.ts module's type checker plus its export symbols (re-exports and `export *` resolved).
/** @param {string} dtsPath */
export function moduleExports(dtsPath) {
  const { checker, source } = loadDts(dtsPath);
  const moduleSymbol = checker.getSymbolAtLocation(source);
  if (!moduleSymbol) throw new Error(`no module symbol for ${dtsPath}`);
  return { checker, symbols: checker.getExportsOfModule(moduleSymbol) };
}

// Enumerate the exported names of a .d.ts module, sorted. Resolves re-exports and `export *`.
/** @param {string} dtsPath */
export function enumerateExports(dtsPath) {
  return moduleExports(dtsPath)
    .symbols.map((s) => s.name)
    .sort();
}
