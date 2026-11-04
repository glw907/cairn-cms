#!/usr/bin/env node
// cairn-cms: the release notes file. It takes the version's CHANGELOG section and every actionable
// `Consumers must:` line (any line `check-consumers-must.mjs` reads as one whose body is not
// `nothing.`) and writes them to a notes file, with a marked place for the summary paragraph the
// releasing session writes.
//
// Interface: `node scripts/release/notes.mjs <version> [--out <path>]`. The default file is
// `node_modules/.release-notes.md`. Exit 0 or 1; the last line is `Next:`.
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { LINE } from '../checks/check-consumers-must.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

/** The place the session writes the summary paragraph. */
export const SUMMARY_MARKER = '<!-- summary: replace this line with one paragraph -->';

/**
 * Build the notes text for one version.
 * @param {string} changelog - The full CHANGELOG.md text.
 * @param {string} version - The version whose section is read.
 * @returns {{ ok: true, text: string } | { ok: false, error: string }} The notes, or why there are none.
 */
export function buildNotes(changelog, version) {
  const lines = changelog.split('\n');
  const start = lines.findIndex((l) => l.replace(/\r$/, '') === `## ${version}`);
  if (start < 0) return { ok: false, error: `CHANGELOG.md has no "## ${version}" section` };
  const length = lines.slice(start + 1).findIndex((l) => l.startsWith('## '));
  const section = lines.slice(start + 1, length < 0 ? undefined : start + 1 + length).join('\n').trim();
  const musts = section
    .split('\n')
    .map((l) => l.replace(/\r$/, '').match(LINE)?.[1])
    .filter((body) => body !== undefined && body !== 'nothing.');
  const consumers = musts.length ? `## Consumers must\n\n${musts.map((b) => `- ${b}`).join('\n')}\n\n` : '';
  return { ok: true, text: `${SUMMARY_MARKER}\n\n${consumers}${section}\n` };
}

function main() {
  const args = process.argv.slice(2);
  const outAt = args.indexOf('--out');
  const out = outAt >= 0 ? args[outAt + 1] : join(ROOT, 'node_modules', '.release-notes.md');
  const version = args.find((a, i) => !a.startsWith('--') && i !== outAt + 1) ?? '';
  const result = buildNotes(readFileSync(join(ROOT, 'CHANGELOG.md'), 'utf8'), version);
  if (!result.ok) {
    console.error(`notes: ${result.error}`);
    process.exitCode = 1;
    console.log('Next: fix the version and rerun notes');
    return;
  }
  writeFileSync(out, result.text);
  console.log(`notes: wrote ${out}`);
  console.log('Next: write the summary paragraph where the marker sits, then create the release from the file');
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
