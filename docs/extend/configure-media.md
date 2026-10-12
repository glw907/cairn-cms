# Configure media

An image in a cairn site lives in two places. Its bytes sit in an R2 bucket that the site's Worker
reaches through a binding, and its record sits in the media manifest at
`src/content/.cairn/media.json`, committed JSON beside the content manifest. Content names an image
by a `media:` reference that resolves through the image's content hash. The image's URL comes from
the manifest's row rather than the reference, so renaming an asset never breaks a reference. The
engine supplies the upload action, the handler that serves the files, and the resolver that turns a
reference into a URL. The site supplies the bucket's binding in `wrangler.jsonc`, the adapter's
`media` block that names it, the SvelteKit route file the handler runs in, and the resolver its
public entry route receives. Media stays off until the adapter declares that block.

What the work involves depends on the site. The add-cairn tutorial's site keeps its adapter in
`src/lib/cairn.config.ts`, and its developer comes to turn media on. On a scaffolded site, whose adapter
is `src/theme/cairn.config.ts`, the binding, the block, the route, and the resolver are already in
place. That site's developer comes to change an option, or to learn what the engine refuses at
upload, what the media route serves, and what the Library counts as a use of an asset. A missing
asset renders as a broken image, and the build still succeeds unless the site makes it fail. You
declare the bucket on the adapter, set its options, mount the media route, hand the resolver to a
hand-built site's public pages, and confirm that an image uploaded through the Library renders from
your site with the route's headers.

Two other readers need one part of the page. A developer building an admin screen that uploads
finds the raw-body request the upload action takes, and its refusals, in
[Upload from your own screen](#upload-from-your-own-screen). A developer building the site's render
finds where the resolver it forwards comes from in
[Resolve media on public pages](#resolve-media-on-public-pages), and what a miss renders in
[Fail the build on a missing asset](#fail-the-build-on-a-missing-asset).

The page assumes you know SvelteKit catch-all routes and server endpoints, Worker bindings, and how
to create an R2 bucket. It assumes no knowledge of cairn beyond the adapter file and the site's
public entry route. The page doesn't cover the following topics, each of which another page owns:

- Seeding local media while you theme the site, in
  [Theme your public site](theme-your-public-site.md#iterate-locally).
- Restricting who reaches the Library, in [Restrict admin access](restrict-admin-access.md).
- Where R2 sits among the site's data stores, and why, in [Architecture](architecture.md#data-tiers).
- Bringing an existing site's images across, in [Migrate existing content](migrate-existing-content.md).
- Using the Library as an editor, which belongs to the editor documentation.

## Before you begin

The steps on this page need the following:

- An R2 bucket, bound to the Worker by an `r2_buckets` entry in `wrangler.jsonc`. Cloudflare's
  [Use R2 from Workers](https://developers.cloudflare.com/r2/api/workers/workers-api-usage/) page
  covers creating both. A scaffolded site binds `MEDIA_BUCKET` already.
- The adapter file, which is `src/theme/cairn.config.ts` on a scaffolded site and
  `src/lib/cairn.config.ts` on the tutorial's site. The tutorial writes it in
  [Write the site config and a minimal adapter](add-cairn-to-a-sveltekit-app.md#write-the-site-config-and-a-minimal-adapter).
- On the tutorial's site only, the entry route that
  [Render the entry](add-cairn-to-a-sveltekit-app.md#render-the-entry) creates.

A scaffolded site already declares the block, mounts the route, and wires the resolver. On such a
site, start at [Set the options](#set-the-options), then read from
[Fail the build on a missing asset](#fail-the-build-on-a-missing-asset) onward.

With the bucket bound, declare it on the adapter.

## Declare the bucket on the adapter

The adapter's `media` block turns media on, and its one required member, `bucketBinding`, names the
binding of an `r2_buckets` entry in `wrangler.jsonc`. A declared block with no `bucketBinding` throws
`cairn: a media assets block must name its R2 bucket binding` when the config is normalized.

To declare the bucket, follow these steps:

1. In `wrangler.jsonc`, confirm that `r2_buckets` holds an entry with a `binding` and a
   `bucket_name`, or add one:

   ```jsonc
   // wrangler.jsonc
   {
     "r2_buckets": [
       { "binding": "MEDIA_BUCKET", "bucket_name": "<bucket>" }
     ]
   }
   ```

2. In the adapter file, declare the block as a constant named `media`, and pass it to
   `defineAdapter` as its `media` member.
   On the tutorial's site, the adapter is `src/lib/cairn.config.ts`:

   <!-- snippet-check-skip: elides the adapter's required content, backend, email, and rendering groups -->
   ```ts
   // src/lib/cairn.config.ts
   import { defineAdapter } from '@glw907/cairn-cms';
   import type { AssetConfig } from '@glw907/cairn-cms/media';

   const media: AssetConfig = { bucketBinding: 'MEDIA_BUCKET' };

   export const cairn = defineAdapter({
     // content, backend, email, and rendering stay as the tutorial wrote them
     media,
   });
   ```

   The `AssetConfig` annotation keeps a `urlForm` you add later typed as one of its two values. The
   resolver in [Resolve media on public pages](#resolve-media-on-public-pages) passes the same
   constant to [`normalizeAssets`](../reference/media.md#normalizeassets).

If no `r2_buckets` entry carries the block's binding name, the
[`config.media-bucket-missing`](../reference/cli-cairn-doctor.md#the-checks) doctor check warns
before a deploy. At request time, a binding missing from the Worker makes the media route answer 503.

The engine resolves the block into one config that holds every member, with a default for each
member you omit. The media route and the upload action both read that config, so an option you set
reaches both.

Next, choose the options, or keep the defaults.

## Set the options

The block's five optional members bound uploads (`allowedTypes`, `maxUploadBytes`), shape image URLs
(`publicBase`, `urlForm`), and turn on responsive images (`transformations`).

- In the adapter file, add each option you change to the `media` constant.

The following table lists each option, its default, and what it does:

| Option | Default | What it does |
| --- | --- | --- |
| `allowedTypes` | `image/jpeg`, `image/png`, `image/webp`, `image/gif`, `image/avif` | Limits the types an upload is stored as |
| `maxUploadBytes` | 25 MB | Caps an upload's size |
| `publicBase` | `/media` | Sets the prefix of every image URL the engine writes |
| `urlForm` | `'slug'` | Sets the shape of an image URL |
| `transformations` | `false` | Declares that Image Transformations is on for the zone |

`allowedTypes` can only narrow the five types the engine stores. The engine sniffs each upload's
bytes and refuses a sniffed HEIC or unrecognized file as `unsupported_type` whatever the list says.
It also refuses an upload declared as SVG, HTML, or XML, or one whose first non-whitespace byte is
`<`. Listing another type adds nothing.

Cloudflare caps a Worker's request body by the account plan and answers a larger request with a 413
of its own. The effective ceiling is the lower of `maxUploadBytes` and that cap, so raising
`maxUploadBytes` past the cap does nothing. Cloudflare's
[Workers limits](https://developers.cloudflare.com/workers/platform/limits/#request-limits) page gives
the cap for each plan.

`publicBase` moves every URL the engine writes, in rendered pages, the editor, and the Library, but
it doesn't move the route. The route's directory must match `publicBase`.
[Mount the media route](#mount-the-media-route) shows the placement.

`urlForm` is `'slug'` or `'opaque'`, and any other value throws
`cairn: media urlForm must be "slug" or "opaque"` when the config is normalized. The slug form writes
`<publicBase>/<slug>.<hash>.<ext>`, and the opaque form writes
`<publicBase>/<first two hash characters>/<hash>.<ext>`. The route reads only the last path segment
and serves either form.

`transformations` tells the engine that Cloudflare
[Image Transformations](https://developers.cloudflare.com/images/optimization/transformations/overview/)
is on for the zone. That is a zone setting the dashboard or API turns on, and a Worker can't change it.
Set `transformations` to `true` only after you turn the zone setting on. With it `false`, an image
gets the bare full-size path. With it `true`, an image whose width is known also gets a `srcset`
built from Cloudflare transform URLs. Either way, an image whose dimensions are known carries
intrinsic `width` and `height` attributes. The
[`createMediaResolver`](../reference/media.md#createmediaresolver) entry gives the width ladder, the
`sizes` hint, and the cases where an image gets no `srcset`.

The engine's transform vocabulary is four built-in presets, `thumb`, `inline`, `card`, and `hero`,
and a site can't add one. For another size, build a `/cdn-cgi/image/<options>/<path>` URL yourself,
in the format Cloudflare's [Images features](https://developers.cloudflare.com/images/optimization/features/)
page sets out.

With the options chosen, mount the route that serves the files.

## Mount the media route

The route must sit at `<publicBase>/[...path]`, which is `src/routes/media/[...path]/+server.ts`
under the default base, with the catch-all param named `path`. A route anywhere else, or a param
under another name, makes every generated image URL 404.

Under the default base, the route sits at this location:

```text
your-site/
└── src/
    └── routes/
        └── media/
            └── [...path]/
                └── +server.ts
```

A different `publicBase` renames the `media` directory.

- In the route directory, create `+server.ts`:

  ```ts
  // src/routes/media/[...path]/+server.ts
  import { createMediaRoute } from '@glw907/cairn-cms/sveltekit';
  import { runtime } from '#lib/cairn.server.js';

  export const GET = createMediaRoute({ runtime });
  ```

  The file imports `runtime` from the module that
  [Compose the runtime and the admin](add-cairn-to-a-sveltekit-app.md#compose-the-runtime-and-the-admin)
  creates.

The route reads only the last path segment's hash and extension, and it ignores the slug and any
fan-out directory. It checks for a 16-character hex hash and an allow-listed image extension before
it reads the bucket. Because it sits outside `/admin`, it sets its own security headers on every
response that serves an object:

- `X-Content-Type-Options: nosniff`
- `Content-Disposition: inline`
- `Content-Security-Policy: default-src 'none'; sandbox`
- `Cache-Control: public, max-age=31536000, immutable`

An object stored with no media type is served as `application/octet-stream`. The
[`createMediaRoute`](../reference/sveltekit.md#createmediaroute) entry covers the route's full
behavior.

On a hand-built site, wire the public pages next.

## Resolve media on public pages

A hand-built site's public pages resolve `media:` references only once the entry route receives a
resolver built by `createMediaResolver`. Without one, every `media:` reference renders as a literal
token.

To wire the public pages, follow these steps:

1. In `src/lib/cairn.config.ts`, export a resolver built from the committed manifest and the same
   `media` constant:

   <!-- snippet-check-skip: continues the adapter file that declares media in Declare the bucket on the adapter -->
   ```ts
   // src/lib/cairn.config.ts
   import {
     createMediaResolver,
     normalizeAssets,
     readCommittedManifest,
   } from '@glw907/cairn-cms/media';

   // uses the media constant from Declare the bucket on the adapter

   export const mediaResolver = createMediaResolver(
     readCommittedManifest(
       import.meta.glob('/src/content/.cairn/media.json', { eager: true, import: 'default' }),
     ),
     normalizeAssets(media),
   );
   ```

   The `import.meta.glob` form lets a site with no `media.json` yet still build. A static import of
   the absent file fails the build.

2. In `src/routes/[...path]/+page.server.ts`, pass the resolver to `createPublicRoutes` as
   `resolveMedia`, and set `assetsEnabled` to `true`:

   ```ts
   // src/routes/[...path]/+page.server.ts
   import type { EntryGenerator, PageServerLoad } from './$types';
   import { createPublicRoutes } from '@glw907/cairn-cms/delivery';
   import { cairn, mediaResolver, siteConfig } from '#lib/cairn.config.js';
   import { origin, site } from '#lib/content.js';

   export const prerender = true;

   const routes = createPublicRoutes({
     site,
     render: cairn.rendering.render,
     origin,
     siteName: siteConfig.siteName,
     description: siteConfig.description ?? '',
     resolveMedia: mediaResolver,
     assetsEnabled: true,
   });

   export const entries: EntryGenerator = () => routes.entries();

   export const load: PageServerLoad = ({ url }) => routes.entryLoad({ url });
   ```

   `assetsEnabled` only makes the engine log `media.resolver_absent` if a later edit drops
   `resolveMedia`.

For a hash with no manifest row, the resolver returns `undefined`. The
[`PublicRoutesConfig`](../reference/delivery.md#publicroutesconfig) and
[`createMediaResolver`](../reference/media.md#createmediaresolver) entries give the full signatures.

To catch a missing asset before it ships, make the build fail on one.

## Fail the build on a missing asset

A `media:` image with no manifest row logs `media.resolve_missing` and renders as a broken image, and
the build still succeeds. The image gets `src="#"`, the class `cairn-broken-media`, and the title
`Missing media asset`, and it keeps its alt text. A dangling `cairn:` link fails the prerender
instead.

- In the adapter file, wrap the resolver so it throws when it returns `undefined`. On the tutorial's
  site, replace `mediaResolver` in `src/lib/cairn.config.ts`. On a scaffolded site, wrap
  `publicMediaResolver` in `src/theme/cairn.config.ts`.

  <!-- snippet-check-skip: continues the adapter file that declares media in Declare the bucket on the adapter -->
  ```ts
  // src/lib/cairn.config.ts
  import {
    createMediaResolver,
    normalizeAssets,
    readCommittedManifest,
    type MediaResolve,
  } from '@glw907/cairn-cms/media';

  // uses the media constant from Declare the bucket on the adapter

  const baseResolver = createMediaResolver(
    readCommittedManifest(
      import.meta.glob('/src/content/.cairn/media.json', { eager: true, import: 'default' }),
    ),
    normalizeAssets(media),
  );

  export const mediaResolver: MediaResolve = (ref) => {
    const path = baseResolver(ref);
    if (path === undefined) throw new Error(`Missing media asset: ${ref.hash}`);
    return path;
  };

  // Copy the side channel the render step reads for each image's size and srcset.
  Object.assign(mediaResolver, { imageDetail: Reflect.get(baseResolver, 'imageDetail') });
  ```

  > **Caution:** The built-in resolver carries an `imageDetail` property that the render step reads for each image's intrinsic size and `srcset`. The property isn't on the public `MediaResolve` type. A new function drops it, and the wrapped resolver's images then render with neither, unless the wrapper copies `imageDetail` across.

Before you delete an asset, know what the Library can see.

## Asset references the Library counts

The Library counts a `media:` reference only in an image field's `src` and in a body image, so "no
references found" never proves that an asset is unused. It counts the `src` of every `image`-typed
field, at the top level or nested at any depth in `object` and `array` fields, and every body image
node, a `:::figure`'s inner image included. It looks in the published manifest on `main` and in every
open `cairn/*` branch. A reference in a text field, a link, a directive or component attribute, a raw
HTML block, or a code span is not counted. Deleting an asset that only an uncounted reference names
leaves its page with a missing asset, the case [Fail the build on a missing asset](#fail-the-build-on-a-missing-asset)
covers.

If your site uploads from a screen of its own, build that request next; otherwise, go on to the
verification.

## Upload from your own screen

The `mediaUpload` action takes the file's raw bytes as a `text/plain` body. The action
belongs to the `/admin/media` view, and the request needs `Content-Length` and `X-Cairn-CSRF`
headers. The
[admin shell's reference entry](../reference/admin.md#cairnadminshell) says where a screen reads the
`X-Cairn-CSRF` value.

The request may also carry the following optional headers, each URI-encoded:

- `X-Cairn-Filename`
- `X-Cairn-Alt`
- `X-Cairn-Display-Name`
- `X-Cairn-Width`
- `X-Cairn-Height`

The engine caps `X-Cairn-Alt` at 160 characters.

Every refusal arrives as a `fail()` inside SvelteKit's 200 JSON action envelope. Read `type` and
`status` from the response body, never from the HTTP status. The
[Writing an admin fetch action](../reference/sveltekit.md#writing-an-admin-fetch-action) section shows
the request and the envelope.

Three refusals depend on the request your screen sends:

| Reason | When the action refuses |
| --- | --- |
| `length_required` | The request has no positive integer `Content-Length` |
| `too_large` | The declared or actual size is greater than `maxUploadBytes` |
| `unsupported_type` | The sniffed bytes aren't an allowed type, whatever type the request declares |

In the envelope, `length_required` carries status 411 and `too_large` carries status 413. A body over
the plan's request limit never reaches the action. Cloudflare answers it first with an HTTP 413. The
[Log events](../reference/log-events.md) page lists the other refusal reasons. For what the action
returns, and when its record is committed, see the
[content routes reference](../reference/sveltekit.md#createcontentroutes).

With every piece in place, check the result end to end.

## Verify media

An image uploaded through the Library renders from a URL under your `publicBase`, and the route
serves it with its security headers.

To verify media, follow these steps:

1. In the deployed admin, at `/admin/media`, upload a JPEG to the Library.

   The Library stores and commits the file in one step.

2. In an entry, add the image.
3. In the same entry, publish it.
4. After the deploy, on the published page, inspect the image element.
5. In the element, confirm that its `src` starts with your `publicBase` and follows the `urlForm`
   shape.

   With `transformations` on, the element also carries a `srcset`.

6. In a terminal, request the image URL and print its response headers:

   ```bash
   curl -s -D - -o /dev/null https://<your-site><src>
   ```

7. In the output, confirm the four headers from [Mount the media route](#mount-the-media-route) and a
   media type of `image/jpeg`.

   The route serves the media type stored at upload.

When a check fails, work through [Diagnose a failed check](#diagnose-a-failed-check) in order.

## Diagnose a failed check

Each failed check points at one piece of the setup, and the following causes run in the order the
verification reaches them:

1. The upload is refused, and the Worker logs `media.upload_failed`, whose `reason` names the
   refusal. A `too_large` refusal points at `maxUploadBytes` in
   [Set the options](#set-the-options) and at the plan's request-body cap. A `length_required`
   refusal points at the `Content-Length` header in
   [Upload from your own screen](#upload-from-your-own-screen). An `unsupported_type` refusal points
   at `allowedTypes` and the five types the engine stores.
2. The page shows a literal `media:` token. The entry route has no resolver, and the
   [`media.resolver_absent`](debug-your-site.md#mediaresolver_absent) entry covers the fix.
3. The image renders broken, with the class `cairn-broken-media`. The asset has no manifest row.
   [Fail the build on a missing asset](#fail-the-build-on-a-missing-asset) shows how to catch it at
   build time.
4. The image URL answers 404. The route isn't at `<publicBase>/[...path]`, or its param isn't named
   `path`.
5. The image URL answers 503, and the Worker logs `media.delivery_failed` with
   `reason: 'binding_missing'`. The Worker has no binding under the block's `bucketBinding` name.
   Before a deploy, the [`config.media-bucket-missing`](../reference/cli-cairn-doctor.md#the-checks)
   doctor check reports the same mismatch as a warning.

## See also

The following pages cover the pieces this page links to:

- [The `media` adapter member](../reference/core.md#media-adapter-member) lists the block's members.
- [Media](../reference/media.md) documents `normalizeAssets` and `createMediaResolver`.
- [`createMediaRoute`](../reference/sveltekit.md#createmediaroute) documents the delivery route's full
  behavior.
- [Log events](../reference/log-events.md) lists the media log events and their reasons.
- [Restrict admin access](restrict-admin-access.md) restricts the Library, which also restricts the
  image picker in every image-bearing editor.
- [Theme your public site](theme-your-public-site.md#iterate-locally) seeds local media while you
  theme.
