# Page plan: Act on newly published entries

Page: `docs/extend/act-on-newly-published-entries.md`. Page type: task guide. Status: new page, no
prior version on disk. Written 2026-10-12 by the plan step of the docs page chain (stage 2b part 1).
The drafter drafts from this plan: it is the source of the page's order, each section's claim, and
each fact's placement. The structural edit seat reads it before any prose exists. The plan is
Google's outline written down (Google Technical Writing Two, "Organizing large documents",
https://developers.google.com/tech-writing/two/large-docs): the outline is the document's
narrative, and information arrives where it is most relevant to the reader.

Inputs read: the outline entry in `docs/internal/outlines/extend.json` (slug
`act-on-newly-published-entries`: job, covers, out-of-scope list, exemplars); "The page anatomies",
"The introduction", and "The extend track" in `docs/internal/docs-register.md`; every fact bullet
named below in `docs/internal/facts/extend.md` and `docs/internal/facts/reference.md`; the two
exemplars (`extenders/django-custom-management-commands`, `extenders/sanity-custom-tool`); the
reference entries each link names (`docs/reference/delivery-data.md` `parseManifest`,
`buildNewlyPublished`, and the `ManifestEntry` and `Manifest` rows of its Types table;
`docs/reference/sveltekit.md` "The publish-actions seam" and `PublishActionEntry`;
`docs/reference/core.md` `defineAdapter`, added on the structural edit's revision); the sibling
pages `docs/extend/add-cairn-to-a-sveltekit-app.md` ("Index the content and commit its manifest"),
`docs/extend/add-a-custom-admin-screen.md`, and `docs/extend/debug-your-site.md` ("Session and
commit records"); the engine ruling on `ManifestEntry` (`docs/internal/engine-rulings.md:1112`,
kept because an announce-on-publish site annotates the rows); and the code the facts cite
(`src/lib/delivery/manifest.ts`, `src/lib/delivery/data.ts`, `src/lib/content/manifest.ts`
`stampFirstPublish` and `upsertEntry`, `src/lib/vite/internal.ts` `carryPublishStamps`,
`src/lib/sveltekit/content-routes-entry-destructive.ts:316-322`,
`src/lib/sveltekit/publish-actions.ts`, `src/lib/content/types.ts:308-315`). A plain-Node import of
the built `dist/delivery/data.js` was run once: it loads with no bundler, `parseManifest` accepts a
literal manifest, and `buildNewlyPublished` returns one entry for `(null, after)` and none for
`(after, after)`. That probe backs the running example's shape; it is not a fact the page cites.

Headings in this plan's section list are the page's headings, verbatim. A claim inventory `section`
names one of them. The introduction is the untitled text under the H1 and is named `Introduction`;
the notice right after it is named `Right-tool notice`.

## What the page argues

A publish commit stamps an entry's row in the committed content manifest the first time the entry
goes live, so two manifests from consecutive deploys say exactly which entries went live between
them. The page's spine is one running job, built once and run after every deploy: read the
deployed manifest, load the previous one from the site's own storage, diff the two with
`buildNewlyPublished`, hand the result to the site's send code, and save the deployed manifest for
the next run. The engine's part is the stamp and the diff; everything that moves data across
deploys or out of the site is the reader's. The page says so before the first step, so a reader
who wanted cairn to send the email learns it before writing code. The in-admin alternative closes
the page, as the outline's job sets it: a next-step link an editor sees at the moment of publishing,
a different mechanism for a different moment.

### The order, argued

Each section holds what the next one depends on.

1. **The introduction carries the model** (the stamp and the diff, `f:vrue1g`, `f:gkrell`,
   `f:ix641z` scoped). Without the stamp, "newly published" reads as "changed since the last
   deploy", and the reader would expect edits to fire the job.
2. **The right-tool notice sits directly under the introduction** (cover 3's first half,
   `f:xlj297`, `f:oduq77`), the Sanity exemplar's take. It is a scope decision, so it comes before
   any investment: the engine sends nothing and keeps nothing between deploys.
3. **Before you begin** names the committed manifest, a pipeline step that runs after the deploy,
   storage, and send code. The storage precondition restates cover 3 as a thing to have in hand.
4. **Write the post-deploy job** (covers 1 and 3's second half) is the Django exemplar's running
   example: where the file goes, the whole file once, then what each part does. The exports (cover
   1) land on the job's import line, where the reader first needs them, not in a section of their
   own.
5. **What counts as newly published** (cover 2) follows the code. The job's one cairn call is
   opaque until its rule is known, and the rule predicts every result the next three sections show.
   Placed before the code, it would be exposition with nothing to attach to; placed after Verify,
   the reader would verify a result they could not predict.
6. **Backfill on the first run** (cover 4) follows the rule, because `null` is defined by it (no
   prior stamps), and because it varies the job's first-run branch the reader has just written.
7. **Verify the job** comes after every variant of the job is settled. Purity (cover 5's last
   item, `f:pc3iy5`) moves here: it is the reason an offline check with two literal manifests
   works, which is where a reader acts on it.
8. **Expect renames and removals** (cover 5's first two items) explains three editor actions whose
   production results look wrong (a renamed post emailed again, a deleted post reported nowhere).
   The reader comes here after seeing one in production, so the section sits after Verify and its
   lead-in is framed as a result already seen, never as a check before production. It holds no
   procedure.
9. **Find a post the job did not send** is the anatomy's failure-path slot (item 5), under its own
   task heading so a reader whose post never went out finds it by its symptom. It follows the edge
   cases because a rename or recreate is the first thing to rule out, and it carries the page's one
   recovery link. It belongs to the job's task, so it sits before the second task.
10. **Add a next-step link after publish** (cover 6) closes the body. It serves the second reader
    the introduction routes, and it shares no code with the job. It is a second task after the
    first task's failure path, which bends the anatomy's single-task order; the outline's job sets
    two readers, and placing it last keeps the job's steps, verification, and failure path
    together. Its observable result is its closing sentence, so it carries its own verification.
11. **See also** closes the page, per the anatomy.

### Departures from the outline's covers order, with the reason for each

- Cover 1 (the exports) folds into "Write the post-deploy job", on the import line, as item 4
  argues.
- Cover 3 (persistence) splits: the notice states that storage is the site's, and the job's last
  step saves the manifest.
- Cover 2 (the rule) moves after the code, as item 5 argues.
- Cover 5 splits: purity goes to "Verify the job"; rename, delete-recreate, and removal form
  "Expect renames and removals" after Verify.
- The failure path is not an outline cover; the anatomy requires it, and it takes its own heading,
  "Find a post the job did not send", after the edge cases, as item 9 argues.

### Exemplar takes, and where each lands

- **Django, custom management commands.** One running example from start to finish: the
  `scripts/announce-new-posts.ts` file, shown whole once in "Write the post-deploy job", with the
  explanation of its parts after it, as Django shows `closepoll.py` and then explains `handle()`.
  Every later section refers back to that file. Left behind: the class reference.
- **Sanity, custom Studio tool.** The early "Right tool for the job?" notice lands as the
  right-tool notice under the introduction. Left behind: the plugin-sharing tail.

### Heading policy

Task headings start with a bare infinitive; "Before you begin" and "See also" are the anatomy's
fixed headings; "What counts as newly published" is the one explanation section and takes a noun
clause. No page links an anchor on this page today (a search of `docs/` for
`act-on-newly-published-entries.md#` returns nothing), so every heading is free.

## The introduction, in Google's three parts

No heading. It opens on a statement, never an imperative, and frames the page from above before
the contract (register, "The introduction"). Two or three paragraphs. The intro-framing step
reasons the final wording. Content items, in order:

1. **The model (what the document covers, framed from above).** A cairn site's committed content
   manifest, `src/content/.cairn/index.json`, lists every entry, and each publish commit patches it
   (`f:vrue1g`). The first publish that takes an entry live stamps its row with `publishedAt`, and
   later saves keep that stamp unchanged (`f:gkrell`). So the manifests of two consecutive deploys
   differ in exactly the stamps that landed between them, and `buildNewlyPublished` returns those
   entries (`f:ix641z`, scoped to "returns the entries that went live"; the full rule is its own
   section).
2. **Who and why, with the contract.** The reader is the developer whose organization wants
   something to happen when a post goes live, such as an email to subscribers. The contract
   sentence, inside the framing: write a post-deploy job that finds the entries a deploy newly
   published, hands them to your own send code, and saves the manifest for the next run. A second
   reader wants an editor to take a next step the moment they publish, with no job at all; name
   "Add a next-step link after publish" by heading for that reader (register, "A page may serve
   several readers").
3. **Prior knowledge.** A TypeScript module the reader's deploy pipeline can run with Node, the
   storage their platform offers, and their own email or messaging code. The post-deploy job needs
   no cairn knowledge beyond publishing from the admin. The next-step link needs one more: the
   reader knows their site's cairn adapter file, where the adapter's `editor` block lives. Link
   `docs/reference/core.md#defineadapter` for the adapter (opened and confirmed: the entry declares
   the adapter and lists `editor` among its optional members). Scope each half to its reader, so
   the intro's overview stays accurate for both.
4. **What the page does not cover, with the page that does (wrong-place routing).** Feeds, for
   subscribers who pull new posts instead of being sent them: `docs/extend/build-the-public-routes.md`.
   If that file is not on disk when the drafter runs, name the page by its title, "Build the public
   routes", without a link, and drop it from See also. Sending the message itself belongs to the
   reader's provider. This sentence may name the page, since scope has no subject-first form.

## Sections, in order

Each entry carries the page heading; **First sentence**, the one sentence a reader takes from the
section, which is the section's first sentence on the page (its claim is fixed here, its wording
may move to the register's voice, and a task-section sentence stays under 26 words); **Facts**, the
ids it draws on ("cited again" marks a fact whose primary home is another section); the content
and steps; and **Hand-off**, quoted where the plan fixes its wording (each quoted hand-off and
lead-in passed the provenance extractor with no row).

### Right-tool notice (untitled Note notice under the introduction)

**First sentence:** The engine sends nothing and keeps nothing between deploys: storing the
previous manifest and delivering the message are your site's job.

**Facts:** `f:xlj297`, `f:oduq77` (scoped to "pure and node-safe, keeps no cross-deploy state";
its rename clause is `f:df3hqw`'s home).

Content: one Note notice of two or three sentences, the Sanity exemplar's "Right tool for the
job?". After the first sentence: the storage is whatever the site already runs, KV, R2, or another
store (`f:xlj297`); `buildNewlyPublished` is pure and node-safe, so the job runs as a plain Node
script in the reader's pipeline (`f:oduq77`). The notice holds no procedural step.

**Hand-off:** none; "Before you begin" follows.

### Before you begin

**First sentence:** The job needs a committed manifest, a pipeline step after the deploy, storage
it can write between runs, and your own send code.

**Facts:** `f:vrue1g`, `f:xlj297` (cited again).

A bulleted list of preconditions, each with a link to what produces it where one exists (anatomy
item 2):

- The content manifest committed at `src/content/.cairn/index.json`, which a publish commit patches
  (`f:vrue1g`). A scaffolded site has it; a hand-built site commits it in
  `docs/extend/add-cairn-to-a-sveltekit-app.md#index-the-content-and-commit-its-manifest` (opened
  and confirmed: its step 3 runs `npx cairn-manifest`, which writes that path).
- A step in the deploy pipeline that runs after the deploy, in a checkout of the deployed commit.
  The pipeline is the reader's; no link.
- Storage the job reads and writes between runs (`f:xlj297`). Link Cloudflare's KV
  (https://developers.cloudflare.com/kv/) and R2 (https://developers.cloudflare.com/r2/) pages as
  two options, and say any store serves; copy no binding setup.
- Code that sends one message for one entry, the reader's own.

**Hand-off:** "With those in place, write the job."

### Write the post-deploy job

**First sentence:** The job reads the deployed manifest, loads the previous one from your storage,
diffs the two, sends each new post, and saves the deployed manifest.

**Facts:** `f:tdbki1`, `f:vrue1g` (cited again), `f:xlj297` (cited again), `f:gj96px` (added,
scoped to "the scaffold's posts concept id is `posts`"), `f:4wnm6o` (cited again: why the first
run seeds rather than passing `null`).

Content, in order:

1. One sentence placing the file: create `scripts/announce-new-posts.ts` in the site (a path the
   reader creates; the brief's `local` array).
2. The import line's claim, one sentence before the code (`f:tdbki1`): `buildNewlyPublished`,
   `parseManifest`, and the `Manifest` type come from `@glw907/cairn-cms/delivery/data`, which
   pulls in none of the engine's server code. Link the `parseManifest` and `buildNewlyPublished`
   entries in `docs/reference/delivery-data.md`.
3. The whole file, one `ts` block that typechecks alone (see Drafting constraints for its exact
   shape). It reads `src/content/.cairn/index.json` from the checkout and parses it as `after`;
   loads the stored manifest; on a first run with nothing stored, saves the deployed manifest and
   sends nothing; otherwise parses the stored text as `before`, calls
   `buildNewlyPublished(before, after)`, keeps entries whose `concept` is `posts` (`f:gj96px`), calls
   the site's send function for each, and saves the deployed manifest's text last.
4. After the block, a numbered walk of the file's four moves, one sentence each, under 26 words:
   read and parse the deployed manifest (`f:vrue1g`); load the stored one, seeding on the first run;
   diff and filter to `posts`; send, then save for the next run (`f:xlj297`). The seeding move
   carries one clause: passing `null` here instead would send every live post, which "Backfill on
   the first run" covers (`f:4wnm6o`, named by heading).
5. One sentence: a site whose posts concept has another id filters on that id. The returned
   entries are `ManifestEntry` rows; link the `ManifestEntry` row of the Types table in
   `docs/reference/delivery-data.md` for the fields the send code reads (opened and confirmed: the
   row lists `id`, `concept`, `title`, `permalink`, `publishedAt`, and the rest).
6. One sentence on running it: add the script as the pipeline's step after the deploy, from the
   site's root. Name no runner and no CI vendor.

**Hand-off:** "The diff's rule decides which entries reach your send code."

### What counts as newly published

**First sentence (the lead-in, tying the section to the task):** "Before you trust the job's
output, know the rule the diff applies to each entry." Its second sentence states the answer: an
entry counts when it is not a draft, carries a `publishedAt` stamp, and had no stamped entry at the
same `concept`/`id` key in `before`.

**Facts:** `f:ix641z`, `f:pm1osl`, `f:wv457z`, `f:gkrell` (cited again).

Content:

- The rule as a three-item bulleted list, in the order the code checks it (`f:ix641z`,
  `f:pm1osl`): the entry is not a draft; it carries `publishedAt`; no entry at the same
  `concept`/`id` key in `before` carried a stamp.
- One sentence on the stamp (`f:gkrell`): it is set at the first publish commit and kept through
  every later save, so an edit to a live post never reads as new.
- Two sentences on the draft check (`f:pm1osl`, `f:wv457z`): the draft check runs first and is not
  implied by the stamp check, because an entry an editor takes back to draft keeps its stamp. That
  entry never comes back while it is a draft.

**Hand-off:** "Your job seeds its first run; a backfill is the alternative for that run." (It names
the reader's own job's branch and points at "Backfill on the first run" by content, never by
position.)

### Backfill on the first run

**First sentence:** Pass `null` as `before` only for a first backfill, which sends every live,
stamped entry once.

**Facts:** `f:6cas58`, `f:4wnm6o`.

Content:

- One sentence (`f:6cas58`): with `before: null`, every stamped, non-draft entry in `after` comes
  back as newly published.
- One sentence (`f:4wnm6o`): every later run passes the stored manifest, since `null` on an ordinary
  run sends every live post again.
- One step, a single bulleted item: in `scripts/announce-new-posts.ts`, replace the first-run branch
  with a call that passes `null`, then let the job save the manifest as before. A short fragment
  shows the changed call, marked `snippet-check-skip` (it continues the job's file).

**Hand-off:** "With the first run settled, check the job before it emails anyone."

### Verify the job

**First sentence (the lead-in):** "Check the job in two passes, first offline and then against a
real publish."

**Facts:** `f:pc3iy5`. Cited again: `f:ix641z`, `f:gkrell`, `f:vrue1g`.

Content:

- **Offline**, one paragraph and one `ts` block that typechecks alone (`f:pc3iy5`): the function
  does no I/O and reads no clock, so two literal manifests give the same result on every run. The
  block builds `before` with one `posts` entry as a draft without a stamp and `after` with the same
  entry live and stamped, and checks that `buildNewlyPublished(before, after)` returns that entry and
  `buildNewlyPublished(after, after)` returns none. The result line: one entry, then none.
- **Live**, a numbered list, one action each, the location first, with the result under each step
  that produces one. The first step assumes a job that has run once, so its storage holds a
  manifest; say so in the list's lead-in sentence.
  1. In the admin, publish a new post.
  2. After the deploy, in the repository, open `src/content/.cairn/index.json`. The post's row
     carries `publishedAt` (`f:vrue1g`, `f:gkrell`).
  3. In the pipeline, let the job run after that deploy. Your send code runs once, for that post
     (`f:ix641z`).
  4. In the pipeline, run the job again with no new publish. It sends nothing, because the stored
     manifest now holds the post's stamp (`f:ix641z`).

**Hand-off:** "Some editor actions give results that look wrong until you know the rule."

### Expect renames and removals

**First sentence (the lead-in):** "If the job sends a post you expected it to skip, or stays silent
about one, look at what the editor did to that entry." Its second sentence states the answer: a
rename or a delete-then-recreate reads as a new post, and a removal reports nothing. The framing
matches the placement: the reader arrives after seeing the result in production.

**Facts:** `f:df3hqw`, `f:w3m0ac`, `f:u1mies`.

Content, a bulleted list of three cases, each one or two sentences:

- A rename changes the entry's `concept`/`id` key, so the job sends the renamed post as new
  (`f:df3hqw`).
- Deleting a post and creating one under the same id also reads as new, since the deleted row and
  its stamp leave the prior manifest (`f:w3m0ac`).
- A deleted post is never returned, so the job reports no removal (`f:u1mies`).

The section holds no procedure; the diagnostic for a missed send has its own heading.

**Hand-off:** "If a post never reached your send code at all, work through two checks."

### Find a post the job did not send

**First sentence:** When a post published from the admin never reaches your send code, check its
manifest row first and its commit record second.

**Facts:** `f:ix641z` (cited again).

Content, the anatomy's failure path (item 5): one numbered diagnostic list of two checks, each
naming its location first, one action each, every step under 26 words.

1. In the deployed `src/content/.cairn/index.json`, check that the post's row carries
   `publishedAt` and that the post is not a draft (`f:ix641z`, cited). A row without the stamp
   means the publish commit is not in that deploy.
2. For a publish that never committed, read the commit records in
   `docs/extend/debug-your-site.md`, section "`commit.succeeded` and `commit.failed`" (the
   recovery surface; opened and confirmed that the section exists). Claim nothing about what the
   record says beyond that link.

The drafter may add one sentence before the list pointing a reader whose post was sent as new
after a rename back to "Expect renames and removals" by heading; it carries no fact.

**Hand-off:** "An editor who needs a next step at the moment of publishing is served by a different
seam."

### Add a next-step link after publish

**First sentence:** An `editor.publishActions` list on the adapter shows next-step links beside the
publish-success strip, for the entry that just went live.

**Facts:** `f:ohq7b9`, `f:k7pq3d`, `f:r2vx8m`, `f:ozz6fs`, `f:q07rd5` (scoped to the two adapter
paths; its hooks and `src/access.ts` clauses are not used).

Content:

- One sentence on the difference from the job: the list is plain data the admin resolves on the
  server, and nothing runs when the editor publishes (`f:ohq7b9`). Without it, the publish-success
  moment shows no links (`f:k7pq3d`).
- One step, a single bulleted item (anatomy item 3), the location first: in the adapter file,
  `src/theme/cairn.config.ts` on a scaffolded site or `src/lib/cairn.config.ts` on the tutorial's
  hand-built site (`f:q07rd5`), add `publishActions` to the `editor` block. The adapter-file
  sentence names which site it means, per the outline's job.
- A `ts` block in the reference's shape: `{ label: 'Announce', href: '/admin/team/announce?post={id}',
  concepts: ['posts'] }` inside `editor.publishActions`, marked `snippet-check-skip` because it
  elides the adapter's other required groups, as `docs/reference/sveltekit.md`'s own example does.
- A three-row table or three bullets, one per member (`f:r2vx8m`, `f:ozz6fs`, `f:ohq7b9`):
  `label`, required and unique across entries; `href`, a required template string in which
  `{concept}` and `{id}` become the entry's identity, verbatim with no URL encoding, and any other
  brace token stays literal; `concepts`, optional concept ids that limit the link, absent meaning
  every concept.
- One sentence on validation (`f:ohq7b9`, `f:r2vx8m`): the list is checked once at server start, and
  a missing label, a repeated label, a missing href, or an undeclared concept id throws there.
- One sentence: an href can lead to a custom admin screen of the site's own; link
  `docs/extend/add-a-custom-admin-screen.md`. Link `docs/reference/sveltekit.md#the-publish-actions-seam`
  and `#publishactionentry` for the type.
- The observable result, the section's closing sentence, so the second task carries its own
  verification: publish an entry, and the link appears beside the success strip, on the published
  confirmation only (`f:r2vx8m`).

**Hand-off:** "The reference entries and related guides for these seams are listed under See also."
(It may open See also instead, as that section's introducing sentence.)

## Ending

### See also

The anatomy's item 6: related how-to guides, concept pages, and the limitations the page leaves
out, with the recovery link (`docs/extend/debug-your-site.md`) not repeated. One introducing
sentence, then a bulleted list, each item's link text naming its destination:

- `docs/reference/delivery-data.md#buildnewlypublished` and `#parsemanifest`, the two helpers.
- `docs/reference/delivery-data.md`'s Types table, the `Manifest` and `ManifestEntry` rows.
- `docs/reference/sveltekit.md#the-publish-actions-seam`, the next-step link seam.
- `docs/extend/add-a-custom-admin-screen.md`, a screen a next-step link can open.
- `docs/extend/build-the-public-routes.md`, the feeds, only if the file is on disk at draft time.

## Dispositions, every fact id

`carried` names the section that holds the fact's primary placement. The outline's 14 fact ids,
the five the page inputs added, and one container fact this plan adds are all carried. No fact is
subordinated and none is cut.

| Fact | Disposition | Section, or reference and reason |
| --- | --- | --- |
| f:ix641z | carried | What counts as newly published (the rule); scoped in Introduction; cited again in Verify the job and Find a post the job did not send |
| f:pm1osl | carried | What counts as newly published (the draft check first) |
| f:wv457z | carried | What counts as newly published (why the draft check is needed) |
| f:gkrell | carried | Introduction (the stamp, set once and kept); cited again in What counts as newly published and Verify the job |
| f:vrue1g | carried | Introduction (the committed manifest a publish commit patches); cited again in Before you begin, Write the post-deploy job, Verify the job |
| f:tdbki1 | carried | Write the post-deploy job (the import line) |
| f:xlj297 | carried | Right-tool notice (the engine sends nothing; storage is the site's); cited again in Before you begin and Write the post-deploy job |
| f:oduq77 | carried (scoped) | Right-tool notice (pure and node-safe, no cross-deploy state). Its rename clause is carried by `f:df3hqw` in Expect renames and removals |
| f:6cas58 | carried | Backfill on the first run |
| f:4wnm6o | carried | Backfill on the first run; cited again in Write the post-deploy job (why the first run seeds) |
| f:pc3iy5 | carried | Verify the job (the offline check) |
| f:df3hqw | carried | Expect renames and removals |
| f:w3m0ac | carried | Expect renames and removals |
| f:u1mies | carried | Expect renames and removals |
| f:ohq7b9 | carried | Add a next-step link after publish |
| f:ozz6fs | carried | Add a next-step link after publish (verbatim substitution, other tokens literal) |
| f:k7pq3d | carried | Add a next-step link after publish (the optional adapter member; absent shows no links). Option row `CairnAdapter.editor.publishActions` |
| f:r2vx8m | carried | Add a next-step link after publish (the three members, the duplicate-label throw, the published confirmation only). Option rows `PublishActionEntry.label`, `.href`, `.concepts` |
| f:q07rd5 | carried (scoped) | Add a next-step link after publish (the two adapter paths) |
| f:gj96px | carried (added, scoped) | Write the post-deploy job (the scaffold's posts concept id, the job's filter) |

The page-inputs claim inventory carried two more rows, disposed as it recorded them: the absent
prior page (no claims) and the feed routes, routed to `docs/extend/build-the-public-routes.md` from
the introduction and See also. Its "filed" rows for `f:r2vx8m` and `f:k7pq3d` are carried here,
because the reference entry does not state the duplicate-label throw (friction filed), so the page
states the members itself rather than linking them.

## Friction filed

The page-inputs step filed three entries on 2026-10-12 (the rename and delete-recreate re-read,
`f:df3hqw`, `f:w3m0ac`; the unencoded substitution, `f:ozz6fs`; the adapter comment omitting the
duplicate-label throw, `f:r2vx8m`), and this plan does not refile them. This plan filed three
entries in `docs/internal/docs-friction-log.md` on 2026-10-12, none blocking the page:

1. An entry that reaches `main` outside the admin's Publish never carries `publishedAt`, so the job
   never sends it, and no container fact states it.
2. The rename path carries the original stamp onto the new key, but `buildNewlyPublished` matches
   on the key alone and reads the rename as new.
3. `docs/reference/sveltekit.md`'s publish-actions seam says the validation "fails the build" where
   the code and `f:ohq7b9` say server start, and it omits the duplicate-label throw and the
   unencoded substitution.

## Drafting constraints

- **The job's file**, one `ts` block that typechecks alone against the built package:
  `/// <reference types="node" />` on its first line (the snippet gate's convention for Node
  types); `import { readFile } from 'node:fs/promises'`; `import { buildNewlyPublished,
  parseManifest, type ManifestEntry } from '@glw907/cairn-cms/delivery/data'`; three `declare
  function` lines for the site's own code, `readPriorManifest(): Promise<string | null>`,
  `savePriorManifest(raw: string): Promise<void>`, and `sendNewPostEmail(entry: ManifestEntry):
  Promise<void>`, each with a short comment naming it as the reader's (storage in KV, R2, or
  another store; the email provider's API). The body is an `async function main()` called at the
  end. It reads `src/content/.cairn/index.json` as UTF-8, seeds and returns when nothing is
  stored, and saves the deployed manifest's raw text after the sends.
- **The brief's `local` array** takes the names the page has the reader create:
  `scripts/announce-new-posts.ts`, `readPriorManifest`, `savePriorManifest`, `sendNewPostEmail`,
  and `main`.
- **The offline block** builds its manifests as typed `Manifest` literals (`version: 1` and
  entries with every required `ManifestEntry` field), or through `parseManifest` on a JSON string;
  either way the gate typechecks the fields. Use `node:assert`'s `strictEqual` on the result
  lengths, or `console.log` of them; claim no test runner.
- Never say an entry committed outside the admin's Publish is announced, or that it is skipped; no
  container fact states either (friction entry 1). The page speaks only of posts published from
  the admin.
- Never propose a way to suppress a rename's re-send, such as comparing `publishedAt` against a
  date; no fact backs one (friction entry 2). State the behavior only.
- Write the validation moment as server start, never "fails the build", whatever
  `docs/reference/sveltekit.md` says (friction entry 3).
- Never claim when the deploy happens relative to the publish, how long it takes, or that the
  next-step link waits for it.
- Never name a CI vendor, a TypeScript runner, or a Node version; the pipeline is the reader's.
- Vendor specifics get a link, never a copy: KV and R2 setup and bindings, the email provider.
- The feed routes stay off this page beyond the one wrong-place sentence and the See also row.
- `buildNewlyPublished`, `parseManifest`, `Manifest`, `ManifestEntry`, and `PublishActionEntry`
  in code spans; "publish-success strip" as the reference names it; "manifest" as the track's
  product term, defined once in the introduction by its path.
- Every section opens on the first sentence decided above. Each step names its location before
  its action and holds one action, and a procedure of one step is a single bulleted item. A
  reference names its target by heading, never by position.
