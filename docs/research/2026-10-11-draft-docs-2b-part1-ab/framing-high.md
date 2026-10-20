# Framing record: Act on newly published entries

Agent-facing; drives the introduction of `docs/extend/act-on-newly-published-entries.md` only; the body follows the page plan.

Inputs read: "The introduction" and "The page anatomies" in `docs/internal/docs-register.md`, plus
"The extend track" for the vocabulary contract; `docs/internal/outlines/extend.json` whole (groups,
every page's job and out-of-scope list, the two crossLinks touching this page, the `manifest` term
defined on `architecture`); `docs/extend/README.md`; `docs/reference/README.md` (no `docs/README.md`
exists, and no admin or editors arm exists on disk); the page plan
`docs/internal/briefs/extend/act-on-newly-published-entries.plan.md`; every fact bullet the page
carries, plus `f:cjonmm`, `f:e69d0l`, `f:v5qalk`, `f:0oyrh6`, `f:99f221`, `f:445jgb`, and
`f:3bbeia`; the openings of `docs/extend/share-a-draft-preview.md` and
`docs/extend/add-a-custom-admin-screen.md`; `docs/extend/architecture.md` "Write path";
`docs/extend/scaffolded-site-files.md` "`src/content/.cairn/`"; the `buildNewlyPublished`,
`parseManifest`, and publish-actions entries in `docs/reference/delivery-data.md`,
`docs/reference/core.md`, and `docs/reference/sveltekit.md`; `src/lib/delivery/manifest.ts:44-75`
and `src/lib/content/manifest.ts:50-61`. Not opened, per the A/B variant: the page on disk and the
`.framing.md` brief.

## Who arrives, from where, and why

| Reader | Arrives from | Came for | Knows | Lacks |
| --- | --- | --- | --- | --- |
| R1. The announcing developer (the main reader): their organization wants subscribers emailed, or a channel or partner told, when a post goes live. | The extend index, group "Public site" (`docs/extend/README.md`); a search such as "cairn email subscribers when a post is published" or "cairn publish webhook"; later, `docs/extend/build-the-public-routes.md` (outline crossLink "Acting on newly published entries.", page not on disk yet). | A way to run their own send code once per new post, and to know whether cairn already does it. | SvelteKit, their deploy pipeline, their email or messaging provider. A scaffolded-site owner has seen `src/content/.cairn/index.json` named as the content manifest (`docs/extend/scaffolded-site-files.md`), and a tutorial reader committed it. | That a first publish stamps the manifest row (`publishedAt`) and edits never change it; that cairn has no publish callback and sends nothing, so the trigger is the deploy; that a diff needs the previous deploy's manifest, which they must store. |
| R2. The reference reader: has read `buildNewlyPublished` in `docs/reference/delivery-data.md` ("the seam an announce-on-publish integration builds on") and wants the worked job. | A search, or the reference arm (the entry names the use but links no guide today). | The end-to-end shape: where the prior manifest lives, what the first run does, what renames do in production. | The signature and the rule as the reference states it. | The running job, the storage pattern, the first-run choice between seeding and `null`, and the edge cases framed as production symptoms. The intro owes them little beyond confirming the page is the worked version. |
| R3. The next-step-link developer: wants an editor to take a step the moment they publish (open the site's own announce screen, share to a social account) with no pipeline job. | The extend index; a search for `publishActions`; the custom-admin-screen world (`docs/extend/add-a-custom-admin-screen.md`, which this page links out to). | A link the admin shows after a publish, carrying the entry's identity. | Their site's adapter and its `editor` block; possibly a custom admin screen they built. | That `editor.publishActions` exists, that it is plain data the admin resolves on the server (nothing runs on publish), and that the links show only after a single entry's publish, not after Publish all, while the job sees both (`f:v5qalk`). |
| R4. Wrong place: the feed reader, who wants subscribers to pull new posts (RSS, Atom) rather than be sent them. | A search for "new posts" or "subscribers"; the index's Public site group, where both pages sit. | Feed routes. | The public routes. | Nothing this page holds. Route them to "Build the public routes" (`docs/extend/build-the-public-routes.md`, the outline's out-of-scope owner). The file is not on disk at framing time, so the drafter names it by title without a link unless it lands first, as the plan says. |
| R5. Right page, wrong expectation: the developer who expects cairn to send the email itself. | Same routes as R1. | A built-in "notify subscribers" switch. | Same as R1. | The answer, early: cairn stops at the commit and the stamp, and the send is theirs. The intro sets up the boundary and the right-tool notice states it flatly, before any code. |

Considered and not routed in the intro: a developer searching "cairn email" who wants to change
cairn's own sign-in email. That reader belongs on `docs/extend/add-cairn-to-a-sveltekit-app.md`,
"Customize the sign-in email", but no outline entry, crossLink, or out-of-scope row points them
here, and a third routing sentence would crowd the bounds. Leave it out; it is a See also
candidate at most, and the plan fixes See also.

## Background the page rests on

1. **The general model: a publish is a commit, and the deploy carries it live.** A publish copies
   the entry onto the default branch in one commit through the GitHub App, and that commit triggers
   the site's existing deploy (`f:cjonmm`). The content manifest at `src/content/.cairn/index.json`
   changes only in a default-branch commit that changes an entry, a publish among them, never on a
   save to a holding branch (`f:e69d0l`, `f:vrue1g`). So the manifest a deploy builds from is the
   published state of the site, and a job that runs after the deploy reads exactly what went live.
2. **Why the stamp exists, and why the thing to diff is the manifest.** The first publish that lands
   an entry non-draft stamps its row with `publishedAt`, and nothing later overwrites or clears it
   (`f:gkrell`). The stamp marks the first publish, never the latest edit, which is what lets a diff
   tell a new post from an edited one; without it, "newly published" collapses into "changed since
   the last deploy" (the plan's own argument for putting the model in the intro). The stamp lives in
   the manifest and in no content file, so a site cannot recover it from its markdown or
   frontmatter (would-file fact 1 below; until it is filed, the drafter keeps this clause out).
3. **The engine's part is the stamp and a pure diff; the rest is the site's.**
   `buildNewlyPublished` returns the entries that went live between two manifests (`f:ix641z`,
   scoped in the intro to "went live"; the three-part rule is the body's). cairn performs no network
   send and keeps no state between deploys, so storing the previous manifest and delivering the
   message are the site's (`f:xlj297`, `f:oduq77`). That division is the charter, not an omission:
   cairn is a CMS and admin toolkit that stops at managing content and the admin frame
   (`f:99f221`). The intro sets the boundary up; the right-tool notice states it.
4. **Where SvelteKit fits.** The job runs outside the SvelteKit app, as a script in the deploy
   pipeline: `@glw907/cairn-cms/delivery/data` carries the diff and the parser without the engine's
   server code (`f:tdbki1`; `f:445jgb` backs the subpath's boundary if the drafter needs it). The
   next-step link is the one half that lives inside SvelteKit: the admin's edit load resolves the
   `publishActions` list on the server and the edit page shows it beside the publish-success strip
   (`f:ohq7b9`).
5. **Where Cloudflare fits.** Cloudflare enters only as one choice of storage for the prior manifest,
   KV or R2 among others (`f:xlj297`). Left out on purpose: the scaffold's Workers Builds deploy
   (`f:3bbeia`). The plan forbids naming a CI vendor, and a hand-built site may deploy another way,
   so the intro speaks of "the deploy" and "a step after it" only.
6. **Where GitHub fits.** Only as the place the publish commit lands and the manifest is committed
   (`f:cjonmm`, `f:e69d0l`). The job reads the manifest from a checkout of the deployed commit, not
   through the GitHub API; the intro names no API.
7. **Two mechanisms, two moments.** The job acts after the deploy, once per newly stamped entry,
   including every entry a Publish all lands; the next-step link acts at the moment an editor
   publishes one entry, and Publish all shows none (`f:v5qalk`, `f:ohq7b9`). That difference is what
   lets R1 and R3 each pick in the intro, instead of reading to the last section to learn which one
   they need.

## Place in the doc set

- **Group and neighbors.** "Public site" (`public-site`), order 14: after "Theme your public site",
  "Build the public routes", and "Share a draft preview"; before "Add an island". The index on disk
  lists it after "Share a draft preview".
- **What links in, and why.** The extend index, under Public site. "Build the public routes" links
  here for announcing new entries (outline crossLink), once it exists. No reference page links here
  today: `docs/reference/delivery-data.md` names the announce-on-publish use in prose only.
- **What this page links out to, and why.** "Add a custom admin screen" (crossLink: a publish action
  can link to a screen of the site's own), the `delivery/data` and `sveltekit` reference entries,
  `core.md#defineadapter` for the adapter, and "Debug your site" as the recovery surface.
- **What siblings own, so the intro words the shared idea fresh.**
  - "Architecture" owns the write path and defines "manifest" for the track (outline `terms`). The
    intro states only the slice it needs (publish commit, manifest row, stamp, deploy) and links the
    first mention of the content manifest to `architecture.md#the-publish-commit` rather than
    retelling the save-branch-publish path.
  - "Add a custom admin screen" opens on the charter sentence ("cairn manages a site's markdown
    content and the admin frame ... thin seam"). This intro must not reuse that opening; it reaches
    the same boundary from the reader's situation (something has to happen when a post goes live)
    and lets the notice carry the flat statement.
  - "Share a draft preview" opens on the draft-to-deploy gap ("Until an editor publishes it, a draft
    has no page"). This page sits on the other side of the same publish; do not mirror that opening's
    "until/once published" turn.
  - "Scaffolded site files" already names `index.json` as the content manifest; the intro can treat
    the path as possibly familiar and add only what is new, the stamp.
  - "Build the public routes" owns feeds; one routing sentence, no feed detail.

## Intro plan

Three paragraphs, ahead of the right-tool notice and "Before you begin". The plan's three
introduction parts stand: what the page covers (P1 and P2), prior knowledge (P3), what it leaves out
(P3).

1. **P1, the situation and the model.** Open on a statement from the reader's situation, never an
   imperative and never about the page: an organization's site often has to do something when a
   post goes live, such as emailing subscribers or posting to a channel. Then the model, from above:
   a publish lands the entry on the default branch in one commit that also patches its row in the
   committed content manifest, `src/content/.cairn/index.json` (first mention linked to
   `architecture.md#the-publish-commit`), and that commit triggers the site's deploy. The first
   publish stamps the row with `publishedAt`, and later saves keep the stamp unchanged, so the stamp
   marks a post going live and never an edit. The manifests of two deploys therefore differ in
   exactly the stamps that landed between them, and `buildNewlyPublished` returns those entries.
   Keep the rule's three parts and the draft check out; the body's "What counts as newly published"
   owns them. Optional clause, only once would-file fact 1 is filed: the stamp lives in the manifest
   and in no content file, which is why the manifest is the thing to compare. Facts: `f:cjonmm`,
   `f:e69d0l`, `f:vrue1g`, `f:gkrell`, `f:ix641z` (scoped).
2. **P2, who it serves and the contract.** Name R1's reason and give the anatomy's one-line
   contract inside the framing: you write a post-deploy job that finds the entries a deploy newly
   published, hands them to your own send code, and saves the manifest for the next run. One clause
   places the job: a script that runs as a step after the deploy, outside the SvelteKit app,
   importing from `@glw907/cairn-cms/delivery/data` (no purity claim here; the notice carries
   `f:oduq77`). Then R3's reason and its route, by heading, never by position: an editor who should
   take a step at the moment of publishing, such as opening the site's own announce screen, is
   served by a next-step link the admin shows after a publish ("Add a next-step link after
   publish"). Close with the one difference that lets each reader choose: the link appears only
   after a single entry's publish, while the job also sees every entry a Publish all lands. Facts:
   `f:tdbki1`, `f:ohq7b9`, `f:v5qalk`.
3. **P3, the bounds.** Prior knowledge, scoped per half so the overview stays accurate for both:
   the job expects a TypeScript module the reader's pipeline can run with Node, the storage their
   platform offers, and their own email or messaging code, and no cairn knowledge beyond publishing
   from the admin; the next-step link also expects the reader to know their site's adapter file,
   where its `editor` block lives (link `docs/reference/core.md#defineadapter`). Do not name the two
   adapter paths here; the link section names which site it means (`f:q07rd5`), per the outline's
   job. What the page leaves out: feeds, for subscribers who pull new posts instead of being sent
   them, belong to "Build the public routes" (link only if `docs/extend/build-the-public-routes.md`
   is on disk at draft time, else the title alone); sending the message itself belongs to the
   reader's provider. This sentence may name the page, since scope has no subject-first form.
   Facts: `f:xlj297` (scoped to "storage is the site's", stated here as a precondition, not as the
   notice's flat claim).

Guard rails for the drafter:

- The intro must not pre-empt the right-tool notice's flat sentence ("The engine sends nothing and
  keeps nothing between deploys"). P1 frames the boundary by what the engine does (commit, stamp,
  diff); the notice says what it does not.
- Never claim how long a deploy takes, or that the link waits for the deploy (plan constraint).
- Name no CI vendor, runner, or Node version; Cloudflare appears only through storage, and the
  notice and "Before you begin" carry the KV and R2 links.
- Reread against the finished body with Google's check: the overview must match a page whose second
  task is the next-step link.

## Departures from the plan's introduction

1. **P1 adds `f:cjonmm` and `f:e69d0l`.** The plan's item 1 draws on `f:vrue1g`, `f:gkrell`, and
   `f:ix641z` only. The framing step must place GitHub and the deploy in the model and say why the
   job runs after the deploy; the publish commit triggering the deploy, and the manifest changing
   only in default-branch commits, are the two facts that do it.
2. **P1 links the first mention of the content manifest to `architecture.md#the-publish-commit`.**
   The plan defines "manifest" in the introduction by its path; the outline defines the term on
   "Architecture", so the intro names the path and links the term's home instead of re-teaching the
   write path.
3. **P2 adds `f:v5qalk` and `f:tdbki1`.** The plan's item 2 names the second reader but gives
   neither reader a way to choose. The single-publish-only behavior of the links, set against the
   job's coverage of Publish all, is that choice. `f:tdbki1` (scoped to "imports no engine server
   code") places the job outside the SvelteKit app; its primary home stays the job's import line.
4. **P3 keeps the plan's items 3 and 4 in one paragraph** and adds `f:xlj297` scoped to the
   storage precondition. No content change from the plan.
5. **An optional P1 clause depends on a fact this record would file** (would-file fact 1). Without
   it, the drafter omits the clause.

## Facts this record would file

1. **For `docs/internal/facts/extend.md`:** `ManifestEntry.publishedAt` is manifest-owned: no
   content file carries it, so the content manifest is the only place a site can read when an entry
   first went live, and every path that re-derives a row preserves the stamp rather than deriving
   it. Source: `src/lib/content/manifest.ts:53-58` (the `publishedAt` doc comment: "Manifest-owned:
   no content file carries it, so `manifestEntryFromFile` can never derive it and every path that
   re-derives a row preserves it instead (`upsertEntry` is that chokepoint)"). [verified]
