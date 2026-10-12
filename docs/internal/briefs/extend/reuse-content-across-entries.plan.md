# Page plan: Reuse content across entries

Page: `docs/extend/reuse-content-across-entries.md`. Page type: task guide. Status: new page, no
prior version on disk. Written 2026-10-12 by the plan step of the docs page chain (stage 2b part 1,
run 2). The drafter drafts from this plan: it is the source of the page's order, each section's
claim, and each fact's placement. The structural edit seat reads it before any prose exists. The
plan is Google's outline written down (Google Technical Writing Two, "Organizing large documents",
https://developers.google.com/tech-writing/two/large-docs): the outline is the document's narrative,
and information arrives where it is most relevant to the reader.

Inputs read: the outline entry in `docs/internal/outlines/extend.json` (slug
`reuse-content-across-entries`: job, covers, out-of-scope list, exemplars, the `fragment` glossary
term, and the two link rows naming this page); "The page anatomies" and "The introduction" in
`docs/internal/docs-register.md`; every fact bullet named below in `docs/internal/facts/extend.md`
and `docs/internal/facts/editors.md`; the two exemplars (`extenders/sanity-custom-tool`,
`extenders/django-custom-management-commands`); the reference entries each link names
(`docs/reference/core.md` `defineConcept`, `createRenderer`, `SiteRender`, "Content and manifest",
and the `FragmentResolve` Types row; `docs/reference/delivery-data.md` `createSiteIndexes` and
`createFragmentResolver`; `docs/reference/vite.md` `cairnManifest` and `CairnManifestOptions`;
`docs/reference/delivery.md` `EntryDataOverrides`; `docs/reference/log-events.md`, the
`include.missing` row; `docs/reference/sveltekit.md`, the `EditData` and `ContentFormFailure`
rows); the sibling pages `docs/extend/add-cairn-to-a-sveltekit-app.md` ("Write the site config and
a minimal adapter", "Add the first entry", "Index the content and commit its manifest", "Render the
entry", "Verify the rendered entry"), `docs/extend/content-model.md` ("Entry identity", "Routing",
"The content manifest"), and `docs/extend/debug-your-site.md` (headings only: no include row); and
the code the facts cite (`src/lib/render/resolve-include.ts`, `src/lib/delivery/site-resolver.ts:200-213`,
`src/lib/delivery/public-routes.ts:156-195`, `src/lib/sveltekit/content-routes-entry-write.ts:130-275`,
`src/lib/sveltekit/content-routes-entry-destructive.ts:84-125`,
`src/lib/sveltekit/content-routes-context.ts:375-382`, `src/lib/content/manifest.ts:499-503`, and
the scaffold's `templates/waymark/src/theme/cairn.config.ts:131-174`,
`templates/waymark/src/chassis/content.ts:1-29`, `templates/waymark/vite.config.ts:51-59`,
`templates/waymark/src/content/fragments/trail-safety-notice.md`, and
`templates/waymark/src/content/pages/about.md`). `docs/extend/configure-rendering.md` and
`docs/extend/link-content-with-references.md` are not on disk yet; the run plan
(`docs/superpowers/plans/2026-10-11-draft-docs-2b-part1.md`, "The runs") says forward links pass the
gate, so the page links both. No `docs/editors/` page is on disk.

Headings in this plan's section list are the page's headings, verbatim. A claim inventory `section`
names one of them. The introduction is the untitled text under the H1 and is named `Introduction`.

## What the page argues

A fragment is one markdown file the engine splices, at render time, into every entry that names it.
Turning that on is three wiring points and one forwarded resolver, and each of the four fails in its
own way, two of them silently. So the page's spine is the wiring in the order the build meets it,
finished before the reader writes the first include, followed by the running example (the scaffold's
`trail-safety-notice` fragment, written and then included in an entry), then the two pieces of
explanation a reader needs once an include exists (what resolves inside a fragment, and what keeps an
include valid), then the anatomy's verification and failure path.

The page serves two readers with one spine, the shape configure-media set. The developer on the site
the add-cairn tutorial builds has a posts concept and nothing else, so they run every step. The
developer on a scaffolded site already has the concept, both globs, the forwarded resolver, the
fragment, and two includes of it (`f:n5d65u`, `f:kcm3gf`, `f:rolr87`), so they come to add a
fragment, to check a render they replaced, or to learn what the engine refuses. "Before you begin"
routes that reader past the wiring by section heading.

### The order, argued

Each section holds what the next one depends on.

1. **The introduction carries the model and the right-tool callout** (`f:880bg6`, `f:72pqil`,
   `f:htxey1`). The Sanity exemplar's take: a reader who wants a block that varies per use learns
   before any code that a registered component is the better tool, and leaves for configure-rendering.
   This is also the anatomy's wrong-place routing, so the callout lives inside the introduction.
2. **Before you begin** names the three files the wiring touches, per site, and the public entry
   route the resolver rides on, and routes the scaffolded reader ahead.
3. **Declare the fragments concept** (cover 1, first third) comes first because every other piece
   keys off the concept id `fragments`. The Sanity take lands here too: the required members, the key
   and `routing: 'embedded'`, are named before the code.
4. **Index the fragment files** (cover 1, last two thirds) follows the declaration it indexes. The two
   globs share one section because they take the same pattern and differ only in how they fail: one
   throws at build, the other fails silently. The section mirrors the tutorial's own "Index the
   content and commit its manifest", which pairs the same two files.
5. **Forward resolveFragment from your render** (cover 3) moves ahead of the include syntax (cover 2).
   A render that drops `resolveFragment` publishes every include as literal text with no error
   (`f:k84qwy`), so the reader confirms the forward before writing an include whose failure would be
   silent. It is a check for most readers, since the tutorial's and the scaffold's renders already
   forward it.
6. **Write a fragment and include it** (cover 2) is the running example, the Django exemplar's take:
   a file tree showing where the fragment lives, the fragment file, the include line in an entry, and
   the manifest rewrite the two new rows need. The editor's Include a fragment control closes the
   section, since it writes the same line the reader just typed.
7. **How an include resolves** (cover 4) is the first explanation section. It follows the first
   include because what it explains, what a fragment may contain and when an edit reaches the
   including entries, matters only once an include exists. Its lead-in ties it to writing a
   fragment's body, per the anatomy's lead-in rule.
8. **Guards that keep includes valid** (cover 5) is the second explanation section. It follows
   resolution because the build guard is resolution failing on purpose. It precedes the verification
   because Verify's last step reads the where-used list this section introduces.
9. **Verify the include** is the anatomy's item 4: the build, the rendered entry, and the where-used
   list, the running example through to the rendered page.
10. **Diagnose an include that does not render** (cover 6) is the anatomy's failure-path slot (item 5)
    and the last body section. The notices and `include.missing` reasons are what a failed check
    shows, so cover 6 lands here as ordered causes. The extend recovery surface has no include row, so
    the page keeps the causes itself and links the log reference (friction filed).
11. **See also** closes the page, per the anatomy (item 6).

### Departures from the outline's covers order, with the reason for each

- Cover 1 splits into two sections: the concept on the adapter (item 3) and its two globs (item 4).
- Cover 3 moves ahead of cover 2 (item 5): the render's forward is wiring, and an include written
  before it is checked fails silently.
- Cover 2 becomes the running example (item 6), with the editor control as its closing paragraph.
- Covers 4 and 5 keep their order (items 7 and 8) and come after the first include, as explanation
  subordinate to the steps.
- A verification section the covers do not list joins before cover 6 (item 9), per the anatomy.
- Cover 6 becomes the failure path (item 10), so nothing but See also follows it.

### Exemplar takes, and where each lands

- **Sanity, Create a custom Studio tool.** The early "Right tool for the job?" note lands as a Note
  callout at the end of the introduction: a fragment versus a registered component, linking
  configure-rendering. The required members named before code land in "Declare the fragments
  concept": the reserved key and `routing: 'embedded'` in the first sentence, then the code. Left
  behind: the plugin tail.
- **Django, custom management commands.** The file tree before the code lands in "Write a fragment
  and include it" (`src/content/fragments/trail-safety-notice.md` beside the including entry), and the
  one running example (`closepoll` there, `trail-safety-notice` here) runs from the fragment file to
  the rendered page in "Verify the include". The rule stated where it bites lands beside each wiring
  step (the composition throw, the build throw, the silent plugin omission). Left behind: the class
  reference, which stays on `docs/reference/`.

### Heading policy

Task headings start with a bare infinitive; "Before you begin" and "See also" are the anatomy's fixed
headings; the two explanation sections take "How an include resolves" and "Guards that keep includes
valid". `docs/extend/content-model.md` links the page itself, with no anchor, so every heading is
free.

## The introduction, in Google's three parts

No heading. It opens on a statement, never an imperative, and frames the page from above before the
contract (register, "The introduction"). Two or three paragraphs, then the Note. The intro-framing
step reasons the final wording. Content items, in order:

1. **The model (what the document covers, framed from above).** A fragment is a block of markdown
   kept in one file and spliced into any entry whose body names it with `::include{fragment="<id>"}`.
   Fragments live under the reserved `fragments` concept, have no permalink of their own, and reach a
   reader only through an including entry (`f:880bg6`). The engine splices a fragment in each time it
   renders an including entry, so an edit to the fragment reaches every entry that includes it on
   that entry's next render (`f:72pqil`, scoped to that clause). The site supplies three wiring
   points and a render that passes the fragment resolver through; the engine supplies the resolver,
   the editor's control, and the guards that keep an include valid (`f:ojydmz`, `f:xjkgtp` scoped,
   `f:xlgfqm` and `f:3vndvj` scoped to "the build and the admin guard every include").
2. **Who and why, with the contract.** Two readers. A developer on the site the add-cairn tutorial
   builds, whose adapter is `src/lib/cairn.config.ts`, turns fragments on and runs every step
   (`f:q07rd5`). A developer on a scaffolded site, whose adapter is `src/theme/cairn.config.ts`,
   already has fragments wired and the scaffold's `trail-safety-notice` fragment included in its about
   page (`f:q07rd5`, `f:n5d65u`, `f:rolr87`), and comes to add a fragment, to check a render they
   replaced, or to learn what the engine refuses. The contract sentence, inside the framing: declare
   the fragments concept, index its files, confirm that your render forwards `resolveFragment`, write
   a fragment and include it in an entry, and check that it renders.
3. **Prior knowledge.** Markdown with YAML frontmatter, Vite's `import.meta.glob`, and the
   `::name{key="value"}` leaf-directive form. No cairn knowledge beyond the adapter file, the content
   module, and `vite.config.ts`.
4. **What the page does not cover, with the page that does (wrong-place routing).** Reference fields,
   which point at another entry rather than copying its text:
   `docs/extend/link-content-with-references.md` (forward link). Using the Include a fragment control
   as an editor belongs to the editor documentation, which has no page yet: name it in words, with no
   link. This sentence may name the page, since scope has no subject-first form.
5. **The Note callout, "Right tool for the job?"** (the Sanity take), last in the introduction. A
   fragment's text is spliced verbatim, the same in every entry that includes it, and the include
   takes the fragment id and nothing else (`f:880bg6`, `f:0w7xeu`). When the block should vary per
   use, register a component instead, since a component declares its own attributes (`f:htxey1`,
   scoped to "optional `attributes`"). Link `docs/extend/configure-rendering.md` (forward link) for
   components. Keep the callout to two or three sentences.

## Sections, in order

Each entry carries the page heading; **First sentence**, the one sentence a reader takes from the
section, which is the section's first sentence on the page (its claim is fixed here, its wording may
move to the register's voice, and a task-section sentence stays under 26 words); **Facts**, the ids it
draws on ("cited again" marks a fact whose primary home is another section); the content and steps;
and **Hand-off**, quoted where the plan fixes its wording (each quoted hand-off and lead-in passed
the provenance extractor with no row).

### Before you begin

**First sentence:** Fragments touch three files on your site: the adapter, the content module, and
`vite.config.ts`.

**Facts:** `f:q07rd5` (scoped: the two adapter paths), `f:n5d65u` (scoped: the scaffold's content
module is `src/chassis/content.ts`), `f:60zw5n` (scoped: the tutorial site's content module is
`src/lib/content.ts`).

A bulleted list of preconditions, each with a link to what produces it (anatomy item 2):

- The adapter file: `src/lib/cairn.config.ts` on the add-cairn tutorial's site, `src/theme/cairn.config.ts`
  on a scaffolded one (`f:q07rd5`). Link
  `docs/extend/add-cairn-to-a-sveltekit-app.md#write-the-site-config-and-a-minimal-adapter`.
- The content module that calls `createSiteIndexes`, and `vite.config.ts` with the `cairnManifest`
  plugin: `src/lib/content.ts` on the tutorial's site (`f:60zw5n`), `src/chassis/content.ts` on a
  scaffolded one (`f:n5d65u`). Link
  `docs/extend/add-cairn-to-a-sveltekit-app.md#index-the-content-and-commit-its-manifest`.
- A public entry route built on `createPublicRoutes`, which supplies the fragment resolver. Link
  `docs/extend/add-cairn-to-a-sveltekit-app.md#render-the-entry`. Claim nothing about the resolver
  here; "Forward resolveFragment from your render" states it.

Then one sentence for the scaffolded reader: a scaffolded site already declares the concept, globs
its files in both places, and forwards the resolver (`f:n5d65u`; the forward is `f:xjkgtp`'s source),
so it can go straight to "Write a fragment and include it" to add a fragment, or to "How an include
resolves". Name the sections by heading. A reader who replaced the scaffold's render reads "Forward
resolveFragment from your render" first.

**Hand-off:** none needed; the next section's first sentence opens the steps.

### Declare the fragments concept

**First sentence:** Declaring a concept under the reserved key `fragments` turns on the `::include`
directive, and that concept must use `routing: 'embedded'`.

**Facts:** `f:ojydmz`, `f:7wiuwr`, `f:880bg6`, `f:n5d65u` (the scaffold's declaration, as the code).

Content:

- One sentence on what `embedded` means for a fragment: a fragment has no permalink of its own and
  reaches a reader only through an entry that includes it (`f:880bg6`). Link
  `docs/extend/content-model.md#routing` for the routing shorthands (opened and confirmed: its table
  states `'embedded'` is not routable, has no permalink, and keeps its admin list and edit page).
- One step, a single bulleted item, location first: in the adapter file, add a `fragments` concept to
  `content`, after `pages` on a scaffolded site. The code block is the scaffold's declaration
  verbatim from `f:n5d65u`: `dir: 'src/content/fragments'`, `label: 'Fragments'`,
  `singular: 'fragment'`, `routing: 'embedded'`, and a fieldset with one required `title` text field.
  The first-line comment names the tutorial's file, `src/lib/cairn.config.ts`, and the code shows the
  concept inside `content`, beside the tutorial's `posts`, with other members elided by a comment.
- The rule where it bites, one sentence: any other `routing` throws when the runtime composes, not at
  `defineConcept`, with the message `cairn: concept "fragments" requires routing: 'embedded' (the
  include directive resolves against it)` (`f:7wiuwr`). Quote the message whole.

**Hand-off (no-claim):** "With the concept declared, hand its files to the build."

### Index the fragment files

**First sentence:** The build reads fragment files through two globs, one passed to
`createSiteIndexes` in the content module and one in the `cairnManifest` plugin's `content` option.

**Facts:** `f:60zw5n`, `f:i6zyab` (scoped: the omission fails silently, with no build error),
`f:7az6m2` (added: the plugin then builds no rows for the concept, with no throw or warning),
`f:n5d65u` (the two globs, as the code).

A numbered list of two steps, one action each, location first, lead-in "To index the fragment files,
follow these steps:" (no-claim):

1. In the content module, glob `/src/content/fragments/*.md` with `{ query: '?raw', import:
   'default', eager: true }` and pass the result to `createSiteIndexes` as `fragments` (`f:n5d65u`).
   The code block extends the tutorial's `src/lib/content.ts` (first-line comment names it): the
   `fragmentsRaw` glob beside `postsRaw`, and `{ posts: postsRaw, fragments: fragmentsRaw }`. One
   sentence after it: without this glob, `createSiteIndexes` throws at build, naming the concept with
   no glob passed (`f:60zw5n`; quote only the message's start, `cairn: concept "fragments" has no glob
   passed`).
2. In `vite.config.ts`, add `fragments: '/src/content/fragments/*.md'` to the `cairnManifest`
   plugin's `content` option (`f:n5d65u`). The code block shows only the plugin call, the tutorial's
   `configModule: '/src/lib/cairn.config.ts'` and the `content` map with `posts` and `fragments`. One
   sentence after it: a missing entry here fails silently, since the plugin builds no manifest rows for
   the concept and neither throws nor warns (`f:i6zyab`, `f:7az6m2`).

Link `docs/reference/delivery-data.md#createsiteindexes` and
`docs/reference/vite.md#cairnmanifestoptions` (opened and confirmed: `content` maps each concept id
to its glob).

**Hand-off (no-claim):** "Next, check that your render passes the resolver through."

### Forward resolveFragment from your render

**First sentence:** The adapter's `rendering.render` must forward `resolveFragment` beside `resolve`
and `resolveMedia`, or every include publishes as literal text with no error.

**Facts:** `f:k84qwy`, `f:zv3q45`, `f:xjkgtp`, `f:2dqwmu` (scoped: the scaffold's feed is a render
path of the site's own that resolves fragments through `createFragmentResolver`).

Content:

- Two sentences on where the resolver comes from, so the reader knows the render only passes it on:
  for each public entry page, `createPublicRoutes` builds one with `createFragmentResolver` and hands
  it to the render, and the admin preview passes a resolver of its own; the render never builds one
  (`f:xjkgtp`). `SiteRender`'s `resolveFragment` option takes a `FragmentResolve` (`f:zv3q45`).
- One step, a single bulleted item, location first: in the adapter file, confirm that `render` takes
  `resolveFragment` and passes it to `renderMarkdown`. The code block is the tutorial's render, two
  lines: `render: ({ body, resolve, resolveMedia, resolveFragment }) =>` and
  `renderMarkdown(body, { resolve, resolveMedia, resolveFragment }),`, under the first-line comment
  `// src/lib/cairn.config.ts, the rendering group`.
- One sentence after the step: the tutorial's render and the scaffold's already forward it. For the
  scaffold, cite `f:xjkgtp` (its source names the scaffold's forward); for the tutorial, say so only
  if the drafter confirms `docs/extend/add-cairn-to-a-sveltekit-app.md:333-334` at draft time, and
  cite no fact for it.
- One or two sentences for a render path of the site's own, outside `createPublicRoutes`: build the
  resolver with `createFragmentResolver`, exported from `@glw907/cairn-cms/delivery/data`, as the
  scaffold's feed does (`f:xjkgtp`, `f:2dqwmu`). For an unknown id, or a site with no fragments
  concept, it throws `cairn: fragment "<id>" not found` (`f:xjkgtp`).
- Link `docs/reference/core.md#siterender` for the render's full input (opened and confirmed: it gives
  the input object with `resolveFragment` and the `Promise<string>` return) and
  `docs/reference/delivery-data.md#createfragmentresolver` (opened and confirmed: it says a miss
  throws and that `createPublicRoutes` wires it into every entry render).

**Hand-off (no-claim):** "With the wiring in place, write a fragment and include it."

### Write a fragment and include it

**First sentence:** A fragment is a markdown file in `src/content/fragments/`, and an include names it
by its id, the filename without `.md`.

**Facts:** `f:kcm3gf`, `f:0w7xeu`, `f:rolr87`, `f:tj3h4c`, `f:z68na4` (added: an entry's id is its
filename stem). Cited again: `f:880bg6` (scoped: the fragments concept's directory). Scoped:
`f:t5ebsr` (manifest rows record each entry's included fragments), `f:n0laoh` (added, scoped: a
manifest that has drifted from the markdown fails the build), `f:fdtgh5` (added: the stale-manifest
error names `npx cairn-manifest`).

Content:

- The file tree before the steps (Django take), for the tutorial's site: `field-notes/src/content/`
  holding `fragments/trail-safety-notice.md` and `posts/2026-08-14-first-light.md`. One clause: on a
  scaffolded site, the fragment is already there and `src/content/pages/about.md` includes it
  (`f:kcm3gf`, `f:rolr87`).
- A numbered list of three steps, one action each, location first, lead-in "To write a fragment and
  include it, follow these steps:" (no-claim):
  1. In `src/content/fragments`, create `trail-safety-notice.md`, the scaffold's own fragment: its
     frontmatter holds only `title: Trail safety notice`, and its body is one paragraph (`f:kcm3gf`).
     The code block copies the scaffold's file verbatim from
     `templates/waymark/src/content/fragments/trail-safety-notice.md:1-4`, the source `f:kcm3gf`
     names.
  2. In the entry's body, on a line of its own, add `::include{fragment="trail-safety-notice"}`
     (`f:0w7xeu`). On the tutorial's site the entry is `src/content/posts/2026-08-14-first-light.md`;
     the scaffold's `about.md` carries the same line (`f:rolr87`). The code block shows the tutorial's
     post with the line after its first paragraph.
  3. In the project directory, rewrite the manifest with `npx cairn-manifest`. One sentence after it:
     the manifest records each entry's included fragments, so a new fragment and a new include both
     change it, and a build fails on a manifest that has drifted from the markdown, naming this
     command (`f:t5ebsr` scoped, `f:n0laoh` scoped, `f:fdtgh5`).
- One paragraph after the steps, on the editor's control: in the admin, an author writes the same line
  with the Include a fragment control in the insert palette (`f:0w7xeu`). The control appears only
  when the site declares a fragments concept, never while editing a fragment itself, and with no
  published fragment its picker says to create one on the Fragments screen and publish it
  (`f:tj3h4c`). Name the editor documentation in words, with no link and no walkthrough.

**Hand-off (no-claim):** "Before you put a component, a link, or an image in a fragment, read how an
include resolves."

### How an include resolves

**First sentence:** Write a fragment's body as you would an entry's: at render time the engine splices
it into the including entry before it resolves components, `cairn:` links, and `media:` references.

The first sentence ties the explanation to a task (writing a fragment's body), per the anatomy's
lead-in rule. It is an explanation sentence, so the 26-word cap does not bind it, but keep it one
sentence.

**Facts:** `f:72pqil`, `f:82eo9p`.

Content, three or four sentences, no steps:

- What follows from the order: a registered component directive, a `cairn:` link, or a `media:`
  reference inside a fragment resolves as if typed into the including entry (`f:72pqil`).
- When an edit shows: the engine reads the fragment's body at each render, so an edit to it shows in
  every including entry on that entry's next render (`f:72pqil`). Do not say "instantly" or "at
  publish"; the claim is "next render".
- The one limit: resolution runs one pass deep, so a fragment can't include another fragment, and the
  engine refuses such a save with "A fragment can't include another fragment." (`f:82eo9p`). Quote
  the refusal whole.

**Hand-off (no-claim):** "Next, see what keeps each include valid."

### Guards that keep includes valid

**First sentence:** An include whose id names no fragment fails the build, the same way a dangling
`cairn:` link does.

**Facts:** `f:xlgfqm`, `f:3vndvj`, `f:7250yh`. Cited again: `f:xjkgtp` (the build's resolver throws
`cairn: fragment "<id>" not found`), `f:bfiuem` (scoped: an include with no `fragment` attribute
never reaches the resolver), `f:rolr87` (the scaffold's two includes). Scoped: `f:t5ebsr` (a publish,
not a save, updates the manifest).

Content, no steps:

- One sentence on the build guard's mechanism: the resolver the public build uses throws `cairn:
  fragment "<id>" not found`, which stops the prerender (`f:xjkgtp`, `f:xlgfqm`). One sentence on its
  gap: an include with no `fragment` attribute never reaches the resolver, so the build does not catch
  it; "Diagnose an include that does not render" item 4 covers it (`f:bfiuem`). Name the section by
  heading.
- One sentence on the delete guard: the admin refuses to delete a fragment while any entry still
  includes it, the same guard shape a reference field has (`f:3vndvj`). Name reference fields in words;
  the link to link-content-with-references sits in See also.
- One or two sentences on the where-used list: a fragment's edit screen lists the entries that include
  it in an Included in group with a count, and when the fragment is published, a status line names how
  many entries include it (`f:7250yh`). On a scaffolded site, `trail-safety-notice` lists two
  entries, the about page and a post (`f:rolr87`).
- One sentence on what the guard and the list count, scoped: both read the includes each entry records
  in the content manifest, which a publish updates and a save does not, so an include counts once its
  entry is published (`f:3vndvj`, `f:7250yh`, `f:t5ebsr` scoped). Link
  `docs/extend/content-model.md#the-content-manifest` (opened and confirmed: it says the rows record
  included fragments and that a publish, not a save, patches a row).
- Never say a save or a publish checks that an include's fragment exists (friction filed).

**Hand-off (no-claim):** "With the fragment included, check the result end to end."

### Verify the include

**First sentence:** The including entry renders the fragment's paragraph where the directive was, and
the fragment's edit screen lists that entry under Included in.

**Facts:** `f:72pqil` (scoped: the directive is replaced by the fragment's markdown), `f:7250yh`,
`f:6ebew3` (added, scoped: `pages` entries take `/:slug`, so the about page is `/about`),
`f:rolr87`, `f:n5d65u` (scoped: the concept's label is `Fragments`). Cited again: `f:xlgfqm`,
`f:60zw5n` (what a failed build would mean).

A numbered list, one check to a step, the location first, lead-in "To verify the include, follow these
steps:" (no-claim):

1. In the project directory, run `npm run build`, and confirm that it completes. A dangling include or
   a missing content-index glob would fail it (`f:xlgfqm`, `f:60zw5n`).
2. In the project directory, start the dev server. On the tutorial's site, set `CAIRN_DEV_BACKEND` to
   `1` in the form the tutorial gives; link
   `docs/extend/add-cairn-to-a-sveltekit-app.md#verify-the-dev-sign-in`. Claim nothing about the
   scaffold's dev command.
3. In a browser, open the including entry: `/posts/first-light` on the tutorial's site (the URL the
   tutorial's "Verify the rendered entry" gives; cite no fact), `/about` on a scaffolded site
   (`f:6ebew3`, `f:rolr87`). Confirm that the fragment's paragraph appears where the directive was,
   with no `::include` text left (`f:72pqil`).
4. In the admin, open Fragments, then Trail safety notice, and confirm that the Included in group
   lists the entry with its count: one on the tutorial's site, two on a scaffolded one (`f:7250yh`,
   `f:rolr87`, `f:n5d65u`).

**Hand-off (no-claim):** "When a check fails, work through the following causes in order:"

### Diagnose an include that does not render

**First sentence:** A failed include either stops the build with a `cairn:` error or leaves text on
the page where the fragment belongs.

**Facts:** `f:bfiuem`, `f:k84qwy`, `f:xjkgtp`, `f:xlgfqm`. Cited again: `f:60zw5n`, `f:7wiuwr`,
`f:fdtgh5`.

A numbered list of ordered checks (anatomy item 5) in the order of the "Verify the include" steps that
reach them: items 1 and 2 are step 1 (the build), items 3 to 5 are step 3 (the page). Each item names
what the reader sees, then the cause, then the fix:

1. The build stops with a setup error: `cairn: concept "fragments" requires routing: 'embedded'`
   points at "Declare the fragments concept" (`f:7wiuwr`); `cairn: concept "fragments" has no glob
   passed` points at step 1 of "Index the fragment files" (`f:60zw5n`); a stale-manifest error names
   `npx cairn-manifest`, the last step of "Write a fragment and include it" (`f:fdtgh5`). Name the
   sections by heading.
2. The build stops with `cairn: fragment "<id>" not found`: an include names an id with no file in
   `src/content/fragments`, or the site declares no fragments concept. Fix the id to the fragment's
   filename without `.md`, or add the fragment (`f:xjkgtp`, `f:xlgfqm`).
3. The page shows the literal `::include{fragment="..."}` text: the render does not forward
   `resolveFragment`. Name "Forward resolveFragment from your render" by heading (`f:k84qwy`).
4. The page shows a notice in place of the include, and the log carries an `include.missing` record
   with `reason: 'empty_fragment'`: the directive has no `fragment` attribute. Add the fragment's id.
   The build passes this case, so the notice can reach the live site (`f:bfiuem`). Quote no notice
   text: no fact gives it.
5. The page shows a `Missing fragment` notice, and the log carries `include.missing` with
   `reason: 'not_found'`: the resolver returned nothing for the id, where the public build's resolver
   would have thrown. Check the id against the fragment's filename (`f:bfiuem`, `f:xjkgtp`).

One sentence after the list: link `docs/reference/log-events.md` for the `include.missing` record's
fields (opened and confirmed: the row states both reasons, the 160-character `fragment`, and the
`entry` field) and `docs/extend/debug-your-site.md#read-the-structured-logs` for finding the records.
Do not restate either page.

**Hand-off:** none; "See also" follows.

## Ending

### See also

The anatomy's item 6: related how-to guides, concept pages, and the limitations the page leaves out,
with the recovery link (`docs/extend/debug-your-site.md`) not repeated. One introducing sentence,
"The following pages cover the pieces this page links to:" (no-claim), then a bulleted list, each
item's link text naming its destination:

- `docs/extend/configure-rendering.md`, components with attributes and the render seam (forward link;
  the outline's link row names both reasons).
- `docs/extend/link-content-with-references.md`, reference fields and the delete guard they share
  with fragments (forward link).
- `docs/extend/content-model.md`, the routing shorthands and the content manifest.
- `docs/reference/delivery-data.md#createfragmentresolver`, the build's resolver.
- `docs/reference/core.md#siterender`, the render's full input.

## Dispositions, every fact id

`carried` names the section that holds the fact's primary placement. Of the 25 fact ids this plan was
handed, 22 are carried, four of them scoped, and 3 are cut, one of them subordinated to a reference
entry. The plan adds six container facts, each named where it lands. `f:y3s3t9` stays cut, as the page
inputs disposed it.

| Fact | Disposition | Section, or reference and reason |
| --- | --- | --- |
| f:880bg6 | carried | Declare the fragments concept (no permalink, reached only through an include); scoped in Introduction (the model and the callout's verbatim splice); cited again in Write a fragment and include it |
| f:ojydmz | carried | Declare the fragments concept (the reserved key turns on `::include`); cited again in Introduction |
| f:7wiuwr | carried | Declare the fragments concept (`routing: 'embedded'`, the composition-time throw and its message); cited again in Diagnose an include that does not render |
| f:60zw5n | carried | Index the fragment files (the content-index glob, the build throw); scoped in Before you begin (the tutorial's `src/lib/content.ts`); cited again in Verify the include and Diagnose |
| f:i6zyab | carried (scoped) | Index the fragment files (a missing plugin entry fails silently); its "find it missing from the manifest" clause is stated through `f:7az6m2` instead |
| f:0w7xeu | carried | Write a fragment and include it (the syntax, the Include a fragment control); cited again in the Introduction callout |
| f:zv3q45 | carried | Forward resolveFragment from your render (`SiteRender.resolveFragment` takes a `FragmentResolve`, backed by `createFragmentResolver`) |
| f:xlgfqm | carried | Guards that keep includes valid (a dangling include fails the build like a dangling `cairn:` link); cited again in Verify the include and Diagnose |
| f:k84qwy | carried | Forward resolveFragment from your render (forward it, or includes publish as literal text); cited again in Diagnose |
| f:82eo9p | carried | How an include resolves (one pass deep, the save refusal and its message) |
| f:3vndvj | carried | Guards that keep includes valid (the delete guard, the reference-field shape) |
| f:72pqil | carried | How an include resolves (splice order, what resolves inside, edits at the next render); scoped in Introduction and Verify the include |
| f:7250yh | carried | Guards that keep includes valid (Included in with a count, the publish status line); cited again in Verify the include |
| f:kcm3gf | carried | Write a fragment and include it (the scaffold's `trail-safety-notice.md`, its title and one-paragraph body) |
| f:bfiuem | carried | Diagnose an include that does not render (the two notices and `include.missing` reasons, versus the throwing build resolver); scoped in Guards that keep includes valid |
| f:n5d65u | carried | Declare the fragments concept (the concept code) and Index the fragment files (the two globs); scoped in Before you begin, Introduction, and Verify the include |
| f:rolr87 | carried | Write a fragment and include it (the scaffold's include line); cited again in Introduction, Guards, and Verify the include |
| f:xjkgtp | carried | Forward resolveFragment from your render (`createPublicRoutes` builds the resolver, the preview passes its own, the `/delivery/data` export, the throw message); cited again in Guards and Diagnose |
| f:q07rd5 | carried (scoped) | Before you begin (the two adapter paths); cited again in Introduction. Its tutorial-hooks clause is not used |
| f:tj3h4c | carried | Write a fragment and include it (when the control appears; the empty picker's message) |
| f:2g0v8u | cut | The delete action's whole check order (links, includes, the cross-branch reference index, references) is more than this page's job; the include clause it carries is `f:3vndvj`'s, placed in Guards, and the reference-edge order belongs to link-content-with-references, out of scope |
| f:cgwyp6 | cut | `defineRegistry`'s refusal of a component named `figure` or `include` is the component registry's rule, which configure-rendering owns (out of scope); this page registers no component |
| f:t5ebsr | carried (scoped) | Guards that keep includes valid (a publish, not a save, updates the recorded includes); scoped in Write a fragment and include it (rows record included fragments). Its other row fields are not used |
| f:2dqwmu | carried (scoped) | Forward resolveFragment from your render (the scaffold's feed resolves fragments through `createFragmentResolver`); its absolute-image-URL clause is not used |
| f:ps54gh | cut (subordinated) | `SiteRender`'s full input shape, its HTML-only return, and `renderDocument` for headings: `docs/reference/core.md#siterender` states the input object and the `Promise<string>` return, and `docs/reference/core.md#createrenderer` states that `renderDocument` returns headings (both opened and confirmed). The page needs only the `resolveFragment` member, which `f:zv3q45` carries |
| f:y3s3t9 | cut | Duplicates `f:880bg6` and `f:ojydmz` from the same source lines, as the page inputs disposed it |
| f:7az6m2 | carried (added) | Index the fragment files (a concept missing from the plugin's `content` gets no rows, with no throw or warning) |
| f:z68na4 | carried (added, scoped) | Write a fragment and include it (an include names the fragment by its id, the filename stem) |
| f:n0laoh | carried (added, scoped) | Write a fragment and include it (a drifted manifest fails the build); its migration-tolerance clauses are not used |
| f:fdtgh5 | carried (added) | Write a fragment and include it (the stale-manifest error names `npx cairn-manifest`); cited again in Diagnose |
| f:6ebew3 | carried (added, scoped) | Verify the include (`pages` entries take `/:slug`, so the scaffold's about page is `/about`) |
| f:htxey1 | carried (added, scoped) | Introduction, the Note callout (a component declares optional `attributes`); the rest of `ComponentDef` stays on configure-rendering |

The page-inputs claim inventory carried twenty rows, disposed as it recorded them: the absent prior
page (no claims), `f:y3s3t9` (cut, above), and the "filed" rows for `f:n5d65u`, `f:rolr87`, and
`f:xjkgtp`, each carried in the section the table names.

## Friction filed

The page-inputs step filed two entries on 2026-10-12 (the three fragment wiring points fail three
different ways; an empty include passes the build while a dangling one fails it), and this plan does
not refile them. This plan filed two entries in `docs/internal/docs-friction-log.md` on 2026-10-12,
none blocking the page:

1. Engine: a dangling `::include` passes both save and publish, unlike a `cairn:` link, which the save
   refuses, and the fragment delete guard reads only `main`'s manifest, so an include held on a
   pending branch doesn't block the delete. No fact states the save's silence.
2. Docs content: `docs/extend/debug-your-site.md` has no `include.missing` row and no row for the
   build's `cairn: fragment "<id>" not found` error.

## Drafting constraints

- **Which site.** Every code block names its file in a first-line comment, and every file reference
  says which site it means: `src/lib/cairn.config.ts` and `src/lib/content.ts` for the tutorial's
  site, `src/theme/cairn.config.ts` and `src/chassis/content.ts` for a scaffolded one (`f:q07rd5`,
  `f:60zw5n`, `f:n5d65u`). The step code is the tutorial site's, since a scaffolded site already has
  every piece but the reader's next fragment.
- **The brief's `local` array** takes the names the page has the reader create or supply, or that come
  from the tutorial page rather than a fact: `fragmentsRaw` and `postsRaw`, `field-notes`,
  `2026-08-14-first-light.md` and `src/content/posts/2026-08-14-first-light.md`,
  `/posts/first-light`, `CAIRN_DEV_BACKEND`, `npm run build`, and the placeholders `<id>` and `...`
  inside a quoted directive.
- Never say a save or a publish checks that an include's fragment exists, and never say the build
  catches an include with no `fragment` attribute (friction filed; `f:bfiuem`).
- Never say the plugin's missing `content` entry throws or warns (`f:i6zyab`, `f:7az6m2`).
- Never say the site's render builds the fragment resolver for its public pages; it forwards the one
  it receives (`f:xjkgtp`).
- Never quote the empty-include notice's text or the delete refusal's text: no fact gives either. The
  only quoted strings are the four messages the facts state: the composition throw (`f:7wiuwr`), the
  start of the missing-glob throw (`f:60zw5n`), the resolver's not-found throw (`f:xjkgtp`), and the
  nested-include refusal (`f:82eo9p`), plus the `Missing fragment` notice name (`f:bfiuem`).
- Never describe the Include a fragment control's use from the editor's seat beyond the one paragraph
  in "Write a fragment and include it"; that is the editors arm.
- Components and their attributes stay on configure-rendering, and reference fields on
  link-content-with-references: name each in the introduction, the callout, and See also only.
- `fragments`, `routing: 'embedded'`, `::include{fragment="<id>"}`, `createSiteIndexes`,
  `cairnManifest`, `content`, `rendering.render`, `resolveFragment`, `resolve`, `resolveMedia`,
  `renderMarkdown`, `createPublicRoutes`, `createFragmentResolver`, `FragmentResolve`, `SiteRender`,
  `include.missing`, both reasons, and every file path in code spans; "Include a fragment",
  "Included in", "Fragments", and "Trail safety notice" capitalized as the admin shows them.
- Every section opens on the first sentence decided above. Each step names its location before its
  action and holds one action, a conditional step states its condition first, and a procedure of one
  step is a single bulleted item. A reference names its target by heading, never by position.
