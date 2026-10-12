# Framing record: Share a draft preview

Agent-facing; drives the introduction of `docs/extend/share-a-draft-preview.md` only; the body follows the page plan (`docs/internal/briefs/extend/share-a-draft-preview.plan.md`).

## Who arrives, from where, and why

Five readers the page serves, then four who arrive in the wrong place.

1. **The adopting developer on a hand-built site** (the main reader).
   - Who: a Svelte-fluent developer building an organization's site on cairn's seams, whose editors
     want someone outside the editor roster, such as a board member signing off, to read a draft
     before it publishes.
   - From: the extend index's Public site group (`docs/extend/README.md`, once the stage lists the
     page); Build the public routes, which the outline has link here because the preview route
     shares the entry composition (not on disk yet); the add-cairn tutorial, whose auth-database
     step and opt-in migration exercise say `0003_preview.sql` "serves only draft-preview links"
     and link nowhere (`docs/extend/add-cairn-to-a-sveltekit-app.md:980,1108-1127`); or a search.
   - Came for: the steps that make a shared link open the draft.
   - Knows: SvelteKit route groups, layouts, and server loads; Wrangler's D1 migrations; their own
     public entry routes; the admin they mounted.
   - Lacks: that a draft has no public page until it publishes, so a preview needs a route of its
     own that runs per request; that the editor's half already ships; which two pieces the site
     adds; why the route must sit in the entry pages' layout group.

2. **The adopting developer on a scaffolded site.**
   - Who: the same goal, on a site the setup command wrote.
   - From: Scaffolded site files, which lists `preview/[token]` in the `(site)` group and sends route
     wiring to Build the public routes (`docs/extend/scaffolded-site-files.md:348-352`), then the
     outline's cross-link here; the index; or a search.
   - Came for: whether previews already work, and what is left to do.
   - Knows: the tree as the scaffold wrote it.
   - Lacks: that the migration file, the route, and the banner page are already in the tree
     (`f:gepykz`, `f:6c3amx`, `f:6hmgmv`), so the work is the migration step and the checks; that
     the route's directory and group are load-bearing (the minted link points at `/preview/<token>`,
     `f:76m2vf`, and a route outside the group renders unstyled, `f:6rao75`).

3. **The developer whose editors already meet a failing Share preview group.**
   - Who: any site's developer after an engine upgrade, or after the add-cairn tutorial, which
     mounts `CairnAdmin` with no `previewMint` prop and applies `0003_preview.sql` only to the local
     database (`docs/extend/add-cairn-to-a-sveltekit-app.md:417,1127`).
   - From: a search for the failure text, "The preview_tokens table is missing. Apply
     migrations/0003_preview.sql to AUTH_DB, then try again." (`f:rr00qr`), or an editor's report.
   - Came for: to make the control work, or to make it go away.
   - Knows: the message, and possibly nothing else about the feature.
   - Lacks: that the group ships on because the admin always wires its two actions (`f:6gmzt1`);
     that one prop hides it, and only hides it (plan constraint; friction log); that the migration
     alone still leaves a minted link with no page to open until the route is mounted (`f:6gmzt1`).

4. **The developer with their own review workflow.**
   - Who: a developer whose site routes drafts through a custom admin screen (a review queue, a
     sign-off step) and wants that screen to mint and revoke links.
   - From: the `mintPreview` and `revokePreview` reference entries (`docs/reference/sveltekit.md`,
     "Public preview"), the `preview.token.*` rows of `docs/reference/log-events.md`, Add a custom
     admin screen, or a search. None of these links this page today.
   - Came for: calling `mintPreview` and `revokePreview` from their own route.
   - Knows: placing and gating a custom admin screen.
   - Lacks: that the functions still need the first task's table and route; that `mintPreview`
     returns a bare token (friction log); the authorization order. The last section, "Mint and
     revoke from your own admin route", answers them, and the intro names it by heading.

5. **The developer arriving from Replace magic links with Cloudflare Access.**
   - From: that page's See also, which says this page "sets up the `/preview/<token>` route that
     the Access application leaves uncovered"
     (`docs/extend/replace-magic-links-with-cloudflare-access.md:407`).
   - Came for: what serves `/preview/<token>`, and why it can sit outside the gate.
   - Knows: Access, the auth guard, identity mode.
   - Lacks: that the route lives outside `/admin` and reads no cookie or session, the token alone
     being the credential (`f:afkvsb`, `f:6c3amx`, `f:76m2vf`).
   - Served by paragraph 1's model clause and the right-tool notice under the introduction; this
     reader gets no sentence of their own.

Wrong-place readers:

6. **The developer styling the admin editor's own preview pane.** A search for cairn's preview
   styles lands here, since the word names two unrelated seams (`f:t548g6`; friction log, "Two
   seams named `preview`"). They belong on Theme your public site, "Style the editor preview"
   (`docs/extend/theme-your-public-site.md#style-the-editor-preview`). The out-of-scope list
   routes them.
7. **The reader assessing the admin's sessions and cookies.** They belong on Security model, "The
   session cookie" (`docs/extend/security-model.md#the-session-cookie`), as the plan routes them.
   A reader assessing the preview link's own risk finds no concept page for it today (friction
   filed this step); this page carries the link's operational properties only.
8. **The developer wiring the public entry route itself.** They belong on Build the public routes
   (the outline's out-of-scope list), routed in the out-of-scope list.
9. **The developer upgrading an existing preview route** across the `previewLoad` to `loadPreview`
   rename (0.97.0) or the `PreviewBanner` move to `/public` (0.98.0). They belong on
   `docs/extend/migration-notes.md`, which they reach from Upgrade cairn. The body's `f:btx359`
   sentence covers the import, the page's code uses current names throughout, and the intro spends
   no words on them.

## Background the page rests on

1. **A draft has no public page until it publishes, which is why the feature exists.** A save
   commits to the entry's holding branch, `cairn/<concept>/<id>`, in the site's GitHub repository,
   and a deliberate Publish copies it to the default branch, whose commit triggers the deploy
   (`f:cjonmm`); a pending entry is that branch's existence and nothing else (`f:5kerxw`). Public
   entry pages are built from the markdown in the deployed commit and prerendered, never read from
   GitHub per request (`f:1mkckz`). A draft therefore cannot show at its future address, and a
   reader who is not an editor needs a route of its own that runs on each request. That is also
   why the site, not the engine, owns the route.
2. **What a preview is.** A private link that renders one entry's draft as a page of the site, for
   a reader with no editor sign-in (`f:bydgww`, `f:afkvsb`), at `/preview/<token>` (`f:76m2vf`). The
   page behind it reads the draft from the holding branch on every request, so a reviewer who
   reloads sees the editor's latest save (`f:jdz8hj`, filed by this step), and renders it through
   the same composition the public entry page runs, so the preview and the published page cannot
   drift structurally (`f:gvim4v`, `f:umdf7r`). What a link shows after publish or discard
   (`f:l4waby`) belongs to the body's lifecycle section, not the intro.
3. **The editor's half ships, on by default, and why.** Every edit screen shows the Share preview
   group in the Details slide-over, whose mint and revoke actions `createCairnAdmin` wires
   (`f:6gmzt1`, `f:7e0i53`, `f:bydgww`). `previewMint` defaults on because the single-mount admin
   always wires both actions (`f:6gmzt1`). A site not ready passes `previewMint={false}`, which
   hides the group and leaves the actions mounted (`f:6gmzt1`, `f:dqe7ij`; plan constraint; friction
   log). Until the migration runs, each mint or revoke answers a failure that names it
   (`f:rr00qr`).
4. **The site's half is two pieces.** The `preview_tokens` table that `0003_preview.sql` adds to
   the site's existing `AUTH_DB`, which stores the SHA-256 of each token, never the token
   (`f:049lo2`); and a never-prerendered route that calls `loadPreview`, mounted inside the entry
   pages' layout group (`f:gvim4v`, `f:6c3amx`). Without the route, a minted link resolves nowhere
   (`f:6gmzt1`).
5. **Why inside the group.** The stylesheets and chrome live on that group's layout chain. An
   earlier neutral-shell design was rejected because drafts rendered unstyled, and a route outside
   the group reproduces that page (`f:6rao75`). The intro carries the reason in one clause; the
   rejected design's history stays in "Mount the preview route".
6. **Where SvelteKit fits.** A route group and its layouts carry the site's look (`f:gvim4v`,
   `f:6rao75`). The route is a server `load` in `+page.server.ts` that exports `prerender = false`,
   since a prerendered copy would ship a bearer credential in a static asset, and `loadPreview`
   throws if it runs during the build (`f:gvim4v`, `f:6c3amx`). A parent layout's data reaches the
   anonymous link holder (`f:cnz554`); the body's Warning owns that, not the intro.
7. **Where Cloudflare fits.** The links live in D1, in the site's existing `AUTH_DB` (`f:049lo2`).
   The minted link is built from `PUBLIC_ORIGIN`, the canonical origin the engine reads from the
   Worker env, never the request's host (`f:76m2vf`, `f:ntdafg`); the intro leaves it to "Before you
   begin", since the reader already set it for sign-in links. Workers itself is left out on
   purpose: the reader already deploys there, and the preview changes nothing about how.
8. **Where GitHub fits.** The draft is read from its holding branch through the same Backend the
   admin reads through (`f:jdz8hj`, `f:cjonmm`). The reviewer touches nothing in GitHub. The intro
   names the holding branch once and links `docs/extend/architecture.md#the-holding-branch` for the
   mechanics.
9. **Scaffolded versus hand-built.** A scaffolded site's `migrations/` carries `0003_preview.sql`
   (`f:gepykz`), and its `(site)` group carries the route (`f:6c3amx`) and the banner page
   (`f:6hmgmv`). Never claim the setup command applied the migration (plan constraint). A site
   built by hand takes every step.

## Place in the doc set

- **Group and neighbors.** Public site, with Theme your public site, Build the public routes, Act on
  newly published entries, and Add an island; the current arm index also lists the kept Choose an
  AI posture there. The index does not list this page yet. Act on newly published entries is the
  after-publish neighbor and this page the before-publish one; the intro has no need to name it.
- **Links in.** Build the public routes (outline cross-link, not on disk) and Replace magic links
  with Cloudflare Access's See also (on disk). Pages that mention the feature without linking here:
  Architecture (`preview_tokens` in the D1 tier, `docs/extend/architecture.md:145,150`), Scaffolded
  site files (`preview/[token]` in `(site)`), the add-cairn tutorial (`0003_preview.sql`), and the
  reference's `sveltekit.md` "Public preview", `public.md` `PreviewBanner`, and `log-events.md`
  `preview.refused`, which mentions "The guide's lifecycle section" with no link. Most readers
  therefore arrive from a search or the index with no earlier page behind them, so the intro
  establishes the context itself rather than assuming a prior page.
- **What siblings own, and how the intro words a shared idea fresh.**
  - Architecture owns the write path, opening its section "An edit reaches the live site through a
    save onto a holding branch" (`docs/extend/architecture.md:80`). The intro reaches the same fact
    from the reviewer's side, that a draft has no public page until it publishes, and does not
    restate save, publish, and deploy as a sequence.
  - Build the public routes owns `createPublicRoutes`, `entryLoad`, and the entry page's SEO. The
    intro says "the site's own public composition" and leaves the config object to "Before you
    begin".
  - Theme your public site and Replace magic links both open on what cairn does by default. This
    intro opens on the draft's situation instead, so the group's pages do not all start alike.
    Theme your public site also owns `editor.preview`, the other `preview`.
  - Security model owns sessions and cookies; no page owns the preview link's threat surface
    (friction filed).
  - Add a custom admin screen owns placing and gating a screen; the last section links it, and the
    intro does not.

## Intro plan

Three paragraphs, then the plan's two bounds lists. The plan's right-tool notice follows the
introduction directly and opens "The link is the credential", so no intro sentence states that the
link is the credential or that anyone who holds it can read the draft.

1. **The draft's situation, and what a preview is (the model; why it exists).** Open on a statement
   about the subject from the reader's situation: until an editor publishes it, a draft has no page
   on the public site. Give the reason in one sentence: each save commits to the entry's holding
   branch, and the public pages are built from the published commit at deploy (`f:cjonmm`,
   `f:5kerxw`, `f:1mkckz`), linking `docs/extend/architecture.md#the-holding-branch`. Name the need:
   a reviewer who is not an editor, such as a board member signing off, has no way to read the
   draft as the site will show it. Then what a preview is: a private link the editor shares that
   opens the draft as a page of the site, with no sign-in, at `/preview/<token>`, a route outside
   `/admin` (`f:bydgww`, `f:afkvsb`, `f:76m2vf`, `f:6c3amx`). Close on why it stays faithful: the page
   reads the draft from its holding branch on every request, so the reviewer sees the latest save,
   and renders it through the site's own public composition, so it looks the way the published
   page will (`f:jdz8hj`, `f:gvim4v`, `f:umdf7r`). Serves readers 1, 2, and 5. Do not mention expiry
   or revoking (the notice and the lifecycle section own them).
2. **Who does what, with the contract.** The editor's half already ships: every edit screen shows a
   Share preview group in the Details slide-over, and the admin wires its mint and revoke actions
   (`f:6gmzt1`, `f:7e0i53`, `f:bydgww`). The site adds what only it can: a `preview_tokens` table in
   its `AUTH_DB` D1 database, which stores a hash of each link (`f:049lo2`), and a never-prerendered
   route that renders the draft, mounted inside the same layout group as the entry pages, because
   that group's layouts carry the site's stylesheets and chrome (`f:gvim4v`, `f:6c3amx`, `f:6rao75`).
   Then the task guide's contract sentence, the plan's: you apply the preview migration, mount the
   preview route inside your entry pages' layout group, render the banner, and check that a minted
   link opens the draft in your site's own styles. End on the split: a site the setup command
   scaffolded already carries the migration file, the route, and the banner page, so its developer
   runs the migration step and goes on to verify, while a site built by hand takes every step
   (`f:gepykz`, `f:6c3amx`, `f:6hmgmv`). Serves readers 1 and 2. Never claim the setup command
   applied the migration; leave the rejected design's history to "Mount the preview route".
3. **The two other reasons, each with the heading that answers it.** Because the admin always wires
   the group's two actions, the group ships on, so a site that has not applied the migration shows
   editors a control that answers "The preview_tokens table is missing." on every use (`f:6gmzt1`,
   `f:rr00qr`; quote that first sentence of the message verbatim, for a reader matching it). A
   developer who arrives with that message finishes the setup or hides the group, the choice "Keep
   or hide the Share preview group" makes first. A site with its own review workflow can mint and
   revoke links from its own admin screen, on the same table and route, as "Mint and revoke from
   your own admin route" shows (`f:nssepj`). Serves readers 3 and 4. Say "hide", never "turn off" or
   "disable" (plan constraint).

Bounds lists, after the paragraphs (the plan's items 3 and 4; a scope sentence here may name the
page, since scope has no subject-first form):

- **Prior knowledge**, as the plan states it: SvelteKit route groups, layouts, and server `load`
  functions; Wrangler's D1 migration commands; and the site's own public entry routes. No cairn
  knowledge beyond the site's admin and its public routes; paragraph 1's holding-branch link covers
  the one cairn idea the page leans on.
- **Out of scope, each with the page that covers it:**
  - Building the public entry route the preview mirrors: `docs/extend/build-the-public-routes.md`,
    named by its title, "Build the public routes", without a link if the file is not on disk at
    draft time (the plan's rule).
  - How the admin secures its own sessions and cookies:
    `docs/extend/security-model.md#the-session-cookie`.
  - Styling the admin editor's own preview pane through the adapter's `editor.preview`, a different
    feature that shares the word: `docs/extend/theme-your-public-site.md#style-the-editor-preview`
    (`f:t548g6`).

## Departures from the plan's introduction

1. **Paragraph 1 opens on why a draft has no public page.** The plan's model item starts at "An
   editor can hand an unpublished draft to someone who is not an editor". The intro first states
   the draft's situation, the holding branch and the public pages built at deploy (`f:cjonmm`,
   `f:5kerxw`, `f:1mkckz`), and adds the per-request branch read (`f:jdz8hj`). Why: the register asks
   the introduction for why the thing exists, and without it a reader cannot see why the site must
   add a route that runs on each request. The branch read is also where GitHub fits the model.
2. **Paragraph 2 adds the scaffolded and hand-built split** (`f:gepykz`, `f:6c3amx`, `f:6hmgmv`). Why:
   a scaffolded reader must learn early that the pieces are already in the tree, and the plan's own
   steps are conditional on it ("Apply the preview migration" step 1 and "Mount the preview route"
   step 1 apply to a hand-built site only).
3. **Paragraph 3 adds the reader whose editors already meet the failing group** (`f:6gmzt1`,
   `f:rr00qr`). Why: the default-on group is the likeliest arrival with a concrete symptom, and the
   plan already orders "Keep or hide the Share preview group" first for that reader but gives the
   intro no sentence for them. The plan's second reader, the one with their own workflow, stays as
   the plan placed them.
4. **The out-of-scope list adds the `editor.preview` routing** (`f:t548g6`). Why: two seams share the
   word `preview` (friction log, "Two seams named `preview`"), and the plan disambiguates only in
   "Set the link's lifetime", too late for a reader who came for the editor's preview pane.
