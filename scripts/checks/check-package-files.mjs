// cairn-cms: the packed-files gate. publint and attw check the export map and the emitted types,
// never an arbitrary file set, so a `files` array that dropped the D1 migrations would ship a
// package a registry consumer cannot provision the auth store from, with nothing to catch it. This
// asserts the tarball npm would publish carries the migrations directory. The core is a pure
// function the test drives; the CLI runs `npm pack --dry-run` and feeds it the real file list.
// It also gates the one exports-map property publint and attw do not check: that a subpath with a
// `browser` stub declares `worker` ahead of it, so a Cloudflare Workers build resolves the real
// module.
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve, dirname, posix as posixPath } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

// One .sql migration under migrations/ is the floor. The auth store cannot be provisioned without
// them, and they reach a registry consumer only through the packed tarball (no repo checkout).
const MIGRATION_RE = /^migrations\/.+\.sql$/;

/**
 * Check a packed file list for at least one migrations/*.sql entry.
 * @param {string[]} filePaths the paths npm would include in the tarball
 * @returns {{ ok: true, count: number } | { ok: false, error: string }}
 */
export function checkPackageFiles(filePaths) {
  const migrations = filePaths.filter((p) => MIGRATION_RE.test(p));
  if (migrations.length === 0) {
    return {
      ok: false,
      error:
        'the packed tarball carries no migrations/*.sql; add "migrations" to package.json "files" so a registry consumer can provision the auth store',
    };
  }
  return { ok: true, count: migrations.length };
}

// The four published arm indexes plus the docs index; the tutorial's index is its single lesson
// page, since docs/tutorial carries no README.md of its own.
const DOCS_INDEX_PATHS = [
  'docs/README.md',
  'docs/reference/README.md',
  'docs/guides/README.md',
  'docs/explanation/README.md',
  'docs/tutorial/build-your-first-cairn-site.md'
];

// The published docs allowlist. A registry consumer's site build reads the published arms only,
// so any other docs/ path (the write-only planning trees, the rolling status file, or a future
// tree nobody has named yet) fails by construction instead of by an ever-growing denylist.
const DOCS_ALLOWED_ARM_PREFIXES = [
  'docs/reference/',
  'docs/guides/',
  'docs/explanation/',
  'docs/tutorial/'
];
const DOCS_INDEX_PATH = 'docs/README.md';

/**
 * Check a packed file list for the published docs arms, present, and every other docs/ path,
 * absent.
 * @param {string[]} filePaths the paths npm would include in the tarball
 * @returns {{ ok: true, count: number } | { ok: false, error: string }}
 */
export function checkDocsPacked(filePaths) {
  const packed = new Set(filePaths);
  const missing = DOCS_INDEX_PATHS.filter((path) => !packed.has(path));
  if (missing.length > 0) {
    return {
      ok: false,
      error: `the packed tarball is missing ${missing.join(', ')}; add the docs arms to package.json "files" so a registry consumer's site build can read the published docs`
    };
  }
  const leaked = filePaths.filter(
    (path) =>
      path.startsWith('docs/') &&
      path !== DOCS_INDEX_PATH &&
      !DOCS_ALLOWED_ARM_PREFIXES.some((prefix) => path.startsWith(prefix))
  );
  if (leaked.length > 0) {
    return {
      ok: false,
      error: `the packed tarball carries docs paths outside the published allowlist: ${leaked.join(', ')}; check package.json "files" for an overly broad docs entry`
    };
  }
  return { ok: true, count: filePaths.filter((path) => path.startsWith('docs/')).length };
}

// The packaged skill's always-loaded core. Its presence in the tarball is the floor: without it,
// `cairn-doctor --fix` would install nothing into a consumer's `.claude/skills/`.
const SKILL_ENTRY_PATH = 'skills/cairn-admin-screens/SKILL.md';

/**
 * Check a packed file list for the packaged skill's SKILL.md.
 * @param {string[]} filePaths the paths npm would include in the tarball
 * @returns {{ ok: true } | { ok: false, error: string }}
 */
export function checkSkillPacked(filePaths) {
  if (!filePaths.includes(SKILL_ENTRY_PATH)) {
    return {
      ok: false,
      error: `the packed tarball is missing ${SKILL_ENTRY_PATH}; add "skills" to package.json "files" so cairn-doctor can install the packaged skill`
    };
  }
  return { ok: true };
}

// The Workers-runtime resolver defect that shipped in 0.94.0-rc.1. Wrangler re-bundles the
// adapter's output with esbuild for workerd, and that pass activates the "browser" condition on
// the SERVER bundle, so a subpath whose "browser" target is a client-only stub ships that stub
// into the Worker and the Worker never starts. A "worker" condition declared ahead of "browser",
// pointing where "default" points, is what wins the resolution back.

/**
 * Check an exports map: every entry declaring "browser" also declares "worker" ahead of it,
 * resolving to something other than the browser stub.
 *
 * @remarks
 * Scope: the top level of each entry in the package's own "exports" map. A "browser" nested inside
 * another condition object, or a second map under "publishConfig", is out of reach and neither
 * shape exists here today.
 * @param {Record<string, Record<string, string> | string>} exportsMap the package.json "exports" map
 * @returns {{ ok: true, count: number } | { ok: false, error: string }}
 */
export function checkWorkerCondition(exportsMap) {
  const issues = [];
  let checked = 0;
  for (const [subpath, entry] of Object.entries(exportsMap)) {
    if (typeof entry !== 'object' || entry === null) continue;

    const conditions = Object.keys(entry);
    if (!conditions.includes('browser')) continue;
    checked++;

    if (!conditions.includes('worker')) {
      issues.push(
        `${subpath} declares "browser" with no "worker" condition; a Workers build resolves "browser" and gets the browser-only stub`
      );
      continue;
    }

    if (conditions.indexOf('worker') > conditions.indexOf('browser')) {
      issues.push(
        `${subpath} declares "worker" after "browser"; conditions resolve in declaration order, so "worker" must come first`
      );
    }

    // The invariant is that a Workers build must not reach the stub, which leaves an entry free to
    // ship a workerd-specific build distinct from its Node "default" later.
    if (typeof entry.worker !== 'string') {
      issues.push(
        `${subpath} declares a "worker" condition that is not a path; this check compares condition targets as strings`
      );
    } else if (entry.worker === entry.browser) {
      issues.push(
        `${subpath} points "worker" at the same file as "browser" (${entry.worker}); a Workers build must resolve the real module, not the browser stub`
      );
    }
  }

  if (issues.length > 0) {
    return { ok: false, error: issues.join('; ') };
  }
  return { ok: true, count: checked };
}

// The anti-leak gate. `vertical-metrics` is the worked example: nothing named it in a registry, and
// it shipped anyway at 66.6 KB of dist, because svelte-package emits everything reachable under
// src/lib whether or not an export subpath names it. A registry index (rules/static/index.ts,
// rules/rendered/index.ts) is the one place a rule module opts into shipping, so a module the walk
// below cannot reach from either index is either an unregistered rule (add it to the registry) or
// engine apparatus that has no business under src/lib at all (move it out).
const RULE_REGISTRIES = {
  static: { indexPath: 'src/lib/audit/rules/static/index.ts', distPrefix: 'dist/audit/rules/static/' },
  rendered: { indexPath: 'src/lib/audit/rules/rendered/index.ts', distPrefix: 'dist/audit/rules/rendered/' },
};

// NodeNext specifiers name the emitted `.js`, never the `.ts` source they resolve to, so the walk
// below rewrites the extension. A bare package specifier (no leading `./` or `../`) is never
// followed: node_modules is not this walk's concern, and a bare specifier could collide with a
// relative path that happens to share a basename.
const IMPORT_SPECIFIER_RE = /from\s+['"](\.\.?\/[^'"]+)['"]/g;

/**
 * The relative import specifiers one TypeScript source names, verbatim (NodeNext `.js` suffix and
 * all). A destructured import spanning several lines still matches, since `from '...'` itself is
 * always on one line.
 * @param {string} source a file's text
 * @returns {string[]}
 */
export function parseRelativeImportSpecifiers(source) {
  return [...source.matchAll(IMPORT_SPECIFIER_RE)].map((match) => match[1]);
}

/**
 * Walk a module graph from one entry file, following relative imports, and return every file
 * reached, the entry included. `readSource` is injected so the traversal is pure over whatever
 * graph it is handed: a synthetic file map in a test, the real filesystem from {@link main}. Cycle-
 * safe (a `seen` set), and silent on a path `readSource` cannot resolve, since a type-only import of
 * an ambient `.d.ts` or a path this walk mis-resolves should not crash the gate.
 * @param {string} entryPath a posix-style path relative to the repo root
 * @param {(path: string) => string | null} readSource a file's text, or null if it has none
 * @returns {Set<string>} every file path reached, in entryPath's own relative form
 */
export function walkModuleGraph(entryPath, readSource) {
  const seen = new Set();
  const stack = [entryPath];
  while (stack.length > 0) {
    const current = stack.pop();
    if (current === undefined || seen.has(current)) continue;
    const source = readSource(current);
    if (source === null) continue;
    seen.add(current);
    const dir = posixPath.dirname(current);
    for (const specifier of parseRelativeImportSpecifiers(source)) {
      const jsPath = posixPath.normalize(posixPath.join(dir, specifier));
      stack.push(jsPath.replace(/\.js$/, '.ts'));
    }
  }
  return seen;
}

/**
 * The basenames of a walked graph's files that sit directly inside `dirPrefix` (no further
 * subdirectory), stripped of their `.ts` extension. This is the set a packed `dist/.../<name>.js`
 * is checked against, since the packed rule directories are flat.
 * @param {Set<string>} seen every path {@link walkModuleGraph} reached
 * @param {string} dirPrefix e.g. `'src/lib/audit/rules/static/'`
 * @returns {Set<string>}
 */
function reachableBasenamesUnder(seen, dirPrefix) {
  const basenames = new Set();
  for (const path of seen) {
    if (!path.startsWith(dirPrefix) || !path.endsWith('.ts')) continue;
    const rest = path.slice(dirPrefix.length, -'.ts'.length);
    if (!rest.includes('/')) basenames.add(rest);
  }
  return basenames;
}

/**
 * Check a packed file list: every module under `dist/audit/rules/static/` or
 * `dist/audit/rules/rendered/` must be reachable from its registry (the basenames
 * {@link reachableBasenamesUnder} computed by walking that registry's index.ts). A registry index
 * and any helper a registered rule imports, transitively, pass by construction; a module nothing in
 * the registry reaches fails.
 * @param {string[]} filePaths the paths npm would include in the tarball
 * @param {Set<string>} reachableStaticBasenames basenames reachable from rules/static/index.ts
 * @param {Set<string>} reachableRenderedBasenames basenames reachable from rules/rendered/index.ts
 * @returns {{ ok: true, count: number } | { ok: false, error: string }}
 */
export function checkRuleReachability(filePaths, reachableStaticBasenames, reachableRenderedBasenames) {
  const staticRe = new RegExp(`^${RULE_REGISTRIES.static.distPrefix}([^/]+)\\.js$`);
  const renderedRe = new RegExp(`^${RULE_REGISTRIES.rendered.distPrefix}([^/]+)\\.js$`);
  const offenders = [];
  let checked = 0;
  for (const path of filePaths) {
    const staticMatch = staticRe.exec(path);
    if (staticMatch) {
      checked += 1;
      if (!reachableStaticBasenames.has(staticMatch[1])) offenders.push(path);
      continue;
    }
    const renderedMatch = renderedRe.exec(path);
    if (renderedMatch) {
      checked += 1;
      if (!reachableRenderedBasenames.has(renderedMatch[1])) offenders.push(path);
    }
  }
  if (offenders.length > 0) {
    return {
      ok: false,
      error:
        `the packed tarball ships ${offenders.join(', ')} from a rule directory with nothing in its ` +
        'registry (rules/static/index.ts or rules/rendered/index.ts) reaching it; register the rule ' +
        'there, or move the module out of src/lib if it is lab apparatus rather than a shipped rule',
    };
  }
  return { ok: true, count: checked };
}

/**
 * {@link checkRuleReachability}'s two reachable-basename sets, computed by walking the real
 * filesystem from each registry's index.ts.
 * @param {string} root the repo root
 * @returns {{ static: Set<string>, rendered: Set<string> }}
 */
function reachableRuleBasenames(root) {
  /** @param {string} relPath */
  const readSource = (relPath) => {
    try {
      return readFileSync(resolve(root, relPath), 'utf8');
    } catch {
      return null;
    }
  };
  /** @type {Record<string, Set<string>>} */
  const result = {};
  for (const [name, { indexPath, distPrefix }] of Object.entries(RULE_REGISTRIES)) {
    const srcPrefix = distPrefix.replace(/^dist\//, 'src/lib/');
    const seen = walkModuleGraph(indexPath, readSource);
    result[name] = reachableBasenamesUnder(seen, srcPrefix);
  }
  return /** @type {{ static: Set<string>, rendered: Set<string> }} */ (result);
}

/**
 * Extract the packed file paths from `npm pack --json` stdout. The `prepare` lifecycle
 * (svelte-package, which prints `src/lib -> dist`) can leak onto stdout ahead of the JSON on some
 * npm versions even under --ignore-scripts, so parse from the first array bracket, not the raw
 * stream.
 * @param {string} stdout the raw stdout of `npm pack --dry-run --json`
 * @returns {string[]} the paths npm would include in the tarball
 */
export function parsePackFilePaths(stdout) {
  const jsonStart = stdout.indexOf('[');
  if (jsonStart === -1) {
    throw new Error(`npm pack --json produced no JSON array; got: ${stdout.slice(0, 200)}`);
  }
  /** @type {{ files?: { path: string }[] }[]} */
  const parsed = JSON.parse(stdout.slice(jsonStart));
  const files = parsed[0]?.files ?? [];
  return files.map((f) => f.path);
}

function packedFilePaths() {
  const out = execFileSync('npm', ['pack', '--dry-run', '--json', '--ignore-scripts'], {
    cwd: ROOT,
    encoding: 'utf8',
  });
  return parsePackFilePaths(out);
}

function main() {
  const files = packedFilePaths();

  const migrationsResult = checkPackageFiles(files);
  if (!migrationsResult.ok) {
    console.error(`check-package-files: ${migrationsResult.error}`);
    process.exit(1);
  }

  const docsResult = checkDocsPacked(files);
  if (!docsResult.ok) {
    console.error(`check-package-files: ${docsResult.error}`);
    process.exit(1);
  }

  const skillResult = checkSkillPacked(files);
  if (!skillResult.ok) {
    console.error(`check-package-files: ${skillResult.error}`);
    process.exit(1);
  }

  const reachable = reachableRuleBasenames(ROOT);
  const reachabilityResult = checkRuleReachability(files, reachable.static, reachable.rendered);
  if (!reachabilityResult.ok) {
    console.error(`check-package-files: ${reachabilityResult.error}`);
    process.exit(1);
  }

  // The only check here that reads the exports map rather than the packed file list.
  const packageJson = JSON.parse(readFileSync(resolve(ROOT, 'package.json'), 'utf8'));
  const workerResult = checkWorkerCondition(packageJson.exports);
  if (!workerResult.ok) {
    console.error(`check-package-files: ${workerResult.error}`);
    process.exit(1);
  }

  console.log(
    `check-package-files: OK (${migrationsResult.count} migration file(s), ${docsResult.count} docs file(s), the packaged skill packed, ${reachabilityResult.count} rule module(s) registry-reachable, ${workerResult.count} browser-conditioned export(s) worker-gated)`
  );
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
