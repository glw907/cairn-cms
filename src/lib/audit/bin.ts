#!/usr/bin/env node
// cairn-audit: the design-language audit. A thin shell over index.ts (where the unit tests reach
// the logic): parse the flags, load the config from the directory the command runs in, run the
// static rules or, under `--rendered`, the rendered ones against a running server, print the
// report. Bad flags and a run that cannot start go to stderr with exit 2; an unsuppressed
// error-tier finding exits 1; a clean run exits 0. The codes go through process.exitCode, never
// process.exit, so a piped stdout flushes the whole report first.
import {
  exitCodeFor,
  formatNormsQuery,
  formatReport,
  loadConfig,
  loadNormsManifest,
  parseArgs,
  queryNorms,
  runRendered,
  runStatic,
  unknownTermMessage,
  USAGE,
} from './index.js';

// The norms query answers from the shipped manifest, so it reads no consumer tree and needs no
// config, no built stylesheet, and no browser. A term that names no role exits 2 with the role
// list: a query that printed nothing and exited 0 would read as "this role has no norms".
function norms(term: string): void {
  const manifest = loadNormsManifest();
  const matches = queryNorms(manifest, term);
  if (matches.length === 0) {
    console.error(`cairn-audit: ${unknownTermMessage(manifest, term)}`);
    process.exitCode = 2;
    return;
  }
  console.log(formatNormsQuery(matches));
}

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
    if (args.command === 'norms') {
      // The norms query answers from the shipped manifest and reads no tree, so pairing it with a
      // run mode is a mistake worth naming rather than a flag worth ignoring.
      if (args.rendered) throw new Error('norms takes no --rendered; it answers from the shipped manifest');
      norms(args.term);
      return;
    }
    const config = loadConfig(process.cwd(), args.config);
    // Rendered mode drives a browser against an already-running server and throws on every shape of
    // silent-green (no rules, no pages, no server, no Playwright, a non-2xx page), so a failure to
    // start reaches the catch below and exits 2 rather than printing an empty, reassuring report.
    const report = args.rendered ? await runRendered(config) : runStatic(config);
    console.log(formatReport(report));
    process.exitCode = exitCodeFor(report);
  } catch (err) {
    console.error(`cairn-audit: ${err instanceof Error ? err.message : String(err)}`);
    process.exitCode = 2;
  }
}

await main();
