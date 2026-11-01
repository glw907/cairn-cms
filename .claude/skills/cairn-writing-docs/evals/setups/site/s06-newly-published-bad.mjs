// Known-bad for S06-newly-published: the script keeps no baseline and invents its own "new" rule
// from the post date, so every deploy announces every recent post again, an edit that touches the
// date announces it a second time, and an unpublished draft with a recent date goes out too.
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

/** @param {string} root */
export default function setup(root) {
  mkdirSync(join(root, 'scripts'), { recursive: true });
  writeFileSync(
    join(root, 'scripts/announce-new-posts.ts'),
    `import { readFile } from 'node:fs/promises';
import { announcePost } from '../src/lib/notify.ts';

const week = 7 * 24 * 60 * 60 * 1000;
const manifest = JSON.parse(await readFile('src/content/.cairn/index.json', 'utf8'));
for (const entry of manifest.entries) {
  if (entry.concept !== 'posts' || !entry.date) continue;
  if (Date.now() - new Date(entry.date).getTime() < week) await announcePost(entry);
}
`,
  );
}
