// cairn-cms: the option-documentation gate. Every public option member a developer can pass carries
// a doc comment on its declaration, or a reasoned entry in EXCLUDED_PATHS below. The walker
// regenerates the member paths from the built `dist` declarations through the TypeScript compiler
// API, so an option added inside a public type can never ship without the comment that documents it.
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
// carry. It treats a function, a built-in, and any type declared outside the package's
// declarations as a leaf. It excludes the members of `*Data` types, descriptors, registries,
// `*Props` types, the runtime objects named in EXCLUDED_TYPE, and declarations inside a
// `.svelte.d.ts` file. A member whose type it cannot resolve fails the gate, never drops out.
//
// Interface: `node scripts/checks/check-options.mjs`. Build `dist` first (`npm run check:options`
// does, and so does the docs gate).
import ts from 'typescript';
import { join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { moduleExports } from './dts-exports.mjs';
import { surfaceSubpaths } from './check-surface.mjs';

const ROOT = resolve(fileURLToPath(new URL('../..', import.meta.url)));
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
 * Code-unit order, never locale order, so the walk's attribution and its output stay stable on
 * every machine.
 * @param {string} a
 * @param {string} b
 * @returns {number}
 */
function compareCodeUnits(a, b) {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}

/**
 * @typedef {{ key: string, exportName: string, subpath: string, file: string | null, documented: boolean }} GeneratedPath
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
 * Whether a declaration carries a doc comment with prose in it. A comment holding only tags (a bare
 * `@deprecated`, say) documents nothing a developer can act on.
 * @param {ts.Declaration} decl
 * @returns {boolean}
 */
function hasDocComment(decl) {
  return ts.getJSDocCommentsAndTags(decl).some((doc) => {
    if (!ts.isJSDoc(doc)) return false;
    const text = typeof doc.comment === 'string' ? doc.comment : ts.getTextOfJSDocComment(doc.comment);
    return Boolean(text?.trim());
  });
}

/**
 * Whether a declaration is one the walk reads: inside the package's declarations, not in
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
  function fail(path, why) {
    if (failures.has(path)) return;
    failures.set(path, `${path}: ${why}; reached from ${root.exportName} (subpath ${root.subpath})`);
  }

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
      let documented = false;
      if (decl) {
        if (!isOwnDeclaration(decl, declRoot)) continue;
        const derived = keyOfDeclaration(decl);
        key = derived?.key ?? `${path}.${prop.name}`;
        file = relative(declRoot, resolve(decl.getSourceFile().fileName));
        typeName = derived?.typeName ?? null;
        propType = checker.getTypeOfSymbolAtLocation(prop, decl);
        documented = hasDocComment(decl);
      } else {
        key = `${path}.${prop.name}`;
        propType = checker.getTypeOfSymbol(prop);
      }
      if (typeName !== null && excluded.test(typeName)) continue;
      if (!paths.has(key)) paths.set(key, { key, exportName: root.exportName, subpath: root.subpath, file, documented });
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
    const ordered = [...symbols].sort((a, b) => compareCodeUnits(a.name, b.name));
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
    paths: [...paths.values()].sort((a, b) => compareCodeUnits(a.key, b.key)),
    failures: [...failures.values()],
  };
}

const BUILDER_TAG = 'the fields.* builder sets this discriminant tag; a developer never writes it';

/**
 * An option path the walk reaches that needs no doc comment, each with the reason a developer never
 * sets it. An entry is kept only while its member has no doc comment of its own.
 * @type {Record<string, string>}
 */
export const EXCLUDED_PATHS = {
  'ArrayField.type': BUILDER_TAG,
  'BooleanField.type': BUILDER_TAG,
  'DateField.type': BUILDER_TAG,
  'DatetimeField.type': BUILDER_TAG,
  'EmailField.type': BUILDER_TAG,
  'IconField.type': BUILDER_TAG,
  'ImageField.type': BUILDER_TAG,
  'MultiselectField.type': BUILDER_TAG,
  'NumberField.type': BUILDER_TAG,
  'ObjectField.type': BUILDER_TAG,
  'ReferenceField.type': BUILDER_TAG,
  'SelectField.type': BUILDER_TAG,
  'TextField.type': BUILDER_TAG,
  'TextareaField.type': BUILDER_TAG,
  'UrlField.type': BUILDER_TAG,
  'SlotDef.help':
    'declared on SlotDef but read by no engine surface: the insert form renders no slot help, so documenting it would promise a no-op',
};

/**
 * Check every generated path for a doc comment, honoring the exclusions, and return every defect.
 * @param {{ generated: GeneratedPath[], exclusions?: Record<string, string> }} input
 * @returns {string[]}
 */
export function checkOptionDocs({ generated, exclusions = EXCLUDED_PATHS }) {
  /** @type {string[]} */
  const failures = [];
  const generatedKeys = new Set(generated.map((entry) => entry.key));
  for (const entry of generated) {
    if (entry.documented || entry.key in exclusions) continue;
    failures.push(
      `${entry.key} (export ${entry.exportName}, subpath ${entry.subpath}${entry.file ? `, ${entry.file}` : ''}) has no doc comment. ` +
        'Document the member where it is declared, or add an EXCLUDED_PATHS entry whose reason says why a developer never sets it.',
    );
  }
  for (const [key, reason] of Object.entries(exclusions)) {
    if (!generatedKeys.has(key)) failures.push(`${key}: an exclusion for a path the walker no longer generates; remove it.`);
    else if (!reason.trim()) failures.push(`${key}: an exclusion needs a reason.`);
  }
  return failures;
}

function main() {
  const { paths, failures: walkFailures } = generateOptionPaths({
    subpaths: surfaceSubpaths().map((entry) => ({ subpath: entry.subpath, dts: resolve(ROOT, entry.dts) })),
    declRoot: DECL_ROOT,
  });
  const failures = [...walkFailures, ...checkOptionDocs({ generated: paths })];
  // A floor, so a walk that reaches no roots cannot print OK over nothing (263 paths at the time of writing).
  if (paths.length < 100) failures.push(`only ${paths.length} option paths were walked; the roots found no declarations`);
  if (failures.length === 0) {
    console.log(`check:options: OK (${paths.length} option paths)`);
    return;
  }
  for (const failure of failures) console.error(`check:options: ${failure}`);
  console.error(`check:options: ${failures.length} defect(s)`);
  process.exitCode = 1;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
