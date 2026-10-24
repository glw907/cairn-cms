# Framing record: Add an island

Agent-facing; drives the introduction of `docs/extend/add-an-island.md` only; the body follows the
page plan (`docs/internal/briefs/extend/add-an-island.plan.md`).

## Who arrives, from where, and why

Every reader is the extend track's Svelte-fluent web developer. They differ in which site they are
changing and in what sent them here.

1. **The developer on a scaffolded site who wants a second island.**
   - From: the extend index's "Public site" group, the write-a-markdown-component page after declaring a
     component (the outline's crossLink "Hydrating a registered component"), or a search after
     meeting the `banner` island in their own tree. `docs/extend/scaffolded-site-files.md` lists
     `src/theme/islands/` (`Banner.svelte`, `registry.ts`) and says the root `+layout.server.ts`
     reads the island registry, but it does not link here.
   - Came for: the short list of changes that adds one more island.
   - Knows: Svelte 5, SvelteKit, their site's files, and a working island to copy.
   - Lacks: which pieces the scaffold already wired and which three changes are theirs (a new
     component, one registry entry, the `hydrate` declaration; `f:mcxxpp`), and that their adapter
     is `src/theme/cairn.config.ts`, not the tutorial's `src/lib/cairn.config.ts` (`f:q07rd5`).
2. **The developer on a site built by hand, the add-cairn tutorial's site in particular.**
   - From: the write-a-markdown-component page, where they declared the component, or the extend index.
   - Came for: making that component respond in the browser, end to end.
   - Knows: Svelte 5, SvelteKit, the tutorial's adapter at `src/lib/cairn.config.ts` (imported as
     `#lib/cairn.config.js`), and its admin layouts.
   - Lacks: every piece of the wiring. `rendering.islands` is an optional adapter member
     (`f:5vjwlc`) and only the scaffold ships the registry module, the root load, and the root
     layout around it (`f:mcxxpp`), so this reader runs every step.
3. **The developer moving markup that needs client script out of an entry.**
   - From: `docs/extend/upgrade-cairn.md:161` ("Move any markup that needed `<script>` into a
     registered component or an island") or `docs/extend/migration-notes.md:16` ("Use a registered
     component or island for that markup"). Neither links this page, so they reach it through the
     index or a search for "island".
   - Came for: a supported home for markup that runs code in the browser, since the render's
     sanitize floor strips author `<script>` by default (`f:z3a58a`).
   - Knows: their old markup and script, and their site.
   - Lacks: the island model (static fallback, live component mounted over it), and which of the
     two homes fits. A registered component alone is enough when the markup needs no behavior.
4. **The developer coming from the contract.**
   - From: `docs/reference/islands.md` (the runtime's contract) or `docs/extend/architecture.md:53`,
     which names `/islands` as the client runtime.
   - Came for: the whole chain in working order, from component to mounted island.
   - Knows: the export names (`hydrateIslands`, `IslandRegistry`, `rendering.islands`, `hydrate`).
   - Lacks: the order the files depend on each other in, and the lean layout form. The reference's
     own layout example imports the adapter (friction log, Docs content, the
     `docs/reference/islands.md` entry), so this reader may arrive with the wrong layout in mind; the
     body teaches the scaffold's form, and the introduction need not mention the conflict.

Readers likely to arrive in the wrong place:

- **A developer who wants a widget inside a route or layout of their own**, not inside an entry's
  markdown. SvelteKit already hydrates a page's own Svelte components (`f:tf4vfb`), so that widget
  needs no island; it is the site's own SvelteKit code, with no cairn page to send them to.
- **A developer whose component only renders markup.** They need
  `docs/extend/write-a-markdown-component.md` alone.
- **A developer who expects the island to run in the admin's edit preview.** Not a wrong page, but a
  wrong expectation the body answers in "Verify the island on the public page" (`f:8o2gbl`). The
  introduction leaves it there.

## Background the page rests on

- **The general model: a public page is a SvelteKit page whose body is markup only.** SvelteKit
  server-renders each page and hydrates it in the browser (`f:tf4vfb`). An entry's body is not part
  of that hydration: the site's `render` resolves to an HTML string (`f:ps54gh`), which the public
  routes produce on the server, at build when the route is prerendered and per request otherwise
  (`f:my6ci3`, scoped to its public-routes clause). A markdown component inside that body is the
  static, server-only markup its `build()` returns, with no client JavaScript (`f:4hd2vg`).
- **Why the default is static.** The body is an HTML string, and the render's sanitize floor strips
  author `<script>` by default (`f:z3a58a`), so an entry carries no client code of its own. The
  floor's reasons and its opt-out belong to the security-model page; the introduction states the
  strip as one clause for reader 3 and explains nothing more.
- **The one condition that changes it, and why the seam exists.** Declaring `hydrate` on the
  component makes the pipeline wrap the same `build()` output in an island boundary carrying the
  directive name and a JSON prop payload, and a live Svelte component registered under that name
  mounts over it in the browser (`f:4hd2vg`). The `build()` output stays as the fallback shown
  before JavaScript runs, and it is the only content a reader without JavaScript sees (`f:1uk9sw`).
  So the seam lets a site keep its entry bodies static and give one component behavior in the
  browser, with nothing lost for a reader without JavaScript.
- **Where SvelteKit fits.** The island is mounted by the site's own SvelteKit root layout, from
  `afterNavigate`, behind a flag its server load returns (`f:drsabs`, `f:ofex2m`). That is body
  matter; the introduction names SvelteKit only for the hydration contrast above (`f:tf4vfb`) and
  for the root layout in the contract sentence.
- **Cloudflare, left out on purpose.** The island runs in the reader's browser, and no step touches
  a Worker binding or `wrangler.jsonc`. The deployed site is one place to check the result
  (`f:8o2gbl`), which the body's verification section owns.
- **GitHub, left out on purpose.** An entry that uses the component publishes like any other entry;
  no step commits through the GitHub App.
- **The two sites.** A scaffolded site keeps its adapter at `src/theme/cairn.config.ts`, imported as
  `#theme/cairn.config.js`, and the add-cairn tutorial's site keeps it at `src/lib/cairn.config.ts`,
  imported as `#lib/cairn.config.js` (`f:q07rd5`). The scaffold ships the island wiring around its
  `banner` island, so adding an island there is a new component, one registry entry, and the
  `hydrate` declaration (`f:mcxxpp`). `rendering.islands` is optional on the adapter (`f:5vjwlc`),
  so a site built by hand starts without the wiring. Any sentence that names the adapter or a
  registry path says which site it means.

## Place in the doc set

- **Group and neighbors.** The page closes the "Public site" group in outline order, after
  theme-your-public-site, build-the-public-routes, share-a-draft-preview, and
  act-on-newly-published-entries. Its nearest neighbor by subject is write-a-markdown-component in "Model
  content", whose out-of-scope list sends "Hydrating a component on the client" here. The arm index
  `docs/extend/README.md` has no line for the page yet.
- **What links in, and why.** The outline's one crossLink into the page is write-a-markdown-component's,
  for hydrating a registered component; that page is not on disk yet. Four pages on disk mention
  islands without linking here: `docs/extend/architecture.md:53` (the `/islands` runtime),
  `docs/extend/scaffolded-site-files.md:375,406` (the root load reading the island registry, and
  the `islands/` directory), `docs/extend/upgrade-cairn.md:161` and
  `docs/extend/migration-notes.md:16` (markup that needed `<script>`). No page links into this one
  with an anchor, so every heading is free.
- **What the page links out to.** write-a-markdown-component (declaring the component), the reference
  entries `docs/reference/islands.md`, `docs/reference/core.md` (`rendering.islands`), and
  `docs/reference/admin.md` (`hydrate` and the island boundary), scaffolded-site-files, and the
  add-cairn tutorial's adapter section, as the plan sets them.
- **What siblings own, so the introduction words a shared idea fresh.**
  - write-a-markdown-component owns the one `render` the preview and the public pages share,
    `defineComponent`, attributes, and `build()`. The introduction states only that the body
    reaches the page as an HTML string, as the reason the default is static, and never retells the
    shared-render story.
  - security-model owns the sanitize floor and what it protects. The introduction keeps the floor to
    one clause, with no explanation and no opt-out.
  - `docs/reference/islands.md` opens on "the seam that mounts a site's live Svelte components over
    the static fallbacks the render pipeline emits" and says "a static site never ships the
    runtime". The introduction does not reuse either phrasing, and it never credits the engine with
    keeping a site static (the plan's drafting constraint).
  - `docs/extend/architecture.md` calls `/islands` "the separate client runtime that mounts a
    site's live components"; the introduction does not echo it.
  - `docs/extend/configure-media.md` frames the same two-site split with "What the work involves
    depends on the site" and a "Two other readers" paragraph. Word the split fresh, and do not take
    that page's paragraph shape.

## Intro plan

No heading; the untitled text under the H1. Three paragraphs. The first two frame the page; the
third holds the plan's bounds (prior knowledge and what the page leaves out).

1. **The model, from the reader's situation.** Open on a statement about the subject, never an
   imperative and never a sentence about the page: the developer's component already renders on
   their public page, and it renders as markup only. One way in: SvelteKit hydrates a page's own
   Svelte components in the browser (`f:tf4vfb`), but an entry's body reaches the page as the HTML
   string the site's `render` returns on the server (`f:ps54gh`, `f:my6ci3`), so a markdown
   component inside it is static markup from `build()` with no client JavaScript (`f:4hd2vg`). Then
   the one condition that changes that: declaring `hydrate` wraps the same output in an island
   boundary carrying the directive name and the component's props, and a live Svelte component
   registered under that name mounts over it in the browser (`f:4hd2vg`). The `build()` output stays
   as the fallback shown before JavaScript runs, and the only content a reader without JavaScript
   sees (`f:1uk9sw`). Close on why the seam exists: the entry bodies stay static, and one component
   gains behavior in the browser. Do not state that a site without islands ships no runtime; that
   lands in "Hydrate islands after navigation", credited to the layout's flag and dynamic import.
   Fact ids: `f:tf4vfb`, `f:ps54gh`, `f:my6ci3`, `f:4hd2vg`, `f:1uk9sw`.
2. **Who comes, for what, and the contract.** Name each reader's reason so each learns early that
   the page answers it: a developer with a declared component who wants it interactive, and a
   developer moving markup that needs client script out of an entry, since the render strips author
   `<script>` by default (`f:z3a58a`; one clause, no explanation). Then the site split, said fresh:
   a scaffolded site, whose adapter is `src/theme/cairn.config.ts`, already ships the wiring around
   its `banner` island, so there the work is a new component, one registry entry, and the `hydrate`
   declaration (`f:mcxxpp`, `f:q07rd5`); a site built by hand, such as the add-cairn tutorial's,
   whose adapter is `src/lib/cairn.config.ts`, starts without that wiring, since
   `rendering.islands` is optional (`f:5vjwlc`, `f:q07rd5`), and runs every step. The one-line
   contract sits inside this framing: you write the live component, register it under its directive
   name, mount it from the root layout, and check it on the public page. Fact ids: `f:z3a58a`,
   `f:mcxxpp`, `f:q07rd5`, `f:5vjwlc`.
3. **Bounds.** Prior knowledge, as the plan lists it: Svelte 5 components and `$props()`, SvelteKit
   layouts and server `load` functions, `afterNavigate`, dynamic `import()`, and the component's
   `defineComponent` declaration. What the page leaves out, with the page that covers it: declaring
   the component, its attributes, and the `build()` output that becomes the fallback belong to
   `docs/extend/write-a-markdown-component.md`, and a component that only renders markup needs that page
   alone. One clause routes the reader who wants a widget in a route or layout of their own: it
   needs no island, since SvelteKit hydrates those components already (`f:tf4vfb`). This sentence
   may name the page, since scope has no subject-first form. Fact ids: `f:tf4vfb`.

## Departures from the plan's introduction

- **Paragraph 1 starts above the component.** The plan's item 1 opens at the markdown component.
  The framing adds where SvelteKit fits first: a page's own components hydrate, and the entry body
  is an HTML string rendered on the server (`f:tf4vfb`, `f:ps54gh`, `f:my6ci3`). Reason: the house
  ruling has the introduction give the general model and where SvelteKit fits, and the static
  default reads as a reason only beside the hydration the reader already knows. The plan's
  one-sentence "why the seam exists" stays, as the paragraph's close.
- **A third reader is named.** The plan's item 2 names the developer with a declared component on
  each of the two sites. The framing adds the developer moving script-bearing markup out of an
  entry, whom the per-version records send toward "an island" (`f:z3a58a`). Reason: the map shows
  them arriving, and the house ruling has every reader's reason named early.
- **The hand-built site's missing wiring gets its own backing.** The plan backs "has none of the
  wiring" with `f:q07rd5`, which states only the adapter's path. The framing backs it with
  `f:5vjwlc` (`rendering.islands` is optional) and `f:mcxxpp` (only the scaffold ships the wiring),
  and widens the wording to "a site built by hand, such as the add-cairn tutorial's".
- **A second wrong-place route.** Beside the plan's route to write-a-markdown-component, paragraph 3 adds
  one clause for the developer who wants a widget in their own route or layout (`f:tf4vfb`).
- **The plan's items 3 and 4 merge** into paragraph 3, so the introduction runs three paragraphs.
