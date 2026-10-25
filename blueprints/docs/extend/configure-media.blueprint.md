---
page: Configure media
type: task guide
---

# Configure media

:::reader
**Who reads it.** A Svelte-fluent web developer whose cairn site already has media on, as a scaffolded site does, and who works in the site's adapter module, its SvelteKit routes, and `wrangler.jsonc`. They arrive for different reasons, and the introduction names each reason so a reader learns early whether the page answers it. :fact[9hchnv] :fact[qifl9g] :fact[qtvesq]

**Why they arrive:**
- They want uploads to accept fewer image types, or to take larger or smaller files than the default. :fact[fnat1w] :fact[enuyhg]
- They want image URLs under a different base path, or in a shape that hides the file's name. :fact[ex4hss] :fact[s1n77t]
- Their zone has Cloudflare Image Transformations, and they want responsive images. :fact[kp50li]
- They want a build to fail when an entry names an image the media manifest has no row for, where it now ships a broken image. :fact[frgg7d]
- They want to know which references the Library counts before an editor deletes an asset that a page may still use. :fact[fn4zb7]
- Their site has a custom admin screen that uploads images. :fact[1mgfhj]

**What they already know.** The adapter module, SvelteKit catch-all routes and server endpoints, bindings in `wrangler.jsonc`, and how a form action answers a `fetch`. The page explains none of these.

**Background.** An image's bytes sit in an R2 bucket that the Worker reaches through a binding, and its record sits in the committed media manifest, `src/content/.cairn/media.json`. :fact[lu67dk] :fact[2hnxsr]
Content names an image by a `media:` reference. The resolver turns it into a URL from the manifest's row, and the media route serves the bytes at that URL. :fact[xjdhau] :fact[c8c9ji] :fact[qtvesq]
The adapter's `media` block holds every option the page sets, and the engine resolves it into the config the upload action and the route read. A scaffolded site resolves the same block again with `normalizeAssets` for its resolver. :fact[69rw88] :fact[qifl9g]

**What the page does for them.** The introduction opens on that model as a scaffolded site already wires it: the bucket binding, the adapter's `media` block, the public resolver, and the media route. It says the page changes how those pieces behave and does not set them up. :fact[9hchnv] :fact[qifl9g] :fact[qtvesq]
The contract sentence follows. The steps set the upload limits, move or reshape the image URLs, turn on responsive images, and make a missing asset fail the build. A concept section says which references the Library counts as a use. An optional task covers uploading from a custom admin screen, and the page ends by checking each change on the deployed site.

**What it leaves to other pages, each named in the introduction:**
- The reference entries for the adapter's `media` member, `createMediaResolver`, `PublicRoutesConfig`, and `createMediaRoute` cover wiring each media piece on a hand-built site. [Before you begin](#before-you-begin) names the three pieces and links each entry.
- Theme your public site covers seeding local media while theming.
- Restrict admin access covers restricting who reaches the Library.
- Architecture covers why media bytes sit in R2.
- The editor documentation covers uploading and placing images as an editor. It has no page yet, so the introduction names it in words with no link.
:::

:::constraints
- Name the adapter module by its role. Give `src/theme/cairn.config.ts` as where a scaffolded site keeps it, and give no path for any other site. :fact[q07rd5]
- Code examples edit a scaffolded site's files. Frame each as an excerpt, and keep the scaffold's names `media`, `publicMediaResolver`, and `MEDIA_BUCKET`. :fact[qifl9g] :fact[9hchnv]
- Give a Cloudflare specific, such as a plan's request-body limit or how to turn on Image Transformations, as a link to Cloudflare's page, never as a copied figure or dashboard path.
- Say `allowedTypes` narrows the sniffed types. Never say it can add a type, accept HEIC or SVG, or throw on an entry it does not know. :fact[enuyhg]
- Give the upload action's refusals as reasons inside the action's JSON envelope, never as HTTP response statuses. :fact[g4cwcw]
- Use the Library's words "no references found" for an asset with no counted reference. :fact[fn4zb7]
- Never say `mediaUpload` adds an asset to the Library or commits a manifest row. :fact[h56lpd]
:::

## Before you begin

*Name what the steps assume, and send a reader whose site has no media yet to the reference entries that set it up.*

- The steps assume the following:
- A site with media on. A [scaffolded site](scaffolded-site-files.md) binds an R2 bucket as `MEDIA_BUCKET` in `wrangler.jsonc` and declares the adapter's `media` block as `{ bucketBinding: 'MEDIA_BUCKET' }`. :fact[9hchnv] :fact[2zytgf]
- The adapter module, which a scaffolded site keeps at `src/theme/cairn.config.ts`. There it builds `publicMediaResolver` from the committed manifest, and `src/chassis/public-routes.ts` passes it to the public routes as `resolveMedia`. :fact[q07rd5] :fact[qifl9g]
- The media route, which a scaffolded site mounts at `src/routes/media/[...path]/+server.ts` with `createMediaRoute`. :fact[qtvesq]
- A hand-built site with no media yet sets up three pieces first:
- An `r2_buckets` binding and the adapter's `media` block that names it. :fact[9hchnv] :fact[2zytgf]
- See [the `media` adapter member](../reference/core.md#media-adapter-member).
- A resolver from `createMediaResolver`, built over the committed manifest and `normalizeAssets` of the same block. The site passes it to `createPublicRoutes` as `resolveMedia`. Without it, a `media:` reference renders as a literal token. :fact[c8c9ji] :fact[fhnvn8] :fact[twqb0s]
- See [`createMediaResolver`](../reference/media.md#createmediaresolver).
- See [`PublicRoutesConfig`](../reference/delivery.md#publicroutesconfig).
- `createMediaRoute`, mounted at `<publicBase>/[...path]`. Under the default base, that path is `src/routes/media/[...path]/+server.ts`. :fact[ex4hss] :fact[fnat1w]
- See [`createMediaRoute`](../reference/sveltekit.md#createmediaroute).

## Set the upload limits

*Walk the reader through narrowing the accepted types and setting the size limit, with the rule each one runs into.*

- Both limits are members of the adapter's `media` block. The upload action reads them from the resolved config on every upload. :fact[69rw88]
- To set the upload limits, follow these steps:
1. In the adapter module, add `allowedTypes` to the `media` block, listing the image types uploads may store. :fact[fnat1w] :fact[enuyhg]
- The engine sniffs each upload's type from its bytes and stores JPEG, PNG, GIF, WebP, and AVIF. The default `allowedTypes` lists those five, and the list can only narrow them. :fact[enuyhg] :fact[fnat1w]
- A sniffed HEIC or unrecognized file is refused as `unsupported_type` whatever the list holds. So is an upload declared as `image/svg+xml`, `image/svg`, `text/html`, or `application/xml`, or one whose first non-whitespace byte is `<`. :fact[enuyhg]
2. In the same block, set `maxUploadBytes` to the largest upload in bytes. The default is 25 MB. :fact[fnat1w] :fact[6kdagb]
- Cloudflare caps a Worker's request body by the account's plan, and it answers a larger request with a 413 before the Worker runs. :fact[9awije]
- The effective limit is the lower of `maxUploadBytes` and that cap. :fact[ett331] :fact[9awije]
- See [Workers limits](https://developers.cloudflare.com/workers/platform/limits/#request-limits).
- Code: an excerpt of a scaffolded site's `media` constant in `src/theme/cairn.config.ts` with both limits set, allowing JPEG, PNG, and WebP and capping uploads at 10 MB. :fact[9hchnv] :fact[fnat1w] :source[/templates/waymark/src/theme/cairn.config.ts]

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

*Walk the reader through moving the URL base with its route, and choosing the URL shape, with the preview limit a moved base brings.*

- `publicBase` sets the path the engine's image URLs start with in rendered pages and in the Library's thumbnails. It doesn't move the media route, which the site mounts at the matching path. :fact[ex4hss]
- To move the image URLs to a new base, follow these steps:
1. In the adapter module, set `publicBase` in the `media` block to the new base, such as `/images`. The default is `/media`. :fact[ex4hss] :fact[fnat1w]
2. In `src/routes/`, add the route at the new base, such as `src/routes/images/[...path]/+server.ts`, with its catch-all param named `path`. :fact[ex4hss] :fact[qtvesq]
- A base with no route under it, or a param under another name, makes every generated image URL answer 404. :fact[ex4hss]
3. Keep the existing route at `src/routes/media/[...path]/+server.ts` for the edit page's live preview. :fact[9bmrzq] :fact[f4ulxz]
- The live preview still builds `/media/<slug>.<hash>.<ext>` paths whatever `publicBase` says. Without that route, preview images break under a moved base while published pages render. :fact[9bmrzq] :fact[ex4hss]
- The route reads only the URL's last segment. The same handler at both paths serves the preview's URLs and the published ones. :fact[f4ulxz] :fact[9bmrzq]
- To change the shape of the URLs under the base, set `urlForm` in the `media` block. :fact[s1n77t]
- A table, introduced by a sentence saying it lists the two shapes, gives `'slug'`, the default, as `<publicBase>/<slug>.<hash>.<ext>`, or `<publicBase>/<hash>.<ext>` for an asset with no slug, and `'opaque'` as `<publicBase>/<first two hash characters>/<hash>.<ext>`. The opaque form leaves out the file's name. :fact[s1n77t]
- Any other value throws `cairn: media urlForm must be "slug" or "opaque", got "<value>"` when the config is resolved. :fact[s1n77t]
- The route needs no change for either shape. :fact[f4ulxz]
- Neither change requires editing an entry. Content names images by `media:` reference, and the resolver builds each URL from the manifest's row. :fact[c8c9ji]

## Turn on responsive images

*Walk the reader through turning on transformations, and say what an image gains and when it gains nothing.*

- `transformations` tells the engine that Cloudflare Image Transformations is on for the site's zone. A Worker can't turn that zone setting on, and the flag only reports it. :fact[kp50li]
- To turn on responsive images, follow these steps:
1. In Cloudflare, turn on Image Transformations for the site's zone. :fact[kp50li]
- See [Transform images](https://developers.cloudflare.com/images/transform-images/).
2. In the adapter module, set `transformations: true` in the `media` block. :fact[kp50li]
- With `transformations` on, an image whose manifest row records its width gets a `srcset` of Cloudflare transform URLs. The `sizes` hint comes from its `:::figure` placement, and an image with no placement gets `100vw`. :fact[kp50li] :fact[wdmlys]
- An image gets no `srcset` when its width is unknown or too narrow to offer more than one width. With `transformations` off, every image gets its full-size path. :fact[wdmlys] :fact[2hnxsr]
- Either way, an image whose row records its width and height renders with those intrinsic dimensions. :fact[wdmlys]
- A site can't declare named transform presets. A theme that needs another size builds a `/cdn-cgi/image/<options>/<path>` URL itself. :fact[ckuow3]

## Fail the build on a missing asset

*State what a missing asset does by default, then walk the reader through wrapping the resolver so the build fails, keeping the image detail the wrapper would drop.*

- By default, a `media:` image whose hash has no manifest row logs `media.resolve_missing` and renders as a broken image, and the build still succeeds. :fact[frgg7d]
- The broken image has `src="#"`, the class `cairn-broken-media`, and the title `Missing media asset`, and it keeps its alt text. :fact[frgg7d]
- On a site whose public pages prerender, as a scaffolded site's entry pages do, a resolver that throws on a miss fails the build instead. :fact[frgg7d] :fact[vo5v7n]
- On a scaffolded site, `publicMediaResolver` reaches the public pages twice: as the fallback in the adapter's `render`, and as `resolveMedia` in the public routes config. Wrapping it where it is defined covers both. :fact[qifl9g]
- The edit page's preview and the shared-draft preview each pass `render` a resolver in place of the site's. A preview therefore keeps marking a missing image broken. :fact[ax38pm]
- `createMediaResolver` returns a function that also carries an `imageDetail` property, which the render step reads for each image's intrinsic size and `srcset`. The public `MediaResolve` type doesn't declare it. :fact[nlkgag]
- To fail the build on a missing asset, follow these steps:
1. In the adapter module, rename the resolver that `createMediaResolver` builds, such as to `baseMediaResolver`. :fact[qifl9g]
2. In the same module, export `publicMediaResolver` as a function that calls `baseMediaResolver` and throws when it returns `undefined`. :fact[frgg7d] :fact[c8c9ji]
3. In the same module, copy `imageDetail` from `baseMediaResolver` onto the wrapper. :fact[nlkgag]
- Without the copy, the wrapped resolver's images render with no intrinsic size and no `srcset`. :fact[nlkgag]
- Code: an illustrative excerpt of a scaffolded site's `src/theme/cairn.config.ts`, framed as illustrative, that wraps the built resolver, throws a message naming the missing hash, and copies `imageDetail` across. :fact[qifl9g] :fact[nlkgag] :fact[frgg7d] :source[/templates/waymark/src/theme/cairn.config.ts]

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

*Explain which `media:` references the Library counts as a use, and what that means for deleting an asset.*

- An editor deleting an asset relies on the Library's count of references. The Library counts a `media:` reference in two places. :fact[fn4zb7] :fact[0s64g5]
- The first is the `src` of an `image` field, at the top level or nested at any depth in `object` and `array` fields. The second is a body image, the inner image of a `:::figure` included. :fact[fn4zb7]
- It counts references in the published content on the default branch and in every open `cairn/*` branch. :fact[fn4zb7]
- The Library doesn't count a reference in a text field, a link, a directive or component attribute, a raw HTML block, or a code span. For an asset named only in those places, it reads "no references found". :fact[fn4zb7]
- The Library refuses to delete an asset it finds in use until the editor types the asset's slug. An asset with no counted reference deletes with no such step. :fact[0s64g5]
- A delete removes the asset's manifest row, then its bytes in R2. A bulk delete removes only selected assets with no counted reference. :fact[0s64g5]
- The resolver never sees an uncounted reference. A page that still names a deleted asset that way keeps the reference as written. :fact[pobbuq]
- Where that reference is the asset's URL, such as in a raw HTML block, the media route answers it with 404. :fact[a7wwj2] :fact[0s64g5]
- The wrapper in [Fail the build on a missing asset](#fail-the-build-on-a-missing-asset) doesn't catch these references. :fact[pobbuq]

## Upload from a custom admin screen

*Walk the reader whose custom admin screen uploads images through the request, the response, and what the upload leaves uncommitted. A reader without such a screen skips it.*

- A custom admin screen uploads an image by posting the file to the admin's `mediaUpload` action. The action is part of the typed `CairnAdminRoutes` contract and wraps the upload action the edit page's image picker uses. :fact[1mgfhj] :fact[h56lpd]
- The action is gated to the Library's view, so the request goes to `/admin/media?/mediaUpload`. A post that reaches the admin catch-all at another admin path answers 404. :fact[0fg3ju] :fact[joo5f2]
- See [Writing an admin fetch action](../reference/sveltekit.md#writing-an-admin-fetch-action).
- To upload a file, follow these steps:
1. In the screen's component, read the CSRF token from the admin layout's data as `csrf`. :fact[xy1dj1]
2. In the upload handler, `fetch` `/admin/media?/mediaUpload` with method `POST`, the file's bytes as the body, and `redirect: 'manual'`. :fact[g4cwcw] :fact[lsuchw]
3. In the same request, set `Content-Type` to `text/plain` and `X-Cairn-CSRF` to the token. :fact[g4cwcw]
- SvelteKit refuses a form action's POST with a non-form content type before the action runs. The action ignores the label and sniffs the bytes. :fact[g4cwcw]
- The action also requires a positive integer `Content-Length`. The browser sets that header from the body, and a script can't set it. :fact[ett331] :fact[qr2tsn] :fact[lsuchw]
4. Optional: In the same request, set the headers that describe the file. :fact[g4cwcw]
- A table, introduced by a sentence saying it lists the optional headers, gives `X-Cairn-Filename`, `X-Cairn-Alt` (stored up to 160 characters), `X-Cairn-Display-Name`, `X-Cairn-Width`, and `X-Cairn-Height`. Each text value is URI-encoded. :fact[g4cwcw]
5. In the response handler, pass the response's text to SvelteKit's `deserialize` from `$app/forms`. :fact[lsuchw]
- A success envelope's `data` holds the `media:` `reference` and the manifest `record` the server derived. :fact[h56lpd]
- Each refusal the action makes arrives as a `failure` envelope whose `data.error` names the reason, with the HTTP status still 200. :fact[g4cwcw]
- A table, introduced by a sentence saying it lists the refusals a request's size and type cause, gives `length_required` for a missing or non-positive `Content-Length`, and `too_large` for a declared or actual size above `maxUploadBytes`. :fact[ett331]
- Its third row gives `unsupported_type` for bytes the sniff doesn't place in `allowedTypes`, whatever the declared type. :fact[g4cwcw] :fact[enuyhg]
- See [`media.upload_failed`](../reference/log-events.md) for every reason the action logs.
- A body over the plan's request limit never reaches the action. Cloudflare answers it with a real 413 first. :fact[9awije]
- The action stores the bytes in R2 and commits no manifest row. A `media:` reference to the asset resolves as missing until a row lands. :fact[h56lpd] :fact[c8c9ji]
- An entry save that posts the returned `record` in its `media` field commits the row. :fact[h56lpd]
- See [`createContentRoutes`](../reference/sveltekit.md#createcontentroutes).
- The Library's `mediaLibraryUpload` action, at `/admin/media?/mediaLibraryUpload`, takes the same request and commits the row to the default branch itself. :fact[h56lpd] :fact[0fg3ju]
- The typed `CairnAdminRoutes` contract leaves `mediaLibraryUpload` out. The action runs at runtime, and typed code reaches it only through a spread or a cast. :fact[1mgfhj]

## Verify the changes

*Have the reader check each change on the deployed site, in order, and match a failed check to its cause.*

- After you deploy, check each change you made. To verify, run these checks in order:
1. In the deployed admin, at `/admin/media`, upload an image of an allowed type under the size limit. The asset appears in the Library. :fact[joo5f2] :fact[xjdhau]
2. In an entry, place the image. :fact[xjdhau]
3. Publish the entry. The editor documentation covers both steps. :fact[xjdhau]
4. On the published page, inspect the image. Its `src` starts with your `publicBase` and has your `urlForm`'s shape. With `transformations` on and a recorded width of at least 800 pixels, the image also carries a `srcset`. :fact[ex4hss] :fact[s1n77t] :fact[kp50li]
5. In a terminal, request that `src` with `curl -s -D - -o /dev/null https://<your-site><src>`. :fact[fjnszk]
- The response carries `X-Content-Type-Options: nosniff`, `Content-Disposition: inline`, `Content-Security-Policy: default-src 'none'; sandbox`, and `Cache-Control: public, max-age=31536000, immutable`. :fact[fjnszk]
- Its `Content-Type` is the type the upload stored, such as `image/jpeg`. :fact[db0cx6] :fact[fjnszk]
6. If you wrapped the resolver, point an entry's image at a `media:` reference with no manifest row in a local branch. :fact[frgg7d]
7. Build the site. On a site whose public pages prerender, the build fails with the wrapper's message. :fact[frgg7d] :fact[vo5v7n]

- If a check fails, find its symptom in the following list. For a failure not listed here, see [Debug your site](debug-your-site.md).

:::row
**Symptom.** The upload fails, and the Worker logs `media.upload_failed` with `reason: 'too_large'`.
**Cause.** The file is larger than `maxUploadBytes`. :fact[ett331]
**Fix.** In the adapter module, raise `maxUploadBytes`, up to your plan's request-body limit, then deploy again. :fact[ett331] :fact[9awije]
:::

:::row
**Symptom.** The upload fails, and the Worker logs `media.upload_failed` with `reason: 'unsupported_type'`.
**Cause.** The sniffed type isn't in `allowedTypes`, or isn't one of the five types the engine stores. :fact[enuyhg]
**Fix.** If the type is one of the five, add it to `allowedTypes` and deploy again. Otherwise, convert the file to one of them. :fact[enuyhg]
:::

:::row
**Symptom.** A large upload fails with a 413 response, and the Worker logs no `media.upload_failed` record.
**Cause.** The body is over the Cloudflare plan's request-body limit, so Cloudflare refused it before the Worker ran. :fact[9awije]
**Fix.** Upload a smaller file, or see Cloudflare's Workers limits for the cap on each plan. :fact[9awije]
:::

:::row
**Symptom.** After a `publicBase` change, published images answer 404.
**Cause.** The media route isn't at `<publicBase>/[...path]`, or its catch-all param isn't named `path`. :fact[ex4hss]
**Fix.** Add the route at `<publicBase>/[...path]`, with its param named `path`, then deploy again. :fact[ex4hss]
:::

:::row
**Symptom.** After a `publicBase` change, images in the edit page's preview are broken while published pages render them.
**Cause.** The live preview builds `/media/` paths whatever `publicBase` says. :fact[9bmrzq]
**Fix.** Keep the handler mounted at `src/routes/media/[...path]/+server.ts` as well as at the new base. :fact[f4ulxz] :fact[9bmrzq]
:::

:::row
**Symptom.** With `transformations` on, an image has no `srcset`.
**Cause.** Its manifest row records no width, or the width is too narrow to offer more than one size. :fact[wdmlys]
**Fix.** None is needed. An image with only one candidate width renders at its full-size path. :fact[wdmlys]
:::

:::row
**Symptom.** With `transformations` on, the browser fails to load an image's `srcset` URLs.
**Cause.** Image Transformations is off for the zone. :fact[kp50li]
**Fix.** Turn on Image Transformations for the zone, or set `transformations` back to `false` and deploy again. :fact[kp50li]
:::

:::row
**Symptom.** After you wrap the resolver, published images lose their `width`, `height`, and `srcset`.
**Cause.** The wrapper doesn't carry the built resolver's `imageDetail`. :fact[nlkgag]
**Fix.** Copy `imageDetail` from the built resolver onto the wrapper. Step 3 of [Fail the build on a missing asset](#fail-the-build-on-a-missing-asset) shows the copy. :fact[nlkgag]
:::

:::row
**Symptom.** A custom screen's upload response has status 0 and an opaque type.
**Cause.** The editor's session expired. The guard answered with a redirect, and `redirect: 'manual'` returns it unfollowed as an opaque response. :fact[lsuchw]
**Fix.** Have the editor sign in again, then retry the upload. :fact[lsuchw]
:::

:::row
**Symptom.** A custom screen's upload answers 403, and the Worker logs `guard.refused` with `reason: 'csrf'`.
**Cause.** The request's `X-Cairn-CSRF` header is missing its value or carries a stale token, and the guard refused it before the action ran. :fact[9cztdn] :fact[g4cwcw]
**Fix.** Read the token from the admin layout's `csrf` data at upload time, not from a value saved earlier. :fact[xy1dj1]
:::

## See also

*Point the reader to the reference entries and pages around the media options.*

- The following pages cover the media pieces and the neighboring tasks, each named with one sentence on what it covers:
- The `media` adapter member's entry lists the members of the adapter's `media` block.
- See [the `media` adapter member](../reference/core.md#media-adapter-member).
- The media reference covers the config normalizer, the manifest reader, the `media:` codec, and the resolver.
- See [the media reference](../reference/media.md).
- The `createMediaRoute` entry covers the route that serves an image's bytes.
- See [`createMediaRoute`](../reference/sveltekit.md#createmediaroute).
- Log events lists every `media.*` record the engine logs.
- See [Log events](../reference/log-events.md).
- Add a custom admin screen covers mounting the screen an upload runs from.
- See [Add a custom admin screen](add-a-custom-admin-screen.md).
- Restricting the Library also restricts uploads from the image picker in every image-bearing editor. :fact[iewhzh]
- See [Restrict admin access](restrict-admin-access.md).
- Theme your public site covers seeding local media while theming.
- See [Theme your public site](theme-your-public-site.md).
