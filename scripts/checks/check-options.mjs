// cairn-cms: the option-coverage gate. A committed map (docs/internal/option-map.json) gives every
// public option path one row: a citable fact id, `exclude <reason>`, or `pending <slug>` naming an
// outline page or a published page that should dispose it. The walker below regenerates the paths from the built `dist`
// declarations through the TypeScript compiler API; the gate compares the two and fails on drift, so
// an option added inside a public type can never ship without a fact or a reviewed exclusion.
//
// The roots the walk starts from, by name: every exported function named `define*` or `create*`, plus
// the extras in ROOT_EXTRAS. A new export matching the pattern joins the walk automatically. The
// roots in the current `dist`, by subpath (30 pairs, 27 distinct exports):
//   .               createGithubApp, createRenderer, defineAccess, defineAdapter, defineComponent,
//                   defineConcept, defineFieldset, defineRegistry, defineRoles
//   /auth-channel   createAuthChannel
//   /delivery       createFragmentResolver, createLinkResolver, createPublicRoutes, createSiteIndexes
//   /delivery/data  createFragmentResolver, createLinkResolver, createSiteIndexes
//   /log            createLogger
//   /media          createMediaResolver
//   /sveltekit      createAdminAction, createAuthGuard, createAuthRoutes, createCairnAdmin,
//                   createContentRoutes, createD1AuditSink, createEditorRoutes, createMediaRoute,
//                   createNavRoutes, createSectionAction
//   /vite           cairnManifest (an extra, since the Vite plugin's name is outside the pattern)
// `mintPreview` is left out: its config type, `PreviewTokenConfig`, is already reached through
// `createContentRoutes`, and its other parameters (the composed runtime and the request event) are
// runtime objects a developer never writes. The walk reads each root's parameter types only, never
// its return type, since a return is a runtime output the developer receives, not an option the
// developer passes.
//
// A member path is keyed by its nearest named declaring type (`AssetConfig.maxUploadBytes`), and an
// inline literal's members by the path from it (`CairnAdapter.editor.nav`), both derived from where
// the member is declared, so a type reached from several roots is listed once. The walk unwraps
// arrays and tuples to their element types, `Record` and index-signature values,
// optionality, unions, intersections, mapped types, and generic constraints to the types they
// carry. It treats a function, a built-in, and any type declared outside the package's own
// declarations as a leaf. It excludes the members of `*Data` types, descriptors, registries,
// `*Props` types, the runtime objects named in EXCLUDED_TYPE, and declarations inside a
// `.svelte.d.ts` file. A member whose type it cannot resolve fails the gate, never drops out.
//
// Interface: `node scripts/checks/check-options.mjs`. Build `dist` first (`npm run check:options`
// does, and so does the docs gate).
import ts from 'typescript';
import { readFileSync, readdirSync } from 'node:fs';
import { join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { moduleExports } from './reference-coverage.mjs';
import { surfaceSubpaths } from './check-surface.mjs';
import { loadFactIndex } from './check-provenance.mjs';

const ROOT = resolve(fileURLToPath(new URL('../..', import.meta.url)));
const MAP_PATH = join(ROOT, 'docs/internal/option-map.json');
const DOCS_DIR = join(ROOT, 'docs');
const OUTLINES_DIR = join(ROOT, 'docs/internal/outlines');
const FACTS_DIR = join(ROOT, 'docs/internal/facts');
const DECL_ROOT = join(ROOT, 'dist');

/** Exported functions whose parameters are option-bearing roots. */
export const ROOT_PATTERN = /^(define|create)[A-Z]/;

/** Root functions outside the pattern: the Vite plugin's options. */
export const ROOT_EXTRAS = ['cairnManifest'];

/**
 * A declaring type the walk excludes: data passed to a page, descriptors, registries, and engine
 * component props by suffix, plus the runtime objects and vendored protocol types a root's
 * parameters reach but a developer never writes (the composed runtime, the site resolver, the
 * resolved asset config, a media manifest row, Standard Schema and its input shape).
 */
export const EXCLUDED_TYPE =
  /(Data|Descriptor|Registry|Props)$|^(CairnRuntime|SiteResolver|ResolvedAssetConfig|MediaEntry|StandardSchemaV1|StandardInput)$/;

const LEAF_FLAGS =
  ts.TypeFlags.Any |
  ts.TypeFlags.Unknown |
  ts.TypeFlags.Never |
  ts.TypeFlags.Void |
  ts.TypeFlags.Undefined |
  ts.TypeFlags.Null |
  ts.TypeFlags.Boolean |
  ts.TypeFlags.BooleanLiteral |
  ts.TypeFlags.Number |
  ts.TypeFlags.NumberLiteral |
  ts.TypeFlags.String |
  ts.TypeFlags.StringLiteral |
  ts.TypeFlags.BigInt |
  ts.TypeFlags.BigIntLiteral |
  ts.TypeFlags.ESSymbol |
  ts.TypeFlags.UniqueESSymbol |
  ts.TypeFlags.Enum |
  ts.TypeFlags.EnumLiteral |
  ts.TypeFlags.NonPrimitive |
  ts.TypeFlags.TemplateLiteral |
  ts.TypeFlags.StringMapping |
  ts.TypeFlags.Index;

/**
 * @typedef {{ key: string, exportName: string, subpath: string, file: string | null }} GeneratedPath
 * @typedef {{ subpath: string, dts: string }} SubpathEntry
 */

/**
 * The text of a declaration or property name, without quotes.
 * @param {ts.Node} node
 * @returns {string}
 */
function nameText(node) {
  const name = /** @type {{ name?: ts.Node }} */ (node).name;
  if (!name) return '';
  if (ts.isIdentifier(name) || ts.isStringLiteral(name) || ts.isNumericLiteral(name)) return name.text;
  return name.getText();
}

/**
 * The text of a parameter's name for a path key. A destructured parameter has no name to read, so it
 * is keyed by its position.
 * @param {ts.ParameterDeclaration} param
 * @returns {string}
 */
function parameterName(param) {
  if (ts.isIdentifier(param.name)) return param.name.text;
  return `arg${/** @type {ts.SignatureDeclaration} */ (param.parent).parameters.indexOf(param)}`;
}

/**
 * The path key of a member declaration: its nearest named declaring type, then the member names
 * between that type and the member, read from where the member is written. `typeName` is that
 * declaring type, or null when the literal sits in an exported function's parameter. Null result when
 * the declaration sits somewhere the key cannot be derived (the caller falls back to the walk's path).
 * @param {ts.Declaration} decl
 * @returns {{ key: string, typeName: string | null } | null}
 */
function keyOfDeclaration(decl) {
  const names = [nameText(decl)];
  /** @type {ts.Node | undefined} */
  let node = decl.parent;
  while (node) {
    if (ts.isInterfaceDeclaration(node) || ts.isClassDeclaration(node) || ts.isTypeAliasDeclaration(node)) {
      const typeName = node.name?.text ?? '';
      return { key: [typeName, ...names].join('.'), typeName };
    }
    if (ts.isPropertySignature(node) || ts.isPropertyDeclaration(node) || ts.isMethodSignature(node)) {
      names.unshift(nameText(node));
    } else if (ts.isParameter(node)) {
      names.unshift(parameterName(node));
      const fn = node.parent;
      if (ts.isFunctionDeclaration(fn) && fn.name) return { key: [fn.name.text, ...names].join('.'), typeName: null };
      return null;
    } else if (ts.isFunctionDeclaration(node)) {
      return { key: [node.name?.text ?? '', ...names].join('.'), typeName: null };
    }
    node = node.parent;
  }
  return null;
}

/**
 * Whether a declaration is one the walk reads: inside the package's own declarations, not in
 * `node_modules`, and not a Svelte component's declaration file.
 * @param {ts.Declaration} decl
 * @param {string} declRoot
 * @returns {boolean}
 */
function isOwnDeclaration(decl, declRoot) {
  const file = resolve(decl.getSourceFile().fileName);
  if (!file.startsWith(declRoot + sep)) return false;
  if (file.includes(`${sep}node_modules${sep}`)) return false;
  return !file.endsWith('.svelte.d.ts');
}

/**
 * Walk one root's parameter types and record every option path they reach.
 * @param {{
 *   checker: ts.TypeChecker,
 *   declRoot: string,
 *   excluded: RegExp,
 *   root: { exportName: string, subpath: string },
 *   paths: Map<string, GeneratedPath>,
 *   failures: Map<string, string>,
 * }} ctx
 * @param {ts.Type} rootType
 * @param {string} rootPath
 */
function walkRoot(ctx, rootType, rootPath) {
  const { checker, declRoot, excluded, root, paths, failures } = ctx;
  /** @type {Set<ts.Type>} */
  const visited = new Set();

  /** @param {string} path @param {string} why */
  const fail = (path, why) => {
    if (!failures.has(path)) {
      failures.set(
        path,
        `${path}: ${why}; reached from ${root.exportName} (subpath ${root.subpath})`,
      );
    }
  };

  /** @param {ts.Type} type @param {string} path */
  function walk(type, path) {
    const flags = type.flags;
    // The checker shares one error type across every unresolved name, so test it before the visited
    // set or only the first unresolvable member in a root would be reported.
    if (flags & ts.TypeFlags.Any && /** @type {{ intrinsicName?: string }} */ (type).intrinsicName === 'error') {
      fail(path, 'the member type cannot be resolved');
      return;
    }
    if (visited.has(type)) return;
    visited.add(type);
    if (flags & LEAF_FLAGS) return;
    if (type.isUnionOrIntersection()) {
      for (const part of type.types) walk(part, path);
      return;
    }
    if (flags & ts.TypeFlags.TypeParameter) {
      const constraint = checker.getBaseConstraintOfType(type);
      if (constraint && constraint !== type) walk(constraint, path);
      return;
    }
    if (flags & (ts.TypeFlags.IndexedAccess | ts.TypeFlags.Conditional | ts.TypeFlags.Substitution)) {
      const constraint = checker.getBaseConstraintOfType(type);
      if (constraint && constraint !== type) walk(constraint, path);
      else fail(path, 'the member type is a generic form the walker cannot resolve');
      return;
    }
    if (flags & ts.TypeFlags.Object) {
      walkObject(type, path);
      return;
    }
    fail(path, 'the member type is a form the walker does not handle');
  }

  /** @param {ts.Type} type @param {string} path */
  function walkObject(type, path) {
    // A tuple's element symbols carry no declaration, so read its element types directly.
    if (checker.isArrayType(type) || checker.isTupleType(type)) {
      for (const arg of checker.getTypeArguments(/** @type {ts.TypeReference} */ (type))) walk(arg, path);
      return;
    }
    for (const prop of checker.getPropertiesOfType(type)) {
      const decl = prop.declarations?.[0];
      /** @type {string} */
      let key;
      /** @type {string | null} */
      let typeName = null;
      /** @type {string | null} */
      let file = null;
      /** @type {ts.Type} */
      let propType;
      if (decl) {
        if (!isOwnDeclaration(decl, declRoot)) continue;
        const derived = keyOfDeclaration(decl);
        key = derived?.key ?? `${path}.${prop.name}`;
        file = relative(declRoot, resolve(decl.getSourceFile().fileName));
        typeName = derived?.typeName ?? null;
        propType = checker.getTypeOfSymbolAtLocation(prop, decl);
      } else {
        key = `${path}.${prop.name}`;
        propType = checker.getTypeOfSymbol(prop);
      }
      if (typeName !== null && excluded.test(typeName)) continue;
      if (!paths.has(key)) paths.set(key, { key, exportName: root.exportName, subpath: root.subpath, file });
      walk(propType, key);
    }
    for (const info of checker.getIndexInfosOfType(type)) walk(info.type, path);
  }

  walk(rootType, rootPath);
}

/**
 * Generate the option-bearing member paths of the given subpaths' declarations. Roots are visited in
 * the order given and, within a subpath, by export name, so a type reached from several roots is
 * attributed to the first in that order.
 * @param {{
 *   subpaths: SubpathEntry[],
 *   declRoot: string,
 *   rootPattern?: RegExp,
 *   extraRoots?: string[],
 *   excluded?: RegExp,
 * }} input
 * @returns {{ paths: GeneratedPath[], failures: string[] }}
 */
export function generateOptionPaths({
  subpaths,
  declRoot,
  rootPattern = ROOT_PATTERN,
  extraRoots = ROOT_EXTRAS,
  excluded = EXCLUDED_TYPE,
}) {
  /** @type {Map<string, GeneratedPath>} */
  const paths = new Map();
  /** @type {Map<string, string>} */
  const failures = new Map();
  const absoluteRoot = resolve(declRoot);
  for (const { subpath, dts } of subpaths) {
    const { checker, symbols } = moduleExports(dts);
    const ordered = [...symbols].sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
    for (const exported of ordered) {
      if (!rootPattern.test(exported.name) && !extraRoots.includes(exported.name)) continue;
      const symbol =
        exported.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(exported) : exported;
      const decl = symbol.declarations?.[0];
      if (!decl) continue;
      const signatures = checker.getSignaturesOfType(
        checker.getTypeOfSymbolAtLocation(symbol, decl),
        ts.SignatureKind.Call,
      );
      for (const signature of signatures) {
        for (const param of signature.parameters) {
          const paramDecl = param.declarations?.[0] ?? decl;
          walkRoot(
            { checker, declRoot: absoluteRoot, excluded, root: { exportName: exported.name, subpath }, paths, failures },
            checker.getTypeOfSymbolAtLocation(param, paramDecl),
            `${exported.name}.${param.name}`,
          );
        }
      }
    }
  }
  return {
    paths: [...paths.values()].sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0)),
    failures: [...failures.values()],
  };
}

/**
 * Read one map row: a fact id, `exclude <reason>`, or `pending <slug>`.
 * @param {string} value
 * @returns {{ kind: 'fact', id: string } | { kind: 'exclude', reason: string } | { kind: 'pending', slug: string } | { kind: 'invalid' }}
 */
export function parseMapRow(value) {
  if (/^f:[0-9a-z]{6}$/.test(value)) return { kind: 'fact', id: value };
  const exclude = /^exclude(?:\s+(.*))?$/s.exec(value);
  if (exclude) return { kind: 'exclude', reason: (exclude[1] ?? '').trim() };
  const pending = /^pending\s+(\S+)$/.exec(value);
  if (pending) return { kind: 'pending', slug: pending[1] };
  return { kind: 'invalid' };
}

/**
 * Compare the generated paths to the committed map and return every defect.
 * @param {{
 *   generated: GeneratedPath[],
 *   map: { pendingCount: number, rows: Record<string, string> },
 *   slugs: Set<string>,
 *   pages?: Set<string>,
 *   facts: Map<string, { tag: string | null }>,
 * }} input
 * @returns {string[]}
 */
export function checkOptionMap({ generated, map, slugs, pages = new Set(), facts }) {
  /** @type {string[]} */
  const failures = [];
  const generatedKeys = new Set(generated.map((entry) => entry.key));
  for (const entry of generated) {
    if (!(entry.key in map.rows)) {
      failures.push(
        `${entry.key} (export ${entry.exportName}, subpath ${entry.subpath}) has no row in the option map. ` +
          `File the fact and map the path to its id, or add an "exclude <reason>" row whose reason the diff-reviewer accepts.`,
      );
    }
  }
  let pending = 0;
  for (const [key, value] of Object.entries(map.rows)) {
    if (!generatedKeys.has(key)) {
      failures.push(`${key}: the map has a row for a path the walker no longer generates; remove the row.`);
      continue;
    }
    const row = parseMapRow(value);
    if (row.kind === 'invalid') {
      failures.push(`${key}: the row "${value}" is not a fact id, "exclude <reason>", or "pending <slug>".`);
    } else if (row.kind === 'fact') {
      const fact = facts.get(row.id);
      if (!fact) {
        failures.push(`${key}: the row names ${row.id}, which is no fact in the container.`);
      } else if (fact.tag !== 'verified') {
        failures.push(
          `${key}: the row names ${row.id}, tagged ${fact.tag ?? 'with no valid tag'}, not verified. ` +
            `Rewrite the row to "pending <slug>" and raise pendingCount first, then retag the fact.`,
        );
      }
    } else if (row.kind === 'exclude') {
      if (row.reason === '') failures.push(`${key}: an "exclude" row needs a reason.`);
    } else {
      pending += 1;
      if (!slugs.has(row.slug) && !pages.has(row.slug)) {
        failures.push(
          `${key}: the pending slug "${row.slug}" names neither a page in a committed outline nor a published page ` +
            `(docs/<arm>/${row.slug}.md). After an arm's outline is deleted, name the published page that owes the row.`,
        );
      }
    }
  }
  if (pending > map.pendingCount) {
    failures.push(
      `the map has ${pending} pending rows, above the committed pendingCount of ${map.pendingCount}. ` +
        `Pending only shrinks: dispose a row to a fact or an exclusion instead of parking a new one.`,
    );
  }
  return failures;
}

/**
 * Every page slug in a committed outline.
 * @param {string} dir
 * @returns {Set<string>}
 */
function outlineSlugs(dir) {
  /** @type {Set<string>} */
  const slugs = new Set();
  for (const name of readdirSync(dir).filter((file) => file.endsWith('.json'))) {
    const outline = JSON.parse(readFileSync(join(dir, name), 'utf8'));
    for (const page of outline.pages ?? []) if (typeof page.slug === 'string') slugs.add(page.slug);
  }
  return slugs;
}

/**
 * Every published page slug: a markdown file directly under a docs arm directory. An arm's
 * `README.md` is an index, never a page, so it is skipped.
 * @param {string} dir
 * @returns {Set<string>}
 */
export function publishedPageSlugs(dir) {
  /** @type {Set<string>} */
  const slugs = new Set();
  for (const arm of readdirSync(dir, { withFileTypes: true })) {
    if (!arm.isDirectory() || arm.name === 'internal' || arm.name === 'superpowers') continue;
    for (const name of readdirSync(join(dir, arm.name)).filter((file) => file.endsWith('.md') && file !== 'README.md')) {
      slugs.add(name.slice(0, -'.md'.length));
    }
  }
  return slugs;
}

function main() {
  const { paths, failures: walkFailures } = generateOptionPaths({
    subpaths: surfaceSubpaths().map((entry) => ({ subpath: entry.subpath, dts: resolve(ROOT, entry.dts) })),
    declRoot: DECL_ROOT,
  });
  const map = JSON.parse(readFileSync(MAP_PATH, 'utf8'));
  const { facts } = loadFactIndex(FACTS_DIR);
  const failures = [
    ...walkFailures,
    ...checkOptionMap({ generated: paths, map, slugs: outlineSlugs(OUTLINES_DIR), pages: publishedPageSlugs(DOCS_DIR), facts }),
  ];
  if (failures.length === 0) {
    console.log(`check:options: OK (${paths.length} option paths)`);
    return;
  }
  for (const failure of failures) console.error(`check:options: ${failure}`);
  console.error(`check:options: ${failures.length} defect(s)`);
  process.exitCode = 1;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
