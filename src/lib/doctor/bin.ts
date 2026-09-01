#!/usr/bin/env node
// cairn-doctor: the environment preflight. A thin shell over index.ts (where the unit tests
// reach the logic): parse the flags, assemble the context with the real fetch and filesystem,
// run the default registry plus the opt-in live send, print the report. Bad flags go to
// stderr with exit 2; a failed check exits 1; an unchecked check with no failure exits 3; a
// clean run (pass, skip, and info only) exits 0. The codes go through process.exitCode, never
// process.exit, so a piped stdout flushes the whole report before the process ends.
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { liveProbeCheck } from './check-probe.js';
import { liveSendCheck } from './check-send.js';
import { installSkill, SKILL_INSTALL_DIR } from './check-skill.js';
import { readWranglerConfig } from './wrangler-config.js';
import {
  contextFromEnv,
  defaultChecks,
  deriveMissingInputs,
  exitCodeFor,
  formatReport,
  parseArgs,
  runDoctor,
  USAGE,
} from './index.js';

async function main(): Promise<void> {
  let args: ReturnType<typeof parseArgs>;
  try {
    args = parseArgs(process.argv.slice(2));
  } catch (err) {
    console.error(err instanceof Error ? err.message : String(err));
    process.exitCode = 2;
    return;
  }

  if (args.help) {
    console.log(USAGE);
    return;
  }

  const cwd = process.cwd();

  // --fix installs before the checks run, so the skill.admin-screens check reads fresh in the
  // same report rather than needing a second invocation. A filesystem error here (a read-only
  // tree, a permissions problem) must not abort the whole run with a stack trace; report it and
  // fall through to the checks, which still produce a useful report (skill.admin-screens simply
  // reads whatever was there before).
  if (args.fix) {
    try {
      const count = await installSkill(resolve(cwd, SKILL_INSTALL_DIR));
      console.log(`cairn-doctor: installed ${count} admin-screens skill file(s) into ${SKILL_INSTALL_DIR}`);
    } catch (err) {
      console.error(
        `cairn-doctor: --fix failed to install the admin-screens skill (${err instanceof Error ? err.message : String(err)})`
      );
    }
  }

  const readFileUnderCwd = async (relPath: string): Promise<string | null> => {
    try {
      return await readFile(resolve(cwd, relPath), 'utf8');
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') return null;
      throw err;
    }
  };
  // Fill inputs the flags and env left missing from the repo itself: from and repo off the
  // adapter (through the vite arm, which exists only on this bin path, never in a Worker)
  // and the account id off the wrangler config. The API token stays env-only.
  const derived = await deriveMissingInputs(contextFromEnv(process.env, args, cwd), {
    adapterFacts: async () => {
      const { readAdapterFacts } = await import('../vite/internal.js');
      return readAdapterFacts(cwd);
    },
    wranglerAccountId: async () => (await readWranglerConfig(readFileUnderCwd))?.accountId,
  });
  const ctx = {
    ...derived,
    fetch: globalThis.fetch,
    readFile: readFileUnderCwd,
  };

  const checks = defaultChecks();
  if (args.sendTest) checks.push(liveSendCheck(args.sendTest));
  // The probe is an opt-in network POST against a live site, so it joins only on --probe;
  // the bare flag hands the URL resolution (the PUBLIC_ORIGIN input) to the check itself.
  if (args.probe !== undefined) {
    checks.push(liveProbeCheck(args.probe === true ? undefined : args.probe));
  }

  const { results, failed, unchecked } = await runDoctor(checks, ctx);
  console.log(formatReport(results));
  process.exitCode = exitCodeFor({ failed, unchecked });
}

await main();
