# Framing record: Migrate existing content

Agent-facing; drives the introduction of `docs/extend/migrate-existing-content.md` only; the body follows the page plan.

Written 2026-10-12 by the intro-framing step of the docs page chain (stage 2b part 1), against the
plan at `docs/internal/briefs/extend/migrate-existing-content.plan.md`, the outline entry in
`docs/internal/outlines/extend.json`, "The introduction" and "The page anatomies" in
`docs/internal/docs-register.md`, the arm index `docs/extend/README.md`, and the on-disk
introductions of the Model content siblings and `docs/extend/build-the-public-routes.md`. No earlier
framing record existed. `docs/README.md` does not exist yet, and the only other arm index on disk,
`docs/reference/README.md`, does not name this page.

## Who arrives, from where, and why

1. **The migrator (the page's main reader).**
   - Who: a Svelte-fluent developer moving an organization's existing site, built with Jekyll,
     Hugo, Eleventy, or by hand, onto a cairn site, either one the setup command scaffolded or one
     built through the add-cairn tutorial.
   - From: the Model content group of `docs/extend/README.md`, where the page lands last, after
     Configure media, once the drafter's index step adds it (the interim index lists only pages in
     place); a search for "migrate", "import", or an old generator's name. `docs/extend/content-model.md`
     tells this reader that moved-in markdown must meet its id, date, and key rules, but it does not
     link here (the outline's crossLink runs from this page to that one).
   - Came for: a way to bring every old post and page in without hand-editing each file, ending with
     entries that keep their identity, pass the site's checks, and can be linked.
   - Knows: the old site's conventions (its filenames, its draft and date spellings, its shortcodes),
     Node scripting, YAML, and the concepts their adapter declares or is about to declare.
   - Lacks: that no importer ships (`f:qd7iat`) and that `parseMarkdown` hands back typed YAML exactly
     as the build and the admin read it (`f:g8rbmt`, `f:w77gj8`); the id rule (`f:z68na4`,
     `f:46edxb`), the date-prefix rule (`f:grhib4`), and the id shape (`f:nhjraz`); the one form each
     of `date`, `draft`, and tag values takes (`f:ivhuyc`, `f:0nw43j`, `f:2p519o`); that an admin save
     deletes undeclared keys (`f:ggzzur`) and that text-like fields read unquoted scalars as empty
     (`f:gh4ckg`); and that the build is the check (`f:fdtgh5`, `f:kv3qen`).

2. **The image mover.**
   - Who: a developer who has turned media on and wants the old site's images in the Library.
   - From: `docs/extend/configure-media.md` line 38, its out-of-scope bullet "Bringing an existing
     site's images across", the one on-disk link into this page.
   - Came for: a bulk way to move the old images into the Library.
   - Knows: the R2 binding, the Library, and the `media:` reference, from Configure media.
   - Lacks: that cairn has no bulk media importer and an old image URL left in a body renders
     unchanged (`f:xl7d9s`), and that the Library takes one file per upload, referenced afterward by
     a `media:` token (`f:xjdhau`). The answer is a "no" with two workable paths, so the intro tells
     this reader early, by naming "Keep or move old images".

3. **The developer whose build stopped, or whose entry vanished, after content was copied in.**
   - Who: a developer partway through a move, or one who copied files into `src/content` by hand.
   - From: a search for the build's error text (the stale-manifest error naming `npx cairn-manifest`,
     or a `<dir>/<id>: <field>: <message>` line), or from
     `docs/extend/build-the-public-routes.md#diagnose-a-failed-build`, which states the error but not
     the causes a migration adds; no on-disk page links here for it.
   - Came for: why the build fails, or why an entry is on disk but not on the site.
   - Knows: which files were added and the error text.
   - Lacks: the build's two checks (`f:fdtgh5`, `f:kv3qen`); that an invalid draft passes the build
     but is left out of the index (`f:kv3qen`, `f:4ikssa`); and the migration's own causes, a date with
     a time part (`f:ivhuyc`) or an unquoted scalar in a text field (`f:gh4ckg`). The intro names
     "Diagnose a failed check" as this reader's starting point.

4. **Wrong place: the developer upgrading cairn.**
   - Who: a developer moving the site to a newer `@glw907/cairn-cms` version, searching for
     "migrate" or "migration".
   - From: a search; the arm index also lists Migration notes under Operate.
   - Belongs on: `docs/extend/upgrade-cairn.md` for the procedure, with each version's actions in
     `docs/extend/migration-notes.md`. The intro routes this reader in its out-of-scope list.

5. **Wrong place, routed by the plan's out-of-scope list.** A developer who has not declared the
   target concepts belongs on `docs/extend/define-an-adapter-and-schema.md`; one who needs a
   shortcode's replacement component built belongs on `docs/extend/write-a-markdown-component.md`; one
   turning media on belongs on `docs/extend/configure-media.md`; one rewriting the old site's
   internal links belongs on
   `docs/extend/link-content-with-references.md#cairn-body-links-and-reference-fields`.

6. **Not routed.**
   - A developer applying D1 schema migrations ("apply the migration" on the auth or preview pages)
     shares only the word; the title's "content" separates them, and a second "migration" route
     would crowd the list, so the intro gives them none.
   - A site owner with no code who wants old posts brought in through `/admin` has no page in the
     admin or editor arms yet, and the admin offers no import. Paragraph 1's statement that the move
     is a script the developer writes tells them whose job it is; there is no destination to link.

## Background the page rests on

- **The general model.** A cairn entry is a markdown file in one concept's directory, and the
  concept set and its fields are the site's own declaration (`f:5eum60`); the fieldset is the one
  source for the form, the validator, and the type (`f:phdgof`). The entry's id is its filename stem,
  verbatim, its only identity (`f:z68na4`, `f:46edxb`). The files in git are the source of truth,
  and the committed manifest summarizes them (`f:z5boz6`, `f:fdtgh5`). The old generators keep a page
  in the same form, a file opening with a frontmatter block, and YAML between `---` lines is a form
  all three read (`f:ht7tdd`, filed by this step). A migration is therefore a conversion of each
  file's name, frontmatter, and body, not an export and an import through a database.
- **Why there is a script and no importer.** No importer ships (`f:qd7iat`). What the move needs from
  the engine is the parser, which is public and is the one the engine reads every committed file
  with, so the script sees each value typed as the build and the admin will (`f:g8rbmt`, filed by
  this step; `f:w77gj8`), and the check, which the build already runs (`f:kv3qen`). The target of
  each old key is a field only the site declares (`f:5eum60`, `f:phdgof`). No fact states the
  engine's reason for shipping no importer, so the intro states these facts side by side and never
  attributes a design intent. The serializer is not public (`f:3r6rqn`), which is why the script
  writes its own `---` block; that detail stays in the body.
- **Why the build is the check.** `createSiteIndexes` validates every non-draft entry and throws one
  error listing each invalid field, so malformed content fails the build (`f:kv3qen`), and the
  `cairnManifest` plugin fails on a manifest the new files no longer match, naming
  `npx cairn-manifest` (`f:fdtgh5`). Every deploy runs the same build over the committed files
  (`f:1mkckz`), so an entry that fails locally would fail the next deploy. Drafts are exempt from
  the throw but still left out of the index (`f:kv3qen`, `f:4ikssa`), so the intro scopes the check
  to entries that are not drafts.
- **Why the conversion has to be right before editors take over.** The id is what a `cairn:` link
  and the admin's rename and delete guards key on, and they cannot see a stem outside the id shape
  (`f:nhjraz`). An editor's first save rewrites the frontmatter from the validator's normalized
  output and deletes every undeclared key (`f:ggzzur`). This is the reasoning the body leaves out:
  each pair section says what to do, and the intro says why the file's name and keys matter after
  the script has run.
- **SvelteKit.** The script runs outside the app, as a Node script importing the root barrel, which
  imports no SvelteKit (`f:0duu5p`). The check runs inside the SvelteKit build: `createSiteIndexes`
  indexes each concept's literal `import.meta.glob` at build time (`f:1mkckz`, `f:yef4lo`), and the
  `cairnManifest` plugin verifies the manifest in the app's Vite graph (`f:5uhx5o`). The intro says
  "the site's build" and does not name Vite or prerendering; the body names the module.
- **GitHub, left out on purpose.** The migrated files reach the repository through the developer's
  own commit, and the GitHub App enters only when an editor later saves (`f:cjonmm`). The intro
  touches GitHub only through that editor's first save (`f:ggzzur`). The plan has no commit step,
  and an entry committed outside Publish never carries a first-publish stamp (friction log, the
  `publishedAt` entry), so the intro claims nothing about how the files are committed.
- **Cloudflare, left out on purpose.** The page has no Cloudflare step. The only point is that the
  deploy runs the same build (`f:1mkckz`), which the intro may make in one clause without naming
  Workers Builds or Cloudflare, since a named platform invites a claim about the deploy that no step
  needs.
- **Hugo's TOML, kept out of the intro.** `f:ht7tdd` records that a Hugo site may carry TOML
  frontmatter, and no fact says what `parseMarkdown` does with it (facts hole already filed in
  `docs/internal/docs-friction-log.md`). The intro says the old generators open a file with a
  frontmatter block, never that their frontmatter is YAML, and says only that a cairn entry's is.

## Place in the doc set

- **Group and neighbors.** Model content, last of seven in the outline: `content-model`,
  `define-an-adapter-and-schema`, `write-a-markdown-component`, `link-content-with-references`,
  `reuse-content-across-entries`, `configure-media`, then this page. It is the group's one page about
  content that already exists elsewhere; the others declare, render, link, reuse, and store content
  the site creates. The next group, Public site, opens on `build-the-public-routes`, which owns the
  build's validation as a route concern.
- **Links in, on disk.** `docs/extend/configure-media.md:38` (out-of-scope: "Bringing an existing
  site's images across"). No other published page, no reference page, and no setup-command output
  names this page. The internal record `docs/internal/record/2026-09-04-the-cairn-case.md` cites it as
  evidence that moving content in is a project; when the front door rebuilds and links here, an
  evaluator arrives asking what moving in costs, and paragraph 1, which states what the move
  consists of, is the part they read. Reread the intro against that reader when the link lands.
- **Links out.** The outline's three crossLinks: `content-model` (the id and date rules the migration
  satisfies), `write-a-markdown-component` (replacing shortcodes with components), and
  `build-the-public-routes` (the build validation that checks migrated frontmatter), each landing in
  the body as the plan places them. The intro's own links are the out-of-scope routes, the section
  names in paragraph 3, and, in the prior-knowledge item, `docs/extend/content-model.md` for the model
  behind the rules.
- **What siblings already say, so this intro words a shared idea fresh.**
  - `content-model` opens on "Every entry an editor opens in a cairn site's admin is a markdown file
    in the site's repository", and its third paragraph already says markdown moved in from another
    system must meet its id, date, and key rules, and that a save drops undeclared keys. This intro
    does not reopen on "an entry is a markdown file"; it opens from the reader's old site and arrives
    at the entry's form by comparison, and it states the save rule as a consequence for the script's
    choices, not as part of the model.
  - `define-an-adapter-and-schema` frames its readers as "On a scaffolded site … On a site built by
    hand"; `link-content-with-references` and `reuse-content-across-entries` pair "On a scaffolded
    site, whose adapter is …" with "On the site that Add cairn … builds". Here the steps do not differ
    by site, so one sentence names both adapter paths as where the target concepts live, with neither
    sibling's frame.
  - `configure-media` says "Two other readers need one part of the page", and `write-a-markdown-component`
    says "Two sites start from different places" and "Four narrower needs also bring a developer to
    this page". Paragraph 3 names its two readers without any of those lead-ins.
  - `build-the-public-routes` opens on the public side as routes that prerender from the commit
    being deployed. This intro mentions the build only as the migration's test.

## Intro plan

The introduction is three paragraphs, then the plan's bounds: the prior-knowledge item and the
out-of-scope list (plan items 3 and 4). Use "frontmatter" throughout, the register's word, even for
the old generators' "front matter". No paragraph opens on an imperative or on the page.

1. **The subject, from the reader's old site, and the model the move sits in.** Draws on `f:ht7tdd`,
   `f:5eum60`, `f:phdgof`, `f:z68na4`, `f:tg9e0z`, `f:qd7iat`, `f:g8rbmt`, `f:w77gj8`, `f:fdtgh5`,
   `f:kv3qen`, `f:1mkckz`.
   - Opening statement: a site built with a static site generator such as Jekyll, Hugo, or Eleventy,
     or by hand, already keeps each page as a markdown file that opens with a frontmatter block
     (`f:ht7tdd`), which is the form a cairn entry takes: a file in one concept's directory whose YAML
     frontmatter the concept's declared fields describe (`f:5eum60`, `f:phdgof`). A statement about
     the reader's situation, relating cairn to what they know.
   - What differs sits in three parts of each file: its name, which cairn takes verbatim as the
     entry's id and only identity (`f:z68na4`); its frontmatter, read against the concept's fields;
     and its body, where an old shortcode becomes a component the site registers (`f:tg9e0z`). Keep
     each part to a clause; the detail is the body's.
   - cairn ships no importer, and the target of each old key is a field only the site declares, so
     the conversion is a short script the developer writes (`f:qd7iat`, `f:5eum60`). It reads each
     old file with `parseMarkdown`, the parser the engine reads every committed file with, so the
     script sees each value typed as the build and the admin will (`f:g8rbmt`, `f:w77gj8`). Do not
     attribute a reason to the engine for shipping no importer.
   - The site's build then checks the result: it fails on a committed manifest the new files no
     longer match (`f:fdtgh5`), and on any entry not marked as a draft whose frontmatter does not fit
     its concept, listing each invalid field (`f:kv3qen`). One optional clause: every deploy runs
     the same build (`f:1mkckz`), without naming Cloudflare.

2. **Why the conversion has to be right, the contract, and which site.** Draws on `f:nhjraz`,
   `f:ggzzur`, `f:z68na4`, `f:q07rd5`.
   - The framing from above: a migrated file outlives the script. Its id is what a `cairn:` link and
     the admin's rename and delete guards key on, and a stem outside the id shape is invisible to
     them (`f:nhjraz`). The first time an editor saves the entry, the admin rewrites its frontmatter
     from the declared fields and deletes every other key (`f:ggzzur`). One or two sentences, each
     claim whole with its consequence.
   - The anatomy's one-line contract, addressed to the migrator: you write one script that converts
     each old file so every migrated entry keeps a stable id from its filename, validates against its
     concept's fields, and can be the target of a `cairn:` link, then use the build to find each
     entry that still fails. Name the reader in it or beside it: a developer moving an organization's
     existing site onto cairn.
   - One sentence naming the adapter file where the target concepts are declared, saying which site
     each path belongs to: `src/theme/cairn.config.ts` on a scaffolded site and
     `src/lib/cairn.config.ts` on the add-cairn tutorial's site (`f:q07rd5`). The steps are the same
     on both; do not use the siblings' paired "On a scaffolded site … On the site that …" frame.

3. **The two readers with one narrower need.** Draws on `f:xl7d9s`, `f:xjdhau`, `f:kv3qen`,
   `f:4ikssa`.
   - A developer who came to bring an existing site's images into the Library finds the answer in
     "Keep or move old images": cairn has no bulk media importer, an old image URL left in a body
     renders unchanged (`f:xl7d9s`), and moving an image means one upload per file and a `media:`
     reference in place of its URL (`f:xjdhau`). Name the section by heading and link its anchor.
   - A developer whose build stopped after content was copied in, or whose migrated entry is missing
     from the site, can start at "Diagnose a failed check" (`f:kv3qen`, `f:4ikssa`). Name the section
     by heading and link its anchor.
   - Lead into neither sentence with a count of readers or needs (see "Place in the doc set").

**The bounds, after paragraph 3 (plan items 3 and 4).**

- Prior knowledge: the plan's item stands (Node.js ES-module scripts with `node:fs/promises`, YAML
  frontmatter, the old site's own conventions such as its shortcodes and its draft and date
  spellings, and a declared concept for each kind of old content), plus JavaScript regular
  expressions, and, from cairn, `docs/extend/content-model.md` as where the id and frontmatter rules
  the script meets are set out.
- Out of scope, as a lead-in sentence (which may name the page) and a list, each item with its page:
  declaring the target concepts and their fields, `docs/extend/define-an-adapter-and-schema.md`;
  declaring and registering the components that replace shortcodes,
  `docs/extend/write-a-markdown-component.md`; turning media on, `docs/extend/configure-media.md`; rewriting
  the old site's internal links as `cairn:` links,
  `docs/extend/link-content-with-references.md#cairn-body-links-and-reference-fields`; moving the
  site to a newer cairn version, `docs/extend/upgrade-cairn.md`, with each version's actions in
  `docs/extend/migration-notes.md`; and redirects from the old site's addresses, named in words with
  no link and no claim about how a site sets them up.

## Departures from the plan's introduction

- **The opening changes.** The plan's item 1 opens on "An existing site's markdown already holds most
  of what a cairn entry needs". No fact backs "most of what a cairn entry needs". The intro opens
  instead on the reader's generator keeping each page as a file with a frontmatter block, the form a
  cairn entry takes (`f:ht7tdd`, filed by this step, with `f:5eum60` and `f:phdgof`). The register's
  Google citation asks an introduction to relate a new thing to one the reader knows, and the
  comparison is sourced.
- **The parser's description is re-sourced.** The plan describes `parseMarkdown` as "the parser
  cairn's own save path uses" (`f:qd7iat`). That fact's `Source:` line points one line off and does
  not show the clause (friction filed). Paragraph 1 says the engine reads every committed file with
  it, so the script sees values as the build and the admin will (`f:g8rbmt`, filed by this step),
  which is the reason a migrator should read with it.
- **The build sentence is scoped and widened.** The plan's item 1 says the build "checks every
  migrated entry". The frontmatter check exempts drafts (`f:kv3qen`), so the intro scopes it to
  entries not marked as drafts, and it names the manifest check beside it (`f:fdtgh5`), since a
  migration meets that one first.
- **Paragraph 2 gains the why.** The plan's item 2 carries the reader, the contract, and the adapter
  paths. The framing adds one or two sentences ahead of the contract on why the file's name and keys
  matter after the script runs (`f:nhjraz`, `f:ggzzur`), since the house ruling asks the intro for
  the reasoning the body leaves out.
- **Paragraph 3 is new.** The plan's introduction names one reader. The map shows two more: the image
  mover sent by `docs/extend/configure-media.md:38`, whose question has a "no" for an answer that the
  intro should give early, and the reader with a failing build or a vanished entry, who arrives
  mid-task by search.
- **Prior knowledge adds two items.** JavaScript regular expressions, because the script's `toSlug`
  and `toBody` are regular expressions and adapting `toBody` to the old site's shortcodes is a
  regular-expression edit; and `docs/extend/content-model.md` as the model behind the rules, a
  second landing for the outline's `content-model` crossLink.
- **Out of scope adds the version upgrade.** "Migration" also names upgrading cairn
  (`docs/extend/upgrade-cairn.md`, `docs/extend/migration-notes.md`), and a search for it can land
  here.
