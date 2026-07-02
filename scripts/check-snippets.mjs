// cairn-cms: the doc-snippet typecheck gate. It extracts every fenced ```ts, ```typescript, and
// ```svelte code block from docs/tutorial, docs/guides, and docs/reference, and typechecks each
// one against the BUILT package (run `npm run package` first) through the TypeScript compiler API.
// A page that teaches a retired export or a stale call signature fails the gate; the RED output
// names the doc file, the line, and the compiler's own message.
//
// Each fenced block typechecks on its own (not concatenated with its neighbors): a reference page
// often walks several DIFFERENT files in sequence (a route's `+page.server.ts` next to its
// `+page.svelte`, or one milestone's file shown again with the next milestone's addition), each
// restating names like `load`, `cairn`, or `prerender` that a shared program would collide on. A
// block that only makes sense as a continuation of an earlier one (it uses a name the block
// itself never declares or imports) is a deliberate fragment; give it the opt-out below rather
// than fighting the compiler to stand it up alone.
//
// A doc snippet is not a standalone program: it imports fictional site-local modules
// ($lib/cairn.config.js, ./$types, and the like) that only exist in the tutorial's imagined
// project, never in this repo. Resolving those for real is not this gate's job, so before
// typechecking, every import whose specifier is NOT `@glw907/cairn-cms` (or a subpath) and does
// not resolve to a real dependency of this package is rewritten to an untyped `any` stand-in
// (`rewriteLocalImports`). This keeps the gate's teeth on the one thing it exists to catch: a
// snippet's use of the PACKAGE's real exports, names, and signatures. A relative import or a
// SvelteKit alias ($lib, $app, $env, ...) is always treated as local, even if a same-named file
// happens to exist on disk, since the snippet's paths are fictional, not real filesystem targets.
// A ```svelte block is reduced to its `<script>` body before the same treatment; a block with no
// `<script>` tag (pure markup) carries nothing to typecheck and is silently excluded.
//
// Per-block opt-out: a snippet that is a deliberate fragment (a partial diff continuing an earlier
// block, or markup-only prose that is not valid top-level TypeScript on its own) cannot typecheck
// standalone. Mark it with an HTML comment on the line immediately before the fence (blank lines
// before the comment are fine), naming why:
//
//   <!-- snippet-check-skip: continues the adapter object opened in the milestone-2 block -->
//   ```ts
//   ...
//   ```
//
// Use it sparingly: a page thick with opt-outs has stopped proving anything. Prefer making a block
// standalone (repeat the small amount of surrounding context) over annotating it away.
import ts from 'typescript';
import { readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { repoRoot } from './repo-root.mjs';
import { walk } from './walk-files.mjs';
import { CONFIG, runIfMain } from './reference-coverage.mjs';

const ROOT = repoRoot(import.meta.url);
const DOC_DIRS = ['docs/tutorial', 'docs/guides', 'docs/reference'];
const PACKAGE_NAME = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8')).name;

const SKIP_RE = /^<!--\s*snippet-check-skip:\s*(.+?)\s*-->$/;
const FENCE_OPEN_RE = /^```(ts|typescript|svelte)\s*$/;
const FENCE_CLOSE_RE = /^```\s*$/;

// Whether `spec` is the package itself or one of its subpaths (`@glw907/cairn-cms/sveltekit`).
/** @param {string} spec */
export function isPackageSpecifier(spec) {
  return spec === PACKAGE_NAME || spec.startsWith(`${PACKAGE_NAME}/`);
}

// Whether an import specifier should typecheck against a REAL module rather than an `any` stub.
// The package itself always does. A relative specifier or a SvelteKit alias ($lib, $app, $env,
// ...) never does, since a doc snippet's local paths are fictional, not real filesystem targets,
// even when a same-named file happens to exist. Any other bare specifier is real exactly when
// it resolves as an actual dependency of this package (so a devDependency the tutorial mentions
// but this repo does not install, like a site's own `@tailwindcss/vite`, stubs automatically
// with no allowlist to maintain).
/** @param {string} spec */
export function isRealSpecifier(spec) {
  if (isPackageSpecifier(spec)) return true;
  if (spec.startsWith('.') || spec.startsWith('$')) return false;
  try {
    import.meta.resolve(spec);
    return true;
  } catch {
    return false;
  }
}

/** @param {string} name @param {boolean} isType */
function declFor(name, isType) {
  return isType ? `type ${name} = any;` : `declare const ${name}: any;`;
}

// The `declare`/`type` stand-ins for one import clause (`Def, { a, b as bb }`, `* as ns`, or
// `{ a, type B }`), honoring an inline `type` modifier or the whole-import `type` keyword.
/** @param {string} clause @param {boolean} wholeTypeOnly */
function stubClause(clause, wholeTypeOnly) {
  const trimmed = clause.trim();
  const ns = trimmed.match(/^\*\s+as\s+([\w$]+)$/);
  if (ns) return [declFor(ns[1], wholeTypeOnly)];

  const defaultPlusNamed = trimmed.match(/^([\w$]+)(?:\s*,\s*\{([^}]*)\})?$/);
  if (defaultPlusNamed) {
    const out = [declFor(defaultPlusNamed[1], wholeTypeOnly)];
    if (defaultPlusNamed[2]) out.push(...namedDecls(defaultPlusNamed[2], wholeTypeOnly));
    return out;
  }

  const namedOnly = trimmed.match(/^\{([^}]*)\}$/);
  if (namedOnly) return namedDecls(namedOnly[1], wholeTypeOnly);

  return [`// snippet-check: could not stub import clause "${trimmed}"`];
}

/** @param {string} inner @param {boolean} wholeTypeOnly */
function namedDecls(inner, wholeTypeOnly) {
  return inner
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((spec) => {
      let isType = wholeTypeOnly;
      let s = spec;
      if (/^type\s+/.test(s)) {
        isType = true;
        s = s.replace(/^type\s+/, '');
      }
      const asMatch = s.match(/^([\w$]+)\s+as\s+([\w$]+)$/);
      const name = asMatch ? asMatch[2] : s;
      return declFor(name, isType);
    });
}

const SIDE_EFFECT_IMPORT_RE = /^(\s*)import\s+['"]([^'"]+)['"]\s*;?\s*$/;
const FROM_IMPORT_RE = /^(\s*)import\s+(type\s+)?(.*?)\s+from\s+['"]([^'"]+)['"]\s*;?\s*$/;

// Rewrite every LOCAL import statement (see `isRealSpecifier`) to an untyped `any` stand-in,
// one line in, one line out, so a diagnostic's line number still lines up with the source block.
// A real-specifier import (the package, or a resolvable dependency) is left untouched, so the
// compiler checks it for real. Only single-line import statements are recognized; the doc corpus
// carries none that wrap, and a block that needs one gets the opt-out annotation instead.
/** @param {string} code */
export function rewriteLocalImports(code) {
  /** @type {Set<string>} */
  const declared = new Set();
  /** @param {string[]} lines */
  const dedup = (lines) => lines.filter((/** @type {string} */ l) => {
    const m = l.match(/^(?:declare const|type) ([\w$]+)/);
    if (!m) return true;
    if (declared.has(m[1])) return false;
    declared.add(m[1]);
    return true;
  });

  return code
    .split('\n')
    .map((line) => {
      const sideEffect = line.match(SIDE_EFFECT_IMPORT_RE);
      if (sideEffect) {
        const [, indent, spec] = sideEffect;
        if (isRealSpecifier(spec)) return line;
        return `${indent}// snippet-check: stubbed side-effect import '${spec}'`;
      }
      const fromImport = line.match(FROM_IMPORT_RE);
      if (!fromImport) return line;
      const [, indent, typeOnly, clause, spec] = fromImport;
      if (isRealSpecifier(spec)) return line;
      const stubbed = dedup(stubClause(clause, Boolean(typeOnly)));
      return stubbed.length ? indent + stubbed.join(' ') : `${indent}// snippet-check: stubbed import from '${spec}'`;
    })
    .join('\n');
}

/**
 * Every fenced ```ts/```typescript/```svelte block in a Markdown doc, with its 1-based fence
 * line and, when the line immediately above (skipping blanks) carries a `snippet-check-skip:`
 * comment, the opt-out reason.
 * @param {string} markdown
 */
export function extractBlocks(markdown) {
  const lines = markdown.split('\n');
  /** @type {{ lang: string, fenceLine: number, body: string, skipReason: string | null }[]} */
  const blocks = [];
  for (let i = 0; i < lines.length; i++) {
    const open = lines[i].match(FENCE_OPEN_RE);
    if (!open) continue;
    let j = i + 1;
    while (j < lines.length && !FENCE_CLOSE_RE.test(lines[j])) j++;
    const body = lines.slice(i + 1, j).join('\n');
    let k = i - 1;
    while (k >= 0 && lines[k].trim() === '') k--;
    const skip = k >= 0 ? lines[k].match(SKIP_RE) : null;
    blocks.push({ lang: open[1], fenceLine: i + 1, body, skipReason: skip ? skip[1] : null });
    i = j;
  }
  return blocks;
}

// The `<script>` body of a ```svelte block, plus how many of the block's own lines precede the
// script's first content line (so a diagnostic line maps back to the doc correctly). Returns
// null for a block with no `<script>` tag: pure markup carries nothing to typecheck.
/** @param {string} body */
export function svelteScript(body) {
  const lines = body.split('\n');
  const openIdx = lines.findIndex((l) => /<script[^>]*>/.test(l));
  if (openIdx === -1) return null;
  const closeIdx = lines.findIndex((l, idx) => idx > openIdx && /<\/script>/.test(l));
  const end = closeIdx === -1 ? lines.length : closeIdx;
  return { code: lines.slice(openIdx + 1, end).join('\n'), lineOffset: openIdx + 1 };
}

// Whether a ts/typescript block is PURELY ambient declarations (`declare function`, an
// `interface`, a `type` alias, ...), a bodyless overload signature (`function NAME(...): Ret;`
// with no implementation, the reference arm's other signature-listing convention), or a
// component's bare Props shape (`let { data, form }: { data: AdminData; ... };`, no
// `= $props()`, the reference arm's convention for documenting a component's wiring props)
// rather than a runnable example. The reference arm documents a signature this way on purpose (a
// heading followed by one bare block, which `check-reference-signatures.mjs` already typechecks
// against the real export); it is exposition, not an example, so the snippet gate excludes it
// automatically, the same way a ```svelte block with no `<script>` is excluded, rather than
// asking every one of these to carry an opt-out annotation. The Props case is scoped to a
// single-statement block on purpose: a real, multi-statement example that forgot `= $props()`
// still fails, since that is a genuine copy-paste trap for a reader.
/** @param {string} code */
export function isDeclarationOnly(code) {
  const source = ts.createSourceFile('check.ts', code, ts.ScriptTarget.ES2022, true);
  if (source.statements.length === 0) return false;
  if (source.statements.length === 1 && isBarePropsShape(source.statements[0])) return true;
  // A bare `{ key?: Type; ... }` with no `type X =` wrapper parses as a single Block statement;
  // the reference arm uses this for an inline type shape with no separately named type (the
  // `MarkdownEditor` wiring-props listing). It carries no runnable code either.
  if (source.statements.length === 1 && ts.isBlock(source.statements[0])) return true;
  return source.statements.every((stmt) => {
    if (ts.isInterfaceDeclaration(stmt) || ts.isTypeAliasDeclaration(stmt)) return true;
    if (ts.isFunctionDeclaration(stmt) && !stmt.body) return true;
    // `canHaveModifiers` narrows to `HasModifiers`, a broader union (it also covers statement-like
    // nodes such as `VariableStatement`) that TS does not consider assignable to the narrower
    // `Declaration` type `getCombinedModifierFlags` declares; the guard above already proves this
    // node carries modifiers, which is all the flags call needs.
    const hasDeclare =
      ts.canHaveModifiers(stmt) &&
      (ts.getCombinedModifierFlags(/** @type {ts.Declaration} */ (/** @type {unknown} */ (stmt))) & ts.ModifierFlags.Ambient) !== 0;
    return hasDeclare && (ts.isFunctionDeclaration(stmt) || ts.isVariableStatement(stmt) || ts.isClassDeclaration(stmt) || ts.isModuleDeclaration(stmt));
  });
}

/** @param {ts.Statement} stmt */
function isBarePropsShape(stmt) {
  if (!ts.isVariableStatement(stmt)) return false;
  const decls = stmt.declarationList.declarations;
  if (decls.length !== 1) return false;
  const [decl] = decls;
  return (ts.isObjectBindingPattern(decl.name) || ts.isArrayBindingPattern(decl.name)) && decl.initializer === undefined;
}

/** Every doc file under the three checked directories, repo-relative, sorted. */
export function docFiles() {
  return DOC_DIRS.flatMap((dir) => walk(join(ROOT, dir), (name) => name.endsWith('.md')))
    .map((p) => relative(ROOT, p))
    .sort();
}

/**
 * Every typecheckable unit across the corpus: one unit per non-skipped, non-declaration-only
 * ```ts/```typescript block, and one per non-skipped, non-declaration-only ```svelte block's
 * `<script>`. `lineBase` is added to a diagnostic's own (1-based) internal line to get the doc's
 * line. Also returns the skipped blocks (for the summary) and a count of blocks silently excluded
 * (declaration-only, or a ```svelte block with no `<script>`).
 */
export function collectUnits() {
  /** @type {{ file: string, lineBase: number, code: string }[]} */
  const units = [];
  /** @type {{ file: string, fenceLine: number, reason: string }[]} */
  const skipped = [];
  let excluded = 0;
  for (const file of docFiles()) {
    const text = readFileSync(join(ROOT, file), 'utf8');
    for (const block of extractBlocks(text)) {
      if (block.skipReason) {
        skipped.push({ file, fenceLine: block.fenceLine, reason: block.skipReason });
        continue;
      }
      if (block.lang === 'svelte') {
        const script = svelteScript(block.body);
        if (!script) {
          excluded++;
          continue;
        }
        if (isDeclarationOnly(script.code)) {
          excluded++;
          continue;
        }
        units.push({ file, lineBase: block.fenceLine + script.lineOffset, code: rewriteLocalImports(script.code) });
      } else {
        if (isDeclarationOnly(block.body)) {
          excluded++;
          continue;
        }
        units.push({ file, lineBase: block.fenceLine, code: rewriteLocalImports(block.body) });
      }
    }
  }
  return { units, skipped, excluded };
}

// The `paths` map from each package subpath to its built `.d.ts`, shared with the reference
// gates' CONFIG so a new subpath needs no second registration.
function packagePaths() {
  /** @type {Record<string, string[]>} */
  const paths = {};
  for (const entry of CONFIG) {
    const specifier = entry.subpath === '.' ? PACKAGE_NAME : `${PACKAGE_NAME}${entry.subpath}`;
    paths[specifier] = [entry.dts];
  }
  return paths;
}

/**
 * Typecheck every unit in one TypeScript program (in-memory sources, no scratch directory) and
 * return each diagnostic mapped back to its doc file and line.
 * @param {{ file: string, lineBase: number, code: string }[]} units
 */
export function typecheckUnits(units) {
  // The virtual paths live under the real repo root, never written to disk, so an ancestor
  // lookup (the nearest `package.json`'s `"type": "module"`, `node_modules` for a real
  // specifier) still finds the repo's own, rather than walking off the filesystem root.
  const virtualDir = join(ROOT, '.snippet-check-virtual');
  const virtual = new Map(units.map((u, i) => [join(virtualDir, `${i}.ts`), u]));
  const options = {
    baseUrl: ROOT,
    paths: packagePaths(),
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.NodeNext,
    moduleResolution: ts.ModuleResolutionKind.NodeNext,
    strict: true,
    // A local-module stub types every import `any`, so a callback parameter typed only through a
    // stubbed contextual type (`export const load: PageServerLoad = (event) => ...`) has no real
    // signature to infer from. That is a property of the stub, not a defect in the snippet, so
    // implicit-any goes off while the rest of `strict` (null checks, real-export signatures)
    // stays on.
    noImplicitAny: false,
    skipLibCheck: true,
    noEmit: true,
    // TS 6 warns that a bare `baseUrl` (no `paths`-relative rewrite) is deprecated for TS 7; the
    // repo pins TS 6, and `paths` needs `baseUrl` until then.
    ignoreDeprecations: '6.0',
  };

  const host = ts.createCompilerHost(options);
  const realFileExists = host.fileExists.bind(host);
  const realReadFile = host.readFile.bind(host);
  const realGetSourceFile = host.getSourceFile.bind(host);
  host.fileExists = (fileName) => virtual.has(fileName) || realFileExists(fileName);
  host.readFile = (fileName) => {
    const unit = virtual.get(fileName);
    return unit ? unit.code : realReadFile(fileName);
  };
  host.getSourceFile = (fileName, versionOrOpts, onError) => {
    const unit = virtual.get(fileName);
    return unit
      ? ts.createSourceFile(fileName, unit.code, versionOrOpts ?? ts.ScriptTarget.ES2022, true)
      : realGetSourceFile(fileName, versionOrOpts, onError);
  };

  const program = ts.createProgram([...virtual.keys()], options, host);
  const diagnostics = ts.getPreEmitDiagnostics(program);

  /** @type {{ file: string, line: number, message: string }[]} */
  const problems = [];
  for (const d of diagnostics) {
    if (!d.file || d.start === undefined) continue;
    // TS2347 ("Untyped function calls may not accept type arguments") only fires on a call whose
    // callee resolved to `any`. Every real cairn-cms export is properly typed, so this can only
    // happen when the callee traces back through a local-module stub (an `any`-typed chain off a
    // stubbed `./$types`, for example); it is a property of the stub, not the snippet.
    if (d.code === 2347) continue;
    const unit = virtual.get(d.file.fileName);
    if (!unit) continue;
    const pos = ts.getLineAndCharacterOfPosition(d.file, d.start);
    const message = ts.flattenDiagnosticMessageText(d.messageText, '\n');
    problems.push({ file: unit.file, line: unit.lineBase + pos.line + 1, message });
  }
  return problems.sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line);
}

function main() {
  const { units, skipped, excluded } = collectUnits();
  const problems = typecheckUnits(units);

  if (skipped.length) {
    console.log(`check:snippets: ${skipped.length} opted-out block(s):`);
    for (const s of skipped) console.log(`  ${s.file}:${s.fenceLine}  ${s.reason}`);
  }

  if (problems.length === 0) {
    console.log(
      `check:snippets: OK (${units.length} block(s) typechecked, ${skipped.length} opted out, ${excluded} excluded as declaration-only or scriptless)`,
    );
    process.exit(0);
  }

  console.error(`check:snippets: ${problems.length} problem(s) across ${units.length} checked block(s)\n`);
  let last = '';
  for (const p of problems) {
    if (p.file !== last) {
      console.error(`  ${p.file}`);
      last = p.file;
    }
    console.error(`    :${p.line}  ${p.message.split('\n')[0]}`);
  }
  process.exit(1);
}

runIfMain(main, import.meta.url);
