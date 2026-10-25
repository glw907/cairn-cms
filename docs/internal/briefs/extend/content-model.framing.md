# Framing record: Content model

Agent-facing; drives the introduction of `docs/extend/content-model.md` only; the body follows the
page plan (`docs/internal/briefs/extend/content-model.plan.md`).

## Who arrives, from where, and why

1. **The developer about to declare a concept (the job's reader).**
   - Who: a Svelte-fluent developer building an organization's site, holding an adapter already:
     a scaffolded site's (posts, pages, and fragments declared) or the add-cairn tutorial's (one
     posts concept, `docs/extend/add-cairn-to-a-sveltekit-app.md:263`).
   - From: the preconditions of `define-an-adapter-and-schema` (its outline cover names "the model
     (link content-model)"), and the extend index's Model content group, which this page heads once
     the index gains that group (the interim `docs/extend/README.md` has none yet). A tutorial reader
     comes the long way: the tutorial links `define-an-adapter-and-schema`, never this page
     (`docs/extend/add-cairn-to-a-sveltekit-app.md:25,1224`).
   - Came for: what a declaration will produce and what the engine will refuse, before writing one.
   - Knows: TypeScript, SvelteKit, YAML frontmatter, HTML forms; the adapter as one object if they
     read Architecture.
   - Lacks: that the fieldset is the one source for the form, the save's checks, the type, and what
     a save writes back to the file (`f:phdgof`, `f:ggzzur`); the refusals at module load versus at
     save (`f:68fh1k`, `f:8fv57g`, `f:hdrzxd`); the engine-read keys a save drops unless declared
     (`f:69j91g`); that the filename fixes the id and a field fixes the date (`f:46edxb`,
     `f:zce3pt`); that options named like HTML input attributes behave otherwise (`f:7l7y5l`,
     `f:n26z3j`, `f:t7cr8o`).

2. **The developer who took over a scaffolded site.**
   - From: `docs/extend/scaffolded-site-files.md`'s see-also group "The following pages explain the
     engine these files wire in" (line 546), after its `src/theme/` and `src/content/` entries
     (lines 389-431) name the posts, pages, and fragments concepts, the content directories, and
     `src/content/.cairn/index.json` without explaining any of them.
   - Came for: what the inherited posts and pages concepts are, whether they can be renamed or
     removed, what a dated filename such as `2026-08-14-my-post.md` means, and what `index.json`
     records.
   - Knows: the tree file by file; that renaming a content directory is an adapter change; that the
     build fails when `index.json` drifts.
   - Lacks: that posts and pages are ordinary, unreserved concepts (`f:5eum60`); the id, slug, and
     date rules (`f:46edxb`, `f:zce3pt`); what a manifest row holds and why the manifest exists
     beside git (`f:t5ebsr`, `f:z5boz6`). Their third concept, fragments, belongs on
     `reuse-content-across-entries`.

3. **The evaluator, or Architecture's reader going one level down.**
   - From: `docs/extend/architecture.md`'s seams table row for the `content` map (line 69), its
     out-of-scope item "Concepts and fieldsets in depth" (line 22), and its related resources
     (line 194). Architecture's own job names a developer "evaluating cairn against alternatives".
   - Came for: the content-map seam in depth, and whether the model fits the organization's content
     before adopting cairn.
   - Knows: one adapter that every route factory reads, the engine hard-coding no concept, directory,
     or field (`docs/extend/architecture.md:26`, `f:4esdoz`); content in git; the write and read
     paths; the content manifest as one row per entry; the data tiers.
   - Lacks: the model's limits: one concept shape with no open-ended collection model (`f:kn5rze`),
     fifteen builders in a closed union with no custom-field seam (`f:2hxm4t`, `f:im6x7r`), one level
     of nesting (`f:68fh1k`), ASCII-only ids (`f:7m8nd4`). The intro states the limits plainly, as a
     reason to read, never as a pitch or an apology.

4. **The developer moving existing markdown into cairn.**
   - From: `migrate-existing-content` (outline crossLink: "The id and date rules the migration
     satisfies"), a planned page not yet on disk; or a search for a filename or frontmatter rule.
   - Came for: the id, date, and frontmatter rules the migrated files must meet.
   - Knows: the old site's files, their frontmatter, YAML.
   - Lacks: id from the filename stem, the date prefix feeding only the slug (`f:46edxb`,
     `f:zce3pt`); the id's character set (`f:7m8nd4`); the keys the engine reads by name and the
     declare-to-keep rule (`f:69j91g`, `f:ggzzur`); the `datetime` conversion of an unquoted YAML
     timestamp and the `url` field's absolute-only rule (`f:8igohk`, `f:7ci1fm`). The script, the
     frontmatter traps, and the build as the migration check stay on `migrate-existing-content`.

5. **The reader following `cairn:` body links.**
   - From: `link-content-with-references`'s out-of-scope list, "cairn: body links as a model
     (content-model)", a planned page not yet on disk.
   - Came for: the model of internal links between entries.
   - Knows: reference fields.
   - Finds here: the manifest records each entry's outbound `cairn:` links (`f:t5ebsr`), and a rename
     rewrites every inbound token in one commit on `main` (`f:z4j689`). That is a thin answer: the
     token's form is on neither page, and where a token is live or inert is a cover on
     `link-content-with-references` itself. Filed as Docs content friction; the intro names this
     reason in one clause, and the out-of-scope list sends links in use to that page (see
     Departures).

6. **The developer with a symptom, from a search.**
   - Who and why: an editor's save refused with one banner, a frontmatter key gone after an editor's
     save, or an `address-collision` advisory on the edit page.
   - Knows: their site and the symptom. Lacks: the behavior behind it (`f:hdrzxd`, `f:ggzzur`,
     `f:69j91g`, `f:9270mo`).
   - The page explains each behavior; `docs/extend/debug-your-site.md` is the extend recovery surface
     that matches symptoms to log events. Reader 1's reason (refusals and dropped keys) covers this
     reader in the intro; no separate sentence, and the body's Address collisions section links the
     log-event row.

**Readers in the wrong place**, each named in the out-of-scope list with the page they belong on:

- Came to write the declaration (the `defineAdapter` call, permalinks and `datePrefix`, tags,
  `refine` and `behavior.validate`): `define-an-adapter-and-schema`.
- Came to wire a reference field, render a resolved one, or learn where a `cairn:` link is live:
  `link-content-with-references`.
- Came about the scaffold's fragments concept or the include directive:
  `reuse-content-across-entries`. The intro never calls `fragments` reserved (plan, Drafting
  constraints).
- Came about how an entry's body renders: `write-a-markdown-component`.
- Came for one builder's every option: the "Fields" table in `docs/reference/core.md`. The body's
  Field options section links it in its second sentence; the intro adds no fifth out-of-scope item.

## Background the page rests on

1. **The general model.** Every entry is a markdown file in the site's repository, and it belongs to
   a concept: one entry in the adapter's `content` map, a directory plus a fieldset (`f:5eum60`,
   `f:8zdux6`). The content map is one of the adapter's seams (`f:i87sd3`). The engine hard-codes no
   concept (`f:4esdoz`), so posts and pages are the scaffold's declarations, and neither name is
   reserved (`f:5eum60`). Every concept takes the one shape, and the set is the site's to declare,
   with no open-ended collection model (`f:kn5rze`). Every behavior the engine gives a concept comes
   from that declaration: the admin list and editor (`f:rpbh0p`, `f:vs77a6`), the form, validator,
   and type (`f:phdgof`), public pages or none (`f:s2zbzm`), and a manifest row (`f:t5ebsr`).
2. **Why the fieldset is the single source.** No second place declares a field, so the form, the
   validator, and the type cannot drift apart (`f:phdgof`). The rule reaches the file on disk: a save
   writes frontmatter from the validator's normalized output alone, so an undeclared key disappears
   at the first save (`f:ggzzur`; verified this run at
   `src/lib/sveltekit/content-routes-entry-write.ts`, `serializeMarkdown(result.data, body)`), which
   is why the five keys the engine reads by name must be declared (`f:69j91g`). The validator runs
   before any commit, so an invalid value never reaches the repository (`f:hdrzxd`).
3. **Two moments of refusal, and one warning.** A container nested too deep, a dotted key, or a
   malformed `pattern` throws when the adapter module loads (`f:68fh1k`, `f:t4hh8w`, `f:8fv57g`); a
   value that breaks a declared rule is refused at the save (`f:hdrzxd`); a shared address only warns
   and fails open (`f:9270mo`). No fact states why the collision check is warn-only, so the intro
   gives no reason.
4. **Identity before address.** The filename stem is the id, the only identity an entry has
   (`f:46edxb`); the entry's date is a field, never the filename (`f:zce3pt`); the routing shorthand
   decides whether that identity becomes a public address (`f:s2zbzm`). No fact says why `'page'` is
   the default, so the intro gives no reason for it.
5. **GitHub's place.** The markdown files in git stay the source of truth, and the committed content
   manifest summarizes them so request-time admin code reads the content graph without crawling
   GitHub entry by entry (`f:z5boz6`). A publish patches the manifest in the same commit as the
   entry, and a build regenerates and verifies it (`f:t5ebsr`); a rename is one atomic commit on
   `main` (`f:z4j689`). The holding branch is Architecture's to explain; the intro need not name it.
6. **SvelteKit's place.** The fieldset's inferred TypeScript type is what the site's own SvelteKit
   code reads entries as (`f:phdgof`). The intro names SvelteKit only there. The typed public index
   (`f:hv8qs9`) belongs to `build-the-public-routes`, and the declaration itself is plain TypeScript
   in the adapter module, not a route file.
7. **Cloudflare, left out on purpose.** No part of the model lives in a Cloudflare binding: content
   and both manifests are git files, D1 holds auth and operational rows and never an entry body, and
   R2 holds media bytes (`f:pgy0mr`, `f:6ign7q`). Naming Cloudflare in the intro would suggest a
   binding the model needs; Architecture's data tiers carry the point for the reader who comes from
   there.
8. **The familiar thing to relate the fieldset to.** The reader knows HTML form inputs, and several
   builder options share a name with an input attribute but not its behavior: the `text`,
   `textarea`, and `date` constraints are checked at the save and never rendered on the input
   (`f:8fv57g`, `f:t7cr8o`), and `pattern` matches anywhere in the value (`f:7l7y5l`), where the HTML
   attribute must match the whole value (`f:n26z3j`, filed this run). `required` does render as the
   HTML attribute (`f:u9rvl3`), so the intro says "some" or "such as", never "every".
9. **Names the intro must not over-promise.** "Posts and pages are not reserved" is true; "any name
   works" is not. Eight admin view ids throw at composition (`f:kd8yk1`), `site` throws only when the
   public indexes are built (`f:hv8qs9`), and `fragments` carries the include directive. The plan
   keeps all three off the page; the split checks are filed as Engine friction.

## Place in the doc set

- **Group and neighbors.** Model content, first of seven pages, and the group's only concept page;
  the other six are task guides that build on it: `define-an-adapter-and-schema`,
  `write-a-markdown-component`, `link-content-with-references`, `reuse-content-across-entries`,
  `configure-media`, `migrate-existing-content`. The intro frames the model those guides act on,
  without naming the group or listing the guides beyond the out-of-scope four.
- **Links in, on disk.** `docs/extend/architecture.md` lines 22 (out of scope), 69 (seams table), and
  194 (related resources); `docs/extend/scaffolded-site-files.md` line 546 (see also). No reference
  page links here, and the setup command prints no link to it.
- **Links in, planned.** `define-an-adapter-and-schema` (preconditions), `migrate-existing-content`
  (crossLink: the id and date rules), and `link-content-with-references` (out of scope: the
  `cairn:` link model).
- **Links out.** The outline's crossLinks to `define-an-adapter-and-schema`,
  `link-content-with-references`, and `reuse-content-across-entries`; `write-a-markdown-component` from the
  out-of-scope list; `architecture` from the prior-knowledge sentence; the body's reference links.
- **What siblings already say, so the intro words it fresh.**
  - Architecture's intro opens on content as markdown in the site's git repository and states that
    one adapter feeds every route factory and that the engine hard-codes no concept, directory, or
    field (`docs/extend/architecture.md:3,26`). This intro starts one level down, at the entry and
    the concept it belongs to, and gives the hard-coding point only as its consequence for the
    reader (posts and pages are declarations), never as Architecture's sentence.
  - The tutorial and Scaffolded site files both say content is markdown with YAML frontmatter, one
    directory per concept, named by the concept's `dir`
    (`docs/extend/add-cairn-to-a-sveltekit-app.md:599`, `docs/extend/scaffolded-site-files.md:421`).
    The intro does not repeat that sentence.
  - Architecture explains why the admin reads the manifest on its read path and defines the term.
    The intro uses the manifest as the record of what a declaration produces, not as a second
    read-path explanation.
  - `define-an-adapter-and-schema` owns writing the declaration and the normalized-frontmatter
    detail; the intro mentions refusals and dropped keys only as consequences of the model.
- **Terms this page defines** (outline `terms`): concept, fieldset, entry id, routing. The intro
  introduces concept and fieldset; the body defines the other two.

## Intro plan

Three paragraphs, then the plan's three bounds parts. Word every sentence fresh; the sketches below
carry the claims and their order, not the wording. No paragraph names the adapter file; if a drafter
adds one, it names both sites' paths (`f:q07rd5`).

1. **The subject and why it exists.** Open on a statement from the reader's situation: every entry
   an editor opens in a cairn site's admin is a markdown file in the site's repository, and it
   belongs to a concept, one kind of content the site declares in its adapter as a directory of such
   files and a fieldset describing their frontmatter (`f:5eum60`, `f:8zdux6`, `f:rpbh0p`). Then the
   demystifying consequence: the engine builds in no kind of content, so the posts and pages a
   scaffolded site starts with are its adapter's declarations, like any concept the site adds
   (`f:4esdoz`, `f:5eum60`). Then the one-shape rule: every concept takes that same shape, and the
   site chooses the set, with no open-ended collection model beside it (`f:kn5rze`).
2. **What the declaration decides, and where GitHub and SvelteKit sit.** The declaration is the only
   place the engine learns about a concept, so it decides the form editors fill in, the checks a
   save runs before anything is committed, the TypeScript type the site's SvelteKit code reads
   entries as, whether an entry gets a public address, and what the committed content manifest
   records about it (`f:phdgof`, `f:hdrzxd`, `f:s2zbzm`, `f:t5ebsr`). A save writes back only the
   frontmatter keys the fieldset declares (`f:ggzzur`). The files in git stay the source of truth:
   the filename gives the entry its id (`f:46edxb`), and the manifest summarizes the files so the
   admin reads the whole content graph without crawling GitHub entry by entry (`f:z5boz6`). No
   sentence names Cloudflare (Background 7). The body's closing sentence in Renames restates the
   same synthesis (`f:5eum60`, `f:phdgof`); this paragraph frames it as the premise, so the two
   share the claim and never the wording.
3. **Each reader's reason.** Knowing the model before writing a declaration lets a developer predict
   what the engine refuses when the adapter module loads, such as a container nested too deep or a
   malformed pattern, what a save refuses, and which options behave unlike the HTML input
   attributes whose names they share (`f:68fh1k`, `f:8fv57g`, `f:hdrzxd`, `f:7l7y5l`, `f:n26z3j`,
   `f:t7cr8o`). A developer who took over a scaffolded site finds what its posts and pages concepts
   are and what a dated filename means; a developer moving markdown from another system finds the
   id, date, and frontmatter-key rules its files must meet (`f:46edxb`, `f:zce3pt`, `f:69j91g`); a
   developer weighing cairn finds the model's limits, a fixed set of field builders with no seam for
   another type and containers one level deep (`f:2hxm4t`, `f:im6x7r`, `f:68fh1k`); and a reader
   following internal links between entries finds how the manifest records them and how a rename
   rewrites them in one commit (`f:t5ebsr`, `f:z4j689`). The sentence may split per reader; it
   keeps every reason. Spell no numeral for the builders here unless the sentence cites `f:2hxm4t`.

Then the plan's bounds, unchanged except where Departures says:

- **What the page covers** (Google part 1): the plan's seven subjects in body order, as a bulleted
  list of plain subjects with no code span or numeral, under a complete lead-in that names the
  subjects and never the page or "parts". No merge: each item maps to a body heading.
- **Prior knowledge** (Google part 2): TypeScript literal types and inference, YAML frontmatter,
  JavaScript regular expressions, and HTML form input attributes; a reader new to the adapter reads
  Architecture first for where the content map sits among the seams (`f:i87sd3`). The HTML item now
  pays off paragraph 3's contrast.
- **What the page doesn't cover** (Google part 3): the plan's four items, subject first and page
  last, under a lead-in that never names the page, with item 2 widened (Departures).

Fact ids the intro draws on: `f:5eum60`, `f:8zdux6`, `f:rpbh0p`, `f:4esdoz`, `f:kn5rze`,
`f:phdgof`, `f:hdrzxd`, `f:s2zbzm`, `f:t5ebsr`, `f:ggzzur`, `f:46edxb`, `f:z5boz6`, `f:68fh1k`,
`f:8fv57g`, `f:7l7y5l`, `f:n26z3j`, `f:t7cr8o`, `f:zce3pt`, `f:69j91g`, `f:2hxm4t`, `f:im6x7r`,
`f:z4j689`, `f:i87sd3`.

## Departures from the plan's introduction

- **Opening sentence.** The plan's sketch ("Every entry an editor writes in the admin and every page
  the public site builds from markdown belongs to a concept the site declares in its adapter") becomes
  a sentence that also says each entry is a markdown file in the site's repository and names the
  concept's two halves. Why: the concept anatomy wants the summary paragraph to introduce the
  concept, the scaffolded-site reader arrives looking at files, and git's place in the model belongs
  in the first paragraph rather than only in the manifest section.
- **Why it matters, widened.** Adds `f:ggzzur` (a save writes back only declared keys), `f:hdrzxd`
  (checks before any commit), `f:z5boz6` (git as the source of truth), and the HTML-attribute
  contrast (`f:7l7y5l`, `f:n26z3j`, `f:t7cr8o`). Why: the house ruling asks the intro for the
  reasoning the body leaves out, and the body states the five engine-read keys without the general
  rule beneath them, and states the `pattern` edge without the HTML behavior that makes it an edge.
- **Readers.** Adds three readers to the plan's four: the migrator (outline crossLink from
  `migrate-existing-content`), the `cairn:` link follower (`link-content-with-references`'s
  out-of-scope pointer), and the symptom reader from a search, who shares reader 1's sentence. The
  plan's fourth reader, the one who came to write the declaration, stays in the out-of-scope list.
- **Out-of-scope item 2.** "Reference fields in use" becomes "Reference fields and internal links
  between entries in use", still pointing at `docs/extend/link-content-with-references.md`. Why: the
  map sends a reader here for the `cairn:` link model, and this page gives only the manifest's record
  and the rename; where a link is live or inert is a cover on that page. The item stays free of code
  spans, so it carries no claim the provenance extractor would ask a fact for.
