# Framing record: Act on newly published entries

Agent-facing; drives the introduction of `docs/extend/act-on-newly-published-entries.md` only; the
body follows the page plan (`docs/internal/briefs/extend/act-on-newly-published-entries.plan.md`).
Written 2026-10-12 by the intro-framing step of the docs page chain (stage 2b part 1). No earlier
framing record existed.

## Who arrives, from where, and why

1. **The announcer (the main reader).**
   - Who: a Svelte-fluent developer whose organization wants something sent when a post goes live,
     such as an email to subscribers or a message to its members.
   - From: the extend index's "Public site" group, where the outline places the page; "Build the
     public routes", whose outline crossLink sends "Acting on newly published entries" here and
     whose out-of-scope list names "Announcing new entries"; the `buildNewlyPublished` entry in
     `docs/reference/delivery-data.md`, which calls the helper "the seam an announce-on-publish
     integration builds on" but carries no link here; a search.
   - Came for: a job that sends each new post once, and never again on an edit.
   - Knows: TypeScript and Node, their own deploy pipeline, the storage their platform offers, and
     their email or messaging provider's API.
   - Lacks: that a publish stamps a first-publish time into the committed manifest; why the send
     belongs after the deploy and not at the editor's click; that the engine keeps nothing between
     deploys, so storing the prior manifest is their job.

2. **The returning reader of "Announce on publish".**
   - From: the outline's redirect of `docs/extend/announce-on-publish.md` to this page, the
     `CHANGELOG.md` link to `docs/guides/announce-on-publish.md` (mapped by the legacy path map in
     `scripts/checks/docs-links.mjs`), and an old bookmark.
   - Came for: the guide they used before.
   - Knows: `buildNewlyPublished`, possibly under an earlier name (`docs/extend/migration-notes.md`
     records the renames).
   - Lacks: an early sign that this is the same subject under a new title, and that the in-admin
     next-step link now shares the page. Framing consequence: the opening sentence uses the word
     "announce".

3. **The publish-hook seeker.**
   - Who: a developer who expects cairn to call their code, or a webhook, when an editor clicks
     Publish, as many content systems do.
   - From: a search for a publish hook or callback, or the reference arm.
   - Came for: the callback's name and signature.
   - Knows: SvelteKit and the site's adapter.
   - Lacks: that the publish actions call no site function once their commit lands, and that the
     one publish-time seam is plain data (`f:ww1gv0`). They belong on this page: code that follows
     a publish runs either in a post-deploy job or behind a link an editor follows. The intro's
     second paragraph routes them to one of the two.

4. **The next-step reader.**
   - Who: a developer who wants an editor to take a next step at the moment of publishing, such
     as opening a screen of the site's own to write or review an announcement, with a person in
     the loop and no job.
   - From: "The publish-actions seam" in `docs/reference/sveltekit.md` (no link here today); "Add a
     custom admin screen" (this page links it per the outline's crossLink, "A publish action can
     link to a screen of your own"; the reverse link is not in the outline);
     `docs/extend/upgrade-cairn.md:159` and `docs/extend/migration-notes.md:401`, which name
     `publishActions` changes; a search for `publishActions`.
   - Came for: how to declare the links.
   - Knows: the site's adapter file and its `editor` block.
   - Lacks: that the links are plain data the server resolves (`f:ohq7b9`); that they appear on
     the confirmation of an entry's publish and never after Publish all (`f:v5qalk`); that a bad
     entry throws at server start (`f:ohq7b9`, `f:r2vx8m`). The intro names "Add a next-step link
     after publish" by heading for this reader.

5. **The feed reader (wrong place).**
   - Who: a developer who wants subscribers to pull new posts through RSS or a JSON feed instead
     of being sent them.
   - From: a search for subscribers or new posts.
   - Belongs on: "Build the public routes" (`docs/extend/build-the-public-routes.md`), which owns
     the feed routes (the outline's out-of-scope list). The intro's out-of-scope sentence routes
     them, by title only and with no link if the file is not on disk at draft time.

6. **An editor who wants to announce a post (wrong track, no route).** An editor who reaches an
   extend page by search belongs in the editors arm, which holds no page until its stage rebuilds
   it, so the intro names no page for them. What such an editor meets in the admin is the
   next-step link this page's second task adds.

## Background the page rests on

1. **The write path, and where GitHub fits.** An editor's publish commits the entry and its
   manifest row to the default branch through the site's GitHub App, and that commit triggers the
   site's existing deploy (`f:cjonmm`). The content manifest changes only in a default-branch
   commit that changes an entry, and a save to the holding branch commits no manifest change
   (`f:e69d0l`). The manifest is the committed file `src/content/.cairn/index.json` (`f:vrue1g`),
   so a checkout of the deployed commit holds the manifest of exactly what that deploy carries.
   "Architecture" owns the whole path; this page needs only the stamp's place in it.

2. **The stamp.** The first publish commit that lands an entry non-draft stamps its row with
   `publishedAt`, and every later save keeps the stamp, a re-draft included (`f:gkrell`,
   `f:wv457z`). That is how a diff tells a first publish from an edit: an edit to a live post
   changes no stamp.

3. **Why the job runs after the deploy.** A site's public pages are built from the markdown in the
   deployed commit and never read GitHub per request, and the scaffold's entry route is
   prerendered (`f:1mkckz`, filed by this step). A new post therefore reaches its public address
   only through the build that its publish commit's deploy runs, so a message that links to the
   post belongs after that deploy (`f:cjonmm`, `f:1mkckz`). The edit page's confirmation, "Published.
   The live site is rebuilding." (`f:9sk0at`), corroborates it from the editor's side, but that
   fact's source line points at an old line of `src/lib/admin/EditPage.svelte` (the string now
   sits at line 1249), so the intro does not lean on it. The intro states causal order only, never
   a duration or a moment, per the plan's drafting constraint.

4. **The diff.** Two deployed manifests differ in the stamps that appeared between them, and
   `buildNewlyPublished(before, after)` returns those entries (`f:ix641z`). It is pure and
   node-safe (`f:pc3iy5`, `f:oduq77`) and ships on `/delivery/data` with `parseManifest` and the
   `Manifest` type (`f:tdbki1`).

5. **Why the engine sends nothing.** cairn owns markdown content management and the admin frame,
   and a site's own functionality, actors, and data belong to the developer (`f:bhyvqg`, owner
   tier). Subscribers, a message, and its delivery fall on the developer's side, so the engine's
   part is the stamp and the diff: it sends nothing and keeps nothing between deploys, and the
   prior manifest's storage is the site's (`f:xlj297`, `f:oduq77`). `f:bhyvqg` carries the key
   phrase "thin seam, not a built-in feature"; `check:provenance` requires a citation on any
   sentence that uses it, and this intro should paraphrase the boundary rather than quote it.

6. **No publish callback.** The publish actions call no site function once their commit lands,
   and the adapter's one publish-time member, `editor.publishActions`, is plain data whose `href`
   template the server substitutes, so no callback crosses the publish redirect (`f:ww1gv0`, filed
   by this step; `f:ohq7b9`). Code that should follow a publish runs in a post-deploy job, or
   behind a link an editor follows into a screen of the site's own.

7. **Two mechanisms for two moments.** The job runs after the deploy with no person involved and
   sees every first publish, including one made through Publish all, since both publish actions
   stamp alike (`f:v5qalk`). The next-step link runs nothing: it shows beside the confirmation of
   a single entry's publish, for that entry (`f:ohq7b9`, `f:r2vx8m`), and Publish all's
   confirmation shows none (`f:v5qalk`; friction filed). The plan's body does not state the Publish
   all exception, so the intro must not imply that the links follow every publish.

8. **SvelteKit, left to the notice and the job section on purpose.** The job imports only the
   node-safe `/delivery/data` subpath, which pulls in none of the engine's server code, so it runs
   in the pipeline outside the SvelteKit app (`f:tdbki1`, `f:oduq77`); the next-step link lives in
   the admin the app serves (`f:ohq7b9`). The plan's right-tool notice carries the node-safe point
   right after the intro, so the intro leaves SvelteKit unnamed rather than say it twice.

9. **Cloudflare, left out of the intro on purpose.** Cloudflare enters as two storage options, KV
   and R2, which the notice and "Before you begin" link (`f:xlj297`). A scaffolded site deploys to
   Cloudflare Workers (`f:xyizai`), and the Workers Builds trigger the setup command creates runs
   only the build and the deploy (`f:jtl15v`), so nothing runs after a scaffolded site's deploy
   until the developer adds a step. The plan names no pipeline or CI vendor, and no fact states
   where a scaffolded site adds that step (friction filed), so the intro says only that the
   pipeline is the reader's own.

## Place in the doc set

- **Group.** "Public site" in the outline (order 14), with "Theme your public site", "Build the
  public routes", "Share a draft preview", and "Add an island"; the kept "Choose an AI posture"
  sits in that group of `docs/extend/README.md` today. The index lists only the pages in place, so
  this page joins the group when the index is rebuilt. A reader scanning "Public site" may take the
  title for a public-route task, so the intro's first paragraph says early that the work runs after
  the deploy, in the site's pipeline, with a second path inside the admin.
- **Links in.** "Build the public routes" links here (outline crossLink; not on disk yet). No page
  on disk links here. The reference entries for `buildNewlyPublished`
  (`docs/reference/delivery-data.md`) and the publish-actions seam (`docs/reference/sveltekit.md`)
  describe both seams without linking this guide, an observation for the reference arm, not filed.
  The redirect from `docs/extend/announce-on-publish.md` carries old links here.
- **Links out.** "Add a custom admin screen" (outline crossLink), "Debug your site" from the
  failure path only, the reference entries under See also, and `docs/reference/core.md#defineadapter`
  from the intro's prior-knowledge bound.
- **What siblings own, so the intro words shared ideas fresh.**
  - "Architecture" owns the write path (save, holding branch, publish commit, deploy) and defines
    "manifest" (the outline's `terms` list gives `definedOn: architecture`). Its opening already
    says a publish is a commit through the GitHub App that triggers the deploy. This intro restates
    only the stamp's place in that path, in its own words, and may link the "Write path" section
    (`docs/extend/architecture.md#write-path`) instead of re-explaining it.
  - "Add a custom admin screen" opens on the charter boundary (cairn manages content and the admin
    frame and leaves other data and domain logic to the developer). This intro uses that boundary
    as a reason inside its first paragraph, never as its opening, worded for subscribers and sends.
  - "Build the public routes" owns the feeds and the other pure builders on `/delivery/data`; this
    intro's only mention of feeds is the wrong-place sentence.
  - "Share a draft preview" is the other editor-moment seam, before a publish; it shares no idea
    the intro states.
  - "Content model" (planned) covers the manifest's rows in full; this page uses only `publishedAt`.

## Intro plan

Two framing paragraphs, then the plan's bounds (its introduction items 3 and 4) with one added
clause. The plan's right-tool notice follows the introduction unchanged.

1. **Paragraph 1: the model, from the reader's situation.** Why the engine's part is a record, and
   why the job runs after the deploy.
   - Opening sentence, a statement about the subject from the reader's situation: an organization
     that publishes through cairn's admin often wants to announce each new post, by email to its
     subscribers or a message to its members, and cairn's part in that work is a record of when
     each entry first went live (`f:gkrell`). The word "announce" serves the returning reader.
   - The reason the part is a record: the subscribers, the message, and its delivery are the
     site's own, while cairn keeps to the content and the admin (`f:bhyvqg`; paraphrased, without
     the key phrase, and not in the custom-screen page's words).
   - The record, and where GitHub fits: an editor's publish commits the entry and its row in the
     committed content manifest, `src/content/.cairn/index.json`, to the default branch, and the
     first publish that takes an entry live stamps that row with `publishedAt`, which later saves
     keep (`f:cjonmm`, `f:e69d0l`, `f:vrue1g`, `f:gkrell`).
   - Why after the deploy: the publish commit triggers the site's deploy, and the post reaches its
     public address only through the build that deploy runs, so a message that links to it belongs
     after the deploy (`f:cjonmm`, `f:1mkckz`). Causal order only: no duration and no "when".
   - The diff: the manifests of two consecutive deploys differ in exactly the stamps that landed
     between them, `buildNewlyPublished` returns those entries, and an edit to a live post never
     reads as new (`f:ix641z`, scoped to "returns the entries whose stamp landed between the two";
     the full rule stays in "What counts as newly published"; `f:gkrell`).
   - Optional: a link to the "Write path" section of "Architecture" for the whole path from save to
     deploy.

2. **Paragraph 2: who the page serves, the contract, and the routing.**
   - The anatomy's one-line contract, inside the framing, for the main reader: a job of the
     reader's own runs after each deploy, finds the posts that deploy newly published, hands each
     one to the reader's send code, and saves the deployed manifest for the next run (`f:ix641z`,
     `f:xlj297`). Second person is fine; the sentence is not the intro's opening.
   - The publish-hook reader: no site function runs once a publish lands, because the one
     publish-time seam is plain data, so code that should follow a publish runs in that job or
     behind a link an editor follows (`f:ww1gv0`).
   - The next-step reader: a site that wants an editor to take the next step at the moment of
     publishing, with no job, adds next-step links beside the confirmation of an entry's publish,
     covered under "Add a next-step link after publish", named by heading (`f:ohq7b9`, `f:v5qalk`).
     Word the moment as "publishing an entry" or "an entry's publish", never "every publish"
     (`f:v5qalk`).

3. **Bounds: the plan's items 3 and 4, kept.**
   - Prior knowledge, each half scoped to its reader: the job takes a TypeScript module the
     reader's pipeline can run with Node, the storage their platform offers, and their own email or
     messaging code, and no cairn knowledge beyond publishing from the admin; the next-step link
     takes knowing the site's adapter file and its `editor` block, with a link to
     `docs/reference/core.md#defineadapter`. Added clause: the pipeline that runs the job is the
     reader's own, and the page names none. It is a scope statement, so it may name the page.
   - Out of scope: feeds, for subscribers who pull new posts instead of being sent them, belong to
     "Build the public routes" (`docs/extend/build-the-public-routes.md` if the file is on disk at
     draft time, else the title unlinked); sending the message belongs to the reader's provider.
     It may name the page.

Guards for the drafter's introduction:

- The opening sentence is a statement, never an imperative, and never about the page.
- The intro does not say that the engine sends nothing or keeps nothing between deploys: the
  right-tool notice's first sentence says it next. The intro gives the reason; the notice gives the
  scope.
- No CI vendor, runner, or Node version; no duration or timing claim; no claim that the next-step
  link waits for the deploy.
- No claim about an entry committed outside the admin's Publish (the plan's friction entry 1).
- Feeds get one sentence, the wrong-place sentence.

## Departures from the plan's introduction

1. **The opening moves from the manifest to the reader's situation.** The plan's item 1 opens on
   the manifest file. The framing opens on the organization that wants to announce new posts and
   moves the manifest to the model's third sentence, because the register's opening starts from
   the reader's situation, and the word "announce" tells the reader of the old "Announce on
   publish" page that they are in the right place.
2. **The model gains its reasons.** The plan's item 1 states the stamp and the diff but not why
   the page's spine is a job after the deploy. The framing adds the publish commit triggering the
   deploy and the post reaching its public address only through that deploy's build (`f:cjonmm`,
   `f:e69d0l`, `f:1mkckz`), and why the engine's part is a record at all (`f:bhyvqg`). Both are the
   "why the thing exists" the register asks an introduction to carry.
3. **A third reader, and a scoped moment for the second.** The plan's item 2 names the announcer and
   the next-step reader. The framing adds the developer looking for a publish hook, answered by
   `f:ww1gv0`, and words the next-step link's moment as an entry's publish, because Publish all
   shows no links (`f:v5qalk`).
4. **An optional link to "Architecture".** The plan's introduction links only
   `docs/reference/core.md#defineadapter`. The framing allows a link to the "Write path" section
   of "Architecture", which owns the save-to-deploy path and the term "manifest", so the intro need
   not re-explain the path.
5. **One clause added to the bounds.** The prior-knowledge bound adds that the pipeline is the
   reader's own and the page names none, which the plan's drafting constraints already require of
   the body; stating it up front tells a scaffolded reader not to expect deploy-service steps.
