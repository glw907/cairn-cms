---
page: Share a draft preview
type: task guide
exemplar: extenders/sanity-custom-tool
---

# Share a draft preview

:::reader
**Who reads it.** A Svelte-fluent web developer building an organization's site on cairn, whose editors want to show an unpublished draft to someone who has no editor sign-in. They work in the site's SvelteKit routes and its Wrangler configuration. :fact[bydgww] :fact[afkvsb]

**Why they arrive:**
- They built the site by hand and want editors to share a draft through a link that opens it as a page of the site, in the site's chrome and styles. :fact[gvim4v] :fact[6c3amx]
- Their site came from `create-cairn-site`, and they want to know which pieces the tree already carries and what is left to do. The scaffold carries the migration file, the preview route, and the banner page. :fact[gepykz] :fact[6c3amx] :fact[6hmgmv]
- Their editors already see a Share preview group that answers "The preview_tokens table is missing." on every revoke and on every mint of an entry with a saved draft, and they want to finish the setup or hide the group. :fact[6gmzt1] :fact[rr00qr]
- Their site runs a review workflow on a custom admin screen, and they want that screen to mint and revoke links. :fact[nssepj]

**What they already know.** SvelteKit route groups, layouts, server `load` functions, and form actions; Wrangler's D1 migration commands; and the site's public entry routes. The page explains none of these and links the vendor docs where a step depends on a vendor detail.

**Background.** A draft has no page on the public site until an editor publishes it. Each save commits to the entry's holding branch, `cairn/<concept>/<id>`, and a Publish copies it to the default branch. The deploy from that branch builds the public pages from the markdown in that commit. :fact[cjonmm] :fact[1mkckz]
A preview link opens the draft with no sign-in at `/preview/<token>`, a route outside `/admin`. The route reads the draft from its holding branch on every request, so a reload shows the editor's latest save. It renders the draft through the same composition the public entry pages run. :fact[76m2vf] :fact[afkvsb] :fact[jdz8hj] :fact[umdf7r]
Every edit screen already shows the Share preview group in the Details slide-over, and `createCairnAdmin` wires its mint and revoke actions. The site adds a `preview_tokens` table in its existing `AUTH_DB` and a never-prerendered route that renders the draft inside the entry pages' layout group. :fact[6gmzt1] :fact[7e0i53] :fact[049lo2] :fact[gvim4v]

**What the page does for them.** The introduction opens on the fact that a draft has no page until it publishes, then says what a preview link is and why it stays faithful to the published page. It links the holding branch to the architecture page's section on it. :fact[cjonmm] :fact[jdz8hj] :fact[umdf7r]
It then splits the work between the editor's half that ships and the pieces the site adds, and states the contract: apply the preview migration, mount the preview route inside your entry pages' layout group, render the banner, and check that a minted link opens the draft in your site's styles. :fact[6gmzt1] :fact[049lo2] :fact[gvim4v]
It tells a scaffolded site's developer that the tree already carries the migration file, the route, and the banner page. That developer applies the migration and goes on to verify. :fact[gepykz] :fact[6c3amx] :fact[6hmgmv]
It names the other reasons to arrive, each with the heading that answers it: a developer whose editors see the missing-table message goes to Keep or hide the Share preview group, and a site minting from a custom admin screen goes to Mint and revoke from a custom admin route. :fact[rr00qr] :fact[nssepj]
A Note follows the introduction: the link is the credential. Anyone who holds it reads the draft with no sign-in until it expires, an editor revokes it, a change to the entry ends it, or the editor who minted it is removed. Forwarding the link forwards that access. Don't share a draft this way if only signed-in editors may read it. :fact[afkvsb] :fact[76m2vf] :fact[pimnjy] :fact[sp9rem]

**What it leaves to other pages:**
- Build the public routes covers building the public entry route the preview mirrors.
- The security model's session cookie section covers how the admin secures its sessions and cookies.
- Theme your public site covers styling the admin editor's preview pane through the adapter's `editor.preview`, a different feature that shares the word. :fact[t548g6]
:::

:::constraints
- Say that `previewMint={false}` hides the Share preview group, never that it turns off, disables, or restricts minting: the two actions stay mounted. :fact[sp8hid]
- Never say a bad `ttlMs` fails at startup, at build, or when `createCairnAdmin` runs; it throws when an editor mints. :fact[n0xz8f] :fact[t548g6]
- Never say an expired link always logs `expired`: a later mint can sweep its row, and the refusal then logs `unknown`. :fact[sp6swp]
- Never claim the setup command applied `0003_preview.sql`; say only that the scaffold's `migrations/` carries the file. :fact[gepykz]
- Write the route's address as `/preview/<token>` and its directory as `preview/[token]`, and tell the reader not to rename it, since a minted link points there. :fact[76m2vf]
- Give no count of the `--cairn-preview-*` properties a site without daisyUI must set. :fact[xssf06]
- Write the header check as a GET with `curl -s -D - -o /dev/null`, not `curl -I`.
- Give a vendor's specifics a link, never a copy: SvelteKit's layout data and route groups, and Wrangler's D1 migration options beyond `--local` and `--remote`.
- Name `PreviewBanner`, `loadPreview`, `mintPreview`, `revokePreview`, `PreviewTokenConfig`, `PublicRoutesConfig`, `previewMint`, and each refusal reason in code font, and the Share preview group's buttons in bold as UI labels. :fact[sp1mbt]
:::

## Before you begin

*Names what the site must have before the first step, each with the page that sets it up.*

- Confirm that your site has the following:
- An `AUTH_DB` D1 binding with a `migrations_dir`. The preview's table goes into that existing database. :fact[049lo2] :fact[xxtooz]
- See [Create the auth database](add-cairn-to-a-sveltekit-app.md#create-the-auth-database).
- `PUBLIC_ORIGIN` set on the Worker as an `https` origin. The built-in mint action builds each link from it, never from the request's host, and throws when it is unset or invalid. :fact[sp2org]
- See [Add the Email Sending binding and name the origin](add-cairn-to-a-sveltekit-app.md#add-the-email-sending-binding-and-name-the-origin).
- Public entry routes built by `createPublicRoutes` from a `PublicRoutesConfig` object. A scaffolded site keeps that object in `src/chassis/public-routes.ts`. :fact[6c3amx] :fact[sp3scf]
- See [Build the public routes](build-the-public-routes.md).
- A deployed site and an editor sign-in that can edit an entry. The verification steps use both.

## Keep or hide the Share preview group

*Lets a site that is not ready for previews hide the group its editors already see, before any setup.*

- Every edit screen shows the Share preview group in the Details slide-over by default, because `EditPage`'s `previewMint` prop defaults to `true` and `createCairnAdmin` wires both actions. :fact[6gmzt1] :fact[bydgww]
- Until the migration runs, each revoke from the group, and each mint of an entry with a saved draft, answers "The preview_tokens table is missing. Apply migrations/0003_preview.sql to AUTH_DB, then try again." :fact[rr00qr]
- A site adopting previews keeps the default and goes on to the migration.
- If your site is not ready to share previews, pass `previewMint={false}` to `CairnAdmin` in `src/routes/admin/[...path]/+page.svelte`. :fact[dqe7ij] :fact[sp3scf]
- A site that renders `EditPage` directly passes the same prop to `EditPage`. :fact[6gmzt1]
- The prop only hides the group. The mint and revoke actions stay mounted. :fact[sp8hid]
- See [`EditPage`](../reference/admin.md#editpage).

## Apply the preview migration

*Adds the table the mint writes to and the preview route reads.*

- The `0003_preview.sql` migration adds a `preview_tokens` table to `AUTH_DB`. Each row holds the SHA-256 of a link's token, the entry it shares, the editor who minted it, and its expiry. A row never holds the token itself. :fact[049lo2]
- To apply the migration, follow these steps:
1. If your site is hand-built, copy `0003_preview.sql` from the package's `migrations/` into your `migrations_dir`, running the command from the project directory. :fact[xxtooz] :fact[049lo2]
- Code: the copy command, from the package's `migrations/` into a `migrations_dir` named `migrations`.

```sh
cp node_modules/@glw907/cairn-cms/migrations/0003_preview.sql migrations/
```

- A scaffolded site's `migrations/` already carries the file. :fact[gepykz]
2. In the project directory, apply the migrations to the remote database, and to the local one for local development. :fact[xxtooz]
- Code: the two apply commands, with `<database>` standing for the D1 database's name.

```sh
npx wrangler d1 migrations apply <database> --remote
npx wrangler d1 migrations apply <database> --local
```

- See [D1 migrations](https://developers.cloudflare.com/d1/reference/migrations/).

## Mount the preview route

*Gives a minted link a page to open, inside the layout group that carries the site's stylesheets and chrome.*

- The preview route sits inside the same layout group as your entry pages, because the group's layouts carry the site's stylesheets and chrome. :fact[gvim4v]
- A route outside the group renders the draft unstyled. :fact[gvim4v]
- Because `loadPreview` and `entryLoad` both run `composeEntryData`, a preview cannot drift structurally from its public page. :fact[umdf7r]
- See [`composeEntryData`](../reference/delivery.md#composeentrydata).
- A scaffolded site already has the route at `src/routes/(site)/preview/[token]/` and skips these steps. :fact[6c3amx]
- To mount the route, follow these steps:
1. If your entry route builds its `PublicRoutesConfig` inline, move the object to a separate module and export it as `publicRoutesConfig`. :fact[6c3amx]
2. In the entry route, import `publicRoutesConfig` from that module in place of the inline object, so both routes render from one object. :fact[6c3amx]
3. In the entry pages' route group, create `preview/[token]/+page.server.ts`. The scaffold's group is `src/routes/(site)/`. :fact[6c3amx]
4. In that file, export `prerender = false` and a `load` that returns `loadPreview(runtime, publicRoutesConfig, event)`. :fact[6c3amx] :fact[gvim4v]
- Code: the scaffold's route file, which a hand-built site adapts by replacing the `#chassis` imports with imports from its modules. :fact[6c3amx] :fact[sp4ref]

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

- The scaffold passes the result through `withReferences`, as its entry route does. A site without that helper returns the result of `loadPreview` directly. :fact[sp4ref]
- The link is a bearer credential, and a prerendered copy would ship its token in a static asset. If the route is prerendered, `loadPreview` throws a build-time error that names `export const prerender = false`. :fact[gvim4v]
- Warning: a parent layout's `load` runs for the preview route too. The preview reads no session, so the data that `load` returns reaches an anonymous link holder. To keep privileged values out of any layout the preview shares, branch on `route.id` in that `load`, or move the pages that need them into a sibling group whose layout the preview never runs. :fact[cnz554] :fact[afkvsb]
- See [Layout data](https://svelte.dev/docs/kit/load#Layout-data).

## Render the preview banner

*Adds a banner, above the same article view the entry pages use, that tells the link's reader they are looking at a draft.*

- In `preview/[token]/`, create a `+page.svelte` that renders `<PreviewBanner preview={data.preview} />` from `@glw907/cairn-cms/public` and then your article component. :fact[6hmgmv]
- Code: the scaffold's preview page, which imports the scaffold's `ArticleView`. :fact[6hmgmv]

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

- `loadPreview` already strips the canonical link, `og:url`, and the JSON-LD `url` from the page's SEO data. The scaffold's `ArticleView` also takes a `preview` flag, which leaves out the canonical link, `og:url`, and the raw-markdown twin link. :fact[sp5seo] :fact[6hmgmv]
- The banner names the link's expiry while the draft exists, as a fixed UTC date and time that its `formatExpiry` prop can replace. Once the draft has ended, it says the preview has ended and links the published page. :fact[sp7ban] :fact[l4waby]
- See [`PreviewBanner`](../reference/public.md#previewbanner).

## Match the banner to your theme

*Points the banner's colors and radius at the site's tokens when the banner's defaults clash with the theme.*

- The banner reads five custom properties and declares none of them on its element, so a declaration on `:root` takes effect without a more specific selector. :fact[xssf06]
- Their color defaults are daisyUI 5 role tokens, apart from the ended state's link, which reads cairn's `--cairn-info-ink` before falling back to a daisyUI role. None is a color literal. On a daisyUI site, the banner already follows the theme in every color scheme. A site without daisyUI points the color properties at its theme's tokens. :fact[xssf06]
- Each property sets one part of the banner:
- `--cairn-preview-bg` and `--cairn-preview-border` set the background and the border in both states. :fact[74ls5e]
- `--cairn-preview-fg` sets the text. :fact[74ls5e]
- `--cairn-preview-link` sets the ended state's link, since the draft state shows none. :fact[74ls5e]
- `--cairn-preview-radius` sets the corner radius. :fact[xssf06]
- In a stylesheet the preview's layout loads, declare the properties on `:root` or on an ancestor of the banner. :fact[74ls5e]
- Code: three properties pointed at stand-in site tokens, framed as placeholders for the theme's tokens.

```css
:root {
  --cairn-preview-bg: var(--site-surface);
  --cairn-preview-border: var(--site-accent);
  --cairn-preview-fg: var(--site-text);
}
```

- See [`PreviewBanner`](../reference/public.md#previewbanner).

## Set the link's lifetime

*Lets the site change how long a link lasts, before the verification steps check the lifetime the site ships with.*

- A link lasts seven days unless the site passes `preview: { ttlMs }` to `createCairnAdmin`, with a value from one minute to thirty days. :fact[76m2vf] :fact[t548g6]
- If seven days does not suit your reviewers, add `preview: { ttlMs }` to the config in the module that calls `createCairnAdmin`. On a scaffolded site, that module is `src/chassis/cairn.server.ts`. :fact[t548g6] :fact[sp3scf]
- Code: the scaffold's `createCairnAdmin` call with a two-day lifetime added, written as milliseconds. :source[/templates/waymark/src/chassis/cairn.server.ts] :fact[t548g6] :fact[sp3scf]

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

- `createCairnAdmin` forwards the option unchanged to the content routes, so a site that calls `createContentRoutes` directly passes the same `preview` there. :fact[t548g6]
- This `preview` sets the link's lifetime. The adapter's `editor.preview` is unrelated and styles the admin editor's preview pane. :fact[t548g6]
- A value outside the range does not throw when `createCairnAdmin` runs. It throws an error prefixed `PreviewTokenConfig:` when an editor mints, before any token is generated. :fact[n0xz8f] :fact[t548g6]
- See [`PreviewTokenConfig`](../reference/sveltekit.md#previewtokenconfig).

## Verify the preview

*Checks the whole path on the deployed site, from the edit screen to the rendered page and back to a revoked link.*

- To verify the preview on the deployed site, follow these steps:
1. In the admin, open an entry and save an edit. A mint of an entry with no unpublished draft fails with "This entry has no unpublished draft to share. Save an edit first." :fact[pimnjy]
2. In the editor's Details slide-over, in the Share preview group, select **Share preview link**. The **Preview link** field shows a link on your configured origin whose path is `/preview/<token>`, with its expiry beneath. :fact[sp1mbt] :fact[76m2vf] :fact[sp2org]
3. In a private browser window, open the link. The draft renders in your site's chrome and styles, with the banner above it. :fact[afkvsb] :fact[gvim4v] :fact[6hmgmv]
- If the page renders unstyled, check that the route sits inside the entry pages' layout group. :fact[gvim4v]
- See [Mount the preview route](#mount-the-preview-route).
4. In a terminal, print the link's response headers with `curl`. Every preview response carries the same five headers, refusals included. :fact[zke3iw]
- Code: the `curl` command, with `<link>` standing for the minted link.

```sh
curl -s -D - -o /dev/null '<link>'
```

- Code: the five preview header lines the command prints, among the response's other headers. :fact[zke3iw]

```text
cache-control: private, no-store
x-robots-tag: noindex, nofollow
referrer-policy: no-referrer
x-content-type-options: nosniff
x-frame-options: DENY
```

5. In the Share preview group, select **Revoke all links**. The group reports how many links it revoked and clears the link it showed. :fact[sp1mbt] :fact[pimnjy]
6. In the private window, reload the page. The page answers 404. :fact[l4waby]
- If the link answers 404 or 503 at any step, the `reason` on its `preview.refused` record names the cause. A token of the wrong shape writes no record, and neither does an unhandled failure such as a failed GitHub read. :fact[rdwesf] :fact[czkfg9]
- See [Diagnose a refused link](#diagnose-a-refused-link).

## The lifecycle of a shared link

*Explains what a link shows as the entry changes after it is shared, for a reader whose link stopped showing the draft.*

- A link's answer depends on what has happened to the entry since the editor shared it:
- While the entry's holding branch exists, the link renders the draft. Each load reads the branch's current file, so a save after minting shows on the next reload. :fact[l4waby] :fact[jdz8hj]
- Publishing the entry, or discarding an edit of an entry that is already live, deletes the branch but keeps the link's row. The link then shows "This preview has ended." with a link to the published page. Because a discard reaches the same state, the message never claims the draft went live. :fact[l4waby] :fact[a7yrhq]
- Deleting the entry, renaming it, or discarding an entry that was never published clears its links. A later entry that reuses the id never answers an old link. :fact[a7yrhq]
- Removing the editor who minted a link deletes the links that editor minted. A change to the editor's role leaves them in place. :fact[sp9rem]
- Past its lifetime, a link stops resolving. :fact[76m2vf]
- **Revoke all links** clears the entry's outstanding links at once, and it succeeds when none is outstanding. :fact[pimnjy]
- Every link that renders no page answers the same plain 404. Its holder never learns why. The one exception is a Worker with no `AUTH_DB` binding, which answers 503. :fact[l4waby] :fact[rdwesf]

## Diagnose a refused link

*Maps the reason a refused link logs to its cause and its fix.*

- A refused link answers 404, or 503 when `AUTH_DB` is missing, so the `reason` on its `preview.refused` record is the diagnosis. :fact[rdwesf] :fact[2awy1w]
- A link whose token has the wrong shape answers 404 and writes no record. :fact[czkfg9]
- See [Find the records](debug-your-site.md#find-the-records).
- The following rows give the reasons in the order `loadPreview` checks them. The last check, the branch read, has two outcomes, `branch_gone` and `draft_invalid`: :fact[2awy1w]

:::row
**Symptom.** `bindings_missing`, and the link answers 503.
**Cause.** The Worker has no `AUTH_DB` binding. :fact[rdwesf]
**Fix.** Bind `AUTH_DB` as Create the auth database shows, and deploy.
:::

:::row
**Symptom.** `table_missing`.
**Cause.** The `preview_tokens` table does not exist, because the migration has not run against this database. :fact[czkfg9] :fact[049lo2]
**Fix.** Apply the migration as Apply the preview migration shows.
:::

:::row
**Symptom.** `unknown`.
**Cause.** No stored row matches the token, as happens after a revoke, a delete, a rename, a discard of a never-published entry, the minting editor's removal, or a later mint's sweep of an expired row. :fact[pimnjy] :fact[a7yrhq] :fact[sp9rem] :fact[sp6swp]
**Fix.** Mint a new link.
:::

:::row
**Symptom.** `expired`.
**Cause.** The link's row is still stored, and its lifetime has passed. :fact[sp6swp] :fact[76m2vf]
**Fix.** Mint a new link, or lengthen the lifetime as Set the link's lifetime shows. :fact[t548g6]
:::

:::row
**Symptom.** `row_invalid`.
**Cause.** The row's stored concept is no longer declared, or its entry id no longer passes the id rule. :fact[czkfg9]
**Fix.** Mint a new link from the entry as it stands.
:::

:::row
**Symptom.** `draft_invalid`.
**Cause.** The file on the entry's holding branch fails the concept's validation. :fact[546jja]
**Fix.** In the admin, correct the draft and save it, then reload the link.
:::

:::row
**Symptom.** `branch_gone`.
**Cause.** The entry's holding branch is gone, and the default branch has no published file for the entry. :fact[l4waby] :fact[czkfg9]
**Fix.** None for this link, since the draft it shared no longer exists. A new draft of the entry takes a new link.
:::

- See [Log events](../reference/log-events.md).

## Mint and revoke from a custom admin route

*Lets a site with a review workflow mint and revoke links from a custom admin screen.*

- `mintPreview` and `revokePreview` run the same checks the built-in actions run, from a route your site places under `/admin` and gates. :fact[u61eav] :fact[nssepj]
- A site that mounts content routes by hand gets the built-in `previewMintAction` and `previewRevokeAction` from `createContentRoutes` instead. :fact[7e0i53]
- Both functions read the editor from the session the admin guard resolved, so the route goes where the guard runs. :fact[nssepj] :fact[u61eav]
- See [Place the route](add-a-custom-admin-screen.md#place-the-route).
- The signatures are `mintPreview(runtime, config, event, { concept, entryId })` and `revokePreview(runtime, event, { concept, entryId })`. The `config` argument is a `PreviewTokenConfig`, that the site passes in. `createCairnAdmin`'s `preview` option doesn't reach it. :fact[nssepj] :fact[n0xz8f] :fact[t548g6]
- Both check the editor, the concept, the access map, and the id's shape, in that order. Only then does a mint check for a draft, so a refusal never reveals whether the entry exists. :fact[u61eav]
- A session or access refusal throws a 403 or a redirect to sign-in. An unknown concept, a bad id, or, for a mint, a missing draft comes back as an `outcome` value. :fact[nssepj] :fact[u61eav]
- A successful mint returns the token and its expiry, not a URL. The token can't be recovered later. :fact[spamto]
- See [`mintPreview`](../reference/sveltekit.md#mintpreview).
- To mint and revoke from your screen, follow these steps:
1. In your screen's `+page.server.ts`, add an action that calls `mintPreview` with the entry's concept and id. :fact[nssepj]
2. In that action, when the outcome is `minted`, build the link from your configured origin, `/preview/`, and the returned token. :fact[spamto] :fact[76m2vf]
3. In the same file, add an action that calls `revokePreview` with the same concept and id. :fact[nssepj]
- Code: a review screen's two actions on a scaffolded site, reading `PUBLIC_ORIGIN` from `cloudflare:workers` and matching the lifetime the `createCairnAdmin` call sets. :fact[nssepj] :fact[spamto]

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

- See [Worker environment reads](debug-your-site.md#worker-environment-reads).
- Both functions log the same `preview.token.minted` and `preview.token.revoked` records the built-in actions log. :fact[nssepj]
- The mint action returns a link that opens the draft, the same result the verification steps check.

## See also

*Links the reference entries and neighboring guides a reader goes to next.*

- See [Public preview](../reference/sveltekit.md#public-preview).
- See [`PreviewBanner`](../reference/public.md#previewbanner).
- See [Log events](../reference/log-events.md).
- See [Build the public routes](build-the-public-routes.md).
- See [Add a custom admin screen](add-a-custom-admin-screen.md).
- See [Security model](security-model.md#the-session-cookie).
- See [Theme your public site](theme-your-public-site.md#style-the-editor-preview).
- See [The holding branch](architecture.md#the-holding-branch).
