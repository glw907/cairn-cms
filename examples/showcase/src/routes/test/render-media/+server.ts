// Internal fixture endpoint: render a markdown body that carries a `media:` reference, with a posted
// media record overlaid into a fresh resolver, through the site's own adapter render. It proves the
// vertical slice's render leg: a content `media:` handle rewrites to its delivery `/media/...` path,
// the same path the delivery route serves. Only exists when SHOWCASE_FAKE_BACKEND=1.
//
// This overlays the record the way Phase 2b's preview path will: the committed manifest is empty at
// build, so an in-flight upload's record is layered on top of it for the render rather than waiting
// for the save to land.
import { json, error } from '@sveltejs/kit';
import { normalizeAssets, makeMediaResolver, type MediaEntry } from '@glw907/cairn-cms/media';
import { cairn } from '$lib/cairn.config.js';

export async function POST({ request }) {
  if (process.env.SHOWCASE_FAKE_BACKEND !== '1') {
    error(404, 'Not found');
  }
  const { body, record } = (await request.json()) as { body: string; record: MediaEntry };
  // One-row manifest from the posted record, overlaid onto the (empty) committed manifest.
  const manifest = { [record.hash]: record };
  const resolveMedia = makeMediaResolver(manifest, normalizeAssets({ bucketBinding: 'MEDIA_BUCKET' }));
  const html = await cairn.render(body, { resolveMedia });
  return json({ html });
}
