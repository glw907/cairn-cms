# Framing record: Reuse content across entries

Agent-facing; drives the introduction of `docs/extend/reuse-content-across-entries.md` only; the body follows the page plan (`docs/internal/briefs/extend/reuse-content-across-entries.plan.md`). Written 2026-10-12 by the intro-framing step of the docs page chain (stage 2b part 1, run 2).

## Who arrives, from where, and why

1. **The developer turning fragments on, on the tutorial's site.**
   - Who: the developer on the site that Add cairn to a SvelteKit app builds, whose adapter is `src/lib/cairn.config.ts` (`f:q07rd5`) and whose content module is `src/lib/content.ts` (`f:60zw5n`).
   - From: Content model's two pointers (`docs/extend/content-model.md:25`, its out-of-scope bullet "Fragments and the include directive", and `:205`, its Related resources row; the outline's crossLink reason is "The reserved fragments concept"), the extend index's Model content group once the page lands, or a search for shared or reusable content.
   - Came for: one passage (a notice, a contact block) shown in several entries and kept in one place.
   - Knows: the adapter, `defineConcept`, an `import.meta.glob` passed to `createSiteIndexes`, the `cairnManifest` plugin, `npx cairn-manifest`, and a public entry route on `createPublicRoutes`.
   - Lacks: that `fragments` is a reserved key that must use `routing: 'embedded'` (`f:ojydmz`, `f:7wiuwr`); that the concept needs a glob in two places and that a missing plugin entry fails with no error (`f:60zw5n`, `f:i6zyab`, `f:7az6m2`); that the render must forward `resolveFragment` (`f:k84qwy`); the include syntax (`f:0w7xeu`); when an edit reaches the public site; and what the guards catch.

2. **The developer on a scaffolded site.**
   - Who: a developer who took over a site the setup command scaffolded, whose adapter is `src/theme/cairn.config.ts` (`f:q07rd5`).
   - From: their own tree and admin, which already hold `src/content/fragments/trail-safety-notice.md`, the include line in the about page and in a post, a Fragments screen, and the Include a fragment control (`f:n5d65u`, `f:kcm3gf`, `f:rolr87`, `f:tj3h4c`); Scaffolded site files, which lists `fragments/` and the sample file without linking anywhere for them (`docs/extend/scaffolded-site-files.md:108,423`); or the agent guidance the scaffold ships.
   - Came for: adding a fragment of their own; replacing the placeholder content, where the admin refuses to delete the sample fragment while the about page and a post include it (`f:3vndvj`, `f:rolr87`); checking that a render they replaced still forwards the resolver (`f:k84qwy`, `f:xjkgtp`); or learning what else the engine refuses.
   - Knows: fragments work on their site.
   - Lacks: what each of the four wiring pieces does, and which ones fail silently if they edit one; that the delete guard counts an include only once its entry is published (`f:t5ebsr`); the one-pass rule (`f:82eo9p`). The shipped `cairn-public` skill tells this reader's agent that a missing fragment renders a notice and "the page keeps building", which holds only for an include that names no fragment (`f:bfiuem`, `f:xjkgtp`; friction filed), so the reader may arrive expecting a missing fragment to degrade quietly.

3. **The developer choosing how to reuse a block.**
   - Who: a developer, possibly weighing cairn against another CMS, who has the same passage in several entries and knows the idea as reusable blocks, snippets, or partials.
   - From: a search, the extend index, or Content model.
   - Came for: which of cairn's mechanisms fits.
   - Knows: markdown and their own content.
   - Lacks: cairn's three-way split. A fragment copies one fixed passage verbatim and its include takes only an id (`f:880bg6`, `f:0w7xeu`). A custom public component varies per use through the attributes it declares (`f:htxey1`). A reference field stores another entry's id in frontmatter, and the site's template renders that entry, as a scaffolded post's `author` does (`f:563h9u`, `f:wyrefs`). Paragraph 1 and the Note serve this reader, and the bounds send them on when the answer is one of the other two.

4. **The developer whose include does not render.**
   - Who: any developer on a site with fragments.
   - From: a search on a build error (`cairn: fragment "<id>" not found`, the `requires routing: 'embedded'` throw, or the `has no glob passed` throw), on a literal `::include{...}` line on a public page, or on an `include.missing` record in Workers Logs. `docs/reference/log-events.md:52` holds the event's row but links nowhere here, and Debug your site has no include row (the plan filed that friction).
   - Came for: the cause and the fix.
   - Knows: the symptom.
   - Lacks: which wiring piece or authoring fault produced it (`f:xjkgtp`, `f:k84qwy`, `f:bfiuem`, `f:7wiuwr`, `f:60zw5n`). "Diagnose an include that does not render" serves this reader, so the introduction names that heading and lets them skip the setup.

5. **The developer arriving from Link content with references.**
   - Who and from: a developer on the pending references page, whose outline crossLink reason is "The delete guard shape both share".
   - Knows: reference fields and their delete guard.
   - Came for: how a fragment's guard compares.
   - Lacks: only the fragment side. "Guards that keep includes valid" serves this reader, and paragraph 2's guard sentence tells them early that the page covers it; no sentence of their own.

Readers in the wrong place, each with the page they belong on:

- A developer whose block should differ on each use (its own title or link per entry) belongs on `docs/extend/configure-rendering.md` (pending), which owns custom public components and their attributes (`f:htxey1`). The Note sends them.
- A developer who wants each entry to show a different related entry, such as a post's author, belongs on `docs/extend/link-content-with-references.md` (pending) (`f:563h9u`, `f:wyrefs`). The out-of-scope bullet sends them.
- An editor who wants to use the Include a fragment control belongs in the editor documentation, which has no page yet, so the bounds name it in words with no link (`f:0w7xeu`, `f:tj3h4c`).

## Background the page rests on

1. **A fragment is an entry.** Fragments live under the reserved `fragments` concept key as markdown files in `src/content/fragments/`; the scaffold's declaration gives each a required `title` field (`f:880bg6`, `f:ojydmz`, `f:n5d65u`). An `'embedded'` concept keeps its admin list and edit screen exactly as a routable one does, and loses only the public page (`f:vs77a6`, `f:s2zbzm`), so editors keep fragments on a Fragments screen like any other content (`f:n5d65u`, its `label`). The outline's glossary defines the term "fragment" on this page, so the introduction is its home.

2. **Why the key is reserved and the routing is fixed.** The include directive resolves against that one concept key, which the composition throw's own message says: "the include directive resolves against it" (`f:7wiuwr`). A fragment has no permalink and reaches a reader only through an entry that includes it (`f:880bg6`), so `'embedded'` is the only routing that fits. Content model never states the reservation: its routing table gives `authors` as the `'embedded'` example (`docs/extend/content-model.md:168`), so a reader learns that `fragments` is reserved here first.

3. **Why the splice happens at render time.** An including entry's file keeps only the `::include{fragment="<id>"}` line, and `remarkResolveIncludes` replaces it with the fragment's parsed body each time that entry renders, ahead of the directive stamp, `cairn:` links, figures, and `media:` references (`f:72pqil`). Two consequences follow. One edit to the fragment changes every including entry at its next render, and a component, a `cairn:` link, or a `media:` reference inside a fragment resolves as if typed into the entry (`f:72pqil`).

4. **When an edit reaches the public site (where GitHub and SvelteKit fit).** The admin preview reruns the site's render on a debounce as the body changes, with its own resolver, while the public routes render inside the entry loader, at build on a prerendered route and per request otherwise (`f:my6ci3`, `f:xjkgtp`). Either way, the public pages read the markdown in the deployed commit, never GitHub per request (`f:1mkckz`). A publish copies the entry onto the default branch, which starts the site's deploy (`f:cjonmm`). So a fragment's edit reaches its including pages in the deploy that the fragment's publish starts, and "next render" on the public site means that deploy, never the moment of saving or publishing.

5. **Who supplies what (where SvelteKit and Vite fit).** The engine owns the splice and the resolver: for each public entry page, `createPublicRoutes` builds one with `createFragmentResolver` and passes it to the site's render, the admin preview passes its own, and the site's render only forwards it (`f:xjkgtp`, `f:zv3q45`). The engine also gives editors the Include a fragment control, which appears only when the site declares the concept (`f:0w7xeu`, `f:tj3h4c`). The site owns three wiring points and a render that forwards: the concept on the adapter, an `import.meta.glob` passed to `createSiteIndexes` in its content module, the same glob in the `cairnManifest` Vite plugin's `content` option, and a `rendering.render` that forwards `resolveFragment` (`f:ojydmz`, `f:60zw5n`, `f:i6zyab`, `f:k84qwy`; the scaffold's three files are `f:n5d65u`). The globs are site code because the public index is built from the site's own globs, which keeps the resolver in the prerender graph (`f:1mkckz`).

6. **Four pieces, four failure modes.** A `fragments` concept with any other routing throws when the runtime composes (`f:7wiuwr`). A missing content-module glob throws at build (`f:60zw5n`). A missing plugin entry gives the concept no manifest rows, with no throw and no warning (`f:i6zyab`, `f:7az6m2`). A render that drops `resolveFragment` publishes every include as literal text with no error (`f:k84qwy`). Two of the four are silent, which is the reason the plan finishes and checks the wiring before the first include.

7. **What the guards cover, and what they leave open.** An include that names a fragment the build can't find fails the build, as a dangling `cairn:` link does, because the public build's resolver throws (`f:xlgfqm`, `f:xjkgtp`). An include that names no fragment never reaches the resolver, so it renders a notice and passes the build (`f:bfiuem`). The admin refuses to delete a fragment while another entry's recorded includes name it, and a fragment's edit screen lists those entries (`f:3vndvj`, `f:7250yh`). Those records are in the content manifest, which a publish patches and a save doesn't, so an include counts once its entry is published (`f:t5ebsr`). No fact says whether a save or a publish checks that a named fragment exists (the plan's friction entry), so the introduction claims "a named include" and "a published entry", never "every include".

8. **One pass deep.** Resolution runs once, and the engine refuses at save a fragment that includes another fragment, rather than ship a directive that can never resolve (`f:82eo9p`). This is body material in "How an include resolves"; the introduction needs none of it.

9. **The right tool.** A fragment's text is the same in every entry that includes it, and the include names the fragment and nothing else (`f:880bg6`, `f:0w7xeu`). A custom public component is code the site writes, declaring optional `attributes` and `slots`, so its output can differ per use (`f:htxey1`). A reference field stores another entry's id in frontmatter, and the site's template renders that entry (`f:563h9u`); the scaffold's posts carry an `author` reference to a page (`f:wyrefs`). So on a scaffolded site, the trail safety notice is a fragment and a post's author is a reference: one copies text, the other points.

10. **Cloudflare, left out on purpose.** Fragments add no binding. The scaffold wires them in three files, none of them `wrangler.jsonc` (`f:n5d65u`), and the resolver stays in the prerender graph, out of the runtime Worker (`f:1mkckz`). The introduction doesn't name Cloudflare.

## Place in the doc set

- **Group and neighbors.** The page is item 8 of 10 in the Model content group: Content model, Define an adapter and schema, Configure rendering, Link content with references, this page, Configure media, Migrate existing content. Of those, only `docs/extend/content-model.md` and `docs/extend/configure-media.md` are on disk; the interim index `docs/extend/README.md` lists only pages in place, so this page joins its Model content group when it lands. No other arm index exists (`docs/README.md`, `docs/admin/`, and `docs/editors/` are absent), and `docs/reference/README.md` lists only reference pages.
- **What links in, and why.** Content model links here twice, for "Fragments and the include directive" and in its Related resources as "fragments" (`docs/extend/content-model.md:25,205`). Link content with references (pending) sends fragments and the include directive here from its introduction's out-of-scope bullet and its See also, and points here in one clause from its admin-guards section, for the delete guard the two share (its plan, `docs/internal/briefs/extend/link-content-with-references.plan.md:175,437,519`). Nothing else links here: the `createFragmentResolver` entry in `docs/reference/delivery-data.md`, the `include.missing` row in `docs/reference/log-events.md`, and Scaffolded site files all describe the machinery without a link.
- **What links out.** Configure rendering, for components as the alternative to a fragment and for the render seam (outline crossLink); Link content with references, for reference fields; Content model's "Routing" and "The content manifest"; the add-cairn tutorial's anchors in "Before you begin"; the reference entries; and Debug your site's "Read the structured logs".
- **What siblings own, and how the introduction words a shared idea fresh.**
  - Content model owns concepts, the routing shorthands, and the manifest's rows. The introduction states the reservation and its consequence (no page of its own) without re-explaining what a routing shorthand is.
  - Define an adapter and schema owns adding any concept, and with it the general trap of a concept missing from the plugin's `content` option. The introduction names that trap only as it bites fragments.
  - Configure rendering owns `rendering.render` as a seam, and custom public components. The introduction counts the forward as one of the site's pieces and leaves the render's model there.
  - Link content with references opens on a reference field that "connects one entry to another", with the build failing on a dangling target and the admin refusing a delete that would strand one. Both pages share those two guards. Word the fragment side from copying a passage, and from a named include, never from connecting entries.
  - Configure media, the next page, opens on "An image in a cairn site lives in two places" and splits its readers with "What the work involves depends on the site" and "Two other readers need one part of the page". This introduction leads each reader with their reason and folds the adapter path into it, so it reads as its own page beside that one.

## Intro plan

Three paragraphs, then the plan's bounds and its Note. No heading. The page plan's three parts stand: what the page covers (paragraphs 1 to 3), prior knowledge, and what it leaves out.

1. **The model, and why a fragment resolves when an entry renders.**
   - Open on a statement from the reader's situation, never an imperative and never a sentence about the page: a passage that several entries share, such as a safety notice, can live in one file instead of a copy in each entry. The scaffold's trail safety notice, which a scaffolded site shows on its about page and in a post, may ground it (`f:kcm3gf`, `f:rolr87`).
   - Define the term next, matching the outline's glossary: that file is a fragment, an entry of the reserved `fragments` concept, and any entry pulls it into its body with `::include{fragment="<id>"}` (`f:880bg6`, `f:0w7xeu`).
   - Editors keep a fragment on its own Fragments screen like any entry, and it has no page of its own: it reaches a reader only inside an entry that includes it (`f:vs77a6`, `f:n5d65u`, `f:880bg6`).
   - The including entry's file keeps only the include line, and the engine splices in the fragment's body each time that entry renders, so one edit to the fragment changes every entry that includes it (`f:72pqil`, scoped to the splice and the next render).
   - On the public site that render reads the deployed commit, so a fragment's edit reaches its including pages in the deploy that its publish starts (`f:my6ci3`, `f:1mkckz`, `f:cjonmm`). Never "instantly", "on save", or "when you publish".

2. **The engine's part and the site's part.**
   - The engine does the splice and builds the resolver that each public entry page hands to the site's render, and it gives editors an Include a fragment control (`f:xjkgtp`, `f:0w7xeu`).
   - It also guards a named include: an include that names a fragment that doesn't exist fails the build, as a dangling `cairn:` link does, and the admin refuses to delete a fragment that a published entry still includes (`f:xlgfqm`, `f:3vndvj`, `f:t5ebsr` scoped to "published"). A clause that the fragment's edit screen lists those entries is optional (`f:7250yh`). Never "every include" (`f:bfiuem`).
   - The site supplies three wiring points and a render that forwards: the `fragments` concept, declared `'embedded'`, on its adapter; a glob for the fragment files passed to `createSiteIndexes` in its content module; the same glob in the `cairnManifest` Vite plugin's `content` option; and a `rendering.render` that forwards `resolveFragment` (`f:ojydmz`, `f:7wiuwr`, `f:60zw5n`, `f:i6zyab`, `f:k84qwy`).
   - Two of the four fail with no error: a plugin entry left out gives the fragments no manifest rows, and a render that drops the resolver prints the include line as literal text (`f:i6zyab`, `f:7az6m2`, `f:k84qwy`). A missing content-module glob stops the build instead (`f:60zw5n`). State these as the code's behavior, never as prose about the page's order.

3. **The readers, and the contract.**
   - On the site the add-cairn tutorial builds, whose adapter is `src/lib/cairn.config.ts`, the reader turns fragments on (`f:q07rd5`).
   - A scaffolded site, whose adapter is `src/theme/cairn.config.ts`, already has every piece and the `trail-safety-notice` fragment, which its about page and a post include (`f:q07rd5`, `f:n5d65u`, `f:xjkgtp` for the scaffold's forward, `f:kcm3gf`, `f:rolr87`). Its developer comes to add a fragment, to check a render they replaced, or to learn what the engine refuses, such as deleting that sample fragment while the two entries include it (`f:3vndvj`, `f:rolr87`).
   - The contract sentence, the one that names what the reader accomplishes, sits inside this framing: you declare the fragments concept, index its files, confirm that your render forwards `resolveFragment`, write a fragment and include it in an entry, and check that it renders.
   - A build error that names a fragment, an include line printed on a page, or an `include.missing` record in the logs sends the reader to "Diagnose an include that does not render", linked by heading (`f:xjkgtp`, `f:k84qwy`, `f:bfiuem`).

Then the bounds, as the plan sets them:

- **Prior knowledge** (plan item 3, unchanged): Markdown with YAML frontmatter, Vite's `import.meta.glob`, and the `::name{key="value"}` leaf-directive form, and no cairn knowledge beyond the adapter file, the content module, and `vite.config.ts`.
- **What the page doesn't cover** (plan item 4): reference fields, framed as pointing rather than copying (a reference field stores another entry's id, and the site's template renders that entry; a scaffolded post's `author` is the optional example), linking `docs/extend/link-content-with-references.md` (`f:563h9u`, `f:wyrefs`); and using the Include a fragment control as an editor, which belongs to the editor documentation, named in words with no link. This sentence may name the page, since scope has no subject-first form.
- **The Note, "Right tool for the job?"** (plan item 5, unchanged, last in the introduction): a fragment's text is the same in every entry that includes it, and the include takes the fragment's id and nothing else (`f:880bg6`, `f:0w7xeu`); when the block should differ per use, register a custom public component, which declares its own attributes (`f:htxey1`), and link `docs/extend/configure-rendering.md`. "Custom public component" is the Names section's term where a bare "component" could read as a built-in. Two or three sentences.

## Departures from the plan's introduction

1. **Paragraph 1 says when an edit reaches the public site.** The plan scopes `f:72pqil` to "next render". A reader who maintains a shared notice asks when the change shows on the live site, and on the public side the next render is the deploy a publish starts (`f:my6ci3`, `f:1mkckz`, `f:cjonmm`). This keeps the plan's ban on "instantly" and "at publish", since it names the deploy rather than the publish.
2. **The plan's model paragraph becomes two.** The plan's item 1 holds both the model and who supplies what. The framing gives the engine-and-site split its own paragraph, because that is where SvelteKit and Vite fit and where the two silent failures belong (`f:i6zyab`, `f:7az6m2`, `f:k84qwy`), which a scaffolded reader who edited a wiring point needs early.
3. **The guard claim is narrower than the plan's.** The plan's item 1 scopes `f:xlgfqm` and `f:3vndvj` to "the build and the admin guard every include". An include that names no fragment passes the build (`f:bfiuem`), and the delete guard counts only a published entry's include (`f:t5ebsr`), so paragraph 2 says "a named include" and "a published entry". The outline's job wording, "keeping every include valid", is not carried either.
4. **A sentence for the reader with a broken include.** The plan's item 2 names two readers. A developer searching on a build error, a literal include line, or an `include.missing` record also lands here, and Debug your site has no include row to send them to, so paragraph 3 names "Diagnose an include that does not render" by heading (register, "A page may serve several readers").
5. **The scaffolded reader's "what the engine refuses" gets its concrete case.** Deleting the sample fragment while the about page and a post include it is the refusal a new owner replacing placeholder content meets first (`f:3vndvj`, `f:rolr87`); "Guards that keep includes valid" answers it.
6. **The out-of-scope bullet frames references as pointing rather than copying,** optionally with the scaffold's post `author` reference (`f:563h9u`, `f:wyrefs`), so a scaffolded reader sees one example of each mechanism on their own site.
