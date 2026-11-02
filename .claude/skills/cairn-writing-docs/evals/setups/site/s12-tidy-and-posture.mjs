// Setup for `S12-tidy-and-posture`: a site where tidy was switched off and whose robots route
// predates the posture pass-through. The site config's tidy block keeps the house conventions but
// reads `enabled: false`, and the robots route calls robotsResponse without `posture`, so setting
// `aiPosture` on the adapter alone changes no byte of the served robots.txt.
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Replace one exact piece of a file, failing loudly when the fixture's text has moved.
 * @param {string} file
 * @param {string} from
 * @param {string} to
 */
function swap(file, from, to) {
  const text = readFileSync(file, 'utf8');
  if (!text.includes(from)) throw new Error(`setup anchor missing in ${file}: ${from}`);
  writeFileSync(file, text.replace(from, to));
}

/** @param {string} root */
export default function setup(root) {
  swap(join(root, 'src/theme/site.config.yaml'), 'tidy:\n  enabled: true\n', 'tidy:\n  enabled: false\n');
  swap(
    join(root, 'src/routes/robots.txt/+server.ts'),
    "    disallow: ['/admin'],\n    posture: cairn.aiPosture,\n",
    "    disallow: ['/admin'],\n",
  );
}
