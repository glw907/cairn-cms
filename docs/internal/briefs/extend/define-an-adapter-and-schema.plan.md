# Page plan: Define an adapter and schema

Page: `docs/extend/define-an-adapter-and-schema.md`. Page type: task guide. Status: new page, no
prior version on disk. Written 2026-10-12 by the plan step of the docs page chain (stage 2b part 1).
The drafter drafts from this plan: it is the source of the page's order, each section's claim, and
each fact's placement. The structural edit seat reads it before any prose exists. The plan is
Google's outline written down (Google Technical Writing Two, "Organizing large documents",
https://developers.google.com/tech-writing/two/large-docs): the outline is the document's
narrative, and information arrives where it is most relevant to the reader.

Inputs read: the outline entry in `docs/internal/outlines/extend.json` (slug
`define-an-adapter-and-schema`: job, covers, out-of-scope list, exemplars); "The page anatomies" in
`docs/internal/docs-register.md`; every fact bullet named below in `docs/internal/facts/extend.md`
and `docs/internal/facts/reference.md`; the two exemplars (`extenders/sanity-custom-tool`,
`extenders/django-custom-management-commands`); the reference entries each link names
(`docs/reference/core.md` `defineAdapter`, `createGithubApp`, `defineConcept`, `supportContact`,
`siteConfigPath`, `fields`, `defineFieldset`, "Field types", `parseSiteConfig`, `readVocabulary`;
`docs/reference/delivery-data.md` `createSiteIndexes`; `docs/reference/vite.md` `cairnManifest` and
`CairnManifestOptions`); the sibling pages `docs/extend/content-model.md` (whole page: it hands
cross-field checks, behavior hooks, date-prefix granularity, and the permalink tokens to this page),
`docs/extend/add-cairn-to-a-sveltekit-app.md` ("Write the site config and a minimal adapter",
"Index the content and commit its manifest", "Resolve a content build failure", "Register the GitHub
App", "Store the App's credentials", "Add the Email Sending binding and name the origin"), and
`docs/extend/debug-your-site.md` ("Content field events"); and the code the facts cite
(`templates/waymark/src/theme/cairn.config.ts`, `templates/waymark/src/chassis/content.ts`,
`templates/waymark/vite.config.ts:51-59`, `templates/waymark/package.json`,
`src/lib/content/fieldset.ts:428-486`, `src/lib/content/compose.ts:42-78`).

Headings in this plan's section list are the page's headings, verbatim. A claim inventory `section`
names one of them. The introduction is the untitled text under the H1 and is named `Introduction`.

## What the page argues

A site tells the engine everything about itself through one module, the adapter, and the page's
spine is that module filled in from the outside in: find the file and its four required groups,
close out the two small required groups that hold no content (backend and sender), as a
conditional section a reader skips until the site has a GitHub App and an email sender, then spend
the rest of the page on the one group that does, `content`, building a single concept from declaration
to address to tags to checks to what a save writes. The page closes on the one file outside the
adapter that a reader might mistake for a second home, and then on the two commands that confirm
the whole declaration.

The page serves two readers with one spine: the developer on a scaffolded site, whose adapter is
`src/theme/cairn.config.ts`, and the developer on the add-cairn tutorial's site, whose adapter is
`src/lib/cairn.config.ts` (`f:q07rd5`). The steps are the scaffold's, the job's stated starting
point, and each step section ends with the tutorial site's one-line difference where one exists:
the content module's path and the site-config path.

### The order, argued

Each section holds what the next one depends on.

1. **The introduction** frames the adapter from above: one object the engine reads a site from,
   with concepts as its content keys, so "write the call, add a concept, register its glob" reads
   as one job rather than three chores.
2. **Before you begin** (cover 1) names the two preconditions with their links, and a third,
   conditional one for the backend and sender section only.
3. **Start from the adapter file** merges covers 2 and 3. The Sanity take lands here: the four
   required groups are named in prose before any code, so the reader meets the scaffold's call
   knowing what to look for. The Django take lands here too: the file tree places the adapter
   beside the two other files a concept touches, before the working file. The narrowed return type
   (cover 2's last clause) closes the section, since it explains why the reader never casts a read
   in the sections that follow.
4. **Set the backend identity and the email sender** (cover 7) moves up from seventh place. It
   completes the required groups the previous section named (the third, `rendering`, belongs to
   write-a-markdown-component), and it is short and content-free, so placing it here lets the concept work
   that follows run without interruption from declaration through options. In the outline's place,
   it would split the field-check sections from the tag section for no dependency. Its values need a
   registered GitHub App and Email Sending onboarding, which a reader who came to add a concept may
   not have yet, so the section is conditional on its own reader: its first sentence states the
   condition first, the hand-off into it offers the skip, and "Before you begin" lists its
   preconditions as a conditional item. A reader without them goes straight to "Add a concept" and
   misses nothing a later section depends on.
5. **Add a concept** (cover 4) opens the content work. It precedes every other concept section
   because each of them edits the declaration this section creates. The three-place wiring and the
   silent-omission trap sit on the steps they govern.
6. **Set the permalink and date prefix** (cover 5) follows because it is the first variant of the
   running example (the Django take: a dated permalink off one example), and because a date token
   requires a `date` field the reader just declared.
7. **Mark the tag field** (cover 6) follows the address, as the outline orders it. It introduces the
   site-config file (the vocabulary's home), which the "Keep adapter settings out of
   site.config.yaml" section returns to, and it carries the outline's cross-link to
   build-the-public-routes for listing entries by tag.
8. **Add field checks** (cover 8) follows the fields, tags included, because a check reads them.
9. **Normalized frontmatter** (cover 9) follows the checks because it describes what a save that
   passes every check writes, and what the site's code then reads. It is the page's first
   explanation section; its first sentence ties it to a task (reading an optional key).
10. **Set the concept and editor options** (cover 10) follows "Normalized frontmatter" directly,
    because `summaryFields` copies keys from the validated frontmatter that section just described.
11. **Keep adapter settings out of site.config.yaml** (cover 11) follows the options because the last
    option the reader set, `editor.supportContact`, belongs to a group the site config refuses. It
    precedes Verify because a refused key fails the same build the verification runs.
12. **Verify the declaration** (cover 12), the anatomy's item 4.
13. **Diagnose a failed check**, the anatomy's item 5. The extend recovery surface has rows only for
    `content.field_unmarked` and `content.field_behavior_failed`, so the page links those rows and
    the tutorial's "Resolve a content build failure", and keeps the other causes itself (friction
    filed).
14. **See also**, the anatomy's item 6.

### Departures from the outline's covers order, with the reason for each

- Covers 2 and 3 merge into "Start from the adapter file": the scaffold's call is the worked example
  of the `defineAdapter` call, and two sections would show the same object twice.
- Cover 7 moves from seventh to second among the body sections (item 4), as a conditional section,
  for the reason item 4 gives.
- The outline's cover 6 wording on the vocabulary's storage (`editor.nav.configPath`, else
  `src/lib/site.config.yaml`) is retired and is not stated; the section states `editor.siteConfigPath`
  and its `src/theme/site.config.yaml` default (`f:shv6wv`).
- Cover 12 splits into the verification section and the failure-path section, the anatomy's items 4
  and 5 (items 12 and 13).

### Exemplar takes, and where each lands

- **Sanity, Create a custom Studio tool.** The required members are named in prose before the code
  ("Start from the adapter file", the four groups; "Add a concept", `dir` and `fields`), and a code
  comment maps a member to where it surfaces (in the "Add a concept" step 1 code: `dir` to the
  directory, `label` to the sidebar, `singular` to the create button). Left behind: the `@sanity/ui`
  specifics and the plugin-sharing tail.
- **Django, custom management commands.** The file-location tree comes before the full working file
  ("Start from the adapter file"), then variants off one running example: the `events` concept that
  "Add a concept" declares is varied with a dated permalink ("Set the permalink and date prefix"), a
  tag field, a cross-field check, and a summary field. Left behind: the appended class reference,
  which stays on `docs/reference/core.md`.

### The running example

One `events` concept added to the scaffold's adapter, carried through every concept section: `dir:
'src/content/events'`, `label: 'Events'`, `singular: 'event'`, fields `title` (required), `date`
(a `date` field), and `location` (`text`). It starts with `routing: 'page'` in "Add a concept" and
becomes `routing: 'feed'` with `permalink: '/events/:year/:slug'` and `datePrefix: 'year'` in "Set
the permalink and date prefix". Each later section adds one variant and nothing before it declares
that variant: "Mark the tag field" adds the `tags` field, "Add field checks" adds the `endDate`
field and the `refine` check that reads it, and "Set the concept and editor options" adds
`summaryFields`. The initial declaration holds no `endDate`, so the reader adds it once, in "Add
field checks" step 1. `content-model.md` declares an `events` concept on the same site, so the
reader meets a familiar name. Every name in the example goes in the brief's `local` array.

### Heading policy

Task headings start with a bare infinitive. "Before you begin" and "See also" are the anatomy's fixed
headings. "Normalized frontmatter" is the one explanation section and takes a noun phrase. "Keep
adapter settings out of site.config.yaml" is an explanation section with a task heading, because its
use is an action the reader takes (keep a key in the right file); write `site.config.yaml` in the
heading as code. `docs/extend/content-model.md` and `docs/extend/add-cairn-to-a-sveltekit-app.md:339`
link the page itself, with no anchor, so every heading is free.

## The introduction, in Google's three parts

No heading. It opens on a statement, never an imperative, and frames the page from above before the
contract (register, "The introduction"). Two or three paragraphs. The intro-framing step reasons the
final wording. Content items, in order:

1. **What the document covers, framed from above.** A site's adapter is the one object the engine
   reads the site from: the `defineAdapter` call in the site's `cairn.config.ts` declares its
   content, the GitHub repository commits land on, the sign-in email's sender, and its renderer
   (`f:2zytgf`, scoped to that clause). A concept is one key of the adapter's `content` map
   (`f:5eum60`, scoped), and the build reads its markdown only through globs the site registers in
   two other files (`f:n5d65u`, scoped). The contract sentence, inside the framing: this guide walks
   through writing the `defineAdapter` call, adding a concept with its fields, address, and tag
   field, adding checks and options of your own, and confirming that the declaration typechecks and builds.
2. **When, why, and for whom.** The reader adds a kind of content, changes a concept's fields or
   address, or fills in the production backend and sender. The reader is a Svelte-fluent developer
   with the engine installed, on either a scaffolded site or a site built by hand with the add-cairn
   tutorial. Name the two kinds of site without their adapter paths; "Start from the adapter file"
   owns the paths (`f:q07rd5`).
3. **Prior knowledge.** TypeScript literal types, Vite's `import.meta.glob`, and YAML, and the
   content model. This is the intro's one link to `docs/extend/content-model.md`, and it does two
   jobs: prior knowledge, and the wrong-place route for a reader who wants to know what a concept,
   routing, or an entry's identity is.
4. **What the page does not cover, with the page that does.** What routing and identity mean (name
   content-model as their home, with no second link; item 3 carries it). Reference fields:
   `docs/extend/link-content-with-references.md`.
   The `rendering` group: `docs/extend/write-a-markdown-component.md`. Roles and the access map:
   `docs/extend/restrict-admin-access.md`. `navLayout`: `docs/extend/arrange-the-admin-sidebar.md`.
   The `media` group: `docs/extend/configure-media.md`. Link the pages not yet on disk
   (`link-content-with-references`, `write-a-markdown-component`) the way `docs/extend/content-model.md`
   already does.

## Sections, in order

Each entry carries the page heading; **First sentence**, the one sentence a reader takes from the
section, which is the section's first sentence on the page (its claim is fixed here, its wording may
move to the register's voice, and a task-section sentence stays under 26 words); **Facts**, the ids
it draws on ("cited again" marks a fact whose primary home is another section); the content and
steps; and **Hand-off**, quoted where the plan fixes its wording. Each quoted hand-off and lead-in
passed the provenance extractor with no row.

### Before you begin

**First sentence:** Declaring an adapter takes a site with the engine installed and a working
knowledge of the content model.

**Facts:** none for the first two items; they are links. Cited again: `f:z7lprs` (the third item's
Email Sending onboarding).

A bulleted list, each item with a link to what produces it (anatomy item 2):

- The engine installed and wired: link `docs/extend/add-cairn-to-a-sveltekit-app.md` for a site built
  by hand. A scaffolded site has it already; link `docs/extend/scaffolded-site-files.md` for where
  the scaffold's files sit.
- The content model: link `docs/extend/content-model.md`.
- A conditional item, condition first, for "Set the backend identity and the email sender" only: to
  set the production backend and sender, a registered GitHub App (link the tutorial's
  `#register-the-github-app`) and Cloudflare Email Sending onboarded for the sender's domain
  (`f:z7lprs`; link the tutorial's `#add-the-email-sending-binding-and-name-the-origin`).

**Hand-off (no-claim):** "With the engine installed, open the adapter file."

### Start from the adapter file

**First sentence:** A site's adapter file holds one `defineAdapter` call, which must declare
`content`, `backend`, `email`, and `rendering` and may add five optional groups.

**Facts:** `f:hkh101`, `f:2zytgf`, `f:u4cfvv`, `f:68w9k9`, `f:q07rd5` (scoped: the two paths and
import specifiers). Cited again: `f:n5d65u` (scoped: the content module and `vite.config.ts` as the
other two files a concept touches).

Content:

- The four required groups in prose before any code (Sanity take), one clause each (`f:2zytgf`):
  `content`, the concepts keyed by id; `backend`, the provider for the repository commits land on,
  which `createGithubApp` builds; `email`, the magic-link sender; `rendering`, the `render` function
  plus optional `islands`. Then the five optional groups, each routed in one clause: `media`
  (configure-media), `roles` and `access` (restrict-admin-access), `aiPosture`
  (`docs/extend/choose-an-ai-posture.md`), and `editor` ("Set the concept and editor options" for
  `supportContact`; arrange-the-admin-sidebar for `navLayout`). `rendering`'s contents go to
  write-a-markdown-component; say no more about it.
- The file tree (Django take), scaffold first: `src/theme/cairn.config.ts`, `src/chassis/content.ts`,
  and `vite.config.ts` (`f:n5d65u`). One sentence for the tutorial site: its adapter is
  `src/lib/cairn.config.ts` and its content module `src/lib/content.ts`, beside the same
  `vite.config.ts` (`f:q07rd5`; the content module's path is the tutorial's, from its "Index the
  content and commit its manifest" step, so cite no fact for it and list it as `local`).
- The import specifiers go in a fenced block, never inline prose (check-symbols reads an inline
  specifier as a file path, `ROADMAP.md:1027-1029`): `#theme/cairn.config.js` on the scaffold,
  `#lib/cairn.config.js` on the tutorial's site (`f:q07rd5`).
- The scaffold's call, abridged (`f:u4cfvv`): `content` with `posts`, `pages`, and `fragments`
  (fieldsets elided with a comment), `backend: createGithubApp({ ... })`, `email: { from }`, and
  `rendering.render`. First-line comment names `src/theme/cairn.config.ts`. Show no `media` or
  `editor` members; an elision comment covers them.
- The closing sentence: `defineAdapter` narrows its return type to the site's own concepts and
  fields, so a read through the adapter carries the declared field types with no cast (`f:68w9k9`).

**Hand-off (no-claim):** "If the site has a GitHub App and an email sender, fill in the backend and
the sender next; otherwise, skip to adding a concept."

### Set the backend identity and the email sender

**First sentence:** If the site publishes through a GitHub App and sends sign-in email, set the
`backend` and `email` groups, neither of which holds a secret.

The condition comes first because the section is conditional on its own reader (argued-order item
4). The section claims nothing about what the scaffold's placeholder values build to: no fact states
it.

**Facts:** `f:twcsgm`, `f:z7lprs`. Cited again: `f:2zytgf`, `f:u4cfvv` (the scaffold's placeholder
values).

Content:

- A numbered list of two steps, location first, lead-in "To set the backend and the sender, follow
  these steps:" (no-claim):
  1. In the adapter file, set the five strings `createGithubApp` takes, `owner`, `repo`, `branch`,
     `appId`, and `installationId`, to the GitHub App's values. Link the tutorial's
     `#register-the-github-app` for where the values come from, and `docs/reference/core.md#creategithubapp`.
  2. In the adapter file, set `email.from` to the sender address, and `replyTo` if replies go
     elsewhere (`f:z7lprs`).
- One sentence on the secret: `owner`, `repo`, `appId`, and `installationId` are non-secret identity,
  and the private key stays out of the adapter as the Worker secret `GITHUB_APP_PRIVATE_KEY_B64`,
  read at request time (`f:twcsgm`). Link the tutorial's `#store-the-apps-credentials` and
  `docs/extend/rotate-the-github-app-key.md`.
- One sentence on the sender: a send needs Cloudflare Email Sending onboarded for the sender's domain
  (`f:z7lprs`). Link the tutorial's `#add-the-email-sending-binding-and-name-the-origin`.

**Hand-off (no-claim):** "Next, add a concept to the content map."

### Add a concept

**First sentence:** A concept is a `defineConcept` call in the adapter's `content` map, plus its
content glob registered in two more files.

**Facts:** `f:5eum60`, `f:d27z58`, `f:gwmmkx`, `f:r03vis`, `f:n5d65u`, `f:n07oiu`, `f:4mz4tp`,
`f:fj28xs`, `f:7az6m2`, `f:n0laoh` (added, scoped: a drifted manifest fails the build), `f:fdtgh5`
(added: the error names `npx cairn-manifest`), `f:fh6kod` (added, scoped: the bin reuses the plugin's
options).

Content:

- One sentence naming the two required members before the code (Sanity take): only `dir`, the
  repo-relative content directory, and `fields`, the concept's `defineFieldset` fieldset, are
  required; every other member has a default (`f:d27z58`).
- A table, columns Member, Default, Where it surfaces, one row each: `dir` (required; the directory
  of markdown files), `fields` (required; the form, the save's checks, and the entry type),
  `label` (the id with its first letter capitalized; the sidebar and the create button), `singular`
  (`label`; the create button), `routing` (`'page'`; link content-model's "Routing" for what each
  shorthand means), `permalink` and `datePrefix` (name the next section), `summaryFields` (an empty
  list; name "Set the concept and editor options") (`f:d27z58`, `f:gwmmkx`).
- The rule where it bites, one sentence: an omitted `singular` falls back to the plural `label`, so
  the create button reads "New Events"; set `singular` (`f:gwmmkx`).
- One sentence on names: the concept set is the site's own and `posts` and `pages` are not reserved,
  but two conveniences key on those literal ids, the default permalink and the onboarding checklist,
  and stop applying to a renamed concept (`f:r03vis`).
- A numbered list, lead-in "To add a concept, follow these steps:" (no-claim). Location first, one
  action each:
  1. In `src/theme/cairn.config.ts`, add `events: defineConcept({ ... })` to the `content` map
     (`f:n5d65u`'s `fragments` declaration is the shape). The code carries the Sanity take's member
     comments: `dir` to the directory, `label` to the sidebar, `singular` to the create button.
  2. In `src/chassis/content.ts`, glob the concept's files with `import.meta.glob('/src/content/events/*.md',
     { query: '?raw', import: 'default', eager: true })` and pass it to `createSiteIndexes` as `events`
     (`f:n5d65u`, `f:n07oiu`). The rule after the step: a lazy glob, or one without `?raw` and
     `import: 'default'`, makes the build throw `expected input to be a string or buffer`
     (`f:n07oiu`), and a declared concept with no glob makes `createSiteIndexes` throw at build,
     since Vite needs each literal glob at its call site (`f:4mz4tp`).
  3. In `vite.config.ts`, add `events: '/src/content/events/*.md'` to the `cairnManifest` plugin's
     `content` option, which maps each concept id to its glob (`f:n5d65u`, `f:fj28xs`).
  4. If the concept's directory already holds entries, in a terminal, run `npx cairn-manifest` and
     commit `src/content/.cairn/index.json` (`f:fdtgh5`, `f:fh6kod`). The rule after the step: a
     committed manifest that has drifted from the markdown fails the build (`f:n0laoh`, scoped to
     clause 1).
- A Caution notice directly under step 3: a concept missing from the plugin's `content` option gets
  no manifest rows, with no error and no build warning (`f:7az6m2`). Name "Verify the declaration"
  step 3 as the check that catches it.
- One sentence for the tutorial's site: steps 1 and 2 edit `src/lib/cairn.config.ts` and
  `src/lib/content.ts` (`f:q07rd5`; the content module is `local`).

**Hand-off (no-claim):** "With the concept declared, decide its public address."

### Set the permalink and date prefix

**First sentence:** An omitted `permalink` gives a concept's entries the address `/<id>/:slug`, or
`/:slug` for the `pages` concept, and `datePrefix` sets the filename's date separately.

**Facts:** `f:g39nkp`, `f:7ak73t`, `f:2i6u6o`, `f:cg1eo5`, `f:lkgubp`. Cited again: `f:d27z58` (the
`'day'` default).

Content:

- The token rules, as a bulleted list (`f:7ak73t`, `f:2i6u6o`):
  - A permalink starts with `/` and uses only `:slug`, `:year`, `:month`, and `:day`.
  - A date token needs `routing: 'feed'`; `:month` and `:day` render zero-padded.
  - A date token needs a field named `date` of type `date`, which the engine makes required.
- One sentence on `datePrefix`: `'year'`, `'month'`, or `'day'` (default `'day'`) sets how much of the
  date a filename starts with, independent of the permalink (`f:cg1eo5`, `f:d27z58`). Link
  content-model's "Entry identity" for how the prefix becomes the slug; do not restate it.
- A numbered list of two steps, the Django variant, lead-in "To give the concept a dated address,
  follow these steps:" (no-claim):
  1. In the `events` declaration, set `routing: 'feed'` and `permalink: '/events/:year/:slug'`.
  2. In the same declaration, set `datePrefix: 'year'`.
- The rule after the steps, one sentence: `defineConcept` validates `permalink`, `datePrefix`, and
  `routing` when the adapter module loads, so a mistake throws before any save (`f:lkgubp`). Do not
  quote the error's concept name (friction filed by the page inputs: it names the concept by `label`
  or `dir`, not always by key).

**Hand-off (no-claim):** "Next, mark the field that holds the concept's tags."

### Mark the tag field

**First sentence:** A concept's tags come from the one top-level `multiselect` it marks `taxonomy:
true`, and a second marker throws at declaration.

**Facts:** `f:sz71ur`, `f:g9q627`, `f:lbeeak`, `f:2p519o`, `f:grvcbv`, `f:shv6wv`. Cited again:
`f:u4cfvv` (the scaffold's `topics` field is the shape).

Content:

- One step, a single bulleted item: in the `events` fieldset, add `tags: fields.multiselect({ label:
  'Tags', creatable: true, taxonomy: true })`, the shape of the scaffold's `topics` field
  (`f:u4cfvv`).
- One sentence on the marker: the content index reads the marked field's values as each entry's
  `ContentSummary.tags`, with no fallback to a field named `tags` (`f:g9q627`); a marker inside an
  `object` or `array` throws too (`f:sz71ur`). Directly after it, the rule's other half: a
  multiselect named `tags`, `freetags`, or `categories` with nothing marked logs `content.field_unmarked` as a warning (`f:lbeeak`). Link
  `docs/extend/debug-your-site.md#contentfield_unmarked`.
- Two or three sentences on the vocabulary, framed as what the editor's Tags screen does to the
  field: a vocabulary entry is a `value`, a lowercase hyphenated slug stored in frontmatter, and a
  display `label` (`f:grvcbv`, `f:2p519o`). Once the vocabulary is non-empty, a save may add only
  vocabulary values to the marked field, and an entry's existing tags outside it are kept as orphans
  (`f:2p519o`, `f:grvcbv`); with no vocabulary, the field stays the open multiselect it was declared
  as (`f:grvcbv`).
- After the vocabulary sentences, one linking sentence (no-claim), the outline's cross-link for
  listing entries by tag: "To list a concept's entries by tag on public pages, see Build the public
  routes." Link `docs/extend/build-the-public-routes.md`, which is not on disk yet, the way
  `docs/extend/content-model.md` links its not-yet-written pages: a plain relative link to the
  slug's file.
- One sentence on where it is stored: the vocabulary lives under `vocabulary` in the site-config file
  that `editor.siteConfigPath` names, `src/theme/site.config.yaml` by default, which the Tags,
  Settings, and nav editor screens read and commit (`f:shv6wv`).
- One conditional step, condition first, a single bulleted item: on the add-cairn tutorial's site,
  in `src/lib/cairn.config.ts`, set `editor.siteConfigPath` to the tutorial's site-config path,
  `src/lib/site.config.yaml` (`f:shv6wv`; the path is the tutorial's, from its "Write the site config
  and a minimal adapter" step: cite no fact, list it as `local`). Link
  `docs/reference/core.md#siteconfigpath-adapter-editor-member`.
- Never state `editor.nav.configPath` or a `src/lib` default (retired; see Dispositions).

**Hand-off (no-claim):** "Next, add checks of your own to the fieldset."

### Add field checks

**First sentence:** A fieldset's `behavior` table checks one field after its own rules pass, and its
`refine` function checks the whole entry after every field passes.

**Facts:** `f:93iwom`, `f:ar5p72`, `f:aj5c4z`, `f:dccnyu`.

Content:

- Two sentences on when each runs (`f:93iwom`): `behavior[field].validate(value, siblings)` runs only
  for a field that passed its own checks, gets the coerced value and the raw frontmatter, and
  returns an error string or `null`; a behavior key naming an undeclared field throws at declaration.
  `refine(data, body)` runs synchronously, only when no field or behavior check failed, and returns
  a field-keyed error map, or nothing, that fails the save.
- The page's key rule here, as a Caution notice: the two fail in opposite directions when they throw.
  A throwing `behavior.validate` is logged as `content.field_behavior_failed` and the field is
  treated as valid (`f:dccnyu`, `f:93iwom`); a throwing `refine` is not caught, so it fails the save
  with a server error and aborts the build's content index (`f:ar5p72`). Friction filed.
- One sentence on the message: a failed save shows one banner with only the first error message, so
  a `refine` message must read as a standalone sentence, such as "The end date can't be before the
  start date." (`f:aj5c4z`). Content-model's "Save-time validation" states the banner itself; this
  page states only the consequence for the wording.
- A numbered list of two steps, lead-in "To add a cross-field check, follow these steps:" (no-claim).
  Step 1 is the first place the running example declares `endDate`; no earlier section or code
  block shows it:
  1. In the `events` fieldset, add `endDate: fields.date({ label: 'End date' })`.
  2. In the same `defineFieldset` call, pass a second argument whose `refine` returns `{ endDate:
     '<message>' }` when `endDate` is earlier than `date`, and nothing otherwise (`f:93iwom`).
- Link `docs/reference/core.md#definefieldset` and `docs/reference/core.md#field-types`.

**Hand-off (no-claim):** "Next, read what a passing save writes."

### Normalized frontmatter

**First sentence:** Code that reads an entry sees normalized frontmatter, so test an optional key for
absence, never for an empty string or `false`.

The first sentence ties the explanation to a task (reading an optional key), per the anatomy's
lead-in rule.

**Facts:** `f:apoa3k`.

Content, two or three sentences, no steps:

- The validator trims strings and omits empty optional fields, unchecked booleans (never written as
  `false`), and empty arrays and objects (`f:apoa3k`).
- `InferFieldset` types every field not declared `required: true` as optional, so the type matches
  what the file holds (`f:apoa3k`).
- Claim nothing about what `refine`'s `data` argument holds: no fact states it.

**Hand-off (no-claim):** "Next, set the remaining options."

### Set the concept and editor options

**First sentence:** Three more options shape what the site and the admin show: `summaryFields` on a
concept, `itemLabel` on an array field, and `supportContact` on the editor.

**Facts:** `f:9ro4u5`, `f:97c6g1`, `f:fe46lo`, `f:adsn4l`.

A bulleted list, one item per option, each item a single step with its location first and its rule
after:

- In the `events` declaration, set `summaryFields: ['location']`. The rule: the content index copies
  each named key, from the validated frontmatter, onto each entry's `ContentSummary.fields`, a key
  the fieldset does not declare throws at composition, and an omitted `summaryFields` leaves `fields`
  empty (`f:9ro4u5`).
- On an `array` field whose item is an `object`, set `itemLabel` to the key of the sub-field that
  summarizes a collapsed row, such as `'question'` in the scaffold's FAQ field (`f:97c6g1`,
  `f:fe46lo`). The rule: an empty value falls back to the field's label plus the row number, and an
  array of leaf items summarizes each row by its own value and ignores `itemLabel` (`f:97c6g1`).
  One clause: pass a sub-field key, not a display string, whatever the type's hover text says
  (`f:fe46lo`; friction filed by the page inputs).
- In the adapter's `editor` group, set `supportContact` to the contact the in-admin Help points a
  stuck editor to. The rule: an explicit empty string passes through, and the Help home then shows no
  hand-off (`f:adsn4l`). Link `docs/reference/core.md#supportcontact-adapter-editor-member` for the
  default when the member is unset (opened and confirmed: it states the `https://cairn.pub/help`
  default); state no default on the page.

**Hand-off (no-claim):** "Before you build, check what the site config accepts."

### Keep adapter settings out of `site.config.yaml`

**First sentence:** `parseSiteConfig` rejects an adapter group key in the site config, so `backend`,
`email`, `rendering`, `media`, `editor`, and `content` stay in the adapter.

**Facts:** `f:9sba8e`, `f:em69ru` (scoped: the accepted keys and the required `siteName`),
`f:a81e6y`. Cited again: `f:shv6wv` (the file's default path).

Content, three or four sentences, no steps:

- What the rejection says: each adapter group key's message names `cairn.config.ts` as its home, and
  `content`'s message says to move `permalink` and `datePrefix` into `defineConcept` (`f:9sba8e`).
- What the file accepts: a mapping with a non-empty `siteName`, and only the top-level keys
  `siteName`, `description`, `author`, `locale`, `menus`, `spellcheck`, `tidy`, and `vocabulary`; any
  other key is rejected with the known keys listed (`f:em69ru`, `f:9sba8e`). Do not use the doctor's
  four-path list from `f:em69ru`.
- The spellcheck key: US English is the only dictionary the engine ships, so `spellcheck.dialect` set
  to anything else, or unset, resolves to it with no warning (`f:a81e6y`). Friction filed.
- Link `docs/reference/core.md#parsesiteconfig`.

**Hand-off (no-claim):** "With the declaration written, confirm that it typechecks and builds."

### Verify the declaration

**First sentence:** `npm run check` typechecks the declared fields, and `npm run build` runs the
content index and the manifest checks against them.

**Facts:** `f:a98mnn`, `f:7e1t0j` (added, scoped: the tutorial's `sv create` project carries a
`check` script). Cited again: `f:4mz4tp`, `f:n0laoh`, `f:7az6m2`, `f:fj28xs` (the manifest's default
path), `f:gwmmkx` (the sidebar label and the create button).

A numbered list, one check to a step, the location first, lead-in "To verify the declaration, follow
these steps:" (no-claim):

1. In a terminal at the site's root, run `npm run check`, which runs `svelte-kit sync` and
   `svelte-check`, and confirm that it reports no errors (`f:a98mnn`, `f:7e1t0j`).
2. In the same terminal, run `npm run build` and confirm that it completes (`f:a98mnn`, `f:4mz4tp`,
   `f:n0laoh`).
3. If the concept has entries, in `src/content/.cairn/index.json`, confirm that a row names one of
   them (`f:fj28xs`, `f:7az6m2`). This is the check the "Add a concept" Caution names.
4. In the admin under `npm run dev`, confirm that the sidebar lists **Events** and the create button
   reads **New event** (`f:gwmmkx`).

**Hand-off (no-claim):** "If a check fails, the next section traces it to its cause."

### Diagnose a failed check

**First sentence:** Each failure points at one piece of the declaration: a field's type, a glob, the
URL policy, the manifest, or the tag marker.

**Facts:** `f:n07oiu`, `f:4mz4tp`, `f:lkgubp`, `f:n0laoh`, `f:fdtgh5`, `f:7az6m2`, `f:lbeeak`,
`f:dccnyu`. All cited again.

After the first sentence, the lead-in "Work through the following causes in order:" (no-claim) sits
directly before the list. A numbered list of ordered checks (anatomy item 5), in the order of the "Verify the declaration"
steps that reach them. Each item names what the reader sees, then the cause, then the fix or the
link:

1. `npm run check` reports a type error where the site reads a field: the code reads a key the
   fieldset types differently, or reads an optional key as always present. Name "Normalized
   frontmatter" by heading. (No new fact; cite `f:apoa3k` only if the drafter keeps the optional-key
   clause.)
2. The build throws `expected input to be a string or buffer`: the concept's glob is lazy or lacks
   `?raw` and `import: 'default'` (`f:n07oiu`). Name "Add a concept" step 2.
3. The build throws for a declared concept with no glob: the content module does not pass it to
   `createSiteIndexes` (`f:4mz4tp`). Name "Add a concept" step 2.
4. The build throws from `defineConcept` when the adapter loads: the permalink, date prefix, or
   routing breaks a rule (`f:lkgubp`). Name "Set the permalink and date prefix".
5. The build fails on a drifted manifest: run `npx cairn-manifest` and commit the result (`f:n0laoh`,
   `f:fdtgh5`). Link the tutorial's `#resolve-a-content-build-failure`.
6. `index.json` has no row for the new concept's entries: the concept is missing from the plugin's
   `content` option (`f:7az6m2`). Name "Add a concept" step 3.
7. The tag index reads empty and the Worker logs `content.field_unmarked`: link
   `docs/extend/debug-your-site.md#contentfield_unmarked` and do not restate its fix (`f:lbeeak`).
8. A save commits a value a behavior check should have refused, and the Worker logs
   `content.field_behavior_failed`: link `docs/extend/debug-your-site.md#contentfield_behavior_failed`
   (`f:dccnyu`).

This keeps causes 2 to 6 on the page as a recorded departure from anatomy item 5 (friction entry 3
below). When that entry adds wiring rows to `docs/extend/debug-your-site.md`, items 2 to 6 become
links to those rows.

**Hand-off:** none; "See also" follows.

## Ending

### See also

The anatomy's item 6: related how-to guides, concept pages, and the reference entries the page
subordinates, with the recovery links (`docs/extend/debug-your-site.md`, the tutorial's "Resolve a
content build failure") not repeated. One introducing sentence, "The following pages cover the pieces
this page links to:" (no-claim), then a bulleted list, each item's link text naming its destination:

- `docs/reference/core.md#defineadapter` and `docs/reference/core.md#defineconcept`, the adapter's and a
  concept's members.
- `docs/reference/core.md#fields-1` and `docs/reference/core.md#definefieldset`, the field builders and
  the fieldset's options.
- `docs/reference/delivery-data.md#createsiteindexes` and `docs/reference/vite.md#cairnmanifestoptions`,
  the two glob registrations.
- `docs/extend/content-model.md`, what a concept, routing, and an entry's identity are.
- `docs/extend/build-the-public-routes.md`, listing a concept's entries and tags on public pages
  (the next step after declaring a concept; not on disk yet, linked as content-model links its
  unwritten pages).
- `docs/extend/link-content-with-references.md`, reference fields.
- `docs/extend/write-a-markdown-component.md`, the `rendering` group (not on disk yet; linked the same way).
- `docs/extend/configure-media.md`, the `media` group.
- `docs/extend/restrict-admin-access.md`, roles and the access map.
- `docs/extend/arrange-the-admin-sidebar.md`, the `editor` group's `navLayout`.

See also carries every cross-link the outline draws from this page: `write-a-markdown-component`,
`restrict-admin-access`, `arrange-the-admin-sidebar`, and `build-the-public-routes`.

## Dispositions, every fact id

`carried` names the section that holds the fact's primary placement. The 40 fact ids this plan was
handed are all carried, some scoped; the plan adds four container facts, each scoped and named where
it lands. The outline's `editor.nav.configPath` wording is cut, as the page inputs disposed it. No
fact is subordinated, so no reference entry was needed to state one; the links above are
navigation, not subordination.

| Fact | Disposition | Section, or reference and reason |
| --- | --- | --- |
| f:r03vis | carried | Add a concept (names not reserved; two conveniences key on `posts`/`pages`) |
| f:4mz4tp | carried | Add a concept (step 2 rule); cited again in Verify the declaration and Diagnose a failed check |
| f:7az6m2 | carried | Add a concept (Caution under step 3); cited again in Verify the declaration and Diagnose a failed check |
| f:a98mnn | carried | Verify the declaration |
| f:hkh101 | carried | Start from the adapter file (four required, five optional) |
| f:gwmmkx | carried | Add a concept (`dir`, `label`, `singular` and "New Events"); cited again in Verify the declaration |
| f:lkgubp | carried | Set the permalink and date prefix (declaration-time validation); cited again in Diagnose a failed check |
| f:2i6u6o | carried | Set the permalink and date prefix (date token needs a required `date` field) |
| f:cg1eo5 | carried | Set the permalink and date prefix (`datePrefix` independent of the permalink) |
| f:twcsgm | carried | Set the backend identity and the email sender (non-secret identity, the Worker secret) |
| f:68w9k9 | carried | Start from the adapter file (narrowed return type) |
| f:g39nkp | carried | Set the permalink and date prefix (default permalinks) |
| f:sz71ur | carried | Mark the tag field (one top-level marker) |
| f:z7lprs | carried | Set the backend identity and the email sender (`from`, `replyTo`, Email Sending); cited again in Before you begin (the conditional precondition) |
| f:u4cfvv | carried | Start from the adapter file (the scaffold's call); cited again in Set the backend identity and the email sender and Mark the tag field |
| f:2zytgf | carried | Start from the adapter file (what each group holds); scoped in Introduction |
| f:93iwom | carried | Add field checks (when each hook runs, the undeclared-key throw) |
| f:97c6g1 | carried | Set the concept and editor options (`itemLabel` behavior) |
| f:9ro4u5 | carried | Set the concept and editor options (`summaryFields`) |
| f:9sba8e | carried | Keep adapter settings out of `site.config.yaml` |
| f:a81e6y | carried | Keep adapter settings out of `site.config.yaml` (en-US only) |
| f:adsn4l | carried | Set the concept and editor options (`supportContact` empty string) |
| f:aj5c4z | carried | Add field checks (one banner, standalone `refine` message) |
| f:apoa3k | carried | Normalized frontmatter; cited again in Diagnose a failed check (optional clause) |
| f:ar5p72 | carried | Add field checks (uncaught `refine` throw) |
| f:dccnyu | carried | Add field checks (fail-open behavior throw, with `f:93iwom`); cited again in Diagnose a failed check |
| f:7ak73t | carried | Set the permalink and date prefix (token rules) |
| f:2p519o | carried | Mark the tag field (slug values, vocabulary-only saves, orphans) |
| f:shv6wv | carried | Mark the tag field (`editor.siteConfigPath`, default `src/theme/site.config.yaml`); cited again in Keep adapter settings out of `site.config.yaml` |
| f:lbeeak | carried | Mark the tag field (`content.field_unmarked`); cited again in Diagnose a failed check |
| f:q07rd5 | carried (scoped) | Start from the adapter file (two paths and import specifiers); cited again in Introduction (the two kinds of site, no paths) and Add a concept. Its tutorial-hooks clause is not used |
| f:5eum60 | carried | Add a concept (a `content` key declared with `defineConcept`); scoped in Introduction |
| f:n5d65u | carried | Add a concept (the three wiring points, the step shapes); scoped in Introduction and Start from the adapter file |
| f:n07oiu | carried | Add a concept (glob form, the throw); cited again in Diagnose a failed check |
| f:fj28xs | carried (scoped) | Add a concept (`content` keyed by concept id); cited again in Verify the declaration (default `manifestPath`). `configModule` and `siteFactsPath` not used |
| f:em69ru | carried (scoped) | Keep adapter settings out of `site.config.yaml` (accepted keys, required `siteName`). The doctor's four-path list is not used |
| f:d27z58 | carried | Add a concept (required members and the defaults table); cited again in Set the permalink and date prefix |
| f:fe46lo | carried | Set the concept and editor options (`itemLabel` takes a sub-field key, against the type's comment) |
| f:g9q627 | carried | Mark the tag field (`ContentSummary.tags`, no name fallback) |
| f:grvcbv | carried (scoped) | Mark the tag field (entry shape, enforcement only with a non-empty vocabulary). The `composeRuntime` validation and `SiteConfigError` clause is not used |
| f:n0laoh | carried (added, scoped) | Add a concept (a drifted manifest fails the build, clause 1 only); cited again in Verify the declaration and Diagnose a failed check |
| f:fdtgh5 | carried (added) | Add a concept (`npx cairn-manifest`); cited again in Diagnose a failed check |
| f:fh6kod | carried (added, scoped) | Add a concept (the bin reuses the plugin's options). The internal function names are not used |
| f:7e1t0j | carried (added, scoped) | Verify the declaration (the `sv create` project's `check` script) |

The page-inputs claim inventory carried its rows as recorded: the absent prior page (no claims), the
outline's `editor.nav.configPath` wording (cut: stale against `src/lib/content/compose.ts:20,60`;
`f:shv6wv` is cited instead), and the "filed" rows for `f:d27z58`, `f:g9q627`, `f:grvcbv`, and
`f:fe46lo` (and their option rows), each carried in the section the table names.

## Friction filed

The page-inputs step filed three entries on 2026-10-12 (`ArrayField.itemLabel`'s doc comment; the
site config's two homes and the retired outline path; a concept's URL-policy errors naming it two
ways), and this plan does not refile them. This plan filed three entries in
`docs/internal/docs-friction-log.md` on 2026-10-12, none blocking the page:

1. Engine: a throwing `behavior.validate` fails open while a throwing `refine` fails the save and the
   build's content index.
2. Engine: `spellcheck.dialect` accepts any string and silently resolves to US English.
3. Docs content: `docs/extend/debug-your-site.md` has no row for the build failures a concept's
   wiring causes.

## Drafting constraints

- **Which site.** Every code block names its file in a first-line comment, and every adapter
  reference says which site it means: `src/theme/cairn.config.ts` for a scaffolded site,
  `src/lib/cairn.config.ts` for the tutorial's (`f:q07rd5`). The step code is the scaffold's.
- **Import specifiers.** `#theme/cairn.config.js` and `#lib/cairn.config.js` appear only in fenced
  code, never inline prose (`ROADMAP.md:1027-1029`).
- **The brief's `local` array** takes the names the page has the reader create or that come from the
  tutorial with no fact: `events`, `Events`, `event`, `src/content/events`,
  `/src/content/events/*.md`, `endDate`, `location`, `tags` (the new field), `'/events/:year/:slug'`,
  `src/lib/content.ts`, `src/lib/site.config.yaml`, and the placeholder `<message>`.
- Never state `editor.nav.configPath` or a `src/lib/site.config.yaml` default; the member is
  `editor.siteConfigPath`, default `src/theme/site.config.yaml`.
- Never say what `refine`'s `data` argument holds beyond "the entry's data"; no fact states that it
  is the normalized frontmatter.
- Never say a behavior throw fails the save, or that a `refine` throw is logged.
- Never quote a `defineConcept` URL-policy error's concept name.
- Never call `itemLabel` a row label or a display string.
- Never state the `supportContact` default on the page; link the reference entry.
- Never describe routing, entry identity, or the slug rules beyond one linking clause; that is
  content-model's.
- Never describe the `rendering` group's members, `navLayout`, the `media` block, roles, or the access
  map; name each one's page.
- Every section opens on the first sentence decided above. Each step names its location before its
  action and holds one action, a conditional step states its condition first, and a procedure of one
  step is a single bulleted item. A reference names its target by heading, never by position.
- `defineAdapter`, `defineConcept`, `defineFieldset`, `createGithubApp`, `createSiteIndexes`,
  `cairnManifest`, `parseSiteConfig`, `InferFieldset`, `ContentSummary`, every option, key, log
  event, and command in code spans; UI labels (**Events**, **New event**) in bold.
