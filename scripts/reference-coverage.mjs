// cairn-cms: the reference-arm coverage gate. It enumerates the exported names of each package
// subpath from the built .d.ts through the TypeScript compiler API (so re-exports, `export *`, and
// type-only exports all resolve correctly), then asserts each name appears in that subpath's
// reference page. A missing or renamed export fails the gate. The RED output is the page worklist.
import ts from 'typescript';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

// Load a .d.ts module through the compiler API and return its type checker plus its source file.
// The two reference gates and the surface gate's ambient-augmentation renderer all start a d.ts
// program this way, so the `moduleResolution`/`skipLibCheck` options and the missing-source guard
// stay in one place.
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
// The two reference gates share this so they enumerate the same surface; the signature gate keeps
// the checker to render each export's type.
/** @param {string} dtsPath */
export function moduleExports(dtsPath) {
  const { checker, source } = loadDts(dtsPath);
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

// The stability-tier token the marker carries, recognized in two forms: the inline
// "Stability tier: Extension API" line on a heading-sectioned export, and the bare "Extension API"
// cell value in a Types table's Stability column. Both resolve to the same tier word. Three tiers
// are recognized: Extension and Scaffold API are the frozen contract, Unstable API marks a name
// that stays importable with no stability promise across minors (see docs/reference/README.md).
const TIER_CELL = /^(Extension|Scaffold|Unstable) API$/;
const TIER_LINE = /Stability tier:\s*(Extension|Scaffold|Unstable) API/;

// Whether a single export name carries a tier marker in the page text, resolved against THAT name,
// not the whole page. Two carriers, checked in order: a Types-table row whose second (Stability)
// column reads "Extension API" or "Scaffold API", or the section that documents the export carrying
// a "Stability tier: …" line in its window. A whole-page grep is wrong here: a page that marks one
// export and leaves another bare would pass it falsely, so each carrier is keyed to the name.
/**
 * @param {string} name
 * @param {string} pageText
 * @returns {boolean}
 */
export function hasTierMarker(name, pageText) {
  if (tierFromTableRow(name, pageText)) return true;
  return tierFromSection(name, pageText) !== null;
}

// The tier from a Types-table row for `name`, or null. The row is `| `name` | <stability> | … |`,
// the Stability cell second; the cell must read "Extension API", "Scaffold API", or "Unstable API".
/**
 * @param {string} name
 * @param {string} pageText
 * @returns {'Extension' | 'Scaffold' | 'Unstable' | null}
 */
function tierFromTableRow(name, pageText) {
  const escaped = name.replace(/[$]/g, '\\$&');
  // A name cell may carry a leading `<a id="…"></a>` anchor before the backticked name, so the
  // matcher tolerates any non-pipe prefix in the first cell.
  const rowRe = new RegExp(`^\\|[^|]*\`${escaped}\`\\s*\\|([^|]*)\\|`, 'm');
  const m = rowRe.exec(pageText);
  if (!m) return null;
  const cell = TIER_CELL.exec(m[1].trim());
  return cell ? /** @type {'Extension' | 'Scaffold' | 'Unstable'} */ (cell[1]) : null;
}

// The tier from the `###`/`####` section that documents `name`, or null. A subpath documents an
// export under an h3 (most pages), an h4 (core's functions, nested under an h3 group), or a grouped
// h4 that defines several peer exports at once (core's "Id helpers", "Manifest …" groups). The
// carrier walks each h3/h4 section window (heading to the next h2/h3/h4 heading) and accepts the one
// that DEFINES `name`, by its heading text or a `declare`/`interface`/`type`/`class` definition in
// its window, AND carries a "Stability tier: …" line. Requiring a definition, not a bare mention,
// keeps this per-export: a section that mentions `name` only in prose does not lend it a tier, and a
// defining section with no tier line fails `name`, so a later section's marker never leaks back.
/**
 * @param {string} name
 * @param {string} pageText
 * @returns {'Extension' | 'Scaffold' | 'Unstable' | null}
 */
function tierFromSection(name, pageText) {
  const escaped = name.replace(/[$]/g, '\\$&');
  const headingRe = new RegExp(`\`${escaped}\`\\s*$`);
  // A section DEFINES `name` when its heading names it, a `.d.ts`-style declaration introduces it, or
  // a definition line leads with the backticked name (the prose form core's grouped sections use:
  // "`FieldDescriptor` is …" or a "- `remarkDirectiveStamp` …" bullet). A definitional position, not
  // any mention, keeps the carrier per-export.
  const declaresRe = new RegExp(
    `(?:declare\\s+(?:function|const|class|let|var)|interface|type|class)\\s+${escaped}(?![\\w$])`,
  );
  const definesLineRe = new RegExp(`^\\s*(?:-\\s+)?\`${escaped}[\`(]`, 'm');
  // The most specific section that defines `name` owns its tier. A section whose heading names `name`
  // is the most specific; failing that, the narrowest (deepest-heading) section that declares or
  // defines it wins. A broad h2 wrapper that merely contains a narrower export's own h3/h4 section
  // must not lend its tier to that export, which is the whole-section leak the per-export rule
  // forbids: an export with its own section is resolved there, and only a name with no narrower home
  // falls back to its enclosing group.
  /** @type {{ rank: number, body: string } | null} */
  let best = null;
  for (const win of sectionWindows(pageText)) {
    const headingMatch = headingRe.test(win.heading);
    const defines = headingMatch || declaresRe.test(win.body) || definesLineRe.test(win.body);
    if (!defines) continue;
    // A heading match outranks any body match; among body matches, deeper wins.
    const rank = headingMatch ? 100 : win.depth;
    if (!best || rank > best.rank) best = { rank, body: win.body };
  }
  if (!best) return null;
  const m = TIER_LINE.exec(best.body);
  return m ? /** @type {'Extension' | 'Scaffold' | 'Unstable'} */ (m[1]) : null;
}

// Each h2/h3/h4 section of a page as `{ heading, body }`, the body running from the heading to the
// next heading of the same or a shallower depth. Most exports live under an h3/h4; core's grouped
// "Low-level" bullet list of `export *` leaks lives under an h2, so the scanner spans h2 as well.
// The per-export "defines" test in the caller keeps an h2 group from tagging a name it only mentions.
/**
 * @param {string} pageText
 * @returns {{ heading: string, depth: number, body: string }[]}
 */
function sectionWindows(pageText) {
  const out = [];
  const heads = [...pageText.matchAll(/^(#{2,4})[ \t].*$/gm)];
  for (let i = 0; i < heads.length; i++) {
    const head = heads[i];
    const depth = head[1].length;
    const start = head.index ?? 0;
    const after = pageText.slice(start + head[0].length);
    // The window ends at the next heading of the same or a shallower depth.
    const closer = new RegExp(`^#{2,${depth}}[ \\t]`, 'm');
    const nextHead = closer.exec(after);
    const body = head[0] + (nextHead ? after.slice(0, nextHead.index) : after);
    out.push({ heading: head[0], depth, body });
  }
  return out;
}

// The names from `names` whose export carries no tier marker (no section line and no table cell).
/**
 * @param {string[]} names
 * @param {string} pageText
 */
export function untaggedNames(names, pageText) {
  return names.filter((/** @type {string} */ name) => !hasTierMarker(name, pageText));
}

// The candidate names from a page's Types table, bare export headings, and declared signatures
// that are no longer real exports anywhere in the package (rule b, the reverse check / stale-prose
// lock): a page that still documents a renamed or removed name fails here, even though the
// forward check above never looks at it (it only ever iterates the real export list). This
// deliberately reads the same three carriers hasTierMarker does, plus the Types table's Name
// column read as a whole, not any backticked span anywhere on the page: an ordinary prose mention,
// a non-export table (the admin action table's `request`/`confirm`/… rows), or a dependent,
// non-exported type shown for context in a signature block must not false-positive. `names` is
// the caller's known-real-export pool; the check is package-wide, not page-scoped, because a page
// legitimately names a real export that lives on a different subpath (core's "Component-author
// helpers" section shows `cardShell`/`headRow`/`iconSpan`, all `/render` exports, beside the root
// export `glyph`), so this stays a lock against a genuinely dead name, not a page-boundary check.
/**
 * @param {string[]} names
 * @param {string} pageText
 * @returns {string[]}
 */
export function staleNames(names, pageText) {
  const known = new Set(names);
  const candidates = new Set([...typesTableNames(pageText), ...bareHeadingNames(pageText), ...declaredNames(pageText)]);
  return [...candidates].filter((name) => !known.has(name)).sort();
}

// The Name column of a page's Types table, scoped to the table whose header carries a Stability
// column (`| Name | Stability | Signature | Meaning |`), the export-catalog shape. Any other
// table on the page (such as the admin action table) is not scanned, since its backticked first
// cells are not export names.
/** @param {string} pageText */
function typesTableNames(pageText) {
  const header = /^\|\s*Name\s*\|\s*Stability\s*\|.*\|\s*$/m.exec(pageText);
  if (!header) return [];
  // Slice from the header line itself, then drop it (index 0), so the divider row and every
  // data row that follows line up at index 1+ with no off-by-one from the header's own newline.
  const lines = pageText.slice(header.index).split('\n').slice(1);
  const names = [];
  for (const line of lines) {
    if (!line.startsWith('|')) break; // the table ends at the first non-table line
    const m = /^\|[^|]*`([A-Za-z_$][\w$]*)`/.exec(line);
    if (m) names.push(m[1]);
  }
  return names;
}

// A bare export heading: `#{2,4}` followed by exactly one backticked name and nothing else. A
// qualified heading such as "#### `preview` (adapter `editor` member)" carries trailing prose and
// is deliberately excluded, since its bare name documents an adapter field, not an export (the
// underlying exported type, `PreviewConfig`, is covered by its own Types-table row).
/** @param {string} pageText */
function bareHeadingNames(pageText) {
  const re = /^#{2,4}[ \t]+`([A-Za-z_$][\w$]*)`\s*$/gm;
  return [...pageText.matchAll(re)].map((m) => m[1]);
}

const TS_FENCE_OPEN_RE = /^```(?:ts|typescript)\s*$/;
const FENCE_CLOSE_RE = /^```\s*$/;

// Every fenced ```ts/```typescript code block's raw body text, in document order.
/** @param {string} pageText */
function tsFencedBlocks(pageText) {
  const lines = pageText.split('\n');
  /** @type {string[]} */
  const blocks = [];
  for (let i = 0; i < lines.length; i++) {
    if (!TS_FENCE_OPEN_RE.test(lines[i])) continue;
    let j = i + 1;
    while (j < lines.length && !FENCE_CLOSE_RE.test(lines[j])) j++;
    blocks.push(lines.slice(i + 1, j).join('\n'));
    i = j;
  }
  return blocks;
}

// Whether every top-level statement in a ts code block is an ambient declaration (`declare
// function`, `declare const`, `declare class`), the reference arm's convention for showing an
// export's signature with no runnable body, rather than a runnable usage example. A usage example
// mixes a real import and real code with a `declare const` naming a fictional local the
// snippet-typecheck gate needs standing up (`declare const fileText: string;` beside a real
// `parseMarkdown(fileText)` call, or `declare const entry: ContentEntry;` beside a real call that
// consumes it); that name is scaffolding for the snippet's own type-check, never an export claim,
// so it must not enter the stale-name candidate pool. A signature-only block and a usage block
// share the identical `declare const` syntax, so only the surrounding statements (an import, a
// real call) tell them apart, which is why this reads the block's own AST rather than trusting
// the name regex the caller applies next.
/** @param {string} code */
function isSignatureOnlyBlock(code) {
  const source = ts.createSourceFile('block.ts', code, ts.ScriptTarget.ES2022, true);
  if (source.statements.length === 0) return false;
  return source.statements.every((stmt) => {
    const hasDeclare =
      ts.canHaveModifiers(stmt) &&
      (ts.getCombinedModifierFlags(/** @type {ts.Declaration} */ (/** @type {unknown} */ (stmt))) &
        ts.ModifierFlags.Ambient) !==
        0;
    return hasDeclare && (ts.isFunctionDeclaration(stmt) || ts.isVariableStatement(stmt) || ts.isClassDeclaration(stmt));
  });
}

// A top-level `declare function`/`declare const`/`declare class` name from a signature-only fenced
// block. Scoped to a whole, signature-only block (see `isSignatureOnlyBlock`) rather than the raw
// page text, so a usage example's scaffolding `declare const` never contributes a candidate; the
// documented-name inventory this feeds stays anchored to the page's structural signature blocks,
// the same convention `bareHeadingNames` and `typesTableNames` read from headings and table rows.
/** @param {string} pageText */
function declaredNames(pageText) {
  const re = /declare\s+(?:function|const|class)\s+([A-Za-z_$][\w$]*)/g;
  const names = [];
  for (const block of tsFencedBlocks(pageText)) {
    if (!isSignatureOnlyBlock(block)) continue;
    names.push(...[...block.matchAll(re)].map((m) => m[1]));
  }
  return names;
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
  { subpath: '/islands', dts: 'dist/islands/index.d.ts', page: 'docs/reference/islands.md' },
  { subpath: '/delivery', dts: 'dist/delivery/index.d.ts', page: 'docs/reference/delivery.md', excludeDts: 'dist/delivery/data.d.ts' },
  { subpath: '/delivery/data', dts: 'dist/delivery/data.d.ts', page: 'docs/reference/delivery-data.md' },
  { subpath: '/delivery/head', dts: 'dist/delivery/head.d.ts', page: 'docs/reference/delivery.md' },
  { subpath: '/media', dts: 'dist/media/index.d.ts', page: 'docs/reference/media.md' },
  { subpath: '/vite', dts: 'dist/vite/index.d.ts', page: 'docs/reference/vite.md' },
  // Type-only: the module exports no names, so the entry asserts only that the page exists.
  { subpath: '/ambient', dts: 'dist/ambient.d.ts', page: 'docs/reference/ambient.md' },
];

// The full, unfiltered real-export set across every covered subpath, not just the one a page
// documents. A reference page legitimately shows a real name from another subpath for narrative
// context (core's "Component-author helpers" block declares `cardShell`, `headRow`, and
// `iconSpan` alongside the root export `glyph`, even though the three live on `/render`), so the
// reverse check's job is narrower than "is this name exported here": it is "does this name still
// exist anywhere as a real export", which is what makes it a lock against a renamed or removed
// name rather than a page-boundary purity check. Built from all of CONFIG regardless of the
// `--only` filter, so a single-subpath run sees the same pool a full run does.
/** @param {{ dts: string }[]} entries */
function globalKnownNames(entries) {
  const known = new Set();
  for (const entry of entries) {
    const dtsPath = resolve(ROOT, entry.dts);
    if (!existsSync(dtsPath)) continue;
    for (const n of enumerateExports(dtsPath)) known.add(n);
  }
  return known;
}

/**
 * @param {{ subpath: string, dts: string, page: string, excludeDts?: string }} entry
 * @param {Set<string>} knownNames
 */
function checkOne(entry, knownNames) {
  const dtsPath = resolve(ROOT, entry.dts);
  if (!existsSync(dtsPath)) throw new Error(`missing ${entry.dts}; run "npm run package" first`);
  let names = enumerateExports(dtsPath);
  if (entry.excludeDts) {
    const excluded = new Set(enumerateExports(resolve(ROOT, entry.excludeDts)));
    names = names.filter((n) => !excluded.has(n));
  }
  const pagePath = resolve(ROOT, entry.page);
  if (!existsSync(pagePath)) {
    return { subpath: entry.subpath, page: entry.page, missing: names, untagged: [], stale: [], noPage: true };
  }
  const pageText = readFileSync(pagePath, 'utf8');
  const missing = missingNames(names, pageText);
  // A documented export must also carry a tier marker; an undocumented one is already reported as
  // missing, so the tier check runs over the documented (present) names only.
  const present = names.filter((n) => !missing.includes(n));
  const untagged = untaggedNames(present, pageText);
  const stale = staleNames([...knownNames], pageText);
  return { subpath: entry.subpath, page: entry.page, missing, untagged, stale };
}

// The CONFIG entries selected by an optional `--only <subpath>` CLI arg, or every entry when
// `only` is undefined. Exits the process with a diagnostic when the requested subpath does not
// exist, the failure mode both reference gates' `main()` share.
/**
 * @template {{ subpath: string }} T
 * @param {string | undefined} only
 * @param {T[]} config
 * @returns {T[]}
 */
export function resolveEntries(only, config) {
  const entries = only ? config.filter((c) => c.subpath === only) : config;
  if (only && entries.length === 0) {
    console.error(`unknown subpath ${only}`);
    process.exit(2);
  }
  return entries;
}

// Run `main` only when this module is the invoked entry point (`node scripts/x.mjs`), not when a
// sibling gate imports its exports. Both reference gates share this ESM entry-point guard.
/**
 * @param {() => void} main
 * @param {string} moduleUrl
 */
export function runIfMain(main, moduleUrl) {
  if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(moduleUrl)) main();
}

function main() {
  const entries = resolveEntries(process.argv[2], CONFIG);
  const knownNames = globalKnownNames(CONFIG);
  let failed = false;
  for (const entry of entries) {
    const r = checkOne(entry, knownNames);
    if (r.noPage) {
      console.error(`MISSING PAGE ${r.page} (${r.subpath})`);
      failed = true;
    } else if (r.missing.length) {
      console.error(`${r.subpath} (${r.page}): ${r.missing.length} uncovered: ${r.missing.join(', ')}`);
      failed = true;
    } else if (r.untagged.length) {
      console.error(`${r.subpath} (${r.page}): ${r.untagged.length} untagged (no stability tier): ${r.untagged.join(', ')}`);
      failed = true;
    } else if (r.stale.length) {
      console.error(`${r.subpath} (${r.page}): ${r.stale.length} stale (no longer exported): ${r.stale.join(', ')}`);
      failed = true;
    } else {
      console.log(`OK ${r.subpath} (${r.page})`);
    }
  }
  process.exit(failed ? 1 : 0);
}

runIfMain(main, import.meta.url);
