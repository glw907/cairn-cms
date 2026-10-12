# Page plan: Add an island

Page: `docs/extend/add-an-island.md`. Page type: task guide. Status: new page, no prior version on
disk. Written 2026-10-12 by the plan step of the docs page chain (stage 2b part 1). The drafter
drafts from this plan: it is the source of the page's order, each section's claim, and each fact's
placement. The structural edit seat reads it before any prose exists. The plan is Google's outline
written down (Google Technical Writing Two, "Organizing large documents",
https://developers.google.com/tech-writing/two/large-docs): the outline is the document's
narrative, and information arrives where it is most relevant to the reader.

Inputs read: the outline entry in `docs/internal/outlines/extend.json` (slug `add-an-island`: job,
covers, out-of-scope list, exemplars; and slug `configure-rendering`, whose out-of-scope list sends
"Hydrating a component on the client" here); "The page anatomies" and "The introduction" in
`docs/internal/docs-register.md`; every fact bullet named below in `docs/internal/facts/extend.md`
and `docs/internal/facts/reference.md`; the two exemplars (`extenders/directus-create-extension`,
`extenders/payload-custom-components`); the reference entries each link names
(`docs/reference/islands.md` whole; `docs/reference/core.md` `defineComponent` and "`rendering.islands`
(adapter member)"; `docs/reference/admin.md` "Hydrate and the island boundary";
`docs/reference/ambient.md`); the sibling pages `docs/extend/add-cairn-to-a-sveltekit-app.md`
("Write the site config and a minimal adapter", "Mount the admin routes", "Next steps"),
`docs/extend/scaffolded-site-files.md` ("`src/app.d.ts`", the `islands/` listing), and
`docs/extend/debug-your-site.md` (no island row); and the code the facts cite
(`src/lib/islands/index.ts`, `src/lib/render/rehype-dispatch.ts:107-141`,
`src/lib/content/adapter.ts:10-31`, `src/lib/content/types.ts:255-268`, `src/lib/ambient.ts`,
`templates/waymark/src/theme/islands/registry.ts`, `templates/waymark/src/theme/islands/Banner.svelte`,
`templates/waymark/src/theme/cairn.config.ts:21,170-180`,
`templates/waymark/src/theme/markdown-components.ts:335-348`,
`templates/waymark/src/routes/+layout.server.ts`, `templates/waymark/src/routes/+layout.svelte`,
`templates/waymark/src/app.d.ts`, `templates/waymark/package.json` `imports`). The configure-rendering
page is not on disk yet; a link to it passes the gate as a forward link.

Headings in this plan's section list are the page's headings, verbatim. A claim inventory `section`
names one of them. The introduction is the untitled text under the H1 and is named `Introduction`.

## What the page argues

A markdown component renders on the server by default, and `hydrate` is the one declaration that
flips it to the client: the server output stays as the fallback, and a live Svelte component
mounts over it. The page's spine is the three files that make the mount happen, in the order each
imports the last: the live component, the registry module that names it (which the adapter and the
layout both import), and the root layout that calls the runtime. Each section ends with the site
in a working state: after the component, nothing references it yet; after registration, the adapter
passes its check and the public page renders the boundary with its fallback; after the layout, the
island mounts. Verification on the public page and the failure path close the page, per the
task-guide anatomy.

The page serves two readers with one spine. The developer on a scaffolded site already has the
registry module, `rendering.islands`, the `hasIslands` load, and the layout, around the `banner`
island (`f:mcxxpp`), so their work is a new component, one registry entry, and the `hydrate`
declaration. The developer on the add-cairn tutorial's site has none of that wiring, so they run
every step. The introduction names both, and "Before you begin" tells the scaffolded reader which
steps to skip.

### The order, argued

Each section holds what the next one depends on.

1. **The introduction carries the model** (`f:4hd2vg`, `f:1uk9sw`): the server default, the exact
   condition that flips a component to the client, and the fallback that survives the flip. This is
   the Payload exemplar's take: the default and the flip condition come before any how-to, so
   "write a component, register it, call the runtime" reads as one mechanism rather than three
   chores. The model sits in the introduction, not in an explanation section, because the anatomy
   lets the introduction say why the thing exists and keeps explanation subordinate to the steps.
2. **Before you begin** names the component the reader already declared (configure-rendering's
   job), the adapter file per site, and routes the scaffolded reader past the wiring they have.
3. **Write the live component** (cover 4, props) comes first among the steps because the registry
   module imports it. The props are part of the component's own code (its `$props()` interface), so
   the props cover lands here, ahead of registration, with its trust rule stated where the reader
   types the props. The two mount behaviors that constrain the component's markup, the layout shift
   and the focus loss (from cover 5), land here too, since the reader fixes both in this file.
4. **Register the island** (covers 1 and 2) follows the component it imports. It pairs the registry
   entry with the `hydrate` declaration because `defineAdapter` throws until both agree
   (`f:mv684d`): the section's steps leave the adapter valid at the section's end. The eager-or-visible
   choice (cover 1) is the `hydrate` step's value, so it sits on that step.
5. **Hydrate islands after navigation** (cover 3) follows the registry module it imports. The
   runtime behaviors that explain the call's shape (teardown on navigation, root scoping; cover 5)
   sit beside the call, where the reader decides on `afterNavigate` and on the second argument.
6. **Verify the island on the public page** (cover 6) checks the whole chain once, after the last
   file exists, which is the Directus exemplar's closing check on the live public page.
7. **Diagnose a failed check** is the anatomy's failure-path slot. The failure-isolation and
   fallback-restore behaviors (cover 5) land here, because they are what a reader sees when a check
   fails: the fallback stays and the page still works. The extend recovery surface has no island row
   (friction filed), so the page keeps its causes.
8. **See also** closes the page, per the anatomy.

### Departures from the outline's covers order, with the reason for each

- Cover 1 splits: the model (default versus flip, the fallback) moves into the introduction; the
  eager-or-visible choice lands on the `hydrate` step in "Register the island".
- Cover 4 (props) moves ahead of covers 2 and 3, into "Write the live component", because the reader
  writes the props interface in the first file, which the registry imports.
- Cover 5 (runtime behavior) has no section of its own. Each behavior lands where it bites: the
  layout shift and focus in "Write the live component", teardown and root scoping in "Hydrate
  islands after navigation", failure isolation and the fallback restore in "Diagnose a failed
  check". A standalone runtime section would be exposition the reader meets after the steps it
  constrains, which the anatomy's "explanation stays subordinate to the steps" rules out.
- Cover 6 stays last among the body sections and splits into the verification section and the
  failure-path section, the anatomy's items 4 and 5.

### Exemplar takes, and where each lands

- **Directus, extensions quickstart.** The scaffold, build, see-it-running shape: each section
  creates one file and ends in a working state, and the page closes on the live public page. It
  lands as the three step sections and "Verify the island on the public page". Left behind: the
  Docker volume steps.
- **Payload, custom components.** The default (a component renders on the server) and the exact
  condition that flips it to the client, stated before any how-to. It lands as the introduction's
  first paragraph: a component renders as static server markup, and declaring `hydrate` is the
  condition that adds a live client component over it. Left behind: the import-map machinery and the
  performance section.

### Heading policy

Task headings start with a bare infinitive; "Before you begin" and "See also" are the anatomy's fixed
headings. No page links into `docs/extend/add-an-island.md` with an anchor today (configure-rendering
is not drafted), so every heading is free.

## The introduction, in Google's three parts

No heading. It opens on a statement, never an imperative, and frames the page from above before the
contract (register, "The introduction"). Two or three paragraphs. The intro-framing step reasons the
final wording. Content items, in order:

1. **The model (what the document covers, framed from above).** A markdown component renders on the
   server: the pipeline turns its directive into the static markup `build()` returns, with no client
   JavaScript (`f:4hd2vg`). Declaring `hydrate` on the component is the condition that changes that:
   the pipeline wraps the same output in an island boundary carrying the directive name and the
   component's props, and a live Svelte component registered under the same name mounts over it in
   the browser (`f:4hd2vg`). The `build()` output stays as the fallback, shown before JavaScript runs
   and the only content a reader without JavaScript sees (`f:1uk9sw`). Why the seam exists, one
   sentence: a site keeps its public pages static and makes one component interactive. The
   runtime-shipping clause is not stated here; it lands in "Hydrate islands after navigation",
   where the layout's flag and dynamic import that cause it are on the page (`f:59u3b9`), so the
   introduction never reads as crediting the engine (drafting constraint, "Never say the engine
   gates the runtime import").
2. **Who and why, with the contract.** The reader has a markdown component declared and wants it
   interactive on the public site. Two sites, named so the reader knows which steps are theirs: a
   scaffolded site, whose adapter is `src/theme/cairn.config.ts`, already ships the island wiring
   around its `banner` island, so the work there is a new component, one registry entry, and the
   `hydrate` declaration (`f:mcxxpp`, `f:q07rd5`); the add-cairn tutorial's site, whose adapter is
   `src/lib/cairn.config.ts`, has none of the wiring (`f:q07rd5`). The contract sentence, inside the
   framing: write the live component, register it under its directive name, mount it from the root
   layout, and check it on the public page.
3. **Prior knowledge.** Svelte 5 components and `$props()`, SvelteKit layouts and server `load`
   functions, `afterNavigate`, and dynamic `import()`. The component's `defineComponent` declaration
   from configure-rendering.
4. **What the page does not cover, with the page that does (wrong-place routing).** Declaring the
   component itself, its attributes, and the `build()` output that becomes the fallback:
   `docs/extend/configure-rendering.md`. One clause routes a reader who needs no client behavior: a
   component that only renders markup needs that page alone. This sentence may name the page, since
   scope has no subject-first form.

## Sections, in order

Each entry carries the page heading; **First sentence**, the one sentence a reader takes from the
section, which is the section's first sentence on the page (its claim is fixed here, its wording may
move to the register's voice, and a task-section sentence stays under 26 words); **Facts**, the ids it
draws on ("cited again" marks a fact whose primary home is another section); the content and steps;
and **Hand-off**, quoted where the plan fixes its wording (each quoted hand-off and lead-in passed
the provenance extractor with no row).

The worked example is one island throughout: a `converter` component with `from` and `to` text
attributes and a `rate` number attribute, the name `docs/reference/islands.md` "The island boundary"
already uses, so the page and its reference show the same boundary. The `number` attribute shows the
prop typing (`f:hje4zb`). The drafter writes the markup; the names are the brief's `local` array.

### Before you begin

**First sentence:** An island starts from a markdown component your site already declares, and from
the adapter file of the site you are changing.

**Facts:** `f:5vjwlc` (added, scoped: `rendering.components` is an optional adapter member),
`f:q07rd5` (scoped: the two adapter paths and their `#theme` and `#lib` imports), `f:mcxxpp`
(scoped: what the scaffold already ships).

A bulleted list of preconditions, each with a link to what produces it (anatomy item 2):

- A component declared with `defineComponent`, in the component registry the adapter passes as
  `rendering.components` (`f:5vjwlc`, scoped). Link `docs/extend/configure-rendering.md`. Its
  `build()` output becomes the fallback, so it already renders what a reader without JavaScript
  needs. State the precondition only; never state why the check needs `rendering.components`
  (no fact; friction filed).
- The adapter file: `src/theme/cairn.config.ts` on a scaffolded site, imported as
  `#theme/cairn.config.js`; `src/lib/cairn.config.ts` on the add-cairn tutorial's site, imported as
  `#lib/cairn.config.js` (`f:q07rd5`). Link
  `docs/extend/add-cairn-to-a-sveltekit-app.md#write-the-site-config-and-a-minimal-adapter` for the
  tutorial's adapter.

Then one or two sentences for the scaffolded reader: a scaffolded site already has the registry
module `src/theme/islands/registry.ts`, the adapter's `rendering.islands`, the root load's
`hasIslands`, and the root layout's `hydrateIslands` call (`f:mcxxpp`). So on that site, do "Write
the live component", the registry-entry and `hydrate` steps of "Register the island", and then go to
"Verify the island on the public page". Name the sections by heading.

**Hand-off (no-claim):** "Start with the live component, the piece the browser mounts."

### Write the live component

**First sentence:** The live component is an ordinary Svelte component that the runtime mounts with
Svelte's own `mount()`, and its props are the directive's declared attributes.

**Facts:** `f:bwaj5c`, `f:hje4zb`, `f:jz4qka`, `f:8356mn`, `f:9zxml1` (scoped: the mount clears the
fallback, so a size difference shifts the layout; the showcase banner's matching message),
`f:s080jg`.

Content:

- One sentence after the first: the runtime uses no framework abstraction, so anything a Svelte
  component does at mount works here (`f:bwaj5c`, scoped to "no framework abstraction"; do not
  extend the claim past the fact).
- One step, a single bulleted item, location first: in `src/lib/islands/` (a scaffolded site's
  `src/theme/islands/`, `f:mcxxpp`), create `Converter.svelte`, typing its `$props()` from the
  directive's declared attributes. The code block names its file in a first-line comment and types
  `rate` as a `number`, `from` and `to` as `string`.
- One sentence on the typing rule, right after the code: a `number` attribute arrives as a JSON
  number, a `boolean` attribute as a JSON boolean, and every other attribute as the literal string
  the author wrote (`f:hje4zb`).
- The trust rule, as a Caution notice directly under that sentence: every prop is author-written
  and untrusted. The pipeline escapes it into an attribute and the runtime parses it inside a
  `try`/`catch`, which is safe only because the value never enters a script context (`f:jz4qka`);
  the runtime passes the parsed values to the component unchanged, with no sanitizing or URL
  filtering, so a component that routes a prop into `{@html}`, an `href` or `src`, or an inline
  `style` owns that injection risk (`f:8356mn`). Bind props to text. Link
  `docs/reference/islands.md#props-are-untrusted` (opened and confirmed: it states the escaping, the
  `try`/`catch`, and the three sinks).
- Two sentences on the swap, the explanation the component's markup needs: mounting clears the
  fallback and mounts the component into the same element, so a first render whose size differs
  from the fallback shifts the layout; make the first render state what the fallback states, as the
  scaffold's banner does (`f:9zxml1`). A fallback holding a focusable control loses focus on mount,
  and the runtime moves no focus, so the component restores it itself (`f:s080jg`).

**Hand-off (no-claim):** "With the component written, register it under its directive name."

### Register the island

**First sentence:** An island registers on the adapter's `rendering.islands` under its directive
name, and the component's declaration sets `hydrate` to say when it mounts.

**Facts:** `f:thjrvl`, `f:ni5lm7`, `f:nm3bbo`, `f:mynt0l`, `f:mv684d`, `f:bb4ah3`. Cited again:
`f:mcxxpp` (the scaffold's existing module and adapter line), `f:q07rd5` (the paths).

Content:

- A numbered list of three steps, one action each, the location first, lead-in "To register the
  island, follow these steps:" (no-claim):
  1. In `src/lib/islands/registry.ts`, export `siteIslands`, an `IslandRegistry` that maps
     `converter` to the component. On a scaffolded site, add the `converter` entry to the existing
     `src/theme/islands/registry.ts` beside `banner` (`f:mcxxpp`). Code block: the tutorial site's
     module, importing `IslandRegistry` from `@glw907/cairn-cms/islands`.
  2. On the tutorial's site only, in `src/lib/cairn.config.ts`, import `siteIslands` and pass it as
     `rendering.islands`, beside `rendering.render` (`f:thjrvl`). The condition comes first, since a
     scaffolded site's adapter already passes it (`f:mcxxpp`).
  3. In the component's `defineComponent` declaration, add `hydrate: true` to mount it on first load
     and after every client navigation, or `hydrate: 'visible'` to mount it on first intersection
     (`f:nm3bbo`).
- One sentence after step 1's code, why the map has its own module: the engine reads
  `rendering.islands` only to check it, and the runtime mounts from whatever map the layout passes,
  so the adapter and the layout both import the one `siteIslands` export (`f:ni5lm7`). It ties
  forward to "Hydrate islands after navigation".
- One or two sentences after step 3, the choice: a `'visible'` island mounts once, the first time
  its boundary meets the viewport, so an island a reader never scrolls to never mounts and its
  fallback stays (`f:mynt0l`). Choose `true` for an island above the fold. No fact states a
  performance gain; do not claim one.
- The check, where it bites, after the steps: `defineAdapter` fails closed at declaration when a
  `hydrate` component has no `rendering.islands` entry or an entry has no `hydrate` component, and
  the error names the directive (`f:mv684d`). Give both messages in a code block, verbatim:
  `cairn: component '<name>' declares hydrate but rendering.islands has no entry for it.` and
  `cairn: rendering.islands has '<name>' but no component declares hydrate for it.` (`f:bb4ah3`).
  One clause: with all three steps done, the check passes. Link
  `docs/reference/core.md#renderingislands-adapter-member` (opened and confirmed: it states both
  mismatches and the fail-closed check).

**Hand-off (no-claim):** "With the island registered, wire the root layout that mounts it."

### Hydrate islands after navigation

**First sentence:** The root layout mounts islands by calling `hydrateIslands` from `afterNavigate`,
behind a `hasIslands` flag, so a site without islands loads no runtime.

The section's condition comes right after the first sentence: a scaffolded site's root layout already
makes this call (`f:mcxxpp`), so its reader goes to "Verify the island on the public page".

**Facts:** `f:drsabs`, `f:lv29ox`, `f:ofex2m` (scoped: the root `+layout.server.ts` returns
`hasIslands`, reading the registry rather than the full adapter, so every non-prerendered request
stays light; its `nav`, `footerNav`, `siteName`, and error-page clauses are not used), `f:59u3b9`,
`f:rmlwca`, `f:w8oe1v`, `f:bh6css`. Cited again: `f:ni5lm7` (the layout passes the same export).

Content:

- The file tree before the code: `src/routes/+layout.server.ts` and `src/routes/+layout.svelte` beside
  the tutorial's existing `src/routes/admin/`. The tutorial's site has no root layout today; the
  root layout wraps every route, the admin included (the scaffold's layout comment says so; no fact,
  so the drafter states only where the files go).
- A numbered list of two steps, lead-in "To wire the root layout, follow these steps:" (no-claim):
  1. In `src/routes/+layout.server.ts`, return `hasIslands: Object.keys(siteIslands).length > 0`,
     importing `siteIslands` from `#lib/islands/registry.js` (`f:ofex2m`, `f:mcxxpp` for the
     scaffold's form of the line).
  2. In `src/routes/+layout.svelte`, call `hydrateIslands(siteIslands)` from `afterNavigate`,
     returning early when `data.hasIslands` is false and importing `@glw907/cairn-cms/islands` and
     `#lib/islands/registry.js` with dynamic `import()` (`f:drsabs`, `f:lv29ox`). The code block
     follows the scaffold's layout: `Promise.all` over the two imports, `{@render children()}`.
- Two or three sentences on why the call has this shape, each tied to a line of the code:
  - The flag and the dynamic import keep the runtime out of a site with an empty registry (`f:59u3b9`).
    The layout imports the lean registry module, never the adapter, since importing
    `#lib/cairn.config.js` client-side would ship the adapter's renderer, icon set, and media manifest
    to every public page (`f:lv29ox`). The flag comes from the root load, which reads the registry
    rather than the full adapter (`f:ofex2m`).
  - `hydrateIslands` runs once the new DOM is in place after each client navigation (`f:drsabs`), and
    it tears down the previous pass first, so navigating back to a page mounts one instance, never a
    duplicate (`f:rmlwca`). Teardown is synchronous on navigation, since it unmounts with
    `outro: false` (`f:w8oe1v`). No fact states what `onMount` would do instead; do not contrast them.
  - The second argument, `root`, defaults to `document`; pass a narrower element to scan one region
    (`f:bh6css`).
- Link `docs/reference/islands.md#hydrateislands` for the function's contract.

**Hand-off (no-claim):** "With the layout in place, check the island where your readers see it."

### Verify the island on the public page

**First sentence:** Check the island under `npm run preview` or on the deployed site, because the
edit page's sandboxed preview frame always shows the fallback.

**Facts:** `f:8o2gbl`, `f:4kmm3i`. Cited again: `f:1uk9sw` (the no-JavaScript fallback),
`f:mynt0l` (a `'visible'` island mounts on first intersection).

A numbered list, one check to a step, the location first, lead-in "To verify the island, follow these
steps:" (no-claim):

1. In the project directory, build the site and run `npm run preview`, or deploy it (`f:8o2gbl`).
2. In the browser, open a public page whose entry body uses the `converter` directive. The authoring
   grammar is configure-rendering's: link it, show no directive syntax beyond one line if the drafter
   needs it.
3. In the browser's element inspector, find the boundary: a `<div>` with `data-cairn-island="converter"`
   and a `data-cairn-props` JSON payload, plus `data-cairn-hydrate="visible"` only on a `'visible'`
   island (`f:4kmm3i`).
4. On the page, use the island: the live component responds where the fallback was. For a `'visible'`
   island, scroll to it first (`f:mynt0l`).
5. With JavaScript turned off in the browser, reload the page: the fallback shows in the boundary
   (`f:1uk9sw`).

**Hand-off (no-claim):** "If a check fails, the next section traces it to its cause." No colon: the
list it points to sits in the next section, under that section's own lead-in.

### Diagnose a failed check

**First sentence:** A failed check points at one piece: the adapter's island check, the component's
`hydrate` declaration, the layout's flag and map, or the component's own mount.

**Facts:** `f:urw3z7`, `f:9zxml1` (scoped: the fallback restored on a throwing mount). Cited again:
`f:bb4ah3`, `f:mv684d`, `f:5vjwlc`, `f:4hd2vg`, `f:mynt0l`, `f:ofex2m`, `f:lv29ox`, `f:ni5lm7`.

One sentence before the list, the behavior every later item rests on: one bad island, whether its
name is missing from the map, its props fail to parse, or its component throws on mount, keeps its
fallback, and every other island still mounts (`f:urw3z7`); a throwing mount restores the fallback
it cleared (`f:9zxml1`). Link `docs/reference/islands.md#error-isolation` (opened and confirmed: it
states the three isolated cases).

A numbered list of ordered checks (anatomy item 5), in the order of the "Verify the island on the
public page" steps that reach them, placed after the isolation sentence and its link. Directly
above the list, its own lead-in, "Work through the following checks in order:" (no-claim). Each
item names what the reader sees, then the cause, then the fix or the link:

1. The build or the dev server stops with one of the two `cairn:` messages from "Register the island"
   (`f:bb4ah3`, `f:mv684d`). The first message: add the registry entry. The second: check that the
   declaration sets `hydrate` and that the component sits in the registry the adapter passes as
   `rendering.components`, the precondition in "Before you begin" (`f:5vjwlc`, scoped). State no
   cause for the second message beyond those two checks (friction filed).
2. The page shows the component's markup with no `data-cairn-island` boundary: the declaration has
   no `hydrate`, so the component renders as static server markup (`f:4hd2vg`).
3. The boundary is there and the fallback stays, on a `'visible'` island: it mounts only when it
   first meets the viewport (`f:mynt0l`).
4. The boundary is there, the fallback stays, and the islands runtime never loads: the root load's
   `hasIslands` is false, so the layout returns before its imports; check that
   `src/routes/+layout.server.ts` reads the registry module (`f:ofex2m`, `f:lv29ox`). The drafter
   names no network-panel observation unless it is plainly the reader's own check.
5. The runtime loads and the fallback stays: the map the layout passes lacks the directive name, so
   the layout and the adapter must import the same `siteIslands` export (`f:ni5lm7`, `f:urw3z7`).
6. The name is in the map and the fallback stays: the component threw on mount, and the runtime put
   the fallback back (`f:9zxml1`, `f:urw3z7`). The fix is in the component.

**Hand-off:** none; "See also" follows.

## Ending

### See also

The anatomy's item 6: related how-to guides, concept pages, and the limitations the page leaves out.
The extend recovery surface has no island row, so no recovery link is repeated. One introducing
sentence, "The following pages cover the pieces this page links to:" (no-claim), then a bulleted
list, each item's link text naming its destination:

- `docs/extend/configure-rendering.md`, declaring the component, its attributes, and its `build()`
  fallback.
- `docs/reference/islands.md`, the runtime, the boundary contract, and the props trust boundary.
- `docs/reference/core.md#renderingislands-adapter-member`, the adapter member and its check.
- `docs/reference/admin.md#hydrate-and-the-island-boundary`, `hydrate` on the declaration.
- `docs/extend/scaffolded-site-files.md`, where the scaffold's island files sit.

## Dispositions, every fact id

`carried` names the section that holds the fact's primary placement. The 27 fact ids this plan was
handed: 26 carried (four of them scoped), one cut. The plan adds one container fact, `f:5vjwlc`,
scoped. `f:keo8ze` and `f:42mh10`, cut by the page inputs, stay cut.

| Fact | Disposition | Section, or reference and reason |
| --- | --- | --- |
| f:nm3bbo | carried | Register the island (step 3, `true` or `'visible'`) |
| f:1uk9sw | carried | Introduction (the fallback, the only no-JS content); cited again in Verify the island on the public page (step 5) |
| f:jz4qka | carried | Write the live component (Caution: escaped, parsed in `try`/`catch`, safe only outside a script context) |
| f:thjrvl | carried | Register the island (first sentence; step 2) |
| f:mv684d | carried | Register the island (the fail-closed check); cited again in Diagnose a failed check |
| f:rmlwca | carried | Hydrate islands after navigation (teardown first, one instance) |
| f:urw3z7 | carried | Diagnose a failed check (one bad island keeps its fallback, the rest mount) |
| f:w8oe1v | carried | Hydrate islands after navigation (`outro: false`, synchronous teardown) |
| f:59u3b9 | carried | Hydrate islands after navigation (no runtime for an empty registry, credited to the layout's flag and dynamic import); not stated in the Introduction |
| f:8o2gbl | carried | Verify the island on the public page (first sentence; step 1) |
| f:4hd2vg | carried | Introduction (the default and the flip condition); cited again in Diagnose a failed check (item 2) |
| f:bwaj5c | carried | Write the live component (Svelte's own `mount()`, no framework abstraction) |
| f:hje4zb | carried | Write the live component (number, boolean, literal string) |
| f:drsabs | carried | Hydrate islands after navigation (the one client call, from `afterNavigate`) |
| f:9zxml1 | carried (scoped) | Write the live component (clear and mount, layout shift, the banner's matching message); its restore-on-throw clause in Diagnose a failed check |
| f:mynt0l | carried | Register the island (a `'visible'` island never scrolled to never mounts); cited again in Verify the island on the public page and Diagnose a failed check |
| f:8356mn | carried | Write the live component (passed unchanged; `{@html}`, `href`/`src`, `style`) |
| f:lv29ox | carried | Hydrate islands after navigation (the gate, the two dynamic imports, never the adapter); cited again in Diagnose a failed check |
| f:bh6css | carried | Hydrate islands after navigation (`root` defaults to `document`) |
| f:q07rd5 | carried (scoped) | Before you begin (the two adapter paths and imports); cited again in Introduction and Register the island. Its `src/access.ts` and hooks clauses are not used |
| f:mcxxpp | carried (scoped) | Before you begin (what a scaffolded site already ships); scoped in Introduction, Write the live component, Register the island, and Hydrate islands after navigation |
| f:ni5lm7 | carried | Register the island (why the map has its own module); cited again in Hydrate islands after navigation and Diagnose a failed check |
| f:bb4ah3 | carried | Register the island (the two messages, verbatim); cited again in Diagnose a failed check |
| f:s080jg | carried | Write the live component (focus lost on mount, the component restores it) |
| f:4kmm3i | carried | Verify the island on the public page (step 3, the boundary's attributes) |
| f:ofex2m | carried (scoped) | Hydrate islands after navigation (root load returns `hasIslands` from the registry, not the adapter); cited again in Diagnose a failed check. Its `nav`, `footerNav`, `siteName`, `SiteHeader`, and error-page clauses are not used |
| f:n52h8f | cut | The layout reads `data.hasIslands` through its own generated `LayoutData`, so typing `App.PageData` is not a step of this task. `docs/extend/scaffolded-site-files.md` "`src/app.d.ts`" states it (opened and confirmed, lines 240-241). Note: the scaffold's `src/app.d.ts` declares `PageData` itself; `@glw907/cairn-cms/ambient` augments only `App.Locals` and the `__CAIRN_DEV_BUILD__` global (`src/lib/ambient.ts`), so the page-inputs summary "through /ambient" was wrong |
| f:keo8ze | cut | Duplicates `f:thjrvl` and `f:4hd2vg`, which the page cites instead (as the page inputs disposed it) |
| f:42mh10 | cut | Duplicates `f:rmlwca` for this page; the observer-disconnect detail is reference depth, stated by `docs/reference/islands.md#hydrateislands` (opened and confirmed: "unmounting live instances and disconnecting any pending observers") |
| f:5vjwlc | carried (added, scoped) | Before you begin (`rendering.components` is an optional adapter member, the precondition); cited again in Diagnose a failed check |

The page-inputs claim inventory is disposed as it recorded it, with two changes. Kept as recorded:
the absent prior page (no claims), `f:keo8ze` and `f:42mh10` (cut), and the "filed" rows for
`f:bb4ah3`, `f:mcxxpp`, `f:ni5lm7`, and `f:s080jg`, each carried in the section the table names.
Changed: `f:n52h8f`, which the inputs carried, is cut (above); and the inputs' working sections
"What an island is", "Props", and "Runtime behavior" do not become page sections, their facts
landing in the Introduction, "Register the island", "Write the live component", "Hydrate islands
after navigation", and "Diagnose a failed check" as "The order, argued" sets out.

## Friction filed

The page-inputs step filed one entry on 2026-10-12 (the registry hand-kept in three places, with the
`CairnAdapter.rendering.islands` doc comment describing the scaffold's gate as engine behavior), and
this plan does not refile it. This plan filed three entries in `docs/internal/docs-friction-log.md`
on 2026-10-12, none blocking the page:

1. Engine: the islands runtime fails silently, with no log event or dev warning for an unregistered
   name, an unparsable payload, or a throwing mount, so `docs/extend/debug-your-site.md` has no
   island row and this page keeps its causes.
2. Engine: `defineAdapter`'s island check reads `hydrate` only from `rendering.components`, not from
   the registry `createRenderer` takes, and the tutorial's adapter sets no `rendering.components`; no
   fact states which registry the check reads (facts-container hole).
3. Docs content: `docs/reference/islands.md`'s `hydrateIslands` example imports the full adapter into
   the client layout, against `f:lv29ox` and the scaffold, and `docs/reference/core.md:690-691`
   states the layout's gate as engine behavior.

## Drafting constraints

- **Which site.** Every code block names its file in a first-line comment, and every adapter or
  registry reference says which site it means: `src/lib/...` and `#lib/...` for the tutorial's site,
  `src/theme/...` and `#theme/...` for a scaffolded one (`f:q07rd5`). The step code is the tutorial
  site's, since a scaffolded site already has every piece but the component, its registry entry, and
  `hydrate`.
- **The brief's `local` array** takes the names the page has the reader create or supply:
  `converter`, `Converter.svelte`, `from`, `to`, `rate`, `src/lib/islands/`,
  `src/lib/islands/Converter.svelte`, `src/lib/islands/registry.ts`, `#lib/islands/registry.js`,
  `src/theme/islands/Converter.svelte`, `src/routes/+layout.server.ts` and `src/routes/+layout.svelte`
  as the tutorial site creates them, `siteIslands` on the tutorial's site, and the placeholder
  `<name>`.
- Never say `@glw907/cairn-cms/ambient` types `hasIslands`; never add an `src/app.d.ts` step.
- Never import the adapter (`#lib/cairn.config.js` or `#theme/cairn.config.js`) in the layout's client
  script, and never copy `docs/reference/islands.md`'s layout example (friction 3).
- Never say the engine gates the runtime import or keeps a site static by itself; the layout's flag
  and dynamic import do (the page-inputs entry, friction 3).
- Never say the runtime logs, warns, or reports anything when an island fails; claim only that the
  fallback stays (friction 1).
- Never say why the check reads `rendering.components`; state the precondition and the two checks
  only (friction 2).
- Never claim a performance figure or a gain for `'visible'`, and never contrast `afterNavigate` with
  `onMount`.
- Never describe the directive grammar, `defineComponent`'s members, or `build()`'s rules beyond the
  one `hydrate` line; those are configure-rendering's.
- `hydrateIslands`, `IslandRegistry`, `rendering.islands`, `rendering.components`, `hydrate`, `build()`,
  `afterNavigate`, `hasIslands`, `siteIslands`, `data-cairn-island`, `data-cairn-props`,
  `data-cairn-hydrate`, `mount()`, `outro: false`, `root`, and every path in code spans.
- Every section opens on the first sentence decided above. Each step names its location before its
  action and holds one action, a conditional step states its condition first, and a procedure of one
  step is a single bulleted item. A reference names its target by heading, never by position.
