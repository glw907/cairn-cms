#!/usr/bin/env -S npx tsx
/**
 * The post-freeze chain CLI: append an entry, verify a chain file's linkage and its entries
 * against the files on disk, look up a path's latest entry, or find the line count a `chainHead`
 * identifies.
 *
 * Usage:
 *   npx tsx scripts/docs-readers/chain.ts append --chain FILE --path PATH --commit SHA
 *     [--sha256 HEX] [--root DIR] [--file FILE]
 *   npx tsx scripts/docs-readers/chain.ts verify --chain FILE --root DIR
 *   npx tsx scripts/docs-readers/chain.ts latest --chain FILE --path PATH
 *   npx tsx scripts/docs-readers/chain.ts prefix --chain FILE --head HEX
 */
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { appendEntry, chainPrefixLength, hashFile, latestEntry, verifyChain } from './lib/chain.js';

/**
 * Parse a subcommand's `--flag value` pairs.
 * @param argv - The arguments after the subcommand name.
 * @returns Each flag's value, keyed by its name without the leading dashes.
 */
function parseFlags(argv: string[]): Record<string, string> {
  const flags: Record<string, string> = {};
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg.startsWith('--')) flags[arg.slice(2)] = argv[(index += 1)];
  }
  return flags;
}

/**
 * Run the `chain.ts` CLI.
 * @param argv - The full argument list, subcommand first.
 * @returns The process exit code.
 */
export function main(argv: string[]): number {
  const [command, ...rest] = argv;
  const flags = parseFlags(rest);
  if (command === 'append') {
    if (!flags.chain || !flags.path || !flags.commit) {
      process.stderr.write('usage: chain.ts append --chain FILE --path PATH --commit SHA [--sha256 HEX] [--root DIR] [--file FILE]\n');
      return 1;
    }
    // Hashing the path's own file by default, rather than requiring a separate --file, keeps an
    // entry's path and the file it was hashed from from ever drifting apart by accident.
    const sha256 = flags.sha256 ?? hashFile(resolve(flags.root ?? '.', flags.file ?? flags.path));
    const entry = appendEntry(resolve(flags.chain), { path: flags.path, sha256, commit: flags.commit });
    process.stdout.write(`${JSON.stringify(entry, null, 2)}\n`);
    return 0;
  }
  if (command === 'verify') {
    if (!flags.chain || !flags.root) {
      process.stderr.write('usage: chain.ts verify --chain FILE --root DIR\n');
      return 1;
    }
    const result = verifyChain(resolve(flags.chain), resolve(flags.root));
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    return result.ok ? 0 : 1;
  }
  if (command === 'latest') {
    if (!flags.chain || !flags.path) {
      process.stderr.write('usage: chain.ts latest --chain FILE --path PATH\n');
      return 1;
    }
    const entry = latestEntry(resolve(flags.chain), flags.path);
    if (!entry) {
      process.stderr.write(`no chain entry found for "${flags.path}"\n`);
      return 1;
    }
    process.stdout.write(`${JSON.stringify(entry, null, 2)}\n`);
    return 0;
  }
  if (command === 'prefix') {
    if (!flags.chain || !flags.head) {
      process.stderr.write('usage: chain.ts prefix --chain FILE --head HEX\n');
      return 1;
    }
    try {
      const k = chainPrefixLength(resolve(flags.chain), flags.head);
      process.stdout.write(`${JSON.stringify({ k }, null, 2)}\n`);
      return 0;
    } catch (error) {
      process.stderr.write(`${(error as Error).message}\n`);
      return 1;
    }
  }
  process.stderr.write('usage: chain.ts append|verify|latest|prefix ...\n');
  return 1;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exit(main(process.argv.slice(2)));
}
