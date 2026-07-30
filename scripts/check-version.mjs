// cairn-cms: the versioning gate. It pins package.json's version to the top CHANGELOG entry and
// enforces the size rule from README's "Status": a minor bump (0.X.0) is reserved for a new
// subsystem or public surface, refining or extending an existing surface is a patch even when it
// adds a capability or an optional field. To keep a minor (or major) a deliberate, documented act,
// its CHANGELOG entry must carry a `<!-- release-size: minor -->` or `<!-- release-size: major -->`
// marker; a patch carries none. The core is a pure function so the test calls it directly; the CLI
// reads the files and prints the terse pass/fail line.
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const RULE = 'see README "Status": a minor/major must introduce a new subsystem or public surface and carry a release-size marker; refining an existing surface is a patch';

/**
 * Slice the `## Unreleased` window out of a CHANGELOG, from its heading to the next `## ` heading
 * (of any kind) or the end of the text. Returns null when there is no `## Unreleased` heading, the
 * ordinary case once a window has been cut and renamed to a version.
 * @param {string} changelogText the full CHANGELOG.md text
 * @returns {string | null}
 */
function unreleasedWindow(changelogText) {
  const heading = changelogText.match(/^## Unreleased\b.*$/m);
  if (!heading) return null;
  const afterHeading = (heading.index ?? 0) + heading[0].length;
  const nextHeading = changelogText.slice(afterHeading).match(/^## .+$/m);
  const end = nextHeading ? afterHeading + (nextHeading.index ?? 0) : changelogText.length;
  return changelogText.slice(afterHeading, end);
}

/**
 * Validate the `## Unreleased` window, if one exists. It may carry at most one release-size
 * marker; a window with none is presumed patch-worthy, the same default a real patch entry
 * carries. When exactly one marker is present, simulate the cut it would become (bump the last
 * published version by the marker's declared size) and run this same function's size rule against
 * that simulated heading, so a marker malformed or contradicted by its own body fails now, on the
 * pass that wrote it, rather than only once the heading is renamed at a real cut.
 * @param {string} changelogText the full CHANGELOG.md text
 * @param {{ version: string, index: number }[]} publishedHeadings the numbered headings, most recent first
 * @returns {{ ok: true } | { ok: false, error: string }}
 */
function checkUnreleasedWindow(changelogText, publishedHeadings) {
  const windowBody = unreleasedWindow(changelogText);
  if (windowBody === null) return { ok: true };

  const markers = [...windowBody.matchAll(/<!-- release-size: (\w+) -->/g)];
  if (markers.length > 1) {
    return {
      ok: false,
      error: `the "## Unreleased" window carries ${markers.length} release-size markers; at most one is allowed`
    };
  }

  const last = publishedHeadings[0];
  if (!last) return { ok: true };

  const [lMajor, lMinor, lPatch] = last.version.split('.').map(Number);
  const declaredSize = markers[0]?.[1];
  const simulatedVersion =
    declaredSize === 'major'
      ? `${lMajor + 1}.0.0`
      : declaredSize === 'minor'
        ? `${lMajor}.${lMinor + 1}.0`
        : `${lMajor}.${lMinor}.${lPatch + 1}`;

  const simulatedChangelog = changelogText.replace(/^## Unreleased\b.*$/m, `## ${simulatedVersion}`);
  const simulatedResult = checkVersion(simulatedVersion, simulatedChangelog);
  if (!simulatedResult.ok) {
    return {
      ok: false,
      error: `the "## Unreleased" window fails the size rule when simulated as a cut to ${simulatedVersion}: ${simulatedResult.error}`
    };
  }
  return { ok: true };
}

/**
 * Compare the package version against the CHANGELOG and enforce the size rule.
 * @param {string} pkgVersion the version from package.json
 * @param {string} changelogText the full CHANGELOG.md text
 * @returns {{ ok: true, bump: 'initial' | 'major' | 'minor' | 'patch' } | { ok: false, error: string }}
 */
export function checkVersion(pkgVersion, changelogText) {
  // The version headings in document order: C is the top (most recent), P the next, if any.
  const headings = [...changelogText.matchAll(/^## (\d+\.\d+\.\d+)\b/gm)].map((m) => ({
    version: m[1],
    index: m.index ?? 0
  }));
  if (headings.length === 0) {
    return { ok: false, error: 'CHANGELOG.md has no version heading matching "## X.Y.Z"' };
  }
  // The Unreleased window sits above every published heading, so its validity is independent of
  // whether pkgVersion matches the top one; check it before anything else can short-circuit.
  const unreleasedCheck = checkUnreleasedWindow(changelogText, headings);
  if (!unreleasedCheck.ok) return unreleasedCheck;

  const C = headings[0];
  if (pkgVersion !== C.version) {
    return {
      ok: false,
      error: `package.json version ${pkgVersion} does not match the top CHANGELOG entry ${C.version}; align them`
    };
  }
  if (headings.length === 1) {
    return { ok: true, bump: 'initial' };
  }
  const P = headings[1];

  const [cMajor, cMinor, cPatch] = C.version.split('.').map(Number);
  const [pMajor, pMinor, pPatch] = P.version.split('.').map(Number);
  /** @type {'major' | 'minor' | 'patch' | 'none'} */
  let bump;
  if (cMajor !== pMajor) bump = 'major';
  else if (cMinor !== pMinor) bump = 'minor';
  else if (cPatch !== pPatch) bump = 'patch';
  else bump = 'none';

  if (bump === 'none') {
    return {
      ok: false,
      error: `the top CHANGELOG entry ${C.version} does not advance the version over ${P.version}; bump the version`
    };
  }

  // The top entry's body runs from its heading to the previous heading.
  const body = changelogText.slice(C.index, P.index);
  const hasMinorMarker = body.includes('<!-- release-size: minor -->');
  const hasMajorMarker = body.includes('<!-- release-size: major -->');

  if (bump === 'patch') {
    if (hasMinorMarker || hasMajorMarker) {
      return {
        ok: false,
        error: `the ${C.version} entry is a patch over ${P.version} but carries a release-size marker; either resize the release or drop the marker (${RULE})`
      };
    }
    return { ok: true, bump };
  }

  if (bump === 'minor' && !hasMinorMarker) {
    return {
      ok: false,
      error: `the ${C.version} entry is a minor bump over ${P.version} but is missing the "<!-- release-size: minor -->" marker; either make it a patch, or add the marker because it introduces a new subsystem/surface (${RULE})`
    };
  }
  if (bump === 'major' && !hasMajorMarker) {
    return {
      ok: false,
      error: `the ${C.version} entry is a major bump over ${P.version} but is missing the "<!-- release-size: major -->" marker; either make it a patch, or add the marker because it introduces a breaking new surface (${RULE})`
    };
  }

  return { ok: true, bump };
}

function main() {
  const pkg = JSON.parse(readFileSync(resolve(ROOT, 'package.json'), 'utf8'));
  const changelog = readFileSync(resolve(ROOT, 'CHANGELOG.md'), 'utf8');
  const result = checkVersion(pkg.version, changelog);
  if (!result.ok) {
    console.error(`check-version: ${result.error}`);
    process.exit(1);
  }
  console.log(`check-version: OK (${result.bump})`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
