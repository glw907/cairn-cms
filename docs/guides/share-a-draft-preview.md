# Share a draft preview

An editor can hand a draft to someone who isn't an editor: a reviewer, a client, a co-founder.
cairn mints an opaque link from the edit screen and serves it through a page your site mounts
itself, `previewLoad`, which renders the draft through the exact composition your public entry
page uses. There's no neutral preview shell to configure: the fidelity is structural, because the
preview is a real page in your own app, with your stylesheets, your components, and your
hydrating islands.

This guide assumes [Wire the delivery surface](./wire-the-delivery-surface.md) is already done,
since the preview route reuses the `PublicRoutesConfig` your catch-all route already builds.

## Apply the migration

The share affordance needs one table in your `AUTH_DB`, `preview_tokens`: `token_hash` (the
digest, never the plaintext token), `concept`, `entry_id`, `editor` (the minting editor's email,
for the removal cascade), `expires_at`, and `created_at`, plus two indexes, one on `expires_at`
(the mint-time sweep) and one on `(concept, entry_id)` (the revoke and cleanup deletes). The engine
ships this schema in the package as `migrations/0003_preview.sql`. Copy it into your own
`migrations/` directory and apply it the same way you applied the auth schema in [Configure auth
and D1](./configure-auth-and-d1.md#provision-the-d1-database):

```sh
cp node_modules/@glw907/cairn-cms/migrations/0003_preview.sql migrations/
npx wrangler d1 migrations apply your-site-auth --local
npx wrangler d1 migrations apply your-site-auth --remote
```

It's opt-in and additive, the same discipline the packaged audit sink's migration follows: a site
that never mints a preview link never queries this table, and a site that hasn't applied the
migration yet sees the mint and revoke actions answer an actionable refusal naming the file, never
a raw D1 error.

The migration file's own header comment says "only a site that mints preview links ever touches
this table." That's slightly stale by the time you read it: a rename, a delete, or a discard of a
never-published entry also deletes that entry's rows, and removing an editor deletes every row
they minted. The table sees writes from more code paths than the comment names; the [lifecycle
section](#the-lifecycle-a-link-dies-with-its-branch) below is the complete picture.

## Mount the preview route

Mount `previewLoad` at `/preview/[token]`, **inside the same layout group as your entry pages**,
never in a sibling group or outside every group. The stylesheets and chrome a public entry renders
with live on that layout chain, not on the route itself, so mounting outside the group reproduces
an unstyled page: exactly the failure mode an earlier, rejected preview design (a neutral
typographic shell) was rejected for.

```ts
// src/routes/(site)/preview/[token]/+page.server.ts
import type { PageServerLoad } from './$types';
import { previewLoad } from '@glw907/cairn-cms/sveltekit';
import { runtime } from '$lib/cairn.server.js';
import { publicRoutesConfig } from '$lib/public-routes.js';

// REQUIRED: a preview link is a bearer credential. Whoever holds the URL reads the draft with no
// session, so prerendering this route would bake a token into a static asset every build ships.
// previewLoad itself throws a descriptive build-time error if this line is ever dropped, but state
// it here too rather than leaning on that backstop alone.
export const prerender = false;

export const load: PageServerLoad = (event) => previewLoad(runtime, publicRoutesConfig, event);
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

`publicRoutesConfig` has to be the same literal object your `(site)/[...path]/+page.server.ts`
hands `createPublicRoutes`, not a second copy: `previewLoad` composes the draft through
[`composeEntryData`](../reference/delivery.md#composeentrydata), the identical function your
public `entryLoad` calls, so passing the same config object makes drift between the two routes a
compile-time impossibility rather than a discipline you maintain by hand. If your entry template
applies its own augmentation beyond `EntryData` (a resolved reference edge, say), factor that
augmentation into one module both routes import, the way the showcase's `$chassis/entry-data.js`
does, so a change to it can't reach one route and not the other.

Two consequences follow from mounting inside a layout group SvelteKit otherwise treats like any
other route in it. First, every preceding parent layout `load` still runs, and it runs for an
anonymous visitor: no session, no `locals.cairnEditor`. Whatever that layout returns reaches the
serialized page payload the same way it reaches any other page under the group, so a site whose
group layout loads privileged data (a member's own dashboard state, say) should either branch that
load on the route or mount preview in a sibling group that carries no such layout, never assume the
preview route is somehow exempt from what its ancestors return. Second, none of your preceding
layouts may call `event.setHeaders` for any of the five names `previewLoad`
itself sets (`x-robots-tag`, `cache-control`, `referrer-policy`, `x-content-type-options`,
`x-frame-options`): SvelteKit throws a 500 on a duplicate `setHeaders` call for the same header
name, so a layout that already sets one of these for its own reasons needs to skip it specifically
on the preview route.

## Suppress the credential-shaped emissions

The preview URL is the credential. Your site's own chrome otherwise exports a page's URL to every
third party it reports to: analytics beacons, canonical links, `og:url`, a raw-markdown twin
route. A shared template that renders both the public entry and the preview receives either
`EntryData` or `PreviewData` (`EntryData` plus a `preview` key), so key the suppression on whether
`data` carries that key:

```ts
import type { EntryData } from '@glw907/cairn-cms/delivery';
import type { PreviewData } from '@glw907/cairn-cms/sveltekit';

declare const data: EntryData | PreviewData;

const seo =
  'preview' in data
    ? { ...data.seo, meta: data.seo.meta.filter((m) => m.property !== 'og:url'), links: data.seo.links.filter((l) => l.rel !== 'canonical') }
    : data.seo;
```

Do the same for a client-side analytics call and the `.md`-suffixed markdown twin link, if your
template emits either. Nothing in the engine forces this: `previewLoad` returns the full
`EntryData` shape unchanged, so a template that ignores `data.preview` renders a preview page that
quietly reports its own URL everywhere the public page does.

Interactive islands in your chrome stay **live** on the preview page for whoever holds the link:
the read kind fetches published state as usual, and the write kind (a signup form, a comment box)
is genuinely operational. That's a deliberate consequence of preview being a real page in your
app, not a limitation to work around. If you don't want an island active on a preview (a
newsletter signup a reviewer shouldn't be able to submit, say), gate it on the same `data.preview`
flag rather than expecting the engine to know your intent.

## Mint and revoke

The edit screen's own "Share preview" group, present by default (`previewMint`, both on
[`CairnAdmin`](../reference/components.md#cairnadmin) and forwarded to
[`EditPage`](../reference/components.md#editpage)), mints a link and copies it in one action, and
revokes every outstanding link for the entry in one more. Minting refuses on the page when the
entry carries no pending draft: a preview shares a draft, and there's nothing to share without
one. See [`previewMintAction` and `previewRevokeAction`](../reference/sveltekit.md#createcontentroutes)
for the full action contract, and [`mintPreviewToken`](../reference/sveltekit.md#mintpreviewtoken)
for the lower-level primitive those actions call.

**`previewMint` is presentational only.** Setting it to `false` hides the Share preview group from
the edit screen's markup. It does not turn off the `previewMint`/`previewRevoke` facade actions,
which stay mounted and carry their own full entry-scoped authorization
(`requireEntryFromParams`, the same check `saveAction` and `publishAction` run) regardless of
whether any UI links to them. Hiding the affordance is a product choice about what your editors
see, never an access-control decision; don't reach for it expecting to close the feature off for a
role. To do that, restrict the concept in your [access map](../reference/core.md#access-map)
instead, since minting shares a read on whatever the mint route already lets an editor reach.

The minted link's lifetime defaults to seven days and is configurable through
[`CairnAdminOptions.preview`](../reference/sveltekit.md#cairnadminoptions) (or
`ContentRoutesOptions.preview` on the per-route mounting), a `PreviewTokenConfig` with one field,
`ttlMs`, bounded between one minute and thirty days.

**Disambiguation.** Two unrelated seams share the word "preview." `CairnRuntime.preview`
(`PreviewConfig`) is your site's stylesheets and container classes for the admin editor's own
preview pane, resolved per entry as `EditData.preview`; it never leaves the admin and shares no
code with this feature. This guide covers the other one: a credentialed, unauthenticated read on
one draft for whoever holds a minted URL.

## The lifecycle: a link dies with its branch

Minting shares a pending branch (`cairn/<concept>/<id>`), so a preview link's life is tied to that
branch's life, not to its own expiry alone:

- **Publish or discard** deletes the branch, and `previewLoad` treats a gone branch as the signal
  to render the ended page: "this preview has ended," linking the live version when the entry's
  file exists on the default branch. The copy never claims the draft *went* live, since a
  discarded edit of an already-live entry reaches this same state and that claim would be false
  for it.
- **Discarding a draft that never published** is different: nothing exists on the default branch
  to fall back to, so the link answers a plain 404 instead of the ended page, and its
  `preview_tokens` rows are deleted as part of the discard, closing an id-reuse collision where a
  stale link could later resolve to a different entry's later draft. **Discarding an edit of an
  already-live entry** leaves the row in place on purpose: `previewLoad` needs it to answer the
  stale link with the ended page rather than a bare 404. Rename and delete clear rows the same
  way discarding a never-published entry does. **Publish never clears rows**, a stated coupling,
  not an oversight: the ended page's link-to-the-live-version answer depends on the row outliving
  the branch for the rest of its TTL.
- **Revoke-all**, the edit screen's second button, deletes every outstanding row for the entry in
  one action, the remedy for a link shared to the wrong person. It's idempotent: revoking with
  nothing minted still succeeds, reporting zero.
- **Removing an editor** from the allowlist deletes every row they minted, alongside their
  sessions and magic tokens. A role change or an access-map edit does **not** retroactively revoke
  an already-minted link: the token was valid when minted, and the engine has no standing to reach
  back and un-mint it. If a permission tightened after a mint concerns you, revoke-all is the
  remedy, since nothing else closes that link short of its own expiry.
- **The ended page is a bounded publish oracle.** For the rest of a minted link's TTL, re-fetching
  it after publish tells whoever holds it whether the entry is now live, on purpose, so an
  embargoed draft's sharer should know the link keeps answering that question past the review
  window, not just during it.

Every refusal `previewLoad` throws logs `preview.rejected` with a `reason`: `unknown`, `expired`,
`branch_gone`, `row_invalid`, `draft_invalid`, `table_missing`, or `bindings_missing`. See [Log
events](../reference/log-events.md) for each reason's exact trigger; every one answers the
identical outward 404 (503 for `bindings_missing`), so the log is the only place the distinction
survives.

## Operational notes

**A preview URL is captured by your own infrastructure.** Workers Logs, Logpush, and HTTP
analytics all record full request URLs by design, so a `/preview/<token>` request lands in
whatever platform observability you already have on. Pasting a log excerpt that contains a
`/preview/...` path to a colleague, a support ticket, or a public bug report is resharing the
draft it points at, exactly as if you'd sent the link itself.

**A site that relaxes the sanitize floor shouldn't mount this route.** A preview link executes the
shared draft's rendered content inside your own site's origin, the same way a published page does.
A site set `unsafeDisableSanitize: true` (see [The render sanitize
floor](../explanation/render-safety.md)) or built a component whose `build()` interpolates a
directive's attribute value directly into HTML trusts every author's markdown not to carry an XSS
payload already; extending that same trust to whoever an editor hands a link to is a materially
different exposure, and this feature assumes the ordinary sanitized pipeline.

**Your site's own cache layer can leak one holder's draft to another.** An origin Cache Rule that
overrides Cloudflare's default cache eligibility for `/preview/*` (the engine's own
`cache-control: private, no-store` header already asks not to be cached) would serve the first
request's response to every later request for the same URL, including a discarded or expired
token's cached success. Leave `/preview/*` out of any custom Cache Rule; see Cloudflare's own
[Cache Rules reference](https://developers.cloudflare.com/cache/how-to/cache-rules/) if you
maintain one.

**Rate-limit `/preview/*` at the edge.** cairn doesn't own rate limiting for a public route (see
[Cloudflare](../reference/cloudflare.md) for the Workers-binding primitive it does ship, which a
load like `previewLoad` doesn't currently call). A dashboard [WAF Rate Limiting
Rule](https://developers.cloudflare.com/waf/rate-limiting-rules/) scoped to `http.request.uri.path
contains "/preview/"` with a request-count threshold over a short window is the cheapest backstop
against a script sweeping the 256-bit token space (a non-threat for guessing, since the space is
astronomically large, but a real cost in Worker invocations and D1 reads under sustained spray
traffic). This is a standing gap the [ROADMAP](../../ROADMAP.md) tracks as an engine-level
rate-limit seam for `previewLoad`; until it lands, the edge rule is the whole story.

**The bundle carries your site's build-time corpus.** `previewLoad` takes the same
`PublicRoutesConfig` your public route builds, globbed corpus included, so mounting this route
pulls that corpus into your deployed Worker bundle (a site at club scale runs roughly 1-2 MB
against Cloudflare's 10 MB paid-plan ceiling). Watch your bundle size as your content grows; the
[ROADMAP](../../ROADMAP.md) tracks a narrowed, manifest-backed resolver that would remove this
cost for a site approaching the limit.
