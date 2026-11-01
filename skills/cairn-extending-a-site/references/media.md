# Configure media

Every media option lives in the adapter's `media` block (`AssetConfig`, `src/theme/cairn.config.ts`
on a scaffold), named by its R2 binding (`bucketBinding: 'MEDIA_BUCKET'`). Content names an image by
a `media:` reference; the resolver builds the URL from the asset's manifest row
(`src/content/.cairn/media.json`), so no option below needs a content edit. A URL typed into raw HTML
is not a reference and follows no option.

Contents:

- [Upload limits](#upload-limits)
- [Image URLs](#image-urls)
- [Responsive images](#responsive-images)
- [Fail the build on a missing asset](#fail-the-build-on-a-missing-asset)
- [What the Library counts as a use](#what-the-library-counts-as-a-use)
- [Upload from a custom screen](#upload-from-a-custom-screen)
- [Hand-built wiring](#hand-built-wiring)

## Upload limits

- `allowedTypes` narrows the five stored types (`image/jpeg`, `image/png`, `image/gif`,
  `image/webp`, `image/avif`); it cannot widen them. The type is sniffed from the bytes. HEIC,
  unknown bytes, SVG, HTML, XML, and anything starting with `<` are always refused.
- `maxUploadBytes` defaults to 25 MB. Cloudflare's plan body cap also applies and answers a plain 413.
- Both apply to new uploads only. Narrowing `allowedTypes` leaves stored assets and their manifest
  rows serving; never delete a row or an asset because its type is no longer allowed.

```ts
import type { AssetConfig } from '@glw907/cairn-cms';

const media: AssetConfig = {
  bucketBinding: 'MEDIA_BUCKET',
  allowedTypes: ['image/jpeg', 'image/png', 'image/webp'],
  maxUploadBytes: 8 * 1024 * 1024,
  publicBase: '/images',
  urlForm: 'opaque',
};
```

Refusals log `media.upload_failed` with `too_large` or `unsupported_type`.

## Image URLs

| Option | Value | URL |
|---|---|---|
| `publicBase` | default `/media` | the path every image URL starts with |
| `urlForm: 'slug'` | default | `<publicBase>/<slug>.<hash>.<ext>` (or `<hash>.<ext>` with no slug) |
| `urlForm: 'opaque'` | no file name | `<publicBase>/<first two hash chars>/<hash>.<ext>` |

Any other `urlForm` throws `cairn: media urlForm must be "slug" or "opaque", got "<value>"`.

Moving the base takes a route at the new base. `publicBase` moves the URLs, not the route:

1. Set `publicBase` (and `urlForm`) in the `media` block.
2. Add `src/routes/<base>/[...path]/+server.ts` (for example `src/routes/images/[...path]/+server.ts`)
   that exports `createMediaRoute`. The catch-all param must be named `path`: the handler reads
   `event.params.path` and takes the hash and extension from its last segment. Another name, or no
   route, makes every image 404.

   ```ts
   // src/routes/images/[...path]/+server.ts
   import { createMediaRoute } from '@glw907/cairn-cms/sveltekit';
   import { runtime } from '#chassis/cairn.server.js';

   export const GET = createMediaRoute({ runtime });
   ```

3. Keep `src/routes/media/[...path]/+server.ts`. The editor's live preview builds `/media/...` paths
   whatever `publicBase` says, and `cairn-media-seed` downloads `/media/<slug>.<hash>.<ext>`. Without
   that route, preview images break while published pages render. The same handler serves both
   shapes at both bases. Say in your reply that it was kept on purpose.

## Responsive images

`transformations: true` reports that Cloudflare Image Transformations is on for the zone (a Worker
cannot turn it on; enable it in the dashboard first). An image whose row records a width of at least
800 pixels then gets a `srcset` of `/cdn-cgi/image/` URLs, with `sizes` from its `:::figure`
placement (`100vw` otherwise). There are no named presets; a theme that needs another size builds
the `/cdn-cgi/image/<options>/<path>` URL itself.

## Fail the build on a missing asset

By default a `media:` reference with no manifest row logs `media.resolve_missing` and renders
`src="#"` with class `cairn-broken-media`, and the build passes. To fail a prerendered build instead,
pass `{ strict: true }` as the third argument to `createMediaResolver`, where the adapter module
defines it (on a scaffold `publicMediaResolver` feeds both `render` and the public routes'
`resolveMedia`, so one change covers both). A miss with media on throws a `cairn:`-prefixed error;
media off stays silent, and the resolver keeps its `imageDetail`. Previews keep marking misses
broken, since they pass their own resolver.

<!-- snippet-check-skip: continues the scaffold's adapter module, which declares mediaManifest and resolvedAssets -->
```ts
export const publicMediaResolver = createMediaResolver(mediaManifest, resolvedAssets, { strict: true });
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
URI-encoded), `X-Cairn-Width`, `X-Cairn-Height` (send them, or the asset gets no `srcset`). Parse the
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

A site with no media needs three pieces: an `r2_buckets` binding plus the `media` block; a resolver
from `createMediaResolver(manifest, normalizeAssets(media))` passed to `createPublicRoutes` as
`resolveMedia` (without it hero images vanish and `media.resolver_absent` logs when `assetsEnabled`
is set); and a `createMediaRoute` handler at `<publicBase>/[...path]`.

The serve route answers with `X-Content-Type-Options: nosniff`, `Content-Disposition: inline`,
`Content-Security-Policy: default-src 'none'; sandbox`, and a one-year immutable `Cache-Control`.
