// cairn-cms: run a command inside a memory-capped systemd transient scope, falling back to
// running it directly when no user systemd manager is reachable.
//
// The vitest browser project drives real Chromium via @vitest/browser-playwright. A runaway
// Chromium tree has taken this workstation down before (an OOM that motivated the workstation's
// zram config). This wrapper contains that failure mode: it runs the given command under
// `systemd-run --user --scope -p MemoryMax=<cap>`, so a runaway child tree hits the cgroup
// memory ceiling instead of the host's. On a machine with no user D-Bus session (a CI
// container, a bare init), `systemd-run --user` cannot create the scope; the wrapper detects
// that up front with a cheap probe scope and falls back to running the command unconstrained,
// rather than failing the whole test run over containment it cannot provide.
//
// Usage:
//   node scripts/test/contained.mjs <command> [...args]
//
// The wrapped command's stdout/stderr are inherited and its exit code (or terminating signal)
// is reproduced exactly, so callers (npm scripts, CI) see the real result of <command>, not the
// wrapper's own.
import { spawn, spawnSync } from 'node:child_process';

/** The cgroup memory ceiling applied to the wrapped command's scope. */
const MEMORY_MAX = '8G';

/**
 * Probes whether `systemd-run --user` can create a transient scope on this host. A `true`
 * scope is cheap to create and tear down; its exit code distinguishes a reachable user
 * manager from one that is absent (systemd-run fails fast, without an ENOENT, when there is
 * no user D-Bus session to talk to) or from `systemd-run` not being installed at all.
 *
 * @returns Whether `systemd-run --user --scope` is usable for the real command.
 */
function systemdRunAvailable() {
  const probe = spawnSync(
    'systemd-run',
    ['--user', '--scope', '-p', `MemoryMax=${MEMORY_MAX}`, '--', 'true'],
    { stdio: 'ignore' },
  );
  return probe.error === undefined && probe.status === 0;
}

const commandArgs = process.argv.slice(2);
if (commandArgs.length === 0) {
  console.error('contained.mjs: usage: node scripts/test/contained.mjs <command> [...args]');
  process.exit(1);
}

const contained = systemdRunAvailable();
const [command, args] = contained
  ? ['systemd-run', ['--user', '--scope', '-p', `MemoryMax=${MEMORY_MAX}`, '--', ...commandArgs]]
  : [commandArgs[0], commandArgs.slice(1)];

console.error(
  contained
    ? `contained.mjs: running under systemd-run --user --scope -p MemoryMax=${MEMORY_MAX}`
    : 'contained.mjs: no user systemd manager reachable, running unconstrained',
);

const child = spawn(command, args, { stdio: 'inherit' });

child.on('error', (err) => {
  console.error(`contained.mjs: failed to spawn ${command}: ${err.message}`);
  process.exit(1);
});

child.on('exit', (code, signal) => {
  if (signal) {
    // Re-raise the same signal on ourselves so the parent process (a shell, npm) observes the
    // same termination it would have seen running the command directly.
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 1);
});
