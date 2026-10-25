# Configure media

On a cairn site, an image's bytes sit in an R2 bucket that the Worker reaches through a binding, and its record sits in the committed media manifest, `src/content/.cairn/media.json`. Content names an image by a `media:` reference. A resolver turns the reference into a URL from the image's manifest row, and the media route serves the bytes at that URL. Because the URL comes from the row and not from the reference, renaming an asset never breaks a reference. The adapter's `media` block holds the options for all of this, and the engine resolves the block into the config that the upload action and the media route read.

A scaffolded site has every piece in place. Its `wrangler.jsonc` binds the bucket as `MEDIA_BUCKET`, and its adapter module declares the `media` block that names that binding. The same module resolves the block a second time with `normalizeAssets` to build `publicMediaResolver` for the public pages, and `src/routes/media/[...path]/+server.ts` serves the files. This page changes how those pieces behave on a site that already has them, and it doesn't set them up. A developer arrives here with one of the following aims:

- Uploads should accept fewer image types than the defaults, or take larger or smaller files.
- Image URLs should start with a different base path, or take a shape that leaves out the file's name.
- The site's zone has Cloudflare Image Transformations, and its images should be responsive.
- The build should fail when an entry names an image that the media manifest has no row for, where it now ships a broken image.
- The developer needs to know which references the Library counts before an editor deletes an asset that a page may still use.
- A custom admin screen on the site uploads images.

The steps set the upload limits, move or reshape the image URLs, turn on responsive images, and make a missing asset fail the build. A concept section then says which references the Library counts as a use of an asset. An optional task covers uploading from a custom admin screen, and the page ends by checking each change on the deployed site. The page assumes that you know the site's adapter module, SvelteKit catch-all routes and server endpoints, Worker bindings, and SvelteKit form actions. It leaves the following topics to other pages:

- Wiring each media piece on a hand-built site, in the reference entries that [Before you begin](#before-you-begin) links.
- Seeding local media while you theme the site, in [Theme your public site](theme-your-public-site.md).
- Restricting who reaches the Library, in [Restrict admin access](restrict-admin-access.md).
- Why media bytes sit in R2, in [Architecture](architecture.md).
- Uploading and placing images as an editor, in the editor documentation.

## Before you begin

The steps assume a site with media on, wired as a scaffolded site wires it:

- An R2 bucket binding and the `media` block that names it. A [scaffolded site](scaffolded-site-files.md) binds the bucket as `MEDIA_BUCKET` in `wrangler.jsonc` and declares the block as `{ bucketBinding: 'MEDIA_BUCKET' }`.
- The adapter module, which a scaffolded site keeps at `src/theme/cairn.config.ts`. That module builds `publicMediaResolver` from the committed manifest, and `src/chassis/public-routes.ts` passes it to the public routes as `resolveMedia`.
- The media route, which a scaffolded site mounts at `src/routes/media/[...path]/+server.ts` with `createMediaRoute`.

A hand-built site with no media yet sets up three pieces first, each covered by a reference entry:

- An `r2_buckets` binding in `wrangler.jsonc` and the adapter's `media` block that names it. See [the `media` adapter member](../reference/core.md#media-adapter-member).
- A resolver built by `createMediaResolver` from the committed manifest and from `normalizeAssets` of the same block. The site passes it to `createPublicRoutes` as `resolveMedia`, and without it a `media:` reference renders as a literal token. See [`createMediaResolver`](../reference/media.md#createmediaresolver) and [`PublicRoutesConfig`](../reference/delivery.md#publicroutesconfig).
- A handler from `createMediaRoute`, mounted at `<publicBase>/[...path]`. Under the default base, that path is `src/routes/media/[...path]/+server.ts`. See [`createMediaRoute`](../reference/sveltekit.md#createmediaroute).

## Set the upload limits

Both limits are members of the adapter's `media` block, and the upload action reads them from the resolved config on every upload.

To set the upload limits, follow these steps:

1. In the adapter module, add `allowedTypes` to the `media` block, listing the image types that uploads may store.

   The engine sniffs each upload's type from its bytes, and it stores only JPEG, PNG, GIF, WebP, and AVIF. The default `allowedTypes` lists those five, and the list can only narrow them. A sniffed HEIC or unrecognized file is refused as `unsupported_type` whatever the list holds. So is an upload declared as `image/svg+xml`, `image/svg`, `text/html`, or `application/xml`, or one whose first non-whitespace byte is `<`.

2. In the same block, set `maxUploadBytes` to the largest upload size in bytes. The default is 25 MB.

   Cloudflare caps a Worker's request body by the account's plan, and it answers a larger request with a 413 error. The effective limit is the lower of `maxUploadBytes` and that cap. For the cap on each plan, see [Workers limits](https://developers.cloudflare.com/workers/platform/limits/#request-limits).

The following excerpt of a scaffolded site's `src/theme/cairn.config.ts` narrows the types to JPEG, PNG, and WebP and lowers the size limit:

<!-- snippet-check-skip: an excerpt of the scaffold's adapter module -->
```ts
// src/theme/cairn.config.ts (excerpt)
const media = {
  bucketBinding: 'MEDIA_BUCKET',
  allowedTypes: ['image/jpeg', 'image/png', 'image/webp'],
  maxUploadBytes: 10 * 1024 * 1024,
};
```

## Change the image URLs

`publicBase` sets the path that the engine's image URLs start with, in rendered pages and in the Library's thumbnails. It doesn't move the media route, which the site mounts at the matching path.

To move the image URLs to a new base, follow these steps:

1. In the adapter module, set `publicBase` in the `media` block to the new base, such as `/images`. The default is `/media`.
2. In `src/routes/`, add the media route at the new base, such as `src/routes/images/[...path]/+server.ts`, with its catch-all param named `path`.

   A base with no route under it, or a route whose param has another name, makes every generated image URL answer 404.

3. In `src/routes/`, keep the existing route at `media/[...path]/+server.ts` for the edit page's live preview.

   The live preview builds `/media/<slug>.<hash>.<ext>` paths whatever `publicBase` says. Without that route, preview images break under a moved base while published pages render them. The route reads only the URL's last path segment. The same handler at both paths serves the preview's URLs and the published ones.

`urlForm` sets the shape of the URLs under the base.

- In the adapter module, set `urlForm` in the `media` block to one of the two values in the following table.

The following table lists the URL shape each `urlForm` value writes:

| Value | URL shape |
| --- | --- |
| `'slug'` (the default) | `<publicBase>/<slug>.<hash>.<ext>`, or `<publicBase>/<hash>.<ext>` for an asset with no slug |
| `'opaque'` | `<publicBase>/<first two hash characters>/<hash>.<ext>` |

The opaque form leaves out the file's name. Any other value throws `cairn: media urlForm must be "slug" or "opaque", got "<value>"` when the config is normalized. The media route serves either shape with no change.

Neither change requires an edit to any entry. Content names images by `media:` reference, and the resolver builds each URL from the manifest's row.

## Turn on responsive images

`transformations` tells the engine that Cloudflare Image Transformations is on for the site's zone. A Worker can't turn that zone setting on, and the flag only reports it.

To turn on responsive images, follow these steps:

1. In Cloudflare, turn on Image Transformations for the site's zone.

   For the steps, see [Transform images](https://developers.cloudflare.com/images/transform-images/).

2. In the adapter module, set `transformations: true` in the `media` block.

With `transformations` on, an image whose manifest row records its width gets a `srcset` of Cloudflare transform URLs. The `sizes` hint comes from the image's `:::figure` placement, and an image with no placement gets `100vw`. An image gets no `srcset` when its width is unknown or too narrow to offer more than one width. With `transformations` off, every image gets its full-size path. Either way, an image whose row records its width and height renders with those intrinsic dimensions.

A site can't declare named transform presets. A theme that needs another size builds a `/cdn-cgi/image/<options>/<path>` URL itself.

## Fail the build on a missing asset

By default, a `media:` image whose hash has no manifest row logs `media.resolve_missing` and renders as a broken image, and the build still succeeds. The broken image has `src="#"`, the class `cairn-broken-media`, and the title `Missing media asset`, and it keeps its alt text. On a site whose public pages prerender, as a scaffolded site's entry pages do, a resolver that throws on a miss fails the build instead.

On a scaffolded site, `publicMediaResolver` reaches the public pages in two places. It is the fallback in the adapter's `render`, and it is `resolveMedia` in the public routes config. Wrapping it where it is defined covers both. The edit page's preview and the shared-draft preview each pass `render` a resolver in place of the site's. A preview therefore keeps marking a missing image broken.

`createMediaResolver` returns a function that also carries an `imageDetail` property. The render step reads that property for each image's intrinsic size and `srcset`, and the public `MediaResolve` type doesn't declare it.

To fail the build on a missing asset, follow these steps:

1. In the adapter module, give the resolver that `createMediaResolver` builds a new name, such as `baseMediaResolver`.
2. In the same module, export `publicMediaResolver` as a function that calls `baseMediaResolver` and throws when it returns `undefined`.
3. In the same module, copy `imageDetail` from `baseMediaResolver` onto the wrapper.

   Without the copy, the wrapped resolver's images render with no intrinsic size and no `srcset`.

The following illustrative excerpt of a scaffolded site's `src/theme/cairn.config.ts` shows the three steps:

<!-- snippet-check-skip: an excerpt of the scaffold's adapter module -->
```ts
// src/theme/cairn.config.ts (excerpt)
const baseMediaResolver = createMediaResolver(mediaManifest, resolvedAssets);

// Throw on a reference with no manifest row, so the build fails instead of shipping a broken image.
const failOnMissing: typeof baseMediaResolver = (ref) => {
  const url = baseMediaResolver(ref);
  if (url === undefined) throw new Error(`Missing media asset: ${ref.hash}`);
  return url;
};

// Keep the intrinsic size and srcset the render step reads from the built resolver.
Object.assign(failOnMissing, {
  imageDetail: (baseMediaResolver as { imageDetail?: unknown }).imageDetail,
});

export const publicMediaResolver = failOnMissing;
```

## Asset references the Library counts

An editor who deletes an asset relies on the Library's count of the asset's references. The Library counts a `media:` reference in two places:

- The `src` of an `image` field, at the top level or nested at any depth in `object` and `array` fields.
- A body image, including the inner image of a `:::figure`.

It counts references in the published content on `main` and in every open `cairn/*` branch. It doesn't count a reference in a text field, a link, a directive or component attribute, a raw HTML block, or a code span. An asset that only those places name shows "no references found" in the Library.

The Library refuses to delete an asset it finds in use until the editor types the asset's slug. An asset with no counted reference deletes with no such step. A delete removes the asset's manifest row first, and then its bytes in R2. A bulk delete removes only the selected assets that have no counted reference.

The resolver never sees an uncounted reference. A page that names a deleted asset only in those places keeps the reference as written. Where that reference is the asset's URL, as in a raw HTML block, the media route answers it with 404. The wrapper in [Fail the build on a missing asset](#fail-the-build-on-a-missing-asset) doesn't catch these references.

## Upload from a custom admin screen

A custom admin screen uploads an image by posting the file to the admin's `mediaUpload` action. The action is part of the typed `CairnAdminRoutes` contract, and it wraps the same upload action that the edit page's image picker posts to. The action is gated to the Library's view at `/admin/media`, so the request names the `mediaUpload` action on that path. A post to the action at any other admin path answers 404. For the general shape of an admin fetch action, see [Writing an admin fetch action](../reference/sveltekit.md#writing-an-admin-fetch-action).

To upload a file, follow these steps:

1. In the screen's component, read the CSRF token from the admin layout's data as `csrf`.
2. In the upload handler, use `fetch` to post the file's bytes as the body to the `mediaUpload` action on `/admin/media`, with `redirect: 'manual'`.
3. In the same request, set the content type to `text/plain` and `X-Cairn-CSRF` to the token.

   SvelteKit refuses a form action's POST that carries a non-form content type before the action runs. The action ignores the `text/plain` label and sniffs the bytes. The action also requires a positive integer `Content-Length`. The browser sets that header from the body, and a script can't set it.

4. Optional: In the same request, set the headers that describe the file.

   The following table lists the optional headers:

   | Header | Carries |
   | --- | --- |
   | `X-Cairn-Filename` | The file's name |
   | `X-Cairn-Alt` | The image's alt text, stored up to 160 characters |
   | `X-Cairn-Display-Name` | The name the Library shows for the asset |
   | `X-Cairn-Width` | The image's width in pixels |
   | `X-Cairn-Height` | The image's height in pixels |

   Each header's value is URI-encoded.

5. In the response handler, pass the response's text to SvelteKit's `deserialize` from `$app/forms`.

   A success envelope carries the `media:` `reference` and the manifest `record` that the server derived. Each refusal the action makes arrives as a `fail()` inside the 200 JSON action envelope, and its error names the reason.

   The following table lists the refusals that a request's size and type cause:

   | Reason | When the action refuses |
   | --- | --- |
   | `length_required` | The request has no positive integer `Content-Length` |
   | `too_large` | The declared or actual size is above `maxUploadBytes` |
   | `unsupported_type` | The sniffed type isn't in `allowedTypes`, whatever type the request declares |

   For every reason the action logs, see [`media.upload_failed`](../reference/log-events.md). A body over the plan's request limit never reaches the action. Cloudflare answers it first with an HTTP 413.

The action stores the bytes in R2 and commits no manifest row. Until a row lands, a `media:` reference to the asset resolves as missing. An entry save that posts the returned `record` in its `media` form field merges the row into `media.json`. For the save's form fields, see [`createContentRoutes`](../reference/sveltekit.md#createcontentroutes).

The Library's `mediaLibraryUpload` action, on the same `/admin/media` path, takes the same request and commits the row to the default branch itself. The typed `CairnAdminRoutes` contract leaves `mediaLibraryUpload` out. The action still runs at runtime, and typed code reaches it only through a spread or a cast.

## Verify the changes

On the deployed site, an allowed upload appears in the Library, and a published image carries your URL and responsive settings. The media route serves that image with its security headers.

To verify the changes, follow these steps:

1. In the deployed admin, at `/admin/media`, upload an image of an allowed type under the size limit.

   The asset appears in the Library.

2. In an entry, place the image.
3. In the same entry, publish it.

   The editor documentation covers placing and publishing an image.

4. On the published page, inspect the image element.

   Its `src` starts with your `publicBase` and has your `urlForm`'s shape. With `transformations` on and a recorded width wide enough to offer more than one size, the image also carries a `srcset`.

5. In a terminal, request the image's URL and print the response headers:

   ```bash
   curl -s -D - -o /dev/null https://<your-site><src>
   ```

   The response carries the following headers:

   - `X-Content-Type-Options: nosniff`
   - `Content-Disposition: inline`
   - `Content-Security-Policy: default-src 'none'; sandbox`
   - `Cache-Control: public, max-age=31536000, immutable`

   Its content type is the type the upload stored, such as `image/jpeg`.

6. If you wrapped the resolver, in a local branch, point an entry's image at a `media:` reference that has no manifest row.
7. In the site directory, build the site.

   On a site whose public pages prerender, the build fails with the wrapper's message.

The following table lists the symptoms a failed check can show, with each one's cause and fix:

| Symptom | Cause | Fix |
| --- | --- | --- |
| The upload fails with the refusal `too_large`. | The file is larger than `maxUploadBytes`. | In the adapter module, raise `maxUploadBytes`, up to your plan's request-body limit, then deploy again. |
| The upload fails with the refusal `unsupported_type`. | The sniffed type isn't in `allowedTypes`, or it isn't one of the five types the engine stores. | If the type is one of the five, add it to `allowedTypes` and deploy again. Otherwise, convert the file to one of the five. |
| A large upload fails with an HTTP 413 response, not a refusal inside a 200 envelope. | The body is over the request-body limit of the Cloudflare plan, so Cloudflare refused it before the Worker ran. | Upload a smaller file. For the cap on each plan, see [Workers limits](https://developers.cloudflare.com/workers/platform/limits/#request-limits). |
| After a `publicBase` change, published images answer 404. | The media route isn't at `<publicBase>/[...path]`, or its catch-all param isn't named `path`. | Add the route at `<publicBase>/[...path]`, with its param named `path`, then deploy again. |
| After a `publicBase` change, images in the edit page's preview are broken while published pages render them. | The live preview builds `/media/<slug>.<hash>.<ext>` paths whatever `publicBase` says. | Keep the handler mounted at `src/routes/media/[...path]/+server.ts` as well as at the new base. |
| With `transformations` on, an image has no `srcset`. | Its manifest row records no width, or the width is too narrow to offer more than one size. | None is needed. An image with only one candidate width renders at its full-size path. |
| With `transformations` on, the browser fails to load an image's `srcset` URLs. | Image Transformations is off for the zone. | Turn on Image Transformations for the zone, or set `transformations` back to `false` and deploy again. |
| After you wrap the resolver, published images lose their `width`, `height`, and `srcset`. | The wrapper doesn't carry the built resolver's `imageDetail`. | Copy `imageDetail` from the built resolver onto the wrapper. The third step of [Fail the build on a missing asset](#fail-the-build-on-a-missing-asset) shows the copy. |
| A custom screen's upload response has status 0 and an opaque type. | The editor's session expired. The guard answered with a redirect, and `redirect: 'manual'` returns it unfollowed as an opaque response. | Have the editor sign in again, then retry the upload. |
| A custom screen's upload is refused, and the Worker logs `guard.refused` with `reason: csrf`. | The request's `X-Cairn-CSRF` header is missing or carries a stale token, and the guard refused the request before the action ran. | Read the token from the admin layout's `csrf` data at upload time, not from a value saved earlier. |

For a failure the table doesn't list, see [Debug your site](debug-your-site.md).

## See also

The following pages cover the media pieces and the tasks beside this one:

- [The `media` adapter member](../reference/core.md#media-adapter-member) lists the members of the adapter's `media` block.
- [The media reference](../reference/media.md) covers the config normalizer, the manifest reader, the `media:` reference codec, and the resolver.
- [`createMediaRoute`](../reference/sveltekit.md#createmediaroute) covers the route that serves an image's bytes.
- [Log events](../reference/log-events.md) lists the log records the engine writes, the media records included.
- [Add a custom admin screen](add-a-custom-admin-screen.md) covers mounting the screen that an upload runs from.
- [Restrict admin access](restrict-admin-access.md) covers restricting the Library. A restricted Library also restricts uploads from the image picker in every image-bearing editor.
- [Theme your public site](theme-your-public-site.md) covers seeding local media while you theme the site.
