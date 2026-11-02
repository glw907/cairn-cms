# Configure media

The one media setting is the R2 binding on the adapter's `media` block (`MediaConfig`,
`src/theme/cairn.config.ts` on a scaffold): `bucketBinding: 'MEDIA_BUCKET'`. Content names an image
by a `media:` reference; the resolver builds the URL from the asset's manifest row
(`src/content/.cairn/media.json`), so no content edit follows a change here. A URL typed into raw
HTML is not a reference and resolves to nothing.

Contents:

- [Upload limits](#upload-limits)
- [Image URLs](#image-urls)
- [Fail the build on a missing asset](#fail-the-build-on-a-missing-asset)
- [What the Library counts as a use](#what-the-library-counts-as-a-use)
- [Upload from a custom screen](#upload-from-a-custom-screen)
- [Hand-built wiring](#hand-built-wiring)

## Upload limits

The limits are fixed. An upload is capped at 25 MB (Cloudflare's plan body cap also applies and
answers a plain 413). Five types are stored: `image/jpeg`, `image/png`, `image/gif`, `image/webp`,
and `image/avif`. The type is sniffed from the bytes. HEIC, unknown bytes, SVG, HTML, XML, and
anything starting with `<` are always refused.

```ts
import type { MediaConfig } from '@glw907/cairn-cms';

const media: MediaConfig = { bucketBinding: 'MEDIA_BUCKET' };
```

Refusals log `media.upload_failed` with `too_large` or `unsupported_type`.

## Image URLs

Every image URL is `/media/<slug>.<hash>.<ext>` (or `/media/<hash>.<ext>` with no slug), served by
one route at `src/routes/media/[...path]/+server.ts` that exports `createMediaRoute`. The catch-all
param must be named `path`: the handler reads `event.params.path` and takes the hash and extension
from its last segment. Another name, or no route, makes every image 404.

```ts
// src/routes/media/[...path]/+server.ts
import { createMediaRoute } from '@glw907/cairn-cms/sveltekit';
import { runtime } from '#chassis/cairn.server.js';

export const GET = createMediaRoute({ runtime });
```

A rendered `<img>` for a managed image carries `width` and `height` when the manifest row recorded
them, and no `srcset`. A theme that wants another size builds the `/cdn-cgi/image/<options>/<path>`
URL itself.

## Fail the build on a missing asset

By default a `media:` reference with no manifest row logs `media.resolve_missing` and renders
`src="#"` with class `cairn-broken-media`, and the build passes. To fail a prerendered build instead,
pass `{ strict: true }` as the third argument to `createMediaResolver`, where the adapter module
defines it (on a scaffold `resolveMedia` feeds both `render` and the public routes, so one change covers both). A miss with media on throws a `cairn:`-prefixed error;
media off stays silent, and the resolver keeps its `imageDetail`. Previews keep marking misses
broken, since they pass their own resolver.

<!-- snippet-check-skip: continues the scaffold's adapter module, which declares media and mediaManifest -->
```ts
export const resolveMedia = createMediaResolver(media, mediaManifest, { strict: true });
```

On a request-time page the throw becomes a 500.

## What the Library counts as a use

The Library counts `media:` in an `image` field's `src` (at any depth in `object` and `array`) and in
body images, including `:::figure`, across the default branch and every open `cairn/*` branch. It
does not count text fields, links, component attributes, raw HTML, or code spans. An asset named only
there shows "no references found" and deletes without the typed-slug confirm, after which a raw-HTML
URL to it 404s.

## Upload from a custom screen

POST the raw bytes to `/admin/media?/mediaUpload` (the action exists only on that path):
`fetch` with `redirect: 'manual'`, `Content-Type: text/plain` (SvelteKit admits only form types; the
action sniffs the bytes), `X-Cairn-CSRF` set to the admin layout data's `csrf` read at upload time.
Optional headers: `X-Cairn-Filename`, `X-Cairn-Alt` (160 chars), `X-Cairn-Display-Name` (all
URI-encoded), `X-Cairn-Width`, `X-Cairn-Height` (send them, or the rendered image carries no `width` and `height`). Parse the
response with `deserialize` from `$app/forms`: success `data` holds `reference` and `record`; a
failure's `data.error` is `length_required`, `too_large`, or `unsupported_type`. The action stores
bytes but commits no row: the asset resolves as missing until an entry save posts the `record` in
its `media` form field. A status-0 `opaqueredirect` means the session expired; a 403 with
`guard.refused` `reason: csrf` means a stale token.

To commit the row too, post to `/admin/media?/mediaLibraryUpload` with the same headers. It stores
the bytes and commits the `media.json` row to the main branch in one step, and a hash already in the
manifest succeeds as a no-op. `admin.actions.mediaLibraryUpload` is typed on `CairnAdminRoutes`, so
a custom screen reaches it with no cast.

## Hand-built wiring

A site with media needs three pieces: an `r2_buckets` binding plus the `media` block; a resolver
from `createMediaResolver(media, manifest)` passed to `createPublicRoutes` as `resolveMedia` (`null`
for a site with no media, which derives no hero image); and a `createMediaRoute` handler
at `/media/[...path]`.

The serve route answers with `X-Content-Type-Options: nosniff`, `Content-Disposition: inline`,
`Content-Security-Policy: default-src 'none'; sandbox`, and a one-year immutable `Cache-Control`.
