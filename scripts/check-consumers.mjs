// check-consumers.mjs: the root gate proving a public reshape cannot silently break either
// downstream consumer of the package surface. The reference and surface gates verify the
// shipped `.d.ts` shape in isolation; neither one actually compiles a consumer against it. This
// script runs the two real consumers in the repo: the showcase site's own `svelte-check`
// (examples/showcase, a registry-style consumer resolving `@glw907/cairn-cms` through its built
// `dist/`) and `packages/cairn-cms-dev`'s typecheck (via the existing `check:dev-package` gate,
// which already runs `tsc --noEmit` over the dev backend). Wired as `npm run check:consumers`
// (CI's test job runs it after `npm run package` rebuilds `dist/`).
//
// A prior public-surface reshape broke `packages/cairn-cms-dev` silently until a manual showcase
// `svelte-check` caught it (surface-pruning pass, Task 6; see
// docs/superpowers/plans/2026-07-01-surface-pruning-pass.md). `check:dev-package` closed the
// dev-package half of that gap; this script closes the showcase half and gives both consumers
// one named entry point.
//
// Worktree behavior (read before trusting a red run here): a feature worktree whose
// examples/showcase/node_modules has been locally `npm install`-ed (the normal
// `npm run package && npm test` posture, and this repo's committed worktree convention)
// resolves and typechecks the showcase cleanly, the same as CI's fresh checkout. A worktree
// whose examples/showcase/node_modules still shares the root's symlinked node_modules with the
// main checkout (never locally installed inside examples/showcase) can instead surface a known,
// unrelated dual vite/kit install collision: two physical copies of @sveltejs/kit/vite in the
// type-resolution graph produce spurious node_modules-only duplicate-identifier errors (ROADMAP
// "Small DX debt"; docs/superpowers/plans/2026-06-04-cairn-dx-a-ergonomics.md). This script does
// not attempt to distinguish that noise from a real showcase src/ error automatically; instead,
// on a showcase failure it prints the raw svelte-check output plus this note and still exits
// non-zero, so a worktree run fails LOUD with a concrete next step (`cd examples/showcase && npm
// install`, or trust CI's clean checkout) rather than silently passing or silently misreporting.
import { spawnSync } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SHOWCASE = resolve(ROOT, 'examples/showcase');

/**
 * Run a command, streaming its output, and return whether it succeeded.
 * @param {string} label the human label echoed before the run
 * @param {string} command the executable
 * @param {string[]} args the command's argv
 * @param {string} cwd the working directory to run the command in
 * @returns {boolean} true when the command exits 0
 */
function run(label, command, args, cwd) {
  console.log(`== ${label} ==`);
  const result = spawnSync(command, args, { cwd, stdio: 'inherit' });
  return result.status === 0;
}

const showcaseOk = run('showcase svelte-check (consumer typecheck)', 'npm', ['run', 'check'], SHOWCASE);

if (!showcaseOk) {
  console.log(
    '\ncheck:consumers: the showcase typecheck failed. If this is a feature worktree whose ' +
      'examples/showcase/node_modules still shares the root symlink (never locally `npm ' +
      'install`-ed inside examples/showcase), the errors above may be the known dual vite/kit ' +
      'install collision (ROADMAP "Small DX debt") rather than a real regression: run `cd ' +
      'examples/showcase && npm install` and retry, or trust a clean checkout / CI. This script ' +
      'does not suppress the failure either way.'
  );
}

const devPackageOk = run('packages/cairn-cms-dev typecheck (via check:dev-package)', 'npm', ['run', 'check:dev-package'], ROOT);

if (showcaseOk && devPackageOk) {
  console.log('check:consumers OK');
  process.exit(0);
}
console.log('check:consumers FAILED');
process.exit(1);
