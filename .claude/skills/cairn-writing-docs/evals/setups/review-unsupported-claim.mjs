// Setup for `review-unsupported-claim`: commit a docs change whose one new sentence the code cannot
// settle, plus the fact-check findings for it, so the review step has a call for Geoff. How soon
// the live site updates depends on the developer's host, which no file in the repository states.
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const PAGE = 'docs/editors/publish-and-history.md';
const ANCHOR = 'It confirms that the entry published and adds that the live site is updating.';
const ADDED = ' The live site shows the change within about a minute.';

/** @param {string} root */
export default function setup(root) {
  const text = readFileSync(join(root, PAGE), 'utf8');
  if (!text.includes(ANCHOR)) throw new Error(`${PAGE} does not hold the sentence the seed extends`);
  const seeded = text.replace(ANCHOR, `${ANCHOR}${ADDED}`);
  writeFileSync(join(root, PAGE), seeded);
  const line = seeded.split('\n').findIndex((l) => l.includes(ADDED.trim())) + 1;
  const findings = [
    {
      file: PAGE,
      line,
      claim: 'The message confirms that the entry published and adds that the live site is updating.',
      verdict: 'holds',
      source: 'src/lib/admin/EditPage.svelte:1326',
      proposed: null,
    },
    {
      file: PAGE,
      line,
      claim: 'The live site shows the change within about a minute.',
      verdict: 'unsupported',
      source: 'No file in the repository states how long a site takes to rebuild; the deploy runs on the site host.',
      proposed: 'The live site shows the change once your site finishes updating.',
    },
  ];
  writeFileSync(join(root, 'findings.json'), `${JSON.stringify(findings, null, 2)}\n`);
}
