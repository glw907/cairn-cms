# Page plan: Content model

Page: `docs/extend/content-model.md`. Brief: `docs/internal/briefs/extend/content-model.json` (the
drafter writes it). Framing record: `docs/internal/briefs/extend/content-model.framing.md` (the
framing step writes it after this plan's read). Page type: concept, in the extend track's Model
content group, fourth in the outline's order and the first page of the group. Status: new page, no
committed draft, so there are no old claims to inventory. Written 2026-10-12 by the plan step of the
docs page chain (stage 2b part 1).

The drafter drafts from this plan: it is the source of the page's order, each section's claim, and
each fact's placement. The plan is Google's outline written down (Google Technical Writing Two,
"Organizing large documents", https://developers.google.com/tech-writing/two/large-docs): "think of
an outline as the narrative for your document," structured so the document "introduces information
when it's most relevant to your reader."

Inputs read: the outline entry for `content-model` in `docs/internal/outlines/extend.json` (job,
covers, outOfScope, exemplars), and the entries for the four out-of-scope pages
(`define-an-adapter-and-schema`, `link-content-with-references`, `reuse-content-across-entries`,
`configure-rendering`) so this page's edges meet theirs; "The page anatomies", "Structure", and
"The introduction" in `docs/internal/docs-register.md`; the two exemplars
(`~/.local/share/cairn/exemplars/extenders/cf-workers-bindings/page.md`,
`~/.local/share/cairn/exemplars/designers/astro-layouts/page.md`); every fact bullet named below in
`docs/internal/facts/extend.md`; the option rows mapped to those facts in
`docs/internal/option-map.json`; the reference entries this plan links (`defineConcept`, "Fields",
`fields`, `defineFieldset`, and "Content and manifest" in `docs/reference/core.md`, and the
`publish.address_collided` row of `docs/reference/log-events.md`); and the code behind the dated id
(`src/lib/content/ids.ts`, `src/lib/sveltekit/content-routes-entry-read.ts:238-249`) and the concept
id checks (`src/lib/content/concepts.ts:152-196`).

Headings in this plan are the page's headings, verbatim. A claim inventory `section` names one of
the H2 headings. The introduction is the untitled text under the H1 and is named `Introduction`.

## What the page argues

A concept is two declarations a site owns, a directory of markdown files and a fieldset, and
everything the engine does with the concept's entries follows from those two. The fieldset is the
one place a field exists, so the form, the save's checks, and the site's types cannot drift apart;
the directory and the filename fix an entry's identity, the routing shorthand decides whether that
identity becomes a public address, and the committed manifest records the result so the admin can
read the whole graph from one file while git stays the source of truth. The reader leaves able to
predict, before declaring anything, what a declaration will produce, what the engine will refuse at
load or at save, and which behaviors surprise a developer coming from HTML forms or other CMSs.

The exemplars set the shape. From Cloudflare's bindings page: the definition as a grant ("When you
declare a binding on your Worker, you grant it a specific capability"), here what declaring a
concept grants a site; the first example pairing the declaration with its use, here a concept
declaration beside one entry file it governs; and the failing snippet that marks the boundary, here
a container nested too deep. From Astro's layouts page: demystify before explaining ("there is
nothing special about a layout component!"), here the scaffold's posts and pages being ordinary
concepts; and the bulleted list of exactly what a consumer receives, captioned by file path, here
what one concept declaration gives the site, captioned by the adapter file.

## The order, and why

The job names its subjects in this order: what a concept is, how a fieldset drives the form, the
validator, and the types, how entries are identified and routed, and what the manifest records. The
page keeps that spine, because each step needs the one before it: an entry's date comes from a
field, so fields precede identity; an address comes from identity and routing, so both precede the
collision check; the manifest records identity, routing, links, and edges, so it follows all of
them; and a rename changes identity and rewrites the links the manifest records, so it closes the
body.

1. **Concepts** (the anatomy's definition). The grant, the paired example, the demystifying
   sentence about posts and pages, and the list of what a declaration gives the site. The adapter
   file is named here, once, with the site it belongs to.
2. **The fieldset**. The definition's second half: the single source of truth and the closed set of
   fifteen builders. It comes before identity because an entry's date is a field.
3. **Field options**. A short section: the four base options named, the reference linked for every
   option's plain behavior, and only the edges a developer would not predict. Kept short so it
   does not slow the reader before identity, routing, and the manifest, the model's spine.
4. **Containers**. The two builders that hold other fields, after the leaves they hold. It ends on
   the failing snippet, the declaration-time boundary.
5. **Save-time validation**. From declaration-time refusals to save-time ones: the rules the two
   sections before it declared, enforced before any commit.
6. **Frontmatter keys the engine reads**. A save writes what the fieldset declares, and five keys
   matter to the engine as well as to the form. It hands off on `date`, the key that the next
   section separates from the filename.
7. **Entry identity**. The filename, the id, the slug, and the date, with `dir` and the id's
   character set as the constraints on the first two.
8. **Routing**. What the public site does with an entry's identity.
9. **Address collisions**. Routing gives each routable entry an address, and two entries can
   resolve to the same one.
10. **The content manifest**. The record of everything the sections before it produce, per entry,
    and why it exists beside git.
11. **Renames**. A change to identity that rewrites the links the manifest tracks, in one commit.
    It closes the body because it draws on identity, routing, and the manifest together.
12. **Related resources** (the anatomy's ending).

### Departures from the outline's cover order, with the reason for each

- Cover 10 (field-type edges) moves up beside the options, into Field options, ahead of cover 3
  (containers). Each edge belongs to an option or a builder (`pattern`, `default`, `options` and
  `creatable`, `datetime`'s `min` and `max`, `url`), and the reader needs it at the moment they set
  that option, not after the model is done. The option rows the page inputs filed for the leaf
  builders are subordinated to the "Fields" table in `docs/reference/core.md`, not tabled here, so
  the section stays a handful of edges and does not become a reference listing on a concept page.
- Cover 3 (containers) follows the leaf options rather than preceding them, since a container's
  rules are stated in terms of the leaves it may hold, and its failing snippet leads into the
  declaration-versus-save turn that opens Save-time validation.
- Cover 9 (frontmatter keys read by name) moves ahead of cover 4 (entry identity). It follows the
  save, because the key's survival depends on what a save writes, and its `date` key is the turn
  into identity, where the filename's date and the entry's date part.
- Cover 11 (`dir` verbatim and ASCII-only ids) folds into Entry identity, since both constrain the
  path `<dir>/<id>.md` that section states.
- Cover 12 (address collisions) moves ahead of cover 7 (the manifest), directly after routing,
  because a collision is a property of the permalinks routing creates. Cover 8 (rename) moves to the
  end of the body, after the manifest, for the reason stated in item 11 above.

### Heading policy

Headings are sentence case. H2 headings are noun phrases with no leading -ing word, no question, no
teaser, and no comma-and second head (`docs/internal/docs-register.md`, "Structure"). No heading
carries a link or a code span. No committed page links an anchor on this page:
`docs/extend/architecture.md` links it whole from its out-of-scope list (line 22), its seams table
(line 69), and its related resources (line 194), and `docs/extend/scaffolded-site-files.md` links it
whole from its related resources (line 546), so every slug is free.
The page has no H3 headings; each section is one subtopic short enough to run as paragraphs, a list,
or a table.

## Introduction

No heading. The framing step reasons the readers and writes the intro plan; the drafter writes the
introduction from that record. This section fixes what the framing keeps: Google's three parts and
the concept anatomy's requirements (a summary paragraph that introduces the concept, explains why it
matters, overviews the scope, and states what is out of scope with the pages that cover it).

- **Opening.** A statement about the reader's situation or the content model, never about the page
  and never an imperative. Every entry an editor writes in the admin and every page the public site
  builds from markdown belongs to a concept the site declares in its adapter.
- **Why it matters.** One declaration decides the form editors fill in, what a save accepts, the
  type the site's code reads entries as, whether an entry gets a public address, and what the
  committed manifest records (`f:phdgof`, `f:s2zbzm`, `f:t5ebsr`). A developer who knows the model
  before writing the declaration avoids the refusals the engine raises at load and the keys a save
  drops (`f:68fh1k`, `f:69j91g`). The general model it sits in: the content map is one of the
  adapter's seams, as `docs/extend/architecture.md` sets out.
- **What the page covers** (Google part 1). A bulleted list in body order of plain subjects with no
  code span or numeral, introduced by a complete sentence that names the subjects and never the page
  and never frames them as "parts" of anything: what a concept is and what declaring one gives a
  site; the fieldset, its builders, the options that behave unexpectedly, and the two containers;
  how a save validates; the frontmatter keys the engine reads; how an entry is identified and
  routed, and what happens when two entries share an address; the content manifest; and renames. The framing step may merge items, but
  the list must still match the body. It must not repeat the Concepts section's list, which names
  what a site receives, not the subjects of the page.
- **Prior knowledge** (Google part 2). TypeScript literal types and inference, YAML frontmatter at
  the head of a markdown file, JavaScript regular expressions, and HTML form input attributes. A
  reader new to the adapter reads `docs/extend/architecture.md` first for where the content map sits
  among the seams.
- **What the page doesn't cover** (Google part 3). A bulleted list of four items under a complete
  lead-in that never names the page itself, each item subject first and page last:
  - Writing the adapter and a concept's declaration, in `docs/extend/define-an-adapter-and-schema.md`
  - Reference fields in use, in `docs/extend/link-content-with-references.md`
  - Fragments and the include directive, in `docs/extend/reuse-content-across-entries.md`
  - Rendering an entry's body, in `docs/extend/configure-rendering.md`
- **Readers the framing step weighs.** A developer about to declare their first concept, on a
  scaffolded site or the tutorial's (the job's reader); a developer who took over a scaffolded site
  and is reading the posts and pages concepts it inherited; a reader arriving from Architecture's
  seams table for the content map in depth; and a reader who came to write the declaration, routed
  to Define an adapter and schema by the out-of-scope list.

## Sections, in order

Each section carries its heading; **Takes**, the one sentence a reader keeps, which is the section's
first sentence on the page (the drafter may re-word it to the register's voice, never change its
claim); **Draws on**, the fact ids placed there and what each contributes; and **Hand-off**, the turn
the section closes on. A hand-off is the last sentence of the section's final paragraph, never a
paragraph of its own and never a reference to the page's order ("below", "the next section"); the
following heading does the navigation. A hand-off marked `no-claim` carries no extractable fact; one
that cites ids is a claim the brief cites. A fact "cited again" is placed in the section the
Dispositions table names and cited a second time where noted.

### 1. Concepts

- **Takes:** Declaring a concept in the adapter's `content` map grants a site one kind of content: a
  repository directory of markdown entries, described by a fieldset. (`f:5eum60`)
- **Draws on:** `f:5eum60` (a concept is one entry in the adapter's `content` map, declared with
  `defineConcept`: a `dir` of markdown files plus a `fields` fieldset, with optional routing and URL
  policy). Then `f:q07rd5`, the path clause only: the adapter module is `src/theme/cairn.config.ts`
  on a scaffolded site and `src/lib/cairn.config.ts` on the tutorial's site; every sentence that
  names the file says which site it means. The fact's tutorial-hooks clause stays off this page.
  Then the paired example, the Cloudflare take: a short `defineConcept` declaration for a site's own
  concept (an `events` concept with a `dir`, `routing: 'page'`, and a fieldset of a required `title`
  text field and a `date` field), captioned by the scaffolded site's adapter path, beside one entry
  file in that directory with matching frontmatter and a body, captioned by its own path. The two
  captions are the Astro take's file-path captions. Then the demystifying sentence, the Astro take:
  the scaffold declares posts and pages concepts, and neither name is reserved, so they are ordinary
  concepts a site may rename, remove, or sit beside its own (`f:5eum60`). Then the list of what one
  declaration gives the site, under the `no-claim` lead-in, one item each in one form:
  - an admin list and an editor for the concept's entries (`f:vs77a6`)
  - a form, a save-time validator, and a TypeScript type, all from the fieldset (`f:phdgof`)
  - a public page for each entry, unless the routing shorthand is `'embedded'` (`f:s2zbzm`)
  - a row for each entry in the committed content manifest (`f:t5ebsr`)
  Link the `defineConcept` entry in `docs/reference/core.md` for the signature and the URL policy's
  declaration-time checks.
- **Hand-off:** The fieldset is the half of a concept that a site writes field by field.
  (`no-claim`)

### 2. The fieldset

- **Takes:** A concept's fieldset is the one place its fields are declared: the engine derives the
  editor's form, the save-time validator, and the TypeScript type the site reads entries as from it,
  with no separate schema language. (`f:phdgof`)
- **Draws on:** `f:phdgof` (no second place a field is declared, so the three cannot drift apart).
  Then `f:2hxm4t` as a sentence or a two-item list in one form: thirteen leaf builders (`text`,
  `textarea`, `number`, `select`, `multiselect`, `url`, `email`, `date`, `datetime`, `boolean`,
  `icon`, `image`, `reference`) and two containers (`object`, `array`); the leaf and container
  grouping is `f:68fh1k`'s, cited with it. Then `f:im6x7r`: `FieldDescriptor` is a closed union of
  the fifteen, and the engine exposes no seam to register another field type, so a shape outside
  them is modeled with the builders there are. Link the "Fields" table in `docs/reference/core.md`
  for what each builder renders as and validates, which this page does not restate. The `reference`
  builder is named only; its use is `docs/extend/link-content-with-references.md`'s, linked here
  once.
- **Hand-off:** Each builder takes options that shape its input and the checks a save runs.
  (`no-claim`)

### 3. Field options

- **Takes:** Every builder takes four base options, `label`, `help`, `required`, and `default`, and
  a few options behave in ways their names alone do not predict. (`f:u9rvl3`, the naming clause
  only)
- **Draws on:** The section states the edges only, never each option's plain behavior. The second
  sentence links the "Fields" table in `docs/reference/core.md` for every builder's own options and
  what each does; this page restates neither that table nor its rows. Then a four-item list under
  the `no-claim` lead-in "These options behave in ways their names alone do not predict.", one form
  per item, option first, each item under 26 words (the drafter may split an item in two):
  - `pattern` on `text` and `textarea`: compiled when `defineFieldset` runs, so a bad pattern throws
    at declaration; tested with no flags and unanchored, so a whole-value match carries its own `^`
    and `$` (`f:8fv57g`, the compile clause; `f:7l7y5l`).
  - `default` on any builder: prefills only a new entry's create form, never an existing or
    hand-written file; a `date` field's `'today'` resolves to the current UTC date (`f:7lo8fe`).
  - `creatable` on a `multiselect` that sets `options`: swaps the control for a tag input, and a
    value outside `options` still fails the save (`f:8b21y6`).
  - `min` and `max` on `date` and `datetime`: a `date` field's bounds are enforced at save but not
    rendered on the input; a `datetime` field's are enforced by neither the save nor the form
    (`f:t7cr8o`, `f:8igohk`).
  After the list, one sentence on the constraint form (`f:8fv57g`, the not-rendered clause, with
  `f:t7cr8o`): the `text`, `textarea`, and `date` constraints never render as input attributes, so
  the form accepts a value the save then refuses. The sentence makes no claim about the `number`
  constraints, which `f:ob28pr` covers and the reference's "Fields" table owns. Then one paragraph
  on the two builders whose value check involves no option: a `url` field accepts only an absolute
  `http://` or `https://` URL with no whitespace, so a root-relative path or a `mailto:` value fails
  (`f:7ci1fm`); a `datetime` field keeps a quoted string as written and converts an unquoted full
  ISO timestamp, which YAML parses into a `Date`, to a zoneless `YYYY-MM-DDTHH:mm` string read in
  UTC, dropping seconds and offset (`f:8igohk`). No table: `label`, `help`, `required`, `rows`,
  `placeholder`, the length rules, the `number` options, and the `select` and `multiselect`
  `options` stay in the reference. A tag field's vocabulary-sourced options belong to
  `docs/extend/define-an-adapter-and-schema.md` and stay off this section.
- **Hand-off:** Two of the builders hold other fields rather than a value of their own.
  (`no-claim`)

### 4. Containers

- **Takes:** `object` and `array` are the two container builders, and each nests one level: an
  `object` holds leaf fields, and an `array` holds one leaf or a flat `object` of leaves.
  (`f:68fh1k`)
- **Draws on:** `f:loqocz` (`fields` is the record of leaf fields keyed by frontmatter sub-key,
  stored as one nested object, and an optional object whose leaves are all empty omits its key;
  `label` is optional: a top-level object's legend falls back to the humanized key, `social_card`
  reading "Social card", and an object inside an array is labeled by the array). `f:brs2v9` (`item`
  is the descriptor every element conforms to; the value is a list; an optional empty list omits its
  key and a required one fails the save; an `array` of `reference` items stores a list of entry
  ids). Then the limits, `f:68fh1k`: an array of arrays throws, a container inside an `object`
  throws, and a `reference` inside an `object` throws with the advice to model it as the parent's own
  concept or use a top-level `array` of references. Then `f:t4hh8w`: no field key, top-level or
  nested, contains a dot, since the engine addresses a nested field by a dotted path. Then the
  failing snippet, the Cloudflare take: a short `defineFieldset` declaration of an `array` whose item
  is another `array`, with a comment that the call throws when the module loads. It carries the
  snippet gate's skip comment with its reason, as `docs/reference/core.md` does for its illustrative
  fragments. Link the `fields` entry in `docs/reference/core.md` for a working container example.
- **Hand-off:** The fieldset's rules meet an editor's values at the save. (`no-claim`)

### 5. Save-time validation

- **Takes:** An admin save runs the concept's validator on the submitted values before any commit,
  and an invalid save stops there: the editor sees the first failing message in one banner, and
  nothing reaches the repository. (`f:hdrzxd`)
- **Draws on:** `f:hdrzxd` (only the first validation message returns, shown as one banner; the save
  never reaches the Backend). The second sentence sets the two moments apart, citing `f:8fv57g` and
  `f:68fh1k`: a malformed `pattern` or a container nested too deep throws when the adapter module
  loads, while a value that breaks a declared rule is refused at the save. The cross-field `refine`
  hook and `behavior.validate`, including how a throwing `behavior.validate` is treated, belong to
  `docs/extend/define-an-adapter-and-schema.md`, linked in one sentence with no claim about either
  (the outline's cover names that page for them). The page never claims a save shows every error.
- **Hand-off:** Some of the keys a fieldset declares matter to the engine as well as to the form.
  (`no-claim`)

### 6. Frontmatter keys the engine reads

- **Takes:** The engine reads five frontmatter keys by literal name, `title`, `date`, `updated`,
  `description`, and `draft`, so a site that wants one to survive an admin save declares it as a
  field. (`f:69j91g`)
- **Draws on:** `f:69j91g` as a five-item list under the `no-claim` lead-in, one form per item, key
  first: `title`, the entry's title, falling back to its id; `date`, the entry's date, which dated
  permalinks and templates use (`f:zce3pt`, cited again); `updated`, the sitemap's `lastmod` and the
  feed's modified date; `description`, the excerpt; `draft`, which a boolean field of that name turns
  into the edit page's Hidden toggle. The page claims nothing about what `draft` does to delivery
  beyond the toggle, since no fact in this inventory states it.
- **Hand-off:** An entry's date is the one part of its identity that comes from frontmatter rather
  than from its filename. (`f:zce3pt`, `f:46edxb`)

### 7. Entry identity

- **Takes:** An entry's id is its markdown filename without `.md`, and the file sits directly in the
  concept's `dir` at `<dir>/<id>.md`. (`f:46edxb`, `f:8zdux6`)
- **Draws on:** `f:8zdux6` (`dir` is used verbatim and never validated, so it stays repo-relative with
  no leading or trailing slash, matching the concept's content glob; entries never sit in
  subfolders). `f:46edxb` (a dated concept's filename also carries a leading date, and the URL slug
  strips only that prefix). Then the worked example, under the `no-claim` lead-in, as a three-item
  list in one form: the file `src/content/posts/2026-08-14-my-post.md`, the id `2026-08-14-my-post`,
  the slug `my-post`, with the entry's date read from its `date` field. Then `f:zce3pt` whole: the
  filename's date prefix only feeds the slug, and the entry's date always comes from its own `date`
  field, which is why a dated permalink makes `date` structurally required; link
  `docs/extend/define-an-adapter-and-schema.md` for `datePrefix` and the permalink tokens, which this
  page does not list. Then `f:7m8nd4`: ids are lowercase ASCII letters, digits, and single hyphens,
  so `slugify` turns a title in a non-Latin script into an empty address the create action refuses,
  and treats an accented letter as a separator (`résumé` becomes `r-sum`).
- **Hand-off:** The concept's routing decides what the public site does with that slug.
  (`no-claim`)

### 8. Routing

- **Takes:** A concept's `routing` shorthand decides whether its entries get public pages and
  whether they are dated: `'page'`, the default, `'feed'`, or `'embedded'`. (`f:s2zbzm`)
- **Draws on:** A table under the `no-claim` lead-in, one row per shorthand, columns for the
  shorthand, what it turns on or off, and what it suits (`f:s2zbzm` for the switches, `f:6e06p2` for
  the fit): `'page'` is routable and undated and puts each entry in the sitemap, for standalone pages;
  `'feed'` is routable and dated, in feeds, an archive, and the sitemap, for chronological content;
  `'embedded'` is not routable, with no permalink, never listed or prerendered, for a reference-only
  concept such as `authors`. Then `f:vs77a6`: an `'embedded'` concept keeps its directory, its
  fields, and its admin list and editor; the only thing it gives up is a public page. Link the
  `defineConcept` entry in `docs/reference/core.md` for the default permalinks. The reserved
  `fragments` concept is named nowhere in this section; the out-of-scope list routes it.
- **Hand-off:** A routable entry's permalink can match another entry's. (`f:9270mo`)

### 9. Address collisions

- **Takes:** When another published entry already resolves to the same permalink, the edit page
  shows a warn-only `address-collision` advisory, and a publish rechecks and logs the collision
  without blocking. (`f:9270mo`)
- **Draws on:** `f:9270mo` whole: the edit page checks against published entries on `main`; a
  publish rechecks `main` plus every open `cairn/*` branch and, when a collision remains, logs
  `publish.address_collided` after the publish lands; neither check blocks a save or a publish, and
  both fail open, so a check that cannot run lets the save or publish proceed. Link the
  `publish.address_collided` row in `docs/reference/log-events.md` for the record's fields. The page
  gives no reason for the warn-only design, since no fact states one.
- **Hand-off:** An entry's address is one of the routing facts the content manifest keeps for every
  entry. (`f:t5ebsr`)

### 10. The content manifest

- **Takes:** The files in git stay the source of truth for content, and the committed content
  manifest summarizes them, one row per entry, so request-time admin code reads the content graph
  without crawling GitHub entry by entry. (`f:z5boz6`, `f:t5ebsr`)
- **Draws on:** `f:t5ebsr` as a list of what a row records, the Astro take, under the `no-claim`
  lead-in, one item each: the entry's identity; its routing facts; its outbound `cairn:` links, the
  internal links its body makes to other entries; its reference-field edges; its tags; and the
  fragments it includes. Then `f:t5ebsr`'s lifecycle in two sentences: a build regenerates and
  verifies the manifest, and a publish, not a save, patches the changed entry's row in the same
  commit as the content change, so the manifest never drifts from the files by more than one
  uncommitted edit. Then `f:a8ecm0`: a `reference` field holds a typed `{ concept, id }` pointer, and
  the manifest carries both sides of that edge, so a rename or a delete can warn about what still
  points at the entry; link `docs/extend/link-content-with-references.md` for references in use.
  Link "Content and manifest" in `docs/reference/core.md` for the format and verify functions.
- **Hand-off:** Inbound links matter most when an entry changes its id. (`no-claim`)

### 11. Renames

- **Takes:** A rename moves the entry's file to a new id, which changes its slug, and rewrites every
  inbound `cairn:` token in the same atomic commit on `main`. (`f:z4j689`)
- **Draws on:** `f:z4j689` (the rename is refused with a 409 when the new id collides with an
  existing entry or while the entry has pending edits). `f:a8ecm0` cited again for the reference
  side: the manifest's edges are what a rename warns from; the reference guards on rename are
  `docs/extend/link-content-with-references.md`'s and stay there. Then the body's closing sentence,
  the synthesis: every behavior the model covers follows from the concept's one declaration in the
  adapter, its directory and its fieldset (`f:5eum60`, `f:phdgof`).
- **Hand-off:** None. The closing sentence above is the body's last, and the related resources
  follow under their own heading.

## Ending

### 12. Related resources

The concept anatomy's ending, grouped as how-to guides, concepts, and external resources, not more
than five links a group, each group introduced by a complete sentence.

- **How-to guides** (four), lead-in "The following guides put the model to work." (`no-claim`):
  `docs/extend/define-an-adapter-and-schema.md` (writing the declaration),
  `docs/extend/link-content-with-references.md` (reference fields in use),
  `docs/extend/reuse-content-across-entries.md` (fragments),
  `docs/extend/configure-rendering.md` (rendering an entry's body).
- **Concepts** (two), lead-in "The following pages place the content model in the wider system."
  (`no-claim`): `docs/extend/architecture.md` (the content map among the adapter's seams),
  `docs/extend/scaffolded-site-files.md` (where the adapter and the content directories sit on a
  scaffolded site).
- **External resources** (four), lead-in "The following external pages document the platform
  behavior the model builds on." (`no-claim`): TypeScript "Everyday Types", literal types
  (https://www.typescriptlang.org/docs/handbook/2/everyday-types.html); MDN "RegExp"
  (https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp); MDN
  "The Input element" (https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/input);
  YAML "Timestamp Language-Independent Type" (https://yaml.org/type/timestamp.html). The first three
  match the introduction's prior-knowledge sentence; the fourth is the YAML rule behind the
  `datetime` conversion. Each URL resolved on 2026-10-12.

## Dispositions

One row per fact id the plan disposes: 31 are placed, and two (`f:ob28pr`, `f:9l65zg`) are
subordinated to the "Fields" table in `docs/reference/core.md`, after the structural edit found the
planned option table restated that reference on a concept page. Two more (`f:u9rvl3`, `f:8fv57g`)
stay placed for the edge clauses the page needs and subordinate their remaining clauses to the same
table. Every reference page this plan links was opened and read before it was named; where the
reference does not state a subordinated clause, the gap is named under "Could not do".

| Fact | Disposition | Section |
| --- | --- | --- |
| `f:5eum60` | placed | Concepts; cited again in Renames (the closing sentence) |
| `f:q07rd5` | placed | Concepts (the path clause only; the tutorial-hooks clause not stated) |
| `f:phdgof` | placed | The fieldset; cited again in the introduction, Concepts, and Renames |
| `f:2hxm4t` | placed | The fieldset |
| `f:im6x7r` | placed | The fieldset |
| `f:u9rvl3` | placed | Field options (the Takes sentence naming the four base options only; each option's behavior subordinated to the "Fields" section of `docs/reference/core.md`) |
| `f:8fv57g` | placed | Field options (the `pattern` compile clause and the not-rendered sentence only; the length rules and `rows` subordinated to the "Fields" table); cited again in Save-time validation |
| `f:ob28pr` | subordinated | The "Fields" table in `docs/reference/core.md`, `number` row; not stated on the page |
| `f:9l65zg` | subordinated | The "Fields" table and the `fields` entry in `docs/reference/core.md`, `select` and `multiselect` rows; not stated on the page |
| `f:t7cr8o` | placed | Field options (the `min` and `max` item and the not-rendered sentence) |
| `f:7lo8fe` | placed | Field options (the `default` item) |
| `f:7l7y5l` | placed | Field options (the `pattern` item) |
| `f:8b21y6` | placed | Field options (the `creatable` item) |
| `f:8igohk` | placed | Field options (the `min` and `max` item and the paragraph after the list) |
| `f:7ci1fm` | placed | Field options (the paragraph after the list) |
| `f:68fh1k` | placed | Containers; cited again in The fieldset and Save-time validation |
| `f:loqocz` | placed | Containers |
| `f:brs2v9` | placed | Containers |
| `f:t4hh8w` | placed | Containers |
| `f:hdrzxd` | placed | Save-time validation |
| `f:69j91g` | placed | Frontmatter keys the engine reads; cited again in the introduction |
| `f:46edxb` | placed | Entry identity; cited again in the Frontmatter keys hand-off |
| `f:8zdux6` | placed | Entry identity |
| `f:zce3pt` | placed | Entry identity; cited again in Frontmatter keys the engine reads |
| `f:7m8nd4` | placed | Entry identity |
| `f:s2zbzm` | placed | Routing; cited again in Concepts |
| `f:6e06p2` | placed | Routing |
| `f:vs77a6` | placed | Routing; cited again in Concepts |
| `f:9270mo` | placed | Address collisions; cited again in the Routing hand-off |
| `f:z5boz6` | placed | The content manifest |
| `f:t5ebsr` | placed | The content manifest; cited again in Concepts and the Address collisions hand-off |
| `f:a8ecm0` | placed | The content manifest; cited again in Renames |
| `f:z4j689` | placed | Renames |

## Drafting constraints

- **Concept names.** The page says posts and pages are not reserved, and never that a concept may
  take any name: a concept id that names an admin view throws at composition (`f:kd8yk1`, outside
  this inventory), and `fragments` is reserved for the include directive, which the out-of-scope
  list routes. Neither restriction is stated on this page.
- **Filenames outside the id shape.** Entry identity states the shape `slugify` produces and the
  create action enforces. It claims nothing about a hand-written file whose name breaks the shape
  (`f:nhjraz` covers that case and sits outside this inventory).
- **The adapter file.** Every sentence or caption naming the adapter file says which site it means
  (`src/theme/cairn.config.ts` on a scaffolded site, `src/lib/cairn.config.ts` on the tutorial's).
  The page's examples use the scaffolded path.
- **Snippets.** The Concepts example compiles under the snippet gate, or carries its skip comment
  with a reason where it shows a fragment of the adapter, as the reference's illustrative fragments
  do. The Containers failing snippet always carries the skip comment, since it throws by design.
- **Form.** Every list and table takes a complete-sentence lead-in; every list item stays under 26
  words; table cells stay short enough to read without wrapping into paragraphs; no em dash in prose;
  no "not X but Y" frames. The Field options list states edges only; the page has no option table,
  and it never restates a row of the reference's "Fields" table.
- **Names** (register, "Names"): the adapter, the content map, a concept, an entry, the fieldset, the
  content manifest, the edit page, the admin; cairn lowercase; the Hidden toggle by its label.
- **Link discipline.** Each section carries at most two links beyond the ones this plan requires,
  and no link repeats inside one section. Every page this plan names in a code span becomes a
  relative Markdown link on the page, with link text that names the destination. The four
  out-of-scope guides are outlined pages that the link gate accepts as pending until each lands.
- **No-claim sentences.** The hand-offs and lead-ins this plan marks `no-claim` were run through
  `node scripts/checks/check-provenance.mjs --extract` from
  `/var/home/glw907/.cache/docs-page-chain/content-model.no-claim.txt` on 2026-10-12, and the
  extractor found no fact in any of them. A drafter who rewords one keeps it free of code spans,
  numerals, versions, and dates, or cites a fact.

## Could not do, and friction filed

Revision after the structural edit: the subordinated clauses were checked against
`docs/reference/core.md` ("Fields" table, the `fields` entry, the `help` paragraph, `defineFieldset`,
and the Extension API rows for `TextField` through `DatetimeField`). The reference states the
`help` option and the date publish hint, that `select` options are closed, the `multiselect`
control switch and open set, the literal-option type inference, `rows` setting the height,
`number`'s bounds and `integer`, and the malformed-`pattern` throw. It does not state: `required`'s
message, HTML attribute, and non-optional inferred key, or `label` being required on every field
but `object` (`f:u9rvl3`); the trimmed-value counts, the first-failing-rule order, and `rows`
defaulting to 3 (`f:8fv57g`); `number`'s constraints rendering as input attributes and the
non-finite rejection (`f:ob28pr`); and `select`'s leading "none" choice and error text, and
`placeholder`'s default and its absence from the checkbox group (`f:9l65zg`). Those facts stay
subordinated, and the gap is filed under Docs content in `docs/internal/docs-friction-log.md` as
reference-arm friction.

Before the revision, no subordination was attempted. Five design-friction
entries were filed in `docs/internal/docs-friction-log.md`, under Engine, each tagged "found by the
content-model page plan, 2026-10-12": the dated entry's two dates that can disagree (`f:46edxb`,
`f:zce3pt`); the five engine-read frontmatter keys a save drops unless declared (`f:69j91g`); the
unvalidated `dir` (`f:8zdux6`); the ASCII-only ids `slugify` produces (`f:7m8nd4`); and the
unanchored `pattern` that shares a name with the anchored HTML attribute (`f:7l7y5l`). The page
inputs had already filed four entries this page also states: `datetime`'s unenforced `min` and
`max`, the constraints that reach the form unevenly, the multiselect option interaction, and the
stale manifest header comment.
