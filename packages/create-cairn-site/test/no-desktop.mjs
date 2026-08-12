// A suite-wide guard against the tool opening the operator's real browser. `openBrowser` spawns
// the platform opener by bare name (`xdg-open`, `open`, `cmd`) and resolves it through PATH, so a
// test that forgets to inject the openBrowser seam launches a real tab at the operator's desktop.
// The plan's global constraint bans that outright, and per-test discipline is the wrong mechanism
// for it: a test added later inherits nothing, and the failure is invisible in CI (the spawn is
// best-effort and its errors are swallowed) while being loud and disruptive on a workstation.
//
// This module is loaded through `--import` from the package's own test script, so it runs in every
// test process the runner spawns, before any test file executes. It prepends a directory of no-op
// stand-ins for all three openers onto PATH. Each stand-in records what it was asked to open, so a
// leak is auditable after the fact rather than merely suppressed: read GUARD_LOG_PATH to see which
// runs would have opened a browser and where they would have sent it.
//
// A test that means to assert an open happened still injects its own seam and asserts on that.
// This is the net underneath, not a replacement for it.
import { mkdirSync, writeFileSync, chmodSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

/** The guard's own directory, fixed rather than per-process so parallel test processes share one
 * log and the workstation collects one stale directory instead of dozens. */
const GUARD_DIR = path.join(tmpdir(), 'cairn-no-desktop-guard');

/** Where the stand-ins record every open they intercepted, one line per attempt. */
export const GUARD_LOG_PATH = path.join(GUARD_DIR, 'intercepted.log');

/** Every opener name `openBrowser`'s own platform switch can spawn. */
const OPENER_NAMES = ['xdg-open', 'open', 'cmd'];

const STAND_IN = `#!/bin/sh
# Intercepts a browser open during the test suite. See test/no-desktop.mjs.
printf '%s %s\\n' "$(basename "$0")" "$*" >> "${GUARD_LOG_PATH}"
exit 0
`;

mkdirSync(GUARD_DIR, { recursive: true });
for (const name of OPENER_NAMES) {
  const file = path.join(GUARD_DIR, name);
  writeFileSync(file, STAND_IN);
  chmodSync(file, 0o755);
}

process.env.PATH = `${GUARD_DIR}${path.delimiter}${process.env.PATH ?? ''}`;
