#!/usr/bin/env -S npx tsx
/**
 * The ban grep CLI: fails on any file that names a development-set item's id, page, or subject.
 *
 * Usage:
 *   npx tsx scripts/docs-readers/ban-grep.ts FILE [FILE...]
 *
 * Reads `scripts/docs-readers/fixtures/dev-items.json`, scans each given file, and prints every
 * hit as `file:line: itemId names "term"`. Exits 1 when any file carries a hit, 0 when none does.
 */
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadDevItems, scanFile } from './lib/ban-grep.js';

const HERE = dirname(fileURLToPath(import.meta.url));

/**
 * Run the ban grep over a list of files.
 * @param argv - The file paths to scan.
 * @returns The process exit code: 1 when any hit is found, 0 otherwise.
 */
export function main(argv: string[]): number {
  if (argv.length === 0) {
    process.stderr.write('usage: ban-grep.ts FILE [FILE...]\n');
    return 1;
  }
  const items = loadDevItems(join(HERE, 'fixtures', 'dev-items.json'));
  let hitCount = 0;
  for (const file of argv) {
    for (const hit of scanFile(file, items)) {
      hitCount += 1;
      process.stdout.write(`${hit.file}:${hit.line}: ${hit.itemId} names "${hit.term}"\n`);
    }
  }
  return hitCount > 0 ? 1 : 0;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exit(main(process.argv.slice(2)));
}
