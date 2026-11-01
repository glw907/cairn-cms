// Setup for `S11-media-config`: a committed media manifest with one GIF already in the library,
// under the hash the sample "hello" post's hero image references. The case narrows the upload
// types, so the row is what a careless change would orphan: narrowing `allowedTypes` limits new
// uploads only, and an existing GIF keeps serving. The fixture ships no manifest of its own.
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const MANIFEST = {
  '00112233445566aa': {
    hash: '00112233445566aa',
    sha256: '00112233445566aa8899aabbccddeeff00112233445566aa8899aabbccddeeff',
    slug: 'hello-hero',
    displayName: 'Hello hero',
    originalFilename: 'hello-hero.gif',
    alt: 'A cairn of stacked stones on a misty ridge',
    ext: 'gif',
    contentType: 'image/gif',
    bytes: 412880,
    width: 1200,
    height: 800,
    createdAt: '2026-01-10T09:00:00.000Z',
  },
};

/** @param {string} root */
export default function setup(root) {
  const dir = join(root, 'src/content/.cairn');
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'media.json'), `${JSON.stringify(MANIFEST, null, 2)}\n`);
}
