# Page plan: Architecture

The plan for `docs/extend/architecture.md`, a concept page in the extend track. Written
2026-10-03 as the plan step of the docs page chain (stage 2a task 7c, run ahead of the task 7b
resolution), revised the same day on the structural edit seat's findings, and revised again the
same day for the resolution run's two blocking register findings on the committed introduction
(the tables near the end record each). Only the introduction's covers and out-of-scope parts
changed at the second revision; every section, claim, and placement is unchanged from the version
the plan read accepted. The drafter drafts from this plan: it is the source of the page's order, each
section's claim, and each fact's placement. The brief sits beside it at
`docs/internal/briefs/extend/architecture.json`. The plan is Google's outline written down
(Google Technical Writing Two, "Organizing large documents",
https://developers.google.com/tech-writing/two/large-docs).

## What binds this plan

- **The job** (`docs/internal/outlines/extend.json`, slug `architecture`): "Learn where cairn ends
  and your site begins: which export subpath each piece of your site imports, which seams you
  extend through, where each kind of state lives, and what each tier of the public surface
  promises across versions. For a Svelte-fluent web developer evaluating cairn against
  alternatives or taking over a scaffolded site."
- **One reader in two situations.** The evaluator reads the page end to end to decide whether
  the boundary suits them. The developer taking over a scaffolded site reads it to map the files
  they inherited onto the engine's import points, seams, and stores. Both want the same four
  answers in the job's order, so the body keeps that order and sets the mechanics between the
  seams and the state: the subpaths, the seams, the path an edit takes and how the admin reads
  it back, the stores, the dependencies the engine never abstracts, and the promise.
- **Anatomy** (`docs/internal/docs-register.md`, "The page anatomies", concept page): an
  introduction in Google's three parts that states the subject and never describes the page
  itself; a definition of the concept; one subtopic per section; a related-resources ending
  grouped as how-to guides, concepts, and external resources, 3 to 5 links each. The owner ruling
  of 2026-10-01 adds a one-line contract as the introduction's first sentence.
- **Exemplar takes.** From rust-analyzer's architecture page
  (`~/.local/share/cairn/exemplars/core/rust-analyzer-architecture/page.md`): the bird's-eye view,
  then the entry points, then a code map with one invariant line per box stating what it never
  does; the crate granularity and the Rust vocabulary stay behind. From Litestream's "How it
  works" (`~/.local/share/cairn/exemplars/evaluators/litestream-how-it-works/page.md`): follow
  one unit of data, here one edit from save to holding branch to publish to deploy, and state
  each guarantee at the step that creates it; the file-format internals stay behind.
- **Owner rulings (Geoff, 2026-09-30 and 2026-10-01).** Every page gets an introduction per the
  anatomy. A plan may push a fact off the page: subordinated to a named reference entry, or cut
  with a reason, never dropped. Qualified claims stay whole, named for this page's `f:0xxou5`.
- **Round-2 findings** (`docs/superpowers/research/2026-10-01-draft-docs-2a-rework-record.md`,
  "### architecture", and "Edit history" under "Not conflicts"): a blocking finding applies where
  this plan keeps the sentence it cites, and a finding on a sentence this plan drops is disposed
  here. The table near the end maps all three blocking findings and the non-blocking ones the
  plan takes.
- **Resolution run findings**
  (`docs/superpowers/research/2026-10-03-draft-docs-2a-resolution-run-record.md`,
  "### architecture", "Escalation findings (final, in full)"): the structural edit, the fact
  read, and the figure verifier accepted the drafted page; the register editor returned two
  blocking findings, both in the introduction (the covers lead-in at `:5-12` and the
  out-of-scope sentence at `:14`). The conductor's ruling of 2026-10-03 has this plan address
  each at its line without widening; the last table records both dispositions.
- **The job read** (`docs/superpowers/research/2026-09-30-draft-docs-2a-pilot-job-read.md`,
  "Findings by page"): the seams section ended in three unrelated paragraphs, commit concurrency
  sat detached from the write path, the page stopped on a link with no closing synthesis, and
  "capability" first appeared untied to its seam. Each has a disposition below.
- **The diagnosis** (`docs/superpowers/research/2026-10-01-draft-docs-2a-page-plan-diagnosis.md`):
  the committed page reads as atoms. This plan decides what the page argues, which facts carry
  the argument, and which are detail the reference already holds.

Two places where the outline and the facts disagree, resolved here so the drafter meets neither
as a surprise.

- The outline's third cover names the three places a site touches the engine as "adapter via the
  root barrel, the SvelteKit layer, the admin mount". `f:3rb362`, verified against the Waymark
  template, names them as the adapter module, the admin mount, and the public routes. The page
  follows the fact, and the SvelteKit layer appears as what runs behind those three calls
  (`f:40pxcq`). The round-2 drafter recorded the same call; the outline's wording is the
  outline's to fix.
- The outline's fourth cover lists seven seams and `f:i87sd3` lists six, with `AssetConfig`
  (media) on the fact's side only and `identity` and custom admin routes on the cover's side
  only. The page lists the union, eight rows, states no count, and holds the media row to one
  line, since the media settings themselves are `docs/extend/configure-media.md`'s.

## The argument, and the order it needs

The page argues one thing: cairn draws its boundary at one adapter, and everything a site does
lands either on one of three import points, on one of a short list of seams, or outside the
engine. From that boundary the rest follows: the engine moves an edit through git on one path,
keeps each kind of state where the code that reads it lives, and promises each export's shape
by tier. The reader leaves knowing which code is theirs, which contracts they lean on, and what
an engine update can move.

1. **The surface** (sections 1 to 3). Entry points first, because the job's first clause is
   "which export subpath each piece of your site imports" and three import points answer it for
   the site's own files. The export map second, because once the reader knows the four subpaths
   their site touches, the full map and its placement rules say what else exists and why it
   lives where it does; the placement rules are the rust-analyzer invariant lines. Seams third,
   because the map says where an export lives and the seams say which exports a site hands code
   or data to. The job read's "capability untied to its seam" is met by placing the role
   vocabulary inside the access-map row, tied by the mapping the code states.
2. **The machine** (sections 4 to 6). The write path is the Litestream spine: one edit from save
   to holding branch to publish to deploy, each guarantee at its step. Commit concurrency becomes
   a subsection of the write path instead of a detached section, placed between the publish
   commit and the build, so the commit-time rules land beside the commits they govern and the
   spine still ends at the deploy. The subsection widens on purpose: the save and publish commits
   the path describes take the head-merge retry, and the admin's other commits (nav, settings,
   vocabulary, media, revert) take the same retry or the head guard, so the reader meets every
   rule once, where the first commits it governs appear. The read path follows, short, because it
   explains why the content manifest exists in git. The data tiers then place every kind of
   state by what reads it, and the D1-rows-and-edit-record cover folds into this section rather
   than a separate "Edit history" section, which held the round-2 contradiction.
3. **The ground** (sections 7 and 8). Hard dependencies state what the engine will never
   abstract, and the one store a site can swap. The Backend contract follows directly, since it
   is the contract that swap keeps. The committed page put the contract after the read path; the
   hand-off from "the content store is the one swappable dependency" is the stronger one, and a
   reader who will never build a second backend meets the contract last among the mechanics.
4. **The promise** (section 9). The stability tiers close the body because they are the job's
   last clause and the one that depends on everything before it: the reader has met the exports
   and the seams and now learns what each promises across versions, with the `0.86.0` break as
   the worked example. This section ends the body on the synthesis the job read found missing.
5. **Related resources** (section 10), the anatomy's ending.

Three departures from the outline's cover order, with reasons. Commit concurrency (cover 11)
moves into the write path (cover 5), between the publish commit and the build, because the job
read found it detached, the save and publish commits it classifies are the path's own, and the
admin's other commits take the same two rules, so one subsection beside those commits states
every rule once. The D1 rows and the edit record (cover 8) sit inside
Data tiers (cover 7), because the cover's content is a list of what D1 holds and what git holds,
and a one-claim "Edit history" section fails the anatomy's one-subtopic test. The Backend
contract (cover 12) follows Hard dependencies (cover 9) instead of the read path, for the
hand-off stated above.

### Heading policy

Headings are noun phrases in sentence case, with no leading -ing word, no question, and no
teaser (`docs/internal/docs-register.md`, "Structure"). No other page links an anchor on this
page: `docs/extend/README.md` and `docs/extend/security-model.md` link the page whole, and the
outline carries no relink pointer restored by it, so every slug is free to change. The table
lists each committed heading and its fate.

| Committed heading | Heading on this page | Slug |
| --- | --- | --- |
| Entry points | Entry points | unchanged |
| Export map | Export map | unchanged |
| Seams | Seams | unchanged |
| Write path | Write path | unchanged |
| Save commits (H3) | The holding branch | `#the-holding-branch` |
| Branch existence (H3) | folded into The holding branch | removed |
| Publish commit (H3) | The publish commit | `#the-publish-commit` |
| Commit concurrency (H3) | Concurrent writes | `#concurrent-writes`, moved before Build verification |
| Build verification (H3) | Build verification | unchanged |
| Read path | Read path | unchanged |
| Backend contract | Backend contract | unchanged, moved after Hard dependencies |
| Data tiers | Data tiers | unchanged |
| Edit history | folded into Data tiers | removed |
| Hard dependencies | Hard dependencies | unchanged |
| Stability tiers | Stability tiers | unchanged |
| Related resources | Related resources | unchanged |

"Branch existence" named the mechanism (a round-2 structural finding); "The holding branch"
names the subject, and the pending state is one claim inside it.

### The figure

The committed mermaid figure (the write path and the three data tiers, topology only) stays, at
the head of the Write path section, where the round-2 figure verifier found it earns its place.
The round-2 structural read noted that its D1 and R2 nodes arrive before the data tiers are
introduced. The plan answers that in the section's second sentence, which names the three stores
the path crosses (`f:pgy0mr`) before the figure appears, so every node is introduced where the
reader meets it, and the caption names Data tiers as the section that states what each store
holds. The drafter changes the diagram, its `accTitle`, its `accDescr`, or its caption only where
a fact placed here changes a claim they make; the `cairn-figure` skill governs any edit and the
figure verifier reads the result.

## Introduction

Under the title, no heading, in this order: the contract paragraph; the covers list under its
lead-in; the prior-knowledge paragraph, which also leads into the out-of-scope list; and the
definition paragraph. Google's three parts arrive as statements about the subject, never about
the page: no sentence opens on the page, names a section, or refers to a position.

**Paragraph 1: the subject, why it matters, and the one-line contract.** Three sentences. The
first sentence is the contract, one line: cairn manages a site's markdown content and its admin
frame, and everything else a site needs is the developer's, reached through a short list of
seams (`f:99f221`, `f:bhyvqg`). The second is the consequence for this reader: the boundary
between the two decides which code a site writes and which engine contracts it relies on across
releases (`f:bhyvqg`). The third is the surface's shape: the seams form a narrow, versioned public
surface (`f:gknz29`). Each takes its own sentence; the resolution run's drafter chained the
three into one 50-word sentence, which the register editor flagged. Key phrases: a sentence that
uses "not a platform" cites `f:99f221`, one that uses "thin seam, not a built-in feature" cites
`f:bhyvqg`, and one that uses "every break is disclosed" cites `f:gknz29`. The first two phrases
carry the contrast frame the register lists as a tell, so the drafter writes the clauses without
them (the committed page's "stops at markdown content management and the admin frame" is the
model) and cites the facts for the claims they carry.

**The covers list: what the subject covers.** A complete lead-in sentence and a bulleted list of
six items in page order. The lead-in names the list's subject plainly and claims nothing about
it: no "parts of the boundary", no "the boundary runs from ... to ...", no spatial or structural
figure. Round 2 flagged the first of those frames and the resolution run's register editor
blocked the second ("The boundary between the engine and a site has the following parts"): the
edit path, the stores, and the dependencies are not parts of a boundary, so a lead-in that says
they are makes a false claim in a structural position. Model lead-in: "The architecture has the
following subjects." (the register editor's plainer rewrite without its "in the order a site
meets them" clause, which asserts an order the page never demonstrates). The items, each a noun
phrase in one form with no code span or numeral: the export subpaths a site imports; the seams a
site extends through; the path an edit takes from a save to the deploy, and how the admin reads
content back; the stores that hold each kind of state; the dependencies the engine never
abstracts, and the contract the swappable content store keeps; the promise each export carries
across versions. The list is the plan's own form, not a drafter departure: parallel items that
need no order form a bulleted list (`docs/internal/docs-register.md`, "Structure"), and the
structural edit confirmed that the committed list matched the body's subjects and order, which
is what Google's review step asks of the introduction.

**The prior-knowledge paragraph and the out-of-scope list: what the reader brings, what sits
elsewhere.** One paragraph of two sentences, then a bulleted list of five items.

- *Prior knowledge*, the paragraph's first sentence. Working with the seams takes knowledge of
  SvelteKit routing, load functions, and form actions, and of Cloudflare Worker bindings, because
  the engine builds on both and abstracts neither (`f:djoxr9`; the external resources at the end
  link all four subjects, which answers the round-2 note that the prior-knowledge sentence named
  load functions the links did not cover).
- *Doesn't cover*, the paragraph's second sentence and the list it introduces. The second
  sentence is the list's lead-in, a complete sentence that says separate pages cover the subjects
  that follow and never names the page itself (model: "Separate pages cover the following
  subjects."). Then five items in one form, the subject first and its page last, each opening on
  a capital letter: the security properties of each piece, in `docs/extend/security-model.md`;
  the adapter, declared field by field, in `docs/extend/define-an-adapter-and-schema.md`;
  concepts and fieldsets in depth, in `docs/extend/content-model.md`; each export's signature,
  in `docs/reference/README.md` (link text "the export reference"); the upgrade procedure, in
  `docs/extend/upgrade-cairn.md`. Media settings and the migration record are linked from the
  body sections that need them (Data tiers and Stability tiers), so the introduction carries five
  links. The earlier revision asked for these in prose because round 2 had called the committed
  six-item list soft overlinking; the resolution run's drafter met that instruction with a
  70-word sentence chaining five subject-and-link pairs, and the register editor blocked it as
  list cadence in prose and asked the conductor to rule on the plan conflict. Ruled here, under
  the conductor's dispatch: the list returns, because the guide prescribes a list for parallel
  items (`docs/internal/docs-register.md`, "Structure", and the tell "No list cadence in prose"),
  the covers list above already takes that form, so the introduction treats parallel items one
  way, and the overlinking note was about the link count and the repetition in Related
  resources, which the five-link set and the body-linked media and migration pages already
  answer. The form changes; the five subjects and their pages do not.

The lead-ins and every item in both lists are anatomy sentences (`no-claim`), and the
prior-knowledge sentence carries its citation, so none holds a code span, numeral, or version
that `check:provenance` would read as an extractable fact.

**The definition paragraph** (the anatomy's "a definition of the concept follows"). A cairn
site declares one adapter, a single `CairnAdapter` object, and every route factory, admin screen,
and delivery helper reads its behavior from that object; the engine hard-codes no concept,
directory, or field (`f:4esdoz`). This is the outline's first cover and the bird's-eye view the
rust-analyzer take asks for: one paragraph, no list. The committed page placed it after the
out-of-scope list and the round-2 read flagged the placement; here it is the paragraph the
anatomy puts after the summary, and the out-of-scope list sits inside the introduction's
scope statement, where the anatomy places what is out of scope and the pages that cover it.

## Sections

Each entry carries the heading; **Takes**, the one sentence a reader keeps, which is the
section's first sentence on the page; **Draws on**, the fact ids placed here with what each
contributes; and **Hand-off**, the turn the section closes on, with any subordination or cut it
carries. A hand-off is a turn in the subject and never a reference to the page's own order ("the
next section", "below"); the heading that follows does the navigation. It is the last sentence of
the section's final paragraph, never a one-sentence paragraph of its own: the resolution run's
first-round register read blocked twelve bridge paragraphs, the drafter then dropped the
hand-offs, and the structural edit asked for them back as closing sentences.

### 1. Entry points

- **Takes:** A site touches the engine in three places, and each place imports its own subpath.
  (`f:3rb362`)
- **Draws on:** `f:3rb362` as a bulleted list of three items in one form, each naming the place
  and the subpath: the adapter module imports `defineAdapter` from the root barrel, and
  `composeRuntime` folds the adapter into the runtime that `createCairnAdmin` from `/sveltekit`
  closes over; the admin mount renders `CairnAdmin` and `CairnAdminShell` from `/admin` over that
  factory's `load`, `shellLoad`, and `actions`; the public routes call `createPublicRoutes` and
  the feed, sitemap, and robots responders from `/delivery`. Then `f:40pxcq`, what runs behind
  the calls: the `/sveltekit` layer reads and writes the content repository through the
  `Backend`, renders through the render pipeline, and reads and writes the media store and the
  auth store, while the components on `/admin` receive what that layer loads as props. The
  rust-analyzer invariant line for this box: the admin's components hold no I/O of their own.
  Then `f:n3cvf9`, what is engine-internal behind them: directive stamping and dispatch inside
  the render pipeline, the commit tree shape sent to the GitHub API, and the guard's CSRF and
  session resolution, each behind a stability-tiered subpath (`/render`, `/sveltekit`,
  `/auth-crypto`) and none a seam a site reaches into.
- **Hand-off:** The three places import four subpaths, and the full map holds more, with rules
  that fix what each subpath may contain.

### 2. Export map

- **Takes:** Most of the export map falls into six functional groups, each a set of subpaths
  with one job. (`f:a7qx4m`)
- **Draws on:** `f:a7qx4m` as the two-column table the committed page carries (group, subpaths),
  introduced by a complete sentence. Then `f:bmxw7w` for the one group that needs a gloss:
  `/islands` is the separate client runtime that mounts a site's live components. Then
  `f:533flu` for the subpaths outside the six groups: `/delivery/head`, `/delivery/data`,
  `/reproductions`, `/reproductions/manifest`, `/log`, and the two style sheets
  `/admin-sources.css` and `/cairn-public.css`; the page links `docs/reference/README.md` as the
  index that documents every subpath and does not restate the `check:reference` gate, which is
  the engine's own process. Then the placement rules as the invariant list, one item per rule,
  introduced by a complete sentence: nothing on the root barrel imports SvelteKit; nothing on
  `/sveltekit` is a `.svelte` file (`f:0duu5p`); admin components live on `/admin`, built-in
  public components on `/public`, and no `/components` subpath exists (`f:bmxw7w`, `f:0duu5p`).
  Then the two consequences a site meets, each one sentence: the root barrel carries no server
  route, no Svelte component, and no per-request binding, so a build script imports it outside
  any request, as the `cairnManifest` plugin does inside the app's Vite graph (`f:5uhx5o`; link
  the `cairnManifest` entry in `docs/reference/vite.md`); a `/sveltekit` export bundled with
  plain esbuild outside Vite, such as `createD1AuditSink` in a Cron Worker, needs no alias for
  `$app/environment`, because `loadPreview` on the same subpath imports that module dynamically
  at call time (`f:ppqu4v`; link the `loadPreview` entry in `docs/reference/sveltekit.md`, which
  states the dynamic import).
- **Hand-off:** The map says where each export lives, and the seams say which of them a site
  hands its own code or data to.

### 3. Seams

- **Takes:** A site adds a concept, a role, or an admin screen through a seam, and none of the
  three forks the engine. (`f:6a32oy`)
- **Draws on:** A definition sentence, `no-claim`: a seam is a documented point where a site
  supplies code or data the engine reads. Then the table, introduced by a complete sentence that
  states its purpose and names its columns plainly (the round-2 register read flagged the
  committed lead-in and the "Used in" header as imprecise): seam, what the site supplies, and
  the guide that configures it. Each row is self-contained in one line, and no detail list
  follows the table (the job read's three unrelated paragraphs and the round-2 grab-bag finding).
  - The `content` map: a `ConceptConfig` with a `fieldset` for each concept (`f:i87sd3`);
    `docs/extend/content-model.md`.
  - `render`: a renderer built with `createRenderer` (`f:i87sd3`);
    `docs/extend/configure-rendering.md`.
  - Roles and the access map: a role vocabulary in which each role name the site defines maps to
    one of the engine's three capabilities, `none`, `editor`, or `owner`, and an access map over
    those names that only narrows what a capability already permits (`f:3pposq` for the
    vocabulary and the three values, `f:p1xmp5` for the mapping and the narrowing; `f:i87sd3`
    names the seam); `docs/extend/restrict-admin-access.md`. This row carries the round-2
    register rewrite's substance: capability is tied to the role vocabulary in the sentence that
    introduces it, and the two definitions no longer sit side by side.
  - The `identity` option on `createAuthGuard`: a proven email from the site's own gate, in
    place of the built-in sign-in path, with the roster lookup kept (`f:fhit7f`);
    `docs/extend/replace-magic-links-with-cloudflare-access.md`. The option's no-token, no-session,
    no-cookie consequences are `docs/extend/security-model.md`'s and stay off this row.
  - Custom admin routes: a route file under `src/routes/admin/`, which SvelteKit resolves ahead
    of the `[...path]` catch-all and which renders inside `CairnAdminShell`'s chrome through the
    shared admin layout with no registration (`f:03zj56`, `f:brfitv`, `f:6a32oy`);
    `docs/extend/add-a-custom-admin-screen.md`.
  - `navLayout`: a site entry under `editor.navLayout` that lists a custom screen in the sidebar
    (`f:i87sd3`, `f:6a32oy`); `docs/extend/arrange-the-admin-sidebar.md`.
  - `media`: an `AssetConfig` for the media store (`f:i87sd3`); `docs/extend/configure-media.md`.
    One line, since the settings are that page's.
  - `BackendProvider`: a content backend other than GitHub, with `createGithubApp` the one
    provider the engine ships (`f:n1om0r`, `f:i87sd3`); the `BackendProvider` row of the "Types"
    table in `docs/reference/core.md`, since no page builds a second backend, and the Backend
    contract section on this page states the semantics a provider keeps.
- **Hand-off:** Every seam feeds the one path an edit takes from a save to the live site.

### 4. Write path

- **Takes:** An edit reaches the live site through a save onto a holding branch, a publish that
  copies the branch onto the default branch, and the deploy the publish commit triggers.
  (`f:cjonmm`, `f:qehbx3`)
- **Draws on:** The second sentence names the three stores the path crosses, git for the edit
  and both manifests, D1 for the session the guard checks on each admin request, and R2 for media
  bytes (`f:pgy0mr`), so the figure's nodes are introduced before the figure. Then the figure,
  with its caption naming Data tiers as the section that states what each store holds. Then four
  subsections in path order: the save, the publish, the rules under which those two commits and
  the admin's other commits land on a moved head, and the build; each step states its guarantee
  where the step creates it.
- **Hand-off:** The path starts where an editor saves.

#### The holding branch

- **Takes:** A save commits the edit to a per-entry branch named `cairn/<concept>/<id>` through
  the site's GitHub App installation token, with the signed-in editor as author and no committer.
  (`f:cjonmm`)
- **Draws on:** `f:5kerxw` (each later save commits onto the same branch, so an editor iterates
  across saves while the entry stays off the live site; an entry is pending when its branch
  exists and no other state marks it; the concept list finds pending entries by listing the
  branches under `cairn/<concept>/`); `f:e69d0l` (a save commits no manifest change). The
  guarantee at this step: nothing a save does reaches the live site or the manifest.
- **Hand-off:** The branch holds the edit until a deliberate publish.

#### The publish commit

- **Takes:** A publish copies the holding branch's content onto the default branch in one commit
  with the editor as author, and the entry's row in the content manifest lands in the same
  commit. (`f:qehbx3`, `f:e69d0l`)
- **Draws on:** `f:w379wu` (no committer is set, so GitHub attributes the commit to the App);
  `f:cjonmm` (the installation token signs it); `f:0oyrh6` (publish-all commits every pending
  entry the editor can reach, plus the manifest, as one commit to the default branch, so one
  deploy fires); `f:e69d0l` (a delete or a rename carries its manifest change in the same
  default-branch commit as its file change, so the manifest changes only in a default-branch
  commit that changes an entry); `f:0xxou5`, whole and in one sentence: after a publish lands,
  the engine deletes the holding branch only when the branch head still equals the SHA the publish
  captured, so a save that lands during the publish keeps the entry pending. The page never says
  a publish is the only action that deletes the branch (the round-2 fact read's point; discard,
  delete, rename, and revert also delete it, and none is this page's subject).
- **Hand-off:** A save and a publish each land on a head another editor may have moved since the
  admin read it.

#### Concurrent writes

- **Takes:** An edit's save and publish commits take a head-merge retry against a head another
  editor has moved, and the admin's other commits take either that retry or a head guard that
  fails on the first stale head. (`f:0gihxq`)
- **Draws on:** The first sentence widens the subject on purpose, from the two commits the path
  has made to every commit the admin makes, so the rules are stated once. Then `f:0gihxq` as two
  sentences or a two-item list in one form: the retry makes three further attempts against a
  moved head before it reports a conflict, and it covers entry save, single publish, publish-all,
  entry delete and rename, and the media delete and metadata commits; the guard fails on the
  first stale head, and it covers the nav, tidy-settings, vocabulary, media upload manifest, and
  revert commits. The page states which commit takes which rule and claims nothing about what the
  retry preserves: the friction log's `extender` entry on `f:0gihxq` records that the retry
  re-parents precomputed contents, so a "preserves a concurrent commit" sentence would need a
  caveat this page has no room for. The branch-cleanup condition is already stated at the publish
  step and is not repeated here (the committed page stated it here and the job read found the
  section detached).
- **Hand-off:** The publish commit that lands under the retry is the one the deploy builds.

#### Build verification

- **Takes:** The publish commit triggers the site's existing deploy, and the build rebuilds the
  content manifest and verifies it against the markdown on disk. (`f:cjonmm`, `f:e69d0l`)
- **Draws on:** `f:e69d0l` (the `cairnManifest` plugin rebuilds and verifies in `buildStart`);
  `f:n0laoh` (a committed manifest that has drifted from the markdown fails the build; link the
  `cairnManifest` entry in `docs/reference/vite.md`). The guarantee at this step: a live site
  never serves a manifest that disagrees with its markdown.
- **Hand-off:** The engine reads content back from the same two places it writes, the holding
  branches and the default branch.

### 5. Read path

- **Takes:** The admin reads one entry from a concurrent batch of reads through the `Backend`
  and reads the whole corpus from the committed content manifest. (`f:cng7dr`)
- **Draws on:** `f:cng7dr` (the batch covers the file, its pending branch head, the committed
  manifest, and the media manifest; corpus-wide facts, the concept list's published entries,
  inbound links, reference and media usage, and the link check on save, come from the manifest on
  the default branch rather than a crawl of the entry files).
- **Hand-off:** The manifest the corpus reads lean on is one of three kinds of state the engine
  commits to git, and git is one of three stores the engine places state in by what reads it.

### 6. Data tiers

- **Takes:** The engine keeps state in three tiers, git, D1, and R2, and places each kind of
  state by what reads it. (`f:pgy0mr`)
- **Draws on:** `f:b6gquz` as a two-column table (tier, what it holds), introduced by a complete
  sentence; the committed "Keyed by" column is dropped, since how a token or session row is keyed
  is `docs/extend/security-model.md`'s subject, and the R2 sentence below carries the
  content-hash keying that matters here. Then one paragraph per tier.
  - *Git.* `f:lu67dk` (both manifests are committed JSON under `src/content/.cairn/`, and the
    media manifest describes bytes that live in R2); `f:6ign7q` (a content manifest row carries an
    entry's title, permalink, summary, links, and edges and never its body; no D1 table stores a
    body, so a body lives only in git); `f:4t707i` (the media manifest keys each row by a 16-hex
    content-hash prefix and is the dedup lookup an upload checks before storing anything, which is
    why it sits in git beside the content manifest rather than in R2). Then the edit record, one
    sentence: every publish is a commit on the default branch with the editor as author, so the
    default branch's history records who published each change and when, with no audit table
    involved (`f:70mf58`, `f:w379wu`). The page makes no claim about where the save commits go
    after a publish; the holding-branch and publish subsections already state what a save commits
    and when the branch is deleted (a friction entry records that `f:70mf58` states a finer trail
    than the default branch keeps).
  - *D1.* `f:pgy0mr` (the guard looks up the `session` row by its session-cookie id on each admin
    request, and sign-in looks up a `magic_token` row by its SHA-256 hash); `f:b6gquz` (the
    `editor`, `magic_token`, and `session` tables, plus the opt-in `audit_log` and
    `preview_tokens`); `f:wnvqlz` (only a site that wires `createD1AuditSink` writes `audit_log`,
    one row per audited admin action); `f:dtwvtz` (only a site that mints preview links writes
    `preview_tokens`, one hashed token per link, each row naming the draft it shares). The
    security properties of these rows are `docs/extend/security-model.md`'s, linked here (the
    round-2 structural note). The sentence that points a site at the roster functions it calls
    from its own code links `docs/reference/auth-store.md` with no code span, since `f:4b3rhm` is
    subordinated to that page.
  - *R2.* One sentence, `f:lu67dk`: R2 holds the media bytes, since neither a git repository nor a
    D1 row suits binary assets at megabyte scale; link `docs/extend/configure-media.md` for the
    settings. One sentence only, since the round-2 register read found the committed R2
    paragraph a restatement.
  - *A site's own data.* `f:qrwncf`: a site places its extension data, such as a member roster or
    an event schedule, where it chooses, and the one constraint is that its cookie and table
    names avoid the reserved `cairn_` prefix.
- **Hand-off:** Each tier is a service the engine depends on outright, and only the content store
  has a seam a site swaps it through. Subordinated: `f:4b3rhm` (the D1 side of the auth and
  platform group is the auth store, and the `/auth-store` barrel re-exports the roster
  provisioning functions; stated in the lede of `docs/reference/auth-store.md`, "This subpath
  holds the D1 editor-provisioning functions").

### 7. Hard dependencies

- **Takes:** The engine depends on SvelteKit and Cloudflare outright and carries no framework-
  or host-agnostic layer. (`f:djoxr9`; a sentence that uses its key phrase "A hard dependency on
  the stack is the point." cites it)
- **Draws on:** `f:xg1per` (`svelte` and `@sveltejs/kit` are peer dependencies; the page states
  no version number and links `docs/reference/supported-toolchain.md` for the ranges, so the page
  never goes stale on a floor bump); `f:i74t7g` (the environment contract is Cloudflare Worker
  bindings, such as the `AUTH_DB` D1 database and the Email Sending binding, so a production site
  built on cairn runs on Cloudflare Workers); `f:hk24xs` with `f:n1om0r` in one sentence (no seam
  replaces Cloudflare as the host, and the one swappable dependency is the content store, through
  `BackendProvider`, of which `createGithubApp` is the only implementation the engine ships).
- **Hand-off:** A replacement content store keeps one contract, the interface every provider
  connects a route to.

### 8. Backend contract

- **Takes:** A `BackendProvider` connects to a live `Backend` for a route that needs one, and the
  `Backend` interface fixes the semantics any provider keeps. (`f:gcd8h7`, `f:025q6u`)
- **Draws on:** `f:gcd8h7` (a provider carries a `kind` tag and the default `branch` and connects
  with `connect(env)`; `createGithubApp` returns one whose `connect` mints and caches the
  installation token lazily, a clause the drafter may keep or drop); `f:025q6u` as a bulleted
  list of the five semantics, one per item: a `commit` with `expectedHead` makes one attempt and
  throws `CommitConflictError` on a head mismatch, and a `commit` without it keeps the head-merge
  retry, so `expectedHead` is the provider-level form of the head guard the nav, settings,
  vocabulary, media upload, and revert commits take, and its absence is the retry a save and a
  publish take (`f:025q6u` with `f:0gihxq` in one sentence, the tie the structural edit asked
  for, so the reader meets the two rules as one mechanism); `readFile` returns null for a
  missing path; `listCommits` returns an empty array for a
  missing file; `createBranch` returns the SHA it branched at and throws `BranchExistsError` on a
  name collision; `deleteBranch` treats a missing branch as success. Signatures stay in the
  reference: link the `Backend` and `BackendProvider` rows of the "Types" table in
  `docs/reference/core.md` and the error classes under "Auth and GitHub App" on the same page.
- **Hand-off:** The contract is one Extension-tier surface among many, and the tiers state what
  each export promises across versions.

### 9. Stability tiers

- **Takes:** Every export carries one of three stability tiers, and the tier states what the
  export promises across versions. (`f:c1ujrl`)
- **Draws on:** `f:c1ujrl` (Extension API and Scaffold API are frozen contracts; Unstable API is
  importable today with no promise across minor versions; link "Stability tiers" in
  `docs/reference/README.md` for the definitions and each export's reference entry for its tier);
  `f:549u00` (cairn is pre-1.0, so the tiers are a target discipline and an Extension-tier break
  can ship in a minor release); `f:gknz29` (the `check:surface` snapshot gate detects and
  discloses such a break rather than preventing one until 1.0; a sentence using "every break is
  disclosed" cites it). Then the worked example, `f:zm9tp4`, in one paragraph: in `0.86.0`, the
  minor version that shipped `navLayout`, the nav fields on `AdminShellData` and the parameter
  and return types of `navFilter` changed shape, both inside the Extension API tier; a site that
  read those fields or declared a `navFilter` had code to change before it could take the
  upgrade; `navLayout`'s own types were renamed again in `0.94.0`, one clause; the "0.86.0"
  section of `docs/extend/migration-notes.md` lists the edits each release asks of a site. The
  page names no field (the field names rest on a fact outside this plan's inventory, as the
  round-2 drafter recorded) and claims nothing about what `check:surface` flagged in that
  release, since `f:gknz29` covers the gate's behavior in general. Then the closing sentence of
  the body, the synthesis the job read found missing, as an anatomy sentence (`no-claim`): what
  a site writes against the Extension tier survives an engine update with the changes named,
  and the upgrade procedure in `docs/extend/upgrade-cairn.md` reads the migration notes first
  (the outline's cross-link to that page and a round-2 structural note).
- **Hand-off:** None. The closing sentence above is the body's last, and the related resources
  follow under their own heading.

## Ending

### 10. Related resources

The anatomy's ending, grouped as the register asks, 3 to 5 links a group, each group introduced
by a complete sentence.

- **Takes:** The following resources build on the boundary, take one part of it in depth, or
  document the platforms the engine depends on. (`no-claim`)
- **How-to guides** (five): `docs/extend/add-cairn-to-a-sveltekit-app.md` (the first build),
  `docs/extend/define-an-adapter-and-schema.md` (the adapter field by field),
  `docs/extend/add-a-custom-admin-screen.md` (the custom-route seam),
  `docs/extend/replace-magic-links-with-cloudflare-access.md` (the identity seam),
  `docs/extend/upgrade-cairn.md` (what the tiers mean when a site upgrades).
- **Concepts** (four): `docs/extend/scaffolded-site-files.md` (a scaffolded reader maps the
  architecture onto their files), `docs/extend/content-model.md` (the content map seam in
  depth), `docs/extend/security-model.md` (each component's security properties),
  `docs/extend/migration-notes.md` (the per-version record of what each release changed).
- **External resources** (five): SvelteKit routing (https://svelte.dev/docs/kit/routing),
  SvelteKit load functions (https://svelte.dev/docs/kit/load), SvelteKit form actions
  (https://svelte.dev/docs/kit/form-actions), Cloudflare Workers bindings
  (https://developers.cloudflare.com/workers/runtime-apis/bindings/), and the GitHub Apps
  overview (https://docs.github.com/en/apps/overview). The four SvelteKit and Cloudflare subjects
  are the ones the introduction's prior-knowledge sentence names.

## Dispositions

One row per fact id the plan disposes: the 49 carried ids in the page's inventory placed
(`f:p1xmp5`, cited for the role-to-capability mapping, joined the inventory at the resolution
run), and the inventory's 6 cuts disposed again, 1 of them subordinated and the pilot's 5 kept.
"Subordinated" is a cut whose reason names the reference entry that states the fact; the named
entry was opened and read before it was named, at this revision as at the first.

| Fact | Disposition | Section, or reason |
| --- | --- | --- |
| `f:99f221` | placed | Introduction (paragraph 1, the contract) |
| `f:bhyvqg` | placed | Introduction (paragraph 1) |
| `f:gknz29` | placed | Introduction (paragraph 1) and Stability tiers |
| `f:djoxr9` | placed | Introduction (paragraph 2, prior knowledge) and Hard dependencies |
| `f:4esdoz` | placed | Introduction (paragraph 3, the definition) |
| `f:3rb362` | placed | Entry points |
| `f:40pxcq` | placed | Entry points |
| `f:n3cvf9` | placed | Entry points |
| `f:a7qx4m` | placed | Export map |
| `f:bmxw7w` | placed | Export map |
| `f:533flu` | placed | Export map (the subpaths outside the groups; the `check:reference` clause is not stated) |
| `f:0duu5p` | placed | Export map (the placement rules) |
| `f:5uhx5o` | placed | Export map (the root barrel's consequence) |
| `f:ppqu4v` | placed | Export map (the `/sveltekit` bundling consequence) |
| `f:6a32oy` | placed | Seams (first sentence, the custom-route and `navLayout` rows) |
| `f:i87sd3` | placed | Seams (the table) |
| `f:3pposq` | placed | Seams (the roles and access map row) |
| `f:p1xmp5` | placed | Seams (the roles and access map row: the mapping and the narrowing) |
| `f:fhit7f` | placed | Seams (the `identity` row) |
| `f:03zj56` | placed | Seams (the custom admin routes row) |
| `f:brfitv` | placed | Seams (the custom admin routes row) |
| `f:n1om0r` | placed | Seams (the `BackendProvider` row) and Hard dependencies |
| `f:cjonmm` | placed | Write path (first sentence, The holding branch, The publish commit, Build verification) |
| `f:qehbx3` | placed | Write path (first sentence and The publish commit) |
| `f:pgy0mr` | placed | Write path (the stores the figure shows) and Data tiers (first sentence, the D1 paragraph) |
| `f:5kerxw` | placed | The holding branch |
| `f:e69d0l` | placed | The holding branch, The publish commit, and Build verification |
| `f:w379wu` | placed | The publish commit and Data tiers (the edit record) |
| `f:0oyrh6` | placed | The publish commit |
| `f:0xxou5` | placed | The publish commit (whole, with its head-check condition) |
| `f:n0laoh` | placed | Build verification |
| `f:0gihxq` | placed | Concurrent writes and Backend contract (the `expectedHead` tie) |
| `f:cng7dr` | placed | Read path |
| `f:b6gquz` | placed | Data tiers (the table and the D1 paragraph; the key column is not stated) |
| `f:lu67dk` | placed | Data tiers (the git and R2 paragraphs) |
| `f:6ign7q` | placed | Data tiers (the git paragraph) |
| `f:4t707i` | placed | Data tiers (the git paragraph) |
| `f:70mf58` | placed | Data tiers (the edit record, at publish granularity) |
| `f:wnvqlz` | placed | Data tiers (the D1 paragraph) |
| `f:dtwvtz` | placed | Data tiers (the D1 paragraph) |
| `f:qrwncf` | placed | Data tiers (a site's own data) |
| `f:4b3rhm` | subordinated | `docs/reference/auth-store.md`, the lede: states that the subpath holds the D1 editor-provisioning functions, which is the fact's content; the page links the page with no code span from the D1 paragraph |
| `f:xg1per` | placed | Hard dependencies (peer dependencies named, ranges left to `docs/reference/supported-toolchain.md`) |
| `f:i74t7g` | placed | Hard dependencies |
| `f:hk24xs` | placed | Hard dependencies |
| `f:gcd8h7` | placed | Backend contract |
| `f:025q6u` | placed | Backend contract |
| `f:c1ujrl` | placed | Stability tiers |
| `f:549u00` | placed | Stability tiers |
| `f:zm9tp4` | placed | Stability tiers (the worked example) |
| `f:5vjwlc` | cut | The adapter's required and optional fields are `docs/extend/define-an-adapter-and-schema.md`'s subject, out of scope here (the pilot's cut, kept) |
| `f:pzbmhq` | cut | Hash lookup of tokens and session ids is a security property, `docs/extend/security-model.md`'s subject (the pilot's cut, kept) |
| `f:xkkt1o` | cut | The role column's former `CHECK` constraint is out of scope by the outline; `docs/extend/migration-notes.md` holds the record (the pilot's cut, kept) |
| `f:2hnxsr` | cut | The R2 binding's resolution and the `srcset` ladder are media settings, `docs/extend/configure-media.md`'s subject (the pilot's cut, kept) |
| `f:0435ck` | cut | The `audit_log` timestamp format is column-level detail below this page's placement claim (the pilot's cut, kept) |

## Round-2 blocking findings, disposed

| Finding (seat, committed line) | Disposition |
| --- | --- |
| Register, `:165` (Edit history): the rework cut `f:0xxou5`'s head-check qualification, and the page contradicted Commit concurrency | Disposed by the plan. The sentence is dropped with its section; the branch lifecycle is stated once, at The publish commit, with the qualification whole |
| Fact read, `:165` (Edit history): the rewrite dropped the fact's condition and implied a publish is the only remover of the branch | Disposed by the plan, the same sentence. The page never states what alone deletes the branch |
| Register, `:67` (Seams): role and capability defined side by side with no relation stated | Applies. The roles and access map row ties each role name to the capability it maps to, citing `f:3pposq` and `f:p1xmp5`, and no detail list follows the table |

Non-blocking round-2 findings this plan takes: the cross-link to `docs/extend/upgrade-cairn.md`
from Stability tiers; "Branch existence" replaced by a subject heading; the figure's D1 and R2
nodes introduced in the sentence before the figure; the D1 rows' security properties pointed at
`docs/extend/security-model.md`; the seams table's lead-in and column header made precise; the
grab-bag detail list removed; the figurative "boundary runs from" sentence replaced by an
enumeration; the premise paragraph placed as the anatomy's definition; one R2 sentence; the
`0.86.0` paragraph held to `f:zm9tp4` and the migration notes; five introduction links in prose;
the external resources matched to the prior-knowledge sentence.

## Structural edit findings, disposed

The structural edit seat read this plan on 2026-10-03 and returned fix. Each finding and its
disposition in the revision above.

| Finding (plan line at the read) | Disposition |
| --- | --- |
| Blocking, `:171`: the covers enumeration named four subjects and omitted the write path, the read path, the hard dependencies, and the Backend contract, so the overview did not match the body | Taken. The covers sentence enumerates every body subject in page order: the subpaths, the seams, the path from save to deploy and the admin's reads, the stores, the dependencies and the contract the swappable store keeps, the promise. Still a plain enumeration with no code span or numeral |
| Blocking, `:348`: Concurrent writes sat after Build verification, breaking the spine, and its rationale and hand-off claimed the rules cover only the path's commits while the head guard covers nav, settings, vocabulary, media upload, and revert | Taken. Concurrent writes sits between The publish commit and Build verification; its first sentence widens on purpose from the path's two commits to every admin commit; the publish hand-off leads into it and its hand-off leads to the build; the "every commit the path made so far" claim is gone from the argument, the departures, and the hand-offs |
| Advisory, `:293`: hand-offs scripted as positional references ("the next section") | Taken. Every hand-off is a turn in the subject, and the Sections preamble states the rule |
| Advisory, `:432`: the Backend contract's `expectedHead` semantics and Concurrent writes name one mechanism twice with no tie | Taken. The commit bullet ties `expectedHead` to the head guard and its absence to the retry, citing `f:025q6u` with `f:0gihxq`, and the dispositions table records the second placement |

## Resolution run findings, disposed

The resolution run (`wf_fe61a650-884`) drafted the page from this plan twice. Its final reads
accepted the structure, the facts, and the figure, and the register editor returned two blocking
findings, both on the introduction the drafter wrote from the earlier revision. Each is disposed
in the Introduction section above; the table records the finding, the page line it cites, and
what changed in the plan. Nothing outside the introduction changed, except the two clarifications
the last rows record, which alter no section, claim, or placement.

| Finding (seat, page line) | Disposition |
| --- | --- |
| Blocking (register, `:5-12`): the covers lead-in "The boundary between the engine and a site has the following parts:" frames the edit path, the stores, and the dependencies as parts of a boundary, a false claim in a structural position and the same figure round 2 flagged on "the boundary runs from" | Taken. The covers stay a bulleted list, now the plan's specified form; the lead-in names the subjects plainly with no boundary or parts frame, and the plan gives the model sentence and names the frames the sentence avoids |
| Blocking (register, `:14`, second sentence): the out-of-scope pointers run as a 70-word sentence chaining five parallel subject-and-link pairs, list cadence in prose; the plan's prose instruction conflicted with the guide's parallel-items rule, and the seat asked the conductor to rule | Taken, ruled here under the conductor's dispatch. The pointers form a bulleted list of five items in one form, subject first and page last, under a complete lead-in that never names the page itself. The five subjects and their pages are unchanged; the round-2 soft-overlinking note is answered by the link count and the body-linked media and migration pages, not by the form |
| Clarification (register advisory, `:3`): the contract sentence chained four claims into 50 words | The plan's three "Then" claims are now stated as three sentences, the contract one line; the content is the earlier revision's |
| Clarification (register round-1 blocking on bridge paragraphs; structural edit advisory, `:118`): the drafter dropped the hand-offs when one-sentence bridge paragraphs were blocked, and the structural edit then asked for them back | The Sections preamble now states the form: a hand-off is the closing sentence of the section's final paragraph, never a paragraph of its own. No hand-off's content changed |

The register editor's and the fact read's other advisories (the `identity` row's relative clause,
the seams table cell lengths, the dangling "since" in the R2 sentence, the `0.94.0` clause's
missing link, the two universals flagged for the claims checker, the figure's added edge) are the
drafter's and the line-edit read's to take on the page; none changes a section, a claim, or a
placement, so the plan leaves them where they were found.

## Notes for the drafter

- A sentence that synthesizes two facts cites both ids; the brief accepts an array. The sentences
  this plan marks "in one sentence" are the intended multi-id sentences.
- An anatomy sentence (the introduction's paragraph 2 apart from its prior-knowledge citation,
  each section's hand-off, the list and table lead-ins, the body's closing sentence, the
  related-resources lead-ins) carries no code span, numeral, version, or date, or it cites a
  fact.
- A fact placed in one section may be cited again from another sentence that needs it
  (`f:gknz29`, `f:djoxr9`, `f:n1om0r`, `f:pgy0mr`, `f:w379wu`, `f:e69d0l`, `f:cjonmm`,
  `f:0gihxq`).
- `f:p1xmp5` lives in `docs/internal/facts/extend.md` outside the outline's `factIds` and
  entered the page's inventory as carried at the resolution run; the rework record's "Not
  conflicts" note records that a citation from the container outside the outline's list is
  accepted. It is cited only from the roles and access map row.
- The introduction's two lists (the covers, the out-of-scope pointers) and their lead-ins are
  `no-claim` entries in the brief, one per item, the same as the hand-offs and the
  related-resources lead-ins.
- The page edits no other page. The seven guide links in the seams table and the ending point at
  outlined pages that the link gate accepts as pending until each lands.
- Every link to a page this plan names in a code span becomes a relative Markdown link on the
  page, with link text that names the destination.
