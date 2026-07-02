// The dependency-floors check. The engine's peer ranges have teeth only when something reads
// the consumer's lockfile, where a transitively pinned svelte can sit below the floor while
// package.json looks fine (the ecxc retrofit shipped svelte 5.56.0 that way). The check compares
// the resolved svelte and @sveltejs/kit versions in package-lock.json against the peer ranges
// the installed @glw907/cairn-cms declares, read at runtime so the floors live in one place.
import { createRequire } from 'node:module';
import { fail, pass, skip } from './types.js';
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

// The engine's peers are simple caret ranges (^x.y.z, or ^x.y like the kit floor ^2.12), so
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
 * Judge a lockfile's resolved framework versions against the engine's peer ranges. Pure, so the
 * tests drive it table-style; the check object wires in the real lockfile and the real peers.
 * A below-range version fails; a lockfile or entry the check cannot read skips, since a pnpm or
 * yarn consumer carries no package-lock.json at all.
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
  const failures: string[] = [];
  const skips: string[] = [];
  const passes: string[] = [];
  for (const [dep, range] of Object.entries(peers)) {
    const floor = caretFloor(range);
    if (floor === null) {
      skips.push(`${dep}: the engine range ${range} is not a simple caret range`);
      continue;
    }
    const resolved = lockedVersion(lock, dep);
    if (resolved === undefined) {
      skips.push(`${dep}: no node_modules/${dep} entry in package-lock.json`);
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
 * The engine's own declared peer ranges, read from the installed package.json at runtime so the
 * floors are declared exactly once. The self-reference resolves through the consumer's
 * node_modules in a real install and through the repo root during development.
 */
export function readEnginePeers(): Record<string, string> {
  const require = createRequire(import.meta.url);
  const pkg = require('@glw907/cairn-cms/package.json') as {
    peerDependencies?: Record<string, string>;
  };
  return pkg.peerDependencies ?? {};
}

export const configDependencyFloors: DoctorCheck = {
  id: 'config.dependency-floors',
  conditionId: 'config.dependency-floors-unmet',
  title: 'Dependency floors',
  async run(ctx: DoctorContext): Promise<CheckResult> {
    return dependencyFloorsResult(await ctx.readFile('package-lock.json'), readEnginePeers());
  },
};
