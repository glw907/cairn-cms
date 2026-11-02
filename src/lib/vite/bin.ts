#!/usr/bin/env node
// cairn-manifest: the regenerate command. It evaluates the cairnManifest virtual module in write mode
// through the consumer's Vite resolution and writes the canonical content manifest, then does the
// same for the site-facts contract. A thin shell over writeManifest and writeSiteFacts so the write
// logic stays testable apart from the CLI. It prints a one-line summary to stdout. Bad flags go to
// stderr with exit 2; a write failure exits 1; a finished write with an invalid non-draft entry exits
// 1; any other run exits 0. The codes go through process.exitCode, never process.exit, so a piped
// stdout flushes the whole report before the process ends, the same rule cairn-audit follows.
import { writeManifest, writeSiteFacts } from './internal.js';
import { formatManifestSummary, manifestExitCode, parseArgs, USAGE } from './assemble.js';

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
    const report = await writeManifest(process.cwd());
    const factsChanged = await writeSiteFacts(process.cwd());
    console.log(formatManifestSummary(report, factsChanged));
    process.exitCode = manifestExitCode(report);
  } catch (err) {
    console.error(err instanceof Error ? err.message : String(err));
    process.exitCode = 1;
  }
}

await main();
