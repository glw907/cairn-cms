# Page plan: Share a draft preview

Page: `docs/extend/share-a-draft-preview.md`. Page type: task guide. Status: new page, no prior
version on disk. Written 2026-10-12 by the plan step of the docs page chain (stage 2b part 1). The
drafter drafts from this plan: it is the source of the page's order, each section's claim, and
each fact's placement. The structural edit seat reads it before any prose exists. The plan is
Google's outline written down (Google Technical Writing Two, "Organizing large documents",
https://developers.google.com/tech-writing/two/large-docs): the outline is the document's
narrative, and information arrives where it is most relevant to the reader.

Inputs read: the outline entry in `docs/internal/outlines/extend.json` (slug
`share-a-draft-preview`: job, covers, out-of-scope list, exemplars); "The page anatomies" and "The
introduction" in `docs/internal/docs-register.md`; every fact bullet named below in
`docs/internal/facts/extend.md`, `docs/internal/facts/reference.md`, and
`docs/internal/facts/editors.md`; the two exemplars (`extenders/sanity-custom-tool`,
`extenders/directus-create-extension`); the harvest record of the deleted page,
`docs/internal/record/harvest/extend/share-a-draft-preview.json`, for context only; the reference
entries each link names (`docs/reference/sveltekit.md` "Public preview", `loadPreview`,
`mintPreview`, `revokePreview`, the `previewMintAction` paragraph under `createContentRoutes`, and
the `PreviewTokenConfig` and `CairnAdminConfig` rows; `docs/reference/public.md` `PreviewBanner`;
`docs/reference/admin.md` `CairnAdmin` and `EditPage`; `docs/reference/delivery.md`
`composeEntryData`; `docs/reference/log-events.md`, the `preview.*` rows); the sibling pages
`docs/extend/add-cairn-to-a-sveltekit-app.md` ("Create the auth database", "Add the Email Sending
binding and name the origin", "Render the entry", "Apply an opt-in migration locally"),
`docs/extend/add-a-custom-admin-screen.md` ("Place the route", "Gate it"),
`docs/extend/debug-your-site.md` ("Find the records", "Worker environment reads"),
`docs/extend/scaffolded-site-files.md` ("`migrations/`"), and `docs/extend/security-model.md`
("The session cookie"); and the code the facts cite (`src/lib/sveltekit/preview.ts`,
`src/lib/sveltekit/content-routes-preview.ts`, `src/lib/admin/EditPage.svelte:96-103`,
`src/lib/admin/CairnAdmin.svelte:57-62`, `src/lib/admin/ShareLinkPanel.svelte`,
`src/lib/sveltekit/cairn-admin.ts:60-64,118,305-308`, the scaffold's
`templates/waymark/src/routes/(site)/preview/[token]/` pair, `templates/waymark/src/chassis/public-routes.ts`,
`templates/waymark/src/chassis/cairn.server.ts`, and `templates/waymark/migrations/`).
`docs/extend/build-the-public-routes.md` is not on disk at plan time.

Headings in this plan's section list are the page's headings, verbatim. A claim inventory `section`
names one of them. The introduction is the untitled text under the H1 and is named `Introduction`;
the notice right after it is named `Right-tool notice`.

## What the page argues

The editor's half of a draft preview already ships: every edit screen shows a Share preview group
whose mint and revoke actions are wired. What a site adds is the storage and the page: a table in
`AUTH_DB` for the links, and a never-prerendered route that renders the draft through the site's
own public composition, inside the layout group whose stylesheets and chrome make it look like the
site. The page's spine is that addition, in the order the pieces depend on each other, and its one
safety property is stated before any step: the link itself is the credential.

### The order, argued

Each section holds what the next one depends on.

1. **The introduction carries the model** (cover 2's first half, `f:6gmzt1`, `f:7e0i53`). The
   reader must know the editor side already exists, or "apply a migration and mount a route" reads
   as half a feature. It also names the two things the reader adds, which are the page's steps.
2. **The right-tool notice sits directly under the introduction** (cover 5's credential clause,
   `f:afkvsb`), the Sanity exemplar's take. Whether to share a draft by bearer link at all is a
   decision made before any setup, so it comes before the first precondition.
3. **Before you begin** names the auth database, the configured origin, and public routes built from
   one config object: the three things the steps assume exist.
4. **Keep or hide the Share preview group** (cover 2's second half) comes first among the steps.
   The group renders on every edit screen today, and until the migration runs each use of it fails
   (`f:6gmzt1`, `f:rr00qr`). A site not ready to adopt previews decides here and stops; an adopting
   site reads one sentence and moves on. Placed after the migration, the decision would reach the
   reader after their editors had already met the failing control.
5. **Apply the preview migration** (cover 1) precedes the route, because the route reads the table
   and a link cannot be minted without it.
6. **Mount the preview route** (cover 3) is the page's central step: it carries the placement rule,
   the rejected design that justifies it, the shared composition, and the page's one Warning (a
   parent layout's data reaches an anonymous link holder), which belongs exactly where the reader
   chooses the layout group.
7. **Render the preview banner** (cover 4's first half) follows the route that supplies its data.
8. **Match the banner to your theme** (cover 4's second half) is an optional refinement of the
   banner the reader just rendered.
9. **Set the link's lifetime** (cover 5's expiry clause) is the last optional configuration before
   verification. It moves out of "what the link is" because it is an action the reader takes, not
   an explanation, and Verify should run on the lifetime the site will ship with.
10. **Verify the preview** (cover 7's first half) exercises the whole path: a saved draft, a mint,
    an anonymous open, the headers, and a revoke. The Directus exemplar's closing check, where the
    reader sees the thing render, lands here.
11. **What happens to a shared link** (cover 5's states, expiry, and cascades) follows Verify. The
    reader comes here after a link has been out for a while and stopped showing the draft, so its
    lead-in frames a result already seen. It explains every state the failure path names, so it
    precedes that path.
12. **Diagnose a refused link** (cover 7's second half) is the anatomy's failure-path slot (item 5).
    Its reasons map onto the lifecycle the previous section set out.
13. **Mint and revoke from your own admin route** (cover 6) is a second task for a site with its own
    review workflow. It shares the first task's table and route but none of its steps, so it sits
    after the first task's verification and failure path, keeping those together, and carries its
    own observable result in its closing sentence.
14. **See also** closes the page, per the anatomy.

### Departures from the outline's covers order, with the reason for each

- Cover 2 splits: the shipped group and its wired actions move into the introduction as the model;
  the keep-or-hide decision becomes the first step section, before the migration (item 4).
- Cover 5 splits three ways: the credential clause becomes the right-tool notice (item 2); the
  configured-origin clause becomes a precondition and a Verify result; the expiry setting becomes
  "Set the link's lifetime" (item 9); the response headers become a Verify step; the states and
  cascades stay together in "What happens to a shared link", after Verify (item 11).
- Cover 6 (the reader's own admin route) moves from before Verify to after the failure path, as
  item 13 argues.
- Cover 7 splits into the verification section and the failure-path section, the anatomy's items 4
  and 5.

### Exemplar takes, and where each lands

- **Sanity, custom Studio tool.** The early "Right tool for the job?" callout lands as the
  right-tool notice: the link is the credential, so a draft that must stay behind a sign-in is not
  one to share this way. Sanity's "required pieces named before code" lands as "Before you begin"
  and as the opening sentence of "Mount the preview route", which names the route path, the group,
  and the `prerender` export before the code block. Left behind: the plugin-sharing tail.
- **Directus, create an extension.** The verb steps land as the task headings and their numbered
  lists ("Apply", "Mount", "Render", "Set"). The closing "Using Your Extension" check, where the
  reader opens the thing and sees it work, lands as "Verify the preview", steps 3 and 4. Left
  behind: the Docker volume and reload steps.

### Heading policy

Task headings start with a bare infinitive; "Before you begin" and "See also" are the anatomy's
fixed headings; "What happens to a shared link" is the one explanation section and takes a noun
clause. No page links an anchor on this page today (a search of `docs/` for
`share-a-draft-preview.md#` outside `docs/internal` and `docs/{plans,research,specs}` returns nothing;
`docs/extend/replace-magic-links-with-cloudflare-access.md:407` links the page itself), so every
heading is free.

## The introduction, in Google's three parts

No heading. It opens on a statement, never an imperative, and frames the page from above before the
contract (register, "The introduction"). Two or three paragraphs. The intro-framing step reasons
the final wording. Content items, in order:

1. **The model (what the document covers, framed from above).** An editor can hand an unpublished
   draft to someone who is not an editor through a link that renders the draft as a page of the
   site. The editor's half already ships: every edit screen shows a Share preview group, and the
   admin wires its mint and revoke actions (`f:6gmzt1`, `f:7e0i53`, each scoped to that clause). The
   site adds two things: the table that stores the links, and its own never-prerendered route that
   a link opens (`f:6gmzt1`).
2. **Who and why, with the contract.** The reader is the developer building an organization's site
   on cairn whose editors want a reviewer outside the editor group, such as a board member, to read
   a draft before it publishes. The contract sentence, inside the framing: apply the preview
   migration, mount the preview route inside your entry pages' layout group, render the banner,
   and check that a minted link opens the draft in your site's own styles. A second reader runs
   their own review workflow and wants to mint links from it; name "Mint and revoke from your own
   admin route" by heading for that reader (register, "A page may serve several readers").
3. **Prior knowledge.** SvelteKit route groups, layouts, and server `load` functions; Wrangler's D1
   migration commands; and the site's public entry routes. No cairn knowledge beyond the site's
   admin and its public routes.
4. **What the page does not cover, with the page that does (wrong-place routing).** Building the
   public entry route the preview mirrors: `docs/extend/build-the-public-routes.md`. If that file is
   not on disk when the drafter runs, name the page by its title, "Build the public routes",
   without a link, and drop it from See also. How the admin's sessions and cookies are secured:
   `docs/extend/security-model.md#the-session-cookie`. This sentence may name the pages, since scope
   has no subject-first form.

## Sections, in order

Each entry carries the page heading; **First sentence**, the one sentence a reader takes from the
section, which is the section's first sentence on the page (its claim is fixed here, its wording
may move to the register's voice, and a task-section sentence stays under 26 words); **Facts**, the
ids it draws on ("cited again" marks a fact whose primary home is another section); the content and
steps; and **Hand-off**, quoted where the plan fixes its wording (each quoted hand-off and lead-in
passed the provenance extractor with no row).

### Right-tool notice (untitled Note notice under the introduction)

**First sentence:** The link is the credential: anyone who holds it can read the draft, with no
sign-in, until it expires or an editor revokes it.

**Facts:** `f:afkvsb`. Cited again: `f:76m2vf` (expiry), `f:pimnjy` (revoke), `f:bydgww` (the
button's name).

Content: one Note notice of two or three sentences, the Sanity exemplar's "Right tool for the
job?". After the first sentence: the preview page reads no cookie and no editor session, so a
forwarded link forwards the access with it (`f:afkvsb`). A draft that only signed-in editors may
read is not one to share this way. **Revoke all links** in the Share preview group ends every
outstanding link for the entry (`f:bydgww`, `f:pimnjy`). The notice holds no procedural step.

**Hand-off:** none; "Before you begin" follows.

### Before you begin

**First sentence:** The preview needs your site's auth database, its configured origin, and public
entry routes built from one config object.

**Facts:** `f:049lo2` (scoped: the table goes into the existing `AUTH_DB`), `f:76m2vf` (scoped:
the link is built from the configured origin), `f:ntdafg` (added, scoped: `PUBLIC_ORIGIN` is the
canonical origin the engine reads from the Worker env), `f:6c3amx` (scoped: the shared
`publicRoutesConfig`), `f:s4prb0` (added, scoped: the scaffold's `src/chassis/public-routes.ts`).

A bulleted list of preconditions, each with a link to what produces it (anatomy item 2):

- An `AUTH_DB` D1 binding with a `migrations_dir`, which the preview's table joins (`f:049lo2`). A
  scaffolded site has one; a hand-built site creates it in
  `docs/extend/add-cairn-to-a-sveltekit-app.md#create-the-auth-database` (opened and confirmed: its
  step 3 binds `AUTH_DB` with `"migrations_dir": "migrations"`).
- `PUBLIC_ORIGIN` set on the Worker, since every minted link is built from the configured origin,
  never the request's host (`f:76m2vf`, `f:ntdafg`). Link
  `docs/extend/add-cairn-to-a-sveltekit-app.md#add-the-email-sending-binding-and-name-the-origin`.
- Public entry routes built by `createPublicRoutes` from a `PublicRoutesConfig`. A scaffolded site
  keeps that object in `src/chassis/public-routes.ts` (`f:6c3amx`, `f:s4prb0`); otherwise link
  "Build the public routes" (or name it by title if not on disk).
- A deployed site and an editor sign-in that can edit an entry, which "Verify the preview" uses.
  No link; it is the site the reader is building.

**Hand-off:** "With those in place, decide whether editors see the Share preview group while you
set it up."

### Keep or hide the Share preview group

**First sentence:** Every edit screen already shows the Share preview group, and until the migration
runs, each mint or revoke answers a failure that names it.

**Facts:** `f:6gmzt1`, `f:dqe7ij` (added, scoped: `CairnAdmin` takes `previewMint`), `f:bydgww`
(added, scoped: the group's name and place). Cited again: `f:rr00qr`.

Content:

- One sentence: a site adopting previews keeps the group, the default, and goes on to the migration.
- One step, a single bulleted item, condition first: if your site is not ready to share previews,
  in `src/routes/admin/[...path]/+page.svelte`, pass `previewMint={false}` to `CairnAdmin`
  (`f:6gmzt1`, `f:dqe7ij`). One clause: a site that renders `EditPage` itself passes the prop there
  (`f:6gmzt1`). The catch-all path is the one `docs/reference/admin.md#cairnadmin` shows (opened and
  confirmed: its example names `src/routes/admin/[...path]/+page.svelte`).
- One sentence pointing at `docs/reference/admin.md#editpage` for what hiding the group leaves in
  place (opened and confirmed: it states the prop is presentational and the two actions stay
  mounted). The sentence names the entry and claims nothing itself (see Drafting constraints).

**Hand-off:** "Next, give the links somewhere to be stored."

### Apply the preview migration

**First sentence:** The `0003_preview.sql` migration adds a `preview_tokens` table to `AUTH_DB`,
which stores each link's hash, its entry, its editor, and its expiry.

**Facts:** `f:049lo2`, `f:rr00qr`, `f:xxtooz`, `f:gepykz` (scoped: the scaffold's `migrations/`
carries `0003_preview.sql`).

Content:

- One sentence on the table (`f:049lo2`): it stores the SHA-256 of each token, never the token
  itself. Leave the column list and indexes to the migration file; name no column beyond that.
- One sentence on the failure the migration clears (`f:rr00qr`), quoting the message verbatim:
  "The preview_tokens table is missing. Apply migrations/0003_preview.sql to AUTH_DB, then try
  again."
- A numbered list of two steps, one action each, the location first:
  1. If your site was built by hand, in the project directory, copy the file from the package into
     your `migrations_dir`: `cp node_modules/@glw907/cairn-cms/migrations/0003_preview.sql migrations/`
     (`f:xxtooz`; the package ships `migrations/`, `f:049lo2`). Then one sentence: a scaffolded
     site's `migrations/` already carries the file (`f:gepykz`).
  2. In the project directory, apply the migrations with
     `npx wrangler d1 migrations apply <database> --remote`, and with `--local` for local
     development (`f:xxtooz`). `<database>` is the D1 database's name.

**Hand-off:** "With the table in place, give the link a page to open."

### Mount the preview route

**First sentence:** Mount `loadPreview` at `preview/[token]` inside the same layout group as your
entry pages, with `prerender` turned off, so the draft renders in your site's styles.

**Facts:** `f:gvim4v`, `f:6c3amx`, `f:6rao75`, `f:umdf7r`, `f:g030q0`, `f:cnz554`. Cited again:
`f:6gmzt1` (the link resolves only where the site mounts its route).

Content, in order:

- The why, one or two sentences (`f:6rao75`, `f:gvim4v`): the stylesheets and chrome live on the
  group's layout chain. An earlier design rendered previews in a neutral shell and was rejected
  because drafts rendered unstyled; a route outside the group reproduces that page.
- One sentence (`f:umdf7r`): `loadPreview` runs the same composition `entryLoad` runs, so a preview
  and its public page cannot drift structurally. Link `docs/reference/delivery.md#composeentrydata`.
- A numbered list of steps, one action each, the location first:
  1. If your entry route passes its `PublicRoutesConfig` inline, in a module of its own, export
     that object and import it in the entry route (`f:6c3amx`: one object, so the two routes cannot
     drift). A scaffolded site already has it in `src/chassis/public-routes.ts`.
  2. In the entry pages' group (`src/routes/(site)/` on a scaffolded site), create
     `preview/[token]/+page.server.ts`.
  3. In that file, export `prerender = false` and a `load` that returns
     `loadPreview(runtime, publicRoutesConfig, event)` (`f:6c3amx`).
- The scaffold's file as one `ts` block (`f:6c3amx`, `f:g030q0`), marked `snippet-check-skip`
  because it imports the scaffold's `#chassis` aliases. One sentence after it: the scaffold layers
  `withReferences` on the result, as its catch-all route does (`f:g030q0`); a site without that
  helper returns `loadPreview`'s result as `docs/reference/sveltekit.md#loadpreview`'s example does
  (opened and confirmed: the example returns it directly).
- One sentence (`f:gvim4v`, `f:6c3amx`): `prerender = false` is required because the link is a
  bearer credential, and `loadPreview` throws a build-time error if the route is prerendered.
- The page's one Warning notice, placed here (`f:cnz554`): a parent layout's `load` runs for the
  preview route too, and the data it returns reaches an anonymous link holder. Keep privileged
  values out of a layout the preview shares: branch on `route.id` in that `load`, or move the pages
  that need them into a sibling group, whose layout the preview never runs. Link SvelteKit's
  "Layout data" (https://svelte.dev/docs/kit/load#Layout-data). The notice holds no procedural step.

**Hand-off:** "The page now loads the draft, and the banner tells its reader what they are looking
at."

### Render the preview banner

**First sentence:** In the preview route's `+page.svelte`, render `PreviewBanner` from
`@glw907/cairn-cms/public` above the article view your entry pages use.

**Facts:** `f:6hmgmv`, `f:btx359`. Cited again: `f:l4waby` (the banner's two states).

Content:

- One step, a single bulleted item: in `preview/[token]/`, create `+page.svelte` that renders
  `<PreviewBanner preview={data.preview} />` and then your article component.
- The scaffold's page as one `svelte` block (`f:6hmgmv`), marked `snippet-check-skip` because it
  imports the scaffold's `#theme` alias.
- One sentence (`f:6hmgmv`): the scaffold passes `preview` to its `ArticleView`, which then leaves
  out the canonical link, `og:url`, and the `.md` twin link. Scope it to the scaffold's component.
- One sentence (`f:btx359`): `PreviewBanner` is exported from `@glw907/cairn-cms/public`; the
  removed `./components` subpath no longer carries it.
- One sentence (`f:l4waby`, cited): the banner shows the draft state, and the ended state once the
  draft is gone, which "What happens to a shared link" covers (named by heading).

**Hand-off:** "If the banner's default colors clash with your theme, override them."

### Match the banner to your theme

**First sentence:** The banner reads five custom properties, so declaring them on `:root` points it at
your own tokens, with no specificity fight.

**Facts:** `f:xssf06` (scoped; its last clause is not used, see Drafting constraints), `f:74ls5e`.

Content:

- One or two sentences (`f:xssf06`): the defaults are daisyUI 5 role tokens with no color literal,
  so on a daisyUI site the banner already follows the theme in every color scheme. A site without
  daisyUI points the color properties at its own tokens.
- A five-item bulleted list (`f:74ls5e`): `--cairn-preview-bg` and `--cairn-preview-border` set
  both states' ground and border; `--cairn-preview-fg` sets the text; `--cairn-preview-link` sets
  only the ended state's link, since the draft state shows none; `--cairn-preview-radius` sets the
  corner radius.
- One step, a single bulleted item: in a stylesheet the preview's layout loads, declare the
  properties on `:root` or on an ancestor of the banner (`f:74ls5e`).
- One `css` block setting three or four properties to the site's own tokens, written as clearly
  local placeholders (`var(--site-surface)`, `var(--site-accent)`, `var(--site-text)`).
- Link `docs/reference/public.md#previewbanner` for each state's default tokens.

**Hand-off:** "Before you verify, decide how long a link should last."

### Set the link's lifetime

**First sentence:** A link lasts seven days unless you pass `preview: { ttlMs }` to
`createCairnAdmin`, with a value from one minute to thirty days.

**Facts:** `f:76m2vf` (scoped: the default and the range), `f:t548g6`, `f:n0xz8f`, `f:s4prb0`
(added, scoped: `cairn.server.ts` composes the scaffold's server runtime).

Content:

- One step, a single bulleted item, condition first: if seven days does not suit your reviewers, in
  the module that calls `createCairnAdmin` (`src/chassis/cairn.server.ts` on a scaffolded site), add
  `preview: { ttlMs }` to its config (`f:t548g6`, `f:s4prb0`).
- One `ts` fragment showing the option, marked `snippet-check-skip` (it elides the call's other
  members), with a two-day value written as arithmetic in milliseconds.
- One sentence (`f:t548g6`): `createCairnAdmin` forwards the option unchanged to the content
  routes, so a site that calls `createContentRoutes` directly passes the same `preview` there.
- One sentence (`f:t548g6`): this `preview` sets only the link's lifetime and is unrelated to the
  adapter's `editor.preview`, which styles the admin editor's preview pane.
- One sentence (`f:n0xz8f`): a value outside the range throws an error prefixed
  `PreviewTokenConfig:` when an editor mints, before any token is generated.
- Link `docs/reference/sveltekit.md#previewtokenconfig`.

**Hand-off:** "Now check the whole path, from the edit screen to the rendered page."

### Verify the preview

**First sentence:** Mint a link for a saved draft, open it with no session, and check that it renders
in your site's styles with the preview headers.

**Facts:** `f:zke3iw`, `f:pimnjy`, `f:7e0i53` (scoped: the Share preview panel posts to the
actions). Cited again: `f:bydgww`, `f:76m2vf`, `f:afkvsb`, `f:gvim4v`, `f:6hmgmv`, `f:l4waby`.

A complete sentence introducing the checks, then a numbered list of five steps on the deployed
site, one action each, the location first, with the observable result beneath each step that
produces one:

1. In the admin, open an entry and save an edit, since a mint refuses an entry with no pending draft
   (`f:pimnjy`).
2. In the editor's Details slide-over, in the Share preview group, mint a link (`f:bydgww`,
   `f:7e0i53`). Result: a link of the form `https://<your-site>/preview/<token>` on your configured
   origin (`f:76m2vf`).
3. In a private browser window, open the link. Result: the draft renders in your site's chrome and
   styles, with the banner above it (`f:afkvsb`, `f:gvim4v`, `f:6hmgmv`).
4. In a terminal, print the response headers with `curl -s -D - -o /dev/null '<link>'`. Result, in
   a code block: `cache-control: private, no-store`, `x-robots-tag: noindex, nofollow`,
   `referrer-policy: no-referrer`, `x-content-type-options: nosniff`, and `x-frame-options: DENY`
   (`f:zke3iw`).
5. In the Share preview group, select **Revoke all links**, then reload the private window. Result:
   the page answers 404 (`f:pimnjy`, `f:l4waby`).

If step 3 renders an unstyled page, the drafter points to "Mount the preview route" by heading; if
any step answers an error, to "Diagnose a refused link" by heading.

**Hand-off:** "Once a link is out, the editor's later actions decide what it shows."

### What happens to a shared link

**First sentence (the lead-in, tying the section to the task):** "Read this section when a link
you shared stops showing the draft." Its second sentence states the answer: a link shows the draft
while the edit is unpublished, an ended notice once its branch is gone and a live page exists, and
a 404 in every other case.

**Facts:** `f:l4waby`, `f:a7yrhq`. Cited again: `f:76m2vf` (expiry), `f:pimnjy` (revoke).

Content, a bulleted list of five cases, each one or two sentences:

- While the entry's pending branch exists, the link renders the draft (`f:l4waby`).
- Publishing the entry, or discarding an edit of an entry that is already live, ends the draft. The
  link then shows "This preview has ended." with a link to the published page, and never claims the
  draft went live, since a discarded edit reaches the same state (`f:l4waby`). These two actions
  keep the link's row so it can show that page (`f:a7yrhq`).
- Deleting the entry, renaming it, or discarding an entry that was never published clears its links,
  so a later entry that reuses the id never answers an old link (`f:a7yrhq`).
- Past its lifetime, a link stops resolving (`f:76m2vf`).
- **Revoke all links** clears every link for the entry at once, and succeeds even when none is
  outstanding (`f:pimnjy`).

One closing sentence (`f:l4waby`): every case that does not render a page answers the same plain
404, so the visitor never learns which case applied.

**Hand-off:** "When a link answers an error instead, the log names the reason."

### Diagnose a refused link

**First sentence:** Every refused link answers the same 404, except a missing `AUTH_DB` binding,
which answers 503, so the `preview.refused` record's `reason` is the diagnosis.

**Facts:** `f:rdwesf`, `f:2awy1w`. Cited again: `f:a7yrhq`, `f:pimnjy`, `f:049lo2`, `f:l4waby`,
`f:76m2vf`.

Content, the anatomy's failure path (item 5):

- One sentence linking `docs/extend/debug-your-site.md#find-the-records` for querying Workers Logs
  by `event` (the extend recovery surface; opened and confirmed the section exists). That page has
  no `preview.refused` row (friction filed), so the reasons stay on this page.
- The lead-in, quoted: "Find the record's reason in the following table."
- A three-column table (reason, what it points at, fix), rows in check order (`f:2awy1w`):
  - `bindings_missing`: the Worker has no `AUTH_DB` binding, the 503 case (`f:rdwesf`); bind it as
    `docs/extend/add-cairn-to-a-sveltekit-app.md#create-the-auth-database` shows.
  - `table_missing`: the migration has not run; apply it as "Apply the preview migration" shows
    (`f:049lo2`).
  - `unknown`: no stored link matches, as after a revoke or a delete, rename, or never-published
    discard (`f:pimnjy`, `f:a7yrhq`); mint a new link.
  - `expired`: the link outlived its lifetime (`f:76m2vf`); mint a new link, or lengthen the
    lifetime as "Set the link's lifetime" shows.
  - `row_invalid`, `draft_invalid`, `branch_gone`: each "what it points at" cell takes its wording
    from the `preview.refused` row of `docs/reference/log-events.md` (opened and confirmed: the row
    defines all seven reasons). `branch_gone` is the never-published discard of `f:l4waby`.
- One sentence linking the `preview.refused` row of `docs/reference/log-events.md` for the fields
  each reason carries.

**Hand-off:** "A site with its own review workflow can mint and revoke links from its own admin
route."

### Mint and revoke from your own admin route

**First sentence:** `mintPreview` and `revokePreview` run the built-in actions' checks from a route
your site gates, so your own workflow can share and take back links.

**Facts:** `f:nssepj`, `f:u61eav` (scoped; its "never a throw" clause is not used), `f:7e0i53`
(scoped: `createContentRoutes` also returns both actions). Cited again: `f:76m2vf` (the link's
form), `f:t548g6` and `f:n0xz8f` (the config argument).

Content:

- One sentence on where the route lives: a screen under `src/routes/admin/`, placed and gated as
  `docs/extend/add-a-custom-admin-screen.md#place-the-route` and `#gate-it` show, since both
  functions read the editor from the session the admin guard resolved (`f:nssepj`).
- One sentence on the signatures (`f:nssepj`): `mintPreview(runtime, config, event, { concept,
  entryId })` and `revokePreview(runtime, event, { concept, entryId })`. `config` is the same
  `PreviewTokenConfig` the lifetime section sets (`f:t548g6`, `f:n0xz8f`).
- Two sentences on authorization (`f:u61eav`): both check the editor, the concept, the access map,
  and the id's shape, in that order, and only then does a mint check for a draft. A refusal never
  reveals whether the entry exists.
- One sentence on results (`f:nssepj`): a session refusal throws a 403 or a redirect to sign-in;
  an unknown concept, a bad id, or (for a mint) no draft comes back as an `outcome` value. Link
  `docs/reference/sveltekit.md#mintpreview` and `#revokepreview` for the outcome arms (opened and
  confirmed: the `minted` arm carries `token` and `expiresAt`).
- A numbered list of steps, one action each, the location first:
  1. In your screen's `+page.server.ts`, add an action that calls `mintPreview` with the entry's
     concept and id.
  2. In that action, on the `minted` outcome, build the link as your configured origin followed by
     `/preview/` and the token, the form the built-in action returns (`f:76m2vf`).
  3. In the same file, add an action that calls `revokePreview` with the same concept and id.
- One `ts` block showing both actions, marked `snippet-check-skip` because it imports
  `cloudflare:workers`. It reads `PUBLIC_ORIGIN` through `import { env } from 'cloudflare:workers'`;
  link `docs/extend/debug-your-site.md#worker-environment-reads` for why the env comes from there.
- One sentence (`f:nssepj`): both log the same `preview.token.minted` and `preview.token.revoked`
  records the built-in actions log.
- One sentence (`f:7e0i53`): a site that mounts content routes by hand gets the built-in
  `previewMintAction` and `previewRevokeAction` from `createContentRoutes` instead.
- The observable result, the section's closing sentence, so the second task carries its own
  verification: the mint action returns a link that opens the draft, as "Verify the preview"
  shows.

**Hand-off:** "The reference entries for these functions are listed under See also." (It may open
See also instead, as that section's introducing sentence.)

## Ending

### See also

The anatomy's item 6: related how-to guides, concept pages, and the limitations the page leaves
out, with the recovery link (`docs/extend/debug-your-site.md`) not repeated. One introducing
sentence, then a bulleted list, each item's link text naming its destination:

- `docs/reference/sveltekit.md#public-preview`, the `loadPreview`, `mintPreview`, and
  `revokePreview` entries.
- `docs/reference/public.md#previewbanner`, the banner's props and default tokens.
- `docs/reference/log-events.md`, the `preview.refused` and `preview.token.*` rows.
- `docs/extend/add-a-custom-admin-screen.md`, the screen a custom mint lives on.
- `docs/extend/security-model.md`, how the admin's own sessions are secured.
- `docs/extend/build-the-public-routes.md`, the entry route the preview mirrors, only if the file is
  on disk at draft time.

## Dispositions, every fact id

`carried` names the section that holds the fact's primary placement. The 28 fact ids this plan was
handed are all carried, six of them scoped; the plan adds four container facts, each scoped and
named where it lands. `f:q07rd5` is cut, as the page inputs disposed it.

| Fact | Disposition | Section, or reference and reason |
| --- | --- | --- |
| f:6gmzt1 | carried | Keep or hide the Share preview group (on by default, `previewMint={false}`); cited again in Introduction (the shipped half and the site's two additions) and Mount the preview route |
| f:049lo2 | carried | Apply the preview migration (the table, hashes only; the package ships `migrations/`); cited again in Before you begin and Diagnose a refused link |
| f:rr00qr | carried | Apply the preview migration (the failure message, verbatim); cited again in Keep or hide the Share preview group |
| f:gepykz | carried (scoped) | Apply the preview migration (the scaffold's `migrations/` carries `0003_preview.sql`); its other files are not used |
| f:xxtooz | carried | Apply the preview migration (copy into `migrations_dir`, apply `--local` or `--remote`) |
| f:gvim4v | carried | Mount the preview route (same group, `prerender = false`, bearer credential); cited again in Verify the preview |
| f:6c3amx | carried | Mount the preview route (the scaffold's mount, the shared `publicRoutesConfig`, the build-time throw); cited again in Before you begin |
| f:g030q0 | carried | Mount the preview route (`withReferences` on the result, as the catch-all does) |
| f:6rao75 | carried | Mount the preview route (the rejected neutral shell) |
| f:umdf7r | carried | Mount the preview route (`composeEntryData` shared with `entryLoad`) |
| f:cnz554 | carried | Mount the preview route (the Warning on parent layout data) |
| f:6hmgmv | carried | Render the preview banner (the scaffold's page and `ArticleView`'s `preview`); cited again in Verify the preview |
| f:btx359 | carried | Render the preview banner (`/public`, not the removed `./components`) |
| f:xssf06 | carried (scoped) | Match the banner to your theme (five properties, daisyUI role-token fallbacks, no specificity fight). Its last clause ("sets the five properties itself") is not used; the rejected `f:6vg3gb` and the page-inputs friction entry record why |
| f:74ls5e | carried | Match the banner to your theme (each property's reach; `:root` or an ancestor) |
| f:76m2vf | carried | Set the link's lifetime (seven-day default, one-minute to thirty-day range); cited again in Right-tool notice, Before you begin (configured origin), Verify the preview (the link's form), What happens to a shared link, Diagnose a refused link, Mint and revoke from your own admin route |
| f:t548g6 | carried | Set the link's lifetime (the `preview` option, forwarded to `ContentRoutesConfig`, unrelated to `editor.preview`); cited again in Mint and revoke from your own admin route |
| f:n0xz8f | carried | Set the link's lifetime (the `PreviewTokenConfig:` throw at mint); cited again in Mint and revoke from your own admin route |
| f:zke3iw | carried | Verify the preview (step 4, the five headers) |
| f:pimnjy | carried | Verify the preview (step 1, no draft refuses; step 5, revoke); cited again in Right-tool notice, What happens to a shared link, Diagnose a refused link |
| f:7e0i53 | carried (scoped) | Verify the preview (the Share preview panel posts to the wired actions); scoped in Introduction; its `createContentRoutes` clause is carried in Mint and revoke from your own admin route |
| f:afkvsb | carried | Right-tool notice (no cookie, no session, the token alone); cited again in Verify the preview |
| f:l4waby | carried | What happens to a shared link (draft, ended, identical 404); cited again in Render the preview banner, Verify the preview, Diagnose a refused link |
| f:a7yrhq | carried | What happens to a shared link (the cascades); cited again in Diagnose a refused link |
| f:2awy1w | carried | Diagnose a refused link (the reasons, in check order) |
| f:rdwesf | carried | Diagnose a refused link (404 except `bindings_missing`, 503) |
| f:nssepj | carried | Mint and revoke from your own admin route |
| f:u61eav | carried (scoped) | Mint and revoke from your own admin route (the authorization order; a refusal reveals nothing). Its "never a throw" clause contradicts `f:nssepj` and is not used (friction filed) |
| f:dqe7ij | carried (added, scoped) | Keep or hide the Share preview group (`CairnAdmin` takes `previewMint`) |
| f:bydgww | carried (added, scoped) | Keep or hide the Share preview group (the group in the Details slide-over); cited again in Right-tool notice and Verify the preview (**Revoke all links**) |
| f:s4prb0 | carried (added, scoped) | Set the link's lifetime (`src/chassis/cairn.server.ts`); cited again in Before you begin (`src/chassis/public-routes.ts`) |
| f:ntdafg | carried (added, scoped) | Before you begin (`PUBLIC_ORIGIN` is read from the Worker env); its other bindings are not used |
| f:q07rd5 | cut | A writing constraint, not a page claim: the steps touch the runtime and `publicRoutesConfig`, never the adapter file. If the drafter names the adapter, it says which site it means |

The page-inputs claim inventory carried two more rows, disposed as it recorded them: the absent
prior page (no claims) and `f:q07rd5` (above). Its "filed" rows for `f:t548g6` are carried here in
Set the link's lifetime; the friction they filed (two seams named `preview`) is stated on the page
as a one-sentence disambiguation.

## Friction filed

The page-inputs step filed two entries on 2026-10-12 (two seams named `preview`, `f:t548g6`; the
"five properties" clause of `f:xssf06`), and this plan does not refile them. This plan filed six
entries in `docs/internal/docs-friction-log.md` on 2026-10-12, none blocking the page:

1. Engine: `previewMint={false}` only hides the Share preview group; both actions stay mounted, and
   the prop shares the action's name.
2. Engine: `mintPreview` returns a bare token, so a site's own route rebuilds the link with a
   hard-coded `/preview/` path and its own `PUBLIC_ORIGIN` read; no container fact states the
   `token` field.
3. Engine: a bad `preview.ttlMs` passes `createCairnAdmin` and fails only at an editor's first mint,
   as an uncaught error.
4. Docs content: `f:u61eav`'s "never a throw" contradicts `f:nssepj` and the code.
5. Docs content: `docs/extend/debug-your-site.md` has no `preview.refused` row.
6. Docs content: `docs/extend/scaffolded-site-files.md:274-276` says `0001_roles.sql` is absent from
   the scaffold's `migrations/`, against `f:gepykz`.

## Drafting constraints

- **The brief's `local` array** takes the names the page has the reader create or supply: the
  route directory `preview/[token]` and its `+page.server.ts` and `+page.svelte` on a hand-built
  site, the custom screen's action names in the last section's code block, the placeholder tokens
  `--site-surface`, `--site-accent`, and `--site-text`, and the placeholders `<database>`,
  `<your-site>`, `<link>`, and `<token>`.
- Never say `previewMint={false}` turns the feature off, disables minting, or restricts who can mint;
  say it hides the group, and let `docs/reference/admin.md#editpage` carry the rest (friction 1).
- Never say all five `--cairn-preview-*` properties must be set on a site without daisyUI, and give
  no count of the properties such a site needs (`f:6vg3gb` is rejected).
- Never say a refusal from `mintPreview` or `revokePreview` is "never a throw"; follow `f:nssepj`'s
  split (friction 4).
- Never say a bad `ttlMs` fails at startup, at build, or when `createCairnAdmin` runs; it throws when
  an editor mints (friction 3).
- Never say an expired link always logs `expired`: the migration's index serves a sweep on mint
  (`f:049lo2`), so an expired row a later mint swept logs `unknown`. The table's `expired` row says
  "the link outlived its lifetime", and the `unknown` row does not list causes as exhaustive.
- Never claim `create-cairn-site` applied `0003_preview.sql`; say only that its `migrations/`
  carries the file.
- Never name the mint button's label; no fact states it. **Revoke all links** and the Share preview
  group are named (`f:bydgww`).
- Never claim what the draft banner says about the expiry, or how it formats it; link the
  `PreviewBanner` entry instead.
- Never claim that a hand-built site's own article component leaves out the canonical link; that
  is the scaffold's `ArticleView` (`f:6hmgmv`).
- The header check uses `curl -s -D - -o /dev/null`, a GET, never `curl -I`.
- Write the route's URL as `/preview/<token>` and its directory as `preview/[token]`; the minted
  link points there, so the reader must not rename it.
- `PreviewBanner`, `loadPreview`, `mintPreview`, `revokePreview`, `PreviewTokenConfig`,
  `PublicRoutesConfig`, `previewMint`, and every reason name in code spans; "Share preview group"
  as `f:bydgww` names it, and **Revoke all links** bold as a UI label.
- Vendor specifics get a link, never a copy: SvelteKit's layout data and route groups, and
  Wrangler's D1 migration options beyond `--local` and `--remote`.
- Every section opens on the first sentence decided above. Each step names its location before its
  action and holds one action, a conditional step states its condition first, and a procedure of
  one step is a single bulleted item. A reference names its target by heading, never by position.
