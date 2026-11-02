#!/usr/bin/env node
// cairn-audit: the design-language audit. A thin shell over index.ts (where the unit tests reach
// the logic): parse the flags, load the config from the directory the command runs in, run the
// static rules, print the report. Bad flags and a run that cannot start go to stderr with exit 2;
// an unsuppressed error-tier finding exits 1, and under `--fail-on advisory` so does an
// unsuppressed advisory; a clean run exits 0. The codes go through process.exitCode, never
// process.exit, so a piped stdout flushes the whole report first.
import {
  exitCodeFor,
  formatReport,
  loadConfig,
  parseArgs,
  runStatic,
  selectRules,
  staticRules,
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

  try {
    const config = loadConfig(process.cwd(), args.config);
    // `--rule` narrows the registry to the named ids, in registry order; `selectRules`
    // throws naming the known ids when one does not match, which the catch below turns into the
    // same exit-2 shape as any other bad argument.
    const report = runStatic(config, selectRules(staticRules(), args.rule));
    console.log(formatReport(report));
    process.exitCode = exitCodeFor(report, args.failOn);
  } catch (err) {
    console.error(`cairn-audit: ${err instanceof Error ? err.message : String(err)}`);
    process.exitCode = 2;
  }
}

await main();
