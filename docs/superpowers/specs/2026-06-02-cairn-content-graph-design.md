# Cairn content graph (design)

Status: approved design, pre-plan. Authored 2026-06-02.

This initiative gives cairn a content graph: a committed, build-verified projection of the
markdown corpus that request-time admin code can read without crawling GitHub file by file.
The graph powers rot-proof internal links between posts and pages, a link-aware editor
picker, and the content-lifecycle operations (delete and rename) that rewrite inbound links
when a target moves. It supersedes the earlier internal-links design
(`2026-05-31-cairn-editor-internal-links-design.md`, now retired) and the content-lifecycle
items deferred in the dated-slug design (`2026-05-31-cairn-dated-slug-design.md`). It
supplements the locked architecture in the functional spec
(`2026-05-28-cairn-rebuild-functional-spec.md`).

## Why this initiative exists

The editor cannot link from one page to another. An author types a raw URL by hand, which
bakes the target's current permalink into the prose. When that target's slug or date later
changes, every link to it rots, and nothing surfaces the breakage until a reader hits a dead
page. WordPress takes this baked-URL approach and has carried an open link-rot issue since
2021.

Cairn can do better, because it holds the whole corpus in git and resolves URLs at build
time. A link can store a stable identity and resolve to the live URL on every build, so a
rename needs no edit to the linking prose. The same knowledge of the whole corpus also lets
cairn rename and delete content safely, rewriting inbound links in the same commit, which the
single-file write path cannot do today.

These capabilities share one piece of machinery, a view of the whole content graph available
where the work happens. Building that view once, with the atomic commit that keeps it
correct, is the reason internal links and content lifecycle land as one initiative rather
than two passes that each build half of it.

## The spine: files are truth, the manifest is a build-verified projection

The markdown files in git stay the single source of truth. Nothing in this initiative changes
that. The manifest is a committed JSON projection of the corpus that exists so request-time
code can read the content graph without an N+1 GitHub crawl. Three rules keep the projection
honest.

**The build regenerates and verifies it.** Every production build rebuilds the manifest from
the actual corpus, which the delivery site index already computes, and fails the build if the
committed manifest drifts from what the files say. A manifest can never silently go stale,
including when an author edits content through raw git instead of the admin. The files win,
always.

**Every content mutation commits content and manifest atomically.** Once the manifest exists,
a save, a create, or a delete writes the content file and the updated manifest in one commit
through the Git Data API tree primitive. There is no two-commit drift window and no double
deploy. This is why the atomic multi-file commit is Plan 1: it is the write mechanism for
everything built on top of it.

**Resolution reads the cheapest authoritative source for its context.** The build-time
delivery resolver reads the site index it already builds, which is fresh from the files. The
admin preview, the picker, and the guards read the committed manifest, which is the only
content-graph data available inside the Worker. One token format serves both, with one read
path at build and one read path at request time, each correct where it runs.

### Why a committed manifest rather than D1

Cairn already runs a per-site D1 (the magic-link auth store), so storing the link graph there
was weighed and set aside. The decisive reason is the build and runtime split. The sites are
statically generated, so internal links resolve to live URLs at prerender and the build fails
closed on a missing target, baking the correct URL into the static HTML. That build runs in CI,
and a D1 binding is a runtime Worker resource the build process cannot reach. So D1 cannot serve
the resolver or the build-fail backstop, which are the correctness core, and a file-derived
graph would still be needed at build. D1 would serve only the request-time picker and guards, as
a second graph with no reconciliation point, since the build never sees D1 to catch drift from a
raw-git edit. A committed manifest is one artifact the build regenerates and verifies, serving
both contexts from a single source.

The split also follows the line the project already drew. The 2026-05-27 decision moved static
site structure and config out of D1 into a git-committed file read at build, so sites keep
compiling without a database, and scoped D1 to runtime admin state. Magic-link auth belongs in
D1 because it is runtime-only, ephemeral, and meaningless in git. The link graph is
content-derived structure, the same category as nav and the site config, so it stays in git. The
manifest also keeps the graph version-controlled, diffable in a pull request, and recoverable by
a revert, which a Cloudflare-account database would not be. D1 stays attractive only for
request-time queries at a corpus size cairn's sites are far below, where the answer would be a
derived cache, never a second source of truth.

## The manifest is the content and link graph

The manifest is a single JSON file for the whole corpus, committed at a settable path that
defaults to `content/.cairn/index.json` and sits outside any concept directory, so content
enumeration never picks it up. One file keeps the atomic commit simple, and the corpus size
on the target sites makes write contention a non-issue.

Each entry carries its `id`, `concept`, `title`, `date`, `permalink`, and `draft` flag, and
its outbound `cairn:` links. Carrying the outbound links is what makes the integrity story
cheap. The question "which pages link here" becomes a scan of one small JSON instead of a
crawl of every body, so the delete guard, the save guard, backlinks, and the future
link-health view all read the same edge list. The manifest is the link graph, not only a
title index.

The manifest shape is the initiative's central interface. The resolver reads entries by
`(concept, id)` for a permalink. The picker reads the entry list for its candidate dropdown.
The guards read the outbound-link edges to compute inbound links. Each consumer depends on the
manifest, not on the others, so each plan can be built and tested against a manifest fixture
in isolation.

## The link token

An internal link is a standard CommonMark link whose href uses a `cairn:` scheme keyed to the
target's concept and id.

```
Try our [waxing guide](cairn:posts/2026-01-04-waxing-guide) before the first snow.
```

A `cairn:` scheme marks the link for resolution. The first path segment is the concept, such
as `posts` or `pages`. What follows is the target's id, the full filename stem from the
dated-slug model. Because the id is permanent, the token survives any change to the target's
slug, date, or permalink pattern. The display text defaults to the target's current title and
stays editable, so the link reads naturally in the sentence.

This form stays valid markdown. Any renderer parses it as a link, and a tool that does not
know cairn shows an inert link rather than a wrong URL, so the file degrades safely outside
the pipeline.

### Why a stable-id token rather than wikilinks

The `[[wikilink]]` syntax was weighed and set aside as the stored form. It is not a portable
standard. Obsidian, `remark-wiki-link`, and the various forks disagree on the alias divider and
the resolution rules, and a plain CommonMark renderer shows `[[ ]]` as literal text rather than
a link. A wikilink is keyed by name or path, so it rots on a rename unless the tool rewrites
every inbound reference, which is an application feature rather than anything the markdown
carries. A stable id keyed to the permanent filename stem inverts that calculus. A slug or date
change costs zero rewrites, and the resolved `cairn:` token degrades to an inert but valid
CommonMark link outside the pipeline.

The wikilink typing gesture is still worth keeping, so the `[[` trigger in Plan 4 opens the
picker and inserts the resolved id token. No `[[name]]` form is ever written to the file, so the
author gets the familiar ergonomic without the name-based rot.

A 2026 survey of the field grounds the choice. Sanity is the reference-integrity gold standard,
keying references to an immutable id that survives URL changes and blocking deletion of a
referenced document, though it enforces this in a database rather than git. Contentful validates
both request-time pieces this initiative adds, an inbound-link API that mirrors the manifest and
a delete-impact dialog that mirrors the delete guard. Hugo and Docusaurus both fail the build on
a broken internal link by default, so the build backstop is proven practice. The two tools
closest to cairn's git-markdown model do not solve this. Sveltia shipped entry-file rename but
deferred the inbound-reference rewrite, so a rename there still breaks links, and Astro 5 removed
the build-time validation its v4 had, so a missing reference now returns nothing at runtime. No
single existing tool occupies cairn's combination of a stable-id token, a build-fail backstop, an
inbound rewrite on rename, and an editor picker over markdown in git.

## The five plans

The initiative runs as a numbered plan series, foundation first, so nothing is built twice.
Each plan is written just-in-time after the prior one lands, per the cairn-pass convention.

> **Resequenced 2026-06-02 after Plan 1 landed:** the design's Plan 2 (the committed manifest) and
> Plan 3 (the token, resolver, and build backstop) are written and executed as **one** plan,
> `docs/superpowers/plans/2026-06-02-cairn-content-graph-02-manifest-and-resolution.md`. They share
> the `cairn:` token parser, and together they form the first end-to-end capability (links resolve at
> build and fail closed), so a manifest-only pass would ship infrastructure nothing reads yet. The
> picker (now Plan 3) and the lifecycle guards (now Plan 4) stay separate. The numbered plan files are
> the source of truth for sequencing; the sections below remain the per-stage design record.

### Plan 1: the atomic multi-file commit primitive

A Git Data API operation in `src/lib/github/repo.ts` that commits several path changes in one
commit. It reads the base ref and tree, builds a new tree that adds, modifies, or removes the
given paths, creates one commit, and updates the ref. It handles the non-fast-forward race by
re-reading the ref and retrying, since a partial failure on a multi-path move would otherwise
leave a file at two paths, which the dated-slug collision rule turns into a build-breaking
duplicate permalink. The single-file `commitFile` stays for now and is migrated onto the
primitive in Plan 2. This plan is the highest-stakes code in the initiative, so it lands and
is verified against a real miniflare-backed integration test in isolation before anything
depends on it.

### Plan 2: the committed manifest

A pure builder that turns the corpus into the manifest shape, reused by the build (to
regenerate and verify) and by the admin write path (to update on each mutation). The build
step regenerates the manifest, compares it to the committed file, and fails on drift. The
admin save and create paths move onto the Plan 1 primitive so each content write commits the
content file and the refreshed manifest in one commit. This plan locks the manifest path,
shape, and the drift-verification contract.

### Plan 3: the token, the resolver, and the build backstop

A remark step in the render pipeline visits link nodes, and for an href that starts with
`cairn:` it parses the concept and id, looks the pair up, and rewrites the href to the live
permalink. A link without the scheme passes through untouched. The step slots into
`remarkPlugins` before the rehype boundary, well upstream of the sanitize floor, so the floor
governs the resolved `href` exactly as it governs any other anchor. At build the lookup reads
the site index; in the admin preview it reads the manifest. A dangling `cairn:` token fails
the build, so a broken internal link never reaches production. The live preview renders a
missing target in a distinct broken-link style with a plain-language note, borrowing the
Obsidian unresolved-link cue, so the author meets the problem in the editor first. The
resolver threads to the site through `createRenderer`, which the site adapter already calls,
so a migrating site wires it once.

### Plan 4: the picker

Authors reach the picker two ways, and both insert the same token through the `registerInsert`
seam the editor already exposes. A "Link to page" toolbar button beside the existing insert
dialog opens a searchable list of the site's posts and pages, the discoverable path for an
author who does not know markdown. A `[[` autocomplete opens the same list inline as the
author types, the fast path for a fluent author. The autocomplete lands as a generic
CodeMirror completion seam on `MarkdownEditor`, reusable for the deferred deep-link picker and
other future completions, rather than a one-off. The candidate list comes from the manifest,
which is finite and known at editor load, so the picker filters in the browser with no network
round-trip. The list groups by concept, Pages first then Posts, each under a small heading,
with one live search box and posts showing their date to tell recurring titles apart. With
text already selected, the toolbar button wraps the selection as the display text. Picking a
target that exists means a freshly made link cannot dangle. CodeMirror's autocomplete carries
the keyboard contract the admin accessibility bar requires.

### Plan 5: content lifecycle and the integrity guards

The content-delete path and a rename path, both on the Plan 1 primitive and the manifest. A
delete or rename reads the manifest's edge list to find inbound links. A rename rewrites every
inbound `cairn:` link to keep pointing at the moved target, in the same atomic commit as the
move, which is why the move primitive commits many files at once. The delete guard names the
inbound links before proceeding, for example "3 pages link here", and asks for confirmation,
so a delete never silently orphans a link. The save guard blocks a commit whose body links to
a now-missing target, states the broken link in plain language, and offers a one-click fix.
External redirects stay the site owner's responsibility, since cairn does not own inbound
links from outside the site; the CMS is explicit when it renames so the site can write a
redirect if it wants.

## Integrity: fail closed, surfaced kindly

A link keyed on the id cannot break when a slug or date changes, because resolution always
produces the target's current URL. A link breaks only when its target is deleted or renamed,
and the initiative guards both moments while keeping a hard build backstop behind them. The
picker offers only targets that exist. The preview flags a broken link as it appears. Deleting
a linked-to page warns first and names the inbound links. A save that would orphan a link is
blocked with a one-click fix. The build is the final backstop, so a dangling token never
reaches production, and it should almost never fire because the author meets any problem
earlier and in plain words.

## Where it lives in code

- The **atomic commit primitive** is a new function in `src/lib/github/repo.ts` beside the
  existing `commitFile`, `listMarkdown`, and `readRaw`.
- The **manifest builder** is a pure module over the corpus, reused by the delivery build
  (`src/lib/delivery/`) and the admin write path (`src/lib/sveltekit/content-routes.ts`).
- The **resolver** is a remark step in `src/lib/render/pipeline.ts` plus a small lookup that
  turns a concept and id into a permalink, reading the site index at build and the manifest in
  the preview.
- The **picker** is a `LinkPicker.svelte` beside `ComponentInsertDialog.svelte`, both calling
  the `registerInsert` seam on `MarkdownEditor`. The `[[` autocomplete is a CodeMirror
  completion extension wired through a new completion seam on `MarkdownEditor`.
- The **guards, delete, and rename** live in the content routes, reading the manifest for
  inbound links and committing through the atomic primitive.

## Deferred to future passes

These extensions are out of the initiative and worth keeping on the roadmap. Each is recorded
so a later pass starts from a written intent.

**Deep links to a heading.** A link that targets a section of a page, `cairn:posts/<id>#section`,
where the resolver appends the heading anchor `rehype-slug` already assigns and the picker
offers a second step listing the target's headings. This needs the manifest to carry each
target's heading structure, which it does not yet.

**Create-on-link.** Linking to a page that does not exist yet, the way Obsidian creates a note
from an unresolved link, scaffolding a draft of the right concept and dropping the author into
it. This needs a clean draft state in the content model.

**Admin link-health view.** A "Links" page that lists every broken internal link across the
corpus, so an author repairs links without a blocked deploy. It is the richer form of the save
guard and reads the same manifest edge list.

**Backlinks.** A panel on a page's edit screen showing which other pages link to it, the
reverse view of the manifest edge list the delete guard already computes. The work is small
once the edge list exists, so it pairs with the link-health view.

**External-link checking.** A scheduled Cron-triggered fetch that verifies outbound links to
other sites still resolve and reports into the link-health view. Outbound links are a separate
problem, since cairn does not own the targets and cannot resolve them at build.

**A redirect map on rename.** The `cairn:` token protects internal links, which resolve to the
live URL on every build. An external bookmark or a search-engine link to a renamed entry's old
URL still breaks, since cairn does not own those inbound links. The initiative leaves that
redirect to the site owner, who is told when a rename happens. A later pass could have a rename
emit a redirect entry, the WordPress old-slug pattern, into a site-read redirect map, so an
external link survives a rename too.

## Testing notes

- The atomic commit primitive tests against a real miniflare-backed GitHub double in the
  integration project, covering a multi-path add, a remove, a move, and the non-fast-forward
  retry.
- The manifest builder is a pure transform over the corpus, so it tests as a unit, and the
  build drift-verification tests that a stale committed manifest fails the build.
- The resolver is a pure transform over markdown and a lookup, so it tests as a unit. A valid
  `cairn:` link rewrites to the permalink, a missing id renders the broken-link form, and a
  non-`cairn:` link and an external link both stay untouched.
- The picker tests as a component. The candidate list filters by title, a selection inserts the
  token, the keyboard path opens and dismisses the list, and a selection with text selected
  wraps it as the display text.
- The guards, delete, and rename test against a real miniflare D1 and a manifest fixture in the
  integration project, since they read committed content and the edge list.

## Scope and sequencing

The initiative runs from `~/Projects/cairn/cairn-cms` on `main` (a cairn-cms push deploys no
site), built as the five-plan series above. It lands before the site migrations, so each site
then wires the whole content layer in one site-pass, delivery and resolver and manifest
together, and the scaffolder template captures the complete picture rather than a partial
surface that gets re-touched later. Migration is unhurried, so the initiative taking the slot
ahead of it is the accepted trade.
