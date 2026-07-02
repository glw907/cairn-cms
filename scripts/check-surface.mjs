// cairn-cms: the public-surface snapshot gate. The reference-coverage gate checks a page EXISTS per
// export and the signatures gate checks a CALLABLE export's declared signature has not drifted;
// neither sees a non-callable export (an interface, a type alias, a const, the `fields` namespace
// object) whose declared SHAPE has drifted. A renamed or retyped field on a `*Data` interface, the
// developer's real upgrade guarantee, slips past both. This gate closes that gap: it walks each
// exported subpath's built `.d.ts`, renders the FULL declared shape of every export (callable form
// from the same path the signatures gate uses, non-callable shape from `checker.typeToString`), and
// compares the rendered surface against the committed golden file `docs/internal/api-surface.md`.
// Any drift fails the gate; regenerating the golden file (`--update`) is the deliberate disclosure
// moment, and the diff a reviewer reads. The core (`buildSurface`, `diffSurface`) is pure of process
// state so the unit test calls it directly; the CLI reads `dist`, the golden file, and the argv flag.
import ts from 'typescript';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { enumerateExports, moduleExports } from './reference-coverage.mjs';
import { normalizeSignature } from './check-reference-signatures.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SNAPSHOT = 'docs/internal/api-surface.md';
const BANNER = 'GENERATED — run `npm run check:surface -- --update` to regenerate';

// The exported subpaths the gate snapshots, drawn directly from package.json `exports`: every entry
// whose value carries a `types` field. The raw asset entries (`.txt`, `package.json`) have no
// `types` field and fall out. This list is NOT the reference gate's CONFIG, and the gate does NOT
// inherit that gate's `excludeDts` page-dedup (for example `/delivery/data`'s re-export of
// `/delivery`'s names), because the re-exported names ARE real surface here.
/** @returns {{ subpath: string, dts: string }[]} */
export function surfaceSubpaths() {
  const pkg = JSON.parse(readFileSync(resolve(ROOT, 'package.json'), 'utf8'));
  /** @type {{ subpath: string, dts: string }[]} */
  const out = [];
  for (const [key, value] of Object.entries(pkg.exports)) {
    if (value && typeof value === 'object' && typeof value.types === 'string') {
      // The package.json key is `.` or `./sveltekit`; the snapshot subpath drops the leading dot so
      // `.` and `/sveltekit` read the way the import specifier's tail does.
      const subpath = key === '.' ? '.' : key.replace(/^\./, '');
      out.push({ subpath, dts: value.types });
    }
  }
  out.sort((a, b) => a.subpath.localeCompare(b.subpath));
  return out;
}

// The TypeFormatFlags the callable rendering shares with check-reference-signatures.mjs so the two
// gates agree on callable form. Kept here as a named constant rather than re-imported because the
// signatures gate does not export it.
const CALLABLE_FLAGS =
  ts.TypeFormatFlags.NoTruncation |
  ts.TypeFormatFlags.WriteArrowStyleSignature |
  ts.TypeFormatFlags.UseFullyQualifiedType;

// The flags for a non-callable shape. `InTypeAlias` expands a type alias to its full structure (a
// union, an object literal) rather than printing its name, so a field change on the alias drifts the
// rendered string. An interface is expanded member-by-member instead (see `renderInterface`),
// because `InTypeAlias` does not expand an interface reference.
const SHAPE_FLAGS =
  ts.TypeFormatFlags.NoTruncation |
  ts.TypeFormatFlags.UseFullyQualifiedType |
  ts.TypeFormatFlags.InTypeAlias;

// Resolve a re-export alias symbol to its target so a type re-exported through a barrel resolves to
// its real declaration kind and type. A non-alias symbol is returned unchanged.
/**
 * @param {import('typescript').TypeChecker} checker
 * @param {import('typescript').Symbol} sym
 */
function resolveAlias(checker, sym) {
  return sym.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(sym) : sym;
}

// Render an interface's shape as `{ member: type; ... }` in declaration order. A bare
// `typeToString` of an interface prints only its name, and `InTypeAlias` does not expand it, so the
// members are expanded by hand. Each member's type renders with the shape flags; a referenced named
// type (for example `role: Role`) stays a name, which is correct because that type carries its own
// snapshot entry and a change to IT drifts there.
/**
 * @param {import('typescript').TypeChecker} checker
 * @param {import('typescript').Type} type
 */
function renderInterface(checker, type) {
  const parts = checker.getPropertiesOfType(type).map((p) => {
    const decl = p.declarations?.[0];
    const memberType = decl
      ? checker.getTypeOfSymbolAtLocation(p, decl)
      : checker.getDeclaredTypeOfSymbol(p);
    const optional = p.flags & ts.SymbolFlags.Optional ? '?' : '';
    return `${p.name}${optional}: ${checker.typeToString(memberType, undefined, SHAPE_FLAGS)}`;
  });
  return `{ ${parts.join('; ')} }`;
}

// The type that carries an export's shape. A type-only symbol (an interface, a type alias, an enum
// with no value side) carries it on the declared type; a value symbol (a const, a function, the
// `fields` namespace object) carries it on the type at its declaration, falling back to the declared
// type when no declaration is reachable.
/**
 * @param {import('typescript').TypeChecker} checker
 * @param {import('typescript').Symbol} sym
 */
function shapeTypeOf(checker, sym) {
  const isType = (sym.flags & (ts.SymbolFlags.Interface | ts.SymbolFlags.TypeAlias | ts.SymbolFlags.Enum)) !== 0;
  if (isType && (sym.flags & ts.SymbolFlags.Value) === 0) {
    return checker.getDeclaredTypeOfSymbol(sym);
  }
  const decl = sym.valueDeclaration ?? sym.declarations?.[0];
  if (!decl) return checker.getDeclaredTypeOfSymbol(sym);
  return checker.getTypeOfSymbolAtLocation(sym, decl);
}

// Render one export's full declared shape, normalized. The symbol KIND is resolved before the
// callable check, on purpose: an interface expands member-by-member, and a type alias expands with
// the shape flags (so a callable alias like `type SiteRender = (input) => …` prints its full
// signature, not its own name). Only a callable VALUE export (a function or const-function) takes
// the callable branch, where the arrow-style flags match the signatures gate. A non-callable value
// (a const, the `fields` namespace object) falls through to the shape flags. The result passes
// through `normalizeSignature` so `import("…")` qualifiers, `| undefined` optional artifacts, and
// whitespace are canonical and a no-op regenerate is byte-identical.
/**
 * @param {import('typescript').TypeChecker} checker
 * @param {import('typescript').Symbol} exportSym
 */
function renderExport(checker, exportSym) {
  const sym = resolveAlias(checker, exportSym);
  const type = shapeTypeOf(checker, sym);
  let rendered;
  if (sym.flags & ts.SymbolFlags.Interface) {
    // Before the callable check: a call-signature-bearing interface still records its members.
    rendered = renderInterface(checker, type);
  } else if (sym.flags & ts.SymbolFlags.TypeAlias) {
    // Before the callable check: `InTypeAlias` expands the alias to its structure. Without this a
    // callable alias would hit the callable branch, whose flags omit `InTypeAlias`, and typeToString
    // would print the alias name, recording the tautology `Name: Name` and hiding all signature drift.
    rendered = checker.typeToString(type, undefined, SHAPE_FLAGS);
  } else if (type.getCallSignatures().length > 0) {
    rendered = checker.typeToString(type, undefined, CALLABLE_FLAGS);
  } else {
    rendered = checker.typeToString(type, undefined, SHAPE_FLAGS);
  }
  return normalizeSignature(rendered);
}

// Render the `/ambient` subpath's surface. The module exports no names (`export {}`), so its real
// contract is the `declare global` augmentation of `App.Locals`. The augmentation's members are
// rendered the same way an interface's are, keyed by a synthetic `App.Locals` name, so a change to
// the ambient identity contract (the `editor`/`backend` fields) drifts the snapshot.
/** @param {string} dtsPath */
function renderAmbient(dtsPath) {
  const program = ts.createProgram([dtsPath], {
    noEmit: true,
    skipLibCheck: true,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
  });
  const checker = program.getTypeChecker();
  const source = program.getSourceFile(dtsPath);
  if (!source) throw new Error(`cannot load ${dtsPath}`);
  /** @type {Record<string, string>} */
  const exports = {};
  /** @param {import('typescript').Node} node */
  function visit(node) {
    if (ts.isInterfaceDeclaration(node) && node.name.text === 'Locals') {
      const type = checker.getTypeAtLocation(node);
      exports['App.Locals'] = normalizeSignature(renderInterface(checker, type));
    }
    ts.forEachChild(node, visit);
  }
  visit(source);
  return exports;
}

// Render one subpath's exports to a name-to-shape record. The full raw `enumerateExports` set is
// used (re-exports included; no `excludeDts` dedup). The `/ambient` subpath has no named exports,
// so it falls to the `declare global` renderer.
/** @param {{ subpath: string, dts: string }} entry */
function renderSubpath(entry) {
  const dtsPath = resolve(ROOT, entry.dts);
  if (!existsSync(dtsPath)) throw new Error(`missing ${entry.dts}; run "npm run package" first`);
  const names = enumerateExports(dtsPath);
  if (names.length === 0) {
    // A zero-export subpath still contributes surface: today only `/ambient`, whose contract is its
    // `declare global` augmentation. A genuinely empty subpath returns `{}` and emits a bare header.
    return entry.subpath === '/ambient' ? renderAmbient(dtsPath) : {};
  }
  const { checker, symbols } = moduleExports(dtsPath);
  /** @type {Record<string, string>} */
  const exports = {};
  for (const sym of symbols) exports[sym.name] = renderExport(checker, sym);
  return exports;
}

// Render the full surface as a name-to-shape record per subpath. The structured form the snapshot
// serializes from and the diff parses back into, so the two stay in lockstep.
/** @returns {Record<string, Record<string, string>>} */
export function buildSurfaceModel() {
  /** @type {Record<string, Record<string, string>>} */
  const model = {};
  for (const entry of surfaceSubpaths()) model[entry.subpath] = renderSubpath(entry);
  return model;
}

// Serialize a surface model to the committed Markdown snapshot. One section per subpath (sorted),
// each export listed sorted by name as `` - `name`: shape ``. Deterministic: stable subpath order,
// stable name sort, normalized shapes, so a no-op regenerate is byte-identical.
/** @param {Record<string, Record<string, string>>} model */
export function serializeSurface(model) {
  const lines = [BANNER, ''];
  for (const subpath of Object.keys(model).sort((a, b) => a.localeCompare(b))) {
    lines.push(`## \`${subpath}\``, '');
    const exports = model[subpath];
    for (const name of Object.keys(exports).sort((a, b) => a.localeCompare(b))) {
      lines.push(`- \`${name}\`: ${exports[name]}`);
    }
    lines.push('');
  }
  return lines.join('\n');
}

// Build the live surface snapshot string from `dist`. Convenience wrapper over the model build and
// the serialize step, the form the CLI writes and compares.
export function buildSurface() {
  return serializeSurface(buildSurfaceModel());
}

// Parse a serialized snapshot back into a name-to-shape record per subpath. The banner and blank
// lines are ignored; a `## \`subpath\`` line opens a section and a `` - \`name\`: shape `` line adds
// an export. Lets the diff core compare two snapshot strings (the committed file and the live build,
// or two crafted strings in a test) without re-deriving the model.
/** @param {string} text */
export function parseSurface(text) {
  /** @type {Record<string, Record<string, string>>} */
  const model = {};
  let current = null;
  for (const line of text.split('\n')) {
    const section = line.match(/^## `([^`]+)`\s*$/);
    if (section) {
      current = section[1];
      model[current] = model[current] ?? {};
      continue;
    }
    const exp = line.match(/^- `([^`]+)`: (.*)$/);
    if (exp && current) model[current][exp[1]] = exp[2];
  }
  return model;
}

// Compare a committed snapshot against a freshly-emitted one. Returns `{ ok: true }` when they
// describe the same surface, or `{ ok: false, drift: [...] }` listing the per-subpath added,
// removed, and changed exports. A changed export covers a drifted callable signature AND a drifted
// field on a non-callable shape (a renamed or retyped `*Data` field), the central guarantee. Pure:
// it takes the two snapshot strings, so the test drives it with crafted input.
/**
 * @param {string} committed
 * @param {string} emitted
 * @returns {{ ok: true } | { ok: false, drift: SubpathDrift[] }}
 */
export function diffSurface(committed, emitted) {
  const before = parseSurface(committed);
  const after = parseSurface(emitted);
  const subpaths = [...new Set([...Object.keys(before), ...Object.keys(after)])].sort((a, b) =>
    a.localeCompare(b),
  );
  /** @type {SubpathDrift[]} */
  const drift = [];
  for (const subpath of subpaths) {
    const b = before[subpath] ?? {};
    const a = after[subpath] ?? {};
    const added = Object.keys(a).filter((n) => !(n in b)).sort();
    const removed = Object.keys(b).filter((n) => !(n in a)).sort();
    const changed = Object.keys(a)
      .filter((n) => n in b && a[n] !== b[n])
      .sort()
      .map((name) => ({ name, before: b[name], after: a[name] }));
    if (added.length || removed.length || changed.length) {
      drift.push({ subpath, added, removed, changed });
    }
  }
  return drift.length === 0 ? { ok: true } : { ok: false, drift };
}

// Format a drift list as the actionable failure message: one block per drifted subpath naming the
// added, removed, and changed exports (each change showing the before and after shape).
/** @param {SubpathDrift[]} drift */
export function formatDrift(drift) {
  const blocks = drift.map((d) => {
    const lines = [`${d.subpath}:`];
    for (const name of d.added) lines.push(`  + added   ${name}`);
    for (const name of d.removed) lines.push(`  - removed ${name}`);
    for (const c of d.changed) {
      lines.push(`  ~ changed ${c.name}`);
      lines.push(`      was: ${c.before}`);
      lines.push(`      now: ${c.after}`);
    }
    return lines.join('\n');
  });
  return blocks.join('\n');
}

/**
 * A single subpath's surface drift between the committed and emitted snapshots.
 * @typedef {object} SubpathDrift
 * @property {string} subpath the import subpath that drifted
 * @property {string[]} added export names present only in the emitted surface
 * @property {string[]} removed export names present only in the committed surface
 * @property {{ name: string, before: string, after: string }[]} changed exports whose shape changed
 */

function main() {
  const update = process.argv.includes('--update');
  const snapshotPath = resolve(ROOT, SNAPSHOT);
  const emitted = buildSurface();
  if (update) {
    writeFileSync(snapshotPath, `${emitted}\n`);
    console.log(`check-surface: wrote ${SNAPSHOT}`);
    return;
  }
  if (!existsSync(snapshotPath)) {
    console.error(`check-surface: missing ${SNAPSHOT}; run "npm run check:surface -- --update" to generate it`);
    process.exit(1);
  }
  // The file is written with a trailing newline; compare against the same form.
  const committed = readFileSync(snapshotPath, 'utf8');
  const result = diffSurface(committed, `${emitted}\n`);
  if (result.ok) {
    console.log('check-surface: OK (surface matches the committed snapshot)');
    return;
  }
  console.error('check-surface: the public surface drifted from the committed snapshot.');
  console.error(formatDrift(result.drift));
  console.error(`\nIf this change is intended, run "npm run check:surface -- --update" and commit ${SNAPSHOT}.`);
  process.exit(1);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
