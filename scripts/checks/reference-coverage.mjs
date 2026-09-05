// cairn-cms: the reference-arm coverage gate. It enumerates the exported names of each package
// subpath from the built .d.ts through the TypeScript compiler API (so re-exports, `export *`, and
// type-only exports all resolve correctly), then asserts each name appears in that subpath's
// reference page. A missing or renamed export fails the gate. The RED output is the page worklist.
import ts from 'typescript';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadRegistry } from './check-surface-leaks.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

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

// A whole-word matcher for one export or prop name: the name itself, bounded on both sides by a
// non-identifier character. `$` is the one name character that also means something to the regex
// engine, so it is the only one escaped.
/** @param {string} name @returns {RegExp} */
function wholeWordRe(name) {
  const escaped = name.replace(/[$]/g, '\\$&');
  return new RegExp(`(?<![\\w$])${escaped}(?![\\w$])`);
}

// The names from `names` that do not appear as a whole-word token in the page text.
/**
 * @param {string[]} names
 * @param {string} pageText
 */
export function missingNames(names, pageText) {
  return names.filter((/** @type {string} */ name) => !wholeWordRe(name).test(pageText));
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
// the caller-supplied known-real-export pool, scoped per page via `knownNamesByPage` so a name
// real only on some unrelated subpath no longer excuses a stale mention. `globalKnownNames` widens
// that pool back out, but only as the realness check `isAllowlisted` applies to a recorded
// narrative-context exception (see `NARRATIVE_CONTEXT_ALLOWLIST`), never as the pool this function
// itself checks against.
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

// The distinct names the check-surface-leaks registry records against one subpath: the corpus
// of un-importable members whose printed occurrence on that subpath's page requires the
// indexed-access parenthetical (ruling 3, docs/internal/engine-rulings.md's
// indexed-access-parenthetical-convention row). Deduped, since a name can carry more than one
// registry entry only by (name, subpath) uniqueness, never twice for the same subpath.
/**
 * @param {{ name: string, subpath: string }[]} leaks
 * @param {string} subpath
 * @returns {string[]}
 */
export function leakNamesForSubpath(leaks, subpath) {
  return [...new Set(leaks.filter((l) => l.subpath === subpath).map((l) => l.name))];
}

// The real backtick code spans in `text`, in document order. Splitting on the backtick
// character and taking every odd-indexed piece assumes well-formed alternating pairs (every
// reference page's own convention: prose never contains a bare backtick), which is what keeps
// this from bridging across two UNRELATED code spans the way a single greedy `` `[^`]*` ``
// regex would: two spans separated by ordinary prose that happens to contain a markdown link's
// `[text](url)` brackets must not read as one indexed-access expression.
/** @param {string} text */
function codeSpans(text) {
  const parts = text.split('`');
  const spans = [];
  for (let i = 1; i < parts.length; i += 2) spans.push(parts[i]);
  return spans;
}

// Whether `text` carries a code span with at least one NON-EMPTY bracket subscript: the
// convention's own marker that a consumer reaches an un-importable member via indexed access
// off a real exported type (`Extract<AdminData, { view: 'edit' }>['page']['advisories'][number]`,
// `NonNullable<ContentFormFailure['usage']>[number]`, and the like). The bracket contents must be
// non-empty (`[^\]]+`, not `[^\]]*`) so an ordinary array-type suffix (`AdvisoryNotice[]`, empty
// brackets) never false-matches as an indexed-access marker.
/** @param {string} text */
function hasIndexedAccessSpan(text) {
  return codeSpans(text).some((span) => /\[[^\]]+\]/.test(span));
}

// The page split into the locality units the parenthetical-required check measures against. A
// markdown table's rows carry no blank line between them, so each row is its own unit: the same
// row a printed member and its parenthetical both live on (the Types table's dense Meaning
// cells). Every other run of text is one unit per blank-line-delimited paragraph, since the
// established convention (LoginData/ConfirmData, EditorsData) places the parenthetical a few
// sentences into the same prose paragraph, not necessarily the same line. Treating the whole
// page as one unit would let an unrelated bracket expression anywhere excuse every leak, which
// defeats the check; treating every line as its own unit would fail a paragraph whose
// parenthetical wraps onto a second line, which the wrapped prose convention already does.
/** @param {string} pageText */
function localityUnits(pageText) {
  const units = [];
  for (const block of pageText.split(/\n{2,}/)) {
    const lines = block.split('\n').filter((line) => line.length > 0);
    const isTable = lines.length > 0 && lines.every((line) => line.trimStart().startsWith('|'));
    if (isTable) units.push(...lines);
    else units.push(block);
  }
  return units;
}

// The names from `names` that the page prints as a whole-word mention with no indexed-access
// parenthetical in the same locality unit. A name the page never prints at all is out of scope:
// ruling 3 never retrofits a parenthetical onto a name absent from the page (that would be
// introducing a name to hang documentation on, not documenting one already there).
/**
 * @param {string[]} names
 * @param {string} pageText
 * @returns {string[]}
 */
export function missingIndexedAccessParentheticals(names, pageText) {
  const units = localityUnits(pageText);
  const offenders = [];
  for (const name of names) {
    const nameRe = wholeWordRe(name);
    if (!nameRe.test(pageText)) continue;
    const covered = units.some((unit) => nameRe.test(unit) && hasIndexedAccessSpan(unit));
    if (!covered) offenders.push(name);
  }
  return offenders;
}

// Task 7's props-vs-reference clause (an extension of this gate, not a new script per the plan's
// tie-break rule): a component's own Props keys, diffed against its reference-page section.
//
// A component's per-file dist declaration carries its Props shape under one of two names,
// depending on how svelte-package generated it: a local `interface Props { ... }` when the
// component's own script declares one explicitly (the common case, and the one an `extends`
// composition such as MarkdownEditor's `Props extends StableEditorProps, UnstableEditorProps`
// still uses), or a synthesized `type $$ComponentProps = { ... }` alias when it does not (a
// component whose `$props()` destructuring types its shape inline, such as HelpHome and
// WelcomeView).
const PROPS_TYPE_NAMES = ['Props', '$$ComponentProps'];

// The Props member names a component's own dist `.svelte.d.ts` declares, resolved through the type
// checker (`type.getProperties()`) so an `interface Props extends A, B` reports A's and B's
// members too, not just Props' own declared ones. Null when the file declares neither known Props
// shape.
/** @param {string} dtsPath */
export function componentPropsNames(dtsPath) {
  const { checker, source } = loadDts(dtsPath);
  for (const shapeName of PROPS_TYPE_NAMES) {
    const decl = source.statements.find(
      (s) => (ts.isInterfaceDeclaration(s) || ts.isTypeAliasDeclaration(s)) && s.name.text === shapeName,
    );
    if (!decl) continue;
    const type = checker.getTypeAtLocation(decl);
    return type.getProperties().map((p) => p.name).sort();
  }
  return null;
}

// The doc window for one component's own `### `Name`` section on the components reference page:
// from its heading to the next h2 or h3 heading, deliberately never stopping at an h4, so a
// component's own sub-section under an h4 (MarkdownEditor's "wiring props (Unstable API)" table)
// stays inside its owning component's window rather than falling out of scope. Null when the page
// carries no such heading for `name`.
/**
 * @param {string} name
 * @param {string} pageText
 * @returns {string | null}
 */
export function componentSectionWindow(name, pageText) {
  const escaped = name.replace(/[$]/g, '\\$&');
  const headingRe = new RegExp(`^###\\s+\`${escaped}\`\\s*$`, 'm');
  const m = headingRe.exec(pageText);
  if (!m) return null;
  const after = pageText.slice(m.index + m[0].length);
  const closer = /^#{2,3}[ \t]/m;
  const next = closer.exec(after);
  return m[0] + (next ? after.slice(0, next.index) : after);
}

// The prop names from `names` that never appear as a whole-word token anywhere in `sectionText`
// (the owning component's own doc window, not the whole page). Mirrors `missingNames`, scoped per
// component so an undocumented prop on a page covering many components is attributed to the right
// one, not lost in the page-wide pool. Known weakness, the same class `missingNames` carries: a
// whole-word match anywhere in the section counts, including an ordinary prose sentence that
// happens to name the prop, so a prop mentioned only in passing (never in a Props signature or a
// dedicated row) still reads as documented.
/**
 * @param {string[]} names
 * @param {string} sectionText
 * @returns {string[]}
 */
export function missingComponentProps(names, sectionText) {
  return names.filter((name) => !wholeWordRe(name).test(sectionText));
}

// A Props member that is documented, but PINNED unstable so it never quietly promotes into the
// component's frozen stable contract even though a plain presence check (missingComponentProps)
// passes it regardless of which part of the section names it. Ruling 1 / S-10:
// MarkdownEditor's `spellcheckTest` is a test-only Worker-factory seam that must stay out of
// `StableEditorProps`. Each entry is checked against the component's own STABLE snippet (see
// `stableSnippet` below), which must never name the pinned prop.
/** @type {{ component: string, prop: string, reason: string }[]} */
export const DOCUMENTED_UNSTABLE_PROPS = [
  {
    component: 'MarkdownEditor',
    prop: 'spellcheckTest',
    reason:
      'a test-only Worker-factory seam for the component test harness (the real wasm and ' +
      'dictionary assets do not load under the vitest browser runner); pinning it here stops it ' +
      'quietly joining the frozen stable snippet the way an ordinary documented prop would.',
  },
];

// Every DOCUMENTED_UNSTABLE_PROPS entry must carry a non-empty reason, the same fail-unless-
// recorded idiom the narrative-context allowlist uses.
/** @param {{ component: string, prop: string, reason: string }[]} registry */
export function assertDocumentedUnstableReasoned(registry) {
  for (const entry of registry) {
    if (!entry.reason || !entry.reason.trim()) {
      throw new Error(`documented-unstable entry for ${entry.component}.${entry.prop} has no reason`);
    }
  }
}

// The component's own stable-contract snippet: the first fenced ```ts/```typescript block inside
// its section window, the convention every component page's frozen-contract listing opens with
// (the `let { ... }: { ... } = $props();` destructuring). Empty string when the section carries no
// such block, so a pinned prop trivially fails to appear in it.
/** @param {string} sectionText */
function stableSnippet(sectionText) {
  return tsFencedBlocks(sectionText)[0] ?? '';
}

// The DOCUMENTED_UNSTABLE_PROPS entries for `component` whose pinned prop has crept into its own
// stable snippet, which would silently promote it into the frozen contract the snippet documents.
/**
 * @param {string} component
 * @param {string} sectionText
 * @param {{ component: string, prop: string, reason: string }[]} [registry]
 * @returns {string[]}
 */
export function promotedUnstableProps(component, sectionText, registry = DOCUMENTED_UNSTABLE_PROPS) {
  const snippet = stableSnippet(sectionText);
  return registry
    .filter((e) => e.component === component && wholeWordRe(e.prop).test(snippet))
    .map((e) => e.prop);
}

// One component's props-vs-reference result: `missing` (an undocumented Props key), `promoted` (a
// documented-unstable pin that crept into the stable snippet), and `noSection` (the page carries no
// `### `name`` heading at all, so every real prop is trivially missing). Null when the component's
// dist declaration EXISTS but carries no Props shape (nothing to check); a MISSING declaration
// throws instead, matching `checkOne`'s own "run npm run package first" for the index-wide case: a
// missing `.d.ts` means the package has not been built, never that the component has zero props,
// and a silent null here would read as the latter.
/**
 * @param {string} name
 * @param {string} dtsPath
 * @param {string} pageText
 */
export function checkComponentProps(name, dtsPath, pageText) {
  if (!existsSync(dtsPath)) throw new Error(`missing ${dtsPath}; run "npm run package" first`);
  const names = componentPropsNames(dtsPath);
  if (!names || names.length === 0) return null;
  const section = componentSectionWindow(name, pageText);
  if (section === null) {
    return { component: name, missing: names, promoted: [], noSection: true };
  }
  return {
    component: name,
    missing: missingComponentProps(names, section),
    promoted: promotedUnstableProps(name, section),
    noSection: false,
  };
}

// One reference page per importable subpath. `excludeDts` drops a re-exported surface that is
// documented on its own page: /delivery re-exports all of /delivery/data, so the delivery page
// documents only its own additions. The /delivery/head entry points at the same delivery.md page,
// so the folded-in CairnHead is covered there.
export const CONFIG = [
  { subpath: '.', dts: 'dist/index.d.ts', page: 'docs/reference/core.md' },
  { subpath: '/sveltekit', dts: 'dist/sveltekit/index.d.ts', page: 'docs/reference/sveltekit.md' },
  { subpath: '/components', dts: 'dist/components/index.d.ts', page: 'docs/reference/components.md' },
  { subpath: '/reproductions', dts: 'dist/reproductions/index.d.ts', page: 'docs/reference/reproductions.md' },
  { subpath: '/reproductions/manifest', dts: 'dist/reproductions/manifest.d.ts', page: 'docs/reference/reproductions.md' },
  { subpath: '/admin-toolkit', dts: 'dist/admin-toolkit/index.d.ts', page: 'docs/reference/admin-toolkit.md' },
  { subpath: '/render', dts: 'dist/render/authoring.d.ts', page: 'docs/reference/render.md' },
  { subpath: '/islands', dts: 'dist/islands/index.d.ts', page: 'docs/reference/islands.md' },
  { subpath: '/delivery', dts: 'dist/delivery/index.d.ts', page: 'docs/reference/delivery.md', excludeDts: 'dist/delivery/data.d.ts' },
  { subpath: '/delivery/data', dts: 'dist/delivery/data.d.ts', page: 'docs/reference/delivery-data.md' },
  { subpath: '/delivery/head', dts: 'dist/delivery/head.d.ts', page: 'docs/reference/delivery.md' },
  { subpath: '/media', dts: 'dist/media/index.d.ts', page: 'docs/reference/media.md' },
  { subpath: '/auth-store', dts: 'dist/auth-store/index.d.ts', page: 'docs/reference/auth-store.md' },
  { subpath: '/auth-channel', dts: 'dist/auth-channel/index.d.ts', page: 'docs/reference/auth-channel.md' },
  { subpath: '/auth-crypto', dts: 'dist/auth-crypto/index.d.ts', page: 'docs/reference/auth-crypto.md' },
  { subpath: '/cloudflare', dts: 'dist/cloudflare/index.d.ts', page: 'docs/reference/cloudflare.md' },
  { subpath: '/vite', dts: 'dist/vite/index.d.ts', page: 'docs/reference/vite.md' },
  // Type-only: the module exports no names, so the entry asserts only that the page exists.
  { subpath: '/ambient', dts: 'dist/ambient.d.ts', page: 'docs/reference/ambient.md' },
];

// The full, unfiltered real-export set across every covered subpath. This is no longer the pool
// `staleNames` checks a page against (see `knownNamesByPage` below, the per-page rescope); it
// survives as the realness check `isAllowlisted` runs a narrative-context exception against, so an
// allowlisted name that is later renamed or removed everywhere still fails here instead of hiding
// behind a stale allowlist entry. Built from all of CONFIG regardless of the `--only` filter, so a
// single-subpath run sees the same pool a full run does.
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

// The real-export names a page itself documents, the pool `staleNames` checks that page against.
// Scoped per PAGE, not per CONFIG entry, because two page files each cover two subpath entries
// (delivery.md documents both /delivery and /delivery/head; reproductions.md documents both
// /reproductions and /reproductions/manifest): a name real only on the page's OTHER covered
// subpath is still that page's own name, not foreign. A name real on some unrelated subpath the
// page does not cover no longer excuses a stale mention (the union-over-everything pool this
// replaces let 14 dead rows survive undetected in delivery-data.md, see
// `docs/internal/engine-rulings.md`'s `reference-coverage-stale-names-rescope` row); the
// deliberate exceptions that remain go in `NARRATIVE_CONTEXT_ALLOWLIST`. Built from all of CONFIG
// regardless of the `--only` filter, matching `globalKnownNames`.
/** @param {{ dts: string, page: string, excludeDts?: string }[]} entries */
function knownNamesByPage(entries) {
  const byPage = new Map();
  for (const entry of entries) {
    const dtsPath = resolve(ROOT, entry.dts);
    if (!existsSync(dtsPath)) continue;
    let names = enumerateExports(dtsPath);
    if (entry.excludeDts) {
      const excluded = new Set(enumerateExports(resolve(ROOT, entry.excludeDts)));
      names = names.filter((n) => !excluded.has(n));
    }
    if (!byPage.has(entry.page)) byPage.set(entry.page, new Set());
    for (const n of names) byPage.get(entry.page).add(n);
  }
  return byPage;
}

// A reasoned exception to the per-page pool above: a page may legitimately show a real export
// from another subpath as narrative context, a claim about where a related helper lives rather
// than a claim that it lives here. Each entry names its page, the foreign names it shows, and the
// reason, the same fail-unless-recorded idiom `check:surface`'s leak registry uses, so a carve-out
// is self-explaining rather than silent.
/** @type {{ page: string, names: string[], reason: string }[]} */
export const NARRATIVE_CONTEXT_ALLOWLIST = [
  {
    page: 'docs/reference/core.md',
    names: ['cardShell', 'headRow', 'iconSpan'],
    reason:
      "the Component-author helpers section shows the /render hast-building trio beside the " +
      "root-barrel renderGlyph export, in the alert component's worked build() example. " +
      'Re-homing is deferred to the chassis pass: engine-rulings.md\'s ' +
      "f1-return-position-leak-sanction row carries the trio as list (c) Tier 4, chassis-coupled.",
  },
];

// Every allowlist entry must carry a non-empty reason: a recorded exception that does not explain
// itself is a bug in the allowlist, not a silent pass-through.
/** @param {{ page: string, names: string[], reason: string }[]} allowlist */
export function assertAllowlistReasoned(allowlist) {
  for (const entry of allowlist) {
    if (!entry.reason || !entry.reason.trim()) {
      throw new Error(
        `narrative-context allowlist entry for ${entry.page} (${entry.names.join(', ')}) has no reason`,
      );
    }
  }
}

// Whether `name` on `page` is a recorded narrative-context exception AND still a real export
// somewhere in the package. The realness check is what keeps the renamed/removed lock intact for
// an allowlisted name: if `name` is later renamed or removed everywhere, this returns false and
// the name fails as stale, same as any other dead name.
/**
 * @param {string} page
 * @param {string} name
 * @param {Set<string>} globalNames
 * @param {{ page: string, names: string[], reason: string }[]} allowlist
 */
function isAllowlisted(page, name, globalNames, allowlist) {
  return allowlist.some((entry) => entry.page === page && entry.names.includes(name) && globalNames.has(name));
}

/**
 * @param {object} options
 * @param {{ subpath: string, dts: string, page: string, excludeDts?: string }} options.entry
 * @param {Set<string>} options.pageKnownNames the real exports this page documents (own subpath,
 *   plus any sibling subpath entry that shares the same page)
 * @param {Set<string>} options.globalKnownNamesSet the full real-export pool, used only to keep
 *   an allowlisted name honest against a later rename or removal
 * @param {{ page: string, names: string[], reason: string }[]} [options.allowlist]
 * @param {string[]} [options.leakNames] the check-surface-leaks names recorded against this
 *   subpath (see `leakNamesForSubpath`); a printed one with no indexed-access parenthetical fails
 */
export function checkOne({
  entry,
  pageKnownNames,
  globalKnownNamesSet,
  allowlist = NARRATIVE_CONTEXT_ALLOWLIST,
  leakNames = [],
}) {
  const dtsPath = resolve(ROOT, entry.dts);
  if (!existsSync(dtsPath)) throw new Error(`missing ${entry.dts}; run "npm run package" first`);
  let names = enumerateExports(dtsPath);
  if (entry.excludeDts) {
    const excluded = new Set(enumerateExports(resolve(ROOT, entry.excludeDts)));
    names = names.filter((n) => !excluded.has(n));
  }
  const pagePath = resolve(ROOT, entry.page);
  if (!existsSync(pagePath)) {
    return {
      subpath: entry.subpath,
      page: entry.page,
      missing: names,
      untagged: [],
      stale: [],
      missingParenthetical: [],
      noPage: true,
    };
  }
  const pageText = readFileSync(pagePath, 'utf8');
  const missing = missingNames(names, pageText);
  // A documented export must also carry a tier marker; an undocumented one is already reported as
  // missing, so the tier check runs over the documented (present) names only.
  const present = names.filter((n) => !missing.includes(n));
  const untagged = untaggedNames(present, pageText);
  const stale = staleNames([...pageKnownNames], pageText).filter(
    (name) => !isAllowlisted(entry.page, name, globalKnownNamesSet, allowlist),
  );
  const missingParenthetical = missingIndexedAccessParentheticals(leakNames, pageText);
  return { subpath: entry.subpath, page: entry.page, missing, untagged, stale, missingParenthetical };
}

// The CONFIG entries selected by an optional `--only <subpath>` CLI arg, or every entry when
// `only` is undefined. Exits the process with a diagnostic when the requested subpath does not
// exist, the failure mode both reference gates' `main()` share.
/**
 * @template {{ subpath: string }} T
 * @param {string | undefined} only
 * @param {T[]} config
 * @returns {T[] | null} null when `only` names an unknown subpath (the caller has already had
 *   the diagnostic printed and `process.exitCode` set, and must stop rather than proceed with
 *   no entries)
 */
export function resolveEntries(only, config) {
  const entries = only ? config.filter((c) => c.subpath === only) : config;
  if (only && entries.length === 0) {
    console.error(`unknown subpath ${only}`);
    process.exitCode = 2;
    return null;
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
  if (!entries) return;
  assertAllowlistReasoned(NARRATIVE_CONTEXT_ALLOWLIST);
  const pageNames = knownNamesByPage(CONFIG);
  const globalNames = globalKnownNames(CONFIG);
  const leaks = loadRegistry();
  if (!leaks) return;
  let failed = false;
  for (const entry of entries) {
    const leakNames = leakNamesForSubpath(leaks, entry.subpath);
    const r = checkOne({
      entry,
      pageKnownNames: pageNames.get(entry.page) ?? new Set(),
      globalKnownNamesSet: globalNames,
      leakNames,
    });
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
      console.error(
        `${r.subpath} (${r.page}): ${r.stale.length} stale (not a real export this page covers): ${r.stale.join(', ')}`,
      );
      failed = true;
    } else if (r.missingParenthetical.length) {
      console.error(
        `${r.subpath} (${r.page}): ${r.missingParenthetical.length} printed with no indexed-access parenthetical: ${r.missingParenthetical.join(', ')}`,
      );
      failed = true;
    } else {
      console.log(`OK ${r.subpath} (${r.page})`);
    }
  }
  // The props-vs-reference clause runs once over every exported component, only when the run
  // covers /components (an `--only` run for another subpath has nothing to check).
  const componentsEntry = entries.find((e) => e.subpath === '/components');
  if (componentsEntry) {
    assertDocumentedUnstableReasoned(DOCUMENTED_UNSTABLE_PROPS);
    const indexPath = resolve(ROOT, componentsEntry.dts);
    if (!existsSync(indexPath)) throw new Error(`missing ${componentsEntry.dts}; run "npm run package" first`);
    const pageText = readFileSync(resolve(ROOT, componentsEntry.page), 'utf8');
    for (const name of enumerateExports(indexPath)) {
      const dtsPath = resolve(ROOT, `dist/components/${name}.svelte.d.ts`);
      // /components exports a component per name (each with a `.svelte.d.ts`), plus a handful of
      // plain type exports riding the same barrel (EditorApi, say): no matching `.svelte.d.ts`
      // exists for those, by design, never a build failure. Discriminate on the *source*, not the
      // dist output: a name with no `src/lib/components/<name>.svelte` is a type export and is
      // skipped here; a name that IS a real component but is missing its dist declaration (a stale
      // or partial build) falls through to checkComponentProps's own missing-file throw.
      if (!existsSync(resolve(ROOT, `src/lib/components/${name}.svelte`))) continue;
      const r = checkComponentProps(name, dtsPath, pageText);
      if (!r) continue;
      if (r.noSection) {
        console.error(`/components props (${componentsEntry.page}): ${r.component} has no own section on the page`);
        failed = true;
      } else if (r.missing.length) {
        console.error(
          `/components props (${componentsEntry.page}): ${r.component} ${r.missing.length} undocumented prop(s): ${r.missing.join(', ')}`,
        );
        failed = true;
      } else if (r.promoted.length) {
        console.error(
          `/components props (${componentsEntry.page}): ${r.component} documented-unstable prop(s) crept into the stable snippet: ${r.promoted.join(', ')}`,
        );
        failed = true;
      } else {
        console.log(`OK /components props (${r.component})`);
      }
    }
  }
  if (failed) process.exitCode = 1;
}

runIfMain(main, import.meta.url);
