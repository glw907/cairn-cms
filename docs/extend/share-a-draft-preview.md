# Share a draft preview

Let an editor mint an opaque link so someone who isn't an editor, a stakeholder, a client, a
reviewer, can read a pending draft rendered through your site's own public composition, not an
approximated admin shell.

This is opt-in per site: the affordance ships on every upgraded edit screen, but nothing happens
until you apply the migration and mount the route.

## Apply the migration

```bash
cp node_modules/@glw907/cairn-cms/migrations/0003_preview.sql migrations/
npx wrangler d1 migrations apply your-site-auth --local
npx wrangler d1 migrations apply your-site-auth --remote
```

This adds one table, `preview_tokens`, to your existing `AUTH_DB`: a hashed token, the entry it
shares, the minting editor, and an expiry, indexed for the sweep and the revoke path. Until this
migration runs, both the mint and the revoke actions answer with an actionable failure naming the
migration rather than surfacing a raw database error, so the feature fails safely on an
unupgraded site instead of half-working.

## Mount the preview route

`previewLoad` renders a minted link through the same composition your entry pages already use, so
a preview and its eventual public page structurally can't drift apart. It needs your runtime and
the same `PublicRoutesConfig` shape [Wire the delivery surface](./wire-the-delivery-surface.md#the-entry-catch-all)
passes to `createPublicRoutes` for the entry catch-all. Build both from the same `siteName`,
`description`, and the rest, ideally by importing one shared object into both route files rather
than typing the values twice. Mount the preview route **inside the same route group as your entry
pages**, so it inherits the same layout, stylesheets, and chrome:

```ts
// src/routes/(site)/preview/[token]/+page.server.ts
import type { PageServerLoad } from './$types';
import { previewLoad } from '@glw907/cairn-cms/sveltekit';
import { runtime, cairn, siteConfig } from '$lib/cairn.config.js';
import { site, ORIGIN } from '$lib/content.js';

const routesConfig = {
  site,
  render: cairn.rendering.render,
  origin: ORIGIN,
  siteName: siteConfig.siteName,
  description: siteConfig.description,
};

// A preview link is a bearer credential. Prerendering this route would bake a token into a
// static asset every build ships.
export const prerender = false;

export const load: PageServerLoad = (event) => previewLoad(runtime, routesConfig, event);
```

```svelte
<!-- src/routes/(site)/preview/[token]/+page.svelte -->
<script lang="ts">
  import type { PageData } from './$types';
  import { PreviewBanner } from '@glw907/cairn-cms/components';
  import ArticleView from '$lib/components/ArticleView.svelte';

  let { data }: { data: PageData } = $props();
</script>

<PreviewBanner preview={data.preview} />
<ArticleView {data} preview />
```

Mounting outside the route group reproduces an unstyled page, the shape an earlier version of
this feature was rejected for; the group is what carries your site's stylesheets and chrome down
to this route.

## What the link is good for, and what it isn't

The token alone is the credential. `previewLoad` reads no cookie and touches neither
`locals.cairnEditor` nor `locals.cairnAccess`, so anyone holding the link can view the draft with
no sign-in of their own. It sets `cache-control: private, no-store`, `x-robots-tag: noindex,
nofollow`, and a locked-down `referrer-policy`/`x-frame-options` pair on every response, refusal
included, so a shared link doesn't leak into search results or a cache.

Two outcomes render a page rather than a 404. While the entry's pending branch still exists, the
draft renders with `preview.state: 'draft'`. Once the branch is gone, publish and discard both
delete it, and the entry has a live file on the default branch, the page instead renders "this
preview has ended," linking the real permalink; it never claims the *draft itself* went live,
since a discarded edit of an already-published entry reaches this same state. Every other
failure, a malformed token, an expired row, a concept or id mismatch, a genuinely gone branch with
nothing published, answers an identical, uninformative 404: the link either works or it doesn't,
with no signal that distinguishes "expired" from "never existed" to whoever's holding it.

## Minting and revoking

`previewMintAction` and `previewRevokeAction` are the entry-scoped actions the edit screen's
share panel already calls; you don't build these yourself unless you're mounting content routes
by hand rather than through the single-mount admin. A mint refuses with `fail(400)` when the
entry carries no pending draft to share. A revoke deletes every outstanding link for the entry in
one call and is idempotent: revoking with nothing minted still succeeds, reporting a count of
zero.

Renaming, deleting, or discarding a never-published entry each clear its outstanding preview rows
as part of their own cascade, closing an id-reuse gap where a stale link could otherwise resolve
to a different entry later. Publishing deliberately leaves the rows in place, since `previewLoad`
needs them to answer a now-stale link with "this preview has ended" instead of a bare 404.

## You know it worked when

Minting a link from a draft's edit screen returns a URL that renders the draft, styled like a
real page, to someone with no session at all. Publishing the entry turns that same link into the
"preview has ended" page rather than a 404, and revoking it turns any outstanding link for that
entry dead immediately.
