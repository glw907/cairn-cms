// Setup for `deficiency`: seed a false cap into docs/extend/turn-on-tidy.md. The true cap is
// MAX_TIDY_CHARS = 24_000 (src/lib/sveltekit/content-routes-tidy.ts:51). The sentence wraps across
// two lines in the page, so the match allows any whitespace between words.
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const PAGE = 'docs/extend/turn-on-tidy.md';
const TRUE_SENTENCE = /Tidy refuses a draft over roughly 24,000 characters, about 8,000 input tokens, before\s+the\s+model\s+is\s+called\./;
const FALSE_SENTENCE = 'Tidy refuses a draft over roughly 12,000 characters, about 4,000 input tokens, before the model is called.';

/** @param {string} root */
export default function setup(root) {
  const text = readFileSync(join(root, PAGE), 'utf8');
  if (!TRUE_SENTENCE.test(text)) throw new Error(`${PAGE} does not hold the sentence the seed replaces`);
  writeFileSync(join(root, PAGE), text.replace(TRUE_SENTENCE, FALSE_SENTENCE));
}
