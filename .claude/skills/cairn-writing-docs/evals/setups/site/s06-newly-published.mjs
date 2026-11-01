// Setup for S06-newly-published: the committed manifest carries the first-publish stamps an admin
// publish would have written (three posts and one page), and a stub send function waits in
// src/lib/notify.ts for the session to call.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const STAMPS = {
  'posts/2026-01-15-hello': '2026-01-15T16:00:00.000Z',
  'posts/2026-02-20-second': '2026-02-20T16:00:00.000Z',
  'posts/2026-05-01-spring-thaw': '2026-05-01T16:00:00.000Z',
  'pages/about': '2026-01-10T16:00:00.000Z',
};

const NOTIFY = `// The site's announcement sender. Replace the body with a call to the email provider.
export async function announcePost(post: { title: string; permalink: string }): Promise<void> {
  console.log(\`announce: \${post.title} \${post.permalink}\`);
}
`;

/** @param {string} root */
export default function setup(root) {
  const manifestPath = join(root, 'src/content/.cairn/index.json');
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  let stamped = 0;
  // The engine's canonical key order puts publishedAt right after draft, and the stale-manifest
  // check compares the serialized form, so a stamped row is rebuilt with the key in that place.
  manifest.entries = manifest.entries.map((entry) => {
    const stamp = STAMPS[`${entry.concept}/${entry.id}`];
    if (!stamp) return entry;
    stamped++;
    return Object.fromEntries(
      Object.entries(entry).flatMap(([key, value]) => (key === 'draft' ? [[key, value], ['publishedAt', stamp]] : [[key, value]])),
    );
  });
  if (stamped !== Object.keys(STAMPS).length) throw new Error(`stamped ${stamped} manifest rows, expected ${Object.keys(STAMPS).length}`);
  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  mkdirSync(join(root, 'src/lib'), { recursive: true });
  writeFileSync(join(root, 'src/lib/notify.ts'), NOTIFY);
}
