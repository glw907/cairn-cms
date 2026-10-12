# Page plan: Link content with references

Page: `docs/extend/link-content-with-references.md`. Page type: task guide. Status: new page, no prior
version on disk. Written 2026-10-12 by the plan step of the docs page chain (stage 2b part 1). The
drafter drafts from this plan: it is the source of the page's order, each section's claim, and each
fact's placement. The structural edit seat reads it before any prose exists. The plan is Google's
outline written down (Google Technical Writing Two, "Organizing large documents",
https://developers.google.com/tech-writing/two/large-docs): the outline is the document's narrative,
and information arrives where it is most relevant to the reader.

Inputs read: the outline entry in `docs/internal/outlines/extend.json` (slug
`link-content-with-references`: job, covers, out-of-scope list, exemplars); "The page anatomies" and
"The introduction" in `docs/internal/docs-register.md`; every fact bullet named below in
`docs/internal/facts/extend.md`; the two exemplars (`extenders/django-custom-management-commands`,
`extenders/directus-create-extension`); the reference entries each link names
(`docs/reference/delivery-data.md` `resolveReferences`, `buildSiteDescriptors`, and "Types";
`docs/reference/delivery.md` `EntryData`; `docs/reference/core.md` "Fields", `fields`, and "Manifest
format, parse, and verify"; `docs/reference/vite.md` `cairnManifest`); the sibling pages
`docs/extend/content-model.md` ("The content manifest", "Renames", and its out-of-scope pointer to
this page), `docs/extend/add-cairn-to-a-sveltekit-app.md` ("Write the site config and a minimal
adapter", "Index the content and commit its manifest", "Render the entry"), and
`docs/extend/debug-your-site.md` (no reference row); the configure-media plan for the chain's plan
shape; and the code the facts cite (`src/lib/content/fields.ts`, `src/lib/content/references.ts`,
`src/lib/content/manifest.ts#verifyReferences`, `src/lib/delivery/site-resolver.ts`,
`src/lib/delivery/content-index.ts:153`, `src/lib/sveltekit/content-routes-entry-write.ts:255-290`,
`src/lib/sveltekit/content-routes-entry-destructive.ts:120-160,266-300`,
`templates/waymark/src/theme/cairn.config.ts:80-90`, `templates/waymark/src/chassis/entry-data.ts`,
`templates/waymark/src/routes/(site)/[...path]/+page.server.ts`, and
`templates/waymark/src/theme/components/ArticleView.svelte:50-60,125-150`). The pages
`define-an-adapter-and-schema.md`, `build-the-public-routes.md`, and
`reuse-content-across-entries.md` are not on disk yet; the extend outline names all three, so the
link gate passes a link to each as pending, with no anchor.

Headings in this plan's section list are the page's headings, verbatim. A claim inventory `section`
names one of them. The introduction is the untitled text under the H1 and is named `Introduction`.

## What the page argues

A reference is a frontmatter field that holds another entry's permanent id, typed to one concept.
The engine owns everything between the declaration and the rendered link: the picker the editor
uses, the edge the manifest records, the resolution a public route calls, and the checks that keep
the id pointing at a real entry. The site owns two lines of code at each end: the field declaration
in the adapter, and the template that renders the resolved target. The page's spine is one running
example, a post's `author` (one `pages` entry) and `related` (a list of `posts` entries), carried in
the order the data travels: declared, picked, resolved, rendered, then checked. This is the Django
exemplar's take, one example (there, the poll) carried from declaration through every later
concern.

The page serves two readers with one spine. A developer on a scaffolded site already has the
example wired end to end (`f:wyrefs`): the steps read as a tour of the four files that carry it,
and the reader adds a reference of their own the same way. A developer on the add-cairn tutorial's
site has one `posts` concept and no reference wiring, so they run every step. The code is the
scaffold's for the declaration and the template (the shapes the reader already has or copies) and
the tutorial's for the route, since only the tutorial site lacks the resolve step. Every code block
names its file, so neither reader confuses the two sites.

### The order, argued

Each section holds what the next one depends on, following the data from the adapter to the page.

1. **The introduction carries the model** (`f:563h9u`, `f:i2k4jp`): what a reference stores, what
   the editor and the public page show, and that the build and the admin keep it honest. Without
   that model, the four steps read as unrelated edits in four files.
2. **Before you begin** names the adapter file per site and the two things a reference depends on:
   a declared target concept and the build plugin that checks references.
3. **Declare a reference field** (cover 1) comes first among the steps because every later piece
   reads the declaration: the picker scopes to its `concept`, the manifest takes the edge's concept
   from it (`f:9i99mg`), and `resolveReferences` walks the concept's descriptor. The
   `normalizeConcepts` failure sits on the step it governs, the Django exemplar's "rule where it
   bites".
4. **Pick a target in the editor** (cover 2) follows directly, because the declaration's first
   visible effect is the admin form, and a picked target is the data every later step resolves and
   the verification renders. It is one step, not an editor walkthrough.
5. **Resolve the targets on the entry route** (cover 3, first half) follows because the public page
   reads the resolved map, not the stored id. The scaffold already does this for every concept
   (`f:wyrefs`), so the section tells the scaffolded reader so in its second sentence, and the
   tutorial reader adds the call. The missing-id rule (`f:mpdshq`) sits here, where the reader
   learns what the map can lack.
6. **Render each target as a link** (cover 3, second half) follows the resolve, because the
   template reads the map's values. What a `ResolvedReference` carries (`f:jxgm4i`) is placed here
   rather than in the resolve section: it is the template's input, and the reader needs the member
   names at the moment they write `href` and the link text.
7. **Verify the rendered link** follows the last step directly, as the anatomy's verification
   (item 4) follows its steps (item 3): the post with targets picked, published, renders each
   target as a link. The steps and their check run without a break, so the reader sees the task's
   observable result before any exposition. The Directus exemplar's take, the "see it running"
   check on the public page.
8. **The build's reference check** (cover 4) opens the page's explanation, after the verified
   task. Explanation follows the task it explains, and the verification's publish step is what
   triggers this check, so the reader arrives having just run it. It also answers the question the
   resolve section raises: the route drops a missing id silently because the build has already
   failed on one. It precedes the admin guards because the guards are framed against it: the save
   only warns since the build fails a true dangling reference.
9. **The admin's reference guards** (covers 5 and 6) follows the build check. Save, delete, and
   rename run in the order an editor meets them across an entry's life, and the byte-preserving
   rewrite closes the rename paragraph, since it is what a rename does when it does not refuse.
10. **Where a `cairn:` token is live** (cover 7) closes the explanation. It answers the reader who
    asks why not write a `cairn:` link in a frontmatter field instead: a token there is inert. It
    also completes the contrasts the two sections before it open (a body link refuses the save, a
    reference warns; a missing body-link target is marked or fails the render, a missing reference
    target is dropped). It is placed after the guards, not before the steps, because a reader who
    arrived at a page titled for references has already chosen one, and the section is boundary
    knowledge, not the choice.
11. **Diagnose a failed check** is the anatomy's failure-path slot (item 5). It follows the
    explanation rather than the verification because two of its causes are the build check and
    the declaration rule, which the reader has then read; it names "Verify the rendered link" by
    heading. The extend recovery surface has no reference row, so the page keeps its causes and the
    friction is filed.
12. **See also** closes the page (anatomy item 6).

### Departures from the outline's covers order, with the reason for each

- Cover 3 splits into two step sections, resolve and render, per the Directus take (one verb per
  heading): each is one file and one action, and the template reads what the route returns.
- Covers 5 and 6 merge into one explanation section: the byte-preserving rewrite is what a rename
  does once its guard passes, so it reads as the rename paragraph's last sentence, not a section of
  its own.
- A section the covers do not list, "Before you begin", opens the body (anatomy item 2). Two the
  anatomy fixes take its order: "Verify the rendered link" sits right after the last step, ahead of
  covers 4 through 7, so the steps and their check run unbroken (anatomy items 3 and 4); "Diagnose a
  failed check" follows the explanation and precedes See also.
- Otherwise the covers keep their order: the explanation sections (covers 4 through 7) follow the
  verified task, because explanation follows what it explains and the verification's publish step
  triggers the build check the first of them covers.

### Exemplar takes, and where each lands

- **Django, custom management commands.** One running example carried through every concern. It
  lands as the `author`/`related` pair, named in the introduction, declared in "Declare a reference
  field", picked, resolved, rendered, checked in "Verify the rendered link", then explained through
  the build check and the guards.
  A rule sits beside the step it governs (`normalizeConcepts` beside the declaration, the dropped id
  beside the resolve). Left behind: the appended class reference, which stays on
  `docs/reference/`.
- **Directus, create an extension.** A bare-infinitive heading per step, and a closing check on the
  running thing. It lands as the four step headings and "Verify the rendered link", which opens the
  public page and follows each link. Left behind: the Docker steps.

### Heading policy

Task headings start with a bare infinitive. "Before you begin", "See also", and "Diagnose a failed
check" are the anatomy's fixed slots, the last matching the configure-media page. The three
explanation sections take noun phrases ("The build's reference check", "The admin's reference
guards") or a question-shaped clause ("Where a `cairn:` token is live"). Inbound links:
`docs/extend/content-model.md:24,80,195,204` link the page with no anchor, so every heading is free.

## The introduction, in Google's three parts

No heading. It opens on a statement, never an imperative, and frames the page from above before the
contract (register, "The introduction"). Two or three paragraphs. The intro-framing step reasons the
final wording. Content items, in order:

1. **The model (what the document covers, framed from above).** A `reference` field connects one
   entry to another: it stores the target's permanent id in frontmatter, typed to one concept, and
   the site declares it with `fields.reference` (`f:563h9u`). In the editor it renders as a picker
   scoped to the target concept, and on the public side a route resolves the id to the target's
   title and permalink and renders a link (`f:i2k4jp`). One sentence on what keeps it honest, scoped
   to claims the body carries: the build fails on a reference to a missing entry (`f:6ggh4v`), and
   the admin refuses a delete that would strand one (`f:2zl9zw`, scoped). The running example,
   named here: a post's `author`, one `pages` entry, and its `related` posts, a list.
2. **Who and why, with the contract.** Two readers. On a scaffolded site, whose adapter is
   `src/theme/cairn.config.ts`, the example is already wired from declaration to template
   (`f:wyrefs`, `f:q07rd5`), so the reader learns the pattern to add a reference of their own. On
   the site the add-cairn tutorial builds, whose adapter is `src/lib/cairn.config.ts` (`f:q07rd5`),
   the reader adds it. The contract sentence, inside the framing: declare the field, pick a target,
   resolve the targets on the public entry route, render each as a link, and check the link on the
   published page. A reader who wants a link inside body text instead writes a `cairn:` link; name
   "Where a `cairn:` token is live" by heading for that reader (register, "A page may serve several
   readers").
3. **Prior knowledge.** TypeScript object literals, a SvelteKit `load` function in
   `+page.server.ts`, Svelte 5 `$props`, `$derived`, and `{#each}`, and YAML frontmatter. From cairn:
   a concept and its fieldset, linked to `docs/extend/content-model.md#concepts`.
4. **What the page does not cover, with the page that does (wrong-place routing).** `cairn:` body
   links as a model and how the manifest records every edge: `docs/extend/content-model.md`
   (sections "The content manifest" and "Renames"). Fragments and the include directive:
   `docs/extend/reuse-content-across-entries.md`. Declaring a concept, such as the `pages` concept a
   reference targets: `docs/extend/define-an-adapter-and-schema.md`. Public routes beyond the entry
   route: `docs/extend/build-the-public-routes.md`. This sentence may name the page, since scope has
   no subject-first form.

## Sections, in order

Each entry carries the page heading; **First sentence**, the one sentence a reader takes from the
section, which is the section's first sentence on the page (its claim is fixed here, its wording may
move to the register's voice, and a task-section sentence stays under 26 words); **Facts**, the ids it
draws on ("cited again" marks a fact whose primary home is another section); the content and steps;
and **Hand-off**, quoted where the plan fixes its wording (each quoted hand-off and lead-in passed
the provenance extractor with no row).

### Before you begin

**First sentence:** References need the adapter file of the site you are changing, a declared target
concept, and a build that runs the `cairnManifest` plugin.

**Facts:** `f:q07rd5` (scoped: the two adapter paths), `f:vrfbld` (scoped: the plugin's verify mode
is what runs the reference check), `f:2dilwu` (scoped: the target must be declared under
`content`), `f:wyrefs` (scoped: the scaffold already wires the example).

A bulleted list of preconditions, each with a link to what produces it (anatomy item 2):

- The adapter file: `src/theme/cairn.config.ts` on a scaffolded site, `src/lib/cairn.config.ts` on the
  add-cairn tutorial's site (`f:q07rd5`). Link
  `docs/extend/add-cairn-to-a-sveltekit-app.md#write-the-site-config-and-a-minimal-adapter` for the
  tutorial's adapter.
- The target concept declared under the adapter's `content` (`f:2dilwu`). Link
  `docs/extend/define-an-adapter-and-schema.md` (pending, no anchor).
- The `cairnManifest` plugin in `vite.config.ts` (`f:vrfbld`). Link
  `docs/extend/add-cairn-to-a-sveltekit-app.md#index-the-content-and-commit-its-manifest`.
- For the tutorial's site: the public entry route its "Render the entry" step creates. Link
  `docs/extend/add-cairn-to-a-sveltekit-app.md#render-the-entry`.

Then one sentence for the scaffolded reader: the scaffold already declares `author` and `related`,
resolves them for every entry, and renders them in `ArticleView.svelte` (`f:wyrefs`), so each step
below names the scaffold file that already does it. Claim nothing else about the scaffold.

**Hand-off (no-claim):** "With those in place, declare the fields."

### Declare a reference field

**First sentence:** A `reference` field stores one entry's permanent id, typed to the concept its
`concept` option names, and `fields.array(fields.reference(...))` stores a list.

**Facts:** `f:563h9u`, `f:rfc0nc`, `f:2dilwu`, `f:9i99mg` (scoped: the edge is `{ field, concept,
id }`, its concept taken from the declaration, never the stored value), `f:wyrefs` (scoped: the
scaffold's two declarations, verbatim). Cited again: `f:q07rd5`.

Content:

- One sentence after the first, the Django "rule where it bites": the frontmatter holds only the id,
  and the engine takes the target's concept from the field's declaration (`f:9i99mg`, scoped), so
  `concept` is the one option a reference needs beyond the base options. `fields.reference` takes
  every `ReferenceField` member but `type` (`f:rfc0nc`); link
  `docs/reference/core.md#fields-1` for the base options.
- A numbered list of two steps, one action each, the location first, lead-in "To declare the
  fields, follow these steps:" (no-claim):
  1. In the adapter file, in the posts concept's `defineFieldset`, add `author:
     fields.reference({ concept: 'pages', label: 'Author' })` (`f:wyrefs`, `f:563h9u`).
  2. In the same fieldset, add `related: fields.array(fields.reference({ concept: 'posts', label:
     'Related post' }), { label: 'Related posts' })` (`f:wyrefs`, `f:rfc0nc`).
- One code block after the steps: the two declarations inside the posts concept's
  `defineFieldset`, other fields elided with a comment. First-line comment names
  `src/theme/cairn.config.ts`, the scaffold's file, since the lines are verbatim from it
  (`f:wyrefs`).
- The rule where it bites, two sentences: when the composition runs, `normalizeConcepts` throws for
  a `concept` that names no concept declared under `content`, naming the concept, the field, and the
  undeclared target, so a typo fails at startup rather than at the build (`f:2dilwu`). On the
  tutorial's site, which declares only `posts`, `related` works as written and `author` throws this
  error until the site declares a `pages` concept; link `docs/extend/define-an-adapter-and-schema.md`.
  The "declares only `posts`" clause is a sibling-page claim, not a fact: the drafter keeps it only
  after confirming `docs/extend/add-cairn-to-a-sveltekit-app.md:263` ("The adapter declares one
  posts concept") at draft time.
- One short frontmatter block showing what a save stores, with placeholder ids (`author:
  <page-id>`, `related:` a two-item YAML list of `<post-id>` placeholders), first-line comment naming
  a post's markdown file by placeholder (`f:563h9u`). The placeholders go in the brief's `local`
  array.

**Hand-off (no-claim):** "Next, open an entry in the admin to see the fields an editor fills in."

### Pick a target in the editor

**First sentence:** A `reference` field renders as a button showing its target's title, and an
`array(reference)` field renders as a removable chip list.

**Facts:** `f:bbovmp`, `f:3zswxq`. Cited again: `f:i2k4jp` (the picker scoped to the target
concept), `f:563h9u` (picking stores the id).

Content:

- One sentence after the first: opening the button shows an entry picker scoped to the field's
  declared concept, and picking sets the stored id (`f:bbovmp`); each chip shows the target's
  resolved title (`f:3zswxq`, its source comment).
- One step, a single bulleted item, location first: in the admin, open a post and pick an author and
  at least one related post, then save. This step sets the data the verification checks; name
  "Verify the rendered link" by heading.
- No editor walkthrough beyond that step: picking from the editor's seat belongs to the editor
  documentation, which has no page yet; name it in words, with no link.

**Hand-off (no-claim):** "With a target picked, resolve it on the public route."

### Resolve the targets on the entry route

**First sentence:** `resolveReferences` returns an entry's references keyed by field name: one
`ResolvedReference` for a `reference` field, and a list in edge order for an `array(reference)`.

**Facts:** `f:nibxrd`, `f:mpdshq`, `f:wyrefs` (scoped: `withReferences`, both routes), `f:vrfbld`
(scoped: `resolveReferences` and `ResolvedReference` import from `@glw907/cairn-cms/delivery`).

Content:

- One sentence on the call: it takes the site resolver, the entry's concept descriptor, and the
  entry's frontmatter, `resolveReferences(site, descriptor, frontmatter)` (`f:nibxrd`), and the
  descriptor comes from `buildSiteDescriptors(cairn, siteConfig)` (`f:wyrefs`). Link
  `docs/reference/delivery-data.md#resolvereferences` and
  `docs/reference/delivery-data.md#buildsitedescriptors` (opened and confirmed: the first states the
  signature, the keyed map, and the edge order; the second says a public route calls it for the
  descriptor `resolveReferences` takes).
- One sentence for the scaffolded reader: `src/chassis/entry-data.ts`'s `withReferences` already
  makes this call for every entry, adds the result as `data.references` (an empty map for a concept
  with no reference fields), and both the public entry route and the preview route apply it
  (`f:wyrefs`). So a reference field added to any concept reaches the template with no route change;
  this follows from `f:wyrefs` with `f:nibxrd` (every reference field on the descriptor resolves),
  and the drafter states it no more strongly.
- One step, a single bulleted item, location first, for the tutorial's site: in
  `src/routes/[...path]/+page.server.ts`, return the entry data with a `references` map that
  `resolveReferences` builds for the entry's concept. The code block, first-line comment naming the
  file, extends the tutorial's route: import `buildSiteDescriptors` and `resolveReferences` from
  `@glw907/cairn-cms/delivery` (`f:wyrefs`, `f:vrfbld`); build a `Map` of descriptors by `id` once at
  module scope; in `load`, await `routes.entryLoad({ url })`, look up `data.concept`, and return `{
  ...data, references }`, an empty object when the concept has no descriptor. Mirror the scaffold's
  `withReferences` (`f:wyrefs`); `EntryData.concept` is on `docs/reference/delivery.md#entrydata`
  (opened and confirmed). The constant and variable names go in the brief's `local` array.
- One sentence on the rule where it bites: `resolveReferences` drops an id with no live target rather
  than throwing (`f:mpdshq`), so a single reference's key can be absent and a list can be shorter
  than the stored ids; the template treats `author` as possibly `undefined`. The reason the drop is
  safe is the next explanation section's; name "The build's reference check" by heading.

**Hand-off (no-claim):** "Next, render each resolved target in the page's template."

### Render each target as a link

**First sentence:** A `ResolvedReference` carries the target's `id`, `concept`, `title`, `permalink`,
and an optional `summary`, so a template links `permalink` with `title` as the text.

**Facts:** `f:jxgm4i`, `f:wyrefs` (scoped: `ArticleView.svelte` reads `author` as one
`ResolvedReference` and `related` as a list, each rendered as `<a href={ref.permalink}>{ref.title}</a>`).
Cited again: `f:nibxrd` (one value or a list), `f:mpdshq` (the possibly absent single key).

Content:

- One step, a single bulleted item, location first: in the entry's page component, read
  `data.references.author` as one `ResolvedReference` and `data.references.related` as a list, and
  render each as a link (`f:wyrefs`).
- One code block: the template excerpt, first-line comment naming
  `src/theme/components/ArticleView.svelte` on a scaffolded site. Two `$derived` reads, `author` cast
  as `ResolvedReference | undefined` and `related` as `ResolvedReference[] | undefined` with `?? []`,
  an `{#if author}` link and an `{#each related as ref (ref.concept + '/' + ref.id)}` list of links.
  Excerpt only what `f:wyrefs` states plus the `undefined` guard `f:mpdshq` requires; elide the rest.
  One sentence: on the tutorial's site, the same markup goes in `src/routes/[...path]/+page.svelte`
  beside `{@html data.html}` (the tutorial's "Render the entry"; no fact needed beyond the path the
  tutorial creates).
- One clause on `summary`: it is optional, so a template that shows it guards it (`f:jxgm4i`). Link
  `docs/reference/delivery-data.md#types` (opened and confirmed: the `ResolvedReference` row lists the
  five members).

**Hand-off (no-claim):** "Next, check the rendered link on the published page."

### Verify the rendered link

**First sentence:** On the published page of a post with references set, each resolved target
renders as a link to the target's permalink.

**Facts:** `f:jxgm4i`, `f:wyrefs` (scoped: the scaffold's template renders each as `<a
href={ref.permalink}>{ref.title}</a>`). Cited again: `f:bbovmp`, `f:3zswxq`.

A numbered list, one check to a step, the location first, lead-in "To verify the link, follow these
steps:" (no-claim):

1. In the admin, open the post you set references on in "Pick a target in the editor", and publish
   it.
2. After the deploy, open the post's public page and confirm the author's title is a link
   (`f:jxgm4i`, `f:wyrefs`).
3. On the same page, confirm each related post's title is a link (`f:wyrefs`).
4. On the same page, select the author link and confirm the author's page opens at its permalink
   (`f:jxgm4i`).

Never say a link to a draft target is dropped or works (friction filed); the verification picks
published targets. When a check fails, the causes are in "Diagnose a failed check", which follows
the explanation sections; the drafter names it by heading in one closing sentence (no-claim):
"If a check fails, see "Diagnose a failed check"."

**Hand-off (no-claim):** "The next three sections cover what keeps each link pointing at a real entry."

### The build's reference check

**First sentence:** Once a post is published, the build stops a reference to a missing entry: the
`cairnManifest` plugin runs `verifyReferences`, which fails the build and names the source entry, the
field, and the missing target.

The first sentence ties the explanation to the task, per the anatomy's lead-in rule: the publish in
the verification's first step is what ran this check, so "Once a post is published" points back at
it without restating the step. Explanation
section; no steps.

**Facts:** `f:vrfbld`, `f:6ggh4v`, `f:5fs5o7` (scoped: each manifest entry records its reference
edges in `references`), `f:l32sb1`. Cited again: `f:9i99mg` (the edge's shape), `f:mpdshq` (why the
route can drop a missing id).

Content, three or four sentences:

- What the check walks: each manifest entry records its outbound reference edges as `{ field,
  concept, id }` (`f:5fs5o7`, `f:9i99mg`), and `verifyReferences` checks that each edge's target
  exists (`f:6ggh4v`). The plugin runs it right after the manifest drift check, so a site that builds
  with the plugin needs no call of its own (`f:vrfbld`). Do not quote the error text: no fact states
  its wording.
- The contrast, one sentence: unlike a `cairn:` link, a reference has no fallback at prerender, so
  this build gate is its only integrity check (`f:l32sb1`).
- The tie back, one sentence: because the build has already failed on a dangling reference,
  `resolveReferences` drops an unresolved id instead of throwing (`f:mpdshq`). Name "Resolve the
  targets on the entry route" by heading.
- Link `docs/reference/core.md#manifest-format-parse-and-verify` (opened and confirmed: it states
  that `verifyReferences` throws naming the source entry, field, and missing target, and that
  references have no prerender backstop).

**Hand-off (no-claim):** "Before a change reaches the build, the admin runs checks of its own."

### The admin's reference guards

**First sentence:** The admin checks an entry's reference edges when an editor saves, deletes, or
renames it: a save only warns, a delete refuses, and a rename refuses or repoints.

The first sentence ties the explanation to the task (what an editor can do to a target the
reader's links depend on). Explanation section; no steps. One paragraph per action, in the order
an editor meets them; the delete's order of checks is a numbered list, since the order is the point.

**Facts:** `f:bz5j8f`, `f:2zl9zw`, `f:2g0v8u` (its fragment `::include` clause only as the pointer
to the fragments page, never restated), `f:7s52oz`, `f:8on7h4`, `f:re5qlm`, `f:gk88bv`. Cited again: `f:6ggh4v` (the build fails a
target still missing at deploy).

Content:

- **Save.** A save whose `reference` names a missing or still-draft target commits with a warning;
  a body `cairn:` link to a missing target refuses the save outright (`f:bz5j8f`). One clause ties it
  to the section before: a target still missing when the post publishes fails the build
  (`f:6ggh4v`). Do not describe the warning's wording or placement: no fact states it.
- **Delete.** The delete guard reads inbound `cairn:` body links from the published manifest and
  inbound reference edges from a cross-branch index over the manifest plus every open `cairn/*`
  branch (`f:2zl9zw`). Then the order, a numbered list, lead-in "A delete runs its checks in this
  order:" (no-claim):
  1. Inbound body links, which refuse with a 409 and `Cannot delete <id>: N pages link to it.`
     (`f:2g0v8u`).
  2. The strict cross-branch reference index. When it cannot be built, the delete refuses with a 503
     rather than counting the reference as absent (`f:7s52oz`, `f:2g0v8u`).
  3. Inbound reference edges, which refuse with a 409 and `Cannot delete <id>: N entries reference
     it.`, listing each referencing entry by concept, id, title, and permalink (`f:2g0v8u`).
  Give each status as the action's refusal status, never as an HTTP response status. Leave out the
  fragment step `f:2g0v8u` names between items 1 and 2: fragments are out of scope. In its place,
  one clause after the list points to `docs/extend/reuse-content-across-entries.md` (pending, no
  anchor), since deleting a fragment runs the same delete action, with its own `::include` check
  added (`f:2g0v8u`, the fragment clause used only this far). It restates nothing else about
  fragments: no message, no status, no include edge model. The drafter confirms the page's title at
  draft time and uses it as the link text.
- **Draft edges.** One sentence: a reference held in an unpublished draft still counts, so it blocks
  the delete or rename of its target though nothing about it is live yet (`f:8on7h4`).
- **Rename.** A rename refuses, naming the blocking entries, when an open branch other than the
  entry's own holds an inbound reference (`f:re5qlm`). Otherwise it rewrites each referencing entry's
  stored id by splicing the new id at its source offset, with no YAML round-trip, so no other byte of
  the file changes (`f:gk88bv`). Link `docs/extend/content-model.md#renames` for the rest of what a
  rename refuses and rewrites. Do not state the rename's status when the index cannot be built: the
  content-model page covers it, and the asymmetry with the delete's 503 is already filed friction.

**Hand-off (no-claim):** "Next, compare a reference with a link written in an entry's body."

### Where a `cairn:` token is live

**First sentence:** To link from a frontmatter field, use a reference, because a `cairn:` token is
live only as an inline link in an entry's body.

The first sentence ties the explanation to a choice the reader makes (a field or a body link), per
the anatomy's lead-in rule. Explanation section; no steps.

**Facts:** `f:aulk5e` (without its fragment clause), `f:bf47a8`, `f:yw7rs6`. Cited again: `f:bz5j8f`
(the save's refusal, named once in "The admin's reference guards").

Content:

- Where the token is live: as an inline markdown link in an entry body, it is resolved, counted in the
  manifest's link graph, and checked by the build (`f:aulk5e`).
- Where it stays inert, as a list of four: a raw HTML anchor and a reference-style link definition,
  where it survives as a literal `cairn:` href, and a component attribute and frontmatter, where it
  is never rewritten; none of the four fails the build (`f:aulk5e`).
- A draft target, one sentence: a body link to a draft entry resolves to that entry's permalink, so
  the build succeeds and the published link points at a 404 until the target publishes (`f:bf47a8`).
- The contrast with a reference, one or two sentences: a body link whose target is missing renders
  marked broken in the editor preview (class `cairn-broken-link`, its text kept) and fails the
  build's render, while a missing reference target is dropped from the resolved map with no mark
  (`f:yw7rs6`).
- Link `docs/extend/content-model.md#the-content-manifest` for how the manifest records both kinds
  of edge. Never restate the link model itself (out of scope).

**Hand-off (no-claim):** "If a check in "Verify the rendered link" fails, work through the following causes in order:"

### Diagnose a failed check

**First sentence:** Each failed check points at one piece: the field's declared concept, the
reference's target, or the route and template that resolve and render it.

**Facts:** `f:2dilwu`, `f:6ggh4v`, `f:mpdshq`, `f:wyrefs` (scoped). Cited again: `f:vrfbld`.

A numbered list of ordered checks (anatomy item 5) in the order a reader meets them, startup before
build before the rendered page. Each item names what the reader sees, then the cause, then the fix
or the link:

1. The site fails at startup with an error naming a concept, a field, and an undeclared target: the
   field's `concept` names no concept under `content` (`f:2dilwu`). Fix the name or declare the
   concept; name "Declare a reference field" by heading.
2. The build fails naming a source entry, a field, and a missing target: a published reference
   points at an entry that no longer exists or never did (`f:6ggh4v`, `f:vrfbld`). In the admin,
   pick an existing target for that field, or restore the target entry; name "The build's
   reference check" by heading.
3. The page shows no link where a reference is set: the route returns no `references` map, the
   template reads another key, or the id has no live target and was dropped (`f:wyrefs`,
   `f:mpdshq`). Name "Resolve the targets on the entry route" and "Render each target as a link" by
   heading.

The extend recovery surface, `docs/extend/debug-your-site.md`, has no reference row (friction filed),
so the page keeps these causes itself and does not link the recovery surface for them.

**Hand-off:** none; "See also" follows.

## Ending

### See also

The anatomy's item 6: related how-to guides, concept pages, and the limitations the page leaves out.
One introducing sentence, "The following pages cover the pieces this page links to:" (no-claim), then
a bulleted list, each item's link text naming its destination:

- `docs/extend/content-model.md`, the content model, the manifest's edges, and renames.
- `docs/extend/reuse-content-across-entries.md`, fragments, the include directive, and the delete
  guard a fragment shares with a reference target (pending).
- `docs/extend/define-an-adapter-and-schema.md`, declaring the concept a reference targets (pending).
- `docs/reference/delivery-data.md#resolvereferences`, the resolver and `ResolvedReference`.
- `docs/reference/core.md#manifest-format-parse-and-verify`, `verifyReferences`.
- `docs/reference/vite.md#cairnmanifest`, the build plugin.

## Dispositions, every fact id

`carried` names the section that holds the fact's primary placement. All 26 fact ids this plan was
handed are carried, six of them scoped. None is cut.

| Fact | Disposition | Section, or reference and reason |
| --- | --- | --- |
| f:i2k4jp | carried | Introduction (the picker scoped to the concept, the resolved link); cited again in Pick a target in the editor |
| f:563h9u | carried | Declare a reference field (stores the permanent id, typed to one concept, `fields.reference`); cited again in Introduction and Pick a target in the editor |
| f:3zswxq | carried | Pick a target in the editor (the removable chip list); cited again in Verify the rendered link |
| f:9i99mg | carried (scoped) | Declare a reference field (concept from the declaration, not the stored value); cited again in The build's reference check |
| f:gk88bv | carried | The admin's reference guards (the byte-preserving rewrite, the rename paragraph) |
| f:nibxrd | carried | Resolve the targets on the entry route (the keyed map, one or a list in edge order); cited again in Render each target as a link |
| f:mpdshq | carried | Resolve the targets on the entry route (a missing id dropped, not thrown); cited again in Render each target as a link, The build's reference check, and Diagnose a failed check |
| f:6ggh4v | carried | The build's reference check (throws naming source, field, target); scoped in Introduction; cited again in The admin's reference guards and Diagnose a failed check |
| f:l32sb1 | carried | The build's reference check (no prerender fallback, unlike a `cairn:` link) |
| f:2zl9zw | carried | The admin's reference guards (body links from the published manifest, edges from the cross-branch index); scoped in Introduction |
| f:7s52oz | carried | The admin's reference guards (the strict index fails closed with a 503) |
| f:8on7h4 | carried | The admin's reference guards (a draft's edge still blocks delete and rename) |
| f:re5qlm | carried | The admin's reference guards (rename refuses for another open branch's edge, naming blockers) |
| f:bz5j8f | carried | The admin's reference guards (save warns on a missing or draft target; a body link refuses); cited again in Where a `cairn:` token is live |
| f:5fs5o7 | carried (scoped) | The build's reference check (each manifest entry records its `references` edges). Its omission and old-manifest clauses are not used |
| f:jxgm4i | carried | Render each target as a link (the five members, link from `permalink` and `title`); cited again in Verify the rendered link |
| f:2g0v8u | carried (scoped) | The admin's reference guards (the delete order and messages). Its fragment `::include` clause backs only the one-clause pointer to `docs/extend/reuse-content-across-entries.md` (the shared delete guard); its message and status are not used, since fragments are out of scope |
| f:bbovmp | carried | Pick a target in the editor (the button with the resolved title, the scoped picker, picking sets the id); cited again in Verify the rendered link |
| f:2dilwu | carried | Declare a reference field (`normalizeConcepts` throws naming concept, field, target); scoped in Before you begin; cited again in Diagnose a failed check |
| f:yw7rs6 | carried | Where a `cairn:` token is live (a missing body-link target is marked or fails the render; a missing reference target is dropped) |
| f:aulk5e | carried (scoped) | Where a `cairn:` token is live (live inline; inert in raw HTML, reference-style definitions, component attributes, frontmatter; no build failure). Its fragment clause is not used |
| f:bf47a8 | carried | Where a `cairn:` token is live (a link to a draft resolves and 404s until the target publishes) |
| f:q07rd5 | carried (scoped) | Before you begin (the two adapter paths); cited again in Introduction and Declare a reference field. Its tutorial-hooks clause is not used |
| f:rfc0nc | carried | Declare a reference field (`concept` names the target; `fields.reference` sets `type`; the array form) |
| f:wyrefs | carried (scoped) | Resolve the targets on the entry route (`withReferences`, `data.references`, both routes); scoped in Introduction, Before you begin, Declare a reference field (the two declarations), Render each target as a link (`ArticleView.svelte`), Verify the rendered link, and Diagnose a failed check |
| f:vrfbld | carried | The build's reference check (the plugin's verify mode runs `verifyReferences`); scoped in Before you begin and Resolve the targets on the entry route (the `/delivery` import); cited again in Diagnose a failed check |

The page-inputs claim inventory carried 27 rows, disposed as it recorded them: the absent prior page
(no claims), the three "filed" rows (`f:rfc0nc`, `f:wyrefs`, `f:vrfbld`), and 23 carried rows. Three
section names in that inventory are the page-inputs step's working names, mapped here to this plan's
headings: "Keep references pointing at real entries" became "The build's reference check" (`f:9i99mg`
moved its primary home to "Declare a reference field"), "The admin guards" became "The admin's
reference guards", and "Rename a target" folded into "The admin's reference guards" (`f:gk88bv`).

## Friction filed

The page-inputs step filed two entries on 2026-10-12 (the reference and `cairn:` link failing in
opposite directions; a `cairn:` token inert outside an inline body link), and the content-model
steps filed the rename-versus-delete status asymmetry and the split link-model home; this plan does
not refile them. This plan filed three entries in `docs/internal/docs-friction-log.md` on
2026-10-12, none blocking the page:

1. Engine: `resolveReferences` resolves a draft target, and a non-routable concept's entry, to a
   permalink no route serves, while its doc comment and `docs/reference/delivery-data.md:436-437`
   say an unresolved id is a draft target.
2. Engine: a delete or rename refused for an inbound reference logs nothing, unlike a media delete's
   `media.delete_refused`.
3. Docs content: `docs/extend/debug-your-site.md` has no row for a reference failure, and
   `docs/reference/vite.md`'s `cairnManifest` entry never says its verify mode runs
   `verifyReferences`.

## Drafting constraints

- **Which site.** Every code block names its file in a first-line comment, and every adapter
  reference says which site it means: `src/theme/cairn.config.ts` for a scaffolded site,
  `src/lib/cairn.config.ts` for the tutorial's (`f:q07rd5`). The declaration and template code is
  the scaffold's; the route code is the tutorial's.
- **The brief's `local` array** takes the names the page has the reader create or supply: the
  descriptor map's constant and the `load` locals in the tutorial route (for example `descriptors`,
  `descriptor`, `references`), the template's `author`, `related`, and `ref`, and the placeholders
  `<page-id>`, `<post-id>`, `<id>`, and `N`.
- Never say a reference to a draft target is dropped, renders no link, or works; never say a
  resolved link always serves (friction 1).
- Never quote `verifyReferences`'s or `normalizeConcepts`' error text: the facts state what each
  names, not its wording.
- Never give a delete refusal as an HTTP response status; give it as the action's refusal status.
- Never describe the save warning's wording or where it shows.
- Never restate the `cairn:` link model, the manifest's row format, or fragments: link
  `docs/extend/content-model.md` and `docs/extend/reuse-content-across-entries.md`.
- Never describe picking from the editor's seat beyond the one step in "Pick a target in the editor"
  and Verify step 1; that is the editors arm.
- `fields.reference`, `fields.array`, `normalizeConcepts`, `resolveReferences`, `ResolvedReference`,
  `buildSiteDescriptors`, `withReferences`, `verifyReferences`, `cairnManifest`, every member name,
  class name, and quoted refusal message in code spans.
- Every section opens on the first sentence decided above. Each step names its location before its
  action and holds one action, and a procedure of one step is a single bulleted item. A reference
  names its target by heading, never by position.
