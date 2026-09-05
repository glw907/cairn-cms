// The dependency-floors check. The engine's peer ranges have teeth only when something reads
// the consumer's lockfile, where a transitively pinned svelte can sit below the floor while
// package.json looks fine (a consumer retrofit shipped svelte 5.56.0 that way). The check compares
// the resolved svelte and @sveltejs/kit versions against the peer ranges the installed
// @glw907/cairn-cms declares, read at runtime so the floors live in one place. It reads
// package-lock.json, pnpm-lock.yaml, and yarn.lock, in that order, so an npm, pnpm, or yarn
// consumer all get a real verdict rather than a silent skip on the one check that would catch a
// miscompiling framework version.
import { createRequire } from 'node:module';
import { parse as parseYaml } from 'yaml';
import { fail, pass, skip, unchecked } from './types.js';
import type { CheckResult, DoctorCheck, DoctorContext } from './types.js';

interface Version {
  major: number;
  minor: number;
  patch: number;
}

// Plain x.y.z only. A prerelease or build tag returns null, so the check skips rather than
// guessing how a tagged build orders against the floor.
function parseVersion(text: string): Version | null {
  const m = text.match(/^(\d+)\.(\d+)\.(\d+)$/);
  if (!m) return null;
  return { major: Number(m[1]), minor: Number(m[2]), patch: Number(m[3]) };
}

// The engine's peers are simple caret ranges (^x.y.z, or ^x.y like the kit floor ^2.70), so
// this handles the caret form only; anything else returns null and the check skips for that
// dependency instead of approximating a full semver implementation.
function caretFloor(range: string): Version | null {
  const m = range.match(/^\^(\d+)(?:\.(\d+))?(?:\.(\d+))?$/);
  if (!m) return null;
  return { major: Number(m[1]), minor: Number(m[2] ?? 0), patch: Number(m[3] ?? 0) };
}

function compareVersions(a: Version, b: Version): number {
  return a.major - b.major || a.minor - b.minor || a.patch - b.patch;
}

// A v2/v3 lockfile's packages map; v1 has none and the check skips.
interface LockPackages {
  packages?: Record<string, { version?: unknown } | undefined>;
}

function lockedVersion(lock: LockPackages, dep: string): string | undefined {
  const version = lock.packages?.[`node_modules/${dep}`]?.version;
  return typeof version === 'string' ? version : undefined;
}

/**
 * Judge a dependency's resolved versions against the engine's peer ranges, shared by every
 * lockfile format the check reads. `resolve` looks up one dependency's version in whichever
 * lockfile is in play; `missingEntry` names the per-dependency message for a lockfile that
 * carries no entry for it, since each format's message names its own file. A below-range version
 * fails; an entry the format cannot resolve skips, since the answer genuinely is not there.
 */
function judgePeers(
  resolve: (dep: string) => string | undefined,
  peers: Record<string, string>,
  missingEntry: (dep: string) => string
): CheckResult {
  const failures: string[] = [];
  const skips: string[] = [];
  const passes: string[] = [];
  for (const [dep, range] of Object.entries(peers)) {
    const floor = caretFloor(range);
    if (floor === null) {
      skips.push(`${dep}: the engine range ${range} is not a simple caret range`);
      continue;
    }
    const resolved = resolve(dep);
    if (resolved === undefined) {
      skips.push(missingEntry(dep));
      continue;
    }
    const version = parseVersion(resolved);
    if (version === null) {
      skips.push(`${dep}: resolved ${resolved} is not a plain x.y.z version`);
      continue;
    }
    // The caret bounds both ends: at or above the floor, same major. The engine's peers
    // start at major 1 or higher, so the 0.x caret nuance never applies here.
    if (compareVersions(version, floor) < 0) {
      failures.push(`${dep} resolves to ${resolved}, below the engine floor ${range}`);
    } else if (version.major !== floor.major) {
      failures.push(`${dep} resolves to ${resolved}, outside the engine peer range ${range}`);
    } else {
      passes.push(`${dep} ${resolved}`);
    }
  }
  if (failures.length > 0) return fail(failures.join('; '));
  if (skips.length > 0) return skip(skips.join('; '));
  return pass(`${passes.join(' and ')} satisfy the engine peer ranges`);
}

/**
 * Judge a package-lock.json's resolved framework versions against the engine's peer ranges. Pure,
 * so the tests drive it table-style; the check object wires in the real lockfile and the real
 * peers. `lockText === null` is a caller stating no package-lock.json was read (the check itself
 * tries pnpm-lock.yaml and yarn.lock before ever reaching that case).
 */
export function dependencyFloorsResult(
  lockText: string | null,
  peers: Record<string, string>
): CheckResult {
  if (lockText === null) {
    return skip('no package-lock.json found (a pnpm or yarn lockfile is not read)');
  }
  let lock: LockPackages;
  try {
    lock = JSON.parse(lockText) as LockPackages;
  } catch {
    // Like the wrangler reader: never echo file content into the report.
    return fail('package-lock.json did not parse');
  }
  if (lock.packages === undefined) {
    return skip('package-lock.json carries no packages map (lockfile v1; reinstall with a current npm)');
  }
  return judgePeers(
    (dep) => lockedVersion(lock, dep),
    peers,
    (dep) => `${dep}: no node_modules/${dep} entry in package-lock.json`
  );
}

/** One dependency entry as either pnpm's legacy bare-string version or its `{ version }` object. */
type PnpmDepEntry = string | { version?: unknown } | undefined;

function pnpmDepVersion(entry: PnpmDepEntry): string | undefined {
  let raw: string | undefined;
  if (typeof entry === 'string') {
    raw = entry;
  } else if (typeof entry?.version === 'string') {
    raw = entry.version;
  }
  // Both shapes can carry a peer-dependency suffix in parentheses, e.g. "5.56.10(vite@6.0.0)";
  // the plain semver is everything before it.
  return raw?.split('(')[0];
}

interface PnpmLock {
  importers?: Record<string, { dependencies?: Record<string, PnpmDepEntry>; devDependencies?: Record<string, PnpmDepEntry> }>;
  dependencies?: Record<string, PnpmDepEntry>;
  devDependencies?: Record<string, PnpmDepEntry>;
}

function pnpmResolve(lock: PnpmLock, dep: string): string | undefined {
  const root = lock.importers?.['.'];
  return (
    pnpmDepVersion(root?.dependencies?.[dep]) ??
    pnpmDepVersion(root?.devDependencies?.[dep]) ??
    pnpmDepVersion(lock.dependencies?.[dep]) ??
    pnpmDepVersion(lock.devDependencies?.[dep])
  );
}

/**
 * Read a dependency's resolved version out of pnpm-lock.yaml text, or undefined when the file
 * carries no entry for it. Checks the root importer first (lockfileVersion 9's
 * `importers['.'].{dependencies,devDependencies}[dep].version`), falling back to the legacy
 * top-level `dependencies`/`devDependencies` maps (lockfileVersion 5 and 6, where the value is the
 * bare version string), so both current and older pnpm lockfiles resolve.
 */
export function pnpmLockedVersion(lockText: string, dep: string): string | undefined {
  return pnpmResolve(parseYaml(lockText) as PnpmLock, dep);
}

/**
 * Judge a pnpm-lock.yaml's resolved framework versions against the engine's peer ranges, the
 * pnpm sibling of {@link dependencyFloorsResult}.
 */
export function pnpmDependencyFloorsResult(lockText: string, peers: Record<string, string>): CheckResult {
  let lock: PnpmLock;
  try {
    lock = parseYaml(lockText) as PnpmLock;
  } catch {
    return fail('pnpm-lock.yaml did not parse');
  }
  return judgePeers(
    (dep) => pnpmResolve(lock, dep),
    peers,
    (dep) => `${dep}: no entry for it in pnpm-lock.yaml`
  );
}

/**
 * Read a dependency's resolved version out of yarn.lock text, classic (v1) or Berry. A classic
 * block opens with one or more comma-separated specifiers (`"dep@range"`, ...) ending the header
 * line in `:`, and carries an indented `version "x.y.z"` line; Berry uses a `dep@npm:range:`
 * header and an indented `version: x.y.z` line. This is a heuristic text read, the same stance
 * every other doctor lockfile and config reader takes, rather than a full grammar: it returns
 * undefined when no block's specifier list names `dep`.
 */
export function yarnLockedVersion(lockText: string, dep: string): string | undefined {
  const lines = lockText.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.trim() === '' || line.startsWith('#') || /^\s/.test(line)) continue;
    const header = line.trimEnd();
    if (!header.endsWith(':')) continue;
    const specifiers = header.slice(0, -1).split(',').map((s) => s.trim().replace(/^"|"$/g, ''));
    const namesThisDep = specifiers.some((spec) => {
      const at = spec.lastIndexOf('@');
      const name = at > 0 ? spec.slice(0, at) : spec;
      return name === dep;
    });
    if (!namesThisDep) continue;
    for (let j = i + 1; j < lines.length && /^\s/.test(lines[j]); j++) {
      const m = /^\s+version:?\s+"?([^"\s]+)"?/.exec(lines[j]);
      if (m) return m[1];
    }
  }
  return undefined;
}

/**
 * Judge a yarn.lock's resolved framework versions against the engine's peer ranges, the yarn
 * sibling of {@link dependencyFloorsResult}. yarn.lock is not JSON or YAML, so there is no parse
 * failure branch; a heuristic miss just resolves nothing for that dependency.
 */
export function yarnDependencyFloorsResult(lockText: string, peers: Record<string, string>): CheckResult {
  return judgePeers(
    (dep) => yarnLockedVersion(lockText, dep),
    peers,
    (dep) => `${dep}: no entry for it in yarn.lock`
  );
}

/**
 * The engine's own declared peer ranges, read from the installed package.json at runtime so the
 * floors are declared exactly once. The self-reference resolves through the consumer's
 * node_modules in a real install and through the repo root during development. Peers marked
 * optional in `peerDependenciesMeta` are left out: a site that never uses the feature behind one
 * legitimately does not install it, and an absent dependency reads as a skip here, which would
 * mask the framework verdict this check exists to give.
 */
export function readEnginePeers(): Record<string, string> {
  const require = createRequire(import.meta.url);
  const pkg = require('@glw907/cairn-cms/package.json') as {
    peerDependencies?: Record<string, string>;
    peerDependenciesMeta?: Record<string, { optional?: boolean } | undefined>;
  };
  const meta = pkg.peerDependenciesMeta ?? {};
  return Object.fromEntries(
    Object.entries(pkg.peerDependencies ?? {}).filter(([dep]) => meta[dep]?.optional !== true)
  );
}

export const configDependencyFloors: DoctorCheck = {
  id: 'config.dependency-floors',
  conditionId: 'config.dependency-floors-unmet',
  title: 'Dependency floors',
  async run(ctx: DoctorContext): Promise<CheckResult> {
    const peers = readEnginePeers();
    // In npm/pnpm/yarn order, since that is the order the three package managers were added in;
    // the first recognized lockfile that exists is the one judged. Only when none of the three
    // exists does the check have nothing to look at at all.
    const npmLock = await ctx.readFile('package-lock.json');
    if (npmLock !== null) return dependencyFloorsResult(npmLock, peers);
    const pnpmLock = await ctx.readFile('pnpm-lock.yaml');
    if (pnpmLock !== null) return pnpmDependencyFloorsResult(pnpmLock, peers);
    const yarnLock = await ctx.readFile('yarn.lock');
    if (yarnLock !== null) return yarnDependencyFloorsResult(yarnLock, peers);
    return unchecked('none of package-lock.json, pnpm-lock.yaml, or yarn.lock was found');
  },
};
