// Known-bad for `S11-media-config`: the limits change, but the URL move is half done. The adapter
// points `publicBase` at /images, the new route's catch-all param is named `slug` instead of
// `path` (every generated image URL answers 404), the old /media route is deleted (the editor's
// live preview breaks), and the GIF is dropped from the manifest along with the type.
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

const FILES = {
  'src/theme/cairn.config.ts': `import { defineAdapter, type AssetConfig } from '@glw907/cairn-cms';

const media: AssetConfig = {
  bucketBinding: 'MEDIA_BUCKET',
  allowedTypes: ['image/jpeg', 'image/png', 'image/webp'],
  maxUploadBytes: 8 * 1024 * 1024,
  publicBase: '/images',
  urlForm: 'opaque',
};

export const cairn = defineAdapter({ media });
`,
  'src/routes/images/[...slug]/+server.ts': `import { createMediaRoute } from '@glw907/cairn-cms/sveltekit';
import { runtime } from '#chassis/cairn.server.js';

export const GET = createMediaRoute({ runtime });
`,
  'src/content/.cairn/media.json': '{}\n',
};

/** @param {string} root */
export default function bad(root) {
  for (const [rel, text] of Object.entries(FILES)) {
    mkdirSync(dirname(join(root, rel)), { recursive: true });
    writeFileSync(join(root, rel), text);
  }
}
