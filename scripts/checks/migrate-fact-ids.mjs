// cairn-cms: the one-shot, re-runnable migration that gives every fact bullet in
// docs/internal/facts/ its id. It inserts a freshly minted `` `f:xxxxxx` `` code span right after
// each bullet's leading `- ` and changes nothing else: no other byte on the bullet's own line
// moves, a soft-wrapped continuation line is untouched, and a bullet already carrying an id (or
// one under the `## Harvest record` / `## Provenance` headings, which carry no id at all) is left
// exactly as it stands. Re-running this script is a no-op once every bullet has an id, so it is
// safe to run again after a rebase onto `main` picks up a bullet another branch filed in the
// meantime: the new bullet gets an id and every already-migrated bullet is untouched.
import { readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { repoRoot } from '../repo-root.mjs';
import { factsFiles, mintFactId, FACT_ID_RE, SKIPPED_SECTIONS } from './check-facts.mjs';

const ROOT = repoRoot(import.meta.url);
const FACTS_DIR = join(ROOT, 'docs/internal/facts');

/**
 * Insert a freshly minted id after the leading `- ` of every fact bullet in `markdown` that does
 * not already carry one, under any heading other than `## Harvest record` or `## Provenance`.
 * Every other line, and every byte of a line that already has an id, is returned unchanged; a
 * bullet whose first line already matches `FACT_ID_RE` right after the `- ` is left alone, which
 * is what makes a second run of this function on its own output a no-op.
 * @param {string} markdown
 * @returns {{ text: string, added: number }}
 */
export function migrateFactIds(markdown) {
  const lines = markdown.split('\n');
  /** @type {string | null} */
  let section = null;
  let added = 0;
  const out = lines.map((line) => {
    if (line.startsWith('## ')) {
      section = line.slice(3).trim().toLowerCase();
      return line;
    }
    if (line.startsWith('- ') && !SKIPPED_SECTIONS.has(section ?? '')) {
      const rest = line.slice(2);
      if (FACT_ID_RE.test(rest)) return line;
      added++;
      return `- \`${mintFactId()}\` ${rest}`;
    }
    return line;
  });
  return { text: out.join('\n'), added };
}

function main() {
  let total = 0;
  for (const file of factsFiles(FACTS_DIR)) {
    const path = join(FACTS_DIR, file);
    const markdown = readFileSync(path, 'utf8');
    const { text, added } = migrateFactIds(markdown);
    if (added > 0) writeFileSync(path, text);
    console.log(`${file}: ${added} id(s) added`);
    total += added;
  }
  console.log(`migrate-fact-ids: ${total} total`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
