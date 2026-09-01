#!/usr/bin/env node
// cairn-manifest: the regenerate command. It evaluates the cairnManifest virtual module in write mode
// through the consumer's own Vite resolution and writes the canonical content manifest. A thin shell
// over writeManifest so the write logic stays testable apart from the CLI. Bad flags go to stderr
// with exit 2; a write failure exits 1; a clean run exits 0. The codes go through process.exitCode,
// never process.exit, so a piped stdout flushes the whole report before the process ends, the same
// rule its three sibling bins (cairn-doctor, cairn-audit, cairn-media-seed) already follow.
import { writeManifest } from './internal.js';
import { parseArgs, USAGE } from './assemble.js';

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
    await writeManifest(process.cwd());
  } catch (err) {
    console.error(err instanceof Error ? err.message : String(err));
    process.exitCode = 1;
  }
}

await main();
