// cairn-cms: the public-surface snapshot gate. The reference-coverage gate checks a page EXISTS per
// export and the signatures gate checks a CALLABLE export's declared signature has not drifted;
// neither sees a non-callable export (an interface, a type alias, a const, the `fields` namespace
// object) whose declared SHAPE has drifted. A renamed or retyped field on a `*Data` interface, the
// developer's real upgrade guarantee, slips past both. This gate closes that gap: it walks each
// exported subpath's built `.d.ts`, renders the FULL declared shape of every export (callable form
// from the same path the signatures gate uses, non-callable shape from `checker.typeToString`), and
// compares the rendered surface against the committed golden file `docs/internal/api-surface.md`.
// Any drift fails the gate; regenerating the golden file (`--update`) is the deliberate disclosure
// moment, and the diff a reviewer reads. The core (`diffSurface`, `findHomeViolations`) is pure of
// process state so the unit test drives it directly; the CLI reads `dist`, the golden file, the
// re-export record, and the argv flag.
import ts from 'typescript';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { enumerateExports, moduleExports, loadDts } from './reference-coverage.mjs';
import { normalizeSignature } from './check-reference-signatures.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const SNAPSHOT = 'docs/internal/api-surface.md';
const BANNER = 'GENERATED — run `npm run check:surface -- --update` to regenerate';
const REEXPORTS = 'scripts/checks/check-surface-reexports.json';

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
// the ambient identity contract (the `cairnEditor`/`cairnBackend` fields) drifts the snapshot.
/** @param {string} dtsPath */
function renderAmbient(dtsPath) {
  const { checker, source } = loadDts(dtsPath);
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

// The canonical-home rule, enforced (ratified foundations A, `canonical-home-rule` in the rulings
// ledger). Every exported name has exactly one declaring subpath; a name published from a second
// subpath is a recorded R4 re-export naming its home and the signature that requires it, never a
// second home. Three shapes of failure are reported. An UNRECORDED duplicate is a name published
// from more than one subpath with more than one of those publications missing from the record: the
// one unrecorded publication is the home, so a second unrecorded one is a new, unargued duplicate. A
// STALE record is an entry whose subpath no longer publishes the name, which is how the record
// shrinks as foundations B narrows `/sveltekit` rather than silently outliving the surface. A
// MISFILED record is an entry whose `home` is not the one subpath left declaring the name, which
// covers both a wrong home string and a name whose every publication is recorded, leaving nothing to
// be the home. A layered pair (`/delivery` over `/delivery/data`) is one home, so the wider barrel's
// copy of a name the narrower one exports needs no per-name entry; a copy of a name the narrower one
// does NOT export still fails. Pure over the model and the record so the unit test drives all three.
/**
 * @param {Record<string, Record<string, string>>} model
 * @param {ReexportRecord} record
 * @returns {HomeViolations}
 */
export function findHomeViolations(model, record) {
  /** @type {Record<string, string[]>} */
  const subpathsOf = {};
  for (const [subpath, exports] of Object.entries(model)) {
    for (const name of Object.keys(exports)) (subpathsOf[name] ??= []).push(subpath);
  }
  const recorded = new Set((record.reexports ?? []).map((r) => `${r.name}\0${r.subpath}`));
  const layered = record.layeredBarrels ?? [];
  /** @param {string} name @param {string} subpath */
  const isRecorded = (name, subpath) =>
    recorded.has(`${name}\0${subpath}`) ||
    layered.some((p) => p.wider === subpath && name in (model[p.narrower] ?? {}));
  // A name's OPEN subpaths: the publications the record does not cover. Exactly one is the home the
  // rule expects; more than one is a duplicate nobody has argued; zero leaves no subpath declaring
  // the name. The duplicate and misfiled findings below both read this, so it is reckoned once.
  /** @type {Record<string, string[]>} */
  const openOf = {};
  for (const [name, subpaths] of Object.entries(subpathsOf)) {
    openOf[name] = subpaths.filter((s) => !isRecorded(name, s)).sort();
  }
  /** @type {{ name: string, subpaths: string[] }[]} */
  const unrecorded = [];
  for (const name of Object.keys(openOf).sort()) {
    if (openOf[name].length > 1) unrecorded.push({ name, subpaths: openOf[name] });
  }
  const stale = (record.reexports ?? [])
    .filter((r) => !(r.name in (model[r.subpath] ?? {})))
    .map((r) => ({ name: r.name, subpath: r.subpath }))
    .sort((a, b) => a.name.localeCompare(b.name) || a.subpath.localeCompare(b.subpath));
  /** @type {Record<string, Set<string>>} */
  const claimedHomes = {};
  for (const r of record.reexports ?? []) (claimedHomes[r.name] ??= new Set()).add(r.home);
  /** @type {{ name: string, home: string, open: string[] }[]} */
  const misfiled = [];
  for (const name of Object.keys(claimedHomes).sort()) {
    const open = openOf[name];
    // A name the surface dropped entirely is already stale; do not charge it twice.
    if (!open) continue;
    // More than one open subpath is the unrecorded-duplicate finding, which names the same defect.
    if (open.length > 1) continue;
    for (const home of [...claimedHomes[name]].sort()) {
      if (open.length === 1 && open[0] === home) continue;
      misfiled.push({ name, home, open });
    }
  }
  return { unrecorded, stale, misfiled };
}

// Format a home-rule failure as the actionable message: what to argue, and where to record it.
/** @param {HomeViolations} result */
export function formatHomeViolations(result) {
  const lines = [];
  for (const v of result.unrecorded) {
    lines.push(`  + duplicate ${v.name} publishes from ${v.subpaths.join(', ')} with no recorded home`);
  }
  for (const s of result.stale) {
    lines.push(`  - stale     ${s.name} is recorded at ${s.subpath} but is no longer exported there`);
  }
  for (const m of result.misfiled) {
    lines.push(
      m.open.length
        ? `  ~ misfiled  ${m.name} is recorded with home ${m.home} but ${m.open[0]} is the subpath that declares it`
        : `  ~ misfiled  ${m.name} is recorded with home ${m.home}, yet every publication of it is recorded, so no subpath declares it`,
    );
  }
  return lines.join('\n');
}

/**
 * The three shapes of canonical-home failure, each list empty when the surface and the record agree.
 * @typedef {object} HomeViolations
 * @property {{ name: string, subpaths: string[] }[]} unrecorded names published from more than one unrecorded subpath, listing those subpaths
 * @property {{ name: string, subpath: string }[]} stale record entries whose subpath no longer publishes the name
 * @property {{ name: string, home: string, open: string[] }[]} misfiled record entries whose stated home is not the subpath left declaring the name
 */

/**
 * The recorded R4 re-export set: the canonical-home rule's exception list.
 * @typedef {object} ReexportRecord
 * @property {{ name: string, subpath: string, home: string, reason: string }[]} [reexports] one entry per non-home publication
 * @property {{ wider: string, narrower: string, reason: string }[]} [layeredBarrels] dependency-axis pairs that share one home
 */

/**
 * A single subpath's surface drift between the committed and emitted snapshots.
 * @typedef {object} SubpathDrift
 * @property {string} subpath the import subpath that drifted
 * @property {string[]} added export names present only in the emitted surface
 * @property {string[]} removed export names present only in the committed surface
 * @property {{ name: string, before: string, after: string }[]} changed exports whose shape changed
 */

// Load the R4 re-export record, failing with the gate's own message (naming the file and the
// failure kind) rather than a raw ENOENT or SyntaxError, so a missing or malformed record reads
// the same as any other check-surface failure.
/**
 * @returns {ReexportRecord | null} null when the record cannot be read or parsed (the
 *   diagnostic is already printed and `process.exitCode` set; the caller must stop)
 */
function loadReexportRecord() {
  const reexportsPath = resolve(ROOT, REEXPORTS);
  /** @type {string} */
  let raw;
  try {
    raw = readFileSync(reexportsPath, 'utf8');
  } catch (err) {
    console.error(`check-surface: could not read ${REEXPORTS}: ${err instanceof Error ? err.message : err}`);
    process.exitCode = 1;
    return null;
  }
  try {
    return JSON.parse(raw);
  } catch (err) {
    console.error(`check-surface: ${REEXPORTS} is not valid JSON: ${err instanceof Error ? err.message : err}`);
    process.exitCode = 1;
    return null;
  }
}

function main() {
  const update = process.argv.includes('--update');
  const snapshotPath = resolve(ROOT, SNAPSHOT);
  const model = buildSurfaceModel();
  const emitted = serializeSurface(model);
  // The home rule runs before the snapshot diff AND before the `--update` write. A new duplicate is
  // a design failure to argue, and regenerating the snapshot would otherwise record it as settled
  // surface with only the next plain run left to notice.
  const record = loadReexportRecord();
  if (!record) return;
  const homes = findHomeViolations(model, record);
  if (homes.unrecorded.length || homes.stale.length || homes.misfiled.length) {
    console.error('check-surface: the canonical-home rule failed.');
    console.error(formatHomeViolations(homes));
    console.error(
      `\nEvery name has one declaring subpath. Publish it from its home, record the second` +
        ` publication in ${REEXPORTS} with the signature that requires it, or correct the entry` +
        ` whose subpath or home the surface no longer matches.`,
    );
    process.exitCode = 1;
    return;
  }
  if (update) {
    writeFileSync(snapshotPath, `${emitted}\n`);
    console.log(`check-surface: wrote ${SNAPSHOT}`);
    return;
  }
  if (!existsSync(snapshotPath)) {
    console.error(`check-surface: missing ${SNAPSHOT}; run "npm run check:surface -- --update" to generate it`);
    process.exitCode = 1;
    return;
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
  process.exitCode = 1;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
