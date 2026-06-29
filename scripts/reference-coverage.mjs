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

// The stability-tier token the marker carries, recognized in two forms: the inline
// "Stability tier: Extension API" line on a heading-sectioned export, and the bare "Extension API"
// cell value in a Types table's Stability column. Both resolve to the same tier word.
const TIER_CELL = /^(Extension|Scaffold) API$/;
const TIER_LINE = /Stability tier:\s*(Extension|Scaffold) API/;

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
// the Stability cell second; the cell must read "Extension API" or "Scaffold API".
/**
 * @param {string} name
 * @param {string} pageText
 * @returns {'Extension' | 'Scaffold' | null}
 */
function tierFromTableRow(name, pageText) {
  const escaped = name.replace(/[$]/g, '\\$&');
  // A name cell may carry a leading `<a id="…"></a>` anchor before the backticked name, so the
  // matcher tolerates any non-pipe prefix in the first cell.
  const rowRe = new RegExp(`^\\|[^|]*\`${escaped}\`\\s*\\|([^|]*)\\|`, 'm');
  const m = rowRe.exec(pageText);
  if (!m) return null;
  const cell = TIER_CELL.exec(m[1].trim());
  return cell ? /** @type {'Extension' | 'Scaffold'} */ (cell[1]) : null;
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
 * @returns {'Extension' | 'Scaffold' | null}
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
  return m ? /** @type {'Extension' | 'Scaffold'} */ (m[1]) : null;
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
  if (!existsSync(pagePath)) return { subpath: entry.subpath, page: entry.page, missing: names, untagged: [], noPage: true };
  const pageText = readFileSync(pagePath, 'utf8');
  const missing = missingNames(names, pageText);
  // A documented export must also carry a tier marker; an undocumented one is already reported as
  // missing, so the tier check runs over the documented (present) names only.
  const present = names.filter((n) => !missing.includes(n));
  const untagged = untaggedNames(present, pageText);
  return { subpath: entry.subpath, page: entry.page, missing, untagged };
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
    } else if (r.untagged.length) {
      console.error(`${r.subpath} (${r.page}): ${r.untagged.length} untagged (no stability tier): ${r.untagged.join(', ')}`);
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
