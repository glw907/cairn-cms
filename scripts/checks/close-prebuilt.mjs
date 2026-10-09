// cairn-cms: `check:close` with `dist` built once. Seventeen of check:close's components start
// with `npm run package` when run as their own npm script, and each build takes one to two
// minutes, so the chain spends most of its time rebuilding an unchanged `dist`. This runner builds
// it once, then runs every check:close component with that leading build removed, the same way
// docs-gate.mjs builds once for the whole docs gate.
//
// The component list is read from package.json's `check:close` script at run time, never copied,
// so the two cannot drift: a check added to check:close joins this runner with no edit here.
// check:close itself is unchanged, and CI keeps running it.
//
// Interface: `node scripts/checks/close-prebuilt.mjs` (npm script `check:close:prebuilt`). Every
// component runs even after one fails, so one run reports every red check; the exit code is
// non-zero when any component or the build failed.
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { delimiter, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { repoRoot } from '../repo-root.mjs';

const ROOT = repoRoot(import.meta.url);

/** The leading build a component script carries when run as its own npm script. */
export const PACKAGE_PREFIX = 'npm run package && ';

/**
 * The ordered check:close components, each a label plus the shell command this runner runs for
 * it. A component whose own script starts with the package build runs its script's remainder; any
 * other component runs exactly as check:close spells it.
 * @param {Record<string, string>} scripts - package.json's `scripts` block.
 * @returns {{ label: string, command: string }[]}
 */
export function closeSteps(scripts) {
  const close = scripts['check:close'];
  if (!close) throw new Error('close-prebuilt: package.json has no check:close script');
  return close.split(' && ').map((component) => {
    const named = component.match(/^npm run (\S+)$/);
    const body = named ? scripts[named[1]] : undefined;
    if (named && body === undefined) {
      throw new Error(`close-prebuilt: check:close names "${named[1]}", which package.json lacks`);
    }
    if (body?.startsWith(PACKAGE_PREFIX)) {
      const rest = body.slice(PACKAGE_PREFIX.length);
      // A second build inside the remainder would defeat the point, and would mean the script's
      // shape changed in a way this runner was not written for.
      if (rest.includes('npm run package')) {
        throw new Error(`close-prebuilt: "${named?.[1]}" builds the package twice`);
      }
      return { label: named?.[1] ?? component, command: rest };
    }
    if (body?.includes('npm run package')) {
      throw new Error(`close-prebuilt: "${named?.[1]}" builds the package somewhere other than its start`);
    }
    return { label: named?.[1] ?? component, command: component };
  });
}

function main() {
  const { scripts } = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'));
  let steps;
  try {
    steps = closeSteps(scripts);
  } catch (err) {
    console.error(err instanceof Error ? err.message : String(err));
    process.exitCode = 1;
    return;
  }

  console.log('== npm run package (dist, built once for the whole close check) ==');
  const pkg = spawnSync('npm', ['run', 'package'], { cwd: ROOT, stdio: 'inherit' });
  if (pkg.status !== 0) {
    console.error('check:close:prebuilt: npm run package failed; no component ran');
    process.exitCode = 1;
    return;
  }

  // A script body names its tools bare (publint, attw), which npm resolves from node_modules/.bin.
  const env = { ...process.env, PATH: `${join(ROOT, 'node_modules', '.bin')}${delimiter}${process.env.PATH ?? ''}` };
  const results = steps.map((step) => {
    console.log(`== ${step.label} ==`);
    const result = spawnSync('sh', ['-c', step.command], { cwd: ROOT, stdio: 'inherit', env });
    return { label: step.label, ok: result.status === 0 };
  });

  const failed = results.filter((result) => !result.ok);
  if (failed.length === 0) {
    console.log(`check:close:prebuilt: OK (${results.length} check(s))`);
    return;
  }
  console.error(
    `check:close:prebuilt: ${failed.length} check(s) failed: ${failed.map((result) => result.label).join(', ')}`,
  );
  process.exitCode = 1;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
