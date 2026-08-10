#!/usr/bin/env node
// The create-cairn-site CLI entry. Argument parsing and --version are wired; the scaffold flow
// (pre-flight, prompts, template bake) arrives in a later task.
import { readFile } from 'node:fs/promises';
import { parseArgs } from './src/args.mjs';

let flags;
try {
  flags = parseArgs(process.argv.slice(2));
} catch (err) {
  console.error(err.message);
  console.error('Next step: fix the flag above and run the command again.');
  process.exit(1);
}

// Both paths fall off the end rather than calling process.exit(0), which can cut off a buffered
// stdout write when the output is piped. Only the failure path above exits explicitly.
if (flags.version) {
  const pkg = JSON.parse(await readFile(new URL('./package.json', import.meta.url), 'utf8'));
  console.log(pkg.version);
} else {
  // A plan task number is not user-facing copy, and this package is not published yet, so the
  // placeholder says what the reader can actually act on.
  console.log('create-cairn-site: this build carries no scaffold command yet.');
  console.log('Next step: watch https://github.com/glw907/cairn-cms for the first release.');
}
