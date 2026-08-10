// Bake the Waymark template (examples/showcase, via the repo-root emitter) into this package
// at pack time, so a tarball install carries a ready-to-scaffold tree rather than a `file:`
// reference into the monorepo. Resolving the engine and dev-backend dependency specs from the
// repo's own package.json versions keeps the baked template honest: it fails loud rather than
// emit a devDependency spec no registry can install, which is exactly the unpublished state of
// @glw907/cairn-cms-dev today.
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { emitTemplate } from '../../../scripts/build/emit-template.mjs';

const scriptsDir = path.dirname(fileURLToPath(import.meta.url));
const packageDir = path.resolve(scriptsDir, '..');
const repoRoot = path.resolve(packageDir, '../..');

// The showcase carries a test-harness (Playwright) and a design-lab tool that a scaffolded site
// never needs; the emitted package.json still lists their scripts and devDependencies because
// the path-exclusion manifest can only drop files, never lines inside a kept package.json. These
// are the exact names the bake removes; keeping them in one place lets the rot gate assert against
// the same list it enforces.
export const PRUNED_SCRIPTS = ['pretest:e2e', 'test:e2e', 'design:probe'];
export const PRUNED_DEV_DEPENDENCIES = ['@playwright/test', '@axe-core/playwright'];

const SITE_README = `# Your cairn site

This site runs on [cairn-cms](https://github.com/glw907/cairn-cms), a markdown CMS for
SvelteKit and Cloudflare.

## Run it locally

Install the dependencies:

\`\`\`
npm install
\`\`\`

Start the dev server:

\`\`\`
npm run dev
\`\`\`

Open the printed URL in your browser. The admin interface lives at \`/admin\` and runs
against a local dev backend, so you can sign in and edit content without touching your
live site.

## Build it

\`\`\`
npm run build
\`\`\`

This produces the deployable Worker output.
`;

/**
 * Remove the showcase-only scripts and devDependencies from an emitted package.json object,
 * mutating it in place. Throws naming any expected key that is already missing, so a future
 * rename or removal in the showcase's own package.json surfaces here instead of silently
 * leaving stale references (or none at all) in the pruned output.
 * @param {{ scripts?: Record<string, string>, devDependencies?: Record<string, string> }} pkg
 *  the parsed, emitted package.json
 * @returns {void}
 */
export function pruneShowcaseOnlyPackageFields(pkg) {
  for (const script of PRUNED_SCRIPTS) {
    if (!pkg.scripts || !(script in pkg.scripts)) {
      throw new Error(`bake: expected showcase script "${script}" to prune, but it is missing`);
    }
    delete pkg.scripts[script];
  }
  for (const dep of PRUNED_DEV_DEPENDENCIES) {
    if (!pkg.devDependencies || !(dep in pkg.devDependencies)) {
      throw new Error(`bake: expected showcase devDependency "${dep}" to prune, but it is missing`);
    }
    delete pkg.devDependencies[dep];
  }
}

const ENGINE_PACKAGE_JSON = path.join(repoRoot, 'package.json');
const DEV_PACKAGE_JSON = path.join(repoRoot, 'packages', 'cairn-cms-dev', 'package.json');

/**
 * Resolve a dependency spec from a package's own version, so the baked template tracks what the
 * monorepo currently holds rather than a number written down a second time here.
 * @param {string} packageJsonPath absolute path to the package.json to read
 * @returns {Promise<string>} a caret spec, `^<version>`
 */
async function caretSpecFrom(packageJsonPath) {
  const pkg = JSON.parse(await readFile(packageJsonPath, 'utf8'));
  return `^${pkg.version}`;
}

/**
 * Validate a resolved-or-supplied dependency spec is something a registry install can actually
 * use. A `file:` path never survives packing (it points at the monorepo layout), and a spec
 * built from a `0.0.0` version names a package nothing has published yet.
 * @param {string} packageName the dependency's name, named in a thrown message
 * @param {string} spec the spec to check
 * @returns {void}
 */
export function assertInstallableSpec(packageName, spec) {
  if (spec.startsWith('file:')) {
    throw new Error(
      `bake: ${packageName} resolves to ${spec}, a workspace-relative path no registry can install. ` +
        `Pass an explicit spec for ${packageName} before packing create-cairn-site.`,
    );
  }
  // Compare the parsed version, never the spec as a substring: `^10.0.0` and `^20.0.0` both
  // contain the literal "0.0.0" and would fail a substring test even though both are perfectly
  // installable.
  const version = spec.replace(/^[\^~>=<\s]+/, '');
  if (/^0\.0\.0(?:$|[-+])/.test(version)) {
    throw new Error(
      `bake: ${packageName} resolves to ${spec}, which no registry can install. ` +
        `Publish the dev backend (or pass devSpec) before packing create-cairn-site.`,
    );
  }
}

/**
 * Bake the Waymark template into `to`, ready for the packed tarball. `engineSpec` and `devSpec`
 * default to caret specs built from the repo's own package versions; either can be overridden,
 * for example by CI once the dev backend is published. Every resolved-or-supplied spec is
 * validated before the emit runs, so an unpublished dependency fails the bake rather than ship
 * a template a consumer cannot install.
 * @param {{ to: string, engineSpec?: string, devSpec?: string }} opts `to` is the emit target;
 *  `engineSpec`/`devSpec` override the resolved defaults
 * @returns {Promise<string>} the emitted tree's root (`opts.to`)
 */
export async function bake({ to, engineSpec, devSpec }) {
  if (!to) throw new Error('bake: "to" is required');
  const resolvedEngineSpec = engineSpec ?? (await caretSpecFrom(ENGINE_PACKAGE_JSON));
  const resolvedDevSpec = devSpec ?? (await caretSpecFrom(DEV_PACKAGE_JSON));
  assertInstallableSpec('@glw907/cairn-cms', resolvedEngineSpec);
  assertInstallableSpec('@glw907/cairn-cms-dev', resolvedDevSpec);
  const emitted = await emitTemplate({
    from: path.join(repoRoot, 'examples', 'showcase'),
    to,
    engineSpec: resolvedEngineSpec,
    devSpec: resolvedDevSpec,
  });
  const packageJsonPath = path.join(emitted, 'package.json');
  const pkg = JSON.parse(await readFile(packageJsonPath, 'utf8'));
  pruneShowcaseOnlyPackageFields(pkg);
  await writeFile(packageJsonPath, JSON.stringify(pkg, null, 2) + '\n');
  await writeFile(path.join(emitted, 'README.md'), SITE_README);
  return emitted;
}

// CLI: node scripts/bake-template.mjs --to <dir> [--engine-spec <spec>] [--dev-spec <spec>]
if (import.meta.url === `file://${process.argv[1]}`) {
  const USAGE = 'usage: bake-template.mjs --to <dir> [--engine-spec <spec>] [--dev-spec <spec>]';
  let values;
  try {
    ({ values } = parseArgs({
      args: process.argv.slice(2),
      options: {
        to: { type: 'string' },
        'engine-spec': { type: 'string' },
        'dev-spec': { type: 'string' },
      },
      strict: true,
    }));
  } catch (err) {
    console.error(`bake-template: ${err.message}`);
    console.error(USAGE);
    process.exit(1);
  }
  if (!values.to) {
    console.error(USAGE);
    process.exit(1);
  }
  try {
    // Relative to the package, so `--to template` lands on the `template/` directory the package
    // gitignores and ships through its own `files` list.
    const to = path.resolve(packageDir, values.to);
    await bake({ to, engineSpec: values['engine-spec'], devSpec: values['dev-spec'] });
    console.log(`baked template to ${to}`);
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
}
