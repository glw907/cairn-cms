// cairn-cms: the F-1 leak-class rider, chained from the existing `check:surface` package entry
// (no new top-level gate name; see the plan's tie-break rule). F-1's predicate: a
// retire-verdicted OR ABSENT name (never exported from any subpath) still named inside a
// surviving KEEP export's rendered public shape is a closure leak: a consumer can read the
// value's SHAPE, through indexed access or an inline member, but cannot NAME the type it holds.
// `https://github.com/glw907/cairn-cms/blob/pre-agent-first/docs/internal/record/2026-08-30-retires-move-record.md` is the brief this rider answers,
// including its "the internals pass should re-decide the split" instruction (Step 3 below).
//
// The derivation (`deriveTypeCheckerLeaks`) walks the real TypeScript type graph, through the
// compiler API, from every currently-exported symbol on each subpath's built `.d.ts`, to a fixed
// point. It catches a name buried more than one hop deep (`AdvisoryAction`, reachable only through
// `EditData.advisories[].actions[]`) that `buildSurfaceModel()`'s renderer cannot:
// `renderInterface` (check-surface.mjs) expands exactly one member level. It follows a type across
// subpaths: a reachable name exported from any subpath is nameable, so it is no leak, and the
// one-path rule in check-surface.mjs holds where that name imports from.
//
// The recorded registry (`check-surface-leaks.json`) is keyed by (name, subpath), each entry
// carrying exactly one reason kind: `sanctioned-by` (a ledger slug or move-record row) or
// `standing-unverdicted` (a one-line citation). The gate fails on any leak the derivation finds
// with no matching entry, and on any entry the derivation no longer produces (the record shrinks
// as a leak is resolved).
import ts from 'typescript';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { walk } from '../walk-files.mjs';
import { repoRoot } from '../repo-root.mjs';
import { moduleExports } from './dts-exports.mjs';
import { buildSurfaceModel, surfaceSubpaths } from './check-surface.mjs';

const ROOT = repoRoot(import.meta.url);
const REGISTRY_PATH = resolve(ROOT, 'scripts/checks/check-surface-leaks.json');

// --- the known type universe: every type/interface/enum src/lib declares, exported or not -----
// F-1's predicate needs to tell "our retired-or-internal type" apart from an ambient/library
// type the walker's recursion also touches (Array, Promise, RequestEvent, ...); a name only
// counts as a candidate leak if it is declared SOMEWHERE in our own source, whether or not it
// still carries the `export` keyword (a case-2 retire, per the move record, drops only that
// keyword and keeps the declaration).
const DECLARED_TYPE_RE = /^\s*(?:export\s+)?(?:type|interface|enum)\s+([A-Za-z_$][\w$]*)/;

/**
 * Every top-level `type`/`interface`/`enum` name declared in `files` (exported or not).
 * @param {string[]} files absolute paths
 * @param {Map<string, string>} texts absolute path to file text
 * @returns {Set<string>}
 */
export function collectDeclaredTypeNames(files, texts) {
  /** @type {Set<string>} */
  const names = new Set();
  for (const file of files) {
    for (const line of (texts.get(file) ?? '').split('\n')) {
      const m = DECLARED_TYPE_RE.exec(line);
      if (m) names.add(m[1]);
    }
  }
  return names;
}

/** @returns {Set<string>} */
function knownTypeUniverse() {
  const files = walk(resolve(ROOT, 'src/lib'), (n) => n.endsWith('.ts')).sort();
  const texts = new Map(files.map((f) => /** @type {[string, string]} */ ([f, readFileSync(f, 'utf8')])));
  return collectDeclaredTypeNames(files, texts);
}

// --- the type-checker model ---------------------------------------------------------------------
// Resolve a re-export alias symbol to its target, mirroring check-surface.mjs's
// `resolveAlias`. `moduleExports` returns each subpath's barrel-level symbols, most of which are
// ALIAS symbols pointing at the real declaration elsewhere in the built `dist/` tree; without
// this, `shapeTypeOf` below reads the alias's (empty) declaration rather than the interface
// or type alias it re-exports, and the walk never reaches a single member.
/**
 * @param {import('typescript').TypeChecker} checker
 * @param {import('typescript').Symbol} sym
 */
function resolveAlias(checker, sym) {
  return sym.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(sym) : sym;
}

// The type carrying an export's shape: a type-only symbol (interface/type alias/enum) on its
// declared type, a value symbol (a function, a const) on the type at its declaration. Mirrors
// check-surface.mjs's `shapeTypeOf`, kept local rather than imported so this rider does not
// widen that gate's exported surface for one internal helper.
/**
 * @param {import('typescript').TypeChecker} checker
 * @param {import('typescript').Symbol} sym
 */
function shapeTypeOf(checker, sym) {
  const isType = (sym.flags & (ts.SymbolFlags.Interface | ts.SymbolFlags.TypeAlias | ts.SymbolFlags.Enum)) !== 0;
  if (isType && (sym.flags & ts.SymbolFlags.Value) === 0) return checker.getDeclaredTypeOfSymbol(sym);
  const decl = sym.valueDeclaration ?? sym.declarations?.[0];
  if (!decl) return checker.getDeclaredTypeOfSymbol(sym);
  return checker.getTypeOfSymbolAtLocation(sym, decl);
}

// Whether an already alias-resolved symbol is a plain type-only export (an interface or a type
// alias, erased at compile time) rather than a value export: a function, a const, an enum (which
// compiles to a real runtime object, so its symbol carries a value side too, `RegularEnum` being
// part of `SymbolFlags.Value`), or a Svelte component. `svelte-package` emits a component's
// default export as `declare const X: Component<Props, Events, Slots>`, which TypeScript's symbol
// still marks with a type-alias-shaped flag alongside its variable flag, so `isType` alone cannot
// tell a component from a bare `export type`; the `Value` flag is what actually distinguishes them
// (present on every runtime-importable export, absent on a type-only one), and this is the same
// isType-and-not-`Value` test `shapeTypeOf` above already applies to choose which type carries an
// export's shape. F-1's `/admin` clause uses this to derive its root set mechanically off
// the real barrel, rather than asserting the split in prose.
/**
 * @param {import('typescript').Symbol} sym
 * @returns {boolean}
 */
export function isPlainTypeExport(sym) {
  const isType = (sym.flags & (ts.SymbolFlags.Interface | ts.SymbolFlags.TypeAlias | ts.SymbolFlags.Enum)) !== 0;
  const isValue = (sym.flags & ts.SymbolFlags.Value) !== 0;
  return isType && !isValue;
}

// A traversal depth cap, well past any real nesting this surface reaches (the deepest known
// chain, `MediaAltPreviewPlan` -> `MediaAltPreviewEntry` -> `AltPlacement`, is two hops); the cap
// exists only to bound a runaway if the visited-set cycle guard below ever misses a recursive
// type, never to limit a legitimate walk.
const MAX_DEPTH = 12;

/**
 * Every named type reachable from `rootTypes`, walking the real type graph through the compiler
 * API: union and intersection members, array element types, generic type arguments, and (for a
 * type declared under `ownDir`, or a genuinely anonymous object literal) each property's type.
 * `svelte-package` emits one `.d.ts` per source module rather than one rolled-up file per
 * subpath, so a subpath's barrel `.d.ts` re-exports names whose OWN declaration lives in a
 * sibling file under the same `dist/` tree; `ownDir` (the built `dist/` root) is what
 * distinguishes that sibling from a genuinely ambient/library type (`RequestEvent`, `Array`),
 * declared under `node_modules` or a TypeScript lib file, whose internals this walk never
 * needs to enter. A name is still RECORDED wherever a symbol resolves to it, ambient or not, and
 * the caller filters the result against the known type universe.
 * @param {import('typescript').TypeChecker} checker
 * @param {import('typescript').Type[]} rootTypes
 * @param {string} ownDir
 * @returns {Set<string>}
 */
export function collectReachableNames(checker, rootTypes, ownDir) {
  /** @type {Set<string>} */
  const names = new Set();
  // Tracks the SHALLOWEST depth each type has been explored from, not merely whether it has ever
  // been visited: two different roots can reach the same interned Type object at different
  // depths (EditData reaches AdvisoryNotice at depth 1; a wider root reaches it much deeper), and
  // a first visit that stops at MAX_DEPTH must not permanently block a later, shorter path from
  // exploring the same type's properties.
  /** @type {Map<import('typescript').Type, number>} */
  const bestDepth = new Map();

  /** @param {import('typescript').Type} type @param {number} depth */
  function visit(type, depth) {
    if (!type || depth > MAX_DEPTH) return;
    const seenAt = bestDepth.get(type);
    if (seenAt !== undefined && seenAt <= depth) return;
    bestDepth.set(type, depth);

    const aliasName = type.aliasSymbol?.getName();
    if (aliasName) names.add(aliasName);
    const sym = type.symbol;
    const symName = sym?.getName();
    if (symName && symName !== '__type' && symName !== '__object') names.add(symName);

    if (type.isUnion?.() || type.isIntersection?.()) {
      for (const member of type.types) visit(member, depth + 1);
      // `type.types` is the FLATTENED member list (a union-of-a-union collapses to its individual
      // literals at construction time); TypeScript separately tracks the PRE-flattened form on
      // `.origin` purely for display, and only THAT form still carries a nested member's
      // aliasSymbol (`TidyKeyProbeResult | "missing"`, flattened to four raw literals, loses
      // `TidyKeyProbeResult` from `.types` entirely, but keeps it on `.origin.types[0]`).
      const origin = /** @type {{ origin?: { types?: import('typescript').Type[] } }} */ (type).origin;
      if (origin?.types) for (const member of origin.types) visit(member, depth + 1);
      return;
    }
    // A deferred conditional's arm is often an indexed access over a mapped type, and a generic
    // mapped type has no enumerable properties; its template is only reachable through its node.
    if ((type.flags & ts.TypeFlags.IndexedAccess) !== 0) {
      const access = /** @type {import('typescript').IndexedAccessType} */ (type);
      visit(access.objectType, depth + 1);
      visit(access.indexType, depth + 1);
      return;
    }
    if (((/** @type {import('typescript').ObjectType} */ (type)).objectFlags & ts.ObjectFlags.Mapped) !== 0) {
      const mappedNode = /** @type {{ declaration?: import('typescript').MappedTypeNode }} */ (type).declaration;
      if (mappedNode?.type) visit(checker.getTypeFromTypeNode(mappedNode.type), depth + 1);
    }
    // A deferred conditional (`S extends X<infer A> ? Arm : Other`, left unresolved while `S` is
    // generic) is neither a union nor an object, so its arms are only reachable through the
    // declaration's own type nodes.
    if ((type.flags & ts.TypeFlags.Conditional) !== 0) {
      const node = /** @type {import('typescript').ConditionalType} */ (type).root?.node;
      if (node) {
        visit(checker.getTypeFromTypeNode(node.trueType), depth + 1);
        visit(checker.getTypeFromTypeNode(node.falseType), depth + 1);
      }
      return;
    }
    // An array type (`AdvisoryNotice[]`) is itself a generic type reference (`Array<AdvisoryNotice>`),
    // so its element type falls out of the generic type-arguments walk below; no separate case needed.
    // An index signature (`{ [x: string]: MediaUsageInfo }`) is not a property `getPropertiesOfType`
    // enumerates and not a generic type argument; its value type needs its own walk.
    for (const indexInfo of checker.getIndexInfosOfType?.(type) ?? []) visit(indexInfo.type, depth + 1);
    try {
      const args = checker.getTypeArguments(/** @type {import('typescript').TypeReference} */ (type));
      if (args?.length) for (const arg of args) visit(arg, depth + 1);
    } catch {
      // Not a generic type reference; no type arguments to walk.
    }
    // A callable member (every `createCairnAdmin`-composed action, `(event) => Promise<Result |
    // ActionFailure<Failure>>`) carries its leak-bearing types on its call signature, not as
    // an object PROPERTY; without this, every retire-verdicted name reachable only through an
    // action's parameter or return type (`DictionaryAddFailure`, `TidyFailure`, and their whole
    // family) is invisible to the walk.
    for (const signature of type.getCallSignatures()) {
      visit(checker.getReturnTypeOfSignature(signature), depth + 1);
      for (const param of signature.parameters) {
        const paramDecl = param.declarations?.[0];
        if (paramDecl) visit(checker.getTypeOfSymbolAtLocation(param, paramDecl), depth + 1);
      }
    }
    // An anonymous or mapped-type symbol (TypeScript's placeholder names `__type`/`__object`)
    // still carries a `.declarations` entry pointing at the UTILITY type's definition site
    // (`Pick`'s declaration in `lib.es5.d.ts`, for a `Pick<{...}, K>`-resolved member), not at the
    // resolved shape's real origin; treated as "own" so the walk still descends into a resolved
    // utility-type member (an action union built with `Pick`) rather than stopping at the wrapper.
    const isAnonymous = !sym || symName === '__type' || symName === '__object';
    const isOwnOrAnonymous =
      isAnonymous || (sym.declarations ?? []).some((d) => d.getSourceFile().fileName.startsWith(ownDir));
    if (isOwnOrAnonymous && (type.flags & ts.TypeFlags.Object) !== 0) {
      for (const prop of checker.getPropertiesOfType(type)) {
        const decl = prop.declarations?.[0];
        const memberType = decl
          ? checker.getTypeOfSymbolAtLocation(prop, decl)
          : checker.getDeclaredTypeOfSymbol(prop);
        visit(memberType, depth + 1);
      }
    }
  }
  for (const root of rootTypes) visit(root, 0);
  return names;
}

/**
 * The leak filter: from the names reachable on one subpath, those declared in our own type universe
 * and exported from no subpath. An export on any subpath clears a name, so the gate follows a type
 * across subpaths.
 * @param {Iterable<string>} reachable
 * @param {Set<string>} universe
 * @param {Record<string, Record<string, string>>} model
 * @returns {string[]} sorted
 */
export function selectLeakedNames(reachable, universe, model) {
  /** @type {Set<string>} */
  const exportedAnywhere = new Set();
  for (const exports of Object.values(model)) for (const name of Object.keys(exports)) exportedAnywhere.add(name);
  return [...reachable].filter((name) => universe.has(name) && !exportedAnywhere.has(name)).sort();
}

/**
 * F-1's classic clause, against the type checker: a name absent from every subpath's export
 * list, drawn from our own known type universe, reachable from some currently-exported symbol's
 * type graph on a given subpath. Keyed by the subpath whose graph reached it (a name reachable
 * from more than one subpath's exports produces one entry per subpath).
 * @param {Record<string, Record<string, string>>} model
 * @param {Set<string>} universe
 * @returns {{ name: string, subpath: string, model: 'type-checker' }[]}
 */
export function deriveTypeCheckerLeaks(model, universe) {
  const distDir = resolve(ROOT, 'dist');
  /** @type {{ name: string, subpath: string, model: 'type-checker' }[]} */
  const leaks = [];
  for (const entry of surfaceSubpaths()) {
    const dtsPath = resolve(ROOT, entry.dts);
    if (!existsSync(dtsPath)) continue;
    const { checker, symbols } = moduleExports(dtsPath);
    if (symbols.length === 0) continue;
    // `/admin` exports runtime Svelte components, and a plain type added beside them rides the same
    // barrel. The split is read mechanically off the dist declarations via `isPlainTypeExport`, not
    // asserted in prose: only plain-type exports feed the walk below, so a genuine leak reachable
    // only through one of them is caught the same way it would be on any other subpath.
    //
    // A component's declared type is a generic reference to its Props/Events/Slots parameters.
    // That is an ACCEPTED LIMITATION, stated as one rather than fixed here: component prop types
    // stay invisible to this rider, because the walk starts from each subpath's EXPORTED symbols'
    // declared types, and a component's declared type (`Component<Props, Events, Slots>`) never
    // surfaces `Props`' member types the way an interface's members do. Structurally modeling
    // component props would need a second model this rider does not build; Task 7's props gate is
    // the answer for that surface instead (see the ledger row's stated-limits paragraph).
    const resolved = symbols.map((sym) => resolveAlias(checker, sym));
    const rootSymbols = entry.subpath === '/admin' ? resolved.filter(isPlainTypeExport) : resolved;
    if (rootSymbols.length === 0) continue;
    const rootTypes = rootSymbols.map((sym) => shapeTypeOf(checker, sym));
    const reachable = collectReachableNames(checker, rootTypes, distDir);
    for (const name of selectLeakedNames(reachable, universe, model)) {
      leaks.push({ name, subpath: entry.subpath, model: 'type-checker' });
    }
  }
  return leaks;
}

// --- the registry and the gate ----------------------------------------------------------------
/**
 * @typedef {{ name: string, subpath: string, model: string }} DerivedLeak
 * @typedef {{ name: string, subpath: string, model: string, 'sanctioned-by'?: string, 'standing-unverdicted'?: string }} RegistryEntry
 */

// The (name, subpath) identity a derived leak and a registry entry are matched on. The NUL
// separator cannot occur in either half, so the join is unambiguous.
/** @param {{ name: string, subpath: string }} leak @returns {string} */
function leakKey(leak) {
  return `${leak.name}\0${leak.subpath}`;
}

/**
 * The full derivation, sorted by name then subpath.
 * @param {Record<string, Record<string, string>>} model
 * @returns {DerivedLeak[]}
 */
export function deriveLeaks(model) {
  return deriveTypeCheckerLeaks(model, knownTypeUniverse()).sort(
    (a, b) => a.name.localeCompare(b.name) || a.subpath.localeCompare(b.subpath),
  );
}

/**
 * The gate's verdict against a loaded registry: every derived leak must match a registry entry
 * carrying exactly one non-empty reason kind, and every registry entry must still be produced by
 * the derivation (a resolved leak's entry is drift).
 * @param {DerivedLeak[]} derived
 * @param {RegistryEntry[]} registry
 * @returns {{ ok: true } | { ok: false, unrecorded: DerivedLeak[], stale: RegistryEntry[], unreasoned: RegistryEntry[] }}
 */
export function findLeakViolations(derived, registry) {
  /** @param {RegistryEntry} entry */
  const hasReason = (entry) => {
    const sanctioned = entry['sanctioned-by'];
    const unverdicted = entry['standing-unverdicted'];
    const hasSanctioned = typeof sanctioned === 'string' && sanctioned.trim().length > 0;
    const hasUnverdicted = typeof unverdicted === 'string' && unverdicted.trim().length > 0;
    return hasSanctioned !== hasUnverdicted; // exactly one of the two kinds, never both, never neither
  };
  const unreasoned = registry.filter((e) => !hasReason(e));
  /** @type {Set<string>} */
  const recordedKeys = new Set(registry.filter(hasReason).map(leakKey));
  /** @type {Set<string>} */
  const derivedKeys = new Set(derived.map(leakKey));
  const unrecorded = derived.filter((d) => !recordedKeys.has(leakKey(d)));
  const stale = registry.filter((e) => hasReason(e) && !derivedKeys.has(leakKey(e)));
  return unrecorded.length || stale.length || unreasoned.length
    ? { ok: false, unrecorded, stale, unreasoned }
    : { ok: true };
}

/**
 * Format the gate's failure message: every unrecorded leak (with the remedy: add a registry
 * entry carrying one reason kind), every stale entry (a leak the derivation no longer produces),
 * and every entry missing a reason.
 * @param {{ unrecorded: DerivedLeak[], stale: RegistryEntry[], unreasoned: RegistryEntry[] }} violations
 * @returns {string}
 */
export function formatLeakViolations({ unrecorded, stale, unreasoned }) {
  const lines = [];
  if (unrecorded.length) {
    lines.push(
      'check-surface-leaks: the following F-1 closure leaks are UNRECORDED. Add an entry to',
      `${relative(ROOT, REGISTRY_PATH)} naming the leak, its surfacing model, and exactly one`,
      "reason kind ('sanctioned-by' a ledger slug or move-record row, or 'standing-unverdicted'",
      'with a one-line citation).',
      '',
    );
    for (const l of unrecorded) lines.push(`  + ${l.name} at ${l.subpath} (${l.model})`);
  }
  if (stale.length) {
    if (lines.length) lines.push('');
    lines.push('check-surface-leaks: the following registry entries are STALE (the derivation no');
    lines.push('longer produces them; remove the entry, the leak is resolved):');
    for (const s of stale) lines.push(`  - ${s.name} at ${s.subpath}`);
  }
  if (unreasoned.length) {
    if (lines.length) lines.push('');
    lines.push('check-surface-leaks: the following registry entries carry no reason, or both kinds');
    lines.push('at once (exactly one of sanctioned-by / standing-unverdicted is required):');
    for (const e of unreasoned) lines.push(`  ~ ${e.name} at ${e.subpath}`);
  }
  return lines.join('\n');
}

/**
 * Read and parse the leak registry.
 * @returns {RegistryEntry[] | null} null when the registry cannot be read or parsed (the
 *   diagnostic is already printed and `process.exitCode` set; the caller must stop)
 */
function loadRegistry() {
  /** @type {string} */
  let raw;
  try {
    raw = readFileSync(REGISTRY_PATH, 'utf8');
  } catch (err) {
    console.error(`check-surface-leaks: could not read ${relative(ROOT, REGISTRY_PATH)}: ${err instanceof Error ? err.message : err}`);
    process.exitCode = 1;
    return null;
  }
  try {
    return JSON.parse(raw).leaks ?? [];
  } catch (err) {
    console.error(`check-surface-leaks: ${relative(ROOT, REGISTRY_PATH)} is not valid JSON: ${err instanceof Error ? err.message : err}`);
    process.exitCode = 1;
    return null;
  }
}

function main() {
  const model = buildSurfaceModel();
  const derived = deriveLeaks(model);
  const registry = loadRegistry();
  if (!registry) return;
  const result = findLeakViolations(derived, registry);
  if (result.ok) {
    console.log(`check-surface-leaks: OK (${derived.length} recorded leaks)`);
    return;
  }
  console.error(formatLeakViolations(result));
  process.exitCode = 1;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
