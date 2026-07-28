#!/usr/bin/env node
// cairn-audit: the design-language audit. A thin shell over index.ts (where the unit tests reach
// the logic): parse the flags, load the config from the directory the command runs in, run the
// static rules, print the report. Bad flags and a run that cannot start go to stderr with exit 2;
// an unsuppressed error-tier finding exits 1; a clean run exits 0. The codes go through
// process.exitCode, never process.exit, so a piped stdout flushes the whole report first.
import { exitCodeFor, formatReport, loadConfig, parseArgs, runStatic } from './index.js';

const RENDERED_UNAVAILABLE =
  'cairn-audit: --rendered is not available yet. Rendered mode ships with the rendered rule set; run cairn-audit with no flags for the static audit.';

function main(): void {
  let args: ReturnType<typeof parseArgs>;
  try {
    args = parseArgs(process.argv.slice(2));
  } catch (err) {
    console.error(err instanceof Error ? err.message : String(err));
    process.exitCode = 2;
    return;
  }

  // Reserved, not silently ignored: a consumer who asks for rendered mode gets told it is not here
  // yet, rather than a green static run they read as a rendered pass.
  if (args.rendered) {
    console.error(RENDERED_UNAVAILABLE);
    process.exitCode = 2;
    return;
  }

  try {
    const report = runStatic(loadConfig(process.cwd(), args.config));
    console.log(formatReport(report));
    process.exitCode = exitCodeFor(report);
  } catch (err) {
    console.error(`cairn-audit: ${err instanceof Error ? err.message : String(err)}`);
    process.exitCode = 2;
  }
}

main();
