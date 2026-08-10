#!/usr/bin/env node
// The create-cairn-site CLI entry. This task wires only the argument parsing and a version
// smoke; the scaffold flow (pre-flight, prompts, template bake) arrives in later tasks.
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { parseArgs } from './src/args.mjs';

let flags;
try {
  flags = parseArgs(process.argv.slice(2));
} catch (err) {
  console.error(err.message);
  console.error('Next step: fix the flag above and run the command again.');
  process.exit(1);
}

if (flags.version) {
  const pkgPath = fileURLToPath(new URL('./package.json', import.meta.url));
  const pkg = JSON.parse(await readFile(pkgPath, 'utf8'));
  console.log(pkg.version);
  process.exit(0);
}

console.log('create-cairn-site: scaffolding arrives in Task 8');
process.exit(0);
