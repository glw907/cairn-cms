// Setup for `fact-checker-key`: write a seed page holding the ten keyed claims, one per line, five
// true and five false against src/lib/media/config.ts at the pin.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
export const SEED_PAGE = 'docs/extend/eval-media-defaults.md';

/** @param {string} root */
export default function setup(root) {
  const key = JSON.parse(readFileSync(join(HERE, '../fact-checker/key.json'), 'utf8'));
  const body = [
    '# Media defaults',
    '',
    'This page lists what the media block does when a site leaves an option out.',
    '',
    ...key.map((k) => k.claim),
    '',
  ].join('\n');
  mkdirSync(join(root, 'docs/extend'), { recursive: true });
  writeFileSync(join(root, SEED_PAGE), body);
}
