# Share a draft preview

Until an editor publishes it, a draft has no page on the public site. Each save lands on the
entry's [holding branch](architecture.md#the-holding-branch), `cairn/<concept>/<id>`, and the public
pages are built from the published commit when the site deploys. A reviewer outside the editor
group, such as a board member signing off on a post, therefore has no way to read the draft as the
site would show it. A preview gives that reviewer a private preview link to the draft. The link opens it as
a page of the site at `/preview/<token>`, a route outside the admin, with no sign-in. The page behind
the link reads the draft from its holding branch on every request, and a reviewer who reloads sees
the editor's latest save. It renders the draft through the same composition the public entry pages
run, which gives the preview the structure of the page that publishing produces.

The editor's half already ships: every edit screen shows a **Share preview** group in the
**Details** slide-over, and [`createCairnAdmin`](../reference/sveltekit.md#createcairnadmin) wires
its mint and revoke actions. Your site adds the two pieces only it can supply. The first is a
`preview_tokens` table in the `AUTH_DB` D1 database, which stores a hash of each link. The second is
a never-prerendered route that renders the draft, mounted inside the same layout group as the entry
pages because that group's layouts carry the site's style sheets and chrome. You apply the preview
migration, mount the preview route inside your entry pages' layout group, render the banner, and
check that a minted link opens the draft in your site's styles. A site scaffolded by
`create-cairn-site`, the setup command, already carries the migration file, the route, and the
banner page. Its developer applies the migration and goes on to verify, and a hand-built site
takes every step.

Because `createCairnAdmin` always wires the group's two actions, the group appears by default. On a
site that has not applied the migration, every mint or revoke from the group answers "The
preview_tokens table is missing." A developer who arrives with that message can finish the setup or
hide the group. [Keep or hide the Share preview group](#keep-or-hide-the-share-preview-group) puts
that choice first. A site that runs a review workflow of its own can mint and revoke links from a
custom admin screen on the same table and route, as
[Mint and revoke from your own admin route](#mint-and-revoke-from-your-own-admin-route) shows.

The steps assume familiarity with SvelteKit route groups, layouts, and server load functions,
with Wrangler's D1 migration commands, and with your site's public entry routes. No cairn knowledge
is assumed beyond your site's admin and its public routes.

The following topics belong to other pages:

- Building the public entry route that the preview mirrors belongs to Build the public routes.
- How the admin secures its sessions and cookies belongs to
  [Security model](security-model.md#the-session-cookie).
- The admin editor's preview pane, which the adapter's `editor.preview` styles, belongs to
  [Theme your public site](theme-your-public-site.md#style-the-editor-preview).

> **Note:** The link is the credential: anyone who holds it can read the draft without signing in until the link expires, an editor revokes it, or the draft ends.
> The preview page reads no cookie and no editor session, so a forwarded link forwards the access with it.
> A draft that only signed-in editors may read is not one to share this way.
> **Revoke all links** in the **Share preview** group ends every outstanding link for the entry.

## Before you begin

The preview needs your site's auth database, its configured origin, and public entry routes built
from one config object.

Before you start, confirm that your site has each of the following:

- An `AUTH_DB` D1 binding with a `migrations_dir`, where the preview's table goes. A hand-built
  site creates it as [Create the auth database](add-cairn-to-a-sveltekit-app.md#create-the-auth-database)
  shows.
- `PUBLIC_ORIGIN` set on the Worker, because every minted link is built from the configured origin
  and never from the request's host. [Add the Email Sending binding and name the origin](add-cairn-to-a-sveltekit-app.md#add-the-email-sending-binding-and-name-the-origin)
  sets it.
- Public entry routes built by `createPublicRoutes` from one `PublicRoutesConfig` object. A
  scaffolded site keeps that object in `src/chassis/public-routes.ts`. A hand-built site builds
  them as Build the public routes describes.
- A deployed site, and an editor sign-in that can edit an entry. The checks in
  [Verify the preview](#verify-the-preview) use both.

With those in place, the first choice is whether editors see the **Share preview** group during
setup.

## Keep or hide the Share preview group

Every edit screen already shows the **Share preview** group, and until the migration runs, each
mint or revoke answers a failure that names the migration. A site adopting previews keeps the
default and goes on to the migration.

To hide the group, follow this step:

- If your site is not ready to share previews, in the admin's catch-all page, pass
  `previewMint={false}` to [`CairnAdmin`](../reference/admin.md#cairnadmin).

A site that renders `EditPage` itself passes the same prop to `EditPage`. The
[`EditPage`](../reference/admin.md#editpage) entry states what hiding the group leaves in place.

The links need a table before anything can mint one.

## Apply the preview migration

The `0003_preview.sql` migration adds a `preview_tokens` table to `AUTH_DB` that records each link's
hash, its entry, its editor, and its expiry. The table holds the SHA-256 of each token, never the
token itself. Until the migration runs, the mint and revoke actions answer "The preview_tokens table
is missing. Apply migrations/0003_preview.sql to AUTH_DB, then try again."

To apply the migration, follow these steps:

1. If your site is hand-built, in the project directory, copy `0003_preview.sql` from the
   package's `migrations/` into your `migrations_dir`:

   ```sh
   cp node_modules/@glw907/cairn-cms/migrations/0003_preview.sql migrations/
   ```

   A scaffolded site's `migrations/` already carries the file.

2. In the project directory, apply the migrations with `--remote`, and with `--local` for local
   development:

   ```sh
   npx wrangler d1 migrations apply <database> --remote
   npx wrangler d1 migrations apply <database> --local
   ```

   `<database>` is your D1 database's name.

With the table in place, a minted link still needs a route to open.

## Mount the preview route

Mount [`loadPreview`](../reference/sveltekit.md#loadpreview) at `preview/[token]` inside the same
layout group as your entry pages, with `prerender` turned off, so the draft renders in your site's
styles. The style sheets and chrome live on that group's layout chain. An earlier design rendered
previews in a neutral shell and was rejected because drafts rendered unstyled, and a route outside
the group reproduces that page. `loadPreview` and `entryLoad` both run
[`composeEntryData`](../reference/delivery.md#composeentrydata), so a preview cannot drift
structurally from its public page.

A scaffolded site already keeps its `PublicRoutesConfig` in `src/chassis/public-routes.ts` and
already has the route, so its developer can skip these steps.

To mount the route, follow these steps:

1. If your entry route builds its `PublicRoutesConfig` inline, in a new module, export the object as
   `publicRoutesConfig`.
2. If you moved the object, in the entry route, import `publicRoutesConfig` from the new module in
   place of the inline object.
3. In the entry pages' group, `src/routes/(site)/` on a scaffolded site, create
   `preview/[token]/+page.server.ts`.
4. In that file, export `prerender = false` and a load function that returns
   `loadPreview(runtime, publicRoutesConfig, event)`.

The scaffold writes the following route file.

<!-- snippet-check-skip: imports the scaffold's #chassis aliases, which a hand-built site does not declare -->
```ts
// src/routes/(site)/preview/[token]/+page.server.ts
import type { PageServerLoad } from './$types';
import { loadPreview } from '@glw907/cairn-cms/sveltekit';
import { runtime } from '#chassis/cairn.server.js';
import { publicRoutesConfig } from '#chassis/public-routes.js';
import { withReferences } from '#chassis/entry-data.js';

export const prerender = false;

export const load: PageServerLoad = (event) =>
  loadPreview(runtime, publicRoutesConfig, event).then(withReferences);
```

The scaffold layers `withReferences` on the result, as its catch-all route does. A site without that
helper returns the result of `loadPreview` directly, as the `loadPreview` entry's example does. The
link is a bearer credential, and a prerendered copy would ship it in a static asset. The
`prerender = false` export rules that out. If the route is prerendered, `loadPreview` throws a
build-time error.

> **Warning:** A parent layout's `load` runs for the preview route too, and the data it returns reaches an anonymous link holder.
> Keep privileged values out of any layout the preview shares.
> In that layout's `load`, branch on `route.id`, or move the pages that need those values into a sibling group.
> The preview route never runs a sibling group's layout.
> SvelteKit's [Layout data](https://svelte.dev/docs/kit/load#Layout-data) documentation describes how layout data reaches a page.

The page now loads the draft, and the banner tells its reader what they are looking at.

## Render the preview banner

In the preview route's `+page.svelte`, [`PreviewBanner`](../reference/public.md#previewbanner) from
`@glw907/cairn-cms/public` sits above the article view your entry pages use.

To render the banner, follow this step:

- In `preview/[token]/`, create `+page.svelte` that renders `<PreviewBanner preview={data.preview} />`
  and then your article component.

The scaffold writes the following page.

<!-- snippet-check-skip: imports the scaffold's #theme alias, which a hand-built site does not declare -->
```svelte
<!-- src/routes/(site)/preview/[token]/+page.svelte -->
<script lang="ts">
  import type { PageData } from './$types';
  import { PreviewBanner } from '@glw907/cairn-cms/public';
  import ArticleView from '#theme/components/ArticleView.svelte';

  let { data }: { data: PageData } = $props();
</script>

<PreviewBanner preview={data.preview} />
<ArticleView {data} preview />
```

The scaffold passes `preview` to its `ArticleView`, which then leaves out the canonical link,
`og:url`, and the raw-markdown twin link. The removed `./components` subpath no longer carries
`PreviewBanner`. The banner shows the draft state while the draft exists and an ended state once it
is gone. [Shared link lifecycle](#shared-link-lifecycle) describes both.

A theme whose palette clashes with the banner's defaults can override them.

## Match the banner to your theme

The banner reads five custom properties, so declaring them on `:root` points it at your tokens
without raising specificity. Their defaults are daisyUI 5 role tokens with no color literal, and on
a daisyUI site the banner already follows the theme in every color scheme. A site without daisyUI
points the color properties at its own tokens.

Each property sets one part of the banner:

- `--cairn-preview-bg` sets the background in both states.
- `--cairn-preview-border` sets the border in both states.
- `--cairn-preview-fg` sets the text.
- `--cairn-preview-link` sets only the ended state's link, since the draft state shows none.
- `--cairn-preview-radius` sets the corner radius.

To override the palette, follow this step:

- In a style sheet the preview's layout loads, declare the properties on `:root` or on an ancestor
  of the banner.

```css
:root {
  --cairn-preview-bg: var(--site-surface);
  --cairn-preview-border: var(--site-accent);
  --cairn-preview-fg: var(--site-text);
}
```

Each value stands for a token of your theme. The `PreviewBanner` entry lists each state's default
tokens.

The link's lifetime is the last setting before verification.

## Set the link's lifetime

A link lasts seven days unless you pass `preview: { ttlMs }` to `createCairnAdmin`, with a value
from one minute to thirty days.

To change the lifetime, follow this step:

- If seven days does not suit your reviewers, in the module that calls `createCairnAdmin`, add
  `preview: { ttlMs }` to its config.

On a scaffolded site, that module is `cairn.server.ts` in `src/chassis/`.

<!-- snippet-check-skip: one call from the scaffold's server module, whose imports the fragment elides -->
```ts
// src/chassis/cairn.server.ts on a scaffolded site
export const admin = createCairnAdmin({
  runtime,
  tidy: { client },
  // Two days, in milliseconds.
  preview: { ttlMs: 2 * 24 * 60 * 60 * 1000 },
});
```

`createCairnAdmin` forwards the option unchanged to the content routes. A site that calls
`createContentRoutes` directly passes the same `preview` there. This `preview` sets only the link's
lifetime and is unrelated to the adapter's `editor.preview`, which styles the admin editor's preview
pane. A value outside the range throws an error prefixed `PreviewTokenConfig:` when an editor mints,
before any token is generated. The [`PreviewTokenConfig`](../reference/sveltekit.md#previewtokenconfig)
entry records the option.

The whole path, from the edit screen to the rendered page, is now ready to check.

## Verify the preview

Mint a link for a saved draft, open it with no session, and check that it renders in your site's
styles with the preview headers.

To verify the preview on the deployed site, follow these steps:

1. In the admin, save an edit to an entry, since a mint refuses an entry with no pending draft.
2. In the editor's **Details** slide-over, in the **Share preview** group, mint a link.

   The group shows a link on your configured origin whose path is `/preview/<token>`.

3. In a private browser window, open the link.

   The draft renders in your site's chrome and styles, with the banner above it. If the page renders
   unstyled, check the route against [Mount the preview route](#mount-the-preview-route).

4. In a terminal, print the link's response headers:

   ```sh
   curl -s -D - -o /dev/null '<link>'
   ```

   Every preview response carries the following headers, refusals included:

   - `cache-control: private, no-store`
   - `x-robots-tag: noindex, nofollow`
   - `referrer-policy: no-referrer`
   - `x-content-type-options: nosniff`
   - `x-frame-options: DENY`

5. In the **Share preview** group, select **Revoke all links**.
6. In the private window, reload the page.

   The page answers 404.

If the link answers an error page at any step, [Diagnose a refused link](#diagnose-a-refused-link)
maps the logged reason to a fix.

Once a link is out, the editor's later actions decide what it shows.

## Shared link lifecycle

A link that stops showing the draft has moved to another state. It shows the draft while the edit
is unpublished, an ended notice once its branch is gone and a live page exists, and a 404 in every
other case.

The following cases decide what a link shows:

- While the entry's holding branch exists, the link renders the draft.
- Publishing the entry, or discarding an edit of an entry that is already live, ends the draft. The
  link keeps its row and shows "This preview has ended." with a link to the published page. The
  banner never claims the draft went live, because a discarded edit reaches the same state.
- Deleting the entry, renaming it, or discarding an entry that was never published clears its
  links. A later entry that reuses the id never answers an old link.
- Past its lifetime, a link stops resolving.
- **Revoke all links** clears every link for the entry at once, and it succeeds even when none is
  outstanding.

Every case that does not render a page answers the same plain 404, and the visitor never learns
which case applied.

Each refused request also writes a log record that names its reason.

## Diagnose a refused link

Every refused link answers the same 404 except a missing `AUTH_DB` binding, which answers 503. The
reason that the `preview.refused` record carries is therefore the diagnosis.
[Find the records](debug-your-site.md#find-the-records) shows how to find a record by its event
name in Workers Logs.

Find the record's reason in the following table.

| Reason | What it points at | Fix |
| --- | --- | --- |
| `bindings_missing` | The Worker has no `AUTH_DB` binding, and the link answers 503 | Bind `AUTH_DB` as [Create the auth database](add-cairn-to-a-sveltekit-app.md#create-the-auth-database) shows |
| `table_missing` | The `preview_tokens` table does not exist yet | Apply the migration as [Apply the preview migration](#apply-the-preview-migration) shows |
| `unknown` | No stored link matches, as after a revoke, a delete, a rename, or a never-published discard | Mint a new link |
| `expired` | The link outlived its lifetime | Mint a new link, or lengthen the lifetime as [Set the link's lifetime](#set-the-links-lifetime) shows |
| `row_invalid` | The stored concept or id no longer matches the site | Mint a new link from the entry as it stands |
| `draft_invalid` | The draft on the entry's holding branch fails the concept's validation | In the admin, correct the entry's draft and save it, then reload the link |
| `branch_gone` | The holding branch is gone and no published file exists | None, since the draft the link shared no longer exists |

The `preview.refused` row of [Log events](../reference/log-events.md) lists the fields each reason carries.

A site with a review workflow of its own can mint and revoke links from a custom admin route.

## Mint and revoke from your own admin route

`mintPreview` and `revokePreview` run the built-in actions' checks from a route your site gates, so
your workflow can share and take back links. A site that mounts content routes by hand already gets
the built-in `previewMintAction` and `previewRevokeAction` from `createContentRoutes`. Place and gate
the route as [Add a custom admin screen](add-a-custom-admin-screen.md) shows. Both functions take
the editor from the session the admin guard resolves.

The two signatures are `mintPreview(runtime, config, event, { concept, entryId })` and
`revokePreview(runtime, event, { concept, entryId })`. The `config` argument is a
`PreviewTokenConfig`, the same `{ ttlMs }` your `createCairnAdmin` call sets. Both functions check
the editor, the concept, the access map, and the id's shape, in that order. Only then does a mint
check for a draft. A refusal never reveals whether the entry exists. A session or access-map
refusal throws a 403 or a redirect to sign-in. An unknown concept, a bad id, or, for a mint, a
missing draft comes back as an `outcome` value instead. The
[`mintPreview`](../reference/sveltekit.md#mintpreview) and
[`revokePreview`](../reference/sveltekit.md#revokepreview) entries list each outcome's fields.

To mint and revoke from your screen, follow these steps:

1. In your screen's `+page.server.ts`, add an action that calls `mintPreview` with the entry's concept
   and id.
2. In that action, when the mint succeeds, build the link from your configured origin, `/preview/`,
   and the returned token.
3. In the same file, add an action that calls `revokePreview` with the same concept and id.

The following file shows both actions on a scaffolded site.

<!-- snippet-check-skip: imports cloudflare:workers and the scaffold's #chassis alias -->
```ts
// src/routes/admin/review/+page.server.ts
import { fail } from '@sveltejs/kit';
import type { Actions } from './$types';
import { env } from 'cloudflare:workers';
import { mintPreview, revokePreview } from '@glw907/cairn-cms/sveltekit';
import { runtime } from '#chassis/cairn.server.js';

// Match the lifetime the createCairnAdmin call's preview option sets.
const previewConfig = { ttlMs: 2 * 24 * 60 * 60 * 1000 };

async function readTarget(request: Request) {
  const form = await request.formData();
  return { concept: String(form.get('concept')), entryId: String(form.get('entryId')) };
}

export const actions: Actions = {
  sharePreview: async (event) => {
    const target = await readTarget(event.request);
    const result = await mintPreview(runtime, previewConfig, event, target);
    if (result.outcome !== 'minted') return fail(400, { outcome: result.outcome });
    return { link: `${env.PUBLIC_ORIGIN}/preview/${result.token}`, expiresAt: result.expiresAt };
  },
  revokePreviews: async (event) => {
    const target = await readTarget(event.request);
    const result = await revokePreview(runtime, event, target);
    if (result.outcome !== 'revoked') return fail(400, { outcome: result.outcome });
    return { revoked: result.count };
  },
};
```

The file reads `PUBLIC_ORIGIN` from `cloudflare:workers`.
[Debug your site](debug-your-site.md#eventplatform-is-undefined) explains why the env comes
from there. Both functions log the same mint and revoke records the built-in actions log. The
`sharePreview` action returns a link that opens the draft, the same result
[Verify the preview](#verify-the-preview) checks.

## See also

The following pages cover the functions, the component, and the records this page uses:

- [Public preview](../reference/sveltekit.md#public-preview): the `loadPreview`, `mintPreview`, and
  `revokePreview` entries.
- [`PreviewBanner`](../reference/public.md#previewbanner): the banner's props and default tokens.
- [Log events](../reference/log-events.md): the `preview.refused` row and the token mint and revoke rows.
- [Add a custom admin screen](add-a-custom-admin-screen.md): the screen a custom mint lives on.
- [Security model](security-model.md): how the admin's sessions are secured.
