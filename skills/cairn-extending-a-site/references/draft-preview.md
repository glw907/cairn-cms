# Share a draft preview

A preview link opens an unpublished draft at `/preview/<token>`, outside the admin, with no sign-in.
The link is the credential: whoever holds it reads the draft until it expires, is revoked, or the
draft ends. The editor's **Share preview** group and its mint and revoke actions ship with
`createCairnAdmin`. The site supplies a table and a route. A scaffolded site already has both and
only applies the migration.

Two unrelated seams share the word. `CairnRuntime.preview` (`PreviewConfig`, set by the adapter's
`editor.preview`) styles the admin editor's own preview pane, resolved per entry as
`EditData.preview`, and carries no token. The public preview token family below is a separate
subsystem. They never interact. `createCairnAdmin({ preview: { ttlMs } })` is the token family.

## Set it up

1. Needs an `AUTH_DB` binding with a `migrations_dir` and `PUBLIC_ORIGIN` on the Worker (links are
   built from it, never the request host; a mint without it throws).
2. Copy `node_modules/@glw907/cairn-cms/migrations/0003_preview.sql` into the `migrations_dir` and apply
   it `--remote` and `--local`. Until then every mint answers `The preview_tokens table is missing.`
   To hide the group instead, pass `previewMint={false}` to `CairnAdmin`.
3. Mount the route inside the entry pages' layout group (`src/routes/(site)/preview/[token]/`), so
   the site's stylesheets and chrome apply. The directory must be `preview/[token]`.

   ```ts
   // src/routes/(site)/preview/[token]/+page.server.ts
   import type { PageServerLoad } from './$types';
   import { loadPreview } from '@glw907/cairn-cms/sveltekit';
   import { runtime } from '#chassis/cairn.server.js';
   import { publicRoutesConfig } from '#chassis/public-routes.js';

   export const prerender = false;
   export const load: PageServerLoad = (event) => loadPreview(runtime, publicRoutesConfig, event);
   ```

   `prerender = false` is required (a prerendered copy would ship a token; `loadPreview` throws at
   build). It reuses the entry pages' `PublicRoutesConfig`, so export that object from a shared
   module if the entry route builds it inline. A scaffold chains `.then(withReferences)`.
4. In `+page.svelte`, render `<PreviewBanner preview={data.preview} />` from
   `@glw907/cairn-cms/public`, then the entry pages' article view with canonical, `og:url`, and the
   twin link left out. The banner reads `--cairn-preview-bg`, `-border`, `-fg`, `-link`, `-radius`.
5. Optional lifetime: `createCairnAdmin({ ..., preview: { ttlMs } })`, one minute to thirty days
   (default seven days). Out of range throws `PreviewTokenConfig:` at mint.

A parent layout's `load` runs for the preview route and its data reaches an anonymous link holder.
Keep privileged values out of shared layouts or branch on `route.id`. Suppress analytics and error
reporting that would carry the URL.

## Lifecycle and refusals

The link renders the draft while the holding branch exists; after publish (or discarding an edit of
a live entry) it shows "This preview has ended." with a link to the page; delete, rename, or
discarding a never-published entry clears its links; revoke clears all. Every non-rendering case is
the same 404 (a missing `AUTH_DB` is 503), and every response carries `cache-control: private,
no-store`, `x-robots-tag: noindex, nofollow`, `referrer-policy: no-referrer`. The `preview.refused`
record's `reason` is the diagnosis; see `references/log-events.md`.

## Mint from a custom screen

`mintPreview(runtime, { ttlMs }, event, { concept, entryId })` and
`revokePreview(runtime, event, { concept, entryId })` run the built-in checks (editor, concept,
access map, id, then draft for a mint). Session or map refusals throw; an unknown concept, bad id, or
missing draft returns as `outcome`. On `outcome === 'minted'`, build the link as
`${env.PUBLIC_ORIGIN}/preview/${result.token}` with `env` from `cloudflare:workers`.
