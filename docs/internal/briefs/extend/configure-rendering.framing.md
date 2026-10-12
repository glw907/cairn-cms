# Framing record: Configure rendering

Agent-facing; drives the introduction of `docs/extend/configure-rendering.md` only; the body follows
the page plan (`docs/internal/briefs/extend/configure-rendering.plan.md`).

Written 2026-10-12 by the intro-framing step of the docs page chain (stage 2b part 1). No earlier
framing record existed. Inputs read: "The introduction" and "The page anatomies" in
`docs/internal/docs-register.md`, plus its "Names" table; `docs/internal/outlines/extend.json` (groups,
every page's job, covers, and outOfScope, the terms, and all 71 crossLinks); `docs/extend/README.md`
and `docs/reference/README.md` (no `docs/README.md` or other arm index exists yet); the opening
sections of every page on disk that links here; the page plan, whole; every fact bullet below; and the
code the new facts trace.

## Who arrives, from where, and why

Every inbound link on disk links the page itself with no anchor. The interim arm index does not list
the page yet; it joins the "Model content" group when it lands. The setup command's output links no
page but `rotate-the-github-app-key`, so no reader arrives from it.

1. **The developer who built a site with the add-cairn tutorial.**
   - From: `docs/extend/define-an-adapter-and-schema.md:40,74,543` ("The `rendering` group"), after
     growing the tutorial's minimal adapter there; or the index's "Model content" group. The tutorial
     itself links only the `defineAdapter` reference and the adapter page at
     `docs/extend/add-cairn-to-a-sveltekit-app.md:341`.
   - Came for: to grow the `rendering` group past the tutorial's empty registry, with components of
     their own, an option, or a typography plugin.
   - Knows: their adapter at `src/lib/cairn.config.ts`, its
     `createRenderer(defineRegistry({ components: [] }))` call, and a `render` that forwards three
     resolvers (`f:q07rd5`, `f:dmn2uu`).
   - Lacks: what the pipeline already does without components, the component contract, and the fact
     that their admin page passes no `registry` to `CairnAdmin`, so the picker never offers what they
     register (`f:rrvh33`; a body matter, see "Background").
2. **The developer on a scaffolded site.**
   - From: the index; `docs/extend/theme-your-public-site.md:38,506` ("builds the components a theme
     styles"); `docs/extend/scaffolded-site-files.md:402`, which lists `markdown-components.ts` but
     does not link here yet; or a search for `defineComponent`.
   - Came for: to add a component beside the scaffold's nine, change an option, or learn what a
     built-in step emits before styling it.
   - Knows: a working render with one `createRenderer` call, the smartypants plugin, and nine
     declarations in `src/theme/markdown-components.ts` to copy from (`f:q07rd5`, `f:dat0dd`,
     `f:qnf469`, `f:u4cfvv`).
   - Lacks: the contract behind those nine (slot kinds, the build context, the picker members), the
     authoring grammar, and which output the engine writes on its own.
3. **The developer who just set up fragments.**
   - From: `docs/extend/reuse-content-across-entries.md:45-47` (the note: when a block should differ on
     each use, register a custom public component) and its see-also at line 361; the outline's
     crossLink names "components as the alternative to a fragment".
   - Came for: a block that varies on each use, which a fragment's fixed text can't do.
   - Knows: the `::include{fragment="<id>"}` leaf form and the fragments concept.
   - Lacks: that a component is written only in the container form, `:::name`; the leaf habit they
     just learned renders a component as literal text (`f:fqdknx`).
4. **The developer adding an island.**
   - From: `docs/extend/add-an-island.md:26,37,40,284`, whose preconditions send them here to declare
     the component first.
   - Came for: to declare the component and the `build()` output that becomes the island's static
     fallback, then return (`f:htxey1`, `f:4hd2vg`).
   - Knows: Svelte runes, SvelteKit layouts, and what an island is.
   - Lacks: `defineComponent`, the build context, and registration. `hydrate` stays one clause here.
5. **The developer weighing render safety.**
   - From: `docs/extend/security-model.md:49,520` ("the renderer's options"); the outline's crossLink
     runs the other way, from here to `security-model` before a site opts out.
   - Came for: to set an option, such as widening the sanitize allowlist or changing the anchor `rel`,
     after reading what the floor protects (`f:wvcw71`, `f:7fw82j`).
   - Knows: the floor, the sink guard, and the pipeline's order.
   - Lacks: where the options go, which is `createRenderer`'s second argument. A reader who wants what
     the floor protects, or the cost of turning it off, is in the wrong place and belongs on
     `docs/extend/security-model.md#render-safety`.
6. **The developer mapping the system.**
   - From: `docs/extend/architecture.md:70` (the seams table's `render` row) or
     `docs/extend/content-model.md:26,206` ("Rendering an entry's body").
   - Came for: what the render seam takes and how an entry's markdown becomes HTML.
   - Knows: the adapter, the seams, and the concept model.
   - Lacks: the `SiteRender` shape, `createRenderer`, and where the function runs. The intro's first
     paragraph serves this reader; many stop there.
7. **The developer chasing a render symptom.**
   - From: a search, with a directive printed as literal text, a code block with no token colors, a
     startup throw that names a component, or a component missing from the picker.
   - Came for: the cause. `docs/extend/debug-your-site.md` has no render row (friction filed by the
     plan), so this page's "Diagnose a failed check" is their only home.
   - Knows: their own site. Lacks: the grammar rule and the preloaded-language rule behind the two
     commonest symptoms (`f:fqdknx`, `f:dni13r`).
8. **Readers in the wrong place**, each with the page they belong on (the plan's bounds list routes
   the first five): styling the output, `docs/extend/theme-your-public-site.md#style-rendered-markdown`;
   hydrating a component, `docs/extend/add-an-island.md`; what the sanitize floor and sink guard
   protect, `docs/extend/security-model.md#render-safety`; fragments and `::include`,
   `docs/extend/reuse-content-across-entries.md`; a missing image or the media resolver,
   `docs/extend/configure-media.md`. Not routed in the intro: an editor who wants to insert a
   component (the editor documentation has no page yet, so there is no destination to give); a
   developer after the public entry route itself (`build-the-public-routes` is not on disk, so a link
   would fail the gate); and a developer migrating another system's shortcodes, whose crossLink comes
   from `migrate-existing-content`, a page not on disk, and whose reason no fact backs.

## Background the page rests on

- **The general model.** A site has one render function, the adapter's required `rendering.render`,
  and the edit page's live preview and every public page call that same function, so there is no
  second render path to keep in step (`f:3l7f56`, `f:5vjwlc`). The site usually builds it with
  `createRenderer` (`f:qvj951`), whose pipeline already renders plain markdown, GFM tables, `cairn:`
  links, and `media:` references with no component registered (`f:dmn2uu`). What a site adds plugs
  into that one call: options and plugins as its second argument (`f:wvcw71`), and a registry of
  custom public components as its first (`f:uqytbb`). A component is a container directive in the
  markdown that the site's own `build` turns into markup (`f:fqdknx`, `f:htxey1`), and the registry
  is read by both the render and the editor's component picker (`f:uqytbb`). This is the outline's
  "render" and "component" terms, both defined on this page, so the introduction is where each first
  gets its meaning.
- **Why the site supplies the render at all.** cairn ships no public design: the admin is built with
  DaisyUI and Tailwind, while each site brings its own `render` for its public pages (`f:8n6qc8`,
  owner tier, key phrase "Public output stays design-agnostic"). A sentence that uses the key phrase
  must cite it; prefer fresh wording, since `docs/extend/theme-your-public-site.md:3-4` opens on that
  same idea, and cite `f:8n6qc8` either way.
- **Why one function and not two.** The preview is useful only if it shows what the page will show;
  with one function, it can't drift (`f:3l7f56`).
- **Where SvelteKit fits.** The same function runs in two runtimes. The edit page calls it in the
  editor's browser, from a Svelte effect that reruns as the author types, and discards a stale result
  (`f:my6ci3`, `f:vo5v7n`); the public entry route calls it from a SvelteKit server `load` in
  `+page.server.ts`, on both the scaffold and the tutorial's site (`f:vo5v7n`). Because the admin page
  passes the adapter's `render` to `CairnAdmin` as a prop, the adapter module and everything its
  render imports, components and plugins included, load in the admin's client bundle (`f:vo5v7n`).
  The split between prerendering at build and rendering per request stays out of the introduction:
  the plan's structural edit moved it to the closing explanation of "Build the render function",
  where the reader has just wired the two callers.
- **Cloudflare, left out on purpose.** The render does nothing Cloudflare-specific. Both sites
  prerender their entry routes, so the public render runs at build; only a site that turns
  prerendering off renders per request in the Worker, and that choice belongs to the routes, not to
  this page. Naming the Worker would raise a runtime question the page doesn't answer.
- **GitHub, left out on purpose.** The render reads a markdown body and returns HTML; it commits
  nothing and reads no repository. The write path is `architecture`'s.
- **Body consequences outside this step** (the plan is fixed for this step; each is filed so the chain
  can act):
  - `f:rrvh33`: the picker reads only the `registry` prop the admin page passes to `CairnAdmin`. The
    tutorial's admin page passes `render` alone, so the plan's "Register the component" steps leave a
    tutorial reader with no insert trigger, and "Verify the render" step 2 fails on that site. This
    also answers the plan's held-back picker cause in "Diagnose a failed check". In the
    introduction, state the registry as read by both the render and the picker, and never imply that
    registering once reaches both.
  - The plan's "Built-in render steps" says no highlighter ships to the browser (`f:dwc2bu`). That
    holds for public pages only: the preview runs the pipeline in the editor's browser, and Shiki's
    async chunk loads there (friction filed). Scope the claim to public pages.
  - `f:my6ci3`'s source points at stale lines; the effect now sits at
    `src/lib/admin/EditPage.svelte:1451-1486` (friction filed). The claim itself holds.

## Place in the doc set

- **Group and order.** "Model content", third of seven in the outline: `content-model`,
  `define-an-adapter-and-schema`, this page, `link-content-with-references`,
  `reuse-content-across-entries`, `configure-media`, `migrate-existing-content`. The page sits where
  the adapter's declaration hands off its `rendering` group, ahead of the pages that put links,
  fragments, and media into the body the render consumes.
- **What links in, and why.** `define-an-adapter-and-schema` hands off the `rendering` group;
  `architecture` maps the `render` seam here; `content-model` sends "rendering an entry's body";
  `reuse-content-across-entries` sends a block that varies on each use; `add-an-island` sends the
  component declaration; `security-model` sends the renderer's options; `theme-your-public-site`
  sends the components a theme styles. The outline adds `migrate-existing-content` (shortcodes),
  not yet on disk.
- **What this page links out to, from the outline's crossLinks.** `security-model` (what the floor
  and sink guard protect before an opt-out), `add-an-island` (hydrating a component),
  `theme-your-public-site` (styling the output), and `configure-media` (the media resolver `render`
  forwards and what a missing asset renders).
- **What siblings own, and what the introduction must word fresh.**
  - `theme-your-public-site` opens on the admin-versus-public split, with each site bringing its own
    render and styles, and on the preview frame rendering through the same `render`. Take the
    render's side of that idea, the HTML an entry turns into, and don't restate the styling side.
  - `add-an-island` opens on a component rendering as static markup, the body reaching the page as
    the string `render` returns, and the build-versus-per-request split. Don't open on a component's
    static output, and keep the split out (the plan already does).
  - `reuse-content-across-entries` already explains that `render` forwards `resolveFragment` and what
    dropping it costs; the introduction names resolvers not at all.
  - `define-an-adapter-and-schema` calls the `rendering` group "the `render` function, plus optional
    `islands`"; the introduction need not list the group's members.
  - `architecture`'s seam row says only "a renderer built with `createRenderer`"; the introduction is
    where that row's reader gets the model.
- **Names.** "The engine" for the npm library; "custom public component" at first mention for a
  component the site writes, never "site component" (`Cairn.ComponentNames`, error) and preferably
  not "custom component" (warning); "the admin"; "the add-cairn tutorial" and "a scaffolded site", as
  the plan uses them.

## Intro plan

The introduction sits under the H1 with no heading: three paragraphs, then the plan's two bounds
(prior knowledge and what the page leaves out). The opening sentence is a statement about the subject
from the reader's situation, never an imperative and never a sentence about the page.

1. **The model, why it exists, and where it runs.** Open on the subject: every entry on a cairn site
   becomes HTML through one function the site supplies, the adapter's `rendering.render`, and the
   edit page's live preview and every public page call that same function, so the preview can't drift
   from the published page (`f:3l7f56`). Say why the site supplies it: the engine ships no public
   design, so the HTML an entry turns into is the site's to decide (`f:8n6qc8`; fresh wording, see
   "Place in the doc set"). Say what the engine supplies: `createRenderer` builds the function from
   the engine's pipeline, which renders plain markdown, tables, `cairn:` links, and `media:`
   references before the site adds anything (`f:qvj951`, `f:dmn2uu`). Say where SvelteKit fits: the
   preview calls the function in the editor's browser as the author types, and the public entry
   route calls it from a server `load`, so the function and everything it imports, its components and
   plugins included, run in both places (`f:my6ci3`, `f:vo5v7n`). Close on components: a custom
   public component is a container directive in the markdown that the site's own `build` turns into
   markup, and one registry of them is read by both the render and the editor's component picker
   (`f:fqdknx`, `f:htxey1`, `f:uqytbb`). Keep this paragraph to five or six sentences. No
   build-versus-per-request split, no resolver names, and no claim that one registration reaches both
   readers of the registry.
2. **The two sites, and the contract.** The plan's two readers, each with their reason. On the add-cairn
   tutorial's site, the adapter at `src/lib/cairn.config.ts` renders over an empty registry, so its
   developer works through every section (`f:q07rd5`, `f:dmn2uu`). On a scaffolded site, the adapter
   at `src/theme/cairn.config.ts` already has the render, the smartypants plugin, and nine components
   in `src/theme/markdown-components.ts`, and its developer comes to add a component beside them,
   change an option, or learn what a built-in step emits (`f:q07rd5`, `f:dat0dd`, `f:qnf469`). Then
   the anatomy's one-line contract, kept from the plan: build the render function, set its options,
   add a remark plugin, declare and register a custom public component, and check that the preview
   and the published page render it the same way (no claim). The skip list for the scaffolded reader
   stays in "Before you begin", not here.
3. **The narrower arrivals.** One clause per reason, so each reader learns at once whether the page
   answers it. A block that has to differ on each use, which a fragment's fixed text can't do, is a
   component whose attributes each use sets (`f:htxey1`, `f:cxhx8w`). An island starts as a component
   declared here, whose `build` output stays as the static fallback (`f:4hd2vg`). A renderer option,
   such as a wider sanitize allowlist or a different anchor `rel`, is set here (`f:wvcw71`,
   `f:7fw82j`). A developer chasing a symptom, such as a directive printed as literal text or a code
   block with no token colors, starts at "Diagnose a failed check", linked by its anchor
   (`f:fqdknx`, `f:dni13r`). Name `docs/extend/reuse-content-across-entries.md`,
   `docs/extend/add-an-island.md`, and `docs/extend/security-model.md` only through the bounds list
   below, so a sibling is linked once in the introduction.

Then the plan's bounds, unchanged in substance:

- **Prior knowledge**, one sentence: TypeScript, the unified plugin model (a remark plugin works on
  the markdown tree, a rehype plugin on the HTML tree), and building a hast element with
  hastscript's `h()` (`f:2dsv35`); no cairn knowledge beyond the adapter file.
- **What the page leaves out**, a lead-in sentence that may name the page, then the plan's five items,
  each with its link: what the sanitize floor and sink guard protect and what turning the floor off
  costs (`docs/extend/security-model.md#render-safety`); hydrating a component in the browser
  (`docs/extend/add-an-island.md`); styling the rendered output
  (`docs/extend/theme-your-public-site.md#style-rendered-markdown`); fragments and `::include`
  (`docs/extend/reuse-content-across-entries.md`); the media resolver and missing assets
  (`docs/extend/configure-media.md`).

After drafting, reread the introduction against the body with Google's check: does it give an
accurate overview of what the page covers?

## Departures from the plan's introduction

- **Paragraph 1 adds why the site supplies the render** (`f:8n6qc8`). The plan's item 1 gives the
  model but not why it exists, which the register's "frames the page from above" ruling asks for.
- **"In the browser" and "server `load`" rest on `f:vo5v7n`, filed by this step.** The plan cites
  `f:my6ci3` for the browser claim, but that fact says only "an effect"; the new fact traces the
  effect, the admin page's prop, and both sites' server loads, with Svelte's rule that an effect runs
  only in the browser. Paragraph 1 also adds one clause the plan lacks, that the function's imports
  run in both places, because a developer choosing a plugin or writing a `build` needs that model and
  no body section states it.
- **Paragraph 3 is new.** The plan's item 2 names two readers by the site they start from. The map
  shows four more arrivals with narrower reasons (from `reuse-content-across-entries`,
  `add-an-island`, `security-model`, and a symptom search), and `debug-your-site` has no render row,
  so the symptom reader has no other home. Each gets one clause; the plan's two readers and contract
  stay in paragraph 2 unchanged.
- **The registry clause is constrained, not dropped.** The plan's item 1 says one registry feeds the
  pipeline and the picker (`f:uqytbb`), which holds; `f:rrvh33` shows the picker gets it through a
  separate prop, so the introduction states that both read it and never that one registration reaches
  both.
