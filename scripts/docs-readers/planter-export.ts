#!/usr/bin/env -S npx tsx
/**
 * Writes the planter's export: this repository at a named commit, as a plain file tree with no
 * `.git`, carrying the same exclusions as a repository-class reader tree (`preparePlanterExport`).
 *
 * Usage:
 *   npx tsx scripts/docs-readers/planter-export.ts --commit SHA --out DIR
 *
 * `--commit` must be a commit id, never `HEAD`; `--out` is replaced if it exists.
 */
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { preparePlanterExport, type PreparedTree } from './lib/prepare-class.js';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');

/**
 * Pull a flag's value out of an argument list, the same `--flag value` form `run.ts` uses.
 * @param args - The command-line arguments.
 * @param flag - The flag name.
 * @returns The value after the flag, or undefined.
 */
function option(args: string[], flag: string): string | undefined {
  const at = args.indexOf(flag);
  return at === -1 ? undefined : args[at + 1];
}

/**
 * Parse the arguments and write the export.
 * @param args - The arguments after the script name.
 * @param repoRoot - The checkout to export from; defaults to this repository.
 * @returns The export's absent list.
 * @throws When `--commit` or `--out` is missing, or the export fails.
 */
export function main(args: string[], repoRoot: string = REPO_ROOT): PreparedTree {
  const commit = option(args, '--commit');
  const out = option(args, '--out');
  if (!commit || !out) throw new Error('usage: planter-export.ts --commit SHA --out DIR');
  return preparePlanterExport({ repoRoot, commit, dest: resolve(out) });
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const { absent } = main(process.argv.slice(2));
    console.log(`done: ${absent.length} path(s) absent by design`);
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exit(1);
  }
}
