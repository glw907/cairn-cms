// Setup for `editor-deficiency`: seed a false history cap into docs/editors/publish-and-history.md.
// The true cap is HISTORY_LIMIT = 25 (src/lib/sveltekit/content-routes-shared.ts:160). Both
// phrasings of the cap sit side by side in one paragraph, so the seed rewrites them together.
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const PAGE = 'docs/editors/publish-and-history.md';
const TRUE_TEXT = 'The list shows up to the 25 most recent published versions. When more exist, the page says **Showing the most recent 25 versions.**';
const FALSE_TEXT = 'The list shows up to the 10 most recent published versions. When more exist, the page says **Showing the most recent 10 versions.**';

/** @param {string} root */
export default function setup(root) {
  const text = readFileSync(join(root, PAGE), 'utf8');
  if (!text.includes(TRUE_TEXT)) throw new Error(`${PAGE} does not hold the sentences the seed replaces`);
  writeFileSync(join(root, PAGE), text.replace(TRUE_TEXT, FALSE_TEXT));
}
