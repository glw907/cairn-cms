// cairn-cms: the F-1 leak-class rider, chained from the existing `check:surface` package entry
// (no new top-level gate name; see the plan's tie-break rule). F-1's own predicate: a
// retire-verdicted OR ABSENT name (never exported from any subpath) still named inside a
// surviving KEEP export's rendered public shape is a closure leak: a consumer can read the
// value's SHAPE, through indexed access or an inline member, but cannot NAME the type it holds.
// `docs/internal/record/2026-08-30-retires-move-record.md` is the brief this rider answers,
// including its "the internals pass should re-decide the split" instruction (Step 3 below).
//
// TWO derivations feed the recorded set, because the two known proof cases live in different
// models and neither alone finds both:
//
// - The TYPE-CHECKER model (`deriveTypeCheckerLeaks`) walks the real TypeScript type graph,
//   through the compiler API, from every currently-exported symbol on each subpath's own built
//   `.d.ts`, to a fixed point. It catches a name buried more than one hop deep (`AdvisoryAction`,
//   reachable only through `EditData.advisories[].actions[]`) that `buildSurfaceModel()`'s own
//   renderer cannot: `renderInterface` (check-surface.mjs) expands exactly one member level, so
//   a nested INTERFACE reference like `AdvisoryNotice` prints as its bare name, and
//   `AdvisoryNotice`'s own further members (where `AdvisoryAction` actually lives) are never
//   independently rendered once `AdvisoryNotice` itself is unpublished from every subpath.
// - The RENDERER model (`deriveRendererLeaks`) works over `buildSurfaceModel()`'s already-
//   rendered shape strings and catches the opposite gap: a name that DOES have its own
//   top-level export row on one subpath, but whose exact literal-union definition is EXPANDED
//   inline (never referenced by name) inside another export's shape on a DIFFERENT subpath
//   (`NavIcon`, `EngineScreenId`: root's `.d.ts` rolls up `NavLayoutEntry.icon` without a
//   surviving symbol reference to `NavIcon`, a TypeScript dts-bundling artifact, not a property
//   of the type graph itself). `SlotKind` is the absent-everywhere control: unlike `NavIcon`, its
//   declaring module is bundled into BOTH subpaths' own `.d.ts`, so the type-checker model finds
//   a live symbol reference on both, and
//   the renderer model (which needs a name's OWN top-level shape to compare against) cannot
//   attempt it at all, since `SlotKind` has no export row on any subpath to read that shape from.
//
// The recorded registry (`check-surface-leaks.json`) is the UNION, keyed by (name, subpath),
// each entry carrying which model surfaced it and exactly one reason kind: `sanctioned-by` (a
// ledger slug or move-record row) or `standing-unverdicted` (a one-line citation). The gate fails
// on any leak the derivation finds with no matching entry, and on any entry the derivation no
// longer produces (the record shrinks as a leak is resolved, the same discipline check-surface's
// canonical-home rule already holds for its own record).
import ts from 'typescript';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { walk } from '../walk-files.mjs';
import { repoRoot } from '../repo-root.mjs';
import { moduleExports } from './reference-coverage.mjs';
import { buildSurfaceModel, surfaceSubpaths } from './check-surface.mjs';

const ROOT = repoRoot(import.meta.url);
const REGISTRY_PATH = resolve(ROOT, 'scripts/checks/check-surface-leaks.json');

// --- the known type universe: every type/interface/enum src/lib declares, exported or not -----
// F-1's predicate needs to tell "our own retired-or-internal type" apart from an ambient/library
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
// Resolve a re-export alias symbol to its target, mirroring check-surface.mjs's own
// `resolveAlias`. `moduleExports` returns each subpath's barrel-level symbols, most of which are
// ALIAS symbols pointing at the real declaration elsewhere in the built `dist/` tree; without
// this, `shapeTypeOf` below reads the alias's own (empty) declaration rather than the interface
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
// check-surface.mjs's own `shapeTypeOf`, kept local rather than imported so this rider does not
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
 * subpath, so a subpath's own barrel `.d.ts` re-exports names whose OWN declaration lives in a
 * sibling file under the same `dist/` tree; `ownDir` (the built `dist/` root) is what
 * distinguishes that sibling from a genuinely ambient/library type (`RequestEvent`, `Array`),
 * declared under `node_modules` or a TypeScript lib file, whose own internals this walk never
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
      // `.origin` purely for display, and only THAT form still carries a nested member's own
      // aliasSymbol (`TidyKeyProbeResult | "missing"`, flattened to four raw literals, loses
      // `TidyKeyProbeResult` from `.types` entirely, but keeps it on `.origin.types[0]`).
      const origin = /** @type {{ origin?: { types?: import('typescript').Type[] } }} */ (type).origin;
      if (origin?.types) for (const member of origin.types) visit(member, depth + 1);
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
    // ActionFailure<Failure>>`) carries its own leak-bearing types on its call signature, not as
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
    // An anonymous or mapped-type symbol (TypeScript's own placeholder names `__type`/`__object`)
    // still carries a `.declarations` entry pointing at the UTILITY type's own definition site
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
 * F-1's classic clause, against the type checker: a name absent from every subpath's export
 * list, drawn from our own known type universe, reachable from some currently-exported symbol's
 * type graph on a given subpath. Keyed by the subpath whose graph reached it (a name reachable
 * from more than one subpath's exports produces one entry per subpath).
 * @param {Record<string, Record<string, string>>} model
 * @param {Set<string>} universe
 * @returns {{ name: string, subpath: string, model: 'type-checker' }[]}
 */
export function deriveTypeCheckerLeaks(model, universe) {
  /** @type {Set<string>} */
  const exportedAnywhere = new Set();
  for (const subpath of Object.keys(model)) for (const name of Object.keys(model[subpath])) exportedAnywhere.add(name);

  const distDir = resolve(ROOT, 'dist');
  /** @type {{ name: string, subpath: string, model: 'type-checker' }[]} */
  const leaks = [];
  for (const entry of surfaceSubpaths()) {
    // `/components` exports Svelte components exclusively (MarkdownEditor, EditPage, ...), never
    // an interface or type alias of its own; each component's declared type is a generic
    // reference to its own Props/Events/Slots parameters, and walking those reaches every prop's
    // type, including a component's own internal callback and object props. Component props are
    // outside this rider's scope by design (Task 7's props gate is the answer for that surface;
    // see the ledger row's stated-limits paragraph), so this subpath contributes no roots here.
    if (entry.subpath === '/components') continue;
    const dtsPath = resolve(ROOT, entry.dts);
    if (!existsSync(dtsPath)) continue;
    const { checker, symbols } = moduleExports(dtsPath);
    if (symbols.length === 0) continue;
    const rootTypes = symbols.map((sym) => shapeTypeOf(checker, resolveAlias(checker, sym)));
    const reachable = collectReachableNames(checker, rootTypes, distDir);
    for (const name of [...reachable].sort()) {
      if (!universe.has(name)) continue;
      if (exportedAnywhere.has(name)) continue;
      leaks.push({ name, subpath: entry.subpath, model: 'type-checker' });
    }
  }
  return leaks;
}

// --- the renderer model (the per-subpath clause) ------------------------------------------------
// A depth-aware split on `separator` at bracket depth 0, outside quotes. `=>` is treated as one
// unit (skipped without a depth change) so an arrow-typed member's own `<...>` generic argument
// does not miscount against the `(...)` that already protects it.
/** @param {string} text @param {string} separator @returns {string[]} */
function splitTopLevel(text, separator) {
  /** @type {string[]} */
  const parts = [];
  let depth = 0;
  /** @type {string | null} */
  let quote = null;
  let start = 0;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quote) {
      if (c === quote && text[i - 1] !== '\\') quote = null;
      continue;
    }
    if (c === '"' || c === "'") {
      quote = c;
      continue;
    }
    if (c === '=' && text[i + 1] === '>') {
      i++;
      continue;
    }
    if ('([{<'.includes(c)) depth++;
    else if (')]}>'.includes(c)) depth--;
    else if (depth === 0 && text.startsWith(separator, i)) {
      parts.push(text.slice(start, i));
      i += separator.length - 1;
      start = i + 1;
    }
  }
  parts.push(text.slice(start));
  return parts.map((p) => p.trim()).filter((p) => p.length > 0);
}

// A rendered shape reads as a pure literal-string union (`"a" | "b" | ...`, with `(string & {})`
// tolerated as the engine's own open-string escape hatch) or it does not; only this distinctive
// shape is compared across subpaths, so an ordinary object or primitive member never produces a
// false match. Returns the canonical (sorted) literal set, or `null` when the shape is not a
// pure literal union.
/** @param {string} shape @returns {string[] | null} */
export function extractLiteralUnionSet(shape) {
  const parts = splitTopLevel(shape.trim(), ' | ');
  /** @type {string[]} */
  const literals = [];
  for (const part of parts) {
    if (part === '(string & {})') continue;
    const m = part.match(/^"([^"]*)"$/);
    if (!m) return null;
    literals.push(m[1]);
  }
  return literals.length > 0 ? literals.sort() : null;
}

/** @param {string[]} a @param {string[]} b */
function sameSet(a, b) {
  return a.length === b.length && a.every((v, i) => v === b[i]);
}

/**
 * Whether `shape` (a rendered export, object or otherwise) contains a member, at any depth this
 * gate's single-level object rendering reaches, whose own literal-union set exactly matches
 * `targetSet`. Checked against the shape's own top-level form first (a type alias could itself
 * be the union), then against each of its members if it is an object shape.
 * @param {string} shape
 * @param {string[]} targetSet
 * @returns {boolean}
 */
export function shapeContainsLiteralUnion(shape, targetSet) {
  const own = extractLiteralUnionSet(shape);
  if (own && sameSet(own, targetSet)) return true;
  const trimmed = shape.trim();
  if (!trimmed.startsWith('{') || !trimmed.endsWith('}')) return false;
  for (const member of splitTopLevel(trimmed.slice(1, -1), ';')) {
    const colon = member.indexOf(':');
    if (colon === -1) continue;
    const memberType = member.slice(colon + 1).trim();
    const memberSet = extractLiteralUnionSet(memberType);
    if (memberSet && sameSet(memberSet, targetSet)) return true;
  }
  return false;
}

/**
 * F-1's per-subpath clause: a name that HAS its own top-level export row on one subpath, whose
 * exact literal-union definition is expanded inline (not referenced by name) inside another
 * export's rendered shape on a different subpath. Pure over `buildSurfaceModel()`'s output, so
 * the unit test drives it with a crafted model.
 * @param {Record<string, Record<string, string>>} model
 * @returns {{ name: string, subpath: string, model: 'renderer', foundIn: string }[]}
 */
export function deriveRendererLeaks(model) {
  const subpaths = Object.keys(model).sort();
  /** @type {{ name: string, subpath: string, model: 'renderer', foundIn: string }[]} */
  const leaks = [];
  for (const home of subpaths) {
    for (const [name, shape] of Object.entries(model[home])) {
      const homeSet = extractLiteralUnionSet(shape);
      if (!homeSet) continue;
      for (const other of subpaths) {
        if (other === home || name in model[other]) continue;
        const foundIn = Object.entries(model[other]).find(([, otherShape]) =>
          shapeContainsLiteralUnion(otherShape, homeSet),
        );
        if (foundIn) leaks.push({ name, subpath: other, model: 'renderer', foundIn: foundIn[0] });
      }
    }
  }
  return leaks;
}

// --- the union, the registry, and the gate --------------------------------------------------
/**
 * @typedef {{ name: string, subpath: string, model: string, foundIn?: string }} DerivedLeak
 * @typedef {{ name: string, subpath: string, model: string, 'sanctioned-by'?: string, 'standing-unverdicted'?: string }} RegistryEntry
 */

// The (name, subpath) identity a derived leak and a registry entry are matched on. The NUL
// separator cannot occur in either half, so the join is unambiguous.
/** @param {{ name: string, subpath: string }} leak @returns {string} */
function leakKey(leak) {
  return `${leak.name}\0${leak.subpath}`;
}

/**
 * The full derivation: the type-checker model's clause plus the renderer model's per-subpath
 * clause, deduplicated by (name, subpath).
 * @param {Record<string, Record<string, string>>} model
 * @returns {DerivedLeak[]}
 */
export function deriveLeaks(model) {
  const universe = knownTypeUniverse();
  /** @type {Map<string, DerivedLeak>} */
  const byKey = new Map();
  for (const leak of deriveTypeCheckerLeaks(model, universe)) byKey.set(leakKey(leak), leak);
  for (const leak of deriveRendererLeaks(model)) {
    if (!byKey.has(leakKey(leak))) byKey.set(leakKey(leak), leak);
  }
  return [...byKey.values()].sort(
    (a, b) => a.name.localeCompare(b.name) || a.subpath.localeCompare(b.subpath),
  );
}

/**
 * The gate's verdict against a loaded registry: every derived leak must match a registry entry
 * carrying exactly one non-empty reason kind, and every registry entry must still be produced by
 * the derivation (a resolved leak's entry is drift, the same discipline check-surface's
 * canonical-home record already holds).
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

// Exported so a sibling gate (reference-coverage.mjs's indexed-access-parenthetical clause)
// reads the same registry file through the same parsing and error handling, rather than
// re-implementing the load.
/** @returns {RegistryEntry[]} */
export function loadRegistry() {
  /** @type {string} */
  let raw;
  try {
    raw = readFileSync(REGISTRY_PATH, 'utf8');
  } catch (err) {
    console.error(`check-surface-leaks: could not read ${relative(ROOT, REGISTRY_PATH)}: ${err instanceof Error ? err.message : err}`);
    process.exit(1);
  }
  try {
    return JSON.parse(raw).leaks ?? [];
  } catch (err) {
    console.error(`check-surface-leaks: ${relative(ROOT, REGISTRY_PATH)} is not valid JSON: ${err instanceof Error ? err.message : err}`);
    process.exit(1);
  }
}

function main() {
  const model = buildSurfaceModel();
  const derived = deriveLeaks(model);
  const registry = loadRegistry();
  const result = findLeakViolations(derived, registry);
  if (result.ok) {
    console.log(`check-surface-leaks: OK (${derived.length} recorded leaks)`);
    return;
  }
  console.error(formatLeakViolations(result));
  process.exit(1);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
